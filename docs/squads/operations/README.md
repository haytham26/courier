# Operations, Release & Monitoring Squad

**Mission:** Every release is reproducible, every release can be undone, and
every incident has a written answer before it happens.

**Code:** `infra`, `docs/operations`, `.github/workflows/restore-test.yml`,
the health endpoints of `apps/api` and `services/auth`

**Tasks:** P6 launch readiness (the deployment as code, the backups and the
restore test, the monitoring and the alerts, the runbook, the release
checklist)

## Targets (the release gate)

- the production stack comes up from `infra/compose.prod.yml` with one
  command and no secret in the repository
- every service answers a health check, and the edge uses it
- a backup can be restored and the data is proven to be back, in CI and on
  the server
- a new version is swapped without a courier noticing, and the rollback is
  one command
- every alert has a threshold, a severity and a name in
  `infra/monitoring/ALERTS.md`
- the runbook answers every incident without anybody having to remember
  anything
- the release checklist names the same gates as the CI

## Evaluation dataset / benchmark

- the restore test itself is the benchmark: `infra/test-restore.sh` proves
  the round trip, and the run of the `Restore test` workflow is the evidence
- `docs/evidence/p6/` holds the output of the health checks, the restore
  test and the deploy

## Research

- `docs/adr/ADR-005-production-deployment.md` - the decisions of the
  deployment: the edge, the rate limits, the health contract, the swap
  without downtime
- `docs/research/2026/cicd-ota-expo.md` - the pipeline research of the
  platform squad

## Working agreement

1. The deployment is code: the compose file, the Caddyfile, the environment
   example and the scripts are in the repository, and nothing is done by hand
   that could be written down.
2. No secret ever reaches the repository, a log or a note. The environment
   file on the server is the only place.
3. Every script refuses to run without the environment it needs, prints what
   it is about to do, and deletes nothing without an explicit flag.
4. A backup is not a backup until the restore has been proven. The restore
   test runs in CI on every change under `infra/`.
5. Every change to the code of this squad updates this folder: the status,
   the metric and the link to the evidence.
6. A regression in a target blocks the merge (the Release Manager role,
   V4 section 1).

## Files

- `STATUS.md` - done with evidence, metrics against the targets, next, risks.
- `decisions.md` - the ADRs this squad owns.
- `../adr/ADR-005-production-deployment.md` - the deployment decisions.
- `../../operations/RUNBOOK.md` - the day-to-day operations.
- `../../operations/RELEASE-CHECKLIST.md` - the steps of a release.
