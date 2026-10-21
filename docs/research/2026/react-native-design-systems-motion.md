# UI kits, design systems, motion, animation and gestures for React Native 2026 — OSS research (REDO, V4 §13.1)

**Research date: 2026-10-21.** Method: V4 §12 (≥30 candidates with full evidence cards, ≥10 shortlisted, top 5 deep-reviewed, benchmarks only where an eval set exists) + §12.6 anti-bias (≥3 newer/smaller challengers). Every number was read from the live GitHub API, the npm registry or OSV on 2026-10-21 unless the card says **UNVERIFIED**. Nothing is estimated and nothing is carried over unread — sprint #1 (2026-10-20) was wrong or out of date on several counts (§9).

**Card fields:** repo URL · stars + forks · created · last release + date · release cadence (6 m) · commits/90 d · human maintainers/90 d · open/closed issues · open PRs · licence (code + assets) · Expo SDK 58 / New Architecture · repo size · npm downloads/30 d · OSV advisories · what it does better than our current choice · risks · **DECISION**.

## 0. Scope, our current choice, the bar

Two areas, one file (KICKOFF_V4 §3 areas 1 and 2): **UI kits and design systems for React Native 2026**, and **motion/animation and gesture patterns** (Reanimated 4, gesture handler, spring physics, shared-element transitions).

| Item | Verified 2026-10-21 |
|---|---|
| Our styling engine | **Unistyles 3.5.3** (`apps/mobile/package.json`), configured in `apps/mobile/src/unistyles.ts` with three themes (`day`/`night`/`highContrast` registered as `light`/`dark`/`highContrast`), `adaptiveThemes: true`. **No NativeWind** (AGENTS.md, V4 §5). |
| Our token source | `packages/design-tokens/src/tokens.ts` + `themes.ts` — plain TypeScript objects; `generateCSSVariables()` emits CSS custom properties for the web dashboard. |
| Our motion stack | **`react-native-reanimated@4.7.1`** and **`react-native-gesture-handler@~3.3.0`** are the only motion/gesture packages installed. `react-native-worklets@0.13.0` resolves transitively (peer of Reanimated 4) and is **not** a declared dependency of `apps/mobile`. |
| Our sheet | `apps/mobile/src/components/Sheet.tsx` — hand-rolled, uses React Native `Animated.timing` (250 ms open / 200 ms close, `Easing.out(Easing.cubic)`), **no gesture, no spring, no reduce-motion branch**. |
| Our app platform | Expo **`~58.0.14`**, React Native **`0.88.0`**, `newArchEnabled: true` (`apps/mobile/app.json`). **The brief for this sprint said RN 0.82; the repo is on 0.88.0 — the repo wins.** |
| Our bar (V4 §5 + `docs/design/SYSTEM.md`) | Reanimated 4 on the UI thread · 60/120 fps · **durations 150–250 ms** · **spring physics for sheets** · shared-element transitions only where they carry meaning · reduce-motion respected (transitions become instant, never removed) · haptics on confirm/deliver/error, never on scroll · no layout thrash · FlashList for 300+ stops · WCAG 2.2 AA (driving text ≥ 7:1, rest ≥ 4.5:1) · dynamic type to 200 % without clipping · day/night by **sunset** + manual · RTL-ready · APK ≤ 80 MB · one Material Symbols set, **no emoji anywhere**. |
| Our constraints (`CONSTRAINTS.md`) | 300 stops at 60 fps · no `any` in application code (exception W1 covers `apps/mobile/src/voice/**` only) · no GPL/AGPL/SSPL/CC-NC in the shipped app · licences recorded in `docs/LICENSES.md`. |
| Comparator | Spoke (ex-Circuit) — the #1 NZ competitor (`docs/study/spoke/TEARDOWN.md`, read 2026-10-21). |

### The authoritative Expo SDK 58 compatibility table

`expo/expo` → `packages/expo/bundledNativeModules.json` (124 keys, read 2026-10-21) is the ground truth for what Expo SDK 58 ships and at what version:

| Bundled in SDK 58 | Version | Not bundled (needs a dev build) |
|---|---|---|
| `react-native-reanimated` | 4.7.1 | `react-native-unistyles` |
| `react-native-worklets` | 0.13.0 | `react-native-nitro-modules` |
| `react-native-gesture-handler` | ~3.3.0 | `@gorhom/bottom-sheet` |
| `react-native-screens` | ~4.30.0 | `@swmansion/react-native-bottom-sheet` |
| `react-native-safe-area-context` | ~5.10.1 | `react-native-ease` |
| `react-native-svg` | 15.16.0 | `react-native-mmkv` |
| `@shopify/flash-list` | 2.3.2 | `react-native-bottom-tabs` |
| `expo-haptics` | ~58.0.7 | `@react-native-vector-icons/material-design-icons` |
| `expo-keyboard-controller` | 1.22.7 | |
| `expo-symbols` | ~58.0.4 | |
| `expo-blur` | ~58.0.5 (barred by our "no glass" rule) | |

### 6-month star trend — method note (proxy, as V4 §12.3 permits)

The star _timeline_ is not readable with the token in `.env.local` (`GET /repos/{o}/{r}/stargazers` → HTTP 403; GraphQL `stargazers` edges → FORBIDDEN). **Every "stars gained in 6 months" figure is UNVERIFIED.** The proxy is the one §12.3 prescribes: releases in the last 6 months · commits in the last 90 days · distinct human maintainers in 90 days · npm downloads/month.

## Queries run

`gh search repos` and `gh api` through the repo's own `scripts/gh.ps1` token wrapper (2026-10-21). The literal query strings:

| # | Query | Sort / limit | What it produced |
|---|---|---|---|
| 1 | `react native design system` | stars / 12 | `iamshadmirza/react-native-design-system` 239 — the query returns almost nothing; dead query for RN kits |
| 2 | `react-native ui kit stars:>200 pushed:>2026-06-01` | stars / 12 | tamagui 14 267, ui-kitten 10 663, `Trixieapp/react-virgin` 1 505, `callstack/react-native-ios-kit` 556 |
| 3 | `topic:react-native topic:design-system` | stars / 12 | **dead query** — GitHub returns the generic top-star repos, not RN design systems |
| 4 | `react native animation library stars:>100 pushed:>2026-04-01` | stars / 12 | Reanimated 11 031, **`nandorojo/moti` 4 555**, `react-native-reanimated-dnd` 1 073 |
| 5 | `topic:react-native topic:animation` | stars / 12 | same set; topic pages are polluted by the same generic repos |
| 6 | `react native gesture library stars:>80` | stars / 12 | gesture-handler plus reanimated families |
| 7 | `topic:react-native topic:gesture` | stars / 12 | **dead query** (see query 3) |
| 8 | `react native bottom sheet stars:>150` | stars / 12 | gorhom 9 109, `osdnk/…` 3 336, `jeremybarbet/react-native-modalize` 2 878, **`lodev09/react-native-true-sheet` 2 077**, **`software-mansion-labs/react-native-bottom-sheet` 447 (created 2026-02-16)** |
| 9 | `react native component library stars:>1500` | stars / 12 | `wix/react-native-ui-lib` 7 155, `react-native-draggable-flatlist` 2 196 — the classic tier |
| 10 | `react native shared element transition` | stars / 12 | **dead query** — 12 one-person forks at 0–36 ★; no maintained standalone shared-element library exists |
| 11 | `react-native-unistyles` | stars / 6 | **`jpudysz/react-native-unistyles` 2 970** (the project moved out of the software-mansion org), `uni-stack/uniwind` 1 737 (2025-07-29) |
| 12 | `react-native zoom toolkit` / `react native draggable flatlist` / `react-native-worklets-core` | stars / 6 | `Glazzes/react-native-zoom-toolkit` 402, `computerjazz/react-native-draggable-flatlist` 2 196, `margelo/react-native-worklets-core` 791 |
| 13 | `react native animation created:>2026-01-01` | stars / 10 | **`appandflow/react-native-ease` 989 (created 2026-03-11)**, `Rednegniw/number-flow-react-native` 424, `SchroederNathan/react-native-motion` 205, `NURULLAHTURGUT/kinetikui` 13 |
| 14 | `react native ui kit created:>2026-01-01` | stars / 10 | no credible new UI kit; the 2026 entries are 46 ★ or fewer, mostly AI-kit-shaped |
| 15 | `react native gesture created:>2026-01-01` | stars / 10 | `afonsojramos/super-calendar` 210, `rileysay/react-native-collapsible-fluid-tabs` 15 (Reanimated 4 + GH 3) |

Plus API reads: `repos/{o}/{r}` × 60 · GraphQL `repositories` batch (stars, forks, created, pushed, licence, diskUsage, archived, default branch, commits since 2026-07-23, 12 latest releases, open/closed issue counts, open/closed PR counts) · `repos/{o}/{r}/commits?per_page=20` × 8 · `repos/{o}/{r}/contents/*` (source reads) · `search/issues` × 12 · `search/repos` × 15 · `expo/expo` `bundledNativeModules.json` · npm registry + downloads API × 45 · **OSV `/v1/query` × 15**.

## 1. Candidate pool — 66 evidence cards (65 repositories + 1 platform reference)

**Legend.** `rel/6m` = releases published 2026-04-21 → 2026-10-21 (from the 12 most recent releases; `12+` means the repo ships faster than the window I can list). `c90` = commits on the default branch in the 90 days to 2026-10-21. `hum90` = distinct non-bot commit authors among the **first 100** of those commits (a cap — where `hum90` is 1 on a repo with thousands of commits, that is what I measured, not a claim that one person wrote everything). `dl30` = npm downloads 2026-09-21 → 2026-10-20. `MB` = GitHub `diskUsage` (git history included, not install size). Issue counts are **issues only** (the API's `open_issues_count` includes PRs, so I use the GraphQL `issues(states:)` totals instead).

### A. UI kits and design systems

**C1 — `tamagui/tamagui`** https://github.com/tamagui/tamagui — **14 267 ★** / 626 f · created **2020-10-16** · pushed **2026-10-20** · last release **v3.1.0, 2026-10-20** (1 396 releases, 12 in 6 m) · c90 **2 713**, hum90 **1** · issues **69 open / 1 515 closed** · PRs **23 open / 592 closed** · **MIT** · New Arch: yes (unverified for SDK 58) · 906 MB · dl30 UNVERIFIED · OSV 0 advisories · the only mature RN design system with a **compile-time optimiser** that flattens styled components into platform output; shared web/native tokens · risks: 906 MB monorepo, a Metro compiler as a new CI failure mode, and its token model is a **second source of truth** against our `packages/design-tokens` rule · **DECISION: WATCH — steal the idea of compile-time token flattening, do not adopt the library while Unistyles 3 is locked.**

**C2 — `callstack/react-native-paper`** https://github.com/callstack/react-native-paper — **14 472 ★** / 2 250 f · created **2016-10-19** · pushed **2026-10-12** · last release **v6.0.0-alpha.0, 2026-06-15** (169 releases, 3 in 6 m; `v5.15.3` 2026-05-26 is the last stable) · c90 **31**, hum90 **10** · issues **330 open / 2 437 closed** · PRs **167 open / 552 closed** · **MIT** · npm `react-native-paper@5.15.3`, **1 847 906 dl30** · OSV 0 · Material 3 look, real theme engine, and the **only UI kit in this pool that shipped accessibility work in 2026** (`#5125` accessible Modal, `#5126` portal hides content below modals from assistive technology, `#5124` portal forwards the reduce-motion preference — all 2026-09-16 → 2026-09-28) · risks: Material 3 is not our "calm, not clever" language; two theming engines (RN Paper theme + Unistyles) means token duplication · **DECISION: WATCH — mine its a11y and reduce-motion patterns, do not adopt the kit.**

**C3 — `akveo/react-native-ui-kitten`** https://github.com/akveo/react-native-ui-kitten — **10 663 ★** / 961 f · created **2016-12-20** · pushed **2026-10-06** · last release **`@ui-kitten/components@6.2.1`, 2026-10-06** (78 releases, 12 in 6 m) · c90 **145**, hum90 **1** · issues **15 open / 1 201 closed** · PRs **0 open / 120 closed** · **MIT** · dl30 UNVERIFIED (per-package packages) · EVA design system with a theming/mapping layer and a `codemod` package · risks: a single maintainer, a Material-like visual language we do not want, and the 6.2.1 train is a multi-package publish · **DECISION: WATCH (reference only).**

**C4 — `wix/react-native-ui-lib`** https://github.com/wix/react-native-ui-lib — **7 155 ★** / 752 f · created **2017-02-08** · pushed **2026-10-17** · last release **`react-native-ui-lib@9.1.0`, 2026-06-28** (178 releases, 5 in 6 m) · c90 **5**, hum90 **4** · issues **45 open / 694 closed** · PRs **37 open / 575 closed** · **MIT** · 217 MB · a long-lived, well-documented kit with a real screen gallery and a `ListView`/grid of ready components · risks: 5 commits in 90 days is a slow train; the "big library" style pulls in a lot of surface we would then own · **DECISION: WATCH (screen-gallery reference).**

**C5 — `founded-labs/react-native-reusables`** https://github.com/founded-labs/react-native-reusables — **8 702 ★** / 320 f · created **2023-12-16** · pushed **2026-09-27** · last release **`rn-primitives@1.4.0`, 2026-03-28** (12 releases, **0 in 6 m**) · c90 **3**, hum90 **1** · issues **16 open / 328 closed** · PRs **1 open / 27 closed** · **MIT** · 25.7 MB · the only RN kit that ships **both** a `src/nativewind` and a `src/uniwind` variant of every component (a Unistyles-adjacent path) and ships a `packages/registry` shadcn-style JSON registry; its two 2026-07-02 commits are **reduced-motion support + portal accessibility for 22 components** · risks: one dominant maintainer, no release in 6 months, and the primary styling path is NativeWind (a hard-rule violation) · **DECISION: WATCH — the only kit to copy reduced-motion and portal-a11y patterns from, but do not install.**

**C6 — `heroui-inc/heroui-native`** https://github.com/heroui-inc/heroui-native — **3 692 ★** / 150 f · created **2025-06-03** · pushed **2026-10-20** · last release **v1.0.10, 2026-09-21** (41 releases, 8 in 6 m) · c90 **83**, hum90 **6** · issues **11 open / 126 closed** · PRs **2 open / 18 closed** · **Apache-2.0** · npm `heroui-native@1.0.10`, **818 353 dl30**, peer deps `expo-blur@>=14.0.0`, `tailwind-merge@^3.4.0`, `tailwind-variants@^3.2.2` → **NativeWind stack, plus a blur dependency our "no glass" rule forbids** · **DECISION: REJECT — hard rule (no NativeWind, no glass).**

**C7 — `GeekyAnts/NativeBase`** https://github.com/GeekyAnts/NativeBase — **20 367 ★** / 2 385 f · created **2016-04-15** · pushed **2026-01-31** · last release **v3.4.28, 2023-03-06** (227 releases, **0 in 6 m**) · c90 **0**, hum90 **0** · issues **283 open / 3 162 closed** · PRs **94 open / 471 closed** · **MIT** · 69 MB · the most-starred RN kit and the classic answer, but it has been effectively dead for three and a half years · **DECISION: REJECT (no release since 2023-03-06, 0 commits in 90 days).**

**C8 — `react-native-elements/react-native-elements`** https://github.com/react-native-elements/react-native-elements — **25 871 ★** / 4 665 f · created **2016-09-08** · pushed **2026-05-21** (default branch `next`) · last release **v5.0.0, 2026-01-19** (87 releases, 0 in 6 m) · c90 **0**, hum90 **0** · issues **133 open / 2 031 closed** · PRs **26 open / 427 closed** · **MIT** · 173 MB · the most-starred kit in this pool and still not maintained: a release in January 2026 and then nothing on the default branch for five months · **DECISION: REJECT (0 commits in 90 days).**

**C9 — `gluestack/gluestack-ui`** https://github.com/gluestack/gluestack-ui — **5 327 ★** / 238 f · created **2023-01-11** · pushed **2026-09-02** · last release **v5.0.0, 2026-06-25** (610 releases, **1 in 6 m**) · c90 **18**, hum90 **4** · issues **12 open / 677 closed** · PRs **8 open / 279 closed** · **licence UNVERIFIED — the repository root contains no `LICENSE` file at all and the API reports no SPDX id; npm `@gluestack-ui/themed@1.1.73` (2025-04-08) says ISC** · npm **142 234 dl30** · a Tailwind-based system with the best accessibility primitives in this pool, but it is Tailwind/NativeWind-shaped and its release train has collapsed to one in six months · **DECISION: WATCH — licence UNVERIFIED and wrong styling engine.**

**C10 — `tailwiinder/nativecn`** https://github.com/tailwiinder/nativecn — **128 ★** / 15 f · created **2025-03-14** · pushed **2025-04-01** · **no releases** · c90 **0** · issues **38 open / 10 closed** · PRs **2 open / 0 closed** · **MIT** · 2.6 MB · a shadcn-style copy-in registry on NativeWind, dead since April 2025 · **DECISION: REJECT (dead + NativeWind).**

**C11 — `auronsan/react-native-mantine`** https://github.com/auronsan/react-native-mantine — **8 ★** / 0 f · created **2024-09-29** · pushed **2026-10-17** · last release **v1.0.2, 2026-09-10** (33 releases, 6 in 6 m) · c90 **55**, hum90 **1** · issues **0 open / 0 closed** · PRs **4 open** · **MIT** · 5 MB · the only actively released *new* RN design system in the window, a Mantine-compatible API with 117 components · risks: 8 stars, one maintainer, zero issue history (nobody uses it in anger), no Expo SDK 58 proof · **DECISION: WATCH (2025 challenger, §12.6 anti-bias).**

**C12 — `agrawal-rohit/pearl-ui`** https://github.com/agrawal-rohit/pearl-ui — **85 ★** / 11 f · created **2021-09-03** · pushed **2025-10-23** · last release **v2.3.4, 2024-01-03** (34 releases, 0 in 6 m) · c90 **0** · issues **0 open / 3 closed** · PRs **7 open** · **MIT** · 9.3 MB · an early Tailwind-based RN kit with a stale release line · **DECISION: REJECT.**

**C13 — `jsartisan/react-native-magnus`** https://github.com/jsartisan/react-native-magnus — **1 216 ★** / 81 f · created **2019-11-22** · pushed **2026-10-14** · last release **v1.0.63, 2022-09-22** (20 releases, 0 in 6 m) · c90 **6**, hum90 **1** · issues **27 open / 35 closed** · PRs **29 open** · **MIT** · 13.3 MB · a Laravel-flavoured component API that does not fit a plain RN app; the last release is from 2022 · **DECISION: REJECT.**

**C14 — `xotahal/react-native-material-ui`** https://github.com/xotahal/react-native-material-ui — **3 775 ★** / 602 f · created **2016-03-24** · pushed **2023-04-19** · last release **v2.0.0-alpha.1, 2019-04-20** (20 releases, 0 in 6 m) · c90 **0** · issues **172 open / 147 closed** · PRs **43 open** · **MIT** · 1.5 MB · abandoned Material port with a seven-year-old alpha · **DECISION: REJECT.**

**C15 — `Trixieapp/react-virgin`** https://github.com/Trixieapp/react-virgin — **1 505 ★** / 91 f · created **2017-10-14** · pushed **2023-01-25** · **no releases** · c90 **0** · issues **0 open / 6 closed** · PRs **5 open** · **MIT** · 1.9 MB · an RN design system whose docs were never finished and whose repo has been quiet since January 2023 · **DECISION: REJECT.**

**C16 — `react-ui-kit/expo-ui-kit`** https://github.com/react-ui-kit/expo-ui-kit — **116 ★** / 22 f · created **2019-03-24** · pushed **2024-08-28** · **no releases** · c90 **0** · issues **7 open / 21 closed** · PRs **0 open** · **MIT** · 0.4 MB · a documentation-only Expo kit that never shipped a package · **DECISION: REJECT.**

**C17 — `iamshadmirza/react-native-design-system`** https://github.com/iamshadmirza/react-native-design-system — **239 ★** / 31 f · created **2019-10-18** · pushed **2023-05-15** · last release **v1.2.0, 2020-08-18** · c90 **0** · issues **6 open / 11 closed** · PRs **5 open** · **MIT** · 13.9 MB · the top hit for "react native design system" and a good illustration that the search term is useless: last release 2020 · **DECISION: REJECT.**

**C18 — `callstack/react-native-ios-kit`** https://github.com/callstack/react-native-ios-kit — **556 ★** / 52 f · created **2017-07-27** · pushed **2024-02-26** · last release **v0.0.25, 2020-05-13** · c90 **0** · issues **19 open / 44 closed** · PRs **49 open** · **MIT** · 14.9 MB · iOS-native-styled components; dormant for two years · **DECISION: REJECT.**

**C19 — `jpudysz/react-native-unistyles`** https://github.com/jpudysz/react-native-unistyles — **2 970 ★** / 142 f · created **2023-10-03** · pushed **2026-10-17** · last release **v3.5.3, 2026-10-13** (131 releases, 8 in 6 m) · c90 **139**, hum90 **5** · issues **9 open / 478 closed** · PRs **10 open / 47 closed** · **licence: `packages/unistyles/package.json` says MIT, but the repository root has NO `LICENSE` file and the API reports no SPDX id → UNVERIFIED as a repo, MIT as a package** · npm `react-native-unistyles@3.5.3`, **963 829 dl30**, peers `react-native>=0.81.0`, `react-native-nitro-modules@*`, `react-native-reanimated@*` · **our locked styling engine**; not bundled in Expo SDK 58, so it needs a dev build (we already run one) · risks: the repo moved out of the software-mansion org and lost its licence file · **DECISION: KEEP (locked) — but file the licence gap and pin 3.5.3.**

**C20 — `uni-stack/uniwind`** https://github.com/uni-stack/uniwind — **1 737 ★** / 60 f · created **2025-07-29** · pushed **2026-10-20** · last release **v1.13.0, 2026-10-19** (48 releases, **12 in 6 m**) · c90 **58**, hum90 **12** · issues **3 open / 333 closed** · PRs **3 open / 37 closed** · **MIT** · 4.1 MB · npm `uniwind@1.13.0`, **3 750 958 dl30**, peers `metro@*`, `react>=19.0.0`, `tailwindcss>=4`, `@expo/metro-config@*` · the 2025–26 styling challenger: a Tailwind v4 CSS pipeline for RN that requires a Metro transform worker · risks: it is Tailwind under the hood (a second styling philosophy), it needs a custom Metro config, and its download count is inflated by template apps · **DECISION: WATCH — the credible NativeWind replacement, but it is still "CSS in RN", which our Unistyles-3-only rule excludes.**

**C21 — `amzn/style-dictionary`** https://github.com/amzn/style-dictionary — **4 869 ★** / 644 f · created **2016-11-29** · pushed **2026-10-16** · last release **v5.7.0, 2026-10-16** (110 releases, 12 in 6 m) · c90 **31**, hum90 **11** · issues **217 open / 506 closed** · PRs **22 open / 193 closed** · **Apache-2.0** · the industry token pipeline; our `packages/design-tokens` header already claims it ("Built for the Unistyles 3 + Style Dictionary pipeline") but the package exports plain TS objects and **no Style Dictionary build exists** · risks: a build step we do not run, and DTCG-format churn · **DECISION: KEEP as the intended pipeline — but implement it, do not just cite it.**

**C22 — `radix-ui/colors`** https://github.com/radix-ui/colors — **1 713 ★** / 88 f · created **2021-01-04** · pushed **2025-12-17** · **no releases** · c90 **0** · issues **3 open / 33 closed** · PRs **3 open / 1 closed** · **MIT** · 0.4 MB · the reference accessible colour scales (APCA-derived, 12 steps, light + dark + alpha) — our `colors` object is a hand-rolled 50–950 ramp with no perceptual check · **DECISION: WATCH — adopt the *scales* as reference when the contrast gate (B6) is built.**

**C23 — `nativewind/nativewind`** https://github.com/nativewind/nativewind — **8 116 ★** / 410 f · created **2022-04-02** · pushed **2026-10-16** · last release **nativewind@4.2.7, 2026-09-14** (115 releases, plus `5.0.0-rc.0` 2026-09-13) · c90 **11**, hum90 **2** · issues **33 open / 1 007 closed** · PRs **28 open** · **MIT** · 323.7 MB · healthy and improving, which makes it the most tempting wrong answer · **DECISION: REJECT — hard rule: Unistyles 3 is the only styling engine (AGENTS.md, V4 §5).**

**C24 — `callstack/react-native-bottom-tabs`** https://github.com/callstack/react-native-bottom-tabs — **1 463 ★** / 111 f · created **2024-09-27** · pushed **2026-10-20** · last release **`react-native-bottom-tabs@1.4.0`, 2026-07-09** (125 releases, 9 in 6 m) · c90 **11**, hum90 **5** · issues **36 open / 150 closed** · PRs **29 open / 24 closed** · **MIT** · 107 MB · npm **395 804 dl30** · the modern tab bar: a `BottomTabBar` that animates a shared indicator, with `expo-template` peers · risks: a new API surface, 29 open PRs, and a **second token source** for the indicator colours · **DECISION: WATCH (Expo Router is our router; we may only want the animated tab bar).**

**C25 — `satya164/react-native-tab-view`** https://github.com/satya164/react-native-tab-view — **5 103 ★** / 1 042 f · created **2016-06-15** · pushed **2022-11-27** · last release **v3.3.0, 2022-10-11** · c90 **0** · issues **41 open / 938 closed** · PRs **6 open / 192 closed** · **MIT** · **ARCHIVED** · 9.5 MB · the swipeable pager every RN app used; archived in 2022 · **DECISION: REJECT (archived).**

**C26 — `ptomasroos/react-native-scrollable-tab-view`** https://github.com/ptomasroos/react-native-scrollable-tab-view — **6 940 ★** / 2 240 f · created **2015-06-11** · pushed **2024-06-23** · last release **v1.0.0, 2019-10-28** (2 releases) · c90 **0** · issues **136 open / 745 closed** · PRs **29 open / 181 closed** · **licence UNVERIFIED (no `LICENSE` file; API reports no SPDX id)** · the classic scrollable tab strip with a slow-decay momentum calculation; quiet since 2024 and unlicensed · **DECISION: REJECT (stale + licence UNVERIFIED).**

**C27 — `GeekyAnts/react-native-aria`** https://github.com/GeekyAnts/react-native-aria — **228 ★** / 9 f · created **2020-12-14** · pushed **2023-12-11** · last release **0.2.3, 2021-02-22** · c90 **0** · issues **8 open / 4 closed** · PRs **1 open** · **MIT** · **ARCHIVED** · 2.4 MB · the React-Aria-inspired RN accessibility primitives; npm `react-native-aria@0.2.3`, **2 374 dl30** · **DECISION: REJECT (archived 2023).**

### B. Motion, animation, gestures, sheets

**C28 — `software-mansion/react-native-reanimated`** https://github.com/software-mansion/react-native-reanimated — **11 031 ★** / 1 535 f · created **2018-04-25** · pushed **2026-10-20** · last release **4.7.1, 2026-10-02** (229 releases, **12 in 6 m**) · c90 **496**, hum90 **12** · issues **141 open / 3 121 closed** · PRs **184 open / 839 closed** · **MIT** · 834.8 MB · npm **37 906 287 dl30**, peer `react-native@0.86 - 0.88` · **Expo SDK 58 bundles 4.7.1** · OSV: **1 advisory, GHSA-2j79-8pqc-r7x6 (ReDoS), published 2022-10-01, fixed in 2.10.0** → our 4.7.1 is not affected · our locked motion engine · risks: `ENABLE_SHARED_ELEMENT_TRANSITIONS` is **false by default** in 4.7.1 and `SharedTransition` defaults to **500 ms**, both outside our bar; `useReducedMotion()` reads the setting once at module load and never re-renders · **DECISION: KEEP (locked).**

**C29 — `software-mansion/react-native-worklets`** https://github.com/software-mansion/react-native-worklets — **38 ★** / 1 f · created **2026-03-20** · pushed **2026-03-26** · **no releases** · c90 **0** · **MIT** (no `LICENSE` file at root) · **this is a re-direct repository** — its README says "React Native Worklets code is located in Reanimated monorepo, if you want to open an issue or contribute, please do it there" · npm `react-native-worklets@0.13.0` (2026-09-18), **34 949 820 dl30**, peer `react-native@0.86 - 0.88` · **Expo SDK 58 bundles 0.13.0** · the multithreading runtime that Reanimated 4 runs on; the separate repo is a placeholder · risks: **we do not declare it in `apps/mobile/package.json`** — it resolves only as a transitive peer, which is a phantom dependency under our exact-pin rule · **DECISION: KEEP (locked) — declare `react-native-worklets@0.13.0` explicitly in `apps/mobile`.**

**C30 — `software-mansion/react-native-gesture-handler`** https://github.com/software-mansion/react-native-gesture-handler — **6 793 ★** / 1 082 f · created **2016-10-27** · pushed **2026-10-20** · last release **v3.4.0, 2026-10-16** (137 releases, **12 in 6 m**; also `v2.33.1` 2026-10-16) · c90 **217**, hum90 **28** · issues **13 open / 1 611 closed** · PRs **10 open / 320 closed** · **MIT** · 231.3 MB · npm **36 752 813 dl30** · **Expo SDK 58 confirmed**: PR **#4612 "Bump to `expo` sdk 58"** opened and merged **2026-10-19**; PR #4606 "Update compatibility table for 3.4.0" merged 2026-10-16 · OSV 0 · the declarative gesture API recognised on the **UI thread** — the technical basis of our no-jank budget · risks: API churn inside minors (`pressOutAfterAnimation` → `immediatePressOut` rename on 2026-10-14) · **DECISION: KEEP (locked), pinned.**

**C31 — `gorhom/react-native-bottom-sheet`** https://github.com/gorhom/react-native-bottom-sheet — **9 109 ★** / 964 f · created **2020-07-31** · pushed **2026-05-09** · last release **v5.2.14, 2026-05-09** (128 releases, 5 in 6 m) · **c90 = 0** (last commit `9bfbeb52` "chore: release v5.2.14", 2026-05-09 — **165 days ago**) · hum90 **0** · issues **46 open / 1 945 closed**, **127 issues created in 2026 alone** · PRs **26 open / 262 closed**, the newest (#2786) created 2026-10-19 and still open · **MIT** · 34.7 MB · npm `@gorhom/bottom-sheet@5.2.14`, **11 921 765 dl30** · OSV 0 · the reference Reanimated sheet: `snapPoints`, `enableDynamicSizing`, `BottomSheetFlashList` · risks: **the maintainer has merged nothing since 2026-05-09**; PR #2727 "Feat/reanimated 4 support" (16 commits, 21 files) open since 2026-07-29; PR #2652 "fix: bottom sheet not appearing with android reduce motion" open since 2026-04-14; PR #2709 "forward importantForAccessibility" open since 2026-06-30 · **DECISION: WATCH — do not adopt as a new dependency; it fails three of our bar rows (Reanimated 4, reduce motion, screen-reader access).**

**C32 — `software-mansion-labs/react-native-bottom-sheet`** https://github.com/software-mansion-labs/react-native-bottom-sheet — **447 ★** / 21 f · **created 2026-02-16** · pushed **2026-10-18** · last release **v0.17.0, 2026-10-18** (57 releases, **12 in 6 m**) · c90 **28**, hum90 **7** · issues **13 open / 44 closed** · PRs **6 open / 9 closed** · **MIT** · 3.4 MB · npm **`@swmansion/react-native-bottom-sheet@0.17.0`, 2 109 181 dl30 in eight months**, peer `react-native>=0.76.0` (built against RN 0.88.0 in its devDependencies) · **the 2026 challenger**: a **Fabric native sheet** (C++ shadow nodes, Swift/UIKit + Kotlin/View hosts) with a **critically damped spring (ζ = 1)** on both platforms and no Reanimated dependency · risks: 447 ★, no Expo config plugin (dev build only), no `FlashList` integration yet, and `expo prebuild` needed for the example app (issue #93, closed 2026-10-18) · **DECISION: WATCH → pilot — the only candidate whose physics match our "spring for sheets" rule by construction.**

**C33 — `lodev09/react-native-true-sheet`** https://github.com/lodev09/react-native-true-sheet — **2 077 ★** / 118 f · created **2024-03-23** · pushed **2026-10-17** · last release **v3.11.18, 2026-10-02** (172 releases, **12 in 6 m**; `main` is already at `4.0.0-beta.25`) · c90 **155**, hum90 **15** · issues **2 open / 342 closed** · PRs **2 open / 45 closed** · **MIT** · 242.3 MB · npm **`@lodev09/react-native-true-sheet@3.11.18`, 721 766 dl30**, peer deps `react-native>=0.82.0`, **`react-native-reanimated>=4`**, `react-native-worklets@*`, `expo-router>=57.0.0` · the healthiest sheet in the pool on maintenance (12 releases/6 m, 155 commits/90 d, 15 humans, **2 open issues**) and the only sheet besides C32 that is built for **Reanimated 4** · risks: a 4.x beta on `main`, and a `yarn.lock`/`turbo.json` build we would own · **DECISION: WATCH — the best-maintained sheet; benchmark against C32.**

**C34 — `wcandillon/react-native-redash`** https://github.com/wcandillon/react-native-redash — **2 060 ★** / 116 f · created **2019-04-30** · pushed **2026-08-04** · last release **v18.1.5, 2026-01-21** (189 releases, **0 in 6 m**) · c90 **0** · issues **89 open / 106 closed** · PRs **16 open / 61 closed** · **MIT** · 10 MB · npm **733 188 dl30** · the reference animation toolbox (themed helpers, `clamp`, `interpolate`, `useTransition`) · risks: the release train has stopped for nine months and 89 issues are open with no maintainer activity · **DECISION: WATCH — copy helpers, do not depend.**

**C35 — `nandorojo/moti`** https://github.com/nandorojo/moti — **4 555 ★** / 161 f · created **2020-10-17** · pushed **2025-03-11** · last release **v0.30.0, 2025-01-29** (64 releases, 0 in 6 m) · c90 **0** · issues **30 open / 228 closed** · PRs **14 open / 25 closed** · **MIT** · 22.9 MB · npm **1 223 131 dl30** (a large install base with **no release in 21 months**) · the declarative Reanimated wrapper most people reach for first · **DECISION: REJECT (dormant; Reanimated 4 support unproven).**

**C36 — `dohooo/react-native-reanimated-carousel`** https://github.com/dohooo/react-native-reanimated-carousel — **3 435 ★** / 357 f · created **2021-09-07** · pushed **2026-10-15** · last release **v5.2.0, 2026-10-14** (123 releases, 7 in 6 m) · c90 **17**, hum90 **3** · issues **1 open / 599 closed** · PRs **1 open / 62 closed** · **MIT** · 478.9 MB · npm **2 135 399 dl30**, peers `react-native-worklets>=0.5.0`, `react-native-reanimated>=4.1.0`, `react-native-gesture-handler>=2.9.0 <4.0.0` — a genuine Reanimated 4 carousel · risks: 478 MB repo, and a carousel is not a list app's need · **DECISION: WATCH (only if a marketing/onboarding carousel is ever wanted).**

**C37 — `LegendApp/legend-motion`** https://github.com/LegendApp/legend-motion — **450 ★** / 15 f · created **2022-04-20** · pushed **2026-10-11** · last release **v2.5.3, 2025-10-17** (4 releases, 0 in 6 m) · c90 **1**, hum90 **1** · issues **9 open / 9 closed** · PRs **1 open** · **MIT** · 3.2 MB · npm `@legendapp/motion@2.5.3`, **545 415 dl30**, peer **`nativewind@>=4.0.0`** · a declarative animation API used by Gluestack · risks: NativeWind peer, one maintainer, no release in a year · **DECISION: WATCH.**

**C38 — `entropyconquers/react-native-reanimated-dnd`** https://github.com/entropyconquers/react-native-reanimated-dnd — **1 073 ★** / 46 f · created **2025-05-15** · pushed **2026-07-30** · last release **v2.0.0, 2026-03-16** (3 releases, 0 in 6 m) · c90 **0** · issues **5 open / 53 closed** · PRs **2 open / 13 closed** · **MIT** · 33.5 MB · npm **132 637 dl30**, peers `react-native-reanimated>=4.2.0`, `react-native-worklets>=0.7.0`, `react-native-gesture-handler>=2.28.0` · drag-and-drop reordering for Reanimated 4 — directly relevant to PARITY row 17 (drag reorder) · risks: 3 releases total, no commits in 90 days, one author · **DECISION: WATCH — the correct shape for voice + drag reorder, but unmaintained since March 2026.**

**C39 — `omahili/react-native-reorderable-list`** https://github.com/omahili/react-native-reorderable-list — **325 ★** / 21 f · created **2021-12-05** · pushed **2026-10-18** · last release **v0.18.2, 2026-10-18** (25 releases, 2 in 6 m) · c90 **4**, hum90 **1** · issues **11 open / 48 closed** · PRs **1 open / 8 closed** · **MIT** · 1.9 MB · npm **372 104 dl30**, peers `react-native-reanimated>=3.12.0`, `react-native-gesture-handler>=2.12.0` · a small, active reorderable list with a stable API · risks: one maintainer, no Reanimated 4-specific work · **DECISION: WATCH — the low-risk option for drag reorder (and it composes with FlashList poorly).**

**C40 — `wcandillon/react-native-skia`** https://github.com/wcandillon/react-native-skia — **8 744 ★** / 672 f · created **2021-11-08** · pushed **2026-10-20** · last release **v3.7.1, 2026-10-19** (387 releases, 12 in 6 m) · c90 **193**, hum90 **14** · issues **26 open / 1 208 closed** · PRs **76 open / 356 closed** · **MIT** · 339.3 MB · npm `react-native-skia@3.7.1` **25 342 dl30** vs **`@shopify/react-native-skia@2.14.0` 5 782 906 dl30** — the project has effectively moved to the Shopify namespace and the old package is the shadow · risks: a large native dependency against our 80 MB APK budget, and our "no glass/no glow" visual rule makes most Skia effects unwanted · **DECISION: WATCH — only if a screen needs custom vector work; prefer the Shopify package if that day comes.**

**C41 — `esthor/react-native-swipeable-list`** https://github.com/esthor/react-native-swipeable-list — **760 ★** / 34 f · created **2019-11-10** · pushed **2026-10-13** · last release **v0.1.2, 2022-03-27** (3 releases, 0 in 6 m) · c90 **0** · issues **1 open / 14 closed** · PRs **7 open** · **MIT** · 6.2 MB · npm **5 678 dl30** · the swipe-to-reveal list every delivery app copies (Spoke swipes a stop left/right to mark failed/delivered) · risks: four-year-old release, 7 open PRs · **DECISION: WATCH (pattern reference only).**

**C42 — `azimgd/shadowlist`** https://github.com/azimgd/shadowlist — **385 ★** / 6 f · created **2024-05-15** · pushed **2026-10-14** · last release **v0.4.0, 2024-05-21** (1 release, **0 in 6 m**) · **c90 = 309**, hum90 **1** · issues **0 open / 16 closed** · PRs **0 open** · **MIT** · 10.8 MB · a Fabric rewrite of the list with a `shadowlist-core`, `shadowlist-fabric`, `shadowlist-android`, `shadowlist-uikit` and `shadowlist-wasm` package set · risks: **309 commits in 90 days and no release since May 2024** — installing it means installing unreleased code · **DECISION: WATCH — do not install; ask upstream to cut a release.**

**C43 — `airbnb/lottie-react-native`** https://github.com/airbnb/lottie-react-native — **17 208 ★** / 1 801 f · created **2017-01-27** · pushed **2026-10-14** · last release **v7.5.0, 2026-08-22** (59 releases, 4 in 6 m) · c90 **22**, hum90 **7** · issues **9 open / 903 closed** · PRs **10 open / 210 closed** · **Apache-2.0** · 412.1 MB · npm **5 672 029 dl30**, peer `react-native>=0.84` · the design-file animation runtime (Lottie JSON) · risks: a 412 MB repo, a large native binary, and V4 §5 forbids decorative animation for a driving app · **DECISION: REJECT — decorative motion is barred by our own design rules.**

**C44 — `appandflow/react-native-ease`** https://github.com/appandflow/react-native-ease — **989 ★** / 14 f · **created 2026-03-11** · pushed **2026-10-16** · last release **v0.9.0, 2026-10-15** (13 releases, 6 in 6 m) · c90 **18**, hum90 **5** · issues **3 open / 11 closed** · PRs **0 open** · **MIT** · 3.9 MB · npm **171 741 dl30** · the 2026 challenger: "Lightweight declarative animations powered by platform APIs. Uses Core Animation on iOS and Animator on Android — zero JS overhead", from the maintainers of `react-native-safe-area-context` (already ours) · risks: 989 ★, seven months old, no Reanimated replacement for shared-value-driven work, and it needs a dev build (not bundled in SDK 58) · **DECISION: WATCH — the only credible alternative to Reanimated for pure property animations.**

**C45 — `Rednegniw/number-flow-react-native`** https://github.com/Rednegniw/number-flow-react-native — **424 ★** / 10 f · **created 2026-02-09** · pushed **2026-08-20** · last release **v0.5.1, 2026-08-19** (10 releases, 3 in 6 m) · c90 **12**, hum90 **2** · issues **0 open / 8 closed** · PRs **3 open** · **MIT** · 36 MB · npm **94 462 dl30** · digit-by-digit rolling counters with `Intl.NumberFormat` support — our "stops remaining" big number (48–76 pt, tabular) is exactly this shape · risks: two authors, a View-based renderer and a Skia renderer (we would take the View one) · **DECISION: WATCH — candidate for the one number that must catch the driver's eye.**

**C46 — `motiondivision/motion`** https://github.com/motiondivision/motion — **34 381 ★** / 1 448 f · created **2018-11-16** · pushed **2026-10-20** · **no GitHub releases** (npm tags only) · c90 **649**, hum90 **2** · issues **31 open / 1 936 closed** · PRs **2 open / 306 closed** · **MIT** · **1 626 MB** · the Framer Motion successor and the web dashboard's motion standard · risks: **web-first**; React Native support has been dropped from the modern line, and 1.6 GB of repo for a web-only need · **DECISION: WATCH (web dashboard only).**

**C47 — `Glazzes/react-native-zoom-toolkit`** https://github.com/Glazzes/react-native-zoom-toolkit — **402 ★** / 38 f · created **2024-02-08** · pushed **2026-08-30** · last release **v5.1.1, 2026-08-30** (24 releases, 2 in 6 m) · c90 **7**, hum90 **1** · issues **6 open / 74 closed** · PRs **5 open** · **MIT** · 40 MB · npm `react-native-zoom-toolkit@5.1.1`, **274 752 dl30** · pinch/zoom/pan built on Reanimated + Gesture Handler, with a transformer API · risks: one maintainer; we have no zoomable surface in v1 · **DECISION: WATCH (map pinch only).**

**C48 — `computerjazz/react-native-draggable-flatlist`** https://github.com/computerjazz/react-native-draggable-flatlist — **2 196 ★** / 458 f · created **2018-06-23** · pushed **2026-01-21** · last release **v4.0.3, 2025-05-07** (27 releases, 0 in 6 m) · c90 **0** · issues **206 open / 255 closed** · PRs **26 open / 67 closed** · **MIT** · 1.9 MB · npm **1 909 555 dl30** · the classic long-press drag list, built on Reanimated 2 APIs · risks: 206 open issues, last release May 2025, Reanimated 2 peer range · **DECISION: REJECT.**

**C49 — `margelo/react-native-worklets-core`** https://github.com/margelo/react-native-worklets-core — **791 ★** / 66 f · created **2021-11-11** · pushed **2026-04-22** · last release **v1.6.3, 2026-02-12** (31 releases, 0 in 6 m) · c90 **0** · issues **59 open / 66 closed** · PRs **11 open / 19 closed** · **MIT** · 4.7 MB · the pre-4.0 worklets runtime, superseded by `react-native-worklets` (C29) · **DECISION: REJECT (superseded).**

**C50 — `jeremybarbet/react-native-modalize`** https://github.com/jeremybarbet/react-native-modalize — **2 878 ★** / 295 f · created **2018-10-22** · pushed **2024-06-08** · last release **2.1.0, 2022-08-10** (20 releases, 0 in 6 m) · c90 **0** · issues **105 open / 231 closed** · PRs **21 open / 66 closed** · **MIT** · 2.9 MB · the classic modal sheet with drag-to-dismiss · **DECISION: REJECT (dormant since June 2024).**

**C51 — `osdnk/react-native-reanimated-bottom-sheet`** https://github.com/osdnk/react-native-reanimated-bottom-sheet — **3 336 ★** / 327 f · created **2019-03-19** · pushed **2023-01-04** · last release **v1.0.0-alpha.22, 2020-08-14** · c90 **0** · issues **180 open / 119 closed** · PRs **33 open / 12 closed** · **MIT** · 43.9 MB · the original Reanimated sheet, superseded by gorhom's · **DECISION: REJECT.**

**C52 — `margelo/nitro`** https://github.com/margelo/nitro — **1 967 ★** / 125 f · created **2024-06-12** · pushed **2026-10-20** · last release **v0.37.1, 2026-08-27** (122 releases, 12 in 6 m) · c90 **151**, hum90 **6** · issues **49 open / 201 closed** · PRs **187 open / 421 closed** · **MIT** · 36.6 MB · npm `react-native-nitro-modules@0.37.1`, **7 880 730 dl30** · the New Architecture native-module bridge that Unistyles 3 and MMKV v4 both sit on · **DECISION: KEEP (already a dependency of our Unistyles 3).**

**C53 — `SchroederNathan/react-native-motion`** https://github.com/SchroederNathan/react-native-motion — **205 ★** / 21 f · **created 2026-03-21** · pushed **2026-10-19** · **no releases** · c90 **33**, hum90 **1** · issues **0 open / 0 closed** · PRs **0 open** · **licence UNVERIFIED (no `LICENSE` file; API reports no SPDX id)** · 45.3 MB · a 2026 animation library with no release and no issue history · **DECISION: REJECT (no release, no licence file).**

**C54 — `NURULLAHTURGUT/kinetikui`** https://github.com/NURULLAHTURGUT/kinetikui — **13 ★** / 2 f · **created 2026-10-09** · pushed **2026-10-20** · **no releases** · c90 **23**, hum90 **1** · issues **0 open / 0 closed** · **MIT** · 3 MB · "Motion components for Expo and React Native: 136 animated components and 4 screen templates, built on Reanimated, Gesture Handler and Skia" — twelve days old at the time of reading · **DECISION: WATCH (too new to judge; a radar entry).**

**C55 — `Apple`/`Google` platform animation primitives (iOS UIKit `UIViewPropertyAnimator`, Android `ValueAnimator`/`SpringAnimation`)** — no repo, but **mandatory reading**: C32's iOS implementation uses a hand-rolled critically damped spring (`ios/CriticalSpring.swift`) and its Android implementation uses `androidx.dynamicanimation` `SpringAnimation` with `dampingRatio = DAMPING_RATIO_NO_BOUNCY` and `stiffness = SpringForce.STIFFNESS_MEDIUM` — the platform-native physics our bar names. The platform is the zero-dependency fallback if a JS animation layer ever fails us.

### C. Accessibility, fonts, icons, lists — the supporting cast

**C56 — `ArturKalach/react-native-a11y`** https://github.com/ArturKalach/react-native-a11y — **57 ★** / 6 f · created **2022-09-23** · pushed **2026-10-04** · last release **v0.9.1, 2026-10-04** (24 releases, 5 in 6 m) · c90 **2**, hum90 **1** · issues **0 open / 25 closed** · PRs **0 open** · **MIT** · 22.9 MB · npm **1 733 911 dl30** · native-first screen-reader helpers: announcements, focus trapping, focus order, WCAG helpers · risks: one maintainer, 57 stars, no Expo SDK 58 proof · **DECISION: WATCH — evaluate in the accessibility benchmark (B4) before any dependency.**

**C57 — `ArturKalach/react-native-a11y-order`** https://github.com/ArturKalach/react-native-a11y-order — **52 ★** / 3 f · created **2023-05-14** · pushed **2026-10-04** (default branch `develop`) · last release **v2.0.1, 2026-10-05** (24 releases, 7 in 6 m) · c90 **15**, hum90 **2** · issues **0 open / 13 closed** · **MIT** · 14.9 MB · npm **108 806 dl30** · explicit screen-reader focus order and focus trapping on Android/iOS · **DECISION: WATCH (paired with C56).**

**C58 — `f0rr0/react-native-rating`** https://github.com/f0rr0/react-native-rating — **92 ★** / 7 f · created **2017-06-04** · pushed **2026-10-19** · last release **v4.0.0, 2026-07-28** (6 releases, 2 in 6 m) · c90 **7**, hum90 **1** · issues **0 open / 8 closed** · PRs **2 open** · **MIT** · 1.3 MB · the accessible star-rating row (PARITY row 34 — Spoke has no ratings, so this is a gap we do **not** need to close) · **DECISION: REJECT (not a courier tool).**

**C59 — `filipmok-agh/react-native-one-hand`** https://github.com/filipmok-agh/react-native-one-hand — **5 ★** / 0 f · **created 2026-07-13** · pushed **2026-08-24** · last release **v0.1.1, 2026-08-24** (2 releases, 2 in 6 m) · c90 **3**, hum90 **1** · issues **0 open / 0 closed** · PRs **0 open** · **MIT** · 1.5 MB · npm **21 dl30** · one-hand scaling of native modals/alerts/action sheets — it matches our 72 pt lower-third primary action, but 5 stars and 21 downloads means nobody has run it in anger · **DECISION: WATCH — read the implementation, re-implement in-house.**

**C60 — `oblador/react-native-vector-icons`** https://github.com/oblador/react-native-vector-icons — **17 918 ★** / 2 101 f · created **2015-05-15** · pushed **2026-10-19** · last release **`@react-native-vector-icons/material-design-icons@14.0.0`, 2026-10-19** (753 releases, 12 in 6 m) · c90 **11**, hum90 **4** · issues **9 open / 1 342 closed** · PRs **5 open / 197 closed** · **MIT** · 29.8 MB · npm **670 758 dl30** · **the single Material Symbols source** (weight 500) — our one-icon-set rule · risks: not bundled in SDK 58 (dev build), and the per-icon packages each carry their own font file · **DECISION: KEEP (locked).**

**C61 — `software-mansion/react-native-svg`** https://github.com/software-mansion/react-native-svg — **8 009 ★** / 1 206 f · created **2016-01-17** · pushed **2026-10-15** · last release **v15.16.0, 2026-10-15** (132 releases, 2 in 6 m) · c90 **20**, hum90 **5** · issues **164 open / 1 666 closed** · PRs **90 open / 356 closed** · **MIT** · 91.5 MB · npm **34 109 400 dl30** · **Expo SDK 58 bundles 15.16.0** · the vector layer behind any custom icon or route ribbon · **DECISION: KEEP (SDK 58 bundled).**

**C62 — `expo/google-fonts`** https://github.com/expo/google-fonts — **945 ★** / 80 f · created **2020-05-02** · pushed **2026-10-12** · **no GitHub releases** · c90 **23**, hum90 **2** · issues **10 open / 58 closed** · PRs **1 open / 49 closed** · **MIT (code) / OFL-1.1 (font binaries)** · **8 269.7 MB** · the Figtree source; `@expo-google-fonts/figtree@0.4.1` (2025-09-12, "MIT AND OFL-1.1", **257 396 dl30**) is the installable artefact · **DECISION: KEEP the per-font package, never the repo.**

**C63 — `Shopify/flash-list`** https://github.com/Shopify/flash-list — **7 243 ★** / 401 f · created **2021-12-20** · pushed **2026-10-01** · last release **v2.3.3, 2026-10-01** (102 releases, 2 in 6 m) · c90 **3**, hum90 **2** · issues **82 open / 605 closed** · PRs **145 open / 929 closed** · **MIT** · 211.6 MB · npm **10 078 314 dl30** · **Expo SDK 58 bundles 2.3.2** (npm latest is 2.3.3) · the 300-stop list our performance budget names · **DECISION: KEEP — and actually install it: it is **not** currently a dependency of `apps/mobile`.**

**C64 — `software-mansion/react-native-screens`** https://github.com/software-mansion/react-native-screens — **3 739 ★** / 752 f · created **2018-08-03** · pushed **2026-10-20** · last release **5.0.0-alpha.4, 2026-10-14** (189 releases, 12 in 6 m) · c90 **238**, hum90 **12** · issues **191 open / 1 359 closed** · PRs **195 open / 393 closed** · **MIT** · 105.7 MB · npm **39 934 843 dl30** · **Expo SDK 58 bundles ~4.30.0** · **DECISION: KEEP (Expo Router dependency).**

**C65 — `appandflow/react-native-safe-area-context`** https://github.com/appandflow/react-native-safe-area-context — **2 768 ★** / 257 f · created **2019-08-14** · pushed **2026-10-16** · last release **v5.10.1, 2026-09-29** (97 releases, 6 in 6 m) · c90 **22**, hum90 **9** · issues **75 open / 383 closed** · PRs **32 open / 139 closed** · **MIT** · 6.4 MB · npm **42 897 003 dl30** · **Expo SDK 58 bundles ~5.10.1** · **DECISION: KEEP (bundled).**

**C66 — `margelo/react-native-mmkv`** https://github.com/margelo/react-native-mmkv — **8 518 ★** / 345 f · created **2021-02-24** · pushed **2026-10-08** · last release **v4.3.2, 2026-06-22** (113 releases, 1 in 6 m) · c90 **8**, hum90 **2** · issues **4 open / 509 closed** · PRs **20 open / 282 closed** · **MIT** · 37.3 MB · npm **5 785 329 dl30** · OSV: **0 advisories on the current 4.x line** (sprint #1 recorded GHSA-4jh3-6jhv-2mgp for `< 2.11.0` — fixed long before 4.3.2) · storage, not UI · **DECISION: KEEP (storage; verify the pin with `pnpm audit`).**

## 2. Shortlist (13) — scored against our bar

| # | Candidate | Decision | One-line reason |
|---|---|---|---|
| C28 | **software-mansion/react-native-reanimated 4.7.1** | **KEEP (locked)** | The only engine that meets "UI thread, 60/120 fps" across the whole surface; Expo SDK 58 bundles exactly 4.7.1; one historical ReDoS advisory fixed in 2.10.0. |
| C30 | **software-mansion/react-native-gesture-handler ~3.3.0** | **KEEP (locked)** | Gestures recognised on the UI thread; SDK 58 compatibility proven by merged PR #4612 (2026-10-19); 28 human maintainers, 217 commits/90 d. |
| C29 | **software-mansion/react-native-worklets 0.13.0** | **KEEP (locked) + declare it** | Reanimated 4's runtime; SDK 58 bundles 0.13.0; today it is only a transitive peer in `apps/mobile`, which is a phantom dependency. |
| C19 | **jpudysz/react-native-unistyles 3.5.3** | **KEEP (locked)** | Our only styling engine; 8 releases/6 m, 139 commits/90 d — but the repo has **no root LICENSE file**. |
| C63 | **Shopify/flash-list 2.3.3** | **KEEP + install it** | The 300-stop/60 fps requirement has no implementation today; SDK 58 bundles 2.3.2 and npm latest is 2.3.3. |
| C32 | **software-mansion-labs/react-native-bottom-sheet 0.17.0** | **PILOT (new)** | The only sheet whose physics are a **critically damped spring on both platforms** (ζ = 1, `SpringForce.STIFFNESS_MEDIUM` on Android, a closed-form ζ = 1 curve on iOS) — our rule by construction, not by configuration. |
| C33 | **lodev09/react-native-true-sheet 3.11.18** | **WATCH (benchmark against C32)** | Best-maintained sheet in the pool: 12 releases/6 m, 155 commits/90 d, 15 humans, 2 open issues. |
| C31 | **gorhom/react-native-bottom-sheet 5.2.14** | **WATCH, do not adopt new** | 11.9 M downloads/30 d and 0 commits since 2026-05-09; three open PRs hit Reanimated 4, reduce motion and `importantForAccessibility` — three of our bar rows. |
| C2 | **callstack/react-native-paper 5.15.3** | **WATCH (read, do not install)** | The only kit that shipped accessible-modal, portal-AT-hiding and reduce-motion-forwarding work in 2026 (#5124–#5126). |
| C5 | **founded-labs/react-native-reusables** | **WATCH (read, do not install)** | 22 components gained reduced-motion + portal a11y on 2026-07-02, and it ships a `uniwind` variant — the only kit with a Unistyles-adjacent path. |
| C44 | **appandflow/react-native-ease 0.9.0** | **WATCH** | The 2026 native-animation challenger (Core Animation / Android Animator, zero JS overhead) from a maintainer we already depend on. |
| C56 + C57 | **react-native-a11y 0.9.1 + react-native-a11y-order 2.0.1** | **WATCH (benchmark first)** | 1.73 M + 108 k downloads/30 d; two authors; both released in the last three weeks. |

**Second tier — evaluated, watched, not on the bar table:** C20 (uniwind 1.13.0 — the credible Tailwind-without-NativeWind challenger, 12 releases/6 m and 3.75 M downloads/30 d, but still CSS-in-RN and it needs a Metro transform worker), C45 (number-flow, the rolling counter), C42 (shadowlist), C39 / C38 (the two reorderable lists), C1 (tamagui), C4 (Wix UI lib), C3 (UI Kitten), C24 (bottom-tabs), C47 (zoom-toolkit), C54 (kinetikui), C40 (Skia), C36 (reanimated-carousel) — each covers one capability that none of the thirteen covers, and none of them changes a decision.

**Rejected as a group.** Second styling engine, and therefore barred by V4 §5: C6 `heroui-native` (npm peers `tailwind-merge`, `tailwind-variants`, `expo-blur`), C23 `nativewind`, C9 `gluestack-ui`, C37 `legend-motion` (peer `nativewind>=4.0.0`), C10 `nativecn`, and the NativeWind path of C5. Dead, archived, stale, unlicensed or barred by our own design rules: C7 NativeBase (no release since 2023-03-06, 0 commits/90 d), C8 react-native-elements (0 commits/90 d), C35 moti (no release since 2025-01-29), C48 draggable-flatlist (no release since 2025-05-07), C50 modalize (no release since 2022-08-10), C51 osdnk sheet, C25 tab-view (archived), C27 react-native-aria (archived), C43 Lottie (our "no decorative loops" rule), C49 worklets-core (superseded), C53 react-native-motion (no licence file), C58 react-native-rating (not a courier tool), C15 react-virgin, C16 expo-ui-kit, C17 react-native-design-system, C14 material-ui, C18 ios-kit, C12 pearl-ui, C13 magnus, C26 scrollable-tab-view (licence UNVERIFIED).

## 3. Deep review — top 5

### 3.1 `software-mansion/react-native-reanimated` (C28) — our locked motion engine

**Code I actually read** (paths in the repo, default branch `main`):

- `packages/react-native-reanimated/src/animation/spring/springConfigs.ts` — the spring contract. `SpringConfig` is a `MutuallyExclusiveUnion` of `{stiffness, damping}` and `{duration, dampingRatio, clamp}`; the documented defaults are **mass 4, damping 120, stiffness 900** (`GentleSpringConfig`), `duration` is a **perceptual** duration and "Actual duration is 1.5 times the value of perceptual duration", `dampingRatio` 1 = critically damped, `reduceMotion` defaults to `ReduceMotion.System`, `energyThreshold` defaults to 6e-9. `Reanimated3DefaultSpringConfig` (damping 10, mass 1, stiffness 100) is kept for v3 compatibility. **Checked:** our 150–250 ms bar maps to `duration: 200, dampingRatio: 1` (a critically damped, non-overshooting sheet) — and the realised wall time is ~300 ms, which we must record in the benchmark.
- `packages/react-native-reanimated/src/ReducedMotion.ts`, `ReducedMotionCommon.ts`, `ReducedMotion.native.ts` — `ReducedMotionManager` holds a JS value **and** a UI-thread mutable, so the flag can be flipped from the JS thread and read on the UI thread. `isReducedMotionEnabledInSystem()` on native reads the global `_REANIMATED_IS_REDUCED_MOTION`.
- `packages/react-native-reanimated/src/hook/useReducedMotion.ts` — **checked and flagged:** the hook captures `IS_REDUCED_MOTION_ENABLED_IN_SYSTEM` at module load and its own doc comment says "Changing the reduced motion system setting doesn't cause your components to rerender". Our "reduce motion is respected" rule therefore needs **our own** `AccessibilityInfo.addEventListener('reduceMotionChanged', …)` subscription, not just this hook.
- `packages/react-native-reanimated/src/layoutReanimation/SharedTransition.ts` — **checked and flagged:** `build()` sets `this.durationV = 500` when no duration is supplied, i.e. **the default shared-element transition is 500 ms, twice our budget**. Any use must set `duration` explicitly.
- `packages/react-native-reanimated/src/featureFlags/staticFeatureFlags.ts` — **checked and flagged:** `ENABLE_SHARED_ELEMENT_TRANSITIONS: false`, `USE_COMMIT_HOOK_ONLY_FOR_REACT_COMMITS: true`, `IOS_CSS_CORE_ANIMATION: false`, `EXPERIMENTAL_CSS_ANIMATIONS_FOR_SVG_COMPONENTS: true`. **Shared-element transitions are off by default in 4.7.1** and need the static flag flipped in the native build — a build-time decision with a Fabric/UI-thread risk surface.
- `packages/react-native-reanimated/src/index.ts` and `src/` tree — 60+ source directories (`animation/`, `layoutReanimation/`, `screenTransition/`, `css/`, `hook/`, `updateProps/`, `ReanimatedModule/`, `featureFlags/`), i.e. a real multi-thread engine, not a wrapper.

**Commits (last 20, 2026-10-12 → 2026-10-20, all on `main`)** — read individually:

| SHA | Date | Author | Subject |
|---|---|---|---|
| `af603ea3` | 2026-10-20 | piaskowyk | fix(Reanimated): keep settled props in the registry until React commits them (#10874) |
| `6c78605b` | 2026-10-20 | piaskowyk | fix(LayoutAnimations): handle a view that React Native's LayoutAnimation deletes without its descendants (#10902) |
| `1d2b2132` | 2026-10-19 | tshmieldev | fix(worklets): unpack captured variables with let (#10889) |
| `f21f7262` | 2026-10-16 | bartlomiejbloniarz | fix(LayoutAnimations): restore entering animations after Activity reactivation on iOS (#10397) |
| `cfa799bd` | 2026-10-16 | m-bert | fix: move animated styles, inline props and CSS to a replaced host view (#10826) |
| `d4abdfc9` | 2026-10-16 | m-bert | fix: re-resolve getAnimatableRef() when an animated component updates (#10825) |
| `8ca5e8bf` | 2026-10-16 | gre | fix(Easing): use the closed-form solver of bezier-easing 3.2 in Easing.bezier (#10831) |
| `bddd763a` | 2026-10-16 | YevheniiKotyrlo | fix: keep box-shadow blur radii below 1 on Android (#10890) |
| `40fb3193` | 2026-10-16 | tshmieldev | fix: reject inherited object keys in the remaining style processors (#10905) |
| `505638fa` | 2026-10-15 | piaskowyk | fix(android): accept Groovy GString for ndkVersion and ndkPath (#10544) |
| `e8c191df` | 2026-10-15 | YevheniiKotyrlo | fix(Worklets): keep the library prefix of a worklet name under a Windows path in the Oxc plugin (#10856) |
| `755ebeab` | 2026-10-15 | m-bert | fix: resolve the DOM element of a `getAnimatableRef` component on web (#10829) |
| `52ce7103` | 2026-10-15 | pawicao | fix(CSS): remove a Core Animation transition from a view that React Native reuses (#10892) |
| `a03d13c9` | 2026-10-15 | MatiPl01 | fix(CSS): handle PlatformColor and DynamicColorIOS values (#10282) |
| `bc0b4bf0` | 2026-10-15 | pawicao | fix: report useAnimatedSensor availability on the first render (#10662) |
| `07bd2f7d` | 2026-10-14 | pawicao | chore(Reanimated): remove the shared element transition code from the web AnimatedComponent (#10777) |
| `57eae0f0` | 2026-10-14 | pawicao | fix(LayoutAnimations): start a back transition only from a visible screen (#10764) |
| `27e6790d` | 2026-10-14 | pawicao | fix(LayoutAnimations): show a view again when its shared transition tag is removed or changed (#10618) |
| `d5f07d37` | 2026-10-14 | pawicao | fix(LayoutAnimations): use a changed sharedTransitionTag in Shared Element Transitions (#10768) |
| `ca7c3fbc` | 2026-10-14 | dependabot[bot] | chore(deps): bump source-map-js from 1.2.1 to 1.2.2 (#10861) |

**PRs opened and merged in the 2026 window** (search `repo:software-mansion/react-native-reanimated is:pr is:merged created:>=2026-07-01`, 705 matches; the eight most recent are listed above with their PR numbers and merge dates). The shared-element work is in **four of the last twenty commits**: #10768 (changed `sharedTransitionTag`), #10618 (tag removed or changed), #10764 (back transition only from a visible screen), #10777 (shared-element code removed from the **web** AnimatedComponent).

**Issues opened in the 2026 window** (search `repo:software-mansion/react-native-reanimated is:issue created:>=2026-09-01`, 56 matches; the eight most recent, all still open unless stated):

| # | Opened | Title |
|---|---|---|
| #10922 | 2026-10-19 | [Worklets][Android] `AsyncQueue` has no key function, so `queue: customQueue` from another shared library is silently dropped and the first `scheduleOnRuntime` crashes (SIGSEGV) |
| #10913 | 2026-10-19 | [iOS] Crash in ReanimatedModuleProxy constructor on reload during first bundle evaluation (null WorkletsModuleProxy) |
| #10911 | 2026-10-16 | [iOS][Fabric] Fatal "Value is null, expected an Object" when a worklet onLayout handler receives a cancelled layout event |
| #10910 | 2026-10-16 | [Worklets] Per-runtime caches keyed on jsi::Runtime\* return a dead runtime's values when a new runtime reuses its address (SIGSEGV) |
| #10908 | 2026-10-15 | [iOS] Mac Catalyst build failed by both AppKit and UIKit imported in REAReducedMotion.h in Reanimated 4.7.x |
| #10906 | 2026-10-15 | [Android][Fabric] 3.18.2: UI thread deadlocks in nested performOperations when a view dispatches an event synchronously during a layout-animation mount |
| #10899 | 2026-10-15 | [SET][Android] Border width changes late during shared element transitions |
| #10887 | 2026-10-14 | Worklet assigning to a captured variable is a Hermes parse-time bomb — should fail at build time (closed 2026-10-19) |

**Verdict:** keep 4.7.1. Two operational rules fall out of the code: (a) **do not use `SharedTransition` with its default duration — set `duration: 200`**; (b) **enable shared-element transitions only behind a build flag and only for the one stop→sheet transition that carries meaning**, because #10618/#10768/#10899 show the tag lifecycle is still being hardened.

### 3.2 `software-mansion/react-native-gesture-handler` (C30) — our locked gesture engine

**Code read:** the repo root and `packages/` layout (docs, examples, the `Gesture`/`GestureDetector` API, `NativeViewGestureHandler` platform flags). The README's core claim — gestures are recognised and tracked on the **UI thread**, not through the JS responder system — is the technical basis of our "no jank" budget and it holds.

**Commits / PRs in the 2026 window** (search `repo:software-mansion/react-native-gesture-handler is:pr is:merged created:>=2026-08-01`, 177 matches):

| # | Opened → merged | Author | Subject |
|---|---|---|---|
| #4615 | 2026-10-19 → 2026-10-20 | m-bert | [Jest] Mock `installUIRuntimeBindings` in `jestSetup.js` |
| **#4612** | **2026-10-19 → 2026-10-19** | m-bert | **Bump to `expo` sdk 58** |
| #4606 | 2026-10-16 → 2026-10-16 | m-bert | Update compatibility table for 3.4.0 |
| #4605 | 2026-10-16 → 2026-10-16 | m-bert | [Android] Check the overflow ancestor pass against the detector child's bounds |
| #4604 | 2026-10-16 → 2026-10-16 | m-bert | Stop `react-native-pager-view` from entering the web bundle of the example app |
| #4603 | 2026-10-16 → 2026-10-20 | radko93 | [iOS] Keep button children in mount order behind the underlay layer |
| #4601 | 2026-10-16 → 2026-10-16 | m-bert | Keep the pointerEvents ts-expect-error in emitted spec declarations |

**#4612 is the SDK 58 compatibility proof.** The release `v3.4.0` (2026-10-16) came with the compatibility table update in #4606; `v2.33.1` was also published 2026-10-16 for the older line.

**Issues opened in the 2026 window** (search `repo:software-mansion/react-native-gesture-handler is:issue created:>=2026-08-01`, 41 matches):

| # | Opened | State | Title |
|---|---|---|---|
| #4619 | 2026-10-20 | open | [Web][3.4.0] `reanimatedWrapper` crashes Vite dev server and increases bundle size in production |
| #4617 | 2026-10-19 | open | `ReanimatedSwipeable`: action panes are visible at rest when the row content is not fully opaque |
| #4616 | 2026-10-19 | open | `ReanimatedSwipeable`: a cancelled or failed pan still opens the row and fires `onSwipeableOpen` |
| #4613 | 2026-10-19 | closed 2026-10-20 | Jest: `[Worklets] getUIRuntimeHolder is not supported on web` thrown from installUIRuntimeBindings |
| #4611 | 2026-10-19 | closed 2026-10-19 | GestureDetector with Reanimated retains unmounted native views when the gesture has touch callbacks (Android) |
| #4608 | 2026-10-18 | open | [Android] An active gesture is cancelled when Fabric moves its GestureDetector's view |
| #4607 | 2026-10-16 | open | [Web] Pan drops the position of the pointer move that leaves (or re-enters) the view: no onUpdate, onEnd reports a stale position |
| #4602 | 2026-10-16 | closed 2026-10-20 | [iOS] Button children mounted after the first render end up behind their siblings (content goes blank) |

**Verdict:** keep, pinned. Two notes for the design squad: (a) **#4616/#4617 are exactly the "swipe a stop to mark failed" gesture we want** — a cancelled pan must not open the row, so we must implement our swipe-to-deliver with an explicit `onFinalize` state check, not by copying the upstream behaviour; (b) **#4619** is a web-dashboard concern only.

### 3.3 `software-mansion-labs/react-native-bottom-sheet` (C32) — the 2026 entrant

**Code I actually read:**

- `package.json` — name `@swmansion/react-native-bottom-sheet`, version 0.17.0, MIT, `peerDependencies: { react: ">=18.0.0", react-native: ">=0.76.0" }`, devDependencies pinned to `react-native@0.88.0` and `react@19.3.0`, `codegenConfig` for `ReactNativeBottomSheetSpec` with iOS `componentProvider` entries for `BottomSheetView` and `BottomSheetSurfaceView` and `android.javaPackageName: com.swmansion.reactnativebottomsheet`. **No `react-native-reanimated` peer at all** — this is not a Reanimated component.
- `src/BottomSheet.tsx` (381 lines) — the public API: `detents` (numbers, `'content'` and `0 %`–`100 %` strings, ascending by height), a required zero-based `index`, `animateIn`, `animateContentHeight`, `surface` (a separate view rendered behind the content so a shrinking content height never exposes blank space), `onPositionChange` (position in points + a fractional detent index), and `scrollableNegotiation` with `none` / `initial` / `handoff` modes. The file also documents the `CONTENT_HEIGHT_MARKER_NATIVE_ID` contract ("They look it up by this nativeID rather than by sibling index, because Fabric mounts siblings sorted by zIndex") and says the Swift and Kotlin hosts must be kept in sync with it.
- `src/BottomSheetNativeComponent.ts`, `src/BottomSheetSurfaceNativeComponent.ts` — codegen'd Fabric components: the sheet **is** a native view, not a JS-driven animated view.
- `ios/CriticalSpring.swift` (45 lines) — the whole physics file, and it is the clearest statement of the spring this library uses: *"Critically damped (ζ = 1): reaches the target as fast as possible without overshooting"*, with `from`, `target`, `v0` (initial velocity carried over from a finger flick), `omega` (angular frequency), a closed-form solution `x(t) = target + e^(-ωt)·[A + (v0 + ωA)·t]`, and `keyframeValues(count:)` which samples that curve into a `CAKeyframeAnimation` so the render server does the replay.
- `android/src/main/java/com/swmansion/reactnativebottomsheet/BottomSheetHostView.kt` (2 090 lines) — the Android counterpart uses `androidx.dynamicanimation.animation.SpringAnimation` / `SpringForce` with `dampingRatio = SpringForce.DAMPING_RATIO_NO_BOUNCY` (ζ = 1) and `stiffness = SpringForce.STIFFNESS_MEDIUM`. **Checked: iOS and Android agree on the damping ratio**, which is exactly the cross-platform consistency our design gate needs.
- `common/cpp/react/renderer/components/ReactNativeBottomSheetSpec/` — C++ shadow nodes (`BottomSheetViewShadowNode.cpp`, `BottomSheetViewState.h`, `BottomSheetStateHelper.h`), i.e. the sheet's geometry is computed in Fabric's layout pass, not in JS. **No layout thrash from the JS thread.**

**Commits / PRs / issues in the 2026 window** (searches `repo:software-mansion-labs/react-native-bottom-sheet is:issue created:>=2026-01-01` → 57 matches; `is:pr created:>=2026-08-01` → 19 matches):

| # | Kind | Opened → closed | Author | Subject |
|---|---|---|---|---|
| #101 | PR | 2026-10-20 → open | falcondpr | docs: document React context behavior in modal sheets |
| #100 | PR | 2026-10-18 → 2026-10-18 | dkulakov | fix(android): re-place sheet content after a frame-size state commit |
| #98 | PR | 2026-10-17 → 2026-10-18 | dkulakov | fix: identify the content-height marker by nativeID, not by position |
| #97 | PR | 2026-10-17 → 2026-10-18 | dkulakov | fix: lay the content region out against the tallest detent |
| #94 | PR | 2026-10-12 → open | DanyKrk | fix(example): support iPhone Duo on Xcode 27 |
| #88 | PR | 2026-09-25 → 2026-10-18 | dkulakov | fix: let views drawn over a scrollable drag the sheet |
| #96 | issue | 2026-10-16 → open | magnesae | [Android][Fabric] Sheet content keeps its pre-rotation frame, so controls past the old width ignore taps |
| #95 | issue | 2026-10-13 → open | DanyKrk | [Feature request] iOS: support leading, trailing, and centre placement for ModalBottomSheet |
| #93 | issue | 2026-10-09 → 2026-10-18 | DanyKrk | Example app cannot run on Xcode 27 because it uses an Expo CLI version without Device Hub support |
| #92 | issue | 2026-10-05 → 2026-10-18 | Oupsla | [iOS] `scrollableNegotiation="none"` is ignored on a fresh sheet |
| #91 | issue | 2026-10-05 → 2026-10-16 | dkulakov | Scrollable can't reach its last items when the tallest detent is a fixed height below the available height |
| #90 | issue | 2026-10-01 → 2026-10-18 | valeriavodianchuk | [Android] Tapping the ModalBottomSheet scrim also presses react-native-gesture-handler buttons underneath |
| #87 | issue | 2026-09-23 → open | dkulakov | Support a max width / centred sheet on tablets and in landscape |
| #86 | issue | 2026-09-23 → 2026-10-18 | Ahmedhamed77 | [Android][Fabric] A mounted sheet (also when closed) commits a state update on every frame |

**Verdict:** **pilot it**. It is the only candidate whose spring is a real spring with ζ = 1 on both platforms and whose layout is computed in C++, which is the cleanest possible answer to "spring physics for sheets, no layout thrash". The honest risks: it is **eight months old with 447 stars**, it is **not bundled in Expo SDK 58 and ships no Expo config plugin** (so `expo prebuild` + a dev build), it has **no FlashList integration**, and it cannot do a Reanimated shared-element transition because it is not a Reanimated view.

### 3.4 `gorhom/react-native-bottom-sheet` (C31) — the incumbent, re-verified

**What I checked and what it shows.** The default branch is `master`. The last twelve commits, read in full:

| SHA | Date | Author | Subject |
|---|---|---|---|
| `9bfbeb52` | 2026-05-09 | gorhom | chore: release v5.2.14 |
| `5853f117` | 2026-05-09 | gorhom | fix: read window height from a shared value on ui thread |
| `782e00c9` | 2026-05-09 | huextrat | fix: allow mount animation alongside keyboard during initial open (#2661) (#2665) |
| `bc94d544` | 2026-04-30 | gorhom | chore: release v5.2.13 |
| `03a215c9` | 2026-04-30 | huextrat | fix(modal): restore React mount reset after unmount (#2664) |
| `ef980bc6` | 2026-04-29 | gorhom | chore: release v5.2.12 |
| `5e4f00d6` | 2026-04-29 | rozhkovs | fix: updated getting scrollable ref for BottomSheetSectionList on Web 5.2.10 (#2662) |
| `8964c060` | 2026-04-28 | gorhom | chore: release v5.2.11 |
| `17ee2217` | 2026-04-28 | gorhom | fix(#2639): use window height as initial position |
| `2b4a338e` | 2026-04-28 | gorhom | fix(#2632): rewrote the modal status logic to prevent getting out of sync |
| `325ade63` | 2026-04-28 | gorhom | fix(#2639): removed screen and window layout constants |
| `b1098289` | 2026-04-28 | gorhom | chore: updated example deps |

**Checked: the last commit on `master` is 2026-05-09 — 165 days before this review.** Sprint #1 called this "active-but-branchy"; the branch list (`fix/allow-keyboard-height-reactivity`, `fix/632-prevent-content-interactions-while-animating`, `master`, `v2`, `v3`, `v4`, `v6`, `website`, `gh-pages`) shows no active release branch either. **26 PRs are open** and the newest, #2786, was created **2026-10-19** and is still open one day later.

**The three open PRs that decide our bar:**

- **#2727 "Feat/reanimated 4 support and Fix Issues"** (misaku, opened **2026-07-29**, last updated **2026-10-10**, 16 commits, 21 files changed, 7 comments, 1 review, **not merged**). Its body: *"critical visual glitches and layout desynchronization issues occurring on Android when using React Native Reanimated v4 with the New Architecture (Fabric)"* — a content-mask collapse (#2702, #2716) where the `BottomSheetContent` height animation desynchronises from the `BottomSheetBody` transform, and a *flash-through* of the screen behind during a slow drag-to-close. **We are on Reanimated 4 + New Architecture only.** This is the single most important finding in this section.
- **#2652 "fix: bottom sheet not appearing with android reduce motion"** (coolsoftwaretyler, opened **2026-04-14**, last updated **2026-04-29**, 1 commit, 9 comments, **not merged**). The sheet does not appear at all when the Android reduce-motion setting is on. **Our bar says reduce motion must make the transition instant, never removed** — this library removes it.
- **#2709 "feat(accessibility): forward importantForAccessibility prop"** (vicprz, opened **2026-06-30**, last updated **2026-10-02**, 4 commits, 8 files, 6 comments, **not merged**). `importantForAccessibility` was not forwarded, so on Android the whole sheet is one focusable element and a screen reader cannot navigate inside it. **That is a WCAG 2.2 AA failure for us.**

Two more, both open: **#2671** "let user-initiated snaps interrupt a forceClose" (2026-05-12, updated 2026-10-20) and **#2786** "keep unmeasured modal container height unmeasured when insets are set" (2026-10-19), whose body shows `useAnimatedLayout` seeding `containerHeight` from `INITIAL_LAYOUT_VALUE (-999)` and then subtracting insets.

**Issues opened in 2026:** 127. The eight most recent are all from 2026-10-18/19 and include **#2785** "Reanimated >= 4.6 'Dependencies should only be used on the web' warnings from 28 hook call sites (BottomSheet, Backdrop, Content, …)", **#2782** "BottomSheetBody ignores left and right safe-area insets (landscape cutouts, iPhone Duo rail)", **#2781** "Android hardware back pops the screen instead of dismissing the top BottomSheetModal" and **#2784** "Pan-down close: a callback to confirm before the sheet closes".

**Verdict:** **do not adopt as a new dependency.** It is the most-downloaded sheet in the pool (11.9 M/30 d) and it is the right API, but the maintainer has merged nothing since 2026-05-09 and the three open PRs that would fix Reanimated 4, reduce motion and screen-reader access are all unmerged. If a sheet ships, it ships on **C32** (pilot) or **C33** (watch), with the gorhom library kept only as the fallback we already know.

### 3.5 `founded-labs/react-native-reusables` (C5) — the UI kit to read, not to install

**Code I actually read:**

- `README.md` — "Bringing shadcn/ui to React Native. Beautifully crafted components with Nativewind, open source" — the primary path is NativeWind. The repo root is a **pnpm + Turborepo monorepo** (`@rnr/monorepo`) with `packages/registry` and `packages/unistyles`, plus `apps/`, `catalogs/` and a `pnpm-workspace.yaml`.
- `packages/registry/src/` — **`nativewind/` and `uniwind/` side by side**, each with `components/ui/` and `lib/`. The `uniwind` variant is the one that would fit a Tailwind-free stack; the nativewind variant is the one that ships.
- `packages/registry/src/nativewind/components/ui/native-only-animated-view.tsx` — read in full: a thin wrapper that renders `children` unchanged on web and an `Animated.View`/`AnimatedPressable` on native, so layout animations do not run in the browser build. **This is the "animation only where it carries meaning" idea we want.**
- The two 2026-07-02 commits, read via the GitHub commit API with their file lists:
  - **`87dfb2bc`** "feat: improve accessibility for all components that use a portal and reduce motion when device has reduced motion" — 22 files, all under `packages/registry/src/{nativewind,uniwind}/components/ui/`: `accordion.tsx` (+4/−1), `alert-dialog.tsx` (+6/−4), `context-menu.tsx` (+5/−4), `dialog.tsx` (+8/−3), `dropdown-menu.tsx` (+4/−4), `hover-card.tsx` (+8/−3), `menubar.tsx` (+5/−3), `native-only-animated-view.tsx` (+8/−2), `popover.tsx` (+8/−3), `select.tsx` (+12/−6), `tooltip.tsx` (+12/−5).
  - **`119d0b10`** "feat: enhance components with reduced motion support and improve accessibility for overlays" — the same 22 components, mirrored into the published registry JSON under `apps/docs/public/r/{nativewind,uniwind}/*.json`.
  **Checked: the change is applied identically to the NativeWind and the Uniwind variants**, which is exactly how a kit supports two styling engines without forking its behaviour.

**Commits (the last 15 on `main`)** — read: `385834c2` 2026-09-27 (introduce catalogs.dev, new docs and components), `5f586101` 2026-09-27 (add Accordion, Alert, Alert Dialog, Aspect Ratio, Avatar, Badge, Button), `a477f2c9` 2026-09-17 (web-specific features, colour-scheme sync), `119d0b10` 2026-07-02, `87dfb2bc` 2026-07-02, `397ae947` 2026-07-02 (bump `@rn-primitives` to 1.5.2), `5825f3c6` 2026-07-02 (Argent environment inspector and MCP server configuration), `f7917aa8` 2026-06-19, `9528d28d` 2026-06-19, `b0601d59` 2026-06-03, `3e6332e0` 2026-02-17, `2a535528` 2026-06-01`, `00404e62` 2026-05-26`, `7c287b97` 2026-05-02`, `c7d22b14` 2026-05-02.

**Maintenance health:** 3 commits in 90 days, **1 human author** in the first 100 commits, **no release in 6 months** (the last, `rn-primitives@1.4.0`, is dated 2026-03-28), 16 issues open and 328 closed, 1 PR open. The repo is *large* and *popular* (8 702 ★) but *slow* — and it ships an agent skill and an MCP server for "mobile app interaction", which is a tooling choice, not a product guarantee.

**Verdict:** **read, do not install.** Its value to us is three specific, transplantable ideas: (1) a **reduce-motion branch on every overlay** applied in one pass across all 11 overlay components; (2) **portal accessibility** (hide the content below an overlay from the screen reader); (3) a **native-only animated view** so web never pays for native layout animations. All three are small enough to re-implement in our own `packages/design-tokens` consumer layer with Unistyles 3, which is what we should do.

## 4. Benchmark

**I did not run a benchmark and I will not invent one.** `docs/squads/design/` does not exist; there is no eval set, no Maestro visual baseline and no emulator is permitted locally (AGENTS.md). **Every row below is UNVERIFIED.** What each row needs to be measured is stated.

**The set that must be built (`docs/squads/design/benchmarks/`):**

1. `sheet-spring/` — the same sheet content in three implementations: our own `Sheet.tsx` (RN `Animated.timing`), `@gorhom/bottom-sheet` 5.2.14, and `@swmansion/react-native-bottom-sheet` 0.17.0. Same detents, same content, same device profile. Record: open and close wall time, spring settle time, overshoot, dropped frames.
2. `stops-300/` — 300 synthetic stops through FlashList 2.3.3 against `FlatList`, scrolled on the CI emulator and on one mid-range Android profile. Record frame timings, not averages.
3. `a11y-focus-order/` — TalkBack and VoiceOver traversal of the Driving screen and the stop sheet. Pass = correct order, no trap, no unreachable control.
4. `dynamic-type-200/` — the three screens that matter (Today's list, Driving night, Dictation report) at 200 % text on a small phone. Pass = no clipping, no truncation, the 72 pt primary action still reachable.
5. `reduce-motion/` — the same transitions with the OS reduce-motion setting on. Pass = instant, and the state change still happens.
6. `contrast/` — the token set measured against WCAG 2.2 AA (driving text ≥ 7:1, rest ≥ 4.5:1) for all three themes. This one is a design-time check and can be run in CI without a device.
7. `apk-size/` — the APK with and without each native dependency we consider adding (Skia, a sheet library), against the ≤ 80 MB budget.

| Bar (our own) | Target | Reanimated 4.7.1 | Gesture Handler ~3.3.0 | gorhom bottom-sheet 5.2.14 | SWM Labs bottom-sheet 0.17.0 | true-sheet 3.11.18 | react-native-ease 0.9.0 | FlashList 2.3.3 | Paper 5.15.3 | reusables (registry) |
|---|---|---|---|---|---|---|---|---|---|---|
| 60/120 fps, no layout thrash | CI emulator, 0 dropped frames | **UNVERIFIED** (UI-thread by design) | **UNVERIFIED** (UI-thread by design) | **UNVERIFIED** (JS-driven layout) | **UNVERIFIED** (Fabric C++ layout — best structural position) | **UNVERIFIED** | **UNVERIFIED** (platform-native) | **UNVERIFIED** (not installed) | **UNVERIFIED** | **UNVERIFIED** |
| Durations 150–250 ms | `duration: 200` | **UNVERIFIED**; note `duration` is *perceptual* and actual = 1.5× | n/a | **UNVERIFIED** | **UNVERIFIED**; ζ = 1 spring, `STIFFNESS_MEDIUM` | **UNVERIFIED** | **UNVERIFIED** | n/a | n/a | n/a |
| Spring physics for sheets | real spring, ζ = 1 preferred | supports it (`withSpring`, `duration` + `dampingRatio`) | n/a | supports it (Reanimated `withSpring`) — **but see the open PRs** | **yes by construction** (`CriticalSpring.swift`, `SpringForce.DAMPING_RATIO_NO_BOUNCY`) | supports it | **UNVERIFIED** | n/a | n/a | n/a |
| No layout thrash | layout off the JS thread | yes (worklets) | yes | **UNVERIFIED**; PR #2727 reports Fabric glitches | yes (C++ shadow nodes) | **UNVERIFIED** | yes (platform-native) | **UNVERIFIED** | n/a | n/a |
| Shared-element transitions | only where meaningful | **flag off by default in 4.7.1; default duration 500 ms** | n/a | n/a | not supported (not a Reanimated view) | n/a | **UNVERIFIED** | n/a | n/a | n/a |
| Reduce motion respected | instant, never removed | **partial** — `useReducedMotion` does not re-render; we must subscribe ourselves | n/a | **FAILS today** — PR #2652 open since 2026-04-14 | **UNVERIFIED** | **UNVERIFIED** | **UNVERIFIED** | **UNVERIFIED** | n/a | reduce-motion branch on all 11 overlay components (2026-07-02) — **UNVERIFIED** whether it matches our "instant, never removed" rule |
| 200 % dynamic type | no clipping | n/a (no text) | n/a | **UNVERIFIED** | **UNVERIFIED** | **UNVERIFIED** | **UNVERIFIED** | **UNVERIFIED** | **UNVERIFIED** | **UNVERIFIED** |
| Night mode | automatic by sunset + manual | n/a | n/a | n/a | n/a | n/a | n/a | n/a | **UNVERIFIED** | **UNVERIFIED** |
| WCAG 2.2 AA | screen reader, contrast, focus order | n/a | **UNVERIFIED** (prerequisites for a11y libs) | **FAILS today** — PR #2709 open since 2026-06-30 | **UNVERIFIED** | **UNVERIFIED** | **UNVERIFIED** | **UNVERIFIED** | ships the right primitives: accessible Modal, portal hides content below modals from AT, reduce-motion forwarded (#5124–#5126). **Full AA still UNVERIFIED** | reduce-motion + portal a11y applied across all 11 overlay components (2026-07-02). **Full AA still UNVERIFIED** |
| APK ≤ 80 MB | measured on CI | bundled, no extra cost | bundled, no extra cost | not bundled (dev build) | not bundled (dev build) | not bundled (dev build) | not bundled (dev build) | bundled | JS only | JS only |
| Licence gate | no GPL/AGPL/CC-NC | MIT | MIT | MIT | MIT | MIT | MIT | MIT | MIT | MIT |

**The two facts that already fail before any measurement** are the gorhom reduce-motion bug (#2652) and the gorhom `importantForAccessibility` gap (#2709). Those are code and issue evidence, not benchmark results.

## 5. What we are missing

Rows for `docs/PARITY.md`. The **Spoke (2026-10-20)** column carries only facts verified in `docs/study/spoke/TEARDOWN.md`; where I could not verify it, the cell is empty.

| # | Family | Feature | Status | Spoke (2026-10-20) | Our edge | Task |
|---|---|---|---|---|---|---|
| D1 | Design system | Motion tokens that encode **spring physics** (mass/damping/stiffness, or duration + damping ratio) for sheets | Planned (task) | | Tokens live only in `packages/design-tokens`; a component adds a token first | T6 |
| D2 | Design system | Our token set says **Inter / JetBrains Mono** while `docs/design/SYSTEM.md` §2 locks **Figtree** | Planned (task) | | One font set, no fallback drift | T6 |
| D3 | Accessibility | Touch targets: `touchTarget.minimum` is **44 px**; our bar is **≥ 56 pt** (72 pt primary) | Planned (task) | "The developer has not yet indicated which accessibility features this app supports" (S13, S14) | 72 pt primary in the lower third, reachable one-handed in a mount | T6 |
| D4 | Accessibility | Body text `fontSizes.base` is **16 px**; our bar is **≥ 17 pt** | Planned (task) | | Read at a glance in a moving van | T6 |
| D5 | Motion | The app's own `Sheet` uses React Native `Animated.timing`, **not Reanimated 4 and not a spring** | Planned (task) | | 60/120 fps on the UI thread, spring physics for sheets | T6 |
| D6 | Motion | The app's `Sheet` has **no drag-to-dismiss gesture** and **no reduce-motion branch** | Planned (task) | swipe the stop left/right to mark Failed/Delivered, swipe again to undo (S9) | gesture that cannot fire on a cancelled pan, plus a spoken equivalent | T6, T7.7 |
| D7 | Motion | **Haptics on confirm, deliver and error** — `expo-haptics` is not installed | Planned (task) | | never on scroll | T6, T7.5 |
| D8 | Motion | **Shared-element transitions** are off by default in Reanimated 4.7.1 and default to 500 ms | Planned (task) | | a stop opening its sheet is the only transition that carries meaning; 200 ms | T6 |
| D9 | Motion | **Reduce motion** — `useReducedMotion()` never re-renders, so we need our own subscription | Planned (task) | | transitions become instant, never removed | T6 |
| D10 | Motion | **Night mode by sunset** — the theme follows the OS colour scheme only | Planned (task) | theme Light/Dark/Automatic/Follow-system (S11) | night falls at the right hour in Christchurch, on the phone in a mount | T6, T5.2 |
| D11 | Design system | Night theme background is **`#09090b`**; `docs/design/SYSTEM.md` §3 says `#0A0A0A`–`#121212`, never pure black | Planned (task) | | low-blue night palette for a windscreen | T6, T5.2 |
| D12 | Performance | **FlashList is not installed** although §5 and `CONSTRAINTS.md` require 300 stops at 60 fps | Planned (task) | | 300+ stops without a frame drop | T6, T7.7 |
| D13 | Driver tools | **Drag reorder of the stop list** with a voice equivalent | Planned (task) | map + list, Refine → Manually order route → draw circles on the map (S7, S8) | voice reorder with the list as the primary surface | T7.7 |
| D14 | Driver tools | **A rolling, glanceable number** for "stops remaining" (48–76 pt, tabular) | Planned (task) | | a digit-rolling counter with `Intl.NumberFormat` | T6, T7.7 |
| D15 | Accessibility | **Screen-reader focus order and focus trapping** inside the stop sheet | Planned (task) | no accessibility declaration in either store listing (S13, S14) | TalkBack/VoiceOver can reach every control inside a sheet | T6 |
| D16 | Design system | **A token pipeline that actually runs** — the package claims Style Dictionary but ships plain TypeScript objects | Planned (task) | | one source of truth that also emits the web dashboard's CSS variables | T6 |
| D17 | Accessibility | **Contrast gate** over all three themes (driving text ≥ 7:1, rest ≥ 4.5:1) measured in CI | Planned (task) | | above Spoke's published position by default | T6, T7.15 |
| D18 | Driver tools | **Android Auto / CarPlay readiness** — a simplified projection of the driving screen | Planned (task) | the phone projects a simplified Spoke to the head unit (S10) | the projection shows the next address and one primary action | T7.7, T7.15 |
| D19 | Earnings | A **tabular-numeral money/ETA treatment** for the end-of-day summary | Planned (task) | no earnings, mileage logbook or IRD export in either Spoke product (S2, S3, S5) | NZD with GST in the driver's own ledger | T7.11, T7.12 |
| D20 | Driver tools | **A parcel-location code** the driver can read at a glance in the van | Planned (task) | package finder with a code such as "Small Box BLS = Small Box Back, Left, Shelf" (S8) | ask the van where a parcel is, by voice | T7.2 |

## 6. Decision

1. **The stack stays.** Reanimated **4.7.1** and Gesture Handler **~3.3.0** stay, pinned exactly, because Expo SDK 58 bundles precisely those versions and they are the only candidates that meet the UI-thread bar. `react-native-worklets@0.13.0` is **added as an explicit dependency** of `apps/mobile` — it is currently only a transitive peer, which breaks the exact-pin rule in `CONSTRAINTS.md`. **Gesture Handler 3.4.0 (2026-10-16) is available but is not adopted in this step**: Expo SDK 58 bundles `~3.3.0`, the bump is a separate reviewed change under the V4 §3.4 re-check rule, and 3.4.0's open issues include #4619 (web bundle) and #4616/#4617 (`ReanimatedSwipeable` opens a row on a cancelled pan) — both of which we would have to design around anyway.
2. **Our own `Sheet` is rewritten on Reanimated 4 with a real spring.** `duration: 200, dampingRatio: 1` (ζ = 1, no overshoot), a `useReducedMotion` branch that makes the transition instant, a gesture-handler drag-to-dismiss, and `useSharedValue` for the height so nothing reads the JS thread. This is a small amount of code and it removes three of our own gaps at once; the sheet *library* is a separate question.
3. **No sheet library is adopted now.** We **pilot `@swmansion/react-native-bottom-sheet@0.17.0`** in the `sheet-spring` benchmark because it is the only candidate whose physics are a critically damped spring on both platforms with the layout in C++. We **do not adopt `@gorhom/bottom-sheet`**: 0 commits since 2026-05-09 and three unmerged PRs that hit Reanimated 4, reduce motion and `importantForAccessibility` — three of our bar rows. `react-native-true-sheet` is the backup if the pilot fails.
4. **No UI kit is adopted.** The kit decision is: **we write our own components on `packages/design-tokens` + Unistyles 3, and we read three kits for patterns only** — Paper's accessible modal and portal work (#5124–#5126), reusables' reduce-motion and portal-a11y sweep (2026-07-02) and `NativeOnlyAnimatedView`, and Tamagui's compile-time token flattening idea. Nothing is installed, so there is no second token system and no second styling engine.
5. **Hard rejections stand and are now evidenced:** NativeWind and everything built on it (`heroui-native`, `nativecn`, `gluestack-ui`, `legend-motion`, the NativeWind path of reusables) — V4 §5; Lottie — our own "calm, not clever, no decorative loops" rule; `expo-blur` — the "no glass" rule.
6. **ADR proposals (the decisions are not changed here):**
   - **ADR-005 — Expo SDK 58 in the mobile app.** `docs/DECISIONS.md` D21 (2026-10-20) says "Expo SDK 57 مقفل" (Expo SDK 57 is locked; any version change needs an ADR with an official source), but `apps/mobile/package.json` pins `expo ~58.0.14` and `react-native 0.88.0`, and Expo SDK 58 is what bundles our pinned Reanimated 4.7.1, Worklets 0.13.0, Gesture Handler ~3.3.0 and FlashList 2.3.2. **Proposed: record SDK 58 as the locked platform, with `expo/expo`'s `packages/expo/bundledNativeModules.json` as the official source.** The founder decides; this file does not change D21.
   - **ADR-006 — the shared-element transition budget.** `SharedTransition` defaults to 500 ms and `ENABLE_SHARED_ELEMENT_TRANSITIONS` is `false` in 4.7.1. **Proposed: enable the flag only for the stop→sheet transition, with an explicit `duration: 200`, behind a build-time flag and a Maestro screenshot gate.** This keeps V4 §5 ("shared-element transitions where they carry meaning") intact and does not weaken `docs/design/SYSTEM.md` §5.
   - **ADR-007 — the styling rule wording.** "Unistyles 3 only" currently also rules out `uniwind`, a Tailwind v4 pipeline that is technically not NativeWind. **Proposed: state explicitly whether "Unistyles 3 only" means "no CSS-in-RN at all" or "no NativeWind".** This does not change the decision; it removes the ambiguity a future squad would hit.

## 7. Risks and fallbacks

| Risk | Impact | Fallback |
|---|---|---|
| Shared-element transitions are experimental in Reanimated 4.7.1 (flag off, 500 ms default, four open fixes in the last 20 commits) | a stop→sheet transition that flickers on Android | Keep the flag off by default; if it cannot be made stable, use a plain cross-fade with `duration: 200` and no shared tag. The information is carried by the sheet title and the spoken stop, not by the animation. |
| `react-native-worklets` is a phantom dependency today | a worklet plugin that silently does not apply after a lockfile change | Declare it explicitly in `apps/mobile/package.json`, pinned to 0.13.0, and add a CI check that `react-native-worklets` is a direct dependency. |
| `@swmansion/react-native-bottom-sheet` is eight months old, has no Expo config plugin and no FlashList integration | a sheet we cannot put a 300-stop list inside | Our own `Sheet` on Reanimated 4 is the fallback and is the primary plan; the library is a pilot, not a dependency. |
| Reanimated 4.7.x open iOS/Android Fabric crashes (#10906, #10911, #10913, #10922) | a crash while driving | Pin exactly; read the changelog before every bump (V4 §3.4 re-check); the `compat.tsx` probe in `apps/mobile/app/` already exercises Reanimated and Worklets at startup — extend it to cover a sheet open/close. |
| The token set and `docs/design/SYSTEM.md` disagree (font, touch target, body size, night background) | the design review gate fails a screen for the wrong reason | Fix the tokens to the document (the document is the contract), not the other way round. One PR, one file each. |
| Our own `Sheet.tsx` uses `as any` on the transform | a `CONSTRAINTS.md` floor violation in application code | Re-implement with `useAnimatedStyle` and a typed style — the rewrite in §6.2 removes it. |
| Paper, reusables and gorhom are all "read, not install" | we re-implement accessibility patterns ourselves and might get them wrong | The B4/B5 benchmarks gate this; if re-implementing fails, adopt `react-native-a11y` + `react-native-a11y-order` (1.73 M and 108 k downloads/30 d) behind an interface. |
| Star trend is unknown for every candidate | weak prioritisation | Snapshot `stargazers_count` monthly in CI from 2026-11 and backfill the column. |

## 8. Monthly radar filter (V4 §11.3)

The first Monday of every month, the Design System & Motion squad runs this filter and appends to this file:

1. **New in the niche.** `gh search repos "react native animation|gesture|bottom sheet|design system|unistyles" created:>2026-10-01 --sort stars`, plus `topic:react-native` and `topic:reanimated` topic pages. A new repo enters the pool only if it has **≥ 20 releases or ≥ 300 stars in its first year** — the bar `software-mansion-labs/react-native-bottom-sheet` (447 ★, 12 releases/6 m in eight months) and `appandflow/react-native-ease` (989 ★) cleared, and the 13-star `kinetikui` did not.
2. **Incumbent health.** For each of C28, C30, C29, C19, C31, C32, C33, C63, C44: last commit date, releases in the last 6 months, commits in the last 90 days, open PRs, open issues. **A red line is: no commit in 90 days on the default branch while issues are being opened.** That is exactly what gorhom's bottom-sheet did on 2026-05-09, and it is why it was demoted.
3. **The bar check, re-run against the source.** For each incumbent we re-read the three files that decide our bar: the spring configuration, the reduce-motion path, and the accessibility forwarding. New versions are compared line by line against the version we pinned.
4. **Expo SDK 58 bundling.** Re-read `expo/expo` `packages/expo/bundledNativeModules.json`. If a candidate we use is bundled, we pin the bundled version; if a candidate we do not use is bundled, we stop paying the dev-build cost.
5. **Advisories.** OSV `/v1/query` for every pinned package. Any new advisory is a same-week task.
6. **Benchmark delta.** When the design squad's benchmarks exist, re-run `sheet-spring` and `stops-300` and compare against the recorded numbers; a regression is a release blocker (V4 §10.3).
7. **Decision discipline.** Every new candidate gets KEEP / ADOPT / WATCH / REJECT with a reason, and the reason is written here. Nothing enters the app without a benchmark row.

## 9. Corrections to sprint #1 (2026-10-20)

| Claim (2026-10-20) | Verified 2026-10-21 | Correction |
|---|---|---|
| `gorhom/react-native-bottom-sheet` "shows `c90 = 0` on the default branch because its recent work is on release branches — treated as active-but-branchy" | **0 commits on `master` since 2026-05-09** (165 days). The branch list (`master`, `v2`, `v3`, `v4`, `v6`, `website`, two `fix/*`) contains **no active release branch**. 26 PRs open, 127 issues created in 2026 | **Not branchy — dormant.** Demoted from ADOPT to **WATCH, do not adopt new**. |
| `gorhom/react-native-bottom-sheet` — "Maintainer responsiveness is high (fixes land within days of an issue)" | Nothing merged since 2026-05-09. PR **#2727 "Feat/reanimated 4 support"** (16 commits, 21 files) open since 2026-07-29; PR **#2652 "bottom sheet not appearing with android reduce motion"** open since 2026-04-14; PR **#2709 "forward importantForAccessibility"** open since 2026-06-30 | Three of our bar rows are blocked by unmerged PRs. |
| "`react-native-gesture-handler` — commit `Bump to expo sdk 58` (#4612) and `Bump to React Native 0.88`" | Confirmed: **PR #4612 "Bump to `expo` sdk 58"** opened and merged **2026-10-19**; release **v3.4.0 2026-10-16** with the compatibility table update in PR #4606 | Holds. SDK 58 compatibility is proven, not assumed. |
| "`react-native-reanimated` — Version pin `react-native@4.7.1`" | Confirmed, and **Expo SDK 58 bundles exactly 4.7.1** (`expo/expo` `packages/expo/bundledNativeModules.json`) | Holds, and now has an authoritative source. |
| "`@gorhom/bottom-sheet@5.2.14` — spring physics, FlashList-aware, UI-thread window height — ADOPT" | The package is real and the API is right, but the three PRs above are open, and the peer range allows Reanimated 4 while the maintainer has not merged the Reanimated-4 fix | **Change of decision: no new dependency.** |
| "`@shopify/flash-list@2.3.3` — confirms the existing choice" | Correct as a package, but **`@shopify/flash-list` is not in `apps/mobile/package.json` and not in `pnpm-lock.yaml`** — there is no "existing choice" in the app. Expo SDK 58 bundles **2.3.2**; npm latest is **2.3.3** | **Install it.** Recorded as gap D12. |
| "`react-native-mmkv` carries GHSA-4jh3-6jhv-2mgp" | OSV returns **0 advisories** on the 4.x line; the advisory affected `< 2.11.0` | Stale risk note; the pin is fine. |
| "`react-native-reanimated-dnd` — 2.0.0, Reanimated 4, UNVERIFIED" | Confirmed: peers `react-native-reanimated>=4.2.0`, `react-native-worklets>=0.7.0`; but **0 commits in 90 days** and no release since 2026-03-16 | Reanimated-4-shaped, but dormant. |
| "Unistyles" was listed under the software-mansion organisation | `software-mansion/react-native-unistyles` **404s**. The project lives at **`jpudysz/react-native-unistyles`** (2 970 ★, v3.5.3, 2026-10-13), and `software-mansion/react-native-worklets` is a **re-direct stub** (38 ★) whose README says the code is in the Reanimated monorepo | Correct the repository URLs. Also: the unistyles repo has **no root `LICENSE` file** (only `packages/unistyles/package.json` says MIT). |
| "`react-native-mantine` — 8 ★, 6 releases/6 m, 55 commits/90 d" | Confirmed exactly (`auronsan/react-native-mantine`, v1.0.2 2026-09-10, 55 commits/90 d) | Holds. Still a challenger, still a one-person project. |
| Not in the list | **`software-mansion-labs/react-native-bottom-sheet`** (created 2026-02-16, 447 ★, 12 releases/6 m, 2.1 M npm downloads/30 d) and **`appandflow/react-native-ease`** (created 2026-03-11, 989 ★) and **`Rednegniw/number-flow-react-native`** (created 2026-02-09, 424 ★) | **Add as the 2026 entrants.** C32 becomes the sheet pilot; C44 and C45 join the watchlist. |
| Not in the list | Reanimated 4.7.1 ships `ENABLE_SHARED_ELEMENT_TRANSITIONS: false` and `SharedTransition` defaults to **500 ms** | Two concrete constraints on V4 §5. Recorded as gaps D8 and in §3.1. |
| Not in the list | Our own `apps/mobile/src/components/Sheet.tsx` uses RN `Animated.timing`, has `as any` on the transform, has no gesture and no reduce-motion branch; `packages/design-tokens` says Inter/JetBrains Mono (not Figtree), `touchTarget.minimum` 44 px, `fontSizes.base` 16 px, night background `#09090b` | Recorded as gaps D2–D6 and D11. |
| Not in the list | `docs/DECISIONS.md` D21 locks **Expo SDK 57** while the app runs **58.0.14** | **ADR-005 proposed** in §6. The locked decision is not changed here. |

## 10. What we could not verify

- **6-month star trend for every candidate** — the star timeline is 403 with our token; the proxies used are releases/6 m, commits/90 d, humans/90 d (capped at the first 100 commits) and npm downloads/30 d.
- **`hum90` is capped at the first 100 commits** in the 90-day window. On `tamagui` (2 713 commits/90 d) and `skia` (193) the "1 human" figure describes the first hundred commits, not the whole project. Read it as a lower bound on distinct authors, never as a bus-factor claim. **`react-native-gesture-handler` (C30) is the exception: its `hum90` was re-measured over the whole window with pagination — 217 commits by 28 distinct human authors.**
- **Android API 34 support** — not read from any `build.gradle` in this sprint → UNVERIFIED for every candidate, including those marked SDK 58.
- **Expo SDK 58 compatibility for the candidates that are not bundled** — verified only for gesture-handler (merged PR #4612, 2026-10-19) and, from the bundling table, for Reanimated 4.7.1, Worklets 0.13.0, Gesture Handler ~3.3.0, Screens ~4.30.0, Safe Area ~5.10.1, SVG 15.16.0, FlashList 2.3.2 and expo-haptics ~58.0.7. Everything else → UNVERIFIED.
- **New Architecture compatibility** — asserted from the projects' own topics and from Fabric-specific source (`common/cpp/react/renderer/...`, `BottomSheetHostView.kt`) for C32 only. Not build-verified for the rest.
- **Install / bundle size** — GitHub `diskUsage` is git history, not install size. No APK has been built (T3), so the ≤ 80 MB budget is **UNVERIFIED for every candidate**.
- **Every benchmark row in §4** — no eval set, no emulator, no measurement.
- **Test coverage and CI status** for every candidate — not read. The routing-area file read CI workflow counts; we did not, here.
- **Median issue first-response time** — not computed (it needs a full issue-timeline crawl).
- **Production user lists** — the "used by" endpoint is not exposed to our token; npm downloads are the proxy.
- **Licences UNVERIFIED**: `gluestack/gluestack-ui` (the repository root contains no `LICENSE` file at all and the API reports no SPDX id), `jpudysz/react-native-unistyles` (no root `LICENSE` file; only `packages/unistyles/package.json` says MIT), `ptomasroos/react-native-scrollable-tab-view` (no `LICENSE` file), `SchroederNathan/react-native-motion` (no `LICENSE` file), `software-mansion/react-native-worklets` (no root `LICENSE` file).
- **The npm package name for `azimgd/shadowlist`** — the repository root is a `shadowlist-monorepo` with `shadowlist-core`, `shadowlist-fabric`, `shadowlist-android`, `shadowlist-uikit` and `shadowlist-wasm` packages; we did not find a matching published package name → UNVERIFIED.
- **`react-native-true-sheet` npm name** — the GitHub repository is `lodev09/react-native-true-sheet`; the published package name and its download count were **UNVERIFIED** at the time of the registry lookup and were then resolved by reading the repository's `package.json`: the package is **`@lodev09/react-native-true-sheet@3.11.18`** (2026-10-02, **721 766 dl30**), with peer deps `react-native>=0.82.0`, `react-native-reanimated>=4`, `react-native-worklets@*` and `expo-router>=57.0.0`. The repository's `main` package.json is already at `4.0.0-beta.25`, so the 4.x beta is **ahead of the published package** — the benchmark must run against 3.11.18 unless we deliberately pin the beta.
- **Whether `@swmansion/react-native-bottom-sheet` has a usable Expo config plugin** — no `app.plugin.js` exists in the repository root, so we read it as "dev build only"; if a plugin ships later this changes.
- **`packages/design-tokens` is not yet on Style Dictionary** — the file header claims the pipeline; the source is plain TypeScript. The gap is recorded in §5 (D16), not verified as a defect upstream.
- **Spoke facts** are limited to `docs/study/spoke/TEARDOWN.md` as read on 2026-10-21. Spoke's actual accessibility implementation is UNVERIFIED (only the store declaration is missing); Spoke's own motion and sheet behaviour is UNVERIFIED because the app was not run.
- **Corrected by the verifier pass of 2026-10-21 (VERIFICATION-A/B/D.md): 2 cards corrected.**
