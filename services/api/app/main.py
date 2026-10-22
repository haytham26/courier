"""FastAPI surface. Persistence is behind `repo` (PostGIS, see packages/contracts/db/schema.sql)."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from fastapi import Depends, FastAPI, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from .agents import copilot
from .auth.jwks import AuthPrincipal, get_auth_settings, get_current_principal
from .auth.routes import router as auth_router
from .auth.websocket import get_websocket_principal
from .repo import DeliveryEventRow, Repo, RouteStopRow, RunRecord, get_repo
from .routing import (
    RoutePlan,
    RouteRequest,
    RouteStop,
    RunConstraints,
    RunTemplate,
    TimeWindow,
    build_plan,
    schedule_plan,
)
from .sequencing import Segment

# Fail fast when the API cannot verify tokens (no default secrets).
get_auth_settings()

app = FastAPI(title="Courier Copilot", version="0.1.0")

# Include auth routes
app.include_router(auth_router)

Direction = Literal["asc", "desc", "odd_first", "even_first", "zigzag"]


class IntakeText(BaseModel):
    source: str = "voice"
    text: str


class DeliveryEvent(BaseModel):
    id: uuid.UUID                     # client-generated -> idempotent offline replay
    stop_id: uuid.UUID
    kind: str
    utterance: str | None = None
    safe_place: str | None = None
    lat: float | None = None
    lon: float | None = None
    accuracy_m: float | None = None
    occurred_at: datetime


class TemplateSegment(BaseModel):
    street_key: str = Field(min_length=1)
    direction: Direction = "asc"


class TemplateRequest(BaseModel):
    """The Master Template Lock: the courier's own street order for the run.

    The identity is generated on the phone, so the same template is stored
    once when it is replayed after the shift.
    """

    template_id: str = Field(min_length=1, max_length=64)
    segments: list[TemplateSegment] = Field(default_factory=list)
    stop_order: list[uuid.UUID]


def _order_problem(order: list[uuid.UUID], stop_ids: list[uuid.UUID]) -> str | None:
    """The reason the order is refused, or None when the order is the run's."""
    run_ids = set(stop_ids)
    seen: set[uuid.UUID] = set()
    for stop_id in order:
        if stop_id in seen:
            return f"stop {stop_id} is in the order twice"
        seen.add(stop_id)
    unknown = seen - run_ids
    if unknown:
        return f"stop {sorted(str(item) for item in unknown)[0]} is not in this run"
    missing = run_ids - seen
    if missing:
        return f"stop {sorted(str(item) for item in missing)[0]} is in the run but not in the order"
    if len(order) != len(stop_ids):
        return "the order does not hold exactly the run's stops"
    return None


def _route_request(
    run: RunRecord, rows: list[RouteStopRow]
) -> tuple[RouteRequest, list[uuid.UUID]]:
    """The routing request for the run, and the stops we cannot place."""
    stops: list[RouteStop] = []
    unroutable: list[uuid.UUID] = []
    for row in rows:
        if row.lat is None or row.lon is None:
            unroutable.append(row.id)
            continue
        stops.append(
            RouteStop(
                id=row.id,
                lat=row.lat,
                lon=row.lon,
                priority=row.priority,
                parcels=row.parcels,
                service_time_s=row.service_time_s,
                window=TimeWindow(start=row.window_start, end=row.window_end),
            )
        )
    constraints = RunConstraints(
        depot_lat=run.depot_lat,
        depot_lon=run.depot_lon,
        start_at=run.start_at,
        capacity_parcels=run.capacity_parcels,
        speed_kmh=run.speed_kmh,
    )
    return RouteRequest(stops=tuple(stops), constraints=constraints), unroutable


def _locked_order(
    template: RunTemplate | None, request: RouteRequest
) -> list[RouteStop] | None:
    """The locked order, when it still covers every stop of the run."""
    if template is None or not template.stop_order:
        return None
    by_id = {stop.id: stop for stop in request.stops}
    if len(template.stop_order) != len(by_id):
        return None
    ordered: list[RouteStop] = []
    for stop_id in template.stop_order:
        stop = by_id.get(stop_id)
        if stop is None:
            return None
        ordered.append(stop)
    return ordered


def _covers(plan: RoutePlan, request: RouteRequest) -> bool:
    """Whether the stored plan is still the plan of this run's stops."""
    return {stop.stop_id for stop in plan.stops} == {stop.id for stop in request.stops}


def _route_body(
    shift_id: uuid.UUID,
    run: RunRecord,
    plan: RoutePlan,
    template: RunTemplate | None,
    unroutable: list[uuid.UUID],
) -> dict[str, Any]:
    """The day's route for the phone."""
    return {
        "shift_id": str(shift_id),
        "run_id": str(run.id),
        "engine": plan.engine,
        "locked": plan.engine == "template-lock",
        "template_id": template.id if template is not None else None,
        "total_distance_m": round(plan.total_distance_m, 1),
        "total_duration_s": round(plan.total_duration_s, 1),
        "parcels": plan.parcels,
        "capacity_parcels": plan.capacity_parcels,
        "over_capacity": plan.over_capacity,
        "window_violations": plan.window_violations,
        "unroutable_stop_ids": [str(stop_id) for stop_id in unroutable],
        "stops": [
            {
                "stop_id": str(stop.stop_id),
                "sequence": stop.sequence,
                "lat": stop.lat,
                "lon": stop.lon,
                "arrival_at": stop.arrival_at.isoformat(),
                "departure_at": stop.departure_at.isoformat(),
                "distance_m": round(stop.distance_m, 1),
                "cumulative_distance_m": round(stop.cumulative_distance_m, 1),
                "late": stop.late,
            }
            for stop in plan.stops
        ],
    }


@app.put("/runs/{run_id}/template")
def put_template(
    run_id: uuid.UUID,
    body: TemplateRequest,
    principal: AuthPrincipal = Depends(get_current_principal),
    repo: Repo = Depends(get_repo),
):
    """The Master Template Lock: the courier's own street order replaces the plan.

    The order has to hold exactly the run's stops; anything else is refused
    with the reason, so a half-built day never reaches the phone.
    """
    run = repo.get_run(run_id)
    if run is None or run.courier_id != principal.user_id:
        raise HTTPException(status_code=404, detail="no run with this id")
    stops = repo.get_run_stops(run_id)
    problem = _order_problem(body.stop_order, [stop.id for stop in stops])
    if problem is not None:
        raise HTTPException(status_code=422, detail=problem)
    template = RunTemplate(
        id=body.template_id,
        segments=tuple(
            Segment(street_key=item.street_key, direction=item.direction) for item in body.segments
        ),
        stop_order=tuple(body.stop_order),
    )
    repo.put_run_template(run_id, template)
    return {
        "run_id": str(run_id),
        "template_id": template.id,
        "segments": len(template.segments),
        "stops": len(template.stop_order),
    }


@app.get("/shifts/{shift_id}/route")
def shift_route(
    shift_id: uuid.UUID,
    principal: AuthPrincipal = Depends(get_current_principal),
    repo: Repo = Depends(get_repo),
):
    """The day's route: the ordered stops with the arrival times.

    The locked template wins when the run has one; otherwise the route is
    planned from the stops. The answer is the same every time it is asked.
    """
    run = repo.get_run_for_shift(shift_id)
    if run is None or run.courier_id != principal.user_id:
        raise HTTPException(status_code=404, detail="no run for this shift")
    rows = repo.get_run_stops(run.id)
    request, unroutable = _route_request(run, rows)
    template = repo.get_run_template(run.id)
    stored = repo.get_run_route(run.id)
    if stored is not None and _covers(stored, request):
        plan = stored
    else:
        order = _locked_order(template, request)
        plan = schedule_plan(order, request) if order is not None else build_plan(request)
        repo.put_run_route(run.id, plan)
    return _route_body(shift_id, run, plan, template, unroutable)


@app.post("/shifts/{shift_id}/intake")
def intake_text(shift_id: uuid.UUID, body: IntakeText, principal: AuthPrincipal = Depends(get_current_principal)):
    """Starts the intake graph (thread_id = shift_id). Returns either the briefing or the
    first interrupt question; answers flow back over the voice socket."""
    ...


@app.post("/shifts/{shift_id}/intake/manifest")
async def intake_manifest(shift_id: uuid.UUID, image: UploadFile, principal: AuthPrincipal = Depends(get_current_principal)):
    """Photo of paper manifest -> vision extraction -> same intake graph with source='ocr'."""
    ...


@app.get("/shifts/{shift_id}/stops")
def list_stops(shift_id: uuid.UUID, status: str | None = None, principal: AuthPrincipal = Depends(get_current_principal)):
    ...


@app.post("/shifts/{shift_id}/events:batch")
def sync_events(
    shift_id: uuid.UUID,
    events: list[DeliveryEvent],
    principal: AuthPrincipal = Depends(get_current_principal),
    repo: Repo = Depends(get_repo),
):
    """Offline-first sync: INSERT ... ON CONFLICT (id) DO NOTHING; returns server cursor."""
    rows = [
        DeliveryEventRow(
            id=event.id,
            shift_id=shift_id,
            stop_id=event.stop_id,
            kind=event.kind,
            utterance=event.utterance,
            safe_place=event.safe_place,
            lat=event.lat,
            lon=event.lon,
            accuracy_m=event.accuracy_m,
            occurred_at=event.occurred_at,
        )
        for event in events
    ]
    stored = repo.append_events(shift_id, rows)
    return {"accepted": stored, "cursor": repo.cursor(shift_id)}


@app.websocket("/shifts/{shift_id}/voice")
async def voice(ws: WebSocket, shift_id: uuid.UUID, principal: AuthPrincipal = Depends(get_websocket_principal)):
    """Bidirectional voice channel.
    client -> server: {"type":"transcript","text":..., "final":true, "gps":{lat,lon,acc,speed}}
                      (STT runs on-device or via Deepgram streaming; we only receive finals)
                      {"type":"gps", ...}  (1 Hz; drives 50 m approach whispers)
    server -> client: {"type":"say","text":..., "priority":"now|queue"}  (client TTS / Cartesia)
                      {"type":"state","stop":...}
    """
    await ws.accept()
    try:
        while True:
            msg = await ws.receive_json()
            if msg["type"] == "gps":
                # repo.approaching(shift_id, lat, lon, 50) -> ST_DWithin(entry_point, pos, 50)
                continue
            if msg["type"] == "transcript" and msg.get("final"):
                state: dict[str, Any] = {}  # repo.copilot_state(shift_id) | {"speed_kmh": msg["gps"]["speed"]}
                intent = copilot.interpret(msg["text"], state)
                # repo.apply(shift_id, intent) -> delivery_event / stop mutation
                if intent.speech:
                    await ws.send_json({"type": "say", "text": intent.speech, "priority": "now"})
    except WebSocketDisconnect:
        return
