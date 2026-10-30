# HANDOVER 2026-10-29 — the backend squad, the `Deploy staging` chain and its eight causes

Read this with `docs/log/CURRENT-backend.md`. Written before this session's
context fills, and merged through a PR so the next session starts from
`origin/main`, not from a chat.

**State at the close:** `origin/main` is `fc9a625` (PR #111 merged), and `Deploy staging` is green
on it - [40913771504](https://github.com/haytham26/courier/actions/runs/40913771504) - 4 of 4
checks, the version check among them. The whole chain this session worked is closed and proven on
main, not on a branch. The founder's instruction was that BUG-070's row flips to `fixed` only with
a green run on main; that run came and the row was flipped (PR #109 carried the register
closure, and this file's evidence folder names the run).

## 1. What this session did

1. **BUG-070's cause 3, root-caused and fixed** (PR #102): the `npx auth migrate`
   failure was never this Postgres's grammar. Better Auth's kysely adapter reads
   the SQL dialect from `database.type`; `services/auth/src/database.ts` handed
   it a bare `PostgresDialect`, which carries no type, so the adapter defaulted
   to **sqlite** and ran its sqlite introspection against PostgreSQL. The `WHERE`
   is at character **404** of the statement, which is the `position: '404'` the
   server reported — that is the proof of the statement. The fix is
   `{ type: "postgres", dialect }`.
2. **The mojibake the founder found repaired, and gated** (PR #102): three
   tracked files, 168 sequences; the reversal is byte-exact against each file's
   `origin/main` blob, and `scripts/ci/check-mojibake.mjs` runs in the floor job.
3. **B3's `response_model` half** (PR #104, PR #105): every served answer
   declares its shape; red first four of four; two wire changes pinned (D51).
4. **Causes 4, 5, 6 and 7 of the same deploy** (PR #105, PR #106): the smoke
   test's port, Caddy's upstream health check, the API's ignored `APP_VERSION`,
   and the smoke test's race with the edge it tests.
5. **BUG-110 and BUG-111 filed** (the auth healthcheck that named a route the
   service never served, and the race above).

## 2. The seven causes, in the order the runs hit them

| Run | Failure | Cause | Fixed |
|---|---|---|---|
| 40603133483 / 40612562455 | `MODULE_NOT_FOUND` `services/auth/src/config.ts` | 1 — the migration ran on a host with no `node_modules` | PR #94 |
| 40645435652 | `MissingEnvError: AUTH_DATABASE_URL, BETTER_AUTH_URL` | 2 — the CLI loaded the service's config where those variables do not exist | PR #96 |
| 40791069420 | `syntax error at or near "WHERE"` (position 404) | 3 — **see §3** | PR #102 |
| 40808382804 | `curl: (7) Failed to connect ... port 443` | 4 — the smoke test aimed at 443, the CI edge publishes 8443 | PR #105 |
| (local, pre-105) | the seed answered **503** | 5 — Caddy health-checked the API on `/health/ready`, which the API does not serve (`/healthz`) — a **production** defect, not a staging one | PR #105 |
| (local, pre-105) | the version check could never pass | 6 — the API ignored `APP_VERSION` (`version="0.1.0"` hard-coded) | PR #105 |
| 40827639050 | `curl: (35) SSL_ERROR_SYSCALL` | 7 — the smoke test didn't wait for the edge (`up -d` returns on *started*, not on *listening*) | PR #106 |

Every one of them read like something else. That is the lesson worth keeping:
a red deploy whose message names a subsystem is naming the subsystem that
*reported*, not the one that is wrong.

## 3. The evidence folders

- `docs/evidence/bug-070-auth-cli-sql/` — the cause-3 experiment, the failing
  statement, the successful migration, the tables, the idempotent rerun.
- `docs/evidence/b3-response-models/` — the response_model red-first run and the
  local reproduction of the verify leg (the stack up, the migration, the tables,
  the readiness answer).
- `docs/evidence/deploy-verify-workspace-install/README.md` — the record of the
  first four runs, rewritten with the corrected image name
  (`courier-postgres:16-3.6-pgvector`, built from `infra/postgres/Dockerfile`;
  `postgres:16-3.6-pgvector` is **not** a public image).

## 4. The traps, in the order they cost time

1. **PowerShell's text cmdlets corrupted the mojibake in the first place.**
   Write repo files with node, or with
   `[IO.File]::WriteAllText(path, text, new UTF8Encoding($false))`. The founder's
   brief says it (`docs/log/founder-brief-2026-10-24.md:66`); this session is the
   proof.
2. **The tool output layer renders UTF-8 as Latin-1**, so a proper `—` *displays*
   as `a doubled U+00E2 U+20AC U+201D`. Verify encoding at byte level (node, or `git grep -P` with a byte
   pattern), never by eye. A scan done through the console will tell you there
   is no mojibake where there is.
3. **A backtick in a shell command is command substitution somewhere in this
   harness.** It silently rewrote a source file mid-experiment; the recovery is
   `git checkout HEAD -- <file>`. Prefer writing a script file.
4. **`cd .worktrees\X` makes a nested `git worktree add .worktrees\Y`** land
   inside the other worktree. Add worktrees from the main repo's folder.
5. **A branch cut before a merge lacks the merged fix.** The first local verify
   leg against `fix/b3-response-models` reproduced BUG-070 *exactly*, because
   the branch predated PR #102. Merge `origin/main` and re-run before concluding
   anything about whether a fix works.
6. **A harness that cannot run proves nothing** (PLAYBOOK §10). Two drafts of
   the smoke test's local proof pointed `curl` at `/mingw64/bin/curl.exe` (this
   Git ships `/ucrt64/bin/curl`) and put the wrapper directory on `PATH` as
   `C:/...` (Git bash needs `/c/...`), so both "proved" a failure that was their
   own.
7. **Keyword-only parameters break `UploadFile` in FastAPI** (422 `Field
   required`) — tested, so do not reach for it to satisfy PLR0917.
8. **`importlib.reload` of `app.main` breaks the websocket routes** (the
   voice-socket tests then fail): the API's version is tested through a
   subprocess.

## 5. The order from here (the binding order, unchanged)

1. ~~Merge PR #106 and watch `Deploy staging` on main.~~ **Done.** PRs #106, #107
   and #111 carried causes 7, 8a and 8b; the run on main is green at 4 of 4 and
   BUG-070 is `fixed` in the register.
2. **B4 — mutmut at the 70 % floor** (not started). The worktree
   `.worktrees/b1028d` is on `fix/b4-mutmut` from `origin/main` for exactly this.
   The audit's done-when: mutmut runs scoped in CI at the 70 % floor over
   `services/api` (sync, runs, auth) and `services/courier-voice` (the turn
   machine).
3. **The rest of A5**: `infra/monitoring`, the backups and the restore drill on
   staging, the OCI host/key/domain (FOUNDER_TODO carries all three already).
4. **C3 — the LINZ squad toward 98 %** (the measure/fix/re-measure loop).
5. **MASTER §22**: `docs/research/2026/andee-cleanroom-spec.md` is not written
   yet, and its build follows.
6. **Then billing (D44) and the rest of queue 3.**

## 6. The state of the tree

- Worktrees: `.worktrees/b1028d` (`fix/b4-mutmut`, PR #106), `.worktrees/b1028b`
  (`fix/bug-070-auth-cli-sql`, merged and deleted on origin).
- The main working tree (`C:\Users\DCL\projects\courier-backend`, branch
  `backend`) is clean. The one uncommitted file a prior session had left there is
  committed on `preserve/response-model-test` so it is not lost (§13.2).
- Docker: no containers running. Every stack this session started was taken down
  with `down -v` after its run (the founder's 3 GB cap).
- `docs/log/2026-W43.md` and `docs/log/CURRENT-backend.md` are true at this push.
