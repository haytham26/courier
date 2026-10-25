# CURRENT — backend squad (read this first)

Updated: 2026-10-25 · main at `0df84cb` · **Queue 2 items 1–7 are MERGED, and BUG-063 is MERGED.**

## Merged

| Item                                                               | PR  | ADR / register |
| ------------------------------------------------------------------ | --- | -------------- |
| The quality audit (the contract whole + the drift guard)           | #26 | —              |
| The database in CI (the PostGIS suite, the drill, the SLO profile) | #27 | —              |
| The POD object storage (one store, a real signing key, retention)  | #31 | ADR-011 / D38  |
| The location notes (a stable door identity, the upsert, the gate)  | #33 | ADR-012 / D39  |
| The voice intake (the stubs wired through the provider seam)       | #34 | ADR-013 / D40  |
| The sync conflict rules (first write wins, divergence reported)    | #35 | ADR-014 / D41  |
| The ASVS password rows (a real maximum, the breached corpus)       | #39 | ADR-015        |
| **BUG-063** — the sync batch's cost after ADR-014                  | #46 | BUG-063        |
| The map pack pipeline (the documented build, the workflow)         | #43 | ADR-016 / D42  |

## What BUG-063 was, and what it proved

CI run 40185490916 failed only at the Locust SLO profile — `p95 370 ms > 300 ms` on
`events:batch`, every request 2xx. Per PLAYBOOK §12 an intermittent failure is a bug, so it was
root-caused from the run's log: the ADR-014 conflict comparison selected the batch's rows before
_every_ INSERT. The comparison now sits behind the INSERT's rowcount, so an all-new batch is the one
statement it was before. Proven against the pinned PostGIS container locally (13 db tests) and by a
statement-count suite; the register and this log record that the runs-insert constraint violations
in the Postgres log were the API's translated, handled 409s, not the failure.

## The §16 ownership note from this session

- The **Locust SLO profile, the Postgres suite and the restore drill are the backend's** — BUG-063
  was mine to fix, and it was.
- The **Android E2E workflow is the lead's**. One api-35 leg on PR #43 carried the known adb-daemon
  noise (PLAYBOOK §11); it was rerun per §19.1 and passed, and the lead's paths were never touched.

## Next in the queue (§4 order)

1. The billing/entitlements slice, ADR first (the payments squad's research is written and the
   options are all buildable per D44).
2. The admin/ops console API, server push, privacy analytics, the voice eval runs.
3. The staging plan, and the open BUGS.md rows from BUG-064.
