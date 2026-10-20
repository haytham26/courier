# 2026 research — the Expo SDK version (T2, D21)

Scope: the locked decision D21 ("Expo SDK 57 is locked") against the version the app
actually runs on (Expo SDK 58 / React Native 0.88). The question is not "is 58 new?" but
"does every native module in the product build and run on 58, and what does the official
changelog say?"

## 1. Candidates (the official release line)

| SDK | Released | React Native | Status |
|-----|----------|---------------|--------|
| SDK 55 | 2026-02 | 0.84 | superseded |
| SDK 56 | 2026-05 | 0.85 | superseded |
| SDK 57 | 2026-08 | 0.86 | the version D21 locked |
| **SDK 58** | **2026-10-15** | **0.88** | the version the app is on, and the current stable release |

Source: the official changelog, <https://expo.dev/changelog/sdk-58> — "Today we're announcing
the release of Expo SDK 58. SDK 58 is built for iOS 27 and includes React Native 0.88."

The five days between the SDK 58 release (2026-10-15) and this decision (2026-10-20) are
why D21 still says 57: the lock predates the release. The lock is not a technical
constraint that SDK 58 breaks; it is a date.

## 2. What is new in 2026 for this area, and what we adopt

| SDK 58 change | Effect on Courier Copilot | Adopted? |
|---------------|---------------------------|----------|
| React Native 0.88 (0.87 + 0.88-rc) | Strict TypeScript API is the default: deep imports from `react-native/Libraries/*` are type errors | Yes — our typecheck is now clean under it; the three `Stack`/`Tabs` navigators needed the new `id` prop (a v58 navigation-core change) |
| Expo Router navigation core reworked | The forked React Navigation API shrank; custom routers use `extendRouter` | Yes — we use only the stable `Stack`/`Tabs` API plus `id` |
| Prebuilt `expo-modules-core` for Android | A clean Android debug build for four ABIs fell from ~80 s to ~39 s on an M3 Pro | Yes — it is what makes the CI emulator build affordable |
| Fingerprint preset `balanced` | A version bump no longer forces a native rebuild | Yes — it keeps the CI emulator build cacheable |
| R8 on by default in release builds | Smaller, faster release APKs | Yes — with the ProGuard keep rules the docs mention if a library needs them |
| `expo-secure-store` `requireConfirmation` (Android) | Extra protection for the session cookie we store for the driver | Yes (opt-in per call, not forced) |
| `expo-audio` WAV/PCM recording, lock-screen controls | The voice pipeline records WAV and shows the transport | Yes — the voice squad needs it |
| iOS 27 scene-based life cycle | `expo prebuild` generates `SceneDelegate.swift`; apps that customise `AppDelegate.swift` must migrate | Yes — we do not customise the app delegate |
| Noxcturnal (experimental Rust transformer) | ~2× faster cold bundling | Not yet — it is experimental and skips files that need the Reanimated/Worklets Babel transforms, which we do use |

## 3. The decision

**Stay on Expo SDK 58 / React Native 0.88 and update D21.**

Reasons:

1. **The app is already on 58.** Every Expo package in `apps/mobile` is pinned to the
   58.0.x line (expo 58.0.14, expo-audio 58.0.9, expo-router 58.0.23, expo-secure-store
   58.0.2, …). Downgrading to 57 means downgrading the whole native stack and every
   native module with it, for no proven gain.
2. **Every native module supports 58** — from the installed packages' own peer ranges
   (the authoritative statement a library makes about itself):

   | Module | Version | What it declares |
   |---|---|---|
   | `react-native-reanimated` | 4.7.1 | `react-native: 0.86 - 0.88` — **0.88 is explicitly in range** |
   | `@maplibre/maplibre-react-native` | 11.3.7 | `expo: >=54.0.0`, `react-native: >=0.80.0`, `react: >=19.1.0` — satisfied by SDK 58 (expo 58.0.14 / RN 0.88 / React 19.3) |
   | `react-native-unistyles` | 3.5.3 | `react-native: >=0.81.0` + nitro modules — satisfied |
   | `react-native-vision-camera` | 5.2.3 | built on `react-native-nitro-modules` (0.37.1 installed) — satisfied |
   | `react-native-sherpa-onnx` | 0.4.4 | nitro modules, no upper RN bound — satisfied |
   | `@op-engineering/op-sqlite` | 18.2.5 | nitro modules — satisfied |
   | `expo-audio`, `expo-secure-store` | 58.0.9 / 58.0.2 | `expo: *` (the 58 line) — satisfied |

3. **The build is proven, not assumed.** The CI emulator job builds the debug APK from
   `expo prebuild` + Gradle on SDK 58 and runs the Maestro flows on it; the run link is in
   `docs/evidence/b7/README.md`. A downgrade to 57 would have to re-prove all of it.
4. **The 16 KB page-size requirement (Play) is a 2026 requirement** and the newest React
   Native line is the one that meets it; staying on 0.86 would be a step backwards on the
   platform requirement that actually blocks the release.

## 4. Risks and the fallback

| Risk | Mitigation | Fallback |
|---|---|---|
| A native module does not support 58 | The peer ranges above are checked in CI (`expo-doctor` + the emulator build); the list is re-checked at every bump | Pin that one module to its last working version; the rest of the stack stays on 58 |
| SDK 58 regressions | The emulator E2E and the Maestro flows run on every PR; a regression is caught before a release | Revert to SDK 57 (the versions are recorded in `docs/adr/ADR-001-versions.md`) |
| Early-release churn (58 is five days old) | We pin exact versions, the lockfile is committed, and the audits run on every PR | Downgrade the single package that breaks |

## 5. Follow-up

- `docs/adr/ADR-002-expo-58.md` records the decision and updates D21 in `docs/DECISIONS.md`.
- The Platform squad re-checks the pinned versions and the advisories before each phase
  (V4 §3.4).
