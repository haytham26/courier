# ADR-022 — The run stores its break window and finish point (the server half of D55/D56)

**Date:** 2026-11-02 · **Status:** Accepted · **Deciders:** backend squad, per D62 (founder)
and D63 · **Supersedes:** the deferral sentence in ADR-010 §3 ("the finish point and the
break window stay out until the runs table gains columns for them")

## Context

ADR-010 §3 kept the run's finish point and break window out of `CreateRunRequest` because
the `runs` table had no columns for them, and `extra="forbid"` turns "no home yet" into a
422. The solver has modelled both since PR #19 (ADR-009 §4: the core places the break,
`break_start_at`/`break_end_at`/`break_violation`; the finish position with the test that
the day ends there). D62 puts every deferred day-one feature in the trial, so the columns
come now, and with them the fields.

## Decision

- `packages/contracts/db/schema.sql`: `runs` gains `break_start_at timestamptz`,
  `break_end_at timestamptz`, `finish_lat double precision`, `finish_lon double precision`,
  added as `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (the schema's idempotent pattern;
  CI and the db test fixture apply the file verbatim).
- `packages/contracts/openapi.yaml`: `CreateRunRequest` gains optional `break_window`
  (`{start, end}`, both `date-time`, both required together, `additionalProperties: false`)
  and `finish` (`{lat, lon}`, bounded like `depot`). `RunResponse` gains both, nullable.
  Unknown fields are still refused (`additionalProperties: false` / `extra="forbid"`).
- Server: `BreakWindow` validates both bounds carry a timezone and `end > start`;
  `finish` reuses the depot's bounds. `RunRecord` carries the four fields (default `None`,
  so the demo seed and the load-test seed need no change); the SQL repo's `INSERT INTO runs`
  and all three run SELECTs read them.
- The typed client is regenerated in the same PR and the CI freshness gate
  (`generate_api_client.py check`) proves it.
- The app halves (the break row on the run screen, the finish picker, the E2E flow) are the
  lead's queue (D62 step 4.3) and are **not** claimed here: PARITY rows 309 and 12 stay
  `Planned (task)` and record the server half.

## Consequences

- A run created before this change answers `break_window: null, finish: null` — the nullable
  response is the honest answer for old rows.
- The plan request of the route endpoint already carried finish/break; now the stored run
  carries them too, and the two can be reconciled by the solver slice later without another
  contract change.
- Validation is at the boundary: an inverted or naive break window is a 422 naming the
  rule, never a silently clamped window.
