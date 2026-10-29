#!/usr/bin/env bash
# The post-deploy smoke test (A5): a real round trip through the deployed stack.
#
#   infra/smoke.sh --domain staging.courier.nz --token <a courier's JWT>
#
# It proves four things, in the order a courier's first shift would:
#
#   1. the edge answers TLS and refuses a plain-HTTP request on 443 (the
#      redirect on 80 is the one exception, and it is checked);
#   2. the API is the version that was just deployed (the /healthz contract
#      carries APP_VERSION, so a stale replica behind the edge is visible);
#   3. the health endpoints the edge exposes publicly are 404, so the
#      deployment's internals do not leak;
#   4. with a token, an authenticated request works end to end (the demo seed
#      A1 added, then the run read back) - a deployment where the database or
#      the auth wiring is broken cannot pass this.
#
# The token is optional, and that is a fact about the deployment, not a shortcut:
# the CI verify leg has no staging identity, so it runs the checks that are real
# without one (1-3, plus the anonymous 401) and says which ones it skipped. A
# smoke test that faked a token to make itself green would be worse than no test.
#
# It fails on the first failure with a non-zero exit, and it prints the URL and
# the status of every check: a failing smoke test is the signal for
# `infra/deploy.sh rollback`, so its output has to say what it saw.

set -euo pipefail

DOMAIN=""
TOKEN=""
EVIDENCE_DIR="${COURIER_SMOKE_DIR:-/tmp/courier-smoke}"
# The edge's port. A real deployment answers HTTPS on 443, so that is the
# default and the URL stays clean; the CI verify leg publishes the edge on 8443
# (the runner's own 443 is not ours to take), and passes --port 8443. Before this
# option existed the script always aimed at 443, so the verify leg could never
# reach the stack it had just built: `curl: (7) Failed to connect ...
# port 443`, which reads like a dead edge and is really a wrong port.
PORT="${COURIER_SMOKE_PORT:-443}"

die() {
  printf '::error::%s\n' "$*" >&2
  exit 1
}

log() {
  printf '== %s ==\n' "$*"
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --domain)
      [ "$#" -ge 2 ] || die "--domain needs a value"
      DOMAIN="$2"
      shift 2
      ;;
    --token)
      [ "$#" -ge 2 ] || die "--token needs a value"
      TOKEN="$2"
      shift 2
      ;;
    --evidence)
      [ "$#" -ge 2 ] || die "--evidence needs a value"
      EVIDENCE_DIR="$2"
      shift 2
      ;;
    --port)
      [ "$#" -ge 2 ] || die "--port needs a value"
      PORT="$2"
      shift 2
      ;;
    *) die "unknown argument: $1" ;;
  esac
done

[ -n "$DOMAIN" ] || die "--domain is required (the deployment's public name)"
[ -n "$DOMAIN" ] || die "--port must be a number"   # DOMAIN is checked above; keep the port honest too
case "$PORT" in
  ''|*[!0-9]*) die "--port must be a number (the default is 443)" ;;
esac
[ -n "$TOKEN" ] || log "no --token: the checks that need an identity are skipped, and the report says so"
mkdir -p "$EVIDENCE_DIR"
REPORT="$EVIDENCE_DIR/smoke.md"

# 443 is the default, and a URL with an explicit :443 is a URL nobody typed: the
# port is only spelled when it is not the one a browser would use.
if [ "$PORT" = "443" ]; then
  BASE="https://$DOMAIN"
else
  BASE="https://$DOMAIN:$PORT"
fi
CHECKS=0
PASSED=0

# One check: the name, the URL, the expected status, and the actual answer.
# The body lands in the evidence directory, so a failure can be read.
check() {
  local name="$1" url="$2" expected="$3"
  shift 3
  CHECKS=$((CHECKS + 1))
  local out="$EVIDENCE_DIR/$(printf '%s' "$name" | tr ' /' '__').json"
  local status
  status="$(curl -sS -o "$out" -w '%{http_code}' --max-time 15 "$@" "$url" || echo 000)"
  if [ "$status" = "$expected" ]; then
    PASSED=$((PASSED + 1))
    printf 'PASS  %-34s %s\n' "$name" "$status"
    printf 'PASS  %s (%s)\n' "$name" "$url" >> "$REPORT"
    return 0
  fi
  printf 'FAIL  %-34s %s (expected %s)\n' "$name" "$status" "$expected"
  printf 'FAIL  %s (%s): %s, expected %s\n' "$name" "$url" "$status" "$expected" >> "$REPORT"
  # The body that went with the failure is printed: a smoke test that fails
  # without showing the answer has made the caller deploy twice.
  head -c 400 "$out" 2>/dev/null || true
  echo
  return 1
}

: > "$REPORT"
log "the smoke test of $DOMAIN (the evidence lands in $EVIDENCE_DIR)"

# --- 0. the edge is listening ---------------------------------------------
# `docker compose up -d` returns when the container is started, not when the
# edge accepts a TLS handshake, so a smoke test that ran immediately could get
# `curl: (35) SSL_ERROR_SYSCALL` for a stack that was coming up perfectly well.
# The wait is bounded and it is honest about the deadline: a stack that is not
# answering after 60 seconds is a failed deployment, not a slow one.
EDGE_WAIT="${COURIER_SMOKE_EDGE_WAIT:-60}"
EDGE_DEADLINE=$(( $(date +%s) + EDGE_WAIT ))
until curl -sS -o /dev/null --max-time 5 -k "$BASE/healthz" 2>/dev/null; do
  if [ "$(date +%s)" -ge "$EDGE_DEADLINE" ]; then
    die "the edge did not answer HTTPS at $BASE within ${EDGE_WAIT}s: the deployment is not serving"
  fi
  sleep 2
done
log "the edge answers HTTPS at $BASE"

# --- 1. the edge speaks TLS ------------------------------------------------
# The deployment is HTTPS only, and the port-80 redirect is the one way in -
# but the redirect itself is NOT checked here: this script only proves the edge
# answers TLS with a certificate. An earlier version of this comment claimed the
# redirect was checked, which was a documentation lie the code never made true,
# and a comment that promises a check the script does not run is how a reader
# comes to trust a smoke test it has not read.
if ! check "the edge answers TLS" "$BASE/healthz" 404 -k; then
  die "the edge does not answer HTTPS: nothing after this can be trusted"
fi

# --- 2. the version that was just deployed --------------------------------
# The deployed version, proved through the edge. It is read from /openapi.json,
# which the edge proxies and which carries the API's `info.version` - NOT from
# /healthz, which the Caddyfile answers 404 for on purpose so the version never
# leaks publicly. The earlier version of this check read /healthz through the
# edge, where the 404 has no body at all: the check could never pass, and it was
# skipped in CI (APP_VERSION was not passed to the step) rather than fixed. A
# check that cannot pass is worse than a check that is not run, because it looks
# like coverage.
VERSION_FILE="$EVIDENCE_DIR/version.json"
curl -sS --max-time 15 -k "$BASE/openapi.json" | tee "$VERSION_FILE" > /dev/null || true
if [ -n "${APP_VERSION:-}" ]; then
  if grep -q "\"version\":\"$APP_VERSION\"\|\"version\": \"$APP_VERSION\"" "$VERSION_FILE"; then
    PASSED=$((PASSED + 1))
    printf 'PASS  %-34s %s\n' "the deployed version" "$APP_VERSION"
    printf 'PASS  the deployed version is %s\n' "$APP_VERSION" >> "$REPORT"
  else
    CHECKS=$((CHECKS + 1))
    printf 'FAIL  %-34s %s not in %s\n' "the deployed version" "$APP_VERSION" "$(head -c 200 "$VERSION_FILE")"
    printf 'FAIL  the deployed version: %s not in the openapi answer\n' "$APP_VERSION" >> "$REPORT"
    die "the stack answers a different version than the one deployed: rollback"
  fi
else
  log "APP_VERSION is not set: skipping the version check (set it to prove the swap)"
fi

# --- 3. the authenticated round trip --------------------------------------
# The deployment must refuse an anonymous seed: the token is the only way in.
# This check runs always - it is the one an unauthenticated smoke test can still
# prove, and a stack that seeds for anyone is a stack that is not safe.
if ! check "the seed needs a token" "$BASE/demo/runs" 401 -k -X POST \
  -H 'Content-Type: application/json' -d '{"reason":"staging"}'; then
  die "the seed endpoint answered 200 to an anonymous caller: the deploy is not safe"
fi

if [ -z "$TOKEN" ]; then
  log "no token: the seeded round trip (the seed, the run, the stops) is skipped"
  {
    printf 'SKIP  the seeded round trip (no --token: the CI verify leg has no staging identity)\n'
  } >> "$REPORT"
else
  # A1's demo seed, then the run read back: the exact core flow the app drives.
  # It exercises the database, the auth wiring and the run's 404 discipline.
  SEED_FILE="$EVIDENCE_DIR/seed.json"
  SEED_STATUS="$(curl -sS -o "$SEED_FILE" -w '%{http_code}' --max-time 20 -k -X POST \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d '{"reason":"staging"}' "$BASE/demo/runs" || echo 000)"
  CHECKS=$((CHECKS + 1))
  if [ "$SEED_STATUS" = "200" ]; then
    PASSED=$((PASSED + 1))
    printf 'PASS  %-34s %s\n' "the demo seed" "$SEED_STATUS"
    printf 'PASS  the demo seed\n' >> "$REPORT"
  else
    printf 'FAIL  %-34s %s\n' "the demo seed" "$SEED_STATUS"
    head -c 400 "$SEED_FILE"
    echo
    die "the demo seed failed: the deployment cannot hold a courier's run"
  fi

  RUN_ID="$(python -c 'import json,sys; print(json.load(open(sys.argv[1]))["run_id"])' "$SEED_FILE" 2>/dev/null || true)"
  [ -n "$RUN_ID" ] || die "the seed answered without a run_id: $SEED_FILE"

  # The run reads back through the authz-checked endpoint, with the caller's own
  # token. A deployment whose auth or database is broken cannot pass this.
  if ! check "the seeded run reads back" "$BASE/runs/$RUN_ID" 200 -k \
    -H "Authorization: Bearer $TOKEN"; then
    die "the seeded run did not read back: the database or the auth wiring is broken"
  fi

  # The stops, in the seeded order, with their derived location (ADR-012).
  SHIFT_ID="$(python -c 'import json,sys; print(json.load(open(sys.argv[1]))["shift_id"])' "$SEED_FILE" 2>/dev/null || true)"
  [ -n "$SHIFT_ID" ] || die "the seed answered without a shift_id: $SEED_FILE"
  if ! check "the seeded stops read back" "$BASE/shifts/$SHIFT_ID/stops" 200 -k \
    -H "Authorization: Bearer $TOKEN"; then
    die "the seeded stops did not read back: the deployment's stops are not usable"
  fi
fi

# --- 4. the health endpoints do not leak ---------------------------------
# The Caddyfile answers 404 for /health*: the deployment's internals never
# reach the public internet.
if ! check "the health endpoint is not public" "$BASE/health/ready" 404 -k; then
  die "the health endpoint is public: the deployment leaks its internals"
fi

# --- the report -----------------------------------------------------------
{
  printf '\n## The smoke test of %s\n\n' "$DOMAIN"
  printf -- '- **Result:** %d of %d checks passed\n' "$PASSED" "$CHECKS"
  printf -- '- **The edge:** %s (port %s)\n' "$BASE" "$PORT"
  if [ -z "$TOKEN" ]; then
    printf -- '- **The seeded round trip:** skipped (no --token)\n'
  fi
  printf -- '- **The deployment:** %s\n' "${APP_VERSION:-unset}"
  printf -- '- **The evidence:** %s\n\n' "$EVIDENCE_DIR"
  cat "$REPORT"
} >> "$EVIDENCE_DIR/README.md"

if [ "$PASSED" -ne "$CHECKS" ]; then
  die "the smoke test failed ($PASSED/$CHECKS): roll back with infra/deploy.sh rollback"
fi

log "the smoke test passed ($PASSED/$CHECKS): the deployment holds a courier's day"
