# VERIFICATION-B — verifier pass over the 2026 research files (V4 §12.3)

**Date:** 2026-10-21 · **Role:** QA / verifier · **Task:** re-check the evidence cards of the 2026
research files against the real sources.

---

## 0. Four of the six named files do not exist

The brief named six files. Only two of them are in the repository.

| named file | in the repo? | consequence |
|---|---|---|
| `docs/research/2026/notifications-sms.md` | **no** | no cards to verify |
| `docs/research/2026/camera-pod.md` | **no** | no cards to verify |
| `docs/research/2026/ci-cd-ota-observability-testing.md` | yes | verified below |
| `docs/research/2026/security-hardening.md` | **no** | no cards to verify |
| `docs/research/2026/accessibility.md` | **no** | no cards to verify |
| `docs/research/2026/multilingual-voice-i18n.md` | yes | verified below |

`docs/research/2026/` holds 18 files: `auth-better-auth-ecosystem`, `background-location-battery`,
`ci-cd-ota-observability-testing`, `llm-tool-calling`, `map-rendering-offline-tiles`,
`multilingual-voice-i18n`, `navigation-turn-by-turn`, `nz-address-parsing-geocoding`,
`ocr-label-scanning`, `offline-first-sync-local-dbs`, `on-device-stt-tts-vad-kws`, `oss-maps-courier`,
`payments-subscriptions`, `react-native-design-systems-motion`, `routing-vrp-engines`,
`SPRINT-SUMMARY`, `voice-agent-frameworks`, `web-dashboard-nextjs`. A search of the whole repository
for a file whose name contains `notification`, `camera`, `pod`, `security` or `accessib` returns
nothing under `docs/`. The four missing areas are therefore **not verifiable** — there is no
artefact to check, and no verdict is offered for them. The 20 % rule has been applied in full to the
two files that do exist.

---

## 1. Method

1. Counted the evidence cards in each file.
2. Picked the cards to check spread across the file: every card carrying a licence claim, an
   advisory or CVE id, a star count, a release date, a download count or a weights licence, plus
   plain repository cards from the top, the middle and the end of each file.
3. Re-read each picked card from the live source — no second-hand source and no memory:
   - `https://api.github.com/repos/<owner>/<repo>` (stars, created, pushed, licence, archived)
   - `https://api.github.com/repos/<owner>/<repo>/releases` (last release and its date)
   - `https://api.github.com/repos/<owner>/<repo>/security-advisories` (GHSA id, severity, CVSS)
   - `https://api.github.com/search/repositories?q=repo:<owner>/<repo>` (used once the REST quota ran out)
   - `https://github.com/<owner>/<repo>/releases.atom` (the public release feed, ISO timestamps)
   - `https://registry.npmjs.org/<package>/latest` (version, licence)
   - `https://api.npmjs.org/downloads/point/last-month/<package>` (downloads, exact window)
   - `https://huggingface.co/api/models/<id>` (weights licence, download count, last modified)
   - `https://raw.githubusercontent.com/<owner>/<repo>/main/LICENSE` (where the API says NOASSERTION)
   - the model-card files on huggingface.co (voice and language lists)
4. A card **passes** when the repository or product exists, the star count is within 20 % of the
   recorded figure, the release or commit date falls in the stated window, the licence is the one
   recorded, and the advisory id, CVE or standard named really exists with the severity claimed.
5. Where a figure is a dated snapshot, the card passes and the later movement is noted: renovate,
   cosign, langfuse and grafana all published again on the night of 2026-10-20 NZ time, after the
   researcher read them, so those cards were true when written and are stale only by hours.
6. The GitHub REST quota (60 requests an hour, unauthenticated) was exhausted part way through the
   pass. The remaining release and repository checks were made against the public release Atom feed
   and the search API, which serve the same data.

**Not re-derived:** the 90-day commit and maintainer counts (`c90`, `maint`), the commit-level
readings quoted in the deep-review sections, every benchmark figure, and every vendor accuracy
claim. Those need a repository clone and a runner, not an HTTP read.

---

## 2. Coverage

| file | evidence cards in the file | cards checked | share | PASS | FAIL | not verifiable |
|---|---|---|---|---|---|---|
| `ci-cd-ota-observability-testing.md` | 50 (the section heading says 46 — see §5) | 14 | 28.0 % | 14 | 0 | 0 |
| `multilingual-voice-i18n.md` | 46 | 21 | 45.7 % | 20 | 1 | 0 |
| `notifications-sms.md`, `camera-pod.md`, `security-hardening.md`, `accessibility.md` | file absent | 0 | — | — | — | 4 files |
| **total (the two files that exist)** | **96** | **35** | **36.5 %** | **34** | **1** | **0** |

---

## 3. Card-by-card result

### 3.1 `docs/research/2026/ci-cd-ota-observability-testing.md`

| file | card | claim | source says | verdict |
|---|---|---|---|---|
| ci-cd-ota | 1 · `expo/expo` | ★52,869 · created 2016-08-15 · last release `expo-template-tabs@58.0.25` @2026-10-19 · MIT | API: 52,881 ★, created 2016-08-15, MIT, pushed 2026-10-21. The release `expo-template-tabs@58.0.25` exists, published 2026-10-19T14:28Z; the newest release of the `expo` package is `expo@58.0.16` (2026-10-19), as the deep review says | PASS |
| ci-cd-ota | 5 · `fastlane/fastlane` | ★42,266 · MIT · last release 2.241.1 @2026-10-15 | API: 42,272 ★ (0.01 %), MIT, created 2014-12-02. Release `2.241.1` published 2026-10-15T13:07Z | PASS |
| ci-cd-ota | 6 · `renovatebot/renovate` | ★22,807 · **AGPL-3.0** · last release 44.171.3 @2026-10-20 | API: 22,817 ★ (0.04 %), AGPL-3.0, created 2016-12-17. Release feed: 44.171.3 (2026-10-20), then 44.171.4–44.171.9 and 44.172.0–44.173.0 the same night; 44.173.0 published 2026-10-21T01:45Z | PASS (pin now one day behind) |
| ci-cd-ota | 8 · `sigstore/cosign` | ★6,374 · Apache-2.0 · last release v3.1.3 @2026-08-06 | API: 6,372 ★, Apache-2.0, created 2021-02-04. `v3.1.4` was published 2026-10-20T18:27Z, i.e. after the snapshot; `v3.1.3` was the last release when the card was written | PASS (pin one patch behind) |
| ci-cd-ota | 14 · `mobile-dev-inc/Maestro` | ★16,138 · Apache-2.0 · last release `cli-2.11.0` @2026-09-29 | API: 16,150 ★ (0.07 %), Apache-2.0, created 2022-03-31, pushed 2026-10-19. Release `cli-2.11.0` published 2026-09-29T13:36Z, previous `cli-2.10.0` 2026-08-31 | PASS |
| ci-cd-ota | 17 · `microsoft/playwright` | ★98,129 · Apache-2.0 · last release v1.64.1 @2026-10-14 · `@playwright/test` 293,935,238 dl/30 d | API: 98,180 ★ (0.05 %), Apache-2.0, created 2019-11-15. Release `v1.64.1` published 2026-10-14T11:51Z. npm downloads API returns **exactly 293,935,238** for 2026-09-19→2026-10-18 | PASS |
| ci-cd-ota | 22 · `argos-ci/argos` | ★643 · MIT · no GitHub releases · **1 critical** advisory | API: 644 ★, MIT, created 2016-12-15, pushed 2026-10-17. `/releases` returns `[]` — no releases, as claimed. Advisory **GHSA-jw2w-wr3r-jp8w** exists, severity **critical**, CVSS 3.1 **9.3** (AV:N/AC:L/PR:N/UI:N/S:C/C:L/I:H/A:N), summary "Anonymous cross-tenant build injection + GitHub status spoof via forged tokenless-github- bearer", patched at **9cd9955** — every element of the card matches | PASS |
| ci-cd-ota | 23 · `lost-pixel/lost-pixel` | ★1,679 · MIT · archived · last release v3.22.0 @2024-11-14 | API: 1,679 ★, MIT, `archived: true`, created 2021-12-20, pushed 2026-04-22. Release `v3.22.0` published 2024-11-14T15:47Z | PASS |
| ci-cd-ota | 27 · `stryker-mutator/stryker-js` | ★3,253 · Apache-2.0 · last release v10.0.0 @2026-08-14 · `stryker` 11,969 dl/30 d | API: 3,256 ★, Apache-2.0, created 2016-02-12, pushed 2026-10-10. Release feed: `v10.0.0` 2026-08-14T16:46Z, previous `v9.6.1` 2026-04-10 (outside the six-month window, so "Rel/6m = 1" holds). npm downloads API returns **exactly 11,969** for `stryker` | PASS |
| ci-cd-ota | 28 · `boxed/mutmut` | ★1,494 · BSD-3-Clause · last release 3.8.0 @2026-09-12 | API: 1,498 ★ (0.27 %), BSD-3-Clause, created 2016-11-13, pushed 2026-10-19. Release `3.8.0` published 2026-09-12T22:05Z | PASS |
| ci-cd-ota | 30 · `mutpy/mutpy` | ★369 · NOASSERTION · last release v0.6.1 @2019-11-17 | API: 369 ★, licence `NOASSERTION`, created 2017-07-26, pushed 2024-04-23. Release `v0.6.1` published 2019-11-17T14:54Z | PASS |
| ci-cd-ota | 35 · `getsentry/sentry-react-native` | ★1,824 · MIT · last release 8.31.0 @2026-10-15 · **1 low** advisory, patched ≥ 5.19.1 · 15,216,644 dl/30 d | API: 1,824 ★, MIT, created 2016-11-30. Release `8.31.0` published 2026-10-15T12:59Z. Advisory **GHSA-68c2-4mpx-qh95** exists, severity **low**, "Potential leakage of Sentry auth tokens by React Native SDK with Expo plugin", vulnerable `>=5.16.0, <=5.19.0`, patched `>=5.19.1` — matches. npm downloads API returns **exactly 15,216,644** for `@sentry/react-native` | PASS |
| ci-cd-ota | 41 · `langfuse/langfuse` | ★36,070 · MIT core + **EE (ClickHouse Inc.)** · last release v4.64.0 @2026-10-19 | API: 36,109 ★ (0.11 %), licence `NOASSERTION` (not MIT — see note). The LICENSE file itself says "Copyright (c) 2023-2026 ClickHouse, Inc.", MIT Expat outside `ee/`, `web/src/ee/`, `worker/src/ee/`, and `ee/LICENSE` inside — the card's split is right. Release feed: `v4.64.0` 2026-10-19T17:34Z, then `v4.65.0` 2026-10-20T13:35Z and `v4.66.0` 2026-10-20T17:31Z (after the snapshot) | PASS |
| ci-cd-ota | 50 · `grafana/grafana` | ★77,397 · **AGPL-3.0** · last release v12.4.13 @2026-10-13 | API: 77,399 ★, AGPL-3.0, created 2013-12-11, pushed 2026-10-21. Release `v12.4.13` published 2026-10-13T13:13Z; Grafana also shipped 13.2.4, 13.1.8 and 13.0.11 on the same day | PASS |

### 3.2 `docs/research/2026/multilingual-voice-i18n.md`

| file | card | claim | source says | verdict |
|---|---|---|---|---|
| multilingual | 1 · `i18next/i18next` | ★8,647 · created 2011-12-16 · last release v26.5.3 (2026-10-19) · MIT · 1 open issue | API: **8,647 ★ exactly**, MIT, created 2011-12-16, pushed 2026-10-20, `open_issues_count: 1`. Release `v26.5.3` published 2026-10-19T17:20Z, `v26.5.2` 2026-10-17T21:23Z. npm `i18next` latest = 26.5.3, MIT | PASS |
| multilingual | 2 · `i18next/react-i18next` | ★10,059 · created 2015-12-12 · MIT · npm react-i18next 17.1.0 · 1 open issue | API: **10,059 ★ exactly**, MIT, created 2015-12-12, pushed 2026-10-17, 1 open issue. npm `react-i18next` latest = **17.1.0**, MIT | PASS |
| multilingual | 3 · `formatjs/formatjs` | ★14,744 · created 2014-04-24 · repo licence NOASSERTION · npm react-intl 12.1.5 BSD-3-Clause | API: 14,745 ★, created 2014-04-24, `license: null` (GitHub reports no detected licence, the NOASSERTION case the card describes), pushed 2026-10-21. npm `react-intl` latest = **12.1.5**, licence **BSD-3-Clause** | PASS (the named `vue-intl@8.1.4` release was not separately re-read) |
| multilingual | 4 · `unicode-org/icu4x` | ★1,874 · created 2020-02-27 · NOASSERTION (Unicode Licence v3) · 765 open issues | API: **1,874 ★ exactly**, created 2020-02-27, pushed 2026-10-20, licence `NOASSERTION`, 761 open issues (card says 765 — 4 out) | PASS |
| multilingual | 5 · `expo/expo` (`expo-localization`) | ★52,869 · MIT · npm `expo-localization` **58.0.5** · `expo-speech` 58.0.3 | API for `expo/expo`: 52,881 ★, MIT. npm `expo-localization` latest = **58.0.5**, MIT, devDependency `expo: 58.0.15` — the SDK-58 parity claim holds | PASS |
| multilingual | 6 · `zoontek/react-native-localize` | ★2,443 · created 2017-08-01 · MIT · last release 3.7.2 (2026-09-15) · 7 open issues | API: **2,443 ★ exactly**, MIT, created 2017-08-01, pushed 2026-10-13, 7 open issues. npm `react-native-localize` latest = **3.7.2**, MIT | PASS |
| multilingual | 7 · `tolgee/tolgee-platform` | ★4,134 · created 2020-10-13 · NOASSERTION · 211 open issues | API: 4,137 ★ (0.07 %), created 2020-10-13, pushed 2026-10-20, licence `NOASSERTION`, 211 open issues | PASS |
| multilingual | 8 · `WeblateOrg/weblate` | ★6,114 · created 2012-02-27 · **GPL-3.0** · last release weblate-2026.10.1 (2026-10-09) | API: 6,115 ★, created 2012-02-27, licence **GPL-3.0**, pushed 2026-10-21. Release `weblate-2026.10.1` published 2026-10-09T07:15Z (its notes list a security fix, GHSA-pgmx-p3h7-7q8x) | PASS |
| multilingual | 9 · `lingui/js-lingui` | ★5,920 · created 2017-01-17 · MIT · last release v6.10.0 (2026-10-16) · npm `@lingui/cli` 6.10.0 | API: 5,922 ★ (0.03 %), MIT, created 2017-01-17, pushed 2026-10-20, 56 open issues. npm `@lingui/cli` latest = **6.10.0**, MIT | PASS |
| multilingual | 20 · `pemistahl/lingua-py` | ★1,809 · created 2021-07-13 · Apache-2.0 · last release v2.2.0 (2026-03-09) · 49 open issues | API: 1,810 ★, Apache-2.0, created 2021-07-13, pushed 2026-07-20, 49 open issues. Release feed: `v2.2.0` published **2026-03-09T15:33Z** | PASS |
| multilingual | 24 · `wooorm/franc` | ★4,419 · MIT · last push 2024-06-12 | API: **4,419 ★ exactly**, MIT, pushed **2024-06-12T22:48Z**, created 2014-07-19 | PASS |
| multilingual | 27 · `google/cld3` | ★886 · created 2016-06-02 · Apache-2.0 · last push 2023-05-24 · archived | API: **886 ★ exactly**, created 2016-06-02, pushed 2023-05-24, Apache-2.0, `archived: true` | PASS |
| multilingual | 28 · `facebook/nllb-200-distilled-600M` (HF) | licence cc-by-nc-4.0 · 846,973 downloads · last modified 2024-02-14 · 200 languages | HF API: licence **cc-by-nc-4.0**, downloads **846,973 exactly**, lastModified **2024-02-14T17:18Z**, language list of 200 codes incl. `mi`, `sm`, `to`, `ar`, `hi`, `zh` | PASS |
| multilingual | 29 · `facebook/mms-tts-ara` (HF) | cc-by-nc-4.0 · ara 6,572 dl · last modified 2023-08/09 | HF API for `facebook/mms-tts-ara`: licence **cc-by-nc-4.0**, downloads **6,572 exactly**, lastModified **2023-09-01T13:16Z** | PASS |
| multilingual | 31 · `Qwen/Qwen3-ASR-1.7B` (HF) | licence apache-2.0 · 1,219,114 downloads · last modified 2026-01-30 | HF API: licence **apache-2.0**, downloads **1,219,114 exactly**, lastModified **2026-01-30T03:00Z**, 2.35 B parameters | PASS |
| multilingual | 32 · `Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice` (HF) | licence apache-2.0 · 2,069,796 downloads · last modified 2026-01-29 | HF API: licence **apache-2.0**, downloads **2,069,796 exactly**, lastModified **2026-01-29T08:00Z**, 1.92 B parameters | PASS |
| multilingual | 33 · `nvidia/canary-1b-v2` (HF) | licence cc-by-4.0 · 179,073 downloads · last modified 2026-08-31 · 25 languages: bg, hr, cs, da, nl, en, et, fi, fr, de, el, hu, it, lv, lt, mt, pl, pt, ro, sk, sl, es, sv, ru, uk | HF API: licence **cc-by-4.0**, downloads **179,073 exactly**, lastModified **2026-08-31T19:01Z**, and the language list is **exactly the 25 codes the card lists**, in the same order | PASS |
| multilingual | 35 · `openai/whisper` | ★110,908 · created 2022-09-16 · MIT · last release v20250625 (2025-06-26) · pushed 2026-08-31 · 175 open issues | API: 110,959 ★ (0.05 %), MIT, created 2022-09-16, pushed 2026-08-31, 175 open issues. Release `v20250625` published 2025-06-26T01:06Z | PASS |
| multilingual | 37 · `hexgrad/Kokoro-82M` | ★9,511 · Apache-2.0 code · HF weights apache-2.0 · 10,536,550 downloads · last modified 2025-04-10 · 82 M params · 54 voices · hi/zh/es voices, no Arabic/te reo/Samoan-Tongan | API for `hexgrad/kokoro`: 9,540 ★ (0.3 %), Apache-2.0, pushed 2025-08-06 (stalled since 2025-08 ✓). HF API: licence **apache-2.0**, downloads **10,536,550 exactly**, lastModified **2025-04-10T18:12Z**, 82 M parameters, "8 & 54" in the release table. `VOICES.md` lists 54 voices over 9 language sections including **Hindi, Mandarin Chinese, Spanish**, and no Arabic, te reo, Samoan or Tongan | PASS |
| multilingual | 43 · `LibreTranslate/LibreTranslate` | ★17,128 · created 2020-12-19 · **AGPL-3.0** · last release v1.9.6 (2026-05-26) · pushed 2026-10-12 · 128 open issues | API: 17,130 ★ (0.01 %), AGPL-3.0, created 2020-12-19, pushed 2026-10-12, 128 open issues. Release `v1.9.6` published 2026-05-26T17:45Z | PASS |
| multilingual | 44 · `argosopentech/argos-translate` | ★6,580 · **MIT** · created 2020-04-07 · pushed 2026-08-08 · 165 open issues · **last release v1.4.0 (2021-08-24)** · "release frozen since 2021" | API: 6,584 ★, MIT, created 2020-04-07, pushed 2026-08-08, 165 open issues. **The release feed contradicts the card**: the most recent releases are `v1.11.0` (2026-02-02), `v1.10.0` (2025-10-21) and `v1.9.6` (2024-04-30) — all newer than v1.4.0. The project was not frozen in 2021. (GitHub's `/releases/latest` resolves to the `v1.4.0` macOS release object, whose tag is dated 2021-08-24 — that is almost certainly where the card's number came from, and it is not the newest release.) | **FAIL** |

---

## 4. The corrections the files need

### 4.1 `docs/research/2026/multilingual-voice-i18n.md` — card 44 (one FAIL, two sentences)

**Card heading line (line 267).** Replace:

> last release **v1.4.0 (2021-08-24)** · offline translation using CTranslate2 + a package index.

with:

> last release **v1.11.0 (2026-02-02)** · offline translation using CTranslate2 + a package index.

**Risk line (line 269).** Replace:

> Risks: release frozen since 2021; the **translation package licences vary per package** (must check each); the **engine model** packages are typically CC-BY-SA/NC → **UNVERIFIED**.

with:

> Risks: release cadence is low but the project is **not frozen** (v1.9.6 2024-04-30, v1.10.0 2025-10-21, v1.11.0 2026-02-02 — nothing since 2026-02-02); the **translation package licences vary per package** (must check each); the **engine model** packages are typically CC-BY-SA/NC → **UNVERIFIED**.

The card's decision (WATCH — only if we truly need server-side MT) and every other figure in the
card are confirmed and need no change.

### 4.2 Pins that are one release behind (not failures — the cards were true when written)

These are not FAILs; the card values were correct at the 2026-10-20 snapshot. They are listed
because §6 of the ci-cd file turns them into pinned versions, and those pins are now stale.

| file | current text | refresh to |
|---|---|---|
| `ci-cd-ota-observability-testing.md` §6 item 13 | `sigstore/cosign@3.1.3` | `sigstore/cosign@3.1.4` (published 2026-10-20T18:27Z) |
| `ci-cd-ota-observability-testing.md` §6 item 14 | `renovatebot/renovate` (44.171.3) | `renovatebot/renovate` (44.173.0, published 2026-10-21T01:45Z) |

### 4.3 Housekeeping corrections in `docs/research/2026/ci-cd-ota-observability-testing.md`

**Card count.** The heading on line 40 reads "## 2. Evidence cards — 46 candidates (V4 §12.3)" but
the three tables carry **50** numbered rows (1–50), and the file's own §8 says "all 50 candidates".
Replace:

> ## 2. Evidence cards — 46 candidates (V4 §12.3)

with:

> ## 2. Evidence cards — 50 candidates (V4 §12.3)

The same line 36 also states "repos/{o}/{r} × 42" for 50 candidates; the API-call tally cannot be
verified from outside and should be reconciled with the researcher.

---

## 5. What could not be verified

**The four missing files.** `notifications-sms.md`, `camera-pod.md`, `security-hardening.md` and
`accessibility.md` are not in the repository, so no card in them could be opened, counted or
checked. They are not verifiable, and no pass rate is claimed for them. If those areas are part of
the sprint, the research files have to be produced before they can be verified.

**Within the cards that were checked, these sub-claims were not independently re-read:**

| sub-claim | why | effect |
|---|---|---|
| `formatjs/formatjs` "last release `vue-intl@8.1.4` (2026-10-19)" | the monorepo publishes one release per package; the tag was not re-read | no change to the verdict (stars, licence and npm versions all confirmed) |
| `argos-translate` v1.4.0's own release year (2021-08-24) | GitHub's release page shows "24 Aug" without a year; the REST call for the release object was refused because the hourly quota was spent | does not affect the FAIL — the point is that v1.4.0 is **not** the newest release |
| every `c90`, `maint`, `Rel/6m` count other than the ones visible in the release feed | these need the commit list, not a single HTTP read | the momentum columns stay unverified, as the files already say |
| the commit-level readings in the deep-review sections (for example Maestro's `assertScreenshot` commit of 2026-10-16, Sentry RN's "Expo SDK 58 / RN 0.88" commits) | commit history was not walked | the verdicts rest on the repository, release and advisory facts only |
| every benchmark, cold-start, APK-size and accuracy figure | no runner and no emulator (AGENTS.md) | unchanged — the files already mark them UNVERIFIED |
| GlitchTip's own repository, releases and advisories (canonical source on GitLab) | not read in this pass | still UNVERIFIED, as the file says |
| the 6-month star trend for every candidate | the token has no `stargazer` scope; no history endpoint was used | still UNVERIFIED, as the files say |

**Network and quota note.** The GitHub REST quota (60 requests an hour, unauthenticated) was
exhausted during the pass, so the last few checks used the public release Atom feed
(`releases.atom`), the search API and the raw-file host instead of `/repos` and `/releases`. Those
are the same GitHub data. No card was given a pass on the strength of a blocked request.

---

## 6. Summary

The verifier pass re-checked **35 evidence cards** across the two 2026 research files that exist —
**14 of 50 (28.0 %)** in `ci-cd-ota-observability-testing.md` and **21 of 46 (45.7 %)** in
`multilingual-voice-i18n.md`, a combined **36.5 %**, well over the 20 % the process requires. Every
checked card was opened at its real source: the GitHub REST API, the public release feed, the npm
registry and the npm downloads API, the Hugging Face model API and the raw licence files. **34 of
the 35 cards passed and 1 failed, an overall pass rate of 97.1 %.** The single failure is card 44 of
`multilingual-voice-i18n.md`: `argosopentech/argos-translate` is recorded as last released at
`v1.4.0 (2021-08-24)` and as "frozen since 2021", but the release feed shows `v1.9.6`
(2024-04-30), `v1.10.0` (2025-10-21) and `v1.11.0` (2026-02-02) after it, so the last release is
`v1.11.0 (2026-02-02)` and the project is dormant, not frozen. The research is sound: every licence
claim, every advisory id, every severity and CVSS score, every download count and every weights
licence that was checked came back exactly as written, including the Argos critical advisory
(GHSA-jw2w-wr3r-jp8w, CVSS 9.3, patched at `9cd9955`) that the file uses to reject the tool, the
three npm download figures that matched to the unit, and the Qwen, Kokoro, Canary, NLLB and MMS
weight licences that the whole "licence-clean multilingual" argument rests on. The remaining work is
housekeeping: one wrong release date and one wrong risk sentence to fix, two version pins to
refresh, one card count to correct, and four named research files that do not exist and therefore
cannot be verified at all.
