# 07 Weather Light

**The idea.** The palette and the contrast follow the day's light: a clear morning and a
low-contrast dusk are two ends of one scale.

**The route.** `/design2/07-weather-light` — the four screens of the brief (Today, Driving, Copilot,
Scanner), in the day and in the night, with the seven states of the contract behind `?state=`.

This is a candidate for the founder's pack (MASTER_EXECUTION §13.6). It is not the product, and no
screen of the product is built in it.

---

## The fingerprint

The ten fields of `docs/design/SPEC.md` §10.

| # | The field | This direction |
|---|---|---|
| 1 | The accent | Sea blue `#0a4a63` (palette P2 Harbour), 8.58:1 as text on the background |
| 2 | The second chromatic colour | Rust `#a8461b`, the route on the map, 5.24:1 on the background |
| 3 | The type pairing | Instrument Sans (display) and Public Sans (work) — pairing E, whose second licence the research marks unverified |
| 4 | The density | Comfortable: four stops visible on Today at 390 by 844 |
| 5 | The layout grammar | The asymmetric block: one large block of "now" on the left two thirds, the right third carries only the light and the weather |
| 6 | The motion character | The light settles: a wash of the new light comes in and comes to rest, 200 ms |
| 7 | The map treatment | The Protomaps style with a data-driven tint, the buildings extruded at 50 degrees |
| 8 | The icon treatment | Material Symbols, weight 500; the state of the weather is drawn, never coloured in |
| 9 | The night rule | The ground cools to a near-black and the accent lifts to the dimmed `#5fa6c4`, so the same hue reads at night |
| 10 | The three signature moments | The day advances, the camera leans with the light, Copilot is a band of light |

---

## The mood board

The references that shaped this direction, with the source each one was read from
(`docs/design/RESEARCH-2.md`, read 2026-10-22). What is taken is the discipline, never the asset.

| The reference | What it gave this direction |
|---|---|
| [Tide Guide](https://apps.apple.com/us/story/id1896834601) — a palette that adapts to the colour of the sky throughout the day (RESEARCH-2 §3.1) | The idea of a palette that follows the time of day; ours switches to the night theme at sunset, and the night theme is a design, not an inversion |
| [Apple Design Awards 2026](https://developer.apple.com/design/awards/2026/) — Moonlitt, a 3D map with a calm surface around it (RESEARCH-2 §3.1) | The camera pitch that puts the world at the driver's eye line, and the pale calm surface around it |
| [protomaps/basemaps](https://github.com/protomaps/basemaps) — the reference style of the round (RESEARCH-2 §5.4) | The quiet land colour the light is judged against, and the one loud motorway |
| [CSS Color 4](https://www.w3.org/TR/css-color-4/) — OKLCH (RESEARCH-2 §1.6) | The day scale is perceptual: the same lightness means the same lightness, so the contrast survives the hour of the day |
| [Instrument Sans on Google Fonts](https://github.com/google/fonts/blob/main/ofl/instrumentsans/METADATA.pb) — `wdth 75-100`, `wght 400-700` (RESEARCH-2 §1.5) | A humanist face with a width axis, so the address fits the left two thirds without being condensed to a smudge |
| [Material 3 motion](https://m3.material.io/styles/motion/overview/how-it-works) and the [Reanimated spring reference](https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring/) (RESEARCH-2 §1.3, §5.3) | The `settle` spring: a fact comes to rest, it does not bounce, and the wash of the new light arrives without a jerk |
| [Android for Cars design principles](https://developer.android.com/design/ui/cars/guides/foundations/design-principles) (RESEARCH-2 §1.8) | The published limit for a moving vehicle: the address is readable at a glance and nothing else asks for attention |
| [impeccable](https://github.com/pbakaus/impeccable) (RESEARCH-2 §1.7) | The things this direction refuses: a wallpaper palette, a generated-app look, a gradient button |

---

## The brand mark

`mark.svg` in this folder: the sun over the horizon of the day.

- The sun is the accent (`brandPrimary`, the sea blue); the two horizons are the ink
  (`textPrimary`). No colour outside the palette is used.
- The one-colour form is the whole mark in `textPrimary`.
- The minimum size is 16 px: at that size the disc and the two rules are still three separate
  shapes.
- The misuses it avoids: the mark is never given a glow or a bloom, the disc is never a gradient,
  and the horizon is never curved into a wave.

---

## The palette

P2 Harbour of `docs/design/RESEARCH-2.md` §5.2: sea blue and rust on a cool white. The blue is the
water and the sky of the harbour the run starts from; the rust is the route drawn on the map.

The full report is `evidence/contrast.txt`, measured with
`packages/design-tokens/src/contrast.ts`. Every pair clears its bar.

| The token | Day | On the background | On the surface | Night | On the night background |
|---|---|---|---|---|---|
| `background` | `#eef2f4` | — | — | `#0c1114` | — |
| `surface` | `#ffffff` | — | — | `#141b1f` | — |
| `surfaceElevated` | `#e4ebee` | — | — | `#1c252a` | — |
| `textPrimary` | `#0d161a` | 16.26:1 | 18.31:1 | `#f2f6f8` | 17.46:1 |
| `textSecondary` | `#3c4d55` | 7.82:1 | 8.81:1 | `#bccbd1` | 11.39:1 |
| `brandPrimary` (the sea blue) | `#0a4a63` | 8.58:1 | 9.67:1 | `#5fa6c4` | 7.00:1 |
| `brandSecondary` (the rust) | `#a8461b` | 5.24:1 | 5.90:1 | `#e08148` | 6.69:1 |
| `border` (3:1 bar) | `#5d6f77` | 4.65:1 | 5.24:1 | `#6f8189` | 4.68:1 |
| `mapText` on `mapLand` | `#0d161a` | 16.28:1 | — | `#f2f6f8` | 14.33:1 |

The bars: 4.5:1 for the body, 7:1 for the driving text, 3:1 for a boundary.

---

## The type pairing

Pairing E of `docs/design/RESEARCH-2.md` §5.1 — the humanist and plain pairing.

| The role | The family | The licence | Where the licence is published |
|---|---|---|---|
| Display: the number and the address | Instrument Sans | SIL OFL 1.1 | https://github.com/google/fonts/blob/main/ofl/instrumentsans/OFL.txt |
| Work: everything else | Public Sans | **Unverified** — the GitHub API reports no licence file for the repository | Read the `LICENSE` in the repository before this direction ships |

Instrument Sans carries `wdth 75-100` and `wght 400-700`, so the address fits the left two thirds
of the block without being condensed. The seven steps of the scale are in
`packages/design-tokens/src/directions2.ts` (`weatherLight.type`), and every number that changes is
set with tabular figures.

**The open licence row.** Public Sans is the one family of the round whose licence the research
marks unverified (RESEARCH-2 §5.1). REVIEW-K1 makes a missing licence row a blocker, so the row for
Public Sans in `docs/product/LICENSES.md` has to be closed by reading the licence in the repository before
this direction can ship. If the licence cannot be confirmed, the pairing falls back to
Geist, whose licence is published.

---

## The motion language

The character: **the light settles**. A wash of the new light comes in and comes to rest. Nothing
loops and nothing celebrates.

| The movement | The configuration | The duration | What it does |
|---|---|---|---|
| The light settling | `motion.springs.settle` — damping 26, stiffness 220, mass 1.1 | 200 ms | The wash of the new light comes in and comes to rest |
| The count rolling down | `motion.springs.settle` | 200 ms | The number of stops left rolls down on the same spring |
| The confirmation | `motion.springs.confirm` — damping ratio 0.86 | 220 ms | The day advances: confirming a stop moves the light one step along the day scale |
| The band of the voice | `motion.springs.voiceBar` — damping 34, stiffness 320, mass 0.9 | 200 ms | The width of the band is the amplitude of the microphone, and it settles when the sound stops |

Everything runs on the UI thread through Reanimated 4. With "reduce motion" on, the same movement
arrives with no travel: the state still changes, it simply does not travel (the `reducedMotion`
token, duration 0). The haptics are on the confirm, the delivered and the error, and never on a
scroll or a passive map movement.

---

## The map style

- **The basemap.** The Protomaps style with a data-driven tint, recoloured in P2 Harbour
  (https://github.com/protomaps/basemaps; the code is BSD-3-Clause and the visual design of the
  styles is CC0). The data is OSM under the ODbL and the LINZ building outlines under CC BY 4.0, and
  both attributions are on the screen.
- **The layers.** The land, the water, the roads and the motorway in the map colours of the
  direction (`mapLand #eff2f3`, `mapRoad #ffffff`, `mapHighway #f0c674`); the run as one route line
  in the rust; the stops as pins in the blue; the labels in `mapText` with the land colour as their
  halo. At night the map carries three layers only: the route, the stops and the labels.
- **The camera.** Heading-up while driving, at a follow pitch of 34 degrees and a follow zoom of
  16.5; the 3D pitch is 50 degrees. The camera leans with the light: 50 degrees in the clear
  morning and 30 when the light is flat, and it never turns while the address is being read.
- **The 3D.** The LINZ building outlines and the OSM heights, extruded from our own tiles so it
  works offline, in the building colour of the palette. The tint of the style follows the hour of
  the day, so the map and the interface are never in two different lights.

---

## The signature moments

The three moments a courier lives in (REVIEW-S1 to S3). They are implemented in the route above,
not only described.

1. **How a delivery is confirmed.** The day advances: confirming a stop moves the light one step
   along the day scale, and the whole screen re-tunes to the new light over a 200 ms settle while
   the count rolls down. The same behaviour is on Today and on Driving.
2. **How the map moves.** The camera leans with the light: 50 degrees of pitch in the clear
   morning, 30 when the light is flat, never turning while the address is being read.
3. **How Copilot appears.** Copilot is a light band under the address whose width is the amplitude of
   the microphone, tinted with the light of the hour.

---

## The anti-AI answers and the misuses

The fifteen rules of REVIEW-A are answered by the measurement in `evidence/contrast.txt` and by the
sheets above. The three that shaped this direction the most:

- **No neon accent on black.** The identity is the light palette; the night accent is a dimmed
  `#5fa6c4`, not a glowing hue on a black field.
- **No purple-to-blue gradient.** The palette holds no gradient at all, and the sea blue is a single
  hue with a single value.
- **No filler copy.** Every address, suburb, time and number on the four screens is real content for
  a Christchurch run, and the same next stop appears on Today and on Driving.

The misuses this sheet refuses: the palette never follows the wallpaper; the light never becomes a
gradient; the weather is never drawn with an emoji; the night theme is never the day theme with a
filter over it.

---

## How the videos are made

The video of a direction is the lab route recorded on the CI emulator, at most 60 seconds, the four
screens in order with the signature moments.

- **The flow.** `.maestro/directions/07-weather-light.yaml` opens the route with a deep link, waits
  for `today-screen`, walks Today, Driving, Copilot and Scanner, and presses the confirmation so
  the day advances on the recording.
- **The recording.** The workflow `.github/workflows/design-videos.yml` builds the debug APK, starts
  the emulator, installs the APK, runs the flow and records the screen with `adb shell
  screenrecord`; the mp4 is uploaded as a workflow artefact.
- **The frame trace.** The same job captures the frame trace of the run with `adb shell dumpsys gfxinfo` and puts it in the artefact as `fps-07.txt`; the QA lead copies it into `evidence/` for REVIEW-E7.

---

## The package

| The file | What it holds |
|---|---|
| `README.md` | This sheet |
| `mark.svg` | The brand mark |
| `evidence/contrast.txt` | The measured contrast of every pair, day and night |
| `render/` | The static render of the four screens |
| `screenshots/` | The eight PNGs of the four screens, light and night |
