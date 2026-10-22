#!/usr/bin/env bash
# restore.sh - puts a backup back into a database and proves it is there.
#
# What it does:
#   1. checks the dump and its checksum
#   2. creates the target database, or asks before it touches an existing one
#   3. restores the dump into it
#   4. compares the row count of every table with the manifest that came with
#      the dump, and fails when one of them does not match
#
# What it needs:
#   PGHOST PGPORT PGUSER   the server the target database is on
#   PGPASSWORD             the password (not needed when the client runs
#                          inside a database container)
#   COURIER_DB_CONTAINER   when it is set, the client runs inside this compose
#                          service (the production way); when it is not set the
#                          local pg_restore, createdb and psql are used
#
# Usage:
#   bash infra/restore.sh --dump <file.dump> --target-db <name> [--yes]
#   bash infra/restore.sh --dump <file.dump> --target-db <name> --drop-target --yes
#
# Safety:
#   - it never drops a database without --drop-target
#   - it refuses to touch the production database without --force-production
#     (the founder's approval gate in MASTER_EXECUTION section 7)
#   - it writes nothing until --yes is given

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

COMPOSE_FILE="${COMPOSE_FILE:-${SCRIPT_DIR}/compose.prod.yml}"
PRODUCTION_DB="${PRODUCTION_DB:-courier}"
DUMP_FILE=""
TARGET_DB=""
DROP_TARGET=0
FORCE_PRODUCTION=0
CONFIRMED=0

log() { printf '[restore] %s\n' "$*"; }
die() { printf '[restore] error: %s\n' "$*" >&2; exit 1; }

usage() {
	sed -n '2,/^set -euo/p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//' | sed '$d'
}

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

while [[ $# -gt 0 ]]; do
	case "$1" in
	--dump)
		DUMP_FILE="${2:-}"
		[[ -n "${DUMP_FILE}" ]] || die "--dump needs a file"
		shift 2
		;;
	--target-db)
		TARGET_DB="${2:-}"
		[[ -n "${TARGET_DB}" ]] || die "--target-db needs a name"
		shift 2
		;;
	--drop-target)
		DROP_TARGET=1
		shift
		;;
	--force-production)
		FORCE_PRODUCTION=1
		shift
		;;
	--yes)
		CONFIRMED=1
		shift
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

[[ -n "${DUMP_FILE}" ]] || die "--dump is required"
[[ -n "${TARGET_DB}" ]] || die "--target-db is required"
[[ -f "${DUMP_FILE}" ]] || die "the dump is missing: ${DUMP_FILE}"
[[ -n "${PGHOST:-}" ]] || die "missing environment: PGHOST (see infra/env.example)"
[[ -n "${PGUSER:-}" ]] || die "missing environment: PGUSER (see infra/env.example)"
if [[ -z "${COURIER_DB_CONTAINER:-}" && -z "${PGPASSWORD:-}" ]]; then
	die "missing environment: PGPASSWORD (see infra/env.example)"
fi
if [[ -n "${COURIER_DB_CONTAINER:-}" ]]; then
	command -v docker >/dev/null 2>&1 || die "docker is not on the path"
	[[ -f "${COMPOSE_FILE}" ]] || die "the compose file is missing: ${COMPOSE_FILE}"
else
	command -v pg_restore >/dev/null 2>&1 || die "pg_restore is not on the path"
	command -v createdb >/dev/null 2>&1 || die "createdb is not on the path"
	command -v psql >/dev/null 2>&1 || die "psql is not on the path"
fi
command -v sha256sum >/dev/null 2>&1 || die "sha256sum is not on the path"

if [[ "${TARGET_DB}" == "${PRODUCTION_DB}" && "${FORCE_PRODUCTION}" -eq 0 ]]; then
	die "the target is the production database (${PRODUCTION_DB}): the founder has to approve this (--force-production)"
fi

MANIFEST_FILE="${DUMP_FILE%.dump}.manifest"

if [[ -f "${DUMP_FILE}.sha256" ]]; then
	expected="$(cut -d' ' -f1 < "${DUMP_FILE}.sha256")"
	actual="$(sha256sum "${DUMP_FILE}" | cut -d' ' -f1)"
	[[ "${expected}" == "${actual}" ]] || die "the dump does not match its checksum: ${DUMP_FILE}"
	log "the checksum of the dump is good"
else
	log "there is no checksum next to the dump: the dump is used as it is"
fi

target_exists="$(db psql --no-psqlrc --tuples-only --no-align \
	--username="${PGUSER}" \
	--dbname=postgres \
	--command="SELECT count(*) FROM pg_database WHERE datname = '${TARGET_DB}'" </dev/null)"

if [[ "${target_exists}" != "0" && "${DROP_TARGET}" -eq 0 ]]; then
	die "the target database already exists (${TARGET_DB}): --drop-target is needed to replace it"
fi

log "the dump: ${DUMP_FILE}"
log "the target database: ${TARGET_DB} on ${PGHOST}:${PGPORT:-5432}"
if [[ "${target_exists}" != "0" ]]; then
	log "the target database will be dropped and created again"
else
	log "the target database will be created"
fi
if [[ -f "${MANIFEST_FILE}" ]]; then
	log "the manifest: ${MANIFEST_FILE} (the row counts are compared after the restore)"
else
	log "there is no manifest next to the dump: the row counts cannot be compared"
fi

if [[ "${CONFIRMED}" -eq 0 ]]; then
	die "nothing was written: run it again with --yes when the plan above is right"
fi

if [[ "${target_exists}" != "0" ]]; then
	db dropdb --username="${PGUSER}" --if-exists "${TARGET_DB}" || die "cannot drop ${TARGET_DB}"
fi
db createdb --username="${PGUSER}" --template=template0 "${TARGET_DB}" || die "cannot create ${TARGET_DB}"
log "the target database is there"

db pg_restore \
	--exit-on-error \
	--no-owner \
	--no-privileges \
	--username="${PGUSER}" \
	--dbname="${TARGET_DB}" \
	< "${DUMP_FILE}" || die "pg_restore failed"
log "the dump is restored"

if [[ ! -f "${MANIFEST_FILE}" ]]; then
	log "the restore is done (the row counts were not compared: there is no manifest)"
	exit 0
fi

mismatches=0
checked=0
while IFS= read -r line; do
	[[ -n "${line}" ]] || continue
	case "${line}" in
	\#*) continue ;;
	esac
	table="${line%% *}"
	expected_count="${line##* }"
	schema="${table%%.*}"
	name="${table#*.}"
	actual_count="$(db psql --no-psqlrc --tuples-only --no-align \
		--username="${PGUSER}" \
		--dbname="${TARGET_DB}" \
		--command="SELECT count(*) FROM \"${schema}\".\"${name}\"" </dev/null)"
	checked=$((checked + 1))
	if [[ "${actual_count}" != "${expected_count}" ]]; then
		printf '[restore] mismatch: %s had %s rows, the manifest says %s\n' \
			"${table}" "${actual_count}" "${expected_count}" >&2
		mismatches=$((mismatches + 1))
	fi
done < "${MANIFEST_FILE}"

if [[ "${mismatches}" -gt 0 ]]; then
	die "${mismatches} table(s) do not match the manifest: the restore is not good"
fi

log "the row counts of ${checked} tables match the manifest"
log "the restore is done and it is proven"
