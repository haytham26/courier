# Multilingual voice & i18n — 2026 OSS research (redone, V4 §13.1)

**Research date: 2026-10-21.** Method: V4 §12 (≥30 candidates with full evidence cards, ≥10 shortlisted,
top 5 deep-reviewed, benchmarks only where an eval set exists) + §12.6 anti-bias. Every number was read
from the live GitHub API, the npm registry, the Hugging Face API, the Unicode CLDR data files or the
upstream documentation on 2026-10-21 unless the card says **UNVERIFIED**. Nothing is estimated and
nothing is carried over unread — the previous version of this file was wrong on several counts (§9).

**Card fields:** repo/model URL · stars · created · last release / last commit + date · maintenance
health · licence (**code *and* weights/data** — the model licence is the one that matters) · Expo SDK 58
/ RN 0.88 New Architecture compatibility · supported locales · on-device vs server · model size ·
relevance note · **DECISION**.

---

## 0. Scope, our current choice, the bar

| Item | Verified 2026-10-21 (source) |
|---|---|
| Our i18n runtime | **none.** `apps/mobile/package.json` (read 2026-10-21) has **no i18n package, no `expo-localization`, no `expo-speech`, no `expo-intl`** — the only adjacent dependency is `expo-audio@58.0.9` (MIT, npm modified 2026-10-15) |
| Our stack | `expo` `~58.0.14` (npm `expo` **58.0.16**, MIT, 2026-10-19) · `react-native` **0.88.0** (MIT, 2026-10-20) · `react-native-sherpa-onnx` **0.4.4** · `react-native-nitro-modules` 0.37.1 · `react-native-reanimated` 4.7.1 · `react-native-safe-area-context` ~5.10.1 · `react-native-screens` ~4.30.0 · `react-native-unistyles` 3.5.3 |
| Our on-device voice engine | **sherpa-onnx** (locked: ADR-004, D22) through `XDcobra/react-native-sherpa-onnx@0.4.4` (MIT, released 2026-09-08) |
| Our server voice service | **does not exist** — `services/voice` is absent from the repository |
| Eval set | **does not exist** — `docs/squads/voice/eval/` is absent; only the *specification* `docs/squads/voice/EVAL.md` (2026-10-21) and `docs/squads/voice/benchmarks/README.md` exist |
| Locked decisions | Expo SDK 58 · RN 0.88 · **New Architecture only** · on-device voice by default (D1/D2/D12) · all languages from the start (D3) · ADR-004: sherpa-onnx + Kokoro on device, **no non-commercial weights in the product**, the **licence ledger is a shipped surface** |
| Hard budget | `CONSTRAINTS.md`: APK ≤ 80 MB (**excluding the map/voice packs**) · cold start ≤ 2 s · battery ≤ 8 %/h · voice command → action ≤ 700 ms · **no GPL/AGPL/SSPL/Commons-Clause/CC-NC/FSL/BUSL in the shipped app** (`scripts/check-licenses.mjs`) |

### The bar, in one sentence

**English (NZ) is the launch language, exactly one more language by v1.0, the voice stays on device,
and the UI strings are never mixed into the voice prompt.**

That last clause is the architectural spine of this file and the previous version missed it. It means
**two catalogues, not one**:

| Catalogue | Consumer | Length rule | Content rule |
|---|---|---|---|
| **UI catalogue** (`packages/i18n/locales/<locale>.json`) | screens, buttons, lists, errors | no limit | full sentences, ICU plural + select, formatted dates/numbers/currency |
| **Voice-prompt catalogue** (`packages/i18n/prompts/<locale>.json`) | the assistant, spoken aloud | **≤ 8 words per prompt** (V4; `RESEARCH_2026_WAVE2.md` L17) | command names only — never "3 stops left, next is Riccarton Road" |

A prompt catalogue is not a UI catalogue with the punctuation removed: *"Next stop is 14 Rimu Street,
Riccarton"* is 9 words and unusable while driving; *"Next: Rimu Street"* is 3. And a voice prompt must
never contain a formatted number, a date or a currency symbol, because the *spoken* form of `NZ$34.90`
in te reo, Hindi and Cantonese are three different strings that no `Intl.NumberFormat` call produces.

### Two things must not be conflated

1. **UI locale** (which language the screen is drawn in) vs **spoken locale** (which language the driver
   is talking to the app in) vs **address language** (LINZ-derived street and suburb names, which stay
   in official NZ English form regardless — D3 says the addresses stay official). A driver can dictate
   in Hindi and still need the address to read back in English.
2. **ASR (understanding the driver)** vs **TTS (speaking to the driver)** vs **LID (deciding which of
   the two is in play)**. The licence and the model sizes are completely different for each, and only
   one of the three has a permissive licence for our Pacific languages.

### 6-month star trend — method note (proxy, as V4 §12.3 permits)

The **star timeline** is not readable with the token in `.env.local` (`GET /repos/{o}/{r}/stargazers`
returns HTTP 403); GraphQL `stargazerCount` returns only the cumulative total. **Every "stars gained
in 6 months" figure is therefore UNVERIFIED.** The proxy used throughout: **releases in the last
6 months · commits in the last 90 days · distinct human authors**, plus **npm/HF downloads** where a
registry exists.

---

## Queries run

All reads on **2026-10-21**. GitHub reads went through `scripts\gh.ps1` (token from `.env.local`, never
printed); npm through the registry; Hugging Face through the public API; CLDR through the raw data
files on `unicode-org/cldr` and `unicode-org/cldr-json`.

| # | Query / call | What it produced |
|---|---|---|
| 1 | `GET /repos/{owner}/{repo}` — **93 repos** | stars, forks, created, pushed, licence SPDX, archived, open issues, size, default branch → every card |
| 2 | `GET /repos/{o}/{r}/commits?per_page=N` — 12 repos | last commits + SHAs + dates + authors (§5) |
| 3 | `GET /repos/{o}/{r}/releases?per_page=N` — 8 repos | last release + published date + cadence |
| 4 | `GET /repos/{o}/{r}/releases/tags/asr-models` | the sherpa-onnx **model asset list**: file names, exact MB, download counts (the model-size evidence) |
| 5 | `search/issues?q=repo:{r}+is:pr+created:>=2026-01-01&sort=created&order=desc` — 8 repos | the 2026 PR stream (§5) |
| 6 | `search/issues?q=repo:{r}+is:issue+created:>=2026-01-01&sort=created&order=desc` — 8 repos | the 2026 issue stream (§5) |
| 7 | `gh search repos "react native rtl"` · `"react-native localization"` · `"translation management platform"` · `"piper voices"` | the RTL/localization/TMS/Piper candidate pool |
| 8 | `npm view <pkg> version license time.modified dist.unpackedSize dist.fileCount` — 27 packages | versions, licences, **and the catalogue-size proxy** (§6) |
| 9 | `huggingface.co/api/models/{id}` — 21 ids | **weight licences**, downloads, last-modified, safetensors parameter counts |
| 10 | `huggingface.co/api/datasets/{id}` — 4 ids | FLEURS, omnilingual-asr-corpus, the Māori corpus, mms-tts |
| 11 | `raw.githubusercontent.com/unicode-org/cldr-json/…/supplemental/plurals.json` | **the CLDR v48 (Unicode 16.0.0) cardinal plural rules for every locale** (§6) |
| 12 | `raw.githubusercontent.com/unicode-org/cldr/main/common/main/en_NZ.xml` + `en_001.xml` | the **NZD symbol and the NZ date/number formats** |
| 13 | `raw.githubusercontent.com/facebookresearch/omnilingual-asr/main/src/omnilingual_asr/models/wav2vec2_llama/lang_ids.py` | **the 1 668-id language table — the decisive coverage check** (§2, §5.1) |
| 14 | `raw.githubusercontent.com/facebookresearch/omnilingual-asr/main/README.md` | the **weight licence statement** ("code **and models** … Apache 2.0") |
| 15 | `k2-fsa.github.io/sherpa/onnx/{pretrained_models,omnilingual-asr/index,omnilingual-asr/models,tts/all,tts/pretrained_models/index}.html` | the engine's model catalogue, the **published RTF table**, and the exact model sizes |
| 16 | `reactnative.dev/docs/i18nmanager` | RN's RTL contract, including the **restart requirement** |
| 17 | `docs.expo.dev/versions/v58.0.0/sdk/localization/` + `docs.expo.dev/guides/localization.md` + `docs.expo.dev/guides/using-hermes.md` | the SDK-58 locale API, the config plugin, the RTL guide and the **`Intl`-on-Hermes** statement |
| 18 | web search: `te reo Maori speech recognition open source model 2026 dataset` | the Māori ASR/TTS literature and Te Hiku Media's data sovereignty position |
| 19 | web search: `Samoan Tongan speech recognition model huggingface 2026` | the AmericasNLP 2026 spoken-LID survey (**who actually covers Samoan**) |
| 20 | web search: `IndicASR ai4bharat Hindi multilingual speech recognition model 2026` | the IndicConformer / IndicVoices line |

A third web-search batch (RTL in RN 0.88, per-app language on Android 13+/iOS) hit the provider's
rate limit and returned no results; those two questions were answered from primary sources instead
(the RN `I18nManager` docs and the Expo localization guide, both fetched directly).

---

## 1. Scope of the language matrix (V4 §10.1)

`en-NZ` · te reo Māori (mi) · Arabic (ar) · Hindi (hi) / Punjabi (pa) · Mandarin (zh) + **Cantonese
(yue)** · Samoan (sm) / Tongan (to) · Spanish (es) · **plus auto language detection and code-switching**.

**The honest coverage picture, as read from the model cards on 2026-10-21:**

| Engine | en | mi | ar | hi | pa | zh | yue | sm | to | es | LID | Licence (weights) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Omnilingual ASR** (Meta, `omniASR_CTC_300M`) | ✔ | ✔ `mri_Latn` | ✔ `arb_Arab` | ✔ `hin_Deva` | ✔ `pan_Guru` | ✔ | ✔ `yue_Hans` | ✔ `smo_Latn` | **✖ `ton_Latn` absent** | ✔ | ✖ (language-conditioned) | **Apache-2.0** (code **and** models) |
| Qwen3-ASR-1.7B | ✔ | ✖ | ✔ | ✔ | ✖ | ✔ | ✔ | ✖ | ✖ | ✔ | ✔ | Apache-2.0 |
| Qwen3-TTS-12Hz-1.7B | ✔ | ✖ | ✖ | ✖ | ✖ | ✔ | ✖ | ✖ | ✖ | ✔ | ✔ | Apache-2.0 |
| Whisper | ✔ | ✔ | ✔ | ✔ | ✖ | ✔ | ✔ | **✖** | ✖ | ✔ | ✔ | MIT |
| sherpa-onnx built-in catalogue | ✔ | **✖** | ✔ | ✔ | ✖ | ✔ | ✔ | **✖** | **✖** | ✔ | ✔ (multi-lingual Whisper) | Apache-2.0 |
| Kokoro (TTS) | ✔ en-US/en-GB | ✖ | ✖ | ✔ | ✖ | ✔ | ✖ | ✖ | ✖ | ✔ | ✖ | Apache-2.0 |
| OmniVoice (ADR-004 subject) | ✔ | ~ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | **CC-BY-NC → not shippable** |

Three facts carry the whole decision:

1. **Omnilingual ASR is the only permissively-licensed engine that covers te reo Māori and Samoan**,
   and its licence covers the **weights** ("Omnilingual ASR code and models are released under the
   Apache 2.0", README §License, read 2026-10-21) — this clears the ADR-004 gate that OmniVoice fails.
2. **Tongan is the one gap.** `ton_Latn` is absent from Omnilingual's 1 668-id language table
   (exhaustive grep for `ton_Latn` / `to_*` / `tonga` on 2026-10-21 returned no Tongan id). Tongan is
   also absent from Whisper, from Qwen3-ASR and from the sherpa-onnx catalogue. **No permissively
   licensed Tongan ASR or TTS exists anywhere we could find.**
3. **No permissively-licensed TTS exists for te reo Māori, Samoan or Tongan at all.** This is the real
   hole, and it is a *synthesis* problem, not a licensing problem.

---

## 2. Candidate pool — 58 evidence cards

**C1 — `i18next/i18next`** ⭐ https://github.com/i18next/i18next — **8 647 ★** /700 f · created
**2011-12-16** · pushed **2026-10-20** · last release **v26.5.3 (2026-10-19)** · cadence: multiple
releases per day (26.5.1/26.5.2/26.5.3 on 2026-10-17/17/19) · **1 open issue** repo-wide · npm
`i18next` **26.5.3**, **MIT**, modified 2026-10-19, unpacked **540 569 B / 16 files** ·
**MIT**; no weights · **New Arch / Expo SDK 58: n/a** (pure JS) · Android API 34: n/a · on-device ✔ ·
locales: **any** (fallback chains, `fallbackLng`, ICU-style plural suffixes) · last 20 commits:
`adrai` dominant, Jannis Morgenstern and Jason Draper active · **better than our current choice**: we
have nothing; it is the de-facto standard, MIT, no native coupling, and its `fallbackLng` chain is
exactly the `en-NZ → en-AU → en-GB → en` behaviour NZ needs · risks: **one primary maintainer**;
26.x major-version churn; the "1 open issue" count is extraordinary and suggests either excellent
triage or issue suppression — **worth watching, not a red flag on its own** · **DECISION: ADOPT.**

**C2 — `i18next/react-i18next`** https://github.com/i18next/react-i18next — **10 059 ★** /1 050 f ·
created 2015-12-12 · pushed 2026-10-17 · **1 open issue** · no GitHub releases (npm-driven) · npm
`react-i18next` **17.1.0**, MIT, modified 2026-10-17, unpacked **969 381 B / 89 files** · MIT ·
**New Arch/Expo 58: n/a** (pure JS) · **DECISION: ADOPT** — the React Native binding for C1; same
package, no native module.

**C3 — `lingui/js-lingui`** ⭐ https://github.com/lingui/js-lingui — **5 921 ★** /470 f · created
**2017-01-17** · pushed 2026-10-20 · last release **v6.10.0 (2026-10-16)** · cadence ≈ weekly
(10-16 / 10-09 / 10-01) · **53 open issues** · npm `@lingui/core` **6.10.0** (MIT, 2026-10-16,
unpacked **40 573 B / 11 files**) and `@lingui/cli` **6.10.0** (MIT, 2026-10-16) · **MIT** ·
**New Arch/Expo 58: n/a** · message format: **ICU**, **compiled to JS functions** — the runtime does
**no message parsing** · locales: any ICU locale · last-20 commits: `mehdimirzafaruk`, Andrii Bodnar,
Alperen, Yang Bai — a healthy 4-person core · **better than ours**: the compile step is a real win on
Hermes, and **missing keys fail the build** (catalogues are compiled, so a key with no translation is
a compile error, not a runtime "key.name") · risks: a second build step; open issue **#2700**
(2026-10-04) "Replace js-sha256 with audited @noble/hashes" — a supply-chain item on our own gate ·
**DECISION: ADOPT (message format + compile step).**

**C4 — `formatjs/formatjs`** ⭐ https://github.com/formatjs/formatjs — **14 745 ★** /1 388 f ·
created 2014-04-24 · pushed 2026-10-19 · repo licence **NOASSERTION** (monorepo; per-package licences
verified below) · npm `react-intl` **12.1.5** (**BSD-3-Clause**, 2026-10-19, unpacked 199 219 B /
10 files) · `@formatjs/intl` **6.1.4** MIT · `@formatjs/intl-pluralrules` **6.3.16** MIT (2026-10-19,
unpacked 953 271 B / 464 files) · `@formatjs/intl-localematcher` **0.9.0** MIT (2026-09-12, 242 520 B)
· `@formatjs/intl-relativetimeformat` 12.3.16 MIT · `@formatjs/intl-datetimeformat` 7.8.2 MIT
(**140 736 080 B / 1 552 files**) · `@formatjs/intl-numberformat` 9.4.3 MIT (**110 349 172 B /
1 548 files**) · **New Arch/Expo 58: n/a** · what it gives us: the **canonical BCP-47 negotiation
algorithm** (`intl-localematcher`) and the **CLDR plural rules** as data · risk: the two CLDR packages
ship the whole dataset — 110 MB and 141 MB unpacked; they are **unnecessary if Hermes has `Intl`**
(see §9 correction 1) · last-20 commits: **16/20 `renovate[bot]`** in the sampled window — human
activity is thin there · **DECISION: ADOPT (`intl-localematcher` only); KEEP `intl-pluralrules` as the
Hermes fallback; REJECT the two CLDR data packages.**

**C5 — `expo/expo` → `expo-localization@58.0.5`** ⭐ https://github.com/expo/expo — **52 874 ★** /
14 665 f · created 2016-08-15 · pushed 2026-10-20 · 929 open issues · **MIT** · npm
`expo-localization` **58.0.5** (MIT, 2026-10-19) and `expo-speech` **58.0.3** (MIT, 2026-10-15) —
**exact SDK-58 parity** (our lockfile is `expo ~58.0.14`) · **New Arch/Expo 58: first-party, SDK-58
parity** · what it gives: `getLocales()` → `languageTag`, `languageCode`, `textDirection`,
`currencyCode`, `currencySymbol`, `decimalSeparator`, `digitGroupingSeparator`, `measurementSystem`,
`regionCode`, `languageScriptCode`; `getCalendars()` → `calendar`, `timeZone`, `uses24hourClock`,
`firstWeekday` · **and a config plugin with `supportsRTL` / `forcesRTL` / `supportedLocales`** —
`supportedLocales` is what turns on **per-app language selection in the Android and iOS system
settings** · **DECISION: ADOPT — the single source of truth for "which language is this driver using".**

**C6 — `zoontek/react-native-localize`** https://github.com/zoontek/react-native-localize — **2 443 ★**
/225 f · created 2017-08-01 · pushed 2026-10-13 · last release **3.7.2 (2026-09-15)** · **7 open
issues** · **MIT** · npm `react-native-localize` **3.7.2** (MIT, 2026-09-15) · **New Arch/Expo 58:
UNVERIFIED** (native module; we have not built it against SDK 58) · what it gives: per-app language
override + a locale-change event · risk: it duplicates C5 and adds a second native module to an Expo
app · **DECISION: REJECT — `expo-localization` covers the same ground with SDK-58 parity; if the OS
per-app language picker is enough (it is), we need no second native module.**

**C7 — `stefalda/ReactNativeLocalization`** https://github.com/stefalda/ReactNativeLocalization —
**893 ★** /122 f · created **2015-04-07** · pushed 2026-10-04 · **72 open issues** · **MIT** ·
on-device ✔ · locales: any · what it gives: `getLocales()` + a `translate()` with plural support and
**RTL** support built in · risks: 10-year-old design, no `Intl`, no compile step, 72 open issues, and
its locale list is a hand-written `Locale` enum you have to edit by hand · **DECISION: REJECT — the
"one file does everything" shape is attractive but it is unmaintained relative to C1+C3+C5.**

**C8 — `unicode-org/icu4x`** https://github.com/unicode-org/icu4x — **1 874 ★** /299 f · created
2020-02-27 · pushed 2026-10-19 · last release `icu@2.3.1 (2026-08-21)` · **765 open issues** · repo
licence **NOASSERTION → the Unicode License v3** (permissive; commercial use allowed, notice retained —
**not** one of our preferred four) · Rust core · what it gives: **data-driven, size-tunable CLDR** —
compile only the locales and features we need (plurals, calendars, NZ time zones) instead of shipping
full ICU · risks: 765 open issues; the Rust → WASM/RN bridge is not a drop-in; the licence is outside
our preferred set · **DECISION: WATCH — the right long-term answer for CLDR on device, but a big
integration; revisit after v1.0.**

**C9 — `unicode-org/cldr`** https://github.com/unicode-org/cldr — **1 160 ★** /448 f · pushed
2026-10-19 · **270 open issues** · licence **NOASSERTION** (Unicode-3.0) · this is the **source of
truth we measured against** in §6 (`plurals.json` = CLDR **v48**, Unicode **16.0.0**; `en_NZ.xml`;
`en_001.xml`; `weekData.json`) · **DECISION: KEEP as the data reference (read-only), never vendored.**

**C10 — `unicode-org/icu` (ICU4C)** https://github.com/unicode-org/icu — **3 619 ★** /938 f · pushed
2026-10-19 · licence **NOASSERTION** · **DECISION: REJECT (in-app)** — far too heavy for a mobile
bundle, and Hermes already gives us `Intl`.

**C11 — `Codingcommons/typesafe-i18n`** https://github.com/Codingcommons/typesafe-i18n — **2 478 ★** /
91 f · created 2020-12-28 · pushed **2026-03-22** · **42 open issues** · **MIT** · typesafe TS i18n
with **no runtime dependencies** and compile-time key checking · risk: weaker ICU support than
Lingui/FormatJS, and the repo has gone quiet since March · **DECISION: WATCH — the "no runtime
dependency" property is attractive for an APK-budgeted app.**

**C12 — `projectfluent/fluent.js`** https://github.com/projectfluent/fluent.js — **1 010 ★** /81 f ·
pushed **2026-05-22** · last release `@fluent/dom@0.10.2 (2025-07-18)` · **82 open issues** ·
**Apache-2.0** · Mozilla's Fluent syntax (AST-based terms and selectors) · risk: smaller ecosystem,
no RN-specific support, last release 2025-07 · **DECISION: WATCH — an alternative message syntax;
Lingui already gives us ICU.**

**C13 — `globalizejs/globalize`** https://github.com/globalizejs/globalize — **4 834 ★** /588 f ·
pushed **2025-09-29** · **150 open issues** · **MIT** · legacy jQuery/Backbone-era · **DECISION:
REJECT — legacy.**

**C14 — `moment/moment`** https://github.com/moment/moment — **47 898 ★** /6 973 f · pushed
**2026-10-08** · **60 open issues** · **MIT** · maintenance mode · risk: mutable-by-default API and a
heavy locale bundle per language · **DECISION: REJECT — `Intl` + `expo-localization` cover dates; we
do not need a date library.**

**C15 — `moment/luxon`** https://github.com/moment/luxon — **16 454 ★** /805 f · pushed 2026-08-09 ·
**201 open issues** · **MIT** · immutable, `Intl`-based, IANA zones (so `Pacific/Auckland` DST is
correct) · risk: it formats *dates*, but the currency and plural rules still come from `Intl`/CLDR,
so it does not reduce the dependency surface we actually have · **DECISION: KEEP as the optional date
helper if `Intl.DateTimeFormat` is not enough; not a dependency.**

**C16 — `date-fns/date-fns`** https://github.com/date-fns/date-fns — **36 645 ★** /2 054 f · pushed
2026-09-22 · **1 064 open issues** · repo licence **NOASSERTION** (per-package) · tree-shakeable,
per-locale files · **DECISION: WATCH — only if `Intl.DateTimeFormat` misses something; the 1 064 open
issues are the reason not to reach for it by default.**

**C17 — `appandflow/react-native-safe-area-context`** https://github.com/appandflow/react-native-safe-area-context
— **2 768 ★** /257 f · created 2019-08-14 · pushed **2026-10-16** · **107 open issues** · **MIT** ·
**already ours** (`~5.10.1`) · relevance: it is the library that has to behave correctly in RTL
(`SafeAreaProvider` edges flip with `I18nManager.isRTL`), so it is an RTL regression surface, not an
i18n dependency · **DECISION: KEEP — and add an RTL screenshot to the Maestro matrix.**

**C18 — `WeblateOrg/weblate`** ⭐ https://github.com/WeblateOrg/weblate — **6 114 ★** /1 373 f ·
created 2012-02-27 · pushed 2026-10-20 · **452 open issues** · **GPL-3.0** · the most mature free
TMS: plural/ICU handling, glossary, per-component screenshots, **glossary enforcement** (which is
exactly what NZ street names and courier vocabulary need) · risk: **GPL-3.0**; self-hosting it
unmodified as a separate service does not infect our app (the D22 rule), but any modification we make
and expose over the network would need source publication · **DECISION: WATCH (self-host, unmodified
only) — clean-room study material for the features we must reimplement.**

**C19 — `tolgee/tolgee-platform`** https://github.com/tolgee/tolgee-platform — **4 135 ★** /376 f ·
created 2020-10-13 · pushed 2026-10-20 · last release **v3.237.0 (2026-10-19)** · cadence near-daily ·
**211 open issues** · repo licence **NOASSERTION** (README badge: *"Apache 2.0 / Tolgee EL"*) — **the
split between the OSS core and the Enterprise Licence features is UNVERIFIED and must be read before
self-hosting** · reads ICU/plural formats natively (pairs with Lingui) · **DECISION: WATCH — the best
OSS TMS candidate *if* the EL boundary is clean; a hosted TMS with our own catalogue export is the
safer default.**

**C20 — `lingodotdev/lingo.dev`** https://github.com/lingodotdev/lingo.dev — **5 398 ★** /811 f ·
created 2024-03-13 · pushed 2026-10-19 · **21 open issues** · **Apache-2.0** · AI-assisted localisation
with a glossary and cross-locale memory · risk: **AI translation of NZ address vocabulary will be wrong
without a glossary, and addresses must never be machine-translated at all** · **DECISION: WATCH —
first-pass translation of non-address copy only; never for addresses, never for place names.**

**C21 — `ever-co/ever-traduora`** https://github.com/ever-co/ever-traduora — **2 137 ★** /221 f ·
created 2019-03-05 · pushed 2026-09-01 · **100 open issues** · **AGPL-3.0** · **DECISION: REJECT
(copyleft) — clean-room study only.**

**C22 — `argosopentech/argos-translate`** https://github.com/argosopentech/argos-translate — **6 584 ★**
/502 f · created 2020-04-07 · pushed 2026-08-08 · **165 open issues** · last release **v1.11.0
(2026-02-02)** · engine **MIT** · offline translation using CTranslate2 + a package index · risk: the
release cadence is low but the project is **not frozen** (v1.9.6 2024-04-30, v1.10.0 2025-10-21,
v1.11.0 2026-02-02 — nothing since 2026-02-02) and **each translation package carries its own licence**
(typically CC-BY-SA / NC — **UNVERIFIED** per package) · **DECISION: WATCH — only if we truly need
server-side MT; for a UI catalogue, human translation is cheaper and safer.**

**C23 — `LibreTranslate/LibreTranslate`** https://github.com/LibreTranslate/LibreTranslate — **17 127 ★**
/1 784 f · created 2020-12-19 · pushed 2026-10-12 · **128 open issues** · **AGPL-3.0** · **DECISION:
REJECT (copyleft).**

**C24 — `pemistahl/lingua-py`** https://github.com/pemistahl/lingua-py — **1 810 ★** /62 f · created
2021-07-13 · pushed 2026-07-20 · **49 open issues** · **Apache-2.0** · 75+ languages, **low-accuracy
mode** (one fast pass — the right mode for a realtime voice loop) and a
**`minimum_relative_distance` threshold** so it can answer *"not sure"* instead of guessing — exactly
what a code-switching utterance needs · risk: Python (server-side only); it is text-based, so it needs
a transcript first → it adds a round trip after STT · **DECISION: ADOPT (server-side LID + code-switch
arbitration in `services/voice`).**

**C25 — `pemistahl/lingua-rs`** https://github.com/pemistahl/lingua-rs — **1 146 ★** /65 f · pushed
**2026-10-19** · **45 open issues** · **Apache-2.0** · the **same model family** as C24 in Rust →
WASM is viable for on-device LID · risk: WASM in Hermes is not free; the model files add to the bundle
(**size UNVERIFIED**) · **DECISION: WATCH — the on-device LID candidate if we find a WASM build that
fits the APK budget.**

**C26 — `pemistahl/lingua` (Kotlin)** https://github.com/pemistahl/lingua — **827 ★** /75 f · pushed
**2025-03-21** · **13 open issues** · **Apache-2.0** · the most direct Android path to lingua-grade
LID · risk: needs an RN binding; the repo is quiet since March 2025 · **DECISION: WATCH.**

**C27 — `greyblake/whatlang-rs`** https://github.com/greyblake/whatlang-rs — **1 087 ★** /121 f ·
pushed 2025-12-24 · **20 open issues** · **MIT** · Rust, 69 languages, very fast · risk: lower accuracy
than lingua, and **it covers neither Māori nor Samoan** · **DECISION: WATCH — a lighter alternative
for the *English-vs-the-rest* decision only.**

**C28 — `wooorm/franc`** https://github.com/wooorm/franc — **4 419 ★** /183 f · pushed **2024-06-12** ·
**7 open issues** · **MIT** · npm `franc` **6.2.0**, MIT, registry last modified **2024-01-11** ·
pure JS, 400+ languages via trigram profiles, **tiny** · risk: text-based (needs the transcript first);
lower accuracy; **the npm package has not been touched in 2.5 years** · **DECISION: ADOPT (on-device
first-pass LID, restricted to our locale set) — cheap, safe, and it can run on the transcript we already
have; lingua-py on the server is the authority.**

**C29 — `k2-fsa/sherpa-onnx`** ⭐ https://github.com/k2-fsa/sherpa-onnx — **15 402 ★** /1 803 f ·
created 2022-09-01 · pushed **2026-10-20** · last release **v1.13.8 (2026-09-10)** (v1.13.5 08-11,
v1.13.6 08-18, v1.13.7 09-01 → ≈ weekly) · **646 open issues** · **Apache-2.0, code *and* the ONNX
models it ships** · **New Arch/Expo 58: n/a** (C++ core; the RN binding is C30) · on-device ✔ · **what
the model catalogue actually contains** (read 2026-10-21): TTS in **48 monolingual language groups**
(Albanian, Arabic, Chinese, Hindi, Swahili, Urdu …) plus mixed-lingual `kokoro-multi-lang-v1_1`
(zh+en, 103 speakers, 311 MB) and `kokoro-int8-multi-lang-v1_1` (140.2 MB); ASR incl.
**`sherpa-onnx-wenetspeech-yue-u2pp-conformer-ctc-zh-en-cantonese-int8-2025-09-10` (111.8 MB, 107 929
downloads)**, `sherpa-onnx-zipformer-cantonese-2024-03-13` (314.7 MB), the Qwen3-ASR and Omnilingual
exports, NeMo Parakeet TDT v3 (25 European languages), SenseVoice, FireRedASR, FunASR-Nano, Dolphin,
Cohere Transcribe · **the catalogue contains no Māori, Samoan or Tongan model** · **spoken language
identification is documented as "multi-lingual Whisper"** from the same asr-models release ·
**better than our current choice**: it is ours, and it is the only stack where one binary does
STT+TTS+VAD+LID+punctuation and lets us ship NZ hotwords as a text file with zero retraining · risks:
646 open issues; model files live outside the repo (checksum discipline required); PR **#4055**
(2026-10-16) **removed espeak-ng and piper-phonemize** from the engine · **DECISION: KEEP (the
engine) — pin v1.13.8 and treat the model catalogue as our model registry.**

**C30 — `XDcobra/react-native-sherpa-onnx`** ⭐ https://github.com/XDcobra/react-native-sherpa-onnx —
**41 ★** /7 f · created **2026-01-25** · pushed **2026-10-18** · last release **v0.4.4 (2026-09-08)** ·
**6 open issues** · **MIT** · repo 52 MB · **New Arch: TurboModule built on `react-native-nitro-modules`
— New-Architecture-native; it ships an Expo config plugin**, so Expo SDK 58 is a supported path, not
UNVERIFIED · what it gives: STT, TTS, VAD, diarization, enhancement, separation, alignment, and a
**model download manager that verifies every archive against a checksum file** · risks: **41 ★ and
one active maintainer**; the Oct 2026 commit stream (#137–#144) is all **OCR** work, i.e. the project
is drifting toward the scanner, not the voice; open issue **#112** (2026-07-14) "TurboModuleRegistry
.getEnforcing fails to find 'SherpaOnnx' on Expo SDK 54 / RN 0.81.5 with New Architecture" — a
**New-Architecture registration failure on a previous SDK**; issue **#133** (2026-09-17) "iOS:
`generateStream` ignores `options.numSteps` unless reference audio is set (Android applies it)" ·
**DECISION: KEEP (own and pin) — open a PR to bump the pinned engine to v1.13.8.**

**C31 — `facebookresearch/omnilingual-asr`** ⭐ https://github.com/facebookresearch/omnilingual-asr —
**2 952 ★** /271 f · created **2025-11-06** · pushed **2025-12-30** · **44 open issues** · repo licence
**NOASSERTION**, but the `LICENSE` file reads **Apache-2.0** and README §License states *"Omnilingual
ASR **code and models** are released under the Apache 2.0"* — **the weights are permissive, unlike
OmniVoice** · the language table `lang_ids.py` holds **1 668 ids** in `{code}_{script}` form and
includes **`mri_Latn`, `smo_Latn`, `yue_Hans`, `hin_Deva`, `pan_Guru`, `arb_Arab`, `spa_Latn`,
`eng_Latn`, `fij_Latn`, `gil_Latn`** — and **no `ton_Latn`** · the corpus `facebook/omnilingual-asr-corpus`
is **CC-BY-4.0** (5 359 downloads) · on-device ✔ via the sherpa-onnx export ·
`sherpa-onnx-omnilingual-asr-1600-languages-300M-ctc-int8-2025-11-12.tar.bz2` = **279 MB**,
**94 358 downloads**; a newer `…-300M-ctc-v2-int8-2026-02-05` = **278.8 MB** (3 849 downloads) ·
the archive contains **`model.int8.onnx` = 348 MB**, `tokens.txt` = 84 KB, and **its own `LICENSE`
file** — i.e. the model ships its licence with it, exactly the ADR-004 ledger pattern · published RTF
**0.225** (2 threads, the maintainer's Mac — **not our device**) · risks: 348 MB of weights is a
download pack, not an APK payload; the 1.7 B/7 B LLM variants are server-scale; **Tongan is absent**;
the HF model repo `facebook/omnilingual-asr-1b` returns **HTTP 401** to our client (gated or
auth-walled) so the weight licence could not be re-read from the model card — **UNVERIFIED from the
card, verified from the upstream README** · **DECISION: ADOPT (on-device multilingual ASR candidate) —
the only permissively-licensed path to te reo Māori and Samoan; ship it as a downloadable voice pack.**

**C32 — `QwenLM/Qwen3-ASR`** https://github.com/QwenLM/Qwen3-ASR — **3 738 ★** /362 f · created
**2026-01-28** · pushed **2026-06-26** · **25 open issues** · **Apache-2.0** (code) · HF
`Qwen/Qwen3-ASR-1.7B` licence **apache-2.0**, **1 219 114 downloads**, last modified 2026-01-30,
**2 349 217 408 parameters** (2.35 B) · **server-side only** at that size · **supported languages, read
from the model card on 2026-10-21: 30 languages + 22 Chinese dialects** — zh, en, **yue**, **ar**, de,
fr, **es**, pt, id, it, ko, ru, th, vi, ja, tr, **hi**, ms, nl, sv, da, fi, pl, cs, fil, fa, el, hu,
mk, ro → **no mi, no sm, no to, no pa** · it does **automatic language ID** (`language=None`) and
**language restriction** (`language=["Chinese","English"]`) · risks: 2.35 B params = GPU-server cost;
open issue **#211** (2026-09-11) *"Unable to reproduce the reported FLEURS-zh CER 2.41"*; issue
**#218** (2026-10-07) exact pins block security fixes; issue **#217** (2026-10-06, closed)
*"transcribe() joins chunk texts of long audio without a space for English/Korean"*; the repo's last
commit is 2026-06-26 (4 months of no code) while the issue stream stays active ·
**DECISION: KEEP (server-side multilingual ASR candidate) — covers 5 of our 9 locales, not the
Pacific ones; the licence is clean, the coverage is not.**

**C33 — `QwenLM/Qwen3-TTS`** https://github.com/QwenLM/Qwen3-TTS — **13 888 ★** /1 807 f · created
2026-01-21 · pushed **2026-03-17** (7 months of no code on `main`) · **56 open issues** · **Apache-2.0**
(code) · HF `Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice` licence **apache-2.0**, **2 069 796 downloads**,
last modified 2026-01-29, **1 916 676 352 parameters** · **supported languages, read from the model card
on 2026-10-21: exactly 10** — Chinese, English, Japanese, Korean, German, French, Russian,
Portuguese, Spanish, Italian → **no Arabic, no Hindi, no Cantonese, no Māori/Samoan/Tongan** · risks:
open issue **#375** (2026-09-30) asks whether VoiceDesign outputs may be used as SFT training data —
a licence question we must not guess at; PR **#383** (2026-10-17) transformers 5.x compatibility still
open; PR **#384** (2026-10-17) fine-tuning fixes still open · **DECISION: WATCH — the licence-clean
multilingual TTS covers **2 of our 9 locales**; it is not the answer the previous version of this file
claimed it was.**

**C34 — `openai/whisper`** https://github.com/openai/whisper — **110 927 ★** /13 446 f · created
2022-09-16 · last release **v20250625 (2025-06-26)** · pushed 2026-08-31 · **175 open issues** ·
**MIT (code)** · HF `openai/whisper-large-v3` card licence **apache-2.0**, 3 801 209 downloads,
last modified 2024-08-12, 1 543 490 560 params · 99 languages, `language` auto-detect, `task=translate`,
`initial_prompt` for context biasing · **coverage reality: Whisper covers Māori and Hawaiian but
**not Samoan** (per the AmericasNLP 2026 survey, §5.1)** · risks: no true streaming; 16 kHz input;
the "translate" task is English→English only · **DECISION: KEEP — the licence-clean multilingual
fallback and the LID engine (multi-lingual Whisper) inside sherpa-onnx.**

**C35 — `ggml-org/whisper.cpp`** https://github.com/ggml-org/whisper.cpp — **54 517 ★** /6 273 f ·
created 2022-09-25 · pushed **2026-10-19** · **354 open issues** · **MIT** · on-device ✔ (Core ML,
NNPACK, Vulkan) · relevance: the C++ path we would use if we ever need a different runtime from
sherpa-onnx · **DECISION: WATCH — one engine, not two.**

**C36 — `nvidia/NeMo`** https://github.com/nvidia/NeMo — **18 607 ★** /3 655 f · created 2019-08-05 ·
pushed 2026-10-20 · **367 open issues** · **Apache-2.0** · HF `nvidia/canary-1b-v2` licence
**cc-by-4.0**, **179 073 downloads**, last modified 2026-08-31, 978 998 272 params · **25 European
languages** + speech translation · relevance: **zero overlap with our Pacific requirement** · risk: a
JVM/Python framework to install for one model · **DECISION: WATCH (the European workhorse only) — we
ship Parakeet/Canary through sherpa-onnx, not NeMo itself.**

**C37 — `QwenAudio/SenseVoice`** https://github.com/QwenAudio/SenseVoice — **9 551 ★** /840 f · created
2024-07-03 · pushed 2026-09-30 · last release `runtime-llamacpp-v0.2.1 (2026-08-27)` · **12 open
issues** · repo **MIT** (code) · HF `FunAudioLLM/SenseVoiceSmall` weights licence **"other"** (the
FunASR Model Licence Agreement), 21 304 downloads, last modified 2026-06-20 · zh/en/ja/ko/**yue** +
multilingual, with **built-in LID** · risk: **the weights are not on an OSI licence** → a legal read
is required; sherpa-onnx issue **#4056** (2026-10-16, closed) "SenseVoice int8 (239 MB) uses ~600 MB
RAM on Android" · **DECISION: WATCH — the LID *idea* is worth taking even if the weights are not
adopted.**

**C38 — `AI4Bharat/IndicConformerASR`** https://github.com/AI4Bharat/IndicConformerASR — **103 ★** /13 f
· created 2024-09-16 · pushed 2025-06-20 · **26 open issues** · **MIT** · HF
`ai4bharat/indic-conformer-600m-multilingual`: **600 M params**, **22 Indian languages** including
**Hindi (hi) and Punjabi (pa)**, MIT, 11 quantisations, and a published **Hindi WER of 13.2** on the
Vaani benchmark · `AI4Bharat/IndicVoices` (**25 ★**, pushed 2026-02-22): 12 000 h of read, extempore and
conversational speech across 22 languages, 22 563 speakers, 208 districts · the corpus is **CC-BY-4.0**
and the tools **MIT** · relevance: **the best permissively-licensed Hindi and Punjabi ASR we found,
with an ONNX export path** (`OpenVoiceOS/ai4bharat-indicconformer-hi-onnx`, 38 downloads/month) ·
risk: 600 M params is server-scale; the Vaani WER is a **read-speech** benchmark, not a van-noise
courier benchmark · **DECISION: WATCH — the reference for `hi` and `pa`; the data protocol is worth
copying for our own consented corpora.**

**C39 — `hexgrad/kokoro`** ⭐ https://github.com/hexgrad/kokoro — **9 524 ★** /1 059 f · created
2025-01-10 · pushed **2025-08-06** (14 months quiet) · **213 open issues** · **Apache-2.0** (code) ·
HF `hexgrad/Kokoro-82M` weights licence **apache-2.0**, **10 536 550 downloads**, last modified
**2025-04-10**, 82 M params, **54 voices** · **locales, read from `hexgrad/Kokoro-82M/VOICES.md` on
2026-10-21**: American English **11F + 9M**, British English **4F + 4M**, Mandarin Chinese **4F + 4M**,
Japanese **4F + 1M**, **Hindi 2F + 2M**, Spanish 1F + 2M, Brazilian Portuguese 1F + 2M, Italian 1F + 1M,
French 1F — **no Australian and no New Zealand English, no Arabic, no Māori/Samoan/Tongan**. The same
file warns: *"Support for non-English languages may be absent or thin due to weak G2P and/or lack of
training data."* · sherpa-onnx ships `kokoro-en-v0_19` (11 speakers,
**330 MB**) and `kokoro-multi-lang-v1_1` (zh+en, 103 speakers, **311 MB**; int8 **140.2 MB**) · risk:
**the model is a 2025-04 artefact and the repo has been quiet for 14 months**; the English voices are
**American and British**, so an **en-NZ voice must be trained or cloned, not downloaded** ·
**DECISION: KEEP (the on-device English voice) — and treat "no en-NZ voice exists" as a build task,
not a download task.**

**C40 — `KittenML/KittenTTS`** https://github.com/KittenML/KittenTTS — **16 201 ★** /967 f · created
2025-08-05 · pushed **2026-10-16** · **138 open issues** · **Apache-2.0** (code) · **English only**;
sherpa-onnx ships `kitten-nano-en-v0_1-fp16`, `kitten-nano-en-v0_2-fp16`, `kitten-mini-en-v0_1-fp16` and
the v0.8 family (`nano` fp32/int8, `micro`, `mini`) · `KittenML/KittenTTS-react-native` **11 ★**, MIT,
created 2026-05-02, pushed 2026-05-14 — a 2026 RN binding, thin · **the HF model-card licence for the
weights could not be read (HTTP 401 on the ids tried) → UNVERIFIED** · **DECISION: WATCH — a cheap
English-only on-device TTS; the RN binding is too thin to trust yet.**

**C41 — `myshell-ai/MeloTTS`** https://github.com/myshell-ai/MeloTTS — **7 681 ★** /1 080 f · pushed
**2024-12-24** · **232 open issues** · repo **MIT** · zh/en/es/fr/EN-India/JP/KR · sherpa-onnx ships
`vits-melo-tts-zh_en` (163 MB) and `vits-melo-tts-en` · **the weights licence is UNVERIFIED** ·
**DECISION: WATCH — the sherpa-onnx export exists; check the weights licence before we need more than
Kokoro's voices.**

**C42 — `rhasspy/piper`** https://github.com/rhasspy/piper — **11 303 ★** /1 096 f · pushed
**2025-08-26** · **418 open issues** · **MIT** · **ARCHIVED** · the **voices** are separately MIT
(HF `rhasspy/piper-voices`, licence `mit`, last modified 2026-10-20) and sherpa-onnx carries the
`vits-piper-*` exports (**en_GB and en_US only — no en_AU and no en_NZ**) at 64.1 MB medium / 20.1 MB
int8 / 34.3 MB fp16 · risk: **the archive is dead** and **sherpa-onnx PR #4055 (merged 2026-10-16)
removed espeak-ng and piper-phonemize from the engine**, so the Piper phonemisation path may stop
working in our own engine · **DECISION: KEEP the MIT **voices**, but do not build on the archived
repo — and re-verify the phonemisation path before we promise a Piper voice. (→ ADR proposal, §9.)**

**C43 — `OHF-Voice/piper1-gpl`** https://github.com/OHF-Voice/piper1-gpl — **5 933 ★** /576 f · created
2025-03-28 · pushed **2026-10-17** · **149 open issues** · **GPL-3.0** · the live successor to the
archived Piper · **DECISION: REJECT (copyleft) — `CONSTRAINTS.md` forbids GPL in the shipped app. The
voice *files* remain usable under their own MIT terms; the *code* does not.**

**C44 — `FunAudioLLM/CosyVoice`** https://github.com/FunAudioLLM/CosyVoice — **24 076 ★** /2 753 f ·
created 2024-07-03 · pushed 2026-05-25 · **662 open issues** · **Apache-2.0** · HF
`FunAudioLLM/CosyVoice2-0.5B` licence **apache-2.0**, 7 778 downloads, last modified 2026-05-31 ·
0.5 B params, zero-shot voice cloning, zh/en/ja/ko/**yue**/es/fr · relevance: **Cantonese
capability under a clean licence** — the TTS side of the `yue` requirement, which Qwen3-TTS lacks ·
risk: server-scale; 662 open issues; the licence of the *training data* for the Cantonese timbre is
not stated in what we read · **DECISION: WATCH — the Cantonese TTS candidate.**

**C45 — `coqui-ai/TTS`** https://github.com/coqui-ai/TTS — **46 142 ★** /6 168 f · pushed **2024-08-16**
· **3 open issues** · **MPL-2.0** · dead in practice · **DECISION: REJECT (stale, and MPL is not in
our preferred set).**

**C46 — `SWivid/F5-TTS`** https://github.com/SWivid/F5-TTS — **15 428 ★** /2 249 f · created
2024-10-08 · pushed **2026-10-14** · **65 open issues** · **MIT** · zero-shot cloning, multi-lingual ·
**DECISION: WATCH — cloning is how we will get an en-NZ voice, but it is not a catalogue voice.**

**C47 — `OpenBMB/VoxCPM`** https://github.com/OpenBMB/VoxCPM — **39 629 ★** /4 499 f · created
2025-09-16 · pushed **2026-10-08** · **135 open issues** · **Apache-2.0** · **DECISION: WATCH — a
2025-26 multilingual TTS newcomer; the licence is clean, the language list was not read in this pass
→ UNVERIFIED.**

**C48 — `OpenMOSS/MOSS-TTS-Nano`** https://github.com/OpenMOSS/MOSS-TTS-Nano — **4 518 ★** /562 f ·
created **2026-04-10** · pushed 2026-09-06 · **26 open issues** · repo **Apache-2.0** (the *weights*
licence was not read → **UNVERIFIED**) · **DECISION: WATCH — 2026 newcomer; licence check before
anything else.**

**C49 — `fishaudio/fish-speech`** https://github.com/fishaudio/fish-speech — **33 318 ★** /2 895 f ·
pushed 2026-10-14 · **22 open issues** · repo licence **NOASSERTION** → **UNVERIFIED** · **DECISION:
WATCH — licence first.**

**C50 — `2noise/ChatTTS`** https://github.com/2noise/ChatTTS — **39 914 ★** /4 252 f · pushed
2026-04-10 · **63 open issues** · **AGPL-3.0** · **DECISION: REJECT (copyleft).**

**C51 — `suno-ai/bark`** https://github.com/suno-ai/bark — **39 270 ★** /4 663 f · pushed **2024-08-19**
· **269 open issues** · **MIT** (code and weights) · non-commercial uses and English-focused ·
**DECISION: REJECT (stale, and it is a text-to-audio model, not a prompt voice).**

**C52 — `zwan074/zero-voice`** https://github.com/zwan074/zero-voice — **3 ★** /0 f · created
2024-08-28 · pushed **2026-05-10** · **0 open issues** · **Apache-2.0** (code) · **the only open
te reo Māori TTS we found**: a zero-shot TTS trained on a 27-hour te reo Māori corpus (18 speakers),
with published checkpoints for the TTS model, a low-resource variant and a **te reo ASR checkpoint**;
the paper was accepted at **ICASSP 2026** · risk: **3 stars, one author, no released checkpoint
licence we could read (UNVERIFIED), and the underlying corpus is community/ethically governed** ·
**DECISION: WATCH — the reference implementation for the te reo Māori synthesis path we must build.**

**C53 — `zwan074/score-distribution-matching`** https://github.com/zwan074/score-distribution-matching
— **0 ★** /0 f · created 2025-08-22 · pushed 2026-05-10 · **0 open issues** · licence **NOASSERTION** ·
the ICASSP 2026 paper "Synthesized Data Selection via Score-Distribution Matching for Te Reo Māori
ASR": 27 h of real te reo speech + **520 h synthesised**, fine-tuning `Whisper-large-v3`, evaluated on
the **FLEURS `mi_nz`** test set · relevance: **it is the closest thing to a published recipe for our
exact problem** — but it is a research artefact, not a product · **DECISION: WATCH (study) — the
method is the plan: synthetic data selection, Whisper fine-tune, FLEURS `mi_nz` as the public
reference.**

**C54 — Te Hiku Media / Kaitiakitanga** https://blogs.nvidia.com/blog/te-hiku-media-maori-speech-ai/
(2024-01-16) — not an OSS repo, but **the** te reo Māori speech-AI fact source: **300+ hours** of
crowdsourced te reo, collected under the **Kaitiakitanga licence** (use for the benefit of the Māori
people, not commercial reuse), **NeMo**-based te reo ASR reported at **92 % accuracy** and bilingual
te reo/NZ English at **82 %**, with the **Te Taumata** benchmark (WER improved from 27 % to 10 %
across iterations) · relevance: it is both the **best NZ te reo speech result** and the **clearest
licence boundary** we have to design around · **DECISION: REJECT the data (Kaitiakitanga is not a
commercial licence) — ADOPT the *benchmark design* and the *method* as our reference.**

**C55 — `facebookresearch/fairseq`** https://github.com/facebookresearch/fairseq — **32 213 ★** /6 667 f
· pushed 2025-09-30 · **1 352 open issues** · **MIT** · **ARCHIVED** · the source of **XLS-R** and
**MMS** · relevance: XLS-R is the classic multilingual ASR family; MMS-LID is the only public LID that
covers Samoan · **DECISION: REJECT (archived) — and note that the MMS weights are **CC-BY-NC-4.0**
(`facebook/mms-lid-4017`, 17 444 downloads, `facebook/mms-1b-l1107`, 995 downloads,
`facebook/mms-tts-*`, `facebook/nllb-200-distilled-600M` 846 973 downloads) → **never shippable**.**

**C56 — `google/cld3`** https://github.com/google/cld3 — **886 ★** /131 f · pushed 2023-05-24 ·
**Apache-2.0** · **ARCHIVED** · **DECISION: REJECT (archived).**

**C57 — `Mimino666/langdetect`** (1 905 ★, npm `langdetect` 0.2.1, registry last modified 2022-10-19)
and **`shuyo/language-detection`** (770 ★, pushed 2019-02-25) — both stale, both older algorithms than
franc/lingua · **DECISION: REJECT (stale).**

**C58 — `fishjar/kiss-translator`** (12 922 ★, **GPL-3.0**) and
**`nextai-translator/nextai-translator`** (25 002 ★, **AGPL-3.0**) — **DECISION: REJECT (copyleft);
§11.2 clean-room study only.**

**Candidate count: 58 distinct repositories, models and data sources examined; 58 full evidence cards
above (C1–C58), of which 40 are per-candidate and the rest are grouped rejects and data sources.**

---

## 3. Shortlist (13)

| # | Candidate | Role | Verdict |
|---|---|---|---|
| 1 | `i18next` + `react-i18next` | i18n runtime (MIT, 540 kB + 969 kB unpacked) | **ADOPT** |
| 2 | `lingui` (`@lingui/core` + `@lingui/cli`) | ICU message format **compiled** to JS (MIT, 40 kB runtime) | **ADOPT** |
| 3 | `@formatjs/intl-localematcher` | BCP-47 locale negotiation (MIT) | **ADOPT** |
| 4 | `expo-localization@58.0.5` | device locale + RTL + per-app language (MIT, SDK-58) | **ADOPT** |
| 5 | `franc` | on-device first-pass text LID (MIT) | **ADOPT (first pass only)** |
| 6 | `lingua-py` | server-side authoritative LID + code-switch arbitration (Apache-2.0) | **ADOPT (server)** |
| 7 | `sherpa-onnx` + `XDcobra/react-native-sherpa-onnx@0.4.4` | the on-device engine + the model registry | **KEEP (locked)** |
| 8 | **Omnilingual ASR 300M int8** via sherpa-onnx | the **only** Apache-2.0 ASR covering **te reo Māori + Samoan** | **ADOPT (voice pack)** |
| 9 | `Kokoro-82M` + sherpa `kokoro-int8-multi-lang-v1_1` | the on-device TTS (Apache-2.0) | **KEEP** |
| 10 | `Qwen3-ASR-1.7B` / `Qwen3-TTS-12Hz-1.7B` | the licence-clean **server** multilingual pair | **KEEP (candidate)** |
| 11 | `whisper` / `whisper.cpp` | MIT multilingual fallback + the LID engine inside sherpa-onnx | **KEEP** |
| 12 | `IndicConformer` + `IndicVoices` | the reference for `hi`/`pa` ASR and for consented-corpus protocol | **WATCH** |
| 13 | `zero-voice` + `score-distribution-matching` | the only published te reo Māori synthesis + ASR recipe | **WATCH (study)** |

**Also on the radar, not shortlisted:** `ICU4X` (size-tunable CLDR, Unicode-3.0) · `Tolgee`
(Apache-2.0 + EL boundary unread) · `Weblate` (GPL-3.0, self-host unmodified only) · `Lingo.dev`
(Apache-2.0, first-pass only) · `CosyVoice2` (Apache-2.0, the Cantonese TTS) · `Canary-1B-v2`
(cc-by-4.0, 25 European languages) · `SenseVoiceSmall` (weights licence "other") · `KittenTTS` ·
`F5-TTS` · `VoxCPM` · `MOSS-TTS-Nano` · `Fish-Speech` · `MeloTTS` · `ArgoS Translate` · `Argos/MT` ·
`lingua-rs` · `lingua` (Kotlin) · `whatlang-rs` · `typesafe-i18n` · `Fluent` · `luxon` · `date-fns` ·
`ReactNativeLocalization` · `react-native-localize` · `Translator` (`ever-traduora`, AGPL).

**Rejected outright (never in our tree):** `piper1-gpl` (GPL-3.0) · `ChatTTS` (AGPL-3.0) ·
`LibreTranslate` (AGPL-3.0) · `ever-traduora` (AGPL-3.0) · `kiss-translator` (GPL-3.0) ·
`nextai-translator` (AGPL-3.0) · `coqui-ai/TTS` (MPL-2.0, stale) · `suno-ai/bark` (stale) ·
`fairseq` (archived) · `cld3` (archived) · `langdetect` / `shuyo/language-detection` (stale) ·
`globalize` (legacy) · `ICU4C` (too heavy) · `transloco` / `next-intl` (wrong framework) ·
`i18n-ally` / `fbt` (IDE / stale) — and every **non-commercial weight**: `mms-tts-*`, `nllb-200`,
`xls-r`, `mms-lid-*`, `mms-1b-l1107`, OmniVoice's CC-BY-NC weights, Moonshine's legacy non-English
models, and the **Kaitiakitanga**-licensed te reo corpus.

---

## 4. Deep review — top 5

### 4.1 sherpa-onnx (C29) — the engine we already locked

_Read_: `k2-fsa.github.io/sherpa/onnx/pretrained_models/index.html` (the model index and the "Spoken
language identification → multi-lingual Whisper" line), `…/tts/all/` (the 48-language monolingual
table), `…/tts/pretrained_models/index.html` and `…/kokoro.html` (the Kokoro exports),
`…/omnilingual-asr/index.html` and `…/omnilingual-asr/models.html` (the model list, the archive
listing `model.int8.onnx` = 348 MB, `tokens.txt` = 84 KB, `LICENSE` = 581 B, and the **published RTF
0.225** on the maintainer's machine), and the GitHub API for the 2026 commit / PR / issue streams.

*Commits (2026-10-19 → 2026-10-20, read 2026-10-21):* `51aaac5` "jni: Fix strings returned to Java
for characters outside the BMP (#4064)" · `2e3968f` "Forward provider config keys to the CUDA execution
provider (#3982) (#3985)" · `bddf3a0` "Refactor building wheels for Linux armv7 (#4071)" · `5fec9c9`
"jni: Fix TTS for characters outside the BMP (#4062)" · `432e8df` "Add akou to 'Projects using
sherpa-onnx' (#4039)" · `0dc72bc` "Fix offline CTC timestamps after filtering special tokens (#4018)" ·
`b461064` "Fix JSON escaping in online and offline recognition results (#4017)". Releases **v1.13.8
(2026-09-10)**, v1.13.7 (2026-09-01), v1.13.6 (2026-08-18) — ≈ weekly, 646 open issues.

*PRs opened 2026 (URL pattern `github.com/k2-fsa/sherpa-onnx/pull/<n>`):*
**#4073** (2026-10-20, open) "Fix typos in the project." · **#4072** (2026-10-20, open) "Add Uzbek
GigaAM model documentation and example" · **#4071** (2026-10-20, closed) "Refactor building wheels for
Linux armv7" · **#4070** (2026-10-20, open) "Add OfflineRecognizer.createAsync() to the Dart API" ·
**#4066** (2026-10-19, open) "Add Yap to 'Projects using sherpa-onnx'" · **#4064** (2026-10-19, closed)
"jni: Fix strings returned to Java for characters outside the BMP" · **#4062** (2026-10-19, closed)
"jni: Fix TTS for characters outside the BMP" · **#4061** (2026-10-19, open) "Fix supplementary-plane
text encoding in Java TTS" · **#4059** (2026-10-17, closed) "Update zip build dependency to v9
(clears RUSTSEC-2026-0367/0368/0369)" · **#4055** (2026-10-16, closed) **"Remove espeak-ng and
piper-phonemize from sherpa-onnx"** · **#4054** (2026-10-15, closed) "Add Node.js addon for Windows
arm64".

*Issues opened 2026:* **#4068** (2026-10-20, open) "[FEATURE] Uzbek language support in sherpa-onnx" ·
**#4067** (2026-10-20, closed) "[BUG] 1.13.8 ARMv7 wheel metadata omits core dependency, breaking uv
universal lock on Linux ARM64" · **#4065** (2026-10-19, closed) "License clarification for Chinese
Zipformer CTC INT8 (2025-07-03)" · **#4063** (2026-10-19, closed) "[BUG] JNI: strings returned to Java
are corrupted and truncated if they contain characters above U+FFFF" · **#4060** (2026-10-19, closed)
"[BUG] Java/Kotlin TTS: characters above U+FFFF (emoji, CJK Extension B, …) never reach the engine,
because the JNI layer uses modified UTF-8" · **#4058** (2026-10-17, closed) "[BUG] Rust bindings:
`sherpa-onnx-sys` build-dependency `zip = "2"` is flagged by three RUSTSEC advisories" · **#4057**
(2026-10-16, **open**) **"[BUG] Nabra Arabic INT8: Token-boundary Process Exit & Internal Syllable Dots
Reaching Kokoro Tokenization"** · **#4056** (2026-10-16, closed) "SenseVoice int8 (239 MB) uses ~600 MB
RAM on Android — is this expected?" · **#4053** (2026-10-15, closed) "v1.13.8 Apple TTS XCFrameworks:
license and corresponding-source inventory" · **#4046** (2026-10-13, closed) "VAD segments depend on how
many samples each accept_waveform call gets" · **#4042** (2026-10-13, **open**) "Omnilingual ASR aborts
on input shorter than 400 samples" · **#4036** (2026-10-10, closed) "qwen3-asr: passing vocab.json as
the tokenizer argument fails with a misleading error".

*What this actually tells us:*
- **#4060 and #4063 are Unicode bugs in the JNI layer.** Māori is full of macrons (ā ē ī ō ū) but those
  are all in the BMP, so they are safe — but **emoji and CJK Extension B are above U+FFFF and silently
  never reach the engine**. A driver's `📦` or a CJK-extended address character would vanish. Fixed
  upstream on 2026-10-19; our pinned engine must be ≥ that fix.
- **#4057 is our Arabic path.** A known defect in the Arabic INT8 Kokoro tokenization, open since
  2026-10-16. Arabic is on our list, so this is a **blocking** issue for the Arabic TTS decision.
- **#4042 is our Omnilingual path.** The 300M Omnilingual CTC recognizer aborts on audio shorter than
  400 samples — a short "delivered" utterance is exactly that. **Blocking** until fixed or worked
  around (we can pad the buffer).
- **#4055 removes piper-phonemize.** Our "MIT Piper voices" plan depends on a phonemiser that the
  engine has just dropped. → ADR proposal.
- **#4056 is the on-device memory ceiling.** A 239 MB int8 SenseVoice model costs ~600 MB of RAM. Our
  target device is a 4 GB Redmi-class phone. This is the number that decides the Omnilingual 348 MB
  pack's viability: it needs a RAM measurement on the CI emulator profile, not a guess.
- **The catalogue has no Māori, Samoan or Tongan model.** The Omnilingual export (C31) is how we get
  there, and it is in the same release channel.

*Verdict:* **keep, pin v1.13.8, and raise four upstream issues/PRs of our own**: the #4042 short-buffer
abort, a KWS binding, an en-NZ accent question, and the #4055 phonemisation consequence.

### 4.2 Omnilingual ASR (C31) — the finding that changes the plan

_Read_: `facebookresearch/omnilingual-asr` README §License (verbatim: *"Omnilingual ASR code and models
are released under the Apache 2.0"*), the `LICENSE` file (Apache-2.0 text), and
`src/omnilingual_asr/models/wav2vec2_llama/lang_ids.py` — **1 668 language ids** — read and grepped
exhaustively on 2026-10-21; then the sherpa-onnx Omnilingual model pages for the exported asset
names, the archive listing (348 MB `model.int8.onnx`, 84 KB `tokens.txt`, 581 B `LICENSE`) and the
published RTF.

*What the language table says (verbatim ids found):* `mri_Latn` (te reo Māori) · `smo_Latn` (Samoan) ·
`yue_Hans` (Cantonese) · `hin_Deva` (Hindi) · `pan_Guru` (Punjabi) · `arb_Arab` (Arabic) ·
`spa_Latn` (Spanish) · `eng_Latn` (English) · `fij_Latn` (Fijian) · `gil_Latn` (Gilbertese) ·
`ckb_Arab` (Central Kurdish) · `hif_Latn` (Hindi Fiji) — and **`ton_Latn` is absent**: an exhaustive
grep for `ton_Latn`, `to_*`, `*tonga*` and `*Tonga*` over all 1 683 lines returned only `cto_Latn`,
`eto_Latn`, `hto_Latn`, `kto_Latn`, `lto_Latn`, `mto_Latn` and the `tob/toc/toh/tok/tom/top/tos` set —
**no Tongan**.

*Why this matters more than anything else in this file:* ADR-004 rejected OmniVoice because its
**weights** are CC-BY-NC. Omnilingual's **weights** are Apache-2.0, its corpus is CC-BY-4.0, it is
**already exported to ONNX by our locked engine**, and it covers **8 of our 9 locales** — including the
two that no other permissively-licensed engine covers. It is the difference between "we might not be
able to ship te reo and Samoan" and "we can, and we can measure it".

*What it costs:* 348 MB of int8 weights (279 MB compressed) as a **downloadable voice pack**, not an
APK payload; 84 KB of tokens; greedy CTC decoding (RTF 0.225 on the maintainer's Mac, 2 threads —
**UNVERIFIED on a mid-range Android**); and it is a **CTC** model, so there are no word timings (the
speech-company format expects word timestamps for karaoke-style highlighting → we will need the
force-aligner or a second pass, or we accept sentence-level timestamps).

*Verdict:* **ADOPT as the on-device multilingual ASR candidate** — with three conditions: (1) the
RAM and RTF must be measured on the CI emulator profile before we promise it; (2) the licence must be
re-read from the **model card** at download time, not only from the upstream README (ADR-004 R2: the
ledger is a shipped surface); (3) **Tongan is not in it**, so Tongan needs a separate answer.

### 4.3 i18next + react-i18next (C1/C2) — the runtime

_Read*: the GitHub API for the repo, the commit stream (2026-10-17 → 2026-10-20), the PR stream and
the issue stream; the npm registry for version, licence, `dist.unpackedSize` and `dist.fileCount`.

*Commits:* `3ae8f7c` (2026-10-20) "test: replace deprecated vitest toBeCalled* matchers (#2453)" ·
`f7d9593` (2026-10-19) "26.5.3" · `a19e0f9` (2026-10-19) "changelog for 26.5.3" · `124d04e` (2026-10-19)
"fix(types): require count for explicit-ns plural selectors (#2452)" · `c46ea5c` (2026-10-17) "26.5.2" ·
`d798f0e` (2026-10-17) "fix(types): report the wrong t() option on TypeScript 7" · `dabd9f6` (2026-10-17)
"26.5.1" · `01c3852` (2026-10-17) "perf(types): no quadratic type-check time for large namespaces".

*PRs opened 2026:* **#2453** (2026-10-20, closed) vitest matcher migration · **#2452** (2026-10-19,
closed) "require count for explicit-ns plural selectors" · **#2450** (2026-10-15, closed) **"don't
repeat a fallback language that differs only in casing"** · **#2448** (2026-10-04, closed) "make the
TypeScript examples build and update them to i18next v26" · **#2447** (2026-09-03, closed) "keep
replacement patterns literal in nested values" · **#2446** (2026-08-31, closed) "allow selector
keyPrefix in getFixedT under enableSelector 'strict'" · **#2444** (2026-08-19, closed) "perf: cache
`toResolveHierarchy`" · **#2442** (2026-07-08, closed) "skip interpolation of placeholders inside
escaped values".

*Issues opened 2026:* **#2451** (2026-10-16, closed) "Performance: `cloneInstance()` +
`changeLanguage()` re-walk every preloaded language × namespace" · **#2449** (2026-10-10, closed)
"Performance: `init()` repeatedly enumerates large flat resource bundles per instance" · **#2445**
(2026-08-29, closed) "Remove ads in my terminal" · **#2435** (2026-05-26, closed) "Missing JSR releases"
· **#2429** (2026-05-06, closed) "enableSelector: opt to require an explicit ns prefix on every
selector path" · **#2428** (2026-04-30, closed) "Proposal: deprecate `defaultValue_<plural>` +
`saveMissingPlurals`" · **#2427** (2026-04-29, closed) "Proposal: support `defaultValue_<context>`" ·
**#2426** (2026-04-28, closed) "`this.options.overloadTranslationOptionHandler is not a function`".

*Three of these are directly ours:*
- **#2450** is our exact fallback chain. `en-NZ` and `en-nz` differ only in casing; our chain is
  `en-NZ → en-AU → en-GB → en`. The fix landed 2026-10-15, five days before we read it. **We must
  pin ≥ 26.5.2.**
- **#2451 and #2449 are the "switch a courier's language mid-shift" cost.** Re-walking every
  preloaded language × namespace on `changeLanguage()` is a **render-time stall in a driving UI**. Our
  catalogue is small (two catalogues, ~10 locales), so the absolute cost is small — but the shape is
  wrong for a 60 fps driving screen. The mitigation is Lingui's **compiled** catalogues (C3), which do
  not need to be re-parsed on switch.
- **#2428 (deprecating `defaultValue_<plural>`) is a migration warning**: if we use per-plural default
  values we will have to move off them. We should not.

*Verdict:* **ADOPT.** Pin `i18next@26.5.3` + `react-i18next@17.1.0`. Put every `t()` call behind one
`useT()` hook in `packages/i18n` so a swap to Lingui's runtime is a one-file change.

### 4.4 Lingui (C3) — the compile step

_Read*: the GitHub API for the repo, commits (2026-10-16 → 2026-10-20), PRs and issues; the npm
registry for `@lingui/core` and `@lingui/cli`.

*Commits:* `814929d` (2026-10-20) "chore(examples): migrate react-webpack-gettext example to lingui v6
(#2734)" · `735036e` (2026-10-20) "fix(detect-locale): read subdomains from the host only and return
null for missing segments (#2733)" · `18123cf` (2026-10-20) "fix(format-po-gettext): respect
explicitIdAsDefault when serializing (#2727)" · `60e823f` (2026-10-19) "fix(conf): do not mutate config
objects when replacing `<rootDir>` (#2730)" · `0255d73` (2026-10-19) "fix(core): put the plural offset
first and unescape meta option keys in the runtime macro (#2726)" · `aed4f98` (2026-10-19) "fix(vue-extractor):
report the .vue file and line for messages in `<script setup>` (#2728)" · `2a0662d` (2026-10-19)
"fix(vite-plugin): support Solid in the native macro transform (#2731)" · `b0355f2` (2026-10-16)
"chore(release): published v6.10.0 (#2724)".

*PRs opened 2026:* **#2734** (2026-10-20, closed) · **#2733** (2026-10-20, closed) · **#2732**
(2026-10-19, **open**) "feat(vue): add @lingui/vue, Vue 3 bindings with template macros" · **#2731**
(2026-10-19, closed) · **#2730** (2026-10-18, closed) · **#2729** (2026-10-18, open) "feat(vue-extractor):
make the underlying extractor configurable" · **#2728** (2026-10-18, closed) · **#2727** (2026-10-17,
closed).

*Issues opened 2026:* **#2719** (2026-10-12, open) "Make underlying extractor in Vue extractor
configurable" · **#2705** (2026-10-05, open) "vite-plugin: macroTransform generates invalid code for
SolidJS" · **#2702** (2026-10-05, closed) "vite-plugin: macroTransform fails to parse TS modules whose
id has a query string" · **#2700** (2026-10-04, **open**) **"Replace js-sha256 with audited
@noble/hashes"** · **#2699** (2026-10-03, open) "Can Babel dependencies be optional when using the
native Vite transform and experimental extractor?" · **#2688** (2026-09-28, open) "Push nextjs users to
native transform" · **#2681** (2026-09-22, closed) "lingui compile crashes when NODE_ENV=test" ·
**#2679** (2026-09-19, open) "Add MarkoJS support".

*What this tells us:*
- The **compile step is the point**: the runtime does no message parsing, so a catalogue switch mid-shift
  is a pointer swap, not a re-parse. That directly answers the i18next #2451 problem.
- **#2700 is on our supply-chain gate.** `js-sha256` is being replaced with an audited implementation;
  until then our `check-audit.mjs` / `gitleaks` gates do not cover it and we should pin and watch.
- **#2681 ("lingui compile crashes when NODE_ENV=test")** is a CI-shape warning: our catalogue compile
  must be a separate, deterministic step that the test job does not re-run in a different environment.
- The active work is **web-tooling** (Vue, Vite, Next.js). React Native is not their focus — but the
  core and the CLI are framework-agnostic and the catalogue format is what we need.

*Verdict:* **ADOPT the message format and the compile step.** Compile the UI catalogue at build time
into a single `packages/i18n/dist/<locale>.js` per locale, so the app loads one module per locale and
the **voice-prompt catalogue compiles to a separate module** with no ICU parser at all (the prompt
strings are literal, ≤ 8 words, no plural).

### 4.5 Expo Localization + React Native `I18nManager` (C5) — the locale source and the RTL contract

_Read*: `docs.expo.dev/versions/v58.0.0/sdk/localization/` (the `Locale` and `Calendar` types, the
config-plugin table, the `getLocales()` / `getCalendars()` contracts), `docs.expo.dev/guides/localization.md`
(the per-app-language section, the RTL section, the Expo Router `LocaleProvider` section, and the
`Intl` section), `docs.expo.dev/guides/using-hermes.md`, and `reactnative.dev/docs/i18nmanager`.

*What the SDK-58 guide says, verbatim in substance:*
- **"RTL support is enabled by default"** in SDK 58 and later (in previous versions it was opt-in and
  disabled in Expo Go). Layout direction follows RN's `I18nManager`.
- The **`expo-localization` config plugin** takes `supportsRTL` (default `true`), `forcesRTL`
  (default `false`) and **`supportedLocales`**. On iOS the device language must also be one of the
  app's supported locales, declared with `supportedLocales`, for the RTL layout and the per-app
  language to apply.
- **"On newer Android and iOS versions, app language can be set per app, so you usually don't need to
  build a custom UI to allow users to change the current locale inside of your app."**
- **Per-app language on Android requires the locale naming guidelines** (Android's `app-languages`
  resource qualifiers) and on iOS the language name or ISO designator.
- **Runtime direction change:** `I18nManager.forceRTL()` "takes full effect on the next application
  start, not immediately" and is "only meant for development and testing". The documented runtime
  pattern is `I18nManager.allowRTL()` + `forceRTL()` + **`Updates.reloadAsync()`**, and for the
  navigator, **`LocaleProvider direction={direction}` from `expo-router`** in the root
  `app/_layout.tsx`.
- **`textAlign` does not accept `start`/`end`** in React Native; `left` behaves as `start` and `right`
  as `end`, but the **default unset `textAlign` always aligns left** — so every `<Text>` needs an
  explicit alignment from a shared wrapper.
- **`Intl`:** "If you're using Hermes in your app, you can use the `Intl` API on all platforms."

*What this changes for us:*
1. **The RTL risk is lower than the previous version of this file assumed** — SDK 58 ships RTL on by
   default. The risk moves from "is RTL supported" to "**does our design system survive a mirrored
   layout**", which is a design-review question, not a platform question.
2. **A per-courier language preference is nearly free**: declare `supportedLocales` in the config plugin
   and the driver picks the app language in Android/iOS settings — no in-app picker, no restart, no
   custom code. Our in-app picker is then only for **overriding per shift**, and it must be a
   **catalogue-only** switch (same direction) or it must go through `LocaleProvider` + a reload.
3. **The `<Text>` alignment wrapper is mandatory work** and is a one-line change with a wide blast
   radius — it belongs in the design-system package, not in every screen.

*Verdict:* **ADOPT `expo-localization@58.0.5`** as the only locale source, declare `supportedLocales`
in `app.json`, and treat the RTL alignment wrapper + the Maestro RTL matrix as the design-system task.

---

## 5. Benchmark — what we can and cannot say

**The eval set does not exist.** `docs/squads/voice/eval/` is absent (checked 2026-10-21);
`docs/squads/voice/benchmarks/` contains only `README.md`. Everything below is therefore either a
**published upstream number** (clearly attributed) or **UNVERIFIED**.

### 5.1 The published evidence, and what it actually tells us

| Metric | Published number | Source | Our verdict |
|---|---|---|---|
| Omnilingual ASR WER/CER | "character error rates (CER) below 10 for **78 %** of those languages" (the 7B LLM-ASR system, not the 300M CTC model) | Meta README, read 2026-10-21 | **Vendor claim, and for a different model size.** Our 300M int8 CTC export is not the 7B system. **UNVERIFIED for our pack.** |
| Omnilingual RTF | **0.225** (2 threads, the maintainer's macOS machine, 3.845 s of audio in 0.867 s) | sherpa-onnx Omnilingual models page | Real, but **not our device**. On a Redmi-class Cortex-A78 at 4 GB this will be materially worse. **UNVERIFIED on our profile.** |
| sherpa-onnx TTS RTF | `kokoro-en-v0_19` **6.629** / 3.870 / 2.999 / 2.774 (1/2/3/4 threads) at 330 MB; `kokoro-multi-lang-v1_1` **7.635** / 4.470 / 3.430 / 3.191 at 311 MB; `vits-piper-en_US-lessac-medium` **0.774** at 61 MB | sherpa-onnx **RTF table, Raspberry Pi 4 Model B Rev 1.5** | The **only** published TTS latency table we can cite. Kokoro at RTF > 1 on a Pi 4 means it does **not** keep up with real time on a Pi 4; a mid-range phone is a different class, but this sets the floor. **UNVERIFIED for our device.** |
| Hindi ASR WER | **13.2** on the **Vaani** benchmark (read-speech) | `ai4bharat/indic-conformer-600m-multilingual` card | A **read-speech** number, not van noise, not addresses. **UNVERIFIED for our use.** |
| Te reo Māori ASR WER | 27 % → 10 % across Te Hiku's iterations; **92 % accuracy** te reo, **82 %** bilingual te reo/NZ English (NVIDIA blog, 2024-01-16) | NVIDIA blog + the Te Taumata paper (NeurIPS 2024 Datasets & Benchmarks) | **Under the Kaitiakitanga licence — a reference point, not a model we may ship.** |
| Tongan ASR WER | **26.18 %** (a Mixformer transfer-learning paper, 90 M params, RTX 4070) | *Appl. Sci.* 15(21):11412, published 2025-10-23 | A single paper, a bespoke corpus, and **no released checkpoint** we could find. **UNVERIFIED.** |
| Whisper-small Tongan WER | **51.11 %** on `csikasote/Tonga` (from the model card's own training log) | HF `simzacademy/whisper-small-tonga` | A **fine-tune of Whisper-small on a community dataset**, published on a personal account. Shows the difficulty; **not a product.** |
| Samoan LID | MMS-LID 1024/2048/4017 reach Samoan **precision 0.92–0.98 but recall 0.57–0.61** (confusing Samoan with Hawaiian and Tongan); a **Whisper-medium encoder + MLP head** reaches **macro F1 0.91** at pilot scale (15 videos, ~1.6 k segments) | *AmericasNLP 2026* (doi 10.18653/v1/2026.americasnlp-6.18) | The **clearest statement of the Samoan problem we found.** It also states that **Whisper, VoxLingua107 and ESPnet-OWSM cover neither Samoan nor Yup'ik**, and that only MMS-LID covers Samoan — and MMS is **CC-BY-NC**. **The MLP-on-a-frozen-Whisper-encoder recipe is ours to copy.** |
| Whisper vs te reo Māori | FLEURS `mi_nz` is the standard public test set; Whisper-large-v3 fine-tuned with 27 h real + 520 h synthesised te reo is reported to beat the baselines on it | ICASSP 2026 paper + NeurIPS 2024 Te Taumata | Our **public reference set** for te reo, and our **data recipe**. |
| TTS naturalness / MOS | — | — | **We have no MOS number we can source, and we will not invent one.** We measure **intelligibility** instead: the M8 metric in `docs/squads/voice/EVAL.md` — synthesise the prompt, transcribe it with a **pinned judge**, and score WER/CER. That is reproducible; MOS with human raters is not yet arranged (EVAL.md §10.4). |

### 5.2 The benchmark we have to build, and how each row gets measured

| Row | Metric | Definition | Status | How we would measure it |
|---|---|---|---|---|
| **WER per language** | WER (CER for `zh`/`yue`) on our slices | against `transcript_final`, per `docs/squads/voice/EVAL.md` §7 | **UNVERIFIED — no eval set** | Build `docs/squads/voice/eval/` per EVAL.md §2 (≥600 utterances, 14 slices, 12 languages incl. `mi`/`sm`/`to`/`pa`/`yue`); score Omnilingual-300M-int8, Whisper, Qwen3-ASR and the on-device English model on the *same* set and the *same* judge |
| **WER for te reo Māori / Samoan / Tongan** | as above, per language | — | **UNVERIFIED** | Same set; add the **FLEURS `mi_nz`** public subset as the external reference so our numbers are comparable to the published literature |
| **Code-switch WER** | WER on the `code_switch` slice (≥60, with gold switch offsets) | — | **UNVERIFIED** | Same set; the Omnilingual model is language-conditioned, so we also score the **zero-shot (no language id)** path — if it cannot pick the right language from the audio alone, the app must condition it |
| **Voice latency (end-to-end)** | last spoken word → action in the event log | **≤ 700 ms** (`CONSTRAINTS.md`) | **UNVERIFIED** | `EVAL.md` §7 defines t0/t1 from the recorded waveform; run on the CI emulator profile **and** one mid-range Android; report p50/p90/p95 per slice |
| **TTS latency** | time to first audible sample for a ≤8-word prompt | — | **UNVERIFIED** | Measure on the same two profiles; cross-check against sherpa-onnx's published Pi 4 RTF table as an order-of-magnitude sanity check only |
| **Model size per language** | bytes downloaded and bytes resident | — | **PARTIALLY MEASURED (published)** | Measured: Omnilingual 300M int8 = **279 MB** compressed / **348 MB** on disk (one pack, all 1 668 languages); Kokoro int8 multi-lang = **140.2 MB**; sherpa Cantonese int8 = **111.8 MB**. **UNVERIFIED: the resident RAM** (sherpa issue #4056 says a 239 MB int8 model costs ~600 MB RAM) and **UNVERIFIED: our per-language split** — we do not yet know the APK-share cost of a per-language pack |
| **TTS naturalness** | — | — | **UNVERIFIED — no MOS we can source** | M8 intelligibility (synthesise → pinned judge → WER/CER) now; human MOS later when raters are arranged (EVAL.md §10.4) |
| **Catalogue size** | runtime bytes of the i18n stack + per-locale data | — | **MEASURED (npm, 2026-10-21)** | `i18next` 540 569 B / 16 files · `react-i18next` 969 381 B / 89 files · `@lingui/core` **40 573 B** / 11 files · `react-intl` 199 219 B / 10 files · `@formatjs/intl-pluralrules` 953 271 B / 464 files · `@formatjs/intl-localematcher` 242 520 B / 6 files · `@formatjs/intl-numberformat` **110 349 172 B** / 1 548 files · `@formatjs/intl-datetimeformat` **140 736 080 B** / 1 552 files. **Unpacked, not minified+gzip — UNVERIFIED as an APK contribution**; the FormatJS CLDR packages are 250 MB unpacked and are unnecessary if Hermes ships `Intl` |
| **Plural correctness** | correct plural category per locale | CLDR v48 | **MEASURED for the rules, UNVERIFIED for our strings** | CLDR v48 (Unicode 16.0.0) has **224 cardinal locales**; `mi`, `sm`, `to` have **only the `other` category** (they are *not* in the cardinal table), `en` is `one = "i = 1 and v = 0"`, `hi` is `one = "i = 0 or n = 1"`, `pa` is `one = "n = 0..1"`, `ar` has **six** categories (zero/one/two/few/many/other). A CI unit test asserts `Intl.PluralRules(locale).resolvedOptions().pluralCategories` per locale |
| **RTL layout risk** | zero mirrored-layout defects | — | **UNVERIFIED** | Maestro screenshots of 5 key screens × {LTR `en-NZ`, RTL `ar`} × {day/night, small/large, 200 % text}; plus an automated check that no style hard-codes `left`/`right` where `start`/`end` is meant |
| **Date/number/currency for NZ** | correct NZ formatting | — | **MEASURED for the data, UNVERIFIED for our rendering** | CLDR v48 `en_NZ.xml` → NZD symbol **`$`**; `en_001.xml` (inherited by `en-NZ`) → `yMd = dd/MM/y`, `yM = MM/y`, `yMMMd = d MMM y`. The **NZ first-day-of-week** could not be read from the raw CLDR `weekData` file (**UNVERIFIED**); `expo-localization`'s `getCalendars()[0].firstWeekday` is the runtime source, and we assert its value in a CI test |
| **Translation workflow** | human minutes per 1 000 strings × locale | — | **UNVERIFIED** | Track, do not gate. The workflow itself is specified in §6 |

### 5.3 The catalogue size rule we will adopt (and why it is a rule, not a preference)

- `mi`, `sm`, `to` → **one plural form** ("other"). A catalogue with `_one` keys for te reo will never
  fire and is dead weight.
- `ar` → **six** forms. A two-form (`_one`/`_other`) Arabic catalogue is a **defect**, because
  `few`/`many` are the categories Arabic actually uses for counts.
- `hi`, `pa` → `one` covers **both 0 and 1**. "No parcels" and "1 parcel" take the *same* form in
  Hindi and Punjabi.
- `en` → `one` requires **`i = 1 and v = 0`**, so "1.0" is *other*. Any string built from a float
  count silently picks the wrong form.
- The **voice-prompt catalogue has no plural rules at all** — a prompt is a fixed utterance chosen by
  intent, not by a count. If a prompt contains a count, the count is spelled per locale in a separate
  catalogue (`<count>` → "one parcel" / "Ngā包裹" / "حزمة واحدة"), which is a **different problem** and
  a different table.

---

## 6. What we are missing → rows for `docs/PARITY.md`

The CEO merges these. Each row is a capability that exists in the best OSS repos or in the competitor
(`docs/study/spoke/TEARDOWN.md`, read 2026-10-21) and that we do not have today. The **Spoke column**
is filled **only** with facts verified in TEARDOWN.md; where TEARDOWN is silent, the cell is left
empty. Task ids follow `docs/PARITY.md`: **T4** LINZ · **T6** design · **T7.x** the product list.
**T7.16** is a **new** task id this area needs (i18n runtime, two catalogues, per-app language) and is
**not** in the current task list — the CEO assigns it.

| # | Family | Feature | Status | Spoke (2026-10-20) | Our edge | Task |
|---|---|---|---|---|---|---|
| 1 | Language | UI locale catalogue (full sentences, ICU plural, formatted) | Planned (task) | 19 languages, phone-language driven, falls back to US English | our two-catalogue split: the UI catalogue and the ≤8-word voice catalogue never mix | T7.16 |
| 2 | Language | Per-courier language preference (choose a language for a shift) | Planned (task) | follows the phone language; falls back to US English | per-shift language override + OS per-app language via `supportedLocales` | T7.16 |
| 3 | Language | Auto language detection + code-switch arbitration | Planned (task) | not documented | two-tier LID (on-device first pass, server authority) with an explicit "not sure" | T7.16 |
| 4 | Language | RTL layout (mirrored UI, RTL text) | Planned (task) | Arabic and Hebrew are in its 19-language list; RTL rendering not documented | design-system mirror + Maestro RTL matrix, not just a flipped `textAlign` | T7.16 |
| 5 | Language | Te reo Māori voice (ASR **and** TTS) | Planned (task) | not supported | the only shipping path we found with a clean licence (Omnilingual ASR, Apache-2.0) + our own synthesis | T7.16 |
| 6 | Language | Samoan / Tongan voice | Planned (task) | not supported | Samoan via Omnilingual; Tongan has **no** permissively-licensed model anywhere we could find | T7.16 |
| 7 | Language | Cantonese (yue) voice | Planned (task) | not supported (Mandarin/Cantonese absent) | sherpa-onnx already ships a Cantonese ASR (111.8 MB, 107 929 downloads) | T7.16 |
| 8 | Language | Hindi / Punjabi voice | Planned (task) | not supported (Hindi/Punjabi absent) | IndicConformer (MIT) is the clean-licence reference for `hi`/`pa` | T7.16 |
| 9 | Language | NZ English accent voice | Planned (task) | | no en-NZ voice exists in Kokoro or Piper — we must train or clone one | T7.16 |
| 10 | Language | Plural, date, number and NZD formatting per locale | Planned (task) | distance unit derived from the phone language | CLDR v48 rules asserted in CI; NZ `$`, `dd/MM/y` | T7.16 |
| 11 | Language | Translation workflow for 10 locales × 2 catalogues | Planned (task) | | one catalogue source of truth in `packages/`, human review, **addresses never machine-translated** | T7.16 |
| 12 | Language | Multilingual ASR/TTS **model ledger** (licence per shipped weight) | Planned (task) | | ADR-004 R2: the ledger is a shipped surface; a non-commercial weight makes the engine unavailable | T7.16, T7.15 |
| 13 | Voice | Voice prompts ≤ 8 words, spoken in the driver's language | Planned (task) | no voice control of the app while driving | the prompt catalogue is compiled and separate; never mixed with the UI strings | T7.5, T7.16 |
| 14 | Language | Multilingual support agent grounded in our docs | Planned (task) | in-app live chat support | our own docs, our own voice, on-device-first | T7.12 |

**Rows the competitor teardown does not support:** TEARDOWN §14 lists Spoke's 19 languages and states
that te reo Māori, Mandarin/Cantonese, Hindi/Punjabi and Samoan/Tongan are **not supported**, and that
the app follows the **phone language** with a **US English** fallback; §17 adds that Spoke has **no
voice control while driving** and **no on-device audio** (manifest OCR uploads to their servers, voice
dictation is "cloud-shaped"). Every other cell in the table above is our own gap, not a competitive
claim.

---

## 7. Decision

**1. Two catalogues, one runtime.**
**ADOPT `i18next` + `react-i18next`** (MIT, pinned `26.5.3` / `17.1.0`) as the runtime, **ADOPT
Lingui** (`@lingui/core` + `@lingui/cli` 6.10.0) as the message format and compile step, **ADOPT
`@formatjs/intl-localematcher` 0.9.0** for BCP-47 negotiation. The **UI catalogue** is compiled per
locale; the **voice-prompt catalogue** is compiled to a separate module with no ICU parser at all.

**2. `expo-localization@58.0.5` is the only locale source.**
Declare `supportedLocales` in `app.json` so the **OS per-app language picker works**; use
`getLocales()` for `textDirection`, `currencyCode`, separators and `regionCode`; use
`getCalendars()` for the week start and the 12/24-hour clock. The in-app picker is a **catalogue-only**
switch unless the direction changes, in which case it goes through `expo-router`'s `LocaleProvider` +
`Updates.reloadAsync()`.

**3. The RTL work is a design-system task, not a platform task.**
SDK 58 has RTL **on by default**. Our work is: one `<Text>` wrapper with an explicit `textAlign`, a
`start`/`end` lint rule, and a Maestro RTL matrix. `react-native-safe-area-context` is already a RTL
regression surface.

**4. Two-tier LID.**
**ADOPT `franc` (MIT)** restricted to our locale set as the on-device first pass on the transcript we
already have, and **ADOPT `lingua-py` (Apache-2.0)** in `services/voice` as the authority, with the
`minimum_relative_distance` threshold so it can answer *"not sure"* and fall back to the driver's
chosen language. Code-switch arbitration is the server's call, not the phone's.

**5. On-device multilingual ASR: Omnilingual ASR 300M int8, via sherpa-onnx.**
This is the decision the sprint was for. The weights are **Apache-2.0** ("code and models"), the model
is **already exported by our locked engine**, the archive **ships its own `LICENSE`** (the ADR-004
ledger pattern), and its 1 668-language table covers `mri_Latn` (te reo Māori), `smo_Latn` (Samoan),
`yue_Hans`, `hin_Deva`, `pan_Guru`, `arb_Arab`, `spa_Latn`, `eng_Latn`, plus `fij_Latn` and `gil_Latn`
for the wider Pacific community. It ships as a **279 MB download pack**, not an APK payload.
**Three conditions before we promise it:** the RAM and RTF must be measured on the CI emulator profile
(the sherpa issue #4056 datapoint says a 239 MB int8 model costs ~600 MB RAM); the licence must be
re-read from the model card at download time; and **#4042** (the short-buffer abort) must be fixed or
worked around.

**6. TTS: Kokoro on device, and we build the voices we cannot download.**
**KEEP `Kokoro-82M`** (Apache-2.0 weights) via sherpa-onnx's `kokoro-int8-multi-lang-v1_1` (140.2 MB).
But **no en-NZ, no Māori, no Samoan and no Tongan voice exists to download** — Kokoro's English voices
are **American and British** (there is **no** Australian and **no** New Zealand English voice in
Kokoro at all), and the sherpa catalogue has no Pacific TTS at all. The te reo path is our own
build on the `zero-voice` recipe (Apache-2.0 code, 27 h corpus, ICASSP 2026) with our own consented
data; the Samoan and Tongan paths are **open problems** and we must say so in the app rather than
pretend.

**7. Server-side: keep Qwen3-ASR/TTS as candidates, but correct the record.**
**KEEP `Qwen3-ASR-1.7B` and `Qwen3-TTS-12Hz-1.7B`** (Apache-2.0 weights) as the private server
candidates. The coverage is narrower than the previous version of this file claimed: **Qwen3-ASR
covers 30 languages + 22 Chinese dialects** (`zh, en, yue, ar, de, fr, es, pt, id, it, ko, ru, th, vi,
ja, tr, hi, ms, nl, sv, da, fi, pl, cs, fil, fa, el, hu, mk, ro`) — **no mi, sm, to, pa**; and
**Qwen3-TTS covers exactly 10 languages** (zh, en, ja, ko, de, fr, ru, pt, es, it) — **no ar, no hi, no
yue**. They are the licence-clean server pair, not the multilingual answer.

**8. Tongan: we have no answer, and we say so.**
`ton_Latn` is absent from Omnilingual; Tongan is absent from Whisper, from Qwen3-ASR and from the
sherpa catalogue. The published literature reports **26.18 % WER** for a bespoke Tongan transfer-learning
system with no released checkpoint. **Plan B: the AmericasNLP recipe** — a small MLP head on a frozen
Whisper encoder, which reached macro F1 0.91 for Samoan at pilot scale — plus our own consented
Tongan data. This is an **ADR proposal**, not a decision we can take alone.

**9. Translation workflow: human-first, machine-assisted, addresses never machine-translated.**
**WATCH Tolgee** (read the Apache-2.0/EL boundary first) and **Lingo.dev** (first-pass only, never for
addresses or place names). **Weblate** is GPL-3.0 — self-host it **unmodified** as a separate service
only, and study it clean-room. The LINZ-derived street and suburb names are **data, not copy**: they
stay in official NZ English form in every locale, and a lint rule must fail the build if a catalogue
ever contains a translated street name.

**10. The licence ledger grows a third surface.**
ADR-004 R2 already requires the ledger to report the licence of the code **and** the weights. It must
now also cover the **corpus** licence (Omnilingual's corpus is CC-BY-4.0; the te reo corpora are
Kaitiakitanga) and the **voice files** (Piper's are MIT; `piper1-gpl`'s *code* is GPL and must never
enter the tree).

**11. What we will not do.**
No GPL/AGPL/SSPL/Commons-Clause/CC-NC/FSL/BUSL in the shipped app; no `mms-*`, `nllb-200`, `xls-r`,
`mms-lid-*` or OmniVoice weights; no Kaitiakitanga corpus; no AI-translated addresses; no
machine-translated UI strings in a language a human has not reviewed; and no positioning of the
product as a novelty model in the product copy or the docs.

---

## 8. Risks and the fallback

| Risk | Severity | Mitigation / fallback |
|---|---|---|
| **Tongan has no permissively-licensed ASR or TTS anywhere** | **High** | Say so in the app (the courier picks English or the language the model actually supports); build the AmericasNLP MLP-on-frozen-Whisper head with consented data; raise it as an ADR proposal |
| **Omnilingual 348 MB pack + ~600 MB RAM on a 4 GB phone** | **High** | Measure RAM and RTF on the CI emulator profile **before** promising it; ship the pack as an on-demand download; keep the English on-device model (Parakeet/Whisper) as the always-resident fallback |
| **sherpa #4042 — Omnilingual aborts on input shorter than 400 samples** | **High** | Pad the buffer ourselves, or wait for the fix; the engine pin must include the fix if it lands |
| **sherpa #4055 — piper-phonemize removed from the engine** | Medium | Re-verify the Piper MIT voice path against v1.13.8 before we promise it; if broken, our English voice is Kokoro (Apache-2.0) and the "MIT Piper voices" fallback in the previous version of this file is **withdrawn** → ADR proposal |
| **sherpa #4057 — the Arabic int8 Kokoro tokenization defect is open** | Medium | Do not ship Arabic TTS until it is closed and the fix is in our pin; meanwhile Arabic ASR (Omnilingual `arb_Arab`) is unaffected |
| **No en-NZ voice exists to download** | Medium | Train or clone one (F5-TTS / our own model, `docs/squads/voice/OWN-MODEL.md`); the eval set must score it against Kokoro's American and British English voices, and against a recorded Kiwi-accent reference |
| **i18next is one maintainer; 26.x churn** | Medium | Pin exact versions; every `t()` call behind one `useT()` hook in `packages/i18n`; a swap to Lingui's runtime is a one-file change |
| **Lingui #2700 — `js-sha256` is not an audited hash** | Medium | Pin; add to the dependency-audit review; the fix is upstream and we do not carry a fork |
| **Lingui #2681 — the compile step crashes under `NODE_ENV=test`** | Low | The catalogue compile is a separate, deterministic CI step with its own environment |
| **i18next #2451/#2449 — `changeLanguage()` re-walks every catalogue** | Low | Compiled catalogues (Lingui) make a language switch a pointer swap; assert the switch cost in a Maestro trace |
| **Arabic needs six plural forms; `mi`/`sm`/`to` need one** | Low | A CI unit test asserts `Intl.PluralRules(locale).pluralCategories` per locale and fails when a catalogue carries a form the locale does not use |
| **RTL mirroring breaks the design system** | Medium | A `start`/`end` lint rule, one `<Text>` wrapper, and an RTL Maestro matrix on the 5 key screens |
| **`expo-localization`'s `textDirection` is unavailable on some web browsers** | Low | Mobile is the product; on web, detect the direction manually |
| **The catalogue is duplicated between the app, the dashboard and the web** | Medium | One source of truth in `packages/i18n`; one compile step; CI fails when a key is missing in any locale |
| **A machine translation reaches an address string** | High | A lint rule forbids translated street/suburb names; LINZ names are data, not copy, and are excluded from every translation pipeline |

---

## 9. Monthly radar filter

Run on the **first working day of each month**, by the Researcher role, and write the result into
`docs/EXECUTOR_LOG.md`. **A card is promoted to the shortlist only if it clears the filter — the filter
is a gate, not a suggestion.**

| # | Watch | Trigger to act | Source to check |
|---|---|---|---|
| 1 | **Omnilingual ASR** (the 300M CTC pack) | a **v3+** export lands, **or** `lang_ids.py` gains `ton_Latn` (Tongan), **or** a new corpus release widens the Pacific set | `facebookresearch/omnilingual-asr` · `k2-fsa/sherpa-onnx` `asr-models` release |
| 2 | **Tongan ASR** | any permissively-licensed Tongan checkpoint appears on HF or in the sherpa catalogue | HF `api/models?search=tongan&search=to&search=tonga` · sherpa model index |
| 3 | **Te reo Māori** | a te reo TTS checkpoint with a **commercial** licence appears (the Zero-Voice corpus is ethically governed) | HF `api/models?search=maori&search=mri&search=te_reo` · `zwan074/zero-voice` |
| 4 | **en-NZ TTS voice** | Kokoro or Piper publishes an en-NZ voice, **or** a licensed NZ-accent dataset appears | HF `api/models?search=nz&search=new-zealand` · `rhasspy/piper-voices` |
| 5 | **Cantonese** | sherpa publishes a newer yue model, **or** CosyVoice2's Cantonese licence is confirmed | sherpa `asr-models` release · `FunAudioLLM/CosyVoice` |
| 6 | **sherpa-onnx** | a release ≥ **v1.13.9** lands, **or** #4042 (short-buffer abort) or #4057 (Arabic tokenization) is closed | `k2-fsa/sherpa-onnx` releases + the two issues |
| 7 | **`XDcobra/react-native-sherpa-onnx`** | it releases ≥ **v0.5.0**, **or** it re-adds a keyword-spotting export, **or** it bumps its pinned engine to v1.13.8 | the repo's releases + `third_party/sherpa-onnx-prebuilt` |
| 8 | **i18next** | a **27.x** release, **or** a new major with a breaking change to `fallbackLng`/`changeLanguage` | npm `i18next` + the repo's releases |
| 9 | **Lingui** | **v6.11+**, **or** #2700 (`js-sha256`) is closed, **or** React-Native-specific extraction lands | the repo's releases + issue #2700 |
| 10 | **FormatJS** | `intl-localematcher` or `intl-pluralrules` changes its licence or its CLDR version | npm `@formatjs/*` + the repo's releases |
| 11 | **ICU4X** | a React Native / WASM binding with a usable licence appears | `unicode-org/icu4x` releases |
| 12 | **Expo SDK 59** | the SDK-59 localisation guide changes the RTL default or the `supportedLocales` plugin behaviour | `docs.expo.dev/guides/localization.md` (modification date is printed on the page — it was **2026-09-07**) |
| 13 | **Expo Router `LocaleProvider`** | the API changes, or runtime direction switching gets first-class support | the Expo Router docs |
| 14 | **Hindi / Punjabi ASR** | a smaller ONNX export of IndicConformer lands, **or** `Indic-Transcribe` (25 languages) is released under a clean licence | HF `ai4bharat` |
| 15 | **CLDR** | **CLDR v49** is released (we are on **v48 / Unicode 16.0.0**) — re-read the plural table and the NZ formats | `unicode-org/cldr` releases |
| 16 | **Translation workflow** | Tolgee publishes a **clear EL boundary** for self-hosting, **or** a TMS ships te reo / Samoan community packs | the Tolgee repo + its licence file |
| 17 | **Spoke** | Spoke's app listing changes its 19-language list, or ships a voice-control feature | the NZ App Store / Play listings (the same sources as TEARDOWN.md S13/S14/S16) |
| 18 | **Any non-commercial weight** | nothing — a non-commercial licence is a permanent rejection, not a radar item | `scripts/check-licences.mjs` + the ledger |

---

## 10. What we could not verify

1. **6-month star trend for every candidate** — the star timeline is 403 with our token (re-verified
   2026-10-21); the proxies used are releases/6 m, commits/90 d, humans/90 d, npm and HF downloads.
2. **Median issue-response time** — not sampled for this area. **UNVERIFIED.**
3. **The Omnilingual ASR *model card* licence** — `huggingface.co/api/models/facebook/omnilingual-asr-1b`
   returns **HTTP 401** to our client, so we could not read the card. The Apache-2.0 grant is verified
   from the upstream **README §License** and the repo `LICENSE` file, and the **sherpa-onnx archive
   ships its own `LICENSE`** — but ADR-004 R2 requires the licence to be re-read from the artefact we
   actually ship. **UNVERIFIED from the card.**
4. **Omnilingual's per-language CER for `mri`, `smo`, `yue`, `pa`** — Meta publishes only the aggregate
   "CER below 10 for 78 % of languages" for the 7B LLM system. **UNVERIFIED for the 300M CTC export.**
5. **Our RTF and RAM on the target device** — every latency number in this file is somebody else's
   (Pi 4 for sherpa-onnx TTS, a Mac for Omnilingual, an RTX 4070 for the Tongan paper). **UNVERIFIED.**
6. **The NZ first-day-of-week from CLDR** — the raw `weekData` file did not resolve (404 on the raw
   path we tried). **UNVERIFIED from CLDR**; `expo-localization`'s `getCalendars()[0].firstWeekday` is
   the runtime source and we assert its value in CI.
7. **`expo-localization`'s explicit New-Architecture statement** — implied by SDK-58 parity and the
   first-party module, not stated verbatim. **UNVERIFIED as an explicit statement.**
8. **The bundle contribution of the i18n stack** — the npm `dist.unpackedSize` figures are unpacked,
   not minified+gzip and not the APK delta. **UNVERIFIED as an APK number.**
9. **The `zero-voice` and `score-distribution-matching` checkpoint licences** — the repos are
   Apache-2.0 / NOASSERTION respectively, but the released checkpoint and the 27 h corpus licence were
   not read. **UNVERIFIED.**
10. **`CosyVoice2`'s Cantonese timbre data licence** — the model card says Apache-2.0; the training
    data is not stated in what we read. **UNVERIFIED.**
11. **`VoxCPM`, `MOSS-TTS-Nano` and `Fish-Speech` weight licences** — the repo licences are clean but the
    weight licences were not read. **UNVERIFIED.**
12. **`KittenTTS` weight licence** — the HF model ids tried returned **HTTP 401**; only the repo
    licence (Apache-2.0) is verified. **UNVERIFIED.**
13. **`MeloTTS` weight licence** — the repo is MIT; the weights were not read. **UNVERIFIED.**
14. **The `en_AU` / `en_NZ` Piper voice question** — the sherpa-onnx `tts-models` asset list we read
    contains **en_GB and en_US Piper voices only**; we did not enumerate the full
    `rhasspy/piper-voices` catalogue on Hugging Face (the repo id moved and the HF repo reports
    0 downloads). **UNVERIFIED whether an en_AU or en_NZ Piper voice exists.**
15. **Production users** — no i18n or translation project in this area publishes a verifiable
    production-user count. **UNVERIFIED.**
16. **Whether Spoke would ship a Pacific language** — TEARDOWN.md §14 lists their 19 languages as of
    2026-10-21; a future change is a radar item, not a fact.
17. **Corrected by the verifier pass of 2026-10-21 (VERIFICATION-A/B/D.md): 1 card corrected.**

---

## 11. Corrections to the previous version of this file (2026-10-20)

| Claim (2026-10-20) | Verified 2026-10-21 | Correction |
|---|---|---|
| "Hermes `Intl` support is `intl` opt-in — **UNVERIFIED for our build config**" | The Expo SDK-58 localization guide states: *"If you're using Hermes in your app, you can use the `Intl` API on all platforms."* | **Resolved — Hermes has `Intl` on all platforms in SDK 58.** The `@formatjs/intl-numberformat` (110 MB) and `intl-datetimeformat` (141 MB) packages are therefore **not needed**. |
| "Qwen3-TTS … a permissively-licensed multilingual TTS … the leading replacement for OmniVoice" | The model card lists **exactly 10 languages**: zh, en, ja, ko, de, fr, ru, pt, es, it — **no ar, no hi, no yue** | **Materially wrong.** It covers **2 of our 9 locales** (en, zh) and is not an OmniVoice replacement for our markets. |
| "Qwen3-ASR per-language coverage **UNVERIFIED**" | The card lists **30 languages + 22 Chinese dialects**, including `yue`, `ar`, `hi`, `es` — and **no mi, sm, to, pa** | Now **verified**, and the coverage is **narrower than the Pacific requirement**. |
| "React Native's built-in `I18nManager` + `NativeModules.SettingsManager` is the fallback" | SDK 58 has **RTL enabled by default**; `expo-localization`'s config plugin exposes `supportsRTL` / `forcesRTL` / `supportedLocales` | The fallback is unnecessary; **per-app language selection** is a config change, not a code path. |
| "RTL: `I18nManager.forceRTL` + Maestro golden screenshots per locale" | `forceRTL` **takes effect on the next app start**; the documented runtime path is `allowRTL` + `forceRTL` + **`Updates.reloadAsync()`** + `expo-router`'s **`LocaleProvider direction`** | The mitigation was incomplete: a **language switch that changes direction needs a reload**, and the navigator needs `LocaleProvider`. |
| "No permissively-licensed engine covers our full list" | **Omnilingual ASR's weights are Apache-2.0** ("code and models"), cover `mri_Latn` and `smo_Latn`, and are **already exported by sherpa-onnx** (279 MB pack, 94 358 downloads) | **The central premise was out of date.** There *is* a permissively-licensed engine for te reo Māori and Samoan. The previous version had not found it. |
| "Tongan is not covered by anything" | Still true for every permissively-licensed model — `ton_Latn` is absent from Omnilingual's 1 668-id table | **Confirmed and sharpened**: Tongan is the single hard gap. |
| "Piper MIT voices" as a multilingual fallback | `rhasspy/piper` is **archived**; the live successor `OHF-Voice/piper1-gpl` is **GPL-3.0** (rejected); **sherpa-onnx PR #4055 (2026-10-16) removed piper-phonemize** | The "MIT Piper voices" fallback is **withdrawn pending re-verification** → ADR proposal. |
| "`react-native-localize` **ADOPT (light)**" | `expo-localization@58.0.5` (SDK-58 parity) plus the `supportedLocales` config plugin gives OS-level per-app language | **REJECT** — a second native module buys us nothing the OS picker does not already give. |
| "Kokoro-82M: ✔ (en-AU)" | `hexgrad/Kokoro-82M/VOICES.md`, read 2026-10-21: **American English (11F+9M)** and **British English (4F+4M)** — **no Australian and no New Zealand English voice exists** | **Corrected.** The previous file counted an Australian voice that is not in the voice list. The 54 voices break down as en-US 20 · en-GB 8 · zh 8 · ja 5 · **hi 4** · es 3 · pt-BR 3 · it 2 · fr 1. |
| "The catalogue needs `_one`/`_other` per locale" | CLDR v48 (Unicode 16.0.0), read from `plurals.json` on 2026-10-21: `mi`, `sm` and `to` are **not in the cardinal table** → **`other` only**; `ar` has **six** categories (zero/one/two/few/many/other); `hi` → `one = "i = 0 or n = 1"`; `pa` → `one = "n = 0..1"`; `en` → `one = "i = 1 and v = 0"` | **A two-form catalogue is wrong for `ar` and dead weight for `mi`/`sm`/`to`.** The catalogue shape is now derived from CLDR, not guessed. |
| "`franc` — ADOPT (on-device LID, first pass)" | The npm package `franc` **6.2.0** has a registry last-modified date of **2024-01-11** and the repo's last push is **2024-06-12** | **Still adopt**, but the package is **2.5 years stale** — pin it exactly and treat it as replaceable behind our `detectLanguage()` interface. |
| "`react-native-localize` … per-app language override" | The OS already provides per-app language selection on Android 13+ and iOS 16+ once the app **declares** its locales via the `expo-localization` config plugin (`supportedLocales`) | The override is a **config-plugin change**, not a second native module. |
| "One more language by v1.0" (the bar) | The only permissively-licensed TTS we can ship covers **en** (+ zh, ja, ko, de, fr, ru, pt, es, it for Qwen3-TTS) — **no Arabic, no Hindi, no Cantonese, no Pacific language** | **The bar is right, but the second language must be chosen by *voice* coverage, not by UI-string count.** The UI is easy; the voice is not. Our recommendation: **Hindi** (`hin_Deva` + `pan_Guru` in Omnilingual ASR, IndicConformer MIT for `hi`/`pa`, Kokoro `hi` for TTS) is the only second language with a **complete** stack today. Te reo Māori is the **strategically** right answer and the one we should fund — but the TTS has to be built. |

---

## 12. The immediate next three tasks

1. **Build the catalogue skeleton and prove the toolchain.** `packages/i18n` with `i18next` + Lingui +
   `expo-localization`; two catalogues per locale (`ui` + `prompts`); `app.json` gets the
   `expo-localization` config plugin with `supportedLocales` and `supportsRTL: true`; one CI test that
   asserts `Intl.PluralRules(locale).pluralCategories` against the catalogue's declared forms. Until
   this exists, nothing else in this file can be measured.
2. **Measure the Omnilingual pack on the CI emulator profile** (RAM, RTF, battery) and on one
   mid-range Android, with the 30-file CI sample from `EVAL.md` §5 — plus the short-buffer workaround
   for sherpa issue #4042 and a language-conditioning test for the `mi` and `sm` slices. **This is the
   gate for the whole Pacific-language plan.**
3. **Open the ADR proposals** this research forces: (a) the Piper fallback withdrawal (sherpa #4055),
   (b) the Tongan language gap and the MLP-on-frozen-Whisper-encoder recipe, (c) the corpus-licence
   column in the shipped ledger (CC-BY-4.0 for the Omnilingual corpus, Kaitiakitanga for te reo).

---

*Files read for this research on 2026-10-21:* `CONSTRAINTS.md` · `docs/DECISIONS.md` ·
`docs/adr/ADR-004-voice-service-licences.md` · `docs/PARITY.md` · `docs/study/spoke/TEARDOWN.md` ·
`docs/squads/voice/EVAL.md` · `docs/squads/voice/STATUS.md` · `apps/mobile/package.json` ·
`docs/research/2026/on-device-stt-tts-vad-kws.md` (sibling area, to avoid contradicting it) ·
`docs/research/2026/routing-vrp-engines.md` (the format reference).