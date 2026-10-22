# ADR-005 — The courier map view modes, the free offline 3D buildings and the voice camera

- **Status:** accepted
- **Date:** 2026-10-22
- **Decides:** MASTER_EXECUTION §11 (Courier Maps view modes + the ideas from God's Eye View)
- **Owner:** the Maps & Navigation squad (`docs/squads/maps/`)
- **Research:** `docs/research/2026/oss-maps-courier.md`,
  `docs/research/2026/map-rendering-offline-tiles.md`

## Context

MASTER_EXECUTION §11 is binding and asks for four things:

1. **Driver-selectable map modes** - 2D flat, 3D, Satellite and Auto - remembered
   per driver, switchable by tap and by voice.
2. **The toggles** - buildings, traffic, road closures, weather, the label size and
   the day/night/auto theme - in a sheet under the map.
3. **Free offline 3D buildings** - the LINZ NZ Building Outlines (CC BY 4.0) and the
   OpenStreetMap building heights and levels (ODbL), baked into the Canterbury
   PMTiles, drawn with MapLibre's fill-extrusion.
4. **The ideas from `github.com/bilawalsidhu/gods-eye-view`** (MIT): the voice
   control of the map camera.

The constraints that shape the answer are the ones the squad already wrote down
(`docs/squads/maps/README.md`):

- the map has to work **offline**, in a dead spot, on the whole of Canterbury;
- the pack has to stay under 50 MB and the APK under 80 MB;
- the battery budget is 8 % an hour, and the phone is in a van in the sun;
- the OpenStreetMap Foundation tile servers are refused by the app itself;
- the licence of every input of the pack has to be checked and recorded.

Two things are **not** allowed without a commercial licence: Google
Photorealistic 3D Tiles and Cesium ion. The founder's own text says so, and it
says an optional photo-real mode is a founder approval gate with a cost
estimate (1 000 free sessions a month, then metered).

## Decision

### 1. The four modes and the rule that decides them

| Mode        | What the map does                                                                                        | When it is refused                                           |
| ----------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `flat`      | the flat 2D map                                                                                          | never                                                        |
| `3d`        | the map tilts (55°) and the buildings stand up                                                           | never - a pack without the outlines draws the flat buildings |
| `satellite` | the imagery from a licensed provider, online only                                                        | without a network **or** without a licensed provider         |
| `auto`      | 3D while the courier is driving in a town, flat when they stop, on a rural road and on the battery saver | never                                                        |

The rule is one pure function, `resolveViewMode` in
`apps/mobile/src/maps/viewModes.ts`, and it is applied in this order:

1. **The battery saver wins.** The map stays flat whatever was asked for, and
   the courier is told why. The 3D map is the first thing that costs battery on
   a phone in a van.
2. **Satellite needs a network and a licence.** Without either, the map stays
   flat and the courier is told why: _"Satellite needs a network and a licence.
   Showing the flat map."_ The app never points the map at a tile source it has
   no right to use, and it never shows a broken map.
3. **Auto** tilts the map while the courier is moving inside the box of the
   day's stops - a town is where the deliveries are - and keeps it flat when
   they stop or when they are on a rural road.

The "town" test is the box of the day's stops (`stopsBounds` in
`apps/mobile/src/maps/stops.ts`), and the "moving" test is 2.5 m/s
(`isMoving` in `apps/mobile/src/maps/driving.ts`).

### 2. The mode is remembered per driver

The mode and the map settings are kept in the app's own storage, one small
JSON file per driver (`apps/mobile/src/sync/storage.ts`):

```
<documentDirectory>/preferences/<driver id>.json
```

A shared van phone can carry more than one driver, and the driver who had the
3D map on is not the driver who has it now. The theme choice is kept the same
way, so the whole app remembers the courier, not the phone.

### 3. The toggles live in a sheet under the map

The sheet (`apps/mobile/src/maps/MapSettingsSheet.tsx`) holds the buildings, the
traffic, the road closures, the weather, the label size, the battery saver and
the day/night/auto theme. Every control has a label, a role and a test id.

The three online layers are **remembered but not drawn** until their provider
is configured. The sheet says so in plain words - _"Traffic is not set up yet.
Your choice is remembered."_ - and the map never points at a source it has no
right to use. That is the same rule the offline pack follows.

### 4. The 3D buildings are free and offline

The buildings come from two inputs, and both licences are recorded in the pack
manifest, input by input:

| Input                                        | Licence                                        | Credit                                                                                                                     |
| -------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| LINZ NZ Building Outlines (LDS layer 101290) | Creative Commons Attribution 4.0 International | "Sourced from the LINZ Data Service and licensed for reuse under the CC BY 4.0 licence"                                    |
| OpenStreetMap building heights and levels    | Open Database License (ODbL)                   | "© OpenStreetMap contributors. Contains information from OpenStreetMap, available under the Open Database License (ODbL)." |

`scripts/data/build-3d-buildings.mjs` is the gate: it checks the licence of
**every** input, refuses the sources whose terms forbid our offline use,
refuses a source that is not registered at all, prints the plan and stops
unless `--execute` is given, and writes the licence and the credit of every
input into the `buildings` section of the pack manifest.

The app draws the buildings with MapLibre's fill-extrusion, with the height of
a storey at 3 m, the height on the building when it has one, and 4 m for a
building that has neither. A pack **without** the outlines draws the flat
buildings: the graceful 2D fallback, and the mode still says so
(_"This map pack has no 3D buildings yet, so the buildings stay flat."_).

The soft light of the buildings is the sky of the theme (`light` in the style),
so the day buildings are lit by the day and the night buildings by the night.
MapLibre does not draw shadows for the extruded buildings yet - the upstream
issue is open - so the light is what carries the depth. The frame times and the
battery of the 2D and the 3D map are still **UNVERIFIED**: they need the
pack and a device.

### 5. The voice camera comes from God's Eye View, the imagery does not

The upstream project was read on 2026-10-22
(https://github.com/bilawalsidhu/gods-eye-view). Its `LICENSE` is the MIT
licence, "Copyright (c) 2026 Bilawal Sidhu", and the notice is kept in
`apps/mobile/src/maps/cameraCommands.ts` and recorded in `docs/product/LICENSES.md`.

What is adopted is the **idea** of the spoken camera verbs, on MapLibre and the
courier's own stops: "zoom to the next stop", "tilt the map", "follow me",
"look back", "reset the map". The upstream project is a browser globe built on
CesiumJS with Google Photorealistic 3D Tiles, so its code does not come with
it; the catalogue is ours, in the shape of our own voice catalogue.

The imagery providers of the upstream project are **not** adopted, and the
build script refuses them by name.

### 6. The Google 3D mode is a founder gate, not a default

`scripts/data/build-3d-buildings.mjs` registers Google Photorealistic 3D Tiles and
Cesium ion with `offlineUse: 'forbidden'`, so the build refuses them whatever
the operator asks for.

If the founder wants an optional online photo-real mode, it is an approval
gate under §7.3, and the preparation is: the cost estimate (Google's first
1 000 photorealistic sessions a month are currently free, then metered, with
billing enabled), the key in the GitHub secrets, and a new ADR. The app
architecture already has the place for it: the satellite mode is the online
imagery mode, and it is refused today only because no provider is licensed.

## Consequences

- The courier picks the map the way they pick the radio station: once, with one
  tap or one sentence, and it is theirs until they change it.
- The map never shows a broken tile source. A missing network, a missing
  provider and a missing pack all end in a plain sentence and a map that
  still draws the stops.
- The 3D buildings cost nothing: no key to buy, no per-session bill, no
  network. The price is the size of the pack, which is still to be measured.
- The licence of every input is checked by a script, not by a review step, and
  the credit is in the manifest, so the app can show it with no network.
- The satellite mode is dead code until a provider is licensed. That is
  deliberate: it is the seam the paid imagery goes into, and it is refused
  loudly rather than quietly.

## Risks

| Risk                                                                 | Mitigation                                                                                                                                                    |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The 50 MB pack ceiling with the building outlines in it              | the outlines are only in the pack from z13; the build script prints the size of every step, and the pack is measured before the release                       |
| The 3D map costs battery                                             | the battery saver forces the flat map, the auto mode only tilts while driving in a town, and the frame traces and the battery are measured before the release |
| The aerial imagery the outlines were taken from is not owned by LINZ | the layer itself is published by LINZ under CC BY 4.0 and the credit is in the manifest; the founder and counsel confirm the wording for the release          |
| The ODbL "Produced Work" question on the baked pack                  | the attribution is shown in every case, and the question is still open in `docs/squads/maps/README.md`                                                        |
| The shadows the 3D buildings should have                             | MapLibre does not support them yet; the soft light is the answer until it does                                                                                |

## Verification

- The state machine, the storage per driver, the toggles, the voice parsing and
  the licence checks of the builder are covered by the mobile jest suite
  (`apps/mobile/src/maps/__tests__/`, `apps/mobile/src/voice/__tests__/`), with
  no device, no map server and no network.
- The licence of the LINZ outlines was read on 2026-10-22 at
  https://www.linz.govt.nz/products-services/data/licensing-and-using-data/attributing-linz-data
  ("Almost all data from the LINZ Data Service is provided under the Creative
  Commons Attribution 4.0 International licence"), and the LDS layer of the
  outlines is 101290
  (https://data.linz.govt.nz/layer/101290-nz-building-outlines/).
- The licence of God's Eye View was read on 2026-10-22 at
  https://raw.githubusercontent.com/bilawalsidhu/gods-eye-view/main/LICENSE (MIT).
- The pack, the frame times and the battery are **not** verified: the pack has
  never been built, so the 3D buildings have never been drawn on a device.
