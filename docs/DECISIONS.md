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
- Expo SDK 57 مقفل؛ أي تغيير إصدار يحتاج ADR بمصدر رسمي.
- laya-coreml مرفوض (Apple فقط).
- التفاصيل والإصلاحات المعلّقة: FINAL_PROMPT §0-F.

## D22 — VoiceStudio / OmniVoice + post-launch open-source tools (2026-10-20)
**Voice (founder decision: use everything VoiceStudio offers, keep our product private):**
- The 600+ language capability comes from the engine **k2-fsa/OmniVoice (code Apache-2.0)** — free to modify and keep private, including in a commercial product. Verify the model weights license on Hugging Face (k2-fsa/OmniVoice) before production.
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
Each: license check, self-host plan, security review, added to COST_PLAN when adopted.
