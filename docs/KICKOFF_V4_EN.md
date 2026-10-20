# Courier Copilot — Executor Prompt V4: Company-Grade Build System

Binding order: `AGENTS.md` → **this file** → `docs/KICKOFF_V3_EN.md` (task list T1–T7) → `docs/KICKOFF_V2_EN.md` → `docs/FINAL_PROMPT.md` + `docs/DECISIONS.md`.
V3 says WHAT to build. **V4 says HOW**: research-first, a full virtual company, zero-defect gates, world-class UX, competitor parity, and strong protection. Apply V4 to every V3 task.

---

## 1. Operating model — you are a full software company
For every task you run these roles in sequence. Each role writes its output to `docs/work/<task-id>/<role>.md` (short, concrete). A role may not be skipped; the same model may play several roles, but each role must re-read the artifacts with fresh eyes and challenge them.

| # | Role | Output | Gate to pass |
|---|---|---|---|
| 1 | **Product Manager** | user story, acceptance criteria (Given/When/Then), driver-day scenario, out-of-scope | criteria testable & tied to PRODUCT_SPEC / DRIVER_INTERVIEW_1 |
| 2 | **Researcher (2026)** | `research.md` per §3 below | ≥ 5 relevant 2026 sources/repos compared, decision justified |
| 3 | **Competitor Analyst** | `parity.md` per §4 | every competitor feature for this area: match / beat / skip-with-reason |
| 4 | **Architect** | design: modules, interfaces, data model, failure modes, offline behaviour; ADR if a decision changes | reviewed by Security + QA roles |
| 5 | **UX/UI Designer** | screen spec per §5 (states, motion, copy, a11y) + reference to mockups | passes §5 checklist |
| 6 | **Engineer** | code via TDD (tests first), small commits | lint/type/test green locally |
| 7 | **QA Engineer** | unit + integration + Maestro E2E + edge cases + 50× backtest for core logic | §6 gates green |
| 8 | **Security Engineer** | threat model (STRIDE-lite), checks per §7 | zero high/critical |
| 9 | **Performance Engineer** | measurements per §6.4 | budgets met |
| 10 | **Code Reviewer** (adversarial, `doubt-driven-development`) | review.md: bugs, simplifications, risks; must find ≥ 3 issues or justify "none" | all must-fix resolved |
| 11 | **Release Manager** | PR description, CHANGELOG entry, evidence links, merge | CI + emulator green |
| 12 | **Tech Writer** | docs/HANDOVER sections, user-facing help text | updated |

Two independent review passes are required for **auth, payments, sync, address correction, voice, routing** (run the Code Reviewer role twice with different focus: correctness, then security/edge cases).

---

## 2. Zero-defect quality gates (CI enforces; you may not weaken them)
Create/maintain `CONSTRAINTS.md` (skill `constraint-driven-development`) and enforce in CI:
- TypeScript `strict: true`, `noUncheckedIndexedAccess`, no `any`, no `@ts-ignore`/`eslint-disable` without an issue link. Python: `ruff` + `mypy --strict` on app code.
- ESLint (incl. react-hooks, react-native a11y), Prettier, ruff format — zero warnings.
- Tests: unit coverage ≥ 85% lines on packages/ and services/, ≥ 90% on address engine, sync, auth, billing; mutation testing (Stryker / mutmut) score ≥ 70% on those core modules.
- Every bug fixed gets a regression test first.
- Maestro E2E for every user-facing flow on the CI emulator; screenshot diff (visual regression) against approved baselines.
- Dependency audit (`pnpm audit`, `pip-audit`/`uv` audit, OSV-Scanner) — zero high/critical; gitleaks — zero findings; Semgrep/CodeQL — zero high.
- License check: no GPL/AGPL in the mobile bundle; record licenses in `docs/LICENSES.md`.
- Bundle/APK size budget, startup time budget (§6.4) checked in CI.
- Forbidden to: delete/skip/xfail tests, lower thresholds, mock what the test claims to verify, mark PASS without a CI run link. CI fails on any `.skip`/`.only`.

---

## 3. Research-first protocol — for EVERY area, before coding
For each area below, search GitHub and official docs for what is **new in 2025–2026** (releases, trending repos, RFCs, changelogs). Use `gh search repos`/`gh api` with the token, release notes, and official docs (skill `source-driven-development`). Write `docs/research/2026/<area>.md` containing:
1. Top 5–10 candidates (repo URL, stars, last release date, license, maintenance health, Expo SDK/New Architecture compatibility).
2. What's new in 2026 for this area and which ideas we adopt.
3. Decision + why, risks, fallback. If it changes a locked decision → ADR + DECISIONS.md update.
4. Re-check before each phase that pinned versions are current and not compromised (security advisories).

Areas (minimum): UI kit & design systems for React Native 2026 · motion/animation & gesture patterns · map rendering, offline tiles & map styles · routing/VRP engines · address parsing/geocoding NZ · on-device STT/TTS/VAD/KWS · voice agent frameworks & turn-taking · LLM tool-calling/agent orchestration · offline-first sync & local DBs · auth (Better Auth ecosystem) · payments/subscriptions (Stripe, RevenueCat-style patterns) · notifications/SMS · OCR/label scanning · camera & POD · background location & battery · observability (GlitchTip/PostHog/Langfuse/OpenTelemetry) · testing (Maestro, visual regression, mutation) · CI/CD & OTA for Expo · security hardening for mobile/API · accessibility · i18n/RTL & multilingual voice · web dashboard (Next.js) · admin & analytics · developer workflow (monorepo, Turbo, code quality bots, AI-agent workflows and skills).
Prefer: actively maintained (release in last 6 months), permissive license, New Architecture ready, used in production. Never adopt a repo with known supply-chain incidents; pin exact versions.

---

## 4. Competitor parity — match or beat every feature
Use `docs/COMPETITIVE_RESEARCH.md` and `docs/RESEARCH_2026_WAVE3.md` (49-service parity matrix) as the base; refresh with 2026 updates (Circuit/Spoke, Route4Me, Upper, Routific, OptimoRoute, Onfleet driver app, Beans.ai, MyRouteOnline, Straightaway, Zeo, Road Warrior, RoadWarrior, Google/Apple Maps multi-stop, NZ Post/CourierPost/Aramex driver apps, plus any new 2026 entrant). Maintain `docs/PARITY.md`: one row per feature × competitor with status **Have / Better / Planned (task) / Skip (reason)**.
Must-cover feature families: fast stop entry (voice, OCR, paste, CSV, photo of manifest), route optimisation with time windows & priorities, saved route templates, re-optimise mid-route, navigation hand-off + built-in nav, stop notes & door memory, parcel location in van, POD (photo/signature/voice), failed-delivery reasons, customer ETAs/SMS, offline mode, earnings/mileage/IRD logbook, team dispatch, analytics, multi-language, accessibility, dark/night driving mode, widgets/lock-screen, Android Auto/CarPlay readiness (plan), wearable/earbud controls.
Our differentiators to make excellent: voice-first hands-free flow, NZ address auto-correction with explanation, door memory, template-based daily rebuild, on-device privacy.

---

## 5. UX, design & smoothness standard ("must not look AI-made")
Base: approved mockups (Driving night, Dictation report, Today's list) + `RESEARCH_2026_WAVE2.md` 22 design rules. Create `docs/design/SYSTEM.md` and keep it the single source:
- **Tokens** only from `packages/design-tokens` (color, type scale, spacing 4-pt grid, radii, elevation, motion). Figtree; tabular numbers for counts/ETAs.
- **Glanceable while driving**: primary info readable in < 1 s; min text 17 pt, key numbers 48–76 pt; touch targets ≥ 56 pt (primary 72 pt); one primary action per screen; max 2 taps for any driving action; everything also by voice.
- **States** for every screen: loading (skeleton, no spinners > 300 ms), empty, error with recovery action, offline, partial sync, permission denied, long lists (FlashList, 300+ stops).
- **Motion**: Reanimated 4 on UI thread, 60/120 fps, durations 150–250 ms, spring physics for sheets, shared-element transitions where meaningful, respect "reduce motion"; haptics on confirm/deliver/error; no jank (frame drops measured).
- **Night/day**: automatic by sunset + manual; night palette near-black, low blue, no pure white; map styles matching.
- **Copy**: plain NZ English, short, human; never "AI", never robotic; voice prompts ≤ 8 words while driving.
- **Accessibility**: WCAG 2.2 AA contrast, screen reader labels, dynamic type to 200%, colour-blind safe status colours, RTL-ready layouts for Arabic UI.
- **Icons**: one SVG/Material Symbols set, consistent weight; no emoji.
- Design review gate: each screen gets Maestro screenshots (day/night, small/large phone, 200% text) committed to `docs/evidence/design/` and compared to the mockups; fix until consistent.

---

## 6. Engineering standards
6.1 **Architecture**: feature-sliced modules; pure domain logic in packages (testable without RN); adapters behind interfaces for every external service (maps, STT, LLM, SMS, payments) with a fake for tests and free-first → paid fallback chain (COST_PLAN.md).
6.2 **Code**: small functions, explicit types, no dead code, no TODO without issue; consistent naming; error handling with typed results; structured logging with request IDs; no PII in logs.
6.3 **Data**: migrations versioned and reversible; event-log sync idempotent with conflict rules documented; door memory keyed by `stops.location_id`.
6.4 **Performance budgets** (CI-measured where possible): cold start ≤ 2 s mid-range Android; list of 300 stops scroll at 60 fps; voice command → action ≤ 700 ms on-device path; route optimise 200 stops ≤ 5 s server; APK ≤ 80 MB excluding map/voice packs (downloaded on first run); battery ≤ 8%/hour while driving mode active.
6.5 **Offline-first**: every driving-day action works with no network and syncs later.
6.6 **Observability**: GlitchTip errors, PostHog product events (privacy-safe), OpenTelemetry traces API, Langfuse for LLM calls; dashboards documented.

---

## 7. Security & protection (execution and product)
**Execution protection (you):** AGENTS.md safety rules are absolute; before any command that writes/deletes, print the absolute target path and assert it starts with the repo path; never run scripts downloaded from the internet without reading them; pin and verify checksums for downloaded binaries (planetiler, Valhalla data, models); never use unofficial model proxies; secrets only via `.env.local`/GitHub Secrets; GitHub token used only for this repo.
**Product security:** OWASP MASVS L1 (+ L2 for auth/storage) for mobile, OWASP ASVS L2 for API; Better Auth with rate limits, secure cookies, JWT ES256 short-lived + rotation; SQLCipher for on-device DB; TLS everywhere; input validation (zod/pydantic) at every boundary; RBAC/org scoping on every query (tests prove tenant isolation); audit log for admin actions; backups + restore test; NZ Privacy Act 2020 PIA; data retention policy; audio never stored by default; no driver/customer data to providers that train on it.
**Supply chain:** lockfiles committed, exact pins, Renovate/Dependabot with CI gate, SBOM (CycloneDX) per release, signed release APK, provenance in GitHub Release.

---

## 8. Workflow & repository discipline
- Branch per task `feat/<task-id>-<slug>`; Conventional Commits; PR template with: story, research link, parity link, evidence links, screenshots, risk, rollback.
- PR merges only when: CI green, Android E2E green, two-role review done, CHANGELOG updated, PROGRESS.md updated.
- Release train: tag after each phase (`v0.3.0-maps`, …), GitHub Release with APK + SBOM + notes; `v1.0.0` at handover.
- Keep the repo tidy: `apps/ services/ packages/ docs/ scripts/ .github/ .maestro/ data/ (gitignored)`; no stray files at root.
- Every session ends with: handoff in EXECUTOR_LOG.md, PROGRESS.md accurate, everything pushed.

---

## 9. Definition of Done (whole product)
All V3 tasks T1–T7 merged with evidence · PARITY.md has no "Planned" left for must-cover families · all §2 gates green in CI · Android E2E green on 2 emulator profiles (small + large screen) · performance budgets met with measurements · security checks zero high/critical · design screenshots approved against mockups · HANDOVER.md complete · FOUNDER_TODO.md lists only things only the founder can do (keys, accounts, store listing) · `v1.0.0` GitHub Release with signed APK.

**Now: continue the current V3 task, applying V4 from this point on. First, create `CONSTRAINTS.md`, `docs/PARITY.md` (skeleton from existing research), `docs/design/SYSTEM.md`, the PR template, and the CI gates in §2 — then resume T1.**

---

## 10. Specialist squads — a dedicated expert team per module
Each core module gets its own squad (the §1 roles, specialised). A squad owns: `docs/squads/<module>/` (research, design, decisions, benchmarks, evaluation datasets, test reports) and its code folder. A squad must research GitHub 2025–2026 for its exact niche (§3), build an **evaluation dataset + benchmark** before choosing anything, and publish results. No module is "done" until its benchmark targets are met on the CI emulator and recorded.

### 10.1 Voice Assistant Squad — "always with you, all day" (the heart of the product)
Roles: speech scientist (STT/TTS/VAD/KWS), conversation designer, agent/tool-calling engineer, on-device ML engineer, multilingual & accent specialist, latency/battery engineer, evaluation engineer.
Research on GitHub 2026 (compare ≥ 10): on-device/offline STT (sherpa-onnx, Moonshine, Parakeet, Whisper variants, Vosk-class), streaming STT, VAD (Silero), wake-word/KWS (sherpa-onnx KWS, openWakeWord-class), turn-taking/end-of-turn (Smart Turn), TTS (Kokoro, Piper-class, multilingual), voice-agent frameworks (Pipecat, LiveKit Agents, and newer 2026 projects), barge-in/interruptions, noise suppression for vans/traffic, earbud media-button handling on Android, multilingual models covering at least: English (NZ accent), Māori place names, Arabic, Hindi/Punjabi, Mandarin, Samoan/Tongan, Spanish — plus auto language detection and code-switching.
Build:
- **Always-available, battery-safe**: Android foreground service while driving mode is on; low-power wake word + VAD gate; STT only after trigger or earbud press; duty-cycle tuning; survive screen-off, Doze and app switching; resume after calls/music (audio focus).
- **Hybrid**: on-device first (commands, dictation, offline); server (Pipecat) for open conversation and complex tasks when online; seamless fallback.
- **Custom adaptation ("training")**: build a domain vocabulary from LINZ street/suburb names + courier phrases; use hotword/contextual biasing and custom KWS phrases; fine-tune only small models (KWS, intent/NLU, punctuation) with LoRA/adapters if benchmarks require; generate synthetic training/eval audio with multilingual TTS + real noise samples (van, rain, traffic, indicator clicks). Never send driver audio to training providers; consent-based opt-in only for improvement data.
- **Tool-calling agent**: every app action available as a typed tool (FINAL_PROMPT §4.5), confirmation policy enforced in the tool layer, short spoken replies (≤ 8 words while driving), never blocks driving.
- **Evaluation dataset** `docs/squads/voice/eval/`: ≥ 500 utterances across languages/accents/noise levels incl. NZ addresses, numbers, self-corrections ("7… no, 17").
- **Targets**: WER ≤ 8% NZ-English quiet / ≤ 15% van noise on addresses; intent accuracy ≥ 97%; wake-word false accepts ≤ 1/hour, misses ≤ 3%; command→action ≤ 700 ms on-device; battery ≤ 8%/hour driving mode; works fully offline for core commands.

### 10.2 Label Scanner Squad — address-only extraction
Roles: computer-vision engineer, OCR specialist, NZ address parsing expert, camera UX designer, evaluation engineer.
Research on GitHub 2026 (compare ≥ 8): on-device OCR (ML Kit text recognition v2, PaddleOCR/PP-OCR mobile, RapidOCR/ONNX, Apple Vision on iOS later), document/label detection, barcode/QR (to read courier barcodes when present), VisionCamera frame processors, text-region detection, layout analysis.
Build a **dedicated scanner that only finds and returns the delivery address**:
- Live camera with auto-detect of the label and the address block (ignore sender, barcodes text, marketing, phone numbers, "From:" blocks); highlight the detected address on screen; auto-capture when stable; works in low light, glare, angles, crumpled labels.
- Pipeline: frame → label detection → text regions → OCR → address-block classifier (recipient vs sender) → NZ address parser → D8 correction against LINZ → confidence; if low, ask one quick question.
- Batch mode: scan 200+ parcels fast (target ≤ 1.5 s per parcel), each adds a stop, auto-dedupe same address, optional parcel-location tag (front/mid/back shelf) by voice.
- Barcode assist: read barcode/QR to dedupe and link tracking numbers when available.
- Fully on-device and offline; no images uploaded unless the driver chooses POD.
- **Evaluation dataset** `docs/squads/scanner/eval/`: ≥ 300 real-style NZ courier label images (synthetic generated + founder-provided real photos with personal data redacted), varied carriers/layouts/lighting.
- **Targets**: correct recipient address ≥ 97% after LINZ correction; wrong-block (sender picked) ≤ 1%; ≤ 1.5 s per label on a mid-range Android.

### 10.3 Other squads (same rules: research ≥ 5–10 GitHub 2026 projects, eval set, benchmark targets)
- **Address Intelligence** (parser + D8 + LINZ index + door memory): ≥ 95% correction accuracy on LINZ-sampled set; zero wrong-house auto-corrections at confidence ≥ 0.9.
- **Routing & Templates** (Valhalla, VROOM, OR-Tools): solution within 5% of best-known on benchmark sets; 200 stops ≤ 5 s; templates rebuild a day in one tap.
- **Maps & Navigation** (PMTiles, styles, offline, turn-by-turn flag): 60 fps pan/zoom, full Canterbury offline, day/night styles.
- **Sync & Data** (op-sqlite event log ↔ Postgres): zero data loss under airplane-mode chaos tests, conflict rules tested.
- **Design System & Motion**: §5 standard; visual regression baselines.
- **Payments & Accounts** (Better Auth, Stripe NZD, teams): tenant isolation tests, webhook idempotency.
- **Web Dashboard & Admin**: Lighthouse ≥ 95 performance/a11y.
- **Platform/DevOps/Security**: CI/CD, emulator E2E, OTA, observability, SBOM, signed releases.

Each squad writes a short weekly-style status in `docs/squads/<module>/STATUS.md` (done with evidence, metrics vs targets, next, risks). The Release Manager blocks merges for any squad whose targets regress.
