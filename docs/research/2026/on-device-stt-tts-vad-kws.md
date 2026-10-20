# On-device STT / TTS / VAD / KWS — 2026 research

**Area:** V4 §3 "on-device STT/TTS/VAD/KWS" · V4 §10.1 (Voice Assistant Squad) · V4 §12 methodology
**Research date:** 2026-10-20 (all stars/dates copied from the GitHub/HF/npm page on this date)
**Role:** Researcher (V4 §1 role 2) · **Squad:** Voice (`docs/squads/voice/`)
**Baseline we are comparing against (current choice):** `react-native-sherpa-onnx@0.4.4` (MIT, npm 0.4.4, modified 2026-09-08, repo `XDcobra/react-native-sherpa-onnx`, created 2026-01-25, ★41, pushed 2026-10-18) inside Expo SDK 58.0.14 / RN 0.88 / `expo-audio@58.0.9`; server side D22 = `k2-fsa/OmniVoice` + `k2-fsa/sherpa-onnx` + Pipecat.
**Tooling:** `scripts\gh.ps1` (GitHub CLI, token from `.env.local`, never printed), npm registry, huggingface.co model API.

---

## Queries run

All commands run from the repo root, 2026-10-20.

1. `gh search repos "on-device speech recognition" --sort stars --limit 30`
2. `gh search repos "offline speech recognition android" --sort stars --limit 30`
3. `gh search repos "wake word detection" --sort stars --limit 30`
4. `gh search repos "voice activity detection" --sort stars --limit 30`
5. `gh search repos "topic:speech-recognition pushed:>2026-04-01 stars:>50" --sort stars --limit 40`
6. `gh search repos "sherpa onnx speech" --sort stars --limit 30`
7. `gh search repos "whisper.cpp android react-native" --sort stars --limit 30`
8. `gh search repos "sherpa-onnx" --sort stars --limit 20`
9. `gh search repos "react-native whisper" --sort stars --limit 20`
10. `gh search repos "topic:on-device-speech" --sort stars --limit 25`
11. `gh search repos "topic:text-to-speech" --sort stars --limit 30`
12. `gh search repos "endpointing" --sort stars --limit 20` / `gh search repos "turn taking voice agent" --sort stars --limit 20`
13. `gh api repos/<owner>/<repo>` (stars, license, created_at, pushed_at, open_issues_count, forks, archived) for every repo below
14. `gh api repos/<owner>/<repo>/releases?per_page=3` (last release + cadence)
15. `gh api repos/<owner>/<repo>/commits?per_page=20` (90-day maintainer activity)
16. `gh api repos/<owner>/<repo>/license` (raw licence text, to catch "Other"/NOASSERTION)
17. `npm view <pkg> version license time.modified repository.url` — `react-native-sherpa-onnx`, `whisper.rn`, `expo-audio`, `expo-speech`, `react-native-tts`, `react-native-live-audio-stream`, `onnxruntime-web`, `@huggingface/transformers`, `react-native-nitro-modules`
18. `huggingface.co/api/models/{k2-fsa/OmniVoice, hexgrad/Kokoro-82M, nvidia/parakeet-tdt-0.6b-v2, TEN-framework/TEN-VAD, facebook/mms-tts-eng}` + `huggingface.co/k2-fsa/OmniVoice/raw/main/README.md` + `.../audio_tokenizer/LICENSE`
19. `raw.githubusercontent.com/{snakers4/silero-vad, dscripka/openWakeWord, kahrendt/microWakeWord, moonshine-ai/moonshine}/…/LICENSE|README.md`
20. `k2-fsa.github.io/sherpa/onnx/kws/index.html` (open-vocabulary KWS + pretrained KWS model list)

---

## Candidate evidence cards

**1. k2-fsa/sherpa-onnx** — https://github.com/k2-fsa/sherpa-onnx
★15,394 · created 2022-09-01 · last release **v1.13.8 (2026-09-10)** · cadence ~weekly (2026-09-10 / 09-01 / 08-25) · pushed 2026-10-20 · open issues 667 · forks 2,234 · last-20 commits 2026-10-20→2026-09-21 by csukuangfj(7), paoloantinori(3), Cassian433(2) → 3 maintainers in 90 d.
Licence **Apache-2.0 (code + shipped ONNX models)** · on-device ✔ (Android/iOS/HarmonyOS arm64/32, x86_64) and server ✔ · one binary gives STT, TTS, VAD, KWS, spoken-language-ID, punctuation, diarization, speech enhancement · **open-vocabulary KWS: any keyword list without retraining** (boost score + trigger threshold per keyword) · pretrained KWS models: `sherpa-onnx-kws-zipformer-zh-en-3M-2025-12-20`, `…-wenetspeech-3.3M-2024-01-01` (zh), `…-gigaspeech-3.3M-2024-01-01` (en) · model sizes: 3M-param KWS ≈ few MB (exact MB UNVERIFIED) · New Arch: n/a (C++/JNI, wrapped by us) · Expo SDK 58: n/a · Android API 34: UNVERIFIED (no explicit statement found).
Better than our current choice: one library covers all four on-device functions **and** lets us ship a bespoke wake phrase / NZ place-name keyword list with zero retraining.
Risks: 667 open issues; model files are hosted outside the repo (supply-chain checksum discipline required); no te reo/Arabic/Hindi/Samoan KWS checkpoint shipped.
**DECISION: KEEP** — Apache-2.0, weekly releases, only stack that covers STT+TTS+VAD+custom-KWS in one binary.

**2. mybigday/whisper.rn** — https://github.com/mybigday/whisper.rn
★806 · created 2023-03-16 · last release **v0.8.0-rc.2 (2026-10-07)** · cadence ~monthly (2026-10-07 / 09-17 / 09-17) · pushed 2026-10-07 · open issues 5 · last-20 commits 2026-10-07→2026-08-27 by jhen0409(18) → **single-maintainer bus factor 1** · npm `whisper.rn` 0.7.4, MIT, modified 2026-10-07.
Licence MIT (code) + upstream whisper.cpp MIT + Parakeet weights CC-BY-4.0 · on-device ✔ · prebuilt `rnwhisper.xcframework` + `jniLibs` fetched at postinstall **with SHA-256 verification** · NDK ≥ 24.0.8215888 required · experimental Hexagon NPU path · ProGuard rule needed.
Better than our current choice: ships **NVIDIA Parakeet** support (Parakeet-tdt-0.6b-v2 is CC-BY-4.0 = commercially usable) alongside Whisper; far better RN ergonomics than a raw C++ binding.
Risks: RN version-coupled prebuilt binaries — Expo SDK 58 / RN 0.88 / New Architecture support **UNVERIFIED** (README does not state New Arch support; it says the JSI wrapper "is compiled against your React Native version"); single maintainer; models downloaded at runtime from HF (pin + checksum).
**DECISION: WATCH** — best RN ergonomics and Parakeet parity, but New-Arch/Expo-58 compatibility and single-maintainer risk must be proven on our branch before adoption.

**3. XDcobra/react-native-sherpa-onnx** — https://github.com/XDcobra/react-native-sherpa-onnx
★41 · created 2026-01-25 · last release **v0.4.4 (2026-09-08)** · pushed 2026-10-18 · open issues 6 · forks 7 · last-20 commits 2026-09-08→2026-04-07 by XDcobra(16) → single active maintainer.
Licence MIT · npm `react-native-sherpa-onnx` 0.4.4, MIT, modified 2026-09-08 · on-device ✔ (thin RN/Nitro-JSI wrapper over sherpa-onnx) · **already in our `apps/mobile/package.json`**.
Better than alternatives: we already depend on it, it is MIT, it is a thin wrapper (no forked engine), and it is built on `react-native-nitro-modules` (which we already use) → New-Architecture-native.
Risks: ★41 and one maintainer — upstream sherpa-onnx features only land when the author bumps the wrapper; no Expo config-plugin / no `expo-module-scripts` evidence found (**UNVERIFIED**); model download/version pinning is ours to enforce.
**DECISION: KEEP** — current choice; keep, but treat as a thin adapter we own and pin.

**4. snakers4/silero-vad** — https://github.com/snakers4/silero-vad
★10,477 · created 2020-11-23 · last release **v6.2.3 (2026-09-23)** · cadence (2026-09-23 / 09-17 / 02-24) · pushed 2026-09-29 · open issues 16 · last-20 commits 2026-09-29→2026-08-24 by adamnsandle(12) → 1–2 maintainers.
Licence: `LICENSE` file is **MIT (Silero Team, 2020-present)**; README badge says "CC BY-NC 4.0" — **badge contradicts the licence file; treat model-weights licence as UNVERIFIED until Silero confirms in writing.** on-device ✔ (ONNX, 1–2 MB, 30 ms frames, 8/16 kHz).
Better than our current choice: the de-facto VAD baseline, tiny, ships a native AND-ONNX build; sherpa-onnx also ships a Silero-derived VAD so we may not need a second engine.
Risks: licence-badge inconsistency; Python-first packaging; Android FFI needed.
**DECISION: KEEP (via sherpa-onnx's built-in Silero VAD)** — avoid a second native dependency; do not add the Python package.

**5. dscripka/openWakeWord** — https://github.com/dscripka/openWakeWord
★2,858 · created 2022-05-28 · last release **v0.6.0 (2024-02-11)** · pushed 2025-12-30 · open issues 132 · last-20 commits 2025-12-30→2024-02-11 by dscripka(19) → effectively **1 maintainer, no release in 2.7 years**.
Licence: code **Apache-2.0**; **shipped pre-trained models CC BY-NC-SA 4.0 → non-commercial, unusable in our product**. English only.
Better than our current choice: training pipeline is genuinely good (synthetic-only data, <1 h to train a custom wake word), and openWakeWord reports FA < 0.5/h, FR < 5 % on its own protocol — exactly our targets (≤1/h, ≤3 %).
Risks: **shipped models are NC**; repo is stale; custom model training is "advanced-user only"; no Android/RN binding.
**DECISION: WATCH** — take the *method* (train our own "Hey Courier" model with the Apache-2.0 code on our own audio); **REJECT the bundled NC models**.

**6. OHF-Voice/micro-wake-word** — https://github.com/OHF-Voice/micro-wake-word
★951 · created 2024-01-08 · last release `okay_nabu_20241226.3` (2024-12-31) · pushed 2026-07-06 · open issues 34 · last-20 commits 2026-07-06→2024-02-24 by kahrendt(4) → 1 maintainer.
Licence: repo **Apache-2.0**; pre-trained models live in `esphome/micro-wake-word-models` (**Apache-2.0**, ★126, pushed 2026-10-01) → **commercially usable**, unlike openWakeWord's.
Better than our current choice: TFLM-micro MixConv streaming model, int8-quantised, "false accepts per hour" is the *primary* training objective — our exact metric; 30 ms inference.
Risks: TFLM (not ONNX) — RN/Android integration path is DIY; training still "very difficult" per README; English-centric synthesiser source (Piper) for training data.
**DECISION: WATCH** — the most licence-clean custom-KWS trainer; candidate for our own "Hey Courier" model, but needs an ONNX/TFLM→sherpa-onnx or our own runtime.

**7. k2-fsa/OmniVoice** — https://github.com/k2-fsa/OmniVoice
★15,134 · created **2026-03-31** · last release **0.2.1 (2026-07-16)** · cadence (2026-07-16 / 07-06 / 04-28) · pushed 2026-10-19 · open issues 67 · forks 2,234 · HF model `k2-fsa/OmniVoice` **1,799,588 downloads**, last modified 2026-07-03, 612.6 M params, 3.27 GB storage · arXiv 2604.00688.
Licence: **code Apache-2.0**; **model card README states verbatim: "Our code is released under the Apache 2.0 License. The pre-trained model is licensed under the CC-BY-NC due to constraints from its training data (e.g., Emilia)."** The bundled `audio_tokenizer/` weights carry a separate **Boson Higgs Audio 2 Community License** (Llama-3-style: attribution display, no use to improve other LLMs, expanded licence required above 100k MAU).
Better than our current choice: 600+ languages, voice cloning/design, RTF as low as 0.025 (40× real time) — the only candidate that covers te reo Māori place names, Arabic, Hindi/Punjabi, Mandarin, Samoan/Tongan in one model.
Risks: **CC-BY-NC weights are not commercially usable — D22's commercial premise is broken.** Server-only (Python + PyTorch, needs GPU/Apple-Silicon), not on-device.
**DECISION: WATCH → ADR REQUIRED** — the engine is excellent but **the weights are non-commercial**; it can drive our *internal* synthetic-audio generation and evaluation set, not our shipped product, until a commercial licence is obtained in writing.

**8. hexgrad/kokoro** — https://github.com/hexgrad/kokoro
★9,511 · created 2025-01-10 · **no GitHub releases** · pushed 2025-08-06 · open issues 213 · last-20 commits 2025-08-06→2025-02-27 by hexgrad(8) → 1 primary maintainer · HF `hexgrad/Kokoro-82M` **10,536,550 downloads**, licence **apache-2.0** (weights), 82 M params, 1.23 GB storage.
Licence Apache-2.0 for both code and weights · on-device via ONNX (sherpa-onnx exports exist) ✔ · voices: en (US/UK/AU) + fr, hi, ja, it, pt, es, zh → covers **Hindi** ✔, **Mandarin** ✔, **Spanish** ✔; **no Arabic, no te reo, no Samoan/Tongan**.
Better than our current choice: 82 M params — light enough for the on-device ≤ 80 MB APK budget once quantised; Apache-2.0 weights, zero licence risk.
Risks: repo stalled since 2025-08; en-AU voice exists but no NZ English voice; no Arabic.
**DECISION: KEEP** — the safe default on-device TTS; sherpa-onnx already ships a Kokoro export path.

**9. TEN-framework/ten-vad** — https://github.com/TEN-framework/ten-vad
★2,290 · created 2025-04-29 · last release **v1.0 (2025-07-11)** · pushed 2026-10-09 · open issues 25 · forks 180 · last-20 commits 2026-10-09→2025-11-15 by Ziyi6(15) → 1–2 maintainers · HF `TEN-framework/TEN-VAD` (288 downloads, updated 2026-03-13).
Licence: **"Apache License v2.0 … with the following additional conditions" — including "You may not Deploy the ten-vad in a way that competes with Agora's offerings" (Agora copyright)** → **not a clean permissive licence**; model HF card has **no licence tag** → weights licence UNVERIFIED.
Better than our current choice: purpose-built for *conversational* VAD (speech-end detection) rather than binary speech/non-speech — directly relevant to barge-in and end-of-turn.
Risks: **additional Agora field-of-use restriction breaks the "prefer MIT/BSD/Apache/MPL" rule**; weights licence unstated.
**DECISION: REJECT for the shipped bundle** — study the end-of-turn algorithm only; the licence is not clean enough for a closed-source commercial app.

**10. moonshine-ai/moonshine** — https://github.com/moonshine-ai/moonshine
★11,260 · created 2024-10-04 · last release **v0.1.5 (2026-08-24)** · cadence (2026-08-24 / 08-18 / 08-13) · pushed 2026-10-02 · open issues 12 · last-20 commits 2026-08-24→2026-08-22 by **Pete Warden(20) → single maintainer** · licence file = "MIT for code **except** `core/third-party`".
Licence: **code MIT**; **all streaming + English Tiny/Base models MIT**; the legacy non-streaming models for **Arabic, Japanese, Korean, Mandarin, Spanish, Ukrainian, Vietnamese** are under the **Moonshine AI Community License** (commercial only under US$1 M annual revenue, registration required, "Powered by Moonshine AI" attribution).
Better than our current choice: extremely low latency, tiny models, MIT for English and all streaming — a credible on-device STT candidate that beats Whisper on speed.
Risks: single maintainer; **our target languages Arabic and Mandarin hit the Community Licence**; TTS/phonemiser models are third-party licensed separately.
**DECISION: WATCH** — MIT English streaming model is a real fallback; non-English models are licence-conditional.

**11. ggml-org/whisper.cpp** — https://github.com/ggml-org/whisper.cpp
★54,499 · created 2022-09-25 · last release **v1.9.5 (2026-10-06)** · cadence ~weekly · pushed 2026-10-19 · open issues 353 · licence **MIT**.
On-device ✔ (Core ML / NNAPI / Vulkan / Hexagon backends), multilingual (99 languages), has hotwords/contextual-biasing support.
Better than our current choice: the reference engine behind `whisper.rn`; strong backend coverage for mid-range Android.
Risks: **English-centric WER on NZ addresses is not guaranteed**; large model memory; heavier than a dedicated KWS/VAD pipeline; MIT but model weights are the original Whisper MIT checkpoint (fine).
**DECISION: WATCH** — keep as the reference engine behind `whisper.rn`, not as our default on-device model.

**12. openai/whisper** — https://github.com/openai/whisper
★110,908 · created 2022-09-16 · last release **v20250625 (2025-06-26)** · pushed 2026-08-31 · open issues 175 · licence **MIT** (code *and* weights) · 99 languages, `language`/`task`/`initial_prompt` (hotword biasing) built in.
Better than our current choice: MIT weights (unlike Parakeet-NC) and prompt-based context biasing is the cheapest route to LINZ street/suburb vocabulary.
Risks: Python reference only (we would run whisper.cpp, not this); no true streaming; 16 kHz input; last release 2025-06 (repo still commits).
**DECISION: WATCH** — MIT weights + prompt biasing make it the fallback STT if a leaner model misses our WER target.

**13. nvidia/parakeet-tdt-0.6b-v2 (HF)** — https://huggingface.co/nvidia/parakeet-tdt-0.6b-v2
194,030 downloads · licence **CC-BY-4.0 (commercial OK)** · last modified 2026-06-29 · **English only** · published WER: LibriSpeech clean **1.69 %**, other **3.19 %**, GigaSpeech 9.74 %, SPGI 2.17 %.
Better than our current choice: the best published English WER we found with a permissive licence, and `whisper.rn` already exposes it on RN.
Risks: **English-only**; 0.6 B params is too big for our on-device budget (server/PC candidate); published WER is on LibriSpeech, **not on our NZ-address set** → UNVERIFIED for our use case.
**DECISION: ADOPT (server-side fallback STT)** — best measured English WER under a commercial licence; measure on our eval set before it becomes the default.

**14. alphacep/vosk-api** — https://github.com/alphacep/vosk-api
★15,187 · created 2019-09-03 · last release **v0.3.50 (2024-04-22)** · pushed 2026-10-15 · open issues 602 · licence **Apache-2.0** · offline STT for Android/iOS/PI/server, ~20 small models, some multilingual.
Better than our current choice: tiny CPU-only models with a full Android library and 20+ language models.
Risks: release frozen 2024; WER far above Parakeet/Whisper; large model catalogue, no te reo.
**DECISION: REJECT** — stale, materially worse WER, no NZ coverage.

**15. cmusphinx/pocketsphinx** — https://github.com/cmusphinx/pocketsphinx
★4,352 · created 2014-04-07 · last release **v5.1.1 (2026-06-06)** · cadence ~monthly in 2026-05/06 · pushed 2026-10-13 · open issues 40 · licence **NOASSERTION ("Other")** → raw licence must be read before use.
Better than our current choice: tiny CPU footprint, still maintained, good for offline command grammars.
Risks: licence not a clean SPDX id; archaic grammar API; low WER; poor multilingual.
**DECISION: REJECT** — grammar-based ASR is the wrong shape for natural courier dictation.

**16. gkonovalov/android-vad** — https://github.com/gkonovalov/android-vad
★511 · created 2019-11-28 · last release **2.0.10 (2025-07-15)** · pushed 2025-07-15 · open issues 5 · licence MIT · Android-native Silero VAD port.
Better than our current choice: zero-JNI Android binding, trivial to add.
Risks: 15 months stale; duplicates sherpa-onnx's VAD.
**DECISION: REJECT** — redundant with the VAD already inside our sherpa-onnx module.

**17. pykeio/earshot** — https://github.com/pykeio/earshot
★218 · created 2024-09-28 · last release **1.2.2 (2026-08-19)** · pushed 2026-08-30 · open issues 2 · licence **Apache-2.0** · Rust VAD.
Better than our current choice: tiny, dependency-free Rust VAD; a good reference implementation.
Risks: Rust → RN bridging cost; less accurate than Silero-derived models; young project.
**DECISION: WATCH** — reference implementation for our VAD comparison, not a dependency.

**18. dpirch/libfvad** — https://github.com/dpirch/libfvad
★609 · created 2016-09-17 · last push 2024-04-02 · licence **BSD-3-Clause** · WebRTC-derived GMM VAD, C.
Better than our current choice: negligible CPU, no model file — but it is only a *speech/non-speech* detector.
Risks: no neural accuracy; unmaintained.
**DECISION: REJECT** — cannot serve end-of-turn/barge-in.

**19. filippogiruzzi/voice_activity_detection** — https://github.com/filippogiruzzi/voice_activity_detection
★372 · created 2019-12-11 · pushed 2026-07-22 · licence **GPL-3.0** → **clean-room only**.
**DECISION: REJECT (copyleft)** — listed in the clean-room study list; no code may enter our bundle.

**20. OHF-Voice/piper1-gpl** — https://github.com/OHF-Voice/piper1-gpl
★5,929 · created 2025-03-28 · last release date UNVERIFIED (pushed 2026-10-17) · open issues 149 · licence **GPL-3.0** · 100+ voices, ONNX, fast.
Better than our current choice: 100+ languages incl. hi, ar, zh — but GPL-3.0 forbids linking into our proprietary app.
**DECISION: REJECT (copyleft)** — clean-room study candidate only; the old MIT `rhasspy/piper` (★11,302, MIT, **archived 2025-08-26**) is the only permissible route and it is stale.

**21. rhasspy/piper** — https://github.com/rhasspy/piper
★11,302 · created 2023-01-10 · **archived**, last commit 2025-08-26 · licence **MIT** · 100+ MIT-licensed voices (incl. `en_NZ`? — NZ voice availability UNVERIFIED; `ar`, `hi`, `zh`, `es` present).
Better than our current choice: MIT voices in Arabic/Hindi/Mandarin/Spanish that Kokoro lacks — exactly our gap languages.
Risks: **archived**; successors moved to GPL.
**DECISION: WATCH** — harvest the **MIT voice models** list for our Arabic/Hindi/Mandarin gap; the engine itself is dead.

**22. argmaxinc/argmax-oss-swift** — https://github.com/argmaxinc/argmax-oss-swift
★6,408 · created 2024-01-26 · last release **v1.1.1 (2026-10-08)** · pushed 2026-10-11 · open issues 143 · licence MIT · Swift/iOS-only whisper.cpp + CoreML + Parakeet + TTS.
Better than our current choice: reference for a production-grade CoreML whisper integration; iOS parity later.
Risks: **Swift/iOS only** — no Android.
**DECISION: WATCH** — iOS-side only; the sibling `argmaxinc/WhisperKitAndroid` (★212, MIT) is **archived**.
**DECISION (WhisperKitAndroid): REJECT** — archived.

**23. FluidInference/FluidAudio** — https://github.com/FluidInference/FluidAudio
★3,135 · created 2025-06-21 · pushed 2026-10-20 · open issues 22 · licence Apache-2.0 · CoreML TTS/STT/VAD/diarization, Swift/iOS/macOS.
Better than our current choice: very tight Apple integration for the future iOS build.
Risks: **Swift + Apple-only**; Android is our first target.
**DECISION: WATCH** — iOS phase-2 only.

**24. microsoft/onnxruntime** — https://github.com/microsoft/onnxruntime
★22,121 · created 2018-11-10 · last release **v1.31.0 (2026-10-09)** · cadence ~weekly · pushed 2026-10-20 · open issues 1,816 · licence **MIT** · npm `onnxruntime-web` 1.30.0 (MIT, 2026-09-18).
Better than our current choice: the inference substrate for every ONNX path (Kokoro, Silero VAD, KWS, Parakeet) — one runtime, one set of NNAPI/XNNPACK delegates.
Risks: large binary; we already get it transitively via sherpa-onnx.
**DECISION: KEEP (transitive)** — do not add a second ORT copy to the APK.

**25. huggingface/transformers.js** — https://github.com/huggingface/transformers.js
★16,355 · created 2023-02-13 · last release **4.3.1 (2026-10-07)** · pushed 2026-10-15 · open issues 277 · licence **Apache-2.0** · npm `@huggingface/transformers` 4.3.1 (Apache-2.0, 2026-10-06).
Better than our current choice: browser/node ONNX inference with WebGPU — useful for the *web dashboard* voice input, not the mobile app.
Risks: not for Android RN; WebGPU support in RN WebViews is uneven.
**DECISION: WATCH** — dashboard-only use case.

**26. ufal/whisper_streaming** — https://github.com/ufal/whisper_streaming
★3,676 · created 2023-04-05 · pushed 2025-11-12 · open issues 13 · licence MIT · LocalAgreement-2 streaming policy for Whisper.
Better than our current choice: the reference *turn-taking* policy that sherpa-onnx/pipecat adapt.
Risks: research code, Python only.
**DECISION: WATCH (reference)** — informs our end-of-turn heuristic; not shipped.

**27. Picovoice/porcupine** — https://github.com/Picovoice/porcupine
★4,957 · created 2018-03-08 · pushed 2026-10-07 · open issues 0 · licence file **Apache-2.0** but the *engine* is a **proprietary binary with a free-tier licence** and a **free-tier monthly request cap** — commercial terms, not OSI.
Better than our current choice: best-in-class FA/FR, tiny footprint, prebuilt RN SDK.
Risks: **not open source in the OSI sense**; usage-metered; a dependency we cannot fork.
**DECISION: WATCH** — the accuracy bar to beat, not a dependency (V4 §12.6 anti-bias: keep the open path).

**28. Kitt-AI/snowboy** — https://github.com/Kitt-AI/snowboy
★3,361 · created 2016-05-10 · last push 2021-10-13 · open issues 321 · licence **NOASSERTION**.
**DECISION: REJECT** — abandoned since 2021.

**29. rhasspy/wyoming-openwakeword** — https://github.com/rhasspy/wyoming-openwakeword
★207 · created 2023-10-03 · pushed 2025-10-30 · licence Apache-2.0 · Wyoming-protocol server for openWakeWord.
**DECISION: REJECT** — server glue for a project whose models are NC.

**30. arcosoph/nanowakeword** — https://github.com/arcosoph/nanowakeword
★133 · created 2025-10-04 · pushed 2026-08-28 · open issues 11 · licence Apache-2.0 · 2026 challenger: low-power wake word.
**DECISION: WATCH** — newest challenger; too young to trust, but meets §12.6 "≥3 newer/smaller challengers" spirit.

**31. st-matskevich/local-wake** — https://github.com/st-matskevich/local-wake
★62 · created 2025-08-09 · pushed 2026-03-08 · open issues 1 · licence MIT.
**DECISION: WATCH** — small, permissive, on-device; evaluate if openWakeWord/microWakeWord training proves too slow.

**32. frymanofer/ReactNative_WakeWordDetection** — https://github.com/frymanofer/ReactNative_WakeWordDetection
★67 · created 2024-07-28 · pushed 2026-03-16 · open issues 0 · licence MIT · RN bindings.
**DECISION: WATCH** — proves the RN-binding approach is cheap; still binds the NC-licensed openWakeWord models.

**33. Incognitol07/react-native-openwakeword** — https://github.com/Incognitol07/react-native-openwakeword
★23 · created 2026-04-28 · pushed 2026-10-13 · open issues 9 · licence Apache-2.0 (code) · 2026 newcomer, RN + openWakeWord.
**DECISION: WATCH** — 2026 challenger worth a look once its model-weights story is clean.

**34. ESPHome/micro-wake-word-models** — https://github.com/esphome/micro-wake-word-models
★126 · created 2024-01-17 · pushed 2026-10-01 · licence **Apache-2.0** · pre-built "okay nabu"/"hey jarvis" models.
**DECISION: WATCH** — licence-clean model zoo for microWakeWord; English only.

**35. arcosoph/nanowakeword / modelscope/FunASR** — https://github.com/modelscope/FunASR
★20,765 · created 2022-11-24 · last release **v1.4.16 (2026-09-18)** · pushed 2026-10-18 · open issues 48 · licence **MIT** · streaming ASR + VAD + punctuation + diarization, has ONNX export and an MCP server.
Better than our current choice: one streaming pipeline (Paraformer + FSMN VAD) with hotword support — a credible sherpa-onnx alternative for zh/en and a source of "no-reference" pipelines.
Risks: Python-first; Mandarin-centric; ~1 GB models.
**DECISION: WATCH** — reference pipeline design.

**36. NVIDIA-NeMo/Speech** — https://github.com/NVIDIA-NeMo/Speech
★18,608 · created 2019-08-05 · last release **v3.0.0 (2026-08-07)** · pushed 2026-10-20 · open issues 368 · licence Apache-2.0 (code); **Parakeet-family weights CC-BY-4.0 (commercial OK)**, other checkpoints vary (some NVIDIA Open Model License) → per-model verification required.
**DECISION: WATCH (server)** — the training/benchmark rig for our Parakeet/LoRA fine-tuning; too heavy for the device.

**37. espnet/espnet** — https://github.com/espnet/espnet
★9,992 · created 2017-01-13 · pushed 2026-10-20 · open issues 90 · licence Apache-2.0.
**DECISION: REJECT** — research-scale, redundant with NeMo.

**38. Papercup-Software/whisper (npm `whisper.rn` sibling)** and other RN wrappers — `psquizzle/react-native-whisper` (★19, MIT, last push 2023-04-17), `react-native-voice/voice` (★2,160, MIT, **archived**).
**DECISION: REJECT** — unmaintained.

**Candidate count: 38 distinct repos examined.**

---

## Shortlist (13)

| # | Repo | Role in our stack | Verdict |
|---|---|---|---|
| 1 | k2-fsa/sherpa-onnx | STT + TTS + VAD + KWS + LID (on-device & server) | **KEEP** |
| 2 | XDcobra/react-native-sherpa-onnx | RN binding (ours) | **KEEP** |
| 3 | hexgrad/kokoro | on-device TTS (Apache-2.0 weights) | **KEEP** |
| 4 | snakers4/silero-vad | VAD algorithm (via sherpa) | **KEEP** |
| 5 | mybigday/whisper.rn | RN STT + Parakeet | **WATCH** |
| 6 | nvidia/parakeet-tdt-0.6b-v2 | server fallback STT | **ADOPT (server)** |
| 7 | k2-fsa/OmniVoice | server TTS, 600+ languages | **WATCH → ADR** |
| 8 | moonshine-ai/moonshine | low-latency STT, MIT English/streaming | **WATCH** |
| 9 | dscripka/openWakeWord | custom KWS *method* (code Apache-2.0, models NC) | **WATCH (code only)** |
| 10 | OHF-Voice/micro-wake-word | custom KWS trainer (Apache-2.0, models Apache-2.0) | **WATCH** |
| 11 | ggml-org/whisper.cpp | reference engine | **WATCH** |
| 12 | openai/whisper | MIT weights + prompt biasing | **WATCH** |
| 13 | TEN-framework/ten-vad | end-of-turn algorithm | **REJECT (licence)** |

---

## Deep review — top 5

### 1. k2-fsa/sherpa-onnx (our current engine)
* **README / docs.** The README is a feature matrix: ASR, TTS, source separation, speaker ID, diarization, speaker verification, spoken-language-ID, audio tagging, VAD, KWS, punctuation, speech enhancement. Platform matrix covers Android/iOS/Windows/macOS/Linux/HarmonyOS × x64/x86/arm64/arm32/riscv64. Twelve language bindings + WASM.
* **KWS architecture (read the docs).** KWS is **open-vocabulary**: the model is "a tiny ASR" with a beam-search decoder restricted to a keyword list. Each keyword line is `▁HE LL O ▁WORLD :1.5 #0.35` — `:boosting-score` (survives beam search) and `#trigger-threshold` (minimum acoustic probability). `sherpa-onnx-cli text2token` converts phrases with `cjkchar`/`bpe`/`fpinyin`/`ppinyin`/`phone+ppinyin` token types, so the same keyword file can carry **English + pinyin transliterations of te reo Māori place names** and **Arabic/Hindi in Latin script**. This is exactly the V4 §10.1 "custom KWS phrases" requirement **without retraining**.
* **Pretrained KWS checkpoints.** `sherpa-onnx-kws-zipformer-zh-en-3M-2025-12-20` (Chinese+English), `…-wenetspeech-3.3M-2024-01-01` (Chinese), `…-gigaspeech-3.3M-2024-01-01` (English). No te reo / Arabic / Samoan / Tongan checkpoint → our custom phrase must ride on the zh-en tokenizer or we must train one.
* **Code quality / architecture.** C++ core + ONNX Runtime; Python/Kotlin/Swift/C#/Go/Rust/Dart/Java/JS bindings; the API is a thin, stable, callback-based surface (`createOfflineRecognizer`, `createKeywordSpotter`, `createVad`, `createTts`). Extensive Android/iOS sample apps and prebuilt APKs for KWS.
* **Extensibility.** Hotwords/contextual-biasing is the same mechanism as KWS → one vocabulary file can bias *both* the KWS and the STT decoder for LINZ street/suburb names. This is the single strongest argument for keeping sherpa-onnx as the engine.
* **Maintenance.** Weekly releases (v1.13.8 on 2026-09-10, v1.13.x through 2026-10), 3 maintainers active in the last 90 days, 667 open issues (large but mostly questions), 2,234 forks.
* **Performance claims vs our measurements.** We have **no measurements yet** — see Benchmarks. The repo's own claims (KWS 3 M params, VAD 30 ms frames, TTS RTF) are **vendor claims, unverified by us**.
* **Verdict: KEEP.** Nothing else covers STT+TTS+VAD+custom-KWS in one Apache-2.0 binary with 12 bindings and a weekly release train.

### 2. mybigday/whisper.rn
* **What it does better.** Ships **both** Whisper *and* NVIDIA Parakeet through one RN API; prebuilt `rnwhisper.xcframework` (iOS) and per-CPU-feature `librnwhisper*.so` variants (Android) downloaded at postinstall and **verified with SHA-256** — a supply-chain practice we should copy. Experimental **Hexagon NPU** path (SM8450+, ggml HTP backend) with FastRPC manifest hint — that is the only candidate with a real NPU story for mid-range Qualcomm Androids.
* **API ergonomics.** `initWhisper({ filePath, useGpu, useFlashAttention })`, `transcribe()`, `getTranscriptionJobId()`, `stopTranscription()`; reports `WhisperContext.gpu` / `reasonNoGPU`. Parakeet context is a sibling type.
* **Extensibility.** Model choice at runtime (tiny/base/small/medium/large), `language`/`translate` flags, VAD-model option; prebuilt binaries are per-RN-version.
* **Risks found in the code/docs.** Requires `ndkVersion = "24.0.8215888"` or above; needs a ProGuard `-keep class com.rnwhisper.** { *; }` rule; medium/large models on iOS need the *Extended Virtual Addressing* entitlement; **the README never mentions React Native New Architecture or Expo SDK 58** → **UNVERIFIED for our stack**; only one human maintainer (jhen0409, 18/20 recent commits).
* **Verdict: WATCH.** Highest-value challenger; blocked only on New-Arch/Expo-58 proof.

### 3. snakers4/silero-vad
* **Licence trap.** README badge says "CC BY-NC 4.0" while the `LICENSE` file is **MIT (Silero Team)**. This mismatch must be resolved with Silero before we rely on the *weights*, and it is exactly the kind of thing V4 §2's licence check is meant to catch. **UNVERIFIED: model-weights licence.**
* **Code quality.** Small, dependency-light, well-tested (CI badge + `test.yml` workflow), ONNX export, 30 ms frames at 8/16 kHz, 1–2 MB.
* **Better than our current choice?** Marginally — sherpa-onnx already ships a Silero-derived VAD, so adding the Python package adds a second native dependency and no new capability.
* **Verdict: KEEP (algorithm via sherpa-onnx).** Do not add the standalone package.

### 4. hexgrad/kokoro
* **Weights licence is clean: `license: apache-2.0` in the HF cardData.** 10.5 M downloads, 82 M params, 1.23 GB storage → an int8 ONNX build fits our APK budget.
* **Language coverage vs our target list:** English (US/UK/AU) ✔, **Hindi (hf) ✔**, **Mandarin (zm) ✔**, **Spanish (zm/es) ✔**, French, Italian, Portuguese, Japanese ✖, **Arabic ✖, te reo Māori ✖, Samoan/Tongan ✖.**
* **Ergonomics.** `kokoro-js` npm + sherpa-onnx's Kokoro ONNX export; 54 voices as separate small `.pt` files (per-voice downloads are a plus for our "voice packs downloaded on first run" budget).
* **Maintenance risk.** No GitHub releases; last commit 2025-08-06; 213 open issues; one primary maintainer.
* **Verdict: KEEP** — safest on-device TTS. Pair with Piper's MIT voices for the Arabic/Hindi gap (shortlist 13 in the Piper entry).

### 5. k2-fsa/OmniVoice — **the licence finding that changes D22**
* **Verbatim from the model card README (fetched 2026-10-20):** *"Our code is released under the Apache 2.0 License. The pre-trained model is licensed under the CC-BY-NC due to constraints from its training data (e.g., Emilia)."*
* **And from `audio_tokenizer/LICENSE` (fetched 2026-10-20):** the **Boson Higgs Audio 2 Community License Agreement** (Llama-3-style) — attribution display required ("Built with Higgs Materials licensed from Boson AI USA, Inc. … and Meta Llama 3 …"), outputs may not be used to improve any other LLM, and **an expanded licence must be requested above 100,000 annual active users**.
* **Implication.** D22 assumes OmniVoice is "free to modify and keep private, including in a commercial product". **That is true of the code and false of the weights.** CC-BY-NC forbids commercial use. We may still use OmniVoice **internally** (synthetic eval-audio generation, benchmark fixtures, dev-time dictation) where "commercial purpose" is not the use, but we must not ship OmniVoice-derived speech in the product.
* **Capability (verified from the card):** 600+ languages, zero-shot cloning, voice design, RTF as low as 0.025 (40× real time), 612.6 M params, 1.8 M HF downloads, arXiv 2604.00688, releases 0.2.1 (2026-07-16).
* **Multilingual coverage vs our list:** `en`, `mi` (Hindi), `hi` (Punjabi), `ar` (Arabic), `zh` (Mandarin), `sm` (Samoan), `to` (Tongan), **`mi`** and **`sm`/`to` are present in the language tag list** → the only candidate covering the full V4 §10.1 language list. te reo Māori (`mrf`/`mri`) is **not** in the tag list — it would be handled as an unwritten-accent code-switch within `en`, which is precisely why we need the eval set.
* **Verdict: WATCH → ADR REQUIRED.** Use internally for eval-audio synthesis; do **not** ship until a commercial licence is obtained in writing. **This changes a locked decision (D22) and must be written up as an ADR + `docs/DECISIONS.md` update.**

---

## Benchmarks

**Status: UNVERIFIED — the eval set does not exist yet.**

`docs/squads/voice/eval/` is **absent** from the repository (checked 2026-10-20: `docs/squads/voice/` contains only `README.md`, `STATUS.md`, `research.md`, `decisions.md`, `benchmarks/README.md`). `docs/squads/voice/benchmarks/` contains only a `README.md` — no harness, no results, no raw data.

Therefore **no candidate can be benchmarked today**, and V4 §10.1's working agreement #1 ("the benchmark exists *before* the library is chosen") is currently unmet.

### The exact set that must be built first

`docs/squads/voice/eval/` — **≥ 500 utterances**, per `docs/squads/voice/README.md`, split across:

| Slice | Minimum | Contents |
|---|---|---|
| NZ English, quiet | 120 | Read from our own app's synthetic + consented real driver audio; must include NZ street/surb names from `data/linz/` |
| NZ English, van noise | 120 | Same utterances at 3 SNRs with van/rain/traffic/indicator-click beds |
| te reo Māori place names | 60 | Pronounced with correct macrons; spelled as spoken; also the code-switch case "Kōwhai / 3 Kōwhai Street" |
| Arabic | 40 | MSA + NZ diaspora accent; RTL text |
| Hindi / Punjabi | 40 | Devanagari + Gurmukhi; Hinglish code-switch |
| Mandarin | 40 | Accented NZ Mandarin |
| Samoan / Tongan | 40 | Pacific NZ accents |
| Spanish | 40 | Latin-American and European |
| Numbers & self-correction | 40 | "7… no, 17", "twelve thirteen", "one-eight five" |
| Silence / non-speech | 40 | Music, road noise, radio, passenger conversation, horn — for false-accept measurement |

Metadata per file: `utt_id, lang, locale, speaker, snr_db, noise_type, transcript, address_gold, intent_gold, code_switch`.

### Metrics to publish (V4 §10.1 targets)

* WER ≤ 8 % (NZ English quiet) and ≤ 15 % (van noise) **on addresses**
* intent accuracy ≥ 97 %
* wake-word false accepts ≤ 1/hour, misses ≤ 3 %
* command→action ≤ 700 ms on-device
* battery ≤ 8 %/hour in driving mode
* fully-offline operation for core commands

### What must be benchmarked, and how

| Rank | Candidate | Benchmark plan | Current status |
|---|---|---|---|
| 1 | **sherpa-onnx** (KWS + VAD + TTS + STT) | KWS FA/h over ≥ 8 h of continuous van audio + miss rate on our phrase; VAD endpoint latency; STT WER on the 500-utterance set; TTS MOS/latency for spoken prompts | **UNVERIFIED — blocked on the eval set** |
| 2 | **whisper.rn / Parakeet-tdt-0.6b-v2** | WER on the same 500-utterance set (en slices only), first-token latency on the CI emulator profile and one mid-range Android, APK delta | **UNVERIFIED — blocked on the eval set AND on New-Arch/Expo-58 proof** |
| 3 | **Kokoro (sherpa ONNX export)** | on-device synthesis latency per spoken prompt (≤ 8-word replies), APK delta, intelligibility (MOS proxy) for en/hi/zh/es voices | **UNVERIFIED — blocked on the eval set** |

**Raw results must be published to `docs/squads/voice/benchmarks/`** (harness + CSV + device profile + commit SHA), and the CI emulator + one mid-range Android profile must be used identically for all three (V4 §12.5).

---

## What's new in 2026 (and what we adopt)

1. **Open-vocabulary KWS in a single on-device binary** (sherpa-onnx, 2026 docs) — *adopt*: our wake phrase and NZ hotwords ship as a text file, not a trained model. Kills the "train a model per language" problem.
2. **600+ language zero-shot TTS (OmniVoice, 2026)** — *adopt internally, not commercially*: it is the only engine that covers te reo-adjacent code-switch, Arabic, Punjabi, Samoan/Tongan in one model. **But its weights are CC-BY-NC.**
3. **Diffusion-LM-style TTS at RTF 0.025** — *adopt idea*: server-side dictation synthesis for eval-audio generation is 40× faster than real time, which is what makes a 500+ utterance multilingual eval set affordable.
4. **NPU backends reaching RN wrappers** (whisper.rn Hexagon HTP, 2026) — *adopt idea*: the ≤ 700 ms command→action budget and the ≤ 8 %/hour battery budget both need NPU/accelerator paths on mid-range Qualcomm; keep sherpa-onnx's NPU options (RKNN/QNN/Ascend) and whisper.rn's Hexagon path on the radar.
5. **KWS training objectives shifting to "false accepts per hour" as the primary loss** (microWakeWord) — *adopt idea*: our squad target ≤ 1 FA/hour is a *training objective*, not just an eval metric; we should train our own "Hey Courier" model with that objective (Apache-2.0 code, Apache-2.0 model zoo).
6. **2026 challengers included** (§12.6 requires ≥ 3): `arcosoph/nanowakeword` (2025-10), `st-matskevich/local-wake` (2025-08), `Incognitol07/react-native-openwakeword` (2026-04), `OHF-Voice/micro-wake-word` (2024 but active), `mybigday/whisper.rn` (0.7.4, 2026-10).

---

## Decision

**ADOPT / KEEP**
1. **KEEP `k2-fsa/sherpa-onnx` as the single on-device engine** (STT + TTS + VAD + KWS + LID + punctuation) — Apache-2.0, weekly releases, open-vocabulary KWS, 12 bindings. Our `react-native-sherpa-onnx@0.4.4` wrapper stays; we own and pin it.
2. **KEEP Kokoro for on-device TTS** (Apache-2.0 weights, 82 M params) + **Piper MIT voices** for Arabic/Hindi/Mandarin/Spanish gaps (voices only, engine abandoned).
3. **KEEP Silero VAD *through* sherpa-onnx** — do not add a second native VAD.
4. **ADOPT (server-side fallback STT) `nvidia/parakeet-tdt-0.6b-v2`** — CC-BY-4.0, published WER 1.69 % clean / 3.19 % other, already exposed via `whisper.rn`; must be measured on our set first.
5. **ADOPT the training *method* of openWakeWord + microWakeWord** to build our own "Hey Courier" KWS model on our own consented audio (Apache-2.0 code, Apache-2.0 model zoo; we never ship the NC openWakeWord models).
6. **ADOPT sherpa-onnx hotwords/contextual biasing for the LINZ street/suburb vocabulary** — one vocabulary file for both KWS and STT.

**REJECT** (shipped bundle): `ten-vad` (extra Agora field-of-use restriction), `piper1-gpl` (GPL-3.0), `espeak-ng` (GPL-3.0), `filippogiruzzi/voice_activity_detection` (GPL-3.0), `rhasspy/piper` engine (archived), `vosk-api` (stale + weak WER), `pocketsphinx` (licence "Other" + wrong shape), `libfvad` (no end-of-turn), `android-vad` (redundant), `snowboy` (abandoned), `openWakeWord` **bundled models** (CC BY-NC-SA), `WhisperKitAndroid` (archived), `Kitt-AI/snowboy`, `prithivMLmods/Whisper-Multilingual`-type re-uploads.

**WATCH** (evaluate next sprint): `mybigday/whisper.rn` (New-Arch proof pending), `moonshine-ai/moonshine` (MIT English/streaming; non-English = Community Licence with US$1 M revenue cap), `ggml-org/whisper.cpp` + `openai/whisper` (MIT fallback + prompt biasing), `k2-fsa/OmniVoice` (**licence**), `modelscope/FunASR` (streaming pipeline reference), `FluidInference/FluidAudio` (iOS), `argmaxinc/argmax-oss-swift` (iOS), `pykeio/earshot` (reference), `ufal/whisper_streaming` (turn-taking reference), `huggingface/transformers.js` (dashboard), `nanowakeword`, `local-wake`, `ReactNative_WakeWordDetection`, `react-native-openwakeword`, `ESPHome/micro-wake-word-models`.

**Clean-room study candidates (§11.2, no code may be quoted):** `OHF-Voice/piper1-gpl` (GPL-3.0), `espeak-ng/espeak-ng` (GPL-3.0), `filippogiruzzi/voice_activity_detection` (GPL-3.0), `debpalash/VoiceStudio` (AGPL-3.0, already named in V4 §11.2).

## Risks & fallbacks

| Risk | Impact | Mitigation / fallback |
|---|---|---|
| **OmniVoice weights are CC-BY-NC** → D22's commercial premise fails | Server TTS for the product is not licensed | Keep sherpa-onnx TTS + Kokoro + Piper MIT voices as the shipping path; use OmniVoice **internally only**; open an ADR + update D22; ask Boson/Meta for a commercial licence in writing |
| **sherpa-onnx wrapper is ★41 / 1 maintainer** (`XDcobra/react-native-sherpa-onnx`) | Upstream features stall; upstream breaking changes | We own a thin fork-able wrapper; pin exact versions; add a contract test against the sherpa-onnx C API so we can swap to `sherpa-ncnn` (Apache-2.0, ★1,795) or a direct JSI binding if it dies |
| **No NZ-English / te reo KWS checkpoint** | Wake word may not survive the NZ accent or the word "Courier" | Train our own with microWakeWord/openWakeWord code on consented NZ driver audio; sherpa's open-vocabulary KWS lets us ship multiple phrase variants (e.g. "Hey Courier" / "Hey Post") as a text file |
| **Eval set does not exist** → every performance claim is unverified | We cannot pick a library on evidence | Build `docs/squads/voice/eval/` **now** (≥ 500 utterances per the table above) before any adoption PR lands |
| **whisper.rn New-Arch / Expo SDK 58 support unproven** | Blocks the best RN challenger | Build a spike: install on the RN 0.88 branch, run on the CI emulator, measure APK delta and WER; record evidence in `docs/evidence/` |
| **Silero VAD licence-badge contradiction** | Possible licence defect on the VAD weights | Use sherpa-onnx's bundled VAD (Apache-2.0 distribution) and get written confirmation from Silero before citing Silero directly |
| Model downloads at runtime from third-party hosts | Supply-chain risk (V4 §7) | Pin exact model URLs + SHA-256 (the pattern `whisper.rn` uses), verify in CI, record in `docs/LICENSES.md` |

## UNVERIFIED items (explicit)

1. **OmniVoice *main* `model.safetensors` licence** — the HF card has **no `license:` tag**; the README says CC-BY-NC; the audio tokenizer is Boson Higgs Audio 2 Community Licence. The exact SPDX id for the main checkpoint is **UNVERIFIED**.
2. **Silero VAD *model weights* licence** — repo `LICENSE` is MIT; README badge says CC BY-NC 4.0. **UNVERIFIED.**
3. **microWakeWord *model weights* licence** — repo Apache-2.0, `esphome/micro-wake-word-models` Apache-2.0, but the HF model card for `kahrendt/microWakeWord` returned HTTP 401 to the API (gated or removed) → **UNVERIFIED** at the model level.
4. **New Architecture / Expo SDK 58 / Android API 34 support** for: `whisper.rn`, `XDcobra/react-native-sherpa-onnx`, `gkonovalov/android-vad`, `frymanofer/ReactNative_WakeWordDetection`, `Incognitol07/react-native-openwakeword`, `FluidInference/FluidAudio`, `argmaxinc/argmax-oss-swift` — **not stated in their docs; UNVERIFIED.** sherpa-onnx's own C++ core has no RN concept, so "New Arch" only applies to our wrapper.
5. **6-month star trend for every candidate** — GitHub's API does not expose a star-history series to this token; counts are the single-day snapshot (2026-10-20). Trends are **UNVERIFIED**; only the raw delta between the creation date and the snapshot is knowable.
6. **Median maintainer response time / closed-issue ratio** — the `issues` API with `state=closed` sort was not sampled per repo at this depth; only open-issue counts are recorded.
7. **Exact ONNX model file sizes in MB** for sherpa-onnx KWS/ASR/TTS bundles and Kokoro int8 — **UNVERIFIED** (not downloaded; downloading model weights requires a licence/hosting decision per V4 §7).
8. **CI status per repo** — only pipecat/whisper.rn/silero/openWakeWord showed CI badges in the README text I read; CI workflow presence for the rest is **UNVERIFIED**.
9. **Production users** — only `huggingface/speech-to-speech` states production use ("thousands of Reachy Mini robots"); for sherpa-onnx, WhisperKit, Porcupine etc. the production user base is **UNVERIFIED**.
