# The sync repo and route: the cursor, the transaction and the tenant (BUG-139, 140, 141, 142)

**Date:** 2026-11-01 · **Owner:** the backend squad (sync) · **Task:** C1's fix order — the mediums
that touch the sync repo and route are one slice, with the two LOW rows on the same code alongside.

## What was wrong

```
repo.py:  SELECT count(*) FROM delivery_events WHERE shift_id = :shift_id   # BUG-141: POD rows counted
main.py:  cursor = repo.cursor(shift_id)                                    # BUG-142: a third connection, after the commit
main.py:  run = repo.get_run_for_shift(shift_id); ... run.courier_id != ... # BUG-140: the owner is a Python line
main.py:  raise HTTPException(422, detail=f"stop {unknown[0]} is not in this run")  # BUG-139: one event named
```

## The fixes

**BUG-141 — the cursor is what the phone's sync writes.** It counts the shift's events of the kinds
the `events:batch` route writes (`delivered`, `skipped`, `deferred`, `failed`), so the POD route's
`pod_captured` rows no longer advance the counter the phone compares against its stored value. The
two repositories carry the same kind list; the mobile app sends no `pod_captured` through the sync
path (grep over `apps/mobile`), so the count is exactly the phone's own traffic.

**BUG-142 — the cursor is read in the batch's own transaction.** `append_events` reads the count on
the same connection as the INSERT and returns it as `AppendResult.cursor`; the route answers with it
instead of opening a third connection after the commit. A batch that commits between the INSERT and
a separate read can no longer be counted.

**BUG-140 — the owner is part of the lookup.** `get_run_for_shift(shift_id, courier_id)` binds
`AND courier_id = :courier_id` in the SQL repo and scans both predicates in the in-memory repo, so
the route's 404 is the store's answer rather than a second line of defence. All six call sites pass
the principal's id and the Python comparisons are gone.

**BUG-139 — the refusal names every offending event.** The whole-batch refusal is unchanged
(ADR-014 §3); the 422 detail now names every stop that is not in the run with its index in the
batch, so the caller can tell which of its events was the problem.

## One gate amended, with the reason recorded

BUG-142's fix adds one statement to the sync path — the cursor read, inside the batch's transaction,
on the same connection. BUG-063's cost gate pinned "the one statement", because the breach it names
(CI run 40185490916, p95 370 ms) was a pre-SELECT of the batch's ids on *every* sync. The gate was
amended once, with the reason recorded in the test's own docstring: the shape the breach was about —
work **outside** the batch's transaction on every sync — is still pinned, the comparison SELECT
still runs only on a partial refuse, the added statement is one round trip on the same connection,
and the sync's p95 is still gated at 300 ms by the Locust SLO profile that runs on every PR.

## Red first

Against `origin/main`'s modules (the fixed files restored from a temp copy afterwards, per
PLAYBOOK §10):

```
=== the route tests ===
FAILED test_the_refusal_names_every_event_it_refused
  - AssertionError: assert '82a46342-...' in 'stop 156e60de-... is not in this run'   # one event named
FAILED test_a_run_of_another_courier_is_not_found_by_the_lookup
  - TypeError: InMemoryRepo.get_run_for_shift() takes 2 positional arguments but 3 were given
FAILED test_a_pod_row_does_not_bump_the_sync_cursor
  - AssertionError: assert 1 == 0   # a POD row advanced the cursor
=== the db tests ===
FAILED test_a_pod_row_does_not_advance_the_cursor - AssertionError: assert 1 == 0
FAILED test_the_cursor_the_append_answers_with_is_the_batchs_own_effect
  - AttributeError: 'AppendResult' object has no attribute 'cursor'
FAILED test_a_run_of_another_courier_is_not_found_by_the_query
  - TypeError: SqlAlchemyRepo.get_run_for_shift() takes 2 positional arguments but 3 were given
```

The race itself is proved rather than argued: `test_a_concurrent_commit_cannot_enter_the_batchs_own_
cursor` opens the batch's transaction, commits another batch on a second connection while the first
is open, and asserts the count read inside the first transaction cannot see it (READ COMMITTED's
snapshot), on the real engine.

## The gates on the branch

- `services/api`: 498 passed, 1 skipped · ruff clean · mypy clean; the db-marked suite 29 passed
  against `postgis/postgis:17-3.5` (the CI's own image; the container stopped and removed after).
- check-parity, conflict markers, mojibake, doc links, the floor guard clean.
