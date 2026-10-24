"""The runs API: create a run, list the courier's own runs, read one back.

The run is the unit the routing engine plans and the phone renders; creation
is the first write the phone does without the intake graph. Every endpoint
sits behind the JWKS bearer auth, and every read is scoped to the courier who
owns the run (ASVS V4: existence is never disclosed cross-courier - a foreign
run is 404, not 403).
"""

from __future__ import annotations

import hashlib
import uuid
from collections.abc import Iterator
from datetime import UTC, datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.auth.jwks import get_verifier
from app.main import _route_request, app
from app.repo import InMemoryRepo, RouteStopRow, RunRecord, get_repo
from app.routing import schedule_plan
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

    def test_the_runs_list_holds_the_runs_the_courier_created(self, client: TestClient) -> None:
        first = client.post("/runs", json=run_body(name="First"))
        second = client.post("/runs", json=run_body(name="Second"))

        listed = client.get("/runs")

        assert listed.status_code == 200
        names = {item["name"] for item in listed.json()}
        assert names == {"First", "Second"}
        assert {first.json()["id"], second.json()["id"]} == {item["id"] for item in listed.json()}

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


def seed_run_with_stops(
    repo: InMemoryRepo,
    *,
    count: int = 2,
    courier_id: str = COURIER,
) -> tuple[uuid.UUID, uuid.UUID]:
    """A run with `count` pending stops, as the intake slice would leave it."""
    run_id, shift_id = uuid.uuid4(), uuid.uuid4()
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
            id=uuid.uuid4(),
            lat=-43.5400 + 0.01 * index,
            lon=172.6000 + 0.01 * index,
            priority=index == 1,
            parcels=1 + index,
            service_time_s=120 if index == 0 else None,
            window_start=None,
            window_end=None,
            address=f"{12 + index} Riccarton Road",
        )
        for index in range(count)
    ]
    return run_id, shift_id


class TestListingTheStops:
    def test_the_stops_list_their_address_and_status(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        run_id, shift_id = seed_run_with_stops(repo)

        listed = client.get(f"/shifts/{shift_id}/stops")

        assert listed.status_code == 200, listed.text
        stops = listed.json()
        assert [stop["status"] for stop in stops] == ["pending", "pending"]
        assert [stop["address"] for stop in stops] == [
            row.address for row in repo.run_stops[run_id]
        ]
        assert [stop["seq"] for stop in stops] == [1, 2]
        assert [(stop["lat"], stop["lon"]) for stop in stops] == [
            (row.lat, row.lon) for row in repo.run_stops[run_id]
        ]

    def test_a_delivery_event_flips_the_stop_status(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        run_id, shift_id = seed_run_with_stops(repo)
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
        run_id, shift_id = seed_run_with_stops(repo)
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
        assert delivered.json()[0]["address"] == repo.run_stops[run_id][0].address

    def test_an_unknown_status_filter_is_refused(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        _, shift_id = seed_run_with_stops(repo)

        refused = client.get(f"/shifts/{shift_id}/stops?status=someday")

        assert refused.status_code == 422

    def test_a_foreign_shift_is_not_found(
        self, client: TestClient, other_client: TestClient, repo: InMemoryRepo
    ) -> None:
        _, shift_id = seed_run_with_stops(repo)

        foreign = other_client.get(f"/shifts/{shift_id}/stops")

        assert foreign.status_code == 404


def png_bytes(size: int = 64) -> bytes:
    """A payload with the PNG magic and `size` bytes total."""
    return b"\x89PNG\r\n\x1a\n" + b"\x00" * (size - 8)


class TestUploadingTheProofOfDelivery:
    def test_a_pod_is_stored_and_said_back(
        self,
        client: TestClient,
        repo: InMemoryRepo,
        tmp_path: object,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        run_id, _ = seed_run_with_stops(repo)
        stop_id = repo.run_stops[run_id][0].id
        monkeypatch.setenv("POD_STORAGE_DIR", str(tmp_path))
        payload = png_bytes()

        stored = client.post(
            f"/runs/{run_id}/stops/{stop_id}/pod",
            files={"image": ("door.jpg", payload, "image/png")},
            data={"occurred_at": START_AT.isoformat(), "safe_place": "by the meter box"},
        )

        assert stored.status_code == 201, stored.text
        body = stored.json()
        assert body["stop_id"] == str(stop_id)
        assert body["sha256"] == hashlib.sha256(payload).hexdigest()
        assert body["bytes"] == len(payload)
        assert uuid.UUID(body["event_id"])

        event = repo.events[uuid.UUID(body["event_id"])]
        assert event.kind == "pod_captured"
        assert event.safe_place == "by the meter box"
        assert event.stop_id == stop_id
        assert (Path(str(tmp_path)) / f"{body['event_id']}.bin").read_bytes() == payload

    def test_a_replayed_pod_returns_the_first_upload_and_rewrites_nothing(
        self,
        client: TestClient,
        repo: InMemoryRepo,
        tmp_path: object,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        run_id, _ = seed_run_with_stops(repo)
        stop_id = repo.run_stops[run_id][0].id
        monkeypatch.setenv("POD_STORAGE_DIR", str(tmp_path))
        event_id = uuid.uuid4()
        payload = png_bytes()

        first = client.post(
            f"/runs/{run_id}/stops/{stop_id}/pod",
            files={"image": ("door.jpg", payload, "image/png")},
            data={"occurred_at": START_AT.isoformat(), "event_id": str(event_id)},
        )
        (Path(str(tmp_path)) / f"{event_id}.bin").write_bytes(b"tampered-marker")

        replay = client.post(
            f"/runs/{run_id}/stops/{stop_id}/pod",
            files={"image": ("door.jpg", payload, "image/png")},
            data={"occurred_at": START_AT.isoformat(), "event_id": str(event_id)},
        )

        assert first.status_code == 201
        assert replay.status_code == 200, replay.text
        assert replay.json()["event_id"] == str(event_id)
        assert replay.json()["sha256"] == hashlib.sha256(b"tampered-marker").hexdigest()
        assert len([e for e in repo.events.values() if e.stop_id == stop_id]) == 1

    def test_a_pod_of_a_foreign_run_is_not_found(
        self,
        client: TestClient,
        other_client: TestClient,
        repo: InMemoryRepo,
        tmp_path: object,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        run_id, _ = seed_run_with_stops(repo)
        stop_id = repo.run_stops[run_id][0].id
        monkeypatch.setenv("POD_STORAGE_DIR", str(tmp_path))

        foreign = other_client.post(
            f"/runs/{run_id}/stops/{stop_id}/pod",
            files={"image": ("door.jpg", png_bytes(), "image/png")},
            data={"occurred_at": START_AT.isoformat()},
        )

        assert foreign.status_code == 404

    def test_a_pod_for_a_stop_outside_the_run_is_not_found(
        self,
        client: TestClient,
        repo: InMemoryRepo,
        tmp_path: object,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        run_id, _ = seed_run_with_stops(repo)
        monkeypatch.setenv("POD_STORAGE_DIR", str(tmp_path))

        stray = client.post(
            f"/runs/{run_id}/stops/{uuid.uuid4()}/pod",
            files={"image": ("door.jpg", png_bytes(), "image/png")},
            data={"occurred_at": START_AT.isoformat()},
        )

        assert stray.status_code == 404

    def test_an_oversized_image_is_refused_before_anything_is_stored(
        self,
        client: TestClient,
        repo: InMemoryRepo,
        tmp_path: object,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        run_id, _ = seed_run_with_stops(repo)
        stop_id = repo.run_stops[run_id][0].id
        monkeypatch.setenv("POD_STORAGE_DIR", str(tmp_path))
        oversized = png_bytes(10 * 1024 * 1024 + 1)

        refused = client.post(
            f"/runs/{run_id}/stops/{stop_id}/pod",
            files={"image": ("door.jpg", oversized, "image/png")},
            data={"occurred_at": START_AT.isoformat()},
        )

        assert refused.status_code == 413
        assert repo.events == {}
        assert list(Path(str(tmp_path)).iterdir()) == []

    def test_a_non_image_is_refused_by_its_bytes_not_its_name(
        self,
        client: TestClient,
        repo: InMemoryRepo,
        tmp_path: object,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        run_id, _ = seed_run_with_stops(repo)
        stop_id = repo.run_stops[run_id][0].id
        monkeypatch.setenv("POD_STORAGE_DIR", str(tmp_path))

        refused = client.post(
            f"/runs/{run_id}/stops/{stop_id}/pod",
            files={"image": ("photo.jpg", b"<html>not an image</html>", "image/jpeg")},
            data={"occurred_at": START_AT.isoformat()},
        )

        assert refused.status_code == 415
        assert repo.events == {}


class TestThePartialReopt:
    def seed_planned_run(
        self, repo: InMemoryRepo, *, extra_stops: int = 0
    ) -> tuple[uuid.UUID, uuid.UUID, uuid.UUID]:
        """A run, its stops and the plan the phone already holds.

        With `extra_stops`, that many additional rows exist in the run but
        not in the stored plan - the day changed under the phone (a stop was
        added at the door), which is exactly when the reopt is called.
        """
        run_id, shift_id = seed_run_with_stops(repo)
        request, _ = _route_request(repo.runs[run_id], repo.run_stops[run_id])
        planned_ids = [row.id for row in repo.run_stops[run_id]][: 2 - extra_stops]
        plan = schedule_plan([stop for stop in request.stops if stop.id in planned_ids], request)
        repo.put_run_route(run_id, plan)
        return run_id, shift_id, repo.run_stops[run_id][-1].id

    def test_a_reopt_places_the_new_stop_and_says_the_delta(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        run_id, shift_id, added_id = self.seed_planned_run(repo, extra_stops=1)

        reopt = client.post(
            f"/runs/{run_id}/route:reopt",
            json={"affected_stop_ids": [str(added_id)]},
        )

        assert reopt.status_code == 200, reopt.text
        body = reopt.json()
        assert body["run_id"] == str(run_id)
        assert body["engine"] == "partial-reopt"
        assert body["finish_delta_s"] > 0.0
        assert added_id in {uuid.UUID(stop["stop_id"]) for stop in body["stops"]}
        before = repo.get_run_route(run_id)
        assert before is not None
        assert added_id in {stop.stop_id for stop in before.stops}

    def test_the_unchanged_stops_keep_their_relative_order(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        run_id, _, added_id = self.seed_planned_run(repo, extra_stops=1)
        stored_before = repo.get_run_route(run_id)
        assert stored_before is not None
        before = [stop.stop_id for stop in stored_before.stops]

        body = client.post(
            f"/runs/{run_id}/route:reopt",
            json={"affected_stop_ids": [str(added_id)]},
        ).json()

        after = [uuid.UUID(stop["stop_id"]) for stop in body["stops"]]
        kept = [stop_id for stop_id in after if stop_id != added_id]
        assert kept == before

    def test_the_same_reopt_is_the_same_day_and_reapplies_to_nothing(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        """The second identical reopt finds its own change already in the day.

        The placement is deterministic (the same stops in the same order as
        the first answer, the same day length), and the delta is 0: the
        change is already absorbed, so applying it again moves nothing.
        """
        run_id, _, added_id = self.seed_planned_run(repo, extra_stops=1)

        first = client.post(
            f"/runs/{run_id}/route:reopt", json={"affected_stop_ids": [str(added_id)]}
        ).json()
        second = client.post(
            f"/runs/{run_id}/route:reopt", json={"affected_stop_ids": [str(added_id)]}
        ).json()

        assert [stop["stop_id"] for stop in second["stops"]] == [
            stop["stop_id"] for stop in first["stops"]
        ]
        assert second["total_duration_s"] == first["total_duration_s"]
        assert second["finish_delta_s"] == 0.0

    def test_an_affected_stop_outside_the_run_is_refused(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        run_id, _, _ = self.seed_planned_run(repo)

        refused = client.post(
            f"/runs/{run_id}/route:reopt",
            json={"affected_stop_ids": [str(uuid.uuid4())]},
        )

        assert refused.status_code == 422
        assert "not part of this run" in refused.json()["detail"]

    def test_a_foreign_run_is_not_found(
        self, client: TestClient, other_client: TestClient, repo: InMemoryRepo
    ) -> None:
        run_id, _, added_id = self.seed_planned_run(repo, extra_stops=1)

        foreign = other_client.post(
            f"/runs/{run_id}/route:reopt",
            json={"affected_stop_ids": [str(added_id)]},
        )

        assert foreign.status_code == 404

    def test_the_phone_serves_the_reopted_day_afterwards(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        run_id, shift_id, added_id = self.seed_planned_run(repo, extra_stops=1)

        client.post(f"/runs/{run_id}/route:reopt", json={"affected_stop_ids": [str(added_id)]})
        route = client.get(f"/shifts/{shift_id}/route")

        assert route.status_code == 200
        assert added_id in {uuid.UUID(stop["stop_id"]) for stop in route.json()["stops"]}


class TestTheSecurityHeaders:
    """ASVS V14: the API's hardening headers ride every response, errors included."""

    def test_every_response_carries_the_hardening_headers(self, client: TestClient) -> None:
        response = client.get("/runs")

        assert response.headers["x-content-type-options"] == "nosniff"
        assert response.headers["x-frame-options"] == "DENY"
        assert (
            response.headers["content-security-policy"]
            == "default-src 'none'; frame-ancestors 'none'"
        )
        assert response.headers["cache-control"] == "no-store"
        assert response.headers["referrer-policy"] == "no-referrer"

    def test_an_error_response_carries_them_too(self, anonymous_client: TestClient) -> None:
        refused = anonymous_client.get("/runs")

        assert refused.status_code == 401
        assert refused.headers["x-content-type-options"] == "nosniff"
        assert refused.headers["cache-control"] == "no-store"


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
