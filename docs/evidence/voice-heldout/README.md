# Voice held-out street split — evidence (founder directive 2026-11-08, item 4, held-out set (a))

**Date:** 2026-11-08. **Lane:** the lead's VOICE sub-agent lane, worktree
`C:\Users\DCL\projects\courier-voice-wt`, branch `voice/heldout-street-split`
(from `origin/main` `b389e56`). **PR:** voice(eval): the synthetic held-out set —
20 % of Canterbury streets, split by street, seeded, committed.

## What was built

- `scripts/eval/build-heldout-streets.mjs` — reads the three LINZ address
  files from `--linz-dir` (default `data/linz`), collects the distinct `road`
  values, sorts them (code-unit order), and selects exactly `floor(0.20 * N)`
  by a documented seeded PRNG (mulberry32, seed 20261108, partial Fisher-Yates
  over the sorted list; the first three outputs of `mulberry32(20261108)` are
  pinned in the test: 0.31713671749457717, 0.9465050620492548,
  0.7894808403216302). Writes
  `packages/eval/voice/manifest/heldout_streets.json`
  (`{ seed, fraction, total_streets, held_out_count, algorithm, sha256,
generated, streets }`); `sha256` is over the sorted held-out street list
  joined with `\n`; `generated` is the pinned directive date, so two runs are
  byte-identical.
- `scripts/eval/build-voice-eval.mjs` — takes `--linz-dir` and `--heldout`.
  The DEFAULT build excludes every address on a held-out street from the main
  manifest; `--heldout` emits the held-out-only manifest under
  `packages/eval/voice/manifest/heldout/` (addresses.jsonl, scripts.jsonl,
  utterances.jsonl, slices.json), every row tagged `held_out: true`.
- `scripts/eval/check-voice-eval.mjs` — refuses a main manifest containing a
  held-out street and a held-out manifest containing a non-held-out street,
  naming the row; `--heldout` checks the held-out manifest alone. The count
  floors (500 scripts, 100 addresses, slice minimums, >=500 built utterances)
  stay on the main manifest, unchanged.
- `scripts/ci/check-parser-circularity.mjs` — additively proves the gold
  templates (the whole builder file) and the parser regexes (the brain's
  `pattern=re.compile(...)` sources) carry no held-out-street text as a
  literal. BUG-210's 11 standing overlaps and the baseline are untouched.
- Tests: `scripts/eval/__tests__/build-heldout-streets.test.mjs` (5 claims) and
  `scripts/eval/__tests__/heldout-gates.test.mjs` (6 claims), run by the
  existing `test:store-readiness` glob `node --test "scripts/*/__tests__/*.test.mjs"`.

---

## 2026-11-09 — the switch: the backend's list is now the single shared source

**Founder instruction 2026-11-09, PART B.** The voice-local list and the
backend's address list had diverged (the LINZ data was updated in between):
ours was 1 359 of 6 799 streets (sha256 `8230c5cbfe02ef5df6840426d8b70d58b590c3e07438e403d22971b82b229991`),
the backend's is **1 360 of 6 802** streets (`services/api/tests/fixtures/linz-holdout-streets.txt`,
generated 2026-11-08T06:19:03Z, seed 20261108, 20 %, split by street). The
backend's 99.65 % accuracy was measured on ITS list, so the backend's list is
adopted unchanged and the voice manifests were regenerated from it:

| | old (retired) | new (shared) |
|---|---|---|
| source | the voice-local LINZ derivation (an older LINZ revision) | `services/api/tests/fixtures/linz-holdout-streets.txt`, read-only |
| streets | 1 359 of 6 799 | 1 360 of 6 802 |
| spelling | raw road names ("Abberfield Lane") | the backend's road_key ("abberfield ln") |
| list sha256 | `8230c5cb…` | `90e7b1a378ea6dc04769adcdf4c1aef1f783aab4258456a752d8c874bf3c9019` |
| source sha256 recorded | — | `14e84c2bdaae74522c40139546ab8828ff8b8d3e0d12254ae9dd30263c843fe0` (the fixture's logical bytes) |

What changed, and what did not:

- `scripts/eval/build-heldout-streets.mjs` now reads the committed fixture by
  default (`--source`, default `services/api/tests/fixtures/linz-holdout-streets.txt`);
  the LINZ derivation stays behind `--derive-from-linz` for forensics. No
  machine reads a local `data/linz` revision in any gate.
- `scripts/eval/street-key.mjs` (new) is the JS twin of the backend's
  `road_key()` normalisation; the builder, the checker and the circularity
  proof all match by key.
- `scripts/eval/check-voice-eval.mjs` re-reads the fixture and refuses when its
  bytes no longer match the manifest's recorded `source_sha256` — the refusal
  was proven by corrupting the recorded sha and watching the check fail naming
  the announcement the backend owes. The source sha is over the fixture's
  LOGICAL bytes (LF-normalised), so it is the same value on CI and on Windows.
- `scripts/ci/check-parser-circularity.mjs` now matches held-out streets by key
  in either suffix spelling, case-insensitively: the old case-sensitive
  substring test on the keys never fired and proved nothing (its own fixture
  test now catches the "Zulu Street" template for real).
- `scripts/eval/__tests__/build-heldout-streets.test.mjs` was rewritten against
  the committed source (the old "regenerate from the real LINZ dir" leg failed
  on a machine with a newer revision — the founder named it), and the three
  unused fixture LINZ files were deleted with the rewrite.
- The manifests were regenerated: the main manifest has 720 scripts / 240
  addresses on non-held-out streets, `manifest/heldout/` has 720 scripts on
  held-out streets only, and `check-voice-eval.mjs` is sound in both
  directions.

**No voice tuning has used any street of this list** (confirmed 2026-11-09):
the BUG-277 hotword export has not been fed to any STT run, and every
measurement so far reads the eval set rather than fitting it. When the
biasing lane runs, the held-out keys are excluded from its vocabulary.

**Told to the backend (in `docs/log/CURRENT.md`):** its list is now the shared
one, and it must never change it without announcing the change in
`docs/log/CURRENT-backend.md` — this lane's gate refuses on the silent change.

Exact commands (run from the repository root, all green on 2026-11-09):

```
node scripts/eval/build-heldout-streets.mjs
node scripts/eval/build-voice-eval.mjs
node scripts/eval/build-voice-eval.mjs --heldout
node scripts/eval/check-voice-eval.mjs
node scripts/eval/check-voice-eval.mjs --heldout
node scripts/ci/check-parser-circularity.mjs
node --test "scripts/*/__tests__/*.test.mjs"   # 349 pass, 0 fail
```
## The numbers (re-derived, not trusted)

- LINZ rows (read-only from `..\courier\data\linz`):
  `addresses-christchurch.jsonl` 225 151 + `addresses-selwyn.jsonl` 194 752 +
  `addresses-waimakariri.jsonl` 236 141 = **656 044** address rows.
- Distinct `road` values: **6 799** streets. Held out: `floor(0.20 * 6799)` =
  **1 359** streets.
- `heldout_streets.json`: seed 20261108, fraction 0.2, total_streets 6799,
  held_out_count 1359, generated 2026-11-08,
  **sha256 `8230c5cbfe02ef5df6840426d8b70d58b590c3e07438e403d22971b82b229991`**.
- Of the old 240-address bank, **62** were on held-out streets; the regenerated
  main manifest has **0** held-out-street addresses (checked below).

## Exact commands and their output (run in the worktree, 2026-11-08)

```
# 1. the committed list, generated for real from the main worktree's LINZ
#    (READ-ONLY; the worktree has no data/linz of its own):
$ node scripts/eval/build-heldout-streets.mjs --linz-dir ..\courier\data\linz
held-out streets: 1359 of 6799 streets (seed 20261108, fraction 0.2) -> packages/eval/voice/manifest/heldout_streets.json (sha256 8230c5cbfe02ef5df6840426d8b70d58b590c3e07438e403d22971b82b229991)

# 2. determinism: a second run to another path is byte-identical, and equals
#    the committed file:
$ node scripts/eval/build-heldout-streets.mjs --linz-dir ..\courier\data\linz --out <tmp>/ev-run-a.json
$ node scripts/eval/build-heldout-streets.mjs --linz-dir ..\courier\data\linz --out <tmp>/ev-run-b.json
double run byte-identical: true
committed == run-a: true
(both runs print sha256 8230c5cbfe02ef5df6840426d8b70d58b590c3e07438e403d22971b82b229991)

# 3. the manifests (default excludes held-out streets; --heldout emits only them):
$ node scripts/eval/build-voice-eval.mjs --linz-dir ..\courier\data\linz
voice eval: 720 scripts, 960 planned files, 240 addresses, 12 slices -> packages/eval/voice/manifest
$ node scripts/eval/build-voice-eval.mjs --linz-dir ..\courier\data\linz --heldout
voice eval (held-out streets only): 720 scripts, 960 planned files, 240 addresses, 11 slices -> packages\eval\voice\manifest\heldout

# 4. the integrity checks, both directions:
$ node scripts/eval/check-voice-eval.mjs
the voice evaluation set is sound: 720 scripts, 960 planned files (600 built from open data), 240 addresses, the held-out manifest is sound too (720 scripts on held-out streets only)
$ node scripts/eval/check-voice-eval.mjs --heldout
the voice evaluation set is sound: 720 scripts, 960 planned files (0 built from open data), 240 addresses

# 5. the parser-circularity gate, now also over the held-out streets:
$ node scripts/ci/check-parser-circularity.mjs
check-parser-circularity: 11 standing overlaps, all in the baseline - the intent number is a ceiling on its own templates until the held-out set exists
check-parser-circularity: 1359 held-out streets checked - no held-out-street text in the gold templates or the parser regexes

# 6. the tests:
$ node --test "scripts/eval/__tests__/build-heldout-streets.test.mjs"
ℹ tests 5  ℹ pass 5  ℹ fail 0
$ node --test "scripts/eval/__tests__/heldout-gates.test.mjs"
ℹ tests 6  ℹ pass 6  ℹ fail 0
$ node --test "scripts/*/__tests__/*.test.mjs"
ℹ tests 337  ℹ pass 334  ℹ fail 0  ℹ skipped 3   (the 3 skips are pre-existing, not ours)

# 7. the split itself, verified against the committed list:
old bank addresses on held-out streets: 62 of 240
new bank addresses on held-out streets: 0 of 240
heldout/ addresses all on held-out streets and tagged held_out: true (240/240)
heldout/ scripts all tagged held_out: true (720/720)
```

## Red first (PLAYBOOK §14)

Before the generator and the checker exports existed, the two new test files
were run and failed:

```
$ node --test "scripts/*/__tests__/*.test.mjs"
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
'C:\Users\DCL\projects\courier-voice-wt\scripts\eval\build-heldout-streets.mjs' imported from
  ...\scripts\eval\__tests__\build-heldout-streets.test.mjs
SyntaxError: The requested module '../check-voice-eval.mjs' does not provide an export named 'collectProblems'
ℹ pass 323  ℹ fail 2     (the 2 failures are exactly the two new test files)
```

After the implementation: 334 pass, 0 fail (above). The
`check-parser-circularity` held-out proof was red first too: before the
extension, the temp-tree case "the builder spells out a held-out street" exited
0; after, it exits 1 and names the street.

## Regeneration (exact commands)

```
node scripts/eval/build-heldout-streets.mjs --linz-dir ..\courier\data\linz   # from this worktree
# (in the main worktree, plain: node scripts/eval/build-heldout-streets.mjs)
node scripts/eval/build-voice-eval.mjs --linz-dir ..\courier\data\linz        # main manifest (held-out excluded)
node scripts/eval/build-voice-eval.mjs --linz-dir ..\courier\data\linz --heldout  # manifest/heldout/
node scripts/eval/check-voice-eval.mjs                                        # both directions
```

---

## Measurement 2026-11 (real STT output)

**Date:** 2026-11-10. **Lane:** the VOICE MEASUREMENT sub-agent, worktree
`C:\Users\DCL\projects\courier\.worktrees\voice-measure`, branch
`voice/heldout-measure`, from `origin/main` `9516c97` (PR #278). **PR:**
voice(eval): measured on the shared held-out list — real STT output,
per-target PASS/FAIL.

**The rule this measurement works to** (founder directive 2026-11-08 item 4 +
the 2026-11-09 PART B instruction, and BUG-210's honesty rules): every number
below is read off the recognizer's OWN output — `per_utterance.csv`'s
`hypothesis` column — never off the gold text, and no slice the run could not
measure is ever averaged into a headline. The gold-text legs are still
published, labelled as what they are: the parser ceiling on the generator's
own templates (BUG-210).

### The exact commands

```
# 0. the open data, ONCE, into the worktree (data/ is git-ignored):
node scripts/eval/fetch-open-voice-data.mjs
#    data/voice/common-voice/clips.jsonl   280 clips (140 New Zealand English,
#                                        140 other English accents),
#    data/voice/noise/noise.jsonl         8 MUSAN beds (CC-BY 4.0),
#    data/voice/stt/...tar.bz2            the judge archive (118,071,777 bytes).
#    Every clip's sha256 is re-verified against the file on disk on every run.
#    The Hugging Face datasets-server answered HTTP 502 on some pages of the
#    Common Voice scan; the fetcher is restartable (it keeps a scan cursor), so
#    the lane re-ran it until the pool was complete (nz 40 -> 140, mix 140).

# 1. the MAIN manifest (the results committed there were pre-#279 and stale):
uv run --directory services/courier-voice --extra eval python -m app.eval_audio \
  --manifest packages/eval/voice/manifest --data data/voice \
  --out packages/eval/voice/results/utterances

# 2. the HELD-OUT manifest (every headline number of the held-out set):
uv run --directory services/courier-voice --extra eval python -m app.eval_audio \
  --manifest packages/eval/voice/manifest/heldout --data data/voice \
  --out packages/eval/voice/results/heldout-utterances
```

Both runs transcribed 600 of 600 utterances: 11:54:00 → 12:14:11 (main) and
12:17:59 → 12:37:54 (held-out) on 2026-11-10, ~20 minutes of judge pass each,
with the progress logged every 50 utterances.

### The environment (`results/heldout-utterances/environment.json`)

| field | value |
| --- | --- |
| judge | sherpa-onnx whisper tiny.en (Whisper weights MIT, sherpa-onnx runtime Apache-2.0) |
| judge_model | https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-tiny.en.tar.bz2 |
| sample_rate | 16000 |
| normalisation | lower-case, diacritics folded, punctuation dropped, whitespace collapsed |
| resampling | linear 48 kHz → 16 kHz (the clips as the mirror serves them) |
| python | 3.12.15 |
| platform | Windows-11-10.0.26300-SP0 |
| manifest | packages/eval/voice/manifest/heldout |
| held_out_streets | 1360 |
| clips / beds | 280 / 8 |

### The per-target table, measured on the HELD-OUT set

Every value is a row-level measurement of that run's `per_utterance.csv`, and
each one was recomputed by an INDEPENDENT script from the same CSV and agreed
with `summary.json` to the last digit (the scorer is not its own witness).

| target | the slice the number came from | measured (real STT output) | budget | verdict |
| --- | --- | --- | --- | --- |
| quiet WER | `en_nz_quiet`, 120 utterances | **14.75 %** | ≤ 5 % | **FAIL** |
| van WER | `en_nz_van`, 360 utterances (0 dB 36.88 %, 5 dB 26.12 %, 10 dB 21.07 %) | **28.02 %** averaged over 0/5/10 dB | ≤ 10 % | **FAIL** |
| intent accuracy on STT output | the 3 slices with STT output: `en_nz_quiet` 5/120, `en_nz_van` 0/360, `en_mix` 5/120 | **1.67 %** (10/600) | ≥ 95 % | **FAIL** |
| address extraction, exact match | the same 3 slices: 75 address-bearing scripts, 0 of their hypotheses carried an address | **0 / 75 = 0.00 %** | ≥ 95 % | **FAIL** |
| false-action rate | the open slices, 600 transcribed utterances | **0 / 600 = 0.00 %** | ≤ 0.5 % | **PASS** |
| corrections ("seven no seventeen") | `numbers_corrections` — no audio in this run | **not measured** | ≥ 95 % | **NOT MEASURED** |
| p95 latency | the device leg (EVAL.md M6) | **not measured** | ≤ 700 ms | **NOT MEASURED** |

The courier-mix slice (`en_mix`, 120 utterances) measured 15.30 % WER and 5/120
intent on the same run; it is reported beside the quiet slice rather than
averaged into it.

**Why the two FAILs on the acoustic side are not a product verdict.** The WER
leg measures the SET: the open speakers' own sentences read by a tiny CPU judge
(Whisper tiny.en, 16 kHz, linear-resampled). It is the bar the set itself sets,
not our pipeline — the product's own STT is M1 on the device and is listed
below as unmeasured. The lever is the on-device engine plus the contextual
biasing, not this judge.

**Why the intent and address FAILs are not a product verdict either.** On the
open-data slices the speakers speak their OWN sentences
(`per_utterance.csv`'s `gold_text`), not the manifest script, so the parser
never sees a command and an address never reaches it — 0 of 75 address-bearing
hypotheses carried an address at all. The lever is the audio: synthesise the
command scripts (the TTS licence ledger, D24) or drive the audio-injection path
(the 2026-11-08 research, option C), and M3/M2 become measurable on commands.

### What the run proves about the held-out set itself

- `held_out: true`, `held_out_utterances: 600`, `held_out_scripts: 720`,
  `held_out_streets: 1360`, `street_key_check: clean`
  (`results/heldout-utterances/summary.json`).
- The scorer reads the SHARED list
  (`packages/eval/voice/manifest/heldout_streets.json`, the one
  `scripts/eval/check-voice-eval.mjs` reads) by street key — the Python twin of
  `scripts/eval/street-key.mjs` — and REFUSES a manifest whose rows disagree
  with it, naming the row. Cross-language check over the 204 distinct streets
  of both manifests: 0 disagreements between the JS and the Python key.
- Every scored row carries its tag in `per_utterance.csv`, so the CSV itself
  proves which set the numbers came from.
- The parser ceiling on the HELD-OUT gold text (a ceiling, never an accuracy,
  BUG-210): `en_nz_quiet` 120/120, `en_nz_van` 120/120, `en_mix` 120/120,
  `mi_places` 60/60, `chatter` 40/40, `code_switch` 45/60, and 0/40 for `ar`,
  `hi_pa`, `zh`, `sm_to` (an English catalogue, reported "not supported
  offline") and `numbers_corrections` 0/40 (the named parser gap). With the
  mandatory slots: `en_nz_quiet` 120/120, `mi_places` 44/60, `code_switch`
  30/60.

**What the two runs do and do not add to each other.** The clip assignment is
by utterance id, and both manifests lay their 600 open rows out in the same
order with the same pool, so the held-out run transcribed the SAME 600 files
(verified: 600 of 600 ids mapped to the same clips), which is why the WER
numbers are identical to the main run's. The WER leg is the set's own
acoustic difficulty, measured ONCE — it is not independent evidence about
held-out streets, and the held-out run does not claim it as such. What the
held-out run adds is real: its scripts speak held-out streets, so its intent,
address and ceiling legs are evidence about streets the parser has never been
tuned on, and `check-parser-circularity` proves no held-out street is spelled
in the gold templates or the parser regexes.

### Coverage: what is in the audio and what is not

- **Built from open data and measured:** 600 utterances — `en_nz_quiet` 120,
  `en_nz_van` 360 (0/5/10 dB, 120 each), `en_mix` 120. Speakers: 480 rows from
  New Zealand English clips and 120 from the other English accents of the
  courier mix (US 73, England 20, NZ+England 17, Canadian 12, Australian 5,
  Scottish 4, Irish 3, plus mixed-accent labels). The NZ accent mix IS covered.
- **Text side complete, no audio (never measured, never averaged in):**
  `mi_places` 60 (te reo Māori place names), `ar` 40, `hi_pa` 40, `zh` 40,
  `sm_to` 40, `numbers_corrections` 40, `code_switch` 60, `chatter` 40. The
  TTS slices need the project's own voices in the licence ledger first (D24).
  `ar`/`hi_pa`/`zh`/`sm_to` are additionally "not supported offline" — the
  offline brain's catalogue is English — so their 0 % is a fact about the
  parser, never a measured accuracy and never part of a headline.

### Fully offline — how it is proven

1. **The scorer opens no socket.** The only URL in `app/eval_audio.py` is the
   `JUDGE_MODEL_URL` constant, which is published with the result and never
   fetched: the fetcher (`scripts/eval/fetch-open-voice-data.mjs`) is the single
   download path, and `ensure_judge` only UNPACKS a local archive.
2. **The whole scorer ran with the network dead.** With
   `HTTP_PROXY`/`HTTPS_PROXY`/`ALL_PROXY` all pointing at `http://127.0.0.1:9`
   (a closed port), the same command on a 2-utterance manifest completed in
   2.8 s and wrote the five result files. A single request would have failed.

### The honest unmeasured legs

| leg | why it is not measured |
| --- | --- |
| M1 on OUR pipeline | the product's own STT runs on the phone; the WER here is the set's open speakers read by the pinned judge |
| M2 on the product's address engine | what is measured is the offline brain's `raw_address` on the judge's hypotheses; the D8/nz-address engine is the device leg |
| M3 on commands | the open-data audio speaks the speakers' own sentences; the command scripts have no audio (D24) |
| M4 / M5 (wake word) | the non-speech corpus and the wake phrases need the device |
| M6 (latency, p95 ≤ 700 ms) | the phone's own path; the shift-sim harness's service p95 is published as 0.0 ms, which is `time.monotonic()`'s resolution on this box (a 1000-iteration loop measures 0.0 ms while `perf_counter` answers 1.1 µs), not a measurement of the service |
| M7 (battery) | measured on a device |
| M8 (TTS intelligibility) | the synthesised audio needs the TTS voices, whose licence ledger is pending |
| the founder's real-sentence set (ADR-028 / D65) | it still does not exist, so §22 B is NOT claimed tuned |

### The numbers the lead can lift into `docs/status/FINAL_REPORT.md`

```
voice, held-out street set, measured 2026-11-10 from real STT output
(sherpa-onnx whisper tiny.en, 16 kHz, 280 open clips + 8 MUSAN beds,
Windows-11, Python 3.12.15):

  built from open data and measured   600 utterances (en_nz_quiet 120,
                                      en_nz_van 360 at 0/5/10 dB, en_mix 120)
  quiet WER                           14.75 %   (target <= 5 %)   FAIL
  van WER (0/5/10 dB averaged)        28.02 %   (target <= 10 %)  FAIL
  courier-mix WER                     15.30 %
  intent accuracy on the STT output   1.67 % (10/600)  (target >= 95 %)  FAIL
  address extraction, exact match     0.00 % (0/75; 0 hypotheses carried an
                                      address)     (target >= 95 %)  FAIL
  false-action rate on open speech    0.00 % (0/600) (target <= 0.5 %) PASS
  corrections ("seven no seventeen")  NOT MEASURED (the slice has no audio)
  p95 latency                         NOT MEASURED (the device leg)
  parser ceiling on held-out gold text 120/120 on the three English slices,
                                      60/60 mi_places, 45/60 code_switch -
                                      a CEILING on its own templates, not an
                                      accuracy (BUG-210)
```

CI covers the voice suite (the scorer's own tests) and `check-voice-eval` over
both manifests; the 40 minutes of judge pass are not a CI job. The run ids are
recorded with the PR.
## Honest notes

- `utterances.jsonl` is byte-identical after the regeneration (the BUG-210
  build-state guard rides by utterance id); `addresses.jsonl`, `scripts.jsonl`
  and `slices.json` changed (62 bank addresses moved off held-out streets, so
  the scripts that speak them changed with them). The committed per-utterance
  **results** in `packages/eval/voice/results/utterances/` were produced against
  the pre-split manifest; re-running `app.eval_audio` against the new manifest
  is the voice lane's next step, and until then those result files are stale
  with respect to `scripts.jsonl` — the integrity checks pin the manifest, not
  the results.
- `services/courier-voice/app/offline_brain.py` carries "57 Poulson Street,
  Addington" in two docstring examples (the old A001 of the bank, now a
  held-out street). That is prose in a docstring, not a regex: the circularity
  gate scans the builder (whole file) and the brain's `pattern=re.compile`
  sources, and both are clean of held-out-street text. Cleaning the docstring
  example is out of this lane's ownership (services/courier-voice is a later
  lane's path for this task) and is recorded here instead.
- Until the founder's real-sentence set (ADR-028 / D65,
  `docs/status/FOUNDER_TODO.md`) exists, the §22 B threshold
  (`VOICE_ASK_CONFIDENCE_BAR`) is NOT claimed tuned, and BUG-210's headline
  intent number remains the parser ceiling on the generator's own templates.
- No BUG number was taken (checked `docs/status/BUGS.md` on origin/main, every
  origin branch via `git ls-remote origin`, and `docs/log/CURRENT-backend.md`:
  no BUG-300..349 row exists; this task needed none).
