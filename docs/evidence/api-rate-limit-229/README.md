# BUG-229 evidence — per-caller rate limits on the API (audit item 4a)

## The gap
`services/api` had no rate-limiting library and no per-route limits; the unauthenticated `POST /billing/webhooks/{source}` could be flooded for free. Research: `docs/research/2026/security-hardening.md` §1.4 A1 (slowapi ADOPT, pinned).

## Red first
`services/api/tests/test_rate_limit.py` written before the implementation; run against the tree without it:
5 errors + 1 failure, all `AttributeError: 'State' object has no attribute 'limiter'`.

## Green after
- `slowapi==0.1.10` pinned (PyPI 2026-11-07: MIT, dep `limits>=2.3` MIT, release 2026-06-13); `uv lock` added slowapi 0.1.10, limits 5.8.0, deprecated 3.0.1, wrapt 2.5.2 (MIT / MIT / MIT / BSD-2-Clause — rows in `docs/product/LICENSES.md`, all on the allow-list).
- `app/rate_limit.py`: key = sha256(Authorization)[:16] per token else client IP; limits are per-request callables reading `RATE_LIMIT_DEFAULT` (120/min), `RATE_LIMIT_AUTH` (20/min), `RATE_LIMIT_UPLOADS` (30/min), `RATE_LIMIT_WEBHOOKS` (60/min); `SlowAPIASGIMiddleware` (pure ASGI — the BaseHTTPMiddleware subclass only calls sync handlers and would drop the custom 429's Retry-After); custom 429 handler sets `Retry-After` from the failed limit's window; `/healthz` exempt; websockets pass through (own budget, BUG-116).
- Routes decorated in `main.py` (POD upload, manifest photo, import, billing webhook — the decorated endpoints carry a `request: Request` param, keyword-only where ruff's PLR0917 fires) and in `auth/routes.py` (`/auth/me`, `/auth/verify`).
- conftest: `app.state.limiter.enabled = False` for the shared app.
- `tests/test_rate_limit.py` 6/6: 429 + `Retry-After: 60` at limit+1 on the default; healthz exempt at 1/min; two tokens from one IP get two buckets; auth route capped at 2/min; webhook at 2/min; shared suite unthrottled.
- Full API suite: 591 passed, 35 deselected (`-m 'not db'`); `ruff check .` clean; `mypy .` clean (76 files); `scripts/generate_api_client.py check`: the client is fresh (Request params do not enter the OpenAPI); `node --test "scripts/*/__tests__/*.test.mjs"` and the parity/floor/doc-links/workflows gates clean; parity 0 reopened vs origin/main.
