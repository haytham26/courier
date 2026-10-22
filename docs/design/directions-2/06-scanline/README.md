# 06 Scanline

**The idea.** The scanner sets the language: ruled bands, crop marks and monospaced data, machine to
machine.

**The route.** `/design2/06-scanline` — the four screens of the brief (Today, Driving, Copilot,
Scanner), in the day and in the night, with the seven states of the contract behind `?state=`.

This is a candidate for the founder's pack (MASTER_EXECUTION §13.6). It is not the product, and no
screen of the product is built in it.

---

## The fingerprint

The ten fields of `docs/design/SPEC.md` §10.

| # | The field | This direction |
|---|---|---|
| 1 | The accent | Vermilion `#b3261e` (palette P3 Signal), 5.37:1 as text on the background |
| 2 | The second chromatic colour | Ink `#1d2a33`, the machine colour of the data, 12.05:1 on the background |
| 3 | The type pairing | Roboto Flex (display) and IBM Plex Mono (work), both SIL OFL 1.1 — pairing C |
| 4 | The density | Compact: seven stops visible on Today at 390 by 844 |
| 5 | The layout grammar | The ruled band: every block of the screen is a band with a rule on the left and a key on the right |
| 6 | The motion character | The band wipes, 150 ms, timing with the house curve (cubic-bezier(0, 0, 0.2, 1)) |
| 7 | The map treatment | The OpenMapTiles Bright style recoloured in P3 Signal, flat in the day with no extrusion |
| 8 | The icon treatment | Material Symbols, weight 500; the crop marks and the scan caret are drawn as lines on the 4-pt grid, not as glyphs |
| 9 | The night rule | The chart is redrawn in a neutral near-black and the vermilion becomes the dimmer `#e8675e` |
| 10 | The three signature moments | The address is stamped with a rule, the map redraws as a band, Copilot is a new ruled band |

---

## The mood board

The references that shaped this direction, with the source each one was read from
(`docs/design/RESEARCH-2.md`, read 2026-10-22). What is taken is the discipline, never the asset.

| The reference | What it gave this direction |
|---|---|
| [CapWords](https://capwords.app/) — the camera and the result are one continuous action (RESEARCH-2 §3.1) | A scanned address and a typed address come out of the same machine: the reader's bands and the day's bands are the same bands |
| [iA Writer](https://developer.apple.com/design/awards/2025/) — a writing surface with a visible structure (RESEARCH-2 §3.1) | The structure is made of rules and keys, not of boxes: the reader reads the structure of the data |
| [Ground News](https://developer.apple.com/design/awards/2025/) — a legend the eye learns in seconds (RESEARCH-2 §3.1) | One rule, one key, one value, always in the same place, so the eye learns the screen in one run |
| [OpenMapTiles styles](https://github.com/openmaptiles/openmaptiles) — OSM Bright, Toner, OSM Liberty (RESEARCH-2 §5.4) | The hierarchy of a printed chart: the water, then the roads, then the labels; the flat plan of OSM Bright is the base of this direction's map |
| [Material 3 motion](https://m3.material.io/styles/motion/overview/how-it-works) and the [Reanimated spring reference](https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring/) (RESEARCH-2 §1.3, §5.3) | The house band of 150 ms with no spring: the band wipes across, the way the scanner reads a label |
| [Roboto Flex on Google Fonts](https://github.com/google/fonts/blob/main/ofl/robotoflex/METADATA.pb) — thirteen axes (RESEARCH-2 §1.5) | `wdth` condenses the address to one line and `opsz` carries the number: one family in two jobs |
| [The expo haptics API](https://docs.expo.dev/versions/latest/sdk/haptics/) (RESEARCH-2 §1.9) | One haptic per state change: the wipe of the band is felt as a single tick, never a rattle |
| [impeccable](https://github.com/pbakaus/impeccable) (RESEARCH-2 §1.7) | The things this direction refuses: a flat bootstrap-like list of grey rows, a rounded-square icon tile above every heading, grey text on a coloured field |

---

## The brand mark

`mark.svg` in this folder: the crop marks of the reader and the band it is reading.

- The crop marks are the ink (`textPrimary`, the machine colour); the band is the accent
  (`brandPrimary`, the vermilion). No colour outside the palette is used.
- The one-colour form is the whole mark in `textPrimary`.
- The minimum size is 16 px: at that size the four corner marks are still four corner marks and the
  band is still a band across the middle.
- The misuses it avoids: the band never becomes a loading spinner, the crop marks are never rounded
  off, and the mark is never drawn inside a rounded square.

---

## The palette

P3 Signal of `docs/design/RESEARCH-2.md` §5.2: vermilion and ink on a neutral. The red is the one
thing it means here: the rule that confirms the address, and the failed stop. Nothing else in the
product may be red.

The full report is `evidence/contrast.txt`, measured with
`packages/design-tokens/src/contrast.ts`. Every pair clears its bar.

| The token | Day | On the background | On the surface | Night | On the night background |
|---|---|---|---|---|---|
| `background` | `#f2f2ef` | — | — | `#101010` | — |
| `surface` | `#ffffff` | — | — | `#181818` | — |
| `surfaceElevated` | `#e2e2dd` | — | — | `#212121` | — |
| `textPrimary` | `#101112` | 15.53:1 | 18.90:1 | `#f1f1f0` | 16.84:1 |
| `textSecondary` | `#43453f` | 8.74:1 | 9.71:1 | `#c6c6c1` | 11.02:1 |
| `brandPrimary` (the vermilion) | `#b3261e` | 5.37:1 | 6.54:1 | `#e8675e` | 5.92:1 |
| `brandSecondary` (the ink) | `#1d2a33` | 12.05:1 | 14.67:1 | `#8fa4b3` | 7.37:1 |
| `border` (3:1 bar) | `#6d6d68` | 4.27:1 | 5.20:1 | `#77776f` | 4.22:1 |
| `mapText` on `mapLand` | `#101112` | 16.85:1 | — | `#f1f1f0` | 15.71:1 |

The bars: 4.5:1 for the body, 7:1 for the driving text, 3:1 for a boundary.

---

## The type pairing

Pairing C of `docs/design/RESEARCH-2.md` §5.1 — the technical pairing, one family in two roles.

| The role | The family | The licence | Where the licence is published |
|---|---|---|---|
| Display: the number and the address | Roboto Flex | SIL OFL 1.1 | https://github.com/google/fonts/blob/main/ofl/robotoflex/OFL.txt |
| Work: the data | IBM Plex Mono | SIL OFL 1.1 | https://github.com/IBM/plex/blob/master/LICENSE.txt |

The mono family is the whole point: a scanned address and a typed address are set the same way, so
the courier reads one and believes the other. The seven steps of the scale are in
`packages/design-tokens/src/directionsLab.ts` (`scanline.type`), and every number that changes is
set with tabular figures.

Both licences are SIL OFL 1.1, which covers use in a shipped application and allows the font to be
embedded in the binary. The notice goes into `docs/product/LICENSES.md` with the rest of the ledger.

---

## The motion language

The character: **the band wipes**. A band comes across the screen the way a page prints, and it is
done in the house 150 ms band with no spring. Nothing loops.

| The movement | The configuration | The duration | What it does |
|---|---|---|---|
| The band wiping | The house enter, 150 ms, timing, cubic-bezier(0, 0, 0.2, 1) | 150 ms | The block arrives as a band across the screen, the way the scanner reads a label |
| The map redrawing | The house enter | 150 ms | The map redraws as a band from the top of the viewport down, the way a page prints |
| The confirmation | `motion.springs.settle` — damping 26, stiffness 220, mass 1.1 | 200 ms | The confirmed address is stamped with a vermilion rule that draws left to right in 150 ms, once |
| The new band | `motion.springs.voiceBar` — damping 34, stiffness 320, mass 0.9 | 200 ms | Copilot's band is pushed up from the bottom, fast enough to keep up with the voice |

Everything runs on the UI thread through Reanimated 4. With "reduce motion" on, the same movement
arrives with no travel: the state still changes, it simply does not travel (the `reducedMotion`
token, duration 0). The haptics are on the confirm, the delivered and the error, and never on a
scroll or a passive map movement.

---

## The map style

- **The basemap.** The OpenMapTiles Bright style, recoloured in P3 Signal
  (https://github.com/openmaptiles/openmaptiles; the code is BSD-3-Clause and the data is OSM under
  the ODbL). The LINZ building outlines under CC BY 4.0 are attributed on the screen, with the
  OpenStreetMap notice.
- **The layers.** The land, the water, the roads and the motorway in the map colours of the
  direction (`mapLand #f2f2ef`, `mapRoad #ffffff`, `mapHighway #e7d9a8`); the route as one line in
  the vermilion at 5 px; the stops as pins; the labels in `mapText` with the land colour as their
  halo. At night the map carries three layers only: the route, the stops and the labels.
- **The camera.** As it is implemented in the route: the map is flat (`pitch 0`), north-up
  (`bearing 0`) and opens at zoom 16. It never tilts and never spins: the driver reads the plan,
  and the address keeps its contrast over it.
- **The 3D.** There is no extrusion in the day. The 3D mode keeps the flat plan and the bands: the
  direction uses the map as a chart, and a chart does not lean.

---

## The signature moments

The three moments a courier lives in (REVIEW-S1 to S3). They are implemented in the route above,
not only described.

1. **How a delivery is confirmed.** The confirmed address is stamped with a vermilion rule that
   draws left to right in 150 ms, once. The same behaviour is on Today and on Driving.
2. **How the map moves.** The map redraws as a band from the top of the viewport down over 300 ms,
   the way a page prints.
3. **How Copilot appears.** Copilot appears as a new ruled band pushed up from the bottom, with the
   cursor on the caret.

---

## The anti-AI answers and the misuses

The fifteen rules of REVIEW-A are answered by the measurement in `evidence/contrast.txt` and by the
sheets above. The three that shaped this direction the most:

- **No flat bootstrap-like list.** Every band of the run carries a key and a value: a number, a
  state word, a time, a note.
- **No glassmorphism.** Every surface is solid; the only transparency in the map is the route's own
  geofence wash, and it is named.
- **No filler copy.** Every address, suburb, time and number on the four screens is real content for
  a Christchurch run, and the same next stop appears on Today and on Driving.

The misuses this sheet refuses: the rules are never a ledger; the vermilion never means two things;
the band never becomes a progress bar; the monospace is never used for a paragraph of copy.

---

## How the videos are made

The video of a direction is the lab route recorded on the CI emulator, at most 60 seconds, the four
screens in order with the signature moments.

- **The flow.** `.maestro/directions/06-scanline.yaml` opens the route with a deep link, waits for
  `today-screen`, walks Today, Driving, Copilot and Scanner, and presses the confirmation so the
  rule is stamped on the recording.
- **The recording.** The workflow `.github/workflows/design-videos.yml` builds the debug APK, starts
  the emulator, installs the APK, runs the flow and records the screen with `adb shell
  screenrecord`; the mp4 is uploaded as a workflow artefact.
- **The frame trace.** The same job captures the frame trace of the run with `adb shell dumpsys gfxinfo` and puts it in the artefact as `fps-06.txt`; the QA lead copies it into `evidence/` for REVIEW-E7.

---

## The package

| The file | What it holds |
|---|---|
| `README.md` | This sheet |
| `mark.svg` | The brand mark |
| `evidence/contrast.txt` | The measured contrast of every pair, day and night |
| `screens/` and `screenshots/` | The eight PNGs of the four screens, light and night |
| `render.html` | The static render of the four screens |
