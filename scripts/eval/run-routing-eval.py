"""The routing evaluation set's runner: measures every engine on every instance.

Reads the committed set (packages/eval/routing/manifest) and writes, per
instance, the order each engine produced, the day the core timed for it, and the
wall time the engine took (packages/eval/routing/results). The CI checker
(scripts/eval/check-routing-eval.mjs) re-derives the numbers from the matrix and
enforces the targets, so nothing here is trusted just because it was written.

The engines:
  ours          the production path: app.routing.get_engine() (PyVRPEngine behind
                the seam, MAX_ITERATIONS 250, seed 0 - ADR-009), planning through
                app.solver with the core's own _build_plan.
  pyvrp-long    the SAME two-phase PyVRP model the production engine builds
                (the helpers of app.solver, the same matrices and windows), with
                the stopping criterion a long MaxRuntime and a different seed.
  ortools       OR-Tools' VRP solver (PATH_CHEAPEST_ARC then a local search) with
                the same one-vehicle model and the same time budget.

Every order - whoever produced it - is timed by the core's own `_build_plan`
(the break placed by `_schedule`'s scoring, the windows and the capacity read the
way production reads them), so all engines are measured with one stick. The road
matrix is injected at the documented seam of app.routing (`_distance_m` and
`_travel_seconds`, patched in app.routing and app.solver where they were imported
by value); with the matrix in place the production path is otherwise untouched.

Usage:
  uv run --project services/api --extra eval \\
    python scripts/eval/run-routing-eval.py [--budget-seconds 15] [--only 150]

BUDGET SECONDS is each baseline engine's time budget; the runner reports the
median and p95 wall time of `ours`, which is the number the CI checker enforces
against the 3-second bar at 150 stops.
"""

from __future__ import annotations

import argparse
import json
import statistics
import sys
import time
from datetime import UTC, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parents[2]
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, str(REPO / "services" / "api"))

import gzip  # noqa: E402

import pyvrp  # noqa: E402
from app import routing as routing_module  # noqa: E402
from app import solver as solver_module  # noqa: E402
from app.routing import (  # noqa: E402
    BreakConstraint,
    RouteRequest,
    RouteStop,
    RunConstraints,
    TimeWindow,
    _build_plan,
    get_engine,
)
from app.solver import (  # noqa: E402
    UNBOUNDED,
    Client,
    Depot,
    Location,
    ProblemData,
    VehicleType,
    _aware,
    _departure_pin,
    _matrices,
    _rel_earliest,
    _rel_latest,
    _service_seconds,
)
from pyvrp._pyvrp import ActivityType  # noqa: E402
from pyvrp.solve import solve  # noqa: E402
from pyvrp.stop import MaxIterations, MaxRuntime  # noqa: E402

MANIFEST = REPO / "packages" / "eval" / "routing" / "manifest"
RESULTS = REPO / "packages" / "eval" / "routing" / "results"
# New Zealand daylight time in November: the eval days are fixed to one clock.
NZDT = timezone(timedelta(hours=13))
BASELINE_SEED = 20261109
LONG_ITERATIONS = 100_000


# ---------------------------------------------------------------------------
# the set
# ---------------------------------------------------------------------------


def load_matrix() -> tuple[list[list[int]], list[list[int]], int]:
    """The road matrix from the committed gzip: metres and seconds per pair."""
    import csv

    raw = gzip.decompress((MANIFEST / "road-matrix.csv.gz").read_bytes()).decode("utf-8")
    meta = json.loads((MANIFEST / "road-matrix.meta.json").read_text(encoding="utf-8"))
    n = meta["stop_count"]
    metres = [[0] * n for _ in range(n)]
    seconds = [[0] * n for _ in range(n)]
    for row in csv.reader(raw.splitlines()):
        if not row:
            continue
        i, j, metres_ij, seconds_ij = (int(value) for value in row)
        metres[i][j] = metres_ij
        seconds[i][j] = seconds_ij
    return metres, seconds, n


class Matrix:
    """The injected road matrix, looked up by coordinate pair."""

    def __init__(self, metres: list[list[int]], seconds: list[list[int]]) -> None:
        self.metres = metres
        self.seconds = seconds
        self._last: tuple[int, int] = (0, 0)

    def install(self) -> None:
        """The documented seam: the core and the solver read distance and travel
        time through these two functions, so the road matrix drives the real
        production path (the tests and CI have no Valhalla)."""
        matrix = self

        def _distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
            i, j = matrix.lookup(lat1, lon1), matrix.lookup(lat2, lon2)
            matrix._last = (i, j)
            return float(matrix.metres[i][j])

        def _travel_seconds(distance_m: float, speed_kmh: float) -> float:
            i, j = matrix._last
            return float(matrix.seconds[i][j])

        routing_module._distance_m = _distance_m  # type: ignore[assignment]
        routing_module._travel_seconds = _travel_seconds  # type: ignore[assignment]
        solver_module._distance_m = _distance_m  # type: ignore[assignment]
        solver_module._travel_seconds = _travel_seconds  # type: ignore[assignment]

    def lookup(self, lat: float, lon: float) -> int:
        key = (round(lat, 7), round(lon, 7))
        index = self._index.get(key)
        if index is None:
            raise KeyError(f"the stop ({lat}, {lon}) is not in the pool the matrix was built for")
        return index

    def index_pool(self, pool: list[dict[str, Any]]) -> None:
        self._index = {(round(s["lat"], 7), round(s["lon"], 7)): s["i"] for s in pool}


def build_request(instance: dict[str, Any], pool: list[dict[str, Any]]) -> RouteRequest:
    by_index = {stop["i"]: stop for stop in pool}
    depot = by_index[instance["depot"]["i"]]
    finish = by_index[instance["finish"]["i"]] if instance["finish"] else None
    start = datetime.fromtimestamp(instance["start_at_epoch_s"], tz=UTC).astimezone(NZDT)
    stops = []
    for entry in instance["stops"]:
        stop = by_index[entry["i"]]
        window = None
        if entry["window"]:
            window = TimeWindow(
                start=datetime.fromtimestamp(entry["window"][0], tz=UTC).astimezone(NZDT),
                end=datetime.fromtimestamp(entry["window"][1], tz=UTC).astimezone(NZDT),
            )
        stops.append(
            RouteStop(
                id=_stop_uuid(instance["id"], entry["i"]),
                lat=stop["lat"],
                lon=stop["lon"],
                priority=entry["priority"],
                parcels=entry["parcels"],
                service_time_s=entry["service_time_s"],
                window=window,
            )
        )
    break_constraint = None
    if instance["break"]:
        break_constraint = BreakConstraint(
            earliest=datetime.fromtimestamp(instance["break"]["earliest_epoch_s"], tz=UTC).astimezone(NZDT),
            latest=datetime.fromtimestamp(instance["break"]["latest_epoch_s"], tz=UTC).astimezone(NZDT),
            minutes=instance["break"]["minutes"],
        )
    return RouteRequest(
        stops=tuple(stops),
        constraints=RunConstraints(
            depot_lat=depot["lat"],
            depot_lon=depot["lon"],
            start_at=start,
            capacity_parcels=instance["capacity_parcels"],
            speed_kmh=instance["speed_kmh"],
            service_time_s=instance["service_time_s"],
            break_constraint=break_constraint,
            finish_lat=finish["lat"] if finish else None,
            finish_lon=finish["lon"] if finish else None,
        ),
    )


# The order a runner reports is a list of POOL indices. The mapping from a
# planned stop to its pool index is by the stop's own identity (the uuid the
# request carries), never by its coordinates: two pool stops can share a point
# (two units of one building), and a coordinate lookup would hand back the wrong
# door. Built once per instance.
_IDENTITY: dict[Any, dict[Any, int]] = {}


def identity_of(instance_id: str, entry_indices: list[int]) -> dict[Any, int]:
    if instance_id not in _IDENTITY:
        _IDENTITY[instance_id] = {
            _stop_uuid(instance_id, index): index for index in entry_indices
        }
    return _IDENTITY[instance_id]


def order_from_stops(instance_id: str, stops) -> list[int]:
    """The pool indices of a planned order, by the stops' own identity.

    A `RouteStop` carries its `id`; the core's `PlannedStop` carries the same
    uuid as `stop_id`. Either shape maps back to the pool index the request
    gave it - never to a coordinate, because two pool stops can share a point
    (two units of one building) and a coordinate lookup would hand back the
    wrong door."""
    identity = identity_of(instance_id, [entry["i"] for entry in _INSTANCE_STOPS[instance_id]])
    order = []
    for stop in stops:
        stop_id = stop.id if hasattr(stop, "id") else stop.stop_id
        order.append(identity[stop_id])
    return order


_INSTANCE_STOPS: dict[str, list[dict[str, Any]]] = {}


def _stop_uuid(instance_id: str, pool_index: int):
    import uuid

    return uuid.uuid5(uuid.NAMESPACE_URL, f"routing-eval/{instance_id}/{pool_index}")


# ---------------------------------------------------------------------------
# the engines
# ---------------------------------------------------------------------------


def run_ours(request: RouteRequest, instance_id: str) -> list[int]:
    """The production engine: the order it returns, as pool indices."""
    engine = get_engine()
    plan = engine.plan(request)
    return order_from_stops(instance_id, plan.stops)


def run_pyvrp_long(request: RouteRequest, instance_id: str, budget_s: float) -> list[int]:
    """The same two-phase PyVRP model the production engine builds, with a long
    budget: the departure hand-over, the pinned starts and the windows come from
    app.solver's own helpers, so only the stopping criterion differs."""
    constraints = request.constraints
    if not request.stops:
        return []
    priorities = [stop for stop in request.stops if stop.priority]
    ordinary = [stop for stop in request.stops if not stop.priority]
    groups = [group for group in (priorities, ordinary) if group]
    pins = [0] * len(groups)
    pins_point = [(constraints.depot_lat, constraints.depot_lon)] * len(groups)
    orders: list[list] = []
    for index, group in enumerate(groups):
        last = index == len(groups) - 1
        order = _solve_group_long(group, request, start_s=pins[index], start_point=pins_point[index], budget_s=budget_s)
        if order is None:
            return []
        orders.append(order)
        if not last:
            pins[index + 1], pins_point[index + 1] = _departure_pin(order, request)
    flat = [stop for order in orders for stop in order]
    return order_from_stops(instance_id, flat)


def _solve_group_long(stops: list, request: RouteRequest, *, start_s: int, start_point: tuple[float, float], budget_s: float):
    """app.solver.PyVRPEngine._solve_group's model, with MaxRuntime as the stop."""
    constraints = request.constraints
    start_at = _aware(constraints.start_at)
    finish_lat = constraints.finish_lat if constraints.finish_lat is not None else constraints.depot_lat
    finish_lon = constraints.finish_lon if constraints.finish_lon is not None else constraints.depot_lon
    capacity = constraints.capacity_parcels
    points: list[tuple[float, float]] = [start_point, (finish_lat, finish_lon)]
    points.extend((stop.lat, stop.lon) for stop in stops)
    locations = [Location(x=lon, y=lat) for lat, lon in points]
    distances, durations = _matrices(points, constraints.speed_kmh)
    clients = [
        Client(
            location=2 + index,
            delivery=[stop.parcels] if capacity is not None else [],
            service_duration=_service_seconds(stop, constraints),
            tw_early=_rel_earliest(stop.window.start if stop.window else None, start_at),
            tw_late=_rel_latest(stop.window.end if stop.window else None, start_at),
            required=True,
        )
        for index, stop in enumerate(stops)
    ]
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
        [distances],
        [durations],
        [],
        [],
    )
    result = solve(
        data,
        MaxRuntime(budget_s),
        seed=BASELINE_SEED,
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


def run_ortools(request: RouteRequest, instance_id: str, budget_s: float) -> list[int] | None:
    """OR-Tools' VRP solver: one vehicle, capacity, time dimension, the same
    long budget. Returns the order as pool indices, or None when it could not
    plan the day feasibly."""
    try:
        from ortools.constraint_solver import pywrapcp, routing_enums_pb2
    except ImportError:
        print("ortools is not installed (uv run --project services/api --extra eval)",
              file=sys.stderr)
        return None

    constraints = request.constraints
    stops = list(request.stops)
    if not stops:
        return []
    points = [(constraints.depot_lat, constraints.depot_lon)]
    points.extend((stop.lat, stop.lon) for stop in stops)
    finish = (constraints.finish_lat, constraints.finish_lon) if constraints.finish_lat is not None else None
    if finish is not None:
        points.append(finish)
    size = len(points)
    metres, seconds, _ = METRIX[0], METRIX[1], METRIX[2]

    def travel(i: int, j: int) -> int:
        a, b = MATRIX.lookup(*points[i]), MATRIX.lookup(*points[j])
        return seconds[a][b]

    starts = [0]
    ends = [size - 1] if finish is not None else [0]
    manager = pywrapcp.RoutingIndexManager(size, 1, starts, ends)
    routing = pywrapcp.RoutingModel(manager)
    # one distance/duration arc per ordered pair
    def duration_callback(from_index: int, to_index: int) -> int:
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return travel(from_node, to_node)

    duration_index = routing.RegisterTransitCallback(duration_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(duration_index)
    routing.AddDimension(duration_index, 10 ** 7, 10 ** 7, True, "time")
    time_dimension = routing.GetDimensionOrDie("time")
    start_at = _aware(constraints.start_at)
    horizon = int(instance_horizon(request))
    time_dimension.CumulVar(manager.NodeToIndex(0)).SetRange(0, 0)
    for node, stop in enumerate(stops, start=1):
        index = manager.NodeToIndex(node)
        service = _service_seconds(stop, constraints)
        time_dimension.SlackVar(index).SetRange(0, horizon)
        if stop.window is not None:
            early = max(0, int((_aware(stop.window.start) - start_at).total_seconds()))
            late = int((_aware(stop.window.end) - start_at).total_seconds())
            time_dimension.CumulVar(index).SetRange(early, late + service)
        else:
            time_dimension.CumulVar(index).SetRange(0, horizon)
    if constraints.capacity_parcels is not None:
        def demand_callback(from_index: int) -> int:
            node = manager.IndexToNode(from_index)
            return stops[node - 1].parcels if 1 <= node <= len(stops) else 0

        demand_index = routing.RegisterUnaryTransitCallback(demand_callback)
        routing.AddDimensionWithVehicleCapacity(
            demand_index, 0, [constraints.capacity_parcels], True, "capacity"
        )
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_parameters.time_limit.seconds = int(budget_s)
    solution = routing.SolveWithParameters(search_parameters)
    if solution is None:
        return None
    order: list[int] = []
    index = routing.Start(0)
    while not routing.IsEnd(index):
        node = manager.IndexToNode(index)
        if 1 <= node <= len(stops):
            order.append(node - 1)
        index = solution.Value(routing.NextVar(index))
    return order_from_stops(instance_id, [stops[i] for i in order])


def instance_horizon(request: RouteRequest) -> int:
    """A horizon generous enough to hold the day: the day length plus the
    service time of every stop, so an impossible window is not the horizon's."""
    return 9 * 3600 + sum(_service_seconds(stop, request.constraints) for stop in request.stops)


# ---------------------------------------------------------------------------
# scoring: the one stick
# ---------------------------------------------------------------------------

METRIX: tuple[list[list[int]], list[list[int]], int] = ([], [], 0)
MATRIX = Matrix([], [])
_INDEX_TO_POINT: dict[int, tuple[float, float]] = {}
_POINT_TO_INDEX: dict[tuple[float, float], int] = {}


def index_for(lat: float, lon: float) -> int:
    index = _POINT_TO_INDEX.get((round(lat, 7), round(lon, 7)))
    if index is None:
        raise KeyError(f"the pool has no stop at ({lat}, {lon})")
    return index


def _index_of_stop(stop) -> int:
    return index_for(stop.lat, stop.lon)


def score_order(
    order: list[int], engine_name: str, request: RouteRequest, stops_by_index: dict[int, Any]
) -> dict[str, Any]:
    """Times one order with the core's own _build_plan - the same measuring
    stick for every engine - and reports the day, the travel and the violations."""
    stops = [stops_by_index[i] for i in order]
    plan = _build_plan(stops, request, engine_name, None)
    # the priority rule: every priority stop must come before every ordinary one
    priority_violations = 0
    seen_ordinary = False
    for stop in stops:
        if stop.priority:
            if seen_ordinary:
                priority_violations += 1
        else:
            seen_ordinary = True
    return {
        "order": order,
        "distance_m": round(plan.total_distance_m, 3),
        "duration_s": round(plan.total_duration_s, 3),
        "window_violations": plan.window_violations,
        "break_violation": plan.break_violation,
        "break_position": break_position_of(plan),
        "break_start_at": plan.break_start_at.isoformat() if plan.break_start_at else None,
        "priority_violations": priority_violations,
        "over_capacity": plan.over_capacity,
        "engine": plan.engine,
    }


def break_position_of(plan) -> int | None:
    """Where the core placed the break, read back from the timed plan: the walk
    resumes at the first stop whose arrival is at or after the break ends, so
    the break stands after that many stops."""
    if plan.break_start_at is None:
        return None
    for index, stop in enumerate(plan.stops):
        if stop.arrival_at >= plan.break_end_at:
            return index
    return len(plan.stops)


def travel_of(request: RouteRequest, order: list[int]) -> tuple[int, int]:
    """The travel time and distance of an order, from the road matrix: the
    objective the engines are compared on, independent of who produced the
    order (the waiting and the service time are the day's, not the route's)."""
    constraints = request.constraints
    finish_point = (
        (constraints.finish_lat, constraints.finish_lon)
        if constraints.finish_lat is not None
        else (constraints.depot_lat, constraints.depot_lon)
    )
    points = [(constraints.depot_lat, constraints.depot_lon)]
    points.extend(index_for_point(i) for i in order)
    points.append(finish_point)
    total_m = 0
    total_s = 0
    for a, b in zip(points, points[1:]):
        i, j = MATRIX.lookup(*a), MATRIX.lookup(*b)
        total_m += MATRIX.metres[i][j]
        total_s += MATRIX.seconds[i][j]
    return total_m, total_s


_POINT_OF_INDEX: dict[int, tuple[float, float]] = {}


def index_for_point(index: int) -> tuple[float, float]:
    return _POINT_OF_INDEX[index]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--budget-seconds", type=float, default=15.0)
    parser.add_argument("--only", default=None, help="run only instances whose id contains this")
    parser.add_argument("--engines", default="ours,pyvrp-long,ortools")
    parser.add_argument("--results-dir", default=None,
                        help="where the result files go (default: the committed results directory)")
    parser.add_argument("--check-targets", action="store_true",
                        help="fail when the directive's solve-time target is breached (the CI lane)")
    args = parser.parse_args()

    results_dir = Path(args.results_dir) if args.results_dir else RESULTS
    pool = json.loads((MANIFEST / "pool.json").read_text(encoding="utf-8"))["stops"]
    for stop in pool:
        _POINT_OF_INDEX[stop["i"]] = (stop["lat"], stop["lon"])
        _POINT_TO_INDEX[(round(stop["lat"], 7), round(stop["lon"], 7))] = stop["i"]
    metres, seconds, count = load_matrix()
    global METRIX, MATRIX
    METRIX = (metres, seconds, count)
    MATRIX = Matrix(metres, seconds)
    MATRIX.index_pool(pool)
    MATRIX.install()
    print(f"run-routing-eval: pool {len(pool)} stops, matrix {count}x{count}")

    names = [line.strip() for line in (MANIFEST / "instances.jsonl").read_text(encoding="utf-8").splitlines() if line.strip()]
    results_dir.mkdir(parents=True, exist_ok=True)
    engines = [name.strip() for name in args.engines.split(",")]
    durations_150: list[float] = []
    summary_rows = []
    for name in names:
        entry = json.loads(name)
        if args.only and f"-{args.only}-" not in entry["id"] and not entry["id"].endswith(f"-{args.only}"):
            continue
        instance = json.loads((MANIFEST / "instances" / f"{entry['id']}.json").read_text(encoding="utf-8"))
        _INSTANCE_STOPS[instance["id"]] = instance["stops"]
        request = build_request(instance, pool)
        stops_by_index = {
            entry_inner["i"]: stop
            for entry_inner, stop in zip(instance["stops"], request.stops)
        }
        result: dict[str, Any] = {
            "id": instance["id"],
            "size": instance["size"],
            "variant": instance["variant"],
            "seed": instance["seed"],
            "area": instance["area"],
            "stop_count": len(instance["stops"]),
            "windows": entry["windows"],
            "priorities": entry["priorities"],
            "with_break": entry["with_break"],
            "with_finish": entry["with_finish"],
            "engines": {},
        }
        wall_by_engine: dict[str, float] = {}
        for engine in engines:
            started = time.perf_counter()
            if engine == "ours":
                order = run_ours(request, instance["id"])
            elif engine == "pyvrp-long":
                order = run_pyvrp_long(request, instance["id"], args.budget_seconds)
            elif engine == "ortools":
                order = run_ortools(request, instance["id"], args.budget_seconds)
            else:
                raise SystemExit(f"unknown engine {engine}")
            wall = time.perf_counter() - started
            wall_by_engine[engine] = round(wall, 4)
            if order is None or not order:
                result["engines"][engine] = {"order": [], "planned": False}
                continue
            scored = score_order(order, engine, request, stops_by_index)
            travel_m, travel_s = travel_of(request, order)
            scored["travel_m"] = travel_m
            scored["travel_s"] = travel_s
            scored["wall_s"] = round(wall, 4)
            scored["planned"] = True
            result["engines"][engine] = scored
        result["wall_s"] = wall_by_engine
        feasible = [
            name_
            for name_, value in result["engines"].items()
            if value.get("planned")
            and value["window_violations"] == 0
            and not value["break_violation"]
            and value["priority_violations"] == 0
            and not value["over_capacity"]
        ]
        result["feasible_engines"] = feasible
        travels = [
            value["travel_s"]
            for value in result["engines"].values()
            if value.get("planned")
        ]
        result["best_travel_s"] = min(travels) if travels else None
        (results_dir / f"{instance['id']}.json").write_text(json.dumps(result, indent=1), encoding="utf-8")
        ours = result["engines"].get("ours", {})
        if instance["size"] == 150 and ours.get("planned"):
            durations_150.append(ours["wall_s"])
        summary_rows.append(instance["id"])
        ours_travel = ours.get("travel_s")
        best = result["best_travel_s"]
        ratio = f"{ours_travel / best:.4f}" if ours_travel and best else "-"
        print(f"  {instance['id']}: ours {ratio}x of the best, "
              f"feasible {feasible or 'NONE'}, wall {wall_by_engine.get('ours')}s")

    p95 = None
    if durations_150:
        p95 = statistics.quantiles(durations_150, n=20)[-1]
        print(f"run-routing-eval: p95 solve time at 150 stops: {p95:.3f}s "
              f"over {len(durations_150)} instances (median "
              f"{statistics.median(durations_150):.3f}s)")
    print(f"run-routing-eval: wrote {len(summary_rows)} result files to {results_dir}")
    if args.check_targets and p95 is not None and p95 > 3.0:
        print(f"run-routing-eval: the p95 solve time {p95:.3f}s is over the 3-second bar", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
