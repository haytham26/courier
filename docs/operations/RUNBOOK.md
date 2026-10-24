# Runbook - the release to Google Play

The steps of a release, in the order they happen, and what to do when a step
fails. The checklist with the details is `docs/operations/RELEASE-CHECKLIST.md`.

## 1. Before the release

```bash
# the working tree is clean and the checks are green
corepack pnpm check:fast
corepack pnpm test

# the local pre-submission check, with the release artefact
node scripts/ci/check-store-readiness.mjs --apk <the release APK>
```

The check prints a report. A blocker stops the release; a warning is a task that
goes into the founder report.

## 2. The release trigger

The store check runs in the `Store readiness` workflow:

- on a `release/**` branch, while the release is being prepared,
- on a `v*` tag, the release trigger,
- on demand, from the Actions tab.

Read the job summary: it holds the findings of StoreReady and of the local
check. The job is red when there is a blocking finding.

## 3. The release build

The `Release APK` workflow builds the artefact on the tag and attaches it to the
GitHub release. The signing secrets come from the GitHub Secrets; without them
the workflow builds the unsigned debug APK and says so in the log. The key
never goes into the repository, and `scripts/ci/check-store-readiness.mjs` fails if
one is ever committed.

## 4. The submission (the founder gate)

The submission to Google Play is a founder approval (MASTER_EXECUTION section
7.3). The founder uploads the bundle, fills in the listing from
`docs/operations/STORE-LISTING.md`, answers the data safety questions from
`docs/operations/DATA-SAFETY.md` and does the background location declaration
from `docs/operations/PLAY-PERMISSIONS-DECLARATION.md`.

Start with the internal testing track, then the closed testing track, then
production. The release notes for each version come from the founder report.

## 5. When the check fails

| What failed                            | What it means                                                              | What to do                                                                  |
| -------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| StoreReady found a CRITICAL finding    | the store would reject the build                                           | fix the finding the report names, run the check again                       |
| The local check found a blocker        | the release is not ready (a version, a document, a permission, the budget) | the report names the file and the fix                                       |
| The App Store Connect lane did not run | the Apple credentials or the app id are not set                            | nothing to do for the Play release; the names are in `docs/status/FOUNDER_TODO.md` |
| The APK is over the budget             | the map pack or the voice pack is inside the bundle                        | move the pack to the Play asset delivery and build again                    |

A missing founder secret never fails the pipeline. The lane is skipped with a
clear message and the release continues on the checks that do not need it.

## 6. When the release is wrong

Play takes the roll out down from the Play Console, and the version can be
stopped there as well. The fixes go into the next version, the version code goes
up, and the local check runs again before the next submission.

## 7. The evidence

The report artefact of the `Store readiness` workflow is the evidence that the
release was checked (seven day retention). The founder report links the run.

---

# Reliability and operations (section 18.4)

## 8. The service levels (SLOs) and the error budget

| Surface | SLO (monthly) | Measured by | Error budget |
|---|---|---|---|
| Courier API availability | 99.9 % (≤ 43 min/month down) | uptime probe → status page + n8n alert | 43 min |
| `GET /shifts/{id}/route` | p95 ≤ 5 s (the 200-stop budget is the floor; the SLO is the budget's p95) | load test + production metrics | 1 % of requests |
| `POST /shifts/{id}/events:batch` (sync) | p95 ≤ 300 ms, 99.9 % success | load test + production metrics | 0.1 % |
| `POST /runs/{id}/stops/{stop_id}/pod` | p95 ≤ 2 s (10 MiB upload on rural NZ LTE) | load test + production metrics | 1 % |
| Voice turn (server brain) | p95 ≤ 700 ms, command → action ≤ 700 ms (CONSTRAINTS budget) | the voice eval harness + production metrics | 1 % |

The error-budget rule: a month that spends its budget stops feature deploys for that surface until
the budget recovers — the reliability work is prioritised instead. The budget is not a licence: a
red SLO with budget left is still an incident to triage.

## 9. Uptime monitoring and the status page

- The probe: `GET /shifts/healthz` (unauthenticated, returns the engine names + the repo round-trip)
  every 60 s from two regions (a NZ vantage + a fallback). Three consecutive failures from both
  regions = an outage.
- The status page: generated from the probe history, published at `status.<domain>` (static site —
  the same pipeline that ships the docs). It never carries request data.
- The probe and the page are the infra squad's lanes (n8n + the static host); the API ships the
  healthz endpoint and the SLO definitions. The healthz endpoint is the backend item of this slice.

## 10. The incident process

1. **Detect** — the probe, an SLO burn alert, or a courier report (the support email → n8n).
2. **Declare** — the founder (beta on-call) is paged by n8n: a phone call outside quiet hours
   (21:00–07:00 NZT, except a full outage or a data-loss suspicion), a message otherwise.
3. **Stabilise** — the rollback first: the API redeploys the previous tag (the load test evidence
   makes "previous" safe); the phone's OTA holds (expo-updates channel rollback is a mobile-squad
   lane).
4. **Communicate** — the status page flips to "investigating" within 15 min of declaration.
5. **Fix at the cause** — the PLAYBOOK triage (the repo's own §19.1b), no theory-first changes.
6. **Review** — a blameless post-mortem in `docs/operations/incidents/` within 48 h: the timeline,
   the cause, the budget spent, the action items with owners. Every action item gets a test.

## 11. On-call (beta) and the alert wiring

- The on-call is the founder (beta): n8n pages by phone + message. The quiet-hours policy lives in
  the n8n workflow (the infra squad's lane); the API's duty is the alert PAYLOAD: name, surface,
  SLO, the run link, the last successful probe — no request data, no addresses (ASVS V7/V8 carry
  over).
- The alerts that exist on day one: availability down, sync error rate > 1 % in 5 min, POD failure
  rate > 2 % in 15 min, the daily voice budget exhausted (the cost guard's own event).

## 12. The load test (1,000 drivers)

- Tool: Locust (Python — the repo's own toolchain). Scripts: `services/api/loadtests/locustfile.py`.
- The model of 1,000 drivers: 1,000 concurrent couriers, each in one session doing the day loop —
  create run (once), then the task mix of a real day: two stop lists per route read, five sync
  batches (2–8 events) per two stop lists, one POD upload per ten sync batches (deliberately
  over-weighted against its once-in-a-shift reality, so the gate exercises the heaviest write).
  The staged ramp: 100 → 300 → 600 → 1,000 over 15 min.
- The seeded day: the stop ids come from the run's own stops list — the day is seeded before the
  run (the intake flow, or SQL as the restore drill does). Without a seeded day the loop honestly
  exercises runs/route/stops-list only, and the POD and sync tasks step aside instead of hammering
  ids that do not exist.
- The thresholds ARE the SLOs (the route p95 ≤ 5 s, the sync p95 ≤ 300 ms, the POD p95 ≤ 2 s) — a
  red threshold fails the run, never a lowered number. The run's error budget is the strictest of
  §8 (the sync's 0.1 %, applied globally); the per-surface budgets (1 %) are for the ops dashboard,
  not for a green gate.
- What the first run measures honestly: the application layer against the in-memory repo (no
  database on the dev machine). The DB-backed run (a Postgres service container in CI, or the
  staging server) is the gate before launch — recorded as such, not claimed.

## 13. The disaster-recovery drill (quarterly)

- The drill: restore from backup into a clean server, with evidence. The script
  (`services/api/ops/restore_drill.py`): given a backup dump and a reachable clean Postgres, it
  restores the schema + the data, boots the API against it, and runs the smoke (create run → sync
  batch → read route → list stops), then prints the verdict + the timings for the evidence file.
- The backup: nightly `pg_dump` of the API database (the infra lane), retention 30 days, one
  restore-test per month minimum (the drill proves the retention is real).
- The evidence lands in `docs/evidence/backend-ops/drill-<date>/` (the drill log + the timings).
- The first drill runs when a Postgres is reachable (the dev machine has no daemon; the staging
  server or a CI service container is the venue) — recorded honestly until then.

