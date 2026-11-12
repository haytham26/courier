# The founder's local server — the real app on this PC

*Written 2026-11-12 for the founder's directive item 1: "A LOCAL SERVER SO THE
FOUNDER SEES THE REAL APP NOW (before Oracle)".*

This is the **same app the staging host will serve** — the same API, the same
auth service, the same PostGIS + pgvector database with the contract's own
schema, the same Courier Voice service, and the same Caddy edge with the same
security headers and the same rate limits — running on the founder's own PC and
reached over **HTTPS**, so a phone anywhere can sign in and work a real day.

## The commands

```bash
bash infra/local-stack.sh up       # tunnels, build, stack, the founder's seed, the smoke test
bash infra/local-stack.sh status   # what is running, at which URLs
bash infra/local-stack.sh smoke    # the repo's own smoke test, again, live
bash infra/local-stack.sh down     # stop the stack (the database volume stays)
```

`up` does everything in order: it verifies and starts the two HTTPS tunnels,
writes the environment (the machine's own passwords, generated once and reused),
builds the images, starts the stack and waits for every health check, seeds the
founder's own driver account plus today's Christchurch day, runs
`infra/smoke.sh` against the live edge, and prints the three URLs the app needs.

The **password** is generated on the first `up` and written to
`.local-founder-login.txt` (git-ignored, `chmod 600`) — never to the terminal,
the log, or git. Every later `up` reuses it, so the account is created once.

## The ports it opens

| Port | Bound to | What it is |
|---|---|---|
| `80` | `127.0.0.1` | the edge's HTTP (the tunnel's origin) |
| `8443` | `127.0.0.1` | the edge's HTTPS, local certificate |
| `8001` | `127.0.0.1` | the API, for `curl` and debugging |
| `3002` | `127.0.0.1` | the auth service |
| `8080` | `127.0.0.1` | Courier Voice (the second tunnel's origin) |
| `5433` | `127.0.0.1` | Postgres |
| `6380` | `127.0.0.1` | Valkey |

Everything is bound to the loopback. **The only way in from outside is the
founder's own two HTTPS tunnels**, so the app on the phone reaches the stack the
same way a courier reaches staging.

The debug ports are deliberately **not** the standard ones (5433/8001/3002/6380,
not 5432/8000/3001/6379): the lead's CI stack may be running on this PC at the
same time — it was, on 2026-11-12 — and a second binder on the same port is a
stack that does not start. The two ports that carry the founder's traffic (80 and
8080, the tunnels' origins) are the standard ones and are left free.

## The three URLs the app reads

| Build setting | Value |
|---|---|
| `EXPO_PUBLIC_API_URL` | the edge tunnel's URL |
| `EXPO_PUBLIC_AUTH_URL` | the edge tunnel's URL + `/api/auth` |
| `EXPO_PUBLIC_VOICE_SERVICE_URL` | the voice tunnel's URL |

The live values are printed by `up` (and by `status`), written to
`infra/local/hostnames.env`, and announced in `docs/log/CURRENT-backend.md`.
**A quick tunnel's URL changes every time it restarts**, so after any restart
re-run `up` (or read `status`) and re-announce: the stack is recreated with the
new name, and an app build pointed at the old one would dial a dead host.

## The tunnels, and how they were verified

`infra/cloudflared.sh` downloads **cloudflared 2026.10.7** from Cloudflare's own
release and proves it before it runs: the file's sha256 must equal the pinned
identity (`2493dbc1…`, recorded in that script), and Windows' own
`Get-AuthenticodeSignature` must read the binary as **Valid, signed by
Cloudflare, Inc.** A hijacked download is not signed; a modified one does not
hash the same.

Two tunnels, because the app dials the voice service **directly** — it is not
behind the edge, and splitting one `/v1` prefix across two services would be a
router nobody asked for. One tunnel serves the edge (API + auth); one serves
Courier Voice.

**Licence:** cloudflared is Apache-2.0 (`cloudflare/cloudflared`). It is the
founder's testing tool and is not shipped in the app, so it is not in
`docs/product/LICENSES.md` — that gate reads the mobile app's own dependency
closure. The licence and the verification procedure are recorded here, together.

## What the founder sees

The day is seeded through the app's own demo seed (ADR-019): **one
Christchurch run, five stops** — real Canterbury addresses near the Hornby
depot — with a planned break, a priority stop, a delivery window and a pickup.
Sign in as the founder and the run is there; deliver three, go offline, deliver
one more, reconnect and it syncs.

## The resource budget (the directive's §0)

This PC has **39.6 GB of RAM and 14 cores** (measured 2026-11-12), so the
directive's `>16 GB` rule allows the stack **at most 5 GB and 3 CPUs**.
`infra/compose.local.yml` carries a `mem_limit` and `cpus` on every service
(3.9 GB / 3.0 CPUs in total — the file's header adds them up), and
`C:\Users\DCL\.wslconfig` was raised from 3 GB to **5 GB / 3 CPUs** to hold them
(the previous file is kept at `infra/local/wslconfig.backup-2026-11-12`; it only
takes effect after `wsl --shutdown`, which also stops Docker).

The heavy-job lock (`C:\Users\DCL\projects\.heavy-job.lock`) is held for the
**build and the start only** and released the moment the stack is up — the
running stack never holds it, so the lead can build the app and run BlueStacks
while the founder tests. The long eval jobs (routing, VROOM, mutation) are not
run while this stack is serving.

## What is deliberately NOT here

- **The monitoring heartbeat.** It is the Oracle host's watchdog; a local stack
  the founder is watching does not need a second one.
- **A release-signed APK.** That waits for the founder's keystore secrets
  (FOUNDER_TODO) and, once staging exists, the Main APK workflow publishes it
  against the staging URL.
- **The OmniRoute gateway.** Without a gateway Courier Voice runs its on-device
  engine and answers every command (the service's own README). The server brain
  is the founder's decision, not a local-stack one.
