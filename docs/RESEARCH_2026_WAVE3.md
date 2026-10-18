# Research wave 3: competitor service parity + prompt-to-app builders

## Solid foundation (must exist before launch)

- Auth, accounts and conflict-safe cloud sync between the app and web
- Address pipeline: Christchurch-biased autocomplete, LINZ validation and auto-correction, pin-drop fix saved per address
- Stop import: CSV/Excel with LLM column mapping, paste or email extraction, camera label OCR, voice dictation
- Route optimisation with VROOM or OR-Tools on OSRM: unlimited stops, time windows, priority/first/last, start/end, service time
- Mid-route re-optimisation and adding a stop from the current position
- Map and list view with drag or voice reorder
- Navigation hand-off to Google Maps, Waze and Apple Maps
- Door memory per address, read aloud on arrival
- Proof of delivery (photo, signature, GPS/timestamp) and delivery outcomes / failed-attempt reasons with rescheduling
- Offline mode: cached route plus a queue for POD and edits
- Saved/recurring routes with learned rules, and route history
- Package load-position finder
- Background GPS tracking (battery-aware)
- Live voice assistant (LangGraph) with a tool for every service above
- Settings screen, all changeable by voice
- Billing: free tier, trial, NZD plan via Stripe/RevenueCat; POD not gated
- Voice-guided onboarding (first route)
- Basic NZ Privacy Act data handling, plus error monitoring and a test suite on the routing and address services

## Builder plan

Answer to the founder: the prompt-to-app repo you saw is bolt.diy (github.com/stackblitz-labs/bolt.diy, MIT, self-hosted, works with your own Claude/OpenAI keys). It is the right one to customise, but only as an internal tool for speeding up screens. It cannot rebuild Courier Copilot.

WHICH: bolt.diy as the main internal builder, run on our own server with Docker and a Claude API key. Optionally Dyad (Apache-2.0, runs locally) for Next.js admin pages. Expo Agent (commercial beta, unverified) goes on the watch list for work inside the existing Expo repo. Avoid Convex Chef, which locks you into Convex while we use Postgres. Also avoid Open Lovable and Anything. Lovable, Bolt.new, v0 and Rork are for throwaway demo mockups only.

HOW TO CUSTOMISE:
(1) Fork bolt.diy and remove the default starters.
(2) Add two starter templates:
  (a) an Expo SDK 57 shell with our design tokens, theme, shared components, navigation and the API client;
  (b) a Next.js admin wired to a client generated from our FastAPI OpenAPI spec.
(3) Add a system prompt or rules file covering our conventions: folder layout, naming, no direct DB access, call the API only through the generated client, add i18n keys, and keep components accessible.
(4) Restrict providers to Claude.
(5) Treat output as a branch. A developer reviews it, and lint, typecheck and tests run in CI before anything merges into github.com/haytham26/courier.
(6) Check WebContainers commercial terms before using it at company scale.

USE IT FOR: the standard surfaces we need to match competitors. That means settings, the history and saved-routes lists, onboarding screens, billing/plan pages, the earnings/mileage report views and CSV export UI, the dispatcher dashboard, the recipient tracking page, the help centre, the marketing site, and quick founder mockups.

NOT FOR: the voice assistant (LangGraph, audio streaming, LiveKit/Pipecat), route optimisation (VROOM/OR-Tools/OSRM), the address auto-correction pipeline (LINZ/libpostal/PostGIS), door memory logic, background GPS and geofencing, offline sync, POD capture native modules, auth/security, payments webhooks, or database migrations. These are the hard core and the competitive edge. Engineers write them by hand with tests.

Caveat: several tools could not be verified in this research pass (Expo Agent, Rork, a0.dev, the hosted SaaS builders). Check them manually before committing.

## Parity matrix

| Category | Service | Competitors | We have | Priority | How we do better | Voice command |
|---|---|---|---|---|---|---|
| Stop import | CSV/Excel/Google Sheets import with column mapping | Spoke, Upper, RoadWarrior, Route4Me, MyRouteOnline, Zeo, Routal, Routific, OptimoRoute, Onfleet, Shipday | partial | MVP | LLM auto-maps columns, NZ address auto-correction (LINZ + libpostal) before geocoding, confidence score per row | 'Import today's sheet' / 'Fix the red ones' |
| Stop import | Paste / messy text / email / manifest extraction | Spoke, RoadWarrior, Route4Me, Circuit | no | MVP | LLM extracts stops from emails, manifests and chat messages | 'Add everything from that email' |
| Stop import | Camera label scan (OCR + barcode) to add stop | Spoke (paid), Zeo, Upper | no | MVP | Vision LLM parse plus NZ address normaliser, parcel linked to the stop | 'Scan label' then 'confirm' |
| Stop import | Voice add stop (multi-stop dictation) | Spoke (one-shot only) | partial | MVP | Conversational dictation of many stops with corrections ('no, 14 not 40') | 'Add 12 Riccarton Rd, then 5 Hagley Ave after 2pm' |
| Stop import | Integrations: Shopify, WooCommerce, Zapier/n8n, NZ carrier manifests, multi-client job aggregation | Zeo, Route4Me, Shipday, Routific, Onfleet, Tookan, Fleetbase | no | Phase2 (Shopify) / Later (rest) | Native Shopify app for small Christchurch merchants first, then NZ Post/CourierPost manifests | 'Pull new Shopify orders' |
| Address | Autocomplete | All | partial | MVP | Biased to Christchurch, merged with door memory and past stops | Implicit in any 'add' command |
| Address | Validation, error detection and auto-correction | Spoke, Routific (geocode confidence flags only) | partial | MVP | Auto-correct against LINZ register plus learned fixes, not just flagging | 'Is that address right?' / assistant asks 'Did you mean 12 Riccarton Road, Riccarton?' |
| Address | Pin drop / manual location fix | Spoke, Upper, RoadWarrior, all fleet tools | no | MVP | Fix is saved per address and becomes door memory forever | 'Save this spot as the real door' |
| Optimisation | Multi-stop route optimisation (unlimited stops) | All; free caps Spoke 10, Zeo 12 | partial | MVP | No stop caps; learned rules (always-first stop, business X before 10am) applied automatically | 'Optimise my route' |
| Optimisation | Time windows | Spoke, Zeo, Upper, Route4Me, Routal, Routific, OptimoRoute | no | MVP | Set by natural language | 'Pharmacy after 2pm' |
| Optimisation | Priority / ASAP / first-last stop | Spoke, Zeo, Upper | no | MVP | Rules remembered across days | 'Always do the bakery first' |
| Optimisation | Start/end, round trip, service time per stop | All | partial | MVP | Learns real dwell time per address | 'Finish at home today' |
| Optimisation | Re-optimise mid-route / insert stop en route | Spoke, Upper, Zeo, Onfleet, OptimoRoute, Routific | partial | MVP | One voice command re-solves from current GPS position | 'Add pickup at X after the next stop and reshuffle' |
| Optimisation | Pickup-delivery pairing | Route4Me, Routal, Spoke | no | Phase2 | Voice-marked pickups, OR-Tools PD constraints | 'This is a pickup for 5 Hagley Ave' |
| Optimisation | Vehicle type, avoid tolls/highways, capacity | Route4Me, Routal, Upper, Zeo | no | Phase2 | Bike/e-bike profiles (Valhalla); simple parcel-count capacity | 'I'm on the e-bike today' |
| Optimisation | Zones / territories, multi-depot | Zeo, Route4Me, Onfleet, OptimoRoute | no | Later | PostGIS polygons | 'Only Riccarton zone today' |
| Driver tools | Map + list view, drag reorder | All | partial | MVP | Voice reorder | 'Move Smith to after the dairy' |
| Driver tools | Package finder / load position | Spoke (paid) | no | MVP | Voice query of where each parcel is loaded | 'Where's the parcel for 12 Riccarton Rd?' |
| Driver tools | Door memory (persistent per-address notes: gate codes, dog, side door) | Fleet tools only have per-task notes; Uber/DoorDash/Amazon have customer notes | partial | MVP | Grows over time per address, read aloud on arrival, fed by recipients and pin fixes | 'Remember: gate code 1234, dog in yard' / auto-read on arrival |
| Driver tools | Live voice assistant (hands-free control of whole app) | None found | partial | MVP | Core differentiator: LangGraph agent with tools for every service in this matrix | Wake word / push-to-talk |
| Navigation | Navigation hand-off (Google/Waze/Apple) | All | partial | MVP | Voice next-stop flow, door notes read on arrival | 'Next stop' / 'Navigate with Waze' |
| Navigation | In-app turn-by-turn | Spoke, Upper, MyRouteOnline, Amazon Flex | no | Later | Defer; hand-off plus overlay | n/a |
| POD | Photo POD (geo + timestamp) | Spoke, Zeo (gated $499/yr), Upper, Route4Me, Onfleet, Shipday | no | MVP | Included in base tier, auto-tagged door spot, geofence + timestamp | 'Take proof photo' |
| POD | Signature | Spoke, Zeo, Upper, Route4Me, Onfleet | no | MVP | Offline-safe | 'Get signature' |
| POD | Delivery outcomes / failed-attempt reasons / re-attempt | Spoke, Upper, Zeo, Onfleet, Amazon Flex | no | MVP | Voice reason entry plus auto-reschedule to tomorrow's route | 'Left at back door' / 'Nobody home, try tomorrow' |
| POD | Barcode scan to confirm delivery / reconcile | Spoke, Onfleet, Amazon Flex | no | Phase2 | Auto-match to stop, announced by voice | 'Scan parcel' |
| Reliability | Offline mode (cached route, POD/edit queue) | Spoke (partial), Onfleet (partial); common complaint | no | MVP | Offline-first with sync queue and on-device STT fallback | Works offline for core commands |
| Sync | Cloud sync across devices and web | Spoke, Upper, RoadWarrior, Route4Me | partial | MVP | Conflict-safe sync | n/a |
| History | Route history | All | no | MVP | Searchable by voice | 'When did I last deliver to Smith?' |
| History | Saved / recurring routes and templates | Route4Me, Upper, Zeo | no | MVP | Saved with learned rules applied each day | 'Load my Tuesday route' |
| Tracking | Driver location tracking (background GPS) | All | partial | MVP | Battery-aware adaptive pings in PostGIS | n/a |
| Tracking | Geofence auto-arrival / auto-complete | Onfleet, Amazon Flex | no | Phase2 | Arrival triggers spoken door memory | Automatic |
| Customer | Recipient ETA SMS + live tracking page | Spoke, Zeo, Upper, Onfleet, Shipday, Tookan, Routific, OptimoRoute | no | Phase2 (MVP-lite share link) | Optional per stop, NZ numbers, tracking page lets recipient add door instructions to door memory, AI-parsed two-way replies | 'Text customer I'm 5 minutes away' |
| Customer | Recipient ratings / feedback | Onfleet, Shipday, Routific | no | Phase2 | Linked to door memory | n/a |
| Customer | Masked calls/SMS | Onfleet, Uber, DoorDash, Amazon Flex | no | Phase2 | Twilio Proxy, voice-triggered | 'Call the customer' |
| Dispatch | Dispatcher web dashboard, multi-driver planning, live map | Spoke Dispatch, Zeo, Upper, Route4Me, Routal, Onfleet, Tookan, Shipday, OptimoRoute | partial | Phase2 | Solo-first Next.js dashboard that scales to small teams, AI exception alerts | 'Give Sam the Hornby stops' |
| Dispatch | Auto-dispatch, shifts, driver chat | Onfleet, Tookan, Shipday, Zeo, OptimoRoute | no | Later | Voice notes, learned rules | 'Send Sam a voice note' |
| Earnings | Earnings tracking across platforms | Uber, DoorDash, Amazon Flex, Shipday | no | MVP-lite / Phase2 | Multi-client ledger with NZ GST | 'How much did I make this week?' |
| Earnings | Mileage logbook + CSV/PDF exports (IRD) | RoadWarrior, Route4Me, Upper, Zeo | no | Phase2 | IRD-ready NZ mileage-rate export from GPS | 'Export my mileage for October' |
| Earnings | Client invoicing / payments, quote engine | Tookan, Shipday, Fleetbase | no | Phase2 / Later | Auto weekly GST invoice per client, Stripe Connect | 'Invoice the pharmacy for this week' |
| Analytics | Reports (on-time %, stops/hr), planned vs actual | Onfleet, Routific, OptimoRoute, Shipday, Tookan | no | Phase2 | Weekly voice summary and learned service times | 'How was my week?' |
| API | Public REST API + signed webhooks | Onfleet, Routific, OptimoRoute, Tookan, Shipday, Zeo, Upper, Fleetbase | partial | Phase2 | FastAPI OpenAPI, Svix-style signed webhooks with replay | n/a |
| Pricing/Billing | Subscription plans, free tier, free trial | All (Spoke free 10 stops, Zeo 7-day trial) | partial | MVP | NZD flat plan, POD not gated, trial with guided first route; Stripe Billing + RevenueCat | n/a |
| Onboarding | Onboarding tutorial | All | no | MVP | Voice-guided first route | 'Help me plan my first route' |
| Settings | Settings (units, nav app, default start, service time) | All | partial | MVP | Every setting changeable by voice | 'Set Waze as default' |
| Admin | Teams / roles / permissions | Onfleet, Tookan, OptimoRoute, Fleetbase | no | Phase2 | Simple owner/driver roles | n/a |
| Support | In-app support / help centre | Spoke, Upper, Route4Me, Zeo, Onfleet, Uber | no | Phase2 | AI support agent grounded in docs | 'How do I export mileage?' |
| Safety | SOS / emergency button | Uber, DoorDash | no | Phase2 | Voice SOS | 'Call 111' |
| Compliance | Audit log, NZ Privacy Act 2020 retention, licence/WOF expiry reminders | Onfleet, Fleetbase, Uber/DoorDash/Amazon (docs) | no | Phase2 (privacy basics MVP) | Privacy by default for recipient data | n/a |

## Prompt-to-app builders

**Recommendation:** Do not rebuild the product with a prompt-to-app builder. Our FastAPI, LangGraph and PostGIS stack and the voice-assistant core need real engineering, and no builder we checked generates that well.

Use builders only to speed up standard surfaces, the "basic services" we need to match competitors: admin and ops dashboards, settings, billing, history and onboarding screens.

Plan:
(1) Self-host bolt.diy (MIT, BYO keys including Claude, Docker) as an internal tool. Add our own starter templates: an Expo SDK 57 shell with our design tokens and components, and a Next.js admin wired to our FastAPI OpenAPI client. Generated screens then match our design system. A developer reviews them and merges them into the main repo.
(2) Optionally use Dyad locally for the Next.js admin pages.
(3) Evaluate Expo Agent, which is unverified, for work on the mobile repo itself.

Limits:
- Generated mobile code is a preview. It does not handle background location, native audio or voice streaming, offline sync, or PostGIS logic.
- Security and auth must be reviewed by hand.
- Generated code drifts from our conventions without templates and tests.
- bolt.diy uses the WebContainers API, which has separate commercial terms for enterprise use.

Note: GitHub API access and some sites (rork.com, a0.dev, expo.dev) were blocked from this sandbox. Items marked verified=false need a manual check.

| Name | Open source | Licence | Builds | Customisable | Last activity | ✓ | Fit | Verdict |
|---|---|---|---|---|---|---|---|---|
| [bolt.diy](https://github.com/stackblitz-labs/bolt.diy) | True | MIT (WebContainers API has separate commercial terms for enterprise use) | Mostly web full-stack in the browser; README says it supports Expo (React Native) | High: self-host (pnpm, Docker, Electron), 20+ LLM providers with your own key incl. Anthropic/OpenAI/Ollama, starter templates can be forked | ~1.9k commits, 20k stars; last commit date not shown on page (unverified) | ✅ | Best open-source base for a private internal builder: add Courier Expo plus Next.js admin starter templates and our design tokens. Expo output is still a preview, not production native modules (background GPS, voice). | trial |
| [Dyad](https://github.com/dyad-sh/dyad) | True | Apache-2.0, except src/pro which is FSL-1.1 | Web (Next.js/React/TS); mobile not stated | Runs locally, uses your own API keys; has a scaffold folder but template support is not documented (unverified) | 2.1k commits, 22k stars; date not shown | ✅ | Good local tool for building Next.js admin/ops pages quickly against our FastAPI. Not for the Expo app. | trial |
| [Convex Chef](https://github.com/get-convex/chef) | True | Apache-2.0 | Full-stack web on a Convex backend (DB, auth, files, realtime) | Self-hostable, but still uses the hosted Convex control plane; Anthropic/Google/OpenAI/xAI keys | 2.3k commits; date not shown | ✅ | Poor fit: it ties you to Convex, while we use FastAPI and Postgres/PostGIS | avoid |
| [Onlook](https://github.com/onlook-dev/onlook) | True | Apache-2.0 | Visual AI editor for Next.js + Tailwind web | Run locally/Docker; depends on Supabase, CodeSandbox, OpenRouter | 1.6k commits; date not shown | ✅ | Useful for designers working visually on the Next.js marketing/web pages. Does not cover mobile. | watch |
| [Open Lovable (Firecrawl)](https://github.com/firecrawl/open-lovable) | True | MIT | React web apps, website cloning | Self-host; needs a Firecrawl key and a Vercel Sandbox or E2B sandbox | 61 commits; small project | ✅ | A demo-grade tool; only useful for cloning a landing page | avoid |
| [Expo Agent](https://expo.dev/blog/expo-agent-beta) | False | Commercial (unverified) | Native React Native/Expo apps | Unknown; we could not reach expo.dev to check | Beta reported launched 10 Mar 2026 (from a search snippet, unverified) | ⚠️ | The most relevant for our Expo app if it works on an existing repo. Needs evaluation. | watch |
| [Rork](https://rork.com) | False | Commercial | React Native/Expo mobile (from general knowledge, unverified) | Low; hosted only | Site unreachable from sandbox | ⚠️ | Prototype screens only | watch |
| [a0.dev](https://a0.dev) | False | Commercial | React Native/Expo (unverified) | Low | Unreachable | ⚠️ | Prototype screens only | watch |
| [Anything (ex Create.xyz)](https://www.anything.com) | False | Commercial | Web plus mobile on Expo (per a competitor's review) | Low; hosted | Reviewed 2026 | ⚠️ | Not suited to an existing codebase | avoid |
| [Lovable / Bolt.new / v0 / Replit Agent / Same.new / Firebase Studio](https://lovable.dev) | False | Commercial SaaS | Mainly web full-stack (Lovable+Supabase, v0 Next.js, Replit full-stack; Bolt.new also Expo) | Limited; hosted, vendor models | Not checked this run | ⚠️ | Fast throwaway prototypes and mockups for founder demos only | watch |

**Sources:** <https://spoke.com/route-planner/pricing/gr> · <https://spoke.com/dispatch/plan-routes> · <https://www.capterra.com/p/210604/Spoke/reviews/5064303/> · <https://spoke.com/dispatch/product-updates?page=2> · <https://apps.shopify.com/zeo-route-planner> · <https://www.upperinc.com/reviews/zeo-route-planner/> · <https://www.upperinc.com/blog/zeo-route-planner-pricing/> · <https://www.getapp.com/transportation-logistics-software/a/zeo-route-planner/> · <https://www.upperinc.com/alternatives/road-warrior> · <https://www.upperinc.com/comparison/upper-vs-myrouteonline.txt> · <NOTE: Route4Me, Routal and much of RoadWarrior are UNVERIFIED in this pass; items marked (unverified) come from general knowledge, and the Upper pages are vendor-biased> · <https://onfleet.com/blog/send-gmail-delivery-confirmations-through-onfleet/> · <https://zapier.com/apps/onfleet/integrations/shopify> · <https://www.growwstacks.com/workflows/update-shopify-order-tags-when-a-onfleet-event-happens> · <https://github.com/fleetbase/fleetbase> · <https://github.com/fleetbase/navigator-app> · <NOTE: most items come from the model's prior knowledge and were not checked against sources in this run; recheck against official docs (onfleet.com, routific.com, optimoroute.com, jungleworks.com/tookan, shipday.com, uber.com, dasher.doordash.com, flex.amazon.com)> · <https://github.com/stackblitz-labs/bolt.diy> · <https://github.com/dyad-sh/dyad> · <https://github.com/get-convex/chef> · <https://github.com/onlook-dev/onlook> · <https://github.com/firecrawl/open-lovable> · <https://expo.dev/blog/expo-agent-beta.md> · <https://thenewstack.io/expo-bets-big-on-react-natives-agentic-future/> · <https://www.superappp.com/blog/anything-ai-app-builder-review-2026.md> · <https://marcandrews.com/newly-ai-review-2026-build-apps-without-code/>
