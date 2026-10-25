# CURRENT — backend squad (read this first)

Updated: 2026-10-25 · main at `af7cc86` · **Queue 2: items 1–4 and 6 MERGED (PR #26, #27, #31, #33, #35), item 5 merged (PR #34), the ASVS password rows merged (PR #39); item 7 (the map pack pipeline, PR #43) in review.**

## A rule violation, recorded (2026-10-25)

- The backend squad force-pushed `feat/db-in-ci` once (`47a44b4` → `07a6799`, an amend to fix a
  broken-syntax commit that was already pushed) — against the binding "no force-push of pushed
  branches". The branch is a solo-squad short-lived branch and nobody else pulled from it, and the
  content of `47a44b4` is preserved inside `07a6799`'s history — but the rule is the rule. The
  corrective habit from now on: a pushed mistake gets a follow-up commit, never an amend.

## In flight — item 7 (the map pack pipeline, `feat/map-pack-pipeline`, PR #43)

- **ADR-016.** The pack had never been built, and the reason was the build scripts themselves: read
  against the tools' own documentation (planetiler's README and the pmtiles CLI reference, both
  read 2026-10-25), four defects surfaced — an invented CLI (`--area=christchurch`, `--download` on
  a local file, a `versatiles reduce` step that does not exist), a 3D bake using flags planetiler
  does not have, a repo root one directory short, and a manifest that recorded none of the tool
  versions, the archive header or the OpenMapTiles credit.
- The build now runs the documented steps, and `.github/workflows/map-pack.yml` runs the pipeline
  twice a week (D26), on dispatch, and on a push that touches the pipeline — publishing the pack and
  the evidence in `docs/evidence/maps/pack/`. It never gates a PR.
- **Not claimed as done:** the 50 MB ceiling is checked but never observed, the LINZ overlay profile
  is not written, and the frame/battery/latency numbers are still the maps squad's to measure.

## Queue 2 items 5 and 6 — MERGED (PR #34 `archive/feat/voice-intake`, PR #35 `archive/feat/sync-conflicts`)

- **ADR-013 (voice intake):** the two contract stubs run the real LangGraph graph through the
  `IntakeProvider` seam — `OmniRouteProvider` when a gateway is configured, `FakeOmniRoute`
  otherwise (one parcel per spoken line; its OCR refuses, it never invents a manifest). The
  review's three must-fixes landed pre-merge: the manifest endpoint threadpooled, the untrusted
  text in tagged prompt blocks, and the contract's real 413/415/502/503.
- **ADR-014 (sync conflicts):** the event log is append-only — an identical replay is an ack, a
  divergent same-id replay reports the id in `SyncResponse.conflicts`, and the status is the latest
  event with ties broken by arrival. `occurred_at` beyond an hour in the future or seven days in
  the past is a 422. The review's must-fixes: the test rot (a pinned timestamp the 7-day bound
  would have started rejecting on 2026-10-31), the within-batch divergent duplicate, and the ADR's
  overstatements (the tie-break scoped to the in-memory derivation, the POD clock exemption, the
  queue-wedge risk against the zero-data-loss gate, C3 of the sync research marked superseded).

## The ASVS password rows — MERGED (PR #39, `archive/feat/auth-asvs`)

- ADR-015: `AUTH_MAX_PASSWORD_LENGTH` (default 128) and `AUTH_HIBP_ENABLED` (default on, the
  k-anonymity corpus check). The suite stubs the range API and asserts the bounds, the refusal, the
  fresh acceptance, the five-character prefix actually sent and the off switch.
- The plugin's behaviour was verified against Better Auth 1.7.10's own dist source rather than
  assumed: `enabled: false` short-circuits with no network call, the default paths include
  `/sign-up/email`, and a failed corpus lookup fails the sign-up loudly (it does not fail open).
- The email lane stays closed: `AUTH_REQUIRE_EMAIL_VERIFICATION` remains OFF with no sender behind
  it — the founder's provider decision, recorded in BUG-058's row.

## Queue 2 items 3 and 4 — MERGED (PR #31 `archive/feat/pod-storage`, PR #33 `archive/feat/location-notes`)

- **ADR-011 (POD storage):** one `PodStore` interface, the dedicated `POD_URL_SIGNING_SECRET` (the
  review proved the first key forgeable), the honest sha256 on S3, the paginated `delete_run`, and
  the moto suite executing in CI.
- **ADR-012 (location notes):** `uuid5` over the canonical `address|suburb`, one note per
  (courier, location, kind), and the 404-never-an-empty-list gate. The review's must-fixes: the SQL
  UPDATE refreshes `address_key` (parity), the namespace pinned by a literal-uuid test, the empty
  address refused, and the stop response never nulls `location_id`.

## Queue 2 items 1 and 2 — MERGED (PR #26 `archive/chore/audit-backend`, PR #27 `archive/feat/db-in-ci`)

- The audit's must-fixes and the contract's drift guard; the PostGIS service container, the
  `db`-marked `SqlAlchemyRepo` suite, the restore drill as a CI step, and the Locust SLO profile
  with the vacuous-green floor of 100 requests.

## Next in the queue

1. Item 7's PR to green and merge (PR #43).
2. The rest of the queue 2 list in `docs/plan/MASTER_EXECUTION.md` §4 order, then the extended §4
   scope: billing/entitlements (ADR first), the admin/ops console API, server push, privacy
   analytics, the voice eval runs, the staging plan, and the open BUGS.md rows from BUG-063.
3. The recorded next slices on the merged items: the voice-socket resume and the persistent
   checkpointer (ADR-013), the real geocoder (ADR-013 §4), the LINZ overlay profile (ADR-016 §2),
   the first pack build's evidence (ADR-016 §4), and the SQL `stops.status` writer (ADR-014 §2).

## Housekeeping note (2026-10-25)

- `git worktree remove` fails on the `.worktrees/*` copies with "Filename too long" on this box; the
  merged branches' copies were cleaned with the full literal path and `git worktree prune`. All
  content was already on `main` — the worktrees were working copies, never the source of truth.
