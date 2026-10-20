# PHASE 2.4 evidence — cleanup, ESLint flat config, pinned versions

Date: 2026-10-20
Branch: `feat/2.4-cleanup-and-lint`
Scope: KICKOFF_V2_EN.md PHASE 2.4 — "Cleanup: egg-info, `cleanup_avd.py` (delete it —
local AVD work is no longer used), duplicate test-imports, pin versions, ESLint, banned deps."

## What changed

| Item | Before | After |
|---|---|---|
| ESLint | no config anywhere, `eslint . --ext .ts` (removed in ESLint 9) | shared flat config in `packages/eslint-config`, used by every JS package; `eslint .` everywhere |
| `*.egg-info/` | tracked in git | gitignored + `git rm -r --cached` |
| `cleanup_avd.py` | at the repo root | deleted (AGENTS.md forbids local AVD work) |
| `apps/mobile/test-imports.js` | duplicate of `compat-test-imports.js` | deleted (`scripts/compat-test.js` uses `compat-test-imports.js`) |
| Version pins | root used `"latest"`, packages used `^` ranges | every version pinned exactly (root, packages, mobile, services/auth) |
| `eslint . --ext .ts` in three packages | broke on ESLint 9+ | `eslint .` |
| Quality gate | `pnpm -r lint/typecheck/test` (JS only) | `pnpm lint` / `pnpm typecheck` / `pnpm test` now also run the Python API (ruff, mypy, pytest) |
| expo-router layout typings | 3 type errors (`Stack`/`Tabs` need an `id`) | fixed by passing `id` to the navigators |

## Commands and results

| Command | Result | Log |
|---|---|---|
| `pnpm lint` (turbo + ruff) | 4 JS packages + ruff: all clean | `lint.log` |
| `pnpm typecheck` (turbo + mypy) | 6 packages (incl. the mobile app) + mypy (16 files): all clean | `typecheck.log` |
| `pnpm test` (turbo + pytest) | 5 packages (101 + 6 mobile tests) + 48 API tests | `test.log` |
| `scripts/grep-banned.ps1 …` | BANNED_HITS=0 | `banned-grep.log` |
| `git check-ignore -v …` | egg-info, `.local-backup` and `node_modules` are ignored | `gitignore-check.log` |

## Test totals

- `@courier/shared` 26, `@courier/design-tokens` 27, `@courier/nz-address` 17, `@courier/auth` 31,
  `mobile` (jest-expo) 6 → **107 JavaScript/TypeScript tests**
- `apps/api` (pytest) → **48 tests**

## Not verified

- `apps/mobile` still has **no lint script**: turning it on surfaces ~45 type-aware findings in the
  voice module and the jest mocks, which belong to the voice-module work (BUG-040, BUG-045). The
  mobile app **does** run `typecheck` now, and it is green.
- The global `pnpm` on this machine is broken (its npm global install is missing), so the local
  `node_modules/.bin/pnpm` shim was repaired by running pnpm's own `install.js` inside the repo.
  CI installs pnpm with `pnpm/action-setup` and does not depend on any global install.
