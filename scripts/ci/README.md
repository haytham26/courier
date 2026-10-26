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
| `check-doc-links.mjs` | The link gate: every relative link in the live documentation resolves (`docs/archive`, `docs/evidence` and `docs/log` are history and skipped). `node scripts/ci/check-doc-links.mjs`. |
| `check-emulator-gpu.mjs` | The emulator-GL gate (BUG-053): every workflow step that boots an Android emulator sets `-gpu swiftshader_indirect`, a second `-gpu` fails, and an anchor the gate cannot read fails loudly. `node scripts/ci/check-emulator-gpu.mjs [workflow-directory]` (the default is this repository's own `.github/workflows`, resolved from the module so the cwd does not matter). |
| `check-parity.mjs` | The register gate (audit item B1): counts PARITY.md's four status words and BUGS.md's status words, prints the count that goes into `docs/status/PROGRESS.md`, and fails on a status word that is not one of them, on a `Have` row with no merged PR or CI run link in the row, or on a table that holds register rows with no `Status` column. `node scripts/ci/check-parity.mjs [parity.md] [bugs.md]` (the defaults are this repository's own registers, resolved from the module so the cwd does not matter). |

## The tests

| Test | What it proves |
|---|---|
| `__tests__/check-audit.test.mjs` | An acceptance needs an owner and a review date, and an expired review date fails the gate; an unaccepted high advisory still fails; the repository's own list can never carry a permanent accept. |
| `__tests__/check-store-readiness.test.mjs` | A good app passes the check and a missing privacy policy is a blocking problem. |
| `__tests__/store-ready-summary.test.mjs` | A blocking finding stays a blocking finding in the summary. |
| `__tests__/check-emulator-gpu.test.mjs` | A boot without the flag, a boot with no options, a second `-gpu`, an anchor, a comment naming the action, an inverted step and a wrong directory all fail; the fixed forms pass; the real tree is scanned so the gate cannot go vacuous; and the CLI's exit codes (0, 1, 2) are the contract CI runs. |
| `__tests__/check-parity.test.mjs` | A `Have` row with no PR or run link fails, an unknown status word (`Parity`, a bare `Planned`) fails, an empty status cell fails, a BUGS row with prose or `todo` in its status column fails, a pipe inside inline code does not split a row and lose its status, a table with no `Status` column fails, every table's rows are counted, the real tree is scanned so the gate cannot go vacuous, and the CLI's exit codes (0, 1, 2) are the contract CI runs. |

`node --test "scripts/*/__tests__/*.test.mjs"`
