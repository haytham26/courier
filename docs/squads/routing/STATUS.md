# Routing & Templates Squad - status

Updated: 2026-10-21 (T7.2 routing and the saved templates: the routing core, the template lock and the day's route)

## Done (with evidence)

- **The routing core** (`apps/api/app/routing.py`): the `RouteEngine` seam, the deterministic
  `HeuristicEngine` (a nearest-neighbour seed, then a 2-opt improvement), the arrival times, the
  distance, the capacity check and the `get_engine()` factory that is where the production engine
  goes. No routing engine, no matrix and no network: the plan is built from the stop coordinates.
- **The rules the engine honours**: the time windows (the courier waits for the window to open and
  a stop the courier cannot reach in time is flagged), the priorities (the priority stops keep the
  front of the day and the improvement never moves a stop across that line), the service time per
  stop over the default of the run, and the capacity of the van in parcels.
- **The template lock** (`PUT /runs/{run_id}/template`): the courier's own street order replaces the
  plan, the identity comes from the phone so the same template is stored once when it is replayed
  offline, and an order that is not exactly the run's stops is refused with a 422 and the reason.
- **The day's route** (`GET /shifts/{shift_id}/route`): the ordered stops with the arrival times,
  the distance, the parcels and the capacity; the locked template wins when the run has one, and the
  answer is the same every time it is asked.
- **The repository** (`apps/api/app/repo.py`): the runs, the templates and the ordered stops, in
  both implementations (Postgres and the in-memory one the tests use).
- **The schema** (`apps/api/db/schema.sql`): the `runs`, `run_templates`, `run_routes` and
  `run_route_stops` tables, and the priority, the parcels, the service time and the time window on
  the stops.
- **The shared contract** (`packages/shared/src/schemas.ts`, `packages/shared/src/types.ts`,
  `packages/shared/src/constants.ts`): the template update with its identity and its order, the
  route schema and the route endpoint.
- **The proof** (`apps/api/tests/test_routing.py`): 35 tests, 84 collected, one of them running
  fifty times.

## Metrics vs targets

| Metric | Target | Today | Evidence |
|--------|--------|-------|----------|
| 200 stops planned | 5 s | **0.10 s** (0.096 s to 0.102 s over five runs) | `test_two_hundred_stops_stay_inside_the_five_second_budget` |
| The same day, fifty times | the same answer | done | `test_the_plan_is_the_same_fifty_times_in_a_row`, `test_a_repeated_run_gives_the_same_answer` |
| The time windows | honoured | done | `test_the_courier_waits_for_the_window_to_open`, `test_every_arrival_is_inside_its_window` |
| The priority stops | first | done | `test_the_priority_stops_come_first` |
| The template lock | refuses an order that is not the run's | done | the four refusal tests |
| The template round trip | stored once, replayed | done | `test_the_same_template_sent_twice_is_stored_once` |
| The route endpoint | 401 without a token | done | `test_the_route_needs_a_token`, `test_the_template_lock_needs_a_token` |
| The coverage of the routing core | 90% (the V4 target) | 99% | `pytest --cov=app.routing` |
| The coverage of the API surface | 90% | 92% | `pytest --cov=app.main` |
| Within 5% of the best known | on the benchmark sets | **not measured** - the benchmark set does not exist yet | the evaluation dataset in the README |
| The production engine | PyVRP and VROOM, benchmarked against each other | **not wired** - it needs the routing service | `get_engine()` in `apps/api/app/routing.py` |
| The real road distance | the matrix | the great-circle distance times 1.25 | the production engine replaces it |

## Next

1. Build the evaluation dataset: a real Christchurch day (a founder-supplied manifest, redacted)
   and the published VRPLIB instances, loaded with `PyVRP/VRPLIB`.
2. Build the benchmark harness: the heuristic, PyVRP and VROOM on the same instances, with the gap
   to the best known, the time each engine took and the number of constraint violations.
3. Stand up the routing service (`services/routing`): a Valhalla or GraphHopper instance for the
   matrix, the `RoutingClient` interface the research decided on, and the PyVRP model behind the
   `RouteEngine` seam. The heuristic stays as the fallback.
4. Replace the road factor with the real road distance and the average speed with the van's own
   speeds, once the matrix is there.
5. Add the parts of T7.2 that are not in this slice: the mid-route re-optimisation ("make next"),
   the reverse, the manual grouping, the breaks and the vehicle profile.
6. Load the day's stops: `POST /shifts/{shift_id}/stops` is still a stub and belongs to the intake
   slice (T7.4), which writes the rows the routing engine reads.

## Risks

- **The production engine is not measured.** Every number above is the heuristic's, and the
  heuristic is not a VRP solver: it plans one van, it does not split the day, and its distance is an
  approximation. The "within 5% of the best known" target is unmeasured until the benchmark set
  exists.
- **The routing service does not exist**, so the seam has never been exercised with a real engine.
  The risk is that PyVRP or VROOM needs a shape the `RouteEngine` protocol does not have yet.
- **The run's `courier_id` and the token's `sub` have to be the same id space** for the ownership
  check on the two endpoints. The check refuses a run that belongs to another courier; if the phone
  sends a different id, the run is a 404.
- **The distance is an approximation.** The 1.25 road factor is a single number for the whole
  country: the real factor depends on the street, and the arrival times move with it.
- **The evaluation data needs founder-provided material** (a real shift day). Until then the
  benchmark uses the published instances and says so.
