# PROGRESS — Courier Copilot (rewritten 2026-10-20 from PHASE 1 audit)

Evidence: `docs/evidence/audit/`, `docs/evidence/phase-2.1/`. Details: `docs/AUDIT.md`.
Previous PROGRESS.md claims were not trusted and have been replaced.

| step ID | status | branch/PR | tests (pass/total) | blocker | next |
|---|---|---|---|---|---|
| PHASE0-read-docs | done | main @16afb8d | n/a (docs) | — | — |
| PHASE1-audit | done | main @e59379e | see audit logs | — | — |
| PHASE2.1 Better Auth | **done** | feat/2.1-better-auth-service | services/auth 31/31, api 23/23, shared 62/62 | runtime HTTP + Postgres path NOT VERIFIED (no server/DB here) | PHASE 2.2 |
| 0.1 repo setup | partial | — | not verified | root package.json now pinned (2.1) | pin remaining ranges |
| 0.3 docker infra | not verified | — | — | not run in audit | run docker compose |
| 0.4 local secrets | partial | — | not verified | scripts/check-secrets not tested | test scripts |
| 0.5 CI pipeline | not verified | — | — | `.github/workflows/` is empty | write CI workflow |
| A.2 shared packages | done | main | shared 26/26, design-tokens 19/19, nz-address 17/17 | — | — |
| A.3 Better Auth | **done** | feat/2.1-better-auth-service | 31/31 + 23/23 | Postgres path NOT VERIFIED | docker-compose run |
| A.4 OpenSpec | not verified | — | — | `openspec/` is empty | write specs |
| B.1 Expo app | partial | — | 0 tests in apps/mobile | no tests | add tests |
| B.2 design system | partial | — | design-tokens 19/19 | `var(--` in 5 files (grep-banned.log) | PHASE 2.2 |
| B.3 navigation | partial | — | 0 tests | no tests | add tests |
| B.4 voice module | stub | — | 0 tests | not implemented | later |
| B.5 maps | not started | — | — | — | — |
| B.6 sync engine | not started | — | — | — | — |
| B.7 compat test | NOT VERIFIED | — | — | no emulator run; CI workflows empty | PHASE 3 |
| C.1 LINZ import | partial | — | — | `data/linz/` empty | founder to provide |
| C.2 address correction (D8) | partial | — | worker test file exists, not wired | no fixtures | PHASE 2.3 |
| C.3–G.4 remaining | not started | — | — | — | — |

## Current verified check results

| check | result | evidence |
|---|---|---|
| pnpm install | PASS (workspace now includes services/auth) | phase-2.1 logs |
| pnpm -r typecheck | PASS for shared/design-tokens/nz-address/services-auth | phase-2.1 logs |
| pnpm -r lint | PASS for services/auth (flat config); other packages still use `eslint . --ext .ts` (broken on ESLint 9+) | phase-2.1 logs |
| pnpm -r test | PASS: shared 26, design-tokens 19, nz-address 17, services/auth 31 | phase-2.1 logs |
| apps/api pytest | PASS 23/23 (was 6/6 + fake auth test) | phase-2.1/api-test.log |
| apps/api ruff | PASS (was failing: invalid `FUR` selector) | phase-2.1/api-lint.log |
| apps/api mypy | PASS 14 files | phase-2.1/api-typecheck.log |
| pnpm audit | 3 critical cleared (vitest 2.1.9 → 3.2.7); remaining are build-time only (metro/vite/esbuild) | phase-2.1/pnpm-audit.json |
| banned-item grep | 41 hits left, all PHASE 2.2 / 2.4 scope | phase-2.1/banned-grep.log |

## PHASE 2.1 what changed

- `services/auth` (new pnpm package): Better Auth 1.7.10 with plugins `organization`, `expo`,
  `jwt`; fail-fast env validation (no default secrets); ES256 JWKS at `/api/auth/jwks`;
  tokens at `/api/auth/token`; Postgres (production) or in-memory (tests) storage.
- `apps/api/app/auth/better_auth.py` + `apps/api/tests/auth/test_better_auth.py`: **deleted**
  (the fake Python auth and its test of itself).
- `apps/api/app/auth/jwks.py` (new): PyJWT verification against the JWKS, key-rotation
  aware, generic 401s; the API refuses to boot without `AUTH_JWKS_URL`.
- `apps/api/app/auth/routes.py`: now only `/auth/me` and `/auth/verify` — the API issues no
  credentials.
- Banned Python deps removed: `redis`, `arq`, `passlib`, `python-jose`; `pyjwt[crypto]` and
  `httpx` added. `apps/api/package.json` (a meaningless npm mirror of the Python deps)
  deleted.
- Workspace hygiene: root `package.json` pinned to exact versions (was `"latest"`), single
  `zod@4.6.7` across the workspace (the v3/v4 split broke Better Auth under pnpm hoisting),
  `vitest` upgraded to 3.2.7 everywhere (clears the critical advisories).

## Next (in order)
1. PHASE 2.2 Unistyles 3 light/night themes from `packages/design-tokens`, remove every `var(--`.
2. PHASE 2.3 D8 address-correction engine with a committed Christchurch fixture subset
   (`data/linz/` is empty → needs `docs/FOUNDER_TODO.md` entry).
3. PHASE 2.4 cleanup: egg-info, `cleanup_avd.py`, duplicate `test-imports.js`, ESLint flat
   config for every package, pin the remaining ranges.
4. PHASE 2.5 design to the approved mockups.
5. PHASE 3 CI + Android emulator on GitHub Actions (`.github/workflows/` is still empty).
