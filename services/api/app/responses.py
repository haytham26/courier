"""The API's response shapes, as models (B3's `response_model` half, BUG-059).

Before this module every handler answered `dict[str, Any]`, so the OpenAPI the
app's typed client is generated from said `{"type": "object"}` for every
operation: unconstrained, so any key rename in an answer shipped green. The
contract (`packages/contracts/openapi.yaml`) already declares the shape of every
answer; these models are that declaration in code, and `response_model=` is what
puts it in the generated document.

Two rules this module keeps:

1. **The model is what the handler returns, nothing more and nothing less.**
   FastAPI serialises through the model, so a field the handler stops filling is
   a validation error at runtime rather than a silently dropped key on the phone.
2. **Nothing is invented.** Every field below is one the handler already filled
   when the answer was a bare dict (the `_*_body` helpers are the proof), and
   every name is the contract's.

The date-times are `datetime`, not `str`: the helpers built them with
`.isoformat()` by hand, and Pydantic serialises an aware datetime to the same
ISO-8601 text the contract's `format: date-time` asks for.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field

StopStatus = Literal["pending", "delivered", "skipped", "deferred", "failed"]
NoteKind = Literal["entry", "gate_code", "hazard", "safe_place", "access"]
PlanName = Literal["trial", "solo", "team"]


class DepotResponse(BaseModel):
    """The depot as numbers (the contract's `RunResponse.depot`)."""

    lat: float
    lon: float


class RunResponse(BaseModel):
    """The run as the phone sees it (`_run_body`)."""

    id: uuid.UUID
    shift_id: uuid.UUID
    name: str
    depot: DepotResponse
    capacity_parcels: int | None
    speed_kmh: float
    start_at: datetime


class DemoStopResponse(BaseModel):
    """One stop of the seeded demo day (`demo_day_body`)."""

    id: uuid.UUID
    address: str
    lat: float
    lon: float
    priority: bool
    parcels: int


class DemoRunResponse(BaseModel):
    """The seeded day, in the seeded order (`demo_day_body`)."""

    run_id: uuid.UUID
    shift_id: uuid.UUID
    stops: list[DemoStopResponse]


class RouteStopResponse(BaseModel):
    """One stop of a plan, in its place in the day (`_route_body`)."""

    stop_id: uuid.UUID
    sequence: int
    lat: float
    lon: float
    arrival_at: datetime
    departure_at: datetime
    distance_m: float
    cumulative_distance_m: float
    late: bool


class RouteResponse(BaseModel):
    """The day's route (`_route_body`): the order, the times, the load."""

    shift_id: uuid.UUID
    run_id: uuid.UUID
    engine: str
    locked: bool
    template_id: str | None
    total_distance_m: float
    total_duration_s: float
    parcels: int
    capacity_parcels: int | None
    over_capacity: bool
    window_violations: int
    unroutable_stop_ids: list[uuid.UUID]
    stops: list[RouteStopResponse]


class ReoptResponse(RouteResponse):
    """The reopt'd day, with what the change did to the finish time.

    The contract's `ReoptResponse` names `run_id`, `engine`, `stops` and
    `finish_delta_s`; the route body already carries the first three, so this is
    the route plus the delta rather than a second, thinner shape.
    """

    finish_delta_s: float


class TemplateResponse(BaseModel):
    """What the Master Template Lock accepted (`PUT /runs/{id}/template`)."""

    run_id: uuid.UUID
    template_id: str
    segments: int
    stops: int


class PodResponse(BaseModel):
    """The at-the-door photo's record (`POST .../pod`)."""

    event_id: uuid.UUID
    stop_id: uuid.UUID
    sha256: str
    bytes: int
    stored_at: datetime
    already_stored: bool


class PodUrlResponse(BaseModel):
    """The short-lived URL the phone fetches the photo from."""

    event_id: uuid.UUID
    url: str
    expires_at: datetime


class StopResponse(BaseModel):
    """The stop as `listStops` answers it (ADR-010 §2, ADR-012 §1)."""

    id: uuid.UUID
    location_id: uuid.UUID
    address: str | None
    seq: int
    status: StopStatus
    lat: float | None
    lon: float | None
    priority: bool
    parcels: int
    service_time_s: int | None
    window_start: datetime | None
    window_end: datetime | None


class LocationNoteResponse(BaseModel):
    """One learned note for a door (`_location_note_body`, ADR-012 §2)."""

    id: uuid.UUID
    kind: NoteKind
    body: str
    confidence: float
    last_confirmed: datetime


class EntitlementResponse(BaseModel):
    """What the caller's subscription covers (`GET /account/entitlements`)."""

    active: bool
    plan: PlanName | None
    features: list[str]


class BriefingResponse(BaseModel):
    """The intake's answer when the graph finished (`_intake_answer`)."""

    briefing: str
    stops_count: int
    set_aside_count: int


class InterruptQuestionResponse(BaseModel):
    """The intake's answer when the graph asks (`_intake_answer`)."""

    speak: str
    index: int


IntakeAnswerResponse = Annotated[
    BriefingResponse | InterruptQuestionResponse,
    Field(discriminator=None),
]
"""One graph turn answers one of two shapes, and the graph decides which.

A union, not a model with optional fields: the phone branches on which shape
arrived, and a model that allowed both shapes' fields at once would let a
`briefing` arrive without its counts.

The OpenAPI contract declares both (`BriefingResponse`, `InterruptQuestion`)
for the same operation, which is what `oneOf` is for."""


class SyncResponse(BaseModel):
    """The batch's outcome: what was stored, where to resume, what was refused."""

    accepted: int
    cursor: int
    conflicts: list[uuid.UUID]


class WebhookAcceptedResponse(BaseModel):
    """A billing webhook the server took (`accepted` is always true on 200)."""

    accepted: bool


class HealthResponse(BaseModel):
    """The uptime probe's answer: data-free by construction (RUNBOOK §9)."""

    status: Literal["ok"]
    version: str
    engines: list[str]


class AuthMeResponse(BaseModel):
    """The identity behind a presented access token (`GET /auth/me`).

    The API never issues credentials (that is the Better Auth service); this is
    the identity the verified token carries, which is why the ids are strings
    rather than uuids - they are the auth service's own ids, not this API's.
    """

    user_id: str
    session_id: str | None
    organization_id: str | None
    team_id: str | None


class TokenInvalidResponse(BaseModel):
    """An absent or invalid token: nothing about the caller is disclosed."""

    valid: Literal[False]


class TokenValidResponse(BaseModel):
    """A verified token, and the identity it carries."""

    valid: Literal[True]
    user_id: str


AuthVerifyResponse = Annotated[
    TokenInvalidResponse | TokenValidResponse,
    Field(discriminator="valid"),
]
"""The union `GET /auth/verify` answers (`GET /auth/verify`).

Two shapes discriminated on `valid`, not one model with a nullable `user_id`:
a nullable field would answer `"user_id": null` on the invalid path, which is a
key the old answer never sent, and an invalid token should disclose nothing.
"""
