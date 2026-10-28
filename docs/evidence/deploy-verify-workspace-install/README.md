# `Deploy staging` red on every push to main (BUG-070 — **OPEN**)

Four runs, three causes. Causes 1 and 2 are fixed; **cause 3 is open**, and main is red on this
workflow until it is. This folder is the record of all of it, so nobody has to re-derive it.

| Run | Push | Failure | Cause |
|---|---|---|---|
| [40603133483](https://github.com/haytham26/courier/actions/runs/40603133483) | `1684ea3` | `MODULE_NOT_FOUND`, `requireStack: [services/auth/src/config.ts]` | 1 — **fixed** |
| [40612562455](https://github.com/haytham26/courier/actions/runs/40612562455) | `811e7df` | the same | 1 — **fixed** |
| [40645435652](https://github.com/haytham26/courier/actions/runs/40645435652) | `4132768` | `MissingEnvError: Missing required env: AUTH_DATABASE_URL, BETTER_AUTH_URL` | 2 — **fixed** |
| [40650186974](https://github.com/haytham26/courier/actions/runs/40650186974) | `da7dd98` | `Error running Better Auth CLI: error: syntax error at or near "WHERE"`, `routine: 'scanner_yyerror'` | 3 — **OPEN** |

All four in the `Build and smoke-test the staging stack (the local VM)` job at the
`Bring the staging stack up` step. The `Deploy to the staging host` job was **skipped, correctly**,
every time: `COURIER_STAGING_HOST` is not set, so the leg printed its notice and did nothing.
**This was never a secrets problem** — the workflow already does the right thing there. It was
§17.2's nightmare: main red on every push, four times, and each cause read like something else.

## Cause 1 — the migration ran on a host with no `node_modules` (fixed)

`infra/deploy.sh:migrate_auth` ran `npx auth migrate --yes --config src/migrate.config.ts` on the
runner, and the config chain is:

```
services/auth/src/migrate.config.ts:24  import { loadConfig } from "./config.js"
services/auth/src/config.ts:8           import { z } from "zod"
```

A GitHub runner checks out the tree with **no `node_modules`**, so jiti/c12's module loader raised
the raw `MODULE_NOT_FOUND`. The first fix added `pnpm install --frozen-lockfile` to the verify leg,
which removed the cause — and exposed the second.

## Cause 2 — the migration ran where the service's configuration does not exist (fixed)

With the workspace installed, the CLI loaded the service's own validated configuration
(`loadConfig` in `src/config.ts`) and stopped on `AUTH_DATABASE_URL` and `BETTER_AUTH_URL`.
`infra/compose.staging.yml:169-170` gives those two variables to the **auth container**
(`BETTER_AUTH_URL: https://${COURIER_DOMAIN}`,
`AUTH_DATABASE_URL: postgresql://…@postgres:5432/…`). `infra/ci-staging.env` carries neither, and
the host shell has no business inventing them: the compose file is the one definition of the
service's environment.

**The fix for causes 1 and 2 together:** the migration now runs **inside the auth image, on the
compose network** — `run_compose run --rm --no-deps -T auth_a npx --yes auth migrate --yes --config
src/migrate.config.ts`. The image carries the service's own source and its dependencies
(`services/auth/Dockerfile`), the service's compose environment is the container's environment,
and `postgres:5432` resolves inside the network. The host needs nothing but Docker, which is the
same on a runner and on the founder's VM. The pnpm install and the gate that pinned it were removed
with it: a gate over an install the workflow no longer performs is a gate over nothing.

## Cause 3 — the CLI generates SQL this Postgres rejects (**OPEN**)

With the migration inside the image, it connects to postgres and the CLI's own generated statement
fails the server's parser:

```
Error running Better Auth CLI: error: syntax error at or near "WHERE"
  severity: 'ERROR',
  routine: 'scanner_yyerror'
```

What is already established: it is **not** a connection, **not** a missing variable, and **not** a
permission — the CLI reached the database and sent a statement the server parsed. So it is the
CLI's generated SQL against this Postgres (`infra/postgres/Dockerfile`, built from
`postgres:16-3.6-pgvector`), and `syntax error at or near "WHERE"` means the statement's text
around the `WHERE` keyword is what to read.

**The next experiment (the only one left to run):** reproduce it locally, where the statement can
be read —

```
docker run --rm -d --name cc-probe -e POSTGRES_PASSWORD=x -e POSTGRES_USER=courier -e POSTGRES_DB=courier postgres:16-3.6-pgvector
# then, from services/auth, with AUTH_DATABASE_URL and BETTER_AUTH_URL pointed at it:
AUTH_DATABASE_URL=postgresql://courier:x@127.0.0.1:5432/courier BETTER_AUTH_URL=http://localhost:3001 \
  npx --yes auth migrate --yes --config src/migrate.config.ts
```

The CLI logs the SQL it runs; the statement the error names is the answer, and the decision after
it is either a Better Auth version/behaviour question (its SQL generation against Postgres 16) or a
grammar the local image should not be imposing. Until it is answered the row stays `open`, because
the register must be true.

## The gates that pass

`bash -n infra/deploy.sh` parses; `node --test "scripts/*/__tests__/*.test.mjs"` 53/53;
`check-workflows.mjs` 10 workflows; `check-doc-links.mjs` 38 links;
`check-conflict-markers.mjs` and `check-control-chars.mjs` 1243 files each; `check-floor.mjs` clean
against `origin/main`. **None of them is a proof for cause 3**, and the register says so.
