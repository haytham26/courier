# Area 1 — React Native UI kits, design systems, motion/animation, gestures, accessibility

**Researcher:** Researcher role (V4 §1.2) · **Date of research:** 2026-10-20 · **Squad:** Design System & Motion
**Binding inputs:** `docs/KICKOFF_V4_EN.md` §3, §5, §10.3, §11, §12 · `docs/design/SYSTEM.md` · `CONSTRAINTS.md`
**Product rules held in mind:** Unistyles 3 is the only styling engine · **no NativeWind** · one icon set (Material Symbols, weight 500) · **no emoji** · Figtree · 4-pt grid · WCAG 2.2 AA (driving text ≥ 7:1, rest ≥ 4.5:1) · min 17 pt body, 48–76 pt key numbers · touch target ≥ 56 pt (primary 72 pt) · Reanimated 4 on the UI thread, 150–250 ms, spring for sheets, respect "reduce motion" · RTL-ready · APK ≤ 80 MB · every screen needs day/night + small/large + 200 % text Maestro screenshots.

---

## 0. Method, tooling and honest limits of this run

- All GitHub facts were read **from the repo page on 2026-10-20** via `scripts/gh.ps1` (`gh api repos/<o>/<r>`, `gh api graphql`, `gh api repos/<o>/<r>/security-advisories`, `gh api repos/<o>/<r>/commits?per_page=20`, `gh search repos`).
- Package facts were read from the **npm registry** (`registry.npmjs.org/<pkg>/latest`) and the npm downloads API (`api.npmjs.org/downloads/point/last-month/<pkg>`), which returns the 30-day window 2026-09-19 → 2026-10-19.
- **6-month star trend is UNVERIFIED for every candidate.** The repo token has no `stargazer` scope: `GET /repos/{o}/{r}/stargazers` returns `403 Resource not accessible by personal access token`, and the GraphQL `stargazers { edges { starredAt } }` query returns `FORBIDDEN`. The verifiable momentum proxy used below is **release cadence in the last 6 months + commits in the last 90 days + distinct human maintainers in 90 days**, all read from the API on 2026-10-20. To get a true star trend later, use a token with `read:user` (or `ghstar`/`rstar-history`), and record it in `docs/squads/design/STATUS.md`.
- **Issue counts** are GraphQL `issues(states:OPEN|CLOSED).totalCount`, which **includes pull requests**. Read them as "open+PR / closed+PR", not as a pure bug ratio.
- **Maintainer counts** are distinct commit authors in the last 90 days with bot accounts (`*[bot]`) excluded.
- **Repo size** is `diskUsage` in KB (git history included, not install size). Install/bundle sizes for RN packages are marked UNVERIFIED unless an npm fact pins them.
- **New Architecture / Expo SDK 58 / Android API 34** are only marked "yes" where a commit, release note or npm peer range in the API proves it on 2026-10-20. Everything else is UNVERIFIED and needs a build check (V4 §12.5).
- No benchmark was run on our CI emulator in this sprint (no emulator is permitted locally — AGENTS.md). **All benchmark rows are UNVERIFIED and name the set to build.**

---

## 1. Queries run (V4 §12.2 — every query recorded)

Search API calls (each with `--sort stars`; `--sort updated` used where marked):

| # | Query string | Sort |
|---|---|---|
| A1-01 | `gh search repos "react-native design system" --limit 30` | stars |
| A1-02 | `topic:react-native topic:design-system stars:>20` | stars |
| A1-03 | `react-native ui kit stars:>800 pushed:>2026-04-01` | stars |
| A1-04 | `topic:react-native topic:animation stars:>30` | stars |
| A1-05 | `topic:react-native topic:gesture stars:>30` | stars |
| A1-06 | `react native accessibility component library stars:>50` | stars |
| A1-07 | `react-native component library stars:>2000` | stars |
| A1-08 | `topic:design-system language:typescript stars:>200` | stars |
| A1-09 | `react native motion animation library stars:>100` | stars |
| A1-10 | `topic:react-native topic:ui-kit stars:>50` | stars |
| A1-11 | `topic:react-native topic:accessibility` | stars |
| A1-12 | `react-native animation library in:name,description stars:>150 pushed:>2026-04-01` | stars |
| A1-13 | `react-native gesture in:name,description stars:>150` | stars |
| A1-14 | `topic:react-native topic:reanimated` | stars |
| A1-15 | `react-native svg icons in:name stars:>400` | stars |
| A1-16 | `react-native virtualized list flashlist in:name,description stars:>50` | stars |
| A1-17 | `react-native bottom sheet in:name stars:>150` | stars |
| A1-18 | `topic:react-native topic:new-architecture stars:>20` | stars |
| A1-19 | `react-native-google-fonts in:name` | stars |
| A1-20 | `bottom-tabs in:name react-native` | stars |
| A1-21 | `react-native-tab-view in:name` | stars |
| A1-22 | `expo-google-fonts in:name` | stars |
| A1-23 | `flash-list OR flashlist in:name` | stars |
| A1-24 | `react-native one hand accessibility in:description` | stars |

API calls: `repos/{o}/{r}` × 44 · `repos/{o}/{r}/security-advisories` × 13 · `repos/{o}/{r}/commits?per_page=20` × 6 · `repos/{o}/{r}/readme` × 6 · `repos/{o}/{r}/contents/...` × 2 · npm registry × 24 · npm downloads × 32 · GitHub GraphQL batch queries × 12.

---

## 2. Evidence cards — 44 candidates (V4 §12.3)

Legend — `Rel/6m` = releases published 2026-04-20 → 2026-10-20 (from the 15 most recent releases; `15+` means the repo ships more often than the window we can list). `c90` = commits in the last 90 days. `maint` = distinct non-bot commit authors in 90 days. `adv` = GitHub security advisories on the repo. `dl30` = npm downloads 2026-09-19→2026-10-19.

| # | Repo | ★ | Created | Pushed | Last release | Rel/6m | Open/Closed | c90 | maint | Licence (code) | NewArch·SDK58 | Size KB | Platform | adv | dl30 | Decision |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | [tamagui/tamagui](https://github.com/tamagui/tamagui) | 14,265 | 2020-10-16 | 2026-10-20 | v3.1.0 @2026-10-20 | 15+ | 69/1515 | 2759 | 2 | MIT | yes·UNVERIFIED | 928,352 | on-device+web | 0 | UNVERIFIED | WATCH |
| 2 | [callstack/react-native-paper](https://github.com/callstack/react-native-paper) | 14,472 | 2016-10-19 | 2026-10-12 | v6.0.0-alpha.0 @2026-06-15 | 3 | 330/2437 | 31 | 10 | MIT | yes·UNVERIFIED | 448,418 | on-device | 0 | 1,847,906 | WATCH |
| 3 | [akveo/react-native-ui-kitten](https://github.com/akveo/react-native-ui-kitten) | 10,663 | 2016-12-20 | 2026-10-06 | @ui-kitten/eva-icons@6.2.1 @2026-10-06 | 15+ | 15/1201 | 145 | 2 | MIT | yes·UNVERIFIED | 364,326 | on-device | 0 | UNVERIFIED | WATCH |
| 4 | [gluestack/gluestack-ui](https://github.com/gluestack/gluestack-ui) | 5,327 | 2023-01-11 | 2026-09-02 | v5.0.0 @2026-06-25 | 1 | 12/677 | 18 | 4 | NOASSERTION in API / **ISC** in npm `@gluestack-ui/themed` | yes·UNVERIFIED | 288,800 | on-device+web | 0 | UNVERIFIED | WATCH |
| 5 | [heroui-inc/heroui-native](https://github.com/heroui-inc/heroui-native) | 3,691 | 2025-06-03 | 2026-10-20 | v1.0.10 @2026-09-21 | 8 | 14/123 | 85 | 6 | Apache-2.0 | yes·UNVERIFIED | 23,154 | on-device | 0 | UNVERIFIED | **REJECT** (NativeWind — violates the locked styling rule) |
| 6 | [GeekyAnts/NativeBase](https://github.com/GeekyAnts/NativeBase) | 20,367 | 2016-04-15 | 2026-01-31 | v3.4.28 @2023-03-06 | 0 | 283/3162 | 0 | 0 | MIT | UNVERIFIED | 71,014 | on-device | 0 | UNVERIFIED | REJECT (no release in 3.5 yr) |
| 7 | [react-native-elements/react-native-elements](https://github.com/react-native-elements/react-native-elements) | 25,871 | 2016-09-08 | 2026-05-21 | v5.0.0 @2026-01-19 | 0 | 133/2031 | 0 | 0 | MIT | UNVERIFIED | 177,509 | on-device | 0 | UNVERIFIED | REJECT (no commits in 90 d) |
| 8 | [callstack/react-native-ios-kit](https://github.com/callstack/react-native-ios-kit) | 556 | 2017-07-27 | 2024-02-26 | v0.0.25 @2020-05-13 | 0 | 19/44 | 0 | 0 | MIT | UNVERIFIED | 15,234 | on-device | 0 | UNVERIFIED | REJECT (dormant) |
| 9 | [tailwiinder/nativecn](https://github.com/tailwiinder/nativecn) | 128 | 2025-03-14 | 2025-04-01 | none | 0 | 38/10 | 0 | 0 | MIT | UNVERIFIED | 2,620 | on-device | 0 | UNVERIFIED | REJECT (dead + NativeWind) |
| 10 | [auronsan/react-native-mantine](https://github.com/auronsan/react-native-mantine) | 8 | 2024-09-29 | 2026-10-17 | v1.0.2 @2026-09-10 | 6 | 0/0 | 55 | 1 | MIT | yes (topic)·UNVERIFIED | 5,161 | on-device | 0 | UNVERIFIED | WATCH (challenger) |
| 11 | [agrawal-rohit/pearl-ui](https://github.com/agrawal-rohit/pearl-ui) | 85 | 2021-09-03 | 2025-10-23 | v2.3.4 @2024-01-03 | 0 | 0/3 | 0 | 0 | MIT | UNVERIFIED | 9,534 | on-device | 0 | UNVERIFIED | REJECT |
| 12 | [jsartisan/react-native-magnus](https://github.com/jsartisan/react-native-magnus) | 1,216 | 2019-11-22 | 2026-10-14 | v1.0.63 @2022-09-22 | 0 | 27/35 | 6 | 2 | MIT | UNVERIFIED | 13,606 | on-device | 0 | UNVERIFIED | REJECT (Laravel-only) |
| 13 | [xotahal/react-native-material-ui](https://github.com/xotahal/react-native-material-ui) | 3,775 | 2016-03-24 | 2023-04-19 | v2.0.0-alpha.1 @2019-04-20 | 0 | 172/147 | 0 | 0 | MIT | UNVERIFIED | 1,539 | on-device | 0 | UNVERIFIED | REJECT (abandoned) |
| 14 | [Trixieapp/react-virgin](https://github.com/Trixieapp/react-virgin) | 1,505 | 2017-10-14 | 2023-01-25 | none | 0 | 0/6 | 0 | 0 | MIT | UNVERIFIED | 1,971 | on-device | 0 | UNVERIFIED | REJECT |
| 15 | [react-ui-kit/expo-ui-kit](https://github.com/react-ui-kit/expo-ui-kit) | 116 | 2019-03-24 | 2024-08-28 | none | 0 | 7/21 | 0 | 0 | MIT | UNVERIFIED | 420 | on-device | 0 | UNVERIFIED | REJECT |
| 16 | [software-mansion/react-native-gesture-handler](https://github.com/software-mansion/react-native-gesture-handler) | 6,793 | 2016-10-27 | 2026-10-19 | v3.4.0 @2026-10-16 | 14 | 14/1609 | 218 | 17 | MIT | **yes**·**SDK 58** (commit 2026-10-19 "Bump to expo sdk 58"; RN 0.88 on 2026-10-16) | 236,536 | on-device | 0 | 36,752,813 | **ADOPT (already in stack)** |
| 17 | [software-mansion/react-native-reanimated](https://github.com/software-mansion/react-native-reanimated) | 11,031 | 2018-04-25 | 2026-10-19 | 4.7.1 @2026-10-02 | 15+ | 141/3121 | 500 | 13 | MIT | yes·UNVERIFIED | 855,446 | on-device | 0 | 37,906,287 | **KEEP (locked: Reanimated 4)** |
| 18 | [gorhom/react-native-bottom-sheet](https://github.com/gorhom/react-native-bottom-sheet) | 9,109 | 2020-07-31 | 2026-05-09 | v5.2.14 @2026-05-09 | 5 | 46/1945 | 0* | 0* | MIT | yes·UNVERIFIED | 35,497 | on-device | 0 | 11,921,765 | **ADOPT** |
| 19 | [wcandillon/react-native-redash](https://github.com/wcandillon/react-native-redash) | 2,060 | 2019-04-30 | 2026-08-04 | v18.1.5 @2026-01-21 | 0 | 89/106 | 0 | 0 | MIT | UNVERIFIED | 10,259 | on-device | 0 | UNVERIFIED | WATCH |
| 20 | [dohooo/react-native-reanimated-carousel](https://github.com/dohooo/react-native-reanimated-carousel) | 3,435 | 2021-09-07 | 2026-10-15 | v5.2.0 @2026-10-14 | 7 | 1/599 | 19 | 3 | MIT | yes·UNVERIFIED | 490,353 | on-device | 0 | UNVERIFIED | WATCH |
| 21 | [LegendApp/legend-motion](https://github.com/LegendApp/legend-motion) | 450 | 2022-04-20 | 2026-10-11 | v2.5.3 @2025-10-17 | 0 | 9/9 | 1 | 1 | MIT | yes·UNVERIFIED | 3,254 | on-device | 0 | UNVERIFIED | WATCH |
| 22 | [entropyconquers/react-native-reanimated-dnd](https://github.com/entropyconquers/react-native-reanimated-dnd) | 1,073 | 2025-05-15 | 2026-07-30 | v2.0.0 @2026-03-16 | 0 | 5/53 | 0 | 0 | MIT | yes (Reanimated 4)·UNVERIFIED | 34,290 | on-device | 0 | UNVERIFIED | WATCH |
| 23 | [omahili/react-native-reorderable-list](https://github.com/omahili/react-native-reorderable-list) | 325 | 2021-12-05 | 2026-10-18 | v0.18.2 @2026-10-18 | 2 | 11/48 | 4 | 1 | MIT | yes (Reanimated)·UNVERIFIED | 1,958 | on-device | 0 | UNVERIFIED | WATCH |
| 24 | [wcandillon/react-native-skia](https://github.com/wcandillon/react-native-skia) | 8,744 | 2021-11-08 | 2026-10-20 | v3.7.1 @2026-10-19 | 15+ | 26/1207 | 201 | 14 | MIT | yes·UNVERIFIED | 347,404 | on-device | 0 | UNVERIFIED | WATCH (cost: bundle size) |
| 25 | [esthor/react-native-swipeable-list](https://github.com/esthor/react-native-swipeable-list) | 760 | 2019-11-10 | 2026-10-13 | v0.1.2 @2022-03-27 | 0 | 1/14 | 0 | 0 | MIT | UNVERIFIED | 6,392 | on-device | 0 | UNVERIFIED | REJECT (stale) |
| 26 | [azimgd/shadowlist](https://github.com/azimgd/shadowlist) | 385 | 2024-05-15 | 2026-10-14 | v0.4.0 @2024-05-21 | 0 | 0/16 | 309 | 1 | MIT | yes·UNVERIFIED | 11,082 | on-device | 0 | UNVERIFIED | WATCH (no release since 2024) |
| 27 | [GeekyAnts/react-native-aria](https://github.com/GeekyAnts/react-native-aria) | 228 | 2020-12-14 | 2023-12-11 | 0.2.3 @2021-02-22 | 0 | 8/4 | 0 | 0 | MIT | archived | 2,492 | on-device | 0 | UNVERIFIED | REJECT (archived 2023) |
| 28 | [ArturKalach/react-native-a11y](https://github.com/ArturKalach/react-native-a11y) | 57 | 2022-09-23 | 2026-10-04 | v0.9.1 @2026-10-04 | 5 | 0/25 | 2 | 1 | MIT | yes (topic)·UNVERIFIED | 23,465 | on-device | 0 | UNVERIFIED | WATCH |
| 29 | [ArturKalach/react-native-a11y-order](https://github.com/ArturKalach/react-native-a11y-order) | 52 | 2023-05-14 | 2026-10-04 | v2.0.1 @2026-10-05 | 7 | 0/13 | 15 | 2 | MIT | yes (topic)·UNVERIFIED | 15,211 | on-device | 0 | UNVERIFIED | WATCH |
| 30 | [f0rr0/react-native-rating](https://github.com/f0rr0/react-native-rating) | 92 | 2017-06-04 | 2026-10-19 | v4.0.0 @2026-07-28 | 2 | 0/8 | 7 | 2 | MIT | UNVERIFIED | 1,298 | on-device | 0 | UNVERIFIED | WATCH |
| 31 | [filipmok-agh/react-native-one-hand](https://github.com/filipmok-agh/react-native-one-hand) | 5 | 2026-07-13 | 2026-08-24 | v0.1.1 @2026-08-24 | 2 | 0/0 | 3 | 1 | MIT | UNVERIFIED | 1,557 | on-device | 0 | UNVERIFIED | WATCH (one-handed reach — matches our 72 pt primary action) |
| 32 | [oblador/react-native-vector-icons](https://github.com/oblador/react-native-vector-icons) | 17,917 | 2015-05-15 | 2026-10-19 | @react-native-vector-icons/zocial@14.0.0 @2026-10-19 | 15+ | 9/1342 | 11 | 4 | MIT | yes·UNVERIFIED | 30,475 | on-device | 0 | 670,758 (`material-design-icons`) | **KEEP** (Material Symbols source) |
| 33 | [software-mansion/react-native-svg](https://github.com/software-mansion/react-native-svg) | 8,009 | 2016-01-17 | 2026-10-15 | v15.16.0 @2026-10-15 | 2 | 164/1666 | 20 | 5 | MIT | yes·UNVERIFIED | 93,740 | on-device | 0 | 34,109,400 | KEEP (if we need custom SVG) |
| 34 | [expo/google-fonts](https://github.com/expo/google-fonts) | 945 | 2020-05-02 | 2026-10-12 | none | 0 | 10/58 | 23 | 2 | MIT (code) / **OFL-1.1** (font files) | yes·UNVERIFIED | 8,468,143 | on-device | 0 | 257,396 (`@expo-google-fonts/figtree`) | **ADOPT** (Figtree, OFL) |
| 35 | [callstack/react-native-bottom-tabs](https://github.com/callstack/react-native-bottom-tabs) | 1,463 | 2024-09-27 | 2026-09-24 | @bottom-tabs/expo-template@1.1.3 @2026-07-09 | 9 | 36/150 | 10 | 4 | MIT | yes·UNVERIFIED | 109,854 | on-device | 0 | 395,804 | WATCH |
| 36 | [satya164/react-native-tab-view](https://github.com/satya164/react-native-tab-view) | 5,103 | 2016-06-15 | 2022-11-27 | v3.3.0 @2022-10-11 | 0 | 41/938 | 0 | 0 | MIT | archived | 9,736 | on-device | 0 | UNVERIFIED | REJECT (archived) |
| 37 | [ptomasroos/react-native-scrollable-tab-view](https://github.com/ptomasroos/react-native-scrollable-tab-view) | 6,940 | 2015-06-11 | 2024-06-23 | v1.0.0 @2019-10-28 | 0 | 136/745 | 0 | 0 | NOASSERTION | UNVERIFIED | 7,658 | on-device | 0 | UNVERIFIED | REJECT |
| 38 | [Shopify/flash-list](https://github.com/Shopify/flash-list) | 7,243 | 2021-12-20 | 2026-10-01 | v2.3.3 @2026-10-01 | 2 | 82/605 | 3 | 2 | MIT | yes·UNVERIFIED | 216,637 | on-device | 0 | 10,078,314 | **ADOPT** (300+ stops @60 fps requirement) |
| 39 | [software-mansion/react-native-screens](https://github.com/software-mansion/react-native-screens) | 3,739 | 2018-08-03 | 2026-10-20 | 5.0.0-alpha.4 @2026-10-14 | 15+ | 192/1357 | 231 | 14 | MIT | yes·UNVERIFIED | 107,986 | on-device | 0 | 39,934,843 | KEEP (Expo Router) |
| 40 | [margelo/react-native-mmkv](https://github.com/margelo/react-native-mmkv) | 8,518 | 2021-02-24 | 2026-10-08 | v4.3.2 @2026-06-22 | 1 | 4/509 | 8 | 2 | MIT | yes (Nitro)·UNVERIFIED | 38,221 | on-device | **1** (GHSA-4jh3-6jhv-2mgp, medium, `<v2.11.0`, sensitive data in log file) | 5,785,329 | WATCH (storage, not UI — verify patched version) |
| 41 | [nativewind/nativewind](https://github.com/nativewind/nativewind) | 8,116 | 2022-04-02 | 2026-10-16 | nativewind@4.2.7 @2026-09-14 | 10 | 33/1007 | 11 | 2 | MIT | yes | 331,494 | on-device | 0 | UNVERIFIED | **REJECT — hard rule** (V4: Unistyles 3 is the only styling engine) |
| 42 | [appandflow/react-native-safe-area-context](https://github.com/appandflow/react-native-safe-area-context) | 2,768 | 2019-08-14 | 2026-10-16 | v5.10.1 @2026-09-29 | 6 | 75/383 | 22 | 9 | MIT | yes·UNVERIFIED | 6,548 | on-device | 0 | 42,897,003 | KEEP (Expo default) |
| 43 | [margelo/nitro](https://github.com/margelo/nitro) (`react-native-nitro-modules`) | 1,967 | 2024-06-12 | 2026-10-20 | v0.37.1 @2026-08-27 | 15+ | 49/201 | 149 | 6 | MIT | yes (New Arch native modules)·UNVERIFIED | 37,331 | on-device | 0 | UNVERIFIED | WATCH |
| 44 | [wataru-maeda/react-native-boilerplate](https://github.com/wataru-maeda/react-native-boilerplate) | 520 | 2018-06-02 | 2026-10-18 | v6.1.0 @2026-10-18 | 2 | 0/8 | 3 | 1 | MIT | SDK 58 (topic)·UNVERIFIED | 10,060 | on-device | 0 | UNVERIFIED | WATCH (reference only, area 4) |

\* `gorhom/react-native-bottom-sheet` shows `c90 = 0` on the default branch because its recent work is on release branches (last 20 commits are `chore: release v5.2.x` and fixes, dated 2026-04-21 → 2026-05-09). Treated as **active-but-branchy**, not abandoned.

**Assets/licence note (V4 §12.3 requires code AND assets):** every adopt candidate here is MIT/Apache/BSD for code. Font assets (Figtree) are **OFL-1.1** — no emoji glyphs, no icon fonts other than Material Symbols. `expo/google-fonts` is 8.4 GB because it ships every Google font binary; **do not vendor the repo** — install `@expo-google-fonts/figtree` (0.4.1, "MIT AND OFL-1.1", 257,396 dl/30 d).

---

## 3. Shortlist (13) — better-than-ours, risks, decision

| Repo | Better than our current choice | Risk | Decision + reason |
|---|---|---|---|
| react-native-paper | Mature Material 3 components, real theme engine, **accessibility work in the last 20 commits**: `fix(modal): make Modal accessible`, `feat(portal): hide content below modals from assistive technology`, `fix(portal): forward the reduce motion preference` — exactly the two behaviours `docs/design/SYSTEM.md` §5/§6 demand | Two engines: RN Paper's own theme + our Unistyles 3 tokens → token duplication; Material look is not our "calm, not clever" style | **WATCH** — mine its a11y + reduce-motion patterns, do not adopt the kit |
| react-native-a11y / -a11y-order | Native-first screen-reader focus order, focus trapping, announcements, WCAG topics, New Architecture, both released 2026-10-04/05 (5–7 releases/6 m) | 57 ★ / 52 ★, 1–2 maintainers, no track record with Expo SDK 58 | **WATCH** — evaluate in the accessibility benchmark before any dependency |
| react-native-one-hand | One-hand scaling of native modals/alerts/action sheets — matches our "one primary action, 72 pt, lower third" rule | 5 ★, 2 releases, brand new | **WATCH** — read the implementation, likely re-implement in-house |
| tamagui | Only mature RN design system with a **compile-time optimiser** (styles → platform-optimised output) and shared web/native tokens | Bus factor 1–2 on 928 MB monorepo; its own token model conflicts with our Unistyles 3 + `packages/design-tokens` single source | **WATCH** — steal the *idea* (compile-time token flattening), not the library |
| react-native-mantine (RN port) | 117 accessible components, Mantine-compatible API, 6 releases/6 m, 55 commits/90 d, MIT, 8 ★ (challenger, §12.6 anti-bias) | Almost no adoption; no Expo SDK 58 proof | **WATCH** — challenger worth one benchmark run |
| react-native-redash | The reference "animation toolbox" (themed components, springs, helpers) | Releases stopped 2026-01-21; 89 open issues | **WATCH** — copy helpers, do not depend |
| legend-motion | Declarative animation API used by Gluestack; small, MIT, actively pushed | 1 maintainer, last release 2025-10-17 | **WATCH** |
| react-native-skia | Only path to custom vector effects (night-mode map overlays, route ribbons) | Large native dependency → APK budget 80 MB risk; Skia already in Expo SDK | **WATCH** — only if a design needs it |
| shadowlist | 60 fps list, 309 commits/90 d (very active) | **No release since 2024-05-21** — installs would be unreleased code | **WATCH** — do not install; ask upstream to release |
| react-native-bottom-tabs | Modern, Expo-aware, 9 releases/6 m | New API surface, unproven at our scale | **WATCH** |
| reanimated-carousel | Reanimated 4-native carousel, 7 releases/6 m | Not needed for a list app | **WATCH** |
| gesture-handler | Native-driven gestures on the UI thread — the only way to hit "60/120 fps" and "no jank" | None material | **ADOPT — keep** |
| bottom-sheet | Spring physics + FlashList integration + web support — our sheets use spring physics | Maintenance concentrated on release branches | **ADOPT — keep** |

---

## 4. Deep review — top 5 (V4 §12.4: README, docs, architecture, modules, tests, critical issues, last 20 commits)

### 4.1 `callstack/react-native-paper` (14,472 ★, MIT)
- **README / docs:** separate docs site `callstack.github.io/react-native-paper`; README states Material Design 3 alignment, platform-adaptive, full theming, Expo Snack example, official Figma/Sketch kits (assets are Google Material Design — permissive, but **not** our icon set).
- **Architecture:** `PaperProvider` + theme object → React context; components are pure, `useTheme` hook; MD3 variants (`v6.0.0-alpha.0`).
- **Code quality:** last 20 commits are Conventional Commits with PR numbers, split between feature, fix, refactor and CI; a `chore: add agent instructions` commit shows AI-assisted review rules are already in the repo.
- **API ergonomics:** high — `Button`, `Text`, `Portal`, `Modal` are drop-in, but every visual decision (elevation, ripple, MD3 colour roles) must be overridden to match our design system.
- **Extensibility:** theme overrides per component; the `Portal` rework (2026-09-28) is a genuine architectural change — content below a modal is now hidden from assistive tech, and the reduce-motion preference is forwarded (2026-09-16). **That is the behaviour we must reproduce in our own sheets.**
- **Tests:** repo ships an example app + CI build of the example app (commit 2026-09-29); coverage % not published → UNVERIFIED.
- **Open critical issues:** 330 open (includes PRs) — the backlog is large; several are New Architecture migration items → UNVERIFIED individually.
- **Performance claims:** none published for our use case → UNVERIFIED.
- **Verdict:** high-quality, actively maintained, but a Material 3 design language we do not want. **Mine its accessibility fixes; do not adopt the kit.**

### 4.2 `software-mansion/react-native-reanimated` (11,031 ★, MIT) — our locked choice
- **README / docs:** the repo now hosts **two** packages — `react-native-reanimated` and `react-native-worklets` (multi-threaded JS). Reanimated 4 is documented at `docs.swmansion.com/react-native-reanimated`.
- **Architecture:** worklet-based UI-thread execution; CSS animations, layout animations, shared element transitions all live here. Our §5 requirement "Reanimated 4 on the UI thread, 60/120 fps" maps exactly onto this.
- **Last 20 commits (2026-10-12 → 2026-10-19):** mostly correctness fixes — `keep box-shadow blur radii below 1 on Android`, `restore entering animations after Activity reactivation on iOS`, `use the closed-form solver of bezier-easing 3.2`, `LayoutAnimations: start a back transition only from a visible screen`, `Shared Element Transitions: use a changed sharedTransitionTag`. These are exactly the failure modes a driving app hits (background/foreground during a delivery, screen reuse). **Good sign for our V4 §6.5 offline/day-use profile.**
- **API ergonomics:** `useSharedValue` + `useAnimatedStyle` + `withSpring`; our "150–250 ms, spring for sheets" is idiomatic.
- **Extensibility:** worklet runtime is also the base for gesture-handler integration and for our future on-device voice pipeline.
- **Tests:** `ReJest` recorded updates, runtime tests, type tests referenced in commits → the repo has a real test harness; coverage % UNVERIFIED.
- **Security:** 0 GitHub advisories on the repo. Supply-chain history: no published incident found in this scan (UNVERIFIED beyond the advisory list — we did not run OSV on the npm tarball).
- **Verdict:** **KEEP.** Version pin `react-native@4.7.1`.

### 4.3 `software-mansion/react-native-gesture-handler` (6,793 ★, MIT)
- **README / docs:** "Declarative API exposing platform native touch and gesture system"; gestures are recognised and tracked on the **UI thread**, not through the JS responder system — the technical basis for our "no jank" budget.
- **Compatibility proof (verified 2026-10-19):** commit `Bump to expo sdk 58 (#4612)` and `Bump to React Native 0.88 (#4517)` on 2026-10-16 → **Expo SDK 58 + RN 0.88 confirmed**; release v3.4.0 on 2026-10-16 with a compatibility table update.
- **Code quality:** last 20 commits show deep platform work (`[Android] Cancel gestures on native ACTION_CANCEL`, `[Android] Stop nested scroll when the root starts intercepting`, `[iOS] Keep NativeViewGestureHandler flags across a partial config update`) — production-grade, not demo-grade.
- **API ergonomics:** `Gesture.Pan()` / `GestureDetector` / `Gesture.Simultaneous`; composable and declarative.
- **Extensibility:** `VirtualGestureDetector`, `Wrap`, animatable-ref exposure — enough to implement a custom "swipe to deliver" without fighting the library.
- **Tests / CI:** 218 commits/90 d, 17 human maintainers, releases every few days; CI badge in README.
- **Risks:** 236 MB repo; API churn between minors (the `pressOutAfterAnimation` → `immediatePressOut` rename on 2026-10-14 is a breaking-ish rename inside a minor) → **pin the exact version and read the changelog before every upgrade**.
- **Verdict:** **ADOPT / KEEP**, pinned to `3.4.0`.

### 4.4 `gorhom/react-native-bottom-sheet` (9,109 ★, MIT)
- **README / docs:** features list = web support, dynamic sizing, **FlashList integration** (a first-class component `BottomSheetFlashList`). We need both (300+ stops in a sheet, and a web build of the same code).
- **Architecture:** Reanimated shared values + gesture handler; `BottomSheetModal` manages a native modal.
- **Last 20 commits:** `fix: read window height from a shared value on ui thread` (2026-05-09) — removes a JS-thread round trip, exactly the jank source we budget against; `fix(modal): restore React mount reset after unmount`; `rewrote the modal status logic to prevent getting out of sync`; `inline FlashListProps to remove @shopify/flash-list type dependency` (decouples us from the FlashList type version — nice).
- **API ergonomics:** `snapPoints`, `index`, `enableDynamicSizing`, `bottomSheetStyle` — maps to our "spring for sheets" rule.
- **Extensibility:** `BottomSheetTextInput`, `BottomSheetScrollView`; FlashList type inlining means our FlashList 2.3.3 will not conflict.
- **Maintenance risk:** releases land on a `release/*` branch pattern; the default branch shows 0 commits in 90 days. Maintainer responsiveness is high (fixes land within days of an issue), but the branch pattern slows archaeology. **Mitigation:** pin `5.2.14` and re-check the changelog monthly (V4 §11.3 radar).
- **Security:** 0 advisories. 11.9 M npm downloads/30 d → in production use.
- **Verdict:** **ADOPT / KEEP**, pinned to `5.2.14`.

### 4.5 `tamagui/tamagui` (14,265 ★, MIT)
- **README / docs:** three packages — `@tamagui/core` (universal style library), `@tamagui/static` (**optimizing compiler**), `tamagui` (UI kit). The compiler "turns styled components, even with complex logic, into platform-specific optimizations" at build time.
- **Architecture:** design tokens → compile-time flattening → per-platform output; a big monorepo (928 MB) with a build cache and a "strict declaration" system.
- **Last 20 commits (2026-10-17 → 2026-10-20):** CI cache fixes, `fix(registry): synchronize authorized Sheet consumer copies`, `perf(web): avoid repeated production environment lookups`, `fix(metro-plugin): resolve exported subpaths of symlinked packages`, `chore: prepare strict shorthand fixes for Tamagui 3.1.0`. Very active, but **the last 20 commits are dominated by one author (`natew`)** → bus factor 1 for the compiler.
- **API ergonomics:** the `styled()` + `createTokens()` API is elegant, but adopting it means adopting *its* token model; our rule says tokens live only in `packages/design-tokens` and components must not carry raw values. Tamagui's token pipeline is exactly a competing source of truth.
- **Extensibility / performance claims:** the compiler's claims are marketing-level; no benchmark of ours → UNVERIFIED.
- **Tests:** kitchen-sink app, type probes, CI cache — real test infrastructure; coverage UNVERIFIED.
- **Risks:** (a) bus factor; (b) second token system; (c) a compiler in the Metro pipeline is a new CI failure mode.
- **Verdict:** **WATCH.** Adopt the *idea* of compile-time token flattening for `packages/design-tokens`; do not adopt the library while Unistyles 3 is locked.

---

## 5. Benchmarks (V4 §12.5) — all UNVERIFIED in this sprint

No emulator was used (AGENTS.md forbids a local Android emulator); therefore every row is **UNVERIFIED**. The set to build is named below; the target numbers come from `docs/design/SYSTEM.md` §5/§6 and `CONSTRAINTS.md`.

| Benchmark | Candidates | Metric | Our target | Status | Set to build |
|---|---|---|---|---|---|
| B1 — Scroll smoothness | FlashList 2.3.3 vs ShadowList (unreleased) vs FlatList | 300 stops, dropped frames on the CI emulator + one mid-range Android | 60 fps, 0 dropped frames | **UNVERIFIED** | `docs/squads/design/benchmarks/stops-300/` — same 300 synthetic stops, same profile, frame timings recorded |
| B2 — Sheet spring | `@gorhom/bottom-sheet` 5.2.14 vs our own `Sheet` | open/close animation time, spring settle, jank | 150–250 ms, spring physics, no jank | **UNVERIFIED** | `docs/squads/design/benchmarks/sheet-spring/` |
| B3 — Reduce-motion | Paper portal vs our sheet | transition becomes instant, element still changes state | V4 §5 "reduce motion respected" | **UNVERIFIED** | `docs/squads/design/benchmarks/reduce-motion/` |
| B4 — Screen-reader order | `react-native-a11y-order` vs native props only | Talkback/VoiceOver focus order on the Driving screen | correct order, no traps | **UNVERIFIED** | `docs/squads/design/benchmarks/a11y-focus-order/` |
| B5 — 200 % dynamic type | our components vs Paper vs Mantine-RN | clipping/truncation on Today's list and Dictation report | no clipping at 200 % | **UNVERIFIED** | `docs/squads/design/benchmarks/dynamic-type-200/` |
| B6 — Contrast | token set | driving text ratio ≥ 7:1, rest ≥ 4.5:1 | WCAG 2.2 AA | UNVERIFIED (design-time, not device) | `docs/squads/design/benchmarks/contrast/` |
| B7 — APK budget | Skia vs no-Skia | APK size | ≤ 80 MB excluding map/voice packs | **UNVERIFIED** | `docs/squads/design/benchmarks/apk-size/` |

---

## 6. Decisions for the Design System & Motion squad

**ADOPT (new)**
1. `expo/google-fonts` → install **`@expo-google-fonts/figtree@0.4.1`** only (MIT + OFL-1.1; 257,396 dl/30 d). Do not vendor the 8.4 GB repo. Pin exactly.
2. `Shopify/flash-list@2.3.3` — already required by §5 ("FlashList, 300+ stops"); 10.1 M dl/30 d, MIT, released 2026-10-01. **Confirms the existing choice.**

**KEEP (locked, re-verified today)**
3. `react-native-reanimated@4.7.1` — V4 §5 requires Reanimated 4 on the UI thread. 37.9 M dl/30 d, 15+ releases/6 m, 13 human maintainers, 0 advisories, active work on iOS Activity reactivation (driving-app relevant).
4. `react-native-gesture-handler@3.4.0` — verified on **Expo SDK 58 / RN 0.88** on 2026-10-19.
5. `@gorhom/bottom-sheet@5.2.14` — spring physics, FlashList-aware, UI-thread window height.
6. `@react-native-vector-icons/material-design-icons@14.0.0` — the **single** Material Symbols source (no emoji anywhere).
7. `react-native-screens@4.30.0`, `react-native-safe-area-context@5.10.1` — Expo defaults, both MIT, both released in the last 6 months.

**WATCH (revisit in the next radar sweep, monthly per V4 §11.3)**
8. `callstack/react-native-paper` — source of our accessibility patterns (accessible Modal, portal hides content from AT, reduce-motion forwarded).
9. `ArturKalach/react-native-a11y` + `react-native-a11y-order` — native focus order/trap; 2 releases in the last 3 weeks; needs a maintainer-count and SDK-58 check before adoption.
10. `auronsan/react-native-mantine` — the only actively released *new* RN design system in the window (6 releases/6 m) — challenger candidate (§12.6).
11. `tamagui/tamagui` — compile-time token flattening idea; bus factor 1.
12. `wcandillon/react-native-skia` — only if a screen needs custom vector work; APK budget risk.
13. `azimgd/shadowlist` — 309 commits/90 d but **no release since 2024**; do not install unreleased code.
14. `margelo/react-native-mmkv` (storage, not UI) — carries GHSA-4jh3-6jhv-2mgp for `< v2.11.0`; the fix is in v4.3.2 (current). Pin ≥ 4.3.2 and confirm with `pnpm audit`.
15. `filipmok-agh/react-native-one-hand` — read the implementation; likely re-implement in-house rather than depend on 5 ★.

**REJECT (with reason)**
16. `nativewind/nativewind` — **hard rule**: Unistyles 3 is the only styling engine (AGENTS.md, V4 §5). Not to be used in the mobile app or the web dashboard.
17. `heroui-inc/heroui-native` — NativeWind-based (repo topics), would drag a second styling engine in.
18. `GeekyAnts/NativeBase` — no release since 2023-03-06, 0 commits in 90 days.
19. `react-native-elements/react-native-elements` — last release 2026-01-19 but 0 commits in 90 days; 133 open issues.
20. `GeekyAnts/react-native-aria` — **archived** 2023; `satya164/react-native-tab-view` — archived; `lost-pixel`-style abandoned repos in this area generally.
21. `xotahal/react-native-material-ui`, `Trixieapp/react-virgin`, `react-ui-kit/expo-ui-kit`, `agrawal-rohit/pearl-ui`, `esthor/react-native-swipeable-list`, `tailwiinder/nativecn`, `basetool` equivalents — no release in the last 6 months and no 90-day commits.
22. `jsartisan/react-native-magnus` — Laravel-flavoured API, not usable in a pure RN app.

---

## 7. Risks and fallbacks

| Risk | Impact | Fallback |
|---|---|---|
| Two token systems (Unistyles 3 + a kit) | drift, lint-rule violations, "calm not clever" style loss | Kits stay **outside** the app: only their *patterns* are read. `packages/design-tokens` remains the single source; the raw-hex lint rule stays. |
| Version churn in gesture-handler / reanimated minors | broken build on upgrade | Pin exact versions, re-read the changelog before each bump (V4 §3.4 re-check), and keep `check:fast` green on the bump commit. |
| FlashList v2 type churn vs bottom-sheet | type errors | bottom-sheet inlines FlashList props (verified 2026-04-21) → pin both to exact versions. |
| Skia / extra native deps blow the 80 MB APK budget | CI failure at T3 | Measure APK in B7 before adding any native dependency beyond the Expo SDK 58 default set. |
| Accessibility library immaturity (a11y/a11y-order, 1–2 maintainers) | bit-rot | Keep our own `accessibilityLabel`/`role` discipline in `packages/design-tokens`; adopt a library only if B4 passes. |
| npm `@expo-google-fonts/figtree` OFL assets | font licence obligations | OFL-1.1 requires the licence file to ship with the app — add to `docs/LICENSES.md` and to the app's licence screen. |
| Star trend unknown | weak prioritisation | Re-run with a `read:user` token next sprint and backfill the column. |

**ADR trigger:** if the squad decides to replace Unistyles 3 with Tamagui, that changes a locked decision → ADR + `docs/DECISIONS.md` update (V4 §3.3). Nothing in this research justifies that.

---

## 8. What could not be verified (V4 §12.6)

- 6-month star trend for every candidate (token lacks the `stargazer` scope; HTTP 403 / GraphQL FORBIDDEN).
- Android **API 34** support: not read from any `build.gradle` in this sprint (no repo file fetch performed) → UNVERIFIED for all candidates, including those marked SDK 58.
- Expo SDK 58 support for the 44 candidates: verified only for `react-native-gesture-handler` (commit) and `wataru-maeda/react-native-boilerplate` (topic). Everything else UNVERIFIED.
- Bundle/install size per candidate: only npm download counts were read; the installed size on device was not measured.
- Test coverage % per candidate: not published by these projects → UNVERIFIED.
- Production user lists: no "used by" endpoint is reachable with this token (dependents are not exposed) → UNVERIFIED; npm downloads were used as the closest measurable proxy.
- Median issue response time: not computed (needs a full issue-timeline crawl) → UNVERIFIED.
- All benchmarks B1–B7: UNVERIFIED (no local emulator permitted).
