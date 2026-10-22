# MASTER EXECUTION — the one file you run (Courier Copilot)

**This is the single entry point.** Read it first, then the files it references. You do not wait for new prompts: you run the company as **CEO** and keep going until the Definition of Done. The founder only types `continue` when a session ends.

Repo: `C:\Users\DCL\projects\courier` → GitHub `haytham26/courier`. Credentials in `.env.local`: `GITHUB_TOKEN`, `LINZ_LDS_API_KEY` (never print/commit).

---

## 0. Your role: CEO of a complete software company
You own the outcome end to end. At the start of every session and after every task, run the **CEO loop**:
1. **Read state**: `docs/log/2026-W43.md`, `docs/status/PROGRESS.md`, `docs/status/QUALITY_SCORECARD.md`, `docs/status/PARITY.md`, `docs/status/BUGS.md`, CI + emulator status (`scripts/dev/gh.ps1`).
2. **Decide the next most valuable task** from §4 (respect order and dependencies; a red CI or a failing gate is always first).
3. **Assign it to the right squad and roles** (V4 §1 roles + §10 squads) and **load the matching skills** (AGENTS.md skill map — read each SKILL.md you apply and log it).
4. **Execute** with the V4 process: spec → research/competitor gap → design → tests first → build → two reviews for critical modules → CI + Android emulator E2E green → benchmark vs targets → merge.
4b. **Security gate**: the Security squad reviews every change (threat model, SAST/DAST, auth/tenant tests); no merge without it.
5. **Measure**: update the scorecard (ours vs best OSS vs Spoke/best competitor, 6 dimensions). Anything < 8/10 creates a follow-up task.
6. **Improve continuously**: compare our screens and flows with the mockups and with Spoke; fix UI/UX gaps, add missing features found in research, refactor weak code. Don't wait to be told.
7. **Report** in the log of the week (`docs/log/<week>.md`; done with evidence, metrics, decisions, risks, next) and push. Then go to step 1. Never stop between tasks.

## 1. Binding documents (precedence top → bottom)
1. `AGENTS.md` — **safety (absolute)** + skill map.
2. **This file** — what to do and in what order.
3. `docs/archive/KICKOFF_V4_EN.md` — HOW: §1 roles, §2 zero-defect gates, §3 research areas, §4 competitor parity, §5 UX/motion standard, §6 engineering & performance budgets, §7 security, §8 workflow, §9 Definition of Done, §10 specialist squads (Voice 24/7 multilingual, address-only Scanner, Address, Routing, Maps, Sync, Design, Payments, Web, Platform), §11 OSS leverage + clean-room protocol, §12 research methodology + quality scorecard, §13 founder directives (research depth audit, Spoke teardown, online+offline, voice model path §13.6). It is in the archive because it is the history of a prompt; the rules it carries are the rules of this file and of `docs/plan/CONSTRAINTS.md`.
4. `docs/archive/KICKOFF_V3_EN.md` — task list T1–T7 details (history).
5. **`docs/plan/SAAS_CHECKLIST.md`** — security squad (top priority, merge gate), Google sign-in + Play Integrity, login-attempt limits, MFA, keep-screen-awake and all driver-runtime essentials, full SaaS business + operations + automation. Every item must become a task.
6. **`docs/plan/COVERAGE_MAP.md`** — every real-world courier scenario, safety/law, money/IRD/GST/Xero, AI that learns the run, customers, teams, ISO 25010 quality, compliance, ops, support, go-to-market, data, localisation. **Run a Coverage Audit at the start of every phase** and add anything missing; the map only grows.
7. `docs/decisions/DECISIONS.md` (D1–D24), `docs/decisions/adr/`, `docs/plan/CONSTRAINTS.md` (the quality bar), `docs/product/PRODUCT_SPEC.md`, `docs/design/mockups/` (approved look), `docs/research/2026/`, `docs/study/`.
The older prompts (`docs/archive/`: KICKOFF_PROMPT_EN, KICKOFF_V2_EN, MASTER_PROMPT, RESUME) are background only; the archive is read-only history.

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
- **Session start**: verify state from GitHub (branch, PRs, latest CI/E2E conclusions) and write a 5-line state check in `docs/log/<week>.md` before acting.
- Never sit idle waiting for CI: work on independent tasks on other branches meanwhile.
- After each task, immediately start the next. Do not ask the founder anything that you can decide yourself; decide, record the reason in DECISIONS/ADR, continue.
- Only things the founder alone can do go to `docs/status/FOUNDER_TODO.md` (accounts, payments, legal, real photos, store listing). Never block on them: build with mocks/adapters and continue.
- Blocked: 3 attempts → BUGS.md → fallback → next independent task.
- Context nearly full: write a precise handoff in `docs/log/CURRENT.md`, push, stop; the next session resumes from that file.
- Evidence or it didn't happen. Never weaken gates, never fake, report failures honestly.
- Safety (AGENTS.md) is absolute: only inside the repo, no destructive commands, no force-push/rebase, no secrets in output or git.

## 6. Definition of Done
V4 §9 + P1–P7 + every must-have in docs/plan/SAAS_CHECKLIST.md and docs/plan/COVERAGE_MAP.md complete with evidence, PARITY.md has no "Planned" left in must-cover families and beats Spoke on the differentiators, scorecard ≥ 8/10 everywhere, `v1.0.0` released. Then write a final report for the founder in `docs/status/FINAL_REPORT.md` (what was built, scores, how to install, what the founder must do).

**Start now with the CEO loop.**

## 7. Senior review fixes (binding)
1. **CI budget**: private-repo Actions minutes are limited and the emulator job takes ~20–30 min. Run Android E2E on PRs to main + nightly + manual only (not every push); cache Gradle/AVD; fail fast; report monthly minutes used in the cost report. If minutes run low, write it in FOUNDER_TODO (paid minutes or a self-hosted runner) — never silently skip E2E.
2. **Small PRs**: no more mega-branches. One task = one branch = one PR (< ~800 changed lines excluding generated/docs), merged within a day. Enable branch protection on main (required checks: CI, quality gates, CodeQL, Android E2E on PR) via the token if permitted, else FOUNDER_TODO.
3. **Founder approval gates** (the only things that pause for the founder; everything else is autopilot): production deploy of a new server, turning on live payments, Play Store submission/production rollout, deleting any production data, any new paid service. Prepare everything, then list it in FOUNDER_TODO and continue other work.
4. **Google Play policy specifics**: background location needs the permissions declaration + video and a prominent in-app disclosure; foreground service types declared (location, microphone, dataSync); digital subscriptions bought inside the Android app must follow Play Billing rules (decide with an ADR: Play Billing for in-app purchase vs. web-only Stripe sign-up with no in-app purchase links, per current Play policy for the NZ region); account deletion in-app + web link; target the current required API level.
5. **Battery vs keep-awake**: keep-awake only while driving mode is active and the screen is in navigation/dictation; measured in the battery benchmark.
6. **Source of truth = CI artifacts**: progress claims must link to CI runs/artifacts produced by GitHub, not local logs. Self-reported numbers without a CI link are NOT VERIFIED.
7. **Context discipline**: read only the sections you need for the current task (use the section numbers); keep the log handoffs short and precise.
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


### 13.9 Founder decision (2026-10-23): contrast rules exactly per WCAG (binding, see D33)
- **3:1** is allowed only for large text: 24 px regular, or 18.66 px bold (weight 700) and up. Button labels are 18 px bold so they qualify. Large titles qualify.
- **4.5:1** applies to all other text.
- **7:1** applies to everything on the driving screen:
  - The Slide to Deliver label is black on the green; white on #34C759 is only about 2.2:1.
  - Green text on white, such as "2 min", is darkened.
  - Change the design to meet the bar; never weaken the test.
- **The test** asserts every pair explicitly, in light and dark, with no silent exclusions.

### 13.10 Queued founder follow-ups (in this order, after the current task)
1. **Mobile lint gate (BUG-045).**
   - Add eslint and @courier/eslint-config to apps/mobile, and a lint script that CI runs.
   - Fix every finding at the root.
2. **The contrast rules of §13.9.**
3. **Organise the repository like a top engineering company (§16).**
   - A README in every top folder that says what lives there and who owns it.
   - docs/README.md as the single index.
   - One name style per area.
   - Temporary files removed and ignored.
   - Superseded docs moved to docs/archive/.
   - Every reference, import, workflow path and doc link updated, with all gates and Android E2E green.
4. **Then Part B (§13.7, §13.8), §17, §18, and Part C, without stopping.**

## 14. Accounts & sign-in — complete, any user (binding; security squad owns it)
Built on Better Auth (services/auth) + FastAPI JWKS verification. Every method has spec, tests (unit + integration + Maestro E2E), threat model and evidence.
- **Methods**: Sign in with **Google** (Android: Credential Manager / Google Identity; iOS: Google Sign-In), Sign in with **Apple** (required on iOS when any social login is offered; also available on Android/web), **passkeys** (WebAuthn / Android Credential Manager / iCloud Keychain), **email + password**, **magic link / email OTP**, optional **phone OTP** (SMS cost guard), and for teams **Google Workspace / Microsoft Entra SSO** (OIDC) later. All through Better Auth plugins/providers; no custom crypto.
- **Account lifecycle**: email verification; account linking (same email across Google/Apple/password, with confirmation); Apple "Hide my email" relay handled; password reset; change email; **delete account in-app + web link** (Play/App Store requirement) with data deletion job; data export.
- **Security**: login-attempt limits (per account/IP/device, progressive delay, lockout + email unlock, Turnstile/CAPTCHA after threshold); **MFA** (TOTP + passkey as second factor); new-device alerts; session list + remote sign-out; short-lived ES256 JWT + refresh rotation with reuse detection; Play Integrity / App Attest on sign-in; breached-password check; secure storage (Keystore/Keychain via expo-secure-store); rate limits on all auth routes.
- **Driver-specific**: sign in once, then **works offline** for the whole shift (offline session with bounded lifetime); **biometric app unlock** (fingerprint/face) instead of re-typing; quick switch between driver accounts on a shared device (team).
- **Teams**: invite by link/email/QR, roles (driver, team lead, dispatcher, admin, owner), join a team, leave team, owner transfer; organisation billing.
- **Store config the founder must provide** (FOUNDER_TODO, approval gate): Google Cloud OAuth client IDs (Android SHA-1/256 from Play App Signing, iOS, web), Apple Developer account + Sign in with Apple service ID/key, email sender domain (SPF/DKIM). Build everything with test credentials/mocks until then.

## 15. Store readiness tooling
- Adopt **StoreReady** (github.com/MaTriXy/StoreReady, MPL-2.0, built by a trusted friend of the founder) as the **primary** pre-submission checker in CI on release branches (`playstore-checkup`, later `appstore-checkup`, JSON output): CRITICAL = release blocker, WARN = task. Pin an exact version (our rule for every tool). Report bugs/missing checks as issues on its repo and propose checks our app needs (background location, microphone/foreground services, account deletion, data safety) — coordinate improvements with its author.
- Also evaluate the official/major alternatives found in research (Play Console pre-launch report, Firebase Test Lab equivalents, Fastlane `precheck`) and keep the best combination.

## 16. Repository hygiene + 5× verification (founder directive, binding; do before more features)
Founder audit (2026-10-22) of `feat/v4-company-bootstrap` found clutter typical of AI-generated repos. Fix it on a dedicated branch `chore/repo-structure` (moves via `git mv` to keep history, no behaviour change, all gates green, one PR).

### 16.1 Findings to fix
1. **Dead/duplicate code** (prove each is unused with grep + tests before deleting; record the proof in the PR): `services/worker/` (old address engine + its test) duplicates `apps/api/app/address_correction.py` → delete after confirming nothing imports it; `apps/api/app/sequencing.py` (old nearest-neighbour) vs `routing.py` → keep one; check `apps/api/app/agents/` and `prompts.py` are used, else delete; `apps/mobile/compat-test-imports.js`, `apps/mobile/scripts/compat-test.js` (old) → delete; Expo template leftovers in `apps/mobile/` (`AGENTS.md`, `LICENSE`, `.claude/`) → delete or justify.
2. **Duplicates**: `.agents/` is byte-identical to `.claude/skills` → keep one source (`.claude/skills`) and point AGENTS.md at it; two `uv.lock` (root + `apps/api`) → one per Python project, none at root unless a uv workspace is defined.
3. **Inconsistent layout**: the API lives in `apps/api` while other backends are in `services/`; `db/schema.sql` and `openspec/api.yaml` are lone root folders.
4. **Tests scattered**: colocated `*.test.ts` in packages, tests inside `scripts/`, `test_*.py` at a folder root. Convention to apply everywhere: TypeScript/JS → `__tests__/` folder next to the code (`src/**/__tests__/*.test.ts`); Python → a `tests/` folder at the project root mirroring the package; scripts → `scripts/<group>/__tests__/`. Update jest/vitest/pytest configs so every test is still discovered (test counts before = after).
5. **Docs sprawl**: ~35 files at `docs/` root incl. obsolete prompts (FINAL_PROMPT, MASTER_PROMPT, KICKOFF_PROMPT_EN, KICKOFF_V2/V3/V4, RESUME, MASTER_PLAN_2026, SAAS_BUILD_PLAN, PLAN_REVIEW, AUDIT, COVERAGE_AUDIT-P2) mixed with live docs; `EXECUTOR_LOG.md` is 131 KB.
6. **Data in docs**: eval manifests (`docs/squads/*/eval/manifest/*.jsonl`, up to 420 KB) belong in an eval data package, not docs.
7. **Dev-only screens in the production app**: `app/design/*` (design lab) and `app/compat.tsx` must be excluded from release builds (dev/E2E flag) or moved to a dev client.
8. **Obsolete scripts**: `scripts/setup-emulator.*` (local emulator is banned), three `backtest.*` variants, flat `scripts/` with 33 mixed files.

The findings above are the audit of `feat/v4-company-bootstrap` as it was on 2026-10-22. What the
fix did is in **§16.4**.

### 16.2 Target structure
```
apps/        mobile/ (Expo app)  web/ (dispatcher + admin, when built)
services/    api/ (FastAPI, moved from apps/api)  auth/  courier-voice/  routing/ (when built)
packages/    shared/  design-tokens/  nz-address/  eslint-config/  contracts/ (openapi.yaml + db schema + generated types)  eval/ (voice, scanner, routing eval sets + builders + checkers)
scripts/     ci/  data/ (fetch-linz, build-pmtiles, 3d-buildings)  eval/  dev/  secrets/  — each with a README line per script
docs/        README.md (index: what each doc is, which are binding)
             plan/ (MASTER_EXECUTION, SAAS_CHECKLIST, COVERAGE_MAP, CONSTRAINTS)
             status/ (PROGRESS, QUALITY_SCORECARD, PARITY, FOUNDER_TODO, BUGS)
             decisions/ (DECISIONS, adr/)
             product/ (PRODUCT_SPEC, PROJECT_BRIEF, DRIVER_INTERVIEW_1, COMPETITIVE_RESEARCH, TECH_STACK, COST_PLAN, LICENSES)
             design/  research/  study/  squads/ (no data files)  evidence/  operations/
             log/ (EXECUTOR_LOG split per week: 2026-W43.md …, plus a short CURRENT.md handoff)
             archive/ (all obsolete prompts and old reviews, read-only)
.github/ .maestro/ .claude/   root: only config files + README + AGENTS.md + CLAUDE.md
```
Update every path reference (AGENTS.md, CLAUDE.md, MASTER_EXECUTION §1, CI workflows, scripts, imports, tsconfig/pnpm/turbo/uv config) in the same PR. Keep `docs/MASTER_EXECUTION.md` path stable by leaving a one-line pointer file if it moves.

### 16.3 Five-pass double check (every PR from now on, and for this restructure)
Record each pass in the PR description with its result:
1. **Build & gates**: install from clean, typecheck, lint, all tests, coverage, audits, licences, Semgrep/CodeQL, gitleaks — all green in CI.
2. **References**: grep for every moved/deleted path; no broken import, script, workflow, doc link (run a link checker over docs/).
3. **Runtime**: Android E2E green on the CI emulator; API/auth/voice services start in docker compose and pass smoke tests.
4. **Truth check**: every claim in `docs/status/PROGRESS.md` / the log / PR text matches the code and CI (DONE / PARTIAL / NOT STARTED); nothing scaffolded or faked is called built.
5. **Independent review**: a fresh-context reviewer role (doubt-driven) re-reads the diff and the tree, lists anything messy, duplicated, dead, misplaced or unsafe; all fixed before merge.

### 16.4 As implemented (2026-10-22, the PR of `chore/repo-structure`)

**The moves** (every one with `git mv`, so the history follows the file):

| From | To |
|---|---|
| `apps/api/` | `services/api/` (the API is a service, like `auth` and `courier-voice`) |
| `openspec/api.yaml` | `packages/contracts/openapi.yaml` |
| `apps/api/db/schema.sql` | `packages/contracts/db/schema.sql` (the schema the API runs against) |
| `db/schema.sql` | `packages/contracts/db/legacy-schema.sql` (the first schema; history, the API does not read it) |
| `docs/squads/voice/eval/`, `docs/squads/scanner/eval/` | `packages/eval/voice/`, `packages/eval/scanner/` |
| `scripts/*.mjs\|ps1\|sh\|js` (flat) | `scripts/ci/`, `scripts/data/`, `scripts/eval/`, `scripts/dev/`, `scripts/secrets/`, `scripts/design/` |
| `docs/*.md` (flat) | `docs/plan/`, `docs/status/`, `docs/decisions/`, `docs/product/`, `docs/research/`, `docs/log/`, `docs/archive/` |
| `docs/adr/` | `docs/decisions/adr/` |
| `docs/EXECUTOR_LOG.md` | `docs/log/2026-W43.md` (one file per week) + `docs/log/CURRENT.md` (the handoff) |
| `CONSTRAINTS.md` | `docs/plan/CONSTRAINTS.md` |
| `packages/*/src/*.test.ts`, `services/auth/tests/*`, `scripts/*.test.mjs` | `src/__tests__/`, `src/__tests__/`, `scripts/<group>/__tests__/` |

**The deletions**, each with its proof in the PR: `services/worker/` (nothing imports it),
`apps/mobile/compat-test-imports.js` and `apps/mobile/scripts/compat-test.js` (the old B.7 script),
the Expo template leftovers of the mobile app (`AGENTS.md`, `LICENSE`, `.claude/`), `.agents/` (the
byte-identical copy of `.claude/skills`), the root `uv.lock` (no Python project at the root),
`scripts/setup-emulator.*` (the local emulator is banned) and the two shell copies of `backtest`.

**What was kept, and why** (the proof is in the PR): `services/api/app/sequencing.py` (the routing
module imports it: it is the data model, not a duplicate), `services/api/app/agents/` and
`prompts.py` (the live copilot imports them).

**The dev-only screens**: the design lab and the compatibility screen are out of the release build
(`apps/mobile/metro.config.js` blocks them unless `EXPO_PUBLIC_DESIGN_LAB=1` or
`EXPO_PUBLIC_E2E=1`).

### 13.6 Founder verdict on directions A/B/C (2026-10-22): all three REJECTED
Roadbook, Beacon and Freight look dated and plain — "not an app of 2026". Restart the Design Studio at a much higher bar:
- **Design org**: run separate specialist teams in parallel, each with its own lead and deliverable — (1) Brand & identity (name mark, logo, colour, type licensing), (2) Product/UX (flows, information architecture, driving ergonomics), (3) Visual UI (components, layouts, density), (4) Motion & interaction (Reanimated/Skia/Rive choreography, haptics, sound), (5) Maps & 3D (MapLibre styles, 3D buildings, camera), (6) Iconography & illustration, (7) Accessibility & night-driving, (8) Design systems & tokens (implementation), (9) Design research & trends (GitHub 2025–2026, award-winning apps, competitors), (10) Design QA (pixel/motion review vs spec).
- **Research first (V4 §12 depth)**: ≥ 50 GitHub 2025–2026 design/motion/UI repos and prompt/skill collections for UI generation, ≥ 30 award-level apps (Apple Design Awards, Awwwards mobile, Mobbin/Godly-style references studied in public material), the competitors; write `docs/design/RESEARCH-2.md` with what makes 2026 apps feel new.
- **Ten directions, not three**: 10 genuinely different, very modern, premium directions, each with: a one-line idea, mood board, brand mark, palette, type pairing, motion language, map style, and **4 screens** (Today, Driving with 3D map, Copilot voice, Scanner) in **light and night**, built as real RN screens with real motion (Reanimated/Skia), recorded as **emulator videos + PNG screenshots** in `docs/design/directions-2/<n>-<name>/`.
- The anti-AI rules of §13.2 still apply, and also: no "paper/ledger" retro look, no flat bootstrap-like lists, no single-accent-on-grey templates. Every direction must have a strong signature moment (e.g. how a delivery is confirmed, how the map moves, how Copilot appears).
- Founder + reviewer pick from the ten (approval gate); then refine the winner to final. Until then do not build final screens.

### 13.7 Founder decision (2026-10-22): Maps First is CHOSEN (binding, see D27)
The design direction is decided: `docs/design/chosen/`. Do not produce more directions. P4 now means: write ADR-00x "Design system: Maps First", build the token file and the components listed in `docs/design/chosen/README.md`, then rebuild every screen to match the reference screens, in light and dark, on Android and iOS. The design gate passes
only when each built screen is compared side by side with its reference (emulator screenshot next to the reference PNG in the PR) and the anti-AI-look rules in §13.2 pass.


### 13.8 Founder directive (2026-10-22): 3D and motion are part of Maps First (binding, see D29)
The app must feel alive and three dimensional, like Apple Maps, with motion that helps the driver and never decorates. Build it into the components and screens of §13.7, not as a later polish pass.

1. **3D map by default in Auto and 3D modes**: MapLibre pitch 45 to 60 degrees, extruded buildings from the offline pack (LINZ outlines plus OSM heights, D26), soft shading and shadows from the sun angle where cheap, 3D landmarks for the depot and the next stop.
2. **Driving camera**: follows the vehicle with heading-up, tilts and zooms by speed and by distance to the next turn, eases into each turn, and returns to an overview at each stop. All camera moves are smooth (no jumps), interruptible by a finger, and recentre with one tap.
3. **3D vehicle puck and pins**: a 3D puck that rotates with the heading; stop pins that rise from the map, numbered, with the next stop lifted and pulsing gently.
4. **Route motion**: the route line draws itself when a route is planned or re-optimised; the done part fades; a change of order animates the pins to their new numbers.
5. **Interface motion** (Reanimated 4, Skia): spring sheets and the glass tab bar, shared-element transitions between the stop card and its detail, the Slide to Deliver thumb with a spring and a success morph into the check, counters that roll, the progress line that fills. Each with a matching haptic.
6. **Rules**:
   - Every animation has a purpose (orientation, feedback, continuity).
   - 60 fps on a mid-range Android (the emulator profile in CI plus one real-device check). Profile with the Reanimated and Skia tools, and budget battery and GPU while driving.
   - Reduced motion gives a calm 2D path with fades instead of camera flights.
   - No decorative particles, glows, confetti or bouncing for its own sake (§13.2).
   - Motion durations and curves are tokens in the same token file (D27).
7. **Evidence**: each screen PR adds a short screen recording from the emulator next to the reference, and a frame-time trace for the driving screen.

## 17. Operate as a complete company without being asked (founder directive 2026-10-23, binding; see D30)
The founder must receive finished, checked work. He must never have to remind you of work a real company would do on its own. From now on, run every squad below on a schedule and as part of every phase, without waiting for a message.

### 17.1 How the company works
- **Squads, run in parallel.** Use multi-agent sessions: each squad is a separate agent session with its own brief, and a separate reviewer agent checks its output adversarially before anything merges (code-review-and-quality, doubt-driven-development).
  - Product
  - Design
  - Mobile
  - Backend
  - Maps
  - Voice
  - QA
  - Security
  - Competitive research
  - Innovation
  - Onboarding and education
  - Growth and launch
  - Operations and automation
- **Zero-defect bar.**
  - Every change passes lint, typecheck, tests, coverage, the quality gates and Android E2E on GitHub, plus the 5-pass check (§16.3).
  - Nothing is reported DONE without the run links.
- **Weekly company report** in `docs/status/STATUS.md` and the week log. It covers:
  - what each squad shipped;
  - what it found;
  - what it proposes next.
- **The founder's queue.** Only decisions that truly need the founder go to `docs/status/FOUNDER_TODO.md`, each with a recommended answer. Everything else you decide and record in DECISIONS.

### 17.2 Competitive research: Spoke (start now, Competitive research + Innovation squads)
The founder put about 10 screenshots of the Spoke driver app on his PC in the folder `C:\Users\DCL\Downloads\WhatsApp Unknown 2026-10-23 at 4.11.31 AM`.

**Handling the screenshots:**
- Copy them into the repo folder `research-private/spoke/`, which is git-ignored.
- **Founder authorisation, an exception to "work only inside the repo folder":** you may READ and COPY (never move, change or delete) the files of that one folder into `research-private/spoke/`. The folder may be a folder, a .zip, or loose images whose names start with "WhatsApp Unknown 2026-10-23 at 4.11.31 AM". If the name does not match, list `C:\Users\DCL\Downloads` filtered on "WhatsApp Unknown 2026-10-23" and use what you find. If nothing is there, write it in FOUNDER_TODO and continue with the public sources. Add the line to `.gitignore` before copying.
- The screenshots are third-party copyrighted material and the repo is public: never commit them, never paste them into docs, and never reproduce their visuals, text or icons.

**The analysis**, written to `docs/research/competitors/spoke.md`. Use text only, with neutral descriptions:
- every feature visible;
- every screen and its purpose;
- the user flows (how a driver goes from login to the end of the day);
- their way of thinking (what they optimise for, what they assume about drivers);
- their pricing and business model where public;
- strengths, and weaknesses and friction points;
- what is missing.

Add public sources as well (their website, help centre, app store listings and reviews, YouTube walkthroughs) with links.

**The outcome**, a table in that file and new items in the plan:
- For each Spoke capability: our equivalent, whether ours is better / equal / missing, and the task to be clearly better.
- Ideas where we leapfrog them, for example:
  - Courier Voice hands-free;
  - offline maps and the scanner;
  - NZ address correction with LINZ;
  - Live Activity;
  - 3D driving camera.
- Every gap becomes a task in the §4 order with an owner squad.

**Clean room:** learn the ideas and the user needs, then design our own solution in our Maps First style. Never decompile, scrape or copy their app.

### 17.3 First-run experience: welcome, tutorial and live demo (Onboarding squad, Phase P4 with the screens)
1. **Welcome.** A short welcome of 3 to 4 cards in the Maps First style, each skippable, with "Skip" always visible. It asks permissions only when needed and explains why: location, camera, microphone and notifications.
2. **Demo run.** An interactive, offline demo with a sample Christchurch route of 8 stops. The new driver can try the whole loop without an account:
   - scan a label;
   - optimise;
   - drive in simulation;
   - Slide to Deliver;
   - add a proof photo;
   - end of day.

   It can be reopened later from Settings.
3. **Voice-guided tour.** Courier Voice offers to guide the driver through the demo by voice ("Say next or skip"), so the tutorial works hands free. The driver can always mute it.
4. **Coach marks.** Light coach marks the first time each feature appears: one tip at a time, dismissable, never shown again after it is used.
5. **Video walkthroughs.** Short videos (30 to 60 s) for the store listing, the website and the in-app Help.
   - Make them with open-source tooling, for example Remotion for animated product videos and Maestro recordings of the real app. Check each licence and record it in the licence inventory.
   - A real person on camera is a founder action (FOUNDER_TODO).
   - AI avatars may be used only if clearly labelled as AI and never imitating a real person.
6. **Research first.** Study the best open-source onboarding and tour libraries for React Native and Expo. Benchmark them, choose with an ADR, and keep the licence clean.
7. **Help centre.** In-app Help with searchable articles, the videos, "Ask Copilot", and contact support (Chatwoot later, per D22 post-launch).
8. **Tests.** Every onboarding step has testIDs and a Maestro flow, including "Skip all" and "Replay the demo".

### 17.4 Company automation with n8n (Operations and automation squad)
1. Self-host n8n on our server, next to OmniRoute, never on the founder PC. Pin the version and keep the secrets in the server secret manager.
   - Record its licence (Sustainable Use License: internal business use is allowed; we do not resell it) in the licence inventory.
2. First workflows:
   - daily CI health and failed-run alerts to the founder (one digest, not spam);
   - the weekly company report assembled from STATUS.md and the week log;
   - twice-weekly map pack update monitoring (D26);
   - app store review monitoring with the competitor's reviews;
   - crash and error digests (once Sentry or similar is live);
   - new sign-up and support-ticket notifications after launch.
3. Store the workflows as exported JSON in `infra/n8n/workflows/` with a README, so they are versioned and reviewable. Never commit secrets or credentials.
4. Hold n8n to the same safety rules as the rest of the stack: least privilege, and no customer personal data sent to third parties that train on data (D25).

### 17.5 Courier Ops: our own operations platform (Operations and automation squad)
The founder wants an internal system like n8n but more advanced and made for this company. Do not write a workflow engine from scratch; that is years of work and a security risk. Build **Courier Ops** as our own layer on top of proven open-source engines:
- **Engine**: n8n (or Windmill / Temporal, chosen by a benchmark and an ADR) runs the workflows.
- **Courier Ops Console**: our own web dashboard (in the web app, admin role only) that shows in one place:
  - company health: CI, E2E, crash rate, API latency, costs per provider (OmniRoute, server, maps);
  - business: sign-ups, trials, paying users, churn, MRR in NZD, activation funnel;
  - support: tickets, store reviews (ours and competitors), NPS;
  - the agent squads: what each one did this week, open tasks, blocked items.
- **AI ops agents** (through OmniRoute, D25 rules): triage new issues and crash reports, draft release notes, summarise store reviews, watch competitors' release notes and reviews weekly, and draft the weekly company report.
- **Rules**: every action that changes production, money or customer data needs a human approval step in the Console; full audit log; least privilege; no customer personal data to providers that train.

### 17.6 Spoke analysis depth (adds to §17.2)
Cover each of these with evidence:
- onboarding and sign-up;
- permission prompts;
- route import (paste, CSV, photo, voice);
- optimisation options and constraints (time windows, priority, vehicle, breaks);
- navigation hand-off and the in-app map;
- the stop card;
- proof of delivery (photo, signature, safe place, notes);
- failed delivery flow;
- customer notifications and tracking links;
- end of day and reports;
- team and dispatcher features;
- settings;
- offline behaviour;
- error states and the empty states;
- tone of the copy;
- speed: how many taps per stop;
- accessibility;
- pricing tiers and limits;
- platforms;
- what their reviews complain about most.

For each one, give our plan to be clearly better, measured: fewer taps per stop, faster scan-to-route, works offline, hands-free.

## 18. Company completeness: the gaps to close (founder's chief adviser, 2026-10-23, binding; see D31)
Each item below becomes a task with an owner squad, a spec and evidence, merged into the §4 order. Items that need the founder (money, legal signatures, real people) go to FOUNDER_TODO with a recommendation and a deadline.

### 18.1 Legal and compliance (NZ)
1. **Driver distraction law (critical, product-shaping).** NZ Land Transport (Road User) Rule: a mobile phone may be used while driving only if it is mounted and touched infrequently and briefly.
   - Design every driving-time interaction for this: voice first, large targets, no typing while moving.
   - Lock the keyboard and long forms above a speed threshold.
   - Show a short safety notice at first run.
   - Record this in DECISIONS and in the store listing.
2. **Privacy Act 2020 (NZ).**
   - Comply with the information privacy principles.
   - Name a privacy officer (FOUNDER_TODO).
   - Write a breach notification process (notify the Privacy Commissioner when there is serious harm).
   - Run a data map and a privacy impact assessment for location, voice and photos of labels (third-party names and addresses).
3. **Carrier terms.** Check whether scanning and storing NZ Post / Aramex / NZ Couriers label data conflicts with the contractors' agreements. Write a legal question for the founder's lawyer, and keep the data minimal and on device where possible.
4. **App store billing rules.**
   - Google Play and Apple require their in-app billing for digital subscriptions bought inside the app.
   - Decide the model with an ADR: in-app purchase via RevenueCat (or similar) for individual drivers, and web billing (Stripe) for teams bought on the website.
   - Price in NZD including GST.
5. **Company basics (FOUNDER_TODO with recommendations):**
   - NZ company and GST registration;
   - IP assignment;
   - an IPONZ trademark search and filing for "Courier Copilot";
   - domains;
   - professional indemnity and cyber insurance;
   - accounting in Xero;
   - terms of service, privacy policy and EULA reviewed by a lawyer.

### 18.2 Customers and market
1. **Driver research programme.**
   - Run at least 10 more driver interviews (only one exists), with a script and a consent form.
   - Hold a closed beta with 10 to 20 Christchurch couriers through Play internal testing and TestFlight.
   - Hold a weekly feedback review.
2. **Pricing research.** NZ courier willingness to pay, competitor prices (Spoke, Circuit, Routific, Upper, MyRouteOnline), and a pricing page. Experiment with the trial length.
3. **B2B.**
   - Team plan for depots and contractor fleets.
   - Dispatcher web dashboard (the web squad).
   - Onboarding for a team owner.
   - Sales one-pager and a demo booking (Cal.com, D22).

### 18.3 Growth and launch
- **Brand kit:** name, logo, icon, colours from the token file, voice and tone.
- **Website:** landing, pricing, help, privacy, terms and status. Add SEO and analytics without cookies where possible.
- **App store optimisation:** screenshots from the real app, videos (§17.3), keywords and localised listings.
- **Launch plan:**
  - NZ courier communities (Facebook groups, depots);
  - a referral programme;
  - a launch checklist (RELEASE-CHECKLIST.md);
  - a press kit.

### 18.4 Reliability and operations (SRE)
- **Service levels.**
  - Write SLOs for the API and sync (for example 99.9% monthly), an error budget, uptime monitoring, a public status page and an incident process (`docs/operations/RUNBOOK.md`).
  - On-call during the beta: alerts to the founder by n8n, with a quiet-hours policy.
- **Testing and recovery.**
  - Load test the API and sync for 1,000 drivers with k6 or Locust before launch.
  - Run a disaster recovery drill (restore from backup into a clean server) every quarter, with evidence.
- **Releases and monitoring.**
  - Release engineering: EAS Build and Submit, OTA updates with expo-updates channels (beta and production), staged rollouts in Play, version and build numbers, and a rollback plan.
  - Monitor crashes and performance (Sentry or a self-hosted alternative, with privacy filtering) and gate releases on a crash-free rate.
  - Track cost: a monthly cost per active driver on the Courier Ops Console, with alerts when it rises.

### 18.5 Data, analytics and AI governance
- **Product analytics** (PostHog self-hosted or similar), privacy first:
  - Measure the activation funnel (install, demo run, first real route, first delivered stop), retention cohorts, and feature usage.
  - Respect an opt-out in Settings.
- **Learning from the field.** With explicit consent only, a pipeline that improves the scanner and voice models from field data:
  - anonymise it and set a retention limit;
  - never send it to providers that train.
- **AI evaluation and safety.**
  - Eval sets for voice commands, address parsing and the scanner, run in CI with thresholds.
  - Guard against prompt injection (labels and voice can contain hostile text).
  - Cost caps per user in OmniRoute.

### 18.6 Support and customer success
- In-app Help (§17.3).
- Support email, then Chatwoot.
- A support SLA for the beta.
- A changelog and a "What's new" screen.
- An in-app feedback button with a screenshot and the logs (opt in).
- A refund and cancellation policy.
- Account deletion in the app and on the web (a store requirement).

### 18.7 Engineering organisation
- An agent budget: track the API cost of the executor's own agent sessions per week, and report it in the company report.
- A definition of ready and a definition of done per task.
- The ADR for every significant choice.
- Dependency updates with Renovate, grouped weekly.
- A security review of the agent tooling itself: tokens with least scope, and no secrets in logs or prompts.

## 19. Work efficiently: no loops, no wasted tokens (founder directive 2026-10-23, binding; see D32)
Quality stays at the top; these rules only remove waste.

### 19.1 Never loop on one problem
1. **Reproduce first.** Before any fix, reproduce the failure locally in a CI-identical setup (same lockfile, same pnpm settings, CI=true). Never push "to see what happens".
2. **Two-attempt rule.** At most 2 fix attempts per failure on the same hypothesis. If the second fails, stop and write a 10-line root-cause note in `docs/log/CURRENT.md` (facts, hypotheses ruled out, next experiment). Then change the approach: read the official docs or source of the library (source-driven-development), search its issues, or ask the reviewer agent for an independent read.
3. **Time box.** If a blocker is still open after 45 minutes of work or 3 CI cycles:
   - park it in `docs/status/BUGS.md` with the evidence;
   - open the smallest safe workaround only if it keeps every test and gate;
   - move to the next independent task, and come back with fresh eyes later.

   Never weaken a gate to escape a blocker.
4. **No diagnostic commits on a PR branch.** Run experiments on a scratch branch with workflow_dispatch, or locally, and delete the scratch branch afterwards.
5. **Known traps first.** Keep a "Traps" list in `docs/log/CURRENT.md` (for example the pnpm virtual store naming, the Reanimated jest resolver, the Maestro selector schema, gh --watch with stuck rows). Read it before debugging anything similar.

### 19.2 Save tokens and context
1. **Logs.** Read only the failed job logs, and only their tail or grep for `FAIL`, `Error`, `●`; never the whole log.
2. **Files.** Search before reading (grep or glob), then read only the needed lines. Do not re-read files that have not changed.
3. **Batch.** Run every local gate once before a push (lint, typecheck, tests, coverage, floor guard, marker gate, doc links), then push one coherent commit.
4. **CI.** Never re-run CI without a change, except one re-run to confirm an infrastructure flake.
5. **Never block on waiting.** No `--watch`, no long sleep. Start CI, work on the next independent item, then check with `gh run list` or `gh run view <id>`.
6. **Parallel sessions.** Run at most 3 squad sessions at once, and only for independent work. Each gets a short brief with the exact files and the done criteria. The reviewer checks the diff, not the whole repo.
7. **Model choice.** Routine work (docs, formatting, simple tests) may use a cheaper model. Architecture, security, debugging and design use the strongest model.
8. **Memory.** After each task, update `docs/log/CURRENT.md` in at most 30 lines: state, next item, traps. A new or compacted session starts from that file, STATUS.md and this plan, not from scratch.
9. **Cost line.** Report the week's agent cost and CI minutes in the company report (§17.1).

### 19.3 Definition of done for every task (so nothing is redone)
- The spec or task text is linked.
- The tests are written first, or with the change (test-driven-development).
- All local gates are green.
- The PR is reviewed by the reviewer agent.
- The GitHub checks are green: CI and quality gates always, and Android E2E for any change to app code (docs-only PRs do not run it).
- The 5-pass check is posted.
- STATUS.md and the week log are updated.
- The branch is deleted after the merge.
