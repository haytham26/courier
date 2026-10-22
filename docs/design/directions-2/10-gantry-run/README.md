# 10 Gantry Run

**The idea.** The run is an overhead gantry: a rail of the whole day above the next stop, read at a
glance.

**The route.** `/design2/10-gantry-run` — the four screens of the brief (Today, Driving, Copilot,
Scanner), in the day and in the night, with the seven states of the contract behind `?state=`.

This is a candidate for the founder's pack (MASTER_EXECUTION §13.6). It is not the product, and no
screen of the product is built in it.

---

## The fingerprint

The ten fields of `docs/design/SPEC.md` §10.

| # | The field | This direction |
|---|---|---|
| 1 | The accent | Vermilion `#b3261e` (palette P3 Signal), 5.88:1 as text on the background |
| 2 | The second chromatic colour | Ink `#1d2a33`, the structure under the accent, 13.21:1 on the background |
| 3 | The type pairing | Bricolage Grotesque (display) and IBM Plex Sans (work), both SIL OFL 1.1 — pairing D |
| 4 | The density | Dense: six stops visible on Today at 390 by 844 |
| 5 | The layout grammar | The overhead rail: the rail is the top of the screen and the next stop hangs under it; every other block is left-aligned to the rail, and nothing is centred |
| 6 | The motion character | The rail latches: a sign drops into its place and the rail takes the weight of it, 200 ms |
| 7 | The map treatment | The Protomaps style, recoloured in P3 Signal, the buildings extruded at 45 degrees |
| 8 | The icon treatment | Material Symbols, weight 500; the sign of the gantry is the direction's own glyph, drawn on the 4-pt grid |
| 9 | The night rule | The ground cools to a near-black (`#111110`) and the accent is lifted to `#f2726a`, the one measured change of the round, because the measured row of the research reads 4.02:1 on the chip and the bar is 4.5:1 |
| 10 | The three signature moments | The rail latches, the camera steps, Copilot is a sign that latches |

---

## The mood board

The references that shaped this direction, with the source each one was read from
(`docs/design/RESEARCH-2.md`, read 2026-10-22). What is taken is the discipline, never the asset.

| The reference | What it gave this direction |
|---|---|
| [Apple Design Awards 2026](https://developer.apple.com/design/awards/2026/) — Caradise and Vocabulary (RESEARCH-2 §3.1) | The finish quality: the exact hairline, the exact corner, the exact shadow; illustration used sparingly and in one system |
| [Moonlitt](https://apps.apple.com/us/story/id1896834601) — a 3D map with a calm surface around it (RESEARCH-2 §3.1) | The camera that steps rather than swings: the map never turns under the driver while the address is being read |
| [Watch Duty: Wildfire Maps](https://developer.apple.com/design/awards/2025/) — the incident map (RESEARCH-2 §3.1) | The rule that the red means one thing only: the vermilion is the sign of the gantry and the failed stop, and nothing else |
| [protomaps/basemaps](https://github.com/protomaps/basemaps) — the reference style of the round (RESEARCH-2 §5.4) | The quiet land and the thin roads the route runs on, in the ink and the vermilion |
| [Material 3 motion](https://m3.material.io/styles/motion/overview/how-it-works) and the [Reanimated spring reference](https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring/) (RESEARCH-2 §1.3, §5.3) | The latch: a sign drops into its place and takes the weight of itself, once, with a firm pulse |
| [Bricolage Grotesque on Google Fonts](https://github.com/google/fonts/blob/main/ofl/bricolagegrotesque/METADATA.pb) — `wdth 75-100`, `wght 200-800` (RESEARCH-2 §1.5) | A hard, wide, industrial voice for the sign, and a compact number block at `wdth 75` |
| [Android for Cars design principles](https://developer.android.com/design/ui/cars/guides/foundations/design-principles) (RESEARCH-2 §1.8) | The published limit for a moving vehicle: one action in the lower third, nothing centred in the top of the screen |
| [impeccable](https://github.com/pbakaus/impeccable) (RESEARCH-2 §1.7) | The things this direction refuses: a centred hero with two buttons, a card stack, a gradient |

---

## The brand mark

`mark.svg` in this folder: the rail of the run and the sign that hangs on it.

- The rail and its hanger are the ink (`textPrimary`); the sign is the accent (`brandPrimary`, the
  vermilion). No colour outside the palette is used.
- The one-colour form is the whole mark in `textPrimary`.
- The minimum size is 16 px: at that size the rail, the hanger and the sign are still three
  separable shapes.
- The misuses it avoids: the sign is never given a shadow, never a glow and never a second colour;
  the rail is never bent into an arch; the mark is never set inside a rounded square.

---

## The palette

P3 Signal of `docs/design/RESEARCH-2.md` §5.2: vermilion and ink on a neutral. The red means one
thing only.

The full report is `evidence/contrast.txt`, measured with
`packages/design-tokens/src/contrast.ts`. Every pair clears its bar.

| The token | Day | On the background | On the surface | Night | On the night background |
|---|---|---|---|---|---|
| `background` | `#f3f3f1` | — | — | `#111110` | — |
| `surface` | `#ffffff` | — | — | `#191918` | — |
| `surfaceElevated` | `#e9e9e5` | — | — | `#232322` | — |
| `textPrimary` | `#101112` | 17.01:1 | 18.90:1 | `#f6f6f4` | 17.46:1 |
| `textSecondary` | `#43453f` | 8.74:1 | 9.71:1 | `#c6c6c1` | 11.02:1 |
| `brandPrimary` (the vermilion) | `#b3261e` | 5.88:1 | 6.54:1 | `#f2726a` | 6.65:1 |
| `brandSecondary` (the ink) | `#1d2a33` | 13.21:1 | 14.67:1 | `#8fa4b3` | 7.31:1 |
| `border` (3:1 bar) | `#6d6d68` | 4.68:1 | 5.20:1 | `#77776f` | 3.90:1 |
| `mapText` on `mapLand` | `#101112` | 16.85:1 | — | `#f6f6f4` | 14.54:1 |

The bars: 4.5:1 for the body, 7:1 for the driving text, 3:1 for a boundary.

**The one measured change of the round.** The measured row of the research carries `#e0524a` for the
night accent, and the chip of that colour on the dark surface reads 4.02:1 — under the 4.5:1 bar of
`docs/design/SYSTEM.md` §6, so the build gate would fail. The accent is lifted to `#f2726a`, which
keeps the hue of the vermilion and measures 6.65:1 on the night background. The change is proved by
`packages/design-tokens/src/contrast.test.ts`.

---

## The type pairing

Pairing D of `docs/design/RESEARCH-2.md` §5.1 — the compact and industrial pairing.

| The role | The family | The licence | Where the licence is published |
|---|---|---|---|
| Display: the number and the address | Bricolage Grotesque | SIL OFL 1.1 | https://github.com/google/fonts/blob/main/ofl/bricolagegrotesque/OFL.txt |
| Work: everything else | IBM Plex Sans | SIL OFL 1.1 | https://github.com/IBM/plex/blob/master/LICENSE.txt |

`wdth 75` at 60 px is a compact number block, and the weight axis reaches 800 without a second
file, so the sign of the gantry can be heavy without a third family. The seven steps of the scale
are in `packages/design-tokens/src/directions2.ts` (`gantryRun.type`), and every number that changes
is set with tabular figures.

Both licences are SIL OFL 1.1, which covers use in a shipped application and allows the font to be
embedded in the binary. The notice goes into `docs/LICENSES.md` with the rest of the ledger.

---

## The motion language

The character: **the rail latches**. A sign drops into its place and the rail takes the weight of it.
Nothing loops, and the latch happens once.

| The movement | The configuration | The duration | What it does |
|---|---|---|---|
| A sign dropping into the gantry | `motion.springs.latch` — damping ratio 0.94 | 220 ms | The sign slides out of the gantry, the sign of the next stop drops into its place and the marker on the rail moves one notch |
| The panel arriving | The house enter, 200 ms | 200 ms | A block of the screen arrives and takes its place under the rail |
| The confirmation | `motion.springs.latch` | 220 ms | The rail latches with one firm pulse |
| The voice sign | `motion.springs.voiceBar` — damping 34, stiffness 320, mass 0.9 | 200 ms | The sign of the assistant slides into the gantry and latches there, fast enough to keep up with the voice |

Everything runs on the UI thread through Reanimated 4. With "reduce motion" on, the same movement
arrives with no travel: the state still changes, it simply does not travel (the `reducedMotion`
token, duration 0). The haptics are on the confirm, the delivered and the error, and never on a
scroll or a passive map movement.

---

## The map style

- **The basemap.** The Protomaps style, recoloured in P3 Signal
  (https://github.com/protomaps/basemaps; the code is BSD-3-Clause and the visual design of the
  styles is CC0). The data is OSM under the ODbL and the LINZ building outlines under CC BY 4.0, and
  both attributions are on the screen.
- **The layers.** The land, the water, the roads and the motorway in the map colours of the
  direction (`mapLand #f2f2ef`, `mapRoad #ffffff`, `mapHighway #e7d9a8`); the run as one route line
  in the vermilion at 5 px, the widest route of the round because the line is the one thing the
  driver follows; the stops as pins; the labels in `mapText` with the land colour as their halo. At
  night the map carries three layers only: the route, the stops and the labels.
- **The camera.** North-up, always, at a follow pitch of 30 degrees and a follow zoom of 17; the 3D
  pitch is 45 degrees. The camera steps: it moves in 250 ms steps, so the map never turns under the
  driver while the address is being read.
- **The 3D.** The LINZ building outlines and the OSM heights, extruded from our own tiles so it
  works offline, at 45 degrees of pitch. The extrusion is quiet: the building colour of the palette,
  never a second accent.

---

## The signature moments

The three moments a courier lives in (REVIEW-S1 to S3). They are implemented in the route above,
not only described.

1. **How a delivery is confirmed.** The rail latches: the sign of the delivered stop slides out of
   the gantry, the sign of the next stop drops into its place and the marker on the rail moves one
   notch, all in a 220 ms latch with one firm pulse. The same behaviour is on Today and on Driving.
2. **How the map moves.** The camera steps: it stays north-up and moves in 250 ms steps, so the map
   never turns under the driver while the address is being read.
3. **How Copilot appears.** Copilot is a sign that slides into the gantry and latches there, and the
   words of the assistant are written on the sign.

---

## The anti-AI answers and the misuses

The fifteen rules of REVIEW-A are answered by the measurement in `evidence/contrast.txt` and by the
sheets above. The three that shaped this direction the most:

- **No centred hero with two buttons.** Every block is left-aligned to the rail; nothing is
  centred.
- **No generic rounded cards stacked.** The corners are 4 px, the cards are not rounded and they do
  not stack: the run is a rail with things hanging under it.
- **No filler copy.** Every address, suburb, time and number on the four screens is real content for
  a Christchurch run, and the same next stop appears on Today and on Driving.

The misuses this sheet refuses: the vermilion never means two things; the sign never gets a shadow
that reads as a floating card; the rail never bends; the night accent is never the neon of the
rejected palettes.

---

## How the videos are made

The video of a direction is the lab route recorded on the CI emulator, at most 60 seconds, the four
screens in order with the signature moments.

- **The flow.** `.maestro/directions/10-gantry-run.yaml` opens the route with a deep link, waits for
  `today-screen`, walks Today, Driving, Copilot and Scanner, and presses the confirmation so the
  rail latches on the recording.
- **The recording.** The workflow `.github/workflows/design-videos.yml` builds the debug APK, starts
  the emulator, installs the APK, runs the flow and records the screen with `adb shell
  screenrecord`; the mp4 is uploaded as a workflow artefact.
- **The frame trace.** The same job captures the frame trace of the run with `adb shell dumpsys gfxinfo` and puts it in the artefact as `fps-10.txt`; the QA lead copies it into `evidence/` for REVIEW-E7.

---

## The package

| The file | What it holds |
|---|---|
| `README.md` | This sheet |
| `mark.svg` | The brand mark |
| `evidence/contrast.txt` | The measured contrast of every pair, day and night |
| `render/` | The static render of the four screens |
| `screenshots/` | The eight PNGs of the four screens, light and night |
