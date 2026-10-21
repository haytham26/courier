"""The health endpoints: the edge and the heartbeat depend on their contract.

The contract, in one place:

- `/health/live`  answers 200 as long as the process is up. It never touches
  the database, so a slow database can never make the proxy restart a healthy
  container.
- `/health/ready` answers 200 when the database answers, 503 when it does not.
- `/health` answers both, plus the version the deployment is running.

A failing dependency is reported by the name of the error, never by its
message: the endpoint is reachable from outside and the message of a
connection error carries the password of the database.
"""

from __future__ import annotations

import json
from typing import Any

import psycopg
from fastapi.testclient import TestClient

from app import health
from app.health import HealthSettings


def test_live_is_ok_and_carries_the_version(client: TestClient, monkeypatch) -> None:
    monkeypatch.setenv("APP_VERSION", "9.9.9")

    response = client.get("/health/live")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["version"] == "9.9.9"
    assert body["uptime_seconds"] >= 0


def test_live_never_touches_the_database(client: TestClient, monkeypatch) -> None:
    def boom(settings: HealthSettings) -> dict[str, Any]:
        raise AssertionError("the liveness probe must not ask the database")

    monkeypatch.setattr(health, "database_check", boom)

    assert client.get("/health/live").status_code == 200


def test_ready_is_ok_when_the_database_answers(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(
        health,
        "database_check",
        lambda settings: {"status": "ok", "detail": None},
    )

    response = client.get("/health/ready")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["checks"]["database"]["status"] == "ok"


def test_ready_is_degraded_when_the_database_is_down(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(
        health,
        "database_check",
        lambda settings: {"status": "failed", "detail": "OperationalError"},
    )

    response = client.get("/health/ready")

    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "degraded"
    assert body["checks"]["database"]["status"] == "failed"


def test_health_reports_live_and_ready(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(
        health,
        "database_check",
        lambda settings: {"status": "ok", "detail": None},
    )

    response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["checks"]["live"] is True
    assert body["checks"]["ready"] is True
    assert body["version"]


def test_health_is_503_when_the_database_is_down(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(
        health,
        "database_check",
        lambda settings: {"status": "failed", "detail": "OperationalError"},
    )

    assert client.get("/health").status_code == 503


def test_database_check_without_a_url_is_skipped() -> None:
    result = health.database_check(HealthSettings(database_url=""))

    assert result["status"] == "skipped"
    assert result["detail"] is not None


def test_database_check_never_leaks_the_password(monkeypatch) -> None:
    def refuse(*args: Any, **kwargs: Any) -> Any:
        raise psycopg.OperationalError(
            "connection to postgresql://courier:hunter2@postgres:5432/courier failed"
        )

    monkeypatch.setattr(health.psycopg, "connect", refuse)
    settings = HealthSettings(database_url="postgresql://courier:hunter2@postgres:5432/courier")

    result = health.database_check(settings)

    assert result["status"] == "failed"
    assert "hunter2" not in json.dumps(result)
    assert "postgres" not in json.dumps(result)
