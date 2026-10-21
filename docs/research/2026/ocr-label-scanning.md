# Research 2026 — OCR label scanning (address-only, on-device, offline)

**Area:** Label Scanner squad (`docs/squads/scanner/`) · **Role:** Researcher (V4 §1 role 2, §3, §10.2, §12, §13.1)
**Research date: 2026-10-21.** Every star count, date, release tag, issue count and CI state below was read from the live GitHub GraphQL/REST API, the npm registry, the OSV API and the Hugging Face API **on 2026-10-21** (the GitHub API returns `stargazers_count` as a single current value — there is no historical stargazer series on our token's scopes). All dates are **UTC calendar dates**.
**Requirement (V4 §10.2, binding):** return the **delivery address only** (ignore sender, barcodes, marketing, phone numbers) · **fully on-device and offline** · **≤ 1.5 s per label** on a mid-range Android · **≥ 97 % correct recipient address** after LINZ correction · **≤ 1 % wrong-block** (sender picked) · batch mode for 200+ parcels.
**Our current state:** no scanner code exists (`docs/squads/scanner/README.md`: "Code: `apps/mobile/src/scanner (to be created)`"). `apps/mobile/package.json` pins `react-native-vision-camera` **5.2.3**, `react-native-nitro-modules` **0.37.1**, `expo-sqlite` **58.0.13**; `apps/mobile/app.json` has `"newArchEnabled": true`. **No OCR dependency is installed.** `app.json` sets **no** `android.minSdkVersion` (the ML Kit plugins need ≥ 24/26 — see S6).

## Queries run

| # | Query (via `scripts\gh.ps1` / registry APIs) | Filters | Results returned |
|---|---|---|---|
| Q1 | `search repos "ocr react native"` | `--sort stars`, limit 30 | 30 (only **one** with >1 ★ — Anyline, 111 ★, commercial; every other result has 0–1 ★: the RN OCR plugin space is empty) |
| Q2 | `search repos --topic ocr` | `--sort stars`, limit 30 | 30 |
| Q3 | `search repos --topic text-recognition` | `--sort stars`, limit 30 | 30 |
| Q4 | `search repos "text recognition"` | `--language kotlin --sort stars` | 30 |
| Q5 | `search repos "barcode scanner"` | `--language kotlin --sort stars` | 30 |
| Q6 | `search repos "shipping label"` | `--sort stars` | 30 (polluted — printing tools, no scanner) |
| Q7 | `api graphql` over 47 candidate repos | 1 query/repo: stars, created, pushed, licence, topics, open/closed issues, open PRs, releases (20), 90-day commit history + distinct authors, `statusCheckRollup` | 47 |
| Q8 | `api graphql` issues/PRs (10 repos) | 50 oldest closed issues (first-comment delay), 30 newest open issues, 20 newest open PRs | 10 |
| Q9 | `api repos/<o>/<r>/readme` (raw) | 4 READMEs | 4 |
| Q10 | `registry.npmjs.org` + `api.npmjs.org/downloads/point/last-week` | 12 packages | 12 |
| Q11 | `api.osv.dev/v1/query` | npm + PyPI ecosystems, 13 packages | 13 (2 advisories) |
| Q12 | `huggingface.co/api/models/<id>` | 11 OCR/VLM model cards | 11 |
| Q13 | webfetch `developers.google.com/ml-kit/vision/text-recognition/v2` + `/android` | official docs | 2 |
| Q14 | webfetch `op-engineering.github.io/op-sqlite/docs/installation/` | official docs | 1 |

**6-month trend PROXY (used for every card, because the stargazer history is unavailable to our token):** *releases in the last 12 months* + *commits in the last 90 days* + *distinct human maintainers in the last 90 days* (bot accounts excluded). "Maintainers" = distinct GitHub logins with a commit on the **default branch** in the window. Cards marked `NO_CI` have no status checks on the default-branch head commit.

## Candidates (47) — evidence cards

Format: `repo · stars · created · last release @ date · rel/12m · maint(90 d) · open/closed issues · open PRs · licence (code / weights / data) · platform · decision`.
Median first-response = median delay from issue creation to the **first comment**, over the **50 oldest closed issues** of each repo (a stable, reproducible sample that biases long-lived repositories downwards — read it as "how fast were the oldest complaints answered"). **UNVERIFIED** where the sample is < 5 issues.

1. **margelo/react-native-vision-camera** — https://github.com/margelo/react-native-vision-camera · 9,646 ★ · 2021-02-19 · `v5.2.3` @ 2026-08-20 · 18 rel/12m · 8 maint/90 d (56 commits) · 36 open / 2,124 closed · 84 open PRs · **MIT** / n/a / n/a · **on-device** (worklet frame processors, GPU resizer, built-in QR/barcode scanner) · npm 5.2.3 (2026-08-20) **353,105 dl/wk** · OSV 0 · CI rollup **FAILURE** on the head commit · first response median 0.48 h (n=46) · **ADOPT (keep the 5.2.3 pin)**
2. **margelo/react-native-nitro-zxing** — 91 ★ · **2026-08-25** · `v0.2.0` @ 2026-10-20 · 2 rel/12m · 1 maint/90 d (9 commits) · 0/1 · 3 PRs · **MIT** + zxing-cpp Apache-2.0 · on-device, pure-C++ Nitro, decodes the **luminance plane in place** · npm 831 dl/wk · **NO_CI** · first response n/a (0 closed issues) · **ADOPT (barcode only, behind an interface)**
3. **jamenamcinteer/react-native-vision-camera-ocr-plus** — 73 ★ · 2025-10-03 · `v2.0.7` @ 2026-08-29 · 20 rel/12m · 5 maint/90 d (15 commits) · 1/11 · 4 PRs · **MIT** + **ML Kit proprietary (Google Play Services terms, no OSS licence)** · on-device · npm 7,796 dl/wk · CI SUCCESS · median 19.4 h (n=11) · **ADOPT (primary OCR)**
4. **pedrol2b/react-native-vision-camera-mlkit** — 58 ★ · 2024-05-15 · `v2.0.1` @ 2026-08-20 · 4 rel/12m · 1 maint/90 d (23 commits) · 0/4 · 1 PR · **MIT** + ML Kit proprietary · on-device · npm 662 dl/wk · CI SUCCESS · median 731 h (n=4) · **ADOPT (the alternative; benchmark both)**
5. **ahmeterenodaci/rn-mlkit-ocr** — 31 ★ · 2025-12-07 · no release · 0 maint/90 d (last push 2026-01-22) · 0/3 · 0 PRs · MIT + ML Kit proprietary · on-device Expo module · **CI FAILURE** · **WATCH** (no release, no commits in 9 months)
6. **gev2002/react-native-vision-camera-text-recognition** — 93 ★ · 2024-05-25 · `#Release` @ 2024-08-12 · 0 rel/12m · 0 maint/90 d (last push **2024-08-30**) · 15/18 · 4 PRs · MIT + ML Kit proprietary · VisionCamera **v3** era · NO_CI · **REJECT** (26 months stale, pre-New-Arch)
7. **gev2002/react-native-vision-camera-barcodes-scanner** — 16 ★ · 2024-05-03 · `v2.0.1` @ 2024-08-28 · 0 rel/12m · 0 maint/90 d (last push 2024-08-30) · 0/2 · 3 PRs · MIT · **REJECT** (same staleness)
8. **pushpender-singh-ap/react-native-scanner** — 118 ★ · 2023-03-04 · `3.1.0` @ 2026-02-11 · 5 rel/12m · **0 maint/90 d** (last push 2026-04-10) · 1/34 · 12 PRs · MIT · barcode only, Turbo/Fabric · **CI FAILURE** · **WATCH** (barcode only; no OCR)
9. **luicfrr/react-native-vision-camera-face-detector** — 348 ★ · 2024-02-02 · `v2.2.0-0` @ 2026-09-18 · 15 rel/12m · 3 maint/90 d (18 commits) · 2/137 · 1 PR · MIT · on-device · NO_CI · **WATCH — reference for the plugin shape** of our own address-block classifier
10. **tony-xlh/react-native-document-scanner** — 43 ★ · 2022-11-09 · no release · 0 maint/90 d (last push 2025-09-11) · 0/5 · 0 PRs · **NOASSERTION (no licence)** · **REJECT** (no licence at all)
11. **mrousavy/vision-camera-resize-plugin** — 131 ★ · 2021-06-07 · `v3.2.0` @ 2024-12-06 · 0 rel/12m · 0 maint/90 d (last push 2026-03-23) · 13/27 · 18 PRs · MIT · C++/GPU resize before OCR · NO_CI · **WATCH** (copy the idea, not the dependency)
12. **zxing/zxing** — 34,171 ★ · 2011-10-12 · `zxing-3.5.4` @ 2025-11-11 · 1 rel/12m · 4 maint/90 d (7 commits) · 0/1,353 · 0 PRs · Apache-2.0 · Java · CI SUCCESS · **KEEP as the algorithm reference; REJECT as an RN dependency**
13. **zxing-cpp/zxing-cpp** — 2,062 ★ · 2016-04-12 · `v3.1.1` @ 2026-07-29 · 7 rel/12m · 7 maint/90 d (100 commits) · 41/563 · 5 PRs · **Apache-2.0** · on-device C++ · CI SUCCESS (3 OS) · median 13.4 h (n=48) · **ADOPT (via nitro-zxing)**
14. **journeyapps/zxing-android-embedded** — 5,936 ★ · 2012-11-28 · `v4.3.0` @ 2021-10-25 · 0 rel/12m · 0 maint/90 d (last push 2024-08-04) · 113/499 · 13 PRs · Apache-2.0 · Android Activity-based · **REJECT** (not a frame processor)
15. **markusfisch/BinaryEye** — 2,436 ★ · 2017-08-27 · `1.75.5` @ 2026-10-08 · 20 rel/12m · 4 maint/90 d (29 commits) · 157/272 · 2 PRs · MIT · an **app**, not a library · NO_CI · **REJECT as a dependency; KEEP as a reference for a fast Kotlin barcode loop**
16. **juliansteenbakker/mobile_scanner** — 1,176 ★ · 2022-02-08 · `v7.4.2` @ 2026-09-10 · 9 rel/12m · 7 maint/90 d (43 commits) · 123/855 · 13 PRs · **BSD-3-Clause** · Flutter · CI SUCCESS · median 11.1 h (n=46) · **REJECT (Flutter); KEEP as the feature-parity reference** (scanWindow, per-format control, torch policy)
17. **Anyline/anyline-ocr-react-native-module** — 111 ★ · 2016-12-05 · `v56.6.0` @ 2026-10-15 · 13 rel/12m · 2 maint/90 d · 0/99 · 0 PRs · **NOASSERTION (commercial, licence-gated)** · NO_CI · **REJECT** (not affordable/permittable)
18. **ismoy/BelZSpeedScan** — 21 ★ · 2025-02-10 · `1.0.14` @ 2026-03-09 · 2 rel/12m · 1 maint/90 d · 0/3 · **ARCHIVED** · MIT · KMP/Flutter · **REJECT**
19. **PaddlePaddle/PaddleOCR** — 91,423 ★ · 2020-05-08 · `v3.7.0` @ 2026-06-11 · 8 rel/12m · **1 maint/90 d (2 commits on `main`)** · 167/10,577 · 83 PRs · **Apache-2.0 code / Apache-2.0 weights (HF `cardData.license=apache-2.0`, verified 2026-10-21) / Apache-2.0 models** · Python, exportable to ONNX · CI SUCCESS · median 0.73 h (n=47) · **KEEP as the model source for the FOSS fallback**
20. **RapidAI/RapidOCR** — 8,214 ★ · 2021-01-04 · `v3.10.0` @ 2026-10-08 · 14 rel/12m · 9 maint/90 d (26 commits) · 20/306 · 6 PRs · **Apache-2.0 code + Apache-2.0 ONNX weights** · on-device (ONNX Runtime / OpenVINO / MNN / TensorRT; Android + iOS) · CI SUCCESS · median 2.9 h (n=50) · **ADOPT (the FOSS fallback engine)**
21. **tesseract-ocr/tesseract** — 77,080 ★ · 2014-08-12 · `5.5.3` @ 2026-07-24 · 2 rel/12m · 17 maint/90 d (89 commits) · 434/2,341 · 60 PRs · Apache-2.0 code / Apache-2.0 traineddata · CI SUCCESS · median 31.5 h (n=49) · **REJECT as the primary engine; KEEP as the last-resort fallback**
22. **naptha/tesseract.js** — 38,775 ★ · 2015-06-24 · `v7.0.0` @ 2025-12-15 · 1 rel/12m · **0 maint/90 d** (last push 2026-05-17) · 35/705 · 22 PRs · Apache-2.0 · WASM · npm **2,263,735 dl/wk** · **OSV GHSA-83rx-c8cr-6j8q** (insecure default configuration) · **REJECT**
23. **microsoft/onnxruntime** — 22,121 ★ · 2018-11-10 · `v1.31.0` @ 2026-10-09 · 20 rel/12m · 47 maint/90 d (100 commits) · 931/7,850 · 887 PRs · MIT · on-device runtime · **CI FAILURE** · **WATCH** (transitive, via RapidOCR)
24. **google-ai-edge/mediapipe** — 37,343 ★ · 2019-06-13 · `v1.1.1` @ 2026-10-14 · 6 rel/12m · 9 maint/90 d · 225/5,468 · 108 PRs · Apache-2.0 · CI SUCCESS · **WATCH** (no label/OCR pipeline in the box)
25. **google-ai-edge/LiteRT** — 3,505 ★ · 2024-09-04 · `v2.3.0` @ 2026-10-07 · 13 rel/12m · 28 maint/90 d (100 commits) · 84/408 · 3,073 PRs · Apache-2.0 · CI SUCCESS · median 32.6 h (n=50) · **WATCH** — the TFLite runtime; note its open memory-safety issues (#11018 heap OOB, #10753, #10743, #9255)
26. **opencv/opencv** — 91,247 ★ · 2012-07-19 · `4.14.0` @ 2026-07-19 · 3 rel/12m · 27 maint/90 d (100 commits) · 2,550/9,206 · 300 PRs · Apache-2.0 · on-device C++/AAR · **NO_CI** on the head commit · **WATCH** (perspective correction for crumpled labels — only if the baseline misses)
27. **clovaai/CRAFT-pytorch** — 3,407 ★ · 2019-06-04 · no release · 0 maint/90 d (last push 2024-07-16) · 96/89 · MIT + PyTorch weights · **REJECT** (research artefact)
28. **datalab-to/chandra** — 12,518 ★ · 2025-10-08 · `v0.2.0` @ 2026-03-18 · 8 rel/12m · 0 maint/90 d (last push 2026-06-26) · 49/26 · 14 PRs · Apache-2.0 code / HF weights licence **openrail** (NOT empty — the previous note in this file was wrong) / 1,469,199 HF downloads · server-class model · **REJECT** (too big for the phone)
29. **opendatalab/MinerU** — 82,132 ★ · 2024-02-29 · `mineru-4.0.12-released` @ 2026-10-11 · 20 rel/12m · 2 maint/90 d (100 commits) · 14/2,390 · **NOASSERTION** · **REJECT** (server PDF, no clear licence)
30. **getomni-ai/zerox** — 12,248 ★ · 2024-07-21 · `v0.1.06` @ 2024-12-18 · 0 rel/12m · 0 maint/90 d (last push 2025-05-20) · 71/36 · MIT · sends the image to an LLM · **REJECT** (violates "no images uploaded" and on-device/offline)
31. **JaidedAI/EasyOCR** — 30,093 ★ · 2020-03-14 · `v1.7.2` @ 2024-09-24 · 0 rel/12m · 0 maint/90 d (last push 2025-12-05) · 477/610 · Apache-2.0 · Python/PyTorch · **REJECT**
32. **DayBreak-u/chineseocr_lite** — 12,350 ★ · 2020-02-27 · no release · 0 maint/90 d (last push 2026-05-18) · 252/127 · **GPL-2.0** · **REJECT** (copyleft in the APK; Chinese-only)
33. **expo/expo** — 52,873 ★ · 2016-08-15 · 20 rel/12m · 37 maint/90 d · 325/19,515 · 605 PRs · MIT · `expo-camera` 58.0.11 (2026-10-19), `expo-sqlite` 58.0.13 (1,123,928 dl/wk) · **KEEP** (Expo Camera = the fallback if VisionCamera misbehaves); **REJECT expo-sqlite as the app DB** (see the sync file)
34. **jonathanpalma/react-native-tesseract-ocr** — 595 ★ · 2016-09-04 · no release · 0 maint/90 d (last push 2025-11-18) · 0/92 · MIT · **REJECT**
35. **aiptimizer/TurboOCR** — **1,139 ★** · **created 2026-03-20** · `v3.6.0` @ 2026-09-27 · 20 rel/12m · 2 maint/90 d (17 commits) · 0/25 · 0 PRs · MIT · PP-OCRv6 + TensorRT FP16 + FastAPI/gRPC · CI SUCCESS (6 jobs) · **REJECT for the phone (GPU server); KEEP as the FP16-quantisation reference**
36. **arcships/light-ocr** — **640 ★** · **created 2026-07-14** · `v0.5.8` @ 2026-09-24 · 11 rel/12m · 2 maint/90 d (79 commits) · 1/7 · 1 PR · Apache-2.0 · PP-OCRv6 for Node.js/C++ with Core ML / WebGPU / Vulkan · CI SUCCESS (6 platform jobs) · **WATCH** (no React Native path; a candidate if we ever run the fallback in a Node sidecar)
37. **run-llama/liteparse** — 12,893 ★ · **created 2026-02-09** · `docker-v2.16.0` @ 2026-10-12 · 20 rel/12m · 12 maint/90 d (100 commits) · 23/128 · 22 PRs · Apache-2.0 · CI SUCCESS · **REJECT** (server-side document parsing)
38. **opendataloader-project/opendataloader-pdf** — 29,752 ★ · 2025-05-13 · `v2.5.13` @ 2026-10-13 · 20 rel/12m · 9 maint/90 d · 64/155 · Apache-2.0 · **REJECT** (server PDF)
39. **mindee/doctr** — 6,391 ★ · 2021-01-08 · `v1.1.0` @ 2026-08-21 · 2 rel/12m · 10 maint/90 d (50 commits) · 19/434 · Apache-2.0 · Python/TF · **REJECT**
40. **open-mmlab/mmocr** — 4,750 ★ · 2021-04-07 · `v1.0.1` @ 2023-07-04 · 0 maint/90 d (last push 2024-11-27) · 161/741 · Apache-2.0 · **REJECT** (stale)
41. **googlesamples/mlkit** — 4,303 ★ · 2020-05-28 · `1.0` @ 2020-07-27 · 0 maint/90 d · 221/668 · Apache-2.0 · **KEEP as the reference sample apps for the ML Kit API contract**
42. **SuperMonster003/AutoJs6-Plugin-Paddle-OCR-PP-OCRv5** — 19 ★ · **created 2026-03-15** · `v1.0.4` @ 2026-09-20 · 3 rel/12m · 1 maint/90 d (28 commits) · 1/0 · **MPL-2.0** · CI SUCCESS · **REJECT** (AutoJs6, not RN) — but a **2026 reference for shipping PP-OCRv5 on-device**
43. **LeanBitLab/LeanType-OCR-Plugin** — 13 ★ · **created 2026-09-04** · `v1.0.1` @ 2026-09-05 · 2 rel/12m · 0 maint/90 d (12 commits) · 0/1 · **GPL-3.0** · **REJECT** (copyleft)
44. **yomihon/yomihon** — 136 ★ · 2025-09-14 · `v0.4.3` @ 2026-10-18 · 12 rel/12m · 3 maint/90 d (24 commits) · 14/16 · Apache-2.0 · CI SUCCESS (a **"Prepare Models"** CI step) · **WATCH — the best reference found for shipping model weights inside an APK legally**
45. **privatenumber/mac-ocr** — 539 ★ · **created 2026-06-13** · `v1.2.1` @ 2026-10-17 · 5 rel/12m · 1 maint/90 d (11 commits) · 0/0 · MIT · CI SUCCESS · **REJECT (macOS); KEEP as the Apple-Vision reference for the iOS path later**
46. **Nimesh-WeyBee/text_ocr_react_native_vision_camera** — 0 ★ · 2025-07-31 · no release · 0 maint/90 d · 0/0 · **NOASSERTION** · **REJECT** (no licence, no code)
47. **HenryCordes/paperwork-app-native** — 0 ★ · **created 2026-06-24** · no release · 1 maint/90 d (3 commits, last push 2026-07-28) · 0/0 · **NOASSERTION** · **REJECT** (no licence)

**Rejected in bulk (not carded individually, all read on 2026-10-21):** `hiroi-sora/Umi-OCR` (48,067 ★, MIT, desktop) · `ocrmypdf/OCRmyPDF` (35,103 ★, MPL-2.0, server) · `paperless-ngx/paperless-ngx` (46,913 ★, GPL-3.0) · `Unstructured-IO/unstructured` (15,579 ★, Apache-2.0, server) · `opendataloader-project` (server) — **REJECT**, all server-side or desktop.

**Hugging Face model sweep (weights licence + downloads + last update, read 2026-10-21):**

| model | downloads | likes | last updated | HF licence | decision |
|---|---|---|---|---|---|
| `PaddlePaddle/PP-OCRv5_mobile_det_onnx` | 80,131 | 0 | 2026-06-10 | **apache-2.0** (`cardData.license` + `license:apache-2.0` tag) | **CANDIDATE (FOSS fallback detector)** |
| `PaddlePaddle/PP-OCRv5_mobile_rec_onnx` | 6,585 | 0 | 2026-06-10 | **apache-2.0** | candidate (recogniser) |
| `PaddlePaddle/en_PP-OCRv5_mobile_rec` | 185,036 | 3 | 2025-08-29 | **apache-2.0** | candidate (English) |
| `PaddlePaddle/latin_PP-OCRv5_mobile_rec` | 33,955 | 8 | 2025-10-16 | **apache-2.0** | candidate (**Latin = NZ**) |
| `PaddlePaddle/PP-OCRv5_mobile_rec` | 40,439 | 16 | 2025-07-22 | **apache-2.0** | candidate (multilingual) |
| `PaddlePaddle/PP-OCRv6_medium_rec_onnx` | 60,143 | 26 | 2026-06-18 | **apache-2.0** | REJECT (too big) |
| `microsoft/trocr-base-printed` | 255,508 | 228 | 2024-05-27 | **EMPTY (no `license:` field at all)** | REJECT (no licence + single-line only + stale) |
| `datalab-to/chandra-ocr-2` | 1,469,199 | 566 | 2026-06-26 | `openrail` | REJECT (server-class) |
| `deepseek-ai/DeepSeek-OCR` | 2,090,372 | 3,449 | 2025-11-04 | `mit` | REJECT (server-class VLM) |
| `zai-org/GLM-OCR` | 1,717,806 | 2,165 | 2026-09-11 | `mit` | REJECT (server-class VLM) |
| `baidu/Unlimited-OCR` | 1,981,704 | 4,836 | 2026-10-14 | `mit` | REJECT (server-class VLM) |

**Correction to the previous version of this file:** the PaddlePaddle model cards **do** carry `license: apache-2.0` (verified via `cardData.license` *and* the `license:` tag) — the "UNVERIFIED / empty" claim was wrong. The licence field is genuinely **empty** only for `microsoft/trocr-base-printed` (and for several of the small trocr cards). Model **size** numbers are UNVERIFIED in this sprint: the official PaddleOCR model-size table was not re-read; the vendor benchmark in #20's README is the only measured latency we have and it is on the vendor's own hardware.

**Address-NER / block-classification models on HF:** the top `address` hits are Indian-address models and a US autofill model; there is **no credible open NZ address-block classifier** (search re-run 2026-10-21). ⇒ the recipient-vs-sender classifier is **ours to build**; no downloaded model is proposed.

**Security advisories + supply chain (OSV API, 2026-10-21).** npm: `react-native-vision-camera` **0** · `@op-engineering/op-sqlite` **0** · `react-native-nitro-modules` **0** · `react-native-nitro-zxing` **0** · `react-native-nitro-sqlite` **0** · `@powersync/react-native` **0** · `expo-sqlite` **0** · `expo-camera` **0** · `react-native-vision-camera-ocr-plus` **0** · `react-native-vision-camera-mlkit` **0** · `dexie` **1** (GHSA-3xgx-r9j4-qw9w, prototype pollution) · `tesseract.js` **1** (GHSA-83rx-c8cr-6j8q, insecure default configuration) · PyPI `rapidfuzz` **0**. No known supply-chain incident was found in any candidate we propose to adopt. **Not verified:** the *model-weight* supply chain (ONNX files fetched at build time are outside OSV's npm/PyPI coverage) — our FOSS fallback must pin the model **hash**, not just the name.

**CI / test status, per area (the `statusCheckRollup` state on the default-branch head commit, 2026-10-21).** SUCCESS: `ocr-plus`, `mlkit`, `zxing-cpp`, `zxing`, `RapidOCR`, `PaddleOCR`, `tesseract`, `mediapipe`, `LiteRT`, `mobile_scanner`, `TurboOCR`, `light-ocr`, `liteparse`, `opendataloader-pdf`, `doctr`, `yomihon`, `mac-ocr`, `AutoJs6-Plugin`, `LeanType-OCR-Plugin`. FAILURE: `react-native-vision-camera`, `rn-mlkit-ocr`, `react-native-scanner`, `onnxruntime`. **NO_CI** (no checks on the head commit): `nitro-zxing`, `gev2002/*`, `document-scanner`, `resize-plugin`, `BinaryEye`, `Anyline`, `opencv`, `CRAFT-pytorch`, `zerox`, `EasyOCR`, `chineseocr_lite`, `react-native-tesseract-ocr`, `mmocr`, `Nimesh-WeyBee/…`. **A repo with no CI is a "no test signal", not a "no bug" signal** — for a critical dependency we add our own CI job.

**Production users — only what is verified (2026-10-21).**
- **react-native-vision-camera** — 353,105 npm downloads/week; the repository's own topics list **snapchat** and **instagram**; 9,646 ★.
- **op-sqlite** — 417,985 npm dl/week and the SQLite layer of PowerSync's React Native SDK (see the sync file).
- **ML Kit** — ships in Google Play Services, i.e. it is already on most Android phones; unbundled models are downloaded through Play Services.
- **RapidOCR** — a commercial deployment is listed in PaddleOCR's own community-projects file (PR #18398, 2026-10-18) — a named commercial deployment.
- **zxing-cpp** — the decoding engine behind `zxing-android-embedded` and many commercial scanners.
- **Photon** — komoot's own geocoder (address file).
- **VLM OCR (DeepSeek-OCR, GLM-OCR, Unlimited-OCR)** — 1.5–2.1 M HF downloads each, but all server-class.

**Docs quality (read 2026-10-21).** Excellent: `react-native-vision-camera` (visioncamera.margelo.com + a v4 snapshot archive), `ocr-plus` (README + MIGRATION.md + example app), `mlkit` (per-platform Gradle/Podfile config blocks), `nitro-zxing` (README benchmark table), `RapidOCR` (multi-runtime docs), `op-sqlite` (an installation/configuration/gotchas site with the compile-clash matrix). Thin: `nitro-zxing` (one page, no API reference), `rn-mlkit-ocr` (README only, no releases), `pushpender-singh-ap/react-native-scanner` (no docs site). Adequate: `zxing-cpp` (Doxygen), `PaddleOCR` (multi-language docs), `tesseract` (wiki), `LiteRT` (site + issue tracker).

## Shortlist (12)

`react-native-vision-camera` · `react-native-vision-camera-ocr-plus` · `react-native-vision-camera-mlkit` · `react-native-nitro-zxing` · `zxing-cpp` · `RapidOCR` · `PaddleOCR` · `google-ai-edge/LiteRT` · `mobile_scanner` (parity reference) · `yomihon/yomihon` (model-weight shipping reference) · `arcships/light-ocr` · `mrousavy/vision-camera-resize-plugin`.

## Deep review — top 5

**1. margelo/react-native-vision-camera — the camera + frame-processor host.** README read. *Architecture:* v5 is Nitro-based (C++/Kotlin/Swift HybridObjects) with JS **frame processors** (worklets on a separate thread, zero-copy YUV planes) and a **C++/GPU resizer** (Metal/Vulkan). It ships a **built-in QR/barcode scanner** of its own — so the barcode path has a first-party alternative to nitro-zxing, and open PR #4201 is already adding *ML Kit zoom suggestions* to that output and #4214 *synchronous barcode image scanning* (the batch-mode path). *v4 is archived* (`react-native-vision-camera-v4-snapshot`) — every v3/v4-era plugin (cards #6, #7) is a dead end. *Maintenance:* 8 maintainers/90 d, 56 commits/90 d, 18 releases/12 m, 9,646 ★, 353,105 npm dl/week (production use: the repo's own topics list **snapchat** and **instagram**). *Open critical issues (read 2026-10-21) — these are **ours**: #4213 "Each FrameOutput leaks its native thread (dispose() doesn't shut down the executor; useFrameOutput never disposes)" · #4219 "any JS exception inside a frame callback kills the process" · #4209 "iOS SIGABRT in `detachFromFigCaptureSession` when a CameraSession is freed by Hermes GC — still on 5.2.3 **and** `main`" · #4180 "every `<Camera>` mount leaks its SurfaceView and camera output stream" · #4183 "resizer: **Vulkan shader is not packaged with AGP 9**" · #4210 "CameraX and ML Kit prebuilts prevent a complete GNU_RELRO-compatible package upgrade" (reports filed with Google). *CI:* the default-branch head rollup is **FAILURE** (jobs: Detect Changes, Format Kotlin, Build Android, Build iOS, Test Android, Test iOS). *Verdict:* **ADOPT (already installed)** — but the scanner squad must (a) pin the exact version, (b) treat the frame-thread leak and the crash-on-throw issue as **blocking** (an OCR plugin that throws inside a frame callback kills the process on iOS), and (c) re-check the CI rollup before the first native build.

**2. jamenamcinteer/react-native-vision-camera-ocr-plus — the primary OCR candidate.** README read. *Why:* it exposes exactly the three knobs the squad needs — **live OCR** (every frame), **photo OCR** (async from a still URI → the batch path and the "photo of a manifest" flow) and **scan-region cropping** + **configurable frame skipping** (`frameSkipThreshold`, default 10) — the two levers the ≤ 1.5 s budget depends on. It also exposes `useLightweightMode` (Android: skip corner points, languages and element data) — directly useful on a mid-range phone. *Structure:* ML Kit v2 returns **blocks / lines / elements / symbols** with bounding boxes, corner points, rotation, **confidence score** and **recognised language**; the per-element confidence is the feature our recipient-vs-sender classifier scores on. *Requirements:* RN ≥ 0.81 (we are 0.88 ✔), iOS 15.1, **Android minSdk 26 / target 36**, VisionCamera ≥ 5.0.0 (5.2.3 ✔), `react-native-worklets` 0.8.x (**not installed — new dependency**), Expo 54+ (we are 58 — probably fine, not proven). *Licence:* the code is MIT, but **ML Kit itself is proprietary** (Google Play Services terms) — unbundled ≈ **260 KB per script per architecture** with a dynamic model download, bundled ≈ **4 MB per script per architecture**, statically linked and available immediately (both figures are Google's, from the Android doc read 2026-10-21; **our APK delta is UNVERIFIED**). For a driver in a van with patchy connectivity the **bundled** model is the correct choice. *Open issues:* #154 "**Asynchronous OCR failures are silently swallowed on iOS and Android**" (fix in PR #155, unmerged) — we must not ship the silent-failure behaviour. *Verdict:* **ADOPT**, behind our own `TextRecogniser` interface.

**3. pedrol2b/react-native-vision-camera-mlkit — the alternative.** README read. *Difference:* Nitro-native, v5-only; v2 implements **text recognition + barcode scanning** for live frames **and static images**; the static-image APIs (`processImageTextRecognition`, `processImageBarcodeScanning`) need **no worklets and no camera**, which is exactly the batch-mode path — a genuine advantage over ocr-plus. *Unique feature:* **compile-time selective ML Kit dependencies** (`textRecognition`, `textRecognitionChinese/Devanagari/Japanese/Korean`, `barcodeScanning`) so an app that only needs Latin text recognition does **not** pay for the other models' binary size — directly relevant to our APK budget (≤ 80 MB, §6.4). *Requirements:* RN ≥ 0.86 ✔, iOS 15.1+, Android SDK 24+, VisionCamera ≥ 5 (Nitro v5, "not v4"), plus `react-native-vision-camera-worklets` + `react-native-worklets` and the worklets Babel plugin for the live hooks. *Maintenance:* 1 maintainer/90 d, 23 commits/90 d, 662 dl/wk, CI SUCCESS, median first response 731 h (n=4 — the maintainer answers, slowly). *Verdict:* **ADOPT as the co-candidate**; the choice between the two is cheap to make later and expensive to get wrong, so both go into the benchmark.

**4. margelo/react-native-nitro-zxing + zxing-cpp — the barcode path.** READMEs read. *Why:* our pipeline needs the courier barcode to dedupe parcels and link tracking numbers, and we should not pay ML Kit's price for it. This plugin decodes the **luminance (Y) plane in place** — no ML Kit, no base64 round-trip, no temp file — the correct architecture for a frame processor. *Vendor benchmark (its own README, **not our measurement**):* live 1280×720 YUV **13.1 ms** vs ML Kit 34.4 ms (2.6×); still 3060×4080 **21.7 ms** vs 59.3 ms (2.7×); bundled 256×256 QR **0.95 ms** vs 9.7 ms (10.2×). *Maturity:* **created 2026-08-25**, 91 ★, v0.1.0 (2026-10-08), 831 dl/wk, **1 maintainer**, **NO_CI**, 3 open PRs. Underneath, zxing-cpp is solid: 2,062 ★, Apache-2.0, 7 releases/12 m, 7 maintainers/90 d, 100 commits/90 d, CI SUCCESS on 3 OSes, median first response 13.4 h. *Verdict:* **ADOPT for barcodes only**, behind an interface, with VisionCamera's built-in scanner as the second option.

**5. RapidAI/RapidOCR — the FOSS fallback engine.** Release list, issues and PRs read. *Architecture:* the PP-OCR models packaged for ONNX Runtime / OpenVINO / MNN / TensorRT with **Android and iOS** builds and **no PaddlePaddle dependency** (PaddlePaddle itself would put ~2 GB of framework in the app). *Licence:* code **Apache-2.0**; the ONNX weights are published by the PaddlePaddle HF org and their cards carry **`license: apache-2.0`** (verified 2026-10-21) — but the **dictionary files** shipped with the recogniser were not audited → UNVERIFIED. *Maintenance:* 9 maintainers/90 d, 26 commits/90 d, 14 releases/12 m, v3.10.0 (2026-10-08), CI SUCCESS, median first response 2.9 h. *Live issues that matter to us:* #743 "PP-OCRv6 rec_medium / det_small: **denormal weights make CPU inference 4–11× slower** (zeroing them gives identical output)" and #719 "Arabic recognition crashes: python-bidi is required at runtime but is not a declared dependency" — both are CPU/mobile-relevant. *Production users:* the PaddleOCR repo's own community list gained an **InvoiceFlowAI RapidOCR integration** (PaddleOCR PR #18398, 2026-10-18) — a named commercial deployment. *Verdict:* **ADOPT as the documented FOSS fallback** (phase 2), behind the same `TextRecogniser` interface.

## Benchmark

**Status: UNVERIFIED — the evaluation set does not exist.** `docs/squads/scanner/benchmarks/README.md` = "Harness: _to be created with the first implementation_"; `docs/squads/scanner/STATUS.md` = "not measured yet"; `docs/squads/scanner/eval/` does not exist; `data/labels/` does not exist. **No number in this file may be claimed as "better than our current choice" until the table below is published.**

**The set to build (named, per V4 §10.2 / §12.5):** `docs/squads/scanner/eval/` with **≥ 300 real-style NZ courier label images**, gitignored under `data/labels/`:

- `synthetic/` — programmatically rendered labels for **8–10 NZ carriers/layouts** (CourierPost, NZ Post, Team Global, DHL, Star Track, Toll, plus generic/plain) × {desktop thermal, 4×6 thermal, A4 dot-matrix, courier pouch sticker} × {clean, low light, glare, 30° tilt, crumpled, thermal fade, over-sticker}.
- `real/` — founder-provided phone photos, **redacted before they enter the repo** (AGENTS.md safety + NZ Privacy Act 2020).
- `labels.jsonl` — per image: `image`, `carrier`, `layout`, `lighting`, `expected_address_text`, `expected_linz_address_id` (nullable), `expected_block` ∈ {recipient, sender, marketing, barcode, other}, `difficulty`.
- **Ground truth rule:** `expected_block` is annotated **by a human**, never inferred — the whole point of the ≤ 1 % wrong-block target is that the *sender* block looks exactly like an address.

**Metrics (fixed before choosing):** `recipient_accuracy` = % of images where the extracted block, after D8/LINZ correction, equals `expected_linz_address_id` → **≥ 97 %** · `wrong_block_rate` = % of images where the extracted block is annotated `sender`/non-recipient → **≤ 1 %** · `p50/p95` end-to-end latency (capture → detect → recognise → classify → D8-correct) on the CI emulator **and** one mid-range Android profile → **≤ 1.5 s p95** · `ocr_char_accuracy` on the recipient block and on the sender block separately (the classifier's failure mode) · `time_to_first_stable_capture` (the auto-capture gate must not fire on a half-focused frame).

**Top-3 to benchmark on the same set, device and metrics:** (1) `react-native-vision-camera-ocr-plus` (ML Kit **bundled** Latin, scan-region crop + frame skipping); (2) `react-native-vision-camera-mlkit` (ML Kit via Nitro, compile-time selective models, static-image path for batch); (3) `RapidOCR` / PP-OCRv5-mobile ONNX (the FOSS fallback). The barcode assist is measured separately with `react-native-nitro-zxing` vs VisionCamera's built-in scanner.

**Published table + raw results →** `docs/squads/scanner/benchmarks/` and `docs/evidence/`.

## The pipeline this research commits us to

| # | stage | component | p95 budget | notes |
|---|---|---|---|---|
| S1 | capture + focus lock + auto-capture gate | VisionCamera v5 | ~200 ms | must not fire on a blurred frame; **frame-thread leak #4213 is a blocker** |
| S2 | ROI detection + resize | VisionCamera frame processor + C++/GPU resize | ~40 ms | cropping to the label is the cheapest accuracy *and* latency win; **Vulkan shader missing under AGP 9 (#4183)** |
| S3 | text detection + recognition | ML Kit Text Recognition v2, **bundled** Latin (≈ 4 MB/arch, Google's number) | ~450 ms | returns blocks/lines/**elements** with boxes, rotation, **confidence**, recognised language |
| S4 | address-block classifier (recipient vs sender) | **ours** — rules over S3 geometry + confidence + barcode position | ~20 ms | no off-the-shelf NZ model exists ⇒ ours to build and to test |
| S5 | NZ address parse | `packages/nz-address` (TS, 404 lines, in-repo) | ~1 ms | deterministic, no model |
| S6 | D8 correction against LINZ | on-device FTS5 slice in op-sqlite (`SqliteAddressStore`) | ~150 ms | scoped to one road |
| S7 | barcode dedupe / tracking link | `react-native-nitro-zxing` (vendor: 13.1 ms per 1280×720 frame) **or** VisionCamera's built-in scanner | ~20 ms | optional; skips a label whose barcode already identifies the parcel |
| — | **total** | | **≤ 1.5 s** | the squad's release gate |

**Why the classifier is ours (not a model):** the HF sweep found **no credible open NZ address-block classifier** (the top "address" models are Indian-address NER and a US autofill model). So S4 is a rules engine over ML Kit's structural output: sender blocks are (a) above/below the recipient block, (b) preceded by "From:" / "Sender:" / "Ship from:", (c) associated with the **origin** postcode, (d) the block nearest the barcode in the sender band. Each rule is a test case in `labels.jsonl` with an `expected_block` annotation.

**Confidence propagation:** ML Kit gives a per-element confidence → the classifier turns it into a *block* confidence → the D8 engine returns its own `confidence` and `needs_question`. Rule adopted from the ML Kit v2 docs: **the final confidence is the product of the two**, and below threshold the app asks **one** question rather than guessing. That single mechanism is what protects the ≤ 1 % wrong-block target.

## What we are missing

Every row below is a capability that exists in the repos above and that we do not have. The CEO merges these into `docs/PARITY.md` (the task column is my proposal; ids marked *(new)* do not exist yet).

| # | feature | family | gap (why it matters) | task id |
|---|---|---|---|---|
| 1 | per-element confidence + recognised language | scanner OCR | no engine we have returns a confidence per word — our block classifier has nothing to score on | T7.8 |
| 2 | scan-region cropping | scanner performance | the ≤ 1.5 s budget depends on not OCR-ing the whole frame | T7.8 |
| 3 | configurable frame skipping | scanner performance | 30 fps OCR on a mid-range phone is a battery and latency bug | T7.8 |
| 4 | compile-time selective OCR models (only Latin in the APK) | scanner size | all five OCR scripts in the APK is ~20 MB we do not need | T7.8 |
| 5 | static-image OCR with no camera/worklets | scanner batch | the 200-parcel batch path needs a still-image API, not a frame processor | T7.8 |
| 6 | in-place luminance-plane barcode decoding (no ML Kit) | barcode | no licence-clean, no-Play-Services barcode path | T7.8 |
| 7 | synchronous barcode image scanning | barcode | VisionCamera PR #4214 — we have no barcode-from-still path | T7.8 |
| 8 | zoom suggestion in the barcode output | barcode UX | PR #4201 — a hint that helps the driver frame the label | T7.8 *(new)* |
| 9 | live on-device translation of the label | scanner | a non-NZ or multilingual address is unreadable today | T7.8 *(new)* |
| 10 | model management (delete downloaded models) | scanner storage | no way to reclaim the OCR model | T7.8 *(new)* |
| 11 | "lightweight mode" (skip corner points/languages/element data) | scanner perf | we would pay for data we never use | T7.8 *(new)* |
| 12 | an explicit "no usable address on this label" state | scanner correctness | ocr-plus #154 swallows async failures — we would show a wrong-block answer instead of an error | T7.8 |
| 13 | FP16 / int8 quantised recogniser | scanner perf | our FOSS fallback has no quantisation plan; TurboOCR/LiteRT both ship it | T7.8 *(new)* |
| 14 | runtime SQLite extension loading (`sqliteOptions.extensions`) | scanner + sync | no way to run our own C classifier inside the same SQLite process | T7.1 |

## Decision

**ADOPT (phase 1 — the scanner stack):**
1. **`margelo/react-native-vision-camera` 5.2.3** (MIT) — already installed; camera + frame processors + GPU resizer + a built-in barcode scanner. **KEEP the pin**; re-check the failing head CI before the first native build.
2. **ML Kit Text Recognition v2, bundled Latin** via **`jamenamcinteer/react-native-vision-camera-ocr-plus`** (MIT) *or* **`pedrol2b/react-native-vision-camera-mlkit`** (MIT) — both benchmarked before we pick; the plugin sits behind our own `TextRecogniser` interface, so switching is cheap. **ML Kit is proprietary** → record it in `docs/LICENSES.md` and keep the FOSS path alive.
3. **`margelo/react-native-nitro-zxing`** (MIT) + **zxing-cpp** (Apache-2.0) — barcode assist and parcel dedupe only, behind an interface.
4. A **C++/GPU resize before OCR** (the `vision-camera-resize-plugin` idea) implemented in our own frame processor if the plugin does not fit Expo SDK 58.
5. Our **own address-block classifier** (rules over ML Kit element confidence/geometry). No off-the-shelf NZ model exists, and none should be trusted without our own eval set.

**ADOPT (phase 2 — the FOSS fallback required by our licence policy):** **RapidAI/RapidOCR** (Apache-2.0) with **PP-OCRv5/PP-OCRv6 tiny-or-small ONNX** models (Apache-2.0 weights, verified on HF today) behind the same interface; `zxing-cpp` covers barcodes meanwhile.

**WATCH:** `google-ai-edge/LiteRT` (the TFLite runtime; watch its open memory-safety issues before adopting), `arcships/light-ocr` (2026, PP-OCRv6 for Node/C++ — a sidecar option), `aiptimizer/TurboOCR` (FP16 quantisation reference), `yomihon/yomihon` (how to ship model weights in an APK legally), `opencv` (glare/perspective correction, only if the baseline misses), `google-ai-edge/mediapipe` (unused pipeline), `microsoft/onnxruntime` (transitive runtime), `ahmeterenodaci/rn-mlkit-ocr` (young, no release), `pushpender-singh-ap/react-native-scanner` (barcode only), `mrousavy/vision-camera-resize-plugin`, `juliansteenbakker/mobile_scanner` (Flutter parity reference), `luicfrr/…face-detector` (plugin-shape reference).

**REJECT:** `tesseract.js` (no RN/Hermes path, OSV advisory, 0 maintainers in 90 d), `tesseract` (wrong tier), `chineseocr_lite` (GPL-2.0), `LeanBitLab/LeanType-OCR-Plugin` (GPL-3.0), `Anyline` (commercial), `chandra` / `MinerU` / `EasyOCR` / `zerox` / `Unstructured` / `liteparse` / `opendataloader-pdf` (server-class; they break the on-device/offline rule), `CRAFT-pytorch` (research artefact), `gev2002/…text-recognition` and `…barcodes-scanner` (stale, v3-era), `journeyapps/zxing-android-embedded` (Activity-based), `BinaryEye` (an app), `tony-xlh/react-native-document-scanner` and `Nimesh-WeyBee/…` and `paperwork-app-native` (no licence), `BelZSpeedScan` (archived), `open-mmlab/mmocr` (stale).

**Fallback chain (V4 §6.1, free-first):** ML Kit bundled → RapidOCR/PP-OCR ONNX → tesseract-class → **ask the driver one quick question**. **No cloud OCR, ever** — images are not uploaded unless the driver chooses POD.

**Risks & fallback**
- *ML Kit is proprietary* → the FOSS path must stay alive; record the Google dependency in `docs/LICENSES.md` (today that file shows every package as "unknown" — the licence gate is not yet producing real data).
- *VisionCamera's open critical issues* (#4213 frame-thread leak, #4219 throw-in-frame-callback kills the process, #4209 iOS GC abort, #4180 SurfaceView leak, #4183 AGP 9 Vulkan shader) — the first native build is the risk; we may have to hold at 5.2.3 and re-evaluate.
- *New native dependencies* (`react-native-worklets`, `react-native-vision-camera-worklets`, `react-native-nitro-image`) — each needs an exact pin, a licence entry and an Android E2E run; `expo-updates` + VisionCamera v5 + Nitro is an untested combination **for us**.
- *Unbundled ML Kit stalls on first use* → bundle the Latin model.
- *Wrong-block failures are silent* → the classifier must return a confidence and the UI must ask one question below threshold.

## Monthly radar filter (V4 §11.3)

- **react-native-vision-camera** — releases (18 in 12 months is the pace) and the head CI rollup; a frame-processor API break means a plugin rebuild; watch #4213/#4219/#4209 for fixes.
- **react-native-vision-camera-ocr-plus** and **react-native-vision-camera-mlkit** — releases, Expo SDK 58 compatibility (their READMEs target 54), new peer dependencies, and the #154 silent-failure fix.
- **react-native-nitro-zxing** — created 2026-08-25, is at v0.2.0 (2026-10-20) with 831 dl/wk and **no CI**: watch for v1.0.0, the first CI run, and the zxing-cpp version it pins.
- **zxing-cpp** — 7 releases/12 m, 7 maintainers/90 d; a major version means a re-pin and a re-benchmark of S7.
- **RapidOCR / PaddleOCR** — the PP-OCRv6 model sizes and the ONNX export path; our fallback depends on a **tiny/small** model staying under a few MB; watch #743 (denormal weights, 4–11× CPU slowdown).
- **Google ML Kit** — the text-recognition v2 docs (bundled/unbundled sizes, the API-level floor) and any change to the Android Data Disclosure terms.
- **Hugging Face OCR leaderboard** — watch for a small (< 20 MB) recogniser with a **permissive** licence; the licence field must be read, not assumed.
- Filters: release in the last 6 months · permissive licence (or an explicitly accepted proprietary one) · New-Arch/Expo-SDK-58 ready · Android API 34+ · on-device and offline · ≥ 2 active maintainers in 90 days · no supply-chain incident.

## What we could not verify

- **Every accuracy and latency number for our pipeline** — the eval set does not exist. UNVERIFIED.
- **Whether ML Kit bundled really costs ~4 MB per script per architecture in *our* APK** — Google's figure, measured on their reference build. UNVERIFIED.
- **The PP-OCRv6 model sizes and the ONNX latency on a mid-range Android** — the published numbers are server hardware; the vendor benchmark is the vendor's own. UNVERIFIED.
- **The RapidOCR dictionary files' licence** — not audited. UNVERIFIED.
- **Our own VisionCamera CI state** — the head rollup reads FAILURE but we did not open the run to see which job failed. UNVERIFIED (which job).
- **`react-native-vision-camera-ocr-plus` under Expo SDK 58** — its README says Expo 54; ours is 58. Probably fine, not proven. UNVERIFIED.
- **The median first-response times for cards with < 5 sampled issues** (ocr-plus n=11, mlkit n=4, nitro-zxing n=0) — sample too small. UNVERIFIED.
- **6-month star trend for every candidate** — the REST/GraphQL API exposes no historical stargazer count to our token. UNVERIFIED (we use releases + commits + maintainers as the proxy, stated in every card).
- **Whether the ML Kit bundled artifact compiles under our AGP/Gradle/API-34 target** — we have never built it. UNVERIFIED.
- **Note for the Release Manager:** `docs/squads/scanner/README.md` line 21 points at `docs/research/2026/on-device-ocr-label-scanning.md`; the file the task asked for is this one (`ocr-label-scanning.md`). The pointer needs fixing in a follow-up PR — this sprint was not allowed to edit any other file.

Corrected by the verifier pass of 2026-10-21 (VERIFICATION-C.md): 2 cards corrected.
