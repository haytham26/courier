# Parity — feature by feature against the 2026 market

Maintained per V4 §4. Base: `docs/COMPETITIVE_RESEARCH.md` and `docs/RESEARCH_2026_WAVE3.md`
(the 49-service parity matrix), refreshed with the 2026 entrants (Circuit/Spoke, Route4Me, Upper,
Routific, OptimoRoute, Onfleet, Beans.ai, MyRouteOnline, Straightaway, Zeo, Road Warrior, Google/Apple
Maps multi-stop, the NZ carrier driver apps).

**Status key** — `Have` (shipped) · `Better` (we do it better than the market) ·
`Planned (task)` (in the V3 task list) · `Skip (reason)`.

The **Spoke** column is mandatory (V4 §13.2): every family is compared with the number one NZ competitor, from docs/study/spoke/ (TEARDOWN, REVIEWS, BEAT-SPOKE, read 2026-10-20).

Task ids: **T4** LINZ data · **T5** offline maps · **T6** design · **T7.x** the product list in
`docs/KICKOFF_V3_EN.md` · **T7.15** PIA, store assets, acceptance test, handover.

| # | Family | Feature | Status | Spoke (2026-10-20) | Our edge | Task |
|---|--------|---------|--------|----------|------|
| 1 | Stop import | CSV/Excel/Sheets import with column mapping | match - spreadsheet import (Spoke: Android only) | Planned (task) | voice-first; column mapping by LLM | T7.4 |
| 2 | Stop import | Paste / messy text / email / manifest extraction | not documented by Spoke - we lead | Planned (task) | D8 address correction on every extracted stop | T7.4 |
| 3 | Stop import | Camera label scan (OCR + barcode) | match - one label scan, cloud | Planned (task) | on-device, offline, NZ-address only, ≤ 1.5 s/label | T7.8 |
| 4 | Stop import | Voice add stop (multi-stop dictation) | match - bulk voice dictation (2026-04) | Better | multi-stop dictation with a "you said X → corrected Y" report | T7.4 |
| 5 | Stop import | Integrations (Shopify, WooCommerce, Zapier, NZ carriers, multi-client) | skip for v1 - Spoke has carrier links | Planned (task) | multi-client aggregation for NZ couriers | T7.14 |
| 6 | Address | Autocomplete | match - Google-Maps search; ours is LINZ-biased | Planned (task) | biased to Christchurch, merged with door memory | T4 |
| 7 | Address | Validation, error detection, auto-correction | match - Spoke flags a wrong pin, we explain | Better | D8 engine: corrects, explains, and only asks when unsure | T4 |
| 8 | Address | Pin drop / manual location fix | match - pin drop; ours teaches door memory | Planned (task) | the fix becomes door memory | T7.3 |
| 9 | Optimisation | Multi-stop optimisation (unlimited stops) | match - one-tap optimise, no stop cap | Better | no stop caps; the driver's own template and rules win | T7.2 |
| 10 | Optimisation | Time windows | match - time windows per stop | Planned (task) | set by natural language ("pharmacy after 2pm") | T7.2 |
| 11 | Optimisation | Priority / ASAP / first-last stop | match - first/auto/last priority | Planned (task) | rules remembered across days | T7.2 |
| 12 | Optimisation | Start/end, round trip, service time per stop | match - time at stop, ours learns it | Planned (task) | learns the real dwell time per address | T7.2 |
| 13 | Optimisation | Re-optimise mid-route / insert stop en route | match - Spoke separates update and reoptimise | Planned (task) | one voice command, never blocks driving | T7.2 |
| 14 | Optimisation | Pickup-delivery pairing | match - pickup/delivery pairing | Planned (task) | voice-marked pickups, OR-Tools PD constraints | T7.2 |
| 15 | Optimisation | Vehicle type, avoid tolls/highways, capacity | match - vehicle types, ours adds bike profiles | Planned (task) | bike/e-bike profiles (Valhalla) | T7.2 |
| 16 | Optimisation | Zones / territories, multi-depot | match - custom zones in Dispatch | Planned (task) | PostGIS polygons over the real Canterbury data | T7.14 |
| 17 | Driver tools | Map + list view, drag reorder | match - map + list; ours adds voice reorder | Better | voice reorder, and the list is the primary surface | T7.7 |
| 18 | Driver tools | Package finder / load position | match - package finder with a van code | Planned (task) | ask the van where a parcel is | T7.2 |
| 19 | Driver tools | Door memory (gate codes, dog, side door) | beat - Spoke has sticky text notes only | Better | keyed to the LINZ address, learned over 2 deliveries | T7.3 |
| 20 | Driver tools | Live voice assistant (hands-free control of the whole app) | beat - Spoke voice is entry-only | Better | on-device first, server cascade optional, all languages | T7.5 |
| 21 | Navigation | Navigation hand-off (Google/Apple/Waze) | match - hand-off to Google/Apple/Waze | Better | the assistant reads the door note on arrival | T7.7 |
| 22 | Navigation | In-app turn-by-turn | skip - no in-app turn-by-turn | Skip (reason) | hand-off plus a voice-first overlay; Ferrostar behind a flag | — |
| 23 | POD | Photo POD (geo + timestamp) | match - photo POD | Better | included in the base tier, never paywalled | T7.9 |
| 24 | POD | Signature | match - signature | Planned (task) | offline-safe | T7.9 |
| 25 | POD | Delivery outcomes / failed reasons / re-attempt | match - outcomes and failed reasons | Better | the reason is spoken; the retry is scheduled for tomorrow | T7.9 |
| 26 | POD | Barcode scan to confirm delivery / reconcile | match - barcode scan | Planned (task) | auto-match to the stop, announced by voice | T7.8 |
| 27 | Reliability | Offline mode (cached route, POD/edit queue) | beat - Spoke offline is partial, ours is not | Better | every driving-day action works with no network | T7.1 |
| 28 | Sync | Cloud sync across devices and web | match - cloud sync | Planned (task) | event log, conflict rules tested | T7.1 |
| 29 | History | Route history | match - route history | Planned (task) | searchable by voice | T7.12 |
| 30 | History | Saved / recurring routes and templates | beat - Spoke copies a past route, we rebuild | Better | a template rebuilds the day in one tap, rules included | T7.2 |
| 31 | Tracking | Driver location tracking (background GPS) | match - background GPS | Better | battery-aware adaptive pings (≤ 8 %/h) | T7.1 |
| 32 | Tracking | Geofence auto-arrival / auto-complete | match - geofence arrival | Planned (task) | arrival triggers the spoken door memory | T7.3 |
| 33 | Customer | Recipient ETA SMS + live tracking page | match - customer ETA SMS | Planned (task) | optional, off by default, rate-limited (D5) | T7.10 |
| 34 | Customer | Recipient ratings / feedback | skip - not a driver tool | Skip (reason) | not a courier tool; a dispatcher concern at best | — |
| 35 | Customer | Masked calls/SMS | skip - masked calls deferred by ADR | Skip (reason) | deferred behind an ADR (no NZ provider decided yet) | T7.15 |
| 36 | Dispatch | Dispatcher web dashboard, multi-driver planning, live map | match - dispatcher dashboard and live map | Planned (task) | Team plan, live map, route hand-off | T7.12 |
| 37 | Dispatch | Auto-dispatch, shifts, driver chat | match - driver chat and shifts | Planned (task) | voice notes, learned rules | T7.14 |
| 38 | Earnings | Earnings tracking across platforms | match - earnings tracking | Planned (task) | multi-client ledger with NZ GST | T7.12 |
| 39 | Earnings | Mileage logbook + CSV/PDF exports (IRD) | match - mileage logbook | Planned (task) | IRD-ready NZ mileage rate from the GPS trace | T7.11 |
| 40 | Earnings | Client invoicing / payments, quote engine | match - client invoicing | Planned (task) | weekly GST invoice per client (Stripe) | T7.13 |
| 41 | Analytics | Reports (on-time %, stops/hr), planned vs actual | match - dispatch analytics | Planned (task) | weekly voice summary | T7.12 |
| 42 | API | Public REST API + signed webhooks | match - public API and webhooks | Planned (task) | FastAPI OpenAPI, HMAC-signed webhooks | T7.13 |
| 43 | Pricing/Billing | Subscription plans, free tier, free trial | match - free trial and plans | Planned (task) | NZD, GST inclusive, POD never paywalled | T7.13 |
| 44 | Onboarding | Onboarding tutorial | match - guided onboarding | Planned (task) | voice-guided first route | T7.5 |
| 45 | Settings | Settings (units, nav app, default start, service time) | match - every setting by voice | Planned (task) | every setting changeable by voice | T7.6 |
| 46 | Admin | Teams / roles / permissions | match - teams and roles | Planned (task) | owner / dispatcher / driver, RLS on every query | T7.14 |
| 47 | Support | In-app support / help centre | match - in-app help | Planned (task) | multilingual AI agent grounded in our docs | T7.12 |
| 48 | Safety | SOS / emergency button | match - SOS in the app | Planned (task) | voice SOS, calls 111 directly | T7.7 |
| 49 | Compliance | Audit log, NZ Privacy Act 2020 retention, licence/WOF reminders | match - audit log and retention | Planned (task) | audit log for admin actions, 30-day PII purge | T7.15 |

## Where we beat the market (the differentiators to protect)

1. **Voice-first, hands-free** — the whole shift is runnable by voice (D2); the market's voice support
   is one-shot dictation at best.
2. **NZ address auto-correction with an explanation** — the D8 engine corrects, says what it changed
   and asks only when unsure; no competitor does this for NZ addresses.
3. **Door memory** — learned per LINZ address and read out on arrival.
4. **Template-based daily rebuild** — the driver's own route and rules, rebuilt in one tap.
5. **On-device privacy** — audio never leaves the phone by default; NZ Privacy Act 2020 PIA in T7.15.

## Rules

- A row may only leave `Planned` when the task is merged **with evidence** in `docs/evidence/`.
- A row may only become `Skip` with a written reason (the product spec or an ADR).
- The V4 Definition of Done requires no `Planned` left in the must-cover families.
