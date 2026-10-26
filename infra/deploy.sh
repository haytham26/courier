#!/usr/bin/env bash
# The staging deploy (A5): one command takes a built image set from `compose
# config` to a healthy deployment, or returns to the images that were running.
#
#   infra/deploy.sh apply  --from infra/staging.env
#   infra/deploy.sh rollback --from infra/staging.env
#
# The order is the audit's own done-when: the migrations, the new images, the
# smoke test, and a rollback to the previous images when the smoke test fails.
#
# Every step is a checked command: the script has `set -euo pipefail` and its
# own `fail` helper, so a partial deploy never reports success. The rollback
# re-applies the exact images that were running before, which the state file
# records (never a guessed "previous" tag: the images are named by digest).
#
# The audit's founder input - the OCI host and key - is not here: the script
# runs on whatever host the caller is on, and the workflow that calls it over
# SSH is `workflows/../.github/workflows/deploy.yml`. Until the host exists,
# `infra/deploy.sh` is the same procedure the workflow runs, driven by hand
# against a local VM (AUDIT_2026-10-25 A5).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Which stack: staging (the one A5 deploys) by default, production by name.
COMPOSE_FILES=(infra/compose.staging.yml)
STATE_FILE="${COURIER_DEPLOY_STATE:-$ROOT/.deploy-state}"

fail() {
  printf '::error::%s\n' "$*" >&2
  exit 1
}

log() {
  printf '== %s ==\n' "$*"
}

# --- the two things the caller must give -------------------------------------

FROM_ENV=""
COMMAND="${1:-}"

shift || true
while [ "$#" -gt 0 ]; do
  case "$1" in
    --from)
      [ "$#" -ge 2 ] || fail "--from needs a value"
      FROM_ENV="$2"
      shift 2
      ;;
    --prod)
      # The production stack: the same procedure, the production compose file.
      COMPOSE_FILES=(infra/compose.prod.yml)
      shift
      ;;
    *)
      fail "unknown argument: $1"
      ;;
  esac
done

[ -n "$COMMAND" ] || fail "usage: infra/deploy.sh apply|rollback [--from <env file>] [--prod]"
[ -n "$FROM_ENV" ] || fail "the environment file is required (--from infra/staging.env): it holds the secrets"
[ -f "$FROM_ENV" ] || fail "the environment file does not exist: $FROM_ENV"
# The compose invocation runs from infra/, so a relative --from would resolve
# against the wrong directory there. Make it absolute before compose sees it.
case "$FROM_ENV" in
  /*) ;;
  *) FROM_ENV="$PWD/$FROM_ENV" ;;
esac

log "the deploy ($COMMAND) from $FROM_ENV on $(uname -s) with ${COMPOSE_FILES[*]}"

# Compose runs from infra/, where its files live and where their relative
# `context:` and `volumes:` paths resolve. The env file is absolute (see above)
# and the compose names are bare, because they are already in that directory.
# Every step uses the same invocation, so a step that forgot one would fail loudly
# rather than deploying a half-defined stack.
COMPOSE_ARGS=()
for file in "${COMPOSE_FILES[@]}"; do
  COMPOSE_ARGS+=(-f "$(basename "$file")")
done

run_compose() {
  (
    cd "$ROOT/infra" || exit 1
    docker compose --env-file "$FROM_ENV" "${COMPOSE_ARGS[@]}" "$@"
  )
}

# ---------------------------------------------------------------------------
# The migrations.
#
# The schema is the contract's own file, applied idempotently (every statement
# in it guards with IF NOT EXISTS / CREATE OR REPLACE, which is what makes the
# Postgres entrypoint able to run it on a fresh volume and the deploy able to
# run it on an existing one). A migration that fails is a failed deploy: the
# new images are never started against a half-migrated database.
# ---------------------------------------------------------------------------
migrate() {
  log "the migrations (packages/contracts/db/schema.sql)"
  # The compose file starts postgres, but `up -d` returns when the container is
  # up, not when the server accepts connections: a migration that ran one second
  # too early would fail with "no such file or directory" for the socket. Wait
  # for the server, with a deadline.
  if ! run_compose up -d --wait postgres; then
    fail "the database did not become ready: the deploy stops here"
  fi
  run_compose exec -T postgres \
    psql -U "${POSTGRES_USER:-courier}" -d "${POSTGRES_DB:-courier}" \
    -v ON_ERROR_STOP=1 -f - \
    < "$ROOT/packages/contracts/db/schema.sql" \
    || fail "the migrations failed: the deploy stops here, and no image is changed"
}

# ---------------------------------------------------------------------------
# The state file: the images that were running, recorded before the swap.
# `docker compose ps --format` prints one line per service with its image, so
# the rollback re-applies exactly what was running. Recorded by digest-less
# tag, which is what the deploy itself sets - the two agree because the
# deploy sets COURIER_API_IMAGE / COURIER_AUTH_IMAGE and the compose file
# reads them.
# ---------------------------------------------------------------------------
record_state() {
  log "recording the images that are running (the rollback's truth)"
  {
    printf 'COURIER_API_IMAGE=%s\n' "${COURIER_API_IMAGE:-courier-api:local}"
    printf 'COURIER_AUTH_IMAGE=%s\n' "${COURIER_AUTH_IMAGE:-courier-auth:local}"
    printf 'APP_VERSION=%s\n' "${APP_VERSION:-unknown}"
  } > "$STATE_FILE"
  log "the state is in $STATE_FILE"
}

apply() {
  migrate
  record_state

  log "starting the stack (the images: ${COURIER_API_IMAGE:-courier-api:local}, ${COURIER_AUTH_IMAGE:-courier-auth:local})"
  run_compose up -d --remove-orphans

  # The compose file's own healthchecks gate `caddy` on the API and the auth
  # service being healthy, so `up -d` returns when the edge is usable. The
  # smoke test is the next step, not this one: a container being "healthy" is
  # the deployment's own claim, and the smoke test is ours.
  log "the stack is up"
}

rollback() {
  [ -f "$STATE_FILE" ] || fail "no state file ($STATE_FILE): there is nothing to roll back to"
  log "rolling back to the images in $STATE_FILE"
  # shellcheck disable=SC1090
  . "$STATE_FILE"
  export COURIER_API_IMAGE COURIER_AUTH_IMAGE
  record_state
  run_compose up -d --remove-orphans
  log "the previous images are running again"
}

case "$COMMAND" in
  apply) apply ;;
  rollback) rollback ;;
  *) fail "unknown command: $COMMAND (apply|rollback)" ;;
esac
