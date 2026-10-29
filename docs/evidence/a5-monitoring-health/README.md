# Evidence — the monitoring watches the routes the stack serves (A5)

Run locally on the founder's machine (Docker capped at 3 GB), against the branch
`fix/monitoring-api-health` from `origin/main`. The stack was the real one
(`infra/compose.staging.yml`), not a mock.

## The defect

`infra/monitoring/compose.monitoring.yml` pointed its heartbeat at
`http://api_a:8000/health/ready` and `infra/monitoring/ALERTS.md` documented the
same URL for the API's down alert. The API serves `/healthz`, not `/health/ready`
— its contract carries `/healthz`, and both compose files healthcheck it there.

A heartbeat pointed at a 404 is a monitor that reads the API as dead while the API
is serving every request. That is worse than no monitor, because it is the
artifact an operator trusts at 3 a.m.

## The proof, against the real services

```
=== what the API answers on each candidate path ===
/healthz -> 200
/health/ready -> 404
=== what the auth service answers on each candidate path ===
/healthz -> 200
/health/ready -> 200
```

So the API's URL is `/healthz`, and the auth service's stays `/health/ready` —
both of which the fix now sets, and which `ALERTS.md` now says.

## The stack renders

```
docker compose --env-file infra/ci-staging.env -f infra/monitoring/compose.monitoring.yml config --quiet
-> exit 0
```

## What this proved, and what it did not

**Proved:** the URLs the monitoring watches are the routes the services answer;
the monitoring stack still renders.

**Not proved:** the monitoring stack running beside a deployment (it joins
`courier-net`, the production stack's network, so it needs the OCI host — the
next A5 slice and FOUNDER_TODO), and the alert webhook (`ALERT_WEBHOOK_URL` is
empty, so the heartbeat writes to its log and posts nothing).

## The run, verbatim

\\n=== what the API answers on each candidate path ===
/healthz -> 200
/health/ready -> 404
=== what the auth service answers on each candidate path ===
/healthz -> 200
/health/ready -> 200
\\n