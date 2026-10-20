# Notifications & SMS — 2026 OSS + vendor research (V4 §3, redone at full depth)

**Research date: 2026-10-21.** Method: V4 §12 (≥30 candidates with full evidence cards, ≥10 shortlisted, top 5
deep-reviewed, benchmarks only where an eval set exists) + §12.6 anti-bias (newer/smaller challengers).
Every number was read from the live GitHub API, the npm registry, the npm downloads API or the vendor's own page
on **2026-10-21** unless the card says **UNVERIFIED**. Nothing is estimated, nothing is carried over unread.

**Card fields:** repo/vendor URL · stars + maintenance proxy · created · last release + date · release cadence ·
open issues · licence (code + terms) · **Expo SDK 58 / RN New Architecture / Android API level** · size · on-device
vs server · advisories + supply chain · pricing · what it does better than our current choice · risks ·
**DECISION**.

## 0. Scope, our current choice, the bar

| Item | Verified 2026-10-21 |
|---|---|
| Push notifications in the app | **none** — `apps/mobile/package.json` has **no `expo-notifications`**; `app.json` `android.permissions` has **no `POST_NOTIFICATIONS`**; `ios.infoPlist` has **no** notification usage strings; `expo-notifications` is not in the dependency list |
| SMS to customers | **none** — `docs/COST_PLAN.md` lists the SMS provider as **[OPEN]**; `docs/FOUNDER_TODO.md` line 46 "SMS Provider (NZ) | **[OPEN]**"; `apps/api` has no SMS dependency; `docs/FINAL_PROMPT.md` §"maszoud SMS" keys `SMS_PROVIDER`, `SMS_API_KEY/SECRET`, `SMS_FROM_NUMBER` are placeholders |
| Our choice (the one the product spec implies) | **`expo-notifications`** for local + remote, **FCM/APNs** as the transport, **Expo Push Service** for the first release, **one SMS adapter behind an interface** (V4 §6.1: "adapters behind interfaces for every external service (maps, STT, LLM, **SMS**, payments)") |
| Squad target that owns this area | **T7.10** customer SMS/ETAs (optional, off by default — D5) · **T7.1** offline-first sync · **T7.15** NZ Privacy Act PIA + retention |
| Locked decisions that constrain us | Expo SDK 58, RN New Architecture only, offline-first, **no PII leaving the device without consent**, plain NZ English, no emoji. `docs/DECISIONS.md` **D5**: the customer tracking link (SMS or any channel) is **optional and off by default**; **D2**: every feature must be reachable by voice |
| Hard bar (V4 §6.4/§10.1) | battery ≤ 8 %/h while driving mode is active · cold start ≤ 2 s · every driving-day action works with **no network** and syncs later |

### Two things must not be conflated

1. **Notification transport (push)** — how *our driver* hears about something. Delivery to the device is not
   guaranteed by anyone: Expo's own FAQ says the service is "best effort", may deliver "more than once or not at
   all", and a **push receipt only means Google/Apple accepted the message**, not that the phone showed it.
2. **Customer messaging (SMS)** — how a *recipient* hears about a parcel exception. It is a paid, metered,
   legally constrained channel with its own provider, its own contract and its own DLR webhook.

A courier driving in Christchurch with the phone in a mount needs the first to be **silent and reliable**, and the
second to be **rare, transactional and provably compliant**.

### 6-month star trend — method note (proxy, as V4 §12.3 permits)

The star *timeline* is not readable with the token in `.env.local` (`GET /repos/{o}/{r}/stargazers` is 403 with
this token; GraphQL `stargazerCount` returns only the cumulative total). **Every "stars gained in 6 months"
figure is therefore UNVERIFIED.** The proxy used throughout is the one §12.3 prescribes: **releases in the last
6 months · commits in the last 90 days · distinct human maintainers in 90 days · npm downloads per week**.

## Queries run

GitHub search + API reads through `scripts\gh.ps1` (token read at runtime from `.env.local`, never printed).
All queries run **2026-10-21**.

| # | Query (literal) | Results returned | What it produced |
|---|---|---|---|
| 1 | `search/repositories?q=react+native+push+notifications&sort=stars` | 10 (first page) | `zo0r/react-native-push-notification` 6 789★, `OneSignal/react-native-onesignal` 1 591★, `react-native-push-notification/ios` 834★, `instamobile/react-native-firebase` 439★ |
| 2 | `q=expo+notifications` | 10 | `seniv/react-native-notifier` 1 437★, `expo/expo-server-sdk-node` 1 036★, `rit3zh/expo-dynamic-notifications` 277★ |
| 3 | `q=react+native+local+notifications` | 10 | `evollu/react-native-fcm` 1 728★, `emeKalites/react-native-alarm-notification` 225★ — both stale |
| 4 | `q=sms+api+node+client` | 10 | `Vonage/vonage-node-sdk` 399★, `OneSignal/onesignal-node-api` 52★ — **no NZ provider SDK surfaced** |
| 5 | `q=twilio` | 10 | `twilio/twilio-python` 2 085★; the Node SDK is `twilio/twilio-node` (read directly by API) |
| 6 | `q=novu` | 10 | `novuhq/novu` 40 175★ — the only serious OSS notification *server* |
| 7 | `q=notification+service+self+hosted` | 10 | `productdevbook/nitroping-push` 338★, `TooonyChen/AuthInbox` 183★ — no courier-grade OSS |
| 8 | `q=notification+delivery+service+open+source` | **3** | **dead query** — the OSS notification-server market is empty at the top end |
| 9 | `q=sms+delivery+report+webhook` | **3** | **dead query** — DLR webhook plumbing is vendor SDK territory, not OSS |
| 10 | `q=telnyx+api+client` | 8 | Telnyx's org moved: `team-telnyx/telnyx-ruby` 31★; the Node SDK is `team-telnyx/telnyx-node` (read by API) |
| 11 | `q=messagebird+bird+sdk` | **2** | **dead query** — MessageBird has been rebranded (see card V4) |
| 12 | `q=notifications+created:>2026-01-01+stars:>5` | 10 | **dead query** — returns unrelated repos; GitHub's `created:` filter does not work with these terms |
| 13 | `q=push+notification+created:>2025-06-01` | 10 | `devkitshq/notifkit` 115★ (2026-07-16), `better-notify/better-notify` 317★, `nitroping-push` 338★ — the 2026 newcomers |
| 14 | `q=sms+created:>2025-01-01+stars:>10` | 10 | `zackb/tether` 1 475★ (created 2026-04-12), `TryCaspian/caspian-sdk` 973★ (**AGPL-3.0**) |
| 15 | `q=react+native+background+task` | 10 | `jamesisaac/react-native-background-task` 1 115★, `Rapsssito/react-native-background-actions` 943★, `mahdidavoodi7/react-native-continued-task` 233★ (2026-09-01) |
| 16 | `q=firebase+cloud+messaging+react+native` | 10 | `evollu/react-native-fcm` 1 728★ (stale) — the real one is `invertase/react-native-firebase` |
| 17 | `q=web+push+library` | 10 | `web-push-libs/web-push` 3 562★ (the web half of the dashboard story) |
| 18 | `q=onesignal+react+native` | 10 | confirms the OneSignal repo rename: `OneSignal/OneSignal-React-Native` → **`OneSignal/react-native-onesignal`** |
| 19 | `q=react+native+permissions+camera+notification` | 4 | dead query; `zoontek/react-native-permissions` 4 374★ found by reading the npm `repository` field instead |

Plus API reads: `repos/{o}/{r}` · `/releases` · `/commits?since=2026-07-23` · `/commits?path=` · `/issues` ·
`/pulls` · `/contents` · `search/repositories` · `search/issues` (rate-limited, 30/min) · **npm registry
`/{package}`** (version, licence, publish date) · **npm downloads API `point/last-week/{package}`** (week
2026-10-12 → 2026-10-18).

Web sources fetched **2026-10-21**: `expo.dev/changelog/sdk-58` · `docs.expo.dev/versions/v58.0.0/sdk/notifications/`
· `docs.expo.dev/push-notifications/faq` (modificationDate **2026-09-03**) · `github.com/expo/expo/blob/main/packages/expo-notifications/CHANGELOG.md`
· `onesignal.com/pricing/` (dateModified **2026-09-28**) · `raw.githubusercontent.com/OneSignal/react-native-onesignal/main/LICENSE`
· `sinch.com/engage/pricing/` · `telnyx.com/pricing` · `tcf.org.nz` · `legislation.govt.nz/act/public/2007/0007/latest/whole.html`
· `consumerprotection.govt.nz/general-help/consumer-laws/online-safety-laws-and-rules` · `dia.govt.nz/spam-frequently-asked-questions`
· `privacy.org.nz/privacy-principles/3/` · `help.pushwoosh.com` (OEM list) · `documentation.onesignal.com` (OEM targeting)
· `onesignal.com/blog/manufacturers-interfere-with-reliable-notifications/` · `support.google.com/android/answer/9079661`
· `androidauthority.com/android-16-notification-cooldown-3501276/`.

## 1. Candidate pool — 56 cards (38 code cards C1–C38 + 18 vendor, platform and legal cards V1–V18)

### 1.1 Push SDKs and transports (mobile side)

**C1 — `expo/expo` → `packages/expo-notifications`** ⭐ https://github.com/expo/expo — **52 874 ★** /14 665 f ·
created **2016-08-15** · pushed **2026-10-20** · **MIT** · GitHub releases: `expo-template-tabs@58.0.25` @ 2026-10-20
(**40 releases in 6 m**; the monorepo tags one release per package) · **npm `expo-notifications` 58.1.5 published
2026-10-16** · **3 916 476 downloads/week** (2026-10-12→18) · **2 162 commits / 90 d, 262 distinct commit
authors** (paginated over the default branch) · open issues incl. PRs 929 · **Expo SDK 58: yes — it *is* SDK 58;
RN New Architecture: yes (the package is a Expo Module, i.e. the New Architecture module system)** · size 3.8 GB
(monorepo) · on-device + server · OSV: **not queried for the monorepo** (supplies chain: official Expo, pinned
by `expo install`) · production: every Expo app with push · docs: `docs.expo.dev/versions/v58.0.0/sdk/notifications/`
· CI: monorepo-wide · **better than our current choice (nothing)**: it is the only channel that needs **no
third-party SDK at all** — it covers local notifications, scheduled triggers, channels, badges, foreground
handling and the FCM/APNs token, and in SDK 58 it **shows foreground notifications by default and no longer drops
a notification when the handler is slow** (CHANGELOG 58.0.0, #49072) · risks: it is a monorepo (slow CI),
the `expo-notifications` package has **zero** dependencies (good), and the **Expo push service itself is a third
party** — but `getDevicePushTokenAsync()` gives us the native FCM/APNs token so we can leave Expo's transport
without touching the app code · **DECISION: ADOPT (the notification engine, local + remote).**

**C2 — `expo/expo-server-sdk-node`** https://github.com/expo/expo-server-sdk-node — **1 036 ★** /115 f · created
**2016-09-21** · pushed **2026-09-29** · **MIT** · last release **v7.2.0 @ 2026-08-24** (28 releases, **3 in 6 m**) ·
**15 commits/90 d, 4 humans** · open issues incl. PRs 0 · Expo SDK 58: server-side, SDK-agnostic · on-device: no
(server) · production: Expo push tickets/receipts for thousands of apps · docs: README + Expo push docs ·
**better than ours**: it is the **only** client that implements the Expo push **ticket → receipt** protocol
correctly, with **automatic throttling and retry** — exactly the "send 600/second" contract, handled for us ·
risks: it is a Node package and our API is **Python** (`apps/api`, FastAPI, `uv`) → we would call the HTTP API
directly rather than import it · **DECISION: ADOPT (as the HTTP contract to mirror in `apps/api`, not as a
dependency).**

**C3 — `OneSignal/react-native-onesignal`** https://github.com/OneSignal/react-native-onesignal — **1 591 ★**
/379 f · created **2016-02-19** · pushed **2026-10-17** · **licence: "Modified MIT License"** (raw LICENSE read
2026-10-21: MIT text **plus** *"All copies or substantial portions of the Software may only be used in connection
with services provided by OneSignal"*) — GitHub's licensee reports **NOASSERTION**, npm metadata says **MIT**,
the file itself says **Modified MIT with a use restriction** · last release **5.5.15 @ 2026-10-14** (**20 releases
in 6 m**, 100 total) · npm `react-native-onesignal` **5.5.15 @ 2026-10-13**, **100 956 downloads/week** · **40
commits/90 d, 7 humans** · 18 open issues · Expo SDK 58: the package is a plain RN module; **New Architecture:
unverified** (v5 is a Nitro-free classic bridge; the SDK ships an `expo` sample app) · **better than ours**:
push + in-app + email + SMS in one SDK, a **dashboard for per-device delivery state**, and the best-documented
**OEM-delivery coaching** we have read (it tells you exactly how to make a Samsung/Xiaomi/Huawei device deliver) ·
risks: **the licence is not plain MIT** — under our own `CONSTRAINTS.md` licence gate a use restriction is a
licence defect we must record in `docs/LICENSES.md`; and if we later drop OneSignal for direct FCM, the SDK
licence forbids us from keeping it in the app · **DECISION: WATCH (vendor platform = good; SDK licence = a
blocker unless OneSignal is the committed provider).**

**C4 — `OneSignal/OneSignal-Android-SDK`** https://github.com/OneSignal/OneSignal-Android-SDK — **631 ★** /378 f ·
created **2015-04-07** · pushed **2026-10-19** · licence **NOASSERTION** (not read) · last release **5.10.2 @
2026-09-19** (**15 releases in 6 m**) · **63 commits/90 d, 5 humans** · 32 open issues · New Architecture: the
Android SDK is Kotlin and ships an Expo module · **better than ours**: the **FCM v1 / HTTP-v1** integration and
the OEM battery-whitelist playbook live here · risks: unverified licence; it is the same vendor as C3 ·
**DECISION: WATCH (reference implementation for our FCM setup).**

**C5 — `OneSignal/OneSignal-iOS-SDK`** https://github.com/OneSignal/OneSignal-iOS-SDK — **538 ★** /266 f · created
**2015-04-07** · pushed **2026-10-19** · licence **NOASSERTION** · last release **5.8.0 @ 2026-10-09** (**13
releases in 6 m**) · **48 commits/90 d, 5 humans** · 14 open issues · repo 3.2 GB (large history) ·
**better than ours**: APNs device-token handling and the iOS 27 UIScene lifecycle fixes · risks: same vendor,
same licence question · **DECISION: WATCH.**

**C6 — `OneSignal/onesignal-node-api`** https://github.com/OneSignal/onesignal-node-api — **52 ★** /22 f · created
**2021-08-25** · pushed **2026-10-15** · licence **NOASSERTION** · last release **v5.20.0 @ 2026-10-16** (**17
releases in 6 m**) · **34 commits/90 d, 4 humans** · **server** side (the send API) · **better than ours**: it is
the **only** one of the OneSignal SDKs that is usable from `apps/api` — but our API is Python, so it would be an
HTTP call, not a dependency · risks: none beyond the vendor · **DECISION: KEEP (documentation of the send API
shape only).**

**C7 — `invertase/react-native-notifee`** https://github.com/invertase/react-native-notifee — **464 ★** /25 f ·
created **2019-12-05** · **ARCHIVED** · last push **2021-09-24** · last GitHub release **v3.0.0 @ 2021-09-22** (40
releases, **0 in 6 m**) · **0 commits/90 d** · licence: repo **NOASSERTION**, npm `@notifee/react-native` says
**Apache-2.0**, latest **9.1.8 published 2024-12-20** · **202 115 downloads/week** (still high because it is
inside thousands of apps) · **better than ours**: it was the reference implementation of **local notifications
with actions, channels and triggers** · risks: **the project is archived** — no New Architecture support, no
security patches, and the repository stopped at the TurboModule era · **DECISION: REJECT (dead upstream; it is
also the trap that the "notifee is the standard" advice still points at).**

**C8 — `invertase/react-native-firebase` (packages/messaging)** https://github.com/invertase/react-native-firebase
— **12 320 ★** /2 331 f · created **2017-02-01** · pushed **2026-10-20** · GitHub licence **NOASSERTION**, npm
`@react-native-firebase/messaging` **27.0.0 @ 2026-10-19 Apache-2.0** · GitHub release **v27.0.0 @ 2026-10-20**
(100 releases in 6 m) · **100+ commits/90 d, 8 humans** · **519 956 downloads/week** (messaging) · open issues
incl. PRs 33 · Expo SDK 58: compatible as an RN module; **New Architecture: yes (v22+ is TurboModule/JSI)** ·
**better than ours**: it is the **most complete FCM surface in React Native** — token rotation, `setBackgroundMessageHandler`
for silent pushes, notification channels, topic messaging, and the v27 cycle is actively porting the messaging
serializer to Kotlin and the iOS side to the UIScene lifecycle · risks: it drags the whole Firebase SDK (Analytics,
Crashlytics) into the APK (budget ≤ 80 MB) and it is **Apache-2.0 but adds Google Play Services terms** (a
supplier that trains on nothing but does see data) · **DECISION: WATCH (the fallback if `expo-notifications`
cannot give us FCM directly, which it can).**

**C9 — `firebase/firebase-js-sdk`** https://github.com/firebase/firebase-js-sdk — **5 154 ★** /1 038 f · created
**2017-04-24** · pushed **2026-10-20** · licence **NOASSERTION** per the API (**UNVERIFIED** — the LICENSE file
was not read) · last release **firebase@13.0.0 @ 2026-10-08** (**9 releases in 6 m**) · **100+ commits/90 d, 19
humans** · 743 open issues incl. PRs · server/web SDK · **better than ours**: the reference for the **FCM HTTP v1**
request shape and the **admin SDK**'s multicast fan-out, which is what a 200-stop re-notification needs ·
risks: it is a JavaScript SDK and our API is Python · **DECISION: KEEP (documentation only — we send FCM from
`apps/api` in Python).**

**C10 — `firebase/firebase-admin-node`** https://github.com/firebase/firebase-admin-node — **1 748 ★** /423 f ·
created **2017-03-14** · pushed **2026-10-20** · **Apache-2.0** · last release **v14.5.0 @ 2026-09-24** (**8
releases in 6 m**) · **46 commits/90 d, 5 humans** · 235 open issues incl. PRs · **better than ours**: the
**multicast** API (up to 500 tokens per call) is exactly the shape of "the dispatcher changed 30 stops, tell the
30 drivers" · risks: Node; we need Python → use the **FCM HTTP v1** REST API directly ·
**DECISION: KEEP (contract reference).**

**C11 — `firebase/firebase-android-sdk`** https://github.com/firebase/firebase-android-sdk — **2 571 ★** /720 f ·
created **2018-08-31** · pushed **2026-10-20** · **Apache-2.0** · **no GitHub releases** (release from Gradle) ·
**100+ commits/90 d, 16 humans** · 401 open issues incl. PRs · **better than ours**: it is where the **FCM SDK's
own notification-permission and OEM behaviour** is implemented and where the `firebase-messaging` dependency
version is pinned · risks: heavy dependency tree; Google Play Services · **DECISION: KEEP (reference).**

**C12 — `firebase/firebase-ios-sdk`** https://github.com/firebase/firebase-ios-sdk — **6 974 ★** /1 823 f ·
created **2017-04-22** · pushed **2026-10-20** · **Apache-2.0** · last release **13.0.1 @ 2026-10-08** (**11
releases in 6 m**) · **100+ commits/90 d, 13 humans** · 498 open issues incl. PRs · **better than ours**: the
APNs device-token lifecycle and the iOS 27 scene migration · risks: same as C11 · **DECISION: KEEP (reference).**

**C13 — `wix/react-native-notifications`** https://github.com/wix/react-native-notifications — **3 341 ★** /752 f ·
created **2016-04-06** · pushed **2026-10-05** · **MIT** · **last release 5.1.0 @ 2023-09-14** (28 releases,
**0 in 6 m**) · **0 commits/90 d** on the default branch (the 2026-10-05 push is not on `master`) · 7 open issues ·
New Architecture: **unverified**; the last release predates the New Architecture era · **better than ours**: it
is the most complete **local-notification** engine ever written (repeating triggers, iOS categories, Android
channels, localisation, and the "notification centre" pattern) and it is the reference for a **local notification
that is scheduled while the phone is offline** · risks: **3 years without a release** — the code is MIT and
readable, so it is a *reference*, not a dependency · **DECISION: WATCH (read it, do not depend on it).**

**C14 — `zo0r/react-native-push-notification`** https://github.com/zo0r/react-native-push-notification —
**6 789 ★** /1 991 f · created **2015-12-14** · **ARCHIVED** · last push **2024-01-30** · last release **8.1.1 @
2021-10-02** (35 releases, 0 in 6 m) · npm `react-native-push-notification` **8.1.1 @ 2021-10-01** ·
**27 510 downloads/week** · **MIT** · 100 open issues · **better than ours**: none today · risks: archived,
no New Architecture, no security patches; the download count shows it is still in production somewhere ·
**DECISION: REJECT.**

**C15 — `react-native-community/push-notification-ios`** https://github.com/react-native-community/push-notification-ios
— **834 ★** /293 f · created **2019-02-08** · last push **2024-09-11** · npm
`@react-native-community/push-notification-ios` **1.12.0 @ 2025-12-16 MIT** · **66 294 downloads/week** · 181 open
issues incl. PRs · **better than ours**: it is the community-maintained iOS-only push library inside the RN
ecosystem, used as a fallback by many apps · risks: iOS only, no Android channel, old architecture ·
**DECISION: REJECT (expo-notifications covers iOS with one code path).**

**C16 — `evollu/react-native-fcm`** https://github.com/evollu/react-native-fcm — **1 728 ★** /659 f · created
**2016-05-29** · last push **2022-12-06** · **MIT** · last release **v16.2.4 @ 2018-11-04** (98 releases, 0 in 6 m) ·
**0 commits/90 d** · 100 open issues · **better than ours**: none · risks: stale, no New Arch · **DECISION: REJECT.**

**C17 — `instamobile/react-native-firebase`** https://github.com/instamobile/react-native-firebase — **439 ★** /
130 f · created **2020-05-18** · last push **2024-11-06** · **MIT** · no releases · 16 open issues · the abandoned
fork of RNFirebase · **DECISION: REJECT (use `invertase/react-native-firebase`).**

**C18 — `emeKalites/react-native-alarm-notification`** https://github.com/emeKalites/react-native-alarm-notification
— **225 ★** /97 f · created **2017-06-21** · last push **2024-09-11** · **MIT** · last release **v1.7.1 @ 2020-10-05**
· 19 open issues · **better than ours**: it is the reference for **exact alarms** (`SCHEDULE_EXACT_ALARM`) — the
Android 12+ permission that a courier app needs if it wants a *guaranteed* 07:00 alarm-class prompt rather than a
deferrable one · risks: stale · **DECISION: WATCH (the exact-alarm question is real; `expo-notifications` 58.1.1
already exposes `getExactAlarmPermissionsAsync` — #50919).**

**C19 — `seniv/react-native-notifier`** https://github.com/seniv/react-native-notifier — **1 437 ★** /71 f ·
created **2020-03-22** · last push **2025-03-17** · **MIT** · last release **v3.0.0-rc.5 @ 2025-01-22** (27
releases, 0 in 6 m) · 19 open issues · **better than ours**: a **zero-native-module** notification library that
falls back to a headless JS task when the OS will not start the app — the honest version of "works when the OEM
kills the app" · risks: RC, no release in 19 months · **DECISION: WATCH.**

**C20 — `zoontek/react-native-permissions`** https://github.com/zoontek/react-native-permissions — **4 374 ★**
/848 f · created **2016-03-24** · pushed **2026-10-16** · **MIT** · last release **5.6.3 @ 2026-10-17** (60
releases, **6 in 6 m**) · **10 commits/90 d, 2 humans** · npm `react-native-permissions` **5.6.3 @ 2026-10-16** ·
**377 377 downloads/week** · Expo SDK 58: yes, it ships an Expo config plugin · New Architecture: yes (TurboModule
since v4) · **better than ours**: the **only** mature library that models the **Android 13+ `POST_NOTIFICATIONS`
runtime permission**, the iOS notification authorisation flow, and the "**open settings**" dead-end — and it
exposes `checkNotifications` with the **"blocked" vs "denied"** distinction that our plain-English permission
screen needs · risks: a permission library is a big surface for a small need; our own `expo-notifications` API
covers the notification permission itself · **DECISION: ADOPT (permissions UX for notifications *and* camera — one
library for both).**

### 1.2 Background execution, offline queue and the sync wake-up

**C21 — `Transistorsoft/react-native-background-fetch`** https://github.com/Transistorsoft/react-native-background-fetch
— **1 611 ★** /196 f · created **2016-08-01** · last push **2026-04-22** · **MIT** · no GitHub releases; npm
`react-native-background-fetch` **4.4.2 @ 2026-04-15** · **54 574 downloads/week** · 1 open issue · New
Architecture: yes (v4 supports the New Architecture) · **better than ours**: the **de-facto** way an RN app wakes
up to flush a queue when the network returns, with a headless-JS task and an Android `HeadlessTask` ·
risks: OEM schedulers (Android 12+ `WorkManager` quotas, Xiaomi/Huawei) still limit it; it is **not** a
guaranteed real-time path · **DECISION: WATCH (the queue flush trigger; never the delivery path).**

**C22 — `jamesisaac/react-native-background-task`** https://github.com/jamesisaac/react-native-background-task —
**1 115 ★** /110 f · created **2017-02-17** · last push **2023-04-28** · **MIT** · last release **v0.2.1 @
2017-08-10** · 67 open issues · **better than ours**: the simplest "run JS in the background" pattern ·
risks: stale, iOS-oriented · **DECISION: REJECT.**

**C23 — `Rapsssito/react-native-background-actions`** https://github.com/Rapsssito/react-native-background-actions
— **943 ★** /143 f · created **2020-01-14** · last push **2026-04-07** · **MIT** · last release **v4.1.0 @
2026-04-08** (25 releases) · **0 commits/90 d** · 30 open issues · **better than ours**: a **long-running
background task** (not a scheduler) — the right shape for "keep syncing while the phone is in the mount and the
driver is driving" · risks: Android foreground-service rules; a long-running task costs battery (our ≤ 8 %/h
budget) · **DECISION: WATCH (a possible answer to the "silent push did not arrive" hole).**

**C24 — `mahdidavoodi7/react-native-continued-task`** ⭐ (2026 newcomer) https://github.com/mahdidavoodi7/react-native-continued-task
— **233 ★** /5 f · **created 2026-09-01** · last push **2026-09-01** · **MIT** · first release **v0.1.0 @ 2026-09-01**
· **20 commits/90 d, 1 human** · 0 open issues · **Nitro Modules** based (it lives in the same 2026 Nitro
ecosystem as VisionCamera v5) · **better than ours**: it continues a task **after the app is backgrounded or
killed** — the 2026 answer to "the courier drove out of range and the SMS never went" · risks: **6 weeks old, one
maintainer, no production users** · **DECISION: WATCH (the most interesting 2026 newcomer in this file; re-check
at 3 months).**

**C25 — `expo/eas-cli`** https://github.com/expo/eas-cli — **1 370 ★** /256 f · created **2020-08-12** · pushed
**2026-10-20** · **MIT** · **100+ commits/90 d, 17-37 humans** · 262 open issues incl. PRs · **better than ours**:
it is where **FCM V1 service-account credentials and the APNs push key** are created and rotated for a build
(`eas credentials`) — the credential half of push that no SDK card covers · risks: CI-only tooling, never in the
app · **DECISION: KEEP (credential workflow for T7.10).**

### 1.3 SMS provider SDKs (server side)

**C26 — `twilio/twilio-node`** https://github.com/twilio/twilio-node — **1 543 ★** /564 f · created **2013-02-19** ·
pushed **2026-10-12** · **MIT** · last release **6.2.0 @ 2026-10-13** (**7 releases in 6 m**, 100 total) · **15
commits/90 d, 4 humans** · 61 open issues · server · **better than ours**: the **webhook validation** helper
(`validateRequest`) is the reference for the **delivery-report webhook contract** — and in 2026 they hardened it
(`fix(webhooks): validate the url as received before re-encoded variants` #1220, merged 2026-10-12, and
`replace deprecated scmp with crypto.timingSafeEqual` #1218, merged 2026-10-07) · risks: our API is Python, so
the Node SDK is a contract reference, not a dependency; **Twilio's NZ pricing page returned 404 on 2026-10-21 →
NZ rates UNVERIFIED** · **DECISION: KEEP (the webhook-contract reference) + the vendor is a candidate.**

**C27 — `twilio/twilio-python`** https://github.com/twilio/twilio-python — **2 085 ★** /815 f · created
**2009-09-15** · pushed **2026-10-12** · **MIT** · last release **9.12.0 @ 2026-10-13** (**7 releases in 6 m**) ·
**16 commits/90 d, 4 humans** · 78 open issues · server · **better than ours**: it is the **Python** SDK, so it
*can* be a dependency of `apps/api`, and it carries the same webhook-validation helpers · risks: **NZ pricing
UNVERIFIED (the NZ pricing pages 404'd on 2026-10-21)**; our own `SmsGateway` interface (V4 §6.1) means we do
not need to couple to a vendor SDK at all · **DECISION: WATCH (the Python SDK to use if we pick Twilio).**

**C28 — `novuhq/novu`** https://github.com/novuhq/novu — **40 175 ★** /4 515 f · created **2021-08-26** · pushed
**2026-10-20** · **licence: NOASSERTION via the API**; the repository root carries **three** licence files —
`LICENSE-MIT`, `LICENSE-ENTERPRISE`, `EE-PACKAGES-LICENSE` — i.e. **MIT core + a separate enterprise licence for
the EE packages** (the per-file licences were **not read → exact terms UNVERIFIED**) · last release
`@novu/framework@v2.14.0 @ 2026-09-29` (**40 releases in 6 m**) · **100+ commits/90 d, 11 humans** · 100 open
issues incl. PRs · server · **better than ours**: it is the **only** OSS project that gives us the thing we
actually need — **one provider abstraction over push + SMS + email with a delivery-activity event stream**; the
2026 fix *"process push activity events for every push provider"* (**PR #12931, merged 2026-10-20**) is exactly
the receipt plumbing we need for our own DLR table · risks: **it is pivoting hard into "agents"** (the last 10
commits on 2026-10-19/20 are all Agent Inbox / Novu Box / Cloudflare work) — the notification engine may get
less attention; self-hosting it is a service to operate · **DECISION: WATCH (read the provider abstraction, do
not run it).**

**C29 — `Vonage/vonage-node-sdk`** https://github.com/Vonage/vonage-node-sdk — **399 ★** /189 f · created
**2011-11-19** · pushed **2026-10-15** · **Apache-2.0** · last release **v3.30.0 @ 2026-09-02** (**4 releases in
6 m**) · **15 commits/90 d, 3 humans** · 7 open issues · server · **better than ours**: Apache-2.0 and a clean
**message-status webhook** model (webhook + DLR) · risks: no NZ presence; the Node SDK again (our API is Python)
· **DECISION: WATCH.**

**C30 — `team-telnyx/telnyx-node`** https://github.com/team-telnyx/telnyx-node — **198 ★** /29 f · created
**2019-08-02** · pushed **2026-10-19** · **MIT** · last release **v7.26.0 @ 2026-10-15** (**69 releases in 6 m** —
the fastest release cadence of any SMS SDK in this file) · **33 commits/90 d, 2 humans** · 3 open issues · server ·
**better than ours**: the **webhook event model** is one of the cleanest in the market (one signed
`telnyx-signature-ed25519` header per event, a stable event taxonomy, and idempotent event ids) — that is
exactly the shape our DLR table wants; and Telnyx's published list price (**$0.004 per message part**, verified
on telnyx.com/pricing 2026-10-21) is the lowest of the three priced vendors we could read · risks: **the NZ
rate was not on the index page → NZ-specific price UNVERIFIED**; no NZ long-code/short-code registration path
verified · **DECISION: ADOPT (primary SMS vendor candidate; SDK is MIT and the webhook model is the reference).**

**C31 — `web-push-libs/web-push`** https://github.com/web-push-libs/web-push — **3 562 ★** /328 f · created
**2015-09-28** · pushed **2026-10-19** · licence **NOASSERTION** · last release **v3.6.5 @ 2023-08-30** (23
releases, 0 in 6 m) · **9 commits/90 d, 3 humans** · 48 open issues · **better than ours**: the VAPID
implementation the web dashboard would need to notify a dispatcher in a browser · risks: not an Expo/RN thing;
licence not classified · **DECISION: SKIP for v1 (the web dashboard is T7.12, and it can use the same
notification service).**

**C32 — `aws-amplify/amplify-js`** https://github.com/aws-amplify/amplify-js — **9 552 ★** /2 175 f · created
**2017-10-02** · pushed **2026-10-16** · **Apache-2.0** · last release `@aws-amplify/pubsub@6.2.2 @ 2026-10-14`
(**60 releases in 6 m**) · **52 commits/90 d, 10 humans** · 100 open issues incl. PRs · **better than ours**: its
Push Notification service is a **hosted alternative to FCM** that many RN apps use · risks: another large
dependency; AWS account and cost; we already have FCM · **DECISION: REJECT (one transport is enough).**

**C33 — `productdevbook/nitroping-push`** https://github.com/productdevbook/nitroping-push — **338 ★** /25 f ·
created **2025-08-15** · last push **2026-04-22** · **MIT** · **no releases** · **0 commits/90 d** · 8 open issues ·
**better than ours**: a small **Nitro**-based push service — the same 2026 stack our scanner runs on · risks:
**quiet for 6 months**, no release, no production users · **DECISION: WATCH (a Nitro reference if we ever need
push from our own server in the same process).**

**C34 — `devkitshq/notifkit`** ⭐ (2026 newcomer) https://github.com/devkitshq/notifkit — **115 ★** /7 f ·
**created 2026-07-16** · pushed **2026-10-19** · **MIT** · last release **v0.1.13 @ 2026-10-20** (**6 releases in
3 months**) · **100+ commits/90 d, 3 humans** · 0 open issues · **better than ours**: a **2026-native** push
notification kit — the "what does a push stack look like after TurboModules" answer · risks: 3 months old, 115★,
we have not read its API · **DECISION: WATCH.**

**C35 — `zackb/tether`** ⭐ (2026 newcomer) https://github.com/zackb/tether — **1 475 ★** /42 f · **created
2026-04-12** · pushed **2026-10-20** · **MIT** · last release **v0.2.40 @ 2026-10-20** (**49 releases in 6
months**) · **100+ commits/90 d, 6 humans** · 9 open issues · it surfaced in the `sms created:>2025-01-01` query,
so it is in the messaging space · **its README and purpose were NOT read → what it is: UNVERIFIED** · risks:
unknown shape · **DECISION: WATCH (read it next month; the release velocity is worth a look).**

**C36 — `TryCaspian/caspian-sdk`** ⭐ (2026 newcomer) https://github.com/TryCaspian/caspian-sdk — **973 ★** /138 f ·
**created 2026-07-20** · pushed **2026-08-25** · **AGPL-3.0** · first release **v0.1.2 @ 2026-07-21** · 33 open
issues · **better than ours**: a new communications SDK in the messaging space · risks: **AGPL-3.0** →
V4 §11.2 clean-room study only, never a dependency; and it is 3 months old · **DECISION: CLEAN-ROOM STUDY ONLY.**

**C37 — `mirzemehdi/KMPNotifier`** https://github.com/mirzemehdi/KMPNotifier — **663 ★** /45 f · created
**2023-11-12** · pushed **2026-10-18** · **Apache-2.0** · last release **v2.0.1 @ 2026-08-15** (**2 releases in
6 m**) · **7 commits/90 d, 3 humans** · 20 open issues · **Kotlin Multiplatform** — the **shared-notification**
pattern we would love for an RN app + a future desktop app · risks: **not React Native**; the RN side would
still be `expo-notifications` · **DECISION: WATCH (architecture reference only).**

**C38 — `better-notify/better-notify`** https://github.com/better-notify/better-notify — **317 ★** /7 f ·
**created 2026-04-25** · last push **2026-08-18** · **MIT** · 100 releases in 6 m (the
`@betternotify/unosend-v1.0.0-beta.3` family) · **2 commits/90 d, 2 humans** · 10 open issues ·
**better than ours**: a 2026 email/push product · risks: **the release train is a beta tag with 100 releases** —
a red flag for supply-chain hygiene; its purpose was not verified · **DECISION: REJECT.**

### 1.4 Vendor, platform and legal cards (no GitHub repository)

**V1 — Expo Push Service** https://docs.expo.dev/push-notifications/faq (modificationDate **2026-09-03**) —
**pricing: no cost** for sending through the Expo push service (verified) · **rate limit 600 notifications per
second per project** (verified; exceeding it fails the request) · **delivery guarantee: best effort** —
"at-least-once delivery to the underlying push notification services", "a notification may be delivered to Google
or Apple more than once or not at all, although these cases are rare"; a **push receipt means the message was
handed to Google/Apple, not that the phone showed it** (verified) · **contents are not stored** — in-memory and
queues only, never in a database (verified) · `ExpoPushToken` never expires; on Android a reinstall can change
it; `DeviceNotRegistered` means stop sending (verified) · **relevance**: the cheapest, fastest-to-ship transport
for v1, and the only one with **zero** vendor SDK in the app.

**V2 — Firebase Cloud Messaging (FCM)** https://firebase.google.com/docs/cloud-messaging (the transport behind
`getDevicePushTokenAsync`) — **pricing UNVERIFIED** (we did not fetch the FCM pricing page on 2026-10-21) ·
relevance: the Android transport; APNs for iOS. **FCM HTTP v1 is the current API** (the legacy HTTP was
deprecated years ago) and the Expo docs carry a dedicated "Add Android FCM V1 credentials" page.

**V3 — Apple Push Notification service (APNs)** https://developer.apple.com/documentation/usernotifications —
**pricing UNVERIFIED** (not fetched on 2026-10-21) · relevance: the iOS transport; token-based auth, and the
iOS 27 SDK requires the UIScene lifecycle (Expo SDK 58 changelog, 2026) — that changes how a background push
handler is registered.

**V4 — Sinch Engage (rebranded from MessageMedia)** https://sinch.com/engage/pricing/ (read **2026-10-21**) —
**NZ-domiciled, NZ-focused.** Plans (annual): **Basics $99/mo** (3 000 SMS), **Conversations $249/mo** (10 000),
**Pro $799/mo** (40 000), **Pro Plus $1 799/mo** (100 000), **Advanced $2 399/mo** (150 000); **extra SMS credits
$0.0330 → $0.0160** per tier; 14-day free trial, no card. **Two NZ facts that decide our provider**: *"In New
Zealand, A2P regulations require a dedicated short code rather than a long code"* and *"In New Zealand, inbound
charges may apply depending on your short code type"* (both verified verbatim on 2026-10-21). **This contradicts
our own `docs/FOUNDER_TODO.md` line 46 and `docs/FINAL_PROMPT.md` §207, which assume an NZ *long* number** →
see the Decision section. Also: the footer reads "© 2026 Sinch".

**V5 — Telnyx** https://telnyx.com/pricing (read **2026-10-21**) — **Messaging from $0.004 per message part**;
Pay-as-you-go **$0 minimum**, **Growth $2 000/mo minimum** (15 % off Voice/Messaging/Numbers), **Enterprise
$5 000/mo minimum**; Numbers from $1/month; Verify API $0.03 per successful verification; Cloud Storage $0.006
per GiB/month. **NZ-specific rates: UNVERIFIED** (the index page shows list prices, not an NZ column).

**V6 — Twilio** https://www.twilio.com/en-nz/sms/pricing — **404 on 2026-10-21**; https://www.twilio.com/en-nz/pricing
— **404 on 2026-10-21**. **NZ SMS pricing UNVERIFIED**; the SDK and webhook contract are verified (C26/C27).
**V7 — Spark NZ** https://www.spark.co.nz/business/messaging — **blocked by a bot challenge on 2026-10-21**
("Radware Bot Manager Captcha") → **pricing and API availability UNVERIFIED**. Spark is a **TCF member**
(tcf.org.nz member list, 2026).
**V8 — 2degrees NZ** https://www.2degrees.nz/en/business/sms/ — **404 on 2026-10-21** → **UNVERIFIED**; also a
**TCF member**.
**V9 — One NZ** https://one.nz/business/ — **not fetched on 2026-10-21** → **UNVERIFIED**; also a **TCF member**.
**V10 — NZ Telecommunications Forum (TCF)** https://www.tcf.org.nz/ (read **2026-10-21**) — the industry forum
whose members (2degrees, One NZ, Spark, Chorus, Kordia, Devoli…) represent "over 90 % of New Zealand
telecommunications customers"; the **Industry codes** and **Standards & compliance** pages are where the A2P
registration rules live — **the specific registration requirement for an aggregator was NOT read → UNVERIFIED**.

**V11 — Unsolicited Electronic Messages Act 2007 (UEMA)** https://www.legislation.govt.nz/act/public/2007/0007/latest/whole.html
(version as at **28 October 2021**, latest on the site) — **s 9**: a person must not send an unsolicited
**commercial** electronic message with a New Zealand link; **s 9(3)**: **the onus of proof of consent is on the
sender**; **s 9(2)**: an unsubscribe withdraws consent with effect **5 working days** after the recipient used it;
**s 10**: the message must identify the authoriser and give contact details **valid for at least 30 days**;
**s 11**: a **functional unsubscribe facility**, in the same channel, free, conspicuous, valid for at least 30
days. **V12 — Consumer Protection NZ (Commerce Commission), "Online safety laws and rules"** https://www.consumerprotection.govt.nz/general-help/consumer-laws/online-safety-laws-and-rules
(read **2026-10-21**) — UEMA covers commercial electronic messages to/from/within NZ, and **does NOT cover**:
internet pop-ups, telemarketing, a response to a quote, **"confirming a previously agreed arrangement"**,
warranty information, **"factual information about an ongoing relationship"**, employment or benefit information,
and **"products or services relating to a previous transaction"**. **DIA enforces it, with fines up to $500 000**
(complaints forwarded to **7726**). **V13 — Harmful Digital Communications Act 2022 (HDCA)** (same page) — 10
principles for digital communications ("any form of electronic message, including texts, emails, photos and
recordings"); Netsafe can order removal and the HR Tribunal can make court orders.
**V14 — DIA spam FAQ / Compliant Electronic Marketing guidance** https://www.dia.govt.nz/spam-frequently-asked-questions
and the DIA "Compliant Electronic Marketing" PDF — **the SMS-specific guidance is decisive**: a commercial SMS
must identify the sender and how to reach them and carry a **free SMS-based unsubscribe** — *"an email address
used as an unsubscribe function in a TXT message is not compliant"*; verbal consent is acceptable but **keep the
record**; an unsubscribe facility must work for at least 30 days and be actioned within 5 working days.

**V15 — Android delivery reality (OEM kills)** https://help.pushwoosh.com/hc/en-us/articles/360028478751 +
https://documentation.onesignal.com/docs/en/example-target-certain-android-manufacturers-and-devices +
https://onesignal.com/blog/manufacturers-interfere-with-reliable-notifications/ (all read **2026-10-21**) —
Android 13+ needs the runtime **`POST_NOTIFICATIONS`** permission or **nothing is displayed at all**; Android 12+
app hibernation and the "Restricted battery" state stop background delivery; a **force-stop blocks delivery
entirely until the user launches the app again — "standard Android behaviour and cannot be worked around by any
SDK"**; Samsung One UI **6.1 silently disables notification categories** after install; Xiaomi/Huawei/Oppo/Vivo/
OnePlus need auto-launch and background-run permissions; the standard fix list is **dontkillmyapp.com**.
**V16 — Android 16 notification cooldown** https://support.google.com/android/answer/9079661 + Android Authority
(2024-11-19) — the OS now **lowers the volume and minimises alerts** for a burst of notifications from the same
app; calls, alarms and priority conversations are exempt. **This is the OS telling us to be quiet — it matches our
"notifications must not be noisy" rule.** **V17 — NZ Privacy Act 2020** https://www.privacy.org.nz/privacy-principles/3/
(read **2026-10-21**) — the OPC's IPP list (1–13) is the working reference; **IPP 3** requires that a person is
told why information is collected, who receives it, whether it is compulsory and what happens if it is not
provided, and that the steps are taken **before or as soon as practicable after collection**; IPP 9 is retention,
IPP 5 storage and security, IPP 12 disclosure outside New Zealand. **A phone number and an address are personal
information**; so is the fact that a parcel was delivered to it.

**V18 — Expo SDK 58 notification changes** https://expo.dev/changelog/sdk-58 (read **2026-10-21**) — the
SDK-58-specific facts that matter here: `expo-notifications` **shows foreground notifications by default** and
**no longer drops a notification when the handler is slow** (#49072); iOS **forwards notification-centre calls to
another library's delegate** so two push libraries can coexist (#48313); **grouping via `threadIdentifier`** on
both platforms (#49429 iOS, #43388 Android); a **new `delivery: 'alarmClock'` option** on Android date/repeating
triggers that uses `AlarmManager.setAlarmClock()` — *"which OEM battery policies do not defer"* (#49687) — this is
the only SDK-58 primitive that beats an OEM battery policy; a **`largeIcon` config-plugin property** (#49481);
and `enableRemoteNotifications: false` to skip the APNs entitlement for local-only apps (#50891).

## 2. Shortlist (13)

| # | Candidate | Decision | One-line reason |
|---|---|---|---|
| C1 | **`expo-notifications` 58.1.5** (expo/expo) | **ADOPT (the engine)** | 3.92 M downloads/week, MIT, 2 162 commits/90 d, and it covers local, scheduled, channels, badges and the FCM/APNs token with no third-party SDK in the app. |
| C2 | **Expo push service + the ticket/receipt contract** (expo-server-sdk-node) | **ADOPT (transport v1)** | Free (verified), 600 msg/s, at-least-once, and the receipt tells us Google/Apple accepted it — the only honest delivery signal available. |
| C3 | **FCM + APNs directly** (`getDevicePushTokenAsync`) | **ADOPT (the fallback transport)** | We keep the app free of Expo's intermediary and of any vendor SDK; only the credentials change (EAS-managed). |
| C20 | **`react-native-permissions` 5.6.3** (zoontek) | **ADOPT (permission UX)** | The only mature library that models `POST_NOTIFICATIONS`, the blocked-vs-denied distinction and the "open settings" dead-end — for notifications *and* camera. |
| C26/C27 | **`twilio-node` / `twilio-python`** | **KEEP (the DLR webhook reference)** | Their webhook validation was hardened in 2026 (timing-safe compare, URL re-encode fix) — the contract to copy, not the SDK to couple to. |
| C30 + V5 | **Telnyx** (`team-telnyx/telnyx-node`, $0.004/part) | **ADOPT (primary SMS vendor candidate)** | Fastest release cadence in the file (69 releases/6 m), MIT SDK, the cleanest signed-event webhook model, and the lowest list price we could verify. |
| V4 | **Sinch Engage (ex-MessageMedia)** | **ADOPT (the NZ fallback / short-code path)** | NZ-domiciled and it states the NZ A2P rule outright: a **dedicated short code, not a long code** — which is the single biggest correction to our SMS plan. |
| C28 | **`novuhq/novu`** | **WATCH (read the provider abstraction)** | The only OSS project with one provider layer over push+SMS+email and a delivery-activity event stream; but it is pivoting to agents and its licence is MIT-core + enterprise. |
| C3/C4/C5 | **OneSignal (SDK + Android/iOS SDK + node API)** | **WATCH (vendor yes, SDK no)** | Best OEM-coaching documentation we read, but the SDK licence is a **Modified MIT with a use restriction**, which our licence gate cannot accept while the transport is swappable. |
| C8 | **RNFirebase `packages/messaging` 27.0.0** | **WATCH** | The deepest FCM surface in RN, Apache-2.0, actively ported to Kotlin and the iOS 27 scene lifecycle — but it drags the Firebase SDK into the APK budget. |
| C21/C24 | **`react-native-background-fetch` 4.4.2 · `react-native-continued-task` 0.1.0** | **WATCH (the queue flush trigger)** | The mobile half of "the SMS goes out when the network returns"; the second is a 2026 Nitro newcomer that continues a task after the app is killed. |
| C7/C14/C16/C17/C22/C32/C38 | **notifee · zo0r push-notification · evollu FCM · instamobile RNFirebase · jamesisaac background-task · amplify-js · better-notify** | **REJECT** | Six of the seven are **archived or dead** (notifee 2021, zo0r 2024, evollu 2022, instamobile 2024, jamesisaac 2023); amplify-js adds a second transport; better-notify ships 100 releases under a beta tag. |
| C19/C18/C31/C33/C34/C35/C36/C37 | **seniv notifier · emekalites alarm-notification · web-push · nitroping-push · notifkit · tether · caspian-sdk · KMPNotifier** | **WATCH** | Each covers one capability we might need later (offline-tolerant local notifications, exact alarms, browser push, 2026-native push kits, shared-notification architecture) — none covers the whole need; **caspian-sdk is AGPL-3.0 → clean-room only**. |

## 3. Deep review — top 5 (code, commits, PRs and issues in the 2026 window)

### 3.1 `expo/expo` → `packages/expo-notifications` (C1)

**What I read.** `packages/expo-notifications/CHANGELOG.md` on `main` (entries **58.1.5 → 58.0.0**, read via
webfetch 2026-10-21); the SDK 58 changelog page; the v58 API reference page; the Expo push FAQ. **What I checked
in the changelog:** the **breaking** change in 58.0.0 — *"Show notifications that arrive while the app is in the
foreground, unless the app asks for another behavior with `setNotificationHandler`. A handler that doesn't answer
within 3 seconds no longer drops the notification"* (#49072) — and the Android `dataString` guard (#49274); the
new `delivery: 'alarmClock'` option (#49687) with the exact wording *"which OEM battery policies do not defer"*;
the iOS delegate forwarding (#48313) and `threadIdentifier` grouping (#49429); the `largeIcon` config plugin
(#49481); 58.1.0's `enableRemoteNotifications` config plugin (#50891); 58.1.1's Android `threadIdentifier`
(#43388) and the **new exact-alarm permission APIs** `getExactAlarmPermissionsAsync` /
`requestExactAlarmPermissionsAsync` (#50919); 58.1.1's "Return notification permission responses as records"
(#51060); 58.1.3's iOS `EXC_BAD_ACCESS` crash fix (#51370); 58.0.10's Android fix *"notification action buttons
going missing after an app update that changes R8 minification"* (#50799) and the native push-token retry
(#50848); 58.0.8–58.0.2 (2026-09-15 → 2026-09-28) were dependency-only.

**Commits on `packages/expo-notifications` (2026-10-02 → 2026-10-16, `gh api repos/expo/expo/commits?path=`):**
`b2540d0` 2026-10-16 "Version packages (main) (#51662)" · `86a37e2` 2026-10-14 (#51473) · `d7a68af` 2026-10-13
(#51324) · **`b928749` 2026-10-12 "[notifications][iOS] Fix crash from concurrent access to pending handler tasks
(#51370)"** · `436b5f9` 2026-10-09 (#51197) · `e180d56` 2026-10-07 "chore(internal-scripts): Rename
`expo-module-scripts` to `@expo/internal-scripts` [2/2] (#51221)" · `27a2ebd` 2026-10-05 (#51006) · **`83266c5`
2026-10-05 "[android][notifications] Implement notification grouping via threadIdentifier (#43388)"** · **`eabcf1b`
2026-10-05 "[android][notifications] Add getExactAlarmPermissionsAsync and requestExactAlarmPermissionsAsync
(#50919)"** · **`e37db0a` 2026-10-05 "[notifications][android] Return permission responses as Records (#51060)"** ·
`f1c525a` 2026-10-03 (#50929) · `88dc392` 2026-10-02 "[workspace] Upgrade `jest` to `^30.0.0` (#50427)".

**PRs in the window** (repo-wide, `sort=updated desc`): #51905 "[JSI][core] Cache `@Record` property names with
`expo-modules-macros` 0.22.0" (open, created 2026-10-20) · #51695 "[router] Add
`unstable_requiredScreensBelow` to `Stack.Screen`" (open, 2026-10-16) · #51894 "[expo-app-metrics] Log an event
when the user leaves the app during startup" (open, 2026-10-20) · #51917, #51505, #51920 (open) · #44148
"[web][sqlite] Fix sync worker result length encoding in WorkerChannel" (closed, created 2026-03-23, **not
merged**) · #51923 (open, 2026-10-20).

**Issues updated in the window** (`issues?since=2026-01-01`, first page — GitHub's `since` filters by *updated*,
not created, so I record the real created date for each): **#51916** (created 2026-10-20, 1 comment)
"[expo-router] Stack.Protected … (SDK 58)" · **#51910** (2026-10-20) "[router][web] The header search buttons
from headerSearchBarOptions have no accessible name" · **#51907** (2026-10-20) "[ui][android] A TextInput
remounted right after its first render logs 'Cannot use shared object that was already released'" · **#51903**
(2026-10-20, closed) "`closeAsync()` races with an in-flight statement … and crashes with SIGSEGV" ·
**#51892** (2026-10-20) "[ui][iOS] community/segmented-control ignores tintColor and passes an empty label, so the
control has no accessible name" · **#51891** (2026-10-20) "[ui][iOS] BottomSheet stays presented when a screen is
pushed over its owner; onDismiss never fires".

**Verdict.** The engine is in the SDK we are locked to, it is MIT, it is the most-downloaded package in this file,
and the 2026 work is exactly our work: grouping (so a burst of stops is one banner), foreground behaviour that
does not drop, an alarm-class delivery that beats OEM battery policy, and exact-alarm permission APIs. **Adopt
it.** The one thing it does **not** give us is a delivery guarantee, and it says so itself.

### 3.2 `OneSignal/react-native-onesignal` (C3)

**What I read.** The repository's `LICENSE` file (raw, 2026-10-21) — this is the decisive artefact: the MIT text
**plus** *"All copies or substantial portions of the Software may only be used in connection with services
provided by OneSignal."* The npm metadata for `react-native-onesignal` says "MIT" and GitHub's licensee says
NOASSERTION, so the **file is the truth**: it is a **use-restricted licence**. The 2026 changelog through
**5.5.15 @ 2026-10-14** (20 releases in 6 months).

**Commits (2026-09-10 → 2026-10-17):** `e766999` 2026-10-17 "chore: add log levels to demo LogService" ·
`7a0be86` 2026-10-16 "chore: [SDK-5527] add sticky log view to demo app (#2005)" · `8bb8bc2` 2026-10-13 "chore(demo):
update Podfile.lock pod checksums" · `237825b` 2026-10-13 "chore: Release 5.5.15 (#2003)" · `11708c4` 2026-10-12
"chore: upgrade Vite+ to 1.1.0 (#2002)" · **`45bacc5` 2026-10-03 "fix: [SDK-5304] validate public API inputs to
prevent native crashes (#1997)"** · `a5867c5` 2026-10-02 "ci: remove redundant Maven Central wait from e2e" ·
`b0f9b98` 2026-09-23 "chore: Release 5.5.14 (#2001)" · `2bb0958` 2026-09-22 (#2000) · `2a5ef5f` 2026-09-21
"chore: [SDK-5280] align the example build doc with the iOS 15.1 minimum (#1999)" · `11cab78` 2026-09-19 (#1996)
· `53d9ffe` 2026-09-10 (#1995).

**PRs:** #2005 (closed, merged 2026-10-16) · #2004 (open, created 2026-10-13) "feat: [SDK-5024] add
loginWithProfile (Android only)" · #2003 (merged 2026-10-13, release) · #2002 (merged 2026-10-12) · **#1886
(open since 2025-12-17) "Expose setBadgeCount method"** · **#1859 (open since 2025-11-17) "Feat/event driven wait
for push id token"** · #1997 (merged 2026-10-03) · #2001 (merged 2026-09-23).

**Issues updated in the window:** **#1970** (created **2026-08-24**, closed) "[Bug]: Android
`getDefaultProguardFile('proguard-android.txt')` is no longer supported since it includes `-dontoptimize`" ·
**#1991** (created **2026-09-03**, closed) "[Feedback]: Communication Notification Implementation With OneSignal".

**Why this matters to us, concretely.** SDK 58 **turns R8 on by default in release builds** (Expo SDK 58
changelog, `android.enableMinifyInReleaseBuilds=true`) — and `expo-notifications` 58.0.10 fixed *"notification
action buttons going missing after an app update that changes R8 minification"* (#50799). OneSignal's issue #1970
is the **same class of problem** from the other side of the fence. **Any** push SDK we adopt must have a
ProGuard/R8 story that survives SDK 58's default. That is a concrete, dated, verifiable line in the decision.

**Verdict.** Good vendor, **unacceptable SDK licence for a swappable transport** (we want to be able to leave
without a licence violation), and its most valuable artefact for us is **documentation** (the OEM coaching
pattern and the delivery-state dashboard). Vendor: yes. SDK in the shipped app: no, unless OneSignal is the
committed transport.

### 3.3 `invertase/react-native-firebase` → `packages/messaging` (C8)

**What I read.** The commit history of `packages/messaging` (10 commits, 2026-09-24 → 2026-10-19) and the
repository's release cadence; the npm record for `@react-native-firebase/messaging` 27.0.0 (2026-10-19,
Apache-2.0, 519 956 downloads/week).

**Commits:** `0c7e942` 2026-10-19 "chore(release): release packages" · **`0ca03d1` 2026-10-16
"feat(app, sdk)!: bump Firebase Android 35, Apple 13, and JS 13"** · `959d91f` 2026-10-07
"fix(app,database): resolve platform native module when bundlers apply package exports" · **`3fde064` 2026-10-16
"fix(messaging, ios): hop notification permission APIs onto the main queue"** · **`7cd8f14` 2026-10-16
"fix(messaging, ios): port UIScene window guard after rebase"** · `e96897f` 2026-10-15
"style(messaging, android): apply google-java-format to serializer/jsonconvert tests" · **`14f34e0` 2026-10-02
"refactor(messaging, ios): move Messaging Firebase calls out of TurboModule"** · `ffbb1a1` 2026-09-25
"refactor(messaging, android): port messaging json convert helpers to Kotlin" · `2e40bc5` 2026-09-25
"refactor(messaging, android): port messaging serializer to Kotlin" · `9848c55` 2026-09-24 "refactor(messaging,
android): port messaging notification registry to Kotlin".

**PRs:** #9381 (open, 2026-10-20) · #9353 (open, 2026-09-30) · #9380 (merged 2026-10-20) · #9379 (merged
2026-10-19) · #9366 (created 2026-10-08, **not merged**) "feat(app, sdk): bump Firebase JS SDK to 13.0.0" ·
#9365 (created 2026-10-08, **not merged**) "feat(app, sdk): bump Firebase Android SDK to 35.0.0".

**Verdict.** This is the reference for doing push properly on both platforms in 2026 — the messaging module was
**ported to Kotlin on Android and off the TurboModule on iOS**, and the iOS fixes are exactly the two things SDK
58 changes (permission APIs on the main queue, the UIScene window guard). But it is the heavyweight option, and
`expo-notifications` already exposes the native token, so RNFirebase is **our fallback, not our default**.

### 3.4 `twilio/twilio-node` (C26)

**What I read.** The 10 most recent commits and 6 most recent PRs (2026-08-11 → 2026-10-12) and the release
cadence (6.2.0 @ 2026-10-13, **7 releases in 6 months**, MIT).

**Commits:** `1f261bd` 2026-10-12 "[Librarian] Release librarian/release-20261012-105840 (#1221)" · **`4802554`
2026-10-12 "fix(webhooks): validate the url as received before re-encoded variants (#1220)"** · **`54049bf`
2026-10-07 "chore: replace deprecated scmp with crypto.timingSafeEqual (#1218)"** · `de6edf8` 2026-09-28
"[Librarian] Release librarian/release-20260928-070527 (#1216)" · `e4b1cd3` 2026-09-17 "chore: added Response
forward compatibility tests (#1213)" · `c57ec86` 2026-09-10 "[Librarian] Regenerated …" · `522091b` 2026-09-09
"fix: lockfile hygiene maintenance (#1211)" · `c8a4c27` 2026-08-12 "adding deprecation steps (#1206)" ·
`909be26` 2026-08-11 "Update Artifactory OIDC Auth action version (#1205)" · `b5608b8` 2026-08-11 "Release 6.1.0
(#1204)".

**PRs:** #1221 (merged 2026-10-12) · #1220 (created 2026-10-09, merged 2026-10-12) · #1219 (open, 2026-10-08) ·
#1184 (created 2026-03-24, **closed without merging**) · #1218 (created 2026-10-07, merged 2026-10-07) · #1217
(open, 2026-10-06).

**Why this matters to us, concretely.** Two 2026 commits define the **delivery-report webhook contract** we
must implement: **#1220** (validate the URL *as received*, before re-encoded variants — i.e. compare the raw
bytes the provider sent, not a normalised URL) and **#1218** (replace the deprecated `scmp` with
`crypto.timingSafeEqual` — a **constant-time** signature comparison). We will implement both in `apps/api`, and
we will write the same rule into the ADR: **verify the signature against the raw body, compare in constant time,
reject on any mismatch, and make the handler idempotent on the provider's event id.**

**Verdict.** Keep as the contract reference. Do not couple our `SmsGateway` interface to a vendor SDK; copy the
webhook rules.

### 3.5 `novuhq/novu` (C28)

**What I read.** The repository root listing (2026-10-21) — `LICENSE-MIT`, `LICENSE-ENTERPRISE`,
`EE-PACKAGES-LICENSE` — so the project's licence is **mixed**, and the API's NOASSERTION is explained. The last
10 commits and 6 PRs (2026-10-19 → 2026-10-20). The release cadence: **40 releases in 6 months**, 100+ commits
in 90 days, 11 humans.

**Commits:** `b5afe49` 2026-10-20 "feat(api-service,human-dashboard,agent-inbox-mcp,@agentinbox/cli): the Agent
Inbox API on agentinbox.md fixes NV-9042 (#12955)" · `7de51b5` 2026-10-20 "fix(docs): enhance bridge request error
documentation … fixes DOC-458 (#12957)" · **`2fc46ab` 2026-10-20 "fix(providers,shared): process push activity
events for every push provider fixes NV-8854 (#12931)"** · `05d671f` 2026-10-20 (#12953) · `34aff26` 2026-10-20
"feat(root): Novu Box boxes on box.novu-staging.co, one Worker for all fixes NV-9059 (#12952)" · `703b942`
2026-10-20 (#12951) · `b30b8ce` 2026-10-19 (#12944) · `c32259c` 2026-10-19 (#12946) · `d0b3f29` 2026-10-19
"feat(root): Novu Box, a full Novu Cloud stack per PR on Cloudflare fixes NV-9079 (#12942)" · `cdc5324` 2026-10-19
(#12941).

**PRs:** #12955 (merged 2026-10-20) · #12958 (open, 2026-10-20) · #12908 (open, 2026-10-15) · #12957 (merged
2026-10-20) · #12956 (open, 2026-10-20) · **#12931 (created 2026-10-18, merged 2026-10-20)**.

**Why this matters to us, concretely.** **PR #12931 — "process push activity events for every push provider"**
is the exact behaviour we need in our own notification service: **one activity event per provider**, normalised,
so that a single table can record "queued → sent → delivered → failed" across FCM, Expo push and the SMS
gateway. That is our `notification_events` table, and Novu's fix is a dated, public reference for its shape.
The risk is equally clear: **nine of the last ten commits are about agents and "Novu Box" on Cloudflare** — the
project's centre of gravity has moved. Adopting it would mean adopting a platform that is re-aiming.

**Verdict.** Read the provider abstraction and the activity-event model; do not run it.

## 4. Benchmark — **UNVERIFIED: no eval set exists**

**I did not run a benchmark and I will not invent one.** There is no `docs/squads/notifications/` directory, no
notification eval set, and `apps/api` has no push or SMS client installed. Every number below is **UNVERIFIED**
until the harness exists.

**The set that must be built (name + shape):**

1. **`docs/squads/notifications/eval/reliability/`** — 30 days × 20 drivers × (2 push events + 1 SMS exception
   per driver-day) on **the CI emulator profile + 3 physical mid-range Androids** (a Samsung A-series, a Xiaomi
   Redmi, and a mid-range Pixel), because the OEM behaviour is the variable we are measuring.
2. **`docs/squads/notifications/eval/latency/`** — for each event: `t_send` (our API), `t_ticket`, `t_receipt`,
   `t_delivered` (device), `t_seen` (app opened). The delivery report is the **DLR**, not the receipt.
3. **`docs/squads/notifications/eval/quiet/`** — a "noise budget": a driver may be interrupted by **at most one
   banner per stop**; everything else is a silent data push. Measured as banners per 100 stops.

| Metric | Gate | How we would measure it |
|---|---|---|
| **Delivery reliability (push)** | **≥ 95 %** of "stop changed" pushes observed by the device within 60 s, **and** every non-delivery explained by a receipt/ticket code | Device ACKs the push id to `apps/api`; the server stores ticket id, receipt code and device ACK separately. **UNVERIFIED** until the harness runs. |
| **Delivery reliability (SMS)** | **≥ 98 %** of exception SMS reach the handset (DLR "delivered") within 120 s | The provider's DLR webhook updates our `sms_events` row; the device's next sync reconciles. **UNVERIFIED**. |
| **Latency (push, foreground)** | ≤ 700 ms from the voice command to the on-screen change (V4 §6.4) — the same budget as the voice path | On-device timestamp at receipt minus the command timestamp. **UNVERIFIED**. |
| **Latency (push, background)** | ≤ 10 s from `t_send` to device receipt | Ticket + receipt timestamps. **UNVERIFIED**. |
| **Latency (SMS)** | ≤ 30 s from `t_send` to "accepted by the carrier" | Provider API response time. **UNVERIFIED**. |
| **Cost per courier-month** | **≤ NZD 0.50** for a 20-SMS-per-day driver (D5: SMS is optional and off by default) | Arithmetic on **verified list prices only**: Telnyx $0.004 per message part → 20 × 22 = 440 messages ≈ **US$1.76/month**; Sinch Engage extra credits $0.0160–$0.0330 per message plus a $99–$2 399/mo plan minimum → **NZ$0–NZ$14.52** of message cost, but the plan minimum dwarfs it, so **Sinch's Engage plans are the wrong shape for a solo courier** — the API price is the right shape. **NZ-specific rates for both: UNVERIFIED.** Push via Expo = **$0** (verified). Push via OneSignal Growth = $19/mo + $0.012 per MAU (verified) — also a plan-minimum problem for a free-first product. |
| **Battery impact** | ≤ 8 %/h with driving mode on (V4 §6.4) — a push channel must not cost more than the voice channel | `adb shell dumpsys batterystats` on the CI emulator + 3 physical devices, driving-mode on vs off, 60-minute runs. **UNVERIFIED**. |
| **Cold start** | ≤ 2 s (V4 §6.4) — the notification client must not add to the 2 s budget | Instrument the app's cold start with and without the notification module registered. **UNVERIFIED**. |
| **Offline behaviour** | with the phone in airplane mode for a whole shift: **every SMS and every push is queued locally and flushed in order**, no duplicates, no lost exception | Maestro airplane-mode scenarios (V4 §13.3) against the local outbox table; assert idempotency on the event id. **UNVERIFIED**. |
| **Noise** | ≤ 1 visible banner per stop; **0** banners for a silent data push | Count `notification_posted` events per 100 stops, by channel. **UNVERIFIED**. |

## 5. What we are missing → rows for `docs/PARITY.md`

The CEO merges these. The **Spoke** column is filled **only** with facts verified in
`docs/study/spoke/TEARDOWN.md` (read 2026-10-21); where Spoke is silent the cell says so.

| # | Family | Feature | Status | Spoke (2026-10-20) | Our edge | Task |
|---|---|---|---|---|---|---|
| 1 | Customer | Customer ETA / exception SMS with a tracking link | match (Dispatch only) | Dispatch offers "customised SMS + email notifications, custom SMS sender name" and "notification restricted periods" (S3/S5); **the solo plan has no SMS at all** (S2/S5) | optional and off by default (D5), NZ short-code compliant, UEMA-safe templates | T7.10 |
| 2 | Customer | **Delivery report (DLR) shown to the driver** ("sent / delivered / failed") | beat | not documented in Spoke's public sources — **UNVERIFIED** | we own the DLR table; the driver hears "the customer got it" or "it failed" | T7.10 |
| 3 | Customer | Quiet hours on customer messaging | beat | Spoke has "notification restricted periods" (S3/S4/S5) but **publishes no rules** | a hard NZ quiet-hours rule in our sender, enforced server-side | T7.10 |
| 4 | Customer | Marketing SMS, consent capture and STOP handling | skip (reason) | Spoke's customer notifications are Dispatch-only (S3) | we never send marketing SMS — parcel exceptions are **factual information about an ongoing relationship**, which UEMA does not cover (V12) | T7.10 |
| 5 | Customer | Masked calls / masked SMS | skip (reason) | not documented — **UNVERIFIED** | deferred behind an ADR; no NZ provider path verified | T7.15 |
| 6 | Driver | Push for a new stop, a reassignment or a route change | Planned (task) | no push channel is documented for the driver app — **UNVERIFIED / absent** | a **silent data push**: the app wakes, the list updates, **no banner** | T7.1 |
| 7 | Driver | Android OEM delivery coaching (auto-launch, battery whitelist, One UI categories) | beat | Spoke ships a **battery saver mode (Android only, 2026-03-02)** (S29/S10) but **no delivery coaching** | detect the manufacturer once, coach in plain English and by voice, once | T7.1 |
| 8 | Driver | Notification channels by urgency (job alert vs exception vs chatty) | beat | no channel model documented — **UNVERIFIED** | two channels only: "Exceptions" (audible) and "Everything else" (silent); never a third | T7.6 |
| 9 | Driver | Local notifications generated while offline (next stop, shift end) | Planned (task) | not documented — **UNVERIFIED** | the whole day's plan is local, so local notifications work with no network | T7.1 |
| 10 | Driver | Permission ask that a driver can understand | beat | **no accessibility declaration at all** — "The developer has not yet indicated which accessibility features this app supports" (S13/S14) | one question, one sentence, spoken; blocked state explained | T7.5 |
| 11 | Compliance | SMS sender identification, consent and unsubscribe rules | Planned (task) | not documented — **UNVERIFIED** | a CI template lint that fails the build if a commercial SMS lacks the sender id, the contact details and a same-channel STOP | T7.15 |
| 12 | Compliance | Privacy Act 2020 handling of notification data (numbers, addresses, delivery history) | match | Spoke lists "audit log and retention" and "data history 30 d / 1 y / 5 y" by plan (S3/S5) | one provable retention policy, a 30-day PII purge, IPP 3 notice in the app | T7.15 |
| 13 | Reliability | Offline SMS queue with ordered retry and DLR reconciliation | beat | offline behaviour of notifications is **not documented** — **UNVERIFIED** | the outbox is part of the event log, so a queued SMS survives a crash and a reboot | T7.1 |
| 14 | Analytics | Delivery and latency telemetry per channel | Planned (task) | "performance analytics" exists on Dispatch (S3) but not for notifications | PostHog privacy-safe events: sent / accepted / delivered / failed, and the latency histogram | T7.12 |
| 15 | Customer | Two-way replies parsed into an instruction (e.g. "leave it with the neighbour") | beat | the recipient "can leave delivery instructions for the driver" (S3/S4/S5), but **no reply parsing** is documented | parse the reply with the D8 engine and turn it into a door-memory entry | T7.10 |
| 16 | Compliance | Harmful digital communications guardrail on driver-written SMS | Planned (task) | not documented — **UNVERIFIED** | the HDCA's 10 principles as a pre-send check on any free-text SMS | T7.15 |

## 6. Decision

1. **Engine: `expo-notifications` 58.1.5 (MIT) for local *and* remote notifications.** It is in the locked SDK,
   it is the most-downloaded package in this file, and SDK 58's changes (foreground by default, `threadIdentifier`
   grouping, `delivery: 'alarmClock'`, exact-alarm permission APIs) are exactly our needs. **One library, no
   vendor SDK in the app.**
2. **Transport: start on the Expo push service (free, verified), with direct FCM/APNs as the standing fallback**
   via `getDevicePushTokenAsync()`. The **push receipt is a handoff receipt, not a delivery receipt** — we will
   say so in the code, in the API and to the driver.
3. **Do not put the OneSignal SDK in the app.** Its licence is a **Modified MIT with a use restriction**; our
   transport must stay swappable. OneSignal stays a **vendor candidate** (its OEM coaching and dashboard are
   worth the conversation), not a dependency.
4. **Do not adopt Notifee, `react-native-push-notification`, `evollu/react-native-fcm` or
   `instamobile/react-native-firebase`** — four of the four most-installed notification libraries in the
   ecosystem are archived or dead, and that is exactly how we lose a feature.
5. **SMS: one adapter (`SmsGateway`) in `apps/api`, vendor-neutral, transactional only.** Two candidates:
   **Telnyx** (verified list price $0.004/part, MIT SDK, 69 releases in 6 months, the cleanest signed-event
   webhook model) and **Sinch Engage / ex-MessageMedia** (NZ-domiciled, verified plan prices, and the only
   vendor whose page states the NZ rule outright). **Decision: approach Telnyx first (API-first, no plan
   minimum), keep Sinch Engage as the NZ fallback.**
6. **ADR proposal (does not change a locked decision):** our `docs/FOUNDER_TODO.md` (line 46) and
   `docs/FINAL_PROMPT.md` (§207) assume an **NZ long number**; Sinch's published NZ guidance says *"In New
   Zealand, A2P regulations require a dedicated short code rather than a long code"* (verified 2026-10-21). The
   provider choice must therefore be **a short code (or a registered aggregator's number), not a long number we
   buy ourselves**. This is an **ADR proposal for the CEO**, not an edit to DECISIONS.md.
7. **Legal position we will implement (verified, not inferred):** parcel-exception SMS is **"factual information
   about an ongoing relationship"** and **"products or services relating to a previous transaction"** — both on
   the Commerce Commission's list of things **UEMA does not cover**. So our exception SMS needs **no marketing
   consent and no unsubscribe facility**; it still needs **sender identification and honest copy**, and it must
   not become marketing. **Any** marketing SMS is out of scope (D5). The Quiet Hours rule and the STOP handling
   stay as a product decision (a driver must be able to say "stop texting this customer"), not a legal
   requirement.
8. **Delivery-report webhook contract (our own, in `apps/api`):** every provider event is written to
   `sms_events` keyed by the provider's event id (idempotent), the signature is verified **against the raw
   body** and **in constant time** (the Twilio 2026 rules, C26 #1220/#1218), unknown states are stored as
   `unknown` and never overwrite a terminal state, and the row is reconciled with the driver's next sync.

**Fallback chain:** Expo push → direct FCM/APNs → **the app polls on foreground/resume** (the courier's day is
foreground anyway) → **the local queue** (T7.1). For SMS: Telnyx → Sinch Engage → **the local outbox, flushed
when the network returns**. Nothing in the chain may block a driving-day action.

## 7. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **Push is never "delivered", only "accepted"** — we design as if it works | High | The receipt is modelled as a handoff; the device ACKs; the app polls on resume; **no driving-day action depends on a push** |
| **OEM kills delivery** (force-stop, One UI categories, battery restrictions) | High | Detect the manufacturer, coach once (dontkillmyapp.com + our own copy), offer the local queue as the real path, and use `delivery: 'alarmClock'` for the rare time-critical prompt |
| **The SMS number type is wrong** (long vs short code) and we provision the wrong thing | High | ADR proposal before any purchase; the founder's account team owns it (FOUNDER_TODO) |
| **A commercial-looking SMS breaches UEMA** (a discount message, an "offer") | High | Copy review in the tool layer: only exception templates; a template lint in CI; the HDCA principles as a pre-send check |
| **OneSignal's use-restricted licence sneaks into the bundle** | Medium | Not on the allow-list; `scripts/check-licenses.mjs` gate; record in `docs/LICENSES.md` |
| **An archived library is chosen because everyone uses it** (notifee, zo0r) | Medium | The shortlist is explicit; "release in the last 6 months" is a hard filter (V4 §3) |
| **R8/minification breaks the notification receiver** (SDK 58 turns R8 on by default) | Medium | expo-notifications fixed this in 58.0.10 (#50799); keep the ProGuard rules in the build and add a CI smoke test on the release build |
| **iOS 27 UIScene changes the background handler registration** | Medium | expo-notifications 58.x already forwards the delegate (#48313); test on the iOS 27 SDK in CI |
| **Notification noise** (Android 16 cooldown, driver complaints) | Medium | One audible channel, everything else silent, one banner per stop, measured (§4 "Noise") |
| **Cost creep on SMS** (plan minimums of $99–$2 399/mo) | Medium | API-first pricing only (Telnyx at $0.004/part); D5 keeps SMS optional; a per-courier spend cap in the admin console |
| **Rate limits** (600/s per project on Expo push) | Low | Batch and throttle in `apps/api`; a queue with retry |

## 8. Monthly radar filter

Re-run on the first working day of each month (V4 §11.3). A candidate stays on the radar only if it passes
**all** of:

1. a release or a pushed commit in the **last 90 days**;
2. a **permissive** licence (MIT / Apache-2.0 / BSD) **with no field-of-use restriction** — the OneSignal
   "Modified MIT" is the pattern to reject;
3. **New Architecture** support on the RN side (Nitro/TurboModule), or a plain Expo module;
4. **Expo SDK 58** compatible (npm publish inside the SDK 58 cycle) and no `expo install` conflict;
5. no open **high/critical** advisory (OSV + `pnpm audit`);
6. a licence file the GitHub licensee can classify (NOASSERTION is a yellow flag, not a red one);
7. ≥ 1 **distinct human** maintainer with a commit in 90 days.

**Watch-list triggers (re-check monthly):**

| Candidate | Trigger to act |
|---|---|
| `devkitshq/notifkit` | a v1.0 release **and** a documented New Architecture path → then re-read |
| `zackb/tether` | read its README (purpose still UNVERIFIED) → then decide |
| `mahdidavoodi7/react-native-continued-task` | 3 months of releases and one production user → then prototype the queue flush |
| `novuhq/novu` | it stops chasing agents for two consecutive months **and** the EE licence terms are read → then re-read the provider layer |
| `OneSignal` (SDK) | OneSignal publishes a plain-MIT SDK **or** we commit to OneSignal as the transport → then re-read the licence |
| RNFirebase messaging | Expo drops `getDevicePushTokenAsync` for our use case, or the APK budget breaks → then re-read |
| `expo-notifications` | any SDK 59 change to the push transport, the permission API or the foreground handler → re-read the changelog before every release |

## 9. What we could not verify

- **6-month star trend for every candidate** — the star timeline is 403 with our token; the proxies are
  releases/6 m, commits/90 d, humans/90 d and npm downloads/week.
- **Any delivery-rate number.** No vendor in this file publishes an NZ delivery rate, and we have not run one.
  The ≥95 %/≥98 % gates in §4 are **targets we set**, not measurements.
- **Twilio's NZ pricing** — `twilio.com/en-nz/sms/pricing` and `twilio.com/en-nz/pricing` both returned **404**
  on 2026-10-21. **Spark NZ's pricing and API** — `spark.co.nz/business/messaging` returned a Radware bot
  challenge on 2026-10-21. **2degrees NZ** — `2degrees.nz/en/business/sms/` returned **404**. **One NZ** — not
  fetched. **FCM and APNs pricing** — not fetched. All **UNVERIFIED**.
- **Telnyx's NZ rate** — the pricing index shows a global list price ($0.004 per message part); the NZ-specific
  rate and the NZ number type were not on the page.
- **The NZ A2P registration requirement itself** — Sinch states that NZ requires a dedicated **short code**
  rather than a long code, and that inbound charges may apply by short-code type. The **TCF industry code**
  itself (registration rules, lead times, who may apply) was **not read** → UNVERIFIED. Treat "short code" as a
  strong signal, not a legal opinion, and confirm with the founder's account team before any spend.
- **Whether UEMA's Schedule exempts our messages as "functional"** — the Commerce Commission summary (2026)
  lists "factual information about an ongoing relationship" and "products or services relating to a previous
  transaction" as outside UEMA, and the DIA guidance confirms the commercial-SMS mechanics. The **Schedule text
  itself was not read** → the legal position in §6.7 rests on the Commission's plain-language summary and should
  be confirmed by NZ counsel before launch.
- **OneSignal's New Architecture status** — the repo does not publish a compatibility matrix we could read; the
  npm package is version 5.5.15 with a plain `react-native` bridge.
- **`expo-notifications`' own R8/ProGuard rules** — we read the changelog (58.0.10, #50799) but **did not read
  the build file**; the CI smoke test in §4 must confirm it.
- **Whether `expo-notifications` sends silent/data pushes on Android under the New Architecture** — the API
  surface implies it (`setNotificationHandler`, `data` payloads), but we did not read the native
  `NotificationService` implementation → UNVERIFIED until the first on-device test.
- **The npm download counts** are for the single week **2026-10-12 → 2026-10-18**; they are a popularity
  proxy, not a health measure. `react-native-media-toolkit` (816/week) and `react-native-nitro-zxing` (831/week)
  show how small a "fresh" package can be and still be the right choice.
- **The issue lists** are the first page of `issues?state=…&since=2026-01-01`; GitHub's `since` filters by
  **updated**, so the created dates are reported per item rather than implied by the filter. **Closed-issue
  counts and median first-response times were not sampled** (the search API is 30 requests/minute and we spent
  the budget on the repo scans).
- **`react-native-onesignal`'s npm licence field says "MIT" while the repository `LICENSE` says "Modified MIT"
  with a use restriction.** The file wins; the discrepancy is unresolved and must be settled with OneSignal in
  writing before any SDK use.
