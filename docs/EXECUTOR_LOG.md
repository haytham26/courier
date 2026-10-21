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

## 2026-10-20 — V4 bootstrap + T1 (PR #1)

### Skills applied (AGENTS.md map)

| Step | Skills read and followed | How they changed the work |
|---|---|---|
| Writing the quality bar | `constraint-driven-development` | `CONSTRAINTS.md` separates the **floor** (no suppressions, no skipped tests, no `any`, no stubs) from the **numbers** (coverage, mutation, audits, bundles), every number names the command that produces it, the floors are the measured values of today (a ratchet) instead of aspirational ones, and every exception has an owner and an expiry. The floor is enforced by `scripts/check-floor.mjs` (diff-scoped). |
| The gate wiring | `ci-cd-and-automation` | The gates run in separate jobs so a slow one never blocks the fast feedback: floor, coverage, licences, audits, Semgrep, CodeQL (weekly + per PR), the emulator E2E, the release workflow. |
| Dependency hygiene | `source-driven-development` | The two critical advisories in the tree (`tinypool` prototype pollution through the test runner) are **fixed** by moving to `vitest@4.1.11`; the two remaining highs are build-time only, have no upstream patch, and are documented as accepted with a review date. |
| Parity and the market | `api-and-interface-design` | `docs/PARITY.md` gives every one of the 49 feature families a status and the task that delivers it, so "planned" is never a vague word. |
| The design contract | `frontend-ui-engineering` | `docs/design/SYSTEM.md` fixes the tokens, the seven states, the motion budget, the contrast ratios and the screenshot gate — the mockups stay the contract. |
| Squads | `planning-and-task-breakdown` | Ten squads, each with a mission, measurable targets, an evaluation dataset and a status; a squad is not "done" until its benchmark is met on the CI emulator. |
| Security of the change | `security-and-hardening` | The GitHub Actions are pinned to their commit SHA, the Maestro installer is downloaded and shown instead of piped into a shell, the containers run with `no-new-privileges`, the gitleaks allow-list names the exact test strings, and the SAST exclusions are listed with their reason (W3, W4). |
| Review before merge | `code-review-and-quality`, `doubt-driven-development`, `code-simplification` | The PR body carries the story, the research, the parity rows, the evidence links, the risk and the rollback; the code review found the Semgrep-blocking `child_process` calls, the unpinned actions and the audit findings, all fixed before the merge. |
| Branch and PR | `git-workflow-and-versioning` | One feature branch, atomic Conventional Commits, no force-push, no rebase, `gh pr create` → CI → `gh pr merge --merge`. |

### Result

- **V4 bootstrap**: `CONSTRAINTS.md`, `docs/PARITY.md`, `docs/design/SYSTEM.md`, ten squad folders, the PR
  template, the floor/coverage/licence/audit gates, CodeQL, the `.semgrepignore` and the `.gitleaks.toml`.
- **T1**: PR #1 (`feat/v4-company-bootstrap` → `main`) carries PHASE 2.1 → 3.1 and the V4 system.
- Green on the PR: `lint, typecheck, test` (107 + 48 tests), the floor guard, the coverage ratchet
  (81.7 % overall, 88.6 % for the auth service), the licence inventory, the dependency audits, Semgrep,
  CodeQL (JS) and gitleaks.

### Not verified

- The Android emulator job is still running; B.7 stays **NOT VERIFIED** until it is green and the
  artifacts are linked in `docs/evidence/b7/README.md`.
- The mutation-testing gate (Stryker) is declared in `CONSTRAINTS.md` but the harness lands with the
  first mutation-scoped squad task.
- The coverage gap to the V4 target (85 % / 90 %) is recorded with its owners; the enforced floors are
  today's values.

### Next

T2 (the Expo 58 decision with the ADR), T3 (the emulator green), T4 (the real LINZ addresses), T5
(the offline map), T6 (the design), then T7 (the product).

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

## 2026-10-20 — session handoff (the newest section)

### Where the work stands

| Branch | What it carries | State |
|--------|-----------------|-------|
| eat/v4-company-bootstrap (PR #1) | PHASE 2.1 to 3.1 (the auth service + JWKS, the Unistyles themes, the D8 engine, the cleanup, the shared lint config) **and** the whole V4 system (CONSTRAINTS.md, docs/PARITY.md, docs/design/SYSTEM.md, ten squads, the PR template, the floor / coverage / licence / audit gates, CodeQL, the emulator and release workflows) | every gate green except the Android emulator job |
| eat/t2-expo-58-decision | ADR-002 (stay on Expo SDK 58, D21 updated), the LINZ fetcher and index builder, the D8 fixes the real data forced, and the accuracy report | green locally; the PR is not open yet |

### The open item: the Android emulator job

- The **APK builds** on SDK 58 (ssembleDebug succeeded in 29 minutes).
- The **Maestro step failed** after 84 seconds and the job then hung on db logcat -d (the run was
  cancelled, so its log is gone). The Maestro artifacts were empty, so the failure is in the flows
  themselves, not in the build.
- The workflow was hardened while this was investigated: only the emulator ABI is built
  (-PreactNativeArchitectures=x86_64), Gradle is cached, the job timeout is 90 minutes and the
  logcat step is bounded.
- **Next action:** watch the next run, read the Maestro step's log (gh run view --job <id>
  --log-failed) and fix the flows. The likely causes, in order: the app crashes at start (the id
  prop on the navigators, or a native module missing from the prebuild), the auth service is not
  reachable on 10.0.2.2:3001, or the deep link courier://compat does not reach the compat
  screen.

### What a new session should do first

1. git checkout feat/v4-company-bootstrap && git pull - read this log and docs/PROGRESS.md.
2. Read the emulator job log and fix the Maestro flows; when it is green, download the artifacts
   (gh run download <run-id> --name maestro-artifacts), put them in docs/evidence/b7/ and mark
   B.7 PASS in docs/PROGRESS.md.
3. Merge PR #1 (every other gate is green), then open the PR for eat/t2-expo-58-decision.
4. T5 (the offline Canterbury PMTiles: Geofabrik to planetiler into data/maps/, the weekly GitHub
   Action, the day/night styles), T6 (the design to the approved mockups), then T7 (the product:
   sync, routing, door memory, dictation, the live voice agent, the tool catalogue, driving mode,
   OCR, POD, SMS, the IRD logbook, the web dashboard, billing, the PIA and the handover).

### Notes for the next session

- pnpm only works through corepack pnpm on this machine (the global install is broken); the
  repo-local 
ode_modules/.bin/pnpm shim is repaired with 
ode node_modules/pnpm/install.js.
- The real LINZ data is in data/linz/ (225,151 Christchurch addresses, gitignored). Rebuild it
  with uv run --with httpx python scripts/fetch-linz.py --area christchurch and
  uv run scripts/build-linz-index.py --area christchurch.
- The D8 accuracy test is **skipped** when that index is absent, so the CI suite stays green; run
  it locally with uv run --directory apps/api pytest tests/address/test_linz_accuracy.py -v.
- The GITHUB_TOKEN from .env.local works through scripts/gh.ps1 (it never prints the token).

## 2026-10-20 - Research sprint: clean-room study of VoiceStudio + squad research/decisions refresh

### Skills applied (AGENTS.md map)

| Step | Skills read and followed | How they changed the work |
|---|---|---|
| Session start, skill selection | `using-agent-skills` | Picked the study phase workflow (Researcher -> Analyst) instead of improvising; every row below names its skill. |
| Scoping the two tasks and the context to load | `context-engineering` | Loaded only the binding documents (KICKOFF_V4_EN, FINAL_PROMPT 4.1-4.5, DECISIONS D1-D22, PARITY, PRODUCT_SPEC, the squad READMEs) and the 15 area research files; the AGPL clone in `.study/voicestudio` was read, never copied. |
| Study plan and the clean-room boundary | `spec-driven-development`, `planning-and-task-breakdown` | Turned the study into 24 numbered requirements with Given/When/Then acceptance criteria, then a separate GAP table with the PARITY status vocabulary. |
| Evidence discipline (no invented facts) | `source-driven-development` | Every number, licence, date and version in the two new files and the 20 refreshed squad files was copied from the area files in `docs/research/2026/` or from the repository itself; anything we did not see is marked UNVERIFIED. |
| Licence and privacy reasoning (CC-BY-NC weights, AGPL boundary) | `security-and-hardening` | The OmniVoice CC-BY-NC finding is written as a hard gate in SPEC R2 and a licence-safe substitution table; no requirement may depend on a non-commercial weight. |
| Squad research summaries and decision rows | `documentation-and-adrs` | 10 `research.md` files (candidates, queries, deep-review outcome for the top 5, KEEP/ADOPT/WATCH/REJECT, UNVERIFIED) and 10 `decisions.md` tables (date, decision, candidate, source file, status). |
| Final consistency pass | `code-review-and-quality`, `doubt-driven-development` | Checked every file for (a) copied identifiers or sentences from the studied project - none, (b) numbers not traceable to an area file, (c) line budgets (SPEC 244, GAP 99, squad research 53-80) and (d) UTF-8 integrity. |

### Clean-room statement (V4 11.2)

- `debpalash/VoiceStudio` (AGPL-3.0) was cloned to `.study/voicestudio/` (gitignored, `git check-ignore` confirms it is not tracked) and read: README, `docs/STRUCTURE.md`, `docs/feature-catalog.md`, `docs/features.yaml`, `docs/mcp.md`, `docs/speech-platform.md`, `docs/agentic-voice.md`, `docs/api-auth.md`, `docs/voice-design.md`, `docs/languages.md`, `docs/mobile.md`, `mobile/contract/SPEC.md`, the router list, the alembic migrations and the public issue titles.
- **No code, file layout, string table, schema, identifier or asset from the studied project entered this repository.** The two new files describe behaviour in our own words as requirements for our product.
- The studied project may be run locally as an internal dev tool (synthetic evaluation audio) only. It is never vendored, never served to users, and never a dependency. D22 is unchanged; the OmniVoice **weights** finding is recorded as an ADR trigger.

### Result

- `docs/study/voicestudio/SPEC.md` (244 lines): 24 requirements with acceptance criteria, the legal boundary, the locked-context inheritance, 6 explicit non-goals, the licence-safe substitution table, the UNVERIFIED list, and the observed user complaints mapped to our better answer.
- `docs/study/voicestudio/GAP.md` (99 lines): 35 features compared (Have / Better / Planned / Skip), 4 new PARITY rows to merge, and what stays UNVERIFIED.
- 10 squad `research.md` files rewritten from the sprint area files (53-80 lines each).
- 10 squad `decisions.md` files rewritten as decision tables with date, candidate, source file and status.
- Nothing in `docs/PARITY.md` was changed: a row may only leave `Planned` with evidence in `docs/evidence/`, and no evidence exists for these rows yet.

## 2026-10-20 — the research sprint (V4 §12) and the scorecard (V4 §12.8)

### Skills applied

- source-driven-development (every area): the candidates were read from the repositories, the
  registries and the model cards - the numbers in the evidence cards carry the date they were
  taken, and everything that could not be read is marked UNVERIFIED.
- deprecation-and-migration (clean-room): the five copyleft projects were studied as
  requirements, never as code; the clones live in .study/ (gitignored) and nothing was copied.
- pi-and-interface-design (the tool catalogue and the licence ledger): the sprint's stack
  choices are written as interfaces with a fake and a free-first -> paid chain, per FINAL_PROMPT 6.1.
- security-and-hardening (the licence gate): the OmniVoice finding moved the licence ledger from
  a review step to a build gate (ADR-004).
- code-review-and-quality (the summary): the sprint summary is a change list with ADRs, not a
  reading list.

### Result

- 16 area files (>= 30 candidates each, every query recorded), 5 clean-room studies
  (Fleetbase, Navigator, OpenRouteService, Nominatim, VoiceStudio) with SPEC + GAP, the ten squad
  research/decisions files rewritten, docs/research/2026/SPRINT-SUMMARY.md and
  docs/QUALITY_SCORECARD.md.
- **D22 changed** (ADR-004): the OmniVoice *weights* are CC-BY-NC, so the private voice service is
  sherpa-onnx + Kokoro + Qwen3-ASR/TTS and the licence ledger becomes a shipped surface.
- The V4 11.1 adopt list is corrected in six places (Ferrostar is not on npm and its left-hand
  driving issue is open; the PMTiles CLI moved; traccar was superseded; Piper is GPL; and so on).

### Not verified

- Every benchmark in the sprint: the eval sets do not exist yet. The scorecard carries that as the
  first honest fact.
- The 6-month star trend of every candidate (the token has no stargazer scope).

## 2026-10-20 — read of the new execution contract (MASTER_EXECUTION)

I read docs/MASTER_EXECUTION.md (§0 the CEO loop, §1 precedence, §2 the founder decisions D23/D24,
§3 the real state, §4 the P1-P7 plan, §5 the autopilot rules, §6 the Definition of Done, §7 the
senior-review fixes, §8 the founder directives, §9 touch-complete parity and the innovation backlog,
§10 the conflict resolution), docs/SAAS_CHECKLIST.md (the security squad as a merge gate, the
driver-app runtime essentials, the SaaS business essentials and the "SaaS brain" automation, with the
rule that every line becomes a task), docs/COVERAGE_MAP.md (the twelve coverage areas and the
audit rule that runs at the start of every phase) and docs/KICKOFF_V4_EN.md §13 (the founder
directives after the research sprint: the depth audit, the Spoke teardown, online AND offline, the
voice model path and the per-module application). From here docs/MASTER_EXECUTION.md is my only
instruction file; the earlier prompts are background, and the conflicts it lists in §10 are applied
(Expo SDK 58 per ADR-002, mutation score >= 80% on the core modules, the voice weights per V4 §13.6
and D23 with ADR-004 updated accordingly, and the Android E2E triggers reduced to PRs to main,
nightly and manual). The merged main brought the MASTER_EXECUTION contract, the SaaS checklist,
the coverage map and the approved mockups; nothing was dropped in the merge.

## 2026-10-20 — handoff (P1 in progress)

### Where the company stands

- **PR #1** (eat/v4-company-bootstrap -> main): every gate green (lint, typecheck, 107 JS/TS + 49 API
  tests, floor guard, coverage ratchet, licences, audits, Semgrep, CodeQL, gitleaks) **except** the
  Android emulator job, which is still running (run 39420731177). The APK builds in 14 minutes with
  the warm Gradle cache; the Maestro step has been running for 40+ minutes, so the flows are the
  remaining unknown.
- **T2/T4** (eat/t2-expo-58-decision): ADR-002 (Expo 58), ADR-004 (voice licences, updated for
  D23), the LINZ fetcher, 656,044 real Canterbury addresses indexed and the D8 accuracy at
  **96.9 %** (1745/1800) — report in docs/evidence/phase-2.3/linz-accuracy.md. Its PR is not open yet.
- The research sprint (16 areas, 5 clean-room studies, the scorecard, the task register) is merged into
  PR #1.

### The next three actions (P1)

1. **Read the emulator log**: powershell -ExecutionPolicy Bypass -File scripts\gh.ps1 run view
   --job 118618431796 --log-failed (the job id is in the run above). The run now leaves the
   diagnostics: the resumed activity, the app pid and the logcat in docs/evidence/b7/. The likely
   cause is that the app never renders (the AuthNavigator returns null while the session request is
   in flight, and the auth service may not be reachable on 10.0.2.2:3001 at that moment) — the
   compat flow then waits for compat-screen until its 60 s timeout.
2. **Make the flows honest about the app**: the login screen must render even when the session
   request fails (the AuthProvider should time out the pending state), and the flows should assert on
   text, not only on testIDs.
3. **Then**: artifacts into docs/evidence/b7/, B.7 PASS in docs/PROGRESS.md, merge PR #1, open
   and merge the T2/T4 PR, and continue with P2 (the research depth audit, the Spoke teardown and
   the eval sets) per docs/MASTER_EXECUTION.md §4.

## 2026-10-20 — handoff 2 (P1: the emulator)

### What the failed run actually showed (the diagnosis is done)

The Maestro artifacts of the failed run contain the screenshots, and they show the **Expo dev-client
launcher** ("Development Build" / "Start a local development server with: npx expo start / Connect").
The debug build of a dev-client app waits for a Metro server, so **no screen of ours ever rendered**
and every flow timed out. Nothing was wrong with the flows.

**Fix (pushed):** the workflow now builds a **release** APK (./gradlew assembleRelease), which embeds
the JS bundle and runs standalone on the emulator. The APK path, the artifact path and
.maestro/run-all.sh were updated to the release artifact. The emulator job also no longer cancels a
running job (that had wasted 20 minutes of the private Actions minutes on every push), and every flow
is bounded to five minutes with the diagnostics (resumed activity, app pid, logcat) left behind.

### The state of the run

Run 39427774817 (PR #1) was still queued/pending when this session ended. Watch it with:

    powershell -ExecutionPolicy Bypass -File scripts\gh.ps1 run list --limit 3
    powershell -ExecutionPolicy Bypass -File scripts\gh.ps1 run view 39427774817 --log-failed

If the flows still fail, the artifacts carry the answer:
gh run download 39427774817 --name maestro-artifacts --dir .local-backup/maestro (the screenshots
are in <flow>/screenshots/, and maestro-logcat.txt holds the app's logcat).

### The next actions, in order (MASTER_EXECUTION §4)

1. **P1**: emulator green -> the artifacts into docs/evidence/b7/ -> B.7 PASS in
   docs/PROGRESS.md -> merge PR #1 -> open and merge the T2/T4 PR.
2. **P2**: the research depth audit (all 24 areas at >= 30 cards with a query log and a verifier pass
   of >= 20 %), the Spoke teardown (docs/study/spoke/: TEARDOWN, REVIEWS, BEAT-SPOKE) with a Spoke
   column on every PARITY row, the eval sets (voice >= 500 utterances, scanner >= 300 labels in
   data/labels/, routing on real Christchurch days), docs/squads/voice/OWN-MODEL.md and
   docs/study/omnivoice/SPEC.md.
3. **P3-P7**: Courier Maps (T5) -> the design to the mockups (T6) -> the product (T7, 17 items) ->
   launch readiness -> the v1.0.0 release.

Everything is committed and pushed on eat/v4-company-bootstrap (PR #1) and
eat/t2-expo-58-decision.

### The startup crash, found through the crash buffer (the fifth blocker)

The evidence artifact carries the crash buffer next to the main logcat (the
main buffer is overwritten by the polling noise, which is why the first runs
looked like a silent death):

    FATAL EXCEPTION: main
    Process: com.courier.copilot
    java.lang.RuntimeException: Unable to get provider androidx.startup.InitializationProvider:
    Caused by: Failed to create an instance of class androidx.work.impl.WorkDatabase

WorkManager, which AndroidX pulls into every app through the startup provider,
opens its own database through `androidx.sqlite`. The app stores its data in
op-sqlite, which is a JSI module with its own SQLite build: the bundled SQLite
takes the `sqlite3_*` symbols of the process before the platform library
does, and the framework SQLite that WorkManager uses then fails. The app uses
no background work at all, so the initializer is removed with the documented
AndroidX recipe (`tools:node="remove"`), and the framework SQLite is added
for the libraries that need it.

### The three mistakes of the session, recorded so they are not repeated

1. A revert that moved the pipeline out of PR #1 also took the
   `babel-preset-expo` dev dependency with it: the release bundle failed
   again with "Cannot find module babel-preset-expo".
2. A commit that staged only `apps/mobile` left the lockfile behind: the
   frozen install failed with "specifiers in the lockfile don't match
   specifiers in package.json". The lockfile is a root file: `git add -A`, or
   the file by name.
3. The pipeline PR and the product PR drifted apart. The pipeline PR now
   carries only the pipeline and the app fixes it needs to prove itself; the
   product work stays in PR #1.

### P5.1 Courier Sync, the first slice of the product

- `apps/api/app/repo.py`: the Repo contract, the Postgres implementation
  (SQLAlchemy + psycopg) and the in-memory one the tests use. The event id
  comes from the phone, so a replayed batch is stored once.
- `apps/api/db/schema.sql`: the shifts, the stops, the delivery events, the
  corrected addresses, the door memory and the PostGIS point of every stop.
- `POST /shifts/{shift_id}/events:batch` answers with the accepted count and
  the cursor.
- `apps/mobile/src/sync/`: the event log, the op-sqlite store (SQLCipher) and
  the sync service that only confirms a batch after the server stored it.

### P2, the verifier pass

Four verification files (VERIFICATION-A/B/C/D.md): 271 of 941 cards re-checked
against their real source, every area over the 20 % floor. The systematic
defect: the research files quoted GitHub's `open_issues_count` (issues plus
pull requests) as the number of open issues. 129 cards corrected, and the
corrections are applied in the research files.

### The seventh blocker, and the one that mattered: the app had never run

The crash buffer said: "No filename found. This is likely a bug in
expo-router", thrown while the router rendered its first screen.

The bundle had **no route at all**: the entry was still the old `App.js` with
a `<Slot />` rendered outside the router's context, so expo-router's route
map was never built and every screen of the app was missing from the bundle.
The app could never have opened on a phone. The fix:

- the entry is `expo-router/entry` (the package main); the old `App.js` and
  `index.js` are gone and the providers live in the root layout
- the tabs and the sign-in group name their first screen, so the app opens
  from the launcher without a deep link
- the root layout has a not-found screen for a link the app does not know

How it was found: the release bundle was unpacked from the APK and searched
for the route files. The same check on a local `expo export` (a minute, no
emulator) is now the way to prove a bundling change. The local loop found the
same thing in seconds, after four 25-minute CI cycles.

**The rule this teaches**: when a screen does not appear, look at the bundle
before looking at the code. The bundle is the truth about what the app is.
