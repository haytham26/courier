"""Persistence for the Courier Copilot API.

One contract, two implementations: `InMemoryRepo` (the test double and the
local dev server) and `SqlRepo` (PostgreSQL 16 + PostGIS, see
`db/schema.sql`). The routes ask the repository for the records they need and
never touch a database themselves.

A courier is the auth subject (`sub` of the verified token). The database
stores that subject on the driver row, so a shift always knows which courier
owns it.
"""

from __future__ import annotations

import uuid
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime
from functools import lru_cache
from typing import Protocol, cast

import psycopg
from pydantic_settings import BaseSettings, SettingsConfigDict

from .nz_address import parse as parse_address


@dataclass(frozen=True)
class DoorMemory:
    """What one courier remembers about one address."""

    address_key: str
    note: str | None
    safe_place: str | None
    updated_at: datetime


@dataclass(frozen=True)
class StopRecord:
    """A stop, the address it is at and the courier who owns it."""

    id: uuid.UUID
    shift_id: uuid.UUID
    address_key: str
    courier_id: str | None
    parcel_count: int


@dataclass(frozen=True)
class ShiftRecord:
    """A working day of one courier."""

    id: uuid.UUID
    courier_id: str | None
    shift_date: date


@dataclass(frozen=True)
class ShiftEvent:
    """One event the courier recorded on a stop."""

    stop_id: uuid.UUID
    kind: str
    occurred_at: datetime
    parcel_count: int
    reason: str | None


class Repo(Protocol):
    """The store the API needs: stops, shifts, events and the door memory."""

    def get_stop(self, stop_id: uuid.UUID) -> StopRecord | None:
        """The stop, or None when the API has never heard of it."""
        ...

    def get_shift(self, shift_id: uuid.UUID) -> ShiftRecord | None:
        """The shift, or None when the API has never heard of it."""
        ...

    def list_shift_events(self, shift_id: uuid.UUID) -> list[ShiftEvent]:
        """Every event recorded on the stops of a shift, oldest first."""
        ...

    def get_door_memory(self, courier_id: str, address_key: str) -> DoorMemory | None:
        """What this courier remembers about this address, if anything."""
        ...

    def save_door_memory(
        self,
        courier_id: str,
        address_key: str,
        note: str | None,
        safe_place: str | None,
    ) -> DoorMemory:
        """Writes the courier's memory of an address and hands it back."""
        ...


class InMemoryRepo:
    """The in-memory repository: the test double and the local dev server.

    It keeps the same rules as the database: an address is stored under the
    normalised address key, and the door memory is keyed by the courier and
    the address so a second courier never reads the first one's notes.
    """

    def __init__(self) -> None:
        self._shifts: dict[uuid.UUID, ShiftRecord] = {}
        self._stops: dict[uuid.UUID, StopRecord] = {}
        self._events: list[ShiftEvent] = []
        self._memories: dict[tuple[str, str], DoorMemory] = {}

    # --- seeding: the dev server and the tests build the store this way ---

    def add_shift(self, shift_id: uuid.UUID, courier_id: str, shift_date: date) -> None:
        """Registers a shift for a courier."""
        self._shifts[shift_id] = ShiftRecord(
            id=shift_id, courier_id=courier_id, shift_date=shift_date
        )

    def add_stop(
        self,
        stop_id: uuid.UUID,
        shift_id: uuid.UUID,
        address: str,
        parcels: int = 1,
    ) -> None:
        """Registers a stop; the address is normalised the way the database stores it."""
        shift = self._shifts.get(shift_id)
        if shift is None:
            raise KeyError(f"unknown shift {shift_id}")
        self._stops[stop_id] = StopRecord(
            id=stop_id,
            shift_id=shift_id,
            address_key=parse_address(address).address_key,
            courier_id=shift.courier_id,
            parcel_count=parcels,
        )

    def add_event(
        self,
        stop_id: uuid.UUID,
        kind: str,
        occurred_at: datetime,
        reason: str | None = None,
    ) -> None:
        """Records an event on a stop (arrival, delivery, failure, skip)."""
        stop = self._stops.get(stop_id)
        if stop is None:
            raise KeyError(f"unknown stop {stop_id}")
        self._events.append(
            ShiftEvent(
                stop_id=stop_id,
                kind=kind,
                occurred_at=occurred_at,
                parcel_count=stop.parcel_count,
                reason=reason,
            )
        )

    # --- the contract ---

    def get_stop(self, stop_id: uuid.UUID) -> StopRecord | None:
        return self._stops.get(stop_id)

    def get_shift(self, shift_id: uuid.UUID) -> ShiftRecord | None:
        return self._shifts.get(shift_id)

    def list_shift_events(self, shift_id: uuid.UUID) -> list[ShiftEvent]:
        stop_ids = {stop.id for stop in self._stops.values() if stop.shift_id == shift_id}
        events = [event for event in self._events if event.stop_id in stop_ids]
        return sorted(events, key=lambda event: event.occurred_at)

    def get_door_memory(self, courier_id: str, address_key: str) -> DoorMemory | None:
        return self._memories.get((courier_id, address_key))

    def save_door_memory(
        self,
        courier_id: str,
        address_key: str,
        note: str | None,
        safe_place: str | None,
    ) -> DoorMemory:
        memory = DoorMemory(
            address_key=address_key,
            note=note,
            safe_place=safe_place,
            updated_at=datetime.now(UTC),
        )
        self._memories[(courier_id, address_key)] = memory
        return memory


Row = Sequence[object]
QueryRunner = Callable[[str, Sequence[object]], list[Row]]


def _psycopg_runner(dsn: str) -> QueryRunner:
    """Runs a query on PostgreSQL; the connection commits when the block ends."""

    def run(query: str, params: Sequence[object]) -> list[Row]:
        with psycopg.connect(dsn) as connection, connection.cursor() as cursor:
            cursor.execute(query, params)
            rows = cursor.fetchall()
        return [tuple(row) for row in rows]

    return run


class SqlRepo:
    """The PostgreSQL repository (PostgreSQL 16 + PostGIS, see db/schema.sql).

    Every statement goes through one runner, so the tests can answer the
    queries without a database.
    """

    def __init__(self, dsn: str, run: QueryRunner | None = None) -> None:
        self._dsn = dsn
        self._run = run if run is not None else _psycopg_runner(dsn)

    def get_stop(self, stop_id: uuid.UUID) -> StopRecord | None:
        rows = self._run(
            """
            SELECT s.id, s.shift_id, l.address_key, d.auth_subject,
                   (SELECT count(*) FROM stop_parcels sp WHERE sp.stop_id = s.id)
            FROM stops s
            JOIN locations l ON l.id = s.location_id
            JOIN shifts sh ON sh.id = s.shift_id
            JOIN runs r ON r.id = sh.run_id
            JOIN drivers d ON d.id = r.driver_id
            WHERE s.id = %s
            """,
            (stop_id,),
        )
        if not rows:
            return None
        row = rows[0]
        return StopRecord(
            id=uuid.UUID(str(row[0])),
            shift_id=uuid.UUID(str(row[1])),
            address_key=str(row[2]),
            courier_id=None if row[3] is None else str(row[3]),
            parcel_count=int(cast(int, row[4])),
        )

    def get_shift(self, shift_id: uuid.UUID) -> ShiftRecord | None:
        rows = self._run(
            """
            SELECT sh.id, sh.shift_date, d.auth_subject
            FROM shifts sh
            JOIN runs r ON r.id = sh.run_id
            JOIN drivers d ON d.id = r.driver_id
            WHERE sh.id = %s
            """,
            (shift_id,),
        )
        if not rows:
            return None
        row = rows[0]
        return ShiftRecord(
            id=uuid.UUID(str(row[0])),
            shift_date=cast(date, row[1]),
            courier_id=None if row[2] is None else str(row[2]),
        )

    def list_shift_events(self, shift_id: uuid.UUID) -> list[ShiftEvent]:
        rows = self._run(
            """
            SELECT e.stop_id, e.kind, e.occurred_at, e.utterance,
                   (SELECT count(*) FROM stop_parcels sp WHERE sp.stop_id = e.stop_id)
            FROM delivery_events e
            JOIN stops s ON s.id = e.stop_id
            WHERE s.shift_id = %s
            ORDER BY e.occurred_at
            """,
            (shift_id,),
        )
        return [
            ShiftEvent(
                stop_id=uuid.UUID(str(row[0])),
                kind=str(row[1]),
                occurred_at=cast(datetime, row[2]),
                parcel_count=int(cast(int, row[4])),
                reason=None if row[3] is None else str(row[3]),
            )
            for row in rows
        ]

    def get_door_memory(self, courier_id: str, address_key: str) -> DoorMemory | None:
        rows = self._run(
            """
            SELECT address_key, note, safe_place, updated_at
            FROM door_memory
            WHERE courier_id = %s AND address_key = %s
            """,
            (courier_id, address_key),
        )
        if not rows:
            return None
        row = rows[0]
        return DoorMemory(
            address_key=str(row[0]),
            note=cast(str | None, row[1]),
            safe_place=cast(str | None, row[2]),
            updated_at=cast(datetime, row[3]),
        )

    def save_door_memory(
        self,
        courier_id: str,
        address_key: str,
        note: str | None,
        safe_place: str | None,
    ) -> DoorMemory:
        rows = self._run(
            """
            INSERT INTO door_memory (courier_id, address_key, note, safe_place, updated_at)
            VALUES (%s, %s, %s, %s, now())
            ON CONFLICT (courier_id, address_key) DO UPDATE
            SET note = EXCLUDED.note,
                safe_place = EXCLUDED.safe_place,
                updated_at = EXCLUDED.updated_at
            RETURNING address_key, note, safe_place, updated_at
            """,
            (courier_id, address_key, note, safe_place),
        )
        row = rows[0]
        return DoorMemory(
            address_key=str(row[0]),
            note=cast(str | None, row[1]),
            safe_place=cast(str | None, row[2]),
            updated_at=cast(datetime, row[3]),
        )


class RepoSettings(BaseSettings):
    """Where the API keeps its data (no secret lives here)."""

    model_config = SettingsConfigDict(env_file=".env.local", extra="ignore")

    database_url: str = ""


@lru_cache(maxsize=1)
def get_repo() -> Repo:
    """The repository the routes use: PostgreSQL when one is configured."""
    settings = RepoSettings()
    if settings.database_url:
        return SqlRepo(settings.database_url)
    return InMemoryRepo()
