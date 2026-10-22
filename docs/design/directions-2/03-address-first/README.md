# 03 Address First

**The idea.** The address is typeset like a headline: the run is a spine of addresses and everything
else is an annotation under it.

**The route.** `/design2/03-address-first` — the four screens of the brief (Today, Driving, Copilot,
Scanner), in the day and in the night, with the seven states of the contract behind `?state=`.

This is a candidate for the founder's pack (MASTER_EXECUTION §13.6). It is not the product, and no
screen of the product is built in it.

---

## The fingerprint

The ten fields of `docs/design/SPEC.md` §10.

| # | The field | This direction |
|---|---|---|
| 1 | The accent | Deep blue `#1f3f8f` (palette P5 Ferry), 8.60:1 as text on the background |
| 2 | The second chromatic colour | Rust `#b0451b`, the route drawn under the page, 5.02:1 on the background |
| 3 | The type pairing | Fraunces (display) and Geist (work), both SIL OFL 1.1 — pairing B with the work face changed |
| 4 | The density | Comfortable: three stops visible on Today at 390 by 844 |
| 5 | The layout grammar | The address column: one column of addresses down the page, each set as a headline with its own annotation under it; no panel, no card, no second column |
| 6 | The motion character | The line sets: an address rises into its place with a hair of overshoot, allowed once, only on a confirmation |
| 7 | The map treatment | The OpenMapTiles basic style recoloured in P5 Ferry, the buildings extruded at 52 degrees |
| 8 | The icon treatment | Material Symbols, weight 500; the only custom mark is the rule that carries the address |
| 9 | The night rule | The page cools to a near-black (`#0e1015`), the ink blue lifts to `#7d9ae0` and the rust keeps the second colour of the map |
| 10 | The three signature moments | The address sets itself, the map drifts under the page, Copilot is one annotated line |

---

## The mood board

The references that shaped this direction, with the source each one was read from
(`docs/design/RESEARCH-2.md`, read 2026-10-22). What is taken is the discipline, never the asset.

| The reference | What it gave this direction |
|---|---|
| [Primary: News in Depth](https://www.primary.app/) — type-first hierarchy, a reading surface (RESEARCH-2 §3.1) | The address is a piece of text, not a data field: it is set as the headline of the screen and read in one glance |
| [Apple Design Awards 2026](https://developer.apple.com/design/awards/2026/) — Structured and iA Writer (RESEARCH-2 §3.1) | Hierarchy by space and weight, never by cards and shadows; a single column and nothing beside it |
| [OpenMapTiles styles](https://github.com/openmaptiles/openmaptiles) and the [MapTiler basic GL style](https://github.com/openmaptiles/maptiler-basic-gl-style) (RESEARCH-2 §5.4) | The simplest possible map: fewer layers, more contrast, one accent colour for the route |
| [Moonlitt](https://apps.apple.com/us/story/id1896834601) — a calm surface around a 3D map (RESEARCH-2 §3.1) | The page is the interface and the map moves beneath it; the map never competes with the address |
| [Fraunces on Google Fonts](https://github.com/google/fonts/blob/main/ofl/fraunces/METADATA.pb) — `opsz 9-144`, `wght 100-900` (RESEARCH-2 §1.5) | One family at two optical sizes: at 34 pt the address is a different typeface from the 17 pt note under it |
| [Material 3 motion](https://m3.material.io/styles/motion/overview/how-it-works) and the [Reanimated spring reference](https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring/) (RESEARCH-2 §1.3, §5.3) | The confirmation is the one movement allowed a hair of overshoot, once, and never a bounce anywhere else |
| [Android for Cars writing guidelines](https://developer.android.com/design/ui/cars/guides/writing-guidelines) (RESEARCH-2 §1.8) | The published limit for a moving vehicle: the address is the line that is read, and everything else is an annotation |
| [impeccable](https://github.com/pbakaus/impeccable) (RESEARCH-2 §1.7) | The things this direction refuses: cards nested in cards, a rounded-square icon tile above every heading, grey text on a coloured field |

---

## The brand mark

`mark.svg` in this folder: the address set as a headline with its three annotations under it.

- The column is the accent (`brandPrimary`, the deep blue); the three rules are the ink
  (`textPrimary`). No colour outside the palette is used.
- The one-colour form is the whole mark in `textPrimary`.
- The minimum size is 16 px: at that size the column and the three rules are four separable shapes.
- The misuses it avoids: the mark is never set in a box, never given a shadow, and the rules are
  never made into an underline for a word — they are the annotations of an address.

---

## The palette

P5 Ferry of `docs/design/RESEARCH-2.md` §5.2: a deep blue on a cool white with a rust second
colour, the ink of an editorial page and the rust of the route drawn on the map under it.

The full report is `evidence/contrast.txt`, measured with
`packages/design-tokens/src/contrast.ts`. Every pair clears its bar.

| The token | Day | On the background | On the surface | Night | On the night background |
|---|---|---|---|---|---|
| `background` | `#f1f1f4` | — | — | `#0e1015` | — |
| `surface` | `#ffffff` | — | — | `#161920` | — |
| `surfaceElevated` | `#e7e7ec` | — | — | `#1e222b` | — |
| `textPrimary` | `#111318` | 16.48:1 | 18.58:1 | `#f1f3f8` | 17.14:1 |
| `textSecondary` | `#414551` | 8.49:1 | 9.57:1 | `#bcc0cc` | 10.47:1 |
| `brandPrimary` (the deep blue) | `#1f3f8f` | 8.60:1 | 9.70:1 | `#7d9ae0` | 6.86:1 |
| `brandSecondary` (the rust) | `#b0451b` | 5.02:1 | 5.66:1 | `#e08148` | 6.71:1 |
| `border` (3:1 bar) | `#636675` | 5.05:1 | 5.69:1 | `#6e7280` | 3.97:1 |
| `mapText` on `mapLand` | `#111318` | 16.34:1 | — | `#f1f3f8` | 14.34:1 |

The bars: 4.5:1 for the body, 7:1 for the driving text, 3:1 for a boundary.

---

## The type pairing

Pairing B of `docs/design/RESEARCH-2.md` §5.1 — the editorial pairing, with the work face changed
from Source Sans 3 to Geist.

| The role | The family | The licence | Where the licence is published |
|---|---|---|---|
| Display: the address | Fraunces | SIL OFL 1.1 | https://github.com/google/fonts/blob/main/ofl/fraunces/OFL.txt |
| Work: the notes under the address | Geist | SIL OFL 1.1 | https://github.com/vercel/geist-font/blob/main/LICENSE.txt |

Fraunces is a variable family with `opsz 9-144`, `wght 100-900`, `SOFT` and `WONK`; the product
sets `SOFT 0` and `WONK 0`, and the axes are there if a signature moment needs them. The seven
steps of the scale are in `packages/design-tokens/src/directions2a.ts` (`addressFirst.type`), and
every number that changes is set with tabular figures.

Both licences are SIL OFL 1.1, which covers use in a shipped application and allows the font to be
embedded in the binary. The notice goes into `docs/LICENSES.md` with the rest of the ledger.

---

## The motion language

The character: **the line sets**. An address rises into its place with a hair of overshoot, and the
overshoot is allowed once, only when a delivery is confirmed.

| The movement | The configuration | The duration | What it does |
|---|---|---|---|
| An address entering | `motion.springs.confirm` — damping ratio 0.86 | 220 ms | The next address rises into the column; the hair of overshoot is the confirmation and it happens once |
| The run advancing | `motion.springs.settle` — damping 26, stiffness 220, mass 1.1 | 200 ms | The count settles on the new number |
| The confirmation | `motion.springs.confirm` | 220 ms | The delivered line is struck through with a hairline and the page holds still afterwards |
| The sheet | `motion.springs.sheet` — damping 30, stiffness 260, mass 1.2 | 150 ms | The sheet follows the finger and settles with the velocity of the gesture |
| The annotated line | `motion.springs.voiceBar` — damping 34, stiffness 320, mass 0.9 | 200 ms | The assistant writes its line under the address, fast enough to keep up with the voice |

Everything runs on the UI thread through Reanimated 4. With "reduce motion" on, the same movement
arrives with no travel: the state still changes, it simply does not travel (the `reducedMotion`
token, duration 0). The haptics are on the confirm, the delivered and the error, and never on a
scroll or a passive map movement.

---

## The map style

- **The basemap.** The OpenMapTiles basic style, recoloured in P5 Ferry
  (https://github.com/openmaptiles/openmaptiles and
  https://github.com/openmaptiles/maptiler-basic-gl-style; the code is BSD-3-Clause and the data is
  OSM under the ODbL). The LINZ building outlines under CC BY 4.0 are attributed on the screen, with
  the OpenStreetMap notice.
- **The layers.** The land, the water, the roads and the motorway in the map colours of the
  direction (`mapLand #f0f0f3`, `mapRoad #ffffff`, `mapHighway #eccb78`); the route as one line in
  the rust at 4 px under the page; the stops as pins in the deep blue; the labels in `mapText` with
  the land colour as their halo. At night the map carries three layers only: the route, the stops
  and the labels.
- **The camera.** Heading-up while driving, at a follow pitch of 30 degrees and a follow zoom of 17;
  the 3D pitch is 52 degrees. The camera never rotates while the driver is reading the address: the
  address stays exactly where it is and the world moves beneath it in a 400 ms push.
- **The 3D.** The LINZ building outlines and the OSM heights, extruded from our own tiles so it
  works offline, in the building colour of the palette. The 3D gives the street its shape; it is
  never a showpiece.

---

## The signature moments

The three moments a courier lives in (REVIEW-S1 to S3). They are implemented in the route above,
not only described.

1. **How a delivery is confirmed.** The address sets itself: the delivered line is struck through
   with a hairline and the next address rises into its place with a hair of overshoot, and the page
   holds still afterwards. The same behaviour is on Today and on Driving.
2. **How the map moves.** The map drifts under the page: the address stays exactly where it is and
   the world moves beneath it in a 400 ms push, so the driver never loses the line they are reading.
3. **How Copilot appears.** Copilot is one annotated line under the address: what it heard, what it
   did, and nothing else, so the page is never interrupted.

---

## The anti-AI answers and the misuses

The fifteen rules of REVIEW-A are answered by the measurement in `evidence/contrast.txt` and by the
sheets above. The three that shaped this direction the most:

- **No generic rounded cards stacked.** There is one column of type; the address is set on the
  surface, never boxed.
- **No centred hero with two buttons.** The primary action is in the thumb's reach and the column
  runs from the top of the screen.
- **No filler copy.** Every address, suburb, time and number on the four screens is real content for
  a Christchurch run, and the same next stop appears on Today and on Driving.

The misuses this sheet refuses: the serif is never used as a dispatch note; the rule is never used
as a ledger line; the address is never centred over a hero; the map is never allowed to scroll the
page under the driver.

---

## How the videos are made

The video of a direction is the lab route recorded on the CI emulator, at most 60 seconds, the four
screens in order with the signature moments.

- **The flow.** `.maestro/directions/03-address-first.yaml` opens the route with a deep link, waits
  for `today-screen`, walks Today, Driving, Copilot and Scanner, and presses the confirmation so
  the address sets itself on the recording.
- **The recording.** The workflow `.github/workflows/design-videos.yml` builds the debug APK, starts
  the emulator, installs the APK, runs the flow and records the screen with `adb shell
  screenrecord`; the mp4 is uploaded as a workflow artefact.
- **The frame trace.** The same job captures the frame trace of the run with `adb shell dumpsys gfxinfo` and puts it in the artefact as `fps-03.txt`; the QA lead copies it into `evidence/` for REVIEW-E7.

---

## The package

| The file | What it holds |
|---|---|
| `README.md` | This sheet |
| `mark.svg` | The brand mark |
| `evidence/contrast.txt` | The measured contrast of every pair, day and night |
| `screenshots/` | The eight PNGs of the four screens, light and night |
| `render.html` | The static render of the four screens |
