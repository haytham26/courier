"""Tests for the PyVRP solver behind the RouteEngine seam, and the partial reopt.

The engine that plans production days is `PyVRPEngine` (ADR-009): PyVRP 0.14.1
solves the day with the same distance model the heuristic uses, the priority
stops are solved first as their own tour, and the break of the day is NOT in
the solver's model - PyVRP plans the order break-free and the routing core
places the break (ADR-009 §4). The routing core alone times the plan, so both
engines give the same arrival times for the same order. When a phase of the
day cannot be planned feasibly at all - a window that cannot be met - the
engine falls back to the deterministic heuristic, which reports the
violations plainly; a load over the capacity does not force the fallback when
every phase fits - the plan's own `over_capacity` flag stays the honest
verdict.

The partial reopt changes only the affected stops: the unchanged stops keep
their place in the order, the affected stops are re-placed by deterministic
insertion, and the plan comes back with the finish-time delta ("adds N
minutes") so the copilot can say it before the edit is applied.
"""

from __future__ import annotations

import time
import uuid
from datetime import UTC, datetime, timedelta

import pytest

from app.routing import (
    BreakConstraint,
    RoutePlan,
    RouteRequest,
    RouteStop,
    RunConstraints,
    TimeWindow,
    build_plan,
    build_reopt_plan,
    finish_delta_s,
    get_engine,
    seed_plan,
)
from app.solver import PyVRPEngine

DEPOT_LAT = -43.5330
DEPOT_LON = 172.6300
FINISH_LAT = -43.4884  # the airport, where the van of the day is left
FINISH_LON = 172.5291
START_AT = datetime(2026, 10, 22, 8, 0, tzinfo=UTC)


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
    finish_lat: float | None = None,
    finish_lon: float | None = None,
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
            finish_lat=finish_lat,
            finish_lon=finish_lon,
        ),
    )


def order_of(plan: RoutePlan) -> list[uuid.UUID]:
    """The stop ids, in the order the plan has them."""
    return [stop.stop_id for stop in plan.stops]


def relative_order(plan: RoutePlan, stop_ids: list[uuid.UUID]) -> list[uuid.UUID]:
    """The order of the plan, keeping only the stops asked about."""
    wanted = set(stop_ids)
    return [stop_id for stop_id in order_of(plan) if stop_id in wanted]


class TestThePyVRPEngine:
    def test_the_seam_runs_the_pyvrp_engine_by_default(self) -> None:
        engine = get_engine()

        assert isinstance(engine, PyVRPEngine)
        assert engine.name == "pyvrp"

    def test_the_same_day_solves_to_the_same_plan(self) -> None:
        stops = [
            make_stop(lat=-43.5400, lon=172.6000),
            make_stop(lat=-43.5200, lon=172.6400),
            make_stop(lat=-43.5600, lon=172.6200),
            make_stop(lat=-43.5300, lon=172.6100),
        ]
        request = make_request(stops)

        assert build_plan(request, engine=PyVRPEngine()) == build_plan(
            request, engine=PyVRPEngine()
        )

    def test_the_plan_is_the_same_twenty_times_in_a_row(self) -> None:
        stops = [
            make_stop(lat=-43.5400, lon=172.6000),
            make_stop(lat=-43.5200, lon=172.6400),
            make_stop(lat=-43.5600, lon=172.6200),
            make_stop(lat=-43.5300, lon=172.6100),
            make_stop(lat=-43.5500, lon=172.5900, priority=True),
        ]
        engine = PyVRPEngine()
        request = make_request(stops)

        plans = [engine.plan(request) for _ in range(20)]

        assert all(plan == plans[0] for plan in plans)

    def test_the_priority_stops_come_first(self) -> None:
        priority = make_stop(lat=-43.7000, lon=172.7500, priority=True)
        near = make_stop(lat=-43.5340, lon=172.6310)
        request = make_request([near, priority])

        plan = build_plan(request, engine=PyVRPEngine())

        assert plan.stops[0].stop_id == priority.id
        assert plan.stops[1].stop_id == near.id

    def test_the_whole_priority_group_leads_the_day(self) -> None:
        """Four priority stops far out, twenty ordinary ones near the depot."""
        far = [
            make_stop(lat=-43.7000 - 0.01 * index, lon=172.7500, priority=True)
            for index in range(4)
        ]
        near = [make_stop(lat=-43.5310 + 0.003 * index, lon=172.6310) for index in range(20)]
        request = make_request(near + far)

        plan = build_plan(request, engine=PyVRPEngine())

        assert set(order_of(plan)[:4]) == {stop.id for stop in far}

    def test_the_courier_waits_for_the_window_to_open(self) -> None:
        opening = datetime(2026, 10, 22, 10, 0, tzinfo=UTC)
        closing = datetime(2026, 10, 22, 12, 0, tzinfo=UTC)
        pharmacy = make_stop(
            lat=-43.5330,
            lon=172.6500,
            window=TimeWindow(start=opening, end=closing),
        )
        request = make_request([pharmacy])

        plan = build_plan(request, engine=PyVRPEngine())

        assert plan.stops[0].arrival_at == opening
        assert plan.stops[0].late is False
        assert plan.window_violations == 0

    def test_every_arrival_is_inside_its_window(self) -> None:
        opening = datetime(2026, 10, 22, 9, 30, tzinfo=UTC)
        closing = datetime(2026, 10, 22, 17, 0, tzinfo=UTC)
        stops = [
            make_stop(lat=-43.5400, lon=172.6000, window=TimeWindow(start=opening, end=closing)),
            make_stop(lat=-43.5200, lon=172.6400, window=TimeWindow(start=opening, end=closing)),
            make_stop(lat=-43.5600, lon=172.6200),
            make_stop(lat=-43.5250, lon=172.5850, window=TimeWindow(end=closing)),
        ]
        request = make_request(stops)

        plan = build_plan(request, engine=PyVRPEngine())

        assert plan.window_violations == 0
        for planned in plan.stops:
            original = next(item for item in stops if item.id == planned.stop_id)
            if original.window is None:
                continue
            assert original.window.contains(planned.arrival_at)

    def test_a_window_that_cannot_be_met_falls_back_and_flags_the_stop(self) -> None:
        closing = datetime(2026, 10, 22, 8, 5, tzinfo=UTC)
        far = make_stop(lat=-43.7000, lon=172.7500, window=TimeWindow(end=closing))
        request = make_request([far])

        plan = build_plan(request, engine=PyVRPEngine())

        assert plan.stops[0].late is True
        assert plan.window_violations == 1
        assert plan.engine == "heuristic-nn-2opt"

    def test_the_service_time_of_the_stop_wins_over_the_default(self) -> None:
        slow = make_stop(lat=-43.5400, lon=172.6000, service_time_s=900)
        quick = make_stop(lat=-43.5200, lon=172.6400)
        request = make_request([slow, quick])

        plan = build_plan(request, engine=PyVRPEngine())

        at_the_door = {stop.stop_id: stop for stop in plan.stops}
        assert at_the_door[slow.id].departure_at - at_the_door[slow.id].arrival_at == timedelta(
            seconds=900
        )
        assert at_the_door[quick.id].departure_at - at_the_door[quick.id].arrival_at == timedelta(
            seconds=300
        )

    def test_a_load_over_the_capacity_falls_back_and_is_reported(self) -> None:
        stops = [
            make_stop(lat=-43.5400, lon=172.6000, parcels=8),
            make_stop(lat=-43.5200, lon=172.6400, parcels=6),
        ]
        request = make_request(stops, capacity_parcels=10)

        plan = build_plan(request, engine=PyVRPEngine())

        assert plan.parcels == 14
        assert plan.capacity_parcels == 10
        assert plan.over_capacity is True
        assert plan.engine == "heuristic-nn-2opt"

    def test_a_van_that_cannot_move_is_refused(self) -> None:
        request = make_request([make_stop(lat=-43.5400, lon=172.6000)], speed_kmh=0.0)

        with pytest.raises(ValueError, match="average speed"):
            build_plan(request, engine=PyVRPEngine())

    def test_an_empty_day_plans_nothing(self) -> None:
        plan = build_plan(make_request([]), engine=PyVRPEngine())

        assert plan.stops == ()
        assert plan.parcels == 0

    def test_the_day_ends_at_the_finish_point_of_the_run(self) -> None:
        """The finish is a real place (the airport), not a return to the depot."""
        stops = [
            make_stop(lat=-43.5400, lon=172.6000),
            make_stop(lat=-43.5200, lon=172.6400),
        ]
        request = make_request(stops, finish_lat=FINISH_LAT, finish_lon=FINISH_LON)

        plan = build_plan(request, engine=PyVRPEngine())

        assert plan.finish_lat == FINISH_LAT
        assert plan.finish_lon == FINISH_LON
        # without a finish point the plan says nothing about one
        assert build_plan(make_request(stops), engine=PyVRPEngine()).finish_lat is None

    def test_the_solver_shortens_the_day_below_the_seed(self) -> None:
        """The solver has to beat the nearest-neighbour seed on its own day."""
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

        solved = build_plan(request, engine=PyVRPEngine())
        seeded = seed_plan(request)

        assert solved.total_distance_m < seeded.total_distance_m


class TestTheBreakConstraint:
    @staticmethod
    def forced_day(break_constraint: BreakConstraint) -> RouteRequest:
        """A day whose windows pin the order: early, midday and late stops."""
        return make_request(
            [
                make_stop(
                    lat=-43.5400,
                    lon=172.6000,
                    window=TimeWindow(end=datetime(2026, 10, 22, 9, 0, tzinfo=UTC)),
                ),
                make_stop(
                    lat=-43.5200,
                    lon=172.6400,
                    window=TimeWindow(start=datetime(2026, 10, 22, 12, 0, tzinfo=UTC)),
                ),
                make_stop(
                    lat=-43.5000,
                    lon=172.6600,
                    window=TimeWindow(start=datetime(2026, 10, 22, 15, 0, tzinfo=UTC)),
                ),
            ],
            break_constraint=break_constraint,
        )

    @staticmethod
    def tight_day(break_constraint: BreakConstraint | None) -> RouteRequest:
        """Two stops with no windows and no slack: the break must cost its minutes."""
        return make_request(
            [
                make_stop(lat=-43.5400, lon=172.6000),
                make_stop(lat=-43.5200, lon=172.6400),
            ],
            break_constraint=break_constraint,
        )

    def test_the_break_is_taken_inside_its_window(self) -> None:
        opening = datetime(2026, 10, 22, 10, 0, tzinfo=UTC)
        closing = datetime(2026, 10, 22, 11, 0, tzinfo=UTC)
        request = self.forced_day(BreakConstraint(earliest=opening, latest=closing, minutes=30))

        plan = build_plan(request, engine=PyVRPEngine())

        assert plan.break_start_at is not None
        assert plan.break_end_at is not None
        assert plan.break_end_at - plan.break_start_at == timedelta(minutes=30)
        constraint = request.constraints.break_constraint
        assert constraint is not None
        assert constraint.contains(plan.break_start_at)
        assert plan.break_violation is False

    def test_the_break_adds_its_minutes_to_the_finish_of_the_day(self) -> None:
        """On a day without slack the finish moves by exactly the length of the break."""
        with_break = build_plan(
            self.tight_day(
                BreakConstraint(
                    earliest=START_AT,
                    latest=datetime(2026, 10, 22, 9, 30, tzinfo=UTC),
                    minutes=30,
                )
            ),
            engine=PyVRPEngine(),
        )
        without = build_plan(self.tight_day(None), engine=PyVRPEngine())

        assert with_break.break_start_at is not None
        assert without.break_start_at is None
        assert with_break.stops[-1].departure_at - without.stops[-1].departure_at == timedelta(
            minutes=30
        )

    def test_a_break_the_day_cannot_take_on_time_is_violated_and_said_so(self) -> None:
        """The window closes before the van is free of its first stop: flag it."""
        request = self.tight_day(
            BreakConstraint(
                earliest=START_AT,
                latest=START_AT + timedelta(minutes=5),
                minutes=30,
            )
        )

        plan = build_plan(request, engine=PyVRPEngine())

        assert plan.break_start_at is not None
        assert plan.break_violation is True

    def test_the_fallback_engine_places_the_break_as_well(self) -> None:
        """A day the solver cannot fit still gets its break, flagged or not."""
        stops = [
            make_stop(lat=-43.5400, lon=172.6000, parcels=8),
            make_stop(lat=-43.5200, lon=172.6400, parcels=6),
        ]
        request = make_request(
            stops,
            capacity_parcels=10,
            break_constraint=BreakConstraint(
                earliest=START_AT + timedelta(hours=3),
                latest=START_AT + timedelta(hours=4),
                minutes=30,
            ),
        )

        plan = build_plan(request, engine=PyVRPEngine())

        assert plan.engine == "heuristic-nn-2opt"
        assert plan.break_start_at is not None
        assert plan.break_violation is False

    def test_a_break_window_which_runs_backwards_is_refused(self) -> None:
        with pytest.raises(ValueError, match="ends before it opens"):
            BreakConstraint(
                earliest=datetime(2026, 10, 22, 9, 0, tzinfo=UTC),
                latest=datetime(2026, 10, 22, 8, 0, tzinfo=UTC),
                minutes=30,
            )

    def test_a_zero_minute_break_is_refused(self) -> None:
        with pytest.raises(ValueError, match="one minute"):
            BreakConstraint(
                earliest=datetime(2026, 10, 22, 8, 0, tzinfo=UTC),
                latest=datetime(2026, 10, 22, 9, 0, tzinfo=UTC),
                minutes=0,
            )


class TestThePartialReopt:
    @staticmethod
    def day_of(stops: list[RouteStop]) -> tuple[RouteRequest, RoutePlan]:
        """The plan the reopt receives as its starting point."""
        request = make_request(stops)
        return request, build_plan(request, engine=PyVRPEngine())

    def test_only_the_affected_stop_moves(self) -> None:
        stops = [
            make_stop(lat=-43.5400, lon=172.6000),
            make_stop(lat=-43.5200, lon=172.6400),
            make_stop(lat=-43.5600, lon=172.6200),
            make_stop(lat=-43.5300, lon=172.6100),
            make_stop(lat=-43.5450, lon=172.6150),
        ]
        request, before = self.day_of(stops)
        affected = stops[2].id

        reopt = build_reopt_plan(request, before, [affected])

        unchanged = [stop.id for stop in stops if stop.id != affected]
        assert relative_order(reopt.plan, unchanged) == relative_order(before, unchanged)

    def test_an_added_stop_lands_in_the_day_and_the_delta_is_said(self) -> None:
        stops = [
            make_stop(lat=-43.5400, lon=172.6000),
            make_stop(lat=-43.5200, lon=172.6400),
            make_stop(lat=-43.5300, lon=172.6100),
        ]
        request, before = self.day_of(stops)
        addition = make_stop(lat=-43.6050, lon=172.5500)
        grown = RouteRequest(
            stops=tuple(stops) + (addition,),
            constraints=request.constraints,
        )

        reopt = build_reopt_plan(grown, before, [addition.id])

        assert len(reopt.plan.stops) == 4
        unchanged = [stop.id for stop in stops]
        assert relative_order(reopt.plan, unchanged) == relative_order(before, unchanged)
        assert reopt.finish_delta_s > 0.0

    def test_a_removed_stop_leaves_the_rest_of_the_order_alone(self) -> None:
        stops = [
            make_stop(lat=-43.5400, lon=172.6000),
            make_stop(lat=-43.5200, lon=172.6400),
            make_stop(lat=-43.5300, lon=172.6100),
        ]
        request, before = self.day_of(stops)
        leaving = stops[0]
        smaller = RouteRequest(
            stops=tuple(stop for stop in stops if stop.id != leaving.id),
            constraints=request.constraints,
        )

        reopt = build_reopt_plan(smaller, before, [leaving.id])

        assert len(reopt.plan.stops) == 2
        unchanged = [stop.id for stop in stops if stop.id != leaving.id]
        assert relative_order(reopt.plan, unchanged) == relative_order(before, unchanged)
        assert reopt.finish_delta_s < 0.0

    def test_the_reopt_of_nothing_changes_nothing(self) -> None:
        stops = [
            make_stop(lat=-43.5400, lon=172.6000),
            make_stop(lat=-43.5200, lon=172.6400),
        ]
        request, before = self.day_of(stops)

        reopt = build_reopt_plan(request, before, [])

        assert reopt.plan.stops == before.stops
        assert reopt.finish_delta_s == 0.0

    def test_the_reopt_is_deterministic(self) -> None:
        stops = [
            make_stop(lat=-43.5400, lon=172.6000),
            make_stop(lat=-43.5200, lon=172.6400),
            make_stop(lat=-43.5300, lon=172.6100),
            make_stop(lat=-43.5450, lon=172.6150),
        ]
        request, before = self.day_of(stops)

        first = build_reopt_plan(request, before, [stops[2].id])
        second = build_reopt_plan(request, before, [stops[2].id])

        assert first.plan == second.plan
        assert first.finish_delta_s == second.finish_delta_s

    def test_an_affected_stop_that_is_not_part_of_the_run_is_refused(self) -> None:
        stops = [make_stop(lat=-43.5400, lon=172.6000)]
        request, before = self.day_of(stops)

        with pytest.raises(ValueError, match="part of this run"):
            build_reopt_plan(request, before, [uuid.uuid4()])

    def test_a_change_that_silently_drops_a_stop_is_refused(self) -> None:
        """Every stop of the run has to be in the plan or in the affected set."""
        stops = [
            make_stop(lat=-43.5400, lon=172.6000),
            make_stop(lat=-43.5300, lon=172.6100),
        ]
        request, before = self.day_of(stops)
        grown = RouteRequest(
            stops=tuple(stops) + (make_stop(lat=-43.5200, lon=172.6400),),
            constraints=request.constraints,
        )

        with pytest.raises(ValueError, match="affected"):
            build_reopt_plan(grown, before, [])

    def test_the_delta_is_the_finish_time_difference(self) -> None:
        stops = [
            make_stop(lat=-43.5400, lon=172.6000),
            make_stop(lat=-43.5200, lon=172.6400),
        ]
        request, before = self.day_of(stops)
        addition = make_stop(lat=-43.6050, lon=172.5500)
        grown = RouteRequest(
            stops=tuple(stops) + (addition,),
            constraints=request.constraints,
        )

        reopt = build_reopt_plan(grown, before, [addition.id])
        finish_before = before.stops[-1].departure_at
        finish_after = reopt.plan.stops[-1].departure_at

        assert finish_delta_s(before, reopt.plan) == (finish_after - finish_before).total_seconds()


class TestThePerformanceBudget:
    def test_two_hundred_stops_stay_inside_the_five_second_budget(self) -> None:
        """The squad target with the production engine: 200 stops plan in five seconds."""
        stops = [
            make_stop(
                lat=-43.5330 + (index % 20) * 0.004,
                lon=172.6300 + (index // 20) * 0.004,
            )
            for index in range(200)
        ]
        request = make_request(stops)

        started = time.perf_counter()
        plan = build_plan(request, engine=PyVRPEngine())
        elapsed = time.perf_counter() - started

        assert len(plan.stops) == 200
        assert elapsed < 5.0

    def test_a_partial_reopt_stays_fast_on_the_captured_day(self) -> None:
        """Adding one stop to a 174-stop day is a reopt, not a re-solve."""
        stops = [
            make_stop(
                lat=-43.5330 + (index % 20) * 0.004,
                lon=172.6300 + (index // 20) * 0.004,
            )
            for index in range(174)
        ]
        request = make_request(stops)
        before = build_plan(request, engine=PyVRPEngine())
        addition = make_stop(lat=-43.5100, lon=172.6100)
        grown = RouteRequest(
            stops=tuple(stops) + (addition,),
            constraints=request.constraints,
        )

        started = time.perf_counter()
        reopt = build_reopt_plan(grown, before, [addition.id])
        elapsed = time.perf_counter() - started

        assert len(reopt.plan.stops) == 175
        assert elapsed < 2.0
