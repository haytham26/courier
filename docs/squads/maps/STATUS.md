# Maps & Navigation Squad - status

Updated: 2026-10-22 (MASTER_EXECUTION §11: the view modes, the toggles, the free offline 3D buildings and the voice camera)

## Done (with evidence)

- **The view modes** (`apps/mobile/src/maps/viewModes.ts`): flat, 3D, satellite
  and auto, with one pure rule that decides the mode. The battery saver wins,
  the satellite mode needs a network and a licence, and the auto mode tilts
  the map while the courier is driving in a town. Tested in
  `apps/mobile/src/maps/__tests__/viewModes.test.ts`.
- **The mode is remembered per driver** (`apps/mobile/src/sync/storage.ts`,
  `apps/mobile/src/maps/useMapViewMode.ts`): one small JSON file per driver in
  the document directory, so a shared van phone does not carry one driver's map
  into the next shift. Tested in
  `apps/mobile/src/maps/__tests__/viewModeStorage.test.ts`.
- **The toggles** (`apps/mobile/src/maps/toggles.ts`,
  `apps/mobile/src/maps/MapSettingsSheet.tsx`): the buildings, the traffic, the
  road closures, the weather, the label size, the battery saver and the
  day/night/auto theme, in a sheet under the map, with the tokens and the test
  ids. Tested in `apps/mobile/src/maps/__tests__/toggles.test.ts` and in the
  map screen test.
- **The voice commands** (`apps/mobile/src/voice/commands.ts`): "3D on", "flat
  map", "satellite", "auto" and the camera verbs. Tested in
  `apps/mobile/src/voice/__tests__/commandParser.test.ts`.
- **The voice camera** (`apps/mobile/src/maps/cameraCommands.ts`): the spoken
  camera verbs adapted from **God's Eye View** (MIT, read 2026-10-22) with its
  notice kept, and the provenance in `docs/product/LICENSES.md`.
- **The 3D buildings in the style** (`apps/mobile/src/maps/styles.ts`): the
  fill-extrusion layer, the soft light of the theme and the graceful 2D
  fallback when the pack has no outlines.
- **The pack manifest carries the buildings**
  (`apps/mobile/src/maps/offlinePack.ts`): the `buildings` section, with the
  licence of **every** input of the bake.
- **The build script for the buildings**
  (`scripts/data/build-3d-buildings.mjs`): it checks the licence of every input,
  refuses Google Photorealistic 3D Tiles and Cesium ion by name, refuses an
  unknown source, prints the plan and stops, and writes the licence and the
  credit of every input into the manifest. Tested in
  `apps/mobile/src/maps/__tests__/buildingBuilder.test.ts`.
- **The satellite imagery is refused without a licence**
  (`apps/mobile/src/maps/config.ts`): the endpoint and the licence of the
  provider both have to be in the build, and without them the mode says so and
  the map stays flat.
- **The ADR** (`docs/decisions/adr/ADR-005-map-view-modes.md`): the modes, the rule, the
  storage, the toggles, the 3D buildings, the voice camera and the founder
  gate for a photo-real mode.
- **The courier style** (`apps/mobile/src/maps/styles.ts`): one recipe generated
  from the design tokens, with the day, night and high-contrast themes, the
  attribution in the tile source and the house numbers at z17. Tested in
  `apps/mobile/src/maps/__tests__/styles.test.ts`.
- **The offline pack contract** (`apps/mobile/src/maps/offlinePack.ts`): the
  manifest schema, the version and region checks, the detection of the
  downloaded and the bundled pack and the fallback to the online source and to
  no source at all. Tested in
  `apps/mobile/src/maps/__tests__/offlinePack.test.ts`.
- **The file system adapter** (`apps/mobile/src/maps/packFiles.ts`): where the
  pack is read from, and the copy of the bundled pack into the document
  directory.
- **The configurable source** (`apps/mobile/src/maps/config.ts`): the tile URL
  comes from the build configuration, and the OpenStreetMap Foundation tile
  servers are refused whatever the configuration says. Tested in
  `apps/mobile/src/maps/__tests__/config.test.ts`.
- **The map screen** (`apps/mobile/app/(tabs)/map.tsx`): a real MapLibre map
  with the courier style, the stop markers with their sequence numbers, the
  position puck, the attribution on the map, the four map modes, the settings
  sheet and the voice camera. The `map-screen` test id is kept. Tested in
  `apps/mobile/app/(tabs)/__tests__/map.test.tsx`.
- **The pack build script** (`scripts/data/build-pmtiles.mjs`): it checks the terms
  of the tile source, refuses the sources whose terms forbid our offline use,
  prints the plan and stops, and writes the licence and the attribution into
  the pack manifest.
- **The squad documentation** (`docs/squads/maps/README.md`): the decision, the
  view modes, the pack layout, how to build the pack, the licence of the data
  and the performance budget.

## Metrics vs targets

| Metric                                 | Target                                               | Today                                                                       | Evidence                                                                 |
| -------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Day and night styles exist             | one recipe, three themes                             | done                                                                        | `apps/mobile/src/maps/styles.ts`                                         |
| Attribution on the map, offline        | three notices, no network                            | done                                                                        | `apps/mobile/src/maps/styles.ts`, `apps/mobile/app/(tabs)/map.tsx`       |
| The pack detection and the fallback    | works with no pack, no network                       | done                                                                        | `apps/mobile/src/maps/offlinePack.ts`                                    |
| The map screen                         | a real map, no crash with no pack                    | done                                                                        | `apps/mobile/app/(tabs)/map.tsx`                                         |
| Four driver-selectable map modes       | tap and voice, remembered per driver                 | done                                                                        | `apps/mobile/src/maps/viewModes.ts`, `apps/mobile/src/voice/commands.ts` |
| The satellite mode                     | online only, behind a licensed provider              | done - the seam is in place, no provider is licensed                        | `apps/mobile/src/maps/config.ts`                                         |
| The toggles in a sheet under the map   | buildings, traffic, closures, weather, labels, theme | done                                                                        | `apps/mobile/src/maps/MapSettingsSheet.tsx`                              |
| The 3D buildings                       | free, offline, drawn from the pack                   | the style and the build script are done, **the pack is not built**          | `apps/mobile/src/maps/styles.ts`, `scripts/data/build-3d-buildings.mjs`       |
| The licence of every input of the bake | checked by the script, recorded in the manifest      | done                                                                        | `scripts/data/build-3d-buildings.mjs`                                         |
| Full Canterbury offline                | the pack on the device                               | **not built** - the pack is about 50 MB and has to be built from an extract | the build script, `docs/squads/maps/README.md`                           |
| Pack size                              | 50 MB or under                                       | **UNVERIFIED**                                                              | no pack has been built                                                   |
| Pan and zoom                           | 60 fps                                               | **UNVERIFIED**                                                              | no perfetto trace exists                                                 |
| The 2D map against the 3D map          | the same frame budget, 8 % an hour of battery        | **UNVERIFIED**                                                              | the 3D map has never been on a device                                    |
| APK size                               | 80 MB without the packs                              | **UNVERIFIED**                                                              | not measured                                                             |

## Next

1. Build the pack from an extract and record its size and its SHA-256 in
   `docs/squads/maps/eval/pack-matrix.md`.
2. Bake the 3D buildings into that pack and record the size of the pack with
   and without them: the 50 MB ceiling is the constraint that decides whether
   the outlines go from z13 or from z15.
3. Prove `pmtiles://file://` through the RN binding on the emulator, with the
   pack as the tile source (the upstream example only shows `pmtiles://https://`).
4. Record the frame traces of the 2D map and the 3D map on the CI emulator
   profile and on one mid-range Android, and the battery of an hour in each.
5. Produce the glyph bundle and put it in the pack layout, so the street names
   and the house numbers draw on the device.
6. Build the courier layers of the tileset (entrances and access restrictions);
   the style already reads the house numbers.
7. Add the pack download with the weekly refresh (T5.5) and the region list
   (T5.9).
8. Show the attribution in About and in the main menu as well (T5.4), with the
   links, so the credit is in three user-visible places and not only on the
   map.
9. Wire the live traffic, the road closures and the weather to their
   providers: the toggles and the sheet are ready, the layers are not.
10. Prepare the cost estimate of an optional photo-real mode for the founder
    gate (MASTER_EXECUTION §7.3): the key, the budget alert and the new ADR.

## Risks

- **Whether an on-device cached OSM tile set is an ODbL "Produced Work"** is a
  legal question, not an engineering one, and it is still unanswered. The
  attribution is visible in every case; the founder and counsel decide the rest.
- **The Geofabrik download terms could not be read from the build machine** on
  2026-10-21 (the host timed out), so the operator has to confirm the current
  terms before the first production build. The build script says so every time.
- **The pack has never been built**, so the 50 MB ceiling, the read latency and
  the frame times are all unmeasured - and the 3D buildings are in the pack
  budget too.
- **The pack is not in the APK yet.** The app reads it from the document
  directory; the founder has to choose the delivery (install-time asset
  delivery, or a first run download on Wi-Fi).
- **The glyph bundle does not exist yet**, so no text is drawn on the map until
  it is built.
- **MapLibre does not draw shadows for the extruded buildings yet.** The soft
  light of the theme carries the depth until the upstream issue is closed.
- **The satellite mode is dead code until a provider is licensed.** That is
  deliberate: it is the seam the paid imagery goes into, and it is refused
  loudly rather than quietly.
