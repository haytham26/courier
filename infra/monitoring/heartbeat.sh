#!/usr/bin/env bash
# heartbeat.sh - the uptime monitor of the Courier Copilot production stack.
#
# It checks the health of the two services, the error rate of the edge, the
# age of the last backup, the certificate and the disk, and it posts to a
# webhook when something is wrong.
#
# What it needs:
#   API_HEALTH_URL      the readiness endpoint of the API
#   AUTH_HEALTH_URL     the readiness endpoint of the auth service
#   ALERT_WEBHOOK_URL   the webhook that receives the alert (optional: without
#                       it the script only writes to the log)
#   HEARTBEAT_INTERVAL  the seconds between the checks (default 60)
#   ALERT_COOLDOWN      the seconds between two alerts of the same kind
#                       (default 900)
#   BACKUP_DIR          the folder the backups live in (the age of the newest
#                       dump is checked)
#   ACCESS_LOG          the access log of the edge (the error rate is counted
#                       in it)
#   CERT_FILE           the certificate of the edge (its expiry is checked)
#   CERT_DIR            the folder the certificates of the edge live in (every
#                       certificate in it is checked)
#   DISK_PATH           the folder whose disk usage is checked
#   STATE_DIR           the folder the alert state is kept in
#
# The thresholds and who is woken are written down in
# infra/monitoring/ALERTS.md.
#
# Usage:
#   bash infra/monitoring/heartbeat.sh --once    # one round of checks
#   bash infra/monitoring/heartbeat.sh           # the loop (the container)

set -euo pipefail

STATE_DIR="${STATE_DIR:-/var/lib/courier-heartbeat}"
API_HEALTH_URL="${API_HEALTH_URL:-}"
AUTH_HEALTH_URL="${AUTH_HEALTH_URL:-}"
ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"
HEARTBEAT_INTERVAL="${HEARTBEAT_INTERVAL:-60}"
ALERT_COOLDOWN="${ALERT_COOLDOWN:-900}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
ACCESS_LOG="${ACCESS_LOG:-/var/log/caddy/access.log}"
CERT_FILE="${CERT_FILE:-}"
CERT_DIR="${CERT_DIR:-}"
DISK_PATH="${DISK_PATH:-/backups}"

# The thresholds (infra/monitoring/ALERTS.md is the written rule).
FAILURES_BEFORE_ALERT="${FAILURES_BEFORE_ALERT:-3}"
ERROR_RATE_LIMIT="${ERROR_RATE_LIMIT:-5}"
ERROR_RATE_MINIMUM_REQUESTS="${ERROR_RATE_MINIMUM_REQUESTS:-20}"
BACKUP_MAX_AGE_HOURS="${BACKUP_MAX_AGE_HOURS:-26}"
CERTIFICATE_MINIMUM_DAYS="${CERTIFICATE_MINIMUM_DAYS:-14}"
DISK_MAX_PERCENT="${DISK_MAX_PERCENT:-85}"

RUN_ONCE=0

log() { printf '[heartbeat] %s\n' "$*"; }

usage() {
	sed -n '2,/^set -euo/p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//' | sed '$d'
}

while [[ $# -gt 0 ]]; do
	case "$1" in
	--once)
		RUN_ONCE=1
		shift
		;;
	--help | -h)
		usage
		exit 0
		;;
	*)
		printf '[heartbeat] error: unknown argument: %s (try --help)\n' "$1" >&2
		exit 1
		;;
	esac
done

command -v curl >/dev/null 2>&1 || {
	printf '[heartbeat] error: curl is not on the path\n' >&2
	exit 1
}

mkdir -p "${STATE_DIR}"

# Posts the alert to the webhook. It never fails the run: a webhook that is
# down must not stop the checks.
post_alert() {
	local severity="$1"
	local message="$2"
	if [[ -z "${ALERT_WEBHOOK_URL}" ]]; then
		log "ALERT (${severity}) ${message}"
		return 0
	fi
	local payload
	payload="$(printf '{"text":"Courier Copilot [%s] %s"}' "${severity}" "${message}")"
	if curl --silent --show-error --max-time 10 \
		--header "Content-Type: application/json" \
		--data "${payload}" \
		"${ALERT_WEBHOOK_URL}" >/dev/null 2>&1; then
		log "the alert was sent to the webhook"
	else
		log "the alert could not be sent to the webhook: ${message}"
	fi
}

# The alert state: the number of failed checks in a row and the time of the
# last alert, one file per kind of alert.
state_file() { printf '%s/%s' "${STATE_DIR}" "$1"; }

should_alert() {
	local kind="$1"
	local now last
	now="$(date +%s)"
	last="$(cat "$(state_file "${kind}.last")" 2>/dev/null || echo 0)"
	if [[ $((now - last)) -ge "${ALERT_COOLDOWN}" ]]; then
		printf '%s' "${now}" > "$(state_file "${kind}.last")"
		return 0
	fi
	return 1
}

# The health check of one service. It counts the failures in a row: a single
# failed check is not an incident, three in a row are.
check_service() {
	local name="$1"
	local url="$2"
	local count
	count="$(cat "$(state_file "${name}.failures")" 2>/dev/null || echo 0)"

	if [[ -z "${url}" ]]; then
		log "${name}: no URL to check"
		return 0
	fi

	local code
	code="$(curl --silent --output /dev/null --write-out '%{http_code}' \
		--max-time 10 --retry 0 "${url}" 2>/dev/null || true)"
	code="${code:-000}"

	if [[ "${code}" == "200" ]]; then
		if [[ "${count}" -gt 0 ]]; then
			log "${name}: it is back (${url})"
			post_alert "resolved" "${name} answers again: ${url}"
		else
			log "${name}: ok (${url})"
		fi
		printf '0' > "$(state_file "${name}.failures")"
		return 0
	fi

	count=$((count + 1))
	printf '%s' "${count}" > "$(state_file "${name}.failures")"
	log "${name}: it failed (${code}) - ${count} in a row"
	if [[ "${count}" -ge "${FAILURES_BEFORE_ALERT}" ]] && should_alert "${name}"; then
		post_alert "critical" "${name} is down: ${url} answered ${code} ${count} times in a row"
	fi
}

# The error rate of the edge: the share of the requests that answered 5xx
# since the last round. The access log of the edge is one JSON line per
# request (the format the Caddyfile asks for), so a request is a line with
# "handled request" and a server error is a line with a status of 5xx.
check_error_rate() {
	local total errors rate
	if [[ ! -f "${ACCESS_LOG}" ]]; then
		log "error rate: skipped, there is no access log at ${ACCESS_LOG}"
		return 0
	fi

	local size offset
	size="$(stat -c %s "${ACCESS_LOG}" 2>/dev/null || echo 0)"
	offset="$(cat "$(state_file "error_rate.offset")" 2>/dev/null || echo 0)"
	if [[ "${size}" -lt "${offset}" ]]; then
		offset=0
	fi
	if [[ "${size}" -eq "${offset}" ]]; then
		log "error rate: no new requests"
		return 0
	fi

	local chunk
	chunk="$(tail -c "+$((offset + 1))" "${ACCESS_LOG}")"
	printf '%s' "${size}" > "$(state_file "error_rate.offset")"

	total="$(printf '%s\n' "${chunk}" | grep -c '"msg":"handled request"' || true)"
	errors="$(printf '%s\n' "${chunk}" | grep -cE '"status":5[0-9][0-9][,}]' || true)"
	if [[ "${total}" -lt "${ERROR_RATE_MINIMUM_REQUESTS}" ]]; then
		log "error rate: only ${total} requests, too few to judge"
		return 0
	fi
	rate=$((errors * 100 / total))
	log "error rate: ${errors} of ${total} requests answered 5xx (${rate} %)"
	if [[ "${rate}" -gt "${ERROR_RATE_LIMIT}" ]] && should_alert "error_rate"; then
		post_alert "high" "the error rate is ${rate} % (${errors} of ${total} requests answered 5xx)"
	fi
}

# The age of the newest backup.
check_backup() {
	local newest="" file
	if [[ ! -d "${BACKUP_DIR}" ]]; then
		log "backup: skipped, there is no folder at ${BACKUP_DIR}"
		return 0
	fi
	for file in "${BACKUP_DIR}"/courier-*.dump; do
		[[ -f "${file}" ]] || continue
		if [[ -z "${newest}" || "${file}" -nt "${newest}" ]]; then
			newest="${file}"
		fi
	done
	if [[ -z "${newest}" ]]; then
		log "backup: there is no dump in ${BACKUP_DIR}"
		if should_alert "backup"; then
			post_alert "high" "there is no backup in ${BACKUP_DIR}"
		fi
		return 0
	fi
	local mtime now age
	mtime="$(stat -c %Y "${newest}")"
	now="$(date +%s)"
	age=$(((now - mtime) / 3600))
	log "backup: the newest dump is ${age} hours old (${newest})"
	if [[ "${age}" -gt "${BACKUP_MAX_AGE_HOURS}" ]] && should_alert "backup"; then
		post_alert "high" "the newest backup is ${age} hours old: ${BACKUP_MAX_AGE_HOURS} hours is the limit"
	fi
}

# The certificate of the edge.
check_certificate() {
	local files=() file
	if [[ -n "${CERT_FILE}" && -f "${CERT_FILE}" ]]; then
		files=("${CERT_FILE}")
	elif [[ -n "${CERT_DIR}" && -d "${CERT_DIR}" ]]; then
		while IFS= read -r file; do
			[[ -n "${file}" ]] && files+=("${file}")
		done < <(find "${CERT_DIR}" -name '*.crt' -type f 2>/dev/null)
	fi
	if [[ ${#files[@]} -eq 0 ]]; then
		log "certificate: skipped, there is no certificate to look at"
		return 0
	fi
	if ! command -v openssl >/dev/null 2>&1; then
		log "certificate: skipped, openssl is not on the path"
		return 0
	fi

	local now expiry days worst_days worst_file
	now="$(date +%s)"
	worst_days=99999
	worst_file=""
	for file in "${files[@]}"; do
		local end_date
		end_date="$(openssl x509 -enddate -noout -in "${file}" 2>/dev/null | cut -d= -f2- || true)"
		[[ -n "${end_date}" ]] || continue
		expiry="$(date -d "${end_date}" +%s 2>/dev/null || echo 0)"
		if [[ "${expiry}" -eq 0 ]]; then
			log "certificate: the expiry of ${file} could not be understood: ${end_date}"
			continue
		fi
		days=$(((expiry - now) / 86400))
		log "certificate: ${days} days left on ${file} (it expires on ${end_date})"
		if [[ "${days}" -lt "${worst_days}" ]]; then
			worst_days="${days}"
			worst_file="${file}"
		fi
	done
	if [[ "${worst_days}" -eq 99999 ]]; then
		return 0
	fi
	if [[ "${worst_days}" -lt "${CERTIFICATE_MINIMUM_DAYS}" ]] && should_alert "certificate"; then
		post_alert "medium" "the certificate expires in ${worst_days} days (${worst_file})"
	fi
}

# The disk the backups and the database live on.
check_disk() {
	if [[ ! -d "${DISK_PATH}" ]]; then
		log "disk: skipped, there is no folder at ${DISK_PATH}"
		return 0
	fi
	local used
	used="$(df -P "${DISK_PATH}" | awk 'NR == 2 {gsub(/%/, "", $5); print $5}')"
	if [[ -z "${used}" ]]; then
		log "disk: the usage of ${DISK_PATH} could not be read"
		return 0
	fi
	log "disk: ${used} % of ${DISK_PATH} is used"
	if [[ "${used}" -gt "${DISK_MAX_PERCENT}" ]] && should_alert "disk"; then
		post_alert "high" "the disk of ${DISK_PATH} is ${used} % full (the limit is ${DISK_MAX_PERCENT} %)"
	fi
}

run_checks() {
	check_service "api" "${API_HEALTH_URL}"
	check_service "auth" "${AUTH_HEALTH_URL}"
	check_error_rate
	check_backup
	check_certificate
	check_disk
}

if [[ "${RUN_ONCE}" -eq 1 ]]; then
	run_checks
	exit 0
fi

log "the heartbeat starts (every ${HEARTBEAT_INTERVAL} seconds)"
while true; do
	run_checks
	sleep "${HEARTBEAT_INTERVAL}"
done
