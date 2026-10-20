# BEAT-SPOKE — feature-by-feature MATCH / BEAT / SKIP

**Date:** 2026-10-21 · **Inputs:** `docs/study/spoke/TEARDOWN.md` (evidence, source IDs `S1`–`S44`),
`docs/study/spoke/REVIEWS.md` (pain points `P1`–`P10`) · **Binding:** V4 §13.2, MASTER_EXECUTION §4 (P5),
`docs/PARITY.md`, `docs/QUALITY_SCORECARD.md`.

**Verdict key**
- **MATCH** — Spoke has it; we must have it, no worse, in the touch UI *and* the voice UI (§9 of MASTER_EXECUTION).
- **BEAT** — Spoke has it; we must ship something **measurably better** (a named advantage + a number).
- **BEAT (new)** — Spoke does **not** have it; we own it outright.
- **SKIP** — we deliberately do not build it, with the reason written (PARITY rule: a `Skip` needs a reason).

**Task-id convention.** `T7.n` = the 17 numbered product items in **MASTER_EXECUTION §4 P5** (P5 lists 1–17:
1 Sync, 2 Routing+templates, 3 Door memory, 4 Dictation, 5 Live voice agent, 6 Voice tool catalogue,
7 Driving mode + nav, 8 Label scanner, 9 POD, 10 Customer SMS, 11 IRD logbook, 12 Web dashboard,
13 Stripe billing, 14 Teams/dispatch, 15 Import from Spoke, 16 Onboarding, 17 Beta programme).
`docs/KICKOFF_V3_EN.md` T7 lists only 1–15 and its item 15 is "PIA / store assets / handover / v1.0.0",
which is MASTER_EXECUTION P5 items 15–17 split differently. **Both readings are shown in §E.**
`P1`–`P7` = MASTER_EXECUTION §4 phase order. `T4` = LINZ addresses, `T5` = offline maps, `T6` = design.

---

## A. Stop entry and day setup

| # | Spoke capability (source) | Verdict | Our concrete advantage | Task | Proof needed |
|---|---|---|---|---|---|
| A1 | Type an address into Google-Maps search (S6, S7) | MATCH | Same tap count; our search is biased to Christchurch + LINZ and shows a **confidence colour** | T4 | taps/stop ≤ Spoke; 98.3 % correction accuracy already measured (`docs/evidence/phase-2.3/linz-accuracy.md`) |
| A2 | Long-press the map to drop a pin (S6) | MATCH | Our pin drop **teaches door memory** (PARITY row 8) | T7.3 | the fix becomes a remembered door, not just a pin |
| A3 | **Voice dictation of many addresses in one go**, with per-stop playback and "looks incorrect" flags (S28, 2026-04-22) | **BEAT** | Same bulk dictation **plus** a LINZ-verified correction report ("you said X → corrected Y") and **offline** capture; Spoke uploads for analysis | T7.4 | ≥ 97 % intent accuracy; offline bulk dictation on the emulator with airplane mode |
| A4 | Camera scan of one address label, language picker (S35) | BEAT | On-device, offline, **NZ-address-only** scanner; Spoke's is cloud-shaped | T7.8 | ≤ 1.5 s/label; works in airplane mode on 300-label eval set |
| A5 | **Manifest OCR** — photograph a list, or import a PDF/image, Spoke analyses it server-side (S7, S27, 2026-06-01) | **BEAT** | On-device OCR + on-device D8 correction **before** the stop is created; Spoke's requires upload (S27) | T7.8 | ≥ 95 % address extraction on NZ manifests, offline |
| A6 | Spreadsheet import — **Android only** (S6, S7) | BEAT | Works on **iOS and Android**, column mapping by LLM (PARITY row 1) | T7.4 | import a Spoke-exported CSV on both platforms |
| A7 | Copy stops from a past route (S6, S8) | MATCH | Superseded by a better feature — the **one-tap template rebuild** (T7.2) | T7.2 | one tap rebuilds the day with rules |
| A8 | Transfer stops to another driver by QR code (S8, S31) | SKIP | Not in our scope at v1; note it — Spoke may use it to move work between relief drivers | — | re-evaluate when T7.14 lands |
| A9 | **Paste a plain-text list** — *not documented by Spoke anywhere* | **BEAT (new)** | We support paste/email/manifest text extraction with D8 correction (PARITY row 2, FINAL_PROMPT §4.5 `import_list`) | T7.4 | paste a WhatsApp list → corrected stops |
| A10 | "Skip optimization" when creating a route (S6, S7) | MATCH | Must exist; our version is a first-class **"driver wins" mode**, not a hidden overflow item | T7.2 | a stop in the spec, a screen in T6 |
| A11 | Route name + date + start/end + Roundtrip + depart time (S6) | MATCH | Roundtrip + "learns the real dwell time per address" | T7.2 | — |
| A12 | Planned breaks with a time window (S7) | MATCH | Breaks must be in the solver constraints, and **spoken**: "I'll break at 12" | T7.2, T7.6 | — |
| A13 | **Paste into the Dispatch web dashboard** — drivers complain it regressed (REVIEWS P10, S18) | BEAT (new) | Our web dashboard paste must work and must be **voice-editable** | T7.12 | paste test in the web E2E |

## B. Route optimisation and re-ordering

| # | Spoke capability (source) | Verdict | Our concrete advantage | Task | Proof needed |
|---|---|---|---|---|---|
| B1 | One-tap **Optimize**, traffic-aware with a depart time (S6, S21) | MATCH | Solver: Valhalla + VROOM, benchmarked against OR-Tools (PyVRP/VROOM) | T7.2 | VRP eval set; ≤ 5 s for 200 stops; within 5 % of best known |
| B2 | `Update route` (slot changes in) **vs** `Reoptimize route` (rebuild everything) (S9) | MATCH | Same distinction, but with a **spoken** "update, don't re-optimise" and a guard that refuses to reshuffle a day the driver has already shaped | T7.2, T7.6 | acceptance test: reoptimise never moves a "make next" or "first" stop |
| B3 | `Refine` → draw circles on the map to group stops, then reoptimise (S7, S8, S12 2026-08-21) | MATCH | Same gesture, plus **voice**: "do Hornby first, then the airport" | T7.2, T7.6 | — |
| B4 | `Reverse route` (S8) | MATCH | Same, voice-able | T7.2, T7.6 | — |
| B5 | Mid-route `make next`, multi-select via bulk edit (S9) | MATCH | Same, plus **spoken** "next stop is …" that writes the template rule | T7.2, T7.6 | — |
| B6 | Time windows per stop (S8) | MATCH | Set by **natural language** ("pharmacy after 2pm") — PARITY row 10 | T7.2 | — |
| B7 | Time at stop, average time at stop (default 1 min) (S8, S11) | BEAT | We **learn the real dwell time per address** (PARITY row 12) | T7.2 | dwell-time accuracy on a real Christchurch day |
| B8 | Priority = First / Auto / Last (S8) | MATCH | Rules remembered across days (PARITY row 11) | T7.2 | — |
| B9 | Delivery vs Pickup type, colour, package count (S8) | MATCH | Same; pickup/delivery pairing is a hard solver constraint (PARITY row 14) | T7.2 | — |
| B10 | **Reusable stop types** with colour + order + window + time (S8, 2026-08-05) | MATCH | Our equivalent is the **saved template + rules engine**, which is strictly more powerful | T7.2 | — |
| B11 | Vehicle type: Bicycle / Scooter / Car / Small Truck / Large Truck (S11) | BEAT | **Bike/e-bike profiles via Valhalla**, plus NZ-relevant road restrictions | T7.2 | — |
| B12 | **Stop side of the road** (either / right only / left only) (S11) | BEAT | **NZ drives on the left** — we make the driver's door side the default and enforce it in the solver | T7.2 | solver constraint test |
| B13 | Avoid tolls (S11) | MATCH | Same + NZ road/bridge restrictions as we verify them | T7.2 | — |
| B14 | Custom delivery zones / polygons (Dispatch) (S3) | MATCH | PostGIS polygons over the **real Canterbury** data (PARITY row 16) | T7.14 | — |
| B15 | Max stops per route, driving speed, delivery speed per route (Dispatch) (S4) | MATCH | Same knobs in the dispatcher console | T7.14 | — |
| B16 | Optimiser "knows better than the driver" (REVIEWS P1, P2) | **BEAT** | **The driver's template and rules win.** Our route is built from what the driver actually did yesterday, not from a global optimum | T7.2 | a template-driven day beats a pure-optimiser day on the driver's own metrics (stops/hr) in the beta (T7.17) |
| B17 | **One-tap rebuild of the day from a template** — *not a Spoke feature* | **BEAT (new)** | Our headline: rebuild the day + rules in one tap | T7.2 | ≤ 1 tap, ≤ 2 s |
| B18 | **Spoken rules** ("no Harewood after 3") — *not a Spoke feature* | **BEAT (new)** | Voice → structured constraint → applied every day | T7.2, T7.5 | rule survives a rebuild |

## C. The stop record: notes, access, memory, packages

| # | Spoke capability (source) | Verdict | Our concrete advantage | Task | Proof needed |
|---|---|---|---|---|---|
| C1 | **Sticky access instructions per address** (gate code, key location) (S8) | **BEAT** | Spoke stores **text only, per address, opt-in**. We store a **door-level location** (which door, which side of a drive-by), read it out on arrival, and learn it across deliveries | T7.3 | door memory hit rate over 2 deliveries; spoken on arrival |
| C2 | Notes on a stop (S8) | BEAT | Notes + photos + **voice note**, and they survive into the template | T7.3, T7.9 | — |
| C3 | Photo attached to a stop (S8) | MATCH | Same + POD photo in one flow | T7.9 | — |
| C4 | **Package finder**: size + a van-location code (S8) | **BEAT** | **"Where is parcel 4?" answered by voice**, plus the **van map** (shelf layout) — Spoke gives a mnemonic code only | T7.2, T7.5 | parcel located by voice in ≤ 10 s |
| C5 | Stop IDs, Modern (A1) or Legacy (1) format, assigned after optimise (S11) | SKIP | Replaced by our own parcel/QR reconciliation (T7.8) | — | — |
| C6 | "Access instructions" are free text, **no location, no voice, no learning** (S8) | **BEAT (new)** | See C1 — this is our named advantage #3 in PARITY | T7.3 | — |
| C7 | **Client/address library** — drivers ask for one and Spoke has none (REVIEWS P7, S18) | **BEAT (new)** | Our template + door memory + reusable stops give the same outcome | T7.2, T7.3 | — |

## D. Driving, navigation, POD, notifications

| # | Spoke capability (source) | Verdict | Our concrete advantage | Task | Proof needed |
|---|---|---|---|---|---|
| D1 | Internal navigation powered by **Google Maps** (S10, S30) | MATCH | We hand off to the driver's nav app **and** add a voice overlay (PARITY row 21) | T7.7 | hand-off in ≤ 1 tap; door note read on arrival |
| D2 | Alternative nav apps: Apple Maps, Waze, HERE WeGo, Sygic (S2, S11) | MATCH | Same list + a per-device default | T7.6 | — |
| D3 | Satellites view, disruption alerts (crash, police, speed camera, roadworks …) from Spoke + Google + Waze (S9, S11) | MATCH (partial) | Our own **report_hazard / report_map_error** tools; we do not attempt to re-build Waze's crowdsourced layer | T7.7 | — |
| D4 | Auto-start navigation after each delivery (S11) | MATCH | Same setting, voice-changeable | T7.6, T7.7 | — |
| D5 | Android Auto / CarPlay projection (S10) | MATCH | Same; plus our voice assistant works on the road without a head unit | T7.7 | — |
| D6 | **No voice control of the app while driving** (no spoken "delivered") | **BEAT (new)** | Our core: earbud buttons, spoken "delivered", swipe + undo | T7.5, T7.6 | hands-free delivery confirmed on the emulator |
| D7 | Mark Delivered / Failed / Picked up; swipe left/right to mark and undo (S9) | MATCH | Same swipe + 5 s undo (INNOVATION "one-swipe delivery") | T7.9 | — |
| D8 | **No documented failed-delivery reason codes, no re-attempt scheduling** | **BEAT (new)** | The reason is **spoken**; the retry is scheduled for tomorrow | T7.9 | — |
| D9 | POD: signature, photo, geotag + timestamp, strictness control (Dispatch) (S3, S5); a POD screen also exists in the solo app (S16) | MATCH + BEAT | **POD never paywalled**, included in the base tier (PARITY row 23); **POD by voice**; offline-safe signature | T7.9 | POD completes in airplane mode |
| D10 | **No voice POD** | **BEAT (new)** | "Delivered, left with the neighbour" — spoken POD | T7.9 | — |
| D11 | Dispatch SMS + email notifications, custom sender name, branded recipient page, recipient leaves instructions (S3, S4) | MATCH | Optional, **off by default**, rate-limited (D5), plus a live-tracking page | T7.10 | SMS consent + opt-out tested |
| D12 | **No customer SMS on the solo plan** (S2) | **BEAT (new)** | Solo driver gets ETA SMS in the base tier | T7.10, T7.13 | — |
| D13 | **Share live route** link (S7) | MATCH | Same, plus our ETA is accurate because we run offline-capable routing | T7.10, T7.12 | — |
| D14 | Battery saver mode — **Android only** (S10, S29) | BEAT | Battery-aware adaptive pings (≤ 8 %/h) + keep-awake only while driving (MASTER_EXECUTION §7.5) on **both** platforms | T7.1, T7.7 | battery per hour measured in the benchmark |
| D15 | **No offline map of the driver's region** | **BEAT (new)** | PMTiles Canterbury (T5) + day/night styles | T5 | map fully usable offline |

## E. Offline, sync, reliability

| # | Spoke capability (source) | Verdict | Our concrete advantage | Task | Proof needed |
|---|---|---|---|---|---|
| E1 | Saved route works offline; live traffic, map updates and **manifest analysis** need data (S2, S7, S10) | **BEAT** | **Every** driving-day action works with no network: stop entry, correction, routing, POD, outcome, template rebuild | T7.1 | airplane-mode chaos test, zero data loss |
| E2 | No documented offline POD / offline stop editing / conflict rules | **BEAT (new)** | op-sqlite event log ↔ Postgres with tested conflict rules | T7.1 | 0 data loss under kill/duplicate/reorder |
| E3 | No cross-device sync story for solo drivers | BEAT (new) | Cloud sync across device + web | T7.1 | sync p95 ≤ 60 s |
| E4 | Crashes / freezes reported by drivers (REVIEWS P5, S16, S17) | BEAT (new) | Crash-free sessions ≥ 99.5 % as a release gate | T7.17 | CI-measured crash-free rate |

## F. Teams, dispatcher, web

| # | Spoke capability (source) | Verdict | Our concrete advantage | Task | Proof needed |
|---|---|---|---|---|---|
| F1 | Dispatcher web dashboard, live map + timeline, multi-route (S3, S4) | MATCH | Same surface | T7.12, T7.14 | — |
| F2 | Permissions: driver-created vs dispatcher-created routes; driver settings (S3, S4) | MATCH | owner / dispatcher / driver roles with **RLS on every query** | T7.14 | tenant-isolation tests (Better Auth advisory open) |
| F3 | Read/Write API, Webhook API, Zapier, Shopify (S3, S4, S5) | MATCH (P5) | FastAPI OpenAPI + HMAC-signed webhooks | T7.13 | contract tests from the spec |
| F4 | Spoke Connect client portal (S4) | SKIP (v1) | Not required for an NZ owner-driver; revisit at Team tier | — | — |
| F5 | SSO + Directory Sync (Expert only) (S3, S5) | SKIP (v1) | Revisit when a franchise asks | — | — |
| F6 | Data history 30 d / 1 y / 5 y; performance analytics; manifests (S3, S5) | MATCH | Searchable route history + **IRD logbook PDF** (Spoke has no earnings/IRD feature) | T7.11, T7.12 | — |
| F7 | Driver live location tracking (S3) | MATCH | Battery-aware adaptive pings ≤ 8 %/h | T7.1 | battery benchmark |
| F8 | **No NZ carrier integration** found in public sources | **BEAT (new)** | NZ-client aggregation is our thesis; **Import from Spoke** (CSV/Excel) is a planned task | T7.14, T7.15 | a driver imports a real Spoke export and gets a route |
| F9 | Dispatch: load checks, cash on delivery, geofencing-restricted deliveries (S5 — the last two "Coming soon") | MATCH (geofence) / SKIP (COD) | Our geofence auto-arrival is live in the plan and beats a "coming soon" | T7.3 | auto-arrival opens the stop card |
| F10 | Dispatch: personalised onboarding only on the $1000 Expert plan (S3) | BEAT (new) | Voice-guided onboarding (≤ 2 min) on **every** plan | T7.16 | — |

## G. Settings, onboarding, languages, accessibility, price

| # | Spoke capability (source) | Verdict | Our concrete advantage | Task | Proof needed |
|---|---|---|---|---|---|
| G1 | Route/nav/general/subscription settings; theme light/dark/auto/follow-system; units from phone language (S11) | MATCH | Every setting also changeable **by voice** (PARITY row 45) | T7.6 | `change_setting` tool tested for every setting |
| G2 | 19 UI languages, phone-language driven, US English fallback (S13, S14) | **BEAT (new)** | Tier A offline languages incl. **te reo Māori, Mandarin, Hindi/Punjabi, Samoan/Tongan** — none of which Spoke has | T7.5, T7.16 | per-language eval sets (D3) |
| G3 | **"The developer has not yet indicated which accessibility features this app supports"** (S13, S14) | **BEAT (new)** | We ship a full a11y declaration: VoiceOver/TalkBack, 200 % text, contrast, reduced motion, big-glove mode | T6, T7.16 | a11y gate in CI + screenshots at 200 % text |
| G4 | In-app `?` → live chat, help guides, screen recording (S10) | MATCH | Plus a multilingual **AI help agent grounded in our docs** | T7.12 | — |
| G5 | Getting-started in 3 steps (S6) | BEAT | **Voice-guided** first route, ≤ 2 min | T7.16 | onboarding < 2 min measured |
| G6 | Lite $9.99 / Standard $19.99 US (≈ NZ$30 + 15 % GST ≈ NZ$34.99) — NZD unverified (S2, S13) | **BEAT** | NZD, GST-inclusive, **POD never paywalled** (PARITY row 43) | T7.13 | Stripe NZD pricing published in-app |
| G7 | Dispatch $125 / $200 / $1000 per month, USD only, **priced by stops** (S3, S5) | MATCH | Price by **driver** for NZ teams (franchise reality: 1–5 drivers), stop-priced as an option | T7.13, T7.14 | — |
| G8 | Free tier capped at 10 stops per route (S2) | MATCH | Keep a free tier; decide the cap against Spoke's 10 | T7.13 | pricing decision in DECISIONS.md |

---

## H. The five we MUST match (build risk if we skip)

These are table stakes: a NZ driver who has used Spoke will notice their absence on day one.

| # | Must match | Why (evidence) | Task | Acceptance |
|---|---|---|---|---|
| M1 | **Manual route control**: skip optimisation, manual grouping, reverse, make-next, and **update ≠ reoptimise** | REVIEWS P1/P2 — the #1 complaint; S7, S8, S9 | T7.2, T7.7 | All six affordances exist in the touch UI **and** have a voice tool |
| M2 | **Bulk stop entry**: voice-many, camera label scan, manifest scan/import, spreadsheet import (iOS **and** Android) | S7, S27, S28, S35; Spoke shipped all of these in 2026 | T7.4, T7.8 | 25 stops from a photographed NZ manifest in ≤ 60 s, offline |
| M3 | **Route outcomes + stop record**: time windows, priority First/Last, time at stop, breaks, delivery/pickup, notes, photos, sticky access instructions, package finder | S7, S8, S11 | T7.2, T7.3, T7.9 | Every stop attribute round-trips offline |
| M4 | **Navigation + driving ergonomics**: internal/hand-off nav, satellite, auto-continue, Android Auto/CarPlay, swipe to mark + undo, battery saver | S9, S10, S11, S29 | T7.7 | 200-stop day with no app switch more than once; battery ≤ 8 %/h |
| M5 | **POD + delivery outcomes**: photo, signature, geotag + timestamp, delivered/failed/picked-up | S3, S5, S9, S16 | T7.9 | POD completes offline, on the free tier, with the reason captured |

## I. The five we BEAT outright (the launch story)

| # | Beat | Spoke's position | Our position | Task | The number we publish |
|---|---|---|---|---|---|
| B1 | **Hands-free by default** | Voice is **entry only**; no spoken "delivered", no spoken re-order, no spoken outcome reason (S6–S11, S28) | The whole shift runs on voice; earbud buttons 1/2/3; voice on-device by default | T7.4, T7.5, T7.6 | ≤ 700 ms command→action on device; ≥ 97 % intent accuracy; **audio never leaves the phone by default** |
| B2 | **NZ addresses that explain themselves** | Google Maps geocoding; errors are "flagged"; the only fix for missing addresses is a **UK-only** dataset (S8, S34); new developments unmapped (REVIEWS P4) | LINZ-backed D8 engine: corrects, **says what it changed**, asks only when unsure; RD/unit/te reo aware | T4 | **98.3 %** on 600 real LINZ checks (measured); wrong-house corrections at confidence ≥ 0.9 = 0 (to be measured) |
| B3 | **Door memory** | Free-text access instructions that stick to one address; no door location, no arrival read-out, no learning (S8); drivers still retype notes (REVIEWS P7) | Door-level location keyed to the LINZ address, learned over 2 deliveries, **spoken on arrival**, correctable with one tap | T7.3 | hit rate and zero wrong-door reads measured in the beta (T7.17) |
| B4 | **Online AND offline** | Saved route only; live traffic, map updates and **manifest analysis** need data (S2, S7); no offline map | Every driving-day action works with no signal; offline Canterbury map; on-device OCR and STT | T5, T7.1, T7.8 | airplane-mode chaos test: **0 data loss**; offline day completed end-to-end |
| B5 | **Price + trust** | ~US$19.99 (≈ NZ$35 with GST, NZD unverified); billing is the top complaint; POD is a Dispatch/plan feature; USD-only team pricing (S2, S3, REVIEWS P3) | NZD, GST-inclusive, **POD in the base tier**, honest one-tap cancellation, no stop-meter traps | T7.13 | published NZD price sheet; POD never paywalled; a published "no surprise charges" promise |

*Runner-up beats (for the founder report):* **voice-guided onboarding on every plan** vs Spoke's
personalised onboarding on the $1000 tier (G10/F10); **19 languages vs 19 languages but ours include te reo,
Mandarin, Hindi, Samoan/Tongan** (G2); **a11y declared** vs Spoke's blank declaration (G3); **IRD logbook +
earnings** vs nothing (F6).

---

## J. Spoke features WE do not have and must not lose sight of

These are **not** on our P1–P7 list. Each is either a Dispatch-only capability (deferred by design) or a gap
in `docs/PARITY.md` that should become a task before v1.

| Spoke feature | Source | Our status | Action |
|---|---|---|---|
| Custom stop types (preset on an address) | S8 | ~T7.2 templates | Merge into the template concept |
| Breaks with time windows | S7 | T7.2 (planned) | Keep |
| Stop side of the road | S11 | T7.2 (planned) | Keep, NZ-left default |
| Package finder van codes | S8 | T7.2 (planned) | Beat it (van map + voice) |
| Disruption alert reporting | S10/S11 | T7.7 `report_hazard` | Beat it with our own hazard notes per team |
| Branded recipient page / custom sender ID | S3 | not planned | Team-tier backlog (T7.14) |
| Cash on delivery | S5 (coming soon) | not planned | Low priority for NZ |
| Route spreadsheet upload on Android | S7 | T7.4 | Beat it (cross-platform) |
| "Update route" vs "Reoptimize route" | S9 | T7.2 | Match explicitly |
| Mass-export/print stop metering (a Spoke revenue trap) | S3, S5 | n/a | Note in pricing: no charge to export your own data |

---

## K. Risks and the watch-list

1. **Spoke is fixing P1/P2.** Their product owner asked the community for route-re-ordering feedback in
   January 2026 (S36). Assume a better re-order UI in 6–12 months. **Do not build our moat on re-ordering UX.**
2. **Spoke ships voice.** It already does bulk dictation (S28). Their next move is plausibly voice commands
   while driving. Our window is the **on-device, offline, all-languages, whole-shift** version — and our NZ
   data and door memory, which they cannot copy quickly.
3. **Google Maps is their engine.** Any Google geocoding or navigation regression hits them harder than us —
   but it also means their improvements in navigation are free to them and cannot be matched by us at
   comparable cost. Compete on the **things Google does not know**: NZ addresses, doors, offline.
4. **NZ demand is unverified.** Our evidence is one NZ App Store review. Before we publish a competitive claim
   we should run a small NZ/AU driver study (5 interviews, NZ store filters, NZ courier groups). **This is an
   open research gap, not a closed one.**
5. **NZD pricing unverified.** We have US prices and an unlabelled App Store string. Before we publish "we are
   NZ$X/month", verify the NZ storefront price.
6. **Lite-vs-Standard gap unverified.** If Lite is genuinely crippled, our packaging argument ("one price,
   everything") is stronger than we can currently prove. Verify from a NZ checkout.
7. **Our own numbers are mostly UNVERIFIED.** `docs/QUALITY_SCORECARD.md` says five of six dimensions are
   unmeasured. **We cannot ship the beat claims above until the measurements exist** — every "the number we
   publish" in §I is a target, not a result.

---

## L. Task map (T7.1–T7.17, MASTER_EXECUTION §4 P5)

| T7.n | MASTER_EXECUTION P5 item | Spoke features it must cover | Verdict | Notes |
|---|---|---|---|---|
| T7.1 | Sync (Courier Sync: op-sqlite ↔ Postgres) | Spoke has no documented offline/sync story (S2, S7) | **BEAT (new)** | E1–E4, D14, F7 |
| T7.2 | Routing + saved templates (Courier Route) | Optimise, skip optimisation, manual grouping, reverse, make-next, update vs reoptimise, windows, priority, time at stop, breaks, vehicle, stop side, tolls, zones, package finder | MATCH + BEAT | A, B; §B16–B18; must-match **M1** |
| T7.3 | Door memory | Sticky access instructions (S8) | **BEAT** | C1, C6, C7, F9 |
| T7.4 | Dictation mode | Bulk voice dictation, spreadsheet import, paste, copy stops (S7, S28) | MATCH + BEAT | A3, A6, A7, A9 |
| T7.5 | Live voice agent (Courier Voice, on device) | Spoke has **no** voice control while driving | **BEAT (new)** | D6, G2, C4, B18 |
| T7.6 | Full voice tool catalogue | every Spoke action must have a voice twin | MATCH | G1, B2, B5, D6 |
| T7.7 | Driving mode + turn-by-turn | Internal nav, hand-off, satellite, disruption alerts, auto-continue, Auto/CarPlay, battery saver (S9, S10, S11) | MATCH + BEAT | D1–D5, D14, D3 |
| T7.8 | Label scanner (Courier Scan, address-only) | Camera label scan, manifest OCR (S27, S35) | **BEAT** | A4, A5, E1 |
| T7.9 | POD (photo/signature/voice) + failed reasons | POD, outcomes, swipe+undo (S3, S5, S9) | MATCH + BEAT | D7–D10; must-match **M5** |
| T7.10 | Customer SMS/ETAs | Dispatch SMS/email, recipient page, share live route (S3, S4, S7) | MATCH + BEAT | D11–D13 |
| T7.11 | IRD logbook PDF (map-matched km) | **Spoke has no earnings/IRD feature** | **BEAT (new)** | F6 |
| T7.12 | Web dashboard + admin | Dispatcher dashboard, live map/timeline, history, manifests, analytics, help (S3, S4) | MATCH | F1, F6, G4, A13 |
| T7.13 | Stripe NZD Trial/Solo/Team | Free / Lite / Standard; Dispatch per-stop (S2, S3) | MATCH + BEAT | G6, G7, G8; F3 |
| T7.14 | Teams/dispatch | Roles, permissions, zones, live tracking, APIs, driver settings (S3, S4) | MATCH | F1, F2, F8 |
| T7.15 | Import from Spoke & other planners | Spoke exports spreadsheet / manifest (S7, S3) | **BEAT (new)** | F8 — a driver imports their own Spoke history |
| T7.16 | Onboarding + in-app tips (≤ 2 min, voice-guided) | 3-step getting started; personalised onboarding on $1000 tier only (S6, S3) | **BEAT** | G5, F10, G2, G3 |
| T7.17 | Beta programme (5–10 drivers, feedback, crash reports) | — (Spoke ships "bug fixes and lower memory use" (S16)) | **BEAT (new)** | E4; the measurement engine for every claim in §I |

`docs/KICKOFF_V3_EN.md` T7.15 = "PIA, store assets, acceptance test on the CI emulator, handover, v1.0.0" —
that is MASTER_EXECUTION **T7.15 + T7.16 + T7.17** plus P6. Both readings are recorded here so no task is
double-counted or dropped.

---

## M. One-line verdict

**We match Spoke's routing, stop-record, navigation, POD, team and settings surfaces — and we lose today on
measurement (five of six scorecard dimensions are UNVERIFIED). We beat Spoke outright on the four things it
cannot copy quickly: NZ address intelligence with an explanation, door memory, an offline-complete day, and
voice that runs the whole shift on-device — and we win on price, languages, accessibility and onboarding
because Spoke sells those only at the top of its price ladder.**
