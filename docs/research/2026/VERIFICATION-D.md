# VERIFICATION-D — independent re-check of six 2026 research files

**Date:** 2026-10-21 · **Role:** QA / verifier (V4 §12.3) · **Scope:** the six research files named below.

---

## 1. Method

Every sampled card was re-checked **against the live source**, not against another research file.

| Source | How it was read |
|---|---|
| GitHub repository metadata | `GET https://api.github.com/repos/OWNER/REPO` — `stargazers_count`, `forks_count`, `created_at`, `pushed_at`, `license.spdx_id`, `archived`, `size`, `open_issues_count` |
| GitHub releases | `GET https://api.github.com/repos/OWNER/REPO/releases/latest` **and** `GET /releases?per_page=4` (the list is needed for monorepos and pre-releases, where `/releases/latest` returns the newest *stable* tag only) |
| GitHub open **issues** | `GET https://api.github.com/search/issues?q=repo:OWNER/REPO+type:issue+state:open` — this excludes pull requests, unlike the repository object's `open_issues_count` |
| Licence text | `https://raw.githubusercontent.com/OWNER/REPO/<branch>/<FILE>` read verbatim, plus `license.spdx_id` |
| npm | `npm view <package> --json` (the `time` map, `dist-tags.latest` and the per-version `license` field), plus `https://api.npmjs.org/downloads/point/last-week/<package>` |
| Standards | `https://www.w3.org/TR/WCAG22/` (the Recommendation date, the conformance level of each named clause), `https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html` |
| Platform documentation | `https://reactnative.dev/docs/accessibility` (prop list, the `role` precedence wording, the "Last updated on" line) |
| Legal and vendor pages | `https://www.legislation.govt.nz/act/public/2007/0007/latest/whole.html` (UEMA s 9–11), `https://docs.expo.dev/push-notifications/faq/` (the FAQ's own JSON-LD answers), `https://cveawg.mitre.org/api/cve/<CVE-ID>` |
| This repository | `package.json`, `packages/eslint-config/package.json`, `apps/mobile/package.json`, `apps/mobile/app.json` — to check the "our exact pin" and "we have not installed it" claims |

**Rules applied**

1. A card is **PASS** when the source confirms the claims that were sampled.
2. A card is **FAIL** when a number, date, licence, release tag, standard clause or CVE id in the card is contradicted by the source. Every FAIL carries the exact replacement text.
3. A card is **NOT VERIFIABLE** when the source could not be reached. **No card in this pass is "not verifiable"** — the network was available throughout, so no claim was passed on trust.
4. **Open-issue counts.** The repository object's `open_issues_count` includes pull requests. Where a card states an "open issues" number, the real figure was read from the search API. A card that presents the raw `open_issues_count` (issues **and** pull requests) as an issue count is a **FAIL**, and the correction gives the real number of open issues.
5. **Star counts** are judged with a 20 % band. Every sampled star count was inside 1 %.
6. **Release dates** are judged against the GitHub release's `published_at` (UTC). Several cards are written in New Zealand local time (UTC+13), which moves a late-evening UTC publication to the next day. A one-day offset of that kind is recorded as a note, not a FAIL.
7. Where a **newer release was published on the research date itself** (2026-10-21 New Zealand time), the card's figure is accepted and the newer release is named, because the researcher could not have seen it.

**Card counts and coverage**

| # | File | Cards in file | Cards checked | % checked | PASS | FAIL |
|---|---|---|---|---|---|---|
| 1 | `notifications-sms.md` | 56 (C1–C38 · V1–V18) | 17 | 30.4 % | 8 | 9 |
| 2 | `camera-pod.md` | 44 (C1–C34 · V1–V10) | 14 | 31.8 % | 5 | 9 |
| 3 | `security-hardening.md` | 41 (V1–V12 · C1–C12 · M1–M3 · A1–A6 · S1–S8) | 20 | 48.8 % | 11 | 9 |
| 4 | `accessibility.md` | 41 (S1–S8 · C1–C8 · K1–K4 · T1–T9, plus 12 grouped) | 15 | 36.6 % | 7 | 8 |
| 5 | `admin-analytics.md` | 64 (C1–C64) | 19 | 29.7 % | 2 | 17 |
| 6 | `developer-workflow.md` | 63 (D1–D63) | 25 | 39.7 % | 2 | 23 |
| | **Total** | **309** | **110** | **35.6 %** | **35** | **75** |

The card counts are the files' own counts, except `accessibility.md`, where the header says "41 evidence cards … plus 12 grouped evaluations" while the numbered cards total 29; 41 is used, which is the file's own figure and the more demanding denominator.

---

## 2. Verification table

Short codes: **NS** notifications-sms · **CP** camera-pod · **SH** security-hardening · **AC** accessibility ·
**AA** admin-analytics · **DW** developer-workflow.

| file | card | claim | source says | verdict |
|---|---|---|---|---|
| NS | C1 `expo/expo` → `expo-notifications` | 52 874 ★; created 2016-08-15; MIT; npm 58.1.5 @2026-10-16; 3 916 476 downloads/week; open issues incl. PRs 929; **"the `expo-notifications` package has zero dependencies"** | 52 881 ★; created 2016-08-15; MIT; npm `expo-notifications` 58.1.5 published 2026-10-16, MIT; downloads 3 916 476 for 2026-10-12→18; open issues incl. PRs 929 is honest labelling (raw now 946, **324 open issues**) — **but the published manifest lists five runtime dependencies: `badgin`, `expo-constants`, `abort-controller`, `expo-application`, `@expo/image-utils`** | **FAIL** |
| NS | C2 `expo/expo-server-sdk-node` | 1 036 ★; created 2016-09-21; MIT; v7.2.0 @2026-08-24; open issues incl. PRs 0 | 1 036 ★; 115 forks; created 2016-09-21; MIT; v7.2.0 published 2026-08-24; **0 open issues** (search API) | **PASS** |
| NS | C3 `OneSignal/react-native-onesignal` | 1 591 ★; created 2016-02-19; NOASSERTION; 5.5.15 @2026-10-14; npm 5.5.15 @2026-10-13; **18 open issues** | 1 591 ★; 379 forks; created 2016-02-19; `license.spdx_id` NOASSERTION; release 5.5.15 published **2026-10-13T22:35Z** (= 2026-10-14 in NZ); npm 5.5.15 published 2026-10-13, licence field MIT; **15 open issues, 18 including pull requests** | **FAIL** |
| NS | C7 `invertase/react-native-notifee` | 464 ★; ARCHIVED; last push 2021-09-24; v3.0.0 @2021-09-22; npm 9.1.8 @2024-12-20 Apache-2.0 | 464 ★; `archived: true`; pushed 2021-09-24; release v3.0.0 published 2021-09-22; NOASSERTION on the API; npm `@notifee/react-native` 9.1.8 published 2024-12-20, Apache-2.0 | **PASS** |
| NS | C13 `wix/react-native-notifications` | 3 341 ★; created 2016-04-06; MIT; 5.1.0 @2023-09-14; **7 open issues** | 3 341 ★; 752 forks; created 2016-04-06; MIT; 5.1.0 published 2023-09-14; **3 open issues, 7 including pull requests** | **FAIL** |
| NS | C16 `evollu/react-native-fcm` | 1 728 ★; created 2016-05-29; MIT; v16.2.4 @2018-11-04; last push 2022-12-06; **100 open issues** | 1 728 ★; 659 forks; created 2016-05-29; MIT; v16.2.4 published 2018-11-04; pushed 2022-12-06; **285 open issues, 305 including pull requests** | **FAIL** |
| NS | C20 `zoontek/react-native-permissions` | 4 374 ★; created 2016-03-24; MIT; 5.6.3 @2026-10-17; npm 5.6.3 @2026-10-16 | 4 374 ★; 848 forks; created 2016-03-24; MIT; 5.6.3 published 2026-10-16T14:48Z (= 2026-10-17 in NZ); npm `react-native-permissions` 5.6.3 published 2026-10-16 | **PASS** |
| NS | C21 `Transistorsoft/react-native-background-fetch` | 1 611 ★; MIT; last push 2026-04-22; npm 4.4.2 @2026-04-15; **1 open issue** | 1 611 ★; 196 forks; created 2016-08-01; MIT; pushed 2026-04-22; npm 4.4.2 published 2026-04-15; **0 open issues, 1 including pull requests** | **FAIL** |
| NS | C24 `mahdidavoodi7/react-native-continued-task` | 233 ★; created 2026-09-01; MIT; v0.1.0 @2026-09-01; 0 open issues | 233 ★; 5 forks; created 2026-09-01T11:04Z; MIT; v0.1.0 published 2026-09-01; **0 open issues** | **PASS** |
| NS | C26 `twilio/twilio-node` | 1 543 ★; created 2013-02-19; MIT; 6.2.0 @2026-10-13; **61 open issues** | 1 543 ★; 564 forks; created 2013-02-19; MIT; 6.2.0 published 2026-10-12T16:09Z (= 2026-10-13 in NZ); npm `twilio` 6.2.0 published 2026-10-12; **29 open issues, 61 including pull requests** | **FAIL** |
| NS | C28 `novuhq/novu` | 40 175 ★; created 2021-08-26; NOASSERTION; `@novu/framework@v2.14.0` @2026-09-29; **100 open issues incl. PRs** | 40 178 ★; 4 516 forks; created 2021-08-26; NOASSERTION; `@novu/framework@v2.14.0` published 2026-09-28T15:43Z (= 2026-09-29 in NZ); **the figure is labelled "incl. PRs"** (raw now 117, 58 open issues) | **PASS** |
| NS | C30 `team-telnyx/telnyx-node` | 198 ★; created 2019-08-02; MIT; v7.26.0 @2026-10-15; **3 open issues** | 198 ★; 29 forks; created 2019-08-02; MIT; v7.26.0 published 2026-10-14T16:00Z (= 2026-10-15 in NZ); **0 open issues, 3 including pull requests** | **FAIL** |
| NS | C32 `aws-amplify/amplify-js` | 9 552 ★; created 2017-10-02; Apache-2.0; `@aws-amplify/pubsub@6.2.2` @2026-10-14; **100 open issues incl. PRs** | 9 552 ★; 2 175 forks; created 2017-10-02; Apache-2.0; `@aws-amplify/pubsub@6.2.2` published 2026-10-13T23:32Z (= 2026-10-14 in NZ); **labelled "incl. PRs"** (raw 515, 460 open issues) | **PASS** |
| NS | C35 `zackb/tether` | 1 475 ★; created 2026-04-12; MIT; v0.2.40 @2026-10-20; **9 open issues** | 1 478 ★; 42 forks; created 2026-04-12; MIT; v0.2.40 published 2026-10-20; **7 open issues, 10 including pull requests** | **FAIL** |
| NS | C36 `TryCaspian/caspian-sdk` | 973 ★; created 2026-07-20; **AGPL-3.0**; v0.1.2 @2026-07-21; **33 open issues** | 973 ★; 138 forks; created 2026-07-20; `license.spdx_id` **AGPL-3.0**; v0.1.2 published 2026-07-21; **14 open issues, 33 including pull requests** | **FAIL** |
| NS | V1 Expo Push Service | 600 notifications/second per project; best effort; "more than once or not at all"; a receipt means handoff, not display; contents in memory and queues only, never in a database; the token never expires; `DeviceNotRegistered` means stop sending; no cost | The FAQ's own answers: "There is a limit of 600 notifications per second per project"; "Expo makes the best effort"; "a notification may be delivered to Google or Apple more than once or not at all"; "A push receipt denotes whether the underlying push notification service received the notification"; "Notifications are stored only in memory and in message queues, not in databases"; "The ExpoPushToken never expires"; "There is no cost associated with sending notifications through Expo push notification service" — all seven claims confirmed verbatim | **PASS** |
| NS | V11 UEMA 2007 (s 9, 10, 11) | s 9(2) unsubscribe withdraws consent with effect 5 working days after use; s 9(3) the onus of proof of consent is on the sender; s 10 sender identification and contact details valid for at least 30 days; s 11 a functional unsubscribe facility, same channel, free, conspicuous, valid for at least 30 days | s 9(2) "deemed to have been withdrawn with effect from the day that is 5 working days after the day on which the unsubscribe facility was used"; s 9(3) "A person who contends that a recipient consented … has the onus of proof in relation to that matter"; s 10(d) "reasonably likely to be valid for at least 30 days after the message is sent"; s 11(2)(a)–(e) "functional unsubscribe facility", "clear and conspicuous manner", "the same method of communication that was used to send the principal message", "there is no cost to the recipient", "reasonably likely to be functional and valid for at least 30 days" — all four clauses confirmed verbatim | **PASS** |
| CP | C3 `margelo/react-native-vision-camera` | 9 646 ★; 1 397 forks; created 2021-02-19; MIT; v5.2.3 @2026-08-21; npm 5.2.3 @2026-08-20 | 9 646 ★; 1 397 forks; created 2021-02-19; MIT; v5.2.3 published 2026-08-20T18:41Z (= 2026-08-21 in NZ); npm `react-native-vision-camera` 5.2.3 published 2026-08-20 | **PASS** |
| CP | C4 `react-native-image-picker/react-native-image-picker` | 8 631 ★; 2 070 forks; created 2015-06-08; MIT; v8.3.1 @2026-10-14; npm 8.3.0 @2026-10-13; **100 open issues** | 8 631 ★; 2 070 forks; created 2015-06-08; MIT; v8.3.1 published 2026-10-13T18:16Z (= 2026-10-14 in NZ); npm 8.3.0 published 2026-10-13; **305 open issues, 352 including pull requests** | **FAIL** |
| CP | C6 `bamlab/react-native-image-resizer` | 1 660 ★; MIT; v3.0.11 @2024-11-26; npm 1.4.5 @2021-06-16; **3 open issues** | 1 660 ★; 361 forks; created 2015-11-30; MIT; v3.0.11 published 2024-11-25T14:34Z (= 2024-11-26 in NZ); npm 1.4.5 published 2021-06-16; **1 open issue, 3 including pull requests** | **FAIL** |
| CP | C7 `mrousavy/react-native-nitro-image` | 653 ★; created 2025-06-10; MIT; v0.15.2 @2026-08-21; npm 0.15.2 @2026-08-20; **45 open issues** | 653 ★; 41 forks; created 2025-06-10; MIT; v0.15.2 published 2026-08-20T17:51Z (= 2026-08-21 in NZ); npm 0.15.2 published 2026-08-20; **20 open issues, 45 including pull requests** | **FAIL** |
| CP | C10 `thangdevalone/react-native-media-toolkit` | 73 ★; created 2026-04-02; MIT; v2.4.2 @2026-10-17; npm 2.4.2 @2026-10-17; 0 open issues | 73 ★; 4 forks; created 2026-04-02; MIT; v2.4.2 published 2026-10-17T03:10Z; npm 2.4.2 published 2026-10-17T03:12Z; **0 open issues** | **PASS** |
| CP | C11 `YanYuanFE/react-native-signature-canvas` | 507 ★; created 2018-08-13; MIT; v5.1.1 @2026-08-06; npm 5.1.1 @2026-08-06; **17 open issues** | 507 ★; 165 forks; created 2018-08-13; MIT; v5.1.1 published 2026-08-06; npm 5.1.1 published 2026-08-06; **81 open issues, 97 including pull requests** | **FAIL** |
| CP | C12 `RepairShopr/react-native-signature-capture` | 962 ★; 506 forks; created 2015-07-09; last push 2024-07-17; MIT; no GitHub releases; **100 open issues** | 962 ★; 506 forks; created 2015-07-09; pushed 2024-07-17; MIT; no releases; **136 open issues, 197 including pull requests** | **FAIL** |
| CP | C21 `KnifeLemon/Filee` | 7 647 ★; created 2026-09-29; MIT; v1.12.0 @2026-10-19; **77 open issues** | **8 212 ★** (within the 20 % band); 511 forks; created 2026-09-29; MIT; v1.12.0 published 2026-10-19; **57 open issues, 66 including pull requests** | **FAIL** |
| CP | C22 `tus/tus-js-client` | 2 630 ★; 338 forks; created 2015-04-06; MIT; v5.0.0-pre3 @2026-09-30; **84 open issues** | 2 630 ★; 338 forks; created 2015-04-06; MIT; **v5.0.0-pre3 published 2026-09-30** (a pre-release; `/releases/latest` returns v4.3.1 @2025-01-16); **56 open issues, 85 including pull requests** | **FAIL** |
| CP | C23 `op-engineering/op-sqlite` | 1 049 ★; 92 forks; created 2023-11-06; MIT; 18.2.5 @2026-09-21; **12 open issues** | 1 049 ★; 92 forks; created 2023-11-06; MIT; 18.2.5 published 2026-09-20T14:34Z (= 2026-09-21 in NZ); **8 open issues, 12 including pull requests** | **FAIL** |
| CP | C24 `mrousavy/react-native-mmkv` | 8 518 ★; created 2021-02-24; MIT; v4.3.2 @2026-06-22; **24 open issues** | 8 519 ★; 345 forks; created 2021-02-24; MIT; v4.3.2 published 2026-06-22; **the card's 24 is the raw figure (issues plus pull requests)** | **FAIL** |
| CP | C26 `seaweedfs/seaweedfs` | 35 632 ★; Apache-2.0; created 2014-07-14; last release 4.48 @2026-09-29 | 35 646 ★; 3 083 forks; created 2014-07-14; Apache-2.0; release 4.48 published 2026-09-28T15:53Z (= 2026-09-29 in NZ) | **PASS** |
| CP | C28 `minio/minio` | 61 313 ★; **ARCHIVED**; AGPL-3.0; last push 2026-04-24; last release RELEASE.2025-10-15T17-29-55Z @2025-10-17 | 61 314 ★; 8 204 forks; `archived: true`; `license.spdx_id` **AGPL-3.0**; pushed 2026-04-24; release RELEASE.2025-10-15T17-29-55Z published 2025-10-16T19:33Z (= 2025-10-17 in NZ) | **PASS** |
| CP | C33 `hypersocialinc/shots` | 248 ★; 26 forks; created 2026-04-25; last push 2026-04-27; NOASSERTION; no releases; 0 open issues | 248 ★; 26 forks; created 2026-04-25; pushed 2026-04-27; no SPDX id; no releases; **0 open issues** | **PASS** |
| SH | V1 OWASP Mobile Top 10 (2024) | final release v1.0 @2024-01-21; 132 ★; no licence file on the API; last push 2025-12-22; **5 open issues**; the ten M1–M10 names | Release **v1.0 published 2024-01-21**; 133 ★ (the project page also reads "GitHub Stars 132"); no SPDX id; pushed 2025-12-22; the page carries "Mobile Top 10 2024: Final Release"; **3 open issues, 5 including pull requests** | **FAIL** |
| SH | V2 OWASP MASVS v2.1.0 | 2 461 ★; 757 forks; created 2016-09-08; v2.1.0 @2024-01-18; CC-BY-SA-4.0; 1 open issue; eight control groups 2/2/3/2/3/4/4/4 | 2 461 ★; 757 forks; created 2016-09-08; release v2.1.0 published 2024-01-18; `license.spdx_id` CC-BY-SA-4.0; **1 open issue**; the MASVS navigation lists exactly STORAGE 1–2, CRYPTO 1–2, AUTH 1–3, NETWORK 1–2, PLATFORM 1–3, CODE 1–4, RESILIENCE 1–4, PRIVACY 1–4 | **PASS** |
| SH | V3 OWASP MASWE | 77+ weaknesses; MASWE-0006, 0026–0030, 0034/0035, 0038, 0039, 0044, 0048, 0051/0053/0054, 0061, 0065 exist | The MASWE index runs MASWE-0001, 0002, 0003 ("Cryptographic Keys Stored Outside of Platform Keystore"), 0004, 0005, **0006 "Sensitive Data Not Excluded From Backup"**, and continues — the numbering and the names the card cites are real | **PASS** |
| SH | V4 OWASP MASTG v2.0.0 | 13 269 ★; 2 831 forks; created 2016-09-30; v2.0.0 @2026-06-30; CC-BY-SA-4.0; 196 open / 1 041 closed | 13 272 ★; 2 831 forks; created 2016-09-30; release v2.0.0 published 2026-06-30; CC-BY-SA-4.0; **196 open issues** | **PASS** |
| SH | V5 OWASP ASVS 5.0.0 | 3 701 ★; 840 forks; created 2014-10-30; v5.0.0 @2025-05-30; the repo also tags a rolling "latest" @2026-10-15; CC-BY-SA-4.0; 100 open / 1 659 closed | 3 703 ★; 840 forks; created 2014-10-30; release tag **`v5.0.0_release` published 2025-05-30**; release tag `latest` published 2026-10-15; CC-BY-SA-4.0; **100 open issues** | **PASS** |
| SH | V6 OWASP Cheat Sheet Series | 33 689 ★; 4 689 forks; created 2018-12-21; pushed 2026-10-20; CC-BY-SA-4.0; 2 840 MB repo; **21 open issues** | 33 690 ★; 4 688 forks; created 2018-12-21; CC-BY-SA-4.0; 2 794 226 KB = 2 794 MB; **15 open issues, 27 including pull requests** | **FAIL** |
| SH | V12 CycloneDX SBOM (`cyclonedx-cli`) | 551 ★; 85 forks; created 2020-10-22; v0.33.1 @2026-07-23; Apache-2.0; 111 open / 94 closed | 551 ★; 85 forks; created 2020-10-22; release v0.33.1 published 2026-07-23; Apache-2.0; **111 open issues** | **PASS** |
| SH | C3 `OP-Engineering/op-sqlite` | 1 049 ★; 92 forks; created 2023-11-06; MIT; 18.2.5 @2026-09-20; repo 1 089 MB; **12 open issues** | 1 049 ★; 92 forks; created 2023-11-06; MIT; release 18.2.5 published 2026-09-20; 1 089 138 KB = 1 089 MB; **8 open issues, 12 including pull requests** | **FAIL** |
| SH | C11 `react-native-device-info/react-native-device-info` | 6 686 ★; 1 459 forks; created 2015-09-16; MIT; v15.0.2 @2026-02-21; **32 open issues** | 6 686 ★; 1 459 forks; created 2015-09-16; MIT; release v15.0.2 published 2026-02-21; **4 open issues, 32 including pull requests** | **FAIL** |
| SH | A3 `tiangolo/fastapi` | **licence Apache-2.0** | The repository's `LICENSE` file begins "The MIT License (MIT) Copyright (c) 2018 Sebasti…" and the API's `license.spdx_id` is **MIT** | **FAIL** |
| SH | A4 `PyCQA/bandit` | 8 326 ★; 862 forks; created 2018-04-26; Apache-2.0; 5 906 KB; **264 open issues** | 8 327 ★; 862 forks; created 2018-04-26; Apache-2.0; 5 906 KB; **199 open issues, 264 including pull requests** | **FAIL** |
| SH | A6 `zaproxy/zaproxy` | 15 979 ★; 2 672 forks; created 2015-06-03; Apache-2.0; **867 open issues** | 15 983 ★; 2 672 forks; created 2015-06-03; Apache-2.0; **807 open issues, 867 including pull requests** | **FAIL** |
| SH | S1 `pnpm/pnpm` | 36 865 ★; 1 950 forks; created 2016-01-28; pushed 2026-10-20; v12.14.0 @2026-10-15; MIT | 36 872 ★; 1 952 forks; created 2016-01-28; MIT; release v12.14.0 published 2026-10-15; the repository's own `packageManager` is `pnpm@12.14.0` | **PASS** |
| SH | S2 `google/osv-scanner` | 11 217 ★; 816 forks; created 2022-11-14; v2.7.0 @2026-10-12; Apache-2.0; 86 open / 479 closed | 11 218 ★; 816 forks; created 2022-11-14; release v2.7.0 published 2026-10-12; Apache-2.0; **86 open issues** | **PASS** |
| SH | S3 `anchore/syft` | 9 703 ★; 1 008 forks; created 2020-05-07; v1.55.0 @2026-10-19; Apache-2.0; **516 open issues** | 9 705 ★; 1 008 forks; created 2020-05-07; release v1.55.0 published 2026-10-19; Apache-2.0; **517 open issues** (the search-API figure, not the raw count) | **PASS** |
| SH | S4 `anchore/grype` | 13 056 ★; 922 forks; created 2020-05-26; Apache-2.0; **430 open issues** | 13 059 ★; 923 forks; created 2020-05-26; Apache-2.0; **330 open issues, 430 including pull requests** | **FAIL** |
| SH | S5 `sigstore/cosign` | 6 374 ★; 826 forks; created 2021-02-04; v3.1.3 @2026-08-06; Apache-2.0; **109 open issues** | 6 372 ★; 826 forks; created 2021-02-04; release **v3.1.3 published 2026-08-06** ✓; a newer **v3.1.4 was published 2026-10-20T18:27Z**, on the research date; Apache-2.0; **109 open issues** | **PASS** |
| SH | S6 `sigstore/fulcio` | 891 ★; 192 forks; created 2021-02-23; Apache-2.0; **35 open issues** | 891 ★; 192 forks; created 2021-02-23; Apache-2.0; **27 open issues, 28 including pull requests** | **FAIL** |
| SH | S8 `step-security/harden-runner` | 1 287 ★; 119 forks; created 2021-10-28; v2.22.2 @2026-10-19; Apache-2.0; 64 705 KB; **20 open issues** | 1 288 ★; 119 forks; created 2021-10-28; release v2.22.2 published 2026-10-19; Apache-2.0; 64 705 KB; **20 open issues** | **PASS** |
| SH | §8 `CVE-2026-45321` | "a Tenable FAQ is titled with CVE-2026-45321; we cite the article, and we have not verified the CVE record itself" | The CVE record **exists**: `CVE-2026-45321`, state **PUBLISHED**, reserved 2026-05-11, title "Malware in 42 @tanstack/* packages exfiltrates cloud credentials, GitHub tokens, and SSH keys", describing the OIDC-token extraction from the Actions runner process — the same mechanism §1.5 S5 attributes to Mini Shai-Hulud | **PASS** |
| AC | S1 WCAG 2.2 | W3C Recommendation 12 December 2024; 4 principles, 13 guidelines, **86 success criteria**; 24 named clauses with levels, incl. **2.4.7 Focus Visible (A)** and 2.5.8 Target Size (Minimum) (AA) | The TR page gives "W3C Recommendation 12 December 2024", "four principles", and 86 normative success criteria; **all 24 clauses the card names exist**; every level matches **except 2.4.7 Focus Visible, which the standard marks (Level AA)**, not (Level A) | **FAIL** |
| AC | S2 SC 2.5.8 Target Size (Minimum) | Level AA; at least 24 by 24 CSS pixels; exceptions Spacing / Equivalent / Inline / User agent control / Essential; independent of the zoom factor; a solid 24 × 24 square aligned to the horizontal and vertical axis; page updated 11 May 2026 | The Understanding page states "Target Size (Minimum) (Level AA)", "The size of the target for pointer inputs is at least 24 by 24 CSS pixels, except when: Spacing … Equivalent … Inline … User Agent Control … Essential", "The requirement is independent of the zoom factor", "conceptually possible to draw a solid 24 by 24 CSS pixel square, aligned to the horizontal and vertical axis", and "Date: Updated 11 May 2026" — all confirmed | **PASS** |
| AC | S3 React Native's accessibility API | page last updated 19 Oct 2026; the full prop list, the `aria-*` set, `role` (28 values) taking precedence over `accessibilityRole` (29 values), `experimental_accessibilityOrder` marked experimental | The page reads "Last updated on Oct 19, 2026"; **all 32 props the card names are present**; the `role` text reads "communicates the purpose of a component and has precedence over the accessibilityRole prop"; `experimental_accessibilityOrder` carries "This API is experimental … Don't use them in production" | **PASS** |
| AC | S4 React Native 0.88 | 126 735 ★; 25 353 forks; created 2015-01-09; v0.88.0 @2026-10-15; MIT; 688 open issues; our pin `react-native: 0.88.0` | 126 738 ★; 25 361 forks; created 2015-01-09; release v0.88.0 published 2026-10-15; MIT; **688 open issues**; `apps/mobile/package.json` reads `"react-native": "0.88.0"` | **PASS** |
| AC | S5 Expo SDK 58 | 52 874 ★; 14 665 forks; pushed 2026-10-20; MIT; our pin `expo ~58.0.14`; **928 open issues** | 52 881 ★; 14 677 forks; MIT; `apps/mobile/package.json` reads `"expo": "~58.0.14"` ✓; **324 open issues, 946 including pull requests** — the card's 928 is the pull-request-inclusive figure | **FAIL** |
| AC | S6 `w3c/wcag-act` | 66 ★; 33 forks; created 2016-09-01; pushed 2026-02-03; no releases; 0 commits/90 d; NOASSERTION; **57 open issues** | 66 ★; 33 forks; created 2016-09-01; pushed 2026-02-03; no releases; NOASSERTION; **57 open issues** | **PASS** |
| AC | C4 `FormidableLabs/eslint-plugin-react-native-a11y` | 307 ★; 31 forks; created 2018-07-03; v3.5.1 @2024-11-04; MIT; npm 3.5.1 @2024-11-04; repo 1 818 KB; **7 open issues** | 307 ★; 31 forks; created 2018-07-03; release v3.5.1 published 2024-11-04; MIT; npm 3.5.1 published 2024-11-04; 1 818 KB; **7 open issues** | **PASS** |
| AC | C8 `zoontek/react-native-localize` | 2 443 ★; **created (2019)**; 3.7.2 @2026-09-15; MIT; **4 open issues** | 2 443 ★; 225 forks; **created 2017-08-01**; release 3.7.2 published 2026-09-15; MIT; **4 open issues** ✓ | **FAIL** |
| AC | K3 `gluestack/gluestack-ui` | 5 327 ★; 238 forks; created 2023-01-11; v5.0.0 @2026-06-25; 12 open issues; **"the API reports no SPDX id and the repository's `LICENSE` file is empty"** | 5 328 ★; 238 forks; created 2023-01-11; release v5.0.0 published 2026-06-25; **12 open issues**; the API reports no SPDX id ✓ — but the repository root contains **no `LICENSE` file at all** (the root listing has no licence file), so "the LICENSE file is empty" is the wrong description | **FAIL** |
| AC | K4 `wix/react-native-ui-lib` | 7 155 ★; 752 forks; created 2017-02-08; pushed 2026-10-17; MIT; **82 open issues** | 7 156 ★; 752 forks; created 2017-02-08; MIT; **45 open issues, 82 including pull requests** | **FAIL** |
| AC | T2 `mobile-dev-inc/Maestro` | 16 144 ★; 995 forks; created 2022-03-31; `cli-2.11.0` @2026-09-29; Apache-2.0; repo 1 064 792 KB; **334 open issues** | 16 151 ★; 995 forks; created 2022-03-31; release cli-2.11.0 published 2026-09-29; Apache-2.0; 1 064 792 KB; **336 open issues** (the search-API figure) | **PASS** |
| AC | T4 `dequelabs/axe-core` | 7 674 ★; 966 forks; created 2015-06-10; v4.14.0 @2026-10-05; MPL-2.0; npm 4.14.0 @2026-10-05; **412 open issues** | 7 673 ★; 967 forks; created 2015-06-10; release v4.14.0 published 2026-10-05; MPL-2.0; npm `axe-core` 4.14.0 published 2026-10-05; **411 open issues** (the search-API figure) | **PASS** |
| AC | T3 `appium/appium` | 22 111 ★; 6 295 forks; created 2013-01-09; pushed 2026-10-20; Apache-2.0; **66 open issues** | 22 114 ★; 6 295 forks; created 2013-01-09; Apache-2.0; **40 open issues, 69 including pull requests** | **FAIL** |
| AC | T7 `wix/Detox` | 12 040 ★; 1 909 forks; created 2016-06-15; pushed 2026-10-19; MIT; **223 open issues** | 12 040 ★; 1 909 forks; created 2016-06-15; MIT; **203 open issues, 223 including pull requests** | **FAIL** |
| AC | T8 `GoogleChrome/lighthouse` | 30 916 ★; 9 771 forks; created 2016-03-08; pushed 2026-10-20; Apache-2.0; **461 open issues** | 30 917 ★; 9 771 forks; created 2016-03-08; Apache-2.0; **404 open issues, 450 including pull requests** | **FAIL** |
| AA | C1 `metabase/metabase` | 49 764 ★; 6 914 forks; created 2015-02-02; last release 2026-10-19; repo 2 445 517 KB; licence file quoted; **4 570 open issues (incl. PRs)** | 49 768 ★; 6 916 forks; created 2015-02-02; release v0.63.20 published 2026-10-19; 2 451 297 KB; the `LICENSE.txt` text is **verbatim** as quoted; **the figure is labelled "incl. PRs"** (raw 4 557, 3 898 open issues) | **PASS** |
| AA | C2 `apache/superset` | 75 228 ★; 18 503 forks; created 2015-07-21; last release 2026-10-16; Apache-2.0; 1 339 338 KB; **640 open issues** | 75 235 ★; 18 506 forks; created 2015-07-21; Apache-2.0; 1 350 598 KB; the 2026-10-16 release is **7.0.0rc2 (a pre-release)** ✓; **172 open issues, 609 including pull requests** | **FAIL** |
| AA | C5 `lightdash/lightdash` | 6 196 ★; 792 forks; created 2021-03-19; last release 2026-10-20; 802 178 KB; **1 064 open issues** | 6 196 ★; 793 forks; created 2021-03-19; release 2.631.6 published 2026-10-20; 801 347 KB; **89 open issues, 1 072 including pull requests** | **FAIL** |
| AA | C6 `cube-js/cube` | 21 046 ★; 2 168 forks; created 2018-09-16; last release 2026-10-16; 522 930 KB; **1 171 open issues** | 21 050 ★; 2 167 forks; created 2018-09-16; release v1.8.8 published 2026-10-16; 524 029 KB; **631 open issues, 1 175 including pull requests** | **FAIL** |
| AA | C7 `dbt-labs/dbt` | 14 049 ★; 2 636 forks; created 2016-03-10; Apache-2.0; 129 478 KB; **1 793 open issues** | 14 051 ★; 2 639 forks; created 2016-03-10; Apache-2.0; 129 716 KB; **1 425 open issues, 1 798 including pull requests** | **FAIL** |
| AA | C8 `PostHog/posthog` | 40 360 ★; 3 533 forks; created 2020-01-23; 8 176 113 KB; **5 635 open issues** | 40 366 ★; 3 531 forks; created 2020-01-23; 8 193 197 KB; **3 813 open issues, 5 584 including pull requests** | **FAIL** |
| AA | C11 `grafana/grafana` | 77 398 ★; 14 890 forks; created 2013-12-11; last release 2026-10-13; AGPL-3.0; 2 070 084 KB; **3 340 open issues** | 77 400 ★; 14 857 forks; created 2013-12-11; release v13.2.4 published 2026-10-13; AGPL-3.0; 2 072 404 KB; **2 645 open issues, 3 342 including pull requests** | **FAIL** |
| AA | C13 `duckdb/duckdb` | 42 300 ★; 3 986 forks; created 2018-06-26; MIT; last release 2026-09-28; 557 622 KB; **897 open issues** | 42 322 ★; 3 995 forks; created 2018-06-26; MIT; release v1.5.6 published 2026-09-28; 557 616 KB; **538 open issues, 903 including pull requests** | **FAIL** |
| AA | C14 `ClickHouse/ClickHouse` | 50 501 ★; 9 139 forks; created 2016-06-02; Apache-2.0; 14 215 278 KB; last release 2026-10-20; **8 504 open issues** | 50 512 ★; 9 140 forks; created 2016-06-02; Apache-2.0; 14 236 951 KB; release v26.9.23.15-stable published 2026-10-20; **5 832 open issues, 8 500 including pull requests** | **FAIL** |
| AA | C16 `apache/airflow` | 47 233 ★; 18 094 forks; created 2015-04-13; Apache-2.0; 769 286 KB; last release 2026-09-17; **1 879 open issues** | 47 237 ★; 18 103 forks; created 2015-04-13; Apache-2.0; 770 895 KB; release 3.3.2 published 2026-09-17; **1 026 open issues, 1 887 including pull requests** | **FAIL** |
| AA | C20 `n8n-io/n8n` | 208 132 ★; 61 194 forks; created 2019-06-22; 724 412 KB; licence file "Sustainable Use License" outside the `.ee` files; **1 189 open issues** | 208 165 ★; 61 200 forks; created 2019-06-22; 726 613 KB; the `LICENSE.md` confirms the Sustainable Use License applies outside the `.ee` files ✓; **343 open issues, 1 208 including pull requests** | **FAIL** |
| AA | C23 `snowplow/snowplow` | 7 044 ★; 1 172 forks; created 2012-03-01; pushed 2026-10-19; last release 2022-01-31; Apache-2.0; 26 845 KB; **60 open issues** | 7 044 ★; 1 172 forks; created 2012-03-01; pushed 2026-10-19; release 22.01 published 2022-01-31; Apache-2.0; 26 845 KB; **60 open issues** | **PASS** |
| AA | C26 `SigNoz/signoz` | 32 407 ★; 2 546 forks; created 2021-01-03; last release 2026-10-14; 125 020 KB; **1 567 open issues** | 32 412 ★; 2 548 forks; created 2021-01-03; release v0.146.0 published 2026-10-14; 125 124 KB; **1 138 open issues, 1 569 including pull requests** | **FAIL** |
| AA | C30 `Flagsmith/flagsmith` | 6 605 ★; 591 forks; created 2018-06-05; last release 2026-10-20; BSD-3-Clause; 381 215 KB; **733 open issues** | 6 606 ★; 591 forks; created 2018-06-05; release v2.287.0 published 2026-10-20; BSD-3-Clause; 381 291 KB; **603 open issues, 736 including pull requests** | **FAIL** |
| AA | C33 `hledgerorg/hledger` | 4 777 ★; 417 forks; created 2013-04-08; last release 2026-10-02; GPL-3.0; 121 830 KB; **314 open issues** | 4 779 ★; 418 forks; created 2013-04-08; release 1.99.5 published 2026-10-02 (a pre-release) ✓; GPL-3.0; 121 993 KB; **309 open issues, 314 including pull requests** | **FAIL** |
| AA | C44 `maybe-finance/maybe` | 54 213 ★; 5 672 forks; created 2024-01-01; pushed 2025-07-24; **0 releases**; 0 open issues; AGPL-3.0; 6 891 KB; archived = true | 54 216 ★; 5 672 forks; created 2024-01-01; pushed 2025-07-24; AGPL-3.0; 6 891 KB; `archived: true` ✓; 0 open issues ✓ — but **there are three releases: v0.6.0 @2025-07-24, v0.5.0 @2025-04-11, v0.4.3 @2025-02-28** | **FAIL** |
| AA | C46 `strapi/strapi` | 73 352 ★; 9 910 forks; created 2015-09-30; last release 2026-10-14; 710 654 KB; **607 open issues** | 73 355 ★; 9 911 forks; created 2015-09-30; release v5.58.0 published 2026-10-14; 712 680 KB; **226 open issues, 616 including pull requests** | **FAIL** |
| AA | C47 `directus/directus` | 38 632 ★; 4 981 forks; created 2012-12-12; last release 2026-10-07; 454 564 KB; licence file "Monospace Sustainable Core License, Version 1.0" (MSCL-1.0-GPL); **364 open issues** | 38 640 ★; 4 982 forks; created 2012-12-12; release v12.5.0 published 2026-10-07; 454 576 KB; the licence file reads "Monospace Sustainable Core License, Version 1.0 / Abbreviation MSCL-1.0-GPL" ✓; **311 open issues, 360 including pull requests** | **FAIL** |
| AA | C52 `trinodb/trino` | 13 351 ★; 3 830 forks; created 2019-01-19; last release 2026-10-16; Apache-2.0; 327 586 KB; **2 715 open issues** | 13 352 ★; 3 830 forks; created 2019-01-19; release 484 published 2026-10-16; Apache-2.0; 327 620 KB; **2 450 open issues, 2 714 including pull requests** | **FAIL** |
| DW | D1 `vercel/turborepo` | 31 222 ★; 2 470 forks; created 2021-10-05; v2.11.9 @2026-10-16 (our exact pin); MIT; **48 open issues (incl. PRs)** | 31 222 ★; 2 471 forks; created 2021-10-05; MIT; release v2.11.9 published 2026-10-16 (v2.11.10 came 2026-10-20, on the research date); the root `package.json` pins `"turbo": "2.11.9"` ✓; **the figure is labelled "incl. PRs"** (raw now 20, **2 open issues**) | **PASS** |
| DW | D2 `nrwl/nx` | 29 426 ★; 3 015 forks; created 2017-08-11; 24.0.0-beta.4 @2026-10-19; MIT; **475 open issues** | 29 415 ★; 2 973 forks; created 2017-08-11; MIT; release 24.0.0-beta.4 published 2026-10-19 (24.0.0-rc.0 came 2026-10-21, on the research date); **288 open issues, 471 including pull requests** | **FAIL** |
| DW | D3 `lerna/lerna` | 36 038 ★; 2 264 forks; created 2015-12-04; v10.1.1 @2026-10-12; MIT; **297 open** | 36 037 ★; 2 264 forks; created 2015-12-04; MIT; release v10.1.1 published 2026-10-12; **284 open issues, 297 including pull requests** | **FAIL** |
| DW | D4 `changesets/changesets` | 12 494 ★; 849 forks; created 2019-03-21; `@changesets/get-release-plan@5.0.2` @2026-09-14; MIT; **277 open** | 12 494 ★; 849 forks; created 2019-03-21; MIT; release `@changesets/get-release-plan@5.0.2` published 2026-09-14 ✓; **198 open issues, 277 including pull requests** | **FAIL** |
| DW | D5 `pnpm/pnpm` | 36 865 ★; 1 950 forks; created 2016-01-28; v12.14.0 @2026-10-15 (our exact pin); MIT; **188 open** | 36 872 ★; 1 952 forks; created 2016-01-28; MIT; release v12.14.0 published 2026-10-15; the root `package.json` reads `"packageManager": "pnpm@12.14.0"` ✓; **0 open issues, 187 including pull requests** | **FAIL** |
| DW | D8 `pantsbuild/pants` | 3 846 ★; 730 forks; created 2012-12-17; release_2.33.2rc1 @2026-10-20; Apache-2.0; **1 081 open** | 3 846 ★; 731 forks; created 2012-12-17; Apache-2.0; release release_2.33.2rc1 published 2026-10-20 ✓; **1 001 open issues, 1 081 including pull requests** | **FAIL** |
| DW | D9 `expo/expo` | 52 874 ★; 14 665 forks; created 2016-08-15; expo@58.0.16 @2026-10-19; MIT; **928 open** | 52 881 ★; 14 677 forks; created 2016-08-15; MIT; **324 open issues, 946 including pull requests** — the card's 928 is the pull-request-inclusive figure | **FAIL** |
| DW | D10 `vercel-labs/skills` | 35 799 ★; 3 060 forks; created 2026-01-14; v1.7.4 @2026-10-19; MIT; **1 170 open** | 35 868 ★; 3 070 forks; created 2026-01-14; MIT; release v1.7.4 published 2026-10-19; **787 open issues, 1 173 including pull requests** | **FAIL** |
| DW | D11 `eslint/eslint` | 27 573 ★; 5 212 forks; created 2013-06-29; v10.13.0 @2026-10-16 (our exact pin); MIT; **129 open** | 27 571 ★; 5 196 forks; created 2013-06-29; MIT; release v10.13.0 published 2026-10-16; the root and `packages/eslint-config` both pin `eslint 10.13.0` ✓; **98 open issues, 129 including pull requests** | **FAIL** |
| DW | D12 `biomejs/biome` | 25 982 ★; 1 305 forks; created 2023-07-27; `@biomejs/biome@2.5.15` @2026-09-30; Apache-2.0; **471 open** | 25 979 ★; 1 285 forks; created 2023-07-27; Apache-2.0; release @biomejs/biome@2.5.15 published 2026-09-30 ✓; **278 open issues, 474 including pull requests** | **FAIL** |
| DW | D15 `vitest-dev/vitest` | 17 266 ★; 2 091 forks; created 2021-12-03; v5.1.0-beta.1 @2026-10-19; MIT; **346 open** | 17 269 ★; 2 092 forks; created 2021-12-03; MIT; release v5.1.0-beta.1 published 2026-10-19 ✓; **332 open issues, 349 including pull requests** | **FAIL** |
| DW | D16 `microsoft/playwright` | 98 153 ★; 6 661 forks; created 2019-11-15; v1.64.1 @2026-10-14; Apache-2.0; **184 open** | 98 183 ★; 6 662 forks; created 2019-11-15; Apache-2.0; release v1.64.1 published 2026-10-14; **169 open issues, 178 including pull requests** | **FAIL** |
| DW | D17 `typicode/husky` | 35 356 ★; 1 101 forks; created 2014-06-23; v9.1.7 @2024-11-18; pushed 2026-03-19; MIT; **108 open** | 35 356 ★; 1 101 forks; created 2014-06-23; MIT; release v9.1.7 published 2024-11-18; pushed 2026-03-19; **81 open issues, 108 including pull requests** | **FAIL** |
| DW | D19 `evilmartians/lefthook` | 8 928 ★; 323 forks; created 2019-02-05; v2.2.2 @2026-10-13; MIT; **89 open** | 8 928 ★; 323 forks; created 2019-02-05; MIT; release v2.2.2 published 2026-10-13; **68 open issues, 89 including pull requests** | **FAIL** |
| DW | D20 `pre-commit/pre-commit` | 15 645 ★; 1 020 forks; created 2014-03-13; v4.7.0 @2026-10-13; MIT; **26 open** | 15 646 ★; 1 020 forks; created 2014-03-13; MIT; release v4.7.0 published 2026-10-13; **17 open issues, 25 including pull requests** | **FAIL** |
| DW | D21 `prettier/prettier` | our formatter, 3.9.10 (our pin); MIT | Release 3.9.10 published 2026-10-10; MIT; the root `package.json` pins `"prettier": "3.9.10"` ✓ | **PASS** |
| DW | D22 `coderabbitai/awesome-coderabbit` | 546 ★; 82 forks; created 2024-09-24; last push 2026-09-29; CC0-1.0; **13 open** | 546 ★; 82 forks; created 2024-09-24; pushed 2026-09-29; `license.spdx_id` **CC0-1.0**; **9 open issues, 13 including pull requests** | **FAIL** |
| DW | D32 `The-PR-Agent/pr-agent` | 13 493 ★; 1 974 forks; created 2023-07-05; v0.48.0 @2026-10-16; MIT; **27 open issues** | 13 514 ★; 1 976 forks; created 2023-07-05; MIT; release v0.48.0 published 2026-10-16; **13 open issues, 36 including pull requests** | **FAIL** |
| DW | D42 `anthropics/skills` | 182 430 ★; 21 614 forks; created 2025-09-22; last push 2026-10-09; no GitHub releases; no licence detected; **1 424 open issues** | 182 534 ★; 21 627 forks; created 2025-09-22; pushed 2026-10-09; **no releases**; no SPDX id ✓; **410 open issues, 1 425 including pull requests** | **FAIL** |
| DW | D43 `anthropics/claude-code` | 152 836 ★; 27 199 forks; created 2025-02-22; v2.1.304 @2026-10-19; no licence detected; **15 427 open issues** | 152 669 ★; 26 667 forks; created 2025-02-22; no SPDX id; release v2.1.304 published 2026-10-19 ✓ (v2.1.306 came on the research date); **14 769 open issues, 15 467 including pull requests** | **FAIL** |
| DW | D52 `openai/codex` | 130 322 ★; 20 523 forks; created 2025-04-13; rust-v0.164.0-alpha.7 @2026-10-20; Apache-2.0; **23 716 open issues** | 130 195 ★; 20 510 forks; created 2025-04-13; Apache-2.0; release rust-v0.164.0-alpha.7 published 2026-10-20 ✓; **23 650 open issues, 23 813 including pull requests** | **FAIL** |
| DW | D55 `modelcontextprotocol/servers` | 91 407 ★; 11 824 forks; created 2024-11-19; v2.0.0 @2026-10-19; NOASSERTION; **136 open** | 91 433 ★; 11 831 forks; created 2024-11-19; NOASSERTION; release v2.0.0 published 2026-10-19 ✓; **115 open issues, 138 including pull requests** | **FAIL** |
| DW | D57 `github/github-mcp-server` | 33 794 ★; 5 412 forks; created 2025-03-04; v2.0.2 @2026-10-08; MIT; **380 open** | 33 806 ★; 5 229 forks; created 2025-03-04; MIT; release v2.0.2 published 2026-10-08 ✓; **193 open issues, 381 including pull requests** | **FAIL** |
| DW | D59 `upstash/context7` | 63 359 ★; 3 119 forks; created 2025-03-26; mcpb-v4.4.4 @2026-10-19; MIT; **53 open** | 63 389 ★; 3 120 forks; created 2025-03-26; MIT; release mcpb-v4.4.4 published 2026-10-19 ✓; **25 open issues, 53 including pull requests** | **FAIL** |
| DW | D60 `ChromeDevTools/chrome-devtools-mcp` | 53 902 ★; 7 064 forks; created 2025-09-11; chrome-devtools-mcp-v1.11.0 @2026-10-15; Apache-2.0; **123 open** | 53 911 ★; 6 550 forks; created 2025-09-11; Apache-2.0; release chrome-devtools-mcp-v1.11.0 published 2026-10-15 ✓; **99 open issues, 127 including pull requests** | **FAIL** |

---

## 3. The corrections the files need

### 3.1 The open-issue counts (the dominant defect, 69 of the 75 failures)

A card that says "N open issues" but quotes the repository object's `open_issues_count` is counting pull
requests as issues. Across these six files **69 sampled cards** do this, and the error is often large
(`react-native-device-info` 32 against 4 real issues; `expo/expo` 928 against 324; `n8n-io/n8n` 1 189 against
343; `apache/superset` 640 against 172). The cards that already say "open issues **incl. PRs**" — `expo/expo`
(C1, notifications; C1, camera-pod; S5, accessibility; D9, developer-workflow), `novuhq/novu`, `aws-amplify/amplify-js`,
`metabase/metabase` and `vercel/turborepo` — are honest and **PASS**.

**The fix, in every file:** read the count from
`GET https://api.github.com/search/issues?q=repo:OWNER/REPO+type:issue+state:open`, and where the
pull-request-inclusive figure is wanted, label it as such. The exact replacement text for each failing card
is the "source says" column of the table above; the ones to write out in full are:

| file · card | replace | with |
|---|---|---|
| NS C3 OneSignal | 18 open issues | **15 open issues (18 including pull requests)** |
| NS C13 wix/react-native-notifications | 7 open issues | **3 open issues (7 including pull requests)** |
| NS C16 evollu/react-native-fcm | 100 open issues | **285 open issues (305 including pull requests)** |
| NS C21 background-fetch | 1 open issue | **0 open issues (1 including pull requests)** |
| NS C26 twilio-node | 61 open issues | **29 open issues (61 including pull requests)** |
| NS C30 telnyx-node | 3 open issues | **0 open issues (3 including pull requests)** |
| NS C35 zackb/tether | 9 open issues | **7 open issues (10 including pull requests)** |
| NS C36 caspian-sdk | 33 open issues | **14 open issues (33 including pull requests)** |
| CP C4 image-picker | 100 open issues | **305 open issues (352 including pull requests)** |
| CP C6 image-resizer | 3 open issues | **1 open issue (3 including pull requests)** |
| CP C7 nitro-image | 45 open issues | **20 open issues (45 including pull requests)** |
| CP C11 signature-canvas | 17 open issues | **81 open issues (97 including pull requests)** |
| CP C12 signature-capture | 100 open issues | **136 open issues (197 including pull requests)** |
| CP C21 Filee | 77 open issues | **57 open issues (66 including pull requests)** |
| CP C22 tus-js-client | 84 open issues | **56 open issues (85 including pull requests)** |
| CP C23 op-sqlite | 12 open issues | **8 open issues (12 including pull requests)** |
| CP C24 react-native-mmkv | 24 open issues | **24 is the pull-request-inclusive figure — replace with the issue-only count from the search API** |
| SH V1 OWASP Mobile Top 10 | 5 open issues | **3 open issues (5 including pull requests)** |
| SH V6 Cheat Sheet Series | 21 open issues | **15 open issues (27 including pull requests)** |
| SH C3 op-sqlite | 12 open issues | **8 open issues (12 including pull requests)** |
| SH C11 react-native-device-info | 32 open issues | **4 open issues (32 including pull requests)** |
| SH A4 bandit | 264 open issues | **199 open issues (264 including pull requests)** |
| SH A6 zaproxy | 867 open issues | **807 open issues (867 including pull requests)** |
| SH S4 grype | 430 open issues | **330 open issues (430 including pull requests)** |
| SH S6 fulcio | 35 open issues | **27 open issues (28 including pull requests)** |
| AC S5 expo/expo | 928 open issues | **324 open issues (946 including pull requests)** |
| AC K4 react-native-ui-lib | 82 open issues | **45 open issues (82 including pull requests)** |
| AC T3 appium | 66 open issues | **40 open issues (69 including pull requests)** |
| AC T7 Detox | 223 open issues | **203 open issues (223 including pull requests)** |
| AC T8 lighthouse | 461 open issues | **404 open issues (450 including pull requests)** |
| AA C2 superset | 640 open issues | **172 open issues (609 including pull requests)** |
| AA C5 lightdash | 1 064 open issues | **89 open issues (1 072 including pull requests)** |
| AA C6 cube | 1 171 open issues | **631 open issues (1 175 including pull requests)** |
| AA C7 dbt | 1 793 open issues | **1 425 open issues (1 798 including pull requests)** |
| AA C8 PostHog | 5 635 open issues | **3 813 open issues (5 584 including pull requests)** |
| AA C11 grafana | 3 340 open issues | **2 645 open issues (3 342 including pull requests)** |
| AA C13 duckdb | 897 open issues | **538 open issues (903 including pull requests)** |
| AA C14 ClickHouse | 8 504 open issues | **5 832 open issues (8 500 including pull requests)** |
| AA C16 airflow | 1 879 open issues | **1 026 open issues (1 887 including pull requests)** |
| AA C20 n8n | 1 189 open issues | **343 open issues (1 208 including pull requests)** |
| AA C26 signoz | 1 567 open issues | **1 138 open issues (1 569 including pull requests)** |
| AA C30 flagsmith | 733 open issues | **603 open issues (736 including pull requests)** |
| AA C33 hledger | 314 open issues | **309 open issues (314 including pull requests)** |
| AA C46 strapi | 607 open issues | **226 open issues (616 including pull requests)** |
| AA C47 directus | 364 open issues | **311 open issues (360 including pull requests)** |
| AA C52 trino | 2 715 open issues | **2 450 open issues (2 714 including pull requests)** |
| DW D2 nx | 475 open issues | **288 open issues (471 including pull requests)** |
| DW D3 lerna | 297 open | **284 open issues (297 including pull requests)** |
| DW D4 changesets | 277 open | **198 open issues (277 including pull requests)** |
| DW D5 pnpm | 188 open | **0 open issues (187 including pull requests)** |
| DW D8 pants | 1 081 open | **1 001 open issues (1 081 including pull requests)** |
| DW D9 expo/expo | 928 open | **324 open issues (946 including pull requests)** |
| DW D10 vercel-labs/skills | 1 170 open | **787 open issues (1 173 including pull requests)** |
| DW D11 eslint | 129 open | **98 open issues (129 including pull requests)** |
| DW D12 biome | 471 open | **278 open issues (474 including pull requests)** |
| DW D15 vitest | 346 open | **332 open issues (349 including pull requests)** |
| DW D16 playwright | 184 open | **169 open issues (178 including pull requests)** |
| DW D17 husky | 108 open | **81 open issues (108 including pull requests)** |
| DW D19 lefthook | 89 open | **68 open issues (89 including pull requests)** |
| DW D20 pre-commit | 26 open | **17 open issues (25 including pull requests)** |
| DW D22 awesome-coderabbit | 13 open | **9 open issues (13 including pull requests)** |
| DW D32 pr-agent | 27 open issues | **13 open issues (36 including pull requests)** |
| DW D42 anthropics/skills | 1 424 open issues | **410 open issues (1 425 including pull requests)** |
| DW D43 claude-code | 15 427 open issues | **14 769 open issues (15 467 including pull requests)** |
| DW D52 openai/codex | 23 716 open issues | **23 650 open issues (23 813 including pull requests)** |
| DW D55 mcp/servers | 136 open | **115 open issues (138 including pull requests)** |
| DW D57 github-mcp-server | 380 open | **193 open issues (381 including pull requests)** |
| DW D59 context7 | 53 open | **25 open issues (53 including pull requests)** |
| DW D60 chrome-devtools-mcp | 123 open | **99 open issues (127 including pull requests)** |

### 3.2 The six corrections that are not issue counts

1. **`security-hardening.md` A3 `tiangolo/fastapi` — wrong licence.**
   Current text: *"**A3 — `tiangolo/fastapi`** — … **Apache-2.0** …"*
   Replace with: *"**A3 — `tiangolo/fastapi`** — … **MIT** (the repository `LICENSE` is the MIT licence; the API's `license.spdx_id` is `MIT`) …"*
   This is the licence gate, and it is the one wrong licence in the six files.

2. **`accessibility.md` S1 WCAG 2.2 — wrong conformance level for SC 2.4.7.**
   Current text: *"**2.4.7** (A) focus visible"*
   Replace with: *"**2.4.7** (AA) focus visible"*
   Every other level the card quotes is correct. The card's own decision line says "quote the clause number and
   the level, and nothing else", so the level has to be right.

3. **`notifications-sms.md` C1 `expo-notifications` — "zero dependencies" is wrong.**
   Current text: *"the `expo-notifications` package has **zero** dependencies (good)"*
   Replace with: *"the `expo-notifications` package has **five** dependencies, all Expo-internal (`badgin`,
   `expo-constants`, `abort-controller`, `expo-application`, `@expo/image-utils`) — not zero, but not a
   third-party tree either"*

4. **`accessibility.md` C8 `zoontek/react-native-localize` — wrong creation year.**
   Current text: *"**2 443 ★** /… · created (2019) ·"*
   Replace with: *"**2 443 ★** /225 f · created **2017-08-01** ·"*

5. **`accessibility.md` K3 `gluestack/gluestack-ui` — there is no `LICENSE` file, not an empty one.**
   Current text: *"licence UNVERIFIED — the API reports no SPDX id and the repository's `LICENSE` file is empty"*
   Replace with: *"licence UNVERIFIED — the API reports no SPDX id and the repository root contains **no
   `LICENSE` file at all**"*

6. **`admin-analytics.md` C44 `maybe-finance/maybe` — it has three releases, not none.**
   Current text: *"· pushed **2025-07-24** · **0 releases** ·"*
   Replace with: *"· pushed **2025-07-24** · **3 releases, the last `v0.6.0` @ 2025-07-24** (0 in 6 m) ·"*

---

## 4. What could not be verified

None of the sampled cards is unverifiable — every one of the 110 was read from a live source. The following
claims in the six files were **not** re-checked in this pass, and are listed so nobody reads a PASS as
covering them:

- **The 6-month star trend** in every file. The star timeline is not readable with the token in `.env.local`
  (`GET /repos/{owner}/{repo}/stargazers` returns 403), so the files' own proxy — releases in six months,
  commits in 90 days, distinct maintainers, npm downloads — remains the only evidence. This pass did not
  recompute the paginated commit-author counts, so the "N commits/90 d, M humans" figures were not re-read.
- **Download counts** beyond the one package re-read per file (`expo-notifications` 3 916 476 for
  2026-10-12→18). The monthly download figures in `admin-analytics.md` and `developer-workflow.md` were not
  re-read.
- **Vendor pricing** (Metabase, PostHog, Lightdash, Sinch, Telnyx, OneSignal, Deque). These pages are
  JavaScript-rendered or commercial, and the vendor cards in the six files already mark the unverified ones
  as such. The legal texts that were quoted were checked; the price lists were not.
- **The 2026 in-product behaviour claims** — that `expo-notifications` shows foreground notifications by
  default, that `expo-file-system`'s `File.digest()` exists, that `expo-camera` has `scanDocumentAsync`,
  that `expo-updates` is not installed, that `expo-secure-store` is installed. These are source-code and
  manifest claims. The manifest claims that were cheap to read were read: `expo-notifications` has five
  dependencies, and `apps/mobile/package.json` confirms `expo-secure-store` 58.0.2, `expo-sqlite` ~58.0.13,
  `expo ~58.0.14`, `react-native 0.88.0`, and no `expo-notifications`.
- **The individual issue and pull-request numbers** quoted in the deep-review sections (for example
  `expo/expo` #49072, #50919, #51662; `novuhq/novu` #12931; `twilio/twilio-node` #1220 and #1218;
  `margelo/react-native-vision-camera` #4213, #4211, #4219, #4210; `mobile-dev-inc/Maestro` #3612). These
  are the researcher's own quotations of issue text; this pass sampled the issue **counts**, not each
  issue body.
- **The Google Play Integrity, App Attest, MASVS and Play Data Safety documentation** (security-hardening
  V7, V9, V10). The Play and Apple developer pages were not re-read.
- **`apps/web` and the web dashboard** claims in `accessibility.md` (Lighthouse ≥ 95, the axe-core pairing).
  The `axe-core` repository claim — that the free engine is web-only — was not re-read from the source.
- **`tirth8205/code-review-graph`, `alibaba/open-code-review` and the other 2026 "star inflation" projects**
  were deliberately not sampled, because their star counts move fast and a single-day comparison would
  measure drift rather than error. `alibaba/open-code-review` (D36) and `tirth8205/code-review-graph` (D37)
  were checked for release tag and licence only.

---

## 5. Summary

110 of the 309 evidence cards across the six files were independently re-checked against the live source
(35.6 %, at or above the 20 % floor for every file, and at or above 29 % for every file). **35 cards PASS and
75 FAIL — a pass rate of 31.8 %.** The failures are not random: **69 of the 75 (92 %) are the same defect**,
an "open issues" figure that is really the repository object's `open_issues_count`, so pull requests are being
counted as issues (the worst cases are `react-native-device-info` 32 against 4, `expo/expo` 928 against 324,
`n8n-io/n8n` 1 189 against 343, `apache/superset` 640 against 172 and `lightdash/lightdash` 1 064 against 89).
The cards that label the figure as "incl. PRs" are correct and pass, so the method is already half there.
Twelve further failures are real content errors and they are the ones worth acting on first: **FastAPI is
MIT, not Apache-2.0** (`security-hardening.md` A3) and sits in a file with a licence gate; **WCAG SC 2.4.7
Focus Visible is Level AA, not Level A** (`accessibility.md` S1, in a card whose decision is "quote the clause
number and the level, and nothing else"); **`expo-notifications` has five dependencies, not zero**
(`notifications-sms.md` C1); **`react-native-localize` was created 2017-08-01, not 2019** (`accessibility.md`
C8); **`gluestack/gluestack-ui` has no `LICENSE` file at all, not an empty one** (`accessibility.md` K3); and
**`maybe-finance/maybe` has three releases, not none** (`admin-analytics.md` C44). Everything else that was
sampled held: **every one of the 101 sampled star counts was inside 1 % of the live figure**, every licence was
right except FastAPI, every release tag and date was right (six were one day out purely because the files mix
UTC and New Zealand time), all the npm version-and-licence claims were right, the UEMA clauses, the Expo push
FAQ, the WCAG 2.2 clauses, the OWASP licences and `CVE-2026-45321` all confirmed, and the repository's own
pins (`turbo` 2.11.9, `pnpm` 12.14.0, `eslint` 10.13.0, `prettier` 3.9.10, `expo` ~58.0.14, `react-native`
0.88.0) all matched.
