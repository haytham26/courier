# Address Intelligence Squad - research

**Area:** NZ address parsing, geocoding, D8 correction, door memory **Research date:** 2026-10-20 · **Source file:** `docs/research/2026/nz-address-parsing-geocoding.md`

## Queries that found the candidates

`gh search repos "geocoding" --sort stars` · `"address parser"` · `"nz address new zealand"` (0 results) · `"address validation"` · `--topic geocoding` · `"postal code lookup offline"` (0) · `"street address parse normalize"` · `"postcode
address lookup"` · `--topic geocoding "new zealand"` (0) · `"address intelligence structured parsing"` (0) · `"LINZ"` · `"libpostal"` · `"pelias"` · `"photon geocoder"` · `"usaddress"` · `"postcodes.io"` · `gh api repos/<o>/<r>` for 40 repos
· releases / commits / issues APIs · PyPI + Hugging Face APIs · webfetch of the LINZ licence page, the OSM copyright page, the Nominatim usage policy and the Photon changelog · websearch "Photon 1.3 2026".

## Candidates that matter

| Project | Repo | Licence | One-line reason |
|---|---|---|---|
| LINZ NZ Addresses | `linz/` data service | CC BY 4.0 | The authoritative NZ address source; our product's differentiator (D8) rests on it. |
| RapidFuzz | `maxbachmann/RapidFuzz` | MIT | C++ fuzzy matcher for road names; "Rickerton to Riccarton" without an O(n squared) `difflib` scan over every road. |
| Photon | `komoot/photon` | Apache-2.0 | Typo-tolerant self-hosted geocoder; 1.3.0 re-weighted name matches, exports `admin_level`, postcodes searchable without spaces. |
| Pelias | `pelias/api`, `pelias/csv-importer` | Apache-2.0 (MIT) | The only candidate that lets us serve a house-number-aware geocoder built from our LINZ export, without copyleft. |
| libpostal | `openvenues/libpostal` | MIT | Reference for what parse/expand/normalize should mean - not a dependency (no gazetteer, 0 commits in 90 d). |
| normalize-japanese-addresses | `geolonia/normalize-japanese-addresses` | MIT | Pattern donor for a staged `level` ladder plus an explicit "resolved to street, not to house" marker. |
| Nominatim | `osm-search/Nominatim` | GPL-3.0 | Clean-room only; the public API's usage policy forbids client-side autocomplete and reselling. |
| openaddresses / postcodes.io / usaddress / pgeocode / gisgraphy | various | MIT / LGPL / mixed | Data-curation and dataset-distribution references (NZ coverage unverified) versus server-only, wrong-shape or stale candidates. |

## Deep review - top 5

1. **komoot/photon** - single Java 21 application; Elasticsearch dropped for OpenSearch in 1.0.0 (2026-02-09), DB about half the size, a planet needs about 95 GB; 1.1.0 added a reverse-only small-DB mode; 1.2.0 made the import fully
   parallel; 1.3.0 (2026-08-07) re-weighted name matches, exported `admin_level` and made postcodes searchable without spaces/dashes. It imports from a Nominatim export, OpenAddresses or our own JSON dump - the door through which our LINZ
   rows could enter. **Verdict: excellent, but a server component - optional dashboard fallback, never on-device.**
2. **pelias/api + pelias/csv-importer** - a micro-service mesh over OpenSearch with an active coordinated release train (api v7.11.0, query v12.0.0, model v11.1.0, csv-importer v6.2.0, config v7.0.0, all released 2026-09-18 to 09-26). The
   importer's column contract is explicit and machine-checkable (`source`, `lat`, `lon`, `name` required; `street`, `housenumber`/`number`, `postalcode`, `layer` optional) - our LINZ export already has `number`, `road`, `suburb`, `town`,
   `suffix`, `unit` and GeoJSON `latitude`/`longitude`, so the mapping is mechanical. **Verdict ADOPT as an optional server component.**
3. **openvenues/libpostal** - high code quality (C, SIMD paths, careful UTF-8 handling) but **0 commits and 0 maintainers in the last 90 days**, no gazetteer (it cannot answer "is house number 1400 on Harewood Road real?"), and it cannot
   run on device. **Verdict REJECT as a dependency, KEEP as the spec for parse/expand/normalize.**
4. **geolonia/normalize-japanese-addresses** - the result carries a **`level` ladder** (prefecture, city, ward, town/street, house/block) and a `point` with its own level, plus `other` = the part that could not be resolved. Release
   engineering is exemplary (npm OIDC Trusted Publishing, provenance on prereleases, "HTTP 200 but it was an error page" detection). **Verdict ADOPT THE PATTERN, not the library.**
5. **maxbachmann/RapidFuzz** - v3.14.6 (2026-08-30), 6 releases/12 m, 2 maintainers/90 d; `WRatio` with `processor=None` is the right default for road names because it already handles token order and partial matches; our current `difflib`
   path is O(n squared) over *every* known road for *every* correction. **Verdict ADOPT behind the existing `AddressStore` protocol, with a measured A/B.**

## Decisions

- **KEEP (locked, unchanged)** LINZ NZ Addresses (CC BY 4.0) + an **offline FTS5 slice in op-sqlite** + the D8 correction engine. It is the only option that is offline, on-device, house-number-aware, NZ-specific, permissively licensed,
  zero-API-cost, and able to explain every correction.
- **ADOPT** `maxbachmann/RapidFuzz` (MIT) inside the API service, behind the existing `AddressStore` protocol, with `difflib` kept as the fallback implementation. **ADOPT** the `level`-ladder concept in the D8 result: confidence bands plus
  an explicit "resolved to street, not to house" marker, so door memory never keys on a centroid.
- **ADOPT (optional server)** `pelias/api` + `pelias/csv-importer` + `pelias/docker` indexing our LINZ export for the dashboard and admins; `komoot/photon` as the second server fallback for free-text search outside LINZ (self-hosted, never
  the public instance); the postcodes.io-style **versioned + checksummed dataset publishing** for the weekly LINZ FTS slice; and the "200 but it was an error page" detection in the LINZ fetcher.
- **WATCH** `openaddresses/openaddresses` (NZ coverage unverified), `thecolab-ai/.skills` (2026 NZ-data newcomer), `jordond/compass` (KMP shape), `headwaymaps/headway`, `libpostal` (spec reference), `linz/basemaps` (already in use).
- **REJECT** libpostal + bindings · the Nominatim **public** API (its usage policy forbids client-side autocomplete and reselling results) · usaddress · pgeocode · gisgraphy (LGPL) · linz2osm (GPL, archived) · geopy · alexreisner/geocoder ·
  AReallyGoodName (no licence) · bitlap/geocoding · symerio/pgeocode.
- **CLEAN-ROOM (behaviour only, never code)** `osm-search/Nominatim` and `opennewzealand/linz2osm`.

## UNVERIFIED

1. **The squad benchmark does not exist**, so **>= 95 % correction accuracy, zero wrong-house auto-corrections at confidence >= 0.9 and < 2 s p95 are all unmeasured**.
2. The **225,151-address** Christchurch slice count is the working set used by the area file; the exact imported row count is to be measured at import time. UNVERIFIED until then.
3. LINZ **layer IDs and schema drift**, and the exact licence position for the specific layers we import (the aerial / pending-approval / ownership layers are **not** in the address slice, so their extra terms do not apply - **UNVERIFIED
   for the exact layers**, to be confirmed with the founder's export).
4. Whether **OSM-derived features** ever enter the on-device address slice: if they do, ODbL share-alike attaches to the derived database; keep OSM out so the slice stays CC BY 4.0. UNVERIFIED (legally).
5. RapidFuzz's speed on our data and whether its wheel installs cleanly in the API image; Photon's and Pelias's vendor performance claims on NZ names; 6-month star trend, median maintainer response time and closed-issue ratios for every
   candidate. UNVERIFIED.
