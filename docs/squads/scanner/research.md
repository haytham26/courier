# Label Scanner Squad - research

**Area:** OCR / label scanning (camera → address block only, on-device, offline) **Research date:** 2026-10-20 · **Source file:** `docs/research/2026/ocr-label-scanning.md`

## Queries that found the candidates

`gh search repos "ocr react native" --sort stars` · `gh search repos --topic ocr` · `"barcode scanner" --language kotlin` · `"text recognition" --language kotlin` · `"zxing"` · `"react-native-vision-camera"` · `"onnxruntime mobile"` ·
`"nitro-modules"` · `gh api repos/<o>/<r>` (30 repos) · `gh api .../releases?per_page=12` · `gh api .../commits?since=<90d>` · `gh api .../readme` · npm registry + downloads/last-week · Hugging Face models API (`search=ocr`, `trocr`,
`pp-ocr`, `layout`, `address`) · webfetch of the ML Kit text-recognition v2 docs and the op-sqlite installation page · websearch "PP-OCRv6 mobile on-device Android 2026 model size ONNX vs ML Kit speed".

## Candidates that matter

| Project | Repo | Licence | One-line reason |
|---|---|---|---|
| VisionCamera v5 | `margelo/react-native-vision-camera` | MIT | The camera + frame-processor host; already installed, and our address-block classifier is a frame-processor plugin. |
| ocr-plus | `jamenamcinteer/react-native-vision-camera-ocr-plus` | MIT | The only candidate exposing live OCR, photo OCR, crop-to-region and configurable frame skipping — exactly the knobs the ≤ 1.5 s budget needs. |
| vision-camera-mlkit | `pedrol2b/react-native-vision-camera-mlkit` | MIT | Nitro-native alternative with cleaner hook ergonomics; benchmark both, the choice is cheap now and expensive later. |
| nitro-zxing | `margelo/react-native-nitro-zxing` + `zxing-cpp` | MIT / Apache-2.0 | Decodes the luminance plane in place — the right architecture for barcode dedupe without ML Kit's cost. |
| RapidOCR | `RapidAI/RapidOCR` | Apache-2.0 (code + models) | The documented FOSS fallback: the same PaddleOCR models packaged for ONNX/OpenVINO/MNN with Android and iOS builds. |
| PaddleOCR | `PaddlePaddle/PaddleOCR` | Apache-2.0 | PP-OCRv6 tiny/small detection models at 1.9 MB / 9.6 MB — the weights behind the FOSS path. |
| OpenCV | `opencv/opencv` | Apache-2.0 | Only if glare or perspective correction is needed for crumpled labels. |
| MediaPipe | `google-ai-edge/mediapipe` | Apache-2.0 | Unused in our pipeline; kept on the radar. |
| mobile_scanner | `juliansteenbakker/mobile_scanner` | MIT | Flutter parity reference only. |
| tesseract.js | `naptha/tesseract.js` | Apache-2.0 | **Cannot run in Hermes at all** — the wrong tier. |

## Deep review - top 5

1. **VisionCamera v5** - v5 is Nitro-based with JS frame processors (worklets on their own thread, YUV planes, zero copies); 30-240 FPS claimed; GPU-accelerated resizer; v4 is archived so v4-era plugins are dead ends; v5 needs
   `react-native-nitro-modules` (we have 0.37.1) and `react-native-nitro-image`. **Verdict KEEP, pin 5.2.3.**
2. **ocr-plus** - the only plugin exposing exactly our three knobs (live / photo / cropped region with frame skipping); ML Kit v2 returns blocks → lines → elements (words) → symbols with bounding boxes, corner points, rotation,
   **per-element confidence** and the recognised language — the confidence is our recipient-vs-sender classifier feature. Cost: unbundled ≈ 260 KB per script per architecture with a dynamic model download; bundled ≈ 4 MB per script per
   architecture, statically linked. Requires RN ≥ 0.81 (we are 0.88), Android minSdk 26 / target 36, `react-native-worklets` 0.8.x (not installed), Expo 54+ (we are 58). **Verdict ADOPT (bundled Latin script), benchmark first.**
3. **vision-camera-mlkit** - Nitro-native, v5-only, `useTextRecognition` + `useBarcodeScanning` hooks inside a frame-output worklet; requires RN ≥ 0.86, Android SDK 24+, nitro-modules, `react-native-vision-camera-worklets` +
   `react-native-worklets` and the worklets Babel plugin; 1 maintainer/90 d, 23 commits/90 d. **Verdict ADOPT as the alternative; run both in the benchmark.**
4. **nitro-zxing** - created 2026-08-25, v0.1.0, 831 dl/week, 1 maintainer — brand new. Its own README benchmark (vendor claim, not our measurement): live 1280×720 YUV 13.1 ms vs ML Kit 34.4 ms; still 3060×4080 21.7 ms vs 59.3 ms; 256×256
   PNG 0.95 ms vs 9.7 ms. zxing-cpp underneath is solid (2,062 ★, Apache-2.0, 7 maintainers/90 d). **Verdict ADOPT for barcodes only, behind an interface.**
5. **RapidOCR / PaddleOCR** - PP-OCRv6 tiny det 1.9 MB (Hmean 80.6 %), small det 9.6 MB (84.1 %); RapidOCR packages the same models for ONNX Runtime / OpenVINO / MNN / TensorRT with no PaddlePaddle dependency (a third-party 2026 ONNX port
   reports ~200 MB vs ~2 GB for PaddleX); 8 maintainers/90 d, 12 releases/12 m. Running it inside an RN frame processor needs ONNX Runtime Mobile bindings — real integration work. **Verdict ADOPT as the documented FOSS fallback (phase 2),
   not the primary.**

## Decisions

- **ADOPT (phase 1)** VisionCamera 5.2.3 (KEEP the pin) · ML Kit Text Recognition v2 **bundled** Latin script via ocr-plus *or* vision-camera-mlkit (benchmark both) · nitro-zxing + zxing-cpp for barcodes only · resize-before-OCR in our own
  frame processor · **our own** address-block classifier using element confidence and geometry. No off-the-shelf NZ address-block model exists (HF sweep) and none should be trusted without our own eval set.
- **ADOPT (phase 2, the FOSS fallback our licence policy requires)** RapidAI/RapidOCR with PP-OCRv5/PP-OCRv6 tiny or small ONNX models behind the same `TextRecogniser` interface.
- **Fallback chain** ML Kit bundled → RapidOCR/PP-OCR ONNX → tesseract-class → **ask the driver one quick question**. **No cloud OCR, ever.**
- **WATCH** OpenCV (glare/perspective), MediaPipe (unused), `react-native-nitro-sqlite` (surfaced by the nitro query), `ahmeterenodaci/rn-mlkit-ocr`, `mrousavy/vision-camera-resize-plugin`, mobile_scanner.
- **REJECT** `tesseract.js` (no Hermes support, lowest accuracy) · `tesseract` (tier) · `chineseocr_lite` (GPL-2.0) · Anyline (commercial) · `chandra`/`MinerU`/`EasyOCR`/`zerox`/`Unstructured` (server-class, breaks the on-device rule) ·
  `CRAFT-pytorch` (research artefact) · `gev2002/react-native-vision-camera-text-recognition` (stale, v3-era) · `journeyapps/zxing-android-embedded` (Activity-based) · `tony-xlh/react-native-document-scanner` (no licence) · dynamsoft-class
  plugins (commercial).

## UNVERIFIED

1. **No scanner eval set or benchmark exists** (`docs/squads/scanner/eval/` and `benchmarks/` are empty), so **correct recipient address ≥ 97 %, wrong-block ≤ 1 % and ≤ 1.5 s/label are all unmeasured**.
2. The PaddleOCR **model weights** licence is reported Apache-2.0 by the PaddlePaddle HF org but the HF API returned an empty `cardData.license`; the dictionary files are unchecked. **UNVERIFIED.**
3. Every timing quoted here (OCR pipeline, ML Kit vs zxing, PP-OCRv6 on an Apple M4) is a **vendor claim**; none is our measurement on a mid-range Android. **UNVERIFIED.**
4. The third-party 2026 on-device OCR benchmark (Apple Vision 85.4 % F1, ML Kit 75.5 %, PP-OCRv4 74.7 %, tesseract.js 59.0 %) is **one blog on 778 non-NZ images** — a lead, not a verdict.
5. Android API 34 support and Expo SDK 58 support for both ML Kit plugins are **not stated** by either repo (compatibility is inferred from peer ranges); whether VisionCamera v5 + Nitro + `expo-updates` works together in our build (the
   first native build is the risk); 6-month star trend, median maintainer response time and closed-issue ratios for every candidate. UNVERIFIED.
