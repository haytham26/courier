"""Health endpoints for the Courier Copilot API.

The edge (Caddy, `infra/Caddyfile`) and the heartbeat (`infra/monitoring/heartbeat.sh`)
ask the same three questions:

- `/health/live`  - is the process up? It never touches a dependency, so a slow
  database can never make the proxy restart a healthy container.
- `/health/ready` - can the API serve traffic? The database has to answer.
- `/health`       - both, plus the version the deployment is running.

The answer is always JSON. A failing dependency is reported by its name, never
by its message: the endpoint is reachable from outside, so it must not leak a
connection string, a host name or a password.
"""

from __future__ import annotations

import time
from typing import Any

import psycopg
from fastapi import APIRouter, Response
from fastapi.responses import JSONResponse
from pydantic_settings import BaseSettings, SettingsConfigDict

router = APIRouter(tags=["health"])

_STARTED_AT = time.monotonic()


class HealthSettings(BaseSettings):
    """What the health endpoints need to know (no secret lives here)."""

    model_config = SettingsConfigDict(env_file=".env.local", extra="ignore")

    app_version: str = "0.1.0"
    database_url: str = ""
    health_database_timeout_seconds: float = 2.0


def database_check(settings: HealthSettings) -> dict[str, Any]:
    """Asks the database whether it is there. It never raises.

    A failure is reported by the name of the error only: the message of a
    connection error carries the DSN, and the DSN carries the password.
    """
    if not settings.database_url:
        return {
            "status": "skipped",
            "detail": "no DATABASE_URL: the API runs on the in-memory store",
        }
    timeout = max(1, int(settings.health_database_timeout_seconds))
    try:
        with (
            psycopg.connect(settings.database_url, connect_timeout=timeout) as connection,
            connection.cursor() as cursor,
        ):
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except (psycopg.Error, ValueError) as exc:
        return {"status": "failed", "detail": type(exc).__name__}
    return {"status": "ok", "detail": None}


def _uptime_seconds() -> float:
    """How long the process has been up."""
    return round(time.monotonic() - _STARTED_AT, 3)


@router.get("/health")
def health() -> Response:
    """The whole document: the version, the uptime and every check."""
    settings = HealthSettings()
    database = database_check(settings)
    ready = database["status"] == "ok"
    document: dict[str, Any] = {
        "status": "ok" if ready else "degraded",
        "version": settings.app_version,
        "uptime_seconds": _uptime_seconds(),
        "checks": {
            "live": True,
            "ready": ready,
            "database": database,
        },
    }
    return JSONResponse(status_code=200 if ready else 503, content=document)


@router.get("/health/live")
def live() -> Response:
    """The liveness probe: the process is up. It never touches the database."""
    settings = HealthSettings()
    return JSONResponse(
        status_code=200,
        content={
            "status": "ok",
            "version": settings.app_version,
            "uptime_seconds": _uptime_seconds(),
        },
    )


@router.get("/health/ready")
def ready() -> Response:
    """The readiness probe: the API can serve traffic."""
    settings = HealthSettings()
    database = database_check(settings)
    is_ready = database["status"] == "ok"
    document: dict[str, Any] = {
        "status": "ok" if is_ready else "degraded",
        "version": settings.app_version,
        "uptime_seconds": _uptime_seconds(),
        "checks": {"database": database},
    }
    return JSONResponse(status_code=200 if is_ready else 503, content=document)
