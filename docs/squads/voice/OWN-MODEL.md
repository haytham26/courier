# OWN-MODEL — training Courier Voice on our own weights

**Area:** V4 §13.4 / §13.6 (voice weights: fastest legal path, order of preference) · **Squad:** Voice
**Date:** 2026-10-21 · **Role:** Voice squad research lead · **Status:** plan, not started
**Depends on:** `docs/study/omnivoice/SPEC.md` (what we are copying in behaviour), `docs/decisions/adr/ADR-004-voice-service-licences.md` (the licence ledger is a shipped surface), `docs/squads/voice/EVAL.md` (the set every number below is measured on), `docs/decisions/DECISIONS.md` D22, V4 §13.6 + D23 (founder decision), `docs/product/LICENSES.md` (provenance ledger).

---

## 1. Where the path actually stands (read 2026-10-21)

V4 §13.6 orders the options: **(1)** use an open-licensed model, **(2)** ask k2-fsa for a commercial licence of the OmniVoice weights, **(3)** train our own weights with the Apache-2.0 code on commercially-licensed or our own data.

- **Option 1 is verified to be insufficient for our languages** (table in §7): of the permissively-licensed engines we checked, none covers Punjabi, te reo Māori, Samoan or Tongan at all, and none covers Arabic and Māori together.
- **Option 2 is blocked by upstream itself.** The upstream maintainer states the checkpoint is non-commercial because the training mixture contains open data that does not permit commercial use, "so we do not have authority to provide a commercial licence" (GitHub issue #262, 2026-09-07), and that a separately trained commercially-usable checkpoint is planned with no date (#258, 2026-09-07). Option 2 therefore becomes a **watch item** (we re-check monthly), not a dependency.
- **Option 3 is this document.** The founder decision (V4 §13.6, D23) permits the team to study and adapt the upstream weights on the founder's own legal advice (held outside git). That instruction is a **licence-exposure decision, not a technical one**: it lets us reach a working model quickly, but the licence ledger must record the basis, and the technical plan below is written so that a **clean-licence model can replace it at any time** without app changes (D23 condition c).

**Two tracks, both funded, both shipping behind one interface:**

| Track | What it is | Licence position | When |
|---|---|---|---|
| **A — Adapt** | Continue training the released checkpoint with our own adapters on our own/licensed data, per language. | upstream weights are CC-BY-NC; shipped under the founder's decision with the exposure recorded in `docs/product/LICENSES.md` | weeks 3–6 (pilot) |
| **B — Own weights** | Train our own checkpoint from the Apache-2.0 backbone on a commercially-licensed mixture we assemble, with our own data on top. | clean, if every corpus in the mixture passes the per-corpus licence gate | weeks 7–12 |

Track A is the fast path to a working multilingual engine; Track B is the path that removes the licence exposure. **The release gate is Track B** unless the founder records a written decision to ship Track A. Both use the same evaluation set, so the choice is made on evidence, not on schedule pressure.

## 2. Target languages (Tier A) and what each needs

| Tier | Language | Our need | Public clean data found (2026-10-21) | Plan |
|---|---|---|---|---|
| A1 | NZ English | the default voice; addresses, numbers, self-corrections | **none verified** (no permissively-licensed NZ English speech corpus found) | collect our own + synthetic |
| A1 | te reo Māori place names | place names inside English sentences | FLEURS (CC-BY-4.0) has a Māori slice; the upstream mixture had only **18 h** of Māori | collect + adapt |
| A1 | Samoan | driver-facing replies | **none** | collect (small) + adapt |
| A1 | Tongan | driver-facing replies | **none** | collect (small) + adapt |
| A2 | Arabic | driver-facing replies | crowd-read and read corpora exist; licence review pending per corpus | licence-review + adapt |
| A2 | Hindi / Punjabi | driver-facing replies | crowd-read corpora exist; licence review pending | licence-review + adapt |
| A2 | Mandarin | driver-facing replies | read corpora with clean licences exist | licence-review + adapt |
| A3 | Spanish | driver-facing replies | several corpora with clean licences | licence-review + adapt |

**Correction to the earlier research note (2026-10-21):** `docs/research/2026/on-device-stt-tts-vad-kws.md` states that the upstream language tag list contains Samoan and Tongan and that `mi` is Hindi. Verified against the upstream language table and code map: **`mi` is Māori, Hindi is `hi`, Punjabi is `pa`, and Samoan and Tongan are absent entirely.** Our Tier-A coverage plan must not assume them.

## 3. Data plan and licences

**Rule (ADR-004 + CONSTRAINTS):** a corpus whose licence we have not read is treated as non-permissive and cannot enter a build. Every row below records the licence *as read on the date shown*, with the evidence link, in `docs/product/LICENSES.md`.

### 3.1 Public corpora (licence read 2026-10-21 unless stated)

| Corpus | Licence as read | Use in our mixture | Status |
|---|---|---|---|
| FLEURS (`google/fleurs`) | **CC-BY-4.0** (HF card) | read speech, 102 languages incl. Māori; attribution required | VERIFIED |
| DNS-Challenge noise + RIRs (OpenSLR 28) | **Apache-2.0** (OpenSLR listing) | noise beds and room impulse responses | VERIFIED |
| DNS-Challenge corpus (`microsoft/DNS-Challenge`) | **CC-BY-4.0** (repo licence file) | clean speech + noise, many languages | VERIFIED |
| MUSAN (OpenSLR 17) | **CC-BY-4.0** (OpenSLR listing) | general noise, plus music/speech distractors | VERIFIED |
| Kokoro-82M (`hexgrad/Kokoro-82M`) | **Apache-2.0** (HF card) | synthetic speech source (en, fr, hi, ja, it, pt, es, zh) | VERIFIED |
| Qwen3-TTS-12Hz-1.7B-CustomVoice | **Apache-2.0** (HF card) | synthetic speech source (10 languages) | VERIFIED |
| Piper voices (`rhasspy/piper-voices`) | repo tagged **MIT**, but each per-voice card defers to its source dataset's licence (read: the Arabic card says "License: See URL") | synthetic speech source (ar, hi, zh, es, en_GB/en_US); **no NZ English voice exists** | VERIFIED repo tag; **per-voice licence = UNVERIFIED** |
| AISHELL-1 | **Apache-2.0** (HF card) | Mandarin read speech | VERIFIED |
| Emilia (`amphion/Emilia-Dataset`) | **CC-BY-4.0** on the HF card; the repo is gated (`gated=auto`) | en/zh read speech | VERIFIED card; **still to confirm the gate terms** |
| VoxPopuli | **CC0-1.0 + "other"** (HF card) | crowd-read speech, many languages | **per-language licence review required** |
| Common Voice | no longer mirrored on HF since Oct 2025 (verified on the dataset card 2026-10-21); now served from Mozilla Data Collective under an account/agreement | crowd-read speech incl. our languages | access route VERIFIED; **licence UNVERIFIED here** — the public pages are script-rendered and could not be read today; read the licence field of the MDC dataset entry at download time |
| MLS, IndicVoices-R, KeSpeech, WenetSpeech, M-AILABS | HTTP 401 from this environment — could not be read | candidates | **UNVERIFIED** |
| ESC-50 | **CC BY-NC 3.0** (repo licence file) | — | **REJECTED** (non-commercial) |

The upstream mixture is 50 corpora (paper appendix). We do **not** adopt it wholesale: we take the subset whose licence we can read per language, and we state each one in the ledger.

### 3.2 Our own data (the part we own)

1. **Driver recordings** — opt-in, consent-based, per-driver, revocable, never in git, never sent to a third-party trainer. Purpose: NZ English identity, te reo/Samoan/Tongan speech, real van acoustics. Storage: encrypted, access-logged, deletion on request.
2. **Synthetic speech at scale** — generated with licence-clean TTS (Kokoro / Piper MIT voices / Qwen3-TTS) from our own script bank: 100 % of the courier domain vocabulary (LINZ street and suburb names, parcel nouns, action verbs), every Tier-A language, plus noise augmentation with DNS-Challenge noise + our own van recordings.
3. **Real van noise beds** — recorded in our own vehicles (engine, road, rain, indicator, radio, indicator clicks). We own them outright; this is the only way to match the real acoustic environment of a Christchurch van.
4. **LINZ-derived place names** — we already hold the LINZ address data; the *names* become the domain vocabulary for hotwords and text-side training. Addresses are never machine-translated (multilingual research, risk table).

**Target volumes for the pilot (our own data):** NZ English 20 h, te reo Māori 3 h, Samoan 1.5 h, Tongan 1.5 h, Arabic 10 h, Hindi 10 h, Punjabi 5 h, Mandarin 20 h, Spanish 20 h; plus 400 h of synthetic speech across all nine; plus 60 h of real van noise. Volume targets are **UNVERIFIED** until the pilot measures learning curves.

## 4. Model configuration (our engine, "Courier Voice")

- **Backbone:** a 0.6B-parameter multilingual decoder, Apache-2.0 (Qwen3-0.6B is Apache-2.0 — HF card, 2026-10-21), used bidirectionally, 28 layers, hidden 1024, 16 heads / 8 KV heads, 40,960-token context.
- **Audio codec:** 8 codebooks × 1024 entries + 1 mask slot; 24 kHz output; 75 tokens/s (24 kHz ÷ 320 downsample). **Decision required (see §10):** use the community-licensed codec (attribution display, derived-model name prefix, no-improve-other-LLMs clause, expanded licence above 100k MAU) or train our own codec (funded sub-project, weeks 7–14, with its own licence-clean corpus).
- **Loss:** cross-entropy on masked positions only; per-codebook means combined with weights 8, 8, 6, 6, 4, 4, 2, 2 (normalised).
- **Masking:** per-example mask ratio drawn uniformly in [0,1] over the whole grid (the reference's full-codebook random masking) — ~50 % of entries supervised per example.
- **Conditioning:** a style segment (language id, voice identity, speaking-rate band, formality), a text segment (with phonetic overrides), then the audio grid. Conditioning dropped on ~10 % of examples for classifier-free guidance.
- **Our additions vs the reference design:**
  1. **Per-language adapters** (low-rank, attention + feed-forward projections; the codec input/output layers trained in full): one adapter per Tier-A language, swappable at runtime so the phone ships NZ English + te reo + Pacific adapters and the server runs the full model.
  2. **Domain conditioning:** the LINZ-derived vocabulary is injected as a bias list at decode time (hotwords), so place names are correct without retraining.
  3. **Stable identity:** "Courier Voice" ships named voices (NZ, Pacific, Multilingual); the identity never changes between calls.
  4. **No truncation and no lead-in transient:** both are hard acceptance criteria in the eval set.

## 5. Training recipe

| Stage | What | Settings | Gate |
|---|---|---|---|
| 0. Licence + data | per-corpus licence sign-off; consent ingest; denoise; tokenise into sharded archives + manifest + error log | tokenisation on 4× A100, ~3 days for 500 h | zero corpora with an unread licence; every sample traceable to a licence row |
| 1. Track B: our own weights | continued training of the Apache-2.0 backbone on the licensed mixture, masked objective, packed sequences (8192 tokens/device), bf16, AdamW, LR 1e-4 cosine, 3 % warmup | 8 GPUs; duration set by the pilot (UNVERIFIED) | loss curves stable; dev WER improving on our dev slice |
| 2. Stage 1 (Track A) or per-language | adapter runs for Tier-A languages | 5,000 steps, LR 1e-4 (adapter) / 1e-5 (full), SDPA or packed | per-language dev CER improves vs the base model |
| 3. Domain adaptation | courier script bank, self-corrections, prompt denoising, van-noise prompts | 2,000–5,000 steps, low LR | eval-set WER ≤ targets |
| 4. Merge, quantise, export | merge adapters; quantise; export ONNX for the phone | int8 for the device build | device latency ≤ 700 ms command→action, battery ≤ 8 %/h |
| 5. Evaluation + panels | objective metrics on the eval set; subjective panels with NZ drivers | — | §8 gates met |

**Never in the recipe:** real driver audio in git; any corpus without a licence row; any corpus whose licence is non-commercial; the upstream weights in a build without a ledger entry.

## 6. Cost / GPU estimate

**Prices (RunPod on-demand, list price, page fetched 2026-10-21, USD/hour):** H100 PCIe $1.99 community / $2.89 secure · H100 SXM $2.69 / $3.99 · A100 PCIe $1.19 / $1.79 · L40S $0.79 / $1.09 · A40 $0.35 / $0.59. **FX:** 1 USD = **NZD 1.7632** (ECB reference rate via frankfurter.dev, rate dated 2026-10-19). **Secure Cloud is mandatory for any job that touches driver voice** (community hosts are third-party machines).

| Line | GPU-h | Unit (secure) | USD | NZD |
|---|---|---|---|---|
| **Pilot (Track A):** 2× H100 PCIe × 48 h | 96 | $2.89 | $277 | $489 |
| Pilot tokenisation: 4× A100 PCIe × 24 h | 96 | $1.79 | $172 | $303 |
| Pilot evaluation: 1× L40S × 72 h | 72 | $1.09 | $78 | $138 |
| **Pilot total** | 264 | — | **$527** | **$930** |
| **Full run (Track B):** 8× H100 SXM × 14 d (336 h) | 2,688 | $3.99 | $10,725 | $18,910 |
| Full tokenisation: 4× A100 PCIe × 72 h | 288 | $1.79 | $516 | $909 |
| Full evaluation + panels: 1× L40S × 240 h | 240 | $1.09 | $262 | $461 |
| **Full-run total (secure)** | 3,216 | — | **$11,502** | **$20,281** |
| *Community-cloud variant (no driver voice in those jobs)* | 3,216 | mixed | *$7,763* | *$13,687* |
| **Running service** (private voice service, 1× L40S secure, 730 h) | 730 | $1.09 | $796/mo | $1,403/mo |

**UNVERIFIED / excluded:** the wall-clock durations (14 days for the full run) are a planning assumption, not a measurement — the pilot must measure throughput and the full run must be re-costed from that; storage, egress, VAT/GST and any enterprise discount are excluded; the upstream reference cost for comparison is 8× H800 for 9.66 days (paper, 2026-04-21) ≈ 1,855 H800-hours, and H800 pricing was not read today.

## 7. The quality bar we must beat

| Engine | Weights licence (2026-10-21) | Tier-A languages covered | Note |
|---|---|---|---|
| **Kokoro-82M** | Apache-2.0 | en, fr, hi, ja, it, pt, es, zh | no ar / pa / mi / sm / to; its own card warns non-English coverage "may be absent or thin" and that **short utterances (<10–20 tokens) are a weakness** — our replies are ≤ 8 words, so this is where we must beat it |
| **Qwen3-TTS-12Hz-1.7B-CustomVoice** | Apache-2.0 | zh, en, ja, ko, de, fr, ru, pt, es, it (10 languages, from the model card) | **no ar, hi, pa, mi, sm, to** |
| **Qwen3-ASR-1.7B** | Apache-2.0 | 30 languages + 22 Mandarin dialects, incl. zh, en, ar, es, hi | **no pa, mi, sm, to** |
| **Piper voices** | repo MIT; per-voice licence to verify | ar, hi, zh, es, en_GB/en_US | no NZ English voice; engine archived |
| **OmniVoice released weights** | CC-BY-NC | 646 languages incl. en, zh, es, ar, hi, pa, mi | **no sm, to**; reference quality bar (paper, 2026-04-21): FLEURS-102 CER — Māori 1.98 (human 4.90), Hindi 2.64, Punjabi 2.95, Standard Arabic 1.92, Mandarin 3.16, Spanish 0.77, English 1.67; average CER 4.00 % vs human 5.11 %; RTF 0.0319 (16 steps, batch 1, H20) |

**Our bar, in our own numbers (measured on `packages/eval/voice/`):** TTS — WER of the synthesised audio measured through our pinned judge, ≤ 8 % NZ English quiet / ≤ 15 % van noise on addresses, per-language intelligibility no worse than the upstream published CER for Māori, Punjabi, Hindi, Arabic, Mandarin, Spanish; naturalness (predicted MOS) ≥ the upstream reference on the same slice; speaker similarity ≥ 0.80 on our clones; no dropped text; no leading transient; no tail truncation; synthesis latency ≤ 400 ms for an 8-word reply (server) and ≤ 700 ms command→action on device; device battery ≤ 8 %/h. ASR/agent side — intent accuracy ≥ 97 %, wake-word false accepts ≤ 1/h, misses ≤ 3 %, all core commands fully offline.

**Conclusion that drives this plan:** for Arabic, Punjabi, Māori, Samoan and Tongan there is **no licence-clean, quality-verified engine today**. Option 1 cannot close our gap; only our own weights can.

## 8. Evaluation plan

- **Set:** `packages/eval/voice/` (spec in `docs/squads/voice/EVAL.md`), ≥ 500 utterances, per-language and per-noise slices, plus a non-speech slice for false accepts.
- **Synthetic-first:** all utterances are generated with licence-clean TTS + noise/RIR augmentation; **real driver audio never enters the repository**.
- **Judges:** pin the ASR judge per language and record its version + hash; the judge is part of the metric definition. WER/CER, intent accuracy, barge-in false accepts, end-to-end command latency, and battery are all measured by the same harness on the CI emulator profile plus one mid-range Android.
- **A/B discipline:** every candidate (Kokoro, Qwen3-ASR/TTS, Piper, Track A, Track B) runs on the identical set, in the same harness, with raw per-utterance results published to `docs/squads/voice/benchmarks/`.
- **Subjective:** NZ driver panels (10–15 raters, target ≥ 20 sessions — **UNVERIFIED recruitment**) score naturalness and intelligibility per language; results are reported with the raw ratings.
- **Gate for Track B:** it must beat Track A and the licence-clean baselines on the same set before it can be the shipped engine.

## 9. Licence ledger requirements (shipped gate)

1. One row per artefact: name, version, **code licence**, **weights licence**, **dataset licences**, SHA-256 of every weight file, date the licence was read, evidence link, reviewer, decision (`shippable` / `internal-only` / `blocked`), obligations text.
2. Our own weights: the licence we grant ourselves, the licence of every corpus in the mixture, the backbone licence, the codec decision, and — per D23 — the upstream provenance (upstream, version, exactly what we changed: architecture deltas, adapters, data, dates).
3. **The CI gate fails the build** when any artefact present in the shipped tree has a non-commercial or unknown licence, and when a ledger row is older than the release date.
4. The ledger must also carry the **obligations**, not only the names: the community codec's attribution string (to be displayed), the derived-model name-prefix rule, the 100k-MAU threshold, and the founder's legal-advice reference (pointer only, no confidential text in git).

## 10. Risks and the open decision

| Risk | Impact | Mitigation |
|---|---|---|
| The codec's community licence attaches obligations to our product (attribution display, name prefix, MAU threshold, no-improve-other-LLM) | Shipping blocker or forced re-brand | Decide codec in week 1: accept and encode the obligations, or fund our own codec (weeks 7–14) |
| Samoan/Tongan have no public corpus | Two Tier-A languages have no bootstrap data | Collect with consent from day 1; start adapter runs from the base model with 1.5 h + synthesis |
| Our own data is consent-bound and revocable | A driver withdrawing consent must remove their audio | Consent registry with provenance per sample; rebuild on revocation |
| Full-run GPU cost (NZ$20k) lands before quality is proven | Money spent on a model that misses the bar | Pilot first; full run is a separate approval; community-cloud variant saves ~NZ$6.6k but only for jobs with no driver voice |
| Track A ships by default because it is faster | Licence exposure in the product | Release gate = Track B unless the founder records a written decision; adapters and backbone are swappable without app changes |
| Māori place names are read wrong | Wrong delivery address | Hotword biasing + per-adapter fine-tune + the eval set's address slice (gate) |

**Decisions needed from the founder (do not block the pilot):** (a) codec choice; (b) approval of the full-run budget; (c) whether Track A may ship before Track B clears the bar.

**UNVERIFIED (2026-10-21):** the pilot's throughput and therefore the full-run duration and cost; the per-corpus licences of the gated/blocked corpora; the exact NZD cost of storage and egress; the recruitment of driver raters; the stability of our own codec if we build one; every quality number until the eval set exists.

## 11. Definition of done for this plan

1. A licence-clean mixture exists and every sample traces to a ledger row.
2. A Courier Voice checkpoint exists whose lineage is recorded in `docs/product/LICENSES.md` and whose training run is reproducible from a config + data manifest.
3. The eval set is published and the harness runs on the CI emulator profile and one mid-range Android, with raw results in `docs/squads/voice/benchmarks/`.
4. The published table shows Courier Voice beating Kokoro, Qwen3-ASR/TTS and Piper on our slices, and matching the upstream published intelligibility for Māori, Punjabi, Hindi, Arabic, Mandarin and Spanish.
5. The device build meets ≤ 700 ms command→action and ≤ 8 %/hour battery in driving mode.
6. The engine is swappable: replacing it with a commercially-licensed model is a configuration change, proven by a test.
