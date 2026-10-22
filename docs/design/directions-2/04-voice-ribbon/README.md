# 04 Voice Ribbon

**The idea.** The voice is the interface: a live amplitude ribbon along the bottom edge replaces the
buttons.

**The route.** `/design2/04-voice-ribbon` — the four screens of the brief (Today, Driving, Copilot,
Scanner), in the day and in the night, with the seven states of the contract behind `?state=`.

This is a candidate for the founder's pack (MASTER_EXECUTION §13.6). It is not the product, and no
screen of the product is built in it.

---

## The fingerprint

The ten fields of `docs/design/SPEC.md` §10.

| # | The field | This direction |
|---|---|---|
| 1 | The accent | Burnt sienna `#8c3b1a` (palette P6 Clay), 6.09:1 as text on the background |
| 2 | The second chromatic colour | Deep teal `#2f5d5a`, the map and the system colour, 5.92:1 on the background |
| 3 | The type pairing | Space Grotesk (display) and Geist (work), both SIL OFL 1.1 — pairing A |
| 4 | The density | Comfortable: three stops visible on Today at 390 by 844 |
| 5 | The layout grammar | The bottom ribbon: the content is anchored to the top-left and the ribbon owns the bottom third of the screen |
| 6 | The motion character | The ribbon rises, 200 ms, on a fast and tight spring (damping 34, stiffness 320, mass 0.9) |
| 7 | The map treatment | The Protomaps basemap recoloured in P6 Clay, the buildings extruded at 52 degrees and lit from the north-west |
| 8 | The icon treatment | Material Symbols, weight 500; the microphone is replaced by the ribbon itself and no new glyph is drawn |
| 9 | The night rule | The ground warms to a near-black and the ribbon becomes the only saturated thing on the screen |
| 10 | The three signature moments | The ribbon collapses and a rule is drawn, the camera drops and the route unrolls, Copilot rises out of the bottom edge |

---

## The mood board

The references that shaped this direction, with the source each one was read from
(`docs/design/RESEARCH-2.md`, read 2026-10-22). What is taken is the discipline, never the asset.

| The reference | What it gave this direction |
|---|---|
| [Speechify](https://speechify.com/) — voice is the interface, the screen is the transcript (RESEARCH-2 §3.1) | The companion is the interface and the screen says what it did in words, with no chat bubbles and no avatar |
| [Metaballs](https://developer.apple.com/design/awards/2026/) — physics as the interaction model (RESEARCH-2 §3.1) | The ribbon is a physical object with mass: a spring that carries the velocity of the hand, never a loop that breathes |
| [Apple Design Awards 2026](https://developer.apple.com/design/awards/2026/) — Moonlitt and the 3D map (RESEARCH-2 §3.1) | The camera leans so the road is visible over the bonnet, and the map answers a question rather than showing off |
| [protomaps/basemaps](https://github.com/protomaps/basemaps) — the reference style of the round (RESEARCH-2 §5.4) | The quiet land and the thin roads the ribbon of the route unrolls over |
| [Material 3 motion physics](https://m3.material.io/styles/motion/overview/how-it-works) and the [Reanimated spring reference](https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring/) (RESEARCH-2 §1.3, §5.3) | The `voiceBar` spring: fast and tight, because the bar must never lag the microphone |
| [The expo haptics API](https://docs.expo.dev/versions/latest/sdk/haptics/) and the [expo audio API](https://docs.expo.dev/versions/latest/sdk/audio/) (RESEARCH-2 §1.9, §1.10) | The haptic belongs to the movement, not to the reward: three earcons, 250 ms or less, below the voice |
| [Android for Cars design principles](https://developer.android.com/design/ui/cars/guides/foundations/design-principles) (RESEARCH-2 §1.8) | One control to talk to, and the rest of the screen is never something the driver has to read while moving |
| [impeccable](https://github.com/pbakaus/impeccable) (RESEARCH-2 §1.7) | The things this direction refuses: a sparkle icon on the voice bar, a chat bubble with a robot avatar, a progress bar that means the model is thinking |

---

## The brand mark

`mark.svg` in this folder: the amplitude ribbon along the bottom edge, over its baseline.

- The bars of the ribbon are the accent (`brandPrimary`, the burnt sienna); the baseline is the ink
  (`textPrimary`). No colour outside the palette is used.
- The one-colour form is the whole mark in `textPrimary`.
- The minimum size is 16 px: at that size the five bars are still five bars of different heights and
  the baseline still reads as a separate rule.
- The misuses it avoids: the bars never loop, never pulse and never mirror; the ribbon is never
  drawn inside a circle; the baseline is never made into a shadow.

---

## The palette

P6 Clay of `docs/design/RESEARCH-2.md` §5.2: burnt sienna and teal on a neutral white. The sienna is
the ribbon and the one thing the driver acts on; the teal is the map and the system colour, never a
second opinion about the brand.

The full report is `evidence/contrast.txt`, measured with
`packages/design-tokens/src/contrast.ts`. Every pair clears its bar.

| The token | Day | On the background | On the surface | Night | On the night background |
|---|---|---|---|---|---|
| `background` | `#e8e5e6` | — | — | `#121110` | — |
| `surface` | `#ffffff` | — | — | `#1b1a19` | — |
| `surfaceElevated` | `#f1efef` | — | — | `#242322` | — |
| `textPrimary` | `#151314` | 14.78:1 | 18.50:1 | `#f1edeb` | 16.21:1 |
| `textSecondary` | `#4a4547` | 7.51:1 | 9.40:1 | `#c8c1bd` | 10.62:1 |
| `brandPrimary` (the sienna) | `#8c3b1a` | 6.09:1 | 7.62:1 | `#dd8256` | 6.65:1 |
| `brandSecondary` (the teal) | `#2f5d5a` | 5.92:1 | 7.41:1 | `#71b3ae` | 7.87:1 |
| `border` (3:1 bar) | `#6b6567` | 4.56:1 | 5.70:1 | `#7d7674` | 4.24:1 |
| `mapText` on `mapLand` | `#151314` | 16.15:1 | — | `#f1edeb` | 14.94:1 |

The bars: 4.5:1 for the body, 7:1 for the driving text, 3:1 for a boundary.

---

## The type pairing

Pairing A of `docs/design/RESEARCH-2.md` §5.1 — the everyday pairing, the safest of the pool.

| The role | The family | The licence | Where the licence is published |
|---|---|---|---|
| Display: the number and the address | Space Grotesk | SIL OFL 1.1 | https://github.com/google/fonts/blob/main/ofl/spacegrotesk/OFL.txt |
| Work: everything else | Geist | SIL OFL 1.1 | https://github.com/vercel/geist-font/blob/main/LICENSE.txt |

Geist Mono is in the same licence as Geist for the parcel numbers. The seven steps of the scale are
in `packages/design-tokens/src/directionsLab.ts` (`voiceRibbon.type`), and every number that changes
is set with tabular figures.

Both licences are SIL OFL 1.1, which covers use in a shipped application and allows the font to be
embedded in the binary. The notice goes into `docs/product/LICENSES.md` with the rest of the ledger.

---

## The motion language

The character: **the ribbon rises**. The screen moves the way the microphone moves. Nothing loops:
the ribbon settles when the sound stops, and the state is a word under it.

| The movement | The configuration | The duration | What it does |
|---|---|---|---|
| The ribbon rising | `motion.springs.voiceBar` — damping 34, stiffness 320, mass 0.9 | 200 ms | The ribbon comes up out of the bottom edge and the screen moves up by its own height |
| The ribbon answering the voice | The `voiceBar` spring | 200 ms | The width of the ribbon is the amplitude of the microphone, and it settles when the sound stops |
| The confirmation | `motion.springs.settle` — damping 26, stiffness 220, mass 1.1 | 200 ms | The ribbon collapses to one flat line and a rule draws across the address, once |
| The sheet | `motion.springs.sheet` — damping 30, stiffness 260, mass 1.2 | 150 ms | The sheet follows the finger and settles with the velocity of the gesture |

Everything runs on the UI thread through Reanimated 4. With "reduce motion" on, the same movement
arrives with no travel: the ribbon is still there and the state is still changed, it simply does not
travel (the `reducedMotion` token, duration 0). The haptics are on the confirm, the delivered and
the error, and never on a scroll or a passive map movement.

---

## The map style

- **The basemap.** The Protomaps style, recoloured in P6 Clay (https://github.com/protomaps/basemaps;
  the code is BSD-3-Clause and the visual design of the styles is CC0). The data is OSM under the
  ODbL and the LINZ building outlines under CC BY 4.0, and both attributions are on the screen.
- **The layers.** The land, the water, the roads and the motorway in the map colours of the
  direction (`mapLand #f1efef`, `mapRoad #ffffff`, `mapHighway #e9d3a4`); the route as one line in
  the sienna; the stops as pins; the labels in `mapText` with the land colour as their halo. At
  night the map carries three layers only: the route, the stops and the labels.
- **The camera.** As it is implemented in the route: a pitch of 52 degrees, north-up
  (`bearing 0`), the map opening at zoom 15 and the camera going to the door of the next stop at zoom
  17. It drops from 52 degrees to 34 degrees when the courier follows the route, and it never turns
  while the driver is reading the address.
- **The 3D.** The LINZ building outlines and the OSM heights, extruded from our own tiles so it
  works offline, lit from the north-west at 52 degrees of pitch. The extrusion is what makes the
  ribbon of the route read as a ribbon and not a line on a photograph.

---

## The signature moments

The three moments a courier lives in (REVIEW-S1 to S3). They are implemented in the route above,
not only described.

1. **How a delivery is confirmed.** The ribbon collapses to one flat line and a rule draws across
   the address in 220 ms, once, with the delivered haptic. The same behaviour is on Today and on
   Driving.
2. **How the map moves.** The camera drops from 52 to 34 degrees of pitch and the route unrolls as
   a ribbon toward the next stop over 380 ms.
3. **How Copilot appears.** The ribbon rises out of the bottom edge over 200 ms and the whole screen
   moves up by its own height.

---

## The anti-AI answers and the misuses

The fifteen rules of REVIEW-A are answered by the measurement in `evidence/contrast.txt` and by the
sheets above. The three that shaped this direction the most:

- **No pulsing orbs.** The ribbon settles when the sound stops; it never loops, never breathes and
  never repeats.
- **No sparkle icons for the assistant.** The microphone is replaced by the ribbon itself, and the
  state is a word under the ribbon, never a colour alone.
- **No filler copy.** Every address, suburb, time and number on the four screens is real content for
  a Christchurch run, and the same next stop appears on Today and on Driving.

The misuses this sheet refuses: the ribbon is never used as decoration on a screen with no voice in
it; the assistant never speaks in a bubble; the ribbon is never drawn in a second colour for the
same state.

---

## How the videos are made

The video of a direction is the lab route recorded on the CI emulator, at most 60 seconds, the four
screens in order with the signature moments.

- **The flow.** `.maestro/directions/04-voice-ribbon.yaml` opens the route with a deep link, waits
  for `today-screen`, walks Today, Driving, Copilot and Scanner, and presses the confirmation so the
  ribbon collapses on the recording.
- **The recording.** The workflow `.github/workflows/design-videos.yml` builds the debug APK, starts
  the emulator, installs the APK, runs the flow and records the screen with `adb shell
  screenrecord`; the mp4 is uploaded as a workflow artefact.
- **The frame trace.** The same job captures the frame trace of the run with `adb shell dumpsys gfxinfo` and puts it in the artefact as `fps-04.txt`; the QA lead copies it into `evidence/` for REVIEW-E7.

---

## The package

| The file | What it holds |
|---|---|
| `README.md` | This sheet |
| `mark.svg` | The brand mark |
| `evidence/contrast.txt` | The measured contrast of every pair, day and night |
| `screens/` and `screenshots/` | The eight PNGs of the four screens, light and night |
| `render.html` | The static render of the four screens |
