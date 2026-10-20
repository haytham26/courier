# ADR-003 — The LINZ address layers and how the data is fetched

- **Status:** accepted
- **Date:** 2026-10-20
- **Task:** V3 T4 (real addresses) · **Branch:** `feat/t4-linz-addresses`
- **Research:** `docs/research/2026/expo-sdk-58.md` shows the research pattern; this ADR records the data
  facts, which were verified against the live service, not from memory.

## Context

FINAL_PROMPT §0-C.2a and D19 require the address engine to run against the real **LINZ NZ
Addresses** data, with the layer ids verified in the LINZ documentation (the V3 task list
expected `105689`).

The founder's local copy of the data (`data/linz/`, gitignored) is **not** on this machine, so
the data is fetched from the LINZ Data Service (LDS) WFS with the read-only key in
`.env.local`.

## Verified layer ids (2026-10-20)

`GET https://data.linz.govt.nz/services;key=…/wfs?service=WFS&request=GetCapabilities` returns
1 736 titled layers. The address layers are:

| Title | Layer id |
|-------|----------|
| NZ Addresses | `data.linz.govt.nz:layer-123113` |
| NZ Addresses: Roads | `data.linz.govt.nz:layer-123110` |
| NZ Addresses: Road Sections | `data.linz.govt.nz:layer-123109` |

**`105689` is stale** — it is not one of the current address layers. The ids above are the ones
the service publishes today; the fetcher therefore uses them and re-verifies them before every
import (the "layer ids in config and checked before each import" rule of FINAL_PROMPT §5.1).

## The request that actually works

```text
https://data.linz.govt.nz/services;key=<KEY>/wfs
  ?service=WFS&version=2.0.0&request=GetFeature
  &typeNames=data.linz.govt.nz:layer-123113
  &bbox=<min_lat>,<min_lon>,<max_lat>,<max_lon>   # WFS 2.0 is latitude first
  &srsName=EPSG:4326&outputFormat=application/json
  &count=<n>&sortBy=address_id&startIndex=<n>
```

Two traps, both found by running it (the first attempt returned HTTP 400, the second returned
zero features with a plausible status code):

1. **`sortBy` needs a real field name** — `sortBy=id` is a 400; the field is `address_id`.
2. **The bounding box is latitude first** — `EPSG:4326` in WFS 2.0 is `lat,lon`. The
   longitude-first box returns **200 with zero features**, which looks like an empty area
   rather than an error.

## The data

Each feature carries: `address_id`, `road_id`, `full_address_number`, `full_road_name`,
`full_address`, `territorial_authority`, `unit_type`, `unit_number`, `stsuburb`, `postcode`,
`geom` and the point geometry.

Example (real): `160 Bealey Avenue, Christchurch Central, Christchurch`.

## Decision

- `scripts/fetch-linz.py` fetches the verified layers per area (Christchurch, Waimakariri,
  Selwyn) into `data/linz/` as GeoJSON, with paging, and never prints the key.
- `scripts/list-linz-layers.py` lists the layers with their titles, so the next person can
  re-verify the ids in one command instead of guessing.
- The D8 engine reads this data through the same `AddressStore` interface, so the fixture store
  (tests) and the real store (production) are interchangeable.
- The key stays in `.env.local`; the data is gitignored; only the **report** (accuracy numbers,
  never the data) is committed.

## Consequences

- The D8 accuracy claim can finally be measured against real LINZ ids (T4).
- The weekly rebuild job (T5/T7) uses the same script, so the layer ids are checked every week.
- If LINZ renumbers a layer, the fetcher fails loudly (the ids are in one place) instead of
  silently importing nothing.
