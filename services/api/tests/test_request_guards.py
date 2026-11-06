"""The edge guards' tests (BUG-230, audit 2026-11-05 item 4b).

The shared app installs the guards with the development defaults (any host,
no CORS origins - see app/request_guards.py); these tests build a small app
with a production-shaped environment to prove the guards actually bite, plus
one test that the shared app has them installed.
"""

from __future__ import annotations

import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.main import app
from app.request_guards import (
    RequestSizeGuardMiddleware,
    _allowed_hosts,
    _cors_allow_origins,
    _max_request_bytes,
    install_request_guards,
)


def _mini_client(monkeypatch: pytest.MonkeyPatch, host: str = "api.example", **env: str) -> TestClient:
    """A small app with the guards installed under the given environment.

    The client's base URL carries `host`, so the requests arrive with a
    known Host header (TestClient's default would be `testclient:50000`).
    """
    env.setdefault("API_ALLOWED_HOSTS", host)
    for key, value in env.items():
        monkeypatch.setenv(key, value)
    mini = FastAPI()
    install_request_guards(mini)

    @mini.get("/ping")
    def ping() -> dict:
        return {"pong": True}

    @mini.post("/echo")
    async def echo(request: Request) -> dict:
        return {"bytes": len(await request.body())}

    return TestClient(mini, base_url=f"http://{host}")


def test_cors_allow_list_comes_from_the_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("API_CORS_ALLOW_ORIGINS", raising=False)
    assert _cors_allow_origins() == []
    monkeypatch.setenv("API_CORS_ALLOW_ORIGINS", "https://dash.example, https://app.example")
    assert _cors_allow_origins() == ["https://dash.example", "https://app.example"]


def test_cors_blocks_an_unlisted_origin(monkeypatch: pytest.MonkeyPatch) -> None:
    client = _mini_client(
        monkeypatch,
        API_CORS_ALLOW_ORIGINS="https://dash.example",
    )
    blocked = client.get("/ping", headers={"Origin": "https://evil.example"})
    assert blocked.status_code == 200
    assert "access-control-allow-origin" not in blocked.headers
    allowed = client.get("/ping", headers={"Origin": "https://dash.example"})
    assert allowed.headers["access-control-allow-origin"] == "https://dash.example"
    preflight = client.options(
        "/ping",
        headers={
            "Origin": "https://evil.example",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert preflight.status_code == 400
    assert "access-control-allow-origin" not in preflight.headers


def test_trusted_host_rejects_a_spoofed_host(monkeypatch: pytest.MonkeyPatch) -> None:
    client = _mini_client(monkeypatch, API_ALLOWED_HOSTS="api.example,www.api.example")
    assert client.get("/ping", headers={"Host": "evil.example"}).status_code == 400
    assert client.get("/ping", headers={"Host": "api.example"}).status_code == 200
    assert client.get("/ping", headers={"Host": "www.api.example"}).status_code == 200


def test_allowed_hosts_fall_back_to_the_public_domain(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("API_ALLOWED_HOSTS", raising=False)
    monkeypatch.setenv("COURIER_DOMAIN", "courier.example")
    hosts = _allowed_hosts()
    assert "courier.example" in hosts
    assert "127.0.0.1" in hosts
    monkeypatch.delenv("COURIER_DOMAIN", raising=False)
    assert _allowed_hosts() == ["*"]


def test_the_request_size_cap_answers_413_before_reading(monkeypatch: pytest.MonkeyPatch) -> None:
    client = _mini_client(monkeypatch, API_MAX_REQUEST_BYTES="1024")
    small = client.post("/echo", content=b"x" * 100)
    assert small.status_code == 200
    assert small.json() == {"bytes": 100}
    big = client.post("/echo", content=b"x" * 2000)
    assert big.status_code == 413
    assert "1024" in big.json()["detail"]


def test_max_request_bytes_defaults_to_eleven_mebibytes(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("API_MAX_REQUEST_BYTES", raising=False)
    assert _max_request_bytes() == 11 * 1024 * 1024
    monkeypatch.setenv("API_MAX_REQUEST_BYTES", "2048")
    assert _max_request_bytes() == 2048
    monkeypatch.setenv("API_MAX_REQUEST_BYTES", "not-a-number")
    assert _max_request_bytes() == 11 * 1024 * 1024


def test_the_shared_app_has_all_three_guards_installed() -> None:
    installed = {m.cls for m in app.user_middleware}
    assert CORSMiddleware in installed
    assert TrustedHostMiddleware in installed
    assert RequestSizeGuardMiddleware in installed
    with TestClient(app) as probe:
        assert probe.get("/healthz").status_code == 200
