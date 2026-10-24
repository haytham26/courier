"""The GC-creep probe ADR-009 §2 cites: what creeps and what does not.

Run on 2026-10-24 (200-stop grid day, pyvrp 0.14.1, this machine), output:

    --- repeated solve() on the SAME data ---
    attempt 1: 1.53s
    attempt 2: 2.65s
    attempt 3: 5.94s
    --- fresh data build + solve() per attempt ---
    attempt 1: build 0.37s solve 5.98s
    attempt 2: build 0.37s solve 5.87s
    attempt 3: build 0.35s solve 6.04s

Reading: the DIRECT `ProblemData` build is flat (~0.37 s - no per-build Edge
storm; the `Model` helper's ~31k pybind11 `Edge` objects were the pre-engine
creep, measured by the earlier gc/perf probes), while repeated LONG solves in
one process still creep (1.53 -> 5.94 s over three 1000-iteration attempts) -
process-lifetime GC pressure from the solver's own per-iteration allocations.
At the production 250-iteration budget the benchmark's three in-process
attempts are flat (4.80 / 4.70 / 4.67 s in `benchmark.json`). This file is
the raw probe, kept verbatim as the evidence the ADR cites - it is not a
gate, and its road factor is the probe's own, not the core's. Re-run with
`uv run --directory services/api python ../docs/evidence/backend-solver/creep_probe.py`
from the repo root.
"""

# Decompose the creep: solve(same data) repeated vs fresh data builds per attempt.
import time
import uuid
from datetime import UTC, datetime

import numpy as np
from pyvrp._pyvrp import Client, Depot, Location, ProblemData, VehicleType
from pyvrp.solve import solve
from pyvrp.stop import MaxIterations

UNBOUNDED = int(np.iinfo(np.int64).max)

stops = [
    (lat, lon)
    for idx in range(200)
    for lat, lon in [(-43.5330 + (idx % 20) * 0.004, 172.6300 + (idx // 20) * 0.004)]
]


def build_data() -> ProblemData:
    n = len(stops)
    distances = np.zeros((n + 2, n + 2), dtype=np.int64)
    durations = np.zeros((n + 2, n + 2), dtype=np.int64)
    points = [(-43.5330, 172.6300), (-43.5330, 172.6300), *stops]
    for i in range(n + 2):
        for j in range(n + 2):
            if i != j:
                lat1, lon1 = points[i]
                lat2, lon2 = points[j]
                dlat = np.radians(lat2 - lat1)
                dlon = np.radians(lon2 - lon1)
                a = np.sin(dlat / 2) ** 2 + np.cos(np.radians(lat1)) * np.cos(
                    np.radians(lat2)
                ) * np.sin(dlon / 2) ** 2
                leg_m = 12742000 * np.arcsin(np.sqrt(a))  # already 1.4 road factor
                distances[i, j] = int(np.ceil(leg_m))
                durations[i, j] = int(np.ceil(leg_m / (30 / 3.6)))
    locations = [Location(x=lon, y=lat) for lat, lon in points]
    clients = [Client(location=2 + idx, service_duration=300, required=True) for idx in range(n)]
    vt = VehicleType(
        num_available=1, start_depot=0, end_depot=1, unit_distance_cost=0, unit_duration_cost=1
        , tw_early=0, start_late=0,
    )
    depots = [Depot(location=0, tw_late=UNBOUNDED), Depot(location=1, tw_late=UNBOUNDED)]
    return ProblemData(locations, clients, depots, [vt], [distances], [durations], [], [])


data = build_data()
print("--- repeated solve() on the SAME data ---", flush=True)
for attempt in (1, 2, 3):
    started = time.perf_counter()
    result = solve(
        data, MaxIterations(1000), seed=0, collect_stats=False, display=False
    )
    print(f"attempt {attempt}: {time.perf_counter() - started:.2f}s", flush=True)

print("--- fresh data build + solve() per attempt ---", flush=True)
for attempt in (1, 2, 3):
    started = time.perf_counter()
    fresh = build_data()
    built = time.perf_counter()
    result = solve(
        fresh, MaxIterations(1000), seed=0, collect_stats=False, display=False
    )
    print(
        f"attempt {attempt}: build {built - started:.2f}s solve {time.perf_counter() - built:.2f}s",
        flush=True,
    )
