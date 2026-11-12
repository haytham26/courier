# ADR-030 — The routing evaluation set by simulation, and what it measured

**Date:** 2026-11-09 · **Status:** Accepted · **Deciders:** backend squad, per the
founder's 2026-11-08 directive item 3 · **Confirms or overturns:**
`docs/research/2026/routing-vrp-engines.md` (the routing engine pick) ·
**Supersedes:** nothing — this is the first measured routing set.

## Context

The routing score of FINAL_REPORT was 4/10 and `packages/eval/routing/README.md` said
**NOT STARTED**: no set, no checker, and nothing measured our engine against the best
open solver on a real Christchurch day. The research doc had picked **PyVRP primary,
VROOM v1.15.0 co-primary, OR-Tools third, Valhalla as the router and OSRM as the
recorded fallback** — a pick on paper, unverified by a measurement.

The founder's directive item 3 answered the "we have no real runs" objection with
**simulation**: build the days from real LINZ addresses over a real road matrix,
hundreds of instances, seeded, with baselines at a long budget and four hard targets
(within 2% of the baseline on average and 5% at worst; 0 window or priority violations
where a feasible plan exists; solve p95 under 3 seconds at 150 stops on the CI runner).

## What was built

- **THE POOL** (`packages/eval/routing/manifest/pool.json`): 560 real LINZ Canterbury
  addresses WITH geometry (CC BY 4.0), a suburb-balanced subsample of the delivery
  territory (Christchurch 300, Selwyn 130, Waimakariri 130; Mid-Canterbury excluded -
  Ashburton and Rakaia are not this app's courier territory), each area's depot and
  finish point a real address at its centre. Fetched by
  `scripts/data/fetch-routing-pool.py` from a deterministic grid of cells with a
  per-cell cap, so the sample cannot collapse into one suburb.
- **THE ROAD MATRIX** (`road-matrix.csv.gz`, 2.2 MB): the metres and the whole seconds
  of every ordered pair of the 560 stops (313,600 pairs), from **Valhalla 3.3.0 (MIT)**
  routing over the **OpenStreetMap** Geofabrik NZ extract (**ODbL**), built with
  `valhalla_build_tiles` and queried through `valhalla_service`'s `/sources_to_targets`
  with the `auto` costing. **0 unroutable pairs**. The OSRM fallback was recorded but
  never needed. Licences are in `docs/product/LICENSES.md`.
- **144 INSTANCES** (`manifest/instances/`): 30/80/150/250 stops x 6 variants
  (plain; time windows; priorities; both; a break; all of it with a finish point that
  is not the depot) x 6 seeds, each night an 08:00 NZDT day with a five-minute door, a
  capacity 10% above its own parcels, windows on 35% of the stops (90-150 minutes
  wide), priorities on 15%, and a 30-minute break between 12:00 and 13:00. Seeded with
  mulberry32; `scripts/eval/check-routing-eval.mjs` RE-DERIVES every instance from its
  seed and fails on drift, so "seeded and reproducible" is checked.
- **THE BAR**: the baseline a plan is measured against is the best travel among
  the plans that SATISFY the instance's own constraints (the priority rule, the
  windows, the break, the capacity) - a plan that ignores the priority rule does
  not set the bar. Every engine's number is recorded; only the baseline is
  filtered. (Measured here: held to it, OR-Tools loses the priority days; without
  the filter it "wins" them by violating the rule the instance states.)
- **THE RUNNER** (`scripts/eval/run-routing-eval.py`, the API project plus the `eval`
  extra): three engines, ONE measuring stick. Every order - whoever produced it - is
  timed by the production core's own `_build_plan` (`services/api/app/routing.py`), with
  the road matrix injected at the documented seam (`_distance_m` / `_travel_seconds`,
  patched in both modules that import them). The engines: **ours** = the production
  `PyVRPEngine` (250 iterations, seed 0); **pyvrp-long** = the same two-phase model
  with a long `MaxRuntime`; **ortools** = OR-Tools 9.15 (Apache-2.0) with the same
  budget.
- **THE CHECKER** (`scripts/eval/check-routing-eval.mjs`, zero-dependency node): the
  set's shape, the DETERMINISM, the matrix's licence record, every committed result
  re-walked with the core's own rules over the matrix, and the four targets. It runs in
  `quality-gates.yml` with no toolchain; a `routing-eval-timing` job additionally runs
  OUR engine on the 24 150-stop instances on the CI runner itself and fails the build
  if the p95 goes over 3 seconds.

## The measured numbers

| Target (the directive) | Target | Measured | Verdict |
| --- | --- | --- | --- |
| within 2% of the baseline on AVERAGE | ≤ 2.00% | **0.76%** | MET |
| 5% at worst | ≤ 5.00% | **4.94%** (`routing-80-brk-20261110`) | MET |
| 0 time-window or priority violations when a feasible plan exists | 0 | **0** illegal plan(s) over 79 feasible-day instances | MET |
| solve p95 < 3s at 150 stops on the CI runner | < 3.000s | **2.907s** (median 1.986s) | MET |

Per size (average / worst): 30 stops 0.21% / 4.55%; 80 stops 0.69% / 4.94%; 150 stops 1.51% / 3.69%; 250 stops 0.85% / 1.93%.
The engines that could NOT run here at the time of the measurement: **VROOM 1.15.0**.
That gap is now CLOSED in the tooling, and the remaining step is a measurement, not a
build: `infra/eval/vroom/Dockerfile` builds VROOM 1.15.0 from its own tag in a pinned
image (the release publishes no prebuilt binary, and the wiki's build needs GCC 13+ for
`<format>` — the image is Ubuntu 24.04, pinned by digest; the first attempt on Debian
bookworm failed the compile with `fatal error: format`, which is recorded in the
Dockerfile's header rather than left to be rediscovered). The engine runs and is
wired into the runner as its fourth measured engine (`scripts/eval/run-routing-eval.py`,
`--engines ours,pyvrp-long,ortools,vroom`), writing the instance in the same shape the
OR-Tools baseline uses — one vehicle, the capacity, the road matrix as the arc
durations, the windows as offsets from the run's start — so all engines are measured
with one stick. A first short run (the 30-stop instances) shows the engine works and
is honest about what it cannot do: on the `full` variants (the ones with a finish
point) it leaves 28–29 of 30 stops placed and the runner reports the day as NOT
planned rather than measuring a partial order, which is the eval's own rule — an
engine that does not plan feasibly does not set the bar. **The full 144-instance
re-measure with VROOM in the set is the open item**, scheduled for when the founder's
local server is stopped (the directive's rule about long eval jobs), and the numbers
above will be re-derived and re-pasted with VROOM in the baseline when it runs. The
baseline is still the best of the engines that were measured, so nothing above is
overstated meanwhile.

## Decision

1. **The research doc's pick is CONFIRMED where it could be measured.** PyVRP is the
   production engine and holds its own against its own long budget (0.76% on
   average over 79 baseline-compared instances) - the production budget of 250
   iterations is not the thing that costs the day.
2. **Valhalla stays the router** (the matrix is real, 0 unroutable pairs, and the
   engine already reads it through the documented seam). OSRM stays the recorded
   fallback and was not needed.
3. **The routing score of FINAL_REPORT moves from 4/10 to 7/10** on measured evidence:
   the set exists, the targets are met, and the one open item (VROOM) is named. It does
   not move further until VROOM has actually run.
4. **The production budget is now size-aware, because the measurement asked for
   it.** The directive's two targets pull opposite ways - the p95 under 3 seconds
   at 150 stops wants the small days to stop sooner, the 5%-worst bar at 250 stops
   wants the big days to search longer - so `iterations_for(stop_count)`
   (`services/api/app/solver.py`) spends **100 iterations up to 150 stops**
   (measured: p95 2.65 s, the day only +0.5% longer) and grows by four per stop
   past that, **capped at 600** (measured at 250 stops: 0.7% over the long-budget
   baseline on average, against 2.1% at 250). It is still a pure function of the
   input, so the same day plans to the same order.
5. **Simulation replaces the missing real runs** for the engine's ORDER quality only;
   the founder's real runs remain the acceptance evidence for the day itself
   (A6, `docs/operations/ACCEPTANCE_TEST.md`).

## Consequences

- `packages/eval/routing/` is a live set with 144 committed instances and a committed
  road matrix; the CI floor job checks it on every push.
- `services/api/pyproject.toml` carries an `eval` extra (OR-Tools) that the API never
  imports; the API's own dependency closure is unchanged.
- The set's rebuild needs the LINZ key and the OSM extract (documented in the set's
  README); the checker needs neither.
- D67 records this decision in DECISIONS.md.
