# Operations, Release & Monitoring Squad - status

Updated: 2026-10-21 (P6, the deployment as code, the backups, the monitoring
and the runbook)

## Done (with evidence)

- `infra/compose.prod.yml`: the production stack (the database, the cache, two
  replicas of the API, two of the auth service, the edge), with the volumes,
  the health checks, the resource limits, the restart policies and every
  secret read from the environment.
- `infra/Caddyfile`: the TLS (Caddy gets and renews the certificate), the
  HSTS, the security headers, the rate limits (120 a minute for the API, 20
  for the auth paths) and the proxy to the two services with the retry and
  the active health check that make the swap without downtime work.
- `infra/caddy/Dockerfile`, `infra/postgres/Dockerfile`, `apps/api/Dockerfile`
  and `services/auth/Dockerfile`: the images, built from the official base
  images.
- `infra/env.example`: every variable the deployment reads, with the reason
  it is needed and where the value comes from.
- `infra/backup.sh`, `infra/restore.sh` and `infra/test-restore.sh`: the
  backup of the database (the dump, the checksum and the manifest with the
  row count of every table), the restore that compares those row counts, and
  the test that runs both against a scratch database.
- `infra/zero-downtime.md`: the rolling swap over the two replicas, the
  rollback and the rules of the database change.
- `infra/monitoring/`: the heartbeat (the health endpoints, the error rate of
  the edge, the age of the backup, the certificate, the disk), the compose
  profile that runs it and `ALERTS.md` with the thresholds and who is woken.
- The health endpoints of the two services: `/health`, `/health/live` and
  `/health/ready`, with the version, and never a secret in the answer.
- `docs/operations/RUNBOOK.md` and `docs/operations/RELEASE-CHECKLIST.md`.
- `.github/workflows/restore-test.yml`: the restore test in CI, against a
  PostgreSQL service container.

## Metrics against the targets

| Metric                                   | Target                              | Today                                                   | Evidence                                          |
| ---------------------------------------- | ----------------------------------- | ------------------------------------------------------- | ------------------------------------------------- |
| The health endpoints of the API          | 3 answers, 200 or 503               | done                                                    | `apps/api/tests/test_health.py` (8 tests)         |
| The health endpoints of the auth service | 3 answers, 200 or 503               | done                                                    | `services/auth/tests/health.test.ts` (9 tests)    |
| The bash of the scripts                  | `bash -n` clean                     | done                                                    | the four scripts of `infra/`                      |
| The round trip of the backup             | the data is back, table by table    | done on a real PostgreSQL 16                            | `bash infra/test-restore.sh --clean`, 2026-10-21  |
| The stack comes up                       | 7 healthy services                  | done                                                    | `docker compose up -d`, 2026-10-21                |
| The rate limits of the edge              | 429 on the limit                    | done                                                    | the 21st request of the auth path, 2026-10-21     |
| The images                               | four images, built and run          | done                                                    | the API, the auth service, the database, the edge |
| The Caddyfile                            | `caddy validate` and `caddy fmt`    | done ("Valid configuration")                            | 2026-10-21                                        |
| The time of the swap                     | no request is lost                  | not measured under load                                 | `infra/zero-downtime.md`                          |
| The time of the rollback                 | under a minute                      | not measured under load                                 | `infra/zero-downtime.md`                          |
| The age of the newest backup             | under 26 hours                      | the schedule is written; the server does not run it yet | the cron line in the runbook                      |
| The alerts                               | 7 rules with a threshold and a name | done                                                    | `infra/monitoring/ALERTS.md`                      |
| The gates of the release checklist       | the same as the CI                  | done                                                    | `docs/operations/RELEASE-CHECKLIST.md`            |

## Next

1. Measure the swap and the rollback on the server, with a load generator,
   and write the numbers in this file.
2. Run the restore test in CI and link the run in this file.
3. Add the push of the images to the registry to a workflow, so the release
   tags the images instead of building them on the server.
4. Add the cost guard of P6 (the alerts before the free tiers run out) next
   to the heartbeat.
5. Copy the dumps off the server (the R2 bucket of Cloudflare) and write the
   check that the copy is there into the runbook.

## Risks

- Caddy 2.10.2 is one minor version behind, because the rate limit module
  asks for Caddy 2.10. The upgrade waits for the module.
- The database image is the PostGIS 3.6 one, because it is the newest the
  PostGIS project builds on a base whose PostgreSQL repository still serves
  the pgvector package. The development compose file still runs 3.5; the
  schema is the same on both.
- The heartbeat counts the error rate from the access log of the edge. It
  needs the log to be a file, which it is (`/var/log/caddy/access.log`).
- The `postgres` service applies `db/schema.sql` only when its volume is
  empty. A schema change after the first start needs a migration, and the
  migration folder is not in the tree yet.
