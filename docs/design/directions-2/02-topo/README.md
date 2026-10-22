# 02 Topo

**The idea.** The Canterbury landscape is the identity: the map is a survey chart, and the interface
is the margin around it.

**The route.** `/design2/02-topo` — the four screens of the brief (Today, Driving, Copilot, Scanner),
in the day and in the night, with the seven states of the contract behind `?state=`.

This is a candidate for the founder's pack (MASTER_EXECUTION §13.6). It is not the product, and no
screen of the product is built in it.

---

## The fingerprint

The ten fields of `docs/design/SPEC.md` §10.

| # | The field | This direction |
|---|---|---|
| 1 | The accent | Survey teal `#2f5d5a` (palette P6 Clay, the roles the other way round), 6.53:1 as text on the background |
| 2 | The second chromatic colour | Burnt sienna `#8c3b1a`, the marker on the chart, 6.72:1 on the background |
| 3 | The type pairing | Bricolage Grotesque (display) and Source Sans 3 (work), both SIL OFL 1.1 — pairing D |
| 4 | The density | Compact: four stops visible on Today at 390 by 844 |
| 5 | The layout grammar | The survey chart: the chart is the page and the interface is its margin; a hairline rule is the only separator |
| 6 | The motion character | The chart unfolds: a new plate is drawn in 150 ms with no spring, the way a survey sheet is pulled out of a drawer |
| 7 | The map treatment | The Protomaps style with contour layers, recoloured in P6 Clay, the buildings extruded at 58 degrees |
| 8 | The icon treatment | Material Symbols, weight 500; the contour and the coordinate marks are drawn as lines on the 4-pt grid, not as glyphs |
| 9 | The night rule | The chart is redrawn warm and near-black (`#131011`) and the survey line cools to `#71b3ae` while the marker dims to `#dd8256` |
| 10 | The three signature moments | The contour advances, the map tilts to the land, Copilot is a margin note |

---

## The mood board

The references that shaped this direction, with the source each one was read from
(`docs/design/RESEARCH-2.md`, read 2026-10-22). What is taken is the discipline, never the asset.

| The reference | What it gave this direction |
|---|---|
| [Moonlitt](https://apps.apple.com/us/story/id1896834601) — a 3D map used to answer a geometric question (RESEARCH-2 §3.1) | The camera is allowed to tilt to make the land legible: 58 degrees so the contours separate, and never a tilt for decoration |
| [Feather: Draw in 3D](https://developer.apple.com/design/awards/2025/) — a 3D tool that is calm and precise (RESEARCH-2 §3.1) | The chart is an instrument of survey, not a picture: a hairline, a scale and a coordinate |
| [protomaps/basemaps](https://github.com/protomaps/basemaps) — the reference style of the round (RESEARCH-2 §5.4) | The quiet land colour and the thin roads the contour lines sit on |
| [maplibre-style-spec](https://github.com/maplibre/maplibre-style-spec) and [Maputnik](https://github.com/maplibre/maputnik) — the map as a document we own (RESEARCH-2 §2.11, §5.4) | The contour layer is a layer of our own style file, versioned with a day and a night variant, rendered from our own tiles so it works offline |
| [Apple Design Awards 2026](https://developer.apple.com/design/awards/2026/) — iA Writer and Mela in the finalist list (RESEARCH-2 §3.1) | The margin discipline: the metadata of a stop list sits in the margin of the chart, and the list is never a bootstrap table |
| [Material 3 motion](https://m3.material.io/styles/motion/overview/how-it-works) and the [Reanimated spring reference](https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring/) (RESEARCH-2 §1.3, §5.3) | The house band of 150 ms with no spring: a new plate is drawn, not thrown, because there is nothing to throw |
| [CSS Color 4](https://www.w3.org/TR/css-color-4/) — OKLCH (RESEARCH-2 §1.6) | The two chromatic colours are swapped in the palette rather than invented, so the hue rotation does not change the measured contrast |
| [impeccable](https://github.com/pbakaus/impeccable) (RESEARCH-2 §1.7) | The things this direction refuses: a kraft-paper look, a ledger of rows, a serif dispatch note as the identity |

---

## The brand mark

`mark.svg` in this folder: three contour hairlines with the survey line in the accent and the
marker on it.

- The outer contours are the ink of the palette (`textPrimary`), the survey line is the accent
  (`brandPrimary`, the teal) and the marker is the second chromatic colour (the sienna). No colour
  outside the palette is used.
- The one-colour form is the whole mark in `textPrimary`.
- The minimum size is 16 px: at that size the three lines separate and the marker is still a
  single square of colour.
- The misuses it avoids: the lines are never given a shadow, never doubled into a filled shape, and
  never bent into a wave; the mark is a contour, not a decorative squiggle.

---

## The palette

P6 Clay of `docs/design/RESEARCH-2.md` §5.2 with the two chromatic colours the other way round: the
teal is the survey line and the sienna is the marker, where the direction that already holds Clay
makes the sienna its accent. The round rule of `docs/design/REVIEW.md` §9 is that no two directions
may share an accent family.

The full report is `evidence/contrast.txt`, measured with
`packages/design-tokens/src/contrast.ts`. Every pair clears its bar.

| The token | Day | On the background | On the surface | Night | On the night background |
|---|---|---|---|---|---|
| `background` | `#f2f0f1` | — | — | `#131011` | — |
| `surface` | `#ffffff` | — | — | `#1c1918` | — |
| `surfaceElevated` | `#e8e5e6` | — | — | `#252220` | — |
| `textPrimary` | `#151314` | 16.31:1 | 18.50:1 | `#f5f1ef` | 16.86:1 |
| `textSecondary` | `#4a4547` | 8.29:1 | 9.40:1 | `#c8c1bd` | 10.65:1 |
| `brandPrimary` (the teal) | `#2f5d5a` | 6.53:1 | 7.41:1 | `#71b3ae` | 7.89:1 |
| `brandSecondary` (the sienna) | `#8c3b1a` | 6.72:1 | 7.62:1 | `#dd8256` | 6.67:1 |
| `border` (3:1 bar) | `#6b6567` | 5.03:1 | 5.70:1 | `#7d7674` | 4.25:1 |
| `mapText` on `mapLand` | `#151314` | 16.15:1 | — | `#f5f1ef` | 14.09:1 |

The bars: 4.5:1 for the body, 7:1 for the driving text, 3:1 for a boundary.

---

## The type pairing

Pairing D of `docs/design/RESEARCH-2.md` §5.1 — the compact and industrial pairing.

| The role | The family | The licence | Where the licence is published |
|---|---|---|---|
| Display: the titles and the numbers | Bricolage Grotesque | SIL OFL 1.1 | https://github.com/google/fonts/blob/main/ofl/bricolagegrotesque/OFL.txt |
| Work: the notes in the margin | Source Sans 3 | SIL OFL 1.1 | https://github.com/adobe-fonts/source-sans/blob/master/LICENSE.md |

Bricolage Grotesque carries `opsz 12-96`, `wdth 75-100` and `wght 200-800`, so the 56 px count and
the 17 px note are one family at two optical sizes. The seven steps of the scale are in
`packages/design-tokens/src/directions2a.ts` (`topo.type`), and every number that changes is set
with tabular figures.

Both licences are SIL OFL 1.1, which covers use in a shipped application and allows the font to be
embedded in the binary. The notice goes into `docs/product/LICENSES.md` with the rest of the ledger.

---

## The motion language

The character: **the chart unfolds**. A new plate is drawn in 150 ms with no spring, the way a
survey sheet is pulled out of a drawer. Nothing loops, and nothing overshoots except the
confirmation.

| The movement | The configuration | The duration | What it does |
|---|---|---|---|
| A plate arriving | The house enter, 150 ms, no spring | 150 ms | The chart is drawn; there is nothing to throw |
| A stop joining the run | The house enter | 150 ms | The marker is set on the line, the profile loses one notch |
| The confirmation | `motion.springs.confirm` — damping ratio 0.86 | 220 ms | The delivered marker is struck out of the run |
| The sheet | `motion.springs.sheet` — damping 30, stiffness 260, mass 1.2 | 150 ms | The sheet follows the finger and settles with the velocity of the gesture |
| The margin note | `motion.springs.voiceBar` — damping 34, stiffness 320, mass 0.9 | 200 ms | The assistant writes its line in the margin, fast enough to keep up with the voice |

Everything runs on the UI thread through Reanimated 4. With "reduce motion" on, the same movement
arrives with no travel: the state still changes, it simply does not travel (the `reducedMotion`
token, duration 0). The haptics are on the confirm, the delivered and the error, and never on a
scroll or a passive map movement.

---

## The map style

- **The basemap.** The Protomaps style with a contour layer of our own, recoloured in P6 Clay
  (https://github.com/protomaps/basemaps; the code is BSD-3-Clause and the visual design of the
  styles is CC0). The data is OSM under the ODbL and the LINZ building outlines under CC BY 4.0, and
  both attributions are on the screen.
- **The layers.** The land, the water, the roads and the motorway in the map colours of the
  direction (`mapLand #f1efef`, `mapRoad #ffffff`, `mapHighway #e9d3a4`); the contour hairlines over
  the land in the ink at 1 px; the route as one line in the sienna at 3 px; the stops as pins in the
  teal; the labels in `mapText` with the land colour as their halo. At night the map carries three
  layers only: the route, the stops and the labels.
- **The camera.** North-up, always: the surveyed route never swings under the address. The follow
  pitch is 34 degrees at a follow zoom of 15.5, and the 3D pitch is 58 degrees, so the contours
  separate. The camera comes back north-up in one 250 ms move.
- **The 3D.** The LINZ building outlines and the OSM heights, extruded from our own tiles so it
  works offline. At 58 degrees the buildings give the land its shape, and the extrusion is quiet: the
  building colour of the palette, never a second accent.

---

## The signature moments

The three moments a courier lives in (REVIEW-S1 to S3). They are implemented in the route above,
not only described.

1. **How a delivery is confirmed.** The contour advances: the delivered marker is struck out of the
   run and the elevation profile along the top of the chart loses one notch in a 150 ms draw, so the
   day is read as a line crossed, not a row ticked. The same behaviour is on Today and on Driving.
2. **How the map moves.** The map tilts to the land: the camera settles to 58 degrees so the
   contours separate, and it comes back north-up in one 250 ms move; the surveyed route never swings
   under the address.
3. **How Copilot appears.** Copilot is a margin note: a narrow column down the side of the chart
   where the assistant writes what it did, in the note face, with no bubble and no avatar.

---

## The anti-AI answers and the misuses

The fifteen rules of REVIEW-A are answered by the measurement in `evidence/contrast.txt` and by the
sheets above. The three that shaped this direction the most:

- **No paper or ledger retro look.** The chart is a cool white, not cream; the hairline is a survey
  rule, not a ledger rule; the identity is the landscape, not the paper.
- **No flat bootstrap-like list.** Every row of the run carries something that changes a decision: a
  number, a state word, a time, a note.
- **No filler copy.** Every address, suburb, time and number on the four screens is real content for
  a Christchurch run, and the same next stop appears on Today and on Driving.

The misuses this sheet refuses: the contours are never used as a background texture; the chart is
never tilted for decoration; the marker is never a pin of another icon set; the serif is never used
as a dispatch note.

---

## How the videos are made

The video of a direction is the lab route recorded on the CI emulator, at most 60 seconds, the four
screens in order with the signature moments.

- **The flow.** `.maestro/directions/02-topo.yaml` opens the route with a deep link, waits for
  `today-screen`, walks Today, Driving, Copilot and Scanner, and presses the confirmation so the
  contour advances on the recording.
- **The recording.** The workflow `.github/workflows/design-videos.yml` builds the debug APK, starts
  the emulator, installs the APK, runs the flow and records the screen with `adb shell
  screenrecord`; the mp4 is uploaded as a workflow artefact.
- **The frame trace.** The same job captures the frame trace of the run with `adb shell dumpsys gfxinfo` and puts it in the artefact as `fps-02.txt`; the QA lead copies it into `evidence/` for REVIEW-E7.

---

## The package

| The file | What it holds |
|---|---|
| `README.md` | This sheet |
| `mark.svg` | The brand mark |
| `evidence/contrast.txt` | The measured contrast of every pair, day and night |
| `screenshots/` | The eight PNGs of the four screens, light and night |
| `render.html` | The static render of the four screens |
