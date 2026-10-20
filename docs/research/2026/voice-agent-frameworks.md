# Voice agent frameworks & turn-taking — 2026 research

**Area:** V4 §3 "voice agent frameworks & turn-taking" · V4 §10.1 · V4 §12
**Research date:** 2026-10-20 · **Role:** Researcher · **Squad:** Voice
**Our current choice:** `services/voice` (to be built) on **Pipecat** (D22) + `k2-fsa/sherpa-onnx` + `k2-fsa/OmniVoice`; mobile side already depends on `@pipecat-ai/client-js@1.14.0` (BSD-2-Clause, npm modified 2026-10-16, repo `pipecat-ai/pipecat-client-web` ★326, pushed 2026-10-16) and `expo-audio@58.0.9`.
**Tooling:** `scripts\gh.ps1` (GitHub CLI with the repo token from `.env.local`, never printed), npm registry search, repo/release/commit APIs.

---

## Queries run

All run from the repo root on 2026-10-20.

1. `gh search repos "voice agent" --sort stars --limit 25`
2. `gh search repos "pipecat" --sort stars --limit 20`
3. `gh search repos "livekit agents" --sort stars --limit 20`
4. `gh search repos "topic:voice-agent" --sort stars --limit 30`
5. `gh search repos "voice agent framework realtime" --sort stars --limit 30`
6. `gh search repos "endpointing" --sort stars --limit 20`
7. `gh search repos "turn taking voice agent" --sort stars --limit 20`
8. `gh search repos "voice agent telephony" --sort stars --limit 20`
9. `gh search repos "topic:realtime-voice" --sort stars --limit 20`
10. `gh api repos/<owner>/<repo>` — stars, license, created_at, pushed_at, open_issues_count, forks, archived for every repo below
11. `gh api repos/<owner>/<repo>/releases?per_page=3` — last release + cadence
12. `gh api repos/<owner>/<repo>/commits?per_page=20` — 90-day maintainer activity
13. `gh api repos/<owner>/<repo>/readme` — README text for the deep review
14. `npm search pipecat --json` — the full published Pipecat client/transport surface
15. `npm view <pkg> version license time.modified` — `@pipecat-ai/*`, `livekit-client`, `@openai/agents`, `@modelcontextprotocol/sdk`, `ai`

---

## Candidate evidence cards

**1. pipecat-ai/pipecat** — https://github.com/pipecat-ai/pipecat
★16,637 · created 2023-12-27 · last release **v1.13.0 (2026-10-19)** · cadence weekly (10-19 / 09-26 / 09-18) · pushed 2026-10-20 · open issues 415 · forks UNVERIFIED · last-20 commits 2026-10-20→2026-10-19 by markbackman(10), filipi87(8), naszzz(2) → 3 maintainers in 90 d.
Licence **BSD-2-Clause** (Python server) · on-device ✖ / **server ✔** · README states it is maintained by **Daily** · **official client SDKs listed for JavaScript, React, React Native, Swift (iOS), Kotlin (Android), C++, ESP32** · **Pipecat Flows** (structured conversations) is now *built into* Pipecat · Pipecat UI (shadcn registry) · Pipecat CLI (`pipecat init quickstart`) · Whisker (real-time debugger) · Tail (dashboard) · PyPI + codecov badge in README.
Better than our current choice: it *is* our current choice; what it adds is (a) a **React Native client**, (b) a first-party **React Native transport** family on npm, (c) a debugger.
Risks: Python-only server; 415 open issues; the RN transport packages are **0.x** (pre-1.0 API churn).
**DECISION: KEEP** — D22 stands; the RN client path is now first-party (no third-party SDK needed).

**2. livekit/agents** — https://github.com/livekit/agents
★14,855 · created 2023-10-19 · last release **livekit-agents@1.8.8 (2026-10-15)** · cadence near-daily (10-15 / 10-14 / 10-09) · pushed 2026-10-20 · open issues 802 · last-20 commits 2026-10-20→2026-10-18 by 5 distinct authors.
Licence **Apache-2.0** · server ✔ · Python core + **AgentsJS** for JS/TS · features read from the README: mix-and-match STT/LLM/TTS, **integrated job scheduling + dispatch APIs**, extensive **WebRTC** client SDKs, **telephony (SIP)**, RPC/data APIs, **semantic turn detection (a transformer model that detects when the user finished their turn — directly reduces interruptions)**, **native MCP support (one line)**, and a **built-in test framework with judges**.
Better than our current choice: two things Pipecat does not give us — a **WebRTC/SIP media plane** and **built-in semantic turn detection**; and Apache-2.0 is one notch more permissive than BSD-2 for our licence policy.
Risks: the WebRTC path pulls in LiveKit's media server (operational surface); 802 open issues; the semantic turn detector adds a model + latency.
**DECISION: WATCH** — the strongest alternative; its **turn-detection model** is the single most transferable idea (we can port the model behind our own Pipecat processor without taking LiveKit).

**3. huggingface/speech-to-speech** — https://github.com/huggingface/speech-to-speech
★13,518 · created 2024-08-07 · last release **v1.0.0 (2026-09-06)** · cadence (09-06 / 08-05 / 08-03) · pushed 2026-10-19 · open issues 52 · last-20 commits 2026-10-19→2026-10-16 by andimarafioti(13), jackboyla(3), salignatmoandal(3) → 3 maintainers.
Licence **Apache-2.0** · **fully local, no API key, no cloud** · default pipeline read from the README: **Silero VAD → Parakeet TDT → Qwen3.5-4B → Qwen3-TTS**, every stage swappable · speaks the **OpenAI Realtime protocol** over WebSocket **and** WebRTC · Python 3.11–3.14 · README states it "runs in production as the conversation backend for **thousands of Reachy Mini robots**" → **the only candidate with a verified production user base**.
Better than our current choice: it is the reference implementation of the *exact* hybrid we want — open models, open-vocabulary STT/TTS swap, OpenAI-Realtime wire protocol so any Realtime client (including a React Native app) can talk to it.
Risks: heavy local models (Qwen3.5-4B + Qwen3-TTS) → needs a GPU box; our D22 budget is a private service, not a fleet of GPU robots; not a *framework* so no plugin graph for our tool catalogue.
**DECISION: ADOPT (protocol + pipeline reference)** — speak the **OpenAI Realtime protocol** in `services/voice` so our RN client is protocol-agnostic and swappable between Pipecat and speech-to-speech.

**4. TEN-framework/ten-framework** — https://github.com/TEN-framework/ten-framework
★11,182 · created 2024-06-19 · last release **0.11.73 (2026-09-22)** · cadence (09-22 / 09-18 / 07-31) · pushed 2026-10-20 · open issues 249 · licence **NOASSERTION ("Other")** → the raw `LICENSE` must be read; the sibling `ten-vad` is Apache-2.0 **plus an Agora field-of-use restriction**.
Better than our current choice: an all-in-one voice-agent OS with its own UI, plugins and TEN-VAD integration.
Risks: **licence is not a clean SPDX id**; heavy runtime; the model-weights story for its own VAD is UNVERIFIED.
**DECISION: WATCH** — study the plugin/UI architecture; do not adopt until the licence text is confirmed permissive.

**5. QwenAudio/qwen-audio-agent** — https://github.com/QwenAudio/qwen-audio-agent
★2,953 · created **2026-07-27** · last release **v2.0.1 (2026-09-26)** · cadence (09-26 / 09-23 / 08-20) · pushed 2026-10-20 · open issues 11 · licence **Apache-2.0** · description: "A realtime voice runtime that keeps Agents talking, working, and present." **Real-Time Voice Agent**.
Better than our current choice: a 2026-native realtime runtime from the Qwen team; likely to absorb Qwen3-ASR/Qwen3-TTS as first-class stages.
Risks: very young (3 months); Qwen model licences vary per checkpoint; Rust/Go internals UNVERIFIED.
**DECISION: WATCH** — the most interesting 2026 newcomer; re-scan monthly.

**6. buxuku/SmartSub** — https://github.com/buxuku/SmartSub
★5,778 · pushed 2026-10-20 · last release **v3.10.1 (2026-10-16)** · licence UNVERIFIED (not fetched) · a self-hosted subtitle/translate/voice stack that embeds sherpa-onnx.
**DECISION: WATCH** — a sherpa-onnx consumer in production; useful as evidence that sherpa-onnx is deployment-proven, not as a dependency.

**7. dograh-hq/dograh** — https://github.com/dograh-hq/dograh
★5,910 · pushed 2026-10-20 · last release **dograh-v1.49.0 (2026-10-12)** · licence UNVERIFIED · Pipecat-based voice-agent SaaS.
**DECISION: WATCH** — production Pipecat reference; read its issue list for real-world Pipecat pain points (V4 §12.2 strategy 9).

**8. zavora-ai/adk-rust** — https://github.com/zavora-ai/adk-rust
★717 · created 2025-11-23 · last release **v2.3.0 (2026-10-09)** · cadence (10-09 / 09-01 / 08-25) · pushed 2026-10-20 · Rust.
**DECISION: WATCH** — a Rust realtime-voice runtime; a challenger if Python is rejected.

**9. PatterAI/Patter** — https://github.com/PatterAI/Patter
★1,076 · created **2026-04-07** · pushed 2026-10-03 · licence UNVERIFIED · topic:voice-agent.
**DECISION: WATCH** — 2026 newcomer.

**10. OpenVoiceOS/ovos-core** — https://github.com/OpenVoiceOS/ovos-core
★297 · created 2021-02-18 · last release **3.7.4a1 (2026-10-08)** · pushed 2026-10-08 · open issues 17 · licence **Apache-2.0** · FOSS AI platform; offline-first, "many human languages" via the wyoming protocol.
Better than our current choice: the most mature **fully offline** voice stack with a plugin protocol.
Risks: small ecosystem, Python, skills model is home-assistant-shaped; 17 open issues is suspiciously low for the size.
**DECISION: WATCH** — reference for the wyoming offline protocol (`rhasspy/wyoming-*`).

**11. rhasspy/rhasspy** — https://github.com/rhasspy/rhasspy
★2,750 · MIT · **archived** · last release **v2.5.11 (2021-08-08)** · pushed 2025-04-22.
**DECISION: REJECT** — dead; superseded by OpenVoiceOS.

**12. google-gemini/gemini-live-api-examples** — https://github.com/google-gemini/gemini-live-api-examples
★556 · created **2026-02-14** · pushed 2026-10-20 · open issues 29 · **no releases** · licence **NOASSERTION** (examples usually MIT) · Gemini Live multimodal realtime agent examples.
**DECISION: WATCH** — best vendor realtime API reference; we cannot adopt the closed Gemini Live API as our server (privacy + cost + D7), but its **barge-in / interruption semantics** are worth copying.

**13. ServiceNow/eva** — https://github.com/ServiceNow/eva
★231 · created 2026-03-24 · pushed 2026-10-19 · topic:voice-agent.
**DECISION: WATCH** — 2026 enterprise voice-agent entry.

**14. miuda-ai/active-call** — https://github.com/miuda-ai/active-call
★192 · created 2025-12-21 · pushed 2026-10-20 · Rust.
**DECISION: WATCH** — Rust realtime voice.

**15. COSS-India/VoicEra** — https://github.com/COSS-India/VoicEra
★318 · created 2026-01-21 · pushed 2026-10-19.
**DECISION: WATCH** — 2026 entrant.

**16. openspline/openspline** — https://github.com/openspline/openspline
★222 · created 2026-09-29 · pushed 2026-10-18 · **days old**.
**DECISION: WATCH** — too new to judge; add to the monthly radar.

**17. second-state/echokit_server** — https://github.com/second-state/echokit_server
★592 · created 2025-02-26 · pushed 2026-02-15 · Rust.
**DECISION: WATCH** — Rust voice-agent server.

**18. rapidaai/voice-ai** — https://github.com/rapidaai/voice-ai
★748 · created 2023-12-07 · pushed 2026-10-20 · Go.
**DECISION: WATCH** — Go realtime voice, long-lived.

**19. hkjarral/AVA-AI-Voice-Agent-for-Asterisk** — https://github.com/hkjarral/AVA-AI-Voice-Agent-for-Asterisk
★1,254 · created 2025-09-05 · pushed 2026-10-20.
**DECISION: WATCH** — Asterisk/telephony integration reference (we are not telephony-first).

**20. xzf-thu/VoiceMem** — https://github.com/xzf-thu/VoiceMem
★2,598 · created **2026-08-17** · pushed 2026-09-14 · topic:voice-agent · long-term memory for voice agents.
**DECISION: WATCH** — relevant to our door-memory/context features.

**21. neural-maze/realtime-phone-agents-course** — https://github.com/neural-maze/realtime-phone-agents-course
★1,109 · created 2025-11-11 · pushed 2026-01-10 · a *course*, not a library.
**DECISION: REJECT** — learning material, not a dependency.

**22. NVIDIA-AI-Blueprints/nemotron-voice-agent** — https://github.com/NVIDIA-AI-Blueprints/nemotron-voice-agent
★243 · created 2026-01-15 · pushed 2026-10-19.
**DECISION: WATCH** — NVIDIA blueprint; its barge-in/interruption handling and Riva pipeline are a reference.

**23. SalesforceAIResearch/VoiceAgentRAG** — https://github.com/SalesforceAIResearch/VoiceAgentRAG
★158 · created 2026-03-02 · pushed 2026-06-02.
**DECISION: WATCH** — RAG over voice; relevant to our help-centre Q&A idea.

**24. h1papc11/voice-mcp-agent** — https://github.com/h1papc11/voice-mcp-agent
★139 · created 2026-06-26 · pushed 2026-09-14 · MCP + voice.
**DECISION: WATCH** — MCP-as-voice-tool-bridge; directly relevant to our typed tool catalogue.

**25. bentoml/BentoVoiceAgent** — https://github.com/bentoml/BentoVoiceAgent
★134 · created 2024-09-26 · pushed 2026-07-14.
**DECISION: WATCH** — BentoML deployment packaging for voice agents.

**26. aicc2025/sip-to-ai** — https://github.com/aicc2025/sip-to-ai
★114 · created 2025-10-05 · pushed 2026-10-15.
**DECISION: REJECT** — SIP/telephony scope, not our v1.

**27. ferosai/feros** — https://github.com/ferosai/feros
★112 · created 2026-04-06 · pushed 2026-05-25.
**DECISION: WATCH** — 2026 newcomer.

**28. kwindla/macos-local-voice-agents** — https://github.com/kwindla/macos-local-voice-agents
★341 · created 2025-07-27 · pushed 2025-08-26 · macOS-only.
**DECISION: REJECT** — macOS only.

**29. openai/openai-agents-js** — https://github.com/openai/openai-agents-js
★3,930 · created 2025-05-31 · last release **@openai/agents@0.20.0 (2026-10-08)** · licence **MIT** · npm `@openai/agents` 0.20.0 (MIT, 2026-10-08) · "lightweight, powerful framework for multi-agent workflows **and voice agents**".
**DECISION: WATCH** — MIT and TypeScript-native, so it could host our *tool-calling* layer (see `llm-tool-calling.md`), but it is vendor-shaped (OpenAI Agents API).

**30. leon-ai/leon** — https://github.com/leon-ai/leon
★17,591 · pushed 2026-10-20 · licence UNVERIFIED (fetched later) · personal-assistant platform with skills; self-hosted; multi-language (incl. te reo Māori support in its skill catalogue? — **UNVERIFIED**).
**DECISION: WATCH** — the most mature open personal-assistant platform; a §11.2 clean-room study candidate if its licence is permissive.

**31. jitsi/jitsi-meet** — https://github.com/jitsi/jitsi-meet
★30,111 · created 2013-12-16 · pushed 2026-10-20 · open issues 169 · licence **Apache-2.0** · WebRTC conferencing with a JVB media server.
**DECISION: REJECT (as our agent framework)** — we do not need a conference server; noted because it is the fallback if we ever need WebRTC at scale.

**32. daily-co/daily-python** — https://github.com/daily-co/daily-python
★67 · created 2023-09-25 · pushed 2026-10-17 · licence **BSD-2-Clause** · the Daily Python SDK (Daily is the company behind Pipecat).
**DECISION: REJECT** — we are not using Daily's transport; our RN client uses our own WebSocket transport to our private service.

**33. LiveKit AgentsJS** — https://github.com/livekit/agents-js — referenced from the livekit/agents README; stars/created/license **UNVERIFIED** (not fetched).
**DECISION: WATCH** — the TS surface of LiveKit; must be verified before any TS-based voice server is considered.

**34. pipecat-ai/pipecat-flows** — https://github.com/pipecat-ai/pipecat-flows
★627 · created 2024-11-16 · last release **v1.4.0 (2026-07-05)** · pushed 2026-07-05 · licence BSD-2-Clause · **archived** → README of pipecat now says Flows is built into Pipecat.
**DECISION: KEEP (as a Pipecat feature)** — use `pipecat.flows` from the main package; do not depend on the archived repo.

**35. pipecat-ai/pipecat-mcp-server** — https://github.com/pipecat-ai/pipecat-mcp-server
★154 · created **2026-01-23** · pushed 2026-02-12.
**DECISION: WATCH** — Pipecat exposed over MCP; interesting for our "every app action is a typed tool" catalogue (FINAL_PROMPT §4.5).

**36. pipecat-ai/voice-ui-kit** — https://github.com/pipecat-ai/voice-ui-kit
★419 · created 2025-06-21 · pushed 2026-10-12 · npm `@pipecat-ai/voice-ui-kit` 0.14.1 (2026-09-04).
**DECISION: WATCH** — web voice UI components; the *mobile* UI is ours (design-system rules in V4 §5).

**37. pipecat-ai/whisker** — https://github.com/pipecat-ai/whisker
★136 · created 2025-08-14 · pushed 2026-10-19 · a real-time Pipecat debugger.
**DECISION: ADOPT (dev tooling)** — use Whisker locally to debug the private voice service; it costs us nothing and shortens the feedback loop on barge-in bugs.

**38. pipecat-ai/pipecat-examples** — https://github.com/pipecat-ai/pipecat-examples
★398 · created 2025-07-29 · pushed 2026-10-15.
**DECISION: WATCH** — reference implementations (and the place to copy *architecture patterns*, not code, if a licence ever changes).

**39. rasonyang/ai-native-callcenter** — https://github.com/rasonyang/ai-native-callcenter (★317, created 2026-08-11) and **XiyaoWang0519/agent-call** (★298, created 2026-07-13), **GizClaw/flowcraft** (★416, created 2026-04-14), **sonichi/sutando** (★397, created 2026-03-28), **Deuz-AI/Deuz-SDK** (★538, created 2026-06-01), **spaceamoeba-t/tapq** (★707, created 2026-07-19, Swift), **Sallyn0225/eidolon-sc** (★135, created 2026-09-25), **bielcarpi/hermes-live-voice** (★78, created 2026-06-23), **vvtech-ai/PhoneAgent** (★31, Kotlin, created 2026-08-06) — 2026 newcomers, all licences UNVERIFIED.
**DECISION: WATCH (group)** — keep on the monthly radar; §12.6 requires challengers, so we track them even if we do not adopt.

**40. Agentscope** — https://github.com/agentscope-ai/agentscope ★33,528, Apache-2.0, created 2024-01-12, pushed 2026-10-20, last release v2.0.10 (2026-10-12) — a general agent framework, not voice-first.
**DECISION: REJECT (for voice)** — overlaps `llm-tool-calling.md` scope, not the voice pipeline.

**Candidate count: 40 distinct repos examined.**

---

## Shortlist (12)

| # | Repo | Why it is on the list | Verdict |
|---|---|---|---|
| 1 | pipecat-ai/pipecat | our locked choice (D22); first-party RN client + RN transports | **KEEP** |
| 2 | livekit/agents | semantic turn detection, WebRTC/SIP, Apache-2.0, native MCP | **WATCH** |
| 3 | huggingface/speech-to-speech | OpenAI-Realtime protocol, all-open stack, verified production users | **ADOPT (protocol)** |
| 4 | QwenAudio/qwen-audio-agent | 2026-native realtime voice runtime | **WATCH** |
| 5 | TEN-framework/ten-framework | all-in-one voice OS | **WATCH** |
| 6 | OpenVoiceOS/ovos-core | mature fully-offline voice stack | **WATCH** |
| 7 | google-gemini/gemini-live-api-examples | barge-in semantics reference | **WATCH** |
| 8 | pipecat-ai/whisker | debugger | **ADOPT (dev tooling)** |
| 9 | pipecat-ai/pipecat-mcp-server | MCP-exposed voice tools | **WATCH** |
| 10 | h1papc11/voice-mcp-agent | voice ⇄ MCP tool bridge | **WATCH** |
| 11 | leon-ai/leon | mature open assistant platform | **WATCH** |
| 12 | zavora-ai/adk-rust / adk-rust-family | Rust alternative | **WATCH** |

---

## Deep review — top 5

### 1. pipecat-ai/pipecat — **keep**
* **Architecture (README).** "Composable pipelines", "every pipeline is an agent", multi-agent handoff / parallel fan-out / sidecar workers over a shared bus, local *or* distributed across processes and machines. Transports: WebSocket and WebRTC. This is the shape our tool catalogue needs — each domain command becomes a processor in a pipeline.
* **Client SDK surface.** The README lists official SDKs for **JavaScript, React, React Native, Swift, Kotlin, C++, ESP32**. That means the **mobile app does not need a third-party bridge**; we own `@pipecat-ai/client-js` already (v1.14.0, BSD-2-Clause, npm modified 2026-10-16).
* **npm transport surface (from `npm search pipecat`):** `@pipecat-ai/client-js` 1.14.0 · `@pipecat-ai/client-react` 1.9.0 · `@pipecat-ai/daily-transport` 1.7.0 · `@pipecat-ai/small-webrtc-transport` 1.1.0 · `@pipecat-ai/websocket-transport` 1.8.0 · `@pipecat-ai/livekit-transport` 1.0.0 · `@pipecat-ai/realtime-websocket-transport` 0.3.2 · `@pipecat-ai/moq-transport` 0.3.0 · **`@pipecat-ai/react-native-daily-transport` 0.3.0 (2026-04-22)** · **`@pipecat-ai/react-native-small-webrtc-transport` 0.5.7 (2026-05-05)** · `@pipecat-ai/voice-ui-kit` 0.14.1. The two React Native transports are the ones that matter to us: **a WebRTC transport that runs on RN** means we can keep full-duplex audio on our own transport, and we are not forced into Daily's cloud.
* **Code quality / maintenance.** Weekly releases (v1.13.0 on 2026-10-19, v1.12.x in September), 3 humans in the last 20 commits, codecov + CI badges in the README, a dedicated docs site (docs.pipecat.ai), a CLI scaffolder, a debugger (Whisker) and a dashboard (Tail). Mature, but 415 open issues is the cost of that velocity.
* **API ergonomics.** Frame-based processor pipeline with typed events and an explicit transport abstraction; `pipecat init quickstart` gets a runnable bot in under a minute; Pipecat Flows gives structured, stateful conversations (our "mark stop delivered, go to next" flow is a Flows-style state machine).
* **Extensibility.** We add our own transports (private service over WSS), our own STT/TTS processors (sherpa-onnx), our own LLM processor (tool calling), and our own barge-in processor. Everything is a processor — good for V4 §6.1 "adapters behind interfaces".
* **Performance claims vs our measurements.** None yet — the ≤ 700 ms command→action and ≤ 8 %/hour battery budgets are **unmeasured** (see Benchmarks).
* **Verdict: KEEP.** Confirms D22.

### 2. livekit/agents — **the turn-detection idea to steal**
* **Architecture.** Server-side "realtime, programmable participants"; the ecosystem is mix-and-match STT / LLM / TTS / Realtime API providers behind plugins; job scheduling and **dispatch APIs** connect end users to agents; WebRTC clients for all platforms; SIP telephony; RPC and data APIs for client↔agent exchange.
* **The two features we want.** (a) **Semantic turn detection** — "uses a transformer model to detect when a user is done with their turn, helps to reduce interruptions"; (b) **MCP support in one line** — the tool catalogue (FINAL_PROMPT §4.5) can be served as MCP servers.
* **Code quality.** Near-daily releases (`livekit-agents@1.8.8` on 2026-10-15, then 10-14 and 10-09), 5 distinct authors in the last 20 commits, 802 open issues.
* **Extensibility.** Python + AgentsJS; a plugin ecosystem is the most mature in this space.
* **Performance claims.** Semantic turn detection adds a model hop — its latency cost is **UNVERIFIED**; for a ≤ 700 ms budget we must measure it.
* **Verdict: WATCH.** Do not adopt the platform (we do not want a media server). **Adopt the idea**: evaluate a semantic turn-end model as a Pipecat processor, and evaluate MCP-hosted tool definitions for our typed catalogue.

### 3. huggingface/speech-to-speech — **adopt the protocol**
* **Architecture.** A single local pipeline, every stage swappable: **Silero VAD → Parakeet TDT → Qwen3.5-4B → Qwen3-TTS**. It serves the **OpenAI Realtime protocol** over **both WebSocket and WebRTC**, so any OpenAI-Realtime client can point at it instead of a cloud endpoint.
* **Why this matters to us.** Our private `services/voice` can be written to the *same* wire protocol. Then: (a) our RN client speaks one protocol; (b) we can A/B Pipecat vs speech-to-speech behind the same client; (c) we are not locked to one framework's transport.
* **Production users.** README states it runs in production as the conversation backend for **thousands of Reachy Mini robots** — the strongest production evidence in this area.
* **Code quality.** Python 3.11–3.14, pinned CUDA/Ubuntu notes, one-command `speech-to-speech local`, model downloads on first run. 3 active maintainers in the last 20 commits; v1.0.0 released 2026-09-06 (a v1.0 after ~2 years — stability signal).
* **Risks.** Model footprint (Qwen3.5-4B + Qwen3-TTS) is a GPU-box cost, not a phone cost; it is an *application*, not a framework — no plugin graph for our domain tools; licence Apache-2.0 on the code but the **model licences** must be checked per checkpoint.
* **Verdict: ADOPT (protocol + pipeline reference).** Design `services/voice` to expose an OpenAI-Realtime-compatible WebSocket endpoint first; Pipecat can front it.

### 4. QwenAudio/qwen-audio-agent — **2026 newcomer**
* 2,953★, created 2026-07-27, Apache-2.0, v2.0.1 (2026-09-26), pushed 2026-10-20, only 11 open issues (very young).
* Claim from the description: "a realtime voice runtime that keeps Agents talking, working, and present" — i.e. it treats *continuity* (not just turn-taking) as the product problem, which matches our "always with you, all day" brief.
* Architecture, tests, CI: **UNVERIFIED** (README not fetched in depth).
* **Verdict: WATCH.** Monthly re-scan; if it ships barge-in/turn semantics that measurably beat Pipecat on our eval set, we will have found the 2026 successor.

### 5. OpenVoiceOS/ovos-core — **the offline reference**
* 297★ but a long life: created 2021-02-18, still releasing (3.7.4a1, 2026-10-08), Apache-2.0, only 17 open issues.
* Value: it is the reference for a **fully offline** voice stack and for the **wyoming protocol** (`rhasspy/wyoming-*`), which is how openWakeWord/microWakeWord/piper expose models to a server.
* Why it matters for us: our hybrid (on-device first, private server for open conversation) resembles it. Its skill/plugin model and its "utterance → intent → skill → action" shape is a good model for our typed tool catalogue with a confirmation policy.
* Weaknesses: home-assistant-shaped skills, Python, small ecosystem, no realtime duplex.
* **Verdict: WATCH (offline design reference).** Not the realtime layer.

---

## Benchmarks

**Status: UNVERIFIED — the eval set and the harness do not exist.**

* `docs/squads/voice/eval/` — **absent** (checked 2026-10-20). The 500+ utterance dataset described in `docs/squads/voice/README.md` has not been built.
* `docs/squads/voice/benchmarks/` — contains **only `README.md`**; no harness, no raw results, no device profile.

Consequences: we cannot publish a single measured number for **barge-in latency**, **end-of-turn latency**, **false-interruption rate** or **command→action latency** for any framework. Every framework's performance claim below is a **vendor claim, unverified by us**.

### The exact set that must be built first

**A. `docs/squads/voice/eval/` — the utterance set (as specified in `docs/squads/voice/README.md`)** — ≥ 500 utterances across languages (NZ English, te reo Māori place names, Arabic, Hindi/Punjabi, Mandarin, Samoan/Tongan, Spanish), accents (NZ, diaspora, Pacific), noise levels (quiet / van / rain / traffic / indicator clicks), NZ addresses, numbers and self-corrections ("7… no, 17"). Metadata per file: `utt_id, lang, locale, speaker, snr_db, noise_type, transcript, address_gold, intent_gold, code_switch`.

**B. `docs/squads/voice/benchmarks/` — the turn-taking / barge-in harness.** Required measures, with a fixed device profile (CI emulator + one mid-range Android):

| Metric | Definition | Target (V4 §10.1) | Framework relevance |
|---|---|---|---|
| End-of-turn latency | last speech offset → agent starts speaking | ≤ 700 ms on-device path | measures VAD hangover vs semantic turn detection |
| Barge-in latency | user starts speaking → agent audio stops | ≤ 200 ms (proposed; **UNVERIFIED target, needs squad sign-off**) | transport + playback-buffer control |
| False interruption rate | agent stops when the user was not speaking | ≤ 1 per hour of driving | VAD threshold tuning |
| Missed turn rate | agent keeps talking over the user | ≤ 3 % | semantic turn detection vs pure VAD |
| Command→action | utterance → tool executed | ≤ 700 ms | framework + STT + tool round-trip |
| Battery | driving mode | ≤ 8 %/hour | transport + codec + audio session config |

**C. The eval audio must include a real driving-mode capture** (van noise bed + music + radio + passenger speech) — the false-interruption metric is meaningless without continuous multi-hour audio.

### What must be benchmarked

| Rank | Candidate | Benchmark | Status |
|---|---|---|---|
| 1 | **Pipecat** (our choice) | end-of-turn latency, barge-in latency, false-interruptions/hour over ≥ 8 h continuous driving audio, command→action with our typed tool catalogue | **UNVERIFIED — blocked on the eval set + harness** |
| 2 | **LiveKit Agents semantic turn detection** (as a drop-in processor, not the platform) | same metrics, side-by-side with pure VAD | **UNVERIFIED — blocked on the eval set + harness** |
| 3 | **OpenAI-Realtime-compatible speech-to-speech** | protocol conformance + our tool catalogue mapped onto Realtime function calling | **UNVERIFIED — blocked on the eval set + harness** |

**Published to `docs/squads/voice/benchmarks/`**: harness source, CSV of raw per-utterance results, device profile (SoC, RAM, Android API level, thermal state), commit SHA, and the exact Pipecat/LiveKit/speech-to-speech versions.

---

## What's new in 2026 (and what we adopt)

1. **First-party React Native client + RN transports in Pipecat** — *adopt*: no third-party RN bridge; `@pipecat-ai/react-native-small-webrtc-transport` gives us full-duplex WebRTC from the RN app without Daily's cloud.
2. **Semantic turn detection becomes standard** (LiveKit's transformer turn detector; TEN's VAD; Gemini Live) — *adopt the idea*: pure VAD is not enough for ≤ 3 % missed turns in a noisy van; we will evaluate a semantic endpoint model behind a Pipecat processor interface.
3. **The OpenAI Realtime protocol becomes the de-facto interop wire format** (speech-to-speech serves it over WS *and* WebRTC) — *adopt*: make it our private service's public protocol so the client is framework-agnostic.
4. **All-open local voice stacks reach v1** (speech-to-speech v1.0.0, 2026-09-06) with production evidence (Reachy Mini) — *adopt*: it proves the "private voice service" pattern is production-grade, not a toy.
5. **Rust realtime voice runtimes** (adk-rust, active-call, echokit_server) and a wave of 2026 entrants (qwen-audio-agent, Patter, flowcraft, Deuz, tapq, openspline, VoicEra, adk-rust) — *adopt the radar*: monthly re-scan per V4 §11.3.
6. **MCP as the tool-transport for voice agents** (LiveKit one-liner, pipecat-mcp-server, voice-mcp-agent) — *adopt the idea*: our typed tool catalogue (FINAL_PROMPT §4.5) can be exposed as MCP servers and consumed by any framework; the confirmation policy stays enforced in our tool layer.

---

## Decision

**ADOPT / KEEP**
1. **KEEP Pipecat as the server framework** (D22) — BSD-2-Clause, weekly releases, first-party React Native client *and* React Native transports, composable processor pipeline, Flows for structured dialogue, Whisker for debugging.
2. **ADOPT `@pipecat-ai/react-native-small-webrtc-transport` (or the WebSocket transport)** for the mobile link, pending a measured latency comparison.
3. **ADOPT the OpenAI Realtime wire protocol** for `services/voice` so the client is not tied to one framework and we can A/B backends.
4. **ADOPT Pipecat Flows** (from the main `pipecat` package — the standalone `pipecat-flows` repo is archived) for the deterministic multi-step voice flows (mark delivered → confirm → next stop).
5. **ADOPT Whisker** as a local dev/debug tool for the private voice service.
6. **ADOPT the semantic-turn-detection idea** as a pluggable Pipecat processor interface, evaluated against pure VAD on our eval set.

**WATCH** (re-scan monthly, V4 §11.3): `livekit/agents` (+ AgentsJS), `QwenAudio/qwen-audio-agent`, `huggingface/speech-to-speech` (as a backend option, not a dependency), `TEN-framework/ten-framework`, `OpenVoiceOS/ovos-core`, `google-gemini/gemini-live-api-examples`, `pipecat-ai/pipecat-mcp-server`, `h1papc11/voice-mcp-agent`, `leon-ai/leon`, `zavora-ai/adk-rust`, `buxuku/SmartSub`, `dograh-hq/dograh`, `NVIDIA-AI-Blueprints/nemotron-voice-agent`, `ServiceNow/eva`, `xzf-thu/VoiceMem`, `spaceamoeba-t/tapq`, and the 2026 newcomer group (Patter, flowcraft, Deuz, sutando, openspline, VoicEra, active-call, hermes-live-voice, PhoneAgent, eidolon-sc).

**REJECT**: `rhasspy/rhasspy` (archived/dead), `kwindla/macos-local-voice-agents` (macOS only), `daily-co/daily-python` (we do not use Daily's transport), `jitsi/jitsi-meet` (wrong shape — a conference server), `neural-maze/realtime-phone-agents-course` (material, not a library), `agentscope-ai/agentscope` (not voice-first; covered by the tool-calling research), and telephony-only projects (`aicc2025/sip-to-ai`, `hkjarral/AVA-AI-Voice-Agent-for-Asterisk` — telemetry-first, we are driver-first).

**Clean-room study candidates (§11.2):** `debpalash/VoiceStudio` (AGPL-3.0, already named in V4 §11.2 and D22) — its UX and feature list are the reference for our private voice service; **no code may be quoted**. `leon-ai/leon` licence to be confirmed before adding it to the list.

## Risks & fallbacks

| Risk | Impact | Mitigation / fallback |
|---|---|---|
| **OmniVoice weights are CC-BY-NC** (see `on-device-stt-tts-vad-kws.md`) | The server TTS in D22 is not commercially licensed | ADR + D22 update; ship on sherpa-onnx TTS / Kokoro / Piper-MIT voices; use OmniVoice internally only. **This is the single biggest open legal risk in the voice stack** |
| **No turn-taking benchmark exists** | We are choosing a framework on README claims | Build `docs/squads/voice/eval/` + `benchmarks/` harness **before** the framework PR lands |
| Pipecat's RN transports are **0.x** | API churn in our mobile client | Pin exact versions; wrap them behind our own `VoiceTransport` interface in `packages/` with a fake for tests (V4 §6.1) |
| Pipecat is Python; our services are TypeScript/Python? | Language split raises ops cost | `services/voice` is explicitly a Python service (D22 already assumes it); containerised, with a typed HTTP/WS contract generated from a schema |
| WebRTC adds complexity we do not need for v1 | Latency/CPU/battery cost on Android | Start with the **WebSocket transport** (simpler, fewer moving parts), benchmark, and only then try WebRTC. The ≤ 8 %/hour battery budget must be measured per transport |
| Vendor realtime APIs (Gemini Live, OpenAI Realtime) drift | Rebrewing our client | Our client speaks the OpenAI Realtime protocol and nothing vendor-specific; the provider is a config value |
| Semantic turn detection costs latency | Blows the ≤ 700 ms budget | Make it a swappable processor; keep the pure-VAD path as the fallback; measure both |

## UNVERIFIED items (explicit)

1. **6-month star trend for every candidate** — the GitHub API does not expose star history to this token; all counts are the 2026-10-20 snapshot. Trends are **UNVERIFIED**.
2. **Median maintainer response time and closed-issue ratio** — only open-issue counts were sampled. **UNVERIFIED.**
3. **Licence of**: `leon-ai/leon`, `buxuku/SmartSub`, `dograh-hq/dograh`, `PatterAI/Patter`, `ServiceNow/eva`, `COSS-India/VoicEra`, `openspline/openspline`, `second-state/echokit_server`, `rapidaai/voice-ai`, `NVIDIA-AI-Blueprints/nemotron-voice-agent`, `SalesforceAIResearch/VoiceAgentRAG`, `h1papc11/voice-mcp-agent`, `bentoml/BentoVoiceAgent`, `aicc2025/sip-to-ai`, `ferosai/feros`, and the whole 2026 newcomer group — **not fetched; UNVERIFIED.**
4. **Licence of `google-gemini/gemini-live-api-examples`** — GitHub reports NOASSERTION; the underlying licence file was **not read**. **UNVERIFIED.**
5. **New Architecture / Expo SDK 58 / Android API 34 support** for the Pipecat and LiveKit **React Native client packages** — neither README states it; we already ship `@pipecat-ai/client-js@1.14.0`, so this must be proven on the RN 0.88 branch. **UNVERIFIED.**
6. **Model weights licences** for the speech-to-speech default pipeline (Qwen3.5-4B, Qwen3-TTS, Parakeet TDT) — Parakeet is CC-BY-4.0; the Qwen checkpoints were **not checked**. **UNVERIFIED.**
7. **Production user counts** — only `huggingface/speech-to-speech` (Reachy Mini, "thousands") makes a verifiable claim. For Pipecat, LiveKit, TEN, OpenVoiceOS the production base is **UNVERIFIED.**
8. **CI status / test coverage per repo** — not sampled for this area (V4 §12.3 asks for it); only the badges visible in the READMEs I read were recorded. **UNVERIFIED.**
9. **Bundle sizes** of the RN client packages — not measured. **UNVERIFIED.**
10. **Whether Pipecat Flows is API-identical inside the main `pipecat` package** — the README states Flows is built in, but the import path/version compatibility was not verified in code. **UNVERIFIED.**
