"""The persistence layer of the API.

The API owns the delivery history. A courier works offline for hours, so the
phone keeps the truth in its own event log and replays it here. Replay must be
idempotent: the event id is generated on the phone, and the same event can
arrive twice (a retry after a dropped connection).

`SqlAlchemyRepo` is the production implementation. `InMemoryRepo` is the one
the tests use: the same contract, no database.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from datetime import datetime
from functools import lru_cache
from typing import Any, Protocol
from uuid import UUID

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine


@dataclass(frozen=True)
class DeliveryEventRow:
    """One event as the database stores it."""

    id: UUID
    shift_id: UUID
    stop_id: UUID
    kind: str
    utterance: str | None
    safe_place: str | None
    lat: float | None
    lon: float | None
    accuracy_m: float | None
    occurred_at: datetime


class Repo(Protocol):
    """What the API needs from the database."""

    def append_events(self, shift_id: UUID, events: list[DeliveryEventRow]) -> int:
        """Stores the events, ignoring the ones already stored.

        Returns:
            The number of events that were new.
        """

    def cursor(self, shift_id: UUID) -> int:
        """The number of events stored for the shift (the sync cursor)."""


@dataclass
class InMemoryRepo:
    """The repository the tests use: the same contract, no database."""

    events: dict[UUID, DeliveryEventRow] = field(default_factory=dict)
    by_shift: dict[UUID, list[UUID]] = field(default_factory=dict)

    def append_events(self, shift_id: UUID, events: list[DeliveryEventRow]) -> int:
        stored = 0
        for event in events:
            if event.id in self.events:
                continue
            self.events[event.id] = event
            self.by_shift.setdefault(shift_id, []).append(event.id)
            stored += 1
        return stored

    def cursor(self, shift_id: UUID) -> int:
        return len(self.by_shift.get(shift_id, []))


class SqlAlchemyRepo:
    """The production repository: Postgres through SQLAlchemy."""

    def __init__(self, engine: Engine) -> None:
        self._engine = engine

    def append_events(self, shift_id: UUID, events: list[DeliveryEventRow]) -> int:
        if not events:
            return 0
        statement = text(
            """
            INSERT INTO delivery_events
                (id, shift_id, stop_id, kind, utterance, safe_place,
                 lat, lon, accuracy_m, occurred_at)
            VALUES (:id, :shift_id, :stop_id, :kind, :utterance, :safe_place,
                    :lat, :lon, :accuracy_m, :occurred_at)
            ON CONFLICT (id) DO NOTHING
            """
        )
        parameters: list[dict[str, Any]] = [
            {
                "id": event.id,
                "shift_id": shift_id,
                "stop_id": event.stop_id,
                "kind": event.kind,
                "utterance": event.utterance,
                "safe_place": event.safe_place,
                "lat": event.lat,
                "lon": event.lon,
                "accuracy_m": event.accuracy_m,
                "occurred_at": event.occurred_at,
            }
            for event in events
        ]
        with self._engine.begin() as connection:
            result = connection.execute(statement, parameters)
            return int(result.rowcount or 0)

    def cursor(self, shift_id: UUID) -> int:
        statement = text("SELECT count(*) FROM delivery_events WHERE shift_id = :shift_id")
        with self._engine.connect() as connection:
            return int(connection.execute(statement, {"shift_id": shift_id}).scalar_one())


def get_engine(database_url: str | None = None) -> Engine:
    """The engine for the database, from the environment."""
    url = database_url or os.environ.get("DATABASE_URL", "")
    if not url:
        raise RuntimeError("Missing required env: DATABASE_URL — see .env.example")
    return create_engine(url, pool_pre_ping=True, future=True)


@lru_cache(maxsize=1)
def get_repo() -> Repo:
    """The repository the API writes to."""
    return SqlAlchemyRepo(get_engine())
