"""The routing core: the day's order, the arrival times and the distance.

The module plans a run from the stop coordinates with a great-circle
distance and a road factor, so the tests and the CI (which has no Valhalla,
no GraphHopper and no OSRM) can prove the plan end to end.

The engine behind the `RouteEngine` protocol decides the order; this module
decides the times. `get_engine()` returns the production solver
(`PyVRPEngine`, in `app/solver.py`, ADR-009), and falls back to the
deterministic heuristic both when the solver is not available and when a
phase of the day cannot be planned feasibly at all - a window that cannot be
met - so every violation is still reported rather than a stop dropped. A load
over the capacity is flagged by the plan, never silently fixed: when every
phase fits, the day is planned and `over_capacity` says so.

The heuristic is a nearest-neighbour seed followed by a 2-opt improvement.
Both run inside the priority group and the ordinary group separately, so the
priority stops keep the front of the day. The result stays deterministic:
the same stops and the same constraints always give the same order, the same
arrival times and the same distance.
"""
from __future__ import annotations

import importlib
import math
import os
import warnings
from collections import deque
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from functools import lru_cache
from typing import Protocol
from uuid import UUID

from .sequencing import Segment

EARTH_RADIUS_M = 6_371_000.0
DEFAULT_SPEED_KMH = 30.0
DEFAULT_SERVICE_TIME_S = 300
ROAD_FACTOR = 1.25
# A move has to save at least this much to be worth the shuffle.
EPSILON_M = 0.5


@dataclass(frozen=True)
class TimeWindow:
    """When the courier may knock. `end` is the last acceptable arrival."""

    start: datetime | None = None
    end: datetime | None = None

    def contains(self, moment: datetime) -> bool:
        """Whether the delivery can start at `moment`."""
        too_early = self.start is not None and moment < self.start
        too_late = self.end is not None and moment > self.end
        return not too_early and not too_late


@dataclass(frozen=True)
class BreakConstraint:
    """The workday break: when it may start and how long it runs."""

    earliest: datetime
    latest: datetime
    minutes: int

    def __post_init__(self) -> None:
        if self.minutes < 1:
            raise ValueError("the break must run at least one minute")
        if _aware(self.earliest) > _aware(self.latest):
            raise ValueError("the break window ends before it opens")

    def contains(self, moment: datetime) -> bool:
        """Whether the break may start at `moment`."""
        return _aware(self.earliest) <= moment <= _aware(self.latest)


@dataclass(frozen=True)
class RouteStop:
    """One stop of the run, with the constraints the engine must honour."""

    id: UUID
    lat: float
    lon: float
    priority: bool = False
    parcels: int = 1
    service_time_s: int | None = None
    window: TimeWindow | None = None


@dataclass(frozen=True)
class RunConstraints:
    """The van and the day: where it starts, when, and how much fits."""

    depot_lat: float
    depot_lon: float
    start_at: datetime
    capacity_parcels: int | None = None
    speed_kmh: float = DEFAULT_SPEED_KMH
    service_time_s: int = DEFAULT_SERVICE_TIME_S
    break_constraint: BreakConstraint | None = None
    finish_lat: float | None = None
    finish_lon: float | None = None


@dataclass(frozen=True)
class RouteRequest:
    """What the engine is asked to plan."""

    stops: tuple[RouteStop, ...]
    constraints: RunConstraints


@dataclass(frozen=True)
class PlannedStop:
    """One stop of the plan, with when the courier gets there."""

    stop_id: UUID
    sequence: int
    lat: float
    lon: float
    arrival_at: datetime
    departure_at: datetime
    distance_m: float
    cumulative_distance_m: float
    late: bool = False


@dataclass(frozen=True)
class RoutePlan:
    """The answer: the ordered stops, the arrival times and the distance."""

    stops: tuple[PlannedStop, ...]
    total_distance_m: float
    total_duration_s: float
    parcels: int
    capacity_parcels: int | None
    over_capacity: bool
    window_violations: int
    engine: str
    break_start_at: datetime | None = None
    break_end_at: datetime | None = None
    break_violation: bool = False
    finish_lat: float | None = None
    finish_lon: float | None = None


@dataclass(frozen=True)
class RunTemplate:
    """The Master Template Lock: the courier's own street order for the run.

    The identity comes from the phone, so the same template can be replayed
    offline and stored once.
    """

    id: str
    segments: tuple[Segment, ...]
    stop_order: tuple[UUID, ...]


class RouteEngine(Protocol):
    """The seam every engine implements.

    The heuristic fills it today; the PyVRP and VROOM engine fills it when the
    routing service runs. Nothing outside this module needs to know which one
    it is talking to.
    """

    name: str

    def plan(self, request: RouteRequest) -> RoutePlan:
        """Plans the day: the order, the arrival times and the distance."""


def _aware(moment: datetime) -> datetime:
    """The timezone-aware form of a moment (a naive one is read as UTC)."""
    if moment.tzinfo is None:
        return moment.replace(tzinfo=UTC)
    return moment


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """The great-circle distance between two points, in metres."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    haversine = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(haversine))


def _distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """The road distance we use until the routing service supplies the real one."""
    return _haversine_m(lat1, lon1, lat2, lon2) * ROAD_FACTOR


def _travel_seconds(distance_m: float, speed_kmh: float) -> float:
    """How long the leg takes at the van's average speed."""
    if speed_kmh <= 0:
        raise ValueError("the average speed must be positive")
    return distance_m / (speed_kmh * 1000.0 / 3600.0)


def _service_seconds(stop: RouteStop, constraints: RunConstraints) -> int:
    """The time at the door: the stop's own, or the run's default."""
    if stop.service_time_s is not None:
        return stop.service_time_s
    return constraints.service_time_s


@dataclass(frozen=True)
class _Leg:
    """One leg of the schedule, before it becomes a `PlannedStop`."""

    stop: RouteStop
    arrival_at: datetime
    departure_at: datetime
    distance_m: float
    cumulative_distance_m: float
    late: bool


@dataclass(frozen=True)
class _Timing:
    """One walk of an order: the legs, the distance and what went wrong."""

    legs: list[_Leg]
    total_distance_m: float
    window_violations: int
    break_start_at: datetime | None = None
    break_end_at: datetime | None = None
    break_violation: bool = False


def _walk(
    order: Sequence[RouteStop],
    request: RouteRequest,
    break_position: int | None,
) -> _Timing:
    """Times one walk of the order, with the break after the `break_position`-th stop.

    The arrival time is when the delivery starts: the courier waits for the
    window to open rather than knocking early. A stop whose window closes
    before the courier can arrive is counted as a violation and flagged.

    The break is taken where the van stands (at the previous stop), so no
    distance is added and everything after it moves by the break's minutes.
    It sits between two stops of the day - never before the first or after
    the last - because there it would be free, and a break is not.
    """
    constraints = request.constraints
    clock = _aware(constraints.start_at)
    lat, lon = constraints.depot_lat, constraints.depot_lon
    legs: list[_Leg] = []
    cumulative = 0.0
    violations = 0
    break_constraint = constraints.break_constraint
    break_start: datetime | None = None
    break_end: datetime | None = None
    break_violation = False
    for index, stop in enumerate(order):
        leg_m = _distance_m(lat, lon, stop.lat, stop.lon)
        cumulative += leg_m
        arrival = clock + timedelta(seconds=_travel_seconds(leg_m, constraints.speed_kmh))
        window = stop.window
        if window is not None and window.start is not None:
            arrival = max(arrival, _aware(window.start))
        late = False
        if window is not None and window.end is not None:
            closing = _aware(window.end)
            late = arrival > closing
            if late:
                violations += 1
        departure = arrival + timedelta(seconds=_service_seconds(stop, constraints))
        legs.append(_Leg(stop, arrival, departure, leg_m, cumulative, late))
        clock = departure
        lat, lon = stop.lat, stop.lon
        if break_constraint is not None and break_position == index + 1:
            break_start = max(clock, _aware(break_constraint.earliest))
            break_violation = break_start > _aware(break_constraint.latest)
            break_end = break_start + timedelta(minutes=break_constraint.minutes)
            clock = break_end
    if break_constraint is not None and break_start is None:
        # no pair of stops to put the break between
        break_violation = True
    return _Timing(legs, cumulative, violations, break_start, break_end, break_violation)


def _schedule(
    order: Sequence[RouteStop],
    request: RouteRequest,
    break_position: int | None = None,
) -> _Timing:
    """Times an order, placing the break where it is told to, or greedily well.

    `break_position` is the number of stops before the break. It must stand
    strictly between two stops - 1 up to the stop count - 1 - and anything
    else raises: a told position is never silently re-read as "not given".
    When it is not given the position comes out of the same score as the
    reopt slots: the least violation, then the earliest finish, then the
    front of the day.
    """
    constraint = request.constraints.break_constraint
    if break_position is not None and not 1 <= break_position < len(order):
        raise ValueError("the break position must stand strictly between two stops of the day")
    if constraint is None:
        return _walk(order, request, None)
    candidates: Iterable[int] = (
        {break_position}
        if break_position is not None and 1 <= break_position < len(order)
        else range(1, len(order))
    )
    start = _aware(request.constraints.start_at)
    best: _Timing | None = None
    best_score: tuple[int, float, int] | None = None
    for position in candidates:
        timing = _walk(order, request, position)
        score = (
            timing.window_violations + timing.break_violation,
            (timing.legs[-1].departure_at - start).total_seconds() if timing.legs else 0.0,
            position,
        )
        if best_score is None or score < best_score:
            best, best_score = timing, score
    if best is None:
        return _walk(order, request, None)
    return best


def _build_plan(
    order: list[RouteStop],
    request: RouteRequest,
    engine_name: str,
    break_position: int | None = None,
) -> RoutePlan:
    """The plan for an order: the ordered stops, the arrival times, the distance."""
    walked = _schedule(order, request, break_position)
    capacity = request.constraints.capacity_parcels
    parcels = sum(stop.parcels for stop in order)
    start = _aware(request.constraints.start_at)
    end = walked.legs[-1].departure_at if walked.legs else start
    planned = tuple(
        PlannedStop(
            stop_id=leg.stop.id,
            sequence=index + 1,
            lat=leg.stop.lat,
            lon=leg.stop.lon,
            arrival_at=leg.arrival_at,
            departure_at=leg.departure_at,
            distance_m=leg.distance_m,
            cumulative_distance_m=leg.cumulative_distance_m,
            late=leg.late,
        )
        for index, leg in enumerate(walked.legs)
    )
    return RoutePlan(
        stops=planned,
        total_distance_m=walked.total_distance_m,
        total_duration_s=(end - start).total_seconds(),
        parcels=parcels,
        capacity_parcels=capacity,
        over_capacity=capacity is not None and parcels > capacity,
        window_violations=walked.window_violations,
        engine=engine_name,
        break_start_at=walked.break_start_at,
        break_end_at=walked.break_end_at,
        break_violation=walked.break_violation,
        finish_lat=request.constraints.finish_lat,
        finish_lon=request.constraints.finish_lon,
    )


def _priority_boundary(order: Sequence[RouteStop]) -> int:
    """Where the priority stops end and the ordinary group starts."""
    for index, stop in enumerate(order):
        if not stop.priority:
            return index
    return len(order)


def _inside_group(i: int, j: int, boundary: int) -> bool:
    """Whether reversing the stretch from `i` to `j` keeps the groups apart."""
    return j <= boundary or i > boundary


def _path_distance(
    order: Sequence[RouteStop], constraints: RunConstraints, i: int, j: int
) -> float:
    """The distance between two points of the path (the point 0 is the depot)."""
    if i == 0:
        lat1, lon1 = constraints.depot_lat, constraints.depot_lon
    else:
        lat1, lon1 = order[i - 1].lat, order[i - 1].lon
    if j == 0:
        lat2, lon2 = constraints.depot_lat, constraints.depot_lon
    else:
        lat2, lon2 = order[j - 1].lat, order[j - 1].lon
    return _distance_m(lat1, lon1, lat2, lon2)


def _two_opt_delta(
    order: Sequence[RouteStop], constraints: RunConstraints, i: int, j: int, count: int
) -> float:
    """How much a 2-opt move saves (a negative number is an improvement).

    The path is open: the day ends at the last stop, so the leg after the
    last point does not exist.
    """
    old = _path_distance(order, constraints, i - 1, i)
    new = _path_distance(order, constraints, i - 1, j)
    if j < count:
        old += _path_distance(order, constraints, j, j + 1)
        new += _path_distance(order, constraints, i, j + 1)
    return new - old


def _next_stop(
    remaining: list[RouteStop],
    lat: float,
    lon: float,
    clock: datetime,
    constraints: RunConstraints,
) -> tuple[int, RouteStop, datetime]:
    """The next stop of the seed: the closest one that can still be reached in time.

    When no stop can be reached in its window the most urgent one wins, so
    the day loses as little time as it can.
    """
    feasible: list[tuple[float, str, int, RouteStop, datetime]] = []
    urgent: list[tuple[datetime, float, str, int, RouteStop, datetime]] = []
    for index, stop in enumerate(remaining):
        leg_m = _distance_m(lat, lon, stop.lat, stop.lon)
        arrival = clock + timedelta(seconds=_travel_seconds(leg_m, constraints.speed_kmh))
        window = stop.window
        if window is not None and window.start is not None:
            arrival = max(arrival, _aware(window.start))
        departure = arrival + timedelta(seconds=_service_seconds(stop, constraints))
        if window is None or window.end is None or arrival <= _aware(window.end):
            feasible.append((leg_m, str(stop.id), index, stop, departure))
        else:
            urgent.append((_aware(window.end), leg_m, str(stop.id), index, stop, departure))
    if feasible:
        feasible.sort(key=lambda item: (item[0], item[1]))
        best_feasible = feasible[0]
        return best_feasible[2], best_feasible[3], best_feasible[4]
    urgent.sort(key=lambda item: (item[0], item[1], item[2]))
    best_urgent = urgent[0]
    return best_urgent[3], best_urgent[4], best_urgent[5]


def _seed_order(request: RouteRequest) -> list[RouteStop]:
    """The nearest-neighbour seed.

    The priority stops are seeded first and the ordinary stops after them, so
    the day starts with the stops the courier has to knock at first.
    """
    constraints = request.constraints
    groups = (
        [stop for stop in request.stops if stop.priority],
        [stop for stop in request.stops if not stop.priority],
    )
    order: list[RouteStop] = []
    clock = _aware(constraints.start_at)
    lat, lon = constraints.depot_lat, constraints.depot_lon
    for group in groups:
        remaining = sorted(group, key=lambda stop: str(stop.id))
        while remaining:
            index, choice, departure = _next_stop(remaining, lat, lon, clock, constraints)
            del remaining[index]
            order.append(choice)
            clock = departure
            lat, lon = choice.lat, choice.lon
    return order


def _improve_order(order: list[RouteStop], request: RouteRequest) -> list[RouteStop]:
    """The 2-opt improvement.

    A stretch of the order is reversed when that shortens the day. A move
    that would break a time window is refused, so the improvement never makes
    the day worse for the courier.
    """
    count = len(order)
    if count < 3:
        return order
    constraints = request.constraints
    boundary = _priority_boundary(order)
    current = list(order)
    violations = _schedule(current, request).window_violations
    queue: deque[int] = deque(range(1, count))
    queued = [True] * (count + 1)
    dont_look = [False] * (count + 1)
    while queue:
        i = queue.popleft()
        queued[i] = False
        if dont_look[i]:
            continue
        improved = False
        for j in range(i + 1, count + 1):
            if not _inside_group(i, j, boundary):
                continue
            if _two_opt_delta(current, constraints, i, j, count) >= -EPSILON_M:
                continue
            candidate = list(current)
            candidate[i - 1 : j] = reversed(candidate[i - 1 : j])
            if _schedule(candidate, request).window_violations > violations:
                continue
            current = candidate
            improved = True
            for neighbour in (i - 1, i, i + 1, j, j + 1):
                if 1 <= neighbour <= count - 1:
                    dont_look[neighbour] = False
                    if not queued[neighbour]:
                        queue.append(neighbour)
                        queued[neighbour] = True
            break
        if not improved:
            dont_look[i] = True
    return current


class HeuristicEngine:
    """The deterministic engine: nearest neighbour, then 2-opt.

    It needs no routing service, no matrix and no network, which is why the
    tests and the CI can use it. It is also the fallback whenever the
    production engine is not available.
    """

    name = "heuristic-nn-2opt"

    def plan(self, request: RouteRequest) -> RoutePlan:
        """Plans the day."""
        order = _seed_order(request)
        order = _improve_order(order, request)
        return _build_plan(order, request, self.name)


def build_plan(request: RouteRequest, engine: RouteEngine | None = None) -> RoutePlan:
    """Plans the day with the engine (the deterministic heuristic by default)."""
    chosen = engine if engine is not None else get_engine()
    return chosen.plan(request)


def seed_plan(request: RouteRequest) -> RoutePlan:
    """The nearest-neighbour plan without the improvement.

    The benchmark measures the 2-opt step against this baseline, and the
    tests prove the improvement never makes the day longer.
    """
    return _build_plan(_seed_order(request), request, "heuristic-nn")


def schedule_plan(
    order: Sequence[RouteStop],
    request: RouteRequest,
    engine_name: str = "template-lock",
) -> RoutePlan:
    """The arrival times for an order the courier has locked (the template).

    The order is kept exactly as it was locked; only the timings, the
    distance and the capacity are worked out.
    """
    return _build_plan(list(order), request, engine_name)


@dataclass(frozen=True)
class ReoptResult:
    """The partial reopt: the re-placed stops and the finish-time delta."""

    plan: RoutePlan
    finish_delta_s: float


def finish_delta_s(before: RoutePlan, after: RoutePlan) -> float:
    """How much the day's finish moved, in seconds (a negative number means earlier).

    When one of the days has no stops there is no finish to compare, and the
    delta is 0.
    """
    if not before.stops or not after.stops:
        return 0.0
    return (after.stops[-1].departure_at - before.stops[-1].departure_at).total_seconds()


def _best_slot(order: list[RouteStop], request: RouteRequest, stop: RouteStop) -> list[RouteStop]:
    """The order with one stop at its best slot (least violation, earliest finish).

    The slot after the last stop counts too: an added stop may close the
    day rather than wedge into it.
    """
    best_score: tuple[int, float, int] | None = None
    best_order = order + [stop]
    for slot in range(len(order) + 1):
        candidate = order[:slot] + [stop] + order[slot:]
        plan = _build_plan(candidate, request, "partial-reopt")
        score = (
            plan.window_violations + plan.break_violation,
            plan.total_duration_s,
            slot,
        )
        if best_score is None or score < best_score:
            best_score, best_order = score, candidate
    return best_order


def build_reopt_plan(
    request: RouteRequest,
    current: RoutePlan,
    affected_ids: Sequence[UUID],
) -> ReoptResult:
    """Re-places only the affected stops; the rest of the order stays as it is.

    The unchanged stops keep their relative order, so the day before is the
    day after, except where the courier said something changed. The affected
    stops go back into the order nearest-to-the-depot first, each at the slot
    `_best_slot` picks, so the same day always maps to the same reopt. The
    result carries the finish-time delta, so the copilot can say "this adds
    N minutes" before the edit is made.
    """
    current_ids = {stop.stop_id for stop in current.stops}
    request_ids = {stop.id for stop in request.stops}
    affected = list(dict.fromkeys(affected_ids))
    unknown = [stop_id for stop_id in affected if stop_id not in request_ids | current_ids]
    if unknown:
        listed = ", ".join(str(stop_id) for stop_id in unknown)
        raise ValueError(f"affected stop {listed} is not part of this run")
    affected_set = set(affected)
    missing = [stop_id for stop_id in request_ids if stop_id not in affected_set | current_ids]
    if missing:
        listed = ", ".join(str(stop_id) for stop_id in missing)
        raise ValueError(
            f"stop {listed} is in the run but not in the plan and not in the affected stops"
        )
    by_id = {stop.id: stop for stop in request.stops}
    order = [by_id[stop.stop_id] for stop in current.stops if stop.stop_id in request_ids]
    changed = [by_id[stop_id] for stop_id in affected if stop_id in request_ids]
    constraints = request.constraints
    changed.sort(
        key=lambda stop: (
            _distance_m(constraints.depot_lat, constraints.depot_lon, stop.lat, stop.lon),
            str(stop.id),
        )
    )
    for stop in changed:
        order = [kept for kept in order if kept.id != stop.id]
        order = _best_slot(order, request, stop)

    after = _build_plan(order, request, "partial-reopt")
    return ReoptResult(plan=after, finish_delta_s=finish_delta_s(current, after))


@lru_cache(maxsize=1)
def get_engine() -> RouteEngine:
    """The engine the API plans with (read once; the env var is a release lever).

    The production engine is `PyVRPEngine` (ADR-009): PyVRP chooses the
    order and this core times it. `COURIER_ROUTE_ENGINE=heuristic-nn-2opt`
    selects the heuristic instead, which also takes over when the solver is
    not installed on the machine. Nothing outside this module needs to know
    which engine it is talking to.
    """
    chosen = os.getenv("COURIER_ROUTE_ENGINE", "pyvrp")
    if chosen == "heuristic-nn-2opt":
        return HeuristicEngine()
    if chosen != "pyvrp":
        raise ValueError(
            f"COURIER_ROUTE_ENGINE={chosen} is unknown: use pyvrp or heuristic-nn-2opt"
        )
    try:
        module = importlib.import_module(".solver", __package__)
        engine: RouteEngine = module.PyVRPEngine()
    except ImportError:
        warnings.warn(
            "the PyVRP solver is not available; the deterministic heuristic is planning"
            " the days (install services/api's dependency set to lift this)",
            RuntimeWarning,
            stacklevel=2,
        )
        engine = HeuristicEngine()
    return engine
