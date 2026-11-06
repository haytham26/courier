# The Courier Copilot API

The FastAPI service of the product: it plans the run, takes the delivery events and speaks to the
courier over the voice WebSocket.

| Piece | Where |
|---|---|
| The HTTP surface and the voice socket | `app/main.py` |
| The persistence (PostGIS) | `app/repo.py` |
| The routing core (the day's order, the arrival times, the distance) | `app/routing.py` |
| The Master Template Lock (the driver's own street order) | `app/sequencing.py` |
| The D8 address correction engine | `app/address_correction.py` |
| The NZ address parser | `app/nz_address.py` |
| The copilot and the intake graph | `app/agents/` |
| The system prompts | `app/prompts.py` |
| The token verification against the Better Auth JWKS | `app/auth/` |
| The tests | `tests/` (mirroring the package) |

## Running it

```
uv sync --extra dev
uv run uvicorn app.main:app --reload
```

The service refuses to start without `AUTH_JWKS_URL`, `AUTH_JWT_AUDIENCE` and
`AUTH_JWT_ISSUER`: there is no default secret, and the tokens of the auth service are verified
against its published JWKS. The schema it runs against is `packages/contracts/db/schema.sql`.

The verification's other settings, with their why:

| Variable | What it is |
|---|---|
| `AUTH_JWT_LEEWAY_SECONDS` | the clock skew tolerated between hosts (default 30 s, bounded to 300 s — BUG-123) |
| `AUTH_JWKS_INTERNAL_HOSTS` | the hosts a plaintext JWKS hop may use; loopback is always exempt (BUG-131) |
| `AUTH_JWKS_KEY_FINGERPRINTS` | the pinned sha256 digests of the JWKS's keys, optional — see `infra/env.example` for the command that computes one (BUG-131) |

The per-caller rate limits (`app/rate_limit.py`, BUG-229) are read from the
environment on every request, so a running process can be re-tuned without a
redeploy. Buckets are per bearer token, or per client IP when no token is
present:

| Variable | Default | Applies to |
|---|---|---|
| `RATE_LIMIT_DEFAULT` | `120/minute` | every http route without its own limit |
| `RATE_LIMIT_AUTH` | `20/minute` | `GET /auth/me`, `GET /auth/verify` |
| `RATE_LIMIT_UPLOADS` | `30/minute` | the POD upload, the manifest photo, the spreadsheet import |
| `RATE_LIMIT_WEBHOOKS` | `60/minute` | `POST /billing/webhooks/{source}` |

`/healthz` is exempt (the uptime probe holds no token), and the voice
WebSocket is not rate-limited — slowapi passes non-http scopes through; the
socket has its own budget (`COPILOT_BUDGET_SECONDS`). A client over a limit
gets a 429 with a `Retry-After` header. The store is in-memory and
per-process: with more than one uvicorn worker, move the limiter to its
Redis backend.

The edge guards (`app/request_guards.py`, BUG-230) — the security headers
are the `hardening_headers` middleware in `app/main.py`:

| Variable | Default | What it is |
|---|---|---|
| `API_CORS_ALLOW_ORIGINS` | empty (no browser origin may call the API) | the comma-separated CORS allow-list; the mobile app is native and sends no `Origin`, so only a web dashboard's origin belongs here |
| `API_ALLOWED_HOSTS` | `COURIER_DOMAIN` + the compose-internal names; `*` only when neither is set (local dev) | the only `Host` headers the API answers (trusted-host check; the port is not part of the match) |
| `API_MAX_REQUEST_BYTES` | `11534336` (11 MiB) | the global request-size cap: a declared `Content-Length` over it is a 413 before the body is read (the 10 MiB POD photo plus its multipart framing); each route keeps its own tighter read cap |

## The gates

```
uv run pytest -q      # the tests
uv run ruff check .   # the lint
uv run mypy .         # the types
```

The coverage of the service is checked by the ratchet of `docs/plan/CONSTRAINTS.md`
(`node scripts/ci/run-coverage.mjs`).
