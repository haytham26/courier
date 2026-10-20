# EXECUTOR_LOG

## 2026-10-20 — PHASE 0 summary (new lead executor)

1. Product: Courier Copilot, voice-first SaaS for independent NZ parcel couriers on fixed runs in Canterbury/Christchurch.
2. Binding spec: docs/FINAL_PROMPT.md (§0, 0-A..0-F bind); DECISIONS.md D1–D21 override everything.
3. Stack (candidates, pinned only via ADR-001): Expo SDK 57 (locked), React Native, Unistyles 3, MapLibre v11 + PMTiles, VisionCamera, sherpa-onnx, op-sqlite (SQLCipher+FTS5), Reanimated 4, FastAPI backend, Better Auth (Node, JWKS to FastAPI), Pipecat + LiveKit voice, Hatchet jobs, Valhalla+VROOM routing, Postgres+PostGIS, Next.js web.
4. Banned: NativeWind, Supabase, munim-maps, expo-av, expo-background-fetch, Redis>=7.4, PowerSync, Arq, gpt4free outside sandbox, LiteLLM 1.82.7/1.82.8.
5. Real state (from RESUME.md, unverified until PHASE 1): auth is a fake Python implementation; theme.ts uses var(--); C.2 correction engine (D8) missing; B.7 compat test NOT VERIFIED; most steps not started.
6. Repo: branch main, HEAD 9fbece5. Untracked services/auth/ exists (from previous executor) — to be audited.
7. Rules: evidence in docs/evidence/<step>/; no PASS without logs; no force-push/rebase; git pull before push; no destructive commands.
8. Local data: LINZ data expected in data/linz/ (gitignored); not present at audit start.
9. Android SDK/emulator status: to be checked in PHASE 1/3.
10. First 5 tasks: (a) PHASE 1 audit + logs; (b) rewrite PROGRESS.md; (c) fix Better Auth (2.1); (d) theme var() removal (2.2); (e) address engine D8 (2.3).

Not yet read in PHASE 0: PRODUCT_SPEC, PROJECT_BRIEF, DRIVER_INTERVIEW_1, research docs, PLAN_REVIEW (to be skimmed during PHASE 1).

## 2026-10-20 — PHASE 2 plan (lead executor, KICKOFF_V2_EN)

1. Read: KICKOFF_V2_EN, KICKOFF_PROMPT_EN, FINAL_PROMPT §0/0-A/0-F, DECISIONS D1–D21, AUDIT, PROGRESS, RESUME, TECH_STACK.
2. Product: Courier Copilot — voice-first SaaS for Canterbury/Christchurch couriers; driver runs the whole shift by voice.
3. Binding order: DECISIONS.md > COST_PLAN.md > FINAL_PROMPT.md > research docs; D21 forbids PASS without evidence in docs/evidence/<step>/.
4. Safety: work only inside C:\Users\DCL\projects\courier; no destructive commands; no local emulator (CI only); no secrets in git; no emoji icons; no banned deps.
5. Verified real state: `services/auth` does not exist at all; `apps/api/app/auth/better_auth.py` is a fake Python auth with a hardcoded default secret; `data/linz/` is empty; `openspec/`, `tests/golden/`, `.github/workflows/` are empty; no ESLint flat config; root package.json pins "latest".
6. Toolchain: node v24.21.0, pnpm 12.14.0 (via corepack), uv 0.13.3, Python 3.12 venvs; better-auth 1.7.10 already in the lockfile and store.
7. Task 1 (PHASE 2.1): real Better Auth Node service in `services/auth` (plugins organization, expo, jwt), fail-fast on missing BETTER_AUTH_SECRET, JWKS endpoint, vitest tests for sign-up/sign-in/session/org/JWKS/expired+invalid token.
8. Task 2 (PHASE 2.1 cont.): FastAPI verifies JWTs via JWKS only (PyJWT) and the fake Python auth + its fake test are deleted; banned deps (redis, arq, passlib, python-jose, anthropic) removed from apps/api/pyproject.toml; mobile moves to @better-auth/expo.
9. Task 3 (PHASE 2.2): Unistyles 3 light/night themes generated from packages/design-tokens hex values, every `var(--` removed from apps/mobile and packages/design-tokens (7 files).
10. Task 4 (PHASE 2.3): D8 address-correction engine `{original, corrected, reason, confidence, needs_question, options[]}` with a committed Christchurch fixture subset (LINZ data absent → FOUNDER_TODO); then PHASE 2.4 cleanup (egg-info, cleanup_avd.py, duplicate test-imports, exact version pins, ESLint flat config) and PHASE 2.5 mockup-accurate design; one feature branch + commit + push per item, evidence under docs/evidence/phase-2.x/.

## 2026-10-20 — PHASE 2.1 (branch `feat/2.1-better-auth-service`)

### Skills applied (AGENTS.md map)

| Step | Skills read and followed | How they changed the work |
|---|---|---|
| Session start, skill selection | `using-agent-skills` | Picked the workflow per phase instead of improvising; every phase below names its skills. |
| Scope + assumptions for the phase | `context-engineering`, `planning-and-task-breakdown` | Split PHASE 2.1 into 2.1a (Node service), 2.1b (FastAPI verification), 2.1c (dependency cleanup), 2.1d (mobile client), 2.1e (evidence/docs) and kept each slice independently verifiable. |
| Library choices (Better Auth, PyJWT, pydantic-settings, kysely) | `source-driven-development` | Read the installed `better-auth@1.7.10` type definitions and implementation (`dist/plugins/jwt`, `dist/plugins/organization`, `@better-auth/expo` package) instead of relying on memory; pinned versions from the npm/PyPI registries with publish dates. |
| Auth service + verifier logic | `test-driven-development`, `incremental-implementation` | Wrote the failing suites first (auth, organisation/team, JWKS/JWT, rate limit, config fail-fast, API verifier/routes) and then the implementation; 31 + 23 tests. |
| Token verification contract between the two services | `api-and-interface-design` | One contract only: the JWKS document (ES256, `kid`) and the claims (`iss`, `aud`, `exp`, `sub`); the API is a pure resource server. |
| Secrets, keys, rate limiting, JWKS trust | `security-and-hardening` | No default secret anywhere; fail-fast on `BETTER_AUTH_SECRET` / `AUTH_JWKS_URL`; strict limits on the credential endpoints (10/h sign-up, 10 per 15 min sign-in) with a test proving a burst is stopped; `AUTH_TRUSTED_IP_HEADERS` empty unless a trusted proxy is configured; generic 401s; `pnpm audit` triage (vitest 2.1.9 → 3.2.7 to clear the criticals). |
| Failures hit during the phase (pnpm zod hoisting, in-memory adapter transaction clone, ESLint flat config, ruff `FUR` selector, mypy overloads) | `debugging-and-error-recovery` | Reproduced each failure, found the root cause (single hoisted `zod@3` shadowing Better Auth's `zod@4`; `structuredClone` of a Proxy; `--ext` removed in ESLint 9; `bun:sqlite` in Better Auth's type union) and fixed the cause instead of the symptom. |
| Pre-commit review of the branch | `code-review-and-quality`, `doubt-driven-development`, `code-simplification` | Checked the diff for banned items, secret defaults, unverified claims and unnecessary code; removed the dead `apps/api/package.json`, the unused `whispered` local and the duplicated test-imports path; every "done" claim below is tied to a log in `docs/evidence/phase-2.1/`. |
| Branch, commits, merge from main, push | `git-workflow-and-versioning` | One feature branch, atomic Conventional Commits, `git merge origin/main` (never rebase, never force-push), push at least every 30 minutes. |
| Evidence + status docs | `documentation-and-adrs` | Wrote `docs/evidence/phase-2.1/README.md` with the command → result → log table, rewrote `docs/PROGRESS.md` to match reality, updated `.env.example`. |

### Result

- `services/auth` (new pnpm package): Better Auth 1.7.10, plugins `organization` + `expo` + `jwt`,
  ES256 JWKS at `/api/auth/jwks`, tokens at `/api/auth/token`, Postgres in production and an
  in-memory adapter for tests, fail-fast configuration (no default secrets).
- Deleted the fake Python auth (`apps/api/app/auth/better_auth.py`) and the test that only tested
  the fake (`apps/api/tests/auth/test_better_auth.py`).
- `apps/api/app/auth/jwks.py`: PyJWT verification against the JWKS with key-rotation refresh; the
  API refuses to boot without `AUTH_JWKS_URL`; `/auth/me` and `/auth/verify` are the only routes.
- Removed banned Python deps (`redis`, `arq`, `passlib`, `python-jose`), added `pyjwt[crypto]` and
  `httpx`; deleted the meaningless npm mirror `apps/api/package.json`.
- Workspace hygiene: root `package.json` pinned to exact versions, one `zod@4.6.7` for the whole
  workspace, `vitest` 3.2.7 everywhere (clears 3 critical advisories).
- Evidence: `docs/evidence/phase-2.1/` (services/auth 31/31, api 23/23, shared 62/62, lint and
  typecheck exit 0 for all four packages, banned-grep log, pnpm audit json).

### Not verified (never claim these as PASS)

- The Node service was driven through its request handler, not through a live bound HTTP server
  (`services/auth/src/index.ts` is **NOT VERIFIED** at runtime).
- Postgres-backed storage is **NOT VERIFIED** (tests use the in-memory adapter).
- No CI run exists for this branch: `.github/workflows/` is still empty.

### Next

PHASE 2.2 (Unistyles 3 light/night themes, remove every `var(--`), then 2.3, 2.4, 2.5, then
PHASE 3 (CI + Android emulator on GitHub Actions).

## 2026-10-20 — PHASE 2.2 (branch `feat/2.2-unistyles-themes`)

### Skills applied (AGENTS.md map)

| Step | Skills read and followed | How they changed the work |
|---|---|---|
| Theme engine and screen work | `frontend-ui-engineering` | Semantic colour tokens instead of raw values, one icon set (Material Symbols) instead of emoji, no "AI look" (no gradients/glass), spacing and radii taken from the token scale. |
| Theme contract between the token package and the app | `api-and-interface-design` | `packages/design-tokens` stays the single source of truth; the app derives `colors`/`spacing`/`borderRadius`/`typography` from it instead of duplicating values, and the theme shape is identical across day/night/high-contrast (a test now enforces it). |
| Unistyles 3 API | `source-driven-development` | Read the installed `react-native-unistyles@3.5.3` typings and the official v3 theming/configuration guides: `StyleSheet.configure({ themes, settings })`, `light`/`dark` reserved names for adaptive themes, `UnistylesRuntime.setTheme`, and the mandatory babel plugin + nitro modules. |
| Guards and verification | `test-driven-development` | Added failing-then-passing tests: 8 new design-token tests (hex only, no `var(`, identical keys, near-black night) and the mobile auth suite rewritten against the real client API. |
| Failures hit (broken `node_modules` layout, jest/babel `LRUCache` crash, expo CLI crash, RN 0.88 `Libraries/` missing) | `debugging-and-error-recovery` | Root cause for all four was the same: the workspace `node_modules` was left half-deleted by the earlier failed install, so pnpm skipped re-extracting packages and hoisted the wrong versions (`zod@3` for Better Auth, `lru-cache@10` for Babel, a truncated `react-native` without `Libraries/`). Fixed by removing `node_modules` with a full literal path and reinstalling — not by patching symptoms. |
| Pre-commit review | `code-review-and-quality`, `code-simplification`, `doubt-driven-development` | Removed the duplicated `global.css` NativeWind leftover and the duplicated spacing/typography tables; every claim below is tied to a log in `docs/evidence/phase-2.2/`. |
| Branch and push | `git-workflow-and-versioning` | Feature branch off the 2.1 branch, atomic commit, merge from `origin/main`, no rebase, no force-push. |

### Result

- Unistyles 3 is now really wired: `StyleSheet.configure` with the design-token themes, the
  Unistyles babel plugin, `react-native-nitro-modules` and `react-native-unistyles@3.5.3` pinned.
- `apps/mobile/src/constants/theme.ts` exposes hex values from the token package (no `var(--`).
- `ThemeProvider` no longer touches `document` (it crashed on native); manual theme switching
  goes through `UnistylesRuntime`.
- `apps/mobile/global.css` (NativeWind) deleted; `App.js` cleaned.
- Emoji icons replaced with Material Symbols icons.
- `apps/mobile` has a test runner again: jest-expo 58 + React Native Testing Library 13, 6 tests
  green; the auth test now exercises the real client API.
- **Banned-item grep is now 0 hits** across apps, packages, services, scripts, db and infra.

### Not verified

- The Unistyles native runtime is **NOT VERIFIED** (no emulator locally, no CI workflow yet).
- `apps/mobile` typecheck still shows 3 pre-existing expo-router layout typings
  (`Stack`/`Tabs` demanding an `id` prop) — untouched files, scheduled for PHASE 2.4.

### Next

PHASE 2.3 (D8 address correction), then 2.4 (cleanup, ESLint flat config for every package),
2.5 (design), then PHASE 3 (CI + emulator).

## 2026-10-20 — PHASE 2.3 (branch `feat/2.3-address-correction`)

### Skills applied (AGENTS.md map)

| Step | Skills read and followed | How they changed the work |
|---|---|---|
| The engine and its contract | `api-and-interface-design` | One result type (`Correction`) with the D8 keys, a `AddressStore` protocol so the engine works against the LINZ FTS slice, a fixture store or Postgres, and `SqliteAddressStore` for the offline slice. |
| Rule-by-rule implementation | `spec-driven-development` | Every case in the phase (non-existent number, misspelling, self-correction, multi-suburb, units/flats, RD) is a named test before the code that satisfies it. |
| Implementation | `incremental-implementation`, `test-driven-development` | 24 tests grew in slices: contract → exact match → misspelling → number handling → self-correction → ambiguity → units → RD → accuracy; each slice was green before the next. |
| Factual grounding | `source-driven-development` | R23 (FINAL_PROMPT §1) and the D8 contract (§0-F.3.3, §5.1) were read from the binding docs; the existing `nz_address.py` and the worker's LINZ loader were read before the engine was written. |
| Failures hit (suffix/unit, self-correction regex, unit preference) | `debugging-and-error-recovery` | Each failure was reproduced in a single test, traced to a cause (R23 violation in the parser, a greedy marker regex, an unordered candidate list) and fixed at the cause. |
| Review before commit | `code-review-and-quality`, `doubt-driven-development` | Adversarially checked the engine: the fixture uses placeholder ids, so the accuracy number is explicitly **not** claimed as LINZ accuracy; the limits are in the evidence README and in `docs/FOUNDER_TODO.md`. |
| Docs | `documentation-and-adrs` | `docs/FOUNDER_TODO.md` (LINZ export entry), `docs/BUGS.md` (BUG-041..044). |

### Result

- `apps/api/app/address_correction.py`: the D8 engine — contract, fuzzy road matching, house-number
  verification, non-existent-number correction ("1400" → 140), spoken self-correction, multi-suburb
  question with options, units/flats, rural delivery numbers, and an `SqliteAddressStore` for the
  offline FTS slice.
- `apps/api/app/nz_address.py`: `42B` is now number 42 + suffix B (R23); a unit is only ever `2/14`.
- Fixture: 87 real Christchurch streets/suburbs (`apps/api/tests/address/fixtures/`).
- 24 new tests; the API suite is 48/48, ruff and mypy clean.

### Not verified

- Accuracy against real LINZ ids: **NOT VERIFIED** — `data/linz/` is empty, so the fixture uses
  placeholder ids. The founder entry is in `docs/FOUNDER_TODO.md`.
- The engine is not yet exposed through the API routes (the `/v1` surface is still a stub).

### Next

PHASE 2.4 (cleanup: egg-info, `cleanup_avd.py`, duplicate test-imports, ESLint flat config for every
package, the 3 expo-router layout typings), then 2.5 (design), then PHASE 3 (CI + emulator).

## 2026-10-20 — PHASE 2.4 (branch `feat/2.4-cleanup-and-lint`)

### Skills applied (AGENTS.md map)

| Step | Skills read and followed | How they changed the work |
|---|---|---|
| Removing dead code | `deprecation-and-migration` | `cleanup_avd.py` (local AVD work that AGENTS.md now forbids), the duplicate `apps/mobile/test-imports.js`, the obsolete `apps/api/package.json` and the tracked `*.egg-info` were removed instead of being "kept just in case"; nothing that is still referenced was touched (`scripts/compat-test.js` still uses `compat-test-imports.js`). |
| One lint config for the workspace | `code-simplification` | Instead of five near-identical flat configs, the rules live once in `packages/eslint-config` and each package imports it — one place to change a rule. |
| Version pinning | `source-driven-development` | Every version was resolved from the registry (with publish dates) and pinned exactly; the Expo-managed packages keep their `~` range because `npx expo install --check` is what guards them. |
| Fixing the findings | `debugging-and-error-recovery` | The lint failures were real code smells (unused imports, an `any` leak in `deepClone`, an `async` function without `await`, zod 4's two-argument `z.record`) and were fixed at the cause, not silenced. |
| Review before commit | `code-review-and-quality`, `doubt-driven-development` | The mobile app's ~45 lint findings were **not** papered over: lint stays off there, the app now runs `typecheck` (green), and the backlog is tracked as BUG-045 next to the voice-module work (BUG-040). |
| Quality gate | `constraint-driven-development` | `pnpm lint` / `pnpm typecheck` / `pnpm test` now also run the Python API (ruff, mypy, pytest) — one command proves the whole workspace, and the thresholds were not lowered. |
| Branch and push | `git-workflow-and-versioning` | Feature branch, atomic commit, merge from `origin/main`, no rebase, no force-push. |

### Result

- ESLint flat config shared by every JS package; `pnpm lint` is green (4 packages + ruff).
- `pnpm typecheck` is green (6 packages, including the mobile app for the first time + mypy).
- `pnpm test` is green: 107 JS/TS tests + 48 API tests.
- `*.egg-info/` gitignored and untracked; `cleanup_avd.py` and the duplicate `test-imports.js` deleted.
- Every dependency version pinned exactly; the banned-item grep stays at 0 hits.
- The 3 expo-router layout typings fixed (`id` on the navigators).

### Not verified

- `apps/mobile` has no lint script yet (BUG-045): the voice module and the jest mocks still carry
  type-aware findings that belong to the voice-module work.

### Next

PHASE 2.5 (design to the approved mockups), then PHASE 3 (CI + Android emulator on GitHub
Actions), then the product phases C → G.

## 2026-10-20 — PHASE 3.1 (branch `feat/3.1-ci-and-android-e2e`)

### Skills applied (AGENTS.md map)

| Step | Skills read and followed | How they changed the work |
|---|---|---|
| CI and emulator workflows | `ci-cd-and-automation` | The workflows install pnpm with `pnpm/action-setup` (no global install), keep the quality gate and the emulator gate as separate jobs, upload the APK/Maestro artifacts/logcat, and never claim a pass without a run link. |
| The B.7 compatibility screen | `source-driven-development` | The screen was written against the **installed** type definitions (VisionCamera 5 `VisionCamera.requestCameraPermission()`, MapLibre v11 `Map`, expo-audio 58 `requestRecordingPermissionsAsync`, op-sqlite `open().execute()`), not from memory. |
| Screens and testIDs | `frontend-ui-engineering` | Stable `testID`s on the login, register, today list, stops and map screens so the Maestro flows assert on the real UI. |
| Evidence discipline | `documentation-and-adrs`, `code-review-and-quality` | `docs/evidence/b7/README.md` states plainly that B.7 is still **NOT VERIFIED** and why (the run cannot be observed without the founder's `GITHUB_TOKEN`). |

### Result

- `.github/workflows/ci.yml`: lint, typecheck, test (JS packages + the Python API) and gitleaks on
  every push and PR.
- `.github/workflows/android-e2e.yml`: builds the debug APK, boots an API 34 emulator, installs the
  APK and runs the Maestro flows; uploads the APK, the Maestro artifacts and the logcat.
- `.github/workflows/release-apk.yml`: signed preview APK on a `v*` tag, unsigned debug APK with a
  warning when the signing secrets are missing.
- `.maestro/`: `login`, `today-list`, `map`, `delivered`, `compat` + `run-all.sh` (starts the auth
  service with an in-memory database so the app can really sign up).
- `apps/mobile/app/compat.tsx`: the B.7 screen (sherpa-onnx, VisionCamera, MapLibre v11, op-sqlite,
  expo-audio, Reanimated) — a module that cannot run yet reports `skipped` with the reason, never a
  false `ok`.

### Not verified

- The CI run and the emulator run were **not observed** from this machine (`gh` is installed but
  not authenticated — the `GITHUB_TOKEN` is a founder item). B.7 stays NOT VERIFIED until a green run
  is linked from `docs/evidence/b7/README.md` and the artifacts are downloaded.

---

## Handoff (2026-10-20, end of this session)

### Done and pushed (4 branches, each with evidence)

| Branch | Content | Evidence |
|---|---|---|
| `feat/2.1-better-auth-service` | real Better Auth (Node) service in `services/auth` (organization + expo + jwt plugins, ES256 JWKS, no default secrets, 31 tests); the fake Python auth deleted; FastAPI verifies tokens via JWKS (PyJWT, 23 tests); banned deps removed; root versions pinned | `docs/evidence/phase-2.1/` |
| `feat/2.2-unistyles-themes` | Unistyles 3 themes from the design tokens, every `var(--` gone, `global.css` deleted, emoji icons replaced, mobile jest set up (6 tests) — **banned-item grep: 0 hits** | `docs/evidence/phase-2.2/` |
| `feat/2.3-address-correction` | the D8 engine (`{original, corrected, reason, confidence, needs_question, options[]}`) with the R23 suffix/unit fix and an 87-address Christchurch fixture (24 tests) | `docs/evidence/phase-2.3/` |
| `feat/2.4-cleanup-and-lint` | shared ESLint flat config for every package, `*.egg-info`/`.turbo` untracked, `cleanup_avd.py` and the duplicate `test-imports.js` deleted, every version pinned, `pnpm lint/typecheck/test` now cover the Python API too | `docs/evidence/phase-2.4/` |
| `feat/3.1-ci-and-android-e2e` | CI workflow, Android emulator workflow with Maestro, release workflow, the B.7 compatibility screen | `docs/evidence/phase-3.1/`, `docs/evidence/b7/` |

### Current state of the quality gate

`pnpm lint` → 4 JS packages + ruff ✅ · `pnpm typecheck` → 6 packages + mypy ✅ ·
`pnpm test` → 107 JS/TS tests + 48 API tests ✅ · banned-item grep → 0 hits ✅

### In progress

Nothing is half-finished in the working tree: `git status` is clean on every branch.

### Next, in order

1. **Watch the CI runs** on the five pushed branches and merge them into `main` once they are green
   (`main` must stay green; the merge is the founder's call because `gh` is not authenticated here).
2. **PHASE 2.5** — design to the approved mockups: Figtree font, big numbers, 72 px primary buttons,
   the SVG icon set (no emoji), the calm night theme. The mockups themselves are not in the repository,
   so the written spec in FINAL_PROMPT §8 is the contract; the founder's visual review stays
   asynchronous (§8, `docs/FOUNDER_TODO.md`).
3. **PHASE 3 follow-up** — link the green emulator run and the artifacts into
   `docs/evidence/b7/README.md`, then B.7 can be marked PASS.
4. **The product itself**, in the order of `docs/KICKOFF_PROMPT_EN.md` §12: maps (Canterbury PMTiles)
   → sync (op-sqlite event log) → routing (Valhalla + VROOM + OR-Tools) → door memory → dictation
   mode → live voice agent → the full voice tool catalogue → driving mode → OCR label scan → POD
   photos → optional SMS → IRD logbook PDF → web dashboard → admin → Stripe NZD → team features →
   NZ Privacy Act PIA → store assets → acceptance test → `docs/HANDOVER.md`.

### Context notes for the next session

- `pnpm` on this machine is only reachable through `corepack pnpm`; the global npm install is
  broken. The repo-local `node_modules/.bin/pnpm` shim was repaired with `node node_modules/pnpm/install.js`.
- The workspace `node_modules` had to be deleted and reinstalled once (see BUG-041): a half-deleted
  tree made pnpm resolve the wrong versions.
- `data/linz/` is still empty → the D8 accuracy against real LINZ ids is NOT VERIFIED.
- `gh` is not authenticated → no PR, no run link, no artifact download from this machine.
