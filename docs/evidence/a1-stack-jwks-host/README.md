# BUG-164 — the a1 stack's api container exits 1 at boot (run 41356105462)

Filed and fixed on `feat/a1-slice-3-run-store` (PR #135), 2026-11-02, lead session 13.

## The red on the runner

Run [41356105462](https://github.com/haytham26/courier/actions/runs/41356105462), head
`83bb88f`, job "A1: the app against the real API (no mock)" (job 124996361765):

- CI, Quality gates, Restore test, CodeQL and **both** mock legs (api-34, api-35) were
  green on the same head.
- The a1 job's stack step failed: after `docker compose -f infra/compose.ci.yml up -d
  --wait`, the log printed `container courier-ci-api-1 exited (1)` — and nothing else,
  because `--wait` does not print the container's logs.
- The Better Auth migrate before it completed ("migration was completed successfully";
  the "Database schema mismatch" ERROR line in the log is the migrate CLI detecting
  the missing tables it then created — auth became Healthy).
- The flow steps were skipped, and the `if: always()` assert found `delivery_events: 0`.

## The root cause

The merge of origin/main into the branch (`e04b5aa`) brought in BUG-131's allow-list in
`services/api/app/auth/jwks.py`: a plaintext `http://` `AUTH_JWKS_URL` now refuses to
boot unless its host is loopback or named in `AUTH_JWKS_INTERNAL_HOSTS`.
`infra/compose.ci.yml` sets `AUTH_JWKS_URL: http://auth:3001/api/auth/jwks` and never set
`AUTH_JWKS_INTERNAL_HOSTS` — the BUG-131 change updated `compose.prod.yml`,
`compose.staging.yml` and `infra/env.example`, and missed the CI stack. So
`get_auth_settings()` at import (`services/api/app/main.py:99`) raised
`RuntimeError: Invalid auth configuration` and uvicorn exited 1.

## The local red, then the green

Same three commands the job runs, against the working tree:

```
docker compose -f infra/compose.ci.yml up -d --wait postgres valkey
docker compose -f infra/compose.ci.yml run --rm --no-deps -T auth \
  npx --yes auth@1.7.10 migrate --yes --config src/migrate.config.ts
docker compose -f infra/compose.ci.yml build api        # the trap: up reuses a cached image
docker compose -f infra/compose.ci.yml up -d --wait     # exit 1 without the fix line
```

Red (image rebuilt from the branch's code, `AUTH_JWKS_INTERNAL_HOSTS` absent from the
compose file), `docker compose logs api`:

```
  File "/app/app/main.py", line 99, in <module>
    get_auth_settings()
  File "/app/app/auth/jwks.py", line 347, in get_auth_settings
    raise RuntimeError(f"Invalid auth configuration: {exc}") from exc
RuntimeError: Invalid auth configuration: 1 validation error for AuthSettings
  Value error, AUTH_JWKS_URL is plaintext http and its host is not listed in
  AUTH_JWKS_INTERNAL_HOSTS: 'http://auth:3001/api/auth/jwks' ...
```

Green (the fix line added): `up -d --wait` exit 0; `ps` shows all four containers
healthy; `GET http://127.0.0.1:8000/healthz` → 200
`{"status":"ok","version":"e2e",...}`; `GET http://127.0.0.1:3001/api/auth/jwks` → 200
with the ES256 key; `GET /auth/me` without a token → 401 as it should.

Repro trap worth recording: `docker compose up` does not rebuild an existing
`courier-ci-api` image, so a locally cached image built from the pre-BUG-131 code boots
fine and the repro lies. `docker compose -f infra/compose.ci.yml build api` first.

## The fix (all in PR #135)

1. `infra/compose.ci.yml`: `AUTH_JWKS_INTERNAL_HOSTS: auth` on the api service, with a
   comment naming BUG-131 and the run that proved the cost of missing it.
2. `.github/workflows/android-e2e.yml`: the a1 stack step now dumps
   `docker compose logs --no-color --tail 200 api auth` when `up -d --wait` fails, so
   the next exit-1 names its reason in the job log itself.
3. `scripts/ci/check-auth-issuer.mjs` (already a quality-gate over every
   `infra/compose*.yml`): new BUG-131 rule — an API block's plaintext JWKS host must be
   loopback or listed in that block's `AUTH_JWKS_INTERNAL_HOSTS` (an override's
   default counts as the value). Red-first: on the pre-fix tree the CLI printed
   `compose.ci.yml: the API refuses to boot with AUTH_JWKS_URL
   http://auth:3001/api/auth/jwks: plaintext http and host 'auth' is not listed in
   AUTH_JWKS_INTERNAL_HOSTS (BUG-131)` and exited 1; after the fix,
   `check-auth-issuer: one issuer and a listed JWKS host across 3 compose files`, and
   `node --test scripts/ci/__tests__/check-auth-issuer.test.mjs` is 14/14 (four new
   tests: the CI-stack shape flagged, the prod override clean, https/loopback/listed
   clean, operator-env host not guessed at).

Register: BUG-164 in `docs/status/BUGS.md`, `fixed` with this evidence.
