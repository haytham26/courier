# Maps & Navigation Squad

**Mission:** The whole of Canterbury offline, day and night, at 60 fps.

**Code:** `apps/mobile/src/maps`, `apps/mobile/app/(tabs)/map.tsx`, `scripts/build-pmtiles.mjs`

**Tasks:** T5 offline PMTiles, T7.7 driving mode

## Targets (the release gate)

- 60 fps pan/zoom
- full Canterbury offline
- day and night styles matching the mockups
- the pack at or under 50 MB, the APK at or under 80 MB without the packs

## The decision (T5, taken 2026-10-21)

| Piece | Choice | Why |
|---|---|---|
| Renderer | `@maplibre/maplibre-react-native` 11.3.7, upgrade to 11.5.0 is still open | the only RN binding with New Architecture codegen, Expo 58 peers and a file-backed PMTiles reader underneath |
| Container | PMTiles v3 | one single-file archive, a public-domain specification, and a native reader that takes `pmtiles://file://` |
| Style | our own courier style, generated from the design tokens, on the Protomaps basemap schema v4 | one recipe, three themes, so day, night and the sun variant cannot drift apart |
| Pack | we build it ourselves from an OSM extract | the OSMF tile servers forbid offline use, so there is no other free route |
| Fallback | our own hosted tiles, configured per build | the OpenStreetMap Foundation servers are refused by the app itself |
| Attribution | on the map, in About and in the main menu, with the ODbL and LINZ notices, offline | the licence has to be honoured in the one situation where the user has no internet to read it |

The sources are the research files in this repository:
`docs/research/2026/oss-maps-courier.md`,
`docs/research/2026/map-rendering-offline-tiles.md` and
`docs/research/2026/navigation-turn-by-turn.md`.

## The pack layout

The repository holds the layout, not the pack: the archive is about 50 MB and
is not in git.

```
apps/mobile/assets/maps/canterbury.pmtiles         the tile archive
apps/mobile/assets/maps/canterbury.manifest.json    the manifest
apps/mobile/assets/maps/glyphs/<fontstack>/<range>.pbf   the glyph bundle
```

At runtime the same files live in the app's document directory, which is where
the weekly refresh puts the new pack:

```
<documentDirectory>/maps/canterbury.pmtiles
<documentDirectory>/maps/canterbury.manifest.json
<documentDirectory>/maps/glyphs/...
```

The app reads the pack in this order:

1. the downloaded pack in the document directory, when its manifest is there
   and matches what this build understands;
2. the pack bundled with the app, which is copied into the document directory
   the first time it is needed;
3. the online source, when one is configured;
4. nothing - the style then draws the background and the courier overlay only,
   so a courier in a dead spot still sees the stops.

The manifest is the contract between the build and the app:

```json
{
  "schema": "courier-copilot/offline-pack",
  "version": 1,
  "region": "canterbury",
  "builtAt": "2026-10-21T00:00:00.000Z",
  "source": "Geofabrik New Zealand extract",
  "sourceLicence": "Open Database License (ODbL)",
  "sourceLicenceUrl": "https://www.openstreetmap.org/copyright",
  "attribution": "© OpenStreetMap contributors. Contains information from OpenStreetMap, available under the Open Database License (ODbL). Sourced from the LINZ Data Service and licensed for reuse under the CC BY 4.0 licence",
  "minZoom": 6,
  "maxZoom": 17,
  "bytes": 41943040,
  "sha256": "..."
}
```

A pack whose version or region is not the one the app expects is not used: the
app falls back to the online source rather than draw a half-understood map.

## Building the pack

```bash
# the plan: the terms are checked, the steps are printed, nothing happens
node scripts/build-pmtiles.mjs --source geofabrik-nz

# the build: the extract has to be on the machine already
node scripts/build-pmtiles.mjs --source geofabrik-nz --execute --input data/linz/newzealand-latest.osm.pbf
```

The script never downloads anything. It refuses to build from a source whose
terms forbid our offline use, and it writes the licence and the attribution
of the source into the manifest so the app can show them without a network.

The tools are the ones the research chose, each pinned by SHA-256:

| Step | Tool | Licence |
|---|---|---|
| tileset from the extract | `onthegomap/planetiler` (`--area=christchurch`) | Apache-2.0 |
| cut to the region and the zooms | `protomaps/go-pmtiles` (`pmtiles extract`) | BSD-3-Clause |
| the style-driven size cut | `versatiles-org/versatiles-rs` (`reduce --style`) | MIT |

## The licence of the data

The pack carries OpenStreetMap data. The credit the app shows is the one the
sources ask for, and it is shown on the map, in About and in the main menu:

- **OpenStreetMap** - "© OpenStreetMap contributors". The OSMF Tile Usage
  Policy asks for exactly this: "Show OpenStreetMap licence attribution
  clearly on the map (typically bottom-right). Typically: © OpenStreetMap
  contributors" (read 2026-10-21 at
  https://operations.osmfoundation.org/policies/tiles/).
- **The Open Database Licence** - "Contains information from OpenStreetMap,
  available under the Open Database License (ODbL)." The OSMF copyright page
  sets out the two duties: "Provide credit to OpenStreetMap by displaying our
  attribution notice" and "Make clear that the data is available under the
  Open Database License" (read 2026-10-21 at
  https://www.openstreetmap.org/copyright).
- **LINZ** - "Sourced from the LINZ Data Service and licensed for reuse under
  the CC BY 4.0 licence". That is the wording the LINZ attribution page asks
  for; for an adapted collection it is "Contains data sourced from the LINZ
  Data Service licensed for reuse under CC BY 4.0" (read 2026-10-21 at
  https://www.linz.govt.nz/products-services/data/licensing-and-using-data/attributing-linz-data).
  The New Zealand data in OpenStreetMap carries the same credit: "New Zealand:
  Contains data sourced from the LINZ Data Service and licensed for reuse
  under CC BY 4.0."

Two rules the app enforces rather than trusts:

- **The OpenStreetMap Foundation tile servers are refused.** Their Tile Usage
  Policy says: "Offline use is not permitted on tile.openstreetmap.org" and
  forbids bulk downloading (read 2026-10-21 at
  https://operations.osmfoundation.org/policies/tiles/). `apps/mobile/src/maps/config.ts`
  refuses the host whatever the configuration says, and
  `scripts/build-pmtiles.mjs` refuses to build from it.
- **The hosted free tiers are not a pack.** The OpenFreeMap terms allow an
  offline download only "at most 3,000 tiles or 50 MB", with "at most 4
  parallel requests" and "a unique User-Agent identifying your app" (read
  2026-10-21 at https://openfreemap.org/tos/). The Protomaps hosted API is
  "free for non-commercial use. For commercial use, become a GitHub Sponsor."
  The build script treats both as a conditional or a forbidden source.

Still open, and a question for the founder and counsel: whether an on-device
cached OSM tile set is a "Produced Work" that has to be ODbL-licensed itself.
The app shows the attribution in every case, which is what the Protomaps
wording requires.

## The performance budget

| Measure | Target | Where it is set | Status |
|---|---|---|---|
| pan and zoom | 60 fps, p95 frame time under 16.7 ms, no drop of more than two frames | `docs/squads/maps/eval/frame-traces/` | **UNVERIFIED** - no trace exists |
| pack size | 50 MB for the whole of Canterbury | the build script fails over the ceiling | **UNVERIFIED** - no pack has been built |
| tile read from the local file | p95 under 50 ms | the eval harness | **UNVERIFIED** |
| markers | at most 40 native views on the map at once | `MAX_MAP_MARKERS` in `apps/mobile/src/maps/stops.ts` | in place |
| APK | 80 MB without the map and voice packs | `CONSTRAINTS.md` | **UNVERIFIED** |

The style is built for the frame budget: the layers are flat fills and lines,
there is no 3D, and the labels only appear when the glyph bundle is on the
device.

## Evaluation dataset / benchmark

`docs/squads/maps/eval/` - to be built with the first pack:

- `canterbury.osm.pbf` - the extract, built with the same profile the app
  uses;
- `pack-matrix.md` - the pack sizes for `{z6...z17}` and
  `{basemap, basemap + courier layers}`, with the SHA-256 of each artefact;
- `frame-traces/` - perfetto traces of a scripted pan and zoom over the stop
  list, on the CI emulator profile and on one mid-range Android;
- `style-diff/` - day and night screenshots against the mockups;
- `pack-verify.md` - the exact commands, the tool versions and the SHA-256 of
  the pack, so the number is reproducible.

## Research

- `docs/research/2026/map-rendering-offline-tiles.md`
- `docs/research/2026/oss-maps-courier.md`
- `docs/research/2026/navigation-turn-by-turn.md`

## Working agreement

1. The benchmark exists **before** the library is chosen.
2. Every change to the squad's code updates this directory: the status, the metric and the evidence link.
3. A regression in a target blocks the merge (Release Manager role, V4 §1).
4. Two independent review passes for the critical squads (auth, payments, sync, address, voice, routing).

## Files

- `STATUS.md` - done with evidence, metrics vs targets, next, risks.
- `research.md` - the 2026 research note for this niche (or a pointer to `docs/research/2026/`).
- `decisions.md` - the ADRs this squad owns.
- `benchmarks/` - the benchmark harness and its results.
