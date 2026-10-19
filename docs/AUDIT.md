# AUDIT — PHASE 1 (2026-10-20, partial)

Logs: `docs/evidence/audit/`.

## Commands run

| Command | Result | Evidence |
|---|---|---|
| `pnpm install` (first) | FAIL: Windows path collision in `node_modules/.pnpm` | pnpm-install.log |
| `pnpm install` (after removing node_modules) | PASS (exit 0) | pnpm-install-retry.log |
| `pnpm -r typecheck` | PASS (design-tokens, nz-address, shared) | typecheck.log |
| `pnpm -r lint` | FAIL: no `eslint.config.*` in packages (ESLint 9) | lint.log |
| `pnpm -r test` | PASS: shared 26/26, design-tokens 19/19, nz-address 17/17 | test.log |
| `uv run pytest` (apps/api, full) | FAIL at collection: `tests/auth/test_better_auth.py` needs `greenlet` | pytest-api.log |
| `uv run pytest` (apps/api, excl. auth test) | PASS: 6/6 | pytest-api-ignoring-auth.log |
| `services/auth` `pnpm test` | FAIL: install blocked by pnpm minimumReleaseAge policy; vitest not installed | auth-service-test.log |
| `apps/mobile` `pnpm test --passWithNoTests` | exit 0 but **no tests exist** (vacuous) | mobile-test.log |

## Step-by-step status (vs docs/PROGRESS.md)

| Step | Real status |
|---|---|
| 0.x repo / docker / secrets / CI | partial: repo + .env.example present; CI and docker not verified in this audit |
| A.2 shared packages | done (evidence: test.log, 62/62) |
| A.3 Better Auth | **fake/stub**: `apps/api/app/auth/better_auth.py` is a Python reimplementation; `services/auth` exists but is untracked and its tests cannot run |
| A.4 OpenSpec | not verified |
| B.1 Expo app | partial: `apps/mobile` has no tests; `compat-test-imports.js` and `test-imports.js` duplicates present |
| B.2 design system | **partial**: theme still uses `var(--...)` per RESUME.md (not yet grep-verified) |
| B.3 navigation | partial, no tests |
| B.4 voice module | partial/stub |
| B.7 compat | **NOT VERIFIED** (no emulator run in this audit) |
| C.1/C.2 addresses | partial: FTS5 + D8 correction engine missing |
| all others | not started |

## Banned / hygiene findings

- `package.json` root devDependencies use `"latest"` (turbo, prettier, typescript, eslint, @types/node, typescript-eslint) — violates version-pin rule. Observed resolved: typescript 7.0.2, eslint 10.13.0, turbo 2.11.9.
- `packageManager: pnpm@12.14.0` — local `pnpm` resolves to 12.14.0; verify this is intentional.
- `apps/api/pyproject.toml` lists **banned/unwanted** deps: `redis>=5.0`, `arq>=0.23` (FINAL_PROMPT forbids Arq+Redis; Hatchet is the job runner), `python-jose`, `passlib` (auth must be Better Auth), `anthropic`.
- `apps/api/pyproject.toml` `litellm>=1.83.0` is a range, not a hash-locked pin (requirement is hash-locked).
- `apps/mobile/package.json` contains `better-auth`, `react-native-sherpa-onnx`, `react-native-vision-camera`, etc. Several versions are unpinned caret ranges; `expo ~58.0.14` is the SDK the kickoff says is locked at **57** — **conflict to resolve with an ADR** (not changed in this phase).
- `apps/mobile` package also depends on `@types/react-native@^0.73` next to RN 0.88 — suspicious, to verify.
- `apps/api/courier_api.egg-info/` present in working tree (gitignore fix pending, PHASE 2.4).
- `cleanup_avd.py` at repo root (move to `scripts/`, PHASE 2.4).
- `apps/mobile/test-imports.js` and `compat-test-imports.js` (duplicate, PHASE 2.4).
- `apps/mobile/global.css` (NativeWind-style leftover) — to be checked by grep for NativeWind.
- `services/auth/` is untracked (`??`) — never committed.
- Not yet grepped: `var(--`, emoji icons, munim-maps, expo-av, expo-background-fetch, PowerSync, Supabase, gpt4free, default secret fallbacks. **TODO in next audit pass.**

## Environment

- Python 3.11 system install is corrupted (stdlib missing when run from `apps/api`); `uv 0.13.1` installed to `~/.local/bin` works and manages Python 3.12 venvs.
- `pnpm` installed globally as v12.14.0 via npm; `pnpm` minimumReleaseAge policy rejects packages published <8h ago (blocks services/auth install).
- Android SDK: `ANDROID_HOME=C:\Android` set; `adb`, `emulator`, `sdkmanager` not on PATH. Emulator not verified.

## Next actions (not done yet)

1. grep banned items and `var(--` (record in docs/evidence/audit/grep.log).
2. Fix PROGRESS.md to match this table.
3. PHASE 2.1 Better Auth: resolve services/auth install and tests.

## Banned-item grep (docs/evidence/audit/grep-banned.log)

Pattern: `var(--|munim-maps|expo-av|expo-background-fetch|PowerSync|Supabase|NativeWind|gpt4free|g4f` in apps, packages, services, scripts. 7 files match:
- apps/mobile/app/(tabs)/settings.tsx
- apps/mobile/App.js
- apps/mobile/global.css
- apps/mobile/src/constants/theme.ts
- packages/design-tokens/src/index.ts
- packages/design-tokens/src/themes.ts
- packages/design-tokens/src/tokens.ts

Not yet inspected per-line; `var(--` in RN code must be removed in PHASE 2.2.
