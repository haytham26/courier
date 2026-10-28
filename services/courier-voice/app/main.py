"""The HTTP surface of Courier Voice.

The app talks to this service over four kinds of call:

  - `POST /v1/sessions` and `GET /v1/sessions/{id}`: the shift;
  - `POST /v1/sessions/{id}/turn`: one turn of the conversation;
  - `POST /v1/sessions/{id}/proactive`: "is there anything to say?";
  - `GET`/`PUT /v1/settings`: the choices the courier made.

Plus the two surfaces that make the engine swappable and the licences
visible, and only to a caller with the courier's own token: `GET /v1/engines` and
`GET /v1/licences`.

Every call is authenticated with the courier's own token (the same tokens the
Courier API accepts), and the run data is fetched with that token, so a
courier only ever hears about their own day.
"""

from __future__ import annotations

import time
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel

from . import licences
from .auth import Principal, get_principal
from .config import VoiceConfig
from .engines import EngineRouter, OmniRouteEngine, SherpaOnnxEngine
from .memory import InMemoryStore, MemoryStore, SessionMemory, apply_settings, new_session
from .models import (
    EngineInfo,
    LicenceEntry,
    Mode,
    ProactiveType,
    ReasoningReply,
    ReasoningRequest,
    RunContext,
    SessionState,
    TurnRequest,
    TurnResponse,
    VoiceSettings,
)
from .offline_brain import parse_command
from .proactive import ProactiveEvent, for_event
from .run_client import RunClient
from .safety import apply_safety, is_moving, real_word_count, word_count
from .turns import TurnMachine


class CreateSession(BaseModel):
    """The body of a new shift."""

    shift_id: str | None = None
    settings: VoiceSettings | None = None
    context: RunContext | None = None


class ProactiveRequest(BaseModel):
    """The body of the proactive check."""

    event: ProactiveEvent = ProactiveEvent.SHIFT_START
    context: RunContext | None = None


class ProactiveResponse(BaseModel):
    """What the voice wants to say first, if anything."""

    kind: ProactiveType | None = None
    text: str = ""
    words: int = 0


class SettingsResponse(BaseModel):
    """The settings of the courier."""

    settings: VoiceSettings


class EngineList(BaseModel):
    """The engines of the swappable seam."""

    engines: list[EngineInfo]


class LicenceList(BaseModel):
    """The licence ledger."""

    entries: list[LicenceEntry]


def create_app(
    *,
    config: VoiceConfig | None = None,
    router: EngineRouter | None = None,
    store: MemoryStore | None = None,
    run_client: RunClient | None = None,
) -> FastAPI:
    """The service, with everything it talks to built in.

    The tests build it with their own engines and their own store; the
    server builds it with the real ones.
    """
    settings = config or VoiceConfig()
    memory_store: MemoryStore = store or InMemoryStore()
    client = run_client or RunClient(
        settings.courier_api_base_url, timeout_seconds=settings.courier_api_timeout_seconds
    )
    brains = router or EngineRouter(
        on_device=SherpaOnnxEngine(),
        server=OmniRouteEngine(settings),
    )
    driver_settings: dict[str, VoiceSettings] = {}

    service = FastAPI(title="Courier Voice", version="0.1.0")
    service.state.memory_store = memory_store
    service.state.run_client = client
    service.state.router = brains
    service.state.driver_settings = driver_settings
    service.state.turns = TurnMachine(
        silence_timeout_s=settings.voice_silence_timeout_seconds,
        parked_silence_timeout_s=settings.voice_parked_silence_timeout_seconds,
        barge_in_min_words=settings.voice_barge_in_min_words,
    )

    def session_of(session_id: str, principal: Principal) -> SessionMemory:
        """The shift of this courier, or a refusal."""
        memory = memory_store.get(session_id)
        if memory is None or memory.driver_id != principal.user_id:
            raise HTTPException(status_code=404, detail="no session with this id")
        return memory

    def settings_of(principal: Principal, chosen: VoiceSettings | None) -> VoiceSettings:
        """The settings of the courier: the ones sent with the turn win."""
        if chosen is not None:
            driver_settings[principal.user_id] = chosen
            return chosen
        return driver_settings.get(principal.user_id, VoiceSettings())

    @service.get("/healthz")
    def healthz() -> dict[str, str]:
        """The service is up."""
        return {"status": "ok", "service": "courier-voice"}

    @service.post("/v1/sessions", response_model=SessionState)
    def create_session(
        body: CreateSession,
        principal: Annotated[Principal, Depends(get_principal)],
    ) -> SessionState:
        """A shift starts."""
        memory = new_session(principal.user_id, body.shift_id)
        if body.settings is not None:
            apply_settings(memory, body.settings)
            driver_settings[principal.user_id] = body.settings
        if body.context is not None:
            memory.context = body.context
        memory_store.save(memory)
        return _state_of(memory)

    @service.get("/v1/sessions/{session_id}", response_model=SessionState)
    def read_session(
        session_id: str,
        principal: Annotated[Principal, Depends(get_principal)],
    ) -> SessionState:
        """What the service remembers about the shift."""
        return _state_of(session_of(session_id, principal))

    @service.delete("/v1/sessions/{session_id}/memory")
    def forget_session(
        session_id: str,
        principal: Annotated[Principal, Depends(get_principal)],
    ) -> dict[str, bool]:
        """The courier makes the service forget the shift."""
        memory = session_of(session_id, principal)
        memory.forget()
        memory_store.delete(session_id)
        return {"forgotten": True}

    @service.post("/v1/sessions/{session_id}/turn", response_model=TurnResponse)
    def turn(
        session_id: str,
        body: TurnRequest,
        principal: Annotated[Principal, Depends(get_principal)],
    ) -> TurnResponse:
        """One turn of the conversation."""
        memory = session_of(session_id, principal)
        return _turn(
            memory,
            body,
            principal,
            brains=brains,
            client=client,
            memory_store=memory_store,
        )

    @service.post("/v1/sessions/{session_id}/proactive", response_model=ProactiveResponse)
    def proactive(
        session_id: str,
        body: ProactiveRequest,
        principal: Annotated[Principal, Depends(get_principal)],
    ) -> ProactiveResponse:
        """What the voice wants to say first, if anything."""
        memory = session_of(session_id, principal)
        context = body.context or memory.context
        chosen = for_event(body.event, context, memory.settings)
        if chosen is None:
            return ProactiveResponse(kind=None, text="", words=0)
        kind, text = chosen
        return ProactiveResponse(kind=kind, text=text, words=word_count(text))

    @service.get("/v1/settings", response_model=SettingsResponse)
    def read_settings(
        principal: Annotated[Principal, Depends(get_principal)],
    ) -> SettingsResponse:
        """The settings of the courier."""
        return SettingsResponse(settings=driver_settings.get(principal.user_id, VoiceSettings()))

    @service.put("/v1/settings", response_model=SettingsResponse)
    def write_settings(
        body: SettingsResponse,
        principal: Annotated[Principal, Depends(get_principal)],
    ) -> SettingsResponse:
        """The courier changes a setting."""
        driver_settings[principal.user_id] = body.settings
        return SettingsResponse(settings=body.settings)

    @service.get("/v1/engines", response_model=EngineList)
    def engines(principal: Annotated[Principal, Depends(get_principal)]) -> EngineList:
        """The engines of the swappable seam and what each of them can do.

        The seam's surface is the service's own, not the internet's (BUG-059):
        the caller is the courier the token names, the same as every other call.
        """
        found = [brains.on_device.capabilities()]
        if brains.server is not None:
            found.append(brains.server.capabilities())
        return EngineList(engines=found)

    @service.get("/v1/licences", response_model=LicenceList)
    def ledger(principal: Annotated[Principal, Depends(get_principal)]) -> LicenceList:
        """The licence ledger, as a shipped surface - to a caller with a token.

        A licence ledger is a shipping artefact, not a status page: it answers
        the deployment's own callers and nobody else (BUG-059).
        """
        return LicenceList(entries=list(licences.ledger()))

    return service


def _state_of(memory: SessionMemory) -> SessionState:
    """The session as the app sees it."""
    return SessionState(
        id=memory.id,
        driver_id=memory.driver_id,
        shift_id=memory.shift_id,
        created_at=memory.created_at,
        turns=memory.turns,
        last_instruction=memory.last_instruction,
        last_question=memory.last_question,
        engine=memory.settings.voice,
        mode=Mode.AUTO,
        phase="idle",
        settings=memory.settings,
        remembered=memory.settings.remember,
    )


def _turn(
    memory: SessionMemory,
    body: TurnRequest,
    principal: Principal,
    *,
    brains: EngineRouter,
    client: RunClient,
    memory_store: MemoryStore,
) -> TurnResponse:
    """One turn: the trigger, the words, the answer and the safety."""
    started = time.monotonic()
    chosen = body.settings if body.settings is not None else memory.settings
    apply_settings(memory, chosen)
    moving = is_moving(body.speed_kmh)
    machine = memory.turn_machine

    words = word_count(body.transcript)
    said_words = real_word_count(body.transcript)
    deliberate = parse_command(body.transcript) is not None
    barge_in = machine.barge_in(said_words, deliberate=deliberate)

    if machine.phase.value == "speaking" and not barge_in:
        # A noise, a cough, a radio burst: the sentence goes on.
        return TurnResponse(
            speech="",
            engine="on-device",
            barge_in=False,
            ended_turn=False,
            words=0,
            latency_ms=int((time.monotonic() - started) * 1000),
        )

    machine.open(body.trigger, started)
    if words:
        machine.heard(words, started)

    opened_for = body.started_at if body.started_at is not None else started
    if not words:
        silent_for = started - opened_for
        if silent_for >= machine.timeout_for(moving=moving):
            # The courier said nothing: the turn closes on the silence.
            machine.end_speaking()
            memory_store.save(memory)
            return TurnResponse(
                speech="",
                barge_in=barge_in,
                ended_turn=True,
                words=0,
                latency_ms=int((time.monotonic() - started) * 1000),
            )
        # The turn is still open: the courier is still talking.
        return TurnResponse(
            speech="",
            barge_in=barge_in,
            ended_turn=False,
            words=0,
            latency_ms=int((time.monotonic() - started) * 1000),
        )

    context = _context_of(memory, body, principal, client)

    reply = brains.reason(
        ReasoningRequest(
            transcript=body.transcript,
            context=context,
            settings=chosen,
            language=body.language or chosen.language,
            moving=moving,
            last_instruction=memory.last_instruction,
            last_question=memory.last_question,
            learned=body.learned or memory.learned,
        ),
        mode=body.mode,
        online=body.online,
    )

    speech = reply.speech or (reply.notice or "")
    essential = reply.action is not None
    outcome = apply_safety(
        speech,
        moving=moving,
        quiet_mode=chosen.quiet_mode,
        essentials_only=chosen.essentials_only,
        audio_focus=body.audio_focus,
        verbosity=chosen.verbosity,
        essential=essential,
    )

    machine.begin_speaking(outcome.speech)
    memory.turns += 1
    memory.context = context
    if reply.speech:
        memory.last_instruction = reply.speech
    if reply.question:
        memory.last_question = reply.question
    memory_store.save(memory)

    return TurnResponse(
        speech=outcome.speech,
        action=reply.action,
        engine=reply.engine or "on-device",
        source=reply.source,
        mode=body.mode,
        barge_in=barge_in,
        ended_turn=True,
        priority=outcome.priority,
        notice=reply.notice if outcome.speech else None,
        words=word_count(outcome.speech),
        latency_ms=int((time.monotonic() - started) * 1000),
    )


def _question_of(reply: ReasoningReply) -> str | None:
    """The question the last answer was about, for the corrections."""
    return reply.question


def _context_of(
    memory: SessionMemory,
    body: TurnRequest,
    principal: Principal,
    client: RunClient,
) -> RunContext:
    """The run of the shift: the API first, the phone second."""
    context = body.context or memory.context
    if memory.shift_id:
        return client.context(memory.shift_id, principal.token, fallback=context)
    return context


app = create_app()
