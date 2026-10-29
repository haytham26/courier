# The state of the founding document, and what is not self-evident

The founder asked me to say what I did and what is left. This is the honest ledger, and it names
what I could not prove.

## What landed today, and where it is

| Item | PR | Merge | What it is |
|---|---|---|---|
| **BUG-067** | #61 | `551bee6` | The map-pack workflow could not start. `if-no-files-found` is an **input of `actions/upload-artifact`** written at a **step's own level**, which makes GitHub refuse the whole workflow file before any job exists. Fixed, and `scripts/ci/check-workflows.mjs` (13 tests, a Quality-gates step) fails on both that and the bare `inputs` context. `store-ready.yml` carried the same `inputs` defect. |
| **A1's handover to the app side** | (direct to main, recorded) | `045185b` | `docs/plan/A1-handover.md`, indexed in `docs/README.md` and pointed at from `CURRENT-backend`. |
| **A1's deviation record** | #62 | `a82ebe1` | The handover went straight to main; recorded, not glossed. |
| **A5's first slice** | #65 | `d12231c` | ADR-020 / D49: `infra/compose.staging.yml`, the two service images (`services/api/Dockerfile`, `services/auth/Dockerfile`, both non-root), `infra/deploy.sh` (migrations → state file → swap → rollback), `infra/smoke.sh`, `.github/workflows/deploy.yml`, and three defects fixed in the existing stack. |
| **CURRENT-backend** | #66 | `8f69463` | The merged set, A5's remaining work, the recorded deviations, B3 next. |
| **The session's summary** | #67, #68 | `1f03e87`, `4699736` | `docs/log/SESSION-2026-10-27.md`. |
| **CURRENT-backend's Updated line** | #69 | **open** | One line, made true. Waiting on a fresh GitHub token. |

## What was proved, not claimed

- **The map-pack workflow starts on every event.** The dispatch that refused to parse the broken file
  (`HTTP 422 … Unexpected value 'if-no-files-found'`) now runs it; the merge commit's own push run
  went through checkout, the pinned Java runtime, the tools, the extract and the plan, and stopped
  only at the **licence gate**, which refuses by design until the founder confirms Geofabrik's terms
  (`--confirm-offline-use`, already open in FOUNDER_TODO).
- **The staging deploy runs on the local VM.** Both images build, the migrations apply, the API
  container reaches `Healthy`, logs `Application startup complete`, then the healthcheck's
  `GET /healthz 200`. Docker was stopped and removed after each use, per the 3 GB limit.
- **The API's own suite is green** (`406 passed` before the A5 branch, `419 passed` after the A1
  review), with `17 db-marked tests` against the pinned PostGIS container, run and then stopped.

## What is not self-evident, and is named anyway

- **The founder's correction is honoured in the register, not argued with.** The map-pack failure is
  mine (the workflow is in §16's backend column, and I wrote it in #43 and guarded it in #51). My
  note recorded it as a §16 case outside my diff — wrong twice over, because BUG-064's guard was
  never reached. The correction is in BUG-067's register entry and in PR #60's merge.
- **My first theory about BUG-067 was wrong.** I shipped the `inputs`-context fix, the run still
  failed, and the bisect named the key. The register carries the true root cause, and the week log
  says the theory was wrong.
- **Three process faults are recorded**: the false §16 claim, a docs commit pushed straight to main
  instead of through a branch, and one rebase of an unpushed branch.
- **The auth service's own schema** is A5's next slice: Better Auth logs `Missing tables user,
  session, account, …, jwks` and says `Run npx auth migrate`, which needs the service's options
  module. Inventing the tables would have been worse than the gap.
- **`infra/monitoring` is not wired in**, and the OCI host, key and domain are FOUNDER_TODO. The
  deploy leg names the secrets it is waiting for rather than doing nothing.
- **The GitHub token expired mid-flight**, so PR #69 (one line) is open and unmerged.

## What is next, in the binding order

1. **B3** — BUG-059's security backlog: the WebSocket token out of the query string
   (`services/api/app/auth/websocket.py`, 44 lines, reads the header or the `token` query parameter
   today), `/v1/engines` and `/v1/licences` authenticated or rate-limited, `response_model` on the 11
   handlers BUG-059 counts, and the OWASP MASVS L1 self-review with its evidence in
   `docs/security/`.
2. **B4** — mutmut, scoped in CI at the 70% floor over `services/api` (sync, runs, auth) and
   `services/courier-voice` (the turn machine).
3. **Then the rest of queue 3**; billing resumes after those (D44).
