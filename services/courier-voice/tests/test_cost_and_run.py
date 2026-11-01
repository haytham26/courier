"""The cost guard and the client of the Courier API.

The guard keeps the day's spend in New Zealand dollars and stops the calls
when the cap is reached. The client reads the day from the API with the
courier's own token and never keeps a list of stops of its own.
"""

from __future__ import annotations

import httpx
import pytest
from datetime import datetime
from zoneinfo import ZoneInfo

from app.cost import CostGuard
from app.models import RunContext, Stop
from app.run_client import RunClient


def test_the_guard_starts_empty():
    guard = CostGuard(limit_nzd=20.0, price_nzd_per_1k_tokens=0.02)
    assert guard.spent_nzd == 0.0
    assert guard.remaining_nzd == 20.0
    assert guard.may_spend() is True


def test_the_cost_of_a_call_is_the_price_of_its_tokens():
    guard = CostGuard(limit_nzd=20.0, price_nzd_per_1k_tokens=0.02)
    assert guard.cost_of(1000) == pytest.approx(0.02)
    assert guard.cost_of(120) == pytest.approx(0.0024)


def test_the_guard_counts_the_calls():
    guard = CostGuard(limit_nzd=20.0, price_nzd_per_1k_tokens=0.02)
    guard.charge(1000)
    guard.charge(1000)
    assert guard.calls == 2
    assert guard.spent_nzd == pytest.approx(0.04)
    assert guard.remaining_nzd == pytest.approx(19.96)


def test_the_guard_stops_the_calls_at_the_cap():
    guard = CostGuard(limit_nzd=0.01, price_nzd_per_1k_tokens=0.02)
    guard.charge(1000)
    assert guard.may_spend() is False


def test_the_guard_starts_again_on_a_new_day():
    guard = CostGuard(limit_nzd=20.0, price_nzd_per_1k_tokens=0.02)
    guard.charge(1000)
    guard.reset_for_a_new_day(now=guard.day_started + 86_401)
    assert guard.spent_nzd == 0.0
    assert guard.calls == 0


def _nz_epoch(year: int, month: int, day: int, hour: int, minute: int = 0) -> float:
    """The epoch seconds of a wall-clock moment in New Zealand."""
    from zoneinfo import ZoneInfo

    return datetime(year, month, day, hour, minute, tzinfo=ZoneInfo("Pacific/Auckland")).timestamp()


def test_the_guards_day_is_a_new_zealand_calendar_day_not_a_rolling_window():
    """BUG-155: the reset fires on the calendar day, not after 86,400 s.

    A courier's shift is a New Zealand day. The guard's "day" was a rolling
    86,400 s window from the first call, so on the 25-hour day (the clocks go
    back on the first Sunday in April) the window ran out in the last half hour
    of the calendar day and the deployment could spend twice the intended cap.
    """
    # 00:30 on 5 April 2026: the morning the clocks go back an hour.
    day_started = _nz_epoch(2026, 4, 5, 0, 30)
    guard = CostGuard(limit_nzd=20.0, price_nzd_per_1k_tokens=0.02, day_started=day_started)
    guard.charge(1000)

    # Twenty-four hours later it is 23:30 on 5 April in New Zealand: the clock
    # went back, so the calendar day is not over. No new budget for the last
    # half hour of it.
    guard.reset_for_a_new_day(now=day_started + 24 * 3600)

    assert guard.spent_nzd == pytest.approx(0.02)
    assert guard.calls == 1

    # One hour later the New Zealand date has turned over: now it resets.
    guard.reset_for_a_new_day(now=day_started + 25 * 3600)

    assert guard.spent_nzd == 0.0
    assert guard.calls == 0


def test_the_guard_resets_on_the_local_midnight():
    """The reset does fire, on the New Zealand midnight."""
    day_started = _nz_epoch(2026, 4, 5, 1, 0)
    guard = CostGuard(limit_nzd=20.0, price_nzd_per_1k_tokens=0.02, day_started=day_started)
    guard.charge(1000)

    # 00:30 on 6 April: the calendar day has turned over.
    guard.reset_for_a_new_day(now=_nz_epoch(2026, 4, 6, 0, 30))

    assert guard.spent_nzd == 0.0
    assert guard.calls == 0


def test_the_guard_does_not_reset_before_its_own_local_midnight():
    """A normal day: the window is the calendar, so a long shift never resets."""
    day_started = _nz_epoch(2026, 11, 2, 6, 30)
    guard = CostGuard(limit_nzd=20.0, price_nzd_per_1k_tokens=0.02, day_started=day_started)
    guard.charge(1000)

    # Twelve hours later it is still 2 November in New Zealand.
    guard.reset_for_a_new_day(now=day_started + 12 * 3600)

    assert guard.spent_nzd == pytest.approx(0.02)


def the_stops() -> list[dict[str, object]]:
    """The stops the API answers with."""
    return [
        {
            "id": "s1",
            "sequence": 1,
            "number": "7",
            "street": "Cranmer Street",
            "suburb": "Addington",
            "status": "pending",
            "size_class": "small",
            "van_zone": "mid-rack",
        }
    ]


def test_the_client_reads_the_stops_with_the_token_of_the_courier():
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, json=the_stops())

    client = RunClient("http://api.test", client=httpx.Client(transport=httpx.MockTransport(handler)))
    stops = client.stops("shift-1", "token-1")

    assert len(stops) == 1
    assert stops[0].spoken_address == "7 Cranmer Street"
    assert seen[0].headers["Authorization"] == "Bearer token-1"


def test_the_client_survives_an_api_that_is_not_there():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("the api is down")

    client = RunClient("http://api.test", client=httpx.Client(transport=httpx.MockTransport(handler)))
    assert client.stops("shift-1", "token-1") == []


def test_the_client_survives_an_answer_that_is_not_a_run():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text="<html>the proxy says hello</html>")

    client = RunClient("http://api.test", client=httpx.Client(transport=httpx.MockTransport(handler)))
    assert client.stops("shift-1", "token-1") == []


def test_the_phone_context_is_used_when_the_api_has_nothing():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404, json={})

    client = RunClient("http://api.test", client=httpx.Client(transport=httpx.MockTransport(handler)))
    fallback = RunContext(stops=(Stop(id="s9", number="3", street="Kowhai Street"),))
    context = client.context("shift-1", "token-1", fallback=fallback)
    assert context.stops[0].spoken_address == "3 Kowhai Street"
    assert context.shift_id == "shift-1"
