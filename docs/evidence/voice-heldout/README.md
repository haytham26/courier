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
