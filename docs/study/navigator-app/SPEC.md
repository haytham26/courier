# SPEC — Requirements distilled from the Fleetbase Navigator (driver app) study

**Project studied:** `fleetbase/navigator-app` (AGPL-3.0) — the white-label driver app shipped by the
Fleetbase platform, React Native + Tamagui, iOS and Android.
**Our product:** Courier Copilot — the **driver-side** app: voice-first, offline-first, for independent
NZ couriers (`docs/PRODUCT_SPEC.md`, `docs/PARITY.md`, `docs/KICKOFF_V3_EN.md`).

> **Clean-room statement.** Everything below is written in our own words as requirements **for our
> product**. No code, no identifiers, no schemas, no assets, no copied sentences. Behaviour is
> described, never implementation. Anything we could not confirm is marked **UNVERIFIED**.

---

## 1. What the studied driver app does (behaviour summary)

### 1.1 Shape of the app

1. **Boot** → the app checks its configuration and refuses to start with a named list of missing
   values rather than a crash.
2. **Location permission** → a plain-language disclosure of what is collected and why, then the OS
   prompt; if the permission was blocked, the app sends the driver to Settings.
3. **Connect to a console** → the app can be pointed at a different server (deep link or manual
   entry), so one binary serves many operators.
4. **Sign in** → password, phone + one-time code, or a provider sign-in; organisations can be
   switched; there is a self-service signup path.
5. **Five tabs**, and *which* tabs exist is decided by the operator: **Dashboard, Orders, Reports,
   Chat, Account**. Tab icons and labels are also configurable.

### 1.2 Dashboard

Shows whether position reporting is on, the live latitude / longitude / heading / altitude, the
number of active orders (animated counter), and the current speed. An **Online/Offline switch**
lives in the header on every screen and gates everything that reports the driver's position.

### 1.3 Orders tab (the day list)

- A **horizontal date strip** with dots on days that have active orders; today ± 2 days reachable,
  the rest of the year scrollable, weeks of 5 days.
- A **day header**: weekday, number of orders, number of stops left, planned duration, planned
  distance.
- The **list** is the union of two things: *unassigned work offered nearby* and *today's assigned
  work*. Nearby offers appear first, each with **Accept** and **Dismiss** buttons.
- **Refresh** is pull-to-refresh plus a background timer (about 5 minutes for nearby offers, about
  15 minutes for the day list). **Realtime**: the app subscribes to the driver's own channel and
  reloads the list when an order is announced as ready or pinged; a push notification about an
  order also triggers a reload. Accepted or declined offers stay dismissed for the session.

### 1.4 Order screen

A map of the route with the current destination focused, the tracking number and a QR image in a
header band, and a status badge. Action buttons are contextual: **Start order**, **Update
activity**, **Start navigation**. A **current-destination selector** lets the driver choose which
stop they are heading to. Below that, stacked sections:

| Section | Content |
|---|---|
| Order information | Internal id, tracking number, proof method, type, created / scheduled / dispatched timestamps, plus any operator-defined custom fields |
| Order route | Ordered stop list; beyond two middle stops it collapses behind a "N more stops" strip; completed stops are struck through; each stop's phone number is tappable |
| Order progress | Progress bar, current and next destination, total distance, start time, current ETA, estimated completion time |
| Order notes | Free text from the dispatcher |
| Order proof | Grid of captured proofs (photo, signature, scan) with a full-screen viewer |
| Order payload | The parcels on the order; tapping one opens its photo, QR, barcode, SKU, type, dimensions and weight |
| Customer, files, comments | Recipient name / phone / email; attached documents; a comment thread on the order |

### 1.5 The activity model (the important bit)

The app **never decides what the next step is**. It asks the server which transitions are
currently allowed, and the server answers with a list; each entry carries a display label, a
description, a colour, and possibly a **"proof of delivery required"** warning. The app renders
those as coloured cards in a bottom sheet. Choosing one:

- if it requires proof → the app first opens the capture screen (scan / photo / signature);
- on success → the transition is applied, a toast confirms the new status;
- if the transition moved the current destination → a modal names the old address and the new one.

Guard rails the app honours: an order that has not been dispatched cannot be started without an
explicit confirmation (with a "continue anyway" path); a completed order refuses further
transitions; the server refuses to complete a multi-stop order until every stop is done.

### 1.6 Proof of delivery

Three capture modes, chosen by the operator per order: **QR/code scan** (a scan cooldown prevents
double reads), **photo** (the camera; images are resized before upload; several can be captured at
once), and **on-screen signature** (a webview canvas). Uploads are multipart for photos. Every
failure surfaces as a toast carrying the server's message. Captured proofs appear immediately in
the order's proof grid.

### 1.7 Navigation

There is **no in-app turn-by-turn**. The app lists the navigation apps installed on the device and
hands off to the chosen one with the destination's coordinates and its name.

### 1.8 Position reporting

A commercial background-location service is configured with high accuracy, a 10 m movement filter,
"keep running after the app is closed" and "start after a device restart". The position is posted
straight to the platform's driver endpoint with the driver's bearer token and a fixed body:
coordinates, heading, speed, altitude, timestamp, the detected motion type, whether the driver is
moving, and the battery level and charging state. A separate periodic background fetch also posts
a position every few minutes; movement-change events update the local store. Tracking only runs
while the driver is online and the permission is granted, and the permission is re-checked when the
app returns to the foreground.

### 1.9 Local state and offline behaviour

A fast key-value store holds the order lists per driver and per date, the tracker and ETA payloads
per order, the proofs, the issues, the fuel reports, the last known position, and the dismissed
offers. Tracker and ETA reads are cached for five minutes with duplicate-request suppression, and
the cache is invalidated when the order's status changes.

**Crucially: this is a cache, not an offline write path.** Every state change — starting,
transitioning, capturing proof — is a network call. With no connection the driver can read the
last known day list but cannot change anything.

### 1.10 Other screens

- **Reports**: two lists — driver-raised **issues** (type, category, priority, vehicle, status,
  free-text report) and **fuel reports** (odometer, volume, unit, cost, currency, vehicle). Both
  are created from the phone and tracked with a status badge.
- **Chat**: channels with the operations team, participant lists, attachments and an unread badge.
- **Account**: profile photo (camera / library / remove), email, phone and name editing, language,
  colour scheme, terms, privacy policy, **clear cache**, sign out, and the app version and build
  number.

### 1.11 Operator-side knobs the app honours

Theme, the set of tabs, the default tab, the default locale, the login background colour, tab
labels and tab icons, and the **driver onboarding** policy (invite by link vs. onboard inside the
app; which documents the driver must supply).

### 1.12 Security posture worth copying

The project's own install notes state that anything placed in the environment file is compiled into
the app and is readable inside the shipped APK/IPA, and that release signing credentials must be
read from a gitignored file or from environment variables instead. Position uploads carry a
short-lived bearer token.

---

## 2. People and their pain points (from the issue tracker)

The tracker of the studied driver app is small and mostly about **running the app**, not about
logistics. The recurring themes:

1. **It will not start.** Crash-on-launch reports with several distinct causes: a native-module
   version mismatch, an invalid public key handed to the platform SDK, a social-login SDK not
   initialised, a Hermes engine error. Each one is a build-configuration trap, not a logic bug.
2. **The documented install is incomplete.** Reporters list keys the app needs that the guide does
   not mention (map key, socket host, push credentials, a `google-services.json` for Android), plus
   a patched dependency and a manual native-library swap that "shouldn't be necessary".
3. **The map is blank on a real device.** An Android report of an empty beige map where only the
   provider logo renders — pointing at the map key's billing activation, its package restriction
   and its signing-certificate restriction.
4. **The accept / dismiss buttons never go away.** After accepting an offer, the buttons stay on
   screen and stay tappable for the whole delivery, including after completion. The reporter calls
   it "needlessly confusing for drivers and dispatchers" and notes that a pre-assigned order
   should never show them at all.
5. **Proof photos are not good enough and not adjustable.** The capture size and compression are
   hard-coded in the source; the request is for an operator-configurable setting with no rebuild.
6. **Only one language ships.** Spanish is requested; the app has one translation file.
7. **The driver cannot see their money.** A request to view a driver wallet and payouts in the app.
8. **Platform friction.** Requests for a Flutter build, Windows support, and a macOS/Linux path.

What is *not* complained about: the activity/step model, the stop list, the waypoint list, the
progress and ETA display, the proof grid, the chat. The studied app's information architecture is
sound. **We adopt that information architecture and rebuild the interaction model on top of it.**

---

## 3. Our requirements (Navigator-derived)

`AC` = acceptance criterion. Task ids are ours (`docs/KICKOFF_V3_EN.md`).

### 3.1 Screens and navigation (drives T7.6, T7.7)

- **R-NA-01** Our driver shell has four surfaces, and only four: **Today** (the day list and the
  current stop), **Driving** (map + current stop card, reachable from Today), **History**, and
  **Me** (account, settings, help). **AC:** from any surface, the current stop is reachable in one
  action; no screen is more than two actions from "mark delivered".
- **R-NA-02** The **Today** surface is a list, not a dashboard: the day's stops in order, each with
  the address, the order in the run, an expected arrival, a state badge and a one-line note.
  **AC:** 300 stops scroll smoothly; the current stop is pinned and always visible.
- **R-NA-03** The **driving surface** is a map plus a stop card, and the stop card shows the
  stop number at display size, the street, the door note and the assistant bar. **AC:** the card is
  legible at arm's length in daylight and at night (T6 mockups).
- **R-NA-04** The **state of a stop is always visible and always consistent** — the same state
  appears in the list, on the card, in the assistant's phrasing and in the synced record.
  **AC:** a property test asserts that the four views never disagree.
- **R-NA-05** The **Me** surface holds profile, language, units, navigation-app choice, voice
  settings, offline storage, data export, account deletion and help. **AC:** every entry is also
  reachable by voice.
- **R-NA-06** **Contextual actions only.** An action is offered only when it is legal for the
  current state; once an offer is accepted or declined it disappears and never returns for that
  stop. **AC:** after accepting an offer, no accept/decline control exists anywhere in the app
  for that stop, at any nesting depth.

### 3.2 The day list and the run (drives T7.1, T7.2, T7.4)

- **R-NA-07** The day list is a **local-first object**: it loads from the device with no network and
  is reconciled afterwards. **AC:** with the device in airplane mode, the list of yesterday, today
  and tomorrow all render.
- **R-NA-08** A **date strip** shows the days that have work and the days that do not; the driver
  can jump to any of them; the header always states the day's totals (stops, distance, time).
  **AC:** totals match the sum of the visible stops.
- **R-NA-09** **Nearby unassigned work** can be offered to a driver, and accepted or declined by
  voice or tap. **AC:** R-NA-06 holds for offers; a declined offer can be re-offered later only if
  the offer's terms changed.
- **R-NA-10** The list updates **live** when the server says it changed (websocket) and
  **periodically** as a fallback, without the driver ever pulling to refresh. **AC:** an announced
  order appears within 2 s of the server event; the fallback timer is ≤ 5 min and is disabled while
  the socket is healthy.
- **R-NA-11** A **run can be rebuilt from a saved template** in one tap, including its rules.
  **AC:** the rebuilt run's stop order and rule set match the template, and the driver is asked to
  confirm before it replaces the current run.

### 3.3 The current stop and driving mode (drives T7.3, T7.7)

- **R-NA-12** The driver can **choose which stop they are heading to**; the choice is stored and
  reflected everywhere. **AC:** changing the destination is announced and re-announced on the next
  whisper.
- **R-NA-13** **Arrival is detected by geofence** and produces a spoken whisper with the door note
  and the parcel location. **AC:** no touch input is required to receive it; it can be repeated on
  demand.
- **R-NA-14** The **assistant** performs the outcome actions — delivered, left at, skipped, failed
  — and never requires a tap when the driver speaks. **AC:** "delivered" closes the stop and the
  next stop in one utterance; the screen confirms afterwards.
- **R-NA-15** **Outcome reasons are spoken** and mapped to a typed reason. **AC:** a spoken reason
  is stored verbatim plus a typed code, and the dispatcher sees both.
- **R-NA-16** A **failed stop** is retried by default on the next day, and the driver is asked once.
  **AC:** the retried stop keeps its original notes and history.
- **R-NA-17** Navigation is a **hand-off** to the driver's chosen app, carrying the saved door
  coordinates rather than a retyped address. **AC:** the hand-off target is the door point when we
  have one, and the street pin otherwise.

### 3.4 Proof of delivery (drives T7.8, T7.9)

- **R-NA-18** Proof capture is **per stop**, not per order, and supports photo, signature and
  code/QR. **AC:** two stops on one order can carry different proofs.
- **R-NA-19** **Photo capture quality is operator-configurable without a rebuild** — resolution and
  compression are settings, not constants. **AC:** changing the setting affects the next capture
  with no app release.
- **R-NA-20** **Captured proof is visible immediately** in the stop's proof list, with its
  geo-time, the capture time and a thumbnail; the full image opens full-screen.
  **AC:** the thumbnail renders from local storage before any upload completes.
- **R-NA-21** **Capture never fails because of the network.** Photos are written to the device
  first, then uploaded with retry, and the local copy is removed only on acknowledgement.
  **AC:** R-FB-15's three-photo test passes.
- **R-NA-22** **Photo upload is the top source of support load** in the studied platform; our
  acceptance test must cover: no network, slow network, interrupted upload, duplicate upload,
  storage-full, and a rotated image. **AC:** all six cases have an automated test.

### 3.5 Location, battery and privacy (drives T7.1, T7.15)

- **R-NA-23** Position reporting is **off by default** and is opt-in per shift. **AC:** a fresh
  install uploads nothing until the driver opts in; opting out stops it within one cycle.
- **R-NA-24** Reporting is **battery-aware**: the interval adapts to motion and battery, and it
  degrades to a coarse fix on low battery. **AC:** ≤ 8 % battery per hour over a measured shift.
- **R-NA-25** The **battery and charging state travel with each fix**, so the operator can see why
  reporting changed. **AC:** every uploaded fix carries the battery level and the charging flag.
- **R-NA-26** Position **history is the driver's asset**: it is retained locally for the mileage
  logbook and can be exported. **AC:** the driver can export their own trace as a CSV/PDF.
- **R-NA-27** The app **never leaks the tenant's API secret into the binary**. **AC:** a CI check
  greps the built artefacts for every configured secret and fails the build on a hit.
- **R-NA-28** The **location disclosure text is plain and specific** — what, why, how long, and who
  can see it — and it is shown before the OS prompt. **AC:** copy reviewed against the NZ Privacy
  Act 2020 in T7.15.

### 3.6 Reliability, localisation and build hygiene (drives T7.15, T7.6)

- **R-NA-29** **The app starts on a misconfigured device with a named list of what's wrong**, and
  never a red screen. **AC:** each required value appears by name in the preflight result.
- **R-NA-30** **The install guide is the tested path**: a CI job provisions a clean machine,
  follows only the published steps, and builds a signed artefact. **AC:** the job is green and its
  log is the guide.
- **R-NA-31** **Every shipped language is complete** — no half-translated screens, no missing
  string keys. **AC:** a CI check compares the key sets of every locale against the reference
  locale and fails on a difference.
- **R-NA-32** The assistant's language is independent of the UI language: a driver can drive a
  Japanese UI in English or vice versa. **AC:** the assistant can be switched mid-shift with one
  command.
- **R-NA-33** The app **degrades rather than dies**: a missing permission, an unreachable server
  or a full disk produces a stated, actionable message and the shift continues.
  **AC:** each of the three conditions has a screen-level test.

---

## 4. How we will do it better

| Studied driver app | Ours | Why it matters |
|---|---|---|
| Every state change is a network call; offline means read-only | **Offline-first event log** — every driving-day action is local-first and reconciles later | The studied app's own product has no offline write path at all; a courier in a basement or a rural lane cannot mark anything delivered |
| Interaction is entirely by touch | **Voice-first**; the screen is confirmation | The studied app's most-reported defect (buttons that never go away) is exactly the class of problem a spoken state model removes |
| Proof capture is a modal camera flow, and upload can 500 | **Capture → queue → retry → ack**, sealed, downloadable | POD is money; a lost photo is a lost payment |
| Photo size is hard-coded in source | **Operator-configurable** resolution and compression | Direct fix for an issue filed against the studied app |
| Addresses are free text supplied by a dispatcher | **NZ address engine** validates against the LINZ ground truth and states what it changed | The app cannot fix a bad address today; ours can |
| Arrival is silent to the driver | **Geofence arrival → spoken whisper with the door note** | Turns the map into something you drive by |
| No per-address knowledge | **Door memory** | The studied app stops at the street pin, every time |
| One language, one hard-coded UI | **Multilingual UI and multilingual assistant** | Repeatedly requested against the studied app |
| The driver's money is invisible | **Day earnings, mileage, GST-ready export** | An independent contractor needs the number, not a screenshot of a dashboard |
| Button state is derived from several flags and can be wrong | **One state machine, one source of truth**, asserted by tests | R-NA-04, R-NA-06 |
| Secrets can end up compiled into the binary | **CI fails the build** if any configured secret is found in an artefact | R-NA-27 |

---

## 5. Explicitly not adopting

- **A tenant-configurable set of tabs, icons, labels and themes.** A white-label console may want it;
  a single courier does not, and it multiplies the surface we must test. Skip — one shell, one
  design system (T6), with the accent colour and the app name configurable.
- **A built-in operations chat.** We are one driver with no dispatcher. Skip — the assistant and
  the help centre (T7.12) cover it; a chat inbox is a two-sided product.
- **Fuel reports, odometer capture and maintenance.** Skip — a van's fuel card is not a courier
  product; mileage from the GPS trace (T7.11) is.
- **Connecting the app to an arbitrary console instance at runtime.** Skip — a single hosted
  service, one config, one set of secrets (R-NA-27, R-NA-29). Branding, not a multi-tenant switch.
- **A social sign-in provider in the driver app.** Skip — the driver has one account and one
  recovery path (phone + code); provider sign-in adds keys, callbacks and failure modes for no gain.

---

## 6. Not verified / open

- **UNVERIFIED** — the exact push-notification provider and payload shape; the app clearly consumes
  order-related notifications and reloads on them, but the provider contract was not read.
- **UNVERIFIED** — the size and quality of the uploaded POD image, and the exact resize behaviour;
  the issue text confirms it is hard-coded, the value was not measured.
- **UNVERIFIED** — whether the studied app can complete a multi-stop order when a middle stop
  fails; the server-side guard was read, the driver's path was not exercised.
- **UNVERIFIED** — the studied app's behaviour under a flaky network (it may have a hidden retry
  in the SDK layer); we saw only the absence of an app-level queue.
- **UNVERIFIED** — the driver-wallet request: an open feature request in the tracker, not shipped
  behaviour.
- **Open** — our decision on whether the driver's position history lives only on the device, in the
  cloud, or both, and the retention period for each. This is a Privacy Act question that T7.15
  must close, and it changes the offline/sync design in T7.1.
