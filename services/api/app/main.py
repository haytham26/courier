"""FastAPI surface. Persistence is behind `repo` (PostGIS, see packages/contracts/db/schema.sql)."""

from __future__ import annotations

import logging
import uuid
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated, Any, Literal

from fastapi import (
    Depends,
    FastAPI,
    Form,
    HTTPException,
    Request,
    Response,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.responses import JSONResponse
from langgraph.checkpoint.memory import MemorySaver
from pydantic import BaseModel, ConfigDict, Field, field_validator

from .agents import copilot
from .agents.intake_geo import RepoGeo
from .agents.intake_graph import build_graph
from .agents.omniroute import (
    IntakeProvider,
    OmniRouteError,
    ProviderUnavailableError,
    get_intake_provider,
)
from .auth.jwks import AuthPrincipal, get_auth_settings, get_current_principal
from .auth.routes import router as auth_router
from .auth.websocket import get_websocket_principal
from .pod import (
    POD_MAX_BYTES,
    pod_path,
    pod_settings,
    save_pod,
    sniff_image_kind,
    stored_pod_fingerprint,
)
from .repo import DeliveryEventRow, Repo, RouteStopRow, RunRecord, get_repo
from .routing import (
    RoutePlan,
    RouteRequest,
    RouteStop,
    RunConstraints,
    RunTemplate,
    TimeWindow,
    build_plan,
    build_reopt_plan,
    schedule_plan,
)
from .sequencing import Segment

# Fail fast when the API cannot verify tokens (no default secrets).
get_auth_settings()

app = FastAPI(title="Courier Copilot", version="0.1.0")

# The unhandled-error trail the PLAYBOOK triage reads (RUNBOOK section 10).
logger = logging.getLogger("courier_api")

# Include auth routes
app.include_router(auth_router)


@app.middleware("http")
async def hardening_headers(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    """The ASVS V14 hardening on every response, errors included.

    The API serves JSON only, so the content policy allows nothing and the
    authenticated bodies are never cached by anything between the phone and
    the server. An unhandled exception gets the same headers on a clean 500 -
    the review finding was that a bare 500 skipped the middleware entirely,
    which is exactly when a caller most needs `nosniff` and `no-store`.
    """
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("unhandled API error on %s %s", request.method, request.url.path)
        response = JSONResponse(status_code=500, content={"detail": "an internal error occurred"})
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    response.headers["Cache-Control"] = "no-store"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


Direction = Literal["asc", "desc", "odd_first", "even_first", "zigzag"]


class IntakeText(BaseModel):
    """The spoken or typed manifest: bounded, tagged with its source."""

    source: Literal["voice", "ocr", "scan", "manual"] = "voice"
    text: str = Field(min_length=1, max_length=50_000)


class DepotPoint(BaseModel):
    """The depot as numbers: the GeoJSON wrapper of the contract carried no
    information the runs table does not already have in two columns."""

    lat: float = Field(ge=-90.0, le=90.0)
    lon: float = Field(ge=-180.0, le=180.0)


class CreateRunRequest(BaseModel):
    """The phone's first write of the day (ADR-010 §3).

    Unknown fields are refused, never dropped silently: `territory` from the
    older contract sketch comes back as 422 until the schema has a home for
    it, because accepting-and-ignoring input is a lie. The same rule keeps the
    finish point and the break window out until the runs table gains columns
    for them - they shape the plan, so they must be storable first.
    """

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=120)
    shift_id: uuid.UUID
    depot: DepotPoint
    start_at: datetime
    capacity_parcels: int | None = Field(default=None, ge=0, le=9999)
    speed_kmh: float = Field(default=30.0, ge=1.0, le=120.0)

    @field_validator("start_at")
    @classmethod
    def _aware_start_at(cls, value: datetime) -> datetime:
        """A naive start would be silently read as UTC by the routing walk."""
        if value.tzinfo is None:
            raise ValueError("start_at must carry its timezone")
        return value


class ReoptRequest(BaseModel):
    """The stops whose place in the day changed; everything else stays."""

    affected_stop_ids: list[uuid.UUID] = Field(max_length=500)


class DeliveryEvent(BaseModel):
    id: uuid.UUID  # client-generated -> idempotent offline replay
    stop_id: uuid.UUID
    kind: str = Field(min_length=1, max_length=64)
    utterance: str | None = Field(default=None, max_length=2000)
    safe_place: str | None = Field(default=None, max_length=200)
    lat: float | None = Field(default=None, ge=-90.0, le=90.0)
    lon: float | None = Field(default=None, ge=-180.0, le=180.0)
    accuracy_m: float | None = Field(default=None, ge=0.0)
    occurred_at: datetime

    @field_validator("occurred_at")
    @classmethod
    def _aware_occurred_at(cls, value: datetime) -> datetime:
        """A naive timestamp would break the status ordering (and lie about
        when it happened) - the phone always knows its zone."""
        if value.tzinfo is None:
            raise ValueError("occurred_at must carry its timezone")
        return value

    @field_validator("kind")
    @classmethod
    def _known_kind(cls, value: str) -> str:
        """The vocabulary the status derivation (and the phone) understand."""
        allowed = {"delivered", "skipped", "deferred", "failed", "pod_captured"}
        if value not in allowed:
            raise ValueError(f"unknown event kind: {value}")
        return value


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


def _run_body(run: RunRecord) -> dict[str, Any]:
    """The run as the phone sees it."""
    return {
        "id": str(run.id),
        "shift_id": str(run.shift_id),
        "name": run.name,
        "depot": {"lat": run.depot_lat, "lon": run.depot_lon},
        "capacity_parcels": run.capacity_parcels,
        "speed_kmh": run.speed_kmh,
        "start_at": run.start_at.isoformat(),
    }


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


def _locked_order(template: RunTemplate | None, request: RouteRequest) -> list[RouteStop] | None:
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


@app.get("/healthz")
def healthz():
    """The uptime probe's target (RUNBOOK section 9): data-free by construction.

    It answers without auth (the probe cannot hold a courier token) and
    without any request data, any id or any address - the status, the
    version and the engine names are the whole body.
    """
    return {
        "status": "ok",
        "version": app.version,
        "engines": ["pyvrp", "heuristic-nn-2opt"],
    }


@app.post("/runs", status_code=201)
def create_run(
    body: CreateRunRequest,
    principal: AuthPrincipal = Depends(get_current_principal),
    repo: Repo = Depends(get_repo),
):
    """Create the courier's run: the day the routing engine plans.

    The run belongs to the authenticated courier from birth; nothing else in
    the request can say otherwise (ASVS V4 - the owner comes from the token,
    never from the body).
    """
    record = RunRecord(
        id=uuid.uuid4(),
        shift_id=body.shift_id,
        courier_id=principal.user_id,
        name=body.name,
        depot_lat=body.depot.lat,
        depot_lon=body.depot.lon,
        capacity_parcels=body.capacity_parcels,
        speed_kmh=body.speed_kmh,
        start_at=body.start_at,
    )
    try:
        repo.put_run(record)
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    return _run_body(record)


@app.get("/runs")
def list_runs(
    principal: AuthPrincipal = Depends(get_current_principal),
    repo: Repo = Depends(get_repo),
):
    """The courier's own runs, newest first (bounded at 500, ASVS V13)."""
    return [_run_body(run) for run in repo.list_runs(principal.user_id)]


@app.get("/runs/{run_id}")
def get_run(
    run_id: uuid.UUID,
    principal: AuthPrincipal = Depends(get_current_principal),
    repo: Repo = Depends(get_repo),
):
    """One run of the day, for the courier who owns it; foreign runs are 404."""
    run = repo.get_run(run_id)
    if run is None or run.courier_id != principal.user_id:
        raise HTTPException(status_code=404, detail="no run with this id")
    return _run_body(run)


class StopPaths:
    """The run and the stop from the path (ASVS V4: both resolve to the caller's own)."""

    def __init__(self, run_id: uuid.UUID, stop_id: uuid.UUID) -> None:
        self.run_id = run_id
        self.stop_id = stop_id


class PodForm:
    """The POD upload's form fields (the image itself stays its own parameter)."""

    def __init__(
        self,
        occurred_at: datetime = Form(...),
        safe_place: str | None = Form(None, max_length=200),
        event_id: uuid.UUID | None = Form(None),
    ) -> None:
        if occurred_at.tzinfo is None:
            raise HTTPException(status_code=422, detail="occurred_at must carry its timezone")
        self.occurred_at = occurred_at
        self.safe_place = safe_place
        self.event_id = event_id


@app.post("/runs/{run_id}/stops/{stop_id}/pod", status_code=201)
def upload_pod(
    paths: Annotated[StopPaths, Depends()],
    image: UploadFile,
    form: Annotated[PodForm, Depends()],
    principal: AuthPrincipal = Depends(get_current_principal),
    repo: Repo = Depends(get_repo),
):
    """The at-the-door photo of a delivery (ADR-010 §4-5).

    The bytes decide everything: capped before anything is stored, sniffed by
    magic (the client's name and declared type are never trusted), named by
    the server after the event, under the run's own directory. A replayed
    client event id is only a replay when the event row exists **and belongs
    to this run** - a foreign event id is 404, never a fingerprint from
    another courier's namespace, and a pre-seeded file cannot swallow a
    genuine upload (the review finding).
    """
    run = repo.get_run(paths.run_id)
    if run is None or run.courier_id != principal.user_id:
        raise HTTPException(status_code=404, detail="no run with this id")
    if paths.stop_id not in {row.id for row in repo.get_run_stops(run.id)}:
        raise HTTPException(status_code=404, detail="no stop with this id in this run")

    content = image.file.read(POD_MAX_BYTES + 1)
    if len(content) > POD_MAX_BYTES:
        raise HTTPException(status_code=413, detail="the image is over the 10 MiB cap")
    if sniff_image_kind(content) is None:
        raise HTTPException(status_code=415, detail="the upload is not a JPEG, PNG or HEIC image")

    directory = Path(pod_settings().pod_storage_dir)
    resolved_id = form.event_id if form.event_id is not None else uuid.uuid4()
    existing = repo.get_event(resolved_id)
    if existing is not None:
        if existing.shift_id != run.shift_id:
            # The id belongs to another courier's run: refuse without
            # disclosing anything, and never touch their bytes or rows.
            raise HTTPException(status_code=404, detail="no event with this id")
        if existing.stop_id != paths.stop_id:
            # The caller's own event id, but for a different stop of the
            # same run: a 200 here would echo a stop the bytes never saw.
            raise HTTPException(status_code=409, detail="this event id belongs to another stop")

    replayed = existing is not None

    path = pod_path(directory, run.id, resolved_id)
    if replayed and path.exists():
        stored_bytes, digest = stored_pod_fingerprint(path)
    else:
        # Not a replay: the upload is the record, and a file that sits
        # there without its own event row (a crash orphan, or a planted
        # file) is overwritten by the genuine bytes.
        _, digest = save_pod(directory, run.id, resolved_id, content)
        stored_bytes = len(content)

    stored = repo.append_events(
        shift_id=run.shift_id,
        events=[
            DeliveryEventRow(
                id=resolved_id,
                shift_id=run.shift_id,
                stop_id=paths.stop_id,
                kind="pod_captured",
                utterance=None,
                safe_place=form.safe_place,
                lat=None,
                lon=None,
                accuracy_m=None,
                occurred_at=form.occurred_at,
            )
        ],
    )
    return JSONResponse(
        status_code=200 if replayed else 201,
        content={
            "event_id": str(resolved_id),
            "stop_id": str(paths.stop_id),
            "sha256": digest,
            "bytes": stored_bytes,
            "stored_at": datetime.now(UTC).isoformat(),
            "already_stored": replayed or stored == 0,
        },
    )


@app.post("/runs/{run_id}/route:reopt")
def reopt_route(
    run_id: uuid.UUID,
    body: ReoptRequest,
    principal: AuthPrincipal = Depends(get_current_principal),
    repo: Repo = Depends(get_repo),
):
    """Re-place only the affected stops; the rest of the day stays (ADR-010 §4).

    The affected stops go back into the order deterministically (nearest to
    the depot first, each at its best slot), the answer carries the
    finish-time delta so the copilot can say "this adds N minutes", and the
    stored route is refreshed so the phone's next route read serves the same
    day. An affected stop that is not part of the run is 422, with the
    reason.
    """
    run = repo.get_run(run_id)
    if run is None or run.courier_id != principal.user_id:
        raise HTTPException(status_code=404, detail="no run with this id")
    rows = repo.get_run_stops(run.id)
    request, unroutable = _route_request(run, rows)
    stored = repo.get_run_route(run.id)
    if stored is not None:
        # The phone's own day is the anchor: the delta is what the change
        # does TO that day, so it anchors even when the day has grown past
        # it (the common case - a stop added at the door).
        current = stored
    else:
        # No plan stored: the day "before" is the kept stops, planned as the
        # template would time them.
        affected = set(body.affected_stop_ids)
        current = schedule_plan(
            [stop for stop in request.stops if stop.id not in affected], request
        )
    try:
        result = build_reopt_plan(request, current, body.affected_stop_ids)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    repo.put_run_route(run.id, result.plan)
    body_out = _route_body(
        shift_id=run.shift_id, run=run, plan=result.plan, template=None, unroutable=unroutable
    )
    body_out["finish_delta_s"] = result.finish_delta_s
    return body_out


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


_INTAKE_CHECKPOINTER = MemorySaver()
"""The intake's interrupt state, per shift, for this process's lifetime.

A restart loses a pending question (the courier simply repeats it); the
persistent checkpointer rides with the staging deployment (ADR-013).
"""


def _intake_answer(result: Any) -> dict[str, object]:
    """The graph's last state as the contract's Briefing or Question shape."""
    interrupts = result.get("__interrupt__")
    if interrupts:
        value = interrupts[0].value
        return {"speak": value["speak"], "index": value["index"]}
    return {
        "briefing": result.get("briefing", ""),
        "stops_count": len(result.get("ordered", ())),
        "set_aside_count": sum(
            1 for parcel in result.get("parcels", ()) if parcel.get("anomaly") == "set_aside"
        ),
    }


def _run_intake(
    *,
    repo: Repo,
    run: RunRecord,
    provider: IntakeProvider,
    source: str,
    text: str,
    shift_id: uuid.UUID,
) -> dict[str, object]:
    """One graph turn: start it, or answer the pending question, per shift."""
    graph = build_graph(provider.extract, provider.phrase, RepoGeo(repo, run), _INTAKE_CHECKPOINTER)
    try:
        result = graph.invoke(
            {"run_id": str(run.id), "source": source, "text": text},
            {"configurable": {"thread_id": str(shift_id)}},
        )
    except OmniRouteError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    return _intake_answer(result)


@app.post("/shifts/{shift_id}/intake")
def intake_text(
    shift_id: uuid.UUID,
    body: IntakeText,
    principal: AuthPrincipal = Depends(get_current_principal),
    repo: Repo = Depends(get_repo),
    provider: IntakeProvider = Depends(get_intake_provider),
):
    """Starts the intake graph (thread_id = shift_id).

    Returns either the briefing or the first interrupt question; the question
    is answered over the voice socket (the resume wiring is ADR-013's next
    slice). The run must be the caller's own (404 discipline), and the model
    calls run through the gateway when configured, the deterministic fake
    otherwise. A provider that cannot answer is a 502, never a silent empty
    manifest.
    """
    run = repo.get_run_for_shift(shift_id)
    if run is None or run.courier_id != principal.user_id:
        raise HTTPException(status_code=404, detail="no run for this shift")
    return _run_intake(
        repo=repo,
        run=run,
        provider=provider,
        source=body.source,
        text=body.text,
        shift_id=shift_id,
    )


@app.post("/shifts/{shift_id}/intake/manifest")
async def intake_manifest(
    shift_id: uuid.UUID,
    image: UploadFile,
    principal: AuthPrincipal = Depends(get_current_principal),
    repo: Repo = Depends(get_repo),
    provider: IntakeProvider = Depends(get_intake_provider),
):
    """Photo of paper manifest -> OCR -> the same intake graph, source='ocr'.

    The same cap and magic sniff as the POD upload: the declared name and
    type are never trusted. Without a configured gateway the OCR provider is
    unavailable and the endpoint says so (503) - it never invents a manifest.
    """
    run = repo.get_run_for_shift(shift_id)
    if run is None or run.courier_id != principal.user_id:
        raise HTTPException(status_code=404, detail="no run for this shift")
    content = image.file.read(POD_MAX_BYTES + 1)
    if len(content) > POD_MAX_BYTES:
        raise HTTPException(status_code=413, detail="the image is over the 10 MiB cap")
    if sniff_image_kind(content) is None:
        raise HTTPException(status_code=415, detail="the upload is not a JPEG, PNG or HEIC image")
    try:
        text = provider.ocr(content)
    except ProviderUnavailableError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except OmniRouteError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    return _run_intake(
        repo=repo,
        run=run,
        provider=provider,
        source="ocr",
        text=text,
        shift_id=shift_id,
    )


@app.get("/shifts/{shift_id}/stops")
def list_stops(
    shift_id: uuid.UUID,
    status: Literal["pending", "delivered", "skipped", "deferred", "failed"] | None = None,
    principal: AuthPrincipal = Depends(get_current_principal),
    repo: Repo = Depends(get_repo),
):
    """The shift's stops with their live statuses (ADR-010 §2).

    The status vocabulary is the contract's (`pending`/`delivered`/`skipped`/
    `deferred`/`failed`); an unknown filter value is refused by the type
    itself, never silently treated as "all".
    """
    run = repo.get_run_for_shift(shift_id)
    if run is None or run.courier_id != principal.user_id:
        raise HTTPException(status_code=404, detail="no run for this shift")
    rows = repo.get_run_stops(run.id)
    return [
        {
            "id": str(row.id),
            "address": row.address,
            "seq": seq,
            "status": row.status,
            "lat": row.lat,
            "lon": row.lon,
            "priority": row.priority,
            "parcels": row.parcels,
            "service_time_s": row.service_time_s,
            "window_start": row.window_start.isoformat() if row.window_start else None,
            "window_end": row.window_end.isoformat() if row.window_end else None,
        }
        for seq, row in enumerate(rows, start=1)
        if status is None or row.status == status
    ]


@app.post("/shifts/{shift_id}/events:batch")
def sync_events(
    shift_id: uuid.UUID,
    events: list[DeliveryEvent],
    principal: AuthPrincipal = Depends(get_current_principal),
    repo: Repo = Depends(get_repo),
):
    """Offline-first sync: INSERT ... ON CONFLICT (id) DO NOTHING; returns server cursor.

    The shift has to be the caller's own run (ASVS V4): events decide stop
    statuses, so an unowned shift id must be 404, never writable. The batch
    is bounded (500, the reopt's cap too), and every event's stop must belong
    to the run's stops - an event for an invented stop would sit in the log
    forever, never flipping a status, inflating the cursor.
    """
    run = repo.get_run_for_shift(shift_id)
    if run is None or run.courier_id != principal.user_id:
        raise HTTPException(status_code=404, detail="no run for this shift")
    if len(events) > 500:
        raise HTTPException(status_code=422, detail="the batch is over the 500-event cap")
    known = {row.id for row in repo.get_run_stops(run.id)}
    unknown = [event.stop_id for event in events if event.stop_id not in known]
    if unknown:
        raise HTTPException(status_code=422, detail=f"stop {unknown[0]} is not in this run")
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
async def voice(
    ws: WebSocket,
    shift_id: uuid.UUID,
    principal: AuthPrincipal = Depends(get_websocket_principal),
    repo: Repo = Depends(get_repo),
):
    """Bidirectional voice channel.
    client -> server: {"type":"transcript","text":..., "final":true, "gps":{lat,lon,acc,speed}}
                      (STT runs on-device or via Deepgram streaming; we only receive finals)
                      {"type":"gps", ...}  (1 Hz; drives 50 m approach whispers)
    server -> client: {"type":"say","text":..., "priority":"now|queue"}  (client TTS / Cartesia)
                      {"type":"state","stop":...}
    """
    run = repo.get_run_for_shift(shift_id)
    if run is None or run.courier_id != principal.user_id:
        # The token is valid but the shift is not the caller's: the voice
        # channel carries the day's addresses, so a foreign shift is closed
        # without a word (ASVS V4 - the same 404 discipline as the routes).
        # Accepted first: uvicorn only delivers a close CODE to an accepted
        # socket; rejecting the handshake discards the code.
        await ws.accept()
        await ws.close(code=4404)
        return
    await ws.accept()
    try:
        while True:
            try:
                msg = await ws.receive_json()
            except (ValueError, KeyError, TypeError):
                # A frame that is not JSON - or a binary frame (receive_json
                # raises KeyError on it): answer and continue. A voice
                # channel gets noise, and one bad frame must not kill it.
                await ws.send_json({"type": "say", "text": "Say that again.", "priority": "now"})
                continue
            kind = msg.get("type") if isinstance(msg, dict) else None
            if kind == "gps":
                # repo.approaching(shift_id, lat, lon, 50) -> ST_DWithin(entry_point, pos, 50)
                continue
            if kind == "transcript" and msg.get("final"):
                text = msg.get("text")
                if not isinstance(text, str) or not text.strip():
                    await ws.send_json(
                        {"type": "say", "text": "Say that again.", "priority": "now"}
                    )
                    continue
                text = text[:2000]
                state: dict[
                    str, Any
                ] = {}  # repo.copilot_state(shift_id) | {"speed_kmh": msg["gps"]["speed"]}
                try:
                    intent = copilot.interpret(text, state)
                except Exception:  # any LLM failure falls back, never a dead socket
                    intent = copilot.fallback_intent(text)
                # repo.apply(shift_id, intent) -> delivery_event / stop mutation
                if intent.speech:
                    await ws.send_json({"type": "say", "text": intent.speech, "priority": "now"})
                continue
            # An unknown frame type is noise: answer and stay open - the
            # channel never leaves the courier (or a test) hanging.
            await ws.send_json({"type": "say", "text": "Say that again.", "priority": "now"})
    except WebSocketDisconnect:
        return
