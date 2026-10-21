# Camera & proof of delivery — 2026 OSS + vendor research (V4 §3, redone at full depth)

**Research date: 2026-10-21.** Method: V4 §12 (≥30 candidates with full evidence cards, ≥10 shortlisted, top 5
deep-reviewed, benchmarks only where an eval set exists) + §12.6 anti-bias (newer/smaller challengers).
Every number was read from the live GitHub API, the npm registry, the npm downloads API or the vendor's own page
on **2026-10-21** unless the card says **UNVERIFIED**. Nothing is estimated, nothing is carried over unread.

**Card fields:** repo/vendor URL · stars + maintenance proxy · created · last release + date · release cadence ·
open issues · licence · **Expo SDK 58 / RN New Architecture / Android API level** · size · on-device vs server ·
advisories + supply chain · pricing · what it does better than our current choice · risks · **DECISION**.

## 0. Scope, our current choice, the bar

| Item | Verified 2026-10-21 |
|---|---|
| Camera in the app | **none yet** — `apps/mobile/package.json` pins **`react-native-vision-camera` 5.2.3** and **`react-native-nitro-modules` 0.37.1**, but **no camera screen exists** (`docs/squads/scanner/README.md`: "Code: `apps/mobile/src/scanner (to be created)`") |
| Expo camera modules | **not installed** — no `expo-camera`, no `expo-image-manipulator`, no `expo-media-library` in `package.json` (`expo-file-system` ~58.0.9 **is** installed) |
| Permissions | `app.json` `android.permissions` has **no `CAMERA`** and **no `READ_MEDIA_IMAGES`**; `ios.infoPlist` has **no `NSCameraUsageDescription`**; `app.json` sets **no `android.minSdkVersion`** |
| POD | **not started** — `docs/PARITY.md` row 23 (photo POD), row 24 (signature), row 26 (barcode) are all `Planned (task)` → **T7.9**; `docs/MASTER_EXECUTION.md` step 9 "POD (photo/signature/voice) + failed-delivery reasons" |
| Product rules that bind this area | **D4**: the default proof of delivery is the driver's word **"delivered"** — photo/signature/barcode are **optional**. **D2**: everything must be reachable by voice. **D5**: customer SMS is optional. V4 §10.2: the scanner is **on-device and offline**; "no images uploaded unless the driver chooses POD" |
| Squad targets (the bar) | `docs/squads/scanner/README.md`: **≤ 1.5 s per label** on a mid-range Android; **≥ 97 % correct recipient address**; **≤ 1 % wrong-block**. For POD we set the same shape: **a legible, durable POD photo in ≤ 1.5 s**, offline-safe |
| Locked decisions | Expo SDK 58 · RN New Architecture only · offline-first · **no PII leaving the device without consent** · plain NZ English · no emoji · APK ≤ 80 MB · cold start ≤ 2 s · battery ≤ 8 %/h |

### Three things must not be conflated

1. **The scanner camera** (T7.8) — a *continuous* camera that reads an address off a label. It is a **live frame
   processor** pipeline, it must never upload an image, and its budget is **1.5 s per label**.
2. **The POD camera** (T7.9) — a *still* photo of a delivered parcel, with a geo stamp and a timestamp, that
   must survive a dead zone and a crashed app. Its budget is **one tap → a durable, queued file**.
3. **The manifest camera** — photographing a printed manifest (a page, or several pages) and turning it into
   stops. Spoke shipped this on **2026-06-01** and it **uploads the file to their servers** (see §5).

The three share the camera permission, the compression path and the storage rules, and they have **different**
latency and privacy contracts. Our scanner squad has already chosen VisionCamera v5 and ML Kit
(`docs/squads/scanner/decisions.md`, 2026-10-20); this file is about the **camera/POD** half and about whether
that choice still holds.

### 6-month star trend — method note (proxy, as V4 §12.3 permits)

The star *timeline* is not readable with the token in `.env.local` (403). **Every "stars gained in 6 months"
figure is UNVERIFIED.** The proxy: **releases in the last 6 months · commits in the last 90 days · distinct human
maintainers in 90 days · npm downloads per week (2026-10-12 → 2026-10-18)**.

## Queries run

GitHub search + API reads through `scripts\gh.ps1`. All queries run **2026-10-21**.

| # | Query (literal) | Results returned | What it produced |
|---|---|---|---|
| 1 | `q=react+native+camera` | 10 | `margelo/react-native-vision-camera` 9 646★, `react-native-camera/react-native-camera` 9 625★ (**archived**), `react-native-image-picker` 8 631★, `ivpusic/react-native-image-crop-picker` 6 351★, `react-native-cameraroll` 1 079★, `Vydia/react-native-background-upload` 759★ |
| 2 | `q=expo+camera` | 10 | **dead query** — the SDK packages live inside the `expo/expo` monorepo, not in their own repos; found via the npm `repository` field instead |
| 3 | `q=proof+of+delivery+app` | 10 | **no usable OSS** — the best result was 78★ from 2021; POD is a closed product category |
| 4 | `q=proof+of+delivery+created:>2025-01-01` | 10 | **dead query** — noise (NFT projects, delivery simulators); confirms the OSS POD market is empty |
| 5 | `q=delivery+proof+photo` | 10 | same conclusion; `racmanuel/localpilot` (4★, GPL-2.0) is the only named OSS POD project |
| 6 | `q=react+native+image+compress` | 10 | `numandev1/react-native-compressor` 1 343★, `corasan/image-compressor` 44★, `sonnylazuardi/compressor` 13★ |
| 7 | `q=react+native+image+resize` | 10 | `bamlab/react-native-image-resizer` 1 660★, **`mrousavy/react-native-nitro-image` 653★**, `guhungry/react-native-photo-manipulator` 389★ |
| 8 | `q=signature+capture+react+native` | 10 | `RepairShopr/react-native-signature-capture` 962★ (**last commit 2021**), `maitrungduc1410/react-native-signature-ink` 36★ (2026-10-06) |
| 9 | `q=react+native+background+upload` | 10 | `Vydia/react-native-background-upload` 759★ (**stale 2024**), `Gautham495/react-native-nitro-cloud-uploader` 84★ (**2026 newcomer**), `kesha-antonov/react-native-background-downloader` 220★ |
| 10 | `q=react+native+image+picker` | 10 | `react-native-image-picker` 8 631★, `ivpusic/react-native-image-crop-picker` 6 351★, `NitrogenZLab/react-native-multiple-image-picker` 718★ |
| 11 | `q=react+native+camera+permissions` | 4 | **dead query**; `zoontek/react-native-permissions` (4 374★) found via the npm `repository` field |
| 12 | `q=react+native+file+upload` | 10 | `aroth/react-native-uploader` 510★ (2026-02-05), `HAPENLY/ReactNative-FileUpload` 271★ (2018) |
| 13 | `q=react+native+photo+capture` | 10 | `RoloBits/attestation-photo-mobile` 12★ (2026-02-16) — the only 2026 POD-ish project; `ventouxlabs/carnet` (AGPL-3.0) |
| 14 | `q=offline+queue+react+native+sync` | 10 | **no usable OSS** — the highest is 6★; our own event log (op-sqlite) is the answer |
| 15 | `q=react+native+nitro+modules+created:>2025-06-01` | 10 | `Gautham495/react-native-nitro-cloud-uploader` 84★, `thangdevalone/react-native-media-toolkit` 73★, `mahdidavoodi7/react-native-continued-task` 233★ — the 2026 Nitro wave |
| 16 | `q=image+upload+created:>2026-01-01` | 10 | `KnifeLemon/Filee` **7 647★, created 2026-09-29, 27 releases in 3 weeks** — the 2026 newcomer to watch |
| 17 | `q=camera+created:>2026-01-01+stars:>5` | 10 | **dead query** — returns AI/image-generation repos, not camera code |
| 18 | `q=expo+camera+created:>2024-01-01+stars:>20` | 4 | `pedrol2b/react-native-vision-camera-mlkit` 58★ (the OCR squad's alternative) |

Plus API reads: `repos/{o}/{r}` · `/releases` · `/commits?since=2026-07-23` · `/commits?path=packages/expo-camera`
· `/issues` · `/pulls` · `/contents` · `search/repositories` · **npm registry `/{package}`** · **npm downloads API
`point/last-week/{package}`**.

Web sources fetched **2026-10-21**: `expo.dev/changelog/sdk-58` (the `expo-camera` / `expo-file-system` /
`expo-media-library` entries) · `docs.expo.dev/versions/v58.0.0/sdk/notifications/` (the Expo module model) ·
`github.com/expo/expo/blob/main/packages/expo-notifications/CHANGELOG.md` (the Expo changelog pattern, used to
read the sibling camera changelog) · `raw.githubusercontent.com/OneSignal/react-native-onesignal/main/LICENSE`
(licence-read method) · `privacy.org.nz/privacy-principles/3/` · `consumerprotection.govt.nz/general-help/consumer-laws/online-safety-laws-and-rules`
(HDCA: "digital communications are any form of electronic message, including texts, emails, **photos and
recordings**") · `legislation.govt.nz` (the statute-reading method used by the notifications file).

## 1. Candidate pool — 44 cards (34 code cards C1–C34 + 10 platform, legal and vendor cards V1–V10)

### 1.1 Camera and capture

**C1 — `expo/expo` → `packages/expo-camera`** ⭐ https://github.com/expo/expo — **52 874 ★** /14 665 f · created
**2016-08-15** · pushed **2026-10-20** · **MIT** · **npm `expo-camera` 58.0.11 published 2026-10-19** · **1 789 747
downloads/week** · monorepo: **100+ commits/90 d, 36 humans** (paginated: 2 162 commits / 262 authors) · open
issues incl. PRs 929 · **Expo SDK 58: yes (it is SDK 58)** · New Architecture: yes (Expo Module) · on-device ·
**better than our current choice**: it is the **only** camera we can add **without a new native dependency
decision**, it ships the Expo config plugin for `cameraPermission`/`microphonePermission`/`recordAudioAndroid`
and `photoPermission`, and in SDK 58 it added **`CameraView.scanDocumentAsync` for multi-page document scanning
on Android and iOS** (#47362) — that is literally the **manifest camera flow** · risks: no frame processors, so
the scanner (which needs them) still has to use VisionCamera — **we would be running two camera stacks**; the
iOS implementation is a wrapper over AVFoundation · **DECISION: ADOPT for the POD still camera and the manifest
scan (config plugin, permissions, one stack for the driver-facing flows); keep VisionCamera for the scanner.**

**C2 — `expo/expo` → `packages/expo-image-manipulator` + `packages/expo-file-system` + `packages/expo-media-library`**
— `expo-image-manipulator` **58.0.15 @ 2026-10-19**, **2 128 904 downloads/week** (the most-downloaded package in
this file) · `expo-file-system` **58.0.10 @ 2026-10-19** (already in our `package.json` at ~58.0.9) ·
`expo-media-library` **58.0.11 @ 2026-10-19** · all **MIT** · same monorepo cadence as C1 ·
**better than ours**: **SDK 58 additions we read in the changelog** — `expo-file-system`: **`File.digest()`** (MD5 /
SHA-1 / SHA-256 / SHA-384 / SHA-512 — exactly what an upload integrity check needs), **`File.preview()`** and
**`File.canPreview()`**, and **`File.write()` is now async** (a breaking change we must not trip over);
`expo-media-library`: **`Asset.getUri()` now resolves the current Photos version of a video** (pass
`version: AssetUriVersion.ORIGINAL` for the original) · `expo-image-manipulator` is the **resize + re-encode**
step that turns a 4 MB camera frame into a 300 KB POD photo · risks: `expo-image-manipulator` is the single
most-downloaded package here, which also means it is the single most-attacked one — read the code before we
trust it · **DECISION: ADOPT (the compression and file layer; `expo-file-system` is already a dependency).**

**C3 — `margelo/react-native-vision-camera`** ⭐ https://github.com/margelo/react-native-vision-camera — **9 646 ★**
/1 397 f · created **2021-02-19** · pushed **2026-10-14** · **MIT** · last release **v5.2.3 @ 2026-08-21**
(60 releases, **16 in 6 m**) · **56 commits/90 d, 9 humans** · npm `react-native-vision-camera` **5.2.3 @
2026-08-20**, **353 105 downloads/week** · **our pin** (5.2.3) · New Architecture: **yes** (v5 is a **Nitro**
rewrite) · on-device · **better than our current choice**: it is the only camera with **worklet frame
processors**, so the scanner's OCR pipeline and the POD capture share **one camera session**; v5.2.3 also
exposes **metadata from `capturePhotoToFile`** (PR #4170, 2026-08-23) which is how we get the **EXIF/GPS
stamping** right · risks: see the 2026 issues in §3.1 — a **frame-thread leak (#4213)**, **iOS crashes on 17.7 /
18.6 (#4211)**, a **SIGABRT on Hermes GC (#4209)** and an **iOS "any JS exception inside a frame callback kills
the process" (#4219)**; plus **#4210: "CameraX and ML Kit prebuilts prevent a complete GNU_RELRO-compatible
package upgrade"** (an Android hardening blocker) · **DECISION: KEEP the 5.2.3 pin (scanner squad decision stands)
— but see §6: the POD flow must not depend on it until the leak and the RELRO issue are resolved.**

**C4 — `react-native-image-picker/react-native-image-picker`** https://github.com/react-native-image-picker/react-native-image-picker
— **8 631 ★** /2 070 f · created **2015-06-08** · pushed **2026-10-13** · **MIT** · last release **v8.3.1 @
2026-10-14** (**2 releases in 6 m**) · **5 commits/90 d, 3 humans** · npm **8.3.0 @ 2026-10-13**, **252 632
downloads/week** · 305 open issues (352 including pull requests) · New Architecture: yes (v8 is a TurboModule) · on-device ·
**better than ours**: it is the **standard "attach a photo" module** — it opens the system camera *or* the photo
library, and it returns a file URI with a known type · risks: **it launches another app for the camera**, which
is exactly what a courier must not do (two taps, another app, a lost context) — it is right for "attach an
existing photo", wrong for "capture a POD photo now" · **DECISION: KEEP for attaching a manifest photo the driver
already has; REJECT for the POD capture path.**

**C5 — `ivpusic/react-native-image-crop-picker`** https://github.com/ivpusic/react-native-image-crop-picker —
**6 351 ★** /1 611 f · created **2016-05-17** · pushed **2026-10-15** · **MIT** · last release **v0.52.0 @
2026-09-30** (**1 release in 6 m**) · **8 commits/90 d, 8 humans** · 100 open issues · on-device ·
**better than ours**: crop + rotate + compress in one native call, and the **"crop to the label"** gesture is
what makes a 1.5 s scan possible (the driver frames the address, we crop) · risks: another native camera stack;
its own camera implementation duplicates VisionCamera · **DECISION: WATCH (the crop gesture is the idea worth
stealing; the library is not).**

**C6 — `bamlab/react-native-image-resizer`** https://github.com/bamlab/react-native-image-resizer — **1 660 ★**
/361 f · created **2015-11-30** · pushed **2026-10-09** · **MIT** · last GitHub release **v3.0.11 @ 2024-11-26**
(38 releases, **0 in 6 m**) · **0 commits/90 d** on the default branch · npm `react-native-image-resizer`
**latest 1.4.5 @ 2021-06-16**, **17 911 downloads/week** · 1 open issue (3 including pull requests) · on-device ·
**better than ours**: the classic *"resize and compress in one native call"* module, which is the whole POD
compression job in one line · risks: **the npm `latest` tag is four years behind the GitHub tag** — anyone who
`npm i react-native-image-resizer` gets the 2021 build; the package also has **no New Architecture build** in the
old line · **DECISION: REJECT (stale, and `expo-image-manipulator` covers it inside the SDK we already use).**

**C7 — `mrousavy/react-native-nitro-image`** ⭐ https://github.com/mrousavy/react-native-nitro-image — **653 ★**
/41 f · created **2025-06-10** · pushed **2026-09-14** · **MIT** · last release **v0.15.2 @ 2026-08-21** (38
releases, **4 in 6 m**) · **12 commits/90 d, 1 human** · npm **0.15.2 @ 2026-08-20**, **128 323 downloads/week**
· 20 open issues (45 including pull requests) · New Architecture: yes (**Nitro**, the same runtime as VisionCamera v5) · on-device ·
**better than our choice**: it is the **2026 image library**: decode → crop → resize → **quality** →
**Base64**, all on the **UI thread without a bridge hop**, by the **same author** as VisionCamera (Marc
Rousavy) and on the **same Nitro runtime** — so it composes with the scanner pipeline and with our app's
`expo-file-system` writes · risks: **one maintainer**; three open issues that matter to us — **#173 "EXIF
orientation is not applied on decode (Android rotates, iOS disagrees with itself)"**, **#175 "<NitroImage />
emits no load or error events"**, **#176 "dropImage() does not release the decoded image, and there is no shared
cache, budget or memory-pressure hook"** (that is a **memory leak on a 200-parcel day**) ·
**DECISION: WATCH (the 2026 candidate for our decode/rotate/compress step; benchmark it against
`expo-image-manipulator` before we pick).**

**C8 — `numandev1/react-native-compressor`** https://github.com/numandev1/react-native-compressor — **1 343 ★**
/151 f · created **2021-05-28** · pushed **2026-07-25** · **MIT** · last release **v2.0.3 @ 2026-07-26** (**14
releases in 6 m**) · **2 commits/90 d, 2 humans** · npm **2.0.3 @ 2026-07-25**, **142 300 downloads/week** · 34
open issues · on-device · **better than ours**: a broad **image + video compression** surface (JPEG, PNG, WebP,
HEIC) with a **quality/resize API** — one call for "make this 1600 px wide at 70 % quality" ·
risks: **2 commits in 90 days** on a 1 343-star project; a video path we do not need adds surface ·
**DECISION: WATCH.**

**C9 — `guhungry/react-native-photo-manipulator`** https://github.com/guhungry/react-native-photo-manipulator —
**389 ★** /44 f · created **2019-03-21** · pushed **2026-02-16** · **MIT** · last release **v1.9.2 @ 2025-01-31**
(35 releases, 0 in 6 m) · 13 open issues · on-device · **better than ours**: the crop-and-save path with the
**Android `MediaStore` save** built in (a POD photo that lands in the gallery as well as in our queue) ·
risks: no release in 21 months; gallery writes are a **privacy question** we do not want by default ·
**DECISION: WATCH (read the MediaStore code; do not save to the gallery by default).**

**C10 — `thangdevalone/react-native-media-toolkit`** ⭐ (2026 newcomer) https://github.com/thangdevalone/react-native-media-toolkit
— **73 ★** /4 f · **created 2026-04-02** · pushed **2026-10-17** · **MIT** · last release **v2.4.2 @ 2026-10-17**
(**27 releases, 16 in 6 m**) · **18 commits/90 d, 5 humans** · 0 open issues · npm **2.4.2 @ 2026-10-17**, **816
downloads/week** · New Architecture: yes (**Nitro**, Android native bindings landed 2026-10-16) · on-device ·
**better than ours**: it is the only 2026-native **media toolkit** that does compress + trim + photo-library
import on **both** platforms, and it handles **`ph://` URIs on iOS** (PR #10, 2026-10-07) and **falls back to a
software encoder** when the hardware encoder fails (PR #14, 2026-10-15) · risks: **816 downloads/week** — almost
nobody uses it; 6 months old; **DECISION: WATCH (the 2026 newcomer with the right shape; benchmark it if
`expo-image-manipulator` cannot hit our 1.5 s).**

**C11 — `YanYuanFE/react-native-signature-canvas`** https://github.com/YanYuanFE/react-native-signature-canvas —
**507 ★** /165 f · created **2018-08-13** · pushed **2026-09-12** · **MIT** · last release **v5.1.1 @ 2026-08-06**
(7 releases, 1 in 6 m) · **2 commits/90 d, 1 human** · npm **5.1.1 @ 2026-08-06**, **129 662 downloads/week** ·
81 open issues (97 including pull requests) · **better than ours**: it is the **live** signature library (the popular one), and 2026 brought a
**security hardening commit** — `98f158d` 2026-07-05 "fix: harden string injection, prop handling, and WebView
bridge" — and a rendering fix `369aa57` 2026-08-06 "fix: paint initial dataURL only once via ResizeObserver
resize path" · risks: **it is a WebView** — a WebView inside the POD flow is heavy, it costs cold start, and the
open issues are all about it: **#378 (2025-03-26) "Signature Not Working on iOS in react-native-signature-canvas
(RN 0.78.1)"**, #370 (2024-11-25) "not working on ios device and simulator", **#368 (2024-11-18) "Signature
vanishes in iOS and in android not able to scroll after changing orientation"**, #369 (2024-11-21) "Intermittent
Issue with Multiple Signatures: Duplicate Saved Signatures", #357 (2024-03-28) "Invariant Violation: Failed to
call into JavaScript module method WebViewMessageHandler1.onMessage()" ·
**DECISION: WATCH — but we should write our own signature surface instead of shipping a WebView (see §6).**

**C12 — `RepairShopr/react-native-signature-capture`** https://github.com/RepairShopr/react-native-signature-capture
— **962 ★** /506 f · created **2015-07-09** · **last push 2024-07-17** · **last commit 2021-06-07** · **MIT** ·
**no GitHub releases** · **0 commits/90 d** · 136 open issues (197 including pull requests) · **better than ours**: none that survives the
maintenance check · risks: **#308 (2025-01-15) "New architecture support"** — the blocker for us; **#301
(2024-03-17) "Signature capture crashing on ios 17.4"**; **#302 (2024-03-27) "iOS privacy manifest"** — an App
Store rejection risk; **#304 (2024-05-22) "android dragging produces nothing"**; #300 (2024-02-26) save/clear
with multiple signatures · **DECISION: REJECT (dead since 2021, no New Architecture, no privacy manifest).**

**C13 — `react-native-camera/react-native-camera`** https://github.com/react-native-camera/react-native-camera —
**9 625 ★** /3 499 f · created **2015-04-01** · **ARCHIVED** · last push **2023-06-07** · default branch
`deprecation-note` · last release **v4.2.1 @ 2021-09-22** · 100 open issues · **DECISION: REJECT (archived).**

**C14 — `teslamotors/react-native-camera-kit`** https://github.com/teslamotors/react-native-camera-kit — **2 712 ★**
/636 f · created **2016-04-13** · pushed **2026-08-03** · **MIT** · last release **v18.0.1 @ 2026-08-04** (2 in
6 m) · **4 commits/90 d, 1 human** · 100 open issues · **better than ours**: a batteries-included camera with
zoom, flash and a **gesture API** · risks: one maintainer; it is not frame-processor based ·
**DECISION: WATCH (a readable reference implementation of a camera's ergonomics).**

**C15 — `react-native-cameraroll/react-native-cameraroll`** https://github.com/react-native-cameraroll/react-native-cameraroll
— **1 079 ★** /445 f · created **2019-02-07** · pushed **2026-10-15** · **MIT** · last release **v7.10.2 @
2025-08-06** (85 releases, 0 in 6 m) · **0 commits/90 d** · npm `@react-native-camera-roll/camera-roll` **7.10.2
@ 2025-08-06** · 15 open issues · **better than ours**: the **gallery** side — and the reference for the
**Android 13+ `READ_MEDIA_IMAGES` / partial-photo-access** model and the iOS photo-library permission ·
risks: **the gallery is the wrong default for a POD photo** (it means the driver picks an old photo) ·
**DECISION: REJECT for POD; KEEP (the permission reference).**

**C16 — `zoontek/react-native-permissions`** https://github.com/zoontek/react-native-permissions — **4 374 ★**
/848 f · created **2016-03-24** · pushed **2026-10-16** · **MIT** · last release **5.6.3 @ 2026-10-17** (60
releases, 6 in 6 m) · **10 commits/90 d, 2 humans** · npm **5.6.3 @ 2026-10-16**, **377 377 downloads/week** ·
**better than ours**: the **camera permission model** — `PERMISSIONS.IOS.CAMERA`, `PERMISSIONS.ANDROID.CAMERA`,
`checkCameraPermission`, and, critically, the **"blocked" vs "denied"** distinction and the **"open settings"**
dead-end, which is the difference between "please allow the camera" and "the courier is stuck" · risks: a
permission library is a wide surface; but we need **both** the notification and the camera permission, so one
library for both is cheaper than two · **DECISION: ADOPT (the permission layer for camera + notifications).**

### 1.2 Compression, upload and storage

**C17 — `expo/expo` → `packages/expo-image-manipulator`** (see C2 for the numbers) — **the in-SDK compression
path**: resize + re-encode to JPEG/WebP with a quality parameter, on device, **without a new native dependency** ·
**DECISION: ADOPT (first choice for the POD compression step; benchmark against C7).**

**C18 — `Gautham495/react-native-nitro-cloud-uploader`** ⭐ (2026 newcomer) https://github.com/Gautham495/react-native-nitro-cloud-uploader
— **84 ★** /4 f · created **2025-11-28** · pushed **2026-09-07** · **MIT** · last release **v2.0.3 @ 2026-09-08**
(16 releases, 5 in 6 m) · **10 commits/90 d, 2 humans** · 0 open issues · New Architecture: Nitro · on-device ·
**better than ours**: a **2026-native background uploader** for cloud storage, on the Nitro runtime ·
risks: **84★, two maintainers, no production users**; the "cloud" it targets is unverified ·
**DECISION: WATCH (read it before we write our own upload worker).**

**C19 — `Vydia/react-native-background-upload`** https://github.com/Vydia/react-native-background-upload —
**759 ★** /357 f · created **2016-12-13** · **last push 2024-04-01** · last release **v6.6.0 @ 2022-10-08** (35
releases, 0 in 6 m) · **0 commits/90 d** · licence: GitHub **MIT**, npm metadata **BSD-3-Clause** (discrepancy
noted) · npm **6.6.0 @ 2022-10-07**, **3 388 downloads/week** · 100 open issues · **better than ours**: the
classic **background upload with an `NSURLSession`/upload-service** implementation that survives the app being
suspended · risks: **stale since 2022**, the classic iOS background-upload approach that Apple has since
restricted; **DECISION: REJECT.**

**C20 — `kesha-antonov/react-native-background-downloader`** https://github.com/kesha-antonov/react-native-background-downloader
— **220 ★** /49 f · created **2024-02-16** · pushed **2026-09-15** · licence **NOASSERTION** · last release
**v4.6.3 @ 2026-09-16** (**8 releases in 6 m**) · **57 commits/90 d, 4 humans** · 1 open issue · on-device ·
**better than ours**: the **fastest-moving** file-transfer library in this file (57 commits/90 d), and its
download path is the mirror of our POD upload path · risks: licence not classified; it is a downloader, not an
uploader · **DECISION: WATCH (the transfer-engine reference for our upload worker).**

**C21 — `KnifeLemon/Filee`** ⭐ (2026 newcomer) https://github.com/KnifeLemon/Filee — **7 647 ★** /462 f ·
**created 2026-09-29** · pushed **2026-10-20** · **MIT** · last release **v1.12.0 @ 2026-10-19** (**27 releases in
3 weeks**) · **100+ commits/90 d, 6 humans** · 57 open issues (66 including pull requests) · **better than ours**: the **2026 image-file
utility** — it appeared at the top of `image upload created:>2026-01-01` with an implausible star count for a
three-week-old project; it may be a **file/compression toolkit** that covers our POD path ·
risks: **the stars are not explained by the commit history** (7 647★ and 6 humans in 3 weeks); we did not read
the README → **what it does: UNVERIFIED**; the licence is MIT but the *pattern* (instant stars) is a supply-chain
yellow flag · **DECISION: WATCH (read it before we trust it; do not install it into the app on the strength of
stars).**

**C22 — `tus/tus-js-client`** https://github.com/tus/tus-js-client — **2 630 ★** /338 f · created **2015-04-06** ·
pushed **2026-10-13** · **MIT** · last release **v5.0.0-pre3 @ 2026-09-30** (43 releases, 1 in 6 m) · **25
commits/90 d, 5 humans** · 56 open issues (85 including pull requests) · server/client library · **better than ours**: the **resumable
upload** protocol — a POD photo uploaded in a dead zone can resume from the byte offset instead of restarting,
which is the difference between "the proof exists" and "the proof was lost" · risks: it needs a tus server (or
an S3 adapter); the JS client is **not React Native** (it is browser/Node oriented) → we would implement the
protocol, not import it · **DECISION: WATCH (the protocol to specify; the server to evaluate).**

**C23 — `op-engineering/op-sqlite`** https://github.com/op-engineering/op-sqlite — **1 049 ★** /92 f · created
**2023-11-06** · pushed **2026-09-29** · **MIT** · last release **18.2.5 @ 2026-09-21** (100 releases, **30 in
6 m**) · **76 commits/90 d, 7 humans** · 8 open issues (12 including pull requests) · **our pin** (18.2.5) · on-device · **better than our
choice**: it is already the **event-log store** that T7.1 depends on, so the POD queue needs **no new
dependency** — the queue is a table of `pod_capture` rows with a `state` column (`queued → uploaded →
confirmed`), and it is replayed by the same sync engine that already exists · risks: none material; the queue
must not store **image bytes** in SQLite (see §6) · **DECISION: KEEP (the queue lives here).**

**C24 — `mrousavy/react-native-mmkv`** https://github.com/mrousavy/react-native-mmkv — **8 518 ★** /345 f · created
**2021-02-24** · pushed **2026-10-08** · **MIT** · last release **v4.3.2 @ 2026-06-22** (100 releases, 1 in 6 m) ·
**8 commits/90 d, 3 humans** · 24 open issues (including pull requests; the issue-only count was not re-read) · on-device · **better than our choice**: the fastest key-value
store for the **queue metadata** (the photo path, the bytes, the retry count) · risks: **we already have
op-sqlite for structured data** — two stores is worse than one · **DECISION: REJECT (op-sqlite is enough).**

**C25 — `itinance/react-native-fs`** https://github.com/itinance/react-native-fs — **5 044 ★** /1 012 f · created
**2015-05-08** · last push **2024-03-18** · **MIT** · last release **v2.20.0 @ 2022-05-05** (40 releases, 0 in
6 m) · **0 commits/90 d** · **better than ours**: none we need · risks: stale; and `expo-file-system` is already
installed and is the SDK-blessed path · **DECISION: REJECT.**

**C26 — `seaweedfs/seaweedfs`** https://github.com/seaweedfs/seaweedfs — **35 632 ★** /3 080 f · created
**2014-07-14** · pushed **2026-10-20** · **Apache-2.0** · last release **4.48 @ 2026-09-29** (**27 releases in
6 m**) · **100+ commits/90 d, 17 humans** · server · **better than our choice**: an **Apache-2.0 S3-compatible
object store** we can self-host on the Oracle Cloud free tier, which is where the POD photos would live ·
risks: operating a storage cluster; S3 compatibility is "mostly" · **DECISION: WATCH (the self-host option if
the founder's account rules forbid a third-party photo store).**

**C27 — `versity/versitygw`** https://github.com/versity/versitygw — **3 050 ★** /321 f · created **2023-05-05** ·
pushed **2026-10-20** · **Apache-2.0** · last release **v1.9.0 @ 2026-10-14** (6 in 6 m) · **100+ commits/90 d,
13 humans** · server · **better than ours**: a **lighter S3 gateway** (Go) that fronts MinIO or Ceph ·
risks: same operational class as C26 · **DECISION: WATCH.**

**C28 — `minio/minio`** https://github.com/minio/minio — **61 313 ★** /8 200 f · created **2015-01-14** ·
**ARCHIVED** · last push **2026-04-24** · **AGPL-3.0** · last release **RELEASE.2025-10-15T17-29-55Z @ 2025-10-17**
· 0 commits/90 d · **DECISION: REJECT — AGPL-3.0 (V4 §11.2 clean-room only) and the repository is now
archived.** (Do not plan the POD store on MinIO.)

**C29 — `mrousavy/react-native-nitro-zxing`** https://github.com/margelo/react-native-nitro-zxing — **91 ★** /5 f
· created **2026-08-25** · pushed **2026-10-20** · **MIT** · last release **v0.1.0 @ 2026-10-09** · **9 commits/90 d,
2 humans** · npm **0.1.0 @ 2026-10-08**, **831 downloads/week** · Nitro · on-device · **better than ours**: the
**barcode** half of POD ("scanned the parcel, it is this stop") — the scanner squad already adopted it
provisionally · risks: two months old · **DECISION: KEEP (carried over from the OCR file; not re-litigated
here).**

**C30 — `margelo/react-native-vision-camera-barcode-scanner`** — the **official** multi-barcode package inside
the VisionCamera monorepo — npm **5.2.3 @ 2026-08-20 MIT**, **34 973 downloads/week** · on-device ·
**DECISION: KEEP (scanner squad).**

**C31 — `jamenamcinteer/react-native-vision-camera-ocr-plus`** — from `docs/research/2026/ocr-label-scanning.md`
— **73 ★**, `v2.0.6` @ 2026-08-20, **MIT + Google ML Kit (proprietary terms)**, npm **7 796 downloads/week** ·
**DECISION: ADOPT (scanner squad; the on-device OCR that reads the label).**

**C32 — `pedrol2b/react-native-vision-camera-mlkit`** — from the OCR file — **58 ★**, `v2.0.1` @ 2026-08-20, npm
**662 downloads/week** · **DECISION: ADOPT (the alternative OCR; benchmark both).**

**C33 — `hypersocialinc/shots`** https://github.com/hypersocialinc/shots — **248 ★** /26 f · **created 2026-04-25**
· last push **2026-04-27** · licence **NOASSERTION** · no releases · **0 commits/90 d** · 0 open issues ·
**better than ours**: a **2026 screenshot-testing** tool — exactly what a camera screen needs, because a camera
preview cannot be asserted by unit tests and the Maestro visual-regression gate (V4 §2) needs a way to compare
a camera screen · risks: two months old, no release, no licence file → **DECISION: WATCH (the visual-regression
answer for camera screens).**

**C34 — `expo/eas-cli`** https://github.com/expo/eas-cli — **1 370 ★** /256 f · created **2020-08-12** · pushed
**2026-10-20** · **MIT** · **100+ commits/90 d, 17-37 humans** · 262 open issues incl. PRs · **better than ours**:
it is where the **Android permissions, the camera config plugin and the build profile** are declared, and where
the **EAS "development build"** for a camera app is produced · risks: CI-only · **DECISION: KEEP (tooling).**

### 1.3 Platform, legal and vendor cards

**V1 — iOS 27 / UIScene** https://expo.dev/changelog/sdk-58 (read **2026-10-21**) — *"the iOS 27 SDK requires the
UIScene life cycle, so `npx expo prebuild` now generates SceneDelegate.swift and a `UIApplicationSceneManifest`
entry in Info.plist"*. Any camera/permission flow must survive a scene reconnect, not just an app launch.
**V2 — Android `READ_MEDIA_IMAGES` / partial photo access** — the **exact API-level behaviour of Android 13/14/15
photo access was NOT verified on 2026-10-21 → UNVERIFIED**; what we did verify from the vendor documentation
(Pushwoosh, OneSignal, Android Help) is the **notification** side: Android 13+ runtime `POST_NOTIFICATIONS`, and
Android 12+ "Restricted battery" and app hibernation. **V3 — the EXIF/GPS question** — VisionCamera issue **#4216
(2026-10-13) "iOS: recorded video location is written without ISO 6709 fixed-width degrees, Photos drops it"** is
the concrete proof that **geo metadata formatting is not a detail**; and `nitro-image` issue **#173 (2026-08-24)
"EXIF orientation is not applied on decode"** proves the same for orientation. **V4 — NZ Privacy Act 2020**
https://www.privacy.org.nz/privacy-principles/3/ (read 2026-10-21) — the OPC's IPPs 1–13 are the working
reference (IPP 3 collection notice, **IPP 5 storage and security**, **IPP 9 retention**, **IPP 11 disclosure**,
**IPP 12 disclosure outside New Zealand**), and the OPC publishes **Privacy Impact Assessment** guidance and a
**privacy statement generator**; a POD photo of a house front, with a timestamp and a GPS fix, is **personal
information** (the address is identifiable). **V5 — HDCA** https://www.consumerprotection.govt.nz/general-help/consumer-laws/online-safety-laws-and-rules
(read 2026-10-21) — "digital communications are any form of electronic message, including texts, emails, **photos
and recordings**" with 10 principles and Netsafe complaint powers — a driver photographing a house is inside
this. **V6 — the App Store / Play photo rules** — the **privacy-manifest** requirement is evidenced by
`react-native-signature-capture` issue **#302 (2024-03-27) "iOS privacy manifest"**; the Play **Data safety**
declaration was not read → **UNVERIFIED**. **V7 — Cloudflare R2** https://developers.cloudflare.com/r2/ —
**pricing UNVERIFIED (not fetched on 2026-10-21)**; relevance: an S3-compatible store with an egress-free
model, the natural home for POD photos. **V8 — AWS S3** https://aws.amazon.com/s3/pricing/ — **UNVERIFIED**.
**V9 — Backblaze B2** https://www.backblaze.com/cloud-storage/pricing — **UNVERIFIED**. **V10 — Cloudinary /
imgproxy** — **UNVERIFIED**, and both would put the photo through a third party, which conflicts with "no PII
leaving the device without consent" unless the driver chooses POD.

## 2. Shortlist (13)

| # | Candidate | Decision | One-line reason |
|---|---|---|---|
| C3 | **`react-native-vision-camera` 5.2.3** (our pin) | **KEEP for the scanner; NOT for POD until the 2026 blockers clear** | 9 646★, MIT, Nitro, 16 releases/6 m, 353 k downloads/week — but #4213 (frame-thread leak), #4211 (iOS crash), #4209 (SIGABRT) and #4210 (RELRO) are open on our exact pin. |
| C1 | **`expo-camera` 58.0.11** | **ADOPT (POD still camera + manifest scan)** | 1.79 M downloads/week, MIT, config-plugin permissions, and SDK 58's `scanDocumentAsync` (#47362) is the multi-page manifest flow we owe Spoke. |
| C2/C17 | **`expo-image-manipulator` 58.0.15 + `expo-file-system` 58.0.10** | **ADOPT (the compression and file layer)** | 2.13 M downloads/week; `File.digest()` gives us the upload checksum, `File.write()` is async in SDK 58, and `expo-file-system` is already installed. |
| C16 | **`react-native-permissions` 5.6.3** | **ADOPT (camera permission UX)** | 377 k downloads/week; the blocked-vs-denied distinction and the "open settings" path are what stop a courier being stuck at a doorstep. |
| C23 | **`op-sqlite` 18.2.5** (our pin) | **KEEP (the POD queue)** | The queue is a table in the event log we already have — no new dependency, and it inherits the offline chaos tests. |
| C7 | **`react-native-nitro-image` 0.15.2** | **WATCH (the 2026 decode/compress candidate)** | Nitro, same author as VisionCamera, 128 k downloads/week — but #173 (EXIF orientation), #175 (no load events) and #176 (decoded image not released) are open. |
| C10 | **`react-native-media-toolkit` 2.4.2** | **WATCH (2026 newcomer)** | 16 releases/6 m, Nitro Android bindings, `ph://` support and a software-encoder fallback — but 816 downloads/week. |
| C18/C20 | **`react-native-nitro-cloud-uploader` · `react-native-background-downloader`** | **WATCH (the upload worker reference)** | The 2026-native uploader and the fastest-moving transfer library; we write our own worker, but we should not write it blind. |
| C11/C12 | **`react-native-signature-canvas` (YanYuanFE) · `react-native-signature-capture` (RepairShopr)** | **WATCH / REJECT** | The live one is a WebView with 81 open issues (#378 iOS not working, #369 duplicate signatures); the popular one has not been committed to since 2021 and has no New Architecture (#308). **We will draw our own signature surface.** |
| C4/C5/C9 | **`react-native-image-picker` · `react-native-image-crop-picker` · `react-native-photo-manipulator`** | **REJECT for the POD path / KEEP (one idea each)** | The picker launches another app (two taps, lost context); the crop-picker duplicates the camera stack; the photo-manipulator writes to the gallery, which we do not want by default. |
| C6/C8/C19/C25/C24 | **`react-native-image-resizer` · `react-native-compressor` · `react-native-background-upload` · `react-native-fs` · `react-native-mmkv`** | **REJECT** | Stale (2021 npm tag, 2022 release, 2022 release, 2024 push) or redundant with `expo-image-manipulator` and `op-sqlite`. |
| C15/C33 | **`react-native-cameraroll` · `hypersocialinc/shots`** | **WATCH (references, not dependencies)** | The gallery permission model is the reference for photo access; a 2026 screenshot-testing tool is the answer to "how do we test a camera screen". |
| C22/C26/C27/C28 | **`tus-js-client` · `seaweedfs` · `versitygw` · `minio`** | **WATCH (storage) / REJECT (minio)** | Resumable upload (tus) plus an Apache-2.0 self-hostable store (seaweedfs, versitygw); **MinIO is AGPL-3.0 and its repository is archived** — do not plan on it. |

## 3. Deep review — top 5 (code, commits, PRs and issues in the 2026 window)

### 3.1 `margelo/react-native-vision-camera` (C3) — our pinned camera

**What I read.** The commit history of `main` (2026-08-20 → 2026-10-14), the 5 most recent PRs, and **the open
issues** (`issues?state=open&per_page=30`, PRs filtered out) — the issue list is the important part, because
those are the *2026* defects on *our exact pin* (5.2.3).

**Commits:** `1a69f29` **2026-10-14** "fix: prevent CameraX executor starvation (#4218)" — Ismael Moreira ·
`91bae1f` 2026-08-29 "chore: Update links for the move to the margelo org (#4176)" — Marc Rousavy (the repo
**moved from `mrousavy/` to `margelo/`**; our `docs/LICENSES.md` still says `react-native-vision-camera | unknown`
and must be corrected) · `3becbfd` 2026-08-26 "feat: Add native zoom gesture change listener (#4171)" ·
`050ceac` 2026-08-26 "feat: Add native tap-to-focus lifecycle listeners (#4172)" · **`1ca9b7b` 2026-08-23 "feat:
expose metadata from capturePhotoToFile (#4170)"** — this is the POD geo/timestamp story · `8015396` 2026-08-21
"fix: Deep-compare `constraints` instead of `JSON.stringify`-ing them (#4167)" · `2ae908a` 2026-08-21 "fix:
Memoize `targetResolution` in output hooks (#4166)" · `b8c89ea` 2026-08-20 "chore: release 5.2.3".

**PRs:** #4051 (open, created 2026-06-29) "feat: Bump gradle-wrapper from 9.3.1 to 9.8.1 …" · #4050 (open,
2026-06-26) "feat: Bump com.google.android.gms:play-services-location from 21.3.0 to 21.4.0 …" · **#4227** (open,
created **2026-10-19**) "fix: Let the Frame Output thread exit once nothing uses it" · **#4228** (open, created
**2026-10-20**) "fix: Mute shutter sound below iOS 18 and on silent/vibrate Android" · **#4212** (open, created
**2026-10-06**) "test: frame output thread keeps accepting work after dispose()".

**Open issues (created dates are the real ones):**
**#4219** (2026-10-14) "🐛 iOS release: any JS exception inside a frame callback kills the process — generated
`Func_*_Wrapper::call` is noexcept but invokes throwing `std::function::operator()`" ·
**#4217** (2026-10-13) "Android (vision-camera-location): `HybridLocationManager` never quits its HandlerThread on
dispose" · **#4216** (2026-10-13) "iOS: recorded video location is written without ISO 6709 fixed-width degrees,
Photos drops it" · **#4213** (2026-10-06, 3 comments) "🐛 [Android] Each FrameOutput leaks its native thread
(dispose() doesn't shut down the executor; `useFrameOutput` never disposes)" · **#4211** (2026-10-06) "🐛 [IOS]
Camera Screen crashes for IOS17.7 and IOS18.6 using v5" · **#4210** (2026-10-05, 1 comment) "Android: CameraX and
ML Kit prebuilts prevent a complete GNU_RELRO-compatible package upgrade" · **#4209** (2026-10-05) "🐛 [iOS] SIGABRT
in `detachFromFigCaptureSession` when a `CameraSession` is freed by Hermes GC — still on 5.2.3 and `main`
(follow-up to #4026)" · #4208 (2026-10-02) "PreviewView.onPreviewStarted: Value is null" · #4207 (2026-10-02)
"`Frame.hasPixelBuffer` is true for PRIVATE frames but `getPixelBuffer()` throws 'Unknown HardwareBuffer
format'" · #4205 (2026-10-02) "`getSupportedResolutions('video')` advertises stream sizes the Recorder cannot
record" · #4203 (2026-10-02) "`supportedPixelFormats` contains 'unknown' (JPEG mapped to UNKNOWN)".

**What this changes in our plan.**
1. **#4213 + #4227 + #4212** are a **memory-leak story on our exact workload**: a courier with a 200-stop day
   opens the scanner many times; a leaked native thread per `FrameOutput` is a leak per session. **The POD flow
   must not run on VisionCamera until #4227 lands**, or we must dispose explicitly and measure.
2. **#4210** is an **Android hardening finding**: the CameraX + ML Kit prebuilts stop a full GNU_RELRO package
   upgrade. Our security gate (V4 §7, `semgrep`/`CodeQL`/APK hardening) must record an accepted exception with a
   reason, or we lose the hardening check for the whole app.
3. **#4219** is a **crash-the-app-from-a-frame-callback** hazard: a JS exception inside a worklet kills the
   iOS process. Our OCR worklet must wrap everything.
4. **#4170** (metadata from `capturePhotoToFile`) is the **POD geo/timestamp enabler**; **#4216** warns that the
   location metadata format must be **ISO 6709 fixed-width degrees** or the platform drops it — so the geo stamp
   goes in **our database**, not (only) in the file's EXIF.
5. **#4228** (open) is about the **shutter sound** — a courier in a van at 6 a.m. does not want a shutter click.
   The fix is on `main`, not in 5.2.3.

**Verdict.** Keep the 5.2.3 pin for the **scanner** (the OCR squad's decision, with the frame-processor
requirement), but the **POD still camera and the manifest scan should be `expo-camera`** until VisionCamera's
2026 blockers are resolved and a v5.3 lands. Update `docs/LICENSES.md` (it says "unknown" for VisionCamera; the
licence is MIT) and the repo URL (`margelo/`, not `mrousavy/`).

### 3.2 `expo/expo` → `packages/expo-camera` (C1)

**What I read.** The `expo-camera` commit path (8 commits, 2026-10-02 → 2026-10-19) and the **SDK 58 changelog
page** (read 2026-10-21) for the camera entries.

**Commits on `packages/expo-camera`:** `8cf1be5` 2026-10-19 "Version packages (main) (#51824)" · `d7a68af`
2026-10-13 (#51324) · `e180d56` 2026-10-07 "chore(internal-scripts): Rename `expo-module-scripts` to
`@expo/internal-scripts` [2/2] (#51221)" · `27a2ebd` 2026-10-05 (#51006) · **`52a8b20` 2026-10-05 "[android][camera]
Fix barcode scanning stalling on frames without an image (#51050)"** — Alan Hughes · **`9677b35` 2026-10-05
"[ios][camera] Reject `recordAsync()` when a recording is already active (#51049)"** · `f1c525a` 2026-10-03
(#50929) · `88dc392` 2026-10-02 "[workspace] Upgrade `jest` to `^30.0.0` (#50427)".

**What I checked in the SDK 58 changelog:** the **`expo-camera` entry** — *"added `CameraView.scanDocumentAsync`
for multi-page document scanning on Android and iOS (#47362)"* — that is the **manifest camera flow**: the
driver photographs the manifest, the module detects the pages, and we OCR each page **on device** (our own rule:
no image leaves the device). Also read: the **`expo-file-system`** entry (**`File.digest()`** for MD5/SHA-1/SHA-256/
SHA-384/SHA-512, **`File.preview()`**, **`File.canPreview()`**, and **`File.write()` is now async**), and the
**`expo-media-library`** entry (**`Asset.getUri()` now resolves the current Photos version of a video**; pass
`version: AssetUriVersion.ORIGINAL` for the original). Two 2026 facts that change our implementation: **R8 is
enabled by default in release builds** (so any native dependency we add needs keep-rules — the same class of
problem as the OneSignal R8 issue in the notifications file), and **`expo-media-library`'s video-URI change** means
any manifest PDF/video import must pass the version explicitly.

**PRs in the window** (repo-wide): #51924 (open, 2026-10-20) "[router] Add accessibility labels to header search
buttons" · #51920 (open, 2026-10-20) · #51905 (open, 2026-10-20) · #51695 (open, 2026-10-16) · #51894 (open,
2026-10-20).

**Open issues updated in the window** (`since=2026-01-01`, first page): #51916 (created 2026-10-20) "[expo-router]
Stack.Protected … (SDK 58)" · #51910 (created 2026-10-20) "[router][web] The header search buttons from
headerSearchBarOptions have no accessible name" · #51907 (created 2026-10-20) "[ui][android] A TextInput remounted
right after its first render logs 'Cannot use shared object that was already released'". No camera-specific
issue appeared on the first page of the monorepo's issue list in 2026 — a sign that the camera package is
**quietly maintained**, not neglected.

**Verdict.** `expo-camera` is the right camera for the **driver-facing** flows (POD still, manifest scan): it is
in the SDK, it owns the permissions through the config plugin, it has the document scan, and it does not carry
the VisionCamera 2026 defects. It cannot replace VisionCamera for the **scanner**, which needs frame
processors — so we knowingly run **two camera stacks**, and the scanner must be the only one with a live preview.

### 3.3 `mrousavy/react-native-nitro-image` (C7)

**What I read.** The commit history (2026-08-06 → 2026-09-14), the 6 most recent PRs, and the open issues.

**Commits:** `c96240d` 2026-09-14 "chore: upgrade Harness to 1.5.0 (#179)" · `0d5fb00` 2026-08-25 "feat: add
Base64 image encoding (#177)" · **`6d2b6df` 2026-08-23 "fix: unify image quality behavior and docs (#171)"** ·
`7eca830` 2026-08-20 "chore: release 0.15.2" · `6739706` 2026-08-20 "feat: Upgrade Nitro to 0.37 for View
improvements (#166)" · `c865e6f` 2026-08-20 "fix: Reset all view state in `prepareForRecycle()` (#168)" ·
`e7a2ed7` 2026-08-20 "fix: Mark react-native-nitro-modules peer dependency as optional (#170)" · `1820cf8`
2026-08-06 "feat: Update Nitro to 0.36.5 (#163)" · `1b60425` 2026-08-06 "fix: label iOS pixel format correctly for
default byte order (#159)" · `0c5046d` 2026-08-06 "fix: support 24-bit RGB/BGR raw pixel data on iOS (#160)".

**PRs:** #180 (open, created 2026-09-25) "Preserve UIImage orientation in cropping method" · **#117** (open,
created **2026-04-17**) "fix(ios): normalize image orientation before crop" · #179 (merged 2026-09-14) · #178 (open,
2026-09-05) "fix(android): skip explicit Kotlin plugin when AGP registers the kotlin extension" · #177 (merged
2026-08-25) · #171 (merged 2026-08-23).

**Open issues:** **#176** (2026-08-24, 1 comment) "`dropImage()` does not release the decoded image, and there is
no shared cache, budget or memory-pressure hook" · **#175** (2026-08-24) "`<NitroImage />` emits no load or error
events, so expo-image's transition cannot be reproduced" · **#173** (2026-08-24) "EXIF orientation is not applied on
decode (Android rotates, iOS disagrees with itself)".

**What this changes.** PR **#171** ("unify image quality behavior and docs") is exactly the thing that makes a
**compressible** image pipeline possible: one documented quality semantics across platforms, which is what our
"a readable photo in 1.5 s" budget needs (the same bytes must mean the same quality on every phone). But **#173**
means **we cannot trust the orientation of a decoded image**, and a POD photo of a parcel on the ground is
**rotated more often than anyone expects**; **#176** means the decoded image may not be released, which is a
**leak over a 200-photo day**. Both are **must-fix before we adopt it**, and both have a workaround we can write
ourselves (rotate in our own step, and release the reference explicitly).

**Verdict.** The best 2026 candidate for the decode/rotate/compress step, and the Nitro sibling of the camera we
already use — **but not adoptable until #173 and #176 are fixed** (or until we implement the rotate and release
ourselves, which is cheap).

### 3.4 `thangdevalone/react-native-media-toolkit` (C10) — the 2026 newcomer

**What I read.** The commit history (2026-10-15 → 2026-10-17 — very recent), the 6 most recent PRs, and the
release cadence.

**Commits:** `dbcb90a` 2026-10-17 "chore: bump version to v2.4.2" · **`d4dc93d` 2026-10-16 "feat: implement
Android Native/Nitro module bindings for media toolkit"** — Thắng Nguyễn · `2ce0102` 2026-10-16 "chore: bump
version to v2.4.1" · `1bf2e33` 2026-10-15 "Merge pull request #13 from FrikkieSnyman/feat/compress-video-trim-range"
· `54b9b03` 2026-10-15 "fix(ci): include library native sources in build cache inputs" · `6419a92` 2026-10-15
"chore: exclude Android unit tests from the published package" · `b734d6d` 2026-10-15 "fix: validate compression
trim ranges and preserve trimmed output" · `c209842` 2026-10-15 "Merge remote-tracking branch 'origin/main' into
codex/fix-compress-trim-validation" · **`4404af0` 2026-10-15 "fix(android): retry exports with a software encoder
(#14)"** — Frikkie Snyman · **`8d0653a` 2026-10-15 "feat: add startTime/endTime to compressVideo for single-pass
trim + compress (#13)"**.

**PRs:** #13 (merged 2026-10-15) · #14 (merged 2026-10-15) · **#10 (created 2026-10-07, merged)** "feat(ios): add
support for Photos library `ph://` URIs and document sandbox limitation (#7)" · #9 (created 2026-10-07, merged)
"fix(ios): support file URIs with fragments and detect video by track content (#6)" · #8 (created 2026-10-07,
merged) "fix(ios): prevent `compressVideo` hang on writer failure and reject on reader failure (#5)" · #4 (created
2026-09-15, merged) "fix(ios): honor explicit bitrate in `compressVideo`".

**Verdict.** This is what a **2026 media library looks like**: Nitro bindings on both platforms, failure paths
handled (a hang on writer failure is exactly the bug that strands a courier mid-POD), and a **software-encoder
fallback** when the hardware encoder fails — which is the difference between "the POD photo is saved" and "the
courier is standing in the rain". It is **six months old with 816 downloads/week**, so it is a **reference and a
benchmark candidate, not a dependency**. Our POD path needs stills, not video, so the decisive part for us is
the **image** half of its API, which we did not read in detail → **UNVERIFIED**.

### 3.5 `YanYuanFE/react-native-signature-canvas` (C11) — the signature decision

**What I read.** The commit history (2026-06-28 → 2026-08-06), the 6 most recent PRs, and **81 open issues**.

**Commits:** `672274e` 2026-08-06 "5.1.1" · **`369aa57` 2026-08-06 "fix: paint initial dataURL only once via
ResizeObserver resize path"** · `5d520b6` 2026-07-05 "Merge branch 'master' of yanyuan.github.com:…" · `d80b93f`
2026-07-05 "5.1.0" · `5bdf44d` 2026-07-05 "chore: run conventional-changelog via npx with bundled angular
preset" · `ee30ed8` 2026-07-05 "chore: automate release flow via npm version lifecycle hooks" · **`98f158d`
2026-07-05 "fix: harden string injection, prop handling, and WebView bridge"** · `0290272` 2026-06-28 "Merge pull
request #417 from zmirnes/feat/enhance-types-and-loading-overlay".

**PRs:** #444 (closed, 2026-08-10) · #452 (open, 2026-09-12) · #451 (open, 2026-09-10) · #450 (open, 2026-09-09) ·
#436 (closed, 2026-07-10) — all dependency bumps in the example app, which is the maintenance signal.

**Open issues:** **#378** (2025-03-26, 5 comments) "Signature Not Working on iOS in react-native-signature-canvas
(React Native 0.78.1)" · #373 (2024-12-16) "example ts-expo, but landscape" · #370 (2024-11-25, 3) "SignatureCanvas
not working on ios device and and simulator" · **#369** (2024-11-21) "Intermittent Issue with Multiple Signatures:
Duplicate Saved Signatures" · **#368** (2024-11-18, 4) "Signature vanishes in iOS and in android not able to
scroll after changing orientation" · #367 (2024-10-03, 3) "DataUrl not working in some android devices" · #366
(2024-09-18) "Black area after erasing signature" · #365 (2024-08-21) "Android-Specific Issue: Inability to Start
or Continue Signature Near Screen Edges" · #362 (2024-06-26) "Is it possible to set the output image dimensions?" ·
#360 (2024-05-03, 2) "Signature doesn't persist after change in orientation" · **#357** (2024-03-28, 16)
"Invariant Violation: Failed to call into JavaScript module method `WebViewMessageHandler1.onMessage()`" · #354
(2024-03-06) "When penColor is using transparency, each stroke looks like a lot of dots overlapping each other" ·
#353 (2024-03-06) "After some rotation Signature is going away" · #350 (2024-02-12) "From version 4.5.1, it does
not work on windows" · #349 (2024-02-05) "DataUrl not working for older versions of ipads".

**What this changes.** The 2026 work is good (the **string-injection / WebView-bridge hardening** commit is
exactly the kind of fix a security review would ask for), but the **open-issue tail is the story**: this is a
**WebView** implementation, and its failure modes are WebView failure modes — the signature vanishes on
rotation, it does not work near the screen edges on Android, the data URL does not load on some devices, and
there is a 16-comment crash in the WebView message handler. **A POD signature is captured in a van, on a phone
that is mounted, in portrait, in a hurry.** We do not want a WebView in that path, and we do not want to ship a
16-comment crash.

**Verdict.** **We will draw the signature ourselves.** The requirements are small (a stroke path, a clear button,
a PNG, offline-safe), and our own surface removes the WebView, the rotation bug and the dependency. Use
`react-native-svg` (already in most RN trees) or a Skia surface for the stroke capture; the **signature PNG
never leaves the device until the driver confirms the POD**.

## 4. Benchmark — **UNVERIFIED: no eval set exists**

**I did not run a benchmark and I will not invent one.** `docs/squads/scanner/benchmarks/README.md` says the
harness is to be created with the first implementation; `docs/squads/scanner/eval/` does not exist; there is no
POD eval set and no camera screen. Every figure below is **UNVERIFIED** until the harness exists.

**The sets that must be built:**

1. **`docs/squads/scanner/eval/labels/`** — ≥ 300 NZ courier label images (the scanner squad's set) — used for
   the **≤ 1.5 s per label** and **≥ 97 % correct address** gates.
2. **`docs/squads/pod/eval/`** — ≥ 200 POD photographs taken on a **mid-range Android** in real conditions:
   daylight, shade, **night (van interior, torch)**, rain on the lens, parcel at an angle, parcel behind a
   fence, label upside down, plus the **manifest pages** (A4 printout, creased, photographed at an angle).
3. **`docs/squads/pod/benchmarks/`** — the runner: same device profile (CI emulator + one mid-range Android),
   same scene list, same file names; record `shutter_to_file_ms`, `bytes`, `width×height`, `ocr_confidence`,
   `upload_ms`, `rss_mb`.

| Metric | Gate | How we would measure it |
|---|---|---|
| **Capture latency (the 1.5 s bar)** | **shutter → a durable, compressed file on disk ≤ 1 500 ms**, on the CI emulator profile **and** on one mid-range Android | `takePictureAsync`/`capturePhotoToFile` start and end timestamps; the file must be readable from the filesystem **before** the UI says "saved". **UNVERIFIED.** |
| **Label scan latency** | **≤ 1.5 s per label** from the first readable frame to the stop added (`docs/squads/scanner/README.md`) | Frame-processor timestamps; the same 300-image eval set. **UNVERIFIED.** |
| **Readability** | **≥ 97 %** of labels yield the correct recipient address after LINZ correction; **≤ 1 %** wrong-block (sender picked) | The scanner eval set; our own block classifier. **UNVERIFIED.** |
| **POD legibility** | a human rater can read the **recipient name and the address** in **≥ 95 %** of POD photos, without zooming | Blinded review of the 200-photo POD set by 2 raters. **UNVERIFIED.** |
| **File size / compression** | **≤ 400 KB** per POD photo at **1600 px** on the long edge, quality tuned so the text is still legible | `File.digest()` + byte length; compare `expo-image-manipulator` vs `nitro-image` vs `media-toolkit` on the same source. **UNVERIFIED.** |
| **Upload path** | ≤ 30 s per photo on 3G-equivalent throughput; **the upload is never on the capture path** | The capture is durable on disk first; the upload is a queue drain. **UNVERIFIED.** |
| **Memory** | **no leak across a 200-photo day**: RSS growth < 50 MB and the frame-thread count returns to zero (VisionCamera #4213) | `adb shell dumpsys meminfo` + the VisionCamera dispose assertions. **UNVERIFIED.** |
| **Battery** | ≤ 8 %/h with driving mode on (V4 §6.4); the camera is **never open while driving** — it opens only at the doorstep | `dumpsys batterystats` over a 60-minute shift with 50 captures. **UNVERIFIED.** |
| **Cold start** | ≤ 2 s (V4 §6.4) — **the camera module must not be initialised at launch** (lazy import), or we fail the budget before the first stop | Instrument the cold start with and without the camera module imported. **UNVERIFIED.** |
| **Offline behaviour** | with the phone in airplane mode for a whole shift: **every POD photo is captured, compressed, queued and reconciled later**, with **no duplicate upload** and **no lost photo** | Maestro airplane-mode scenarios (V4 §13.3) over the `pod_capture` table; assert idempotency on the photo id. **UNVERIFIED.** |
| **Manifest flow** | a 3-page A4 manifest photographed at an angle → **all 3 pages detected**, ≤ **6 s** total, **0 images uploaded** | `scanDocumentAsync` page detection + our on-device OCR, on the manifest eval set. **UNVERIFIED.** |

## 5. What we are missing → rows for `docs/PARITY.md`

The CEO merges these. The **Spoke** column is filled **only** with facts verified in
`docs/study/spoke/TEARDOWN.md` (read 2026-10-21).

| # | Family | Feature | Status | Spoke (2026-10-20) | Our edge | Task |
|---|---|---|---|---|---|---|
| 1 | POD | Photo POD with geo and timestamp | match | Dispatch has "photo capture (5/10/10 per stop by plan), geotags + timestamps" (S3/S5); the standalone app shows a "Smoother proof of delivery screen" (S16) but **which plan gates it is UNVERIFIED** | included in the **base tier, never paywayed**; our geo stamp is in our database, not only in the EXIF | T7.9 |
| 2 | POD | Signature capture | match | "signature capture" is a Dispatch feature (S3/S5) | **we draw it ourselves** — no WebView, no orientation bug, offline-safe | T7.9 |
| 3 | POD | Voice POD ("delivered" by voice) | beat | **no voice POD is documented** (S9) | **D4**: the default proof of delivery is the driver's word "delivered" | T7.9 |
| 4 | POD | Offline POD capture with a queue | beat | **offline POD behaviour is not documented — UNVERIFIED** | the photo is durable on disk first, queued in the event log, reconciled later | T7.1, T7.9 |
| 5 | POD | POD strictness control (how mandatory the photo is) | match | "strictness control (how mandatory the POD is)" is a Dispatch feature (S3/S5) | strictness **per client**, decided by the dispatcher | T7.9 |
| 6 | POD | Proof of custody / cash on delivery | match | "proof of custody (Premium+)" and "cash on delivery (coming soon)" (S3/S5) | out of scope for v1 | — |
| 7 | POD | Barcode scan to confirm the delivery | match | "barcode scanning" is a Dispatch driver-app feature (S5) | scanned and **announced by voice**, auto-matched to the stop | T7.8 |
| 8 | Camera | Label scan that works on-device and offline | beat | Spoke's **manifest import/OCR "uploads and analyses the files" on their servers** (S7/S27) — it needs network at the moment it matters | fully on-device, NZ-address-only, ≤ 1.5 s, **no image ever uploaded** | T7.8 |
| 9 | Camera | Manifest camera flow (a printed manifest, several pages) | beat | "Manifest scan → viewfinder → 'Scan route manifest' → photograph the list → Next → Done/Add +" (S7) — but **it uploads the file to Spoke's servers** (S27) | `expo-camera` `scanDocumentAsync` + our own on-device OCR; **multi-page**, offline | T7.8 |
| 10 | Camera | Camera label scan on Android with a language picker | match | "Camera scan, one label — Android first, with a label-language picker; iOS uses Apple Live Text" (S35/S13/S14) | one on-device engine for both platforms, NZ English + te reo place names | T7.8 |
| 11 | Camera | Parcel-location photo tag (front / middle / back shelf) | match | the package finder records "Front/Middle/Back, Left/Right, Floor/Shelf" as a **mnemonic code** (S8) | the same slots, set **by voice** | T7.2 |
| 12 | Camera | A "readable photo" check before the shot is accepted | beat | not documented — **UNVERIFIED** | a live blur/glare check; the app tells the driver "too dark, move to the light" instead of storing a black rectangle | T7.9 |
| 13 | Camera | Camera permission asked in plain English, once | beat | **no accessibility declaration at all** (S13/S14) | one sentence, spoken, and the blocked-state path ("open Settings") explained | T7.5 |
| 14 | Privacy | EXIF/GPS stripped from the uploaded photo; the coordinates kept in our own data | beat | **no statement about where photos are processed** (S13/S14) | strip EXIF by default; keep lat/long and the timestamp in **our** database, in NZ | T7.15 |
| 15 | Privacy | A stated retention period for POD photos, per client | match | "data history 30 days / 1 year / 5 years" by plan (S3/S5) | one provable policy we can defend in a Privacy Act 2020 request (IPP 9) | T7.15 |
| 16 | Reliability | Resumable upload, so a photo is never lost in a dead zone | beat | not documented — **UNVERIFIED** | tus-style resume with a checksum (`File.digest()`), so a retry cannot duplicate | T7.9 |
| 17 | Camera | Visual-regression baseline for camera screens | beat | not documented — **UNVERIFIED** | a screenshot harness (Maestro + a 2026 snapshot tool) so the camera screen cannot silently change | T7.6 |

## 6. Decision

1. **Two cameras, on purpose.** **`expo-camera` 58.0.11** for the **driver-facing stills** (POD photo, signature
   target, manifest pages) and **`react-native-vision-camera` 5.2.3** (our existing pin) for the **live scanner**,
   which needs frame processors. The scanner is the only camera with a live preview; the POD camera is a
   one-shot still.
2. **The POD camera is `expo-camera`, not VisionCamera, until the 2026 blockers clear.** #4213 (frame-thread
   leak), #4211 (iOS 17.7/18.6 crash), #4209 (Hermes-GC SIGABRT), #4219 (a JS exception in a frame callback kills
   the iOS process) and #4210 (the RELRO/ML Kit blocker) are open on our exact pin. **Trigger to revisit: a
   VisionCamera release that closes #4213 and #4209, or six months of no new crash reports on 5.2.3.**
3. **Compression and files: `expo-image-manipulator` 58.0.15 + `expo-file-system` 58.0.10** (both already in the
   SDK; `expo-file-system` is already a dependency). Benchmark **`nitro-image` 0.15.2** and **`media-toolkit`
   2.4.2** against them on our own 200-photo set before we commit — the winner must hit **≤ 400 KB at 1600 px**
   with the text still legible, and must not leak a decoded image (#176) or lose the orientation (#173).
4. **The POD queue lives in `op-sqlite` (already our pin) as a table, not as blobs.** The row holds the photo id,
   the **file path** (the bytes stay in the app's cache directory), the size, the digest, the geo stamp, the
   timestamp and the state (`queued → uploading → uploaded → confirmed`). **Image bytes never go into SQLite**
   (the APK/AOT file is the right place, and `expo-file-system` owns it). The upload worker drains the queue
   when the network returns; the retry is idempotent on the photo id.
5. **The upload path: direct-to-object-storage with a presigned URL**, from the device, with **no image leaving
   the device unless the driver chooses POD** (V4 §10.2). The store choice is **not yet made** (R2 / S3 /
   Backblaze / self-hosted seaweedfs) — pricing for all four is **UNVERIFIED**, and the founder's account rules
   decide. **Do not plan on MinIO** (AGPL-3.0, repository archived).
6. **We draw the signature ourselves.** No WebView. A stroke surface + a clear button + a PNG, offline-safe,
   stored like a photo (same queue, same retention, same EXIF stripping).
7. **Privacy rules we implement (verified, not inferred):** a POD photo is **personal information** (Privacy Act
   2020 — the address is identifiable); we strip **EXIF/GPS from the uploaded bytes** and keep the coordinates and
   the timestamp in **our own** database, in NZ; we set a **retention period** (IPP 9) and a **PIA** (IPP 5 and
   the OPC's PIA guidance); and we do **not** write POD photos to the phone's gallery by default (a gallery copy
   is an uncontrolled copy of someone's address).
8. **The manifest flow is ours and it is on-device.** `expo-camera`'s `scanDocumentAsync` (#47362) detects the
   pages; our OCR reads them; nothing is uploaded. Spoke's equivalent uploads the file — that is our edge, and it
   is the edge the offline-first decision (V4 §13.3) buys.
9. **The 1.5 s bar is a measurement, not a slogan.** Shutter → durable compressed file ≤ 1 500 ms on a mid-range
   Android, measured on the CI emulator profile and on one physical device; and first readable frame → stop added
   ≤ 1 500 ms for the scanner. Both are in §4 and both are **UNVERIFIED** until the harness exists.

**Fallback chain:** `expo-camera` → VisionCamera (if the still path needs something expo-camera cannot do) →
**a device-side "photo later" placeholder** (the POD record exists with a spoken note, and the photo is added
when the network returns) → the driver says "delivered" (D4 — the proof of delivery is the word).

## 7. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **VisionCamera v5 defects on our exact pin** (leak #4213, iOS crash #4211, SIGABRT #4209, frame-callback crash #4219) | High | The POD path uses `expo-camera`; the scanner's worklet wraps every call; a dispose assertion in the scanner tests; the pin is reviewed monthly |
| **#4210 — the CameraX/ML Kit prebuilts block a full GNU_RELRO upgrade** | High | Record an accepted exception with a reason in the security gate, or the whole APK hardening check fails; escalate upstream |
| **A POD photo is unusable** (blur, glare, night) | High | A live readability check before the shutter; the spoken "too dark"; the failure is recorded as a note, not a silent black rectangle |
| **The photo is lost** (crash, dead zone, force-quit) | High | Write to disk **before** the UI says "saved"; the queue row is the source of truth; the upload is resumable and idempotent |
| **A photo of someone's house leaves the device without consent** | High | Strip EXIF; upload only on the driver's POD action; keep the coordinates in our database; the PIA and the retention policy are part of T7.15 |
| **Two camera stacks** (expo-camera + VisionCamera) | Medium | One stack has the live preview (the scanner), the other has the stills; the still path is the only one allowed to run while the driver is driving |
| **The APK budget** (≤ 80 MB) with CameraX + ML Kit + Nitro | Medium | Measure the release APK in CI; if VisionCamera + ML Kit breaks the budget, the scanner becomes an **on-demand module** that is not in the base APK |
| **Compression loses the text** | Medium | The 200-photo set with a blind human legibility check; keep the original until the compressed file is verified |
| **`expo-image-manipulator` is the most-downloaded package here** (2.13 M/week) and therefore the most targeted | Medium | Read the source before we trust it; pin the exact version; `pnpm audit` + OSV; the licence gate |
| **A signature WebView crash in the van** (#357, #368, #369) | Medium | We draw the signature ourselves; no WebView in the POD path |
| **R8/minification** now on by default in SDK 58 release builds | Medium | Keep-rules for every native dependency; a release-build smoke test in CI |
| **The manifest flow silently uploads** (the Spoke trap) | Medium | A CI check: no image bytes in any `fetch`/`upload` call from the scanner module; the on-device rule is a test, not a promise |
| **iOS 27 UIScene** changes the camera lifecycle | Medium | The Expo module model handles it; test the camera screen on an iOS 27 device before the release |

## 8. Monthly radar filter

Re-run on the first working day of each month (V4 §11.3). A camera/image candidate stays on the radar only if:

1. it has a **release or a pushed commit in the last 90 days**;
2. the licence is **permissive** (MIT / Apache-2.0 / BSD) **and** the licence file is machine-detectable;
3. it is **New Architecture** ready (Nitro/TurboModule) **and** compatible with **Expo SDK 58**;
4. it has **no open high/critical advisory** (OSV + `pnpm audit`);
5. it has **at least one distinct human** maintainer with a commit in 90 days;
6. it publishes a **measurable performance claim** we can reproduce on our device profile.

**Watch-list triggers:**

| Candidate | Trigger to act |
|---|---|
| `margelo/react-native-vision-camera` | a release that closes **#4213** (frame-thread leak) and **#4209** (Hermes GC SIGABRT) → then re-run the POD benchmark and consider moving the still path back |
| `mrousavy/react-native-nitro-image` | **#173** (EXIF orientation) and **#176** (decoded image not released) fixed → then benchmark it against `expo-image-manipulator` for the POD compression |
| `thangdevalone/react-native-media-toolkit` | 3 more months of releases and one named production app → then read the image half of the API |
| `Gautham495/react-native-nitro-cloud-uploader` | a release with a documented S3/presigned-PUT path and an iOS implementation → then read it before we write our upload worker |
| `KnifeLemon/Filee` | the README explains the 7 647★ in three weeks → then decide; **never install on the strength of stars alone** |
| `hypersocialinc/shots` | a first release with a licence file → then evaluate for the camera-screen visual regression |
| `expo-camera` | any SDK 59 change to `scanDocumentAsync`, permissions or the still-capture API → re-read the changelog before every release |
| `seaweedfs` / `versitygw` | the founder's account rules forbid a third-party photo store → then the self-hosted option becomes the only option |

## 9. What we could not verify

- **6-month star trend for every candidate** — the star timeline is 403 with our token; the proxies are
  releases/6 m, commits/90 d, humans/90 d and npm downloads/week (week 2026-10-12 → 2026-10-18).
- **Every benchmark number in §4** — no eval set, no harness, no camera screen. The gates are targets we set,
  not measurements. In particular: **the 1.5 s capture figure and the ≥ 95 % legibility figure are UNVERIFIED.**
- **The Android 13/14/15 photo-access model** (full vs partial `READ_MEDIA_IMAGES`, the photo picker) — we did
  not fetch the Android developer documentation on 2026-10-21 → **UNVERIFIED**. What we did verify is the
  **notification** permission behaviour (Android 13+ `POST_NOTIFICATIONS`) and the OEM kill list.
- **iOS photo-library and camera usage-description requirements for the store submission** — **UNVERIFIED**
  (not fetched). The *privacy manifest* requirement is evidenced only indirectly (issue #302 on the dead
  signature library).
- **Pricing for every object store** (R2, S3, Backblaze, Cloudinary, imgproxy) — **UNVERIFIED**, not fetched on
  2026-10-21. **Telnyx Cloud Storage at $0.006 per GiB per month** was the only storage price we verified
  (in the notifications file).
- **The exact `expo-camera` permission strings and config-plugin keys** for SDK 58 — the SDK 58 changelog entry
  and the npm versions were read, but **the `expo-camera` API reference page was not opened** → treat the
  permission-key names as UNVERIFIED until we read `docs.expo.dev/versions/v58.0.0/sdk/camera/`.
- **`expo-image-manipulator`'s quality semantics** (which quality value means what, and whether it matches
  `nitro-image`'s "unified image quality behaviour" from PR #171) — not verified. This matters because the
  compression numbers in §4 depend on it.
- **The `media-toolkit` image API** — we read its commit history and PR titles, **not** its API reference; its
  video half is irrelevant to us and its still half is **UNVERIFIED**.
- **`react-native-signature-canvas`'s New Architecture status** — the open issues (iOS not working, orientation,
  duplicate signatures) were read but **the New Architecture question was not answered** in the repository.
  This does not change the decision: we are not shipping it.
- **`KnifeLemon/Filee`** — what it actually does is **UNVERIFIED**; the star/commit ratio is unexplained and the
  README was not read.
- **Whether the `expo-camera` still path can produce a file with the EXIF we need before we strip it** — we
  intend to strip EXIF anyway, so this is low risk, but the **geo stamp is written by us into the database**, and
  the ISO 6709 formatting lesson from VisionCamera #4216 applies to our own writer.
- **Closed-issue counts and median first-response times** were not sampled (the GitHub search API is limited to
  30 requests/minute and the budget went to the repository scans). The issue lists above are the **first page**
  of `issues?state=open&per_page=30` and of `issues?since=2026-01-01`; GitHub's `since` filters by **updated**,
  so each item carries its real created date.
- **`docs/LICENSES.md` says `react-native-vision-camera | unknown`** — the licence is **MIT** (verified in the
  repository and in the npm metadata); the entry is stale, as is the repo URL (it moved from `mrousavy/` to
  `margelo/` on 2026-08-29, commit `91bae1f` / PR #4176). **The licence ledger must be corrected by the Platform
  squad; this role does not edit it.**
- **The issue-only count for `mrousavy/react-native-mmkv` (C24)** — the verifier confirmed that the card's figure
  of 24 is GitHub's `open_issues_count` (issues **and** pull requests); the issue-only number was not re-read, so
  the card now labels the figure as pull-request-inclusive rather than inventing a new count.
- **Corrected by the verifier pass of 2026-10-21 (VERIFICATION-A/B/D.md): 9 cards corrected.**
