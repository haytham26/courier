# The A-to-Z voice simulation at scale (founder directive 2026-11-08, item 4)

**Week:** 2026-W46 · **Lane:** 5 (the scale simulation) · **Branch:** `voice/scale-simulation`
**Commit range:** see the PR's head sha. Everything below was run in the lane's own
worktree (`.worktrees/voice-scale`), from that worktree, with the commands as written.

## What the directive asked for

Push-to-talk → STT → intent → the action applied to the run → the spoken
confirmation → visible on screen → synced, at **≥ 500 scripted turns per run**
across **quiet and van noise**, including **chatter that must NOT act**.

## What was missing, and why this lane had to build it

The voice set's 600 open-data utterances are Mozilla Common Voice **prose**: the
speakers read their own sentences (`per_utterance.csv`'s `gold_text`), so no file
of the `en_nz_quiet`, `en_nz_van` and `en_mix` slices ever spoke a courier
command, and every other slice had **no audio at all**. The scripts were there
(`packages/eval/voice/manifest/scripts.jsonl`, 720 of them, with their gold
intents); the speech was not. So the A-to-Z run had nothing to push through the
app.

Piece 1 builds that speech with the product's own voice; Piece 2 runs it through
the app.

## Piece 1 — the TTS command audio

### The engine, and the three things measured about it

The builder is `services/courier-voice/app/eval_tts.py` (the tools are
Python-only: sherpa-onnx ships its Kokoro TTS through the Python API). It speaks
each script with **Kokoro-82M through sherpa-onnx**, one fixed voice, one fixed
speed, no clock and no network at generation time.

Three facts about the engine were **measured**, not assumed, and the build is
shaped by them (the probe commands are in "The probes" below):

1. **The engine is not byte-reproducible.** Four separate processes, the same
   text, the same config, the same pinned archive: four different sample counts
   (62985 / 62970 / 62977 / 62976) and four different hashes. This holds for the
   `kokoro-int8-en-v0_19` pack, the fp32 `kokoro-en-v0_19` pack and the
   multi-lingual pack, and for `vits-piper` voices in the same runtime. The
   consequence is the build's contract: **the manifest sidecar's sha256 is the
   pin**, and the simulation verifies every file against it before it is used. A
   rebuild of the set is NOT byte-identical, and nothing in this evidence claims
   it is.
2. **sherpa-onnx ≥ 2.0.0 dropped espeak-ng from the engine** (its own
   deprecation notice: "`--kokoro-data-dir` is deprecated and ignored in
   sherpa-onnx >= v2.0.0"). A word the lexicon does not carry is therefore
   **silently dropped** — "delivered at 57 Poulson Street" comes out as
   "delivered at Poulson Street", a different address. The builder spells every
   digit run out before it hands the text to the voice (`spoken_form`), and it
   records the words it could not speak (`oov_words`) on every row instead of
   hiding them.
3. **The engine is slow on this CPU** (an i9-13900H, 14 cores / 20 threads):
   RTF ≈ 6–8 per take, ≈ 14 s for a 2.6 s sentence. The build runs 6 worker
   processes for that reason, and each file is written by exactly one worker.

### The commands

```bash
# the data, once (the MUSAN beds are what the van variants need)
node scripts/eval/fetch-open-voice-data.mjs        # CC-BY-4.0 beds; Common Voice not needed here

# the voice models, once: the pinned archive + the pinned lexicon, sha256-verified
uv run --project services/courier-voice --extra eval python -m app.eval_tts \
  --root . --workers 6 \
  --out packages/eval/voice/manifest/tts_audio.jsonl

# the tests (red-first, the module's seam injected)
uv run --project services/courier-voice --extra dev --extra eval \
  python -m pytest services/courier-voice/tests/test_eval_tts.py -q
```

The pinned artefacts:

| Artefact                                           | URL                                                                                                    | sha256                                                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `kokoro-int8-en-v0_19.tar.bz2` (Kokoro-82M, 98 MB) | https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/kokoro-int8-en-v0_19.tar.bz2        | `c9f0dd393615805b0bab050c340834d5e684e732aec91c0e860cd30e982c08bd`                       |
| `lexicon-en-us.txt` (6.3 MB, 168 655 entries)      | https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/lexicon-en-us.txt                   | `8b67ae549a465eee78f92ecb74644ad90c3c58ce65f19c68baf85878a10ef73a`                       |
| the judge, `sherpa-onnx-whisper-tiny.en`           | https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-tiny.en.tar.bz2 | fetched by `fetch-open-voice-data.mjs`, unpacked locally, never downloaded by the scorer |

**Licences (ADR-004 / D24).** Kokoro-82M's weights are **Apache-2.0**
(`https://huggingface.co/hexgrad/Kokoro-82M`; the pack's own LICENSE file is
Apache-2.0), the sherpa-onnx runtime is Apache-2.0, and the voice is in the
service's licence ledger (`app/licences.py`, "Kokoro-82M", shippable, read
2026-10-21). The van beds are **MUSAN, CC-BY-4.0** — _MUSAN, Snyder et al.,
https://www.openslr.org/17_ — and that attribution line rides on every van row
of the sidecar and in the set's `licence.csv`. The builder REFUSES to write a
file when the ledger does not name the voice or the beds.

### What was built

|                                                                               | count                                                                                                                                      |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| scripts in the set                                                            | 720                                                                                                                                        |
| built audio files                                                             | **1880** (see `manifest/tts_audio.jsonl`)                                                                                                  |
| — quiet                                                                       | 560                                                                                                                                        |
| — van variants (0 / 5 / 10 dB over the MUSAN beds)                            | 1320 (440 per SNR)                                                                                                                         |
| rows whose words the lexicon could not fully pronounce (`oov_words` recorded) | 1188                                                                                                                                       |
| not synthesised, named with the reason                                        | 160 (the `ar`, `hi_pa`, `zh`, `sm_to` slices: Kokoro-82M has no Arabic, Hindi, Samoan, Tongan or Mandarin voice and the ledger names none) |

The sidecar is `packages/eval/voice/manifest/tts_audio.jsonl`: one JSON line per
file, with its sha256, the voice, the speed, the model URL and sha256, the licence
and its attribution, the bed and its licence, and the words the lexicon could not
speak. It carries no timestamp and no run id, so two builds of the same take
produce the same sidecar.

### The tests (red-first)

`services/courier-voice/tests/test_eval_tts.py` — 23 tests, all green, each name
its claim: two builds of the same take are byte identical; every file's sha256
matches its row; a tampered file no longer does; the van variants differ from
their quiet twin **only by the bed's gain** (the measured ratio is
`rms(van0 − quiet) / rms(van5 − quiet) = 10^(5/20) = 1.7783`); the held-out
gate refuses in both directions; a voice the ledger does not name refuses the
build; the unvoiced slices are named, never dropped; a take that would clip is
refused rather than rescaled. The red run (11 of 12 red before the parser fix's
counterpart existed) is recorded in the PR.

## Piece 2 — the ≥ 500-turn A-to-Z simulation

### The commands

```bash
# the turn set: every built file transcribed by the pinned judge, scored on the
# service's own offline brain, written as the committed fixture
uv run --project services/courier-voice --extra eval python -m app.eval_scale \
  --sidecar packages/eval/voice/manifest/tts_audio.jsonl \
  --out packages/eval/voice/fixtures/scale-turns.jsonl \
  --results docs/evidence/voice-scale/results

# the simulation itself (jest, the app's own code, real audio, real transcripts)
cd apps/mobile && node_modules/.bin/jest.cmd src/voice/__tests__/scaleSimulation.test.ts
```

### What it proves

Every turn of the set, in a seeded order (seed 20261110, mulberry32), goes:

1. the armed WAV is resolved by the app's own build seam
   (`audioSourceForThisBuild`, option C of the research) — in this build the
   flag names the file, and **the microphone is never opened**;
2. the file is handed to the app's own recorded-utterance seam
   (`transcribeRecordedUtterance`);
3. the finished transcript reaches the app's own turn flow
   (`useCourierVoice.sendTurn`), which routes it (`routeTurn`), publishes the
   command on the real channel (`commandChannel`), and speaks the router's own
   ack line;
4. the command reaches the **real run store** (`RunStore` over a real
   `EventLog`), so the action is applied to the run and an event is recorded;
5. the trace records all of it, and the run writes its own evidence:
   `results/per_turn.csv` (one row per turn) and
   `results/simulation-summary.json`.

### The counts

(the numbers below are regenerated by the run; see `results/simulation-summary.json`
for the run's own, `results/summary.json` for the judge's, and `results/per_turn.csv`
for every turn.)

| leg                                                                          | count                                                                                                                                                  |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **scripted turns on the run**                                                | **1880** (one per built file, in the seeded order)                                                                                                     |
| action turns                                                                 | 1695                                                                                                                                                   |
| chatter / no-intent turns                                                    | 185 (the `chatter` slice's 40 × 4 conditions, plus the set's own noop rows)                                                                            |
| quiet turns vs van turns                                                     | 560 quiet / 1320 van (440 at 0 dB, 440 at 5 dB, 440 at 10 dB)                                                                                          |
| **action turns the PHONE answered end to end** (the directive's ≥ 500 floor) | **896**                                                                                                                                                |
| turns the phone SPOKE a confirmation for                                     | 1880 (every turn: the ack line the router owns)                                                                                                        |
| — of those, commands published                                               | 345 `mark_delivered`, 172 `mark_failed`, 199 `add_stop`, 86 `add_location_note`, 48 `mark_skipped`, 23 `end_break`, 15 `start_break`, 8 `set_map_mode` |
| deliveries applied to the run                                                | 345                                                                                                                                                    |
| failures applied to the run                                                  | 172                                                                                                                                                    |
| delivery events in the log (the outbox owes every one)                       | 517                                                                                                                                                    |
| **false actions on chatter (the phone's parser)**                            | **0**                                                                                                                                                  |
| **false actions on chatter (the service's own offline brain)**               | **0**                                                                                                                                                  |
| audio files that no longer hash to their sidecar row                         | 0 (all 1880 verified)                                                                                                                                  |
| turns on a held-out street                                                   | 0 (the default build excludes them; `--heldout` emits them)                                                                                            |
| rows whose words the lexicon could not fully pronounce                       | 1188 (`oov_words` recorded per row)                                                                                                                    |

The action turns the recognizer defeated are **named, not dropped**: every one of
them is in `results/per_turn.csv` with the transcript that defeated it. The
dominant reasons are the van noise (the judge's WER rises with the bed) and the
spoken-number-correction form, which is a **named gap on the phone's parser and
on the service's own brain alike** (`app/eval_audio.py`'s `PARSER_GAPS`: the
`numbers_corrections` slice scored 0 of 160 on the service's brain).

The action turns the recognizer defeated are **named, not dropped**: every one of
them is in `per_turn.csv` with the transcript that defeated it. The dominant
reasons are the van noise (the judge's WER on the `en_nz_van` slice) and the
spoken-number-correction form, which is a **named gap on the phone's parser and
on the service's own brain alike** (`app/eval_audio.py`'s `PARSER_GAPS`).

### The app-side gap this lane found, and fixed

**BUG-303 (to be filed by the lead): the phone's own offline voice parser could
not act on the sentences a courier actually says.** `commands.ts` answered only
the bare catalog verbs — "delivered", "fail", "skip" — so "delivered at 57
Poulson Street, Addington", "no one home at 3411 Thompsons Track, Ashburton
Forks", "taking a ten minute break" and every other shape the set carries routed
to the server brain and the phone's offline path stayed silent. Red-first:
`apps/mobile/src/voice/__tests__/commandParserSpokenForms.test.ts` was 11 of 12
red on origin/main, and the fix (the address-bearing shapes, the ear's own
variants, the courier's break words, the spoken address carried on the command)
makes all 13 green with the 19 pre-existing parser tests untouched.

### The false-action leg

Two parsers must not act on chatter, and both are measured on the judge's real
transcripts of the TTS chatter audio:

- the phone's parser (`parseVoiceCommand` / `routeTurn`): 0 of 170, asserted per
  turn in the simulation;
- the service's own offline brain (`app/offline_brain.parse_command`): 0 of 170,
  scored by `app/eval_scale.py` and published in `results/summary.json`.

### The sync proof

Every action turn that marks a stop leaves a delivery event in the log that the
outbox has **not** sent (the simulation has no server): `per_turn.csv`'s
`events_logged` / `events_pending` and the summary's `events_pending` count are
the proof, and the simulation asserts that the marks in the run store and the
pending events in the log agree.

## The CI runs

Two runs of the same job on the same head sha (`754c0866`), 32 seconds apart:

| run         | the job's steps                                                              | verdict                                  |
| ----------- | ---------------------------------------------------------------------------- | ---------------------------------------- |
| 42806725882 | 19 of 19 steps success, **including the Locust SLO profile**                 | green                                    |
| 42806733602 | 18 of 19 success; "The Locust SLO profile" red (`fail ratio 0.0053 > 0.001`) | red on the backend's load-test step only |

### The Android E2E legs (run 42812940765, head \3aef6e1\)

| leg                                                              | verdict                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| api 34 Maestro (22 flows, the new `voice-scale.yaml` among them) | **green** (18m5s)                                                                                                                                                                                                                                                                                                                                                                        |
| api 35 Maestro                                                   | red on `.maestro/sign-in.yaml` ONLY - the FIRST flow, with an `adb` exit-1 eight minutes earlier in the same job: the runner/app-process flake family BUGS.md already carries as BUG-301/BUG-302. **In the very same job log, `.maestro/voice-scale.yaml` ran to completion: `Take screenshot voice-scale-armed... COMPLETED` and `Take screenshot voice-scale-delivered... COMPLETED`** |
| A1 (no mock, the real API)                                       | green (23m50s)                                                                                                                                                                                                                                                                                                                                                                           |
| the screen recordings                                            | green (25m58s)                                                                                                                                                                                                                                                                                                                                                                           |

The Locust SLO profile is the **backend's** step (`services/api`, PLAYBOOK §16): this PR
touches none of their paths — the diff is `apps/mobile/src/voice`, `.maestro`, `services/courier-voice`,
`packages/eval/voice`, `scripts/eval` (none) and `docs/evidence/voice-scale`. Two runs of the same
code, one green on that step and one red, is a shared-runner result rather than a diff; it is
recorded here rather than argued, and it is the lead's to re-run. Every check this PR's own diff
can move is green on 42806725882 and on the Quality-gates runs: lint, typecheck, test (the app's
887 jest tests and the voice service's 421 pytest tests), the typed API client, the Postgres
suite, the restore drill, the coverage ratchet, Semgrep + Bandit, the floor guard, both mutation
floors, CodeQL (JS + Python), the licence inventory, the dependency audits, the mutation scopes
and the secrets scan.

Also recorded: `check-licenses` fails **identically on origin/main** in this lane's environment
(the local pnpm cannot reach the npm registry to answer each package's licence) — a pre-existing
environment result, not this diff; this PR adds no JavaScript dependency.

## The honest legs NOT run

- **No emulator ran in this lane.** The CI AVDs (`.github/workflows/android-e2e.yml`)
  are the gate and the workflow is the lead's; the founder's BlueStacks device
  cannot run Maestro (its adb bridge closes the persistent `shell,v2` stream —
  recorded in `docs/log/CURRENT.md`). The device leg of the scale path is
  `.maestro/voice-scale.yaml`, which runs in CI, and this lane did not run it.
- **The emulator's AudioRecord input chain and its VAD are not exercised.**
  Option C bypasses them BY DESIGN; option A of the research
  (`docs/research/2026/voice-audio-injection.md`) is the real-mic parity leg, and
  VB-CABLE's install is a founder-gated FOUNDER_TODO.
- **The product's own on-device STT is not measured.** The transcripts are the
  pinned judge's (Whisper tiny.en, MIT weights + Apache-2.0 runtime). The
  product's own recognizer, the wake word, the address engine, the device
  latency and the battery are the device's legs (EVAL.md M1/M2/M4/M5/M6/M7) and
  stay **not measured** here.
- **The M8 TTS intelligibility leg** (WER of the synthesised audio against a
  per-language judge) is only measured for English, with the tiny.en judge, on
  this lane's audio; `results/summary.json` names it.
- **No CI run was started by this lane** beyond the gates above; the PR's checks
  are the lead's to read.

## The probes

The three engine measurements, reproducible:

```bash
# 1. determinism: four processes, the same sentence, the same pinned archive
for i in 1 2 3 4; do
  uv run --project services/courier-voice --extra eval python -c "...generate('delivered at 57 Poulson Street, Addington')..."
done
# → 62985 / 62970 / 62977 / 62976 samples, four different sha256 prefixes

# 2. the OOV drop: the lexicon has no '57', so the number is silently skipped
#    (the engine's own stderr: "OOV word skipped: '57'")

# 3. the rate: one take of a 2.6 s sentence takes ≈ 14 s of CPU on this machine
```

## Attribution

> MUSAN, Snyder et al. (https://www.openslr.org/17), CC-BY-4.0 — the van noise
> beds, in every van row of `packages/eval/voice/manifest/tts_audio.jsonl`.
>
> Kokoro-82M voices, Apache-2.0, https://huggingface.co/hexgrad/Kokoro-82M,
> run through the sherpa-onnx TTS engine (Apache-2.0) — the voice that speaks
> every built file.
