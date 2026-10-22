# The evidence of the repository hygiene (MASTER_EXECUTION section 16)

Date: 2026-10-22
Branch: `chore/repo-structure` (from `feat/v4-company-bootstrap`)
Scope: the repository structure, the dead code, the test convention, the dev-only screens.

Every gate of the section 16.3 list that can run on this machine was run here. The Android E2E on
the CI emulator and the services in docker compose are the two that cannot: the emulator runs on
the GitHub Actions runner, and the compose file has no service definition for the API, the auth
service or the voice service (they start with uvicorn and tsx, per `docs/operations/RUNBOOK.md`).

| Log | The command | The result |
|---|---|---|
| `install.log` | `corepack pnpm install --frozen-lockfile` | PASS: 7 workspace projects, the lockfile is up to date |
| `typecheck.log` | `corepack pnpm typecheck` | PASS: 6 packages, mypy 28 files (the API) and 38 files (the voice service) |
| `lint.log` | `corepack pnpm lint` | PASS: ESLint on every package, ruff on the API and the voice service |
| `test.log` | `corepack pnpm test` | PASS: shared 26, design-tokens 1767, nz-address 17, auth 59, mobile 339, api 140, voice 166, the scripts 9 |
| `coverage.log` | `node scripts/ci/run-coverage.mjs` | PASS: 84.2 % overall (floor 81 %), the address engine 81.3 % (81), the auth service 90.7 % (88), the voice service 92.4 % (85) |
| `floor.log` | `node scripts/ci/check-floor.mjs origin/main` | PASS: clean, no new suppression, skipped test, `any` or stub |
| `links.log` | `node scripts/ci/check-doc-links.mjs` | PASS: 35 relative links of the live documentation resolve; the history is skipped on purpose |
| `licences.log` | `node scripts/ci/check-licenses.mjs` | PASS: 31 packages, no forbidden licence |
| `eval-voice.log` | `node scripts/eval/check-voice-eval.mjs` | PASS: 600 scripts, 840 planned files, 240 addresses, 3 shift simulations |
| `eval-scanner.log` | `node scripts/eval/check-scanner-eval.mjs` | PASS: 330 labels, 40 slots for the founder, 330 images drawn |
| `dev-screens.log` | `node scripts/dev/check-dev-screens.mjs` | PASS: the release bundle carries neither the design lab nor the compatibility screen, and the lab build carries both |

## The counts

The test counts are the same before and after the restructure: the tests moved, they did not change.

| Suite | Before | After |
|---|---|---|
| `packages/shared` | 1 file, 26 tests | 1 file, 26 tests |
| `packages/nz-address` | 1 file, 17 tests | 1 file, 17 tests |
| `packages/design-tokens` | 6 files, 1767 tests | 6 files, 1767 tests |
| `services/auth` | 9 files, 59 tests | 9 files, 59 tests |
| `apps/mobile` (jest) | 25 suites, 339 tests | 25 suites, 339 tests |
| `services/api` (pytest) | 140 tests | 140 tests |
| `services/courier-voice` (pytest) | 166 tests | 166 tests |
| `scripts` (node --test) | 9 tests | 9 tests |
| **Total** | **2523** | **2523** |

## The coverage measurement

The coverage now excludes the `__tests__` folders. The old layout kept the test helpers outside
the source tree, so they were never counted; the new layout puts them next to the code, and
counting them would have raised the number without testing anything. The floor is unchanged
(`docs/plan/CONSTRAINTS.md`), and the measured overall number went from 86.1 % to 84.2 %: the
measurement is the same one as before, minus the test code.

## What is not here

- The Android E2E on the CI emulator: the emulator is not allowed on a developer machine, and the
  workflow that runs it is on its own branch (`feat/p1-emulator-pipeline`). That build needs
  `EXPO_PUBLIC_E2E=1` for the compatibility screen.
- The services in docker compose: `docker-compose.yml` carries the infrastructure (Postgres,
  Valkey, Valhalla, LiveKit, MinIO, GlitchTip, Uptime Kuma, Langfuse), not our three services.
- The Semgrep, the CodeQL and the gitleaks runs: they are in the CI (the `quality-gates`, the
  `CodeQL` and the `secrets` jobs of `.github/workflows/`).
