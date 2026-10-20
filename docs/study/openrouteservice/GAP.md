# Gap analysis — openrouteservice (GIScience) → Courier Copilot

**Status key:** `Have` (we already ship it) · `Better` (we do it better than the market / than the
studied project) · `Planned (task)` (in the V3/V4 task list) · `Skip (reason)`.
**Task ids:** T4 LINZ data · T5 offline maps · T6 design · **T7.1** sync engine · **T7.2** routing,
templates, rules · **T7.3** door memory · **T7.4** dictation · **T7.5** live voice agent ·
**T7.6** voice tool catalog · **T7.7** driving mode · **T7.8** label scan · **T7.9** POD ·
**T7.10** customer SMS · **T7.11** IRD logbook · **T7.12** dashboard/admin · **T7.13** billing ·
**T7.14** team/franchise · **T7.15** PIA, store, handover.

This table merges into `docs/PARITY.md`. Every `Skip` carries a one-line reason. No row may be
claimed without evidence in `docs/evidence/`. "Acceptance" states how the row is proved.

---

## A. Routing core — profiles, modes, geometry (ORS F1, F2, F9, F10, F13)

| # | Feature | Status | Our edge / reason | Task | Acceptance |
|---|---------|--------|-------------------|------|-----------|
| A1 | Multiple routing profiles (car/van, cargo bike/e-bike, motorcycle, foot) | Planned (task) | Valhalla car/bicycle/pedestrian/custom profiles behind one adapter | T7.2 | A profile switch changes the returned ETA for the same stop set on the CI emulator |
| A2 | Heavy-goods dimension, weight and axle-load restrictions | Skip (reason) | Courier vans stay inside normal limits; no customer asks for axle-load routing | — | — |
| A3 | Hazardous-goods routing | Skip (reason) | We do not carry dangerous goods; the special road classes are irrelevant in NZ | — | — |
| A4 | Fastest / shortest / recommended preference per call | Better | The objective comes from the driver's own rules and template, not from a per-call switch | T7.2 | A template rebuild produces the same order twice for the same day and stop set |
| A5 | Per-waypoint snapping radius and an explicit unsnappable failure | Better | One snapping policy across the whole product (fixes ORS issue #1798); the failure names the stop, never a raw coordinate | T7.2 | A stop on a private track produces a spoken "can't reach that one" and the rest of the day survives |
| A6 | Force the route to continue straight at a waypoint | Skip (reason) | No courier flow needs a forced no-U-turn; it is a parameter without a driver-facing use | — | — |
| A7 | Bearing filter on the waypoint (bike-only) | Skip (reason) | Only meaningful for bicycle navigation; the bike profile is a fallback, not a product | — | — |
| A8 | Driver-set maximum speed on the whole route | Better | Our speed model is learned per driver and per road class, so a static cap adds nothing | T7.2 | Learned speeds change the ETA for the same route after enough drives |
| A9 | Avoid road features (motorway, toll, ferry, ford, steps) | Planned (task) | Expressed as a driver rule in plain language and applied offline from the template | T7.2 | "avoid the motorway" changes the plan and is listed in the day's rules |
| A10 | Avoid arbitrary polygons (areas) | Planned (task) | Used for team territories and temporary closures; stored as PostGIS polygons | T7.14 | A polygon over a suburb keeps the day's stops outside it |
| A11 | Avoid whole countries / controlled borders | Skip (reason) | Canterbury deliveries have no cross-border requirement | — | — |
| A12 | Free-form custom weighting rules per request | Planned (task) | Our rules are structured driver rules translated into engine constraints, not user-authored expressions | T7.2 | "school zone before 8:30" appears in the rule list and changes the order |
| A13 | Named-area rules that apply inside a polygon | Planned (task) | The same rule model; a zone polygon becomes a driver rule | T7.14 | A zone rule and a free-text rule behave identically in the optimiser |
| A14 | Alternative routes with a cost factor and a shared-segment factor | Skip (reason) | A courier needs one committed plan, not alternatives to choose from while driving | — | — |
| A15 | Round-trip generation to a target length | Skip (reason) | No courier flow generates loops; round trips come from saved templates | — | — |
| A16 | Skipping individual legs of the requested sequence | Skip (reason) | The optimiser owns the sequence; per-leg skipping is internal, not a driver action | — | — |
| A17 | Standalone snapping operation with the road name and snap distance | Planned (task) | Converts a LINZ point into a road-accessible point and seeds door memory | T7.3 | The learned entry point differs from the street centroid by the recorded snap distance |
| A18 | Map matching of GPS traces (points, lines, polygons) | Planned (task) | Required for the IRD logbook: match the driven trace to roads for kilometres and per-segment speed learning | T7.11 | The logbook kilometre count differs from the raw trace length by a documented factor |
| A19 | Matching restricted to a named edge kind (bridge, border) | Skip (reason) | We match to the road network as a whole; kind filtering adds nothing in NZ | — | — |
| A20 | Route geometry as an encoded polyline (default), GeoJSON, or GPX | Planned (task) | Polyline for the map, GPX for export to a navigation device, GeoJSON for the dashboard | T7.2 / T7.12 | The GPX opens in a navigation app with the same distance and duration |
| A21 | Elevation appended to geometry points | Skip (reason) | Canterbury couriers gain no action from altitude and it inflates the phone payload | — | — |
| A22 | Ascent and descent in the route summary | Skip (reason) | Hill statistics are not a courier need and would distract the driver screen | — | — |
| A23 | Turn-by-turn instructions with typed manoeuvre, street name, per-step distance and duration | Better | The assistant speaks ≤ 8 words while moving and reads the door note on arrival; the screen only confirms | T7.5 / T7.7 | Every step in a 50-stop day has a spoken instruction under the word limit |
| A24 | Roundabout exit bearings | Skip (reason) | Too fine-grained for a courier at speed; the spoken instruction is enough | — | — |
| A25 | Plain-text vs verbose instruction rendering | Better | We ship one plain-text instruction form designed for speech, plus a structured turn type for the UI | T7.5 | The instruction reads naturally aloud for NZ street names and abbreviations |
| A26 | Instruction language selectable per request | Better | Instructions are produced in the driver's language and the street name is spoken in an NZ-English voice segment | T7.5 | A driver set to Arabic hears the turn in Arabic and the street name in English |
| A27 | Distance units selectable (m / km / mi) independent of profile | Planned (task) | The driver's unit setting (NZ: km) applies everywhere including ETA and the logbook | T7.6 / T7.11 | A driver set to miles sees miles in every spoken and written distance |
| A28 | Simple two-point GET for a quick preview | Skip (reason) | Our phone never previews a single route outside the planning flow; the web dashboard calls the same plan endpoint | — | — |
| A29 | Route request echo (profile, options, units, language) in the answer metadata | Better | Request ids are traceable end-to-end and attribution is rendered in app and web (V4 §6.2) | T7.1 / T7.15 | A bug report from a driver can be traced to one engine call by request id |
| A30 | Bounding box of the answer | Skip (reason) | We never draw a whole-route bounding box; the map follows the vehicle | — | — |
| A31 | Structured manoeuvre object per step (type, location, bearing, exit) | Planned (task) | Powers the map arrow and the spoken turn without parsing prose | T7.5 / T7.7 | The map arrow and the spoken turn always agree |
| A32 | Answer without geometry (ETA-only) | Better | A light "ETA + distance + next turn" answer is used for quick re-planning and costs a fraction of the payload | T7.2 | The light answer is under 1 kB for 50 stops |
| A33 | Geometry simplification of the route line | Skip (reason) | We simplify at render time on the phone; the server keeps the exact geometry for the logbook | — | — |
| A34 | Per-request unit system applied to distance but never to duration | Better | Our unit setting changes only distances; durations stay in seconds internally and are spoken in minutes | T7.6 | A miles driver hears "about 12 minutes" and sees "0.7 miles" |

## B. Route information, warnings and extra data (ORS F5, F6)

| # | Feature | Status | Our edge / reason | Task | Acceptance |
|---|---------|--------|-------------------|------|-----------|
| B1 | Per-segment road surface | Planned (task) | Server-side only; the driver gets a spoken answer only when asked | T7.2 | "is this road sealed?" is answered from the route, in one tap |
| B2 | Per-segment gradient steepness | Skip (reason) | Gradient has no courier action in a flat delivery city | — | — |
| B3 | Per-segment road class and category | Planned (task) | Used to justify "why is this stop 6 km away" and to classify unsealed access streets | T7.2 | The detour explanation names the street class that caused it |
| B4 | Toll-road flag per segment | Skip (reason) | NZ has no toll roads, so the flag can never fire | — | — |
| B5 | Access-restriction information per segment | Better | Becomes a spoken whisper before the relevant turn | T7.7 | A private-road approach is spoken before the driver commits to it |
| B6 | Trail difficulty per segment | Skip (reason) | Walking and hiking only | — | — |
| B7 | Upstream map way identifier per segment | Skip (reason) | We key everything on our own address ids and stop ids; upstream ids add no product value | — | — |
| B8 | Country identification per segment | Skip (reason) | A single-country delivery area | — | — |
| B9 | Green-space / noise / shade / suitability ratings | Skip (reason) | Leisure and wellness metrics with no courier use case; they would bloat the payload | — | — |
| B10 | Custom numeric attribute attached to ways (CSV-style) | Planned (task) | Used for our own per-road learned scores (congestion, kerbside difficulty) | T7.2 | A learned score changes the plan on a repeat run of the same template |
| B11 | Per-value length and percentage summary for each extra attribute | Planned (task) | Powers the "40 % of this run is unsealed" style summary on the day screen | T7.2 | The summary is spoken on request and matches the per-segment data |
| B12 | Access-restriction warning on the route | Better | Spoken as a whisper, not buried in a JSON response | T7.7 | The warning is spoken before the turn, once, and never interrupts a dictation |
| B13 | Toll-road warning | Skip (reason) | Can never fire in NZ | — | — |
| B14 | Warning that requested extra data was unavailable | Better | The app states "map data for that street is old" instead of silently showing nothing | T7.5 | A stale suburb produces a visible chip, not a blank row |
| B15 | Per-segment average speed, detour factor, length share | Planned (task) | Detour factor drives the "this stop is 8 km out of the way" decision at re-optimisation time | T7.2 | The app can name the stop that costs the most extra distance |
| B16 | Warning that some requested legs were skipped | Skip (reason) | Our optimiser never silently drops a stop; a drop is an explicit, spoken action | — | — |
| B17 | Per-profile declaration of which extra data exist | Better | The phone asks for only what it can render, and the server refuses the rest with a typed error | T7.6 | The voice tool catalogue has no action that requests unavailable extra data |
| B18 | Per-request suppression of the warning list | Better | The assistant can be told to stay silent about a known restriction ("don't mention the gate again") without changing the route | T7.5 | A suppressed warning still appears in the log but is not spoken twice |
| B19 | Extra-data availability published per profile | Better | Our availability table is generated from the same config the engine loads, so it cannot drift | T7.2 | A config change is reflected in the availability table on the next deploy |

## C. Analytics services (ORS F7, F8, F11)

| # | Feature | Status | Our edge / reason | Task | Acceptance |
|---|---------|--------|-------------------|------|-----------|
| C1 | Many-to-many travel-time and distance matrix | Better | ORS nulls the whole matrix when one pair fails; we mark only the unreachable pair | T7.2 | One unreachable stop keeps every other pair numeric |
| C2 | Matrix with source/destination subsets | Better | The optimiser asks only for the pairs it needs, in one call, cached per day | T7.2 | A 200-stop optimisation makes one matrix call, not 200 |
| C3 | Reachability polygons by time or distance range | Skip (reason) | Territory planning is a dispatcher product we do not have; a population raster is out of budget | — | — |
| C4 | Reachability area, reach score and population attributes | Skip (reason) | Follows C3; no population dataset is licensed or imported | — | — |
| C5 | Reachability polygon smoothing and overlap intersections | Skip (reason) | Follows C3 | — | — |
| C6 | Reachability computed from a destination instead of a start | Skip (reason) | Follows C3 | — | — |
| C7 | Routing-graph export as node/edge JSON or TopoJSON | Skip (reason) | We do not publish or re-distribute a routing graph; only map tiles and the address index ship | — | — |
| C8 | Graph export annotated with upstream ids, speeds and distances | Skip (reason) | Follows C7 | — | — |
| C9 | Matrix that reports the snapped position and the street name for every location | Planned (task) | Lets the app explain "Harewood Road" as the road each stop snapped to, and to score the snap quality | T7.2 | Every stop carries its snapped street name and snap distance |
| C10 | Matrix metrics selectable (time only, distance only, both) and distance unit selectable | Better | The optimiser asks for time only; the logbook asks for distance too; the driver's unit applies | T7.2 | The optimisation call carries no distance column |
| C11 | Per-pair unreachable marker | Better | ORS nulls the whole matrix; we mark one pair and keep the rest | T7.2 | A stop on an island service road produces one "unreachable" pair |

## D. Service operations, errors and observability (ORS F12, F14–F17)

| # | Feature | Status | Our edge / reason | Task | Acceptance |
|---|---------|--------|-------------------|------|-----------|
| D1 | Readiness endpoint (preparing / ready) | Planned (task) | The API must refuse traffic until the address slice and the routing data are loaded | T7.1 | A cold API answers "not ready" and the phone keeps working from cache |
| D2 | Status endpoint: engine version, map-data date, profiles, limits | Planned (task) | The app and the dashboard must answer "which data are we using right now?" | T7.12 | The dashboard shows the map-pack date and the engine version |
| D3 | Documented transport status vocabulary | Better | A typed error taxonomy the phone turns into one spoken sentence | T7.6 | Every API error maps to exactly one spoken sentence in the voice catalogue |
| D4 | Numbered internal error codes per service family | Better | One code space for the whole product so phone, logs and docs share a vocabulary | T7.6 | A support ticket carries the code and the trace id |
| D5 | Hard limits per profile (distance, waypoints, matrix size, polygon size) | Planned (task) | Our limits are product limits (200 stops in ≤ 5 s), enforced before the engine call | T7.2 | Exceeding a limit returns the limit and the value, never a truncated answer |
| D6 | Live/hot conditions changing the weighting (closures, restricted roads) | Planned (task) | Closures come from the team dashboard and are applied to the day's plan | T7.14 | A closure on the template street re-orders the affected part of the day |
| D7 | Graph build pipeline with per-profile preparation methods | Skip (reason) | We do not build routing graphs; the region ships as a prepared tile pack | T7.2 | — |
| D8 | Elevation download and smoothing during graph build | Skip (reason) | Not used in NZ delivery routing | — | — |
| D9 | Country-specific speed tables as loadable data | Skip (reason) | Our speed tables are learned per driver, not country files | — | — |
| D10 | Country border geometry data | Skip (reason) | Single-country market | — | — |
| D11 | Remote graph repository (file system or object store) with version compatibility | Skip (reason) | We ship a static map pack, not a graph server | — | — |
| D12 | Load-test harness for directions and reachability | Planned (task) | The routing squad benchmarks before adopting (V4 §12.5) and publishes results | T7.2 | A benchmark table exists in `docs/squads/routing/benchmarks/` with raw results |
| D13 | Per-request query logging with a configurable format | Planned (task) | Structured logging with request ids and no PII (V4 §6.2) | T7.1 | A log line carries the request id and no address text |
| D14 | Public hosted API quotas (per-day and per-minute) | Skip (reason) | We self-host; depending on a third party's quota would break the offline promise | — | — |
| D15 | Reverse geocoding and point-of-interest services | Skip (reason) | They are separate hosted projects, not part of the studied routing software | — | — |
| D16 | Public-transport profile with timetable schedules | Skip (reason) | No public-transport product surface | — | — |
| D17 | Wheelchair-accessibility tuning and separately mapped footpaths | Skip (reason) | A commercial courier app is not an accessibility-navigation product | — | — |
| D18 | Status endpoint lists which endpoints are live | Better | Our status lists the capabilities the phone may use, so a disabled feature never produces a runtime surprise | T7.12 | The phone hides a tool whose capability is absent from the status answer |
| D19 | Cross-origin headers configurable per instance | Planned (task) | The web dashboard and the admin pages need them; the mobile app does not | T7.12 | A browser session to the API succeeds; a third-party origin is refused |
| D20 | Per-request deadline and cancellation of long queries | Better | A hung optimisation must not hold a worker; the phone gets a spoken "still working" instead of a spinner | T7.2 | A deliberately slow request is cancelled at the deadline and logged as a timeout |
| D21 | Health probe with a start-up grace period | Planned (task) | The API is "not ready" while the offline address slice loads, so the container is not killed mid-load | T7.1 | The container survives a cold start with a 60 s load |

## E. Driver-facing translation — ORS concepts re-expressed for a voice-first app

| # | Feature | Status | Our edge / reason | Task | Acceptance |
|---|---------|--------|-------------------|------|-----------|
| E1 | Route warning spoken before the turn | Better | A warning becomes a ≤ 8-word whisper in the driver's language | T7.7 | The whisper plays before the manoeuvre, once, and is silenced by "quiet" |
| E2 | ETA to the next stop derived from the leg | Better | The assistant answers "how long to the next one?" from the cached plan, offline | T7.7 | The answer is available with the phone in aeroplane mode |
| E3 | Distance to the next stop | Better | Derived from the leg geometry, spoken on request | T7.7 | "how far?" returns metres, not kilometres, under 200 m |
| E4 | Next instruction + street name spoken | Better | Spoken from the structured turn type, never read from raw text | T7.5 | All street names use the NZ-English voice segment (FINAL_PROMPT §4.2) |
| E5 | Re-order mid-route without blocking the driver | Better | The engine is re-asked only for the affected legs; the plan is re-issued offline | T7.2 | A re-order of 200 stops completes in ≤ 5 s server-side and the phone shows a chip |
| E6 | Learned per-driver speeds replacing static tables | Better | Speeds are calibrated from the driver's own GPS trace | T7.2 | ETA error on repeat runs of the same template falls over successive weeks |
| E7 | Stop-level door memory instead of a street-centroid arrival point | Better | The arrival point is the learned entry point; the route ends there | T7.3 | The navigation deep link targets the learned point, not the street pin |
| E8 | Offline plan cache | Better | The whole plan, geometry and instructions live on the phone | T7.1 | A full driving day completes with no network |
| E9 | Attribution rendered in app and web | Planned (task) | "© LINZ CC BY 4.0" and "© OpenStreetMap contributors (ODbL)" | T7.15 | Both strings appear on the settings screen and in the dashboard footer |
| E10 | Route export to a navigation app by learned coordinates | Better | The deep link uses the learned entry point, not the text address | T7.7 | The external navigation app opens on the learned gate, not the street midpoint |
| E11 | Off-route detection and re-plan offer | Better | The driver is warned once, with a chip, and never with a blocking dialog | T7.7 | Leaving the corridor produces one chip and a spoken offer |
| E12 | Rest break with the plan paused and resumed | Better | Our assistant keeps the day's state across a break; a routing server knows nothing of breaks | T7.6 | After a break the next stop and its ETA are unchanged |
| E13 | Distance and duration per stop for the IRD logbook | Better | Derived from the same plan the driver drove, so the logbook matches reality | T7.11 | The logbook PDF is reproducible from the day's plan |
| E14 | Stops with time windows and priorities | Better | ORS has no concept of a stop; ours does, and the route is built around them | T7.2 | "pharmacy after 2 pm" is honoured and shown on the day list |
| E15 | Pickup and delivery paired to one another | Better | A courier constraint the routing server cannot express | T7.2 | A pickup and its parcel are always adjacent in the plan |
| E16 | Capacity and multi-parcel loads | Better | Van capacity is our constraint, not the engine's | T7.2 | Over-capacity days are flagged before the driver leaves |

## F. Licensing and clean-room compliance

| # | Item | Status | Reason | Task | Acceptance |
|---|------|--------|--------|------|-----------|
| F1 | Any ORS code, text, identifier, schema or asset in our repository | Skip (reason) | GPL-3.0 contamination risk; V4 §2 forbids GPL/AGPL in the product and the mobile bundle | — | CI licence scan shows zero GPL/AGPL findings |
| F2 | Behavioural clean-room study of this project | Have | This file plus `docs/study/openrouteservice/SPEC.md`; implementation is a separate session that never opens the source | T7.2 | The build session log records that the source was not opened |
| F3 | Similarity review of the implemented routing service | Planned (task) | Code review must check for copied functions, comments, strings and file structure (V4 §11.2.5) | T7.2 | Review notes confirm no similarity, or the code was rewritten |
| F4 | Licence decision recorded in the licence ledger | Planned (task) | `docs/LICENSES.md` must state GPL-3.0, "studied, not adopted", with the study date | T7.15 | The ledger row exists with today's date |
| F5 | Self-hosted ORS instance as a fallback router | Skip (reason) | Valhalla + VROOM + OR-Tools is the locked decision; a second engine doubles the data pipeline for no driver-visible gain | — | — |

---

## G. Verification plan for the adopted rows

| # | Adopted capability | How it is proved | Task |
|---|--------------------|------------------|------|
| G1 | Route engine choice | Solution within 5 % of the best known on the benchmark set, published in `docs/squads/routing/benchmarks/` | T7.2 |
| G2 | 200-stop optimisation | ≤ 5 s server-side on the CI emulator, measured in CI | T7.2 |
| G3 | Template rebuild | One tap rebuilds the day including rules; the order is deterministic | T7.2 |
| G4 | Door-memory entry point | Navigation deep link targets the learned point, verified by a Maestro flow | T7.3 |
| G5 | Warning whispers | Maestro asserts the whisper string before the manoeuvre, day and night | T7.7 |
| G6 | Offline plan | Maestro airplane-mode flow completes a full day | T7.1 |
| G7 | Learned speeds | ETA error on repeat template runs tracked week over week | T7.2 |
| G8 | Unreachable pair | A fixture with one unreachable stop keeps every other matrix value numeric | T7.2 |
| G9 | Per-profile availability | The availability table is generated from the engine config, asserted by a test | T7.2 |
| G10 | No GPL contamination | Licence scan of the repo and of the APK reports zero GPL/AGPL | T7.15 |

---

## Rows deliberately absent

Public-transport timetables and GTFS feeds (no product surface); pedestrian, cycling and wheelchair
accessibility tuning (no product surface); country border and open-border datasets (single-country
market); the companion point-of-interest, elevation and hosted geocoder services (separate
repositories, outside this study); and the separate client application.
