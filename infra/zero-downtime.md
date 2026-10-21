# The swap of a version without downtime

How a new version of the API or of the auth service replaces the running one
without a courier noticing.

The method is the **rolling update over two replicas**. It was chosen over
blue/green because the stack is small, the database is shared by both replicas
and a rollback is one command: the same procedure, with the old image.

## Why it works

- Every service runs twice: `api_a` and `api_b`, `auth_a` and `auth_b`.
- The edge (Caddy) sends the traffic to both and retries a replica that
  refuses the connection (`lb_try_duration 5s`), so a replica that is being
  replaced does not turn into a failed request.
- The edge also asks every replica whether it is ready
  (`health_uri /health/ready`, every 10 seconds) and takes a replica that
  answers wrongly out of the pool.
- Each service keeps its address on the network (`172.28.0.20` and
  `172.28.0.21` for the API). The edge resolves the name once and keeps the
  address, so the replacement of a container does not make the edge point at
  an address that no longer exists.

The result: while one replica is replaced, the other one answers. The driver
never sees a refused connection.

## The rules

1. One replica at a time. The other one stays in the pool the whole time.
2. The health endpoint of the replaced replica has to answer `200` before the
   next one is touched.
3. The database is never touched by a swap. A schema change needs its own
   step (the migration, below).
4. A change of `AUTH_JWT_ISSUER`, of the audience or of `BETTER_AUTH_SECRET`
   is not a swap: it signs the couriers out. It is a separate, announced
   change.

## The steps

The commands run on the server, in the folder of the repository, with the
environment file of the deployment:

```bash
cd /srv/courier
source infra/prod.env   # or: set -a; . infra/prod.env; set +a
```

### 1. The pre-flight

```bash
docker compose --env-file infra/prod.env -f infra/compose.prod.yml config
docker compose --env-file infra/prod.env -f infra/compose.prod.yml ps
```

Both have to be healthy before the swap starts. If one of them is not, the
swap waits: a swap on top of a broken stack hides the problem.

### 2. The new images

```bash
export APP_VERSION=v1.2.3
export COURIER_API_IMAGE=registry.example/courier-api:${APP_VERSION}
export COURIER_AUTH_IMAGE=registry.example/courier-auth:${APP_VERSION}
docker compose --env-file infra/prod.env -f infra/compose.prod.yml pull
```

The images are pulled before anything is replaced, so the swap itself only
takes seconds. The version and the images are written into the environment
file as well, so a later restart of the stack runs the same version.

### 3. The swap of the API, one replica at a time

```bash
docker compose --env-file infra/prod.env -f infra/compose.prod.yml up -d --no-deps api_a
# wait for it to be healthy, then:
docker compose --env-file infra/prod.env -f infra/compose.prod.yml up -d --no-deps api_b
```

`--no-deps` is what keeps the database, the cache and the auth service
untouched. The command returns when the container has started; the health
check needs a moment:

```bash
docker compose --env-file infra/prod.env -f infra/compose.prod.yml ps
docker compose --env-file infra/prod.env -f infra/compose.prod.yml exec api_a \
	python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/health').read().decode())"
```

The answer carries the version. When it is the new one, the replica is in the
pool.

### 4. The swap of the auth service

The same, one replica at a time:

```bash
docker compose --env-file infra/prod.env -f infra/compose.prod.yml up -d --no-deps auth_a
docker compose --env-file infra/prod.env -f infra/compose.prod.yml up -d --no-deps auth_b
```

The API caches the JWKS for 300 seconds. A swapped auth service keeps the
same key (the key pair lives in the database), so the tokens of the signed-in
couriers stay valid.

### 5. The check

```bash
curl -sS https://$COURIER_DOMAIN/health | head -c 400   # answers 404: the edge hides it
docker compose --env-file infra/prod.env -f infra/compose.prod.yml exec api_a \
	python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/health').read().decode())"
docker compose --env-file infra/prod.env -f infra/compose.prod.yml logs --tail 50 api_b
```

The heartbeat has to stay quiet. The log of the edge must not show a burst of
`502`.

## The rollback

The rollback is the same procedure with the old image. Nothing has to be
undone in the database, because the swap never touches it.

```bash
export COURIER_API_IMAGE=registry.example/courier-api:v1.2.2   # the version before
docker compose --env-file infra/prod.env -f infra/compose.prod.yml up -d --no-deps api_a
docker compose --env-file infra/prod.env -f infra/compose.prod.yml up -d --no-deps api_b
```

The old image has to be on the server (`docker images`). When the old image
was removed, pull it again:

```bash
docker pull registry.example/courier-api:v1.2.2
```

The rollback takes the same two commands and the same two checks. It is
finished in under a minute.

## The database

The swap does not migrate the database. A schema change is a release of its
own, in this order:

1. The change is **additive**: a new column with a default, a new table, a
   new index. The old code ignores it.
2. The new code is swapped in (this document).
3. The old column or the old table is dropped in a later release, once
   nothing reads it.

The schema of a fresh database is `db/schema.sql`, which the database
container runs when its volume is empty. A database that is already running
is never re-created: the change goes through a migration.

## What breaks this

| What                                             | Why                                              | What to do                                          |
| ------------------------------------------------ | ------------------------------------------------ | --------------------------------------------------- |
| A schema change in the same release as the swap  | the old code meets the new schema                | split the release (above)                           |
| A change of `BETTER_AUTH_SECRET`                 | every signed-in courier is signed out            | announce it, do it in a quiet hour                  |
| A change of `AUTH_JWT_ISSUER` or of the audience | the API refuses the tokens it is given           | change both services in one step, with the API last |
| A replica without a fixed address                | the edge keeps an address that no longer exists  | keep the `ipv4_address` of the compose file         |
| A swap with `--no-deps` left out                 | the database and the cache are restarted as well | always use `--no-deps`                              |
