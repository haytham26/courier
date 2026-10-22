# 01 Control Room

**The idea.** The run is an instrument panel: every number is a readout and the next move is the only
bright thing on the screen.

**The route.** `/design2/01-control-room` — the four screens of the brief (Today, Driving, Copilot,
Scanner), in the day and in the night, with the seven states of the contract behind `?state=`
(`loading`, `empty`, `error`, `offline`, `partial`, `denied`, `long`).

This is a candidate for the founder's pack (MASTER_EXECUTION §13.6). It is not the product, and no
screen of the product is built in it.

---

## The fingerprint

The ten fields of `docs/design/SPEC.md` §10, so the QA lead can compare this direction with the
other nine line by line.

| # | The field | This direction |
|---|---|---|
| 1 | The accent | Safety orange `#a63a00` (palette P1 HiVis), 5.84:1 as text on the background |
| 2 | The second chromatic colour | Kelp green `#14563c`, 7.77:1 on the background |
| 3 | The type pairing | Roboto Flex (display) and IBM Plex Mono (work), both SIL OFL 1.1 — pairing C |
| 4 | The density | Dense: six stops visible on Today at 390 by 844 |
| 5 | The layout grammar | The instrument: one fixed grid of readouts, twelve columns wide; nothing is centred and nothing floats |
| 6 | The motion character | The needle settles: every readout moves on a critically damped spring, 200 ms |
| 7 | The map treatment | The Protomaps basemap recoloured in P1 HiVis, buildings extruded at 46 degrees |
| 8 | The icon treatment | Material Symbols, weight 500, one grid; the state of a thing is a lamp, not a colour |
| 9 | The night rule | The panel cools to a near-black and the orange dims to `#e07a35`, so it is a lamp and not a flare |
| 10 | The three signature moments | The needle sweeps, the camera steps, Copilot is a strip along the top of the panel |

---

## The mood board

The references that shaped this direction, with the source each one was read from
(`docs/design/RESEARCH-2.md`, read 2026-10-22). Nothing is copied: what is taken is the
discipline, never the asset.

| The reference | What it gave this direction |
|---|---|
| [Harvee](https://developer.apple.com/design/awards/2026/) — a dense but calm operational screen (RESEARCH-2 §3.1) | The panel is allowed to be dense, as long as it stays calm: the state of the run is read as a set of live readouts and nothing competes with the next move |
| [The Outsiders: Athlete Tracker](https://developer.apple.com/design/awards/2026/) — live tracking read as a single number and a single line (RESEARCH-2 §3.1) | The rule of one number first: the stops left is the largest thing on the screen and the words under it are the annotation |
| [Watch Duty: Wildfire Maps](https://developer.apple.com/design/awards/2025/) — the incident map (RESEARCH-2 §3.1) | One status colour and everything else in ink, so the map never argues with the panel |
| [Linearity.ai](https://www.awwwards.com/websites/mobile-apps/) — dense information on a precise grid (RESEARCH-2 §3.1) | The grid of the panel: a fixed set of columns, so a value never moves under the driver's eye |
| [protomaps/basemaps](https://github.com/protomaps/basemaps) — the clearest modern basemap in the pool (RESEARCH-2 §5.4) | The map under the panel: thin roads, a quiet land colour, one loud motorway, labels that step down in size |
| [Material 3 motion physics](https://m3.material.io/styles/motion/overview/how-it-works) and the [Reanimated spring reference](https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring/) (RESEARCH-2 §1.3, §5.3) | The needle settles instead of bouncing: a critically damped spring, 200 ms, on the UI thread |
| [Android for Cars design principles](https://developer.android.com/design/ui/cars/guides/foundations/design-principles) (RESEARCH-2 §1.8) | The published limit for a moving vehicle: three taps or fewer, one to three lines, which is why the panel has one action and one number |
| [impeccable](https://github.com/pbakaus/impeccable) — the detector rules for the look the founder rejected (RESEARCH-2 §1.7) | The list of things this direction does not do: no cards in a stack, no rounded-square icon tile, no grey text on a coloured field |

---

## The brand mark

`mark.svg` in this folder: the needle of the run gauge, with the readout under it.

- The gauge arc and the readout are the ink of the palette (`textPrimary`), the needle is the accent
  (`brandPrimary`). No colour outside the palette is used.
- The one-colour form is the whole mark in `textPrimary`, for the app icon and the map attribution.
- The minimum size is 16 px: at that size the arc, the needle and the readout bar are three
  separable shapes and the mark still reads as a gauge.
- The misuses it avoids: it is never rotated, never given a shadow or a glow, and never set in a
  circle of its own — the gauge arc is the circle.

---

## The palette

P1 HiVis of `docs/design/RESEARCH-2.md` §5.2: safety orange and kelp green on a cool white. The
orange is the lamp of the panel and it is used for the one thing the driver has to act on; the green
is the second line of the instrument.

The full report is `evidence/contrast.txt`, measured with
`packages/design-tokens/src/contrast.ts` (the same code the build gate uses). Every pair clears its
bar.

| The token | Day | On the background | On the surface | Night | On the night background |
|---|---|---|---|---|---|
| `background` | `#f2f3f0` | — | — | `#101311` | — |
| `surface` | `#ffffff` | — | — | `#181c19` | — |
| `surfaceElevated` | `#e9ebe5` | — | — | `#212622` | — |
| `textPrimary` | `#14161a` | 16.26:1 | 18.11:1 | `#f4f5f2` | 17.08:1 |
| `textSecondary` | `#454a4f` | 8.04:1 | 8.95:1 | `#c3c8c2` | 11.00:1 |
| `brandPrimary` (the accent) | `#a63a00` | 5.84:1 | 6.51:1 | `#e07a35` | 6.24:1 |
| `brandSecondary` (kelp green) | `#14563c` | 7.77:1 | 8.66:1 | `#5fae86` | 7.02:1 |
| `border` (3:1 bar) | `#6b7067` | 4.56:1 | 5.07:1 | `#7b837a` | 4.78:1 |
| `mapText` on `mapLand` | `#14161a` | 15.95:1 | — | `#f4f5f2` | 14.06:1 |

The bars: 4.5:1 for the body, 7:1 for the driving text, 3:1 for a boundary. The night accent was
lifted from the measured row of the research to `#e07a35` so it reads as a lamp rather than a flare,
and the change is proved by `contrast.test.ts`.

---

## The type pairing

Pairing C of `docs/design/RESEARCH-2.md` §5.1 — the technical pairing, one family in two roles.

| The role | The family | The licence | Where the licence is published |
|---|---|---|---|
| Display: the number, the address, the readout | Roboto Flex | SIL OFL 1.1 | https://github.com/google/fonts/blob/main/ofl/robotoflex/OFL.txt |
| Work: everything else | IBM Plex Mono | SIL OFL 1.1 | https://github.com/IBM/plex/blob/master/LICENSE.txt |

Roboto Flex carries thirteen axes; `wdth` condenses the address to one line and `opsz` carries the
64 px number. The seven steps of the scale are in `packages/design-tokens/src/directions2a.ts`
(`controlRoom.type`), and every number that changes is set with tabular figures.

Both licences are SIL OFL 1.1, which covers use in a shipped application and allows the font to be
embedded in the binary. The notice goes into `docs/LICENSES.md` with the rest of the ledger.

---

## The motion language

The character: **the needle settles**. Every readout moves on a critically damped spring, so a value
comes to rest instead of bouncing. Nothing loops, and nothing celebrates a single parcel.

| The movement | The configuration | The duration | What it does |
|---|---|---|---|
| A panel coming up | `motion.springs.settle` — damping 26, stiffness 220, mass 1.1 | 200 ms | The readouts arrive on the panel and come to rest |
| The number changing | `motion.springs.settle` | 200 ms | The gauge turns one notch; the digits roll down and settle |
| The confirmation | `motion.springs.confirm` — damping ratio 0.86 | 220 ms | The one movement allowed a hair of overshoot, once |
| The voice strip | `motion.springs.voiceBar` — damping 34, stiffness 320, mass 0.9 | 200 ms | The level bar of the microphone, which must never lag the voice |
| The sheet | `motion.springs.sheet` — damping 30, stiffness 260, mass 1.2 | 150 ms | The sheet follows the finger and settles with the velocity of the gesture |

Everything runs on the UI thread through Reanimated 4. With "reduce motion" on, the same movement
arrives with no travel: the value still changes, it simply does not travel (the `reducedMotion`
token, duration 0). The haptics are on the confirm, the delivered and the error, and never on a
scroll or a passive map movement.

---

## The map style

- **The basemap.** The Protomaps style, recoloured in P1 HiVis (https://github.com/protomaps/basemaps;
  the code is BSD-3-Clause and the visual design of the styles is CC0). The data is OSM under the
  ODbL and the LINZ building outlines under CC BY 4.0, and both attributions are on the screen
  (https://www.openstreetmap.org/copyright and the LINZ data service page).
- **The layers.** The land, the water, the roads and the motorway in the map colours of the
  direction (`mapLand #f0f1ec`, `mapRoad #ffffff`, `mapHighway #f2c94c`); the run as one route line
  in the accent at 5 px; the stops as pins in the accent; the labels in `mapText` with the land
  colour as their halo. At night the map carries three layers only: the route, the stops and the
  labels.
- **The camera.** Heading-up while driving, at a follow pitch of 38 degrees and a follow zoom of
  16; north-up in the stop list. The 3D pitch is 46 degrees. The camera moves from one stop to the
  next in 200 ms steps and never turns while the driver is reading the address.
- **The 3D.** The LINZ building outlines and the OSM heights, extruded from our own tiles so it
  works offline, lit from the north-west and coloured in the building colour of the palette. The
  3D is information: the courier reads the shape of the street, never the buildings for their own
  sake.

---

## The signature moments

The three moments a courier lives in (REVIEW-S1 to S3). They are implemented in the route above,
not only described.

1. **How a delivery is confirmed.** The needle sweeps: the run gauge turns one notch to the new
   count, the number rolls down on a critically damped spring and the next stop is written into the
   readout — one firm pulse, one wood tick, no celebration. The same behaviour is on Today and on
   Driving.
2. **How the map moves.** The camera steps: the map moves from one stop to the next in 200 ms steps
   and never turns while the driver reads the address; the follow pitch sits at 38 degrees so the
   road is visible over the bonnet.
3. **How Copilot appears.** Copilot is a strip along the top of the panel: the state in words, a
   static level bar of the microphone, and the last thing it said on one line under it. No bubble,
   no avatar, no sparkle.

---

## The anti-AI answers and the misuses

The fifteen rules of REVIEW-A are answered by the measurement in `evidence/contrast.txt` and by the
sheets above. The three that shaped this direction the most:

- **No stock iconography without a system.** One set, one weight: Material Symbols at weight 500,
  and the custom glyphs of the direction follow the same grid.
- **No filler copy.** Every address, suburb, time and number on the four screens is real content for
  a Christchurch run, and the same next stop appears on Today and on Driving.
- **No single-accent-on-grey template.** The palette holds two chromatic colours besides the
  neutrals: the safety orange and the kelp green.

The misuses this sheet refuses: the mark is never given a glow; the panel is never shown as a card
stack; the confirm is never a burst of confetti; the gauge is never allowed to spin past the value
it reports.

---

## How the videos are made

The video of a direction is the lab route recorded on the CI emulator, at most 60 seconds, the four
screens in order with the signature moments.

- **The flow.** `.maestro/directions/01-control-room.yaml` opens the route with a deep link, waits
  for `today-screen`, walks Today, Driving, Copilot and Scanner, and presses the confirmation so the
  needle sweeps on the recording.
- **The recording.** The workflow `.github/workflows/design-videos.yml` builds the debug APK, starts
  the emulator, installs the APK, runs the flow and records the screen with `adb shell
  screenrecord`; the mp4 is uploaded as a workflow artefact.
- **The frame trace.** The same job captures the frame trace of the run with `adb shell dumpsys gfxinfo` and puts it in the artefact as `fps-01.txt`; the QA lead copies it into `evidence/` for REVIEW-E7.

---

## The package

| The file | What it holds |
|---|---|
| `README.md` | This sheet |
| `mark.svg` | The brand mark |
| `evidence/contrast.txt` | The measured contrast of every pair, day and night |
| `screenshots/` | The eight PNGs of the four screens, light and night |
| `render.html` | The static render of the four screens |
