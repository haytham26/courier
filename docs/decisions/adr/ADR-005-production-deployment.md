# ADR-005 — The production deployment: the edge, the health contract, the swap without downtime

- **Status:** accepted
- **Date:** 2026-10-21
- **Decides:** P6 (launch readiness) of `docs/MASTER_EXECUTION.md`
- **Files:** `infra/`, `docs/operations/`, `.github/workflows/restore-test.yml`

## Context

P6 asks for the deployment as code, the backups with a restore test, the
monitoring with the alerts and the runbook, on the Oracle Cloud machine in
Sydney (the Always Free VM, D12). The stack that has to run there is the
PostgreSQL 16 database with PostGIS, the Valkey cache, the FastAPI service
(`apps/api`) and the auth service (`services/auth`, Better Auth). The app
itself is on the courier's phone, so the server carries the API, the
authentication and nothing else.

Three things had to be decided before the files could be written.

## Decision

### 1. The edge is Caddy 2.10.2 with the rate limit module

Caddy gets and renews the certificate by itself, which removes the whole
certbot ceremony (the challenge, the renewal timer, the reload of the edge
after every renewal) from the runbook of a one-person team.

Caddy has no rate limiter of its own. The only way to have the rate limits
the task asks for, without a second proxy in front of the first one, is the
`caddy-ratelimit` module. That module asks for Caddy 2.10 in its `go.mod`,
so the image is built from the official `caddy:2.10.2-builder-alpine` with
`xcaddy build v2.10.2 --with github.com/mholt/caddy-ratelimit`
(`infra/caddy/Dockerfile`).

The cost of that choice is one minor version of Caddy behind (2.11.x is out).
The upgrade waits for the module to support 2.11; it is not a decision that
has to be revisited every release.

The alternative was nginx, which has `limit_req` built in, but then the
certificate has to be obtained and renewed by something else and the edge
has to be reloaded by hand after every renewal. The comparison is written in
`docs/operations/RUNBOOK.md`.

### 2. The health contract is the same for both services

Every service answers three endpoints, in the same shape:

| Endpoint        | The answer                                                  | The rule                                                                                              |
| --------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `/health/live`  | `200` with the version and the uptime                       | it never touches a dependency, so a slow database can never make the edge restart a healthy container |
| `/health/ready` | `200` when the database answers, `503` when it does not     | the edge takes the service out of the pool when it is not ready                                       |
| `/health`       | `200` or `503` with the version, the uptime and every check | what a human reads                                                                                    |

A failing dependency is reported by the name of the error, never by its
message: the message of a connection error carries the DSN, and the DSN
carries the password.

The edge uses `/health/ready` as its active health check and hides the three
paths from the public (it answers `404`), so the version never leaks to
somebody who is only looking for a way in.

### 3. The swap without downtime is a rolling update over two replicas

Every service runs twice. The edge load-balances over the two replicas,
retries a replica that refuses the connection (`lb_try_duration 5s`) and
takes a replica that fails its health check out of the pool. The replacement
of one replica is therefore invisible to the couriers.

Two things make it work: the replicas keep their address on the network
(`ipv4_address` in the compose file), so the name the edge resolved once
still points at the right container, and the swap is always
`up -d --no-deps <service>`, one replica at a time.

Blue/green was the other candidate. It was not chosen because the two
replicas share the database, and the blue/green version of it needs either a
second database or a hand-made network connection between two compose
projects. The rolling swap needs neither, and the rollback is the same two
commands with the old image.

### 4. The backup is proved by a restore test that runs in CI

`infra/backup.sh` writes a compressed dump, its checksum and a manifest with
the row count of every table. `infra/restore.sh` puts a dump back and
compares the row count of every table with that manifest: a restore that
does not match fails. `infra/test-restore.sh` runs the two scripts against a
scratch database and checks the data, not only the number of rows.

The test runs in CI (`.github/workflows/restore-test.yml`) against a
PostgreSQL service container, because that is the only place with a
PostgreSQL to test against.

### 5. The database image carries pgvector

The PostGIS image carries PostGIS but not pgvector, and `db/schema.sql`
needs both (the locations are geographies, the location notes hold an
embedding). The image adds the pgvector package to the official PostGIS
image (`infra/postgres/Dockerfile`) instead of depending on a community
image that already has both.

## Consequences

- The deployment is one command: `docker compose --env-file infra/prod.env
-f infra/compose.prod.yml up -d`.
- The runbook is short: no certificate to renew by hand, no migration to
  roll back, no service to restart by hand.
- A release of the server is a swap of the images, and the rollback is the
  same procedure with the old tag.
- The cost is one more image to build and one minor version of Caddy behind.

## Risks

| Risk                                                                               | Mitigation                                                                                                  |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| The images were never built on this machine (there is no Docker daemon here)       | the first build happens on the server or in CI; the release checklist makes the digests part of the release |
| The rate limit module does not build against a newer Caddy                         | the image pins 2.10.2; the upgrade waits for the module                                                     |
| The compose file is long and the anchors hide the differences between the replicas | the differences are only the address; the health check and the environment are shared                       |
| The schema only runs when the database volume is empty                             | a schema change is an additive release of its own (`infra/zero-downtime.md`)                                |

## Verification

- The health endpoints: `apps/api/tests/test_health.py` (8 tests) and
  `services/auth/tests/health.test.ts` (9 tests), green on 2026-10-21.
- The bash of the four scripts of `infra/` passes `bash -n`.
- The restore test passed against a real PostgreSQL 16 on 2026-10-21: the
  backup wrote the dump, the checksum and the manifest, the restore put the
  data back, and the row count of every table matched the manifest. The
  safety rules were proved too: the backup refuses to run without the
  environment, the restore refuses the production database without
  `--force-production`, it writes nothing without `--yes`, it refuses a
  target that exists without `--drop-target`, and it refuses a dump that does
  not match its checksum.
- The stack: `docker compose --env-file ... -f infra/compose.prod.yml up -d`
  brought up the seven services and all of them are healthy. The edge answers
  200, the security headers are on the answer, the health paths answer 404
  from the public, the rate limit answered 429 on the 21st request of the
  auth path and on the 121st of the general path, and the heartbeat checked
  the running stack (the API ok, the auth service ok, the error rate counted,
  the certificate and the disk read).
- The images: the API, the auth service, the database and the edge were all
  built and run. The auth service created its ten tables, signed a courier
  up, published the JWKS, and the API read the identity behind the token.
- The Caddyfile: `caddy validate` says "Valid configuration" and `caddy fmt`
  is clean.
- The versions of the images were checked against the official registries on
  2026-10-21 (Caddy 2.10.2 and 2.11.7, the uv 0.13.1 image, Node 22, the
  PostGIS 16-3.6 image, Alpine 3.22, PostgreSQL 16).
- Not verified: the swap without downtime and the rollback were not measured
  under load, and the certificate of a real domain was never obtained (the
  local run used the internal certificate of Caddy for "localhost").
