# ADR-016 — The map pack pipeline: the documented build, the honest manifest, and the twice-a-week schedule

- **Status:** accepted
- **Date:** 2026-10-25
- **Decides:** D26's pipeline (MASTER_EXECUTION P3, queue 2 item 7: build and publish the Canterbury offline pack)
- **Builds on:** D26 (Play Asset Delivery, ODbL, Geofabrik twice a week), ADR-005 (the view modes and the pack's shape), `apps/mobile/src/maps/offlinePack.ts` (the manifest the app reads), the maps squad status

## Context

The app's style reads the OpenMapTiles schema (`roads`, `water`, `buildings` with `render_height`,
`boundaries`, `landuse`, `landcover`) and the pack contract is implemented and tested — but **the
pack itself had never been built**, so the 50 MB ceiling, the read latency and the tile contents
were all unmeasured, and no pipeline existed to produce or refresh it. Two scripts were supposed to
be that pipeline and were not, in three specific ways found by reading them against the tools'
official documentation on 2026-10-25:

1. `build-pmtiles.mjs` passed a local extract to `--download` (planetiler downloads sources with
   that flag; a file on disk is `--osm-path`), asked for `--area=christchurch` (Geofabrik publishes
   `new-zealand`, not Christchurch), wrote an intermediate tiles file the tool does not need, and
   printed a `versatiles reduce` step that does not exist in the build at all.
2. `build-3d-buildings.mjs` ran `planetiler --area=christchurch --download=<file> --overlay=<...>
   --profile=courier`. planetiler has no `--overlay` and no `--profile` flags: a second data source
   rides a profile the operator supplies (a single-file Java profile, or a YAML config that declares
   its own sources).
3. Both scripts resolved the repo root one directory short, so the pack would have been written into
   `scripts/apps/mobile/...` — a plan's printed path was the only thing that betrayed it.
4. Neither script recorded the tool versions, the archive's real header, or the credit the
   OpenMapTiles schema and profile require (planetiler's README: a map built with an OpenMapTiles
   profile must visibly credit OpenMapTiles).

## Decision

### 1. The documented build, and nothing else

`build-pmtiles.mjs --execute` now runs exactly what the tools document:

1. `planetiler --osm-path=<extract> --output=<tileset> --force`, with the heap carried in
   `JAVA_TOOL_OPTIONS=-Xmx4g` (planetiler's README: about 0.5x the input `.osm.pbf`, leaving the
   rest of the RAM for the memory-mapped files; the runner is 16 GB and shared).
2. `pmtiles extract <tileset> <pack> --bbox=MIN_LON,MIN_LAT,MAX_LON,MAX_LAT --maxzoom=17
   --minzoom=6` — the whole-country tileset clipped to the courier's envelope, in the CLI's own
   bbox order.
3. `pmtiles verify <pack>` — the archive is ordered and its header is right.
4. `pmtiles show --header-json <pack>` — the real header recorded, not the requested one.
5. The sha256, the tool versions and the OpenMapTiles credit written into
   `canterbury.manifest.json`.

The licence gates are unchanged and stay ahead of every step: a source whose terms forbid the
offline use is refused whatever the workflow asks for, and an unregistered source needs the
founder's supplied terms plus `--confirm-offline-use`. `osm-foundation-tiles` and
`protomaps-hosted-api` remain refused by name.

### 2. The 3D buildings: the gate stays, the invented flags go

The LINZ building outlines are a second data source, so they ride a profile. No profile exists yet,
so `build-3d-buildings.mjs --execute` **refuses** and names what it needs (the profile, the schema
the app reads, and the fact that the pack build already bakes OSM buildings with `render_height`, so
the app draws buildings without the LINZ footprints). Its licence gate and its manifest — the parts
that are real, and the ones the app reads offline — keep working unchanged. The overlay profile is a
follow-up with its own spec; inventing a flag to fake it would be the exact failure mode this ADR
exists to record.

### 3. The twice-a-week schedule (D26), and what triggers it

`.github/workflows/map-pack.yml`: a scheduled build (Sunday and Wednesday 00:30 UTC, D26), a manual
dispatch (with the extract URL and the source id as inputs), and a push trigger on the workflow and
the two scripts themselves — so a change to the pipeline is exercised, and the only trigger that
can affect a pull request's checks is the push path on `main`. It installs the pinned tools (the
planetiler jar and the pmtiles CLI from their releases, through a shim named `planetiler` so the
scripts call it the same way an operator does), downloads the Geofabrik NZ extract (or the supplied
one), builds, verifies, records the evidence in `docs/evidence/maps/pack/` and uploads the pack and
manifest as artifacts. It never gates a PR: a 90-minute build with a 400 MB download says nothing
about a pull request.

### 4. What is NOT verified by this item, and stays honest

- The **50 MB ceiling** is checked by the build (it fails over it) but has never been observed: the
  maps status keeps that row at UNVERIFIED until the first run's evidence lands.
- The **LINZ overlay** is not built (see §2).
- The **frame times, the battery and the read latency** are the maps squad's next measurements, not
  this item's claim.

## Consequences

- The pipeline can be run by a founder by hand or by the schedule; the evidence records the size,
  the sha256, the tool versions and the real archive header for every pack that ships.
- The manifest now carries the OpenMapTiles credit the licence requires, so the app's offline
  attribution is complete.
- Geofabrik's download-terms page could not be read from the build machine (the host timed out):
  the script warns on every run until the operator confirms the terms, and the workflow's log
  carries that warning.
- When the pack is first built, the maps status's unverified rows (size, latency, frames) get their
  first real numbers from `docs/evidence/maps/pack/`.

## Verification

- `apps/mobile/src/maps/__tests__/packBuilder.test.ts` (11 tests): the licence gates (each refused
  source, the unknown source, the supplied source with its terms), the plan's documented steps, the
  absence of the invented ones, the heap and tool naming, the pack path (the repo-root pin), and
  the 3D script's gate and manifest.
- The build itself: the workflow, run on schedule or by dispatch, with the evidence and the artifact
  as the proof.
