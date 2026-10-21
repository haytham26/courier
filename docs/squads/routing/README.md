# Routing & Templates Squad

**Mission:** Build the day's route in one tap from the driver's own template, and re-optimise without ever blocking the van.

**Code:** `apps/api/app/routing.py` (the routing core), `apps/api/app/main.py` (the two endpoints), `apps/api/app/repo.py` (the templates and the ordered stops), `apps/api/db/schema.sql` (the tables), `apps/api/tests/test_routing.py` (the proof)

**Tasks:** T7.2 routing, templates and rules

## Targets (the release gate)

- within 5% of the best-known solution on the benchmark sets
- 200 stops routed <= 5 s
- a template rebuilds a day in one tap

## The decision (T7.2, taken 2026-10-21)

| Piece | Choice | Why |
|---|---|---|
| The seam | the `RouteEngine` protocol in `apps/api/app/routing.py` | one interface, so the engine can be swapped without touching the API, the repository or the tests |
| The engine that runs today | `HeuristicEngine`: a nearest-neighbour seed, then a 2-opt improvement | no routing engine, no matrix and no network, so the CI (which has no Valhalla, no GraphHopper and no OSRM) can prove the plan end to end |
| The production engine | PyVRP with VROOM, over a Valhalla or GraphHopper matrix | the research found PyVRP the best licence, installability and reproducibility, and VROOM the richest constraint model; both take our own matrix |
| The router | GraphHopper for the instructions and the map matching, Valhalla for the truck costs, the matrix and the IRD trace, OSRM as the matrix accelerator | the research decision of 2026-10-20 (`docs/squads/routing/decisions.md`) |
| The fallback | the heuristic, returned by `get_engine()` | the day is still built when the routing service is down or slow |
| The distance today | the great-circle distance times a road factor of 1.25 | an honest approximation while there is no matrix; the production engine returns the real road distance |

**Why the production engine is not wired yet.** It needs the routing service (`services/routing`), and that service does not exist: it needs a Valhalla or GraphHopper instance, a matrix build and a PyVRP model. The CI has no such service, and the tests must not make network calls, so the seam is in place and the production engine is not. Swapping it in is one class and one line in `get_engine()`; nothing else in the product changes.

The research that decided the engines is `docs/research/2026/routing-vrp-engines.md` (2026-10-21, 30 evidence cards). The decisions this squad owns are in `docs/squads/routing/decisions.md`.

## The algorithm

The engine plans a run from the stop coordinates and the run's constraints. It never calls out to
anything, so the same input always gives the same answer.

**1. The seed (nearest neighbour).** From the depot, the closest stop that can still be reached in
its time window is taken next. The tie is broken by the stop id, so the seed is deterministic. When
no stop can be reached in its window, the most urgent one (the earliest closing time) wins, so the
day loses as little time as it can.

**2. The improvement (2-opt).** A stretch of the order is reversed when that shortens the day. The
move is refused when it would break a time window the seed respected, so the improvement never makes
the day worse for the courier. The scan uses the usual "don't look" bits, so the work stays small in
practice: 200 stops are planned in a tenth of a second.

**3. The groups.** The priority stops are planned first and the ordinary stops after them, and the
2-opt never moves a stop across that line. This is the same rule the intake graph already applies
(`apps/api/app/sequencing.py`): the priority stops jump the queue but keep their relative order.

**4. The timings.** The arrival time is when the delivery *starts*: the courier waits for the window
to open rather than knocking early. The service time is the stop's own when it has one, the run's
default otherwise (five minutes). The distance is the great-circle distance times the road factor;
the travel time is that distance at the van's average speed (30 km/h by default).

**5. The capacity.** The plan carries the parcels of the day and the capacity of the van, and says
plainly when the load is over the capacity. The heuristic plans one van, so it never splits the
day: that is the job of the VRP solver.

**6. The determinism.** The same stops and the same constraints give the same order, the same
arrival times and the same distance. `apps/api/tests/test_routing.py` proves it by running the plan
fifty times and comparing the answers, and again with the `repeat(50)` marker.

## The API

Two endpoints, both behind the verified principal (`apps/api/app/auth/jwks.py`): a request without a
valid token is a 401, and a run that belongs to another courier is a 404.

### `PUT /runs/{run_id}/template` - the Master Template Lock

The courier's own street order replaces the plan. The identity is generated on the phone, so the
same template is stored once when it is replayed after the shift, and the same saved template can be
applied to another day's run.

```json
{
  "template_id": "6f1a2c34-9b0e-4a7f-9d21-2f7a5c8e0b31",
  "segments": [{ "street_key": "hornbby:wright st", "direction": "asc" }],
  "stop_order": ["9d2f...", "1a7c...", "44b0..."]
}
```

The order has to hold exactly the run's stops. Anything else is a 422 with the reason: a stop that
is in the order twice, a stop that is not in the run, or a stop that is in the run but not in the
order. The template replaces the run's street order, and the stored plan is dropped so the next
request rebuilds it from the new order.

### `GET /shifts/{shift_id}/route` - the day's route

The ordered stops with the arrival times, for the phone.

```json
{
  "shift_id": "1c9e...",
  "run_id": "7b30...",
  "engine": "template-lock",
  "locked": true,
  "template_id": "6f1a2c34-9b0e-4a7f-9d21-2f7a5c8e0b31",
  "total_distance_m": 18420.5,
  "total_duration_s": 9120.0,
  "parcels": 42,
  "capacity_parcels": 200,
  "over_capacity": false,
  "window_violations": 0,
  "unroutable_stop_ids": [],
  "stops": [
    {
      "stop_id": "9d2f...",
      "sequence": 1,
      "lat": -43.5401,
      "lon": 172.6002,
      "arrival_at": "2026-10-21T08:12:31+00:00",
      "departure_at": "2026-10-21T08:17:31+00:00",
      "distance_m": 1420.2,
      "cumulative_distance_m": 1420.2,
      "late": false
    }
  ]
}
```

The locked template wins when the run has one; otherwise the route is planned from the stops. The
answer is the same every time it is asked: the plan is stored with the run and reused while the
stops have not changed. A stop without a pin cannot be placed; it is named in
`unroutable_stop_ids` and the rest of the day is still planned.

## The data model

`apps/api/db/schema.sql`:

| Table | What it holds |
|---|---|
| `runs` | one courier's day: the shift, the depot, the capacity of the van, the average speed and the start of the shift |
| `run_templates` | the locked template of the run: the client-generated identity, the street segments and the locked order of the stops |
| `run_routes` | the plan: the engine, the distance, the duration, the parcels, the capacity and the number of window violations |
| `run_route_stops` | the ordered stops of the plan, with the arrival and departure times and the distance of each leg |
| `stops` | the day's stops, with the priority, the parcels, the service time and the time window the routing engine needs |

The repository contract is in `apps/api/app/repo.py`, in both implementations: `SqlAlchemyRepo`
(Postgres) and `InMemoryRepo` (the tests, no database).

## The performance budget

| Measure | Target | Today | Evidence |
|---|---|---|---|
| 200 stops planned | 5 s | **0.10 s** (0.096 s to 0.102 s over five runs, this machine) | `test_two_hundred_stops_stay_inside_the_five_second_budget` |
| The same day twice | the same answer | proven fifty times in a row | `test_the_plan_is_the_same_fifty_times_in_a_row`, `test_a_repeated_run_gives_the_same_answer` |
| The template rebuild | one tap | the plan is built from the locked order and stored with the run | `test_the_route_follows_the_locked_template` |
| Within 5% of the best known | on the benchmark sets | **not measured** - the benchmark set does not exist yet | the evaluation dataset below |
| The distance of the day | the real road distance | the great-circle distance times 1.25 | the production engine replaces it |

The 5 s budget is measured on the heuristic, not on the production engine. The budget the production
engine has to meet is the same one, with the matrix build inside it.

## The acceptance counts

| Check | Count | Command |
|---|---|---|
| The routing tests | 35 tests, 84 collected (one of them runs 50 times) | `uv run --directory apps/api pytest tests/test_routing.py -q` |
| The whole API suite | 140 tests | `uv run --directory apps/api pytest -q` |
| The coverage of the routing core | 99% | `pytest --cov=app.routing` |
| The coverage of the API surface | 92% | `pytest --cov=app.main` |
| Lint | zero errors | `uv run --directory apps/api ruff check .` |
| Types | zero errors | `uv run --directory apps/api mypy .` |

The SQL half of the repository is not covered by the tests: the tests use the in-memory repository,
with no database and no network, as the rules require.

## Evaluation dataset / benchmark

`docs/squads/routing/eval/` - to be built, and it has to exist before the production engine is
chosen (the working agreement, rule 1):

- a real Christchurch day (a founder-supplied manifest, redacted) with the stop order the courier
  actually drove;
- the published instances (VRPLIB: Solomon, CVRP, RC208) loaded with `PyVRP/VRPLIB`;
- the benchmark harness: the heuristic, PyVRP and VROOM on the same instances, with the gap to the
  best known, the time each engine took and the number of constraint violations;
- the fifty-day replay: the same day, fifty times, with the order and the arrival times compared.

## Research

- `docs/research/2026/routing-vrp-engines.md` - V4 §3: >= 5-10 candidates compared, the decision and its fallback written down.
- `docs/research/2026/navigation-turn-by-turn.md` - the turn-by-turn the router feeds.

## Working agreement

1. The benchmark exists **before** the library is chosen.
2. Every change to the squad's code updates this directory: the status, the metric and the evidence link.
3. A regression in a target blocks the merge (Release Manager role, V4 §1).
4. Two independent review passes for the critical squads (auth, payments, sync, address, voice, routing).

## Files

- `STATUS.md` - done with evidence, metrics vs targets, next, risks.
- `research.md` - the 2026 research note for this niche (or a pointer to `docs/research/2026/`).
- `decisions.md` - the ADRs this squad owns.
- `benchmarks/` - the benchmark harness and its results.
