"""Tests for the offline-first sync endpoint.

The courier works offline for hours: the phone keeps the events and replays
them in batches. The endpoint must be idempotent (the same event can arrive
twice) and it must answer with the cursor the phone uses to know where it is.
"""

from __future__ import annotations

import uuid
from collections.abc import Iterator
from datetime import UTC, datetime
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.auth.jwks import get_verifier
from app.main import app
from app.repo import InMemoryRepo, RunRecord, get_repo
from tests.auth.test_jwks import make_key_pair, make_verifier, sign

COURIER = "driver-7"
SHIFT_ID = uuid.uuid4()
STOP_ID = uuid.uuid4()


@pytest.fixture()
def seeded_run(repo: InMemoryRepo) -> InMemoryRepo:
    """The run the shift's events belong to (the sync endpoint refuses an
    unowned shift: events decide stop statuses, so the shift must be the
    caller's own - ASVS V4)."""
    repo.runs[uuid.uuid4()] = RunRecord(
        id=uuid.uuid4(),
        shift_id=SHIFT_ID,
        courier_id=COURIER,
        name="Hornby run",
        depot_lat=-43.5330,
        depot_lon=172.6300,
        capacity_parcels=None,
        speed_kmh=30.0,
        start_at=datetime.now(UTC),
    )
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

    def test_the_same_event_twice_is_stored_once(
        self, client: TestClient, seeded_run: InMemoryRepo
    ) -> None:
        event_id = uuid.uuid4()
        first = client.post(f"/shifts/{SHIFT_ID}/events:batch", json=[event(event_id)])
        second = client.post(f"/shifts/{SHIFT_ID}/events:batch", json=[event(event_id)])
        assert first.json()["accepted"] == 1
        assert second.json()["accepted"] == 0
        assert second.json()["cursor"] == 1

    def test_an_empty_batch_is_accepted(self, client: TestClient, seeded_run: InMemoryRepo) -> None:
        response = client.post(f"/shifts/{SHIFT_ID}/events:batch", json=[])
        assert response.status_code == 200
        assert response.json() == {"accepted": 0, "cursor": 0}

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
        repo.runs[uuid.uuid4()] = RunRecord(
            id=uuid.uuid4(),
            shift_id=other_shift,
            courier_id=COURIER,
            name="Second run",
            depot_lat=-43.5330,
            depot_lon=172.6300,
            capacity_parcels=None,
            speed_kmh=30.0,
            start_at=datetime.now(UTC),
        )
        client.post(f"/shifts/{other_shift}/events:batch", json=[event(event_id)])
        assert len(repo.events) == 1
        assert repo.cursor(other_shift) == 0
