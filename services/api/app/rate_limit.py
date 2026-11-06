"""Per-caller rate limits on the API (audit 2026-11-05 item 4a, BUG-229).

The research (docs/research/2026/security-hardening.md §1.4 A1) adopted
`slowapi`, pinned to an exact version because it has one maintainer: the
in-memory store is a small, replaceable piece if the project ever dies. The
store is per-process, so when the API ever runs more than one uvicorn worker
the limiter moves to its Redis backend - one constructor argument, the limits
below do not change.

Buckets are per bearer token when a token is presented (a driver's phone is
one bucket however many IPs it roams through) and per client IP otherwise
(the unauthenticated webhook and the health probe). The limits are callables
read on every request, so `RATE_LIMIT_*` in the environment changes the
limits of a running process without a redeploy; the defaults are 120/minute
overall, 20/minute on the token endpoints, 30/minute on the uploads and
60/minute on the billing webhook.

slowapi does not rate-limit websockets - its middleware passes non-http
scopes through - which is deliberate here: the voice socket has its own
budget (COPILOT_BUDGET_SECONDS, BUG-116) and a held-open socket is not a
request flood.
"""

from __future__ import annotations

import hashlib
import os
import re
from collections.abc import Callable
from typing import Any, cast

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIASGIMiddleware


def _key(request: Request) -> str:
    """One bucket per bearer token, else per client IP.

    The token is hashed, never stored: the bucket key must not leak the
    credential into the limiter's storage or its logs.
    """
    authorization = request.headers.get("authorization")
    if authorization:
        digest = hashlib.sha256(authorization.encode("utf-8")).hexdigest()[:16]
        return f"token:{digest}"
    host = request.client.host if request.client else "unknown"
    return f"ip:{host}"


def _env_limit(variable: str, default: str) -> Callable[[], str]:
    """A limit read from the environment on every request (see module docstring)."""

    def read() -> str:
        return os.environ.get(variable, default)

    return read


#: The limits, each overridable per environment. Route decorators reference
#: these callables; the middleware applies the default to every route that
#: has no decorator of its own.
DEFAULT_LIMIT = _env_limit("RATE_LIMIT_DEFAULT", "120/minute")
AUTH_LIMIT = _env_limit("RATE_LIMIT_AUTH", "20/minute")
UPLOAD_LIMIT = _env_limit("RATE_LIMIT_UPLOADS", "30/minute")
WEBHOOK_LIMIT = _env_limit("RATE_LIMIT_WEBHOOKS", "60/minute")

limiter = Limiter(key_func=_key, default_limits=[DEFAULT_LIMIT])

_WINDOW_SECONDS = {"second": 1, "minute": 60, "hour": 3600, "day": 86400}


async def rate_limit_exceeded(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """The 429 a client can act on: the limit that was hit and a Retry-After
    in seconds, derived from the limit's own window (``20 per 1 minute`` -> 60)."""
    retry_after = 60
    failed = exc.limit.limit if exc.limit is not None else None
    match = re.search(r"per (\d+) (\w+)", str(failed)) if failed is not None else None
    if match:
        retry_after = int(match.group(1)) * _WINDOW_SECONDS.get(match.group(2), 60)
    return JSONResponse(
        status_code=429,
        content={
            "detail": f"rate limit exceeded ({exc.detail}); retry after {retry_after} seconds"
        },
        headers={"Retry-After": str(retry_after)},
    )


def install_rate_limiter(app: FastAPI) -> None:
    """Wire the limiter into the app: the middleware checks the default limit
    on every http request, the route decorators check their own, the handler
    answers the 429. Tests flip ``app.state.limiter.enabled`` off (conftest).

    The pure-ASGI middleware is used on purpose, not the BaseHTTPMiddleware
    subclass: the ASGI one awaits OUR async 429 handler (the BaseHTTP one can
    only call sync handlers and would silently fall back to slowapi's default
    429, which carries no Retry-After), and it passes non-http scopes
    (websockets) straight through.
    """
    app.state.limiter = limiter
    # Starlette's handler type takes `Exception`; ours takes the narrower
    # RateLimitExceeded (slowapi's own default handler has the same shape),
    # so the registration is cast rather than loosening the handler.
    app.add_exception_handler(RateLimitExceeded, cast(Any, rate_limit_exceeded))
    app.add_middleware(SlowAPIASGIMiddleware)
