# Spoke (competitor research) — text-only analysis

Source: 14 WhatsApp screenshots received via the founder's `WhatsApp Unknown 2026-10-23
at 4.11.31 AM` folder (captured the evening of 2026-10-22 NZ time), copied read-only
into `research-private/spoke/` under the founder's authorisation (MASTER §17.2, commit
`30b954f`). The originals stay in that git-ignored folder; only the text below is
committed, and nothing of the visuals is reproduced. Personal identifiers in the
captures (the account card, the home start point) are deliberately not reproduced.

> Note: files `spoke-9.58.54.jpeg` and `spoke-9.58.54(1).jpeg` are not Spoke — they are
> Facebook "Activity log" screens that came along in the same WhatsApp bundle. The
> twelve Spoke screens are `spoke-9.58.54(2..6).jpeg` and `spoke-9.58.55(.jpeg,(1..6).jpeg)`.

## What Spoke is

A courier route planner on iOS and Android — the renamed Circuit Route Planner
(10M+ downloads; see the public record below) whose layer on top of **Google Maps**
is the stop work: a manifest, a reordering solver, per-stop package actions — and the
navigation chrome is Google's own (route line, speed chips, layers button,
re-centre). One
**route per weekday**
("Thursday"), kept in a history by day ("Earlier this week", "Earlier this month") with
a Create-route button. It is a subscription ("Standard plan … Renews on Fri, 20 Nov",
Restore purchase / Compare plans / Cancel subscription).

This run shown is a real Christchurch day: a 174-stop weekday (morning pickups in
Richmond/Linwood, evening deliveries west and south, finish at the airport), captured
while the courier was **on a 37–40 minute live phone call** (the status bar shows the
green call pill in every capture).

## What each capture shows

| file | screen | what it teaches |
|---|---|---|
| 9.58.54(2) | Day sheet over the region map | Route title by weekday; header "Finish 9:35 PM · 1 stop · 12.8 km" (the whole day's backlog reduced to what remains); buttons **Share live route** and **Load vehicle**; a "**No break — Tap to plan a break**" row; "Start location — 8:54 — Used GPS position when optimising"; stops numbered 01, 02… globally through the day with times, done ticks, package-position chips ("Middle", "4" stacked) |
| 9.58.54(3) | Stop detail sheet | For one stop (London St): "**172/174 · 4:50 PM**" progress + planned time; three actions — **Navigate** (blue), **Failed**, **Delivered** — then Add notes / suburb row / package position "**Middle** "/ "**ID 70 Added 70th**"; Edit stop; Duplicate stop. The map behind shows the CBD cluster: dozens of stacked numbered pins (92, 150, 172…) — the app renders the delivered backlog as a pin cloud |
| 9.58.54(4) | Turn-by-turn | Google-Maps-native guidance: banner "towards **Buchanans Rd**" + "Then ↑"; ETA flag on the final stop; a "**Similar ETA**" chip mid-route; floating buttons (warning/gear/layers/re-centre); bottom bar "**18 mins · 10:13 PM · 10.5 km**"; bottom sheet with the current stop + the two package buttons inline |
| 9.58.54(5) | Stop list under navigation | Spine-list with: seq number, street+suburb+postcode, time (actual when done: 4:41/4:49; planned later: 9:16/9:28/9:37), right chips "ID 97 ✓", package chips "🚚 Front", "⧉ 6" (stack count), "↑ Pickup" type; the active stop highlighted in blue with a beacon; search bar "Add or find stops" with scan + mic; header "Finish 9:37 PM · 3 stops · 13.2 km" |
| 9.58.54(6) | Account/history sheet | Routes grouped Today / Earlier this week / Earlier this month, each with a kebab; profile + plan card ("Standard plan, renews"); macro button **+ Create route** |
| 9.58.55 | Settings | Route preferences: **Navigation app: Spoke Navigation** (i.e. it can hand off to another engine, default its own); **Stop side: Any side of vehicle**; **Average time at stop: 1min 30s**; **Vehicle type: Van**; Avoid tolls: not available for vehicle type; **Stop ID: Legacy and As stops are added** (auto-numbering modes). General: Theme Light. Subscription block. This is where the solver's cost model is configured |
| 9.58.55(1) | Route kebab menu | **Share route copy**, **Transfer stops**, **Copy stops…**, **Reoptimise route…**, **Scan route manifest**, **Import route manifest**, **Remove stops…** — the manifest intake and stop redistribution live here |
| 9.58.55(2) | Reoptimisation options | Two modes: "**Update route** — Reorder only changed stops" vs "**Reoptimise route** — Reorder all stops for optimal efficiency". The split matters: couriers do not want the whole day reordered over one change |
| 9.58.55(3) | Solving modal | "Reoptimising route — Finding the best order…" with a progress bar over the list; note the renumbered current stop (172 → 4:50 PM in this pass) and a **"Mark route as completed"** bar at the very bottom |
| 9.58.55(4) | After the reoptimisation | The solver moved London St to **last** (174, 10:24) and the finish time slid 9:37 → 10:42 PM, 13.2 → 24.8 km; bottom: remaining "**45 min**" in green + **Refine** + **Resume route**. The plan changed the day for the courier with no accept/reject step beyond Resume |
| 9.58.55(5) | "Refine" tutorial | A distinct feature: 1) "On the map, draw a circle around the area you want to go first", 2) "In the order you want to drive, circle as many areas as needed", 3) "Tap 'Reoptimise route' to get your new route" — **zones-first priority**: the driver draws their preferred area order, the solver fills stops inside |
| 9.58.55(6) | The Refine editor | Map (Google) with the current pin "172" on Buchanans Rd; tooltip "Create the first group"; toolbar **New** (draw a group circle) / **Expand** / **Erase** / Undo — freehand circles over the live map, exactly the interaction a driver already does on paper |

## Feature inventory (what the product actually has)

**Route & day**
- One route per weekday; day-level history with kebab actions; Create route.
- Day header: finish ETA (pinned as a flag on the map), remaining stops, remaining km, remaining minutes ("45 min").
- Break planning row ("No break — tap to plan a break").
- Mark route as completed.
- Share live route (a watchable progress link); Share route copy (static).

**Stops**
- Global sequence numbers across the whole day (01…174), not per route leg.
- Per stop: time (actual when done, planned otherwise), street, suburb, postcode,
  consignment ID chip ("ID 70", with provenance "**Added 70th**"), package position in
  the vehicle ("Front"/"Middle"), stack count ("⧉ 6"), type ("↑ Pickup"), done tick.
- At-stop actions: Navigate / Failed / Delivered (the only outcome model shown — no
  photo or signature capture in any capture).
- Add notes; Edit stop; Duplicate stop; Remove stops…; Transfer stops (hand-off);
  Copy stops….
- Add or find stops search with barcode-scan and voice buttons (the mic is in Google's
  search, not a copilot).

**Manifest / load**
- Scan route manifest (camera) and Import route manifest (file) from the route menu;
  "Load vehicle" button on the day — the vehicle-loading step is part of the flow.
- "Stop side: Any side of vehicle" and "Average time at stop" feed the ETA model.

**Optimisation**
- Menu "Reoptimise route…" with the two-mode choice (changed stops only vs all stops).
- A solve modal ("Finding the best order…" + progress) over a ~174-stop problem,
  solved on the phone in seconds (two frames apart 9:56→9:57).
- "Refine": freehand map circles (New/Expand/Erase/Undo) to pin preferred areas in a
  driver-chosen order, then reoptimise respecting them.
- After a solve the header shows the new finish time/km instantly ("Similar ETA" chip
  while driving compares the change against the original).

**Navigation**
- Native Google turn-by-turn inside Spoke ("Navigation app" preference names it).
- spokes of UI reaching the driver: banner/turn arrow, ETA flag at the finish point,
  mid-route "Similar ETA", bottom bar minutes+km, warnings button, layers, settings.
- Light theme setting exists (the captured day ran light at night — no dark mode in
  evidence).

**Account / billing**
- Google-style sign-in; plan card with renewal date; Restore purchase; Compare plans;
  Cancel subscription.

## Reading against Courier Copilot

What Spoke validates (we are building the same bets):

1. **Stop-context actions live in navigation, not in a separate app** — Drive view with
   the current stop's package buttons. Our Drive screen should keep the outcome
   buttons (Done/Failed/Note) visible while voice is listening.
2. **A planner that respects the vehicle as a stack** — "Front/Middle" package
   position + stack counts; loading order and stop list must agree. Our D8/D12 work
   should treat the van as a physical, ordered object.
3. **Zones-first ordering ("Refine")** — couriers want to say "do these parts of town
   in this order", not hand-solve 174 stops. Our solver should allow zone-priority
   hints; the freehand-circle UX is cheap to mimic on our basemap.
4. **Partial reoptimisation** ("reorder only changed stops") — full solves are violent
   mid-shift; the couriers accept a solver that touches as little as possible.
5. **Manifest intake from the vehicle** — scan/copy/import of a manifest list; our
   "labels" pipeline is the same axis (NZ Post CSV/QR at the depot).
6. **Share live route** — a watchable progress link to family/ops, useful and cheap;
   our dashboard can do better (ops view) but the courier-facing share link is worth
   a backlog line.
7. **ETA honesty after edits** — Spoke shows the finish time friction of any edit
   (9:37→10:42 into +11.6 km). Do the same in our copilot's natural language: "that
   adds ten minutes".

Where we deliberately differ (and win):

1. **Voice-first while driving** — Spoke has none; the captured courier copes by
   being on a live phone call mid-nav (37–40 min). Every capture proves the gap: the
   couriers' bandwidth is voice, hands-on-the-wheel; we take it and use it for
   Done/Failed/notes/questions instead of a phone call between two apps.
2. **New Zealand local intelligence** — Spoke is generic; our LINZ address index,
   MetService-driven plan and NZ Post label formats are specific.
3. **Offline first** — Spoke is a Google client; the map pages stop being useful where
   coverage dies (Port Hills, Banks Peninsula). Our offline packs + local address
   search are ours by design, not by ToS.
4. **The round as a shared object** — Spoke's "Transfer stops" hints at ferrying
   between drivers but there is no ops view, no fleet/relay plan, no customer
   notification. Our multi-courier model and the dispatch surface are the moat.
5. **Price** — Spoke monetises per plan with a renewal wall mid-month; our pricing
   follows the courier's income, not a fixed subscription.

What to steal into the backlog (small, concrete):

- B-1 Package-position chips (Front/Middle + stack) on the stop list — the van-as-a-
  stack read is a differentiator couriers recognise immediately.
- B-2 "Changed stops only" reoptimisation mode as a first-class choice.
- B-3 A zone-priority sketch ("Refine") mapped to our plan editor (D8 view).
- B-4 Finish-time honesty chip after any stop edit ("adds N minutes").
- B-5 Share-live-route link (read-only) as a courier comfort feature.
- B-6 Break planning as a first-class row on the day plan.

Backlog additions are only recorded, not scheduled — the queue (MASTER §4–§6, Part B
Maps First) stays the spine; nothing here reorders the plan.

## The public record (verified 2026-10-23)

- Spoke Route Planner **is Circuit Route Planner renamed**: the App Store listing says
  "Circuit Route Planner is now Spoke Route Planner. Same trusted app, just a new
  name." Developer: Circuit Routing. iOS `id1198232244`, Android
  `com.underwood.route_optimiser`, 10M+ downloads, iOS and Android, Android Auto and
  CarPlay compatible.
  [App Store](https://apps.apple.com/us/app/spoke-route-planner/id1198232244) ·
  [Play Store](https://play.google.com/store/apps/details?id=com.underwood.route_optimiser)
- **Route Planner pricing** ([spoke.com/route-planner/pricing](https://spoke.com/route-planner/pricing)):
  Free ($0, max 10 stops per route), Lite US$9.99/month, Standard US$19.99/month —
  the captured app is on **Standard** ("Standard plan, renews…" in the account
  screen), which matches: unlimited stops, optimisation, built-in Google
  navigation, spreadsheet import, add-stops by voice or camera, arrival windows,
  locate packages. Per-region prices exist (PLN 37.99 for Standard in Poland).
- **Spoke Dispatch** (the team product,
  [help.spoke.com pricing](https://help.spoke.com/en/articles/1925291-spoke-products-pricing)):
  Starter US$125/month (1,000 base stops), Premium US$200 (2,000), Expert US$1,000
  (12,000), plus US$0.04–0.07 **per extra stop**; unlimited drivers; dispatcher
  dashboard, route spreadsheet upload, live route tracking, SMS/email recipient
  notifications, branded tracking page, signature capture, photo capture (5/10/10
  per plan), geotags and timestamps, driver management, 30-day/1-year/5-year data
  retention. The Dispatch driver app adds barcode scanning, address label scanning,
  **address dictation**, add stops mid-route, driver notes and load checks.
- **Navigation engine**: internal navigation "powered by Google Maps"; the driver can
  switch to Apple Maps, Waze, HERE WeGo, Sygic — the captured settings screen's
  "Navigation app: Spoke Navigation" is that choice.
- **Offline**: "If you create and save your route to your device, it will work even
  when offline. Features such as live traffic alerts and map updates require an
  internet connection" — route-order offline, live layers online. Depends on Google
  Maps' coverage ("if Google Maps works where you live, then Spoke works").
- Positioning: "trusted by over 100,000 drivers", "1.5B+ deliveries per year", "save
  an hour a day".

The screenshots are the **consumer Route Planner** app, not the Dispatch build —
which is why no signature/photo POD or dispatcher features appear in them (those are
Dispatch-tier per the help centre). The analysis below marks what the SCREENS show
versus what the VENDOR DOCUMENTS.

## The flow, end to end (from the captures)

1. Sign in (a Google-style account; the profile card carries the plan state).
2. The home sheet is a **day**, not a "trip": "Thursday" with the day's full stop list
   (01…174 across the whole day), grouped histories ("Earlier this week / month") and
   "+ Create route". A route equals a working day.
3. Intake: scan or import a **route manifest** (camera scan or file), then "Load
   vehicle" — the van-loading step is part of the product, and each stop carries its
   package position ("Front"/"Middle") and stack count from that step.
4. Optimise: automatic on creation; manual "Reoptimise route…" offers the two-mode
   choice (changed stops only vs all stops); "Refine" lets the driver draw area
   circles in the order they want to drive them and re-solve respecting them.
5. Drive: native Google turn-by-turn inside the app; the stop list stays under the
   guidance; the current stop is beaconed; outcome buttons (Failed / Delivered) sit
   next to Navigate; "Similar ETA" chip compares the plan against reality mid-route.
6. Along the day: add mid-route stops by search/scan/voice; plan a break ("No break —
   tap to plan a break"); hand off or copy stops ("Transfer stops", "Copy stops…",
   "Share route copy").
7. Close: "Mark route as completed"; the day lands in history with its actual times,
   which is what the next day's planning reads.

## What they optimise for, and what they assume

- **Done by 5:** nearly every surface is a countdown to the finish time — the header
  ("Finish 9:37 PM · 3 stops · 13.2 km"), the remaining-minutes chip ("45 min"), ETA
  flags on the map. The product treats the day's end time as the driver's score.
- **The solver is invisible but always there:** reoptimisation is a-menu-deep and
  framed in outcome language ("in <time> you'll finish"), never as algorithm tuning.
  The one tuning surface is a settings list: stop side, average time per stop,
  vehicle type, avoid tolls, stop-ID numbering — a cost model as preferences.
- **The driver knows the town better than the app:** "Refine" (draw-area priority)
  and "Reorder only changed stops" both exist because a whole-day re-solve mid-shift
  is violent — they assume a driver who wants surgical edits anchored to local
  knowledge, not obedience to the solver.
- **The van is physical:** package position and stack counts are first-class stop
  metadata, because they optimise for the 30 seconds at the door + the locate time in
  the back of the van ("locate packages" is an advertised paid-plan feature).
- **The phone is the nav unit:** embedding Google Maps means no second device mount,
  no app-switching at each stop; Android Auto/CarPlay extend it. They assume the
  driver's whole workflow fits one screen and one hand.
- **Drivers share:** "Share live route", "Share route copy", "Transfer stops" — the
  social/ops fabric is per-route text/links, managed locally.

## Strengths, weaknesses and friction

Strengths: the stop-context actions inside navigation (no app juggling); surgical
reoptimisation; zone-priority drawing ("Refine"); van-as-a-stack metadata; manifest
intake at the depot; finish-time honesty on every edit; day-as-history planning; a
cheap paid tier that matched a 174-stop day.

Weaknesses and friction (what the captures show and the market does not solve):

1. **Not a hands-free tool.** There is no voice in the product (dictation of
   addresses exists per the help centre; a copilot does not). The captured courier
   was mid-shift and on a **37–40 minute live phone call** in every screenshot —
   the phone call is the workaround for the missing voice channel. Our whole thesis
   lives in this gap.
2. **The reoptimisation keeps its own counsellor:** after the solver moved a stop to
   last, the day slid 9:37 → 10:42 PM and 13.2 → 24.8 km with **no accept/reject
   step** — the deliverable is "Resume route". A mid-shift surprise of an extra 65
   minutes with no undo is friction a copilot would voice *before* applying.
3. **Address entry is typing-first.** Search bar, scan, Apple Live Text — but a
   rounded-trip of attention. Our product class (voice-first, earbud-native) is
   absent from the market leader.
4. **POD is a toggle** in the consumer app (Failed/Delivered only — no photo, no
   signature, no note capture in the screens). The Dispatch tier has signature/photo,
   which puts proof behind the team price wall. A solo contractor gets a checkbox.
5. **Offline is route-order offline** — the map data remains Google's; where coverage
   dies (Port Hills, Banks Peninsula, rural Canterbury), tiles die. No NHN/LINZ
   offline pack story.
6. **NZ-generic:** Google address search is generic; there is no NZ address
   authority, no rural addressing (RD), no LINZ correction, no met-service-aware
   planning.
7. **Light theme at night** was the captured reality (light UI driven at 10 PM); a
   nav-first product without a driven dark mode is a real-itches candidate.

## The capability table (MASTER 17.2 outcome)

For each Spoke capability: our equivalent today, the honest verdict, and the task
that makes us clearly better.

| Spoke capability | Our equivalent (Courier Copilot) | Verdict | The task to be clearly better | Owner |
|---|---|---|---|---|
| Native Google turn-by-turn embedded | Maps First (ADR-008 in flight): our own MapLibre/Vector basemap + mode screen | **missing** (in flight) | T6 Maps First: the 13 screens land in Maps First style; Drive stays voice + map on one surface | T6 design squad (P4) |
| Automatic route optimisation, 174 stops in seconds | VROOM-based solver in the plan (T5) | **missing** | T5: the solver with the spoken honesty "adds N minutes" | solver squad (P4/P5) |
| "Reorder only changed stops" partial reopt | Not modelled | **missing** | Solver option: minimal-perturbation reopt mode (draft idea B-2) | solver squad |
| "Refine": draw area priorities on the map | Not modelled | **missing** | Zone-priority sketch in the plan editor (draft idea B-3) | map squad (P3/P4) |
| Stop-context actions inside navigation (Navigate/Failed/Delivered) | Drive screen owns Done/Fail/Note (designed; not built) | **partially designed** | The 13 screens: Drive keeps outcome buttons visible while voice listens (idea B-1 context) | T6 design squad |
| Van-as-a-stack: package position Front/Middle + stack counts | Load order planned in sync/design docs; not a stop-list readout | **missing** | Vehicle-load-aware stop list chips (draft idea B-1) | product squad (P5) |
| Manifest scan / import / CSV | Scanner screen (P5): multi-label rapid capture is innovation #2 | **in plan** | The scanner MVP lands before a manifest file-import parity | product squad |
| Address dictation (speak an address) | Continuous dictation + correction report (innovation #1) — our copilot hears the whole stop | **missing** (in plan) | The copilot conversation registers a new stop in one spoken turn | copilot squad (P5) |
| Finish-time honesty on edits ("adds 65 min") | Not modelled — planned as natural language | **missing** | The copilot says the delta **before** applying an edit (draft idea B-4) | copilot + solver squads |
| Live route share link | Not modelled; ops dashboard exists in product scope (P5) | **missing** | Read-only share link (draft idea B-5); our version can be a real atlas with warners | web/ops squad |
| Break planning row on the day | Not modelled | **missing** | A first-class break row on the day plan (draft idea B-6) | product squad |
| Stop transfer between drivers | Multi-courier model in the plan (relay/hand-off is a P5/ops surface) | **in plan** | The dispatch surface must beat local text hand-off | ops squad |
| Subscription (Free 10 stops / $9.99 / $19.99; Dispatch $125–$1000 + per-stop) | Pricing follows the courier (per-stops decoupled; founded in product §) | **better by model** | Our price floor must show up on a 174-stop day cheaper than $19.99 or be worth it | founder |
| POD: signature/photo (Dispatch-only), geotags | POD capture planned post-scanner (P5) | **missing** | POD (photo first, note + geo) for the solo courier — where Spoke gives a checkbox | product squad |
| Offline: saved-route offline, live layers online | Offline-first everything (Two Golden Rules; offline packs) | **better by design** | The Canterbury pack build remains the gap to close (T-standing) | map squad |
| Address source: Google Maps global | nz-address (LINZ-backed index) + correction | **better for NZ** | NZ correction rate stays ≥ target in evals; RD/rural forms | address squad |
| Android Auto / CarPlay | Not planned in P1–P6 | **missing** | Recorded as an innovation-backlog watch, not scheduled | CEO |
| 174-stop day → "Mark route as completed" + day history | Sync + history on device (P5) | **in plan** | Day history must read at next-day planning time, offline | data squad |

Every "missing" lands as a backlog item with its squad; the queue order is not
reordered by this table (MASTER §4 wins). The leapfrog lanes (per MASTER 17.2):
hands-free copilot, offline maps + scanner, NZ address correction with LINZ, live
activity; these already own phases in the plan.

## Ideas to record in the innovation backlog (new, from this research)

Continue the numbering of `docs/research/INNOVATION.md` (the file reached 38):

| # | Idea | Description | Source |
|---|---|---|---|
| 39 | Van-as-a-stack stop chips | The stop list reads the load order: "Front/Middle" + stack count per stop; locate instantly | Spoke screens |
| 40 | Minimal-perturbation reopt | "Only reorder the changed stops" as a first-class solver mode | Spoke frames it; we own NLU |
| 41 | Zone-priority sketch ("Refine") | Draw circles around areas in the order you want to drive them; solver respects | Spoke's draw-a-circle flow |
| 42 | Spoken edit honesty | Before applying any edit the copilot says the delta ("adds ten minutes, finish 10:24") | Spoke's finish-time chips, restated |
| 43 | Read-only live-route share | A watchable progress link for family/ops | Spoke's "Share live route" |
| 44 | Break planning on the day plan | A first-class break row; the plan absorbs it without breaking the finish time | Spoke's "plan a break" row |

Each lands with squad + phase in the next planning pass; none reorders the queue.
