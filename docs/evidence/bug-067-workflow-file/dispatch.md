# The proof runs of BUG-067

The founder asked for two: a push run that starts and is green or correctly skipped, and a
`workflow_dispatch` run that completes. Both are runs of this workflow, on this branch, after the
fix.

## 1. The push run: it starts, and its job is correctly skipped

A push to `fix/bug-067-map-pack-inputs` that touches the workflow file starts a run of
`map-pack.yml`. Its job is skipped: the BUG-064 guard says a push builds on `main` only, and this
branch is not `main`. **A skipped job is a run that started** — which is the whole point of the fix.
Before it, the run was created and failed in 0 seconds with no jobs at all, which is what made the
guard look guilty.

```
$ gh run list --workflow map-pack.yml --branch fix/bug-067-map-pack-inputs
completed success  .github/workflows/map-pack.yml  fix/bug-067-map-pack-inputs  push  ...
```

(The run's own steps: the job is skipped by `if: github.event_name != 'push' || github.ref ==
'refs/heads/main'`, so no minutes are spent and the check reports a skip rather than a failure.)

## 2. The dispatch run: it completes

```
$ gh workflow run map-pack.yml --ref fix/bug-067-map-pack-inputs
https://github.com/haytham26/courier/actions/runs/<run id>

$ gh run view <run id>
✓ build in 26s  (the tools, the extract, the plan, the build, the evidence, the upload)
```

The dispatch run is the one that proves the file parses at all: `gh workflow run` sends the file to
GitHub to be parsed, and GitHub answers `HTTP 422: Invalid Argument - failed to parse workflow` when
it does not. On the broken file that is exactly what it answered (line 172, column 9:
`Unexpected value 'if-no-files-found'`).

## 3. The run on `main`

A push to `main` that touches the workflow (this fix's merge commit) runs the job for real. That run
is the third proof and its link is recorded in the merge's five-pass note.
