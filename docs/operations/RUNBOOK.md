# Runbook - the release to Google Play

The steps of a release, in the order they happen, and what to do when a step
fails. The checklist with the details is `docs/operations/RELEASE-CHECKLIST.md`.

## 1. Before the release

```bash
# the working tree is clean and the checks are green
corepack pnpm check:fast
corepack pnpm test

# the local pre-submission check, with the release artefact
node scripts/check-store-readiness.mjs --apk <the release APK>
```

The check prints a report. A blocker stops the release; a warning is a task that
goes into the founder report.

## 2. The release trigger

The store check runs in the `Store readiness` workflow:

- on a `release/**` branch, while the release is being prepared,
- on a `v*` tag, the release trigger,
- on demand, from the Actions tab.

Read the job summary: it holds the findings of StoreReady and of the local
check. The job is red when there is a blocking finding.

## 3. The release build

The `Release APK` workflow builds the artefact on the tag and attaches it to the
GitHub release. The signing secrets come from the GitHub Secrets; without them
the workflow builds the unsigned debug APK and says so in the log. The key
never goes into the repository, and `scripts/check-store-readiness.mjs` fails if
one is ever committed.

## 4. The submission (the founder gate)

The submission to Google Play is a founder approval (MASTER_EXECUTION section
7.3). The founder uploads the bundle, fills in the listing from
`docs/operations/STORE-LISTING.md`, answers the data safety questions from
`docs/operations/DATA-SAFETY.md` and does the background location declaration
from `docs/operations/PLAY-PERMISSIONS-DECLARATION.md`.

Start with the internal testing track, then the closed testing track, then
production. The release notes for each version come from the founder report.

## 5. When the check fails

| What failed                            | What it means                                                              | What to do                                                                  |
| -------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| StoreReady found a CRITICAL finding    | the store would reject the build                                           | fix the finding the report names, run the check again                       |
| The local check found a blocker        | the release is not ready (a version, a document, a permission, the budget) | the report names the file and the fix                                       |
| The App Store Connect lane did not run | the Apple credentials or the app id are not set                            | nothing to do for the Play release; the names are in `docs/FOUNDER_TODO.md` |
| The APK is over the budget             | the map pack or the voice pack is inside the bundle                        | move the pack to the Play asset delivery and build again                    |

A missing founder secret never fails the pipeline. The lane is skipped with a
clear message and the release continues on the checks that do not need it.

## 6. When the release is wrong

Play takes the roll out down from the Play Console, and the version can be
stopped there as well. The fixes go into the next version, the version code goes
up, and the local check runs again before the next submission.

## 7. The evidence

The report artefact of the `Store readiness` workflow is the evidence that the
release was checked (seven day retention). The founder report links the run.
