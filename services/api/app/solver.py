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

When a phase of the day cannot be planned feasibly at all - a window that
cannot be met - the engine falls back to the deterministic heuristic, which
reports the violations honestly instead of dropping a stop. A load over the
van's capacity does not force the fallback when every phase fits on its own:
the day is planned and the plan's `over_capacity` flag - the walk's own
verdict - says so.
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
"""The default stopping criterion: the same input, the same plan.

The count keeps the project's performance budget (a 200-stop route in
five seconds, `docs/plan/CONSTRAINTS.md`) met on a slow machine with room
to spare; the benchmark in `docs/evidence/backend-solver/` records what
the shorter run costs the day's length.

BUG-280 measured the budget on 144 synthetic Christchurch days
(`docs/evidence/routing-eval-280/`) and split it by the day's size, because
the two targets the measurement holds the engine to pull opposite ways: the
solve p95 under 3 seconds at 150 stops wants the SMALL days to stop sooner,
and being within 5% of a long-budget baseline at 250 stops wants the BIG
days to search longer. One number cannot serve both, so the production
engine now spends `iterations_for(stop_count)` - still a pure function of the
input, so the same day still plans to the same order on the same machine.
"""

#: The everyday budget below the bar's size: no bar applies there, and the
#: eval set measured what the quality costs (the 80-stop worst case at 5.10 %
#: over the long-budget baseline with 250 iterations).
DEFAULT_ITERATIONS = 400

#: The everyday budget AT the bar's size: the p95 bar is about 150 stops, and
#: 250 iterations there measured a worst case of 0.04 % (100 measured 6.31 %).
BARRED_DAY_PLAIN_ITERATIONS = 250

#: The size at which the day becomes expensive enough to want the bar's
#: budget: the directive's p95-under-3-seconds bar is measured AT 150 stops,
#: and 250 iterations there measured a p95 of 4.56 s against 2.65 s at 100.
BARRED_DAY_STOPS = 150

#: The budget a WINDOWED day spends at the bar's size. BUG-280 measured the
#: shape of it: every windowed 150-stop instance in the set is infeasible under
#: its windows for every engine, so the windowed search's job there is to prove
#: the infeasibility and the window-DROPPED retry does the real work - 50
#: iterations measured the same orders at a third of the cost, and the p95 bar
#: is about this size.
BARRED_DAY_ITERATIONS = 50

#: The ceiling the big days may spend: 250 stops at 600 iterations measured
#: 0.7 % over the long-budget baseline on average against 2.1 % at 250.
LARGE_DAY_ITERATIONS = 600

#: The rate the budget grows with the stops past the bar's size.
ITERATIONS_PER_STOP = 3

#: The share of the budget the window-DROPPED retry spends. The retry runs on
#: a day whose windows the solver already could not meet: the engine owes the
#: day its best honest order (the core reports every violation), not a second
#: full search, and BUG-280 measured the better order it buys for about a
#: third of the budget.
RETRY_BUDGET_SHARE = 0.35

#: The floor the retry's budget cannot go under.
RETRY_MIN_ITERATIONS = 20


def iterations_for(stop_count: int, *, windowed: bool = False) -> int:
    """The solver's budget for a day of this many stops.

    A pure function of the day: the same day always gets the same budget,
    which is what keeps the engine deterministic. The rule BUG-280 measured
    into being:

    - a day without time windows gets the everyday budget and the quality it
      buys (at 150 stops, 250 iterations measured 0.04 % over the long-budget
      baseline at worst, where 100 measured 6.31 %);
    - a WINDOWED day at the bar's size gets `BARRED_DAY_ITERATIONS`, because
      the windows are what make the day expensive: the engine searches them,
      fails, and retries without them, and the p95 bar is measured there;
    - past the bar's size each extra stop buys `ITERATIONS_PER_STOP` more
      iterations, capped at `LARGE_DAY_ITERATIONS` so the biggest days cannot
      spend minutes."""
    if stop_count >= BARRED_DAY_STOPS and windowed:
        base = BARRED_DAY_ITERATIONS
    elif stop_count >= BARRED_DAY_STOPS:
        base = BARRED_DAY_PLAIN_ITERATIONS
    else:
        base = DEFAULT_ITERATIONS
    if stop_count > BARRED_DAY_STOPS:
        return min(
            LARGE_DAY_ITERATIONS,
            base + ITERATIONS_PER_STOP * (stop_count - BARRED_DAY_STOPS),
        )
    return base


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

    def __init__(self, iterations: int | None = None, seed: int = SEED) -> None:
        # `None` is the production mode: the budget follows the day's size
        # (`iterations_for`). A number pins it, which is how the tests and the
        # benchmarks hold one instance still.
        self._iterations = iterations
        self._seed = seed

    def _budget(self, request: RouteRequest) -> int:
        if self._iterations is not None:
            return self._iterations
        retry = getattr(self, "_retry_budget", None)
        if retry is not None:
            self._retry_budget = None
            return retry
        windowed = any(stop.window is not None for stop in request.stops)
        return iterations_for(len(request.stops), windowed=windowed)

    def plan(self, request: RouteRequest) -> RoutePlan:
        constraints = request.constraints
        if constraints.speed_kmh <= 0:
            raise ValueError("the average speed must be positive")
        if not request.stops:
            return _build_plan([], request, self.name)

        priorities = [stop for stop in request.stops if stop.priority]
        ordinary = [stop for stop in request.stops if not stop.priority]
        groups = [group for group in (priorities, ordinary) if group]

        planned = self._plan_phases(request, groups, with_windows=True)
        if planned is None:
            # A window the day cannot meet has no plan under it, so the day is
            # planned with the windows DROPPED and the core reports every
            # violation honestly - it never drops a stop, and the walk still
            # says what was late. BUG-280 measured what this buys: the hardest
            # days (windows + priorities + a break) used to fall back to the
            # plain heuristic, whose 2-opt spent minutes at 150 stops; with the
            # window-dropped solve the engine returns a PyVRP-quality order in
            # about a second AND the day's violations are still reported.
            self._retry_budget = max(
                RETRY_MIN_ITERATIONS, int(self._budget(request) * RETRY_BUDGET_SHARE)
            )
            planned = self._plan_phases(request, groups, with_windows=False)
        if planned is None:
            return HeuristicEngine().plan(request)
        return _build_plan(planned, request, self.name, None)

    def _plan_phases(
        self,
        request: RouteRequest,
        groups: list[list[RouteStop]],
        *,
        with_windows: bool,
    ) -> list[RouteStop] | None:
        """The two phases of the day, in order, or `None` when a phase cannot
        be planned feasibly. With `with_windows` off the phases are solved
        without the day's time windows, which is what the engine retries with
        when the windowed day has no feasible plan."""
        constraints = request.constraints
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
                with_windows=with_windows,
            )
            if order is None:
                return None
            orders.append(order)
            if not last:
                pins[index + 1], pins_point[index + 1] = _departure_pin(order, request)
        return [stop for order in orders for stop in order]

    def _solve_group(
        self,
        stops: list[RouteStop],
        request: RouteRequest,
        *,
        start_s: int,
        start_point: tuple[float, float],
        with_windows: bool = True,
    ) -> list[RouteStop] | None:
        """Solves one phase of the day and returns its order.

        The phase starts at `start_point` - the day's depot, or where the
        previous phase left the van - and at `start_s`, the hand-over second
        the departure is pinned to. With `with_windows` off the clients carry
        open windows, which is the retry the engine makes when the windowed
        phase has no feasible plan. Returns `None` when PyVRP cannot plan the
        phase feasibly at all, which falls back to the heuristic for the
        whole day.
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
            window = stop.window if with_windows else None
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
            MaxIterations(self._budget(request)),
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
