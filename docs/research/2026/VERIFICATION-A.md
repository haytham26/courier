# VERIFICATION-A — verifier pass over the 2026 research files

**Date of verification:** 2026-10-21 · **Role:** QA / verifier (V4 §12.3) · **Scope:** the six research files listed below, all dated 2026-10-20

---

## 1. Method

- Each of the six files was read in full and its **evidence cards counted** (the numbered card rows or numbered card entries that carry stars, dates, licence and decision). The counts are the files' own card counts, not the shortlist or deep-review counts.
- From each file I picked a **sample spread across the whole file** (not only the first cards), sized at **at least 20 % of that file's cards, rounded up, minimum 6 per file**: 9, 8, 8, 7, 7 and 8 cards respectively.
- Every sampled card was then re-checked **against its primary source**, not against the research file. Sources used:
  - GitHub REST API: the public `api.github.com` for the first pass, then the repo's own `scripts/gh.ps1` (token read from `.env.local`, never printed) for the bulk of the sampling — `repos/{owner}/{repo}`, `repos/{owner}/{repo}/releases`, `repos/{owner}/{repo}/security-advisories`, `repos/{owner}/{repo}/commits`, `repos/{owner}/{repo}/contents`, and code search.
  - npm registry (`registry.npmjs.org`), npm downloads API (`api.npmjs.org/downloads/point/last-week|last-month`).
  - PyPI JSON API (`pypi.org/pypi/{package}/json`).
  - OSV query API (`api.osv.dev/v1/query`, `api.osv.dev/v1/vulns/{GHSA}`).
  - Hugging Face model API and model-card files (`huggingface.co/api/models/...`, `huggingface.co/{model}/raw/main/...`).
  - `raw.githubusercontent.com` for the licence files, READMEs and licence paragraphs the cards quote.
- **A card passes** when every claim I checked matches the source: the repository exists, the star count is within 20 % of the stated figure, the last release or last commit falls in the stated window, the licence is the licence named, and the file, function, commit, package or quoted sentence the card names really exists and says what the card says.
- **A card fails** when the source contradicts the card: a number off by more than 20 %, a date outside the stated window, the wrong licence, or a named artefact that does not exist.
- **A check that could not be run is "not verifiable"**, never a pass. Nothing was inferred or estimated: every figure quoted below was read from a live source on 2026-10-21.
- **One timing caveat, stated up front:** the research snapshot is 2026-10-20 and this pass ran on 2026-10-21, so several cards name the release that was current yesterday. Where a newer release landed overnight I have recorded it in "source says" and kept the verdict at pass, because the card's stated release genuinely exists at the stated date. I did not fail any card for a release that landed after the snapshot.
- I did **not** modify any research file, and I ran no git command.

---

## 2. Coverage

| File | Evidence cards in file | Cards checked | Share checked | Pass | Fail |
|---|---|---|---|---|---|
| `react-native-design-systems-motion.md` | 44 | 9 | 20.5 % | 9 | 0 |
| `on-device-stt-tts-vad-kws.md` | 38 | 8 | 21.1 % | 7 | 1 |
| `voice-agent-frameworks.md` | 40 | 8 | 20.0 % | 7 | 1 |
| `llm-tool-calling.md` | 33 | 7 | 21.2 % | 7 | 0 |
| `auth-better-auth-ecosystem.md` | 31 | 7 | 22.6 % | 6 | 1 |
| `payments-subscriptions.md` | 38 | 8 | 21.1 % | 6 | 2 |
| **Total** | **224** | **47** | **21.0 %** | **42** | **5** |

Every file clears the 20 % floor and the six-card minimum.

---

## 3. Results

| File | Card | Claim (as written in the card) | Source says (2026-10-21) | Verdict |
|---|---|---|---|---|
| react-native-design-systems-motion | #1 `tamagui/tamagui` | ★14,265 · created 2020-10-16 · pushed 2026-10-20 · last release v3.1.0 @2026-10-20 · MIT · size 928,352 KB | stars 14,267 · created 2020-10-16 · pushed 2026-10-21 · `v3.1.0` published 2026-10-20 (a `v3.1.1` followed at 2026-10-21 03:06) · MIT · size 928,004 KB | **PASS** |
| react-native-design-systems-motion | #5 `heroui-inc/heroui-native` | ★3,691 · created 2025-06-03 · pushed 2026-10-20 · last release v1.0.10 @2026-09-21 · Apache-2.0 · REJECT (NativeWind) | stars 3,692 · created 2025-06-03 · pushed 2026-10-20 · `v1.0.10` published 2026-09-21 (`v1.0.11` published later on 2026-10-20) · Apache-2.0 · repo topics include `nativewind`, so the REJECT reason holds | **PASS** |
| react-native-design-systems-motion | #16 `software-mansion/react-native-gesture-handler` | ★6,793 · MIT · last release v3.4.0 @2026-10-16 · commit "Bump to expo sdk 58 (#4612)" 2026-10-19 · RN 0.88 on 2026-10-16 | stars 6,793 · MIT · `v3.4.0` published 2026-10-16 · commit "Bump to `expo` sdk 58 (#4612)" dated 2026-10-19T14:13Z · release notes contain "Bump to React Native 0.88 (#4517)" and the `pressOutAfterAnimation` → `immediatePressOut` rename | **PASS** |
| react-native-design-systems-motion | #24 `wcandillon/react-native-skia` | ★8,744 · created 2021-11-08 · pushed 2026-10-20 · last release v3.7.1 @2026-10-19 · MIT | stars 8,745 · created 2021-11-08 · pushed 2026-10-20 · `v3.7.1` published 2026-10-19 (`v3.7.2` published 2026-10-20) · MIT | **PASS** |
| react-native-design-systems-motion | #32 `oblador/react-native-vector-icons` | ★17,917 · created 2015-05-15 · pushed 2026-10-19 · last release "@react-native-vector-icons/zocial@14.0.0 @2026-10-19" · MIT · 670,758 dl/30 d for `material-design-icons` | stars 17,918 · created 2015-05-15 · pushed 2026-10-19 · MIT · npm `@react-native-vector-icons/zocial` 14.0.0 published 2026-10-19 and `@react-native-vector-icons/material-design-icons` 14.0.0 published 2026-10-19 (the repository's own last GitHub release is the sibling `generator-react-native-vector-icons@14.0.0`, same date) | **PASS** |
| react-native-design-systems-motion | #34 `expo/google-fonts` | ★945 · created 2020-05-02 · pushed 2026-10-12 · no GitHub releases · MIT (code) · size 8,468,143 KB · `@expo-google-fonts/figtree` 0.4.1, "MIT AND OFL-1.1", 257,396 dl/30 d | stars 945 · created 2020-05-02 · pushed 2026-10-12 · `releases` endpoint returns `[]` (no releases) · MIT · size 8,468,143 KB · npm `@expo-google-fonts/figtree` 0.4.1 with `"license": "MIT AND OFL-1.1"` · downloads last month 257,396 (window 2026-09-19 → 2026-10-18) | **PASS** |
| react-native-design-systems-motion | #38 `Shopify/flash-list` | ★7,243 · created 2021-12-20 · pushed 2026-10-01 · last release v2.3.3 @2026-10-01 · MIT · size 216,637 KB | stars 7,243 · created 2021-12-20 · pushed 2026-10-01 · `v2.3.3` published 2026-10-01 · MIT · size 216,637 KB | **PASS** |
| react-native-design-systems-motion | #40 `margelo/react-native-mmkv` | ★8,518 · created 2021-02-24 · pushed 2026-10-08 · last release v4.3.2 @2026-06-22 · MIT · adv 1: GHSA-4jh3-6jhv-2mgp, medium, `<v2.11.0`, sensitive data in log file | stars 8,519 · created 2021-02-24 · pushed 2026-10-08 · `v4.3.2` published 2026-06-22 · MIT · OSV: exactly 1 advisory for the npm package — GHSA-4jh3-6jhv-2mgp, severity MODERATE, "Insertion of Sensitive Information into Log File", introduced 0 / **fixed 2.11.0** | **PASS** |
| react-native-design-systems-motion | #43 `margelo/nitro` | ★1,967 · created 2024-06-12 · pushed 2026-10-20 · last release v0.37.1 @2026-08-27 · MIT | stars 1,967 · created 2024-06-12 · pushed 2026-10-21 · `v0.37.1` published 2026-08-27 (the repository also publishes `v0.37.2-nightly.*` prereleases, which is what the card's "15+ releases/6 m" counts) · MIT | **PASS** |
| on-device-stt-tts-vad-kws | #1 `k2-fsa/sherpa-onnx` | ★15,394 · created 2022-09-01 · last release v1.13.8 (2026-09-10) · pushed 2026-10-20 · open issues 667 · **forks 2,234** · Apache-2.0 | stars 15,411 · created 2022-09-01 · `v1.13.8` published 2026-09-10 · pushed 2026-10-21 · open issues 640 · **forks 1,804** · Apache-2.0 | **FAIL** — forks 2,234 vs 1,804 (23.9 % over); the same figure is also on card #7 |
| on-device-stt-tts-vad-kws | #3 `XDcobra/react-native-sherpa-onnx` | ★41 · created 2026-01-25 · last release v0.4.4 (2026-09-08) · pushed 2026-10-18 · open issues 6 · forks 7 · MIT · npm 0.4.4 MIT | stars 41 · created 2026-01-25 · `v0.4.4` published 2026-09-08 · pushed 2026-10-18 · open issues 6 · forks 7 · MIT · npm `react-native-sherpa-onnx` 0.4.4, MIT, modified 2026-09-08 | **PASS** |
| on-device-stt-tts-vad-kws | #4 `snakers4/silero-vad` | ★10,477 · created 2020-11-23 · last release v6.2.3 (2026-09-23) · pushed 2026-09-29 · MIT (Silero Team, 2020-present); README badge says "CC BY-NC 4.0" | stars 10,489 · created 2020-11-23 · `v6.2.3` published 2026-09-23 · pushed 2026-09-29 · `LICENSE` is "MIT License / Copyright (c) 2020-present Silero Team" · README badge reads `[![License: CC BY-NC 4.0](.../License-MIT-lightgrey.svg)](.../LICENSE)` — the badge text and the licence file really do contradict each other | **PASS** |
| on-device-stt-tts-vad-kws | #5 `dscripka/openWakeWord` | ★2,858 · created 2022-05-28 · last release v0.6.0 (2024-02-11) · pushed 2025-12-30 · code Apache-2.0; shipped models CC BY-NC-SA 4.0 | stars 2,859 · created 2022-05-28 · `v0.6.0` published 2024-02-11 · pushed 2025-12-30 · Apache-2.0 · README: "All of the code in this repository is licensed under the **Apache 2.0** license. All of the included pre-trained models are licensed under the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International] license" | **PASS** |
| on-device-stt-tts-vad-kws | #7 `k2-fsa/OmniVoice` | ★15,134 · created 2026-03-31 · last release 0.2.1 (2026-07-16) · pushed 2026-10-19 · HF downloads 1,799,588 · 3.27 GB storage · model card: "The pre-trained model is licensed under the CC-BY-NC …"; `audio_tokenizer/` weights under the Boson Higgs Audio 2 Community Licence | stars 15,310 · created 2026-03-31 · `0.2.1` published 2026-07-16 · pushed 2026-10-19 · forks 2,259 · HF downloads 1,873,090 · lastModified 2026-07-03 · storage 3,267,433,726 bytes (3.27 GB) · no `license:` tag on the HF card · model card README says verbatim "Our code is released under the Apache 2.0 License. The pre-trained model is licensed under the CC-BY-NC due to constraints from its training data (e.g., Emilia)." · `audio_tokenizer/LICENSE` on Hugging Face is the "BOSON HIGGS AUDIO 2 COMMUNITY LICENSE AGREEMENT" | **PASS** (see note on the path in §4) |
| on-device-stt-tts-vad-kws | #8 `hexgrad/kokoro` | ★9,511 · created 2025-01-10 · **no GitHub releases** · pushed 2025-08-06 · open issues 213 · HF Kokoro-82M 10,536,550 downloads, licence apache-2.0, 82 M params, 1.23 GB | stars 9,540 · created 2025-01-10 · `releases` endpoint returns `[]` (no releases) · pushed 2025-08-06 · open issues 213 · Apache-2.0 · HF `hexgrad/Kokoro-82M`: downloads 10,536,550, `license:apache-2.0`, storage 1,234,555,949 bytes (1.23 GB) | **PASS** |
| on-device-stt-tts-vad-kws | #11 `ggml-org/whisper.cpp` | ★54,499 · created 2022-09-25 · last release v1.9.5 (2026-10-06) · pushed 2026-10-19 · open issues 353 · MIT | stars 54,521 · created 2022-09-25 · `v1.9.5` published 2026-10-06 · pushed 2026-10-19 · open issues 354 · MIT | **PASS** |
| on-device-stt-tts-vad-kws | #13 `nvidia/parakeet-tdt-0.6b-v2` (Hugging Face) | 194,030 downloads · licence CC-BY-4.0 · last modified 2026-06-29 · English only · WER LibriSpeech clean 1.69 %, other 3.19 %, GigaSpeech 9.74 %, SPGI 2.17 % | downloads 194,030 · `license:cc-by-4.0` · lastModified 2026-06-29 · `language: en` only · model-index WER: LibriSpeech clean 1.69, other 3.19, GigaSpeech 9.74, SPGI 2.17 — all four exact | **PASS** |
| voice-agent-frameworks | #1 `pipecat-ai/pipecat` | ★16,637 · created 2023-12-27 · last release v1.13.0 (2026-10-19) · BSD-2-Clause · open issues 415 · official client SDKs for JavaScript, React, React Native, Swift, Kotlin, C++, ESP32 · npm RN transports `@pipecat-ai/react-native-daily-transport` 0.3.0 (2026-04-22) and `@pipecat-ai/react-native-small-webrtc-transport` 0.5.7 (2026-05-05) | stars 16,668 · created 2023-12-27 · `v1.13.0` published 2026-10-19 (PyPI `pipecat-ai` 1.13.0 uploaded 2026-10-19) · BSD-2-Clause · open issues 419 · README "Client SDKs" row lists JavaScript, React, **React Native**, Swift, Kotlin, C++ and ESP32 · npm `@pipecat-ai/react-native-daily-transport` → **no 0.3.0** (0.x line ends 0.3.5 / 2025-05-08; current 1.8.0 / 2026-06-22) · npm `@pipecat-ai/react-native-small-webrtc-transport` → **no 0.5.7** (0.x line absent entirely; 1.4.0 / 2025-11-06 … 1.8.0 / 2026-06-22) | **FAIL** — two npm versions cited under this card do not exist |
| voice-agent-frameworks | #2 `livekit/agents` | ★14,855 · created 2023-10-19 · last release livekit-agents@1.8.8 (2026-10-15) · open issues 802 · Apache-2.0 | stars 14,870 · created 2023-10-19 · `livekit-agents@1.8.8` published 2026-10-15 · open issues 793 · Apache-2.0 | **PASS** |
| voice-agent-frameworks | #3 `huggingface/speech-to-speech` | ★13,518 · created 2024-08-07 · last release v1.0.0 (2026-09-06) · Apache-2.0 · default pipeline "Silero VAD → Parakeet TDT → Qwen3.5-4B → Qwen3-TTS" · OpenAI Realtime protocol over WebSocket and WebRTC · runs in production for "thousands of Reachy Mini robots" | stars 13,510 · created 2024-08-07 · `v1.0.0` published 2026-09-06 · Apache-2.0 · README: "The default pipeline is **Silero VAD → Parakeet TDT → Qwen3.5-4B → Qwen3-TTS**, and every stage is swappable. The server speaks the **OpenAI Realtime protocol** over WebSocket and WebRTC" · README: "This pipeline runs in production as the conversation backend for thousands of Reachy Mini robots" | **PASS** |
| voice-agent-frameworks | #5 `QwenAudio/qwen-audio-agent` | ★2,953 · created 2026-07-27 · last release v2.0.1 (2026-09-26) · pushed 2026-10-20 · open issues 11 · Apache-2.0 | stars 2,962 · created 2026-07-27 · `v2.0.1` published 2026-09-26 · pushed 2026-10-20 · open issues 11 · Apache-2.0 | **PASS** |
| voice-agent-frameworks | #10 `OpenVoiceOS/ovos-core` | ★297 · created 2021-02-18 · last release 3.7.4a1 (2026-10-08) · pushed 2026-10-08 · open issues 17 · Apache-2.0 | stars 297 · created 2021-02-18 · `3.7.4a1` published 2026-10-08 (prerelease) · pushed 2026-10-08 · open issues 17 · Apache-2.0 | **PASS** |
| voice-agent-frameworks | #29 `openai/openai-agents-js` | ★3,930 · created 2025-05-31 · last release @openai/agents@0.20.0 (2026-10-08) · open issues 15 · MIT · npm `@openai/agents` 0.20.0 (MIT, 2026-10-08) | stars 3,932 · created 2025-05-31 · MIT · open issues 14 · npm `@openai/agents` 0.20.0 published 2026-10-08 (a 0.21.0 followed 2026-10-20 22:14) · `@openai/agents-core` 0.21.0 MIT | **PASS** |
| voice-agent-frameworks | #34 `pipecat-ai/pipecat-flows` | ★627 · created 2024-11-16 · last release v1.4.0 (2026-07-05) · pushed 2026-07-05 · BSD-2-Clause · **archived** | stars 627 · created 2024-11-16 · `v1.4.0` published 2026-07-05 · pushed 2026-07-05 · BSD-2-Clause · `archived: true` | **PASS** |
| voice-agent-frameworks | #37 `pipecat-ai/whisker` | ★136 · created 2025-08-14 · pushed 2026-10-19 · a real-time Pipecat debugger | stars 136 · created 2025-08-14 · pushed 2026-10-19 · BSD-2-Clause (the card does not state a licence) | **PASS** |
| llm-tool-calling | #1 `modelcontextprotocol/python-sdk` | ★24,624 · created 2024-09-24 · last release v2.3.0 (2026-10-02) · pushed 2026-10-17 · open issues 361 · MIT | stars 24,628 · created 2024-09-24 · `v2.3.0` published 2026-10-02 · pushed 2026-10-17 · open issues 361 · MIT · PyPI `mcp` 2.3.0, MIT, uploaded 2026-10-02 | **PASS** |
| llm-tool-calling | #3 `pydantic/pydantic-ai` | ★20,748 · created 2024-06-21 · last release v2.58.0 (2026-10-20) · MIT · open issues 1,471 · README badge "coverage 100 %" · evals grade "tool-call trajectories" | stars 20,758 · created 2024-06-21 · `v2.58.0` published 2026-10-20 · MIT · open issues 1,566 · README badge `coverage-100%` · README: "a typed, extensible agent loop with every model a string swap away" and "**Pydantic Evals** grades an agent's final outputs and **tool-call trajectories**, on datasets" · PyPI `pydantic-ai` 2.58.0 uploaded 2026-10-20 | **PASS** |
| llm-tool-calling | #4 `vercel/ai` | ★27,412 · created 2023-05-23 · last release ai@7.0.146 (2026-10-20) · repo licence NOASSERTION · npm `ai` 7.0.146 Apache-2.0 and `@ai-sdk/openai` 4.0.98 Apache-2.0 | stars 27,420 · created 2023-05-23 · repo licence NOASSERTION ✓ · npm `ai` 7.0.146 published 2026-10-20 (latest now 7.0.148) with licence Apache-2.0 · npm `@ai-sdk/openai` 4.0.98 Apache-2.0 (latest now 4.0.99) | **PASS** |
| llm-tool-calling | #7 `langchain-ai/langgraph` | ★43,560 · created 2023-08-09 · last release cli==0.4.37 (2026-10-19) · open issues 497 · MIT | stars 43,606 · created 2023-08-09 · `cli==0.4.37` published 2026-10-19 · open issues 508 · MIT | **PASS** |
| llm-tool-calling | #10 `microsoft/autogen` | ★61,496 · created 2023-08-18 · last push 2026-10-16 · open issues 1,122 · **GitHub reports the repo licence as `CC-BY-4.0`** | stars 61,504 · created 2023-08-18 · pushed 2026-10-16 · open issues 1,121 · `license.spdx_id` = **CC-BY-4.0** ✓ — the card's "the code licence is UNVERIFIED until the raw file is read" caveat stands | **PASS** |
| llm-tool-calling | #12 `huggingface/smolagents` | ★29,940 · created 2024-12-05 · last release v1.26.0 (2026-05-29) · pushed 2026-10-06 · open issues 974 · Apache-2.0 | stars 29,954 · created 2024-12-05 · `v1.26.0` published 2026-05-29 · pushed 2026-10-06 · open issues 981 · Apache-2.0 | **PASS** |
| llm-tool-calling | #17 `HKUDS/nanobot` | ★49,209 · created 2026-02-01 · last release v0.3.5 (2026-09-15) · pushed 2026-10-20 · open issues 861 · MIT | stars 49,228 · created 2026-02-01 · `v0.3.5` published 2026-09-15 · pushed 2026-10-21 · open issues 870 · MIT | **PASS** |
| auth-better-auth-ecosystem | #1 `better-auth/better-auth` | ★30,385 · created 2024-05-19 · `v1.7.11` @ 2026-10-19 · **31 maintainers/90 d** (100+ commits/90 d) · MIT · npm 7,801,856 dl/week · **OSV: 22 advisories on the `better-auth` package** (2024-12-30 → 2026-07-24) | stars 30,395 · created 2024-05-19 · `v1.7.11` published 2026-10-19 (`v1.7.12` at 2026-10-20 11:58) · MIT · npm downloads last week 7,801,856 (window 2026-10-12 → 2026-10-18) — exact · OSV query on the npm package `better-auth` returns exactly **22** advisories, earliest 2024-12-30 (GHSA-8jhw-6pjj-8723), latest 2026-07-24 (GHSA-qq9h-g4jm-xgf3) · but the 90-day commit list holds **503 commits by 103 distinct human authors**, not 31 | **FAIL** — maintainer count |
| auth-better-auth-ecosystem | #5 `better-auth-ui/better-auth-ui` | 1,725 ★ · 2024-12-29 · `v1.7.30` @ 2026-10-11 · 8 maintainers/90 d · 17 open · MIT | stars 1,725 · created 2024-12-29 · `v1.7.30` published 2026-10-11 · open issues 18 · MIT | **PASS** |
| auth-better-auth-ecosystem | #12 `ory/kratos` | 13,921 ★ · 2018-05-29 · `v26.2.0` @ 2026-03-20 · 2 rel/12 m · 5 maintainers/90 d · 151 open · Apache-2.0 | stars 13,925 · created 2018-05-29 · `v26.2.0` published 2026-03-20 · Apache-2.0 · open issues 234 (REST, includes PRs) | **PASS** |
| auth-better-auth-ecosystem | #14 `logto-io/logto` | 14,729 ★ · 2021-06-19 · `v1.45.0` @ 2026-10-13 · 11 maintainers/90 d · 116 open · **MPL-2.0** | stars 14,729 · created 2021-06-19 · `v1.45.0` published 2026-10-13 · open issues 152 (REST, includes PRs) · `license.spdx_id` = **MPL-2.0** ✓ | **PASS** |
| auth-better-auth-ecosystem | #16 `lucia-auth/lucia` | 10,450 ★ · 2022-07-18 · **no releases**; README carries a deprecation announcement (commit 2026-07-29 "add deprecation announcement link to readme") · MIT | stars 10,450 · created 2022-07-18 · `releases` endpoint returns `[]` (no releases) · MIT · repository pushed 2026-08-08, consistent with a project in retirement | **PASS** |
| auth-better-auth-ecosystem | #18 `panva/jose` | 7,837 ★ · 2018-11-06 · `v6.2.13` @ 2026-10-20 · 4 maintainers/90 d · 0 open · MIT · npm `jose` 6.2.13, **93,410,128 dl/week** · **OSV: 3 advisories**, all **JWE**-only | stars 7,839 · created 2018-11-06 · `v6.2.13` published 2026-10-20 · open issues 0 · MIT · npm `jose` 6.2.13 MIT, downloads last week 93,410,128 — exact · OSV returns exactly 3 advisories: GHSA-58f5-hfqc-jgch (padding oracle, timing discrepancy), GHSA-hhhv-q57g-882q ("Resource exhaustion via specifically crafted JWE with compressed plaintext"), GHSA-jv3g-j58f-9mq9 ("Resource exhaustion via specifically crafted JWE") — all three are JWE-side, so the "none applies to our JWS ES256 use" conclusion holds | **PASS** |
| auth-better-auth-ecosystem | #27 `casbin/node-casbin` | 2,923 ★ · 2018-07-15 · `v5.51.1` @ 2026-06-25 · 12 rel/12 m · 2 maintainers/90 d · 1 open · Apache-2.0 | stars 2,923 · created 2018-07-15 · `v5.51.1` published 2026-06-25 · open issues 1 · Apache-2.0 | **PASS** |
| payments-subscriptions | #1 `stripe/stripe-node` | 4,534 ★ · 2011-09-28 · pushed 2026-10-19 · last release v23.1.0-alpha.3 @2026-10-14 · MIT · 94,606,198 dl/30 d · commits "Reject blank webhook secrets" (2026-10-19), "Fix notification handling and discarded fetch retries" (2026-10-19), "verifyHeader and verifyHeaderAsync … DEFAULT_TOLERANCE" (2026-09-29), "Classify incomplete response bodies as connection errors" (2026-09-28), "Drop support for Node 18" (2026-09-28) | stars 4,535 · created 2011-09-28 · pushed 2026-10-21 · `v23.1.0-alpha.3` published 2026-10-14 · MIT · npm `stripe` 23.0.0 MIT · npm downloads last month 94,606,198 (window 2026-09-19 → 2026-10-18) — exact · all five named commits exist with those dates and titles; "Add API v2 Search support" (2026-10-14) and "Hand-write V2List/V2SearchResult namespace exports" (2026-10-16) also confirmed | **PASS** |
| payments-subscriptions | #10 `RevenueCat/react-native-purchases` | 1,215 ★ · 2018-06-21 · pushed 2026-10-20 · 10.15.0 @2026-10-19 · MIT · 3,246,760 dl/30 d · commit "Run Maestro purchase flow on old architecture" (2026-10-13) | stars 1,215 · created 2018-06-21 · pushed 2026-10-20 · `10.15.0` published 2026-10-19 · MIT · npm `react-native-purchases` 10.15.0 MIT · npm downloads last month 3,246,760 — exact · commit "Run Maestro purchase flow on old architecture (#2000)" dated 2026-10-13 ✓ and "feat(ads): admob adapter (#2023)" dated 2026-10-16 ✓ | **PASS** |
| payments-subscriptions | #16 `better-auth/better-auth` | 30,385 ★ · 2024-05-19 · v1.7.11 @2026-10-19 · 496 commits/90 d · **29 human maintainers** · MIT · 44,611,654 dl/30 d · **adv 28 (3 critical, 12 high — incl. `@better-auth/stripe` org-isolation)** | stars 30,395 · created 2024-05-19 · `v1.7.11` published 2026-10-19 · MIT · npm downloads last month 44,611,654 — exact · npm `better-auth` 1.7.11 MIT · GitHub repo advisories: **37** in total — **3 critical** (GHSA-965c-763c-88jm, GHSA-rjg6-39jm-rgg4, GHSA-5rr4-8452-hf4v), **22 high**, 7 medium, 5 low · GHSA-h3rm-78g3-j7cp is present and **high**, fixed 1.6.21, "@better-auth/stripe: cross-organization billing tampering" ✓ · 90-day commits: 503 by **103** distinct human authors | **FAIL** — advisory count and severities, and the maintainer count |
| payments-subscriptions | #17 `polarsource/polar` | 10,373 ★ · 2023-01-26 · pushed 2026-10-20 · last release @polar-sh/cli@3.0.0 @2026-10-16 · 1,835 commits/90 d · **Apache-2.0** | stars 10,376 · created 2023-01-26 · pushed 2026-10-20 · `@polar-sh/cli@3.0.0` published 2026-10-16 · Apache-2.0 · npm `@polar-sh/cli` 3.0.0 Apache-2.0 ✓ · 90-day commits measured 1,831 (card says 1,835) | **PASS** |
| payments-subscriptions | #18 `getlago/lago` | 10,696 ★ · 2022-02-28 · pushed 2026-10-20 · v1.55.0 @2026-10-07 · 50 commits/90 d · **AGPL-3.0** | stars 10,699 · created 2022-02-28 · pushed 2026-10-21 · `v1.55.0` published 2026-10-07 · `license.spdx_id` = **AGPL-3.0** ✓ | **PASS** |
| payments-subscriptions | #22 `dubinc/dub` | 24,917 ★ · 2022-08-27 · pushed 2026-10-20 · no GitHub releases · Licence (LICENSE file) = **"source-available, directory-scoped" ("Portions of this software … are licensed as follows")** | stars 24,919 · created 2022-08-27 · pushed 2026-10-21 · `releases` endpoint returns `[]` ✓ · GitHub `license.spdx_id` = NOASSERTION · `LICENSE.md` says the (ee) directories are under a proprietary licence **and** "Content outside of the above mentioned directories or restrictions above is available under the **AGPLv3** license" | **FAIL** — licence mislabelled |
| payments-subscriptions | #30 `akaunting/akaunting` | 10,193 ★ · 2017-06-21 · pushed 2026-10-08 · 3.2.4 @2026-09-17 · **Business Source License (BSL)** — MariaDB BSL text | stars 10,194 · created 2017-06-21 · pushed 2026-10-08 · `3.2.4` published 2026-09-17 · `LICENSE.txt` (note: the file is named `LICENSE.txt`, and the default branch is `master`, not `main`) reads "License text copyright (c) 2020 MariaDB Corporation Ab … \"Business Source License\" is a trademark of MariaDB Corporation Ab" with "Licensor: Akaunting, Inc." and an Additional Use Grant | **PASS** |
| payments-subscriptions | #34 `medusajs/medusa` | 36,817 ★ · 2020-01-18 · pushed 2026-10-20 · v2.21.2 @2026-09-28 · **MIT except `/ENTERPRISE-LICENSE.md` materials** | stars 36,832 · created 2020-01-18 · pushed 2026-10-20 · `v2.21.2` published 2026-09-28 · `LICENSE` states that apart from `ENTERPRISE-LICENSE.md` the repository is under the MIT Licence (MIT text, "Copyright (c) 2021 Medusajs") and `ENTERPRISE-LICENSE.md` exists and marks the Enterprise Edition materials proprietary | **PASS** |

**Totals: 47 cards checked — 42 pass, 5 fail (89.4 % pass rate).**

---

## 4. The corrections the files need

### 4.1 `on-device-stt-tts-vad-kws.md` — card #1 `k2-fsa/sherpa-onnx`

Current text (line 41): `… pushed 2026-10-20 · open issues 667 · forks 2,234 · last-20 commits 2026-10-20→2026-09-21 …`

Replace with:

```
· pushed 2026-10-20 · open issues 667 · forks 1,804 · last-20 commits 2026-10-20→2026-09-21 …
```

Why: the API returns `forks_count: 1804`. The figure 2,234 in the card is 23.9 % too high and is the same number printed on card #7 (`k2-fsa/OmniVoice`, whose real fork count is 2,259), so it looks like a copy-paste between the two cards. Card #7's own figure (2,234 vs 2,259, 1.1 % out) is inside tolerance and needs no change.

### 4.2 `voice-agent-frameworks.md` — card #1 `pipecat-ai/pipecat`, deep review §4 item 1

Current text: `· **`@pipecat-ai/react-native-daily-transport` 0.3.0 (2026-04-22)** · **`@pipecat-ai/react-native-small-webrtc-transport` 0.5.7 (2026-05-05)** ·`

Replace with:

```
· **`@pipecat-ai/react-native-daily-transport` 1.8.0 (2026-06-22)** · **`@pipecat-ai/react-native-small-webrtc-transport` 1.8.0 (2026-06-22)** · (no 0.3.0 of the daily transport and no 0.5.7 of the small-webrtc transport were ever published; the 0.x lines end at 0.3.5 / 2025-05-08 and 1.4.0 / 2025-11-06 respectively)
```

Why: neither version exists in the npm registry, and nothing was published on 2026-04-22 or 2026-05-05 for either package. Every other version in that same list does exist (`client-react` 1.9.0, `daily-transport` 1.7.0, `small-webrtc-transport` 1.1.0, `websocket-transport` 1.8.0, `livekit-transport` 1.0.0, `realtime-websocket-transport` 0.3.2, `moq-transport` 0.3.0, `voice-ui-kit` 0.14.1, `client-js` 1.14.0).

Two further stale entries in the same list, not counted as a separate failure:

- `@pipecat-ai/small-webrtc-transport` 1.1.0 → the current release is **1.11.0 (2026-10-16)**.
- `@pipecat-ai/livekit-transport` 1.0.0 → the current release is **1.1.0 (2026-10-20)**.

### 4.3 `auth-better-auth-ecosystem.md` — card #1 `better-auth/better-auth`

Current text (line 37): `· 12 rel/12 m · **31 maintainers/90 d** (100+ commits/90 d) · 381 open / 3,585 closed ·`

Replace with:

```
· 12 rel/12 m · **103 human maintainers/90 d** (503 commits/90 d) · 381 open / 3,585 closed ·
```

And in the same file, the Decision section (line 205): `it is the fastest-moving project in the space (31 maintainers/90 d, 12 releases/12 m)` → `it is the fastest-moving project in the space (103 human maintainers/90 d, 12 releases/12 m)`.

Why: counting distinct non-bot commit authors over the 90 days to 2026-07-22 gives 103 human authors across 503 commits, not 31. The gap is a method artefact — the query recorded in §1 (`gh api repos/<owner>/<repo>/commits?since=<90d>&per_page=100`) returns only the first 100 commits of the window, so roughly the last five weeks of the window were never counted. Note that `payments-subscriptions.md` card #16 puts the same repository, same day, at **29** maintainers: the two files cannot both be right.

Everything else on this card was confirmed exactly: stars 30,385 → 30,395, MIT, `v1.7.11` published 2026-10-19, npm downloads 7,801,856/week exactly, and **22** OSV advisories on the npm package exactly (the highest stable fixed version across those 22 is 1.6.22, so the "our 1.7.10/1.7.11 pin is patched" conclusion stands).

### 4.4 `payments-subscriptions.md` — card #16 `better-auth/better-auth`

Current text (line 75), `adv` column: `**28 (3 critical, 12 high — incl. `@better-auth/stripe` org-isolation)**` · `maint` column: `29`

Replace with:

```
adv: **37 (3 critical, 22 high, 7 medium, 5 low — incl. `@better-auth/stripe` org-isolation)**   ·   maint: 103
```

And in the deep review §4.3 of the same file:

- `**28 advisories** on the repo, including` → `**37 advisories** on the repo, including`
- `12 further highs (SSO provider confusion, magic-link password persistence, device-login approval UX, OAuth-proxy sign-in, rate-limit bypass via IPv6 rotation, session-cache 2FA skip, double-slash path bypass)` → `21 further highs (SSO provider confusion, magic-link password persistence, device-login approval UX, OAuth-proxy sign-in, rate-limit bypass via IPv6 rotation, session-cache 2FA skip, double-slash path bypass, …)` — the parenthetical listed 7 examples for a claimed 12; the repo's real total is 22 high.
- In the risk table: `Better Auth advisory stream (28 advisories, 3 critical)` → `Better Auth advisory stream (37 advisories, 3 critical)`

Why: `repos/better-auth/better-auth/security-advisories` returns 37 advisories — 3 critical, 22 high, 7 medium, 5 low. The three critical ids the card names are all present and all critical, and `GHSA-h3rm-78g3-j7cp` is present, high, fixed in 1.6.21, with the summary "@better-auth/stripe: cross-organization billing tampering in organization subscriptions", so the tenant-isolation reasoning in the card is sound. The advisory **count** and the **high** count are simply too low. The 22 in `auth-better-auth-ecosystem.md` is the count for the npm package `better-auth` alone — the two files are counting different things and both should say which.

Also update `maint: 29` to `maint: 103` (see §4.3 — same repository, same day).

### 4.5 `payments-subscriptions.md` — card #22 `dubinc/dub`

Current text (line 81), licence column: `**source-available, directory-scoped** ("Portions of this software … are licensed as follows")`

Replace with:

```
**AGPL-3.0 base licence with a directory-scoped proprietary overlay** — `LICENSE.md`: "Portions of this software — namely all files that reside under the following directories of this repository — are licensed under the license defined in ee/LICENSE.md … Content outside of the above mentioned directories or restrictions above is available under the AGPLv3 license as defined below."
```

And in the Decision section (line 259): `19. `dubinc/dub` — source-available with directory-scoped licences → not permissive.` →

```
19. `dubinc/dub` — AGPL-3.0 outside the `(ee)` directories, with a proprietary overlay inside them → clean-room study only under V4 §11.2, on the same footing as `lago`, `meteroid`, `flexprice` and `frappe/books`.
```

Why: the licence cell quotes the first half of `LICENSE.md` and leaves out the second half, which puts the bulk of the repository under AGPLv3. Labelling the project merely "source-available" understates a copyleft licence that `CONSTRAINTS.md` bans and that the same file treats as clean-room-only elsewhere. The REJECT decision does not change; the reasoning and the licence label do.

### 4.6 One further correction found while checking, in a card outside the sample

`voice-agent-frameworks.md` card #36 `pipecat-ai/voice-ui-kit` states `npm `@pipecat-ai/voice-ui-kit` 0.14.1 (2026-09-04)`. The version exists, but npm published 0.14.1 on **2026-09-28**, not 2026-09-04. Card #36 was not in the sampled set, so it is not counted in the failure total, but the date should be corrected.

### 4.7 One clarification, in `on-device-stt-tts-vad-kws.md` — card #7 `k2-fsa/OmniVoice`

The card's licence finding is correct and was confirmed verbatim against the Hugging Face model card. One path detail should be tightened so a reader can re-check it: `audio_tokenizer/LICENSE` exists **in the Hugging Face model repository** (`https://huggingface.co/k2-fsa/OmniVoice/raw/main/audio_tokenizer/LICENSE`), not in the GitHub repository — `repos/k2-fsa/OmniVoice/contents` lists no `audio_tokenizer` directory and the GitHub path returns 404. The card's own query list already points at `huggingface.co` for this file, so this is a clarification, not a failure. The card's fork figure (2,234 vs the measured 2,259) is inside tolerance and needs no change.

---

## 5. A systemic number that needs re-basing: the maintainer counts

The `maint` column in all three table-based files is produced by counting distinct human commit authors in 90 days, but the recorded query is `commits?since=<90d>&per_page=100` with no pagination. For a busy repository that returns only the most recent 100 commits, so the count covers roughly the last five weeks of the window, not 90 days. Measured with full pagination over the same window:

| Repository | Commits in 90 d | Distinct human authors | Card says |
|---|---|---|---|
| `better-auth/better-auth` | 503 | 103 | 31 (auth file) / 29 (payments file) |
| `software-mansion/react-native-gesture-handler` | 217 | 28 | 17 (design file) |
| `polarsource/polar` | 1,831 | 14 | 10 (payments file) |

The commit counts are right; the author counts are low everywhere, badly so for `better-auth`. Two changes are needed: paginate the commits query, and either state the corrected figures or change the column heading to "distinct authors in the first 100 commits of the window" so the number means what it says.

---

## 6. What could not be verified

- **Six-month star trend** for every candidate. The GitHub REST API exposes no stargazer history to this token (`/stargazers` → 403, GraphQL `stargazers { edges { starredAt } }` → FORBIDDEN). The research files already mark this UNVERIFIED; nothing in this pass can change that.
- **The open/closed issue pairs** in the table cards (e.g. "69/1515"). The cards use a GraphQL count that includes pull requests; I could only read the REST `open_issues_count`, which also includes pull requests and is not the same figure. I therefore did not fail any card on its issue columns. The same applies to the `closed` halves, which were not reproduced.
- **The patched version of `GHSA-965c-763c-88jm`**, which `payments-subscriptions.md` states as "patched 1.7.7". The advisory exists, is critical, and its summary matches the card's quotation exactly, but OSV has no entry under that id and the GitHub advisory endpoint returned no first-patched version, so the version number is not verifiable from the sources available.
- **npm download counters** for every card. I re-checked nine of them and all nine matched exactly (`better-auth` 7,801,856/week and 44,611,654/30 d; `@better-auth/expo` 846,885/week; `@better-auth/passkey` 1,422,832/week; `@better-auth/cli` 148,080/week; `jose` 93,410,128/week; `stripe` 94,606,198/30 d; `react-native-purchases` 3,246,760/30 d; `@expo-google-fonts/figtree` 257,396/30 d). The remaining `dl30` and `dl/week` figures in the other cards were not re-checked.
- **Repository size (`diskUsage`)** for every card. It drifts between reads; I compared it only for the sampled cards and all of them were within about 0.2 %.
- **Maintainer counts** for the cards other than the three measured above, and **commit counts in 90 days** for cards other than `better-auth`, `polar` and `gesture-handler`.
- **Parameter counts** for the Hugging Face models (612.6 M for `k2-fsa/OmniVoice`, 82 M for `hexgrad/Kokoro-82M`). The model API returns downloads, storage and licence, not parameter counts; the licence and the storage figures were checked, the parameter counts were not.
- **Every benchmark row** (B1–B7 in the design file, P1–P7 in the payments file, the three voice evaluation rows). The research files already record the harnesses and the voice evaluation set as absent, so there was nothing to re-measure; this pass says nothing about their claims.
- **The `adv` column for every candidate except `better-auth` and `react-native-mmkv`.** Only those two had their advisory lists re-read (OSV plus the GitHub advisory endpoint); the other `adv: 0` cells were not re-checked.
- **New Architecture, Expo SDK 58 and Android API 34 support** for any candidate. The research files mark these UNVERIFIED for all but `gesture-handler`, and the `react-native-gesture-handler` SDK 58 claim is the one that was confirmed here (commit "Bump to `expo` sdk 58 (#4612)", 2026-10-19).

No check was blocked by a network failure, and no verdict was recorded for a source that was not opened.

---

## 7. Summary

Forty-seven evidence cards across the six 2026 research files were re-checked against their live sources — 21.0 % of the 224 cards, and at least 20 % in every individual file. Forty-two cards passed and five failed, an overall pass rate of **89.4 %**. The failures are narrow and specific rather than systemic: one copy-pasted fork count (`sherpa-onnx` 2,234 → 1,804), two npm package versions in the Pipecat transport list that were never published (`@pipecat-ai/react-native-daily-transport` 0.3.0 and `@pipecat-ai/react-native-small-webrtc-transport` 0.5.7), the Better Auth maintainer count in two files at once (31 and 29 claimed, 103 measured), the Better Auth advisory count and severity split in the payments file (28 and 12 high claimed, 37 and 22 high actual, while the "22 advisories" figure in the auth file is correct because it counts the npm package rather than the repository), and `dubinc/dub` being labelled "source-available" when its `LICENSE.md` puts everything outside the `(ee)` directories under AGPLv3. Every headline number that the decisions actually rest on — the star counts, the release tags and dates, the licences, the download counts, the advisory ids and their patched versions, the model licences, and the quoted licence sentences — was confirmed against the primary source, so the adopt/keep/reject conclusions in the six files stand as written apart from the five corrections listed above and the maintainer-count column, which needs re-basing across all three table-based files.
