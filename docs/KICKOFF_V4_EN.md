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

---

## 11. Open-source leverage plan (maps, routing, courier) — see docs/research/2026/oss-maps-courier.md
Verify each repo page first (stars, latest release, license, New Architecture compatibility) and record in `docs/LICENSES.md`.

### 11.1 Adopt (permissive licenses — use, modify, keep private)
1. **stadiamaps/ferrostar** — turn-by-turn + spoken guidance on Valhalla routes; Expo native module. Fallback: maplibre-navigation-android.
2. **protomaps/basemaps** — base for our day/night courier styles.
3. **protomaps/PMTiles** — Canterbury packs ≤ 50 MB, weekly diff updates in CI.
4. **komoot/photon** — self-hosted typo-tolerant geocoder (NZ); on device: LINZ FTS5 index in op-sqlite.
5. **VisionCamera code scanner + ML Kit text recognition + zxing-cpp** — label/barcode scanner squad.
6. **PyVRP** — benchmark vs VROOM on real 80–150-stop Christchurch days; keep the winner (or ensemble).
7. **Valhalla trace_attributes** — map-matching for IRD logbook km and per-segment speed learning; study on-device Valhalla, Plan B GraphHopper.
8. **traccar-client-android** — background-location foreground-service + battery-whitelist pattern.
9. **sherpa-onnx KWS + TTS** — wake word + spoken stop announcements.
10. **maplibre/maputnik** — design the "courier mode" style (house numbers from z17, entrances, access restrictions).
Also evaluate: openfreemap (online fallback/style ideas), versatiles, libpostal (server-side parser), traccar server (geofences, trip reports), k2-fsa/OmniVoice (D22).

### 11.2 Clean-room study protocol for copyleft projects (AGPL/GPL)
Projects: **fleetbase/fleetbase**, **fleetbase/navigator-app**, **GIScience/openrouteservice**, **osm-search/Nominatim**, **debpalash/VoiceStudio**, plus any other AGPL/GPL project found useful.
Goal: capture **100% of their features and behaviour** for our product, legally, without their code entering ours.
1. **Study team (Analyst role)**: read each project completely — README, docs, code, UI, API, data model, state machines, settings, edge cases, error handling, tests, issues/discussions (pain points users report). Install/run locally only inside `C:\Users\DCL\projects\courier\.study\` (gitignored) if needed.
2. Write a **functional specification** per project in `docs/study/<project>/SPEC.md`: every feature, screen, flow, option, status, rule, API behaviour, data field, and UX detail — described in our own words, as requirements and acceptance criteria. **No code, no copied text, no copied identifiers/schemas verbatim, no copied assets.** Include "what users complain about" and "how we will do it better".
3. Write `docs/study/<project>/GAP.md`: feature → have / better / planned (task) / skip (reason); merge into `docs/PARITY.md`.
4. **Build team (Engineer role, separate session/context)** implements from SPEC.md only, without opening the copyleft source, using our stack and our architecture. Log in EXECUTOR_LOG.md that the clean-room rule was followed.
5. Code review checks for similarity (no copied functions, comments, strings, file structure); any doubt → rewrite.
This gives every feature and idea while keeping Courier Copilot fully private.

### 11.3 Ongoing radar
Each squad re-scans GitHub monthly for new 2026 projects in its niche (filters: release in last 6 months, permissive license, New Architecture ready, active issues/maintainers, no supply-chain incidents) and updates `docs/research/2026/<area>.md` with keep / adopt / watch / reject.

---

## 12. Research methodology — deep, exhaustive, evidence-based (applies to §3, §10, §11 and every research sprint)

### 12.1 Coverage minimums per area
- Find **≥ 30 candidates**, shortlist **≥ 10**, deep-review **top 5**, benchmark **top 2–3** on our eval set (critical areas).
- Search window: everything maintained, with priority on 2025–2026 releases and repos created/trending in 2026.

### 12.2 Search strategies (use ALL, record every query in the area file)
1. `gh search repos "<keywords>" --sort stars` AND `--sort updated`, with `--language`, `--topic`, `pushed:>2026-04-01`, `created:>2025-01-01`, `stars:>50`.
2. GitHub **topics** pages (e.g. `topic:maplibre`, `topic:vehicle-routing-problem`, `topic:speech-recognition`, `topic:react-native`, `topic:offline-first`, `topic:ocr`).
3. **Awesome lists** for the area (awesome-react-native, awesome-maplibre, awesome-geospatial, awesome-speech, awesome-tts, awesome-ocr, awesome-selfhosted, awesome-logistics…).
4. **Dependents / "Used by"** of the leaders (who builds on MapLibre RN, VisionCamera, sherpa-onnx, VROOM) → find real production apps and newer libs.
5. **"Alternatives to X"** for every competitor/SaaS (Circuit, Route4Me, Onfleet, ElevenLabs, Wispr, Intercom…) on GitHub + openalternative.co + alternativeto.
6. Official sources: release notes/changelogs (Expo, React Native, MapLibre, Valhalla, sherpa-onnx, Better Auth, Stripe), RFCs, conference talks 2025–2026.
7. Model hubs for AI areas: Hugging Face (models + Spaces, filter by license, downloads, last updated), papers-with-code / arXiv 2025–2026 for SOTA, then find their GitHub implementations.
8. npm / PyPI / Maven: weekly downloads, versions, maintainers, deprecations.
9. Community signal: GitHub Discussions/Issues of the leaders, Reddit/HN threads for "best X 2026" — as leads only, always verified on the repo.

### 12.3 Per-candidate evidence card (in `docs/research/2026/<area>.md`)
repo URL · stars + 6-month star trend · created date · last release + date · release cadence · open/closed issues ratio + median response time · active maintainers (90 days) · license (code AND model weights/data) · New Architecture / Expo SDK 58 / Android API 34 support · bundle/model size · platform (on-device / server) · security advisories (GitHub/OSV) + supply-chain history · production users · docs quality · test coverage/CI status · what it does better than our current choice · risks · decision **KEEP / ADOPT / WATCH / REJECT** + reason.

### 12.4 Deep review of the top 5 (actually open the code)
Read the README, docs, architecture, main modules, tests, open critical issues, last 20 commits and PRs; run its example/demo inside `.study/` (gitignored, inside the repo only); note code quality, API ergonomics, extensibility, performance claims vs our measurements.

### 12.5 Benchmark before adopting (critical areas)
Same eval set, same device profile (CI emulator + one mid-range Android profile), same metrics as the squad targets; publish table + raw results in `docs/squads/<module>/benchmarks/`. Adopt only on measured win, permissive license, and healthy maintenance.

### 12.6 Anti-bias & honesty rules
- Don't stop at the first popular result; always include at least 3 newer/smaller challengers.
- Every claim needs a link; star counts and dates copied from the repo page on the day of research (write the date).
- Mark anything not verified as UNVERIFIED. No invented repos, numbers or benchmarks.
- Copyleft (AGPL/GPL) → clean-room study list (§11.2), never code.

### 12.7 Output of a research sprint
Per area file + squad research/decisions updates + `docs/research/2026/SPRINT-SUMMARY.md` (stack changes, adopt/drop list, ADRs to write, updated T5–T7 plan, risks) + ADRs for any locked-decision change.

### 12.8 Quality scorecard vs best-in-class (every module, after each sprint)
In `docs/squads/<module>/STATUS.md` and a roll-up `docs/QUALITY_SCORECARD.md`, score each module 0–10 on: **functionality** (vs PARITY.md), **accuracy/benchmark** (vs squad targets AND vs the best open-source project measured in §12.5), **UX/smoothness** (vs mockups + §5), **reliability** (tests, mutation score, offline/chaos), **performance** (vs §6.4 budgets), **security**. Each score cites evidence (benchmark table, CI run, screenshots). Show "ours vs best OSS vs best competitor" side by side. A module counts as done only at ≥ 8/10 in every dimension. Report progress as both % built and quality score.

---

## 13. Founder directives after research sprint #1 (2026-10-20) — binding

### 13.1 Redo the weak research properly (depth audit)
Sprint #1 was fast and some areas are thin (routing, maps, scanner, address, sync, navigation, background location, OCR have few repo links). Redo them, and finish all 24 V4 §3 areas.
- Each area: **≥ 30 evidence cards, each with its repo URL and the date read**; ≥ 10 shortlisted; top 5 deep-reviewed (code opened, last 20 commits/PRs, open critical issues).
- **Query log** per area: every query, filters, and number of results returned (table).
- **Verifier pass**: a second, independent Reviewer role spot-checks ≥ 20% of cards per area against the live repo page and records mismatches; any mismatch → re-check the whole area.
- **Gap focus**: for every area add "What we are missing" — features/capabilities found in the best repos and competitors that we don't have yet → each becomes a PARITY.md row with a task.
- No adoption without the benchmark (§12.5) once its eval set exists.

### 13.2 Spoke is the #1 competitor in New Zealand — full teardown
Spoke (Spoke Dispatch / Spoke Route Planner, formerly Circuit) is the main competitor for NZ couriers. Create `docs/study/spoke/`:
- `TEARDOWN.md`: every feature, screen, flow, setting, plan/price tier (NZD), onboarding, stop entry methods (voice, OCR, paste, import), optimisation options, navigation hand-off, POD, customer notifications, driver/dispatcher roles, team features, integrations, offline behaviour, Android/iOS differences, accessibility, languages — from public sources (website, help centre, docs, app store listings & screenshots, changelog/release notes, YouTube tutorials, reviews).
- `REVIEWS.md`: what NZ/AU drivers praise and complain about (App Store, Play Store, Reddit, Facebook groups) — ranked pain points.
- `BEAT-SPOKE.md`: feature-by-feature **match / beat** plan with our concrete advantage (voice-first hands-free, NZ address auto-correct with explanation, door memory, template rebuild, works online AND offline, privacy, price), each mapped to a task.
- Merge into PARITY.md; Spoke column is mandatory on every row. Also cover other NZ/AU players (NZ Post/CourierPost driver tools, Aramex, Mainfreight/Freightways contractors' apps, Routific, Upper, Route4Me) at lighter depth.
- Public information only; never use their code, assets, or private APIs.

### 13.3 Online AND offline — both are first-class
The app must be excellent in both modes, switching seamlessly:
- **Online**: server voice agent (Pipecat + server models), live re-optimisation, live traffic/ETAs, customer SMS, team dispatch, real-time sync, server geocoder (Photon/Pelias), cloud backups.
- **Offline**: on-device voice (sherpa-onnx), offline maps (PMTiles), LINZ index, on-device routing fallback, local event log; everything queues and syncs when back online.
- Test both modes and the transitions (airplane-mode on/off mid-route) in Maestro on the CI emulator; every feature declares its online and offline behaviour in its spec.

### 13.4 Voice: learn from OmniVoice and build our own equivalent
OmniVoice **code is Apache-2.0** (we may study and reuse it); its **pretrained weights are CC-BY-NC** (we may not ship them).
- Voice squad writes `docs/study/omnivoice/SPEC.md`: architecture, training pipeline, tokenizer, data, inference, how it reaches 600+ languages.
- Plan `docs/squads/voice/OWN-MODEL.md`: train/fine-tune our own weights with the Apache-2.0 code on **commercially-licensed or our own data** for the languages our drivers need first (NZ English + Māori place names, Arabic, Hindi/Punjabi, Mandarin, Samoan, Tongan, Spanish), with cost/GPU estimate, data sources and their licences, timeline, and the quality bar vs Kokoro/Qwen3-TTS.
- Until our own weights beat the benchmark: ship sherpa-onnx + Kokoro (device) and Qwen3-ASR/TTS (server) per ADR-004. The licence ledger gate stays.

### 13.5 Apply the same to every module
For each module: study how the best open-source projects and competitors build it, write the SPEC of what they do (in our words), list what we are missing, then build our own version — better and adapted to NZ couriers — through the full V4 process (tests first, two reviews for critical modules, CI + emulator green, benchmark targets met). **Zero known defects at merge.** Nothing is "done" without evidence and a scorecard ≥ 8/10 in every dimension (§12.8).
