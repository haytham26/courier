# Clean-room functional study — Nominatim (osm-search)

**Method (V4 §11.2).** Read on 2026-10-20: the project README, the whole `docs/` tree (API reference,
customisation, administration, development, library), the Python source tree (search front-end,
tokeniser, sanitisers, database schema, HTTP server glue, CLI), the change log, the public usage
policy hosted by the OpenStreetMap Foundation, and the open issue tracker + discussion board. Only
behaviour was extracted; no code, text, identifier, schema or asset from this GPL-3.0 project enters
our repository. Everything below is written as a requirement for **Courier Copilot**.

**What it is.** A geocoding *server*: it indexes OpenStreetMap data and answers "what is at this
text / this coordinate / this map-object id?", with a ranking model, a configurable tokeniser and a
per-country address model. It runs as a web service or as an embedded Python library, and it can
export its database to a single-file SQLite database for offline read-only use. Licence GPL-3.0
(code); the Lua import configuration is Apache-2.0. Version seen: 5.3.0.

**Why we study it.** We already run our own geocoder: LINZ NZ Addresses offline, an FTS5 index in
`op-sqlite` on the phone, and the D8 correction engine in `apps/api/app/address_correction.py`.
Nominatim is studied for *behaviour coverage* of a production geocoder, for ranking and matching
ideas worth re-implementing, and — critically — for the usage policy that forbids us from using the
public service.

---

## 1. Feature families found

| # | Family | What it does |
|---|--------|--------------|
| F1 | Forward search | Free-form and structured text search, left-to-right then right-to-left fallback |
| F2 | Reverse geocoding | Coordinate → nearest suitable object → that object's address, at a chosen level of detail |
| F3 | Lookup & inspection | Many map-object ids → their addresses (batch, capped); a single-object debug view with names, tags, hierarchy and computed fields |
| F4 | Output formats | JSON, JSON v2, GeoJSON, GeocodeJSON, XML; optional geometry in four encodings |
| F5 | Ranking | Two numeric ranks per place (search rank, address rank) plus a computed importance score |
| F6 | Result restriction | Hard filters (country, layer, category include/exclude, excluded ids) vs soft boosts (area preference, bounded) |
| F7 | Localisation | Preferred-language order, per-country default languages, name-variant selection |
| F8 | Duplicates and links | Deduplication of the same real place; linked duplicates hidden from search |
| F9 | Special phrases | "hotels in Berlin", "bus stops near X" → a typed category query |
| F10 | Tokenisation | Normalisation, transliteration, abbreviation variants, compound decomposition, mutations, number and postcode analysers |
| F11 | Sanitisers and address computation | Cleaning names at index time, address parts from tags, number interpolation, linked-street relations |
| F12 | Postcodes & per-country model | Postcodes from the data plus external sources (JSONL with geometry, or CSV); a declarative per-country model (postcode pattern and canonical spelling, default languages, country names, country assignment) |
| F13 | Data model | Imported objects, the enriched search table, address-line cross references, the term index and word dictionary, entrance nodes, interpolation lines, auxiliary tables |
| F14 | Import pipeline | Styles deciding what is indexed, ranking config, index-building passes, diff updates, freezing, SQLite conversion |
| F15 | Operations | Status endpoint, query and search timeouts, per-request logging with metrics, debug output, held-back deletion and broken-polygon reports |
| F16 | Usage policy | The rules the public instance imposes: rate limit, identification, attribution, no autocomplete, no systematic querying, no reselling, privacy, assistant disclosure |
| F17 | Embedded / offline use | Python library interface, CLI, and a single-file SQLite export for read-only geocoding |

---

## 2. Requirements — what our geocoder must do

### 2.1 Forward search (F1)

- **R-NOM-01** A text search must accept **both** a free-form string and a structured set of fields (street, city, county, region, country, postcode, place type); the two forms must not be combined
  in one request, and a free-form search must be tried in the natural reading order first and then in the reverse order. *Acceptance:* a request carrying both forms is rejected naming which one to
  drop, and both orderings of "street, suburb" return the same top result.
- **R-NOM-02** The result count must be capped, the server may return **fewer** results than asked when the extra ones do not match well enough, and a search must be able to exclude individual
  results by a stable identifier so a follow-up returns the *next* best matches (excluding a street
  also excludes the addresses derived from it). *Acceptance:* 3 exact matches return 3, not 10 near-misses; the second page overlaps the first on nothing.

### 2.2 Reverse geocoding (F2)

- **R-NOM-03** Reverse geocoding must answer "what is the address of this point" by finding the **nearest suitable** indexed object and returning *that object's* address, and must be documented
  as not being the address of the exact point. *Acceptance:* the answer carries the distance from the query point to the object.
- **R-NOM-04** Reverse geocoding must accept a level of detail mapped to address granularity: country → region → county → city → town/suburb → neighbourhood → settlement → major street →
  major and minor street → building, and a point with no data must return an explicit "unable to geocode" error rather than an empty success. *Acceptance:* lowering the level removes the finer parts of the address.

### 2.3 Lookup and inspection (F3)

- **R-NOM-05** The geocoder must answer "give me the address of these known objects" for a batch of identifiers, with a configurable batch cap, preserving the requested order, and must expose a
  single-object inspection view with every name variant, the address tags, the extra tags, the computed postcode and importance, the hierarchy, the parent link and the centroid.
  *Acceptance:* a batch over the cap is rejected with the cap stated; a batch with an unknown id
  returns the known ones; the inspection view is a debugging tool only, never a machine-readable contract, and the product depends on none of its fields.

### 2.4 Output (F4)

- **R-NOM-06** Every result must carry: a stable identifier, the underlying map-object type and number, the centroid, the bounding box, a human-readable joined address, the category and type,
  the search rank, the importance score and — optionally — the address breakdown, the extra tags, the full name list, the tagged entrances and the full geometry; the internal identifier must be
  documented as **not stable** across re-imports or installations, so only our own identifiers (the LINZ address id) may be persisted. *Acceptance:* the mobile client has a typed model, a test
  asserts every field is present or explicitly null, and a re-import test proves persisted links still resolve.

### 2.5 Ranking (F5)

- **R-NOM-07** The ranking model must separate a **search rank** (how prominent a place is; breaks ties between equally good matches) from an **address rank** (where it sits in an address
  hierarchy); a place that must never appear in an address has address rank zero.
- **R-NOM-08** Rank assignment must be data-driven per tag-and-value with a per-country override, applied at index time, and an importance score must exist as a tie-breaker with a primary source
  (how well known the place is) and a secondary source (how well known the area is), both replaceable. *Acceptance:* a country override changes only that country; a duplicate config entry
  fails the build; two matches with identical text and rank are ordered by importance.

### 2.6 Result restriction: filters vs boosts (F6)

- **R-NOM-09** The geocoder must distinguish **filters** (exclude a kind entirely) from **boosts** (prefer a kind, keep it as a fallback); a filter must never be silently downgraded to a boost.
  Filters must cover a country restriction, a place-layer restriction (address, point-of-interest, railway, natural, man-made), a place-type restriction (country / region / city / any settlement)
  and category include/exclude lists built from tags. *Acceptance:* a filter with no match yields zero results; a boost with no match falls back.
- **R-NOM-10** Category lists must be hierarchical and combinable: one list means "any of", a repeated parameter means "all of"; a category with fewer than two levels is rejected; objects
  carrying no category (postcodes, interpolated numbers, countries from the fallback list) must be documented as vanishing when a category filter is active. *Acceptance:* `include=A,B` returns both
  kinds; `include=A&include=B` returns only objects with both.
- **R-NOM-11** An area preference must be usable as a **boost** (prefer results inside the area) or
  as a **hard restriction** (return nothing outside it). *Acceptance:* the hard restriction with no in-area result returns empty, not a nearest neighbour.

### 2.7 Localisation and duplicates (F7, F8)

- **R-NOM-12** A preferred-language order must be honoured, falling back from the request to the operator's default to the local name, and names must be selectable from an ordered list of tag
  kinds (localised name, generic name, brand, official name, short name, reference); the geocoder must also detect when several records describe the same physical place (a street split into many
  map ways, a place node and its boundary) and return one result, with deduplication switchable off for diagnostics. *Acceptance:* a request for a language with no translation falls back to the
  local name; a linked duplicate stays resolvable by lookup but never appears in search.

### 2.8 Special phrases (F9)

- **R-NOM-13** The geocoder must support a configurable phrase dictionary mapping a human phrase to a tag category, with three operators: *inside* (the place is within the named place), *near* (the
  place is close to the named place) and *classifier* (the phrase names the kind of place); the dictionary must be replaceable wholesale or merged, with the merge mode explicit.
  *Acceptance:* "pharmacy near Riccarton" returns pharmacies near that place and nothing else.

### 2.9 Tokenisation (F10)

- **R-NOM-14** Index-time and query-time text handling must be symmetric (the same normalisation on a stored name and on an incoming query), normalising through a configurable ordered rule list
  (case folding, diacritic handling, punctuation) with transliteration as a separate later step, and generating **variants** at index time: abbreviation expansions ("road" → "rd"), compound
  decomposition (a street-type word split off the street name), prefix/suffix-only replacements and character mutations. *Acceptance:* a driver who says "Harewood Rd" and one who types "Harewood Road" reach the same result.
- **R-NOM-15** A number tokeniser must treat "3A", "3 A" and "3-A" as the same number, and a postcode tokeniser must treat spacing variants of one postcode as equal. The tokeniser choice is
  fixed when the index is built and must be reported by the status endpoint; the index refuses to serve with a mismatched tokeniser.

### 2.10 Sanitisers and address computation (F11)

- **R-NOM-16** Name cleaning happens at index time only and must not alter what is displayed — the answer always shows the original stored name — and the address of a place must be computed from
  the address parts available in the data, with a documented rule for which part wins when several compete for the same level. *Acceptance:* a place with two candidate cities has a deterministic address.
- **R-NOM-17** Interpolated house numbers along a line must be supported (a street with a number range and a step yields the individual numbers with their positions), and a street may be linked
  to its addresses by an explicit relation so a number is found even when the address tag names a street that is not separately mapped.
- **R-NOM-18** Entrances must be captured with their position, type (main, side, service, exit) and
  extra tags, and returned with the place they belong to. *Acceptance:* the address screen can offer a side door as a drop-off point when the data has one.

### 2.11 Postcodes and the per-country model (F12)

- **R-NOM-19** Postcodes must be supported from the map data **and** from an external source in two shapes: a CSV of postcode plus coordinates, and a JSON-lines file of postcode plus polygon, and
  every country must have a declarative model (postcode pattern with named groups, canonical spelling, default languages, country names) with country assignment resolved from the map data
  and a guaranteed-coverage fallback grid. *Acceptance:* an external postcode is searchable and attaches to places in its area; "AB56", "AB 56" and "AB-56" resolve to one postcode with the
  declared canonical spelling; a point in the sea or on a border resolves deterministically.

### 2.12 Data model (F13)

- **R-NOM-20** The index must be separable into: raw imported objects, the enriched and ranked search table, the address-line cross references, the term index, the word dictionary, the entrance
  nodes, the interpolation lines and the auxiliary operational tables; every indexed object must have a **parent** in the address hierarchy and a **category list** built from all of its main
  tags, while a single **classification** (the tag used for ranking) is retained, and the term index stores integer term ids, not strings. *Acceptance:* an object tagged as both a hotel and a
  restaurant has one classification, two categories, and appears once in results.

### 2.13 Import pipeline (F14)

- **R-NOM-21** The import must be style-driven: the operator chooses how much data to index (admin only, admin plus streets, full address data, or full data with extra tags) and the size and time
  of the index must scale accordingly; the import must build the index in rank passes, report progress, and document which rank levels are slowest. *Acceptance:* the size and time estimates are published per style.
- **R-NOM-22** Updates must be incremental, must skip re-indexing of contained objects when an area becomes too large, and must hold back a deleted large area rather than deleting it outright.
  *Acceptance:* a deleted large area appears in the held-back report instead of vanishing.
- **R-NOM-23** A frozen index (no further updates) must be supported for offline deployments, and the database must be convertible to a **single-file SQLite** database for read-only offline use,
  with switches to omit the reverse indexes, the forward-search tables or the inspection tables. *Acceptance:* the converted file answers forward and reverse queries with no server process.

### 2.14 Operations (F15)

- **R-NOM-24** A status endpoint must report service health, the last data update time, the software version and the data-format version, and two separate timeouts must exist: a database query
  timeout that fails the request, and a search timeout that returns the partial results gathered so far. *Acceptance:* a truncated result set is returned without an error status and the log records the truncation.
- **R-NOM-25** Per-request logging must record arrival time, total time, wait time for a database connection, query time, result count, endpoint and raw query, in a configurable format; a
  debugging output mode must show how a query was parsed and executed and must be disabled by default; operational reports must expose held-back deletions and broken polygons so data quality
  problems are visible instead of silent. *Acceptance:* the log format is configurable and the default contains no address text.

### 2.15 Usage policy and legal constraints (F16) — **binding on us**

- **R-NOM-26** **We must not call the public Nominatim service from Courier Copilot.** The public usage policy states that applications whose primary function is geocoding must run their own
  service, and names package and vehicle-tracking applications explicitly; our product is a courier app whose address lookup is a primary, always-on function. *Acceptance:* a network-policy test
  proves the shipped app contains no reference to the public geocoding host; the only geocoding source is our LINZ-derived offline index.
- **R-NOM-27** We must not build a **type-ahead / autocomplete** service on top of any public geocoding endpoint. Our autocomplete is a local offline index lookup, so it is outside the
  restriction — and that is precisely why we add no public-network fallback. *Acceptance:* the autocomplete is served from the on-device index and the shipped build cannot reach a third-party geocoder.
- **R-NOM-28** We must not perform **systematic queries** (grids of reverse lookups, complete postcode or town lists, bulk point-of-interest downloads), and we must not **resell** geocoding
  results. Our data acquisition is a one-off licensed bulk import of LINZ data, not a scraping loop, and address lookup is a bundled part of a courier subscription, not a metered geocoding product.
- **R-NOM-29** Any request we make to a third-party service must identify the application with a real user agent, must stay within a maximum of one request per second, must cache results on our
  side, and must display the data attribution where the data is shown. *Acceptance:* the outbound-request layer enforces a global one-request-per-second ceiling and a cache; both are covered by tests.
- **R-NOM-30** Attribution must be displayed for map data — "© OpenStreetMap contributors" with the
  Open Database Licence, and "© LINZ" with CC BY 4.0 for the address data — and the licence ledger must record which licence covers which dataset.
- **R-NOM-31** No personal data may be submitted to third-party services; address data stays on our servers and on the phone. Where a third-party model or assistant suggests our geocoder to a user,
  the usage policy must be pointed at, and code generated from an assistant must comply with it.

### 2.16 Embedded / offline use (F17)

- **R-NOM-32** The geocoder must be usable **in-process**, without a web server, so the address engine can run inside our API and inside the worker; the same interface must have a synchronous
  and an asynchronous form so a server can overlap queries without blocking, and it must be able to return the *raw* record as well as a display-ready label. *Acceptance:* a unit test calls the
  address engine directly with no HTTP layer, and the driver app shows the address as the data models it while the assistant speaks it.

---

## 3. Data fields our address index must carry

| Field | Meaning | Note for us |
|-------|---------|--------------|
| our address id | the LINZ identifier of the address point | the only id we persist (FINAL_PROMPT §5.1) |
| house number | the number as spoken, with letter suffix | "42B" ≠ "2/14" |
| unit | flat/apartment unit, spoken separately | NZ "3/14" style |
| road | street name as published | matched with the road key |
| suburb / town / postcode | the locality of the point | disambiguates a duplicated street name; "outside my area" detection |
| latitude / longitude | the point | map pin and entry-point candidate |
| road key | normalised form used to group a road | the grouping key for the FTS slice |
| confidence + correction reason | how sure the engine is, and why it changed what it changed | gates auto-correct vs ask; spoken in the correction report |
| needs question + options | whether to ask, and the two choices | the double-check screen |

**Driver-facing translation.** The phone's index answers four questions only: "does this road
exist?", "does this number exist on this road?", "which suburb is this?", and "where is it?". The
full record stays server-side.

---

## 4. What users complain about (from the issue tracker)

| Complaint (issue) | Our answer |
|---|---|
| No support for unit/apartment numbers, so several flats at one street number cannot be told apart (#587) | Our data model carries the unit explicitly and treats "3/14" as a unit plus a number, not as a number |
| No spelling correction or fuzzy matching; a typo returns nothing (#759) | The D8 engine generates candidates by fuzzy and phonetic similarity and explains the change; a typo is corrected silently with a report, not a dead end |
| An unknown word in an otherwise known address makes the whole search fail (#145) | Unrecognised tokens are dropped with a penalty instead of failing; the score is returned so the caller can decide |
| Reverse geocoding returns only one result, so a user cannot pick the right one (#1580) | Our reverse look-up returns a short ranked list (the door-memory candidate, the LINZ point, the nearest neighbours) and the app offers a choice |
| Address formats differ per country and are not configurable per country (#213) | Our model is NZ-only and formalised: number + unit + road + suburb + town + postcode, per the LINZ address field set |
| Apostrophes break matching (#3703); compass prefixes are not matched (#535) | Normalisation strips punctuation before indexing, on both sides; a compass prefix is normalised away and the change is reported |
| The public instance and a local instance give different answers for the same query | Our product has exactly one index (the shipped offline slice), so there is no second answer to disagree with |

---

## 5. How we will do it better

1. **The geocoder is a corrector, not a lookup.** Nominatim answers "what did you mean?"; ours
   answers "here is what you said, here is what it is, here is why", and asks only when it cannot
   decide — the D8 contract and the product's differentiator.
2. **Correctness is checked against an official source.** We verify that the house number actually
   exists on that road in that suburb. Nominatim ranks candidates; it does not validate them.
3. **It is offline by construction.** The public policy forbids what a courier app needs (no
   autocomplete service on a public endpoint, no reselling, no systematic querying) and imposes a
   one-request-per-second ceiling that would wreck a dispatch day. An on-device index removes the
   constraint entirely.
4. **The licence is simpler and the answer is single.** Our address data is LINZ CC BY 4.0
   (attribution, no share-alike) while map data is ODbL and stays in the tile pipeline, so we do not
   inherit an ODbL-derived geocoding product; and a public instance and a self-hosted instance
   disagreeing is impossible for us — one index version per app release, and its date is visible.

---

## 6. UNVERIFIED / not covered

- **UNVERIFIED:** the exact ranking weights and penalty constants used by the studied search engine (the concept was studied, the constants were not reverse-engineered, and none are copied) and the
  published performance figures for the public instance (the repository documents no reproducible benchmark for it).
- **Not studied:** the separate web front-end project, the companion projects for Wikipedia-based importance and for the secondary-importance raster, and the geocoding-format specification beyond
  what the API documentation states. Operating a public geocoding instance for third parties is out of scope — we operate no public geocoding service.
