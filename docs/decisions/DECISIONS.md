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
