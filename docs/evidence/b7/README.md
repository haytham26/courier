# B.7 — Android compatibility gate

Status: **NOT VERIFIED** (see "Why this is not a PASS" below).

Date of this file: 2026-10-20
Branch: `feat/3.1-ci-and-android-e2e`

## What the gate covers

The compatibility screen (`apps/mobile/app/compat.tsx`) exercises every native module the
product depends on and prints a stable `testID` per module:

| Module | What the screen does | Expected outcome on the CI emulator |
|---|---|---|
| sherpa-onnx | imports `react-native-sherpa-onnx/stt` and `/tts` and checks the engine factories exist | `skipped` — the native module is linked, but the ONNX model asset is not bundled in the repository yet |
| VisionCamera | `getAllCameraDevices()` + `VisionCamera.requestCameraPermission()` | `ok` on the emulator (it has a virtual camera) |
| MapLibre v11 | checks the native `Map` component is exported | `skipped` — the native view is available, the offline PMTiles archive is not built yet |
| op-sqlite | creates a table, writes a row and reads it back | `ok` |
| expo-audio | `requestRecordingPermissionsAsync()` (this is the voice permission prompt) | `ok` after the permission is granted |
| Reanimated 4 | schedules `withTiming` on the UI runtime | `ok` |

A module that cannot be exercised reports `skipped` with the reason — it never reports a false `ok`.

## How it runs

- `.github/workflows/android-e2e.yml` builds the debug APK (`expo prebuild` + `gradlew assembleDebug`),
  starts the emulator with `reactivecircus/android-emulator-runner@v2` (API 34, google_apis, x86_64,
  animations off), installs the APK and runs the Maestro flows in `.maestro/`:
  `login.yaml`, `today-list.yaml`, `map.yaml`, `delivered.yaml`, `compat.yaml`.
- The auth service (`services/auth`) is started by `.maestro/run-all.sh` with an in-memory database so
  the app can actually sign up; the emulator reaches the host on `10.0.2.2:3001`.
- The workflow uploads the APK, the Maestro reports/screenshots and the logcat.

## Why this is not a PASS yet

FINAL_PROMPT §0-F.1 only allows a PASS with a link to a green workflow run and the downloaded
artifacts. **The run has not been observed from this machine** (the `GITHUB_TOKEN` in
`docs/FOUNDER_TODO.md` is not available here, so the run cannot be watched or its artifacts
downloaded). The B.7 step stays **NOT VERIFIED** until:

1. a green run of `.github/workflows/android-e2e.yml` is linked from this file, and
2. the artifacts (APK, Maestro report, logcat) are downloaded into `docs/evidence/b7/`.

The PR that closes this gate must also update `docs/PROGRESS.md` (the B.7 row) and the
`docs/evidence/b7/` folder.

## Known gaps this gate will surface

- The sherpa-onnx STT/TTS model assets are not in the repository, so the "load a model and transcribe
  a sample" part of the gate can only report `skipped` until the models are added (model licence
  allow-list: `docs/MODEL_LICENSES.md`).
- The offline PMTiles archive for Canterbury is not built yet (Phase B.5), so the map check reports
  `skipped` as well.
