# BUG-246 evidence — the C3 ADR (ADR-027): before/after, sources, licences, 98.2%

## The re-measurement for this ADR (2026-11-08, first-hand)
Command: `uv run --directory services/api pytest tests/test_linz_accuracy.py -q`
Result: **1 passed in 426.09s**. The test regenerated `docs/evidence/phase-2.3/linz-accuracy.md`
(date line 2026-11-08, committed in this PR):

- Data: LINZ `NZ Addresses` (`data.linz.govt.nz:layer-123113`), Christchurch/Waimakariri/Selwyn
  bounding boxes — **656,392 real addresses indexed** across 3 areas.
- Sample: 120 real addresses per area (seed 20261020), five ask-cases each = **1800 checks**.
- **Accuracy: 98.2% (1767/1800)** — per-case: canonical 354, misspelled road 350, road type
  omitted 357, spoken number 353, unknown number asked 353. Identical to the 2026-11-04 round
  (`linz-loop-2026-11-04.md`): the sample is deterministic, so 98.2 % reproduces exactly.
- Trial target (>= 98 % right-door without a manual fix): **met**.

## Before/after (one command each, all over the same seeded sample)
| Date | Accuracy | Index | Change |
|---|---|---|---|
| 2026-10-20 | 96.9 % (1745/1800) | 656,044 | first measurement (ADR-003) |
| 2026-10-30 before | 85.2 % (1534/1800) | 656,392 | live weekly revision, same engine |
| 2026-10-30 after | 96.9 % (1744/1800) | 656,392 | suburb vocabulary + spoken house number |
| 2026-11-04 | 98.2 % (1767/1800) | 656,392 | spoken lettered unit keeps its letter; case-folded unit compare |
| 2026-11-08 | **98.2 % (1767/1800)** | 656,392 | re-run for ADR-027 — reproduces exactly |

## The terms verification (2026-11-08, live pages)
- `https://cloud.google.com/maps-platform/terms` §3.2.3(e): Google Maps Core Services may not
  be used "with or near a non-Google Map" (e.g. Places content on a non-Google Map);
  §3.2.3(a)-(b): no scraping/storing/rehosting, no bulk geocode download, no caching except as
  the Service Specific Terms permit.
- `https://cloud.google.com/maps-platform/terms/maps-service-terms/` (last modified 2026-10-28)
  §B.6 Geocoding API: 6.2 "No use with a non-Google map" — content may not be used in
  conjunction with a non-Google map; 6.3.1 lat/lng cacheable up to 30 consecutive calendar
  days only; 6.3.2 formatted_address per-end-user only, never as a call replacement.
=> The audit's legal limit is confirmed and stricter: no Google geocoding in the MapLibre
   map at all; navigation hand-off only (PARITY row 21). Quoted in ADR-027.

## The licence ledger
`docs/product/LICENSES.md`'s adopted-data table gains the **NZ Addresses** row (CC BY 4.0,
layers 123113/123110/123109, read 2026-11-08, used by the D8 slice in `data/linz/`), mirrored
into `scripts/ci/check-licenses.mjs`'s ADOPTED ledger so a `--write` regeneration keeps it
(the local `--write` could not run here — the sandbox has no registry access and it would
blank the dependency table — so the row was applied to the file directly and the script is
the source of truth for CI). OSM stays pack-only (ODbL); NZ Building Outlines (CC BY 4.0)
was already listed.
