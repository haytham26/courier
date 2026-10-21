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
4b. **Security gate**: the Security squad reviews every change (threat model, SAST/DAST, auth/tenant tests); no merge without it.
5. **Measure**: update the scorecard (ours vs best OSS vs Spoke/best competitor, 6 dimensions). Anything < 8/10 creates a follow-up task.
6. **Improve continuously**: compare our screens and flows with the mockups and with Spoke; fix UI/UX gaps, add missing features found in research, refactor weak code. Don't wait to be told.
7. **Report** in EXECUTOR_LOG.md (done with evidence, metrics, decisions, risks, next) and push. Then go to step 1. Never stop between tasks.

## 1. Binding documents (precedence top → bottom)
1. `AGENTS.md` — **safety (absolute)** + skill map.
2. **This file** — what to do and in what order.
3. `docs/KICKOFF_V4_EN.md` — HOW: §1 roles, §2 zero-defect gates, §3 research areas, §4 competitor parity, §5 UX/motion standard, §6 engineering & performance budgets, §7 security, §8 workflow, §9 Definition of Done, §10 specialist squads (Voice 24/7 multilingual, address-only Scanner, Address, Routing, Maps, Sync, Design, Payments, Web, Platform), §11 OSS leverage + clean-room protocol, §12 research methodology + quality scorecard, §13 founder directives (research depth audit, Spoke teardown, online+offline, voice model path §13.6).
4. `docs/KICKOFF_V3_EN.md` — task list T1–T7 details.
5. **`docs/SAAS_CHECKLIST.md`** — security squad (top priority, merge gate), Google sign-in + Play Integrity, login-attempt limits, MFA, keep-screen-awake and all driver-runtime essentials, full SaaS business + operations + automation. Every item must become a task.
6. **`docs/COVERAGE_MAP.md`** — every real-world courier scenario, safety/law, money/IRD/GST/Xero, AI that learns the run, customers, teams, ISO 25010 quality, compliance, ops, support, go-to-market, data, localisation. **Run a Coverage Audit at the start of every phase** and add anything missing; the map only grows.
7. `docs/DECISIONS.md` (D1–D24), `docs/adr/`, `docs/FINAL_PROMPT.md`, `docs/PRODUCT_SPEC.md`, `docs/design/mockups/` (approved look), `docs/research/2026/`, `docs/study/`.
Older prompts (KICKOFF_PROMPT_EN, KICKOFF_V2_EN, MASTER_PROMPT, RESUME) are background only.

## 2. Founder decisions to record (if not yet in DECISIONS.md)
- **D23 — Courier Voice**: the voice engine is our own product "Courier Voice" (`services/courier-voice`), built per V4 §13.6 (founder decision recorded there, with its safeguards: provenance in LICENSES.md, swappable engine interface, keep benchmarking commercially-licensed alternatives). User-facing surfaces show only "Courier Voice"; keep required LICENSE/NOTICE internally.
- **D24 — Our brand on adopted permissive OSS** (MIT/BSD/Apache/MPL/CC0/ISC): fork/vendor, rename under "Courier <Name>" (Courier Maps, Courier Nav, Courier Route, Courier Scan, Courier Sync), adapt for NZ couriers, keep private, keep required LICENSE/NOTICE + provenance in LICENSES.md, own tests/benchmarks, track upstream security fixes. Copyleft (AGPL/GPL: Fleetbase, Navigator, OpenRouteService, Nominatim, VoiceStudio) = clean-room only (features/ideas, never code). Check model-weights licences separately.
- **Online AND offline** are both first-class (V4 §13.3). **Spoke is the #1 NZ competitor** (V4 §13.2).

## 3. Current state (verify, don't trust)
Done on `feat/v4-company-bootstrap` (PR #1): real Better Auth + JWKS, Unistyles themes, D8 address engine (98.3% on real LINZ Christchurch), cleanup/pins/ESLint, CI + quality gates (CodeQL, Semgrep, gitleaks, licences, coverage ratchet), research sprint #1 (16 areas, 5 clean-room studies, scorecard, ADR-004), Expo SDK 58 (ADR-002). APK builds on CI. Open: Maestro E2E on the emulator.

## 4. The plan — run in this order, autonomously
**P1 Close the base**: Maestro E2E green → evidence in `docs/evidence/b7/` → B.7 PASS → merge PR #1 → merge T2/T4.
  - **Emulator pipeline must be fixed at the root, not patched** (history: first runs waited for Metro; after the release-APK fix every run was cancelled by the next push). Required design: triggers = PR to main + nightly + manual only (no push), docs paths ignored; build job (release APK, cached by content hash, artifact) separate from e2e job (reuses the APK); AVD snapshot cache; readiness gates with short timeouts (boot → install → am start → pid → first-screen testID) that dump evidence and fail fast; smoke flow first; app runs in an E2E mode on local mocks (no Metro/auth/API); evidence uploaded on every run; `scripts/e2e-local.ps1` for local reproduction; work on a dedicated PR and don't push to it mid-run. Iterate on evidence until green; change approach after 3 identical failures; never skip. A red nightly is the first task of the next session.
**P2 Research done right (V4 §12–13)**: all 24 areas at full depth (≥30 cards with URLs+dates, query logs, verifier pass ≥20%, "what we are missing" → PARITY tasks); Spoke teardown (TEARDOWN, REVIEWS, BEAT-SPOKE) + lighter NZ/AU players; voice weights path §13.6; eval sets (voice ≥500 utterances, scanner ≥300 labels incl. `data/labels/`, routing on real Christchurch days); benchmarks → adopt winners; LINZ extended to Waimakariri + Selwyn; D8 report in `docs/evidence/phase-2.3/`.
**P3 Courier Maps (T5)**: Canterbury PMTiles offline + weekly update action, day/night courier styles (protomaps basemaps + maputnik), attribution (OSM/LINZ).
**P4 Design (T6)**: every screen to `docs/design/mockups/` + V4 §5 (all states, motion, night/day, a11y, RTL), visual-regression baselines, screenshots day/night/small/large/200% text.
**P5 Product (T7)**, each with online + offline behaviour:
1 Sync (Courier Sync: op-sqlite event log ↔ Postgres) · 2 Routing + saved templates (Courier Route: PyVRP + VROOM, Valhalla/GraphHopper) · 3 Door memory · 4 Dictation mode · 5 Live voice agent (Courier Voice + sherpa-onnx on device + Pipecat server, all languages, earbud, 24/7 battery-safe) · 6 Full voice tool catalog · 7 Driving mode + turn-by-turn (Courier Nav from Ferrostar, fix left-hand driving) · 8 Label scanner (Courier Scan, address-only) · 9 POD (photo/signature/voice) + failed-delivery reasons · 10 Customer SMS/ETAs (optional) · 11 IRD logbook PDF (map-matched km) · 12 Web dashboard + admin · 13 Stripe NZD Trial/Solo/Team · 14 Teams/dispatch · 15 **Import from Spoke & other planners** (CSV/Excel, routes, addresses) · 16 **Onboarding** + in-app tips (≤2 min, voice-guided) · 17 **Beta programme** (closed testing 5–10 drivers, in-app feedback, crash reports → BUGS.md).
**P6 Launch readiness**: Oracle Cloud (Sydney) deployment as code (compose, TLS, backups + restore test, zero-downtime updates, monitoring/alerts, runbook); **cost guard** (alerts before free tiers run out / before paid fallback, monthly cost report); Google Play readiness (Data Safety answers, privacy policy, terms, internal + closed testing tracks, store assets); NZ Privacy Act PIA; iOS-ready code (iOS build post-v1); all keys needed listed once in FOUNDER_TODO.md; `docs/HANDOVER.md`.
**P7 Release**: acceptance on CI emulator (2 screen sizes, online/offline/transition), every module ≥ 8/10 on the scorecard, zero known defects, `v1.0.0` GitHub Release with signed APK + SBOM.

## 5. Autopilot rules
- **Session start**: verify state from GitHub (branch, PRs, latest CI/E2E conclusions) and write a 5-line state check in EXECUTOR_LOG.md before acting.
- Never sit idle waiting for CI: work on independent tasks on other branches meanwhile.
- After each task, immediately start the next. Do not ask the founder anything that you can decide yourself; decide, record the reason in DECISIONS/ADR, continue.
- Only things the founder alone can do go to `docs/FOUNDER_TODO.md` (accounts, payments, legal, real photos, store listing). Never block on them: build with mocks/adapters and continue.
- Blocked: 3 attempts → BUGS.md → fallback → next independent task.
- Context nearly full: write a precise handoff in EXECUTOR_LOG.md, push, stop; the next session resumes from this file.
- Evidence or it didn't happen. Never weaken gates, never fake, report failures honestly.
- Safety (AGENTS.md) is absolute: only inside the repo, no destructive commands, no force-push/rebase, no secrets in output or git.

## 6. Definition of Done
V4 §9 + P1–P7 + every must-have in docs/SAAS_CHECKLIST.md and docs/COVERAGE_MAP.md complete with evidence, PARITY.md has no "Planned" left in must-cover families and beats Spoke on the differentiators, scorecard ≥ 8/10 everywhere, `v1.0.0` released. Then write a final report for the founder in `docs/FINAL_REPORT.md` (what was built, scores, how to install, what the founder must do).

**Start now with the CEO loop.**

## 7. Senior review fixes (binding)
1. **CI budget**: private-repo Actions minutes are limited and the emulator job takes ~20–30 min. Run Android E2E on PRs to main + nightly + manual only (not every push); cache Gradle/AVD; fail fast; report monthly minutes used in the cost report. If minutes run low, write it in FOUNDER_TODO (paid minutes or a self-hosted runner) — never silently skip E2E.
2. **Small PRs**: no more mega-branches. One task = one branch = one PR (< ~800 changed lines excluding generated/docs), merged within a day. Enable branch protection on main (required checks: CI, quality gates, CodeQL, Android E2E on PR) via the token if permitted, else FOUNDER_TODO.
3. **Founder approval gates** (the only things that pause for the founder; everything else is autopilot): production deploy of a new server, turning on live payments, Play Store submission/production rollout, deleting any production data, any new paid service. Prepare everything, then list it in FOUNDER_TODO and continue other work.
4. **Google Play policy specifics**: background location needs the permissions declaration + video and a prominent in-app disclosure; foreground service types declared (location, microphone, dataSync); digital subscriptions bought inside the Android app must follow Play Billing rules (decide with an ADR: Play Billing for in-app purchase vs. web-only Stripe sign-up with no in-app purchase links, per current Play policy for the NZ region); account deletion in-app + web link; target the current required API level.
5. **Battery vs keep-awake**: keep-awake only while driving mode is active and the screen is in navigation/dictation; measured in the battery benchmark.
6. **Source of truth = CI artifacts**: progress claims must link to CI runs/artifacts produced by GitHub, not local logs. Self-reported numbers without a CI link are NOT VERIFIED.
7. **Context discipline**: read only the sections you need for the current task (use the section numbers); keep EXECUTOR_LOG.md handoffs short and precise.
8. **Success metrics** (track in QUALITY_SCORECARD + weekly report): time to load a 200-stop day (target < 5 min vs 1–2 h today), address auto-correct accuracy, voice command success rate, crash-free sessions ≥ 99.5%, offline-day completion without data loss, battery per hour, driver satisfaction (beta).
9. **Data hygiene**: label photos and voice samples may contain personal data — redact/blur before any use in eval sets, never commit them, document consent.
10. **Weekly founder report** (`docs/reports/YYYY-WW.md`, every 7 days of work): what shipped (with CI links), scorecard changes, Spoke gap status, risks, costs, founder actions needed — in plain language.

## 8. Founder directives — design, backend rigor, decision rights, REA (binding)

### 8.1 Design must be unique, modern, ultra-smooth — never "AI-looking"
- Signature identity: a distinct courier visual language (own typography scale, motion personality, iconography details, map style, sounds/haptics) defined in `docs/design/SYSTEM.md` + a "brand board". Compare every screen against the mockups AND against Spoke/Circuit, Uber Driver, Apple/Google Maps, Linear, Arc — it must look premium and unmistakably ours.
- Use the best **2025–2026** UI/motion libraries found in research (V4 §12): e.g. Reanimated 4 (shared values, layout animations, CSS-style animations), react-native-skia (shaders, blur, gradients, particle/3D-feel effects), Gesture Handler 3, FlashList 2, MapLibre 3D buildings/pitch, Lottie/Rive for micro-illustrations — verify each is current, maintained and New-Architecture ready.
- Subtle **3D/depth**: tilted map with 3D buildings in driving mode, depth on sheets/cards, parallax and spring physics — always 60/120 fps, measured (frame-time traces in evidence); never at the cost of glanceability or battery.
- Anti-AI-look checklist (fail the design gate if any): generic gradients/purple-blue AI palette, emoji icons, stock illustrations, centered hero cards everywhere, uniform rounded boxes, filler copy, inconsistent spacing. A human-design review role signs off each screen with screenshots.

### 8.2 Backend: zero guessing, verified 100%
- Every endpoint/job specified first (OpenAPI/JSON Schema + state machines); **contract tests** generated from the spec; **property-based tests** (Hypothesis / fast-check) for address, routing, sync, billing; **mutation score ≥ 80%** on these; **integration tests** against real Postgres/PostGIS, Valkey and services in docker (Testcontainers), not mocks; **load tests** (k6) at 10× expected peak; **chaos tests** (kill services, network loss, duplicated/out-of-order events) — zero data loss, idempotent.
- Migrations: forward + rollback tested on a copy of realistic data. Every external call: timeout, retry with backoff, circuit breaker, idempotency key.
- Numbers come only from CI runs with linked artifacts. Any unverified claim is NOT VERIFIED; any flaky test is a P1 bug.
- Independent verification: the QA squad and the Security squad each re-run and sign off; the author can't approve their own work.

### 8.3 Decision rights (who decides)
- **CEO (you)**: priorities, plan order, trade-offs across squads, final merge decision after gates.
- **Squad lead** (per module): technical choices inside the module — via research + benchmark + ADR.
- **Architect**: cross-module interfaces, data model, ADRs that change locked decisions.
- **Security lead**: veto on any change with a security risk. **QA lead**: veto when tests/evidence are missing.
- **Design lead**: veto on screens failing §8.1 or the mockups.
- **Founder**: only the approval gates in §7.3 and business choices (pricing, brand name, legal).
Every decision is written (ADR or DECISIONS.md) with the reason; disagreements are resolved by data (benchmark/test), not opinion.

### 8.4 REA (github.com/morluto/rea, MIT) — allowed uses
Install `rea-agents` inside the repo workflow and use it for: (a) **our own APK and services** — security/reverse-engineering audit of what we ship (secrets, endpoints, obfuscation, tamper resistance) before every release; (b) **open-source projects we adopt or study** (their source is already public) to map architecture and behaviour quickly. Run it only inside the repo folder (`.study/`), never with cracked tools. Competitor apps (Spoke, etc.): study through public sources and by using the app as a normal user (screens, flows, features, timings) — do not decompile or extract their code/assets (their terms forbid it); record findings in docs/study/spoke/.

## 9. Every feature works fully WITHOUT voice + innovation (binding)
- **Touch-complete**: many drivers won't use voice. Every feature must be fully usable by touch alone (and by voice alone, and mixed). Voice is an accelerator, never the only path. Each spec lists: touch flow, voice flow, offline behaviour, online behaviour.
- **Match then beat**: every feature Spoke and other competitors have exists in our touch UI at least as fast (measure taps and seconds per task vs Spoke in BEAT-SPOKE.md), then improved.
- **Innovation backlog** `docs/INNOVATION.md`, owned by the CEO, reviewed every phase; each idea gets a quick prototype + driver-value score, and the best ship. Starting ideas:
  - Smart stop entry without typing: snap a manifest page/label stack, paste a WhatsApp/email list, share-to-app from any app, barcode burst scan, CSV drag-in on web.
  - One-swipe delivery: swipe-right delivered, swipe-left fail with reason chips; auto-advance; undo for 5 s.
  - Auto-arrival detection (geofence + speed) that pre-opens the stop card; auto-depart marks next.
  - "Van map": visual shelf layout where each parcel's position is shown when you arrive.
  - Day templates that self-update from what you actually did (learned stop order and service time).
  - Address confidence colours + one-tap "fix pin" that teaches door memory.
  - Glanceable widget / lock-screen live activity (next stop, count, ETA).
  - Hazard & access notes shared within a team (gate codes, dogs) with privacy controls.
  - Earnings live counter and end-of-day summary card shareable to accounting.
  - Offline-first everything with visible sync status; works in dead zones (rural Canterbury).
  - Gesture + haptic language consistent across the app; big-glove mode.
  Add new ideas from research, Spoke reviews and beta feedback; reject with reason.

## 10. Conflict resolution (read before acting)
When documents disagree, **this file wins, then the newest ADR/DECISIONS entry, then V4, then V3, then older prompts**. Known resolutions:
- Expo: **SDK 58** per ADR-002 (V3/T2 text about SDK 57 is superseded).
- Mutation score: **≥ 80%** on address, routing, sync, billing, auth (§8.2 supersedes V4 §2's 70%); ≥ 70% elsewhere.
- Voice weights: the founder decision in V4 §13.6 + D23 (2026-10-20) supersedes the earlier D22/ADR-004 text about OmniVoice weights — update ADR-004/D22 to reference it; keep the commercially-licensed alternative benchmarked and the engine swappable.
- Android E2E triggers: §7.1 (PRs to main + nightly + manual) supersedes "every push".
- Definition of Done: §6 here (it includes V4 §9).
Record any new conflict and its resolution in DECISIONS.md.

## 11. Courier Maps view modes + ideas from God's Eye View (P3, binding)
- **Driver-selectable map modes** (like Google Maps), remembered per driver, switchable by tap or voice ("3D on", "flat map"):
  - **2D flat** (default for battery saver), **3D** (tilted, extruded buildings), **Satellite** (online only, licensed imagery provider if adopted via ADR), **Auto** (3D while driving in town, 2D in rural/low battery).
  - Toggles: buildings on/off, traffic layer, road-closures layer, weather layer, labels size, night/day/auto.
- **Free offline 3D buildings**: LINZ **NZ Building Outlines** (CC-BY 4.0, same LINZ key) + OSM building heights/levels (ODbL) → baked into the Canterbury PMTiles; MapLibre fill-extrusion with soft lighting/shadows. Attribute LINZ and OSM. Measure fps and battery in 2D vs 3D.
- **Ideas to adopt from github.com/bilawalsidhu/gods-eye-view (MIT — code may be reused/adapted, keep its LICENSE notice)**: voice control of the map camera ("zoom to Riccarton", "show failed stops today"); follow-cam behind the vehicle (cockpit-style tilt); shader-based visual styles for night and high-contrast; live data layers framework (weather, closures from Waka Kotahi, traffic via a free-tier provider); shareable map-scene links for teams; a richer 3D live map for the dispatcher web dashboard and the marketing site.
- **Not allowed**: Google Photorealistic 3D Tiles or Cesium ion used without a proper commercial licence/billing. If the founder wants Google 3D as an optional online "photo-real" mode, prepare a cost estimate (1,000 free sessions/month, then metered) as a founder approval gate (§7.3).

## 12. Courier Voice — the shift companion (P5, binding behaviour spec)
Courier Voice is a co-driver that talks with the driver and follows the whole shift, hands-free, in the driver's language.
- **Always with you during the shift**: starts with driving mode, listens for the wake word or earbud press, survives screen-off, calls and music; ends with an end-of-day summary.
- **Proactive (speaks first, short, only when useful)**: morning brief ("214 stops, 3 new addresses, rain after 2"); approaching the next stop ("next: 14 Harewood, side gate, small box mid-rack"); door memory and hazards ("dog at this address"); parcel location in the van; address problems ("this number doesn't exist on this street — did you mean 140?"); route changes, closures, traffic delays; break/fatigue reminders; time/ETA checks ("you're 12 minutes ahead"); end of day ("206 delivered, 8 failed, 3 returns in the van").
- **Conversational**: answers natural questions about the run and own data ("how many left?", "what's after this?", "where's the parcel for Mrs Smith?", "how much did I earn today?"), handles follow-ups and corrections ("no, 17"), understands mixed languages, asks one short clarifying question only when needed.
- **Casual chat is welcome**: the driver can just talk with it — small talk, jokes, news/sport/weather, how the day is going, keeping company on long rural legs — like a friendly co-driver. Online it uses the server LLM for free conversation; offline it keeps simple small talk and says when it needs internet for more. While moving, it keeps answers short and pauses chat for navigation/stop prompts; "chatty" verbosity lets it talk more when parked or on breaks. Safety and content rules apply (no distraction, respectful, no harmful content).
- **Fully offline brain (option)**: ship an optional downloadable on-device LLM pack (small, commercially-licensed, quantised ~1–4B model, e.g. Gemma / Qwen / Phi class — Voice squad benchmarks quality, speed, RAM, battery on a mid-range Android) so commands, questions about the run AND casual chat work with no internet on capable phones. Auto-select by device capability; fall back to the rule-based offline mode on low-end phones. Online server brain = the **primary** chat path, through our self-hosted **OmniRoute** gateway (D25) on the Oracle server, routing to commercially-licensed no-training providers / our self-hosted model, paid API only as fallback via the cost guard. The on-device LLM pack is optional (later), for strong phones and dead zones.
- **Does every action by voice**: delivered / failed + reason / skip / back / add stop / dictate a list / note for this door / call or text customer (template) / navigate / switch map mode / report a problem.
- **Driving-safe**: replies ≤ 8 words while moving; no long reading; never demands a screen tap while moving; quiet mode and "only essentials" mode; respects calls and audio focus.
- **Personality & settings**: calm, friendly, concise NZ tone (never robotic, never "as an AI"); voice selection; speaking speed; verbosity (minimal / normal / chatty); language; proactive alerts on/off per type.
- **Memory**: remembers the day's context and the driver's preferences; learns runs over time (door spots, usual order, service times) — on-device first, privacy controls, forget-me.
- **Offline vs online**: offline = on-device commands, dictation, proactive alerts from local data; online = richer conversation and server reasoning. Seamless switching; it tells the driver only if a capability is unavailable.
- **Evaluation**: scripted full-shift simulations (voice + noise) in the eval set; targets per V4 §10.1; a beta driver satisfaction score for the companion.

## 13. Design Studio — a world-class, original look (founder directive, binding; P4)
The founder rejected both mockup sets (v1, v2 in `docs/design/mockups/`) as **looking AI-made**. Use them **only as a content/screen inventory** (which screens exist and what each must show), **never as the visual style**. Build a genuinely original, modern, premium identity that stands out internationally.

### 13.1 Research (V4 §12 method), before any visual work
- **≥ 50 design/animation/UI projects on GitHub (2025–2026)**: RN UI kits and design systems, motion/animation libs (Reanimated 4, Skia, Rive, Lottie, Moti, gesture/physics libs, shared-element, haptics), charts, map styling, typography/variable fonts, icon systems, SaaS dashboard kits, onboarding patterns. Evidence card each; shortlist 15.
- **Reference products to study (screens + motion)**: Spoke/Circuit, Uber Driver, DoorDash Dasher, Amazon Flex, Apple Maps, Google Maps, Waze, Strava, Revolut, Monzo, Linear, Arc, Things 3, Airbnb, Duolingo, Nothing OS, Teenage Engineering, Apple Fitness — capture what makes each distinctive. Public material only; no copying of proprietary assets.
- Write `docs/design/RESEARCH.md` (what's distinctive in 2026, what to avoid, what fits a courier's day).

### 13.2 Explicit anti-"AI look" rules (design gate fails on any)
No neon accent on black, no glow/bloom effects, no glassmorphism everywhere, no pulsing orbs, no purple/blue gradients, no "sparkle" icons for AI, no generic rounded cards stacked, no centered hero + two buttons cliché, no dark mode by default, no stock iconography without a system, no lorem-like filler, no emoji. Every screen must have a clear visual idea, real hierarchy and purposeful motion.

### 13.3 Direction
- **Light theme is the default** (daylight readability in a van); night theme is an adapted option (auto at sunset), not the identity.
- Own the identity: distinctive typography pairing (licensed for app use), a signature colour system rooted in the product (e.g. NZ/Canterbury landscape, road signage, parcel/kraft materials — decide by research), a recognisable map style, a motion language (how things enter, confirm, complete), sound/haptic signatures, custom illustration or iconography details.
- Produce **3 distinct directions** (mood board + 4 key screens each: Today, Driving with map, Copilot voice, Scanner) as real RN screens in a `design-lab` route/Storybook, light and night; record screen videos via the CI emulator. Write `docs/design/DIRECTIONS.md`. The founder picks one (approval gate §7.3) — meanwhile continue other work.

### 13.4 Library test bench (≥ 50 candidates, top 15 prototyped)
For motion, UI, charts, maps styling, icons, fonts: prototype each shortlisted lib in the design-lab, measure fps (UI/JS thread), bundle size, startup cost, New-Architecture compatibility, a11y and maintenance; publish `docs/design/LIBRARY-BENCH.md` with a table and the winners. Adopt only measured winners (ADR).

### 13.5 Build to the chosen direction
All 11+ screens (welcome, sign-in, onboarding, today, driving 2D/3D, Copilot voice, dictation, scanner, POD, route/templates, end of day/earnings, settings/map modes/downloads, team/dispatcher web) in the chosen direction, every state (loading/empty/error/offline), light + night, small/large phones, 200% text, RTL. Visual-regression baselines + screen videos as evidence. Human-design review sign-off per screen; scorecard UX ≥ 8/10 vs Spoke and the reference products.

## 14. Accounts & sign-in — complete, any user (binding; security squad owns it)
Built on Better Auth (services/auth) + FastAPI JWKS verification. Every method has spec, tests (unit + integration + Maestro E2E), threat model and evidence.
- **Methods**: Sign in with **Google** (Android: Credential Manager / Google Identity; iOS: Google Sign-In), Sign in with **Apple** (required on iOS when any social login is offered; also available on Android/web), **passkeys** (WebAuthn / Android Credential Manager / iCloud Keychain), **email + password**, **magic link / email OTP**, optional **phone OTP** (SMS cost guard), and for teams **Google Workspace / Microsoft Entra SSO** (OIDC) later. All through Better Auth plugins/providers; no custom crypto.
- **Account lifecycle**: email verification; account linking (same email across Google/Apple/password, with confirmation); Apple "Hide my email" relay handled; password reset; change email; **delete account in-app + web link** (Play/App Store requirement) with data deletion job; data export.
- **Security**: login-attempt limits (per account/IP/device, progressive delay, lockout + email unlock, Turnstile/CAPTCHA after threshold); **MFA** (TOTP + passkey as second factor); new-device alerts; session list + remote sign-out; short-lived ES256 JWT + refresh rotation with reuse detection; Play Integrity / App Attest on sign-in; breached-password check; secure storage (Keystore/Keychain via expo-secure-store); rate limits on all auth routes.
- **Driver-specific**: sign in once, then **works offline** for the whole shift (offline session with bounded lifetime); **biometric app unlock** (fingerprint/face) instead of re-typing; quick switch between driver accounts on a shared device (team).
- **Teams**: invite by link/email/QR, roles (driver, team lead, dispatcher, admin, owner), join a team, leave team, owner transfer; organisation billing.
- **Store config the founder must provide** (FOUNDER_TODO, approval gate): Google Cloud OAuth client IDs (Android SHA-1/256 from Play App Signing, iOS, web), Apple Developer account + Sign in with Apple service ID/key, email sender domain (SPF/DKIM). Build everything with test credentials/mocks until then.

## 15. Store readiness tooling
- Add **StoreReady** (github.com/MaTriXy/StoreReady, MPL-2.0 — use the tool unmodified; very new project: verify it, pin a version) to CI as an extra pre-submission check (`playstore-checkup`, later `appstore-checkup`, JSON output) on release branches; treat findings CRITICAL = blocker, WARN = task. It complements, not replaces, our own Play/App Store checklist (MASTER §7.4, SAAS_CHECKLIST A) and REA self-audit of the APK (§8.4).
- Also evaluate the official/major alternatives found in research (Play Console pre-launch report, Firebase Test Lab equivalents, Fastlane `precheck`) and keep the best combination.
