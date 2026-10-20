# Routing & Templates Squad - research

**Area:** VRP / routing engines · turn-by-turn navigation **Research date:** 2026-10-20 · **Source files:** `docs/research/2026/{routing-vrp-engines, navigation-turn-by-turn}.md`

## Queries that found the candidates

`topic:vehicle-routing-problem` · `"vehicle routing"` · `"map matching"` · `"delivery route optimization"` · `"routing engine openstreetmap"` (0) · `"osrm"` · `"navigation engine"` · `"turn-by-turn navigation"` · `"maplibre-navigation"` ·
`"offline navigation"` · `"navigation android osrm"` (0) · `"lightning solver scheduling"` (0) · `gh api repos/<o>/<r>` · `/releases` · `/contents/*` · `/commits?since=` · `/license` · npm + crates.io registry · OSV. Candidates: **36**
(routing) · **36** (navigation).

## Candidates that matter

| Project | Repo | Licence | One-line reason |
|---|---|---|---|
| VROOM | `VROOM-Project/vroom` | BSD-2-Clause | Best-in-class multi-constraint VRPTW/PDPTW (breaks, skills, multi-depot); 1 maintainer, 7-month release gap. |
| PyVRP | `PyVRP/PyVRP` | MIT | Exemplary CI (Valgrind, `fail_ci_if_error`), deterministic seeded runs; 76,753 PyPI downloads/month. |
| OR-Tools | `google/or-tools` | Apache-2.0 | 6.2 M downloads/month; right for small re-optimisations, not 200-stop VRPTW. |
| GraphHopper | `graphhopper/graphhopper` | Apache-2.0 | Routing + HMM map-matching + the instruction engine in one codebase, with its own benchmark CI. |
| Valhalla | `valhalla/valhalla` | MIT | The only candidate with a real truck cost model, plus `trace_attributes` for the IRD logbook. |
| routingpy / OSRM / VRPLIB / vroom-docker | `routingpy/routingpy`, `Project-OSRM/*`, `PyVRP/VRPLIB`, `VROOM-Project/vroom-docker` | Apache-2.0 / BSD-2 / MIT | The adapter layer, the fastest matrix, the instruction phrase library, benchmark-instance conversion and a working VRP stack in one container. |
| cuOpt / Timefold / jsprit | `NVIDIA/cuopt`, `TimefoldAI/timefold-solver`, `graphhopper/jsprit` | Apache-2.0 | GPU solver and constraint-solver escape hatches; watchers, not adopters. |
| Ferrostar | `stadiamaps/ferrostar` | BSD-3-Clause | The navigation engine: a pure Rust core with route adapters and the navigation state machine. |
| maplibre-navigation-android | `maplibre/maplibre-navigation-android` | MIT | Telemetry-free Mapbox-Nav fork; the fallback if Ferrostar's RN packaging slips. |

## Deep review - top 5

1. **VROOM** - solves TSP, CVRP, VRPTW, **MDHVRPTW** and **PDPTW** *simultaneously*; vehicles carry capacity, skills, working hours, **driver breaks** and per-vehicle start/end; it takes OSRM / ORS / Valhalla **or a custom cost matrix from
   any source** - how we feed our own matrices. Benchmark sets run on **every release** upstream - the discipline we must copy. But one maintainer, 1,016 open issues. **Verdict ADOPT (primary), but not alone.**
2. **PyVRP** - model -> data -> solve; the tutorials map onto courier concepts (load dimensions, time windows, **profiles + access restrictions**, shipments); `max_runtime`, `seed` and the DIMACS export are first-class CLI options, so
   **runs are deterministic and reproducible**. A micro-benchmark runs **in CI on every push**, there is a **Valgrind memcheck** in CI, and it ships the standard instance families (`RC208`, `lrc206`, `C201R0.25`, `PR01`/`PR11A`,
   `X-n101-50-k13`, `X115-HVRP`, `p06-2-50`). Break planning is enterprise-only. **Verdict ADOPT (primary).**
3. **OR-Tools** - dimension-typed routing with multi-vehicle, time windows, penalties and arc costs; CP-SAT covers disjunctive/logic constraints; Apache-2.0 and the most battle-tested code in the list. Weakness: heavy wheel, verbose API,
   does not scale to 200-stop VRPTW. **Verdict KEEP (third) for re-optimisation.**
4. **GraphHopper** - modules `core`, `map-matching/`, `navigation/`, `web-api/`, `benchmark/`; the HMM map-matching module answers "turn a 5 Hz GPS trace into road distance for the IRD logbook", and a **Trigger Benchmarks** CI workflow is a
   pattern we can mirror. **Verdict ADOPT (router).**
5. **Valhalla** - the strongest truck cost model of the candidates (height/width/weight, surface, access restrictions, emergency-only access, destonly zones) - the courier style's access restrictions map directly onto it. `trace_attributes`
   returns per-edge attributes for a matched shape and gained `stop_impact` - the mechanism for the **IRD logbook km** and per-segment speed learning. **Verdict ADOPT.**

**Navigation deep review.** **Ferrostar ADOPT (core)** - a Rust core with deviation detection, simulation and property-based tests for the state machine, plus an OSRM-compatible parser that reads Valhalla, OSRM, GraphHopper-in-OSRM-mode and
Mapbox Directions, so **we can self-host Valhalla and change nothing in the client**. But the three documented npm packages **404** (the workspace is `"private": true`, issue #961 open) and **issue #991 "Driving side support" is open** - NZ
drives on the left, so that is a release blocker. **maplibre-navigation-android ADOPT-AS-FALLBACK** (MIT, release 5.0.1 on 2026-10-19, a telemetry-free fork of the Mapbox Navigation SDK v0.19, Android-only so the TurboModule is ours).

## Decisions

- **VRP solver: run VROOM *and* PyVRP on the same instances and keep the winner.** VROOM wins on constraint expressiveness; PyVRP wins on licence cleanliness, installability and reproducibility. **Do not choose one before the harness
  exists.**
- **Router: GraphHopper (instructions + map-matching) + Valhalla (truck costs, `trace_attributes`, TBT)**, with OSRM only as the matrix accelerator. **This corrects V4 §11.1, which named GraphHopper only as "Plan B".** **Client layer:
  `routingpy`** behind our own `RoutingClient` interface; **ADOPT** `PyVRP/VRPLIB`; **KEEP** `vroom-docker` in CI while `services/routing` is built.
- **Navigation: vendor the Ferrostar `react-native/` workspace** at a pinned commit until upstream publishes the npm packages; budget the UniFFI build into the Expo prebuild pipeline; **block release on the left-hand-driving issue**.
  Fallback: `maplibre-navigation-android`. **Do not build our own navigation state machine** - Ferrostar's Rust core already has deviation detection, simulation and property tests.
- **WATCH** `NVIDIA/cuopt` (needs a GPU runner), `TimefoldAI/timefold-solver`, `graphhopper/jsprit`, `cyang-kth/fmm`, `maplibre-gl-directions`. **REJECT as dependencies** `optapy/optapy`, `hubbs5/or-gym` (stale), `OptMLGroup/VRP-RL` (no
  licence), `OpenTripPlanner` (LGPL).
- **CLEAN-ROOM (behaviour only, never code)** openrouteservice, Nominatim, Fleetbase, navigator-app, navitia, Vela, navit, OsmAnd, pfaedle, khoa083.

## UNVERIFIED

1. **No benchmark was run.** `docs/squads/routing/benchmarks/` holds only a README, so **within 5 % of best-known, 200 stops <= 5 s and re-optimisation <= 2 s are all unmeasured**.
2. Whether PyVRP publishes **wheels for our exact Python** (>= 3.11); whether the 3.9.1 Valhalla tree still exposes a Python build (the PyPI `valhalla` package, 0.1.4 from 2014, is stale). UNVERIFIED.
3. The Microsoft "Lightning" VRP solver could not be located through the API (the PyPI package `lightning` is PyTorch Lightning) - UNVERIFIED, dropped. VROOM's "best-known" numbers live in a 236 KB wiki table we did not transcribe; the
   harness must read them at run time. UNVERIFIED.
4. Whether the Ferrostar **RN layer inherits the native route adapters**, whether its `maplibreui` workspace matches our pinned `@maplibre/maplibre-react-native@11.3.7`, and whether the RN example's Expo **SDK 57** wrappers port to our SDK
   58. UNVERIFIED.
5. Instruction-text quality for NZ **left-hand** driving from Valhalla and GraphHopper; 6-month star trend, median maintainer response time and closed-issue ratios for every candidate. UNVERIFIED.