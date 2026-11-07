# BUG-245 evidence - the B4 mutation floor gated in CI at PR time

## The gap
B4's done-when: mutmut scoped in CI at the >= 70 % floor, then **gated in CI**. After BUG-243/244 the nightly lane measured API **86.0 %** and voice **87.1 %** (run 42366549049, both jobs green), but `mutation.yml` is schedule + workflow_dispatch only - nothing in the PR path ran mutmut, so a PR could regress the score and merge green. Its own header (old lines 16-18) called the PR-time wiring "the follow-up slice".

## The design constraints that shaped it
- mutmut 3.8.1's `run` takes only mutant NAMES and reads its config from the cwd pyproject only; its command set (run / results / show / apply / browse / export-cicd-stats / print-time-estimates / tests-for-mutant) has NO generate-only command. So "run only the mutants of the changed files" is not available; the job runs the service's FULL `[tool.mutmut] source_paths` scope whenever the PR touches that service - a superset of the changed files, strictly stronger, and identical to what the nightly measures.
- `check-mutation-floor.mjs run <service>` enforces the floor itself (main -> checkStats, exit 1 below 70; verified in the source at lines 251-257), so the job needs no separate check step.
- The API job needs the pinned PostGIS service + DATABASE_URL (BUG-243: without it the db suite stays `no_tests` and the floor is measured over the wrong suite) - same image/env as ci.yml and mutation.yml.
- Audit item 3g: job-level `if:` (not a workflow `paths:` filter) so untouched scopes report `skipped`, never absent - a required check that is not reported blocks every PR forever.

## What changed
- `scripts/ci/changed-mutation-scopes.mjs` (new): pure `parseSourcePaths` (line-based section scan - a lazy regex stopped at the `[` of `source_paths = [` or at the first line end), `touchesScope` (source path or dir entry, tests/, pyproject.toml, uv.lock, separator-normalised), `pipelineTouched` (the floor scripts + mutation.yml + quality-gates.yml -> both scopes), `computeScopes`, `loadScopes` (reads the real pyprojects), `resolveBaseSha` (all-zero/garbage -> HEAD~1; main also rev-parses to catch force-pushes), `renderOutputs`. Env inputs EVENT_NAME / BASE_SHA come through the `github` context at the step (the e2e `changes` job's shape); human dispatch -> all scopes true.
- `.github/workflows/quality-gates.yml`: `mutation-scopes` (fetch-depth 0, outputs api/voice), `mutation-api` (needs + if, PostGIS service, DATABASE_URL, `run services/api`, timeout 45, stats artifact mutation-api-pr-stats), `mutation-voice` (timeout 20, mutation-voice-pr-stats).
- `.github/workflows/mutation.yml`: header updated - the nightly lane stays the measurement/dispatch; the PR gate lives in quality-gates.yml and runs the identical `run` mode.

## Green
- 10 new node tests in `scripts/ci/__tests__/changed-mutation-scopes.test.mjs`, incl. parseSourcePaths pinned against BOTH real pyprojects (api: 6 paths, voice: 4) and a real CLI run in human-dispatch mode.
- Full node suite: 326 tests, 0 fail. check-workflows (16 workflows, only accepted keys), action-pins (128 refs), node-pin: clean.
- The gate proves itself on its own PR: this PR touches `.github/workflows/quality-gates.yml`, so `pipelineTouched` fires and BOTH `mutation-api` and `mutation-voice` ran as PR checks on the head sha - see the PR's check runs (both success; the services' code is byte-identical to main's b1ebc4c, so the scores match run 42366549049: API 86.0 %, voice 87.1 %).
