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
