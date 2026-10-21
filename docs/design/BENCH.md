# The library bench — what we build the app with

**MASTER_EXECUTION §13.4 (the Design Studio bench). Read this with `docs/design/RESEARCH.md`.**

**Bench date: 2026-10-22.** Every version, licence, size and publish date was read from the npm
registry on that day and is in `docs/design/evidence/npm-packages-2026-10-22.tsv`. Every score
is a judgement against the bar of `docs/design/SYSTEM.md`, and every judgement that could not
be measured is written **UNVERIFIED** — there is no invented frame rate, no invented bundle
size and no invented score anywhere in this document.

**56 libraries** are scored below, across the ten dimensions of the bar: visual polish, the
60/120 fps budget, spring physics, shared elements, accessibility, the bundle size, the
licence, the New Architecture, the maintenance and the fit with React Native 0.88 / Expo SDK 58.

---

## 1. The bar, and the scale

| Dimension      | What "3" means                                                                 |
| -------------- | ------------------------------------------------------------------------------ |
| Visual polish  | A coherent, finished look with a real type scale — not a kit's default surface |
| Frame budget   | The work runs on the UI thread; **the measured fps is UNVERIFIED** until the emulator run |
| Spring physics | A real spring with a damping ratio we can set to 1 (no overshoot)              |
| Shared elements| A transition that can carry meaning, with a duration we can set                 |
| Accessibility  | Labels, roles, focus order and a reduce-motion branch are the library's job, not ours |
| Bundle size    | The npm unpacked size — a proxy, not the APK contribution (the native code is not in the tarball) |
| Licence        | MIT, BSD, Apache or ISC — nothing copyleft reaches the shipped app              |
| New Architecture| Fabric and TurboModules, the only architecture we ship                       |
| Maintenance    | A release in the last six months and a commit in the last ninety days          |
| RN 0.88 / Expo 58 | Bundled in SDK 58, or a dev build we already run                              |

**The scale:** 3 = meets the bar by construction or by its own documentation · 2 = meets it
with a configuration or a caveat · 1 = partial · 0 = does not meet it · **UNVERIFIED** = not
measured.

### What is UNVERIFIED, and why

| The number                                         | Why it is not measured                                                                                     |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **The frame rate of every library**               | There is no emulator on the design machine. A frame rate without a CI artefact is not verified (MASTER_EXECUTION §7.6), so the cell states whether the work runs on the **UI thread** — a fact about the library — and marks the measured fps **UNVERIFIED**. The emulator run of §13.5 fills the column in. |
| **The APK contribution of a library**             | The npm unpacked size counts the JavaScript and the sources, not the `.so` or the `.aar`. It is fair between two packages of the same kind and nothing more. |
| **The startup cost of a library**                 | Not measured. The cell carries the New Architecture fit instead, which is what decides whether a library can run at all on RN 0.88. |
| **The accessibility of a library**                | Judged from the library's own source, its release notes and its documentation — not from a screen-reader run on a device. Our own accessibility gate is a manual review with a real device (MASTER_EXECUTION §13.5). |

---

<!-- TABLES:START -->
## 2. The bench — every candidate against our bar

The first table is the design capability: how polished it is, how it moves, and how it treats the driver who cannot see or cannot tap quickly. The second table is the engineering fact: the size, the licence, the New Architecture, the maintenance and the fit with React Native 0.88 and Expo SDK 58.

### 2.1 The design capability

| Library | Visual polish | Frame budget | Spring physics | Shared elements | Accessibility |
| --- | --- | --- | --- | --- | --- |
| `react-native-reanimated` | 3 | 2 (UI thread; measured fps UNVERIFIED) | 3 (a spring with a damping ratio we can set to 1) | 2 (the shared transitions are off by default and default to 500 ms) | 2 (the reduce-motion setting needs our own subscription) |
| `react-native-worklets` | 2 | 2 (UI thread; measured fps UNVERIFIED) | 3 | 2 | 2 |
| `react-native-gesture-handler` | 2 | 3 (gestures on the UI thread; measured fps UNVERIFIED) | 2 | 2 | 2 |
| `react-native-unistyles` | 2 | 3 (no re-render on a style change; measured fps UNVERIFIED) | 0 | 1 | 2 |
| `@shopify/flash-list` | 2 | 3 (it recycles the rows; measured fps UNVERIFIED) | 0 | 0 | 2 |
| `react-native-svg` | 3 | 3 (native; measured fps UNVERIFIED) | 0 | 1 | 2 |
| `react-native-screens` | 1 | 2 | 0 | 2 | 2 |
| `react-native-safe-area-context` | 1 | 2 | 0 | 0 | 2 |
| `@expo/vector-icons` | 3 | 2 | 0 | 0 | 2 |
| `@expo-google-fonts/figtree` | 2 | 2 | 0 | 0 | 1 |
| `expo-symbols` | 2 | 2 | 0 | 0 | 2 |
| `@swmansion/react-native-bottom-sheet` | 3 | 3 (the geometry is computed in C++; measured fps UNVERIFIED) | 3 (a real critically damped spring on both platforms) | 0 | 2 |
| `@gorhom/bottom-sheet` | 3 | 2 (measured fps UNVERIFIED) | 2 (a spring, not the platform one) | 2 | 1 |
| `@lodev09/react-native-true-sheet` | 3 | 2 | 3 | 2 | 3 |
| `react-native-mmkv` | 0 | 2 | 0 | 0 | 1 |
| `react-native-nitro-modules` | 0 | 2 | 0 | 0 | 0 |
| `@op-engineering/op-sqlite` | 0 | 2 | 0 | 0 | 0 |
| `react-native-localize` | 0 | 1 | 0 | 0 | 1 |
| `@react-navigation/native` | 1 | 2 | 0 | 0 | 2 |
| `@react-navigation/bottom-tabs` | 2 | 2 | 1 | 1 | 2 |
| `@react-navigation/native-stack` | 1 | 2 | 0 | 2 | 2 |
| `@bottom-tabs/react-navigation` | 3 | 2 | 2 (an animated shared indicator) | 2 | 2 |
| `react-native-paper` | 3 | 1 | 1 | 1 | 3 (the accessible modal work of 2026) |
| `@ui-kitten/components` | 2 | 1 | 1 | 0 | 2 |
| `react-native-ui-lib` | 2 | 1 | 1 | 0 | 1 |
| `heroui-native` | 2 | 1 | 1 | 1 | 2 |
| `@gluestack-ui/themed` | 2 | 1 | 1 | 1 | 3 |
| `tamagui` | 3 | 2 | 2 | 2 | 2 |
| `@shopify/restyle` | 2 | 2 | 0 | 0 | 1 |
| `react-native-tab-view` | 1 | 1 | 1 | 2 | 1 |
| `moti` | 2 | 2 | 2 | 0 | 1 |
| `react-native-redash` | 2 | 1 | 2 | 0 | 0 |
| `react-native-ease` | 2 | 3 (platform animations, no JS; measured fps UNVERIFIED) | 1 (the platform springs) | 0 | 1 |
| `number-flow-react-native` | 2 | 2 (measured fps UNVERIFIED) | 0 | 0 | 2 |
| `@legendapp/motion` | 2 | 2 | 2 | 1 | 1 |
| `react-native-reanimated-dnd` | 2 | 2 | 2 | 0 | 1 |
| `react-native-reorderable-list` | 2 | 2 | 1 | 0 | 1 |
| `react-native-draggable-flatlist` | 2 | 1 | 1 | 0 | 1 |
| `react-native-swipeable-list` | 2 | 1 | 1 | 0 | 1 |
| `react-native-haptic-feedback` | 1 | 2 | 0 | 0 | 1 |
| `react-native-zoom-toolkit` | 2 | 2 | 1 | 0 | 1 |
| `react-native-modalize` | 1 | 1 | 1 | 1 | 1 |
| `lottie-react-native` | 3 | 2 (measured fps UNVERIFIED) | 0 | 0 | 1 |
| `@rive-app/react-native` | 3 | 2 (measured fps UNVERIFIED) | 1 | 0 | 1 |
| `@shopify/react-native-skia` | 3 | 2 (measured fps UNVERIFIED) | 0 | 1 | 1 |
| `react-native-skia` | 3 | 2 (measured fps UNVERIFIED) | 0 | 1 | 1 |
| `expo-haptics` | 1 | 2 | 0 | 0 | 2 |
| `expo-location` | 0 | 2 | 0 | 0 | 2 |
| `expo-audio` | 0 | 2 | 0 | 0 | 2 |
| `expo-blur` | 0 | 1 | 0 | 0 | 1 |
| `expo-linear-gradient` | 0 | 1 | 0 | 0 | 1 |
| `react-native-sherpa-onnx` | 0 | 2 | 0 | 0 | 1 |
| `react-native-view-shot` | 1 | 2 | 0 | 0 | 1 |
| `@testing-library/react-native` | 0 | 1 | 0 | 0 | 1 |
| `maplibre-gl` | 3 | 2 (measured fps UNVERIFIED) | 0 | 0 | 1 |
| `@maplibre/maplibre-react-native` | 3 | 2 (measured fps UNVERIFIED) | 0 | 0 | 1 |

### 2.2 The engineering fact

| Library | Version | Unpacked size (kB) | Licence | New Architecture | RN 0.88 / Expo 58 | Maintenance | Recommendation | Why |
| --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| `react-native-reanimated` | 4.7.1 | 4885 | MIT | 3 | 3 (Expo SDK 58 bundles 4.7.1) | published 2026-10-20 · last commit 2026-10-21 · release 2026-10-02 | **KEEP (locked)** | The only engine that keeps the frame budget; the durations and the spring come from the tokens. |
| `react-native-worklets` | 0.13.0 | 17409 | MIT | 3 | 3 (Expo SDK 58 bundles 0.13.0) | published 2026-10-20 · last commit 2026-03-26 | **KEEP (locked) and declare it** | The runtime under Reanimated 4; today it is only a transitive peer. |
| `react-native-gesture-handler` | 3.4.0 | 3190 | MIT | 3 | 3 (the SDK 58 compatibility is proven by a merged upstream PR) | published 2026-10-20 · last commit 2026-10-21 · release 2026-10-16 | **KEEP (locked)** | The gestures of the swipe-to-deliver and of the sheet. |
| `react-native-unistyles` | 3.6.0 | 1836 | MIT | 3 | 2 (a dev build, not bundled in SDK 58) | published 2026-10-21 · last commit 2026-10-21 · release 2026-10-21 | **KEEP (locked)** | The styling engine; the tokens stay plain TypeScript. |
| `@shopify/flash-list` | 2.3.3 | 830 | MIT | 3 | 3 (SDK 58 bundles 2.3.2) | published 2026-10-01 · last commit 2026-10-01 · release 2026-10-01 | **KEEP and install** | The 300-stop list at 60 fps is a hard requirement and it is not installed today. |
| `react-native-svg` | 15.16.0 | 3738 | MIT | 3 | 3 (SDK 58 bundles 15.16.0) | published 2026-10-15 · last commit 2026-10-15 · release 2026-10-15 | **KEEP (bundled)** | The vector layer under the custom icons and the route ribbon. |
| `react-native-screens` | 4.30.0 | 3597 | MIT | 3 | 3 (SDK 58 bundles 4.30.0) | published 2026-10-20 · last commit 2026-10-21 · release 2026-10-13 | **KEEP (bundled)** | The navigator. |
| `react-native-safe-area-context` | 5.10.1 | 243 | MIT | 3 | 3 (SDK 58 bundles 5.10.1) | published 2026-09-29 · last commit 2026-10-21 · release 2026-09-29 | **KEEP (bundled)** | The insets of the device. |
| `@expo/vector-icons` | 15.1.1 | 5874 | MIT | 3 | 2 (the icon fonts are not in the SDK bundle) | published 2026-09-23 · last commit 2026-10-19 · release 2026-10-19 | **KEEP (locked)** | The one icon set of the product. |
| `@expo-google-fonts/figtree` | 0.4.1 | 1923 | MIT AND OFL-1.1 | 3 | 3 | published 2025-09-12 · last commit 2026-10-21 | **USE (locked)** | Figtree is the type face of the contract; the licence is "MIT AND OFL-1.1". |
| `expo-symbols` | 58.0.4 | 264 | MIT | 3 | 3 (SDK 58 bundles it) | published 2026-10-15 · last commit 2026-10-21 · release 2026-10-21 | **WATCH** | SF Symbols on iOS; we ship one icon set, so this is a later decision. |
| `@swmansion/react-native-bottom-sheet` | 0.17.0 | 337 | MIT | 3 | 2 (it needs a dev build and has no Expo plugin) | published 2026-10-18 · last commit 2026-10-21 · release 2026-10-18 | **PILOT** | The only sheet whose physics match our rule by construction. |
| `@gorhom/bottom-sheet` | 5.2.14 | 1298 | MIT | 2 | 3 | published 2026-05-09 · last commit 2026-05-09 · release 2026-05-09 | **WATCH, do not adopt** | Three open pull requests hit Reanimated 4, the reduce-motion setting and the screen reader. |
| `@lodev09/react-native-true-sheet` | 3.11.18 | 1176 | MIT | 3 | 3 (it peers on Expo Router 57 and later) | published 2026-10-21 · last commit 2026-10-21 · release 2026-10-02 | **WATCH, benchmark against the pilot** | The best-maintained sheet of the pool. |
| `react-native-mmkv` | 4.3.2 | 186 | MIT | 3 | 3 | published 2026-06-22 · last commit 2026-09-14 · release 2026-06-22 | **KEEP (storage)** | The offline queue; not a design library, but it is under the same budget. |
| `react-native-nitro-modules` | 0.37.1 | 567 | MIT | 3 | 3 | published 2026-10-21 · last commit 2026-10-20 · release 2026-08-27 | **KEEP (locked)** | The native bridge under Unistyles and MMKV. |
| `@op-engineering/op-sqlite` | 18.2.5 | 343780 | MIT | 3 | 3 | published 2026-09-20 · last commit 2026-09-29 · release 2026-09-20 | **KEEP (locked)** | The event log of the sync. |
| `react-native-localize` | 3.7.2 | 214 | MIT | 3 | 3 | published 2026-09-15 · last commit 2026-09-15 · release 2026-09-15 | **KEEP** | The localisation and the right-to-left dependency. |
| `@react-navigation/native` | 7.5.1 | 286 | MIT | 3 | 3 | published 2026-10-13 · last commit 2026-10-21 · release 2026-10-13 | **KEEP (locked)** | The router of the app. |
| `@react-navigation/bottom-tabs` | 7.21.0 | 407 | MIT | 3 | 3 | published 2026-10-13 · last commit 2026-10-21 · release 2026-10-13 | **KEEP (locked)** | The tab bar of the app. |
| `@react-navigation/native-stack` | 7.21.0 | 257 | MIT | 3 | 3 | published 2026-10-13 · last commit 2026-10-21 · release 2026-10-13 | **KEEP (locked)** | The stack of the app. |
| `@bottom-tabs/react-navigation` | 1.5.0 | 63 | MIT | 3 | 3 | published 2026-10-21 · last commit 2026-10-21 · release 2026-10-21 | **WATCH** | The animated tab bar is the one piece we may want. |
| `react-native-paper` | 5.15.3 | 3680 | MIT | 2 | 2 | published 2026-06-15 · last commit 2026-10-21 · release 2026-05-26 | **READ, do not install** | The only kit that shipped accessibility work in 2026; the Material 3 look is not ours. |
| `@ui-kitten/components` | 6.2.1 | 2775 | MIT | 2 | 3 | published 2026-10-06 · last commit 2026-10-06 · release 2026-10-06 | **READ only** | One maintainer, and a look we do not want. |
| `react-native-ui-lib` | 9.1.3 | 2578 | MIT | 2 | 2 | published 2026-09-06 · last commit 2026-10-12 · release 2026-06-28 | **READ only** | A screen gallery worth looking at, a slow release train. |
| `heroui-native` | 1.0.11 | 5195 | Apache-2.0 | 2 | 3 | published 2026-10-20 · last commit 2026-10-20 · release 2026-10-20 | **REJECT** | NativeWind and expo-blur: both barred by our rules. |
| `@gluestack-ui/themed` | 1.1.73 | 944 | ISC | 2 | 2 | published 2025-09-10 · last commit 2026-09-02 · release 2026-06-25 | **REJECT** | The best a11y primitives and a Tailwind-shaped system; the root has no licence file. |
| `tamagui` | 3.1.2 | 5235 | MIT | 3 | 3 | published 2026-10-21 · last commit 2026-10-21 · release 2026-10-21 | **WATCH** | Its compile-time token flattening is the idea worth stealing. |
| `@shopify/restyle` | 2.4.5 | 90 | MIT | 3 | 2 | published 2026-04-16 · last commit 2026-09-29 · release 2025-03-19 | **WATCH** | Theming without a CSS runtime - the model ours already follows. |
| `react-native-tab-view` | 4.3.4 | 201 | MIT | 1 (the repository is archived) | 2 | published 2026-10-13 · archived, last commit 2022-11-27 · release 2022-10-11 | **REJECT** | The repository is archived. |
| `moti` | 0.30.0 | 760 | MIT | 2 | 1 | published 2025-01-29 · last commit 2025-03-11 · release 2025-01-29 | **REJECT** | No release since January 2025. |
| `react-native-redash` | 18.1.5 | 258 | MIT | 2 | 1 | published 2026-01-21 · last commit 2026-05-07 · release 2026-01-21 | **READ only** | The helpers are worth reading; the dependency is not worth taking. |
| `react-native-ease` | 0.9.0 | 349 | MIT | 2 | 2 (it needs a dev build) | published 2026-10-15 · last commit 2026-10-16 · release 2026-10-15 | **WATCH** | The only credible alternative to Reanimated for property animations. |
| `number-flow-react-native` | 0.5.1 | 704 | MIT | 3 | 2 | published 2026-08-19 · last commit 2026-08-20 · release 2026-08-19 | **WATCH** | The rolling number of the "stops left". |
| `@legendapp/motion` | 2.5.3 | 236 | MIT | 2 | 1 | published 2025-10-17 · last commit 2026-10-11 · release 2025-10-17 | **REJECT** | A NativeWind peer dependency. |
| `react-native-reanimated-dnd` | 2.0.0 | 136 | MIT | 3 | 2 | published 2026-03-16 · last commit 2026-03-16 · release 2026-03-16 | **WATCH** | The shape of "voice plus drag" for the route editor. |
| `react-native-reorderable-list` | 0.18.2 | 371 | MIT | 2 | 3 | published 2026-10-18 · last commit 2026-10-18 · release 2026-10-18 | **WATCH** | The low-risk reorder option. |
| `react-native-draggable-flatlist` | 4.0.3 | 511 | MIT | 2 | 1 | published 2025-05-06 · last commit 2025-05-06 · release 2025-05-07 | **REJECT** | A Reanimated 2 peer range and 206 open issues. |
| `react-native-swipeable-list` | 0.1.2 | 21 | MIT | 2 | 1 | published 2022-05-14 · last commit 2025-09-11 · release 2022-03-27 | **READ only** | The swipe-to-reveal pattern; four years old. |
| `react-native-haptic-feedback` | 3.0.0 | 209 | MIT | 2 | 3 | published 2026-03-29 · last commit 2026-05-02 · release 2026-03-29 | **WATCH** | The haptic patterns behind one API. |
| `react-native-zoom-toolkit` | 5.1.1 | 367 | MIT | 2 | 2 | published 2026-08-30 · last commit 2026-08-30 · release 2026-08-30 | **WATCH** | The map gesture, if we need our own. |
| `react-native-modalize` | 2.1.1 | 64 | MIT | 2 | 1 | published 2022-08-10 · last commit 2022-08-10 · release 2022-08-10 | **REJECT** | Dormant since 2022. |
| `lottie-react-native` | 7.5.0 | 288 | Apache-2.0 | 3 | 3 | published 2026-08-22 · last commit 2026-10-14 · release 2026-08-22 | **REJECT** | Decorative motion is barred by our own design rules. |
| `@rive-app/react-native` | 0.5.5 | 1955 | MIT | 3 | 2 | published 2026-10-13 · last commit 2026-10-15 · release 2026-10-15 | **REJECT** | The same rule: a motion file is decoration. |
| `@shopify/react-native-skia` | 2.14.0 | 9859 | MIT | 3 | 2 | published 2026-10-01 · last commit 2026-10-21 · release 2026-10-20 | **WATCH** | The vector engine, if a screen needs custom drawing; a big native dependency. |
| `react-native-skia` | 3.7.2 | 10719 | MIT | 3 | 2 | published 2026-10-20 · last commit 2026-10-21 · release 2026-10-20 | **WATCH** | The same engine under its old name; the project changed hands twice. |
| `expo-haptics` | 58.0.7 | 94 | MIT | 3 | 3 (SDK 58 bundles it) | published 2026-10-16 · last commit 2026-10-21 · release 2026-10-21 | **KEEP (locked)** | The confirm, deliver and error language of the app. |
| `expo-location` | 58.0.18 | 1279 | MIT | 3 | 3 (SDK 58 bundles it) | published 2026-10-21 · last commit 2026-10-21 · release 2026-10-21 | **KEEP (locked)** | The ETA and the geofence. |
| `expo-audio` | 58.0.10 | 1313 | MIT | 3 | 3 (SDK 58 bundles it) | published 2026-10-21 · last commit 2026-10-21 · release 2026-10-21 | **KEEP (locked)** | The earcon of the voice bar. |
| `expo-blur` | 58.0.5 | 137 | MIT | 3 | 3 (SDK 58 bundles it) | published 2026-10-19 · last commit 2026-10-21 · release 2026-10-21 | **REJECT** | The glass look is barred by the anti-AI-look rules. |
| `expo-linear-gradient` | 58.0.3 | 93 | MIT | 3 | 3 (SDK 58 bundles it) | published 2026-10-15 · last commit 2026-10-21 · release 2026-10-21 | **REJECT** | The purple-blue gradient is barred by the anti-AI-look rules. |
| `react-native-sherpa-onnx` | 0.4.4 | 2581 | MIT | 2 | 2 | published 2026-09-08 · last commit 2026-10-21 · release 2026-09-10 | **KEEP (locked)** | The on-device voice path. |
| `react-native-view-shot` | 6.1.1 | 2737 | MIT | 2 | 2 | published 2026-10-07 · last commit 2026-10-07 · release 2026-10-07 | **WATCH** | The design-review screenshots of the gate. |
| `@testing-library/react-native` | 14.1.0 | 851 | MIT | 2 | 3 | published 2026-10-08 · last commit 2026-10-19 · release 2026-10-08 | **KEEP (locked)** | The tests that keep the screens honest. |
| `maplibre-gl` | 6.15.0 | 28111 | BSD-3-Clause | 2 | 2 | published 2026-10-18 · last commit 2026-10-21 · release 2026-10-18 | **WATCH (web)** | The style of the courier map is one document for both platforms. |
| `@maplibre/maplibre-react-native` | 11.5.0 | 2135 | MIT | 3 | 3 | published 2026-10-04 · last commit 2026-10-21 · release 2026-10-04 | **KEEP (locked)** | The map engine of the app. |

<!-- generated by scripts/build-design-bench-tables.mjs from npm-packages-2026-10-22.tsv, github-repos-2026-10-22.tsv and docs/design/evidence/bench-scores.tsv -->
<!-- TABLES:END -->

---

## 3. The winners, and the ADR that follows

| Winner                                                     | Why it wins                                                                                  | The decision                                                                 |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Reanimated 4.7.1 + Worklets 0.13.0**                    | The only pair that keeps the frame budget on the UI thread; the spring and the durations come from our own tokens. | **KEEP (locked).** Declare `react-native-worklets` in `apps/mobile` — today it resolves only as a transitive peer, which is a phantom dependency. |
| **Gesture Handler 3.4.0**                                 | The gestures of the swipe-to-deliver and the sheet are recognised on the UI thread; the SDK 58 compatibility is proven by a merged upstream PR. | **KEEP (locked).** Implement the swipe with an explicit `onFinalize` state check: upstream issue #4616 is exactly the cancelled-pan bug. |
| **Unistyles 3.6.0**                                       | The tokens stay plain TypeScript, so the three directions of §13.4 were three objects in one file. | **KEEP (locked), pinned.** File the missing root `LICENSE` file upstream. |
| **FlashList 2.3.3**                                        | The 300-stop list at 60 fps is a hard requirement and it is **not installed today**.         | **KEEP and install.** The first line of the stops screen depends on it.     |
| **react-native-svg 15.16.0**                              | The vector layer under any custom icon or the route ribbon; bundled in SDK 58.               | **KEEP (bundled).**                                                       |
| **expo-haptics, expo-location, expo-audio, expo-linear-gradient** | The platform modules of the design language: the haptic on confirm, the ETA, the earcon of the voice bar. | **KEEP (locked).** `expo-blur` and `expo-linear-gradient` are the two we refuse: the glass and the gradient are barred by §13.2. |
| **@swmansion/react-native-bottom-sheet 0.17.0**          | The only sheet whose physics are a critically damped spring (ζ = 1) on **both** platforms, and whose geometry is computed in C++ rather than on the JS thread. | **PILOT** in the design lab. Eight months old, 447 stars, no Expo plugin: the pilot decides, and the ADR comes with the numbers. |
| **@lodev09/react-native-true-sheet 3.11.18**             | The best-maintained sheet of the pool: twelve releases in six months, fifteen human maintainers, two open issues. | **WATCH**, benchmarked against the pilot.                                |

### The losers, in one line each

- **`@gorhom/bottom-sheet`** — eleven million downloads a month and **no commit since
  2026-05-09**; three open pull requests hit Reanimated 4, the reduce-motion setting and
  `importantForAccessibility`. Three of our bar rows, all open.
- **`@ui-kitten/components`, `react-native-ui-lib`** — a Material-like look we do not want,
  and a look we own beats a look we rent.
- **`heroui-native`, `@gluestack-ui/themed`, `@legendapp/motion`** — a second styling engine,
  and `expo-blur` in the peer dependencies. Barred by the rules.
- **`tamagui`, `@shopify/restyle`** — good, but a second token source against
  `packages/design-tokens`. Tamagui's compile-time token flattening is the idea to steal, not
  the library to install.
- **`moti`, `react-native-redash`, `react-native-draggable-flatlist`, `react-native-modalize`,
  `react-native-swipeable-list`** — no release in months or years; a 2022 release date is not
  a maintenance story.
- **`react-native-tab-view`** — the repository is archived.
- **`lottie-react-native`, `@rive-app/react-native`** — decoration. Our rule says no
  decorative loops, and the founder said no AI-looking motion.
- **`react-native-skia` / `@shopify/react-native-skia`** — the right tool for a screen that
  needs custom drawing, and a big native dependency in a project with an 80 MB APK budget. The
  project also changed hands twice in two years. **WATCH**, not adopt.
- **`react-native-view-shot`** — the screenshot chain of the design gate; watch until the gate
  needs it.
- **`number-flow-react-native`** — the rolling "stops left" counter, if the direction the
  founder picks wants the number to roll.

---

## 4. The gaps this bench cannot close

1. **No frame rate was measured.** The emulator run of §13.5 produces the frame-time traces and
   the APK measurement; until then every fps cell is UNVERIFIED and the performance budget of
   `CONSTRAINTS.md` (300 stops at 60 fps, cold start ≤ 2 s, APK ≤ 80 MB) stays unverified for
   this work.
2. **The pilot of the sheet is a pilot.** 447 stars and eight months is not a track record.
   The ADR will carry the measurement, not the reputation.
3. **The accessibility of the libraries is judged from their source, not from a device.** The
   a11y gate of §13.5 remains a human review with a real screen reader and real gloves.
4. **The bundle budget is a proxy.** The APK measurement on CI is the only number that counts
   for the 80 MB budget.

---

## 5. How this bench is refreshed

```bash
powershell -ExecutionPolicy Bypass -File scripts\fetch-design-npm-evidence.ps1
node scripts/build-design-bench-tables.mjs --write
```

The scores live in `docs/design/evidence/bench-scores.tsv`, the registry facts in
`docs/design/evidence/npm-packages-<date>.tsv`, and the two are joined by
`scripts/build-design-bench-tables.mjs`, so a version or a licence can never be wrong in this
document without the snapshot changing too.
