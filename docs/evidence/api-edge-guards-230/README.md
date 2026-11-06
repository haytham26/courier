# BUG-230 evidence — CORS allow-list, trusted-host check, global request-size cap (audit item 4b)

## The gap
`services/api/app/main.py` had only the `hardening_headers` middleware: no CORS configuration, no `TrustedHostMiddleware`, no global body cap. Research: `docs/research/2026/security-hardening.md` row 64 and §6 decision 5 ("a security-header and CORS allow-list" plus trusted-host and request-size limits).

## Red first
`services/api/tests/test_request_guards.py` written before the implementation: collection error `ModuleNotFoundError: No module named 'app.request_guards'`.

## Green after
- `app/request_guards.py`: `CORSMiddleware` allow_origins from `API_CORS_ALLOW_ORIGINS` (default `[]` — native app sends no Origin; `allow_credentials=False`); `TrustedHostMiddleware` allowed_hosts from `API_ALLOWED_HOSTS` (fallback `COURIER_DOMAIN` + `api,api_a,api_b,localhost,127.0.0.1,[::1]`; `*` only with neither set = local dev); pure-ASGI `RequestSizeGuardMiddleware` → 413 before reading when Content-Length > `API_MAX_REQUEST_BYTES` (default 11 MiB = 10 MiB POD + multipart framing; 400 on a non-numeric Content-Length); websocket scopes pass through. Installed in `main.py` after the rate limiter, trusted-host outermost. Starlette built-ins only — no new dependency, no LICENSES change.
- `tests/test_request_guards.py` 7/7: env parsing helpers; unlisted Origin blocked (simple request gets no ACAO header, preflight 400) while the listed origin is echoed; spoofed Host → 400, allowed hosts → 200; COURIER_DOMAIN fallback vs `*`; 413 at 2000 bytes under a 1024 cap vs 200 at 100; default cap 11 MiB and the garbage-value fallback; the shared app carries all three middleware classes and `/healthz` answers.
- Wiring/deployment: `infra/compose.prod.yml`, `compose.staging.yml` pass `API_ALLOWED_HOSTS=${API_ALLOWED_HOSTS:-${COURIER_DOMAIN},api,api_a,api_b,localhost,127.0.0.1,[::1]}`; `compose.ci.yml` sets `API_ALLOWED_HOSTS: 10.0.2.2,api,localhost,127.0.0.1` (the emulator dials 10.0.2.2:8000); `infra/env.example` + the API README document all three variables.
- Full API suite green on the head; `ruff check .` and `mypy .` clean; typed client fresh; node gates 281 pass; parity 0 reopened vs origin/main.
