# `Deploy staging` red on every push to main (BUG-070)

Three runs, two causes, one fix for the class.

| Run | Push | Failure |
|---|---|---|
| [40603133483](https://github.com/haytham26/courier/actions/runs/40603133483) | `1684ea3` | `MODULE_NOT_FOUND`, `requireStack: [services/auth/src/config.ts]` |
| [40612562455](https://github.com/haytham26/courier/actions/runs/40612562455) | `811e7df` | the same |
| [40645435652](https://github.com/haytham26/courier/actions/runs/40645435652) | `4132768` (after the first fix) | `MissingEnvError: Missing required env: AUTH_DATABASE_URL, BETTER_AUTH_URL` |

All three in the `Build and smoke-test the staging stack (the local VM)` job, at the
`Bring the staging stack up` step. The `Deploy to the staging host` job was **skipped, correctly**,
in every one of them: `COURIER_STAGING_HOST` is not set, so the leg printed its notice and did
nothing. **This was never a secrets problem** — the workflow already does the right thing there.
It was §17.2's nightmare: main red on every push, for three runs, for a cause nobody could read.

## Cause 1 — the migration ran on a host with no `node_modules`

`infra/deploy.sh:migrate_auth` ran `npx auth migrate --yes --config src/migrate.config.ts` on the
runner, and the config chain is:

```
services/auth/src/migrate.config.ts:24  import { loadConfig } from "./config.js"
services/auth/src/config.ts:8           import { z } from "zod"
```

`zod` is a real dependency (`services/auth/package.json`), but a GitHub runner checks out the tree
with **no `node_modules`**, so jiti/c12's module loader raised the raw `MODULE_NOT_FOUND`. The
first fix added `pnpm install --frozen-lockfile` to the verify leg, which removed this cause — and
exposed the second.

## Cause 2 — the migration ran where the service's configuration does not exist

With the workspace installed, the CLI loaded the service's own validated configuration
(`loadConfig` in `src/config.ts`) and stopped on:

```
[#better-auth]: Couldn't read your auth config.
MissingEnvError: Missing required env: AUTH_DATABASE_URL, BETTER_AUTH_URL
```

`infra/compose.staging.yml:169-170` gives those two variables to the **auth container**
(`BETTER_AUTH_URL: https://${COURIER_DOMAIN}`, `AUTH_DATABASE_URL: postgresql://…@postgres:5432/…`).
`infra/ci-staging.env` carries neither, and the host shell has no business inventing them — the
compose file is the one definition of the service's environment, and the migration was reading a
second, invented one.

## The fix — one place, one configuration

The auth migration now runs **inside the auth image, on the compose network**:

```bash
run_compose run --rm --no-deps -T auth_a \
  npx --yes auth migrate --yes --config src/migrate.config.ts
```

- the image carries the service's own source and its dependencies (`services/auth/Dockerfile`
  copies the tree and pnpm's `node_modules`);
- the service's compose environment is the container's environment, so `AUTH_DATABASE_URL`,
  `BETTER_AUTH_URL` and `BETTER_AUTH_SECRET` are the ones the service itself will run with;
- `postgres:5432` resolves inside the compose network, so no port is published on the host;
- the host needs nothing but Docker, which is the same on a runner and on the founder's VM.

The `pnpm install` added to the verify leg for cause 1 was removed with it, and the gate that
pinned that install (`scripts/ci/check-deploy-verify-installs.mjs`) was removed too: a gate over an
install the workflow no longer performs is a gate over nothing. The prevention now lives in the
script itself, in the comment that names all three runs, and in this folder.

## Red first

The intermediate gate was red against `origin/main`'s workflow and green against the fixed one
(`the verify leg has no step named "Install the workspace"`), and its 7 tests passed on the branch.
They were deleted with the gate they existed to prove, because the final fix does not need them:
with the migration inside the image, the host never runs Node at all. What replaces them is the
proof of this PR's own push to main — the verify leg gets past `Bring the staging stack up` for the
first time.

## The gates

`bash -n infra/deploy.sh` parses; `node --test "scripts/*/__tests__/*.test.mjs"` 53/53;
`check-workflows.mjs` 10 workflows; `check-doc-links.mjs` 38 links;
`check-conflict-markers.mjs` and `check-control-chars.mjs` 1241 files each; `check-floor.mjs`
clean against `origin/main`.
