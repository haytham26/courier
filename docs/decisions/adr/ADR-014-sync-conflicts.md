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

`occurred_at` orders the events; an exact tie breaks by arrival order (the position in the stored
log, i.e. `received_at` in practice). The courier's last word wins: `delivered` then `failed` is
`failed`; `failed` then `delivered` is `delivered`. No kind has authority over another — any
"failed beats delivered" precedence would overrule the human.

### 3. The clock is bounded: no event that claims the far future or the ancient past

`occurred_at` is phone time and is stored as sent (it is the courier's truth), but a wrong clock
must not be able to pin a stop's status for hours or to back-fill last week:

- an event more than **1 hour in the future** (server time) is refused: **422** for the batch;
- an event more than **7 days in the past** is refused: **422** for the batch.

The whole batch is refused with the offending event named, so the phone drops or repairs it and
resends — the alternative (accept part, report the rest) adds a second response lane for a case
that should be rare; it is recorded here as the refinement if it bites. The 1-hour future bound
tolerates ordinary clock skew; the 7-day past bound is the log's realistic life.

### 4. The other write paths keep their own decided rules

- **POD replays** (ADR-010/011): the same event id + the same stop returns the first upload's
  fingerprint; the same id for another stop of the run is 409; a foreign run or event is 404. The
  photo is evidence and is never overwritten by a replay.
- **Location notes** (ADR-012): last write wins per `(courier, location, kind)`, 200 on a
  correction — a note is working knowledge, not evidence.
- **Templates and routes**: last write wins (the courier's latest decision is the day's order).

## Consequences

- The contract grows `SyncResponse.conflicts` (event ids); clients that ignore it still sync
  correctly — they just lose the review prompt.
- The repo's `append_events` answers with the stored count **and** the conflicting ids, so the
  in-memory and SQL implementations are pinned to the same rules by the same tests.
- A conflict is rare by construction (event ids are uuid4 generated once on the phone); when it
  happens, the record is honest and the courier can act.
- Clock-bounded events mean a phone with a badly wrong clock cannot silently corrupt a day; it
  gets a 422 and the courier fixes the phone.

## Verification

- `tests/test_sync.py`: the divergent replay reported (stored once, both directions tested), the
  identical replay acked, the status tie-break by time and by arrival, the future/old event 422,
  the response's `conflicts` shape.
- `tests/test_repo_db.py` (the `db` marker): the same conflict detection through the SQL path.
- The contract drift guard; the POD and notes suites unchanged.
