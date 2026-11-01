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
from app.repo import DeliveryEventRow, InMemoryRepo, RouteStopRow, RunRecord, get_repo
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


# --- BUG-139: the refusal names every event it refused ----------------------


def test_the_refusal_names_every_event_it_refused(client: TestClient, seeded_run) -> None:
    """A whole-batch refusal must still tell the caller WHICH of its events was
    the problem: one named stop is not an answer (BUG-139)."""
    good = event()
    first_bad = {
        "id": str(uuid.uuid4()),
        "stop_id": str(uuid.uuid4()),
        "kind": "delivered",
        "occurred_at": datetime.now(UTC).isoformat(),
    }
    second_bad = {
        "id": str(uuid.uuid4()),
        "stop_id": str(uuid.uuid4()),
        "kind": "skipped",
        "occurred_at": datetime.now(UTC).isoformat(),
    }

    refused = client.post(
        f"/shifts/{SHIFT_ID}/events:batch", json=[good, first_bad, second_bad]
    )

    assert refused.status_code == 422
    detail = refused.json()["detail"]
    # Both offending events are named, with their index in the batch.
    assert first_bad["stop_id"] in detail
    assert second_bad["stop_id"] in detail
    assert "1" in detail and "2" in detail
    # Nothing landed: the refusal is whole-batch (ADR-014 section 3).
    assert seeded_run.cursor(SHIFT_ID) == 0


# --- BUG-140: the shift's owner is the query's answer, not a second line ----


def test_a_run_of_another_courier_is_not_found_by_the_lookup(
    repo: InMemoryRepo, seeded_run: InMemoryRepo
) -> None:
    """The tenant predicate is the repository's, not only the route's (BUG-140).

    A future caller that forgets the comparison gets None from the store, not
    another courier's row.
    """
    from app.repo import RunRecord

    mine = uuid.uuid4()
    theirs = uuid.uuid4()
    repo.runs[theirs] = RunRecord(
        id=theirs,
        shift_id=uuid.uuid4(),
        courier_id="another-courier",
        name="Their run",
        depot_lat=-43.5330,
        depot_lon=172.6300,
        capacity_parcels=None,
        speed_kmh=30.0,
        start_at=datetime.now(UTC),
    )

    assert repo.get_run_for_shift(theirs_shift_id := repo.runs[theirs].shift_id, COURIER) is None
    assert repo.get_run_for_shift(theirs_shift_id, "another-courier") is not None
    assert repo.get_run_for_shift(SHIFT_ID, COURIER) is not None
    assert mine is not None


# --- BUG-141: the cursor is what the phone's sync writes, not what the API --


def test_a_pod_row_does_not_bump_the_sync_cursor(
    repo: InMemoryRepo, seeded_run: InMemoryRepo
) -> None:
    """The POD route writes through the same path, and the phone's sync loop
    reads this counter: a photograph must not advance it (BUG-141)."""
    repo.append_events(
        SHIFT_ID,
        [
            DeliveryEventRow(
                id=uuid.uuid4(),
                shift_id=SHIFT_ID,
                stop_id=STOP_ID,
                kind="pod_captured",
                utterance=None,
                safe_place=None,
                lat=None,
                lon=None,
                accuracy_m=None,
                occurred_at=datetime.now(UTC),
            )
        ],
    )

    assert seeded_run.cursor(SHIFT_ID) == 0

    repo.append_events(
        SHIFT_ID,
        [
            DeliveryEventRow(
                id=uuid.uuid4(),
                shift_id=SHIFT_ID,
                stop_id=STOP_ID,
                kind="delivered",
                utterance=None,
                safe_place=None,
                lat=None,
                lon=None,
                accuracy_m=None,
                occurred_at=datetime.now(UTC),
            )
        ],
    )

    assert seeded_run.cursor(SHIFT_ID) == 1


def an_event(stop_id: Any = STOP_ID, **overrides: Any) -> DeliveryEventRow:
    """One delivery event row, as the sync endpoint would carry it."""
    values: dict[str, Any] = {
        "id": uuid.uuid4(),
        "shift_id": SHIFT_ID,
        "stop_id": stop_id,
        "kind": "delivered",
        "utterance": None,
        "safe_place": None,
        "lat": None,
        "lon": None,
        "accuracy_m": None,
        "occurred_at": datetime.now(UTC),
    }
    values.update(overrides)
    return DeliveryEventRow(**values)


class TestTheInMemoryAppendIsAtomic:
    """BUG-145: the double applies the batch as one decision, then one mutation.

    Production wraps its whole batch in `engine.begin()`; the in-memory repo
    wrote each row as it walked the batch, so a raise in the middle left half
    the batch applied and `self.events` and `self.by_shift` could disagree. A
    test double that answers non-atomically lets a test pass on an atomicity
    production has and the double does not - which is exactly the shape that
    hid BUG-115.
    """

    def test_a_failure_in_the_middle_of_a_batch_applies_nothing(
        self, repo: InMemoryRepo, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        known = an_event()
        repo.append_events(SHIFT_ID, [known])
        fresh = an_event()
        replay = an_event(id=known.id)

        def explode(existing: Any, incoming: Any) -> bool:
            if incoming is replay:
                raise RuntimeError("the batch's last row")
            return True

        monkeypatch.setattr("app.repo._same_event", explode)

        with pytest.raises(RuntimeError):
            repo.append_events(SHIFT_ID, [fresh, replay])

        # Only what the store held before the batch is there: the fresh row is
        # not applied, and the shift's index did not grow.
        assert list(repo.events) == [known.id]
        assert repo.by_shift[SHIFT_ID] == [known.id]

    def test_a_batch_that_succeeds_applies_all_of_it(self, repo: InMemoryRepo) -> None:
        first = an_event()
        second = an_event()

        answer = repo.append_events(SHIFT_ID, [first, second])

        assert answer.stored == 2
        assert len(repo.events) == 2
        assert len(repo.by_shift[SHIFT_ID]) == 2

    def test_a_batch_carrying_the_same_id_twice_is_a_conflict(
        self, repo: InMemoryRepo
    ) -> None:
        """The SQL repo answers an intra-batch divergence; so does this one."""
        first = an_event()
        again = an_event(id=first.id, safe_place="a different door")

        answer = repo.append_events(SHIFT_ID, [first, again])

        assert answer.stored == 1
        assert answer.conflicts == (first.id,)
        assert repo.by_shift[SHIFT_ID] == [first.id]
