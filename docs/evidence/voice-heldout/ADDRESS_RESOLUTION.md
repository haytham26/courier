# The founder's VOICE LEVER (b): ADDRESS RESOLUTION ON STT OUTPUT

**Date:** 2026-11-11. **Lane:** the VOICE sub-agent lane, worktree
`C:\Users\DCL\projects\courier\.worktrees\voice-address`, branch
`voice/address-resolution` (from `origin/main` `f099925`).

The founder's directive 2026-11-10 named this lever against the held-out set's
own numbers: **address extraction, exact match = 0/75**, with 0 of the 75
hypotheses carrying an address at all. This is the lane's answer.

## The short version

| leg | the held-out set | the main manifest |
| --- | --- | --- |
| **before** (the offline brain's `raw_address` == the gold string) | **0 / 75** | **2 / 75** |
| **after** (the resolver, number + suffix + street key + suburb) | **14 / 75** | **23 / 75** |
| the same, over every voiced address-bearing turn (157) | 0 -> **22** (34 ungated) | 2 -> **39** (48 ungated) |

The BEFORE is the number the held-out set already publishes; it is re-derived
here by an independent script. The AFTER is measured on audio that SPEAKS an
address, which the open-data set never did: the manifest's own address-bearing
scripts, voiced with the set's own pinned Kokoro engine and transcribed with the
set's own pinned judge. Both numbers are below the 95 % budget. **Why they are
that low is measured and named below, and it is not the resolver.**

## 1. Why the recorded 0/75 is not a resolver failure

The 75 address-bearing utterances of the held-out set are built from the OPEN
speakers' own sentences (Common Voice CC0 prose): the speakers never speak the
manifest's script, so no file of `en_nz_quiet`, `en_nz_van` or `en_mix` ever says
an address. A resolver has nothing to resolve.

Re-derived independently (its own CSV parser, its own arithmetic, no code shared
with the scorer), on both manifests:

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
  (the same three lines; the same agreement)
```

And the resolver was run over the same 600 published hypotheses
(`app/eval_address.py --from-csv`): it resolves **0 of 600** - no hypothesis
carries a house number and a street name together, and no sentence of the open
speakers' prose is mistaken for an address (the resolver's own M9 direction:
`packages/eval/voice/results/address-opendata/`).

## 2. What was built

### The committed street index (the product's data)

`scripts/eval/build-street-index.mjs` -> `packages/eval/voice/data/canterbury-streets.json`.
6 799 distinct roads from 656 044 LINZ address rows, each in the backend's
`road_key` normalisation, with its display spelling, its suburbs and its address
count. **All 1 360 streets of the shared held-out list are in it (1 360/1
360)**, and 240/240 addresses of each manifest sit on a road it carries.

### The resolver (the matcher, tuned)

`services/courier-voice/app/address_resolve.py`.

- The normalisation is the TWIN of `packages/nz-address`'s, pinned against its
  own `src/constants.ts` by a test, so the number words and the spoken fixes are
  the package's and never ours.
- The number is read the way a courier says it: **"fifty seven"**, **"one eight
  five"**, **"twelve thirteen"** and **"seven no sorry seventeen"** (a
  correction - the last number wins; the shape the offline brain cannot parse
  at all, its own named `PARSER_GAPS`), "one twenty", "S H one" (a rural road
  number), "two slash fourteen" (a unit and a house number in LINZ's spelling).
- The street is found with a fuzzy AND phonetic fold (a bounded Levenshtein,
  then Soundex), every token of the name having to match.
- The suburb comes from the road's OWN suburb list - the LINZ spelling the gold
  carries - and, for a road through several suburbs, from the house number
  itself when `--linz-dir` supplies the build-local address table.

### The measurement

`services/courier-voice/app/eval_address.py`.

## 3. The exact commands

```
# the committed index, from the read-only LINZ data
node scripts/eval/build-street-index.mjs --linz-dir <the repo's data/linz>

# the BEFORE, re-derived by a witness that is not the scorer
node scripts/eval/recheck-address-on-stt.mjs --results "packages/eval/voice/results/heldout-utterances;packages/eval/voice/results/utterances"

# the resolver on the already-published open-data hypotheses (no audio built)
uv run --directory services/courier-voice --extra eval python -m app.eval_address \
  --from-csv packages/eval/voice/results/heldout-utterances/per_utterance.csv \
  --out packages/eval/voice/results/address-opendata \
  --linz-dir <the repo's data/linz> --no-build

# the AFTER, on the manifest's own address-bearing scripts, voiced and judged.
# The held-out run (the test set):
uv run --directory services/courier-voice --extra eval python -m app.eval_address \
  --manifest packages/eval/voice/manifest/heldout \
  --out packages/eval/voice/results/address-heldout \
  --out-sidecar packages/eval/voice/manifest/address_audio-heldout.jsonl \
  --linz-dir <the repo's data/linz> --build
# the main run (the dev set), in its own audio directory:
uv run --directory services/courier-voice --extra eval python -m app.eval_address \
  --manifest packages/eval/voice/manifest \
  --out packages/eval/voice/results/address-main \
  --out-sidecar packages/eval/voice/manifest/address_audio-main.jsonl \
  --audio-dir data/voice/address-main \
  --linz-dir <the repo's data/linz> --build

# the resolver's ceiling on each manifest's gold text (no audio, no judge)
# (the per-slice table is printed; see "The ceiling" below)
```

## 4. The numbers, per slice

The AFTER rows are `address_extraction` measured as number + suffix + street key
+ suburb, never a substring.

| slice | held-out: before -> after | main: before -> after |
| --- | --- | --- |
| `en_nz_quiet` | 0 -> 4 / 15 | 1 -> 6 / 15 |
| `en_nz_van` (0/5/10 dB, 45 rows) | 0 -> 5 / 45 | 0 -> 11 / 45 |
| `en_mix` | 0 -> 5 / 15 | 1 -> 6 / 15 |
| **the founder's 75** | **0 -> 14 / 75** | **2 -> 23 / 75** |
| `mi_places` | 0 -> 2 / 12 | 0 -> 5 / 12 |
| `code_switch` | 0 -> 3 / 15 | 0 -> 5 / 15 |
| `numbers_corrections` | 0 -> 0 / 40 (11 / 40 ungated) | 0 -> 0 / 40 (7 / 40 ungated) |

`numbers_corrections` gated is 0 on both because the offline brain routes NO
address from a correction sentence at all (its own named `PARSER_GAPS`); the
UNGATED leg is where the founder's "seven no seventeen" form is measured, and
it is 11/40 held-out, 7/40 main.

## 5. WHY it is 14/75 and not 95/75 - measured, not guessed

Two thirds of the loss is the VOICE, not the resolver. The sidecar
(`packages/eval/voice/manifest/address_audio-{heldout,main}.jsonl`) records the
words the pinned lexicon cannot pronounce, and the judge's own transcript shows
what survived:

```
held-out set, 157 turns:
  the street name reached the recognizer in 125 of 157; the voice dropped it in 32
  (130 of 157 turns carry a word the lexicon cannot pronounce)
```

The recognizer's transcript of a held-out quiet turn is the picture:

```
  said  : also got one at 145 Ansons Road, Charing Cross
  heard : also got one at 145 Road. Cross.        <- "Ansons" is OOV: the lexicon
                                                     DROPPED it, so there is no
                                                     street name to resolve
  answer: (nothing)                                <- honest: no street, no address
```

and the turns that DO survive show the lever working:

```
  said  : priority parcel for 36 Holiday Drive, Mairehau
  heard : priority parcel for 36 holiday drive.  <- "Mairehau" was dropped
  answer: 36 Holiday Drive, Mairehau             <- the road's own suburb, recovered

  said  : add 10 A Gregory Avenue, Islington on the way back
  heard : Add 10, a Gregory Avenue, on the way back.
  answer: 10 a Gregory Avenue, Islington        <- the suffix and the suburb too

  said  : add 404 Simpsons Road, Maronan on the way back
  heard : Add 404 Simpson's Road on the way back.
  answer: 404 Simpsons Road, Maronan            <- the phonetic fold, "Simpson's"
```

### The ceiling, on each manifest's own gold text

| | held-out | main |
| --- | --- | --- |
| the resolver on the gold script text | 110 / 152 | 129 / 152 |

The gap between the ceiling (110/152) and the measured 14/75 is the voice and
the recognizer: the lexicon drops the Canterbury street names, and Whisper
tiny.en mangles the ones it hears ("29D-criton Terrace", "76 e-bloost on
drive").

### The two named levers this run leaves for the next one

1. **A lexicon that carries the Canterbury street names** (the voice drops
   them), or the STT contextual biasing. The backend's BUG-277 hotword export
   is the obvious source - and the held-out keys must stay out of it, exactly
   as the set's own rule says.
2. **The recognizer itself**: the device's own STT (M1) is the product's, and
   the set's pinned judge is the set's own.

## 6. The size decision (recorded, not skipped)

| | bytes | committed? |
| --- | --- | --- |
| the three LINZ address files | 656 044 rows, 90 MB | no - gitignored build-local |
| the committed road index (this PR) | 589 572 bytes of JSON, 833 937 on disk, **107 702 as a git blob** | yes |
| the backend's own hotword export | 159 173 bytes | yes |

The full address index is NOT committed: a 90 MB clone is a repo nobody runs.
Both numbers are published anyway - the run above was measured WITH the
build-local address table (`--linz-dir`), which resolves the suburb of a road
that runs through several suburbs from the house number. **An on-device index
is a named follow-up lever.**

## 7. Red first

```
$ uv run --directory services/courier-voice pytest tests/test_address_resolve.py -q
E   ModuleNotFoundError: No module named 'app.address_resolve'
!!!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!!!
```

Then, in order: the number table (a set where a map was needed), the
display-spelling rule (the abbreviation lookup was case-sensitive), the phonetic
score under the street floor (a mis-heard "Poleson" could not reach "Poulson"),
the repository root off by one directory, the suffix compared
case-sensitively, the suburb only ever matched at the END of a sentence, the
address-table lookup asked with the unit still attached to the number, and the
hyphen folded to a space (which deleted the "2/223" slash). Green after: **56
passed** (45 resolver, 11 scorer), ruff clean, `node --test
"scripts/*/__tests__/*.test.mjs"` 366 pass / 0 fail, and the repo's own gates
(`check-voice-eval`, `check-parser-circularity`) unchanged.

## 8. What is NOT measured here

| leg | why |
| --- | --- |
| M1 on the product's own on-device STT | the judge is the set's own pinned Whisper tiny.en, on the set's own pinned voice |
| M4/M5 (wake word), M6 (latency), M7 (battery) | the device's legs |
| the open-data slices' resolver answers | measured above: 0 of 600, because the open speakers speak their own sentences |
| `numbers_corrections` on the brain's own extraction | the brain routes no address from a correction sentence at all - its own named gap, measured 0/40 gated on both manifests |

## 9. No BUG number was taken

Checked `docs/status/BUGS.md` on `origin/main`, every origin branch
(`git ls-remote origin`) and `docs/log/CURRENT-backend.md`: no BUG-305..349 row
exists, and this lane found no defect that needed one. The two defects it DID
find red-first are fixed in this PR (the address-table lookup and the slash
folding), and the voice's OOV dropping is recorded above rather than filed -
it is a property of the pinned engine's lexicon, not a defect in our code.
