# PHASE 3.1 evidence — CI, Android emulator gate and release workflow

Date: 2026-10-20
Branch: `feat/3.1-ci-and-android-e2e`

## What was added

| File | Purpose |
|---|---|
| `.github/workflows/ci.yml` | the quality gate on every push and PR: `pnpm lint`, `pnpm typecheck`, `pnpm test` (JS packages + the Python API) and gitleaks |
| `.github/workflows/android-e2e.yml` | builds the debug APK, starts the emulator (API 34, google_apis, x86_64, animations off), installs the APK and runs the Maestro flows; uploads the APK, the Maestro artifacts and the logcat |
| `.github/workflows/release-apk.yml` | builds a signed release APK on a `v*` tag and attaches it to the GitHub Release; falls back to the unsigned debug APK when the signing secrets are missing (and says so) |
| `.maestro/*.yaml` | the flows: `login`, `today-list`, `map`, `delivered`, `compat` |
| `.maestro/run-all.sh` | starts the auth service (in-memory DB), installs the APK and runs every flow, failing the job if any flow fails |
| `apps/mobile/app/compat.tsx` | the B.7 compatibility screen: sherpa-onnx, VisionCamera, MapLibre v11, op-sqlite, expo-audio and Reanimated, each with a stable `testID` |
| `docs/evidence/b7/README.md` | the B.7 gate description and why it is still **NOT VERIFIED** |

## Verification done here

| Check | Result |
|---|---|
| `pnpm --filter mobile exec tsc --noEmit` | 0 errors (the compat screen and the new testIDs compile) |
| `pnpm --filter mobile test` | 6/6 passed |
| All workflow and Maestro YAML files parse (`yaml.safe_load`) | exit 0 |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` (whole workspace) | green — see `docs/evidence/phase-2.4/` |

## Not verified

- **The CI run was not observed from this machine.** `gh` is installed but not authenticated (the
  `GITHUB_TOKEN` is a founder item in `docs/FOUNDER_TODO.md`), so the workflows were not run here.
  They trigger on the pushed branch, and the run link has to be added to `docs/evidence/b7/README.md`.
- The emulator run, the Maestro flows and the APK build are therefore **NOT VERIFIED**; the B.7 row in
  `docs/PROGRESS.md` stays NOT VERIFIED until a green run is linked and the artifacts are downloaded.
