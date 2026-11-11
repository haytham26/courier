# The founder's VOICE LEVER (b): ADDRESS RESOLUTION ON STT OUTPUT

**Date:** 2026-11-11. **Lane:** the VOICE sub-agent lane, worktree
`C:\Users\DCL\projects\courier\.worktrees\voice-address`, branch
`voice/address-resolution` (from `origin/main`). **PR:** voice(address): the
Canterbury street index, the resolver and the measurement that can move 0/75.

The founder's directive 2026-11-10 named this lever against the held-out set's
own numbers: **address extraction, exact match = 0/75**, with 0 of the 75
hypotheses carrying an address at all. This is the lane's answer, and the
honest part of it comes first.

## Why the recorded 0/75 is not a resolver failure - and what it is

The 75 address-bearing utterances of the held-out set are built from the OPEN
speakers' own sentences (Common Voice CC0 prose). The speakers never speak the
manifest's script, so no file of `en_nz_quiet`, `en_nz_van` or `en_mix` ever says
an address. A resolver has nothing to resolve, and the recorded number says
exactly that: 0 of 75 hypotheses carried an address at all.

Re-derived independently, with a script that shares no code with the scorer
(`scripts/eval/recheck-address-on-stt.mjs`, its own CSV parser and its own
arithmetic), from the committed results of BOTH manifests:

```
$ node scripts/eval/recheck-address-on-stt.mjs \
    --results "packages/eval/voice/results/heldout-utterances;packages/eval/voice/results/utterances"
packages/eval/voice/results/heldout-utterances:
  re-derived from per_utterance.csv: 0/75 exact,
    0 of their hypotheses carried an address at all
  per slice: {"en_nz_quiet":{"bearing":15,"exact":0,"with_an_address":0},"en_nz_van":{"bearing":45,"exact":0,"with_an_address":0},"en_mix":{"bearing":15,"exact":0,"with_an_address":0}}
  published in summary.json: 0/75 exact, 0 hypotheses carried an address
  agrees: true
packages/eval/voice/results/utterances:
  ... the same three lines, the same agreement ...
```

So the BEFORE leg is confirmed, on both manifests, by a witness that is not
the scorer. **The audio is the reason the number is zero, not the resolver.**

## What was built

### 1. The committed street index (the product's data)

`scripts/eval/build-street-index.mjs` -> `packages/eval/voice/data/canterbury-streets.json`:
the distinct road names of the three Canterbury LINZ address files, each in the
backend's `road_key` normalisation (the same `scripts/eval/street-key.mjs` the
manifest uses), with its display spelling, the suburbs the road runs through
and its address count, plus the abbreviation map.

- **6 799 distinct roads from 656 044 address rows** (0 rows without a full
  address), `sha256_of_keys fde3aad06575d76b1b5a7f7ed488857520251b4c3e58d99a31b969a26df60a3d`.
- Every one of the **1 360 streets of the shared held-out list** is in the index
  (checked: 1 360/1 360), and 240/240 addresses of EACH manifest sit on a road
  the index carries - so the held-out measurement is a measurement of what the
  resolver can do with the road list, never of a road it was fitted on.

### 2. The resolver (the matcher, tuned)

`services/courier-voice/app/address_resolve.py`. The normalisation is the twin
of `packages/nz-address`'s, pinned against its `src/constants.ts` by a test. The
number is read the way a courier says it. The street is found with a fuzzy AND
phonetic fold, every token of the name having to match. The suburb comes from
the road's own suburb list.

### 3. The measurement

`services/courier-voice/app/eval_address.py`: it voices the manifest's
address-bearing scripts with the set's own pinned Kokoro engine, transcribes
every file with the set's own pinned judge, and scores each hypothesis three
times (before, after gated, after ungated).

### 4. The independent witness

`scripts/eval/recheck-address-on-stt.mjs` (above).

## The size decision (recorded, not skipped)

| | bytes | committed? |
| --- | --- | --- |
| the three LINZ address files | 656 044 rows, **90 MB** | no - gitignored build-local |
| the compact road index (this PR) | 589 572 bytes of JSON, 833 937 bytes on disk, **107 702 bytes as a git blob** | yes |
| the backend's own hotword export | 159 173 bytes | yes |

The full address index is NOT committed: a 90 MB clone is a repo nobody runs.
What IS committed is the road list, which is what the fuzzy matcher needs. The
build-local full address table (the multi-suburb roads' house numbers, read
from `data/linz` at measurement time with `--linz-dir`) is measured with and
without, and both numbers are published below. **An on-device index is a named
follow-up lever**, not a silent skip.

## Red first

```
$ uv run --directory services/courier-voice pytest tests/test_address_resolve.py -q
E   ModuleNotFoundError: No module named 'app.address_resolve'
!!!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!!!
```

`tests/test_eval_address.py` ran after the resolver existed and failed on its
first honest-leg claim (a road through ONE suburb answers that suburb, so the
"no suburb was said" claim has to be made on a road through several). Green
after: **56 passed** (45 resolver, 11 scorer).

## What is NOT measured here

| leg | why |
| --- | --- |
| M1 on the product's own on-device STT | the judge is the set's own pinned Whisper tiny.en, on the set's own pinned voice |
| M4/M5 (wake word), M6 (latency), M7 (battery) | the device's legs |
| the open-data slices' resolver answers | measured below, but their audio speaks the speakers' own sentences, so the resolver has nothing to resolve |
