"""The production solver: PyVRP 0.14.1 plans the order of the day.

This engine stands behind `app.routing.RouteEngine` (ADR-009). It
translates the run into a PyVRP problem - one vehicle, the day's time
windows and the load capacity - lets PyVRP solve it, and hands the order
back to the routing core, which is the single source of truth for the
arrival times and for the break of the day.

The model facts come from the pinned sources (`services/api/.venv/Lib/
site-packages/pyvrp`): `VehicleType(tw_early=..., start_late=...)` pins the
departure of a phase to an exact second; `Route.schedule()` yields the
depot and client activities in visit order, with a client's `idx` pointing
into the clients list; and `Solution.is_feasible()` says whether the day
can be planned at all. The free function `pyvrp.solve(data, stop, seed,
collect_stats, display)` runs the solver deterministically under
`MaxIterations` with a fixed seed. PyVRP is MIT-licensed.

The break of the day - a wait the courier takes strictly between two stops -
is not part of the solver's model. PyVRP cannot value the drive that the
pause interrupts: the van stands where it stopped, and both encodings of
that (free arcs, or an overcharged arc) either erase a leg or tie mirror
orders. The core's own scored placement decides where the break goes, and
the same walk that times the day reports whether the break window, and
every stop window, was met.

When the day cannot be solved feasibly - a window that cannot be met, a
load over the capacity - the engine falls back to the deterministic
heuristic, which reports the violations honestly instead of dropping a
stop.
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from datetime import datetime
from typing import Any, cast

import numpy as np
from pyvrp._pyvrp import ActivityType, Client, Depot, Location, ProblemData, VehicleType
from pyvrp.solve import solve
from pyvrp.stop import MaxIterations

from app.routing import (
    HeuristicEngine,
    RoutePlan,
    RouteRequest,
    RouteStop,
    _aware,
    _build_plan,
    _distance_m,
    _service_seconds,
    _travel_seconds,
    _walk,
)

MAX_ITERATIONS = 250
"""The deterministic stopping criterion: the same input, the same plan.

The count keeps the project's performance budget (a 200-stop route in
five seconds, `docs/plan/CONSTRAINTS.md`) met on a slow machine with room
to spare; the benchmark in `docs/evidence/backend-solver/` records what
the shorter run costs the day's length.
"""

SEED = 0
"""The seed of the solver's random stream, for the same reason."""

UNBOUNDED = int(np.iinfo(np.int64).max)
"""The bindings' own default for an open edge of a time window (Model.py:436)."""


def _rel_earliest(limit: datetime | None, start_at: datetime) -> int:
    """Seconds from the day's start to the earliest arrival, rounded up.

    A window with no floor is open from the departure of the van, and a
    window that opens before then retroactively opens with it.
    """
    if limit is None:
        return 0
    return max(0, int(math.ceil((limit - start_at).total_seconds())))


def _rel_latest(limit: datetime | None, start_at: datetime) -> int:
    """Seconds from the day's start to the latest arrival, rounded down.

    An unbounded window stays unbounded: the bindings' own default.
    """
    if limit is None:
        return UNBOUNDED
    return max(0, int(math.floor((limit - start_at).total_seconds())))


def _matrices(
    points: Sequence[tuple[float, float]],
    speed_kmh: float,
) -> tuple[np.ndarray, np.ndarray]:
    """The int64 second-matrices of the walk the core does between the points.

    Values are rounded up, so what the solver calls feasible stays feasible
    under the core's recomputation.
    """
    size = len(points)
    distances = np.zeros((size, size), dtype=np.int64)
    durations = np.zeros((size, size), dtype=np.int64)
    for i in range(size):
        for j in range(size):
            if i == j:
                continue
            leg_m = _distance_m(points[i][0], points[i][1], points[j][0], points[j][1])
            distances[i, j] = int(math.ceil(leg_m))
            durations[i, j] = int(math.ceil(_travel_seconds(leg_m, speed_kmh)))
    return distances, durations


def _departure_pin(
    order: list[RouteStop],
    request: RouteRequest,
) -> tuple[int, tuple[float, float]]:
    """When and where the phase with this order would hand over the van.

    Returns the hand-over second, from the day's start, and the hand-over
    point - the last stop, not the day's depot, since that is where the van
    actually stands. The walk carries no break marker: the break belongs to
    the last phase, and this pin only tells the next phase when and where
    it takes the van over.
    """
    last = order[-1]
    walked = _walk(order, request, len(order) + 1)
    start_at = _aware(request.constraints.start_at)
    seconds = max(0, int(math.ceil((walked.legs[-1].departure_at - start_at).total_seconds())))
    return seconds, (last.lat, last.lon)


class PyVRPEngine:
    """The production engine behind the seam: PyVRP chooses the order.

    Two phases keep the priority stops at the front of the day: the
    priority stops are solved as their own tour first, and the ordinary
    stops are solved as a tour that starts where the first one ended. The
    break of the day never rides in the solver's model; the core places it
    after the order is known.
    """

    name = "pyvrp"

    def __init__(self, iterations: int = MAX_ITERATIONS, seed: int = SEED) -> None:
        self._iterations = iterations
        self._seed = seed

    def plan(self, request: RouteRequest) -> RoutePlan:
        constraints = request.constraints
        if constraints.speed_kmh <= 0:
            raise ValueError("the average speed must be positive")
        if not request.stops:
            return _build_plan([], request, self.name)

        priorities = [stop for stop in request.stops if stop.priority]
        ordinary = [stop for stop in request.stops if not stop.priority]
        groups = [group for group in (priorities, ordinary) if group]

        pins = [0] * len(groups)
        pins_point = [(constraints.depot_lat, constraints.depot_lon)] * len(groups)
        orders: list[list[RouteStop]] = []
        for index, group in enumerate(groups):
            last = index == len(groups) - 1
            order = self._solve_group(
                group,
                request,
                start_s=pins[index],
                start_point=pins_point[index],
            )
            if order is None:
                return HeuristicEngine().plan(request)
            orders.append(order)
            if not last:
                pins[index + 1], pins_point[index + 1] = _departure_pin(order, request)

        full_order = [stop for order in orders for stop in order]
        return _build_plan(full_order, request, self.name, None)

    def _solve_group(
        self,
        stops: list[RouteStop],
        request: RouteRequest,
        *,
        start_s: int,
        start_point: tuple[float, float],
    ) -> list[RouteStop] | None:
        """Solves one phase of the day and returns its order.

        The phase starts at `start_point` - the day's depot, or where the
        previous phase left the van - and at `start_s`, the hand-over second
        the departure is pinned to. Returns `None` when PyVRP cannot plan
        the phase feasibly at all, which falls back to the heuristic for
        the whole day.
        """
        constraints = request.constraints
        start_at = _aware(constraints.start_at)
        finish_lat = (
            constraints.finish_lat if constraints.finish_lat is not None else constraints.depot_lat
        )
        finish_lon = (
            constraints.finish_lon if constraints.finish_lon is not None else constraints.depot_lon
        )
        capacity = constraints.capacity_parcels

        points: list[tuple[float, float]] = [
            start_point,  # 0: the van is here when the phase takes over
            (finish_lat, finish_lon),  # 1: the day ends here (the depot when unset)
        ]
        points.extend((stop.lat, stop.lon) for stop in stops)

        locations = [Location(x=lon, y=lat) for lat, lon in points]
        distances, durations = _matrices(points, constraints.speed_kmh)

        clients: list[Client] = []
        for index, stop in enumerate(stops):
            window = stop.window
            clients.append(
                Client(
                    location=2 + index,
                    delivery=[stop.parcels] if capacity is not None else [],
                    service_duration=_service_seconds(stop, constraints),
                    tw_early=_rel_earliest(window.start if window else None, start_at),
                    tw_late=_rel_latest(window.end if window else None, start_at),
                    required=True,
                )
            )

        vehicle_type = VehicleType(
            num_available=1,
            capacity=[capacity] if capacity is not None else [],
            start_depot=0,
            end_depot=1,
            unit_distance_cost=0,
            unit_duration_cost=1,
            tw_early=start_s,
            start_late=start_s,
        )
        depots = [
            Depot(location=0, tw_early=start_s, tw_late=UNBOUNDED),
            Depot(location=1, tw_early=start_s, tw_late=UNBOUNDED),
        ]
        data = ProblemData(
            locations,
            clients,
            depots,
            [vehicle_type],
            cast("list[Any]", [distances]),
            cast("list[Any]", [durations]),
            [],
            [],
        )

        result = solve(
            data,
            MaxIterations(self._iterations),
            seed=self._seed,
            collect_stats=False,
            display=False,
        )
        best = result.best
        if not best.is_feasible():
            return None
        routes = best.routes()
        if not routes:
            return None
        return [
            stops[activity.idx]
            for activity in routes[0].schedule()
            if activity.type == ActivityType.CLIENT
        ]
