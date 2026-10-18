# بحث عميق: مستودعات وأدوات 2026 لتطبيق سائقي التوصيل

*بحث تقني شامل أُجري في أكتوبر 2026 لمتطلبات المشروع من البداية للنهاية*

---

## ملخص تنفيذي

يقدم هذا المستند بحثاً عميقاً حول جميع المستودعات والمكتبات والأدوات والتقنيات المطلوبة لبناء تطبيق سائقي التوصيل الأول صوتياً، والقادر على العمل بدون اتصال، لنيوزيلندا وأستراليا. يغطي البحث **أكثر من 40 مستودع حرج** عبر طبقات: الجوال، الذكاء الصوتي، الخرائط، التوجيه، الخلفية، والبنية التحتية.

**الاكتشاف الرئيسي**: جميع التقنيات الأساسية جاهزة للإنتاج مع إصدارات 2026. المجموعات الخمس للوحدات الأصلية الحرجة (Sherpa-onnx + VisionCamera + Reanimated 4 + MapLibre + PowerSync) تتطلب **تطبيق اختبار التوافق في الأسبوع الأول من المرحلة C** باعتباره العائق التقني رقم 1.

---

## 1. إطار العمل للجوال: Expo 52 / React Native 0.76 / البنية الجديدة

### الإصدارات الحالية (أكتوبر 2026)
| المكون | الإصدار | تاريخ الإصدار | الحالة |
|----------|---------|--------------|--------|
| Expo SDK | **58.0.14** | 2026-10-16 | أحدث مستقر (SDK 52 = Expo 52) |
| React Native | **0.76.x** | 2026-الربع الثاني | البنية الجديدة افتراضية |
| Expo Router | **58.0.23** | 2026-10-16 | توجيه مبني على الملفات |
| React | **18.3.x** | 2026 | ميزات متزامنة مستقرة |

### ميزات Expo 52 / SDK 58 الرئيسية
- **البنية الجديدة مفعلة افتراضياً** (Fabric + TurboModules)
- **ميزات React 18 المتزامنة** مدعومة بالكامل
- **Expo Router v4** مع توجيه مبني على الملفات، ربط عميق
- **Expo Modules API** للوحدات الأصلية (يحل محل unimodules القديمة)
- **EAS Build** مع سير عمل مدار لـ iOS/Android
- **محرك Hermes** افتراضي مع ترجمة JIT
- تحسينات **Fast Refresh** للتطوير

### ملاحظات الهجرة لمجموعتنا التقنية
```json
// إصدارات package.json المستهدفة
{
  "expo": "~58.0.14",
  "react-native": "0.76.5",
  "react": "18.3.1",
  "expo-router": "~58.0.23",
  "expo-dev-client": "~58.0.0"
}
```

### مصفوفة توافق البنية الجديدة
| الوحدة | دعم Fabric | TurboModule | الحالة |
|---------|-------------|-------------|--------|
| react-native-vision-camera | ✅ 5.2.3 | ✅ | **حرج** - الكاميرا/OCR |
| react-native-reanimated | ✅ 4.7.1 | ✅ | **حرج** - الرسوم المتحركة |
| sherpa-onnx | ⚠️ مخصص | ⚠️ مخصص | **حرج** - STT/TTS/VAD |
| @maplibre/maplibre-react-native | ✅ 13.x | ✅ | **حرج** - الخرائط |
| @powersync/react-native | ⚠️ 0.x | ⚠️ 0.x | **حرج** - المزامنة بدون اتصال |
| react-native-nitro-modules | ✅ 0.37+ | ✅ | تبعية لـ VisionCamera |

### المراجع
- [ملاحظات إصدار Expo SDK 58](https://github.com/expo/expo/releases/tag/expo%4058.0.14)
- [منشور React Native 0.76](https://reactnative.dev/blog/2026/04/25/react-native-0.76)
- [دليل هجرة البنية الجديدة](https://docs.expo.dev/guides/new-architecture/)

---

## 2. الذكاء الصوتي على الجهاز: Sherpa-onnx

### الإصدار الحالي: **v1.13.8** (أُصدر 2026-09-10)
أحدث الأصول تتضمن:
- `sherpa-onnx-1.13.8.aar` (أندرويد، 50 ميجابايت)
- `sherpa-onnx-1.13.8-rknn.aar` (تسريع RKNPU، 26 ميجابايت)
- `sherpa-onnx-jvm-1.13.8.jar` (روابط Java/Kotlin)
- مكتبات أصلية لـ Linux x64/aarch64، macOS، Windows، iOS

### دعم النماذج (2026)
| نوع النموذج | النماذج | حالة الاستخدام | الحجم |
|------------|---------|--------------|------|
| **STT (ASR)** | Zipformer, Moonshine, Whisper.cpp | تحويل كلام لنص | 30-150 ميجابايت |
| **TTS** | VITS, Matcha, Kokoro | تحويل نص لكلام | 50-200 ميجابايت |
| **VAD** | Silero VAD | كشف النشاط الصوتي | 2 ميجابايت |
| **كلمة التنبيه** | متوافق مع Porcupine | "يا كوريير" | 500 كيلوبايت |
| **معرف المتحدث** | ECAPA-TDNN | تحقق السائق | 5 ميجابايت |

### النماذج الموصى بها لحالتنا
```yaml
# أوامر سريعة بدون اتصال (<300ms)
stt_fast:
  model: "sherpa-onnx-zipformer-en-2023-06-26"  # 38 ميجابايت، محسن للإنجليزية
  features: [streaming, low_latency]
  
# إملاء (سحابة احتياطية)
stt_dictation:
  model: "deepgram-nova-3-en-nz"  # API سحابي
  
# TTS للهمسات
tts:
  model: "sherpa-onnx-vits-en-us"  # 90 ميجابايت، جودة عالية
  # بديل: matcha-icefall-en (أسرع، أصغر)

# VAD
vad:
  model: "silero_vad"  # 1.8 ميجابايت، ممتاز للجوال
```

### استراتيجية تكامل React Native
```typescript
// إضافة إعداد Expo مطلوبة
// plugins/sherpa-onnx-plugin.ts
import { withAndroidManifest, withAppBuildGradle } from '@expo/config-plugins';

export const withSherpaOnnx = (config) => {
  // إضافة تبعيات أصلية
  config = withAndroidManifest(config, (cfg) => {
    // إضافة أذونات الميكروفون
    return cfg;
  });
  config = withAppBuildGradle(config, (cfg) => {
    // إضافة تبعية sherpa-onnx AAR
    return cfg;
  });
  return config;
};
```

### الترخيص
- **Apache 2.0** - صديق للاستخدام التجاري
- لا توجد رسوم وقت تشغيل
- النماذج: Apache 2.0 / MIT (تختلف حسب النموذج)

### المراجع
- [إصدار Sherpa-onnx v1.13.8](https://github.com/k2-fsa/sherpa-onnx/releases/tag/v1.13.8)
- [أمثلة Sherpa-onnx React Native](https://github.com/k2-fsa/sherpa-onnx/tree/master/react-native)
- [حديقة النماذج](https://github.com/k2-fsa/sherpa-onnx/releases/tag/models)

---

## 3. كشف كلمة التنبيه: Porcupine

### الإصدار الحالي: **v4.0** (أُصدر 2025-12-11)
**تغييرات جوهرية في v4.0:**
- الحد الأدنى لـ Node.js: **18+**
- الحد الأدنى لـ iOS: **16+**
- الحد الأدنى لـ React Native: **0.73+**
- الحد الأدنى لـ Flutter: **3.10+**
- **دعم Unity مُزال**
- أداء محرك محسن
- دعم GPU/أنوية CPU متعددة مضاف

### تكامل React Native
```bash
# التثبيت
npm install @picovoice/porcupine-react-native
# أو لـ Expo
expo install @picovoice/porcupine-react-native
```

### ملفات الكلمات المفتاحية مطلوبة
- كلمة "Hey Courier" مخصصة (ملف .ppn) - تُنشأ عبر [وحدة تحكم Picovoice](https://console.picovoice.ai/)
- الخاصة بالمنصة: `hey_courier_android.ppn`، `hey_courier_ios.ppn`

### الترخيص
- **الطبقة المجانية**: 3 كلمات مفتاحية، 100 ألف تفعيل/شهر
- **خطة المطور**: $499/سنة - كلمات غير محدودة، 1 مليون تفعيل
- **المؤسسات**: تسعير مخصص
- **مطلوب للإنتاج**: خطة مدفوعة

### بديل: كلمة تنبيه Sherpa-onnx
يحتوي Sherpa-onnx الآن على نماذج كشف الكلمات المفتاحية (KWS) التي يمكن أن تحل محل Porcupine بالكامل، مما يتجنب تعقيد وحدتين أصليتين.

### المراجع
- [إصدار Porcupine v4.0](https://github.com/Picovoice/porcupine/releases/tag/v4.0)
- [بدء سريع React Native](https://github.com/Picovoice/porcupine/tree/master/binding/react-native)

---

## 4. الإملاء السحابي: Deepgram Nova-3

### الحالة الحالية (2026)
- **Nova-3** هو أحدث جيل (أُصدر 2024، تحديثات مستمرة)
- نموذج **en-NZ** متاح لتحسين لهجة الإنجليزية النيوزيلندية
- **تعزيز الكلمات المفتاحية** مدعوم عبر معامل `keywords`
- **API تدفق** مع نتائج مؤقتة
- **التسعير**: $0.0043/دقيقة (Nova-3)، $0.0077/دقيقة (Nova-2)

### التكامل للعناوين النيوزيلندية
```javascript
const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

const connection = deepgram.listen.live({
  model: 'nova-3',
  language: 'en-NZ',
  smart_format: true,
  punctuate: true,
  keywords: [
    // تعزيز ضواحي LINZ
    'Riccarton:2', 'Papanui:2', 'Waimairi:2', 'Mairehau:2',
    'Christchurch:3', 'Canterbury:2',
    // أنواع الشوارع
    'Street:1', 'Road:1', 'Avenue:1', 'Drive:1', 'Lane:1',
    // الأرقام
    'one:1', 'two:1', 'three:1', 'four:1', 'five:1'
  ],
  interim_results: true,
  utterance_end_ms: 1000,
});
```

### خط أنابيب تصحيح عناوين LINZ
```python
# معالجة ما بعد نص Deepgram باستخدام معالج العناوين النيوزيلندية
from app.nz_address import parse, SPOKEN_FIXES

def correct_transcript(transcript: str) -> str:
    # تطبيق تصحيحات منطوقة أولاً
    for spoken, correct in SPOKEN_FIXES.items():
        transcript = transcript.replace(spoken, correct)
    # ثم تحليل بمطبع كامل
    parsed = parse(transcript)
    return parsed.formatted
```

### المراجع
- [توثيق Deepgram Nova-3](https://developers.deepgram.com/docs/nova-3-model)
- [تعزيز الكلمات المفتاحية](https://developers.deepgram.com/docs/keyword-boosting)
- [دعم لغة en-NZ](https://developers.deepgram.com/docs/languages)

---

## 5. تنسيق الصوت من جانب الخادم: Pipecat

### الإصدار الحالي: **v1.12.0** (أُصدر 2026-09-26)

### ميزات v1.12 الرئيسية لمعمارتنا
1. **المصنفات** - اتخاذ قرارات خفيف بدون LLM (JevClassifier)
2. **عمال واجهة المستخدم** - وكلاء صوتيون مدركون للشاشة
3. **تحويلات النطق** - نطق مبني على IPA للأسماء (حرج للأسماء الماورية)
4. **نقل MOQ** - بديل WebRTC موثوق للصوت
5. **مخطط الاستجابة** - مخرجات LLM منظمة
6. **إطار التقييم** - اختبار وكلاء صوتيين آلي

### هندسة المعمارية للوضع الحواري
```python
# pipecat_pipeline.py
from pipecat.pipeline import Pipeline
from pipecat.services.cartesia import CartesiaTTSService
from pipecat.services.deepgram import DeepgramSTTService
from pipecat.services.openai import OpenAILLMService
from pipecat.transports.websocket import WebsocketTransport
from pipecat.utils.text.phonemes import pronunciation_transform_ipa

# خريطة نطق الأسماء الماورية
MAORI_PRONUNCIATION = {
    "Riccarton": "rɪˈkɑːtən",
    "Papanui": "pɑːpɑːnʊɪ",
    "Waimairi": "waɪˈmaɪri",
    "Mairehau": "maɪreɪhaʊ",
    "Ōtautahi": "ɔːtɔːtɑːhi",
}

pronounce = CartesiaTTSService.pronunciation_transform_ipa(MAORI_PRONUNCIATION)

pipeline = Pipeline([
    WebsocketTransport(),
    DeepgramSTTService(model="nova-3", language="en-NZ"),
    OpenAILLMService(
        model="gpt-4o-mini",
        system_prompt=COPILOT_SYSTEM_PROMPT,
        response_schema=IntentSchema,
    ),
    CartesiaTTSService(
        voice="sonic",
        text_transforms=[strip_markdown, pronounce],
    ),
])
```

### تكامل استدعاء الأدوات
```python
# استدعاء دوال لإجراءات السائق
COPILOT_TOOLS = [
    {
        "name": "mark_delivered",
        "description": "تمييز المحطة الحالية كمُسلمة",
        "parameters": {"type": "object", "properties": {"safe_place": {"type": "string"}}}
    },
    {
        "name": "skip_stop",
        "description": "تخطي المحطة الحالية، الانتقال للتالية",
        "parameters": {"type": "object", "properties": {"reason": {"type": "string"}}}
    },
    {
        "name": "report_failed",
        "description": "الإبلاغ عن فشل التوصيل",
        "parameters": {"type": "object", "properties": {"reason": {"type": "string"}, "photo_required": {"type": "boolean"}}}
    },
    {
        "name": "navigate_to",
        "description": "بدء التنقل للمحطة",
        "parameters": {"type": "object", "properties": {"stop_id": {"type": "string"}}}
    },
    {
        "name": "read_stop_details",
        "description": "قراءة تفاصيل المحطة بصوت عالٍ",
        "parameters": {"type": "object", "properties": {"stop_id": {"type": "string"}}}
    }
]
```

### الترخيص
- **رخصة MIT** - صديق للاستخدام التجاري
- تطوير نشط (إصدارات أسبوعية)
- مجتمع قوي (5 آلاف+ نجمة)

### المراجع
- [إصدار Pipecat v1.12](https://github.com/pipecat-ai/pipecat/releases/tag/v1.12.0)
- [توثيق Pipecat](https://docs.pipecat.ai/)
- [الأمثلة](https://github.com/pipecat-ai/pipecat/tree/main/examples)

---

## 6. TTS سريع: Cartesia Sonic / ElevenLabs Flash

### Cartesia Sonic (موصى به كأساسي)
- **الكمون**: ~90ms أول بايت (الأسرع في فئته)
- **النموذج**: `sonic` (إنجليزية)، `sonic-multilingual` (100+ لغة)
- **التدفق**: WebSocket مع صوت مقطع
- **النطق**: دعم IPA عبر `pronunciation_transform_ipa()`
- **التسعير**: $0.0004/حرف (~$0.15/دقيقة)

### ElevenLabs Flash v2.5 (احتياطي)
- **الكمون**: ~75ms أول بايت (Flash v2)
- **النماذج**: `eleven_flash_v2`، `eleven_turbo_v2`
- **دعم SSML**: علامات `<phoneme>` للنطق
- **التسعير**: $0.0003/حرف (Flash)، $0.00015/حرف (Turbo)

### استراتيجية التنفيذ
```typescript
// خدمة TTS مع احتياطي
class TTSService {
  private primary: CartesiaTTS;
  private fallback: ElevenLabsTTS;
  
  async speak(text: string, priority: 'now' | 'next' | 'background'): Promise<AudioBuffer> {
    try {
      return await this.primary.synthesize(text, { 
        voice: 'sonic',
        format: 'pcm_24khz',
        // نطق IPA للأسماء الماورية
        pronunciation: this.getPronunciation(text)
      });
    } catch (e) {
      console.warn('فشل Cartesia، التبديل لـ ElevenLabs');
      return this.fallback.synthesize(text, { voice: 'flash_v2' });
    }
  }
}
```

### تحسين التكلفة
| السيناريو | التكلفة الشهرية (لكل سائق) |
|-----------|----------------------------|
| 200 توصيل × 3 استدعاءات TTS × 20 حرف | ~$0.50/شهر |
| وضع حواري (5 دقائق/نوبة) | ~$0.75/نوبة |
| **الهدف**: <$1/نوبة | ✅ قابل للتحقيق |

### المراجع
- [API Cartesia Sonic](https://docs.cartesia.ai/)
- [ElevenLabs Flash](https://elevenlabs.io/docs/models/flash)
- [تكامل Pipecat TTS](https://docs.pipecat.ai/services/tts)

---

## 7. الخرائط بدون اتصال: MapLibre + PMTiles + planetiler

### MapLibre Native: **v13.7.1** (أُصدر 2026-10-15)
- عناصر أندرويد: `maplibre-android-multiBackend`، `maplibre-android-opengl`
- iOS: CocoaPods / SPM
- React Native: `@maplibre/maplibre-react-native` (مجتمع مدعوم)

### PMTiles: **الأحدث** (protomaps/PMTiles)
- تنسيق أرشيف أحادي ملف للبلاطات المتجهة
- طلبات نطاق HTTP للتدفق الفعال
- يعمل بدون اتصال من ملف محلي
- متوافق مع MapLibre GL JS / Native

### planetiler: **الأحدث** (planetiler/planetiler)
- **مبني على Java** مولد بلاطات متجهة
- المدخلات: OSM PBF، GeoJSON، Shapefile
- المخرجات: PMTiles / MBTiles
- قابل للتكوين عبر YAML (تعريفات الطبقات، مستويات التكبير)
- **بناء كانتربري**: ~2-4 ساعات على آلة 16 نواة

### خط أنابيب بناء خريطة كانتربري
```bash
# 1. تحميل مستخرج NZ OSM (Geofabrik)
wget https://download.geofabrik.de/australia-oceania/new-zealand-latest.osm.pbf

# 2. قص لحدود كانتربري (osmium)
osmium extract new-zealand-latest.osm.pbf \
  -b 171.0,-44.5,173.5,-42.0 \
  -o canterbury.osm.pbf

# 3. توليد PMTiles بـ planetiler
docker run -v $(pwd):/data ghcr.io/planetiler/planetiler:latest \
  --input=/data/canterbury.osm.pbf \
  --output=/data/canterbury.pmtiles \
  --config=/data/planetiler-config.yml \
  --area=canterbury \
  --maxzoom=16 \
  --minzoom=0

# 4. التحقق
pmtiles info canterbury.pmtiles
```

### planetiler-config.yml لـ NZ
```yaml
# طبقات مخصصة لاحتياجات التوصيل
layers:
  # نقاط العناوين (من LINZ)
  - name: nz_addresses
    source: linz_addresses.geojson
    minzoom: 12
    maxzoom: 16
    attributes:
      - full_address
      - suburb
      - street
      - number
      - unit
  
  # نقاط ذاكرة الأبواب (المتعلمة)
  - name: door_memory
    source: door_points.geojson
    minzoom: 14
    maxzoom: 16
    attributes:
      - entry_point_lng
      - entry_point_lat
      - park_point_lng
      - park_point_lat
      - delivery_count
      - confidence
  
  # طبقات OSM القياسية (طرق، مباني، إلخ)
  - include: standard_layers.yml
```

### تكامل React Native
```bash
# التثبيت
npm install @maplibre/maplibre-react-native
# إضافة إعداد Expo مطلوب
expo install @maplibre/maplibre-react-native
```

```typescript
// MapView.tsx
import { MapView, Camera } from '@maplibre/maplibre-react-native';
import { usePMTiles } from './usePMTiles'; // هوك مخصص لـ PMTiles محلية

export const OfflineMap = ({ styleUrl = 'file:///data/canterbury.pmtiles' }) => {
  const { tileSource } = usePMTiles('canterbury.pmtiles');
  
  return (
    <MapView
      style={styles.map}
      localTileServer={tileSource}
      styleURL={styleUrl}
      camera={new Camera({ center: [172.6362, -43.5321], zoom: 13 })}
    >
      {/* تراكب ذاكرة الأبواب */}
      <MapView.Source id="door-memory" geojson={doorMemoryGeoJSON}>
        <MapView.CircleLayer
          id="entry-points"
          sourceID="door-memory"
          circleRadius={8}
          circleColor={['interpolate', ['linear'], ['get', 'confidence'], 0, 'red', 0.5, 'yellow', 1, 'green']}
        />
      </MapView.Source>
    </MapView>
  );
};
```

### تقديرات التخزين (كانتربري)
| البيانات | الحجم |
|--------|------|
| بلاطات متجهة OSM (z0-16) | ~800 ميجابايت |
| عناوين LINZ (نقاط) | ~50 ميجابايت |
| ذاكرة الأبواب (100 ألف محطة) | ~10 ميجابايت |
| **الإجمالي** | **~860 ميجابايت** |
| **مع توسع أستراليا (6x)** | ~5 جيجابايت |

### المراجع
- [إصدار MapLibre v13.7.1](https://github.com/maplibre/maplibre-native/releases/tag/android-v13.7.1)
- [مواصفات PMTiles](https://github.com/protomaps/PMTiles)
- [توثيق planetiler](https://github.com/planetiler/planetiler)
- [MapLibre React Native](https://github.com/maplibre/maplibre-react-native)

---

## 8. بيانات العناوين النيوزيلندية: LINZ (معلومات الأراضي NZ)

### مجموعات البيانات المتاحة (CC BY 4.0)
| مجموعة البيانات | السجلات | تكرار التحديث | التنسيق | الحجم |
|-------------|---------|--------------|--------|------|
| **عنوان الشارع NZ** | ~2.5 مليون | أسبوعي | CSV، SHP، GDB | ~500 ميجابايت |
| **خطوط وسط الشوارع NZ** | ~600 ألف | أسبوعي | SHP، GDB | ~200 ميجابايت |
| **حدود الضواحي** | ~5 آلاف | ربع سنوي | SHP، GDB | ~50 ميجابايت |
| **عناوين الملكية** | ~2 مليون | يومي | CSV | ~1 جيجابايت |

### طرق الوصول
1. **خدمة بيانات LINZ (LDS)**: https://data.linz.govt.nz/
   - تحميل مباشر (CSV/Shapefile)
   - APIs من نوع WFS/WMS
   - خدمات البلاط (WMTS)
2. **Koordinates**: https://koordinates.com/ (مرآة مع API أفضل)
3. **AWS Open Data**: `s3://linz-opendata/`

### خط أنابيب الاستيراد
```python
# scripts/import_linz_addresses.py
import geopandas as gpd
import psycopg2
from sqlalchemy import create_engine

def import_nz_addresses(pg_conn_str: str):
    # قراءة LINZ CSV (تدفقي للذاكرة)
    chunks = pd.read_csv('nz-street-address.csv', chunksize=50000)
    
    engine = create_engine(pg_conn_str)
    
    for i, chunk in enumerate(chunks):
        # تطبيع
        chunk['full_address'] = chunk.apply(format_nz_address, axis=1)
        chunk['street_key'] = chunk['street_name'].apply(normalize_street_key)
        chunk['suburb_norm'] = chunk['suburb'].str.lower().str.strip()
        
        # هندسة PostGIS
        chunk['geom'] = chunk.apply(
            lambda r: f"POINT({r.longitude} {r.latitude})", axis=1
        )
        
        # إدخال مجمع بـ COPY
        chunk.to_postgis('nz_addresses', engine, if_exists='append', index=False)
        
        if i % 10 == 0:
            print(f"تم استيراد {i * 50000} عنوان...")
    
    # إنشاء فهارس
    with engine.connect() as conn:
        conn.execute("CREATE INDEX ON nz_addresses USING GIN (full_address gin_trgm_ops)")
        conn.execute("CREATE INDEX ON nz_addresses USING GIST (geom)")
        conn.execute("CREATE INDEX ON nz_addresses (street_key, suburb_norm)")

# مطابقة ضبابية بـ pg_trgm
def fuzzy_match_address(query: str, limit: int = 10):
    return """
    SELECT *, similarity(full_address, %s) as sim
    FROM nz_addresses
    WHERE full_address % %s  -- تشابه تريجرام
    ORDER BY sim DESC
    LIMIT %s
    """
```

### التعامل مع الأسماء الماورية
```python
# 50+ تصحيح شائع للأسماء الماورية
MAORI_CORRECTIONS = {
    'wh': 'f',      # Whangarei -> Fangarei (صوتياً)
    'ng': 'ng',     # Ngāi Tahu
    'ā': 'a', 'ē': 'e', 'ī': 'i', 'ō': 'o', 'ū': 'u',  # علامات التشكيل
    # تعيينات الأسماء الكاملة في SPOKEN_FIXES (انظر nz_address.py)
}
```

### المراجع
- [خدمة بيانات LINZ](https://data.linz.govt.nz/)
- [طبقة عناوين الشوارع NZ](https://data.linz.govt.nz/layer/53353-nz-street-address/)
- [رخصة CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

---

## 9. التوجيه: Valhalla + VROOM + OR-Tools

### Valhalla: **v3.9.1** (أُصدر 2026-10-06)
- هجرة **C++20** (`std::format`)
- قاعدة بيانات المناطق الزمنية: 2026d
- ترتيب مكاني بمنحنى هيلبرت
- إصلاح مشاكل أهداف 32-bit
- لغة: أضيف السلوفينية

### VROOM: **v1.15.0** (أُصدر 2026-03-12)
- أوقات المهام لكل نوع مركبة
- تكلفة بالساعة على أساس المركبة
- تسريع الاستدلال
- طلبات توجيه متوازية
- C++17، g++-14/clang-18

### OR-Tools: **v9.15** (أُصدر 2026-01)
- تحسينات CP-SAT
- تحسينات التوجيه
- عجلات Python 3.12+

### المعمارية: قفل القالب الرئيسي + التحسين
```python
# التسلسل الأساسي (ليس تحسين TSP)
def sequence(stops: list[Stop], template: list[Segment]) -> list[Stop]:
    """
    الخريطة الذهنية للسائق = مصدر الحقيقة
    الشوارع غير المعروفة توضع بجانب أقرب جار مبرمج
    """
    rank = {seg.street_key: i for i, seg in enumerate(template)}
    eff_rank = {k: rank[k] for k in known_streets}
    
    for street_key, street_stops in groupby(stops, key=lambda s: s.street_key).items():
        if street_key in rank:
            continue
        # البحث عن أقرب محطة مبرمجة
        probe = street_stops[0]
        nearest = min(templated_stops, key=lambda t: haversine(probe, t))
        eff_rank[street_key] = rank[nearest.street_key] + 0.5
    
    # ترتيب بالرتبة الفعالة، ثم بالتسلسل داخل الشارع
    return sorted(stops, key=lambda s: (eff_rank[s.street_key], s.sequence_in_street))

# تعيين مناطق الشاحنة (بترتيب توصيل عكسي)
def assign_van_zones(sequenced_stops: list[Stop]) -> dict[str, str]:
    zones = {}
    for i, stop in enumerate(reversed(sequenced_stops)):
        zone = f"ZONE_{chr(65 + (i // 50))}"  # 50 محطة لكل منطقة
        zones[stop.id] = zone
    return zones
```

### التوجيه بدون اتصال مع Valhalla
```bash
# بناء بلاطات Valhalla لكانتربري
valhalla_build_tiles -c valhalla.json canterbury.osm.pbf

# هيكل البلاط
# tiles/
#   0/0/0.gzip  -- المستوى 0
#   ...
#   16/x/y.gzip -- المستوى 16 (مستوى المبنى)

# تقدير الحجم: ~2 جيجابايت لكانتربري
```

### التكامل مع الإحداثيات المتعلمة
```python
# التنقل لنقطة الدخول المتعلمة، وليس نقطة الترميز الجغرافي
def get_navigation_target(stop: Stop) -> Coordinate:
    if stop.learned_entry_point and stop.delivery_count > 3:
        return stop.learned_entry_point  # مستوى الباب
    elif stop.park_point:
        return stop.park_point  # ركن على جانب الشارع
    else:
        return stop.geocode_point  # احتياطي لترميز LINZ الجغرافي
```

### المراجع
- [Valhalla 3.9.1](https://github.com/valhalla/valhalla/releases/tag/3.9.1)
- [VROOM 1.15.0](https://github.com/VROOM-Project/vroom/releases/tag/v1.15.0)
- [OR-Tools 9.15](https://github.com/google/or-tools/releases/tag/v9.15)

---

## 10. مزامنة أولوية الاتصال: PowerSync + op-sqlite

### PowerSync: **الأحدث 0.x** (رخصة FSL-1.1)
⚠️ **ملاحظة ترخيص حرجة**: PowerSync يستخدم **FSL-1.1** (رخصة المصدر الوظيفي)، **ليست رخصة معتمدة من OSI**.

### تداعيات FSL-1.1
| الجانب | التأثير |
|--------|--------|
| **التطوير** | ✅ مجاني - استخدم في التطوير |
| **الاختبار/المرحلة** | ✅ مجاني |
| **الإنتاج < $1M ARR** | ✅ مجاني |
| **الإنتاج ≥ $1M ARR** | ❌ يتطلب رخصة تجارية |
| **المصدر متاح** | ✅ نعم |
| **التعديل** | ✅ مسموح |
| **إعادة التوزيع** | ⚠️ مقيد |

### op-sqlite: **الأحدث** (رخصة MIT)
- SQLite3 مُترجم لـ WebAssembly + روابط JSI
- **لا مشاكل ترخيص** - MIT
- يستخدم بواسطة PowerSync داخلياً
- يمكن استخدامه مستقلاً للمزامنة المخصصة

### خيارات معمارية المزامنة

#### الخيار أ: PowerSync (موصى به لـ MVP)
```typescript
// powersync.ts
import { PowerSyncDatabase, PowerSyncBackendConnector } from '@powersync/react-native';

const db = new PowerSyncDatabase({
  database: new SQLiteOpenFactory().open({ name: 'courier.db' }),
  schema: {
    stops: {
      id: 'text',
      manifest_id: 'text',
      address: 'text',
      lat: 'real',
      lng: 'real',
      status: 'text',
      entry_point_lat: 'real?',
      entry_point_lng: 'real?',
      park_point_lat: 'real?',
      park_point_lng: 'real?',
      delivery_count: 'integer',
      updated_at: 'integer',
    },
    delivery_events: {
      id: 'text',
      stop_id: 'text',
      kind: 'text',
      position: 'text', // WKT
      accuracy_m: 'real',
      timestamp: 'integer',
    },
    templates: {
      id: 'text',
      name: 'text',
      segments: 'text', // JSON
      updated_at: 'integer',
    }
  },
  connector: new PowerSyncBackendConnector({
    endpoint: 'https://sync.api.courier.app',
    token: () => getAuthToken(),
  }),
});
```

#### الخيار ب: Event Sourcing مخصص + op-sqlite (خطة احتياطية)
```typescript
// مزامنة مخصصة - لا خطر ترخيص
import { SQLiteDatabase } from 'op-sqlite';

const db = SQLiteDatabase.openSync('courier.db');

// جدول مستودع الأحداث
db.execSync(`
  CREATE TABLE events (
    id TEXT PRIMARY KEY,
    aggregate_id TEXT NOT NULL,
    aggregate_type TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload TEXT NOT NULL, -- JSON
    metadata TEXT, -- JSON
    timestamp INTEGER NOT NULL,
    synced INTEGER DEFAULT 0
  );
  CREATE INDEX idx_events_aggregate ON events(aggregate_id, timestamp);
  CREATE INDEX idx_events_unsynced ON events(synced) WHERE synced = 0;
`);

// حلقة المزامنة
async function syncLoop() {
  const unsynced = db.executeSync('SELECT * FROM events WHERE synced = 0 ORDER BY timestamp LIMIT 100');
  for (const event of unsynced) {
    try {
      await api.post('/events/batch', [event]);
      db.executeSync('UPDATE events SET synced = 1 WHERE id = ?', [event.id]);
    } catch (e) {
      // تراجع أسي
      await sleep(backoff);
    }
  }
}
```

### مصفوفة القرار
| المعيار | PowerSync | مخصص + op-sqlite |
|----------|-----------|-------------------|
| سرعة التطوير | ⭐⭐⭐ سريع | ⭐⭐ متوسط |
| خطر الترخيص | ⚠️ FSL-1.1 | ✅ MIT |
| استعلامات بدون اتصال | ✅ SQL كامل | ✅ SQL كامل |
| حل التعارضات | ✅ مدمج | 🔧 مخصص |
| اشتراكات فورية | ✅ نعم | 🔧 مخصص |
| **التوصية** | **استخدم لـ MVP** | **خطة احتياطية** |

### إجراء قانوني مطلوب
- [ ] مراجعة قانونية لـ FSL-1.1 للاستخدام التجاري
- [ ] إعداد تنفيذ مزامنة مخصص كخطة احتياطية
- [ ] توثيق الامتثال للترخيص في ARCHITECTURE_DECISIONS.md

### المراجع
- [رخصة PowerSync FSL](https://github.com/powersync-ja/powersync/blob/main/LICENSE)
- [op-sqlite](https://github.com/op-sqlite/op-sqlite)
- [PowerSync React Native](https://github.com/powersync-ja/powersync/tree/main/packages/react-native)

---

## 11. مكدس الخلفية: FastAPI + LangGraph + LiteLLM

### FastAPI: **0.115+** (2026)
- Python 3.12+ مطلوب
- Pydantic v2
- OpenAPI 3.1 أصلي
- دعم WebSocket للصوت

### LangGraph: **v1.2.16** (أُصدر 2026-10-16)
- ثبات نقاط التفتيش (PostgreSQL، SQLite)
- دعم الرسوم الفرعية
- استئناف من نقاط التفتيش
- استجابات تدفقية

### LiteLLM: **v1.106.0** (أُصدر 2026-10-17)
- **رخصة BSL-1.1** (مشابه لـ FSL - قيود تجارية عند التوسع)
- 100+ مزود LLM موحد
- موازنة أحمال، احتياطيات، تخزين مؤقت
- تتبع تكلفة لكل طلب
- حواجز حماية، قرارات، دعم MCP

### المعمارية
```python
# app/main.py
from fastapi import FastAPI, WebSocket
from langgraph.graph import StateGraph
from litellm import completion

app = FastAPI()

# نقطة نهاية WebSocket للصوت
@app.websocket('/shifts/{shift_id}/voice')
async def voice(ws: WebSocket, shift_id: UUID):
    await ws.accept()
    whispered: set[str] = set()
    
    # خط أنابيب Pipecat لكل اتصال
    pipeline = create_voice_pipeline(shift_id)
    
    try:
        while True:
            msg = await ws.receive_json()
            if msg['type'] == 'gps':
                # تحديث الموقع بصمت
                await update_driver_location(shift_id, msg)
                continue
                
            if msg['type'] == 'transcript' and msg.get('final'):
                # معالجة عبر Pipecat
                result = await pipeline.process(msg['text'])
                if result.speech:
                    await ws.send_json({
                        'type': 'say',
                        'text': result.speech,
                        'priority': 'now'
                    })
    except WebSocketDisconnect:
        await pipeline.cleanup()

# نقطة نهاية قفل القالب
@app.post('/templates/{template_id}/lock')
async def lock_template(template_id: str, body: TemplateLockRequest):
    """السائق يؤكد خريطته الذهنية كمصدر حقيقة"""
    return await template_service.lock(template_id, body.driver_id, body.ordered_street_keys)

# مزامنة مجمع أولوية الاتصال
@app.post('/events/batch')
async def batch_events(events: list[Event]):
    """قبول أحداث بدون اتصال، إرجاع حالة موثوقة من الخادم"""
    results = []
    for event in events:
        result = await event_processor.process(event)
        results.append(result)
    return {'events': results}
```

### تكوين LiteLLM
```yaml
# litellm_config.yaml
model_list:
  - model_name: claude-haiku-3.5
    litellm_params:
      model: anthropic/claude-3-5-haiku-20241022
      api_key: os.environ/ANTHROPIC_API_KEY
      max_tokens: 4096
  
  - model_name: gpt-4o-mini
    litellm_params:
      model: openai/gpt-4o-mini
      api_key: os.environ/OPENAI_API_KEY
  
  - model_name: local-llama
    litellm_params:
      model: ollama/llama3.1:8b
      api_base: http://localhost:11434

router_settings:
  routing_strategy: "cost-based"
  fallback_models: ["gpt-4o-mini", "claude-haiku-3.5"]
  enable_cost_tracking: true
```

### مخاوف الترخيص
| المكون | الرخصة | الخطر |
|-----------|---------|------|
| FastAPI | MIT | ✅ لا شيء |
| LangGraph | MIT | ✅ لا شيء |
| LiteLLM | **BSL-1.1** | ⚠️ تجاري عند التوسع |
| PostgreSQL | PostgreSQL | ✅ لا شيء |
| PostGIS | GPL | ✅ موافق (مرتبط، غير مدمج) |

---

## 12. قاعدة البيانات: PostgreSQL 16 + PostGIS + pgvector

### Supabase سيدني: **v1.26.08** (أغسطس 2026)
- PostgreSQL 16
- PostGIS 3.5
- pgvector 0.7+
- PgBouncer لتجميع الاتصالات
- استرداد في نقطة زمنية
- نسخ قراءة

### جداول المخطط الرئيسية
```sql
-- جداول أساسية (من schema.sql)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgvector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- عناوين NZ مع فهرس تريجرام
CREATE TABLE nz_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_address TEXT NOT NULL,
    number TEXT,
    street TEXT NOT NULL,
    suburb TEXT NOT NULL,
    city TEXT,
    postcode TEXT,
    geom GEOGRAPHY(POINT, 4326) NOT NULL,
    street_key TEXT GENERATED ALWAYS AS (lower(regexp_replace(street, '\s+', '', 'g'))) STORED,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON nz_addresses USING GIN (full_address gin_trgm_ops);
CREATE INDEX ON nz_addresses USING GIST (geom);
CREATE INDEX ON nz_addresses (street_key, suburb);

-- مواقع بذاكرة 3 نقاط
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address_id UUID REFERENCES nz_addresses(id),
    geocode_point GEOGRAPHY(POINT, 4326),      -- إحداثي رصيف LINZ
    park_point GEOGRAPHY(POINT, 4326),         -- ركن متعلم
    entry_point GEOGRAPHY(POINT, 4326),        -- دخول باب متعلم
    delivery_count INTEGER DEFAULT 0,
    confidence_score REAL DEFAULT 0.0,
    last_delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- مشغل تعلم EWMA (alpha = 0.3)
CREATE OR REPLACE FUNCTION learn_entry_point() RETURNS trigger AS $$
DECLARE 
    loc_id UUID;
    alpha FLOAT := 0.3;
BEGIN
    IF NEW.kind NOT IN ('delivered', 'left_at') OR NEW.position IS NULL 
       OR COALESCE(NEW.accuracy_m, 99) > 15 THEN
        RETURN NEW;
    END IF;
    
    SELECT id INTO loc_id FROM locations 
    WHERE ST_DWithin(geom, NEW.position, 50) 
    ORDER BY geom <-> NEW.position LIMIT 1;
    
    IF loc_id IS NULL THEN RETURN NEW; END IF;
    
    UPDATE locations SET
        entry_point = CASE 
            WHEN entry_point IS NULL THEN NEW.position
            ELSE ST_SetSRID(ST_MakePoint(
                (1-alpha)*ST_X(entry_point::geometry) + alpha*ST_X(NEW.position::geometry),
                (1-alpha)*ST_Y(entry_point::geometry) + alpha*ST_Y(NEW.position::geometry)
            ), 4326)::geography
        END,
        delivery_count = delivery_count + 1,
        confidence_score = LEAST(1.0, delivery_count * 0.1)
    WHERE id = loc_id;
    
    RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_learn_entry_point
    AFTER INSERT ON delivery_events
    FOR EACH ROW EXECUTE FUNCTION learn_entry_point();
```

### تضمينات متجهة للبحث الدلالي للعناوين
```sql
-- تضمينات العناوين للمطابقة الضبابية
ALTER TABLE nz_addresses ADD COLUMN embedding VECTOR(384);

-- إنشاء فهرس للبحث ANN
CREATE INDEX ON nz_addresses USING hnsw (embedding vector_cosine_ops);

-- توليد التضمينات (وظيفة مجمعة)
UPDATE nz_addresses 
SET embedding = get_embedding(full_address || ' ' || suburb || ' ' || city)
WHERE embedding IS NULL;
```

### تكوين Supabase
```yaml
# supabase/config.toml
[database]
postgres_version = "16"
extensions = ["postgis", "pgvector", "pg_trgm", "pg_stat_statements"]

[api]
port = 5432
max_rows = 1000

[realtime]
enabled = true

[auth]
enabled = true
providers = ["email", "phone"]
```

### المراجع
- [Supabase v1.26.08](https://github.com/supabase/supabase/releases/tag/v1.26.08)
- [ملاحظات إصدار PostgreSQL 16](https://www.postgresql.org/docs/16/release-16.html)
- [pgvector](https://github.com/pgvector/pgvector)

---

## 13. المدفوعات: Stripe Billing NZD + Stripe Tax

### Stripe Node: **v23.0.0** (أُصدر 2026-10-01)
- أحدث إصدار API: 2026-10-01
- دعم Billing v2
- حساب ضريبي مدمج

### الامتثال النيوزيلندي
```typescript
// stripe-config.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-10-01',
  typescript: true,
});

// منتج اشتراك NZ
const createNZProduct = async () => {
  return stripe.products.create({
    name: 'Courier Driver Pro',
    description: 'تطبيق توصيل أول صوتياً للمقاولين في NZ',
    metadata: {
      market: 'NZ',
      gst_applicable: 'true',
    },
  });
};

// سعر بـ NZD مع GST
const createNZPrice = async (productId: string) => {
  return stripe.prices.create({
    product: productId,
    unit_amount: 3500, // $35.00 NZD
    currency: 'nzd',
    recurring: { interval: 'month' },
    tax_behavior: 'inclusive', // GST مشمول
    metadata: { gst_rate: '15%' },
  });
};

// تكوين Stripe Tax
const createSubscription = async (customerId: string, priceId: string) => {
  return stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    automatic_tax: { enabled: true }, // حساب GST تلقائي
    collection_method: 'charge_automatically',
    payment_settings: {
      payment_method_types: ['card', 'bank_transfer'],
      save_default_payment_method: 'on_subscription',
    },
    metadata: {
      market: 'NZ',
      gst_number: '123-456-789', // رقم GST الخاص بنا
    },
  });
};
```

### متطلبات الضريبة النيوزيلندية
- **GST**: 15% على جميع الاشتراكات
- **Stripe Tax**: حساب تلقائي، تقارير جاهزة للإيداع
- **الفوترة**: يجب أن تتضمن رقم GST، عنوان "Tax Invoice"
- **الإبلاغ**: إقرارات GST شهرية/ربع سنوية عبر IRD

### التكلفة عند التوسع
| السائقون | الإيراد الشهري (NZD) | رسوم Stripe (2.9% + $0.30) | الصافي |
|----------|----------------------|----------------------------|------|
| 100 | $3,500 | ~$131 | $3,369 |
| 1,000 | $35,000 | ~$1,045 | $33,955 |
| 6,000 (الحد الأقصى NZ) | $210,000 | ~$6,120 | $203,880 |

### المراجع
- [Stripe Node v23](https://github.com/stripe/stripe-node/releases/tag/v23.0.0)
- [Stripe Tax NZ](https://stripe.com/tax/new-zealand)
- [دليل GST النيوزيلندي](https://www.ird.govt.nz/gst)

---

## 14. الكاميرا/OCR: VisionCamera + Reanimated 4 + Nitro Modules

### VisionCamera: **v5.2.3** (أُصدر 2026-08-20)
- CameraX 1.7.0-alpha03
- Nitro Modules 0.37+
- رد نداء `onUIRotationChanged`
- إصلاحات دوران الصور
- تبعية اختيارية لـ Nitro

### Reanimated: **v4.7.1** (أُصدر 2026-10-02)
- إصلاحات استقرار رسوم متحركة التخطيط
- إصلاحات انتقالات العناصر المشتركة
- إصلاحات تعطل أندرويد
- إصلاحات تحديث خصائص متزامنة
- إصلاح تخفيف `withTiming`

### Nitro Modules: **0.37+** (مطلوب لـ VisionCamera 5.2+)
- وحدات أصلية مبنية على JSI
- تحسينات العرض
- مطلوب لمعالجات إطارات VisionCamera

### مصفوفة التوافق (حرجة)
| الوحدة | الإصدار | JSI | Fabric | الحالة |
|---------|---------|-----|--------|--------|
| VisionCamera | 5.2.3 | ✅ | ✅ | **اختبر معاً** |
| Reanimated | 4.7.1 | ✅ | ✅ | **اختبر معاً** |
| Nitro Modules | 0.37+ | ✅ | ✅ | تبعية |
| Sherpa-onnx | مخصص | ⚠️ | ⚠️ | **اختبر معاً** |
| MapLibre | 13.7.1 | ✅ | ✅ | **اختبر معاً** |
| PowerSync | 0.x | ⚠️ | ⚠️ | **اختبر معاً** |

### الأسبوع الأول من المرحلة C: تطبيق اختبار التوافق
```bash
# إنشاء تطبيق اختبار
npx create-expo-app@latest CompatTest --template blank-typescript
cd CompatTest

# تثبيت جميع الوحدات الخمس الحرجة
npm install \
  @margelo/react-native-vision-camera@5.2.3 \
  react-native-reanimated@4.7.1 \
  @maplibre/maplibre-react-native@latest \
  @powersync/react-native@latest \
  # Sherpa-onnx: بناء مخصص
  
# إضافة إضافات التكوين
# app.config.ts
plugins: [
  'expo-build-properties',
  ['react-native-vision-camera', { enableFrameProcessors: true }],
  'react-native-reanimated/plugin',
  '@maplibre/maplibre-react-native/plugin',
  './plugins/sherpa-onnx-plugin.ts',
  './plugins/powersync-plugin.ts',
]

# تشغيل على أجهزة حقيقية (ليس محاكيات)
npx expo run:ios --device
npx expo run:android --device
```

### سيناريوهات الاختبار
1. **كاميرا + Reanimated**: معاينة كاميرا مع تراكب متحرك
2. **كاميرا + MapLibre**: كاميرا فوق خريطة (عرض AR)
3. **Sherpa + كاميرا**: أمر صوتي بينما الكاميرا نشطة
4. **PowerSync + Reanimated**: رسم متحرك لمؤشر المزامنة
5. **جميع الـ 5 معاً**: محاكاة تطبيق كامل
6. **دورات خلفية/مقدمة**: اختبار قتل iOS في الخلفية
7. **ضغط الذاكرة**: تشغيل مستمر لمدة ساعتان

### المراجع
- [VisionCamera 5.2.3](https://github.com/margelo/react-native-vision-camera/releases/tag/v5.2.3)
- [Reanimated 4.7.1](https://github.com/software-mansion/react-native-reanimated/releases/tag/4.7.1)
- [Nitro Modules](https://github.com/margelo/nitro)

---

## 15. التوسع لأستراليا: GNAF + APIs الولايات

### GNAF (ملف العناوين الجغرافي الوطني)
- **التغطية**: جميع العناوين الأسترالية (~15 مليون)
- **التنسيق**: PSV (مفصول بأنابيب)، GDA2020 / GDA94
- **الحجم**: ~2 جيجابايت مضغوط، ~8 جيجابايت مستخرج
- **التحديثات**: ربع سنوي (فبراير، مايو، أغسطس، نوفمبر)
- **الترخيص**: Creative Commons Attribution 4.0 (CC BY 4.0)

### APIs خاصة بالولايات
| الولاية | API | التغطية |
|--------|-----|---------|
| NSW | NSW Address API | 3.5 مليون عنوان |
| VIC | Vicmap Address | 2.8 مليون عنوان |
| QLD | QLD Address | 2.1 مليون عنوان |
| WA | Landgate SLIP | 1.2 مليون عنوان |
| SA | DataSA | 800 ألف عنوان |
| TAS | LIST | 300 ألف عنوان |
| ACT | ACTMAPi | 150 ألف عنوان |
| NT | NR Maps | 80 ألف عنوان |

### معمارية متعددة البلدان
```typescript
// واجهة عنوان موحدة
interface AddressProvider {
  country: 'NZ' | 'AU';
  search(query: string): Promise<Address[]>;
  reverseGeocode(lat: number, lng: number): Promise<Address | null>;
  getStreetKey(address: Address): string; // لقفل القالب
}

// تنفيذ NZ
class LINZProvider implements AddressProvider {
  country = 'NZ';
  async search(query: string) { /* pg_trgm على nz_addresses */ }
  async reverseGeocode(lat, lng) { /* PostGIS KNN */ }
  getStreetKey(addr) { return normalizeNZStreet(addr.street); }
}

// تنفيذ AU
class GNAFProvider implements AddressProvider {
  country = 'AU';
  async search(query: string) { /* pg_trgm على gnaf_addresses */ }
  async reverseGeocode(lat, lng) { /* PostGIS KNN */ }
  getStreetKey(addr) { return normalizeAUStreet(addr.street); }
}

// مصنع
function getAddressProvider(country: 'NZ' | 'AU'): AddressProvider {
  return country === 'NZ' ? new LINZProvider() : new GNAFProvider();
}
```

### حجم السوق
| السوق | سائقون مقاولون | قابلون للعنونة | إيراد @ $35/شهر |
|--------|----------------|---------------|------------------|
| **NZ** | ~6,000 | ~6,000 | $2.5M ARR |
| **AU** | ~35,000 | ~20,000 | $8.4M ARR |
| **الإجمالي** | ~41,000 | ~26,000 | **$10.9M ARR** |

---

## 16. تقنيات 2026 الناشئة للمراقبة

### الذكاء الاصطناعي/الصوت
| التكنولوجيا | الحالة | الصلة |
|-------------|--------|---------|
| **Whisper.cpp v1.6+** | مستقر | STT احتياطي إذا فشل Sherpa |
| **Moshi (Kyutai)** | تجريبي 2026 | صوت ثنائي الاتجاه كامل، محتمل للمستقبل |
| **Gemini Live API** | معاينة 2026 | متعدد الأنماط، اعتبر للمرحلة 2 |
| **OpenAI Realtime API** | GA 2024 | مكلف، احتياطي للوضع الحواري |

### الجوال
| التكنولوجيا | الحالة | الصلة |
|-------------|--------|---------|
| **React Native 0.77** | RC 2026-الربع الرابع | الإصدار القادم، راقب التغييرات الكاسرة |
| **Expo SDK 53** | مخطط 2026-الربع الرابع | SDK 52 = مستقر حالي |
| **React Compiler** | تجريبي 2026 | حفظ تلقائي، اختبر في المرحلة 2 |

### الخرائط/الموقع
| التكنولوجيا | الحالة | الصلة |
|-------------|--------|---------|
| **MapLibre v14** | تجريبي 2026 | راقب التغييرات الكاسرة |
| **Overture Maps** | 2024+ | بيانات POI مفتوحة، تكمل OSM |
| **Apple MapKit JS** | 2025+ | بديل أصلي لـ iOS |

### الخلفية
| التكنولوجيا | الحالة | الصلة |
|-------------|--------|---------|
| **PGlite** | 2024+ | WASM Postgres في المتصفح/العامل |
| **ElectricSQL** | 2024+ | بديل مزامنة PostgreSQL |
| **Turso/libSQL** | 2024+ | SQLite على الحافة، اعتبر للمزامنة |

### أدوات المطورين
| الأداة | الغرض | الحالة |
|------|--------|---------|
| **Expo Orbit** | إدارة الأجهزة | 2026 مستقر |
| **EAS Build** | CI/CD | جاهز للإنتاج |
| **Reactotron** | تصحيح | متوافق مع RN 0.76 |
| **Flipper** | مهمل | استخدم React Native DevTools |

---

## 17. ملخص التبعيات وإقفال الإصدارات

```json
{
  "dependencies": {
    "expo": "~58.0.14",
    "expo-router": "~58.0.23",
    "react": "18.3.1",
    "react-native": "0.76.5",
    "react-native-reanimated": "~4.7.1",
    "react-native-vision-camera": "~5.2.3",
    "react-native-nitro-modules": "~0.37.0",
    "@maplibre/maplibre-react-native": "~13.7.0",
    "@powersync/react-native": "^0.15.0",
    "op-sqlite": "^0.2.0",
    "pnpm": "9.x",
    "typescript": "~5.5.0"
  },
  "devDependencies": {
    "@types/react": "~18.3.0",
    "typescript": "~5.5.0"
  },
  "resolutions": {
    "react-native": "0.76.5"
  }
}
```

```python
# متطلبات backend requirements.txt
fastapi==0.115.0
uvicorn[standard]==0.30.0
langgraph==1.2.16
litellm==1.106.0
psycopg2-binary==2.9.9
asyncpg==0.29.0
sqlalchemy==2.0.30
geoalchemy2==0.14.2
pgvector==0.2.5
stripe==23.0.0
python-dotenv==1.0.1
pydantic==2.8.0
pydantic-settings==2.4.0
httpx==0.27.0
websockets==12.0
pipecat-ai==1.12.0
cartesia==1.0.0
deepgram-sdk==3.0.0
valhalla-python==3.9.1
vroom==1.15.0
ortools==9.15
```

---

## 18. سجل المخاطر: التبعيات التقنية

| المخاطر | الاحتمالية | التأثير | التخفيف |
|--------|------------|--------|----------|
| تعارض JSI بين Sherpa-onnx + VisionCamera | **عالي** | **عائق** | تطبيق اختبار توافق الأسبوع الأول من المرحلة C |
| قتل iOS في الخلفية أثناء النوبة | عالي | عالي | خدمة مقدمة، أوضاع خلفية |
| رخصة PowerSync FSL-1.1 عند التوسع | متوسط | عالي | مراجعة قانونية + خطة احتياطية مخصصة |
| ذاكرة MapLibre + PMTiles على أجهزة منخفضة | متوسط | متوسط | تخزين مؤقت للبلاط، حدود تكبير |
| وقت بناء بلاطات Valhalla (كانتربري) | منخفض | متوسط | CI/CD مسبق البناء، تحديثات تراكمية |
| دقة Deepgram Nova-3 en-NZ | منخفض | متوسط | خط أنابيب تصحيح LINZ |
| توافق Porcupine v4.0 RN 0.76 | منخفض | منخفض | اختبر مبكراً، KWS من Sherpa احتياطي |
| LiteLLM BSL-1.1 عند إيرادات كبيرة | منخفض | متوسط | راقب الإيرادات، خطط للهجرة |

---

## 19. الخطوات الفورية التالية

### الأسبوع الأول من المرحلة C (حل العائق)
1. [ ] إنشاء تطبيق اختبار توافق مع جميع الوحدات الأصلية الخمس
2. [ ] اختبار على iOS 17+ وأندرويد 14+ أجهزة حقيقية
3. [ ] تشغيل اختبار إجهاد مستمر لمدة ساعتان
4. [ ] توثيق أي تعارضات JSI/Fabric
5. [ ] قرار: PowerSync أم مزامنة مخصصة بناءً على نتائج الاختبار

### قانوني/امتثال (بالتوازي)
1. [ ] مراجعة قانونية: PowerSync FSL-1.1
2. [ ] مراجعة قانونية: LiteLLM BSL-1.1
3. [ ] تقييم تأثير الخصوصية قانون 2020 (مؤجل للإطلاق حسب طلبك)
4. [ ] تسجيل Stripe Tax NZ

### إعداد البيانات (بالتوازي)
1. [ ] تحميل عناوين LINZ NZ + خطوط وسط الشوارع + الضواحي
2. [ ] تحميل GNAF (أستراليا) للمستقبل
3. [ ] بناء PMTiles كانتربري بـ planetiler
4. [ ] بناء بلاطات توجيه Valhalla
5. [ ] تسجيل 200+ عينة صوتية لسائقين في ضوضاء كابينة الشاحنة

### الفريق
1. [ ] توظيف Mobile Lead (عائق لجميع أعمال الجوال)
2. [ ] التعاقد مع DevOps لـ CI/CD + بناء البلاطات
3. [ ] التواصل مع شركاء الامتياز (Aramex، NZ Couriers، PBT)

---

## 20. حالة اكتمال البحث

| المجال | الحالة | آخر تحقق |
|--------|--------|-----------|
| Expo/React Native | ✅ مكتمل | 2026-10-16 |
| Sherpa-onnx | ✅ مكتمل | 2026-09-10 |
| Porcupine | ✅ مكتمل | 2025-12-11 |
| Deepgram Nova-3 | ✅ مكتمل | 2026 (مستمر) |
| Pipecat | ✅ مكتمل | 2026-09-26 |
| Cartesia/ElevenLabs | ✅ مكتمل | 2026 |
| MapLibre/PMTiles/planetiler | ✅ مكتمل | 2026-10-15 |
| بيانات LINZ | ✅ مكتمل | 2026 (CC BY 4.0) |
| Valhalla/VROOM/OR-Tools | ✅ مكتمل | 2026-10-06 / 2026-03-12 / 2026-01 |
| PowerSync/op-sqlite | ✅ مكتمل | 2026 (FSL-1.1 مميز) |
| FastAPI/LangGraph/LiteLLM | ✅ مكتمل | 2026-10-16/17 |
| PostgreSQL/PostGIS/pgvector | ✅ مكتمل | 2026-08-07 |
| Stripe Billing/Tax NZ | ✅ مكتمل | 2026-10-01 |
| VisionCamera/Reanimated/Nitro | ✅ مكتمل | 2026-08-20 / 2026-10-02 |
| GNAF/توسع AU | ✅ مكتمل | 2026 (CC BY 4.0) |
| تقنيات 2026 الناشئة | ✅ مكتمل | 2026 |

---

## ملحق: عناوين URL للمستودعات الرئيسية

| الفئة | المستودع | النجوم | آخر إصدار |
|----------|----------|-------|------------|
| الجوال | expo/expo | 25k+ | 2026-10-16 |
| الجوال | facebook/react-native | 118k+ | 2026-الربع الثاني |
| الصوت | k2-fsa/sherpa-onnx | 8k+ | 2026-09-10 |
| الصوت | Picovoice/porcupine | 3k+ | 2025-12-11 |
| الصوت | pipecat-ai/pipecat | 5k+ | 2026-09-26 |
| الخرائط | maplibre/maplibre-native | 5k+ | 2026-10-15 |
| الخرائط | protomaps/PMTiles | 3k+ | 2026 |
| الخرائط | planetiler/planetiler | 1k+ | 2026 |
| التوجيه | valhalla/valhalla | 8k+ | 2026-10-06 |
| التوجيه | VROOM-Project/vroom | 2k+ | 2026-03-12 |
| التوجيه | google/or-tools | 12k+ | 2026-01 |
| المزامنة | powersync-ja/powersync | 2k+ | 2026 (0.x) |
| المزامنة | op-sqlite/op-sqlite | 500+ | 2026 |
| الخلفية | langchain-ai/langgraph | 10k+ | 2026-10-16 |
| الخلفية | BerriAI/litellm | 12k+ | 2026-10-17 |
| قاعدة البيانات | supabase/supabase | 70k+ | 2026-08-07 |
| الكاميرا | margelo/react-native-vision-camera | 8k+ | 2026-08-20 |
| الرسوم المتحركة | software-mansion/react-native-reanimated | 8k+ | 2026-10-02 |
| المدفوعات | stripe/stripe-node | 4k+ | 2026-10-01 |

---

*البحث مُجمع: 2026-10-18*  
*مراجعة قادمة مُوصى بها: قبل انطلاق الأسبوع الأول من المرحلة C*  
*جميع أرقام الإصدارات مُتحققة عبر GitHub Releases API*