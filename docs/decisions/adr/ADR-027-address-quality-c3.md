# ADR-027 — Address and map quality (audit C3): LINZ first, OSM for the pack, Google only as a hand-off

**Date:** 2026-11-08 · **Status:** Accepted · **Deciders:** backend squad, per the
2026-11-05 audit's item 7 (C3) · **Extends:** ADR-003 (the LINZ layers and fetch),
ADR-012 (location notes — the driver's correction as door memory), ADR-016 (the map
pack), ADR-026 (the import stores what it parsed)

## Context

AUDIT_2026-10-25 §C3 asks for one ADR with the measured accuracy before and after,
the chosen sources with their licences, and the trial target (≥ 98 % of trial
addresses resolved to the right door without a manual fix) met on the eval set.
It also asks to **verify the Google legal limit against the current terms page
before deciding**. Both are done here; the terms were re-read on 2026-11-08.

### The legal limit, verified against the live pages on 2026-11-08

- Google Maps Platform Terms of Service, §3.2.3(e) **"No Use With Non-Google
  Maps"**: "Customer will not use the Google Maps Core Services with or near a
  non-Google Map in a Customer Application. For example, Customer will not (i)
  display or use Places content on a non-Google Map …" — and §3.2.3(a)–(b)
  (**No Scraping / No Caching**): no pre-fetching, indexing, storing, resharing or
  rehosting of Google Maps Content, no bulk download of geocodes, and no caching
  except as the Maps Service Specific Terms expressly permit.
  (`https://cloud.google.com/maps-platform/terms`, fetched 2026-11-08.)
- Maps Service Specific Terms, §B.6 **Geocoding API** (page last modified
  2026-10-28): 6.1 allows use *without* a Google Map; **6.2 "No use with a
  non-Google map. Customer must not use Google Maps Content from the Geocoding API
  in conjunction with a non-Google map."**; 6.3.1 permits caching **latitude and
  longitude only, for up to 30 consecutive calendar days**; 6.3.2 permits
  `formatted_address`/structured values only per end user, for direct
  end-user-facing functionality, never as a replacement for further calls.
  (`https://cloud.google.com/maps-platform/terms/maps-service-terms/`, fetched
  2026-11-08.)

So the audit's limit is confirmed and is in fact **stricter** than it says:
merging Google geocoding into our MapLibre map is barred outright by §6.2 — not
merely cache-limited to 30 days. The only lawful Google use in this app today is
the navigation hand-off (deep links to Google Maps / Apple Maps / Waze, PARITY
row 21), which displays no Google content inside our own map.

## The measured accuracy — before and after, one command each

The command is always the same (the seeded sample is deterministic: 120 real
addresses per area, seed 20261020, five ask-cases each = **1800 checks** over the
real LINZ index; the report is regenerated on every run at
`docs/evidence/phase-2.3/linz-accuracy.md` — the numbers, never the data):

```
uv run --directory services/api pytest tests/test_linz_accuracy.py -q
```

| Date | Accuracy | Index size | What the round changed |
|------|----------|-----------|------------------------|
| 2026-10-20 | 96.9 % (1745/1800) | 656,044 | the first measurement over Canterbury (ADR-003) |
| 2026-10-30, before | 85.2 % (1534/1800) | 656,392 | same engine, pipeline and seed over the live weekly revision |
| 2026-10-30, after | 96.9 % (1744/1800) | 656,392 | the register's own suburb vocabulary + the spoken house number |
| 2026-11-04 | 98.2 % (1767/1800) | 656,392 | a spoken unit keeps its letter (`287C/28`); the unit comparison folds case |
| **2026-11-08, re-run for this ADR** | **98.2 % (1767/1800)** | 656,392 | `1 passed in 426s` — reproduces the 2026-11-04 number exactly |
| 2026-11-08, directive item 2, held-out BEFORE | 97.57 % (5854/6000) held-out; 98.48 % (5909/6000) tune | 656,392 | the seeded held-out split (1,360 of 6,802 Canterbury streets, seed 20261108, list committed at `services/api/tests/fixtures/linz-holdout-streets.txt` by `scripts/data/split-linz-holdout.py`) measured before the fixes; error analysis grouped all 91 tune misses (`docs/evidence/phase-2.3/linz-errors-tune.md`) |
| 2026-11-08, after round 1 | 99.63 % (5978/6000) held-out; 99.92 % (5995/6000) tune | 656,392 | root fixes per class: multi-type road names split at their own type ("Lake Terrace Rd"); both direction readings handed to the engine (`street_alt`/`hint_alt`, the register decides); the self-correction marker no longer eats roads named "No …"; road candidates disambiguated WITH the spoken suburb (`_match_roads` + progressive `_match_hint`) plus a completion bonus in `road_similarity` — the 0.78/0.8 bars never lowered |
| 2026-11-08, after round 2 | 99.65% (5979/6000) held-out; 99.97% (5998/6000) tune; 99.5% (1791/1800) on the legacy seeded 1800 | 656,392 | the spoken number/unit existence and the shorter road name break ties among suburb-matched candidates ("334 Halswell" -> Halswell Road, not Halswell Junction Road; "100 Peterborough" -> Peterborough Street) |

The 2026-10-20 baseline and the 2026-10-30 runs are not the same data set (LINZ
publishes weekly; the 648 added addresses cannot be fetched back), so the honest
before/after pair is the two 2026-10-30 runs — one data set, one command, one
session. Evidence per round: `docs/evidence/phase-2.3/linz-loop-2026-11-04.md`
and `docs/evidence/phase-2.3/linz-accuracy.md` (regenerated 2026-11-08 by the run
above).

**The trial target is met on the eval set: 98.2 % ≥ 98 % right-door without a
manual fix (1767 of 1800).** The directive's held-out target is met too: **99.65% on the held-out 20 % of streets** (floor 98 % per slice, lowest slice 98.75 %), measured by `test_d8_accuracy_on_heldout_streets` (`docs/evidence/phase-2.3/linz-accuracy-heldout.md`). The legacy seeded 1,800-check sample now measures 99.5 % (1791/1800). The 33 failures of the 2026-11-04 run were enumerated per class in
the evidence file — 17 misses (ASR spelling tolerance, road-name matching), the
road aliases with the type omitted, and the suburb tie-break — and the
measure-fix-re-measure loop closed them in the 2026-11-08 rounds above (round 2
leaves 2 misses on the 6,000-check tune sample), each round with its before/after
committed the way the rounds above are.

## Decision — the chosen sources and their licences

1. **LINZ NZ Addresses is the address authority** (layers `123113` addresses,
   `123110` roads, `123109` road sections — re-verified before every import by
   `scripts/data/fetch-linz.py`, per ADR-003). Licence: **CC BY 4.0** — the
   attribution duty ("sourced from the LINZ Data Service") is now recorded with
   the layer in `docs/product/LICENSES.md`'s adopted-data table (read 2026-11-08)
   and in `scripts/ci/check-licenses.mjs`'s ledger so a regeneration keeps it.
   The weekly changeset import keeps new subdivisions inside a week
   (`linz-changeset.yml`). The pin placement work (parcel/building outlines to
   put the pin on the entrance, not the parcel centre) uses LINZ NZ Building
   Outlines (`101290`, CC BY 4.0), already in the ledger.
2. **OpenStreetMap stays out of the on-device address slice.** The slice is CC
   BY 4.0 only while no OSM-derived data enters it; the ODbL share-alike position
   on a cached/derived address set is the squad's recorded UNVERIFIED legal
   question (`docs/squads/address/decisions.md`, 2026-10-20, "Needs legal
   review"). OSM remains in the **offline map pack only** (roads, building
   levels), ODbL with attribution, already in the ledger. LINZ's business-name
   gap ("Countdown Riccarton") is covered in the trial by the driver's own
   correction as door memory and a corrected pin (ADR-012), so the same address
   is right next time; a self-hosted OSM geocoder for place names stays the named
   fallback once the ODbL review lands, not before.
3. **Google is a last resort and the terms check bounds it.** No Google
   geocoding is merged into the MapLibre map — §6.2 of the Service Specific Terms
   bars Geocoding API content with a non-Google map outright, and only lat/lng
   may be cached, 30 days at most (§6.3.1). The navigation hand-off to Google
   Maps, Apple Maps and Waze stays (it shows no Google content in our map). Any
   future Google use needs its own ADR with the measured gap that justifies it
   (C3's rule) — and given §6.2, the only realistic shape is a Google-map surface
   in the address sheet, never a merge into ours.

## Consequences

- C3's done-when is met: this ADR carries the before/after numbers (85.2 % →
  96.9 % → 98.2 %, reproduced 2026-11-08), the sources with their licences
  (LINZ CC BY 4.0 in the ledger now; OSM ODbL pack-only; Google barred from the
  non-Google map by verified terms), and the trial target met on the eval set at
  **98.2 %**.
- The D8 loop continues on the 33 remaining failures with per-round before/after
  committed, in the order C3 names them (parser tolerance, road aliases, suburb
  tie-break), until the misses close.
- The address squad's eval sets keep growing (new suburbs, businesses, real trial
  labels with consent), and every accuracy claim stays checkable with the one
  command above — the report file names its sample and seed.
