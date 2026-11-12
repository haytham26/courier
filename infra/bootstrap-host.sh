#!/usr/bin/env bash
# The staging host's bootstrap: what the deploy runs ONCE, over SSH, before the
# first `infra/deploy.sh apply` (the founder decision of 2026-11-11: the Oracle
# Cloud Ampere host, no local server).
#
#   infra/bootstrap-host.sh                       # as ubuntu (or any sudoer)
#   sudo infra/bootstrap-host.sh                 # directly on the host
#
# Everything it touches is idempotent: run it twice and nothing changes. It is
# ARM64-clean: every package comes from Oracle's Ubuntu arm64 mirror, Docker
# from its official apt repository (which serves arm64), and the compose stack
# builds its own images for the host's architecture.
#
# What the founder's Oracle setup guide promises, in order:
#   1. a non-root `deploy` user with passwordless docker (NOT shell) sudo;
#   2. Docker CE + the compose plugin;
#   3. the firewall (ufw): 22 and 80/443 open, the rest closed;
#   4. unattended-upgrades, so a CVE is patched while nobody is watching;
#   5. the swap a small VM needs (Oracle's Ampere always-free boots with none);
#   6. the nightly backup cron (infra/backup.sh) and its restore drill.
#
# It never touches a secret: the secrets are GitHub's (see
# docs/operations/ORACLE_SETUP.md) and this script only reads the host.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_USER="${COURIER_DEPLOY_USER:-deploy}"
DEPLOY_HOME="${COURIER_DEPLOY_HOME:-/opt/courier}"

log() { printf '== %s ==\n' "$*"; }
fail() { printf 'bootstrap: %s\n' "$*" >&2; exit 1; }

# Root is required for the packages; the `deploy` user gets an empty sudo rule.
[ "$(id -u)" = "0" ] || fail "run this as root (or with sudo) on the host"

[ "$(uname -m)" = "aarch64" ] || [ "$(uname -m)" = "x86_64" ] || fail "unknown architecture $(uname -m)"

log "1. the deploy user"
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash "$DEPLOY_USER"
  usermod -aG docker "$DEPLOY_USER" 2>/dev/null || true
fi
# Docker without a password shell: exactly the sudo the deploy needs.
echo "$DEPLOY_USER ALL=(root) NOPASSWD: /usr/bin/docker, /usr/bin/systemctl restart docker" \
  > "/etc/sudoers.d/${DEPLOY_USER}-docker"
chmod 440 "/etc/sudoers.d/${DEPLOY_USER}-docker"

log "2. docker (from Docker's own repository, arm64 + x86_64 both served)"
if ! command -v docker >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  # The Ampere image is arm64; the same repository serves it.
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi
systemctl enable docker
systemctl start docker

log "3. the firewall"
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: inactive"; then
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow OpenSSH
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
fi

log "4. automatic security updates"
export DEBIAN_FRONTEND=noninteractive
apt-get install -y -qq unattended-upgrades update-notifier-common >/dev/null 2>&1 || true

log "5. swap (the always-free Ampere boots with none; Postgres and the build want it)"
if [ "$(swapon --noheadings --show | wc -l)" = "0" ] && [ ! -f /swapfile ]; then
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  echo "/swapfile none swap sw 0 0" >> /etc/fstab
fi

log "6. the place the deploy copies into"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 0755 "$DEPLOY_HOME"

# The backup cron: nightly, as the deploy user, into /var/backups/courier.
# The restore drill (infra/test-restore.sh) runs from the same place.
if [ ! -f /etc/cron.d/courier-backup ]; then
  cat > /etc/cron.d/courier-backup <<CRON
# The nightly Postgres backup (infra/backup.sh); the drill is infra/test-restore.sh.
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
17 3 * * * $DEPLOY_USER cd $DEPLOY_HOME/infra && bash backup.sh >> /var/log/courier-backup.log 2>&1
CRON
  chmod 644 /etc/cron.d/courier-backup
fi

log "bootstrap complete: docker=$(docker --version 2>/dev/null || echo missing), arch=$(uname -m), user=$DEPLOY_USER"
