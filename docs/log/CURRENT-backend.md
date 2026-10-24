# CURRENT — backend squad (read this first)

Updated: 2026-10-24 · Branch: `feat/routing-solver` (PR pending; §19 five-pass + merge next)
## Done this session — queue item 1 (the real routing solver)
- `services/api/app/solver.py` — `PyVRPEngine` (PyVRP 0.14.1, MIT, pinned `>=0.14.1,<0.15`);
  direct `ProblemData`, two-phase priority pinning, hand-over pin at the van's true position,
  break NOT in the solver model (the core's greedy placement does it; ADR defeats the arc encodings).
- `app/routing.py` — the engine-repair of the seam is complete; `get_engine()` reads
  `COURIER_ROUTE_ENGINE` (`pyvrp` | `heuristic-nn-2opt`), warns + falls back on a missing PyVRP.
- Tests: `tests/test_solver.py` 30/30; whole API suite 190 passed + 1 skipped, 3 random orders.
- Benchmark: `services/api/benchmarks/benchmark_solver.py` → `docs/evidence/backend-solver/
  benchmark.json` (+README): 174-stop break-day 4.7 s / 0 violations vs heuristic 50 s / 17;
  200-stop budget 3.2 s ≤ 5 s; the @250 trade = +7.8 min day vs @1000.
- Docs: `docs/decisions/adr/ADR-009-routing-solver.md` (the full record), D35, BUG-016 partial +
  BUG-052 opened, week log `docs/log/2026-W43.md`.
## Not verified (honest)
- VROOM: Docker daemon never started (45-min box); pinned command in the evidence README.
- A 200-stop **break** day can exceed the 5 s budget (BUG-052: the greedy break scan walks the day
  per candidate gap) — the budget test stays break-free per CONSTRAINTS until BUG-052 fixes it.
## Contract changes the next tasks must use (ADR-009 §6)
- `RoutePlan.engine`: `"pyvrp"` | `"heuristic-nn-2opt"`; breaks: `break_start_at`/`break_end_at`
  /`break_violation`; reopt surface: `build_reopt_plan` → `ReoptResult.plan/finish_delta_s`.
- `COURIER_ROUTE_ENGINE` lever; unknown value raises; infeasible solver days fall back to the
  heuristic and the engine name says so.
## Next (queue item 2 — the backend API for runs)
1. Push this branch, CI + quality-gates green (§16.3 five-pass), merge (commit), tag
   `archive/feat/routing-solver`, delete the branch.
2. Then the runs API on the solver: plan/template/reopt endpoints per `contracts`, on ADR-009 §6.

