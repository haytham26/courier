#!/usr/bin/env bash
# The founder's HTTPS way in (the 2026-11-12 directive item 1): Cloudflare's
# quick tunnel, downloaded from Cloudflare's own release and VERIFIED before a
# byte of it runs.
#
#   infra/cloudflared.sh fetch        # download + verify the binary (once)
#   infra/cloudflared.sh start        # the two tunnels, hostnames captured
#   infra/cloudflared.sh hostnames    # what the tunnels answer to right now
#   infra/cloudflared.sh stop
#
# WHY TWO TUNNELS. The edge (Caddy) fronts the API and the auth service, and the
# app dials the voice service directly (`EXPO_PUBLIC_VOICE_SERVICE_URL`) - the
# voice service is not behind the edge, and putting it there would split one
# `/v1` prefix across two services. So there is one tunnel for the stack's edge
# and one for the voice service, and the app is told about both.
#
# THE LICENCE: cloudflared is Apache-2.0 (cloudflare/cloudflared; the binary this
# downloads is built from that source). It is the founder's testing tool, not
# shipped in the app, so it is not in docs/product/LICENSES.md (that gate reads
# the mobile app's pnpm closure). The licence and this procedure are recorded
# together in docs/operations/LOCAL_SERVER.md.
#
# THE VERIFICATION is two checks, either of which failing stops the run:
#   1. the file's sha256 is the one pinned below (identity, not a moving ref);
#   2. Windows' own Authenticode read says the binary is signed by Cloudflare,
#      Inc. and the signature is valid. A hijacked download is not signed, and
#      a modified one does not hash the same.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="${COURIER_LOCAL_BIN:-$ROOT/infra/local/bin}"
HOST_FILE="${COURIER_LOCAL_HOSTS:-$ROOT/infra/local/hostnames.env}"
LOG_DIR="${COURIER_LOCAL_LOGS:-$ROOT/infra/local/logs}"

# The pinned release (2026.10.7, built 2026-10-30) and the identity of the
# Windows amd64 binary Cloudflare published for it.
CLOUDFLARED_VERSION="2026.10.7"
CLOUDFLARED_SHA256="2493dbc168923bb3e59e5e7716f71deced92992eea9acd6e9d74f84ac7751343"
CLOUDFLARED_URL="https://github.com/cloudflare/cloudflared/releases/download/${CLOUDFLARED_VERSION}/cloudflared-windows-amd64.exe"
CLOUDFLARED_SIGNER='CN="Cloudflare, Inc."'

log() { printf '== %s ==\n' "$*"; }
fail() { printf 'cloudflared: %s\n' "$*" >&2; exit 1; }

command -v curl >/dev/null 2>&1 || fail "curl is required"
mkdir -p "$BIN_DIR" "$LOG_DIR" "$(dirname "$HOST_FILE")"

fetch() {
  local exe="$BIN_DIR/cloudflared.exe"
  if [ -f "$exe" ] && [ "$(sha256sum "$exe" | awk '{print $1}')" = "$CLOUDFLARED_SHA256" ]; then
    log "cloudflared ${CLOUDFLARED_VERSION} is already fetched and verified"
  else
    log "downloading cloudflared ${CLOUDFLARED_VERSION} from Cloudflare's release"
    curl -fsSL --retry 3 -o "$exe" "$CLOUDFLARED_URL" || fail "the download failed"
    local actual
    actual="$(sha256sum "$exe" | awk '{print $1}')"
    [ "$actual" = "$CLOUDFLARED_SHA256" ] || fail "sha256 MISMATCH: pinned $CLOUDFLARED_SHA256, got $actual"
    log "sha256 matches the pinned identity"
  fi

  # Windows' own read of the publisher's signature. The path is converted first:
  # this shell's `pwd` is a POSIX path (/c/Users/...), which PowerShell cannot
  # open - and a check that cannot read the file is not a check.
  local win
  win="$(cygpath -w "$exe" 2>/dev/null || echo "$exe")"
  local status
  status="$(powershell -NoProfile -Command "\$s = Get-AuthenticodeSignature -FilePath '$win'; if (\$s.Status -ne 'Valid') { 'INVALID' } else { \$s.SignerCertificate.Subject }" 2>/dev/null | tr -d '\r')" || status=""
  case "$status" in
    *"$CLOUDFLARED_SIGNER"*) log "Authenticode: Valid, signed by Cloudflare, Inc." ;;
    *) fail "the signature is not Cloudflare's (got: ${status:-nothing})" ;;
  esac
  "$exe" --version
}

start() {
  fetch
  start_one "edge" "http://127.0.0.1:80"
  start_one "voice" "http://127.0.0.1:8080"
  hostnames
}

start_one() {
  local name="$1" origin="$2"
  local logfile="$LOG_DIR/cloudflared-$name.log"
  local url
  url="$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$logfile" 2>/dev/null | tail -1 || true)"
  if [ -n "$url" ] && curl -fsS --max-time 10 -o /dev/null "$url" 2>/dev/null; then
    log "$name tunnel is already running ($url)"
    return 0
  fi
  log "starting the $name tunnel -> $origin"
  # A quick tunnel assigns its hostname at connect time; the log carries it. The
  # process is started DETACHED (Start-Process, not a shell background job), so
  # it outlives whichever shell ran this: the founder needs the tunnel up for
  # the whole test, not for the lifetime of an agent's command.
  : >"$logfile"
  # The PowerShell command is one line on purpose (BUG-114's lesson again: a
  # continuation character inside a quoted string is not what you think it is).
  # Every path handed to PowerShell is converted first: this shell's paths are
  # POSIX (/c/Users/...), and a Windows process cannot be started from one.
  local win_exe win_log win_err
  win_exe="$(cygpath -w "$BIN_DIR/cloudflared.exe")"
  win_log="$(cygpath -w "$logfile")"
  win_err="$(cygpath -w "$logfile.err")"
  powershell -NoProfile -Command "Start-Process -FilePath '$win_exe' -ArgumentList 'tunnel','--url','$origin','--no-autoupdate' -WindowStyle Hidden -RedirectStandardOutput '$win_log' -RedirectStandardError '$win_err'" >/dev/null
  for _ in $(seq 1 60); do
    # The wait is for the ASSIGNED URL, not the word: the banner line "Requesting
    # new quick Tunnel on trycloudflare.com..." matches a plain domain grep one
    # second in, long before a hostname exists.
    cat "$logfile" "$logfile.err" 2>/dev/null | grep -qE 'https://[a-z0-9-]+\.trycloudflare\.com' && break
    sleep 1
  done
  cat "$logfile" "$logfile.err" 2>/dev/null > "$LOG_DIR/$name-combined.log" || true
  url="$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$LOG_DIR/$name-combined.log" 2>/dev/null | tail -1 || true)"
  [ -n "$url" ] || fail "the $name tunnel never got a hostname (see $logfile and $logfile.err)"
  log "$name tunnel: $url"
}

hostnames() {
  local edge voice
  edge="$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$LOG_DIR/edge-combined.log" 2>/dev/null | tail -1 || true)"
  voice="$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$LOG_DIR/voice-combined.log" 2>/dev/null | tail -1 || true)"
  [ -n "$edge" ] || fail "no edge tunnel hostname in $LOG_DIR/edge-combined.log"
  [ -n "$voice" ] || fail "no voice tunnel hostname in $LOG_DIR/voice-combined.log"
  cat >"$HOST_FILE" <<HOSTS
# What the founder's tunnels answer to. Generated by infra/cloudflared.sh; never
# committed (infra/local/ is git-ignored). A quick tunnel's URL changes on every
# restart, so this file is rewritten then and the stack recreated with it.
COURIER_EDGE_URL=$edge
COURIER_VOICE_URL=$voice
HOSTS
  log "hostnames written to $HOST_FILE"
  cat "$HOST_FILE"
}

stop() {
  log "stopping the tunnels"
  taskkill //F //IM cloudflared.exe >/dev/null 2>&1 || true
}

case "${1:-}" in
  fetch) fetch ;;
  start) start ;;
  hostnames) hostnames ;;
  stop) stop ;;
  *) fail "usage: infra/cloudflared.sh fetch|start|hostnames|stop" ;;
esac
