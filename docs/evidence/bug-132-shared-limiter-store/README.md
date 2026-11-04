# Evidence — BUG-132: the rate limiter's store is shared (the second half)

**Step:** BUG-132's store half (the env-exposure half landed on `c1-auth-mediums`) ·
**Branch:** `bug-132-shared-limiter-store` · **Date:** 2026-11-04 ·

## What landed

The env-exposure half made the limiter's switch, window and bound the
deployment's; this is the store half.

- `services/auth/src/config.ts`: `AUTH_RATE_LIMIT_STORAGE` (`memory` or
  `database`, anything else refused), defaulting to **`database` in production**
  and `memory` outside it (dev and the tests).
- `services/auth/src/options.ts`: hands it to Better Auth as
  `rateLimit.storage`. The library's own shared backend is the database
  (`createDatabaseStorageWrapper`, its adapter, and a prune of expired rows);
  Better Auth's migration adds the `rateLimit` table when this store is selected
  (`get-tables.mjs`), so `npx auth migrate` with the production environment
  creates it — recorded in `src/migrate.config.ts`'s docstring.
- `infra/compose.prod.yml` and `infra/compose.staging.yml`:
  `AUTH_RATE_LIMIT_STORAGE: ${AUTH_RATE_LIMIT_STORAGE:-database}` on **both**
  auth replicas, with the reason in a comment; `infra/env.example` and the root
  `.env.example` document the variable.

Effect: the counters live in the database the replicas already share, so
`auth_a` and `auth_b` count into one bucket per key instead of two in-process
`Map`s; a restart no longer resets them; and the `customRules` (the credential
endpoints' strict numbers) are enforced across the fleet.

## Red first (PLAYBOOK §14)

```
$ vitest run src/__tests__/config.test.ts src/__tests__/rate-limit-storage.test.ts
error TS2339: Property 'storage' does not exist on type
  '{ enabled: boolean; window: number; max: number; customRules: ... }'
(the field did not exist: the config construction, the option and both suites)
```

## Green

```
$ vitest run src/__tests__/config.test.ts src/__tests__/rate-limit-storage.test.ts
Test Files  2 passed (2)      Tests  29 passed (29)

$ vitest run                       # the whole auth service
Test Files  15 passed (15)        Tests  127 passed (127)

$ tsc --noEmit                     # services/auth
(clean)

$ node --test "scripts/*/__tests__/*.test.mjs"
ℹ pass 151  ℹ fail 0               (2 skipped, pre-existing)

$ node scripts/ci/check-parity.mjs --base origin/main
312 parity rows ... 167 bug rows ...; BUG-132 → fixed, unique
```

## Gates

| Gate | Command | Result |
|---|---|---|
| auth suite | `vitest run` (services/auth) | 127 passed, 15 files |
| typecheck | `tsc --noEmit` | clean |
| scripted suite | `node --test scripts/*/__tests__/*.test.mjs` | 151 passed |
| registers | `check-parity.mjs --base origin/main` | clean |
| floor / mojibake / conflicts | the three gates | clean |
| CI | the PR's checks | see the PR |

## Not verified here

The live two-replica behaviour (that `auth_a` and `auth_b` now share one bucket)
is not exercised in this environment: it needs the staging stack with two
replicas and the migrated `rateLimit` table. What is proven is the wiring — the
env, the option and the migration's table — pinned by the suites above. The
deploy (`scripts/infra`, the deploy script) runs `npx auth migrate` with the
service's own environment, which is where the table is created.
