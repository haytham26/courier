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
from dataclasses import dataclass, field, replace
from datetime import datetime
from functools import lru_cache
from typing import Any, Protocol
from uuid import UUID

from sqlalchemy import bindparam, create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import IntegrityError

from .locations import canonical_address, location_id_for
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
class AppendResult:
    """What an append did: the new rows, and the diverging replays (ADR-014).

    A conflict is a same-id replay whose content differs: the stored row
    wins, the incoming copy is discarded, and the id travels back to the
    phone so it can surface the divergence instead of living it."""

    stored: int
    conflicts: tuple[UUID, ...] = ()


def _same_event(stored: DeliveryEventRow, incoming: DeliveryEventRow) -> bool:
    """Whether a replay carries exactly what is already stored."""
    return (
        stored.shift_id == incoming.shift_id
        and stored.stop_id == incoming.stop_id
        and stored.kind == incoming.kind
        and stored.utterance == incoming.utterance
        and stored.safe_place == incoming.safe_place
        and stored.lat == incoming.lat
        and stored.lon == incoming.lon
        and stored.accuracy_m == incoming.accuracy_m
        and stored.occurred_at == incoming.occurred_at
    )


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
    suburb: str | None = None
    location_id: UUID | None = None


@dataclass(frozen=True)
class LocationNoteRow:
    """One learned note for a door (ADR-012): the gate code, the hazard."""

    id: UUID
    courier_id: str
    location_id: UUID
    address_key: str
    kind: str
    body: str
    confidence: float
    last_confirmed: datetime


class Repo(Protocol):
    """What the API needs from the database."""

    def put_run(self, run: RunRecord) -> None:
        """Store a new run (the phone's first write of the day).

        A shift carries exactly one run (the schema's `UNIQUE(shift_id)`); a
        retry of the create call must meet the same 409 the database would
        give, in both repositories, so the tests exercise what production
        does.
        """
        ...

    def get_event(self, event_id: UUID) -> DeliveryEventRow | None:
        """One delivery event by id - the POD replay's ownership check."""
        ...

    def list_runs(self, courier_id: str, limit: int = 500) -> list[RunRecord]:
        """The courier's own runs, newest first, bounded."""
        ...

    def append_events(self, shift_id: UUID, events: list[DeliveryEventRow]) -> AppendResult:
        """Stores the events; an identical replay is an ack, a divergent one a
        conflict the caller reports (ADR-014: the stored row wins)."""

    def cursor(self, shift_id: UUID) -> int:
        """The number of events stored for the shift (the sync cursor)."""

    def get_run(self, run_id: UUID) -> RunRecord | None:
        """The run, when the run exists."""

    def get_run_for_shift(self, shift_id: UUID) -> RunRecord | None:
        """The run of the shift, when the shift has one."""

    def get_run_stops(self, run_id: UUID) -> list[RouteStopRow]:
        """The stops of the run, in the order the manifest gave them."""

    def courier_location_key(self, courier_id: str, location_id: UUID) -> str | None:
        """The canonical address key when the courier has a stop there, else
        None (ADR-012 §3: the one authz + audit lookup)."""
        ...

    def get_location_notes(self, courier_id: str, location_id: UUID) -> list[LocationNoteRow]:
        """The courier's notes for the location, ordered by kind."""
        ...

    def put_location_note(self, note: LocationNoteRow) -> bool:
        """Upsert by (courier, location, kind); True when the kind was new."""
        ...

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
    location_notes: dict[tuple[str, UUID, str], LocationNoteRow] = field(default_factory=dict)

    def append_events(self, shift_id: UUID, events: list[DeliveryEventRow]) -> AppendResult:
        stored = 0
        conflicts: list[UUID] = []
        for event in events:
            existing = self.events.get(event.id)
            if existing is not None:
                if not _same_event(existing, event):
                    conflicts.append(event.id)
                continue
            self.events[event.id] = event
            self.by_shift.setdefault(shift_id, []).append(event.id)
            stored += 1
        return AppendResult(stored=stored, conflicts=tuple(conflicts))

    def cursor(self, shift_id: UUID) -> int:
        return len(self.by_shift.get(shift_id, []))

    def put_run(self, run: RunRecord) -> None:
        if run.id in self.runs:
            raise ValueError(f"run {run.id} already exists")
        if any(existing.shift_id == run.shift_id for existing in self.runs.values()):
            raise ValueError("this shift already has a run")
        self.runs[run.id] = run

    def list_runs(self, courier_id: str, limit: int = 500) -> list[RunRecord]:
        mine = [run for run in self.runs.values() if run.courier_id == courier_id]
        mine.sort(key=lambda run: run.start_at, reverse=True)
        return mine[:limit]

    def get_event(self, event_id: UUID) -> DeliveryEventRow | None:
        return self.events.get(event_id)

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
                suburb=row.suburb,
                location_id=row.location_id,
            )
            for row in self.run_stops.get(run_id, [])
        ]

    def courier_location_key(self, courier_id: str, location_id: UUID) -> str | None:
        for run_id, stops in self.run_stops.items():
            run = self.runs.get(run_id)
            if run is None or run.courier_id != courier_id:
                continue
            for stop in stops:
                derived = stop.location_id or location_id_for(stop.address or "", stop.suburb)
                if derived == location_id:
                    return canonical_address(stop.address or "", stop.suburb)
        return None

    def get_location_notes(self, courier_id: str, location_id: UUID) -> list[LocationNoteRow]:
        notes = [
            note
            for (owner, location, _kind), note in self.location_notes.items()
            if owner == courier_id and location == location_id
        ]
        return sorted(notes, key=lambda note: note.kind)

    def put_location_note(self, note: LocationNoteRow) -> bool:
        key = (note.courier_id, note.location_id, note.kind)
        existing = self.location_notes.get(key)
        if existing is None:
            self.location_notes[key] = note
            return True
        # The SQL upsert keeps the row's own id on a correction; the memory
        # must answer the same way (the response echoes it).
        self.location_notes[key] = replace(note, id=existing.id)
        return False

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

    def append_events(self, shift_id: UUID, events: list[DeliveryEventRow]) -> AppendResult:
        if not events:
            return AppendResult(stored=0)
        existing = self._existing_events([event.id for event in events])
        conflicts = [
            event.id
            for event in events
            if event.id in existing and not _same_event(existing[event.id], event)
        ]
        # A batch carrying the same id twice with different content is a
        # divergence too: the insert keeps the first copy, and the phone is
        # told - the in-memory repo answers the same way.
        first_copy: dict[UUID, DeliveryEventRow] = {}
        for event in events:
            first = first_copy.setdefault(event.id, event)
            if first is not event and not _same_event(first, event):
                conflicts.append(event.id)
        deduped = tuple(dict.fromkeys(conflicts))
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
        return AppendResult(stored=int(result.rowcount or 0), conflicts=deduped)

    def _existing_events(self, ids: list[UUID]) -> dict[UUID, DeliveryEventRow]:
        """The stored rows for the batch's ids, for the conflict comparison."""
        statement = text(
            """
            SELECT id, shift_id, stop_id, kind, utterance, safe_place, lat, lon,
                   accuracy_m, occurred_at
            FROM delivery_events
            WHERE id IN :ids
            """
        ).bindparams(bindparam("ids", expanding=True))
        with self._engine.connect() as connection:
            rows = connection.execute(statement, {"ids": ids}).mappings().all()
        return {
            row["id"]: DeliveryEventRow(
                id=row["id"],
                shift_id=row["shift_id"],
                stop_id=row["stop_id"],
                kind=row["kind"],
                utterance=row["utterance"],
                safe_place=row["safe_place"],
                lat=row["lat"],
                lon=row["lon"],
                accuracy_m=row["accuracy_m"],
                occurred_at=row["occurred_at"],
            )
            for row in rows
        }

    def get_event(self, event_id: UUID) -> DeliveryEventRow | None:
        statement = text(
            """
            SELECT id, shift_id, stop_id, kind, utterance, safe_place,
                   lat, lon, accuracy_m, occurred_at
            FROM delivery_events
            WHERE id = :event_id
            """
        )
        with self._engine.connect() as connection:
            row = connection.execute(statement, {"event_id": event_id}).mappings().one_or_none()
        if row is None:
            return None
        return DeliveryEventRow(
            id=row["id"],
            shift_id=row["shift_id"],
            stop_id=row["stop_id"],
            kind=row["kind"],
            utterance=row["utterance"],
            safe_place=row["safe_place"],
            lat=row["lat"],
            lon=row["lon"],
            accuracy_m=row["accuracy_m"],
            occurred_at=row["occurred_at"],
        )

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
        try:
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
        except IntegrityError as error:
            # The schema carries both contracts (the run's primary key and
            # the 1:1 shift UNIQUE) - the constraint name says which one
            # broke, so the caller gets the same ValueError the in-memory
            # repo raises, and the API's 409 is one rule in both worlds.
            # (The audit flagged the earlier version: any IntegrityError
            # became the shift message - a lying 409. And a foreign-key
            # break is named for what it is: the shift does not exist.)
            constraint = getattr(getattr(error, "orig", None), "diag", None)
            name = getattr(constraint, "constraint_name", "") or ""
            if name.endswith("_fkey"):
                raise ValueError("the shift does not exist") from error
            if name.endswith("_key") and "shift_id" in name:
                raise ValueError("this shift already has a run") from error
            raise ValueError(f"run {run.id} already exists") from error

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
                   s.address, s.suburb, s.status, s.location_id
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
                suburb=row["suburb"],
                location_id=row["location_id"],
            )
            for row in rows
        ]

    def courier_location_key(self, courier_id: str, location_id: UUID) -> str | None:
        statement = text(
            """
            SELECT s.address, s.suburb
            FROM stops s
            JOIN shifts sh ON sh.id = s.shift_id
            WHERE sh.courier_id = :courier_id AND s.location_id = :location_id
            ORDER BY s.sequence
            LIMIT 1
            """
        )
        with self._engine.connect() as connection:
            row = (
                connection.execute(
                    statement, {"courier_id": courier_id, "location_id": location_id}
                )
                .mappings()
                .first()
            )
        if row is None:
            return None
        return canonical_address(row["address"], row["suburb"])

    def get_location_notes(self, courier_id: str, location_id: UUID) -> list[LocationNoteRow]:
        statement = text(
            """
            SELECT id, courier_id, location_id, address_key, kind, body, confidence,
                   last_confirmed
            FROM door_memory
            WHERE courier_id = :courier_id AND location_id = :location_id
            ORDER BY kind
            """
        )
        with self._engine.connect() as connection:
            rows = (
                connection.execute(
                    statement, {"courier_id": courier_id, "location_id": location_id}
                )
                .mappings()
                .all()
            )
        return [
            LocationNoteRow(
                id=row["id"],
                courier_id=row["courier_id"],
                location_id=row["location_id"],
                address_key=row["address_key"],
                kind=row["kind"],
                body=row["body"],
                confidence=row["confidence"],
                last_confirmed=row["last_confirmed"],
            )
            for row in rows
        ]

    def put_location_note(self, note: LocationNoteRow) -> bool:
        insert = text(
            """
            INSERT INTO door_memory
                (id, courier_id, location_id, address_key, kind, body, confidence, last_confirmed)
            VALUES
                (:id, :courier_id, :location_id, :address_key, :kind, :body, :confidence,
                 :last_confirmed)
            ON CONFLICT (courier_id, location_id, kind) DO NOTHING
            RETURNING id
            """
        )
        update = text(
            """
            UPDATE door_memory
            SET address_key = :address_key, body = :body, confidence = :confidence,
                last_confirmed = :last_confirmed
            WHERE courier_id = :courier_id AND location_id = :location_id AND kind = :kind
            """
        )
        params = {
            "id": note.id,
            "courier_id": note.courier_id,
            "location_id": note.location_id,
            "address_key": note.address_key,
            "kind": note.kind,
            "body": note.body,
            "confidence": note.confidence,
            "last_confirmed": note.last_confirmed,
        }
        with self._engine.begin() as connection:
            created = connection.execute(insert, params).scalar_one_or_none() is not None
            if not created:
                connection.execute(update, params)
        return created

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
