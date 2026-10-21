# Courier Copilot API

The FastAPI service behind the courier app: the shifts, the stops, the events
of a run, the door memory and the earnings.

- The code lives in `app/`.
- The tests live in `tests/` and run with `uv run --directory apps/api pytest`.
- The database is PostgreSQL 16 with PostGIS (the schema is `db/schema.sql`).
- The API never issues credentials: the tokens come from the auth service
  (`services/auth`) and are verified against its JWKS (`AUTH_JWKS_URL`).

The health endpoints (`/health`, `/health/live`, `/health/ready`) are what the
edge and the heartbeat ask; see `infra/Caddyfile` and
`infra/monitoring/heartbeat.sh`.
