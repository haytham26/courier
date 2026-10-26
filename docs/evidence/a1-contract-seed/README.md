# Evidence — A1's backend half (branch `feat/a1-contract-seed`, PR #57, ADR-019/D47)

Every PASS below is the local output of the command named, captured on the branch head
`067a3e4`'s successors while the review findings were landed. Re-run any of them:

| #   | Command                                                                                                            | Result                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| 1   | `uv run --directory services/api pytest -q`                                                                        | `test.log` — 406 passed, 7 skipped, 17 deselected                                   |
| 2   | `uv run --directory services/api pytest tests/test_demo_seed.py tests/test_api_client.py -q`                       | `client-tests.log` — the seed and the client suites                                 |
| 3   | `DATABASE_URL=postgresql://courier:courier@127.0.0.1:5432/courier uv run --directory services/api pytest -m db -q` | `db.log` — 17 passed (PostGIS 17-3.5 container)                                     |
| 4   | `uv run --directory services/api ruff check .`                                                                     | `lint.log` — all checks passed                                                      |
| 5   | `uv run --directory services/api mypy .`                                                                           | `typecheck.log` — no issues in 60 source files                                      |
| 6   | `uv run --directory services/api python scripts/generate_api_client.py check`                                      | `client-fresh.log` — the client is fresh                                            |
| 7   | `corepack pnpm --filter @courier/shared exec tsc --noEmit` and `run lint`                                          | `shared.log` — the generated types typecheck and lint                               |
| 8   | `node scripts/ci/check-floor.mjs origin/main`                                                                      | `floor.log` — clean (no suppressions, no skips, no stubs)                           |
| 9   | `node scripts/ci/check-doc-links.mjs`, `check-control-chars.mjs`, `check-conflict-markers.mjs`                     | `links.log` — clean                                                                 |
| 10  | The two mutations                                                                                                  | `mutations.md` — a broken `check()` and a changed 409 each made the right test fail |

## What the evidence proves

- **The seed is real, not a mock.** The db-marked test writes a shift, a run and five stops through
  the production `SqlAlchemyRepo`, seeds twice, and reads the same ids back with the status a seeded
  stop starts at; the in-memory suite proves the same properties through the endpoint, including the
  round trip through `GET /runs/{run_id}` and `GET /shifts/{shift_id}/stops`, in the seeded order,
  with the derived location — and a 404 for another courier.
- **The gate refuses everything but the exact string.** `false`, `1`, `True`, `TRUE`, `yes`, `on`,
  `"true "` and `" true"` are each 404, and the repo holds no run afterwards.
- **The client is fresh and typed.** Regenerating produces a byte-identical file; every contract path
  and schema appears in it; the gate is run against a stale file and a fresh file, and tells them
  apart.
- **Nothing was weakened to get here.** The floor guard is clean: no `type: ignore`, no `noqa`, no
  skipped test, no stub. The two tests the review called vacuous were rewritten and then mutation-
  checked (see `mutations.md`).
