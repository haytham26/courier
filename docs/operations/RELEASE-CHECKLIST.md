# The release checklist of Courier Copilot

Every release, from the branch to the running stack. A step is only ticked
when the evidence is there. The gates are the gates of the CI: nothing is
added here and nothing is taken away.

The runbook of the day-to-day operations is `docs/operations/RUNBOOK.md`.

## The gates of the CI

The required checks of a pull request. They are the ones in
`.github/workflows/`:

| Gate                  | The workflow        | The job    | What it proves                                                    |
| --------------------- | ------------------- | ---------- | ----------------------------------------------------------------- |
| lint, typecheck, test | `ci.yml`            | `quality`  | the types are right, the linter is quiet, the tests pass          |
| no secrets in git     | `ci.yml`            | `secrets`  | gitleaks finds no secret in the history                           |
| Floor guard           | `quality-gates.yml` | `floor`    | no new suppression, no skipped test, no stub, no `any`            |
| Coverage ratchet      | `quality-gates.yml` | `coverage` | the coverage did not fall                                         |
| Licence inventory     | `quality-gates.yml` | `licences` | no copyleft in the shipped app                                    |
| Dependency audits     | `quality-gates.yml` | `audits`   | no high or critical advisory in the JavaScript or the Python tree |
| Static analysis       | `quality-gates.yml` | `sast`     | Semgrep finds nothing high                                        |
| Code scanning         | `codeql.yml`        | `analyse`  | CodeQL finds no high alert                                        |
| Android E2E           | `android-e2e.yml`   | `e2e`      | the Maestro flows pass on the emulator                            |
| Restore test          | `restore-test.yml`  | `restore`  | a backup can be put back and the data is there                    |

A release may not start while one of them is red.

## 1. The branch

- [ ] The work is on a branch of its own, not on `main`.
- [ ] The pull request is open and every required check above is green. The
      link to the run is in the pull request.
- [ ] The reviewer is not the author (the QA squad and the Security squad
      sign off, V4 section 2).
- [ ] The floor guard is green: no new suppression, no skipped test.

## 2. The build

- [ ] The images are built from the commit of the release and pushed to the
      registry. The tag is the tag of the release (`v1.2.3`).
- [ ] The digest of each image is written down in the release notes. The
      stack runs the digest, not the tag.
- [ ] The release APK was built by the `Release APK` workflow and is
      attached to the release. The link to the artefact is in the notes.

## 3. The backup before the deploy

- [ ] A fresh backup exists and is not older than the last one:
      `bash infra/backup.sh`.
- [ ] The dump and its checksum are in the backup folder, and the manifest
      carries the row count of every table.
- [ ] A copy of the dump is off the server.
- [ ] The restore test is green: the `Restore test` workflow, or
      `bash infra/test-restore.sh --clean` on the server. The link to the
      run is in the notes.

## 4. The deploy

The founder approves the deploy of the production stack (MASTER_EXECUTION
section 7). The approval is written down in `docs/FOUNDER_TODO.md`.

- [ ] The environment file of the server holds the version and the images of
      the release.
- [ ] The images are pulled: `docker compose ... pull`.
- [ ] The API is swapped, one replica at a time, and both replicas answer
      `200` on `/health/ready` (`infra/zero-downtime.md`).
- [ ] The auth service is swapped, one replica at a time, and both replicas
      answer `200` on `/health/ready`.
- [ ] The health endpoint of every replica reports the new version.
- [ ] The edge still answers: `curl -I https://$COURIER_DOMAIN/`.
- [ ] The heartbeat is quiet: no new alert in the channel.
- [ ] The log of the edge has no burst of `502`.

## 5. After the deploy

- [ ] A courier can sign in and can record a delivery (the smoke test, on
      the test account).
- [ ] The error rate of the edge is back to normal (the access log of the
      last minutes).
- [ ] The database is not filling up faster than before
      (`docker stats --no-stream`).
- [ ] The release is written down in `docs/EXECUTOR_LOG.md` with the link to
      the CI run, the digests of the images and the time of the deploy.
- [ ] `docs/PROGRESS.md` and the status of the squad that owns the change
      are up to date.

## 6. The rollback, ready before the deploy

- [ ] The image of the version before is on the server (`docker images`) or
      can be pulled again.
- [ ] The two commands of the rollback are written down in the notes of the
      release.

## The evidence of a release

The evidence lives with the release, and the notes of the release point at
it:

| What                       | Where                                              |
| -------------------------- | -------------------------------------------------- |
| The CI run of the commit   | the link in the pull request and in the notes      |
| The images                 | the digests in the notes of the release            |
| The APK                    | the artefact of the `Release APK` workflow         |
| The restore test           | the link to the run of the `Restore test` workflow |
| The Android E2E            | the artefact `android-e2e-evidence` of the run     |
| The coverage               | the artefact `coverage` of the run                 |
| The evidence of the deploy | the output of the health endpoints, in the notes   |

A number without a link to a run is not verified (MASTER_EXECUTION section
7). It does not go into the notes.
