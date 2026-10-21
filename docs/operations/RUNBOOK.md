# The runbook of Courier Copilot

The day-to-day operations of the production stack: how to deploy, how to roll
back, how to restore, how to look after the certificate and the secrets, and
what to do when something breaks.

Nobody has to remember any of this. Every command is written out.

The stack lives in `infra/`; the release steps are in
`docs/operations/RELEASE-CHECKLIST.md`; the alert rules are in
`infra/monitoring/ALERTS.md`.

## What runs where

| Service            | What it does                                         | Where it is                               |
| ------------------ | ---------------------------------------------------- | ----------------------------------------- |
| `postgres`         | the database (PostgreSQL 16, PostGIS, pgvector)      | the volume `courier-postgres-data`        |
| `valkey`           | the cache and the store of the rate limiter          | the volume `courier-valkey-data`          |
| `api_a`, `api_b`   | the FastAPI service (two replicas)                   | the image `COURIER_API_IMAGE`             |
| `auth_a`, `auth_b` | the auth service, Better Auth (two replicas)         | the image `COURIER_AUTH_IMAGE`            |
| `caddy`            | the edge: TLS, the security headers, the rate limits | the image `COURIER_CADDY_IMAGE`           |
| `heartbeat`        | the monitor that posts to the webhook                | `infra/monitoring/compose.monitoring.yml` |

Only the edge is reachable from outside. The other services answer on the
internal network `courier-net` and nothing else.

## The three commands you will use most

```bash
cd /srv/courier
export COMPOSE="docker compose --env-file infra/prod.env -f infra/compose.prod.yml"

$COMPOSE ps                 # what is running, and is it healthy
$COMPOSE logs -f --tail 100 api_a   # the log of a service
$COMPOSE exec api_a python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/health').read().decode())"
```

The last one asks the health endpoint of a service from inside the network.
It answers with the version that is running, which is the first thing to look
at when something behaves strangely.

## The deploy

The full procedure, with every gate, is in
`docs/operations/RELEASE-CHECKLIST.md`. This is the short version, for the
days when the release is routine.

```bash
cd /srv/courier
git fetch --tags
git checkout <the tag of the release>

export APP_VERSION=v1.2.3
export COURIER_API_IMAGE=registry.example/courier-api:${APP_VERSION}
export COURIER_AUTH_IMAGE=registry.example/courier-auth:${APP_VERSION}

$COMPOSE pull
$COMPOSE up -d --no-deps api_a      # one replica at a time
$COMPOSE up -d --no-deps api_b
$COMPOSE up -d --no-deps auth_a
$COMPOSE up -d --no-deps auth_b
```

The version and the images also go into `infra/prod.env`, so that a later
restart of the stack (a reboot of the server) runs the same version.

The swap without downtime and the rollback are written out in
`infra/zero-downtime.md`. Read that file before the first deploy.

**A deploy of the production stack is a founder approval gate** (MASTER_EXECUTION
section 7). Prepare everything, put it in `docs/FOUNDER_TODO.md`, and wait
for the yes.

## The rollback

The same procedure with the image of the version before. The database is
never touched by a swap, so there is nothing to undo in it.

```bash
export COURIER_API_IMAGE=registry.example/courier-api:v1.2.2
$COMPOSE up -d --no-deps api_a
$COMPOSE up -d --no-deps api_b
```

Under a minute. Do it first and think afterwards: a half-deployed stack is
worse than the old version.

## The backup

The backup runs every night at 03:20 New Zealand time:

```bash
20 3 * * * cd /srv/courier && /srv/courier/infra/backup.sh >> /var/log/courier/backup.log 2>&1
```

It writes four files into `/var/backups/courier`: the dump, its checksum, the
manifest with the row count of every table, and the checksum of the manifest.
The manifest is what makes the restore provable.

To run it by hand:

```bash
cd /srv/courier
set -a; . infra/prod.env; set +a
export COURIER_DB_CONTAINER=postgres
export COURIER_COMPOSE_ENV_FILE=infra/prod.env
bash infra/backup.sh --dry-run     # what it would do
bash infra/backup.sh                # the dump
```

With `COURIER_DB_CONTAINER` set, the database client runs inside the
container, so the server needs no PostgreSQL client installed. Without it,
the scripts use the `pg_dump` and `psql` of the machine, and `PGPASSWORD`
has to be set.

The dumps have to leave the server. A backup on the same disk as the database
is not a backup. Copy them somewhere else (the R2 bucket of Cloudflare, or a
second machine) and check that the copy is there.

The folder of the backups must be kept: 7 days of daily dumps and 4 weekly
ones is enough to survive a mistake with a month of data in it.

## The restore

**A restore into the production database deletes what is in it.** The founder
has to approve it (MASTER_EXECUTION section 7). The restore script refuses to
touch the production database without `--force-production`.

The safe way to restore is into a scratch database first, and to look at it:

```bash
cd /srv/courier
set -a; . infra/prod.env; set +a
export COURIER_DB_CONTAINER=postgres
export COURIER_COMPOSE_ENV_FILE=infra/prod.env

bash infra/restore.sh \
  --dump /var/backups/courier/courier-20261021T032000Z.dump \
  --target-db courier_restore_check

# look at it
$COMPOSE exec postgres psql --username=courier --dbname=courier_restore_check \
  --command="SELECT count(*) FROM stops"

# when it is right, the real restore (with the founder's yes)
bash infra/restore.sh \
  --dump /var/backups/courier/courier-20261021T032000Z.dump \
  --target-db courier \
  --drop-target --force-production --yes
```

The restore compares the row count of every table with the manifest that came
with the dump. A mismatch fails the restore: the data is not back, and the
operator has to know before the couriers do.

The restore test runs the same two scripts against a scratch database and
proves the data is back. It runs in CI (`.github/workflows/restore-test.yml`)
and can be run on the server:

```bash
bash infra/test-restore.sh --clean
```

## The certificate

Caddy gets the certificate by itself and renews it about 30 days before it
expires. There is nothing to renew by hand.

The things that break the renewal:

- the DNS of the domain no longer points at the server;
- the port 80 or the port 443 is blocked by a firewall;
- the address of the server changed and the DNS was not updated.

When the renewal fails, Caddy says so in its log:

```bash
$COMPOSE logs --tail 200 caddy | grep -i -E "certificate|acme|obtain"
```

The check that comes before the failure:

```bash
$COMPOSE exec heartbeat bash -c "openssl x509 -enddate -noout -in /caddy-data/caddy/certificates/\$COURIER_DOMAIN/\$COURIER_DOMAIN.crt"
```

The heartbeat warns 14 days before the expiry (`infra/monitoring/ALERTS.md`).

## The secrets

The secrets live in `/srv/courier/infra/prod.env` (mode 0600, owned by root)
and nowhere else. They are never in the repository and never in a log.

| Secret               | What it is                                   | How it is generated       |
| -------------------- | -------------------------------------------- | ------------------------- |
| `POSTGRES_PASSWORD`  | the database                                 | `openssl rand -base64 32` |
| `VALKEY_PASSWORD`    | the cache                                    | `openssl rand -base64 32` |
| `BETTER_AUTH_SECRET` | the signature of the sessions and the tokens | `openssl rand -base64 32` |

To rotate one:

1. Write the new value into `infra/prod.env`.
2. Restart the service that uses it, one replica at a time:
   ```bash
   $COMPOSE up -d --no-deps api_a
   $COMPOSE up -d --no-deps api_b
   ```
3. Check the health endpoint of the service before touching the next one.

**Rotating `BETTER_AUTH_SECRET` signs every courier out.** Do it in a quiet
hour and say so in the channel first. The other two can be rotated without
the couriers noticing.

When a secret may have leaked, rotate it first and clean the history after.
A secret that has reached somebody else is compromised the moment it lands
there; the order never changes.

## The incidents

### The API does not answer

1. Is it the new version? `docker compose logs --tail 100 api_a api_b`.
2. Is the database up? `docker compose ps postgres`. A failing database takes
   the readiness check with it, and the API answers `503` for everything.
3. Is one replica broken? `docker compose ps` shows which one. The edge takes
   a replica that fails its health check out of the pool, so the couriers are
   still served by the other one.
4. Did the new version break something? Roll it back
   (`infra/zero-downtime.md`).
5. Is the memory of the server full? `free -h` and `docker stats --no-stream`.

### The auth service does not answer

1. Is the database up? The auth service keeps the sessions and the signing
   keys in the database.
2. Is the secret right? A wrong `BETTER_AUTH_SECRET` makes the service
   refuse to start: the log says which variable is missing.
3. Are the origins right? A request from an origin that is not in
   `AUTH_TRUSTED_ORIGINS` is refused.

### The disk of the database is full

In this order, and never by deleting the data:

1. The old logs of the containers: `docker system df` and the log driver.
2. The old images: `docker images` and then `docker image prune` for the
   images that no release uses.
3. The old backups on the server: keep the 7 daily ones and the 4 weekly
   ones, and copy the rest somewhere else first.

The data of the couriers is never deleted to make room.

### The backup did not run

```bash
tail -n 50 /var/log/courier/backup.log
```

The usual cause is the crontab of the wrong user, or a `prod.env` that cannot
be read by the user the cron runs as. Run the backup by hand and fix the
schedule.

### The certificate is about to expire

The heartbeat warns 14 days before the expiry. Check the DNS first, then the
ports, then the log of the edge. Caddy retries the renewal by itself every
hour; once the cause is gone, the certificate comes back without anybody
touching it.

### The disk of the server is full

```bash
df -h
docker system df
```

The volumes are the big ones: `courier-postgres-data` and the backup folder.
Move the backups off the server and prune the old images.

## The on-call

| What                                                   | Who                                               | How long                    |
| ------------------------------------------------------ | ------------------------------------------------- | --------------------------- |
| A critical alert (the API or the auth service is down) | the founder                                       | looked at within 15 minutes |
| A high alert (the error rate, the disk, the backup)    | the founder                                       | the same day                |
| A medium alert (the certificate)                       | the founder                                       | within two working days     |
| The deploy of a new version                            | the founder approves, the Release Manager runs it | in working hours            |
| The restore into production                            | the founder approves                              | as soon as it is agreed     |

The founder is the only on-call. When the founder is away, the alerts still
arrive in the channel, and the runbook above is what the stand-in follows.

The Release Manager (the agent) writes down every incident in
`docs/EXECUTOR_LOG.md` and every change in the release checklist, so the next
person does not have to work it out again.
