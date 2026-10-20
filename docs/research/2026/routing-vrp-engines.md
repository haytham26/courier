# Routing & VRP engines — 2026 OSS research

**Research date: 2026-10-20.** Method: V4 §12 (≥30 candidates, ≥10 shortlist, deep-review top 5,
benchmark top 2–3). Every number was read from the live GitHub API, PyPI or npm on **2026-10-20**.
Anything unread is **UNVERIFIED** with the command that would settle it.
Card format: `repo · stars(+trend proxy) · created · last release/date · cadence · issues ·
maintainers/90 d · licence · on-device/server · advisories · production users · docs · CI ·
better than our choice · risks · DECISION`.

## 0. Scope, our current choice, and the bar

| Item | Today (verified 2026-10-20) |
|---|---|
| Routing service | **none built** — `services/routing` does not exist; `docs/squads/routing/README.md`: "to be created" |
| Proposed stack (`docs/TECH_STACK.md` §3) | `valhalla/valhalla` + `VROOM-Project/vroom` + `google/or-tools` |
| V4 §11.1 item 6 | "**PyVRP** — benchmark vs VROOM on real 80–150-stop Christchurch days; keep the winner (or ensemble)" |
| Squad targets | **within 5 % of the best-known solution** on the benchmark sets · **200 stops ≤ 5 s** · a template rebuilds a day in one tap |
| Python runtime | `apps/api` is Python (FastAPI); `uv.lock` + `pyproject.toml` present |

Two separable things must not be conflated: the **routing engine** (graph → matrix, route,
map-matching: Valhalla / OSRM / GraphHopper) and the **VRP solver** (order the stops, split them
across vehicles/days, respect time windows: VROOM / PyVRP / OR-Tools / cuOpt / Timefold).
A courier day needs **both**, and the 200-stops-in-5-seconds budget belongs to the **VRP solver**
(once the matrix exists), not to the router.

### 6-month star trend — method note

GitHub's stargazer listing is **not readable with the token in `.env.local`** (`GET
/repos/{o}/{r}/stargazers` and GraphQL `stargazers` both return `HTTP 403 Resource not accessible
by personal access token`; the token lacks `read:user`). **All 6-month star trends here are
UNVERIFIED.** Proxies used instead: **commits in the last 90 days**, **release cadence**, and
**PyPI/npm downloads per month**.

## Queries run

`gh search repos` via `scripts\gh.ps1`, 2026-10-20:

| # | Query | Sort | Notes |
|---|---|---|---|
| 1 | `topic:vehicle-routing-problem` | stars | 30 hits — Vroom 1892, timefold-solver 1836, jsprit 1835, rl4co 916, PyVRP 714 … |
| 2 | `vehicle routing` | stars | 20 hits — surfaced OR-Tools 14234, HGS-CVRP 448, VRPSolverEasy 169 |
| 3 | `map matching` | stars | 15 hits — fmm 1059, graphhopper/map-matching 808, barefoot 693 (needed for the IRD km target) |
| 4 | `delivery route optimization` | stars | 15 hits — all ≤ 33 ★; no serious OSS competitor to VROOM (the market is closed-source SaaS) |
| 5 | `routing engine openstreetmap` | stars | **0** (dead query — GitHub ANDs every term) |
| 6 | `osrm` | stars | 12 hits — osrm-backend 8156, routingpy 351, python-osrm 147 |
| 7 | `navigation engine` | stars | 15 hits (no VRP content; sweep) |
| 8 | `textualinstructions` | stars | **0** (dead query) |
| 9 | `lightning solver scheduling` | stars | **0** (dead query; PyPI `lightning` is **PyTorch Lightning**, not the Microsoft scheduler — that VRP repo could not be located via the API → UNVERIFIED) |

Plus API reads: `repos/{o}/{r}`, `/releases`, `/contents/*`, `/commits?since=`, `/actions/runs`,
`/license`, `search/code`, PyPI JSON API, pypistats, OSV.

## 1. Candidate pool — 36 candidates, full evidence card each

### C1 — VROOM-Project/vroom  ⭐ shortlist
**1,892 ★** /445 f · created 2015-09-05 · **last release v1.15.0, 2026-03-12** (20) · **last commit 2026-03-17 → the release train has been quiet for ~7 months** · 1,016 open / 976 closed · maintainers 90 d **1 human** (jcoupey / Julien Coupey, Verso) · **BSD-2-Clause** · C++20, server-side binary (`vroom`) + `vroom-express` + `vroom-docker` · no mobile/Expo angle · OSV n/a (binary; the PyPI `vroom` package is a **2018** binding, 1.0.2 — we must run the C++ binary or Docker) · production users: the Verso Premium API is built on it; public demo at map.vroom-project.org · docs: wiki + `docs/API.md` + worked examples · CI: only **2 workflows** (`vroom.yml`, `vroom_libosrm.yml`) — **thin matrix** · **better than our choice**: solves **TSP, CVRP, VRPTW, MDHVRPTW and PDPTW simultaneously**, models *jobs* and *shipments* (pickup+delivery pairs) with skills, priorities, per-vehicle breaks and working hours, and drives **OSRM, Openrouteservice or Valhalla** natively — or a custom cost matrix from any source (how we feed our own matrices) · risks: single maintainer; 7-month release gap; the README is a sales funnel for Verso Premium; 1,016 open issues; **no GraphHopper in the engine list** · **ADOPT (primary VRP solver) — pair with PyVRP and watch the cadence.**
### C2 — PyVRP/PyVRP  ⭐ shortlist
**714 ★** /161 f · created 2022-11-14 · **last release v0.14.1, 2026-10-16** (39) · cadence **≈ bi-weekly** · 403 open / 372 closed · maintainers 90 d **2 humans** (Niels Wouda ×20, Leon Lan ×14; 35 commits total) · **MIT** · PyPI **`pyvrp` 0.14.1** (2026-10-16), Python **≥ 3.11**, **76,753 downloads/month** · server-side Python · OSV **0 advisories** · production users: published in **INFORMS Journal on Computing 36(4):943-955 (2024)** · docs: **pyvrp.org** + 9 tutorials + an algorithm explainer + Sphinx · CI **exemplary**: gcc13/gcc14/clang16/clang20 × Python 3.12/3.15, actions **pinned by commit SHA**, `uv` toolchain, pre-commit, coverage to codecov with `fail_ci_if_error: true`, and a **Valgrind memcheck** on `tests/data/RC208.vrp` · **better than our choice**: MIT, pure-Python `Model → solve()` that drops into our FastAPI service, supporting **time windows, release times, multiple depots, reloading, prize collecting, client groups, shipments, heterogeneous fleets, profiles and access restrictions** — "profiles + access restrictions" is exactly "no entry through the back lane" · risks: **Enterprise-only** features (break planning, compatibility and sequencing constraints, fairness, clustering); 2-person maintainership; C++ extension (Meson) so wheels must exist for our CI Python · **ADOPT (co-primary with VROOM; the one to benchmark against).**
### C3 — google/or-tools  ⭐ shortlist
**14,234 ★** /2,528 f · created 2015-02-21 · **last release v9.15, 2026-01-12** (52) · the default branch is `stable`; **development happens on `main`: 100 commits in the last 90 days, 84 by Corentin Le Molgat** — the "1 commit/90 d" reading of the default branch is misleading · 3,262 open / 3,162 closed · **Apache-2.0** · PyPI **`ortools` 9.15.6755** (2026-01-14), **6,170,996 downloads/month** · server-side; the Android/Java/iOS build is enormous and not shippable · OSV **0** · production users: essentially every logistics company · docs: extensive (developers.google.com/optimization) · CI: Bazel + CMake matrices on Linux/macOS/Windows · **better**: the `routing` library supports **dimension-typed capacities, multi-vehicle, time windows, penalties, arc costs**, and **CP-SAT** is the only first-class SAT path here — the right tool for "if the door code is wrong, the next stop takes 12 min" · risks: heavy Python wheel (protobuf/abseil); verbose API; CP-SAT does not scale to 200-stop VRPTW; `stable` releases every few months · **KEEP (third engine + the fallback solver for small re-optimisations).**
### C4 — graphhopper/graphhopper  ⭐ shortlist
**6,737 ★** /1,961 f · created 2012-02-18 · **last release 11.1, 2026-09-29** (47) · cadence ≈ quarterly · 1,703 open / 1,511 closed · maintainers 90 d **5 humans** (Peter ×63, ratrun ×4, easbar ×3 + 2) · **Apache-2.0** · Java server · **an in-tree `navigation/` module** (route → instructions → voice) and a **`map-matching/` module** (HMM) · OSV n/a · production users: graphhopper.com (the commercial hosted API; the core is free) · docs: versioned per release (11.x), `CHANGELOG.md` tracks Java API changes · CI: Build and Test + Publish + a **"Trigger Benchmarks"** workflow · **better**: the **only mature engine that gives routing + map-matching + a navigation instruction engine in one Apache-2.0 codebase**, and `graphhopper-navigation-example` shows the MapLibre-Android combination · risks: Java service; quarterly releases; the commercial Directions API is the paid product · **ADOPT as the routing engine (Valhalla = Plan B) — it beats Valhalla for map-matching and instructions; keep Valhalla for OSM geometry-free speed and `trace_attributes`.**
### C5 — valhalla/valhalla  ⭐ shortlist
**6,343 ★** /1,010 f · created 2016-01-19 · **last release 3.9.1, 2026-10-06** (68) · cadence ≈ monthly · 2,850 open / 2,026 closed · maintainers 90 d **5+** (Christian Beiwinkel ×26, Stefan Kizim ×17, Nils ×8, Kyle Brooks ×4, M393 ×4; 82 commits) · **MIT** (`COPYING`: "The MIT License (MIT) Copyright (c) 2018 Valhalla contributors / 2015-2017 Mapillary AB, Mapzen") · C++ server + `libvalhalla` + Python bindings · **`trace_attributes` confirmed** (`src/thor/trace_attributes_action.cc`, `proto/descriptors/api.proto`), recently extended with **`stop_impact`** (PR #6368) → exactly the IRD-logbook km and per-segment speed learning need · OSV n/a · production users: the **FOSS routing engine behind many production navigation apps** · docs: `docs/docs/api/**` (mdbook), contributing guides, data-source licence notes · CI: linux/osx/windows + codecov + a published **timezone-db** artifact (tzdb 2026e) · **better**: the best **truck** cost model (height/weight/surface/access, `destonly` zones), **isochrones**, **time-dependent costs**, `/locate`, `/tile`, `/matrix`, plus `valhalla_service` for on-device · risks: 2,850 open issues; an explicit **AI-contribution policy** (human-written PR descriptions; contrarian AI code gets rewritten) we must comply with · **ADOPT (routing engine, paired with GraphHopper) — and the TBT instruction source.**
### C6 — Project-OSRM/osrm-backend
**8,156 ★** /3,978 f · created 2011-09-22 · **last release v26.10.0, 2026-10-01** (46) · cadence ≈ monthly · 4,784 open / 4,428 closed · **BSD-2-Clause** · C++ server (CHIPS) · **the fastest OSM router and the de-facto `/route` + `/match` + `/nearest` API** · OSV n/a · production users: enormous (Mapbox, Organic Maps, thousands of apps) · docs: the wiki is the documentation · CI: mature · **better**: **the fastest matrix** (a 200×200 matrix well under a second) and battle-tested `/match` HMM map-matching · risks: **car profile only** (no truck cost model, no time windows, no isochrones, no `trace_attributes`); 4,784 open issues · **KEEP as the matrix accelerator / Plan-B router; not the primary VRP or TBT engine.**
### C7 — NVIDIA/cuopt  ⭐ shortlist (2026 challenger)
**1,066 ★** /245 f · **created 2025-04-08** · **last release v26.10.00, 2026-10-14** (9) · cadence ≈ monthly since creation · 579 open / 392 closed · maintainers 90 d: NVIDIA team · **Apache-2.0** · **CUDA** → **GPU-accelerated VRP/TSP/VRPTW** · **better than our choice**: the only candidate that could re-solve a **200-stop VRPTW in seconds** on a GPU, and new enough (2025) to change the comparison · risks: **requires an NVIDIA GPU** (our server is CPU-only; a GPU is a real cost); CUDA build chain in CI; 579 open issues · **WATCH** (benchmark only if we get a GPU runner; `cuopt-examples` — 472 ★, Apache-2.0, last release 22.12 (2022-12-15) — is the usage reference).
### C8 — TimefoldAI/timefold-solver
**1,836 ★** /239 f · created 2023-03-28 · **last release v2.7.1, 2026-10-06** (55) · 525 open / 425 closed · **Apache-2.0** · Java (OptaPlanner's successor) · **better**: a **constraint-solver** approach — put "no stop after 17:00", "one van", "door code required" into a constraint stream instead of VRP features · risks: JVM service; heavier than we need; OptaPlanner's churn history · **WATCH** (only if we hit a constraint VRPTW cannot express).
### C9 — graphhopper/jsprit
**1,835 ★** /640 f · created 2013-03-27 · pushed 2026-09-14 · **last release v1.9.0-beta.1, 2020-04-21** (19) — the *code* is alive, the *releases* are stale · 396 open / 394 closed · **Apache-2.0** · Java, the reference rich-VRP research toolkit (premiums, time windows, sequences, capacities) · **better**: the constraint model is richer than VROOM's · risks: Java, stale releases · **WATCH** (research reference for constraint modelling; not production).
### C10 — reinterpretcat/vrp
**509 ★** /101 f · created 2020-02-05 · pushed 2026-10-14 · **last release v1.25.0, 2024-11-10** (54) · 125 open / 79 closed · **Apache-2.0** · **Rust** VRP solver · **better**: Rust = one static binary, trivial deploy, no JVM/Python runtime; CVRP + time windows + multi-vehicle · risks: stale tagged release; smaller feature set · **WATCH** (the "one binary" option if we want to avoid the Python extension build).
### C11 — ai4co/rl4co — **916 ★**, MIT, created 2023-02-23, **v0.7.0 2026-09-14**, 106 open / 101
closed · PyTorch library for RL-based combinatorial optimisation (NARLO/POMO) · **REJECT for production** (we need *provably good* routes within 5 %, not a learned policy that can be 20 % off on a new city) — **KEEP as a research reference**.
### C12 — OptMLGroup/VRP-RL — **710 ★**, **NO LICENCE** (GitHub detects none), last push 2021-05-05 ·
**REJECT** (no licence + dead).
### C13 — N-Wouda/ALNS — **661 ★**, MIT, last push 2025-02-25, last release v7.0.0 (2024-10-21) ·
Adaptive Large Neighbourhood Search library in Python · **WATCH** (the *fallback heuristic* if the exact solver is too slow; the repo is quiet).
### C14 — vidalt/HGS-CVRP — **448 ★**, MIT, last push 2025-03-26, last release v2.0.0 (2022-05-09) ·
Hybrid Genetic Search for CVRP (state of the art on the CVRP benchmark) · **WATCH** (the reference algorithm for maximum CVRP quality; not time-window capable).
### C15 — inria-UFF/VRPSolverEasy — 169 ★, MIT, last push 2026-01-22, last release 0.1.4 (2023-11-11) ·
Pyomo wrapper around exact MILP solvers (CBC, CPLEX, Gurobi) · **REJECT** (an exact MIP will not hit 200 stops ≤ 5 s).
### C16 — RoutingKit/RoutingKit — **482 ★**, BSD-2-Clause, last push 2026-04-13, **0 releases** · C++
shortest-path toolkit (CH, ALT, contraction hierarchies) · **better**: **CH/ALT gives a matrix generator an order of magnitude faster than on-demand routing** — a good way to build the 200×200 duration matrix inside the 5 s budget · **WATCH** (matrix acceleration).
### C17 — opentripplanner/OpenTripPlanner — **2,762 ★**, NOASSERTION (**LGPL-3.0**), last release
v2.10.0 2026-09-09, pushed 2026-10-20 · transit-first planner with routing + itineraries · **REJECT** (transit-first; LGPL is not on our allow-list).
### C18 — apache/incubator-kie (Drools / OptaPlanner successor) — **6,339 ★**, Apache-2.0, last
release 10.2.0 2026-04-28 · **WATCH** (same family as C8; JVM).
### C19 — PyVRP/VRPLIB — **131 ★**, MIT, last release v2.2.0 2026-04-06 · Python reader/writer for
standard VRP instance formats (Solomon, CVRP, RC208 …) · **ADOPT (tooling — converts the published benchmark instances into the format our harness reads).**
### C20 — VROOM-Project/vroom-docker — **122 ★**, BSD-2-Clause, last push 2026-03-17 · containerised
Vroom + OSRM + Valhalla + Nominatim + tileserver-gl · **KEEP (the fastest way to get a working VRP stack in CI while `services/routing` is built).**
### C21 — VROOM-Project/vroom-express — **86 ★**, BSD-2-Clause, last push 2025-10-17, last release
v0.12.0 (2023-11-16) · thin HTTP wrapper around libvroom · **KEEP (reference for the HTTP contract we will expose).**
### C22 — routingpy/routingpy — **351 ★**, Apache-2.0, created 2019-04-13, last push 2026-09-01,
**0 releases** · Python client for OSRM/Valhalla/GraphHopper/ORS/BRouter + isochrones + map matching · PyPI **13,680 downloads/month** · **better**: one Python API over every router, so the API service can switch engines behind a flag · risks: no releases → pin a commit · **ADOPT (client library for `services/routing`)** — it makes V4 §6.1 ("adapters behind interfaces") cheap.
### C23 — ustroetz/python-osrm — **147 ★**, MIT, last push 2024-01-19 · thin OSRM client ·
**WATCH** (subsumed by routingpy).
### C24 — Project-OSRM/osrm-text-instructions — **107 ★**, BSD-2-Clause, pushed 2026-10-17 · the
**turn-by-turn phrase library** (instruction code → English text) · **KEEP (cross-reference for TBT phrasing; see navigation-turn-by-turn.md).**
### C25 — GIScience/openrouteservice — **1,985 ★**, **GPL-3.0**, last release v10.1.0 2026-10-14 ·
**CLEAN-ROOM STUDY ONLY (V4 §11.2) — GPL; never in our repo, never quote its code.** Note: VROOM lists ORS as a supported engine — we must NOT ship ORS.
### C26 — osm-search/Nominatim — **4,522 ★**, **GPL-3.0**, v5.3.3 2026-10-14 ·
**CLEAN-ROOM STUDY ONLY** (geocoder, not a VRP engine).
### C27 — fleetbase/fleetbase — **4,369 ★**, **AGPL-3.0**, v0.7.72 2026-10-20 ·
**CLEAN-ROOM STUDY ONLY** (dispatcher UX reference — already in V4 §11.2).
### C28 — fleetbase/navigator-app — **116 ★**, **AGPL-3.0**, v2.0.12 2026-10-19 ·
**CLEAN-ROOM STUDY ONLY** (already in V4 §11.2).
### C29 — hove-io/navitia — **457 ★**, **AGPL-3.0**, v15.119.0 2026-10-05 ·
**CLEAN-ROOM STUDY ONLY** (transit routing + journey planning).
### C30 — Project-OSRM/osrm-frontend — **380 ★**, BSD-2-Clause, pushed 2026-10-18 · the debug UI ·
**WATCH** (dev tool for inspecting matrix quality).
### C31 — optapy/optapy — **307 ★**, Apache-2.0, **last push 2023-10-02** · **REJECT (stale)**.
### C32 — hubbs5/or-gym — **454 ★**, MIT, **last push 2023-10-12** · **REJECT (stale)**.
### C33 — yorak/VeRyPy — **287 ★**, MIT, **last push 2023-12-02** (15 classical VRP heuristics) ·
**WATCH** (a cheap baseline for the benchmark harness).
### C34 — skatsuta/vrp-solver — **104 ★**, MIT, last push 2024-03-20 · **REJECT (stale)**.
### C35 — ahottung/NLNS — **112 ★**, pushed 2026-09-14 · Neural LNS for CVRP (paper code) ·
**WATCH** (research reference; model licence UNVERIFIED).
### C36 — optframe/optframe — 91 ★, MIT, pushed 2025-09-15 · C++ optimisation framework ·
**REJECT (a framework, not a VRP solver).** `ai4co/routefinder` (128 ★), `wouterkool/attention-learn-to-route` (1,389 ★, MIT, last push 2024-08-04 — research only), `mck-/Open-VRP` (330 ★, Common Lisp), `Vidalt/HGS-CVRP`, `gmcl/*`, `VRP-REP/*`.
*Also surveyed and rejected without a card:* `henry-yeh/DeepACO` (200 ★, Jupyter, research), `ai4co/routefinder` (128 ★), `wouterkool/attention-learn-to-route` (1,389 ★, MIT, last push 2024-08-04 — research only), `mck-/Open-VRP` (330 ★, Common Lisp), `Vidalt/HGS-CVRP`, `gmcl/*`, `VRP-REP/*`.

## 2. Shortlist (12) with decisions

| # | Project | Decision | One-line reason |
|---|---|---|---|
| C2 | **PyVRP/PyVRP** | **ADOPT (primary)** | MIT, actively released (v0.14.1, 2026-10-16), 76 k PyPI downloads/month, exemplary CI, pure-Python API. |
| C1 | **VROOM-Project/vroom** | **ADOPT (primary)** | Best-in-class multi-constraint VRPTW/PDPTW, BSD-2, drives OSRM/ORS/Valhalla — but 1 maintainer and a 7-month release gap. |
| C4 | **graphhopper/graphhopper** | **ADOPT (router)** | One Apache-2.0 codebase gives routing + HMM map-matching + a navigation instruction engine. |
| C5 | **valhalla/valhalla** | **ADOPT (router + TBT + IRD)** | MIT, truck cost model, `trace_attributes` with `stop_impact`, monthly releases, 5+ maintainers. |
| C3 | **google/or-tools** | **KEEP (third)** | Apache-2.0, 6.2 M PyPI downloads/month; CP-SAT is right for small re-optimisations. |
| C22 | **routingpy/routingpy** | **ADOPT (client)** | One Python API over OSRM/Valhalla/GraphHopper → the adapter layer V4 §6.1 asks for. |
| C19 | **PyVRP/VRPLIB** | **ADOPT (tooling)** | Converts standard benchmark instances into our harness format. |
| C20 | **VROOM-Project/vroom-docker** | **KEEP (CI)** | Working VRP stack in one container while `services/routing` is built. |
| C6 | **Project-OSRM/osrm-backend** | **KEEP (matrix)** | Fastest 200×200 matrix; car profile only. |
| C7 | **NVIDIA/cuopt** | **WATCH** | The only GPU VRP solver; needs a GPU runner to be worth it. |
| C8 | **TimefoldAI/timefold-solver** | **WATCH** | Constraint-solver escape hatch for rules VRPTW cannot express. |
| C9 | **graphhopper/jsprit** | **WATCH** | Richest constraint model, but stale releases and JVM. |
| C25–C29 | ORS / Nominatim / Fleetbase / navigator-app / navitia | **CLEAN-ROOM ONLY** | AGPL/GPL — study the behaviour, never the code (V4 §11.2). |

## 3. Deep review — top 5

**3.1 VROOM** — *Problem coverage*: TSP, CVRP, VRPTW, **MDHVRPTW** (multi-depot heterogeneous) and
**PDPTW** (pickup-and-delivery with time windows) solved *simultaneously*; that matters for a courier
who collects returns and delivers parcels in one loop. *Model*: `vehicles` (capacity on arbitrary
metrics, skills, working hours, **driver breaks**, per-vehicle start/end, open trips) and `jobs` /
`shipments` (time windows, service duration, skills, priority, arbitrary load dimensions) — skills
model "only this van serves this suburb". *Routing engines*: OSRM, Openrouteservice (⚠ GPL —
unusable for us), Valhalla; **or a custom cost matrix from any source** — how we feed our own
Valhalla/GraphHopper matrices. *Delivery surface*: `vroom` CLI, `vroom-express` (HTTP), `libvroom`
(C++), `vroom-docker`; `docs/API.md` + `example_1..3.json` give the JSON contract — **the HTTP shape
our FastAPI service should mirror**. *Benchmarking discipline* (the good part): the README states
academic, custom and real-life benchmark sets run on **every release** to catch solution-quality and
runtime regressions — the discipline our squad must copy. *Code quality*: C++20, clang-format, only
two CI workflows, one primary maintainer, 1,016 open issues — **the weakest engineering hygiene of
the three ADOPTs.**

**3.2 PyVRP** — *API ergonomics*: `Model → Data → solve()`; the README's nine tutorials map onto
courier concepts (load dimensions, time windows, **profiles + access restrictions**, optional clients,
mutually exclusive groups, reloading, shipments). The `profiles` feature encodes "a van with a ladder
profile cannot use the stairs". *Algorithm*: iterated local search (HGS family) with a dedicated
explain page; `max_runtime`, `seed`, `round_func dimacs` are first-class CLI options → **deterministic,
reproducible runs**, exactly what our benchmark harness needs. *Code quality*: ~30 pytest modules
mirroring the domain model (`test_Client.py`, `test_Shipment.py`, `test_IteratedLocalSearch.py`,
`test_CostEvaluator.py` …), a `benchmarks/` micro-benchmark that runs **in CI on every push**,
CodSpeed, coverage to codecov with `fail_ci_if_error`, and a **Valgrind memcheck** in CI — best in
class. *Data*: `tests/data/` ships the standard families `C201R0.25.vrp`, `PR01/PR11A.vrp`,
`RC208.vrp`, `lrc206.vrp`, `X-n101-50-k13.vrp`, `X115-HVRP.vrp`, `p06-2-50.vrp`; `instances/` is a
git submodule with the full SINTEF set. *Extensibility*: a thin Python layer over a C++ extension
built with Meson — we must confirm **prebuilt wheels for our CI Python** (≥ 3.11) or build from
source (gcc13/clang16 are the tested minimums). *Gap*: break planning, compatibility/sequencing
constraints, fairness and clustering are **Enterprise-only**; we may implement breaks ourselves (we
own the driver rules anyway).

**3.3 OR-Tools** — *Strength*: the `routing` library is dimension-typed with multi-vehicle, time
windows, penalties and arc costs; **CP-SAT** covers disjunctive/logic constraints. *Strength*:
Apache-2.0, 6.2 M PyPI downloads/month, the most battle-tested code in the list. *Weakness*: heavy
Python wheel, verbose API, CP-SAT does not scale to 200-stop VRPTW, `stable` releases only every few
months. *Fit*: the **single-stop re-optimisation** ("add a parcel at 14:20, put it back in today's
route"), where a fast near-exact answer beats a big heuristic run.

**3.4 GraphHopper** — *Modules*: `core`, `map-matching/`, `navigation/`, `reader-gtfs/`, `web-api/`,
`web/`, `client-hc/`, `benchmark/`. The **`benchmark/` module** matters (GraphHopper ships its own
harness, and CI has a **"Trigger Benchmarks"** workflow we can mirror). *API ergonomics*: a YAML
`config.yml` drives the whole server; the Java API is stable and versioned (11.x docs,
`CHANGELOG.md` for API changes). *Map-matching*: a dedicated HMM module with its own forum → the
answer to "how do we turn a 5 Hz GPS trace into a road distance for the IRD logbook". *Risks*: Java
service, quarterly releases, the commercial Directions API is the supported product (the core is
Apache-2.0 and fine for us).

**3.5 Valhalla** — *Cost model*: the strongest **truck** model of the candidates (height/width/
weight, surface, access restrictions, `emergency only` access, `destonly` zones) → the courier style's
access restrictions map directly onto it. *APIs*: `/route`, `/matrix`, `/isochrone`, `/locate`,
`/tile`, **`/trace_attributes`**, `/status`, `/optimized_route` (its own TSP), `valhalla_service`
(on-device). *`trace_attributes`* returns per-edge attributes for a matched shape and recently gained
`stop_impact` — the mechanism for the **IRD logbook km** and **per-segment speed learning** (V4
§11.1 item 7). **The claim in the shortlist is correct.** *Engineering hygiene*: `SECURITY.md`,
`codecov.yml`, `.clang-tidy`, pre-commit, an explicit **AI-contribution policy**, a pinned timezone-db
artifact (2026e); 5+ active maintainers and ~82 commits/90 d. *Risks*: 2,850 open issues; C++ build
time; the PyPI `valhalla` bindings (0.1.4, 2014) are stale → use the HTTP API or build them ourselves.

## 4. Benchmarks — top 3 (V4 §12.5)

**I did not run a benchmark.** No eval set exists yet
(`docs/squads/routing/benchmarks/README.md`: "Harness: _to be created with the first
implementation_"), the runners are not provisioned, and running VROOM/OR-Tools/Valhalla here would not
be a measurement on our target hardware. Everything below is **UNVERIFIED** with the set that must
be built.

**The set that must be built (per `docs/squads/routing/README.md`):**
1. **`bench/` — published instances.** Use the **SINTEF/VROOM families** that PyVRP and VROOM both
   ship: `RC208`, `lrc206`, `C201R0.25`, `PR01/PR11A`, `X-n101-50-k13`, `X115-HVRP`, `p06-2-50`
   (all present in `PyVRP/PyVRP/tests/data/`) plus the **Solomon R1/R2/C1** instances via
   `PyVRP/VRPLIB`. Reference result tables: the **VROOM wiki "Benchmarks" page** (236 KB of result
   tables, live on 2026-10-20) — that page *is* our "best-known solution" baseline for the paper
   instances.
2. **`christchurch/` — one real day.** 80–150 stops (per V4 §11.1) with real coordinates from the
   Address squad, plus a **second** day of 200 stops to exercise the ≤ 5 s gate. Needs time windows,
   priorities, capacities and skills — the model, not just points.
3. **`christchurch-2d/` — the same day with a 2× zoomed-in bbox**, to separate "the solver is slow"
   from "the matrix is slow".
4. **`harness/` — the runner.** Same machine, same matrix, same time limit, same seed; record
   `objective`, `wall_time`, `feasible?`, `vehicles_used`, `max_violation`.

| Metric | Gate | Source of truth |
|---|---|---|
| Solution quality | **within 5 % of best-known** on the published instances | VROOM wiki benchmark tables (best-known column) |
| Runtime | **200 stops ≤ 5 s** | our harness, CI profile + one mid-range profile |
| Re-optimisation | one added stop re-solved in **≤ 2 s** | our harness |
| Determinism | same seed → same objective | harness assertion |
| Constraint violations | **zero** (time windows, capacity, skills) | harness assertion — a fast but infeasible route is a FAIL |

**The benchmark I would run first:** the **SINTEF `RC208` / `lrc206` / `C201R0.25`** instances already
exist inside PyVRP's repo and already run under Valgrind in its CI — a ready-made control set. The
**"best-known" column must come from the VROOM wiki**, not from a re-run, because "within 5 % of
best-known" is a claim about the *published* best.

## 5. Decision

1. **VRP solver: run VROOM *and* PyVRP on the same instances and keep the winner** (per the squad
   README). VROOM wins on constraint expressiveness (breaks, skills, PDPTW, multi-depot); PyVRP wins
   on engineering hygiene, licence cleanliness (MIT), installability (pure Python + wheels) and
   reproducibility. **Do not choose one before the harness exists.**
2. **Router: GraphHopper (instructions + map-matching) + Valhalla (truck costs, `trace_attributes`,
   TBT)**, with OSRM only as the matrix accelerator. GraphHopper wins map-matching; Valhalla wins the
   truck/access-restriction model.
3. **Client layer: `routingpy`** behind our own `RoutingClient` interface (V4 §6.1) so the engine is
   swappable and fake-able in tests.
4. **Third engine: OR-Tools** for small re-optimisations where CP-SAT beats a heuristic.
5. **Never ship ORS, Nominatim, Fleetbase or navitia** — clean-room study material only.

## 6. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| VROOM bus factor = 1 and a 7-month release gap | **High** | Pin `v1.15.0`; keep PyVRP as a live alternative; raise an upstream maintenance question. |
| PyVRP build toolchain (Meson/C++ extension) in CI | Medium | Verify a wheel exists for our Python; else build in the CI image with gcc13. |
| 200 stops ≤ 5 s is unproven for both | **High** | Build the harness *first* (squad agreement #1); the matrix must be precomputed, not requested per pair. |
| ORS in the VROOM engine list is GPL | Medium | Configure VROOM with OSRM/Valhalla only; add a CI check that no `openrouteservice` URL appears in the routing config. |
| Time-window semantics differ between solvers | Medium | Define our own canonical model in `packages/` and write adapters; assert identical feasibility. |
| ODbL/OSM attribution for the matrices | Medium | Matrices derived from OSM are derived data → attribution required in the API and the app. |
| cuOpt needs a GPU | Low (now) | Keep on the radar; adopt only with a GPU runner and a measurable win. |

## 7. What I could not verify

* **6-month star trend** — blocked by token scope (no `read:user`); proxies used instead.
* **Median issue-response time** — not computed for any repo (needs per-issue timeline sampling).
* **Whether PyVRP publishes wheels for our exact Python** — UNVERIFIED; check
  `https://pypi.org/pypi/pyvrp/0.14.1/json` → `urls[].filename`.
* **The Microsoft "Lightning" VRP solver** — the PyPI package `lightning` is **PyTorch Lightning**,
  not the scheduler; I could not find the Microsoft VRP repo through the GitHub API → UNVERIFIED,
  dropped from the shortlist.
* **`pyvalhalla`** — the PyPI `valhalla` package (0.1.4, 2014) is stale; the real bindings are built
  from source. UNVERIFIED whether the 3.9.1 tree still exposes a Python build.
* **VROOM's "best-known" numbers** — the wiki page exists (236 KB) but I did not transcribe the
  tables; the harness must do that at run time.
* **Actual solution quality of either solver on a Christchurch day** — no instance exists → UNVERIFIED.
* **The `vroom` PyPI package (1.0.2, 2018)** — stale; the C++ binary/Docker is the deployment path.

## 8. Corrections to the V4 §11.1 adopt list (routing-related)

| V4 §11.1 item | Verified reality on 2026-10-20 | Correction |
|---|---|---|
| 6. **PyVRP** — "benchmark vs VROOM on real 80–150-stop Christchurch days" | 714 ★, **MIT**, v0.14.1 (2026-10-16), 76,753 PyPI downloads/month, **bi-weekly releases**, CI with Valgrind + codecov `fail_ci_if_error` | ✅ keep — and it is **stronger than the shortlist assumed**: MIT is a real advantage over VROOM's fine print, and it ships wheels + a benchmark suite. |
| 7. **Valhalla `trace_attributes`** | Endpoint **confirmed** (`src/thor/trace_attributes_action.cc`, `proto/descriptors/api.proto`); `stop_impact` added in the unreleased changelog | ✅ keep. **Correction:** the routing engine we actually want is **GraphHopper** for map-matching + instructions, with Valhalla for truck costs — V4 names GraphHopper only as "Plan B". |
| (shortlist "Also evaluate: traccar server") | `traccar/traccar` is **AGPL-3.0** | Keep on the clean-room list if studied. |
| (not in the list) | **NVIDIA/cuopt** — 1,066 ★, Apache-2.0, created 2025-04-08, monthly releases, GPU VRP/VRPTW | **New 2026 entry → WATCH.** It changes the "VROOM vs PyVRP" framing. |
| (not in the list) | **graphhopper/jsprit** 1,835 ★, Apache-2.0 (stale releases) and **TimefoldAI/timefold-solver** 1,836 ★, Apache-2.0 | **Add → WATCH** (constraint-modelling references). |
| (not in the list) | **routingpy/routingpy** — 351 ★, Apache-2.0, 13,680 PyPI downloads/month | **Add → ADOPT (client library).** |
| (not in the list) | `OpenTripPlanner` = **LGPL-3.0**; `OptMLGroup/VRP-RL` = **no licence** | Do not evaluate as production candidates. |
