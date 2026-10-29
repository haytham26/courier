# The mutations — proof the tests bite (A1's backend half)

Two tests in this slice were called vacuous by the fresh-context review: they compared strings and
never called the code they claimed to prove. Both were rewritten, and both were then **mutated** to
prove the new versions fail when the behaviour they pin is broken. Each mutation was made, the suite
re-run, and the file restored immediately after (no mutation remains in the branch).

## Mutation 1 — the freshness gate that cannot fail

`services/api/scripts/generate_api_client.py`, `check()`:

```python
def check() -> int:
    return 0  # MUTATION: a gate that says green without checking
```

Result:

```
FAILED tests/test_api_client.py::TestTheGeneratedClient::test_a_deliberately_stale_client_fails_the_check
1 failed, 3 passed in 0.49s
```

After restoring the file: `4 passed`. The test now runs `check()` itself against both a stale file and
a fresh one, and asserts `1` and `0` respectively — so it fails the day the gate stops
discriminating.

## Mutation 2 — the 409 that became a 500

`services/api/app/main.py`, the demo endpoint's conflict handler:

```python
    except DemoDayConflictError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error  # MUTATION
```

Result:

```
FAILED tests/test_demo_seed.py::TestTheRaceWithOneself::test_a_seed_onto_a_shift_that_already_has_a_run_is_409
1 failed, 23 passed, 1 deselected in 3.31s
```

After restoring the file: `24 passed`.

## Why the two are worth the record

A test that passes when its feature is deleted is not evidence. These two were the only tests in the
review's crosshairs; every other assertion in this slice fails against a mutated or deleted feature
by construction (the gate tests assert `repo.runs == {}` after a refused seed, the round-trip test
reads through the API's own authz-checked endpoints, and the db test reads rows that only the SQL
path writes).
