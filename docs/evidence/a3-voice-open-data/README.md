# Evidence — the voice eval set built from open data (A3)

**Step:** AUDIT_2026-10-25 §A3 (voice squad) · **Branch:** `a3-voice-open-data` ·
**PR:** #183 · **Date:** 2026-11-03 · **Registers:** BUG-186 filed+fixed, PARITY 312

## What landed

1. **The open data** (`scripts/eval/fetch-open-voice-data.mjs`): 280 Mozilla
   Common Voice 17 en clips (CC0-1.0) filtered by the dataset's own accent
   metadata — 140 New Zealand English, 140 other English accents (Australian,
   England, Scottish, Irish, Canadian, United States) for the courier mix — and
   8 MUSAN noise beds (CC-BY-4.0) for the van slices. Everything lands in
   `data/voice/` (git-ignored, like `data/linz/`) with a per-clip sha256, and
   the licences are recorded in `packages/eval/voice/manifest/licence.csv` and
   `docs/product/LICENSES.md`. ESC-50 (CC BY-NC) and the DNS set are not used:
   the audit forbids a non-commercial licence here.
2. **The builder and scorer** (`services/courier-voice/app/eval_audio.py`, the
   service's new `eval` extra — numpy, soundfile, sherpa-onnx): it assigns the
   speakers to the manifest's open rows (a fresh speaker per script; the pool
   round-robins because 480 files come from 140 NZ speakers), mixes the van
   beds at the manifest SNRs, writes 16 kHz wavs to `data/voice/audio/`, and
   rewrites the manifest rows to `built` with their file and checksum. Then it
   transcribes every file with the pinned judge (sherpa-onnx Whisper tiny.en)
   and scores the three legs.
3. **The manifest**: the builder (`scripts/eval/build-voice-eval.mjs`) gained
   the `en_mix` slice (120 scripts sharing the quiet templates, so a
   regeneration with LINZ data reproduces this manifest byte for byte), and
   `scripts/eval/check-voice-eval.mjs` now pins the open side: >=500 built
   utterances, every built row carrying its file and its sha256.
4. **The results** in `packages/eval/voice/results/utterances/` with the
   producing command, the judge and its model URL (`environment.json`), the
   per-slice and per-utterance numbers, and what was NOT measured with the
   reason (`summary.json`).

## Red first (PLAYBOOK §14)

```
$ uv run --directory services/courier-voice pytest -q tests/test_eval_audio.py
ERROR tests/test_eval_audio.py            # the module did not exist yet

$ node scripts/eval/check-voice-eval.mjs
- A3 needs 500 utterances built from open data, it has 0
```

## Green

```
$ uv run --directory services/courier-voice --extra eval pytest -q tests/test_eval_audio.py
20 passed                                              # the build, the maths, the mapping

$ uv run --directory services/courier-voice --extra eval --extra dev pytest -q --cov=app
249 passed; coverage 90.8 % on services/courier-voice/app (floor 85 %, eval_audio itself 81.0 %)

$ node scripts/eval/fetch-open-voice-data.mjs
speakers: nz 140, mix 140 clips on disk (12,500 rows scanned); 8 noise beds

$ uv run --directory services/courier-voice --extra eval python -m app.eval_audio
built 600 utterances into data/voice/audio
intent accuracy: {'ar': 0.0, 'chatter': 1.0, 'code_switch': 0.25, 'en_mix': 0.2917,
 'en_nz_quiet': 0.2917, 'en_nz_van': 0.125, 'hi_pa': 0.0, 'mi_places': 0.2,
 'numbers_corrections': 0.0, 'sm_to': 0.0, 'zh': 0.0}
open slices: {'en_nz_quiet': 120, 'en_nz_van': 360, 'en_mix': 120}

$ node scripts/eval/check-voice-eval.mjs
the voice evaluation set is sound: 720 scripts, 960 planned files (600 built from
open data), 240 addresses, 3 shift simulations

$ ruff check . / mypy . (services/courier-voice, with the eval extra)
All checks passed! / Success: no issues found in 43 source files
```

## The measured numbers (the commit's summary.json)

| slice | utterances | WER (judge) | false-action rate |
|---|---|---|---|
| `en_nz_quiet` | 120 | 14.8 % mean | 0.0 % |
| `en_nz_van` | 360 | 28.0 % mean (0 dB 36.9 %, 5 dB 26.1 %, 10 dB 21.1 %) | 0.0 % |
| `en_mix` | 120 | 12.5 % mean | 0.83 % |

The false-action rate over all open speech is 0.17 %: the service's parser
does not fire on natural conversation. The intent accuracy is the service's
**offline brain** on the gold scripts (the labels in `summary.json`'s `legs`
say exactly which path each number measures, and the address-bearing long
forms go to the server brain online, whose OmniRoute gateway is the founder
item).

## How the licences were verified (the audit's step-1 rule)

- **Mozilla Common Voice 17.0, CC0-1.0.** The corpus is public domain from
  commonvoice.mozilla.org's own statement; what this run used is the Hugging
  Face datasets-server mirror `saeedzou/common-voice-17-en-age-gender-accent`
  (ungated, no login), which serves the same rows - the row's `path` names the
  original clip file (`common_voice_en_*.mp3`, the corpus's own naming), its
  `sentence` is the CV transcript, and its `accent`/`age`/`gender` are the CV
  demographic metadata. Every downloaded clip is checked against the mirror's
  row and its sha256 is recorded in `data/voice/common-voice/clips.jsonl`, so a
  later run can prove which bytes were used. The mirror's licence follows the
  corpus: CC0-1.0, recorded in `packages/eval/voice/manifest/licence.csv`.
- **MUSAN, CC-BY-4.0.** The noise beds were taken from the `noise` split of the
  mirror `corypaik/musan` (the `licenses/` directory of that repo points to
  MUSAN's own statement, and the corpus's OpenSLR page declares CC-BY-4.0).
  Only the **noise** rows were fetched (8 clips: road, rain, engine and street
  sources); the `music` and `speech` splits were not used, and ESC-50 and the
  DNS-challenge set were refused for their non-commercial terms.
- **The judge.** Whisper tiny.en weights (MIT) + the sherpa-onnx runtime
  (Apache-2.0), both already in the service's licence ledger (`licences.py`) or
  in `docs/product/LICENSES.md`; the judge is eval-only and never shipped. Its
  archive is fetched by the same script as everything else (one download path
  for the whole set, HTTPS from the GitHub release); the Python module never
  downloads anything itself - it only unpacks the local archive member by
  member, refusing a member that escapes the target directory.

## The languages the offline brain does not support

`ar`, `hi_pa`, `zh` and `sm_to` show `0.0` intent accuracy: that is NOT a
measured zero, it is **not supported offline**. The offline brain's command
patterns are English (`services/courier-voice/app/offline_brain.py`), so those
slices' gold scripts are not routed through it at all - their on-device path is
the phone's own STT plus the server brain online, and their intent accuracy
stays with that leg (recorded as not measured with that reason). The English
slices are the only ones the offline brain is expected to parse.

## The quality finding this measurement surfaced (BUG-187, HIGH)

The intent accuracy is a finding, not just a number. The root cause, per gold
intent over the 720 scripts (the parser run on the gold text itself):

| gold intent | parsed right | why the rest fail |
|---|---|---|
| `mark_delivered` | 0 / 244 | the catalogue's patterns are anchored short forms (`^delivered\.?$`, `^left it at <place>\.?$`); the trailing address kills both |
| `mark_failed` | 0 / 127 | no pattern exists for "no one home at X", "cannot get in at X", "dog in the yard at X" |
| `skip_stop` | 0 / 35 | "skip this one at X" fails the anchored `^skip this one\.?$` |
| `start_break` | 0 / 10 | "taking a ten minute break" is not a form the brain knows |
| `end_break` | 0 / 10 | "back on the road" is not either |
| `repeat_or_detail` | 0 / 40 | "what was that" / "repeat that" / "where is it in the van" are not |
| `add_stop` | 72 / 152 | the English long forms work; the Arabic slice's never (not supported offline) |
| `add_location_note` | 30 / 52 | "gate code is …" and "watch the dog …" match; "parcel box round the back at X" does not |
| `noop` | 50 / 50 | chatter is correctly ignored - the parser does not fire on conversation |

The gold slots (`safe_place`, the failure `reason`, the break `minutes`) are
never emitted at all: the actions carry the intent (`type`) and, where a pattern
captures it, `raw_address`/`text`. **BUG-187** (HIGH, open) carries this root
cause and the target (EVAL.md's M3 bar, >= 97 % intent + mandatory slots on the
English slices' gold scripts); its fix is its own PR after this one, red-first,
and neither the measured scores nor any threshold is changed to reach it.

## Gates

| Gate | Command | Result |
|---|---|---|
| voice suite | `pytest -q` (with dev + eval extras) | 249 passed |
| voice coverage | `pytest --cov=app` | 90.8 % (floor 85 %) |
| lint + types | `ruff check .` / `mypy .` | clean |
| set integrity | `check-voice-eval.mjs` | sound, 600 built |
| registers | `check-parity.mjs` | 312 PARITY rows / 166 BUGS rows, BUG-186 unique |
| floor + mojibake | `check-floor.mjs`, `check-mojibake.mjs` | clean |
| CI | PR #183's checks | see the PR |

## Not claimed

- The audio of the eight TTS slices (`mi_places`, `ar`, `hi_pa`, `zh`, `sm_to`,
  `numbers_corrections`, `code_switch`, `chatter`): their text side is done and
  their audio needs the project's own voices in the licence ledger first (D24).
- The on-device leg (our own STT's WER, the address accuracy, the wake word
  rates, the battery) and the TTS intelligibility: they run on the device or
  need the synthesised audio, and are reported as not measured with that
  reason - the shift sims' M3 against the service stays the service's number.
