"""Tests for the routing core, the template lock and the day's route.

The routing core has to work with no routing engine on the machine: the CI
has no Valhalla, no GraphHopper and no OSRM, so the plan is built from the
stop coordinates alone. The tests prove the four things the courier feels:
the order is the same every time, the time windows are honoured, the priority
stops come first, and the template lock refuses an order that is not the
run's.
"""
from __future__ import annotations

import time
import uuid
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.auth.jwks import get_verifier
from app.main import app
from app.repo import InMemoryRepo, RouteStopRow, RunRecord, get_repo
from app.routing import (
    BreakConstraint,
    HeuristicEngine,
    RouteRequest,
    RouteStop,
    RunConstraints,
    TimeWindow,
    _schedule,
    build_plan,
    get_engine,
    seed_plan,
)
from app.solver import PyVRPEngine
from tests.auth.test_jwks import make_key_pair, make_verifier, sign

COURIER = "driver-7"
DEPOT_LAT = -43.5330
DEPOT_LON = 172.6300
START_AT = datetime(2026, 10, 21, 8, 0, tzinfo=UTC)


def make_stop(
    *,
    lat: float,
    lon: float,
    priority: bool = False,
    parcels: int = 1,
    service_time_s: int | None = None,
    window: TimeWindow | None = None,
    stop_id: uuid.UUID | None = None,
) -> RouteStop:
    """One stop of the run."""
    return RouteStop(
        id=stop_id or uuid.uuid4(),
        lat=lat,
        lon=lon,
        priority=priority,
        parcels=parcels,
        service_time_s=service_time_s,
        window=window,
    )


def make_request(
    stops: list[RouteStop],
    *,
    start_at: datetime = START_AT,
    capacity_parcels: int | None = None,
    speed_kmh: float = 30.0,
    break_constraint: BreakConstraint | None = None,
) -> RouteRequest:
    """The run the engine is asked to plan."""
    return RouteRequest(
        stops=tuple(stops),
        constraints=RunConstraints(
            depot_lat=DEPOT_LAT,
            depot_lon=DEPOT_LON,
            start_at=start_at,
            capacity_parcels=capacity_parcels,
            speed_kmh=speed_kmh,
            break_constraint=break_constraint,
        ),
    )


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
        test_client.headers.update({"Authorization": f"Bearer {sign(key_pair[0], subject=COURIER)}"})
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def anonymous_client(repo: InMemoryRepo) -> Iterator[TestClient]:
    key_pair = make_key_pair()
    _, jwk = key_pair
    app.dependency_overrides[get_repo] = lambda: repo
    app.dependency_overrides[get_verifier] = lambda: make_verifier({"keys": [jwk]})
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def seed_run(
    repo: InMemoryRepo,
    *,
    courier_id: str = COURIER,
    stops: list[RouteStop] | None = None,
    capacity_parcels: int | None = None,
    start_at: datetime = START_AT,
) -> tuple[uuid.UUID, uuid.UUID, list[RouteStop]]:
    """A run with its stops, as the intake slice would leave it."""
    run_id = uuid.uuid4()
    shift_id = uuid.uuid4()
    repo.runs[run_id] = RunRecord(
        id=run_id,
        shift_id=shift_id,
        courier_id=courier_id,
        name="Hornby run",
        depot_lat=DEPOT_LAT,
        depot_lon=DEPOT_LON,
        capacity_parcels=capacity_parcels,
        speed_kmh=30.0,
        start_at=start_at,
    )
    day = (
        stops
        if stops is not None
        else [
            make_stop(lat=-43.5400, lon=172.6000),
            make_stop(lat=-43.5200, lon=172.6400),
            make_stop(lat=-43.5600, lon=172.6200),
        ]
    )
    repo.run_stops[run_id] = [
        RouteStopRow(
            id=stop.id,
            lat=stop.lat,
            lon=stop.lon,
            priority=stop.priority,
            parcels=stop.parcels,
            service_time_s=stop.service_time_s,
            window_start=stop.window.start if stop.window is not None else None,
            window_end=stop.window.end if stop.window is not None else None,
        )
        for stop in day
    ]
    return run_id, shift_id, day


class TestTheEngine:
    def test_the_same_stops_give_the_same_order(self) -> None:
        stops = [
            make_stop(lat=-43.5400, lon=172.6000),
            make_stop(lat=-43.5200, lon=172.6400),
            make_stop(lat=-43.5600, lon=172.6200),
            make_stop(lat=-43.5300, lon=172.6100),
        ]
        request = make_request(stops)

        first = build_plan(request)
        second = build_plan(request)

        assert first == second
        assert [stop.stop_id for stop in first.stops] == [
            stop.stop_id for stop in second.stops
        ]

    def test_the_plan_is_the_same_fifty_times_in_a_row(self) -> None:
        """The V4 rule: the core logic runs fifty times and never drifts."""
        stops = [
            make_stop(lat=-43.5400, lon=172.6000),
            make_stop(lat=-43.5200, lon=172.6400),
            make_stop(lat=-43.5600, lon=172.6200),
            make_stop(lat=-43.5300, lon=172.6100),
            make_stop(lat=-43.5500, lon=172.5900, priority=True),
        ]
        request = make_request(stops)

        plans = [build_plan(request) for _ in range(50)]

        assert all(plan == plans[0] for plan in plans)

    @pytest.mark.repeat(50)
    def test_a_repeated_run_gives_the_same_answer(self) -> None:
        request = make_request(
            [
                make_stop(lat=-43.5400, lon=172.6000),
                make_stop(lat=-43.5200, lon=172.6400),
            ]
        )

        assert build_plan(request) == build_plan(request)

    def test_the_courier_waits_for_the_window_to_open(self) -> None:
        opening = datetime(2026, 10, 21, 10, 0, tzinfo=UTC)
        closing = datetime(2026, 10, 21, 12, 0, tzinfo=UTC)
        pharmacy = make_stop(
            lat=-43.5330,
            lon=172.6500,
            window=TimeWindow(start=opening, end=closing),
        )
        request = make_request([pharmacy])

        plan = build_plan(request)

        assert plan.stops[0].arrival_at == opening
        assert plan.stops[0].late is False
        assert plan.window_violations == 0

    def test_every_arrival_is_inside_its_window(self) -> None:
        opening = datetime(2026, 10, 21, 9, 30, tzinfo=UTC)
        closing = datetime(2026, 10, 21, 17, 0, tzinfo=UTC)
        stops = [
            make_stop(lat=-43.5400, lon=172.6000, window=TimeWindow(start=opening, end=closing)),
            make_stop(lat=-43.5200, lon=172.6400, window=TimeWindow(start=opening, end=closing)),
            make_stop(lat=-43.5600, lon=172.6200),
        ]
        request = make_request(stops)

        plan = build_plan(request)

        assert plan.window_violations == 0
        for stop in plan.stops:
            original = next(item for item in stops if item.id == stop.stop_id)
            if original.window is None:
                continue
            assert original.window.contains(stop.arrival_at)

    def test_a_stop_the_courier_cannot_reach_in_time_is_flagged(self) -> None:
        closing = datetime(2026, 10, 21, 8, 5, tzinfo=UTC)
        far = make_stop(lat=-43.7000, lon=172.7500, window=TimeWindow(end=closing))
        request = make_request([far])

        plan = build_plan(request)

        assert plan.stops[0].late is True
        assert plan.window_violations == 1

    def test_the_priority_stops_come_first(self) -> None:
        priority = make_stop(lat=-43.7000, lon=172.7500, priority=True)
        near = make_stop(lat=-43.5340, lon=172.6310)
        request = make_request([near, priority])

        plan = build_plan(request)

        assert plan.stops[0].stop_id == priority.id
        assert plan.stops[1].stop_id == near.id

    def test_the_service_time_of_the_stop_wins_over_the_default_of_the_run(self) -> None:
        slow = make_stop(lat=-43.5400, lon=172.6000, service_time_s=900)
        quick = make_stop(lat=-43.5200, lon=172.6400)
        request = make_request([slow, quick])

        plan = build_plan(request)

        at_the_door = {stop.stop_id: stop for stop in plan.stops}
        assert at_the_door[slow.id].departure_at - at_the_door[slow.id].arrival_at == timedelta(
            seconds=900
        )
        assert (
            at_the_door[quick.id].departure_at - at_the_door[quick.id].arrival_at
            == timedelta(seconds=300)
        )

    def test_a_start_without_a_timezone_is_read_as_utc(self) -> None:
        request = make_request(
            [make_stop(lat=-43.5400, lon=172.6000)],
            start_at=datetime(2026, 10, 21, 8, 0),
        )

        plan = build_plan(request)

        assert plan.stops[0].arrival_at.tzinfo is not None
        assert plan.stops[0].arrival_at >= datetime(2026, 10, 21, 8, 0, tzinfo=UTC)

    def test_every_stop_can_be_a_priority_stop(self) -> None:
        stops = [
            make_stop(lat=-43.5400, lon=172.6000, priority=True),
            make_stop(lat=-43.5200, lon=172.6400, priority=True),
            make_stop(lat=-43.5600, lon=172.6200, priority=True),
        ]
        request = make_request(stops)

        plan = build_plan(request)

        assert len(plan.stops) == 3
        assert plan.window_violations == 0

    def test_the_improvement_never_breaks_a_time_window(self) -> None:
        """A shorter day that makes the courier late is refused."""
        points = [
            (-43.52518, 172.63827),
            (-43.50120, 172.60426),
            (-43.52171, 172.59399),
            (-43.53606, 172.58001),
            (-43.54682, 172.58323),
            (-43.52252, 172.61775),
            (-43.55279, 172.60451),
            (-43.55345, 172.62517),
        ]
        stops = [make_stop(lat=lat, lon=lon) for lat, lon in points]
        seeded = seed_plan(make_request(stops))
        arrivals = {stop.stop_id: stop.arrival_at for stop in seeded.stops}
        tight = [
            make_stop(
                lat=stop.lat,
                lon=stop.lon,
                stop_id=stop.id,
                window=TimeWindow(end=arrivals[stop.id]),
            )
            for stop in stops
        ]

        plan = build_plan(make_request(tight), engine=HeuristicEngine())

        assert plan.window_violations == 0
        assert plan.total_distance_m == seeded.total_distance_m

    def test_the_improvement_never_makes_the_day_longer(self) -> None:
        stops = [
            make_stop(lat=-43.5400, lon=172.6000),
            make_stop(lat=-43.5200, lon=172.6400),
            make_stop(lat=-43.5600, lon=172.6200),
            make_stop(lat=-43.5300, lon=172.6100),
            make_stop(lat=-43.5450, lon=172.6150),
        ]
        request = make_request(stops)

        improved = build_plan(request, engine=HeuristicEngine())
        seeded = seed_plan(request)

        assert improved.total_distance_m <= seeded.total_distance_m

    def test_the_improvement_shortens_the_day(self) -> None:
        """The 2-opt step has to beat the nearest-neighbour seed."""
        points = [
            (-43.52518, 172.63827),
            (-43.50120, 172.60426),
            (-43.52171, 172.59399),
            (-43.53606, 172.58001),
            (-43.54682, 172.58323),
            (-43.52252, 172.61775),
            (-43.55279, 172.60451),
            (-43.55345, 172.62517),
        ]
        request = make_request([make_stop(lat=lat, lon=lon) for lat, lon in points])

        improved = build_plan(request, engine=HeuristicEngine())
        seeded = seed_plan(request)

        assert improved.total_distance_m < seeded.total_distance_m

    def test_the_day_reports_a_load_over_the_capacity_of_the_van(self) -> None:
        stops = [
            make_stop(lat=-43.5400, lon=172.6000, parcels=8),
            make_stop(lat=-43.5200, lon=172.6400, parcels=6),
        ]
        request = make_request(stops, capacity_parcels=10)

        plan = build_plan(request)

        assert plan.parcels == 14
        assert plan.capacity_parcels == 10
        assert plan.over_capacity is True

    def test_the_day_that_fits_reports_no_overload(self) -> None:
        stops = [make_stop(lat=-43.5400, lon=172.6000, parcels=4)]
        request = make_request(stops, capacity_parcels=100)

        plan = build_plan(request)

        assert plan.over_capacity is False

    def test_a_van_that_cannot_move_is_refused(self) -> None:
        request = make_request([make_stop(lat=-43.5400, lon=172.6000)], speed_kmh=0.0)

        with pytest.raises(ValueError):
            build_plan(request)

    def test_a_told_break_position_outside_the_day_is_refused(self) -> None:
        """A told break position stands strictly between two stops - anything else raises.

        The contract of the told position (the template path of the runs API
        will rely on it): 0 and the stop count are refused, never silently
        re-read as "not given" - a break placed by guesswork behind the
        caller's back is a lie.
        """
        stops = [make_stop(lat=-43.5400, lon=172.6000), make_stop(lat=-43.5200, lon=172.6400)]
        request = make_request(
            stops,
            break_constraint=BreakConstraint(
                earliest=START_AT + timedelta(minutes=270),
                latest=START_AT + timedelta(minutes=360),
                minutes=30,
            ),
        )

        for position in (0, 2, 9):
            with pytest.raises(ValueError):
                _schedule(stops, request, position)

        placed = _schedule(stops, request, 1)
        assert placed.break_violation is False

    def test_the_engine_seam_returns_the_production_solver(self) -> None:
        engine = get_engine()

        assert isinstance(engine, PyVRPEngine)
        assert engine.name == "pyvrp"

    def test_two_hundred_stops_stay_inside_the_five_second_budget(self) -> None:
        """The V4 budget: a day of 200 stops is planned in five seconds."""
        stops = [
            make_stop(
                lat=-43.5330 + (index % 20) * 0.004,
                lon=172.6300 + (index // 20) * 0.004,
            )
            for index in range(200)
        ]
        request = make_request(stops)

        started = time.perf_counter()
        plan = build_plan(request)
        elapsed = time.perf_counter() - started

        assert len(plan.stops) == 200
        assert elapsed < 5.0


class TestTheTemplateLock:
    def test_the_template_is_stored_with_its_own_identity(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        run_id, _, day = seed_run(repo)
        order = [stop.id for stop in day]

        response = client.put(
            f"/runs/{run_id}/template",
            json={
                "template_id": "phone-made-1",
                "segments": [{"street_key": "hornbby:wright st", "direction": "asc"}],
                "stop_order": [str(stop_id) for stop_id in order],
            },
        )

        assert response.status_code == 200
        assert response.json()["template_id"] == "phone-made-1"
        stored = repo.get_run_template(run_id)
        assert stored is not None
        assert stored.id == "phone-made-1"
        assert stored.segments[0].street_key == "hornbby:wright st"
        assert stored.segments[0].direction == "asc"

    def test_the_same_template_sent_twice_is_stored_once(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        run_id, _, day = seed_run(repo)
        body = {
            "template_id": "phone-made-1",
            "segments": [{"street_key": "hornbby:wright st", "direction": "asc"}],
            "stop_order": [str(stop.id) for stop in day],
        }

        first = client.put(f"/runs/{run_id}/template", json=body)
        second = client.put(f"/runs/{run_id}/template", json=body)

        assert first.status_code == 200
        assert second.status_code == 200
        assert len(repo.templates) == 1

    def test_an_order_that_is_missing_a_stop_is_refused(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        run_id, _, day = seed_run(repo)

        response = client.put(
            f"/runs/{run_id}/template",
            json={
                "template_id": "phone-made-1",
                "segments": [],
                "stop_order": [str(day[0].id)],
            },
        )

        assert response.status_code == 422
        detail = response.json()["detail"]
        assert "not in the order" in detail
        named = [stop for stop in day if str(stop.id) in detail]
        assert len(named) == 1
        assert named[0].id != day[0].id

    def test_a_stop_from_another_run_is_refused(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        run_id, _, day = seed_run(repo)
        stranger = uuid.uuid4()

        response = client.put(
            f"/runs/{run_id}/template",
            json={
                "template_id": "phone-made-1",
                "segments": [],
                "stop_order": [str(day[0].id), str(stranger)],
            },
        )

        assert response.status_code == 422
        assert str(stranger) in response.json()["detail"]

    def test_a_stop_in_the_order_twice_is_refused(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        run_id, _, day = seed_run(repo)

        response = client.put(
            f"/runs/{run_id}/template",
            json={
                "template_id": "phone-made-1",
                "segments": [],
                "stop_order": [str(day[0].id), str(day[0].id)],
            },
        )

        assert response.status_code == 422
        assert str(day[0].id) in response.json()["detail"]

    def test_the_template_lock_needs_a_token(self, anonymous_client: TestClient, repo: InMemoryRepo) -> None:
        run_id, _, day = seed_run(repo)

        response = anonymous_client.put(
            f"/runs/{run_id}/template",
            json={
                "template_id": "phone-made-1",
                "segments": [],
                "stop_order": [str(stop.id) for stop in day],
            },
        )

        assert response.status_code == 401

    def test_the_template_of_another_courier_is_not_found(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        run_id, _, day = seed_run(repo, courier_id="driver-99")

        response = client.put(
            f"/runs/{run_id}/template",
            json={
                "template_id": "phone-made-1",
                "segments": [],
                "stop_order": [str(stop.id) for stop in day],
            },
        )

        assert response.status_code == 404


class TestTheRouteEndpoint:
    def test_the_route_needs_a_token(self, anonymous_client: TestClient, repo: InMemoryRepo) -> None:
        _, shift_id, _ = seed_run(repo)

        response = anonymous_client.get(f"/shifts/{shift_id}/route")

        assert response.status_code == 401

    def test_the_route_gives_the_ordered_stops_with_the_arrival_times(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        day = [
            make_stop(lat=-43.5400, lon=172.6000),
            make_stop(lat=-43.5200, lon=172.6400),
        ]
        _, shift_id, _ = seed_run(repo, stops=day)

        response = client.get(f"/shifts/{shift_id}/route")

        assert response.status_code == 200
        body = response.json()
        assert len(body["stops"]) == 2
        assert [stop["sequence"] for stop in body["stops"]] == [1, 2]
        assert body["stops"][0]["arrival_at"] < body["stops"][1]["arrival_at"]
        assert body["stops"][0]["distance_m"] > 0
        assert body["total_distance_m"] > 0
        assert body["engine"] == "pyvrp"
        assert body["locked"] is False

    def test_the_route_follows_the_locked_template(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        day = [
            make_stop(lat=-43.5400, lon=172.6000),
            make_stop(lat=-43.5200, lon=172.6400),
            make_stop(lat=-43.5600, lon=172.6200),
        ]
        run_id, shift_id, _ = seed_run(repo, stops=day)
        locked = [day[2].id, day[0].id, day[1].id]
        client.put(
            f"/runs/{run_id}/template",
            json={
                "template_id": "phone-made-1",
                "segments": [{"street_key": "hornbby:wright st", "direction": "desc"}],
                "stop_order": [str(stop_id) for stop_id in locked],
            },
        )

        response = client.get(f"/shifts/{shift_id}/route")

        assert response.status_code == 200
        body = response.json()
        assert [stop["stop_id"] for stop in body["stops"]] == [str(stop_id) for stop_id in locked]
        assert body["locked"] is True
        assert body["engine"] == "template-lock"
        assert body["template_id"] == "phone-made-1"

    def test_the_route_is_the_same_every_time_it_is_asked(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        day = [
            make_stop(lat=-43.5400, lon=172.6000),
            make_stop(lat=-43.5200, lon=172.6400),
            make_stop(lat=-43.5600, lon=172.6200),
        ]
        _, shift_id, _ = seed_run(repo, stops=day)

        first = client.get(f"/shifts/{shift_id}/route")
        second = client.get(f"/shifts/{shift_id}/route")

        assert first.json() == second.json()

    def test_the_route_says_which_stops_it_cannot_place(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        day = [make_stop(lat=-43.5400, lon=172.6000)]
        run_id, shift_id, _ = seed_run(repo, stops=day)
        repo.run_stops[run_id].append(
            RouteStopRow(
                id=uuid.uuid4(),
                lat=None,
                lon=None,
                priority=False,
                parcels=1,
                service_time_s=None,
                window_start=None,
                window_end=None,
            )
        )

        response = client.get(f"/shifts/{shift_id}/route")

        assert response.status_code == 200
        body = response.json()
        assert len(body["unroutable_stop_ids"]) == 1
        assert len(body["stops"]) == 1

    def test_the_route_of_a_shift_without_a_run_is_not_found(
        self, client: TestClient
    ) -> None:
        response = client.get(f"/shifts/{uuid.uuid4()}/route")

        assert response.status_code == 404

    def test_the_route_of_another_courier_is_not_found(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        _, shift_id, _ = seed_run(repo, courier_id="driver-99")

        response = client.get(f"/shifts/{shift_id}/route")

        assert response.status_code == 404

    def test_the_route_reports_a_load_over_the_capacity_of_the_van(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        day = [make_stop(lat=-43.5400, lon=172.6000, parcels=30)]
        _, shift_id, _ = seed_run(repo, stops=day, capacity_parcels=20)

        response = client.get(f"/shifts/{shift_id}/route")

        assert response.status_code == 200
        body = response.json()
        assert body["over_capacity"] is True
        assert body["parcels"] == 30

    def test_the_route_waits_for_the_window_to_open(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        opening = datetime(2026, 10, 21, 10, 0, tzinfo=UTC)
        closing = datetime(2026, 10, 21, 12, 0, tzinfo=UTC)
        day = [
            make_stop(
                lat=-43.5330,
                lon=172.6500,
                window=TimeWindow(start=opening, end=closing),
            )
        ]
        _, shift_id, _ = seed_run(repo, stops=day)

        response = client.get(f"/shifts/{shift_id}/route")

        assert response.status_code == 200
        arrival = datetime.fromisoformat(response.json()["stops"][0]["arrival_at"])
        assert arrival == opening

    def test_the_route_of_a_run_that_started_later_uses_the_start_of_the_shift(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        day = [make_stop(lat=-43.5400, lon=172.6000)]
        later = START_AT + timedelta(hours=2)
        _, shift_id, _ = seed_run(repo, stops=day, start_at=later)

        response = client.get(f"/shifts/{shift_id}/route")

        assert response.status_code == 200
        arrival = datetime.fromisoformat(response.json()["stops"][0]["arrival_at"])
        assert arrival >= later
