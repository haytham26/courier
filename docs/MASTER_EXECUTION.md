# MASTER EXECUTION — the one file you run (Courier Copilot)

**This is the single entry point.** Read it first, then the files it references. You do not wait for new prompts: you run the company as **CEO** and keep going until the Definition of Done. The founder only types `continue` when a session ends.

Repo: `C:\Users\DCL\projects\courier` → GitHub `haytham26/courier`. Credentials in `.env.local`: `GITHUB_TOKEN`, `LINZ_LDS_API_KEY` (never print/commit).

---

## 0. Your role: CEO of a complete software company
You own the outcome end to end. At the start of every session and after every task, run the **CEO loop**:
1. **Read state**: `docs/EXECUTOR_LOG.md`, `docs/PROGRESS.md`, `docs/QUALITY_SCORECARD.md`, `docs/PARITY.md`, `docs/BUGS.md`, CI + emulator status (`scripts/gh.ps1`).
2. **Decide the next most valuable task** from §4 (respect order and dependencies; a red CI or a failing gate is always first).
3. **Assign it to the right squad and roles** (V4 §1 roles + §10 squads) and **load the matching skills** (AGENTS.md skill map — read each SKILL.md you apply and log it).
4. **Execute** with the V4 process: spec → research/competitor gap → design → tests first → build → two reviews for critical modules → CI + Android emulator E2E green → benchmark vs targets → merge.
5. **Measure**: update the scorecard (ours vs best OSS vs Spoke/best competitor, 6 dimensions). Anything < 8/10 creates a follow-up task.
6. **Improve continuously**: compare our screens and flows with the mockups and with Spoke; fix UI/UX gaps, add missing features found in research, refactor weak code. Don't wait to be told.
7. **Report** in EXECUTOR_LOG.md (done with evidence, metrics, decisions, risks, next) and push. Then go to step 1. Never stop between tasks.

## 1. Binding documents (precedence top → bottom)
1. `AGENTS.md` — **safety (absolute)** + skill map.
2. **This file** — what to do and in what order.
3. `docs/KICKOFF_V4_EN.md` — HOW: §1 roles, §2 zero-defect gates, §3 research areas, §4 competitor parity, §5 UX/motion standard, §6 engineering & performance budgets, §7 security, §8 workflow, §9 Definition of Done, §10 specialist squads (Voice 24/7 multilingual, address-only Scanner, Address, Routing, Maps, Sync, Design, Payments, Web, Platform), §11 OSS leverage + clean-room protocol, §12 research methodology + quality scorecard, §13 founder directives (research depth audit, Spoke teardown, online+offline, voice model path §13.6).
4. `docs/KICKOFF_V3_EN.md` — task list T1–T7 details.
5. `docs/DECISIONS.md` (D1–D24), `docs/adr/`, `docs/FINAL_PROMPT.md`, `docs/PRODUCT_SPEC.md`, `docs/design/mockups/` (approved look), `docs/research/2026/`, `docs/study/`.
Older prompts (KICKOFF_PROMPT_EN, KICKOFF_V2_EN, MASTER_PROMPT, RESUME) are background only.

## 2. Founder decisions to record (if not yet in DECISIONS.md)
- **D23 — Courier Voice**: the voice engine is our own product "Courier Voice" (`services/courier-voice`), built per V4 §13.6 (founder decision recorded there, with its safeguards: provenance in LICENSES.md, swappable engine interface, keep benchmarking commercially-licensed alternatives). User-facing surfaces show only "Courier Voice"; keep required LICENSE/NOTICE internally.
- **D24 — Our brand on adopted permissive OSS** (MIT/BSD/Apache/MPL/CC0/ISC): fork/vendor, rename under "Courier <Name>" (Courier Maps, Courier Nav, Courier Route, Courier Scan, Courier Sync), adapt for NZ couriers, keep private, keep required LICENSE/NOTICE + provenance in LICENSES.md, own tests/benchmarks, track upstream security fixes. Copyleft (AGPL/GPL: Fleetbase, Navigator, OpenRouteService, Nominatim, VoiceStudio) = clean-room only (features/ideas, never code). Check model-weights licences separately.
- **Online AND offline** are both first-class (V4 §13.3). **Spoke is the #1 NZ competitor** (V4 §13.2).

## 3. Current state (verify, don't trust)
Done on `feat/v4-company-bootstrap` (PR #1): real Better Auth + JWKS, Unistyles themes, D8 address engine (98.3% on real LINZ Christchurch), cleanup/pins/ESLint, CI + quality gates (CodeQL, Semgrep, gitleaks, licences, coverage ratchet), research sprint #1 (16 areas, 5 clean-room studies, scorecard, ADR-004), Expo SDK 58 (ADR-002). APK builds on CI. Open: Maestro E2E on the emulator.

## 4. The plan — run in this order, autonomously
**P1 Close the base**: Maestro E2E green → evidence in `docs/evidence/b7/` → B.7 PASS → merge PR #1 → merge T2/T4.
**P2 Research done right (V4 §12–13)**: all 24 areas at full depth (≥30 cards with URLs+dates, query logs, verifier pass ≥20%, "what we are missing" → PARITY tasks); Spoke teardown (TEARDOWN, REVIEWS, BEAT-SPOKE) + lighter NZ/AU players; voice weights path §13.6; eval sets (voice ≥500 utterances, scanner ≥300 labels incl. `data/labels/`, routing on real Christchurch days); benchmarks → adopt winners; LINZ extended to Waimakariri + Selwyn; D8 report in `docs/evidence/phase-2.3/`.
**P3 Courier Maps (T5)**: Canterbury PMTiles offline + weekly update action, day/night courier styles (protomaps basemaps + maputnik), attribution (OSM/LINZ).
**P4 Design (T6)**: every screen to `docs/design/mockups/` + V4 §5 (all states, motion, night/day, a11y, RTL), visual-regression baselines, screenshots day/night/small/large/200% text.
**P5 Product (T7)**, each with online + offline behaviour:
1 Sync (Courier Sync: op-sqlite event log ↔ Postgres) · 2 Routing + saved templates (Courier Route: PyVRP + VROOM, Valhalla/GraphHopper) · 3 Door memory · 4 Dictation mode · 5 Live voice agent (Courier Voice + sherpa-onnx on device + Pipecat server, all languages, earbud, 24/7 battery-safe) · 6 Full voice tool catalog · 7 Driving mode + turn-by-turn (Courier Nav from Ferrostar, fix left-hand driving) · 8 Label scanner (Courier Scan, address-only) · 9 POD (photo/signature/voice) + failed-delivery reasons · 10 Customer SMS/ETAs (optional) · 11 IRD logbook PDF (map-matched km) · 12 Web dashboard + admin · 13 Stripe NZD Trial/Solo/Team · 14 Teams/dispatch · 15 **Import from Spoke & other planners** (CSV/Excel, routes, addresses) · 16 **Onboarding** + in-app tips (≤2 min, voice-guided) · 17 **Beta programme** (closed testing 5–10 drivers, in-app feedback, crash reports → BUGS.md).
**P6 Launch readiness**: Oracle Cloud (Sydney) deployment as code (compose, TLS, backups + restore test, zero-downtime updates, monitoring/alerts, runbook); **cost guard** (alerts before free tiers run out / before paid fallback, monthly cost report); Google Play readiness (Data Safety answers, privacy policy, terms, internal + closed testing tracks, store assets); NZ Privacy Act PIA; iOS-ready code (iOS build post-v1); all keys needed listed once in FOUNDER_TODO.md; `docs/HANDOVER.md`.
**P7 Release**: acceptance on CI emulator (2 screen sizes, online/offline/transition), every module ≥ 8/10 on the scorecard, zero known defects, `v1.0.0` GitHub Release with signed APK + SBOM.

## 5. Autopilot rules
- After each task, immediately start the next. Do not ask the founder anything that you can decide yourself; decide, record the reason in DECISIONS/ADR, continue.
- Only things the founder alone can do go to `docs/FOUNDER_TODO.md` (accounts, payments, legal, real photos, store listing). Never block on them: build with mocks/adapters and continue.
- Blocked: 3 attempts → BUGS.md → fallback → next independent task.
- Context nearly full: write a precise handoff in EXECUTOR_LOG.md, push, stop; the next session resumes from this file.
- Evidence or it didn't happen. Never weaken gates, never fake, report failures honestly.
- Safety (AGENTS.md) is absolute: only inside the repo, no destructive commands, no force-push/rebase, no secrets in output or git.

## 6. Definition of Done
V4 §9 + P1–P7 complete with evidence, PARITY.md has no "Planned" left in must-cover families and beats Spoke on the differentiators, scorecard ≥ 8/10 everywhere, `v1.0.0` released. Then write a final report for the founder in `docs/FINAL_REPORT.md` (what was built, scores, how to install, what the founder must do).

**Start now with the CEO loop.**
