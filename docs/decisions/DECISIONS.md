# قرارات المؤسس (مصدر الحقيقة — تتغلّب على أي وثيقة أخرى)

| # | القرار | التاريخ |
|---|---|---|
| D1 | **المساعد الصوتي الحي (محادثة كاملة) ميزة أساسية في النسخة الأولى**، وليس «لاحقًا». يعمل طوال الوردية. | أكتوبر 2026 |
| D2 | **السائق يقدر يدير كل شيء بالكلام فقط.** كل خاصية في التطبيق لها أمر صوتي، والمساعد ينفّذها. الشاشة اختيارية. | أكتوبر 2026 |
| D3 | **كل اللغات من البداية** (ليس فقط الإنجليزية/الماورية/العربية). السائق يتكلم بلغته، والعناوين تبقى رسمية بالإنجليزية. | أكتوبر 2026 |
| D4 | **إثبات التسليم الافتراضي = كلمة السائق «سلّمت».** الصورة/التوقيع/الباركود اختيارية. | أكتوبر 2026 |
| D5 | رسالة الزبون برابط التتبّع: **اختيارية** (يفعّلها السائق). | أكتوبر 2026 |
| D6 | تقرير نهاية اليوم (كيلومترات، GST): **اختياري**. | أكتوبر 2026 |
| D7 | **التصميم بمستوى شركة كبيرة**، ليس «شكل AI». | أكتوبر 2026 |
| D8 | المساعد يصحّح العناوين بنفسه ويخبر السائق بما صحّح، ويسأل فقط عن المشكوك فيه. | سابق |
| D9 | «تم» بثلاث طرق: صوت، زر سماعة، زر شاشة. | سابق |
| D10 | **تنفيذ ذاتي كامل:** المنفّذ لا يتوقف للموافقة على كل خطوة؛ لجان مراجعة متعددة + اختبار ثبات 50 مرة + إضافة الناقص تلقائيًا. يتوقف فقط لما يحتاج المؤسس (حسابات، مال، قانون، هاتف حقيقي). | أكتوبر 2026 |
| D11 | **نسخة واحدة كاملة**، ومنها مسح الملصقات بالكاميرا. لا نسخ مرحلية. الخطط: Trial / Solo / Team. | أكتوبر 2026 |
| D12 | **مجاني أولًا مع تحويل تلقائي للمدفوع.** كل قدرة (صوت، LLM، استضافة، بناء، OTA...) تعمل افتراضيًا على الهاتف أو أدواتنا المفتوحة أو حصص مجانية رسمية، وتتحول تلقائيًا لمزوّد مدفوع عند الفشل أو نفاد الحصة؛ التبديل بسطر config. المدفوع الحتمي: Apple، Google Play، رسوم Stripe. حساب واحد لكل مزوّد. gpt4free وأي وسيط غير رسمي: sandbox تطوير معزول فقط، ممنوع في المنتج. التفاصيل: `COST_PLAN.md`. | أكتوبر 2026 |
| D13 | المنفّذ يعمل مع **فريق مراقبين ومصلحين** طوال البناء. التسليم: **محاكي أندرويد على جهاز المؤسس + APK للهاتف الأندرويد**. المنطقة: **كل كانتربري وكرايستشرش كاملة**. | أكتوبر 2026 |
| D14 | تثبيت `addyosmani/agent-skills` إلزاميًا في بداية التنفيذ، وربط كل دور بمهاراته. | أكتوبر 2026 |
| D15 | الخريطة الأساسية لكانتربري وملف العناوين **مضمّنان داخل التطبيق** (يعمل من أول تشغيل بلا إنترنت)، مع **تحديث كل 7 أيام** على الواي فاي. الصور الجوية تنزيل اختياري. | أكتوبر 2026 |
| D16 | **ستايل خريطة احترافي خاص بنا** مستوحى من Petal Maps و Apple Maps: نهاري وليلي وتباين عالٍ للشمس. | أكتوبر 2026 |
| D17 | **البناء يبدأ الآن بلا مفاتيح** (نسخ وهمية/محلية/مجانية). المفاتيح تُطلب من المؤسس **مرة واحدة قبل التسليم**، ثم اختبار كامل بالخدمات الحقيقية، ثم النسخة النهائية. | أكتوبر 2026 |
| D18 | (معلّق) OmniRoute كبوابة نماذج — بانتظار رابط المستودع للتحقق. | أكتوبر 2026 |
| D19 | بيانات LINZ المحلية عند المؤسس تُوضع في `data/linz/` (غير مرفوعة) وتُستخدم لبناء العناوين بدل API. المفتاح للتحديث الأسبوعي فقط. | أكتوبر 2026 |
| D20 | المنفّذ **يثبّت Android SDK والمحاكي بنفسه** (winget/brew/cmdline-tools) ولا ينتظر المؤسس. البديل إن تعذّرت المحاكاة: APK عبر GitHub Actions. | أكتوبر 2026 |

## D21 — قاعدة الدليل وقفل الإصدارات (2026-10-20)
- لا تُكتب PASS لأي مرحلة بلا دليل مرفوع في docs/evidence/. ادعاء B.7 في 3838765 مرفوض حتى يُثبَت.
- Expo SDK 58 مقفل (ADR-002: the tree runs expo 58.0.14); أي تغيير إصدار يحتاج ADR بمصدر رسمي.
- laya-coreml مرفوض (Apple فقط).
- التفاصيل والإصلاحات المعلّقة: FINAL_PROMPT §0-F.

## D22 — VoiceStudio / OmniVoice + post-launch open-source tools (2026-10-20)
**Voice (founder decision: use everything VoiceStudio offers, keep our product private):**
- The 600+ language capability comes from the engine **k2-fsa/OmniVoice (code Apache-2.0)** - free to modify and keep private, including in a commercial product. **The weights licence was checked on 2026-10-20 and it is CC-BY-NC (non-commercial): the pretrained weights are NOT usable in our commercial product. The licence-safe replacement is sherpa-onnx + Kokoro on device and Qwen3-ASR/TTS (Apache-2.0 weights) on the private service. See docs/decisions/adr/ADR-004-voice-service-licences.md.**
- Build our own **private** voice service (`services/voice`, in this repo) directly on OmniVoice + sherpa-onnx + Pipecat: TTS, voice design, multilingual dictation/transcription, and synthetic training-audio generation, adapted to couriers (NZ street/suburb vocabulary, accents, noise).
- github.com/debpalash/VoiceStudio is AGPL-3.0: use it as a **reference and internal dev tool** (e.g. to generate synthetic eval audio, study its features/UX). Do NOT copy its code into our repos — re-implement needed features ourselves on top of OmniVoice. This keeps the whole product private with no source-publishing obligation.
- On device stays sherpa-onnx (+ Kokoro or an OmniVoice ONNX export if weights license allows and the benchmark wins).
- Voice squad benchmarks OmniVoice vs current stack (quality, latency, languages incl. NZ English, Māori place names, Arabic, Hindi/Punjabi, Mandarin, Samoan/Tongan) before switching any production path.

**Post-launch tools (not in v1 scope, planned):**
- Chatwoot — driver support chat (in-app + dashboard), self-hosted on Oracle.
- WeKnora (Tencent) — help-centre Q&A over our docs/FAQ (private network only).
- Cal.com — demo bookings with courier companies/teams.
- Cap — product demo/tutorial videos.
- OpenSEO — website SEO.
Each: license check (fine to self-host unmodified as separate tools; if we modify an AGPL one that users access over the network, we must offer those users its modified source), self-host plan, security review, added to COST_PLAN when adopted.

## D23 - Courier Voice (2026-10-21, founder decision)
- The voice engine is our own product: **Courier Voice** (`services/courier-voice`), built per V4 section 13.6 with its safeguards: the provenance in `LICENSES.md`, a swappable engine interface, and we keep benchmarking the commercially-licensed alternatives.
- The user-facing surfaces show only "Courier Voice"; the required LICENSE/NOTICE files stay internal.
- **Implemented 2026-10-22** per `docs/decisions/adr/ADR-007-courier-voice-service.md`: the service, the `VoiceEngine` port (the on-device engine on sherpa-onnx and the server brain behind the OmniRoute gateway, D25), the turn taking (the wake word, the earbud, the barge-in and the silence timeout), the driving-safe rules (eight words while moving, never a screen tap, the quiet mode, the essentials mode, the calls and the music), the proactive lines with the wording of MASTER_EXECUTION section 12, the bounded small talk, the on-device-first memory with the privacy controls, the offline/online switch, and the licence ledger published by the service itself (`GET /v1/licences`). The conditions of the founder's decision are met: the provenance is in `docs/product/LICENSES.md`, the engine is behind the port, and the licensed alternatives stay benchmarked (`docs/squads/voice/OWN-MODEL.md`).

## D24 - Our brand on the adopted permissive OSS (2026-10-21, founder decision)
- The permissive licences (MIT/BSD/Apache/MPL/CC0/ISC) may be forked and vendored, renamed under "Courier <Name>" (Courier Maps, Courier Nav, Courier Route, Courier Scan, Courier Sync), adapted for the NZ couriers, kept private, with the required LICENSE/NOTICE and the provenance in `LICENSES.md`, our own tests and benchmarks, and the upstream security fixes tracked.
- The copyleft (AGPL/GPL: Fleetbase, Navigator, OpenRouteService, Nominatim, VoiceStudio) is **clean-room only**: the features and the ideas, never the code.
- The model-weight licences are checked separately from the code licences.

## D25 — OmniRoute as the server LLM gateway (2026-10-21, founder decision; resolves D18)
- Use **OmniRoute** (github.com/diegosouzapw/OmniRoute, MIT, self-hosted AI gateway: routing, load-balancing, fallback, caching, observability) as the single LLM gateway for Courier Voice's server brain and other server AI features (alongside/instead of LiteLLM — Platform squad decides by benchmark + ADR).
- **Production deployment**: self-hosted on our server (Oracle Sydney), never the founder's PC; pinned version; secrets in the server secret manager; admin UI not exposed publicly; logs without PII.
- **Production routing policy**: only providers/accounts whose terms allow commercial API use and that do **not** train on our data (driver/customer text/audio). Personal subscription logins (ChatGPT/Claude/Gemini consumer plans via OAuth), unofficial/free proxies and any provider that may train on inputs are **dev-only** and must be disabled for production traffic (separate OmniRoute instance/config for dev).
- Cost guard (§7) applies: free/cheap tiers first, paid fallback with alerts and caps. App calls the gateway via one internal interface so the gateway can be swapped.

## D26 — Founder decisions on the map pack and the label eval set (2026-10-21)
1. **Offline map pack delivery: both.** Ship the Canterbury pack as a Google **Play Asset Delivery install-time asset pack** (does not count against the 80 MB base APK budget; the map works offline from the first launch). Twice-weekly updates are downloaded in-app on Wi-Fi (diff when possible) and replace the pack atomically; if the asset pack is missing (sideloaded APK), download on first run on Wi-Fi; online source as last fallback.
2. **ODbL**: treat the on-device tiles as a **Produced Work** — show OSM + LINZ attribution in the map and in Settings → Open-source licences; we do not distribute a derived database publicly. No blocker; include it in the pre-launch legal review list (not a gate for building).
3. **Geofabrik**: free download of OSM extracts is allowed under ODbL with fair use. Download **twice a week** from CI (scheduled), and ship map updates twice a week with a clear User-Agent, cache the file, verify the checksum; fallback mirrors: openstreetmap.fr extracts, BBBike, or a planet/NZ extract from planet.openstreetmap.org. If the host times out, retry later — not a founder action.
4. **Label eval set without founder photos**: add up to **100 more real-looking labels** from (a) openly licensed public datasets of shipping/parcel labels (Kaggle, Roboflow Universe, Hugging Face, papers) whose licence allows commercial use/evaluation — record source + licence per image in the ledger; and (b) photo-realistic synthetic labels (real NZ courier layouts: NZ Post, CourierPost, Aramex, NZ Couriers, DHL; fake names/phones; real LINZ addresses) rendered then photographed-style augmented (angles, glare, blur, crumples, low light). **Never scrape personal photos from social media or the web** (privacy + copyright). Founder photos, when provided, are added later.
5. **Scanner reads the address only, smartly**: detect the label → locate the recipient address block → auto-crop and zoom into that region (ignore sender, barcodes, phone numbers, marketing) → highlight it on screen → OCR only that region → smart parsing (NZ address parser + D8 correction against LINZ + confidence, handles units, RD, abbreviations, line breaks, handwriting where possible) → one quick question only if confidence is low. The eval set measures the crop accuracy (right block found) separately from the reading accuracy.

## D27 — Design direction chosen: Maps First (2026-10-22, founder decision)
- The founder chose the **Maps First** direction (Apple Maps on iOS 26 with Liquid Glass): `docs/design/chosen/` (13 reference screens, contact sheets and the token spec in its README). This supersedes §13.6 A/B/C and the 10 directions in `docs/design/directions-2/` (kept as history only).
- The design must be **editable**: one token file with light and dark sets drives every colour, radius, spacing, blur and type size; no hard-coded values in screens; a token and component review screen (Storybook or a debug screen).
- Glass uses `expo-glass-effect` (Expo SDK 58) on iOS 26+ with a runtime check; Android and older iOS fall back to a blur view with the glass token. `@callstack/liquid-glass` is the alternative if the Design squad's benchmark prefers it (record in an ADR).
- Delivery uses **Slide to Deliver** (no single-tap delivery while driving), with an accessible alternative.
- **Implemented 2026-10-23** per `docs/decisions/adr/ADR-008-design-system-maps-first.md`: the ONE token
  file `packages/design-tokens/src/chosen.ts` exported as `@courier/design-tokens/chosen` (no new package),
  the D33 contrast gate (48 asserted pairs, light and dark, worst-case glass maths, no silent
  exclusions), the motion tokens (§13.8 rule 6, D29, D34) and the D33-mandated design changes: black
  labels on the success fills, the darkened `successText` and `accentText`, the darker secondary label,
  the pin number chip pattern, the scanner scrim and the 18 px bold button labels.

## D28 — StoreReady is the primary pre-submission checker (2026-10-21; renumbered from D27 when D27 became the Maps First decision)
- **StoreReady** (github.com/MaTriXy/StoreReady, MPL-2.0, a Go CLI by MaTriXy, a friend of the founder) is the **primary** pre-submission checker, in the workflow `.github/workflows/store-ready.yml` (MASTER_EXECUTION §15). Verified on 2026-10-21: the latest release is **v0.1.0** (8 March 2026, commit `7552a29`), the command is `storeready playstore-checkup <path> --format json --output <file>`, CRITICAL blocks and WARN is a task. The version and the SHA-256 of the asset are pinned; the actions are SHA-pinned like every other workflow.
- The workflow runs on the **release trigger and on demand only** (§7.1: the private Actions minutes are limited). It fails the job on a CRITICAL finding and prints the report as the job summary, so the founder reads the findings without downloading anything. The report artefact is kept for seven days.
- **Our own script** (`scripts/ci/check-store-readiness.mjs`) is the local copy of the check: it reads what the tool cannot know (the version and the version code, the permissions against the Play policy, the background location declaration and the in-app disclosure, the 80 MB base APK budget, the 64-bit requirement, the target API level, the privacy policy, the data safety notes, the icons, the signing configuration, the version strings in the store listing, the licence ledger). It is the developer's copy and it runs in CI as well.
- **Credentials**: the only lane of the tool that needs one is the App Store Connect scan, so the workflow reads `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID` and `APP_STORE_CONNECT_KEY_P8_BASE64` from the GitHub Secrets (the names only, the values never in the repository). A missing secret **skips** the lane with a clear message; it never fails the pipeline. The Play Console service account is a founder item for the submission itself (the tool has no Play Console API lane in v0.1.0).
- **The alternatives** (the Play Console pre-launch report, Firebase Test Lab, Fastlane `precheck`) stay on the list to evaluate; the tool does the part that can run without an account, and the Play Console does the part that needs one.
- The checks the tool does not have (background location, foreground services, account deletion, data safety, the Play Console API) are proposed to its author; the list is in `docs/operations/RELEASE-CHECKLIST.md`.

## D29 — 3D and motion are part of Maps First (2026-10-22, founder decision)
- The Maps First design (D27) is built three dimensional and animated: a tilted 3D map with extruded buildings, a driving camera that follows and eases into turns, a 3D puck and rising pins, route lines that draw themselves, and spring motion with haptics across the interface. The binding spec is MASTER_EXECUTION §13.8.
- Motion must serve the driver (orientation, feedback, continuity), keep 60 fps on a mid-range Android, respect reduced motion, and its durations and curves live in the token file.


## D30 — The company runs itself; Spoke research, first-run experience and n8n (2026-10-23, founder decision)
- The executor operates as a complete company without being asked: parallel squad sessions with an independent reviewer, a weekly company report, and only true founder decisions in FOUNDER_TODO (MASTER_EXECUTION §17.1).
- Competitive research on Spoke starts now, from the founder's screenshots kept in the git-ignored `research-private/` folder, never committed, clean room only (§17.2).
- First-run experience: skippable welcome, an offline interactive demo run, a Courier Voice guided tour, coach marks, short video walkthroughs and an in-app Help centre (§17.3).
- n8n, self-hosted, automates company operations (CI digests, the weekly report, map updates, review monitoring) with workflows versioned in `infra/n8n/workflows/` (§17.4).

## D31 — Company completeness and Courier Ops (2026-10-23, founder decision on the chief adviser's review)
- Close the company gaps in MASTER_EXECUTION §18: NZ driver distraction law as a design constraint, Privacy Act 2020, carrier terms, app store billing (in-app purchase for drivers, web billing for teams), company basics, driver research and closed beta, pricing, B2B, growth and launch, SRE (SLOs, load tests, DR drills, release engineering, crash and cost monitoring), privacy-first analytics, AI governance, support and the engineering organisation.
- Build Courier Ops (§17.5) as our own console and AI ops agents on top of an open-source workflow engine (n8n, Windmill or Temporal by benchmark), not a workflow engine from scratch. Human approval for any action on production, money or customer data.
- Analyse Spoke to the depth listed in §17.6.

## D32 — Efficiency rules: no loops, no wasted tokens (2026-10-23, founder decision)
- MASTER_EXECUTION §19 is binding:
  - reproduce before fixing;
  - at most two attempts per hypothesis, then a written root-cause note and a new approach;
  - a 45 minute or 3 CI cycle time box, then park and move on, never by weakening a gate;
  - no diagnostic commits on PR branches;
  - read only failing log tails;
  - batch local gates before a push;
  - never block on watches;
  - at most 3 parallel sessions;
  - a 30 line handoff in `docs/log/CURRENT.md`;
  - the weekly cost line.

## D33 — Contrast exactly per WCAG and the queued follow-ups (2026-10-23, founder decision)
- 3:1 only for large text (24 px regular or 18.66 px bold); button labels are 18 px bold; 4.5:1 for other text; 7:1 for everything on the driving screen (the Slide to Deliver label is black on green). The test asserts every pair with no silent exclusions (MASTER_EXECUTION §13.9).
- Order after the current task: mobile lint gate, contrast, repository organisation, then Part B, §17, §18 and Part C (§13.10).

## D34 — Courier Voice sits in the centre of the app (2026-10-23, founder decision)
- The voice copilot is the heart of the product, so its button is in the centre of the floating tab bar (Today, Route, Copilot, Map, Account): raised, the largest target, visible on every main screen including Driving, with clear states (idle, listening, thinking, speaking, muted, offline) and a caption of the last thing heard. The spec is in `docs/design/chosen/README.md` (component 2); behaviour per MASTER_EXECUTION §12 and D25.
- Added the same day: the Copilot button is a real-time 3D glass sphere that reacts to the live voice (the driver's level and Copilot's own voice), with morphing states and haptics, no neon or particles (README component 2).

## D35 — The routing solver is PyVRP 0.14.1 behind the `RouteEngine` seam (2026-10-24, backend squad decision, queue item 1)
- The production engine is `PyVRPEngine` (`services/api/app/solver.py`, ADR-009): PyVRP chooses the day's order — MIT licence, prebuilt 3.11 wheels, pinned `pyvrp>=0.14.1,<0.15` — and the routing core (`app/routing.py`) stays the single source of truth for the arrival times, the distance, the capacity and the break. `COURIER_ROUTE_ENGINE` remains the release lever (`pyvrp` default, `heuristic-nn-2opt` fallback; a solver that cannot plan a day falls back to the heuristic and the plan says so via `RoutePlan.engine`).
- The break of the day is **not** in the solver's model: PyVRP solves the order break-free — no static break-arc encoding survives the mirror-order tie the probes proved — and the core's scored greedy placement puts the break where the walk says the day can take it.
- Determinism at `MAX_ITERATIONS = 250`, seed `0`: the same day always plans the same; the 200-stop grid day plans in 3.2–3.3 s against the ≤ 5 s budget, the honest trade is +7.8 min of day per 174-stop run against a 1000-iteration reference (both in `docs/evidence/backend-solver/benchmark.json`). Deliberate test renames/re-pins are recorded in ADR-009 §7; the VROOM comparison leg is not verified on this machine (Docker daemon never started in the 45-minute box).

## D36 — The runs/stops API: create/list/read runs, the live stop list, the POD upload and the partial reopt (2026-10-24, backend squad decision, queue item 2)
- The phone's day loop is served end to end (`services/api/app/main.py`, ADR-010): `POST /runs` (the owner comes from the token, never the body; `extra="forbid"` so unknown fields are refused, never silently dropped), `GET /runs`, `GET /runs/{id}` (a foreign courier's run is 404, never 403 — existence is not disclosed), `GET /shifts/{shift_id}/stops` implemented for real (the contract status vocabulary enforced by the parameter type; the in-memory repo derives status from the delivery events, the SQL repo reads the stops table), `POST /runs/{run_id}/stops/{stop_id}/pod` (10 MiB cap read before anything is stored; JPEG/PNG/HEIC decided by magic bytes, never by the client's name or declared type; the file named by the server after the event; a replayed client event id returns the first upload's fingerprint and rewrites nothing) and `POST /runs/{run_id}/route:reopt` (only the affected stops move; the delta is what the change does to the phone's own stored day; the stored route is refreshed).
- ASVS L2: JWKS bearer auth in front of everything, per-object authz, pydantic validation with bounds on every body, the V14 hardening headers (`nosniff`, `DENY`, `default-src 'none'`, `no-store`, `no-referrer`) on every response including errors, no PII/tokens/bytes in logs. The honest gaps recorded in ADR-010 §Limitations: POD storage is a local directory (not object storage) and there is no rate limiter yet.
- The NEW endpoints' OpenAPI fragments (pod upload, reopt, the narrowed createRun/run response) live in ADR-010 §4 — `packages/contracts/openapi.yaml` is outside the backend squad's scope and awaits the contracts owner's merge; `docs/log/CURRENT-backend.md` carries the line for the lead.

## D37 — The emulator boots with software GL, and a gate keeps it that way (2026-10-25, lead squad decision after D36 had landed with the backend squad)
- **The emulator's GL mode is a gate setting, not a heuristic.** Every workflow that boots an Android emulator sets `-gpu swiftshader_indirect` in its emulator-options: without it the emulator picks its own host GL mode and the headless runner loses the context (BUG-060), which took the E2E gate down with `no first screen appeared in 90s` and `today-screen` asserts going false. The proof is PR #22's own run (both legs green, all 8 flows) against the red runs before it; the noise lines still appear but no flow dies. The full text of the founder's brief is archived at `docs/log/founder-brief-2026-10-24.md` (read-and-copy only; the original stays in Downloads).
- **The gate** is `scripts/ci/check-emulator-gpu.mjs`, in the quality-gates floor job: it fails any workflow that boots an emulator without the flag, so the setting is asserted rather than hoped for. Its own test drives the parser (inline options, block scalars, the two step forms, a second `-gpu` override, a comment naming the action) and it scans the real tree so it cannot go vacuous.
- **The naming collision, recorded:** the founder's brief and the old `CURRENT.md` call this bug "BUG-052", but the tracker's BUG-052 had already landed with PR #19 for the solver's break-scan cost. The bug was written up as **BUG-053** and renumbered **BUG-060** when the queue-2 audit (PR #26) landed its own BUG-053 to BUG-058 on main: both rows are kept and every reference to the GL bug was updated. It was written up as D36 here, and D36 had landed with the backend squad in the same hours, so the renumber is D37 and the collision is exactly the class of error this repo records rather than hides.
- **No fleet-wide concurrency group for the E2E workflow:** GitHub keeps one pending run per group and cancels the rest, so PR runs would be silently dropped (the founder's explicit instruction, BUG-060).
- **The parallel BACKEND session owns `services/` only** (the founder's brief): the lead does not edit `services/`; the app, the flows, the design and the app-side docs are the lead's, and the backend's work reaches the app through its ADRs. It is recorded here because it is a decision, not a task.
## D38 — The POD object storage: one store interface, a real signing key, the honest fingerprint and retention (2026-10-25, backend squad decision, queue 2 item 3)

- ADR-011. The `PodStore` protocol with `LocalPodStore` (the default directory) and `S3PodStore` (boto3 against any S3-compatible store; MinIO stays banned, AGPL-3.0; moto, Apache-2.0, in the tests). The contract serves `GET /runs/{run_id}/stops/{stop_id}/pod/{event_id}/url` (owner-only, 15-minute TTL) and the local streaming grant `GET /runs/{run_id}/pod/{event_id}/bytes`.
- The fresh-context review proved the first grant key forgeable (it was derived from the public JWT issuer): the key is now the dedicated `POD_URL_SIGNING_SECRET` (>=32 chars, validated at boot). The same pass made `sha256` true on S3 (object metadata at save, not the ETag), `exists()` only 404-tolerant (a 403/5xx can no longer turn a replay into an overwrite), `delete_run` paginated in 1,000-key batches with per-key errors raised, and the moto suite actually executing in CI.
- Real buckets, keys and the signing secret are FOUNDER_TODO items; `delete_run` is the primitive the run/account-deletion slices call. The scheduler stays the infra lane.

## D39 — The location notes: a derived door identity, the (courier, location, kind) upsert, the 404 cross-courier gate (2026-10-25, backend squad decision, queue 2 item 4)

- ADR-012. `location_id` is `uuid5` over the canonical `address|suburb` (no nearest-neighbour, ever), stored on every stop and returned by the stop list; `door_memory` is redefined to one note per (courier, location, kind); `GET/POST /locations/{location_id}/notes` serve it (201 new / 200 corrected).
- The gate is `courier_location_key`: a location the caller never had a stop at is 404 on both verbs, and two couriers at one door keep two private memories (tested explicitly).
- The review's must-fixes landed: the SQL UPDATE refreshes `address_key` (parity with memory), the uuid5 namespace is pinned by a literal-uuid test, an empty address is refused, and the stop response never nulls `location_id`.

## D40 — The intake provider seam: OmniRoute when configured, the deterministic fake otherwise (2026-10-25, backend squad decision, queue 2 item 5)

- ADR-013. The two intake stubs now run the LangGraph graph: `POST /shifts/{shift_id}/intake` and `/intake/manifest` answer the contract's briefing or first question through the `IntakeProvider` seam — `OmniRouteProvider` (OpenAI-compatible, env-only) or `FakeOmniRoute` when no gateway is configured (one parcel per spoken line; its OCR refuses, it never invents a manifest).
- `RepoGeo` geocodes from the run's own stops and bounds territory around the depot; the process-wide `MemorySaver` keys the interrupts by shift. The voice-socket resume, the real geocoder and the persistent checkpointer are the recorded next slices.
- The review's must-fixes landed: the manifest endpoint is threadpooled (a sync gateway call on the loop would have hung the courier's voice socket), the untrusted text travels in tagged prompt blocks, the contract declares the 413/415/502/503, malformed gateway shapes are 502 not 500, HEIC is refused up front, and blank text is 422.

## D41 — The sync conflict rules: first write wins, divergence reported, the clock bounded (2026-10-25, backend squad decision, queue 2 item 6)

- ADR-014. The event log is append-only: an identical replay is an ack, a divergent same-id replay is a conflict whose id returns in `SyncResponse.conflicts` (the stored row wins; silent divergence is forbidden). A correction is a new event.
- The stop status is the latest event by `occurred_at`, ties by arrival; no kind outranks another (the sync squad's C3, "first accepted wins", is superseded). `occurred_at` beyond 1 hour in the future or 7 days in the past is a 422 for the batch.
- `append_events` answers `AppendResult(stored, conflicts)` in both repositories, so the rules are pinned by the same tests on the in-memory and SQL paths.

## D43 — Android first, then iOS; one cross-platform code base (2026-10-25, founder decision)

- Android reaches full quality first (MASTER_EXECUTION §6 Definition of Done, all 13 screens, E2E green 3 runs in a row, the founder's "Android OK" on a real phone). iOS starts only after that gate.
- From now on: no Android-only solution when a cross-platform one exists, and every new native dependency must document iOS support (IOS_PLAN §0).
- The full iOS plan (the founder's accounts, the simulator build, iOS E2E in CI, the Apple-specific items, TestFlight, the App Store) is `docs/plan/IOS_PLAN.md`.
