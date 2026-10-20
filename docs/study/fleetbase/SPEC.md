# SPEC — Requirements distilled from the Fleetbase platform study

**Studied:** `fleetbase/fleetbase` (AGPL-3.0, dual-licensed) and its first-party extensions
(`fleetops`, `fleetops-data`, `ai`, `iam-engine`, `core-api`, `ledger`, `pallet`, `storefront`).
**Our product:** Courier Copilot — the **driver-side** app: voice-first, offline-first, for
independent NZ couriers (`docs/PRODUCT_SPEC.md`, `docs/PARITY.md`, `docs/KICKOFF_V3_EN.md`).

> **Clean-room statement.** This document describes *behaviour we observed*, in our own words, and
> restates it as requirements **for our product**. No code, identifiers, schemas, assets or source
> sentences are reproduced here. Every requirement below is ours. Anything we could not confirm is
> marked **UNVERIFIED**.

---

## 1. What the studied platform does (behaviour summary)

A modular, self-hostable logistics operating system in three runnable pieces: a web **console** for
operators, a **REST + real-time API**, and a **socket server** for live push. Everything else is an
installable extension. First-party modules observed: Fleet-Ops (orders, dispatch, drivers,
vehicles, fleets, live tracking, route optimisation, configurable order lifecycles, scheduler,
telematics, maintenance); Storefront (headless catalogue, checkout, customer accounts, order
creation into Fleet-Ops); Pallet (warehouse pick lists, cycle counts, fulfilment — in development
at time of study); Ledger (invoicing, wallets, payments, accounting reports, gateways); AI
(natural-language operator copilot with preview-then-confirm actions and a full audit trail); IAM
(users, groups, roles, policies, two-factor, per-organisation scoping); and a developer console
(API keys for test and live, webhooks, socket and system events, request logs).

### 1.1 The order model (behaviour, not schema)

- An **order** carries a **payload**: an optional pickup address, an optional dropoff address, an
  ordered list of intermediate **stops**, an optional return point, and a set of **parcels**, each
  optionally bound to a specific stop. It also has a human **tracking number** plus a rendered **QR
  image** and **barcode image**.
- An **order type** owns a **lifecycle graph**. Each state carries a code, a human label, a
  description, a colour, the states it may transition to, whether completing it completes the whole
  order, and whether it demands proof of delivery and by which mode (scan / photo / signature). The
  out-of-the-box lifecycle is *created, dispatched, started, en route, completed*, with
  **cancelled** as an exit.
- **Per stop**: a status, an ordering index, an optional time window (start/end), an optional
  service time, notes, and its own proof requirement and proof mode. **Per company**: optional
  **custom fields** on orders, stored per order and rendered generically in the UI.
- Supporting records: drivers, vehicles, trailers, fleets (a named group of drivers and vehicles),
  equipment and parts, contacts / customers / vendors, places, **zones** (polygon areas) and
  **service areas** (radius areas), a per-order **activity history**, and **proofs**
  (photo / signature / scan) attachable to an order, a stop, or a parcel.
- A **manifest** is a committed route plan for one driver + one vehicle: ordered stops, each with
  its own status (pending / arrived / completed / skipped), estimated and actual arrival, and
  per-leg distance and duration. It auto-completes when no stop remains open.
- **Recurring order schedules** use a recurrence rule to materialise orders ahead of time from a
  template payload, with a materialisation horizon. Pricing side: service rates, service quotes,
  purchase rates, transactions, invoices, wallets.

### 1.2 Dispatch behaviour

- **Order board**: a Kanban view where orders move through lifecycle stages. **Live operations**:
  a map showing active and unassigned orders beside the fleet.
- **Orchestrator workbench**: allocate vehicles and drivers, batch-assign orders, plan and schedule
  routes, then **commit**. Committing produces manifests and optimised stop sequences.
- **Scheduler**: driver shifts, fleet schedule, availability, hours-of-service status.
- **Order-type designer**: a visual flow editor with branching, per-state **conditions**
  (field / operator / value combined with AND / OR / NOT / IF logic) and **events** fired on entry.
- **Zones & service areas** with an event log and a **dwell report** (time spent inside an area).
- **Telematics** connectors for several third-party fleet-tracking vendors, plus a device registry.
- **Maintenance**: inspection forms (driver-facing DVIR), submissions with pass/fail items, work
  orders, maintenance schedules, part stock levels.
- **Radar**: a "what needs a decision today" agenda computed from rules (overdue maintenance, late
  shift start, shift handover with orders still on the driver, licence expiring, vehicle without a
  driver, unmatched fuel transaction, low part stock …) with snooze / acknowledge / assign.
- **Analytics**: on-time delivery, fuel efficiency, revenue trend, top drivers, orders by status,
  live fleet counts.
- **Public tracking page**: a tracking number gives a coarse status; a **one-time code** sent to the
  customer's own contact unlocks their stops, ETA, proof, and a way to report a problem.

### 1.3 API & real-time behaviour

Two surfaces: a **public consumer API** keyed by an API key, and an **internal API** guarded by a
console session. Driver-facing operations exposed: order listing by date / status / assignment /
proximity; starting an order; **asking which lifecycle transitions are currently allowed**;
applying a transition (optionally with proof); completing; cancelling; changing the current
destination; capturing signature / QR / photo proof; reading proofs; reading a distance-and-time
matrix; reading a live tracker payload and per-stop ETAs; posting the driver's own position;
toggling the driver online/offline state; switching organisation; reading the driver's manifest for
the day. **Realtime**: clients subscribe to channels (per user, per driver, per order, per company);
subscriptions are authorised by a short-lived signed token; clients may **not** publish — only the
server publishes; denials are logged and can be refused in strict mode. **Guard rails observed**:
separate throttles for SMS sends, tracking-number lookups and inspection uploads; forced-JSON
responses on some routes so a validation refusal returns a structured error rather than a redirect;
consistent 404 / 422 error bodies.

### 1.4 AI copilot behaviour

A global prompt in the console; persistent sessions; markdown rendering; attachments. Answers are
**grounded by tool calls**: documentation search, record counting / grouping / listing scoped to the
organisation and the caller's permissions, and proposals to open a console page or dialog — the
latter always behind an explicit **confirmation card**, with permissions re-checked at the moment of
confirmation. Fleet-Ops capabilities observed: **create an order from a natural-language prompt**
(parses a pickup/dropoff pair, resolves addresses against the address book, detects a request for
proof and a scheduled time), **order insights** (bounded counts by status over a date window and an
amount threshold), **preview a route re-sequencing**, search resources, documentation help, asset
status. Every turn, tool call, argument and result is **recorded** and reviewable; answers can be
rated; a golden-case evaluation suite measures pass rate; a replay command re-runs a recorded turn.

---

## 2. People and their pain points (issue tracker and discussions)

- **Getting it running dominates the tracker**: docker-compose failures, a missing encryption key, an
  unnamed required environment variable, a CLI that leaves a half-installed instance, and a README
  that omits keys the app actually needs (map key, socket host, push keys). Several issues are
  "the Android build crashes on start" or "the map is blank beige on the device".
- **Dispatcher-facing**: no visual list of active routes with per-stop status (an open issue asking
  for on-time / delayed / not-visited colour coding); no driver-availability indicator in the
  assignment dropdown; no way to clone a delivery to several future days; a **place-level "rules"
  tab that is only a placeholder**.
- **Driver-facing**: the accept/dismiss buttons never disappear after acceptance, which "is
  needlessly confusing for drivers and dispatchers"; proof-of-delivery photo upload fails with a
  server error (twice reported) and the console then does not render the uploaded photos; no way to
  download the proof once an order is finished; the driver cannot see which vehicle is assigned and
  "has to contact dispatch"; no confirmation that the passenger boarded before a ride starts, which
  "leads to potential disputes".
- **Privacy**: by default, routing requests send pickup and dropoff coordinates to public
  third-party demo servers, which "are often customers' home addresses", with nothing telling the
  operator their addresses leave the installation. **This one matters to us.**
- **Requests we must respect**: Spanish, French and Arabic translations (repeated for years); a
  km/miles toggle; driver wallet payout visibility; geofencing for deviation and dwell.
- **What to avoid repeating**: optimisation engines bundled but **not actually wired into the
  settings** (users saw only two of four options in the routing dropdown); a route/leg-distance
  panel that was slow to start; cold-start page loads in a multi-instance deployment.

---

## 3. Our requirements (Fleetbase-derived)

Each row is a requirement on **our** product. `AC` = acceptance criterion.

### 3.1 Order & day-list model (drives T7.1, T7.2, T7.4)
- **R-FB-01** A *stop* is our atom, not a parcel. Every stop has an address, a corrected address,
  an expected arrival window, a dwell/service time, an order in the run, a state, and a note.
  **AC:** a stop round-trips through the local database, the sync engine and the API with all seven
  fields intact and none silently dropped.
- **R-FB-02** A stop's state machine is ours, not a tenant-configurable graph. Fixed states:
  *planned, en route, arrived, then delivered, skipped or failed*, plus *deferred to tomorrow*.
  **AC:** illegal transitions are rejected by the server with a 422 and by the local engine with a
  spoken error; there is no tenant-editable lifecycle.
- **R-FB-03** Parcels are optional and belong to a stop; each carries a label image, a barcode
  value, size and weight. **AC:** scanning a parcel barcode resolves to its stop and announces it.
- **R-FB-04** Every stop keeps an append-only event history (created, corrected, arrived,
  attempted, delivered, note changed) that survives a sync conflict. **AC:** history replays in
  order for any stop without gaps.
- **R-FB-05** A *day list* is a first-class object: a named run of stops with a date, its own
  ordering and its own rules. **AC:** the same day list rebuilt from a template produces an
  identical stop ordering, asserted by test.

### 3.2 Dispatch, assignment and lifecycle (drives T7.2, T7.12, T7.14)
- **R-FB-06** The *server* decides the allowed next transitions for a stop and returns them with a
  display label and a short description; the app renders exactly what the server returned.
  **AC:** the app never invents a transition; one the server did not offer is unavailable in the UI
  and rejected if attempted.
- **R-FB-07** Multi-stop runs are optimised **server-side** (constraint solver + travel-time engine)
  with per-stop time windows, priorities, pickup/delivery pairing, a vehicle profile and a
  start/end point. **AC:** optimisation of a 200-stop day list completes under 10 s and honours
  every hard constraint; an infeasible run returns the reason, not a broken route.
- **R-FB-08** Rules are **structured data**, not prose, and are editable by voice ("school before
  9am", "Harewood Road after 3pm", "odd house numbers first", "heavy parcels last"). **AC:** a
  spoken rule is parsed into a typed rule, read back for confirmation, and then applied by the
  optimiser — not by the assistant.
- **R-FB-09** The driver can be **offered unassigned work near them** and can accept or decline it.
  **AC:** once accepted or declined the offer controls are gone for that stop and cannot be
  re-shown; a pre-assigned stop never shows them at all. (Fixes the studied defect directly.)
- **R-FB-10** A **run plan** records the ordered stops for a driver and vehicle with per-leg
  distance and duration, and auto-completes when nothing is left open. **AC:** a completed run's
  totals match the sum of its legs.

### 3.3 Proof of delivery & outcomes (drives T7.9)
- **R-FB-11** Three proof modes: **photo**, **on-screen signature**, **code/QR scan**; chosen per
  stop by our dispatcher or defaulted to photo. **AC:** each produces a proof record linked to the
  stop, retrievable on the phone with **no network** and uploaded later.
- **R-FB-12** A proof carries geo-time, capture time and the captured media, and is **immutable
  once sealed**. **AC:** a sealed proof cannot be edited; a correction is a new proof with a
  stated reason.
- **R-FB-13** An outcome is one of delivered / left-at / skipped / failed, each with an optional
  spoken reason recorded against the stop. **AC:** the reason can be dictated in one breath; the app
  proposes the matching reason code and confirms it.
- **R-FB-14** Proofs must be **downloadable** by the driver (a PDF bundle of the day) and by the
  dispatcher. **AC:** the driver's day bundle exports on device and in the web app.
- **R-FB-15** Proof upload must survive a flaky network: capture, local queue, upload with retry,
  server ack, local delete. **AC:** with the network off for 10 minutes, three captured photos
  survive an app restart and all three appear after reconnecting, with no duplicates.

### 3.4 Live tracking, geofencing and safety (drives T7.1, T7.3, T7.7)
- **R-FB-16** The app reports its position on a **battery-aware adaptive schedule**, only while the
  driver is on shift; never when off shift. **AC:** 8 % battery or less per hour over a measured
  shift; zero uploads when the shift flag is off.
- **R-FB-17** Arrival is detected by **geofence**, and the trigger produces a **spoken whisper**
  with the door note and the parcel location — not a screen change. **AC:** entering the arrival
  radius while driving produces the whisper with no touch input, within 2 s.
- **R-FB-18** Position history is retained as a **GPS trace** and is the source for the mileage
  logbook and the day's distance. **AC:** the trace for a shift reconstructs the distance within
  2 % of the engine's own figure.

### 3.5 Customer-facing (drives T7.10)
- **R-FB-19** A customer sees a coarse status from a tracking number alone, and their full stop
  list only after entering a **one-time code**. **AC:** an unauthenticated lookup returns status
  only and is rate-limited per address; a code cannot be brute-forced.
- **R-FB-20** A customer can report a problem from the tracking page and leave instructions for the
  driver. **AC:** the instructions reach the driver's stop note on the next sync.

### 3.6 Operations console for our teams (drives T7.12, T7.14)
- **R-FB-21** A **route/stop overview**: every active run in a list with per-stop status colour
  coded (on time, delayed, not visited). **AC:** a dispatcher can answer "which run is behind?"
  without opening a detail page.
- **R-FB-22** A **driver availability indicator** in every assignment dropdown. **AC:** the driver
  list shows on-shift / off-shift / on-break at a glance.
- **R-FB-23** **Repeat deliveries**: a delivery can be cloned to several future dates. **AC:** the
  clone carries addresses, parcels and rules; each occurrence is independently editable.
- **R-FB-24** A **recurring schedule** with a recurrence rule, a horizon and a template.
  **AC:** occurrences materialise ahead of the horizon and are idempotent on re-run.
- **R-FB-25** A **decision agenda** for the operator: the exceptions needing a human today (expired
  licence, vehicle without driver, unassigned run, unmatched expense, a stop failed twice).
  **AC:** every item carries severity, a due bucket and an action; snooze is honoured.

### 3.7 Our AI layer (drives T7.4, T7.5, T7.6)
- **R-FB-26** We borrow the **preview, confirm, apply** discipline for every assistant action: the
  assistant shows what it would do, the driver confirms, the action runs, the run is recorded.
  **AC:** no assistant action mutates state without a recorded confirmation, and silence cancels.
- **R-FB-27** The assistant **creates an order from a natural-language sentence** — against **our**
  address engine, which validates against the LINZ ground truth and states what it changed.
  **AC:** "deliver 14 Harewood Road then 22B Main North" produces two stops, one flagged for
  confirmation because the street is ambiguous.
- **R-FB-28** The assistant answers **bounded operational questions** ("how many did I deliver last
  week?", "how much did I earn on Tuesday?"). **AC:** the answer names the window and scope it used
  and never invents a figure outside that scope.
- **R-FB-29** Every assistant turn is logged with its tool calls, and the log is readable by the
  driver. **AC:** a driver can ask "what did you change and why?" and get a list.

### 3.8 Privacy, hosting and cost (drives T7.5, T7.15)
- **R-FB-30** **No stop coordinate leaves our infrastructure unless the driver turned a feature
  on.** Routing, geocoding and traffic run on our own server or on the device. **AC:** an outbound
  audit shows zero third-party routing/geo calls in the default configuration, and the app is
  fully usable with every external endpoint blocked.
- **R-FB-31** **No proof-of-delivery and no audio leaves the device by default.** **AC:** in
  airplane mode for a whole shift, the assistant still completes "delivered", the stop closes, and
  the proof is queued.
- **R-FB-32** **Self-hosting is a first-class path** with a documented, reproducible install and a
  **preflight check** naming every missing configuration value before the install starts.
  **AC:** the preflight fails with a named list, not a stack trace; a clean install on a clean
  machine succeeds from the documented steps alone.
- **R-FB-33** **Multi-language from day one**, with the driver's language driving the assistant's
  voice. **AC:** every language we ship is complete — no half-translated screens.

---

## 4. How we will do it better (our differentiators)

| Studied platform | Ours | Why it matters to a NZ independent courier |
|---|---|---|
| Everything is a tap; the driver must look at the screen | Voice-first; the screen only confirms what the assistant understood | The most-reported UX defect we found is a state confusion a single spoken answer removes |
| Address strings are free text; resolution is loose | Deterministic NZ address engine against the LINZ ground truth, with a spoken "you said X, corrected to Y" and a question only when genuinely ambiguous | NZ street, rural-road and suburb spellings are a top source of failed deliveries |
| Per-address rules are a placeholder tab | **Door memory**: learned per address (gate code, dog, side door, safe place) and read aloud on arrival | Nothing in the market stores *where the door actually is* |
| The optimiser is server-side and opaque | The driver's own rules win; the assistant explains but never invents the order | Independent couriers know their round better than any algorithm |
| The driver app needs the network for every write | Event-log sync: every driving-day action works offline | Dead-zone coverage in Christchurch is a daily reality |
| Routing defaults leak customer addresses to public demo servers | Self-hosted routing; coordinates never leave | NZ Privacy Act 2020 exposure is our liability |
| Proof capture breaks on flaky uploads | Local capture, queue, retry, ack | A lost POD is a lost payment |
| Console and driver app are separate products with separate state | One order model, one event log, one source of truth | Our counters (delivered / deferred / failed) must match the invoice |
| One shared lifecycle graph for every tenant | One fixed, ours, with per-stop proof modes | A courier needs "delivered", not a state machine |

---

## 5. Explicitly not adopting

- **Tenant-configurable lifecycle graphs.** A single courier does not need a flow designer; it only
  adds an unsupported state to the UI. Skip — our states are fixed and ours (R-FB-02).
- **A warehousing module.** We are a driver app; a warehouse is a different buyer. Skip — no
  pick-list, cycle-count or fulfilment surface.
- **A public catalogue and checkout.** We are not a shop. Skip — multi-client order intake arrives
  through a client integration (T7.14), not through a storefront.
- **Accounting, wallets, gateways.** A courier's books are a separate product (T7.11 / T7.12 cover
  the driver-visible slice). Skip — no general ledger, no gateway console.
- **Telematics vendor integrations.** Our users drive their own vans; they do not carry third-party
  trackers. Skip — the phone is the tracker (R-FB-16).

---

## 6. Not verified / open

- **UNVERIFIED** — the shipping behaviour of the driver's *assigned vehicle* prompt, the *passenger
  one-time-code before starting*, and the *route overview list*: these exist as open feature
  requests in the studied tracker, not as shipped behaviour.
- **UNVERIFIED** — which optimisation engines are actually active by default (one user saw only two
  of four options in the routing dropdown); we could not run the console to confirm.
- **UNVERIFIED** — the exact behaviour of the third-party tracking and fuel-card providers; only
  their interfaces and admin surfaces were read.
- **UNVERIFIED** — the console's cold-start and page-load behaviour under load (reported in a
  discussion; not measurable here).
- **UNVERIFIED** — the commercial-licence terms of the studied platform; we relied on the
  repository's licence files only, and our own licence posture is separate (`docs/LICENSES.md`).
- **Open** — whether our console lives in `apps/web` (T7.12) or stays deliberately minimal; the
  studied platform's console breadth is out of proportion to our users.
