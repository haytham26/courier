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
  slices.json       the slice ids, the counts and the status
```

## The slices

| slice | scripts | what it measures |
|---|---|---|
| `en_nz_quiet` | 120 | the plain NZ delivery language, with the real addresses |
| `en_nz_van` | 120 | the same content at 0, 5 and 10 dB over the van beds (360 files) |
| `mi_places` | 60 | te reo Māori place names inside English sentences |
| `ar` | 40 | Modern Standard Arabic with the NZ diaspora accent |
| `hi_pa` | 40 | Hindi, Punjabi and Hinglish |
| `zh` | 40 | accented NZ Mandarin |
| `sm_to` | 40 | Samoan and Tongan |
| `numbers_corrections` | 40 | the numbers a courier mishears ("seven, no, seventeen") |
| `code_switch` | 60 | the mid-sentence switches, with the gold switch position |
| `chatter` | 40 | the talk that is not a command (M9) |

600 scripts is the plan; 500 is the floor (V4 §10.1).

## How to regenerate

```
node scripts/build-voice-eval.mjs     # the text parts (the manifest)
node scripts/check-voice-eval.mjs     # the integrity of the set
```

The address bank is read from `data/linz/` (the LINZ layer 123113 data, the
three Canterbury districts). Nothing in the set is invented: the streets, the
suburbs and the house numbers are the real ones, and the spoken words are the
ones a courier says.

## What is not here yet, and why

- **The audio.** The audio needs the on-device TTS (sherpa-onnx) or the
  private voice service, and every voice has to be in the licence ledger
  before a sample is committed. The set is therefore complete on the text
  side and the audio side is the next step of the voice squad.
- **The non-speech corpus** (8 hours of road, rain, engine, indicator, horn
  and radio, plus a passenger conversation) for M4 and M9. The noise beds
  need their own licence check (`audio/noise/noise_manifest.jsonl`).
- **The 30 committed sample files** (5 MB) for the CI smoke test. The data
  hygiene rule applies: the voice samples and the label photos may hold
  personal data, so they are redacted before use and never committed raw.

## The gold intents

The gold intents are the tools of the product's own catalogue
(`apps/api/app/prompts.py`): `mark_delivered`, `mark_failed`, `skip_stop`,
`add_stop`, `start_break`, `end_break`, `add_location_note`,
`repeat_or_detail` and `noop`. The check refuses an intent that the product
does not have, so the set and the product cannot drift apart.
