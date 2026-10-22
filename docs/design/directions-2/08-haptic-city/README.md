# 08 Haptic City

**The idea.** Every state change is a physical gesture, and the colour is used almost nowhere.

**The route.** `/design2/08-haptic-city` — the four screens of the brief (Today, Driving, Copilot,
Scanner), in the day and in the night, with the seven states of the contract behind `?state=`.

This is a candidate for the founder's pack (MASTER_EXECUTION §13.6). It is not the product, and no
screen of the product is built in it.

---

## The fingerprint

The ten fields of `docs/design/SPEC.md` §10.

| # | The field | This direction |
|---|---|---|
| 1 | The accent | Kelp green `#1d5b34` (palette P4 Kelp), 7.15:1 as text on the background |
| 2 | The second chromatic colour | Terracotta `#8c4a12`, the one warm note in a monochrome ramp, 5.99:1 on the background |
| 3 | The type pairing | Space Grotesk (display) and Geist (work), both SIL OFL 1.1 — pairing A |
| 4 | The density | Comfortable: three stops visible on Today at 390 by 844 |
| 5 | The layout grammar | The gesture column: one column of physical targets down the middle of the screen; nothing sits beside a target that could be a second target |
| 6 | The motion character | The spring carries the velocity of the finger: the target moves as far and as fast as the hand moved it, 150 ms |
| 7 | The map treatment | The MapLibre style with a monochrome ramp, the buildings extruded at 55 degrees |
| 8 | The icon treatment | Material Symbols, weight 500; the shape of the target is the state, and no second icon set is used |
| 9 | The night rule | The map stays a monochrome ramp and the accent lifts to the dimmed `#63b183`; the route is the only chromatic line on it |
| 10 | The three signature moments | The seal is pressed and held, the map never moves on its own, Copilot is a physical target |

---

## The mood board

The references that shaped this direction, with the source each one was read from
(`docs/design/RESEARCH-2.md`, read 2026-10-22). What is taken is the discipline, never the asset.

| The reference | What it gave this direction |
|---|---|
| [Metaballs](https://developer.apple.com/design/awards/2026/) — physics as the interaction model (RESEARCH-2 §3.1) | The spring that carries the velocity of the driver's own gesture, and the rule that physics is never for its own sake |
| [(Not Boring) Camera](https://www.notboring.camera/) — a fast, physical shutter (RESEARCH-2 §3.1) | One action that feels like the tool the courier is holding: the seal is pressed and held, and the hand feels the result |
| [Hearing Buddy](https://developer.apple.com/design/awards/2026/) — a state visible on the screen, not only audible (RESEARCH-2 §3.1) | The shape of the target is the state: a square for listening, a bar for thinking, a filled disc for speaking |
| [Opal](https://developer.apple.com/design/awards/2025/) — a calm, monochrome device for attention (RESEARCH-2 §3.1) | Monochrome as a deliberate palette: the direction uses colour almost nowhere |
| [MapLibre style spec](https://github.com/maplibre/maplibre-style-spec) and [MapLibre demo styles](https://github.com/maplibre/demotiles) (RESEARCH-2 §2.11, §5.4) | The map is drawn as a ramp of greys, with the route as the only chromatic line on it |
| [Material 3 motion physics](https://m3.material.io/styles/motion/overview/how-it-works) and the [Reanimated spring reference](https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring/) (RESEARCH-2 §1.3, §5.3) | The `sheet` spring with the velocity from the gesture: the finger's own momentum carries the movement |
| [The expo haptics API](https://docs.expo.dev/versions/latest/sdk/haptics/) (RESEARCH-2 §1.9) | The delivered haptic is felt differently from the error haptic by a driver who is not looking at the screen |
| [impeccable](https://github.com/pbakaus/impeccable) (RESEARCH-2 §1.7) | The things this direction refuses: a colour that carries the meaning on its own, a card of rounded corners, a generated gradient |

---

## The brand mark

`mark.svg` in this folder: the three shapes of the assistant — a square, a bar and a disc — with the
disc filled.

- The square and the bar are the ink (`textPrimary`); the disc is the accent (`brandPrimary`, the
  kelp green). No colour outside the palette is used.
- The one-colour form is the whole mark in `textPrimary`.
- The minimum size is 16 px: at that size the square, the bar and the disc are still three
  different shapes, which is the whole point of the mark.
- The misuses it avoids: the shapes are never rounded into the same pill, never given a glow, and
  never used as icons of three different meanings.

---

## The palette

P4 Kelp of `docs/design/RESEARCH-2.md` §5.2: kelp green and terracotta on a green-tinted white.
The direction uses colour almost nowhere, so the map is a monochrome ramp and the route is the only
chromatic line on it.

The full report is `evidence/contrast.txt`, measured with
`packages/design-tokens/src/contrast.ts`. Every pair clears its bar.

| The token | Day | On the background | On the surface | Night | On the night background |
|---|---|---|---|---|---|
| `background` | `#eff2ec` | — | — | `#0f1310` | — |
| `surface` | `#ffffff` | — | — | `#171c18` | — |
| `surfaceElevated` | `#e5eae0` | — | — | `#1f2620` | — |
| `textPrimary` | `#131810` | 15.94:1 | 18.01:1 | `#f2f5ef` | 17.02:1 |
| `textSecondary` | `#3f4a3a` | 8.25:1 | 9.33:1 | `#c1cbbf` | 11.21:1 |
| `brandPrimary` (the kelp green) | `#1d5b34` | 7.15:1 | 8.08:1 | `#63b183` | 7.27:1 |
| `brandSecondary` (the terracotta) | `#8c4a12` | 5.99:1 | 6.77:1 | `#d2823f` | 6.25:1 |
| `border` (3:1 bar) | `#647060` | 4.61:1 | 5.21:1 | `#75806f` | 4.53:1 |
| `mapText` on `mapLand` | `#131810` | 15.74:1 | — | `#f2f5ef` | 14.07:1 |

The bars: 4.5:1 for the body, 7:1 for the driving text, 3:1 for a boundary.

---

## The type pairing

Pairing A of `docs/design/RESEARCH-2.md` §5.1 — the everyday pairing, the safest of the pool.

| The role | The family | The licence | Where the licence is published |
|---|---|---|---|
| Display: the number and the address | Space Grotesk | SIL OFL 1.1 | https://github.com/google/fonts/blob/main/ofl/spacegrotesk/OFL.txt |
| Work: everything else | Geist | SIL OFL 1.1 | https://github.com/vercel/geist-font/blob/main/LICENSE.txt |

Geist Mono is in the same licence as Geist for the parcel numbers. The seven steps of the scale are
in `packages/design-tokens/src/directions2.ts` (`hapticCity.type`), and every number that changes is
set with tabular figures.

Both licences are SIL OFL 1.1, which covers use in a shipped application and allows the font to be
embedded in the binary. The notice goes into `docs/LICENSES.md` with the rest of the ledger.

---

## The motion language

The character: **the spring carries the velocity of the finger**. The target moves as far and as fast
as the hand moved it. Nothing loops, and the delivery is a fact of shape, not a change of colour.

| The movement | The configuration | The duration | What it does |
|---|---|---|---|
| A target pressed | `motion.springs.sheet` — damping 30, stiffness 260, mass 1.2 | 150 ms | The target moves with the hand, and the velocity comes from the gesture rather than from a curve |
| The seal | The same spring, with a hair of overshoot | 150 ms | The courier presses and holds the seal: a ring fills under the finger and the target snaps closed |
| The voice target | `motion.springs.voiceBar` — damping 34, stiffness 320, mass 0.9 | 200 ms | The target sinks 2 px under the finger and its shape is the state |
| The sheet | `motion.springs.sheet` | 150 ms | The sheet follows the finger and settles with the velocity of the gesture |

Everything runs on the UI thread through Reanimated 4. With "reduce motion" on, the same movement
arrives with no travel: the state still changes, it simply does not travel (the `reducedMotion`
token, duration 0). The haptics are on the confirm, the delivered and the error, and never on a
scroll or a passive map movement.

---

## The map style

- **The basemap.** The MapLibre style with a monochrome ramp, recoloured in P4 Kelp
  (https://github.com/maplibre/maplibre-style-spec and https://github.com/maplibre/demotiles; the
  code is BSD-3-Clause and the data is OSM under the ODbL). The LINZ building outlines under CC BY
  4.0 are attributed on the screen, with the OpenStreetMap notice.
- **The layers.** The land, the water, the roads and the motorway in the greys of the map colours of
  the direction (`mapLand #eff0ec`, `mapRoad #ffffff`, `mapHighway #c8ccc3`); the run as one route
  line in the kelp green, the only chromatic line on the map; the stops as pins; the labels in
  `mapText` with the land colour as their halo. At night the map carries three layers only: the
  route, the stops and the labels.
- **The camera.** Heading-up while driving, at a follow pitch of 32 degrees and a follow zoom of 17;
  the 3D pitch is 55 degrees. **The map never moves on its own**: it is moved by the voice ("tilt
  the map", "zoom to the next stop"), and the move carries the velocity of the hand that spoke it.
- **The 3D.** The LINZ building outlines and the OSM heights, extruded at 55 degrees, in the
  building colour of the palette. The extrusion is a grey, like everything else on this map.

---

## The signature moments

The three moments a courier lives in (REVIEW-S1 to S3). They are implemented in the route above,
not only described.

1. **How a delivery is confirmed.** The courier presses and holds the seal for 600 ms: a ring fills
   under the finger, the target snaps closed with a hair of overshoot, the hand feels two heavy
   pulses and the row is struck through — a fact of shape, not a change of colour. The same
   behaviour is on Today and on Driving.
2. **How the map moves.** The map never moves on its own: it is moved by the voice ("tilt the map",
   "zoom to the next stop"), and the move carries the velocity of the hand that spoke it.
3. **How Copilot appears.** Copilot is a physical target: it sinks 2 px under the finger and its
   shape is the state — a square for listening, a bar for thinking, a filled disc for speaking.

---

## The anti-AI answers and the misuses

The fifteen rules of REVIEW-A are answered by the measurement in `evidence/contrast.txt` and by the
sheets above. The three that shaped this direction the most:

- **No single-accent-on-grey template.** The palette holds two chromatic colours besides the
  neutrals, the kelp green and the terracotta, and the map is a ramp of greys with the route as the
  one chromatic line.
- **No pulsing orbs.** Nothing loops and nothing breathes; the disc is a static indicator whose
  shape carries the state.
- **No filler copy.** Every address, suburb, time and number on the four screens is real content for
  a Christchurch run, and the same next stop appears on Today and on Driving.

The misuses this sheet refuses: the state is never colour alone; the seal is never a coloured
button; the three shapes are never used as decoration; the map is never brightened to make a
moment.

---

## How the videos are made

The video of a direction is the lab route recorded on the CI emulator, at most 60 seconds, the four
screens in order with the signature moments.

- **The flow.** `.maestro/directions/08-haptic-city.yaml` opens the route with a deep link, waits
  for `today-screen`, walks Today, Driving, Copilot and Scanner, and presses the seal so the
  confirmation lands on the recording.
- **The recording.** The workflow `.github/workflows/design-videos.yml` builds the debug APK, starts
  the emulator, installs the APK, runs the flow and records the screen with `adb shell
  screenrecord`; the mp4 is uploaded as a workflow artefact.
- **The frame trace.** The same job captures the frame trace of the run with `adb shell dumpsys gfxinfo` and puts it in the artefact as `fps-08.txt`; the QA lead copies it into `evidence/` for REVIEW-E7.

---

## The package

| The file | What it holds |
|---|---|
| `README.md` | This sheet |
| `mark.svg` | The brand mark |
| `evidence/contrast.txt` | The measured contrast of every pair, day and night |
| `render/` | The static render of the four screens |
| `screenshots/` | The eight PNGs of the four screens, light and night |
