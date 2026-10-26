# ADR-014 — Sync conflict rules: first write wins, divergence is reported, the clock is bounded

- **Status:** accepted
- **Date:** 2026-10-25
- **Decides:** D41 (queue 2, item 6: the sync conflict rules, the ADR first)
- **Builds on:** ADR-010 §3 (the sync batch), ADR-011 (POD replays), ADR-012 (the notes upsert), `packages/contracts/db/schema.sql` (`delivery_events`: `occurred_at` is phone time, `received_at` is server time)

## Context

The phone owns the day's event log and works offline for hours; the batch replays what it stored.
The server is idempotent by event id (the phone generates them), but "idempotent" only covers the
byte-identical replay. The product has to answer, deliberately and testably:

1. What happens when the same event id arrives with **different content** (a local edit, a bug, a
   corrupted log)?
2. Which of **two disagreeing events** for one stop decides the status?
3. What does a **wrong phone clock** do to ordering?
4. Who wins when a POD photo or a location note is re-sent?

## Decision

### 1. The event log is append-only and the first write wins

The server never rewrites a stored event. A replay with identical content (id, shift, stop, kind,
utterance, safe_place, coordinates, accuracy, `occurred_at`) is an **idempotent ack**. A replay
whose content **differs** is a **conflict**: the stored row stays, the incoming copy is discarded,
and the event id is reported in `SyncResponse.conflicts` — the phone surfaces it ("2 events need
your review") and keeps its local copy. Silent divergence is the one outcome that is forbidden:
three weeks later nobody could tell which copy was the record.

There is no update or delete API for events. A correction is a **new event** with a new id —
"delivered at 08:02" then "failed at 08:07" is two rows, and the second one wins by time (below).

### 2. The stop status is the latest event by happened-time; ties go to the later arrival

`occurred_at` orders the events; an exact tie breaks by arrival order. The in-memory status
derivation implements this today (ordering by `occurred_at`, then the stored position); the SQL
repo reads `stops.status`, and whatever writer fills that column must order `occurred_at,
received_at` to keep the rule. The courier's last word wins: `delivered` then `failed` is
`failed`; `failed` then `delivered` is `delivered`. No kind has authority over another — any
"failed beats delivered" precedence would overrule the human.

The sync squad's research note C3 ("first server-accepted event wins; the second is rejected and
recorded") is superseded here: the courier's later word is the correction, and rejecting it would
force a client-side merge the phone is worse at. Both events are kept; nothing is rejected.

### 3. The clock is bounded: no event that claims the far future or the ancient past

`occurred_at` is phone time and is stored as sent (it is the courier's truth), but a wrong clock
must not be able to pin a stop's status for hours or to back-fill last week:

- an event more than **1 hour in the future** (server time) is refused: **422** for the batch;
- an event more than **7 days in the past** is refused: **422** for the batch.

The whole batch is refused with the offending event in the 422 detail, so the phone drops or
repairs it and resends — the alternative (accept part, report the rest) adds a second response
lane for a case that should be rare; it is recorded here as the refinement if it bites. The
1-hour future bound tolerates ordinary clock skew; the 7-day past bound is the log's realistic
life. The POD upload's `occurred_at` is exempt (its event is not a status event: `pod_captured`
never flips a stop, and the photo is evidence the upload timestamp does not order); if POD ever
joins the batch path it inherits the bound.

### 4. The other write paths keep their own decided rules

- **POD replays** (ADR-010/011): the same event id + the same stop returns the first upload's
  fingerprint; the same id for another stop of the run is 409; a foreign run or event is 404. The
  photo is evidence and is never overwritten by a replay; the POD path reports no conflicts (its
  event never flips a status).
- **Location notes** (ADR-012): last write wins per `(courier, location, kind)`, 200 on a
  correction — a note is working knowledge, not evidence.
- **Templates and routes**: last write wins (the courier's latest decision is the day's order).

## Consequences

- The contract grows `SyncResponse.conflicts` (event ids); clients that ignore it still sync
  correctly — they just lose the review prompt.
- The repo's `append_events` answers with the stored count **and** the conflicting ids, so the
  in-memory and SQL implementations are pinned to the same rules by the same tests — including a
  batch that carries the same id twice (the first copy wins in both); the SQL assertions are the
  `db`-marked suite, which runs in CI.
- A conflict is rare by construction (event ids are uuid4 generated once on the phone); when it
  happens, the record is honest and the courier can act.
- Clock-bounded events mean a phone with a badly wrong clock cannot silently corrupt a day; it
  gets a 422 and the courier fixes the phone. Recorded risk: the phone sends oldest-first, so a
  log older than 7 days at the head of a batch would wedge a client that stops on 422 — the
  phone-side slice must drop or repair the rejected head (never silently lose it) before the
  transport ships, per the sync squad's zero-data-loss gate.

## Verification

- `tests/test_sync.py`: the divergent replay reported (both directions: delivered→failed and
  failed→delivered), the changed field isolated, a divergent duplicate inside one batch, the
  identical replay acked, the status tie-break by time and by arrival, the future/old event 422,
  the response's `conflicts` shape.
- `tests/test_repo_db.py` (the `db` marker): the same conflict detection through the SQL path.
- The contract drift guard; the POD and notes suites unchanged.
