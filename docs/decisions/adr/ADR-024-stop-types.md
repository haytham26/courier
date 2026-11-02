# ADR-024 — The stop carries its type: delivery or pickup (the server half of D59)

**Date:** 2026-11-02 · **Status:** Accepted · **Deciders:** backend squad, per D62 (founder)
and D63 · **Extends:** ADR-010 §2 (the stops list), ADR-012 (door memory)

## Context

C2 verified 2026-10-26 that no stop-type model existed anywhere on main (PARITY row 310,
"stop types", 5 mentions in the Spoke teardown). Spoke bundles delivery/pickup presets on an
address; the preset's core is *what the stop is* — a delivery or a pickup — and the rest of the
preset (safe place, leave-at-door, tip) rides the address squad's door memory (ADR-012).
D59 deferred the feature as a contract change; D62 puts it in the trial.

## Decision

- `packages/contracts/db/schema.sql`: `stops` gains
  `type text NOT NULL DEFAULT 'delivery' CHECK (type IN ('delivery', 'pickup'))`
  (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`).
- `packages/contracts/openapi.yaml`: `StopResponse` gains required `type`
  (`enum: [delivery, pickup]`).
- Server (`services/api/app/`): `RouteStopRow.type` (default `"delivery"`), both
  `get_run_stops` paths (SQL and in-memory) select it, and `GET /shifts/{shift_id}/stops`
  echoes it.
- The typed client is regenerated in the same PR (`StopResponse.type: 'delivery' | 'pickup'`);
  the CI freshness gate proves it.
- The app half (presets per address, the pickup/delivery picker, the read-out on the stop
  card) is the lead's queue (D62 step 4.3); PARITY row 310 records the server half and stays
  `Planned (task)`.

## Consequences

- Existing rows answer `type = 'delivery'` — honest: every stop seeded before the column was
  a delivery, and the only writers (demo seed, loadtest seed, restore drill) insert explicit
  column lists that fall through to the default.
- The vocabulary is closed at the database (`CHECK`): a third kind (e.g. a future "return")
  is a schema change with its own ADR, not a silent new string.
- Setting the type is a writer-side concern: today the seed paths can set it explicitly
  (`seed_stop(..., stop_type="pickup")` in the db suite does); the API's own stop-writing path
  (the intake graph's manifest lock) is the app half's surface.
