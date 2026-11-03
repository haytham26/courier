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
```

## The slices

| slice | scripts | what it measures |
|---|---|---|
| `en_nz_quiet` | 120 | the plain NZ delivery language, with the real addresses |
| `en_nz_van` | 120 | the same content at 0, 5 and 10 dB over the van beds (360 files) |
| `en_mix` | 120 | the same words in the other English accents of the courier mix |
| `mi_places` | 60 | te reo Māori place names inside English sentences |
| `ar` | 40 | Modern Standard Arabic with the NZ diaspora accent |
| `hi_pa` | 40 | Hindi, Punjabi and Hinglish |
| `zh` | 40 | accented NZ Mandarin |
| `sm_to` | 40 | Samoan and Tongan |
| `numbers_corrections` | 40 | the numbers a courier mishears ("seven, no, seventeen") |
| `code_switch` | 60 | the mid-sentence switches, with the gold switch position |
| `chatter` | 40 | the talk that is not a command (M9) |
| `shift_sim` | 3 shifts, 24 turns | the whole shift: the morning brief, the commands, the questions, the barge-in, the offline switch and the end of the day |

600 scripts is the plan; 500 is the floor (V4 §10.1). The shift simulations are
the slice of the whole shift, and they are scored against the service itself.

## The shift simulations

`manifest/shift_sims.json` holds three scripted shifts:

| id | the shift | the noise |
|---|---|---|
| `SIM-001` | a wet morning in the city: the brief, a delivery, the parcel for Mrs Smith, a barge-in, the next stop, a skip | the van in the rain, 5 dB |
| `SIM-002` | a rural run with no signal: the commands, the question that needs the internet, the correction, the map mode, a note | gravel road, 0 dB |
| `SIM-003` | the last hour: the day so far, the pay, the small talk, the end of the shift | quiet |

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

## How to regenerate

```
node scripts/eval/build-voice-eval.mjs     # the text parts (the manifest)
node scripts/eval/check-voice-eval.mjs     # the integrity of the set
node scripts/eval/fetch-open-voice-data.mjs  # the open clips and the van beds
uv run --directory services/courier-voice --extra eval python -m app.eval_audio
                                           # builds the open audio and scores it
```

The address bank is read from `data/linz/` (the LINZ layer 123113 data, the
three Canterbury districts). Nothing in the set is invented: the streets, the
suburbs and the house numbers are the real ones, and the spoken words are the
ones a courier says.

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
