# The voice evaluation set

**Area:** V4 §10.1 (the voice squad) — the measurement of the voice pipeline.
**Owner:** the voice squad (`docs/squads/voice/`).

## What is here

The set measures what a courier says while driving, in the noise of a van, in
the languages Christchurch actually has, with the numbers a courier actually
mishears. The scoring contract (the metrics M1–M9, the acceptance counts and
the judge rules) is in `docs/squads/voice/EVAL.md`.

```
manifest/
  addresses.jsonl   240 real NZ addresses (LINZ layer 123113: Christchurch,
                    Waimakariri, Selwyn) - the street names, the suburbs and
                    the house numbers are the real ones
  scripts.jsonl     600 scripts: the spoken text, the gold intent, the gold
                    slots and the tags
  utterances.jsonl  840 planned audio files (the scripts times the noise
                    variants)
  shift_sims.json   the scripted full-shift simulations: three shifts with
                    the voice and the noise of a real day
  slices.json       the slice ids, the counts and the status
  licence.csv       the licence ledger of the audio the set is built from
  heldout_streets.json  the committed held-out street split: 20 % of the
                     Canterbury streets, split by street (never by address),
                     seeded (mulberry32, seed 20261108)
  heldout/           the held-out-only manifest (--heldout): addresses.jsonl,
                     scripts.jsonl, utterances.jsonl, slices.json - every row
                     tagged held_out: true
```

## The open data the audio comes from, and its attribution

The three English slices are built from open speakers, fetched by
`scripts/eval/fetch-open-voice-data.mjs` into `data/voice/` (git-ignored, like
`data/linz/`), each clip with its sha256:

- **Mozilla Common Voice 17.0 (en)** — CC0-1.0. 280 clips filtered by the
  dataset's own accent metadata (140 New Zealand English, 140 other English
  accents), fetched through the Hugging Face datasets-server mirror
  `saeedzou/common-voice-17-en-age-gender-accent` (Mozilla's own release at
  `commonvoice.mozilla.org/data` is a ~40 GB tarball for the whole corpus, so
  the mirror is the practical fetch). Every clip's sha256 is recorded in
  `data/voice/common-voice/clips.jsonl` and **re-verified against the file on
  disk on every run of the fetcher** — a tampered or truncated clip is refused,
  not silently reused. A comparison of those checksums against the official
  Mozilla release is a named follow-up (it needs the official tarball or an
  authenticated download); until then the mirror's own row metadata and the
  per-clip digests are what stands. CC0 needs no attribution, and the corpus is
  credited as "Mozilla Common Voice" in `licence.csv` regardless.
- **MUSAN** — CC-BY-4.0. 8 noise clips (road, rain, engine and street sources)
  from the `noise` split of the mirror `corypaik/musan` — the corpus's OpenSLR
  page is `openslr.org/17`. **CC-BY-4.0 requires attribution: "MUSAN, Snyder
  et al." appears in `licence.csv`, in the eval results and wherever the noise
  beds are used.** ESC-50 (CC BY-NC) and the DNS-challenge set are not used:
  a non-commercial licence is barred for a commercial product's eval set.

The judge (sherpa-onnx Whisper tiny.en, MIT weights + Apache-2.0 runtime) is
eval-only and never shipped; its own row is in `licence.csv` too.

## The slices

| slice                 | scripts            | what it measures                                                                                                         |
| --------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `en_nz_quiet`         | 120                | the plain NZ delivery language, with the real addresses                                                                  |
| `en_nz_van`           | 120                | the same content at 0, 5 and 10 dB over the van beds (360 files)                                                         |
| `en_mix`              | 120                | the same words in the other English accents of the courier mix                                                           |
| `mi_places`           | 60                 | te reo Māori place names inside English sentences                                                                        |
| `ar`                  | 40                 | Modern Standard Arabic with the NZ diaspora accent                                                                       |
| `hi_pa`               | 40                 | Hindi, Punjabi and Hinglish                                                                                              |
| `zh`                  | 40                 | accented NZ Mandarin                                                                                                     |
| `sm_to`               | 40                 | Samoan and Tongan                                                                                                        |
| `numbers_corrections` | 40                 | the numbers a courier mishears ("seven, no, seventeen")                                                                  |
| `code_switch`         | 60                 | the mid-sentence switches, with the gold switch position                                                                 |
| `chatter`             | 40                 | the talk that is not a command (M9)                                                                                      |
| `shift_sim`           | 3 shifts, 24 turns | the whole shift: the morning brief, the commands, the questions, the barge-in, the offline switch and the end of the day |

600 scripts is the plan; 500 is the floor (V4 §10.1). The shift simulations are
the slice of the whole shift, and they are scored against the service itself.

## The shift simulations

`manifest/shift_sims.json` holds three scripted shifts:

| id        | the shift                                                                                                            | the noise                 |
| --------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `SIM-001` | a wet morning in the city: the brief, a delivery, the parcel for Mrs Smith, a barge-in, the next stop, a skip        | the van in the rain, 5 dB |
| `SIM-002` | a rural run with no signal: the commands, the question that needs the internet, the correction, the map mode, a note | gravel road, 0 dB         |
| `SIM-003` | the last hour: the day so far, the pay, the small talk, the end of the shift                                         | quiet                     |

Every turn carries what the courier said, how the turn was opened, how fast the
van was going, what had the phone's attention, and what the service was expected
to answer: the intent, the exact words and the word limit.

## How to run the harness

```
uv run --directory services/courier-voice python -m app.eval_harness \
  --manifest packages/eval/voice/manifest/shift_sims.json \
  --out packages/eval/voice/results/shift-sim
```

The harness runs the simulations against the service and writes the three files
of the contract (`summary.json`, `per_turn.csv`, `environment.json`). It scores
the intent accuracy (M3), the false actions (M9), the eight word rule and the
latency of the service. The metrics that need the audio or a device are written
down as **not measured**, with the reason: a number that was not measured is
never reported as a pass.

## How to measure (the two manifests, real STT output)

Every score is measured from the recognizer's OWN output, never claimed from the
gold text (founder directive 2026-11-08 item 4 and the 2026-11-09 PART B
instruction; BUG-210 is why). Two commands, one per manifest, run from the
repository root:

```
uv run --directory services/courier-voice --extra eval python -m app.eval_audio \
  --manifest packages/eval/voice/manifest \
  --data data/voice \
  --out packages/eval/voice/results/utterances

uv run --directory services/courier-voice --extra eval python -m app.eval_audio \
  --manifest packages/eval/voice/manifest/heldout \
  --data data/voice \
  --out packages/eval/voice/results/heldout-utterances
```

The data comes first, once: `node scripts/eval/fetch-open-voice-data.mjs` writes
`data/voice/` (git-ignored) with the Common Voice clips, the MUSAN beds and the
judge archive, and re-verifies every clip's sha256 on every run. The scorer
unpacks the judge from that LOCAL archive and downloads nothing itself, so the
measurement is fully offline.

What the committed results carry, beside the WER and the parser ceiling:

- **`held_out` on every scored row** (`per_utterance.csv`) and in
  `summary.json` (`held_out`, `held_out_utterances`, `held_out_scripts`,
  `held_out_streets`, `street_key_check`). The scorer reads
  `manifest/heldout_streets.json` - the same shared list
  `scripts/eval/check-voice-eval.mjs` reads - by street key (the Python twin of
  `scripts/eval/street-key.mjs`), and REFUSES a manifest whose rows disagree with
  it, naming the row: a run from the wrong set is never published.
- **`intent_on_stt_by_slice`** and **`address_extraction_on_stt_by_slice`**: the
  intent accuracy and the exact-match address extraction, measured on the
  judge's hypotheses. The gold-text legs stay published as the parser ceiling
  they are, and `summary.json`'s `legs` says so in its own words.
- **`directive_targets`**: one entry per target of the founder directive, each
  with the slice its number was measured on, the counts behind it, and
  PASS / FAIL / **NOT MEASURED**. NOT MEASURED carries the reason it has none,
  so a leg this scorer cannot measure is never published as a pass.

**What the two runs do and do not add to each other.** The open-data audio is
assigned by utterance id, and both manifests lay their 600 open rows out in the
same order with the same clip pool, so the held-out run transcribes the SAME 600
files the main run does (verified: 600 of 600 ids mapped to the same clips). The
WER legs are therefore the set's own acoustic difficulty, measured once - not
independent evidence about held-out streets, and the held-out run does not claim
them as such. What the held-out run adds is real: its scripts speak held-out
streets, so its intent, address and ceiling legs are evidence about streets the
parser has never been tuned on.
## How to regenerate

```
node scripts/eval/build-heldout-streets.mjs   # the held-out street split (the committed list)
node scripts/eval/build-voice-eval.mjs        # the text parts (the main manifest; held-out streets excluded)
node scripts/eval/build-voice-eval.mjs --heldout  # the held-out-only manifest (manifest/heldout/)
node scripts/eval/check-voice-eval.mjs        # the integrity of both manifests
node scripts/eval/fetch-open-voice-data.mjs  # the open clips and the van beds
uv run --directory services/courier-voice --extra eval python -m app.eval_audio
                                           # builds the open audio and scores it
```

The address bank is read from `data/linz/` (the LINZ layer 123113 data, the
three Canterbury districts). Nothing in the set is invented: the streets, the
suburbs and the house numbers are the real ones, and the spoken words are the
ones a courier says.

## The two held-out sets

Nothing is ever tuned on a held-out set. There are two, and they are different
kinds:

1. **The synthetic street-split set — the shared backend list, adopted.** Since
   the founder instruction of 2026-11-09 (PART B), the voice lane and the
   backend share ONE held-out street list: the backend's committed fixture,
   `services/api/tests/fixtures/linz-holdout-streets.txt` — **1 360 of 6 802**
   Canterbury streets, seed 20261108, 20 %, split by street, NEVER by address
   (every address of a held-out street is held out with it). The backend
   generated it with `scripts/data/split-linz-holdout.py` on 2026-11-08 and
   measured its 99.65 % accuracy on it, so the voice manifests were regenerated
   FROM that list rather than keeping a voice-local one (the retired list was
   1 359 of 6 799 streets, derived from an older LINZ revision, sha256
   `8230c5cb…`; the switch is recorded in
   `docs/evidence/voice-heldout/README.md` with both shas).

   `packages/eval/voice/manifest/heldout_streets.json` is the voice view of that
   list: the streets exactly as the backend spells them (its `road_key`
   normalisation — lower-case, suffix abbreviated, so "Bealey Avenue" and
   "Bealey Ave" are one street), the source path and the source's logical-byte
   sha256 recorded. `node scripts/eval/build-heldout-streets.mjs` rebuilds it
   from the committed fixture (byte-identical, no local `data/` revision is
   read, so it runs on any machine), and
   `scripts/eval/build-voice-eval.mjs`

   - excludes every held-out-street address from the **default** manifest, so
     nothing is ever tuned on held-out streets (comparing by street key),
   - emits the held-out-only manifest under `manifest/heldout/` with
     `--heldout`, every row tagged `held_out: true`.

   `scripts/eval/check-voice-eval.mjs` refuses a main manifest containing a
   held-out street and a held-out manifest containing a non-held-out street,
   naming the row, and it re-reads the shared fixture and refuses when its
   bytes no longer match the manifest's recorded `source_sha256` — that
   refusal IS the announcement the backend owes this lane: the list must never
   change silently. `scripts/ci/check-parser-circularity.mjs` proves the gold
   templates and the parser regexes carry no held-out-street text (matched by
   key, in either suffix spelling, case-insensitively).

   **No voice tuning has used any street of this list** (recorded 2026-11-09):
   the hotword export (BUG-277) has not been fed to any STT run yet, and the
   only measurements so far read the eval set rather than fitting it. When the
   biasing lane runs, the held-out keys are excluded from its vocabulary.

2. **The founder's real-sentence set — not built yet.** ~100 sentences as real
   couriers say them (ADR-028 / D65, `docs/status/FOUNDER_TODO.md`,
   `manifest/held_out.jsonl`). **Until it exists, the §22 B threshold
   (`VOICE_ASK_CONFIDENCE_BAR`) is NOT claimed tuned**, and BUG-210's headline
   intent number stays what it honestly is: the parser ceiling on the
   generator's own templates, not an accuracy.

The synthetic set measures the pipeline on streets it has never seen; the
real-sentence set will measure it on sentences nobody in this repo wrote.
## What is here (the open-data audio)

The three English slices are **built from open data** (A3, AUDIT §A3): 600
audio files in `data/voice/audio/` (git-ignored, like `data/linz/`) from 280
Mozilla Common Voice clips (CC0-1.0, filtered by the dataset's accent
metadata: New Zealand English first, then the other English accents of the
courier mix) mixed with the MUSAN (CC-BY-4.0) van beds at the manifest's SNRs.

```
node scripts/eval/fetch-open-voice-data.mjs    # the clips and the beds, once
uv run --directory services/courier-voice --extra eval python -m app.eval_audio
```

The results, the judge and the producing command are in
`results/utterances/`; the manifest rows carry `status: built` with their file
and their checksum. What the audio measures is published honestly: the WER is
the open speakers' own words read by the pinned judge (sherpa-onnx Whisper
tiny.en - the set's acoustic difficulty, not our pipeline), and the intent
accuracy is the service's OFFLINE brain on the gold scripts.

## What is not here yet, and why

- **The audio of the TTS slices** (`mi_places`, `ar`, `hi_pa`, `zh`, `sm_to`,
  `numbers_corrections`, `code_switch`, `chatter`): those need the project's
  own TTS voices, and every voice must be in the licence ledger before a
  sample is committed (D24). Their text side is complete.
- **The on-device leg**: the product's own STT, the address extraction and the
  wake word run on the phone, so M1 on our pipeline, M2, M4, M5 and M7 stay
  with the device - a number that was not measured is never reported as a
  pass.
- **The non-speech corpus** (8 hours of road, rain, engine, indicator, horn
  and radio, plus a passenger conversation) for M4 and M9. The beds we have
  (MUSAN) are the van beds of the slice; the continuous corpus needs our own
  van recordings (`audio/noise/noise_manifest.jsonl`).
- **The 30 committed sample files** (5 MB) for the CI smoke test. The data
  hygiene rule applies: the voice samples and the label photos may hold
  personal data, so they are redacted before use and never committed raw.

## The gold intents

The gold intents are the tools of the product's own catalogue
(`services/api/app/prompts.py`): `mark_delivered`, `mark_failed`, `skip_stop`,
`add_stop`, `start_break`, `end_break`, `add_location_note`,
`repeat_or_detail` and `noop`. The check refuses an intent that the product
does not have, so the set and the product cannot drift apart.
