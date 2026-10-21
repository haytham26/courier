# Courier Copilot — Executor Prompt V3 (continue after PHASE 3.1)

Binding, in this order: `AGENTS.md` (safety + skills) → this file → `docs/KICKOFF_V2_EN.md` → `docs/KICKOFF_PROMPT_EN.md` → `docs/FINAL_PROMPT.md` + `docs/DECISIONS.md`.
Repo: `C:\Users\DCL\projects\courier` → `haytham26/courier`. Work autonomously to the Definition of Done. Read `docs/EXECUTOR_LOG.md` for your last handoff.

## 🔴 Safety (unchanged, absolute)
Only inside the repo folder. No destructive commands outside `node_modules/dist/build/.turbo/.expo` in the repo (full literal paths, never variables). No local emulator. No force-push / rebase. Secrets never printed, logged or committed.

## New credentials available in `.env.local` (gitignored)
- `GITHUB_TOKEN` — fine-grained token scoped to `haytham26/courier` only. Use it for `gh` (`$env:GH_TOKEN` from .env.local at runtime; never echo it). Allowed: read/re-run Actions, read logs, download artifacts, open/merge PRs on this repo, create releases. Not allowed: change repo settings, secrets, branch protection, delete branches/tags/releases, touch any other repo.
- `LINZ_LDS_API_KEY` — LINZ Data Service (read-only data access, WFS).

## Task list (in order; one feature branch per task; PR → CI green → merge to main)

### T1 — Merge the stacked branches
`feat/3.1-ci-and-android-e2e` contains 2.1–2.4. Open a PR to `main` with `gh pr create`, wait for CI green (`gh pr checks --watch`), merge (`gh pr merge --merge`). This also triggers the Android E2E workflow.

### T2 — Expo version decision (D21)
`apps/mobile` is `expo ~58` / RN 0.88; D21 locks SDK 57. Either downgrade to SDK 57 (`npx expo install expo@~57 --fix` + align all native modules), or write `docs/adr/ADR-002-expo-58.md` citing the official Expo changelog AND proving every native module (sherpa-onnx, VisionCamera, MapLibre 11.3.7, op-sqlite, Reanimated 4, Unistyles 3) supports 58, then update D21 in DECISIONS.md. No silent version changes.

### T3 — Android emulator on GitHub Actions green (B.7)
Watch `android-e2e.yml` runs with `gh run list/view --log-failed`, fix until green: APK built, emulator boots, all Maestro flows pass, compat screen exercises every native module, artifacts uploaded (APK, screenshots, video, logcat). Record run URL + artifact list in `docs/evidence/b7/README.md`. Only then mark B.7 PASS. Also make `release-apk.yml` publish a GitHub Release with the APK on tag `v0.2.0-phase-3`.

### T4 — LINZ addresses (real data)
Write `scripts/fetch-linz.py` (uv; reads `LINZ_LDS_API_KEY`; never logs it). Verify the current "NZ Addresses" layer ID in LINZ docs (expected 105689). Download Canterbury (at least Christchurch, Waimakariri, Selwyn) via WFS/Exports, EPSG:4326, to `data/linz/` (gitignored). Build the local index used by the D8 engine. Accuracy test on 50+ real addresses sampled from LINZ incl. units, RD, multi-suburb names, misspellings, non-existent numbers; target ≥ 95%. Report → `docs/evidence/phase-2.3/linz-accuracy.md` (report only, never the data).

### T5 — Offline Canterbury map
Download the NZ OSM extract from Geofabrik, clip to Canterbury, build PMTiles with planetiler into `data/maps/` (gitignored). `scripts/build-map.ps1` for weekly updates + a scheduled GitHub Action that builds it and publishes it as a release asset. Day + night MapLibre styles matching the mockups. The app bundles/downloads the PMTiles and works fully offline.

### T6 — PHASE 2.5 design
Screens match the approved mockups (Driving night, Dictation report, Today's list): Figtree, big numbers, 72 px primary buttons, SVG/Material Symbols icons, no emoji, no mock data in production paths. Maestro screenshots as evidence.

### T7 → PHASE 4, the complete product (each = spec → tests → implement → CI + emulator green → merge)
1. Sync engine (op-sqlite event log ↔ Postgres)
2. Routing: Valhalla + VROOM + OR-Tools; saved route templates (rebuild daily route from template in one tap)
3. Door memory (delivery_event.stop_id → stops.location_id; never nearest-neighbour)
4. Dictation mode (silent capture → auto-correct → report "you said X → corrected Y", questions only when needed)
5. Live voice agent (sherpa-onnx on device + Pipecat server; all languages; earbud button; "delivered" by voice / earbud / tap)
6. Full voice tool catalog (FINAL_PROMPT §4.5)
7. Driving mode (geofences, whispers, navigation)
8. OCR label scan (VisionCamera + ML Kit)
9. Proof-of-delivery photos (and POD by voice)
10. Optional customer SMS
11. IRD logbook PDF
12. Web dashboard (Next.js) + admin
13. Stripe NZD billing: Trial / Solo / Team
14. Team / franchise features
15. NZ Privacy Act PIA, store assets, acceptance test on the CI emulator, `docs/HANDOVER.md`, final release `v1.0.0` with APK.
Keys that don't exist yet (Stripe, SMS, LLM providers, Oracle server): build with test/mocked adapters behind interfaces, list every needed key ONCE in `docs/FOUNDER_TODO.md`; real-service tests run at the single keys checkpoint before handover.

## Every task
- Apply the skills mapped in AGENTS.md; log which ones in EXECUTOR_LOG.md.
- Evidence in `docs/evidence/<task>/` (CI run URLs, logs, screenshots). No PASS without it.
- Push at least every 30 min; update PROGRESS.md + EXECUTOR_LOG.md at each task end.
- Blocked: 3 attempts → `docs/BUGS.md` → fallback → next independent task → FOUNDER_TODO. Never stop silently, never fake.
- Long context: write a precise handoff in EXECUTOR_LOG.md, push, continue in a new session from it.

**Start with T1 now.**
