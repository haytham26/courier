"""The edge guards of the API (audit 2026-11-05 item 4b, BUG-230).

The security headers already live in `main.py`'s `hardening_headers`
middleware; what was missing is the rest of the ASVS edge:

- **CORS allow-list.** The mobile app is native and sends no `Origin` header,
  so the default allow-list is EMPTY: no browser origin may call this API
  unless `API_CORS_ALLOW_ORIGINS` names it (the web dashboard's origin goes
  there). Credentials are never allowed cross-origin.
- **Trusted-host check.** `API_ALLOWED_HOSTS` (comma-separated) is the only
  `Host` the API answers. When it is unset, the public `COURIER_DOMAIN` is
  used (plus the compose-internal names, for the healthcheck and the edge);
  with neither set - local development - any host is allowed. Production
  always sets one of the two (compose.prod.yml / compose.staging.yml pass
  `API_ALLOWED_HOSTS`).
- **Global request-size cap.** A pure-ASGI guard rejects a declared
  `Content-Length` over `API_MAX_REQUEST_BYTES` with a 413 BEFORE the body
  is read. The default is 11 MiB: the 10 MiB POD photo plus its multipart
  framing (the per-route caps stay tighter: webhook 64 KiB, import 5 MiB).
  A chunked body (no `Content-Length`) is still bounded by each route's own
  read cap, so no path reads unbounded.

All three read the environment once at install (deployment config, not
per-request tunables - unlike the rate limits, which re-read theirs).
"""

from __future__ import annotations

import json
import os

from fastapi import FastAPI
from starlette.datastructures import Headers
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.types import ASGIApp, Receive, Scope, Send

#: The default global body cap: the 10 MiB POD photo (POD_MAX_BYTES) plus its
#: multipart framing and form fields.
DEFAULT_MAX_REQUEST_BYTES = 11 * 1024 * 1024


def _cors_allow_origins() -> list[str]:
    raw = os.environ.get("API_CORS_ALLOW_ORIGINS", "")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


def _allowed_hosts() -> list[str]:
    raw = os.environ.get("API_ALLOWED_HOSTS", "")
    if raw.strip():
        return [host.strip() for host in raw.split(",") if host.strip()]
    domain = os.environ.get("COURIER_DOMAIN", "").strip()
    if domain:
        # The public name plus the names the inside of the compose network
        # uses (the healthcheck, the edge, the service aliases).
        return [domain, "api", "api_a", "api_b", "localhost", "127.0.0.1", "[::1]"]
    # Local development only: production always sets COURIER_DOMAIN or
    # API_ALLOWED_HOSTS (see infra/env.example and the compose files).
    return ["*"]


def _max_request_bytes() -> int:
    raw = os.environ.get("API_MAX_REQUEST_BYTES", "").strip()
    if raw:
        try:
            value = int(raw)
        except ValueError:
            return DEFAULT_MAX_REQUEST_BYTES
        if value > 0:
            return value
    return DEFAULT_MAX_REQUEST_BYTES


async def _respond(send: Send, status: int, detail: str) -> None:
    body = json.dumps({"detail": detail}).encode("utf-8")
    await send(
        {
            "type": "http.response.start",
            "status": status,
            "headers": [
                (b"content-type", b"application/json"),
                (b"content-length", str(len(body)).encode("ascii")),
            ],
        }
    )
    await send({"type": "http.response.body", "body": body})


class RequestSizeGuardMiddleware:
    """Rejects an over-cap Content-Length before the body is read.

    Pure ASGI (not BaseHTTPMiddleware) so websocket scopes pass straight
    through and nothing is buffered.
    """

    def __init__(self, app: ASGIApp, limit: int) -> None:
        self.app = app
        self.limit = limit

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        raw = Headers(scope=scope).get("content-length")
        if raw is not None:
            try:
                length = int(raw)
            except ValueError:
                await _respond(send, 400, "the Content-Length header is not a number")
                return
            if length > self.limit:
                await _respond(
                    send,
                    413,
                    f"the request body is over the {self.limit} byte cap (API_MAX_REQUEST_BYTES)",
                )
                return
        await self.app(scope, receive, send)


def install_request_guards(app: FastAPI) -> None:
    """Wire the three guards in. The trusted-host check is added LAST so it
    is the outermost middleware - it is the cheapest rejection and a spoofed
    Host should never reach anything else."""
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_cors_allow_origins(),
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["authorization", "content-type"],
        max_age=600,
    )
    app.add_middleware(RequestSizeGuardMiddleware, limit=_max_request_bytes())
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=_allowed_hosts())
