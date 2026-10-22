# الأدوات والمستودعات — بحث موسّع (أكتوبر 2026)

> **صراحة عن مستوى التحقق:** المصادر مقالات مقارنة وصفحات مشاريع، وكثير منها كتبه منافسون. أعداد النجوم متضاربة بين المصادر.
> **قبل التثبيت:** افتح كل مستودع وتأكد من آخر commit، الرخصة، وأنه ما زال مُصانًا. البنود المعلّمة ⚠️ فيها تحذير مهم.

---

## 0. القرار الأهم: كيف نبني؟

**لا ننصح ببناء هذا المنتج من «برومبت واحد».** أدوات توليد التطبيق الكامل (القسم 6) ممتازة لنموذج أولي للعرض خلال يوم، لكنها:
- تولّد تطبيقات ويب غالبًا، وليس تطبيقات هاتف أصلية بصوت في الخلفية وكاميرا حية وGPS.
- لا تبني الأجزاء الصعبة التي هي قيمتنا الحقيقية: الصوت بدون إنترنت، الذاكرة المكانية، قواعد السائق.

**الطريقة الاحترافية:** قالب إنتاجي جاهز (القسم 1) + Claude Code مع Skills ووكلاء فرعيين (القسم 7) + بناء الأجزاء الفريدة يدويًا بعناية.

---

## 1. أساس التطبيق (الهاتف)

| الدور | المستودع | الحالة |
|---|---|---|
| **قالب البداية** | `obytes/react-native-template-obytes` | Expo Router + NativeWind + Zustand + React Query + Zod، بيئات إنتاج/معاينة/تطوير جاهزة، MIT، ~4.2k نجمة |
| بديل القالب | `infinitered/ignite` | الأشهر (~19.8k نجمة)، مولّدات كود، فريق تجاري يصونه |
| الإطار | `expo/expo` | SDK الحديث، EAS للبناء والنشر على المتاجر |
| الخرائط | `maplibre/maplibre-react-native` | مجاني، خرائط دون اتصال |
| الكاميرا | `mrousavy/react-native-vision-camera` | frame processors للمسح الحي |
| الحركة | `software-mansion/react-native-reanimated` (v4) | الافتراضي للحركة على UI thread |
| رسومات 2D/مؤثرات | `Shopify/react-native-skia` | مدعوم رسميًا في Expo، shaders وتأثيرات راقية |
| Bottom sheet | `gorhom/react-native-bottom-sheet` | نفس إحساس Spoke |
| القوائم | `Shopify/flash-list` | 300 محطة بسلاسة |
| التخزين المحلي | `OP-Engineering/op-sqlite` أو `Nozbe/WatermelonDB` | Offline-first |
| الموقع بالخلفية | `transistorsoft/react-native-background-geolocation` | ⚠️ مدفوع للإنتاج على Android |
| أنيميشن جاهزة | Lottie (`lottie-react-native`) و Rive (`rive-react-native`) | لمؤشر «المساعد يسمع» وحركات النجاح |

### واجهات 3D
- ⚠️ `pmndrs/native` (react-three-fiber للهاتف) — المستودع نفسه يقول **«لا تستخدمه بعد، غير مستقر»**.
- **توصيتنا:** لا 3D حقيقي في تطبيق السائق (يستهلك البطارية ويشتت). نستخدم **Skia + Reanimated** لعمق بصري (ظلال، ضبابية، حركة سلسة) — يعطي إحساسًا «فاخرًا» بدون تكلفة.
- 3D مكانه **موقع التسويق** (ويب): `pmndrs/react-three-fiber` + `pmndrs/drei` أو Spline — شاحنة ثلاثية الأبعاد وخريطة كرايستشرش تتحرك.

---

## 2. الصوت (قلب المنتج)

| الدور | المستودع / الخدمة | ملاحظة |
|---|---|---|
| **صوت على الجهاز (STT متدفق + VAD + كلمات مفتاحية + TTS)** | `k2-fsa/sherpa-onnx` + **`XDcobra/react-native-sherpa-onnx`** | الغلاف للـ React Native: Android 24+ / iOS 13+، يدعم Zipformer وWhisper وMoonshine، تسريع Core ML/NNAPI. ⚠️ v0.3 كسرت الـ API — ثبّت الإصدار |
| Whisper على الجهاز (احتياط) | `mybigday/whisper.rn` (فوق `ggml-org/whisper.cpp`) | Core ML على iOS |
| كشف الكلام | `snakers4/silero-vad` | مدمج أيضًا في sherpa-onnx |
| كلمة التنبيه | `Picovoice/porcupine` | ⚠️ مدفوع تجاريًا. البديل المجاني: keyword spotting في sherpa-onnx |
| STT سحابي للإملاء الطويل | Deepgram (`en-NZ` + keyword boosting) | أفضل دقة للعناوين |
| TTS سريع | Cartesia Sonic / ElevenLabs Flash؛ احتياط TTS الجهاز | |
| **إطار المحادثة الصوتية الحية (الخادم)** | **`pipecat-ai/pipecat`** | Python، BSD-2، الأكثر تكاملات وتطويرًا (~13.4k نجمة يوليو 2026) |
| البديل | `livekit/agents` | Apache 2.0، كشف نهاية الكلام والمقاطعة وإلغاء الضجيج مدمجة (~11.4k نجمة) |
| ⚠️ تجنّب | TEN Framework | شروطه تمنع التشغيل على أجهزة المستخدمين |

**«مساعد مثل Grok / ChatGPT Voice»:** هذا بالضبط ما يبنيه Pipecat/LiveKit: صوت متدفق ثنائي الاتجاه، مقاطعة، أدوات (tools). الفرق عندنا: الأوامر السريعة محلية على الهاتف، والمحادثة الذكية عبر Pipecat.

---

## 3. الخادم والذكاء

| الدور | المستودع |
|---|---|
| API | `fastapi/fastapi` (موجود) |
| تنسيق الوكلاء | `langchain-ai/langgraph` (موجود) |
| **بوابة النماذج (تبديل النموذج بسطر واحد + احتياط تلقائي)** | `BerriAI/litellm` ⚠️ تحقق من الرخصة (مصادر تقول MIT وأخرى BSL) — البديل `Portkey-AI/gateway` |
| قاعدة البيانات | PostgreSQL + `postgis/postgis` + `pgvector/pgvector` |
| الطرق | `valhalla/valhalla` |
| ترتيب المحطات | `VROOM-Project/vroom` + `google/or-tools` |
| العناوين | بيانات LINZ الرسمية + `pelias/pelias` |
| المراقبة | `getsentry/sentry` + `PostHog/posthog` + Langfuse (`langfuse/langfuse`) لتتبّع كل نداء ذكاء اصطناعي وتكلفته |

### النماذج
عبر بوابة النماذج نستطيع استخدام أي نموذج ونبدّل بينها بدون تغيير الكود:
- **Claude:** Haiku 5.5 للحلقة الصوتية السريعة، Sonnet 5.5 للمراجعة والقواعد، Opus 5.5 / Fable 5.1 للمهام الصعبة (مثل تحليل صور الملصقات التالفة).
- **نماذج أخرى (GPT، Grok، Gemini):** تُضاف عبر نفس البوابة إن أردنا مقارنة الجودة والسعر. **القرار يُبنى على اختبار حقيقي** بتسجيلات السائق، لا على الاسم.

---

## 4. توفير التوكنز (التكلفة)

| الأداة | ماذا تفعل |
|---|---|
| **التصميم نفسه** | 80% من أوامر السائق تُفهم على الهاتف بدون أي نموذج = أكبر توفير ممكن |
| Prompt caching (Claude) | البرومبت الثابت للمساعد يُخزّن، تكلفة أقل بكثير لكل نداء |
| `yamadashy/repomix` | يحزم المستودع لملف واحد للذكاء الاصطناعي، مع خادم MCP وفحص أسرار — مفيد أثناء التطوير |
| Headroom / LeanCTX / Compresr | بروكسي يضغط السياق لأدوات البرمجة (Claude Code). ⚠️ نسب التوفير (60–95%) من أصحابها — اختبرها بنفسك |

> ⚠️ **تجنّب أي مستودع يَعِد بـ«توكنز مجانية» عبر مفاتيح API مسرّبة أو حسابات مشتركة** — مخالف لشروط المزوّدين، يُغلق الحساب، وخطر أمني على المنتج. المجاني المشروع: الحصص المجانية الرسمية، والنماذج المحلية (Ollama) للتجربة.

---

## 5. لوحة الويب و SaaS (للمقاول والشركات لاحقًا)

| الخيار | المستودع | ملاحظة |
|---|---|---|
| مجاني رسمي | `nextjs/saas-starter` | Next.js + Postgres + Drizzle + Stripe + shadcn/ui، MIT. بسيط وجيد كبداية |
| مفتوح أقوى | `ixartz/SaaS-Boilerplate` | يوصف بأقوى خيار مفتوح؛ بعض الميزات في نسخة مدفوعة |
| مع Supabase | MakerKit Lite (مجاني) / Supastarter (مدفوع) | |
| بديل Wasp | `wasp-lang/open-saas` | إطار مختلف |
| واجهات | `shadcn-ui/ui` + `motiondivision/motion` (Framer Motion) | تصميم احترافي غير «شكل AI» |
| الدفع | Stripe Billing (الاشتراكات الشهرية، NZD) | |

---

## 6. أدوات «بناء تطبيق كامل من برومبت»

| الأداة | مفتوح؟ | مناسب لنا؟ |
|---|---|---|
| `stackblitz-labs/bolt.diy` | نعم (MIT، ⚠️ تحذير ترخيص WebContainer تجاريًا) | نموذج ويب سريع للعرض على المستثمرين/السائقين |
| `dyad-sh/dyad` | نعم، تطبيق سطح مكتب محلي | نفس الشيء، بمفتاحك |
| Open Lovable (Firecrawl) | نعم | ينسخ مواقع موجودة — لصفحة التسويق فقط |
| Expo Agent | لا (بيتا خاصة) | يولّد تطبيقات Expo — يستحق الانضمام لقائمة الانتظار |
| RapidNative | لا | يولّد Expo ويصدّر الكود |

**الاستخدام الصحيح عندنا:** نموذج أولي قابل للنقر للشاشات خلال يوم ← نعرضه على صديقك ← ثم نبني الحقيقي بالقالب الإنتاجي.

---

## 7. عقلية الفريق: Claude Code + Skills + وكلاء

| المستودع | الفائدة |
|---|---|
| `anthropics/skills` | الرسمي: مستندات، تصميم، بناء MCP. يُضاف كـ plugin marketplace |
| `ComposioHQ/awesome-claude-skills` | أكبر قائمة مجتمعية مصنّفة |
| `alirezarezvani/claude-skills` | 200+ skill + agents + commands في حزمة واحدة |
| `travisvn/awesome-claude-skills` · `karanb192/awesome-claude-skills` | قوائم منتقاة ومُتحقّقة |

⚠️ Skills المجتمع = كود يعمل على جهازك. **اقرأ كل skill قبل تثبيته**، وثبّت فقط ما نحتاجه فعلًا.

**الـ Skills/الوكلاء التي سنكتبها خصيصًا للمشروع** (في `.claude/` داخل المستودع):
- `nz-address` — قواعد العناوين النيوزيلندية والأسماء الماورية.
- `voice-ux-reviewer` — يراجع أي نص سيقوله المساعد (الطول، الوضوح، لا أسئلة أثناء القيادة).
- `expo-mobile` — معايير الكود في التطبيق (أداء، offline، بطارية).
- `release-checklist` — قبل كل نسخة للسائق.

---

## 8. «التثبيت مرة وحدة» — الحزمة النهائية المقترحة

```bash
# التطبيق
npx create-obytes-app@latest courier-app
npx expo install @maplibre/maplibre-react-native react-native-vision-camera \
  react-native-reanimated @shopify/react-native-skia @gorhom/bottom-sheet \
  @shopify/flash-list @op-engineering/op-sqlite lottie-react-native
npm i react-native-sherpa-onnx   # ثبّت رقم الإصدار بعد الفحص
# الخادم
pip install fastapi langgraph pipecat-ai litellm psycopg langfuse
# البنية (Docker): postgis + pgvector, valhalla, vroom, pelias
```
> هذه قائمة للمراجعة، **لم أشغّلها**. الأسماء الدقيقة للحزم والإصدارات تُؤكَّد يوم البدء.

---

## المصادر
- Pipecat/LiveKit: [FutureAGI](https://futureagi.com/blog/best-voice-ai-frameworks-2026/) · [LiveKit](https://livekit.com/blog/best-open-source-voice-and-video-ai-agent-frameworks) · [techsy](https://techsy.io/en/blog/best-open-source-voice-agent-frameworks)
- sherpa-onnx RN: [GitHub](https://github.com/XDcobra/react-native-sherpa-onnx) · [docs](https://www.mintlify.com/XDcobra/react-native-sherpa-onnx/introduction) · [whisper.rn](https://www.sourcepulse.org/projects/1856658)
- Expo/3D: [Expo Skia](https://docs.expo.dev/versions/latest/sdk/skia.md) · [pmndrs/native](https://github.com/pmndrs/native) · [PkgPulse](https://www.pkgpulse.com/guides/react-native-reanimated-vs-moti-vs-skia-animation-2026)
- قوالب: [Obytes](https://starterindex.com/boilerplate/react-native-template-obytes) · [مقارنة 2026](https://vp0.com/blogs/best-boilerplate-for-react-native-expo-2026) · [AdminLTE](https://adminlte.io/blog/react-native-templates/)
- SaaS: [MakerKit](https://makerkit.dev/blog/saas/best-nextjs-saas-boilerplate) · [BigIdeasDB](https://bigideasdb.com/best-nextjs-saas-boilerplates-2026)
- بناء من برومبت: [bolt.diy](https://aiidelist.com/ide/bolt-diy) · [بدائل Lovable](https://www.rapidevelopers.com/blog/best-free-lovable-alternatives) · [Expo Agent](https://expo.dev/blog/expo-agent-beta.md) · [RapidNative](https://aiidelist.com/ide/rapidnative.md)
- Skills: [Analytics Vidhya](https://www.analyticsvidhya.com/blog/2026/03/github-repositories-to-get-free-claude-code-skills/) · [DesignRevision](https://designrevision.com/blog/awesome-claude-code-skills)
- بوابات النماذج: [Pinggy](https://pinggy.io/blog/best_ai_llm_routers_openrouter_alternatives/) · [PkgPulse](https://www.pkgpulse.com/guides/portkey-vs-litellm-vs-openrouter-llm-gateway-2026) · [llmgateway](https://llmgateway.io/blog/litellm-alternatives)
- التوكنز: [Codepick](https://codepick.dev/en/guides/token-saving-guide/) · [Repomix](https://pyshine.com/Repomix-Pack-Repos-Into-AI-Friendly-Files/) · [GitHub topic](https://github.com/topics/token-optimization)
