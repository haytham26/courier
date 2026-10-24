"""The persistence layer of the API.

The API owns the delivery history. A courier works offline for hours, so the
phone keeps the truth in its own event log and replays it here. Replay must be
idempotent: the event id is generated on the phone, and the same event can
arrive twice (a retry after a dropped connection).

`SqlAlchemyRepo` is the production implementation. `InMemoryRepo` is the one
the tests use: the same contract, no database.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from datetime import datetime
from functools import lru_cache
from typing import Any, Protocol
from uuid import UUID

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from .routing import PlannedStop, RoutePlan, RunTemplate
from .sequencing import Segment


def _parse_segments(document: object) -> tuple[Segment, ...]:
    """The template segments as they come back from the database."""
    if not isinstance(document, list):
        return ()
    segments: list[Segment] = []
    for item in document:
        if not isinstance(item, dict):
            continue
        street_key = item.get("street_key")
        if not isinstance(street_key, str):
            continue
        direction = item.get("direction")
        segments.append(
            Segment(
                street_key=street_key, direction=direction if isinstance(direction, str) else "asc"
            )
        )
    return tuple(segments)


def _parse_stop_order(document: object) -> tuple[UUID, ...]:
    """The locked order as it comes back from the database."""
    if not isinstance(document, list):
        return ()
    stop_ids: list[UUID] = []
    for item in document:
        if not isinstance(item, str):
            continue
        try:
            stop_ids.append(UUID(item))
        except ValueError:
            continue
    return tuple(stop_ids)


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


@dataclass(frozen=True)
class RunRecord:
    """The run: one courier's day, one van, one shift."""

    id: UUID
    shift_id: UUID
    courier_id: str
    name: str
    depot_lat: float
    depot_lon: float
    capacity_parcels: int | None
    speed_kmh: float
    start_at: datetime


@dataclass(frozen=True)
class RouteStopRow:
    """A stop of the run, with the constraints the routing engine needs."""

    id: UUID
    lat: float | None
    lon: float | None
    priority: bool
    parcels: int
    service_time_s: int | None
    window_start: datetime | None
    window_end: datetime | None
    address: str | None = None
    status: str = "pending"


class Repo(Protocol):
    """What the API needs from the database."""

    def put_run(self, run: RunRecord) -> None:
        """Store a new run (the phone's first write of the day)."""
        ...

    def list_runs(self, courier_id: str, limit: int = 500) -> list[RunRecord]:
        """The courier's own runs, newest first, bounded."""
        ...

    def append_events(self, shift_id: UUID, events: list[DeliveryEventRow]) -> int:
        """Stores the events, ignoring the ones already stored.

        Returns:
            The number of events that were new.
        """

    def cursor(self, shift_id: UUID) -> int:
        """The number of events stored for the shift (the sync cursor)."""

    def get_run(self, run_id: UUID) -> RunRecord | None:
        """The run, when the run exists."""

    def get_run_for_shift(self, shift_id: UUID) -> RunRecord | None:
        """The run of the shift, when the shift has one."""

    def get_run_stops(self, run_id: UUID) -> list[RouteStopRow]:
        """The stops of the run, in the order the manifest gave them."""

    def put_run_template(self, run_id: UUID, template: RunTemplate) -> None:
        """Stores the locked template and replaces the run's street order.

        The stored plan is dropped, because the order it was built on has
        changed.
        """

    def get_run_template(self, run_id: UUID) -> RunTemplate | None:
        """The locked template of the run, when the run has one."""

    def put_run_route(self, run_id: UUID, plan: RoutePlan) -> None:
        """Stores the plan: the ordered stops with the arrival times."""

    def get_run_route(self, run_id: UUID) -> RoutePlan | None:
        """The stored plan of the run, when there is one."""


STATUS_KINDS = frozenset({"delivered", "skipped", "deferred", "failed"})
"""The delivery-event kinds that decide a stop's status (ADR-010 §2)."""


@dataclass
class InMemoryRepo:
    """The repository the tests use: the same contract, no database."""

    events: dict[UUID, DeliveryEventRow] = field(default_factory=dict)
    by_shift: dict[UUID, list[UUID]] = field(default_factory=dict)
    runs: dict[UUID, RunRecord] = field(default_factory=dict)
    run_stops: dict[UUID, list[RouteStopRow]] = field(default_factory=dict)
    templates: dict[UUID, RunTemplate] = field(default_factory=dict)
    routes: dict[UUID, RoutePlan] = field(default_factory=dict)

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

    def put_run(self, run: RunRecord) -> None:
        if run.id in self.runs:
            raise ValueError(f"run {run.id} already exists")
        self.runs[run.id] = run

    def list_runs(self, courier_id: str, limit: int = 500) -> list[RunRecord]:
        mine = [run for run in self.runs.values() if run.courier_id == courier_id]
        mine.sort(key=lambda run: run.start_at, reverse=True)
        return mine[:limit]

    def get_run(self, run_id: UUID) -> RunRecord | None:
        return self.runs.get(run_id)

    def get_run_for_shift(self, shift_id: UUID) -> RunRecord | None:
        for run in self.runs.values():
            if run.shift_id == shift_id:
                return run
        return None

    def get_run_stops(self, run_id: UUID) -> list[RouteStopRow]:
        """The run's stops, with the status the delivery events imply.

        The in-memory repo has no `stops.status` column, so the status is
        derived the way the phone experiences it: the latest delivery event
        per stop decides (delivered / skipped / deferred / failed), and a
        stop no event ever touched is pending. The same vocabulary the SQL
        repo reads from the table.
        """
        run = self.runs.get(run_id)
        if run is None:
            return []
        latest: dict[UUID, tuple[datetime, int, str]] = {}
        for position, event_id in enumerate(self.by_shift.get(run.shift_id, [])):
            event = self.events.get(event_id)
            if event is None or event.kind not in STATUS_KINDS:
                continue
            previous = latest.get(event.stop_id)
            if previous is not None and previous[0] > event.occurred_at:
                continue
            latest[event.stop_id] = (event.occurred_at, position, event.kind)
        return [
            RouteStopRow(
                id=row.id,
                lat=row.lat,
                lon=row.lon,
                priority=row.priority,
                parcels=row.parcels,
                service_time_s=row.service_time_s,
                window_start=row.window_start,
                window_end=row.window_end,
                address=row.address,
                status=latest.get(row.id, ("", 0, "pending"))[2],
            )
            for row in self.run_stops.get(run_id, [])
        ]

    def put_run_template(self, run_id: UUID, template: RunTemplate) -> None:
        self.templates[run_id] = template
        self.routes.pop(run_id, None)

    def get_run_template(self, run_id: UUID) -> RunTemplate | None:
        return self.templates.get(run_id)

    def put_run_route(self, run_id: UUID, plan: RoutePlan) -> None:
        self.routes[run_id] = plan

    def get_run_route(self, run_id: UUID) -> RoutePlan | None:
        return self.routes.get(run_id)


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

    def put_run(self, run: RunRecord) -> None:
        statement = text(
            """
            INSERT INTO runs (id, shift_id, courier_id, name, depot_lat, depot_lon,
                              capacity_parcels, speed_kmh, start_at)
            VALUES (:id, :shift_id, :courier_id, :name, :depot_lat, :depot_lon,
                    :capacity_parcels, :speed_kmh, :start_at)
            """
        )
        with self._engine.begin() as connection:
            connection.execute(
                statement,
                {
                    "id": run.id,
                    "shift_id": run.shift_id,
                    "courier_id": run.courier_id,
                    "name": run.name,
                    "depot_lat": run.depot_lat,
                    "depot_lon": run.depot_lon,
                    "capacity_parcels": run.capacity_parcels,
                    "speed_kmh": run.speed_kmh,
                    "start_at": run.start_at,
                },
            )

    def list_runs(self, courier_id: str, limit: int = 500) -> list[RunRecord]:
        statement = text(
            """
            SELECT id, shift_id, courier_id, name, depot_lat, depot_lon,
                   capacity_parcels, speed_kmh, start_at
            FROM runs
            WHERE courier_id = :courier_id
            ORDER BY start_at DESC
            LIMIT :limit
            """
        )
        with self._engine.connect() as connection:
            rows = (
                connection.execute(statement, {"courier_id": courier_id, "limit": limit})
                .mappings()
                .all()
            )
        return [
            RunRecord(
                id=row["id"],
                shift_id=row["shift_id"],
                courier_id=row["courier_id"],
                name=row["name"],
                depot_lat=row["depot_lat"],
                depot_lon=row["depot_lon"],
                capacity_parcels=row["capacity_parcels"],
                speed_kmh=row["speed_kmh"],
                start_at=row["start_at"],
            )
            for row in rows
        ]

    def get_run(self, run_id: UUID) -> RunRecord | None:
        statement = text(
            """
            SELECT id, shift_id, courier_id, name, depot_lat, depot_lon,
                   capacity_parcels, speed_kmh, start_at
            FROM runs
            WHERE id = :run_id
            """
        )
        with self._engine.connect() as connection:
            row = connection.execute(statement, {"run_id": run_id}).mappings().one_or_none()
        if row is None:
            return None
        return RunRecord(
            id=row["id"],
            shift_id=row["shift_id"],
            courier_id=row["courier_id"],
            name=row["name"],
            depot_lat=row["depot_lat"],
            depot_lon=row["depot_lon"],
            capacity_parcels=row["capacity_parcels"],
            speed_kmh=row["speed_kmh"],
            start_at=row["start_at"],
        )

    def get_run_for_shift(self, shift_id: UUID) -> RunRecord | None:
        statement = text(
            """
            SELECT id, shift_id, courier_id, name, depot_lat, depot_lon,
                   capacity_parcels, speed_kmh, start_at
            FROM runs
            WHERE shift_id = :shift_id
            """
        )
        with self._engine.connect() as connection:
            row = connection.execute(statement, {"shift_id": shift_id}).mappings().one_or_none()
        if row is None:
            return None
        return RunRecord(
            id=row["id"],
            shift_id=row["shift_id"],
            courier_id=row["courier_id"],
            name=row["name"],
            depot_lat=row["depot_lat"],
            depot_lon=row["depot_lon"],
            capacity_parcels=row["capacity_parcels"],
            speed_kmh=row["speed_kmh"],
            start_at=row["start_at"],
        )

    def get_run_stops(self, run_id: UUID) -> list[RouteStopRow]:
        statement = text(
            """
            SELECT s.id, s.latitude, s.longitude, s.priority, s.parcels,
                   s.service_time_s, s.time_window_start, s.time_window_end,
                   s.address, s.status
            FROM stops s
            JOIN runs r ON r.shift_id = s.shift_id
            WHERE r.id = :run_id
            ORDER BY s.sequence
            """
        )
        with self._engine.connect() as connection:
            rows = connection.execute(statement, {"run_id": run_id}).mappings().all()
        return [
            RouteStopRow(
                id=row["id"],
                lat=row["latitude"],
                lon=row["longitude"],
                priority=row["priority"],
                parcels=row["parcels"],
                service_time_s=row["service_time_s"],
                window_start=row["time_window_start"],
                window_end=row["time_window_end"],
                address=row["address"],
                status=row["status"],
            )
            for row in rows
        ]

    def put_run_template(self, run_id: UUID, template: RunTemplate) -> None:
        statement = text(
            """
            INSERT INTO run_templates (run_id, template_id, segments, stop_order)
            VALUES (:run_id, :template_id, CAST(:segments AS jsonb), CAST(:stop_order AS jsonb))
            ON CONFLICT (run_id) DO UPDATE SET
                template_id = EXCLUDED.template_id,
                segments = EXCLUDED.segments,
                stop_order = EXCLUDED.stop_order,
                updated_at = now()
            """
        )
        parameters = {
            "run_id": run_id,
            "template_id": template.id,
            "segments": json.dumps(
                [
                    {"street_key": segment.street_key, "direction": segment.direction}
                    for segment in template.segments
                ]
            ),
            "stop_order": json.dumps([str(stop_id) for stop_id in template.stop_order]),
        }
        with self._engine.begin() as connection:
            connection.execute(statement, parameters)
            connection.execute(
                text("DELETE FROM run_route_stops WHERE run_id = :run_id"), {"run_id": run_id}
            )
            connection.execute(
                text("DELETE FROM run_routes WHERE run_id = :run_id"), {"run_id": run_id}
            )

    def get_run_template(self, run_id: UUID) -> RunTemplate | None:
        statement = text(
            "SELECT template_id, segments, stop_order FROM run_templates WHERE run_id = :run_id"
        )
        with self._engine.connect() as connection:
            row = connection.execute(statement, {"run_id": run_id}).mappings().one_or_none()
        if row is None:
            return None
        return RunTemplate(
            id=row["template_id"],
            segments=_parse_segments(row["segments"]),
            stop_order=_parse_stop_order(row["stop_order"]),
        )

    def put_run_route(self, run_id: UUID, plan: RoutePlan) -> None:
        header = text(
            """
            INSERT INTO run_routes (run_id, engine, total_distance_m, total_duration_s,
                                    parcels, capacity_parcels, over_capacity, window_violations)
            VALUES (:run_id, :engine, :total_distance_m, :total_duration_s,
                    :parcels, :capacity_parcels, :over_capacity, :window_violations)
            """
        )
        legs = text(
            """
            INSERT INTO run_route_stops (run_id, position, stop_id, lat, lon, arrival_at,
                                         departure_at, distance_m, cumulative_distance_m, late)
            VALUES (:run_id, :position, :stop_id, :lat, :lon, :arrival_at,
                    :departure_at, :distance_m, :cumulative_distance_m, :late)
            """
        )
        parameters = {
            "run_id": run_id,
            "engine": plan.engine,
            "total_distance_m": plan.total_distance_m,
            "total_duration_s": plan.total_duration_s,
            "parcels": plan.parcels,
            "capacity_parcels": plan.capacity_parcels,
            "over_capacity": plan.over_capacity,
            "window_violations": plan.window_violations,
        }
        rows = [
            {
                "run_id": run_id,
                "position": stop.sequence,
                "stop_id": stop.stop_id,
                "lat": stop.lat,
                "lon": stop.lon,
                "arrival_at": stop.arrival_at,
                "departure_at": stop.departure_at,
                "distance_m": stop.distance_m,
                "cumulative_distance_m": stop.cumulative_distance_m,
                "late": stop.late,
            }
            for stop in plan.stops
        ]
        with self._engine.begin() as connection:
            connection.execute(
                text("DELETE FROM run_route_stops WHERE run_id = :run_id"), {"run_id": run_id}
            )
            connection.execute(
                text("DELETE FROM run_routes WHERE run_id = :run_id"), {"run_id": run_id}
            )
            connection.execute(header, parameters)
            if rows:
                connection.execute(legs, rows)

    def get_run_route(self, run_id: UUID) -> RoutePlan | None:
        header = text(
            """
            SELECT engine, total_distance_m, total_duration_s, parcels, capacity_parcels,
                   over_capacity, window_violations
            FROM run_routes
            WHERE run_id = :run_id
            """
        )
        legs = text(
            """
            SELECT stop_id, position, lat, lon, arrival_at, departure_at, distance_m,
                   cumulative_distance_m, late
            FROM run_route_stops
            WHERE run_id = :run_id
            ORDER BY position
            """
        )
        with self._engine.connect() as connection:
            head = connection.execute(header, {"run_id": run_id}).mappings().one_or_none()
            if head is None:
                return None
            rows = connection.execute(legs, {"run_id": run_id}).mappings().all()
        return RoutePlan(
            stops=tuple(
                PlannedStop(
                    stop_id=row["stop_id"],
                    sequence=row["position"],
                    lat=row["lat"],
                    lon=row["lon"],
                    arrival_at=row["arrival_at"],
                    departure_at=row["departure_at"],
                    distance_m=row["distance_m"],
                    cumulative_distance_m=row["cumulative_distance_m"],
                    late=row["late"],
                )
                for row in rows
            ),
            total_distance_m=head["total_distance_m"],
            total_duration_s=head["total_duration_s"],
            parcels=head["parcels"],
            capacity_parcels=head["capacity_parcels"],
            over_capacity=head["over_capacity"],
            window_violations=head["window_violations"],
            engine=head["engine"],
        )


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
