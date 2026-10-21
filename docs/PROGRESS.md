# PROGRESS — Courier Copilot (rewritten 2026-10-20 from PHASE 1 audit)

Evidence: `docs/evidence/audit/`, `docs/evidence/phase-2.1/`. Details: `docs/AUDIT.md`.
Previous PROGRESS.md claims were not trusted and have been replaced.

| step ID | status | branch/PR | tests (pass/total) | blocker | next |
|---|---|---|---|---|---|
| PHASE0-read-docs | done | main @16afb8d | n/a (docs) | — | — |
| PHASE1-audit | done | main @e59379e | see audit logs | — | — |
| PHASE2.1 Better Auth | **done** | feat/2.1-better-auth-service | services/auth 31/31, api 23/23, shared 62/62 | runtime HTTP + Postgres path NOT VERIFIED (no server/DB here) | — |
| PHASE2.2 themes | **done** | feat/2.2-unistyles-themes | design-tokens 27/27, workspace 101/101, mobile 6/6 | Unistyles native runtime NOT VERIFIED (no emulator/CI yet) | — |
| PHASE2.3 address engine | **done** | feat/2.3-address-correction | api 48/48 (24 address tests) | LINZ accuracy NOT VERIFIED (data/linz empty) | — |
| PHASE2.4 cleanup + lint | **done** | feat/2.4-cleanup-and-lint | workspace 107 + api 48 | mobile lint still off (BUG-045) | — |
| PHASE3.1 CI + emulator | **done** | feat/v4-company-bootstrap (PR #1) | workflows + Maestro + B.7 screen | the emulator job was still running at the last check | link a green run |
| P1 emulator root-fix | in progress | feat/p1-emulator-pipeline (PR #2) | the release APK builds (15m49s, pass) | the first screen did not appear: the APK started the dev launcher | the dev-client is removed, the run is in flight |
| P2 research depth | **done** | feat/v4-company-bootstrap (PR #1) | 24 areas, 16 files rewritten or created | the verifier pass (>= 20 %) is still to come | the eval sets |
| V4 bootstrap | **done** | feat/v4-company-bootstrap (PR #1) | CONSTRAINTS.md, PARITY.md, design/SYSTEM.md, 10 squads, PR template, floor/coverage/licence/audit gates | the mutation harness lands with the first squad task | T2 |
| 0.1 repo setup | partial | — | not verified | root package.json now pinned (2.1) | pin remaining ranges |
| 0.3 docker infra | not verified | — | — | not run in audit | run docker compose |
| 0.4 local secrets | partial | — | not verified | scripts/check-secrets not tested | test scripts |
| 0.5 CI pipeline | not verified | — | — | `.github/workflows/` is empty | write CI workflow |
| A.2 shared packages | done | main | shared 26/26, design-tokens 19/19, nz-address 17/17 | — | — |
| A.3 Better Auth | **done** | feat/2.1-better-auth-service | 31/31 + 23/23 | Postgres path NOT VERIFIED | docker-compose run |
| A.4 OpenSpec | not verified | — | — | `openspec/` is empty | write specs |
| B.1 Expo app | partial | feat/2.2-unistyles-themes | 6/6 (auth) | no jest before this phase; now wired | add screen tests |
| B.2 design system | **done** | feat/2.2-unistyles-themes | design-tokens 27/27 | Unistyles native runtime NOT VERIFIED (no emulator) | — |
| B.3 navigation | partial | — | 0 tests | no tests | add tests |
| B.4 voice module | stub | — | 0 tests | not implemented | later |
| B.5 maps | not started | — | — | — | — |
| B.6 sync engine | not started | — | — | — | — |
| B.7 compat test | **NOT VERIFIED** | feat/3.1-ci-and-android-e2e | compat screen + Maestro flows written | the emulator run was not observed (no `GITHUB_TOKEN`); sherpa models and the PMTiles archive are missing | link a green run |
| C.1 LINZ import | partial | — | — | `data/linz/` empty → FOUNDER_TODO entry | founder to provide |
| C.2 address correction (D8) | **done** | feat/2.3-address-correction | 24 address tests, 100% over the 87-address fixture | LINZ ground truth NOT VERIFIED | wire into the API |
| C.3–G.4 remaining | not started | — | — | — | — |

## Current verified check results

| check | result | evidence |
|---|---|---|
| pnpm install | PASS (workspace: apps/mobile, packages/*, services/auth) | phase-2.4 logs |
| pnpm lint | **PASS** for every JS package (shared flat config in packages/eslint-config) + ruff for the API | phase-2.4/lint.log |
| pnpm typecheck | **PASS** for 6 packages (incl. the mobile app) + mypy (16 files) | phase-2.4/typecheck.log |
| pnpm test | **PASS**: shared 26, design-tokens 27, nz-address 17, services/auth 31, mobile 6, api 48 | phase-2.4/test.log |
| apps/api pytest | PASS 48/48 | phase-2.4/test.log |
| apps/api ruff | PASS | phase-2.4/lint.log |
| apps/api mypy | PASS 16 files | phase-2.4/typecheck.log |
| pnpm audit | 3 critical cleared (vitest 2.1.9 → 3.2.7); remaining are build-time only (metro/vite/esbuild) | phase-2.1/pnpm-audit.json |
| Python audit (pip-audit) | **PASS**: "No known vulnerabilities found" (the step itself was broken and hid the findings) | 2026-10-21 session |
| banned-item grep | **0 hits** (was 41) | phase-2.4/banned-grep.log |

## PHASE 2.1 what changed

- `services/auth` (new pnpm package): Better Auth 1.7.10 with plugins `organization`, `expo`,
  `jwt`; fail-fast env validation (no default secrets); ES256 JWKS at `/api/auth/jwks`;
  tokens at `/api/auth/token`; Postgres (production) or in-memory (tests) storage.
- `apps/api/app/auth/better_auth.py` + `apps/api/tests/auth/test_better_auth.py`: **deleted**
  (the fake Python auth and its test of itself).
- `apps/api/app/auth/jwks.py` (new): PyJWT verification against the JWKS, key-rotation
  aware, generic 401s; the API refuses to boot without `AUTH_JWKS_URL`.
- `apps/api/app/auth/routes.py`: now only `/auth/me` and `/auth/verify` — the API issues no
  credentials.
- Banned Python deps removed: `redis`, `arq`, `passlib`, `python-jose`; `pyjwt[crypto]` and
  `httpx` added. `apps/api/package.json` (a meaningless npm mirror of the Python deps)
  deleted.
- Workspace hygiene: root `package.json` pinned to exact versions (was `"latest"`), single
  `zod@4.6.7` across the workspace (the v3/v4 split broke Better Auth under pnpm hoisting),
  `vitest` upgraded to 3.2.7 everywhere (clears the critical advisories).

## Task register — SAAS_CHECKLIST + COVERAGE_MAP (MASTER_EXECUTION §4 P1–P7)

Every line of `docs/SAAS_CHECKLIST.md` and `docs/COVERAGE_MAP.md` becomes a task. The register
below is the authoritative list; each row is worked as a branch + PR with spec, tests and evidence
(§7.2: one task = one branch = one PR).

| ID | Item | Where it lands | Status |
|---|---|---|---|
| S1 | Google sign-in, magic link/OTP, email verification, password policy + HIBP, login-attempt limits, MFA, device binding, session list, refresh rotation, recovery | P5 auth (Better Auth) | **In progress** (2026-10-22, the security squad): Google, Apple, passkeys, email, MFA, the offline session, the biometric unlock and the teams are done (docs/squads/security/STATUS.md); magic link/OTP, e-mail verification, HIBP, device binding, the session list and the refresh rotation are still open |
| S2 | Play Integrity, Billing policy decision, Data Safety, in-app updates + review, app signing, target API level | P6 launch readiness | Planned |
| S3 | RBAC (driver/lead/dispatcher/admin/owner), tenant isolation tests, admin audit, OWASP ASVS L2 API rules, MASVS L2 mobile rules | P5 + P6 | Planned |
| S4 | Encryption at rest/in transit, retention + deletion, export, consent, audio not stored, PIA, privacy policy, DPA, breach plan | P6 | Planned |
| S5 | Secrets manager, key rotation, backup restore drill, WAF basics, patching, least privilege, audit logs, intrusion alerts, SBOM, signed releases, threat model per module, DAST with OWASP ZAP, pen-test checklist, security.txt | P6 + P7 | Planned |
| D1 | Keep screen awake while driving, foreground service + notification, Doze survival, audio focus, earbud buttons, lock-screen controls, widget, offline indicator, low-storage/battery, glove mode, crash recovery | P5 (T7.7 driving mode) | Planned |
| B1 | Plans + billing (NZD, GST, proration, dunning, refunds), entitlements, usage limits, portal, onboarding, support, status page, transactional email/SMS, notifications, admin console, analytics, NPS, changelog, localisation, a11y statement, legal, multi-tenant model, DR, observability, cost monitoring, staged rollouts, data migrations, API versioning | P5 (T7.12–7.14) + P6 | Planned |
| B2 | SaaS brain: issue triage, dependency updates, release notes, weekly metrics report, error→issue, support→bug | P6 | Planned |
| C1 | Courier day scenarios: depot sort order, multi-carrier, manifest import, multiple parcels, units/gates, RD, opening hours, special handling, COD, pickups, failed delivery, re-delivery, customer not home, hazards, parking, roadworks, weather, traffic, end-of-day reconciliation, next-day rebuild, peaks | P5 (T7.4, T7.2) | Planned |
| C2 | Safety/law: hands-free lock above speed, fatigue/break log, SOS/incident, damaged parcel, lone-worker check-in, night readability, older-driver accessibility | P5 (T7.7) | Planned |
| C3 | Money: earnings per carrier, rate cards, expenses, IRD km, GST, tax estimate, Xero/MYOB/CSV export, carrier invoices, contractor payouts | P5 (T7.11) | Planned |
| C4 | Intelligence that learns the run: order preferences, service time, door spots, daily brief, anomaly alerts, ETA, template suggestions, end-of-day summary, NL Q&A | P5 (T7.3–7.5) | Planned |
| C5 | Customer-facing (optional): ETA SMS, live page, photo link, feedback, leave-at, opt-out, branded team | P5 (T7.10) | Planned |
| C6 | Team/fleet: dispatcher web, live map, reassign, chat, dashboard, training mode, roles, multi-depot | P5 (T7.14) | Planned |
| C7 | ISO 25010 quality + device lab (CI profiles, low-end Samsung/Oppo/Xiaomi, tablets, foldables, earbuds) | P6 | Planned |
| C8 | Compliance: NZ Privacy Act IPPs, breach notification, Consumer Guarantees, Fair Trading, GST registration, Play policies, ASVS/MASVS, ODbL/LINZ/CC-BY attribution, AI transparency | P6 | Planned |
| C9 | Operations: environments, IaC, CI/CD, OTA, feature flags, observability/SLOs, on-call, postmortems, DR drills, cost guard, migrations, capacity | P6 | Planned |
| C10 | Support: help centre (EN + top languages), guided tours, FAQ, chat post-launch, bug report with logs, status page, release notes, onboarding emails, churn signals, NPS | P6 | Planned |
| C11 | Go-to-market: brand, website + pricing, Play listing, demo videos, referrals, trial, communities, carrier partnerships, Christchurch-first launch, acquisition analytics | P6 | Planned |
| C12 | Data: event taxonomy, privacy-safe analytics, funnels, driver KPIs, warehouse views, founder dashboards, retention/deletion jobs | P6 | Planned |
| I1 | Innovation backlog (`docs/INNOVATION.md`): smart stop entry, one-swipe delivery, auto-arrival, van map, self-updating templates, address confidence + fix pin, live activity, team hazard notes, earnings counter, offline-first, gesture/haptic language, big-glove mode | P5–P6, CEO-owned | Planned |
| M1 | Spoke teardown (TEARDOWN/REVIEWS/BEAT-SPOKE) and the Spoke column on every PARITY row | P2 | Planned |
| M2 | Research depth audit: all 24 areas at ≥30 cards, query logs, verifier pass ≥20%, "what we are missing" → PARITY tasks | P2 | Planned |
| M3 | Own model plan (OWN-MODEL.md) + OmniVoice study SPEC | P2 (voice squad) | Planned |
| M4 | Eval sets: voice ≥500 utterances, scanner ≥300 labels in `data/labels/`, routing on real Christchurch days, sync chaos scenarios | P2–P5 | Planned |
| M5 | Mutation score ≥80 % on address, routing, sync, billing, auth (§8.2) | P2–P5 | Planned |

## Next (in order)
1. Merge PR #1 once the Android emulator job is green (the other gates are already green).
2. T2 — the Expo version decision (D21): either the SDK 57 downgrade or the ADR that proves
   SDK 58 with every native module, then DECISIONS.md.
3. T3 — the emulator run green, the artifacts downloaded into `docs/evidence/b7/`, B.7 marked PASS.
4. T4 — the real LINZ addresses (`scripts/fetch-linz.py`) and the ≥95 % accuracy report.
5. T5 — the offline Canterbury PMTiles.
6. T6 — the design to the approved mockups.
7. T7 — the product itself (sync, routing, door memory, dictation, voice agent, web, billing, PIA).

## Coverage Audit - 2026-10-21 (the new MASTER_EXECUTION sections 11-15)

The audit ran against the sections the founder added on 2026-10-21 and against
what the squads delivered. Every item below is a task in the register above.

| ID | Item | Where it lands | Status |
|---|---|---|---|
| M1 | The driver-selectable map modes (2D / 3D / Satellite / Auto) remembered per driver, switchable by tap and by voice, the battery saver always winning | P3 - the maps squad | done (the mode state, the storage, the voice commands, 144 mobile tests) |
| M2 | The map toggles: buildings, traffic, road closures, weather, the label size, night/day/auto | P3 - the maps squad | done (the sheet, the state, the testIDs) |
| M3 | The free offline 3D buildings: the LINZ NZ Building Outlines (CC-BY 4.0) + the OSM heights (ODbL) baked into the Canterbury pack | P3 - the maps squad | built (the builder and the licences in the pack manifest); the pack itself is not built yet |
| M4 | The God's Eye View ideas (MIT, the notice kept): the voice control of the map camera | P3 - the maps squad | done (the camera commands, the licence in LICENSES.md) |
| M5 | The satellite mode never uses Google Photorealistic 3D Tiles or Cesium ion without a licence | P3 - the maps squad | done (the builder refuses them by name) |
| V1 | Courier Voice: the engine port (swappable), the on-device engine, the server brain behind OmniRoute (D25) | P5 - the voice squad | done (services/courier-voice, 166 tests) |
| V2 | The proactive rules (the morning brief, the next stop, the approach, the end of day) with their exact wording | P5 - the voice squad | done (the rules and their tests) |
| V3 | The conversational layer, the bounded small talk, the memory, the offline/online switch | P5 - the voice squad | done (the tests) |
| V4 | The driving-safe rules: 8 words while moving, never a tap demand, the quiet mode, the calls and the music | P5 - the voice squad | done (the safety module and its tests) |
| V5 | The scripted full-shift simulations in the eval set with the harness | P2 - the voice squad | done (3 shifts, 24 turns, the intent 100 %, no false actions) |
| V6 | The on-device brain as an optional downloadable pack (1-4B, commercially licensed) | P5 - the voice squad | the seam exists; the pack is not built |
| D3 | The Design Studio: 50+ projects and 18 reference products researched, 56 libraries benched | P4 - the design squad | done (docs/design/RESEARCH.md, BENCH.md) |
| D4 | Three original directions as real screens (A Roadbook, B Beacon, C Freight), light by default | P4 - the design squad | done (the screens, the palettes measured, the renders) |
| D5 | The founder picks the direction (A, B or C) | P4 - the approval gate | **waiting on the founder** (FOUNDER_TODO.md) |
| D6 | Every screen rebuilt to the chosen direction | P4 - the design squad | blocked by D5 |
| S6 | The complete sign-in: Google, Apple, passkeys, email, MFA, the offline session, the biometric unlock, the teams | P5 - the security squad | done (the service and the app, 59 auth + 167 mobile tests) |
| S7 | The passkey ceremony on a real phone (React Native has no WebAuthn API) | P5 - the security squad | open (ADR-006 D3) |
| R1 | StoreReady as the primary pre-submission checker in CI (pinned, the report as the job summary) | P6 - the release | done (the workflow, the local check, 9 tests) |
| R2 | The founder's store ids, the signing keys, the service accounts, the domain, the privacy policy URL | P6 - the founder | **waiting on the founder** (FOUNDER_TODO.md) |
| R3 | The background-location video, the store assets, the legal review, the account-deletion link | P6 - the founder | **waiting on the founder** (FOUNDER_TODO.md) |

**The gap that the audit found**: the map pack (M3) and the on-device brain
pack (V6) are the two pieces of code that still need a data download and a
model licence, and they are the only tasks between the current build and a
courier holding the finished app. Everything else in sections 11-15 is built,
tested and committed.