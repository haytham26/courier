# Research 2026 — OCR label scanning (address-only, on-device, offline)

**Area:** Label Scanner squad (`docs/squads/scanner/`)
**Researcher role:** Researcher (V4 §1 role 2, V4 §3, §10.2, §12)
**Research date:** 2026-10-20 (all stars/dates from the GitHub, npm, Hugging Face and Google APIs on this date)
**The requirement we are solving (V4 §10.2, binding):** a scanner that **only finds and returns the delivery address** — ignore sender blocks, barcodes, marketing, phone numbers; **fully on-device and offline**; **≤ 1.5 s per label** on a mid-range Android; **≥ 97 % correct recipient address** after LINZ correction; **≤ 1 % wrong-block (sender picked)**; batch mode for 200+ parcels.
**Our current state:** no scanner code exists (`docs/squads/scanner/README.md`: "Code: `apps/mobile/src/scanner (to be created)`"); `apps/mobile/package.json` already pins **`react-native-vision-camera` 5.2.3** and **`react-native-nitro-modules` 0.37.1**; `app.json` has `"newArchEnabled": true`; there is **no OCR dependency yet**.
**Note for the Release Manager:** `docs/squads/scanner/README.md` line 21 points at `docs/research/2026/on-device-ocr-label-scanning.md`. This file is the one the task asked for (`ocr-label-scanning.md`). Rename the pointer in a follow-up PR — this sprint was not allowed to edit any other file.

## Queries run

1. `gh search repos "ocr react native" --sort stars --limit 30`
2. `gh search repos --topic ocr --sort stars --limit 30`
3. `gh search repos "barcode scanner" --language kotlin --sort stars --limit 30`
4. `gh search repos "text recognition" --language kotlin --sort stars --limit 30`
5. `gh search repos "zxing" --sort stars --limit 20`
6. `gh search repos "react-native-vision-camera" --sort stars --limit 20`
7. `gh search repos "onnxruntime mobile" --sort stars --limit 20`
8. `gh search repos "nitro-modules" --sort stars --limit 5` → surfaced `margelo/nitro`, `margelo/react-native-nitro-sqlite`, `mCodex/react-native-sensitive-info`
9. `gh api repos/<owner>/<repo>` for 30 repos (stars, forks, created_at, pushed_at, licence, topics, archived)
10. `gh api repos/<owner>/<repo>/releases?per_page=12` (last release + 12-month cadence)
11. `gh api repos/<owner>/<repo>/commits?since=<90d>&per_page=100` (distinct authors = active maintainers, 90 d)
12. `gh api repos/<owner>/<repo>/commits?per_page=20` (deep review)
13. `gh api -X GET search/issues -f "q=repo:<o>/<r> is:issue is:open|closed"`
14. `gh api repos/<owner>/<repo>/readme` (raw README: vision-camera, nitro-zxing, ocr-plus, vision-camera-mlkit)
15. npm registry + `api.npmjs.org/downloads/point/last-week` for `react-native-vision-camera`, `react-native-nitro-zxing`, `react-native-vision-camera-text-recognition`, `expo-camera`
16. Hugging Face models API: `search=ocr`, `trocr`, `pp-ocr`, `layout`, `address` (downloads, likes, lastModified, cardData.license)
17. webfetch: `developers.google.com/ml-kit/vision/text-recognition/v2` (+ the Android page) · `op-engineering.github.io/op-sqlite/docs/installation/`
18. websearch: "PP-OCRv6 mobile on-device Android 2026 model size ONNX vs ML Kit text recognition speed"

## Candidates (30) — evidence cards

`stars · created · last release @ date · cadence · maint(90 d) · issues open/closed · licence (code / weights / data) · platform · decision`.
**6-month star trend: UNVERIFIED for all candidates** — the GitHub REST API exposes no historical star count without a full stargazer pagination scan; the CI should snapshot `stargazers_count` monthly. Commit-author counts and release cadence are the verified liveness proxy.

1. **margelo/react-native-vision-camera** — https://github.com/margelo/react-native-vision-camera · 9,646 ★ · 2021-02-19 · `v5.2.3` @ 2026-08-20 · 12 rel/12 m · 8 maintainers/90 d (56 commits) · 36 open / 2,124 closed · **MIT** / n/a / n/a · **on-device** (native camera + JS frame processors) · New Arch: yes (v5 is Nitro-based; v4 archived to `react-native-vision-camera-v4-snapshot`) · Expo SDK 58: yes (npm 5.2.3, 2026-08-20) · Android API 34: yes · npm **353,105 dl/week** · OSV: 0 advisories · **ADOPT (already installed)**
2. **margelo/react-native-nitro-zxing** — https://github.com/margelo/react-native-nitro-zxing · 91 ★ · **created 2026-08-25** (2026 newcomer) · `v0.1.0` @ 2026-10-08 · 2 rel/12 m · 1 maintainer/90 d (9 commits) · 0 open / 1 closed · **MIT** / zxing-cpp (Apache-2.0) / n/a · **on-device, pure C++ Nitro**; decodes the camera **luminance plane in place** (no ML Kit, no base64, no temp files) · vendor benchmark in its own README: live 1280×720 YUV **13.1 ms vs ML Kit 34.4 ms (2.6×)**, still 3060×4080 **21.7 ms vs 59.3 ms (2.7×)**, bundled 256×256 QR **0.95 ms vs 9.7 ms (10.2×)** (vendor numbers, not ours) · npm 0.1.0, **831 dl/week** · **ADOPT for the barcode-assist path only**
3. **jamenamcinteer/react-native-vision-camera-ocr-plus** — 73 ★ · 2025-10-03 · `v2.0.6` @ 2026-08-20 · 12 rel/12 m · 5 maintainers/90 d (15 commits) · 1 open / 11 closed · **MIT** / **ML Kit is proprietary (Google Play Services terms, free tier, no source)** / n/a · **on-device** · requirements: RN ≥ 0.81, iOS 15.1, **Android minSdk 26 / target 36**, VisionCamera ≥ 5.0.0, `react-native-worklets` 0.8.x, Expo 54+ · features: live OCR, photo OCR, **scan-region cropping**, **configurable frame skipping**, model management, Latin/Chinese/Devanagari/Japanese/Korean · **ADOPT (primary OCR candidate)**
4. **pedrol2b/react-native-vision-camera-mlkit** — 58 ★ · 2024-05-15 · `v2.0.1` @ 2026-08-20 · 4 rel/12 m · 1 maintainer/90 d (23 commits) · 0 open / 4 closed · **MIT** / ML Kit proprietary / n/a · **on-device** · requirements: **RN ≥ 0.86**, iOS 15.1+, Android SDK 24+, VisionCamera ≥ 5 (**Nitro v5**), nitro-modules; live hooks additionally need `react-native-vision-camera-worklets` + `react-native-worklets` + the `react-native-worklets` Babel plugin · v2 implements text recognition + barcode scanning · **ADOPT (alternative to #3)**
5. **ahmeterenodaci/rn-mlkit-ocr** — 31 ★ · **created 2025-12-07** · no releases · 0 maintainers/90 d · 0 open · **MIT** / ML Kit proprietary / n/a · on-device, Expo module, "lightweight model loading" · **WATCH** (young, unproven, but targets Expo + New Arch explicitly)
6. **gev2002/react-native-vision-camera-text-recognition** — 93 ★ · 2024-05-25 · npm 3.1.1 @ **2024-08-12** (stale ~14 months) · 19 open · **MIT** / ML Kit proprietary / n/a · on-device, VisionCamera **v3** (pre-New-Arch) · **REJECT** (stale, v3-era)
7. **pushpender-singh-ap/react-native-scanner** — 118 ★ · 2023-03-04 · pushed 2026-04-10 · 15 open · **MIT** · on-device, Turbo/Fabric native module, Kotlin + Swift + ObjC++ bridges · **WATCH** (barcode only, no OCR)
8. **luicfrr/react-native-vision-camera-face-detector** — 348 ★ · 2024-02-02 · `v2.1.0` @ 2026-09-11 · 3 open · **MIT** / ML Kit proprietary / n/a · on-device · **WATCH** — reference for the *plugin shape* we will write for the address-block classifier (a face detector is the same integration problem, minus the classifier)
9. **tony-xlh/react-native-document-scanner** — 43 ★ · 2022-11-09 · pushed 2025-09-11 · no licence · **REJECT** (no licence)
10. **mrousavy/vision-camera-resize-plugin** — 131 ★ · 2022-08-25 · pushed 2026-03-23 · **MIT** · on-device (fast buffer resize + YUV↔RGBA) · **WATCH** — the C++/GPU resizer matters for the ≤ 1.5 s budget: resizing before OCR is the cheapest win
11. **zxing/zxing** — 34,169 ★ · 2011-10-12 · `zxing-3.5.4` @ 2025-11-11 · 1 rel/12 m · 4 maintainers/90 d (7 commits) · 0 open / 1,352 closed · **Apache-2.0** / n/a / n/a · on-device (Java/Kotlin) · **KEEP as the algorithm reference; REJECT as a direct RN dependency** (Java-only, no New Arch RN binding)
12. **zxing-cpp/zxing-cpp** — 2,062 ★ · 2016-04-12 · `v3.1.1` @ 2026-07-29 · 7 rel/12 m · 7 maintainers/90 d (100+ commits) · 41 open / 563 closed · **Apache-2.0** · on-device C++ · **ADOPT (via react-native-nitro-zxing)**
13. **journeyapps/zxing-android-embedded** — 5,936 ★ · pushed 2024-08-04 · 126 open · **Apache-2.0** · Android-only, Activity-based (not a frame processor) · **REJECT**
14. **markusfisch/BinaryEye** — 2,435 ★ · 2017-08-27 · `1.75.5` @ 2026-10-08 · 12 rel/12 m · 4 maintainers/90 d (29 commits) · 159 open · **MIT** · Android app (not a library) · **REJECT** (app, not a dependency) — good reference for a fast Kotlin barcode loop
15. **juliansteenbakker/mobile_scanner** — 1,176 ★ · 2022-02-08 · `v7.4.2` @ 2026-09-10 · 9 rel/12 m · 7 maintainers/90 d (43 commits) · 123 open / 854 closed · **BSD-3-Clause** · Flutter (CameraX/ML Kit + AVFoundation/Vision) · **REJECT** (Flutter), **KEEP as a feature-parity reference** (its per-format/ROI API is what we should mirror)
16. **Anyline/anyline-ocr-react-native-module** — 111 ★ · 2016-12-05 · `v56.6.0` @ 2026-10-15 · 0 open · licence **NOASSERTION (commercial, proprietary)** · on-device but licence-gated · **REJECT** (commercial licence; also scanbot/Dynamsoft-class licences are not in our budget)
17. **PaddlePaddle/PaddleOCR** — 91,404 ★ · 2020-05-08 · `v3.7.0` @ 2026-06-11 · 8 rel/12 m · 2 maintainers/90 d (3 commits on the default branch) · 156 open / 10,494 closed · **Apache-2.0** code / **Apache-2.0 models (PaddlePaddle HF org)** / training data mixed · **on-device possible** via ONNX; model sizes: PP-OCRv6_tiny_det **1.9 MB** (0.43 M params, Hmean 80.6), small_det **9.6 MB** (84.1), medium_det **59.4 MB** (86.2), PP-OCRv5_mobile_det **4.7 MB** (79.0) · **WATCH → ADOPT for the FOSS fallback engine** (the only credible fully-permissive on-device OCR we found)
18. **RapidAI/RapidOCR** — 8,207 ★ · 2021-01-04 · `v3.10.0` @ 2026-10-08 · 12 rel/12 m · 8 maintainers/90 d (25 commits) · 21 open / 305 closed · **Apache-2.0** code + **Apache-2.0 ONNX models** / n/a · **on-device** (ONNX Runtime / OpenVINO / MNN / TensorRT; Android + iOS builds) · **ADOPT as the FOSS fallback engine** (it *is* PP-OCR, packaged for mobile — no separate PaddlePaddle dependency)
19. **tesseract-ocr/tesseract** — 77,075 ★ · 2014-08-12 · `5.5.3` @ 2026-07-24 · 2 rel/12 m · 17 maintainers/90 d (88 commits) · 434 open / 2,340 closed · **Apache-2.0** / **Apache-2.0 traineddata (Tesseract OFL-style release)** / n/a · on-device but heavy, slow on photo labels · **REJECT as the primary engine; KEEP as the last-resort fallback**
20. **naptha/tesseract.js** — 38,775 ★ · 2015-06-24 · `v7.0.0` @ 2025-12-15 · 1 rel/12 m · 0 maintainers/90 d · 35 open / 705 closed · **Apache-2.0** · WASM · **REJECT** — a third-party 2026 benchmark measured it at 59.0 % F1 (vs ML Kit 75.5 %) *and* found its WASM build **cannot run inside React Native's Hermes runtime at all**
21. **microsoft/onnxruntime** — 22,121 ★ · 2018-11-10 · `v1.31.0` @ 2026-10-09 · 12 rel/12 m · 47 maintainers/90 d (100+ commits) · 931 open / 7,842 closed · **MIT** · on-device runtime · **ADOPT (indirectly, via RapidOCR/PP-OCR ONNX builds)**
22. **google-ai-edge/mediapipe** — 37,338 ★ · 2019-06-13 · `v1.1.1` @ 2026-10-14 · 6 rel/12 m · 9 maintainers/90 d · 333 open · **Apache-2.0** · on-device, but no document/label OCR pipeline in the box · **WATCH**
23. **opencv/opencv** — 91,242 ★ · 2012-07-19 · `5.0.0` @ 2026-06-06 · 28 maintainers/90 d · 2,549 open / 9,202 closed · **Apache-2.0** · on-device (C++/AAR, `org.opencv:opencv:5.0.0` on Maven) · **WATCH** — perspective correction / glare removal for crumpled labels; heavy to add, defer until the baseline misses
24. **clovaai/CRAFT-pytorch** — 3,407 ★ · 2019-06-04 · pushed 2024-07-16 · 115 open · **MIT** / PyTorch weights · **REJECT** (research artefact, not shippable; ML Kit already gives us text regions)
25. **datalab-to/chandra** — 12,515 ★ · **created 2025-10-08** · `v0.2.0` @ 2026-03-18 · 8 rel/12 m · 0 maintainers/90 d · 49 open / 26 closed · **Apache-2.0** code / model licence **UNVERIFIED** (HF `cardData.license` empty for `datalab-to/chandra-ocr-2`) / n/a · **server-class model** (1,469,199 HF downloads, 566 likes) · **REJECT** (too big for a mid-range phone; would break the on-device rule)
26. **opendatalab/MinerU** — 82,099 ★ · licence **NOASSERTION** · server-side document parsing · **REJECT**
27. **getomni-ai/zerox** — 12,248 ★ · MIT · server-side (sends the image to an LLM) · **REJECT** (violates "no images uploaded", on-device and privacy rules)
28. **JaidedAI/EasyOCR** — 30,092 ★ · pushed 2025-12-05 · last rel `v1.7.2` @ 2024-09-24 · 533 open · **Apache-2.0** · **server-side Python (PyTorch)** · **REJECT**
29. **DayBreak-u/chineseocr_lite** — 12,350 ★ · **GPL-2.0** · **REJECT** (copyleft in the APK; also Chinese-only)
30. **expo/expo** — 52,869 ★ · MIT · `expo-camera` 58.0.11 (1,789,747 dl/week) · on-device but no OCR · **KEEP** (Expo Camera is the fallback if VisionCamera frame processors misbehave) — plus `hiroi-sora/Umi-OCR` (48,059 ★, MIT, desktop), `ocrmypdf/OCRmyPDF` (35,102 ★, MPL-2.0, server), `paperless-ngx` (GPL-3.0), `Unstructured-IO` (15,779 ★, Apache-2.0, server): **REJECT** (all server-side or desktop).

**Hugging Face model-hub sweep (weights licence + downloads + last update — licence UNVERIFIED where the API returned an empty `cardData.license`):**

| model | downloads | likes | last updated | licence | note |
|---|---|---|---|---|---|
| `deepseek-ai/DeepSeek-OCR` | 2,090,372 | 3,449 | 2025-11-04 | UNVERIFIED | VLM, server-class → REJECT |
| `baidu/Unlimited-OCR` | 1,799,825 | 4,829 | 2026-10-14 | UNVERIFIED | REJECT (size) |
| `zai-org/GLM-OCR` | 1,717,806 | 2,164 | 2026-09-11 | UNVERIFIED | REJECT (size) |
| `datalab-to/surya-ocr-2` | 1,490,895 | 130 | 2026-05-27 | UNVERIFIED | REJECT (size) |
| `datalab-to/chandra-ocr-2` | 1,469,199 | 566 | 2026-06-26 | UNVERIFIED | REJECT (size) |
| `dots-studio/dots.ocr` | 617,373 | 1,341 | 2025-10-31 | UNVERIFIED | REJECT |
| `deepseek-ai/DeepSeek-OCR-2` | 556,618 | 1,138 | 2026-02-03 | UNVERIFIED | REJECT |
| `stepfun-ai/GOT-OCR2_0` | 364,685 | 1,572 | 2025-02-04 | UNVERIFIED | REJECT |
| `PaddlePaddle/PP-OCRv5_mobile_det_onnx` | 78,199 | 0 | 2026-06-10 | UNVERIFIED (repo says Apache-2.0) | **CANDIDATE (FOSS fallback)** |
| `PaddlePaddle/PP-OCRv6_medium_rec_onnx` | 62,848 | 26 | 2026-06-18 | UNVERIFIED (repo Apache-2.0) | candidate, too big (medium) |
| `PaddlePaddle/en_PP-OCRv5_mobile_rec` | 185,036 | 3 | 2025-08-29 | UNVERIFIED (Apache-2.0) | **candidate (English recogniser)** |
| `PaddlePaddle/latin_PP-OCRv5_mobile_rec` | 33,955 | 8 | 2025-10-16 | UNVERIFIED (Apache-2.0) | **candidate (Latin recogniser — NZ is Latin script)** |
| `PaddlePaddle/PP-OCRv5_mobile_rec` | 40,439 | 16 | 2025-07-22 | UNVERIFIED (Apache-2.0) | candidate (multilingual) |
| `microsoft/trocr-base-printed` | 255,508 | 228 | 2024-05-27 | UNVERIFIED | stale, single-line only → REJECT |
| `microsoft/trocr-base-handwritten` | 140,860 | 529 | 2025-02-11 | UNVERIFIED | REJECT |

**Address-NER model search on HF (`search=address`):** the top hits are Indian-address models (`sobowalebukola/naija-address-normalizer` 36,083 dl, `shiprocket-ai/open-tinybert-indian-address-ner` 3,007 dl, `abr-6024/indian-address-parser-1.5B` 654 dl) plus `ctrlbuzz/bert-addresses` (1,358 dl, US) and `Mozilla/tinybert-address-autofill` (159 dl, updated 2026-10-13). **There is no credible open NZ address-parsing or address-block-classification model.** → our address-block classifier must be rules + a small in-house model, not a downloaded one. Recorded as a finding, not a gap.

## Shortlist (12)

`react-native-vision-camera` · `react-native-vision-camera-ocr-plus` · `react-native-vision-camera-mlkit` · `react-native-nitro-zxing` · `zxing-cpp` · `PaddleOCR` · `RapidOCR` · `onnxruntime` · `rn-mlkit-ocr` · `mobile_scanner` (parity reference) · `opencv` · `tesseract` (last-resort reference).

## Deep review — top 5

**1. margelo/react-native-vision-camera (camera + frame-processor host)** — README read.
*Architecture:* v5 is built on **Nitro modules** (C++/Kotlin/Swift HybridObjects) with JS **frame processors** — worklets that run on a separate thread and receive the camera frame's YUV planes with zero copies. Features that matter to us: photo/video capture, QR/barcode scanner, custom devices, 4k/8k stills, **30–240 FPS**, frame processors, drawing on the camera surface, zoom via Reanimated, HDR/night modes, and a **C++/GPU-accelerated resizer (Metal/Vulkan)**.
*Extensibility:* the frame-processor plugin ecosystem is the extension point; our address-block classifier is a plugin.
*API ergonomics:* the v5 API moved to `useFrameOutput` / worklets; both OCR plugin candidates target it.
*Maintenance:* 8 maintainers/90 d, 12 releases/12 m, v5.2.3 (2026-08-20); v4 is explicitly **archived** (`react-native-vision-camera-v4-snapshot`, docs at visioncamera4.margelo.com) — so v4-era plugins (like `gev2002/...` at #6) are dead ends.
*Risks:* v5 requires `react-native-nitro-modules` (we have 0.37.1 ✔) and `react-native-nitro-image`; the v4→v5 break is already behind us.
*Performance claims:* 4k/8k and 240 FPS are capability claims; **our** throughput numbers are UNVERIFIED until we benchmark.

**2. jamenamcinteer/react-native-vision-camera-ocr-plus (primary OCR candidate)** — README read.
*Why it wins:* it is the **only** candidate that exposes exactly the three knobs the scanner squad needs: **live OCR** (every frame), **photo OCR** (async, from a still URI — needed for batch mode and for the "photo of a manifest" flow), and **scan-region cropping** + **configurable frame skipping** (frame skipping is how you hit ≤ 1.5 s without dropping accuracy). ML Kit v2 returns **blocks / lines / elements (words) / symbols** with bounding boxes, corner points, rotation, **confidence score** and **recognized language** — the per-element confidence is what our recipient-vs-sender classifier scores on.
*Cost:* ML Kit is **proprietary** (Google Play Services terms). Unbundled = **~260 KB per script per architecture** and a dynamic model download; bundled = **~4 MB per script per architecture**, statically linked and available immediately. For a **driver in a van with patchy connectivity**, *bundled* is the correct choice (no first-use download stall). Licence consequence: the ML Kit terms are not OSS, so our FOSS fallback must exist (RapidOCR/PP-OCR) or the APK's licence record must declare the Google dependency explicitly in `docs/LICENSES.md`.
*Compatibility:* RN ≥ 0.81 (we are 0.88 ✔), iOS 15.1, **Android minSdk 26 / target 36** (our `app.json` sets no explicit minSdk — we must pin ≥ 26), VisionCamera ≥ 5.0.0 (5.2.3 ✔), `react-native-worklets` 0.8.x (**not yet installed — new dependency**), Expo 54+ (we are 58 ✔).
*Risks:* single-maintainer-bounded (5 authors/90 d is healthy for this size, but the repo is one person deep in practice), and its peer set (`react-native-vision-camera-worklets`) is not in our lockfile yet.

**3. pedrol2b/react-native-vision-camera-mlkit (alternative)** — README read.
*Difference:* it is a **Nitro-native** plugin (v5-only), exposing `useTextRecognition` and `useBarcodeScanning` hooks that run inside a `useFrameOutput` worklet; v2 covers text recognition **and** barcode scanning, and the roadmap lists more ML Kit vision features. Requires **RN ≥ 0.86** (we are 0.88 ✔), Android SDK 24+, VisionCamera ≥ 5 (**Nitro v5, explicitly "not v4"**), nitro-modules, plus `react-native-vision-camera-worklets` + `react-native-worklets` and the `react-native-worklets` Babel plugin.
*API ergonomics:* hooks are cleaner than imperative scan calls, and it is 1 maintainer/90 d with 23 commits/90 d.
*Verdict:* equal or better ergonomics; **run both in the benchmark** because the choice is cheap to make later but expensive to get wrong (the ≤ 1.5 s budget depends on which one the pipeline is built around).

**4. margelo/react-native-nitro-zxing + zxing-cpp (barcode assist)** — READMEs read.
*Why:* our pipeline needs the courier barcode to dedupe parcels and link tracking numbers, and we do **not** want to pay ML Kit's price for that. This plugin decodes the **luminance (Y) plane in place** — no ML Kit, no base64 round-trip, no temp file — which is exactly the right architecture for a frame processor.
*Vendor benchmark (its own README, not our measurement): live 1280×720 YUV **13.1 ms** vs ML Kit 34.4 ms; still 3060×4080 **21.7 ms** vs 59.3 ms; 256×256 PNG **0.95 ms** vs 9.7 ms.
*Maturity:* **created 2026-08-25**, 91 ★, v0.1.0, 831 dl/week, 1 maintainer — brand new. zxing-cpp underneath is solid: 2,062 ★, Apache-2.0, 7 releases/12 m, 7 maintainers/90 d.
*Verdict:* **ADOPT for barcodes only**, behind an interface so we can drop to `react-native-vision-camera`'s built-in scanner or a future zxing-cpp binding without touching the scanner code.

**5. PaddleOCR / RapidOCR (the FOSS fallback engine)** — release lists, model-size tables, HF model list read.
*Model facts (official PaddleOCR docs):* PP-OCRv6_tiny_det **1.9 MB** (0.43 M params, detection Hmean 80.6 %), PP-OCRv6_small_det **9.6 MB** (84.1 %), PP-OCRv6_medium_det **59.4 MB** (86.2 %), PP-OCRv5_mobile_det **4.7 MB** (79.0 %). Pipeline = DB text detection + CRNN recognition + a dictionary; ONNX Runtime end-to-end on a 2026 Apple M4: PP-OCRv6_small **1.29 s/image**, tiny **0.35 s/image** (server hardware — our phone numbers will be worse; **UNVERIFIED for a mid-range Android**).
*Why RapidOCR over raw PaddleOCR:* RapidOCR is the same PP-OCR models packaged for ONNX Runtime / OpenVINO / MNN / TensorRT with **Android and iOS builds**, no PaddlePaddle dependency (a third-party 2026 ONNX port reports a ~200 MB footprint vs ~2 GB for PaddleX), 8 maintainers/90 d, 12 releases/12 m, 21 open / 305 closed issues. Licence: **Apache-2.0** code and **Apache-2.0** PaddleOCR models.
*Risks:* the model **weights** licence is reported Apache-2.0 by the PaddlePaddle HF org but the HF API returns an empty `cardData.license` — treat as **UNVERIFIED until we read the model card**; the dictionary files must be checked too. Running PP-OCR in a React Native frame processor needs ONNX Runtime Mobile bindings, which is real integration work — treat as phase 2, not phase 1.
*Verdict:* **ADOPT as the documented FOSS fallback** (satisfies the V4 rule "ML Kit proprietary → keep a zxing/Tesseract-class FOSS path"), but **not** the primary path.

## Benchmark

**Status: UNVERIFIED — the evaluation set does not exist.** `docs/squads/scanner/benchmarks/README.md` = "Harness: _to be created with the first implementation_"; `docs/squads/scanner/STATUS.md` = "not measured yet"; `data/labels/` does not exist; `docs/squads/scanner/eval/` does not exist. Nothing in this file may be claimed as "better than our current choice" until a table is published.

**The set to build (named, per V4 §10.2 / §12.5):** `docs/squads/scanner/eval/` with **≥ 300 real-style NZ courier label images** (gitignored under `data/labels/`), structured as:
- `synthetic/` — programmatically rendered labels for **8–10 NZ carriers/layouts** (CourierPost, NZ Post, Team Global, DHL, Star Track, Toll, plus generic/plain) × {desktop thermal, 4×6 thermal, A4 dot-matrix, courier pouch sticker} × {clean, low light, glare, 30° tilt, crumpled, thermal fade, over-sticker}.
- `real/` — founder-provided phone photos with personal data redacted; the founder's real labels are the only ground truth for *carrier layout variety* and they must be **redacted before they enter the repo** (AGENTS.md safety + NZ Privacy Act).
- `labels.jsonl` — per image: `image`, `carrier`, `layout`, `lighting`, `expected_address_text`, `expected_linz_address_id` (nullable), `expected_block` ∈ {recipient, sender, marketing, barcode, other}, `difficulty`.
- **Ground-truth rule:** `expected_block` must be annotated by a human, not inferred, because the whole point of the ≤ 1 % wrong-block target is that the *sender* block looks like an address.

**Metrics (fixed before choosing):**
- `recipient_accuracy` = % of images where the extracted block, after D8/LINZ correction, equals `expected_linz_address_id` — target **≥ 97 %**.
- `wrong_block_rate` = % of images where the extracted block is annotated `sender` (or any non-recipient) — target **≤ 1 %**.
- `p50 / p95 end-to-end latency` per label on the CI emulator **and** one mid-range Android profile, including capture → detect → recognise → classify → D8-correct — target **≤ 1.5 s p95**.
- `ocr_char_accuracy` on the recipient block only, and `ocr_char_accuracy` on the sender block (to detect the classifier's failure mode).
- `time_to_first_stable_capture` — the auto-capture trigger must not fire on a half-focused frame.

**Top-3 to benchmark on the same set, same device profile, same metrics:** (1) `react-native-vision-camera-ocr-plus` (ML Kit, bundled Latin script, scan-region crop + frame skipping); (2) `pedrol2b/react-native-vision-camera-mlkit` (ML Kit via Nitro hooks); (3) `RapidOCR`/PP-OCRv5-mobile ONNX (FOSS fallback). Barcode assist is measured separately with `react-native-nitro-zxing`.

**Published table + raw results →** `docs/squads/scanner/benchmarks/` and `docs/evidence/`.

## What's new in 2026 and what we adopt

1. **PP-OCRv6 (2026)** — tiny det 1.9 MB / small det 9.6 MB, and a 6.1× speed-up over PP-OCRv5_mobile on Apple M4 PaddlePaddle (0.96 s vs 5.82 s). *We adopt:* the **tiny/small mobile tier** as the FOSS fallback; we will not take `medium`.
2. **VisionCamera v5 + Nitro (2026)** — v4 archived, v5 Nitro-based with a GPU resizer and frame processors. *We adopt:* the v5 frame-processor pipeline (already on v5.2.3) and the **resize plugin** idea (resize before OCR = the cheapest latency win).
3. **`react-native-nitro-zxing` (created 2026-08-25)** — a 2026-born, C++ Nitro barcode decoder that beats ML Kit 2.6–10.2× on the vendor's own benchmark. *We adopt:* barcodes only, behind an interface. (This is one of the three required "newer/smaller challengers" in §12.6.)
4. **ML Kit Text Recognition v2 structure output** — blocks/lines/elements/symbols with confidence and recognised language. *We adopt:* element-level confidence as the **classifier feature** for recipient-vs-sender.
5. **Third-party 2026 on-device OCR benchmark (prasad.tech, 2026-08-19)** — Apple Vision 85.4 % F1, **ML Kit 75.5 %**, PP-OCRv4 74.7 %, tesseract.js 59.0 %; and tesseract.js **cannot run in Hermes at all**. *We adopt:* the conclusion that Tesseract-class engines are the wrong tier, and the *method* (benchmark on the runtime you ship, not on a laptop). Treated as a **lead, not a verdict** — it is one blog on 778 non-NZ images.
6. **HF model hub 2026** — the OCR frontier is now VLM-based (`DeepSeek-OCR`, `GLM-OCR`, `Unlimited-OCR`, `dots.ocr`), all server-class. *We adopt:* the rule that they are out of scope for the phone, and the licence-verification discipline (their HF `cardData.license` came back **empty** for every one of them).

## The pipeline this research commits us to

The scanner squad's requirement is an **address-only** result, so the pipeline has to carry **position and confidence**, not just text. The decision above fixes the components; the stage budget below fixes what we measure. Every duration is **UNVERIFIED** until the eval set exists — the numbers are the *budget we will hold ourselves to*, not measurements.

| # | stage | component (from the decision) | budget p95 | notes |
|---|---|---|---|---|
| S1 | capture + focus lock + auto-capture gate | VisionCamera v5 | ~200 ms | the driver triggers; the gate must not fire on a blurred frame |
| S2 | ROI detection + resize | VisionCamera frame processor + a C++/GPU resize (Metal/Vulkan) | ~40 ms | cropping to the label is the cheapest accuracy **and** latency win |
| S3 | text detection + recognition | ML Kit Text Recognition v2, **bundled** Latin script (≈ 4 MB per architecture) | ~450 ms | returns blocks/lines/**elements** with bounding boxes, rotation, **confidence** and recognised language |
| S4 | address-block classifier (recipient vs sender) | **our own** rules over S3's element geometry + confidence + barcode positions | ~20 ms | no off-the-shelf NZ model exists (HF sweep) — so this is ours to build and to test |
| S5 | NZ address parse | `packages/nz-address` (TS, already in the repo) | ~1 ms | deterministic, no model |
| S6 | D8 correction against LINZ | the on-device FTS5 slice in op-sqlite (`SqliteAddressStore`) | ~150 ms | the address squad's server-side budget is < 2 s p95; on device the query is scoped to one road |
| S7 | barcode dedupe / tracking link | `react-native-nitro-zxing` (zxing-cpp) — vendor numbers: **13.1 ms** per 1280×720 YUV frame | ~20 ms | optional; skips the label when a barcode already identifies the parcel |
| — | **total** | | **≤ 1.5 s** | the squad's release gate |

**Batch mode (200+ parcels, ≤ 1.5 s per parcel):** the same pipeline on a *still* capture rather than a live frame — S3 becomes "recognise a still" (`photo OCR`, 21.7 ms for the barcode path per the same vendor benchmark) and S1 is replaced by a "tap the next parcel" trigger. The savings come from removing the live-search and stabilisation phases; the remaining cost is dominated by S3 and S6.

**Why the classifier is ours (not a model):** the HF sweep found **no credible open NZ address-parsing or address-block-classification model** — the top "address" models are Indian-address NER and a US autofill model. So S4 is a rules engine over ML Kit's structural output: sender blocks are (a) above or below the recipient block on the label, (b) preceded by "From:" / "Sender:" / "Ship from:", (c) associated with the **origin** postcode when the label carries one, and (d) the block nearest the barcode when the carrier prints the barcode in the sender band. Each rule is a *test case* in `docs/squads/scanner/eval/labels.jsonl` with the annotation `expected_block`.

**Confidence propagation:** ML Kit gives a per-element confidence; the classifier turns it into a *block* confidence; the D8 engine then returns its own `confidence` and `needs_question`. The rule we adopt from the ML Kit v2 docs: **the final confidence is the product of the two**, and when it falls below the squad's threshold the app asks **one** question rather than guessing. This is the single mechanism that protects the ≤ 1 % wrong-block target: a wrong answer is only ever produced when *both* stages were confident.

## Decision

**ADOPT (phase 1 — the scanner squad's stack):**
1. **`margelo/react-native-vision-camera` 5.2.3** (MIT) — already installed; camera + frame processors. **KEEP** the pin.
2. **ML Kit Text Recognition v2, bundled Latin script** (~4 MB per arch) via **`jamenamcinteer/react-native-vision-camera-ocr-plus`** (MIT) *or* **`pedrol2b/react-native-vision-camera-mlkit`** (MIT) — both benchmarked before we pick; the plugin layer is a thin adapter we own, so switching is cheap.
3. **`margelo/react-native-nitro-zxing`** (MIT) + **zxing-cpp** (Apache-2.0) — barcode assist and parcel dedupe only.
4. **`mrousavy/vision-camera-resize-plugin`**-style resizing before OCR (own the equivalent in our frame processor if the plugin does not fit Expo SDK 58).
5. Our **own** address-block classifier (rules + features from ML Kit element confidence/geometry). No off-the-shelf NZ address-block model exists (§ Hugging Face sweep) — and none should be trusted without our own eval set.

**ADOPT (phase 2 — the FOSS fallback, required by our own licence policy):** **RapidAI/RapidOCR** (Apache-2.0) running **PP-OCRv5/PP-OCRv6 tiny or small ONNX** models, behind the same `TextRecogniser` interface. `zxing-cpp` covers barcodes in the meantime.

**WATCH:** `opencv` (glare/perspective correction for crumpled labels, only if the baseline misses), `google-ai-edge/mediapipe` (unused pipeline), `onnxruntime` (runtime, transitive), `ahmeterenodaci/rn-mlkit-ocr` (young Expo-first ML Kit module), `rn-mlkit-ocr`, `juliansteenbakker/mobile_scanner` (Flutter parity reference), `mrousavy/vision-camera-resize-plugin`.

**REJECT:** `tesseract.js` (no Hermes support, lowest accuracy), `tesseract` (tier), `chineseocr_lite` (GPL-2.0), `Anyline` (commercial licence), `chandra` / `MinerU` / `EasyOCR` / `zerox` / `Unstructured` (server-class, break the on-device rule), `CRAFT-pytorch` (research artefact), `gev2002/react-native-vision-camera-text-recognition` (stale, v3-era), `journeyapps/zxing-android-embedded` (Activity-based, not frame processors), `BinaryEye` (app), `tony-xlh/react-native-document-scanner` (no licence), `dynamsoft`-class plugins (commercial).

**Fallback chain (per V4 §6.1, free-first):** ML Kit bundled → RapidOCR/PP-OCR ONNX → tesseract-class → **ask the driver one quick question**. No cloud OCR, ever: the requirement says no images are uploaded unless the driver chooses POD.

**Risks & fallback**
- *ML Kit is proprietary* → keep the FOSS path alive and record the Google dependency in `docs/LICENSES.md`; a GPL/AGPL engine is out of the APK per §2 of the constraints.
- *New native dependencies* (`react-native-worklets`, `react-native-vision-camera-worklets`, `react-native-nitro-image`) → each must be added with an exact pin, a licence entry, and a CI Android E2E run; `expo-updates` + VisionCamera v5 + Nitro is an untested combination **for us** — first native build is the risk.
- *Unbundled ML Kit stalls on first use* → bundle the Latin-script model.
- *Frame processing battery* → frame skipping + crop + a "stable frame" auto-capture gate; the ≤ 1.5 s budget is a *median driver flow*, not a sustained 30 FPS OCR loop.
- *Wrong-block failures are silent* → the classifier must return a confidence and the UI must ask one question when below threshold, rather than guess.

## Monthly radar filter (V4 §11.3) — what we will re-check for this area

Re-run on the first Monday of each month and update this file:
- **margelo/react-native-vision-camera** — releases (12 in 12 months is the pace) and the v5 changelog; a frame-processor API break means a plugin rebuild.
- **jamenamcinteer/react-native-vision-camera-ocr-plus** and **pedrol2b/react-native-vision-camera-mlkit** — releases, Expo SDK compatibility (their READMEs target SDK 54; ours is 58) and any new peer dependency.
- **margelo/react-native-nitro-zxing** — it was created 2026-08-25 at v0.1.0 with 831 dl/week; watch for the first non-alpha release and for the zxing-cpp version it pins.
- **zxing-cpp** — 7 releases/12 m, 7 maintainers/90 d; a major version means a re-pin and a re-benchmark of S7.
- **PaddlePaddle/PaddleOCR + RapidAI/RapidOCR** — PP-OCRv6 model sizes and the ONNX export path; our FOSS fallback depends on a **tiny/small** model staying under a few MB.
- **Google ML Kit** — the text-recognition v2 docs (bundled/unbundled sizes, the API level floor) and any change to the "Android Data Disclosure" terms.
- **Hugging Face OCR leaderboard** — watch for a *small* (< 20 MB) recogniser with a permissive licence; nothing like that exists today.
- Filters to apply: release in the last 6 months · permissive licence (or an explicitly accepted proprietary one) · New-Arch/Expo-SDK-58 ready · Android API 34+ · on-device and offline · ≥ 2 active maintainers in 90 days · no supply-chain incident.


## What we could not verify

- **Every accuracy and latency number in this file** — the eval set does not exist. UNVERIFIED.
- **Whether ML Kit bundled really costs ~4 MB per script per architecture in *our* APK** (the figure is Google's, measured on their reference build). UNVERIFIED.
- **Model-weight licences for every Hugging Face model listed** — the HF API returned an empty `cardData.license`; only the PaddlePaddle org's own statements say Apache-2.0. UNVERIFIED.
- **PP-OCR ONNX latency on a mid-range Android** — the published numbers are server hardware (A100/M4/Xeon). UNVERIFIED.
- **`react-native-vision-camera-ocr-plus` under Expo SDK 58** — its README says Expo 54; ours is 58. Probably fine, not proven. UNVERIFIED.
- **The third-party benchmark (Apple Vision 85.4 / ML Kit 75.5 / PP-OCRv4 74.7 / tesseract.js 59.0 F1)** — one blog, 778 images, not NZ labels, not our runtime for every row. Treated as a lead only.
- **Whether the ML Kit `text-recognition` (bundled) artifact is compatible with our Android API 34 target and our AGP/Gradle** — the docs say API 21+, but our build has never compiled it. UNVERIFIED.
- **Median issue response time** for every candidate (the REST API does not expose it). UNVERIFIED.
