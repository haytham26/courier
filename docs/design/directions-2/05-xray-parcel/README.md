# 05 X-ray Parcel

**The idea.** The parcel is the hero: a dimensional box with its label, and a delivery that is a
physical act.

**The route.** `/design2/05-xray-parcel` — the four screens of the brief (Today, Driving, Copilot,
Scanner), in the day and in the night, with the seven states of the contract behind `?state=`.

This is a candidate for the founder's pack (MASTER_EXECUTION §13.6). It is not the product, and no
screen of the product is built in it.

---

## The fingerprint

The ten fields of `docs/design/SPEC.md` §10.

| # | The field | This direction |
|---|---|---|
| 1 | The accent | Safety orange `#a63a00` (palette P1 HiVis), 5.42:1 as text on the background |
| 2 | The second chromatic colour | Kelp green `#14563c`, the extrusion of the buildings, 7.20:1 on the background |
| 3 | The type pairing | Bricolage Grotesque (display) and IBM Plex Sans (work), both SIL OFL 1.1 — pairing D |
| 4 | The density | Dense: six stops visible on Today at 390 by 844 |
| 5 | The layout grammar | The object and the ground: the parcel stands on the left, the run is on the right, and the two never share a card |
| 6 | The motion character | The parcel unfolds, 250 ms, on a spring with the weight of a box (damping 30, stiffness 260, mass 1.2) |
| 7 | The map treatment | The MapLibre 3D buildings style recoloured in P1 HiVis, the buildings extruded at 55 degrees in the kelp green |
| 8 | The icon treatment | Material Symbols, weight 500, and the parcel, the rack position and the door drawn on a 24 dp grid with a 2 dp stroke |
| 9 | The night rule | The ground cools to a near-black and the parcel is lit from the north-west so it stays solid |
| 10 | The three signature moments | The parcel turns edge-on and drops into the rack, the camera pulls back and up, Copilot is a stamped band |

---

## The mood board

The references that shaped this direction, with the source each one was read from
(`docs/design/RESEARCH-2.md`, read 2026-10-22). What is taken is the discipline, never the asset.

| The reference | What it gave this direction |
|---|---|
| [CapWords](https://capwords.app/) — the camera and the result are one continuous action (RESEARCH-2 §3.1) | The scanner is a single uninterrupted gesture, from the label in the camera to the corrected address on the screen |
| [(Not Boring) Camera](https://www.notboring.camera/) — a fast, physical shutter (RESEARCH-2 §3.1) | The delivery is a physical act with a physical finish: the parcel turns edge-on and drops into the rack, with no confetti |
| [CellWalk](https://developer.apple.com/design/awards/2025/) — a 3D model at real fidelity (RESEARCH-2 §3.1) | 3D only where the model earns its place: the parcel is a real object with a lid, a label and a rack position |
| [Feather: Draw in 3D](https://developer.apple.com/design/awards/2025/) and [Moonlitt](https://apps.apple.com/us/story/id1896834601) (RESEARCH-2 §3.1) | The 3D is an answer to a question: which side of the street is the door on, and what is in the van |
| [MapLibre 3D buildings](https://github.com/maplibre/demotiles) and the [MapLibre style spec](https://github.com/maplibre/maplibre-style-spec) (RESEARCH-2 §2.11, §5.4) | The extrusion is drawn from our own style file with the LINZ outlines and the OSM heights, so it works offline |
| [Material 3 motion physics](https://m3.material.io/styles/motion/overview/how-it-works) and the [Reanimated spring reference](https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring/) (RESEARCH-2 §1.3, §5.3) | The spring carries the mass of the object: a box has weight, and it settles rather than bounces |
| [react-native-skia](https://github.com/Shopify/react-native-skia) — the drawing engine (RESEARCH-2 §2.11) | The one place a 3D object is drawn rather than composed, and the place where the bloom of the engine is refused |
| [impeccable](https://github.com/pbakaus/impeccable) (RESEARCH-2 §1.7) | The things this direction refuses: an illustration with a user interface pasted over it, a parcel-label look, a badge confetti on success |

---

## The brand mark

`mark.svg` in this folder: the parcel in isometric with its label band on the face.

- The box is the ink (`textPrimary`); the label band is the accent (`brandPrimary`, the safety
  orange). No colour outside the palette is used.
- The one-colour form is the whole mark in `textPrimary`.
- The minimum size is 16 px: at that size the three edges of the box are still three edges and the
  band is still a band.
- The misuses it avoids: the box is never given a drop shadow, never a glass face and never a
  photograph of cardboard; the label band is never turned into a wordmark.

---

## The palette

P1 HiVis of `docs/design/RESEARCH-2.md` §5.2: safety orange and kelp green on a cool white — the
orange of the road works and of the hi-vis on the courier's vest, the green of the kelp of the
south coast. The orange is the label band and the one thing the driver acts on.

The full report is `evidence/contrast.txt`, measured with
`packages/design-tokens/src/contrast.ts`. Every pair clears its bar.

| The token | Day | On the background | On the surface | Night | On the night background |
|---|---|---|---|---|---|
| `background` | `#f0f1ec` | — | — | `#0f1210` | — |
| `surface` | `#ffffff` | — | — | `#181c19` | — |
| `surfaceElevated` | `#e0e5da` | — | — | `#212620` | — |
| `textPrimary` | `#14161a` | 15.08:1 | 18.11:1 | `#f1f2ef` | 16.77:1 |
| `textSecondary` | `#454a4f` | 8.04:1 | 8.95:1 | `#c3c8c2` | 11.00:1 |
| `brandPrimary` (the orange) | `#a63a00` | 5.42:1 | 6.51:1 | `#e07a35` | 6.29:1 |
| `brandSecondary` (the kelp green) | `#14563c` | 7.20:1 | 8.66:1 | `#5fae86` | 7.08:1 |
| `border` (3:1 bar) | `#6b7067` | 4.22:1 | 5.07:1 | `#7b837a` | 4.82:1 |
| `mapText` on `mapLand` | `#14161a` | 15.95:1 | — | `#f1f2ef` | 15.33:1 |

The bars: 4.5:1 for the body, 7:1 for the driving text, 3:1 for a boundary.

---

## The type pairing

Pairing D of `docs/design/RESEARCH-2.md` §5.1 — the compact and industrial pairing.

| The role | The family | The licence | Where the licence is published |
|---|---|---|---|
| Display: the number, the address, the handling marks | Bricolage Grotesque | SIL OFL 1.1 | https://github.com/google/fonts/blob/main/ofl/bricolagegrotesque/OFL.txt |
| Work: everything else | IBM Plex Sans | SIL OFL 1.1 | https://github.com/IBM/plex/blob/master/LICENSE.txt |

Bricolage Grotesque reaches weight 800 without a second file, so the handling marks can be heavy
without a second face. The seven steps of the scale are in
`packages/design-tokens/src/directionsLab.ts` (`xrayParcel.type`), and every number that changes is
set with tabular figures.

Both licences are SIL OFL 1.1, which covers use in a shipped application and allows the font to be
embedded in the binary. The notice goes into `docs/product/LICENSES.md` with the rest of the ledger.

---

## The motion language

The character: **the parcel unfolds**. The parcel opens out of its flat state with the weight of a
box. Nothing loops, and only the confirmation is allowed a hair of overshoot.

| The movement | The configuration | The duration | What it does |
|---|---|---|---|
| The parcel unfolding | `motion.springs.sheet` — damping 30, stiffness 260, mass 1.2 | 250 ms | The box comes out of its flat state and takes its place on the ground |
| A stop joining the run | `motion.springs.settle` — damping 26, stiffness 220, mass 1.1 | 200 ms | The count settles on the new number |
| The confirmation | `motion.springs.confirm` — damping ratio 0.86 | 220 ms | The parcel turns edge-on and drops into the rack of the van, with the delivered haptic |
| The stamped band | `motion.springs.voiceBar` — damping 34, stiffness 320, mass 0.9 | 200 ms | The assistant's band is taped across the face of the parcel, fast enough to keep up with the voice |

Everything runs on the UI thread through Reanimated 4. With "reduce motion" on, the same movement
arrives with no travel: the state still changes, it simply does not travel (the `reducedMotion`
token, duration 0). The haptics are on the confirm, the delivered and the error, and never on a
scroll or a passive map movement.

---

## The map style

- **The basemap.** The MapLibre 3D buildings style, recoloured in P1 HiVis
  (https://github.com/maplibre/demotiles and https://github.com/maplibre/maplibre-style-spec; the
  code is BSD-3-Clause and the data is OSM under the ODbL). The LINZ building outlines under CC BY
  4.0 are attributed on the screen, with the OpenStreetMap notice.
- **The layers.** The land, the water, the roads and the motorway in the map colours of the
  direction (`mapLand #f0f1ec`, `mapRoad #ffffff`, `mapHighway #f2c94c`); the run as one route line
  in the orange; the stops as pins; the labels in `mapText` with the land colour as their halo. At
  night the map carries three layers only: the route, the stops and the labels.
- **The camera.** As it is implemented in the route: a pitch of 55 degrees, north-up
  (`bearing 0`), the map opening at zoom 15. It pulls back and up to 55 degrees so the buildings
  stand beside the road, and it never turns while the driver is reading the address.
- **The 3D.** The LINZ building outlines and the OSM heights, extruded at 55 degrees with the
  extrusion in the kelp green, from our own tiles so it works offline. The 3D is what tells the
  courier where the door is: which side of the street, and whether the drop is behind the building.

---

## The signature moments

The three moments a courier lives in (REVIEW-S1 to S3). They are implemented in the route above,
not only described.

1. **How a delivery is confirmed.** The parcel turns edge-on and drops into the rack of the van in
   250 ms, with the delivered haptic. The same behaviour is on Today and on Driving.
2. **How the map moves.** The camera pulls back and up to 55 degrees so the buildings stand beside
   the road, then settles.
3. **How Copilot appears.** Copilot appears as a stamped band across the face of the parcel, the way
   a label is taped on.

---

## The anti-AI answers and the misuses

The fifteen rules of REVIEW-A are answered by the measurement in `evidence/contrast.txt` and by the
sheets above. The three that shaped this direction the most:

- **No glow or bloom.** The shadow count in the components is zero, or the shadows are neutral and
  inside the three elevation levels of the contract.
- **No generic rounded cards stacked.** The parcel and the run are two different objects on two
  different grounds; they never share a card.
- **No filler copy.** Every address, suburb, time and number on the four screens is real content for
  a Christchurch run, and the same next stop appears on Today and on Driving.

The misuses this sheet refuses: the parcel is never a photograph of cardboard; the extrusion is never
neon; the delivery is never celebrated with confetti; the object is never given a glass face.

---

## How the videos are made

The video of a direction is the lab route recorded on the CI emulator, at most 60 seconds, the four
screens in order with the signature moments.

- **The flow.** `.maestro/directions/05-xray-parcel.yaml` opens the route with a deep link, waits
  for `today-screen`, walks Today, Driving, Copilot and Scanner, and presses the confirmation so the
  parcel drops into the rack on the recording.
- **The recording.** The workflow `.github/workflows/design-videos.yml` builds the debug APK, starts
  the emulator, installs the APK, runs the flow and records the screen with `adb shell
  screenrecord`; the mp4 is uploaded as a workflow artefact.
- **The frame trace.** The same job captures the frame trace of the run with `adb shell dumpsys gfxinfo` and puts it in the artefact as `fps-05.txt`; the QA lead copies it into `evidence/` for REVIEW-E7.

---

## The package

| The file | What it holds |
|---|---|
| `README.md` | This sheet |
| `mark.svg` | The brand mark |
| `evidence/contrast.txt` | The measured contrast of every pair, day and night |
| `screens/` and `screenshots/` | The eight PNGs of the four screens, light and night |
| `render.html` | The static render of the four screens |
