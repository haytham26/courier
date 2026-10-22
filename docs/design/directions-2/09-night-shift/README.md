# 09 Night Shift

**The idea.** The night-driving screen is the hero, and the day version behind it is a design in its
own right.

**The route.** `/design2/09-night-shift` — the four screens of the brief (Today, Driving, Copilot,
Scanner), in the day and in the night, with the seven states of the contract behind `?state=`.

This is a candidate for the founder's pack (MASTER_EXECUTION §13.6). It is not the product, and no
screen of the product is built in it.

---

## The fingerprint

The ten fields of `docs/design/SPEC.md` §10.

| # | The field | This direction |
|---|---|---|
| 1 | The accent | Burnt sienna `#8c3b1a` (palette P6 Clay), 6.72:1 as text on the background |
| 2 | The second chromatic colour | Deep teal `#2f5d5a`, the route on the map, 6.53:1 on the background |
| 3 | The type pairing | Fraunces (display) and Source Sans 3 (work), both SIL OFL 1.1 — pairing B |
| 4 | The density | Compact: five stops visible on Today at 390 by 844 |
| 5 | The layout grammar | The full-bleed map: the map is the page, the interface floats on it as one opaque plate, and nothing may sit in the top fifth |
| 6 | The motion character | The night settles onto the door: one overshoot, once, and only when a delivery is confirmed, 250 ms |
| 7 | The map treatment | The Protomaps night style, recoloured in P6 Clay, the buildings extruded at 55 degrees |
| 8 | The icon treatment | Material Symbols, weight 500; the night theme asks for the system dark theme and it is the only theme that lowers the screen brightness request |
| 9 | The night rule | The night is a re-think, not an inversion: a warm near-black (`#131011`), blue channel 17, and the text is never pure white |
| 10 | The three signature moments | The world narrows to the door, the arrival is the movement, Copilot is a single rule at the foot of the dark |

---

## The mood board

The references that shaped this direction, with the source each one was read from
(`docs/design/RESEARCH-2.md`, read 2026-10-22). What is taken is the discipline, never the asset.

| The reference | What it gave this direction |
|---|---|
| [Moonlitt](https://apps.apple.com/us/story/id1896834601) — a 3D map used to answer a geometric question (RESEARCH-2 §3.1) | The night screen is the hero because it answers the driver's question in the dark: which side of the street is the door on |
| [Opal](https://developer.apple.com/design/awards/2025/) — a calm, monochrome device for attention (RESEARCH-2 §3.1) | Monochrome as a deliberate palette for the night screen, and a warm near-black rather than a black field |
| [Watch Duty: Wildfire Maps](https://developer.apple.com/design/awards/2025/) — a live map that stays legible under stress (RESEARCH-2 §3.1) | The incident map rule: one status colour, everything else in ink, and the one bright thing is the address |
| [Apple Design Awards 2026](https://developer.apple.com/design/awards/2026/) — Harvee and Hearing Buddy (RESEARCH-2 §3.1) | A dense but calm screen, and a state that is visible on the screen and not only audible |
| [protomaps/basemaps](https://github.com/protomaps/basemaps) — the reference style of the round (RESEARCH-2 §5.4) | The night style is a separate style file, not the day style with a filter over it |
| [Material 3 motion](https://m3.material.io/styles/motion/overview/how-it-works) and the [Reanimated spring reference](https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring/) (RESEARCH-2 §1.3, §5.3) | One overshoot is allowed in the whole product, and it belongs to the confirmation of a delivery |
| [The expo haptics API](https://docs.expo.dev/versions/latest/sdk/haptics/) and the [expo audio API](https://docs.expo.dev/versions/latest/sdk/audio/) (RESEARCH-2 §1.9, §1.10) | In the dark the haptic and the earcon are the signal: the app is fully usable with the screen brightness at its lowest |
| [impeccable](https://github.com/pbakaus/impeccable) (RESEARCH-2 §1.7) | The things this direction refuses: a neon accent on black, a dark mode that is a filter, a glowing edge |

---

## The brand mark

`mark.svg` in this folder: the one bright thing above the rule of the dark.

- The dot is the accent (`brandPrimary`, the burnt sienna); the rule is the ink (`textPrimary`). No
  colour outside the palette is used.
- The one-colour form is the whole mark in `textPrimary`.
- The minimum size is 16 px: at that size the dot and the rule are still two separate shapes.
- The misuses it avoids: the dot never becomes a glow, a beacon or a pulsing orb; the rule is never
  made into a gradient; the mark is never turned into a crescent.

---

## The palette

P6 Clay of `docs/design/RESEARCH-2.md` §5.2: burnt sienna and teal on a neutral white. The night
palette is a re-think and not an inversion: a warm near-black with a blue channel of 17, and text
that is never pure white.

The full report is `evidence/contrast.txt`, measured with
`packages/design-tokens/src/contrast.ts`. Every pair clears its bar.

| The token | Day | On the background | On the surface | Night | On the night background |
|---|---|---|---|---|---|
| `background` | `#f2f0f1` | — | — | `#131011` | — |
| `surface` | `#ffffff` | — | — | `#1c1918` | — |
| `surfaceElevated` | `#e8e5e6` | — | — | `#252220` | — |
| `textPrimary` | `#151314` | 16.31:1 | 18.50:1 | `#f5f1ef` | 16.86:1 |
| `textSecondary` | `#4a4547` | 8.29:1 | 9.40:1 | `#c8c1bd` | 10.65:1 |
| `brandPrimary` (the sienna) | `#8c3b1a` | 6.72:1 | 7.62:1 | `#dd8256` | 6.67:1 |
| `brandSecondary` (the teal) | `#2f5d5a` | 6.53:1 | 7.41:1 | `#71b3ae` | 7.89:1 |
| `border` (3:1 bar) | `#6b6567` | 5.03:1 | 5.70:1 | `#7d7674` | 3.92:1 |
| `mapText` on `mapLand` | `#151314` | 16.15:1 | — | `#f5f1ef` | 14.09:1 |

The bars: 4.5:1 for the body, 7:1 for the driving text, 3:1 for a boundary. The night text is
`#f5f1ef` and never `#ffffff`, and the night background is `#131011`, inside the band of REVIEW-G1
with a blue channel of 17, inside the bar of REVIEW-G3.

---

## The type pairing

Pairing B of `docs/design/RESEARCH-2.md` §5.1 — the editorial pairing.

| The role | The family | The licence | Where the licence is published |
|---|---|---|---|
| Display: the number and the address | Fraunces | SIL OFL 1.1 | https://github.com/google/fonts/blob/main/ofl/fraunces/OFL.txt |
| Work: everything else | Source Sans 3 | SIL OFL 1.1 | https://github.com/adobe-fonts/source-sans/blob/master/LICENSE.md |

Fraunces is a variable family with `opsz 9-144`, `wght 100-900`, `SOFT` and `WONK`; the product sets
`SOFT 0` and `WONK 0`. The seven steps of the scale are in
`packages/design-tokens/src/directions2.ts` (`nightShift.type`), and every number that changes is set
with tabular figures.

Both licences are SIL OFL 1.1, which covers use in a shipped application and allows the font to be
embedded in the binary. The notice goes into `docs/LICENSES.md` with the rest of the ledger.

---

## The motion language

The character: **the night settles onto the door**. One overshoot, once, and only when a delivery is
confirmed.

| The movement | The configuration | The duration | What it does |
|---|---|---|---|
| The plate arriving | `motion.springs.settle` — damping 26, stiffness 220, mass 1.1 | 250 ms | The interface settles onto the map as one opaque plate |
| The confirmation | `motion.springs.confirm` — damping ratio 0.86 | 220 ms | The world narrows to the door: the map falls to its night floor and the plate stays the only bright thing |
| The arrival | The camera's own 400 ms move | 400 ms | The camera eases from the follow pitch to 55 degrees and drops onto the door of the next stop |
| The rule of the voice | `motion.springs.voiceBar` — damping 34, stiffness 320, mass 0.9 | 200 ms | The single rule at the foot of the dark changes width with the microphone |

Everything runs on the UI thread through Reanimated 4. With "reduce motion" on, the same movement
arrives with no travel: the state still changes, it simply does not travel (the `reducedMotion`
token, duration 0). The haptics are on the confirm, the delivered and the error, and never on a
scroll or a passive map movement.

---

## The map style

- **The basemap.** The Protomaps night style, recoloured in P6 Clay
  (https://github.com/protomaps/basemaps; the code is BSD-3-Clause and the visual design of the
  styles is CC0). The night style is a separate style file and a separate variant of our own style,
  never the day style with a filter over it. The data is OSM under the ODbL and the LINZ building
  outlines under CC BY 4.0, and both attributions are on the screen.
- **The layers.** The land, the water, the roads and the motorway in the map colours of the
  direction (`mapLand #f1efef` by day, `#252220` at night); the run as one route line in the teal; the
  stops as pins in the sienna; the labels in `mapText` with the land colour as their halo. At night
  the map carries three layers only: the route, the stops and the labels.
- **The camera.** Heading-up while driving, at a follow pitch of 35 degrees and a follow zoom of 17;
  the 3D pitch is 55 degrees. The arrival is the movement: the camera eases from the follow pitch to
  55 degrees and drops onto the door of the next stop in 400 ms, and it never turns while the
  address is being read.
- **The 3D.** The LINZ building outlines and the OSM heights, extruded from our own tiles so it
  works offline. At night the extrusion is lit from the north-west so the buildings keep their shape
  without becoming the bright thing on the screen.

---

## The signature moments

The three moments a courier lives in (REVIEW-S1 to S3). They are implemented in the route above,
not only described.

1. **How a delivery is confirmed.** The world narrows to the door: on the confirmation the map
   falls to its night floor, the address plate stays the only bright thing on the screen and the
   camera settles onto the door in a single 220 ms move. The same behaviour is on Today and on
   Driving.
2. **How the map moves.** The arrival is the movement: the camera eases from the follow pitch to 55
   degrees and drops onto the door of the next stop in 400 ms, and it never turns while the address
   is being read.
3. **How Copilot appears.** Copilot is a single rule at the foot of the dark; the words sit above it
   in the night type and nothing else on the screen moves when it speaks.

---

## The anti-AI answers and the misuses

The fifteen rules of REVIEW-A are answered by the measurement in `evidence/contrast.txt` and by the
sheets above. The three that shaped this direction the most:

- **No neon accent on black.** The night accent is `#dd8256`, a dimmed sienna, on a warm near-black;
  it is a lamp, not a flare.
- **No dark mode by default.** The day palette is the identity, and the night theme is the adapted
  option that switches at sunset and by hand.
- **No filler copy.** Every address, suburb, time and number on the four screens is real content for
  a Christchurch run, and the same next stop appears on Today and on Driving.

The misuses this sheet refuses: the night theme is never the day theme with a filter; the plate is
never translucent over the map; the address is never the second brightest thing on the screen; the
night is never pure black.

---

## How the videos are made

The video of a direction is the lab route recorded on the CI emulator, at most 60 seconds, the four
screens in order with the signature moments.

- **The flow.** `.maestro/directions/09-night-shift.yaml` opens the route with a deep link, waits
  for `today-screen`, walks Today, Driving, Copilot and Scanner, and presses the confirmation so
  the world narrows to the door on the recording.
- **The recording.** The workflow `.github/workflows/design-videos.yml` builds the debug APK, starts
  the emulator, installs the APK, runs the flow and records the screen with `adb shell
  screenrecord`; the mp4 is uploaded as a workflow artefact.
- **The frame trace.** The same job captures the frame trace of the run with `adb shell dumpsys gfxinfo` and puts it in the artefact as `fps-09.txt`; the QA lead copies it into `evidence/` for REVIEW-E7.

---

## The package

| The file | What it holds |
|---|---|
| `README.md` | This sheet |
| `mark.svg` | The brand mark |
| `evidence/contrast.txt` | The measured contrast of every pair, day and night |
| `render/` | The static render of the four screens |
| `screenshots/` | The eight PNGs of the four screens, light and night |
