# CURRENT — backend squad (read this first)

Updated: 2026-10-25 · main at `b0693c8` · **On `feat/slo-runs-insert` (PR #46): BUG-063, the sync
SLO breach after ADR-014.** Backend steps (CI — which contains the Locust SLO profile — Quality
gates, CodeQL) are **green** on the push head `d8612f5`; only the lead-owned Android E2E leg is
still running, and §16.3 covers that.

## What this branch is

- **BUG-063** (number taken from `origin/main`, where 62 was the highest). CI run 40185490916 failed
  only at the Locust SLO profile: `SLO BREACH: POST /shifts/{id}/events:batch p95 370 ms > 300 ms`,
  with every request 2xx. Per PLAYBOOK §12 an intermittent failure is a bug, so it was root-caused
  from the run's log rather than rerun.
- **Root cause is mine** (the ADR-014 change): `append_events` selected the batch's stored rows
  before *every* INSERT, so the courier's most frequent call paid for a rare case.
- **Fix:** the comparison sits behind the INSERT's rowcount; an all-new batch is the one statement it
  was before ADR-014.
- **The Postgres log's `runs_shift_id_fkey` / `runs_shift_id_key` / `runs_pkey` violations are not
  the failure** — they are the API's translated, handled 409s (`put_run` names each constraint), and
  the bug row records them as such.
- **Proven:** the `db`-marked suite (13 tests) against the pinned PostGIS 17.2 container — started
  locally in Docker Desktop, the same image CI uses — plus `tests/test_sync_conflict_cost.py`, which
  needs no database and pins the statement count. §14's red-first and mutation evidence are pasted
  into PR #46.

## Also in flight (other branches)

- **PR #43 `feat/map-pack-pipeline`** (the map-pack pipeline, ADR-016/D42): the review's four
  findings are landed — the pmtiles version subcommand, the real release assets with checksums, the
  3D script's profile gate, and the argv tests. It carried `origin/main` merged in (the register
  conflict resolved as D42 then D43). Origin/main moved again since, so it needs that merge before
  its final push.

## Ownership (PLAYBOOK §16)

- The **Locust SLO profile, the Postgres suite and the restore drill are the backend's** — so this
  fix is mine to make, and it was.
- The **Android E2E workflow is the lead's**: not investigated, not touched.
