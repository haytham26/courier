# iOS plan: Android first, then iOS (binding; see D43)

The founder's decision (2026-10-25): Android reaches full quality first; iOS starts only after the Android gate below. The code stays one cross-platform code base the whole time, so the iOS phase is short: it adds what only Apple needs, not a second app.

This file is the plan. Executors read it on their own; no message is needed. Ownership: the lead (mobile) session owns phases I1 to I5; the backend session owns the server items marked **[backend]**.

## 0. Rules that apply now, before iOS starts (phase I0)

1. **One code base.** No Android-only solution when a cross-platform one exists. A `Platform.OS` branch is allowed only for a real platform difference (sign-in order, haptics engine, lock-screen surface), and it carries a one-line comment naming that difference.
2. **Cross-platform libraries only.** A new native dependency must state iOS support in its docs, with a link in the PR, before it is added.
3. **Android-only native config** (for example `apps/mobile/plugins/withSqliteFramework.js`) stays Android-only and must not change iOS output.
4. **No iOS work yet.** No iOS build job, no Apple account steps and no iOS-only code until the gate in section 1 passes. I0 is only rules 1 to 3.

## 1. The gate: when iOS starts

All of these are true, with proof links in `docs/log/CURRENT.md`:

- MASTER_EXECUTION §6 Definition of Done is met for Android.
- All 13 screens are merged on the chosen tokens, light and dark, including the D34 sphere.
- Android E2E is green on both emulator legs for 3 runs in a row on main, with no flow changed to get there (PLAYBOOK §12).
- The founder installed the release APK on a real phone, ran a full test shift, and wrote "Android OK" in `docs/status/FOUNDER_TODO.md`.
- No open bug of severity high or critical in `docs/status/BUGS.md`.

## 2. What the founder must provide (copy into FOUNDER_TODO when I1 starts)

Only the founder can do these. Build everything else without them, and never block on them.

1. **The Apple Developer Program**, US$99 a year.
   - As an individual, approval usually takes 1 to 2 days.
   - As an organisation, it needs a D-U-N-S number, which is free but can take up to 2 weeks.
   - The founder may start this early, because approval is the longest wait.
2. **An Expo account.** The executor puts `EXPO_TOKEN` in GitHub Secrets on the founder's instruction. It is never pasted in chat.
3. **An App Store Connect API key**: the `.p8` file, the Key ID and the Issuer ID, with the App Manager role. It is stored in EAS or in GitHub Secrets, never in the repo.
4. **The final bundle identifier.**
   - `com.courier.copilot` is in `apps/mobile/app.json` now.
   - Register it in the Apple Developer portal first; if it is taken, the founder picks a new one.
   - The same ID is used on Android before the first Play release, so both stores match.
5. **The Sign in with Apple service ID and key**, as MASTER_EXECUTION §14 already requires.

## 3. Phases

### I1. The first simulator build (no Apple account needed)

1. Add `apps/mobile/eas.json` with these profiles:
   - `development`: a dev client;
   - `simulator`: `ios.simulator: true`;
   - `preview`: internal distribution;
   - `production`.
   Use `"cli": { "appVersionSource": "remote" }` and `autoIncrement` on `production`.
2. Build the simulator profile with `eas build --platform ios --profile simulator`. A simulator build needs no Apple credentials.
3. Fix what breaks. Check these first:
   - op-sqlite on iOS: its own SQLite against the system one, the same class of symbol clash that `plugins/withSqliteFramework.js` fixed on Android;
   - the MapLibre plugin;
   - VisionCamera;
   - Skia rendering through Metal, for the D34 sphere;
   - Reanimated 4.
4. The fixes stay cross-platform. Each one is a BUG entry with its root cause.

### I2. iOS in CI (so iOS never breaks silently)

1. Add the workflow `ios-e2e.yml` on a `macos` runner. Standard macOS runners are free for public repositories; if the repo becomes private, write the minute cost in the monthly cost report.
2. The job builds for the simulator and runs the same Maestro flows as Android on an iOS simulator.
3. A flow may differ only where the platform truly differs (for example the back gesture), through a platform subflow in `.maestro/common/`, never by weakening an assertion.
4. Its trigger rules are the same as Android E2E: PRs to main that touch app code, plus nightly and manual runs.
5. After I2 merges, a PR is green only when both Android and iOS E2E pass.

### I3. The Apple-specific parts

1. **Permission texts.**
   - Rewrite every iOS purpose string in plain English that says what the courier gets: `NSCameraUsageDescription`, the microphone, the location strings and the speech string. Apple rejects vague strings under guideline 5.1.1.
   - Set each string once. Today `expo-location` and `expo-audio` set some keys again through their plugins, so keep one source.
   - Remove `NSSpeechRecognitionUsageDescription` if the app does not use Apple speech recognition.
2. **Background modes.**
   - Keep `location` and `audio` only if the shift really uses them while the phone is locked.
   - Write the App Review justification in `docs/store/ios-review-notes.md`: background location tracks the active shift only, and the microphone serves the voice copilot.
   - Ask for "Always" location only at shift start, with an explanation screen first.
3. **The privacy manifest.** Declare the required-reason APIs and the data collected in `ios.privacyManifests` in `app.json`, and match the App Store privacy labels.
4. **Export compliance.** Set `ios.config.usesNonExemptEncryption: false` if the app uses only standard HTTPS and OS encryption.
5. **iPad.** Set `ios.supportsTablet: false` unless an iPad layout is designed and tested. Today it is `true`, and App Review would then test it on an iPad.
6. **Sign in.**
   - Sign in with Apple is first on iOS. This is required by guideline 4.8 because Google sign-in is offered.
   - Add passkeys through iCloud Keychain, as §14 requires.
7. **Push notifications [backend].** Register an APNs key in EAS. The backend sends through the same push service as Android.
8. **Haptics and gestures.**
   - Haptics use the iOS engine through the same `hapticFor()` helper.
   - The edge swipe back works on every pushed screen.
   - Slide to Deliver keeps PLAYBOOK §12's decision rule.
9. **The lock screen.** Screen 13 becomes a Live Activity on iOS (ActivityKit, iOS 16.1+), through a config-plugin widget target. If that slips, a plain notification is the fallback, written in DECISIONS.
10. **Payments [backend].** Follow `docs/research/2026/payments-subscriptions.md` for the App Store rules on digital subscriptions. Do not decide the store payment rules again in this file.

### I4. TestFlight

1. Make a `preview` build with real credentials, then upload it with `eas submit --platform ios`.
2. **Internal testing** first: up to 100 App Store Connect users, with no Beta App Review. The founder's own iPhone comes first, for a full test shift and "iOS OK" in FOUNDER_TODO.
3. **External testing**: the closed beta with Christchurch couriers, MASTER_EXECUTION §18.
   - It needs Beta App Review, usually about a day.
   - A TestFlight build expires after 90 days, so the release train uploads well before that.

### I5. App Store release

1. Store assets: screenshots for the required iPhone sizes, the description, the keywords, the support URL and the privacy policy URL. Reuse the Play assets where the rules allow.
2. Write the review notes: a demo account with a seeded run, so the reviewer can test without a real shift. The explanation of the background modes comes from I3.
3. Use phased release in App Store Connect, and the same OTA channel rules as Android: expo-updates with the beta and production channels.
4. Rollback plan: OTA rollback for JS-only changes; for native changes, a hot-fix build and an expedited review request.

## 4. Definition of Done for iOS

- I1 to I5 merged with proof links.
- iOS E2E green on main 3 runs in a row, next to a green Android E2E.
- The founder's "iOS OK" after a real shift on an iPhone.
- The app is live on TestFlight external testing, then on the App Store with phased release.
- No open high or critical iOS bug.

## 5. What this plan does not change

The Android plan, its order and its gates stay as they are in MASTER_EXECUTION. This file only adds the iOS work after the gate in section 1, and the I0 rules now.
