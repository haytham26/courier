# Backend — the solver evidence (queue item 1: the real routing solver)

Date: 2026-10-24 · Branch: `feat/routing-solver` · ADR-009 · D35

## What the evidence is

| Artifact | What it says |
|---|---|
| `benchmark.json` | the solver benchmark: the reconstructed 174-stop Christchurch day (break + windows), 12 timed runs through the seam, the licence, the budget row |
| `services/api/benchmarks/benchmark_solver.py` | the harness itself: `uv run --directory services/api python -m benchmarks.benchmark_solver` regenerates the day and the JSON (seeded, the seed recorded inside) |
| `creep_probe.py` | the raw GC-creep probe ADR-009 §2 cites: direct `ProblemData` builds flat (~0.37 s), repeated long (1000-iter) solves creep in one process (1.53→5.94 s), production 250-iter attempts flat — with its 2026-10-24 output in the header |

## The headline table (from `benchmark.json`, 3 timed attempts per config)

| Config | Wall clock (min/median) | Day length | Distance | Stop windows violated |
|---|---|---|---|---|
| `heuristic-nn-2opt` (the pre-solver engine) | 49.58 / 53.87 s | 817.3 min | 135.4 km | **17** |
| `pyvrp-250` (production, ADR-009) | 4.67 / 4.70 s | 814.8 min | 174.1 km | **0** |
| `pyvrp-1000` (reference) | 13.05 s | 807.0 min | 170.1 km | **0** |
| `pyvrp-250-budget-200` (the suite's budget day) | 3.21 / 3.32 s | 1187.9 min | 94.0 km | **0** |

Read it as: the production engine plans the 174-stop break-day **10× faster than the heuristic
and with a shorter, fully legal day** (the heuristic "wins" distance only by arriving late — it
violates 17 windows and still loses the day-length race). The 250-iteration production budget
costs **+7.8 min** of day against the 1000-iteration reference (the `quality_trade` section), the
honest trade for the 5-second bar. The 200-stop budget check runs 3.2–3.3 s against the ≤ 5 s
rule of `docs/plan/CONSTRAINTS.md` — same construction as the suite's budget test.

## What the running of the benchmark found

Two defects were found by the first benchmark attempts and fixed in the same task. The committed
JSON holds the **after** state only (the final run); the before-fix numbers are quoted here and in
ADR-009 §3, captured in the session log:

1. **The two-phase hand-over anchor was the day's depot, not the van.** Phase-2's model must start
   where the van stands (the last priority stop). Before the fix: `pyvrp-250` = 177.5 km,
   3 window violations. After (`_departure_pin` returns the position): 174.1 km, **0 violations**,
   shorter day.
2. **The generated dataset of the first attempt was infeasible** (service ≈ 10 h + window ends):
   PyVRP honestly fell back to the heuristic, so every "engine" column read `heuristic-nn-2opt`.
   The harness now rejects fallback days (seed walk until the solver stays on-engine; the recipe
   and the chosen seed are recorded in the JSON).

Both processes stayed inside the gates: no test was weakened, the profile evidence is quoted in
ADR-009 §Limitations.

## The solver's licence (recorded per the quality gates)

Captured from the installed wheel (`services/api/.venv/Lib/site-packages/pyvrp-0.14.1.dist-info/METADATA`):

```
Name: pyvrp          Version: 0.14.1
License: MIT         License-File: LICENSE.md
Requires: matplotlib, numpy, tqdm, vrplib
```

The contract pin is `pyvrp>=0.14.1,<0.15` in `services/api/pyproject.toml` (0.15 moves to Python
≥3.12 — PyVRP issue #1206). `pip-audit` / Semgrep / the licence inventory gates run against this
lock in the quality-gates workflow.

## The VROOM comparison leg — NOT VERIFIED on this machine

The founder's brief time-boxes a VROOM leg at 45 minutes via a pinned Docker CLI. The sequence of
this session: Docker Desktop 29.8.0 was launched (its engine is
`C:\Users\DCL\AppData\Local\Programs\DockerDesktop\`), the daemon never opened the named pipe
(`dockerDesktopLinuxEngine`) and no Docker process survived the launch — the leg could not start,
and the box was spent. The leg is therefore recorded as not verified, not skipped-in-evidence:

```
# the pinned leg, reproducible when a daemon is available (image pinned to 1.15.0):
docker run --rm -i vroomproject/vroom:1.15.0 \
  vroom --input "file://problem.json" --output "file://route.json" \
  # problem.json: the same day (one vehicle, 174 jobs, matrix from the core's own walk)
```

PyVRP itself does not depend on the leg (the ADR's choice stands on the probes and the
benchmark), and the queue-value of the VROOM comparison accrues to the later Valhalla/VROOM
matrix-leg decision (BUG-016's remaining part).

## Reproduction

```
uv run --directory services/api pytest -q          # the suite incl. the 30 solver tests
uv run --directory services/api ruff check .
uv run --directory services/api mypy .
uv run --directory services/api python -m benchmarks.benchmark_solver
```
