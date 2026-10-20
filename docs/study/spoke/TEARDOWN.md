# Spoke teardown — Spoke Route Planner (ex-Circuit) + Spoke Dispatch (ex-Circuit for Teams)

**Role:** Competitor Analyst · **Date read:** 2026-10-21 · **Method:** public sources only (Spoke website,
help centre, product-update changelog, Apple App Store / Google Play listings and their visible reviews,
official YouTube tutorial, and third-party review mirrors). No code, assets or private API were extracted
(their terms forbid it). Spoke was studied as a normal user would.

**Why this file exists:** V4 §13.2 / MASTER_EXECUTION §2 — *"Spoke is the #1 NZ competitor."* This is the
evidence base for `BEAT-SPOKE.md` and the corrections to `docs/PARITY.md` (PARITY is owned by the CEO; this
file only states the corrections).

---

## 0. Source register

Every claim below cites a source ID. All read 2026-10-21 unless stated.

| ID | Source | URL | Notes on provenance |
|----|--------|-----|---------------------|
| S1 | Spoke Route Planner product page | https://spoke.com/route-planner | first-party |
| S2 | Spoke Route Planner pricing page (US locale) | https://spoke.com/route-planner/pricing | first-party |
| S3 | Spoke Dispatch pricing page | https://spoke.com/dispatch/pricing | first-party |
| S4 | Spoke Dispatch product page | https://spoke.com/dispatch | first-party |
| S5 | Help: "Spoke products & pricing" | https://help.spoke.com/en/articles/1925291-spoke-products-pricing | first-party, dateModified 2026-07-31 |
| S6 | Help: "Getting started with Spoke Route Planner" | https://help.spoke.com/en/articles/1086742-getting-started-with-spoke-route-planner | first-party, written 2026-08-04 |
| S7 | Help: "How to add stops and create a route" | https://routeplannerhelp.spoke.com/en/articles/9546292-how-to-add-stops-and-create-a-route | first-party, written 2026-08-17 |
| S8 | Help: "How to make changes to stops" | https://routeplannerhelp.spoke.com/en/articles/9619618-how-to-make-changes-to-stops | first-party, dateModified 2026-10-20 |
| S9 | Help: "How to make changes on a live route" | https://routeplannerhelp.spoke.com/en/articles/9630487-how-to-make-changes-on-a-live-route | first-party, dateModified 2026-10-20 |
| S10 | Help: "…Android Auto/CarPlay or when offline" | https://routeplannerhelp.spoke.com/en/articles/9626604-how-to-navigate-and-use-spoke-with-android-auto-carplay-or-when-offline | first-party, 2026-08-04 |
| S11 | Help: "route, navigation, general and subscription settings" | https://routeplannerhelp.spoke.com/en/articles/9196948-how-to-select-your-route-navigation-general-and-subscription-settings | first-party, 2026-08-04 |
| S12 | Changelog "What's new in Spoke Route Planner" | https://spoke.com/route-planner/product-updates | first-party, all entries dated |
| S13 | Apple App Store **NZ** — Spoke Route Planner | https://apps.apple.com/nz/app/spoke-route-planner/id1198232244 | first-party listing, fetched |
| S14 | Apple App Store **AU** — Spoke Route Planner | https://apps.apple.com/au/app/spoke-route-planner/id1198232244 | first-party listing, fetched |
| S15 | Apple App Store **NZ** — Spoke Dispatch | https://apps.apple.com/nz/app/spoke-dispatch/id1457736526 | search extract only (not fetched) |
| S16 | Google Play **NZ** — Spoke (Circuit) Route Planner | https://play.google.com/store/apps/details?id=com.underwood.route_optimiser&hl=en_NZ&gl=NZ | first-party listing, fetched |
| S17 | Google Play (en) — same app, larger visible review set | https://play.google.com/store/apps/details?hl=en&id=com.underwood.route_optimiser | search extract |
| S18 | Google Play — Spoke (Circuit) Dispatch | https://play.google.com/store/apps/details?hl=en_ZA&id=com.circuit.team | search extract |
| S19 | Apple App Store **AU** — Spoke Dispatch | https://apps.apple.com/au/app/spoke-dispatch/id1457736526 | search extract |
| S20 | Help: "difference between Spoke Dispatch and Spoke Route Planner" + "switch between Team and Personal profile" | https://help.spoke.com/en/articles/7262745-what-s-the-difference-between-spoke-dispatch-and-spoke-route-planner · https://help.spoke.com/en/articles/7262414-what-s-the-difference-between-spoke-route-planner-and-spoke-dispatch | search extract, article dated 2026-08-04 |
| S21 | Official YouTube tutorial "Optimize your Delivery Route in 4 Steps with Spoke Route Planner" (Spoke App channel, 2021-07-23, 916.9K views, 454 likes) | https://www.youtube.com/watch?v=vQfUCc8i8nQ | first-party video |
| S22 | Routific blog: "Spoke Dispatch Route Planner: Review and Alternatives" (2024-11-08) | https://www.routific.com/blog/circuit-for-teams-route-planner-review-and-alternatives | **competitor — biased** |
| S23 | MyWay blog: "Circuit vs MyWay Route Planner" (2024-08-26) | https://www.mywayroute.com/route-planner-alternatives/circuit-vs-myway-route-planner-comparing-route-optimization-software | **competitor — biased** |
| S24 | Upper blog: "Spoke (Circuit) Pricing for 2026" (2024-07-03) | https://www.upperinc.com/blog/circuit-pricing/ | **competitor — biased** |
| S25 | AppBrain app profile (data updated 2026-10-16) | https://www.appbrain.com/app/spoke-circuit-route-planner/com.underwood.route_optimiser | third-party |
| S26 | Spoke developer API docs (linked from S4) | https://developer.dispatch.spoke.com/ | first-party, not read in full |
| S27–S34 | Individual changelog entries | https://spoke.com/route-planner/product-updates/… (scan/import manifest 2026-06-01; voice multi-address 2026-04-22; battery saver 2026-03-02; Google nav for all plans 2025-11-17; transfer stops 2025-11-17; address formatting 2025-11-10; rebrand 2025-10-23; extended search UK-only 2025-08-12) | first-party |
| S35 | Changelog entry "Scan and add addresses on Android devices" | https://spoke.com/route-planner/product-updates/scan-and-add-addresses-on-android-devices | first-party |
| S36–S38 | Reddit r/couriersofreddit threads | https://www.reddit.com/r/couriersofreddit/comments/1qdur1e/feedback_request_for_circuit_route_planner/ (2026-01-20) · https://www.reddit.com/r/couriersofreddit/comments/1dvmjuh/too_expensive_route_planners/ (2024-07-05) · https://www.reddit.com/r/couriersofreddit/comments/1e44zxg/route_planners_for_couriers_in_2024/ (2024-07-15) | user-generated |
| S39–S43 | Review mirrors/aggregators | https://appsupports.co/1198232244/spoke-route-planner/negative-reviews · https://justuseapp.com/en/app/1198232244/circuit-route-planner/reviews · https://appslupa.com/app/spoke-route-planner/id1198232244 · https://mwm.ai/apps/spoke-circuit-route-planner/1198232244 · https://chrome-stats.com/d/com.circuit.team/reviews | third-party mirrors — quotes are second-hand |
| S44 | Capterra AU — Spoke (105 reviews, 4.8) | https://www.capterra.com.au/software/210604/Spoke | page returned 403 on fetch; search extract only |

**Not found in public sources = UNVERIFIED.** The full list of open questions is §18.

---

## 1. Product map

| Product | Audience | Surfaces | Package / listing | Scale (public claims) |
|---|---|---|---|---|
| **Spoke Route Planner** (ex-Circuit Route Planner) | Individual delivery drivers | iOS + Android mobile app only (no web app) | iOS id1198232244 (Circuit Routing Ltd); Android `com.underwood.route_optimiser` | "10 million+ downloads" (S1/S2/S16); 10M+ on Play (S16); "1 billion+ deliveries powered" platform-wide (S12, 2025-10-23) |
| **Spoke Dispatch** (ex-Circuit for Teams) | Teams / dispatchers | Web dashboard + driver app (iOS + Android) | iOS id1457736526; Android `com.circuit.team` | Play: 100K+ downloads, 4.8★/3.04K reviews (S18) |
| **Spoke Package Tracker** | Recipients / order senders | iOS app (id1563244973) | listed on both NZ and AU storefronts (S13/S14) | — |
| **Spoke Connect** | Clients / retailers (client portal) | Web | https://spoke.com/dispatch/client-portal (S4) | — |

**Brand history:** Circuit → Spoke on 2025-10-23 (S12/S33). Same company (Circuit Routing Limited, London;
86-90 Paul Street, London EC2A 4NE — S16). Developer name on both stores is still "Circuit Routing" (S13/S16).

**Two SKUs of the driver app in one binary:** a *Personal* profile (solo Route Planner account) and a *Teams*
profile (a Spoke Dispatch account), switched from the app menu → profile icon (S20).

---

## 2. Plans and prices

### 2.1 Spoke Route Planner (solo) — S2, S5, S13

| Plan | Price | What it gives | Source |
|---|---|---|---|
| **Free** | $0 | Unlimited routes and unlimited feature access, **max 10 stops per route**; to unlock more you must subscribe | S2, S5 |
| **Lite** | **$9.99 / month** (US list) | Unlimited routes and stops; pricing page lists: route optimisation, built-in Google navigation, spreadsheet import, add stops by voice or camera, arrival time windows, locate packages | S2 |
| **Standard** | **$19.99 / month** (US list) | Same published bullet list as Lite; help text says Standard = "unlimited access to all features, no restrictions on routes or stops" | S2, S5 |
| **Annual** | 50 % off = "6 months free"; price not published on the site | — | S5 |
| **Trial** | **7-day** free trial on Lite and Standard, Android and iOS (availability varies by region) | conflicting: the App Store/Play descriptions say "14-day trial complete?" | S5 vs S13/S16 |

**NZD:** the NZ and AU App Store storefronts both render the identical In-App Purchase price strings —
*Lite $14.99, Premium $29.99, Premium Annual $179.99* — with **no currency label in the fetched markup**
(S13, S14). That string set matches the US price list scaled ~1.5×, i.e. it is almost certainly the US
tier price, not an NZD figure. **NZD price = UNVERIFIED.** Google Play NZ: "All prices include GST"
(S16 footer); NZ Play prices are behind sign-in and were not captured. Practical NZ reference point only:
US$19.99 ≈ NZ$30 at ~1.50, plus 15 % GST ≈ **≈ NZ$34.99/month** — *derived, not a Spoke-quoted price*.

**What Lite withholds is UNVERIFIED.** The pricing page shows an identical bullet list for Lite and Standard
(S2). A competitor blog claims Lite excludes spreadsheet import, camera stops and time windows and that
"most delivery drivers end up on Standard" (S23 — biased, 2024). Another claims "the pricing page does not
specify which features are excluded" (S24 — biased, 2024). Spoke publishes the Lite-vs-Standard delta only in
a pricing image we could not read as text. **Treat "Lite is crippled" as a sales claim we have not verified.**

### 2.2 Spoke Dispatch (teams) — S3, S5, S4

Prices are **USD only**; Spoke's own note: *"Prices shown above are in USD. Prices may differ depending on
your region and currency"* (S5).

| | Starter | Premium | Expert |
|---|---|---|---|
| Base price / month | **$125** | **$200** | **$1000** |
| Included base stops | 1,000 | 2,000 | 12,000 |
| Extra stop price | $0.04 | $0.06 | $0.07 |
| Drivers + dashboard members | unlimited | unlimited | unlimited |
| Data history | 30 days | 1 year | 5 years |
| POD photos per stop | 5 | 10 | 10 |
| Notable adds | — | branded recipient tracking page, custom stop properties, custom SMS sender name, custom time windows, actual time at stop, proof of custody, customisable manifests | personalised onboarding, SSO, directory sync, dedicated CSM (spend > $50k/yr), 5-year retention |

**Stop-meter rule (important commercially):** a stop is *used* when it is attempted, is a depot stop, is marked
failed or delivered, is accessed via the API, is **exported** or is **printed** (S3, S5). Printing or exporting a
manifest burns quota — a trap for NZ franchisees who print run sheets.

### 2.3 Full Dispatch feature matrix (S3/S5) — condensed

- **Workspace:** unlimited dashboard members, unlimited depots, depot management, barcode scanning, custom
  delivery zones, service offerings 1/3/unlimited, SSO + Directory Sync (Expert only).
- **Routes/stops:** route optimisation, unlimited routes, live route tracking & updates, interactive map +
  **timeline** views, route spreadsheet upload, custom stop properties, custom time windows, custom stop types
  *(Coming soon)*, actual time at stop (Premium+).
- **Tracking/notifications:** customised SMS + email notifications, custom SMS sender name, standard and
  branded recipient tracking pages, **recipient can leave delivery instructions for the driver**, notification
  restricted periods, driver live location tracking.
- **POD:** signature capture, photo capture (5/10/10 per stop by plan), geotags + timestamps, **strictness
  control**, cash on delivery *(coming soon)*, proof of custody (Premium+).
- **Driver management:** unlimited drivers, driver settings, permissions for driver-created and
  dispatcher-created routes.
- **Driver app:** turn-by-turn navigation, embedded Google Maps navigation, create routes, capture POD, barcode
  scanning, address label scanning, address dictation, add stops mid-route, driver notes, load checks.
- **Data:** route manifests (customisable Premium+), performance analytics, data history 30 d/1 y/5 y.
- **Care:** live chat support; personalised onboarding (Expert only).
- **Spoke Connect:** track order progress, upload orders, follow orders in real time *(Coming soon)*.
- **Integrations:** Read/Write API, Webhook API, Zapier, Shopify. Developer API support + dedicated CSM only
  above $50k annual spend (S5).

---

## 3. Screens and flows (driver app)

Reconstructed from the help centre + official tutorial (S6–S11, S21). Not a screen-by-screen pixel inventory —
we did not use the app.

**Home / route list.** Hamburger menu (top-left) → settings icon at the top of the app screen (S11). Route
cards show date, finish time, stop count; `⠇` overflow menu per route (S7, S11).

**Create route.** `Create route` → name + date → add stops → `Optimize`. If you do not want re-ordering, tap
`⠇` → **`Skip optimization`**, and stops keep the order you added them (S6, S7). This is a rare, valuable
"driver wins" affordance — we must match it.

**Add-stop surfaces:** see §4 (the full table).

**Optimise.** One `Optimize` button; traffic-aware if a depart time is set (S6, S21).

**Start/end.** Tap the start location on the map or list → address + **start time**; same for end. `Roundtrip`
recommended for couriers. If unset, **current location is used** (S6).

**Driving.** `Start` → first stop highlighted → `Navigate` → Google-Maps-powered in-app nav → arrive → mark
Delivered / Failed / Picked up → repeat (S6, S21).

**Refine / re-order (three mechanisms):**
1. `Refine` → **`Manually order route`** → **draw circles on the map** around groups of stops, in the order
   you want them → `Reoptimize route` → choose how to treat ungrouped stops (fit anywhere / all last) →
   `Confirm route` (S7, S8, S12 2026-08-21 entry).
2. `Refine` → **`Reverse route`** (S8).
3. Mid-route: tap a stop → **`make next`** (multi-select via bulk edit); stops marked "make next" beat
   "first" and time windows (S9).
4. `Update route` (slots changes into the existing order) **vs `Reoptimize route`** (rebuilds from every stop
   and "can create a totally new route") (S9). This distinction is the single most useful thing Spoke documents
   for drivers, and the one drivers complain about most.

**Bulk edit.** Pencil icon → select stops by drawing on the map or long-pressing the list → `Edit` → change
stop type, colour, notes, order, arrival time, time at stop, remove, or `make next` → `Done` → `Optimize route`.
Works before **and after** the route starts (S9, S12 2026-10-08 Play build).

**Map view.** Layers icon toggles simplified route ↔ **satellite**; tap a pin to zoom to it; a focus control
cycles stop / all stops / full route (S9).

**Share live route.** `Share live route` → share a link via WhatsApp, Messenger, social, email so someone can
track progress (S7).

**Transfer stops between drivers.** Route `⋮` → `Transfer stops` → `Send stops` → QR code on screen; the
receiver opens `Receive stops` and scans it. Also sendable by link, share or download (S8, S31).

**Copy stops.** `Copy stops to a new route` when a route completes, or from the main menu — select the skipped,
failed or completed stops and copy them into a new route (S8).

---

## 4. Stop entry methods — the full list, and what each one costs

| Method | How | Platform limits | Source |
|---|---|---|---|
| **Type** | search bar, Google-Maps-backed suggestions | all | S6, S7 |
| **Long-press map** | drop a pin where you are | all | S6, S7 |
| **Voice, one address** | mic icon | all | S6 |
| **Voice, many addresses** | mic → `speak multiple addresses` → read the manifest out → `Done`; each stop keeps a **playback button** of your recorded voice; Spoke **flags addresses that look incorrect** and **remembers the address format** for next time | all | S28 (2026-04-22), S7 |
| **Camera scan, one label** | viewfinder icon → pick the label language → address appears → `add stop` / `scan next` | Android first (S35); iOS uses **Apple Live Text** (S13/S14 description) | S7, S35 |
| **Manifest scan** | viewfinder → `Scan route manifest` → photograph the list → `Next` → `Done` / `Add +` for more images | all | S7, S27 |
| **Manifest import** | `⠇` → `Import route manifest` → choose a PDF or image → Spoke uploads and analyses it | all; **requires network** | S7, S27 |
| **Spreadsheet upload** | `⠇` → upload a spreadsheet | **Android only** ("Available on the Android app only") | S6, S7 |
| **Copy from a past route** | `Copy stops` | all | S6, S8 |
| **Transfer from another driver** | QR code | both drivers on Spoke Route Planner | S8, S31 |
| **Paste a plain-text list** | — | **not documented in any public source** | — |

**Two facts that hurt us, and must be met, not denied:**
(a) Spoke shipped **bulk voice dictation** on 2026-04-22 — "voice-first" is no longer a clean differentiator
on *entry*; only on *control while driving*.
(b) Spoke shipped **manifest OCR** on 2026-06-01 — OCR is no longer unique.
Our surviving edge: **on-device/offline** scanning and dictation (Spoke's manifest import explicitly
"uploads and analyzes the files"), and **NZ-only address correction with an explanation** (Spoke only flags
"addresses that look incorrect" and silently remembers the format).

---

## 5. Route and optimisation options

**Route level (S6, S7, S11):** start location + start time; end location + end time; **Roundtrip**; default
start = current location; route name + date; **planned breaks** (a time window e.g. 12–2 pm and a duration
e.g. 30 min — break time is fed into the optimiser and shown as a coffee-cup icon on the map; the driver can
skip it and remaining stop times re-flow); skip optimisation entirely.

**Stop level (S8):** arrival **time window** (from/until, e.g. "10am–Anytime", "Now–10am", "10am–11am");
**time at stop**; **order** = First / Auto / Last; **type** = Delivery / Pickup; **colour** (pickup = purple,
multi-package = teal, default blue); **number of packages**; **notes**; **photo**; **access instructions**;
**package finder**; **duplicate**; **remove**; **change address**.

**Reusable "stop types"** (new, 2026-08-05): a named, coloured preset bundling type (delivery/pickup), route
order, arrival time and time at stop, optionally pinned as the **default for that address**. Limitation Spoke
itself documents: *"Stop types are only available for recognized addresses. They cannot be used if you add a stop
using coordinates or an unrecognized address"* (S8).

**Package finder / load order.** Per stop: a description + size (Small/Medium/Large, Box/Bag/Letter) + a place
in the vehicle (Front/Middle/Back, Left/Right, Floor/Shelf), rendered as a mnemonic such as
"Small Box BLS = Small Box Back, Left, Shelf" (S8). This is a **code**, not a spatial map.

**Stop IDs.** Assignable "Modern" (A1, A2 …) or "Legacy" (1, 2 …) format, assigned after optimisation or as
stops are added; the driver writes the ID on the parcel to find it in the van (S11). **Stop side of the road:**
"either side" (default, fastest) / right only / left only, so a driver never crosses the road (S11) — **a
left-hand-traffic-aware default is a New Zealand differentiator.** **Vehicle type:** Bicycle, Scooter, Car,
Small Truck, Large Truck (S11).

**Other settings.** Average time at stop (default **1 minute**) · avoid tolls · disruption alerts on/off
(crowdsourced crash / congestion / police / speed camera / roadworks / lane closure / stalled vehicle / object
on road, from Spoke + Google Maps + Waze) · theme Light/Dark/Automatic/Follow-system · distance unit derived
from **phone language** (English UK → miles, Spanish → km) (S11). **Address corrections:** `Change address` on
a stop re-searches and replaces (S8); **"Extended search results" are UK-only** (S34) — Spoke's answer to
missing addresses is a country-specific dataset, not a global engine.

---

## 6. Navigation and hand-off

- Default is **Spoke Internal Navigation, powered by Google Maps**; on all plans since 2025-11-17 (S30).
  Alternative nav apps in Settings: **Apple Maps, Waze, HERE WeGo, Sygic Maps** (S2, S11).
- Nav settings cog: sound on/off/alerts-only; finish time vs time remaining; **auto-start navigation after each
  delivery** on/off; disruption alerts; **avoid tolls**; **Power mode → Battery saver** (Android only)
  (S10, S11).
- **Satellite view** toggle for driveways (S9, S30). **Android Auto / CarPlay**: the phone projects a
  simplified Spoke to the head unit — navigate, mark failed/delivered, change map view and sound, finish the
  route (S10).
- **No turn-by-turn engine of their own**; no offline navigation of their own; no "whisper"/quiet guidance;
  no voice hand-off ("read me the door note on arrival").

---

## 7. Proof of delivery, delivery outcomes

- POD is a **Dispatch** capability: signature capture, photo capture (5/10/10 per stop by plan), geotags +
  timestamps, **strictness control** (how mandatory the POD is), cash on delivery *(coming soon)*, proof of
  custody (Premium+) (S3, S5).
- The **standalone Route Planner app also has a POD screen** — the 2026-10-08 Android build notes read
  *"Smoother proof of delivery screen"* (S16). Which plan gates it, and whether a solo driver can photograph a
  delivery, is **UNVERIFIED**.
- Delivery outcomes in the driver app: **Delivered / Failed / Picked up** on the stop card, and **swipe the
  stop left/right** in the list to mark Failed/Delivered, swipe again to **undo** (S9).
- **No documented failed-delivery reason codes, no re-attempt scheduling, no voice POD, no POD offline
  behaviour** — UNVERIFIED / not found.

---

## 8. Customer notifications and recipient experience

**Solo (Route Planner):** `Share live route` produces a link (WhatsApp, Messenger, social, email) so a
recipient can watch progress (S7). No SMS, no email, no branded page on any solo plan (S2, S5).

**Dispatch:** customised SMS + email notifications, custom SMS sender name, standard and branded recipient
tracking pages, recipient **can leave delivery instructions for the driver**, notification restricted
periods, driver live location tracking (S3, S4, S5). SMS is billed **per message on top** of the plan
(S23 — competitor source, treat as indicative).

---

## 9. Roles, teams, dispatcher tools

- **Driver app profiles:** Personal vs Teams, switchable in-app (S20).
- **Dispatcher dashboard (web):** multi-route planning on an interactive map with a **timeline view**, live
  driver tracking, route creation/optimisation, delivery zones (polygon areas), depots, **route properties**
  (max stops per route, vehicle type, driving speed, delivery speed), **driver settings** and permissions
  (what drivers may change; may they edit dispatcher routes?), live route status, stop assignment, stop import
  ("Add or import stops"), route manifests (print/PDF), performance analytics, data history and export,
  custom branding on the recipient page, SSO + Directory Sync (Expert) (S3, S4).
- **Dispatch team evidence:** Play rating 4.8★ / 3.04K reviews, 100K+ downloads (S18); Capterra 105 reviews
  at 4.8 (S44, search extract only).
- **Load checks** are a Dispatch driver-app feature (S5) — not found in the solo app.
- **Customer success:** live chat support in every Dispatch plan; a dedicated CSM only above $50k/yr (S5).

---

## 10. Integrations

Read/Write API, Webhook API, Zapier, Shopify, Spoke Connect client portal (upload orders, track order
progress, follow orders in real time *coming soon*), API docs at developer.dispatch.spoke.com (S3, S4, S5, S26).
**No NZ carrier integration found in public sources** (Aramex, CourierPost, NZ Post, Mainfreight, PBT) —
UNVERIFIED/appears absent.

---

## 11. Offline behaviour

Spoke's own words: *"If you create and save your route to your device, it will work even when offline.
Features such as live traffic alerts and map updates require an internet connection"* (S2, S10).

Consequences, stated plainly:
- The **saved route** survives loss of signal (S2). **Live traffic, disruption alerts, map updates and
  traffic-aware optimisation need data** (S2).
- **Manifest import and manifest OCR upload the file to Spoke's servers to analyse it** (S7, S27) — so the
  headline "scan a manifest" feature **requires network** at the moment it matters.
- Navigation is **Google Maps** (or a third-party app) — offline navigation is Google Maps' problem, not
  Spoke's. There is **no offline map of the driver's own region** (no PMTiles/offline tile product; no
  mention of an offline map anywhere in the help centre).
- **Offline POD, offline stop editing, offline route edits and offline sync conflict rules are not
  documented** — UNVERIFIED. Third-party review evidence calls offline "partial" — "can show routes even
  without network" (S43) — and drivers report losing work when the app dies (S39/S40, S16).

---

## 12. Android vs iOS differences (verified)

| Capability | Android | iOS | Source |
|---|---|---|---|
| Spreadsheet stop import | **Yes** | **No** ("Available on the Android app only") | S6, S7 |
| Manifest scan + import (PDF/image) | Yes | Yes | S7, S27 |
| Camera label scan | Yes (language picker in viewfinder) | Apple **Live Text** instead | S35, S13 |
| Voice dictation (one/many addresses) | Yes | Yes | S28 |
| Battery saver mode | **Yes** (Android only) | **No** | S10, S29 |
| Android Auto / CarPlay | Android Auto | CarPlay | S10 |
| Internal nav (Google Maps) | Yes | Yes | S10 |
| Disruption alerts + satellite view | Yes (internal nav) | Yes (internal nav) | S10, S11 |
| Language coverage | 19 languages, phone-language driven, falls back to **US English** | same | S13, S14, S3 |
| Version cadence | Play build 3.69.x, updated 2026-10-07/08; APK ~63 MB (S25) | iOS 3.21.6, 2026-10-06; **262.5 MB** (S13) | S13, S16, S25 |

Both stores list **"may use your location even when the app isn't open"** (iOS) and Play lists "Shares
location" for Dispatch (S13/S18).

---

## 13. Accessibility

Apple's listing for both the NZ and AU storefronts states: **"The developer has not yet indicated which
accessibility features this app supports"** (S13, S14). No VoiceOver/VoiceControl/Typing-assistance
declaration, no large-text support claim, no statement on contrast or reduced motion, and no accessibility
guidance in the help centre. **Our accessibility bar is therefore above Spoke's published position by default**
— but this is a *listing* gap, so treat Spoke's actual accessibility as **UNVERIFIED**, not proven bad.

---

## 14. Languages

19 languages: English, Arabic, Dutch, French, German, Greek, Hebrew, Hungarian, Indonesian, Italian,
Japanese, Malay, Polish, Portuguese, Romanian, Russian, Spanish, Thai, Turkish (S13, S14). The app follows
**the phone language** and falls back to **US English** if unsupported (S2, S3).

**Not supported: te reo Māori, Mandarin/Cantonese, Hindi/Punjabi, Samoan/Tongan, Korean, Vietnamese,
Norwegian/Danish/Finnish (Nordic).** For an NZ courier base (Samoan, Te Reo, Hindi and Mandarin speakers are
a large share of the NZ delivery workforce) this is the single clearest **NZ-only** opening we have.

The **Dispatch dashboard** auto-translates to the browser's language; the **Dispatch driver app** uses the
phone language, falling back to US English (S3, S4).

---

## 15. Onboarding and support

- In-app `?` icon → **live chat**, help guides, and **share a screen recording** of the issue; email
  support@spoke.com (S10, S8).
- Getting-started flow is three steps: create route + add stops → set start/end → optimise and navigate (S6).
- Official video: "Optimize your Delivery Route in 4 Steps" (2021-07-23, 916.9K views, 454 likes) (S21).
- Dispatch onboarding: "Free trial • Onboard in 5 minutes" (S4); **personalised onboarding is Expert-only**
  (S5).
- **No voice-guided onboarding found** in public sources — UNVERIFIED/absent.
- Trial: 7 days (help) vs "14-day trial" (store copy) — inconsistent; plan around 7 days (S5 vs S13/S16).

---

## 16. Corrections to our own current documentation

Flagged for the CEO; **PARITY.md and QUALITY_SCORECARD.md were not modified by this role.**

1. `docs/QUALITY_SCORECARD.md` §1 says *"Spoke: one-shot dictation only"* — **now stale**. Spoke shipped
   multi-address bulk voice import on 2026-04-22 (S28). The still-true part: Spoke has **no voice control
   while driving** (no spoken "delivered", no spoken re-order, no spoken "next stop").
2. `docs/PARITY.md` row 19 "Door memory" claims Spoke has no memory of door/access info — **partly wrong**.
   Spoke has **sticky per-address access instructions** (gate code, key location) that reappear whenever the
   same address is added again (S8). What Spoke does **not** have: a door-level **location** (which door on
   which side of a drive-by), an arrival-triggered spoken read-out, a correction ("wrong pin"), or learning
   across addresses. Narrow our claim accordingly.
3. `docs/PARITY.md` row 3 "Camera label scan (OCR + barcode)" is marked as our differentiator — Spoke has had
   label/manifest OCR since 2026-06-01 and label scanning on Android for longer (S27, S35). Our edge is
   **on-device + offline + NZ-address-only**, not the existence of OCR.
4. `docs/research/competitors-2026.md` §2.3 lists Spoke Route Planner pricing as Free / $20 Pro / $125 Team
   Starter / $250 Team Pro / $1000 Enterprise. The current truth is **Free / Lite $9.99 / Standard $19.99**
   and **Dispatch Starter $125 / Premium $200 / Expert $1000** (S2, S3). The old file is out of date.
5. `docs/research/competitors-2026.md` §2.4's "20 real driver complaints" were **not verifiable** from the
   sources cited. `REVIEWS.md` replaces them with sourced, quoted, dated evidence.

---

## 17. What Spoke demonstrably does NOT have (our opportunity list)

Each item was checked against the public help centre, both store listings, the pricing matrix and the
changelog. Anything we could not check is marked UNVERIFIED.

- No NZ-specific address engine: no LINZ data, no te reo, no RD/unit parsing rules, no confidence/explanation
  model. Spoke geocodes with **Google Maps**, and its own fix for missing addresses is **UK-only extended
  search** (S4, S34).
- No left-hand-traffic-aware stop-side rules for NZ (the setting exists but is generic) (S11).
- No offline map of the driver's region and no offline tile product (S2, S10).
- No on-device audio: the manifest OCR uploads to Spoke's servers (S27); voice dictation is cloud-shaped
  (S28).
- No voice control of the app while driving; no spoken "delivered"; no voice onboarding; no voice POD (S6–S11).
- No spoken door note on arrival; no door-level location; no "wrong pin" correction (S8 has text-only access
  instructions).
- No earnings, mileage logbook, IRD/GST export, invoicing or client statement in either product (S2, S3, S5).
  No customer SMS/email/ETA on the solo plan (S2). No failed-delivery reason codes and no re-attempt
  scheduling (S9).
- No stop-level voice re-ordering / spoken rules engine (S7, S9). No template/route rebuild: Spoke's reusable
  artefacts are **stop types** (a preset on one address) and **copy stops from a past route** — there is no
  "rebuild today's route from yesterday's template in one tap" (S8).
- No accessibility declaration (S13, S14). No te reo Māori / Mandarin / Hindi / Samoan / Tongan (S13).
- No statement about where audio/photos are processed; the stores declare identifiers + usage data used to
  track, and third-party advertising use of usage data (S13, S14) — see `REVIEWS.md` §3.

---

## 18. Open questions (must be closed before we publish a competitive claim)

1. NZD price actually charged for Lite/Standard on the NZ storefront (both stores rendered the same
   unlabelled price string). → **UNVERIFIED**
2. The exact Lite-vs-Standard feature delta. → **UNVERIFIED**
3. Which standalone plans include POD photo/signature. → **UNVERIFIED**
4. Whether Spoke has any NZ-domiciled customer, NZ pricing or NZ feature work (e.g. left-side driving
   rules). → **UNVERIFIED**
5. Spoke's actual accessibility implementation (only the store *declaration* is missing). → **UNVERIFIED**
6. Offline behaviour of POD capture and of stop edits. → **UNVERIFIED**
7. Whether the standalone app can send SMS/email. → **UNVERIFIED** (pricing says no; store copy is silent)

---

## 19. Method, safety and limits

- Only public sources. No download, decompile, scraping of assets, or probing of private APIs. Nothing was
  installed; nothing was paid for; no Spoke account was created.
- Quote lengths in `REVIEWS.md` are short excerpts only (see that file's rule at the top).
- Competitor-authored sources (S22, S23, S24) are labelled **biased** and are never used as the only
  evidence for a claim.
- Third-party review mirrors (S39–S43) are used as *review discovery*; the underlying store is cited where the
  review was directly visible, otherwise the mirror is named.
- Every claim carries a source ID from §0 and the read date 2026-10-21. Claims we could not verify are
  written **UNVERIFIED** — including "the app does not have X", which we only assert where the public help
  centre, pricing matrix, store listing and changelog are all silent together.
