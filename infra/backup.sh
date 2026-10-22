#!/usr/bin/env bash
# backup.sh - the PostgreSQL backup of the Courier Copilot production database.
#
# It writes four files into the backup folder:
#   <stamp>.dump            the compressed dump (pg_dump --format=custom)
#   <stamp>.dump.sha256     the checksum of the dump
#   <stamp>.manifest        the row count of every table
#   <stamp>.manifest.sha256 the checksum of the manifest
#
# The manifest is what makes the restore provable: restore.sh compares the
# row count of every table with the manifest that came with the dump.
#
# What it needs:
#   BACKUP_DIR             where the dumps land (default /var/backups/courier)
#   PGHOST PGPORT PGUSER   the database to dump
#   PGPASSWORD             the password (not needed when the client runs
#                          inside the database container)
#   PGDATABASE             the database to dump (default courier)
#   COURIER_DB_CONTAINER   when it is set, the client runs inside this compose
#                          service (the production way); when it is not set the
#                          local pg_dump and psql are used (the CI way)
#
# Usage:
#   bash infra/backup.sh --dry-run      # print what it would do, write nothing
#   bash infra/backup.sh                 # write the dump
#
# The schedule (the crontab of the server, 03:20 New Zealand time):
#   20 3 * * * cd /srv/courier && bash infra/backup.sh >> /var/log/courier/backup.log 2>&1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

BACKUP_DIR="${BACKUP_DIR:-/var/backups/courier}"
COMPOSE_FILE="${COMPOSE_FILE:-${SCRIPT_DIR}/compose.prod.yml}"
DRY_RUN=0

log() { printf '[backup] %s\n' "$*"; }
die() { printf '[backup] error: %s\n' "$*" >&2; exit 1; }

usage() {
	sed -n '2,/^set -euo/p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//' | sed '$d'
}

# The database client: inside the compose service when the production asks
# for it, the local binaries otherwise.
db() {
	if [[ -n "${COURIER_DB_CONTAINER:-}" ]]; then
		local args=(-f "${COMPOSE_FILE}")
		if [[ -n "${COURIER_COMPOSE_ENV_FILE:-}" ]]; then
			args+=(--env-file "${COURIER_COMPOSE_ENV_FILE}")
		fi
		docker compose "${args[@]}" exec -T "${COURIER_DB_CONTAINER}" "$@"
	else
		"$@"
	fi
}

require_env() {
	local missing=()
	[[ -n "${PGHOST:-}" ]] || missing+=("PGHOST")
	[[ -n "${PGUSER:-}" ]] || missing+=("PGUSER")
	[[ -n "${PGDATABASE:-}" ]] || missing+=("PGDATABASE")
	if [[ -z "${COURIER_DB_CONTAINER:-}" && -z "${PGPASSWORD:-}" ]]; then
		missing+=("PGPASSWORD")
	fi
	if [[ ${#missing[@]} -gt 0 ]]; then
		die "missing environment: ${missing[*]} (see infra/env.example)"
	fi
}

while [[ $# -gt 0 ]]; do
	case "$1" in
	--dry-run)
		DRY_RUN=1
		shift
		;;
	--dir)
		BACKUP_DIR="${2:-}"
		[[ -n "${BACKUP_DIR}" ]] || die "--dir needs a folder"
		shift 2
		;;
	--help | -h)
		usage
		exit 0
		;;
	*)
		die "unknown argument: $1 (try --help)"
		;;
	esac
done

require_env

if [[ -n "${COURIER_DB_CONTAINER:-}" ]]; then
	command -v docker >/dev/null 2>&1 || die "docker is not on the path"
	[[ -f "${COMPOSE_FILE}" ]] || die "the compose file is missing: ${COMPOSE_FILE}"
else
	command -v pg_dump >/dev/null 2>&1 || die "pg_dump is not on the path"
	command -v psql >/dev/null 2>&1 || die "psql is not on the path"
fi
command -v sha256sum >/dev/null 2>&1 || die "sha256sum is not on the path"

if [[ "${DRY_RUN}" -eq 0 ]]; then
	mkdir -p "${BACKUP_DIR}" || die "cannot create the backup folder: ${BACKUP_DIR}"
	[[ -w "${BACKUP_DIR}" ]] || die "the backup folder is not writable: ${BACKUP_DIR}"
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DUMP_FILE="${BACKUP_DIR}/courier-${STAMP}.dump"
MANIFEST_FILE="${BACKUP_DIR}/courier-${STAMP}.manifest"

log "the database: ${PGDATABASE} on ${PGHOST}:${PGPORT:-5432} as ${PGUSER}"
if [[ -n "${COURIER_DB_CONTAINER:-}" ]]; then
	log "the client runs inside the container: ${COURIER_DB_CONTAINER}"
else
	log "the client runs on this machine"
fi
log "the backup folder: ${BACKUP_DIR}"
log "the dump will be: ${DUMP_FILE}"
log "the manifest will be: ${MANIFEST_FILE}"
if [[ "${DRY_RUN}" -eq 1 ]]; then
	log "dry run: nothing is written"
	exit 0
fi

# The dump. The output is written on this machine, also when the client runs
# inside a container: the binary stream comes back on the standard output.
db pg_dump \
	--format=custom \
	--no-owner \
	--no-privileges \
	--username="${PGUSER}" \
	--dbname="${PGDATABASE}" \
	> "${DUMP_FILE}" || die "pg_dump failed"

[[ -s "${DUMP_FILE}" ]] || die "the dump is empty: ${DUMP_FILE}"
dump_checksum="$(sha256sum "${DUMP_FILE}" | cut -d' ' -f1)"
printf '%s  %s\n' "${dump_checksum}" "$(basename "${DUMP_FILE}")" > "${DUMP_FILE}.sha256"

log "the dump is written (${DUMP_FILE})"

# The manifest: the row count of every table, so the restore can prove that
# the data is back.
{
	printf '# Courier Copilot backup manifest\n'
	printf '# database: %s\n' "${PGDATABASE}"
	printf '# generated: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} > "${MANIFEST_FILE}"

tables="$(db psql --no-psqlrc --tuples-only --no-align \
	--username="${PGUSER}" \
	--dbname="${PGDATABASE}" \
	--command="SELECT table_schema || '.' || table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog', 'information_schema') AND table_type = 'BASE TABLE' ORDER BY 1" </dev/null)"

table_count=0
while IFS= read -r table; do
	[[ -n "${table}" ]] || continue
	schema="${table%%.*}"
	name="${table#*.}"
	count="$(db psql --no-psqlrc --tuples-only --no-align \
		--username="${PGUSER}" \
		--dbname="${PGDATABASE}" \
		--command="SELECT count(*) FROM \"${schema}\".\"${name}\"" </dev/null)"
	printf '%s %s\n' "${table}" "${count}" >> "${MANIFEST_FILE}"
	table_count=$((table_count + 1))
done <<< "${tables}"

manifest_checksum="$(sha256sum "${MANIFEST_FILE}" | cut -d' ' -f1)"
printf '%s  %s\n' "${manifest_checksum}" "$(basename "${MANIFEST_FILE}")" > "${MANIFEST_FILE}.sha256"

log "the manifest is written (${table_count} tables, ${MANIFEST_FILE})"
log "the backup is done"

