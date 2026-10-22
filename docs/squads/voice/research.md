# Voice Assistant Squad - research

**Area:** on-device STT/TTS/VAD/KWS · voice agent frameworks · multilingual voice & i18n · LLM tool calling **Research date:** 2026-10-20 · **Source files:** `docs/research/2026/{on-device-stt-tts-vad-kws, voice-agent-frameworks,
multilingual-voice-i18n, llm-tool-calling}.md`

## Queries that found the candidates

`gh search repos "on-device speech recognition" --sort stars` · `"offline speech recognition android"` · `"wake word detection"` · `"voice activity detection"` · `topic:speech-recognition pushed:>2026-04-01` · `"sherpa onnx speech"` ·
`"voice agent" --sort stars` · `"turn taking voice agent"` · `topic:voice-agent` · `"i18n react-native"` · `"language-detection"` · `"multilingual asr"` · `"maori language"` · `"llm tool calling function calling"` ·
`topic:model-context-protocol stars:>100` · `huggingface.co/api/models/<id>` for weights licences · `npm view <pkg> version license time.modified`. Candidates examined: **38** (STT/TTS/VAD/KWS) · **40** (frameworks) · **46** (i18n) · **33**
(tool calling).

## Candidates that matter

| Project | Repo | Licence | One-line reason |
|---|---|---|---|
| sherpa-onnx | `k2-fsa/sherpa-onnx` | Apache-2.0 (code + models) | Only stack that covers STT+TTS+VAD+custom-KWS in one binary, with open-vocabulary keyword spotting. |
| react-native-sherpa-onnx | `XDcobra/react-native-sherpa-onnx` | MIT | Our own thin New-Architecture wrapper; already pinned at 0.4.4. |
| Kokoro | `hexgrad/kokoro` | Apache-2.0 (code **and** weights) | 82 M params, fits the APK budget, covers en/hi/zh/es; the safe on-device TTS. |
| Parakeet TDT v2 | HF `nvidia/parakeet-tdt-0.6b-v2` | CC-BY-4.0 (commercial OK) | Best published English WER under a commercial licence; server-side fallback only. |
| OmniVoice | `k2-fsa/OmniVoice` | code Apache-2.0, **weights CC-BY-NC** | Only candidate covering our full language list — and the weights are non-commercial. **ADR required.** |
| Pipecat | `pipecat-ai/pipecat` | BSD-2-Clause | Our locked server framework; now has a first-party React Native client *and* RN transports. |
| speech-to-speech | `huggingface/speech-to-speech` | Apache-2.0 | Serves the OpenAI Realtime protocol over WS and WebRTC; only candidate with verified production users. |
| LiveKit Agents | `livekit/agents` | Apache-2.0 | Semantic turn detection and native MCP; the strongest alternative, but it drags in a media server. |
| Qwen3-ASR / Qwen3-TTS | HF `Qwen/Qwen3-ASR-1.7B`, `Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice` | Apache-2.0 | The licence-clean multilingual answer to the OmniVoice problem. |
| i18next + react-i18next + Lingui + formatjs | `i18next/i18next`, `lingui/js-lingui`, `formatjs/formatjs` | MIT / MIT / MIT per package | We have **no** i18n runtime today; this is the runtime + compile step + plural rules. |
| expo-localization | `expo/expo` | MIT | Device locale list and the RTL flag, at exact SDK-58 parity. |
| lingua-py / franc | `pemistahl/lingua-py`, `wooorm/franc` | Apache-2.0 / MIT | Two-tier language detection: cheap on device, authoritative on the server. |
| pydantic-ai | `pydantic/pydantic-ai` | MIT | The only agent framework whose evals score **tool-call trajectories** — our voice metric. |
| Vercel AI SDK | `vercel/ai` | Apache-2.0 (npm tarball) | Best TypeScript tool-calling ergonomics; direct provider packages only, never the gateway. |
| MCP SDKs | `modelcontextprotocol/python-sdk`, `.../typescript-sdk` | MIT | The interop layer over our typed tool catalogue. |

## Deep review - top 5 (per source file)

1. **sherpa-onnx** - open-vocabulary KWS (our wake phrase as a text file, no retraining), hotwords shared between KWS and STT for the LINZ vocabulary, weekly releases, 3 maintainers/90 d. **Verdict KEEP.**
2. **whisper.rn** (`mybigday/whisper.rn`, MIT) - ships Whisper *and* Parakeet with SHA-256-verified prebuilts, but a single maintainer and **no stated New-Arch/Expo-58 support**. **Verdict WATCH.**
3. **Silero VAD** (`snakers4/silero-vad`) - README badge says CC BY-NC 4.0 while the `LICENSE` file says MIT; we use sherpa-onnx's bundled VAD and never add the package. **Verdict KEEP (via sherpa).**
4. **Kokoro** - weights licence verified Apache-2.0; 10.5 M downloads; **no Arabic, no te reo, no Samoan/Tongan**; repo stalled since 2025-08. **Verdict KEEP.**
5. **OmniVoice** - the licence finding that changes D22: the model card states the pre-trained model is CC-BY-NC, and the bundled audio tokenizer carries a separate community licence with an above-100k-MAU condition. **Verdict WATCH -> ADR
   REQUIRED; internal use only.**

**Framework deep review.** **Pipecat KEEP** (confirms D22) · **LiveKit WATCH** (steal the semantic turn detector, do not adopt the platform) · **speech-to-speech ADOPT the protocol** · **qwen-audio-agent
   WATCH** (2026 newcomer) · **OpenVoiceOS WATCH** (offline design reference). i18n deep review: **i18next ADOPT** · **Lingui ADOPT (compile step)** · **expo-localization ADOPT** · **lingua-py ADOPT (server)** · **Qwen3-ASR/TTS ADOPT as
   candidates**. Tool-calling deep review: **pydantic-ai ADOPT** · **AI SDK ADOPT** · **MCP ADOPT** · **zod KEEP** (ours) · **litellm WATCH**.

## Decisions

- **KEEP** sherpa-onnx as the single on-device engine (our wrapper, pinned) · Kokoro for on-device TTS + MIT Piper voices for the Arabic/Hindi gap · Silero VAD *through* sherpa-onnx, no second native VAD.
- **ADOPT** the openWakeWord / microWakeWord *training method* to build our own wake model (Apache-2.0 code and model zoo); **REJECT** the bundled NC openWakeWord models. **ADOPT** sherpa-onnx hotwords for the LINZ street/suburb vocabulary
  (one file for KWS and STT).
- **KEEP** Pipecat (D22) + `pipecat.flows` from the main package; **ADOPT** the OpenAI Realtime wire protocol and the `@pipecat-ai/react-native-*` transports; **ADOPT** Whisker as a local dev tool.
- **ADOPT** i18next + react-i18next, Lingui's ICU compile step, `@formatjs/intl-pluralrules` + `intl-localematcher`, `expo-localization`, franc (device LID) + lingua-py (server LID).
- **ADOPT** pydantic-ai (Python) + Vercel AI SDK (TypeScript) + MCP adapters; **KEEP** zod as the single TS schema source; validate every tool argument before the tool body runs.
- **WATCH** `mybigday/whisper.rn`, `livekit/agents`, `moonshine-ai/moonshine`, `ggml-org/whisper.cpp`, `openai/whisper`, `QwenAudio/qwen-audio-agent`, `TEN-framework/*`, `ICU4X`, `Tolgee`, `Lingo.dev`.
- **REJECT (shipped bundle)** `ten-vad` (extra field-of-use restriction), `piper1-gpl` and `espeak-ng` (GPL-3.0), `rhasspy/piper` engine (archived), `vosk-api` (stale), `pocketsphinx` (licence "Other"), `libfvad` (no end-of-turn),
  `android-vad` (redundant), `snowboy` (abandoned), `WhisperKitAndroid` (archived), `crewAI` (nondeterminism), `llama_index` (no corpus), `litellm` on the hot path.
- **REJECT (non-commercial weights)** OmniVoice weights, `facebook/mms-tts-*`, `facebook/nllb-200`, `facebook/xls-r` (all CC-BY-NC-4.0), Moonshine legacy non-English models, TEN-VAD weights.

## UNVERIFIED

1. **No benchmark exists.** `packages/eval/voice/` and `docs/squads/voice/benchmarks/` contain no dataset and no harness, so **every** performance number here (WER, intent accuracy, false accepts, command->action, battery) is unmeasured
   by us.
2. OmniVoice **main checkpoint SPDX id** (the HF card has no `license:` tag) and Silero VAD **model weights** licence (badge vs file contradiction). UNVERIFIED.
3. New Architecture / Expo SDK 58 / Android API 34 support - not stated for `whisper.rn`, `react-native-sherpa-onnx`, `android-vad`, `ReactNative_WakeWordDetection`, `react-native-openwakeword`, `FluidAudio`, `argmax-oss-swift`, nor for the
   Pipecat and LiveKit React Native clients. UNVERIFIED.
4. Per-language coverage of Qwen3-ASR / Qwen3-TTS (mi/sm/to/pa); the `Qwen3-ASR-Flash` licence (HF returned HTTP 401); Hermes `Intl` availability in our Expo SDK 58 build; i18n bundle sizes. UNVERIFIED.
5. 6-month star trend for every candidate; median maintainer response time; closed-issue ratio; exact ONNX model sizes in MB for the sherpa-onnx KWS/ASR/TTS bundles and Kokoro int8; whether pydantic-ai's evals can score *our* trajectory
   format. UNVERIFIED.
