"""The solver benchmark: what the engines do to a reconstructed 174-stop day.

The founder brief asks for a benchmark through the seam, not against a toy
dataset: a deterministic Christchurch run with 174 stops, spread over the
suburbs with realistic offsets of the day's rhythm (one quarter of the stops
with an open-from window, one in twenty a priority, one in five a longer
service, a 30-minute break pillar), compared across

* the deterministic heuristic (`heuristic-nn-2opt`), the engine the API had
  before the solver arrived,
* the production configuration, PyVRP with 250 iterations (ADR-009), the
  count that keeps the five-second budget for 200 stops,
* a 1000-iteration reference run, to say honestly what the shorter budget
  costs the day's length.

The day must be one PyVRP can actually plan: the generator walks seeds from
`--seed` upward, and stops with the first seed the production engine stays
on-engine for (a day it falls back on would only benchmark the fallback).
The recipe is a reconstruction from a fixed seed, not captured telemetry;
the dataset section of the result carries it exactly.

Every configuration is timed three times, because this machine has
time-correlated slow regimes; the summary therefore reports the minimum and
the median, and the day length itself is deterministic (checked, since both
engines are seeded). A 200-stop budget check pins the production
configuration against `docs/plan/CONSTRAINTS.md`'s budget.

The result is written as JSON, by default to
`docs/evidence/backend-solver/benchmark.json`.

Usage:

    uv run --directory services/api python -m benchmarks.benchmark_solver
"""

from __future__ import annotations

import argparse
import email.message
import json
import platform
import statistics
import time
import uuid
from collections import defaultdict
from datetime import UTC, datetime, timedelta
from importlib.metadata import PackageNotFoundError, metadata
from pathlib import Path
from typing import Any, cast
from zoneinfo import ZoneInfo

import numpy as np

from app.routing import (
    BreakConstraint,
    HeuristicEngine,
    RouteEngine,
    RouteRequest,
    RouteStop,
    RunConstraints,
    TimeWindow,
)
from app.solver import SEED as SOLVER_SEED
from app.solver import PyVRPEngine

BENCHMARK_SEED = 20261022
"""The first seed of the day generator: each next seed is tried until the
solver stays on-engine (a day PyVRP cannot plan would only benchmark the
fallback). The seed that plans is recorded."""

STOP_NAMESPACE = uuid.uuid5(uuid.NAMESPACE_URL, "courier-copilot/benchmark")
"""The namespace of the deterministic stop identifiers."""

AUCKLAND = ZoneInfo("Pacific/Auckland")
DEPARTURE = datetime(2026, 10, 22, 7, 30, tzinfo=AUCKLAND)

SERVICE_LENGTHS: tuple[tuple[int, ...], tuple[float, ...]] = (
    (60, 120, 180, 240),
    (0.3, 0.4, 0.2, 0.1),
)
"""At-the-door minutes and their mix: most drops are a letter, some are bulky."""

ANCHORS: tuple[tuple[str, float, float], ...] = (
    # (label, latitude, longitude) of the suburb-centre round-off of the day.
    ("Christchurch CBD", -43.5320, 172.6362),
    ("Riccarton", -43.5213, 172.5944),
    ("Fendalton", -43.5183, 172.5806),
    ("St Albans", -43.5097, 172.6250),
    ("Bishopdale", -43.4833, 172.6000),
    ("Redwood", -43.4667, 172.6000),
    ("Linwood", -43.5394, 172.6583),
    ("Woolston", -43.5528, 172.6639),
    ("Sydenham", -43.5486, 172.6222),
    ("Beckenham", -43.5694, 172.6167),
    ("Addington", -43.5400, 172.6000),
    ("Halswell", -43.5833, 172.5833),
)

DEPOT = (ANCHORS[0][1], ANCHORS[0][2])
BUDGET_LIMIT_S = 5.0
"""The written budget: a route of 200 stops plans in at most five seconds."""


def _build_grid_day(stops: int) -> RouteRequest:
    """The suite's budget day: a 20-per-row grid without windows or a break.

    It is the construction `tests/test_solver.py` times for the budget, so
    the evidence here and the gate say the same thing.
    """
    route_stops = tuple(
        RouteStop(
            id=uuid.uuid5(STOP_NAMESPACE, f"grid/{index}"),
            lat=-43.5330 + (index % 20) * 0.004,
            lon=172.6300 + (index // 20) * 0.004,
            parcels=1,
        )
        for index in range(stops)
    )
    return RouteRequest(
        stops=route_stops,
        constraints=RunConstraints(
            depot_lat=-43.5330,
            depot_lon=172.6300,
            start_at=DEPARTURE,
            speed_kmh=30.0,
        ),
    )


def _service_lengths(count: int, rng: np.random.Generator) -> np.ndarray:
    """At-the-door minutes, drawn from the dataset's service mix."""
    return rng.choice(SERVICE_LENGTHS[0], size=count, p=SERVICE_LENGTHS[1])


def _build_day(
    stops: int,
    seed: int,
    *,
    with_break: bool,
) -> RouteRequest:
    """The reconstructed day: suburb anchors, rhythm, windows and the break."""
    rng = np.random.default_rng(seed)
    anchor_of = rng.integers(len(ANCHORS), size=stops)
    jitter_lat = rng.normal(0.0, 0.004, stops)
    jitter_lon = rng.normal(0.0, 0.004, stops)
    service = _service_lengths(stops, rng)
    windowed = rng.random(stops) < 0.25
    opens_at = rng.integers(90, 330, stops)
    ends_given = rng.random(stops) < 0.6
    priority = rng.random(stops) < 0.07
    parcels = rng.integers(1, 3, stops)

    route_stops = []
    for index in range(stops):
        label, anchor_lat, anchor_lon = ANCHORS[anchor_of[index]]
        window = None
        if windowed[index]:
            opens = DEPARTURE + timedelta(minutes=int(opens_at[index]))
            end = opens + timedelta(hours=3) if ends_given[index] else None
            window = TimeWindow(start=opens, end=end)
        route_stops.append(
            RouteStop(
                id=uuid.uuid5(STOP_NAMESPACE, f"stop/{index}"),
                lat=float(anchor_lat) + float(jitter_lat[index]),
                lon=float(anchor_lon) + float(jitter_lon[index]),
                priority=bool(priority[index]),
                parcels=int(parcels[index]),
                service_time_s=int(service[index]),
                window=window,
            )
        )

    break_constraint = (
        BreakConstraint(
            earliest=DEPARTURE + timedelta(minutes=270),
            latest=DEPARTURE + timedelta(minutes=540),
            minutes=30,
        )
        if with_break
        else None
    )
    constraints = RunConstraints(
        depot_lat=DEPOT[0],
        depot_lon=DEPOT[1],
        start_at=DEPARTURE,
        capacity_parcels=int(parcels.sum()) + 10,
        speed_kmh=30.0,
        break_constraint=break_constraint,
        finish_lat=None,
        finish_lon=None,
    )
    return RouteRequest(stops=tuple(route_stops), constraints=constraints)


def _order_signature(plan: Any) -> str:
    """The plan's order, as a short stable string (the same day walks it)."""
    return ",".join(str(stop.stop_id)[-6:] for stop in plan.stops)


def _measure(label: str, engine: RouteEngine, request: RouteRequest) -> dict[str, Any]:
    """One timed plan through the seam, with the plan's own quality report."""
    started = time.perf_counter()
    plan = engine.plan(request)
    seconds = round(time.perf_counter() - started, 3)
    return {
        "config": label,
        "seconds": seconds,
        "day_minutes": round(plan.total_duration_s / 60, 1),
        "day_km": round(plan.total_distance_m / 1000, 2),
        "window_violations": plan.window_violations,
        "over_capacity": plan.over_capacity,
        "break_violation": plan.break_violation,
        "engine": plan.engine,
        "ordered_stops": len(plan.stops),
        "order": _order_signature(plan),
    }


def _summarise_config(runs: list[dict[str, Any]]) -> dict[str, Any]:
    """Min and median over the timed attempts, plus a determinism check."""
    timings = [run["seconds"] for run in runs]
    orders = {run["order"] for run in runs}
    if len(orders) != 1:
        raise ValueError(f"{runs[0]['config']} is not deterministic across attempts")
    first = runs[0]
    return {
        "seconds_min": min(timings),
        "seconds_median": round(statistics.median(timings), 3),
        "day_minutes": first["day_minutes"],
        "day_km": first["day_km"],
        "window_violations": first["window_violations"],
        "over_capacity": first["over_capacity"],
        "break_violation": first["break_violation"],
        "engine": first["engine"],
        "deterministic": True,
    }


def _solver_facts() -> dict[str, Any]:
    """The installed solver: its version (for pinning) and its licence."""
    facts: dict[str, Any] = {"package": "pyvrp", "version": None, "license": "unknown"}
    try:
        fields = cast("email.message.Message", metadata("pyvrp"))
    except PackageNotFoundError:
        facts["license"] = "pyvrp is not installed"
        return facts
    facts["version"] = str(fields["Version"])
    declared = fields.get("License") or fields.get("License-Expression") or ""
    if declared:
        facts["license"] = str(declared)
        return facts
    classifiers = [
        classifier
        for classifier in (fields.get_all("Classifier") or [])
        if classifier.startswith("License ::")
    ]
    facts["license"] = "; ".join(classifiers) or "unknown"
    return facts


def main() -> None:
    """Runs the benchmark and writes the evidence JSON."""
    parser = argparse.ArgumentParser(description="Benchmarks the routing engines")
    parser.add_argument("--stops", type=int, default=174)
    parser.add_argument("--seed", type=int, default=BENCHMARK_SEED)
    parser.add_argument("--max-seed-tries", type=int, default=4)
    parser.add_argument("--attempts", type=int, default=3)
    parser.add_argument(
        "--out",
        type=Path,
        default=Path(__file__).resolve().parents[3] / "docs/evidence/backend-solver/benchmark.json",
    )
    args = parser.parse_args()

    day: RouteRequest
    for seed_used in range(args.seed, args.seed + args.max_seed_tries):
        candidate = _build_day(args.stops, seed_used, with_break=True)
        # A day the solver falls back on would only benchmark the fallback.
        if PyVRPEngine().plan(candidate).engine == "pyvrp":
            day = candidate
            break
    else:
        raise ValueError(
            f"seed {args.seed}..{args.seed + args.max_seed_tries - 1} has no feasible"
            " day: relax the dataset recipe"
        )
    total_parcels = sum(stop.parcels for stop in day.stops)
    dataset = {
        "kind": "reconstructed-from-a-seed (not captured telemetry)",
        "stops": args.stops,
        "seed": seed_used,
        "feasibility": "first seed from --seed upward that PyVRP plans on-engine",
        "depot": list(DEPOT),
        "suburb_anchors": [label for label, _, _ in ANCHORS],
        "anchor_jitter_deg": 0.004,
        "service_lengths_s": list(SERVICE_LENGTHS[0]),
        "service_mix": list(SERVICE_LENGTHS[1]),
        "windowed_share": 0.25,
        "window_open_from_minutes": [90, 330],
        "window_end_hours": 3,
        "priority_share": 0.07,
        "parcels_per_stop": [1, 2],
        "total_parcels": total_parcels,
        "capacity_parcels": day.constraints.capacity_parcels,
        "speed_kmh": day.constraints.speed_kmh,
        "break": {"from_minutes": 270, "to_minutes": 540, "minutes": 30},
        "departure": DEPARTURE.isoformat(),
    }

    configs: list[tuple[str, RouteEngine]] = [
        ("heuristic-nn-2opt", HeuristicEngine()),
        ("pyvrp-250", PyVRPEngine()),
        ("pyvrp-1000", PyVRPEngine(iterations=1000)),
    ]
    runs: list[dict[str, Any]] = []
    for _ in range(args.attempts):
        for label, engine in configs:
            runs.append(_measure(label, engine, day))

    budget_day = _build_grid_day(200)
    budget_engine = PyVRPEngine()
    runs.extend(
        _measure("pyvrp-250-budget-200", budget_engine, budget_day) for _ in range(args.attempts)
    )

    per_config: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for run in runs:
        per_config[run["config"]].append(run)
    summary = {label: _summarise_config(attempts) for label, attempts in per_config.items()}

    if summary["pyvrp-250-budget-200"]["engine"] != "pyvrp":
        raise ValueError("the budget day fell back to the heuristic: relax the dataset")

    production = summary["pyvrp-250"]
    reference = summary["pyvrp-1000"]
    heuristic = summary["heuristic-nn-2opt"]
    summary["quality_trade"] = {
        "production_vs_reference_day_minutes": round(
            production["day_minutes"] - reference["day_minutes"], 1
        ),
        "production_vs_heuristic_day_minutes": round(
            production["day_minutes"] - heuristic["day_minutes"], 1
        ),
    }

    result = {
        "measured_at": datetime.now(tz=UTC).isoformat(timespec="seconds"),
        "machine": {
            "platform": platform.platform(),
            "python": platform.python_version(),
            "numpy": np.__version__,
        },
        "solver": {
            **_solver_facts(),
            "seed": SOLVER_SEED,
            "production_iterations": 250,
            "reference_iterations": 1000,
        },
        "dataset": dataset,
        "runs": runs,
        "summary": summary,
        "budget": {
            "construction": "the suite's 200-stop grid day (no windows, no break)",
            "stops": 200,
            "limit_s": BUDGET_LIMIT_S,
            "median_s": summary["pyvrp-250-budget-200"]["seconds_median"],
            "within_budget": summary["pyvrp-250-budget-200"]["seconds_median"] < BUDGET_LIMIT_S,
        },
    }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {args.out}")
    for label in ("heuristic-nn-2opt", "pyvrp-250", "pyvrp-1000", "pyvrp-250-budget-200"):
        row = summary[label]
        print(
            f"{label:>22}: {row['seconds_min']:6.2f}-{row['seconds_median']:6.2f} s"
            f" | day {row['day_minutes']:7.1f} min"
            f" | {row['day_km']:6.1f} km"
            f" | violations {row['window_violations']}"
        )


if __name__ == "__main__":
    main()
