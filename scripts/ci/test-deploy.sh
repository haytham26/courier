#!/usr/bin/env bash
# The deploy script's own test (BUG-096), with a stubbed docker.
#
# The bug: `apply()` wrote the INCOMING images into `.deploy-state`, because
# `record_state` ran with the caller's new-tag environment, so a failed smoke
# test's rollback re-deployed the same failing image while announcing "the
# previous images are running again". This suite runs the REAL
# `infra/deploy.sh` with a docker stub on PATH, so what it proves is the
# script the workflow drives, not a re-implementation of it.
#
#   bash scripts/ci/test-deploy.sh
#
# The stub records every compose call in order, answers `compose ps` with the
# images the test says are running - the only thing the real script has to
# learn the previous images from - and copies the state file at the moment
# `up -d` runs.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY="$ROOT/infra/deploy.sh"

PASS=0
FAIL=0

good() { PASS=$((PASS + 1)); printf 'ok - %s\n' "$1"; }
bad() { FAIL=$((FAIL + 1)); printf 'not ok - %s\n' "$1"; }

check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    good "$name"
  else
    bad "$name (expected [$expected], got [$actual])"
  fi
}

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

#: What the stack is running now: the stub's answer to `compose ps`.
RUNNING_PS="$WORK/running-ps.txt"
#: Every compose call the stub saw, in order.
CALLS="$WORK/calls.log"
#: The state file as it stood when the first `up -d` ran.
STATE_AT_UP="$WORK/state-at-up.txt"
#: The caller's environment file, and the tag the caller is deploying.
CALLER_ENV="$WORK/caller.env"
STATE_FILE="$WORK/state/.deploy-state"
: > "$CALLS"
mkdir -p "$WORK/state"

cat > "$WORK/docker" <<'STUB'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$CALL_LOG"
# The arguments after `compose` are the flags and then the sub-command
# (`--env-file <file> -f <file> ps --all --format ...`), so the sub-command is
# found among them rather than in the first position.
verb=""
for arg in "$@"; do
  case "$arg" in
    ps | up | exec | run | config | logs) verb="$arg" ;;
  esac
done
case "$verb" in
  ps) cat "$RUNNING_PS" 2>/dev/null || true; exit 0 ;;
  up) cp "$STATE_FILE" "$STATE_AT_UP" 2>/dev/null || true; exit 0 ;;
  *) exit 0 ;;
esac
STUB
chmod +x "$WORK/docker"

run_deploy() {
  local command="$1"
  env -i \
    PATH="$WORK:/usr/bin:/bin" \
    HOME="$WORK" \
    CALL_LOG="$CALLS" \
    RUNNING_PS="$RUNNING_PS" \
    STATE_FILE="$STATE_FILE" \
    STATE_AT_UP="$STATE_AT_UP" \
    COURIER_DEPLOY_STATE="$STATE_FILE" \
    COURIER_API_IMAGE="courier-api:new-sha" \
    COURIER_AUTH_IMAGE="courier-auth:new-sha" \
    APP_VERSION="new-sha" \
    bash "$DEPLOY" "$command" --from "$CALLER_ENV"
}

state_of() { grep "^$1=" "$STATE_FILE" | cut -d= -f2-; }
calls_with() { grep -c "$1" "$CALLS" || true; }

cat > "$CALLER_ENV" <<'ENV'
POSTGRES_USER=courier
POSTGRES_DB=courier
ENV

cat > "$RUNNING_PS" <<'PS'
NAME            IMAGE
api_a           courier-api:old-sha
auth_a          courier-auth:old-sha
PS

# --- 1. the state an apply records is the state that was running ------------

printf '# the apply records what is running, not what the caller is deploying\n'
if run_deploy apply > "$WORK/apply.log" 2>&1; then applied=ok; else applied=failed; fi
check "the apply runs to the end" "ok" "$applied"
check "the state holds the api image that was running" "courier-api:old-sha" \
  "$(state_of COURIER_API_IMAGE)"
check "the state holds the auth image that was running" "courier-auth:old-sha" \
  "$(state_of COURIER_AUTH_IMAGE)"

# --- 2. the state was correct at the moment the new image started -----------

printf '# the state file is written before the new image is started\n'
check "the state was the old image when up -d ran" "courier-api:old-sha" \
  "$(grep '^COURIER_API_IMAGE=' "$STATE_AT_UP" | cut -d= -f2-)"
check "the apply started the stack" "1" "$(calls_with 'up -d --remove-orphans')"

# --- 3. the rollback returns to the images the state holds ------------------

printf '# the rollback re-deploys the images the state records\n'
: > "$CALLS"
if run_deploy rollback > "$WORK/rollback.log" 2>&1; then rolled=ok; else rolled=failed; fi
check "the rollback runs to the end" "ok" "$rolled"
check "the rollback asked the stack up again" "1" "$(calls_with 'up -d --remove-orphans')"
check "the state after the rollback is the image it rolled back to" "courier-api:old-sha" \
  "$(state_of COURIER_API_IMAGE)"

# --- 4. a first deploy, with nothing running, records the compose defaults ---

printf '# with no stack running the state holds what compose would start\n'
rm -f "$STATE_FILE"
: > "$RUNNING_PS"
if run_deploy apply > "$WORK/first.log" 2>&1; then first=ok; else first=failed; fi
check "the first apply runs to the end" "ok" "$first"
check "the state names the local image compose defaults to" "courier-api:local" \
  "$(state_of COURIER_API_IMAGE)"

printf '# %s passed, %s failed\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
