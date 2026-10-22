# GAP — Fleetbase Navigator (driver app) vs Courier Copilot

**Studied:** `fleetbase/navigator-app` (AGPL-3.0) — the white-label driver app of the Fleetbase
platform, React Native + Tamagui.
**Spine:** our own feature families from `docs/status/PARITY.md` and the tool catalogue in
`docs/archive/FINAL_PROMPT.md` §4.5, read through the driver app's lens. **Task ids** are ours
(`docs/archive/KICKOFF_V3_EN.md`).

**Status key** — `Have` shipped · `Better` we ship it and beat it · `Planned (task)` in the V3 list ·
`Skip (reason)`. A row may only leave `Planned` with evidence in `docs/evidence/`.

---

## A. Gap against our families (driver-side)

| # | Family | Our feature | What the studied driver app does | Status | Task | Our edge / reason |
|---|---|---|---|---|---|---|
| 1 | Stop import | CSV/Excel/Sheets import | Not a driver-side concern in the studied app; import is a console operation | Planned (task) | T7.4 | Voice-first; column mapping by the assistant |
| 2 | Stop import | Paste / messy text / email / manifest extraction | Absent | Planned (task) | T7.4 | Every extracted stop passes the D8 address engine |
| 3 | Stop import | Camera label scan (OCR + barcode) | Camera used only for proof photos and a QR proof scan; parcel barcodes are displayed, never scanned | Planned (task) | T7.8 | On-device, offline, NZ-address only |
| 4 | Stop import | Voice add stop (multi-stop dictation) | Absent — no voice anywhere | Better | T7.4 | Multi-stop dictation with a spoken correction report |
| 5 | Stop import | Integrations (multi-client) | Absent | Planned (task) | T7.14 | Multi-client aggregation for NZ couriers |
| 6 | Address | Autocomplete | Absent in the driver app; address search is console-side | Planned (task) | T4 | Biased to the driver's area, merged with door memory |
| 7 | Address | Validation, error detection, auto-correction | Absent — addresses arrive as free text from a dispatcher | Better | T4 | D8 engine corrects, explains, asks only when unsure |
| 8 | Address | Pin drop / manual location fix | Absent for the driver | Planned (task) | T7.3 | The fix becomes door memory |
| 9 | Optimisation | Multi-stop optimisation | Absent for the driver; the console plans the route | Better | T7.2 | No caps; the driver's own template and rules win |
| 10 | Optimisation | Time windows | Absent for the driver | Planned (task) | T7.2 | Set by natural language |
| 11 | Optimisation | Priority / ASAP / first-last stop | Absent | Planned (task) | T7.2 | Rules remembered across days |
| 12 | Optimisation | Start/end, round trip, service time per stop | Absent | Planned (task) | T7.2 | Learns the real dwell time per address |
| 13 | Optimisation | Re-optimise mid-route / insert stop en route | Absent — the driver cannot change the plan | Planned (task) | T7.2 | One voice command, never blocks driving |
| 14 | Optimisation | Pickup-delivery pairing | Absent | Planned (task) | T7.2 | Voice-marked pickups |
| 15 | Optimisation | Vehicle type, avoid tolls/highways, capacity | Absent | Planned (task) | T7.2 | Bike/e-bike profiles |
| 16 | Optimisation | Zones / territories | Absent | Planned (task) | T7.14 | PostGIS polygons over the Canterbury data |
| 17 | Driver tools | Map + list view | Map + list both exist; the map is embedded in the order screen and the list is a separate tab | Better | T7.7 | One surface: the list is primary, the map is the card |
| 18 | Driver tools | Package finder / load position | Parcels are listed per order with a photo, dimensions and weight; no load-position concept | Planned (task) | T7.2 | Ask the van where a parcel is |
| 19 | Driver tools | Door memory (gate codes, dog, side door) | Absent; the app has a free-text order note only | Better | T7.3 | Keyed to the LINZ address, learned over 2 deliveries |
| 20 | Driver tools | Live voice assistant (hands-free control) | Absent — the app is entirely touch-driven | Better | T7.5 | On-device first, server cascade optional, all languages |
| 21 | Navigation | Navigation hand-off with the door note read on arrival | Hand-off to any installed nav app with coordinates + place name; no door note, no turn-by-turn | Better | T7.7 | The assistant reads the door note on arrival |
| 22 | Navigation | In-app turn-by-turn | Absent | Skip (reason) | — | Hand-off plus a voice-first overlay; Ferrostar behind a flag (same call as PARITY #22) |
| 23 | POD | Photo POD (geo + timestamp) | Photo capture with hard-coded resize, uploaded immediately; server errors reported by users | Better | T7.9 | Local capture → queue → retry; base tier, never paywalled |
| 24 | POD | Signature | On-screen signature canvas; the capture itself is sound | Planned (task) | T7.9 | Offline-safe, sealed, downloadable |
| 25 | POD | Delivery outcomes / failed reasons / re-attempt | Transitions come from the server's lifecycle graph; no typed failure reason, no automatic retry | Better | T7.9 | The reason is spoken; the retry is scheduled for tomorrow |
| 26 | POD | Barcode scan to confirm delivery / reconcile | QR scan only, with a cooldown; no barcode scanning, no stop matching | Planned (task) | T7.8 | Auto-match to the stop, announced by voice |
| 27 | Reliability | Offline mode | **Read-only cache only** — lists, tracker and ETA payloads are cached; every write needs the network | Better | T7.1 | Every driving-day action works with no network |
| 28 | Sync | Cloud sync across devices and web | Socket push + polling refresh (5/15 min); no local event log, no conflict rules | Planned (task) | T7.1 | Event log, conflict rules tested |
| 29 | History | Route history | A date strip with dots on days that had work; the driver's own history is browsable but not searchable | Planned (task) | T7.12 | Searchable by voice |
| 30 | History | Saved / recurring routes and templates | Absent for the driver | Better | T7.2 | A template rebuilds the day in one tap, rules included |
| 31 | Tracking | Driver location tracking (background GPS) | Commercial background-location SDK, high accuracy, 10 m filter, restart-on-boot; the battery and charging state travel with each fix | Better | T7.1 | Battery-aware adaptive pings (≤ 8 %/h), self-hosted, opt-in |
| 32 | Tracking | Geofence auto-arrival / auto-complete | Absent — geofencing is a console feature | Planned (task) | T7.3 | Arrival triggers the spoken door memory |
| 33 | Customer | Recipient ETA SMS + live tracking page | Absent in the driver app (the tracking page is the customer's) | Planned (task) | T7.10 | Optional, off by default, rate-limited (D5) |
| 34 | Customer | Recipient ratings / feedback | Absent | Skip (reason) | — | Not a courier tool; a dispatcher concern at best (same call as PARITY #34) |
| 35 | Customer | Masked calls/SMS | Absent | Skip (reason) | T7.15 | Deferred behind an ADR (no NZ provider decided yet) |
| 36 | Dispatch | Dispatcher web dashboard, live map | Absent | Planned (task) | T7.12 | Our console is narrow by design |
| 37 | Dispatch | Auto-dispatch, shifts, driver chat | Chat with operations exists; no auto-dispatch or shifts in the app | Planned (task) | T7.14 | Voice notes, learned rules (we skip the chat inbox — see §B) |
| 38 | Earnings | Earnings tracking across platforms | Absent | Planned (task) | T7.12 | Multi-client ledger with NZ GST, driver-visible |
| 39 | Earnings | Mileage logbook + exports | Absent; distance is shown as a planned figure only | Planned (task) | T7.11 | IRD-ready NZ mileage rate from the GPS trace |
| 40 | Earnings | Client invoicing / payments | Absent | Planned (task) | T7.13 | Weekly GST invoice per client (Stripe) |
| 41 | Analytics | Reports (on-time %, stops/hr) | Two operational lists (issues, fuel reports) and a planned-duration total; no performance report | Planned (task) | T7.12 | Weekly voice summary |
| 42 | API | Public REST API + signed webhooks | Not the app's concern, but the app's traffic is plain REST | Planned (task) | T7.13 | FastAPI OpenAPI, HMAC-signed webhooks |
| 43 | Pricing/Billing | Subscription plans, free tier, trial | Absent | Planned (task) | T7.13 | NZD, GST inclusive, POD never paywalled |
| 44 | Onboarding | Onboarding tutorial | Sign-in, location disclosure and a configurable driver-onboarding path exist | Planned (task) | T7.5 | Voice-guided first route |
| 45 | Settings | Settings (units, nav app, default start, service time) | Language, theme and the nav-app choice; **no** unit toggle (asked for separately), no service-time default | Planned (task) | T7.6 | Every setting changeable by voice |
| 46 | Admin | Teams / roles / permissions | Absent | Planned (task) | T7.14 | Owner / dispatcher / driver, RLS on every query |
| 47 | Support | In-app support / help centre | Absent (terms/privacy links only) | Planned (task) | T7.12 | Multilingual AI agent grounded in our docs |
| 48 | Safety | SOS / emergency button | Absent | Planned (task) | T7.7 | Voice SOS, calls 111 directly |
| 49 | Compliance | Audit log, NZ Privacy Act retention, licence reminders | Absent in the app; a clear-cache action exists | Planned (task) | T7.15 | Audit log for admin actions, 30-day PII purge |

## B. Observed in the driver app, outside our families — decided

| Observed behaviour | Decision | Task | Reason |
|---|---|---|---|
| Operator-configurable tab set, tab icons, tab labels, default tab, login background colour | Skip (reason) | — | A white-label console may want it; one courier does not, and it multiplies the test surface — branding only (name + accent colour) |
| Built-in operations chat (channels, participants, attachments, unread badge) | Skip (reason) | — | A two-sided product; our assistant (T7.5) and the help centre (T7.12) cover the need |
| Fuel report capture (odometer, volume, cost, unit, vehicle) | Skip (reason) | — | A van's fuel card is not a courier product; mileage from the GPS trace (T7.11) is |
| Driver-raised issue reporting (type, category, priority, vehicle, timeline) | Skip (reason) | — | Our "report a problem" path is the failed-stop reason (T7.9); an issue system is a dispatcher tool |
| A "current destination" selector that lets the driver choose which stop to head to | Planned (task) | T7.2 | Adopted — and extended: our version is reachable by voice and re-announces on the next whisper |
| Server-driven list of allowed next transitions, rendered as labelled cards | Planned (task) | T7.2 | Adopted the discipline — our server owns the state machine; the app never invents a transition |
| A modal that names the previous and the new destination after a transition | Planned (task) | T7.9 | Adopted as a spoken whisper rather than a modal — the driver may not be looking at the screen |
| A "proof of delivery required" warning chip on the transition card | Planned (task) | T7.9 | Adopted: the assistant announces that a proof is needed *before* the driver commits |
| Offer of nearby unassigned work with accept / decline | Planned (task) | T7.2 | Adopted with the fix below (the studied app's buttons never disappear) |
| A 5-minute / 15-minute background refresh of the day list and nearby offers | Planned (task) | T7.1 | Adopted as a fallback only, disabled while the socket is healthy |
| A five-minute cache of the tracker and ETA payloads with duplicate-request suppression | Planned (task) | T7.1 | Adopted, with cache invalidation on state change (as the studied app does) |
| Five-minute background fetch that posts a position independently of the movement filter | Skip (reason) | — | Duplicates the adaptive tracker and burns battery; our single adaptive loop (R-NA-24) covers the case |
| Position reporting that continues after the app is closed and restarts after a device reboot | Skip (reason) | — | For an independent courier the shift is the unit of consent; we track during the shift and stop when it ends (R-NA-23) |
| "Start on boot" behaviour and a one-minute stop timeout | Skip (reason) | — | Our consent model is per shift, not per device boot |
| A dedicated location-permission screen with a plain-language disclosure | Better | T7.15 | Adopted and tightened: what, why, how long, who sees it — reviewed against the NZ Privacy Act 2020 |
| Signing-key and API-key hygiene notes in the install guide | Better | T7.15 | Adopted and enforced: CI fails the build if a configured secret reaches an artefact (R-NA-27) |
| App version and build number shown in the header | Planned (task) | T7.12 | Adopted — cheap, and it makes support reports actionable |
| A "clear cache" action in the account screen | Skip (reason) | — | With an offline-first local store, a "clear cache" button is a foot-gun; we ship a storage breakdown and a per-item purge instead |
| A "delete account" / sign-out in the account screen | Planned (task) | T7.15 | Adopted: sign out, export my data, delete my account — the last with the Privacy Act purge behind it |
| A separate profile-photo camera flow | Skip (reason) | — | A courier app does not need a portrait; we keep the account minimal |

## C. Defects in the studied app that we must not inherit

| Studied symptom | Our obligation | Task |
|---|---|---|
| Accept/dismiss buttons remain visible and tappable after acceptance, and after completion | R-NA-06 / R-FB-09: an offer's controls vanish permanently once used, and never appear for pre-assigned work | T7.2 |
| Proof-of-delivery photo uploads fail with a server error; uploaded photos do not appear in the operator view | R-NA-21 / R-FB-15: local capture → queue → retry → ack, and the operator view reads the same proof record | T7.9 |
| Proof photo resolution and compression are hard-coded in the source | R-NA-19: operator-configurable, no rebuild | T7.9 |
| The map renders blank on a real Android device | R-NA-29 + T5: our map tiles are bundled; the map must render with every external endpoint blocked | T7.15 |
| The app crashes on launch for several native-configuration reasons | R-NA-29 / R-NA-30: named preflight, tested install guide | T7.15 |
| The documented install omits required keys (map, socket, push, Android config file) | R-NA-30: the guide is the CI-tested path and lists every value | T7.15 |
| Only one language ships; others requested for years | R-NA-31: every shipped locale is complete; CI compares key sets | T7.15 |
| No way to see earnings or a wallet | R-NA-05 / T7.12: earnings, mileage and GST-ready export on the Me surface | T7.11, T7.12 |
| No unit toggle (km/miles) requested | Our units are metric and NZ-locale; the setting exists but is fixed to metric | T7.6 |
| A request for a Flutter build / Windows support | Skip (reason) | — | Our target is iOS and Android only; a second UI stack would halve the quality of both |

## D. Where we are deliberately ahead (summary of the study's verdict)

1. **Offline-first writes.** The studied app's entire driving loop requires a network; ours must not.
2. **Voice as the interaction model.** The studied app has no voice at all.
3. **NZ address correctness.** The studied app trusts the dispatcher's free text; ours corrects it
   against ground truth and says so.
4. **Door memory.** Nothing in the studied app remembers a gate code, a dog or a side door.
5. **A single state model.** The studied app derives button visibility from several independent
   flags, which is how its controls get stuck; ours has one state machine and a test that asserts
   the four views agree.
6. **Proof durability.** Capture locally, reconcile later, seal once, and export the day.
7. **Privacy by default.** No third-party map, geo or routing calls; position reporting is opt-in
   per shift and the battery state travels with every fix.

## E. Screen-by-screen map

| Studied screen | What it showed | Our equivalent | Status | Task |
|---|---|---|---|---|
| Boot / configuration check | Refused to start with missing values named | Preflight inside the app, plus a CI-tested install path | Planned (task) | T7.15 |
| Location permission | Plain-language disclosure, then the OS prompt | Same, tightened and reviewed under the Privacy Act | Better | T7.15 |
| Connect to a console | Point the app at a server | Not offered — one hosted service | Skip (reason) | T7.15 |
| Sign in | Password, phone + code, provider sign-in, organisation switch | Phone + code and email; one organisation | Planned (task) | T7.15 |
| Dashboard | Tracking flag, coordinates, active order count, speed | Replaced by the Today list; speed is not the driver's question | Skip (reason) | T7.7 |
| Orders tab (day list) | Calendar strip, day totals, assigned work + nearby offers | Today list: stops in order, totals, offers | Better | T7.2 |
| Order screen | Map, actions, destination selector, nine information sections | Driving surface: map + stop card + a collapsible detail sheet | Better | T7.7 |
| Activity picker (bottom sheet) | Coloured cards of the server's allowed transitions | The assistant asks and executes; the sheet is the fallback for touch | Better | T7.6 |
| Proof capture (scan / photo / signature) | Three modes, immediate upload | Same three modes, local-first with a retry queue | Better | T7.9 |
| Proof gallery | Grid of proofs with a full-screen viewer | Same, plus a downloadable day bundle | Better | T7.9 |
| Parcel / entity screen | Photo, QR, barcode, SKU, type, dimensions, weight | Merged into the stop card; the van view answers "which parcel" | Planned (task) | T7.2 |
| Navigation hand-off | Action sheet of installed nav apps, coordinates + name | Same hand-off, to the door point when known | Better | T7.7 |
| Reports (issues) | Driver-raised issue list with status badges | Not built — the failed-stop reason is the driver-facing report | Skip (reason) | T7.9 |
| Reports (fuel) | Odometer, volume, cost, vehicle | Not built — mileage comes from the GPS trace | Skip (reason) | T7.11 |
| Chat | Channels, participants, attachments, unread badge | Not built — the assistant and the help centre replace it | Skip (reason) | T7.12 |
| Account | Photo, email, phone, name, language, theme, terms, privacy, clear cache, sign out | Me: profile, language, units, nav app, voice, storage, export, delete, help | Planned (task) | T7.15 |
| Online/Offline switch in the header | One global toggle gating position reporting | Per-shift tracking consent, spoken and visible | Better | T7.1 |

## F. Error and edge-case behaviour

| Observed or implied case | Our rule | Task |
|---|---|---|
| The transition the app offers is rejected by the server | Speak one sentence, refresh the list, keep the stop open | T7.2 |
| The order was completed by a dispatcher while the screen was open | Close with one spoken sentence; no stale button left behind | T7.9 |
| A proof photo fails to upload | Keep it on the device, retry, and say "saved on your phone" | T7.9 |
| The network drops mid-shift | Continue entirely locally; one persistent offline marker; reconcile on return | T7.1 |
| The socket connection dies | Fall back to polling without interrupting the driver | T7.1 |
| The background-location permission is revoked in Settings | Detect on resume, stop reporting, tell the driver once | T7.1, T7.15 |
| The app is killed by the OS | Restart into the last known shift with the stop list intact | T7.1 |
| The device clock is wrong | Use the server's ordering for events; keep the device time only as a hint | T7.1 |
| The driver speaks an address the engine cannot resolve | Ask one question with two options; never invent a street | T4 |
| The driver says "delivered" far from the stop | Ask once, then record the position with the outcome | T7.9 |
| The driver taps the wrong stop while scrolling | The stop card shows the full address and the assistant repeats it before acting | T7.7 |
| The device is out of storage | Warn before the shift; refuse new captures rather than corrupting old ones | T7.15 |
| The scan reads the same code twice | Cooldown and a "already scanned" answer, never a duplicate proof | T7.8 |
| A photo comes out rotated or upside down | Detect orientation at capture time and normalise before upload | T7.9 |

## G. Settings the studied app exposes, and ours

| Studied setting | Our decision | Task |
|---|---|---|
| App language | Adopted, and every shipped locale is complete | T7.6, T7.15 |
| Colour scheme (light / dark / system) | Adopted; dark mode is automatic and never a manual switch | T7.6 |
| Navigation app choice | Adopted — and changeable by voice | T7.6 |
| Units | Metric only; NZ locale. The setting exists but is fixed to metric | T7.6 |
| Set of tabs, tab icons, tab labels | Skipped — one shell, branding only | T7.6 |
| Default tab | Skipped — we always open on Today | T7.6 |
| Login background colour | Skipped — one design system (T6) | T7.6 |
| Profile photo | Skipped — a courier app does not need a portrait | T7.15 |
| Clear cache | Replaced by a storage breakdown and per-item purge | T7.15 |
| Sign out | Adopted | T7.15 |
| Voice speed / voice language | New — ours, and changeable mid-shift | T7.5, T7.6 |
| Storage, export my data, delete my account | New — ours, with the Privacy Act purge behind the delete | T7.15 |
