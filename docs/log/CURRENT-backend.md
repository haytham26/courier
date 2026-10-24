# CURRENT — backend squad (read this first)

Updated: 2026-10-25 · Branch: `chore/audit-backend` (queue 2 item 1, PR pending)
## Queue 2 — item 1: the quality audit (this branch)
- **Fixed at the root** (founder findings + the deep audit's must-fixes):
  - the generated `coverage.json` files untracked (1a);
  - the contract whole again + the **drift guard** (1b): `tests/test_contract.py` generates the
    FastAPI surface and asserts served⊆contract, contract(non-planned)⊆served, operationIds equal;
    the contract never had `/shifts/{id}/route` (!), `/auth/*` or `/healthz` — merged; the
    duplicate `/locations` YAML key fixed; the not-served paths marked `x-status: planned`;
  - the sync batch bounded (500) + every event stop_id must belong to the run;
  - the voice WS: foreign shift closed 4404, malformed frames answered (never a dead socket),
    transcript bounded 2000, the LLM failure path is `fallback_intent` (never a StopIteration crash);
  - the middleware logs the swallowed 500s (the PLAYBOOK trail); the POD replay on another stop
    of the same run is 409; `start_at` must carry its timezone;
  - the auth `AUTH_REQUIRE_EMAIL_VERIFICATION` option (tested, default off — no email lane yet);
  - `litellm` + `alembic` dropped (imported by nothing; the lock shrank).
- **For the lead — the read-only sweep's findings, filed in BUGS.md (BUG-053..BUG-057, owner: lead):**
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
2. Database in CI (Postgres service; the DB-backed tests, the Locust SLO profile, the drill) — the
   audit's `SqlAlchemyRepo`-has-no-coverage finding closes there.
3. POD object storage (S3-compatible, signed URLs, retention; moto in tests — no MinIO, AGPL).
4. Location notes (the door-memory endpoints + the cross-courier tests).
5. Voice intake (close the two stubs through the fake OmniRoute provider).
6. Sync conflict rules (the ADR first).
