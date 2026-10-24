"""The DB-backed tests: the production `SqlAlchemyRepo` against real Postgres.

Queue 2, item 2: until now the production SQL ran only inside the manual
restore drill - thirteen methods of production code with zero coverage. This
suite runs them against the Postgres service container in CI (the `db`
marker; the workflow step carries `DATABASE_URL`), and it closes the questions
the in-memory repo cannot answer: the executemany rowcount of the idempotent
sync, the IntegrityError translation of `put_run`, and the storage round-trip
of a stored route.

The schema comes from `packages/contracts/db/schema.sql` - the same file the
production database is built from - so the suite also proves the contract's
schema and the repo's SQL stay in step.

Selected with `-m db` (the CI job carries the service container); the default
suite runs `-m "not db"` (pyproject addopts) so a machine without Postgres
still runs everything else, and the CI database job runs `-m db` explicitly.
"""

from __future__ import annotations

import os
import uuid
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from app.repo import (
    DeliveryEventRow,
    RunRecord,
    RunTemplate,
    SqlAlchemyRepo,
)
from app.routing import PlannedStop, RoutePlan

pytestmark = pytest.mark.db

DATABASE_URL = os.environ.get("DATABASE_URL", "")
COURIER = "driver-7"

@pytest.fixture()
def engine() -> Iterator[Engine]:
    if not DATABASE_URL:
        pytest.fail(
            "DATABASE_URL is not set: the DB-backed suite needs the Postgres service "
            "(run `-m 'not db'` for the suite without a database)"
        )
    engine = create_engine(DATABASE_URL)
    script = (
        Path(__file__).resolve().parents[3] / "packages" / "contracts" / "db" / "schema.sql"
    ).read_text(encoding="utf-8")
    with engine.begin() as connection:
        connection.execute(text(script))
    yield engine
    with engine.begin() as connection:
        connection.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))
    engine.dispose()


@pytest.fixture()
def repo(engine: Engine) -> SqlAlchemyRepo:
    return SqlAlchemyRepo(engine)


def a_shift(engine: Engine) -> uuid.UUID:
    shift_id = uuid.uuid4()
    with engine.begin() as connection:
        connection.execute(
            text("INSERT INTO shifts (id, courier_id, started_at) VALUES (:id, :c, :s)"),
            {"id": shift_id, "c": COURIER, "s": datetime(2026, 10, 25, 7, 0, tzinfo=UTC)},
        )
    return shift_id


def a_run(shift_id: uuid.UUID) -> RunRecord:
    return RunRecord(
        id=uuid.uuid4(),
        shift_id=shift_id,
        courier_id=COURIER,
        name="Hornby run",
        depot_lat=-43.5330,
        depot_lon=172.6300,
        capacity_parcels=120,
        speed_kmh=30.0,
        start_at=datetime(2026, 10, 25, 7, 30, tzinfo=UTC),
    )


def seed_stop(engine: Engine, shift_id: uuid.UUID, stop_id: uuid.UUID, address: str) -> None:
    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO stops (id, shift_id, sequence, address, latitude, longitude, "
                "status, priority, parcels) VALUES (:id, :shift, 1, :address, "
                "-43.54, 172.60, 'pending', false, 1)"
            ),
            {"id": stop_id, "shift": shift_id, "address": address},
        )


def an_event(shift_id: uuid.UUID, stop_id: uuid.UUID, kind: str = "delivered") -> DeliveryEventRow:
    return DeliveryEventRow(
        id=uuid.uuid4(),
        shift_id=shift_id,
        stop_id=stop_id,
        kind=kind,
        utterance=None,
        safe_place=None,
        lat=-43.54,
        lon=172.60,
        accuracy_m=8.0,
        occurred_at=datetime(2026, 10, 25, 8, 0, tzinfo=UTC),
    )


class TestTheRunLifecycle:
    def test_a_run_is_stored_and_read_back(self, repo: SqlAlchemyRepo, engine: Engine) -> None:
        shift_id = a_shift(engine)
        run = a_run(shift_id)

        repo.put_run(run)

        assert repo.get_run(run.id) == run
        assert repo.get_run_for_shift(shift_id) == run

    def test_the_runs_list_is_the_couriers_own_newest_first(
        self, repo: SqlAlchemyRepo, engine: Engine
    ) -> None:
        older = a_run(a_shift(engine))
        newer = a_run(a_shift(engine))
        newer = RunRecord(
            id=newer.id,
            shift_id=newer.shift_id,
            courier_id=newer.courier_id,
            name=newer.name,
            depot_lat=newer.depot_lat,
            depot_lon=newer.depot_lon,
            capacity_parcels=newer.capacity_parcels,
            speed_kmh=newer.speed_kmh,
            start_at=datetime(2026, 10, 25, 9, 0, tzinfo=UTC),
        )
        stranger = a_run(a_shift(engine))
        stranger = RunRecord(
            id=stranger.id,
            shift_id=stranger.shift_id,
            courier_id="driver-8",
            name=stranger.name,
            depot_lat=stranger.depot_lat,
            depot_lon=stranger.depot_lon,
            capacity_parcels=stranger.capacity_parcels,
            speed_kmh=stranger.speed_kmh,
            start_at=stranger.start_at,
        )
        repo.put_run(older)
        repo.put_run(newer)
        repo.put_run(stranger)

        listed = repo.list_runs(COURIER)

        assert [run.id for run in listed] == [newer.id, older.id]

    def test_a_second_run_on_one_shift_is_refused(
        self, repo: SqlAlchemyRepo, engine: Engine
    ) -> None:
        shift_id = a_shift(engine)
        repo.put_run(a_run(shift_id))

        with pytest.raises(ValueError, match="this shift already has a run"):
            repo.put_run(a_run(shift_id))

    def test_a_foreign_shift_key_is_named_honestly(
        self, repo: SqlAlchemyRepo, engine: Engine
    ) -> None:
        """A run whose shift row does not exist is a foreign-key break, not a
        "shift already has a run" - the audit flagged the earlier version for
        collapsing every IntegrityError into one lying 409."""
        run = a_run(uuid.uuid4())  # no shift row

        with pytest.raises(ValueError, match="already exists"):
            repo.put_run(run)

    def test_a_duplicate_run_id_is_refused(self, repo: SqlAlchemyRepo, engine: Engine) -> None:
        shift_id = a_shift(engine)
        run = a_run(shift_id)
        repo.put_run(run)

        with pytest.raises(ValueError, match="already exists"):
            repo.put_run(run)


class TestTheStops:
    def test_the_stops_read_back_with_status_and_address_in_sequence(
        self, repo: SqlAlchemyRepo, engine: Engine
    ) -> None:
        shift_id = a_shift(engine)
        run = a_run(shift_id)
        repo.put_run(run)
        first, second = uuid.uuid4(), uuid.uuid4()
        seed_stop(engine, shift_id, first, "45 Papanui Road")
        seed_stop(engine, shift_id, second, "12 Riccarton Road")

        rows = repo.get_run_stops(run.id)

        assert [row.address for row in rows] == ["45 Papanui Road", "12 Riccarton Road"]
        assert [row.status for row in rows] == ["pending", "pending"]
        assert [row.id for row in rows] == [first, second]


class TestTheEvents:
    def test_the_batch_is_idempotent_and_the_rowcount_counts_only_the_new(
        self, repo: SqlAlchemyRepo, engine: Engine
    ) -> None:
        shift_id = a_shift(engine)
        run = a_run(shift_id)
        repo.put_run(run)
        stop_id = uuid.uuid4()
        seed_stop(engine, shift_id, stop_id, "45 Papanui Road")
        rows = [
            an_event(shift_id, stop_id, "delivered"),
            an_event(shift_id, stop_id, "skipped"),
        ]

        first = repo.append_events(shift_id, rows)
        replay = repo.append_events(shift_id, rows)

        # THE rowcount question the in-memory repo cannot answer: the
        # executemany with ON CONFLICT DO NOTHING must count only the
        # inserted rows, or the sync's `accepted` lies to the phone.
        assert first == 2
        assert replay == 0
        assert repo.cursor(shift_id) == 2

    def test_an_event_is_readable_by_id(self, repo: SqlAlchemyRepo, engine: Engine) -> None:
        shift_id = a_shift(engine)
        run = a_run(shift_id)
        repo.put_run(run)
        event = an_event(shift_id, uuid.uuid4(), "delivered")

        repo.append_events(shift_id, [event])

        assert repo.get_event(event.id) == event
        assert repo.get_event(uuid.uuid4()) is None


class TestTheTemplateAndTheRoute:
    def test_the_template_round_trips(self, repo: SqlAlchemyRepo, engine: Engine) -> None:
        shift_id = a_shift(engine)
        run = a_run(shift_id)
        repo.put_run(run)
        template = RunTemplate(id="phone-made-1", segments=(), stop_order=(uuid.uuid4(),))

        repo.put_run_template(run.id, template)

        assert repo.get_run_template(run.id) == template

    def test_the_route_round_trips_with_its_stops(
        self, repo: SqlAlchemyRepo, engine: Engine
    ) -> None:
        shift_id = a_shift(engine)
        run = a_run(shift_id)
        repo.put_run(run)
        start = datetime(2026, 10, 25, 8, 0, tzinfo=UTC)
        stop_id = uuid.uuid4()
        plan = RoutePlan(
            stops=(
                PlannedStop(
                    stop_id=stop_id,
                    sequence=1,
                    lat=-43.54,
                    lon=172.60,
                    arrival_at=start,
                    departure_at=start + timedelta(minutes=2),
                    distance_m=900.0,
                    cumulative_distance_m=900.0,
                    late=False,
                ),
            ),
            total_distance_m=900.0,
            total_duration_s=300.0,
            parcels=1,
            capacity_parcels=None,
            over_capacity=False,
            window_violations=0,
            engine="pyvrp",
        )

        repo.put_run_route(run.id, plan)
        read = repo.get_run_route(run.id)

        assert read is not None
        assert read.engine == "pyvrp"
        assert read.total_distance_m == pytest.approx(plan.total_distance_m)
        assert read.total_duration_s == pytest.approx(plan.total_duration_s)
        assert [stop.stop_id for stop in read.stops] == [stop_id]
        assert read.stops[0].sequence == 1
        assert read.stops[0].arrival_at == start
        assert read.stops[0].late is False
