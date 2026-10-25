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

from app.entitlements import Plan, SubscriptionState
from app.locations import location_id_for
from app.repo import (
    DeliveryEventRow,
    LocationNoteRow,
    RunRecord,
    RunTemplate,
    SqlAlchemyRepo,
    SubscriptionRow,
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
                "status, priority, parcels, location_id) VALUES (:id, :shift, 1, :address, "
                "-43.54, 172.60, 'pending', false, 1, :location)"
            ),
            {
                "id": stop_id,
                "shift": shift_id,
                "address": address,
                "location": location_id_for(address, None),
            },
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

        with pytest.raises(ValueError, match="the shift does not exist"):
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
        assert first.stored == 2
        assert first.conflicts == ()
        assert replay.stored == 0
        assert replay.conflicts == ()
        assert repo.cursor(shift_id) == 2

        divergent = DeliveryEventRow(
            id=rows[0].id,
            shift_id=shift_id,
            stop_id=stop_id,
            kind="failed",
            utterance=None,
            safe_place=None,
            lat=None,
            lon=None,
            accuracy_m=None,
            occurred_at=rows[0].occurred_at,
        )
        conflict = repo.append_events(shift_id, [divergent])

        assert conflict.stored == 0
        assert conflict.conflicts == (rows[0].id,)
        assert repo.get_event(rows[0].id) == rows[0]  # the stored row wins

        # The same id twice in ONE batch: the first copy wins and the
        # divergence is reported, exactly like the in-memory repo.
        clash_id = uuid.uuid4()
        at = datetime(2026, 10, 25, 8, 0, tzinfo=UTC)
        original = DeliveryEventRow(
            id=clash_id,
            shift_id=shift_id,
            stop_id=stop_id,
            kind="delivered",
            utterance=None,
            safe_place=None,
            lat=None,
            lon=None,
            accuracy_m=None,
            occurred_at=at,
        )
        changed = DeliveryEventRow(
            id=clash_id,
            shift_id=shift_id,
            stop_id=stop_id,
            kind="failed",
            utterance=None,
            safe_place=None,
            lat=None,
            lon=None,
            accuracy_m=None,
            occurred_at=at,
        )
        batch = repo.append_events(shift_id, [original, changed])

        assert batch.stored == 1
        assert batch.conflicts == (clash_id,)
        assert repo.get_event(clash_id) == original

    def test_the_rowcount_of_a_partly_stored_batch_is_the_stored_rows(
        self, repo: SqlAlchemyRepo, engine: Engine
    ) -> None:
        """BUG-063: the rowcount the fast path trusts is the real one.

        CI's run 40185490916 breached the sync SLO at 370 ms p95 because ADR-014
        selected the batch's rows before every insert. The comparison now runs
        only when the rowcount says some rows were refused - which means the
        rowcount itself has to be exactly the number of rows the INSERT stored.
        A batch of three with one row already there must store two.
        """
        shift_id = a_shift(engine)
        run = a_run(shift_id)
        repo.put_run(run)
        stop_id = uuid.uuid4()
        seed_stop(engine, shift_id, stop_id, "45 Papanui Road")
        earlier = an_event(shift_id, stop_id, "delivered")
        assert repo.append_events(shift_id, [earlier]).stored == 1

        fresh = [
            an_event(shift_id, stop_id, "delivered"),
            an_event(shift_id, stop_id, "skipped"),
        ]
        later = repo.append_events(shift_id, [earlier, *fresh])

        assert later.stored == 2  # the one already there is not counted
        assert later.conflicts == ()
        assert repo.cursor(shift_id) == 3

    def test_the_subscription_round_trip_through_sql(
        self, repo: SqlAlchemyRepo, engine: Engine
    ) -> None:
        """ADR-017: the stored row reads back as the same decision.

        The entitlement is the app's only gate, so what the SQL repo returns must
        be exactly what the in-memory repo returns: the plan, the state and the
        source's own id. Idempotence on the courier is proven too - a provider
        retry and a duplicated gateway call must not fork the truth.
        """
        started = datetime(2026, 10, 26, 7, 0, tzinfo=UTC)
        row = SubscriptionRow(
            courier_id=COURIER,
            plan=Plan.SOLO,
            state=SubscriptionState.ACTIVE,
            source="play",
            source_id="play-purchase-1",
            started_at=started,
            renews_at=started + timedelta(days=30),
            ends_at=None,
        )

        assert repo.put_subscription(row) is True
        stored = repo.get_subscription(COURIER)
        assert stored is not None
        assert stored.plan is Plan.SOLO
        assert stored.state is SubscriptionState.ACTIVE
        assert stored.source == "play"
        assert stored.source_id == "play-purchase-1"

        # A correction is not a new row: the courier keeps one subscription.
        corrected = SubscriptionRow(
            courier_id=COURIER,
            plan=Plan.SOLO,
            state=SubscriptionState.PAST_DUE,
            source="play",
            source_id="play-purchase-1",
            started_at=started,
            renews_at=started + timedelta(days=30),
            ends_at=None,
        )
        repo.put_subscription(corrected)
        corrected_back = repo.get_subscription(COURIER)
        assert corrected_back is not None
        assert corrected_back.state is SubscriptionState.PAST_DUE
        assert corrected_back.source_id == "play-purchase-1"

        # Another courier's subscription is theirs alone.
        assert repo.get_subscription("driver-8") is None

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


class TestTheLocationNotes:
    def test_the_authz_key_the_upsert_and_the_cross_courier_isolation(
        self, repo: SqlAlchemyRepo, engine: Engine
    ) -> None:
        """The SQL half of ADR-012: the key lookup, the ON CONFLICT upsert."""
        shift_id = a_shift(engine)
        run = a_run(shift_id)
        repo.put_run(run)
        stop_id = uuid.uuid4()
        seed_stop(engine, shift_id, stop_id, "45 Papanui Road")
        location = location_id_for("45 Papanui Road", None)

        assert repo.courier_location_key(COURIER, location) == "45 papanui road"
        assert repo.courier_location_key("driver-8", location) is None

        first = LocationNoteRow(
            id=uuid.uuid4(),
            courier_id=COURIER,
            location_id=location,
            address_key="45 papanui road",
            kind="gate_code",
            body="1234",
            confidence=0.8,
            last_confirmed=datetime(2026, 10, 25, 8, 0, tzinfo=UTC),
        )
        assert repo.put_location_note(first) is True
        assert [note.body for note in repo.get_location_notes(COURIER, location)] == ["1234"]

        corrected = LocationNoteRow(
            id=uuid.uuid4(),
            courier_id=COURIER,
            location_id=location,
            address_key="45 papanui road (corrected)",
            kind="gate_code",
            body="9944",
            confidence=0.9,
            last_confirmed=datetime(2026, 10, 25, 9, 0, tzinfo=UTC),
        )
        assert repo.put_location_note(corrected) is False

        notes = repo.get_location_notes(COURIER, location)
        assert len(notes) == 1
        assert notes[0].id == first.id  # the row's own id survived the correction
        assert notes[0].body == "9944"
        assert notes[0].confidence == 0.9
        # The correction refreshes the audit key too (the review's parity fix:
        # the in-memory replace always took the new key).
        assert notes[0].address_key == "45 papanui road (corrected)"
        assert notes[0].last_confirmed == datetime(2026, 10, 25, 9, 0, tzinfo=UTC)

        # Another courier at the same door keeps an empty, private memory.
        assert repo.get_location_notes("driver-8", location) == []

    def test_the_stops_carry_their_location_id(self, repo: SqlAlchemyRepo, engine: Engine) -> None:
        shift_id = a_shift(engine)
        run = a_run(shift_id)
        repo.put_run(run)
        stop_id = uuid.uuid4()
        seed_stop(engine, shift_id, stop_id, "45 Papanui Road")

        rows = repo.get_run_stops(run.id)

        assert rows[0].location_id == location_id_for("45 Papanui Road", None)
        assert rows[0].suburb is None
