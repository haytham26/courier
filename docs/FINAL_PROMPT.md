# Courier Copilot — FINAL BUILD PROMPT (v1.0, October 2026)

> هذا البرومبت موجَّه إلى مساعد برمجة ذكي (أو فريق وكلاء) سيبني **Courier Copilot** داخل المستودع `haytham26/courier`.
> الشرح بالعربية، والكود والأوامر والأسماء بالإنجليزية.
> البرومبت مكتفٍ بذاته: لا تحتاج أي محادثة سابقة. ترتيب السلطة: `docs/DECISIONS.md` (D1–D13 وأي قرار D يُضاف لاحقًا يصبح ملزمًا تلقائيًا) ثم `docs/COST_PLAN.md` ثم هذا البرومبت ثم مستندات البحث.
> أي بند موسوم **[UNVERIFIED]** أو **[OPEN]** أو **[RE-CONFIRM]** يجب التحقق منه بمصدر موثّق قبل الاعتماد عليه في قرار تسعير أو قانون أو إصدار.

---

## 0. قواعد المنفِّذ (إلزامية)

1. **Git:**
   - لا تعمل على `main` مباشرة. كل خطوة على فرع مستقل باسم معرّف الخطوة: `feat/<stepId>-<slug>` (مثال `feat/B.03-linz-loader`) أو `fix/...` أو `chore/...`.
   - Commits صغيرة وواضحة (Conventional Commits). كل تغيير يدخل عبر PR يُدمج **تلقائيًا** فقط بعد نجاح كل بوابات الجودة في القسم 0-A. بعد كل مرحلة: tag semver صالح للاسترجاع: Phase 0 = `v0.0.0`، A = `v0.1.0`، B = `v0.2.0`، C = `v0.3.0`، D = `v0.4.0`، E = `v0.5.0`، G = `v0.6.0`، F = `v0.7.0`.
2. **تنفيذ ذاتي متواصل (D10):** نفِّذ خطة البناء كاملة بلا توقف للموافقة، خطوة بعد خطوة، حسب «حلقة الجودة» في القسم 0-A. لا تتوقف إلا لما لا يقدر عليه إلا المؤسس (القسم 0-A.6).
3. **تحقق من الإصدارات قبل التثبيت:** لا تخترع أرقام إصدارات أو أسماء حزم أو مستودعات. قبل تثبيت أي حزمة تحقق من وجودها وإصدارها المستقر الحالي ورخصتها من المصدر الرسمي (npm / PyPI / GitHub releases / صفحة التوثيق). الحزم الأصلية في الموبايل تُثبَّت بـ `npx expo install`. الإصدارات في هذا البرومبت **مرشّحة** وليست مثبّتة؛ التثبيت النهائي يُسجَّل في `docs/adr/ADR-001-versions.md` بعد اختبار الأسبوع الأول.
4. **لا أسرار في git أبداً:** لا مفاتيح API ولا `.env.local` ولا شهادات. مكان الأسرار محدد في القسم 0-D فقط (`.env.local` محليًا، GitHub Secrets/Environments في CI، ملف env بصلاحية 600 خارج المستودع على الخادم). `gitleaks` في pre-commit وفي CI. `.gitignore` يحتوي: `.env` و `.env.*` و `!.env.example` و `*.pem` و `*.key` و `*.jks` و `*.keystore` و `secrets/`.
5. **لا وسطاء نماذج غير رسميين:** استدعاء النماذج عبر SDKs الرسمية للمزوّدين بمفاتيح من جانب الخادم فقط. LiteLLM (MIT core، إصدار دقيق ≥ 1.83.0، hash-locked) هو البوابة **الإلزامية** في `infra/router/` (D12)، و CI يفشل إن ظهر 1.82.7 أو 1.82.8 في أي lockfile. لا proxies مجهولة ولا مفاتيح في التطبيق.
6. **الرخص:** ممنوع ضمّ أي شيء AGPL / GPL / SSPL / Commons Clause / CC-NC / FSL / BUSL داخل التطبيق (انظر القسم 9).
7. **عند الشك:** إذا تعارض شيء مع D1–D13 (`docs/DECISIONS.md`) اتبع القرارات. القرارات التقنية تحسمها لجنة المراجعة وتُسجَّل في `docs/adr/`. لا تتوقف إلا لقرار تجاري أو قانوني أو حساب/مال (0-A.6)، وأثناء الانتظار تكمل كل ما لا يعتمد عليه.
8. **المواصفات أولاً:** الأداة الوحيدة للمواصفات هي **OpenSpec**. لا تنفّذ ميزة بلا spec تعتمده لجنة المراجعة (0-A.2). التصميم لا يُنفَّذ إلا من tokens؛ إن لم تعتمدها لجنة التصميم بعد، ولّد v0 موسومة `provisional` واستمر بها (القسم 8).
9. **صلاحيات الوكلاء:** دور read-only للوكلاء على قاعدة **الإنتاج** فقط؛ صلاحيات كاملة على حاويات التطوير والاختبار المحلية (migrations والاختبارات). مفاتيح Stripe في test mode فقط. أسرار الإنتاج والإصدار في GitHub Environments تتطلب موافقة المؤسس؛ workflows الـ PR لا تحصل إلا على أسرار test.


## 0-A. وضع الشركة الكاملة والتنفيذ الذاتي (D10، D11) — أعلى من أي قسم آخر

### 0-A.1 النطاق
**نسخة واحدة كاملة.** كل الخدمات في القسم 7 (ترتيب البناء 1 و 2 و 3) وكل بنود Phase G، ومنها **مسح الملصقات بالكاميرا (OCR + باركود)**، تُبنى قبل التسليم. لا «نسخة أولى ثم ثانية». المؤسس يستلم تطبيقًا كاملًا ويدخل مباشرة فترة الاختبار الميداني.

### 0-A.2 الشركة (فريق الوكلاء)
شغّل الأدوار في القسم 11 كفريق كامل، وأضف لها:
- **لجنة مراجعة لكل وحدة (Review Board):** قبل دمج أي PR، تراجعه لجنة من مراجعين مستقلين بزوايا مختلفة: الصحة (correctness)، الأمان، الأداء والبطارية، التصميم (D7)، الصوت وتعدد اللغات، الخصوصية والرخص، قابلية الصيانة. كل مراجع يحاول **رفض** التغيير.
  - **التشغيل:** كل PR يحصل على 5 مراجعات على الأقل من subagents معرّفين في `.claude/agents/<role>.md` (الصحة، الأمان، الأداء، + اثنان حسب نطاق الـ PR: التصميم/الصوت/الخصوصية/الصيانة). كل مراجع ينشر تعليقًا على الـ PR يحتوي JSON: `{reviewer, verdict: approve|reject, findings:[{severity: critical|high|medium|low, file, line, issue}]}`.
  - **البوابة:** job في CI اسمه `review-gate` يقرأ التعليقات ويفشل إذا بقي أي بند `critical` أو `high` مفتوح أو إذا رفض 3 من 5. هذا الـ check مطلوب في حماية `main`. عدد المراجعات يُسجَّل في `docs/PROGRESS.md`.
- **مدقق الحقائق:** قبل تثبيت أي مكتبة أو استخدام أي API، يتحقق من الإصدار والرخصة والسعر من المصدر الرسمي، ويسجّل ذلك في `docs/adr/ADR-001-versions.md`.
- **مهندس الاكتمال:** بعد كل مرحلة يسأل «ما الناقص؟» مقارنةً بـ DECISIONS.md والقسم 7 وجدول التكافؤ في RESEARCH_2026_WAVE3.md، ويضيف الناقص كخطوات جديدة تلقائيًا.

### 0-A.3 حلقة الجودة لكل خطوة (لا تنتقل قبل نجاحها)
1. اكتب spec (OpenSpec) ← نفّذ ← اختبارات وحدة وتكامل.
2. شغّل **كامل** مجموعة الاختبارات المعنية (pytest، Jest/Vitest، Maestro E2E بتسجيلات صوتية، promptfoo على مجموعة عناوين Canterbury الذهبية، اختبارات offline/sync chaos).
3. **اختبار الثبات (backtest):** أعد تشغيل المجموعة الحرجة (الإملاء والتصحيح، الأوامر الصوتية، المزامنة، الدفع) **50 مرة متتالية** مع بيانات وترتيب عشوائي. أي فشل واحد = فشل الخطوة؛ اعثر على السبب الجذري وأصلحه (ممنوع تعطيل أو تخطي اختبار).
   - **لكل PR:** `pytest -m critical --count=50 -p randomly` (pytest-repeat + pytest-randomly) و `pnpm jest --selectProjects critical --randomize` مكررًا 50 مرة عبر سكربت `scripts/backtest.sh`.
   - **ليليًا:** 50× لمجموعات Maestro على محاكي أندرويد في GitHub Actions (`reactivecircus/android-emulator-runner`)، وأي فشل يفتح بندًا في `docs/BUGS.md` ويمنع الدمج التالي في نفس المسار.
   - المجموعات التي تحتاج مفاتيح sandbox غير موجودة تعمل على mocks، ويُسجَّل التخطي الجزئي في `docs/PROGRESS.md` و `docs/FOUNDER_TODO.md`.
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
├── packages/design-tokens/ # DTCG tokens → Style Dictionary
├── infra/                # docker-compose، router/ (LiteLLM)، maps/، valhalla/، migrations/
├── sandbox/              # dev فقط (0-B.6)، خارج workspaces والبناء
├── scripts/              # setup-emulator، backtest، open-secrets، push-secrets، check-secrets
├── tests/golden/         # تسجيلات وعناوين Canterbury الذهبية
├── openspec/             # spec لكل ميزة
└── docs/                 # adr/، DECISIONS.md، PROGRESS.md، runbooks/
```
**هذه هي البنية الوحيدة المعتمدة.** الوحدة الصوتية الأصلية في `apps/mobile/modules/voice` والخلفية في `services/api`. CODEOWNERS لكل مجلد (المؤسس owner لـ `.github/workflows` و `infra/` و auth و billing و migrations)، و CLAUDE.md داخل كل حزمة يشرح قواعدها.

### 0-A.5 الحفظ والاسترجاع
- كل شيء على GitHub (`haytham26/courier`): الكود، الـ specs، الـ ADRs، تقارير الاختبار.
- `main` محمي ودائمًا أخضر: required status checks (CI + `review-gate`)، بلا مراجعة بشرية إلزامية. tag بعد كل مرحلة (قاعدة 0.1) و release candidate في النهاية (`v1.0.0-rc.1`).
- `docs/PROGRESS.md` يُحدَّث بعد كل خطوة: ما انتهى، ما المتبقي، أين توقفنا — حتى تستطيع أي جلسة جديدة الإكمال.

### 0-A.6 ما يحتاج المؤسس (غير حاجز)
لا تتوقف فعليًا أبدًا. ما لا يمكن أتمتته (إنشاء الحسابات والدفع، لصق المفاتيح في `.env.local` حسب 0-D، القرارات القانونية والتسعير النهائي، الفحوص على **هاتف حقيقي** الموسومة `[FOUNDER-DEVICE]`) يُسجَّل في `docs/FOUNDER_TODO.md` مع البديل الذي تعمل به الآن، ثم **أكمل كل العمل الآخر**. لا يوجد أي بند في هذا البرومبت يشترط موافقة المؤسس قبل المتابعة.

### 0-A.7 التسليم
التطبيق «جاهز للاستلام» عندما: كل خدمات القسم 7 مبنية؛ كل الأدوات الصوتية مغطاة باختبار؛ 50/50 نجاح في اختبار الثبات للمسارات الحرجة؛ لا ملاحظة مفتوحة من لجان المراجعة بدرجة حرجة أو عالية؛ سكربت المحاكي يعمل؛ APK موقّع على GitHub Releases؛ `docs/ACCEPTANCE_TEST.md` ينجح على المحاكي؛ دليل تشغيل للمؤسس في `docs/HANDOVER.md`. (TestFlight و Play Internal Testing وموافقة المتاجر وتجربة السائقين = بنود ما بعد التسليم في `FOUNDER_TODO.md`.)

---

## 0-B. سياسة التكلفة: مجاني أولًا مع تحويل تلقائي (D12)

التفاصيل الكاملة في `docs/COST_PLAN.md`، وهو مُلزِم.
1. **كل قدرة لها سلسلة مرتبة:** افتراضي مجاني (على الهاتف / أدواتنا المفتوحة على خادمنا) ← حصة مجانية رسمية ← مزوّد مدفوع. التحويل تلقائي عند الفشل أو البطء أو نفاد الحصة، والسائق لا يُقطع أبدًا.
2. **التبديل بسطر واحد:** التطبيق يستدعي أسماء منطقية (`courier-llm`، `courier-stt`، `courier-tts`، `courier-realtime`)؛ الترتيب في `infra/router/` (LiteLLM ≥ 1.83.0، لا 1.82.7/1.82.8) وطبقة `ProviderChain` للصوت.
3. **الصوت:** sherpa-onnx على الهاتف ← faster-whisper / Kokoro على خادمنا ← Groq / Cloudflare free ← Deepgram / Cartesia. المحادثة الحية: Pipecat cascade على LiveKit self-hosted، و Gemini Live (paid) / OpenAI Realtime احتياطي مدفوع.
4. **PII:** كل طلب STT/TTS/realtime صوتي يحمل `pii: true` افتراضيًا، وكل نص فيه عنوان أو اسم أو هاتف كذلك. الطلبات `pii: true` تذهب فقط إلى: الهاتف، خادمنا، أو مزوّد مدفوع شروطه no-training/zero-retention مؤكدة ومسجّلة في ADR. المستويات المجانية السحابية (Groq، Workers AI، Gemini free…) لا تستقبل إلا نصًا منقّحًا (العناوين مستبدلة برموز `<STOP_n>` بواسطة وحدة redaction المركزية) أو لا تُستخدم، إلا إذا تحقق مدقق الحقائق من شروطها التجارية وسجّلها في ADR. اختبار CI يثبت أن طلب `pii:true` لا يصل أبدًا لمزوّد موسوم `free_trains_or_unverified`. التفاصيل في COST_PLAN.md.
5. **حساب واحد لكل مزوّد.** ممنوع تعدد الحسابات أو المفاتيح لمضاعفة الحصص.
6. **Sandbox:** gpt4free وأي وسيط غير رسمي مسموح فقط في `sandbox/` معزول ببيانات اصطناعية. `sandbox/` خارج pnpm workspaces والبناء؛ CI يفشل إن وُجد import لـ g4f/gpt4free خارجه؛ الخادم يرفض الإقلاع إن وُجد مزوّد sandbox مع `APP_ENV=prod` (مع unit test). يعمل فقط على جهاز منفصل بلا أي مفاتيح أو حسابات للشركة، وليس في GitHub Actions الخاصة بالمستودع.
7. **البناء والنشر:** GitHub Actions + `eas build --local` + Fastlane + OTA self-hosted (expo-open-ota على R2)؛ EAS Free/Starter احتياطي فقط.
8. **الاستضافة:** Oracle Always Free (`ap-sydney-1`) + Cloudflare R2/Tunnel؛ VPS مدفوع احتياطي. Always Free بلا SLA، لذا SLO توفر 99.9% يسري فقط بعد الانتقال للبديل المدفوع قبل الإطلاق العام. GPU خاص فقط عندما يصبح أرخص من الدفع لكل دقيقة.
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
**كل منطقة كانتربري كاملة، ومنها كرايستشرش بالكامل** — الخريطة (PMTiles)، عناوين LINZ، ملفات Valhalla، والصور الجوية. القصّ بحدود منطقة Canterbury الرسمية من LINZ (ليس مستطيلًا). المستخدم يختار منطقته الفرعية داخل التطبيق (Hornby، Northwood، …) لكن البيانات تغطي كل كانتربري. مصدر الحدود: Stats NZ Regional Council 2025 (Canterbury، الرمز 13) — يتحقق المنفّذ من معرّف الطبقة عند أول استيراد. الصور الجوية تُنزَّل لكل منطقة فرعية على حدة مع عرض الحجم قبل التنزيل.
**اختبار التغطية:** عدد عناوين LINZ داخل المضلّع = عددها في PostGIS = عددها في شريحة الهاتف؛ عينات من كل territorial authority (منها Kaikōura و Timaru و Waimate) تُوجَّه في Valhalla بنجاح.

### 0-C.2a بيانات LINZ المحلية عند المؤسس (D19)
المؤسس عنده نسخة منزّلة من بيانات LINZ على جهازه. قبل أي استخدام لـ API:
1. ابحث في `data/linz/` (مجلد محلي، **في .gitignore**، لا يُرفع): GeoPackage أو Shapefile أو CSV أو FileGDB.
2. حدّد الطبقات الموجودة وتاريخها: **NZ Addresses** (إلزامي)، NZ Roads/Street Centrelines، NZ Suburbs and Localities، حدود Canterbury. سجّلها في `docs/adr/ADR-002-linz-data.md` (اسم الطبقة، رقمها، التاريخ، الصيغة، عدد السجلات في كانتربري).
3. استخدمها لبناء ملف العناوين المضمّن وقاعدة PostGIS (`ogr2ogr`) بدل التنزيل عبر API. الطبقة الناقصة فقط تُطلب عبر `LINZ_LDS_API_KEY` أو تُسجَّل في FOUNDER_TODO.md.
4. المفتاح يبقى مطلوبًا فقط للتحديث الأسبوعي التلقائي؛ بدونه يعمل التطبيق بالبيانات المحلية ويُسجَّل التحديث كبند في FOUNDER_TODO.md.
5. الرخصة CC BY 4.0: إظهار «LINZ CC BY 4.0» في التطبيق.

### 0-C.2b الخريطة داخل التطبيق والستايل (D15، D16)
- **داخل التطبيق (D15):** ملف `canterbury.pmtiles` (الخريطة الأساسية لكل كانتربري + كرايستشرش) وملف عناوين LINZ لكانتربري (SQLite + FTS5 للتصحيح بدون إنترنت) **مضمّنان في الـ APK/IPA**، فيعمل التطبيق من أول تشغيل بلا تنزيل ولا إنترنت. إن تجاوز الحجم حدّ المتجر استخدم Play Asset Delivery (install-time) و On-Demand Resources على iOS، مع بقاء التشغيل الأول بلا إنترنت.
- **التحديث:** وظيفة `services/worker` تعيد بناء الخريطة والعناوين **أسبوعيًا** (LINZ changeset + Geofabrik) وتنشر نسخة موقّعة (checksum + رقم إصدار) على R2. التطبيق يفحص **كل 7 أيام** وعلى **الواي فاي فقط** وأثناء الشحن، ينزّل الفرق أو الملف الجديد، يتحقق من الـ checksum، ثم يستبدل الملف ذريًا (atomic swap) بعد نهاية الوردية. عند أي فشل يبقى على النسخة المضمّنة. يمكن للسائق قول «حدّث الخريطة».
- **الصور الجوية:** ليست مضمّنة؛ تنزيل اختياري لمنطقة السائق فقط على الواي فاي.
- **الستايل (D16):** ستايل MapLibre خاص بنا في `packages/map-style/` بمستوى Petal Maps و Apple Maps: نسختان **نهاري وليلي** تتبدّلان تلقائيًا حسب وقت الغروب، ونسخة **تباين عالٍ للشمس**؛ أسماء شوارع وأرقام بيوت كبيرة وواضحة؛ مبانٍ بإسقاط ثلاثي الأبعاد خفيف في الزوم القريب؛ ألوان حالات المحطات (باقية / سُلّمت / مؤجّلة / فشل) من design tokens؛ إظهار دبوس الباب ونقطة الوقوف. خطوط الخريطة مضمّنة (glyphs) والأيقونات (sprites) محلية. يراجعه مصمم المنتج (D7) ويُختبر بلقطات شاشة على المحاكي في النهار والليل. الإسناد «© OpenStreetMap contributors، LINZ CC BY 4.0» ظاهر.

### 0-C.3 المحاكي والتسليم على أندرويد (آخر خطوة بعد اكتمال كل شيء)
1. **إعداد المحاكي على جهاز المؤسس** (اكتب دليلًا خطوة بخطوة في `docs/HANDOVER.md` وسكربت `scripts/setup-emulator.(sh|ps1)`):
   - تثبيت Android Studio + Android SDK + جهاز وهمي (Pixel حديث، أحدث Android مستقر، Google Play image).
   - إعداد الميكروفون (Extended controls → Microphone → «Virtual microphone uses host audio input») والموقع (مسار GPX لجولة في كرايستشرش داخل `tests/fixtures/`).
   - أمر واحد يثبّت ويشغّل التطبيق على المحاكي.
2. **APK للهاتف الحقيقي:**
   - GitHub Actions يبني APK موقّعًا (release، keystore في GitHub Secrets) عند كل tag، ويرفعه كـ Release على المستودع.
   - المؤسس ينزّله من صفحة Releases ويثبّته مباشرة على هاتفه الأندرويد. اكتب الخطوات (السماح بالتثبيت من مصادر غير معروفة) في HANDOVER.md.
3. **سيناريو اختبار الاستلام** في `docs/ACCEPTANCE_TEST.md`: صباح كامل (إملاء 30 عنوانًا بأكثر من لغة → تقرير التصحيح → قائمة اليوم) + قيادة 10 محطات بدون لمس + وضع بلا إنترنت + مسح ملصق بالكاميرا. على المحاكي أولًا، ثم على الهاتف الحقيقي.
4. iOS/TestFlight و Play Internal Testing يأتيان قبل النشر فقط (يحتاجان حسابات المؤسس) — بنود ما بعد التسليم في `FOUNDER_TODO.md`.
5. **توقيع الإصدار:** فعّل Play App Signing عند إنشاء حساب Play؛ مفتاح الرفع في GitHub Environment `release` المحمي بموافقة المؤسس، مع نسخة احتياطية مشفّرة خارج الإنترنت يُذكر مكانها (بلا كلمة السر) في HANDOVER.md. المستودع يبقى private.

---

## 0-D. المفاتيح والأسرار (Keys & Secrets)

### 1. ملف واحد للأسرار (المؤسس يلصق فقط)
- يضع المؤسس كل المفاتيح في ملف واحد فقط هو **`.env.local`** في جذر المستودع. هذا الملف في `.gitignore` ولا يُرفع إلى git أبداً.
- القالب **`.env.example`** يُرفع إلى git: كل المتغيرات بقيم فارغة وتعليق على كل واحد (المصدر، مجاني/مدفوع، إلزامي/اختياري).
- **المنفّذ ينشئ الملف ويفتحه:** في P0.1 اكتب `scripts/open-secrets.sh` و `scripts/open-secrets.ps1`: ينسخ `.env.example` إلى `.env.local` إن لم يوجد، يضبط صلاحياته 600، يتحقق بـ `git check-ignore .env.local`، ثم يفتحه في محرر المؤسس (`$EDITOR` أو `code` أو `notepad`). شغّله وسجّل في `FOUNDER_TODO.md`: «الصق المفاتيح في `.env.local` ثم شغّل `scripts/check-secrets`». **لا تتوقف** — أكمل العمل بالبدائل.
- المؤسس يلصق القيم في هذا الملف فقط — **ليس** في المحادثة ولا في PROGRESS.md أو FOUNDER_TODO.md أو أي ملف آخر.
- `scripts/check-secrets` يتحقق من وجود كل مفتاح وصلاحيته باستدعاء خفيف (دون طباعة القيمة). `scripts/push-secrets.sh` ينقل القيم إلى GitHub Actions Secrets/Environments بـ `gh secret set` وإلى ملف env على الخادم (صلاحية 600، خارج المستودع).
- `.gitignore` يحتوي: `.env` و`.env.*` و`!.env.example` و`*.pem` و`*.key` و`*.jks` و`*.keystore` و`secrets/`.
- أسرار الإنتاج والإصدار في GitHub Environments (`production`، `release`) تتطلب موافقة المؤسس؛ workflows الـ PR تحصل على أسرار test فقط.

### 2. جدول المفاتيح

**الآن (مجاني)**

| المتغيرات | الغرض | من أين تحصل عليه | التكلفة | إلزامي؟ |
|---|---|---|---|---|
| `LINZ_LDS_API_KEY` | عناوين NZ (NZ Addresses، NZ Roads Addresses) والتحديث الأسبوعي عبر changeset API | data.linz.govt.nz ← سجّل الدخول ← اسمك (Profile) ← API keys ← Generate (صلاحية قراءة/تصدير الجداول والطبقات) | مجاني | إلزامي. يستخدمه `services/worker` فقط، لا يدخل التطبيق أبدًا |
| `LINZ_BASEMAPS_API_KEY` | خرائط LINZ الأساسية للتطوير | basemaps.linz.govt.nz ← Developer / API key | مجاني | اختياري، غير مستخدم في الإنتاج (الخرائط من PMTiles، والجوية من COGs المفتوحة بلا مفتاح) |
| `DATABASE_URL` | Postgres | تطوير: حاوية Docker محلية **يولّدها الوكيل**؛ إنتاج: Postgres على Oracle **يولّده الوكيل**. (Neon free بديل تطوير اختياري: console.neon.tech ← Connection Details) | مجاني | يولّده الوكيل |
| `OCI_HOST`, `OCI_SSH_PRIVATE_KEY_PATH` | خادم Always Free للـ API و Valhalla و LiveKit و Postgres | cloud.oracle.com ← Compute ← Instances (المنطقة Sydney `ap-sydney-1`). مفتاح SSH يبقى خارج المستودع | مجاني | إلزامي للنشر |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | Workers AI و R2 و Tunnel و DNS | dash.cloudflare.com ← My Profile ← API Tokens ← Create Token (بصلاحيات محدودة). Account ID يظهر في الشريط الجانبي | مجاني | إلزامي |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT` | صور POD، نسخ Postgres، OTA، tiles | dash.cloudflare.com ← R2 ← Manage R2 API Tokens | مجاني (حتى 10GB) | إلزامي |
| `CF_WORKERS_AI_TOKEN` | LLM/STT احتياطي (نص منقّح فقط) | يمكن استعمال نفس `CLOUDFLARE_API_TOKEN` | مجاني | اختياري |
| `GROQ_API_KEY` | LLM و STT سريع (نص منقّح فقط، 0-B.4) | console.groq.com ← API Keys | مجاني | إلزامي |
| `CEREBRAS_API_KEY` | LLM احتياطي | cloud.cerebras.ai ← API Keys | مجاني | اختياري |
| `GOOGLE_AI_STUDIO_API_KEY` | للتطوير فقط | aistudio.google.com ← Get API key | مجاني | اختياري، ممنوع في prod |
| `OPENROUTER_API_KEY` | للتطوير فقط | openrouter.ai ← Keys | مجاني (نماذج free) | اختياري، ممنوع في prod |
| `GITHUB_TOKEN` | ليضبط الوكيل Actions Secrets | github.com ← Settings ← Developer settings ← Fine-grained tokens (صلاحية Secrets: write على هذا المستودع فقط) | مجاني | إلزامي |
| `EXPO_TOKEN` | EAS احتياطي و push notifications | expo.dev ← Account Settings ← Access Tokens | مجاني | اختياري (البناء الأساسي `eas build --local`) |
| `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | الدفع (وضع test) | dashboard.stripe.com ← Test mode ← Developers ← API keys. سر الـ webhook من Webhooks أو من `stripe listen` | مجاني | إلزامي للفوترة (البديل: mocks) |
| `RESEND_API_KEY`, `EMAIL_FROM` | البريد | resend.com ← API Keys | مجاني (3000 رسالة في الشهر) | اختياري (البديل: السجل) |
| `POSTHOG_API_KEY`, `POSTHOG_HOST` | التحليلات (EU) | eu.posthog.com ← Project Settings ← Project API key | مجاني | اختياري |
| `GLITCHTIP_DSN` | تتبع الأخطاء | **يولّده الوكيل** عند تثبيت GlitchTip self-hosted (أو app.glitchtip.com ← Project ← Settings ← DSN) | مجاني | يولّده الوكيل |
| `ANDROID_KEYSTORE_*`, `ANDROID_KEY_*` | توقيع ملف APK | **يولّده الوكيل** بـ keytool ويحفظه في GitHub Environment `release` فقط | مجاني | يولّده الوكيل |
| `BETTER_AUTH_SECRET` | جلسات تسجيل الدخول | **يولّده الوكيل** بـ `openssl rand -base64 32` | مجاني | يولّده الوكيل |
| `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | الصوت المباشر (self-hosted) | **يولّده الوكيل** عند تثبيت LiveKit | مجاني | يولّده الوكيل |
| `DATA_ENCRYPTION_MASTER_KEY` | envelope encryption (القسم 6) | **يولّده الوكيل** | مجاني | يولّده الوكيل |

**قبل الإطلاق (مدفوع أو حساب متجر)**

| المتغيرات | الغرض | من أين تحصل عليه | التكلفة |
|---|---|---|---|
| `APPLE_TEAM_ID`, `APP_STORE_CONNECT_KEY_ID/ISSUER_ID/KEY_P8_BASE64` | النشر على iOS | developer.apple.com، ثم appstoreconnect.apple.com ← Users and Access ← Integrations ← Keys | 99 USD في السنة |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64` | النشر على Play | play.google.com/console ← Setup ← API access | 25 USD مرة واحدة |
| `FASTLANE_MATCH_PASSWORD` | شهادات iOS | **يولّده الوكيل** | مجاني |
| `REVENUECAT_API_KEY_IOS/ANDROID`, `REVENUECAT_WEBHOOK_SECRET` | الاشتراكات داخل التطبيق | app.revenuecat.com ← Project ← API keys | مجاني حتى حد معيّن |
| `DEEPGRAM_API_KEY` | STT مدفوع (دعم en-NZ **[UNVERIFIED]**) | console.deepgram.com ← API Keys | مدفوع (فيه رصيد مجاني) |
| `CARTESIA_API_KEY` | TTS مدفوع | play.cartesia.ai ← API Keys | مدفوع |
| `GEMINI_API_KEY` | Gemini Live GA (paid tier) احتياطي | Google AI Studio/Cloud مع تفعيل الفوترة | مدفوع |
| `ANTHROPIC_API_KEY` | LLM للإنتاج | console.anthropic.com ← API Keys | مدفوع |
| `OPENAI_API_KEY` | LLM أو realtime احتياطي | platform.openai.com ← API keys | مدفوع |
| `SMS_PROVIDER`, `SMS_API_KEY/SECRET`, `SMS_FROM_NUMBER` | رسائل SMS برقم NZ طويل ([OPEN]) | لوحة المزوّد بعد اختياره | مدفوع |
| `STRIPE_LIVE_SECRET_KEY`, `STRIPE_LIVE_WEBHOOK_SECRET` | الدفع الحقيقي | Stripe ← Live mode، بعد التحقق من حساب NZ | رسوم على كل عملية |

### 3. قواعد المنفّذ (إلزامية)
1. اقرأ المفاتيح من ثلاثة أماكن فقط: `.env.local` محلياً، و GitHub Secrets/Environments في CI، وملف env (600) أو مدير الأسرار على الخادم. لا تكتب أي مفتاح داخل الكود أبداً.
2. لا تطبع مفتاحاً ولا تسجّله في log ولا ترفعه إلى git. أي مخرج يحتوي سراً يُخفى بـ `***`. `gitleaks` في pre-commit وفي CI.
3. عند الإقلاع يتحقق برنامج (zod أو pydantic-settings) من وجود المفاتيح. إن نقص مفتاح إلزامي للخدمة المعنية يتوقف **تشغيل تلك الخدمة** برسالة واضحة: `Missing required env: X, Y — see .env.example`. المفاتيح الاختيارية الناقصة تظهر كتحذير فقط. هذا لا يوقف تنفيذ خطة البناء.
4. ولّد الأسرار الداخلية بنفسك (المعلَّمة «يولّده الوكيل») وضعها في `.env.local` أو GitHub Secrets ولا تطلبها من المؤسس.
5. إن غاب مفتاح خارجي فلا تتوقف. شغّل الميزة على البديل المجاني أو mock (OSM/PMTiles بدل LINZ Basemaps، Groq أو Workers AI أو خادمنا بدل LLM مدفوع، السجل بدل البريد، mocks بدل Stripe)، وأضف سطراً في `FOUNDER_TODO.md` فيه اسم المتغير ومصدره والميزة المتأثرة، ثم أكمل العمل.
6. مفاتيح التطوير فقط (`GOOGLE_AI_STUDIO_API_KEY` و `OPENROUTER_API_KEY`) يرفض الخادم الإقلاع إن وُجدت مع `APP_ENV=prod`.
7. كل مفتاح له بيئة (dev/test/prod) ومالك وتاريخ تدوير يُسجَّل في `docs/runbooks/secrets.md` (بلا القيم).

### 0-D.X ابدأ الآن بلا مفاتيح — والمفاتيح عند نقطة واحدة قبل التسليم (D17)
1. **ابدأ التنفيذ فورًا حتى لو كان `.env.local` فارغًا.** كل خدمة خارجية تعمل خلف واجهة (adapter) لها نسخة محلية أو وهمية (mock/fake) أو بديل مجاني ذاتي: Postgres و LiveKit و GlitchTip في Docker محليًا؛ Stripe بالـ mocks؛ البريد إلى السجل؛ الصوت والنماذج على الجهاز وعلى الخادم المحلي؛ LINZ من عيّنة بيانات كانتربري مخزّنة في `tests/fixtures/` حتى يتوفر المفتاح. **لا يتوقف أي جزء من البناء بسبب مفتاح ناقص.**
2. كل مكان يعمل بنسخة وهمية يُسجَّل في `docs/FOUNDER_TODO.md` (المفتاح، الميزة، البديل الحالي).
3. **نقطة المفاتيح (الوحيدة التي ينتظر فيها المنفّذ المؤسس):** عندما يكتمل كل شيء آخر وتنجح كل الاختبارات بالنسخ الوهمية، وقبل إعطاء النسخة النهائية:
   - شغّل `scripts/open-secrets` ليفتح `.env.local`، واعرض للمؤسس **قائمة واحدة كاملة** بكل المفاتيح المطلوبة (الاسم، من أين، لماذا) من 0-D و FOUNDER_TODO.md.
   - انتظر حتى يقول المؤسس «أضفت المفاتيح»، ثم شغّل `scripts/check-secrets` و`scripts/push-secrets`.
4. **اختبار الاستلام الحقيقي بالمفاتيح:** أعد تشغيل كل الاختبارات **بالخدمات الحقيقية** (LINZ الحقيقي وبناء خريطة/عناوين كانتربري كاملة، Oracle، Cloudflare R2، Groq، Stripe test، البريد، المراقبة) + اختبار الثبات 50× للمسارات الحرجة + `ACCEPTANCE_TEST.md` على المحاكي. أصلح كل ما يفشل حتى ينجح الكل.
5. بعدها فقط: ابنِ الـ APK النهائي وانشره على Releases وسلّم حسب 0-A.7 و 0-C.3.

## 0-E. بدء الجلسة واستئنافها
1. إن لم يوجد `docs/PROGRESS.md`: أنشئه من القالب أدناه، ومعه `docs/FOUNDER_TODO.md` و `docs/BUGS.md`، وابدأ بالقسم 1.
2. إن وُجد: اقرأه، `git pull`، انتقل إلى الفرع المفتوح إن وُجد، وتابع من أول خطوة ليست `done`.
3. **قالب PROGRESS.md:** جدول بأعمدة ثابتة: `step ID | status (todo/doing/done/blocked-founder) | branch/PR | tests (pass/total, backtest 50/50) | blocker | next`.
4. **قالب FOUNDER_TODO.md:** جدولان «الآن (مجاني)» و «قبل الإطلاق»: `item | provider/URL | env var | أين يوضع | الميزة المتأثرة والبديل الحالي | حاجز؟ (دائمًا لا)`.
5. **قالب BUGS.md:** `id | الوصف | السبب الجذري | الإصلاح (PR) | الاختبار المانع للتكرار | الحالة`.

---

## 1. الاتصال بالمستودع وقراءة المستندات

```bash
gh auth status                                   # إن فشل: سجّل في FOUNDER_TODO واعمل محليًا
[ -d courier/.git ] && (cd courier && git pull) || gh repo clone haytham26/courier
cd courier
corepack enable && corepack prepare pnpm@latest --activate   # Node LTS مطلوب
curl -LsSf https://astral.sh/uv/install.sh | sh && uv sync || pip install -r requirements.txt
pytest -q                                        # سجّل عدد الاختبارات ونتيجتها
git checkout -b chore/0.00-read-docs
```

**تثبيت مهارات الهندسة (إلزامي، D14):** `addyosmani/agent-skills` (MIT، 25 مهارة: spec، تخطيط، TDD، تنفيذ تدريجي، debugging، مراجعة، أمان، أداء، CI/CD، ADRs، observability، shipping).
```bash
# داخل Claude Code:
/plugin marketplace add https://github.com/addyosmani/agent-skills.git
/plugin install agent-skills@addy-agent-skills
# أي أداة أخرى (أو إن فشل ما سبق):
npx skills add addyosmani/agent-skills
```
اقرأ كل `SKILL.md` قبل الاستخدام، وثبّت commit المستودع المستخدم في `docs/adr/ADR-001-versions.md`. إذا فشل التثبيت سجّله في `docs/FOUNDER_TODO.md` وتابع (لا تتوقف). **قاعدة عدم التعارض:** OpenSpec يبقى مكان حفظ المواصفات (`openspec/`)، ومهارة `spec-driven-development` هي طريقة كتابتها.
سجّل إصدارات الأدوات (node، pnpm، uv، python، Java، Android SDK) في `docs/adr/ADR-001-versions.md` (أنشئ `docs/adr/` إن لم يوجد).

اقرأ بالكامل قبل كتابة أي كود، وبهذا الترتيب:
1. `docs/DECISIONS.md` (D1–D13) — السلطة العليا، ثم `docs/COST_PLAN.md`.
2. `docs/` كاملة، خصوصاً: `PLAN_REVIEW`، `RESEARCH_2026*`، `DRIVER_INTERVIEW_1`، `PRODUCT_SPEC`، و `db/schema.sql`. (أي قرار قديم بتثبيت Expo 52 في أي مستند **ملغى**.)
3. الكود الحالي في الخلفية: `app/agents/copilot.py` و `app/agents/intake_graph.py` و `app/nz_address.py` و `app/sequencing.py` و `requirements.txt` و `tests/test_core.py`.
4. `README.md` وأي `CLAUDE.md`.

**المخرَج:** تقرير Baseline في `docs/PROGRESS.md` يذكر: بنية المستودع الحالية، ما يتعارض مع هذا البرومبت، والاختبارات الحالية وعددها ونتيجتها. تحقق من «المشاكل المعروفة» أدناه في الكود وسجّل أي اختلاف بدل الافتراض. ثم **تابع مباشرة إلى Phase 0 دون انتظار**.

مشاكل معروفة يجب إصلاحها لاحقاً (المرحلة A):
- `app/nz_address.py`: قائمة ضواحي مكتوبة يدوياً + `difflib`، والخلط بين اللاحقة والوحدة. القاعدة: **`42B` = رقم 42 ولاحقة B. الوحدة تُكتب `2/14`.**
- `app/agents/intake_graph.py` (`verify`) يعدّل مُدخله في مكانه (mutation)، وإعادة تشغيل الإجابات المطبّقة (replay) خاطئة.
- `requirements.txt` يستخدم نطاقات `>=` ← استبدلها بقفل `uv lock --generate-hashes`.
- أسماء الأدوات في `app/agents/copilot.py` تُعاد تسميتها حسب كتالوج القسم 4.5.

---

## 2. الفكرة الكاملة وقرارات المؤسس

### 2.1 المشكلة
سائقو التوصيل متعدد المحطات في منطقة Canterbury كاملة ومنها Christchurch (نيوزيلندا) يتعاملون مع 100–200 محطة في الوردية. يُملون أو يلصقون عناوين فوضوية في المستودع، ويتبعون ترتيب مسار شخصياً، ويتذكرون الأبواب والبوابات والأكواد. التطبيقات الحالية (Spoke/Circuit, Zeo, Upper) تعتمد على اللمس، وإنجليزية أولاً، وتضع إثبات التسليم خلف اشتراك، وتتجاهل قوالب المسار الشخصية، وضعيفة دون إنترنت. واستخدام الهاتف باليد أثناء القيادة مخالف للقانون (Road User Rule 7.3A).

### 2.2 المنتج
مساعد صوتي حي متعدد اللغات يدير وردية السائق كاملة بالصوت: بدء الوردية، تحميل قائمة اليوم، تصحيح العناوين تلقائياً، ترتيبها حسب قالب السائق وقواعده، ثم التالي / تم التسليم / تخطٍّ / فشل / تراجع، ثم إنهاء الوردية. إضافة إلى ذاكرة الأبواب، وخريطة دون إنترنت، وخدمات SaaS كاملة.

### 2.3 قرارات المؤسس (ملزمة، لا تُخالَف)
ملخص فقط؛ النص الكامل في `docs/DECISIONS.md` وهو الذي يُعتمد عند أي اختلاف، وأي قرار جديد يُضاف هناك يصبح ملزمًا تلقائيًا.
- **D1:** المساعد الصوتي الحي (محادثة كاملة) جوهري في النسخة المسلَّمة ويعمل طوال الوردية.
- **D2:** كل شيء يمكن تنفيذه بالصوت وحده. كل ميزة لها أداة صوتية، والشاشة اختيارية.
- **D3:** كل اللغات من اليوم الأول. السائق يتكلم لغته؛ العناوين تبقى بصيغتها الإنجليزية الرسمية (LINZ).
- **D4:** إثبات التسليم الافتراضي هو قول السائق "delivered" (بأي لغة)، مع تسجيل الوقت و GPS تلقائياً. الصورة والتوقيع والباركود اختيارية.
- **D5:** رسالة الزبون برابط التتبع (SMS أو أي قناة) اختيارية، يفعّلها السائق، ومطفأة افتراضياً.
- **D6:** تقرير نهاية اليوم (km، أرباح، GST) اختياري ومطفأ افتراضياً.
- **D7:** تصميم بمستوى شركة كبيرة، بلا "مظهر AI".
- **D8:** المساعد يصحح العناوين تلقائياً، يخبر بما غيّر، ولا يسأل إلا عند الشك.
- **D9:** "تم" تعمل بثلاث طرق: الصوت، زر السماعة، وزر الشاشة.
- **D10:** تنفيذ ذاتي كامل بلا توقف للموافقة؛ لجان مراجعة + اختبار ثبات 50× + إضافة الناقص تلقائيًا.
- **D11:** نسخة واحدة كاملة تشمل مسح الملصقات بالكاميرا؛ الخطط Trial / Solo / Team.
- **D12:** مجاني أولًا مع تحويل تلقائي للمدفوع؛ التفاصيل في `docs/COST_PLAN.md`.
- **D13:** فريق مراقبين ومصلحين؛ التسليم محاكي أندرويد + APK؛ المنطقة كل كانتربري.

### 2.4 قرارات حسم التعارضات (نهائية)
| # | القرار |
|---|---|
| R1 | Expo: أحدث SDK مستقر مدرج في expo.dev/changelog عند بدء Phase 0، مع إصدار RN الذي يحدده ذلك الـ SDK، ويُسجَّل في ADR-001. أي رقم SDK/RN محدد في المستندات **[UNVERIFIED]**. البديل: الـ SDK المستقر السابق. |
| R2 | مزامنة: سجل أحداث append-only مخصص عبر HTTP + op-sqlite. **لا PowerSync.** |
| R3 | المصادقة: **Better Auth** (لا Supabase). |
| R4 | المهام الخلفية: **Hatchet** (لا Arq+Redis، ولا الاثنان معاً). |
| R5 | الصوت الحي في النسخة المسلَّمة (يلغي "no Pipecat in v1"). |
| R6 | **Pipecat** هو المنسّق الوحيد؛ LiveKit RN SDK للنقل (WebRTC) فقط وليس LiveKit Agents. البديل: Pipecat SmallWebRTC. |
| R7 | لا wake word. بوابة sherpa-onnx VAD + KWS أثناء الوردية النشطة. |
| R8 | زر السماعة: ضغطة = تم، ضغطتان = تخطٍّ، ثلاث = فشل. "التحدث" عبر الصوت أو شريط الصوت. |
| R9 | التنسيق: **Unistyles 3 فقط**. |
| R10 | الاختبارات: jest-expo + RNTL (موبايل)، Vitest + Playwright (ويب و TS)، pytest (خلفية). |
| R11 | Langfuse مستضاف ذاتياً في أستراليا. |
| R12 | واجهة بلغة السائق و RTL في النسخة المسلَّمة. |
| R13 | الصورة/التوقيع إضافة اختيارية؛ القول المنطوق هو POD. |
| R14 | SMS وتقرير اليوم في النسخة المسلَّمة كخيارات مطفأة افتراضياً. |
| R15 | Stripe للويب + RevenueCat للشراء داخل التطبيق؛ RevenueCat مصدر الاستحقاق الوحيد الذي يقرأه التطبيق. |
| R16 | أهداف اللمس: الإجراء الرئيسي في القيادة ≥ 64، بقية أزرار القيادة ≥ 56، الشاشات الأخرى حسب المنصة (44pt / 48dp). |
| R17 | الوضع الليلي قريب من الأسود (#0A0A0A–#121212)، ليس #000. |
| R18 | أرقام تكلفة الصوت **[UNVERIFIED]**؛ أعد بناء نموذج التكلفة من صفحات أسعار المزوّدين. بوابة VAD إلزامية. |
| R19 | مجموعة ذهبية: 200+ عنوان من Canterbury + عينات أوامر لكل لغة. |
| R20 | OpenSpec فقط. |
| R21 | Ferrostar يُبنى ويُختبر ويتاح كإعداد (flag مطفأ افتراضيًا)؛ الافتراضي deep link لـ Google Maps / Apple Maps / Waze. |
| R22 | القص بمضلّع المنطقة الرسمي لـ Canterbury وليس bbox. |
| R23 | `42B` = رقم + لاحقة؛ `2/14` = وحدة. |
| R24 | الخطط Trial / Solo / Team (جدول الاستحقاقات في القسم 7). سعر Solo عند NZ$35 تقريباً مساوٍ لـ Spoke Standard وليس ضعفه؛ الأسعار **[OPEN]** للمؤسس. |

---

## 3. المعمارية والـ Stack النهائي

### 3.1 بنية المستودع (Monorepo)
البنية الوحيدة المعتمدة هي شجرة القسم 0-A.4 (`apps/mobile` مع `apps/mobile/modules/voice`، `apps/web`، `services/api`، `services/worker`، `packages/shared`، `packages/nz-address`، `packages/design-tokens`، `infra/`، `sandbox/`، `scripts/`). pnpm workspaces + Turborepo.

### 3.2 مسار البيانات باختصار
الهاتف (op-sqlite + outbox + `apps/mobile/modules/voice`) ⇄ HTTP `/v1` (`services/api`) ⇄ Postgres/PostGIS (Oracle `ap-sydney-1`). الصوت: الهاتف → LiveKit WebRTC → Pipecat pipeline لكل وردية → tool registry داخل العملية نفسها → قاعدة البيانات. المهام الخلفية عبر Hatchet في `services/worker`. التوجيه عبر Valhalla + VROOM ذاتي الاستضافة.

### 3.3 الـ Stack (مرشّحات؛ تُثبَّت بعد الأسبوع الأول في ADR-001)
| الطبقة | الاختيار | ملاحظة |
|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | pin بعد الأسبوع 1 |
| Mobile | Expo (New Architecture, Hermes V1, dev client, expo-router) + React Native؛ البناء: GitHub Actions + `eas build --local` + Fastlane، OTA: expo-open-ota على R2 (EAS احتياطي، D12) | أحدث SDK مستقر حسب R1؛ الأرقام **[UNVERIFIED]** |
| UI | Unistyles 3, Reanimated 4 + worklets (نسخ SDK)، FlashList v2، Expo UI، Material Symbols، Inter/Noto | |
| Maps | `@maplibre/maplibre-react-native` v11 + PMTiles (`pmtiles://file://…`) مع glyphs و sprites محلية | الإصدار **[UNVERIFIED]**؛ دعم PMTiles المحلي يُختبر في Phase 0 على المنصتين، والبديل MBTiles |
| Camera | VisionCamera + nitro-modules + ML Kit plugin خاص بنا (OCR + باركود، ضمن التسليم D11) | الإصدارات **[UNVERIFIED]** |
| On-device voice | sherpa-onnx (≥ 1.13.6 مؤكد في releases؛ ثبّت أحدث 1.13.x) داخل `apps/mobile/modules/voice` | |
| Transport | LiveKit RN SDK + Expo plugin | |
| Orchestrator | Pipecat (أحدث مستقر)، flows (من core أو حزمة `pipecat-flows` إن كانت ما زالت تُنشر — يحسمه مدقق الحقائق)، Smart Turn | الإصدارات ومسار الاستيراد **[UNVERIFIED]** حتى Phase 0 |
| Speech models | D12: افتراضي sherpa-onnx على الهاتف + faster-whisper / Kokoro على خادمنا عبر Pipecat cascade ← Groq / Cloudflare free ← مدفوع: Deepgram، Cartesia، Gemini Live GA (paid tier)، OpenAI realtime mini (الـ ID **[UNVERIFIED]**) | IDs والترتيب في config؛ eval قبل أي تبديل؛ انظر COST_PLAN.md |
| Local DB | op-sqlite بإعداد `sqlcipher: true` و `fts5: true` في package.json؛ شريحة عناوين LINZ قاعدة منفصلة غير مشفّرة للقراءة فقط (بيانات عامة CC BY) تُربط بـ ATTACH | مفتاح SQLCipher عشوائي في Keystore/Keychain |
| Location | الموقع في الخلفية من نفس foreground service داخل `apps/mobile/modules/voice`؛ expo-location للقراءات في الواجهة أو اللقطة الواحدة فقط (Transistor كبديل مدفوع) | |
| Backend | FastAPI, Pydantic v2, LangGraph 1.x + Postgres checkpointer, SQLAlchemy 2, GeoAlchemy2, Alembic | hash-locked |
| Database | Postgres 16/17 + PostGIS 3 + pgvector (HNSW) + pg_trgm + fuzzystrmatch، self-hosted على Oracle Cloud `ap-sydney-1`، WAL archiving (pgBackRest أو wal-g) إلى R2 لـ PITR + نسخة ليلية | D12؛ Postgres مُدار مدفوع احتياطي |
| Auth | Better Auth (organization + Expo plugins)، تحقق JWKS في FastAPI، RLS يقرأ claims | |
| Jobs | Hatchet (`services/worker`) | |
| Routing | Valhalla (أحدث release مستقر، **[UNVERIFIED]**)، VROOM (أحدث release رسمي من GitHub — رقم 1.15.0 غير موجود)، OR-Tools 9.x (للقواعد فقط) | pin images؛ لا OSRM ولا GraphHopper |
| LLM gateway | LiteLLM MIT core ≥ 1.83.0 (**إلزامي**، D12): on-device ← نموذج على خادمنا ← Groq / Cloudflare free (نص منقّح فقط، 0-B.4) ← vLLM خاص عند الحجم ← Claude Haiku / GPT | hash-locked؛ ممنوع 1.82.7/1.82.8 |
| Web | Next.js (قاعدة `nextjs/saas-starter`) + shadcn/ui بألوان tokens + i18n/RTL | |
| Billing | Stripe (ويب، NZD، شامل GST) + RevenueCat (IAP) | |
| Email/SMS | Resend + React Email؛ مزوّد SMS برقم NZ طويل | المزوّد **[OPEN]** |
| Observability | GlitchTip self-hosted (متوافق مع Sentry SDK) افتراضي، PostHog EU، Langfuse self-hosted AU، Uptime Kuma على instance ثانية Always Free أو Cloudflare health checks | Sentry SaaS احتياطي (D12) |
| Hosting | Oracle Cloud Always Free A1 (`ap-sydney-1`) + Docker + Cloudflare R2/Tunnel/Pages؛ LiveKit Server self-hosted | VPS أسترالي مدفوع احتياطي؛ LiveKit Cloud احتياطي (D12) |
| Tests | pytest، Schemathesis، jest-expo + RNTL، Vitest، Playwright، Maestro، Reassure، Flashlight، promptfoo | |

**ممنوع تثبيته:** `expo-speech-recognition`، `expo-av` (استخدم expo-audio/expo-video)، `expo-background-fetch` (استخدم expo-background-task)، Redis ≥ 7.4 (استخدم Valkey BSD-3)، `whisper.rn` مستقل، `react-native-track-player` (v5 ممنوعة؛ v4 فقط إن لزم)، NativeWind، Restyle، HeroUI، PowerSync، Supabase، Arq.

**سياسة الترقية:** pin دقيق بعد الأسبوع الأول؛ الترقية فقط عبر PR مخصص مع اجتياز مجموعة المحاكي الكاملة (وفحص `[FOUNDER-DEVICE]` يُسجَّل في FOUNDER_TODO). CI يشغّل `npx expo install --check` و `expo-doctor`.

---

## 4. الوكيل الصوتي الحي + كتالوج الأدوات الكامل

### 4.1 بوابة الهاتف `apps/mobile/modules/voice`
- Expo module داخلي (Swift/Kotlin). هو **المالك الوحيد** للمايكروفون، و AVAudioSession / AudioRecord، وجلسة أزرار الوسائط، و Android foreground service **واحد** بـ `foregroundServiceType="microphone|location"`. لا شيء آخر يفتح المايك أو يشغّل location FGS.
- **Android manifest:** `FOREGROUND_SERVICE`، `FOREGROUND_SERVICE_MICROPHONE`، `FOREGROUND_SERVICE_LOCATION`، `RECORD_AUDIO`، `ACCESS_FINE_LOCATION` — تُمنح قبل `startForeground`. تجنّب `ACCESS_BACKGROUND_LOCATION` (الموقع من الـ FGS). FGS المايك لا يُبدأ ولا يُعاد من الخلفية: الـ watchdog (أو BOOT_COMPLETED) ينشر إشعارًا يطلب من السائق اللمس للاستئناف فقط. اختبار يستدعي `startForeground` بالأنواع ويلتقط `ForegroundServiceStartNotAllowedException`.
- يشغّل sherpa-onnx: Silero VAD، KWS، GTCRN denoise، streaming ASR، TTS. يوزّع إطارات PCM على المستهلكين المحليين والسحابة.
- **دورة الحياة:** تبدأ الجلسة فقط من إجراء مرئي `start_shift` (قاعدة Android 14+ while-in-use)، وتتوقف عند `end_shift` أو `pause_listening`. مؤشر دائم وإشعار أثناء التشغيل.
- **iOS:** `UIBackgroundModes: audio, location`، category `playAndRecord`، mode `voiceChat`، خيارات `allowBluetooth`، `allowBluetoothA2DP`، `defaultToSpeaker`، `duckOthers` أثناء كلامنا و `mixWithOthers` خارجه. تفعيل الجلسة يتم في الواجهة عند `start_shift`؛ الاستئناف بعد المقاطعة في الخلفية يعتمد على interruption-ended مع `shouldResume`. purpose strings: `NSMicrophoneUsageDescription`، `NSLocationWhenInUseUsageDescription`، `NSLocationAlwaysAndWhenInUseUsageDescription`. خطة بديلة إن رفضت Apple المايك في الخلفية: المايك نشط فقط والتطبيق في الواجهة + زر السماعة/CarPlay.
- **الخصوصية:** التدفق السحابي فقط داخل نافذة الأمر بعد VAD، ويتوقف تلقائيًا عند ابتعاد السائق عن المركبة (geofence الوصول + activity recognition). لا speaker-ID ولا بصمة صوت ولا معالجة biometric (وإن أُضيفت لاحقًا: Biometric Processing Privacy Code 2025).
- **البوابة (Gating):** لا يخرج صوت من الهاتف إلا إذا اكتشف VAD كلاماً أثناء وردية نشطة. نافذة محادثة 20–30 ث بعد كل اكتشاف. Ring buffer مدته 300 ms يحفظ بداية الكلام.
- **Barge-in:** عند إطلاق VAD أثناء TTS يتوقف التشغيل خلال إطار صوتي واحد ويُرسل interrupt للخادم. عتبات منفصلة للسماعة الخارجية و Bluetooth، مع إلغاء الصدى من النظام.
- **آلة حالات الجلسة الصوتية:** تعالج المقاطعات (مكالمات، Siri، تعليمات الملاحة)، تغيّر المسار، و media-services reset، ثم تعيد التسليح تلقائياً وتقول "listening resumed" بلغة السائق. لا يُمسك المايك أثناء مكالمة هاتفية أبداً.
- **قرار مسار السماعة:** في الأسبوع الأول اختبر هل ميكروفون HFP في السماعة يجعل الأزرار غير موثوقة مقارنةً بمايك الهاتف + مخرج A2DP. القرار لكل جهاز.
- **أزرار السماعة (D9/R8):** 1 = `mark_delivered`، 2 = `skip_stop`، 3 = `mark_failed` (يسأل عن السبب صوتياً).

### 4.2 الخادم والنماذج
- Pipecat pipeline واحد لكل وردية نشطة داخل الخلفية، مع `pipecat.flows` من core (حزمة `pipecat-flows` المؤرشفة ممنوعة). Smart Turn v3.2 لنهاية الدور، ومهلة صمت VAD للغات غير المغطاة. الـ pipeline يستدعي **tool registry داخل العملية**.
- النقل: LiveKit RN SDK عبر WebRTC مع token قصير العمر مُسخَّن مسبقاً. الخطة B: Pipecat SmallWebRTC.
- **كل IDs النماذج في config، وترتيب `ProviderChain` (D12، COST_PLAN.md):**
  1. **على الهاتف:** sherpa-onnx (VAD، KWS، ASR، TTS) + قواعد حتمية (~15 أمراً أساسياً) — يعمل دون إنترنت.
  2. **الافتراضي الحي:** Pipecat cascade على خادمنا: faster-whisper → LLM عبر LiteLLM (السلسلة المجانية) → Kokoro TTS.
  3. **حصص مجانية رسمية:** Groq / Cloudflare Workers AI — لنص منقّح فقط (0-B.4).
  4. **مدفوع احتياطي (يُفعَّل بإضافة المفتاح):** Gemini Live native-audio **GA** (لا preview أبدًا؛ تواريخ إيقاف `gemini-live-2.5-flash-native-audio` 2026-12-13 والـ preview 2026-11-17 **[UNVERIFIED]**، ولا تؤثر إلا إن فُعّل المدفوع؛ مدقق الحقائق يثبت الـ ID الحالي في ADR-001 قبل أي عمل Gemini)، OpenAI realtime mini (ID **[UNVERIFIED]**)، Deepgram + Cartesia.
- **مستويات اللغات (D3):** Tier A: offline كامل + KWS؛ Tier B: STT/TTS على الخادم أو السحابة، مع قواعد offline إنجليزية + earcon؛ Tier C: أي لغة يكشفها النموذج، والفهم عبر LLM. الكشف تلقائي. المصفوفة في `docs/LANGUAGES.md`، و evals إلزامية لكل لغة Tier A/B. te reo Māori ولغات المحيط الهادئ: التغطية **[UNVERIFIED]**.
- **المسار السريع متعدد اللغات:** KWS لكل لغة لكلمة "delivered" + grammar موسومة باللغة. الإنجليزية ليست المسار الوحيد تحت 100 ms.
- **الردود:** ≤ 12 كلمة أثناء الحركة، دائماً بلغة السائق، والعناوين تُنطق داخل مقطع `en-NZ`.
- **حدود التكلفة:** لكل سائق ولكل tenant. عند بلوغ الحد: تدهور إلى المستوى المجاني ثم offline grammar مع تحذير صوتي. **لا يُقطع السائق أبداً في منتصف الوردية.**

### 4.3 سياسة التأكيد (تُفرض في طبقة الأدوات، لا في الـ prompt)
| فئة الخطر | السلوك |
|---|---|
| `read` | بلا تأكيد |
| `reversible` | تنفيذ ثم عرض تراجع صوتي لمدة 10 ث |
| `destructive` / `external` | قراءة الإجراء وطلب "yes" صريح؛ الصمت = إلغاء |

### 4.4 سجل الأدوات (Tool Registry)
سجل Pydantic واحد في `services/api` يولّد: مخططات LLM، خادم FastMCP للاختبار، نقاط REST تحت `/v1`، عميل TypeScript، وخريطة إجراءات الواجهة. كل أداة تعلن:

```python
class ToolSpec(BaseModel):
    name: str
    args_model: type[BaseModel]
    risk: Literal["read", "reversible", "destructive", "external"]
    idempotency_key: str          # how the key is derived
    entitlement_key: str | None
    offline: bool                 # must be covered by on-device grammar
```

**CI يفشل إذا وُجد إجراء واجهة بلا أداة (D2).** الاستثناء الوحيد في allowlist: إتمام الشراء داخل المتجر (الأداة `upgrade_plan` تفتح صفحة المتجر). كل استدعاء يُسجَّل في `voice_commands` و `idempotency_keys`.

### 4.5 الكتالوج الكامل
(offline = يجب أن تغطيه القواعد المحلية. مراقب الاكتمال يولّد هذه القائمة من خريطة إجراءات الواجهة ويضيف أي ناقص.)

| المجال | الأدوات |
|---|---|
| Shift | `start_shift`, `end_shift`, `pause_listening`, `resume_listening`, `take_break`, `end_break` |
| Day list | `add_stop`, `dictate_stops`, `import_list` (paste/email/CSV/Excel), `scan_label` (OCR + باركود), `edit_stop`, `remove_stop` (destructive), `correct_address`, `confirm_address_correction`, `undo_correction`, `read_list_summary` |
| Route | `optimise_route`, `reorder_stop`, `apply_template`, `save_template`, `list_templates`, `set_rule`, `list_rules`, `delete_rule` (destructive) |
| Driving | `next_stop` (offline), `repeat_last` (offline), `stop_detail`, `navigate` (deep link), `eta_remaining`, `find_parcel`, `how_many_left` (offline) |
| Outcome | `mark_delivered` (offline، بلا تأكيد، مع undo؛ يسأل أولاً إذا كان السائق أبعد من 150 m عن العنوان)، `mark_left_at` (offline)، `skip_stop` (offline)، `mark_failed` (offline، مع سبب وإعادة جدولة اختيارية للغد)، `undo` (offline)، `attach_photo`, `capture_signature`, `scan_barcode` (اختيارية) |
| Door memory | `add_door_note`, `read_door_notes`, `save_door_here`, `wrong_pin`, `set_gate_code` (مشفّر؛ يُقرأ فقط عند الوصول) |
| Customer (D5) | `toggle_customer_sms`, `text_customer` (external: تأكيد), `call_customer` (external: تأكيد) |
| Report (D6) | `toggle_day_report`, `day_summary`, `export_day_csv` |
| History | `query_history`, `last_visit` |
| Stop settings | `set_time_window`, `set_priority`, `set_service_time`, `set_start_end` (يشمل round trip), `set_vehicle`, `search_address` |
| Settings | `change_setting` (nav app, units, voice speed), `toggle_dark_theme`, `toggle_aerial`, `set_language` |
| Account | `plan_status`, `usage_left`, `upgrade_plan` (يفتح صفحة المتجر), `export_data`, `delete_account` (destructive) |
| Help | `ask_help`, `report_bug` |
| Customer extras | `sms_status`, `open_tracking_link` |
| Report extras | `generate_logbook` (IRD PDF) |
| Team (dispatcher) | `assign_route`, `view_live_map`, `message_driver`, `list_drivers` |
| Safety | `sos_call` (external، تأكيد سريع), `report_hazard`, `report_map_error` |
| Onboarding | `voice_onboarding` |

---

## 5. تصحيح العناوين، القوالب، القواعد، ذاكرة الأبواب، الخرائط

### 5.1 تصحيح العناوين (D8)
- **المصدر:** LINZ NZ Addresses + NZ Addresses: Roads (CC BY 4.0)، مقصوصة بمضلّع منطقة Canterbury الرسمي، محمّلة في PostGIS مع pg_trgm و fuzzystrmatch. تحديث أسبوعي عبر LDS changeset API بالمفتاح `LINZ_LDS_API_KEY` (القسم 0-D) — يملكه `services/worker` فقط، ولا يدخل أبدًا `apps/mobile` أو `apps/web`؛ الهاتف يستلم شريحة FTS جاهزة فقط. **Layer IDs (NZ Addresses و NZ Roads Addresses) في config ويتحقق منها المنفّذ عبر LDS API عند أول استيراد وقبل كل استيراد.** إعادة ترتيب بيانات مارس 2026 **[UNVERIFIED]**. نص الإسناد: "Sourced from the LINZ Data Service and licensed for reuse under CC BY 4.0".
- **Pipeline حتمي — الـ LLM لا يكتب عنواناً أبداً:**
  1. Normalise + tokenise؛ الرقم واللاحقة والوحدة منفصلة (`42B` ≠ `2/14`).
  2. توليد مرشحين بـ RapidFuzz و Double Metaphone (أسماء الماوري تحتفظ بالـ macrons) و trigram.
  3. التحقق أن رقم المنزل موجود على ذلك الطريق في تلك المنطقة.
  4. حساب الثقة.
  5. إرجاع `linz_address_id`.
- **صحّح ثم أبلغ:** "you said X, corrected to Y" (بلغة السائق، والعنوان بالإنجليزية)، صوتاً وبطاقة مع Undo.
- **اسأل فقط** إذا: الرقم غير موجود في LINZ، أو الشارع موجود في منطقتين أو أكثر، أو العنوان خارج المنطقة، أو الثقة تحت العتبة.
- كل تصحيح في `address_corrections`؛ التصحيحات المقبولة تغذي lexicon لكل tenant يُطبَّق على حدود الـ tokens فقط.
- شريحة عناوين Canterbury دون إنترنت (عدد الصفوف **[UNVERIFIED]** — يُقاس عند الاستيراد، SQLite FTS5 منفصلة) تُشحن للهاتف.

### 5.2 القوالب والقواعد
- `route_templates`: عدة قوالب لكل سائق، كل قالب مقاطع مرتبة.
- **Master Template Lock:** ترتيب القالب هو الأساس. VROOM يُدخل فقط المحطات خارج القالب ويعالج طلبات إعادة الترتيب.
- `driver_rules` مخزنة بشكل منظم (مثل "school zone before 8:30"، "always do X first") وتُترجم إلى قيود VROOM، و OR-Tools فقط لما لا يعبّر عنه VROOM.
- **Offline:** الترتيب من القالب، والمحطات الجديدة بـ nearest-insert.

### 5.3 ذاكرة الأبواب
- الربط فقط عبر `delivery_events.stop_id → stops.linz_address_id → location_memory(org_id, linz_address_id)`، أو `stops.custom_location_id → custom_locations` للعناوين غير الموجودة في LINZ (دبوس يدوي، ريفي، تقسيم جديد). لا استخدام لأقرب جار مكاني لتحديد العنوان الذي يتعلّم.
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
- **Vector tiles:** Geofabrik NZ PBF → osmium (مضلّع المنطقة؛ في الخلفية فقط لأنه GPL) → planetiler مع Protomaps profile → `canterbury.pmtiles`. تنزيل عبر Wi-Fi مع استئناف و checksums ومستثنى من النسخ الاحتياطي. العرض بـ MapLibre RN v11. glyphs (PBF) و sprites مضمّنة محليًا لنمط Protomaps. اختبار `pmtiles://file:///…` في Phase 0 على المنصتين؛ البديل MBTiles عبر خادم tiles محلي.
- **Aerial:** raster PMTiles من LINZ open-data COGs على AWS. لا استخدام جماعي لـ Basemaps API.
- **Routing:** Valhalla 3.6.x (matrix + directions)، VROOM (أحدث release رسمي)، OR-Tools 9.x (قواعد فقط).
- **Navigation:** deep link إلى Google Maps / Apple Maps / Waze إلى نقطة الدخول المتعلَّمة، مع ducking لصوتنا بجانب تطبيق الملاحة.
- **Attribution في التطبيق والويب:** "© LINZ CC BY 4.0" و "© OpenStreetMap contributors (ODbL)". لا تخزين لبيانات Google، ولا geocoding جماعي عبر Nominatim العام.
- **قفل السرعة (Rule 7.3A):** فوق ~10 km/h أو أثناء الحركة حسب activity recognition: فقط الإجراء الرئيسي وشريط الصوت مفعّلان؛ الكاميرا ولوحة المفاتيح والسحب والاستيراد والإعدادات معطّلة مع شرح صوتي (اختبار Maestro).
- **Geofences:** 150 m و 30 m، مع تدوير المحطات القادمة للبقاء ضمن حد iOS (20 منطقة).

### 5.5 المزامنة دون إنترنت
- قاعدة محلية واحدة: **op-sqlite + SQLCipher**. Outbox append-only: client UUID، `seq` رتيب لكل جهاز، `occurred_at`، GPS fix.
- **"Delivered" لا يُحجب أبداً بالشبكة:** كتابة محلية ← haptic + earcon + تأكيد صوتي ← مزامنة.
- **Push:** `POST /v1/shifts/{id}/events:batch` بحد حجم؛ الخادم يُدرج مع `UNIQUE(driver_id, device_id, device_seq)` و PK على id؛ عند التعارض يقارن `org_id` و `driver_id` و hash الحمولة ويعيد `conflict` إن اختلفت (لا نجاح صامت)، يعيد نتائج جزئية لكل عنصر + cursor، ويخزن `occurred_at` و `received_at`، ولا يثق بساعة العميل للترتيب.
- **Pull:** `GET /v1/sync?cursor=` يعيد تغييرات `updated_at` و tombstones (قائمة اليوم، التصحيحات، القوالب، الملاحظات).
- كل سائق هو الكاتب الوحيد لأحداثه. لا CRDTs. التراجع والتصحيح أحداث جديدة (`reverts_event_id`). حالة المحطة تُعاد حسابها في نفس الـ transaction بطيّ الأحداث بترتيب `device_seq` مع تطبيق `reverts_event_id` (مع property test للتراجع خارج الترتيب).
- TanStack Query لقراءات الخادم فقط، ولا يخزن بيانات النطاق.
- مزامنة خلفية انتهازية بـ expo-background-task؛ المزامنة الرئيسية داخل خدمة الوردية.
- وضع offline يُعلن صوتياً + chip حالة بعدد الطابور.

---

## 6. نموذج البيانات
أول Alembic migration = `db/schema.sql` المصحح. كل جدول مملوك لـ tenant فيه `org_id` (و `driver_id` حيث ينطبق)، `created_at`, `updated_at`, `deleted_at`، و **RLS enabled + forced**. كل الـ IDs من نوع UUID. الجداول append-only (`delivery_events`، `gps_trace`، `audit_log`، `voice_commands`) مستثناة من `updated_at`/`deleted_at`.

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
| devices | id, org_id, driver_id, platform, created_at |
| custom_locations | id, org_id, point, label (عناوين خارج LINZ) |
| stops | org_id, shift_id, linz_address_id (nullable), custom_location_id (nullable، CHECK: واحد بالضبط من الاثنين), raw_input, seq, status (enum مشترك مع events), customer_name, customer_phone_enc, tracking_sms_enabled, time_window |
| parcels | org_id, stop_id, barcode, label |
| delivery_events | id (client UUID) PK, org_id, driver_id, device_id, stop_id, device_seq (UNIQUE مع driver_id و device_id), payload_hash, kind (CHECK: delivered, left_at, skipped, failed, deferred, undo, note), reason, utterance, utterance_hash, lat, lon, accuracy_m, distance_m, reverts_event_id, occurred_at, received_at |
| pod_attachments | org_id, event_id, type (photo/signature/barcode), object_key |
| address_corrections | org_id, driver_id, stop_id, raw_input, linz_address_id, confidence, reason, mode (auto/asked), accepted |
| voice_commands (audit) | org_id, driver_id, utterance, lang, tool, args jsonb, result, source (local/cloud/cascade), confidence, idempotency_key |
| idempotency_keys | PK (org_id, key), tool, response, created_at |
| voice_sessions / transcripts | org_id, driver_id, shift_id, provider, model_id, minutes, cost؛ transcripts تُحذف بعد 30 يوماً |
| gps_trace | org_id, shift_id, ts, point؛ partitioned مع TTL (لحساب km في D6) |
| day_reports | org_id, driver_id, date, km, earnings, gst, csv_key |
| tracking_tokens | org_id, stop_id, token_hash (عشوائي ≥ 128-bit), expires_at (عند إكمال المحطة) |
| subscriptions | org_id, source (stripe/apple/google), external_id, status, current_period_end |
| entitlements | org_id, feature_key, limit |
| usage_counters | org_id, driver_id, period, voice_minutes, sms_sent, ocr_scans |
| processed_webhooks | provider, event_id |
| audit_log | actor, action, target, impersonated_by |

**الاحتفاظ (retention_purge job + اختبار):** حقول `utterance` و `raw_input` تُنقّح بعد 30 يومًا (يبقى `utterance_hash`)؛ `gps_trace` 90 يومًا أو حتى تصدير التقرير/logbook؛ `customer_name` و `customer_phone_enc` تُحذف بعد N أيام من نهاية الوردية (N في config)؛ `audit_log` سنتان.
**التشفير:** على الخادم envelope encryption بمفتاح رئيسي في مدير الأسرار ومفاتيح بيانات لكل org مع تدوير؛ على الهاتف مفتاح SQLCipher في Keystore/Keychain، ومسح القاعدة عند الخروج أو إلغاء الجلسة عن بعد.

الـ enums في `packages/shared` كمصدر واحد يولّد Zod و Pydantic، واختبار يثبت تطابقهما.

**الخلفية:** FastAPI + Pydantic v2 تحت `/v1`؛ OpenAPI هو العقد ويولّد عميل TS؛ Schemathesis يختبر الـ API. LangGraph 1.x مع Postgres checkpointer (`thread_id = shift_id`)، الحالة تتغير فقط عبر قيم إرجاع العقد، و `MemorySaver` ممنوع في الإنتاج. الاستحقاقات تُفحص من قاعدة البيانات على الخادم؛ لا استدعاء لـ Stripe في مسار الطلب. Webhooks تتحقق من التوقيع (`Stripe-Signature`، ترويسة RevenueCat) مع اختبارات. Hatchet jobs: LINZ refresh، door learning، rollups، retention purge، webhook processing.

---

## 7. خدمات SaaS الداخلية مع الأولويات

| ترتيب البناء (كلها تُسلَّم قبل التسليم، D11) | البنود |
|---|---|
| **1 — النواة** | الاستيراد بالصوت (إملاء متعدد المحطات) واللصق والبريد و CSV/Excel مع ربط أعمدة بالـ LLM؛ إضافة محطة من الموقع الحالي؛ عرض خريطة + قائمة مع سحب أو ترتيب صوتي؛ أسباب الفشل مع إعادة الجدولة لمسار الغد؛ مُحدِّد موضع الطرد (`find_parcel`)؛ تتبّع GPS خلفي موفّر للبطارية؛ تصحيح العناوين (D8)؛ تحسين المسار مع نوافذ زمنية وأولوية؛ إعادة التحسين أثناء المسار؛ تسليم الملاحة؛ ذاكرة الأبواب؛ POD منطوق (D4) + طابور offline؛ undo؛ القوالب والقواعد؛ السجل والمسارات المحفوظة؛ الإعدادات بالصوت؛ واجهة متعددة اللغات مع RTL؛ onboarding بالصوت؛ trial و Solo و Team؛ الفوترة (Stripe ويب + RevenueCat IAP)؛ الاستحقاقات والاستخدام؛ لوحة ويب (السجل، القوالب، الحساب)؛ `/admin` (المستخدمون، الاشتراكات، أخطاء GlitchTip، تكلفة AI/SMS لكل مستخدم، impersonation مع سبب مسجَّل ومدة محدودة وظاهر للمستخدم في سجل حسابه)؛ حذف الحساب وتصدير البيانات؛ مركز مساعدة + وكيل مساعدة AI متعدد اللغات مع تصعيد بالبريد؛ صفحة حالة؛ رسائل Resend |
| **2 — اختياري، مطفأ افتراضياً** | صفحة رابط التتبع (rate-limited، موقع تقريبي/ETA فقط، لا محطات أخرى) + SMS (D5): رقم NZ طويل، معالجة STOP، معاملاتية فقط، إضافة مقاسة. تقرير نهاية اليوم (D6): km، أرباح، GST، CSV. POD بالصورة والتوقيع والباركود |
| **3 — يُبنى أخيرًا (Phase G)** | OCR للملصقات (VisionCamera + ML Kit plugin خاص)؛ طبقة جوية؛ خريطة حية للـ dispatcher في Team وتسليم المسارات؛ IRD logbook PDF والفواتير؛ Ferrostar (flag)؛ مكالمات مقنّعة عبر مزوّد SMS/صوت المختار إن دعمها، وإلا تُسقط بقرار ADR (Twilio Proxy متوقف) |

**الخطط والاستحقاقات (D11):**

| الخطة | النطاق | مفاتيح `entitlements` |
|---|---|---|
| Trial | 14 يوماً، سائق واحد، حد دقائق صوت | `voice_minutes`، `drivers=1`، `trial_days=14` |
| Solo | سائق واحد، كل الميزات الفردية | `voice_minutes`، `drivers=1`، `sms`، `day_report`، `ocr_scans`، `aerial` |
| Team | org + dispatcher + خريطة حية + تسليم المسارات | كل Solo + `drivers=N`، `dispatcher`، `live_map`، `route_handoff` |

الأسعار والحدود الرقمية **[OPEN]** للمؤسس.

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
- **نظام التصميم "Courier Base":** DTCG JSON tokens في `packages/design-tokens`، تُبنى بـ Style Dictionary 4.x إلى TS (Unistyles)، و CSS variables / Tailwind v4 (ويب، shadcn مُثيَّم من tokens)، وأنماط PDF. Tokens Studio اختياري.
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
- **المراجعة:** Storybook RN + screenshot diffs (LTR/RTL × 3 ثيمات × نص 100%/200%). مراجع التصميم في لجنة المراجعة يراجع كل PR في `packages/design-tokens` ومكونات UI. ملاحظات المؤسس والسائقين تأتي بشكل غير متزامن كـ PRs عادية.
- **مخرجات ينتجها الوكلاء:** مجموعة tokens، مواصفات الشاشات، مواصفات واجهة الصوت (العبارات، التأكيدات، نصوص الإصلاح لكل لغة)، هوية بصرية v0. تُوسم `provisional`، تعتمدها لجنة المراجعة (مراجع التصميم)، ويُبنى بها فورًا. المؤسس يراجعها لاحقًا (بند غير حاجز في FOUNDER_TODO)، وأي تغيير يطلبه يدخل كـ PR عادي.

---

## 9. الأمن والقانون والخصوصية
- **بوابة الرخص:** لا AGPL / GPL / SSPL / Commons Clause / CC-NC / FSL / BUSL في التطبيق. أدوات الخادم تحت هذه الرخص تُستخدم دون تعديل أو كـ SaaS. SBOM + فحص رخص في CI بقائمة منع. أوزان النماذج: `MODEL_LICENSES.md` allow-list (الرخصة، الإسناد، الاستخدام التجاري لكل ملف)؛ CI يفشل على أي نموذج غير مدرج؛ تفضيل Apache/MIT (Whisper، Zipformer، Kokoro، Silero)؛ أصوات Piper تُفحص لكل صوت؛ الإسنادات في شاشة attribution.
- **مكونات ممنوعة:** Porcupine، نماذج openWakeWord، piper1-gpl، نماذج Moonshine غير الإنجليزية، MMS، NLLB، Seamless، LibreTranslate، TEN framework، LiveKit turn-detector، RNTP v5، claude-task-master، contains-studio. Fleetbase مرجع فقط.
- **Silero VAD:** MIT حسب ملف LICENSE. **[RE-CONFIRM]** قبل الإصدار وثبّت ملف النموذج بعينه.
- **التبعيات:** pins دقيقة مع hashes (`uv lock --generate-hashes`). LiteLLM ≥ 1.83.0. إذا ثُبّت 1.82.7 أو 1.82.8 في أي مكان سابقاً، دوّر كل الأسرار.
- **الأسرار:** حسب القسم 0-D؛ التطبيق يحصل على tokens قصيرة العمر فقط؛ gitleaks في pre-commit و CI؛ Semgrep/zizmor على `.github/workflows`.
- **التشفير:** أكواد البوابات وأرقام هواتف العملاء مشفرة at rest (إدارة المفاتيح في القسم 6).
- **Tenancy:** RLS على كل جدول عملاء، مع اختبارات تثبت أن القراءة عبر tenants تعيد صفر صفوف.
- **الخصوصية (NZ Privacy Act 2020):**
  - إشعارات IPP 3 للسائقين و **IPP 3A** (جمع غير مباشر، سارٍ منذ 1 مايو 2026) للمستلمين عبر إشعار خصوصية مرتبط من صفحة التتبع و SMS؛ الأدوار في ToS/DPA: السائق أو Team org هو الـ agency، ونحن service provider (s11)، والسائق يقرّ بحقه في رفع بيانات المانيفست؛
  - قائمة المعالجين `docs/legal/processors.md` تُولَّد من config الـ router (المزوّد، نوع البيانات، المنطقة، الاحتفاظ، التدريب)؛ موافقة IPP 12 للمعالجة خارج نيوزيلندا مع قائمة معالجين بالمنطقة ومدة الاحتفاظ؛
  - المايك يعمل فقط أثناء وردية نشطة، والإيقاف بالصوت وبالزر؛
  - لا تخزين للصوت افتراضياً، والنصوص تُحذف بعد 30 يوماً؛
  - Privacy Impact Assessment للمايك الدائم؛
  - معالجة طلبات الوصول والتصحيح IPP 6/7، وخطة اختراق لإبلاغ OPC؛
  - تأكيد إعدادات no-training و zero-retention لدى كل مزوّد **[UNVERIFIED per vendor]**.
- **Redaction:** وحدة PII مركزية واحدة تستخدمها GlitchTip/Sentry `beforeSend` وتنقيح الطلبات للمستويات المجانية (0-B.4) و allowlist في PostHog و mask في Langfuse. اختبار CI يفشل إذا تسرب عنوان أو هاتف أو GPS أو صوت.
- **SMS:** معاملاتية فقط، فقط عند تفعيل السائق، مع احترام STOP (UEMA 2007).
- **قانون القيادة:** لا تدفق يتطلب لمساً أثناء الحركة. التسويق لا يدّعي امتثالاً يتجاوز قاعدة "الهاتف المثبت واللمسة القصيرة".
- **امتثال المتاجر:** تبرير الصوت والموقع في الخلفية، purpose strings، تصريحات Play foreground-service مع فيديوهات توضيحية؛ Data safety و privacy labels؛ حذف الحساب داخل التطبيق؛ IAP للمشتريات داخل التطبيق بلا واجهة شراء Stripe أو روابط شراء في التطبيق؛ محاذاة 16 KB page لكل ملف `.so`: NDK r28+ و AGP ≥ 8.5.1، و CI يشغّل `zipalign -c -P 16 -v 4 app.apk` وفحص `objdump -p` (LOAD align 2**14) لكل `.so` ويفشل عند أي خلل. كل نماذج Play (FGS microphone/location مع فيديو، Data safety) في FOUNDER_TODO.

---

## 10. الجودة و CI والمراقبة
- **الاختبارات:** pytest (Postgres/PostGIS testcontainers، RLS، replay المزامنة، migrations على قاعدة فارغة ومأهولة)، Schemathesis، jest-expo + RNTL، Vitest + Playwright، Maestro على محاكي أندرويد في GitHub Actions (`reactivecircus/android-emulator-runner`). Maestro لا يستطيع حقن صوت المايك، لذا أضف **مصدر صوت WAV للـ debug فقط** يغذي fixtures في pipeline الصوت. Reassure على كل PR؛ Flashlight وتشغيل Maestro لوردية كاملة ليلياً على Android منخفض المواصفات.
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
  | توفر API | 99.9% (بعد الانتقال للاستضافة المدفوعة قبل الإطلاق العام) |
  | البطارية (Android متوسط، شاشة مطفأة، GPS تكيفي، VAD gating) | ≤ 8%/h |
  | Cold start (Android منخفض) | < 2.5 s |

- **عمليات الموبايل:** سياسة thermal throttling (خفض دورة VAD/ASR و FPS الخريطة مع ارتفاع الحرارة)؛ خطة ضد قاتلي البطارية لدى المصنّعين (onboarding للإعفاء، watchdog، إرشادات dontkillmyapp)؛ ميزانية تنزيل النماذج والـ tiles (غالباً > 1 GB): Wi-Fi فقط، استئناف، checksums، بلا نسخ احتياطي.
- **المراقبة من أول commit:** GlitchTip self-hosted (Sentry SDK في RN + Python، Hermes source maps يرفعها CI بـ `sentry-cli`، OTel propagation؛ Sentry SaaS احتياطي)؛ PostHog EU مع allowlist للخصائص وبلا replay لشاشات العناوين؛ Langfuse self-hosted AU مع تكلفة لكل وردية وتنبيه kill-switch؛ Uptime Kuma على instance ثانية Always Free أو Cloudflare health checks.
- **التسليم:** GitHub Actions + `eas build --local` + Fastlane؛ OTA عبر expo-open-ota على R2 مع `runtimeVersion` من fingerprint (EAS احتياطي فقط)؛ staged rollout 10% → 50% → 100% مع إيقاف تلقائي عند انخفاض crash-free؛ runbook للتراجع (إعادة توجيه الـ channel في expo-open-ota إلى التحديث السابق)؛ مستويات SEV1–3 و on-call؛ CI يشغّل `npx expo install --check` و `expo-doctor`؛ أدوات أمن: gitleaks، Semgrep CE، Trivy، Renovate، SBOM.

---

## 11. أدوار فريق الوكلاء لتنفيذ البناء
أدوات الفريق: Claude Code مع `addyosmani/agent-skills` و `anthropics/skills` و `expo/skills`؛ 4–5 subagents مفحوصين ومثبّتين في `.claude/agents`؛ skills خاصة: `voice-tool-contract`، `nz-address-english-only`، `pod-delivered-utterance`، `design-system-courier`؛ `CLAUDE.md` لكل package. كل skill خارجي يُقرأ كاملاً ويُضمَّن (vendored) ويُثبَّت. ممنوع: MetaGPT، ChatDev، claude-flow، contains-studio، task-master.

**ربط الأدوار بمهارات agent-skills:** Lead ← `interview-me`، `idea-refine`، `spec-driven-development`، `planning-and-task-breakdown`، `documentation-and-adrs` · المطوّرون ← `incremental-implementation`، `test-driven-development`، `context-engineering`، `source-driven-development`، `frontend-ui-engineering`، `api-and-interface-design` · المراقبون والمصلحون ← `debugging-and-error-recovery`، `browser-testing-with-devtools`، `performance-optimization`، `observability-and-instrumentation` · لجنة المراجعة ← `code-review-and-quality`، `code-simplification`، `security-and-hardening`، `doubt-driven-development` · الإطلاق ← `git-workflow-and-versioning`، `ci-cd-and-automation`، `deprecation-and-migration`، `shipping-and-launch`.

| الدور | المسؤولية | النطاق المسموح |
|---|---|---|
| **Lead / Integrator** | يقسّم الخطوات، يكتب OpenSpec specs، يدير الفروع، يجمع ملخصات PR، يدير حلقة الجودة ولجان المراجعة | كل المستودع (قراءة)، `openspec/`, `docs/adr/` |
| **Mobile & Native Voice** | `apps/mobile`، `apps/mobile/modules/voice` (Swift/Kotlin)، آلة حالات الصوت، الأزرار، الخلفية، op-sqlite outbox | `apps/mobile` |
| **Backend & Voice Server** | FastAPI، tool registry، Pipecat pipeline، LangGraph، Hatchet، المزامنة، الفوترة على الخادم | `services/api`, `services/worker`, `packages/shared` |
| **Geo & Routing** | LINZ loader، pipeline التصحيح، FTS slice، Valhalla/VROOM/OR-Tools، القوالب والقواعد، PMTiles | `packages/nz-address`, `infra/`, وحدات geo في `services/api` |
| **Design System & Web** | tokens، Unistyles themes، i18n/RTL، Storybook، `apps/web` (dashboard، admin، help، tracking) | `packages/design-tokens`, `apps/web`, مكونات UI |
| **QA / Security / Release** | الاختبارات، evals، CI، فحص الرخص و SBOM، redaction tests، البناء المحلي و expo-open-ota، runbooks؛ له حق الاعتراض على أي PR | `.github/`, tests, `infra/ci` |

قواعد الفريق: الوكلاء ينفذون فقط من specs و tokens معتمدة من لجنة المراجعة (أو `provisional` حسب القسم 8)؛ لجنة المراجعة الآلية (0-A.2) توافق على كل PR والدمج تلقائي بعد `review-gate` و CI؛ ما يمس `.github/workflows` و `infra/` و auth و billing و migrations والأسرار يتطلب موافقة المؤسس عبر CODEOWNERS (يُسجَّل في FOUNDER_TODO ويستمر العمل الآخر)؛ دور DB للوكلاء read-only على الإنتاج فقط؛ Stripe test mode فقط؛ لا وكيل يعدّل ملفات خارج نطاقه دون طلب من Lead.

---

## 12. خطة البناء المرحلية
كل خطوة لها معرّف (`P0.1`، `A.1`، `B.3`…) = فرع + PR + حلقة الجودة (0-A.3) + دمج تلقائي عند النجاح + تحديث `docs/PROGRESS.md`. ترتيب التنفيذ: 0 → A → B → C → D → E → **G** → F. كل بند يحتاج جهازًا حقيقيًا موسوم `[FOUNDER-DEVICE]` لا يحجز المرحلة: يُسجَّل في FOUNDER_TODO ويُكمَل العمل.

### Phase 0 — الأسبوع 1: Go/No-Go spike
**الخطوات:**
- P0.1 إنشاء هيكل الـ monorepo (شجرة 0-A.4) + `.env.example` و `scripts/open-secrets` و `scripts/check-secrets` (القسم 0-D).
- P0.2 مدقق الحقائق يتحقق من كل إصدار **[UNVERIFIED]** في القسم 3.3 و 4.2 (Expo SDK، MapLibre، Pipecat ومسار flows، Smart Turn، Valhalla، VisionCamera، IDs النماذج) ويسجّلها في ADR-001؛ ثم بناء dev client على أحدث SDK مستقر.
- P0.3 على **محاكي أندرويد + CI** (البوابة): MapLibre + `pmtiles://file://`؛ stub لـ `apps/mobile/modules/voice` مع sherpa VAD/KWS/ASR (مصدر WAV للـ debug)؛ op-sqlite (SQLCipher + FTS5) outbox؛ FGS microphone|location؛ أحداث media button محاكاة 1x/2x/3x؛ LiveKit loopback؛ VisionCamera بكاميرا المحاكي؛ bottom sheet. `[FOUNDER-DEVICE]`: iOS، سماعات حقيقية وبلوتوث السيارة، الشاشة مقفلة مع Google Maps، قاتلو البطارية لدى المصنّعين.
- P0.4 فحص محاذاة 16 KB page (القسم 9).
- P0.5 spike مخاطر مراجعة المتاجر: مؤشر دائم، بدء من إجراء مرئي، ملاحظات مراجعة وفيديو.

**تعريف الإنجاز:** كل بند على المحاكي/CI ينجح، ADR-001 يثبّت الإصدارات، و `expo-doctor` أخضر في CI. وإلا: الرجوع إلى SDK السابق وتسجيل السبب.

### Phase A — الأساسات (الأسابيع 2–3)
**الخطوات:** المخطط المصحح كأول Alembic migration (tenancy، RLS، enums، الجداول الجديدة)؛ enums في `packages/shared` تولّد Zod و Pydantic؛ Better Auth مع JWKS؛ CI (lint، typecheck، tests، gitleaks، SBOM/licence scan، hash locks)؛ GlitchTip مع PII redaction؛ إصلاح `app/nz_address.py` (suffix vs unit) و mutation في `intake_graph.verify`.
**تعريف الإنجاز:** كل الاختبارات الحالية في `tests/` (العدد المسجَّل في Baseline) + اختبارات RLS و migrations و redaction خضراء.

### Phase B — العناوين والتوجيه (الأسابيع 3–5)
**الخطوات:** LINZ loader في `services/worker` (مضلّع المنطقة، layer IDs في config ومُتحقق منها)؛ pipeline التصحيح وتسجيل `address_corrections`؛ شريحة FTS دون إنترنت؛ Valhalla + VROOM؛ القوالب ومُترجم القواعد؛ pipeline PMTiles.
**تعريف الإنجاز:** المجموعة الذهبية (200+) تحقق ≥ 95% `linz_address_id` صحيح؛ اختبارات "اسأل فقط عند الشك" تنجح؛ الترتيب دون إنترنت يأتي من القالب؛ اختبار تغطية Canterbury (0-C.2) ينجح.

### Phase C — النواة دون إنترنت وواجهة الموبايل (الأسابيع 4–7)
**الخطوات:** outbox + batch push + cursor pull؛ شاشة القيادة و next-stop sheet و D9 بالطرق الثلاث؛ تعلّم الأبواب كـ job مع فلترة الشواذ؛ حزمة tokens والثيمات الثلاث؛ i18n مع RTL و pseudo-locales.
**تعريف الإنجاز:** اختبار airplane-mode chaos لا يفقد أي حدث؛ replay idempotent؛ Maestro يغطي D9؛ screenshot diffs خضراء.

### Phase D — الصوت الحي (الأسابيع 5–9)
**الخطوات:** إكمال `apps/mobile/modules/voice` (آلة الحالات، barge-in، المقاطعات وتغيّر المسار)؛ tool registry بكل أدوات الكتالوج + سياسة التأكيد + جداول idempotency/audit؛ Pipecat pipeline لكل وردية على **الـ cascade المجاني افتراضيًا** (faster-whisper + LiteLLM + Kokoro) مع offline grammar، والمزوّدون المدفوعون (Gemini Live GA، realtime mini) خلف config تُختبر بـ mocks حتى يضيف المؤسس مفاتيحها؛ تواريخ ترحيل Gemini تهم فقط إن فُعّل المدفوع؛ حدود التكلفة.
**تعريف الإنجاز:** تطابق السجل/الواجهة 1:1؛ SLOs الكمون محققة على السلسلة المجانية؛ مصفوفة eval تنجح لكل لغات Tier A/B (`docs/LANGUAGES.md`)؛ وردية Maestro كاملة على المحاكي دون توقف. `[FOUNDER-DEVICE]`: بطارية ≤ 8%/h ووردية 10 ساعات بشاشة مطفأة على هاتف حقيقي.

### Phase E — SaaS (الأسابيع 8–11)
**الخطوات:** لوحة الويب و `/admin` والاستحقاقات؛ Stripe + RevenueCat مع idempotency للـ webhooks؛ trial بحدود صوت وفترات سماح؛ Resend ومركز المساعدة ووكيل المساعدة AI؛ حذف الحساب والتصدير؛ صفحة التتبع و SMS (D5) والتقرير (D6) كخيارات؛ onboarding صوتي.
**تعريف الإنجاز:** دورة شراء → استخدام → إلغاء → قفل عند نهاية الفترة تنجح في test mode؛ لا سائق يُقفل في منتصف الوردية؛ D5/D6 مطفأة افتراضياً وقابلة للتبديل بالصوت.

### Phase G — اكتمال النسخة (الأسابيع 11–14، D11): كل البنود تُبنى قبل التسليم
**الخطوات:**
- G.1 Label OCR: VisionCamera + ML Kit OCR + باركود → مطبّع `packages/nz-address` → `add_stop` مع ربط الطرد (`scan_label`)، معطّل أثناء الحركة.
- G.2 الطبقة الجوية: raster PMTiles من LINZ COGs لكل منطقة فرعية مع الحجم (`toggle_aerial`).
- G.3 Team dispatcher: الخريطة الحية وتسليم المسارات في `apps/web` + أدوات Team الصوتية.
- G.4 IRD logbook PDF والفواتير (`generate_logbook`).
- G.5 Ferrostar خلف flag (R21).
- G.6 المكالمات المقنّعة عبر المزوّد المختار، أو إسقاطها بقرار ADR موسوم **[OPEN]** للمؤسس.
**تعريف الإنجاز:** OCR على 50 صورة ملصق في `tests/golden/labels` يعطي ≥ 95% `linz_address_id` صحيح؛ dispatcher live map E2E في Playwright؛ اختبار PDF الـ logbook (أرقام IRD من config)؛ اختبار تفعيل/تعطيل flag الـ Ferrostar؛ كل أداة G لها اختبار صوتي.

### Phase F — التقوية والتسليم (الأسابيع 14–16)
**الخطوات:** PIA، سياسة الخصوصية، قائمة المعالجين، الموافقات؛ حزم مراجعة المتاجر (جاهزة للرفع)؛ شاشة الـ attribution؛ runbook للإطلاق التدريجي و on-call؛ التسليم حسب 0-C.3 (المحاكي + APK + ACCEPTANCE_TEST + HANDOVER).
**تعريف الإنجاز قبل التسليم (آلي):** اختبارات SLO على المحاكي و CI خضراء؛ مراجع التصميم في اللجنة وقّع (D7)؛ فحص رخص الكود والنماذج نظيف؛ شروط المزوّدين المستخدمة موثّقة؛ معايير 0-A.7 محققة.
**بعد التسليم (في HANDOVER.md و FOUNDER_TODO، لا يحجز التسليم):** beta مع سائقين في Christchurch و SLOs ثابتة لأسبوعين، TestFlight و Play Internal، موافقة المتاجر، المراجعة القانونية.

---

## 13. المخاطر
| الخطر | التخفيف |
|---|---|
| إيقاف Gemini Live 2.5 وإغلاق preview (تواريخ **[UNVERIFIED]**) | Gemini احتياطي مدفوع فقط؛ الافتراضي cascade مجاني؛ IDs في config ويثبّتها مدقق الحقائق |
| أحدث Expo SDK غير مستقر أو المكتبات متأخرة | spike الأسبوع 1، الرجوع إلى الـ SDK المستقر السابق |
| قواعد الصوت الخلفي، قاتلو البطارية، رفض المتاجر | البدء فقط من إجراء مرئي، watchdog، حزم مراجعة بفيديوهات |
| أزرار السماعة غير موثوقة على HFP | اختبار لكل جهاز في الأسبوع 1؛ الصوت والشاشة يبقيان |
| تكلفة الصوت أعلى من سعر الخطة؛ كل الأسعار **[UNVERIFIED]** | نموذج تكلفة من صفحات المزوّدين، VAD gating، حدود، cascade، تدهور offline |
| ضعف تغطية te reo Māori و Samoan و Tongan و Tagalog **[UNVERIFIED]** | مستويات اللغات (Tier B/C)، حزم عبارات مسبقة، واجهة إنجليزية احتياطية |
| Deepgram en-NZ **[UNVERIFIED]** | keyterms بدلاً منه أو تخطي Deepgram |
| تغيّر LINZ layer IDs **[UNVERIFIED]** | IDs في config وتُفحص قبل كل استيراد |
| سلسلة التوريد (حادثة LiteLLM) | hash locks، Renovate، Trivy، تدوير الأسرار |
| روابط RN غير ناضجة (sherpa-onnx، ML Kit v5) | امتلاك native module أو fork |
| الحرارة على هاتف مثبت يشحن | سياسة thermal throttling |
| تنزيلات > 1 GB | Wi-Fi مع استئناف |
| شكاوى خصوصية من المايك الدائم | PIA، مؤشر، استماع أثناء الوردية فقط، إيقاف عند الابتعاد عن المركبة، لا تخزين صوت |
| Oracle Always Free بلا SLA وقد يُسترجع | نسخ WAL إلى R2، IaC، الانتقال لبديل مدفوع قبل الإطلاق العام؛ `sos_call` يستخدم المتصل الأصلي إلى 111 ولا يعتمد على خادمنا |
| التسعير مساوٍ لـ Spoke لا أعلى | إعادة التبرير بالصوت أولاً وذاكرة الأبواب وعناوين NZ |
| فريق صغير (1–3) | أداة واحدة لكل مهمة؛ أدوات البناء للأسطح القياسية فقط |

---

## 14. ما يجب أن يوفّره المؤسس

> القائمة الكاملة للمفاتيح وأسماء المتغيرات ومكانها في **القسم 0-D** (هو المرجع الوحيد). الآن: الحسابات المجانية فقط (D12).
1. صلاحية write على `haytham26/courier` (private). حماية `main`: required status checks (CI + `review-gate`) بلا مراجعة بشرية إلزامية؛ المؤسس CODEOWNER للمسارات الحساسة فقط.
2. **الآن (مجاني):** الحسابات والمفاتيح في جدول «الآن» في 0-D، تُلصق في `.env.local` فقط: LINZ LDS، Oracle Cloud (Always Free) + Cloudflare، Groq، GitHub token، Stripe test، و (اختياريًا) Resend، PostHog EU، GlitchTip، Expo. **قبل الإطلاق (مدفوع):** Apple Developer، Google Play Console، RevenueCat، Stripe live، مزوّد SMS (**[OPEN]**)، ومزوّدو الصوت/النماذج المدفوعون (احتياط اختياري).
3. أجهزة اختبار حقيقية للفحوص الموسومة `[FOUNDER-DEVICE]` (غير حاجزة): Android متوسط ومنخفض، iPhone عند توفر حساب Apple، سماعات السائق، بلوتوث سيارة.
4. 200+ تسجيل صوتي لعناوين Canterbury حقيقية (بموافقة) + عينات أوامر لكل لغة ذات أولوية، وقائمة اللغات ذات الأولوية بالترتيب.
5. سائقون للـ beta والـ ride-alongs الشهرية في Christchurch.
6. قرارات مفتوحة (غير حاجزة): نقاط الأسعار ونموذج الهامش بعد التحقق من التكاليف، مزوّد SMS، المكالمات المقنّعة، مراجعة غير متزامنة للهوية البصرية و tokens ومواصفات الشاشات وواجهة الصوت (الوكلاء يعملون بنسخ `provisional`)، وقبول مخاطر ToS لـ sandbox (ADR).
7. مراجعة قانونية: PIA، سياسة الخصوصية، قائمة المعالجين ومناطقهم، شروط المزوّدين (no-training / zero-retention)، تأكيد رخصة Silero، نصوص تسويق متوافقة مع Rule 7.3A.
8. مراجعون لترجمات الواجهة لإزالة وسم `needs_review`.
9. لا موافقة على كل PR (D10). المؤسس يستلم التطبيق كاملًا ويدخل فترة الاختبار الميداني.

**ابدأ الآن بالقسم 0-E (بدء الجلسة)، ثم القسم 1، واستمر حتى نهاية القسم 12 (Phase F والتسليم) دون توقف؛ ما يحتاج المؤسس يُسجَّل حسب 0-A.6 ويستمر العمل.**
