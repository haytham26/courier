"""The routing core: the day's order, the arrival times and the distance.

The module plans a run without a routing engine on the machine. It works from
the stop coordinates with a great-circle distance and a road factor, so the
tests and the CI (which has no Valhalla, no GraphHopper and no OSRM) can
prove the plan end to end.

The production engine - PyVRP with VROOM over a Valhalla or GraphHopper
matrix, per `docs/research/2026/routing-vrp-engines.md` - sits behind the
`RouteEngine` protocol. `get_engine()` returns the deterministic heuristic
until the routing service exists; the seam is the only part that changes when
it does.

The algorithm is a nearest-neighbour seed followed by a 2-opt improvement.
Both run inside the priority group and the ordinary group separately, so the
priority stops keep the front of the day. The result is deterministic: the
same stops and the same constraints always give the same order, the same
arrival times and the same distance.
"""
from __future__ import annotations

import math
from collections import deque
from collections.abc import Sequence
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


def _schedule(order: Sequence[RouteStop], request: RouteRequest) -> tuple[list[_Leg], float, int]:
    """Walks the order and times it.

    The arrival time is when the delivery starts: the courier waits for the
    window to open rather than knocking early. A stop whose window closes
    before the courier can arrive is counted as a violation and flagged.
    """
    constraints = request.constraints
    clock = _aware(constraints.start_at)
    lat, lon = constraints.depot_lat, constraints.depot_lon
    legs: list[_Leg] = []
    cumulative = 0.0
    violations = 0
    for stop in order:
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
    return legs, cumulative, violations


def _build_plan(order: list[RouteStop], request: RouteRequest, engine_name: str) -> RoutePlan:
    """The plan for an order: the ordered stops, the arrival times, the distance."""
    legs, total_distance, violations = _schedule(order, request)
    capacity = request.constraints.capacity_parcels
    parcels = sum(stop.parcels for stop in order)
    start = _aware(request.constraints.start_at)
    end = legs[-1].departure_at if legs else start
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
        for index, leg in enumerate(legs)
    )
    return RoutePlan(
        stops=planned,
        total_distance_m=total_distance,
        total_duration_s=(end - start).total_seconds(),
        parcels=parcels,
        capacity_parcels=capacity,
        over_capacity=capacity is not None and parcels > capacity,
        window_violations=violations,
        engine=engine_name,
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
    violations = _schedule(current, request)[2]
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
            if _schedule(candidate, request)[2] > violations:
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


@lru_cache(maxsize=1)
def get_engine() -> RouteEngine:
    """The engine the API plans with.

    The production engine (PyVRP with VROOM over a Valhalla matrix) needs the
    routing service, which does not run in the CI or on a courier's phone.
    Until it exists the deterministic heuristic is both the engine and the
    fallback; swapping the production engine in is a change to this factory.
    """
    return HeuristicEngine()
