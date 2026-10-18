# Courier Copilot — FINAL BUILD PROMPT (v1.0, October 2026)

> هذا البرومبت موجَّه إلى مساعد برمجة ذكي (أو فريق وكلاء) سيبني **Courier Copilot** داخل المستودع `haytham26/courier`.
> الشرح بالعربية، والكود والأوامر والأسماء بالإنجليزية.
> البرومبت مكتفٍ بذاته: لا تحتاج أي محادثة سابقة. ترتيب السلطة: `DECISIONS.md` (D1–D12) ثم هذا البرومبت ثم مستندات البحث.
> أي بند موسوم **[UNVERIFIED]** أو **[OPEN]** أو **[RE-CONFIRM]** يجب التحقق منه بمصدر موثّق قبل الاعتماد عليه في قرار تسعير أو قانون أو إصدار.

---

## 0. قواعد المنفِّذ (إلزامية)

1. **Git:**
   - لا تعمل على `main` مباشرة. كل خطوة على فرع مستقل: `feat/<phase>-<step>-<slug>` أو `fix/...` أو `chore/...`.
   - Commits صغيرة وواضحة (Conventional Commits). كل تغيير يدخل عبر PR يُدمج **تلقائيًا** فقط بعد نجاح كل بوابات الجودة في القسم 0-A. بعد كل مرحلة: tag (`v0.<phase>`) للاسترجاع.
2. **تنفيذ ذاتي متواصل (D10):** نفِّذ خطة البناء كاملة بلا توقف للموافقة، خطوة بعد خطوة، حسب «حلقة الجودة» في القسم 0-A. لا تتوقف إلا لما لا يقدر عليه إلا المؤسس (القسم 0-A.6).
3. **تحقق من الإصدارات قبل التثبيت:** لا تخترع أرقام إصدارات أو أسماء حزم أو مستودعات. قبل تثبيت أي حزمة تحقق من وجودها وإصدارها المستقر الحالي ورخصتها من المصدر الرسمي (npm / PyPI / GitHub releases / صفحة التوثيق). الحزم الأصلية في الموبايل تُثبَّت بـ `npx expo install`. الإصدارات في هذا البرومبت **مرشّحة** وليست مثبّتة؛ التثبيت النهائي يُسجَّل في `docs/adr/ADR-001-versions.md` بعد اختبار الأسبوع الأول.
4. **لا أسرار في git أبداً:** لا مفاتيح API ولا `.env` ولا شهادات. استخدم مدير أسرار على الخادم فقط. `gitleaks` في pre-commit وفي CI. وسّع `.gitignore` ليشمل: `.env*`, `*.pem`, `*.key`, `secrets/`.
5. **لا وسطاء نماذج غير رسميين:** استدعاء النماذج عبر SDKs الرسمية للمزوّدين بمفاتيح من جانب الخادم فقط. البوابة الوحيدة المسموحة هي LiteLLM (MIT core, ≥ 1.83.0, hash-locked) إن احتجنا بوابة. لا proxies مجهولة ولا مفاتيح في التطبيق.
6. **الرخص:** ممنوع ضمّ أي شيء AGPL / GPL / SSPL / Commons Clause / CC-NC / FSL / BUSL داخل التطبيق (انظر القسم 9).
7. **عند الشك:** إذا تعارض شيء مع D1–D11 اتبع القرارات. القرارات التقنية تحسمها لجنة المراجعة وتُسجَّل في `docs/adr/`. لا تتوقف إلا لقرار تجاري أو قانوني أو حساب/مال (0-A.6)، وأثناء الانتظار تكمل كل ما لا يعتمد عليه.
8. **المواصفات أولاً:** الأداة الوحيدة للمواصفات هي **OpenSpec**. لا تنفّذ ميزة بلا spec معتمد. التصميم لا يُنفَّذ إلا من tokens معتمدة.
9. **صلاحيات الوكلاء:** دور قاعدة بيانات read-only للوكلاء، ومفاتيح Stripe في test mode فقط.


## 0-A. وضع الشركة الكاملة والتنفيذ الذاتي (D10، D11) — أعلى من أي قسم آخر

### 0-A.1 النطاق
**نسخة واحدة كاملة.** كل الخدمات في القسم 7 (P0 و P1 و P2) وكل بنود Phase G، ومنها **مسح الملصقات بالكاميرا (OCR + باركود)**، تُبنى قبل التسليم. لا «نسخة أولى ثم ثانية». المؤسس يستلم تطبيقًا كاملًا ويدخل مباشرة فترة الاختبار الميداني.

### 0-A.2 الشركة (فريق الوكلاء)
شغّل الأدوار في القسم 11 كفريق كامل، وأضف لها:
- **لجنة مراجعة لكل وحدة (Review Board):** قبل دمج أي PR، تراجعه لجنة من مراجعين مستقلين بزوايا مختلفة: الصحة (correctness)، الأمان، الأداء والبطارية، التصميم (D7)، الصوت وتعدد اللغات، الخصوصية والرخص، قابلية الصيانة. كل مراجع يحاول **رفض** التغيير؛ يُدمج فقط إذا لم يجد أغلبيتهم مشكلة حقيقية. على امتداد المشروع يتجاوز عدد المراجعات المستقلة 100.
- **مدقق الحقائق:** قبل تثبيت أي مكتبة أو استخدام أي API، يتحقق من الإصدار والرخصة والسعر من المصدر الرسمي، ويسجّل ذلك في `docs/adr/ADR-001-versions.md`.
- **مهندس الاكتمال:** بعد كل مرحلة يسأل «ما الناقص؟» مقارنةً بـ DECISIONS.md والقسم 7 وجدول التكافؤ في RESEARCH_2026_WAVE3.md، ويضيف الناقص كخطوات جديدة تلقائيًا.

### 0-A.3 حلقة الجودة لكل خطوة (لا تنتقل قبل نجاحها)
1. اكتب spec (OpenSpec) ← نفّذ ← اختبارات وحدة وتكامل.
2. شغّل **كامل** مجموعة الاختبارات المعنية (pytest، Jest/Vitest، Maestro E2E بتسجيلات صوتية، promptfoo على مجموعة عناوين Canterbury الذهبية، اختبارات offline/sync chaos).
3. **اختبار الثبات (backtest):** أعد تشغيل المجموعة الحرجة (الإملاء والتصحيح، الأوامر الصوتية، المزامنة، الدفع) **50 مرة متتالية** في CI مع بيانات وترتيب عشوائي. أي فشل واحد = فشل الخطوة؛ اعثر على السبب الجذري وأصلحه (ممنوع تعطيل أو تخطي اختبار).
4. لجنة المراجعة (0-A.2) ← إصلاح كل ما وجدته ← إعادة من البند 2.
5. نجاح كامل ← دمج ← tag ← تحديث `docs/PROGRESS.md`.

### 0-A.4 ترتيب الملفات (لا فوضى)
```
courier/
├── apps/mobile/          # Expo app (features/<feature>/ ، modules/voice ، modules/maps)
├── apps/web/             # Next.js: لوحة السائق، /admin، التسويق، المساعدة
├── services/api/         # FastAPI + LangGraph + Pipecat (الكود الحالي في app/ ينتقل هنا)
├── services/worker/      # Hatchet jobs: LINZ، تعلّم الأبواب، التقارير
├── packages/shared/      # مخطط الأدوات الصوتية + الأنواع (مصدر واحد → Zod و Pydantic)
├── packages/nz-address/  # القاموس والمطبّع المشترك
├── packages/design-tokens/
├── infra/                # docker-compose، maps/، valhalla/، migrations/
├── tests/golden/         # تسجيلات وعناوين Canterbury الذهبية
├── openspec/             # spec لكل ميزة
└── docs/                 # adr/، DECISIONS.md، PROGRESS.md، runbooks/
```
CODEOWNERS لكل مجلد، و CLAUDE.md داخل كل حزمة يشرح قواعدها.

### 0-A.5 الحفظ والاسترجاع
- كل شيء على GitHub (`haytham26/courier`): الكود، الـ specs، الـ ADRs، تقارير الاختبار.
- `main` محمي ودائمًا أخضر. tag بعد كل مرحلة (`v0.A`، `v0.B`…) و release candidate في النهاية (`v1.0.0-rc.1`).
- `docs/PROGRESS.md` يُحدَّث بعد كل خطوة: ما انتهى، ما المتبقي، أين توقفنا — حتى تستطيع أي جلسة جديدة الإكمال.

### 0-A.6 متى تتوقف فقط
فقط لما لا يمكن أتمتته: إنشاء الحسابات والدفع (Apple، Google Play، Stripe live، مزوّدي الصوت)، المفاتيح، القرارات القانونية والتسعير النهائي، والاختبار على **هاتف حقيقي في يد السائق**. في هذه الحالة: سجّل الطلب في `docs/FOUNDER_TODO.md`، أرسل ملخصًا، و**أكمل كل العمل الآخر** أثناء الانتظار.

### 0-A.7 التسليم
التطبيق «جاهز للاستلام» عندما: كل خدمات القسم 7 مبنية؛ كل الأدوات الصوتية مغطاة باختبار؛ 50/50 نجاح في اختبار الثبات للمسارات الحرجة؛ لا ملاحظة مفتوحة من لجان المراجعة بدرجة حرجة أو عالية؛ builds على TestFlight و Play Internal Testing؛ دليل تشغيل للمؤسس في `docs/HANDOVER.md`.

---

## 0-B. سياسة التكلفة: مجاني أولًا مع تحويل تلقائي (D12)

التفاصيل الكاملة في `docs/COST_PLAN.md`، وهو مُلزِم.
1. **كل قدرة لها سلسلة مرتبة:** افتراضي مجاني (على الهاتف / أدواتنا المفتوحة على خادمنا) ← حصة مجانية رسمية ← مزوّد مدفوع. التحويل تلقائي عند الفشل أو البطء أو نفاد الحصة، والسائق لا يُقطع أبدًا.
2. **التبديل بسطر واحد:** التطبيق يستدعي أسماء منطقية (`courier-llm`، `courier-stt`، `courier-tts`، `courier-realtime`)؛ الترتيب في `infra/router/` (LiteLLM ≥ 1.83.0، لا 1.82.7/1.82.8) وطبقة `ProviderChain` للصوت.
3. **الصوت:** sherpa-onnx على الهاتف ← faster-whisper / Kokoro على خادمنا ← Groq / Cloudflare free ← Deepgram / Cartesia. المحادثة الحية: Pipecat cascade على LiveKit self-hosted، و Gemini Live (paid) / OpenAI Realtime احتياطي مدفوع.
4. **PII:** طلبات فيها بيانات سائق/زبون لا تذهب لمستوى مجاني يدرّب على البيانات (Gemini free وأمثاله = تطوير فقط).
5. **حساب واحد لكل مزوّد.** ممنوع تعدد الحسابات أو المفاتيح لمضاعفة الحصص.
6. **Sandbox:** gpt4free وأي وسيط غير رسمي مسموح فقط في `sandbox/` معزول ببيانات اصطناعية. CI يفشل إن ظهر في الإنتاج، والخادم يرفض الإقلاع إن وُجد مع `ENV=prod`.
7. **البناء والنشر:** GitHub Actions + `eas build --local` + Fastlane + OTA self-hosted (expo-open-ota على R2)؛ EAS Free/Starter احتياطي فقط.
8. **الاستضافة:** Oracle Always Free (Sydney) + Cloudflare R2/Tunnel؛ VPS مدفوع احتياطي. GPU خاص فقط عندما يصبح أرخص من الدفع لكل دقيقة.
9. **المدفوع الحتمي فقط:** Apple، Google Play، رسوم Stripe/RevenueCat، النطاق، و SMS إن فُعّل.
10. التكلفة التقديرية [UNVERIFIED]: 1 سائق ≈ $0–5/شهر، 10 ≈ $10–65، 100 ≈ $170–660، 1000 ≈ $1k–3.6k.


## 0-C. المراقبون والمصلحون، والتسليم على أندرويد (D13)

### 0-C.1 فريق المراقبة والإصلاح (يعمل طوال التنفيذ)
| الدور | ماذا يراقب | ماذا يفعل عند المشكلة |
|---|---|---|
| **مراقب البناء (Build Watcher)** | كل تشغيل لـ CI: lint، typecheck، الاختبارات، اختبار الثبات 50×، بناء APK | يقرأ السجل، يحدد السبب الجذري، يفتح فرع `fix/` ويصلحه، ويعيد التشغيل حتى يخضرّ |
| **مراقب التشغيل (Runtime Watcher)** | التطبيق على المحاكي: أعطال، شاشات بيضاء، تسريب ذاكرة، تجمّد الصوت، أخطاء GlitchTip | يعيد إنتاج الخطأ باختبار Maestro، يصلحه، ويضيف الاختبار للمجموعة الدائمة |
| **مراقب الأداء** | البدء، الذاكرة، 60fps على الخريطة، زمن الأمر الصوتي، البطارية | يرفض أي تغيير يكسر ميزانيات الأداء ويصلحه |
| **مراقب الاعتماديات** | تعارض الإصدارات، `npx expo install --check`، `expo-doctor`، الرخص | يصحح الإصدارات ويسجّل في ADR-001 |
| **مراقب الاكتمال** | مقارنة المبني بـ DECISIONS.md والقسم 7 وجدول التكافؤ | يضيف الناقص كخطوات ويكملها |
| **مراقب الانحراف** | أي كود يخالف D1–D13 أو قواعد التصميم أو الأمان | يعيد العمل للمسار ويصلحه |

قاعدة: **لا يُترك خطأ معروف مفتوحًا.** كل خطأ يُسجَّل في `docs/BUGS.md` (الوصف، السبب، الإصلاح، الاختبار الذي يمنع تكراره) ولا يُغلق إلا بعد نجاح اختبار الثبات.

### 0-C.2 المنطقة الجغرافية
**كل منطقة كانتربري كاملة، ومنها كرايستشرش بالكامل** — الخريطة (PMTiles)، عناوين LINZ، ملفات Valhalla، والصور الجوية. القصّ بحدود منطقة Canterbury الرسمية من LINZ (ليس مستطيلًا). المستخدم يختار منطقته داخل التطبيق لاحقًا (Hornby، Northwood، …) لكن البيانات تغطي كل كانتربري.

### 0-C.3 المحاكي والتسليم على أندرويد (آخر خطوة بعد اكتمال كل شيء)
1. **إعداد المحاكي على جهاز المؤسس** (اكتب دليلًا خطوة بخطوة في `docs/HANDOVER.md` وسكربت `scripts/setup-emulator.(sh|ps1)`):
   - تثبيت Android Studio + Android SDK + جهاز وهمي (Pixel حديث، أحدث Android مستقر، Google Play image).
   - إعداد الميكروفون (Extended controls → Microphone → «Virtual microphone uses host audio input») والموقع (مسار GPX لجولة في كرايستشرش داخل `tests/fixtures/`).
   - أمر واحد يثبّت ويشغّل التطبيق على المحاكي.
2. **APK للهاتف الحقيقي:**
   - GitHub Actions يبني APK موقّعًا (release، keystore في GitHub Secrets) عند كل tag، ويرفعه كـ Release على المستودع.
   - المؤسس ينزّله من صفحة Releases ويثبّته مباشرة على هاتفه الأندرويد. اكتب الخطوات (السماح بالتثبيت من مصادر غير معروفة) في HANDOVER.md.
3. **سيناريو اختبار الاستلام** في `docs/ACCEPTANCE_TEST.md`: صباح كامل (إملاء 30 عنوانًا بأكثر من لغة → تقرير التصحيح → قائمة اليوم) + قيادة 10 محطات بدون لمس + وضع بلا إنترنت + مسح ملصق بالكاميرا. على المحاكي أولًا، ثم على الهاتف الحقيقي.
4. iOS/TestFlight يأتي قبل النشر فقط (يحتاج حساب Apple).

---

## 1. الاتصال بالمستودع وقراءة المستندات

```bash
gh repo clone haytham26/courier
cd courier
git checkout -b chore/0-read-docs
```

اقرأ بالكامل قبل كتابة أي كود، وبهذا الترتيب:
1. `DECISIONS.md` (D1–D9) — السلطة العليا.
2. `docs/` كاملة، خصوصاً: `docs/adr/ADR-001*` (قرار Expo 52 فيها **ملغى**)، `PLAN_REVIEW`، `RESEARCH_2026`، `DRIVER_INTERVIEW_1`، و `schema.sql`.
3. الكود الحالي في الخلفية: `app/agents/copilot.py` و `intake_graph` و `nz_address.py` و `requirements.txt` والاختبارات الستة الحالية.
4. `README.md` وأي `CLAUDE.md`.

**المخرَج:** تقرير قصير (في رد، وليس ملف) يذكر: بنية المستودع الحالية، ما يتعارض مع هذا البرومبت، والاختبارات الحالية ونتيجتها. ثم توقف.

مشاكل معروفة يجب إصلاحها لاحقاً (المرحلة A):
- `nz_address.py`: قائمة ضواحي مكتوبة يدوياً + `difflib`، والخلط بين اللاحقة والوحدة. القاعدة: **`42B` = رقم 42 ولاحقة B. الوحدة تُكتب `2/14`.**
- `intake_graph.verify` يعدّل مُدخله في مكانه (mutation)، وإعادة تشغيل الإجابات المطبّقة (replay) خاطئة.
- `requirements.txt` يستخدم نطاقات `>=` ← استبدلها بقفل `uv lock --generate-hashes`.
- أسماء الأدوات في `app/agents/copilot.py` تُعاد تسميتها حسب كتالوج القسم 4.4.

---

## 2. الفكرة الكاملة وقرارات المؤسس

### 2.1 المشكلة
سائقو التوصيل متعدد المحطات في Christchurch و Canterbury (نيوزيلندا) يتعاملون مع 100–200 محطة في الوردية. يُملون أو يلصقون عناوين فوضوية في المستودع، ويتبعون ترتيب مسار شخصياً، ويتذكرون الأبواب والبوابات والأكواد. التطبيقات الحالية (Spoke/Circuit, Zeo, Upper) تعتمد على اللمس، وإنجليزية أولاً، وتضع إثبات التسليم خلف اشتراك، وتتجاهل قوالب المسار الشخصية، وضعيفة دون إنترنت. واستخدام الهاتف باليد أثناء القيادة مخالف للقانون (Road User Rule 7.3A).

### 2.2 المنتج
مساعد صوتي حي متعدد اللغات يدير وردية السائق كاملة بالصوت: بدء الوردية، تحميل قائمة اليوم، تصحيح العناوين تلقائياً، ترتيبها حسب قالب السائق وقواعده، ثم التالي / تم التسليم / تخطٍّ / فشل / تراجع، ثم إنهاء الوردية. إضافة إلى ذاكرة الأبواب، وخريطة دون إنترنت، وخدمات SaaS كاملة.

### 2.3 قرارات المؤسس (ملزمة، لا تُخالَف)
- **D1:** المساعد الصوتي الحي (محادثة كاملة) جوهري في v1 ويعمل طوال الوردية.
- **D2:** كل شيء يمكن تنفيذه بالصوت وحده. كل ميزة لها أداة صوتية، والشاشة اختيارية.
- **D3:** كل اللغات من اليوم الأول. السائق يتكلم لغته؛ العناوين تبقى بصيغتها الإنجليزية الرسمية (LINZ).
- **D4:** إثبات التسليم الافتراضي هو قول السائق "delivered" (بأي لغة)، مع تسجيل الوقت و GPS تلقائياً. الصورة والتوقيع والباركود اختيارية.
- **D5:** رسالة SMS لتتبع العميل اختيارية، يفعّلها السائق، ومطفأة افتراضياً.
- **D6:** تقرير نهاية اليوم (km، أرباح، GST) اختياري ومطفأ افتراضياً.
- **D7:** تصميم بمستوى شركة كبيرة، بلا "مظهر AI".
- **D8:** المساعد يصحح العناوين تلقائياً، يخبر بما غيّر، ولا يسأل إلا عند الشك.
- **D9:** "تم" تعمل بثلاث طرق: الصوت، زر السماعة، وزر الشاشة.

### 2.4 قرارات حسم التعارضات (نهائية)
| # | القرار |
|---|---|
| R1 | Expo: أحدث SDK مستقر يجتاز اختبار الأسبوع الأول. المرشح SDK 58 **[UNVERIFIED]**، والبديل SDK 57 مع `expo >= 57.0.17` (RN 0.86.3). |
| R2 | مزامنة: سجل أحداث append-only مخصص عبر HTTP + op-sqlite. **لا PowerSync.** |
| R3 | المصادقة: **Better Auth** (لا Supabase). |
| R4 | المهام الخلفية: **Hatchet** (لا Arq+Redis، ولا الاثنان معاً). |
| R5 | الصوت الحي في v1 (يلغي "no Pipecat in v1"). |
| R6 | **Pipecat** هو المنسّق الوحيد؛ LiveKit RN SDK للنقل (WebRTC) فقط وليس LiveKit Agents. البديل: Pipecat SmallWebRTC. |
| R7 | لا wake word. بوابة sherpa-onnx VAD + KWS أثناء الوردية النشطة. |
| R8 | زر السماعة: ضغطة = تم، ضغطتان = تخطٍّ، ثلاث = فشل. "التحدث" عبر الصوت أو شريط الصوت. |
| R9 | التنسيق: **Unistyles 3 فقط**. |
| R10 | الاختبارات: jest-expo + RNTL (موبايل)، Vitest + Playwright (ويب و TS)، pytest (خلفية). |
| R11 | Langfuse مستضاف ذاتياً في أستراليا. |
| R12 | واجهة بلغة السائق و RTL في v1. |
| R13 | الصورة/التوقيع إضافة اختيارية؛ القول المنطوق هو POD. |
| R14 | SMS وتقرير اليوم في v1 كخيارات مطفأة افتراضياً. |
| R15 | Stripe للويب + RevenueCat للشراء داخل التطبيق؛ RevenueCat مصدر الاستحقاق الوحيد الذي يقرأه التطبيق. |
| R16 | أهداف اللمس: الإجراء الرئيسي في القيادة ≥ 64، بقية أزرار القيادة ≥ 56، الشاشات الأخرى حسب المنصة (44pt / 48dp). |
| R17 | الوضع الليلي قريب من الأسود (#0A0A0A–#121212)، ليس #000. |
| R18 | أرقام تكلفة الصوت **[UNVERIFIED]**؛ أعد بناء نموذج التكلفة من صفحات أسعار المزوّدين. بوابة VAD إلزامية. |
| R19 | مجموعة ذهبية: 200+ عنوان من Canterbury + عينات أوامر لكل لغة. |
| R20 | OpenSpec فقط. |
| R21 | Ferrostar خلف flag مطفأ؛ v1 يستخدم deep link لـ Google Maps / Apple Maps / Waze. |
| R22 | القص بمضلّع المنطقة الرسمي لـ Canterbury وليس bbox. |
| R23 | `42B` = رقم + لاحقة؛ `2/14` = وحدة. |
| R24 | سعر Solo عند NZ$35 تقريباً مساوٍ لـ Spoke Standard وليس ضعفه؛ يجب إعادة تبرير التسعير. |

---

## 3. المعمارية والـ Stack النهائي

### 3.1 بنية المستودع (Monorepo)
```
apps/mobile        # Expo + React Native
apps/web           # Next.js (dashboard, admin, help, tracking page, marketing)
apps/api           # FastAPI + Pipecat + LangGraph + tool registry
packages/shared    # enums (single source -> Zod + Pydantic), types, generated TS client
packages/ui-tokens # DTCG tokens -> Style Dictionary outputs
packages/nz-address# address parsing/normalisation shared logic
modules/voice      # in-house Expo native module (Swift/Kotlin)
infra/             # Valhalla, VROOM, Hatchet, Langfuse, Postgres, tiles pipeline
docs/adr/          # ADRs incl. ADR-001-versions.md
openspec/          # specs
```
pnpm workspaces + Turborepo.

### 3.2 مسار البيانات باختصار
الهاتف (op-sqlite + outbox + `modules/voice`) ⇄ HTTP `/v1` (FastAPI) ⇄ Postgres/PostGIS (Sydney). الصوت: الهاتف → LiveKit WebRTC → Pipecat pipeline لكل وردية → tool registry داخل العملية نفسها → قاعدة البيانات. المهام الخلفية عبر Hatchet. التوجيه عبر Valhalla + VROOM ذاتي الاستضافة.

### 3.3 الـ Stack (مرشّحات؛ تُثبَّت بعد الأسبوع الأول في ADR-001)
| الطبقة | الاختيار | ملاحظة |
|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | pin بعد الأسبوع 1 |
| Mobile | Expo (New Architecture, Hermes V1, dev client, expo-router) + React Native؛ البناء: GitHub Actions + `eas build --local` + Fastlane، OTA: expo-open-ota على R2 (EAS احتياطي، D12) | SDK 58 مرشح **[UNVERIFIED]**، بديل SDK 57 مع expo ≥ 57.0.17 |
| UI | Unistyles 3, Reanimated 4 + worklets (نسخ SDK)، FlashList v2، Expo UI، Material Symbols، Inter/Noto | |
| Maps | `@maplibre/maplibre-react-native` v11 (آخر إصدار مؤكد 11.3.7، أغسطس 2026) + PMTiles | MBTiles بديل |
| Camera (P2) | VisionCamera 5.x + nitro-modules + ML Kit plugin خاص بنا | |
| On-device voice | sherpa-onnx (≥ 1.13.6 مؤكد في releases؛ ثبّت أحدث 1.13.x) داخل `modules/voice` | |
| Transport | LiveKit RN SDK + Expo plugin | |
| Orchestrator | Pipecat 1.10.x (آخر إصدار مستقر مؤكد سبتمبر 2026) (`pipecat.flows` من core)، Smart Turn v3.2 | |
| Speech models | D12: افتراضي sherpa-onnx على الهاتف + faster-whisper / Kokoro على خادمنا عبر Pipecat cascade ← Groq / Cloudflare free ← مدفوع: Deepgram، Cartesia، Gemini Live GA (paid tier)، `gpt-realtime-2.1-mini` | IDs والترتيب في config؛ eval قبل أي تبديل؛ انظر COST_PLAN.md |
| Local DB | op-sqlite + SQLCipher | |
| Location | expo-location + expo-task-manager (Transistor كبديل مدفوع) | |
| Backend | FastAPI, Pydantic v2, LangGraph 1.x + Postgres checkpointer, SQLAlchemy 2, GeoAlchemy2, Alembic | hash-locked |
| Database | Postgres 16/17 + PostGIS 3 + pgvector (HNSW) + pg_trgm + fuzzystrmatch، Sydney (ap-southeast-2)، PITR | D12: self-hosted على Oracle Always Free + نسخ ليلي لـ R2؛ Postgres مُدار مدفوع احتياطي |
| Auth | Better Auth (organization + Expo plugins)، تحقق JWKS في FastAPI، RLS يقرأ claims | |
| Jobs | Hatchet | |
| Routing | Valhalla 3.6.x (آخر سلسلة مؤكدة)، VROOM (أحدث release رسمي من GitHub — رقم 1.15.0 غير موجود)، OR-Tools 9.x (للقواعد فقط) | pin images؛ لا OSRM ولا GraphHopper |
| LLM gateway | LiteLLM MIT core ≥ 1.83.0 (**إلزامي**، D12): on-device ← Groq / Cloudflare free (بلا PII) ← vLLM خاص عند الحجم ← Claude Haiku / GPT | hash-locked؛ ممنوع 1.82.7/1.82.8 |
| Web | Next.js (قاعدة `nextjs/saas-starter`) + shadcn/ui بألوان tokens + i18n/RTL | |
| Billing | Stripe (ويب، NZD، شامل GST) + RevenueCat (IAP) | |
| Email/SMS | Resend + React Email؛ مزوّد SMS برقم NZ طويل | المزوّد **[OPEN]** |
| Observability | Sentry SaaS، PostHog EU، Langfuse self-hosted AU، Uptime Kuma | D12: GlitchTip self-hosted بديل مجاني لـ Sentry |
| Hosting | Oracle Cloud Always Free A1 (Sydney/Melbourne) + Docker + Cloudflare R2/Tunnel/Pages؛ LiveKit Server self-hosted | VPS أسترالي مدفوع احتياطي؛ LiveKit Cloud احتياطي (D12) |
| Tests | pytest، Schemathesis، jest-expo + RNTL، Vitest، Playwright، Maestro، Reassure، Flashlight، promptfoo | |

**ممنوع تثبيته:** `expo-speech-recognition`، `whisper.rn` مستقل، `react-native-track-player` (v5 ممنوعة؛ v4 فقط إن لزم)، NativeWind، Restyle، HeroUI، PowerSync، Supabase، Arq.

**سياسة الترقية:** pin دقيق بعد الأسبوع الأول؛ الترقية فقط عبر PR مخصص مع اجتياز اختبار على جهاز حقيقي. CI يشغّل `npx expo install --check` و `expo-doctor`.

---

## 4. الوكيل الصوتي الحي + كتالوج الأدوات الكامل

### 4.1 بوابة الهاتف `modules/voice`
- Expo module داخلي (Swift/Kotlin). هو **المالك الوحيد** للمايكروفون، و AVAudioSession / AudioRecord، وجلسة أزرار الوسائط، و Android foreground service من النوع `microphone|location`. لا شيء آخر يفتح المايك.
- يشغّل sherpa-onnx: Silero VAD، KWS، GTCRN denoise، streaming ASR، TTS. يوزّع إطارات PCM على المستهلكين المحليين والسحابة.
- **دورة الحياة:** تبدأ الجلسة فقط من إجراء مرئي `start_shift` (قاعدة Android 14+ while-in-use)، وتتوقف عند `end_shift` أو `pause_listening`. مؤشر دائم وإشعار أثناء التشغيل.
- **iOS:** `UIBackgroundModes: audio, location`، category `playAndRecord`، mode `voiceChat`، `duckOthers`، توجيه Bluetooth.
- **البوابة (Gating):** لا يخرج صوت من الهاتف إلا إذا اكتشف VAD كلاماً أثناء وردية نشطة. نافذة محادثة 20–30 ث بعد كل اكتشاف. Ring buffer مدته 300 ms يحفظ بداية الكلام.
- **Barge-in:** عند إطلاق VAD أثناء TTS يتوقف التشغيل خلال إطار صوتي واحد ويُرسل interrupt للخادم. عتبات منفصلة للسماعة الخارجية و Bluetooth، مع إلغاء الصدى من النظام.
- **آلة حالات الجلسة الصوتية:** تعالج المقاطعات (مكالمات، Siri، تعليمات الملاحة)، تغيّر المسار، و media-services reset، ثم تعيد التسليح تلقائياً وتقول "listening resumed" بلغة السائق. لا يُمسك المايك أثناء مكالمة هاتفية أبداً.
- **قرار مسار السماعة:** في الأسبوع الأول اختبر هل ميكروفون HFP في السماعة يجعل الأزرار غير موثوقة مقارنةً بمايك الهاتف + مخرج A2DP. القرار لكل جهاز.
- **أزرار السماعة (D9/R8):** 1 = `mark_delivered`، 2 = `skip_stop`، 3 = `mark_failed` (يسأل عن السبب صوتياً).

### 4.2 الخادم والنماذج
- Pipecat pipeline واحد لكل وردية نشطة داخل الخلفية، مع `pipecat.flows` من core (حزمة `pipecat-flows` المؤرشفة ممنوعة). Smart Turn v3.2 لنهاية الدور، ومهلة صمت VAD للغات غير المغطاة. الـ pipeline يستدعي **tool registry داخل العملية**.
- النقل: LiveKit RN SDK عبر WebRTC مع token قصير العمر مُسخَّن مسبقاً. الخطة B: Pipecat SmallWebRTC.
- **كل IDs النماذج في config:**
  - رئيسي: نموذج Gemini Live native-audio **GA**. يجب الانتقال من `gemini-live-2.5-flash-native-audio` قبل إيقافه في **2026-12-13**. نماذج preview ممنوعة (تُغلق 2026-11-17). اسم الخليفة **[UNVERIFIED]** — تحقق من توثيق Google الرسمي.
  - احتياطي: OpenAI `gpt-realtime-2.1-mini` (الأسعار **[UNVERIFIED]**).
  - Cascade (beta) لـ te reo Māori ولغات المحيط الهادئ: cloud STT → Claude Haiku (SDK رسمي أو LiteLLM ≥ 1.83.0) → cloud TTS. التغطية اللغوية **[UNVERIFIED]**.
  - Offline: sherpa Whisper-small int8 متعدد اللغات + قواعد حتمية (~15 أمراً أساسياً) + Kokoro TTS أو حزم عبارات مولَّدة مسبقاً لكل لغة.
- **المسار السريع متعدد اللغات:** KWS لكل لغة لكلمة "delivered" + grammar موسومة باللغة. الإنجليزية ليست المسار الوحيد تحت 100 ms.
- **الردود:** ≤ 12 كلمة أثناء الحركة، دائماً بلغة السائق، والعناوين تُنطق داخل مقطع `en-NZ`.
- **حدود التكلفة:** لكل سائق ولكل tenant. عند بلوغ الحد: تدهور إلى cascade ثم offline grammar مع تحذير صوتي. **لا يُقطع السائق أبداً في منتصف الوردية.**

### 4.3 سياسة التأكيد (تُفرض في طبقة الأدوات، لا في الـ prompt)
| فئة الخطر | السلوك |
|---|---|
| `read` | بلا تأكيد |
| `reversible` | تنفيذ ثم عرض تراجع صوتي لمدة 10 ث |
| `destructive` / `external` | قراءة الإجراء وطلب "yes" صريح؛ الصمت = إلغاء |

### 4.4 سجل الأدوات (Tool Registry)
سجل Pydantic واحد في `apps/api` يولّد: مخططات LLM، خادم FastMCP للاختبار، نقاط REST تحت `/v1`، عميل TypeScript، وخريطة إجراءات الواجهة. كل أداة تعلن:

```python
class ToolSpec(BaseModel):
    name: str
    args_model: type[BaseModel]
    risk: Literal["read", "reversible", "destructive", "external"]
    idempotency_key: str          # how the key is derived
    entitlement_key: str | None
    offline: bool                 # must be covered by on-device grammar
```

**CI يفشل إذا وُجد إجراء واجهة بلا أداة (D2).** كل استدعاء يُسجَّل في `voice_commands` و `idempotency_keys`.

### 4.5 الكتالوج الكامل
(offline = يجب أن تغطيه القواعد المحلية)

| المجال | الأدوات |
|---|---|
| Shift | `start_shift`, `end_shift`, `pause_listening`, `resume_listening`, `take_break`, `end_break` |
| Day list | `add_stop`, `dictate_stops`, `import_list` (paste/email/CSV/Excel), `scan_label` (phase 2), `edit_stop`, `remove_stop` (destructive), `correct_address`, `confirm_address_correction`, `undo_correction`, `read_list_summary` |
| Route | `optimise_route`, `reorder_stop`, `apply_template`, `save_template`, `list_templates`, `set_rule`, `list_rules`, `delete_rule` (destructive) |
| Driving | `next_stop` (offline), `repeat_last` (offline), `stop_detail`, `navigate` (deep link), `eta_remaining`, `find_parcel`, `how_many_left` (offline) |
| Outcome | `mark_delivered` (offline، بلا تأكيد، مع undo؛ يسأل أولاً إذا كان السائق أبعد من 150 m عن العنوان)، `mark_left_at` (offline)، `skip_stop` (offline)، `mark_failed` (offline، مع سبب وإعادة جدولة اختيارية للغد)، `undo` (offline)، `attach_photo`, `capture_signature`, `scan_barcode` (اختيارية) |
| Door memory | `add_door_note`, `read_door_notes`, `save_door_here`, `wrong_pin`, `set_gate_code` (مشفّر؛ يُقرأ فقط عند الوصول) |
| Customer (D5) | `toggle_customer_sms`, `text_customer` (external: تأكيد), `call_customer` (external: تأكيد) |
| Report (D6) | `toggle_day_report`, `day_summary`, `export_day_csv` |
| History | `query_history`, `last_visit` |
| Settings | `change_setting` (nav app, units, service time, voice speed, theme), `set_language` |
| Account | `plan_status`, `usage_left` |
| Safety | `sos_call` (external، تأكيد سريع), `report_hazard`, `report_map_error` |
| Onboarding | `voice_onboarding` |

---

## 5. تصحيح العناوين، القوالب، القواعد، ذاكرة الأبواب، الخرائط

### 5.1 تصحيح العناوين (D8)
- **المصدر:** LINZ NZ Addresses + NZ Addresses: Roads (CC BY 4.0)، مقصوصة بمضلّع منطقة Canterbury الرسمي، محمّلة في PostGIS مع pg_trgm و fuzzystrmatch. تحديث أسبوعي عبر LDS changeset API بمفتاح حساب LDS. **Layer IDs في config وتُفحص قبل كل استيراد.** إعادة ترتيب بيانات مارس 2026 **[UNVERIFIED]**.
- **Pipeline حتمي — الـ LLM لا يكتب عنواناً أبداً:**
  1. Normalise + tokenise؛ الرقم واللاحقة والوحدة منفصلة (`42B` ≠ `2/14`).
  2. توليد مرشحين بـ RapidFuzz و Double Metaphone (أسماء الماوري تحتفظ بالـ macrons) و trigram.
  3. التحقق أن رقم المنزل موجود على ذلك الطريق في تلك المنطقة.
  4. حساب الثقة.
  5. إرجاع `linz_address_id`.
- **صحّح ثم أبلغ:** "you said X, corrected to Y" (بلغة السائق، والعنوان بالإنجليزية)، صوتاً وبطاقة مع Undo.
- **اسأل فقط** إذا: الرقم غير موجود في LINZ، أو الشارع موجود في منطقتين أو أكثر، أو العنوان خارج المنطقة، أو الثقة تحت العتبة.
- كل تصحيح في `address_corrections`؛ التصحيحات المقبولة تغذي lexicon لكل tenant يُطبَّق على حدود الـ tokens فقط.
- شريحة عناوين Canterbury دون إنترنت (~250k صف، SQLite FTS5) تُشحن للهاتف.

### 5.2 القوالب والقواعد
- `route_templates`: عدة قوالب لكل سائق، كل قالب مقاطع مرتبة.
- **Master Template Lock:** ترتيب القالب هو الأساس. VROOM يُدخل فقط المحطات خارج القالب ويعالج طلبات إعادة الترتيب.
- `driver_rules` مخزنة بشكل منظم (مثل "school zone before 8:30"، "always do X first") وتُترجم إلى قيود VROOM، و OR-Tools فقط لما لا يعبّر عنه VROOM.
- **Offline:** الترتيب من القالب، والمحطات الجديدة بـ nearest-insert.

### 5.3 ذاكرة الأبواب
- الربط فقط عبر `delivery_event.stop_id → stops.location_id`. لا استخدام لأقرب جار مكاني لتحديد العنوان الذي يتعلّم.
- التعلّم **job مؤجل في Hatchet** وليس AFTER INSERT trigger. الـ job:
  - يتخطى الأحداث المتراجع عنها؛
  - يتطلب دقة ≤ 15 m؛
  - يرفض القيم الشاذة الأبعد من ~60 m عن نقطة الدخول الحالية أو نقطة LINZ؛
  - يحتفظ بالنقطة الجديدة كمرشح حتى تتكرر مرتين؛
  - يوزن حسب الدقة؛
  - لا يتعلم أبداً من wrong-pin أو تسليمات الجيران.
- `save_door_here` يضبط النقطة مباشرة.
- الذاكرة لكل tenant (`location_memory`) مربوطة بـ LINZ `address_id` المشترك.
- أكواد البوابات مشفّرة، وخارج الـ embeddings والسجلات وسياق الـ LLM.

### 5.4 الخرائط والتوجيه
- **Vector tiles:** Geofabrik NZ PBF → osmium (مضلّع المنطقة؛ في الخلفية فقط لأنه GPL) → planetiler مع Protomaps profile → `canterbury.pmtiles`. تنزيل عبر Wi-Fi مع استئناف و checksums ومستثنى من النسخ الاحتياطي. العرض بـ MapLibre RN v11. MBTiles بديل إن فشل PMTiles.
- **Aerial (phase 2):** raster PMTiles من LINZ open-data COGs على AWS. لا استخدام جماعي لـ Basemaps API.
- **Routing:** Valhalla 3.6.x (matrix + directions)، VROOM (أحدث release رسمي)، OR-Tools 9.x (قواعد فقط).
- **Navigation:** deep link إلى Google Maps / Apple Maps / Waze إلى نقطة الدخول المتعلَّمة، مع ducking لصوتنا بجانب تطبيق الملاحة.
- **Attribution في التطبيق والويب:** "© LINZ CC BY 4.0" و "© OpenStreetMap contributors (ODbL)". لا تخزين لبيانات Google، ولا geocoding جماعي عبر Nominatim العام.
- **Geofences:** 150 m و 30 m، مع تدوير المحطات القادمة للبقاء ضمن حد iOS (20 منطقة).

### 5.5 المزامنة دون إنترنت
- قاعدة محلية واحدة: **op-sqlite + SQLCipher**. Outbox append-only: client UUID، `seq` رتيب لكل جهاز، `occurred_at`، GPS fix.
- **"Delivered" لا يُحجب أبداً بالشبكة:** كتابة محلية ← haptic + earcon + تأكيد صوتي ← مزامنة.
- **Push:** `POST /v1/shifts/{id}/events:batch` بحد حجم؛ الخادم `INSERT … ON CONFLICT (id) DO NOTHING`، يعيد نتائج جزئية لكل عنصر + cursor، ويخزن `occurred_at` و `received_at`، ولا يثق بساعة العميل للترتيب.
- **Pull:** `GET /v1/sync?cursor=` يعيد تغييرات `updated_at` و tombstones (قائمة اليوم، التصحيحات، القوالب، الملاحظات).
- كل سائق هو الكاتب الوحيد لأحداثه. لا CRDTs. التراجع والتصحيح أحداث جديدة (`reverts_event_id`). حالة المحطة تُشتق من الأحداث في نفس الـ transaction.
- TanStack Query لقراءات الخادم فقط، ولا يخزن بيانات النطاق.
- مزامنة خلفية انتهازية بـ expo-background-task؛ المزامنة الرئيسية داخل خدمة الوردية.
- وضع offline يُعلن صوتياً + chip حالة بعدد الطابور.

---

## 6. نموذج البيانات
أول Alembic migration = `schema.sql` المصحح. كل جدول مملوك لـ tenant فيه `org_id` (و `driver_id` حيث ينطبق)، `created_at`, `updated_at`, `deleted_at`، و **RLS enabled + forced**. كل الـ IDs من نوع UUID.

| الجدول | الأعمدة الأساسية |
|---|---|
| orgs | id, name, plan, region |
| memberships | org_id, user_id, role (owner/dispatcher/driver) |
| drivers | id, org_id, auth_user_id, name, phone, lang (BCP-47), lang_secondary, voice_prefs jsonb, nav_app, units |
| consents | driver_id, kind (always_on_mic, offshore_audio, sms), granted_at, version |
| nz_addresses (مرجع مشترك) | linz_address_id PK, unit, number, suffix, road, locality, town, point geography, lat, lon |
| address_lexicon | org_id, raw_token, fixed_token, hits |
| location_memory | org_id, linz_address_id, entry_point, candidate_point, candidate_hits, samples; UNIQUE (org_id, linz_address_id) |
| location_notes | org_id, linz_address_id, kind, text, gate_code_enc bytea, embedding vector(1024), embedding_model |
| runs | org_id, driver_id, name, territory (nullable), depot |
| route_templates / template_segments | org_id, driver_id, name, ordered segments |
| driver_rules | org_id, driver_id, rule jsonb, active |
| shifts | org_id, driver_id, run_id, started_at, ended_at, km |
| stops | org_id, shift_id, linz_address_id, raw_input, seq, status (enum مشترك مع events), customer_name, customer_phone_enc, tracking_sms_enabled, time_window |
| parcels | org_id, stop_id, barcode, label |
| delivery_events | id (client UUID) PK, org_id, driver_id, stop_id, device_seq, kind (CHECK: delivered, left_at, skipped, failed, deferred, undo, note), reason, utterance, utterance_hash, lat, lon, accuracy_m, distance_m, reverts_event_id, occurred_at, received_at |
| pod_attachments | org_id, event_id, type (photo/signature/barcode), object_key |
| address_corrections | org_id, driver_id, stop_id, raw_input, linz_address_id, confidence, reason, mode (auto/asked), accepted |
| voice_commands (audit) | org_id, driver_id, utterance, lang, tool, args jsonb, result, source (local/cloud/cascade), confidence, idempotency_key |
| idempotency_keys | key, org_id, tool, response, created_at |
| voice_sessions / transcripts | org_id, driver_id, shift_id, provider, model_id, minutes, cost؛ transcripts تُحذف بعد 30 يوماً |
| gps_trace | org_id, shift_id, ts, point؛ partitioned مع TTL (لحساب km في D6) |
| day_reports | org_id, driver_id, date, km, earnings, gst, csv_key |
| tracking_tokens | stop_id, token_hash, expires_at |
| subscriptions | org_id, source (stripe/apple/google), external_id, status, current_period_end |
| entitlements | org_id, feature_key, limit |
| usage_counters | org_id, driver_id, period, voice_minutes, sms_sent, ocr_scans |
| processed_webhooks | provider, event_id |
| audit_log | actor, action, target, impersonated_by |

الـ enums في `packages/shared` كمصدر واحد يولّد Zod و Pydantic، واختبار يثبت تطابقهما.

**الخلفية:** FastAPI + Pydantic v2 تحت `/v1`؛ OpenAPI هو العقد ويولّد عميل TS؛ Schemathesis يختبر الـ API. LangGraph 1.x مع Postgres checkpointer (`thread_id = shift_id`)، الحالة تتغير فقط عبر قيم إرجاع العقد، و `MemorySaver` ممنوع في الإنتاج. الاستحقاقات تُفحص من قاعدة البيانات على الخادم؛ لا استدعاء لـ Stripe في مسار الطلب. Hatchet jobs: LINZ refresh، door learning، rollups، retention purge، webhook processing.

---

## 7. خدمات SaaS الداخلية مع الأولويات

| الأولوية | البنود |
|---|---|
| **P0 (v1)** | الاستيراد بالصوت (إملاء متعدد المحطات) واللصق والبريد و CSV/Excel مع ربط أعمدة بالـ LLM؛ إضافة محطة من الموقع الحالي؛ عرض خريطة + قائمة مع سحب أو ترتيب صوتي؛ أسباب الفشل مع إعادة الجدولة لمسار الغد؛ مُحدِّد موضع الطرد (`find_parcel`)؛ تتبّع GPS خلفي موفّر للبطارية؛ تصحيح العناوين (D8)؛ تحسين المسار مع نوافذ زمنية وأولوية؛ إعادة التحسين أثناء المسار؛ تسليم الملاحة؛ ذاكرة الأبواب؛ POD منطوق (D4) + طابور offline؛ undo؛ القوالب والقواعد؛ السجل والمسارات المحفوظة؛ الإعدادات بالصوت؛ واجهة متعددة اللغات مع RTL؛ onboarding بالصوت؛ trial و Solo و Team؛ الفوترة (Stripe ويب + RevenueCat IAP)؛ الاستحقاقات والاستخدام؛ لوحة ويب (السجل، القوالب، الحساب)؛ `/admin` (المستخدمون، الاشتراكات، أخطاء Sentry، تكلفة AI/SMS لكل مستخدم، impersonation مع audit)؛ حذف الحساب وتصدير البيانات؛ مركز مساعدة + وكيل مساعدة AI متعدد اللغات مع تصعيد بالبريد؛ صفحة حالة؛ رسائل Resend |
| **P1 (v1، اختياري، مطفأ افتراضياً)** | صفحة رابط التتبع + SMS (D5): رقم NZ طويل، معالجة STOP، معاملاتية فقط، إضافة مقاسة. تقرير نهاية اليوم (D6): km، أرباح، GST، CSV. POD بالصورة والتوقيع والباركود |
| **P2** | OCR للملصقات (VisionCamera 5 + ML Kit Nitro plugin خاص)؛ طبقة جوية؛ خريطة حية للـ dispatcher في Team وتسليم المسارات؛ IRD logbook PDF والفواتير؛ Ferrostar؛ مكالمات مقنّعة (توفر Twilio Proxy **[UNVERIFIED]**) |

**التسعير:**
- NZD شامل GST (`tax_behavior=inclusive`)، و Stripe Tax لمبيعات الويب فقط (المتاجر تدفع GST لمبيعاتها).
- Trial 14 يوماً بحد لدقائق الصوت، لا لعدد المحطات.
- نقاط السعر ونموذج هامش ≥ 70% **[OPEN]** حتى تُتحقق تكاليف الصوت من صفحات المزوّدين.
- POD وذاكرة الأبواب والصوت الأساسي **لا تُوضع خلف اشتراك أبداً**.
- فشل الدفع: فترة سماح، والتحويل إلى read-only فقط بعد انتهاء الوردية.
- نسبة GST ونسبة IRD للكيلومتر في config، لا hard-coded.

**أدوات البناء السريع** (bolt.diy ذاتي الاستضافة، و Dyad اختيارياً): فقط لصفحات الإعدادات والسجل والفوترة والإدارة والمساعدة والتسويق. ممنوع أن تلمس auth، المدفوعات، migrations، الصوت، التوجيه، العناوين، المزامنة، أو GPS. مخرجاتها تمر بـ PR review و CI.

---

## 8. قواعد التصميم (D7)
- **نظام التصميم "Courier Base":** DTCG JSON tokens في `packages/ui-tokens`، تُبنى بـ Style Dictionary 4.x إلى TS (Unistyles)، و CSS variables / Tailwind v4 (ويب، shadcn مُثيَّم من tokens)، وأنماط PDF. Tokens Studio اختياري.
- **محرك تنسيق واحد** (Unistyles 3) و**مجموعة أيقونات واحدة** (Material Symbols، weight 500). Lint يفشل على أي hex أو px أو font خام داخل المكونات.
- **Native shell:** Expo UI (SwiftUI/Compose)، Expo Router native tabs، Reanimated 4، expo-haptics. الـ sheets من Expo UI native sheet؛ `@gorhom/bottom-sheet` فقط إن وجد الـ spike فجوة.
- **الخطوط:** Inter بأرقام جدولية؛ Noto Sans لكل نص يُحمّل حسب اللغة (Arabic, Devanagari, CJK, Gurmukhi, Bengali, Thai, Tamil). نص الجسم ≥ 17pt؛ سطر المحطة التالية 28pt semibold، سطران كحد أقصى مع shrink-to-fit.
- **شاشة القيادة:** 3 عناصر كحد أقصى (العنوان، ETA/المسافة، إجراء رئيسي واحد ≥ 64 بعرض كامل في منطقة الإبهام السفلية). بقية الأزرار ≥ 56. لا لوحة مفاتيح ولا نص طويل أثناء الحركة.
- **شريط الصوت:** شريط سفلي دائم 64dp. الحالات: idle, listening, thinking, speaking, offline, muted, error — لكل منها earcon و haptic. كل إجراء يُظهر Undo toast. إجراءات D9 تعطي نفس التغذية الراجعة أياً كانت طريقة التفعيل.
- **الثيمات:** day، night (قريب من الأسود)، glare؛ تبديل تلقائي حسب الشروق/الغروب والضوء المحيط. نمط الخريطة يتبع الثيم.
- **التباين:** نص القيادة ≥ 7:1، غيره ≥ 4.5:1. الحالة لا تُعرض باللون وحده. لوحة محايدة + لون مميز واحد، مُتحقق لعمى الألوان.
- **الحركة:** tokens فقط 120/200/300 ms. احترام reduce-motion. لا حلقات زخرفية.
- **i18n:** i18next + ICU + expo-localization. layout منطقي start/end في كل مكان. RTL من أول commit مع reload مُتحكم به. Pseudo-locales (Arabic, Urdu, Farsi) في CI. العناوين والأسماء مغلّفة بـ FSI/PDI، دائماً LTR إنجليزية، لا تُترجم ولا تُحوَّل حروفها.
- **الترجمات:** النصوص المترجمة آلياً موسومة `needs_review`. اللغات غير المراجَعة تعود إلى واجهة إنجليزية بينما يبقى الصوت بلغة السائق، والمنتج يصرّح بذلك.
- **منع مظهر AI:** لا gradients، لا glass، لا أيقونات sparkle، لا emoji، لا فقاعة chat كشاشة رئيسية، لا عبارة "I'm your AI assistant"، لا علامات تعجب.
- **المراجعة:** Storybook RN + screenshot diffs (LTR/RTL × 3 ثيمات × نص 100%/200%). مراجعة تصميم بشرية لكل PR في packages/ui. رحلات شهرية مع السائقين.
- **مخرجات ناقصة يجب إنتاجها (بموافقة المؤسس):** مجموعة tokens، مواصفات الشاشات، مواصفات واجهة الصوت (العبارات، التأكيدات، نصوص الإصلاح لكل لغة)، الهوية البصرية.

---

## 9. الأمن والقانون والخصوصية
- **بوابة الرخص:** لا AGPL / GPL / SSPL / Commons Clause / CC-NC / FSL / BUSL في التطبيق. أدوات الخادم تحت هذه الرخص تُستخدم دون تعديل أو كـ SaaS. SBOM + فحص رخص في CI بقائمة منع.
- **مكونات ممنوعة:** Porcupine، نماذج openWakeWord، piper1-gpl، نماذج Moonshine غير الإنجليزية، MMS، NLLB، Seamless، LibreTranslate، TEN framework، LiveKit turn-detector، RNTP v5، claude-task-master، contains-studio. Fleetbase مرجع فقط.
- **Silero VAD:** MIT حسب ملف LICENSE. **[RE-CONFIRM]** قبل الإصدار وثبّت ملف النموذج بعينه.
- **التبعيات:** pins دقيقة مع hashes (`uv lock --generate-hashes`). LiteLLM ≥ 1.83.0. إذا ثُبّت 1.82.7 أو 1.82.8 في أي مكان سابقاً، دوّر كل الأسرار.
- **الأسرار:** مدير أسرار على الخادم فقط؛ التطبيق يحصل على tokens قصيرة العمر؛ gitleaks في pre-commit و CI.
- **التشفير:** أكواد البوابات وأرقام هواتف العملاء مشفرة at rest.
- **Tenancy:** RLS على كل جدول عملاء، مع اختبارات تثبت أن القراءة عبر tenants تعيد صفر صفوف.
- **الخصوصية (NZ Privacy Act 2020):**
  - إشعارات IPP 3 للسائقين والمستلمين؛ موافقة IPP 12 للمعالجة خارج نيوزيلندا مع قائمة معالجين بالمنطقة ومدة الاحتفاظ؛
  - المايك يعمل فقط أثناء وردية نشطة، والإيقاف بالصوت وبالزر؛
  - لا تخزين للصوت افتراضياً، والنصوص تُحذف بعد 30 يوماً؛
  - Privacy Impact Assessment للمايك الدائم؛
  - معالجة طلبات الوصول والتصحيح IPP 6/7، وخطة اختراق لإبلاغ OPC؛
  - تأكيد إعدادات no-training و zero-retention لدى كل مزوّد **[UNVERIFIED per vendor]**.
- **Redaction:** وحدة PII مركزية واحدة تستخدمها Sentry `beforeSend` و allowlist في PostHog و mask في Langfuse. اختبار CI يفشل إذا تسرب عنوان أو هاتف أو GPS أو صوت.
- **SMS:** معاملاتية فقط، فقط عند تفعيل السائق، مع احترام STOP (UEMA 2007).
- **قانون القيادة:** لا تدفق يتطلب لمساً أثناء الحركة. التسويق لا يدّعي امتثالاً يتجاوز قاعدة "الهاتف المثبت واللمسة القصيرة".
- **امتثال المتاجر:** تبرير الصوت والموقع في الخلفية، purpose strings، تصريحات Play foreground-service مع فيديوهات توضيحية؛ Data safety و privacy labels؛ حذف الحساب داخل التطبيق؛ IAP للمشتريات داخل التطبيق بلا واجهة شراء Stripe أو روابط شراء في التطبيق؛ محاذاة 16 KB page لكل ملف `.so`.

---

## 10. الجودة و CI والمراقبة
- **الاختبارات:** pytest (Postgres/PostGIS testcontainers، RLS، replay المزامنة، migrations على قاعدة فارغة ومأهولة)، Schemathesis، jest-expo + RNTL، Vitest + Playwright، Maestro على EAS. Maestro لا يستطيع حقن صوت المايك، لذا أضف **مصدر صوت WAV للـ debug فقط** يغذي fixtures في pipeline الصوت. Reassure على كل PR؛ Flashlight وتشغيل Maestro لوردية كاملة ليلياً على Android منخفض المواصفات.
- **Evals:**
  - promptfoo مع مجموعة ذهبية من 200+ عنوان مسجل من Canterbury (أسماء ماوري، صيغ unit/slash، أرقام RD، ضجيج الفان)؛
  - مصفوفة أوامر لكل لغة (WER، دقة الأداة، معدل barge-in الخاطئ، بقاء العناوين بالإنجليزية)؛
  - تشغيل الحزمة كاملة قبل أي تبديل نموذج.
- **اختبارات إلزامية:** تطابق 1:1 بين السجل وخريطة الواجهة؛ D4: POD المنطوق يخزن GPS والوقت، ومسافة > 150 m تسأل؛ D9: "تم" بالطرق الثلاث end-to-end؛ offline chaos (airplane mode + replay)؛ شواذ تعلّم الأبواب؛ قواعد "اسأل فقط عند الشك".
- **SLOs (CI يفشل عند التراجع):**

  | المقياس | الهدف |
  |---|---|
  | Crash-free sessions | ≥ 99.5% |
  | نهاية الكلام → أول صوت p95 | < 800 ms online؛ < 400 ms لأوامر offline |
  | أمر صوتي → إجراء p95 | ≤ 1.5 s |
  | تصحيح عنوان p95 | ≤ 2 s |
  | تأخر المزامنة p95 (online) | ≤ 60 s |
  | توفر API | 99.9% |
  | البطارية (Android متوسط، شاشة مطفأة، GPS تكيفي، VAD gating) | ≤ 8%/h |
  | Cold start (Android منخفض) | < 2.5 s |

- **عمليات الموبايل:** سياسة thermal throttling (خفض دورة VAD/ASR و FPS الخريطة مع ارتفاع الحرارة)؛ خطة ضد قاتلي البطارية لدى المصنّعين (onboarding للإعفاء، watchdog، إرشادات dontkillmyapp)؛ ميزانية تنزيل النماذج والـ tiles (غالباً > 1 GB): Wi-Fi فقط، استئناف، checksums، بلا نسخ احتياطي.
- **المراقبة من أول commit:** Sentry SaaS (RN + Python، Hermes source maps عبر EAS، OTel propagation)؛ PostHog EU مع allowlist للخصائص وبلا replay لشاشات العناوين؛ Langfuse self-hosted AU مع تكلفة لكل وردية وتنبيه kill-switch؛ Uptime Kuma على VPS منفصل.
- **التسليم:** EAS Workflows مع fingerprint-gated OTA مقابل native builds؛ staged rollout 10% → 50% → 100% مع إيقاف تلقائي عند انخفاض crash-free؛ runbook للتراجع (إعادة نشر update group السابق)؛ مستويات SEV1–3 و on-call؛ CI يشغّل `npx expo install --check` و `expo-doctor`؛ أدوات أمن: gitleaks، Semgrep CE، Trivy، Renovate، SBOM.

---

## 11. أدوار فريق الوكلاء لتنفيذ البناء
أدوات الفريق: Claude Code مع `anthropics/skills` و `expo/skills`؛ 4–5 subagents مفحوصين ومثبّتين في `.claude/agents`؛ skills خاصة: `voice-tool-contract`، `nz-address-english-only`، `pod-delivered-utterance`، `design-system-courier`؛ `CLAUDE.md` لكل package. كل skill خارجي يُقرأ كاملاً ويُضمَّن (vendored) ويُثبَّت. ممنوع: MetaGPT، ChatDev، claude-flow، contains-studio، task-master.

| الدور | المسؤولية | النطاق المسموح |
|---|---|---|
| **Lead / Integrator** | يقسّم الخطوات، يكتب OpenSpec specs، يدير الفروع، يجمع ملخصات PR، يدير حلقة الجودة ولجان المراجعة | كل المستودع (قراءة)، `openspec/`, `docs/adr/` |
| **Mobile & Native Voice** | `apps/mobile`، `modules/voice` (Swift/Kotlin)، آلة حالات الصوت، الأزرار، الخلفية، op-sqlite outbox | `apps/mobile`, `modules/` |
| **Backend & Voice Server** | FastAPI، tool registry، Pipecat pipeline، LangGraph، Hatchet، المزامنة، الفوترة على الخادم | `apps/api`, `packages/shared` |
| **Geo & Routing** | LINZ loader، pipeline التصحيح، FTS slice، Valhalla/VROOM/OR-Tools، القوالب والقواعد، PMTiles | `packages/nz-address`, `infra/`, وحدات geo في `apps/api` |
| **Design System & Web** | tokens، Unistyles themes، i18n/RTL، Storybook، `apps/web` (dashboard، admin، help، tracking) | `packages/ui-tokens`, `apps/web`, مكونات UI |
| **QA / Security / Release** | الاختبارات، evals، CI، فحص الرخص و SBOM، redaction tests، EAS، runbooks؛ له حق الاعتراض على أي PR | `.github/`, tests, `infra/ci` |

قواعد الفريق: الوكلاء ينفذون فقط من specs و tokens معتمدة؛ إنسان يوافق على كل PR؛ دور DB للوكلاء read-only؛ Stripe test mode فقط؛ لا وكيل يعدّل ملفات خارج نطاقه دون طلب من Lead.

---

## 12. خطة البناء المرحلية
كل خطوة = فرع + PR + حلقة الجودة (0-A.3) + دمج تلقائي عند النجاح + تحديث `docs/PROGRESS.md`.

### Phase 0 — الأسبوع 1: Go/No-Go spike
**الخطوات:**
1. إنشاء هيكل الـ monorepo.
2. بناء dev client على SDK المرشح (تحقق أولاً من حالة SDK 58 رسمياً).
3. على أجهزة iOS و Android حقيقية، معاً: MapLibre + PMTiles؛ stub لـ `modules/voice` مع sherpa VAD/KWS/ASR؛ op-sqlite outbox؛ صوت في الخلفية والشاشة مقفلة و Google Maps في الواجهة؛ Android microphone foreground service؛ أزرار السماعة 1x/2x/3x على سماعات السائق وبلوتوث السيارة؛ LiveKit loopback؛ VisionCamera؛ bottom sheet.
4. فحص محاذاة 16 KB page.

**تعريف الإنجاز:** كل بند ينجح على المنصتين، ADR-001 يثبّت الإصدارات، و `expo-doctor` أخضر في CI. وإلا: الرجوع إلى SDK السابق وتسجيل السبب.

### Phase A — الأساسات (الأسابيع 2–3)
**الخطوات:** المخطط المصحح كأول Alembic migration (tenancy، RLS، enums، الجداول الجديدة)؛ enums في `packages/shared` تولّد Zod و Pydantic؛ Better Auth مع JWKS؛ CI (lint، typecheck، tests، gitleaks، SBOM/licence scan، hash locks)؛ Sentry مع PII redaction؛ إصلاح `nz_address.py` (suffix vs unit) و mutation في `intake_graph.verify`.
**تعريف الإنجاز:** الاختبارات الستة الحالية + اختبارات RLS و migrations و redaction خضراء.

### Phase B — العناوين والتوجيه (الأسابيع 3–5)
**الخطوات:** LINZ loader (مضلّع المنطقة، layer IDs في config)؛ pipeline التصحيح وتسجيل `address_corrections`؛ شريحة FTS دون إنترنت؛ Valhalla + VROOM؛ القوالب ومُترجم القواعد؛ pipeline PMTiles.
**تعريف الإنجاز:** المجموعة الذهبية (200+) تحقق ≥ 95% `linz_address_id` صحيح؛ اختبارات "اسأل فقط عند الشك" تنجح؛ الترتيب دون إنترنت يأتي من القالب.

### Phase C — النواة دون إنترنت وواجهة الموبايل (الأسابيع 4–7)
**الخطوات:** outbox + batch push + cursor pull؛ شاشة القيادة و next-stop sheet و D9 بالطرق الثلاث؛ تعلّم الأبواب كـ job مع فلترة الشواذ؛ حزمة tokens والثيمات الثلاث؛ i18n مع RTL و pseudo-locales.
**تعريف الإنجاز:** اختبار airplane-mode chaos لا يفقد أي حدث؛ replay idempotent؛ Maestro يغطي D9؛ screenshot diffs خضراء.

### Phase D — الصوت الحي (الأسابيع 5–9)
**الخطوات:** إكمال `modules/voice` (آلة الحالات، barge-in، المقاطعات وتغيّر المسار)؛ tool registry بكل أدوات الكتالوج + سياسة التأكيد + جداول idempotency/audit؛ Pipecat pipeline لكل وردية على نموذج Gemini GA (**ترحيل الخليفة وتقييمه قبل 2026-12-13**) مع احتياطي realtime-mini و cascade و offline grammar؛ حدود التكلفة.
**تعريف الإنجاز:** تطابق السجل/الواجهة 1:1؛ SLOs الكمون محققة؛ مصفوفة eval متعددة اللغات تنجح للغات ذات الأولوية؛ وردية كاملة ضمن ≤ 8%/h بطارية؛ وردية 10 ساعات بشاشة مطفأة دون أن يقتل المصنّع التطبيق.

### Phase E — SaaS (الأسابيع 8–11)
**الخطوات:** لوحة الويب و `/admin` والاستحقاقات؛ Stripe + RevenueCat مع idempotency للـ webhooks؛ trial بحدود صوت وفترات سماح؛ Resend ومركز المساعدة ووكيل المساعدة AI؛ حذف الحساب والتصدير؛ صفحة التتبع و SMS (D5) والتقرير (D6) كخيارات؛ onboarding صوتي.
**تعريف الإنجاز:** دورة شراء → استخدام → إلغاء → قفل عند نهاية الفترة تنجح في test mode؛ لا سائق يُقفل في منتصف الوردية؛ D5/D6 مطفأة افتراضياً وقابلة للتبديل بالصوت.

### Phase F — التقوية والإطلاق (الأسابيع 11–13)
**الخطوات:** PIA، سياسة الخصوصية، قائمة المعالجين، الموافقات؛ حزم مراجعة المتاجر؛ شاشة الـ attribution؛ runbook للإطلاق التدريجي و on-call؛ beta مع سائقين في Christchurch (ride-along).
**تعريف الإنجاز:** كل SLOs ثابتة لأسبوعين من الـ beta؛ مراجعة التصميم موقّعة (D7)؛ فحص الرخص نظيف؛ شروط Silero والمزوّدين مؤكدة؛ موافقة المتاجر.

### Phase G — ضمن v1 أيضًا (D11): كل بنود هذه المرحلة تُبنى قبل التسليم
Label OCR، الطبقة الجوية، Team dispatcher، IRD logbook، Ferrostar.

---

## 13. المخاطر
| الخطر | التخفيف |
|---|---|
| إيقاف Gemini Live 2.5 في 2026-12-13 وإغلاق preview في 2026-11-17 | IDs في config، حزمة eval، الترحيل ضمن Phase D، احتياطي realtime-mini |
| Expo SDK 58 غير مستقر أو المكتبات متأخرة | spike الأسبوع 1، الرجوع إلى 57.0.17+ |
| قواعد الصوت الخلفي، قاتلو البطارية، رفض المتاجر | البدء فقط من إجراء مرئي، watchdog، حزم مراجعة بفيديوهات |
| أزرار السماعة غير موثوقة على HFP | اختبار لكل جهاز في الأسبوع 1؛ الصوت والشاشة يبقيان |
| تكلفة الصوت أعلى من سعر الخطة؛ كل الأسعار **[UNVERIFIED]** | نموذج تكلفة من صفحات المزوّدين، VAD gating، حدود، cascade، تدهور offline |
| ضعف تغطية te reo Māori و Samoan و Tongan و Tagalog **[UNVERIFIED]** | cascade beta، حزم عبارات مسبقة، واجهة إنجليزية احتياطية |
| Deepgram en-NZ **[UNVERIFIED]** | keyterms بدلاً منه أو تخطي Deepgram |
| تغيّر LINZ layer IDs **[UNVERIFIED]** | IDs في config وتُفحص قبل كل استيراد |
| سلسلة التوريد (حادثة LiteLLM) | hash locks، Renovate، Trivy، تدوير الأسرار |
| روابط RN غير ناضجة (sherpa-onnx، ML Kit v5) | امتلاك native module أو fork |
| الحرارة على هاتف مثبت يشحن | سياسة thermal throttling |
| تنزيلات > 1 GB | Wi-Fi مع استئناف |
| شكاوى خصوصية من المايك الدائم | PIA، مؤشر، استماع أثناء الوردية فقط، لا تخزين صوت |
| التسعير مساوٍ لـ Spoke لا أعلى | إعادة التبرير بالصوت أولاً وذاكرة الأبواب وعناوين NZ |
| فريق صغير (1–3) | أداة واحدة لكل مهمة؛ أدوات البناء للأسطح القياسية فقط |

---

## 14. ما يجب أن يوفّره المؤسس

> **تحديث D12:** قائمة الحسابات أدناه تُقرأ مع `docs/COST_PLAN.md` (قسم المفاتيح). الآن: الحسابات المجانية فقط. الحسابات المدفوعة (مزوّدو الصوت والنماذج) هي احتياط يُفعَّل قبل الإطلاق فقط.
1. صلاحية write على `haytham26/courier` وحماية فرع `main` (مراجعة إلزامية).
2. حسابات وفوترة، وتُخزن مفاتيحها في مدير الأسرار وليس في git: Apple Developer، Google Play Console، Expo/EAS، Google Cloud (Gemini Live)، OpenAI، Anthropic، LiveKit (أو موافقة على self-host)، Stripe (test + live، NZ)، RevenueCat، Resend، Sentry، PostHog EU، مزوّد SMS برقم NZ طويل (**[OPEN]**)، استضافة Sydney لـ Postgres و API و Valhalla، VPS منفصل لـ Uptime Kuma، و LINZ LDS account key.
3. أجهزة اختبار حقيقية: iPhone، Android متوسط، Android منخفض، سماعات السائق، وصول إلى بلوتوث سيارة.
4. 200+ تسجيل صوتي لعناوين Canterbury حقيقية (بموافقة) + عينات أوامر لكل لغة ذات أولوية، وقائمة اللغات ذات الأولوية بالترتيب.
5. سائقون للـ beta والـ ride-alongs الشهرية في Christchurch.
6. قرارات مفتوحة: (OCR الملصقات محسوم: ضمن v1 حسب D11)؛ نقاط الأسعار ونموذج الهامش بعد التحقق من التكاليف، مزوّد SMS، الهوية البصرية، الموافقة على tokens ومواصفات الشاشات وواجهة الصوت.
7. مراجعة قانونية: PIA، سياسة الخصوصية، قائمة المعالجين ومناطقهم، شروط المزوّدين (no-training / zero-retention)، تأكيد رخصة Silero، نصوص تسويق متوافقة مع Rule 7.3A.
8. مراجعون لترجمات الواجهة لإزالة وسم `needs_review`.
9. لا موافقة على كل PR (D10). المؤسس يستلم التطبيق كاملًا ويدخل فترة الاختبار الميداني.

**ابدأ الآن بالقسم 0-A ثم القسم 1، واستمر حتى نهاية القسم 12 دون توقف إلا حسب 0-A.6.**
