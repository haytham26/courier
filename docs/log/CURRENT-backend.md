# CURRENT — backend squad (read this first)

Updated: 2026-10-26 · main at `b0cfd6b` · **Queue 2 is closed (items 1–7), BUG-063 and BUG-064 are
closed, the entitlement layer (ADR-017/D45), the provider ingest (ADR-018/D46) and A1's backend
half (ADR-019/D47) are merged. The next work follows `docs/plan/AUDIT_2026-10-25.md` §"The order",
which is binding.**

## The binding order for this squad (AUDIT §"The order", MASTER §21)

1. **BUG-063** — **merged** (PR #46).
2. **A1's backend half — MERGED** (PR #57, `b0cfd6b`, ADR-019/D47): the typed client generated from
   the OpenAPI the drift guard pins (committed, with a freshness gate in CI) and `POST /demo/runs`,
   the env-gated demo-run seed with deterministic uuid5 ids. **`docs/plan/A1-handover.md` is the
   handover to the lead's app side** (sign in, attach the JWT, load the run, the outbox, one run
   store, the no-mock E2E job); A2, A4 and B2 are theirs.
3. **A5** — the staging deploy workflow (compose, Caddy TLS, the migrations, a smoke test, a
   rollback), built and tested against a **local VM** until the OCI host and key exist (FOUNDER_TODO).
4. **B3** — BUG-059's security backlog: the WebSocket token out of the query string, `/v1/engines` and
   `/v1/licences` authenticated or rate-limited, `response_model` everywhere, and the OWASP MASVS L1
   self-review with its evidence in `docs/security/`.
5. **B4** — mutation testing (`mutmut`) scoped in CI at the 70 % floor, over `services/api` (sync,
   runs, auth) and `services/courier-voice` (the turn machine).
6. **Then the rest of queue 3.** Billing resumes after A1/A5/B3/B4, per D44.

## The merged set (for the record)

| Item                                                              | PR            | ADR / register |
| ----------------------------------------------------------------- | ------------- | -------------- |
| The quality audit, the database in CI, the POD object storage     | #26, #27, #31 | ADR-011 / D38  |
| The location notes                                                | #33           | ADR-012 / D39  |
| The voice intake                                                  | #34           | ADR-013 / D40  |
| The sync conflict rules                                           | #35           | ADR-014 / D41  |
| The ASVS password rows                                            | #39           | ADR-015        |
| **BUG-063** — the sync batch's cost after ADR-014                 | #46           | BUG-063        |
| The map pack pipeline                                             | #43           | ADR-016 / D42  |
| **BUG-064** — the map-pack build ran on a feature-branch push     | #51           | BUG-064        |
| The entitlement layer (D44's backend half)                        | #50           | ADR-017 / D45  |
| **The billing providers** (one fact shape, three signature rules) | #54           | ADR-018 / D46  |
| **A1's backend half** — the typed client, its gate, the demo seed | #57           | ADR-019 / D47  |

## A §17.4 violation, recorded (2026-10-26)

PR #54's Android E2E leg failed twice and was re-run twice. §17.4 allows **at most one re-run per
merge**; the second rerun (attempt 2, also `Unable to connect to adb daemon`) should not have been
launched. The corrective habit from now on: **one rerun, and if the leg is red for a cause outside the
diff, report it per §16 and do not rerun again.** The §16 note in PR #54 records that the diff touched
no mobile or E2E surface and its own backend steps were green on the same head.

## The §16 ownership note

- **The Locust SLO profile, the Postgres suite, the restore drill, the deploy workflow and the CI
  steps that test them are the backend's.** BUG-063 (my own ADR-014 regression) and BUG-064 (my own
  workflow's trigger) were mine to find and fix; both are merged.
- **The Android E2E workflow and `apps/mobile` are the lead's.** A red leg on their paths is reported
  per §16, never investigated and never re-run twice.
- **`map-pack.yml` is not a §16 case: it is mine (BUG-067), and the note is corrected.**
  This log recorded its failure as "a cause outside my diff, reported per §16" - that was wrong
  twice over. `map-pack.yml` is a workflow I wrote in #43 and guarded in #51 (BUG-064), and §16
  puts `infra/` and the CI steps that test it in the backend's hands. The failure itself was
  `${{ inputs.<name> }}` in three steps: a dispatch-only context, so every push - and the schedule
  - failed at the workflow level, before any job existed, in 0 seconds, on every run the workflow
    ever had (65 of them). BUG-064's guard took the blame and was never reached.
    `.github/workflows/store-ready.yml` carried the same defect in its release lane; it has never
    run, so that failure was latent. Both are fixed in `fix/bug-067-map-pack-inputs`, with
    `scripts/ci/check-workflow-inputs.mjs` as the gate that keeps the form from coming back, and
    the register carries BUG-067 beside BUG-064. The lesson is written where the next one will be
    read: a workflow that cannot start does not report a job's failure, so it reads as noise.

## Machine limits (the founder's, 2026-10-26, binding)

- Docker is capped at **3 GB** by `.wslconfig`. Start Postgres **only** for the `db`-marked suite and
  stop it after (`docker compose down`).
- **15 minutes without output is a stop** (§15): write what hung and what is done instead.
- One rerun per merge; a leg red for a cause outside the diff is reported, not re-run (§17.4/§16).
