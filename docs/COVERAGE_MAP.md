# COVERAGE MAP — everything the product and the company must cover

Rule: the CEO keeps this map complete. Every line → task with spec/tests/evidence, or N/A with reason. **At the start of every phase run a Coverage Audit**: walk this map + the frameworks in §Z, add any missing line, create its task. The map only grows.

## 1. Courier real-world scenarios (driver day, NZ)
Depot loading & sorting order (load van in reverse stop order, shelf/zone tags) · multi-carrier drivers (NZ Post/CourierPost, Aramex, DHL, NZ Couriers, Post Haste, Mainfreight) with per-carrier stops, colours, earnings · carrier manifests/scanner exports import (CSV/Excel/PDF/photo) · multiple parcels per address & per customer · apartments/units/gated complexes (access codes, lift, reception) · rural RD addresses & long driveways · businesses with opening hours · signature-required, ID/age-restricted, high-value, fragile, cold-chain, oversized · cash/COD (if any) · pickups & returns mid-run · failed delivery (reasons, card left, photo, safe-place rules, neighbour, depot return) · re-delivery next day · customer not home → call/SMS template · dogs/hazards warnings per address · parking/loading-zone hints · road closures & roadworks (NZTA/Waka Kotahi feeds) · weather/daylight/rain mode · traffic & school zones · end-of-day reconciliation (delivered/failed/returned counts, parcels left in van) · next-day template rebuild · public holidays / peak season (Christmas) volume.

## 2. Driver safety, law & wellbeing (NZ)
Hands-free only while moving (NZ mobile-phone driving law) → UI locks non-essential touch while speed > threshold, voice-only · fatigue/break reminders & work-time log · SOS/emergency contact & incident report (accident, injury, dog bite, abuse) · damaged-parcel report with photos · lone-worker check-in (optional) · night-mode readability · accessibility for older drivers.

## 3. Money & admin for contractors
Earnings per carrier/run/day/week · rate cards (per parcel, per km, per run) · expenses (fuel, maintenance, phone) with receipt photo · IRD logbook (business km) · GST tracking & returns summary · income-tax estimate · export to **Xero**/MYOB/CSV · invoices to carriers (if contractor invoices) · team payroll/contractor payouts summary.

## 4. Intelligence (AI that learns the run)
Learns each driver's runs: stop order preferences, typical service time per address, door/drop spots, risky addresses · daily brief by voice ("214 stops, 3 new addresses, rain after 2pm") · anomaly alerts (address never delivered before, far outlier) · predictive ETA · auto-template suggestions · end-of-day summary · natural-language Q&A over own data ("how many failed in Riccarton this month?") · privacy-preserving, on-device first.

## 5. Customer-facing (optional per driver/team)
ETA SMS/links, live tracking page, delivery photo link, feedback, "leave at" instructions capture, opt-out, branded per team.

## 6. Team / fleet
Dispatcher web: assign runs, live map, reassign mid-day, chat/voice notes to drivers, performance dashboard, training mode for new drivers (shadow a template), roles & permissions, multi-depot.

## 7. Platform quality (ISO/IEC 25010)
Functional suitability · performance efficiency · compatibility (Android 10+ device matrix incl. low-end Samsung/Oppo/Xiaomi, tablets, foldables, earbuds models) · usability · reliability (crash-free, recovery) · security · maintainability · portability (iOS-ready). Device lab plan: CI emulator profiles + Firebase Test Lab-equivalent free/cheap option + founder's real phones.

## 8. Security, privacy, compliance
See SAAS_CHECKLIST §A + NZ Privacy Act 2020 (IPPs, breach notification), Consumer Guarantees Act & Fair Trading Act (subscription terms, refunds), GST registration, Google Play policies, OWASP ASVS/MASVS, ODbL/LINZ/CC-BY attribution, AI transparency (tell users when AI corrected something — already in dictation report).

## 9. Operations & reliability
Environments (dev/staging/prod), IaC, CI/CD, OTA channels, feature flags, observability/SLOs/alerts, on-call runbooks, incident postmortems, backups/DR drills, cost guard, data migrations, capacity planning.

## 10. Support & success
Help centre (EN + top languages), in-app guided tours, FAQ, chat (post-launch Chatwoot), bug report with logs from the app, status page, release notes, onboarding emails, churn-risk signals, NPS.

## 11. Go-to-market
Brand (name, logo, colours already in tokens), website + pricing page, Play Store listing (ASO keywords, screenshots, video), demo videos, referral programme, free trial flow, driver Facebook groups/community, carrier partnerships, launch plan for Christchurch then NZ/AU, analytics for acquisition.

## 12. Data & analytics
Event taxonomy, privacy-safe product analytics, funnels/retention, driver KPIs, data warehouse (Postgres views first), dashboards for founder, data retention/deletion jobs.

## 13. Localisation
UI languages (EN first, then Arabic RTL, Hindi, Punjabi, Mandarin, Samoan, Tongan, Māori UI terms), voice languages, NZ formats (dates, NZD, km), translation workflow.

## 14. Company engineering system
The V4 roles/squads, skills from `.claude/skills` on every task, research radar, ADRs, scorecard, weekly founder report, automations (triage, deps, release notes, error→issue, support→bug).

## Z. Frameworks to audit against (each Coverage Audit)
ISO/IEC 25010 · OWASP ASVS + MASVS + Top 10 · Google Play policy centre checklist · NZ Privacy Act IPPs · SaaS launch checklists (find 3+ on GitHub/awesome lists) · Jobs-to-be-done of a courier's day (from DRIVER_INTERVIEW_1 + Spoke reviews) · Competitor features (PARITY.md incl. Spoke) · Accessibility WCAG 2.2 AA · DORA/SRE practices.
