"""The runs API: create a run, list the courier's own runs, read one back.

The run is the unit the routing engine plans and the phone renders; creation
is the first write the phone does without the intake graph. Every endpoint
sits behind the JWKS bearer auth, and every read is scoped to the courier who
owns the run (ASVS V4: existence is never disclosed cross-courier - a foreign
run is 404, not 403).
"""

from __future__ import annotations

import uuid
from collections.abc import Iterator
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.auth.jwks import get_verifier
from app.main import app
from app.repo import InMemoryRepo, RouteStopRow, RunRecord, get_repo
from tests.auth.test_jwks import make_key_pair, make_verifier, sign

COURIER = "driver-7"
OTHER = "driver-8"
START_AT = datetime(2026, 10, 24, 7, 30, tzinfo=UTC)


def run_body(**overrides: object) -> dict[str, object]:
    """A valid create-run request, with the named fields replaced."""
    body: dict[str, object] = {
        "name": "Hornby morning",
        "shift_id": str(uuid.uuid4()),
        "depot": {"lat": -43.5330, "lon": 172.6300},
        "start_at": START_AT.isoformat(),
        "capacity_parcels": 120,
        "speed_kmh": 30.0,
    }
    body.update(overrides)
    return body


@pytest.fixture()
def repo() -> InMemoryRepo:
    return InMemoryRepo()


@pytest.fixture()
def verifier_key(repo: InMemoryRepo) -> Iterator[object]:
    """The one key pair the whole module verifies against.

    Every client in a test shares it (a second override would kill the first
    client's tokens); the identity comes from the token's subject, so two
    couriers are two subjects, not two verifiers.
    """
    key_pair = make_key_pair()
    _, jwk = key_pair
    app.dependency_overrides[get_repo] = lambda: repo
    app.dependency_overrides[get_verifier] = lambda: make_verifier({"keys": [jwk]})
    yield key_pair[0]
    app.dependency_overrides.clear()


@pytest.fixture()
def client(verifier_key: object) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        test_client.headers.update({"Authorization": f"Bearer {sign(verifier_key, subject=COURIER)}"})
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


class TestCreatingARun:
    def test_a_run_is_created_and_read_back(self, client: TestClient) -> None:
        body = run_body()

        created = client.post("/runs", json=body)
        assert created.status_code == 201, created.text
        run = created.json()
        assert uuid.UUID(run["id"])
        assert run["name"] == "Hornby morning"
        assert run["depot"] == {"lat": -43.5330, "lon": 172.6300}
        assert run["capacity_parcels"] == 120
        assert run["speed_kmh"] == 30.0
        assert run["start_at"] == START_AT.isoformat()

        read = client.get(f"/runs/{run['id']}")
        assert read.status_code == 200
        assert read.json() == run

    def test_the_runs_list_holds_the_runs_the_courier_created(
        self, client: TestClient
    ) -> None:
        first = client.post("/runs", json=run_body(name="First"))
        second = client.post("/runs", json=run_body(name="Second"))

        listed = client.get("/runs")

        assert listed.status_code == 200
        names = {item["name"] for item in listed.json()}
        assert names == {"First", "Second"}
        assert {first.json()["id"], second.json()["id"]} == {
            item["id"] for item in listed.json()
        }

    def test_another_courier_neither_reads_nor_lists_the_run(
        self, client: TestClient, other_client: TestClient
    ) -> None:
        run_id = client.post("/runs", json=run_body()).json()["id"]

        foreign = other_client.get(f"/runs/{run_id}")
        assert foreign.status_code == 404

        foreign_list = other_client.get("/runs")
        assert foreign_list.status_code == 200
        assert foreign_list.json() == []

    def test_an_anonymous_call_is_refused_before_anything_else(
        self, anonymous_client: TestClient
    ) -> None:
        refused = anonymous_client.post("/runs", json=run_body())
        assert refused.status_code == 401

        listed = anonymous_client.get("/runs")
        assert listed.status_code == 401


class TestListingTheStops:
    def seed_run_with_two_stops(self, repo: InMemoryRepo) -> tuple[uuid.UUID, uuid.UUID]:
        """A run with two pending stops, as the intake slice would leave it."""
        run_id, shift_id = uuid.uuid4(), uuid.uuid4()
        repo.runs[run_id] = RunRecord(
            id=run_id,
            shift_id=shift_id,
            courier_id=COURIER,
            name="Hornby run",
            depot_lat=-43.5330,
            depot_lon=172.6300,
            capacity_parcels=None,
            speed_kmh=30.0,
            start_at=START_AT,
        )
        repo.run_stops[run_id] = [
            RouteStopRow(
                id=uuid.uuid4(),
                lat=-43.5400,
                lon=172.6000,
                priority=False,
                parcels=1,
                service_time_s=120,
                window_start=None,
                window_end=None,
                address="45 Papanui Road",
            ),
            RouteStopRow(
                id=uuid.uuid4(),
                lat=-43.5200,
                lon=172.6400,
                priority=True,
                parcels=2,
                service_time_s=None,
                window_start=None,
                window_end=None,
                address="12 Riccarton Road",
            ),
        ]
        return run_id, shift_id

    def test_the_stops_list_their_address_and_status(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        _, shift_id = self.seed_run_with_two_stops(repo)

        listed = client.get(f"/shifts/{shift_id}/stops")

        assert listed.status_code == 200, listed.text
        stops = listed.json()
        assert [stop["status"] for stop in stops] == ["pending", "pending"]
        assert [stop["address"] for stop in stops] == [
            "45 Papanui Road",
            "12 Riccarton Road",
        ]
        assert [stop["seq"] for stop in stops] == [1, 2]
        assert (stops[0]["lat"], stops[0]["lon"]) == (-43.5400, 172.6000)
        assert (stops[1]["lat"], stops[1]["lon"]) == (-43.5200, 172.6400)

    def test_a_delivery_event_flips_the_stop_status(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        run_id, shift_id = self.seed_run_with_two_stops(repo)
        stop_id = repo.run_stops[run_id][0].id
        marked = client.post(
            f"/shifts/{shift_id}/events:batch",
            json=[
                {
                    "id": str(uuid.uuid4()),
                    "stop_id": str(stop_id),
                    "kind": "delivered",
                    "occurred_at": START_AT.isoformat(),
                }
            ],
        )
        assert marked.status_code == 200, marked.text

        listed = client.get(f"/shifts/{shift_id}/stops")

        assert [stop["status"] for stop in listed.json()] == ["delivered", "pending"]

    def test_the_status_filter_keeps_only_the_matching_stops(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        run_id, shift_id = self.seed_run_with_two_stops(repo)
        client.post(
            f"/shifts/{shift_id}/events:batch",
            json=[
                {
                    "id": str(uuid.uuid4()),
                    "stop_id": str(repo.run_stops[run_id][0].id),
                    "kind": "delivered",
                    "occurred_at": START_AT.isoformat(),
                }
            ],
        )

        delivered = client.get(f"/shifts/{shift_id}/stops?status=delivered")

        assert [stop["status"] for stop in delivered.json()] == ["delivered"]
        assert delivered.json()[0]["address"] == "45 Papanui Road"

    def test_an_unknown_status_filter_is_refused(self, client: TestClient, repo: InMemoryRepo) -> None:
        _, shift_id = self.seed_run_with_two_stops(repo)

        refused = client.get(f"/shifts/{shift_id}/stops?status=someday")

        assert refused.status_code == 422

    def test_a_foreign_shift_is_not_found(
        self, client: TestClient, other_client: TestClient, repo: InMemoryRepo
    ) -> None:
        _, shift_id = self.seed_run_with_two_stops(repo)

        foreign = other_client.get(f"/shifts/{shift_id}/stops")

        assert foreign.status_code == 404


class TestCreateRunValidation:
    def test_unknown_fields_are_refused_not_dropped(self, client: TestClient) -> None:
        refused = client.post("/runs", json=run_body(territory={"type": "MultiPolygon"}))

        assert refused.status_code == 422

    def test_the_numbers_are_bounded(self, client: TestClient) -> None:
        for bad in (
            run_body(speed_kmh=0.0),
            run_body(speed_kmh=200.0),
            run_body(capacity_parcels=-1),
            run_body(capacity_parcels=10_000),
            run_body(name=""),
            run_body(name="x" * 121),
        ):
            refused = client.post("/runs", json=bad)
            assert refused.status_code == 422, bad

    def test_the_depot_coordinates_are_a_globe(self, client: TestClient) -> None:
        for bad in (
            run_body(depot={"lat": 91.0, "lon": 172.6300}),
            run_body(depot={"lat": -43.5330, "lon": 181.0}),
        ):
            refused = client.post("/runs", json=bad)
            assert refused.status_code == 422, bad
