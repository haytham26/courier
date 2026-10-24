# CURRENT — backend squad (read this first)

Updated: 2026-10-25 · main at `6eec1da` · **Queue 2: item 1 MERGED (PR #26), item 2 in review (PR #27).**

## A rule violation, recorded (2026-10-25)

- The backend squad force-pushed `feat/db-in-ci` once (`47a44b4` → `07a6799`, an amend to fix a
  broken-syntax commit that was already pushed) — against the binding "no force-push of pushed
  branches". The branch is a solo-squad short-lived branch and nobody else pulled from it, and the
  content of `47a44b4` is preserved inside `07a6799`'s history — but the rule is the rule. The
  corrective habit from now on: a pushed mistake gets a follow-up commit, never an amend.

## In flight — item 2 (the database in CI, this branch)

- The pinned PostGIS 17.2 service container (the schema needs PostGIS), the DB-backed
  `SqlAlchemyRepo` suite (10 tests, the `db` marker — the executemany-rowcount and
  IntegrityError questions close with evidence in CI; the first run showed the lying-409
  conflation live and the constraint-name translation landed in the same pass), the restore
  drill as a CI step (dump → clean DB → the API round-trip), and the short Locust SLO profile
  with a minted JWKS identity (the full 1,000-driver run stays documented for staging, RUNBOOK
  §12). No script points at anything but the runner's own service container.

## Queue 2 item 1 — MERGED (PR #26, `archive/chore/audit-backend`)

- **Fixed at the root** (founder findings + the deep audit's must-fixes): the coverage summaries
  untracked; the contract whole + the **drift guard** (the contract never had the route endpoint,
  `/auth/*` or `/healthz`; the duplicate `/locations` YAML key fixed; the not-served paths marked
  `x-status: planned`; the planned-implies-not-served guard direction); the sync batch bounded +
  every event stop_id belonging to the run; the voice WS: foreign shift closed 4404 (delivered
  post-accept), malformed/binary frames answered (never a dead socket), the transcript bounded;
  the LLM failure path is `fallback_intent`; the middleware logs the swallowed 500s; the POD
  same-run-different-stop replay is 409; `start_at` tz-aware; the auth
  `AUTH_REQUIRE_EMAIL_VERIFICATION` option (tested, default off — no email lane yet); `litellm` +
  `alembic` dropped; `put_run` names the broken constraint (the FK break, the 1:1 shift, the
  duplicate id — each honest).
- **For the lead — the sweep's findings, filed in BUGS.md (BUG-053..BUG-057, owner: lead):**
  1. `.design-render/`: 24 scratch PNGs tracked, contradicting `.gitignore:44-46` itself (BUG-053).
  2. `.gitignore` gaps: `.maestro/evidence/`, `apk/`, root `requirements.txt` are generated per-run
     but not ignored (BUG-054).
  3. `docs/STATUS.md` + `docs/status/PROGRESS.md` are stale: "PyVRP is a seam, not wired", "POD not
     started", "160 tests", "five flows" — all contradicted by PRs #19/#21/#23 (BUG-055).
  4. `ci.yml` has no top-level `permissions:` block (BUG-056).
  5. `design-videos.yml` is still present although its own header says it was to be deleted; the
     `store-ready.yml` step-name duplicate is cosmetic (BUG-057).
- **Parked (backend, BUG-059):** the test-fixture hoist, response_models on 11 handlers, the voice
  stores bound, the WS token-in-query NIT, the psycopg LGPL note for the lead's licence ledger.

## Still queued (queue 2)

3. POD object storage (S3-compatible, signed URLs, retention; moto in tests — no MinIO, AGPL).
4. Location notes (the door-memory endpoints + the cross-courier tests).
5. Voice intake (close the two stubs through the fake OmniRoute provider).
6. Sync conflict rules (the ADR first).

