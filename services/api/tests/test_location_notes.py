"""The location notes (ADR-012): the door memory, its authz and its upsert.

The identity is derived from the canonical address (no nearest-neighbour, no
proximity guess), and the notes are private to the courier: the same door
gives two couriers two independent memories, and a location the caller never
had a stop at is a 404 - existence is never disclosed cross-courier.
"""

from __future__ import annotations

import uuid
from collections.abc import Iterator
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.auth.jwks import get_verifier
from app.locations import canonical_address, location_id_for
from app.main import app
from app.repo import InMemoryRepo, RouteStopRow, RunRecord, get_repo
from tests.auth.test_jwks import make_key_pair, make_verifier, sign

COURIER = "driver-7"
OTHER = "driver-8"
START_AT = datetime(2026, 10, 25, 7, 30, tzinfo=UTC)
GATE_CODE = "12 Riccarton Road"


@pytest.fixture()
def repo() -> InMemoryRepo:
    return InMemoryRepo()


@pytest.fixture()
def verifier_key(repo: InMemoryRepo) -> Iterator[object]:
    key_pair = make_key_pair()
    _, jwk = key_pair
    app.dependency_overrides[get_repo] = lambda: repo
    app.dependency_overrides[get_verifier] = lambda: make_verifier({"keys": [jwk]})
    yield key_pair[0]
    app.dependency_overrides.clear()


@pytest.fixture()
def client(verifier_key: object) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        test_client.headers.update(
            {"Authorization": f"Bearer {sign(verifier_key, subject=COURIER)}"}
        )
        yield test_client


@pytest.fixture()
def other_client(verifier_key: object) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        test_client.headers.update({"Authorization": f"Bearer {sign(verifier_key, subject=OTHER)}"})
        yield test_client


@pytest.fixture()
def anonymous_client(verifier_key: object) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


def seed_run_with_location(
    repo: InMemoryRepo,
    *,
    address: str = GATE_CODE,
    courier_id: str = COURIER,
) -> tuple[uuid.UUID, uuid.UUID, str]:
    """A run of one stop at the address; returns (run_id, stop_id, location_id)."""
    run_id, shift_id, stop_id = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    repo.runs[run_id] = RunRecord(
        id=run_id,
        shift_id=shift_id,
        courier_id=courier_id,
        name="Hornby run",
        depot_lat=-43.5330,
        depot_lon=172.6300,
        capacity_parcels=None,
        speed_kmh=30.0,
        start_at=START_AT,
    )
    repo.run_stops[run_id] = [
        RouteStopRow(
            id=stop_id,
            lat=-43.5400,
            lon=172.6000,
            priority=False,
            parcels=1,
            service_time_s=None,
            window_start=None,
            window_end=None,
            address=address,
            location_id=location_id_for(address, None),
        )
    ]
    return run_id, stop_id, str(location_id_for(address, None))


class TestTheStopLocationId:
    def test_the_stop_response_carries_the_location_id(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        """The phone never recomputes the hash: it reads the server's id."""
        _, _, location_id = seed_run_with_location(repo)
        shift_id = next(iter(repo.runs.values())).shift_id

        listed = client.get(f"/shifts/{shift_id}/stops")

        assert listed.status_code == 200, listed.text
        assert listed.json()[0]["location_id"] == location_id

    def test_the_id_is_the_canonical_address_identity(self) -> None:
        """Case, commas and spacing are noise; the door is the door."""
        assert location_id_for("12 Riccarton Road", None) == location_id_for(
            " 12, RICCARTON   road ", None
        )
        assert location_id_for("12 Riccarton Road", None) != location_id_for(
            "12 Riccarton Road", "Harewood"
        )
        assert canonical_address("12, RICCARTON   road ", " Harewood ") == (
            "12 riccarton road|harewood"
        )

    def test_the_namespace_is_pinned(self) -> None:
        """The review's finding: a renamed namespace would silently re-key
        every new stop while the existing door memory keeps the old id. This
        literal is the promised stability."""
        assert location_id_for("12 Riccarton Road", None) == uuid.UUID(
            "57a6d54b-11f7-5b91-9b07-43ea733e3ef2"
        )

    def test_an_empty_address_is_refused(self) -> None:
        """The review's collision: every empty pin would share one id."""
        with pytest.raises(ValueError):
            location_id_for("", None)
        with pytest.raises(ValueError):
            location_id_for("   ", "Harewood")


class TestStoringANote:
    def test_a_new_kind_is_201_and_reads_back(self, client: TestClient, repo: InMemoryRepo) -> None:
        _, _, location_id = seed_run_with_location(repo)

        stored = client.post(
            f"/locations/{location_id}/notes",
            json={"kind": "gate_code", "body": "1234", "confidence": 0.9},
        )

        assert stored.status_code == 201, stored.text
        note = stored.json()
        assert note["kind"] == "gate_code"
        assert note["body"] == "1234"
        assert note["confidence"] == 0.9
        assert datetime.fromisoformat(note["last_confirmed"])

        listed = client.get(f"/locations/{location_id}/notes")
        assert listed.status_code == 200
        assert [item["body"] for item in listed.json()] == ["1234"]

    def test_a_correction_is_200_and_keeps_the_id(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        """One gate code per door: the same kind corrects, never duplicates."""
        _, _, location_id = seed_run_with_location(repo)
        first = client.post(
            f"/locations/{location_id}/notes",
            json={"kind": "gate_code", "body": "1234"},
        )
        assert first.status_code == 201

        corrected = client.post(
            f"/locations/{location_id}/notes",
            json={"kind": "gate_code", "body": "9944"},
        )

        assert corrected.status_code == 200, corrected.text
        assert corrected.json()["id"] == first.json()["id"]
        assert corrected.json()["body"] == "9944"
        listed = client.get(f"/locations/{location_id}/notes")
        assert [item["body"] for item in listed.json()] == ["9944"]

    def test_two_kinds_are_two_notes_ordered_by_kind(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        _, _, location_id = seed_run_with_location(repo)
        client.post(
            f"/locations/{location_id}/notes",
            json={"kind": "hazard", "body": "dog at the side gate"},
        )
        client.post(
            f"/locations/{location_id}/notes",
            json={"kind": "gate_code", "body": "1234"},
        )

        listed = client.get(f"/locations/{location_id}/notes")

        assert [item["kind"] for item in listed.json()] == ["gate_code", "hazard"]

    def test_the_default_confidence_is_a_half(self, client: TestClient, repo: InMemoryRepo) -> None:
        _, _, location_id = seed_run_with_location(repo)

        stored = client.post(
            f"/locations/{location_id}/notes",
            json={"kind": "safe_place", "body": "by the meter box"},
        )

        assert stored.json()["confidence"] == 0.5


class TestTheAuthz:
    def test_a_courier_without_a_stop_gets_404_on_both_verbs(
        self, other_client: TestClient, repo: InMemoryRepo
    ) -> None:
        _, _, location_id = seed_run_with_location(repo)

        assert other_client.get(f"/locations/{location_id}/notes").status_code == 404
        assert (
            other_client.post(
                f"/locations/{location_id}/notes",
                json={"kind": "gate_code", "body": "1234"},
            ).status_code
            == 404
        )

    def test_an_unknown_location_is_404(self, client: TestClient, repo: InMemoryRepo) -> None:
        seed_run_with_location(repo)

        assert client.get(f"/locations/{uuid.uuid4()}/notes").status_code == 404

    def test_two_couriers_at_one_door_keep_two_memories(
        self,
        client: TestClient,
        other_client: TestClient,
        repo: InMemoryRepo,
    ) -> None:
        """The door memory is the courier's own knowledge, not a shared list."""
        _, _, location_id = seed_run_with_location(repo, courier_id=COURIER)
        seed_run_with_location(repo, courier_id=OTHER)

        stored = client.post(
            f"/locations/{location_id}/notes",
            json={"kind": "gate_code", "body": "A's gate code"},
        )
        assert stored.status_code == 201

        foreign = other_client.get(f"/locations/{location_id}/notes")
        assert foreign.status_code == 200
        assert foreign.json() == []

        other_client.post(
            f"/locations/{location_id}/notes",
            json={"kind": "gate_code", "body": "B's own code"},
        )
        assert [item["body"] for item in client.get(f"/locations/{location_id}/notes").json()] == [
            "A's gate code"
        ]
        assert [
            item["body"] for item in other_client.get(f"/locations/{location_id}/notes").json()
        ] == ["B's own code"]

    def test_a_courier_with_no_runs_at_all_gets_404(
        self, other_client: TestClient, repo: InMemoryRepo
    ) -> None:
        assert other_client.get(f"/locations/{uuid.uuid4()}/notes").status_code == 404

    def test_an_anonymous_call_is_refused(
        self, anonymous_client: TestClient, repo: InMemoryRepo
    ) -> None:
        _, _, location_id = seed_run_with_location(repo)

        assert anonymous_client.get(f"/locations/{location_id}/notes").status_code == 401
        assert (
            anonymous_client.post(
                f"/locations/{location_id}/notes",
                json={"kind": "gate_code", "body": "1234"},
            ).status_code
            == 401
        )


class TestTheValidation:
    @pytest.mark.parametrize(
        "payload",
        [
            {"kind": "not_a_kind", "body": "1234"},
            {"kind": "gate_code", "body": ""},
            {"kind": "gate_code", "body": "   "},
            {"kind": "gate_code", "body": "x" * 501},
            {"kind": "gate_code", "body": "1234", "confidence": 1.5},
            {"kind": "gate_code", "body": "1234", "confidence": -0.1},
        ],
    )
    def test_a_bad_note_is_refused_before_it_is_stored(
        self, client: TestClient, repo: InMemoryRepo, payload: dict[str, object]
    ) -> None:
        _, _, location_id = seed_run_with_location(repo)

        refused = client.post(f"/locations/{location_id}/notes", json=payload)

        assert refused.status_code == 422, refused.text
        assert client.get(f"/locations/{location_id}/notes").json() == []

    def test_the_body_is_stripped_of_the_edges(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        _, _, location_id = seed_run_with_location(repo)

        stored = client.post(
            f"/locations/{location_id}/notes",
            json={"kind": "gate_code", "body": "  1234  "},
        )

        assert stored.status_code == 201
        assert stored.json()["body"] == "1234"
