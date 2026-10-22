# Design System & Motion Squad - research

**Area:** React Native UI kits, design systems, motion/animation, gestures, accessibility

| Research | Date | Where |
| --- | --- | --- |
| The UI kits, motion and gestures of 2026 (sprint #1) | 2026-10-20 | `docs/research/2026/react-native-design-systems-motion.md` (below) |
| **The Design Studio research** — 83 repositories, the reference products, the anti-"AI look" rules | **2026-10-22** | **`docs/design/RESEARCH.md`** (evidence: `docs/design/evidence/`) |
| **The library bench** — 56 libraries against the bar of `docs/design/SYSTEM.md` | **2026-10-22** | **`docs/design/BENCH.md`** (evidence: `docs/design/evidence/npm-packages-2026-10-22.tsv`) |

The two new documents are the current ones for this squad; the note below is the sprint that
found the candidates they start from.

**Area:** React Native UI kits, design systems, motion/animation, gestures, accessibility **Research date:** 2026-10-20 · **Source file:** `docs/research/2026/react-native-design-systems-motion.md`

## Queries that found the candidates

`"react-native design system"` · `topic:react-native topic:design-system stars:>20` · `"react-native ui kit stars:>800 pushed:>2026-04-01"` · `topic:react-native topic:animation` · `topic:react-native topic:gesture` · `"react native
accessibility component library"` · `"react-native component library stars:>2000"` · `topic:design-system language:typescript` · `"react native motion animation library"` · `topic:react-native topic:ui-kit` · `topic:react-native
topic:accessibility` · `"react-native animation library"` · `"react-native gesture"` · `topic:react-native topic:reanimated` · `"react-native svg icons"` · `"react-native virtualized list flashlist"` · `"react-native bottom sheet"` ·
`topic:react-native topic:new-architecture` · `"react-native-google-fonts"` · `"bottom-tabs"` · `"react-native-tab-view"` · `"expo-google-fonts"` · `"flash-list"` · `"react-native one hand accessibility"`. API calls: `repos/{o}/{r}` (44) ·
`/security-advisories` (13) · `/commits?per_page=20` (6) · `/readme` (6) · `/contents/...` (2) · npm registry (24) · npm downloads (32) · GraphQL batch queries (12). Candidates examined: **44**.

## Candidates that matter

| Project | Repo | Licence | One-line reason |
|---|---|---|---|
| Reanimated 4 | `software-mansion/react-native-reanimated` | MIT | Our locked motion engine: worklets on the UI thread, shared-element transitions, 60/120 fps. |
| Gesture Handler | `software-mansion/react-native-gesture-handler` | MIT | Native gestures on the UI thread - the technical basis for "no jank". |
| Bottom Sheet | `gorhom/react-native-bottom-sheet` | MIT | Spring physics, FlashList integration and web support; our sheets use spring physics. |
| FlashList | `Shopify/flash-list` | MIT | Already required by V4 §5 for 300+ stop lists; 10.1 M downloads/30 d. |
| react-native-paper | `callstack/react-native-paper` | MIT | Not a kit for us (Material 3 look) but the source of our accessibility and reduce-motion patterns. |
| react-native-a11y / -a11y-order | `ArturKalach/react-native-a11y` | MIT | Native-first screen-reader focus order, trapping and announcements. |
| react-native-mantine | `auronsan/react-native-mantine` | MIT | The only actively released *new* RN design system in the window - a challenger. |
| Tamagui | `tamagui/tamagui` | MIT | The only mature RN design system with a compile-time optimiser; but it owns the token model. |
| react-native-skia | `wcandillon/react-native-skia` | MIT | The only path to custom vector effects (night map overlays, route ribbons); a large native dependency. |
| shadowlist | `azimgd/shadowlist` | MIT | 60 fps lists, 309 commits/90 d - but **no release since 2024-05-21**. |
| one-hand | `filipmok-agh/react-native-one-hand` | MIT | One-hand scaling of native modals/action sheets; brand new, likely re-implement in-house. |
| figtree | `@expo-google-fonts/figtree` | MIT + OFL-1.1 | The locked typeface; install this one package only (257,396 dl/30 d), never vendor the 8.4 GB repo. |
| Material Symbols | `@react-native-vector-icons/material-design-icons` | MIT | The single icon source; no emoji anywhere. |
| mmkv | `margelo/react-native-mmkv` | MIT | Storage, not UI; carries GHSA-4jh3-6jhv-2mgp for `< v2.11.0` (fixed in v4.3.2). |

## Deep review - top 5

1. **callstack/react-native-paper** (14,472 ★, MIT) - Material Design 3 alignment, a theme object behind a provider, MD3 variants; the last 20 commits are Conventional Commits with PR numbers and include a genuine architectural change (the
   2026-09-28 `Portal` rework hides content below a modal from assistive technology) plus a reduce-motion forwarding fix (2026-09-16). **That is the behaviour we must reproduce in our own sheets.** API ergonomics are high, but every visual
   decision (elevation, ripple, MD3 colour roles) would have to be overridden to match our design system. 330 open issues; coverage % not published. **Verdict: mine its accessibility fixes; do not adopt the kit.**
2. **software-mansion/react-native-reanimated** (11,031 ★, MIT) - our locked choice; the repo now hosts two packages, `react-native-reanimated` and `react-native-worklets` (multi-threaded JS). The last 20 commits (2026-10-12 to 2026-10-19)
   are mostly correctness fixes: keeping box-shadow blur radii below 1 on Android, restoring entering animations after Activity reactivation on iOS, using the closed-form bezier-easing 3.2 solver, starting a back transition only from a
   visible screen, and requiring a changed shared-transition tag. **Those are exactly the failure modes a driving app hits** (background / foreground during a delivery, screen reuse) - a good sign for our offline/day-use profile. 0
   advisories. **Verdict KEEP, pin 4.7.1.**
3. **software-mansion/react-native-gesture-handler** (6,793 ★, MIT) - "Declarative API exposing platform native touch and gesture system"; gestures are recognised and tracked **on the UI thread**, not through the JS responder system.
   Compatibility proof (2026-10-19): commits "Bump to expo sdk 58" and "Bump to React Native 0.88" on 2026-10-16, with release v3.4.0 the same day. The last 20 commits show deep platform work (cancelling gestures on native ACTION_CANCEL,
   stopping nested scroll when the root starts intercepting). Risk: 236 MB repo, and a breaking-ish rename inside a minor on 2026-10-14, so **pin the exact version and read the changelog before every upgrade**. **Verdict ADOPT / KEEP,
   pinned to 3.4.0.**
4. **gorhom/react-native-bottom-sheet** (9,109 ★, MIT) - features list = web support, dynamic sizing and **FlashList integration** (a first-class `BottomSheetFlashList` component); we need both (300+ stops in a sheet and a web build of the
   same code). Recent commits read the window height from a shared value on the UI thread (removing a JS-thread round trip - exactly the jank source we budget against), restore the React mount reset after unmount, and **inline the FlashList
   props** to decouple us from the FlashList type version. Risk: releases land on a `release/*` branch pattern and the default branch shows 0 commits in 90 days, which slows archaeology. **Verdict ADOPT / KEEP, pinned to 5.2.14.**
5. **tamagui/tamagui** (14,265 ★, MIT) - three packages: a universal style library, an **optimising compiler** that turns styled components into platform-specific optimisations at build time, and a UI kit. Its token pipeline is a
   **competing source of truth** for our locked rule that tokens live only in `packages/design-tokens`; a compiler in the Metro pipeline is a new CI failure mode; and the last 20 commits are dominated by one author (bus factor 1). **Verdict
   WATCH - adopt the idea of compile-time token flattening, not the library, while Unistyles 3 is locked.**

## Decisions

- **ADOPT (new)** `@expo-google-fonts/figtree@0.4.1` only (MIT + OFL-1.1), pinned exactly; do not vendor the 8.4 GB repo. **ADOPT** `Shopify/flash-list@2.3.3` (MIT, 10.1 M dl/30 d, released 2026-10-01) - it confirms the existing choice.
- **KEEP (locked, re-verified 2026-10-20)** `react-native-reanimated@4.7.1` (37.9 M dl/30 d, 13 human maintainers, 0 advisories) · `react-native-gesture-handler@3.4.0` (verified on Expo SDK 58 / RN 0.88) · `@gorhom/bottom-sheet@5.2.14` ·
  `@react-native-vector-icons/material-design-icons@14.0.0` (the single Material Symbols source) · `react-native-screens@4.30.0` and `react-native-safe-area-context@5.10.1` (Expo defaults, both MIT, both released in the last 6 months).
- **WATCH** `callstack/react-native-paper` (our accessibility patterns) · `ArturKalach/react-native-a11y`
  + `-a11y-order` (needs a maintainer-count and SDK-58 check) · `auronsan/react-native-mantine` (the challenger) · `tamagui/tamagui` (compile-time token flattening) · `wcandillon/react-native-skia` (only if a screen needs custom vector
    work; APK budget risk) · `azimgd/shadowlist` (309 commits/90 d but **no release since 2024** - do not install unreleased code) · `filipmok-agh/react-native-one-hand` (read it, likely re-implement) · `margelo/react-native-mmkv` (pin >=
    4.3.2 and confirm with `pnpm audit`).
- **REJECT (with reason)** `nativewind/nativewind` - **hard rule**: Unistyles 3 is the only styling engine, not to be used in the mobile app or the web dashboard · `heroui-inc/heroui-native` (NativeWind-based, would drag in a second styling
  engine) · `GeekyAnts/NativeBase` (no release since 2023-03-06) · `react-native-elements/react-native-elements` (0 commits in 90 d) · `GeekyAnts/react-native-aria` (archived) · `satya164/react-native-tab-view` (archived) · the unmaintained
  2024-25 kit cohort (react-native-material-ui, react-virgin, expo-ui-kit, pearl-ui, react-native-swipeable-list, nativecn) · `jsartisan/react-native-magnus` (Laravel-flavoured API).
- **ADR trigger** replacing Unistyles 3 with Tamagui would change a locked decision - ADR + `docs/decisions/DECISIONS.md`. Nothing in this research justifies that.

## UNVERIFIED

1. 6-month star trend for every candidate (the token lacks the `stargazer` scope).
2. Android **API 34** support - not read from any `build.gradle` in this sprint, so UNVERIFIED for all candidates including those marked SDK 58.
3. Expo SDK 58 support for the 44 candidates - verified only for `react-native-gesture-handler` (commit) and `wataru-maeda/react-native-boilerplate` (topic). Everything else UNVERIFIED.
4. Bundle/install size per candidate - only npm download counts were read; the installed size on device was not measured. Test coverage % per candidate is not published by these projects. UNVERIFIED.
5. Production user lists - no "used by" endpoint is reachable with this token; npm downloads were used as the closest measurable proxy. Median issue response time was not computed (it needs a full issue-timeline crawl). UNVERIFIED.
6. All benchmarks B1-B7: UNVERIFIED (no local emulator permitted).
