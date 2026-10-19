# PROGRESS — Courier Copilot (rewritten 2026-10-20 from PHASE 1 audit)

Evidence: `docs/evidence/audit/`. Details: `docs/AUDIT.md`. Previous PROGRESS.md claims were not trusted and have been replaced.

| step ID | status | branch/PR | tests (pass/total) | blocker | next |
|---|---|---|---|---|---|
| PHASE0-read-docs | done | main @16afb8d | n/a (docs) | — | — |
| PHASE1-audit | partial | main @e59379e | see below | lint and auth not fixed | PHASE 2.1 |
| 0.1 repo setup | partial | — | not verified | root package.json uses "latest" | pin versions (ADR-001) |
| 0.3 docker infra | not verified | — | — | not run in audit | run docker compose |
| 0.4 local secrets | partial | — | not verified | scripts/check-secrets not tested | test scripts |
| 0.5 CI pipeline | not verified | — | — | not run in audit | verify workflows |
| A.2 shared packages | done | main | shared 26/26, design-tokens 19/19, nz-address 17/17 (test.log) | — | — |
| A.3 Better Auth | fake/stub | — | apps/api: test_better_auth.py fails collection (missing greenlet); services/auth tests cannot run | Python fake auth; services/auth untracked, not installable under pnpm release-age policy | PHASE 2.1 |
| A.4 OpenSpec | not verified | — | — | — | verify openspec/ |
| B.1 Expo app | partial | — | 0 tests in apps/mobile | no tests | add tests |
| B.2 design system | partial | — | design-tokens 19/19 | var(--) in theme/token files (7 files, grep-banned.log) | PHASE 2.2 |
| B.3 navigation | partial | — | 0 tests | no tests | add tests |
| B.4 voice module | stub | — | 0 tests | not implemented | later |
| B.5 maps | not started | — | — | — | — |
| B.6 sync engine | not started | — | — | — | — |
| B.7 compat test | NOT VERIFIED | — | — | no emulator run; adb/emulator not on PATH | PHASE 3 |
| C.1 LINZ import | partial | — | — | data/linz not verified | — |
| C.2 address correction (D8) | not started | — | — | missing engine | PHASE 2.3 |
| C.3–G.4 remaining | not started | — | — | — | — |

## Current verified check results

| check | result | evidence |
|---|---|---|
| pnpm install | PASS after removing node_modules (first attempt FAIL: path collision) | pnpm-install*.log |
| pnpm -r typecheck | PASS | typecheck.log |
| pnpm -r lint | FAIL (no ESLint config) | lint.log |
| pnpm -r test | PASS for 3 shared packages; apps/mobile has no tests | test.log, mobile-test.log |
| apps/api pytest (full) | FAIL at collection (test_better_auth.py) | pytest-api.log |
| apps/api pytest (excluding auth test) | PASS 6/6 | pytest-api-ignoring-auth.log |
| services/auth tests | FAIL (install blocked; vitest not installed) | auth-service-test.log |

## Next (in order)
1. PHASE 2.1 Better Auth service: install under policy, make tests run, delete `apps/api/app/auth/better_auth.py`.
2. PHASE 2.2 remove `var(--...)` from theme/token files.
3. Fix lint config, pin root versions, resolve expo SDK 57 vs ~58 conflict via ADR.
