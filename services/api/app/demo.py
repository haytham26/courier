"""The demo-run seed (ADR-019): a deterministic day, seeded for the caller.

The app's core flow - load the run, deliver 3 stops, go offline, deliver 1, sync -
needs a run with stops that really exist in the database, and it needs the ids to
stay still between calls, so an E2E job can reset the phone and run the flow again.

Three properties make that safe:

- Deterministic ids: uuid5 over the caller's own id and the reason, so the same
  caller seeding twice gets the same day and the ids are recognisable as demo
  data in the database and in the evidence.
- One reason per day: a caller seeds e2e, demo or dev, a fixed small set, so the
  E2E job, the founder's phone and a developer's local run never overwrite each
  other's day.
- Gated by the environment: DEMO_SEED_ENABLED must be exactly true, and without
  it the endpoint is 404, because seeding demo rows into a real database is not
  something an unguarded route should ever do.
"""

from __future__ import annotations

import os
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Engine

from .locations import location_id_for
from .repo import RouteStopRow, RunRecord

#: The one reason per day: which demo day a caller is seeding. A fixed, small
#: vocabulary keeps callers from overwriting each other's day.
DEMO_REASONS: tuple[str, ...] = ("e2e", "demo", "dev")

#: How many stops the demo day carries: three to deliver, one to go offline with,
#: and one left over.
DEMO_STOPS = 5

_NAMESPACE = uuid.uuid5(uuid.NAMESPACE_URL, "courier-copilot/demo-seed")

#: The demo day's five Canterbury addresses, near the Hornby depot.
_DEMO_ADDRESSES: tuple[tuple[str, float, float], ...] = (
    ("12 Riccarton Road, Riccarton", -43.5320, 172.5990),
    ("8 Smith Street, Papanui", -43.5390, 172.6230),
    ("45 Papanui Road, Papanui", -43.5410, 172.6050),
    ("2/14 Harewood Road, Harewood", -43.4780, 172.5710),
    ("7 Blenheim Road, Riccarton", -43.5260, 172.5850),
)

#: The demo shift's insert, idempotent on its id.
_SHIFT_SQL = (
    "INSERT INTO shifts (id, courier_id, started_at) "
    "VALUES (:id, :courier, :start) "
    "ON CONFLICT (id) DO NOTHING"
)

#: The demo stop's insert, idempotent on its id, with the status the schema's
#: default gives a seeded stop.
_STOP_SQL = (
    "INSERT INTO stops "
    "(id, shift_id, sequence, address, latitude, longitude, status, priority, parcels, "
    "location_id) "
    "VALUES (:id, :shift_id, :sequence, :address, :lat, :lon, 'pending', :priority, :parcels, "
    ":location) "
    "ON CONFLICT (id) DO NOTHING"
)


def demo_shift_id(courier_id: str, reason: str) -> uuid.UUID:
    """The demo shift of the caller's day: deterministic and recognisable."""
    return uuid.uuid5(_NAMESPACE, f"shift/{courier_id}/{reason}")


def demo_run_id(courier_id: str, reason: str) -> uuid.UUID:
    """The demo run of the caller's day."""
    return uuid.uuid5(_NAMESPACE, f"run/{courier_id}/{reason}")


def demo_stop_id(courier_id: str, reason: str, index: int) -> uuid.UUID:
    """The index-th stop of the caller's day."""
    return uuid.uuid5(_NAMESPACE, f"stop/{courier_id}/{reason}/{index}")


def seed_enabled() -> bool:
    """Whether this deployment allows the demo seed (the gate's exact answer)."""
    return os.environ.get("DEMO_SEED_ENABLED") == "true"


@dataclass(frozen=True)
class DemoDay:
    """The caller's demo run, ready to write."""

    run: RunRecord
    stops: list[RouteStopRow]


def demo_day_for(courier_id: str, reason: str, starts_at: datetime | None = None) -> DemoDay:
    """The deterministic day for this caller and reason."""
    start = starts_at or datetime.now(UTC).replace(minute=0, second=0, microsecond=0)
    run = RunRecord(
        id=demo_run_id(courier_id, reason),
        shift_id=demo_shift_id(courier_id, reason),
        courier_id=courier_id,
        name=f"Demo run ({reason})",
        depot_lat=-43.5330,
        depot_lon=172.6300,
        capacity_parcels=None,
        speed_kmh=30.0,
        start_at=start,
    )
    stops = [
        RouteStopRow(
            id=demo_stop_id(courier_id, reason, index),
            lat=lat,
            lon=lon,
            priority=False,
            parcels=1,
            service_time_s=None,
            window_start=None,
            window_end=None,
            address=address,
        )
        for index, (address, lat, lon) in enumerate(_DEMO_ADDRESSES[:DEMO_STOPS])
    ]
    return DemoDay(run=run, stops=stops)


def demo_day_body(day: DemoDay) -> dict[str, object]:
    """The seeded day as the response's shape."""
    return {
        "run_id": str(day.run.id),
        "shift_id": str(day.run.shift_id),
        "stops": [
            {
                "id": str(stop.id),
                "address": stop.address,
                "lat": stop.lat,
                "lon": stop.lon,
                "priority": stop.priority,
                "parcels": stop.parcels,
            }
            for stop in day.stops
        ],
    }


def _engine_of(repo: Any) -> Engine | None:
    """The SQL engine behind this repository, when it is the SQL one."""
    engine = getattr(repo, "_engine", None)
    return engine if isinstance(engine, Engine) else None


def write_demo_day(repo: Any, courier_id: str, reason: str) -> DemoDay:
    """Write the caller's demo day, idempotently, and return it.

    The shift is written directly (its table has no other writer in the API's
    surface), the run through the repo's own put_run - so the same 409 rules
    apply and a retry is not a duplicate - and the stops through the writer
    below, because the API has no stop-writing surface of its own: a day is
    seeded once by the dispatcher, then read.
    """
    day = demo_day_for(courier_id, reason)
    engine = _engine_of(repo)
    if engine is not None:
        with engine.begin() as connection:
            connection.execute(
                text(_SHIFT_SQL),
                {
                    "id": day.run.shift_id,
                    "courier": courier_id,
                    "start": day.run.start_at,
                },
            )
    else:
        shifts = getattr(repo, "shifts", None)
        if isinstance(shifts, dict):
            shifts.setdefault(day.run.shift_id, day.run.shift_id)
    if repo.get_run(day.run.id) is None:
        repo.put_run(day.run)
    _write_stops(repo, day, engine)
    return day


def _write_stops(repo: Any, day: DemoDay, engine: Engine | None) -> None:
    """Write the day's stops, idempotently, into whichever store this repo uses."""
    stored = {stop.id for stop in repo.get_run_stops(day.run.id)}
    missing = [stop for stop in day.stops if stop.id not in stored]
    if not missing:
        return
    if engine is not None:
        parameters = [
            {
                "id": stop.id,
                "shift_id": day.run.shift_id,
                "sequence": index + 1,
                "address": stop.address,
                "lat": stop.lat,
                "lon": stop.lon,
                "priority": stop.priority,
                "parcels": stop.parcels,
                "location": location_id_for(stop.address or "", None),
            }
            for index, stop in enumerate(missing)
        ]
        with engine.begin() as connection:
            connection.execute(text(_STOP_SQL), parameters)
    run_stops = getattr(repo, "run_stops", None)
    if isinstance(run_stops, dict):
        run_stops.setdefault(day.run.id, []).extend(missing)
