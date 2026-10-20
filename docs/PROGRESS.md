# PROGRESS — Courier Copilot (rewritten 2026-10-20 from PHASE 1 audit)

Evidence: `docs/evidence/audit/`, `docs/evidence/phase-2.1/`. Details: `docs/AUDIT.md`.
Previous PROGRESS.md claims were not trusted and have been replaced.

| step ID | status | branch/PR | tests (pass/total) | blocker | next |
|---|---|---|---|---|---|
| PHASE0-read-docs | done | main @16afb8d | n/a (docs) | — | — |
| PHASE1-audit | done | main @e59379e | see audit logs | — | — |
| PHASE2.1 Better Auth | **done** | feat/2.1-better-auth-service | services/auth 31/31, api 23/23, shared 62/62 | runtime HTTP + Postgres path NOT VERIFIED (no server/DB here) | — |
| PHASE2.2 themes | **done** | feat/2.2-unistyles-themes | design-tokens 27/27, workspace 101/101, mobile 6/6 | Unistyles native runtime NOT VERIFIED (no emulator/CI yet) | — |
| PHASE2.3 address engine | **done** | feat/2.3-address-correction | api 48/48 (24 address tests) | LINZ accuracy NOT VERIFIED (data/linz empty) | — |
| PHASE2.4 cleanup + lint | **done** | feat/2.4-cleanup-and-lint | workspace 107 + api 48 | mobile lint still off (BUG-045) | — |
| PHASE3.1 CI + emulator | **done** | feat/v4-company-bootstrap (PR #1) | workflows + Maestro + B.7 screen | the emulator job was still running at the last check | link a green run |
| V4 bootstrap | **done** | feat/v4-company-bootstrap (PR #1) | CONSTRAINTS.md, PARITY.md, design/SYSTEM.md, 10 squads, PR template, floor/coverage/licence/audit gates | the mutation harness lands with the first squad task | T2 |
| 0.1 repo setup | partial | — | not verified | root package.json now pinned (2.1) | pin remaining ranges |
| 0.3 docker infra | not verified | — | — | not run in audit | run docker compose |
| 0.4 local secrets | partial | — | not verified | scripts/check-secrets not tested | test scripts |
| 0.5 CI pipeline | not verified | — | — | `.github/workflows/` is empty | write CI workflow |
| A.2 shared packages | done | main | shared 26/26, design-tokens 19/19, nz-address 17/17 | — | — |
| A.3 Better Auth | **done** | feat/2.1-better-auth-service | 31/31 + 23/23 | Postgres path NOT VERIFIED | docker-compose run |
| A.4 OpenSpec | not verified | — | — | `openspec/` is empty | write specs |
| B.1 Expo app | partial | feat/2.2-unistyles-themes | 6/6 (auth) | no jest before this phase; now wired | add screen tests |
| B.2 design system | **done** | feat/2.2-unistyles-themes | design-tokens 27/27 | Unistyles native runtime NOT VERIFIED (no emulator) | — |
| B.3 navigation | partial | — | 0 tests | no tests | add tests |
| B.4 voice module | stub | — | 0 tests | not implemented | later |
| B.5 maps | not started | — | — | — | — |
| B.6 sync engine | not started | — | — | — | — |
| B.7 compat test | **NOT VERIFIED** | feat/3.1-ci-and-android-e2e | compat screen + Maestro flows written | the emulator run was not observed (no `GITHUB_TOKEN`); sherpa models and the PMTiles archive are missing | link a green run |
| C.1 LINZ import | partial | — | — | `data/linz/` empty → FOUNDER_TODO entry | founder to provide |
| C.2 address correction (D8) | **done** | feat/2.3-address-correction | 24 address tests, 100% over the 87-address fixture | LINZ ground truth NOT VERIFIED | wire into the API |
| C.3–G.4 remaining | not started | — | — | — | — |

## Current verified check results

| check | result | evidence |
|---|---|---|
| pnpm install | PASS (workspace: apps/mobile, packages/*, services/auth) | phase-2.4 logs |
| pnpm lint | **PASS** for every JS package (shared flat config in packages/eslint-config) + ruff for the API | phase-2.4/lint.log |
| pnpm typecheck | **PASS** for 6 packages (incl. the mobile app) + mypy (16 files) | phase-2.4/typecheck.log |
| pnpm test | **PASS**: shared 26, design-tokens 27, nz-address 17, services/auth 31, mobile 6, api 48 | phase-2.4/test.log |
| apps/api pytest | PASS 48/48 | phase-2.4/test.log |
| apps/api ruff | PASS | phase-2.4/lint.log |
| apps/api mypy | PASS 16 files | phase-2.4/typecheck.log |
| pnpm audit | 3 critical cleared (vitest 2.1.9 → 3.2.7); remaining are build-time only (metro/vite/esbuild) | phase-2.1/pnpm-audit.json |
| banned-item grep | **0 hits** (was 41) | phase-2.4/banned-grep.log |

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
1. Merge PR #1 once the Android emulator job is green (the other gates are already green).
2. T2 — the Expo version decision (D21): either the SDK 57 downgrade or the ADR that proves
   SDK 58 with every native module, then DECISIONS.md.
3. T3 — the emulator run green, the artifacts downloaded into `docs/evidence/b7/`, B.7 marked PASS.
4. T4 — the real LINZ addresses (`scripts/fetch-linz.py`) and the ≥95 % accuracy report.
5. T5 — the offline Canterbury PMTiles.
6. T6 — the design to the approved mockups.
7. T7 — the product itself (sync, routing, door memory, dictation, voice agent, web, billing, PIA).
