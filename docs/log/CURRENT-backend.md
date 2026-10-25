# CURRENT — backend squad (read this first)

Updated: 2026-10-25 · main at `abe4afc` · **BUG-063 is MERGED (PR #46, tag `archive/feat/slo-runs-insert`).
On `feat/map-pack-pipeline` (PR #43): the map-pack pipeline, waiting on `origin/main` merged and CI.**

## BUG-063 — MERGED (PR #46, `archive/feat/slo-runs-insert`)

- CI run 40185490916 failed only at the Locust SLO profile: `SLO BREACH:
POST /shifts/{id}/events:batch p95 370 ms > 300 ms`, with every request 2xx. Per PLAYBOOK §12 an
  intermittent failure is a bug, so it was root-caused from the run's log rather than rerun.
- **Root cause was mine** (the ADR-014 change): `append_events` selected the batch's stored rows
  before _every_ INSERT, so the courier's most frequent call paid for a rare case. The fix moves the
  comparison behind the INSERT's rowcount — an all-new batch is the one statement it was before
  ADR-014.
- **The Postgres log's `runs_shift_id_fkey` / `runs_shift_id_key` / `runs_pkey` violations are not
  the failure** — they are the API's translated, handled 409s (`put_run` names each constraint), and
  the bug row records them as such.
- **Proven:** the `db`-marked suite (13 tests) against the pinned PostGIS 17.2 container — started
  locally in Docker Desktop, the same image CI uses — plus `tests/test_sync_conflict_cost.py`,
  which needs no database and pins the statement count. §14's red-first and mutation evidence are
  pasted into the PR.

## In flight — item 7 (the map-pack pipeline, `feat/map-pack-pipeline`, PR #43)

- **ADR-016/D42.** The pack had never been built, and the reason was the build scripts themselves:
  read against the tools' own documentation (planetiler's README and the pmtiles CLI reference, both
  read 2026-10-25), four defects surfaced — an invented CLI (`--area=christchurch`, `--download` on
  a local file, a `versatiles reduce` step that does not exist), a 3D bake using flags planetiler
  does not have, a repo root one directory short, and a manifest that recorded none of the tool
  versions, the archive header or the OpenMapTiles credit. All four are fixed and pinned by tests.
- The build now runs the documented steps, and `.github/workflows/map-pack.yml` runs the pipeline
  twice a week (D26), on dispatch, and on a push that touches the pipeline — publishing the pack and
  the evidence in `docs/evidence/maps/pack/`. It never gates a PR.
- **Not claimed as done:** the 50 MB ceiling is checked but never observed, the LINZ overlay profile
  is not written, and the frame/battery/latency numbers are still the maps squad's to measure.

## Merged this session (queue 2 and the fix on top of it)

| Item                                                                               | PR  | ADR / register |
| ---------------------------------------------------------------------------------- | --- | -------------- |
| The quality audit (the contract whole + the drift guard, the audit's must-fixes)   | #26 | —              |
| The database in CI (the PostGIS suite, the restore drill, the Locust SLO profile)  | #27 | —              |
| The POD object storage (one store, a real signing key, retention)                  | #31 | ADR-011 / D38  |
| The location notes (a stable door identity, the upsert, the cross-courier gate)    | #33 | ADR-012 / D39  |
| The voice intake (the stubs wired through the provider seam)                       | #34 | ADR-013 / D40  |
| The sync conflict rules (first write wins, divergence reported, the clock bounded) | #35 | ADR-014 / D41  |
| The ASVS password rows (a real maximum, the breached corpus by k-anonymity)        | #39 | ADR-015        |
| BUG-063 (the sync batch's cost)                                                    | #46 | BUG-063        |

## Ownership (PLAYBOOK §16)

- The **Locust SLO profile, the Postgres suite and the restore drill are the backend's** — BUG-063
  was mine to fix, and it is.
- The **Android E2E workflow is the lead's**: never investigated, never touched.
