# Spoke reviews — what NZ and AU drivers say

**Date read:** 2026-10-21 · **Companion to:** `docs/study/spoke/TEARDOWN.md` (source IDs `S1`–`S44` there).
**Rule applied:** short excerpts only (one or two sentences, ≤ ~25 words each). Nothing is reproduced at length;
no review is re-typed in full. Each entry carries the source URL and the date of the review *and* the date we
read it.

---

## 0. Method and corpus — read this before quoting us

We did **not** scrape the full review corpus; stores do not allow bulk retrieval and we did not bypass them.
What we read in full was the **visible** review set on the store listings we fetched, plus search-surfaced
reviews and named third-party mirrors. This is a **qualitative, non-random sample**. Counts below are
"how many of the reviews we actually read mention this", not "how many of 186K mention this".

| Corpus slice | Where | How many we read |
|---|---|---|
| Apple App Store **NZ** — Spoke Route Planner | https://apps.apple.com/nz/app/spoke-route-planner/id1198232244 | 4 reviews visible (the listing shows 220 ratings, 4.6★) |
| Apple App Store **AU** — Spoke Route Planner | https://apps.apple.com/au/app/spoke-route-planner/id1198232244 | 4 reviews visible (1.5K ratings, 4.7★) |
| Apple App Store **AU** — Spoke Dispatch | https://apps.apple.com/au/app/spoke-dispatch/id1457736526 | 4 reviews visible (101 ratings, 4.6★) — search extract |
| Google Play **NZ** — Spoke (Circuit) Route Planner | https://play.google.com/store/apps/details?id=com.underwood.route_optimiser&hl=en_NZ&gl=NZ | 3 reviews visible (188K reviews, 4.6★, 10M+ downloads) |
| Google Play **en** — same app | https://play.google.com/store/apps/details?hl=en&id=com.underwood.route_optimiser | 3 more reviews visible — search extract |
| Google Play — Spoke (Circuit) Dispatch | https://play.google.com/store/apps/details?hl=en_ZA&id=com.circuit.team | 3 reviews visible (4.8★, 3.04K) — search extract |
| Reddit r/couriersofreddit | threads S36–S38 | 3 threads, ~15 comments read in snippet form |
| Review mirrors | appsupports.co, justuseapp.com, appslupa.com, mwm.ai, chrome-stats.com | surfaced ~40 more review texts; used for discovery, flagged as second-hand |
| Capterra AU (team product) | https://www.capterra.com.au/software/210604/Spoke | 105 reviews, 4.8★ — one quote seen via search extract; **page fetch blocked (403)** |

**NZ-specific evidence is thin.** Only one review in the visible set is by a New Zealander
("App works well, even here in New Zealand…" — iOS NZ, 2021-01-07, S13). We therefore treat NZ sentiment as
**UNVERIFIED beyond that single review**, and lean on AU evidence (same product, same Google Maps geocoder,
same fleet-market dynamics) plus international evidence, flagging the geography each time. **This is a real gap
in our research and it belongs in the founder report.**

---

## 1. What drivers praise (ranked by how often it appears in what we read)

1. **It saves real time and gets them home earlier.** The app-store feature copy itself leads with it: "I make
   more money and save around an hour a day using Spoke" (S13). A StarTrack driver (AU): "it has saved my job"
   (iOS AU, 2020-09-03, S14).
2. **Easy to learn for a new driver.** "it is user-friendly and easy to navigate" (iOS AU, 2025-04-05, S14);
   "it was easy to navigate and straight forward" (iOS AU, 2023-02-20, S14).
3. **Unlimited stops and routes on paid plans** — the single most-cited reason the product is worth paying for
   (S2 pricing; praised in iOS AU 2021-06-25, S14: "always saves my time").
4. **Address search quality.** "Auto suggestion of places is really excellent" (iOS AU, 2021-06-25, S14);
   "the accuracy in searching for addresses by name, such as schools and hospitals, is very helpful"
   (iOS AU, 2025-04-05, S14).
5. **Choice of navigation app.** "The option to choose between navigation maps, like Google or Waze, is
   fantastic" (iOS AU, 2025-04-05, S14); "really appreciate the ability to use either regular maps or third
   party maps" (iOS AU Dispatch, 2023-05-12, S19).
6. **Bulk entry actually speeds the job up.** "Scan and add addresses on Android devices" was shipped because
   it "helps to accelerate route creation and vehicle loading" (changelog, S35). A driver praises fast bulk
   upload: "I like the layout, how quickly you can upload data" (mirror, S40).
7. **Sticky per-address access instructions** are treated as a real win — drivers say notes "stick to that
   address" (help text, S8) and complain when they *don't* (AU Dispatch review, §2 P7).
8. **Free tier is genuinely usable for small runs** — "Worked really well in a pinch" (Play, 2024-11-06, S17).
9. **Fast in-app support channel exists** — live chat + screen-recording sharing in the app (S10). ("great
   communication from the Circuit staff whenever needed" — iOS AU Dispatch, 2024-01-13, S19.)
10. **Bulk edit / manual grouping / "make next"** are praised once a driver learns them: "Another positive is
    that you can manually group & order stops" (Play, 2026-09-16, S16).

---

## 2. Top ten pain points, ranked by frequency × loudness

Rank = (how many of the reviews we read raise it) × (how strongly, and how many independent channels).

### P1 — The optimiser produces a route the driver knows is worse than theirs *(loudest, most frequent)*
Channels: iOS AU, iOS AU Dispatch, Play NZ, Play en, Play Dispatch, Reddit, plus a competitor's benchmark.
> "it was having me finish 3-4 drop offs on one side of a highway, cross the highway… it was infuriating"
> (iOS review, mirror S40, read 2026-10-21)
> "it had me jumping back and forth… the stop next door further down the list"
> (iOS review, mirror S40)
> "circuit had been making me go past over 13 out of 75 stops that were literally connected to the same street"
> (iOS review, mirror S39)
> "The app has a bad habit of misplacing adress nodes, sending the driver on wrong routes"
> (Play Dispatch review, 2025-08-15, S18)
> "Allow me to make stop 5 become stop 2 without shuffling the entire stack with a series of 'make next's"
> (Reddit r/couriersofreddit, 2026-01-15, S36)
Routific's own test of the team product calls the output "spaghetti routes" and says Spoke Dispatch "doesn't
offer an easy way to edit routes" (S22 — competitor, biased, 2024-11-08).

### P2 — You cannot re-order the route the way you actually want it
Same channels, related but distinct complaint: no free drag-and-drop, "make next" is the only tool, and
"reoptimize" throws the whole order away.
> "besides not being able to drag and drop stops freely on your routes, it WAS perfect"
> (iOS AU, 2023-02-20, S14)
> "it doesn't reroute properly anymore, there is always drops labelled as '+' that even if i specify to make
> first on the run it just won't do it" (iOS AU, 2023-02-20, S14)
> "Spoke Dispatch doesn't offer an easy way to edit routes" (S22, biased)

### P3 — Price, and what happens when you try to cancel
AU, NZ and international; also the most consistent *tone* across channels.
> "The subscription price is rather hefty, would be good to see a few more options with less features I may not
> use" (iOS **NZ**, 2021-01-07, S13)
> "I'm a courier driver and been with circuit for a lot of years… recently though circuit has been taking
> double payments each month" (iOS review, mirror S39)
> "It's a nightmare to cancel it" (iOS review, mirror S39)
> "They now charge $11 for the same service that a different app will get you with a cap of 200 stops"
> (iOS review, mirror S40)
> "I'm not sure the upgraded price is worth it" (Play **NZ**-storefront listing, 2026-09-16, S16)
Billing is the single most-repeated *tag* in the aggregators: "10% of 87 recent reviews mention billing"
(mirror S41, read 2026-10-21). Reddit threads titled "Too expensive route planners?" (S37, 2024-07-05) price
Circuit above RoadWarrior, Zeo and Upper for solo drivers.

### P4 — Addresses that vanish, land on the wrong side of town, or are dropped from the route
Play NZ listing + Play en + iOS mirrors.
> "when I tap on a Southeast location, it'll put down southwest and refuses to put the southeast"
> (iOS review, mirror S40)
> "it sent me across the United States to the east Coast" (Play, 2026-06-16, S17)
> "I am noticing SpokeRoutePlanner is eliminating addresses… I had 100 pkgs typed in. At the end of my route
> I had 20 pkgs left but the route was 'complete'" (iOS review, mirror S40)
> "far behind in being able to Map new development areas… half of my addresses are in new areas"
> (Play, 2026-09-16, S16)
**NZ relevance:** new subdivisions are exactly the Christchurch/Selwyn/Waimakariri growth story. The "new
development areas" complaint is the closest proxy we have for an NZ pain point and it is also a
**data-coverage** problem Spoke cannot fix without a local gazetteer.

### P5 — Crashes, freezes, and work lost when the app dies
> "It's been crashing a lot. The screen freezes and it suddenly closes… it freezes when I try to take a photo
> and when I try to type an address" (Play, 2026-09-01, S16)
> "When it works it's great! But lately it's freezing up a lot so I have to close it then go back into it"
> (Play, 2024-08-21, S17)
> "the interface has gotten increasingly convoluted, making tasks more complicated and time consuming"
> (Play Dispatch, 2025-08-15, S18)
Spoke's own Android release notes now include "Bug fixes and lower memory use" (S16) — the vendor is
responding, but the complaint is still landing in 2026 reviews.

### P6 — Navigation quality: wrong turns, phantom turnarounds, closed roads
> "Please stop having me turn left on roads that I'm not allowed or able to turn left on… Please stop bringing
> me to destinations that don't even exist" (iOS review, mirror S39)
> "It has you driving pass drops which are a quick u-turn and 100m drive which if you don't notice will have you
> driving back to this location 4 hours later" (iOS AU Dispatch, 2023-03-31, S19)
> "the problem I have is the roads that were closed were not highlighted on the app" (iOS review, mirror S42)
> "it also needs to add road construction and accidents somehow" (Play, 2024-08-21, S17)
Root cause is structural: Spoke's navigation is **Google Maps'** navigation with Spoke's stop list bolted on.

### P7 — Nothing sticks to a stop unless you retype it
The mirror image of P1–P2 and the thing we most wanted to beat.
> "Can't save and leave delivery notes against regular drops on permanent basis so you need to add this every
> time" (iOS AU Dispatch, 2023-03-31, S19)
> "I'm missing a very important option: a resource to create a database of clients. Every day when you type the
> same clients visited during the week it is like the first time. The app doesn't know or learn itself"
> (Play Dispatch, 2019-07-18, S18)
> "I hate that it doesn't have like a master store list. I wish the notes updated across all routes"
> (iOS review, mirror S42)
**Important nuance for our own claims:** Spoke *does* have per-address **sticky access instructions** (S8). The
complaint is that it is **text-only, per address, opt-in, and does not extend to notes, door location, or a
learned client library**. Our door memory must therefore beat *that*, not a blank slate.

### P8 — Offline / dead-zone behaviour
> "It works well for well-established neighborhood deliveries… far behind in being able to Map new development
> areas" (Play, 2026-09-16, S16 — a rural/periphery complaint)
Mirror summaries list "high battery consumption" and "syncing issues across devices" among the recurring bugs
(S41, read 2026-10-21); the Dispatch summary notes "can show routes even without network" as a *pro* (S43).
Spoke's own position: the saved route works offline; **live traffic, map updates and manifest analysis need
data** (S2, S7). For Canterbury's rural runs this is a **beating opportunity, not a matching one**.

### P9 — Support that does not answer
> "Requested for help and got reply after 24hrs" (iOS review, mirror S39)
> "They don't reply to you" (iOS review, mirror S39)
> "They also do not respond to the chat on their website, and are not efficient in responding to email
> enquires" (iOS AU Dispatch, 2020-04-23, S19)
> "Support needs A LOT of work" (Play Dispatch, 2020-06-22, S18)
Spoke sells **live chat support** on every Dispatch plan (S3, S5) — so this is a delivery failure, not a
missing feature.

### P10 — Vendor churn and "it got worse" after updates
> "then maybe a little less then a month ago the app changed and not only is the new lay out not as good, there
> is multiple bugs" (iOS AU, 2023-02-20, S14)
> "Made it worse with the update… Whoever thought auto-capture would be faster or more convenient than manually
> taking a photo seriously needs to reconsider this decision" (iOS review, mirror S41)
> "the browser interface has not allowed me to do something as simple as pasting spreadsheet data" (Play
> Dispatch, 2025-08-15, S18)
Also the "suddenly stopped working and insisting I upgrade" pattern (iOS review, mirror S39).

**Runners-up (seen repeatedly but lower volume):** battery drain / overheating (mitigated by the Android-only
battery saver, S29); "one-time payment instead of a subscription" (iOS AU, 2021-06-25, S14); no pause/route
restart (iOS AU, 2025-04-05, S14); no CRM/CSV export for the driver (iOS AU, 2025-04-05, S14); no start-date/
start-time editing on the route (iOS review, mirror S39 and iOS AU 2025-04-05); "package finder is just a code,
it doesn't tell me *where* in the van" (echoed in the Dispatch dashboard complaints, S18/S22).

---

## 3. Privacy and trust signals (the quiet differentiator)

Both the NZ and AU App Store listings declare, for Spoke Route Planner:
- **Data used to track you:** Identifiers, Usage Data.
- **Not linked to you, used for third-party advertising:** Usage Data → Product Interaction.
- **Analytics:** Identifiers, Device ID; **App functionality:** Diagnostics (crash, performance).

Google Play's Data safety panel for the NZ storefront declares: shares **Location, Personal info and 3
others**; collects **Location, Personal info and 4 others**; encrypted in transit; **deletion can be requested**
(S16). Spoke's manifest OCR and voice dictation are **server-side** features (S7, S27, S28), so a driver's
voice and the image of a delivery manifest transit Spoke's infrastructure.

**None of this is a complaint** — no driver review we read raised privacy. It is a **structural** difference we
can own: our on-device audio (D23 / V4 §13.6) and NZ Privacy Act 2020 posture (T7.15) answer a question Spoke
has not answered publicly. We should make that argument **without accusing Spoke of wrongdoing**.

---

## 4. What the driver interviews and Reddit say about *choosing* against Spoke

- Drivers compare apps on price and on whether the optimiser respects their local knowledge (S37, S38).
- One StarTrack driver asked for **label scanning and in-app navigation** in 2020 (iOS AU, S14) — Spoke shipped
  label scanning later (S35); **in-app navigation is still Google Maps'**, which is why P6 persists.
- The Reddit feedback request from Spoke's own product owner (2026-01-15) is a signal of intent: they are
  actively soliciting route-re-ordering complaints (S36). **Assume Spoke is fixing P1/P2 in the next 6–12
  months**; our moat must be door memory + NZ addresses + offline + voice, not re-ordering UX.
- Capterra AU (105 reviews, 4.8★) — one visible quote: "I love the ease of adding stops to a route but don't
  like that the app seems 'cheap' for such a 'higher' price" (2025-09-20, S44; search extract only, page
  blocked). **Team-product sentiment is generally positive** — we are not fighting Spoke Dispatch for the
  franchise owner yet.

---

## 5. How this changes our priority order

1. **Beat the optimiser, do not fight it.** P1/P2 are Spoke's weakest point *and* the most likely to be fixed.
   Our answer: the **driver's template wins** (one-tap rebuild from the driver's own route and rules), plus
   **spoken rules** ("no Harewood after 3") — not a better solver. Spoke *does* offer "Skip optimization" and
   "Update route" (not "Reoptimize"); we must at least match those two affordances.
2. **Win NZ addresses and new developments.** P4 is a data problem and it is ours to win (LINZ, T4/D8).
3. **Own offline.** P8 is a rural-Canterbury wedge. **Own the stop record.** P7 is where door memory +
   templates + a client library beat "sticky text notes". **Own voice while driving.** Spoke's voice is
   *entry only* (T7.4–T7.6). **Never lose their data.** P5 (crashes) and P3 (billing) are the two
   trust-killers; our event-log sync (T7.1) and honest billing (T7.13) are the answers.

---

## 6. Limitations of this file

- The visible-review corpus is small and **not randomised**; store listings show the most helpful/recent
  reviews, not a random sample.
- Only **one** review in the visible set is from an NZ driver. **NZ-specific sentiment beyond that is
  UNVERIFIED.** A targeted NZ/AU driver study (App Store/Play NZ filters, NZ courier Facebook groups, Trade Me /
  Seek courier forums, and 5 interviews with Canterbury contractors) is an open action — it is not done by this
  file.
- Review mirrors (S39–S43) quote reviews we could not re-open on the store at read time; they are second-hand
  and are never the only evidence for a ranked pain point. Capterra's AU page could not be fetched (403) — its
  content here is a search extract only. **Facebook driver groups were not accessible without an account, so
  no Facebook quotes are used in this file.**
