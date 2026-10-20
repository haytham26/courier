# ADR-004 — The private voice service: sherpa-onnx and Kokoro on device, no non-commercial weights

- **Status:** accepted (supersedes the D22 premise about OmniVoice)
- **Date:** 2026-10-20
- **Decides:** D22 in `docs/DECISIONS.md` (the private voice service)
- **Research:** `docs/research/2026/on-device-stt-tts-vad-kws.md`, `docs/research/2026/voice-agent-frameworks.md`,
  `docs/research/2026/multilingual-voice-i18n.md`, `docs/study/voicestudio/SPEC.md`

## Context

D22 asks for a **private voice service** (`services/voice`) built on k2-fsa/OmniVoice (Apache-2.0),
sherpa-onnx and Pipecat, with VoiceStudio as a reference tool only.

The research sprint checked the **licence of the artefacts, not only the licence of the code**, and the
premise does not hold:

| Artefact | Code licence | Artefact licence | Usable in a commercial product? |
|---|---|---|---|
| k2-fsa/sherpa-onnx | Apache-2.0 | Apache-2.0 (code + most bundled models) | yes |
| k2-fsa/OmniVoice **code** | Apache-2.0 | — | yes |
| k2-fsa/OmniVoice **pretrained weights** | — | **CC-BY-NC** (the model card states the weights are non-commercial because of the Emilia training data) | **no** |
| OmniVoice `audio_tokenizer/` weights | — | **Boson Higgs Audio 2 Community Licence** (attribution, no use to improve other models, wider licence above 100k MAU) | **no for our scale** |
| Kokoro TTS | Apache-2.0 | Apache-2.0 (weights) | yes |
| facebook/mms-tts-\*, nllb-200, xls-r | — | CC-BY-NC-4.0 | no |
| openWakeWord shipped models | Apache-2.0 (code) | CC BY-NC-SA (weights) | no |
| Silero VAD | MIT (file) / CC BY-NC 4.0 (README badge) | **contradictory — UNVERIFIED** | only after we read the file ourselves |

The rule that matters is in our own `CONSTRAINTS.md` and FINAL_PROMPT §9: **no non-commercial
licence may reach the shipped app**, and the licence inventory must cover the *artefacts*, not only
the repositories.

## Decision

1. **`services/voice` is built on sherpa-onnx (STT, TTS, VAD, KWS, LID) and Pipecat**, running
   privately on our own infrastructure. This is unchanged from D22.
2. **OmniVoice is not used for its shipped weights.** The code may be read as a reference, but the
   CC-BY-NC weights are not downloaded, not redistributed and not served to drivers. If the
   non-commercial term is ever lifted, a new ADR can revisit it.
3. **The server-side multilingual TTS/STT candidate is Qwen3-ASR / Qwen3-TTS (Apache-2.0 weights)**
   instead of OmniVoice, with Kokoro (Apache-2.0) for the English/NZ voice and the multilingual
   coverage marked UNVERIFIED per language until the voice squad's eval set exists.
4. **The licence ledger is a shipped surface, not a spreadsheet.** The voice service publishes, for
   every engine it can load, the licence of the code *and* of the weights; a non-commercial or
   unknown licence makes that engine unavailable, with the reason, and the build fails on a
   non-commercial weight that is present in the tree. (Requirement R2 of
   `docs/study/voicestudio/SPEC.md`.)
5. **VoiceStudio stays a reference**, and the clean-room study (`docs/study/voicestudio/`) is the
   only thing we take from it. No VoiceStudio code, text or schema enters this repository.

## Consequences

- The product is shippable commercially with the voice pipeline as it is planned.
- The private service needs an **engine registry** that reports "unavailable + reason" per engine
  (the licence is one of the reasons), so the driver never meets a dead control.
- The voice squad's eval set (`docs/squads/voice/eval/`, 500+ utterances) must include a
  **licence check per model** in the harness.
- The "no non-commercial weights" rule becomes an automated gate, not a review step.

## Risks

| Risk | Mitigation |
|---|---|
| Qwen3's per-language coverage for te reo Māori, Samoan, Tongan, Punjabi is unknown | the voice squad's eval set measures it; the fallback is sherpa-onnx + the multilingual models it already ships |
| The Silero VAD licence contradiction is unresolved | read the file in the tree ourselves before use; until then, sherpa-onnx's own VAD is the default |
| A model is swapped in later without a licence check | the licence ledger (point 4) and the CI gate block it |

## Verification

- The licence table above comes from the model cards and repositories read on 2026-10-20 and is
  recorded with the links in `docs/research/2026/on-device-stt-tts-vad-kws.md`.
- The build gate is a task in the voice squad's plan: `docs/squads/voice/STATUS.md`.
