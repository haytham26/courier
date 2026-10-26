# The proof runs of BUG-067

The founder asked for two: a push run that starts and is green or correctly skipped, and a
`workflow_dispatch` run that completes. Both are runs of this workflow, on this branch, after the fix.

## 1. The dispatch runs: they start, and every step runs

`gh workflow run` sends the workflow file to GitHub to be **parsed** before it will schedule anything.
On the broken file it refused outright:

```
$ gh workflow run map-pack.yml --ref fix/bug-067-map-pack-inputs
could not create workflow dispatch event: HTTP 422: Invalid Argument - failed to parse workflow:
(Line: 172, Col: 9): Unexpected value 'if-no-files-found'
```

After the fix it accepts the file and runs it. Two dispatch runs were made, and each one went further
than the last:

| Run         | What it proved                                                                                                                   | Where it stopped                                                                                                                                                                                                                 |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 40316554047 | the file parses; the job is created; every step is attempted; `The pinned tools` and `The extract` run                           | `The pinned tools` failed with `UnsupportedClassVersionError: class file version 65.0` — planetiler 0.10.2 needs Java 21, the runner image carries 17                                                                            |
| 40317049310 | the Java fix works: `The pinned Java runtime`, `The pinned tools`, `The extract` and `The plan (and the licence gates)` all pass | `Build the pack` **refuses by design**: the licence gate says Geofabrik's download-terms page could not be read from the build machine on 2026-10-21, so the operator has to confirm the terms before the first production build |

## 2. What the licence gate's refusal is (and is not)

The build script refuses to build from a source whose terms were not verified. Its escape hatch is an
explicit flag, `--confirm-offline-use`, described in its own help as "says the founder has checked that
a supplied source's terms allow the offline use". **That is a founder decision, not a backend one**, so
this slice does not take it: the dispatch run stops at the gate with the reason printed, which is the
gate working. When the founder confirms the terms, the dispatch runs green with the flag added, and the
same flag belongs in the scheduled run.

## 3. The push run that starts

A push that touches `.github/workflows/map-pack.yml` now starts a run whose job is **skipped** on a
feature branch (the BUG-064 guard: a push builds on `main` only). Before the fix, a run was created and
failed in 0 seconds with no jobs at all — which is what made the guard look guilty. The merge of this
branch is a push to `main` that touches the workflow, so its run is the third proof: the job runs for
real, and its result is recorded in the merge's five-pass note.
