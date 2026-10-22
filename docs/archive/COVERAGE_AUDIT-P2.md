# Coverage Audit — P2 (2026-10-20)

Run at the start of P2, per `docs/MASTER_EXECUTION.md` §4 and `docs/COVERAGE_MAP.md`.
Scope: every line of `docs/COVERAGE_MAP.md` §1–§14 and the §Z framework list, checked against
what we actually ship today (not against the plan). The register of tasks lives in
`docs/PROGRESS.md`; the evidence links are `docs/evidence/**` and the CI runs.

**The audit only grows the map.** Everything below that is not covered became a task (the ids are
in the register: S = security, D = driver runtime, B = SaaS business, C = coverage areas,
I = innovation, M = method).

## The §Z frameworks, one by one

| Framework | What it demands of us | Where we stand (evidence) | Gap → task |
|---|---|---|---|
| ISO/IEC 25010 | functional suitability, performance efficiency, compatibility, usability, reliability, security, maintainability, portability | functional: the D8 engine (96.9 % on 656k real addresses, `docs/evidence/phase-2.3/linz-accuracy.md`) · performance: **UNVERIFIED** (no benchmark yet) · compatibility: the emulator E2E is the only device evidence, one profile (API 34, google_apis) · usability: the mockups exist (`docs/design/mockups/`) but no screen has been built against them · reliability: **UNVERIFIED** (no crash data, no offline day) · security: the gates are green (Semgrep, CodeQL, gitleaks, audits, licence inventory) · maintainability: one ESLint config, a written floor, typecheck + mypy clean · portability: iOS not built | M5 (mutation ≥80 %), C7 (device matrix + 2 emulator profiles), P6 (performance budgets measured), P4 (the design gate) |
| OWASP ASVS + MASVS + Top 10 | API L2, mobile L2, threat model per module, DAST, pen-test checklist | ASVS: zod/pydantic validation at the boundary, JWKS verification, generic 401s, rate limits on the credential endpoints, no default secrets, CORS/headers **not yet audited** · MASVS: SQLCipher planned, Keystore via expo-secure-store, no secrets in the APK (checked by the licence/secret gates), **certificate pinning and root detection not built** · Top 10: the SAST gate is clean | S3, S5 (both open in the register) |
| Google Play policy centre | background-location declaration + video, foreground-service types, Play Billing for in-app subscriptions, account deletion, Data Safety, target API level | The manifest declares the permissions and the foreground-service types; the app.json has the usage strings. **Play Billing vs Stripe web checkout is undecided** (the research found the policy risk); no Data Safety form, no account deletion, no target-API check | S2, and the ADR from the research (ADR-008 in the sprint summary) |
| NZ Privacy Act 2020 | IPPs, breach notification, retention, consent, audio not stored | The audio-not-stored and retention rules are in the spec; the PIA, the notice and the breach plan do not exist | C8 (PIA + privacy policy + DPA + breach plan) |
| SaaS launch checklists (3+ found on GitHub / awesome lists) | the industry list of "you are not done until…" | **Not done**: the research sprint did not cover "SaaS starter kits and launch checklists" as an area (it is in `SAAS_CHECKLIST` §D). The launch-readiness items are in the register from §C9, but the three external checklists are not yet pulled in | M6 (pull 3+ launch checklists, diff them against our register) |
| Jobs-to-be-done of a courier's day | every real scenario from `DRIVER_INTERVIEW_1` + the Spoke reviews | `DRIVER_INTERVIEW_1` is mapped into COVERAGE_MAP §1 by the founder; the **Spoke reviews** half is missing (P2, §13.2) | M1 (the Spoke teardown) |
| Competitor features (PARITY.md incl. Spoke) | every competitor feature, our status per row | 49 families, each with a status and a task. **The Spoke column is missing on every row** (§13.2) and the "match / beat" plan does not exist | M1 + the Spoke column on the 49 rows |
| Accessibility WCAG 2.2 AA | contrast, screen reader, dynamic type to 200 %, colour-blind safe, RTL | the design system states the rules; **nothing is measured** and no screen has been audited. The mobile app has no a11y test | P4 (the design gate includes a11y) + M7 (an axe/RN-a11y pass in CI) |
| DORA / SRE | deployment as code, observability, SLOs, on-call, incident process, change failure rate | CI is as code; the deploy, the observability stack, the SLOs and the on-call runbooks are **not started** | C9, C10 (P6) |

## The coverage areas, one by one (§1–§14)

| Area | Covered today | The gap (task) |
|---|---|---|
| §1 courier scenarios | the address engine covers the "messy address" half (units, RD, multi-suburb, misspellings) | the rest of the day: depot sort order, multi-carrier manifests, failed-delivery reasons, roadworks, end-of-day reconciliation → C1 (T7.2, T7.4, T7.9) |
| §2 safety and law | the spec | hands-free lock above the speed threshold, fatigue log, SOS, incident report → C2 (T7.7) |
| §3 money | the IRD logbook is planned with the map-matching method | earnings, rate cards, expenses, GST, Xero export, invoices → C3 (T7.11) |
| §4 intelligence that learns the run | door memory is planned (T7.3) | the daily brief, anomaly alerts, predictive ETA, template suggestions, NL Q&A → C4 (T7.3–7.5) |
| §5 customer-facing | optional by design (D5) | ETA SMS, live page, feedback, leave-at capture → C5 (T7.10) |
| §6 team and fleet | the auth service already carries the `organization` plugin and the team roles | the dispatcher web, the live map, the hand-off, training mode → C6 (T7.14) |
| §7 platform quality | CI + one emulator profile | the device matrix, the crash data, the performance budgets → C7, P6 |
| §8 security and privacy | the gates | the PIA, the attribution, the Play policies → C8 (P6) |
| §9 operations | CI/CD as code | environments, IaC, observability, SLOs, DR drills, the cost guard → C9 (P6) |
| §10 support | — | the help centre, the in-app tour, the bug report with logs, the status page, the weekly report → C10 (P6) |
| §11 go-to-market | — | the website, the pricing page, the Play listing, the referral programme, the Christchurch-first launch → C11 (P6) |
| §12 data | the event log design (T7.1) | the taxonomy, the funnels, the founder dashboards, the retention jobs → C12 (P6) |
| §13 localisation | the voice research found the licence-clean multilingual candidates | no i18n runtime in the app at all, no RTL screen, no translation workflow → I2 (a new task: the i18n stack, from the research) |
| §14 company system | the skills map, the ADRs, the scorecard, the squads, the weekly report template | the automations (triage, release notes, error→issue, support→bug) → B2 (P6) |

## What the audit added (the map only grows)

| New id | Item | Why it was missing | Lands in |
|---|---|---|---|
| **M6** | three external SaaS launch checklists, diffed against our register | the §Z framework list asks for it and no area covered it | P2 |
| **M7** | an accessibility check in CI (axe / react-native-a11y) | WCAG 2.2 AA was named but nothing measured it | P4 |
| **I2** | the i18n runtime and the RTL screen | the app has no i18n at all, while the product is multilingual by decision (D3) | P5 |
| **I3** | the "swipe to deliver" one-swipe flow and the van map | the innovation backlog in §9 listed them; they were not in the register | P5 |
| **S6** | the certificate pinning + root/emulator detection for our API | the checklist named it; the register only had the general mobile rules | P5 |

## The verdict

The map is now complete against `COVERAGE_MAP.md` §1–§14 and the §Z frameworks: **every line has a
task, and five new tasks were added by this audit.** What is missing is not coverage on paper but
**measurements**: the performance budgets, the reliability data, the a11y audit, the device matrix and
the Spoke comparison all still have to be produced. Those are the P2 and P6 jobs, and until they
exist the scorecard stays where it is.
