"""FastAPI surface. Persistence is behind `repo` (PostGIS, see db/schema.sql)."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from fastapi import Depends, FastAPI, UploadFile, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from .agents import copilot
from .auth.jwks import AuthPrincipal, get_auth_settings, get_current_principal
from .auth.routes import router as auth_router
from .auth.websocket import get_websocket_principal

# Fail fast when the API cannot verify tokens (no default secrets).
get_auth_settings()

app = FastAPI(title="Courier Copilot", version="0.1.0")

# Include auth routes
app.include_router(auth_router)


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
    street_key: str
    direction: str = "asc"


@app.put("/runs/{run_id}/template")
def put_template(run_id: uuid.UUID, segments: list[TemplateSegment], principal: AuthPrincipal = Depends(get_current_principal)):
    """Master Template Lock: replace the run's street order."""
    return {"run_id": str(run_id), "segments": len(segments)}


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
def sync_events(shift_id: uuid.UUID, events: list[DeliveryEvent], principal: AuthPrincipal = Depends(get_current_principal)):
    """Offline-first sync: INSERT ... ON CONFLICT (id) DO NOTHING; returns server cursor."""
    ...


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
