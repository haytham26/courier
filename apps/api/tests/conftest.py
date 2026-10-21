"""Test environment for the Courier Copilot API.

The API refuses to start without a JWKS endpoint, so the tests provide a
placeholder URL (the verifier is replaced with a mock transport per test).

The application modules are imported inside the fixtures: the environment has
to be in place before `app.main` is imported.
"""

from __future__ import annotations

import base64
import os
from collections.abc import Callable, Iterator, Sequence
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Any

import httpx
import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient

if TYPE_CHECKING:
    from app.auth.jwks import JwksVerifier
    from app.repo import InMemoryRepo, SqlRepo

ISSUER = "http://localhost:3001"
AUDIENCE = "courier-api"
JWKS_URL = "https://auth.test/api/auth/jwks"

os.environ.setdefault("AUTH_JWKS_URL", "http://127.0.0.1:9/api/auth/jwks")
os.environ.setdefault("AUTH_JWT_AUDIENCE", AUDIENCE)
os.environ.setdefault("AUTH_JWT_ISSUER", ISSUER)


def _b64(value: int) -> str:
    return base64.urlsafe_b64encode(value.to_bytes(32, "big")).rstrip(b"=").decode()


@pytest.fixture()
def key_pair() -> tuple[Any, dict[str, Any]]:
    """A fresh ES256 key pair and the public JWK the verifier reads."""
    private_key = ec.generate_private_key(ec.SECP256R1())
    numbers = private_key.public_key().public_numbers()
    jwk = {
        "kty": "EC",
        "crv": "P-256",
        "x": _b64(numbers.x),
        "y": _b64(numbers.y),
        "kid": "test-key",
        "alg": "ES256",
        "use": "sig",
    }
    return private_key, jwk


@pytest.fixture()
def verifier(key_pair: tuple[Any, dict[str, Any]]) -> JwksVerifier:
    """A verifier that trusts the test key (no network, no JWKS server)."""
    from app.auth.jwks import AuthSettings, JwksVerifier

    _, jwk = key_pair

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"keys": [jwk]})

    client = httpx.Client(transport=httpx.MockTransport(handler))
    settings = AuthSettings(
        auth_jwks_url=JWKS_URL,
        auth_jwt_audience=AUDIENCE,
        auth_jwt_issuer=ISSUER,
    )
    return JwksVerifier(settings, client=client)


@pytest.fixture()
def sign(key_pair: tuple[Any, dict[str, Any]]) -> Callable[..., str]:
    """Signs a token for a courier: the `sub` of the token is the courier id."""
    private_key, _ = key_pair

    def sign_token(subject: str, **extra: Any) -> str:
        now = datetime.now(UTC)
        claims: dict[str, Any] = {
            "sub": subject,
            "aud": AUDIENCE,
            "iss": ISSUER,
            "iat": now,
            "exp": now + timedelta(minutes=15),
        }
        claims.update(extra)
        return jwt.encode(claims, private_key, algorithm="ES256", headers={"kid": "test-key"})

    return sign_token


@pytest.fixture()
def client(verifier: JwksVerifier) -> Iterator[TestClient]:
    """A client that trusts the test key."""
    from app.auth.jwks import get_verifier
    from app.main import app

    app.dependency_overrides[get_verifier] = lambda: verifier
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def repo() -> InMemoryRepo:
    """The in-memory repository behind the routes (no database, no network)."""
    from app.repo import InMemoryRepo

    return InMemoryRepo()


@pytest.fixture()
def api_client(client: TestClient, repo: InMemoryRepo) -> TestClient:
    """The client with the in-memory repository behind the routes."""
    from app.main import app
    from app.repo import get_repo

    app.dependency_overrides[get_repo] = lambda: repo
    return client


class FakeDatabase:
    """A stand-in for PostgreSQL: it answers the queries the repository asks.

    The SQL implementation is exercised without a database: the fake records
    every statement and hands back the rows the test prepared.
    """

    def __init__(self) -> None:
        self.queries: list[tuple[str, list[object]]] = []
        self.stops: list[list[object]] = []
        self.shifts: list[list[object]] = []
        self.events: list[list[object]] = []
        self.memories: list[list[object]] = []
        self.now = datetime(2026, 10, 21, 8, 0, tzinfo=UTC)

    def run(self, query: str, params: Sequence[object]) -> list[Sequence[object]]:
        """Answers one statement the way PostgreSQL would."""
        self.queries.append((query, list(params)))
        if "INSERT INTO door_memory" in query:
            self.memories = [
                row for row in self.memories if not (row[0] == params[0] and row[1] == params[1])
            ]
            self.memories.append([params[0], params[1], params[2], params[3], self.now])
            return [[params[1], params[2], params[3], self.now]]
        if "FROM door_memory" in query:
            return [
                [row[1], row[2], row[3], row[4]]
                for row in self.memories
                if row[0] == params[0] and row[1] == params[1]
            ]
        if "FROM stops s" in query:
            return [row for row in self.stops if row[0] == params[0]]
        if "FROM shifts sh" in query:
            return [row for row in self.shifts if row[0] == params[0]]
        if "FROM delivery_events e" in query:
            return list(self.events)
        raise AssertionError(f"unexpected query: {query}")

    def statements(self) -> list[str]:
        """The SQL the repository sent, in order."""
        return [query for query, _ in self.queries]


@pytest.fixture()
def fake_db() -> FakeDatabase:
    """The stand-in for PostgreSQL."""
    return FakeDatabase()


@pytest.fixture()
def sql_repo(fake_db: FakeDatabase) -> SqlRepo:
    """The SQL repository, wired to the stand-in for PostgreSQL."""
    from app.repo import SqlRepo

    return SqlRepo("postgresql://courier@localhost:5432/courier", fake_db.run)


@pytest.fixture()
def sql_api_client(client: TestClient, sql_repo: SqlRepo) -> TestClient:
    """The client with the SQL repository behind the routes."""
    from app.main import app
    from app.repo import get_repo

    app.dependency_overrides[get_repo] = lambda: sql_repo
    return client
