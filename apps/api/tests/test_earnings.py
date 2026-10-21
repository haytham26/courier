"""The earnings: the rate card, the GST and the end-of-day summary.

The money is checked with `Decimal` only: the JSON keeps two decimals and a
courier sees the GST separately from the gross.
"""

from __future__ import annotations

import uuid
from collections.abc import Callable
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.earnings import money
from app.repo import InMemoryRepo

COURIER = "courier-1"
OTHER_COURIER = "courier-2"
SHIFT_DATE = date(2026, 10, 21)


def auth(token: str) -> dict[str, str]:
    """The header that carries a token."""
    return {"Authorization": f"Bearer {token}"}


def seed_shift(repo: InMemoryRepo) -> tuple[uuid.UUID, dict[str, uuid.UUID]]:
    """A shift of five stops: three delivered, one failed, one skipped."""
    shift_id = uuid.uuid4()
    repo.add_shift(shift_id, COURIER, SHIFT_DATE)
    stops: dict[str, uuid.UUID] = {}
    plan = (
        ("a", "14 Harewood Rd, Bishopdale", 2),
        ("b", "16 Harewood Rd, Bishopdale", 1),
        ("c", "18 Harewood Rd, Bishopdale", 1),
        ("d", "20 Harewood Rd, Bishopdale", 1),
        ("e", "22 Harewood Rd, Bishopdale", 1),
    )
    for name, address, parcels in plan:
        stop_id = uuid.uuid4()
        stops[name] = stop_id
        repo.add_stop(stop_id, shift_id, address, parcels)
    start = datetime(2026, 10, 21, 9, 0, tzinfo=UTC)
    repo.add_event(stops["a"], "nav_arrived", start)
    repo.add_event(stops["a"], "delivered", start + timedelta(minutes=5))
    repo.add_event(stops["b"], "nav_arrived", start + timedelta(minutes=15))
    repo.add_event(stops["b"], "delivered", start + timedelta(minutes=20))
    repo.add_event(stops["c"], "nav_arrived", start + timedelta(minutes=35))
    repo.add_event(stops["c"], "left_at", start + timedelta(minutes=40))
    repo.add_event(stops["d"], "nav_arrived", start + timedelta(minutes=45))
    repo.add_event(
        stops["d"], "failed_dog", start + timedelta(minutes=50), reason="dog in the yard"
    )
    repo.add_event(stops["e"], "skipped", start + timedelta(minutes=60))
    return shift_id, stops


def test_the_shift_earns_the_rate_card(
    api_client: TestClient, sign: Callable[..., str], repo: InMemoryRepo
) -> None:
    """Two parcels earn the stop rate plus the bonus, a failure earns nothing."""
    shift_id, stops = seed_shift(repo)

    response = api_client.get(f"/shifts/{shift_id}/earnings", headers=auth(sign(COURIER)))

    assert response.status_code == 200
    body = response.json()
    assert body["currency"] == "NZD"
    assert body["delivered"] == 3
    assert body["failed"] == 1
    assert body["skipped"] == 1
    assert body["rate"] == "1.50"
    assert body["gross"] == "5.30"
    assert body["gst"] == "0.69"
    assert body["net"] == "4.61"
    amounts = [(line["stop_id"], line["amount"], line["kind"]) for line in body["breakdown"]]
    assert amounts == [
        (str(stops["a"]), "1.90", "delivered"),
        (str(stops["b"]), "1.70", "delivered"),
        (str(stops["c"]), "1.70", "left_at"),
        (str(stops["d"]), "0.00", "failed_dog"),
        (str(stops["e"]), "0.00", "skipped"),
    ]


def test_the_gst_is_shown_separately(
    api_client: TestClient, sign: Callable[..., str], repo: InMemoryRepo
) -> None:
    """The GST is 15 % of the GST-exclusive base (IRD: gross x 3 / 23)."""
    shift_id, _ = seed_shift(repo)

    body = api_client.get(f"/shifts/{shift_id}/earnings", headers=auth(sign(COURIER))).json()

    gross = Decimal(body["gross"])
    gst = Decimal(body["gst"])
    net = Decimal(body["net"])
    assert gst == money(gross * 3 / 23)
    assert net + gst == gross
    assert gst == money(net * Decimal("0.15"))


def test_the_money_keeps_two_decimals(
    api_client: TestClient, sign: Callable[..., str], repo: InMemoryRepo
) -> None:
    """The JSON carries strings, never floats, so no cent is lost."""
    shift_id, _ = seed_shift(repo)

    body = api_client.get(f"/shifts/{shift_id}/earnings", headers=auth(sign(COURIER))).json()

    for key in ("gross", "gst", "net", "rate"):
        assert isinstance(body[key], str)
        assert len(body[key].split(".")[1]) == 2
    for line in body["breakdown"]:
        assert isinstance(line["amount"], str)
        assert len(line["amount"].split(".")[1]) == 2


def test_the_rounding_is_half_up() -> None:
    """New Zealand money rounds half up, not to the nearest even cent."""
    assert money(Decimal("0.125")) == Decimal("0.13")
    assert money(Decimal("0.005")) == Decimal("0.01")
    assert money(Decimal("1.005")) == Decimal("1.01")


def test_the_summary_tells_the_whole_day(
    api_client: TestClient, sign: Callable[..., str], repo: InMemoryRepo
) -> None:
    shift_id, stops = seed_shift(repo)

    response = api_client.get(f"/shifts/{shift_id}/earnings/summary", headers=auth(sign(COURIER)))

    assert response.status_code == 200
    body = response.json()
    assert body["shift_id"] == str(shift_id)
    assert body["date"] == "2026-10-21"
    assert body["currency"] == "NZD"
    assert body["delivered"] == 3
    assert body["failed"] == 1
    assert body["skipped"] == 1
    assert body["gross"] == "5.30"
    assert body["gst"] == "0.69"
    assert body["net"] == "4.61"
    assert body["average_delivery_seconds"] == 300
    assert body["success_rate"] == 0.75
    assert len(body["failed_stops"]) == 1
    assert body["failed_stops"][0]["stop_id"] == str(stops["d"])
    assert body["failed_stops"][0]["kind"] == "failed_dog"
    assert body["failed_stops"][0]["reason"] == "dog in the yard"


def test_the_average_delivery_time_is_unknown_without_arrivals(
    api_client: TestClient, sign: Callable[..., str], repo: InMemoryRepo
) -> None:
    """No arrival event means no average, not an average of zero."""
    shift_id = uuid.uuid4()
    repo.add_shift(shift_id, COURIER, SHIFT_DATE)
    stop_id = uuid.uuid4()
    repo.add_stop(stop_id, shift_id, "14 Harewood Rd, Bishopdale")
    repo.add_event(stop_id, "delivered", datetime(2026, 10, 21, 9, 5, tzinfo=UTC))

    body = api_client.get(
        f"/shifts/{shift_id}/earnings/summary", headers=auth(sign(COURIER))
    ).json()

    assert body["average_delivery_seconds"] is None
    assert body["success_rate"] == 1.0


def test_a_delivery_beats_a_later_failure(
    api_client: TestClient, sign: Callable[..., str], repo: InMemoryRepo
) -> None:
    """A mis-tap in the app must not take the money away."""
    shift_id = uuid.uuid4()
    repo.add_shift(shift_id, COURIER, SHIFT_DATE)
    stop_id = uuid.uuid4()
    repo.add_stop(stop_id, shift_id, "14 Harewood Rd, Bishopdale")
    start = datetime(2026, 10, 21, 9, 0, tzinfo=UTC)
    repo.add_event(stop_id, "delivered", start)
    repo.add_event(stop_id, "failed_other", start + timedelta(minutes=1))

    body = api_client.get(f"/shifts/{shift_id}/earnings", headers=auth(sign(COURIER))).json()

    assert body["delivered"] == 1
    assert body["failed"] == 0
    assert body["gross"] == "1.70"
    assert body["breakdown"][0]["kind"] == "delivered"


def test_a_failed_delivery_is_retried(
    api_client: TestClient, sign: Callable[..., str], repo: InMemoryRepo
) -> None:
    """A stop that failed and was delivered later earns the money once."""
    shift_id = uuid.uuid4()
    repo.add_shift(shift_id, COURIER, SHIFT_DATE)
    stop_id = uuid.uuid4()
    repo.add_stop(stop_id, shift_id, "14 Harewood Rd, Bishopdale")
    start = datetime(2026, 10, 21, 9, 0, tzinfo=UTC)
    repo.add_event(stop_id, "failed_access", start)
    repo.add_event(stop_id, "delivered", start + timedelta(hours=2))

    body = api_client.get(f"/shifts/{shift_id}/earnings", headers=auth(sign(COURIER))).json()

    assert body["delivered"] == 1
    assert body["failed"] == 0
    assert body["gross"] == "1.70"


@pytest.mark.repeat(50)
def test_the_same_shift_earns_the_same_money(
    api_client: TestClient, sign: Callable[..., str], repo: InMemoryRepo
) -> None:
    """The 50x backtest: the same events always give the same money."""
    shift_id, _ = seed_shift(repo)

    body = api_client.get(f"/shifts/{shift_id}/earnings", headers=auth(sign(COURIER))).json()

    assert body["gross"] == "5.30"
    assert body["gst"] == "0.69"
    assert body["net"] == "4.61"


def test_a_shift_with_no_events_earns_nothing(
    api_client: TestClient, sign: Callable[..., str], repo: InMemoryRepo
) -> None:
    """A courier who delivered nothing still gets a clean answer."""
    shift_id = uuid.uuid4()
    repo.add_shift(shift_id, COURIER, SHIFT_DATE)

    body = api_client.get(f"/shifts/{shift_id}/earnings", headers=auth(sign(COURIER))).json()

    assert body["delivered"] == 0
    assert body["failed"] == 0
    assert body["skipped"] == 0
    assert body["gross"] == "0.00"
    assert body["gst"] == "0.00"
    assert body["net"] == "0.00"
    assert body["breakdown"] == []


def test_a_delivery_before_the_arrival_is_left_out(
    api_client: TestClient, sign: Callable[..., str], repo: InMemoryRepo
) -> None:
    """A clock that jumped leaves the average unknown, not negative."""
    shift_id = uuid.uuid4()
    repo.add_shift(shift_id, COURIER, SHIFT_DATE)
    stop_id = uuid.uuid4()
    repo.add_stop(stop_id, shift_id, "14 Harewood Rd, Bishopdale")
    start = datetime(2026, 10, 21, 9, 0, tzinfo=UTC)
    repo.add_event(stop_id, "delivered", start)
    repo.add_event(stop_id, "nav_arrived", start + timedelta(minutes=1))

    body = api_client.get(
        f"/shifts/{shift_id}/earnings/summary", headers=auth(sign(COURIER))
    ).json()

    assert body["average_delivery_seconds"] is None
    assert body["gross"] == "1.70"


def test_the_routes_need_a_token(api_client: TestClient, repo: InMemoryRepo) -> None:
    shift_id, _ = seed_shift(repo)

    earnings = api_client.get(f"/shifts/{shift_id}/earnings")
    summary = api_client.get(f"/shifts/{shift_id}/earnings/summary")

    assert earnings.status_code == 401
    assert summary.status_code == 401


def test_another_couriers_shift_is_a_404(api_client: TestClient, sign) -> None:
    shift_id = uuid.uuid4()

    earnings = api_client.get(f"/shifts/{shift_id}/earnings", headers=auth(sign(OTHER_COURIER)))
    summary = api_client.get(
        f"/shifts/{shift_id}/earnings/summary", headers=auth(sign(OTHER_COURIER))
    )

    assert earnings.status_code == 404
    assert summary.status_code == 404


def test_an_unknown_shift_is_a_404(api_client: TestClient, sign) -> None:
    response = api_client.get(f"/shifts/{uuid.uuid4()}/earnings", headers=auth(sign(COURIER)))

    assert response.status_code == 404


def test_the_sql_repository_earns_the_same_money(
    sql_api_client: TestClient, sign: Callable[..., str], fake_db: Any
) -> None:
    """The PostgreSQL implementation earns the same money."""
    shift_id = uuid.uuid4()
    stop_id = uuid.uuid4()
    fake_db.shifts.append([shift_id, SHIFT_DATE, COURIER])
    fake_db.stops.append([stop_id, shift_id, "14 harewood rd, bishopdale", COURIER, 2])
    start = datetime(2026, 10, 21, 9, 0, tzinfo=UTC)
    fake_db.events.append([stop_id, "nav_arrived", start, None, 2])
    fake_db.events.append([stop_id, "delivered", start + timedelta(minutes=5), None, 2])

    body = sql_api_client.get(f"/shifts/{shift_id}/earnings", headers=auth(sign(COURIER))).json()

    assert body["delivered"] == 1
    assert body["gross"] == "1.90"
    assert body["gst"] == "0.25"
    assert body["net"] == "1.65"
    assert any("FROM delivery_events e" in query for query in fake_db.statements())
