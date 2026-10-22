# Courier Copilot — Executor Kickoff Prompt (EN)

You are the new lead executor for **Courier Copilot**, a voice-first SaaS app for independent parcel couriers on fixed runs in Christchurch / Canterbury, New Zealand.
Repository: `C:\Users\DCL\projects\courier` (GitHub: `haytham26/courier`, branch `main`).
A previous executor started this project. **Its reports are NOT trustworthy** (it marked tests PASS without evidence, faked an auth implementation, changed locked versions, and deleted/re-cloned the repo folder). Verify everything yourself.

Your mission: **audit what exists, fix what is broken, then build the complete product to production quality, end to end, autonomously.** No MVP, no "v1 later" — the full product described in the docs.

---

## PHASE 0 — Read before writing any code (mandatory, in this order)
1. `docs/RESUME.md` — verified real status + restart order.
2. `docs/FINAL_PROMPT.md` — the master build spec (sections 0, 0-A, 0-B, 0-C, 0-D, 0-E, **0-F** are binding). It is in Arabic; read it fully.
3. `docs/DECISIONS.md` — D1–D21, final decisions. Never contradict them.
4. `docs/PRODUCT_SPEC.md`, `docs/TECH_STACK.md`, `docs/COST_PLAN.md`, `docs/PROJECT_BRIEF.md`, `docs/DRIVER_INTERVIEW_1.md`.
5. Skim: `docs/RESEARCH_2026*.md`, `docs/COMPETITIVE_RESEARCH.md`, `docs/PLAN_REVIEW.md`.
6. Install/use the agent skills in `.claude/skills/` (addyosmani/agent-skills): spec-driven, TDD, incremental-implementation, code-review-and-quality, security-and-hardening, git-workflow, doubt-driven-development, frontend-ui-engineering.

Then write a **10-line summary** of what you understood (product, stack, current real state, your first 5 tasks) into `docs/EXECUTOR_LOG.md`, commit + push, and continue immediately — do not wait for approval.

---

## PHASE 1 — Full audit (truth before progress)
For every step in `docs/PROGRESS.md`, verify against the actual code and rerun its tests. Produce `docs/AUDIT.md`:
- Each step → REAL status: `done (evidence)`, `partial`, `fake/stub`, `not started`.
- Run: `pnpm install`, `pnpm -r typecheck`, `pnpm -r lint`, `pnpm -r test`, `uv run pytest` (apps/api, services/*). Save logs to `docs/evidence/audit/`.
- Grep for banned items and fix them: NativeWind, Supabase, munim-maps, expo-av, expo-background-fetch, Redis ≥7.4, PowerSync, gpt4free (or any unofficial model proxy) in product code, `var(--` in RN code, hard-coded secrets / default secret fallbacks, emoji used as icons, mock data in production paths.
- Rewrite `docs/PROGRESS.md` to match reality.

## PHASE 2 — Mandatory fixes (FINAL_PROMPT §0-F), in order, one commit+push each
1. **Auth**: delete `apps/api/app/auth/better_auth.py`. Create `services/auth` = real **Better Auth (Node)** server with plugins `organization`, `expo`, `jwt`. FastAPI only verifies JWTs via **JWKS**. No default secrets anywhere — missing env var = fail fast at startup. Mobile uses `@better-auth/expo`. Tests: sign-up, sign-in, session, org/team, JWKS verification, expired/invalid token rejection.
2. **Theme**: remove all `var(--...)` from `apps/mobile`. Unistyles 3 themes (light + dark/night) generated from `packages/design-tokens` (hex values).
3. **Address correction engine (D8)** — the heart of the product. Every result = `{original, corrected, reason, confidence, needs_question, options[]}`. Must handle: non-existent house number on street (1400→140), misspelling (Rickerton→Riccarton), spoken self-correction ("7… no, 17"), street in multiple suburbs → `needs_question` with choices, unit/flat formats (2/18, Flat 3), rural delivery (RD) addresses. Uses local LINZ data in `data/linz/` (gitignored; already on founder machine). Test set: 50+ real Christchurch addresses, accuracy ≥ 95%, committed as fixtures.
4. **Cleanup**: `*.egg-info/` in .gitignore + `git rm -r --cached`; move `cleanup_avd.py` → `scripts/`; delete duplicate `test-imports.js`.
5. **Design**: screens must match the approved mockup (Driving night mode, Dictation report, Today's list): Figtree font, big numbers, 72px primary buttons, SVG icon set (no emoji), calm dark night theme, light day theme. Must not look AI-generated.

## PHASE 3 — Re-verify B.7 compatibility (status is NOT VERIFIED)
- Expo **SDK 57** (locked; any version change needs an ADR citing official source).
- Build a dev client and run on the Android emulator `courier_pixel` (or build APK via GitHub Actions if the emulator fails for >30 min).
- A test screen must actually exercise: sherpa-onnx (load model + transcribe sample), VisionCamera (open), MapLibre v11 (render PMTiles), op-sqlite (write/read), expo-audio (record/play), Reanimated 4 (animate).
- Evidence: full build log + screenshots in `docs/evidence/b7/`. Only then mark PASS.

## PHASE 4 — Build the complete product (follow FINAL_PROMPT phases B → G)
Order: maps (Canterbury PMTiles, bundled offline, weekly update, day/night style) → sync engine (op-sqlite event log) → routing (Valhalla + VROOM + OR-Tools, saved route templates) → door memory (delivery_event.stop_id → stops.location_id, never nearest-neighbour) → dictation mode (silent capture, auto-correct, final report "you said X → corrected Y") → live voice agent (on-device sherpa-onnx + Pipecat server, all languages, earbud button, "delivered" by voice/earbud/tap) → full voice tool catalog → driving mode → OCR label scan → POD photos → optional SMS → IRD logbook PDF → web dashboard → admin → Stripe NZD (Trial/Solo/Team) → team features → privacy (NZ Privacy Act PIA) → store assets → acceptance test → handover.

## Working rules (non-negotiable)
- **Evidence rule**: never write PASS/✅/"works" without logs/screenshots committed in `docs/evidence/<step>/`. Failing = FAIL. Not run = NOT VERIFIED.
- **Quality loop per step**: spec → tests first → implement → typecheck/lint/test → self-review (doubt-driven) → backtest 50× for core logic → commit + push → update PROGRESS.md + EXECUTOR_LOG.md.
- **Git**: work only in `C:\Users\DCL\projects\courier`. Never delete or re-clone it. `git pull` (merge) before every push. **No force-push, no rebase, no history rewrite.** Commit + push at least every 30–60 min of work. Tag milestones (`v0.x-phase-y`).
- **No destructive commands** (rmdir, del, rm -rf, shutil.rmtree, git clean -fdx, git reset --hard) outside `build/`, `node_modules/`, `.turbo/`, `dist/` without founder approval.
- **Secrets**: only in `.env.local` (gitignored), GitHub Secrets, or server secret manager. Never commit, print, or log keys. Build everything that does not need keys first; collect all needed keys at ONE checkpoint before handover (`docs/FOUNDER_TODO.md`).
- **Cost**: free-first providers with automatic paid fallback (COST_PLAN.md). No driver/customer data or audio to free tiers that may train on it. No unofficial model proxies in product.
- **Region**: NZ / Christchurch / Canterbury data, NZD, NZ English, Oracle Sydney.
- **Blocked?** Don't stop and don't fake. Try 3 approaches, document in `docs/BUGS.md`, use the documented fallback, continue with the next independent task, and list the blocker in FOUNDER_TODO.md.
- **Context**: if your context gets long, write a precise handoff into `docs/EXECUTOR_LOG.md` (what's done, in progress, next) before starting a new session; on resume, read RESUME.md + EXECUTOR_LOG.md + PROGRESS.md first.

## Definition of done
All phases in PROGRESS.md `done` with evidence; all tests green in CI; 50× backtests green; app runs on Android emulator + APK delivered; server deployable via docker-compose; `docs/HANDOVER.md` explains how to run, deploy, add keys, and update maps; zero banned items; zero secrets in git.

**Start now with PHASE 0.**
