# The gates

Every script here fails the build when its check fails. They are the mechanical half of
`docs/plan/CONSTRAINTS.md`.

| Script | What it does |
|---|---|
| `check-floor.mjs` | The floor guard: scans the lines the branch adds for a new suppression, a skipped test, an `any`, an empty catch or a stub. `node scripts/ci/check-floor.mjs [base-ref]`. |
| `check-conflict-markers.mjs` | The merge-marker gate: no `<<<<<<<`, `=======` or `>>>>>>>` line survives anywhere in the tracked tree (lockfiles, vendored code and binaries excluded). `node scripts/ci/check-conflict-markers.mjs`. |
| `check-control-chars.mjs` | The control-character gate: no BEL, VT or FF byte (an escaping pass once corrupted 31 word-initial letters into these) in any tracked text file. `node scripts/ci/check-control-chars.mjs`. |
| `check-coverage.mjs` | The coverage ratchet: reads the summaries the test runs produced and fails below the floors. `node scripts/ci/check-coverage.mjs`. |
| `run-coverage.mjs` | Runs the coverage of the packages, the API and the voice service, then calls the gate. `node scripts/ci/run-coverage.mjs`. |
| `check-audit.mjs` | The dependency audit: fails on any high or critical advisory that is not a documented build-time exception, and on an exception that carries no owner, no review date, or a review date already in the past (an acceptance is never permanent). Its evaluator is importable, so the tests need no registry. `node scripts/ci/check-audit.mjs`. |
| `check-licenses.mjs` | The licence gate: fails when a forbidden licence (GPL, AGPL, SSPL, Commons Clause, CC-NC, FSL, BUSL) reaches the shipped app. `node scripts/ci/check-licenses.mjs` (with `--write` it regenerates `docs/product/LICENSES.md`). |
| `check-secrets.js` | Fails when a required environment variable is missing. It prints the names, never the values. `node scripts/ci/check-secrets.js`. |
| `grep-banned.ps1` | Greps the tree for the banned items (the old libraries, the CSS variables, the wrong hooks). `powershell -ExecutionPolicy Bypass -File scripts/ci/grep-banned.ps1 [paths...]`. |
| `review-gate.sh` | The review board: the five checks (correctness, security, performance, design, privacy) that run before a merge. `bash scripts/ci/review-gate.sh`. |
| `backtest.mjs` | The 50x backtest of the three package suites: the flakiness number. It is not in a workflow yet. `node scripts/ci/backtest.mjs`. |
| `check-store-readiness.mjs` | The local copy of the StoreReady check (the release manager's copy of the CI gate). `node scripts/ci/check-store-readiness.mjs [--repo .] [--app apps/mobile] [--apk <file>] [--json <file>]`. |
| `store-ready-summary.mjs` | Renders the StoreReady report as a job summary. `node scripts/ci/store-ready-summary.mjs <report.json>`. |

## The tests

| Test | What it proves |
|---|---|
| `__tests__/check-audit.test.mjs` | An acceptance needs an owner and a review date, and an expired review date fails the gate; an unaccepted high advisory still fails; the repository's own list can never carry a permanent accept. |
| `__tests__/check-store-readiness.test.mjs` | A good app passes the check and a missing privacy policy is a blocking problem. |
| `__tests__/store-ready-summary.test.mjs` | A blocking finding stays a blocking finding in the summary. |

`node --test "scripts/*/__tests__/*.test.mjs"`
