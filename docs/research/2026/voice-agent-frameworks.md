# Voice agent frameworks & turn-taking — 2026 OSS research (redone, V4 §13.1)

**Research date: 2026-10-21.** Method: V4 §12 (≥30 candidates with full evidence cards, ≥13 shortlisted, top 5 deep-reviewed, benchmarks only where an eval set exists) + §12.6 anti-bias (challengers tracked even when not adopted). Every number was read from the live GitHub API, PyPI, npm, Hugging Face or the vendor's own pricing page on 2026-10-21 unless the card says **UNVERIFIED**. Nothing is estimated and nothing is carried over unread — the previous sprint (#1) was wrong on the licence of the turn-detection model and on what Pipecat actually ships today (§8.2).

**Card fields:** repo URL · stars + forks · created · last release + date · cadence · 90-day commit + human-maintainer count · open issues · licence (code **and** weights) · Expo SDK 58 / RN New Architecture fit · commercial-use verdict for a closed-source app · on-device vs hosted · why it matters to a solo courier in a van · **DECISION**.

---

## 0. Scope, our current choice, the bar

| Item | Verified 2026-10-21 |
|---|---|
| **Area** | VAD-based turn detection, interruption/barge-in, streaming, the realtime voice protocol, and the frameworks that implement them |
| **Our framework today** | **Pipecat is already a dependency**: `apps/api/pyproject.toml` has `pipecat-ai>=1.12.0`; `apps/mobile/package.json` has `@pipecat-ai/client-js@1.14.0`, `expo-audio@58.0.9`, `react-native-sherpa-onnx@0.4.4` |
| **What is NOT built** | `services/voice` **does not exist** (repo dirs read 2026-10-21: `services/{auth,worker}`, `packages/{design-tokens,eslint-config,nz-address,shared}`, `apps/{api,mobile}`). The voice path today is `apps/mobile/src/voice/{VoiceService.ts,useVoice.ts,VoiceButton.tsx,EarbudButtonModule.ts,WhisperGeofence.ts}` only. Sprint #1's "our current choice: `services/voice` on Pipecat" was **wrong** — there is no such service yet |
| **Bar (V4 §10.1 / CONSTRAINTS.md)** | voice command → action **≤ 700 ms**; battery **≤ 8 %/h**; APK **≤ 80 MB**; APK cold start ≤ 2 s; **no GPL/AGPL/SSPL/Commons-Clause/CC-NC/FSL/BUSL in the shipped app**; degrade gracefully with no network |
| **NZ reality** | one courier, hands-free, one command at a time, 1–3 s response, van noise, left-hand traffic, te reo/Māori place names in the address stream |

Two things must not be conflated. **The framework** (a pipeline graph that composes STT / LLM / TTS / VAD and decides when each side speaks) and **the turn-detection model** (the thing that decides "the courier has finished talking"). In 2026 they have come apart: the best turn detectors are now **weights you can run on a phone**, and they carry **their own licences that are stricter than the framework's**. Reading the framework's README is no longer enough.

### 6-month star trend — method note (proxy, as V4 §12.3 permits)

The star *timeline* is not readable with our token: `GET /repos/{o}/{r}/stargazers` returns **HTTP 403 "Resource not accessible by personal access token"** (same limitation the routing study hit on 2026-10-21). **Every "stars gained in 6 months" figure is UNVERIFIED.** The proxy used throughout is the one §12.3 prescribes: **releases in the last 6 months · commits in the last 90 days · distinct human maintainers in 90 days** (bot/dependabot excluded), plus **package downloads/month** where a registry exists.

**Two mechanical limits on the numbers below, stated once.** (1) The commits endpoint returns **at most 100 commits per request**, so *"100+ commits/90 d"* means **the window filled a full page** — the true figure is higher — and the **human-maintainer count is the number of distinct non-bot authors in that page**, i.e. a **lower bound**, not a 90-day total. Where the count is below 100 (e.g. ten-framework 69, VoiceMem 78, silero-vad 22, pipecat-client-web 63, daily-js 59, Whisker 25, LiveKit RN client 19) both numbers are exact. (2) `open_issues_count` **includes pull requests**; the issues-only count was not separately sampled for this area (**UNVERIFIED**).

---

## Queries run

`gh` through `scripts\gh.ps1` (GitHub CLI with the repo token from `.env.local`, never printed), plus npm/PyPI/HF registry reads and vendor doc fetches. All on **2026-10-21**.

| #   | Query | Sort / limit | What it produced |
|---|---|---|---|
| 1 | `gh search repos "voice agent framework"` | stars / 30 | **dead query** — 88★ max; GitHub ANDs every term, so it returns nothing real |
| 2 | `gh search repos "topic:voice-agent"` | stars / 30 | agentscope 33.5k, qwen-audio-agent 2.96k, VoiceMem 2.6k, ten-vad 2.29k, Patter 1.08k, tapq 707, Deuz 538, flowcraft 416, sutando 398, agent-call 298, streamcore 235, active-call 192, axiom 146, voice-mcp-agent 139, BentoVoiceAgent 134, sip-to-ai 114, feros 112 |
| 3 | `gh search repos "topic:realtime-voice"` | stars / 30 | only the 2026 long tail — no incumbent |
| 4 | `gh search repos "realtime voice agent"` | stars / 30 | streamcore-server 235 (Go, WebRTC/WHIP), SalesforceAIResearch/enterprise-realtime-voice-agent 65 |
| 5 | `gh search repos "moshi"` | stars / 8 | **kyutai-labs/moshi 11 265★** (the Kotlin `square/moshi` JSON library is 10 164★ — different project, do not confuse) |
| 6 | `gh search repos "ultravox"` | stars / 8 | **fixie-ai/ultravox 4 582★** + ultradox (docs), client SDKs (js/python), demo template |
| 7 | `gh search repos "vocode"` | stars / 8 | **vocodedev/vocode-core 3 805★** |
| 8 | `gh search repos "openai realtime"` | stars / 10 | openai-realtime-agents 7 003★, -console 3 616★, -embedded 1 578★, -api-beta 1 019★ |
| 9 | `gh search repos "agora conversational ai"` | stars / 8 | AgoraIO-Community/convoai-jev-vad 21★, AgoraIO-Conversational-AI/agent-quickstart-android 7★, hackathon repos 1★ |
| 10 | `gh search repos "org:livekit"` | stars / 20 | livekit 21.7k, agents 14.9k, agents-js 947, client-sdk-react-native 290, **livekit-wakeword 292** |
| 11 | `gh search repos "liveblocks"` | stars / 12 | **liveblocks/liveblocks 4 758★** ("Realtime infrastructure for multiplayer apps and agents") |
| 12 | `gh search repos "turn detector"` | stars / 12 | the ecosystem is LiveKit-plugins + VideoSDK NAMO; no independent project |
| 13 | `gh api repos/{o}/{r}` | 60 repos | stars, forks, created, pushed, license.spdx_id, open_issues_count, archived, default_branch |
| 14 | `gh api repos/{o}/{r}/releases?per_page=20` | 60 repos | last release + date + releases-in-6-months |
| 15 | `gh api repos/{o}/{r}/commits?sha=<branch>&since=2026-07-23` | 60 repos | 90-day commit count + distinct human authors (bot filtered) |
| 16 | `gh api repos/{o}/{r}/license` | 14 repos | raw licence text where the API said NOASSERTION |
| 17 | `gh api repos/pipecat-ai/pipecat/git/trees/main?recursive=1` | 1 repo | 2 252 paths — the real shape of the turn subsystem |
| 18 | `gh api search issues --repo <r> --created ">=2026-01-01"` | 6 repos | real 2026 issues with URLs and dates |
| 19 | `gh api search prs --repo <r> --created ">=2026-09-20"` | 3 repos | real 2026 PRs with URLs and dates |
| 20 | `npm view <pkg> version license time.modified peerDependencies` | 25 packages | the **tarball** licence — the thing we actually ship |
| 21 | `curl https://pypi.org/pypi/<pkg>/json` | 12 packages | version, release date, requires-python, licence |
| 22 | Web fetch: LiveKit turn-detector docs + blog | 4 pages | endpointing defaults, adaptive interruption stats, model licence |
| 23 | Web fetch: OpenAI Realtime VAD guide + API reference | 2 pages | `server_vad` vs `semantic_vad`, `eagerness` timeouts |
| 24 | Web fetch: Pipecat smart-turn docs + daily.co blog | 3 pages | 8 MB ONNX, 12 ms CPU, 23 languages, BSD-2 |
| 25 | Web fetch: livekit.io/pricing + platform.openai.com/docs/pricing | 2 pages | cost per minute for the benchmark table |
| 26 | Web fetch: Cloudflare Agents voice docs | 1 page | the 2026 voice-channel reference |

---

## 1. Candidate pool — 38 cards

**C1 — `pipecat-ai/pipecat`** ⭐ https://github.com/pipecat-ai/pipecat — **16 649 ★** /2 915 f · created **2023-12-27** · last release **v1.13.0, 2026-10-19** (15 of the last 20 releases in 6 m) · pushed 2026-10-20 · **413 open issues** · **BSD-2-Clause** (code; the bundled Smart Turn weights are BSD-2 too — see C10) · **100+ commits/90 d, 8 humans** · New Arch: the server is Python; the mobile side is `@pipecat-ai/client-js` (pure JS, no native code) → **no New Arch risk on the client; the RN transports pull `@daily-co/react-native-webrtc` (native)** · **commercial: YES** (BSD-2 permits closed-source shipping) · on-device: **yes, for turn detection** · **our locked choice (D22)** and it is *already a dependency*.
**Why it matters:** the turn subsystem is now a first-class, swappable design, not a VAD flag. `src/pipecat/turns/` has **user_start** strategies (`vad_user_turn_start_strategy.py`, `transcription_user_turn_start_strategy.py`, `min_words_user_turn_start_strategy.py`, `wake_phrase_user_turn_start_strategy.py`, `external_user_turn_start_strategy.py`, `krisp_viva_ip_user_turn_start_strategy.py`), **user_stop** strategies (`speech_timeout_user_turn_stop_strategy.py`, `turn_analyzer_user_turn_stop_strategy.py`, `eager_user_turn_stop_strategy.py`, `deferred_user_turn_stop_strategy.py`, `llm_turn_completion_user_turn_stop_strategy.py`, `external_user_turn_stop_strategy.py`) and **user_mute** strategies (`always_user_mute_strategy.py`, `first_speech_user_mute_strategy.py`, `function_call_user_mute_strategy.py`, `mute_until_first_bot_complete_user_mute_strategy.py`). `src/pipecat/audio/turn/smart_turn/local_smart_turn_v3.py` runs a **local ONNX** turn model — the file comment reads *"Provides end-of-turn detection using locally-stored ONNX model, enabling offline operation without network dependencies"*. `src/pipecat/flows/` is in the main package (the separate `pipecat-flows` repo is archived). **DECISION: KEEP — it is our framework.**

**C2 — `livekit/agents`** ⭐ https://github.com/livekit/agents — **14 862 ★** /3 966 f · created **2023-10-19** · last release **livekit-agents@1.8.8, 2026-10-15** (**20 of the last 20 releases in 6 m** — near-daily) · pushed 2026-10-20 · **790 open issues** · **Apache-2.0** (code) · **100+ commits/90 d, 53 humans** · New Arch: client is `livekit-client` (pure TS) but the RN path needs `@livekit/react-native-webrtc` (native) → **New Arch compatibility of `@livekit/react-native-webrtc@150.1.0` is UNVERIFIED** · **commercial: YES for the code; the turn-detection weights are NOT (see C2-note)** · on-device: **no** (the turn models are LiveKit-hosted inference or a self-hosted ONNX file) · the strongest alternative framework, and in 2026 it shipped the three ideas that matter.
**Why it matters:** `livekit-agents@1.5.0` (2026-03-19) added **preemptive generation** (default on), **adaptive interruption handling** (an audio ML model that separates a real barge-in from a cough or a "mm-hmm" backchannel: 86 % precision / 100 % recall at 500 ms overlap, rejects 51 % of VAD false positives, detects true interruptions 64 % faster than VAD, **inference ≤ 30 ms**), and **dynamic endpointing** (an EMA of the conversation's pause rhythm instead of a fixed threshold). `ChatMessage.metrics` now carries **`transcription_delay`, `end_of_turn_delay`, `on_user_turn_completed_delay`** — exactly the per-turn numbers our benchmark needs. **DECISION: WATCH — the metric vocabulary and the adaptive-interruption idea; not the platform.**

**C2-note — the LiveKit turn-detector *weights* licence (this is the finding that changes a plan)** — https://huggingface.co/livekit/turn-detector → **"LiveKit Model License Agreement"**, a **proprietary** licence, *last updated 2024-11-25*. Clause 3.b: *"(i) **not to use any LiveKit Models on a standalone basis or with any frameworks other than LiveKit Agents**; (ii) not to use any LiveKit Materials or any output … to improve or otherwise develop any other models that are not LiveKit Models"*. The v1 audio turn detector keeps the same terms (*"the model files under the same LiveKit Model License as previous versions"*, livekit.com blog 2026-06-17). **Consequence: we cannot port the LiveKit turn detector into a Pipecat processor.** Sprint #1's plan to "port the model behind our own Pipecat processor without taking LiveKit" is **blocked by the licence**, not by the engineering. **This is an ADR-004 amendment candidate — see §8.1.**

**C3 — `huggingface/speech-to-speech`** ⭐ https://github.com/huggingface/speech-to-speech — **13 527 ★** /1 729 f · created **2024-08-07** · last release **v1.0.0, 2026-09-06** (5 releases, 4 in 6 m) · pushed 2026-10-20 · **53 open issues** · **Apache-2.0** (code) · **100+ commits/90 d, 9 humans** · New Arch: n/a (Python server) · **commercial: YES for the code; the default pipeline's *model weights* must each be checked (Qwen3.5-4B / Qwen3-TTS / Parakeet TDT — UNVERIFIED here, Parakeet is CC-BY-4.0 per ADR-004)** · on-device: **no (GPU box)** · the only candidate with a **verified production user base** (README: the conversation backend for **thousands of Reachy Mini robots**).
**Why it matters:** it speaks the **OpenAI Realtime protocol over both WebSocket and WebRTC**, so any Realtime client can point at it instead of a cloud endpoint. **DECISION: ADOPT (protocol + pipeline reference) — speak the OpenAI-Realtime wire format in our service so the client is not tied to one framework.**

**C4 — `TEN-framework/ten-framework`** ⭐ https://github.com/TEN-framework/ten-framework — **11 183 ★** /1 367 f · created **2024-06-19** · last release **0.11.73, 2026-09-22** (10 in 6 m) · pushed 2026-10-20 · **249 open issues** · licence API says **NOASSERTION**; the raw `LICENSE` read 2026-10-21 says **Apache-2.0 *plus five additional conditions*** (see C4-note) · **69 commits/90 d, 18 humans** · on-device: the runtime is server-side, but it is the parent of ten-vad which is a mobile VAD · **commercial: NO for us — see C4-note.**
**C4-note — the Agora field-of-use restriction (read from the file, 2026-10-21):** *"1. You may not (i) **host the TEN Framework or the Derivative Works on any End User devices, including but not limited to any mobile terminal devices** or (ii) Deploy the TEN Framework in a way that **competes with Agora's offerings** and/or that allows others to compete with Agora's offerings…"* · *"2. You may Deploy the TEN Framework solely to create and enable deployment of your Application(s) solely for your benefit and the benefit of your direct End Users."* · *"3. Derivative Works … remain subject to this Open Source License."* **Two independent blockers for us: (i) we ship a mobile app and the clause names "mobile terminal devices"; (ii) we are a conversational-assistant product and Agora sells conversational AI — the clause restricts competing with them. Shipping TEN inside the courier app is not permissible on this text.**
**DECISION: REJECT (licence) — study the plugin/UI architecture; do not ship it, and do not point a VAD at it.**

**C5 — `TEN-framework/ten-vad`** https://github.com/TEN-framework/ten-vad — **2 290 ★** /180 f · created **2025-04-29** · last release **v1.0, 2025-07-11** (2 releases, **0 in 6 m**) · pushed 2026-10-09 · **25 open issues** · licence: **NOASSERTION on the API; the raw file is Apache-2.0 + the same Agora clause** (clause 1 bans competing with Agora; clause 6 notes derived BSD-3/BSD-2 code and a `NOTICES` file) · **commercial: conditional — the on-device VAD is exactly the use case, but the "competes with Agora" restriction plus the unverified `NOTICES` provenance make it unusable without counsel** · on-device: **yes (it is the point)** · the fastest low-latency VAD in the pool and the reason the TEN framework is at 11 k stars.
**DECISION: WATCH (licence-first) — do not put it in the app. Use sherpa-onnx's own VAD, which ADR-004 already cleared as the default.**

**C6 — `kyutai-labs/moshi`** ⭐ https://github.com/kyutai-labs/moshi — **11 265 ★** /1 044 f · created **2024-08-07** · last commit on `main` **2026-05-16** (`e6a55d272`, typo fixes) · last GitHub release **rustymimi-0.2.2, 2024-09-22** · **97 open issues** · **Apache-2.0** (Rust backend) / MIT (Python) / MIT (web client) · **weights released under CC-BY 4.0** (README) · **0 commits/90 d** → **stalled**, the repo is a research artefact now · on-device: **MLX build for iPhone/Mac exists** (`moshi_mlx`) but not Android.
**Why it matters:** it is the only **full-duplex** design — two audio streams modelled simultaneously, so the model never has to "decide" to stop. README: *"Moshi achieves a theoretical latency of 160ms (80ms for the frame size of Mimi + 80ms of acoustic delay), with a practical overall latency as low as 200ms on an L4 GPU."* Mimi is a streaming codec at 12.5 Hz / 1.1 kbps with 80 ms latency. **DECISION: WATCH (research reference only) — it defines the latency floor; we cannot run a 7B Temporal Transformer on an Android phone in a van.**

**C7 — `fixie-ai/ultravox`** ⭐ https://github.com/fixie-ai/ultravox — **4 582 ★** /386 f · created **2024-05-29** · last release **v0.6, 2025-08-18** (5 releases, **0 in 6 m**) · **last commit 2025-12-12** (README only) · **63 open issues** · **MIT** (code) · **0 commits/90 d** → **dormant for 10 months** · weights on HF (licence **UNVERIFIED**) · New Arch n/a · on-device: no (70B default, 8B variant) · the "one model instead of ASR+LLM" idea, and the direct comparison point in Daily's Smart Turn v3 post (Ultravox: 1.37 GB, 26 languages).
**DECISION: REJECT — dormant. Keep the idea (skip ASR) and the size comparison in the notes.**

**C8 — `QwenAudio/qwen-audio-agent`** ⭐ (2026 newcomer) https://github.com/QwenAudio/qwen-audio-agent — **2 956 ★** /300 f · **created 2026-07-27** · last release **v2.0.1, 2026-09-26** (**20 releases in 6 m**) · pushed 2026-10-20 · **11 open issues** · **Apache-2.0** · **100+ commits/90 d, 12 humans** · on-device: no · "A realtime voice runtime that keeps Agents talking, working, and present" — it treats *continuity* as the product problem, which is our brief ("works all shift").
**Why it matters:** it is the only 2026-native runtime from a frontier-lab team, and it is the natural home of Qwen3-ASR / Qwen3-TTS (the **Apache-2.0-weights** pair ADR-004 names as our server-side licence-safe choice). **DECISION: WATCH — the most interesting 2026 newcomer; re-scan monthly and re-test when its barge-in semantics are documented.**

**C9 — `vocodedev/vocode-core`** https://github.com/vocodedev/vocode-core — **3 805 ★** /656 f · created **2023-02-24** · last release **v0.1.114a2, 2024-08-07** · **last commit 2024-11-15** · 2 open issues · **MIT** · **0 commits/90 d** → **dead for 2 years** · on-device: no.
**DECISION: REJECT — dead. It is the ancestor of most of the 2026 repos and its ideas (interrupt strategies, telephony) are now in Pipecat and LiveKit.**

**C10 — `pipecat-ai/smart-turn`** ⭐ https://github.com/pipecat-ai/smart-turn — **1 629 ★** /108 f · created **2025-03-05** · **no GitHub releases** (weights live on HF) · last push **2026-01-29** · **20 open issues** · **BSD-2-Clause — code, weights, training data and the training script** (README: *"This is a truly open model (BSD 2-clause license). Anyone can use, fork, and contribute."*) · on-device: **yes** · **the single most important licence finding in this file.**
**Why it matters:** Smart Turn v3 is a **Whisper-Tiny-encoder backbone + shallow linear classifier, 8 M parameters, 8.68 MB int8 ONNX / 32.4 MB fp32 ONNX** (HF file list, `smart-turn-v3.2-cpu.onnx` committed "10 months ago"). README: *"Runs in as little as **10ms on some CPUs**, and under 100ms on most cloud instances"*; *"Supports **23 languages** — Arabic, Bengali, Chinese, Danish, Dutch, English, Finnish, French, German, Hindi, Indonesian, Italian, Japanese, Korean, Marathi, Norwegian, Polish, Portuguese, Romanian, Russian, Spanish, Thai, Turkish, Ukrainian, Vietnamese"*; *"Works in conjunction with a lightweight VAD model like Silero, meaning Smart Turn only needs to run during periods of silence."* Daily's blog (2025-09-11) quotes **12 ms on modern CPUs, 60 ms on a low-cost AWS instance**, and compares: Smart Turn v3 8 MB / 23 languages / open weights+data+training script — vs Krisp 65 MB / English only / proprietary — vs Ultravox 1.37 GB / 26 languages / open weights. **Pipecat's docs state: "As of v0.0.102, `TurnAnalyzerUserTurnStopStrategy` with `LocalSmartTurnAnalyzerV3` is the default user turn stop strategy"** and *"The Smart Turn model weights are bundled with Pipecat"*. **DECISION: ADOPT — this is the licence-clean, on-device, 23-language semantic turn detector. It is the one model we can ship inside the courier app and keep the product closed-source.**

**C11 — `pipecat-ai/pipecat-client-web`** https://github.com/pipecat-ai/pipecat-client-web — **326 ★** /68 f · created **2024-07-11** · last release **client-react-v1.9.0, 2026-10-16** (19 of 20 in 6 m) · pushed 2026-10-16 · 8 open issues · **BSD-2-Clause** · **63 commits/90 d, 6 humans** · npm **`@pipecat-ai/client-js` 1.14.0 (BSD-2-Clause, modified 2026-10-16)** — dependencies are `uuid`, `bowser`, `events`, `clone-deep`, `typed-emitter`: **pure JS, no native module → no New Arch exposure** · **commercial: YES** · already ours.
**DECISION: KEEP (already ours) — the transport layer stays framework-agnostic behind our own `VoiceTransport` interface.**

**C12 — `pipecat-ai/pipecat-client-react-native-transports`** https://github.com/pipecat-ai/pipecat-client-react-native-transports — **20 ★** · created **2024-08-27** · pushed **2026-09-28** · 0 open issues · **BSD-2-Clause** · npm **`@pipecat-ai/react-native-small-webrtc-transport` 1.8.0** (BSD-2-Clause, modified **2026-06-22**) — **peerDependency `@daily-co/react-native-webrtc@^124.0.6-daily.2` (native, MIT) and `react-native: *`**; and **`@pipecat-ai/react-native-daily-transport` 1.8.0** — peers `@daily-co/react-native-daily-js@^0.86.0`, `@react-native-async-storage/async-storage@^3.1.1`, `react-native-background-timer@^2.4.1`, `react-native-get-random-values@^1.11.0`. **New Arch: UNVERIFIED — `@daily-co/react-native-webrtc` is a forked native WebRTC module and its New-Architecture support is not stated in the README; `react-native-background-timer` was last published 2022-06-26 and is a legacy-arch module.**
**DECISION: WATCH (mobile link) — prefer the WebSocket transport for v1; take the RN WebRTC transport only after we measure barge-in latency and confirm New Arch.**

**C13 — `pipecat-ai/pipecat-client-web-transports`** https://github.com/pipecat-ai/pipecat-client-web-transports — **31 ★** · created **2024-12-10** · pushed **2026-10-17** · 2 open issues · **BSD-2-Clause** · npm **`@pipecat-ai/websocket-transport` 1.8.0** (BSD-2-Clause, modified 2026-10-16), peer `@pipecat-ai/client-js@~1.14.0` — **dependencies include `@daily-co/daily-js@^0.94.0`** (a Daily dependency even on the WebSocket path).
**DECISION: KEEP (candidate mobile link) — but note the Daily dependency; we must confirm the tree does not pull Daily's cloud at runtime.**

**C14 — `livekit/client-sdk-react-native`** https://github.com/livekit/client-sdk-react-native — **290 ★** · last release **`@livekit/react-native` 3.1.0, 2026-10-17** (10 in 6 m) · **19 commits/90 d, 10 humans** · **Apache-2.0** · npm `@livekit/react-native` 3.1.0 (Apache-2.0, 2026-10-17), peer `@livekit/react-native-webrtc@^150.1.0` (native) · **New Arch of `@livekit/react-native-webrtc@150.1.0`: UNVERIFIED** · on-device: no.
**DECISION: WATCH — the RN client to beat if we ever adopt LiveKit; it is the only candidate with an official React Native SDK that is not a Pipecat transport.**

**C15 — `livekit/agents-js`** https://github.com/livekit/agents-js — **947 ★** /404 f · created **2024-04-01** · last release **`@livekit/agents` 1.9.3, 2026-10-15** · **473 open issues** · **Apache-2.0** · **100+ commits/90 d, 17 humans** · on-device: no · the TypeScript half of LiveKit; note the npm `@livekit/agents` 1.9.3 is Apache-2.0.
**DECISION: WATCH — it proves LiveKit's TS surface is first-class, which makes a future TS voice service possible without a Python service.**

**C16 — `livekit/livekit`** https://github.com/livekit/livekit — **21 687 ★** · pushed 2026-10-20 · **Apache-2.0** · the WebRTC media server. **DECISION: REJECT for v1 — we do not want an SFU/media server in the stack for a one-courier app; it is also a whole operational surface on a ≤ 8 %/h battery budget.**

**C17 — `livekit/livekit-wakeword`** https://github.com/livekit/livekit-wakeword — **292 ★** · created **2026-02-26** · last release **v0.1.0, 2026-02-28** · 12 open issues · **Apache-2.0** · an open-source wake-word library. **DECISION: WATCH — relevant to D9 (a headset button) and to the "always-listening vs push-to-talk" choice; sherpa-onnx KWS is already our on-device path.**

**C18 — `liveblocks/liveblocks`** https://github.com/liveblocks/liveblocks — **4 758 ★** · created 2021-05-25 · last release **v3.24.3, 2026-10-02** (17 in 6 m) · pushed 2026-10-20 · **91 open issues** · licence API **NOASSERTION**; the raw `LICENSE` read 2026-10-21 says: *"This repository contains software under two licenses: 1. Most of the code in this repository is licensed under the Apache License 2.0 …"* — **the remainder is proprietary** · **100+ commits/90 d, 8 humans** · npm `@liveblocks/node` 3.24.3 and `@liveblocks/client` 3.24.3 are **Apache-2.0** · on-device: no.
**Why it matters:** it is the "presence + agents" realtime infrastructure (the repo description is *"Realtime infrastructure for multiplayer apps and agents"*), i.e. presence for a Team plan.
**DECISION: WATCH (Team plan only) — not needed for a solo courier in v1, and the repo is a mixed-licence monorepo.**

**C19 — `daily-co/daily-python`** https://github.com/daily-co/daily-python — **67 ★** · created 2023-09-25 · last release **v0.36.0, 2026-10-17** (11 in 6 m) · pushed 2026-10-17 · 3 open issues · **BSD-2-Clause** · the company behind Pipecat.
**DECISION: REJECT — we do not use Daily's transport; our mobile client talks to our own service over our own socket.**

**C20 — `daily-co/daily-js`** https://github.com/daily-co/daily-js — **145 ★** /35 f · created 2019-04-04 · last release **release-daily-js-0.94.0, 2026-10-16** (6 in 6 m) · pushed 2026-10-16 · **55 open issues** · **BSD-2-Clause** · **59 commits/90 d, 7 humans** · npm `@daily-co/react-native-daily-js` 0.89.0 (BSD-2-Clause, 2026-10-16).
**DECISION: REJECT as a dependency — but note it is a transitive peer of the Pipecat RN transports (C12), so the licence ledger must record it even if unused at runtime.**

**C21 — `openai/openai-realtime-agents`** https://github.com/openai/openai-realtime-agents — **7 003 ★** /1 102 f · created **2025-01-16** · **no GitHub releases** · last commit **2026-01-07** (`94c9e9116`, "security update") · **37 open issues** · **MIT** · **0 commits/90 d** → **stale for 9 months** · on-device: no.
**DECISION: WATCH (protocol reference) — read it for the Realtime *event* semantics, not as a dependency.**

**C22 — `snakers4/silero-vad`** https://github.com/snakers4/silero-vad — **10 482 ★** /873 f · created **2020-11-23** · last release **v6.2.3, 2026-09-23** (2 in 6 m) · pushed 2026-09-29 · 16 open issues · **licence CONTRADICTION (already flagged in ADR-004): the repository's `LICENSE` is MIT, the README badge says CC BY-NC 4.0** → **UNVERIFIED until we read the file in our own tree** · **22 commits/90 d, 7 humans** · on-device: **yes (ONNX, tiny)**.
**DECISION: KEEP ONLY through sherpa-onnx's bundled VAD** — do not vendor Silero's weights directly until the licence contradiction is closed by reading the file ourselves (ADR-004 risk row 2).**

**C23 — `k2-fsa/sherpa-onnx`** ⭐ https://github.com/k2-fsa/sherpa-onnx — **15 401 ★** /1 803 f · created **2022-09-01** · last release **v1.13.8, 2026-09-10** (17 of 20 in 6 m) · pushed 2026-10-20 · **646 open issues** · **Apache-2.0** (code *and* most bundled models per ADR-004) · **100+ commits/90 d, 38 humans** · PyPI `sherpa-onnx` 1.13.8 (2026-09-10), `requires-python >=3.7` · **commercial: YES** · on-device: **yes** — STT, TTS, VAD, KWS and LID in one C++ runtime with ONNX models · our mobile app already ships **`react-native-sherpa-onnx` 0.4.4 (MIT, modified 2026-09-08)**.
**DECISION: KEEP (ADR-004 already locked this) — it is the on-device half of the voice plan and the VAD that Smart Turn pairs with.**

**C24 — `OpenVoiceOS/ovos-core`** https://github.com/OpenVoiceOS/ovos-core — **297 ★** /30 f · created **2021-02-18** · last release **3.7.4a1, 2026-10-08** (**20 of 20 in 6 m**) · pushed 2026-10-08 · 17 open issues · **Apache-2.0** · **100+ commits/90 d, 2 humans** (goldyfruit, JarbasAl) · on-device: **yes** (the wyoming protocol exposes models to a local server).
**Why it matters:** the most mature **fully offline** voice stack with a plugin protocol; its "utterance → intent → skill → action" shape is close to our typed tool catalogue with a confirmation policy.
**DECISION: WATCH (offline design reference) — read it for the offline protocol, not as our framework.**

**C25 — `rhasspy/rhasspy`** https://github.com/rhasspy/rhasspy — **2 750 ★** /207 f · created 2020-01-08 · **ARCHIVED** · last push 2025-04-22 · 131 open issues · MIT · 0 commits/90 d. **DECISION: REJECT — dead; superseded by OpenVoiceOS.**

**C26 — `xzf-thu/VoiceMem`** https://github.com/xzf-thu/VoiceMem — **2 608 ★** /244 f · **created 2026-08-17** · last release **v0.0.2, 2026-09-01** · pushed 2026-09-14 · 7 open issues · **Apache-2.0** · **78 commits/90 d, 5 humans** · long-term memory for voice agents. **DECISION: WATCH — relevant to door memory and the "remember my rules" feature (T7.3), but it is an application, not a framework.**

**C27 — `NVIDIA-AI-Blueprints/nemotron-voice-agent`** https://github.com/NVIDIA-AI-Blueprints/nemotron-voice-agent — **243 ★** /67 f · created **2026-01-15** · last release **v2.3.0, 2026-10-19** (5 in 6 m) · pushed 2026-10-19 · 14 open issues · licence API **NOASSERTION**; the raw file read 2026-10-21: *"This code is dual-licensed with documentation/skills/assets under the **CC-BY-4.0** AND source code under **Apache-2.0**"* → **the code is Apache-2.0 (fine to vendor); the skills/assets are CC-BY-4.0 (a content licence — fine to read and quote with attribution, awkward to vendor as code)** · **100+ commits/90 d, 5 humans**.
**DECISION: WATCH — its barge-in/interruption handling is a reference; the skills are clean-room-study material only.**

**C28 — `google-gemini/gemini-live-api-examples`** https://github.com/google-gemini/gemini-live-api-examples — **556 ★** /195 f · created **2026-02-14** · pushed 2026-10-20 · 29 open issues · **no releases, no LICENSE file at all** → licence **UNVERIFIED** · on-device: no.
**DECISION: WATCH (barge-in semantics reference only) — we cannot adopt the closed Gemini Live API as our server (privacy + cost + D7).**

**C29 — `AgoraIO-Community/convoai-jev-vad`** https://github.com/AgoraIO-Community/convoai-jev-vad — **21 ★** · **created 2026-09-23** · pushed 2026-09-23 · 0 open issues · **MIT** · *"Jev VAD: client-side turn detection for Agora Conversational AI — manual SoS/EoS and automatic turn detection"*.
**DECISION: WATCH — it is the only open implementation of a *hosted conversational-AI* turn detector, and it is client-side. Useful to read how Agora's end-of-speech detection works; the Agora service itself is a hosted call, not something we can ship.**

**C30 — `streamcoreai/streamcore-server`** https://github.com/streamcoreai/streamcore-server — **235 ★** · **created 2026-03-28** · pushed 2026-09-25 · 19 open issues · **Apache-2.0** · *"Open-source realtime voice agent server in Go with WebRTC (WHIP), barge-in, streaming STT/"* · on-device: no · the strongest 2026 newcomer in Go.
**DECISION: WATCH — the only OSS Go realtime voice server with explicit barge-in; a challenger to track per §12.6.**

**C31 — `pipecat-ai/whisker`** https://github.com/pipecat-ai/whisker — **136 ★** /12 f · created **2025-08-14** · last release **v2.0.1, 2026-08-19** · pushed 2026-10-19 · **0 open issues** · **BSD-2-Clause** · **25 commits/90 d, 2 humans** · a real-time Pipecat debugger.
**DECISION: ADOPT (dev tooling) — free, first-party, and it shortens the barge-in debugging loop. Costs nothing and touches no shipped code.**

**C32 — `pipecat-ai/pipecat-flows`** https://github.com/pipecat-ai/pipecat-flows — **627 ★** /118 f · created 2024-11-16 · last release v1.4.0 (2026-07-05) · **ARCHIVED** · **0 commits/90 d** · BSD-2-Clause. **DECISION: KEEP as a Pipecat *feature* — Flows now lives at `src/pipecat/flows/` in the main package (verified in the tree); do not depend on the archived repo.**

**C33 — `pipecat-ai/pipecat-mcp-server`** https://github.com/pipecat-ai/pipecat-mcp-server — **154 ★** · created 2026-01-23 · last release **v0.0.12, 2026-02-11** · **0 releases in 6 m** · BSD-2-Clause · Pipecat exposed over MCP.
**DECISION: WATCH — confirms our voice stack already speaks MCP; it is a demonstration, not a service.**

**C34 — `kyutai-labs/delayed-streams-modeling`** https://github.com/kyutai-labs/delayed-streams-modeling — **3 041 ★** · created 2025-06-16 · pushed 2026-01-26 · 37 open issues · **Apache-2.0** · the Kyutai STT/TTS family. **DECISION: WATCH — the reference for streaming codec work; not our runtime.**

**C35 — `pheonix-delta/axiom-voice-agent`** https://github.com/pheonix-delta/axiom-voice-agent — **146 ★** /1 open issue · created 2026-02-04 · pushed 2026-05-24 · **Apache-2.0** · *"Run a <400ms latency Voice Agent on just 4GB VRAM. Fully offline, no API keys required."* **DECISION: WATCH — the "fully offline voice agent" claim is the shape we want for the offline path; the numbers are the project's own, UNVERIFIED by us.**

**C36 — `nrl-ai/edgevox`** https://github.com/nrl-ai/edgevox — **18 ★** · created 2026-04-11 · pushed 2026-08-09 · 0 open issues · **Apache-2.0** · *"Offline voice agent framework for robots — agents, skills, workflows, sub-second voice pipeline"*.
**DECISION: WATCH (offline challenger) — too small to matter yet; on the radar.**

**C37 — `h1papc11/voice-mcp-agent`** https://github.com/h1papc11/voice-mcp-agent — **139 ★** · created 2026-06-26 · pushed 2026-09-14 · **MIT** · MCP ⇄ voice bridge. **DECISION: WATCH — the typed-tool-catalogue shape; the bridge pattern we may need in `services/voice`.**

**C38 — 2026 challenger cohort (grouped)** — `leon-ai/leon` **17 594 ★** MIT created 2019-02-10 pushed 2026-10-20 117 open (the most mature open personal-assistant platform; our own licence check now says **MIT**, so it moves off the old §11.2 clean-room list) · `dograh-hq/dograh` **5 914 ★** BSD-2-Clause pushed 2026-10-20 100 open (a Pipecat-based voice SaaS — read its issue list for real Pipecat pain points) · `buxuku/SmartSub` **5 781 ★** MIT pushed 2026-10-20 56 open (a sherpa-onnx consumer in production) · `rapidaai/voice-ai` **748 ★** **NOASSERTION** pushed 2026-10-20 (Go) · `zavora-ai/adk-rust` **717 ★** **NOASSERTION** pushed 2026-10-20 3 open (a Rust realtime runtime — a challenger if Python is rejected) · `spaceamoeba-t/tapq` **707 ★** Apache-2.0 pushed 2026-09-16 (Swift) · `Deuz-AI/Deuz-SDK` **538 ★** MIT pushed 2026-10-16 (TypeScript, zero deps) · `GizClaw/flowcraft` **416 ★** MIT pushed 2026-10-20 5 open (Go) · `sonichi/sutando` **398 ★** MIT pushed 2026-10-20 **1 401 open** (a 2026 newcomer with a very high issue count) · `XiyaoWang0519/agent-call` **298 ★** MIT pushed 2026-10-13 (an MCP server for safe, stateful phone calls with OpenAI Realtime + Twilio) · `PatterAI/Patter` **1 076 ★** MIT created 2026-04-07 pushed 2026-10-03 11 open · `ServiceNow/eva` **231 ★** MIT created 2026-03-24 pushed 2026-10-19 22 open · `ferosai/feros` **112 ★** Apache-2.0 pushed 2026-05-25 · `COSS-India/VoicEra` **318 ★** Apache-2.0 pushed 2026-10-19 · `openspline/openspline` **247 ★** MIT created **2026-09-29** pushed 2026-10-18 (days old) · `second-state/echokit_server` **592 ★** **GPL-3.0** pushed 2026-02-15 → **REJECT (copyleft)** · `miuda-ai/active-call` **192 ★** **licence UNVERIFIED** (Rust, SIP/WebRTC) · `bentoml/BentoVoiceAgent` **134 ★** licence UNVERIFIED · `aicc2025/sip-to-ai` **114 ★** Apache-2.0 (telephony scope — not v1) · `NVIDIA-AI-Blueprints` see C27.
**DECISION: WATCH (group) — tracked monthly per §12.6; `second-state/echokit_server` REJECT (GPL-3.0).**

---

## 2. Shortlist (13) and decisions

| # | Project | Decision | One-line reason |
|---|---|---|---|
| C1 / C10 | **pipecat-ai/pipecat + pipecat-ai/smart-turn** | **KEEP + ADOPT** | Already our dependency; BSD-2; a swappable turn-strategy subsystem; and Smart Turn v3.2 is the **only licence-clean (BSD-2 code+weights+data), 8 MB, 23-language, on-device** semantic turn detector in the pool. |
| C3 | **huggingface/speech-to-speech** | **ADOPT (protocol)** | Speaks the **OpenAI Realtime protocol over WS and WebRTC**; v1.0.0 (2026-09-06); verified production use (Reachy Mini); makes our client framework-agnostic. |
| C2 | **livekit/agents** | **WATCH (metrics + ideas)** | Near-daily releases, 53 humans; shipped adaptive interruption (≤ 30 ms, 64 % faster than VAD), dynamic endpointing and per-turn latency metrics — but its turn-model weights are **locked to LiveKit Agents**. |
| C23 | **k2-fsa/sherpa-onnx** | **KEEP (ADR-004)** | Apache-2.0 code and weights; STT+TTS+VAD+KWS+LID in one runtime; already on the phone via `react-native-sherpa-onnx@0.4.4`. |
| C11 / C13 | **pipecat client + websocket transport** | **KEEP** | BSD-2, pure-JS client, weekly releases; the RN link is a separate decision because the RN transports pull a native WebRTC fork. |
| C31 | **pipecat-ai/whisker** | **ADOPT (dev tooling)** | First-party realtime debugger; free; shortens the barge-in debug loop; touches no shipped code. |
| C24 | **OpenVoiceOS/ovos-core** | **WATCH (offline reference)** | The mature fully-offline voice stack and the wyoming protocol — the design reference for our offline behaviour. |
| C8 | **QwenAudio/qwen-audio-agent** | **WATCH** | 2026-native runtime (20 releases in 3 months, 12 humans) and the natural home of the Apache-2.0 Qwen3 ASR/TTS pair ADR-004 picked. |
| C6 / C30 | **kyutai-labs/moshi · streamcoreai/streamcore-server** | **WATCH (research + challenger)** | Moshi is the full-duplex latency floor (160 ms theoretical / 200 ms on an L4 GPU) but is **stalled since 2026-05-16**; streamcore is the strongest 2026 newcomer (Go, WebRTC/WHIP, barge-in) and the anti-bias challenger we must track. |
| C29 | **AgoraIO-Community/convoai-jev-vad** | **WATCH** | The only open client-side turn detector for a hosted conversational-AI service; reads as a reference. |
| C35 / C36 | **axiom-voice-agent · edgevox** | **WATCH (offline challengers)** | Both claim a fully offline, sub-second voice agent — the shape of our offline path, at 146★ and 18★. |
| C27 / C28 / C33 / C37 | **NVIDIA blueprint · gemini-live-examples · pipecat-mcp-server · voice-mcp-agent** | **WATCH (references)** | Barge-in semantics, Gemini Live turn handling, MCP as the voice⇄tool bridge. |
| C4 / C5 | **TEN-framework · ten-vad** | **REJECT (licence)** | Apache-2.0 **plus an Agora field-of-use**: ten-framework forbids hosting on "End User devices, including … mobile terminal devices" and forbids competing with Agora. |
| C7 / C9 / C25 / C16 / C19 / C20 | **ultravox · vocode · rhasspy · livekit server · daily-python · daily-js** | **REJECT** | Dormant or dead (ultravox 0 commits/90 d, vocode dead 2 years, rhasspy archived), or an SFU/cloud we do not need. |

---

## 3. Deep review — top 5 (code, commits, PRs and issues opened in 2026)

### 3.1 Pipecat (C1) + Smart Turn (C10) — **keep, and adopt the model**

**Code read (2026-10-21, via `gh api repos/pipecat-ai/pipecat/contents/…`):**

- `src/pipecat/audio/turn/smart_turn/local_smart_turn_v3.py` (184 lines). Header: `Copyright (c) 2024-2026, Daily` / `SPDX-License-Identifier: BSD 2-Clause License`. Class docstring: *"Local turn analyzer using the smart-turn-v3 ONNX model. Provides end-of-turn detection using locally-stored ONNX model, **enabling offline operation without network dependencies**."* Constructor defaults to the **bundled** `smart-turn-v3.2-cpu.onnx` from `pipecat.audio.turn.smart_turn.data`; `_MODEL_SAMPLE_RATE = 16000`; ONNX Runtime session built with `ExecutionMode.ORT_SEQUENTIAL`, `intra_op_num_threads = cpu_count` (default **1**), `GraphOptimizationLevel.ORT_ENABLE_ALL`. → **This is our offline turn decision, verified in code.**
- `src/pipecat/turns/user_stop/speech_timeout_user_turn_stop_strategy.py` (329 lines). The docstring is the whole story: *"After the user stops speaking (detected by VAD), this strategy runs two independent timers. The user turn stop is triggered **only when both have finished and at least one transcript has been received**: `user_speech_timeout` (policy floor, default **0.6 s**) … and `stt_timeout` (safety net for STT latency) … Short-circuited when the STT service emits a finalized transcript."* Fallback: *"when a transcript arrives without a VAD stop event, the `user_speech_timeout` timer measures inactivity since the last transcript (rearmed on each transcript)."* → **the offline failure mode is real and it is in this file: if the STT is remote and the network drops mid-turn, the turn never closes.**
- `src/pipecat/turns/user_start/min_words_user_turn_start_strategy.py` (125 lines). Signals the start of a user turn once the courier has spoken **at least N words**, using `TranscriptionFrame` and optionally `InterimTranscriptionFrame` (`use_interim: bool = True`) for earlier detection; it tracks `BotStartedSpeakingFrame` / `BotStoppedSpeakingFrame` to reset the word count. → **this is the anti-barge-in-thrash primitive for a noisy van: the agent waits for words, not for sound.**
- The tree (2 252 paths) confirms the strategy matrix: 6 user_start, 7 user_stop, 5 user_mute, plus `eager_end_of_turn_mixin.py`, `speculation_gate.py`, `user_turn_controller.py`, `user_turn_processor.py`, and `observers/turn_tracking_observer.py` + `utils/tracing/turn_trace_observer.py`.

**Cadence.** v1.13.0 on 2026-10-19; 15 of the last 20 releases inside 6 months; **100+ commits/90 d** with 8 humans in the window (aconchillo, DEVJHAWAR11, filipi87, LArmstrongDev, markbackman, martinstiago …). The client repo `pipecat-client-web` shipped 19 of 20 releases in 6 months, 63 commits/90 d, 6 humans.

**Real 2026 issues (opened in the window, with dates):**
- **#6201** (2026-10-16, open) *"FilterIncompleteUserTurnStrategies + FunctionCallUserMuteStrategy: bot g…"* — a turn-strategy composition bug. https://github.com/pipecat-ai/pipecat/issues/6201
- **#6218** (2026-10-17, open) *"TTSService never flushes its stream resampler: every synthesis loses its…"* — a resampler defect on every synthesis. https://github.com/pipecat-ai/pipecat/issues/6218
- **#6247** (2026-10-20, open) *"Trace realtime LLM services as one llm_response span per reply."* — we need this for per-turn tracing. https://github.com/pipecat-ai/pipecat/issues/6247
- **#6256** (2026-10-20, open) *"Sentence-final mark reported as its own word is misattributed or recorded…"* — punctuation leaking into the transcript, which matters for an address parser. https://github.com/pipecat-ai/pipecat/issues/6256
- **#6252** (2026-10-20, open) *"FalSTTService never closes the aiohttp session it creates."* — a socket leak in an STT service. https://github.com/pipecat-ai/pipecat/issues/6252
- **#6254** (2026-10-20, open) *"AWSPollyTTSService opens a new client and connection for every sentence."* — a per-sentence connection, i.e. a latency and battery bug. https://github.com/pipecat-ai/pipecat/issues/6254
- **#6162** (2026-10-13, closed) *"Every DailyTransport pipeline loops forever once the call is gone…"* — the transport does not terminate on call end. https://github.com/pipecat-ai/pipecat/issues/6162
- **#6185** (2026-10-15, closed) *"AnthropicLLMService: a refused turn ends in silence, with nothing logged."* — **a refused turn must not be silent**; this is a courier-trust bug. https://github.com/pipecat-ai/pipecat/issues/6185

**Real 2026 PRs:** **#6260** (2026-10-20, open) *"fix(transports): fade in-flight playout audio on interruption and …"* — that is the barge-in click fix, and it is *not yet merged*. https://github.com/pipecat-ai/pipecat/pull/6260 · **#6251** (2026-10-20, merged) *"Bound websocket sends so a peer that stops reading can't stall the…"* https://github.com/pipecat-ai/pipecat/pull/6251 · **#6259** (2026-10-20, merged) *"Default GoogleVertexLLMService to gemini-3.8-flash"* https://github.com/pipecat-ai/pipecat/pull/6259.

**Licence.** Repo **BSD-2-Clause**; the bundled `src/pipecat/audio/turn/smart_turn/data/smart-turn-v3.2-cpu.onnx` is inside a BSD-2 repo, and the upstream `pipecat-ai/smart-turn` project is BSD-2 for code, weights, data and training script. **A hosted service we call is fine; a model we ship inside the app is fine here** — this is the only turn detector in the pool where both are true.

**Verdict: KEEP Pipecat and ADOPT Smart Turn v3.2 as our on-device turn decision.** The two weaknesses we must design around are the `wait_for_transcript=True` hang (§3.1, file `speech_timeout_user_turn_stop_strategy.py`) and the fact that the RN transports are still 1.x but depend on a native WebRTC fork.

### 3.2 LiveKit Agents (C2) — **the metrics vocabulary and the adaptive-interruption idea, not the platform**

**What shipped in 2026, read from the docs and the release notes:**
- `livekit-agents@1.5.0` (published **2026-03-19T17:01:15Z**, https://github.com/livekit/agents/releases/tag/livekit-agents%401.5.0): **preemptive generation on by default** (start LLM/TTS inference *before* the end of the user's turn is detected — `preemptive_generation=False` to disable); **adaptive interruption handling** on by default ("**86 % precision and 100 % recall at 500 ms overlapping speech**, rejects **51 % of traditional VAD false positives**, detects true interruptions **64 % faster** than VAD alone, **inference completes in 30 ms or less**"); **dynamic endpointing** (`endpointing={mode:"dynamic", min_delay:0.3, max_delay:3.0}`); and **per-turn latency metrics on `ChatMessage.metrics`** — `transcription_delay`, `end_of_turn_delay`, `on_user_turn_completed_delay`.
- The **audio** turn detector (blog **2026-06-17**, https://livekit.com/blog/solving-end-of-turn-detection): `v1` (full model, LiveKit-hosted inference) and `v1-mini` (open-weight, runs locally on CPU). Published operating points, quoted: *"At a 300 ms latency budget, it reaches a 9.9 % false-cutoff rate, compared with 12.9 % for Deepgram Flux and 27.7 % for ultraVAD. At 600 ms, it reaches 4.5 %, ahead of Soniox at 5.5 % and Deepgram Flux at 9.9 %."* and *"at a 5 % false-cutoff target it reaches 543 ms mean latency, and at 10 % it reaches 295 ms."* Endpointing defaults with the model on: `min_delay` **0.5 s → 0.3 s**, `max_delay` **3.0 s → 2.5 s**; *"The audio turn detector requires VAD, and the VAD's `min_silence_duration` must be at least 0.25 seconds."*
- The older **text** turn detector (Qwen2.5-0.5B-Instruct, INT8 ONNX): **396 MB on disk, ~50–160 ms per turn**, < 500 MB RAM, CPU-only, 14 languages, and the model card lists per-language TPR/TNR (English 99.3 % / 87.0 %; Hindi 99.4 % / 96.3 %). It is **deprecated** and *"slated for removal in version 2.0"*.

**Licence — the decisive fact.** The **model weights** are under the proprietary **LiveKit Model License**, clause 3.b(i): *"not to use any LiveKit Models on a standalone basis or with any frameworks other than LiveKit Agents."* The **framework code** is Apache-2.0. So: *calling* LiveKit's hosted inference from our own service is a hosted-service use (acceptable in principle, and it is free for agents hosted on LiveKit Cloud, **$0.50/1 000 requests** self-hosted); *shipping or porting the weights into our app or into Pipecat* is **not permitted**. **The framework is Apache-2.0 and commercially usable; the model is not portable.**

**Real 2026 issues:** **#7972** (2026-10-20, open) *"ElevenLabs Scribe v2 Realtime: turns never commit without server_vad, an…"* https://github.com/livekit/agents/issues/7972 · **#7960** (2026-10-19, open) *"Deepgram Flux + explicit VAD: underreports transcription_delay"* — **their own latency metric is wrong in a combination we would use**, which is exactly why our benchmark must measure it ourselves https://github.com/livekit/agents/issues/7960 · **#7948** (2026-10-19, open) *"Interim transcript after a preflight (Deepgram Flux `TurnResumed`) does…"* https://github.com/livekit/agents/issues/7948 · **#7924** (2026-10-18, open) *"krisp VIVA: native filter is built on the event loop on the first audio…"* — **an event-loop block on the audio path** is the single worst failure mode for our ≤ 8 %/h battery and latency budget https://github.com/livekit/agents/issues/7924 · **#7921** (2026-10-18, open) *"SpeakingRateStream blocks event loop 100–200 ms on TTS audio bursts"* https://github.com/livekit/agents/issues/7921 · **#7987** (2026-10-20, open) *"livekit-plugins-google: `conn_options.timeout` is a whole-request deadline…"* https://github.com/livekit/agents/issues/7987.

**Real 2026 PRs:** **#7980** (2026-10-20, merged) *"fix: prevent stale avatar clear timeouts from finishing new replies"* https://github.com/livekit/agents/pull/7980 · **#7978** (2026-10-20, open) *"fix(elevenlabs): propagate non-retryable STT errors instead of swallowing them"* — the same class of bug as Pipecat #6185 https://github.com/livekit/agents/pull/7978 · **#7983** (2026-10-20, open) *"feat: add FaxDetector for fax calling-tone detection"* — telephony scope, not ours.

**Verdict: WATCH.** Take three things: (a) the **metric names** (`transcription_delay`, `end_of_turn_delay`, `on_user_turn_completed_delay`) so our harness is comparable; (b) **dynamic endpointing** (an EMA of the conversation's pause rhythm beats a fixed silence threshold in a van); (c) **adaptive interruption** (a model that rejects backchannels — in a courier's van, a radio or a passenger's "mm" is a constant false-barge-in source). Do **not** adopt the platform: we do not want a media server, and we cannot port the model.

### 3.3 Smart Turn v3.2 (C10) — **the licence-clean on-device turn model**

**Code and files read:**
- HF `pipecat-ai/smart-turn-v3` file list (fetched 2026-10-21): `smart-turn-v3.0.onnx` 8.76 MB (added ~1 year ago), `smart-turn-v3.1-cpu.onnx` 8.68 MB (11 months ago), `smart-turn-v3.1-gpu.onnx` 32.4 MB, **`smart-turn-v3.2-cpu.onnx` 8.68 MB (10 months ago)**, `smart-turn-v3.2-gpu.onnx` 32.4 MB.
- Repo README: backbone **Whisper Tiny encoder + shallow linear classifier, 8 M params**; *"CPU inference: 12 ms on modern CPUs, 60 ms on a low cost AWS instance. No GPU required"* (daily.co blog, **2025-09-11**); *"Supports **23 languages**"*; *"Works in conjunction with a lightweight VAD model like Silero, meaning Smart Turn only needs to run during periods of silence"*; *"The datasets, training script, and model weights are all open source."*
- Pipecat docs: *"Pipecat provides `LocalSmartTurnAnalyzerV3` which runs inference locally using ONNX. This is the recommended approach due to the fast CPU inference times in Smart Turn v3."* and *"The Smart Turn model weights are bundled with Pipecat, so no need to download these separately."*
- The bundled file exists in our own dependency: `src/pipecat/audio/turn/smart_turn/data/smart-turn-v3.2-cpu.onnx` (verified in the repo tree).

**Licence.** **BSD-2-Clause** for the code, the weights, the datasets and the training script. **This is the one turn detector we can put inside a closed-source commercial app** without a field-of-use clause, a non-commercial clause, or a "only with framework X" clause.

**Why it matters for a NZ courier.** 23 languages, which covers Arabic, Hindi, Mandarin, Indonesian (Malay) and English — but **not te reo Māori, Samoan or Tongan**. Those three are the NZ gap ADR-004 flags, and Smart Turn does not close it. Our own eval set must say so out loud.

**Real 2026 issues (the model repo, not the framework):** **#41** (2026-07-08, open) *"High false positives for Incomplete predictions"* — **the model predicts "not finished" too often**, which in a van means the assistant waits through a finished command https://github.com/pipecat-ai/smart-turn/issues/41 · **#42** (2026-08-18, open) *"Narrowband (8 kHz telephony) input — is there a phone-band eval…"* — **the training audio is wideband and the phone-band case is unevaluated**; a courier's phone microphone in a van is a phone-band problem, and the answer is not published https://github.com/pipecat-ai/smart-turn/issues/42 · **#43** (2026-08-26, open) *"Dataset contribution: Tamil - 18 485 labelled samples from real te…"* — the community is extending the language coverage, which is how we would get te reo/Pacific languages in https://github.com/pipecat-ai/smart-turn/issues/43 · **#38** (2026-03-28, open) *"Training information"* and **#39** (2026-05-09, open) *"How to match onnx and pth?"* — the reproducibility of the checkpoint is not fully documented.
**Real 2026 PRs:** **#45** (2026-10-11, open) *"Optional telephony channel augmentation for training (#42)"* — **the narrowband gap is being worked on, and it is exactly our #42** https://github.com/pipecat-ai/smart-turn/pull/45 · **#40** (2026-05-27, open) *"Package Smart Turn as Python package"* — the model is still consumed as a raw ONNX file, which is why Pipecat bundles it https://github.com/pipecat-ai/smart-turn/pull/40 · **#37** (2026-01-06, closed) *"Hebrew training v1"*.

**Verdict: ADOPT.** It is BSD-2, 8.68 MB, 12 ms on a CPU, audio-native (so it uses prosody, not just the transcript), and it can run on the phone. It is the reason our offline path is viable at all. **Two caveats we must measure, not assume: the false-positive rate on "incomplete" predictions (#41) and the narrowband (8 kHz) case (#42) — the latter is the honest risk for a phone microphone in a van.**

### 3.4 OpenAI Realtime (C21 + the protocol) — **the wire format, not the dependency**

**Read from the API reference and the VAD guide (fetched 2026-10-21):**
- Two turn-detection modes on the Realtime session: **`server_vad`** (default; `threshold` 0.5, `prefix_padding_ms` 300, `silence_duration_ms` 500, plus `create_response`, `interrupt_response`, `idle_timeout_ms`) and **`semantic_vad`** (*"Chunks the audio when the model believes, based on the words said by the user, that they have completed their utterance"*), with `eagerness` ∈ {`auto`(=medium), `low`, `medium`, `high`}. **Documented max timeouts: `low` 8 s, `medium` 4 s, `high` 2 s.** *"Semantic VAD … can be useful for more natural conversations, but may have a higher latency."*
- `interrupt_response` (*"Whether to automatically interrupt (cancel) any ongoing response with output … when a VAD start event occurs"*) is the barge-in switch, and it is separate from turn detection.
- Transcript models `gpt-live-transcribe` and `gpt-realtime-whisper` **require `turn_detection: null`** (or `input_audio_buffer.commit`).
- Model list on the same page includes `gpt-realtime`, `gpt-realtime-1.5`, `gpt-realtime-2`, `gpt-realtime-2.1`, `gpt-realtime-2.1-mini`, `gpt-realtime-mini`, `gpt-audio-1.5`, `gpt-audio-mini`, `gpt-live-1`.
- `openai/openai-realtime-agents` (the reference agent patterns) is **MIT but stale** — last commit 2026-01-07, no releases, 0 commits/90 d. Its **2026 issues are still open**: **#129** (2026-04-26, open) *"Realtime does not execute tool calls"* — **the reference implementation for tool calls in a realtime session is itself broken**, which is a strong argument for our own protocol handling https://github.com/openai/openai-realtime-agents/issues/129 · **#113** (2025-10-09, open) *"How to get 'response.text.delta' event from the Agent response"* and **#112** (2025-10-09, open) *"Assistant's Messages Are Being Wiped"* — **conversation history loss**, the exact failure a courier would notice. Its **2026 PRs are still unmerged**: **#140** (2026-09-30, open) *"Reset session state when connect() fails"* — **a failed connect must reset the session state**, or the next session starts with the previous session's audio https://github.com/openai/openai-realtime-agents/pull/140 · **#139** (2026-09-30, open) *"Release the microphone and AudioContext when recording stops"* — **not releasing the microphone is a battery and privacy bug on Android** https://github.com/openai/openai-realtime-agents/pull/139 · **#138** (2026-09-14, open) *"feat: support a maximum realtime session duration"* — **a session-duration cap**, which is exactly the cost control our COST_PLAN needs https://github.com/openai/openai-realtime-agents/pull/138.

**Pricing (platform.openai.com/docs/pricing, fetched 2026-10-21), relevant to our cost table:** `gpt-live-1` voice sessions are **billed per second at $0.05/minute** (*"Backend model and tool usage is charged separately"*); `gpt-realtime-mini` audio **$10.00 in / $20.00 out per 1 M tokens**; `gpt-realtime` audio **$32.00 in / $64.00 out per 1 M tokens**; `gpt-live-transcribe` ≈ **$0.017/minute**; `gpt-transcribe` ≈ $0.0045/minute.

**Verdict: ADOPT the protocol, not the service.** The `server_vad` / `semantic_vad` split and the `interrupt_response` switch are the semantics our client should speak, so we can point the same client at our own service, at `speech-to-speech`, or at a vendor if we ever have to. We do **not** adopt the hosted API as our default: D12/D7 want our own perimeter and a free-first chain, and the per-minute cost is an order of magnitude above the on-device path.

### 3.5 `huggingface/speech-to-speech` (C3) — **the production reference**

**Read:** README (Apache-2.0) — a single local pipeline, every stage swappable, default **Silero VAD → Parakeet TDT → Qwen3.5-4B → Qwen3-TTS**; it *"speaks the OpenAI Realtime protocol over **both WebSocket and WebRTC**"*; Python 3.11–3.14; **v1.0.0 released 2026-09-06** after ~2 years of development; and the production claim *"runs in production as the conversation backend for thousands of Reachy Mini robots"*.

**Cadence:** 5 releases (4 in 6 m), 100+ commits/90 d, 9 humans, 53 open issues.

**Real 2026 issues (this is the part worth reading — they are the real-world failure list):**
- **#703** (2026-10-11, closed) *"Silero VAD state is only reset at session end; short utterances are miss…"* — **VAD state leaking between turns**; in a van this is a missed command. https://github.com/huggingface/speech-to-speech/issues/703
- **#704** (2026-10-11, closed) *"Loading Silero VAD sets torch to one thread process-wide; CPU STT runs 2…"* — **a VAD import throttling the whole process to one thread**; that is a latency bug caused by the detector. https://github.com/huggingface/speech-to-speech/issues/704
- **#712** (2026-10-12, open) *"Expose VAD threshold and barge-in controls in microphone clients and pre…"* — **they are adding barge-in controls because the defaults were not enough.** https://github.com/huggingface/speech-to-speech/issues/712
- **#718** (2026-10-13, closed) *"Do not reuse stale speech-end timestamps for independent Realtime respon…"* — stale turn timestamps corrupting a later turn. https://github.com/huggingface/speech-to-speech/issues/718
- **#724** (2026-10-15, open) *"Realtime: immediate retry after response.cancel can complete with no out…"* — a cancelled turn still producing output. https://github.com/huggingface/speech-to-speech/issues/724
- **#695** (2026-10-09, closed) *"Realtime function call IDs are longer than 32 characters"* — **a hard tool-call-id length limit in the Realtime protocol**; our tool catalogue must keep ids ≤ 32 chars or we will hit it. https://github.com/huggingface/speech-to-speech/issues/695
- **#716** (2026-10-12, open) *"Add extensible streaming DAG pipelines to YAML configuration"* — the pipeline is being made declarative, which is where our tool catalogue should plug in. https://github.com/huggingface/speech-to-speech/issues/716
- **#714** (2026-10-12, open) *"Turn-level event timeline beyond aggregate latency?"* — **they do not have per-turn latency events either**; our harness needs to build them. https://github.com/huggingface/speech-to-speech/issues/714

**Verdict: ADOPT (protocol + pipeline reference).** It proves the OpenAI-Realtime wire format is implementable open-source, it proves a fully local voice stack is production-grade, and its issue list is the best available catalogue of turn-taking bugs. Its default model stack is **not** ours (a GPU box, and the Qwen checkpoints' licences are unverified for our commercial use).

---

## 4. Benchmark (V4 §12.5) — **UNVERIFIED: no eval set exists**

**I did not run a benchmark and I will not invent one.** `docs/squads/voice/eval/` does not exist; `docs/squads/voice/benchmarks/` contains only a `README.md` (checked 2026-10-21). `services/voice` does not exist. Every number below is either a **vendor claim** (labelled) or **UNVERIFIED**.

### 4.1 The comparison table (all latency figures are vendor claims, none reproduced by us)

| | **Pipecat + Smart Turn v3.2 local** | **LiveKit Agents + audio turn detector v1** | **OpenAI Realtime `semantic_vad`** | **speech-to-speech (local stack)** |
|---|---|---|---|---|
| **End-of-speech → first agent audio** | **UNVERIFIED.** Building blocks: Smart Turn v3 CPU inference **12 ms on modern CPUs / 60 ms on a low-cost AWS instance** (daily.co, 2025-09-11 — *vendor claim*); Silero VAD silence window (Pipecat's default `user_speech_timeout` **0.6 s**); Pipecat's default stop strategy since v0.0.102 is `TurnAnalyzerUserTurnStopStrategy` + `LocalSmartTurnAnalyzerV3`. **Measured end-to-end: UNVERIFIED** | **UNVERIFIED.** LiveKit's published frontier: **295 ms mean latency at a 10 % false-cutoff budget, 543 ms at a 5 % budget** (livekit.com blog 2026-06-17 — *vendor claim*). With the model on, endpointing defaults tighten to `min_delay` 0.3 s / `max_delay` 2.5 s | **UNVERIFIED.** `semantic_vad` has a **dynamic timeout with documented maxima of 8 s (`low`) / 4 s (`medium`) / 2 s (`high`)** — the *worst case* is therefore 2–8 s of silence before the agent answers, and `high` is the only setting that fits our 1–3 s budget | **UNVERIFIED.** Full local pipeline on a GPU box; the project publishes no end-to-end number |
| **Barge-in behaviour** | **UNVERIFIED.** Mechanism verified in code: `MinWordsUserTurnStartStrategy(min_words=N, use_interim=True)` starts a user turn only after N words; `speech_timeout_user_turn_stop_strategy.py` runs a 0.6 s policy floor. **Pipecat PR #6260 (2026-10-20, still open) "fade in-flight playout audio on interruption"** proves the click-on-barge-in problem is **not yet solved upstream** | **UNVERIFIED.** Adaptive interruption: 86 % precision / 100 % recall at 500 ms overlap, rejects 51 % of VAD false positives, 64 % faster than VAD, **≤ 30 ms inference** (v1.5.0 notes, 2026-03-19 — *vendor claim*); on a false interruption the agent *"automatically resumes playback from where it left off"* | **UNVERIFIED.** `interrupt_response: true` cancels the in-flight response on a VAD start event; `server_vad` `silence_duration_ms` default 500 ms | **UNVERIFIED.** Issue **#712 (2026-10-12)** is still adding barge-in controls |
| **On-device vs hosted** | **On-device for the turn decision**: Smart Turn v3.2 ONNX, 8.68 MB, bundled in the `pipecat-ai` wheel, `ORT_SEQUENTIAL`, 1 thread. **Hosted for the LLM** (our own service). STT/TTS on device via `react-native-sherpa-onnx@0.4.4` | **Hosted** for `v1` (LiveKit inference, free on LiveKit Cloud, **$0.50/1 000 requests** self-hosted); **self-hosted** for `v1-mini` (CPU) — but the weights are **LiveKit-Model-Licence only** | **Fully hosted** | **Fully local, but on a GPU box** (Qwen3.5-4B + Qwen3-TTS) |
| **Cost per courier-day** | **UNVERIFIED.** Derivation: an 8-hour shift is 480 min. Marginal cost of the on-device path is **$0** for the turn decision; the LLM and TTS still cost whatever we choose. **Our own assumption (not a vendor figure): 40 voice commands/shift × 40 s of assistant speech.** If we serve the LLM on our own hardware the marginal cost is a GPU-hour; if we call a hosted model it is the vendor's price (§4.3) | LiveKit Cloud's own calculator (web/mobile, Build/Ship, fetched 2026-10-21) estimates **$0.0479/min** total = agent session $0.0100 + LLM $0.0014 + STT $0.0075 + TTS $0.0090 + observability $0.0100. **480 min → ≈ $23 per courier-day** (*derived from LiveKit's published unit prices; our shift length is an assumption*) | `gpt-live-1` = **$0.05/min** → **480 min ≈ $24 per courier-day** (derived; shift length assumed). `gpt-realtime-mini` is priced per token (**$10 in / $20 out per 1 M**) and the tokens-per-minute conversion is **UNVERIFIED** | Local GPU box: **UNVERIFIED** (we have no GPU cost model) |
| **Offline behaviour** | **The turn decision works offline** (verified in the code comment in `local_smart_turn_v3.py`: *"enabling offline operation without network dependencies"*). With on-device STT via sherpa-onnx, the transcript survives. **But** `speech_timeout_user_turn_stop_strategy.py` has `wait_for_transcript: bool = True` and closes the turn only when *"both [timers] have finished and at least one transcript has been received"* → **with a remote STT, a dropped network hangs the turn** | **Weak.** `v1` is a LiveKit-hosted inference call → the turn decision needs the network unless `v1-mini` is self-hosted (licence-restricted). `v1-mini` is local CPU, but the weights may only run with LiveKit Agents | **None.** Everything is a remote call; the Realtime session dies with the socket | **Strong by design** — the whole stack is local, so it survives a network drop; but it needs a GPU in the van or a reachable box |
| **Failure mode when the network drops mid-turn** | **Read from the code, not guessed:** (1) VAD keeps running locally → we know the courier stopped speaking; (2) the transcript never arrives → `wait_for_transcript=True` means the **user turn never closes** and the assistant stays silent; (3) if the transcript *did* arrive but the LLM call fails, `apps/api` already depends on `anthropic>=0.40`, and Pipecat issue **#6185 (2026-10-15)** shows a refused turn can end **in silence with nothing logged** — the failure mode we must design out. **Mitigation: on-device STT (sherpa-onnx), a `wait_for_transcript=False` fallback for the offline path, and an explicit spoken fallback ("I did not hear that")** | The session's transport dies; LiveKit's own issue **#7960** shows the `transcription_delay` metric can be **underreported** when VAD is configured explicitly, so we could not trust their metrics to detect the drop | The socket closes and the session ends; the client must reconnect and re-seed the conversation | The pipeline continues locally; only the (optional) web-search tool would fail |

### 4.2 What must be built first (the set, named and shaped)

1. **`docs/squads/voice/eval/` — the utterance set** (as `docs/squads/voice/README.md` specifies): ≥ 500 utterances across en-NZ 120 · te reo Māori place names 60 · Arabic 40 · Hindi/Punjabi 40 · Mandarin 40 · Samoan/Tongan 40 · Spanish 40 · numbers & self-corrections 40 · silence/non-speech 40; accents (NZ, diaspora, Pacific); noise (quiet / van / rain / traffic / indicator clicks); NZ addresses; self-corrections ("7… no, 17"). Per file: `utt_id, lang, locale, speaker, snr_db, noise_type, transcript, address_gold, intent_gold, code_switch`. **Add two new fields the turn-taking work needs: `turn_end_expected` (where the courier actually stopped, with a timestamp) and `false_interruption_expected` (backchannels, coughs, radio).**
2. **`docs/squads/voice/benchmarks/turns/` — the harness.** Same device profile for every candidate (CI emulator + one mid-range Android). Record, per turn: `end_of_speech_ts`, `turn_decision_ts`, `first_audio_ts`, `barge_in_ts`, `audio_stop_ts`, plus the **LiveKit metric names** (`transcription_delay`, `end_of_turn_delay`) so our numbers are comparable to the industry.
3. **`docs/squads/voice/benchmarks/driving/` — ≥ 8 h of continuous van audio** (van noise bed + music + radio + a passenger). The false-interruption metric is meaningless without it.

| Metric | Definition | Target | Which candidate it decides |
|---|---|---|---|
| End-of-turn latency | last speech offset → agent's first audio byte | **≤ 700 ms** on the on-device path (CONSTRAINTS.md) | Smart Turn local vs Pipecat default VAD |
| Barge-in latency | courier starts speaking → agent audio stops | **≤ 200 ms** (proposed; **UNVERIFIED target**, needs squad sign-off) | transport choice (WebSocket vs RN WebRTC) |
| False interruption rate | agent stops when the courier was not interrupting | **≤ 1 per hour of driving** | `min_words` strategy, adaptive interruption |
| Missed turn rate | agent keeps talking over the courier | **≤ 3 %** | Smart Turn vs pure VAD |
| Turn-decision availability offline | the turn decision is made with the network down | **100 %** | Smart Turn local (the only candidate that can pass) |
| Command → action | utterance → tool executed | **≤ 700 ms** | end-to-end, with the tool-calling file |
| Battery | driving mode | **≤ 8 %/h** | transport + codec + audio session config |
| APK delta | the cost of shipping the turn model | **≤ 80 MB total APK** | the 8.68 MB ONNX file |

**First benchmark to run:** the same 200-utterance driving subset through (a) Pipecat + `LocalSmartTurnAnalyzerV3` (local), (b) Pipecat + pure Silero VAD (`wait_for_transcript` path), (c) LiveKit's `v1-mini` **as a hosted LiveKit Cloud agent only** (to read the numbers, not to ship the weights). Nothing is declared the winner before that table exists.

### 4.3 Cost per courier-day — the real inputs (read 2026-10-21)

| Input | Value | Source |
|---|---|---|
| Shift length | 8 h = 480 min | **our assumption** (not a vendor figure) |
| LiveKit Cloud, web/mobile agent, Build/Ship | **$0.0479/min** total | livekit.io/pricing calculator output, fetched 2026-10-21 |
| LiveKit agent session minutes | $0.0100/min (1 000 min included on Build) | livekit.io/pricing |
| LiveKit WebRTC participant minutes | $0.0005/min (5 000 min included on Build) | livekit.io/pricing |
| LiveKit audio turn detection (EOT) | **free on LiveKit Cloud**; **$0.50 / 1 000 requests** self-hosted | livekit.io/pricing |
| LiveKit adaptive interruption | **free on LiveKit Cloud**; **$1.20 / 1 000 requests** self-hosted | livekit.io/pricing |
| OpenAI `gpt-live-1` voice session | **$0.05/min**, billed per second | platform.openai.com/docs/pricing |
| OpenAI `gpt-realtime-mini` | audio $10.00 in / $20.00 out per 1 M tokens | platform.openai.com/docs/pricing |
| OpenAI `gpt-live-transcribe` | ≈ $0.017/min | platform.openai.com/docs/pricing |
| On-device turn decision (Smart Turn v3.2) | **$0** marginal | our model; 8.68 MB ONNX in the APK |
| **Derived: LiveKit Cloud, full-shift session** | **480 × $0.0479 ≈ $23 / courier-day** | derived from the above; shift length assumed |
| **Derived: OpenAI `gpt-live-1`, full-shift session** | **480 × $0.05 ≈ $24 / courier-day** | derived from the above; shift length assumed |
| **Derived: on-device turn decision + our own LLM service** | **turn decision $0; LLM cost is our own GPU-hour** | the number we must model in `COST_PLAN.md` |

**A note on the shape of those numbers.** A full-shift *always-listening* session is the worst case and is what the vendor calculators assume. Our product is **one command at a time** (D2), so the real shape is a session that is **open but mostly idle**, with the agent listening only in the windows where it expects a command. Whether an idle session still bills per minute is **UNVERIFIED** and is a concrete question for the founders' account setup — it is the single biggest cost line in this file.

---

## 5. What we are missing → rows for `docs/PARITY.md`

The CEO merges these. Every **Spoke (2026-10-20)** cell below is taken only from `docs/study/spoke/TEARDOWN.md` (read 2026-10-21); where the teardown does not establish the fact, the cell is left empty. Nothing is asserted about Spoke that the teardown does not carry.

| # | Family | Feature | Status | Spoke (2026-10-20) | Our edge | Task |
|---|---|---|---|---|---|---|
| V1 | Voice | Hands-free control of the app **while driving** (spoken "delivered", "next", "skip", "reorder") | gap - Spoke's voice is entry-only | | one command at a time, hands-free, on-device first, server cascade optional | T7.5 |
| V2 | Voice | **Semantic end-of-turn detection** (audio-native, 23 languages, BSD-2, on-device) | gap - no assistant in any Spoke public source | | Smart Turn v3.2 on the phone: 12 ms CPU, 8.68 MB, works with no network | T7.5 |
| V3 | Voice | **Barge-in that does not trip on a cough, a radio or a passenger's "mm"** | gap - no assistant in any Spoke public source | | adaptive-style interruption behind our own transport, benchmarked on 8 h of van audio | T7.5 |
| V4 | Voice | **Voice control that survives a dropped connection mid-turn** (the turn is decided locally; the answer degrades) | gap - Spoke's saved route works offline, but Spoke has no voice assistant | | local turn decision + on-device STT; the assistant says "I did not hear that" instead of going silent | T7.1, T7.5 |
| V5 | Voice | **Voice POD / spoken delivery confirmation** | gap - no voice POD documented | | D4: the spoken word "delivered" is the proof; spoken on arrival | T7.9 |
| V6 | Voice | **Spoken door note on arrival** (read the access note out when you arrive) | gap - Spoke has text-only access instructions, no spoken read-out | | keyed to the LINZ address, learned over 2 deliveries | T7.3, T7.7 |
| V7 | Voice | **Voice re-ordering / spoken rules engine** | gap - Spoke has no stop-level voice re-ordering | | one spoken command, never blocks driving | T7.2 |
| V8 | Voice | **te reo Māori / Samoan / Tongan voice control** | gap - Spoke supports 19 languages, none of these three | | D3: every language from the start; Smart Turn covers 23 languages but **not** these three | T7.5 |
| V9 | Voice | **On-device audio** (nothing leaves the van) | gap - Spoke's manifest OCR uploads to Spoke's servers; its dictation is cloud-shaped | | sherpa-onnx STT/TTS/VAD/KWS on the phone; our own private service as the cascade | T7.1, T7.5 |
| V10 | Voice | **Offline map of the driver's region** | gap - Spoke has no offline map or offline tile product | | the Canterbury map pack ships inside the app (D15) | T7.1, T7.7 |
| V11 | Driver tools | **Spoken rules remembered across days** ("the pharmacy is always after 2pm") | gap - Spoke's reusable artefacts are stop types (a preset on one address) and copy-stops from a past route | | learned rules survive the shift and the week | T7.2 |
| V12 | Driver tools | **Template / route rebuild from yesterday in one tap** | gap - Spoke can copy stops from a past route; no rebuild | | the template rebuilds the day with the rules included | T7.2 |
| V13 | Accessibility | **An accessibility declaration for the assistant** (large text, screen-reader, reduced motion, contrast) | gap - the Spoke listings state the developer has not indicated accessibility features | | our bar is above the published Spoke position by default | T7.5, T7.6 |
| V14 | Languages | **Voice support for the NZ delivery workforce's languages** | gap - Spoke: 19 languages, no te reo Māori / Mandarin / Hindi / Samoan / Tongan | | every language from the start (D3) | T7.5 |
| V15 | Cost | **A voice path whose marginal cost does not scale with shift length** | gap - Spoke charges a subscription (Free / Lite $9.99 / Standard $19.99) and its voice is cloud-shaped | | on-device turn decision; only the occasional model call is billed | T7.13 |

---

## 6. Decision

1. **KEEP Pipecat as the server framework** (D22 stands) — it is already `apps/api`'s dependency (`pipecat-ai>=1.12.0`), it is BSD-2-Clause, and its 2026 turn subsystem is a **strategy matrix** (6 user-start, 7 user-stop, 5 user-mute) that lets us choose the barge-in policy per environment instead of accepting one default.
2. **ADOPT Smart Turn v3.2 (`pipecat-ai/smart-turn`, BSD-2) as the on-device turn decision.** 8.68 MB int8 ONNX, ~12 ms CPU, audio-native, 23 languages, weights and training data open under BSD-2. **It is the only turn detector in this study whose licence permits shipping it inside a closed-source commercial app** — and therefore the only one that can keep working when the van loses signal.
3. **ADOPT the OpenAI-Realtime wire format** for our service's public protocol, so the same mobile client can talk to our Pipecat service, to `speech-to-speech`, or to a vendor if we ever have to. **Do not** build on `openai/openai-realtime-agents` as a dependency (stale since 2026-01-07) — read it for the event semantics only.
4. **KEEP sherpa-onnx** (ADR-004) as the on-device STT/TTS/VAD/KWS/LID engine and **pair it with Smart Turn** — Smart Turn is documented to run only during VAD-detected silence, which is exactly how a 12 ms detector is affordable on a phone.
5. **KEEP `@pipecat-ai/client-js` + the WebSocket transport for v1**; do **not** take the React Native WebRTC transport until (a) `@daily-co/react-native-webrtc@124.0.6-daily.2` is confirmed on the **New Architecture / Expo SDK 58**, and (b) the barge-in latency is measured. **Also verify the WebSocket transport's transitive `@daily-co/daily-js` dependency does not make a Daily cloud call.**
6. **ADOPT `whisker` as a dev tool** — it costs nothing, ships no code, and shortens the barge-in debug loop.
7. **REJECT TEN-framework and ten-vad on licence**, not on capability. **REJECT Ultravox and Vocode as dormant** (0 commits/90 d; vocode dead since 2024-11-15). **REJECT `rhasspy` (archived), `livekit/livekit` (SFU we do not need), and the Daily SDKs** (we do not use their transport).

**Fallback chain if the on-device turn model fails our eval:** (a) Pipecat's `TurnAnalyzerUserTurnStopStrategy` against a **self-hosted** copy of Smart Turn on our own box (still on-device from the courier's point of view, still BSD-2); (b) Pipecat's pure-VAD path with `MinWordsUserTurnStartStrategy` — a worse answer, but it degrades instead of breaking; (c) a hosted semantic VAD (`semantic_vad` with `eagerness: "high"`, max timeout **2 s**) as the last resort, at the cost of data leaving the perimeter and a per-minute cost.

---

## 7. Risks

| Risk | Severity | Mitigation / fallback |
|---|---|---|
| **The LiveKit turn-detector weights are locked to LiveKit Agents** (LiveKit Model License, §3.b) — sprint #1's plan to port it into Pipecat is not available | **High** | Adopt **Smart Turn v3.2 (BSD-2)** instead; if we ever want LiveKit's model, use it only by calling LiveKit's hosted inference from a LiveKit-hosted agent. **Raise an ADR-004 amendment recording the licence, so nobody re-proposes the port** (§8.1) |
| **TEN/ten-vad carry an Agora field-of-use** ("no hosting on End User devices, including mobile terminal devices"; "no competing with Agora") | **High** | Do not vendor them. Record in `docs/LICENSES.md`; add a CI check that neither appears in the dependency tree or the mobile build |
| **Smart Turn does not cover te reo Māori, Samoan or Tongan** | **High** | It is a *turn* model, not a language model — the 23-language list is about prosody, but a wrong-language threshold is a wrong decision. Measure it in the eval set and keep the VAD path as the fallback for those three languages |
| **Pipecat's default stop strategy waits for a transcript** (`wait_for_transcript=True`) — with a remote STT, a dropped network hangs the turn | **High** | On-device STT via sherpa-onnx; a `wait_for_transcript=False` variant for the offline path; a spoken "I did not hear that" fallback; never let a refused turn end in silence (Pipecat #6185) |
| **Pipecat PR #6260 (barge-in click) is still open** | Medium | Measure the click in the harness; if it is audible, mute the output channel on the barge-in frame ourselves behind our own `VoiceTransport` |
| **RN transports depend on a native WebRTC fork with unproven New Architecture support** | Medium | v1 uses the WebSocket transport; the RN WebRTC transport is gated on a measured barge-in latency **and** a confirmed Expo SDK 58 build |
| **The ONNX Runtime on the phone costs battery** (Smart Turn + sherpa-onnx both on CPU) | Medium | Smart Turn runs only during VAD-detected silence; `cpu_count=1`; measure against the ≤ 8 %/h budget on the mid-range device, not the emulator |
| **The turn model adds 8.68 MB to the APK** | Low | Budget is 80 MB; the APK is not built yet (T3) — measure it when it is |
| **A full-shift always-listening session costs ~$23–24/day** (derived) | **High (cost)** | Our product is one command at a time: keep the session open but the model call rare; model the real shape in `COST_PLAN.md`; the idle-session billing question must be answered before the founders buy minutes |
| **413 open issues in Pipecat**, including a per-sentence TTS connection (#6254) and a resampler defect (#6218) | Medium | Pin exact versions; the issue list is our regression checklist, not a surprise |
| **The 8 MB model is a third-party artefact inside a BSD-2 wheel** | Low | ADR-004's licence ledger already requires the licence of every engine the voice service can load, code **and** weights — the ledger must list Smart Turn explicitly |

---

## 8. Decision record

### 8.1 ADR proposal (not applied here — the decision is not ours to change)

**Proposal to ADR-004 (voice service licences):** add a row recording that **semantic turn-detection models are licensed separately from their frameworks**, with two worked examples read on 2026-10-21: the **LiveKit Model License** (proprietary; *"not to use any LiveKit Models … with any frameworks other than LiveKit Agents"*) and the **TEN/ten-vad Agora field-of-use** (*"you may not … host the TEN Framework … on any End User devices, including … mobile terminal devices"*), and name **Smart Turn v3.2 (BSD-2, code + weights + data)** as the model our ADR-004 replacement path may ship inside the app. **This does not change ADR-004's decision**; it records the evidence ADR-004 did not have.

### 8.2 What changed against the previous sprint

| Claim (2026-10-20) | Verified 2026-10-21 | Correction |
|---|---|---|
| "Our current choice: `services/voice` (to be built) on Pipecat" | `services/voice` **does not exist**; `apps/api` already depends on `pipecat-ai>=1.12.0` and `apps/mobile` on `@pipecat-ai/client-js@1.14.0` | The choice is a **dependency**, not a plan; the service is still unbuilt |
| "we can port the LiveKit turn-detection model behind our own Pipecat processor without taking LiveKit" | The weights are under the **LiveKit Model License**, §3.b(i): *"not to use any LiveKit Models … with any frameworks other than LiveKit Agents"* | **Wrong on licence.** Not portable. Sprint #1's "the single most transferable idea" is not ours to take — but the *idea* (an audio model that rejects backchannels) is now in LiveKit v1.5.0's adaptive interruption and is worth re-implementing against our own audio |
| "Pipecat's RN transports are 0.x" | They are **1.x** (`@pipecat-ai/react-native-small-webrtc-transport` 1.8.0, 2026-06-22) | Less churn than feared — but the **native** peer (`@daily-co/react-native-webrtc@124.0.6-daily.2`) is the bigger unverified risk |
| "Pipecat Flows … separate repo" | The separate repo is **archived**; Flows is in the main package at `src/pipecat/flows/` | Confirmed, and the import path is now `pipecat.flows` |
| "Pipecat has a `MinWordsInterruptionStrategy`" | The 2026 design is a **strategy matrix** under `src/pipecat/turns/` (6 user-start, 7 user-stop, 5 user-mute) plus `src/pipecat/audio/turn/smart_turn/` | The strategy names moved; the behaviour did not |
| "Pipecat's turn detection needs a network call" | `LocalSmartTurnAnalyzerV3` runs a **bundled ONNX** model and its docstring says *"enabling offline operation without network dependencies"* | **Materially better than sprint #1 knew.** This is the single biggest change in the file |
| "LiveKit's turn detector: ~50–160 ms per turn, 396 MB" | That is the **deprecated text** detector. The **audio** detector v1 shipped 2026-06-17 with published frontiers (295 ms at a 10 % false-cutoff budget) and `v1-mini` | The number is stale; so is the "text model" framing |
| "TEN-framework … licence NOASSERTION" | It is Apache-2.0 **plus an Agora field-of-use that forbids hosting on mobile terminal devices and forbids competing with Agora** | **Not "UNVERIFIED" — it is a blocker.** Upgrade from WATCH to REJECT |
| "Silero VAD … only after we read the file ourselves" | Still true; ADR-004's row stands | Unchanged. We use sherpa-onnx's VAD instead |
| "OpenVoiceOS — 17 open issues is suspiciously low" | 17 open, **20 of 20 releases in 6 m**, 100+ commits/90 d, 2 humans | It is not suspiciously quiet; it is a **two-person** project that ships weekly |

---

## 9. Monthly radar filter

Run on the **first working day of each month** against `scripts\gh.ps1`, and record the result in `docs/EXECUTOR_LOG.md`. A candidate is re-read in full only if it trips a trigger.

| Trigger | Threshold | Action |
|---|---|---|
| **New release train in a leader** | `pipecat-ai/pipecat`, `livekit/agents`, `huggingface/speech-to-speech`, `pipecat-ai/smart-turn`, `QwenAudio/qwen-audio-agent` | re-read the release notes and the changelog for turn-taking changes; a new default strategy or a new bundled model is a **Decision** event |
| **A turn model changes licence** | `livekit/turn-detector` (HF), `pipecat-ai/smart-turn`, `ten-vad`, and every HF model we list in `docs/LICENSES.md` | re-read the licence file; any new non-commercial or field-of-use clause is an **ADR-004 amendment candidate** |
| **Silence** | ≥ 45 days with 0 commits on `main` for a shortlisted project | move it from WATCH to ARCHIVE-WATCH; sprint #1 kept vocode and ultravox on the list long after they died |
| **A 2026 entrant crosses 1 000★** | any repo in `topic:voice-agent`, `topic:realtime-voice`, or a Go/Rust realtime voice server | read the licence **first**, then the code; add a card |
| **A hosted service prices below our on-device path** | LiveKit Cloud, Daily, Agora Conversational AI, Deepgram, Cartesia | re-derive the cost table in §4.3 — the on-device path only wins while the marginal cost of a *command* is lower than the vendor's per-minute price |
| **Expo SDK 58 / New Architecture breaks a transport** | `@pipecat-ai/react-native-*`, `@daily-co/react-native-webrtc`, `@livekit/react-native-webrtc` | re-gate the mobile transport decision (§6.5) |
| **An agent framework ships a turn benchmark** | anywhere | adopt the metric definitions so our harness stays comparable |
| **The licence ledger changes** | `docs/LICENSES.md` | every engine the voice service can load reports the licence of its code **and** its weights — a non-commercial or unknown licence makes that engine unavailable, with the reason (ADR-004 point 4) |

---

## 10. What we could not verify

1. **6-month star trend for every candidate** — the star *timeline* is 403 with our token; all star counts are the 2026-10-21 snapshot. The proxies (releases/6 m, commits/90 d, humans/90 d) are stated per card.
2. **Median issue response time and closed-issue ratio** — not sampled for this area; only open-issue counts (which include PRs) were read. **UNVERIFIED.**
3. **Every latency number in §4.1** — Smart Turn's "12 ms / 60 ms", LiveKit's "295 ms / 543 ms" and "≤ 30 ms", Moshi's "160 ms / 200 ms" are **vendor claims read from their own pages**, not reproduced by us. **The end-of-speech → first-audio number for every candidate is UNVERIFIED.**
4. **Our own end-to-end turn latency, barge-in latency, false-interruption rate and missed-turn rate** — **UNVERIFIED**; no eval set and no harness exist (`docs/squads/voice/eval/` is absent, `docs/squads/voice/benchmarks/` has only a README).
5. **The cost per courier-day** — only the **unit prices** are verified (livekit.io/pricing, platform.openai.com/docs/pricing, both fetched 2026-10-21). The **shift length (8 h), the commands-per-shift (40) and the idle-session billing behaviour are our assumptions** and are labelled as such. The derived $23–24/day figures are arithmetic on assumptions, not measurements.
6. **New Architecture / Expo SDK 58 support** for `@daily-co/react-native-webrtc@124.0.6-daily.2`, `@livekit/react-native-webrtc@150.1.0`, `react-native-background-timer@2.4.1` (last published 2022-06-26) and `@pipecat-ai/react-native-small-webrtc-transport@1.8.0` — **no README states it; UNVERIFIED** until we build it.
7. **The model-weight licences** of `huggingface/speech-to-speech`'s default stack (Qwen3.5-4B, Qwen3-TTS, Parakeet TDT) — **not checked here** (Parakeet is CC-BY-4.0 per ADR-004); the Qwen checkpoints are **UNVERIFIED** for our commercial use.
8. **Ultravox's weight licence** on Hugging Face — **UNVERIFIED** (the repo is MIT and dormant; we did not fetch the model card).
9. **The Silero VAD licence contradiction** — still open (MIT file vs CC-BY-NC badge), exactly as ADR-004 records it. **UNVERIFIED** until we read the file in our own tree.
10. **`liveblocks/liveblocks`' mixed licence** — the raw file says most code is Apache-2.0 and "the remainder" is proprietary; **which** parts are proprietary was not enumerated. **UNVERIFIED.**
11. **`google-gemini/gemini-live-api-examples` and `bentoml/BentoVoiceAgent` licences** — no LICENSE file / not fetched. **UNVERIFIED.**
12. **Agora Conversational AI's own turn-detection behaviour** — we read only the community `convoai-jev-vad` repo (MIT, created 2026-09-23); the vendor's service semantics were **not** verified.
13. **Pipecat's default turn-stop strategy in the version we actually pin** — the docs say "as of v0.0.102" and we pin `>=1.12.0`; we read the code paths but **did not** verify the composed default in `UserTurnController` for our exact pin. **UNVERIFIED.**
14. **The `speech_timeout_user_turn_stop_strategy.py` behaviour with a local STT** — the code says the turn closes when both timers finish **and** at least one transcript has been received; how that degrades with a *local* sherpa-onnx STT and a dead network is **UNVERIFIED** — it must be tested, not assumed.
15. **Whether a Pipecat "idle" session bills** to the provider — no published statement was found. **UNVERIFIED.**
16. **The `pipecat-ai/pipecat` issue counts** include PRs; the issues-only count was not separately sampled (the routing study did sample it). **UNVERIFIED.**
