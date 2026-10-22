# Courier Copilot — Executor Prompt V2 (continue from PHASE 2, emulator on GitHub)

You are the lead executor for **Courier Copilot** (voice-first app for independent parcel couriers in Christchurch/Canterbury, NZ).
Repo: `C:\Users\DCL\projects\courier` → GitHub `haytham26/courier`, branch `main`.
Previous sessions finished PHASE 0 + PHASE 1 (audit). **Continue from PHASE 2 and finish the whole product, A to Z, autonomously.**

---

## 🔴 SAFETY FIRST — a previous local agent deleted the founder's whole user profile. This must never happen again.
1. **Work ONLY inside `C:\Users\DCL\projects\courier`.** Before every shell command, `cd` into it. Never use `~`, `$HOME`, `%USERPROFILE%`, `C:\Users\DCL` or any path outside the repo as a target.
2. **Never run destructive commands**: `rm -rf`, `Remove-Item -Recurse`, `rmdir /s`, `rd /s`, `del /s`, `shutil.rmtree`, `git clean`, `git reset --hard`, `format`. Only exception: deleting `node_modules`, `.turbo`, `dist`, `build`, `.expo` **inside the repo**, by full literal path (e.g. `C:\Users\DCL\projects\courier\apps\mobile\node_modules`) — never via a variable that could be empty.
3. Never put a variable in a delete path. Never run Linux commands in PowerShell/cmd (`mkdir -p` created a folder literally named `-p` last time). Use the shell you are in correctly.
4. Do not touch anything in `C:\Users\DCL\AppData`, `.claude`, `.config`, `.dsh`, `.omniroute`, `OneDrive`, Desktop, Documents, or other drives.
5. **No local Android emulator.** The emulator runs on GitHub Actions (see PHASE 3). Do not install/delete AVDs or SDK files locally.
6. If a command needs anything outside the repo, STOP and write it to `docs/FOUNDER_TODO.md` instead.

---

## Read first (in this order)
1. `docs/KICKOFF_PROMPT_EN.md` (the full mission, phases, rules, Definition of Done) — still binding.
2. `docs/AUDIT.md`, `docs/PROGRESS.md`, `docs/EXECUTOR_LOG.md` — where we are.
3. `docs/FINAL_PROMPT.md` §0-F and `docs/DECISIONS.md` D1–D21 — binding decisions.
4. `docs/PRODUCT_SPEC.md`, `docs/TECH_STACK.md` — what to build.
Write a 10-line plan in `docs/EXECUTOR_LOG.md`, commit, push, then start.

## Known state (from the audit)
- Lint has no ESLint config → add flat config (eslint.config.js) to every package; lint must pass.
- `apps/api/tests/auth/test_better_auth.py` = fake Python auth → delete with the fake module.
- `services/auth/` untracked, can't install (pnpm release-age policy) → pin versions that satisfy the policy or add a scoped, commented exception; never disable globally.
- Root `package.json` uses `"latest"` → pin exact versions.
- `pyproject.toml` has banned deps: redis, arq, passlib, python-jose → valkey client, Hatchet, pyjwt/joserfc with JWKS.
- `apps/mobile` uses `expo ~58` but D21 locks **SDK 57** → revert to 57 (or write an ADR with official proof that 57 is unavailable).
- `var(--` in mobile theme + design-tokens (7 files) → remove.
- `apps/mobile` has zero tests → add Jest + React Native Testing Library.
- Local Python pip is broken → use `uv` only.

## PHASE 2 — Fixes (one feature branch + commit + push each; merge to main when CI is green)
2.1 Real Better Auth (Node) in `services/auth` (plugins organization, expo, jwt); FastAPI verifies via JWKS; no default secrets; tests.
2.2 Unistyles 3 light/night themes from `packages/design-tokens` (hex), no `var(--`.
2.3 Address correction engine D8: `{original, corrected, reason, confidence, needs_question, options[]}`; non-existent number, misspelling, spoken self-correction, multi-suburb question, units/flats, RD; ≥95% on 50+ real Christchurch fixtures (LINZ data in `data/linz/`, gitignored — if missing, write to FOUNDER_TODO and use a small committed fixture subset for tests).
2.4 Cleanup: egg-info, `cleanup_avd.py` (delete it — local AVD work is no longer used), duplicate test-imports, pin versions, ESLint, banned deps.
2.5 Design to match the approved mockups (Driving night, Dictation report, Today's list): Figtree, big numbers, 72px buttons, SVG icons, no emoji.

## PHASE 3 — Android emulator on GitHub Actions (replaces local emulator)
Create `.github/workflows/android-e2e.yml`:
- `runs-on: ubuntu-latest`; enable KVM (udev rule step); setup Node + pnpm + Java 17 + Android SDK.
- Build the app: `npx expo prebuild --platform android` then `./gradlew assembleDebug` (or `eas build --local --platform android --profile preview`).
- Run on emulator with `reactivecircus/android-emulator-runner@v2` (api-level 34, target google_apis, arch x86_64, disable animations), install the APK, run **Maestro** E2E flows (`.maestro/*.yaml`) that open each screen and exercise: login, today's list, dictation, map render, delivered button, voice permission prompt.
- Compatibility screen test for B.7: sherpa-onnx load+transcribe sample, VisionCamera open, MapLibre render PMTiles, op-sqlite write/read, expo-audio record/play, Reanimated animate.
- Upload as artifacts: the APK, Maestro screenshots/video, logcat, test reports.
- Triggers: push to main, PRs, and `workflow_dispatch`.
Evidence = link to the green workflow run + downloaded artifacts referenced in `docs/evidence/b7/README.md`. Only then mark B.7 PASS.
Also add `.github/workflows/release-apk.yml` that builds a signed preview APK on tag `v*` and attaches it to a GitHub Release (signing keys from GitHub Secrets; if missing, build unsigned debug and note in FOUNDER_TODO).

## PHASE 4 — Build the complete product (follow KICKOFF_PROMPT_EN.md PHASE 4 order)
Maps (Canterbury PMTiles offline, weekly update, day/night) → sync (op-sqlite event log) → routing (Valhalla + VROOM + OR-Tools, saved route templates) → door memory → dictation mode → live voice agent (sherpa-onnx on device + Pipecat server, all languages, earbud button) → full voice tool catalog → driving mode → OCR label scan → POD photos → optional SMS → IRD logbook PDF → web dashboard → admin → Stripe NZD (Trial/Solo/Team) → team features → NZ Privacy Act PIA → store assets → acceptance test (Maestro on CI emulator) → `docs/HANDOVER.md`.
Every feature: spec → tests first → implement → lint/typecheck/test → CI emulator E2E green → commit + push → update PROGRESS.md.

## Rules (non-negotiable)
- Evidence rule: no PASS without CI run link / logs / screenshots in `docs/evidence/<step>/`.
- Git: feature branches, `git pull` (merge) before push, push every 30 min, **no force-push, no rebase**, tag milestones.
- Secrets only in `.env.local` (gitignored) or GitHub Secrets; never print or commit keys.
- Banned: NativeWind, Supabase, munim-maps, expo-av, expo-background-fetch, Redis ≥7.4, PowerSync, Arq, gpt4free/unofficial proxies in product, LiteLLM 1.82.7/1.82.8.
- Blocked? Try 3 approaches, log in `docs/BUGS.md`, take the fallback, move to the next independent task, add to FOUNDER_TODO.md. Never stop silently, never fake.
- If your context gets long: write a precise handoff in EXECUTOR_LOG.md (done / in progress / next), push, and continue in a new session from it.
- Report honestly at each checkpoint: done (with evidence), failed, not run.

**Start now.**
