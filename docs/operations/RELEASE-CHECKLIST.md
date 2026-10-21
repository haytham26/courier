# Release checklist - Google Play

Two checkers stand between the app and the Play Store. The first one is the
primary checker and the second one is its local copy.

## The primary checker: StoreReady

**StoreReady is the primary pre-submission checker** (MASTER_EXECUTION section 15).
The tool is https://github.com/MaTriXy/StoreReady (MPL-2.0), by MaTriXy (Yossi
Elkrief), a friend of the founder. The latest release is **v0.1.0**, published
on **8 March 2026**, and it was read on **2026-10-21**. The workflow that runs it
is `.github/workflows/store-ready.yml`, and it runs:

- on the release trigger (a `v*` tag) and on a `release/**` branch,
- on demand from the Actions tab (workflow dispatch),
- never on every push, because the private Actions minutes are limited (section 7.1).

What it does:

1. it generates the Android project (`expo prebuild`) so the tool reads the real
   manifest and the real Gradle files,
2. it installs StoreReady v0.1.0 with a pinned version and a checked SHA-256,
3. it runs `storeready playstore-checkup` on the app and writes the JSON report,
4. it prints the report as the job summary, so the founder reads the findings
   without downloading anything,
5. it fails the job when the tool finds a blocking (CRITICAL) finding,
6. it uploads the report as an artefact with a seven day retention.

A CRITICAL finding is a release blocker. A WARN is a task. The report also lists
the Play Console review the tool cannot do on its own (the permissions
declaration, the data safety answers, the account deletion).

## The local copy: the script the release manager runs

**`scripts/check-store-readiness.mjs` is the developer's copy of the check.** It
runs on the machine, in seconds, and reads the things the tool cannot know:

```bash
node scripts/check-store-readiness.mjs --apk apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

The options are `--repo` (the repository folder), `--app` (the app folder,
`apps/mobile` by default), `--apk` (the release artefact) and `--json` (where to
write the machine report). It prints the report and exits 1 when it finds a
blocking problem.

Run it before every release, and run it in CI as well: the workflow does both.

## The order of a release

1. **The version.** Raise `expo.version`, `expo.android.version` and
   `expo.android.versionCode` in `apps/mobile/app.json`. The version code has
   to go up with every upload. Put the same numbers in
   `docs/operations/STORE-LISTING.md`.
2. **The local check.** `node scripts/check-store-readiness.mjs --apk <apk>`.
   No blockers, and every warning is either fixed or written down.
3. **The CI check.** Push the release branch or tag the release. The
   `Store readiness` workflow has to be green, and the job summary has to be
   read.
4. **The Play Console.** Upload the bundle, fill in the listing from
   `docs/operations/STORE-LISTING.md`, answer the data safety questions from
   `docs/operations/DATA-SAFETY.md`, and do the permissions declaration from
   `docs/operations/PLAY-PERMISSIONS-DECLARATION.md`.
5. **The founder's approval.** The submission to Google Play is a founder gate
   (section 7.3). The founder says yes in the founder report.

## What the local check enforces

| Check                                                                                   | Blocking                                |
| --------------------------------------------------------------------------------------- | --------------------------------------- |
| The app version is a version number                                                     | yes                                     |
| The Android version code is set                                                         | yes                                     |
| The version strings in the store listing match the app                                  | yes                                     |
| The background location declaration exists                                              | yes                                     |
| The in-app background location disclosure and the privacy policy URL exist              | yes                                     |
| The foreground service types for the location and the microphone are declared           | yes                                     |
| The permissions Play only allows with a review are not in the manifest                  | yes                                     |
| The privacy policy and the data safety notes exist                                      | yes                                     |
| The target API level is the level Play requires (36, from 31 August 2026)               | yes                                     |
| The base APK stays inside the 80 MB budget                                              | yes                                     |
| The APK carries the 64-bit libraries                                                    | yes                                     |
| The app icon is a square PNG of at least 512 pixels, and the adaptive icon images exist | yes                                     |
| The release workflow reads the signing secrets, and no key is in the repository         | yes                                     |
| The licence ledger lists the packages of the shipped app                                | yes                                     |
| The data sync foreground service type is declared                                       | no (a warning)                          |
| The licences in the ledger are known                                                    | no (a warning)                          |
| The release APK was measured                                                            | no (a warning, unless the APK is given) |
| The app has an in-app account deletion                                                  | no (a warning, Play asks for it)        |

## The founder's part

The founder supplies the accounts, the keys and the legal sign-off. They are all
in `docs/FOUNDER_TODO.md`. The names of the secrets the workflow reads are
there too; the workflow skips those lanes with a clear message when a secret is
missing, so a missing secret never fails the pipeline.

## The upstream work

StoreReady v0.1.0 does not know about the checks our app needs. The list to
raise with its author (github.com/MaTriXy/StoreReady, MPL-2.0):

- the background location declaration and the in-app disclosure,
- the foreground service types (the location, the microphone and the data sync),
- the account deletion,
- the data safety answers,
- the Play Console API, so the live listing can be compared with the draft.

Report them as issues on the repository of the tool and keep this list until they
are in a release.
