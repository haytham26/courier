# Clean-room functional study — openrouteservice (GIScience)

**Method (V4 §11.2).** Read on 2026-10-20: the project README, the whole `docs/` tree (API
reference, run-instance/configuration, technical details), the Java modules `ors-api` and `ors-engine`
(request/response models, controllers, services, error handling, graph-preparation code), the test
suites (unit + container API tests), the changelog, and the open issue tracker + discussion board.
Only behaviour was extracted; no code, text, identifier, schema or asset from this GPL-3.0 project
enters our repository. Everything below is written as a requirement for **Courier Copilot**.

**What it is.** A self-hostable routing *server* in Java on a forked GraphHopper, reading OpenStreetMap
extracts, exposing several spatial endpoints over HTTP. Licence GPL-3.0; the client is a separate
repository. Latest release seen: 10.1.0 (2026-10-13).

**Why we study it.** We already run our own routing (Valhalla + VROOM + OR-Tools). ORS is studied
for *behaviour coverage*: what a production routing API is expected to have, what is genuinely useful
to a courier, and where the project itself admits weakness.

---

## 1. Feature families found

| # | Family | What it does |
|---|--------|--------------|
| F1 | Profiles / modes | Named vehicle profiles (car, heavy goods, cycling variants, walking, hiking, wheelchair, public transport), each with its own graph and speed model |
| F2 | Directions | Route between 2..N waypoints, three output encodings (JSON, GeoJSON, GPX), turn instructions, geometry, per-leg summary |
| F3 | Avoidance | Avoid named road features, arbitrary polygons, whole countries, and controlled/uncontrolled borders |
| F4 | Custom weighting | Per-request rules that scale speed and priority by road attributes and by named areas |
| F5 | Extra info & attributes | Per-segment route characteristics: surface, gradient, road class, toll, trail difficulty, access rights, country, green space, noise, shade, upstream way id, custom numeric column |
| F6 | Warnings | Route-level messages: access-restricted roads, toll roads, skipped segments, skipped extra data |
| F7 | Matrix | Many-to-many travel-time and travel-distance tables with optional source/destination subsets |
| F8 | Isochrones | Reachable-area polygons for one or many origins, by time or distance range, with area/reach/population attributes |
| F9 | Snapping | Move a raw coordinate onto the nearest routable edge, with the snap distance reported |
| F10 | Matching | Map-match points, lines and polygons onto the road graph (HMM for lines) |
| F11 | Graph export | Dump the routing graph of a bounding box as node/edge JSON or TopoJSON |
| F12 | Health & status | Readiness flag, engine build info, per-profile limits, enabled services, available languages |
| F13 | Route variants | Alternative routes, round trips of a target length, skipping chosen legs |
| F14 | Live data | Hot conditions (closed borders, restricted bridges/roads) fed from an external store into the weighting |
| F15 | Limits & errors | Documented HTTP statuses plus numbered internal error codes per service family |
| F16 | Operations | Graph build pipeline, preparation methods, elevation, border datasets, country speed tables, request logging, graph replication |
| F17 | Benchmarking | Load-test harness for directions and reachability with configurable concurrency |

---

## 2. Requirements — what our routing service must do

### 2.1 Profiles and modes (F1)

- **R-ORS-01** Our routing layer must expose named profiles, not a single drive mode: at minimum car/van, cargo bike/e-bike, motorcycle and walking, each with its own speed model and road-class
  eligibility. *Acceptance:* an unknown profile is rejected listing the valid names; a disabled profile is rejected with a distinct error.
- **R-ORS-02** Heavy-vehicle restrictions (length, width, height, axle load, total weight, hazardous goods) must be expressible per request and validated against the profile. *Acceptance:* an
  incompatible combination (cargo bike + axle load) is rejected, not silently ignored.
- **R-ORS-03** A profile may be unprepared for a feature (wheelchair attributes, custom weighting); requesting an unprepared feature must be reported, never silently dropped. *Acceptance:* the answer
  carries an explicit "requested but unavailable" marker naming the feature.

### 2.2 Directions (F2)

- **R-ORS-04** A directions request takes an ordered list of coordinates (≥2), a profile, and a preference among *fastest*, *shortest*, *recommended* and *custom*; the default is *recommended*.
  *Acceptance:* every answer reports total distance, total duration, a per-leg breakdown and a bounding box.
- **R-ORS-05** Geometry must be returnable as an encoded polyline (default), an explicit coordinate list, and a GPS exchange file usable by a navigation device; elevation may be appended to points.
  *Acceptance:* the GPS file opens offline with the same distance and duration as the JSON answer.
- **R-ORS-06** Turn instructions must be typed (left, sharp left, slight left, straight, keep left, keep right, roundabout in, roundabout out, right, sharp right, U-turn, depart, arrive) with a short
  text and the street name; roundabout exit bearings may be requested. *Acceptance:* each step carries its own distance and duration and the steps sum to the leg.
- **R-ORS-07** Distance units (m/km/mi) and instruction language must be selectable independently of the driver's app language. *Acceptance:* a miles driver sees miles and hears the turn in their own
  language with the street name in an NZ-English voice segment.
- **R-ORS-08** Waypoint snapping must be adjustable per waypoint (an explicit radius, or "largest possible"); a waypoint that cannot be snapped must fail loudly with its index, coordinates and the
  radius tried. *Acceptance:* one unsnappable waypoint does not destroy the result for the others.
- **R-ORS-09** Optional behaviours must exist: force the route to continue straight at a waypoint, filter the network by a bearing at the waypoint (bikes), cap the driver's own maximum speed, and
  suppress warnings. *Acceptance:* a simple two-point GET also exists for quick previews, with no body and no advanced options.

### 2.3 Avoidance (F3)

- **R-ORS-10** A request may exclude road features: motorways, toll roads, ferries, fords, and steps (last only for walking/bike/wheelchair). *Acceptance:* asking a car profile to avoid steps is
  an incompatible-parameter error; asking it to avoid tolls removes toll segments and says so.
- **R-ORS-11** A request may exclude named areas given as polygons, subject to a ceiling on both area and extent, and may exclude named countries or forbid crossing controlled borders while
  allowing open ones (countries accepted as numeric ids or ISO codes). *Acceptance:* exceeding the ceiling is rejected stating the limit and the supplied value; a route crosses no excluded country and no controlled border.

### 2.4 Custom weighting (F4)

- **R-ORS-12** A request may attach a *custom model*: ordered rules that scale edge speed and edge priority, plus a distance-influence setting expressing how many seconds of travel time a driver
  will trade for each extra kilometre. *Acceptance:* a rule that multiplies priority to zero removes
  those roads; a speed rule changes the reported duration while a priority-only rule changes route choice but not the duration of the chosen route.
- **R-ORS-13** Rule conditions must test road class, environment (bridge, tunnel, ferry), access, smoothness, roundabouts, network type and maximum speed, combined with boolean operators, and may
  reference a named polygon. *Acceptance:* an unknown variable returns a validation error naming it rather than evaluating to false; the engine publishes the available variables per profile.

### 2.5 Extra info and route attributes (F5)

- **R-ORS-14** A route answer may include per-segment characteristics: gradient steepness, a suitability score (1–10), surface, road category, road type, toll status, trail difficulty, the
  upstream way id, access restrictions, country, green-space rating, noise rating and shade rating.
  *Acceptance:* for each characteristic the answer returns the contiguous stretches sharing a value **and** a summary of total length and percentage per value.
- **R-ORS-15** Each characteristic must be declared per profile; asking for one the profile cannot supply returns success with an explicit warning, never an empty or invented block.
  *Acceptance:* a car profile asked for wheelchair data gets the warning, not silence.
- **R-ORS-16** Route segments may carry an average speed, a detour factor against the straight-line distance, and the segment's share of the total length. *Acceptance:* an operator may also attach an
  arbitrary numeric column to upstream ways and get it per stretch; a column that was never loaded is rejected naming the missing column.

### 2.6 Warnings (F6)

- **R-ORS-17** A route answer must carry a warning list with a numeric code and a human message: (1) the route uses a road with access restrictions, (2) the route uses a toll road, (3) requested
  legs were skipped, (4) requested extra information was unavailable. *Acceptance:* a restricted-road route returns code 1 **and** the affected stretches; suppressing warnings is an explicit, visible request option.

### 2.7 Matrix (F7)

- **R-ORS-18** A matrix request takes a list of locations and returns travel time and/or distance for every source/destination pair; sources and destinations may each be a subset.
  *Acceptance:* the answer reports, per row/column, the snapped position and the snap distance, and the distance from a location to itself is zero.
- **R-ORS-19** A pair that cannot be routed must be reported as *unreachable* while the remaining pairs are still computed. *Acceptance:* one unreachable island location yields "unreachable" for
  that pair only — **we must not reproduce the studied service, which nulls the entire matrix** (issue #1785).

### 2.8 Isochrones (F8)

- **R-ORS-20** Reachability polygons are computable for one or many origins, by time or distance range, with either one range plus an interval or an explicit list of ranges, in GeoJSON.
  *Acceptance:* a multi-origin request returns one polygon set per origin, each carrying its range.
- **R-ORS-21** A reachability answer may carry the polygon area, a reachability score (0–1) defined as the polygon area over the area of an equivalent circle at the average speed, and a population
  total; polygon output must be controllable with an overlap flag and a smoothing factor (0–100). *Acceptance:* smoothing is monotonic — a higher factor never returns more vertices than a lower one.

### 2.9 Snapping and matching (F9, F10)

- **R-ORS-22** A standalone snapping operation moves raw coordinates to the nearest usable road edge for a profile, given a search radius, and returns the snapped coordinate, the road name and the
  distance moved, in the input order. *Acceptance:* a coordinate with no road inside the radius returns an explicit empty entry at its position; the others are unaffected.
- **R-ORS-23** Points, lines and polygons supplied by the caller can be matched onto the routing graph: points snap, lines use a hidden-Markov method, polygons by intersection, and the caller may
  require the matched edge to be of a named kind. *Acceptance:* a feature that matches nothing returns an empty edge list at its position, not a global failure.

### 2.10 Graph export (F11)

- **R-ORS-24** An operator may export the routing graph of a bounding box as node/edge JSON (with a per-edge travel time) or TopoJSON, optionally with real edge geometry and annotated with the
  upstream way id, direction bidirectionality, per-direction speeds and distances. *Acceptance:* internal graph edge ids are documented as unstable across rebuilds, and any
  identifier we publish is either stable or explicitly documented as volatile.

### 2.11 Health, status and metadata (F12)

- **R-ORS-25** Every answer carries a metadata block: attribution, service name, server timestamp, the echo of the normalised request, and engine version, build date and graph date.
- **R-ORS-26** A readiness endpoint reports exactly two states — still preparing graphs, or ready — so a load balancer never sends traffic to a half-built instance. *Acceptance:* our API stays
  "not ready" while the offline address slice loads and the phone keeps working from cache.
- **R-ORS-27** A status endpoint reports the available languages, the engine version, and per profile: the encoder name, the usable variables, the date of the underlying map data, the build
  date, the enabled extra-data stores and the configured limits (max distance, max waypoints, max distance with live weights, max distance with avoid areas).
  *Acceptance:* our dashboard can answer "which map data is the app using right now?" without a database query.

### 2.12 Route variants (F13)

- **R-ORS-28** A request may ask for alternative routes, bounded by a target count, a maximum cost factor relative to the optimal route and a maximum share of path segments with it; the number of
  alternatives is capped by configuration. *Acceptance:* the cap is enforced and reported.
- **R-ORS-29** A request may ask for a round trip of a preferred length with a given number of anchor points and an optional seed (the returned length may differ), and may name individual legs to
  skip. *Acceptance:* a request whose only leg is skipped returns a warning and no route geometry, not a malformed empty route.

### 2.13 Live data (F14)

- **R-ORS-30** The engine must be able to consume *live* conditions that change the weighting — a closed border, a restricted bridge, a restricted road — without rebuilding the graph.
  *Acceptance:* the live layer is fetched periodically, applied to a defined dataset list per profile, and its freshness is observable; a profile not prepared for live data must not silently ignore the dataset.

### 2.14 Limits and errors (F15)

- **R-ORS-31** Every service family must have a numbered, documented internal error code plus a human message, and the transport status must follow a fixed vocabulary: success, bad request, not
  found / no result, method not allowed, payload too large, internal error, not implemented, service
  unavailable. *Acceptance:* a client distinguishes "no route exists" from "your request was invalid" from "the server is overloaded" without parsing prose.
- **R-ORS-32** Hard limits must be enforced and reported: maximum route distance, maximum waypoints, maximum distance with live weights, maximum distance with avoid areas, maximum alternatives, maximum
  avoid-polygon area and extent, maximum matrix locations, maximum lookup batch. *Acceptance:* exceeding a limit returns the limit and the supplied value, never a truncated answer.

### 2.15 Operations (F16)

- **R-ORS-33** The service must build its own routing graph from a map extract per profile, and support elevation, way names in the graph, contraction-hierarchy and landmark preparation,
  acceleration modelling, turn costs and per-profile preparation weights.
- **R-ORS-34** Country-specific speed defaults and country border geometry must be loadable as data, and an operator must be able to load a graph from a remote repository and know the graph version
  compatibility before serving. *Acceptance:* a graph built by an incompatible engine version is refused at start-up naming the expected and actual versions, instead of failing at the first request.

### 2.16 Benchmarking and observability (F17)

- **R-ORS-35** A load-test harness must exist for the directions and reachability endpoints, with configurable concurrency, batch sizes, ranges and coordinate sets, producing response-time and
  throughput metrics. *Acceptance:* the same harness runs against our service and any candidate engine, so the comparison uses one method.

---

## 3. Data fields our routing API must expose

| Field | Meaning | Notes for us |
|-------|---------|--------------|
| route id | opaque identifier of the computed answer | traceability in logs |
| distance (m) / duration (s) | total length and travel time | source of the IRD logbook distance and of the ETA |
| leg index / leg distance / leg duration | which stop pair a leg serves | "how long until the next stop" |
| leg geometry | encoded polyline | drawn on the MapLibre map |
| step type / instruction / street name | typed turn and its text | spoken to the driver |
| step distance / duration | per-step values | drives the 150 m and 30 m whispers |
| snapped coordinate / snap distance | where the raw coordinate landed, and how far it moved | door-memory candidate and confidence input |
| warning code + message | route-level cautions | spoken as a whisper, never a pop-up while driving |
| extra values (per stretch) + summary | surface, gradient, toll, access, country, … | server-side; only what the driver asks for is sent to the phone |
| profile / engine / data date | provenance | observability and bug reports |

**Driver-facing translation.** The phone never receives the full extra-info payload. It needs:
total ETA, ETA to next stop, distance to next stop, the next instruction, the next stop's address,
and any warning worth speaking. Everything else stays server-side.

---

## 4. What users complain about (from the issue tracker)

| Complaint (issue) | Our answer |
|---|---|
| A single unroutable location nulls the whole travel-time matrix (#1785) | R-ORS-19: unreachable pairs are per-pair, never global |
| "Could not find routable point" between a hosted and a self-hosted instance with identical coordinates (#1968) | R-ORS-27 + R-ORS-32: status publishes the map-data date and the snapping limits; the app shows "map data is from <date>" |
| Travel times on single-lane roads are unrealistically fast (#1806) | We own the speed model: per-road-class tables plus speeds learned from the driver's own GPS trace (V4 §11.1 item 7) |
| Snapping behaves differently on every endpoint — different parameter names, different defaults (#1798) | One snapping policy for the whole product: one default radius, one per-request override, one error message |
| Turn restrictions on a way are ignored (#2089) | Turn costs must be enabled and verified in our benchmark set |
| The route crosses a road the driver cannot legally use, with no warning | R-ORS-17: access restrictions become a spoken whisper before the turn |
| The route implies driving the wrong side of the road (#1781) | Recorded as UNVERIFIED relevance for NZ; couriers drive on the left and the case cannot occur |
| Areas mapped as multi-polygons are not routed on, producing "aerial jumps" (#1944, #2100) | Keep avoid-polygons but do not promise interior routing; the case is not on the critical path |
| A long run of reachability requests can hang the server (#1897) | Every long-running job gets a deadline and a cancellation path (V4 §6.2) |
| Wheelchair routing ignores separately mapped footpaths (#2152) | Skipped: a courier app is not an accessibility-navigation product |
| Public-transport schedules from timetable files fail to load (#2186) | Skipped: no public-transport routing in the courier product |

---

## 5. How we will do it better

1. **Warnings become speech.** ORS surfaces access restrictions as a warning block in a JSON
   response. We turn them into a spoken whisper before the relevant turn, in the driver's language,
   ≤ 8 words while moving (FINAL_PROMPT §4.2). No routing API makes this product decision.
2. **The route is the driver's plan, not a black box.** Our optimiser owns the stop order (template
   + rules + VROOM), so the routing engine only answers leg times. ORS treats the waypoint list as
   authoritative; we treat it as a suggestion the optimiser may improve.
3. **Speeds are learned per driver.** ORS publishes one static speed model per country and road
   class. We calibrate ours from the driver's own trace and expose the calibration's age.
4. **Offline-first.** ORS is a server; every route needs a round trip. Our server returns a full plan
   cached on the phone; the phone can re-order, re-time and re-speak with no network.
5. **No licence contamination.** ORS is GPL-3.0. We implement these *behaviours* on Valhalla / VROOM
   / OR-Tools under our own architecture; no ORS code, text, identifier or asset enters this
   repository (V4 §2 licence gate, `docs/LICENSES.md`).
6. **Error semantics first.** ORS's numbered per-family error codes are the right idea; we adopt the
   concept with our own typed error taxonomy, so the phone can speak "I can't route that one"
   instead of showing a stack trace.

---

## 6. UNVERIFIED / not covered

- **UNVERIFIED:** production latency and throughput of the studied service — the repository publishes a benchmarking *harness*, not reproducible numbers for our hardware.
- **UNVERIFIED:** the hosted API's daily and per-minute quotas (stated in the FAQ as 2 000/day and 40/minute for directions). They are the hosted operator's plan, not a property of the software, and we do not depend on them — we self-host.
- **UNVERIFIED:** the behaviour of the elevation, traffic and heat-stress extensions beyond the configuration surface; the repository documents the switches but we did not run the graphs.
- **Not studied:** the separate client application, and the hosted geocoder, optimiser, point-of-interest and elevation services — they are different repositories.
