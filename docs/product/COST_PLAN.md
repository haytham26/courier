# COST_PLAN — مجاني أولًا مع تحويل تلقائي للمدفوع (أكتوبر 2026)

> القرار: D12 في `DECISIONS.md`. يلخّصه القسم 0-B في `FINAL_PROMPT.md`.
> **تنبيه تحقق:** صفحات الأسعار والشروط الرسمية لم تُفتح مباشرة أثناء البحث (أخطاء DNS في بيئة البحث). كل رقم موسوم **[UNVERIFIED]** يجب تأكيده من صفحة المزوّد الرسمية قبل الإطلاق، ويُسجَّل التأكيد في `docs/decisions/adr/`.

## 1. المبدأ
1. **المسار الافتراضي مجاني:** على الهاتف (sherpa-onnx، نماذج on-device)، ثم أدواتنا المفتوحة على خادمنا، ثم الحصص المجانية **الرسمية**.
2. **التحويل تلقائي:** عند فشل المستوى أو بطئه أو نفاد حصته ينتقل الطلب للمستوى التالي بلا تدخل، وينتهي بمزوّد مدفوع. السائق لا يُقطع أبدًا.
3. **التبديل بسطر واحد:** التطبيق لا يعرف إلا أسماء منطقية (`courier-llm`، `courier-stt`، `courier-tts`، `courier-realtime`). الترتيب في ملف config واحد.
4. **حساب واحد لكل مزوّد.** فتح حسابات أو منظمات أو مفاتيح متعددة لمضاعفة الحصة المجانية = التفاف على الحدود ومخالفة للشروط وخطر حظر. ممنوع في التصميم.
5. **لا بيانات سائقين أو زبائن على مستوى مجاني يدرّب على البيانات** (مثل Gemini free tier). هذه المستويات للتطوير أو لنصوص بلا PII فقط.
6. **ما ندفعه حتمًا:** Apple Developer ($99/سنة)، Google Play ($25 مرة واحدة)، رسوم Stripe/RevenueCat على المعاملات، واسم النطاق.

## 2. سلسلة المزوّدين لكل قدرة (افتراضي → احتياطي مجاني → مدفوع)

| القدرة | 0. افتراضي (مجاني، أدواتنا) | 1. احتياطي مجاني رسمي | 2. مدفوع (آخر خيار) | حدود / رخصة / شروط |
|---|---|---|---|---|
| **STT** | sherpa-onnx على الهاتف: Zipformer / Parakeet-TDT 0.6B (إنجليزي) و Whisper-small / SenseVoice (لغات أخرى) | faster-whisper int8 على خادمنا ← Groq Whisper (free) ← Cloudflare Workers AI Whisper | Deepgram (ثم AssemblyAI) | sherpa-onnx Apache-2.0 (مؤكد)، كل نموذج برخصته. faster-whisper MIT [UNVERIFIED]. Groq: ~20 RPM، 2,000 RPD، 28,800 ث صوت/يوم لكل **منظمة** (~8 ساعات) [UNVERIFIED]. Cloudflare: 10,000 Neurons/يوم مشتركة، تفشل عند النفاد (مناسب للتحويل) |
| **TTS** | Kokoro-82M أو أصوات Piper ‎.onnx عبر sherpa-onnx على الهاتف | Kokoro على خادمنا (CPU) ← Cloudflare Workers AI TTS | Cartesia ← ElevenLabs (خطة مدفوعة فقط) | Kokoro Apache-2.0 (مؤكد)، **لا يدعم العربية** → صوت Piper برخصة متساهلة أو المدفوع. `piper1-gpl` هو GPL-3.0: ممنوع ربط كوده؛ نشغّل ملفات الأصوات بمحرك sherpa-onnx ونفحص رخصة كل صوت. خطة ElevenLabs المجانية غالبًا غير تجارية [UNVERIFIED] |
| **LLM** | on-device: Apple Foundation Models / Gemini Nano / llama.rn + Qwen أو Gemma 1–4B للنوايا البسيطة + قواعد حتمية | Groq free (Llama / gpt-oss) ← Cloudflare Workers AI ← Cerebras free [UNVERIFIED] ← vLLM على GPU خاص (عند الحجم) | Claude Haiku ← GPT | Groq llama-3.1-8b: 30 RPM، 14,400 RPD، 6K TPM [UNVERIFIED]. الحصص المجانية لنصوص بلا PII أو بعد redaction. Gemini free = يدرّب على البيانات ⇒ تطوير فقط |
| **Realtime voice** | Pipecat cascade على خادمنا: VAD/ASR على الهاتف → LLM (السلسلة أعلاه) → TTS (السلسلة أعلاه)، فوق LiveKit Server self-hosted | Pipecat SmallWebRTC (بلا SFU) | Gemini Live **paid tier** ← OpenAI Realtime mini | يُختار المسار عند بداية الجلسة/الدور لا وسط الجملة. Ultravox / Moshi / Qwen-Omni تحتاج GPU دائم ⇒ ليست للـ MVP. **ملاحظة:** هذا يعدّل D1/4.2: Gemini Live لم يعد الافتراضي بل احتياطي مدفوع، ويُقيَّم بالـ evals (جودة اللغات) قبل الإطلاق |
| **Maps** | MapLibre + PMTiles لنيوزيلندا على Cloudflare R2 (بلا egress) | ملف PMTiles مخزّن على الهاتف | MapTiler / Stadia (مدفوع) | بيانات OSM ODbL (نسب إلزامي). R2 free ~10GB [UNVERIFIED] |
| **Geocoding/عناوين** | LINZ address data + PostGIS + pg_trgm عندنا | Photon/Nominatim self-hosted | Google/Mapbox geocoding | LINZ CC-BY 4.0 [RE-CONFIRM] |
| **Routing** | Valhalla + VROOM على خادمنا | OR-Tools محليًا | Mapbox/HERE Matrix | Valhalla MIT، VROOM BSD-2 [RE-CONFIRM] |
| **Hosting** | Oracle Cloud Always Free Ampere A1 (Sydney/Melbourne) + Docker، الحساب على PAYG لتقليل استرجاع الأجهزة الخاملة | Cloudflare Tunnel/Workers للـ HTTP | Hetzner/Vultr/Linode VPS أستراليا (~$5–40/شهر) | A1 قيل إنه خُفّض إلى 2 OCPU/12GB في 2026-06 (InfoQ) والتوثيق يقول 4/24 [UNVERIFIED]. حساب واحد لكل شخص. infra-as-code + نسخ ليلي لـ R2 للانتقال خلال ساعة |
| **DB** | Postgres + PostGIS + pgvector على VM Oracle، نسخ احتياطي ليلي مشفّر لـ R2 | Neon free (dev branches) | Postgres مُدار في Sydney (مدفوع) | Supabase **ممنوع** حسب 3.3 |
| **Storage** | Cloudflare R2 free | Oracle Object Storage free | R2 مدفوع (رخيص، بلا egress) | [UNVERIFIED] |
| **Monitoring** | GlitchTip (MIT) + Uptime Kuma (MIT) + Langfuse self-hosted | Sentry Developer free | Sentry Team | Uptime Kuma على جهاز منفصل (Oracle VM ثانية أو free tier آخر) |
| **Analytics** | PostHog Cloud EU free (~1M أحداث [UNVERIFIED]) | PostHog self-host | PostHog مدفوع | لا NZ region؛ allowlist للخصائص (Privacy Act 2020) |
| **Email** | Resend free (~3,000/شهر، 100/يوم [UNVERIFIED]) | Brevo free (~300/يوم) | Amazon SES | |
| **SMS** | لا مجاني حقيقي؛ رسالة الزبون اختيارية (D5) → push/رابط مشاركة أولًا | — | مزوّد NZ long number **[OPEN]** | الوحيد شبه الحتمي، يدفعه من يفعّله (خطة Team) |
| **Push** | Expo Push → APNs/FCM (مجاني) | FCM/APNs مباشرة | — | |
| **Builds** | GitHub Actions (Linux لـ Android) + `eas build --local` / `expo prebuild` + xcodebuild على macOS runner | Codemagic personal free (500 دقيقة M2/شهر) | EAS Free (15+15 build/شهر) ← EAS Starter $19 | GitHub private: 2,000 دقيقة/شهر، macOS تُحسب ~10× [UNVERIFIED]؛ الريبو العام = runners قياسية مجانية |
| **Signing/Submit** | Fastlane (match + App Store Connect API key + Play service account) | `eas submit` (free) | — | Fastlane MIT |
| **OTA** | expo-open-ota (بروتوكول Expo Updates، MIT core) على R2 | hot-updater (MIT) | EAS Update (free حتى 1K MAU) | التبديل = تغيير `updates.url` في config |
| **Billing** | Stripe + RevenueCat (free حتى حد إيراد [UNVERIFIED]) | — | — | رسوم معاملات حتمية |

## 3. تصميم الموجّه التلقائي (Auto-fallback router)
- **مكان واحد:** `infra/router/litellm.config.yaml` (LiteLLM OSS **≥ 1.83.0**، pin بالـ digest والـ hash؛ **ممنوع 1.82.7 و 1.82.8** — نسخ خبيثة مارس 2026). البديل: Bifrost أو Portkey OSS.
- **الأسماء المنطقية:** `courier-llm`، `courier-llm-fast`، `courier-stt`، `courier-tts`. لكل اسم قائمة `fallbacks` مرتبة حسب الجدول.
- **الإعدادات:** `num_retries: 1`، timeout قصير (أول token < ~1 ث للصوت)، `allowed_fails` + `cooldown_time` لتخطي المستوى الذي يرجع 429/5xx، و`rpm/tpm` لكل مستوى مجاني أقل قليلًا من حده الموثّق كي نتحوّل قبل الحظر.
- **STT/TTS/Realtime:** طبقة `ProviderChain` صغيرة في `services/voice/providers/` (نفس الواجهة لكل مزوّد، health-check + circuit breaker + عدّاد حصة يومي في Redis). Pipecat يختار الخدمة عند بداية الجلسة/الدور.
- **علم PII:** كل طلب يحمل `pii: true|false`. الطلبات ذات PII لا تمر إلا على: on-device، خادمنا، أو مزوّدين مدفوعين بشروط no-training. المستويات المجانية التي تدرّب على البيانات تُستبعد آليًا.
- **الميزانيات:** virtual key لكل سائق (`max_budget` يومي/شهري) وميزانية لكل tenant + سقف عام مع تنبيه. عند بلوغ الحد: budget fallback إلى cascade أرخص ثم offline grammar مع تحذير صوتي — لا قطع منتصف الوردية.
- **الكاش:** Redis exact-match للعناوين والأسئلة المتكررة، وملفات TTS مولّدة مسبقًا للعبارات الثابتة بكل لغة (تقلّل TTS أكثر من 50%).
- **القياس:** spend logs في Postgres + Langfuse: تكلفة كل سائق/وردية، ونسبة الطلبات لكل مستوى. هدف: ≥ 90% من الأدوار تُخدم من المستوى 0–1.
- **قاعدة الانتقال لـ GPU:** عندما تتجاوز فاتورة المدفوع الشهرية لـ STT+LLM+TTS سعر GPU مخصص (أو تنفد أرصدة startup)، نشغّل vLLM + faster-whisper + Kokoro على GPU كمستوى 1 بتعديل config فقط.

## 4. Sandbox للمزوّدين غير الرسميين (تطوير فقط)
gpt4free وأمثاله مسموحة **للتجريب فقط** وبعزل صارم:
1. مجلد/ريبو منفصل `sandbox/` مع `docker-compose --profile sandbox` على جهاز أو مشروع سحابي منفصل. **لا أسرار إنتاج، لا بيانات حقيقية** — بيانات اصطناعية فقط.
2. **فحص CI يمنع البناء** إذا وُجد `g4f` أو `gpt4free` أو أي مزوّد من قائمة المنع في configs الإنتاج أو lockfiles أو الصور (grep + deny-list في pip-audit/npm).
3. **assertion عند الإقلاع:** الخادم يرفض البدء إذا `ENV=prod` وأي مزوّد sandbox موجود في config.
4. **egress allowlist** في الإنتاج: فقط نطاقات المزوّدين المعتمدين.
5. سلسلة الإنتاج لا تصل أبدًا لمزوّد sandbox، حتى كآخر احتياطي.
6. كذلك للتطوير فقط: Gemini free (بما فيه Live)، OpenRouter `:free`، GitHub Models، NVIDIA NIM trial، Mistral Experiment، HF credits.

## 5. المفاتيح والحسابات
**الآن (تطوير، كلها مجانية):** GitHub (Actions)، Oracle Cloud (Always Free، Sydney)، Cloudflare (R2/Tunnel/Workers AI)، Groq، Google AI Studio (Gemini free — dev فقط)، OpenRouter (dev)، Neon، Expo account (لـ `eas build --local` والـ push)، Resend، PostHog EU، Sentry أو GlitchTip، LINZ LDS key، Stripe **test mode**.

**قبل الإطلاق:** Apple Developer ($99/سنة)، Google Play Console ($25)، Stripe live (NZ)، RevenueCat، App Store Connect API key + Play service account (Fastlane)، مزوّد مدفوع واحد على الأقل لكل قدرة كاحتياطي مع حدود صرف: Deepgram، Cartesia، Anthropic (Claude Haiku)، Gemini **paid** أو OpenAI Realtime، مزوّد SMS NZ (إن فُعّل)، اسم النطاق. وتقديم طلب أرصدة startup: Google for Startups Cloud، AWS Activate، Microsoft for Startups [المبالغ UNVERIFIED].

## 6. التكلفة الشهرية التقديرية (USD، كلها [UNVERIFIED])
| السائقون | البنية | الصوت/AI | المجموع التقريبي | ملاحظة |
|---|---|---|---|---|
| 1 | $0 | $0–5 | **$0–5** | الهاتف + Oracle + حصص مجانية |
| 10 | $0–5 | $10–60 | **$10–65** | معظم الأدوار on-device؛ Groq ~8 ساعات/يوم لا تكفي ⇒ مدفوع للفائض فقط |
| 100 | $20–60 | $150–600 | **$170–660** | VPS مدفوع إضافي؛ مقارنة: كله مدفوع ≈ $2k–9k |
| 1000 | $200–600 | $800–3,000 | **$1k–3.6k** | GPU مخصص (vLLM + faster-whisper + Kokoro) يصبح الافتراضي؛ المدفوع للفائض والفشل فقط |

+ ثابت: Apple $99/سنة، Google $25 مرة واحدة. الإيراد (Solo/Team) يغطي المدفوع عند 10+ سائقين.
الافتراض الحاسم: ≥ 80–90% من الأدوار تُحسم على الهاتف (KWS/grammar/on-device LLM). إن انخفضت النسبة ترتفع الأرقام.

## 7. ما نستمر بدفعه ولماذا
- **Apple / Google:** لا نشر بدونهما.
- **Stripe / RevenueCat:** رسوم معاملات، وIAP إلزامي على المتاجر.
- **مزوّد مدفوع احتياطي لكل قدرة:** ضمان ألا يتوقف السائق، ولشروط no-training لبيانات PII. يُدفع فقط عند الاستخدام وبسقف.
- **SMS (اختياري):** لا بديل مجاني موثوق في NZ.
- **لاحقًا GPU:** عندما يصبح أرخص من الدفع لكل دقيقة.

## 8. المصادر
- https://github.com/k2-fsa/sherpa-onnx · https://github.com/hexgrad/kokoro · https://github.com/rhasspy/piper · https://github.com/OHF-Voice/piper1-gpl · https://github.com/fixie-ai/ultravox
- https://console.groq.com/docs/rate-limits · https://fast.io/resources/groq-rate-limit.md · https://localaimaster.com/blog/groq-api-free-guide
- https://developers.cloudflare.com/workers-ai/platform/pricing/ · https://developers.cloudflare.com/r2/pricing/
- https://ai.google.dev/gemini-api/terms · https://ai.google.dev/gemini-api/docs/billing · https://simonwillison.net/2024/Oct/17/gemini-terms-of-service
- https://openrouter.ai/docs/api-reference/limits
- https://docs.litellm.ai/docs/proxy/budget_fallbacks.md · https://docs.litellm.ai/docs/proxy/fallback_management.md · https://www.bitsight.com/blog/litellm-versions-1-82-7-1-82-8-supply-chain-compromise
- https://expo.dev/pricing · https://docs.expo.dev/build-reference/local-builds/ · https://docs.github.com/en/billing/concepts/product-billing/github-actions · https://docs.codemagic.io/billing/pricing/
- https://github.com/axelmarciano/expo-open-ota · https://github.com/gronxb/hot-updater · https://github.com/fastlane/fastlane
- https://infoq.com/news/2026/07/oracle-cloud-free-tier-limits/ · https://docs.oracle.com/en-us/iaas/Content/FreeTier/resourceref.htm
- https://github.com/livekit/livekit · https://github.com/xtekky/gpt4free (للتعريف بالممنوع فقط)
