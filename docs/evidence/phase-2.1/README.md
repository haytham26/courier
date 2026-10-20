# PHASE 2.1 evidence — real Better Auth (Node) + JWKS verification in FastAPI

Date: 2026-10-20
Branch: `feat/2.1-better-auth-service`
Scope: FINAL_PROMPT §0-F.3.1 / KICKOFF_V2_EN.md PHASE 2.1 — "Real Better Auth (Node)
in `services/auth` (plugins organization, expo, jwt); FastAPI verifies via JWKS; no
default secrets; tests."

## What was built

| Piece | Where | Notes |
|---|---|---|
| Better Auth server (Node) | `services/auth/` | better-auth 1.7.10, plugins `organization` + `expo` + `jwt` |
| JWKS publication | `GET /api/auth/jwks` | ES256 (P-256) public keys, `kid` per key, no private material |
| Token issuance | `GET /api/auth/token` | `iss`, `aud`, `exp`, `sub` claims |
| FastAPI verification | `apps/api/app/auth/jwks.py` | PyJWT + JWKS cache, kid selection, key-rotation refresh |
| Fake Python auth | deleted | `apps/api/app/auth/better_auth.py` + `apps/api/tests/auth/test_better_auth.py` |

## Commands and results

| Command | Result | Log |
|---|---|---|
| `pnpm --filter @courier/auth test` | 31/31 passed | `auth-service-test.log` |
| `pnpm --filter @courier/auth lint` (eslint flat config) | exit 0 | `auth-service-lint.log` |
| `pnpm --filter @courier/auth typecheck` (tsc --noEmit) | exit 0 | `auth-service-typecheck.log` |
| `pnpm --filter @courier/shared --filter @courier/design-tokens --filter @courier/nz-address test` | 26+19+17 = 62/62 passed | `shared-packages-test.log` |
| `uv run --directory apps/api pytest -q` | 23/23 passed | `api-test.log` |
| `uv run --directory apps/api ruff check .` | exit 0 | `api-lint.log` |
| `uv run --directory apps/api mypy .` | exit 0, 14 files | `api-typecheck.log` |
| `pnpm audit --json` | see `pnpm-audit.json` (vitest upgraded 2.1.9 → 3.2.7 to clear the critical advisories) | `pnpm-audit.json` |
| `scripts/grep-banned.ps1` | 41 hits remain, all in PHASE 2.2 / 2.4 scope | `banned-grep.log` |

## Test coverage of the required cases

| Required by KICKOFF_V2 | Test |
|---|---|
| sign-up | `services/auth/tests/auth.test.ts` → "signs up a new driver and returns a session token" |
| sign-in | `services/auth/tests/auth.test.ts` → "signs in with valid credentials", "rejects a wrong password" |
| session | `services/auth/tests/auth.test.ts` → "returns the session for a valid session cookie", "invalidates the session on sign-out" |
| org / team | `services/auth/tests/organization.test.ts` → create org, list orgs, create team, list teams, active member role |
| JWKS verification | `services/auth/tests/jwt.test.ts` → "publishes a JWKS with a public ES256 signing key", "issues a session JWT that verifies against the published JWKS" |
| expired token rejected | `services/auth/tests/jwt.test.ts` → "rejects an expired token" (1 s lifetime) and `apps/api/tests/auth/test_jwks.py` → "test_rejects_an_expired_token" |
| invalid token rejected | `services/auth/tests/jwt.test.ts` → "rejects a malformed token", "rejects a token signed by a foreign key"; `apps/api/tests/auth/test_jwks.py` → tampered / wrong audience / wrong issuer / unknown kid |
| no default secrets | `services/auth/tests/config.test.ts` → "fails fast when the secret is missing", "refuses the in-memory database in production"; `apps/api` refuses to boot without `AUTH_JWKS_URL` |

## Security notes (security-and-hardening skill)

- No secret has a default: `BETTER_AUTH_SECRET` must be ≥ 32 chars, `AUTH_JWKS_URL` must be set.
- Rate limiting is on by default; `/sign-up/email` 10/h, `/sign-in/email` 10 per 15 min
  (`services/auth/tests/rate-limit.test.ts` proves a burst is stopped with 429).
- Errors are generic to the caller ("Invalid or expired token"); internals stay in the logs.
- `AUTH_TRUSTED_IP_HEADERS` is empty unless a trusted proxy is configured, so a
  client-supplied `x-forwarded-for` cannot be used to dodge the limiter.
- The JWKS URL is operator configuration, never user input, so it is not an SSRF sink.

## Not verified here

- The Node service was exercised through its handler, not through a live HTTP server
  bound to a port (no `POSTGRES` available in this environment). The `node:http`
  entry point (`services/auth/src/index.ts`) is therefore **NOT VERIFIED** at runtime.
- Postgres-backed storage is **NOT VERIFIED** (tests use the in-memory adapter).
- The mobile client (`apps/mobile/src/lib/auth-client.ts`, now using
  `@better-auth/expo` + `expo-secure-store`) is **NOT VERIFIED**: `apps/mobile` has no
  test runner installed and there is no emulator (PHASE 2.4 wires jest-expo + RNTL,
  PHASE 3 runs the emulator on CI). Its TypeScript errors are all in the pre-existing
  jest test file, which cannot compile until jest is installed.
- A CI run for this branch does not exist yet: `.github/workflows/` is empty
  (PHASE 3 will add the emulator workflow; a CI workflow is still to be written).
