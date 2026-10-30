# Evidence — C3's third parser slice: a number word in a road's name

Run locally (Python 3.11, the API's own venv, no Docker) against the branch
`c3-road-name-numbers` from `origin/main`.

## The defect the LINZ report names

```
[christchurch] spoken: None != '928 Two Chain Road Swannanoe Swannanoe'
```

`Two Chain Road` is the road's own name — "two" is one of its words, not the house
number the courier read. `_words_to_digits` walked the **whole** string, so
`928 two chain road swannanoe` became `928 2 chain road swannanoe`; the parser then
looked for a road called "2 Chain Rd", found none, and answered `suburb=None`.

## The fix

The run of number words is converted only while it is **leading**. The first token
that is not a number word ends the number, and everything after it stays exactly
as it was spoken. A leading "and" (the driver's hesitation) is skipped while the
run is still at the head.

Two attempts were needed, and both are recorded because the first is instructive:
an earlier version guarded with a `seen_a_number` flag, which never became true
for `928 Two Chain Road` because `928` is already a digit (so `buf` is empty) and
`two` still converted. The correct contract is positional — the number is at the
head — not a flag.

## The runs

### Red (before the fix)

```
FAILED tests/test_road_name_numbers.py::test_a_number_word_in_a_road_name_stays_a_word
1 failed, 2 passed
```

The two that passed are the contracts that must not move: `one four two Riccarton
road` → number 142, and `forty two B main north road` → 42 with suffix B.

### Green (after)

```
451 passed, 1 skipped, 18 deselected
ruff: All checks passed!
mypy: Success: no issues found in 26 source files
```

## What this did not prove

The accuracy number. Re-measuring needs `data/linz`, which only the founder can
supply (a FOUNDER_TODO item already recorded). The eval set's own
`docs/evidence/phase-2.3/linz-accuracy.md` is the measurement this fix is aimed at,
and the re-run of it is the loop's next step, not a claim this folder can make.
