# ADR-002 — Stay on Expo SDK 58 (React Native 0.88) and update D21

- **Status:** accepted
- **Date:** 2026-10-20
- **Decides:** D21 ("Expo SDK 57 is locked") in `docs/decisions/DECISIONS.md`
- **Research:** `docs/research/2026/expo-sdk-58.md` (V4 §3 protocol)
- **Branch:** `feat/t2-expo-58-decision`

## Context

D21 locked the app to **Expo SDK 57** (React Native 0.86) on 2026-10-20 — the same day
the official [Expo SDK 58 changelog](https://expo.dev/changelog/sdk-58) was published.

The app in the repository runs **Expo SDK 58 / React Native 0.88**: `expo ~58.0.14`,
`expo-router ~58.0.23`, `expo-audio 58.0.9`, `expo-secure-store 58.0.2`, and every other
Expo package pinned to the 58.0.x line. The lock therefore predates the release it
seems to be about, and the two statements cannot both stand.

FINAL_PROMPT §0-F.2 and D21 forbid a silent version change. This ADR is the record of
the change, with the evidence.

## Decision

**Stay on Expo SDK 58 / React Native 0.88. D21 is updated to lock SDK 58.**

## Evidence

### 1. The release is official and current

<https://expo.dev/changelog/sdk-58> — "Today we're announcing the release of Expo SDK 58.
SDK 58 is built for iOS 27 and includes React Native 0.88." (published 2026-10-15).

### 2. Every native module in the product supports it (from the packages' own peer ranges)

| Module | Version | Declares | SDK 58 satisfies |
|--------|---------|----------|------------------|
| `react-native-reanimated` | 4.7.1 | `react-native: 0.86 - 0.88` | yes, 0.88 is in range |
| `@maplibre/maplibre-react-native` | 11.3.7 | `expo: >=54.0.0`, `react-native: >=0.80.0`, `react: >=19.1.0` | yes (expo 58.0.14, RN 0.88, React 19.3) |
| `react-native-unistyles` | 3.5.3 | `react-native: >=0.81.0`, `react-native-nitro-modules` | yes (nitro 0.37.1) |
| `react-native-vision-camera` | 5.2.3 | `react-native-nitro-modules`, `react-native-nitro-image` | yes |
| `react-native-sherpa-onnx` | 0.4.4 | `react-native-nitro-modules` | yes |
| `@op-engineering/op-sqlite` | 18.2.5 | `react-native-nitro-modules` | yes |
| `expo-audio` | 58.0.9 | `expo: *` | yes (the 58 line) |
| `expo-secure-store` | 58.0.2 | `expo: *` | yes (the 58 line) |

### 3. The build and the app are proven on 58, not assumed

`.github/workflows/android-e2e.yml` builds the debug APK with `expo prebuild` + Gradle on
SDK 58 and runs the Maestro flows on the emulator (API 34, x86_64). The run and the
artifacts are recorded in `docs/evidence/b7/README.md`.

### 4. The platform requirement points forward, not back

The 16 KB page-size requirement for Google Play is a 2026 requirement, and the newest
React Native line is the one built for it. Holding the app on 0.86 to satisfy a lock that
predates the 58 release would be a step backwards on the requirement that actually blocks
the release.

## Consequences

- `docs/decisions/DECISIONS.md` D21 is updated: the locked SDK is 58, and any change to it needs a
  new ADR with an official source.
- `apps/mobile` keeps the exact pins it has; the versions are recorded in
  `docs/decisions/adr/ADR-001-versions.md`.
- The Platform squad re-checks the pinned versions and the advisories before each phase
  (V4 §3.4) and the CI audit gate fails on any new high or critical advisory.
- The SDK 58 migration items that touch us are already done: the strict TypeScript API
  (the typecheck is green), the navigation-core `id` prop, and the R8 release build.

## Alternatives considered

| Alternative | Why not |
|-------------|---------|
| Downgrade to SDK 57 (`expo install expo@~57 --fix` and realign every native module) | It touches every native package for no proven gain, and it gives up the React Native line that meets the Play 16 KB requirement. The lock is a date artefact, not a technical finding. |
| Stay on 58 without recording it | Forbidden by D21 and §0-F.2: a version change needs an ADR with an official source. |
| Pin the Expo packages to 57 but keep RN 0.88 | That combination does not exist; the Expo packages and the RN version ship together. |
