# BUG-115 — the stop's status on Postgres, derived from the events

**Date:** 2026-10-31 · **Owner:** the backend squad (sync) · **Task:** C1's fix order — BUG-115 is
the row that comes right after the highs, because a delivered stop read `pending` on Postgres while
every test (which runs `InMemoryRepo`) said `delivered`.

## What was wrong

`SqlAlchemyRepo` never wrote `stops.status`: its writers are subscriptions, delivery_events, runs,
door_memory, run_templates, run_routes and run_route_stops. Only `demo.py`, `seed_day.py` and
`restore_drill.py` write the column, and all three write `pending`. So on Postgres:

```
courier syncs `delivered`            → 200 {"accepted":1,"cursor":1,"conflicts":[]}
SELECT status FROM stops WHERE id=…  → pending
GET /shifts/{sid}/stops              → "status": "pending"
GET /shifts/{sid}/stops?status=delivered → []
```

`InMemoryRepo.get_run_stops` derives the status from the event log, so the suite is green on the
defect — the audit's own sentence about it.

## The choice, and why it is (b)

The register offers (a) fill the column in the same transaction as `append_events`, or (b) make the
SQL read derive it as the in-memory repo does. **(b) is implemented**, because (a) costs a second
statement on the sync path and that path's budget is pinned by BUG-063's own gate:

```
tests/test_sync_conflict_cost.py::TestTheBatchCost
    test_an_all_new_batch_is_the_one_statement          → len(statements) == 1
    test_a_batch_the_insert_partly_refused_pays_for_the_comparison → len(statements) == 2
```

The first implementation of the fix was (a) — an UPDATE inside the transaction — and it turned both
of those tests red (2 and 3 statements). Moving the second statement into the sync would have meant
editing a gate that exists because of a measured SLO breach (BUG-063: p95 370 ms), and CONSTRAINTS
forbids that. So the derivation is paid by the read that asks for a run's stops instead of by every
batch, and the sync stays the one statement it was before ADR-014.

The cost of (b) is honest and written down: the `stops.status` column remains the seed's value, and
one test (`test_the_stale_column_is_not_what_the_courier_is_told`) pins exactly that, so nobody can
later mistake the column for the answer.

## The derivation, and the order it uses

`SqlAlchemyRepo.get_run_stops` replaces `s.status` with a correlated scalar subquery — the latest
status event for that stop in the shift, ordered `occurred_at DESC, received_at DESC` (ADR-014 §2),
`COALESCE`d with the column when no event ever touched the stop:

```sql
COALESCE(
    (SELECT e.kind FROM delivery_events e
      WHERE e.shift_id = s.shift_id AND e.stop_id = s.id
        AND e.kind IN ('delivered','skipped','deferred','failed')
      ORDER BY e.occurred_at DESC, e.received_at DESC LIMIT 1),
    s.status
) AS status
```

`/shifts/{id}/stops` reads only this method and filters on `row.status` in Python, so the
`?status=delivered` answer is fixed by the same line. The `delivery_events_shift` index on
`(shift_id, occurred_at)` serves the subquery.

## The tests, red first

`services/api/tests/test_repo_db.py::TestTheStopStatusTheCourierReads` — 8 tests on the real
Postgres (`-m db`, the CI job's service container). With the column read restored, **7 of the 8
failed** (the eighth, `test_a_pod_event_does_not_decide_the_status`, passes on both sides because
nothing writes a status at all — the register's own exemption for `pod_captured`). Green after:

| Test | What it proves |
|---|---|
| `test_a_delivered_event_makes_the_stop_read_delivered` | the row reads `delivered` after one event |
| `test_the_latest_event_decides_delivered_to_failed` | the later stamp wins (delivered → failed) |
| `test_a_failed_stop_can_come_back_to_delivered` | the other direction (failed → delivered) |
| `test_an_event_with_an_earlier_stamp_does_not_rewind_the_status` | the batch's order is not the day's |
| `test_a_pod_event_does_not_decide_the_status` | a photograph is not a verdict |
| `test_the_stale_column_is_not_what_the_courier_is_told` | the column stays stale; the answer is derived |
| `test_the_sql_repo_and_the_in_memory_repo_answer_the_same` | one day, whichever repository serves it |
| `test_a_stop_with_events_is_not_the_only_row_of_the_run` | a stop nothing happened to keeps `pending` |

## The gates

- `services/api`: 480 passed, 7 skipped · `-m db` 24 passed · ruff clean · mypy clean.
- The other services are untouched by this PR; their gates are unchanged from the previous PR.
- `Deploy staging`: untouched except through `services/api/app/repo.py`, which the Postgres suite
  covers; the leg runs on the push to main.

## The trap this session paid (recorded per §8)

The repo's own `docker-compose.yml` cannot start its Postgres locally: its `command:` preloads
`pg_stat_statements,pg_trgm,vector` and the image it names (`postgis/postgis:16-3.5`) carries no
`vector` library — `FATAL: could not access file "vector"`. CI does not use that file (its job runs
`postgis/postgis:17-3.5` as a service container with no custom command), so the defect is local-only
and does not block the suite; the local run used the CI's own image. **It is a real defect on a
backend path and it is filed with the next free row.**

## The red leg on this branch, fixed at its root (the new session, 2026-10-31)

On the branch's final head (`ec823b7`), one leg was red: the restore drill (step 17 of the
`lint, typecheck, test` job — everything else, including the whole pytest suite and the Postgres
suite, passed):

```
SMOKE FAILED: the restored day does not read back as it was written
##[error]Process completed with exit code 1.
```

The cause is this PR's own change, and the drill's contract was the stale half: `smoke()` seeded
one stop, stored a `delivered` event through the repo, and then asserted
`rows[0].status != "pending"` — a line whose comment said "the SQL repo reads stops.status from the
column", which BUG-115 made false on the read. Playbook §4's contract check: the derivation is the
design (ADR-014 §2 and the in-memory repo's behaviour), so the drill was fixed to it, not the fix
to the drill.

The drill now proves **both halves of the derivation against the real restored database**: two stops
are seeded (two distinct doors, so the plan is a real two-leg route), one receives a `delivered`
event, and the read-back must derive `delivered` for it and `pending` (the seeded column, the
COALESCE fallback) for the other. Red first — **locally, against the CI's own image**
(`postgis/postgis:17-3.5` in Docker), by swapping `app/repo.py` to `origin/main`'s version and
re-running the drill's `smoke()`; the swap was reverted straight after and nothing was pushed:

```
=== 1. the branch's repo (the derivation in place) ===
SMOKE PASSED: {'write_run_and_stops_s': 0.007, 'sync_batch_s': 0.003, 'read_back_and_plan_s': 13.099}
=== 2. origin/main's repo (the pre-BUG-115 column read) ===
SMOKE FAILED: the restored day does not read back as it was written (the delivered stop reads 'pending', the untouched one reads 'pending')
```

Gates on this tree: `-m db` 25 passed · the rest of the suite 478 passed, 1 skipped · ruff clean ·
mypy clean. (These numbers are this commit's tree; the earlier "The gates" section's numbers are
the PR's first tree, which carried the same suites one row smaller.)
