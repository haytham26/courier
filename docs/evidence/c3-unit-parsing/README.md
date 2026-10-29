# Evidence — C3's parser slice: a unit that carries a letter before a slash

Run locally (Python 3.11, the API's own venv, no Docker) against the branch
`c3-linz-measure` from `origin/main`. The D8 engine's accuracy on the real LINZ
data is measured in `docs/evidence/phase-2.3/linz-accuracy.md` — **96.9 %
(1745/1800)** against 656,044 real addresses — and C3's target is ≥ 98 %, so the
gap is 55 answers. This slice is the first of the measure/fix/re-measure loop
C3 asks for.

## What the report names

Three of the failures it prints are the same defect:

```
[christchurch] canonical: None != '255C/28 Cathedral Square Christchurch Central Christchurch'
[waimakariri] canonical: '87 Kilmore Street Christchurch Central Christchurch' != '4D/87 Kilmore Street Christchurch Central Christchurch'
```

## The defect, read from the code

`services/api/app/nz_address.py`'s `parse` matched the address head with
`(\d+[a-z]?)(?:\s*/\s*(\d+[a-z]?))?`, and then — for a unit taken from the **left
of a slash** — split `255c` into unit `255` + suffix `C`. So:

| Input | Before | After |
|---|---|---|
| `255C/28 Cathedral Square …` | unit `255`, number `28`, suffix `C` | unit `255c`, number `28`, no suffix |
| `4D/87 Kilmore Street …` | unit `4`, number `87`, suffix `D` | unit `4d`, number `87`, no suffix |
| `D/87 Kilmore Street …` | **nothing** (unit and number both `None`) | unit `d`, number `87` |

The letter-only unit did not parse at all because `(\d+[a-z]?)` requires at least
one digit.

## Why the split was wrong there and right elsewhere

R23's rule — "unit 255C is unit 255 with suffix C" — is correct for the **spoken**
form (`unit 255C 28 …`), where the letter is a suffix the driver says. It is wrong
for the **slash** form, where `4D` is the flat's own name: splitting it answers
`4/87`, which is not an address that exists. The fix keeps R23 for the spoken form
and stops the split for a unit that came from the left of a slash
(`nz_address.py:240` now requires `not unit_is_a_slash_unit`), and widens the
pattern so `d` and `4d` both match.

## Red first, and green after

`services/api/tests/test_unit_addresses.py`, six assertions. Before the fix:

```
FAILED tests/test_unit_addresses.py::test_a_unit_with_a_letter_before_the_slash_stays_whole
FAILED tests/test_unit_addresses.py::test_a_unit_of_letters_only_parses
FAILED tests/test_unit_addresses.py::test_a_flat_with_a_letter_before_the_slash_stays_whole
3 failed, 3 passed
```

The three that passed are the behaviours that must not regress: the digits-only
unit `2/14`, the spoken form `unit 255C 28 …` (still unit 255 + suffix C), and the
plain number suffix `42B`. After the fix: **6 passed**, and the whole API suite
**444 passed** with `ruff` and `mypy` clean.

## What this proved, and what it did not

**Proved:** the three named forms now parse to the shape the report says the real
answer has, and no existing behaviour moved.

**Not proved here:** the accuracy number, which needs `data/linz` (656,044 real
addresses) that only the founder can supply — a FOUNDER_TODO item, and the reason
the loop's next round runs on the founder's machine. This slice is a fix made
against the failures the *existing* measurement printed, so the re-measure is the
loop's next step and not a claim this folder can make.

## The runs, verbatim

### Before the fix (the red)

\\nFAILED tests/test_unit_addresses.py::test_a_unit_with_a_letter_before_the_slash_stays_whole
FAILED tests/test_unit_addresses.py::test_a_unit_of_letters_only_parses
FAILED tests/test_unit_addresses.py::test_a_flat_with_a_letter_before_the_slash_stays_whole
3 failed, 3 passed
\\n
### After the fix (the green)

\\n6 passed in 0.04s
\\n
