# Multilingual voice & i18n — 2026 research

**Area:** V4 §3 "i18n/RTL & multilingual voice" · V4 §10.1 ("multilingual models covering at least: English (NZ accent), Māori place names, Arabic, Hindi/Punjabi, Mandarin, Samoan/Tongan, Spanish — plus auto language detection and code-switching") · V4 §12
**Research date:** 2026-10-20 · **Role:** Researcher · **Squad:** Voice (+ Design System)
**Our current choice:** **none yet.** `apps/mobile/package.json` (read 2026-10-20) contains **no i18n runtime** and **no localisation package** — the only adjacent dependency is `expo-audio@58.0.9` (MIT, npm modified 2026-10-15) for capture/playback. `expo-localization` and `expo-speech` are **not** installed. This is a greenfield choice, so the licence and maintenance stakes are highest here.
**Tooling:** `scripts\gh.ps1` (GitHub CLI, token read from `.env.local` and never printed), npm registry, `huggingface.co/api/models/<id>` for weights licences, sherpa-onnx docs.

---

## Queries run

All run from the repo root on 2026-10-20.

1. `gh search repos "i18n react-native" --sort stars --limit 25`
2. `gh search repos "rtl" --sort stars --limit 25`
3. `gh search repos "language-detection" --sort stars --limit 25`
4. `gh search repos "topic:i18n stars:>30" --sort stars --limit 30`
5. `gh search repos "topic:internationalization stars:>20" --sort stars --limit 30`
6. `gh search repos "topic:translation stars:>100" --sort stars --limit 20`
7. `gh search repos "multilingual asr" --sort stars --limit 20`
8. `gh search repos "maori language" --sort stars --limit 15`
9. `gh search repos "topic:multilingual stars:>80" --sort stars --limit 20`
10. `gh search repos "kitten tts" --sort stars --limit 10`
11. `gh api repos/<owner>/<repo>` — stars, license, created_at, pushed_at, open_issues_count, forks, archived for every repo below
12. `gh api repos/<owner>/<repo>/releases?per_page=3` — last release + cadence
13. `gh api repos/<owner>/<repo>/commits?per_page=20` — 90-day maintainer activity
14. `gh api repos/<owner>/<repo>/readme` — README for the deep review
15. `npm view <pkg> version license time.modified repository.url` — `i18next`, `react-i18next`, `react-intl`, `@formatjs/intl`, `@formatjs/intl-pluralrules`, `@formatjs/intl-localematcher`, `@formatjs/intl-relativetimeformat`, `@formatjs/intl-datetimeformat`, `@formatjs/intl-numberformat`, `expo-localization`, `react-native-localize`, `intl-pluralrules`, `rtl-detect`, `tinyld`, `fasttext`, `franc`, `langdetect`, `lingua`, `globalize`, `i18next-parser`, `@lingui/cli`
16. `huggingface.co/api/models/<id>` — `hexgrad/Kokoro-82M`, `FunAudioLLM/SenseVoiceSmall`, `Qwen/Qwen3-ASR-1.7B`, `Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice`, `nvidia/canary-1b-v2`, `facebook/nllb-200-distilled-600M`, `facebook/mms-tts-eng|ara|hin|spa`, `supertone-oss-archive/supertonic`
17. `k2-fsa.github.io/sherpa/onnx/tts/pretrained_models/index.html` — the multilingual TTS model catalogue (Kokoro multi-lang, KittenTTS, VITS/Piper, MMS)

---

## The language matrix we must satisfy (V4 §10.1)

`en-NZ` · te reo Māori place names (mi) · Arabic (ar) · Hindi (hi) / Punjabi (pa) · Mandarin (zh) · Samoan (sm) / Tongan (to) · Spanish (es) · **plus auto language detection and code-switching**.

| Engine | en-NZ | mi | ar | hi | pa | zh | sm | to | es | LID | Code-switch | Weights licence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Kokoro-82M | ✔ (en-AU) | ✖ | ✖ | ✔ | ✖ | ✔ | ✖ | ✖ | ✔ | ✖ | ✖ | **apache-2.0** |
| sherpa `kokoro-multi-lang-v1_1` | ✔ | ✖ | ✖ | ✖ | ✖ | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ | apache-2.0 (sherpa export) |
| KittenTTS (nano/mini) | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | repo Apache-2.0; HF card **UNVERIFIED** |
| Piper MIT voices (`rhasspy/piper`, archived) | ✔ | ✖ | ✔ | ✔ | ✖ | ✔ | ✖ | ✖ | ✔ | ✖ | ✖ | MIT (voices) |
| Qwen3-ASR-1.7B | ✔ | ? | ✔? | ✔? | ✔? | ✔ | ? | ? | ✔ | ✔ | ✔? | **apache-2.0** — per-language list **UNVERIFIED** |
| Qwen3-TTS-12Hz-1.7B | ✔ | ? | ✔? | ✔? | ✔? | ✔ | ? | ? | ✔ | ? | ? | **apache-2.0** — per-language list **UNVERIFIED** |
| Whisper | ✔ | ✖ | ✔ | ✔ | ✖ | ✔ | ✖ | ✖ | ✔ | ✔ | partial | **MIT** (code + weights) |
| NVIDIA Canary-1B-v2 | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✔ | ✔ | partial | **cc-by-4.0** |
| SenseVoiceSmall | ✔ | ✖ | ✖ | ✖ | ✖ | ✔ | ✖ | ✖ | ✖ | ✔ | ✖ | repo MIT, **weights = "other"** (FunASR licence) |
| Moonshine (legacy non-EN) | — | — | ✔ | — | — | ✔ | — | — | ✔ | ✖ | ✖ | Moonshine Community Licence (< US$1 M revenue) |
| OmniVoice | ✔ | ~ (unwritten) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ? | **CC-BY-NC → REJECT for shipping** |
| MMS-TTS / NLLB / XLS-R | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — | **cc-by-nc-4.0 → REJECT** |

**No single permissively-licensed engine covers our full list.** The gap must be closed by *composition* (one ASR + one TTS + a per-language LID + a code-switch rule), not by one model.

---

## Candidate evidence cards

**1. i18next/i18next** — https://github.com/i18next/i18next
★8,647 · created 2011-12-16 · last release **v26.5.3 (2026-10-19)** · cadence: **multiple releases per day** (2026-10-19 / 10-17 / 10-17) · pushed 2026-10-20 · open issues **1** · npm `i18next` 26.5.3, MIT, modified 2026-10-19 · last-20 commits 2026-10-20→2026-10-12 by adrai(17) → **1 primary maintainer but near-zero issue backlog**.
Licence MIT · on-device ✔ (pure JS, no native code) · **New Arch: n/a** · Expo SDK 58: works as plain JS · Android API 34: n/a · bundle size: core ~10–15 kB min+gzip (**UNVERIFIED**, not measured).
Better than our current choice: we have nothing; i18next is the de-facto standard, has plural/number/context formatting, a `nsSeparator`/fallback chain, and a plugin model for `expo-localization` and `I18nManager`.
Risks: single maintainer (adrai); 26.x is a major-version churn treadmill; the `Intl` API dependency means **Hermes must ship full-ICU** (Expo/Hermes `Intl` support is `intl` opt-in — **UNVERIFIED for our build config**).
**DECISION: ADOPT** — the default i18n runtime, MIT, actively maintained, no native coupling.

**2. i18next/react-i18next** — https://github.com/i18next/react-i18next
★10,059 · created 2015-12-12 · pushed 2026-10-17 · open issues **1** · no GitHub releases (npm-driven) · npm `react-i18next` 17.1.0, MIT, modified 2026-10-17.
Licence MIT · RN-first React bindings (`useTranslation`, `Trans`, `<Trans>`) · no native code.
**DECISION: ADOPT** — pairs with i18next; the React Native binding is the same package.

**3. formatjs/formatjs (react-intl)** — https://github.com/formatjs/formatjs
★14,744 · created 2014-04-24 · last release `vue-intl@8.1.4` (2026-10-19) · pushed 2026-10-19 · open issues 3 · repo licence reported **NOASSERTION** (the repo is a monorepo of many packages, each with its own licence) · npm `react-intl` 12.1.5 **BSD-3-Clause** (modified 2026-10-19), `@formatjs/intl` 6.1.4 **MIT**, `@formatjs/intl-pluralrules` 6.3.16 **MIT** (2026-10-19), `@formatjs/intl-localematcher` 0.9.0 **MIT** (2026-09-12), `@formatjs/intl-relativetimeformat` 12.3.16 MIT, `@formatjs/intl-datetimeformat` 7.8.2 MIT, `@formatjs/intl-numberformat` 9.4.3 MIT.
Last-20 commits 2026-10-19→2026-10-17 were **16/20 `renovate[bot]`** → human-driven activity is thin in this window.
Licence per-package MIT/BSD-3 ✔ · full ICU message syntax (plural categories, select, number/date skeletons), `@formatjs/intl-localematcher` is the **canonical locale-negotiation algorithm** (BCP-47 matching) we need for "NZ English vs en-AU vs en-GB" fallback.
Better than our current choice: the **message format is ICU-standard**, which translators and translation tools (Tolgee, Weblate, Crowdin, Lingo.dev) all understand; i18next's v4 JSON is not.
Risks: the monorepo's NOASSERTION licence needs per-package checking (done above for the ones we would use); `react-intl` pulls `intl-messageformat` (runtime parsing cost — **UNVERIFIED** for Hermes).
**DECISION: ADOPT (ICU message layer)** — specifically `@formatjs/intl-pluralrules` + `@formatjs/intl-localematcher`; `react-intl` itself is an **alternative** to react-i18next, not a companion.

**4. unicode-org/icu4x** — https://github.com/unicode-org/icu4x
★1,874 · created 2020-02-27 · last release **icu@2.3.1 (2026-08-21)** · cadence (08-21 / 08-14 / 04-01) · pushed 2026-10-19 · open issues **765** · repo licence **NOASSERTION** → the **Unicode License v3** (permissive: commercial use allowed, notice retained; **not** one of our preferred four). Rust core; `icu` on crates.io and npm.
Last-20 commits 2026-10-16→2026-10-13 by robertbastian(11), sffc(5) → healthy.
Better than our current choice: the *only* i18n stack that gives **data-driven, size-tunable locale data** — critical for the ≤ 80 MB APK budget, because we can compile exactly the locales and the CLDR features we need (plurals, calendars, time zones for NZ) instead of shipping full ICU.
Risks: 765 open issues; Rust → WASM bridge for RN is not a trivial drop-in (**UNVERIFIED** for RN 0.88 / New Arch); licence outside our preferred set.
**DECISION: WATCH** — the correct long-term answer for CLDR data on device, but a big integration; revisit after v1.

**5. expo/expo (`expo-localization`)** — https://github.com/expo/expo
★52,869 · created 2016-08-15 · pushed 2026-10-20 · open issues 932 · licence **MIT** · npm `expo-localization` **58.0.5**, MIT, modified 2026-10-19 — matching our **Expo SDK 58** exactly; `expo-speech` 58.0.3 MIT (modified 2026-10-15).
Better than our current choice: it is the *only* API that gives us the **device's locale list, the RTL flag, and per-app language settings** with SDK-58 parity and no native work. React Native's built-in `I18nManager` + `NativeModules.SettingsManager` is the fallback.
Risks: Expo-bounded (fine — we are Expo); `expo-localization` does **not** format dates/numbers/plurals — we still need a formatting layer.
**DECISION: ADOPT** — device locale + RTL source of truth.

**6. zoontek/react-native-localize** — https://github.com/zoontek/react-native-localize
★2,443 · created 2017-08-01 · last release **3.7.2 (2026-09-15)** · pushed 2026-10-13 · open issues 7 · licence **MIT** · npm `react-native-localize` 3.7.2 MIT (2026-09-15).
Better than our current choice: per-app language selection (a courier may pick Māori or Arabic for a shift while the phone is en-NZ), event-based locale change, 2-digit/3-digit country codes.
Risks: duplicates `expo-localization`; would add a second native dependency to an Expo app.
**DECISION: REJECT** — `expo-localization` covers the same ground with SDK-58 parity and no extra native module.

**7. tolgee/tolgee-platform** — https://github.com/tolgee/tolgee-platform
★4,134 · created 2020-10-13 · last release **v3.237.0 (2026-10-19)** · cadence near-daily (10-19 / 10-16 / 10-15) · pushed 2026-10-20 · open issues 211 · README badge: **"Apache 2.0 / Tolgee EL"** → Apache-2.0 plus an **Enterprise Licence** overlay; GitHub reports NOASSERTION → the exact split between the OSS core and the EL features is **UNVERIFIED** and must be read before self-hosting.
Kotlin + TS; in-context editing, screenshot mode, machine translation hooks; **reads ICU/plural formats natively** → pairs with `react-intl`.
Risks: licence boundary not confirmed; self-hosting a whole platform is operational weight we do not need for 8 locales; the JS editor SDK is separate.
**DECISION: WATCH** — the best OSS translation-management candidate *if* the EL boundary is clean for self-hosting; we could also just use a hosted SaaS for translation and keep only the runtime local.

**8. WeblateOrg/weblate** — https://github.com/WeblateOrg/weblate
★6,114 · created 2012-02-27 · last release **weblate-2026.10.1 (2026-10-09)** · pushed 2026-10-20 · open issues 450 · licence **GPL-3.0**.
Better than our current choice: the most mature free TMS; plural/ICU handling; glossary; the "one place for all our strings".
Risks: **GPL-3.0**. Self-hosting it *unmodified as a separate service* does not infect our app (the same rule D22 applies to Chatwoot/AGPL tools), but any modification we make and expose over the network would need source publication.
**DECISION: WATCH (self-host, unmodified only)** — permitted under the D22 rule; listed as a **clean-room study candidate** for anything we must reimplement.

**9. lingui/js-lingui** — https://github.com/lingui/js-lingui
★5,920 · created 2017-01-17 · last release **v6.10.0 (2026-10-16)** · cadence (10-16 / 10-09 / 10-01) · pushed 2026-10-20 · open issues 55 · licence **MIT** · npm `@lingui/cli` 6.10.0 MIT (2026-10-16) · last-20 commits by andrii-bodnar(8), mehdimirzafaruk(4) → healthy 2-person core.
Better than our current choice: **ICU-compatible message format with a compile step** → the runtime ships *compiled* message functions (no runtime ICU parser on Hermes), which is exactly the performance win we want for a 60 fps driving UI. Small, readable, no native code.
Risks: compile step in CI (fine); smaller ecosystem than i18next; no RN-specific helpers to speak of.
**DECISION: ADOPT (message format + compile step)** — pair Lingui's ICU format with i18next's runtime, or use Lingui's own runtime.

**10. generaltranslation/gt** — https://github.com/generaltranslation/gt
★1,070 · created 2024-11-19 · pushed 2026-10-20 · open issues 57 · licence **MIT** · last release `locadex@1.0.247` (2026-10-14).
**DECISION: WATCH** — 2024–26 newcomer, full-stack localisation; early.

**11. lingodotdev/lingo.dev** — https://github.com/lingodotdev/lingo.dev
★5,398 · created 2024-03-13 · pushed 2026-10-19 · open issues 21 · licence **Apache-2.0** · last release `lingo.dev@0.138.10` (2026-10-07) · AI-assisted localisation engineering.
Better than our current choice: automated translation + memory across locales — valuable for 8 locales × courier vocabulary that we must keep consistent (LINZ street names, package sizes, action verbs).
Risks: AI translation of NZ address vocabulary will be wrong without a glossary; we must human-review address strings.
**DECISION: WATCH** — use for *first-pass* translation of non-address copy only, never for addresses.

**12. projectfluent/fluent.js** — https://github.com/projectfluent/fluent.js
★1,010 · created 2017-02-02 · last release `@fluent/dom@0.10.2` (2025-07-18) · pushed 2026-05-22 · open issues 82 · licence **Apache-2.0** · Mozilla's Fluent syntax (AST-based, terms/selectors).
Better than our current choice: excellent for *selectors* (plural, gender, platform) and translator-friendly messages.
Risks: smaller ecosystem; no RN-specific support; last release 2025-07.
**DECISION: WATCH** — a good alternative message syntax; Lingui already gives us ICU.

**13. jsverse/transloco** — https://github.com/jsverse/transloco
★2,284 · MIT · pushed 2026-10-14 · **Angular-only**.
**DECISION: REJECT** — not React Native.

**14. amannn/next-intl** — https://github.com/amannn/next-intl
★4,384 · MIT · pushed 2026-10-02 · **Next.js-only**.
**DECISION: REJECT** for the mobile app; candidate for the **web dashboard** (see `docs/research/2026/` web area).

**15. Codingcommons/typesafe-i18n** — https://github.com/codingcommons/typesafe-i18n
★2,478 · MIT · pushed 2026-03-22 · typesafe TS i18n with no runtime dependencies and compile-time key checking.
**DECISION: WATCH** — the "no runtime dependency" property is attractive for an APK-budgeted app; ICU-message support is weaker than Lingui/FormatJS.

**16. lokalise/i18n-ally** — https://github.com/lokalise/i18n-ally
★4,896 · MIT · last push 2024-12-13 · VS Code extension.
**DECISION: REJECT** — IDE-only; not a runtime dependency (a nice DX tool though).

**17. facebook/fbt** — https://github.com/facebook/fbt
★3,880 · MIT · last push 2024-11-14 · Facebook's internal i18n toolchain.
**DECISION: REJECT** — stale, Facebook-internal shaped.

**18. globalizejs/globalize** — https://github.com/globalizejs/globalize
★4,834 · MIT · last push 2025-09-29 · legacy jQuery/Backbone-era.
**DECISION: REJECT** — legacy.

**19. unicode-org/icu (ICU4C)** — https://github.com/unicode-org/icu ★3,619 · pushed 2026-10-19 · **Unicode-3.0** licence.
**DECISION: REJECT (in-app)** — far too heavy for a mobile bundle; ICU4X is the modern path.

**20. pemistahl/lingua-py** — https://github.com/pemistahl/lingua-py
★1,809 · created 2021-07-13 · last release **v2.2.0 (2026-03-09)** · pushed 2026-07-20 · open issues 49 · licence **Apache-2.0** · "the most accurate natural language detection library", optimised for short text.
Better than our current choice: the accuracy leader for short utterances, supports 75+ languages with **low-accuracy/high-accuracy profiles** (the low-accuracy mode is exactly what a realtime voice loop needs).
Risks: **Python** — it would run in `services/voice`, not on the phone; for the phone we need an ONNX/RN equivalent.
**DECISION: ADOPT (server-side LID)** — use lingua-py in `services/voice` for auto language detection; on-device LID must come from a different tool.

**21. pemistahl/lingua-rs** — https://github.com/pemistahl/lingua-rs
★1,146 · Apache-2.0 · pushed 2026-10-19 · Rust port of the same models.
Better than our current choice: the **same model family** as lingua-py but in Rust → WASM is viable for on-device LID.
Risks: WASM in Hermes is not free; model files add to the bundle (**size UNVERIFIED**).
**DECISION: WATCH** — candidate for on-device LID if we can find a WASM build that fits the APK budget.

**22. pemistahl/lingua (Kotlin)** — https://github.com/pemistahl/lingua ★827 · MIT · last push 2025-03-21 · **Android-native** port.
**DECISION: WATCH** — the most direct Android path to lingua-grade LID; would need an RN binding.

**23. greyblake/whatlang-rs** — https://github.com/greyblake/whatlang-rs
★1,087 · MIT · last push 2025-12-24 · Rust, 69 languages, very fast.
**DECISION: WATCH** — a lighter alternative to lingua for on-device LID; lower accuracy claimed by lingua but much smaller.

**24. wooorm/franc** — https://github.com/wooorm/franc
★4,419 · MIT · last push 2024-06-12 · JS/TS, 400+ languages via trigram profiles, tiny.
Better than our current choice: pure JS → drops into the RN app with **zero native code**; good enough for "which of our 8 locales" after we restrict the output set.
Risks: text-based, so it needs a transcript first (adds latency); less accurate.
**DECISION: ADOPT (on-device LID, first pass)** — franc on the transcript, restricted to our locale set, is cheap and safe; lingua-py on the server for the hard cases.

**25. shuyo/language-detection** — https://github.com/shuyo/language-detection
★770 · NOASSERTION · last push 2019-02-25 · Java.
**DECISION: REJECT** — dead for 7 years.

**26. Mimino666/langdetect** — https://github.com/Mimino666/langdetect
★1,905 · npm `langdetect` 0.2.1, Apache-2.0, modified 2022-10-19.
**DECISION: REJECT** — stale, older algorithm than franc/lingua.

**27. google/cld3** — https://github.com/google/cld3
★886 · created 2016-06-02 · last push 2023-05-24 · licence **Apache-2.0** · **archived by Google** (the repo is read-only/deprecated).
**DECISION: REJECT** — archived; replaced by CLD4/lingua.

**28. facebook/nllb-200-distilled-600M (HF)** — licence **cc-by-nc-4.0**, 846,973 downloads, last modified 2024-02-14, 200 languages. GitHub `facebook/nllb` → **404 Not Found** (the code repo has moved/was renamed → **UNVERIFIED**).
**DECISION: REJECT (copyleft/non-commercial weights)** — clean-room study only; cannot ship in a commercial product.

**29. facebook/mms-tts-{eng,ara,hin,zho,spa} (HF)** — all **cc-by-nc-4.0** (verified ara 6,572 dl, hin 13,849 dl, spa 4,345 dl, eng 53,259 dl, all last modified 2023-08/09).
**DECISION: REJECT** — the NC licence rules out exactly the Arabic/Hindi/Mandarin/Spanish voices we need; use the **MIT Piper voices** instead.

**30. facebook/xls-r / XLS-R (HF)** — licence **cc-by-nc-4.0**; GitHub `facebook/xls-r` and `facebookresearch/xls-r` both **404**.
**DECISION: REJECT** — non-commercial weights.

**31. Qwen/Qwen3-ASR-1.7B (HF)** — licence **apache-2.0**, **1,219,114 downloads**, last modified 2026-01-30; repo `QwenLM/Qwen3-ASR` ★3,737, Apache-2.0, created 2026-01-28, pushed 2026-06-26, open issues 25, no GitHub releases.
Better than our current choice: **permissive + multilingual + 1.2 M downloads** → the strongest licence-clean multilingual ASR candidate we found. Also listed in the sherpa-onnx ASR model catalogue.
Risks: 1.7 B params = **server-only**; the exact per-language coverage (especially **mi / sm / to**) is **UNVERIFIED**; HF `Qwen/Qwen3-ASR-Flash` returned **401 (gated)** so its licence could not be read → **UNVERIFIED**.
**DECISION: ADOPT (server-side multilingual ASR candidate)** — must be scored on our eval set before it beats Parakeet/Whisper.

**32. Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice (HF)** — licence **apache-2.0**, **2,069,796 downloads**, last modified 2026-01-29; repo `QwenLM/Qwen3-TTS` ★13,881, Apache-2.0, created 2026-01-21, pushed 2026-03-17, open issues 56.
Better than our current choice: a **permissively-licensed multilingual TTS** — the licence-clean alternative to OmniVoice (CC-BY-NC). Per-language coverage **UNVERIFIED**.
Risks: 1.7 B params → server; push cadence has slowed since 2026-03.
**DECISION: ADOPT (server-side multilingual TTS candidate)** — the leading replacement for OmniVoice **if** the licence-safe language coverage holds; must be benchmarked.

**33. nvidia/canary-1b-v2 (HF)** — licence **cc-by-4.0** (commercial OK), **179,073 downloads**, last modified 2026-08-31, 25 languages: bg, hr, cs, da, nl, en, et, fi, fr, de, el, hu, it, lv, lt, mt, pl, pt, ro, sk, sl, **es**, sv, ru, uk.
Better than our current choice: the best permissively-licensed European multilingual ASR with LID and translation built in.
Risks: **no Arabic, Hindi, Mandarin, or Pacific languages** — covers only our `en` + `es` requirement.
**DECISION: WATCH** — the es/en workhorse; not a whole-product answer.

**34. FunAudioLLM/SenseVoiceSmall (HF)** — weights licence **"other"** (the FunASR Model Licence Agreement), 21,304 downloads, last modified 2026-06-20, languages zh/en/ja/ko/yue + multilingual; repo `QwenAudio/SenseVoice` ★9,549, **MIT** (code), pushed 2026-09-30, last release `runtime-llamacpp-v0.2.1` (2026-08-27), open issues 12. Ships LID + emotion recognition; also in the sherpa-onnx ASR catalogue.
Better than our current choice: **built-in language ID** is exactly our "auto language detection" need.
Risks: **weights are not on a standard OSI licence** → needs a legal read; no Arabic/Hindi/Pacific.
**DECISION: WATCH** — the LID idea is worth stealing even if the weights are not adopted.

**35. openai/whisper** — https://github.com/openai/whisper
★110,908 · created 2022-09-16 · last release **v20250625 (2025-06-26)** · pushed 2026-08-31 · open issues 175 · licence **MIT (code AND weights)** · 99 languages, `language` auto-detect, `task=translate` (English→English translation), `initial_prompt` for context biasing.
Better than our current choice: MIT weights (unlike MMS/NLLB), auto LID, and the only engine with **code-switch tolerance via prompt biasing** we can use to inject LINZ place names.
Risks: no true streaming; 16 kHz input; not te reo-aware; the "translate" task is English→English only.
**DECISION: KEEP (as the licence-clean multilingual fallback)** — plus `whisper.cpp` for on-device.

**36. moonshine-ai/moonshine** — ★11,260 · MIT code; **all streaming + English models MIT**; legacy Arabic/Japanese/Korean/**Mandarin**/Spanish/Ukrainian/Vietnamese under the **Moonshine AI Community Licence** (commercial allowed only under **US$1 M annual revenue**, registration required, "Powered by Moonshine AI" attribution).
**DECISION: WATCH** — MIT English streaming is a real fallback; Arabic/Mandarin need registration and a revenue cap.

**37. hexgrad/Kokoro-82M** — https://github.com/hexgrad/kokoro
★9,511 · Apache-2.0 code · HF weights **apache-2.0**, **10,536,550 downloads**, last modified 2025-04-10, 82 M params, 1.23 GB storage, 54 voices · sherpa-onnx also exports `kokoro-multi-lang-v1_1` (zh+en, 103 speakers) and `kokoro-en-v0_19` (11 speakers).
Better than our current choice: Apache-2.0 weights + `hi`/`zh`/`es` voices cover 3 of our 7 target languages, and 82 M params fits the on-device budget.
Risks: **no Arabic, no te reo, no Samoan/Tongan**; repo stalled since 2025-08.
**DECISION: KEEP** (see `on-device-stt-tts-vad-kws.md`).

**38. KittenML/KittenTTS** — https://github.com/KittenML/KittenTTS
★16,193 · created 2025-08-05 · last push 2026-10-16 · open issues 138 · licence **Apache-2.0** (code) · sherpa-onnx ships **kitten-nano-en-v0_1-fp16**, **kitten-nano-en-v0_2-fp16**, **kitten-mini-en-v0_1-fp16** ONNX exports.
Also `KittenML/KittenTTS-react-native` ★11, Apache-2.0, created 2026-05-02, pushed 2026-05-14 (a **2026 RN binding**, tiny but real) and `KittenML/KittenTTS-swift` ★16.
Better than our current choice: an English-only but *tiny* on-device TTS with a first-party RN binding — a cleaner alternative to wiring Kokoro into RN ourselves.
Risks: **English only**; HF model card for the weights **not retrievable** (401/gated on the ids tried) → **weights licence UNVERIFIED**; the RN binding is ★11 (immature).
**DECISION: WATCH** — a candidate replacement for the Kokoro ONNX path if our size budget gets tight; the RN binding is too thin to trust yet.

**39. supertone-oss-archive/supertonic** — https://github.com/supertone-oss-archive/supertonic
★13,767 · created 2025-11-18 · pushed 2026-09-09 · HF licence **openrail** ("OpenRAIL-M" style), 20 downloads, **English only**; the repo name contains "archive" — the project was archived by Supertone.
**DECISION: REJECT** — archived; the OpenRAIL-M licence carries use restrictions anyway.

**40. OpenMOSS/MOSS-TTS-Nano** — https://github.com/OpenMOSS/MOSS-TTS-Nano ★4,516 · created **2026-04-10** · pushed 2026-09-06 · licence UNVERIFIED.
**DECISION: WATCH** — 2026 multilingual TTS newcomer; licence must be checked before anything else.

**41. myshell-ai/MeloTTS** — https://github.com/myshell-ai/MeloTTS ★7,682 · MIT (code) · last push 2024-12-24 · multilingual (EN/ES/FR/EN-India/ZH/JP/KR) · sherpa-onnx exports `vits-melo-tts-zh_en`.
Better than our current choice: covers **zh + es + en** with an MIT licence and an existing sherpa-onnx export (so no extra engine).
Risks: weights licence **UNVERIFIED**; no Arabic/Hindi/Pacific.
**DECISION: WATCH** — sherpa-onnx already carries the export; check the weights licence when we need more than Kokoro's voices.

**42. argmaxinc/argmax-oss-swift** — ★6,408 · MIT · pushed 2026-10-11 · iOS CoreML STT/TTS.
**DECISION: WATCH (iOS only)** — see area-1 file.

**43. LibreTranslate/LibreTranslate** — https://github.com/LibreTranslate/LibreTranslate
★17,128 · created 2020-12-19 · last release **v1.9.6 (2026-05-26)** · pushed 2026-10-12 · open issues 128 · licence **AGPL-3.0** · self-hosted offline-capable MT API.
**DECISION: REJECT (copyleft)** — self-hostable as a separate tool only; list under §11.2 clean-room study.

**44. argosopentech/argos-translate** — https://github.com/argosopentech/argos-translate
★6,580 · **MIT** · created 2020-04-07 · pushed 2026-08-08 · open issues 165 · last release **v1.4.0 (2021-08-24)** · offline translation using CTranslate2 + a package index.
Better than our current choice: a **permissive-licence, offline** translation engine for the private server (no per-request cost, no customer data leaving).
Risks: release frozen since 2021; the **translation package licences vary per package** (must check each); the **engine model** packages are typically CC-BY-SA/NC → **UNVERIFIED**.
**DECISION: WATCH** — only if we truly need server-side MT; for 8 UI locales, human translation is cheaper and safer.

**45. fishjar/kiss-translator** — https://github.com/fishjar/kiss-translator ★12,920 · **GPL-3.0** · pushed 2026-10-20.
**46. nextai-translator/nextai-translator** — https://github.com/nextai-translator/nextai-translator ★25,003 · **AGPL-3.0** · last release v0.6.43 (2026-08-23) · pushed 2026-09-03 · open issues 536.
**DECISION: REJECT both (copyleft)** — §11.2 clean-room study only.

**Candidate count: 46 distinct repos/models examined.**

---

## Shortlist (13)

| # | Project | Role | Verdict |
|---|---|---|---|
| 1 | i18next + react-i18next | i18n runtime (MIT) | **ADOPT** |
| 2 | Lingui (`@lingui/cli`) | ICU message format + compile step (MIT) | **ADOPT** |
| 3 | `@formatjs/intl-pluralrules` + `intl-localematcher` | plural rules + BCP-47 negotiation (MIT) | **ADOPT** |
| 4 | `expo-localization` | device locale + RTL (MIT, SDK-58) | **ADOPT** |
| 5 | `react-native-localize` | per-app language override (MIT) | **ADOPT (light)** |
| 6 | `franc` | on-device text LID (MIT) | **ADOPT** |
| 7 | `pemistahl/lingua-py` | server-side accurate LID (Apache-2.0) | **ADOPT (server)** |
| 8 | Qwen3-ASR-1.7B | server multilingual ASR (Apache-2.0 weights) | **ADOPT (candidate)** |
| 9 | Qwen3-TTS-12Hz-1.7B | server multilingual TTS (Apache-2.0 weights) | **ADOPT (candidate)** |
| 10 | Whisper / whisper.cpp | licence-clean multilingual ASR fallback (MIT) | **KEEP** |
| 11 | Tolgee | TMS for 8 locales (Apache-2.0 + EL?) | **WATCH** |
| 12 | Lingo.dev | AI-assisted translation, non-address copy (Apache-2.0) | **WATCH** |
| 13 | ICU4X | size-tunable CLDR data (Unicode-3.0) | **WATCH** |

---

## Deep review — top 5

### 1. i18next / react-i18next — **adopt**
* **Architecture.** Namespace + key lookup, `fallbackLng` chains (`['en-NZ','en-AU','en-GB','en']`), `load`/`save` with any backend (we will use `expo-localization` + `AsyncStorage`/op-sqlite), `interpolation` with `{{var}}` escaping by default (XSS-safe by design), `returnNull`/`returnEmptyString` controls, and a plugin system.
* **API ergonomics (react-i18next).** `useTranslation('stops')`, `<Trans i18nKey="stop.delivered" />`, `t('count', { count })` with pluralisation, `t('key', { context: 'offline' })`. This maps directly onto our design-system rule "copy: plain NZ English, short, human" — copy lives in JSON, not in components.
* **Maintenance.** v26.5.3 published 2026-10-19; releases on 2026-10-19, 10-17, 10-17 (multiple per day); **1 open issue**; 17/20 of the last 20 commits by `adrai`. The "1 open issue" figure is extraordinary and suggests either excellent triage or issue suppression — **worth watching, not a red flag on its own**.
* **Risk: Hermes Intl.** i18next's formatting leans on `Intl.PluralRules`/`Intl.NumberFormat`/`Intl.RelativeTimeFormat`. Expo's Hermes ships `Intl` only when `hermes-engine` is built with intl support (`expo` config `jsEngine`/`intl`) — **UNVERIFIED for our build**; if Intl is absent we must either enable it or polyfill with `@formatjs/intl-pluralrules` + `@formatjs/intl-numberformat` (both MIT — which is exactly why we adopt them).
* **Bundle size.** Not measured → **UNVERIFIED**; must be measured against the 80 MB APK budget.
* **Verdict: ADOPT** — the de-facto standard, MIT, tiny, no native code, and it composes with ICU message formats.

### 2. Lingui — **adopt the compile step**
* **Architecture.** Message *descriptors* in a macro/ICU form are **compiled** by `@lingui/cli` into optimised JavaScript functions. The runtime therefore does **no message parsing** — the win matters on Hermes, where `Intl.MessageFormat` parsing is expensive at render time (and our screens render while driving).
* **Code quality.** v6.10.0 (2026-10-16); two active maintainers in the last 20 commits; MIT; `@lingui/cli` 6.10.0 on npm (2026-10-16). Catalogues are compiled to JSON at build time, so missing keys fail the build → fits our "no dead copy" standard.
* **Extensibility.** Works with i18next (`@lingui/i18next`) and with its own runtime; ICU plural/select syntax.
* **Risk.** One more build step and one more toolchain; the community is smaller than i18next.
* **Verdict: ADOPT** — message format + compile step; pair with i18next as the runtime, or use Lingui standalone.

### 3. Expo Localization — **adopt**
* **What it gives.** `getLocales()` (the full ordered device locale list with `languageCode`, `regionCode`, `direction`/`textDirection`, `calendar`, `numberingSystem`), `getCalendars()`, `getNumberingSystems()`; and `useLocales()` for React. The `direction` field is how we drive `I18nManager.forceRTL` for the Arabic UI required by V4 §5.
* **Fidelity.** npm `expo-localization` **58.0.5**, modified 2026-10-19 — exactly our SDK (58.0.14) line. MIT.
* **Cost.** Zero extra native work in an Expo app (it is already an Expo module).
* **Gap.** It does **not** provide plural rules, number formatting or message formatting → that is why we also take `@formatjs/intl-pluralrules` and a message layer.
* **Verdict: ADOPT** — the single source of truth for "which language is the driver using right now".

### 4. lingua-py — **adopt (server)**
* **Architecture.** Statistical n-gram models per language, with a **low-accuracy mode** (a single fast pass over a few characters) and a high-accuracy mode, plus `is_language_supported`, `filter_languages`, and a **`minimum_relative_distance`** threshold so it can say "not sure" instead of guessing — exactly what a code-switching utterance needs.
* **Accuracy.** The project claims the highest accuracy for short texts; the claim is the vendor's, and we must verify it on our own utterances.
* **Cost.** Python; models are downloaded per language → the private `services/voice` holds them, not the phone.
* **Risk.** 75+ languages × model size on the server; and text-based LID needs the transcript, so it adds a round trip after STT.
* **Verdict: ADOPT (server)** — combined with `franc` on-device: cheap first pass on the phone, authoritative decision on the server.

### 5. Qwen3-ASR / Qwen3-TTS — **the licence-clean answer to OmniVoice**
* **Why this is the deep review.** OmniVoice (D22) is the only engine covering all our languages, and its weights are **CC-BY-NC** → not shippable. Qwen3-ASR (Apache-2.0, 1.2 M downloads) and Qwen3-TTS (Apache-2.0, 2.07 M downloads) are the leading permissively-licensed multilingual candidates.
* **Licence, verified.** `Qwen/Qwen3-ASR-1.7B` → `apache-2.0`, last modified 2026-01-30. `Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice` → `apache-2.0`, last modified 2026-01-29. Repos: `QwenLM/Qwen3-ASR` (Apache-2.0, ★3,737) and `QwenLM/Qwen3-TTS` (Apache-2.0, ★13,881).
* **What it does better than OmniVoice commercially.** It is **redistributable in a closed-source commercial product** — that is the whole point. OmniVoice is not.
* **What it may do worse.** Per-language coverage for **mi / sm / to / pa** is **UNVERIFIED**; both models are 1.7 B params → GPU-server cost; Qwen3-TTS's repo push cadence has slowed (last push 2026-03-17).
* **Verdict: ADOPT as candidates**, subject to the language-coverage table being filled from the model cards and a scored run on our eval set. This is the concrete fallback if Boson/Meta will not license OmniVoice commercially.

---

## Benchmarks

**Status: UNVERIFIED — neither the dataset nor the harness exists.**

* `docs/squads/voice/eval/` — **absent** (checked 2026-10-20).
* `docs/squads/voice/benchmarks/` — contains **only `README.md`**.

Therefore **no language-detection accuracy, no code-switching rate, no per-language WER, and no translation-quality number has been measured by us.** All figures below are vendor claims.

### The exact set that must be built first

**A. `docs/squads/voice/eval/` — the multilingual utterance set.** Same table as in `on-device-stt-tts-vad-kws.md`, with the language quotas: en-NZ 120 · te reo Māori place names 60 · Arabic 40 · Hindi/Punjabi 40 · Mandarin 40 · Samoan/Tongan 40 · Spanish 40 · numbers & self-corrections 40 · silence/non-speech 40 (**≥ 500 utterances**). Add a `code_switch` flag and a `script` column (Latin / Arabic / Devanagari / Gurmukhi / Han / Samoan/Tongan orthography).

**B. A dedicated **code-switching** sub-set (≥ 120 utterances) — the hardest case and the one nobody benchmarks:
* en ↔ te reo place names mid-sentence ("take it to **Hāwera** / 14 **Rimutaka** Street, **Ōhārau**")
* en ↔ Arabic ("send it to my uncle in **حلب**" inside an English sentence)
* Hinglish ("deliver **kar** do")
* en ↔ Mandarin place names
Each with a `gold_script_switch_position` so we can score *where* the model switched, not only whether it got the words right.

**C. Per-language metrics to publish** (same device profile: CI emulator + one mid-range Android):

| Metric | Definition | Target |
|---|---|---|
| WER per language per noise level | as V4 §10.1 | ≤ 8 % en-NZ quiet, ≤ 15 % van noise |
| LID accuracy (text-based, on-device) | franc, restricted to our 8 locales | ≥ 95 % (proposed; **UNVERIFIED target**) |
| LID accuracy (server) | lingua-py | ≥ 98 % (proposed; **UNVERIFIED target**) |
| Code-switch WER | utterances with a switch | ≤ 20 % (proposed; **UNVERIFIED target**) |
| UI-locale correctness | fraction of screens rendered in the driver's chosen locale | 100 % (RTL for `ar`) |
| Plural/date/number correctness | golden screenshot per locale | 100 % |
| Translation review effort | human minutes per 1,000 strings × 8 locales | tracked, not a gate |

**D. An i18n golden set**: for each of the 8 locales, a Maestro screenshot of the 5 key screens (Driving night, Dictation report, Today's list, Stop detail, Settings) with the strings that must differ (dates, numbers, RTL mirroring) — this is the visual-regression baseline required by V4 §5.

### What must be benchmarked

| Rank | Candidate | Benchmark | Status |
|---|---|---|---|
| 1 | **Qwen3-ASR-1.7B** | WER per language on our 500-utterance set; code-switch WER on the 120-utterance sub-set; latency on our GPU profile | **UNVERIFIED — blocked on the eval set; language coverage list also UNVERIFIED** |
| 2 | **Qwen3-TTS-12Hz-1.7B** | synthesise our spoken prompts (≤ 8 words) in ar/hi/zh/es/sm/to/mi; intelligibility (MOS proxy) and generation latency | **UNVERIFIED — blocked on the eval set** |
| 3 | **franc (on-device) vs lingua-py (server)** | LID accuracy on the 8-locale-restricted set; how often the server LID overrides the on-device LID (this is the code-switch arbitration metric) | **UNVERIFIED — blocked on the eval set** |

**Published to `docs/squads/voice/benchmarks/`** (or a new `docs/squads/voice/benchmarks/i18n/`): harness source, per-utterance CSV with predicted language/script and transcript, device profile, commit SHA, exact model versions and SHA-256 of every weight file.

---

## What's new in 2026 (and what we adopt)

1. **Permissively-licensed multilingual ASR/TTS arrives (Apache-2.0 Qwen3-ASR / Qwen3-TTS, >1.2 M and >2.0 M HF downloads)** — *adopt*: this is the licence-clean replacement for OmniVoice's language coverage, and it removes the single biggest legal risk in the voice stack.
2. **The i18n runtime splits into "runtime" + "compile step"** (Lingui's compiled ICU messages) — *adopt*: keep Hermes off the message-parsing path; this is a real 60 fps driving-UI win.
3. **Language ID becomes a first-class product feature** (SenseVoice's LID; Qwen3-ASR's multi-language ASR; Whisper's `language` auto-detect) — *adopt*: two-tier LID (franc on device, lingua on server) with an explicit "not sure" outcome that falls back to the driver's chosen locale.
4. **Per-app language override becomes expected** (react-native-localize, and OS-level per-app languages on Android 13+) — *adopt*: a driver can pick "Te reo" for a shift while the OS is en-NZ.
5. **Translation tooling moves to AI-assisted with memory/glossary** (Lingo.dev, Tolgee) — *adopt (bounded)*: first-pass only, never for addresses; addresses come from LINZ and are never machine-translated.
6. **Data-driven CLDR (ICU4X) becomes viable for size-constrained clients** — *watch*: the right long-term answer for shipping only the locale data we need.

---

## Decision

**ADOPT / KEEP**
1. **ADOPT `i18next` + `react-i18next`** (MIT) as the i18n runtime.
2. **ADOPT Lingui's ICU message format + `@lingui/cli` compile step** (MIT) so messages are compiled, not parsed at render time.
3. **ADOPT `@formatjs/intl-pluralrules` + `@formatjs/intl-localematcher`** (MIT) for plural categories and BCP-47 locale negotiation — and as the Hermes-Intl fallback.
4. **ADOPT `expo-localization@58.0.5`** (MIT, SDK-58 parity) as the device-locale + RTL source of truth, and **`react-native-localize@3.7.2`** (MIT) only for the per-app language override.
5. **ADOPT `franc` (MIT)** for on-device text-based LID restricted to our locale set, and **`lingua-py` (Apache-2.0)** in `services/voice` for authoritative LID + code-switch arbitration.
6. **ADOPT Qwen3-ASR-1.7B and Qwen3-TTS-12Hz-1.7B (Apache-2.0 weights) as the leading candidates** for the private multilingual server service — they are the licence-clean path that does not depend on OmniVoice.
7. **KEEP Whisper/whisper.cpp (MIT)** as the licence-clean multilingual ASR fallback and the on-device multilingual option.

**WATCH**: Tolgee (licence boundary with the Enterprise Licence), Lingo.dev (AI translation quality), ICU4X (size-tunable CLDR, but Unicode-3.0 licence and a Rust/WASM bridge), `lingua-rs`/`lingua` (Kotlin) and `whatlang-rs` (on-device LID alternatives), `nvidia/canary-1b-v2` (es/en only, cc-by-4.0), `QwenAudio/SenseVoice` (LID idea; weights licence "other"), MeloTTS, KittenTTS + its RN binding, MOSS-TTS-Nano, `argosopentech/argos-translate` (MIT engine but per-package model licences to check), supertonic (archived).

**REJECT**: `react-native-localize` *as a replacement* for expo-localization (we adopt it only for the per-app override), `jsverse/transloco` (Angular), `amannn/next-intl` (Next.js — dashboard-only), `lokalise/i18n-ally` (IDE), `facebook/fbt` (stale), `globalizejs/globalize` (legacy), `unicode-org/icu` ICU4C (too heavy), `shuyo/language-detection` (dead), `Mimino666/langdetect` (stale), `google/cld3` (archived), `supertone-oss-archive/supertonic` (archived + restrictive weights licence).

**REJECT (non-commercial / copyleft weights — never shippable):** `facebook/mms-tts-*` (cc-by-nc-4.0), `facebook/nllb-200-distilled-600M` (cc-by-nc-4.0), `facebook/xls-r` (cc-by-nc-4.0), `k2-fsa/OmniVoice` **weights** (CC-BY-NC), Moonshine legacy non-English models (Community Licence, US$1 M revenue cap), `TEN-framework/TEN-VAD` weights (extra Agora field-of-use restriction).

**Clean-room study candidates (§11.2 — study only, never quote code):** `WeblateOrg/weblate` (GPL-3.0), `LibreTranslate/LibreTranslate` (AGPL-3.0), `fishjar/kiss-translator` (GPL-3.0), `nextai-translator/nextai-translator` (AGPL-3.0).

## Risks & fallbacks

| Risk | Impact | Mitigation / fallback |
|---|---|---|
| **No single permissively-licensed model covers te reo Māori / Samoan / Tongan** | Our hardest requirement is unlicensable off-the-shelf | Treat those three as **NZ-specific fine-tuning / adaptation** work on top of an Apache/MIT base (sherpa-onnx hotwords + a fine-tuned Parakeet/Whisper adapter), with the consent-based data policy from V4 §10.1. Fallback: accept English-only accuracy for those languages and be explicit in the UI |
| **Hermes may not ship `Intl`** | Plural/date/number formatting silently degrades | Polyfill with `@formatjs/intl-pluralrules` + `@formatjs/intl-numberformat` (MIT); assert in a CI unit test that plurals resolve for `en-NZ` and `ar` |
| **Translation of NZ addresses** | Wrong place names → wrong deliveries | **Never machine-translate addresses.** LINZ-derived strings are data, not copy. Gate in code review + a lint rule |
| **Qwen3 per-language coverage unverified** | We pick an engine that silently lacks `mi/sm/to` | Read the model cards and run the language-coverage table *before* committing; keep Whisper (MIT) as the fallback |
| **i18next single-maintainer (adrai)** | A stall or a breaking 27.x | Pin exact versions; our i18n calls are behind a thin `useT()` wrapper in `packages/` so a swap to Lingui's runtime or FormatJS is a one-file change |
| **8 locales × 4 frameworks of copy** | Copy drift between app, dashboard and web | One source of truth in `packages/`, one catalogue file, CI check that every key exists in every locale |
| **RTL mirroring (Arabic)** | Layout breakage in a driving UI | `I18nManager.forceRTL` + Maestro golden screenshots per locale; `expo-localization`'s `textDirection` is the trigger |
| **TMS licence ambiguity (Tolgee Apache-2.0 + EL)** | Legal exposure if we modify and expose it | Do not self-host until the EL boundary is read; default to a hosted TMS with our own catalogue export |

## UNVERIFIED items (explicit)

1. **6-month star trend for every candidate** — the GitHub API does not expose star history to this token; all counts are the 2026-10-20 snapshot. **UNVERIFIED.**
2. **Median maintainer response time / closed-issue ratio** — only open-issue counts sampled. **UNVERIFIED.**
3. **Per-language coverage of `Qwen/Qwen3-ASR-1.7B` and `Qwen/Qwen3-TTS-12Hz-1.7B`** — the HF API returned the licence and download counts but the per-language lists were not read. **UNVERIFIED — must be filled from the model cards.**
4. **`Qwen/Qwen3-ASR-Flash` licence** — HF returned **HTTP 401 (gated)**. **UNVERIFIED.**
5. **`KittenML/KittenTTS` HF weights licence** — the model ids tried (`KittenML/KittenTTS-0.1`, `…-Nano-0.2`, `…-nl`) all returned errors; only the *repo* licence (Apache-2.0) is verified. **UNVERIFIED.**
6. **Licence of**: `OpenMOSS/MOSS-TTS-Nano`, `OpenBMB/VoxCPM`, `myshell-ai/MeloTTS` weights, `argos-translate` **translation packages** (each package carries its own licence), `tolgee/tolgee-platform` (Apache-2.0 vs Enterprise Licence split), `formatjs/formatjs` (monorepo, per-package licences verified for the ones we would use), `unicode-org/icu4x` (Unicode License v3 — permissive but outside our preferred four), and `generaltranslation/gt`. **UNVERIFIED unless stated above.**
7. **Hermes `Intl` availability in our Expo SDK 58 build** — **UNVERIFIED**; must be asserted in a CI test.
8. **Bundle sizes** of `i18next` + `react-i18next` + Lingui runtime + `@formatjs/intl-*` + the locale JSON — **UNVERIFIED**; must be measured against the 80 MB APK budget.
9. **New Architecture / Expo SDK 58 / Android API 34 support** for `expo-localization` (implied by SDK 58 parity — **verified by version**, not by an explicit statement), `react-native-localize` (**UNVERIFIED**), `lingua` (Kotlin, **UNVERIFIED**), `franc` (pure JS, n/a), `KittenML/KittenTTS-react-native` (**UNVERIFIED** — ★11, 2026-05).
10. **CI status / test coverage per repo** — only the badges visible in the READMEs I read were recorded (i18next: not read; Lingui: not read; Tolgee: `test.yml` badge present; ICU4X: `build-test.yml` + Coveralls + Codecov badges present). **UNVERIFIED otherwise.**
11. **Production users** — no i18n project in this area publishes a verifiable production user count. **UNVERIFIED.**
