# Evidence — C3's parser slice: a road's direction word before the suburb

Run locally (Python 3.11, the API's own venv, no Docker) against the branch
`c3-linz-measure` from `origin/main`.

## The defect the LINZ report names

```
[christchurch] canonical: None != '193 Durham Street South Christchurch Central Christchurch'
```

`South` is the direction of Durham Street, spoken after the road's type; the
suburb that follows it is `Christchurch Central`, repeated with the city's name as
a courier says it. `nz_address.parse` built the road up to its type and handed the
whole tail — `south christchurch central christchurch` — to the suburb matcher,
which matched nothing, so the answer carried no suburb and was not complete.

## The fix

`ROAD_DIRECTIONS` is set aside from the tail before the suburb match, and kept on
the road. It is set aside **only when a suburb matches after it**: `South
Christchurch` is a suburb in its own right, and stripping it there would move the
suburb's name onto the road.

`central` is deliberately **not** a direction. In NZ it is far more often a
suburb's own name (`Central City`, `Christchurch Central`) than a road's, and
treating it as one produced a real regression that the existing
`test_address_correction.py` units-and-flats tests caught:
`Colombo St Central City Christchurch` answered "no known street called 'Colombo
St Central'". That regression is why the fix carries a condition rather than an
unconditional strip, and why the ambiguity is a test rather than a claim.

## The runs

### Red (before the fix)

```
FAILED tests/test_road_direction_suffix.py::test_a_direction_word_does_not_steal_the_suburb
FAILED tests/test_road_direction_suffix.py::test_the_suburb_is_found_after_the_direction_is_set_aside
2 failed, 2 passed
```

### Green (after)

```
9 passed in 0.05s
full suite: 448 passed, 1 skipped, 18 deselected
ruff: All checks passed!
mypy: Success: no issues found in 26 source files
```

## What this did not prove

The accuracy number. Re-measuring needs `data/linz`, which only the founder can
supply (a FOUNDER_TODO item already recorded), so this folder states the parser
behaviour it proved and nothing about the percentage.

One further defect the probe found and this slice deliberately does **not** fix,
because it is a different class: `_words_to_digits` converts a road's name too
eagerly — `928 Two Chain Road Swannanoe` parses the road as `2 Chain Rd`, because
"two" is a number word. That is recorded for the next slice rather than half-fixed
here.
