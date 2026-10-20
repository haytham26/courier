# GAP — Fleetbase platform vs Courier Copilot

**Studied:** `fleetbase/fleetbase` + first-party extensions (Fleet-Ops, AI, IAM, Ledger, Pallet, Storefront).
**Spine:** our own feature families and row numbering from `docs/PARITY.md` (1–49) and the tool
catalogue in `docs/FINAL_PROMPT.md` §4.5. **Task ids** are the ones we use (`docs/KICKOFF_V3_EN.md`).

**Status key** — `Have` shipped · `Better` we ship it and beat it · `Planned (task)` in the V3 list ·
`Skip (reason)`. A row may only leave `Planned` with evidence in `docs/evidence/`.

---

## A. Gap against our families

| # | Family | Our feature | What the studied platform does | Status | Task | Our edge / reason |
|---|---|---|---|---|---|---|
| 1 | Stop import | CSV/Excel/Sheets import with column mapping | Bulk order import with a template file and a spreadsheet column mapper | Planned (task) | T7.4 | Voice-first; column mapping inferred, not configured |
| 2 | Stop import | Paste / messy text / email / manifest extraction | Console-side bulk import; no natural-language stop extraction at the driver | Planned (task) | T7.4 | Every extracted stop goes through the D8 address engine |
| 3 | Stop import | Camera label scan (OCR + barcode) | Camera used only for proof-of-delivery photos and QR proof scanning; parcels are read from a rendered barcode image, never scanned | Planned (task) | T7.8 | On-device, offline, NZ-address only, ≤ 1.5 s/label |
| 4 | Stop import | Voice add stop (multi-stop dictation) | No voice or dictation anywhere in the platform | Better | T7.4 | Multi-stop dictation with a "you said X → corrected Y" report |
| 5 | Stop import | Integrations (multi-client) | Storefront, Lalamove-style and integrated-vendor order sources | Planned (task) | T7.14 | Multi-client aggregation for independent NZ couriers |
| 6 | Address | Autocomplete biased to the driver's area | Address book with a geocoder-backed place search | Planned (task) | T4 | Biased to Christchurch, merged with door memory |
| 7 | Address | Validation, error detection, auto-correction | Free-text addresses; geocoder resolves them, no validation that the number exists | Better | T4 | D8 engine: corrects, explains, asks only when unsure |
| 8 | Address | Pin drop / manual location fix | Place records can be edited with coordinates in the console | Planned (task) | T7.3 | The fix becomes door memory |
| 9 | Optimisation | Multi-stop optimisation (unlimited stops) | Server-side batch optimisation, VROOM-based, committed as a manifest | Better | T7.2 | No stop caps; the driver's own template and rules win |
| 10 | Optimisation | Time windows | Per-stop time window fields and scheduler slots | Planned (task) | T7.2 | Set by natural language ("pharmacy after 2pm") |
| 11 | Optimisation | Priority / ASAP / first-last stop | Orchestrator priority field and batch assignment | Planned (task) | T7.2 | Rules remembered across days |
| 12 | Optimisation | Start/end, round trip, service time per stop | Per-stop service time; start/end via the orchestrator commit | Planned (task) | T7.2 | Learns the real dwell time per address |
| 13 | Optimisation | Re-optimise mid-route / insert stop en route | Route re-sequencing is a console action, previewed by the AI copilot | Planned (task) | T7.2 | One voice command, never blocks driving |
| 14 | Optimisation | Pickup-delivery pairing | Orchestrator engine supports assignment constraints | Planned (task) | T7.2 | Voice-marked pickups, OR-Tools PD constraints |
| 15 | Optimisation | Vehicle type, avoid tolls/highways, capacity | Capacity allocation engine; routing-engine choice per install | Planned (task) | T7.2 | Bike/e-bike profiles (Valhalla) |
| 16 | Optimisation | Zones / territories, multi-depot | Polygon zones and radius service areas with a geofence event log | Planned (task) | T7.14 | PostGIS polygons over the real Canterbury data |
| 17 | Driver tools | Map + list view, drag reorder | Map + list exist; reordering is console-side, not in the driver app | Better | T7.7 | Voice reorder, and the list is the primary surface |
| 18 | Driver tools | Package finder / load position | Parcel entities carry an image, dimensions, weight; no load-position model | Planned (task) | T7.2 | Ask the van where a parcel is |
| 19 | Driver tools | Door memory (gate codes, dog, side door) | A per-place "rules" tab exists but is an empty placeholder | Better | T7.3 | Keyed to the LINZ address, learned over 2 deliveries |
| 20 | Driver tools | Live voice assistant (hands-free control) | A console-side AI copilot with preview-confirm actions; **no** assistant in the driver app | Better | T7.5 | On-device first, server cascade optional, all languages |
| 21 | Navigation | Navigation hand-off with the door note read on arrival | Hand-off to any installed nav app with coordinates + place name; the app has no turn-by-turn | Better | T7.7 | The assistant reads the door note on arrival |
| 22 | Navigation | In-app turn-by-turn | Server-side travel-time/route geometry only (OSRM/Google), consumed as a map overlay | Skip (reason) | — | Hand-off plus a voice-first overlay; Ferrostar behind a flag (same call as PARITY #22) |
| 23 | POD | Photo POD (geo + timestamp) | Photo capture, resized then uploaded; proven to fail with server errors and to not render in the console | Better | T7.9 | Included in the base tier, offline capture, never paywalled |
| 24 | POD | Signature | Webview signature canvas capture | Planned (task) | T7.9 | Offline-safe, sealed, downloadable |
| 25 | POD | Delivery outcomes / failed reasons / re-attempt | Lifecycle states are tenant-defined; failure reasons and tomorrow re-attempts are not modelled | Better | T7.9 | The reason is spoken; the retry is scheduled for tomorrow |
| 26 | POD | Barcode scan to confirm delivery / reconcile | QR proof scan only; barcodes are rendered, not read | Planned (task) | T7.8 | Auto-match to the stop, announced by voice |
| 27 | Reliability | Offline mode (cached route, POD/edit queue) | Read-only local cache of lists; **every write needs the network** | Better | T7.1 | Every driving-day action works with no network |
| 28 | Sync | Cloud sync across devices and web | Realtime socket push plus polling; no local event log | Planned (task) | T7.1 | Event log, conflict rules tested |
| 29 | History | Route history | Order list is queryable by date in the driver app | Planned (task) | T7.12 | Searchable by voice |
| 30 | History | Saved / recurring routes and templates | Recurring order schedules materialise orders from a template; no driver-side route template | Better | T7.2 | A template rebuilds the day in one tap, rules included |
| 31 | Tracking | Driver location tracking (background GPS) | Commercial background geolocation SDK, 10 m filter, start on boot, uploads only while online | Better | T7.1 | Battery-aware adaptive pings (≤ 8 %/h), self-hosted |
| 32 | Tracking | Geofence auto-arrival / auto-complete | Geofence entry/exit/dwell events server-side; no driver-facing arrival cue | Planned (task) | T7.3 | Arrival triggers the spoken door memory |
| 33 | Customer | Recipient ETA SMS + live tracking page | Tracking page with a one-time code; outbound SMS to recipients not in the driver product | Planned (task) | T7.10 | Optional, off by default, rate-limited (D5) |
| 34 | Customer | Recipient ratings / feedback | A "report a problem" action on the tracking page only | Skip (reason) | — | Not a courier tool; a dispatcher concern at best (same call as PARITY #34) |
| 35 | Customer | Masked calls/SMS | Not present | Skip (reason) | T7.15 | Deferred behind an ADR (no NZ provider decided yet) |
| 36 | Dispatch | Dispatcher web dashboard, multi-driver planning, live map | Full console: order board, live map, orchestrator workbench, scheduler, manifests | Planned (task) | T7.12 | Our console is deliberately narrow; route hand-off first |
| 37 | Dispatch | Auto-dispatch, shifts, driver chat | Shifts + availability + hours-of-service; chat channels with operations | Planned (task) | T7.14 | Voice notes, learned rules |
| 38 | Earnings | Earnings tracking across platforms | Ledger has transactions, wallets and invoices (an operator product) | Planned (task) | T7.12 | Multi-client ledger with NZ GST, driver-visible |
| 39 | Earnings | Mileage logbook + CSV/PDF exports | Position history exists server-side; no driver-facing logbook | Planned (task) | T7.11 | IRD-ready NZ mileage rate from the GPS trace |
| 40 | Earnings | Client invoicing / payments, quote engine | Service rates, quotes, invoices, payment gateways | Planned (task) | T7.13 | Weekly GST invoice per client (Stripe) |
| 41 | Analytics | Reports (on-time %, stops/hr), planned vs actual | Analytics module: on-time delivery, fuel efficiency, revenue, top drivers | Planned (task) | T7.12 | Weekly voice summary for the driver |
| 42 | API | Public REST API + signed webhooks | Full REST API with keys, webhooks, socket events, and a developer console | Planned (task) | T7.13 | FastAPI OpenAPI, HMAC-signed webhooks |
| 43 | Pricing/Billing | Subscription plans, free tier, free trial | Extension marketplace with free and paid extensions | Planned (task) | T7.13 | NZD, GST inclusive, POD never paywalled |
| 44 | Onboarding | Onboarding tutorial | Driver onboarding from the app or an invite link, optional required documents | Planned (task) | T7.5 | Voice-guided first route |
| 45 | Settings | Settings (units, nav app, default start, service time) | Theme, language, tab set and nav-app choice are configurable per tenant | Planned (task) | T7.6 | Every setting changeable by voice |
| 46 | Admin | Teams / roles / permissions | Full IAM: users, groups, roles, policies, 2FA, per-organisation scoping | Planned (task) | T7.14 | Owner / dispatcher / driver, RLS on every query |
| 47 | Support | In-app support / help centre | AI answers documentation questions in the console; nothing in the driver app | Planned (task) | T7.12 | Multilingual AI agent grounded in our docs |
| 48 | Safety | SOS / emergency button | Not present for drivers | Planned (task) | T7.7 | Voice SOS, calls 111 directly |
| 49 | Compliance | Audit log, NZ Privacy Act retention, licence/WOF reminders | Audit logs exist for AI turns and API requests; "Radar" flags expiring licences | Planned (task) | T7.15 | Audit log for admin actions, 30-day PII purge |

## B. Observed in the platform, outside our families — decided

| Observed behaviour | Decision | Task | Reason |
|---|---|---|---|
| Tenant-configurable lifecycle graph (visual flow designer, conditions, events) | Skip (reason) | — | A single courier does not need a flow designer; our states are fixed and ours (R-FB-02) |
| Warehouse management: pick lists, cycle counts, fulfilment | Skip (reason) | — | A different buyer; we are a driver-side product |
| Public catalogue, checkout, storefront app | Skip (reason) | — | We are not a shop; client intake comes through integrations (T7.14) |
| General ledger, chart of accounts, accounting reports, wallets, payment gateways | Skip (reason) | — | Driver-visible books only; the full accounting product is out of scope |
| Third-party telematics connectors (fleet-tracker vendors, fuel-card providers) | Skip (reason) | — | Our users carry no tracker hardware; the phone is the tracker |
| Maintenance, inspections/DVIR, work orders, part stock | Skip (reason) | — | Fleet-owner tooling; an independent courier maintains their own van |
| Operator "decision agenda" (radar) with snooze/acknowledge/assign | Planned (task) | T7.12 | We keep the driver-visible slice: our own failed stops and expiring documents |
| Server-side geofence dwell, deviation and prolonged-stop detection | Skip (reason) | — | Employer surveillance is not our product; we use the geofence to *help* the driver, not to police them |
| Realtime socket server with signed per-channel authorisation | Planned (task) | T7.1 | We adopt the authorisation discipline (scoped channels, server-only publish) on our own transport |
| Rate limits per address for lookups, per-bucket limits for SMS | Planned (task) | T7.10, T7.15 | Adopted for the customer tracking page and any SMS we send |
| AI copilot with tool-call grounding, preview-confirm-apply, full audit log, golden-case eval | Planned (task) | T7.5, T7.6 | Adopt the discipline wholesale: our assistant is driver-facing and on-device first |
| Natural-language order creation in the console | Better | T7.4 | We do it at the driver's lips, against the NZ address engine, with a spoken correction report |
| Public tracking page with a one-time code | Planned (task) | T7.10 | Adopted: coarse status from the number, details after the code |
| Operator console breadth (30+ modules) | Skip (reason) | — | Out of proportion to a one-driver business; our console is narrow by design |
| Default routing that sends stop coordinates to public demo servers | Skip (reason) | — | Deliberately rejected: coordinates never leave our infrastructure unless the driver opts in (R-FB-30) |

## C. Gaps the studied platform exposes in **us** (things we must not inherit)

| Studied defect / complaint | Our obligation | Task |
|---|---|---|
| Accept/dismiss buttons remain after the order was accepted | Offers disappear permanently once accepted or declined (R-FB-09) | T7.2 |
| POD photo upload returns a server error; console does not render the uploaded photo | Capture → queue → retry → ack, sealed and downloadable (R-FB-11, R-FB-14, R-FB-15) | T7.9 |
| No way to download the proof | Day bundle export, on device and on the web (R-FB-14) | T7.9 |
| Driver cannot tell which vehicle is assigned | Vehicle confirmation spoken at shift start | T7.7 |
| No confirmation that the passenger boarded before the run starts | Our analogue is a spoken "start run?" confirmation with a 10-second undo | T7.7 |
| No list of active runs with per-stop status for dispatchers | Route/stop overview, colour-coded (R-FB-21) | T7.12 |
| No driver availability in the assignment dropdown | Availability shown at a glance (R-FB-22) | T7.12 |
| Cannot clone a delivery to several future days | Clone to future dates (R-FB-23) | T7.2 |
| Per-place rules tab is an empty placeholder | Door memory, learned and spoken (R-FB-19) | T7.3 |
| Undocumented required configuration keys; installs fail late | Preflight check naming every missing value (R-FB-32) | T7.15 |
| Bundled optimisation engines not wired into settings | Every engine we ship is exercised by a benchmark before release | T7.2 |
| Half-finished translations | Languages we ship are complete (R-FB-33) | T7.15 |
| Cold starts and slow page loads in the console | Our web console budgets its load time; the driver app never waits on it | T7.12 |
| Coordinates sent to third-party routing by default | Self-hosted routing, audited (R-FB-30) | T7.5, T7.15 |

## D. API behaviour we adopt, reject, or reshape

| Observed API behaviour | Decision | Task | Reason |
|---|---|---|---|
| Server returns the list of transitions a stop may take, with labels and descriptions | Planned (task) | T7.2 | Adopted: the server owns the state machine, the app renders what it is told |
| Server returns a live tracker payload with progress percentage, current/next destination, distance, start time, current ETA and estimated completion | Planned (task) | T7.12 | Adopted, and reshaped for a voice-first driver: the same numbers are spoken, not only drawn |
| Server returns per-leg distance and duration for a planned route | Planned (task) | T7.2 | Adopted; our ETA is computed from our own engine and our own rules |
| Server returns a distance-and-time matrix for arbitrary origin/destination pairs | Skip (reason) | — | A matrix API is a dispatcher tool; the driver needs the one route in front of them |
| Server exposes a route-optimisation endpoint that rewrites a stop sequence | Planned (task) | T7.2 | Adopted, with a hard constraint set and an explained diff |
| Server exposes a "commit the plan" step that turns a draft plan into assigned work | Planned (task) | T7.14 | Adopted in spirit — a plan is a draft until the driver or dispatcher confirms it |
| Server accepts a position update that carries coordinates, heading, speed, altitude, motion state and battery state | Planned (task) | T7.1 | Adopted verbatim in substance: a fix without its battery state is unexplainable |
| Server accepts an online/offline toggle that gates position reporting | Planned (task) | T7.1 | Adopted, but scoped to a shift, not to the whole day (R-NA-23) |
| Server accepts a proof capture in three shapes: photo, signature, scanned code | Planned (task) | T7.9 | Adopted, per stop rather than per order (R-NA-18) |
| Server returns the proofs attached to an order, a stop or a parcel | Planned (task) | T7.9 | Adopted |
| Server exposes bulk order create / read / update / delete with filters and sorting | Planned (task) | T7.13 | Adopted for our public API, but read-only for drivers by default |
| Server exposes an import endpoint that accepts a spreadsheet | Planned (task) | T7.4 | Adopted; the mapping is inferred by the assistant, not configured by hand |
| Server exposes a search endpoint across the address book | Planned (task) | T4 | Adopted, biased to the driver's own area and merged with door memory |
| Server exposes a public tracking-number lookup | Planned (task) | T7.10 | Adopted with the one-time-code unlock and a per-address rate limit |
| Server exposes a public order-tracking endpoint | Planned (task) | T7.10 | Adopted, coarse status only without the code |
| Server exposes a customer-reported-problem endpoint | Planned (task) | T7.10 | Adopted; the report becomes a stop note for the driver |
| Server exposes a socket token endpoint and scoped channel authorisation | Planned (task) | T7.1 | Adopted: short-lived token, scoped channels, server-only publish |
| Server exposes a webhook endpoint for third-party telematics | Skip (reason) | — | We have no telematics; our integrations are client order feeds (T7.14) |
| Server exposes service-rate and service-quote endpoints | Skip (reason) | — | Pricing is a dispatcher/ledger concern (T7.13), not a driver-app endpoint |
| Server exposes an inspection-submission endpoint with forms and results | Skip (reason) | — | A fleet-owner workflow; an independent courier has no DVIR to file |
| Server exposes a fuel-transaction matching endpoint | Skip (reason) | — | Same reason; we do not integrate fuel cards |

## E. Error handling and edge cases we must handle

| Observed or implied edge case | Our rule | Task |
|---|---|---|
| The transition the app wanted is no longer allowed (the server changed its mind) | Re-fetch the allowed list, tell the driver in one sentence, keep the stop open | T7.2 |
| A proof capture succeeded locally but the upload failed | Keep the local copy, retry in the background, show the driver "saved on your phone" | T7.9 |
| A photo is captured but the storage link or the object store is unreachable | Queue it, mark the stop "proof pending", never silently drop the proof | T7.9 |
| The order was completed by a dispatcher while the driver was on the screen | Close the screen with one spoken sentence; do not leave a stale button | T7.9 |
| The driver accepted an offer and the assignment was cancelled in between | Release the offer, say so once, and remove it from the list | T7.2 |
| The driver is more than a short distance from the stop and says "delivered" | Ask once, then record the position with the outcome so the dispatcher can see it | T7.9 |
| The network drops mid-shift | Continue the whole shift locally; show a single persistent "offline" marker; reconcile on return | T7.1 |
| The socket token expires mid-shift | Re-mint silently and resubscribe; if that fails, fall back to polling | T7.1 |
| The device is out of storage | Warn before the shift starts, not during it; refuse new captures rather than corrupting existing ones | T7.15 |
| The device clock is wrong | Prefer the server's time for ordering events; keep the device time only as a hint | T7.1 |
| The address resolves to two streets with the same name | Ask one question with two options; do not pick silently | T4 |
| The address has no matching street number in the official data | Say the number was not found and offer the nearest one; never invent a street | T4 |
| An address is outside the driver's working area | Flag it and ask once; allow it if the driver confirms | T4 |

## F. Data we must carry on a stop, and where it comes from

| Field on a stop | Source | Status | Task |
|---|---|---|---|
| Address as the driver said it | Voice or scan | Planned (task) | T7.4, T7.8 |
| Address as we corrected it | D8 engine against the official address data | Planned (task) | T4 |
| Confidence in the address | D8 engine | Planned (task) | T4 |
| Official address identifier | The official address register | Planned (task) | T4 |
| Position of the door (separate from the street point) | Learned from the driver | Planned (task) | T7.3 |
| Door note (gate code, dog, side door, safe place) | Learned from the driver | Planned (task) | T7.3 |
| Parcel count and parcel labels | Scan or dictation | Planned (task) | T7.8 |
| Order in the run | Optimiser | Planned (task) | T7.2 |
| Arrival window start and end | Dispatcher or natural language | Planned (task) | T7.2 |
| Service time | Optimiser, learned from actual dwell | Planned (task) | T7.2 |
| Stop state | Our state machine | Planned (task) | T7.2 |
| Outcome and outcome reason | Driver, spoken | Planned (task) | T7.9 |
| Proofs (photo, signature, code) and their geo-time | Driver | Planned (task) | T7.9 |
| Event history | Append-only, local first | Planned (task) | T7.1 |
| Deferred-to flag | Driver or rule | Planned (task) | T7.9 |
| Client the stop belongs to | Client integration | Planned (task) | T7.14 |
