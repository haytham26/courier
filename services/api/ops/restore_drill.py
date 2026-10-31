"""The disaster-recovery drill: restore from a backup into a clean Postgres.

MASTER_EXECUTION section 18.4: run a restore drill every quarter, with
evidence. This script IS the drill, so the restore is rehearsed, not
improvised: given a backup dump and a reachable, EMPTY Postgres database, it

1. restores the dump (psql, the schema and the data),
2. runs the API's own round-trip against it (write run and stops -> sync a
   batch -> read them back -> plan the route),
3. prints the verdict and the timings, for the evidence file
   (`docs/evidence/backend-ops/drill-<date>/`).

It refuses to guess: no reachable database, or a missing dump, is an honest
failure (exit 1) - the drill has not run, and the evidence says so. It never
touches a database that already holds tables (a drill never aims at a live
system).

Usage:

    uv run --directory services/api python ops/restore_drill.py \
      --dump backup.sql --target postgresql://user:pass@host:5432/drill
"""

from __future__ import annotations

import argparse
import subprocess
import time
import uuid
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import create_engine, text

from app.locations import location_id_for
from app.repo import DeliveryEventRow, RunRecord, SqlAlchemyRepo
from app.routing import RouteRequest, build_plan


def restore(dump: Path, target: str) -> float:
    """Restore the dump into the clean target; return the seconds it took."""
    started = time.perf_counter()
    completed = subprocess.run(
        ["psql", target, "-v", "ON_ERROR_STOP=1", "-f", str(dump)],
        capture_output=True,
        text=True,
        check=False,
    )
    seconds = time.perf_counter() - started
    if completed.returncode != 0:
        print(f"RESTORE FAILED: {completed.stderr[-2000:]}")
        raise SystemExit(1)
    return seconds


def smoke(target: str) -> dict[str, float]:
    """The API's own round-trip against the restored database."""
    engine = create_engine(target)
    with engine.connect() as connection:
        tables = connection.execute(
            text("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'")
        ).scalar_one()
    if not tables:
        print("SMOKE FAILED: the restored database holds no tables")
        raise SystemExit(1)

    repo = SqlAlchemyRepo(engine)
    timings: dict[str, float] = {}
    run_id, shift_id = uuid.uuid4(), uuid.uuid4()

    with engine.begin() as connection:
        # The seed speaks SQL directly: the drill is an ops tool, and the
        # shift row must exist before the run (the schema's foreign key).
        connection.execute(
            text(
                "INSERT INTO shifts (id, courier_id, started_at) VALUES (:id, :courier, :started)"
            ),
            {"id": shift_id, "courier": "drill-courier", "started": datetime.now(UTC)},
        )

    started = time.perf_counter()
    repo.put_run(
        RunRecord(
            id=run_id,
            shift_id=shift_id,
            courier_id="drill-courier",
            name="Drill run",
            depot_lat=-43.5330,
            depot_lon=172.6300,
            capacity_parcels=None,
            speed_kmh=30.0,
            start_at=datetime.now(UTC),
        )
    )
    # One stop that is about to be delivered, and one that is not: the read-back
    # must derive the first stop's status from its event (BUG-115) and fall
    # back to the seeded column for the second (the derivation's COALESCE).
    evented_stop_id, unevented_stop_id = uuid.uuid4(), uuid.uuid4()
    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO stops (id, shift_id, sequence, address, latitude, longitude, "
                "status, priority, parcels, location_id) "
                "VALUES (:id, :shift, :sequence, :address, :lat, :lon, 'pending', false, 1, "
                ":location)"
            ),
            [
                {
                    "id": evented_stop_id,
                    "shift": shift_id,
                    "sequence": 1,
                    "address": "45 Papanui Road",
                    "lat": -43.54,
                    "lon": 172.60,
                    "location": location_id_for("45 Papanui Road", None),
                },
                {
                    "id": unevented_stop_id,
                    "shift": shift_id,
                    "sequence": 2,
                    "address": "56 Papanui Road",
                    # Its own door, not the first stop's coordinates twice: the
                    # plan over the day is a real two-leg route, and a
                    # coincident pair would make the optimiser's swap a no-op.
                    "lat": -43.51,
                    "lon": 172.62,
                    "location": location_id_for("56 Papanui Road", None),
                },
            ],
        )
    timings["write_run_and_stops_s"] = round(time.perf_counter() - started, 3)

    started = time.perf_counter()
    outcome = repo.append_events(
        shift_id,
        [
            DeliveryEventRow(
                id=uuid.uuid4(),
                shift_id=shift_id,
                stop_id=evented_stop_id,
                kind="delivered",
                utterance=None,
                safe_place=None,
                lat=-43.54,
                lon=172.60,
                accuracy_m=8.0,
                occurred_at=datetime.now(UTC),
            )
        ],
    )
    timings["sync_batch_s"] = round(time.perf_counter() - started, 3)
    if outcome.stored != 1:
        print("SMOKE FAILED: the event did not store")
        raise SystemExit(1)

    started = time.perf_counter()
    rows = repo.get_run_stops(run_id)
    request, unroutable = _route_request_of(repo, run_id)
    built = build_plan(request)
    timings["read_back_and_plan_s"] = round(time.perf_counter() - started, 3)
    # BUG-115: the stop's status is derived from its delivery events, on the SQL
    # repo exactly as the in-memory repo always derived it, and the seeded
    # column still answers for a stop with no event. This drill asserts that
    # contract against the REAL restored database - a restore that stores a
    # delivered event but reads the stop back as `pending` is a restore that
    # loses the courier's day, which is the whole point of rehearsing it.
    if unroutable or len(built.stops) != 2 or len(rows) != 2:
        print(
            "SMOKE FAILED: the restored day does not read back as it was written "
            f"(routable={not unroutable}, planned={len(built.stops)}, read={len(rows)})"
        )
        raise SystemExit(1)
    # Matched by id, never by position: the reads are the run's own rows, so the
    # assertion cannot drift if the query's ORDER BY ever changes.
    delivered = next((row for row in rows if row.id == evented_stop_id), None)
    untouched = next((row for row in rows if row.id == unevented_stop_id), None)
    if (
        delivered is None
        or untouched is None
        or delivered.status != "delivered"
        or untouched.status != "pending"
    ):
        print(
            "SMOKE FAILED: the restored day does not read back as it was written "
            f"(the delivered stop reads {delivered and delivered.status!r}, "
            f"the untouched one reads {untouched and untouched.status!r})"
        )
        raise SystemExit(1)
    return timings


def _route_request_of(repo: SqlAlchemyRepo, run_id: uuid.UUID) -> tuple[RouteRequest, list]:
    """The routing request of the run, through the API's own builder."""
    from app.main import _route_request

    run = repo.get_run(run_id)
    assert run is not None
    return _route_request(run, repo.get_run_stops(run_id))


def main() -> None:
    """Run the drill; print the verdict for the evidence file."""
    parser = argparse.ArgumentParser(description="The restore drill (§18.4)")
    parser.add_argument("--dump", type=Path, required=True, help="the pg_dump to restore")
    parser.add_argument("--target", required=True, help="the CLEAN Postgres URL of the drill")
    args = parser.parse_args()

    if not args.dump.exists():
        print(f"DRILL NOT RUN: the dump {args.dump} does not exist")
        raise SystemExit(1)
    try:
        engine = create_engine(args.target)
        with engine.connect() as connection:
            existing = connection.execute(
                text("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'")
            ).scalar_one()
    except Exception as error:  # any connection failure is the same honest answer
        print(f"DRILL NOT RUN: the target is not reachable ({error})")
        raise SystemExit(1) from error
    if existing:
        print("DRILL NOT RUN: the target is not empty - a drill never aims at a live system")
        raise SystemExit(1)

    print(f"drill started {datetime.now(UTC).isoformat()}")
    restore_seconds = restore(args.dump, args.target)
    timings = smoke(args.target)
    print(f"VERDICT: PASS | restore {restore_seconds:.1f}s | {timings}")


if __name__ == "__main__":
    main()
