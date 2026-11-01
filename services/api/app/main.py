"""FastAPI surface. Persistence is behind `repo` (PostGIS, see packages/contracts/db/schema.sql)."""

from __future__ import annotations

import asyncio
import logging
import os
import uuid
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime, timedelta
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
from .agents.copilot import COPILOT_MAX_RETRIES, COPILOT_TIMEOUT_SECONDS
from .agents.intake_geo import RepoGeo
from .agents.intake_graph import build_graph
from .agents.omniroute import (
    IntakeProvider,
    OmniRouteError,
    ProviderUnavailableError,
    get_intake_provider,
)
from .auth.jwks import (
    AuthPrincipal,
    get_auth_settings,
    get_current_principal,
    get_websocket_verifier,
)
from .auth.routes import router as auth_router
from .auth.websocket import UnauthenticatedError, identify, refuse
from .billing import WEBHOOK_MAX_BYTES, billing_sources
from .demo import DemoDayConflictError, demo_day_body, seed_enabled, write_demo_day
from .entitlements import entitlement_of
from .locations import location_id_for_stop
from .pod import (
    POD_MAX_BYTES,
    pod_settings,
    sniff_image_kind,
    validate_pod_settings,
)
from .pod_store import LocalPodStore, pod_store
from .providers import VERIFIERS, apply_facts, webhook_secret_for
from .repo import DeliveryEventRow, LocationNoteRow, Repo, RouteStopRow, RunRecord, get_repo
from .responses import (
    DemoRunResponse,
    EntitlementResponse,
    HealthResponse,
    IntakeAnswerResponse,
    LocationNoteResponse,
    PodResponse,
    PodUrlResponse,
    ReoptResponse,
    RouteResponse,
    RunResponse,
    StopResponse,
    SyncResponse,
    TemplateResponse,
    WebhookAcceptedResponse,
)
from .routing import (
    MAX_ROUTE_STOPS,
    RoutePlan,
    RouteRequest,
    RouteStop,
    RouteTooLargeError,
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
# And when the POD store is misconfigured: a missing signing key or bucket
# must stop the boot, not the first photo of the day.
validate_pod_settings()

# The version the smoke test proves (A5's done-when: "the API is the version that
# was just deployed"). The compose file already passes APP_VERSION to the
# container; the app ignored it and answered a hard-coded 0.1.0, so the smoke
# test's version check could never see the swap and a stale replica behind the
# edge looked identical to the new one.
app = FastAPI(title="Courier Copilot", version=os.environ.get("APP_VERSION", "0.1.0"))

# The unhandled-error trail the PLAYBOOK triage reads (RUNBOOK section 10).
logger = logging.getLogger("courier_api")

# The budget around one copilot turn (BUG-116): longer than the client's own
# timeout and its retries, so the budget is the last word rather than the
# first. A stalled gateway answers the fallback instead of parking the socket.
COPILOT_BUDGET_SECONDS = COPILOT_TIMEOUT_SECONDS * (COPILOT_MAX_RETRIES + 1) + 15.0

# Include auth routes
app.include_router(auth_router)


@app.exception_handler(RouteTooLargeError)
async def the_day_is_too_big(
    request: Request, error: RouteTooLargeError
) -> JSONResponse:
    """A day over the route cap is a 422 the caller can act on (BUG-117).

    The refusal is the API's boundary rather than the solver's: without it a
    2,000-stop shift allocates 61.2 MiB and spends seconds of matrix fill per
    worker before anything is optimized.
    """
    return JSONResponse(
        status_code=422,
        content={"detail": str(error), "max_route_stops": MAX_ROUTE_STOPS},
    )


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

    @field_validator("text")
    @classmethod
    def _non_blank(cls, value: str) -> str:
        """A blank dictation teaches nothing; the graph would brief 0 stops."""
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("text must not be blank")
        return cleaned


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
        now = datetime.now(UTC)
        if value > now + timedelta(hours=1):
            raise ValueError(
                "occurred_at is more than an hour in the future: the phone's clock is wrong"
            )
        if value < now - timedelta(days=7):
            raise ValueError(
                "occurred_at is more than 7 days old: the log is stale or the clock is wrong"
            )
        return value

    @field_validator("kind")
    @classmethod
    def _known_kind(cls, value: str) -> str:
        """The vocabulary the status derivation (and the phone) understand."""
        allowed = {"delivered", "skipped", "deferred", "failed", "pod_captured"}
        if value not in allowed:
            raise ValueError(f"unknown event kind: {value}")
        return value


class CreateLocationNote(BaseModel):
    """One learned note for a door (ADR-012 §2)."""

    kind: Literal["entry", "gate_code", "hazard", "safe_place", "access"]
    body: str = Field(min_length=1, max_length=500)
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)

    @field_validator("body")
    @classmethod
    def _non_blank(cls, value: str) -> str:
        """A note of spaces teaches nothing; the body is the memory."""
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("body must not be blank")
        return cleaned


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


@app.get("/healthz", response_model=HealthResponse)
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


class DemoSeedRequest(BaseModel):
    """The one reason this caller wants a demo day for."""

    reason: Literal["e2e", "demo", "dev"] = "e2e"


@app.post("/demo/runs", response_model=DemoRunResponse)
def seed_demo_run(
    body: DemoSeedRequest,
    principal: AuthPrincipal = Depends(get_current_principal),
    repo: Repo = Depends(get_repo),
):
    """Seed the caller's demo day: a run and its stops, in the real tables.

    The app's core flow needs a run with stops that exist, and it needs the ids
    to stay still between calls, so an E2E job can reset the phone and run the
    flow again. This is the seam for that (ADR-019): the ids are derived from the
    caller, so a caller always gets their own day back.

    The gate is the environment, not a hope: without DEMO_SEED_ENABLED=true this
    route is 404, because seeding demo rows into a real database is not something
    an unguarded endpoint should ever do.

    A caller racing themself on the same reason is answered with the same 409
    `POST /runs` answers, not a 500: the seed writes a run like any other.
    """
    if not seed_enabled():
        raise HTTPException(status_code=404, detail="this deployment does not seed demo data")
    try:
        day = write_demo_day(repo, principal.user_id, body.reason)
    except DemoDayConflictError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    return demo_day_body(day)


@app.post("/runs", status_code=201, response_model=RunResponse)
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


@app.get("/runs", response_model=list[RunResponse])
def list_runs(
    principal: AuthPrincipal = Depends(get_current_principal),
    repo: Repo = Depends(get_repo),
):
    """The courier's own runs, newest first (bounded at 500, ASVS V13)."""
    return [_run_body(run) for run in repo.list_runs(principal.user_id)]


@app.get("/runs/{run_id}", response_model=RunResponse)
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


@app.post(
    "/runs/{run_id}/stops/{stop_id}/pod",
    status_code=201,
    response_model=PodResponse,
)
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

    store = pod_store(pod_settings())
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

    if replayed and store.exists(run.id, resolved_id):
        stored_bytes, digest = store.fingerprint(run.id, resolved_id)
    else:
        # Not a replay: the upload is the record, and bytes that sit there
        # without their own event row (a crash orphan, or a planted file)
        # are overwritten by the genuine upload.
        digest = store.save(run.id, resolved_id, content)
        stored_bytes = len(content)

    outcome = repo.append_events(
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
    # The answer is the model, so a key rename is a construction error here
    # rather than a silently different answer on the phone (B3's response_model
    # slice). The status rides on the JSONResponse rather than an injected
    # `Response` because this route already carries six parameters and
    # `PLR0917` (too many positional arguments) forbids a seventh: the image is
    # a file parameter, which keyword-only cannot carry either.
    return JSONResponse(
        status_code=200 if replayed else 201,
        content=PodResponse(
            event_id=resolved_id,
            stop_id=paths.stop_id,
            sha256=digest,
            bytes=stored_bytes,
            stored_at=datetime.now(UTC),
            already_stored=replayed or outcome.stored == 0,
        ).model_dump(mode="json"),
    )


@app.get("/runs/{run_id}/pod/{event_id}/bytes")
def pod_bytes(
    run_id: uuid.UUID,
    event_id: uuid.UUID,
    expires: int,
    signature: str,
    repo: Repo = Depends(get_repo),
):
    """The local store's streaming grant (ADR-011 §2).

    The phone's image loader cannot send a bearer header, so the URL itself
    carries the authority: an HMAC over (run, event, expiry), minted only for
    the run's owner by the presign endpoint and dead after 15 minutes. The
    signature is checked in constant time, and the rows are still checked -
    a deleted run or a foreign event serves nothing even with a valid grant.
    """
    store = pod_store(pod_settings())
    if not isinstance(store, LocalPodStore) or not store.verify_stream_grant(
        run_id, event_id, expires, signature
    ):
        raise HTTPException(status_code=404, detail="no photo at this URL")

    run = repo.get_run(run_id)
    event = repo.get_event(event_id)
    if (
        run is None
        or event is None
        or event.shift_id != run.shift_id
        or event.kind != "pod_captured"
    ):
        raise HTTPException(status_code=404, detail="no photo at this URL")

    try:
        content = store.read_bytes(run_id, event_id)
    except FileNotFoundError:
        # A valid grant for an event whose bytes are gone (a deleted run, a
        # failed upload) is still a 404, never a 500.
        raise HTTPException(status_code=404, detail="no photo at this URL") from None
    kind = sniff_image_kind(content)
    media = {"jpeg": "image/jpeg", "png": "image/png", "heic": "image/heic"}.get(
        kind or "", "application/octet-stream"
    )
    return Response(
        content=content, media_type=media, headers={"Cache-Control": "private, max-age=900"}
    )


@app.get(
    "/runs/{run_id}/stops/{stop_id}/pod/{event_id}/url",
    response_model=PodUrlResponse,
)
def pod_url(
    paths: Annotated[StopPaths, Depends()],
    event_id: uuid.UUID,
    principal: AuthPrincipal = Depends(get_current_principal),
    repo: Repo = Depends(get_repo),
):
    """A short-lived URL the phone fetches the photo from (ADR-011 §2).

    The same 404 discipline as every route: the run is the caller's, the
    stop is in the run, the event belongs to the stop - a foreign anything
    is 404, never a URL. The URL dies (15 minutes on the local store; the
    S3 store's presigned GET carries its own expiry).
    """
    run = repo.get_run(paths.run_id)
    if run is None or run.courier_id != principal.user_id:
        raise HTTPException(status_code=404, detail="no run with this id")
    if paths.stop_id not in {row.id for row in repo.get_run_stops(run.id)}:
        raise HTTPException(status_code=404, detail="no stop with this id in this run")
    event = repo.get_event(event_id)
    if (
        event is None
        or event.shift_id != run.shift_id
        or event.stop_id != paths.stop_id
        or event.kind != "pod_captured"
    ):
        raise HTTPException(status_code=404, detail="no event with this id for this stop")

    url, expires_at = pod_store(pod_settings()).presign_url(paths.run_id, event_id)
    return {"url": url, "expires_at": expires_at.isoformat(), "event_id": str(event_id)}


@app.post("/runs/{run_id}/route:reopt", response_model=ReoptResponse)
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


@app.put("/runs/{run_id}/template", response_model=TemplateResponse)
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


@app.get("/shifts/{shift_id}/route", response_model=RouteResponse)
def shift_route(
    shift_id: uuid.UUID,
    principal: AuthPrincipal = Depends(get_current_principal),
    repo: Repo = Depends(get_repo),
):
    """The day's route: the ordered stops with the arrival times.

    The locked template wins when the run has one; otherwise the route is
    planned from the stops. The answer is the same every time it is asked.
    """
    # BUG-140: the owner is part of the lookup, so the 404 is the store's
    # answer and not only a comparison this line makes afterwards.
    run = repo.get_run_for_shift(shift_id, principal.user_id)
    if run is None:
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


@app.post("/shifts/{shift_id}/intake", response_model=IntakeAnswerResponse)
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
    # BUG-140: the owner is part of the lookup, so the 404 is the store's
    # answer and not only a comparison this line makes afterwards.
    run = repo.get_run_for_shift(shift_id, principal.user_id)
    if run is None:
        raise HTTPException(status_code=404, detail="no run for this shift")
    return _run_intake(
        repo=repo,
        run=run,
        provider=provider,
        source=body.source,
        text=body.text,
        shift_id=shift_id,
    )


@app.post(
    "/shifts/{shift_id}/intake/manifest",
    response_model=IntakeAnswerResponse,
)
def intake_manifest(
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
    # BUG-140: the owner is part of the lookup, so the 404 is the store's
    # answer and not only a comparison this line makes afterwards.
    run = repo.get_run_for_shift(shift_id, principal.user_id)
    if run is None:
        raise HTTPException(status_code=404, detail="no run for this shift")
    content = image.file.read(POD_MAX_BYTES + 1)
    if len(content) > POD_MAX_BYTES:
        raise HTTPException(status_code=413, detail="the image is over the 10 MiB cap")
    kind = sniff_image_kind(content)
    if kind is None:
        raise HTTPException(status_code=415, detail="the upload is not a JPEG, PNG or HEIC image")
    if kind == "heic":
        raise HTTPException(
            status_code=415,
            detail="the OCR provider does not read HEIC yet: share the manifest as JPEG or PNG",
        )
    try:
        text = provider.ocr(content, media_type=f"image/{kind}")
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


@app.post(
    "/billing/webhooks/{source}",
    response_model=WebhookAcceptedResponse,
)
async def billing_webhook(
    source: str,
    request: Request,
    repo: Repo = Depends(get_repo),
):
    """A provider's webhook: verify it, then ingest the fact (ADR-018).

    The signature rules run before the body is parsed, and every refusal after
    that is a 400 with its reason - never a 500 the provider has to retry. The
    body is capped like every other upload: this endpoint is unauthenticated
    (the signature is the auth), so an unbounded read is a free amplifier.
    """
    accepted = billing_sources()
    if source not in accepted or source not in VERIFIERS:
        # An unaccepted source is 404, not 403: it is not this API's endpoint.
        raise HTTPException(status_code=404, detail="this deployment does not accept that source")
    body = await request.body()
    if len(body) > WEBHOOK_MAX_BYTES:
        raise HTTPException(status_code=413, detail="the webhook body is over the cap")
    try:
        facts = VERIFIERS[source].verify(body, dict(request.headers), webhook_secret_for(source))
        apply_facts(repo, facts, accepted=accepted)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    return {"accepted": True}


@app.get("/account/entitlements", response_model=EntitlementResponse)
def get_entitlements(
    principal: AuthPrincipal = Depends(get_current_principal),
    repo: Repo = Depends(get_repo),
):
    """The caller's entitlement: is this subscription active, and what does it open.

    The app gates on "is this subscription active" and never on how it was paid
    (D44), so this is the only place the answer is decided. A courier whose card
    is failing still answers `active` - the grace window is the rule (ADR-017 §1).
    """
    decision = entitlement_of(repo.get_subscription(principal.user_id))
    return {
        "active": decision.active,
        "plan": decision.plan.value if decision.plan else None,
        "features": sorted(decision.features),
    }


@app.get("/shifts/{shift_id}/stops", response_model=list[StopResponse])
def list_stops(
    shift_id: uuid.UUID,
    status: Literal["pending", "delivered", "skipped", "deferred", "failed"] | None = None,
    principal: AuthPrincipal = Depends(get_current_principal),
    repo: Repo = Depends(get_repo),
):
    """The shift's stops with their live statuses (ADR-010 §2).

    The status vocabulary is the contract's (`pending`/`delivered`/`skipped`/
    `deferred`/`failed`); an unknown filter value is refused by the type
    itself, never silently treated as "all". Each stop carries its
    `location_id` (ADR-012 §1), so the phone calls the notes endpoints with
    the id the server honours.
    """
    # BUG-140: the owner is part of the lookup, so the 404 is the store's
    # answer and not only a comparison this line makes afterwards.
    run = repo.get_run_for_shift(shift_id, principal.user_id)
    if run is None:
        raise HTTPException(status_code=404, detail="no run for this shift")
    rows = repo.get_run_stops(run.id)
    return [
        {
            "id": str(row.id),
            "address": row.address,
            "location_id": str(
                row.location_id or location_id_for_stop(row.id, row.address, row.suburb)
            ),
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


def _location_note_body(note: LocationNoteRow) -> LocationNoteResponse:
    """The note as the contract's LocationNote (ADR-012 §2).

    The model, not a dict: the response the list and the POST return is this
    shape, and building it in one place is what keeps a key rename from
    reaching one answer and not the other (B3's response_model slice).

    `model_validate` rather than the constructor because the row's `kind` is a
    `str` (the database's column is text, and the repository widens the row to
    say so): the contract's vocabulary is the model's, so a value outside it is
    rejected here at runtime instead of silently reaching the phone.
    """
    return LocationNoteResponse.model_validate(
        {
            "id": note.id,
            "kind": note.kind,
            "body": note.body,
            "confidence": note.confidence,
            "last_confirmed": note.last_confirmed,
        }
    )


@app.get("/locations/{location_id}/notes", response_model=list[LocationNoteResponse])
def get_location_notes(
    location_id: uuid.UUID,
    principal: AuthPrincipal = Depends(get_current_principal),
    repo: Repo = Depends(get_repo),
):
    """The caller's door memory for the location (ADR-012).

    The gate sits on `courier_location_key`: a location the caller has never
    had a stop at is 404, never an empty list - existence is not disclosed
    cross-courier, and the notes themselves are keyed by (courier, location,
    kind), so two couriers at one door keep two private memories.
    """
    if repo.courier_location_key(principal.user_id, location_id) is None:
        raise HTTPException(status_code=404, detail="no location with this id")
    return [
        _location_note_body(note)
        for note in repo.get_location_notes(principal.user_id, location_id)
    ]


@app.post("/locations/{location_id}/notes", response_model=LocationNoteResponse)
def add_location_note(
    location_id: uuid.UUID,
    body: CreateLocationNote,
    response: Response,
    principal: AuthPrincipal = Depends(get_current_principal),
    repo: Repo = Depends(get_repo),
):
    """Upsert one note by kind: 201 when new, 200 when corrected (ADR-012 §2).

    One gate code per door, not five: the unique key is (courier, location,
    kind) and the repository's ON CONFLICT DO NOTHING makes the race
    impossible. The response carries the stored row, so a correction returns
    the row's original id.
    """
    address_key = repo.courier_location_key(principal.user_id, location_id)
    if address_key is None:
        raise HTTPException(status_code=404, detail="no location with this id")
    created = repo.put_location_note(
        LocationNoteRow(
            id=uuid.uuid4(),
            courier_id=principal.user_id,
            location_id=location_id,
            address_key=address_key,
            kind=body.kind,
            body=body.body,
            confidence=body.confidence,
            last_confirmed=datetime.now(UTC),
        )
    )
    stored = next(
        note
        for note in repo.get_location_notes(principal.user_id, location_id)
        if note.kind == body.kind
    )
    # The same rule as the POD upload: the model answers, the status rides on
    # the injected Response, so the shape the contract declares is the shape the
    # server validates (B3's response_model slice).
    response.status_code = 201 if created else 200
    return _location_note_body(stored)


@app.post("/shifts/{shift_id}/events:batch", response_model=SyncResponse)
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

    The cursor is the count of the shift's sync events (the kinds this route
    writes), read in the batch's own transaction: the POD route's rows do not
    advance it (BUG-141), and the answer is a snapshot of this batch's effect
    rather than a later connection's read (BUG-142). A whole-batch refusal
    names every offending event with its index, so the caller can tell which
    of its events was the problem (BUG-139).
    """
    # BUG-140: the owner is part of the lookup, so the 404 is the store's
    # answer and not only a comparison this line makes afterwards.
    run = repo.get_run_for_shift(shift_id, principal.user_id)
    if run is None:
        raise HTTPException(status_code=404, detail="no run for this shift")
    if len(events) > 500:
        raise HTTPException(status_code=422, detail="the batch is over the 500-event cap")
    known = {row.id for row in repo.get_run_stops(run.id)}
    unknown = [
        (index, event.stop_id) for index, event in enumerate(events)
        if event.stop_id not in known
    ]
    if unknown:
        # BUG-139: the refusal is whole-batch (ADR-014 section 3), but the
        # caller must be able to tell WHICH of its events was refused, so the
        # detail names every offending stop with its index in the batch.
        named = ", ".join(f"event {index} (stop {stop_id})" for index, stop_id in unknown)
        raise HTTPException(
            status_code=422,
            detail=f"nothing was stored: stops not in this run - {named}",
        )
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
    outcome = repo.append_events(shift_id, rows)
    return {
        "accepted": outcome.stored,
        # BUG-142: the cursor the append answered with is the count its own
        # transaction saw, not a third connection's read of what later landed.
        "cursor": outcome.cursor,
        "conflicts": [str(event_id) for event_id in outcome.conflicts],
    }


@app.websocket("/shifts/{shift_id}/voice")
async def voice(
    ws: WebSocket,
    shift_id: uuid.UUID,
    repo: Repo = Depends(get_repo),
):
    """Bidirectional voice channel.
    The handshake carries no token: the route accepts the socket first (it owns
    the channel, and only an accepted socket can be answered with a close code),
    then `identify` reads the credential from the header or the first message and
    a refusal is one `error` frame and a 4403 (BUG-059).
    client -> server: {"type":"transcript","text":..., "final":true, "gps":{lat,lon,acc,speed}}
                      (STT runs on-device or via Deepgram streaming; we only receive finals)
                      {"type":"gps", ...}  (1 Hz; drives 50 m approach whispers)
    server -> client: {"type":"say","text":..., "priority":"now|queue"}  (client TTS / Cartesia)
                      {"type":"state","stop":...}
    """
    # The route owns the channel, so it accepts the handshake before anything
    # else is read: an `identify` refusal needs an open socket to deliver an
    # `error` frame to (a rejected handshake discards every word and code).
    await ws.accept()
    try:
        # The verifier is resolved through `dependency_overrides` because the
        # voice route cannot take it as a `Depends` parameter: the dependency
        # would be solved before the socket is accepted, and a refusal would
        # then be an HTTP 403 on the handshake instead of an `error` frame and a
        # 4403 close on a socket the caller actually holds.
        verifier = app.dependency_overrides.get(get_websocket_verifier) or get_websocket_verifier
        principal = await identify(ws, verifier())
    except UnauthenticatedError as exc:
        await refuse(ws, exc.reason)
        return
    # BUG-140: the owner is part of the lookup, so the 404 is the store's
    # answer and not only a comparison this line makes afterwards.
    run = repo.get_run_for_shift(shift_id, principal.user_id)
    if run is None:
        # The token is valid but the shift is not the caller's: the voice
        # channel carries the day's addresses, so a foreign shift is closed
        # without a word (ASVS V4 - the same 404 discipline as the routes).
        # Already accepted above, so the close CODE reaches the caller.
        await ws.close(code=4404)
        return
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
                    # BUG-116: the client carries its own timeout now, and the
                    # blocking call is bounded here so a stalled gateway cannot
                    # park the socket forever. The interpret runs in a worker
                    # thread because the socket's loop is async: awaiting it
                    # with a budget is the only way the budget can interrupt.
                    intent = await asyncio.wait_for(
                        asyncio.to_thread(copilot.interpret, text, state),
                        timeout=COPILOT_BUDGET_SECONDS,
                    )
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
