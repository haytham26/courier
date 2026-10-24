# ADR-009 — The routing solver: PyVRP 0.14.1 behind the `RouteEngine` seam, the break placed by the core

- **Status:** accepted
- **Date:** 2026-10-24
- **Decides:** D35 (the production solver for BUG-016/§C.4), the engine construction, the break
  model, the deterministic budget, the engine-name contract and the fallback ladder
- **Task:** the founder's backend queue item 1: "real routing solver behind the `RouteEngine` seam"
  (`C:\Users\DCL\Downloads\FINAL_BACKEND.md`)
- **Research:** `pyvrp` 0.14.1 docs (pyvrp.org) and the pinned installed sources
  (`services/api/.venv/Lib/site-packages/pyvrp/`: `_pyvrp.pyi`, `Model.py`, `constants.py`,
  `solve.py`), verified against the installed wheel by probes (2026-10-24)

## Context

The API carried a `RouteEngine` seam (`services/api/app/routing.py`) whose only implementation was
the deterministic nearest-neighbour/2-opt heuristic, and BUG-016 ("no routing engine") was open.
The heuristic plans legal-but-naive days: on a reconstructed 174-stop Christchurch day it takes
~50 s and still violates 17 stop windows, because its objective cannot weigh waiting against
driving. The founder queued a real solver: same seam, same core, better order.

Constraints that bound the choice from `docs/plan/CONSTRAINTS.md` and §19:

- the run stays offline-first and deterministic (the same stops and constraints give the same plan,
  asserted 50-in-a-row by the test suite);
- the performance budget "route of 200 stops ≤ 5 s" is enforced by a committed test and a benchmark
  in `docs/evidence/backend-solver/`; the bar is not weakened to fit a dependency;
- the API (and CI) runs on prebuilt Python 3.11 wheels — no engine that demands compilation,
  a Java/JS runtime or a Docker sidecar at request time;
- the licence must be recorded (§ of the quality gates: the licence inventory).

## Decision

### 1. The solver: PyVRP 0.14.1, pinned `>=0.14.1,<0.15`

| Candidate (research + probes) | Verdict |
|---|---|
| **PyVRP 0.14.1** | **chosen.** MIT; prebuilt 3.11 wheels; pure-matrix input (the engine keeps model freedom); hybrid genetic search among the strongest open VRP heuristics; seeded-deterministic under `MaxIterations`; actively maintained (0.14.1 = production line; 0.15 moves to Python ≥3.12 — see PyVRP issue #1206, hence the `<0.15` pin) |
| OR-Tools (CP-SAT / routing) | capable but a large native dependency, an objective/first-stop builder awkward for the time-window walk this core needs, and harder to keep deterministic and fast at 174-stop single-vehicle scale |
| VROOM | not a solver alone at this layer: it needs a matrix service in front of it, its strength (multi-vehicle) is dead weight for one van, and its runtime is the Docker/C++ sidecar CI cannot carry. VROOM stays on the matrix-leg list (below) |
| the heuristic (`heuristic-nn-2opt`) | stays as the fallback and the benchmark baseline: honest, offline, slow |

`pip show pyvrp` on the installed wheel: **License: MIT**, version 0.14.1 (also captured by
`benchmarks/benchmark_solver.py::_solver_facts` into the evidence JSON).

### 2. The construction: matrices built once, direct `ProblemData`, no `Model` objects

`app/solver.py::PyVRPEngine` builds the point list (start position, finish position — the courier's
finish or the depot when unset — then one point per stop), fills the distance/duration matrices
with the core's own `_distance_m`/`_travel_seconds` (the same maths the walk times the day with,
rounded **up**, so a solution PyVRP calls feasible stays feasible under the core's recomputation),
and hands a `ProblemData(locations, clients, depots, vehicle_types, [distances], [durations])`
to the free function `pyvrp.solve(data, MaxIterations(n), seed, collect_stats=False, display=False)`.

- Direct construction, not the `Model` helper: the probes measured 200-stop solves through `Model`
  creeping from ~1.6 s to ~7.5 s in-process — ~31 000 pybind11 `Edge` objects per build stress the
  GC generations (evidence: `creep_probe.py` run, timing flat when the same `ProblemData` was
  re-solved). Direct construction removed the object storm entirely.
- `Location(x=lon, y=lat)` only names the points; every real value lives in the matrices.
- One vehicle; `unit_distance_cost=0`, `unit_duration_cost=1` — the objective is the day's length,
  which is what the courier feels and what the budget is written on. (At uniform speed the drive
  seconds already track distance; the solver's order respects the windows instead of chasing
  shortest-arm.)
- Time windows map stop-for-stop: `TimeWindow` → `Client(tw_early, tw_late)`, relative to the day's
  start, ceil for the floor and floor for the ceiling so the mapping is conservative.
- `RunConstraints.capacity_parcels` maps to the delivery dimension of every client and the
  vehicle's capacity; when the run has no capacity the dimension is absent, and the day's
  `over_capacity` verdict is then the core's, incoming from the walk.

### 3. Priority stops: two phases, pinned to where the van really stands

Priority stops must stand at the front of the day. PyVRP 0.14.1 has no
visit-these-first lever that survives the walk, so the engine plans two tours: the priority stops'
own tour (departure pinned to the day's start), then the ordinary stops' tour, whose model
starts **at the hand-over point of the first tour** and whose departure is pinned exactly:
`VehicleType(..., tw_early=start_s, start_late=start_s)` pins the departure second against
`start_late`, and `Depot(tw_early=start_s, ...)` pins the depot side — verified against the
installed sources (`Model.py:500-513`, `VehicleType.__init__` signature).

The pin is computed by `_walk` once the first order is known: `_departure_pin` returns the
hand-over second **and the hand-over position** — the last stop, not the day's depot. The first
draft pinned the hand-over second only while phase-2's model still anchored itself at the depot;
the benchmark caught the mistake (PyVRP driven to +42 km of invisible legs) and the fix landed the
same day: the second phase's matrices start from the van's true position. Mid-task evidence:
`benchmark.json` before/after (`day 177.5 → 174.1 km` at 250 iterations, and the 3 residual window
violations → **0**).

### 4. The break of the day: not in the solver's model — the core places it

The break is a pause **inside the van**: the van stops where it stands, so plugging the break into
the solver's client set must make its arcs from others into it (and around it) cost what the van
is doing at that moment — which the solver cannot know. Both encodings were probed and failed:

- **zero-arcs** (free travel to/through the break): the drive the break splits *erases* from the
  objective. A two-stop mirror pair then ties ([B,A] on one day, [A,B] on another) and PyVRP picked
  the ordering the core read as +32 min of day instead of +30 — the +30-min break test failed.
- **an overcharged leave-arc** (max real leg into each successor): conservative, but the two-stop
  mirror still ties — any static value reproduces the tie, because a closed cycle's cost is
  direction-invariant.

The decision: **PyVRP solves the order break-free** (it sees the day's true objective, so touring
quality stays intact), and the routing core — the single source of truth for the schedule — places
the break. The core's greedy scan tries every gap between two stops and scores each as
(`window_violations + break_violation`, day length, earliest-gap-first), so the same day always
places the break the same way; `break_position` stays an explicit parameter for template days
where the courier has already said where the break goes. A solver-suggested gap of 0 or all-stops
is illegal for the core anyway (a break happens strictly between two stops), so no solver-side
placement information is lost.

Consequences: the day's legality is always the core's honest verdict (`break_violation`,
`window_violations`), the solver never reports a feasibility the walk cannot confirm, and the
break never distorts tour quality.

### 5. The budget: 250 iterations, seed 0

`MAX_ITERATIONS = 250`, `SEED = 0` — the solver runs deterministically, and the iteration budget
keeps the written bar safe on slow machines: the 200-stop grid day plans in 3.2–3.3 s here and
~2 s in a warm process, against the 5 s bar. The cost of the shorter run is recorded, not hidden:
on the 174-stop day the day's length is 814.8 min at 250 vs 807.0 min at 1000 (the benchmark's
`quality_trade` section holds the exact numbers; raising the iterations is a release lever via
the engine's constructor, never by editing the test).

### 6. The contract changes the rest of the system sees

- `RoutePlan.engine` is now `"pyvrp"` | `"heuristic-nn-2opt"` (plus the internal seed/baseline
  names `"heuristic-nn"` and `"template-lock"` used by `seed_plan`/`schedule_plan`).
- `COURIER_ROUTE_ENGINE` selects the release lever: `pyvrp` (default) or `heuristic-nn-2opt`; an
  unknown value raises; a missing PyVRP installs a `RuntimeWarning` and falls back.
- The break/finish fields (`break_start_at`, `break_end_at`, `break_violation`) and the reopt
  surface (`build_reopt_plan` → `ReoptResult.plan/finish_delta_s`) carry through unchanged from
  the core.
- Infeasible days (`Solution.is_feasible()` false on both phases) fall back to the heuristic,
  which reports the violations honestly; the fallback is visible in `RoutePlan.engine`.

### 7. Deliberate test changes (recorded, none weakened)

| Test (services/api/tests/test_routing.py) | Change |
|---|---|
| `test_the_engine_seam_returns_the_deterministic_engine` → `…_the_production_solver` | the seam test asserts `PyVRPEngine`/`"pyvrp"` |
| the route endpoint's unlocked-run assertion | `body["engine"]` now `"pyvrp"` |
| three `test_the_improvement_*` tests (window-preservation, no-longer-day, shorter-day) | pinned to `engine=HeuristicEngine()` — they assert the heuristic's internal invariants, which the solver is not obliged to imitate |

The solver's own 30 tests (`tests/test_solver.py`) are the specification: seam equality/determinism,
window service priority-first, service times, `UTC` naive start, break +30-min exactness, the
violation-honest day, reopt batching, the 174-stop reopt under 2 s, the fallback ladder and the
200-stop budget.

## Limitations (honest notes)

- The dataset of the benchmark is a **reconstruction from a seed** (12 Christchurch suburb
  anchors, realistic rhythm), not captured telemetry; its exact recipe is in the JSON.
- The two-phase frames price the *phase* tours, not the stitched day; the continuation legs the
  core walks are real, and phase-2 now starts at the true hand-over point, but phase-1's own
  return-to-anchor is still depot-framed. The drift is the ~2–3 % of tour distance the benchmark
  shows.
- The core's greedy break scan is O(n) schedule walks (double length-prefix) — at 174 stops
  ~2–3 s of the 4.7 s plan. On a 200-stop **break** day that pushes the plan past the budget;
  the budget test (and the benchmark's budget row) is the constructor without a break, per the
  constraint file. An incremental scan is queued as the follow-up (BUGS addendum this date).

## Verification

- `uv run --directory services/api pytest -q` — 190 passed, 1 skipped (the suite, three
  pytest-randomly orders).
- `ruff check .` / `mypy .` — clean (the `cast` on the pybind matrix lists is explicit, no
  ignore comments).
- `uv run --directory services/api python -m benchmarks.benchmark_solver` — the evidence JSON in
  `docs/evidence/backend-solver/benchmark.json` (engine, licences, dataset recipe, 12 timed runs,
  the quality trade, the budget row).
- The VROOM comparison leg is **not verified on this machine**: the Docker daemon never came up
  inside the 45-minute time-box (logged in the evidence README). The pinned command for the leg is
  recorded there; PyVRP's licence and version are verified from the wheel itself.
