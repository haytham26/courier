# PROGRESS — Courier Copilot (rewritten 2026-10-22 with the truth labels)

Evidence: `docs/evidence/audit/`, `docs/evidence/phase-2.1/`. Details: `docs/archive/AUDIT.md`.
Previous PROGRESS.md claims were not trusted and have been replaced.

**The three labels, and nothing else**: **DONE** (the thing works, with the CI run or the test count as the evidence), **PARTIAL** (what exists and what is missing, both named), **NOT STARTED** (nothing of it exists). A seam, a scaffold, a stub or a code path that was never run is never called built.

## The register counts (audit item B1, reconciled 2026-10-26)

The command, and the only one that counts:

```
node scripts/ci/check-parity.mjs
```

It prints both registers' counts and exits 1 on a PARITY row whose status is not one of the four
words of the status key, on a PARITY row marked `Have` that carries no merged PR or CI run link, or
on a BUGS row whose status column is not one of the tracker's words. The gate is
`scripts/ci/check-parity.mjs` with its test in `scripts/ci/__tests__/check-parity.test.mjs`.

**The count at this merge (310 PARITY rows, 161 BUGS rows):**
310 parity rows (Have 28 · Better 4 · Planned (task) 272 · Skip (reason) 6); 161 bug rows (open 32 · doing 4 · testing 3 · fixed 90 · closed 2 · moved to PARITY 30).

**This count is updated with every merge to main**: the merge that changes a row re-runs the command
and pastes its line above. A `Have` is only a `Have` when its row names the merged PR or the CI run
that put it there (PARITY.md's Evidence column), so the Have count and the merged PRs move together.

**What the 2026-10-26 pass changed** (the audit found 0 `Have`, 41 `Better`, 290 `Planned` and 36
unclosed BUGS rows): every PARITY row was read against `origin/main`; 31 rows became `Have` with
their PR, 4 rows kept `Better` with their evidence, 37 `Better` claims that were not on main moved
down to `Planned (task)`, the `Parity` and bare `Planned` words were folded into the key's four, the
duplicated 49-row block and the orphaned row 237 in the file were repaired, and the two gaps the
audit named (a planned break, stop types) were added as rows 309 and 310. BUG-002 to BUG-033 - the
pre-monorepo feature backlog - are each closed in `docs/status/BUGS.md` with a pointer to the PARITY
row or the plan item that owns them now; the rows stay for history.

**Two rows of this file the pass could not verify and did not change** (report, not a claim): the
P5 earnings and P5 door memory rows below describe app halves that are not on main - nothing is
tracked under `apps/mobile/src/earnings` or `apps/mobile/src/doorMemory`, and
`services/api/app/earnings.py` does not exist. Their owner re-reads them on the next pass over this
file.

| area | status | what exists | what is missing | evidence |
|---|---|---|---|---|
| **P1 the Android E2E pipeline** | PARTIAL | the two-job pipeline (the release APK cached by content hash, then the emulator), the readiness gates (boot, install, start, pid, first screen), the E2E mode on local mocks, the permission grants, the evidence uploaded every run | the deep link courier:///compat still does not navigate from outside the app (BUG-046); the compat flow reaches the screen from the settings | the run 40112419901: all eight flows green on BOTH api legs (compat, smoke, map, stops, today-list, delivered, driving and, from PR #24, the map style screen) after BUG-060 (the emulator boots with software GL) |
| **P2 the research (24 areas)** | DONE | every area at the full V4 depth (30+ cards, the query log, the shortlist, the top-5 deep review, the benchmarks, the gaps, the decision, the risks) + the verifier pass (271 of 941 cards re-checked, 129 corrected) | — | docs/research/2026/ + the four VERIFICATION files |
| **P2 the eval sets** | PARTIAL | the voice set (600 scripts, 840 planned files, 240 real LINZ addresses) and the scanner set (330 synthetic labels with their ground truth, 40 slots for the founder) - both checked in CI | the audio is not generated (it needs the TTS and the licence ledger), the 40 founder photos, the routing eval set, the non-speech corpus | scripts/eval/check-voice-eval.mjs, scripts/eval/check-scanner-eval.mjs |
| **T2 the Expo version** | DONE | ADR-002 stays on Expo SDK 58 / RN 0.88, with the official source and each native module's peer range; D21 locks SDK 58 | — | docs/decisions/adr/ADR-002-expo-58.md, docs/research/2026/expo-sdk-58.md |
| **T4 the real LINZ data** | DONE | 225,151 real addresses indexed in `data/linz/` (gitignored), the D8 engine fixes (the rural suburbs, the hundreds, the unit and suffix combinations, the street type inside the road name), 98.3% D8 accuracy on the sampled real data | the weekly LINZ rebuild job ships with T5 | docs/evidence/phase-2.3/linz-accuracy.md, docs/decisions/adr/ADR-003-linz-data.md |
| **P3 the map view modes** | PARTIAL | the modes (2D, 3D, Satellite, Auto) with the per-driver memory, the toggles, the voice control of the camera, the 3D buildings builder with the licences checked | the Canterbury pack itself is not built (it needs the LINZ outlines and the OSM extract downloaded) | apps/mobile/src/maps/, the mobile suite (339 tests) |
| **P3 the offline map** | PARTIAL | the style from the tokens (day, night, high contrast), the pack contract, the fallback, the pack builder | the pack is not built and never ran on a device; the frame times and the size are unmeasured | docs/squads/maps/ |
| **P4 the design** | PARTIAL | Maps First chosen (D27) and being built per screen: the one token file `packages/design-tokens/src/chosen.ts` with the D33 contrast gate (1860 assertions) and the motion tokens; slices 1 to 3 done; steps 01 Today (caf2ef4), 02 Driving (d5793b4) and 05 Delivered (da3ef19) MERGED; step 06 Scan complete on PR #15, waiting on its E2E | steps 07 to 13 (Copilot, Route, Map style, Summary, Settings, Driving at night, Lock screen), each as its own PR with light and dark, all states, a11y, the motion and the recording beside its reference; the iOS half of every recording waits for an iOS build lane (FOUNDER_TODO); after all 13, the deprecation PR that deletes the legacy token modules | `docs/design/chosen/`, `docs/evidence/t6-screens/`, `docs/decisions/` |
| **P5 the on-device voice** | PARTIAL | the voice service (the engine port, the on-device engine, OmniRoute behind D25, the proactive rules, the 8-word driving-safe rule, the memory, the eval) | on the phone: the streaming STT is a TODO, no model packs are bundled, and it has never run on the emulator or a device | services/courier-voice/ (166 tests) |
| **P5 the sign-in** | PARTIAL | the service (MFA with TOTP and backup codes, the passkeys, the Google and Apple starts, the teams with the roles, the rate limits) and the app (the methods, the MFA step, the teams picker, the offline session, the biometric unlock) | the native Google and Apple sign-in in the app (there is no native library - only the passkey plugin), the magic link/OTP, the email verification, the HIBP check, the device binding, the session list, the refresh rotation, the passkey ceremony on a phone | services/auth (59 tests), the mobile suite (339 tests) |
| **P5 the scanner** | NOT STARTED | the label eval set and the D8 address correction | no scanner screen (VisionCamera is used only by the compat diagnostics), no crop, no OCR, no smart parsing | docs/squads/scanner/ |
| **P5 the routing** | PARTIAL | the API (a window-aware seed with a 2-opt pass, the arrival times, the template lock, the route endpoint, the deterministic 50x test) | the production engine is PyVRP 0.14.1 behind the RouteEngine seam (PR #19, ADR-009, D35): the 200-stop day plans in 3.2 to 3.3 s against the 5 s budget and the honest trade is +7.8 min of day per 174-stop run; the VROOM comparison leg stays unverified on this machine | services/api/app/solver.py + app/routing.py (ADR-009 §7 records the renames) |
| **P5 the sync** | DONE | the event log on op-sqlite, the sync service (a batch is confirmed only after the server stored it), the API batch endpoint, the schema, the repository | — | apps/mobile/src/sync/, services/api/app/repo.py, 160 API tests |
| **P5 the door memory** | PARTIAL | the API (private per courier, the normalised address key), the app (the memory on the stop sheet, the safe places, the offline queue) | never run against a real database | services/api/app/door_memory.py, apps/mobile/src/doorMemory/ |
| **P5 the earnings** | PARTIAL | the rate card, the money maths (Decimal, 15 % GST), the API, the app (the net on today's list, the breakdown, the end-of-day summary, the offline fallback) | no Stripe, no entitlements, no dunning, no IRD or Xero export | services/api/app/earnings.py, apps/mobile/src/earnings/ |
| **P5 the proof of delivery** | PARTIAL | the API (PR #21, ADR-010): POST /runs/{id}/stops/{id}/pod, a 10 MiB cap read before anything is stored, the type from the magic bytes, the file named by the server after the event, a replay answered with the first upload's fingerprint; the app's POD screen (05 Delivered with the proof) is on the chosen tokens | object storage is a local directory (ADR-010 §Limitations), not S3 | services/api/app/pod.py
| **P5 the web dashboard** | NOT STARTED | — | no apps/web, no dispatcher, no admin | — |
| **P5 the billing** | NOT STARTED | the rate card only | no Stripe, no subscriptions, no the store rules, no the entitlements | docs/research/2026/payments-subscriptions.md |
| **P5 driving mode** | PARTIAL | the map modes, the voice commands, the background location permission | no driving mode screen, no earbud protocol on a device, no foreground service, no keep-awake | apps/mobile/src/voice/ |
| **P6 the launch readiness** | PARTIAL | the production compose, the TLS, the backup with a restore test that ran against a real PostgreSQL, the health endpoints, the alerts, the runbook, the release checklist, StoreReady in CI | the production deployment itself (the founder's approval gate), the store ids, the signing, the background-location video | infra/, docs/operations/ |
| **S2 the store readiness** | PARTIAL | the privacy policy, the data-safety notes, the background-location declaration, the store listing draft, the local pre-submission check | the founder's store assets, the legal review, the account-deletion link | docs/operations/, 9 store-readiness tests |
| **The security fixes** | DONE | the voice WebSocket is authenticated, the JWT issuer is required, the audit step no longer hides its findings (the unused pipecat-ai is gone, certifi is constrained) | — | services/api/tests/auth/test_voice_socket.py, 160 API tests, the audit green |
| **The repository hygiene (§16)** | DONE | the API is a service (`services/api`), the contracts and the evaluation sets are packages, the scripts and the docs are grouped, the test convention is applied everywhere, the dead code is gone with its proof, the design lab is out of the release build | — | MASTER_EXECUTION §16, `docs/evidence/section-16/`, PR #3 merged into `main` as `4fb3578d` with 20 of 20 checks green |
## Current verified check results

| check | result | evidence |
|---|---|---|
| pnpm install | PASS (workspace: apps/mobile, packages/*, services/auth) | phase-2.4 logs |
| pnpm lint | **PASS** for every JS package (shared flat config in packages/eslint-config) + ruff for the API and the voice service | section-16/lint.log |
| pnpm typecheck | **PASS** for 6 packages (incl. the mobile app) + mypy (28 files in the API, 38 in the voice service) | section-16/typecheck.log |
| pnpm test | **PASS**: shared 26, design-tokens 1796, nz-address 17, services/auth 59, mobile 339, api 160, voice 166, the scripts 9 | section-16/test.log; the runs 39791921375 and 39791933552 |
| services/api pytest | PASS 160 passed, 1 skipped | section-16/test.log; the runs 39791921375 and 39791933552 |
| services/api ruff | PASS | section-16/lint.log |
| services/api mypy | PASS 28 files | section-16/typecheck.log |
| pnpm audit | 3 critical cleared (vitest 2.1.9 → 3.2.7); remaining are build-time only (metro/vite/esbuild). The three accepted build-time advisories now carry an owner and a finite review date, and an entry missing either FAILS the gate - an acceptance is never permanent. `braces` no longer fires; `node-forge` and `zod` do | phase-2.1/pnpm-audit.json; docs/evidence/advisories/README.md |
| banned-item grep | **0 hits** (was 41) | phase-2.4/banned-grep.log |

## PHASE 2.1 what changed

- `services/auth` (new pnpm package): Better Auth 1.7.10 with plugins `organization`, `expo`,
  `jwt`; fail-fast env validation (no default secrets); ES256 JWKS at `/api/auth/jwks`;
  tokens at `/api/auth/token`; Postgres (production) or in-memory (tests) storage.
- `services/api/app/auth/better_auth.py` + `services/api/tests/auth/test_better_auth.py`: **deleted**
  (the fake Python auth and its test of itself).
- `services/api/app/auth/jwks.py` (new): PyJWT verification against the JWKS, key-rotation
  aware, generic 401s; the API refuses to boot without `AUTH_JWKS_URL`.
- `services/api/app/auth/routes.py`: now only `/auth/me` and `/auth/verify` — the API issues no
  credentials.
- Banned Python deps removed: `redis`, `arq`, `passlib`, `python-jose`; `pyjwt[crypto]` and
  `httpx` added. `services/api/package.json` (a meaningless npm mirror of the Python deps)
  deleted.
- Workspace hygiene: root `package.json` pinned to exact versions (was `"latest"`), single
  `zod@4.6.7` across the workspace (the v3/v4 split broke Better Auth under pnpm hoisting),
  `vitest` upgraded to 3.2.7 everywhere (clears the critical advisories).

## Task register — SAAS_CHECKLIST + COVERAGE_MAP (MASTER_EXECUTION §4 P1–P7)

Every line of `docs/plan/SAAS_CHECKLIST.md` and `docs/plan/COVERAGE_MAP.md` becomes a task. The register
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
1. The lint and contrast follow-ups (BUG-045): fix the mobile ESLint findings, then turn the
   lint script on. The floor guard forbids suppressions and skipped tests.
2. T1-T4 are done (the emulator pipeline, the Expo 58 ADR, the LINZ accuracy, and the
   restructure merge into `main` as `4fb3578d`); the weekly LINZ rebuild job belongs to T5.
3. T6 — the design to `docs/design/chosen/` (Maps First, D27): the token file, the components,
   then the 13 screens, every state, light and dark, with the side-by-side design gate.
4. T5 — the offline Canterbury PMTiles (+ the weekly rebuild job).
5. T7 — the product itself (scanner, routing wire-up, voice on device, door memory, dictation,
   voice agent, web, billing, PIA).

