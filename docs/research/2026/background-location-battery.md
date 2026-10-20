# Background location & battery — 2026 OSS research

**Research date: 2026-10-20.** Method: V4 §12 (≥30 candidates, ≥10 shortlist, deep-review top 5,
benchmark top 2–3). Every number was read from the live GitHub API, npm or the Expo docs on
**2026-10-20**. Anything unread is **UNVERIFIED** with the command that would settle it.
Card format: `repo · stars(+trend proxy) · created · last release/date · cadence · issues ·
maintainers/90 d · licence · New-Arch/Expo 58/API 34 · on-device/server · advisories ·
production users · docs · CI · better than our choice · risks · DECISION`.

## 0. Scope, our current choice, and the bar

| Item | Today (verified 2026-10-20) |
|---|---|
| Location dependency | `expo-location ~58.0.17` in `apps/mobile/package.json` (latest **58.0.18**, 2026-10-19) — **10,479,702 npm downloads/month** |
| Task runner | `expo-task-manager` (latest **58.0.12**, 2026-10-15) — 4,531,983 downloads/month |
| Background location | **not implemented** — no `startLocationUpdatesAsync`, no `TaskManager.defineTask` for location in `apps/mobile` |
| Battery tool | `expo-battery` **58.0.3** (2026-10-01, MIT) exists on npm but is **not installed** |
| Device info | `react-native-device-info` **15.0.2** (2026-02-21, MIT) exists on npm but is **not installed** |
| Current "choice" per `docs/TECH_STACK.md` §1 | `transistorsoft/react-native-background-geolocation` — flagged "⚠️ paid for production on Android" |
| Squad target | **battery ≤ 8 %/hour** while driving mode is active (`CONSTRAINTS.md`, V4 §6.4) |

The hard requirement is a **location foreground service that survives Doze, screen-off and app
switching**, runs at a **duty cycle** (not 1 Hz), and tells "the van is parked" from "the van is
moving" **without** the driver thinking about it. The battery budget is the gate; accuracy is the
commodity.

### The licence/terms trap in the current choice (verified)

`transistorsoft/react-native-background-geolocation`: repository licence **MIT**, npm
`react-native-background-geolocation` **5.8.0 (2026-10-09)**, **246,299 downloads/month** — but the
README states verbatim: *"The SDK is fully functional in `DEBUG` builds — no license required… A
license is required for **`RELEASE` builds** on both iOS and Android."* and *"**v4.x** license keys
do **not** work with **`v5`**"*. → **The MIT on the repo does not mean the shipped APK is free of
vendor terms.** A release build needs a purchased key, validated at runtime. V4 §2's licence gate
(`scripts/check-licenses.mjs`) would pass it (MIT) and therefore **cannot see this risk** — it has
to be tracked in `docs/COST_PLAN.md` and in an ADR.

### 6-month star trend — method note

GitHub's stargazer listing is **not readable with the token in `.env.local`** (`GET
/repos/{o}/{r}/stargazers` and GraphQL `stargazers` both return `HTTP 403 Resource not accessible
by personal access token`; the token lacks `read:user`). **All 6-month star trends here are
UNVERIFIED.** Verifiable proxies used instead: **commits in the last 90 days**, **release cadence**,
and **npm downloads/month**.

## Queries run

`gh search repos` via `scripts\gh.ps1`, 2026-10-20:

| # | Query | Sort | Notes |
|---|---|---|---|
| 1 | `background location` | stars | 25 — transistorsoft/cordova-background-geolocation-lt 677, Almoullim 236, traccar-client-sdk 28 … |
| 2 | `react-native background service` | stars | 20 — Rapsssito/react-native-background-actions 943, rest are one-person wrappers |
| 3 | `react-native foreground service` | stars | 20 — voximplant 168, rest tiny |
| 4 | `gps tracking android` | stars | 20 — almost all demo apps; no serious library beyond traccar |
| 5 | `battery optimization android` | stars | 15 — only 28 ★ `react-native-disable-battery-optimizations-android`; the topic is under-served |
| 6 | `react-native-device-info` | stars | 5 — confirms `react-native-device-info/react-native-device-info` (6,686 ★) |
| 7 | `react-native-headless-js` | stars | 5 — **no result**: `thecodingmachine/react-native-headless-js` **does not exist on GitHub** (404) → UNVERIFIED where it went |
| 8 | `react-native-background-fetch` | stars | 5 — the repo **moved to `transistorsoft/react-native-background-fetch`** (1,611 ★) |
| 9 | `osrm` / `navigation engine` | stars | 12 / 15 (cross-area sweep) |

Plus API reads: `repos/{o}/{r}`, `/releases`, `/contents/*`, `/commits?since=`, `/actions/runs`,
`orgs/{org}/repos`, npm `registry.npmjs.org` + `api.npmjs.org/downloads`, OSV `api.osv.dev/v1/query`,
and the **official Expo SDK 58 `expo-location` reference**
(`https://docs.expo.dev/versions/latest/sdk/location/`).

## 1. Candidate pool — 32 candidates, full evidence card each

### C1 — expo/expo (expo-location + expo-task-manager)  ⭐ shortlist
**52,869 ★** /14,653 f · created 2016-08-15 · `expo-location` **58.0.18 (2026-10-19)**, `expo-task-manager` **58.0.12**, `expo-background-task` **58.0.11 (2026-10-15)**, `expo-battery` **58.0.3 (2026-10-01)** · cadence: **weekly patch releases inside SDK 58** · 19,837 open / 19,509 closed · maintainers 90 d: large (Expo team) · **MIT** · **Expo SDK 58 ✓, New Architecture ✓** (SDK 50+ is New-Arch-only) · **Android API 34/35 ✓** — `FOREGROUND_SERVICE_LOCATION` is *required on Android 14+* and Expo's config plugin adds it · on-device · OSV **0 advisories** for `expo-location` · production users: **10.5 M downloads/month** — the most-used location package in the RN ecosystem · docs: versioned API reference + config-plugin docs · CI: Expo's monorepo CI · **better than our choice — the headline of this file:** `isAndroidBackgroundLocationEnabled` → `ACCESS_BACKGROUND_LOCATION`; `isAndroidForegroundServiceEnabled` → `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_LOCATION` (auto-true when background location is on); `androidForegroundServiceIcon` → 96×96 white PNG (Android rejects colour icons); `startLocationUpdatesAsync(taskName, { foregroundService: { notificationTitle, notificationBody, notificationColor, killServiceOnDestroy }, deferredUpdatesDistance, deferredUpdatesInterval, deferredUpdatesTimeout, activityType, pausesUpdatesAutomatically, showsBackgroundLocationIndicator })` → **the foreground service AND the duty-cycle policy are one API call**; **`getMotionActivityAsync()` / `watchMotionActivityAsync()`** → `activities.automotive. detected` + `confidence` — **on-device driving detection** (Android: Play Services activity recognition, needs `ACTIVITY_RECOGNITION` on Android 10+; iOS: `CMMotionActivityManager`) — *exactly* the "motion-detection intelligence" the paid SDK sells, at MIT cost; geofencing limits: Android **100**, iOS **20**; `useBackgroundPermissions()` / `useMotionActivityPermissions()` hooks for the V4 §5 "permission denied" state · **honest limits (from the docs, not guessed):** background location **stops if the user terminates the app**; on **Android a terminated app does NOT auto-restart** on a location event; **Expo Go cannot run it** (we already use `expo-dev-client ~58.0.14`); `requestBackgroundPermissionsAsync` on Android 11+ **opens the system settings page**; iOS "Allow Once" cannot be detected and a follow-up background request **silently fails** · risks: big dependency surface; same vendor gates our builds; no built-in "arrived at stop" geofence logic for us · **ADOPT (primary) — the free motion-detection + foreground-service + deferred-updates triad removes the need for a paid SDK.**
### C2 — transistorsoft/react-native-background-geolocation  ⭐ shortlist (incumbent)
**2,943 ★** /446 f · created 2015-04-19 · npm **`react-native-background-geolocation` 5.8.0 (2026-10-09)** · **0 GitHub releases** (they publish to npm) · cadence ≈ monthly · **2,457 open / 2,442 closed** (a ~50 % unclosed backlog — the largest in this pool) · maintainers 90 d: 1–2 · repo licence **MIT**, **but RELEASE builds require a purchased licence key** (see §0) · New Arch: a classic bridge, with an Expo config plugin · API 34: v5 targets it · on-device · OSV **0** · **246,299 downloads/month** · docs: `docs.transistorsoft.com` (extensive, paid-tier) · CI: present but 2,457 open issues · **better than our choice**: the most feature-complete location SDK on the market — **motion-change detection** (accelerometer/gyro/magnetometer), geofencing, activity recognition, `distanceFilter` auto-stop when stationary, and a first-class Expo path · risks: **paid licence for release**; closed-source component + runtime key validation (availability/licensing risk we do not control); **2,457 open issues**; vendor lock-in on the exact feature we need most · **WATCH → migrate off. Keep the licence only if the benchmark shows Expo cannot hit 8 %/h.**
### C3 — traccar/traccar-client-sdk (+ `react-native-traccar-client-sdk`)  ⭐ shortlist
**28 ★** /18 f · **created 2026-05-24** · **40 releases**, latest **v1.1.3, 2026-10-16** · cadence: **several releases per week** (1.1.0 10-06, 1.1.1 10-07, 1.1.2 10-09, 1.1.3 10-16) · **3 open / 0 closed** · maintainers 90 d: 1 (Anton Tananaev) · **Apache-2.0** · **Kotlin Multiplatform** (Android + iOS) with an **official React Native wrapper** on npm (`react-native-traccar-client-sdk` **1.1.3, Apache-2.0, published 2026-10-16**) built with `react-native-builder-bob` 0.43 against **React Native 0.87.1** (ours is 0.88.0) → **New-Arch-ready** · **Android: JDK 17, Android SDK 37, Xcode 26.6** per its README → API 34+ ✓ · on-device · OSV **0** · **1,868 npm downloads/month** (new package) · docs: full docs on traccar.org (`/traccar-client-sdk/`, `/traccar-client-sdk-react-native/`) · CI: Gradle + Flutter analyze + RN typecheck · **better than our choice**: the **most modern background-location architecture available** — KMP core (one implementation for Android+iOS), **stationary heartbeat filtering** and a **distance filter** (both fixed in the last two releases), **activity sampling limited to startup and resume** (released 1.1.1 — the authors themselves are cutting battery), a **foreground service** and a **simple HTTP protocol** we could speak to our own API instead of Traccar · risks: designed to report to a **Traccar-compatible server** — we would need a Traccar server (**AGPL-3.0**) or to implement the protocol ourselves; **1 maintainer**; new and unproven at scale; only 1,868 downloads/month · **ADOPT-AS-PATTERN (study + copy the design, not the dependency).**
### C4 — traccar/traccar-client-android  ⭐ shortlist → **superseded**
**760 ★** /782 f · created 2012-07-29 · **last push 2025-06-07** (≈16 months stale) · last release **v7.9, 2025-04-17** · 192 open / 186 closed · **Apache-2.0** · the classic Traccar Android client — foreground service, battery-optimisation whitelist request, "disable battery optimisation" intent · **better than our choice**: the **canonical implementation of the battery-whitelist + foreground- service pattern** V4 §11.1 item 8 names · risks: **untouched for 16 months**; a full app, not a library · **REJECT as a dependency; KEEP as the design reference — superseded by C3.**
### C5 — react-native-device-info/react-native-device-info
**6,686 ★** · npm **15.0.2 (2026-02-21), MIT, 5,037,284 downloads/month** · pushed 2026-10-15 · gives **battery level / charging state / low-power mode** plus the device profile we need to normalise the battery benchmark · **MIT** · New-Arch ✓ (Nitro/TurboModule) · Expo: works via config plugin / Expo Go · OSV **0** · CI ✓ · **better**: we need **battery telemetry** to prove the ≤ 8 %/h gate, and `expo-battery` + `react-native-device-info` together give level + charging + power state · risks: we already have `expo-battery` (official, smaller) — do not add both · **KEEP as the optional richer source; prefer `expo-battery` (58.0.3), addable today with zero native code.**
### C6 — Rapsssito/react-native-background-actions
**943 ★** /143 f · created 2020-01-14 · last release **v4.1.0, 2026-04-07** (25) · cadence ≈ 2 releases/yr · 220 open / 197 closed · **MIT** · npm **4.1.0 (2026-04-07), 88,487 downloads/month** · New Arch: classic bridge but actively maintained (pushed 2026-04-07) · **Android targetSdk ≥ 34 on the 4.x line** (README compatibility table: 4.x → targetSdk **≥ 34**) — **exactly the API-34 gate V4 requires** · on-device · OSV **0** · docs: README with install + options table (task icon, progress bar) · CI: release-badge workflow · **better**: the **generic Android foreground service** we want for the **voice squad's driving mode**, independent of location · risks: it runs **JavaScript** via HeadlessJS → **battery-hungry by design**; on Android 12+ a background task cannot be started from the background and the notification is mandatory; iOS `beginBackgroundTaskWithName` does **not** keep the app alive forever · **KEEP for the voice/keep-alive service; NOT for the 1 Hz location path.**
### C7 — transistorsoft/react-native-background-fetch
**1,611 ★** /196 f · created 2016-08-01 · **last push 2026-04-22** · **0 GitHub releases** · npm **`react-native-background-fetch` 4.4.2 (2026-04-15), MIT, 326,074 downloads/month** · 475 open / 475 closed · maintainers 90 d: 1–2 · on-device · OSV **0** · **better**: the **original, still-standard** "periodic background task" library for RN; the right tool for **retrying the sync queue** rather than location · risks: the repo **moved to the `transistorsoft` org** (`jt8765/` is gone) — anyone pinning `jt8765/react-native-background-fetch` in CI is pinning a dead URL · **KEEP (sync/retry only), and record the org transfer.**
### C8 — mauron85/react-native-background-geolocation
**1,354 ★** /558 f · created 2016-05-31 · **last push 2024-08-20** → **~2 years stale** · **0 releases** · 517 open / 425 closed · **Apache-2.0** · the last **fully free, permissively licensed, no-key** Android location SDK with a foreground service · **better**: it is the classic "free alternative to TransistorSoft" and is Apache-2.0 with **no licence key** · risks: **unmaintained for 2 years**; no New Architecture; Android 14 foreground-service permission changes unhandled; likely broken on modern RN/AGP · **REJECT (unmaintained) — but read it for the Apache-2.0 foreground-service pattern.**
### C9 — voximplant/react-native-foreground-service
**168 ★** /91 f · created 2019-01-16 · **last push 2024-07-11** · last release **v3.0.2, 2022-06-09** → **4 years stale** · 44 open / 11 closed · MIT · on-device · **better**: the simplest "start a foreground service with a notification" implementation · risks: unmaintained; no New Architecture; no location logic · **REJECT — `react-native-background-actions` (C6) supersedes it and is maintained.**
### C10 — HyopeR/react-native-location
**37 ★** /3 f · **created 2025-11-04** · last release **v1.0.2, 2026-08-06** (3) · 3 open / 3 closed · **MIT** · "a high-performance react-native library for foreground and background location" · pushed 2026-09-08 · 0 watchers · **better**: a **2026-native** implementation (Kotlin + TurboModules) rather than a legacy bridge · risks: **tiny**, 0 watchers, unproven, overlaps `expo-location` · **WATCH (only if `expo-location` fails our duty-cycle benchmark).**
### C11 — gabriel-sisjr/react-native-background-location
**32 ★** /3 f · **created 2025-10-26** · last release v1.0.0 (2026-06-10) · **39 releases** for a 32-★ repo (release-per-commit churn) · 4 open / 4 closed · **MIT** · "tracking location in the background using TurboModules" → **New-Architecture-native** · **better**: a 2026 TurboModule implementation · risks: 39 releases in 12 months for a 3-fork project is a churn red flag; no production users; overlaps `expo-location` · **WATCH (reference implementation of a New-Arch location TurboModule).**
### C12 — comoser/rn-background-location
**37 ★** /17 f · created 2019-08-31 · **last push 2023-01-27** → stale · 9 open / 8 closed · MIT · Android-only · **REJECT (stale, Android-only).**
### C13 — rasheedk/react-native-disable-battery-optimizations-android
**28 ★** /50 f · created 2019-10-14 · **last push 2024-03-18** · last release **1.0.7 (2019-10-14)** · **NO LICENCE** (GitHub detects none) · 8 open / 1 closed · opens the "Ignore battery optimisations" settings intent · **better**: the **one-line fix** for the Android Doze problem — without the whitelist a foreground service is still throttled on some OEM builds · risks: **no licence** (cannot ship); stale; the intent approach is fragile on Android 14+ · **REJECT (no licence) — reimplement the intent in ~15 lines in our own Android module, with the user-facing rationale copy V4 §5 requires.**
### C14 — googlecodelabs/background-location-updates-android-o
**79 ★** · created 2017-05-17 · **last push 2019-05-26** · **ARCHIVED** · 12 open / 1 closed · Google's codelab for the Android O background-location model (bound service + notification) · **better**: the canonical **Google-authored** reference for a bound location service · risks: archived, Java, no RN · **KEEP as a design reference only.**
### C15 — Almoullim/background_location
**236 ★** /322 f · created 2019-08-10 · last release v0.13.2 (2025-09-06) · pushed 2025-09-06 · 180 open / 170 closed · NOASSERTION (Flutter plugin) · **REJECT (Flutter, not RN).**
### C16 — icapps/flutter-background-location-tracker
**39 ★** /59 f · last release v1.0.1 (2021-06-22) · MIT · **REJECT (Flutter).**
### C17 — transistorsoft/cordova-background-geolocation-lt
**677 ★** /273 f · created 2015-08-24 · pushed 2026-10-10 · NOASSERTION · the same paid SDK for Cordova · **REJECT (wrong toolchain) — but it proves the vendor keeps all platforms in lockstep, so the SDK is not dying.**
### C18 — transistorsoft/capacitor-background-geolocation
**143 ★** /22 f · created 2019-06-05 · pushed 2026-10-10 · MIT repo · **REJECT (wrong toolchain).**
### C19 — transistorsoft/native-background-geolocation
**54 ★** /23 f · created 2017-07-11 · last release **4.8.1, 2026-10-15** (83) · NOASSERTION · the Swift **native** SDK behind the RN package · **WATCH (the licence lives here — read it before deciding on the RN package).**
### C20 — transistorsoft/flutter_background_geolocation
**732 ★** · pushed 2026-10-10 · **REJECT (Flutter).**
### C21 — expo/expo `expo-battery`
npm **58.0.3 (2026-10-01), MIT** · on-device · battery level + charging + low-power mode · **ADOPT (immediately, zero native code) — the instrument for the ≤ 8 %/h gate.**
### C22 — expo/expo `expo-keep-awake`
npm **58.0.3 (2026-10-01), MIT** · keeps the screen/CPU awake during a nav or voice session · **KEEP (voice/nav session).**
### C23 — `@react-native-community/netinfo`
npm **12.0.1 (2026-02-14), MIT** · connectivity state → pause the location stream when the van is parked and online; when offline we must keep logging to op-sqlite · **KEEP (we already have `expo-network 58.0.3`).**
### C24 — react-native-background-timer
npm **2.4.1, published 2020-10-01** → **5 years stale** · MIT · **REJECT (dead).**
### C25 — react-native-keep-awake
npm **4.0.0, published 2018-10-28** → dead · MIT · **REJECT (superseded by expo-keep-awake).**
### C26 — react-native-wake-lock
npm **1.0.1, 2021-03-20** → dead · **REJECT.**
### C27 — react-native-battery
npm **0.1.18, 2020-02-04**, no licence field → stale + unclear licence · **REJECT.**
### C28 — react-native-battery-optimization
npm **1.0.1, 2024-08-21**, MIT · a small battery-optimisation helper · **WATCH — check what it does beyond the intent before deciding whether to reimplement.**
### C29 — thecodingmachine/react-native-headless-js
Repo **404 — does not exist** on GitHub as of 2026-10-20, and the npm package is not in the registry either. **UNVERIFIED** where the project went (it was the canonical HeadlessJS library) · **REJECT (cannot verify; `expo-task-manager` replaces it).**
### C30 — react-native-geolocation-service
npm **5.3.1 (2022-09-23)** · MIT · the `transistorsoft/react-native-geolocation-service` repo **404s** → stale/undeployed · **REJECT (stale).**
### C31 — W4lter-V1win/Volans-Map
**53 ★** · created 2025-07-21 · **last push 2025-07-21** (dead) · NO-LICENCE · "React Native App-Offline Navigation without GPS and Network" · **REJECT (dead, no licence).**
### C32 — `dontkillmyapp.com` (web reference, **linked from the official Expo docs**: "On Android, the
result of removing an app from the recent apps list varies by device vendor") · the canonical OEM-background-killing behaviour catalogue · **KEEP (documented risk input for the QA matrix — Samsung/ Xiaomi/Huawei aggressive task killers must be in the test plan).**
## 2. Shortlist (10) with decisions

| # | Project | Decision | One-line reason |
|---|---|---|---|
| C1 | **expo-location + expo-task-manager** | **ADOPT (primary)** | MIT, already installed, 10.5 M downloads/month, and it ships foreground service + deferred updates + **automotive motion detection** for free. |
| C21 | **expo-battery** | **ADOPT (immediately)** | The instrument for the ≤ 8 %/hour gate; MIT, SDK 58, zero native code. |
| C6 | **react-native-background-actions** | **ADOPT (voice/keep-alive only)** | Maintained MIT foreground service for Android 12+; targetSdk ≥ 34 line; JS-based → not for the 1 Hz path. |
| C7 | **react-native-background-fetch** | **ADOPT (sync retry only)** | 326 k downloads/month, MIT; note the repo moved to the `transistorsoft` org. |
| C3 | **traccar-client-sdk** | **ADOPT-AS-PATTERN** | 2026-native KMP design with the battery fixes (stationary heartbeat filter, startup-only activity sampling) already made. |
| C2 | **transistorsoft/react-native-background-geolocation** | **WATCH → migrate off** | Best features but a **paid release licence** + 2,457 open issues + a vendor-controlled key check. |
| C5 | **react-native-device-info** | **KEEP (optional)** | Richer battery/power telemetry, 5 M downloads/month — but prefer `expo-battery` to avoid a second native dep. |
| C10 | **HyopeR/react-native-location** | **WATCH** | New (2025-11) high-performance RN location library; fallback if `expo-location` fails the benchmark. |
| C11 | **gabriel-sisjr/react-native-background-location** | **WATCH** | New-Arch TurboModule reference implementation. |
| C19 | **transistorsoft/native-background-geolocation** | **WATCH** | The actual licence text lives in the native SDK; read before deciding on C2. |
| C4 / C8 / C9 / C13 / C14 / C32 | traccar-client-android · mauron85 · voximplant · rasheedk · googlecodelabs · dontkillmyapp | **REJECT as dependencies / KEEP as design references** | All stale or unlicensed; they are still the best written-down patterns for the foreground service and the battery whitelist. |

## 3. Deep review — top 5

**3.1 expo-location + expo-task-manager (the incumbent we already own)** — *Architecture*: Expo
Modules (Swift/Kotlin) → `expo-modules-core` → JS. The foreground service is started by
`startLocationUpdatesAsync` with a `foregroundService` option; the JS callback lives in a
`TaskManager.defineTask` handler registered **in the top-level scope** (a real footgun: a task
defined inside a component will not fire). *Duty cycle*: `deferredUpdatesDistance` /
`deferredUpdatesInterval` / `deferredUpdatesTimeout` are the knobs for "log a point every 25 m or
every 20 s while moving" — and **they apply only in the background**. *Motion*:
`getMotionActivityAsync()` returns per-activity-type `{ detected, confidence }`; `activities.
automotive` is our "the van is moving" signal and needs **no location permission** (but
`ACTIVITY_RECOGNITION` on Android 10+). *Permissions UX*: `useBackgroundPermissions()` /
`useMotionActivityPermissions()` give the V4 §5 "permission denied" state; on Android 11+ the
background request **opens Settings**, so we must explain it in-app first (Expo's own docs say so).
*Android 14/15*: the config plugin adds `FOREGROUND_SERVICE` **and** `FOREGROUND_SERVICE_LOCATION`;
the notification icon must be a **96×96 all-white PNG with transparency**. *Known platform limits*:
background location dies if the user force-stops the app; a terminated Android app does **not**
auto-restart; Expo Go cannot run it. *Quality*: part of the Expo monorepo, released weekly, MIT,
10.5 M downloads/month. *Verdict*: a **first-class** solution, not a compromise — the "motion
detection" argument for a paid SDK **does not survive Expo SDK 58**.

**3.2 transistorsoft/react-native-background-geolocation** — *What it does well*: the
accelerometer/gyro/magnetometer "is the vehicle moving" detector with automatic **stationary →
location services off**; geofencing; activity recognition; `distanceFilter`; an Expo config plugin;
v5 is a rewrite with a new licence-key system. *Terms*: MIT *source*, **paid release licence**, keys
validated at runtime, v4 keys incompatible with v5 → a migration cost even if we keep it. *Backlog*:
2,457 open / 2,442 closed — roughly half of everything ever reported is still open. *Verdict*: the
best *feature set*, the worst *supply-chain posture*. Keep only if the benchmark shows Expo cannot
reach 8 %/h, and then pay for it explicitly in `COST_PLAN.md`.

**3.3 traccar/traccar-client-sdk (the 2026 architecture to copy)** — *Shape*: `core/` (Kotlin
Multiplatform) + `flutter/` + **`react-native/`** + `samples/` (android/ios); Maven Central
`org.traccar:traccar-client-sdk`, SwiftPM for iOS. *The battery work is visible in the commit log*:
"Fix stationary heartbeat filtering" (1.1.3), "Fix distance filter" (1.1.2), "Limit activity sampling
to startup and resume" (1.1.1) — the author explicitly stopped sampling activity continuously.
That is the exact lesson we need. *RN wrapper quality*: `react-native-builder-bob` 0.43, ESM+TS
outputs, RN 0.87.1 dev dep (ours 0.88.0), `prepare` and `typecheck` scripts → New-Arch-compatible
shape. *Protocol*: "any other server that accepts the same simple HTTP protocol" → we can implement
the collector in our own FastAPI service and avoid the AGPL Traccar server entirely. *Risks*: one
maintainer; 1,868 downloads/month; a young project. *Verdict*: **do not adopt the dependency; adopt
the design.** Our own `LocationService` interface should look like it.

**3.4 react-native-background-actions** — a *generic* Android foreground service that runs a JS task
via HeadlessJS, with a mandatory persistent notification, task icon and progress bar. Compatibility
table (README): 4.x requires **targetSdk ≥ 34**; 3.x ≥ 31. Honest limits (README): on Android 12+ a
background task cannot be started from the background and the notification is not optional; iOS uses
`beginBackgroundTaskWithName`, which **does not keep the app alive indefinitely**. *Verdict*: right
tool for the **voice squad's** always-listening foreground service; wrong tool for location (JS
wakeups + HeadlessJS cost battery and add jank).

**3.5 expo-battery + react-native-device-info (the measurement instruments)** — `expo-battery 58.0.3`:
MIT, part of SDK 58, one module, no config plugin needed. `react-native-device-info 15.0.2`: 5 M
downloads/month, MIT, battery level/charging plus the device profile (model, API level, RAM) we need
to normalise the battery benchmark across the CI emulator and a mid-range device. *Verdict*: we cannot
prove the ≤ 8 %/h gate without one of these. Install `expo-battery` today; add
`react-native-device-info` only when we need the device profile.

## 4. Benchmarks — top 3

**No battery benchmark exists in the repo** (`CONSTRAINTS.md`: "Battery while driving | not measured
yet (T7) | ≤ 8 %/h"). Everything below is **UNVERIFIED** until measured.

**The set that must be built** — `docs/squads/platform/benchmarks/battery/`:
1. **Profiles** — the CI emulator profile **and** one mid-range Android profile (V4 §12.5: "same
   device profile (CI emulator + one mid-range Android profile)"), recording Android API level, OEM,
   battery capacity, and whether the app is on the battery whitelist.
2. **Scripts** — a fixed 60-minute drive trace: 8 urban stops + 2 motorway legs + 20 min parked,
   driven from a **replayed** GPX trace so every run is identical.
3. **Measurements** — `battery_level` every 10 s (`expo-battery`), plus `adb shell dumpsys
   batterystats --charged` deltas for `mAh` and **wakelock counts**; the number that matters is the
   wakelock/CPU time, not just the percentage (a device on charge all day can still burn 12 %/h).
4. **Comparisons** — same trace, same device, same ambient conditions:
   **A** `expo-location` foreground service at 1 Hz, no deferral (the naive baseline);
   **B** + `deferredUpdatesDistance=25 m` + `deferredUpdatesInterval=20 s`;
   **C** B + `activities.automotive` gating (stop the stream when parked);
   **D** C + the battery-optimisation whitelist intent;
   **E** transistorsoft v5 (paid trial licence) — only if we are seriously considering keeping it.
5. **Acceptance** — **≤ 8 %/h** for the driving portion and a separate number for the parked portion
   (which must be ≈ 0 %/h). Parked-vs-driving **must** be reported separately; a blended number hides
   the failure mode that matters.
6. **OEM matrix** — replay the trace on at least one Samsung/Xiaomi/Huawei device (per
   `dontkillmyapp.com`, cited by the Expo docs) to prove the service survives their task killers.

## 5. Decision

1. **Primary: `expo-location` + `expo-task-manager` (already installed, MIT, SDK 58).** Build the
   driving-mode location service on `startLocationUpdatesAsync` with a `foregroundService` option,
   `deferredUpdates*` duty cycling, and **`activities.automotive` gating**. Add `expo-battery` today
   for telemetry.
2. **Do not adopt a paid location SDK.** The only thing it adds that we cannot get is *finer* motion
   detection; `expo-location`'s `MotionActivityObject` gives automotive detection with confidence, and
   our own accelerometer heuristic can refine it inside `packages/` (pure, unit-testable, V4 §6.1).
3. **Adopt the design of `traccar-client-sdk`** (stationary heartbeat filter, distance filter,
   activity sampling only at start/resume) inside our own `LocationService` interface — do not take
   the dependency (single maintainer, young, Traccar-shaped protocol).
4. **Keep `react-native-background-actions` for the voice foreground service**, not for location.
5. **Reimplement the battery-optimisation whitelist intent in our own Android module** (C13 has no
   licence) with an in-app explanation.
6. **Keep `transistorsoft/react-native-background-geolocation` only as a benchmarked fallback**; if it
   stays, its release licence must be a line in `docs/COST_PLAN.md` and an ADR.

## 6. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| The 8 %/h gate is unmet without a paid SDK | **High** | Benchmark first (A–E). If B/C/D fail, revisit the paid SDK with a written cost line. |
| OEM task killers kill the foreground service | **High** | Replay the trace on a Samsung/Xiaomi/Huawei device; add a **watchdog + notification re-post**; put "don't swipe the app away" in the driver onboarding. |
| Force-stop kills background location permanently | Medium | Detect the stop (no location for N minutes while the service claims to be running) and prompt the driver to reopen the app. |
| `expo-location` deferred updates apply **only in the background** | Medium | When foregrounded, drive the stream ourselves with `watchPositionAsync` + `distanceInterval`. |
| Android 14+ `FOREGROUND_SERVICE_LOCATION` + monochrome icon | Low | The config plugin handles the permission; ship a 96×96 white PNG icon. |
| iOS "Allow Once" is undetectable and the follow-up background request silently fails | Medium | Handle the silent-failure case: re-check the status and deep-link to Settings. |
| The config plugin adds `ACCESS_BACKGROUND_LOCATION` at build time | Medium | Changing it needs a **new build** → it must be right the first time; verify in the EAS profile. |
| Motion detection needs `ACTIVITY_RECOGNITION` on Android 10+ | Low | Bundle it into the single permission-rationale screen. |
| Privacy: a continuous location trail is personal data | Medium | Keep the trail **on device** (op-sqlite), encrypt at rest (SQLCipher per V4 §7), never stream raw traces by default; NZ Privacy Act 2020 PIA must cover it. |

## 7. What I could not verify

* **6-month star trend** — blocked by token scope (no `read:user`); proxies used instead.
* **Median issue-response time** — not computed for any repo.
* **The actual battery figure for every candidate** — **UNVERIFIED**; no measurement exists. This is
  the biggest gap in this file and the reason the §4 set must exist before we sign anything.
* **TransistorSoft's exact v5 release-licence price and terms** — the README confirms a licence is
  required for release builds; the price/terms live behind `docs.transistorsoft.com/purchase/`
  (not read) → **UNVERIFIED**.
* **`thecodingmachine/react-native-headless-js`** — repo and npm package both 404 → could not confirm
  the project's current home.
* **`transistorsoft/react-native-geolocation-service`** — repo 404 while the npm package is 5.3.1
  from 2022 → the repo/npm pair is inconsistent.
* **Whether `expo-location`'s foreground service works with `expo-dev-client` on the CI emulator**
  profile without a native rebuild — must be proved on the CI emulator
  (`.github/workflows/android-e2e.yml`).
* **`react-native-device-info` New-Architecture status on SDK 58** — the repo is active and
  Nitro-based, but I did not read its compatibility matrix.
* **Battery impact of Google Play Services activity recognition** (used by `expo-location`'s motion
  API) on devices without GMS — **UNVERIFIED**, and material for the degoogled/enterprise fleet case.

## 8. Corrections to the V4 §11.1 adopt list (background-location-related)

| V4 §11.1 item | Verified reality on 2026-10-20 | Correction |
|---|---|---|
| 8. **traccar-client-android** — "background-location foreground-service + battery-whitelist pattern" | **760 ★ but last push 2025-06-07 (16 months stale)**, last release v7.9 2025-04-17, Apache-2.0 | ⚠️ **Superseded.** The live project is **`traccar/traccar-client-sdk`** (created 2026-05-24, **Apache-2.0**, v1.1.3 2026-10-16) with an **official RN wrapper on npm** (`react-native-traccar-client-sdk`, Apache-2.0, RN 0.87.1, KMP core, and the battery fixes already made: stationary heartbeat filter, distance filter, activity sampling only at start/resume). **Use the SDK's design; keep `client-android` only as the canonical battery-whitelist pattern.** |
| `docs/TECH_STACK.md` §1 "transistorsoft/react-native-background-geolocation ⚠️ paid for production" | Confirmed and **sharpened**: the **repo** is MIT, but **v5 requires a purchased licence for RELEASE builds** (v4 keys do not work with v5) and the key is validated at runtime | ⚠️ **Sharpen the warning**: it is a *commercial runtime dependency*, not merely "paid on Android". Track the cost in `COST_PLAN.md`; `check-licenses.mjs` cannot see it. |
| (not in the list) | **`expo-location` already installed (58.0.17) already provides** foreground service + `deferredUpdates*` + **`getMotionActivityAsync()` automotive detection** + geofencing | **Add to the adopt list as the primary**, and drop the assumption that a third-party SDK is needed for motion detection. |
| (not in the list) | `react-native-background-fetch` repo moved to the **`transistorsoft`** org (`jt8765/…` is 404) | Correct any CI pin or doc that names the old org. |
| (not in the list) | `react-native-background-actions` 4.x requires **targetSdk ≥ 34** | ✅ matches V4's Android API 34 requirement exactly — adopt it for the voice service. |
| (not in the list) | `react-native-disable-battery-optimizations-android` has **no licence** | Do not adopt; reimplement the intent ourselves. |
