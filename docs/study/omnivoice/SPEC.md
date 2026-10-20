# OmniVoice — functional study, written as the requirements for **Courier Voice**

**Area:** V4 §13.4 (learn from OmniVoice, build our own equivalent) · **Squad:** Voice
**Study date:** 2026-10-21 · **Role:** Research lead (study phase only)
**Studied artefact:** `k2-fsa/OmniVoice` — code (Apache-2.0), model card `k2-fsa/OmniVoice` (weights declared CC-BY-NC), paper arXiv 2604.00688 v3 (2026-04-21), `audio_tokenizer/` weights under the Boson Higgs Audio 2 Community Licence. Read from a clone in `.study/omnivoice` (gitignored, commit `08be0b4`, 2026-08-24) and from the live model card, paper and licence files.
**Clean-room rule:** this document describes **behaviour and architecture in our own words**. No upstream code, text, configuration keys, identifier names, string tables or assets enter our repository. Everything below is a **requirement + acceptance criterion for Courier Voice** (`services/courier-voice`), not a description of a dependency. Where the founder has authorised studying the upstream weights (V4 §13.6, D23), we still implement from this file only.

---

## 0. How to read this document

- Every **R** block is a requirement for *our* engine, written so it becomes a ticket. The acceptance criteria are the Definition of Done for that requirement.
- **"Courier Voice"** is our product name (D23). The upstream system is the *reference behaviour*, never a runtime dependency of the shipped app.
- Licence-safety is a hard gate (ADR-004): a requirement that would put non-commercial weights on a driver device is written so a permissively-licensed alternative satisfies it.
- Figures attributed to the upstream paper or model card are **vendor claims**, dated. Our own measurements do not exist yet (the eval set does not — see `docs/squads/voice/EVAL.md`).

## 1. What the studied system is (our own description)

A single-stage, non-autoregressive, zero-shot text-to-speech system that turns text into speech in more than 600 languages, can imitate a speaker from a few seconds of reference audio, can invent a speaker from a written attribute list, and runs far faster than real time on a GPU. Its defining property is that it is **one model, not a cascade**: the text is converted straight into a grid of discrete acoustic tokens, and those tokens are turned back into a waveform by a separate audio codec. Training uses a masked-prediction objective borrowed from diffusion language models, so a text-conditioned, partly-revealed token grid is repeatedly refined into the final audio. It ships as a Python package, a command-line tool set, a web demo and a training kit; it does not run on a phone.

## 2. The legal boundary we inherit (verified 2026-10-21)

| Artefact | Licence as found today | Commercial use? |
|---|---|---|
| Upstream **code** (`omnivoice/` package, training kit, CLI) | Apache-2.0 (`LICENSE` at repo root; GitHub SPDX id `Apache-2.0`) | yes — reusable, modifiable, private |
| Upstream **main weights** (`model.safetensors`) | model card states the pre-trained model is **CC-BY-NC**, "due to constraints from its training data (e.g., Emilia)"; no SPDX tag in the card metadata | **no** for a commercial product |
| Upstream **audio-tokeniser weights** | **Boson Higgs Audio 2 Community Licence** (Llama-3-style: attribution display, name prefix on derived models, no use to improve other LLMs, expanded licence required above 100k MAU) | conditional, with obligations that attach to *our* product |
| Upstream **paper** | CC BY 4.0 (arXiv) | quotable with attribution; we describe, not copy |

Two upstream facts (GitHub issues, read 2026-10-21) that change our plan:

1. **The upstream maintainer states the team cannot grant a commercial licence** for the current checkpoint: the reason it is non-commercial is that the training mixture contains open data that does not permit commercial use, "so we do not have the authority to provide a commercial authorisation" (issue #262, 2026-09-07). A separately trained commercially-usable checkpoint is planned, with no timeline (issue #258, 2026-09-07).
2. Therefore **V4 §13.6 option 2 ("ask k2-fsa for a commercial licence of the OmniVoice weights") is not viable** as written. Our own-weights path (option 3) is the realistic route to a commercial multilingual engine. The founder's decision (V4 §13.6, D23) permits studying and adapting the weights; the licence ledger in `docs/LICENSES.md` must record both the founder's legal advice (held outside git) and the upstream statement above.

## 3. Our locked context (every requirement inherits these)

- On-device first, offline-capable, battery-bounded: ≤ 8 %/hour in driving mode, ≤ 700 ms command→action, core commands work with no network (V4 §10.1).
- Our languages, in priority order: NZ English + te reo Māori place names, Arabic, Hindi/Punjabi, Mandarin, Samoan, Tongan, Spanish (D3).
- Spoken replies ≤ 8 words while driving; the engine is an accelerator, never the only path (MASTER_EXECUTION §9).
- The voice engine sits behind a **swappable interface** so any commercially-licensed model can replace it without app changes (D23 condition c).

---

## 4. Requirements — architecture

### R1 — Single-stage text-to-acoustic-token mapping
Our engine converts text directly to a multi-codebook acoustic token grid. There is no intermediate semantic-token stage and no second cascade stage.
- **Given** a text prompt, **when** the engine runs, **then** it produces the acoustic grid in one pass and no intermediate linguistic representation is materialised.
- **Given** an error in the first stage, **when** it would have cascaded in a two-stage design, **then** the design has no such path to fail.

### R2 — A bidirectional backbone initialised from a pretrained language model
Our backbone is a decoder-shaped transformer used with bidirectional attention, initialised from a permissively-licensed pretrained language model (candidate: a 0.6B-parameter Apache-2.0 multilingual decoder — verified Apache-2.0 on the model hub, 2026-10-21).
- **Given** the pretrained weights, **when** we initialise a new backbone, **then** the weights transfer without reshaping the hidden size or the layer count.
- **Given** an ablation without this initialisation, **then** intelligibility must measurably degrade — this is the single largest contributor to intelligibility in the reference design, and we treat it as a hard requirement, not an optimisation.

### R3 — Conditioning carried as a structured prefix
Every generation carries three ordered segments: a **style** segment (language identifier, optional voice attributes, optional denoise flag), a **text** segment (the words to speak, optionally with phonetic overrides), and the **audio** segment (the token grid).
- **Given** a request without a language, **then** the engine runs language-agnostically and the caller is told the language was not pinned.
- **Given** a request with attributes the engine does not know, **then** it fails naming the unknown attribute instead of silently ignoring it.

### R4 — Conditioning dropout during training
A configured fraction of training examples drop the style and text conditioning entirely.
- **Given** the training set, **then** a measurable fraction of examples train with no conditioning, and the resulting model can be sampled both with and without conditioning at inference.

### R5 — An audio-token grid with per-codebook embedding and head
The grid has 8 parallel codebooks of 1024 entries each, plus one reserved "unknown" slot per codebook used for masked positions. Each codebook owns a disjoint embedding block; the embeddings of all codebooks at a time step are summed into one hidden state; one linear head maps the hidden state back to all codebooks' logits.
- **Given** a time step, **when** it is embedded, **then** the sum over codebooks is used, and the head output can be split per codebook without ambiguity.

### R6 — A weighted per-codebook loss
Training loss is the cross-entropy on masked positions only, computed per codebook and then combined as a weighted sum of the per-codebook means (weights 8, 8, 6, 6, 4, 4, 2, 2, normalised) — the reference design's way of spending capacity on the coarse codebooks that carry intelligibility.
- **Given** a batch, **then** the loss is not the mean over all codebook entries (which would over-weight the fine codebooks), and the weights are configurable per run.

### R7 — Full-codebook random masking
For every training example the mask ratio is drawn uniformly at random per example, and every entry of the grid is masked independently at that ratio; the loss is taken on the masked entries only.
- **Given** the schedule, **then** roughly half of all grid entries contribute to the loss on average, versus one codebook in eight for the older "pick a layer" schedule — this is the reference design's main convergence lever.
- **Given** a run with the loss restricted to a single codebook, **then** intelligibility degrades measurably (reference ablation: WER 1.57 → 2.85 on the English benchmark).

---

## 5. Requirements — the audio tokeniser (codec)

### R8 — A frozen semantic-plus-acoustic codec
Audio is encoded by a codec that separates a **semantic** representation (a masked-convolution self-supervised encoder) from a **acoustic** representation (a convolutional encoder with 8 residual codebooks), and decodes tokens back to a waveform at 24 kHz.
- **Given** a waveform, **when** it is encoded, **then** the result is a grid of 8 codebooks at 75 tokens per second (24 kHz ÷ a 320× downsample factor).
- **Given** the token grid, **when** it is decoded, **then** the output is a 24 kHz waveform.
- The codec is **frozen** during our training of the speech model: we never update it.

### R9 — The codec's licence is a first-class engineering constraint
The reference codec's weights are under a community licence that (a) requires a visible attribution notice in any product that uses them, (b) requires derived models to carry a licence-derived name prefix, (c) forbids using its outputs to improve another language model, and (d) requires an expanded licence above 100,000 annual active users.
- **Given** a release build that ships or calls the codec, **then** the licence ledger entry carries the exact obligations and the build surfaces the required attribution text.
- **Given** a projected scale above the threshold, **then** the plan must have a written path to the expanded licence or to a codec replacement.
- **Given** a decision to train our own codec, **then** that is a separate, funded work item (see `docs/squads/voice/OWN-MODEL.md`).

---

## 6. Requirements — training pipeline

### R10 — Data preparation as a two-stage pipeline
Training data is prepared as: (1) an optional denoising pass over raw audio, (2) a tokenisation pass that converts audio into the codec's token grid and packs it into sharded archives with a sidecar metadata file per shard and a shard manifest.
- **Given** a corpus of raw audio plus transcripts, **when** preparation runs, **then** it emits token shards, per-shard metadata, a manifest and an error log, and re-running it is deterministic given the same seed.
- **Given** a sample whose audio fails to process, **then** it lands in the error log and the run continues; it is never silently dropped.

### R11 — Sharded training with two interchangeable attention backends
Training supports (a) a packed-sequence backend that concatenates samples into one long sequence with document boundaries enforced by a block mask, and (b) a plain scaled-dot-product backend that batches length-grouped samples.
- **Given** a hardware target without the packed backend, **then** the run falls back to the second backend with an explicit per-sample token cap and batch cap, and the loss must be comparable across backends within the tolerance we define.
- **Given** a packed run, **then** no attention crosses a document boundary.

### R12 — Hyperparameters and checkpoints
Defaults inherited from the reference design: AdamW, peak learning rate 1e-4, cosine decay with 3 % warmup, bf16 mixed precision, 8192 tokens per device per step, 300k steps for a two-language corpus and ~2M steps for a multilingual corpus. Checkpoints rotate, resume exactly, and can be initialised from an existing checkpoint for fine-tuning.
- **Given** an interrupted run, **then** resuming restores optimizer, scheduler and random state, and the loss curve continues without a visible jump.
- **Given** a fine-tuning run, **then** the run starts from a named checkpoint and records that checkpoint's hash in the run manifest.

### R13 — Parameter-efficient adaptation is a first-class mode
The training kit supports low-rank adapters: the language backbone is frozen, small adapters are attached to the attention and feed-forward projections, and the codec-specific input/output layers are trained in full because they carry no pretrained knowledge.
- **Given** an adapter run, **then** the log prints trainable versus total parameter counts, and the adapter alone is a deployable artefact.
- **Given** an adapter, **then** it can be applied at inference without modifying the base weights on disk, and it can be merged into a standalone checkpoint for deployment without the adapter framework installed.

---

## 7. Requirements — data

### R14 — A corpus with an explicit, auditable licence per source
Every training corpus has a recorded licence, a date the licence was read, and a decision (use / exclude / pending review). A corpus whose licence cannot be read is treated as non-permissive.
- **Given** a licence change upstream, **then** a scheduled re-read (monthly, per the squad's radar process) can flag affected corpora.
- **Given** a corpus with mixed licences across subsets or languages, **then** the licence is recorded per subset, not per repository.

### R15 — Language balancing by resampling
Training data is balanced by repeating low-resource languages according to a repetition factor derived from the ratio between the largest language duration and the language's own duration, smoothed by an exponent (reference value 0.8).
- **Given** a language with 20 hours against a 200,000-hour maximum, **then** it is repeated enough to be seen, and the factor is recorded in the run manifest.
- **Given** a corpus where balancing is not wanted, **then** the exponent can be set to reproduce the natural long tail.

### R16 — One text tokenizer for every language
Text is tokenised with the backbone's own subword tokenizer. No grapheme-to-phoneme conversion and no per-language text normalisation are required for the model to work.
- **Given** a language with no dedicated normaliser, **then** the engine still accepts it, and the caller is warned that digits and abbreviations may be read literally.

---

## 8. Requirements — inference

### R17 — Iterative masked refinement with a shifted schedule
Generation starts from a fully masked grid and refines it over N steps (default 32; 16 for the fast profile). The cumulative unmasked proportion follows a shifted schedule with a shift parameter of 0.1, so early steps unmask more than late steps.
- **Given** a 16-step request, **then** intelligibility degrades slightly but stays inside our published tolerance (reference: English benchmark WER 1.30 at 32 steps vs 1.50 at 16 steps).

### R18 — Confidence-ranked position selection with a layer preference
At each step the positions to reveal are chosen by sampling from model confidence with a temperature of 5 (0 = deterministic); the token assigned to a chosen position is the highest-scoring one, and a penalty pushes the coarse codebooks to be resolved before the fine ones.
- **Given** a temperature of 0, **then** two runs of the same request produce the same tokens.
- **Given** a temperature above 0, **then** repeated runs differ in position selection but not in wording.

### R19 — Classifier-free guidance
Conditional and unconditional scores are combined in log-probability space with a guidance scale of 2.
- **Given** a guidance scale of 0, **then** the conditional branch alone is used, and the behaviour is documented as the low-fidelity profile.

### R20 — Duration predicted from script-weighted text
The output length is predicted from the text: each character contributes a weight depending on its script, the totals are compared with the same measure of the reference clip, and the reference duration is scaled accordingly. An explicit duration or speed override takes precedence.
- **Given** a reference clip and a target text, **then** the ratio of script weights sets the target length, and the estimate is reported with the result.
- **Given** an explicit duration, **then** it wins over the estimate and the trimming behaviour is documented (trailing silence may be removed).

### R21 — Long text is chunked, not truncated
Long requests are split into segments of about 15 seconds of speech and the segments are cross-faded, so memory use stays flat and no words are dropped.
- **Given** a 5-minute request, **then** the engine returns the whole text as audio, and the number of chunks and the crossfade are reported.

### R22 — Reference handling and auto-transcription
A reference clip is 3–10 seconds; if no transcript is supplied the engine can transcribe the clip with a separate speech recogniser, and the result is stored with the encoded prompt so the pair can never drift apart.
- **Given** a clip with no detectable speech, **then** the request fails with actionable advice instead of producing silence.
- **Given** a longer clip, **then** a window is chosen, the choice is reported, and the prompt can be cached and re-used across sessions.

### R23 — An export path to the device
The engine must be exportable to a quantised ONNX graph that runs under the same runtime as our other on-device models, so the same synthesis capability exists on the phone.
- **Given** a trained checkpoint, **then** an export produces a graph that runs on a mid-range Android device within the battery budget, with measured latency and size reported.
- **Given** the reference implementation (Python + PyTorch + GPU), **then** our device path does not require it.

---

## 9. Requirements — reaching 600+ languages

### R24 — Coverage comes from data breadth, not from per-language engineering
The reference design reaches 646 languages because it trains one model on a 581,000-hour mixture assembled from 50 open corpora, with no per-language model, no per-language text pipeline and no per-language engineering effort.
- **Given** a new language with an hour of usable audio, **then** it can be added to the mixture and appears in the supported list, with the language identifier used at inference.
- **Given** a language with no audio at all, **then** it is absent from the supported list — coverage is a property of the corpus, and the list must be generated from the corpus, never hand-written.

### R25 — The supported-language list is generated, dated and auditable
The list of supported languages, their identifiers and their training hours is generated from the corpus manifest at build time and checked into the repository with the date it was generated.
- **Given** a language whose hours fall below a threshold, **then** it is flagged as low-resource in the generated list so the UI can show a confidence tier.

### R26 — Language coverage for our drivers is a measured subset, not a claim
Of our target languages, the reference corpus contains: English 206,061 h, Mandarin 111,343 h, Spanish 27,560 h, Standard Arabic 1,484 h, Punjabi 147 h, Hindi 117 h, Māori 18 h — and **no Samoan and no Tongan** (both absent from the reference language table and from its code's language map, verified 2026-10-21). Our eval set must therefore treat Samoan and Tongan as **first-class fine-tuning targets with our own data**, not as inherited coverage.
- **Given** the language table, **then** any claim of coverage for Samoan or Tongan is rejected in review.

---

## 10. Requirements — controllability

### R27 — Voice design from attributes
A voice can be requested by attribute list (gender, age, pitch band, delivery style such as whispering, accent) with no reference clip.
- **Given** an attribute the engine cannot map, **then** the request fails naming it.
- **Given** a design-only request in a low-resource language, **then** the engine warns that this mode is trained mainly on two languages and may be unstable (the reference design says the same).

### R28 — Prompt denoising as a first-class task
Training injects noise and reverberation into a fraction of reference segments and marks them, so the model learns to separate speaker identity from recording conditions. At inference the same marker asks for a clean result.
- **Given** a noisy reference clip, **then** the generated audio is cleaner than the reference, and speaker similarity may drop slightly — this trade-off is expected and documented.

### R29 — Pronunciation and paralinguistic overrides
Text may carry inline phonetic overrides (a romanised pronunciation for characters whose default reading is wrong) and inline non-verbal markers (laughter, breath).
- **Given** an override, **then** the requested pronunciation is produced, and the override survives text normalisation.

---

## 11. Evaluation and metrics the reference uses (and we must reproduce)

- **Intelligibility**: word/character error rate of the synthesised audio, transcribed by an external recogniser. The reference uses different recognisers per benchmark (a self-supervised English model, a Mandarin model, a multilingual model, and Whisper-large-v3) — so **the recogniser is part of the metric definition** and must be pinned in our harness.
- **Speaker similarity**: cosine similarity of speaker embeddings from a self-supervised speaker model.
- **Naturalness**: a predicted mean-opinion-score model, plus subjective comparative scores.
- **Speed**: real-time factor. Reference numbers (paper, 2026-04-21): RTF 0.0319 at 16 steps batch 1 on an H20, 0.022 at batch 8; the model card claims RTF as low as 0.025.
- **Published quality** (paper, 2026-04-21): English benchmark — similarity 0.729, WER 1.30, predicted MOS 4.28; Mandarin benchmark WER 0.84; 102-language benchmark — average character error rate 4.00 % (recorded human speech in that benchmark averages 5.11 %), 82 languages at or below 5 %, 95 at or below 10 %. Per-language: Māori 1.98 (human 4.90), Punjabi 2.95, Hindi 2.64, Standard Arabic 1.92, Mandarin 3.16, Spanish 0.77, English 1.67.
- **Reference data volumes for our languages** (paper, 2026-04-21): English 206,061.1 h, Mandarin 111,343.3 h, Spanish 27,559.74 h, Standard Arabic 1,483.53 h, Punjabi 147.37 h, Hindi 117.17 h, Māori 18.02 h.
- **Cost of the reference recipe**: 8× H800 GPUs — 1.33 days for the two-language corpus (300k updates), 9.66 days for the multilingual corpus (2M updates).
- **Training-mixture provenance**: 50 open corpora (the paper's appendix lists them, including the Emilia family, read-speech corpora, crowd-read corpora, and several language-specific sets); each corpus's own licence must be checked per language before reuse in our own mixture.

---

## 12. What users complain about upstream → how Courier Voice will do it better

Observed in the upstream issue tracker (read 2026-10-21):

| Complaint | Our answer |
|---|---|
| A click/pop at the start of cloned speech, then a gap | The device path must emit a leading-silence-free waveform; we test for a leading transient as an explicit acceptance criterion. |
| Generated audio often cuts off the end of a sentence | A hard acceptance criterion: no truncation of the final word in our eval set; the chunker must not drop the tail segment. |
| Parts of the input text are skipped when cloning | A "no dropped text" criterion scored by an exact-match-of-content check on every generated utterance. |
| Speaking speed varies run to run; pronunciation of the same word varies | Deterministic profile by default (zero temperature on position choice) and a fixed voice identity per use case; pronunciation overrides for domain vocabulary. |
| "Auto voice" picks a different voice on every call | Courier Voice has named, stable voices (e.g. "Courier NZ", "Courier Pacific") — voice identity is part of the product, not a random draw. |
| No clear answer on commercial use | The licence ledger is a shipped surface: every engine reports the licence of its code and of its weights, and non-commercial or unknown licences make an engine unavailable with the reason (ADR-004). |
| GPU-only, Python-only; a question about running the codec on Apple silicon | Our device path is ONNX on the phone, so the engine works offline and inside the battery budget. |
| Concurrent serving advice is vague | Our service defines a session contract, timeouts and per-session isolation (the VoiceStudio study, requirement R4). |

---

## 13. What we will not copy

- No upstream code, comments, config keys, class or function names, prompt strings, schemas or assets.
- No upstream weights in the shipped app (licence, §2). No upstream *data* in a commercial product unless its licence is verified per subset (§R14).
- No verbatim sentences from the upstream README, docs or paper. Facts, numbers and architecture are restated in our own words with attribution.
- No upstream codec weights in the shipped app without the ledger entry and the attribution surface of R9.

## 14. Open questions / UNVERIFIED (2026-10-21)

1. **Codec licence outcome.** Whether we accept the community codec's obligations (attribution display, 100k-MAU clause, name prefix) or train our own codec is **UNVERIFIED / undecided**; it is the largest licence risk in our own-weights plan.
2. **The upstream commercially-usable checkpoint.** Announced as planned with no date (issue #258, 2026-09-07). Treat as **UNVERIFIED until a licence and a model card exist**.
3. **Trainable-parameter counts and adapter sizes** quoted by upstream have not been reproduced by us — **UNVERIFIED**.
4. **The published quality numbers** are the upstream paper's, on the upstream corpora; **none has been reproduced on our eval set**.
5. **The exact token rate** of the codec (75 tokens/s) is derived from the published sample rate and downsample factor; the value the runtime reports has not been observed here.
6. **Per-corpus licences inside the 50-corpus mixture** have not been read; several are gated or blocked from this environment (HTTP 401) — each must be read before any reuse.
7. **Voice-design stability** in our target languages is unknown; upstream states the mode is trained mainly on two languages.
8. **Māori quality** is measured by the reference on a read-speech benchmark; in-vehicle, accented, code-switched Māori is **UNVERIFIED**.

## 15. Provenance (read 2026-10-21)

Upstream repository (Apache-2.0), release 0.2.1 published 2026-07-16, ★15,201, created 2026-03-31, last push 2026-10-19, 67 open issues, Python package `omnivoice` 0.2.1 on PyPI (wheel published 2026-07-16, requires Python ≥ 3.10). Model card `k2-fsa/OmniVoice`: 612.6 M parameters in the released checkpoint, 1,873,090 downloads, created 2026-03-30, last modified 2026-07-03, not gated, no SPDX licence tag, weights declared CC-BY-NC in the card text, 646 language codes in the card's tag list (657 tags in total). Paper arXiv 2604.00688 v3 (2026-04-21, cs.CL, CC BY 4.0). Codec weights: `audio_tokenizer/` in the same repository, 201.4 M parameters, under the Boson Higgs Audio 2 Community Licence (v2, release date 2025-06-20 per the licence text); the standalone codec repository `eustlb/higgs-audio-v2-tokenizer` shows **no licence tag** on its model card (read 2026-10-21) — **UNVERIFIED**; treat the bundled copy's licence as the governing one.
