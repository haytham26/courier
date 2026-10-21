"""The test environment of Courier Voice.

The service refuses to start without a JWKS endpoint, so the tests provide a
placeholder and replace the verifier with a fake principal.
"""

from __future__ import annotations

import os

os.environ.setdefault("AUTH_JWKS_URL", "http://127.0.0.1:9/jwks")
os.environ.setdefault("AUTH_JWT_ISSUER", "http://localhost:3001")
os.environ.setdefault("AUTH_JWT_AUDIENCE", "courier-api")

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.auth import Principal, get_principal
from app.engine import EngineUnavailableError
from app.engines import EngineRouter, SherpaOnnxEngine
from app.main import create_app
from app.memory import InMemoryStore
from app.models import (
    EngineInfo,
    ReasoningReply,
    ReasoningRequest,
    Speech,
    Stop,
    Transcript,
)
from app.run_client import RunClient

DRIVER = "driver-1"


class FakeEngine:
    """An engine that answers what the test tells it to."""

    name = "fake"

    def __init__(self, speech: str = "Right.", fail: bool = False) -> None:
        self.speech = speech
        self.fail = fail
        self.requests: list[ReasoningRequest] = []

    def capabilities(self) -> EngineInfo:
        return EngineInfo(
            name=self.name,
            online=not self.fail,
            stt=True,
            tts=True,
            chat=not self.fail,
            reason="the fake engine of the tests",
            licence="MIT",
        )

    def transcribe(self, audio: bytes, *, language: str, sample_rate: int) -> Transcript:
        return Transcript(text="delivered", language=language)

    def synthesise(self, text: str, *, voice: str, speed: float) -> Speech:
        return Speech(text=text, voice=voice, speed=speed)

    def reason(self, request: ReasoningRequest) -> ReasoningReply:
        self.requests.append(request)
        if self.fail:
            raise EngineUnavailableError("the fake engine is down")
        return ReasoningReply(speech=self.speech, source="server", engine=self.name)


class FakeRunClient(RunClient):
    """A run client that never leaves the process."""

    def __init__(self, rows: list[dict[str, object]] | None = None) -> None:
        super().__init__("http://127.0.0.1:9")
        self.rows = rows or []

    def stops(self, shift_id: str, token: str) -> list[Stop]:
        """The stops of the shift, without a network."""
        return [stop for stop in (self._stop_of(row) for row in self.rows) if stop is not None]


@pytest.fixture
def principal() -> Principal:
    """The courier behind the request."""
    return Principal(user_id=DRIVER, claims={"sub": DRIVER}, token="test-token")


@pytest.fixture
def store() -> InMemoryStore:
    """The memory of the shifts."""
    return InMemoryStore()


@pytest.fixture
def server_engine() -> FakeEngine:
    """The server brain of the tests."""
    return FakeEngine(speech="Eight stops left.")


@pytest.fixture
def client_app(
    store: InMemoryStore,
    server_engine: FakeEngine,
    principal: Principal,
) -> FastAPI:
    """The service, with the engines and the principal of the tests."""
    service = create_app(
        router=EngineRouter(on_device=SherpaOnnxEngine(), server=server_engine),
        store=store,
        run_client=FakeRunClient(),
    )
    service.dependency_overrides[get_principal] = lambda: principal
    return service


@pytest.fixture
async def client(client_app: FastAPI):
    """A client that talks to the service in process."""
    transport = ASGITransport(app=client_app)
    async with AsyncClient(transport=transport, base_url="http://courier-voice") as http:
        yield http
