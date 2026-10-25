"""Tests for the offline-first sync endpoint.

The courier works offline for hours: the phone keeps the events and replays
them in batches. The endpoint must be idempotent (the same event can arrive
twice) and it must answer with the cursor the phone uses to know where it is.
"""

from __future__ import annotations

import uuid
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.auth.jwks import get_verifier
from app.main import app
from app.repo import InMemoryRepo, RouteStopRow, RunRecord, get_repo
from tests.auth.test_jwks import make_key_pair, make_verifier, sign

COURIER = "driver-7"
SHIFT_ID = uuid.uuid4()
STOP_ID = uuid.uuid4()


@pytest.fixture()
def seeded_run(repo: InMemoryRepo) -> InMemoryRepo:
    """The run the shift's events belong to (the sync endpoint refuses an
    unowned shift: events decide stop statuses, so the shift must be the
    caller's own - ASVS V4)."""
    run_id = uuid.uuid4()
    repo.runs[run_id] = RunRecord(
        id=run_id,
        shift_id=SHIFT_ID,
        courier_id=COURIER,
        name="Hornby run",
        depot_lat=-43.5330,
        depot_lon=172.6300,
        capacity_parcels=None,
        speed_kmh=30.0,
        start_at=datetime.now(UTC),
    )
    repo.run_stops[run_id] = [
        RouteStopRow(
            id=STOP_ID,
            lat=-43.54,
            lon=172.60,
            priority=False,
            parcels=1,
            service_time_s=None,
            window_start=None,
            window_end=None,
        )
    ]
    return repo


@pytest.fixture()
def repo() -> InMemoryRepo:
    return InMemoryRepo()


@pytest.fixture()
def client(repo: InMemoryRepo) -> Iterator[TestClient]:
    key_pair = make_key_pair()
    _, jwk = key_pair
    app.dependency_overrides[get_repo] = lambda: repo
    app.dependency_overrides[get_verifier] = lambda: make_verifier({"keys": [jwk]})
    with TestClient(app) as test_client:
        test_client.headers.update(
            {"Authorization": f"Bearer {sign(key_pair[0], subject='driver-7')}"}
        )
        yield test_client
    app.dependency_overrides.clear()


def event(event_id: uuid.UUID | None = None, kind: str = "delivered") -> dict[str, Any]:
    return {
        "id": str(event_id or uuid.uuid4()),
        "stop_id": str(STOP_ID),
        "kind": kind,
        "utterance": "left with the neighbour",
        "safe_place": "behind the planter",
        "lat": -43.535,
        "lon": 172.605,
        "accuracy_m": 8.5,
        "occurred_at": datetime.now(UTC).isoformat(),
    }


class TestEventSync:
    def test_stores_a_batch_and_answers_with_the_cursor(
        self, client: TestClient, seeded_run: InMemoryRepo
    ) -> None:
        response = client.post(f"/shifts/{SHIFT_ID}/events:batch", json=[event(), event()])
        assert response.status_code == 200
        body = response.json()
        assert body["accepted"] == 2
        assert body["cursor"] == 2
        assert body["conflicts"] == []

    def test_the_same_event_twice_is_stored_once(
        self, client: TestClient, seeded_run: InMemoryRepo
    ) -> None:
        event_id = uuid.uuid4()
        # A replay is the same payload byte for byte (the phone stores the
        # event once): the same dict, not a regenerated timestamp.
        payload = event(event_id)
        first = client.post(f"/shifts/{SHIFT_ID}/events:batch", json=[payload])
        second = client.post(f"/shifts/{SHIFT_ID}/events:batch", json=[payload])
        assert first.json()["accepted"] == 1
        assert second.json()["accepted"] == 0
        assert second.json()["cursor"] == 1
        assert second.json()["conflicts"] == []

    def test_an_empty_batch_is_accepted(self, client: TestClient, seeded_run: InMemoryRepo) -> None:
        response = client.post(f"/shifts/{SHIFT_ID}/events:batch", json=[])
        assert response.status_code == 200
        assert response.json() == {"accepted": 0, "cursor": 0, "conflicts": []}

    def test_an_event_for_a_stop_outside_the_run_is_refused(
        self, client: TestClient, seeded_run: InMemoryRepo
    ) -> None:
        invented = client.post(
            f"/shifts/{SHIFT_ID}/events:batch",
            json=[
                {
                    "id": str(uuid.uuid4()),
                    "stop_id": str(uuid.uuid4()),
                    "kind": "delivered",
                    "occurred_at": datetime.now(UTC).isoformat(),
                }
            ],
        )

        assert invented.status_code == 422, invented.text
        assert "not in this run" in invented.json()["detail"]

    def test_a_batch_over_the_cap_is_refused(
        self, client: TestClient, seeded_run: InMemoryRepo
    ) -> None:
        flood = client.post(
            f"/shifts/{SHIFT_ID}/events:batch",
            json=[event() for _ in range(501)],
        )

        assert flood.status_code == 422, flood.text

    def test_a_malformed_event_is_refused(
        self, client: TestClient, seeded_run: InMemoryRepo
    ) -> None:
        broken = event()
        broken["occurred_at"] = "not a timestamp"
        response = client.post(f"/shifts/{SHIFT_ID}/events:batch", json=[broken])
        assert response.status_code == 422

    def test_the_shift_is_part_of_the_key(
        self, client: TestClient, repo: InMemoryRepo, seeded_run: InMemoryRepo
    ) -> None:
        event_id = uuid.uuid4()
        client.post(f"/shifts/{SHIFT_ID}/events:batch", json=[event(event_id)])
        other_shift = uuid.uuid4()
        other_run = uuid.uuid4()
        repo.runs[other_run] = RunRecord(
            id=other_run,
            shift_id=other_shift,
            courier_id=COURIER,
            name="Second run",
            depot_lat=-43.5330,
            depot_lon=172.6300,
            capacity_parcels=None,
            speed_kmh=30.0,
            start_at=datetime.now(UTC),
        )
        repo.run_stops[other_run] = [
            RouteStopRow(
                id=STOP_ID,
                lat=-43.54,
                lon=172.60,
                priority=False,
                parcels=1,
                service_time_s=None,
                window_start=None,
                window_end=None,
            )
        ]
        client.post(f"/shifts/{other_shift}/events:batch", json=[event(event_id)])
        assert len(repo.events) == 1
        assert repo.cursor(other_shift) == 0


class TestTheConflictRules:
    """ADR-014: the first write wins, divergence is reported, the clock is bounded."""

    def test_a_divergent_replay_is_a_conflict_and_the_first_write_wins(
        self, client: TestClient, seeded_run: InMemoryRepo
    ) -> None:
        event_id = uuid.uuid4()
        payload = event(event_id)
        first = client.post(f"/shifts/{SHIFT_ID}/events:batch", json=[payload])
        changed = dict(payload, kind="failed")
        second = client.post(f"/shifts/{SHIFT_ID}/events:batch", json=[changed])

        assert first.json()["accepted"] == 1
        assert second.json()["accepted"] == 0
        assert second.json()["conflicts"] == [str(event_id)]
        assert second.json()["cursor"] == 1
        assert seeded_run.events[event_id].kind == "delivered"

    def test_a_changed_field_is_a_conflict_too(
        self, client: TestClient, seeded_run: InMemoryRepo
    ) -> None:
        event_id = uuid.uuid4()
        payload = event(event_id)
        client.post(f"/shifts/{SHIFT_ID}/events:batch", json=[payload])
        changed = dict(payload, safe_place="somewhere else")

        second = client.post(f"/shifts/{SHIFT_ID}/events:batch", json=[changed])

        assert second.json()["conflicts"] == [str(event_id)]
        assert seeded_run.events[event_id].safe_place == "behind the planter"

    def test_the_first_write_wins_in_the_other_direction_too(
        self, client: TestClient, seeded_run: InMemoryRepo
    ) -> None:
        event_id = uuid.uuid4()
        payload = event(event_id, kind="failed")
        client.post(f"/shifts/{SHIFT_ID}/events:batch", json=[payload])
        changed = dict(payload, kind="delivered")

        second = client.post(f"/shifts/{SHIFT_ID}/events:batch", json=[changed])

        assert second.json()["conflicts"] == [str(event_id)]
        assert seeded_run.events[event_id].kind == "failed"

    def test_a_divergent_duplicate_within_one_batch_is_a_conflict(
        self, client: TestClient, seeded_run: InMemoryRepo
    ) -> None:
        """The batch itself can carry the id twice; the first copy wins and
        the phone is told (the SQL repo answers the same way)."""
        event_id = uuid.uuid4()
        first = event(event_id)
        changed = dict(first, kind="failed")

        response = client.post(f"/shifts/{SHIFT_ID}/events:batch", json=[first, changed])

        assert response.json()["accepted"] == 1
        assert response.json()["conflicts"] == [str(event_id)]
        assert seeded_run.events[event_id].kind == "delivered"

    def test_the_latest_event_decides_the_stop_status(
        self, client: TestClient, seeded_run: InMemoryRepo
    ) -> None:
        now = datetime.now(UTC)
        first = event()
        first["kind"] = "delivered"
        first["occurred_at"] = (now - timedelta(minutes=10)).isoformat()
        second = event()
        second["kind"] = "failed"
        second["occurred_at"] = (now - timedelta(minutes=5)).isoformat()

        client.post(f"/shifts/{SHIFT_ID}/events:batch", json=[first, second])

        rows = seeded_run.get_run_stops(next(iter(seeded_run.runs)))
        assert rows[0].status == "failed"

    def test_equal_times_break_by_arrival(
        self, client: TestClient, seeded_run: InMemoryRepo
    ) -> None:
        at = (datetime.now(UTC) - timedelta(minutes=5)).isoformat()
        first = event()
        first["kind"] = "delivered"
        first["occurred_at"] = at
        second = event()
        second["kind"] = "skipped"
        second["occurred_at"] = at

        client.post(f"/shifts/{SHIFT_ID}/events:batch", json=[first, second])

        rows = seeded_run.get_run_stops(next(iter(seeded_run.runs)))
        assert rows[0].status == "skipped"

    def test_ordinary_clock_skew_is_tolerated(
        self, client: TestClient, seeded_run: InMemoryRepo
    ) -> None:
        soon = event()
        soon["occurred_at"] = (datetime.now(UTC) + timedelta(minutes=30)).isoformat()

        accepted = client.post(f"/shifts/{SHIFT_ID}/events:batch", json=[soon])

        assert accepted.status_code == 200, accepted.text

    def test_an_event_far_in_the_future_is_refused(
        self, client: TestClient, seeded_run: InMemoryRepo
    ) -> None:
        ahead = event()
        ahead["occurred_at"] = (datetime.now(UTC) + timedelta(hours=2)).isoformat()

        refused = client.post(f"/shifts/{SHIFT_ID}/events:batch", json=[ahead])

        assert refused.status_code == 422
        assert "future" in refused.text

    def test_an_ancient_event_is_refused(
        self, client: TestClient, seeded_run: InMemoryRepo
    ) -> None:
        old = event()
        old["occurred_at"] = (datetime.now(UTC) - timedelta(days=8)).isoformat()

        refused = client.post(f"/shifts/{SHIFT_ID}/events:batch", json=[old])

        assert refused.status_code == 422
        assert "7 days" in refused.text
