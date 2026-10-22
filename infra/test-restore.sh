#!/usr/bin/env bash
# test-restore.sh - proves that the backups can be put back.
#
# It runs the real scripts (backup.sh and restore.sh) against a scratch
# database, then checks that the data is back, table by table.
#
# What it needs:
#   PGHOST PGPORT PGUSER PGPASSWORD   a plain PostgreSQL to test against
#   COURIER_DB_CONTAINER               when it is set, the client runs inside
#                                      this compose service
#
# The scratch databases are called courier_restore_test_src and
# courier_restore_test_dst. The script never touches any other database.
#
# Usage:
#   bash infra/test-restore.sh            # the scratch databases stay behind
#   bash infra/test-restore.sh --clean    # the scratch databases are dropped
#
# The CI runs it (.github/workflows/restore-test.yml) against a PostgreSQL
# service container. On a machine without PostgreSQL it prints what it needs
# and stops without touching anything.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SOURCE_DB="courier_restore_test_src"
TARGET_DB="courier_restore_test_dst"
WORK_DIR="${WORK_DIR:-$(mktemp -d)}"
CLEAN=0

log() { printf '[restore-test] %s\n' "$*"; }
die() { printf '[restore-test] error: %s\n' "$*" >&2; exit 1; }

usage() {
	sed -n '2,/^set -euo/p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//' | sed '$d'
}

db() {
	if [[ -n "${COURIER_DB_CONTAINER:-}" ]]; then
		local args=(-f "${COMPOSE_FILE:-${SCRIPT_DIR}/compose.prod.yml}")
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
	--clean)
		CLEAN=1
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

[[ -n "${PGHOST:-}" ]] || die "missing environment: PGHOST (see infra/env.example)"
[[ -n "${PGUSER:-}" ]] || die "missing environment: PGUSER (see infra/env.example)"
if [[ -z "${COURIER_DB_CONTAINER:-}" && -z "${PGPASSWORD:-}" ]]; then
	die "missing environment: PGPASSWORD (see infra/env.example)"
fi
if [[ -n "${COURIER_DB_CONTAINER:-}" ]]; then
	command -v docker >/dev/null 2>&1 || die "docker is not on the path"
else
	for binary in psql pg_dump pg_restore createdb dropdb; do
		command -v "${binary}" >/dev/null 2>&1 || die "${binary} is not on the path"
	done
fi

mkdir -p "${WORK_DIR}"

log "the database server: ${PGHOST}:${PGPORT:-5432} as ${PGUSER}"
log "the source database: ${SOURCE_DB}"
log "the target database: ${TARGET_DB}"
log "the working folder: ${WORK_DIR}"
if [[ "${CLEAN}" -eq 1 ]]; then
	log "the two scratch databases are dropped at the end"
else
	log "the two scratch databases stay behind (run it with --clean to drop them)"
fi

# The scratch databases are dropped only when they carry our name.
drop_scratch() {
	local name="$1"
	if [[ "${name}" != courier_restore_test_* ]]; then
		die "refusing to drop a database that is not a scratch one: ${name}"
	fi
	log "dropping the scratch database: ${name}"
	db dropdb --username="${PGUSER}" --if-exists "${name}" >/dev/null 2>&1 || true
}

log "creating the source database"
db dropdb --username="${PGUSER}" --if-exists "${SOURCE_DB}" >/dev/null 2>&1 || true
db dropdb --username="${PGUSER}" --if-exists "${TARGET_DB}" >/dev/null 2>&1 || true
db createdb --username="${PGUSER}" --template=template0 "${SOURCE_DB}" || die "cannot create ${SOURCE_DB}"

log "filling the source database with three tables"
db psql --no-psqlrc --username="${PGUSER}" --dbname="${SOURCE_DB}" --command="
CREATE TABLE stops (id serial PRIMARY KEY, address text NOT NULL, parcels integer NOT NULL);
CREATE TABLE events (id serial PRIMARY KEY, kind text NOT NULL, note text);
CREATE TABLE empty_table (id serial PRIMARY KEY);
INSERT INTO stops (address, parcels) VALUES
  ('42 Main North Rd, Papanui', 3),
  ('1 Riccarton Rd, Riccarton', 1),
  ('7 Harewood Rd, Bishopdale', 2),
  ('99 Lincoln Rd, Addington', 5),
  ('12 Clyde Rd, Fendalton', 1);
INSERT INTO events (kind, note) VALUES
  ('arrival', 'at the gate'),
  ('delivered', 'left with the neighbour'),
  ('failed', 'the dog was out');
" >/dev/null || die "cannot fill the source database"

source_stops="$(db psql --no-psqlrc --tuples-only --no-align --username="${PGUSER}" --dbname="${SOURCE_DB}" --command="SELECT count(*) FROM stops" </dev/null)"
source_events="$(db psql --no-psqlrc --tuples-only --no-align --username="${PGUSER}" --dbname="${SOURCE_DB}" --command="SELECT count(*) FROM events" </dev/null)"
source_empty="$(db psql --no-psqlrc --tuples-only --no-align --username="${PGUSER}" --dbname="${SOURCE_DB}" --command="SELECT count(*) FROM empty_table" </dev/null)"
log "the source holds ${source_stops} stops, ${source_events} events and ${source_empty} rows in the empty table"

log "running the backup"
PGDATABASE="${SOURCE_DB}" BACKUP_DIR="${WORK_DIR}" bash "${SCRIPT_DIR}/backup.sh" >/dev/null || die "the backup failed"
dump_file="$(find "${WORK_DIR}" -name 'courier-*.dump' -type f -print -quit)"
[[ -n "${dump_file}" ]] || die "the backup wrote no dump"
manifest_file="${dump_file%.dump}.manifest"
[[ -f "${manifest_file}" ]] || die "the backup wrote no manifest"
log "the dump: ${dump_file}"
log "the manifest: ${manifest_file}"

if ! grep -q "^public.stops ${source_stops}$" "${manifest_file}"; then
	die "the manifest does not carry the row count of the stops table"
fi
if ! grep -q "^public.events ${source_events}$" "${manifest_file}"; then
	die "the manifest does not carry the row count of the events table"
fi
log "the manifest carries the row counts"

log "running the restore"
bash "${SCRIPT_DIR}/restore.sh" \
	--dump "${dump_file}" \
	--target-db "${TARGET_DB}" \
	--yes >/dev/null || die "the restore failed"

target_stops="$(db psql --no-psqlrc --tuples-only --no-align --username="${PGUSER}" --dbname="${TARGET_DB}" --command="SELECT count(*) FROM stops" </dev/null)"
target_events="$(db psql --no-psqlrc --tuples-only --no-align --username="${PGUSER}" --dbname="${TARGET_DB}" --command="SELECT count(*) FROM events" </dev/null)"
target_empty="$(db psql --no-psqlrc --tuples-only --no-align --username="${PGUSER}" --dbname="${TARGET_DB}" --command="SELECT count(*) FROM empty_table" </dev/null)"

[[ "${target_stops}" == "${source_stops}" ]] || die "the stops table has ${target_stops} rows, it had ${source_stops}"
[[ "${target_events}" == "${source_events}" ]] || die "the events table has ${target_events} rows, it had ${source_events}"
[[ "${target_empty}" == "${source_empty}" ]] || die "the empty table has ${target_empty} rows, it had ${source_empty}"
log "the row counts are back"

# The data itself, not only the number of rows.
source_sum="$(db psql --no-psqlrc --tuples-only --no-align --username="${PGUSER}" --dbname="${SOURCE_DB}" --command="SELECT sum(parcels) FROM stops" </dev/null)"
target_sum="$(db psql --no-psqlrc --tuples-only --no-align --username="${PGUSER}" --dbname="${TARGET_DB}" --command="SELECT sum(parcels) FROM stops" </dev/null)"
[[ "${source_sum}" == "${target_sum}" ]] || die "the parcels do not add up: ${source_sum} before, ${target_sum} after"

source_address="$(db psql --no-psqlrc --tuples-only --no-align --username="${PGUSER}" --dbname="${SOURCE_DB}" --command="SELECT address FROM stops ORDER BY id LIMIT 1" </dev/null)"
target_address="$(db psql --no-psqlrc --tuples-only --no-align --username="${PGUSER}" --dbname="${TARGET_DB}" --command="SELECT address FROM stops ORDER BY id LIMIT 1" </dev/null)"
[[ "${source_address}" == "${target_address}" ]] || die "the first address is not the same: ${source_address} before, ${target_address} after"
log "the data is back, not only the number of rows"

if [[ "${CLEAN}" -eq 1 ]]; then
	drop_scratch "${TARGET_DB}"
	drop_scratch "${SOURCE_DB}"
else
	log "the scratch databases are still there: ${SOURCE_DB} and ${TARGET_DB}"
fi

log "the restore test passed"
