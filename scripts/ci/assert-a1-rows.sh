#!/usr/bin/env bash
# The A1 done-when's other half: the rows landed in Postgres.
#
# The flow delivered four stops against the real API - three while the network
# was up and one held while it was down, sent once it came back - so the
# database this job started has to hold exactly those four deliveries, and it
# has to hold them against the run the app seeded. This is the assertion the
# audit asks for ("the rows land in Postgres, asserted by the job"), and it is
# what makes this job different from every other leg of the workflow, which
# proves the screens on mocks.
#
# The count is decisive rather than a range: this runner's database starts
# empty, the contract's schema is applied once at the container's first boot,
# and the flow is its only writer. A row that is missing is a delivery the
# courier made that the office never heard about, which is the one outcome the
# design must never produce.
set -euo pipefail

# The host and port are the job's own compose defaults; the environment
# overrides them so the suite can point this script at its own database.
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-courier}"
DB_NAME="${DB_NAME:-courier}"
# How long the runner waits for the delivery the app has to send: the outbox's
# own retry asks again on its backoff (15 s at first), so the row the assert
# wants can land a few seconds AFTER the flow's last screen. BUG-186: run
# 41656905474 asserted immediately after the sync flow and found 3 of the 4
# events - the app had the fourth on the phone and sent it seconds later. The
# wait is bounded and says so, and the assertion itself is unchanged: if the
# row never lands, the job still fails.
A1_SYNC_TIMEOUT_S="${A1_SYNC_TIMEOUT_S:-45}"

query() {
  PGPASSWORD=courier psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -v ON_ERROR_STOP=1 -Atc "$1"
}

# Waits, up to the bound, for a delivery count the assert needs: the number
# the flow performed, not the number already landed when the flow ended.
wait_for_delivered() {
  local want="$1" waited=0 current
  while :; do
    current=$(query "SELECT count(*) FROM delivery_events" || echo 0)
    if [ "$current" = "$want" ]; then
      echo "the held delivery landed after ${waited}s of waiting"
      return 0
    fi
    if [ "$waited" -ge "$A1_SYNC_TIMEOUT_S" ]; then
      return 1
    fi
    sleep 1
    waited=$((waited + 1))
  done
}

echo "::group::A1: the rows the flow left in Postgres"

# The seed's own shape is reported FIRST, whatever the flow did: run
# 41433310746's a1 run failed with delivery_events: 0 and the job exited before
# saying whether the app's seed request ever landed, so the next run's log had
# to say it from the start. The assertions below are unchanged.
runs=$(query "SELECT count(*) FROM runs")
shifts=$(query "SELECT count(*) FROM shifts")
stops=$(query "SELECT count(*) FROM stops")
delivered=$(query "SELECT count(*) FROM delivery_events" || echo 0)
echo "runs: $runs, shifts: $shifts, stops: $stops, delivery_events: $delivered"

# The four deliveries: the run's own stops, delivered once each. A stop
# delivered twice is not the contract's shape (a divergent replay is refused
# server-side), so the count is what the flow did.
# BUG-186: the count is waited for, not read once - the outbox's retry lands
# the held delivery on its own schedule (15 s), which can be after the sync
# flow's last screen. The wanted count is still four.
if ! wait_for_delivered 4; then
  echo "::error::expected 4 delivery events (three sent online, one sent after the sync), found $delivered after ${A1_SYNC_TIMEOUT_S}s"
  exit 1
fi

# The run the app seeded, and the day it read: one shift, one run, five stops,
# which is the demo seed's own shape (ADR-019).
if [ "$runs" != "1" ] || [ "$shifts" != "1" ]; then
  echo "::error::expected exactly one seeded run and shift, found runs=$runs shifts=$shifts"
  exit 1
fi

# Every delivered stop belongs to the run's own day, so no delivery landed
# against a stop the seed never wrote (the audit's interlock: the events:batch
# endpoint refuses an unknown stop, so this has to be empty).
orphans=$(query "SELECT count(*) FROM delivery_events e LEFT JOIN stops s ON s.id = e.stop_id WHERE s.id IS NULL")
echo "deliveries against a stop that is not on the run: $orphans"
if [ "$orphans" != "0" ]; then
  echo "::error::$orphans deliveries name a stop the run does not have"
  exit 1
fi

# The four are the kind the flow performed, and they are four distinct stops:
# the same stop delivered twice is not the contract's shape (a divergent replay
# is refused server-side, so a second row would mean the app double-recorded).
kinds=$(query "SELECT DISTINCT kind FROM delivery_events ORDER BY kind")
echo "kinds: ${kinds:-none}"
distinct_stops=$(query "SELECT count(DISTINCT stop_id) FROM delivery_events")
echo "distinct stops delivered: $distinct_stops"
if [ "$distinct_stops" != "4" ]; then
  echo "::error::expected four distinct stops delivered, found $distinct_stops"
  exit 1
fi

echo "the seeded day and the four deliveries are in Postgres, against the run the API seeded"
echo "::endgroup::"
