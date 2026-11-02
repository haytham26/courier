# ADR-025 — The spreadsheet import endpoint: CSV/Excel in, all-or-nothing stops (the server half of D52)

**Date:** 2026-11-03 · **Status:** Accepted · **Deciders:** backend squad, per D62 (founder)
and D63 · **Extends:** ADR-013 (intake), ADR-010 §2 (the stops list), ADR-024 (stop types)

## Context

D52 deferred the spreadsheet import as "a different product surface … a UI that invites
the exact failure (a silent mis-import) the voice-first import avoids". D62 puts it in the
trial. The server half is the part that can be made honest by construction: a validated,
all-or-nothing ingest endpoint. The app half (the picker, the column mapping UI) is the
lead's queue.

## Decision

- `POST /shifts/{shift_id}/import` accepts one multipart file: `.csv` (UTF-8 text) or
  `.xlsx`/`.xlsm` (zip) — the **name and the bytes must agree** (a zip named `.csv` is a
  415, not parsed as garbage). Caps: 5 MiB and 1000 rows, both named in the refusal.
- Header row required. `address` is the only required column (aliases `street`,
  `delivery_address`, `addr`); optional columns `type` (delivery/pickup, ADR-024),
  `priority`, `parcels`, `service_time_s`, `window_start`, `window_end`, matched case-
  and punctuation-insensitively ("Delivery Address" maps). Windows must carry their
  timezone and `window_end > window_start`.
- **All-or-nothing**: the whole file is parsed and validated before one row is stored;
  any invalid row is a 422 naming the file row, and nothing is stored. Columns matching
  no known field are answered in `ignored_columns` — never dropped silently.
- Stops are stored **unlocated** (`latitude`/`longitude` NULL, `location_id` derived via
  ADR-012): the API has no geocoder yet, so the routing layer reports them through
  `unroutable_stop_ids` until the address-intelligence slice lands — the same treatment
  an intake stop gets. `sequence` continues from the shift's existing stops; the SQL
  repo writes the whole import in one transaction.
- `openpyxl` 3.1.5 (MIT) is the `.xlsx` reader (with `et-xmlfile`, MPL-2.0); both recorded
  in `docs/product/LICENSES.md`. CSV uses the stdlib. The typed client is regenerated in
  the same PR (`ImportResponse`).
- 404 discipline as everywhere: the shift must be the caller's own run's shift (BUG-140).

## Consequences

- The import can add stops the route cannot yet place; that is honest (they list, they
  are unroutable) and matches the intake flow's behaviour for unplaceable addresses.
- A planner's CSV with extra columns imports fine but names them in the answer, so the
  courier sees what was ignored.
- Row-level strictness means a single blank address refuses 1000 good rows: intentional.
  The refusal names the row so the fix is a one-cell edit, not a re-upload of a guess.
