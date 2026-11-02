# Evidence — the failed-delivery reason field (D58 server half)

**Step:** D62 queue step 4.3 · **Branch:** `feat/trial-failed-reason` (head `23ce625` +
docs commit) · **PR:** #178 · **Decision/ADR:** D63, ADR-023 · **Date:** 2026-11-02

## What the evidence is

`POST /shifts/{shift_id}/events:batch` stores a structured `reason` on a failed event,
refuses a failed event without one (422, nothing stored), refuses blank/overlong reasons,
and reports a changed reason as a replay conflict. The `delivery_events` table has the
column; the typed client carries `reason?: string`.

## Red first (PLAYBOOK §14)

The six new tests in `tests/test_sync.py::TestTheFailedDeliveryReason` were run against the
pre-change tree (the branch's app/contracts files reverted to the stack point, tests kept):

```
$ uv run --directory services/api pytest tests/test_sync.py -q -k "Reason or reason"
FAILED ...::test_a_failed_event_carries_its_reason_and_it_is_stored
FAILED ...::test_a_failed_event_without_a_reason_is_refused_and_nothing_is_stored
FAILED ...::test_a_blank_reason_is_refused_on_a_failed_event
FAILED ...::test_an_overlong_reason_is_refused
FAILED ...::test_a_changed_reason_is_a_conflict_and_the_first_write_wins
FAILED ...::test_a_non_failed_event_may_omit_the_reason
6 failed, 26 deselected in 4.60s
```

(On the old tree the reason is silently dropped and failed-without-reason is accepted.)

## Green

```
$ uv run --directory services/api pytest tests/test_sync.py -q
32 passed in 3.54s

$ uv run --directory services/api pytest -q
559 passed, 1 skipped, 30 deselected in 43.10s

$ uv run --directory services/api ruff check app tests
All checks passed!

$ uv run --directory services/api python scripts/generate_api_client.py check
check-api-client: the client is fresh
```

The db-marked suite (CI, `-m db`) covers the new column through the INSERT and both SELECTs.

## Gates

| Gate | Command | Result |
|---|---|---|
| api suite | `pytest -q` | 559 passed, 1 skipped |
| lint | `ruff check app tests` | clean |
| client freshness | `generate_api_client.py check` | fresh |
| floor / registers | `node scripts/ci/check-floor.mjs`, `check-parity.mjs` | clean (BUG-167 unique) |
| CI | PR #178 runs (incl. the `-m db` Postgres leg) | see the PR |

## Not verified here

Postgres is capped at 3 GB on this machine, so the `-m db` leg runs on CI only. The app's
reason picker is the lead's queue and is not claimed.
