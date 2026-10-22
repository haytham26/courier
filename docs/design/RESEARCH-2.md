# Design research 2 — the foundation the ten directions stand on

**MASTER_EXECUTION §13.6 (the Design Studio restart). Read this before any direction is drawn.**

**Research date: 2026-10-22.** Method: V4 §12 — a card per source, the evidence, the day it was
read. Every number in this file was read live on **2026-10-22** from the GitHub REST API, the
repository's own licence file, the product's own site or the standards body, unless the row says
**unverified**. No star count, release date, licence or award in this file is estimated, and none
is invented. Where a host blocks our checker, the row says so and gives the URL a person can open.

The founder rejected Roadbook, Beacon and Freight on 2026-10-22 as "dated and plain, not an app
of 2026". This file is the ground the ten new directions stand on. It does not create the
directions and it does not build screens.

---

## 0. How to use this file

| If you are…                          | Read | You get                                                                                                                                                          |
| ------------------------------------ | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| a **direction team** choosing a look | §5   | a palette with measured ratios, a type pairing with a licence, a motion language with spring values, a map style with a licence — pickable without asking anyone |
| **Design QA** running the gate       | §4   | every anti-"AI look" rule of §13.2 turned into a check that can be run and failed, each with a real failure to look for                                          |
| **Motion, maps or iconography**      | §2   | the shortlist of what exists, with the stars, the release, the licence, the maintenance and the fit to Expo SDK 58 / RN 0.88                                     |
| **Brand or the founder**             | §3   | what the award-winning apps and the competitors actually do on screen, what to take from each, and what to refuse                                                |
| anyone                               | §1   | the shift that makes a 2026 app feel new, with the evidence for each part of it                                                                                  |

### 0.1 The evidence files

| File                                                             | What it is                                                                                                                               |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/design/evidence/github-repos-research2-2026-10-22.tsv`     | 124 repositories: stars, forks, created, pushed, last commit, licence, latest release and its date, releases, open issues, archived flag |
| `docs/design/evidence/research2-repos.txt`                       | the pool that was read, one `owner/name` per line, grouped by category                                                                   |
| `docs/design/evidence/palette-contrast-research2-2026-10-22.tsv` | 240 measured contrast pairs: the six candidate palettes, day and night, against the bars of `docs/design/SYSTEM.md` §6                   |
| `docs/design/evidence/reference-urls-research2-2026-10-22.tsv`   | every non-GitHub URL in this file with the HTTP status our checker saw                                                                   |
| `scripts/fetch-design-research2-evidence.ps1`                    | the GitHub snapshot (the token is read at runtime from `.env.local` and is never printed)                                                |
| `scripts/verify-design-research2-evidence.ps1`                   | the verifier pass: re-reads every fifth repository of the snapshot and writes the corrections it forced                                  |
| `docs/design/evidence/verifier-pass-2026-10-22.tsv`              | the result of that pass                                                                                                                  |
| `scripts/check-design-research2-reference-urls.ps1`              | the URL check                                                                                                                            |
| `scripts/design/measure-palettes.mjs`                            | the palette measurement, using the same contrast code the build gate uses                                                                |
| `scripts/design/print-palette-tables.mjs`                        | prints the tables of §5.2 from the snapshot, so the numbers cannot drift                                                                 |

### 0.2 The rules of this file

1. Plain NZ English. No emoji anywhere, in this file or in the product.
2. The product is never given a technology label in its own text; the voice is a feature of the
   product, not a personality, and the word "AI" never appears in the product.
3. A number that could not be read is written **unverified**. There is no estimate in this file.
4. The stars column is a snapshot, not a quality score. The maintenance column is the proxy of
   V4 §12.3: the day of the last commit, the last release and its date, the number of releases
   and the number of open issues.
5. Public material only. No proprietary asset of any reference product was copied, extracted or
   reverse engineered.

---

## 1. What makes a 2026 app feel new

### 1.1 The shift in one table

| The shift                          | What it is now                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | The evidence                                                                                                                                                                                                                                                                                                                                                                                     | What it means for a courier at the door                                                                                                                                          |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spatial**                        | A map is a 3D place, not a picture of a map. The camera has a pitch, buildings have height, the route is a ribbon in space.                                                                                                                                                                                                                                                                                                                                                             | Apple Design Awards 2026, Interaction winner: **Moonlitt** "plan a clear line of sight by locating the moon's path on the 3D map" (https://apps.apple.com/us/story/id1896834601, read 2026-10-22). Apple Design Awards 2025, Visuals and Graphics winner: **Feather: Draw in 3D** (https://developer.apple.com/design/awards/2025/, read 2026-10-22).                                            | A courier needs the **next turn in the world**, not a schematic. The map camera leans, the next stop stands above the others, and the door is on the correct side of the street. |
| **Physical motion**                | Springs and physics replace fixed durations, and the motion comes with a haptic. Google rebuilt Material's motion system as a "motion physics system" with expressive springs in May 2025, and paired the new springy animations with a haptic rumble (https://m3.material.io/styles/motion/overview/how-it-works, read 2026-10-22; https://blog.google/products/android/material-3-expressive-android-wearos-launch, read 2026-10-22 — blocked to our checker, readable in a browser). | Reanimated 4's `withSpring` is a physics engine first: `stiffness`, `damping`, `mass`, `velocity`, `overshootClamping`, `clamp`, and a duration-based form with `dampingRatio` (https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring/, read 2026-10-22).                                                                                                                | The sheet, the delivery confirmation and the voice bar move like objects with mass. Nothing teleports; nothing bounces for fun.                                                  |
| **Continuity**                     | An object is never destroyed and recreated; it changes. Apple's iOS 26 tab bar shrinks on scroll and expands on scroll up (https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/, read 2026-10-22).                                                                                                                                                                                                                                     | The same principle in an app: the stop stays the same stop from Today to the door sheet.                                                                                                                                                                                                                                                                                                         | The driver never re-learns where things are. The next stop is the same object at a different scale, not a new card.                                                              |
| **Material and depth**             | A layer of interface that reacts to the content under it: Apple's Liquid Glass is translucent, adapts between light and dark, and reacts to movement with specular highlights (https://www.apple.com/newsroom/2025/06/apple-elevates-the-iphone-experience-with-ios-26/, read 2026-10-22).                                                                                                                                                                                              | Our own rule is stricter: §13.2 bans glassmorphism.                                                                                                                                                                                                                                                                                                                                              | Depth comes from **real elevation and real occlusion** — the map's own buildings, a solid sheet with a shadow, a hairline rule — never from blur.                                |
| **Variable type**                  | One family that changes shape with its size. Material 3 Expressive replaced Roboto with **Roboto Flex** across its surfaces (https://developer.android.com/design/ui/wear/guides/get-started, read 2026-10-22).                                                                                                                                                                                                                                                                         | Google Fonts ships the axes: Fraunces `opsz 9–144` with `wght 100–900`; Bricolage Grotesque `opsz 12–96`, `wdth 75–100`, `wght 200–800`; Roboto Flex with thirteen axes (https://github.com/google/fonts, read 2026-10-22).                                                                                                                                                                      | A 64 pt number and a 17 pt line are the **same typeface at two optical sizes**, not the same file scaled.                                                                        |
| **Colour science**                 | Perceptual colour spaces and themes that adapt to the environment.                                                                                                                                                                                                                                                                                                                                                                                                                      | OKLCH is in CSS Color 4 (https://www.w3.org/TR/css-color-4/, read 2026-10-22). Apple's design "intelligently adapts between light and dark environments" (newsroom, 2025-06-09). Apple's Design Award 2026 winner **Tide Guide** has "an aqua-inspired palette [that] adapts to match the colour of the sky throughout the day" (https://apps.apple.com/us/story/id1896834601, read 2026-10-22). | The day palette is ours and fixed; the **night** palette is a derived, adapted set, not an inversion.                                                                            |
| **Capability without the costume** | The feature is shown as a state and a sentence, never as a magic wand.                                                                                                                                                                                                                                                                                                                                                                                                                  | The list of tells in the open-source skill **Impeccable** (https://github.com/pbakaus/impeccable, read 2026-10-22): "Inter for everything, purple-to-blue gradients, cards nested in cards, gray text on colored backgrounds, the rounded-square icon tile above every heading" — 61 deterministic detector rules for generated front-ends.                                                      | The voice companion is a bar that changes colour and says "listening" — not a robot head, not a sparkle.                                                                         |
| **Glanceable driving**             | A driving screen is a different discipline, with published rules.                                                                                                                                                                                                                                                                                                                                                                                                                       | Android for Cars: "Drivers can complete common tasks in three taps or less"; text "1-3 lines and 120 characters"; a single message "shouldn't exceed 120 characters or 24 words" on NHTSA and JAMA guidance (https://developer.android.com/design/ui/cars/guides/foundations/design-principles and .../writing-guidelines, read 2026-10-22).                                                     | Our 72 pt action and our 8-word voice replies are not house style; they are the published limit for a moving vehicle.                                                            |
| **Haptics**                        | A haptic is part of the state change, not a reward.                                                                                                                                                                                                                                                                                                                                                                                                                                     | Material 3 Expressive: dismissing a notification now "feels a satisfying haptic rumble" (Google blog, 2025-05-13). Our own `expo-haptics` 58.0.7 is already installed (read from `apps/mobile/package.json`, 2026-10-22); the API is documented at https://docs.expo.dev/versions/latest/sdk/haptics/ (read 2026-10-22).                                                                         | One haptic on confirm, one on delivered, one on error. Never on scroll, never on every tap.                                                                                      |
| **Sound**                          | Sound is a signal with an identity.                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `expo-audio` 58.0.9 is installed (read 2026-10-22); the API is at https://docs.expo.dev/versions/latest/sdk/audio/ (read 2026-10-22). Apple's awards repeatedly single out sound as part of the craft.                                                                                                                                                                                           | The voice bar has three earcons — listening, thinking, error — short, wooden, never musical. The app is fully usable in silence.                                                 |

### 1.2 Spatial and 3D interfaces

The 3D in 2026 is not decoration; it is **information that only 3D can carry**. Moonlitt uses a 3D
map to answer "can I see the moon from here tonight" — a line of sight is a geometric question.
A courier's equivalent question is "which side of the street is the door on" and "is the drop
behind the building or in the front".

The tooling is real and open:

- `CesiumGS/3d-tiles` — the 3D Tiles specification repository (2 625 stars, last commit
  2026-10-06; the API reports no licence file, so the repository's licence is **unverified**;
  the specification itself is published by Khronos).
- `visgl/loaders.gl` — the loaders for 3D Tiles and other formats (854 stars, v4.5.4 on
  2026-10-10, licence not detected by the API: **unverified**).
- `visgl/deck.gl` — the WebGL layer that draws large vector layers (14 694 stars, v9.4.0 on
  2026-09-05, MIT).
- `maplibre/maplibre-native` and `maplibre/maplibre-gl-js` — the renderer that already draws
  3D buildings from a style we own (see §5.4).

The rule for our directions: **3D is used for the map and the parcel, never for the chrome.**
A 3D sheet or a 3D button is a costume.

### 1.3 The motion language

Three things changed, and all three are measurable:

1. **Springs, not durations.** Reanimated 4's `withSpring` defaults are `damping 120`,
   `stiffness 900`, `mass 4`, `energyThreshold 6e-9` (physics form) or `duration 550` with
   `dampingRatio 1` (duration form, where 1 is critically damped and the real time is 1.5 times
   the perceptual duration). The two forms cannot be mixed (Reanimated docs, read 2026-10-22).
2. **Velocity is part of the motion.** A gesture that is thrown carries its velocity into the
   spring (`velocity` in the same config). This is what makes a sheet feel like the driver's own
   hand rather than an animation played at them.
3. **Clamping, so it never overshoots into nonsense.** `overshootClamping` and `clamp` are
   available; a delivery confirmation that overshoots is a small lie about what happened.

`reduceMotion` is a first-class parameter of the spring (`ReduceMotion.System` by default), so
"reduce motion" is not a separate animation set — it is the same motion with the bounce removed.

### 1.4 Material and depth

Apple's 2026 material is Liquid Glass: translucent, context-sensitive, with specular highlights
that react to movement, and it "adapts between light and dark environments" (Apple newsroom,
2025-06-09, read 2026-10-22). This is the single most recognisable visual change of the year, and
**§13.2 bans it for us**: no glassmorphism, no glow, no bloom.

What we take from it is the principle, not the effect:

- a control layer that is **distinct from the content layer** (Apple: controls "act as a distinct
  functional layer that sits above apps");
- **response**: an element that is pressed or moved shows that it moved;
- **adaptation**: the same identity holds in the day and at night.

How a courier app shows depth without glass:

| Depth cue      | How we use it                                                                            | What we refuse                                                                     |
| -------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Real occlusion | The map's own 3D buildings and the road ahead sit under the next-stop plate              | A fake drop shadow with no source                                                  |
| Elevation      | One solid sheet with a real shadow, three levels maximum (`SYSTEM.md` §2)                | Shadow stacks, blur, frosted panels                                                |
| Layering       | The address is on a solid surface, the map is a layer beneath it                         | Translucent surfaces over a moving map (unreadable in daylight, unlawful at night) |
| Light          | The night theme is low-blue and near-black; the day theme is a white that is _not_ cream | A dark theme with a glowing accent                                                 |

### 1.5 Typography

The measurable 2026 change is the variable font with an **optical size** axis. The Google Fonts
metadata read on 2026-10-22:

| Family              | Axes                                                                                                   | Source                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Fraunces            | `SOFT 0–100`, `WONK 0–1`, `opsz 9–144`, `wght 100–900`                                                 | https://github.com/google/fonts/blob/main/ofl/fraunces/METADATA.pb           |
| Bricolage Grotesque | `opsz 12–96`, `wdth 75–100`, `wght 200–800`                                                            | https://github.com/google/fonts/blob/main/ofl/bricolagegrotesque/METADATA.pb |
| Roboto Flex         | `GRAD`, `XOPQ`, `XTRA`, `YOPQ`, `YTAS`, `YTDE`, `YTFI`, `YTLC`, `YTUC`, `opsz`, `slnt`, `wdth`, `wght` | https://github.com/google/fonts/blob/main/ofl/robotoflex/METADATA.pb         |
| Instrument Sans     | `wdth 75–100`, `wght 400–700`                                                                          | https://github.com/google/fonts/blob/main/ofl/instrumentsans/METADATA.pb     |
| Space Grotesk       | `wght 300–700`                                                                                         | https://github.com/google/fonts/blob/main/ofl/spacegrotesk/METADATA.pb       |

What this means for us:

1. **One family, two optical sizes.** A 64 pt stops-left number and a 17 pt line are the same
   typeface, optically compensated. A static font scaled to 64 pt is the "2020 app" look.
2. **Width is a tool, not a gimmick.** A condensed cut for the address on one line is a real
   courier need; a wide cut is decoration.
3. **Tabular figures for every number that changes** (stops left, distance, money, clock) so the
   layout never moves under the driver's eye.
4. **Pairing rule**: one display family for the number and the address, one work family for
   everything else. Never two display faces, never three families.
5. **Ligatures and old-style figures off** for addresses and numbers — "1,2" must not become "12".

### 1.6 Colour science

- **OKLCH** (CSS Color 4) is the space to design in: perceptual lightness, so "the same
  lightness" means the same lightness, and a hue rotation does not change the contrast
  (https://www.w3.org/TR/css-color-4/, read 2026-10-22). The open-source tooling to do it is
  small and good: `color-js/color.js` (MIT, 2 313 stars, v0.7.1 on 2026-07-24),
  `Evercoder/culori` (MIT, 1 241 stars, v4.0.2 on 2025-06-27), `gka/chroma.js` (10 605 stars,
  v3.2.0 on 2025-11-28, the API reports no licence file: **unverified**),
  `bgrins/TinyColor` (MIT, 5 253 stars, last commit 2024-06-26 — stable but quiet).
- **Adaptive themes** are now the norm: Apple's Liquid Glass adapts between light and dark;
  Tide Guide's palette follows the colour of the sky (Apple Design Awards 2026 story, read
  2026-10-22). Our rule (§13.3) is stricter and stays: **the day theme is the identity** and the
  night theme is an adapted option that switches at sunset.
- **Dynamic colour from the wallpaper is refused.** Material You's wallpaper palette is the most
  recognisable generated-app look of 2026, and it takes the brand away from the product.
  The one thing we take from it is the _idea of a second accent with a job_ — our
  `brandSecondary` is the map-and-system colour, never a second opinion about the brand.
- **Contrast is measured, not eyeballed.** Every palette in §5.2 was measured with
  `packages/design-tokens/src/contrast.ts`, the same code the build gate uses.

### 1.7 Capability without the costume

The open-source **Impeccable** skill (Apache-2.0, 84 467 stars, cli-v4.7.0 on 2026-10-19,
https://github.com/pbakaus/impeccable, read 2026-10-22) exists to detect exactly the look the
founder rejected: "Inter for everything, purple-to-blue gradients, cards nested in cards, gray
text on colored backgrounds, the rounded-square icon tile above every heading". It ships 61
deterministic detector rules that run with no model and no API key.

Our rule for capability surfaces: **the feature is a state and a sentence.**

| Do not                                            | Do                                                                       |
| ------------------------------------------------- | ------------------------------------------------------------------------ |
| A sparkle icon on the voice bar                   | A labelled bar: "listening", "thinking", "offline" — the state in a word |
| A chat bubble with a robot avatar                 | The transcript as a plain log, the same type as everything else          |
| A "Ask anything" hero field                       | "Ask about the run" — the placeholder says what the answer is            |
| A gradient button labelled "Generate"             | A button labelled "Correct this address"                                 |
| A progress bar that means "the model is thinking" | The word "checking" and a time that is honest                            |

### 1.8 Glanceable driving

Android for Cars publishes the rules we need and they are stricter than most apps assume
(https://developer.android.com/design/ui/cars/guides/foundations/design-principles, read 2026-10-22):

- "Driving is the top priority"; only apps that can be used while driving are available.
- "Drivers can complete common tasks in three taps or less."
- "Text shown while driving is kept to 1-3 lines and 120 characters to be glanceable."
- A single message "shouldn't exceed 120 characters or 24 words" (NHTSA and JAMA guidance,
  https://developer.android.com/design/ui/cars/guides/foundations/writing-guidelines).
- The platform can _block_ an activity that is not marked distraction-optimised
  (https://source.android.google.cn/docs/automotive/driver_distraction/guidelines, read 2026-10-22).

We are not a car app, but the driver is in a moving van with the same limits. Our house rules
already match: one primary action of 72 pt, every other target 56 pt or more, body text never
below 17 pt, voice replies of at most 8 words while driving (`SYSTEM.md` §3, §8).

The 2026 addition is the **restriction state**: the app knows whether the van is moving and
_changes_ what it offers — the night theme at sunset, the short answers while moving, the
one-line question instead of a sheet.

### 1.9 Haptics

- Our platform module is already in the app: `expo-haptics` 58.0.7 (read from
  `apps/mobile/package.json`, 2026-10-22); the API is documented at
  https://docs.expo.dev/versions/latest/sdk/haptics/ (read 2026-10-22).
- The library `mkuczera/react-native-haptic-feedback` (MIT, 985 stars, v3.0.0 on 2026-03-29,
  last commit 2026-05-02) exists for the cases Expo does not cover.
- The 2026 expectation is that a haptic belongs to the **motion**, not to the reward. Material 3
  Expressive pairs its new springy animations with a haptic rumble (Google blog, 2025-05-13).

Our rule (`SYSTEM.md` §5): haptics on confirm, deliver and error; **never on scroll**; one
haptic per state change, never two. The same set has to be meaningful with the phone in a pocket
and the screen facing away — so a haptic is allowed to be the _only_ signal.

### 1.10 Sound

`expo-audio` 58.0.9 is installed (read 2026-10-22; docs at
https://docs.expo.dev/versions/latest/sdk/audio/, read 2026-10-22).

The rule: **three earcons, no music.**

| Sound      | When                               | Character                           |
| ---------- | ---------------------------------- | ----------------------------------- |
| Listening  | The voice bar opens                | one short wood-block tick           |
| Understood | The transcript is accepted         | two ticks, the second lower         |
| Problem    | Permission refused, offline, error | one dull thud, lower than the ticks |

The app is fully usable with the phone silent, in a van with the window down, with a noisy radio.
No chime ever marks a delivery; a delivery is a fact, not a celebration.

---

## 2. The repository pool

**124 repositories were read on 2026-10-22** (`github-repos-research2-2026-10-22.tsv`); the 122
that matter for the ten directions are listed here. "Maintenance" is the V4 §12.3 proxy: the last
commit, the last release and its date. The **fit** column is a judgement from the library's own
install notes and from our lockfile; only the rows marked **in our app** are proven by a version
that is installed today (`apps/mobile/package.json`, read 2026-10-22: Expo 58.0.14, RN 0.88.0,
React 19.3.0, Reanimated 4.7.1, gesture-handler 3.3.0, screens 4.30.0, unistyles 3.5.3,
maplibre-react-native 11.3.7, expo-haptics 58.0.7, expo-audio 58.0.9).

### 2.1 React Native design systems and UI kits

| Repository                                                                                                        | Stars  | Last release                              | Licence                               | Maintenance                            | Fit              | What is worth taking                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------- | ------------------------------------- | -------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [callstack/react-native-paper](https://github.com/callstack/react-native-paper)                                   | 14 477 | v5.15.3, 2026-05-26                       | MIT                                   | last commit 2026-10-21, 168 releases   | JS only          | Read the accessible modal and the portal work (Sept 2026). Do not install: Material 3 is the look we refuse.                     |
| [akveo/react-native-ui-kitten](https://github.com/akveo/react-native-ui-kitten)                                   | 10 662 | @ui-kitten/eva-icons@6.2.1, 2026-10-06    | MIT                                   | last commit 2026-10-06                 | JS only          | Its `Eva` icon set is a coherent alternative to Material Symbols if a direction needs a rounder language.                        |
| [wix/react-native-ui-lib](https://github.com/wix/react-native-ui-lib)                                             | 7 156  | 9.1.0, 2026-06-28                         | MIT                                   | last commit 2026-10-17                 | JS only          | Its spacing and radius scales are a good template for a token file.                                                              |
| [heroui-inc/heroui-native](https://github.com/heroui-inc/heroui-native)                                           | 3 695  | v1.0.11, 2026-10-20                       | Apache-2.0                            | last commit 2026-10-20, 42 releases    | JS only          | **The warning sign**: it lists `expo-blur` as a peer dependency — the glass look is a dependency. Read it to see what we refuse. |
| [gluestack-ui/gluestack-ui](https://github.com/gluestack/gluestack-ui)                                            | 5 327  | v5.0.0, 2026-06-25                        | licence not detected — **unverified** | last commit 2026-09-02                 | JS only          | The rounded card as the default surface — the exact shape §13.2 bans. A useful counter-example.                                  |
| [tamagui/tamagui](https://github.com/tamagui/tamagui)                                                             | 14 269 | v3.1.2, 2026-10-21                        | MIT                                   | last commit 2026-10-21, 1 000 releases | JS only          | Its token-first architecture and its "one style, many outputs" idea are worth reading.                                           |
| [founded-labs/react-native-reusables](https://github.com/founded-labs/react-native-reusables)                     | 8 699  | rn-primitives@1.4.0, 2026-03-28           | MIT                                   | last commit 2026-09-27                 | JS only          | Reduced-motion and portal accessibility added to 22 components (2026-07-02) — the accessibility pattern to copy.                 |
| [GeekyAnts/NativeBase](https://github.com/GeekyAnts/NativeBase)                                                   | 20 366 | v3.4.28, 2023-03-06                       | MIT                                   | last commit 2026-01-31                 | JS only          | Its theme file is a plain object of semantic tokens — the same idea as our `packages/design-tokens`.                             |
| [react-native-elements/react-native-elements](https://github.com/react-native-elements/react-native-elements)     | 25 869 | v5.0.0, 2026-01-19                        | MIT                                   | last commit 2026-05-21                 | JS only          | Its `Avatar`/`Badge` sizing rules; nothing else.                                                                                 |
| [kirillzyusko/react-native-keyboard-controller](https://github.com/kirillzyusko/react-native-keyboard-controller) | 3 749  | 1.22.8, 2026-10-19                        | MIT                                   | last commit 2026-10-21                 | native module    | The keyboard behaviour on the dictation and scanner forms — the one screen where the keyboard is a real problem.                 |
| [callstack/react-native-bottom-tabs](https://github.com/callstack/react-native-bottom-tabs)                       | 1 466  | 1.5.0, 2026-10-21                         | MIT                                   | last commit 2026-10-21                 | native module    | Its native tab bar, if a direction ever wants a bottom bar that is not a floating pill.                                          |
| [react-navigation/react-navigation](https://github.com/react-navigation/react-navigation)                         | 24 509 | @react-navigation/core@7.24.0, 2026-10-13 | licence not detected — **unverified** | last commit 2026-10-21                 | JS + native peer | The only navigation layer in the pool that is genuinely maintained in 2026.                                                      |
| [software-mansion/react-native-screens](https://github.com/software-mansion/react-native-screens)                 | 3 740  | 4.30.0, 2026-10-13                        | MIT                                   | last commit 2026-10-21                 | **in our app**   | Already installed (4.30.0). The base of any sheet and shared-element work.                                                       |
| [Shopify/flash-list](https://github.com/Shopify/flash-list)                                                       | 7 242  | v2.3.3, 2026-10-01                        | MIT                                   | last commit 2026-10-01                 | JS only          | The list engine for 300+ stops without a frame drop.                                                                             |

### 2.2 Styling, tokens and colour

| Repository                                                                                | Stars  | Last release        | Licence                               | Maintenance            | Fit                    | What is worth taking                                                                                                             |
| ----------------------------------------------------------------------------------------- | ------ | ------------------- | ------------------------------------- | ---------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [jpudysz/react-native-unistyles](https://github.com/jpudysz/react-native-unistyles)       | 2 970  | v3.6.0, 2026-10-21  | licence not detected — **unverified** | last commit 2026-10-21 | **in our app** (3.5.3) | A theme is a plain TypeScript object. Our token package is the same idea.                                                        |
| [nativewind/nativewind](https://github.com/nativewind/nativewind)                         | 8 117  | 4.2.7, 2026-09-14   | MIT                                   | last commit 2026-10-16 | JS + Metro transform   | The utility-class route. We are not taking it: the class names become a second style language.                                   |
| [uni-stack/uniwind](https://github.com/uni-stack/uniwind)                                 | 1 738  | v1.13.0, 2026-10-19 | MIT                                   | last commit 2026-10-20 | JS + Metro transform   | The credible NativeWind replacement — the reference if a team insists on Tailwind in RN.                                         |
| [Shopify/restyle](https://github.com/Shopify/restyle)                                     | 3 426  | v2.4.5, 2025-03-19  | MIT                                   | last commit 2026-09-29 | JS only                | The theme-as-object pattern, and its "create a variant, do not branch" rule.                                                     |
| [style-dictionary/style-dictionary](https://github.com/style-dictionary/style-dictionary) | 4 868  | v5.7.0, 2026-10-16  | Apache-2.0                            | last commit 2026-10-20 | build-time tool        | The token pipeline: one JSON source, many outputs (TypeScript, CSS, native). The honest way to get ten palettes from one source. |
| [tokens-studio/figma-plugin](https://github.com/tokens-studio/figma-plugin)               | 1 626  | 2.13.0, 2026-10-06  | MIT                                   | last commit 2026-10-21 | design tool            | The Figma end of a token pipeline, if the design team wants to draw with the same names the app uses.                            |
| [tokens-studio/sd-transforms](https://github.com/tokens-studio/sd-transforms)             | 251    | v2.0.3, 2025-12-10  | MIT                                   | last commit 2025-12-10 | build-time tool        | The bridge between Figma tokens and Style Dictionary.                                                                            |
| [color-js/color.js](https://github.com/color-js/color.js)                                 | 2 313  | v0.7.1, 2026-07-24  | MIT                                   | last commit 2026-10-19 | JS only                | The OKLCH/OKLab reference implementation. Use it to generate the ramps in §5.2 rather than eyeballing hexes.                     |
| [Evercoder/culori](https://github.com/Evercoder/culori)                                   | 1 241  | v4.0.2, 2025-06-27  | MIT                                   | last commit 2026-10-15 | JS only                | A smaller, faster colour library for the app's own tint and blend maths.                                                         |
| [gka/chroma.js](https://github.com/gka/chroma.js)                                         | 10 605 | v3.2.0, 2025-11-28  | licence not detected — **unverified** | last commit 2026-09-14 | JS only                | Mature scale helpers. Licence unverified in the API — read the repository before shipping it.                                    |
| [bgrins/TinyColor](https://github.com/bgrins/TinyColor)                                   | 5 253  | 1.0.0, 2014-07-06   | MIT                                   | last commit 2024-06-26 | JS only                | Stable but quiet since 2024. Fine for internal tooling; not a dependency.                                                        |
| [radix-ui/colors](https://github.com/radix-ui/colors)                                     | 1 715  | no release          | MIT                                   | last commit 2025-12-17 | JS only                | Twelve-step scales that already pass contrast at each step — a good yardstick for our ramps.                                     |
| [wcandillon/react-native-redash](https://github.com/wcandillon/react-native-redash)       | 2 060  | v18.1.5, 2026-01-21 | MIT                                   | last commit 2026-08-04 | JS only                | Its `clamp`, `opacity` and `fontSize` helpers are the maths of responsive type.                                                  |

### 2.3 Motion, animation, gestures, sheets and sound

| Repository                                                                                                            | Stars  | Last release                           | Licence                               | Maintenance                          | Fit                      | What is worth taking                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------- | ------------------------------------- | ------------------------------------ | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [software-mansion/react-native-reanimated](https://github.com/software-mansion/react-native-reanimated)               | 11 032 | 4.7.1, 2026-10-02                      | MIT                                   | last commit 2026-10-21, 229 releases | **in our app**           | The engine of every motion in the app: worklets on the UI thread, springs, `reduceMotion`, layout animations.                                                                           |
| [wcandillon/react-native-skia](https://github.com/wcandillon/react-native-skia)                                       | 8 744  | v3.7.2, 2026-10-20                     | MIT                                   | last commit 2026-10-21               | native module            | A real 2D/3D renderer for the map overlays, the parcel and the signature moment. **Its blur and bloom are also the tools that make the look we refuse** — a decision, not a dependency. |
| [rive-app/rive-react-native](https://github.com/rive-app/rive-react-native)                                           | 787    | v9.8.6, 2026-10-15                     | MIT                                   | last commit 2026-10-15               | native module            | State machines that a designer can author without code — the right tool for one signature moment.                                                                                       |
| [lottie-react-native/lottie-react-native](https://github.com/lottie-react-native/lottie-react-native)                 | 17 210 | v7.5.0, 2026-08-22                     | Apache-2.0                            | last commit 2026-10-20               | native module            | Healthy, and barred by our own rule on decorative motion. Recorded, not adopted.                                                                                                        |
| [nandorojo/moti](https://github.com/nandorojo/moti)                                                                   | 4 553  | v0.30.0, 2025-01-29                    | MIT                                   | last commit 2025-03-11               | JS only                  | The declarative spring API. Its last commit is 19 months old: read it, do not depend on it.                                                                                             |
| [software-mansion/react-native-gesture-handler](https://github.com/software-mansion/react-native-gesture-handler)     | 6 793  | v3.4.0, 2026-10-16                     | MIT                                   | last commit 2026-10-21               | **in our app** (3.3.0)   | The swipe that marks a stop delivered, and the velocity it hands to the spring.                                                                                                         |
| [LegendApp/legend-motion](https://github.com/LegendApp/legend-motion)                                                 | 450    | v2.5.3, 2025-10-17                     | MIT                                   | last commit 2026-10-11               | JS only                  | A small, readable motion vocabulary to copy into our own `apps/mobile/src/motion/`.                                                                                                     |
| [motiondivision/motion](https://github.com/motiondivision/motion)                                                     | 34 420 | no release tag                         | MIT                                   | last commit 2026-10-21               | **web**                  | The web's spring vocabulary. A reference for values, not a dependency.                                                                                                                  |
| [appandflow/react-native-ease](https://github.com/appandflow/react-native-ease)                                       | 989    | v0.9.0, 2026-10-15                     | MIT                                   | last commit 2026-10-16               | native module            | Native animations driven from Core Animation and the Android Animator, off the JS thread. The maintainer we already depend on.                                                          |
| [Glazzes/react-native-zoom-toolkit](https://github.com/Glazzes/react-native-zoom-toolkit)                             | 402    | 5.1.1, 2026-08-30                      | MIT                                   | last commit 2026-08-30               | JS only                  | Pinch and pan that does not fight the map's own gestures.                                                                                                                               |
| [SchroederNathan/react-native-motion](https://github.com/SchroederNathan/react-native-motion)                         | 205    | no release tag                         | licence not detected — **unverified** | last commit 2026-10-19               | JS only                  | A very small wrapper around Reanimated 4. New; watch it.                                                                                                                                |
| [Rednegniw/number-flow-react-native](https://github.com/Rednegniw/number-flow-react-native)                           | 424    | 0.5.1, 2026-08-19                      | MIT                                   | last commit 2026-08-20               | JS only                  | The rolling number for "stops left" and the earnings. Not measured by our bench yet.                                                                                                    |
| [entropyconquers/react-native-reanimated-dnd](https://github.com/entropyconquers/react-native-reanimated-dnd)         | 1 073  | v2.0.0, 2026-03-16                     | MIT                                   | last commit 2026-07-30               | JS + native peer         | Drag to reorder a stop list, with the spring physics of the reorder itself.                                                                                                             |
| [dohooo/react-native-reanimated-carousel](https://github.com/dohooo/react-native-reanimated-carousel)                 | 3 434  | v5.2.0, 2026-10-14                     | MIT                                   | last commit 2026-10-15               | JS only                  | The layout-animation patterns for the horizontal stop strip.                                                                                                                            |
| [software-mansion/react-native-svg](https://github.com/software-mansion/react-native-svg)                             | 8 009  | v15.16.0, 2026-10-15                   | MIT                                   | last commit 2026-10-15               | native module            | Vector drawing for the icon system, the map overlays and the signature moment.                                                                                                          |
| [mkuczera/react-native-haptic-feedback](https://github.com/mkuczera/react-native-haptic-feedback)                     | 985    | v3.0.0, 2026-03-29                     | MIT                                   | last commit 2026-05-02               | native module            | The haptics `expo-haptics` does not cover.                                                                                                                                              |
| [Tonejs/Tone.js](https://github.com/Tonejs/Tone.js)                                                                   | 14 785 | 15.1.22, 2026-07-12                    | MIT                                   | last commit 2026-10-21               | **web/audio**            | The reference for the earcon design: short, wooden, three notes.                                                                                                                        |
| [gorhom/react-native-bottom-sheet](https://github.com/gorhom/react-native-bottom-sheet)                               | 9 109  | v5.2.14, 2026-05-09                    | MIT                                   | last commit 2026-05-09               | native module            | The sheet every app has. Its gesture handling is the pattern to copy.                                                                                                                   |
| [software-mansion-labs/react-native-bottom-sheet](https://github.com/software-mansion-labs/react-native-bottom-sheet) | 448    | v0.17.0, 2026-10-18                    | MIT                                   | last commit 2026-10-21               | native module            | A Fabric sheet whose geometry is computed in C++ with a critically damped spring on both platforms — the sheet whose physics match our rule by construction.                            |
| [lodev09/react-native-true-sheet](https://github.com/lodev09/react-native-true-sheet)                                 | 2 080  | v3.11.18, 2026-10-02                   | MIT                                   | last commit 2026-10-21               | native module            | A native sheet with real scroll and gesture behaviour; the Android answer.                                                                                                              |
| [omahili/react-native-reorderable-list](https://github.com/omahili/react-native-reorderable-list)                     | 325    | v0.18.2, 2026-10-18                    | MIT                                   | last commit 2026-10-18               | JS + native peer         | The small, honest way to let a driver reorder a run by hand.                                                                                                                            |
| [expo/expo](https://github.com/expo/expo)                                                                             | 52 922 | expo-template-tabs@58.0.26, 2026-10-21 | MIT                                   | last commit 2026-10-21, 751 releases | **in our app** (58.0.14) | `expo-haptics`, `expo-audio`, `expo-linear-gradient` (barred), `expo-blur` (barred), `expo-three` for the 3D pass.                                                                      |

### 2.4 3D, spatial and platform graphics

| Repository                                                              | Stars   | Last release       | Licence                               | Maintenance            | Fit        | What is worth taking                                                                                                                                            |
| ----------------------------------------------------------------------- | ------- | ------------------ | ------------------------------------- | ---------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [pmndrs/react-three-fiber](https://github.com/pmndrs/react-three-fiber) | 33 147  | v9.8.2, 2026-10-15 | MIT                                   | last commit 2026-10-21 | **web**    | The declarative 3D model. A reference for the parcel and the route ribbon; not an RN dependency.                                                                |
| [mrdoob/three.js](https://github.com/mrdoob/three.js)                   | 116 743 | r186, 2026-09-24   | MIT                                   | last commit 2026-10-22 | **web**    | The renderer behind any 3D pass; the maths of the camera and the lights is what a Skia pass borrows.                                                            |
| [CesiumGS/3d-tiles](https://github.com/CesiumGS/3d-tiles)               | 2 625   | 1.1, 2023-06-05    | licence not detected — **unverified** | last commit 2026-10-06 | data/spec  | The 3D Tiles specification: the format for buildings and city models. The licence of this repository is unverified; the specification is a Khronos publication. |
| [CesiumGS/cesium](https://github.com/CesiumGS/cesium)                   | 15 863  | 1.146, 2026-10-01  | Apache-2.0                            | last commit 2026-10-21 | **web**    | The globe and 3D Tiles renderer. A reference; far too heavy for a phone.                                                                                        |
| [visgl/loaders.gl](https://github.com/visgl/loaders.gl)                 | 854     | v4.5.4, 2026-10-10 | licence not detected — **unverified** | last commit 2026-10-21 | **web**    | The loaders for 3D Tiles and other formats.                                                                                                                     |
| [visgl/deck.gl](https://github.com/visgl/deck.gl)                       | 14 694  | v9.4.0, 2026-09-05 | MIT                                   | last commit 2026-10-22 | **web**    | How to draw tens of thousands of features at 60 fps. The idea to port to the native map layer.                                                                  |
| [google/model-viewer](https://github.com/google/model-viewer)           | 8 286   | v4.4.0, 2026-10-09 | Apache-2.0                            | last commit 2026-10-09 | **web/AR** | The AR-on-the-web pattern: a parcel preview in the doorway. A reference, not a dependency.                                                                      |

### 2.5 Maps, tiles and map styles

| Repository                                                                                      | Stars  | Last release                | Licence                                                                           | Maintenance            | Fit                     | What is worth taking                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------- | ------ | --------------------------- | --------------------------------------------------------------------------------- | ---------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [maplibre/maplibre-react-native](https://github.com/maplibre/maplibre-react-native)             | 670    | v11.5.0, 2026-10-04         | MIT                                                                               | last commit 2026-10-21 | **in our app** (11.3.7) | The map component. Every direction draws in this.                                                                                                                                                                                                |
| [maplibre/maplibre-gl-js](https://github.com/maplibre/maplibre-gl-js)                           | 11 912 | v6.15.0, 2026-10-18         | licence not detected — **unverified**                                             | last commit 2026-10-21 | **web**                 | The style spec and the renderer we mirror on the phone.                                                                                                                                                                                          |
| [maplibre/maplibre-native](https://github.com/maplibre/maplibre-native)                         | 2 276  | android-v13.7.1, 2026-10-15 | BSD-2-Clause                                                                      | last commit 2026-10-22 | native module           | The Android renderer with 3D buildings and the camera we need for a pitched view.                                                                                                                                                                |
| [maplibre/maplibre-style-spec](https://github.com/maplibre/maplibre-style-spec)                 | 262    | v26.4.4, 2026-09-15         | licence not detected — **unverified**                                             | last commit 2026-10-19 | spec                    | **The map is a document we own.** This is the file a direction team edits.                                                                                                                                                                       |
| [maplibre/maputnik](https://github.com/maplibre/maputnik)                                       | 2 659  | v3.1.0, 2026-07-06          | MIT                                                                               | last commit 2026-10-21 | design tool             | The style editor. Every direction should ship a style JSON, not a screenshot.                                                                                                                                                                    |
| [maplibre/demotiles](https://github.com/maplibre/demotiles)                                     | 134    | v1.0, 2021-05-14            | BSD-3-Clause (licence file read 2026-10-22)                                       | last commit 2026-08-21 | data                    | The sample tiles and the reference styles (world, OSM Bright, terrain) used by the tests.                                                                                                                                                        |
| [maplibre/awesome-maplibre](https://github.com/maplibre/awesome-maplibre)                       | 1 097  | no release                  | BSD-3-Clause                                                                      | last commit 2026-10-21 | list                    | The index of every free map tool; the fastest way to find the tile builder we do not have yet.                                                                                                                                                   |
| [protomaps/basemaps](https://github.com/protomaps/basemaps)                                     | 764    | no release tag              | code BSD-3-Clause; **the visual design of the styles is CC0**                     | last commit 2026-09-11 | style                   | **The reference style of the ten directions.** The code is BSD-3-Clause and the visual design is released under **CC0** (https://github.com/protomaps/basemaps/blob/main/LICENSE.md, read 2026-10-22) — so we may copy the look and say nothing. |
| [protomaps/PMTiles](https://github.com/protomaps/PMTiles)                                       | 3 094  | no release tag              | licence not detected — **unverified**                                             | last commit 2026-09-16 | format                  | The single-file tile archive that makes an offline Canterbury pack possible.                                                                                                                                                                     |
| [openmaptiles/openmaptiles](https://github.com/openmaptiles/openmaptiles)                       | 3 200  | v3.16, 2025-12-18           | code BSD-3-Clause (licence file read 2026-10-22)                                  | last commit 2026-07-29 | schema + styles         | The schema (the OpenMapTiles styles) and the tile build we can fork.                                                                                                                                                                             |
| [openmaptiles/maptiler-basic-gl-style](https://github.com/openmaptiles/maptiler-basic-gl-style) | 118    | v1.10, 2024-05-06           | code BSD-3-Clause, derived from Mapbox Open Styles (licence file read 2026-10-22) | last commit 2026-06-02 | style                   | The cleanest "basic" style to learn from. The **data** it draws is still ODbL.                                                                                                                                                                   |
| [maptiler/tileserver-gl](https://github.com/maptiler/tileserver-gl)                             | 2 911  | v5.6.0, 2026-04-06          | licence not detected — **unverified**                                             | last commit 2026-10-13 | server                  | A tile server for a study; not for the app (our pack is a file).                                                                                                                                                                                 |
| [mapbox/mapbox-gl-js](https://github.com/mapbox/mapbox-gl-js)                                   | 12 449 | v3.33.0, 2026-10-13         | proprietary — the API reports `NOASSERTION`                                       | last commit 2026-10-21 | reference               | The style language everyone copies. Its current styles are **not** free to copy; the old open ones are BSD.                                                                                                                                      |
| [tyrasd/overpass-turbo](https://github.com/tyrasd/overpass-turbo)                               | 1 259  | no release tag              | licence not detected — **unverified**                                             | last commit 2026-10-20 | **web**                 | The query tool for OSM; how a direction checks whether a road or a gate exists.                                                                                                                                                                  |

### 2.6 Icons, illustration and SVG

| Repository                                                                                | Stars  | Last release                                 | Licence                               | Maintenance                          | Fit                                          | What is worth taking                                                                                                   |
| ----------------------------------------------------------------------------------------- | ------ | -------------------------------------------- | ------------------------------------- | ------------------------------------ | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| [google/material-design-icons](https://github.com/google/material-design-icons)           | 54 140 | 4.0.0, 2020-08-31                            | Apache-2.0                            | last commit 2026-10-09               | **in our app** (`@expo/vector-icons` 15.1.1) | Material Symbols, weight 500 — our one icon set (`SYSTEM.md` §7).                                                      |
| [oblador/react-native-vector-icons](https://github.com/oblador/react-native-vector-icons) | 17 918 | generator@14.0.0, 2026-10-19                 | MIT                                   | last commit 2026-10-19               | native module                                | The generator that turns an icon font into a native font; how a direction's custom set is built.                       |
| [lucide-icons/lucide](https://github.com/lucide-icons/lucide)                             | 25 196 | 1.61.0, 2026-10-21                           | licence not detected — **unverified** | last commit 2026-10-21               | SVG                                          | The most credible alternative set: consistent 2 px strokes on a 24 grid. Read the licence file before shipping.        |
| [tabler/tabler-icons](https://github.com/tabler/tabler-icons)                             | 22 407 | v3.49.0, 2026-10-05                          | MIT                                   | last commit 2026-10-21               | SVG                                          | Its stroke discipline (2 px, round caps) is the rule we would write into an icon spec.                                 |
| [phosphor-icons/core](https://github.com/phosphor-icons/core)                             | 393    | v2.0.8, 2024-02-01                           | MIT                                   | last commit 2026-01-06               | SVG                                          | Six weights in one family — the only set in the pool with a real weight range for a driving screen.                    |
| [phosphor-icons/react-native](https://github.com/phosphor-icons/react-native)             | 7      | no release                                   | MIT                                   | last commit 2023-05-14               | binding                                      | The RN binding is thin and young; the `core` package is the real source.                                               |
| [lobehub/lobe-icons](https://github.com/lobehub/lobe-icons)                               | 2 622  | @lobehub/icons-static-webp@2.1.0, 2026-10-21 | MIT                                   | last commit 2026-10-21               | SVG                                          | A working example of an icon pipeline that stays consistent at 7 000 marks.                                            |
| [gregberge/svgr](https://github.com/gregberge/svgr)                                       | 11 058 | v8.1.0, 2023-08-15                           | MIT                                   | last commit 2026-03-01               | build tool                                   | Turns SVG into React components; how a custom mark is kept in the codebase.                                            |
| [bytedance/IconPark](https://github.com/bytedance/IconPark)                               | 9 039  | v1.3.0, 2021-02-15                           | Apache-2.0                            | **archived**, last commit 2023-02-24 | SVG                                          | Read only. It is the example of an icon set that dies with its maintainer.                                             |
| [dicebear/dicebear](https://github.com/dicebear/dicebear)                                 | 9 911  | v10.7.0, 2026-08-26                          | MIT                                   | last commit 2026-10-21               | **web**                                      | Generated avatars. A courier's avatar is a photo, not a dicebear — reference only.                                     |
| [readpage/undraw-ui](https://github.com/readpage/undraw-ui)                               | 985    | no release tag                               | MIT                                   | last commit 2026-05-15               | SVG                                          | The unDraw illustration set in React. **Stock illustration is on the banned list** — this is where the ban comes from. |

### 2.7 Charts and data display

| Repository                                                                                                          | Stars   | Last release                      | Licence                               | Maintenance                          | Fit         | What is worth taking                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------- | ------- | --------------------------------- | ------------------------------------- | ------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| [recharts/recharts](https://github.com/recharts/recharts)                                                           | 27 647  | v3.10.1, 2026-07-25               | MIT                                   | last commit 2026-10-21               | **web**     | The chart language of the end-of-day screen.                                                                             |
| [d3/d3](https://github.com/d3/d3)                                                                                   | 113 789 | v7.9.0, 2024-03-12                | ISC                                   | last commit 2026-10-21               | **web**     | The scale maths; a "spent 40 minutes in the rain" chart is worth drawing properly.                                       |
| [airbnb/visx](https://github.com/airbnb/visx)                                                                       | 21 082  | v4.0.0, 2026-06-11                | MIT                                   | last commit 2026-06-22               | **web**     | Composable chart primitives.                                                                                             |
| [FormidableLabs/victory-native-xl](https://github.com/FormidableLabs/victory-native-xl)                             | 1 234   | victory-native@43.0.1, 2026-10-20 | licence not detected — **unverified** | last commit 2026-10-20               | native peer | The one chart library that draws with Skia on the device — the right engine for a 60 fps chart on the end-of-day screen. |
| [FormidableLabs/victory-native](https://github.com/FormidableLabs/victory-native)                                   | 1 988   | no release tag                    | MIT                                   | **archived**, last commit 2024-08-15 | native peer | The predecessor. Do not start here.                                                                                      |
| [FormidableLabs/victory](https://github.com/FormidableLabs/victory)                                                 | 11 240  | v37.3.6, 2025-01-14               | licence not detected — **unverified** | last commit 2025-12-19               | **web**     | The chart grammar (Victory's "Vegas" grid) — a reference, not a dependency.                                              |
| [Abhinandan-Kushwaha/react-native-gifted-charts](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts) | 1 376   | v1.4.81, 2026-10-05               | MIT                                   | last commit 2026-10-05               | JS + SVG    | The most used RN chart set. Fine for a small sparkline; not for the earnings screen.                                     |
| [tremorlabs/tremor](https://github.com/tremorlabs/tremor)                                                           | 3 676   | no release tag                    | Apache-2.0                            | last commit 2025-10-10               | **web**     | The dashboard density that a courier app must never reach — the boundary, not the target.                                |

### 2.8 Accessibility tooling

| Repository                                                                                                          | Stars | Last release           | Licence                               | Maintenance            | Fit     | What is worth taking                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------- | ----- | ---------------------- | ------------------------------------- | ---------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [dequelabs/axe-core](https://github.com/dequelabs/axe-core)                                                         | 7 682 | v4.14.0, 2026-10-05    | MPL-2.0                               | last commit 2026-10-21 | **web** | The rules engine behind every automated accessibility check we run. MPL-2.0 is fine: it is a dev dependency, never in the APK.    |
| [IBMa/equal-access](https://github.com/IBMa/equal-access)                                                           | 786   | 4.0.34, 2026-09-08     | Apache-2.0                            | last commit 2026-10-16 | **web** | A second opinion on contrast, focus order and dynamic type — run it over the web dispatcher too.                                  |
| [microsoft/accessibility-insights-web](https://github.com/microsoft/accessibility-insights-web)                     | 958   | web@2.49.0, 2026-09-08 | MIT                                   | last commit 2026-10-19 | **web** | The FastPass check; the fastest way to see what a driver with low vision or a screen reader actually gets.                        |
| [ArturKalach/react-native-a11y](https://github.com/ArturKalach/react-native-a11y)                                   | 57    | v0.9.1, 2026-10-04     | MIT                                   | last commit 2026-10-04 | JS only | React Native's own accessibility props, explained per component. Read it; the API is thin.                                        |
| [ArturKalach/react-native-a11y-order](https://github.com/ArturKalach/react-native-a11y-order)                       | 52    | v2.0.1, 2026-10-05     | MIT                                   | last commit 2026-10-04 | JS only | The reading-order rules for a screen reader: how our focus order must be built.                                                   |
| [FormidableLabs/eslint-plugin-react-native-a11y](https://github.com/FormidableLabs/eslint-plugin-react-native-a11y) | 307   | v3.5.1, 2024-11-04     | MIT                                   | last commit 2024-11-04 | lint    | The lint rules for missing labels and roles. Quiet since 2024, so use it as a second lint, not the only one.                      |
| [w3c/wcag](https://github.com/w3c/wcag)                                                                             | 1 510 | no release tag         | licence not detected — **unverified** | last commit 2026-10-21 | spec    | The source of the success criteria quoted in §4 and §5. The published spec is at https://www.w3.org/TR/WCAG22/ (read 2026-10-22). |

### 2.9 Typography and font pipelines

| Repository                                                            | Stars  | Last release                     | Licence                               | Maintenance            | Fit                       | What is worth taking                                                                                                |
| --------------------------------------------------------------------- | ------ | -------------------------------- | ------------------------------------- | ---------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [google/fonts](https://github.com/google/fonts)                       | 20 668 | no release tag                   | per family, SIL OFL 1.1               | last commit 2026-10-22 | assets                    | The source of every OFL family in §5.1. The `METADATA.pb` in each family is the axis and licence record.            |
| [expo/google-fonts](https://github.com/expo/google-fonts)             | 945    | no release tag                   | MIT                                   | last commit 2026-10-21 | **in our app** (via Expo) | The Expo-native way to load a font: no runtime download, no flash of unstyled text on a cold start.                 |
| [fontsource/fontsource](https://github.com/fontsource/fontsource)     | 6 229  | core-v0.6.1, 2026-10-12          | MIT                                   | last commit 2026-10-14 | assets                    | The pipeline that turns a family into per-weight subsets. The tool to use if a direction wants a _cut_ of a family. |
| [rsms/inter](https://github.com/rsms/inter)                           | 19 991 | v4.1, 2024-11-16                 | OFL-1.1                               | last commit 2024-11-19 | assets                    | The typeface the "AI look" detector names first. Read it, then do not use it as the display face.                   |
| [vercel/geist-font](https://github.com/vercel/geist-font)             | 3 663  | v1.8.2, 2026-10-21               | OFL-1.1                               | last commit 2026-10-21 | assets                    | A modern, neutral grotesque with a mono sibling; the work-face candidate for a direction that wants plain.          |
| [IBM/plex](https://github.com/IBM/plex)                               | 11 718 | @ibm/plex-sans@1.1.0, 2024-11-13 | OFL-1.1                               | last commit 2026-10-16 | assets                    | Plex Mono is the most legible monospace for addresses and parcel numbers.                                           |
| [adobe-fonts/source-sans](https://github.com/adobe-fonts/source-sans) | 3 771  | 3.052R, 2023-04-04               | OFL-1.1                               | last commit 2025-10-28 | assets                    | Humanist, high x-height, very legible in a moving van.                                                              |
| [googlefonts/roboto-flex](https://github.com/googlefonts/roboto-flex) | 529    | 3.200, 2023-06-30                | OFL-1.1                               | last commit 2026-06-17 | assets                    | The reference for a thirteen-axis font. Its `opsz` and `wdth` are what §1.5 recommends.                             |
| [uswds/public-sans](https://github.com/uswds/public-sans)             | 4 750  | v2.001, 2022-05-11               | licence not detected — **unverified** | last commit 2026-10-01 | assets                    | A government-grade work face built for legibility at small sizes.                                                   |

### 2.10 AI UI prompt, skill and agent collections

These are the tools that generate interfaces. They are also the reason the look we refuse exists:
they make the _same_ screen every time. The rule for the ten directions is that a direction may
**read** them for the checklist, and may **not** let one of them write the screens.

| Repository                                                                                      | Stars   | Last release                      | Licence                                                            | Maintenance            | Fit         | What is worth taking                                                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------- | ------- | --------------------------------- | ------------------------------------------------------------------ | ---------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [pbakaus/impeccable](https://github.com/pbakaus/impeccable)                                     | 84 467  | cli-v4.7.0, 2026-10-19            | Apache-2.0                                                         | last commit 2026-10-22 | agent skill | **The most useful entry here.** 61 deterministic detector rules for generated front-ends, 24 commands, and a `PRODUCT.md` that records what the product actually is. Our §4 checks are the same idea, written for a phone in a van. |
| [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | 138 512 | v2.15.0, 2026-08-13               | MIT                                                                | last commit 2026-10-21 | agent skill | 192 reasoning rules and 79 searchable UI styles — a **style catalogue to argue with**, not to copy. Good for the mood-board step.                                                                                                   |
| [anthropics/skills](https://github.com/anthropics/skills)                                       | 182 780 | no release tag                    | licence not detected — **unverified**                              | last commit 2026-10-09 | agent skill | The `frontend-design` skill that Impeccable grew out of. Read the instructions; they are the clearest statement of the look we refuse.                                                                                              |
| [agentskills/agentskills](https://github.com/agentskills/agentskills)                           | 26 360  | no release tag                    | Apache-2.0                                                         | last commit 2026-08-09 | format      | The open `SKILL.md` format (progressive disclosure: discover, activate, execute). The format our own design skills use.                                                                                                             |
| [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)                         | 32 775  | agent-skills-063bee94, 2026-08-28 | licence not detected — **unverified**                              | last commit 2026-10-14 | agent skill | The best example of a _scored_ rule set (React rules with a priority). The pattern for our motion rules.                                                                                                                            |
| [obra/superpowers](https://github.com/obra/superpowers)                                         | 303 175 | v7.0.1, 2026-10-21                | MIT                                                                | last commit 2026-10-21 | agent skill | A large, active skill collection; the writing of its instructions is the part worth copying.                                                                                                                                        |
| [wshobson/agents](https://github.com/wshobson/agents)                                           | 41 482  | no release tag                    | MIT                                                                | last commit 2026-10-19 | agent skill | Sub-agent patterns for research and review.                                                                                                                                                                                         |
| [abi/screenshot-to-code](https://github.com/abi/screenshot-to-code)                             | 80 601  | no release tag                    | MIT                                                                | last commit 2026-10-09 | tool        | Screenshot to implementation. **The tool we must not point at our own mockups**: it copies a look, it does not design one.                                                                                                          |
| [GLips/Figma-Context-MCP](https://github.com/GLips/Figma-Context-MCP)                           | 16 037  | v0.13.2, 2026-06-18               | MIT                                                                | last commit 2026-10-16 | MCP server  | Lets a coding agent read a Figma file. The honest way to build a screen from a design file rather than from a description.                                                                                                          |
| [MCP-UI-Org/mcp-ui](https://github.com/MCP-UI-Org/mcp-ui)                                       | 5 227   | client/v7.1.1, 2026-05-09         | Apache-2.0                                                         | last commit 2026-09-16 | MCP UI      | Interactive UI over MCP; the reference for the **dispatcher web** tool, not for the driver app.                                                                                                                                     |
| [21st-dev/magic-mcp](https://github.com/21st-dev/magic-mcp)                                     | 6 178   | v0.2.3, 2026-09-09                | ISC                                                                | last commit 2026-09-09 | MCP server  | Component and UI generation. The same warning as screenshot-to-code.                                                                                                                                                                |
| [onlook-dev/onlook](https://github.com/onlook-dev/onlook)                                       | 26 972  | v0.2.32, 2025-07-17               | Apache-2.0                                                         | last commit 2026-10-21 | tool        | A visual editor that sits on the codebase. The closest thing to "design in the app" without a Figma round trip.                                                                                                                     |
| [excalidraw/excalidraw](https://github.com/excalidraw/excalidraw)                               | 134 337 | v0.18.1, 2026-04-21               | MIT                                                                | last commit 2026-10-21 | **web**     | Its canvas is the best free study of how a drawing tool earns trust: nothing hidden, everything editable.                                                                                                                           |
| [penpot/penpot](https://github.com/penpot/penpot)                                               | 61 469  | 2.18.3, 2026-10-06                | MPL-2.0                                                            | last commit 2026-10-21 | **web**     | An open design tool with real token support; the alternative to Figma if licensing matters.                                                                                                                                         |
| [tldraw/tldraw](https://github.com/tldraw/tldraw)                                               | 51 027  | v5.5.2, 2026-10-02                | licence not detected — the SDK is source-available, **unverified** | last commit 2026-10-21 | **web**     | The reference for a spatial canvas with excellent gestures and a serious motion vocabulary.                                                                                                                                         |
| [storybookjs/storybook](https://github.com/storybookjs/storybook)                               | 91 337  | v10.6.3, 2026-10-20               | MIT                                                                | last commit 2026-10-21 | **web**     | The screen inventory and the visual-regression baseline. The ten directions should live in a Storybook from day one.                                                                                                                |
| [mui/material-ui](https://github.com/mui/material-ui)                                           | 99 259  | v9.5.0, 2026-10-09                | MIT                                                                | last commit 2026-10-22 | **web**     | The Material implementation. Read its motion tokens, not its look.                                                                                                                                                                  |

### 2.11 The shortlist of fifteen

The rest of §2 is the pool. These fifteen are the projects a direction is expected to build on, or
to justify not building on, with the reason each one is on the list. A direction that needs
something outside this list must justify it with a measurement, per `docs/design/ORG.md` §3.9.

| #   | Project                                        | Version read                   | Why it is on the shortlist                                                                                           |
| --- | ---------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| 1   | `react-native-reanimated`                      | 4.7.1, 2026-10-02              | The motion engine; already installed, and the spring model in §5.3 is written for it.                                |
| 2   | `react-native-gesture-handler`                 | 3.4.0, 2026-10-16              | The swipe that marks a stop delivered, and the velocity it hands to the spring.                                      |
| 3   | `react-native-screens`                         | 4.30.0, 2026-10-13             | The native sheet and the shared-element transition between Today and the door sheet.                                 |
| 4   | `react-native-safe-area-context`               | 5.10.1 (in our app)            | The thumb-reachable layout; the 72 pt action cannot live inside a system inset.                                      |
| 5   | `react-native-unistyles`                       | 3.5.3 (in our app)             | The token runtime: one style sheet, ten themes, no class names.                                                      |
| 6   | `react-native-skia`                            | 3.7.2, 2026-10-20              | The drawing engine for the one signature moment and the dimensional parcel; also the engine we refuse for its bloom. |
| 7   | `rive-react-native`                            | 9.8.6, 2026-10-15              | A state machine a designer can author without code — the right tool for one moment, not for decoration.              |
| 8   | `maplibre-react-native`                        | 11.3.7 (in our app)            | The map, the camera and the style, on the phone.                                                                     |
| 9   | `maplibre-style-spec` + `maputnik`             | 26.4.4 / 3.1.0                 | The map as a document we own, edited in a tool.                                                                      |
| 10  | `protomaps/basemaps`                           | no tag, last commit 2026-09-11 | The reference style (BSD-3-Clause code, CC0 visual design): the cleanest modern basemap in the pool.                 |
| 11  | `style-dictionary`                             | 5.7.0, 2026-10-16              | The token pipeline: one source, ten theme outputs, no drift between Figma and the app.                               |
| 12  | `color-js/color.js`                            | 0.7.1, 2026-07-24              | The OKLCH implementation that generates the ramps in §5.2 instead of hand-picked hexes.                              |
| 13  | `material-design-icons` + `@expo/vector-icons` | 15.1.1 (in our app)            | The one icon set, one weight, no second family.                                                                      |
| 14  | `expo` (haptics, audio, three)                 | 58.0.14 (in our app)           | The platform modules for the haptics, the earcons and the 3D pass.                                                   |
| 15  | `axe-core`                                     | 4.14.0, 2026-10-05             | The rules engine of the accessibility gate; a dev dependency, never in the APK.                                      |

**On the edge of the shortlist, and why they are not on it:** `number-flow-react-native` (the
rolling number — unmeasured by our bench), `victory-native-xl` (the earnings chart — the licence
is unverified), `fontsource` (the per-weight subsets — only if a direction wants a cut of a
family), `impeccable` and `ui-ux-pro-max-skill` (the detector rules and the style catalogue — to be
read, never to be run over our screens), `moti` (the spring API, but quiet since March 2025).

---

## 3. The apps

### 3.1 The award-level apps (36 Apple award apps, 3 web-award references)

**Sources.** Apple Design Awards 2026 winners and finalists: the winners page
(https://developer.apple.com/design/awards/2026/, read 2026-10-22 — our checker is blocked by
Apple's bot protection, the page is public in a browser) and the App Store story
(https://apps.apple.com/us/story/id1896834601, read 2026-10-22). Apple Design Awards 2025:
https://developer.apple.com/design/awards/2025/ and
https://apps.apple.com/us/story/id1808994124 (read 2026-10-22), plus the newsroom release
(https://www.apple.com/newsroom/2025/06/apple-unveils-winners-and-finalists-of-the-2025-apple-design-awards/,
read 2026-10-22). The web-award references are from the Awwwards mobile collection
(https://www.awwwards.com/websites/mobile-apps/, read 2026-10-22).

**How to read the table.** "Take" is what a courier app should copy. "Avoid" is what the founder
called dated and plain. Every judgement is about the **screens and the motion**, read from the
public material named in the source column.

#### Apple Design Awards 2026 — winners

| App                                                   | Category             | What it does well                                                                                                     | Take                                                                                                                                                    | Avoid                                                                                        |
| ----------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **grug** (Ocho, https://octo.app/)                    | Delight and Fun      | One idea, one screen, a word in a large friendly type — nothing else on the page.                                     | The discipline of a screen that carries exactly one idea.                                                                                               | The joke register. A courier app is not a novelty, even a good one.                          |
| **Guitar Wiz** (Bijoy Thangaraj)                      | Inclusivity          | Dynamic Type, Increased Contrast and Differentiate Without Color are used as design materials, not as settings.       | Building our night theme and our high-contrast theme from the same tokens, and testing them at 200 % text.                                              | Nothing — copy this. Put it in the QA checklist as the reference for the accessibility pass. |
| **NBA: Live Games & Scores** (NBA Media Ventures)     | Innovation           | A live sports surface read at a glance from a distance, with depth and layering that do not fight the content.        | The way a live map layer keeps the **next thing** above the noise.                                                                                      | The density of a broadcast graphics package.                                                 |
| **Moonlitt** (Flipping Hues)                          | Interaction          | A 3D map used to answer a geometric question (the line of sight to the moon), with a plain, calm surface around it.   | 3D as an answer to a question, not as a look; the camera pitch that puts the world at the driver's eye line.                                            | The pale-lilac palette; too soft for daylight and it fails the driving bar.                  |
| **Primary: News in Depth** (https://www.primary.app/) | Social Impact        | A reading surface that makes a long item scannable, with the type doing the work.                                     | Type-first hierarchy: a courier's address is a piece of text, not a data field.                                                                         | The editorial density; a driver has three seconds.                                           |
| **Tide Guide** (Condor Digital)                       | Visuals and Graphics | "An aqua-inspired palette adapts to match the colour of the sky throughout the day"; full-screen charts of real data. | The idea of a palette that follows the **time of day** — ours switches to the night theme at sunset, and the night theme is a design, not an inversion. | A palette that follows anything the phone feels like. Our brand colour is fixed.             |

#### Apple Design Awards 2026 — finalist apps

| App                                                      | Category             | What it does well                                                                                             | Take                                                                                                       | Avoid                                 |
| -------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **Blippo+** (Panic, https://blippo.plus/)                | Delight and Fun      | A tool with a strong single-colour identity and a voice that is the company's own.                            | A product that sounds like a person, not a system.                                                         | The cartoon characters on the chrome. |
| **Metaballs** (Apposite)                                 | Delight and Fun      | Physics as the interaction model; the object behaves like the material it is made of.                         | A spring that carries **velocity** from the driver's own gesture.                                          | Physics for its own sake.             |
| **Hearing Buddy** (Lilly Seay)                           | Inclusivity          | A screen built for a user who cannot hear the notification, so the state is visible and the text is complete. | The rule that a state must be visible on the screen and not only audible.                                  | —                                     |
| **Structured** (unorderly GmbH)                          | Inclusivity          | Clear grouping and hierarchy without decoration.                                                              | Structure by space and weight, not by cards and shadows.                                                   | —                                     |
| **Detail: AI Video Editor** (Detail Technologies B.V)    | Innovation           | A tool whose power is hidden behind plain, obvious controls.                                                  | The rule that our companion is a **state and a sentence**, never a magic button.                           | The word "AI" on the button.          |
| **D-Day: The Camera Soldier** (Targo)                    | Innovation           | A serious tool with a calm, low-chrome surface.                                                               | The low-chrome look of a tool used outdoors.                                                               | —                                     |
| **The Outsiders: Athlete Tracker** (Gentler Stories LLC) | Interaction          | Live tracking read as a single number and a single line of text.                                              | One number first, one line of explanation — the Uber-Driver hierarchy we already borrow.                   | —                                     |
| **Katha Room**                                           | Social Impact        | A warm, human surface that does not apologise for being plain.                                                | Copy: plain NZ English, no marketing voice in the product.                                                 | —                                     |
| **Harvee**                                               | Social Impact        | A dense but calm operational screen.                                                                          | The density of a dispatch screen that a team lead reads all day.                                           | —                                     |
| **Caradise** (PSQV AB)                                   | Visuals and Graphics | Craft and finish in the surfaces and the illustration.                                                        | The finish quality: the exact hairline, the exact corner, the exact shadow.                                | —                                     |
| **(Not Boring) Camera** (https://www.notboring.camera/)  | Visuals and Graphics | A camera app with a real opinion about its output, and a fast, physical shutter.                              | The **signature moment** the founder asks for: one action that feels like the tool the courier is holding. | The confetti and the celebration.     |

#### Apple Design Awards 2025 — winners and finalist apps

| App                                                  | Category                                         | What it does well                                                                           | Take                                                                                                                    | Avoid                                                                       |
| ---------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **CapWords** (HappyPlan Tech, https://capwords.app/) | Delight and Fun (2025)                           | The camera and the result are one continuous action.                                        | The scanner as a single, uninterrupted gesture from camera to corrected address.                                        | The gamification around it.                                                 |
| **Speechify** (https://speechify.com/)               | Inclusivity (2025)                               | Voice is the interface; the screen is the transcript.                                       | The transcript log as plain text with the corrections and the reasons — our dictation report, without the chat bubbles. | The app's own marketing voice.                                              |
| **Play** (Rabbit 3 Times, https://www.play.design/)  | Innovation (2025)                                | A design tool with a live preview that feels instant.                                       | The design-lab loop: change a token, see the screen.                                                                    | Nothing.                                                                    |
| **Taobao** (https://taobao.com/)                     | Interaction (2025)                               | A huge catalogue that is still navigable in three actions, with 3D product views.           | The information architecture of a large set, sorted by what the driver needs next.                                      | The shopping chrome and the badges.                                         |
| **Watch Duty: Wildfire Maps**                        | Social Impact (2025)                             | A live map that stays legible under stress, with the incident as the only bright thing.     | The **incident map** rule: one status colour, everything else in ink.                                                   | The red-alert palette in our own product: the red must mean one thing only. |
| **Feather: Draw in 3D** (Sketchsoft)                 | Visuals and Graphics (2025)                      | A 3D tool that is calm, minimal and precise; touch and pencil input treated as first class. | 3D as a precise instrument, not a showcase.                                                                             | The 3D-in-everything trend.                                                 |
| **Lumy** (Raja V)                                    | Delight and Fun (2025 finalist)                  | A utility with widgets that carry the whole value.                                          | The lock-screen or quick-access idea for the next stop.                                                                 | —                                                                           |
| **Denim** (Feel Good Tech)                           | Delight and Fun (2025 finalist)                  | SwiftUI-built, with haptic feedback on generation.                                          | The habit of pairing one haptic with one meaningful action.                                                             | —                                                                           |
| **Evolve: Daily Self-Care Coach**                    | Inclusivity (2025 finalist)                      | Inclusive by construction, with a large type and low-chrome surfaces.                       | —                                                                                                                       | The wellness framing.                                                       |
| **Train Fitness**                                    | Inclusivity (2025 finalist)                      | Screen-free accessibility as the headline.                                                  | The ambition that a courier's core task works without the screen.                                                       | —                                                                           |
| **Moises** (Music.AI)                                | Innovation (2025 finalist)                       | A capable model behind two plain controls.                                                  | The plainness of the controls.                                                                                          | The brand.                                                                  |
| **Capybara** (Digital Workroom)                      | Innovation (2025 finalist)                       | Transcription, translation and summary in one calm surface.                                 | One surface, one state, one result.                                                                                     | The illustrated characters.                                                 |
| **iA Writer** (Information Architects AG)            | Interaction (2025 finalist)                      | A writing surface with a single focus and a visible structure.                              | Focus management in the dictation and correction screens.                                                               | The typewriter metaphor (we must not look like a retro tool).               |
| **Mela: Recipe Manager**                             | Interaction (2025 finalist)                      | A dense list that stays readable; the metadata is in the right place.                       | The metadata density of a stop list — but **not** as a bootstrap table.                                                 | The generic list look.                                                      |
| **Ground News**                                      | Social Impact (2025 finalist)                    | Bias and evidence made visible with a legend the eye learns in seconds.                     | A legend that teaches itself, for our map layers.                                                                       | The multi-coloured map clutter Waze suffers from.                           |
| **Opal** (Opal OS)                                   | Social Impact (2025 finalist)                    | A calm, monochrome device for attention.                                                    | Monochrome as a deliberate palette for the night screen.                                                                | The wellness framing.                                                       |
| **Ahoy!** (Daniel Jones)                             | Social Impact (2025 finalist)                    | A friendly, plain interface.                                                                | Plain copy that still has a voice.                                                                                      | —                                                                           |
| **Vocabulary: Learn Words Daily** (Monkey Taps)      | Visuals and Graphics (2025 finalist)             | Clean illustration and haptic feedback on the small action.                                 | Illustration used sparingly, in one system, with haptics on the action.                                                 | Stock illustration as decoration.                                           |
| **CellWalk** (Timothy Davison)                       | Visuals and Graphics (2025 finalist, Vision Pro) | A 3D model that is genuinely used, at real fidelity.                                        | 3D only where the model earns its place.                                                                                | —                                                                           |

#### Web-award references (Awwwards mobile collection, read 2026-10-22)

These are award-winning **web** surfaces for mobile products, read as motion references rather than
as app references. The collection page lists, among others, Spotify Wrapped Party (Active Theory,
Site of the Day 24 Jul 2026), Linearity.ai (Konpo, Site of the Day 15 Jun 2026), Grassfeld (HM,
5 Aug 2026) and Charmling (HM, 27 Jul 2026). The names are as they appear on
https://www.awwwards.com/websites/mobile-apps/ (read 2026-10-22).

| Reference                                 | What it does well                                                                    | Take                                                                             | Avoid                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | --------------------------------------- |
| **Spotify Wrapped Party** (Active Theory) | A year told as a sequence of physical-feeling moments with a real typographic voice. | The idea of the end-of-day screen being a _story_ with three beats, not a table. | The confetti and the awards.            |
| **Linearity.ai** (Konpo)                  | Dense information with a precise grid, a limited palette and no decoration.          | Density without clutter — the right answer for the dispatcher web.               | The blue-on-dark developer-tool cliché. |
| **Grassfeld** (HM, 5 Aug 2026)            | A personal-finance surface with one accent and a lot of white space.                 | One accent used for one meaning.                                                 | Nothing.                                |

### 3.2 The competitors

Public material only. The Spoke row is the summary of our own teardown
(`docs/study/spoke/TEARDOWN.md`, read 2026-10-21); the others were read on 2026-10-22 from the
sites in the source column. The status of every URL is in
`reference-urls-research2-2026-10-22.tsv`.

| Product                                 | Source                                                                                          | What it does well in the screens and the motion                                                                                                          | Take                                                                                                                          | Avoid                                                                                                                                          |
| --------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spoke** (ex-Circuit Route Planner)    | https://spoke.com/route-planner, https://apps.apple.com/nz/app/spoke-route-planner/id1198232244 | The NZ benchmark: a run that is a list worked down, a swipe on a stop to mark it, the map one thumb-tap away, a route that can be changed while driving. | The swipe-to-deliver gesture; the route strip showing the next three stops; the plainness of the copy; the offline behaviour. | The card-on-card stack and the dark map. It looks like a 2019 delivery app — exactly the trap the founder rejected.                            |
| **Circuit** (the same product, renamed) | https://getcircuit.com/                                                                         | The same codebase with the dispatch product for teams (10 million driver downloads claimed).                                                             | The two-in-one binary (personal and team profiles in one app) — worth studying, and worth doing better.                       | The rename trail in the UI. One name, one product.                                                                                             |
| **Uber Driver**                         | https://www.uber.com/global/en/driver/ (blocked to our checker, public in a browser)            | The earning screen: one number, one chart, one sentence. The map is a tool, never a picture. The push-to-talk button is the only large control.          | The one-number-first hierarchy; the earning summary.                                                                          | The badge-and-chip confetti on success. A courier does not need a parade to confirm a delivery.                                                |
| **DoorDash Dasher**                     | https://dasher.doordash.com/, https://dasherhelp.doordash.com/                                  | The best onboarding in the category: it teaches by asking, one thing per screen, and it explains the order of the stops.                                 | Teaching-by-doing onboarding; naming the state of a job in words.                                                             | The streaks, the confetti, the emoji in the merchant names.                                                                                    |
| **Amazon Flex**                         | https://www.amazon.com/flex (blocked to our checker, public in a browser)                       | Logistics as a manifest: window, parcel count, distance, earnings in a table a courier can read like paper.                                              | The manifest idea, and the earnings table on the end-of-day screen.                                                           | The Amazon chrome around it — the yellow and the black bar. Our brand has to be ours.                                                          |
| **Apple Maps**                          | https://www.apple.com/maps/, https://developer.apple.com/design/human-interface-guidelines/     | The glanceable turn card: the instruction is the largest thing, the distance the second, everything else small. The map has no title bar while driving.  | The hierarchy of the driving screen; the map never competes with the address. Our floor is 72 pt, above Apple's 44 pt.        | The heavy sheet chrome on the walking screens; the glossy 3D buildings in daylight.                                                            |
| **Google Maps**                         | https://maps.google.com/, https://m3.material.io/                                               | The map modes (flat, 3D, satellite, day/night), and the pin that changes shape with the state of the stop.                                               | Driver-selectable view modes (MASTER_EXECUTION §11) and the state-changing pin.                                               | Material You: tonal surfaces, pill shapes and the wallpaper palette. It is the most recognisable generated-app look of 2026 and §13.2 bans it. |
| **Waze**                                | https://www.waze.com/                                                                           | Community reports as a coloured dot on the road, and one line of text saying what is happening.                                                          | The one-line report ("someone parked across the drive"); our door memory and hazard notes are the same idea at the door.      | The clutter: dozens of coloured icons at once. Our night map has three layers.                                                                 |
| **Strava**                              | https://www.strava.com/                                                                         | The motion of a number that counts up: it rolls, it settles, it never bounces. The share card is a designed object.                                      | The rolling number for earnings and stops left; a designed end-of-day share card.                                             | The celebration. Nothing celebrates a single parcel.                                                                                           |
| **Revolut**                             | https://www.revolut.com/ (blocked to our checker, public in a browser)                          | The account card as a physical object: a real surface, a real edge, a real number.                                                                       | The discipline of one accent and one number; a card that is an object, not a gradient rectangle.                              | The black-and-neon gradient card of the marketing site — the neon-on-black §13.2 bans.                                                         |
| **Monzo**                               | https://monzo.com/, https://github.com/monzo/docs                                               | The plainest product language in banking: one colour, one typeface, one number, no decoration. Copy that reads like a person talking.                    | The voice of the product and the discipline of one accent on the one thing it is for.                                         | The coral used as an accent everywhere.                                                                                                        |
| **Linear**                              | https://linear.app/                                                                             | Keyboard-first speed, a dark surface with one accent, and a command bar that does everything without a menu tree.                                        | The command palette idea for the dispatcher web and for the settings of the driver app.                                       | The developer-tool cliché of the deep blue-black; and a keyboard-first flow that ignores the driver.                                           |
| **What3Words**                          | https://what3words.com/                                                                         | A precise, memorable address format that a courier can say out loud; the map pin drops exactly where it should.                                          | The idea of a **speakable** location as a first-class input to the scanner and the dictation.                                 | The proprietary grid: their cells are not ours to copy, and their dataset is not free to use.                                                  |
| **onfleet**                             | https://onfleet.com/                                                                            | Dispatch for a fleet: live map, exception handling, proof of delivery, a web board that a team lead reads all day.                                       | The dispatcher's board and its exception states — the second audience our product has.                                        | The enterprise dashboard density: our driver app must never look like it.                                                                      |
| **Routific**                            | https://www.routific.com/                                                                       | Route planning that explains itself: the plan, the trade-offs, the time saved.                                                                           | The way the route is justified to the driver ("this order saves 14 minutes").                                                 | The planner's spreadsheet look.                                                                                                                |

---

## 4. The anti-"AI look" rules as QA checks

**§13.2 is a gate: a design that breaks one does not ship.** §13.6 adds four more: no paper or
ledger retro look, no flat bootstrap-like lists, no single-accent-on-grey templates, and every
direction must have a **strong signature moment**. Each rule below is turned into something the
Design QA team can actually run, with a real failure to look for. The WCAG column names the
success criterion where one exists (WCAG 2.2, https://www.w3.org/TR/WCAG22/, read 2026-10-22).

### 4.1 The checks

| #   | Rule (§13.2 / §13.6)                           | The check QA runs                                                                                                                                 | A real failure to look for                                                                 | Pass condition                                                                                            | WCAG                  |
| --- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | --------------------- |
| 1   | No neon accent on black                        | Run the palette measurement (`node scripts/design/measure-palettes.mjs`) and read the saturation of the brand colour against the night background | The classic generated dashboard: `#7C3AED` or `#22D3EE` on `#0B0B0F`                       | The night brand colour is a measured value from §5.2, never a raw hex picked by eye                       | 1.4.3, 1.4.11         |
| 2   | No glow or bloom                               | Grep the tree for elevation tokens above the three levels, and for any blur radius on a text-bearing surface                                      | `expo-blur` in the dependency list; a wide, soft shadow on the address                     | Three elevation levels maximum; no blur library in the app                                                | 1.4.11                |
| 3   | No glassmorphism                               | Grep for `expo-blur`, `BlurView`, `backdropFilter`, and for any surface with alpha over the map                                                   | A sheet at 70 % alpha over a moving map: unreadable in daylight, unlawful at night         | Every surface over the map is fully opaque                                                                | 1.4.3                 |
| 4   | No pulsing orbs                                | Grep for `withRepeat` with a scale or opacity change; check that no animated element is decorative                                                | The "breathing" dot next to the voice label — the most common tell in generated onboarding | Any repeat animation carries information (a progress, a pending state)                                    | 2.2.2                 |
| 5   | No purple/blue gradients                       | Grep for `LinearGradient` and `expo-linear-gradient`; check both stops of every gradient                                                          | The default hero gradient `#7C3AED → #2563EB`, which is in Impeccable's detector list      | No gradient in the product, or one gradient in one signature moment, documented                           | 1.4.3                 |
| 6   | No "sparkle" icons for the assistant           | Grep the icon list for sparkle, star, magic, wand, robot, brain; check the icon set is a single family                                            | The sparkle glyph next to the voice button                                                 | One icon set, one weight, no sparkle, no robot                                                            | 1.1.1                 |
| 7   | No generic rounded cards stacked               | Count the surfaces per screen: a card is not the default; measure the corner radius and the gap                                                   | A list of six rounded rectangles with a shadow each — the shape every kit ships            | A screen has at most three surfaces, and at least one uses a rule or space instead                        | 1.4.11                |
| 8   | No centred hero and two buttons                | Check the first screen of every flow: is there a centred block of text with two buttons under it?                                                 | "Welcome to Courier Copilot / Get started / Sign in", centred, with the logo above         | The first screen shows the day's work, not a welcome                                                      | 1.4.3                 |
| 9   | No dark mode by default                        | Assert that the default theme is the light one (the token test already fails a non-light direction)                                               | A dark app that opens at 8 pm because the phone is dark                                    | The day theme is the identity; the night theme is the adapted option                                      | 1.4.3                 |
| 10  | No stock iconography without a system          | Check every icon resolves to one family and one weight; check the grid and the stroke                                                             | A Material icon next to a Lucide icon next to an emoji                                     | One family, one weight, one grid                                                                          | 1.1.1                 |
| 11  | No lorem-like filler                           | Grep the strings for "Welcome back", "Lorem", "John Doe", "Sample", "Example"                                                                     | "Welcome back, John!" in the demo screen of a kit                                          | Real Christchurch addresses, real suburbs, real times, plain NZ English                                   | 1.3.1                 |
| 12  | No emoji                                       | The existing test fails on any emoji in the tree; keep it in CI                                                                                   | A checkmark in the delivered row, a parcel in the empty state                              | Zero emoji, anywhere, including in strings and in the store text                                          | 1.1.1                 |
| 13  | **No paper or ledger retro look** (§13.6)      | Check the background hue and saturation: a warm cream surface with a kraft accent is the tell                                                     | The Roadbook cream `#F4F1EA` with amber `#8A4B00` — warm paper, a run sheet on a phone     | A cool or neutral surface; no kraft, no sepia, no ruled ledger                                            | 1.4.3                 |
| 14  | **No flat bootstrap-like lists** (§13.6)       | Count the visual variety of a list: if every row is the same rectangle with the same padding, it fails                                            | A 300-stop list where each row is an identical grey rounded rectangle                      | The list has hierarchy: the next stop is different from the twentieth stop                                | 1.4.1                 |
| 15  | **No single-accent-on-grey templates** (§13.6) | Count the hues in a palette: one accent on a neutral grey is the template                                                                         | Brand `#2563EB` on `#F3F4F6` with everything else grey                                     | Two identity colours with different jobs, plus a tinted surface                                           | 1.4.11                |
| 16  | **A strong signature moment** (§13.6)          | Ask: what is the one action or transition a courier would describe to another courier? If the answer is "the map", there is no signature moment   | "The app looks clean"                                                                      | One named moment per direction: how a delivery is confirmed, how the map moves, how the companion appears | —                     |
| 17  | Status is never colour-only                    | Every status row carries its word or its shape                                                                                                    | A green dot with no label                                                                  | Word + shape + colour, always                                                                             | 1.4.1                 |
| 18  | The primary action is reachable in two taps    | Walk the four driving tasks (next stop, delivered, failed, navigate) and count the taps with a thumb                                              | Three taps to mark a delivery                                                              | Two taps maximum while driving, zero for anything spoken                                                  | 2.5.8                 |
| 19  | Targets are at least 24 dp                     | Run the accessibility scan; the WCAG 2.2 minimum target size is 24 × 24 CSS px                                                                    | A 16 dp close button beside the address                                                    | 56 dp for anything a driver touches, 72 dp for the primary action                                         | 2.5.8                 |
| 20  | 200 % text does not clip                       | Render every screen at 200 % and check for truncation or clipping                                                                                 | The address truncated with an ellipsis at 200 %                                            | Nothing is clipped; the layout reflows                                                                    | 1.4.4, 1.4.10, 1.4.12 |
| 21  | Reduce motion is honoured                      | Toggle the system setting; every transition must become instant, never disappear                                                                  | The sheet that no longer opens at all                                                      | The same motion with the spring removed                                                                   | 2.3.3                 |
| 22  | No emoji in the strings either                 | Scan the copy tables, not only the components                                                                                                     | The parcel emoji in an empty state                                                         | Copy without emoji                                                                                        | 1.1.1                 |

### 4.2 How the QA team runs the gate

The gate is not a checklist on a form. It is four commands and one review:

1. **Automated** — the token tests (`packages/design-tokens/src/contrast.test.ts`,
   `directions.test.ts`), the emoji test, the lint rules, and the palette measurement script.
   A failing measurement is a failing direction.
2. **Screenshot** — the day and the night theme, a small and a large phone, 200 % text, compared
   against the approved mockups (`docs/design/SYSTEM.md` §9).
3. **Motion** — the emulator recording of each of the four screens, with the frame-time trace.
   "It looks smooth in the preview" is not evidence.
4. **Human review** — a real device, real gloves, a screen reader, and the three questions of
   check 16.

A direction that fails any of the twenty-two checks is not shown to the founder.

---

## 5. The reference sheets

Everything in this section is ready to pick. A direction team chooses one palette, one type
pairing, one motion language and one map style, and the numbers below are already measured.

### 5.1 Type pairings

**The rule.** One display family for the number and the address, one work family for everything
else. Never two display faces. Never three families. Tabular figures on every number that
changes.

| Pairing                       | Display family (licence)                                                                                                                                      | Work family (licence)                                                                                                                                  | Where it is used                                                                         | Notes                                                                                                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Plain and modern**       | Space Grotesk — **SIL OFL 1.1** (https://github.com/google/fonts/blob/main/ofl/spacegrotesk/OFL.txt, read 2026-10-22)                                         | Geist — **SIL OFL 1.1** (https://github.com/vercel/geist-font/blob/main/LICENSE.txt, read 2026-10-22)                                                  | The everyday direction: numbers and addresses in Space Grotesk, everything else in Geist | Geist Mono is in the same licence for parcel numbers. The safest pairing of the pool.                                                                                                        |
| **B. Editorial**              | Fraunces — **SIL OFL 1.1**, variable with `opsz 9–144`, `wght 100–900`, `SOFT`, `WONK` (https://github.com/google/fonts/blob/main/ofl/fraunces/OFL.txt)       | Source Sans 3 — **SIL OFL 1.1** (https://github.com/adobe-fonts/source-sans/blob/master/LICENSE.md)                                                    | A direction that wants the address to read like a printed notice                         | The `opsz` axis does the work: at 64 pt Fraunces is a different typeface from Fraunces at 17 pt. Set `SOFT 0`, `WONK 0` in the product; the axes are there if a signature moment needs them. |
| **C. Technical**              | Roboto Flex — **SIL OFL 1.1**, thirteen axes (https://github.com/google/fonts/blob/main/ofl/robotoflex/OFL.txt)                                               | IBM Plex Mono — **SIL OFL 1.1** (https://github.com/IBM/plex/blob/master/LICENSE.txt)                                                                  | A direction that leans on width and optical size as a tool                               | One family, two roles. `wdth` condenses the address to one line; `opsz` handles the number.                                                                                                  |
| **D. Compact and industrial** | Bricolage Grotesque — **SIL OFL 1.1**, `opsz 12–96`, `wdth 75–100`, `wght 200–800` (https://github.com/google/fonts/blob/main/ofl/bricolagegrotesque/OFL.txt) | IBM Plex Sans — **SIL OFL 1.1**                                                                                                                        | A direction with a hard, wide, industrial voice                                          | `wdth 75` at 64 pt is a compact number block; the weight axis reaches 800 without a second file.                                                                                             |
| **E. Humanist and plain**     | Instrument Sans — **SIL OFL 1.1**, `wdth 75–100`, `wght 400–700` (https://github.com/google/fonts/blob/main/ofl/instrumentsans/OFL.txt)                       | Public Sans — licence **unverified** (the GitHub API reports no licence file for the repository; read the `LICENSE` in the repository before shipping) | A direction that wants warmth without a serif                                            | Read the licence file first: this is the one pairing whose second family is not confirmed.                                                                                                   |
| **F. The current contract**   | Figtree — **SIL OFL 1.1** (https://github.com/google/fonts/blob/main/ofl/figtree/OFL.txt)                                                                     | Figtree                                                                                                                                                | The house family today; useful as the neutral baseline when comparing a new direction    | Not a direction by itself: the founder read Figtree-only as "plain".                                                                                                                         |

**Fonts that cannot be licensed for our app — crossed out.** Each of these is a real typeface with
a commercial licence; none may be shipped in a commercial app without a purchase, and none may be
used as a "free" stand-in.

| ✗ Font                                            | Why it is out                                                                                                                                  | Where the licence is published                                                                     |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| ✗ **SF Pro / SF Mono**                            | Apple's licence covers use in applications on Apple platforms; it is not a licence to ship the font on Android and it cannot be redistributed. | https://developer.apple.com/fonts/ (read 2026-10-22)                                               |
| ✗ **Futura**                                      | Commercial desktop, web, app and social licence; a paid seat.                                                                                  | https://www.monotype.com/ (read 2026-10-22)                                                        |
| ✗ **Avenir Next**                                 | Commercial licence from the Monotype/Matsumura foundry; a paid seat.                                                                           | https://www.monotype.com/ (read 2026-10-22)                                                        |
| ✗ **Helvetica / Neue Haas Grotesk**               | Commercial licence from Monotype/Linotype; a paid seat.                                                                                        | https://www.monotype.com/ (read 2026-10-22)                                                        |
| ✗ **Gotham**                                      | Commercial Type licence: desktop, web and app licences are sold separately.                                                                    | https://commercialtype.com/gotham/ (read 2026-10-22 — blocked to our checker, public in a browser) |
| ✗ **Proxima Nova, GT America, Brandon Grotesque** | Sold by commercial foundries under an end-user licence; no free commercial app licence.                                                        | The foundry terms, which the Brand team must check before any exception is considered              |

**Rules for the type.** Load the family with `expo-google-fonts` or a Fontsource subset; never
download a font at runtime on a cold start. Every family above is SIL OFL 1.1, which permits
commercial use in an app and allows embedding in the binary, with the OFL notice kept in
`docs/LICENSES.md`. Set `fontVariant: ['tabular-nums']` on every number that changes.

### 5.2 The palettes (measured)

Six candidate palettes, each with a day theme and a night theme, in the semantic roles of
`packages/design-tokens/src/themes.ts`. **All 240 measurements pass their bar.** The measurement
uses `packages/design-tokens/src/contrast.ts`, the same code the build gate uses; the full result
is in `docs/design/evidence/palette-contrast-research2-2026-10-22.tsv`.

**The bars** (`docs/design/SYSTEM.md` §6): body text ≥ 4.5:1; driving text ≥ 7:1; a UI boundary
≥ 3:1 (WCAG 2.2 SC 1.4.11); large text ≥ 3:1. The chip is the status colour at 12.5 % over the
surface, as in `themes.ts`; on a light theme the chip carries the status colour as its text, on a
dark theme it carries the primary text colour, because a 12.5 % tint of a light colour over a dark
surface is unreadable.

**How to pick:** a direction takes **one** palette. If it changes a hex, it re-runs
`node scripts/design/measure-palettes.mjs` and the changed pair must still pass.

#### P1 — HiVis (safety orange, kelp green, cool white)

| Role                         | Day hex   | Day on background | Day on surface | Night hex | Night on background | Night on surface |
| ---------------------------- | --------- | ----------------- | -------------- | --------- | ------------------- | ---------------- |
| textPrimary                  | `#14161a` | 16.26:1           | 18.11:1        | `#f4f5f2` | 17.08:1             | 15.74:1          |
| textSecondary                | `#454a4f` | 8.04:1            | 8.95:1         | `#c3c8c2` | 11:1                | 10.14:1          |
| textTertiary                 | `#50555a` | 6.76:1            | 7.53:1         | `#a9afa9` | 8.36:1              | 7.7:1            |
| brandPrimary                 | `#a63a00` | 5.84:1            | 6.51:1         | `#e07a35` | 6.24:1              | 5.75:1           |
| brandSecondary               | `#14563c` | 7.77:1            | 8.66:1         | `#5fae86` | 7.02:1              | 6.47:1           |
| success                      | `#14603c` | 6.81:1            | 7.59:1         | `#59b184` | 7.16:1              | 6.6:1            |
| warning                      | `#7a4a00` | 6.72:1            | 7.48:1         | `#d8a83c` | 8.53:1              | 7.86:1           |
| error                        | `#a01810` | 7.16:1            | 7.98:1         | `#e8736a` | 6.31:1              | 5.82:1           |
| info                         | `#14495f` | 8.78:1            | 9.78:1         | `#6fa9c4` | 7.25:1              | 6.68:1           |
| border                       | `#6b7067` | 4.56:1            | 4.47:1         | `#7b837a` | 4.78:1              | 3.93:1           |
| stopPin / routeLine          | `#a63a00` | 5.84:1            | 5.73:1         | `#e07a35` | 6.24:1              | 5.13:1           |
| userLocation                 | `#14495f` | 8.78:1            | 8.61:1         | `#6fa9c4` | 7.25:1              | 5.97:1           |
| night driving text (7:1 bar) |           |                   |                |           | 17.08:1             | 15.74:1          |
| chip: brand 12.5 %           | `#f4e6df` | 5.34:1            |                |           |                     |                  |
| chip: success 12.5 %         | `#e2ebe7` | 6.24:1            |                |           |                     |                  |
| chip: warning 12.5 %         | `#eee8df` | 6.14:1            |                |           |                     |                  |
| chip: error 12.5 %           | `#f3e2e1` | 6.37:1            |                |           |                     |                  |
| mapText on mapLand / mapRoad |           | 15.95:1 / 18.11:1 |                |           | 14.06:1 / 9.73:1    |                  |

Map colours: land `#f0f1ec`, water `#d6e4ea`, road `#ffffff`, motorway `#f2c94c`,
building `#e0e2db`, park `#dae6d0`, background `#e9ebe5`.

#### P2 — Harbour (sea blue, rust, cool white)

| Role                         | Day hex   | Day on background | Day on surface | Night hex | Night on background | Night on surface |
| ---------------------------- | --------- | ----------------- | -------------- | --------- | ------------------- | ---------------- |
| textPrimary                  | `#0d161a` | 16.26:1           | 18.31:1        | `#f2f6f8` | 17.46:1             | 16.01:1          |
| textSecondary                | `#3c4d55` | 7.82:1            | 8.81:1         | `#bccbd1` | 11.39:1             | 10.45:1          |
| textTertiary                 | `#47585f` | 6.59:1            | 7.42:1         | `#9fb2b9` | 8.63:1              | 7.91:1           |
| brandPrimary                 | `#0a4a63` | 8.58:1            | 9.67:1         | `#5fa6c4` | 7:1                 | 6.41:1           |
| brandSecondary               | `#a8461b` | 5.24:1            | 5.9:1          | `#e08148` | 6.69:1              | 6.14:1           |
| success                      | `#14603c` | 6.73:1            | 7.59:1         | `#59b184` | 7.28:1              | 6.67:1           |
| warning                      | `#7a4e00` | 6.39:1            | 7.2:1          | `#d8a83c` | 8.67:1              | 7.95:1           |
| error                        | `#a11e18` | 6.87:1            | 7.74:1         | `#e8736a` | 6.41:1              | 5.88:1           |
| info                         | `#0a4a63` | 8.58:1            | 9.67:1         | `#5fa6c4` | 7:1                 | 6.41:1           |
| border                       | `#5d6f77` | 4.65:1            | 4.66:1         | `#6f8189` | 4.68:1              | 3.84:1           |
| stopPin                      | `#0a4a63` | 8.58:1            | 8.59:1         | `#5fa6c4` | 7:1                 | 5.74:1           |
| routeLine                    | `#a8461b` | 5.24:1            | 5.25:1         | `#e08148` | 6.69:1              | 5.49:1           |
| userLocation                 | `#0a4a63` | 8.58:1            | 8.59:1         | `#5fa6c4` | 7:1                 | 5.74:1           |
| night driving text (7:1 bar) |           |                   |                |           | 17.46:1             | 16.01:1          |
| chip: brand 12.5 %           | `#e0e8ec` | 7.79:1            |                |           |                     |                  |
| chip: success 12.5 %         | `#e2ebe7` | 6.24:1            |                |           |                     |                  |
| chip: warning 12.5 %         | `#eee9df` | 5.95:1            |                |           |                     |                  |
| chip: error 12.5 %           | `#f3e3e2` | 6.23:1            |                |           |                     |                  |
| mapText on mapLand / mapRoad |           | 16.28:1 / 18.31:1 |                |           | 14.33:1 / 9.09:1    |                  |

Map colours: land `#eff2f3`, water `#cfe1e9`, road `#ffffff`, motorway `#f0c674`,
building `#e1e7ea`, park `#d8e6dd`, background `#e4ebee`.

#### P3 — Signal (vermilion and ink on neutral)

| Role                         | Day hex   | Day on background | Day on surface | Night hex | Night on background | Night on surface |
| ---------------------------- | --------- | ----------------- | -------------- | --------- | ------------------- | ---------------- |
| textPrimary                  | `#101112` | 17.01:1           | 18.9:1         | `#f6f6f4` | 17.46:1             | 16.26:1          |
| textSecondary                | `#43453f` | 8.74:1            | 9.71:1         | `#c6c6c1` | 11.02:1             | 10.26:1          |
| textTertiary                 | `#4e504a` | 7.35:1            | 8.17:1         | `#acaca6` | 8.28:1              | 7.71:1           |
| brandPrimary                 | `#b3261e` | 5.88:1            | 6.54:1         | `#e0524a` | 4.93:1              | 4.59:1           |
| brandSecondary               | `#1d2a33` | 13.21:1           | 14.67:1        | `#8fa4b3` | 7.31:1              | 6.81:1           |
| success                      | `#1d5b34` | 7.27:1            | 8.08:1         | `#5cb083` | 7.19:1              | 6.7:1            |
| warning                      | `#7a4a00` | 6.73:1            | 7.48:1         | `#d8a83c` | 8.62:1              | 8.03:1           |
| error                        | `#b3261e` | 5.88:1            | 6.54:1         | `#e0524a` | 4.93:1              | 4.59:1           |
| info                         | `#1d2a33` | 13.21:1           | 14.67:1        | `#8fa4b3` | 7.31:1              | 6.81:1           |
| border                       | `#6d6d68` | 4.68:1            | 4.64:1         | `#77776f` | 4.19:1              | 3.49:1           |
| stopPin / routeLine          | `#b3261e` | 5.88:1            | 5.83:1         | `#e0524a` | 4.93:1              | 4.1:1            |
| userLocation                 | `#1d2a33` | 13.21:1           | 13.08:1        | `#8fa4b3` | 7.31:1              | 6.09:1           |
| night driving text (7:1 bar) |           |                   |                |           | 17.46:1             | 16.26:1          |
| chip: brand 12.5 %           | `#f6e4e3` | 5.33:1            |                |           |                     |                  |
| chip: success 12.5 %         | `#e3ebe6` | 6.66:1            |                |           |                     |                  |
| chip: warning 12.5 %         | `#eee8df` | 6.14:1            |                |           |                     |                  |
| chip: error 12.5 %           | `#f6e4e3` | 5.33:1            |                |           |                     |                  |
| mapText on mapLand / mapRoad |           | 16.85:1 / 18.9:1  |                |           | 14.54:1 / 10.23:1   |                  |

Map colours: land `#f2f2ef`, water `#dde2e3`, road `#ffffff`, motorway `#e7d9a8`,
building `#e2e2dd`, park `#dfe5db`, background `#e9e9e5`.

#### P4 — Kelp (green and terracotta on a green-tinted white)

| Role                         | Day hex   | Day on background | Day on surface | Night hex | Night on background | Night on surface |
| ---------------------------- | --------- | ----------------- | -------------- | --------- | ------------------- | ---------------- |
| textPrimary                  | `#131810` | 15.94:1           | 18.01:1        | `#f2f5ef` | 17.02:1             | 15.7:1           |
| textSecondary                | `#3f4a3a` | 8.25:1            | 9.33:1         | `#c1cbbf` | 11.21:1             | 10.33:1          |
| textTertiary                 | `#4a5546` | 6.94:1            | 7.84:1         | `#a9b5a7` | 8.79:1              | 8.11:1           |
| brandPrimary                 | `#1d5b34` | 7.15:1            | 8.08:1         | `#63b183` | 7.27:1              | 6.7:1            |
| brandSecondary               | `#8c4a12` | 5.99:1            | 6.77:1         | `#d2823f` | 6.25:1              | 5.76:1           |
| success                      | `#1d5b34` | 7.15:1            | 8.08:1         | `#63b183` | 7.27:1              | 6.7:1            |
| warning                      | `#7a4a00` | 6.62:1            | 7.48:1         | `#d8a83c` | 8.55:1              | 7.89:1           |
| error                        | `#a11e18` | 6.85:1            | 7.74:1         | `#e8736a` | 6.33:1              | 5.83:1           |
| info                         | `#14495f` | 8.65:1            | 9.78:1         | `#6fa9c4` | 7.27:1              | 6.7:1            |
| border                       | `#647060` | 4.61:1            | 4.57:1         | `#75806f` | 4.53:1              | 3.74:1           |
| stopPin                      | `#1d5b34` | 7.15:1            | 7.08:1         | `#63b183` | 7.27:1              | 6.01:1           |
| routeLine                    | `#8c4a12` | 5.99:1            | 5.93:1         | `#d2823f` | 6.25:1              | 5.16:1           |
| userLocation                 | `#14495f` | 8.65:1            | 8.57:1         | `#6fa9c4` | 7.27:1              | 6.01:1           |
| night driving text (7:1 bar) |           |                   |                |           | 17.02:1             | 15.7:1           |
| chip: brand 12.5 %           | `#e3ebe6` | 6.66:1            |                |           |                     |                  |
| chip: success 12.5 %         | `#e3ebe6` | 6.66:1            |                |           |                     |                  |
| chip: warning 12.5 %         | `#eee8df` | 6.14:1            |                |           |                     |                  |
| chip: error 12.5 %           | `#f3e3e2` | 6.23:1            |                |           |                     |                  |
| mapText on mapLand / mapRoad |           | 15.79:1 / 18.01:1 |                |           | 14.07:1 / 9.78:1    |                  |

Map colours: land `#eef1ea`, water `#d5e4dd`, road `#ffffff`, motorway `#e8cf72`,
building `#e0e5da`, park `#d4e2c9`, background `#e5eae0`.

#### P5 — Ferry (deep blue and rust on a cool white)

| Role                         | Day hex   | Day on background | Day on surface | Night hex | Night on background | Night on surface |
| ---------------------------- | --------- | ----------------- | -------------- | --------- | ------------------- | ---------------- |
| textPrimary                  | `#111318` | 16.48:1           | 18.58:1        | `#f1f3f8` | 17.14:1             | 15.84:1          |
| textSecondary                | `#414551` | 8.49:1            | 9.57:1         | `#bcc0cc` | 10.47:1             | 9.67:1           |
| textTertiary                 | `#4c505c` | 7.14:1            | 8.05:1         | `#9ea3b1` | 7.55:1              | 6.97:1           |
| brandPrimary                 | `#1f3f8f` | 8.6:1             | 9.7:1          | `#7d9ae0` | 6.86:1              | 6.34:1           |
| brandSecondary               | `#b0451b` | 5.02:1            | 5.66:1         | `#e08148` | 6.71:1              | 6.2:1            |
| success                      | `#14603c` | 6.73:1            | 7.59:1         | `#59b184` | 7.29:1              | 6.74:1           |
| warning                      | `#7a4a00` | 6.64:1            | 7.48:1         | `#d8a83c` | 8.69:1              | 8.03:1           |
| error                        | `#a11e18` | 6.86:1            | 7.74:1         | `#e8736a` | 6.43:1              | 5.94:1           |
| info                         | `#1f3f8f` | 8.6:1             | 9.7:1          | `#7d9ae0` | 6.86:1              | 6.34:1           |
| border                       | `#636675` | 5.05:1            | 5.01:1         | `#6e7280` | 3.97:1              | 3.32:1           |
| stopPin                      | `#1f3f8f` | 8.6:1             | 8.52:1         | `#7d9ae0` | 6.86:1              | 5.74:1           |
| routeLine                    | `#b0451b` | 5.02:1            | 4.97:1         | `#e08148` | 6.71:1              | 5.61:1           |
| userLocation                 | `#1f3f8f` | 8.6:1             | 8.52:1         | `#7d9ae0` | 6.86:1              | 5.74:1           |
| night driving text (7:1 bar) |           |                   |                |           | 17.14:1             | 15.84:1          |
| chip: brand 12.5 %           | `#e3e7f1` | 7.83:1            |                |           |                     |                  |
| chip: success 12.5 %         | `#e2ebe7` | 6.24:1            |                |           |                     |                  |
| chip: warning 12.5 %         | `#eee8df` | 6.14:1            |                |           |                     |                  |
| chip: error 12.5 %           | `#f3e3e2` | 6.23:1            |                |           |                     |                  |
| mapText on mapLand / mapRoad |           | 16.34:1 / 18.58:1 |                |           | 14.34:1 / 9.49:1    |                  |

Map colours: land `#f0f0f3`, water `#d9dfe9`, road `#ffffff`, motorway `#eccb78`,
building `#e4e4ea`, park `#dde5d9`, background `#e7e7ec`.

#### P6 — Clay (burnt sienna and teal on a neutral white)

| Role                         | Day hex   | Day on background | Day on surface | Night hex | Night on background | Night on surface |
| ---------------------------- | --------- | ----------------- | -------------- | --------- | ------------------- | ---------------- |
| textPrimary                  | `#151314` | 16.31:1           | 18.5:1         | `#f5f1ef` | 16.86:1             | 15.57:1          |
| textSecondary                | `#4a4547` | 8.29:1            | 9.4:1          | `#c8c1bd` | 10.65:1             | 9.84:1           |
| textTertiary                 | `#55504f` | 6.99:1            | 7.93:1         | `#afa7a3` | 8:1                 | 7.39:1           |
| brandPrimary                 | `#8c3b1a` | 6.72:1            | 7.62:1         | `#dd8256` | 6.67:1              | 6.16:1           |
| brandSecondary               | `#2f5d5a` | 6.53:1            | 7.41:1         | `#71b3ae` | 7.89:1              | 7.29:1           |
| success                      | `#1d5b34` | 7.12:1            | 8.08:1         | `#59b184` | 7.25:1              | 6.7:1            |
| warning                      | `#7a4a00` | 6.59:1            | 7.48:1         | `#d8a83c` | 8.64:1              | 7.98:1           |
| error                        | `#a11e18` | 6.82:1            | 7.74:1         | `#e8736a` | 6.39:1              | 5.9:1            |
| info                         | `#2f5d5a` | 6.53:1            | 7.41:1         | `#71b3ae` | 7.89:1              | 7.29:1           |
| border                       | `#6b6567` | 5.03:1            | 4.98:1         | `#7d7674` | 4.25:1              | 3.55:1           |
| stopPin                      | `#8c3b1a` | 6.72:1            | 6.65:1         | `#dd8256` | 6.67:1              | 5.57:1           |
| routeLine                    | `#2f5d5a` | 6.53:1            | 6.47:1         | `#71b3ae` | 7.89:1              | 6.6:1            |
| userLocation                 | `#2f5d5a` | 6.53:1            | 6.47:1         | `#71b3ae` | 7.89:1              | 6.6:1            |
| night driving text (7:1 bar) |           |                   |                |           | 16.86:1             | 15.57:1          |
| chip: brand 12.5 %           | `#f1e7e2` | 6.27:1            |                |           |                     |                  |
| chip: success 12.5 %         | `#e3ebe6` | 6.66:1            |                |           |                     |                  |
| chip: warning 12.5 %         | `#eee8df` | 6.14:1            |                |           |                     |                  |
| chip: error 12.5 %           | `#f3e3e2` | 6.23:1            |                |           |                     |                  |
| mapText on mapLand / mapRoad |           | 16.15:1 / 18.5:1  |                |           | 14.09:1 / 9.84:1    |                  |

Map colours: land `#f1efef`, water `#dbe2e0`, road `#ffffff`, motorway `#e9d3a4`,
building `#e3e0e1`, park `#dde4da`, background `#e8e5e6`.

**The rejected palettes are deliberately not in this list.** Roadbook's cream `#F4F1EA` with kraft
amber `#8A4B00` is the paper-and-ledger look §13.6 bans; Beacon's teal `#0B5A61` on `#EDF1F2` is
the calm-and-empty look the founder called plain; Freight's highway orange `#B03A0A` on hard
blocks is the parcel-label look. P1 keeps the orange but loses the paper; P3 keeps the red but
loses the label.

### 5.3 Motion references

**The engine.** Reanimated 4 (`react-native-reanimated` 4.7.1, MIT, installed), with
`react-native-worklets` 0.13.0 under it. The spring API is documented at
https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring/ (read 2026-10-22).

**The documented defaults, for reference** (Reanimated docs, 2026-10-22): physics form —
`damping 120`, `stiffness 900`, `mass 4`, `energyThreshold 6e-9`, `velocity 0`,
`overshootClamping false`; duration form — `duration 550` (perceptual; the real time is 1.5
times it), `dampingRatio 1` (1 is critically damped). `reduceMotion` defaults to
`ReduceMotion.System`. `stiffness`/`damping` and `duration`/`dampingRatio` cannot be mixed.

**Our proposed motion tokens.** These are **proposals for the ten directions**, not measurements
of a library; the direction that picks one adopts it as its motion language and the QA team
records it in `apps/mobile/src/motion/`. Durations stay inside the 150–250 ms band of
`SYSTEM.md` §5; a spring is how a value gets there.

| Token      | Form     | Values                                                                 | What it is for                              | Why                                                                                                       |
| ---------- | -------- | ---------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `settle`   | physics  | `damping 26, stiffness 220, mass 1.1, overshootClamping true`          | The next stop arriving; the number changing | Critically damped in feel, no bounce: the driver sees a fact settle, not a toy spring                     |
| `sheet`    | physics  | `damping 30, stiffness 260, mass 1.2, velocity from the gesture`       | A sheet opened by a swipe                   | The sheet follows the driver's thumb, then settles; the velocity comes from the gesture, not from a curve |
| `confirm`  | duration | `duration 220, dampingRatio 0.86`                                      | The delivery confirmation                   | A hair of overshoot, once, and only for the confirmation — the one moment allowed to feel good            |
| `reject`   | duration | `duration 180, dampingRatio 1`                                         | A refused or failed action                  | Critically damped: a refusal must not bounce                                                              |
| `enter`    | timing   | `duration 150`                                                         | A row or a panel arriving                   | The house band; no spring, because there is nothing to throw                                              |
| `voiceBar` | physics  | `damping 34, stiffness 320, mass 0.9`                                  | The voice bar changing state                | Fast and tight; the bar must never lag the microphone                                                     |
| `reduce`   | —        | `duration 0` on every spring, with `reduceMotion: ReduceMotion.System` | When the system asks for less motion        | Same motion, no travel: the state still changes, it just arrives                                          |

**The rules that go with them.**

1. One spring per gesture. The value the finger moved is the value the spring starts from.
2. Nothing loops. A repeat animation must carry information.
3. The confirmation is the only place an overshoot is allowed, and it is allowed once.
4. The map camera moves with a spring too: a camera move that overshoots looks broken on a
   screen that is being read at speed.
5. "Reduce motion" is the same motion with the travel removed. The state change is still seen.

**References worth reading in this area** (all read 2026-10-22): the Material 3 motion physics
system (https://m3.material.io/styles/motion/overview/how-it-works), the Reanimated spring
reference (the URL above), and `LegendApp/legend-motion` (450 stars, MIT) as a readable
vocabulary.

### 5.4 Map styles

The map is a **document we own** (`maplibre/maplibre-style-spec` v26.4.4, read 2026-10-22), not a
picture. Every direction ships a `style.json` with its day and night variants, edited in Maputnik.

| Style                                                                                                                                                                                                 | Licence                                                                                                                                                                                                                                                                                                                                       | What to copy                                                                                                                                                                                          | What we must do                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Protomaps basemaps** (https://github.com/protomaps/basemaps)                                                                                                                                        | **Code: BSD-3-Clause. Visual design of the styles: CC0** (public-domain dedication) (https://github.com/protomaps/basemaps/blob/main/LICENSE.md, read 2026-10-22). Data: OSM under the **ODbL**, Natural Earth in the public domain, some Mapzen icon derivatives under MIT (https://github.com/protomaps/basemaps/blob/main/LICENSE_DATA.md) | The clearest, most restrained modern basemap: thin roads, a quiet land colour, a motorway that is the only loud thing, labels that step down in size. **The reference style for all ten directions.** | Keep the attribution: "© OpenStreetMap contributors" and the ODbL notice, on the map and in the app's about page.                                                                               |
| **OpenMapTiles styles** (OSM Bright, Fiord Color, MapTiler Toner, OSM Liberty, and CARTO's Positron, which the schema was modelled on with permission) (https://github.com/openmaptiles/openmaptiles) | **Code: BSD-3-Clause** (https://github.com/openmaptiles/openmaptiles/blob/master/LICENSE.md, read 2026-10-22). The data under it is OSM/ODbL                                                                                                                                                                                                  | Toner's hierarchy (water, then roads, then labels) and Positron's restraint — the two best-known open map styles.                                                                                     | The data is still ODbL, so the attribution and the share-alike terms travel with our pack.                                                                                                      |
| **MapTiler Basic GL style** (https://github.com/openmaptiles/maptiler-basic-gl-style)                                                                                                                 | **Code: BSD-3-Clause**, derived from Mapbox Open Styles (https://github.com/openmaptiles/maptiler-basic-gl-style/blob/master/LICENSE.md, read 2026-10-22)                                                                                                                                                                                     | The simplest possible style, which is where we start: fewer layers, more contrast, one accent colour for the route.                                                                                   | The same ODbL duty. The current MapTiler cloud styles are commercial — we do not use them.                                                                                                      |
| **MapLibre demo tiles and styles** (https://github.com/maplibre/demotiles)                                                                                                                            | **BSD-3-Clause** (https://github.com/maplibre/demotiles/blob/gh-pages/LICENSE, read 2026-10-22)                                                                                                                                                                                                                                               | The world, OSM Bright and terrain styles used by the tests — a clean, fast starting point for the pipeline.                                                                                           | —                                                                                                                                                                                               |
| **Mapbox GL JS styles** (https://github.com/mapbox/mapbox-gl-js)                                                                                                                                      | **Proprietary** — the current Mapbox styles are not open (the API reports `NOASSERTION`); the old "Mapbox Open Styles" are BSD-3-Clause                                                                                                                                                                                                       | The style _language_ everyone copies, and the way a pin changes shape with the state of a stop.                                                                                                       | We may not copy a current Mapbox style. The open ones are BSD-3-Clause and may be used with the notice.                                                                                         |
| **OpenStreetMap data** (https://www.openstreetmap.org/copyright)                                                                                                                                      | **ODbL 1.0.** "If you alter or build upon our data, you may distribute the result only under the same license." Two duties: credit OpenStreetMap **and** say the data is under the ODbL                                                                                                                                                       | The data itself, and the way a community map reads.                                                                                                                                                   | The attribution must be visible even when the only thing on screen is the downloaded pack. Our own pack is a derivative, so the ODbL terms apply to it.                                         |
| **LINZ data (New Zealand)** (https://www.linz.govt.nz/products-services/data/licensing-and-using-data/attributing-linz-data)                                                                          | **CC BY 4.0** — "Sourced from the LINZ Data Service and licensed for reuse under the CC BY 4.0 licence"                                                                                                                                                                                                                                       | NZ roads, addresses, and the aerial imagery for the optional download.                                                                                                                                | The LINZ attribution line, exactly as LINZ writes it. Aerial imagery and elevation need a **different** attribution, because LINZ does not own that copyright — the Canterbury LiDAR layers do. |
| **Natural Earth** (https://www.naturalearthdata.com/about/terms-of-use/)                                                                                                                              | **Public domain**                                                                                                                                                                                                                                                                                                                             | The country and coastline shapes in the demo tiles and the basemap build.                                                                                                                             | No attribution is required, but the credit costs nothing.                                                                                                                                       |

**The rules for the map in every direction:**

1. Three layers maximum at night: the route, the stops, the labels. Nothing else.
2. One accent colour in the map, and it is the direction's `brandPrimary`.
3. The map never competes with the address: the address panel is opaque and above it.
4. A style is a file in the repository, versioned, with a day and a night variant, and it is
   rendered from our own tiles so it works offline.
5. The attribution is in the map and in the about page, because the ODbL requires it.

---

## 6. The verdict — the ten seeds

These are the ten seeds the direction teams may build on. **No design yet**: a seed is the idea,
the question the direction answers, and the palette, type and map references it starts from. Each
must be genuinely different from the others **and** from the three rejected directions
(Roadbook: a paper ledger; Beacon: one calm thing; Freight: a parcel label).

| #   | Seed              | The one-line idea                                                                                                                                                            | Starts from                                                                 |
| --- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | **Control Room**  | The run as an instrument panel: the map is the interface, the next move is the only bright thing on screen, and every number is a gauge rather than a label.                 | P3 Signal, pairing C, Protomaps style                                       |
| 2   | **Topo**          | The Canterbury landscape is the identity: contour hairlines taken from the survey layer, a topographic calm, and a route that reads like a map a pilot would fly.            | P4 Kelp, pairing D, Protomaps style with contour layers                     |
| 3   | **Address First** | The address is typeset like an editorial headline, the run is a vertical spine of addresses, and everything else is an annotation under it.                                  | P2 Harbour, pairing B, the OpenMapTiles basic style recoloured              |
| 4   | **Voice Ribbon**  | The companion is the interface: a live amplitude ribbon along the bottom edge replaces buttons, and the motion is driven by the microphone.                                  | P6 Clay, pairing A, Protomaps style                                         |
| 5   | **X-ray Parcel**  | The parcel is the hero object: a dimensional parcel with its label and its handling marks, and the delivery is a physical act with a physical finish.                        | P1 HiVis, pairing D, MapLibre 3D buildings style                            |
| 6   | **Scanline**      | The scanner sets the language: ruled bands, crop marks and monospaced data, so a scanned address and a typed address look like the same machine.                             | P3 Signal, pairing C, OpenMapTiles Bright                                   |
| 7   | **Depot Ops**     | A separate identity for the dispatcher's web board: dense, dark, live, and built for someone who stares at it all day — a different audience, a different surface.           | P5 Ferry, pairing C, the OpenMapTiles OSM Bright style recoloured for night |
| 8   | **Weatherlight**  | The palette and the contrast of the app follow the day's light and weather: a cold, clear morning and a low-contrast dusk are two ends of one scale.                         | P2 Harbour, pairing E, Protomaps style with a data-driven tint              |
| 9   | **Haptic City**   | A motion-and-touch-first identity where every state change is a physical gesture and colour is used almost nowhere.                                                          | P4 Kelp, pairing A, MapLibre style with a monochrome ramp                   |
| 10  | **Night Shift**   | The night-driving screen designed as the hero, with a real day version behind it: a high-contrast instrument look, low blue, and a physical switch metaphor between the two. | P6 Clay, pairing B, Protomaps night style                                   |

**How the ten stay different:** four of them (1, 3, 5, 10) put a different object at the centre of
the screen — the run, the address, the parcel, the night road. Three of them (2, 6, 7) take their
language from a different discipline — the survey chart, the machine interface, the operations
board. Two of them (4, 9) make the voice or the touch the interface itself. One of them (8) makes
the light of the day the parameter. No two share a centre object, a discipline, or a signature
moment.

**The signature moment each direction must name** (this is the question the founder asks at the
pick): how a delivery is confirmed, how the map moves, how the companion appears. A direction
that cannot answer it has not designed anything.

---

## 7. The verifier pass and the query log

### 7.1 The verifier pass

The pass re-reads the evidence from the source, not from the snapshot: every fifth repository of
the 124 was fetched again from the live GitHub API and compared with the row in
`github-repos-research2-2026-10-22.tsv` (stars, licence, latest release and its date, the archived
flag). The script is `scripts/verify-design-research2-evidence.ps1`; the result is
`docs/design/evidence/verifier-pass-2026-10-22.tsv`.

**Result: 25 repositories re-read, 23 confirmed, 2 corrected, 0 unreadable.**

| Correction forced    | What changed                                                                                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `obra/superpowers`   | stars 303 176 → 303 191 (the count moved in the minutes between the two reads; the snapshot keeps the value of its own reading, and the document quotes the snapshot) |
| `pbakaus/impeccable` | stars 84 467 → 84 482 (same)                                                                                                                                          |

The pass also forced two corrections earlier in the day, before the snapshot was written: ten of
the first candidate names did not resolve (`facelessuser/colorjs.io`, `MiSawa/color`,
`ctrl/tinycolor`, `KhronosGroup/3D-Tiles`, `maplibre/maplibre-demotiles`, `icon-park/icon-park`,
`sketchbubble/undraw`, `likethedata/gift`, `dequelabs/axe-core-react-native`, `IBM/equal-access`),
and the real names were found by the GitHub search API and written into the pool: `color-js/color.js`,
`bgrins/TinyColor`, `CesiumGS/3d-tiles`, `maplibre/demotiles`, `bytedance/IconPark`,
`readpage/undraw-ui`, `phosphor-icons/core`, `IBMa/equal-access`. **A row that names a repository
that does not exist is worse than no row**, which is why the licence of every entry is read from
the repository's own file when the API cannot detect it.

### 7.2 The query log

Everything below was run on **2026-10-22**, in this order.

| #   | What was asked                                                                                                                                                                                                                                                                                          | Where                                                              | What it produced                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| 1   | A repository snapshot: stars, forks, created, pushed, last commit, licence, latest release and its date, release count, open issues, archived flag, for 130 candidate repositories                                                                                                                      | GitHub GraphQL API (`scripts/fetch-design-research2-evidence.ps1`) | 124 repositories in `github-repos-research2-2026-10-22.tsv`; 10 names did not resolve                   |
| 2   | "color.js in:name", "tinycolor", "3D-Tiles", "demotiles", "icon-park", "undraw", "gift charts", "axe-core-react-native", "equal-access"                                                                                                                                                                 | GitHub search API                                                  | The corrected repository names listed in §7.1                                                           |
| 3   | The licence files of `protomaps/basemaps` (`LICENSE.md`, `LICENSE_DATA.md`), `openmaptiles/openmaptiles` (`LICENSE.md`), `openmaptiles/maptiler-basic-gl-style` (`LICENSE.md`), `maplibre/demotiles` (`LICENSE`)                                                                                        | raw.githubusercontent.com                                          | The BSD-3-Clause, **CC0** and ODbL facts of §5.4                                                        |
| 4   | The family metadata (`METADATA.pb`) of fraunces, robotoflex, bricolagegrotesque, instrumentsans, spacegrotesk                                                                                                                                                                                           | GitHub contents API                                                | The variable axes of §1.5                                                                               |
| 5   | The presence of `OFL.txt` in 40 candidate families under `google/fonts/ofl/`                                                                                                                                                                                                                            | GitHub contents API                                                | The licences of §5.1; the two families without one are marked unverified                                |
| 6   | "Apple Design Awards 2025 winners list iOS apps"                                                                                                                                                                                                                                                        | web search                                                         | The 2025 winners and finalists of §3.1                                                                  |
| 7   | "2026 Apple Design Awards winners finalists announced WWDC26"                                                                                                                                                                                                                                           | web search                                                         | The 2026 winners (announced 2026-06-02) and the 36 finalists                                            |
| 8   | "Awwwards mobile site of the month 2026 winner app interface"                                                                                                                                                                                                                                           | web search                                                         | The mobile collection and the three references of §3.1                                                  |
| 9   | "Apple iOS 26 Liquid Glass design language HIG 2025 changes"                                                                                                                                                                                                                                            | web search                                                         | The Liquid Glass evidence of §1.1 and §1.4                                                              |
| 10  | "Material 3 Expressive 2025 motion shape design update Google"                                                                                                                                                                                                                                          | web search                                                         | The motion-physics and shape evidence of §1.1                                                           |
| 11  | "Android Car Mode API driver distraction guidelines glanceable UI NHTSA"                                                                                                                                                                                                                                | web search                                                         | The 120-character, three-tap and 1–3-line limits of §1.8                                                |
| 12  | "Circuit courier delivery app New Zealand drivers app"                                                                                                                                                                                                                                                  | web search                                                         | The fact that **Spoke is the renamed Circuit Route Planner** (rebranded 2025-10-23 in our own teardown) |
| 13  | Page fetches: the Apple award pages, the App Store story pages, `protomaps.com/legal`, `openstreetmap.org/copyright`, `w3.org/TR/WCAG22/`, `w3.org/TR/css-color-4/`, the Reanimated `withSpring` reference, the Expo haptics and audio references, the Material motion page, the Android car guidelines | HTTP                                                               | Every citation of §1 and §4, each read on the day                                                       |
| 14  | The status of 81 reference URLs                                                                                                                                                                                                                                                                         | `scripts/check-design-research2-reference-urls.ps1`                | 73 answered 200; 8 are blocked by the hosts' bot protection and are named in §8                         |
| 15  | Six palettes measured against the token package's own contrast maths                                                                                                                                                                                                                                    | `scripts/design/measure-palettes.mjs`                              | 240 measurements, all above their bar (§5.2)                                                            |
| 16  | The verifier pass of §7.1                                                                                                                                                                                                                                                                               | `scripts/verify-design-research2-evidence.ps1`                     | 23 confirmed, 2 star counts moved                                                                       |

---

## 8. What we could not verify

Stated plainly, because a research file that hides its gaps is worse than no file.

1. **Licences the GitHub API could not detect.** The API reports `NOASSERTION` or nothing for
   these repositories, so their licence is **unverified** until the repository's own licence file
   is read: `gluestack-ui/gluestack-ui`, `jpudysz/react-native-unistyles`,
   `react-navigation/react-navigation`, `lucide-icons/lucide`, `maplibre/maplibre-gl-js`,
   `maplibre/maplibre-style-spec`, `protomaps/PMTiles`, `maptiler/tileserver-gl`,
   `mapbox/mapbox-gl-js` (Mapbox's current styles are under Mapbox's own terms, not an open
   licence — read those terms before using anything of it), `tyrasd/overpass-turbo`,
   `gka/chroma.js`, `FormidableLabs/victory`, `FormidableLabs/victory-native-xl`,
   `visgl/loaders.gl`, `CesiumGS/3d-tiles`, `SchroederNathan/react-native-motion`,
   `anthropics/skills`, `vercel-labs/agent-skills`, `tldraw/tldraw`, `uswds/public-sans` and
   `w3c/wcag`.
2. **Licences that were unverified by the API and then read directly**, so the file states the
   licence and not a guess: `protomaps/basemaps` (code BSD-3-Clause, **the visual design of the
   styles CC0**), `openmaptiles/openmaptiles` (BSD-3-Clause),
   `openmaptiles/maptiler-basic-gl-style` (BSD-3-Clause), `maplibre/demotiles` (BSD-3-Clause),
   `IBMa/equal-access` (Apache-2.0), and `google/fonts` (SIL OFL 1.1 per family, checked for the
   forty families of §5.1 — the repository itself reports no single licence).
3. **Eight URLs are blocked to our checker** by the host's bot protection, not because they are
   dead: `developer.apple.com/design/awards/2026/`, `blog.google/products/android/material-3-expressive-android-wearos-launch`,
   `developer.apple.com/documentation/uikit/uihapticfeedbackgenerator`,
   `developer.android.com/develop/ui/compose/touch-input/pointer-input/haptics`,
   `commercialtype.com/gotham/`, `uber.com/global/en/driver/`, `amazon.com/flex` and
   `revolut.com`. Each of those eight was read through the search index of that day and is
   quoted from what it returned; the status file records the block.
4. **The award apps whose own sites we did not verify.** Tide Guide, Moonlitt, Metaballs and
   Feather have no confirmed first-party URL in our list, so their rows cite the Apple award
   pages instead. Their behaviour is described from Apple's own award text of 2025-06-03 and
   2026-06-02, which is what the award is for.
5. **No frame rate was measured.** The motion values in §5.3 are proposals; the emulator run of
   §13.5 measures what they cost. The bench of `docs/design/BENCH.md` still has its fps cells
   open for the same reason.
6. **The star counts are a snapshot**, not a trend. The stargazers endpoint is not readable with
   our token, so no "stars gained in six months" figure appears anywhere in this file.
7. **No award was inferred.** Where we could not read Apple's list, we did not name an app.

---

_Research: Design Research & Trends, 2026-10-22. Evidence: `docs/design/evidence/`. The next
step is the ten directions of MASTER_EXECUTION §13.6, built on these seeds, with the four screens
(Today, Driving with 3D map, Copilot voice, Scanner) in light and night, and the QA gate of §4
run against each one._
