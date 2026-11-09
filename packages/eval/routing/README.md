# The routing evaluation set

**Measured, not claimed.** 144 seeded synthetic Christchurch days over a real road
matrix, three engines, one measuring stick, and the founder's targets read off the
committed results by `scripts/eval/check-routing-eval.mjs` in CI.

## What the set is

| Part | What it holds |
| --- | --- |
| `manifest/pool.json` | **560 real LINZ Canterbury addresses WITH geometry** (CC BY 4.0), a suburb-balanced subsample of the delivery territory: Christchurch 300, Selwyn 130, Waimakariri 130. Each area's **depot and finish point** are real addresses at the centre of its territory (an instance never delivers to its own depot) |
| `manifest/road-matrix.csv.gz` | **the road matrix**: the metres and the whole seconds of **every ordered pair** of the 560 stops - VALHALLA 3.3.0 (MIT) routing over the OpenStreetMap Geofabrik NZ extract (ODbL). Not symmetrised: one-way streets make real legs asymmetric. Gzipped CSV `i,j,metres,seconds`; ~2.2 MB |
| `manifest/road-matrix.meta.json` | the matrix's provenance: engine and version, the extract's URL, its ODbL licence, the tileset timestamp, the query shape, and the count of pairs no road could answer |
| `manifest/instances/` | **144 instances**, one file each: `routing-<size>-<variant>-<seed>.json` |
| `manifest/instances.jsonl` | the index: id, size, variant, seed, area, stop count, windows, priorities |
| `results/` | the measured run, one file per instance: every engine's order, the day the core timed for it, the travel from the matrix, and the wall time |
| `README.md` | this file |

## The days

Every size the directive named (30/80/150/250 stops) x every shape (plain; time
windows; priorities; both; a break; all of it together with a **finish point that
is not the depot**) x 6 seeds - **144 instances**, "hundreds" as the directive
asked. Each instance is drawn from ONE area's pool by a seeded mulberry32
Fisher-Yates (the depot and the finish excluded), and carries:

- a day that starts at 08:00 NZDT on 2026-11-09, a five-minute door (a letterbox
  drop at 60 s for a fifth of the stops), and a capacity 10% above the day's own
  parcels, so the capacity is never the thing that fails;
- **time windows** on 35% of the stops, spread 08:00-13:00 and 90-150 minutes
  wide (the courier waits for a window to open, and a stop whose window closes
  before the arrival is a violation);
- **priorities** on 15% of the stops, which the engines must keep at the front of
  the day;
- a **30-minute break** that may start between 12:00 and 13:00, placed by the
  core's own scoring (never before the first or after the last stop, because
  there it would be free);
- a **finish point** that is not the depot, so the day's last leg is measured.

The 150- and 250-stop days are Christchurch city days: the other two areas hold
128 drawable addresses each and cannot host a 250-stop day.

## The engines and the one measuring stick

Every order - whoever produced it - is timed by the production core's own
`_build_plan` (`services/api/app/routing.py`): the windows, the break placement,
the capacity and the distance are read the way production reads them, so the
engines are compared on one stick and not on three private scoring functions.
The road matrix is injected at the documented seam (`_distance_m` /
`_travel_seconds`, patched in `app.routing` and `app.solver` where they are
imported by value); otherwise the path is the production path.

| Engine | Who | The budget |
| --- | --- | --- |
| `ours` | **the production engine**: `get_engine()` -> `PyVRPEngine` (ADR-009), priority stops planned as their own phase first | the production budget: 250 iterations, seed 0 |
| `pyvrp-long` | the SAME two-phase PyVRP model (`app.solver`'s own helpers, matrices, windows and hand-over pins) | a long `MaxRuntime`, seed 20261109 |
| `ortools` | OR-Tools' VRP solver (Apache-2.0), one vehicle, capacity and time dimensions, PATH_CHEAPEST_ARC + guided local search | the same long time budget |

**VROOM 1.15.0 is NOT here, and that is a recorded gap, not an omission:** there
is no Rust toolchain on the machine that built the set, the PyPI `vroom` package
is a stale product of the same name, and the BLAS-capable prebuilt distribution
could not be produced here. ADR-030 records the gap and what remains to verify;
the licence row is in `docs/product/LICENSES.md` so adopting it later needs no
new licence check.

## The measured numbers

<!-- MEASURED: the numbers the runner produced, filled in by the commit that
landed the set; the checker recomputes every one of them from the matrix. -->

OUR ENGINE, over the 144 instances: **{AVG}% over the baseline on average** (the
target: within 2%), **{WORST}% at worst** (the target: within 5%),
**{LEGAL} legal plans where a feasible plan exists** (the target: all of them),
and a **solve p95 of {P95}s at 150 stops** (the target: under 3s) - measured on
the runner's machine, whose exact CPU is recorded in the evidence. The per-size
and per-variant breakdown, the instances where no engine found a feasible plan
(the random windows can close a day), and the reproduction commands are in
`docs/evidence/routing-eval-280/`.

## How to rebuild the set

```bash
# 1. the pool: real LINZ addresses WITH geometry (needs LINZ_LDS_API_KEY in .env.local)
uv run python scripts/data/fetch-routing-pool.py
# 2. the tiles (once): the OSM extract, then Valhalla over it
#    curl -o data/osm/new-zealand-latest.osm.pbf <the Geofabrik NZ url>
#    docker run -v data/osm:/data -v data/valhalla:/custom_files -v data/valhalla_tiles:/valhalla_tiles \
#      valhalla/valhalla:run-latest sh -c 'valhalla_build_config --mjolnir-tile-dir /valhalla_tiles > /custom_files/valhalla.json \
#      && valhalla_build_tiles -c /custom_files/valhalla.json /data/new-zealand-latest.osm.pbf'
# 3. the committed set: the pool, the matrix (the service is started and waited
#    for), and the instances - deterministic, so a rebuild is byte-identical
node scripts/eval/build-routing-eval.mjs
# 4. the measurement: our engine and the two baselines (uv's eval extra: OR-Tools)
uv run --project services/api --extra eval python scripts/eval/run-routing-eval.py --budget-seconds 15
# 5. the gate: the set's shape, the determinism, every day re-derived from the
#    matrix, and the targets
node scripts/eval/check-routing-eval.mjs
```

The checker runs in CI (`quality-gates.yml`) and needs no network, no docker and
no Python: the set and the results are committed. Its own unit tests run with
the rest of `scripts/*/__tests__`.

## Licences

| What | Licence |
| --- | --- |
| the LINZ addresses (CC BY 4.0, sourced from the LINZ Data Service) | the pool |
| Valhalla 3.3.0 (MIT) | the matrix engine |
| OpenStreetMap via the Geofabrik NZ extract (ODbL) | the matrix's road network - the matrix is a derived database and carries the attribution |
| PyVRP (MIT), OR-Tools (Apache-2.0) | the engines |

Full rows with their URLs and read dates: `docs/product/LICENSES.md`.
