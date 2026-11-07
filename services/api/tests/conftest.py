"""Test environment for the Courier Copilot API.

The API refuses to start without a JWKS endpoint, so the tests provide a
placeholder URL (the verifier is replaced with a mock transport per test).

The shared fixtures and helpers live here once (BUG-059's hoist): the test
modules used to copy `repo`/`verifier_key`/`client`/`other_client`/
`anonymous_client` and the routing helpers `make_stop`/`make_request` into
each file, where the copies drifted apart. `test_fixture_hoist.py` pins that
no module redefines them.
"""
from __future__ import annotations

import os
from collections.abc import Iterator
from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID, uuid4

os.environ.setdefault("AUTH_JWKS_URL", "http://127.0.0.1:9/api/auth/jwks")
os.environ.setdefault("AUTH_JWT_AUDIENCE", "courier-api")
os.environ.setdefault("AUTH_JWT_ISSUER", "http://localhost:3001")
# The local POD store refuses to boot without a real signing key; tests get a
# fixed throwaway one (the forged-grant test uses a different key on purpose).
os.environ.setdefault(
    "POD_URL_SIGNING_SECRET", "test-only-pod-url-signing-secret-0123456789"
)
# The copilot's client is built lazily on first use (BUG-116), so the agent
# tests need a placeholder key - the real gateway is never called (the tests
# pass their own client, and the socket's loop is tested with a fallback).
os.environ.setdefault("ANTHROPIC_API_KEY", "test-only-placeholder")

import ipaddress

import pytest
from fastapi.testclient import TestClient

import app.safe_fetch as _safe_fetch
from app.auth.jwks import get_verifier
from app.main import app
from app.repo import InMemoryRepo, get_repo
from app.routing import BreakConstraint, RouteRequest, RouteStop, RunConstraints, TimeWindow
from tests.auth.test_jwks import make_key_pair, make_verifier, sign

# BUG-229: the rate limiter is installed on the shared app, but the suite runs
# unthrottled - tests/test_rate_limit.py re-enables it per test with fresh
# tokens, so the module-level buckets start empty there.
app.state.limiter.enabled = False


def pytest_collection_modifyitems(config: pytest.Config, items: list[pytest.Item]) -> None:
    """BUG-243: under mutmut WITHOUT a database, deselect the db-marked suite.

    The mutation lane overrides the ini `-m 'not db'` (services/api
    pyproject `[tool.mutmut] pytest_add_cli_args`) so the db suite runs when
    the lane's PostGIS service is there (mutation.yml sets DATABASE_URL, like
    ci.yml's db step). Without DATABASE_URL the db fixtures would ERROR -
    and an errored run is pytest exit code 1, which mutmut counts as a KILL:
    every mutant would "die" for the runner's reason and the floor would read
    fake. Deselect instead, so those lines stay honestly `no_tests`. Outside
    the mutants tree the fixtures' fail-loud guard is untouched.
    """
    service = Path(__file__).resolve().parents[1]
    if service.name != "mutants" or os.environ.get("DATABASE_URL"):
        return
    deselected = [item for item in items if item.get_closest_marker("db")]
    if not deselected:
        return
    items[:] = [item for item in items if not item.get_closest_marker("db")]
    config.hook.pytest_deselected(items=deselected)


@pytest.fixture(autouse=True)
def _fake_dns_for_the_suite(monkeypatch: pytest.MonkeyPatch):
    """The suite never fetches for real (verifiers and providers get mock
    transports), so the SSRF guard's resolver is faked for the whole suite:
    every fake host NAME resolves to a public address, while IP literals still
    return themselves - so the guard's refusals of 127.0.0.1 & co. stay real.
    tests/test_safe_fetch.py patches the resolver per test on top of this.
    (BUG-231.)"""

    def fake_resolve(host: str, port: int) -> set[str]:
        bare = host.strip("[]").lower()
        if bare == "localhost":
            return {"127.0.0.1"}
        try:
            ipaddress.ip_address(bare)
        except ValueError:
            return {"93.184.216.34"}
        return {bare}

    monkeypatch.setattr(_safe_fetch, "_resolve", fake_resolve)
    yield

COURIER = "driver-7"
OTHER = "driver-8"

DEPOT_LAT = -43.5330
DEPOT_LON = 172.6300
DEFAULT_START_AT = datetime(2026, 10, 21, 8, 0, tzinfo=UTC)


@pytest.fixture()
def repo() -> InMemoryRepo:
    return InMemoryRepo()


@pytest.fixture()
def verifier_key(repo: InMemoryRepo) -> Iterator[object]:
    """The one key pair the whole module verifies against.

    Every client in a test shares it (a second override would kill the first
    client's tokens); the identity comes from the token's subject, so two
    couriers are two subjects, not two verifiers.
    """
    key_pair = make_key_pair()
    _, jwk = key_pair
    app.dependency_overrides[get_repo] = lambda: repo
    app.dependency_overrides[get_verifier] = lambda: make_verifier({"keys": [jwk]})
    yield key_pair[0]
    app.dependency_overrides.clear()


@pytest.fixture()
def client(verifier_key: object) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        test_client.headers.update(
            {"Authorization": f"Bearer {sign(verifier_key, subject=COURIER)}"}
        )
        yield test_client


@pytest.fixture()
def other_client(verifier_key: object) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        test_client.headers.update(
            {"Authorization": f"Bearer {sign(verifier_key, subject=OTHER)}"}
        )
        yield test_client


@pytest.fixture()
def anonymous_client(verifier_key: object) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


def make_stop(
    *,
    lat: float,
    lon: float,
    priority: bool = False,
    parcels: int = 1,
    service_time_s: int | None = None,
    window: TimeWindow | None = None,
    stop_id: UUID | None = None,
) -> RouteStop:
    """One stop of the run."""
    return RouteStop(
        id=stop_id or uuid4(),
        lat=lat,
        lon=lon,
        priority=priority,
        parcels=parcels,
        service_time_s=service_time_s,
        window=window,
    )


def make_request(
    stops: list[RouteStop],
    *,
    start_at: datetime = DEFAULT_START_AT,
    capacity_parcels: int | None = None,
    speed_kmh: float = 30.0,
    finish_lat: float | None = None,
    finish_lon: float | None = None,
    break_constraint: BreakConstraint | None = None,
    depot_lat: float = DEPOT_LAT,
    depot_lon: float = DEPOT_LON,
) -> RouteRequest:
    """The run the engine is asked to plan."""
    return RouteRequest(
        stops=tuple(stops),
        constraints=RunConstraints(
            depot_lat=depot_lat,
            depot_lon=depot_lon,
            start_at=start_at,
            capacity_parcels=capacity_parcels,
            speed_kmh=speed_kmh,
            break_constraint=break_constraint,
            finish_lat=finish_lat,
            finish_lon=finish_lon,
        ),
    )
