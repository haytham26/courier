# Evidence — BUG-067: the map-pack workflow could not start, and BUG-064's guard took the blame

The bug: `.github/workflows/map-pack.yml` failed in **0 seconds** on every run it ever had — 65 of
them, from PR #43's first push (40176014202) onward — with GitHub's `This run likely failed because
of a workflow file issue`, no jobs, no steps, no log and no annotation naming the line. BUG-064's
job-level guard (`if: github.event_name != 'push' || github.ref == 'refs/heads/main'`) was blamed
for it, and a §16 note in `docs/a1-record` even recorded the failure as "outside my diff". The guard
was never reached: **no job was ever created**.

## The line

`if-no-files-found: error` sat at a **step's own level**, a sibling of `uses:` and `with:`. It is an
_input_ of `actions/upload-artifact`, so it belongs **inside `with:`**. An unknown key at a step is
a workflow-file error: GitHub refuses the whole file, for every event, before any job exists.

GitHub says it plainly when asked to dispatch:

```
$ gh workflow run map-pack.yml --ref fix/bug-067-map-pack-inputs
could not create workflow dispatch event: HTTP 422: Invalid Argument - failed to parse workflow:
(Line: 172, Col: 9): Unexpected value 'if-no-files-found'
```

| #   | Command                                                     | Result                                                                                                                                                                                                                               |
| --- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `node scripts/ci/check-workflows.mjs`                       | `gate.log` — the repository's eight workflows pass: no unknown key at a job or a step, and no bare `inputs` context                                                                                                                  |
| 2   | `node --test scripts/ci/__tests__/check-workflows.test.mjs` | `gate-test.log` — 13 tests: the misplaced key, the same name inside `with:`, a `run:` block scalar's non-YAML, the two `inputs` forms, the comment form, the no-space form, a missing directory, the real tree, the CLI's exit codes |
| 3   | `node --test "scripts/*/__tests__/*.test.mjs"`              | `all-tests.log` — 53 tests, the whole `scripts/*/__tests__` set                                                                                                                                                                      |
| 4   | The workflow's own dispatch                                 | `dispatch.md` — the dispatch run that completes, and the push run that starts and is correctly skipped                                                                                                                               |
| 5   | The step/job key audit of every workflow                    | `keys-audit.log` — all eight workflows clean                                                                                                                                                                                         |

## Why it took two days

- The failure produces **no log at all**: no jobs, no steps, no annotation. Every other red run in
  this repository answers with a failing step and a message; this one answers with a sentence that
  names no line.
- The BUG-064 guard was **in the same file**, was added to fix a real run-anywhere problem, and was
  the obvious suspect for "the run failed on a feature branch". It was never reached: a guard on a
  job cannot guard a workflow that cannot start.
- The file carried a **second defect of the same class** at the same time: `${{ inputs.extract_url }}`
  and two `${{ inputs.source_id }}` expressions, a dispatch-only context that is invalid on a push.
  Fixing it did not clear the failure, which is what sent me bisecting — and the bisect, not the
  theory, named the key.

## The bisect, and the process note

The branch `fix/bug-067-map-pack-inputs` carries two deliberate bisect commits
(`chore(ci): bisect ...`): the workflow at its minimum, then the full workflow without its guard.
Both are labelled as bisect, both were pushed to observe a real run, and neither is a merge point.
The final state of the file is the fixed one, and the gate above keeps both defects from coming
back.

The first commit of this branch also corrected a false §16 note in `docs/a1-record` (PR #60), which
recorded this failure as outside my diff. §16 puts `infra/` and the CI steps that test it in the
backend's hands, and this workflow was written in #43 and guarded in #51: it was mine to find and
fix. `docs/log/backend-W43.md` records the process slip that produced the false note: the branch
was rebased against `origin/main` once, which the founder's ritual (AGENTS.md) bans — the branch had
not been pushed, so nothing published was rewritten, but the habit is wrong and merges are the form
from here on.
