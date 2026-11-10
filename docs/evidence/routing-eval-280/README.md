# BUG-280 evidence — the routing evaluation set, measured

Everything below is the record of how the set was built and what it measured. Every
number is reproducible with the commands in `packages/eval/routing/README.md`, and the
CI checker (`scripts/eval/check-routing-eval.mjs`) recomputes all of them from the
committed matrix, so a drifted number fails the build rather than sitting in a report.

## The set

- **Pool**: 560 real LINZ Canterbury addresses WITH geometry (CC BY 4.0, sourced from
  the LINZ Data Service), fetched 2026-11-09 with `scripts/data/fetch-routing-pool.py`
  (a deterministic grid of 0.02-degree cells over the delivery territory, a cap of 6
  stops per cell, every 5th address inside a cell — Mid-Canterbury excluded). The
  committed pool is a suburb-balanced subsample: Christchurch 300, Selwyn 130,
  Waimakariri 130.
- **Road matrix**: every ordered pair of the 560 stops (313,600 pairs), from
  **Valhalla 3.3.0** (MIT) `POST /sources_to_targets`, `costing: auto`, over the
  **OpenStreetMap** Geofabrik NZ extract (`australia-oceania/new-zealand-latest.osm.pbf`,
  405,984,889 bytes, **ODbL**). Tiles: `valhalla_build_tiles` (14m51s on the build
  machine). **0 unroutable pairs**. The matrix is committed gzipped
  (`packages/eval/routing/manifest/road-matrix.csv.gz`, 2.2 MB) with its meta record.
- **Instances**: 144 — 30/80/150/250 stops x 6 variants x 6 seeds (mulberry32, seed
  20261109+k). The 150- and 250-stop days are Christchurch city days (the other areas
  hold 128 drawable addresses each).
- **Engines**: `ours` = the production `PyVRPEngine` (250 iterations, seed 0);
  `pyvrp-long` = the same two-phase model with a 15-second `MaxRuntime` (seed
  20261109); `ortools` = OR-Tools 9.15.6755 with the same 15-second budget
  (PATH_CHEAPEST_ARC first solution + guided local search). Every order is timed by
  the production core's own `_build_plan`, with the matrix injected at the documented
  seam. **VROOM 1.15.0 was not run**: no Rust toolchain on the machine, and the PyPI
  `vroom` is a stale unrelated product (ADR-030 records the gap).

## The measured numbers (the directive's four targets)

| Target | Target | Measured | Verdict |
|---|---|---|---|
| within 2% of the baseline on AVERAGE | ≤ 2.00% | **0.76%** (over 79 instances with a baseline that planned the day) | MET |
| 5% at WORST | ≤ 5.00% | **4.94%** (`routing-80-brk-20261110`) | MET |
| 0 time-window / break / priority / capacity violations WHEN A FEASIBLE PLAN EXISTS | 0 | **0** over 79 instances where some engine planned legally | MET |
| solve p95 < 3s at 150 stops on the CI runner | < 3.000s | **2.907s** (median 1.986s) | MET |

Per size (average / worst over the baseline-compared instances):
- 30 stops: 0.21% / 4.55% over 25 baseline-compared instances, 25 legal plans
- 80 stops: 0.69% / 4.94% over 18 baseline-compared instances, 18 legal plans
- 150 stops: 1.51% / 3.69% over 18 baseline-compared instances, 18 legal plans
- 250 stops: 0.85% / 1.93% over 18 baseline-compared instances, 18 legal plans

Per variant (average over the baseline-compared instances):
- plain: 0.90%
- tw: 0.87%
- prio: 0.43%
- tw-prio: 0.00%
- brk: 0.96%
- full: no baseline-compared instance

Instances where **no engine found a feasible plan** (65) — the random windows
close the day, and they are excluded from the legality bar for everyone:
routing-150-full-20261109, routing-150-full-20261110, routing-150-full-20261111, routing-150-full-20261112, routing-150-full-20261113, routing-150-full-20261114, routing-150-tw-20261109, routing-150-tw-20261110, routing-150-tw-20261111, routing-150-tw-20261112, routing-150-tw-20261113, routing-150-tw-20261114 …

Instances where **our engine's plan was illegal while a feasible one existed**:
none

## The machines

- The build machine: 13th Gen Intel Core i9-13900H (14 cores / 20 threads), Windows 10,
  Python 3.11.9, PyVRP 0.14.x, OR-Tools 9.15.6755, PyVRP/PyVRP deterministic under a
  fixed seed.
- The CI runner: `ubuntu-latest`, where the `routing-eval-timing` job of
  `quality-gates.yml` runs OUR engine on the 24 150-stop instances under
  `--check-targets` and fails the build if the p95 goes over 3 seconds.

## The checks that gate it

`node scripts/eval/check-routing-eval.mjs` (zero dependency, runs in the floor job):
- every instance re-derived from its seed and the committed pool, stop by stop;
- every committed result re-walked with the core's own rules over the matrix (the
  arrival waits for the window, the break sits where the core put it, the capacity is
  the day's);
- the four targets, computed from those re-derivations, not from the result files.

Its unit tests (9) run with the rest of `scripts/*/__tests__/*.test.mjs`.
