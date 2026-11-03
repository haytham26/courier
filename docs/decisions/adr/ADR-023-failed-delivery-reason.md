# ADR-023 — The failed-delivery event carries a structured reason (the server half of D58)

**Date:** 2026-11-02 · **Status:** Accepted · **Deciders:** backend squad, per D62 (founder)
and D63 · **Extends:** ADR-010 §2 (the delivery events), ADR-014 (sync conflicts)

## Context

C2 verified 2026-11-01 that a failed delivery had no structured reason anywhere: the stop
status says `failed`, the courier's words live in `utterance`, but nothing structured says
*why* — and PARITY row 25 claimed `Have` on the statuses alone. D58 deferred the field as a
contract change; D62 puts it in the trial. The vocabulary is a product decision (the
courier's own list, not a generic enum), so the server stores the courier's own bounded
words, it does not invent an enum.

## Decision

- `packages/contracts/db/schema.sql`: `delivery_events` gains `reason text`
  (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`).
- `packages/contracts/openapi.yaml`: `DeliveryEvent` gains `reason` (`string`,
  `maxLength: 200`), required in practice when `kind` is `failed`.
- Server (`services/api/app/main.py`): `DeliveryEvent.reason` is stripped; blank becomes
  absent; a `failed` event without a reason is a 422 naming the rule; over 200 chars is a
  422. The sync batch stores it; `DeliveryEventRow` carries it.
- `repo.py`: the INSERT writes it, both event SELECTs read it, and `_same_event` compares
  it — a replay with a different reason is a conflict (the first write wins, ADR-014).
- The typed client is regenerated in the same PR; the CI freshness gate proves it.
- The app half (the reason picker on the failure flow, the retry schedule) is the lead's
  queue (D62 step 4.3); PARITY row 25 records the server half and stays `Planned (task)`.

## Consequences

- Existing rows answer `reason = NULL` — honest for events that predate the field.
- Old clients that sync a `failed` event without a reason now get a 422 naming the event:
  intentional. The trial build is the product (D62), and a failed outcome without a reason
  is the exact gap being closed; the phone's outbox surfaces the refused event instead of
  silently losing it.
- The POD route's `pod_captured` rows never need a reason; the rule binds only `failed`.
