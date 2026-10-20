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
