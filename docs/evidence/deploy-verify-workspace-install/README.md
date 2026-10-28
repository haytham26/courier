# The deploy verify leg installs the workspace (BUG-070)

`Deploy staging` was red on **every push to main**: runs
[40603133483](https://github.com/haytham26/courier/actions/runs/40603133483) and
[40612562455](https://github.com/haytham26/courier/actions/runs/40612562455). This folder holds
what the failure was, why it was not the OCI secrets, and what proves the fix.

## The failure, exactly

```
Build and smoke-test the staging stack (the local VM)   FAILED
  step: Bring the staging stack up
    bash infra/deploy.sh apply --from infra/ci-staging.env
      -> migrate_auth: npx --yes auth migrate --yes --config src/migrate.config.ts
  code: 'MODULE_NOT_FOUND',
  requireStack: [ '/home/runner/work/courier/courier/services/auth/src/config.ts' ]
  ##[error]the auth migration failed: the deploy stops here, and no image is changed
```

The `deploy` job was **skipped**, correctly: `COURIER_STAGING_HOST` is not set, so the leg printed
its notice and did nothing. **This was not a secrets problem** — the workflow already does the
right thing there. It was §17.2's worst case: main red, on every push, for a cause nobody could
read.

## The cause

A GitHub runner checks out the tree with **no `node_modules`**. The auth service's migration runs
on the runner, and its config module chain is:

```
services/auth/src/migrate.config.ts:24  import { loadConfig } from "./config.js"
services/auth/src/config.ts:8           import { z } from "zod"
```

`zod` is a real dependency (`services/auth/package.json`), but nothing ever installed it on the
runner, so jiti/c12's module loader raised a raw `MODULE_NOT_FOUND`. The script's own comment
claimed "the workspace's node_modules is what resolves better-auth" — true only after an install
that no CI job performed. `zod` being named in the `requireStack` was the whole diagnosis.

## The fix

1. **`.github/workflows/deploy.yml`** — the verify leg now runs `pnpm/action-setup`,
   `actions/setup-node` (both pinned by SHA, the same versions `ci.yml` uses) and
   `pnpm install --frozen-lockfile` **before** anything calls `deploy.sh`. The lockfile pins the
   same tree CI installs, so the runner and a developer run one procedure.
2. **`infra/deploy.sh`** — `migrate_auth` gained a named guard: when
   `services/auth/node_modules/zod` is absent, it fails with the dependency's name and the exact
   command. A missing dependency is now a missing `pnpm install`, in words, instead of a raw
   loader error.

## Red first (PLAYBOOK §14)

The check (a script under the approved temp folder, kept here as text because the repository's
shell and workflow checks are gates, not tests) asserts the ordering in `deploy.yml`:

```
node deploy-yaml-test.mjs <the deploy.yml under test>
```

| Tree | Result |
|---|---|
| `origin/main`'s `deploy.yml` (before the fix) | **FAIL** — "the verify leg has no step that installs the workspace's dependencies" |
| this branch's `deploy.yml` | **PASS** — the install step is before the deploy script, and it runs `pnpm install --frozen-lockfile` |

For the script's guard: `bash -n infra/deploy.sh` parses, and the guard's message was run through
a real shell with a non-existent `ROOT` — exit 1, the named reason printed.

## The gates

`check-workflows.mjs` (10 workflows, the new steps carry only keys GitHub accepts),
`check-doc-links.mjs` (38 links), `check-conflict-markers.mjs` (1241 files),
`check-control-chars.mjs` (1241 files), `check-floor.mjs` (clean against origin/main).
