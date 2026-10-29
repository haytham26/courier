# The alert rules of Courier Copilot

What wakes the team, when, and what to do about it. The heartbeat
(`infra/monitoring/heartbeat.sh`) posts every alert to the webhook; the
thresholds live in `infra/env.example` and can be changed without touching
the script.

## Who is woken

There is one on-call: the founder. The webhook goes to the channel of the
team that the founder reads (Slack, Discord, Mattermost or ntfy). The
Release Manager (the agent that runs the releases) prepares the fix, but the
decision to wake the founder is made by the heartbeat, not by a person.

A critical alert means a courier cannot sign in or cannot record a delivery.
The founder looks at the channel within 15 minutes. A high alert means
something is going wrong but the couriers are still working: the founder
looks at it the same day. A medium alert is a warning with a deadline: the
founder looks at it within two working days.

## The rules

| Alert | The threshold | How it is measured | Severity | Who is woken |
|---|---|---|---|---|
| The API is down | 3 checks in a row answer something else than `200` (3 minutes with the default interval) | `GET /healthz` of `api_a` | critical | the founder, straight away |
| The auth service is down | 3 checks in a row answer something else than `200` | `GET /health/ready` of `auth_a` | critical | the founder, straight away |
| The error rate is too high | more than 5 % of the requests of the last minute answer 5xx, and there were at least 20 requests in that minute | the access log of the edge | high | the founder, the same day |
| The database is full | the disk of the database volume is more than 85 % used | `df` on the volume of the database | high | the founder, the same day |
| The backup is too old | the newest dump is more than 26 hours old, or there is no dump at all | the modification time of the newest dump in the backup folder | high | the founder, the same day |
| The certificate is about to expire | less than 14 days left on the certificate of the edge | `openssl x509 -enddate` on the certificates of the edge | medium | the founder, within two working days |
| The disk is full | the disk of the backup folder is more than 85 % used | `df` on the backup folder | high | the founder, the same day |

Two rules that are not alerts but that the heartbeat keeps an eye on:

- The service answers again after an alert: the heartbeat sends a "resolved"
  message, so the channel shows when the incident is over.
- The same alert is not sent twice inside the cooldown (15 minutes by
  default), so a broken service does not fill the channel.

## What each alert means

### The API is down (critical)

The couriers can sign in (the auth service is a different process) but the
app cannot record a delivery, cannot read the earnings and cannot sync.

What to do: the runbook, "The API does not answer"
(`docs/operations/RUNBOOK.md`). The first question is always the same: is it
the new version or the database? The answer is in the version the health
endpoint reports and in the log of the container.

### The auth service is down (critical)

Nobody can sign in. The signed-in couriers keep working until their token
expires.

What to do: the runbook, "The auth service does not answer". The usual
cause is the database: the auth service keeps its sessions and its keys
there.

### The error rate is too high (high)

More than 5 % of the requests answer 5xx. The couriers see errors, but the
service is still up.

What to do: look at the log of the edge and at the log of the API for the
same minute. A burst of 500 on one route is a bug in the new version: roll
it back (`infra/zero-downtime.md`).

### The database is full (high)

The disk of the database volume is more than 85 % used. At 95 % PostgreSQL
refuses writes, and the couriers lose their deliveries until the disk is
freed.

What to do: the runbook, "The disk of the database is full". The order is:
the old logs of the containers, the old images, the old backups. The data is
never deleted to make room.

### The backup is too old (high)

The newest dump is more than 26 hours old. If the disk breaks now, the work
of a whole day is gone.

What to do: run the backup by hand and find out why the schedule did not
run (the runbook, "The backup did not run").

### The certificate is about to expire (medium)

The edge serves a certificate that expires in less than 14 days. Caddy
renews it by itself, but a renewal that fails (the DNS was changed, the port
80 is blocked) shows up here first.

What to do: the runbook, "The certificate is about to expire".

## What the heartbeat cannot see

- The **latency** of the answers. There is no metrics endpoint yet; the
  budget of the cold start and of the route time is measured in the
  benchmarks of the app (`docs/evidence/performance/`).
- **The errors of the app itself** (a crash of the app on the phone, a
  failed voice command). Those go to the error tracker, not to the
  heartbeat.
- **The cost** of the cloud. The monthly report is in `docs/product/COST_PLAN.md`.
- A mounted file it has **no read permission for** (the container runs as
  uid 10001): the check then logs "skipped" every round instead of going
  quiet. If a check the operator expects never appears in the log, the
  permissions of that mount are the first thing to look at.
