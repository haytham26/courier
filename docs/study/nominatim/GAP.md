# Gap analysis — Nominatim (osm-search) → Courier Copilot

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

## A. Forward search and query handling

| # | Feature | Status | Our edge / reason | Task | Acceptance |
|---|---------|--------|-------------------|------|-----------|
| A1 | Free-form text search | Have | The D8 engine already normalises and matches a spoken address against the LINZ slice | T4 | A spoken address resolves to a LINZ id ≥ 95 % of the time |
| A2 | Structured search by address fields | Better | The driver speaks a phrase; the engine decides which field each token is, and says so in the correction report | T7.4 | "14 Harewood Road, Papanui" resolves without a follow-up question |
| A3 | Reading order tried both ways | Have | Our normaliser matches on the road key and the number, so order is irrelevant | T4 | "Harewood Road Papanui" and "Papanui Harewood Road" give the same result |
| A4 | Result cap and "fewer is better" | Better | We return at most one corrected address plus, only when unsure, two options | T7.4 | A confident address never produces a list of ten |
| A5 | Excluding results to page through | Skip (reason) | A courier never pages a geocoder; the double-check offers exactly two options | — | — |
| A6 | Country / region / place-type restriction | Skip (reason) | Our market is one country and one region; the slice is already clipped to Canterbury | — | — |
| A7 | Place-layer restriction (address vs POI vs natural…) | Skip (reason) | We only index addresses; POI search is a different product surface | — | — |
| A8 | Category include/exclude lists | Skip (reason) | The address engine has no category taxonomy to filter on | — | — |
| A9 | Area preference as boost or hard restriction | Better | The driver's own area is a hard filter ("outside my area" is a question, not a result) | T7.4 | A stop outside the driver's area is flagged, never silently returned as the best match |
| A10 | Special-phrase dictionary (near / inside / classifier) | Planned (task) | Ship a courier phrase set: "the [warehouse] depot", "the [hospital] loading dock", "parking at" | T7.6 | "the county's depot" resolves to the courier's depot without a typed query |
| A11 | Fuzzy and phonetic matching of a misspelled street | Better | The D8 engine generates candidates by fuzzy and phonetic similarity and *explains* the change | T7.4 | "Rickerton Road" is corrected to "Riccarton Road" and reported |
| A12 | Unknown tokens dropped instead of failing the search | Better | An unrecognised word (a building name, a floor) never kills a known street address | T7.4 | "Building A floor 2 14 Harewood Road" still resolves to 14 Harewood Road |
| A13 | Unit / apartment numbers | Better | Our data model carries the unit explicitly, so "3/14" is a unit plus a number | T4 | "3/14 Harewood Road" and "14 Harewood Road" are different stops |
| A14 | Search by street intersection | Skip (reason) | NZ delivery addresses are number-based; intersections are not a driver need | — | — |
| A15 | Searching a whole suburb or town | Skip (reason) | A courier's stops are individual addresses; a suburb list is a dispatcher product | — | — |

## B. Reverse geocoding and result shapes

| # | Feature | Status | Our edge / reason | Task | Acceptance |
|---|---------|--------|-------------------|------|-----------|
| B1 | Coordinate → nearest address | Planned (task) | Needed for door memory: the drop-off point is the learned entry, the LINZ point is the fallback | T7.3 | The saved door point differs from the street centroid by the recorded snap distance |
| B2 | Level of detail per request | Skip (reason) | We always want the finest detail we have for a delivery address | — | — |
| B3 | Reverse lookup returns one result | Better | We return a short ranked list (learned entry, LINZ point, nearest neighbours) and let the app offer a choice | T7.3 | The address card can offer three candidate drop-off points |
| B4 | Explicit "unable to geocode" for an uncovered point | Better | The phone says "no address there — drop the pin", it never shows an empty screen | T7.7 | A pin in the ocean produces a spoken message and a recovery action |
| B5 | Full result payload (bounds, hierarchy, tags, names, entrances, geometry) | Better | The phone receives four fields; the rest stays server-side to protect battery and privacy | T7.1 | The on-device index payload is under 1 MB per district |
| B6 | Several output formats (JSON, GeoJSON, XML, GeocodeJSON) | Skip (reason) | One internal JSON contract plus one typed client model is enough; we ship no public API | — | — |
| B7 | Full geometry in the response | Skip (reason) | A point plus a bounding box is enough for a delivery pin | — | — |
| B8 | Lookup of known map-object ids in batch | Skip (reason) | We key on our own LINZ address id, not on upstream map-object ids | — | — |
| B9 | Inspection / debug view of one record | Planned (task) | An operator-only screen showing the raw record behind a correction, for support | T7.12 | The view is reachable from the dashboard only and is never shipped to the phone |

## C. Ranking and matching

| # | Feature | Status | Our edge / reason | Task | Acceptance |
|---|---------|--------|-------------------|------|-----------|
| C1 | Two-rank model (prominence vs address position) | Better | We expose three driver-facing confidence colours, not two numeric ranks | T7.4 | Green, yellow and red map to accept, ask and re-ask |
| C2 | Per-country rank overrides | Skip (reason) | One country, one address model (LINZ fields) | — | — |
| C3 | Importance score as a tie-breaker | Better | The score drives our own ordering but is never shown to the driver | T7.4 | Two equally valid candidates order by our confidence, not by a public score |
| C4 | Filters versus boosts kept distinct | Better | In our engine a filter is a hard fact (the number is not on that road) and a boost is a preference (this suburb) | T7.4 | A number that does not exist on the road never wins on preference |
| C5 | Hierarchical, combinable category filters | Skip (reason) | No category taxonomy in an address index | — | — |
| C6 | Wikipedia-derived importance | Skip (reason) | No Wikipedia import in the pipeline; LINZ addresses are administrative, not encyclopedic | — | — |
| C7 | Area-wide importance raster | Skip (reason) | Same as C6; it would add a large binary for no driver-visible gain | — | — |

## D. Localisation, duplicates, phrase books

| # | Feature | Status | Our edge / reason | Task | Acceptance |
|---|---------|--------|-------------------|------|-----------|
| D1 | Preferred-language order with fallback | Have | The address display is in the driver's language; the street name stays in the source spelling | T7.4 | An Arabic driver sees the address in Arabic and the street name in English |
| D2 | Configurable order of name tags | Skip (reason) | LINZ publishes one official name per address point; we need no brand/official-name ladder | — | — |
| D3 | Deduplication of the same real place | Better | We key on the LINZ address id, so a street split into many map ways is one record for us | T4 | One LINZ id maps to exactly one stop |
| D4 | Linked places hidden from search | Skip (reason) | No linking concept in our data model | — | — |
| D5 | Special-phrase book kept in sync | Planned (task) | The courier phrase set is a config file the release pipeline versions | T7.6 | A phrase change ships with a version bump and a changelog entry |

## E. Tokenisation, sanitisers, address model

| # | Feature | Status | Our edge / reason | Task | Acceptance |
|---|---------|--------|-------------------|------|-----------|
| E1 | Symmetric index-time and query-time normalisation | Have | The road key is computed the same way when indexing and when matching a spoken road | T4 | A road matches whether the driver says "Rd", "Road" or "Rode" |
| E2 | Configurable normalisation rules | Have | Our road key rules are a versioned config, reviewed with the address squad | T4 | A rule change bumps the index version and forces a re-slice |
| E3 | Abbreviation variants ("rd" ↔ "road", "terrace" ↔ "tce") | Have | NZ street-type abbreviations are in the road key rules | T4 | "Harewood Tce" matches "Harewood Terrace" |
| E4 | Compound decomposition (street-type word split off) | Have | Handled by the road key rules, not by a generic tokeniser | T4 | "Main North Road" and "Main North Rd" give the same road key |
| E5 | Character mutations / accent folding | Have | Māori macrons are preserved for display and folded only for matching | T4 | A macron and a non-macron spelling match, but the display keeps the macron |
| E6 | House-number tokeniser ("3A" = "3 A" = "3-A") | Have | The number+suffix is parsed separately from the unit | T4 | "42B" and "42 B" resolve to the same point |
| E7 | Postcode tokeniser with spacing variants | Have | New Zealand postcodes are four digits; the format is fixed | T4 | "8021" and "8021 " resolve identically |
| E8 | Tokeniser choice fixed at index build and reported | Have | The index format version is visible in the app and the dashboard | T4 | The app shows the index version and date |
| E9 | Sanitisers that never alter the displayed name | Have | The phone always shows the LINZ-published spelling | T4 | A corrected street name is shown struck through with the original |
| E10 | Address computed from address parts with a documented winner | Have | Our address model is number + unit + road + suburb + town + postcode, in that order | T4 | The displayed address is assembled in a fixed order |
| E11 | Interpolated house numbers | Skip (reason) | LINZ publishes discrete address points; interpolation is not needed | — | — |
| E12 | Streets linked to their addresses by a relation | Skip (reason) | LINZ links address points to roads directly | — | — |
| E13 | Entrances (main / side / service / exit) | Planned (task) | Side-door drop-off points come from OSM entrance nodes joined to the LINZ point | T7.3 | A building with a mapped service entrance offers it as a drop-off |
| E14 | Per-country postcode pattern and canonical spelling | Skip (reason) | One country, one postcode format (four digits) | — | — |
| E15 | Country assignment from boundaries with a fallback grid | Skip (reason) | The slice is clipped to a known polygon, so country assignment is not needed | — | — |

## F. Data model and import

| # | Feature | Status | Our edge / reason | Task | Acceptance |
|---|---------|--------|-------------------|------|-----------|
| F1 | Separation of imported, enriched, ranked and index tables | Have | Our slice has raw LINZ rows, a normalised address table, and an FTS5 index | T4 | The three layers are separate tables and are tested separately |
| F2 | Parent link and category list per object | Better | Our object has exactly one parent (the road) and one class (an address point) | T4 | Every address point resolves to exactly one road |
| F3 | Term index of integer ids + word dictionary | Have | The FTS5 index plays this role with our own tokeniser | T4 | The index size and build time are recorded in the evidence file |
| F4 | Import styles (how much data to index) | Have | We index one layer: NZ addresses, clipped to the Canterbury polygon | T4 | The import reports row counts and duration |
| F5 | Index built in rank passes with progress | Skip (reason) | Our index is a single bulk build, not an incremental rank pipeline | — | — |
| F6 | Incremental updates by diff | Better | A weekly changeset feed refreshes the slice; the phone receives a delta | T4 / T7.1 | A weekly build changes only the affected rows |
| F7 | Hold back a deleted large area | Skip (reason) | LINZ address deletions are small and can be applied directly | — | — |
| F8 | Frozen index for offline deployment | Have | The shipped slice is frozen between releases | T4 | The app's index matches the release version exactly |
| F9 | Convert the index to a single-file SQLite for offline use | Have | The phone slice is a single SQLite file with FTS5, shipped as an asset | T4 | The phone answers an address query with the network off |
| F10 | Switches to omit reverse or forward tables | Skip (reason) | Our slice is small enough to ship both halves | — | — |
| F11 | External postcode sources (CSV / JSONL with geometry) | Planned (task) | LINZ postal-code data supplements the address points where the address lacks one | T4 | A postcode search returns the LINZ postcode for a known address |

## G. Operations and observability

| # | Feature | Status | Our edge / reason | Task | Acceptance |
|---|---------|--------|-------------------|------|-----------|
| G1 | Status endpoint (health, data date, versions) | Planned (task) | The app and the dashboard must answer "which index are we using?" | T7.12 | The dashboard shows the index version and build date |
| G2 | Separate query timeout and partial-result timeout | Planned (task) | The address engine answers in < 2 s p95; beyond that it returns its best candidate with a low confidence | T7.4 | A slow correction returns a yellow card, not an error |
| G3 | Per-request logging with metrics, no PII | Planned (task) | Structured logs with request ids; the raw address text is never logged | T7.1 | A log line carries the request id and the confidence, not the address |
| G4 | Debug output of the parse and the query plan | Planned (task) | Operator-only, for support; never in the shipped app | T7.12 | The dashboard shows why an address was corrected |
| G5 | Operational reports on data-quality problems | Planned (task) | Unmatched roads and duplicate ids are listed after every build | T4 | The build evidence lists every unmatched road |
| G6 | Run the geocoder in-process (no HTTP hop) | Have | The D8 engine is imported directly by the API and the worker | T4 | A unit test calls the engine with no server |
| G7 | Synchronous and asynchronous interfaces | Planned (task) | The worker is async; the API handlers are async too | T7.1 | The engine is awaited from both without blocking the loop |
| G8 | Raw record plus a display-ready label | Have | The correction result carries the original, the corrected form, the reason and the confidence | T4 | Every correction answer matches the D8 contract |

## H. Usage policy and legal constraints — binding

| # | Item | Status | Our edge / reason | Task | Acceptance |
|---|---------|--------|-------------------|------|-----------|
| H1 | Call the public Nominatim service from the product | Skip (reason) | The public usage policy requires geocoding-focused and vehicle-tracking apps to run their own service | — | A network-policy test proves the shipped app never contacts a public geocoder |
| H2 | Autocomplete built on a public geocoding endpoint | Skip (reason) | The public policy forbids client-side type-ahead on that service | — | The autocomplete is served entirely from the on-device index |
| H3 | Systematic grid queries / bulk lists from the public service | Skip (reason) | The public policy forbids it; we do a one-off licensed LINZ import instead | — | No code path performs a public reverse grid |
| H4 | Resell geocoding results / expose a public geocoding API | Skip (reason) | The public policy forbids reselling; address lookup is bundled, not metered | — | No public geocoding endpoint exists in the API |
| H5 | Rate limit of one request per second on third-party services | Planned (task) | Our outbound layer enforces a global ceiling and a cache for any third-party call | T7.15 | A test proves the ceiling and the cache |
| H6 | Identify the application with a real user agent | Planned (task) | Every outbound request carries the app's contact string | T7.15 | A test asserts the header on a mocked call |
| H7 | Show the data attribution where the data is shown | Planned (task) | "© LINZ CC BY 4.0" and "© OpenStreetMap contributors (ODbL)" in the app and the dashboard | T7.15 | Both strings render on the settings screen and in the dashboard footer |
| H8 | Never submit personal data to a third party | Planned (task) | Address and customer data stay on our servers and on the phone | T7.15 | The privacy impact assessment records no third-party address transfer |
| H9 | Point users at the usage policy when a third-party assistant suggests the geocoder | Skip (reason) | We do not advertise a third-party geocoder, so there is nothing to point at | — | — |

## I. Licensing and clean-room compliance

| # | Item | Status | Reason | Task | Acceptance |
|---|------|--------|--------|------|-----------|
| I1 | Any Nominatim code, text, identifier, schema or asset in our repository | Skip (reason) | GPL-3.0 contamination risk; V4 §2 forbids GPL/AGPL in the product and the mobile bundle | — | The CI licence scan reports zero GPL/AGPL findings |
| I2 | Behavioural clean-room study of this project | Have | This file plus `docs/study/nominatim/SPEC.md`; implementation is a separate session that never opens the source | T4 | The build session log records that the source was not opened |
| I3 | Similarity review of the implemented address engine | Planned (task) | Code review checks for copied functions, comments, strings and file structure (V4 §11.2.5) | T4 | Review notes confirm no similarity, or the code was rewritten |
| I4 | Licence decision recorded in the licence ledger | Planned (task) | `docs/LICENSES.md` must state GPL-3.0, "studied, not adopted", with the study date | T7.15 | The ledger row exists with today's date |
| I5 | Run a Nominatim instance as the production geocoder | Skip (reason) | The locked decision is LINZ NZ Addresses + our own D8 engine (FINAL_PROMPT §5.1); OSM data is ODbL and unnecessary for NZ addresses | — | — |

---

## Rows deliberately absent

Public-transport and transit-timetable features (no product surface); the region and country name
databases, the Wikipedia-importance and secondary-importance datasets, the neighbour-place ("similar
places") feature, the polygon and multi-polygon place geometries, the separate web front-end project,
and the auxiliary house-number gazetteer for a non-NZ country.
