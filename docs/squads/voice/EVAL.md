# EVAL — the voice evaluation set and its scoring contract

**Area:** V4 §10.1 (voice squad: ≥ 500 utterances, languages/accents/noise, NZ addresses, numbers, self-corrections) · **Squad:** Voice
**Date:** 2026-10-21 · **Role:** Voice squad research lead · **Status:** specification — the set and the harness do not exist yet
**Depends on:** `docs/research/2026/on-device-stt-tts-vad-kws.md` (targets + the slice table this refines), `docs/research/2026/multilingual-voice-i18n.md` (code-switch slice), `docs/squads/voice/README.md` (release gate), `docs/MASTER_EXECUTION.md` §7.9 (data hygiene), `docs/squads/voice/OWN-MODEL.md` (the model this set scores), `docs/study/omnivoice/SPEC.md` (the intelligibility bar).

---

## 0. Why this set comes first

Working agreement #1 of the voice squad: **the benchmark exists before the library is chosen.** Today every voice number we hold is a vendor claim; `docs/squads/voice/eval/` is absent, so no candidate (Kokoro, Qwen3-ASR/TTS, Piper, sherpa-onnx, OmniVoice, our own weights) can be compared on evidence. This document is the contract for building it. **The harness itself is out of scope here** — this file specifies the data, the manifest, the consent rules and the scoring so the harness can be written against it.

Two rules that shape everything below:

1. **No real driver audio ever enters the repository** (MASTER_EXECUTION §7.9: samples may contain personal data — redact/blur before any use in eval sets, never commit them, document consent).
2. **The set must be regenerable.** Audio is *generated*, not committed; the repository holds the recipe, the manifests and a small CI sample, and the full set is rebuilt from a pinned seed and pinned model versions.

## 1. What the set must measure

| # | Metric | Definition in one line | Release target (V4 §10.1) |
|---|---|---|---|
| M1 | **WER / CER** | word (or character, for zh) error rate of the transcript against the gold transcript | ≤ 8 % NZ English quiet, ≤ 15 % van noise, **on addresses** |
| M2 | **Address accuracy** | share of address utterances where the extracted address matches the gold address exactly after normalisation | ≥ 97 % |
| M3 | **Intent accuracy** | intent + mandatory slots both correct | ≥ 97 % |
| M4 | **Wake-word false accepts** | spurious wake detections per hour of continuous listening | ≤ 1 / hour |
| M5 | **Wake-word misses** | wake phrases not detected | ≤ 3 % |
| M6 | **End-to-end command latency** | last spoken word → action recorded in the event log | ≤ 700 ms on device |
| M7 | **Battery** | drain per hour in driving mode | ≤ 8 % / hour |
| M8 | **TTS intelligibility** (synthesis path) | WER/CER of the *synthesised* audio, transcribed by a pinned judge | ≤ the upstream published CER per language (own-model bar) |
| M9 | **False-action rate** | actions fired on non-command chatter | ≤ 1 % of the non-speech slice |

M4 and M9 are measured on continuous non-speech audio, not on the 500 utterance slice; M1–M3, M6, M8 on the utterance slices.

## 2. Composition (≥ 500 utterances + a non-speech corpus)

| Slice | Min | Contents |
|---|---|---|
| `en_nz_quiet` | 120 | NZ English, quiet; streets/suburbs from our LINZ-derived name list; house numbers; unit numbers |
| `en_nz_van` | 120 | the same content at 3 SNRs (0, 5, 10 dB) over van/rain/traffic/indicator beds → 360 files |
| `mi_places` | 60 | te reo Māori place names with macrons, spoken inside English sentences; the code-switch form "Kōwhai / 3 Kōwhai Street" |
| `ar` | 40 | Modern Standard Arabic + NZ diaspora accent; right-to-left text |
| `hi_pa` | 40 | Hindi (Devanagari) and Punjabi (Gurmukhi) + Hinglish code-switch |
| `zh` | 40 | accented NZ Mandarin |
| `sm_to` | 40 | Samoan and Tongan, Pacific NZ accents |
| `es` | 40 | Latin-American and European Spanish |
| `numbers_corrections` | 40 | "7… no, 17", "twelve thirteen", "one-eight-five", "1 2 3 4", "forty two or fifty two" |
| `code_switch` | 60 | mid-sentence switches (en↔te reo, en↔Arabic, en↔Mandarin, Hinglish); each with the gold switch position |
| `chatter` | 40 | driver chatter, radio, passenger talk — no intent; used for M9 |
| `nonspeech` | ≥ 8 h continuous | road/rain/engine/indicator/music/horn/radio, plus a passenger conversation — for M4 and M9 |
| **Total utterances** | **≥ 600** | (500 is the floor; 600 is the plan) |

Each utterance carries exactly one primary slice; a file may belong to the noise variants of its slice. Accent tags (`nzo`, `pacific_nz`, `diaspora`, `latin_am`, `eu`) and a `code_switch` flag are mandatory fields.

## 3. Directory layout under `docs/squads/voice/eval/`

```
docs/squads/voice/eval/
├── README.md                     # what this is, how to regenerate, how to run the harness
├── manifest/
│   ├── utterances.jsonl          # ONE line per generated audio file (the master index)
│   ├── slices.json               # slice ids, target counts, acceptance counts, status
│   ├── speakers.jsonl            # synthetic speaker definitions (see §5)
│   ├── scripts.jsonl             # the text script bank: spoken text, gold intent, slots, tags
│   ├── addresses.jsonl           # NZ address bank (LINZ-derived street/suburb names only)
│   ├── judges.json               # pinned transcription judge per language (name, version, sha256)
│   └── licence.csv               # every source used to build the set: source, licence, date read, sha256
├── audio/
│   ├── sample/                   # 30 committed utterances (≤ 5 MB) for CI smoke tests only
│   └── .gitkeep
├── noise/
│   ├── beds/                     # noise beds (id → file), licence-checked
│   ├── rirs/                     # room impulse responses
│   └── noise_manifest.jsonl      # bed/rir id, type, licence, source, sha256
├── scoring/
│   ├── normalise/<lang>.txt      # per-language normalisation rules
│   ├── intents.json              # intent catalogue, aliases, mandatory slots
│   └── address_rules.json        # address normalisation + equivalence rules
└── results/                      # harness output; published runs are committed, raw runs are artefacts
    └── <run_id>/summary.json, per_utterance.csv, environment.json
```

**Not in the repository:** the full generated audio (≈ 120 MB for the utterance slices at 24 kHz mono, plus ≈ 1.4 GB for the 8-hour non-speech corpus), and every byte of real consented voice. Both are produced outside the tree or stored as CI artefacts; the repository keeps the manifests, the recipe and the 30-file sample.

## 4. Manifest schema

`manifest/utterances.jsonl` — one JSON object per file:

| Field | Type | Notes |
|---|---|---|
| `utt_id` | string | stable, `<slice>_<lang>_<scriptid>_<spk>_<snr>`, unique across the set |
| `slice` | string | one of §2 |
| `lang` | string | BCP-47 (`en-NZ`, `mi`, `ar`, `hi`, `pa`, `zh`, `sm`, `to`, `es`) |
| `script` | string | `Latin`, `Arabic`, `Devanagari`, `Gurmukhi`, `Han` |
| `accent` | string | accent tag |
| `speaker_id` | string | synthetic speaker key → `speakers.jsonl` |
| `snr_db` | number \| null | null for clean, else the applied SNR |
| `noise_id` | string \| null | noise bed / RIR used |
| `audio_path` | string | repo-relative path when committed, artefact path otherwise |
| `audio_sha256` | string | hash of the wav file |
| `sample_rate` | int | 24000 |
| `duration_s` | number | |
| `transcript_raw` | string | exactly what was spoken, including a self-correction |
| `transcript_final` | string | the resolved form ("7… no, 17" → "17"); equals raw when no correction |
| `intent` | string \| null | gold intent, null for chatter/non-speech |
| `slots` | object | gold slots (address, number, unit, action, …) |
| `code_switch` | bool | |
| `code_switch_at` | int \| null | character offset of the switch |
| `address_id` | string \| null | reference into `addresses.jsonl` |
| `synthetic` | bool | **must be true for every file in git**; false only for files referenced from the consented store |
| `consented_id` | string \| null | pointer to the consent register entry (no audio, no PII) |
| `generator` | string | model id + version + seed, e.g. `<tts-model>@<version>#<seed>` |
| `licence_id` | string | reference into `licence.csv` |

`manifest/addresses.jsonl`: `address_id`, `street`, `suburb`, `town`, `number`, `unit`, `spoken_form` (how a driver says it), `gold_normalised`, `source` (LINZ-derived name list, no personal data).

`manifest/licence.csv` columns: `licence_id, source, artefact_or_corpus, licence, date_read, evidence_url, sha256, obligations, decision`.

## 5. How the set is generated (deterministic)

1. **Script bank first.** The text content is written by us, never scraped: courier commands, address dictations, number readings, self-corrections, chatter. Address material comes from our LINZ-derived street/suburb names — place names only, never a customer's address, name or unit.
2. **Synthetic speech.** Each script is spoken by a synthetic voice from a licence-clean TTS (Kokoro / Piper MIT voices / Qwen3-TTS / our own weights), one voice per speaker profile, with a fixed seed per utterance. Speaker profiles vary pitch and rate; each profile is recorded in `speakers.jsonl`.
3. **Noise augmentation.** Clean audio is convolved with a licence-checked room impulse response and mixed with a licence-checked noise bed at a target SNR (0 / 5 / 10 dB). Noise and RIR sources and their licences are recorded in `noise_manifest.jsonl` and `licence.csv` (the DNS-Challenge noise + RIR set published on OpenSLR 28: Apache-2.0; the DNS-Challenge corpus repository: CC-BY-4.0; MUSAN: CC-BY-4.0; our own van recordings: ours).
4. **Real van beds.** We record our own van, road, rain, indicator and radio audio — we own it, and it matches the actual acoustic environment.
5. **Determinism.** `utt_id` → seed → voice + rate + noise draw. The same generator versions and the same seed must reproduce the same bytes; the generator is version-pinned in the manifest and the recipe lives in `README.md`.
6. **Non-speech corpus.** ≥ 8 h continuous audio for false-accept measurement, built from our own van recordings plus licence-clean beds, and never containing a wake phrase.
7. **CI sample.** 30 utterances covering every slice are committed under `audio/sample/` so the harness smoke-test runs without a GPU.

**Licence-clean noise only:** ESC-50 is CC BY-NC 3.0 and is **excluded**.

## 6. Consent and privacy rules for any real voice (MASTER_EXECUTION §7.9)

- **Consent is explicit, per-purpose and revocable.** A driver consents separately to (a) evaluation use, (b) training use, (c) voice-clone identity use. Never bundled.
- **The consent record** stores: driver id (not a name), date, the exact wording shown, the scope, and a revocation timestamp. The wording and the flow are approved by the founder before any recording; the register lives in the private store, not in git.
- **Real audio never enters the repository.** It lives in the founder's encrypted store, outside the repo, addressed by `consented_id` only. The harness reads it from an environment path; a CI check fails if any audio file under `docs/` is not `synthetic: true` and listed in `licence.csv`.
- **Revocation is honoured within 7 days**: the sample is deleted from the store, the index entry is tombstoned, and any model trained on it is queued for retraining. The squad reports the count of revoked samples in `STATUS.md`.
- **Redaction**: before any real clip is used, addresses, names, unit numbers, phone numbers and plate numbers are removed or replaced with the same-category placeholder; a second person checks the redaction. Clips that cannot be redacted confidently are discarded.
- **No third-party trainer** ever receives driver audio; no upload to any external service.
- **Access control**: the store is access-logged; only the voice squad's speech scientist and the founder have access.
- **Retention**: raw recordings are deleted 90 days after collection unless the driver has an active consent that includes training use.

## 7. Scoring definitions (what the harness must implement)

- **Transcript normalisation** per language: case-fold; strip punctuation; expand digits to words using each language's rule file; keep macrons and other diacritics; strip fillers only where the rule file says so. The same normalised string is used for both sides.
- **WER/CER**: Levenshtein over words (characters for `zh`); `scoring/normalise/<lang>.txt` is the single source of truth. Published results must state the judge model and version.
- **Self-corrections** are scored twice: **WER-final** against `transcript_final` (what the driver meant) and **WER-raw** against `transcript_raw` (what was literally said). Both are published; the gate uses WER-final.
- **Address accuracy** uses `scoring/address_rules.json` (unit number optional when the utterance has none; street-number transposition "17 Kōwhai" vs "Kōwhai 17" is equivalent; macrons are significant).
- **Intent accuracy**: the same NLU path the app uses; an utterance counts correct only if the intent and every mandatory slot match the gold. `chatter` utterances must produce no action.
- **Wake-word false accepts**: count of wake detections in the non-speech corpus ÷ hours, reported as FA/hour with the corpus length; misses = undetected wake phrases ÷ total wake phrases.
- **Barge-in**: during a spoken reply, an interruption that should not abort (noise, cough) must not stop the reply (false barge-in rate); an interruption that should abort must stop it, and the **barge-in latency** (interruption start → reply stopped) is published.
- **End-to-end command latency**: t0 = the end of the last spoken word (timestamp from the capture, using the recorded waveform, not a wall-clock guess); t1 = the timestamp the action is written to the local event log. Report p50/p90/p95 per slice. On-device runs use the CI emulator profile **and** one mid-range Android; the profile is recorded in `environment.json`.
- **Battery**: three 60-minute driving-mode runs per device profile; report the median %/hour from the OS battery stats, plus CPU load and the wake-word duty cycle.
- **Every run writes** `results/<run_id>/summary.json` (aggregates + targets + pass/fail), `per_utterance.csv` (one row per utterance with the hypothesis, the judge output, the timing), and `environment.json` (git SHA, model ids + sha256, device profile, judge version, seed). Numbers without a CI link are **not verified** (MASTER_EXECUTION §7.6).

## 8. The harness contract (to be built; not part of this task)

- One command regenerates the set and one command scores a candidate; both take `--manifest`, `--engine`, `--out`.
- Deterministic given the same manifest, model versions and seed; re-running must not mutate the manifest.
- It must refuse to run if `licence.csv` is incomplete or if any engine's licence is non-commercial (ADR-004 requirement R2).
- It writes the three result files above; the summary must include the target and the pass/fail for M1–M9.
- CI runs the smoke test on the 30-file sample on every PR; the full run is a nightly + manual job and its artefacts are the evidence (MASTER_EXECUTION §7.1, §7.6).

## 9. Exit criteria for the set (it is "done" when)

1. ≥ 600 utterances, every slice in §2 at or above its minimum, counts asserted by `slices.json` in CI.
2. Every file in the manifest has a licence row and a generator + seed; `licence.csv` has no empty cells.
3. The committed audio is 100 % synthetic; a CI check fails on any non-synthetic file under `docs/`.
4. The consent register exists, is empty or has consented entries with the correct wording, and the revocation path has been tested once (dry run).
5. Regeneration from the recipe is byte-identical for a sample of 10 utterances (same seed, same generator versions).
6. The 30-file CI sample is committed and the harness smoke test is green.
7. `README.md` in the eval directory documents the regeneration command, the seed policy and the licence table.

## 10. UNVERIFIED (2026-10-21)

1. Slice sizes beyond the minima are estimates; the real cost of generating and reviewing them is unknown until the first run.
2. The judges per language are not chosen yet; a judge's WER on synthetic audio can flatter or penalise a system, so the judge choice is part of the metric and must be published with every result.
3. The ≥ 8 h non-speech corpus depends on our own van recordings, which we do not have yet.
4. Driver-rater recruitment for the subjective panels is not arranged.
5. The number of speakers per accent, the gender/age balance and the speaking-rate distribution are set by us and are not derived from a survey of the driver population.
6. Whether 24 kHz is the right capture format for the on-device pipeline (the on-device engines may prefer 16 kHz) is unresolved; the set is stored at 24 kHz and resampled at scoring time if needed.
