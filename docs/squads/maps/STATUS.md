# Maps & Navigation Squad - status

Updated: 2026-10-21 (T5 Courier Maps: the style, the pack contract and the map screen)

## Done (with evidence)

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
  position puck, the attribution on the map and the day, night and contrast
  switch. The `map-screen` test id is kept. Tested in
  `apps/mobile/app/(tabs)/__tests__/map.test.tsx`.
- **The pack build script** (`scripts/build-pmtiles.mjs`): it checks the terms
  of the tile source, refuses the sources whose terms forbid our offline use,
  prints the plan and stops, and writes the licence and the attribution into
  the pack manifest.
- **The squad documentation** (`docs/squads/maps/README.md`): the decision, the
  pack layout, how to build the pack, the licence of the data and the
  performance budget.

## Metrics vs targets

| Metric | Target | Today | Evidence |
|--------|--------|-------|----------|
| Day and night styles exist | one recipe, three themes | done | `apps/mobile/src/maps/styles.ts` |
| Attribution on the map, offline | three notices, no network | done | `apps/mobile/src/maps/styles.ts`, `apps/mobile/app/(tabs)/map.tsx` |
| The pack detection and the fallback | works with no pack, no network | done | `apps/mobile/src/maps/offlinePack.ts` |
| The map screen | a real map, no crash with no pack | done | `apps/mobile/app/(tabs)/map.tsx` |
| Full Canterbury offline | the pack on the device | **not built** - the pack is about 50 MB and has to be built from an extract | the build script, `docs/squads/maps/README.md` |
| Pack size | 50 MB or under | **UNVERIFIED** | no pack has been built |
| Pan and zoom | 60 fps | **UNVERIFIED** | no perfetto trace exists |
| APK size | 80 MB without the packs | **UNVERIFIED** | not measured |

## Next

1. Build the pack from an extract and record its size and its SHA-256 in
   `docs/squads/maps/eval/pack-matrix.md`.
2. Prove `pmtiles://file://` through the RN binding on the emulator, with the
   pack as the tile source (the upstream example only shows `pmtiles://https://`).
3. Record the frame traces on the CI emulator profile and on one mid-range
   Android.
4. Produce the glyph bundle and put it in the pack layout, so the street names
   and the house numbers draw on the device.
5. Build the courier layers of the tileset (entrances and access restrictions);
   the style already reads the house numbers.
6. Add the pack download with the weekly refresh (T5.5) and the region list
   (T5.9).
7. Show the attribution in About and in the main menu as well (T5.4), with the
   links, so the credit is in three user-visible places and not only on the
   map.

## Risks

- **Whether an on-device cached OSM tile set is an ODbL "Produced Work"** is a
  legal question, not an engineering one, and it is still unanswered. The
  attribution is visible in every case; the founder and counsel decide the rest.
- **The Geofabrik download terms could not be read from the build machine** on
  2026-10-21 (the host timed out), so the operator has to confirm the current
  terms before the first production build. The build script says so every time.
- **The pack has never been built**, so the 50 MB ceiling, the read latency and
  the frame times are all unmeasured.
- **The pack is not in the APK yet.** The app reads it from the document
  directory; the founder has to choose the delivery (install-time asset
  delivery, or a first run download on Wi-Fi).
- **The glyph bundle does not exist yet**, so no text is drawn on the map until
  it is built.
