# Session 2026-10-28 — the founder's queue, closed in the audit's order (main at `6d2f915`)

## The five items you set, and where each stands

| Item | PR | Merge | State |
|---|---|---|---|
| **BUG-067** — the map-pack workflow could not start | #61 | `551bee6` | merged, with the gate |
| **A1's handover** to the lead's app side | (recorded) + #62 | `045185b` + `a82ebe1` | merged |
| **A5's first slice** (ADR-020 / D49) | #65 | `d12231c` | merged |
| **B3's first item** — the WS token's module half | #75 | `a2b6a44` | merged |
| **The ledgers and the handover** | #66–#71, #76, #77 | — | merged |

Every commit went through a branch, a PR, green checks, a merge commit, an `archive/<branch>` tag on
the remote, the branch deletion and the `ls-remote` proof. No force-push, no rebase of a published
branch. Docker was stopped and removed after each use, per the 3 GB limit. No `Start-Sleep`
polling loops (§15) after the founder's correction.

## BUG-067 — the map-pack workflow could not start, and BUG-064's guard took the blame

- **The line.** `if-no-files-found: error` sat at a **step's own level**, a sibling of `uses:` and
  `with:`. It is an **input of `actions/upload-artifact`**, so it belongs **inside `with:`**. An
  unknown key at a step makes GitHub refuse the whole workflow file, on every event, before any job
  exists. 65 runs had failed this way since PR #43's first push — 0 seconds, no jobs, no log, no
  annotation naming the line.
- **The same file also carried the dispatch-only `inputs` context** in three expressions, and
  `store-ready.yml` carried it in its release lane. Both fixed.
- **`scripts/ci/check-workflows.mjs`** (13 tests, a Quality-gates step) fails on both defects; a YAML
  anchor it cannot read fails rather than passes.
- **The proof runs.** Two dispatches and the merge commit's own push run each went through checkout,
  the pinned Java runtime, the tools, the extract and the plan, and stopped only at the **licence
  gate**, which refuses by design until the founder confirms Geofabrik's terms
  (`--confirm-offline-use`, already open in FOUNDER_TODO).
- **My first theory was wrong** (the `inputs` context), shipped, the run still failed, and the bisect
  named the key. The register carries the true root cause and the week log says the theory was wrong.

## A1's handover — the app side's brief

`docs/plan/A1-handover.md` is indexed and pointed at from `CURRENT-backend`. It gives the lead the
seed endpoint's contract, the typed client's path, the two reads the app drives, the five things that
are theirs, and what the backend has already proven.

## A5's first slice — the staging stack, the two images, the deploy (ADR-020 / D49)

- `infra/compose.staging.yml` (one replica of each service, a 172.29 network, Caddy's own root CA for
  a local VM), `services/api/Dockerfile` and `services/auth/Dockerfile` (both non-root), 
  `infra/deploy.sh` (the migrations after `up -d --wait`, the state file, the swap, the rollback),
  `infra/smoke.sh`, and `.github/workflows/deploy.yml` (a verify leg on every push; a deploy leg over
  SSH that rolls back; without the OCI host and key it names the secrets it waits for).
- **Three defects in the existing stack, fixed:** the compose file named `apps/api` and
  `../db/schema.sql`; the API's healthcheck asked for `/health/ready`, which this API does not serve
  (its contract carries `/healthz`); and the API's boot refused a POD store with no signing grant.
- **Proved locally, on the 3 GB VM:** both images build, the migrations apply, and the API container
  reaches `Healthy` with `Application startup complete` and the healthcheck's `GET /healthz 200`.

## B3's first item — the WebSocket token out of the query string (merged, PR #75)

`services/api/app/auth/websocket.py` gains `identify` (the header **or the first `auth` message**,
never the query string), `refuse` (the reason in an `error` frame, then close **4403**) and
`CLOSE_UNAUTHENTICATED`, with seven green tests driving both through a fake handshake and a real
verifier over a real key pair. The route's half is the next step and its shape is named precisely in
`docs/evidence/b3-websocket-token/`.

## What is named, not glossed

- **The auth service's own schema** is A5's next slice: Better Auth logs
  `Missing tables user, session, account, …, jwks` and says `Run npx auth migrate`.
- **`infra/monitoring` is not wired in**; the OCI host, key and domain are FOUNDER_TODO.
- **The local `node_modules/prettier` is broken** (its `bin/` is missing), so the generated-client
  freshness test fails locally and passes on CI — the CI run on the same commit proves it.
- **Four process deviations are recorded in the logs**: the false §16 claim (corrected in the register
  and PR #60), and three direct pushes to main (`045185b`, `dbc7004`, and the handover's own) instead
  of through branches. The correction is unchanged: every commit goes through a branch and a PR.

## Next, in the binding order

1. **B3's route half** (the five-minute change, named in `docs/log/HANDOVER-2026-10-28.md`).
2. **B3's remaining items**: `/v1/engines` and `/v1/licences` authenticated or rate-limited,
   `response_model` on the 11 handlers, the OWASP MASVS L1 self-review with its evidence in
   `docs/security/`.
3. **B4** — mutmut at the 70% floor over `services/api` (sync, runs, auth) and `services/courier-voice`
   (the turn machine).
4. **Then the rest of queue 3**; billing resumes after those (D44).
