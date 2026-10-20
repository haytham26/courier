# Accessibility — a voice-first mobile app used while driving — 2026 OSS + standards research (V4 §3, full depth)

**Research date: 2026-10-21.** Method: V4 §12 (≥30 candidates with full evidence cards, ≥10 shortlisted, top 5
deep-reviewed, benchmarks only where an eval set exists) + §12.6 anti-bias (newer/smaller challengers).
Every number was read from the live GitHub API, the npm registry, the W3C's own site, the React Native
documentation or a vendor's own page on **2026-10-21** unless the card says **UNVERIFIED**. Nothing is estimated,
nothing is carried over unread.

**Card fields:** repo/standard URL · stars + maintenance proxy · created · last release + date · release cadence ·
commits/90 d + human maintainers/90 d · open issues · licence · **Expo SDK 58 / RN 0.88 New Architecture** ·
size · on-device vs CI · what it does better than our current choice · risks · **DECISION**.

**Card fields for standard/vendor cards:** issuing body · document + version · publication date · status · what it
mandates · adoption cost · **DECISION**.

---

## 0. Scope, our current choice, the bar

| Item | Verified 2026-10-21 |
|---|---|
| The standard | **WCAG 2.2** — `w3.org/TR/WCAG22/`, **W3C Recommendation 12 December 2024** (`REC-WCAG22-20241212`). It adds **9** success criteria over 2.1 and removes **4.1.1 Parsing** (obsolete). The nine new criteria: 2.4.11 Focus Not Obscured (Minimum) **AA**, 2.4.12 (Enhanced) AAA, 2.4.13 Focus Appearance AAA, 2.5.7 Dragging Movements **AA**, 2.5.8 Target Size (Minimum) **AA**, 3.2.6 Consistent Help **A**, 3.3.7 Redundant Entry **A**, 3.3.8 Accessible Authentication (Minimum) **AA**, 3.3.9 (Enhanced) AAA. |
| The design contract | `docs/design/SYSTEM.md` §6: "**WCAG 2.2 AA** · Contrast: **driving text ≥ 7:1**, everything else ≥ 4.5:1 · Every interactive element has an accessibility label and a role · **Dynamic type to 200 % without clipping or truncation** · Status colours are colour-blind safe and never the only signal · RTL-ready layouts". §2: type **Figtree**, body **≥ 17 pt**, key numbers 48–76 pt. §3: one primary action of **72 pt**. §5: "Reduce motion is respected". |
| Our accessibility code today | **8 `accessibility*` props in the whole mobile app.** `Button.tsx:123-124` (`accessibilityRole="button"`, `accessibilityState={{disabled}}`), `Input.tsx:111-112` (`accessibilityLabel`, `accessibilityHint`), `Card.tsx:97` (`accessibilityRole`), `VoiceButton.tsx:181-183` (`accessibilityLabel`, `accessibilityRole`, `accessibilityState={{selected}}`). **No `AccessibilityInfo` anywhere** — so there is no `isScreenReaderEnabled`, no `announceForAccessibility`, no `isReduceMotionEnabled`, no `setAccessibilityFocus`. **No `allowFontScaling` and no `maxFontSizeMultiplier`** anywhere. **No `accessibilityActions` / `onAccessibilityAction`** — so a screen-reader user cannot invoke "activate" on a custom control. |
| Our token reality vs the contract | `packages/design-tokens/src/tokens.ts` uses **Inter**, not Figtree (`tokens.ts:166`). `fontSizes.base` is **16 px**, not ≥ 17 pt (`tokens.ts:172`). The largest size is `5xl: 48px` — the **76 pt key number does not exist** (`tokens.ts:179`). `touchTarget.minimum` is **44 px**, not ≥ 56 pt (`tokens.ts:274`); `touchTarget.spacious: '56px'` exists but is not the minimum (`tokens.ts:276`). `components.button.height` is 36/44/52 px — **no 72 px primary action token** (`tokens.ts:283-286`). `components.input.height` is a **fixed** 44 px (`tokens.ts:297`) → clips at 200 % text. There is **no reduced-motion token and no reduced-motion branch** anywhere. `spacing` has keys 0,1,2,3,4,5,6,8,10,12,16,20,24 — i.e. **20, 40, 64, 80, 96 px are off the 4-pt grid** the contract names (`4 8 12 16 24 32 48`), and `components.badge.paddingY` references **`{spacing.0.5}`, a key that does not exist** (`tokens.ts:313`). |
| Our contrast reality (computed by hand from the token values, sRGB relative luminance, WCAG 2.x formula) | **day theme** on `#ffffff`: `textPrimary` #18181b = **17.7:1** ✔ · `textSecondary` #52525b = **7.7:1** ✔ · `textTertiary` #a1a1aa = **2.56:1** ✘ (1.4.3 needs 4.5:1, 1.4.11 needs 3:1) · `brandPrimary` #ff6b00 = **2.86:1** ✘ (1.4.11) and it is the `border.focus` colour · `text.link` / `statusActive` #0070e6 = **4.71:1** ✔ (barely) · `statusDelivered` #059669 = **3.77:1** (1.4.11 ✔, 1.4.3 ✘) · `statusFailed` #ef4444 = **3.76:1** (same) · `statusSkipped` #f59e0b = **2.15:1** ✘ (1.4.11) · `statusPending` #71717a = **4.83:1** ✔. **night theme** on #09090b: `textPrimary` **19.1:1** ✔ · `textSecondary` **7.8:1** ✔ · `textTertiary` #71717a = **4.12:1** ✘ (1.4.3) · `statusSkipped` #fbbf24 **11.9:1** ✔ · `statusDelivered` #10b981 **7.8:1** ✔. **high-contrast** on #000000: `textTertiary` #999999 **7.4:1** ✔, `statusFailed` #ff0000 **5.3:1** ✔. |
| Where those failures actually reach the screen | `apps/mobile/src/components/Input.tsx:46` (`placeholderTextColor: theme.colors.textTertiary`), `:98`, `:116`, `:123` (icon colours); `apps/mobile/src/components/Avatar.tsx:51` (initials text fallback); `apps/mobile/app/(tabs)/index.tsx:125` (**the delivered count is painted in `statusDelivered`** → 3.77:1 as *text* → 1.4.3 fail) and `:312` (`stopStatusDot` 10 × 10 px); `apps/mobile/app/(tabs)/stops.tsx:79` (`deliveredTime` in `textTertiary`) and `:120` (`emptyText` in `textTertiary`); `stops.tsx:67` paints the stop number in `textInverse` (**white**) on the status colour — on `statusSkipped` (#f59e0b) that is **2.15:1** and on `statusDelivered`/`statusFailed` **3.77:1** → 1.4.3 fail on three of five statuses. |
| Colour-blind exposure | `status.delivered` = #059669 (green) and `status.failed` = #ef4444 (red) are the only differentiators on the stop row — the green/red pair that ~8 % of men cannot separate. `stops.tsx:76-78` does pair the colour with a **text badge** (`statusLabels`), so 1.4.1 is *partially* met on that screen; the **10 px `stopStatusDot`** beside the address is colour-only. |
| Our CI position | `CONSTRAINTS.md`: "**Design review** — Maestro screenshots (day/night, small/large, **200 % text**) match the approved mockups — `docs/evidence/design/` — every UI task". `.maestro/` has **five** flows (`compat`, `map`, `smoke`, `stops`, `today-list`) and **none of them** sets a font scale, checks a contrast ratio, checks a focus order, or runs with a screen reader. `packages/eslint-config/package.json` has **no** accessibility plugin. |
| The bar (from `CONSTRAINTS.md`, `docs/SAAS_CHECKLIST.md` §C, `docs/design/SYSTEM.md`) | **WCAG 2.2 AA** · an **accessibility statement** in the store listings and on the web · **touch targets ≥ 56 pt, primary action 72 pt** · **body ≥ 17 pt** · **dynamic type to 200 % without clipping** · **driving text ≥ 7:1, everything else ≥ 4.5:1** · **status never colour-only** · **reduced motion respected** · **RTL-ready** · an **a11y check in CI** (`docs/COVERAGE_AUDIT-P2.md` M7 names "axe / react-native-a11y" and rates it P4) · a **real-device screen-reader pass** before v1. |

### The four things must not be conflated

1. **The standard** (WCAG 2.2 AA) — what we promise. It is a web-content standard; applying it to a React Native
   app means interpreting each criterion against the platform's accessibility tree (WCAG2ICT does this for
   documents; for apps Deque's mobile team does it commercially).
2. **The platform API** (React Native's `accessibility*` props, `aria-*`, `role`, `AccessibilityInfo`) — the
   mechanism. It maps to a **different** tree on iOS and Android, and a criterion that passes on one can fail on
   the other.
3. **The tooling** (lint, unit matchers, device automation) — the *detector*. It finds maybe 30 % of real issues;
   the rest are judgement.
4. **The human** (a screen-reader user running a delivery, a driver with gloves, a 70-year-old courier) — the
   only one that decides. A voice-first app has a specific obligation here: **the screen reader must be able to
   read the delivery state, and the screen reader must be able to *act* on it** — otherwise the app is unusable
   to exactly the users we claim to serve.

### 6-month star trend — method note (proxy, as V4 §12.3 permits)

The star *timeline* is 403 with the token in `.env.local` (re-verified 2026-10-21 in
`docs/research/2026/routing-vrp-engines.md`). **Every "stars gained in 6 months" figure is UNVERIFIED.** The
proxy: **releases in the last 6 months · commits in the last 90 days · distinct human maintainers in 90 days** ·
plus registry publish dates.

---

## Queries run

GitHub search + API reads through `scripts\gh.ps1`. All queries run **2026-10-21**. Filters are the literal query
strings.

| # | Query (literal) | Results | What it produced |
|---|---|---|---|
| 1 | `react-native-a11y in:name` | 8 | `FormidableLabs/eslint-plugin-react-native-a11y` **307★** ("the Formidable" — a lint plugin, not a runtime library), `ArturKalach/react-native-a11y` 57★, `ArturKalach/react-native-a11y-order` 52★, `ArturKalach/react-native-a11y-container` 1★, `jgillick/react-native-a11y-slider` 14★ (2023). |
| 2 | `accessibility react-native in:name` | 10 | `aryella-lacerda/react-native-accessibility-engine` 175★ (**last release 2022-11-15**), `MaxToyberman/react-native-accessibility` 30★ (2020), `firatsezel/react-native-check-accessibility` 12★ (2021, GPL-3.0), `SeanMcP/awesome-react-native-accessibility` 4★ (2018, CC0). |
| 3 | `axe-core in:name` | 8 | `dequelabs/axe-core` **7 674★**, `dequelabs/axe-core-npm` 726★, `dequelabs/axe-core-gems` 111★, `dequelabs/axe-core-maven-html` 97★. **No React Native package exists** — the search space is the proof. |
| 4 | `maestro mobile testing in:name,description` | 6 | `devicelab-dev/maestro-runner` 514★, `MobAI-App/mobai-ci` 52★, `tovimx/maestro-mobile-testing-skill` 27★. The project itself is `mobile-dev-inc/Maestro` (16 144★). |
| 5 | `formidable react native in:name,description` | 8 | `FormidableLabs/formidable-react-native-app-boilerplate` 334★ (**archived 2022**), `formidable-webview/webshell` 105★, `formidable-webview/ubiquitous` 12★. **"the Formidable" is the ESLint plugin** (Card A4) — the boilerplate is dead. |
| 6 | `react-native-localize in:name` | 4 | `zoontek/react-native-localize` 2 443★ (3.7.2, 2026-09-15) — the only serious RN localisation library; the RTL dependency. |
| 7 | `expo-module-scripts in:name` | 2 | Both forks, 0★ — not separately published; the Expo modules live in `expo/expo`. |
| 8 | `react native security in:name` | 8 | Cross-read for the security file; no accessibility result. |
| 9 | `certificate-pinning in:name` | 8 | Cross-read; no accessibility result. |
| 10 | `mobile-security in:name` | 8 | Cross-read; no accessibility result. |

Plus API reads: `repos/{o}/{r}` · `/releases` · `/releases?per_page=N` · `/commits?since=<90 d>` ·
`/search/issues?q=repo:…+is:issue|is:pr+created:<range>` · `/readme` · `/contents/{path}` · **npm registry
`/{package}`**.

**Web sources fetched 2026-10-21:** `w3.org/TR/WCAG22/` (the Recommendation, the list of new criteria, and the
normative text of 1.4.3, 1.4.4, 1.4.6, 1.4.10, 1.4.11, 1.4.12, 2.5.7, 3.3.7, 3.3.8, 4.1.2) ·
`w3.org/WAI/WCAG22/Understanding/target-size-minimum.html` (SC 2.5.8, **page updated 11 May 2026**) ·
`reactnative.dev/docs/accessibility` (**page last updated 19 Oct 2026**; the full prop list, the `aria-*` set, the
`role` set, `experimental_accessibilityOrder`, `AccessibilityInfo`, and the TalkBack/VoiceOver setup notes) ·
`docs.maestro.dev/reference/commands-available.md` (the **complete** Maestro command list) ·
`docs.deque.com/devtools-mobile/2025.7.2/en/react-native/` · `docs.deque.com/linter/4.0.0/en/react-native-setup/` ·
`www.deque.com/axe/devtools/mobile-accessibility/` · `www.deque.com/accessible-development/api/` ·
`docs.deque.com/devtools-mobile/2025.7.2/en/announcements/`.

---

## 1. Candidate pool — 41 evidence cards (S1–S8 · C1–C8 · K1–K4 · T1–T9) plus 12 grouped evaluations

### 1.1 Standards and platform (S1–S8)

**S1 — WCAG 2.2** — https://www.w3.org/TR/WCAG22/ · W3C Accessibility Guidelines Working Group · **W3C
Recommendation 12 December 2024** · **status: current Recommendation** · 4 principles, 13 guidelines, **86 success
criteria** (2.2 adds 9 net), levels A / AA / AAA · the criteria that bind a voice-first driving app: **1.1.1** (A)
non-text content, **1.3.1** (A) info and relationships, **1.3.4** (AA) orientation, **1.4.1** (A) use of colour,
**1.4.3** (AA) contrast minimum 4.5:1 / 3:1 large text, **1.4.4** (AA) resize text **200 %**, **1.4.10** (AA) reflow
at 320 CSS px, **1.4.11** (AA) non-text contrast **3:1**, **1.4.12** (AA) text spacing, **2.1.1** (A) keyboard,
**2.2.2** (A) pause/stop/hide, **2.3.3** (AAA) animation from interactions, **2.4.3** (A) focus order, **2.4.7** (A)
focus visible, **2.4.11** (AA) focus not obscured, **2.5.2** (A) pointer cancellation, **2.5.7** (AA) dragging
movements, **2.5.8** (AA) target size minimum **24 × 24 CSS pixels**, **3.2.6** (A) consistent help, **3.3.2** (A)
labels or instructions, **3.3.7** (A) redundant entry, **3.3.8** (AA) accessible authentication, **4.1.2** (A) name,
role, value, **4.1.3** (AA) status messages · **our fit: the bar `docs/design/SYSTEM.md` §6 already names** ·
**DECISION: ADOPT (the bar; quote the clause number and the level, and nothing else).**

**S2 — SC 2.5.8 Target Size (Minimum) Understanding** — https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
· **Level AA** · **page updated 11 May 2026** · normative text read verbatim: "The size of the target for pointer
inputs is at least **24 by 24 CSS pixels**, except when: **Spacing** (a 24 CSS pixel diameter circle centred on
each undersized target's bounding box must not intersect another target or another undersized target's circle);
**Equivalent**; **Inline**; **User agent control**; **Essential**" · the Understanding page adds that "the
requirement is independent of the zoom factor" and that "for a target to be 'at least 24 by 24 CSS pixels', it must
be conceptually possible to draw a solid 24 by 24 CSS pixel square … aligned to the horizontal and vertical axis"
· **our fit: 1 CSS px ≈ 1 dp on Android and 1 pt on iOS, so the floor is 24 dp/pt. Our bar is 56 pt (2.33×) and
72 pt (3×)** — and the **Spacing** exception is what lets a 24 pt target pass, not a 10 pt dot next to another dot ·
**DECISION: ADOPT (the floor; our 56/72 pt bar is a deliberate over-shoot for gloves and a moving van, and that
must be written down so nobody "optimises" it back to 24).**

**S3 — React Native's accessibility API** — https://reactnative.dev/docs/accessibility (page **last updated
19 Oct 2026**) · the authoritative list of what the platform gives us · **the props**: `accessible`,
`accessibilityLabel`, `accessibilityLabelledBy` (Android), `accessibilityHint`, `accessibilityLanguage` (iOS),
`accessibilityIgnoresInvertColors` (iOS), `accessibilityLiveRegion` (Android — `none` / `polite` / `assertive`),
`accessibilityRole` (29 values), `accessibilityShowsLargeContentViewer` + `accessibilityLargeContentTitle` (iOS),
`accessibilityState` (`disabled` / `selected` / `checked` / `busy` / `expanded`), `accessibilityValue`
(`min` / `max` / `now` / `text`), `accessibilityViewIsModal` (iOS), `accessibilityElementsHidden` (iOS),
`importantForAccessibility` (Android — `auto` / `yes` / `no` / `no-hide-descendants`), `onAccessibilityEscape` (iOS),
`onAccessibilityTap` (iOS), `onMagicTap` (iOS) · **the `aria-*` set**: `aria-busy`, `aria-checked`,
`aria-disabled`, `aria-expanded`, `aria-hidden`, `aria-label`, `aria-labelledby` (Android), `aria-live` (Android),
`aria-modal` (iOS), `aria-selected`, `aria-valuemax`, `aria-valuemin`, `aria-valuenow`, `aria-valuetext` ·
**the `role` prop** (28 values, and the docs state it "communicates the purpose of a component and has
**precedence over the `accessibilityRole` prop**") · **`accessibilityActions` + `onAccessibilityAction`** with the
standard action names `magicTap`, `escape`, `activate`, `increment`, `decrement`, `longpress`, `expand`, `collapse`
· **`experimental_accessibilityOrder`** (an array of `nativeID`s; "**Experimental** … Don't use them in production";
it is **exhaustive** — a component it does not reference "will never get focused" — and it is **nestable** through
accessibility containers) · `AccessibilityInfo` for screen-reader detection and announcements ·
**our fit: `role` superseding `accessibilityRole` means our current `accessibilityRole="button"` usages should
move to `role="button"`** · **DECISION: ADOPT (the platform layer; `role` + `aria-*` are the modern surface and
`experimental_accessibilityOrder` is explicitly not for production).**

**S4 — React Native 0.88** — https://github.com/react/react-native — **126 735 ★** /25 353 f · created
**2015-01-09** · last release **v0.88.0, 2026-10-15** · **100 commits/90 d, 48 humans** · 688 open issues ·
**MIT** · our pinned runtime (`apps/mobile/package.json:30` — `react-native: 0.88.0`) · New Architecture: **yes**,
and RN 0.88 is a New-Architecture-first release · **our fit: the version that carries the `aria-*` props,
`role`, `accessibilityActions` and `experimental_accessibilityOrder`** · **DECISION: KEEP (locked; D21).**

**S5 — Expo SDK 58** — https://github.com/expo/expo — **52 874 ★** /14 665 f · pushed **2026-10-20** ·
**100+ commits/90 d, 36 humans** · 928 open issues · **MIT** · our pinned SDK (`expo ~58.0.14`) · **a11y surface:
`expo` ships no accessibility package of its own — the a11y primitives are all in RN core; what Expo adds is the
config plugin surface** (`expo-build-properties` for the platform settings, `expo-localization` for RTL and
locale, `expo-font` for the Figtree contract) · 2026 a11y-relevant PR in the monorepo: **#51632 "[ui] Add
accessibilityLabel, accessibilityHint and testID to the community Slider" (closed, 2026-10-15)** · **DECISION:
KEEP (locked; the a11y work is in our own layer, not in Expo's).**

**S6 — WCAG 2.2 quick reference / the Understanding documents** — https://www.w3.org/WAI/WCAG22/ ·
`github.com/w3c/wcag-act` — **66 ★** /33 f · created **2016-09-01** · pushed **2026-02-03** · **no releases**, **0
commits/90 d** · 57 open issues · licence **NOASSERTION** on the API · the ACT (Accessibility Conformance Testing)
rules repository, which turns WCAG into testable rules · **our fit: this is the *web* ACT rule set. There is no
mobile ACT rule set**, which is precisely why our own a11y test catalogue has to be written by us · **DECISION:
REFERENCE ONLY (read the technique pages; do not cite ACT rule ids against a mobile app).**

**S7 — Deque *Axe DevTools for Mobile* (commercial)** — https://www.deque.com/axe/devtools/mobile-accessibility/ ·
Deque, **proprietary / licensed** (no OSS repo; the free `axe-core` engine is MPL-2.0 and is **web-only**) ·
version line **2025.7.2** in the docs, with an **announcements page carrying releases through 2026-09-08** · it
ships an **iOS Desktop Analyzer**, an **Android Accessibility Analyzer**, **Appium drivers** (UIAutomator2,
XCUITest) and native **Espresso** / **XCUI** SDKs · the **September 2025 release (2025-09-24)** added the Android
**"Nested Focusable Element"** rule and Appium 3 support; the **April 2023 release (2023-04-19)** added React
Native support and the **WCAG 2.2 Target Size rule** · the docs are explicit: "iOS and Android apps must each be
tested separately for accessibility, even when generated from a cross-platform framework" · **our fit: it is the
only product in this file that scans the *rendered* accessibility tree on a real device, and it is the reference
implementation of WCAG2ICT-for-mobile** · **cost: a licence (per user), and Deque's own 2026-09-08 announcement
says the mobile dashboard is being retired into "Axe Developer Hub" with analysers required to be updated by
**2026-12-31** — a procurement with a deadline** · **DECISION: WATCH (the benchmark oracle for our own suite;
if we buy one thing in this area, buy a short licence for a final pre-release pass, not a permanent seat).**

**S8 — Deque *Axe DevTools Linter* (commercial SaaS)** — https://docs.deque.com/linter/4.0.0/en/react-native-setup/ ·
version **4.0.0** in the docs · it lints React Native source with **six rules**: `has-valid-accessibility-actions`,
`has-valid-accessibility-role`, `has-valid-accessibility-state`, `has-valid-accessibility-value`,
`image-has-accessibility-label`, `has-accessibility-role` · it is a **SaaS server** ("The software-as-a-service
version … requires any installation to use … you'll need to follow the guide for obtaining an API key"), and
"to access Axe Linter, you must contact support to have licenses assigned" · **our fit: the *rule set* is a
perfectly good checklist and it is free to copy as a *concept*; the *tool* is paid and sends our source to a
vendor** · **DECISION: REJECT the tool, ADOPT the rule list as our own lint rules (we already have a lint layer in
`packages/eslint-config`).**

### 1.2 Runtime and native accessibility libraries (C1–C8)

**C1 — `ArturKalach/react-native-a11y`** — https://github.com/ArturKalach/react-native-a11y — **57 ★** /6 f ·
created **2022-09-23** · last release **v0.9.1, 2026-10-04** · **2 commits/90 d, 1 human** · **0 open issues** ·
**MIT** · repo 23 465 KB · npm `react-native-a11y` **0.9.1, 2026-10-04** · **New Architecture: yes** (the README's
compatibility line reads "New Architecture ✔ · Old Architecture ✖ · Bridgeless ✔ · Expo prebuild ✔") ·
**what it is (read from the README, 2026-10-21): "Native-first, all-in-one React Native accessibility toolkit —
screen reader focus order & announcements (VoiceOver / TalkBack), physical (external) keyboard support,
keyboard-connection status, and iOS accessibility containers, on iOS and Android. Everything ships under a single
`A11y.*` namespace."** It **re-merges four focused libraries**: `react-native-a11y-order` (focus order &
announcements), `react-native-external-keyboard`, `react-native-is-keyboard-connected`, `react-native-a11y-container`
(`UIAccessibilityContainer` grouping) · components: `A11y.Order`, `A11y.Index`, `A11y.View`, `A11y.Card` (keeps a
card-level action *and* nested buttons accessible simultaneously), `A11y.FocusTrap`, `A11y.FocusFrame`,
`A11y.PaneTitle` (announces screen or panel changes) · it also has an **optimistic values** workaround that
announces the *predicted* value the moment the user acts · **2026 window**: PRs #116 "Sync: Release/0.9.1" (closed
2026-10-04), #115 "Sync: 0.9.1" (closed 2026-10-04), #114 "fix(ios): use framework-style imports for React headers"
(closed 2026-10-01), #113 "sync master" (closed 2026-07-05), #112 "chore: update readme" (closed 2026-06-21), #111
"Release/0.8.0" (closed 2026-06-21), #110 "Release/0.7.0" (closed 2026-06-13), #109 "Sync: Release/0.6.1 latest"
(closed 2026-02-10), **#108 "Add null check for nextView in focus traversal" (closed 2026-02-03)** — which fixed
**issue #107 "[Fabric] App crashes with NullPointerException in `setA11yOrder` when using New Architecture" (closed
2026-02-03)** · **risks: 57 stars, one maintainer, 2 commits/90 d; it is a native module, so it needs a prebuild
and a Gradle/Xcode build** · **DECISION: WATCH → shortlist candidate (the only real focus-order library that
supports our exact architecture).**

**C2 — `ArturKalach/react-native-a11y-order`** — https://github.com/ArturKalach/react-native-a11y-order —
**52 ★** /3 f · created **2023-05-14** · last release **v2.0.1, 2026-10-05** · **15 commits/90 d, 2 humans** ·
**0 open issues** · **MIT** · npm `react-native-a11y-order` **2.0.1, 2026-10-04** · **the compatibility table,
read verbatim from the README (2026-10-21): "React Native 0.87 and newer → `react-native-a11y-order@2` → **New
Architecture only**; 0.80 – 0.86 → v1 → New + Old Architecture; 0.79 and older → v0.11"** — **our RN 0.88 is
covered by v2, New Architecture only, which is exactly our configuration** · **the README's own tip, which we
should take before we add a dependency: "Before adding this library, try `<View collapsable={false}>` — it fixes
most simple focus order issues with no extra dependencies"** · the README also states "React Native v0.8.2+
includes an experimental `experimental_accessibilityOrder` prop" — **the "v0.8.2" is almost certainly a typo for
0.82 (the prop is documented in the current RN docs, page updated 2026-10-19); the exact version it landed in is
UNVERIFIED** · **our fit: SC 2.4.3 focus order and SC 2.4.11 focus-not-obscured, both of which are hard in RN
because the focus order follows the layout** · **DECISION: ADOPT (this one, not the umbrella package) — it is
the smallest thing that solves the problem we cannot solve with `collapsable={false}`.**

**C3 — `ArturKalach/react-native-a11y-container`** — https://github.com/ArturKalach/react-native-a11y-container —
**1 ★** · created **2023-11-22** · pushed **2026-03-28** · **MIT** · 0 open issues · the iOS
`UIAccessibilityContainer` grouping · **our fit: on iOS, a `Pressable` with an icon and a label can be read as two
elements unless it is grouped** · **DECISION: WATCH (it is bundled inside C1; we can take the umbrella package if
we end up wanting the container).**

**C4 — `FormidableLabs/eslint-plugin-react-native-a11y`** ("the Formidable") — https://github.com/FormidableLabs/eslint-plugin-react-native-a11y —
**307 ★** /31 f · created **2018-07-03** · **last release v3.5.1, 2024-11-04** · **0 commits/90 d** (last commit
2024-11-04) · 7 open issues · **MIT** · npm `eslint-plugin-react-native-a11y` **3.5.1, 2024-11-04** · repo
1 818 KB · **the rules (read from `src/rules/`, 2026-10-21): `has-accessibility-hint`, `has-accessibility-props`,
`has-valid-accessibility-actions`, `has-valid-accessibility-component-type`, `has-valid-accessibility-descriptors`,
`has-valid-accessibility-ignores-invert-colors`, `has-valid-accessibility-live-region`, `has-valid-accessibility-role`,
`has-valid-accessibility-state`, `has-valid-accessibility-states`, `has-valid-accessibility-traits`,
`has-valid-accessibility-value`, `has-valid-important-for-accessibility`, `no-nested-touchables`** (14 files) ·
**four configs: `basic`, `ios`, `android`, `all`** · **the blocker, from the 2026 window: issue #166 "How to use with
flat config file in eslint9" (open, 2025-03-03) — our repo is on ESLint 10 flat config** (`packages/eslint-config/package.json`
— `eslint: 10.13.0`, `@eslint/js: 10.0.1`); issue #165 "Disable `has-valid-accessibility-descriptors` for `TextInput`"
(open, 2024-11-25); #161 "Last release crash with Eslint v9" (closed, 2024-09-18) — **the plugin already broke on
ESLint 9 and the flat-config path is still unresolved 13 months later** · **our fit: it is the only free,
CI-able RN accessibility checker that exists** · **DECISION: WATCH → shortlist candidate (adopt the *rules*, not
necessarily the plugin; we re-implement the 14 rules in our own ESLint config, which is a 100-line job and avoids
the ESLint-10 incompatibility entirely).**

**C5 — `aryella-lacerda/react-native-accessibility-engine`** — https://github.com/aryella-lacerda/react-native-accessibility-engine —
**175 ★** /17 f · created **2020-12-12** · **last release v3.2.0, 2022-11-15** · **0 commits/90 d** (pushed
2026-10-20 — branches are alive, no release) · 8 open issues · **MIT** · npm `react-native-accessibility-engine`
**3.2.0, 2022-11-15** · it improves the accessibility of a **react-native-webview** on iOS · **our fit: we have
no WebView** · **DECISION: REJECT (wrong problem, no release in four years).**

**C6 — `GeekyAnts/react-native-aria`** — https://github.com/GeekyAnts/react-native-aria — **228 ★** /9 f · created
**2020-12-14** · last release **0.2.3, 2021-02-22** · **0 commits/90 d** · 8 open issues · **MIT** ·
**ARCHIVED** · *(stars and dates as recorded in `docs/research/2026/react-native-design-systems-motion.md`, read
2026-10-20; the release, commit-count, issue-count and archive status were re-verified by the API on 2026-10-21)* · the React-Aria-inspired RN accessibility primitives · **our fit: it is the closest thing to what
`react-native-a11y` does** · **DECISION: REJECT (archived 2021; RN core now ships the `aria-*` and `role` props
that made this necessary).**

**C7 — `jgillick/react-native-a11y-slider`** — https://github.com/jgillick/react-native-a11y-slider — **14 ★** ·
created **2022-10-12** · last push **2023-10-26** · **MIT** · 0 open issues · an accessible slider ·
**our fit: we have no slider today; `expo` ships one (see the 2026 Expo PR #51632 adding `accessibilityLabel`,
`accessibilityHint` and `testID` to the community Slider)** · **DECISION: REJECT (a one-component library for a
component we do not have; the Expo community Slider already got the a11y props in 2026-10).**

**C8 — `zoontek/react-native-localize`** — https://github.com/zoontek/react-native-localize — **2 443 ★** /…
· created (2019) · last release **3.7.2, 2026-09-15** · **16 commits/90 d, 3 humans** · 4 open issues · **MIT** ·
New Architecture: yes · the RN localisation library (device locale, RTL detection, `getLocales`) · **our fit:
SC 1.3.4/3.1.1 need the *device* locale and the *direction*; `expo-localization` 58.0.5 (2026-10-19) does the
same inside the Expo SDK** · **DECISION: WATCH (prefer `expo-localization`; one localisation library, not two).**

### 1.3 UI kits (a11y patterns to mine, not to adopt) (K1–K4)

**K1 — `callstack/react-native-paper`** — https://github.com/callstack/react-native-paper — **14 472 ★** /2 250 f ·
created **2016-10-19** · pushed **2026-10-12** · last release **v5.15.3, 2026-05-26** · **31 commits/90 d, 10
humans** · 330 open issues · **MIT** · repo 448 418 KB · **the 2026 a11y work, as recorded in
`docs/research/2026/react-native-design-systems-motion.md` (read 2026-10-21): PR #5125 (accessible Modal), #5126
(portal hides the content below a modal from assistive technology), #5124 (portal forwards the reduce-motion
preference) — all 2026-09-16 → 2026-09-28** · **our fit: the *portal a11y* pattern is exactly our `Sheet.tsx`
problem — a modal sheet must hide the content below it from VoiceOver/TalkBack, and RN's own
`accessibilityViewIsModal` (iOS) / `importantForAccessibility="no-hide-descendants"` (Android) are the primitives**
· **DECISION: WATCH (mine the patterns; do not adopt the kit — Material 3 is not our language).**

**K2 — `founded-labs/react-native-reusables`** — https://github.com/founded-labs/react-native-reusables —
**8 702 ★** /320 f · created **2023-12-16** · pushed **2026-09-27** · last release **`rn-primitives@1.4.0`,
2026-03-28** · **3 commits/90 d, 1 human** · 16 open issues · **MIT** *(the star count and dates are as recorded
in `docs/research/2026/react-native-design-systems-motion.md`, read 2026-10-20; the release date, commit count and
issue count were re-verified by the API on 2026-10-21)* · its 2026-07-02 commits are **reduced-motion
support + portal accessibility across 22 components** (recorded in the sibling design file) · **our fit: the
"reduce-motion branch applied in one pass across all 11 overlay components" is a pattern we can copy into
`packages/design-tokens`** · **DECISION: WATCH (mine, do not install — one dominant maintainer, no release in
6 months, and the primary styling path is NativeWind, which is a hard-rule violation in this repo).**

**K3 — `gluestack/gluestack-ui`** — https://github.com/gluestack/gluestack-ui — **5 327 ★** /238 f · created
**2023-01-11** · pushed **2026-09-02** · last release **v5.0.0, 2026-06-25** · **18 commits/90 d, 4 humans** ·
12 open issues · **licence UNVERIFIED — the API reports no SPDX id and the repository's `LICENSE` file is empty**
· **our fit: it has the best accessibility primitives in the kit pool, but it is Tailwind/NativeWind-shaped and its
release train has collapsed to one in six months** · **DECISION: WATCH (licence UNVERIFIED and wrong styling
engine).**

**K4 — `wix/react-native-ui-lib`** — https://github.com/wix/react-native-ui-lib — **7 155 ★** /752 f · created
**2017-02-08** · pushed **2026-10-17** · **MIT** · 82 open issues · a large component library with an
accessibility layer · **our fit: a reference, not a dependency** · **DECISION: WATCH (read only).**

### 1.4 Test and automation tooling (T1–T9)

**T1 — `callstack/react-native-testing-library` (RNTL)** — https://github.com/callstack/react-native-testing-library —
**3 425 ★** /279 f · created **2018-10-01** · last release **v14.1.0, 2026-10-08** · **17 commits/90 d, 3 humans** ·
1 open issue · **MIT** · repo 36 499 KB · npm `@testing-library/react-native` **14.1.0, 2026-10-08** ·
**the accessibility matchers that exist in `src/matchers/` (read 2026-10-21): `to-be-busy`, `to-be-checked`,
`to-be-disabled`, `to-be-expanded`, `to-be-partially-checked`, `to-be-selected`, `to-have-accessibility-value`,
`to-have-accessible-name`, `to-have-display-value`, `to-have-prop`, plus `to-be-visible`, `to-be-on-the-screen`,
`to-have-text-content`, `to-have-style`, `to-contain-element`** · **our fit: `toHaveAccessibleName` and
`toHaveAccessibilityValue` are exactly the unit-level assertions we need for 4.1.2 (name, role, value) and
`toHaveProp` can assert `accessibilityRole`, `accessibilityState`, `importantForAccessibility`** ·
**DECISION: ADOPT (the unit-level a11y gate; it is already a devDependency of `apps/mobile` at 13.3.3 and the
matchers are free).**

**T2 — `mobile-dev-inc/Maestro`** ⭐ — https://github.com/mobile-dev-inc/Maestro — **16 144 ★** /995 f · created
**2022-03-31** · pushed **2026-10-19** · last release **`cli-2.11.0`, 2026-09-29** · **67 commits/90 d, 15 humans**
· 334 open issues · **Apache-2.0** · repo 1 064 792 KB · **the complete command list was read from
`docs.maestro.dev/reference/commands-available.md` (2026-10-21) and there is NO accessibility command** — the
list is: addMedia, assertDarkMode, assertLightMode, assertNoDefectsWithAI, assertNotVisible, assertScreenshot,
assertTrue, assertVisible, assertWithAI, back, clearKeychain, clearState, copyTextFrom, doubleTapOn, eraseText,
evalScript, extendedWaitUntil, extractTextWithAI, hideKeyboard, inputText, killApp, launchApp, longPressOn,
openLink, pasteText, pressKey, repeat, retry, runFlow, runScript, scroll, scrollUntilVisible, setAirplaneMode,
setClipboard, setDarkMode, setLocation, setOrientation, setPermissions, startRecording, stopApp, stopRecording,
swipe, takeScreenshot, tapOn, toggleAirplaneMode, toggleDarkMode, travel, waitForAnimationToEnd · **no contrast
assertion, no focus-order assertion, no label assertion, no font-scale command** · **what it *does* give us:
`assertVisible` matches against the accessibility tree, so a missing `accessibilityLabel` makes an element
unfindable — our own `.maestro/today-list.yaml` already asserts `assertVisible: "Delivered"` and
`"Remaining"`, which means **our E2E tests are already load-bearing on the accessibility tree**; plus
`setPermissions`, `setLocation`, `setDarkMode`, `pressKey` (for a hardware keyboard), and `assertScreenshot` for
the visual-regression gate** · **the 2026 issue window**: **#3612 "Add performAccessibilityAction" (open,
2026-09-18)** — i.e. Maestro still cannot *perform* a screen-reader action, so a VoiceOver/TalkBack flow is not
automatable with Maestro today; #3497 "Android: WebView 150+ text inputs are unmatchable — Chromium moved the
accessible name" (open, 2026-08-10); #3495 "iOS: transient viewHierarchy 500 aborts before the command timeout"
(closed, 2026-08-09); #3515 "UI components error attribute not matched in text selectors" (closed, 2026-08-18);
#3631 "Android: waitForAppToSettle never exits early because the hierarchy comes back reordered" (open,
2026-09-25) · **DECISION: ADOPT (the device-level runner) — but the accessibility assertions we need are NOT in
it, so Maestro is the *harness*, not the *oracle*.**

**T3 — `appium/appium`** — https://github.com/appium/appium — **22 111 ★** /6 295 f · created **2013-01-09** ·
pushed **2026-10-20** · 66 open issues · **Apache-2.0** · the automation framework with the real accessibility
drivers (UIAutomator2, XCUITest) · **our fit: it is the *only* open-source path to a real screen-reader session
(UIAutomator2 can query the accessibility node tree; XCUITest can drive VoiceOver) — and it is the transport Deque's
own RN automation uses** · risks: heavier than Maestro (a device farm, a server, a client) · **DECISION: WATCH (the
fallback if Maestro never grows an accessibility command; also the way to run a real screen-reader pass).**

**T4 — `dequelabs/axe-core`** — https://github.com/dequelabs/axe-core — **7 674 ★** /966 f · created
**2015-06-10** · pushed **2026-10-20** · last release **v4.14.0, 2026-10-05** · **100 commits/90 d, 23 humans** ·
412 open issues · **MPL-2.0** · npm `axe-core` **4.14.0, 2026-10-05** · **it is a DOM engine: it injects into a
document, walks the accessibility tree of an HTML page and computes contrast, names and roles. It has no React
Native engine.** The GitHub code search `repo:dequelabs/axe-core react-native` returns **1 hit and it is a
`pnpm-lock.yaml`** — i.e. there is **no RN support in the free engine** · **our fit: it is the *web* dashboard's
tool (Lighthouse includes it) and the reference for the rule semantics we re-implement** · **DECISION: ADOPT for
the **web dashboard** only (`apps/web`), and **not** for the mobile app. `docs/COVERAGE_AUDIT-P2.md` M7 says
"axe / react-native-a11y" — that pairing is right for a web+mobile repo, and wrong if read as "axe on the
mobile app".**

**T5 — `NickColley/jest-axe`** — https://github.com/NickColley/jest-axe — npm `jest-axe` **11.0.0, 2026-07-26** ·
**MIT** · a Jest matcher wrapper around `axe-core` — **it runs against jsdom, i.e. the DOM, i.e. the web** ·
**our fit: none for RN** · **DECISION: REJECT for mobile (web only).**

**T6 — `jsx-eslint/eslint-plugin-jsx-a11y`** — https://github.com/jsx-eslint/eslint-plugin-jsx-a11y — npm
`eslint-plugin-jsx-a11y` **6.10.2, 2024-10-26** · **MIT** · the web a11y lint rules, the foundation Formidable's
plugin was built on ("Building upon the foundation set down by eslint-plugin-jsx-a11y", the plugin's README) ·
**our fit: the rules are HTML-shaped** · **DECISION: REJECT for mobile; keep it in the web app's ESLint config.**

**T7 — `wix/Detox`** — https://github.com/wix/Detox — **12 040 ★** /1 909 f · created **2016-06-15** · pushed
**2026-10-19** · 223 open issues · **MIT** · the other RN E2E framework · **our fit: Maestro is already our
runner (`.maestro/`, `android-e2e.yml`)** · **DECISION: REJECT (we have a runner).**

**T8 — `GoogleChrome/lighthouse`** — https://github.com/GoogleChrome/lighthouse — **30 916 ★** /9 771 f · created
**2016-03-08** · pushed **2026-10-20** · 461 open issues · **Apache-2.0** · it embeds `axe-core` and has an
**accessibility** category · **our fit: the web dashboard's a11y gate (`apps/web`), where the bar in
`docs/research/2026/web-dashboard-nextjs.md` is "Lighthouse ≥ 95 on performance and accessibility"** ·
**DECISION: ADOPT for the web dashboard; irrelevant to the mobile app.**

**T9 — `GoogleChrome/lighthouse-ci`** — part of the same project · a CI runner for Lighthouse · **our fit: the
web dashboard's PR gate** · **DECISION: ADOPT (web only).**

### 1.5 Also evaluated (grouped)

- `dequelabs/axe-cli` — **438 ★**, **ARCHIVED since 2021-02-22**, MPL-2.0 → **REJECT (archived, web only).**
- `d3/d3-scale-chromatic` — **817 ★**, ISC (API says NOASSERTION), **last push 2024-06-16** → **REFERENCE ONLY**
  (the Okabe-Ito / viridis colour-blind-safe schemes we can use to re-pick the status palette).
- `d3/d3-interpolate` — **498 ★**, ISC, last push 2023-10-06 → **REFERENCE ONLY** (a colour ramp, not a palette).
- `w3c/failsafe` — **not found via the API** (name/owner uncertain) → **UNVERIFIED, not used.**
- `@testing-library/jest-native` — npm **5.4.3, 2023-08-22** → **REJECT (merged into RNTL; deprecated).**
- `expo/expo-localization` — npm **58.0.5, 2026-10-19**, MIT → **ADOPT for the locale/RTL work (in the security
  file it is a privacy signal; here it is the SC 3.1.1 / 1.3.4 dependency).**
- `appandflow/react-native-safe-area-context` — npm **5.10.1, 2026-09-29**, MIT (repo `react-native-safe-area-context/react-native-safe-area-context`) →
  **KEEP (installed at 5.10.1; it is the notch/inset layer, and in RTL the insets swap sides).**
- `software-mansion/react-native-screens` — npm **4.30.0, 2026-10-13**, MIT (installed) → **KEEP; it owns the
  screen-reader focus behaviour of each route, so the "announce the new screen" work belongs here.**
- `FormidableLabs/formidable-react-native-app-boilerplate` — **334 ★**, **ARCHIVED 2022** → **REJECT.**
- `react-native-accessibility-engine` (npm 3.2.0, 2022) → **REJECT.**
- `expo/expo` → `packages/expo-standard-web-crypto` → not accessibility.
- `react-native-webview/react-native-webview` — **7 196 ★**, MIT, pushed 2026-09-20 → **WATCH** (a WebView is a
  known a11y trap: a remote page brings its own contrast, its own focus order and its own scale, none of which we
  control. **We do not install it, and the a11y rule should be "no WebView in the courier-facing surfaces".**)

---

## 2. Shortlist (13)

| # | Candidate | Decision | One-line reason |
|---|---|---|---|
| S1 + S2 | **WCAG 2.2 (REC 2024-12-12) and SC 2.5.8** | **ADOPT (the bar)** | 86 success criteria, and the 2.5.8 text (24 × 24 CSS px, five exceptions) is what makes our 56/72 pt bar explicable rather than arbitrary. |
| S3 + S4 | **React Native 0.88's accessibility API** | **ADOPT (the mechanism)** | `role` (which supersedes `accessibilityRole`), the `aria-*` set, `accessibilityActions`, `AccessibilityInfo` — all in the runtime we already ship. |
| T1 | **RNTL 14.1.0** | **ADOPT (the unit gate)** | `toHaveAccessibleName`, `toHaveAccessibilityValue`, `toHaveProp` — free, already installed, and they make 4.1.2 testable. |
| T4 | **`dequelabs/axe-core` 4.14.0** | **ADOPT — for `apps/web` ONLY** | The free engine is a DOM engine with no React Native support (1 code-search hit, and it is a lockfile). Using it on the app would be a fiction. |
| S7 | **Deque Axe DevTools for Mobile** | **WATCH (the oracle, short licence)** | The only scanner that reads the rendered accessibility tree on a real device; but the dashboard is retired into "Axe Developer Hub" and analysers must be updated by **2026-12-31**. |
| T2 | **Maestro cli-2.11.0** | **ADOPT (the device harness)** | Our runner already; `assertVisible` already queries the accessibility tree, so our E2E is already load-bearing on the a11y labels. But it has **no accessibility command** (#3612 open). |
| C2 | **`react-native-a11y-order` 2.0.1** | **ADOPT (one dependency, if we need one)** | RN 0.87+ → v2, **New Architecture only** — exactly our configuration; 15 commits/90 d; and its own README says to try `collapsable={false}` first. |
| C1 | **`react-native-a11y` 0.9.1** | **WATCH (the umbrella)** | Focus order, announcements, focus trap, iOS containers in one `A11y.*` namespace; but 57★, one maintainer, and 2 commits/90 d. |
| C4 | **`eslint-plugin-react-native-a11y` 3.5.1** (Formidable) | **ADOPT THE RULES, re-implement them** | 14 rules and 4 configs — the only free CI-able RN checker — but it broke on ESLint 9 and the flat-config issue (**#166**) is still open; our repo is on ESLint 10 flat config. |
| S8 | **Deque's 6 RN lint rules** | **ADOPT as our rule list** | `has-valid-accessibility-role` / `-state` / `-value` / `-actions`, `image-has-accessibility-label`, `has-accessibility-role` — we implement these ourselves instead of sending our source to a SaaS. |
| K1 + K2 | **react-native-paper + react-native-reusables** | **MINE, DO NOT INSTALL** | Their 2026 work is exactly ours: portal a11y (hide the content below a modal) and a reduce-motion branch applied across all overlay components. |
| T3 | **Appium** | **WATCH (the fallback)** | The only open-source path to a real screen-reader session (UIAutomator2 / XCUITest) — the answer if Maestro never grows accessibility commands. |
| S5 + C8 | **Expo SDK 58 + `expo-localization` 58.0.5** | **KEEP / ADOPT the localisation module** | The device locale and the RTL flag come from here; `expo-secure-store`-style "one library per concern" beats adding `react-native-localize` as well. |

**Also on the radar:** `react-native-a11y-container` (C3, iOS grouping) · `react-native-screens` (route focus
behaviour) · `d3-scale-chromatic` (re-picking a colour-blind-safe status palette) · `react-native-webview`
(only as a thing we *don't* install) · `d3-interpolate` (contrast ramps).

---

## 3. Deep review — top 5 (code, commits, PRs and issues in the 2026 window)

### 3.1 React Native 0.88's accessibility API (S3, S4)

**What I read.** The whole `reactnative.dev/docs/accessibility` page (last updated **19 Oct 2026**) — the full prop
list, the `aria-*` set, the `role` set, the accessibility-action names, and the TalkBack/VoiceOver setup notes.

**The findings that change our code.**

1. **`role` supersedes `accessibilityRole`.** The docs say `role` "communicates the purpose of a component and has
   **precedence over the `accessibilityRole` prop**". Our `Button.tsx:123` uses `accessibilityRole="button"`. The
   modern form is `role="button"`. **The `role` list also contains seven values `accessibilityRole` does not
   have** — `heading`, `img`, `list`, `listitem`, `presentation`, `searchbox`, `slider` — and the docs also note
   that `role="grid"` "Adds the in/out of grid announcements to Android's GridView", which is the same effect
   `accessibilityRole="grid"` has. A list of 300 stops must be `role="list"` / `role="listitem"`, which is the
   1.3.1 mechanism.
2. **`aria-live` (Android) / `accessibilityLiveRegion` (Android) is the status-message mechanism (4.1.3).** We have
   *no* live region anywhere, so a screen-reader user gets no announcement when a stop is marked delivered.
3. **`accessibilityActions` + `onAccessibilityAction` is how a screen reader "activates" a custom control.** The
   standard action names are `magicTap`, `escape`, `activate`, `increment`, `decrement`, `longpress`, `expand`,
   `collapse`. The docs note TalkBack 9.1+ replaced the volume-button "increment" with the "Adjust Reading Control"
   gesture and TalkBack 9.2+ did the same for "decrement". **A courier using TalkBack must be able to say
   "delivered" — the app's core promise — and the only accessible way to trigger a custom action is
   `onAccessibilityAction` with the `activate` name.**
4. **`experimental_accessibilityOrder` is explicitly "Experimental … Don't use them in production."** It is also
   **exhaustive**: a component it does not reference "will never get focused". That is a footgun; we do not use it
   in production.
5. **`accessibilityLabelledBy` / `aria-labelledby` (Android) reference a `nativeID`** — the correct way to label a
   text input by a visible label instead of duplicating the string.
6. **`accessibilityViewIsModal` (iOS) and `importantForAccessibility="no-hide-descendants"` (Android) are the
   two halves of "hide the content below a modal"** — which is exactly what our `Sheet.tsx` needs and what
   react-native-paper shipped as its portal-a11y work in 2026-09.

**Verdict.** Everything we need for 1.1.1, 1.3.1, 2.4.3, 2.4.11, 4.1.2 and 4.1.3 is already in the runtime. **We do
not need a library for the basics; we need a library only for focus *order*.**

### 3.2 `react-native-a11y-order` 2.0.1 (C2)

**What I read.** The README in full (2026-10-21), the release list, the compatibility table, the component table
(`A11y.Order`, `A11y.Index`, `A11y.View`, `A11y.Card`, `A11y.FocusTrap`, `A11y.FocusFrame`, `A11y.PaneTitle`), and
the 2026 issue/PR window.

**The compatibility table is the deciding fact**, quoted verbatim:

| React Native | Install | Architecture |
|---|---|---|
| 0.87 and newer | `react-native-a11y-order@2` | **New Architecture only** |
| 0.80 – 0.86 | `react-native-a11y-order@1` | New + Old Architecture |
| 0.79 and older | `react-native-a11y-order@0.11` | New + Old Architecture |

**We are on RN 0.88 with `newArchEnabled: true`** (`apps/mobile/app.json:10`) — so **v2 is the correct major and it
is the New-Architecture-only build, which is exactly our configuration.**

**The 2026 window.** 15 commits/90 d, 2 humans, 0 open issues. One issue in the whole 2026 window: **#41 "Remove
unnecessary buildscript classpath from android/build.gradle" (closed, 2026-05-05)**. The 2026 releases are v2.0.1
(2026-10-05), and the version-1 line is the one with the Open/Closed Architecture support.

**The README's own advice, which we adopt first.** "Before adding this library, try `<View collapsable={false}>` —
it fixes most simple focus order issues with no extra dependencies." That is a **zero-dependency step we must try
and measure before we add a native module** (see §4).

**Verdict.** Adopt **as the single accessibility runtime dependency**, if and only if the `collapsable={false}`
route and our own `accessibilityOrder` handling do not reach the bar. Its `A11y.PaneTitle` (announce the new
screen) and `A11y.FocusTrap` (keep focus inside a sheet) are precisely the two things our `Sheet.tsx` and our
route changes need, and neither is in RN core.

### 3.3 `eslint-plugin-react-native-a11y` 3.5.1 (C4) — the Formidable

**What I read.** The README (setup, the four configs `basic` / `ios` / `android` / `all`, the note "If you are
unsure which one to use, in most cases `all` can be safely used") and the **rule list from `src/rules/`** — 14
rules: `has-accessibility-hint`, `has-accessibility-props`, `has-valid-accessibility-actions`,
`has-valid-accessibility-component-type`, `has-valid-accessibility-descriptors`,
`has-valid-accessibility-ignores-invert-colors`, `has-valid-accessibility-live-region`,
`has-valid-accessibility-role`, `has-valid-accessibility-state`, `has-valid-accessibility-states`,
`has-valid-accessibility-traits`, `has-valid-accessibility-value`, `has-valid-important-for-accessibility`,
`no-nested-touchables`.

**The maintenance and compatibility picture, from the 2026 window.** Last commit **2024-11-04**; **0 commits/90 d**;
last release **v3.5.1, 2024-11-04**; 7 open issues, of which:

- **#166 "How to use with flat config file in eslint9" (open, 2025-03-03)** — **our repo is on ESLint 10 flat
  config** (`packages/eslint-config/package.json`: `eslint: 10.13.0`, `@eslint/js: 10.0.1`).
- **#165 "Disable `has-valid-accessibility-descriptors` for `TextInput`" (open, 2024-11-25)** — the rule we would
  most want to use is the one with a known false positive on `TextInput`.
- **#161 "Last release crash with Eslint v9" (closed, 2024-09-18)** — the plugin already broke once on a major ESLint
  bump.
- **#152 "Add support for new web-inspired a11y props" (closed, 2024-03-07)** — the `aria-*` props landed in RN
  after the plugin's 2023 rule set, so the plugin's coverage of them is a 2024 decision. **The exact RN version
  that introduced `aria-*` is UNVERIFIED** (the RN docs page does not state it).

**Verdict.** **Take the rules; do not take the plugin.** Fourteen rules, MIT-licensed, are ~100 lines of ESLint
config in our own `packages/eslint-config` and they will run on ESLint 10 flat config forever. The plugin as
published cannot be configured on our ESLint version without a fork, and a fork of a 307★ project with no commits
in 23 months is a worse bet than our own copy.

### 3.4 Maestro cli-2.11.0 (T2)

**What I read.** The **complete** command list at `docs.maestro.dev/reference/commands-available.md` (2026-10-21) —
48 commands, listed in full in §1.4 — and the 2026 issue window.

**The finding that decides our tooling: there is no accessibility command.** No contrast assertion, no
focus-order assertion, no label assertion, no font-scale command, no "assert the accessible name of". The
2026 issue stream shows the gap is known and unfixed: **#3612 "Add performAccessibilityAction" (open,
2026-09-18)** — Maestro cannot *perform* a screen-reader action, so a VoiceOver/TalkBack flow is not automatable
with Maestro today. Also **#3495 "iOS: transient viewHierarchy 500 aborts before the command timeout" (closed,
2026-08-09)** and **#3631 "Android: waitForAppToSettle never exits early because the hierarchy comes back
reordered" (open, 2026-09-25)** — both are about the fragility of the very hierarchy an accessibility assertion
would read.

**What Maestro *does* give us, and it is more than we use today.** `assertVisible` matches against the
**accessibility tree** — which means our existing flows (`.maestro/today-list.yaml` asserts `assertVisible:
"Delivered"` and `"Remaining"`; `.maestro/stops.yaml` asserts `assertVisible: "Riccarton"`) are *already*
asserting against the accessibility tree, and would break if we removed an `accessibilityLabel`. `setDarkMode` /
`assertDarkMode` give us the night-mode gate; `setPermissions`, `setLocation`, `pressKey` and `setClipboard` give
us the "permission denied", "offline" and "hardware keyboard" paths; `assertScreenshot` is the visual-regression
hook for the 200 %-text gate.

**Verdict.** Maestro stays our device harness and it becomes the **font-scale, night-mode and permission-denied**
runner. It is **not** the accessibility oracle — we write that ourselves as an RNTL + ESLint + a small Maestro
assertion set.

### 3.5 Deque's React Native accessibility story (S7, S8, T4)

**What I read.** The Deque mobile docs (RN page, version line 2025.7.2), the Linter RN setup page (version 4.0.0),
the Deque APIs page (published 2026-06-24) and the announcements page (releases through 2026-09-08).

**The finding that matters most: the free `axe-core` cannot test our mobile app.** Deque's React Native support
is in **two commercial products**: **Axe DevTools for Mobile** (iOS Desktop Analyzer, Android Accessibility
Analyzer, Appium drivers, Espresso/XCUI SDKs) and **Axe DevTools Linter** (a SaaS server; "to access Axe Linter,
you must contact support to have licenses assigned"; it lints RN with **six** rules and needs `global-libraries:
[react-native]`). The free **`dequelabs/axe-core` 4.14.0 (MPL-2.0)** is a **DOM engine** — a GitHub code search for
`react-native` inside that repository returns **one hit, in a `pnpm-lock.yaml`**. There is no `@axe-core/react-native`
on npm (the package does not exist).

**The other findings that shape our plan.**

- Deque's own mobile guidance is that "**iOS and Android apps must each be tested separately for accessibility,
  even when generated from a cross-platform framework**" — which is why a single "axe on the app" story was never
  going to work.
- Their 2023-04-19 release added RN support and the **WCAG 2.2 Target Size rule**; the 2025-09-24 release added
  the Android "Nested Focusable Element" rule. The rule *set* is the valuable part.
- Their 2026-09-08 announcement retires the mobile dashboard into **Axe Developer Hub**, and **analysers must be
  updated by 2026-12-31** — so a purchase now has a deadline attached.

**Verdict.** **Do not build the plan on a commercial scanner.** Take their *rule list* and their *interpretation*
(WCAG2ICT-for-mobile) and implement them ourselves; keep a short licence as the final pre-release oracle if we buy
anything at all.

---

## 4. Benchmark — **UNVERIFIED: no accessibility eval set exists**

**I did not run a benchmark and I will not invent one.** `docs/COVERAGE_AUDIT-P2.md` M7 lists "an accessibility
check in CI (axe / react-native-a11y)" as a **P4** gap, which means it has never been built. There is no
`docs/eval/a11y/`, no seeded failing component, no screen-reader script. Everything below is **UNVERIFIED** until
the set exists.

**The set that must be built (name + shape):**

1. **`docs/eval/a11y/seeded-components/` — one RN component per defect**, each with a known WCAG clause:
   an `Image` with no `accessibilityLabel` (1.1.1) · a pressable with no role (4.1.2) · a `Text` in
   `textTertiary` on white (1.4.3) · a `statusSkipped` dot on white (1.4.11) · a `Button` with `minHeight: 44`
   (2.5.8) · a `TextInput` with a fixed 44 px height (1.4.4 at 200 %) · a list whose items are not
   `role="listitem"` (1.3.1) · a status change with no live region (4.1.3) · a sheet that does not hide the
   content below it (1.3.2 / 2.4.11) · a control with a drag-only gesture and no alternative (2.5.7).
2. **`docs/eval/a11y/flows/` — three task flows in plain language**, each with the screen-reader transcript we
   expect: *"mark this stop delivered"*, *"read me the door note"*, *"what is my next stop and how far is it"*.
   A screen-reader user must be able to complete a delivery with the screen reader on and the phone mounted.
3. **`docs/eval/a11y/runner/`** — the runner that produces the numbers: ESLint (our rules) · RNTL matchers ·
   a token-contrast script over `packages/design-tokens` · Maestro at 3 font scales · a manual device pass with a
   screen reader, scored against the flows.

| Metric | Gate | Source of truth | How we would measure it |
|-------|------|-----------------|--------------------------|
| **Finding rate (recall)** on the seeded set | our toolchain finds **≥ 90 %** of the seeded defects, and **each** checker finds the defects in its own category | the seeded components | run ESLint + RNTL + the contrast script over the seeded components; a defect is "found" if the reported rule maps to the right WCAG clause. **Currently UNVERIFIED.** |
| **False-positive rate** | **0 false positives** on the real app (a11y lint must not cry wolf, or it will be disabled) | the real repo, triaged once | every lint finding is triaged and labelled; the false-positive count is the number of labels "not a real defect". **Currently UNVERIFIED.** |
| **Coverage of the criterion set** | we publish a matrix: every WCAG 2.2 AA criterion that applies to a native app → our check (automated / manual / not-applicable) with a reason | the WCAG 2.2 ToC + a native applicability note | the matrix in `docs/squads/design/`; a criterion with no check and no reason is a gap. **Currently UNVERIFIED.** |
| **Contrast** | **100 %** of the token pairs meet their target: driving text ≥ 7:1, everything else ≥ 4.5:1, non-text ≥ 3:1 — **in all three themes** | `packages/design-tokens/src/themes.ts` | a script that computes the WCAG 2.x contrast ratio for every foreground/background pair in `dayTheme`, `nightTheme` and `highContrastTheme` and **fails the build** on a violation. **We have already computed the current values by hand and there are 5 failures — see §0.** |
| **Dynamic type** | **0 clipped, truncated or overlapping elements at 200 %** on the three key screens | Maestro at 200 % + screenshots | run the three mockups at font scale 1.0 / 1.5 / 2.0 and diff against the approved mockups; the gate is the same "no screenshot contradicts the mockup" rule as `docs/design/SYSTEM.md` §9. **Currently UNVERIFIED — but we know the fixed 44 px `Input` and `Button` heights will fail it.** |
| **Focus order** | a screen-reader pass reaches **every** control in the intended order, on both platforms | the manual device pass | a written transcript per screen, iOS and Android. **Currently UNVERIFIED.** |
| **Screen-reader task success** | a screen-reader user completes **"mark this stop delivered"** and **"read me the door note"** without sighted help, on both platforms | the flows | the manual pass, timed and scripted. **Currently UNVERIFIED.** |
| **Cost in CI** | the automated a11y gate adds **≤ 90 seconds** to a PR | the CI log | the wall time of the lint + RNTL + contrast steps. **Currently UNVERIFIED.** |
| **Time to fix** | an AA finding is fixed within **1 working day** | the tracker | measure over the first 20 findings. **Currently UNVERIFIED.** |
| **Voice-first parity** | **100 %** of the app's actions have both a touch path and a screen-reader path | the action inventory | a test that every `accessibilityActions` entry has a voice command and vice-versa. **Currently UNVERIFIED.** |

**The first benchmark to run:** the ten seeded components against (a) our own ESLint rules, (b) RNTL
`toHaveAccessibleName` / `toHaveProp`, and (c) the token-contrast script. **Then** the three key screens at
200 % font scale in Maestro. Nothing is declared "the winner" before this table exists.

---

## 5. What we are missing → rows for `docs/PARITY.md`

The Spoke column is filled **only** with facts verified in `docs/study/spoke/TEARDOWN.md` (read 2026-10-21).
Where the teardown does not say, the cell is empty. These rows continue the numbering of `docs/PARITY.md` (which
ends at 49).

| # | Family | Feature | Status | Spoke (2026-10-20) | Our edge | Task |
|---|--------|---------|--------|-------------------|----------|------|
| 70 | Accessibility | **A published accessibility statement** and the store accessibility declaration (VoiceOver, TalkBack, 200 % text, reduced motion, contrast) | Planned (task) | "The developer has not yet indicated which accessibility features this app supports" (both the NZ and AU store listings) | we declare it and we can prove it, because every claim is backed by a CI check | T6, T7.16 |
| 71 | Accessibility | **Dynamic type to 200 % with no clipping or truncation** on the three key screens, proved by Maestro screenshots at 1.0 / 1.5 / 2.0 | Planned (task) | | our layouts are built from the tokens, and the fixed-height inputs and buttons are replaced with min-heights | T6 |
| 72 | Accessibility | **Touch targets: ≥ 56 pt everywhere, 72 pt for the primary action** (WCAG 2.2 SC 2.5.8 floor is 24 × 24 CSS px) | Planned (task) | | gloves, a moving van, and a tremor — our bar is 2.3× the WCAG floor | T6 |
| 73 | Accessibility | **Colour-blind-safe status colours**, and status that is never carried by colour alone (shape + text label + spoken state) | Planned (task) | | the delivered count is spoken and labelled, not just green | T6 |
| 74 | Accessibility | **Contrast: driving text ≥ 7:1, everything else ≥ 4.5:1, non-text ≥ 3:1, measured in all three themes** | Planned (task) | | the contrast ratio is computed by a script over the tokens and fails the build | T6 |
| 75 | Accessibility | **Screen-reader support on every screen**: a role, a name, a value, a state, and a live region for every status change | Planned (task) | | our screen reader is a *first-class* path, not a fallback: the courier can run a delivery with the screen reader on | T6, T7.5 |
| 76 | Accessibility | **Focus order and focus trapping** in the stop sheet and the route change (SC 2.4.3, 2.4.11) | Planned (task) | | focus is trapped in the sheet and the new screen is announced when the route changes | T6 |
| 77 | Accessibility | **Reduced motion honoured**: transitions become instant, never removed, and the "reduce motion" system setting is respected | Planned (task) | | the assistant's animations never make a courier carsick or distract them at 100 km/h | T6 |
| 78 | Accessibility | **RTL-ready layouts** (logical `start`/`end` everywhere), with the Arabic UI translated and not accidentally mirrored | Planned (task) | 19 languages including Arabic, Dutch, French, German, Greek, Hebrew, Hungarian, Indonesian, Italian, Japanese, Malay, Polish, Portuguese, Romanian, Russian, Spanish, Thai, Turkish (S13) | we ship RTL correctness for the Arabic and Hebrew couriers Spoke already serves, and add the languages it does not (te reo Māori, Mandarin, Hindi, Samoan, Tongan) | T6, T7.6 |
| 79 | Accessibility | **Accessibility actions** so a screen reader can activate a stop, a delivery outcome and the assistant — and a voice command for every one of them | Planned (task) | "No voice control of the app while driving; no spoken 'delivered'; no voice onboarding; no voice POD" — Spoke has no voice control at all | our *voice* is the accessible path for a motor impairment, and the screen reader is the accessible path for a visual impairment: both reach the same action | T7.5, T7.6 |
| 80 | Accessibility | **An accessibility check in CI** (a11y lint rules, RNTL accessibility matchers, a token-contrast script) | Planned (task) | | the check is a merge gate, not a checklist | T6 |
| 81 | Accessibility | **A real-device screen-reader pass** on both platforms, with written transcripts, before v1 | Planned (task) | | Spoke's actual accessibility implementation is UNVERIFIED — only the store declaration is missing — so we cannot be sure they are better than us | T6, T7.15 |
| 82 | Accessibility | **Motor-impairment path**: every action reachable by voice, one-handed, with a mounted phone, and with gloves | Planned (task) | | our whole app is voice-first, so the accessible path and the safe-driving path are the same path | T7.5, T7.6 |

---

## 6. Decision

1. **The bar is WCAG 2.2 AA, read at the clause level, with a native applicability note per clause.** We publish
   the matrix (criterion → our check → automated / manual / not-applicable → why). A criterion with no check and no
   reason is a gap, not a pass. (Why: `docs/design/SYSTEM.md` §6 already promises WCAG 2.2 AA; a matrix is the only
   way to know whether we keep that promise.)
2. **The mechanism is React Native 0.88's own API, using the modern surface**: `role` (which supersedes
   `accessibilityRole`), the `aria-*` props, `accessibilityActions` + `onAccessibilityAction` with the standard
   `activate` action, `accessibilityLiveRegion`/`aria-live` for 4.1.3, `accessibilityViewIsModal` (iOS) +
   `importantForAccessibility="no-hide-descendants"` (Android) for the sheet, and `AccessibilityInfo` for
   screen-reader detection and `announceForAccessibility`. (Why: everything is already in the runtime we ship; a
   library is only needed for focus *order*.)
3. **The one runtime dependency we may take is `react-native-a11y-order` v2** — RN 0.87+, New Architecture only,
   which is exactly our configuration — and **only after** the zero-dependency step: set
   `collapsable={false}` on the containers whose focus order is wrong, and measure. (Why: the library's own README
   says to try that first; and 57★/one maintainer is a risk we take only when it is earned.)
4. **The CI gate is four things, in this order:** (a) **our own ESLint rules** — the 14 Formidable rules plus
   Deque's six, re-implemented in `packages/eslint-config` for ESLint 10 flat config, **not** the published
   plugin; (b) **RNTL 14.1.0 matchers** — `toHaveAccessibleName`, `toHaveAccessibilityValue`, `toHaveProp` — on
   every component; (c) **a token-contrast script** that computes the WCAG 2.x ratio for every foreground /
   background pair in all three themes and **fails the build**; (d) **Maestro at three font scales** plus a
   night-mode run, with the screenshots diffed against the approved mockups.
5. **The device-level screen-reader pass is manual, scripted and dated, and it is a release gate.** Maestro cannot
   perform a screen-reader action (issue **#3612**, open 2026-09-18), so a VoiceOver/TalkBack run is a person with
   a phone. We script the three flows, record the transcript, and put it in `docs/evidence/accessibility/`. If we
   buy a commercial scanner, it is a **short licence for the final pre-release pass**, not a permanent seat — and
   note the **2026-12-31** analyser deadline in Deque's own announcement.
6. **`axe-core` is for `apps/web`, not for the mobile app.** The free engine is a DOM engine with no React Native
   support; using it on the app would be a fiction. For the web dashboard, Lighthouse (with axe inside) is the
   gate, at the "≥ 95 accessibility" bar the web research file already sets.
7. **The token layer is the real deliverable.** Our contract says Figtree ≥ 17 pt body, 48–76 pt key numbers, a
   72 pt primary action, ≥ 56 pt targets and 200 %-safe layout. The tokens say Inter, 16 px base, 48 px max,
   44 px buttons and a fixed 44 px input. **The a11y work is a token change plus a contrast script, not a pile of
   `accessibilityLabel` props.**
8. **Colour: re-pick the status palette, never rely on hue.** The current delivered/failed pair is green/red.
   We need a hue *and* a shape *and* a word *and* a spoken state, and the palette must clear 3:1 as a graphic and
   4.5:1 as text in all three themes.
9. **Reduced motion is a token branch, not a screen-level flag.** `motion.durations.instant` already exists; what
   is missing is the `AccessibilityInfo.isReduceMotionEnabled` listener and a `reduceMotion` variant of the theme
   that every animated component reads.
10. **The voice-first obligation, stated plainly:** a voice-first app must still be usable with a screen reader
    and with a motor impairment. That means (a) the **screen reader can complete a delivery** — the assistant's
    state is announced, the stop list is navigable, "delivered" is an `activate` action; (b) the **screen reader
    and the voice assistant do not fight** — when TalkBack is on, the assistant's spoken prompts and the
    screen reader's announcements are de-duplicated, or a courier hears two voices; and (c) the **voice path is the
    accessible path for a motor impairment** — every action has a voice command, which is our strongest claim and
    our strongest obligation.

**Fallbacks.** If `react-native-a11y-order` misbehaves on RN 0.88 (it is a New-Architecture-only native module and
its own tracker had a Fabric crash, #107, fixed in #108), the fallback is the zero-dependency route —
`collapsable={false}` plus `accessibilityViewIsModal` / `importantForAccessibility` — and the screen-reader
transcript is the evidence. If the contrast script finds a token pair we cannot recolour without breaking the
brand, the fallback is a **high-contrast theme that already exists** (`highContrastTheme` in `themes.ts`), and the
app offers it explicitly. If the screen-reader pass fails on iOS but passes on Android, the release gate is
**per-platform** and we do not claim a platform we have not tested.

**Risks.**

| Risk | Severity | Mitigation |
|---|---|---|
| We claim WCAG 2.2 AA and cannot prove it | **High** | The matrix + the four CI checks + the dated device transcript. A claim without a check is a marketing claim. |
| The tokens contradict the contract (Inter/16 px/44 px) and the a11y work "fixes the app, not the tokens" | **High** | The token change is task 1; the contrast script then makes the contract self-enforcing. |
| The screen reader and the voice assistant talk over each other | **High** | Detect `AccessibilityInfo.isScreenReaderEnabled`; suppress the assistant's own announcements and route state changes to the live region instead. This is a *design* decision, not a bug. |
| We add a 57★ native module to a locked Expo/RN stack | Medium | Try `collapsable={false}` first; the module is only adopted if the transcript proves the difference. |
| Maestro's accessibility gap stalls the device gate | Medium | #3612 is open and unfixed; the manual pass is the gate; Appium is the fallback if we need automation. |
| Dynamic type at 200 % breaks the driving screen, and someone "fixes" it by capping `maxFontSizeMultiplier` | **High** | The cap is banned by the floor; a 200 % screenshot is a merge gate; the primary action keeps its 72 pt *minimum* at any scale. |
| The contrast script blocks a legitimate brand change | Medium | The script reports the ratio; the brand owner decides; the **exception is written down in the token file**, never hidden. |
| Colour-blind users lose the delivered/failed distinction | **High** | Shape + word + spoken state, and a palette re-picked from a colour-blind-safe scheme. |
| We test only on the emulator | Medium | VoiceOver and TalkBack behave differently; the transcript is per-platform and per-device-class. |
| A commercial scanner becomes a dependency of the gate | Medium | The gate is our own; the commercial tool is the oracle, and it is optional. |

---

## 7. Monthly radar filter (V4 §11.3)

On the first working day of each month, re-read exactly these and write one line each into
`docs/EXECUTOR_LOG.md`. If a line changes, it becomes a task the same day.

| Watch item | Trigger | Where to look | What we do |
|---|---|---|---|
| **WCAG** | a new WCAG version or a W3C errata that changes a clause we rely on | `w3.org/TR/WCAG22/`, `w3.org/standards/history/WCAG22/` | re-read the changed clause and re-run the matrix; **WCAG 3 is a draft — never quote it in a claim** |
| **RN accessibility API** | a new RN release that adds or changes an `accessibility*` / `aria-*` prop, or stabilises `experimental_accessibilityOrder` | `reactnative.dev/docs/accessibility`, the RN releases | migrate the props; if `experimental_accessibilityOrder` goes stable, re-evaluate C2 |
| **Expo** | a new SDK proposal, or an a11y fix in an Expo community component | `expo.dev/changelog`, the `expo/expo` releases | propose an ADR (D21 locks the SDK) |
| **`react-native-a11y-order`** | a new release, or a New-Architecture issue like #107 | `github.com/ArturKalach/react-native-a11y-order` | bump the pin, re-run the screen-reader transcript |
| **`eslint-plugin-react-native-a11y`** | a release, or **#166** (flat config) being fixed | the repo's issues | re-evaluate the plugin vs our own copy of the rules |
| **Maestro** | a release that adds an accessibility command, or **#3612** ("Add performAccessibilityAction") closing | `github.com/mobile-dev-inc/Maestro` | move the screen-reader flow from manual to automated if it lands |
| **Deque / axe** | an axe-core release, an Axe DevTools Mobile release, or the **2026-12-31** analyser deadline | `dequelabs/axe-core` releases, `docs.deque.com/devtools-mobile/…/announcements/` | decide on a short licence before the deadline; otherwise keep the manual pass |
| **RNTL** | a new release with new accessibility matchers | `callstack/react-native-testing-library` releases | adopt the new matchers in the a11y gate |
| **Our own gate** | any a11y check red for 7 days, or a finding that is not fixed in 1 working day | our CI | fix it or delete the check — **never lower the bar** (CONSTRAINTS.md) |
| **The contract** | any change to `docs/design/SYSTEM.md` §2 or §6 | that file | re-run the contrast script and the token audit the same day |
| **NZ context** | a new OPC or a store policy change on accessibility declarations | `privacy.org.nz`, the store developer policies | update the declaration and the statement together |

---

## 8. What we could not verify

- **The 6-month star trend for every candidate** — the star *timeline* is 403 with our token; proxies used
  (releases/6 m, commits/90 d, humans/90 d, registry publish dates).
- **The RN version in which `experimental_accessibilityOrder` landed.** The `react-native-a11y-order` README says
  "React Native **v0.8.2+**", which is almost certainly a typo for 0.82; the prop is documented in the current RN
  docs (page updated 2026-10-19). **The exact version is UNVERIFIED.**
- **Whether `react-native-a11y-order` v2 actually builds against RN 0.88.0 in our Expo 58 prebuild.** The
  compatibility table says 0.87+ and New Architecture only, and our configuration matches, but we have not built it.
- **Deque's rule semantics for React Native** — we read the *names* of the six RN lint rules and the mobile
  documentation; the **implementation** of how they map WCAG to a native accessibility tree is commercial and
  **not read**.
- **The 2026-12-31 analyser deadline** is from Deque's own announcements page (2026-09-08) — we did not verify the
  contract terms.
- **Maestro's accessibility-tree matching semantics** — we read the command list and the issue stream; we did not
  read Maestro's driver source. The claim that `assertVisible` matches the accessibility tree is **inferred from
  the behaviour of our own flows and is UNVERIFIED against the source.**
- **Whether a real screen-reader session can be driven by Appium in our CI** — we read the product pages; we have
  not run it.
- **The computed contrast ratios** are our own arithmetic from the token hex values using the WCAG 2.x relative
  luminance formula (R = G = B threshold 0.03928; sRGB linearisation). They are exact to the published formula but
  **have not been verified by an instrumented screen reader**, and the sRGB values in the tokens are the source of
  truth — if the token file changes, the numbers change.
- **The colour-blind simulation** — we have **not** simulated deuteranopia, protanopia or tritanopia on the actual
  screens; the green/red pairing is identified from the hex values, and the simulation is still to be done.
- **The WCAG 2.2 "native applicability" mapping** — WCAG is a web-content standard. The mapping to a React Native
  accessibility tree is ours and is **not yet peer-reviewed**; WCAG2ICT exists for documents, and the mobile
  mapping in this file is our own reading.
- **Whether our app's 300-stop list, the map, the camera and the voice overlay can meet 1.3.1 and 4.1.2 at all** —
  those screens do not exist yet in their final form.
- **The median first-response time** for any repository in this file — not sampled; maintenance claims are based on
  exact release dates, commit counts and maintainer counts only.
- **The exact licence of `gluestack/gluestack-ui`** — the API reports no SPDX id and the `LICENSE` file is empty.
  Treated as **UNVERIFIED** and not used.

---

## 9. Corrections to earlier documents

| Claim (2026-10-20/21) | Verified 2026-10-21 | Correction |
|---|---|---|
| `docs/COVERAGE_AUDIT-P2.md` M7 — "an accessibility check in CI (axe / react-native-a11y)" | **`axe-core` has no React Native engine** (one code-search hit in the whole repo, and it is a lockfile). `react-native-a11y` is a 57★ runtime library, not a checker. The only free RN checker is `eslint-plugin-react-native-a11y` (307★, MIT, unmaintained since 2024-11-04, flat-config issue #166 still open). | Rewrite M7 as four checks: **our own ESLint rules** (the 14 Formidable rules + Deque's six) · **RNTL a11y matchers** · **a token-contrast script** · **Maestro at 3 font scales**. `axe-core` belongs to `apps/web` only. |
| `docs/design/SYSTEM.md` §2 — "Type: **Figtree**; body ≥ 17 pt; key numbers 48–76 pt" | `packages/design-tokens/src/tokens.ts:166` sets **`Inter`**; `:172` sets **16 px** base; the largest size is **48 px** (`:179`) — there is no 76 pt token | The token file and the contract disagree. The contract wins: the tokens are the finding. |
| `docs/design/SYSTEM.md` §3 — "One primary action (72 pt)" | `tokens.ts:283-286` — `components.button.height` is **36 / 44 / 52 px**; `Button.tsx:164` uses `minHeight: 44` | There is no 72 pt action in the design system at all. The 72 pt primary action is a **new token plus a component change**. |
| `docs/design/SYSTEM.md` §6 — "Dynamic type to 200 % without clipping or truncation" | `tokens.ts:297` — `components.input.height` is a **fixed** 44 px; `Input.tsx:38` sets `height: 44`; `Button.tsx:164` sets `minHeight: 44` | Fixed heights clip at 200 %. Every fixed height must become a `minHeight` with a scaled line height. |
| `docs/design/SYSTEM.md` §6 — "Status colours are colour-blind safe and never the only signal" | `status.delivered` #059669 and `status.failed` #ef4444 are the **green/red pair**; `index.tsx:312` paints a **10 px** `stopStatusDot` | Colour-blind safety is a *palette* decision (re-pick) plus a *shape* decision (the 10 px dot is not a signal). `stops.tsx:76-78` does pair a colour with a text badge, so 1.4.1 is only partially met. |
| `docs/design/SYSTEM.md` §6 — "Contrast: driving text ≥ 7:1, everything else ≥ 4.5:1" | 5 token pairs fail today: day `textTertiary` 2.56:1, day `border.focus`/`brandPrimary` 2.86:1, day `statusSkipped` 2.15:1, night `textTertiary` 4.12:1, and the white stop-number on `statusSkipped` 2.15:1 | Contrast is currently **unmeasured**. A script over the three themes makes it a build failure. |
| `docs/design/SYSTEM.md` §5 — "Reduce motion is respected" | there is **no** `AccessibilityInfo` usage anywhere in `apps/mobile` and **no** reduce-motion token | The contract describes a feature that is not implemented. `motion.durations.instant` exists but nothing reads it. |
| `docs/design/SYSTEM.md` §6 — "RTL-ready layouts" | `spacing` in `tokens.ts:147-161` includes **20, 40, 64, 80, 96 px** — off the documented 4-pt grid `4 8 12 16 24 32 48`; and `components.badge.paddingY` references **`{spacing.0.5}`, a key that does not exist** (`tokens.ts:313`) | Two token bugs, independent of RTL, that the contrast/token script should catch. |
| `docs/SAAS_CHECKLIST.md` §C — "accessibility statement" | not written; the Spoke teardown shows Spoke itself has no declaration | Our declaration is a **differentiator we can evidence**, and it needs the four CI checks behind it. |
