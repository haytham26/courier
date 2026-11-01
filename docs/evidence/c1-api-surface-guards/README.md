# The API surface: one copilot client, and a day the router refuses (BUG-116, 117)

**Date:** 2026-11-01 · **Owner:** the backend squad · **Task:** C1's fix order — the two rows on the
API's own surface (the agent client and the routing boundary).

## What was wrong

```
agents/copilot.py: client = client or anthropic.Anthropic()      # per utterance: a pool each, never closed, 600 s default
main.py (voice socket): intent = copilot.interpret(text, state)   # blocking, unbounded, in an async loop
routing.py: _matrices(points, speed_kmh)                          # dense (n+2)^2 int64 x2, O(n^2) fill, uncapped
```

## The fixes

**BUG-116 — one client, bounded twice.** `_shared_client()` builds the process's one
`anthropic.Anthropic` lazily under a lock (built on first use because the module is imported by the
test suite without a key; the lock because the voice socket's loop is a thread pool). It carries
`timeout=30.0` and `max_retries=2` instead of the SDK's default of no timeout at all (600 s total).
The socket's loop bounds one turn with `asyncio.wait_for(..., timeout=75)` around the blocking
`interpret` in a worker thread — awaited in a thread is the only way an async budget can interrupt a
blocking call, and a stalled gateway then answers the existing fallback instead of parking the
socket. The conftest gives the agent tests a placeholder key.

**BUG-117 — the day has a size.** `_build_plan` refuses a day over `MAX_ROUTE_STOPS` (500, the same
number the events batch uses) by name. It is the one funnel every planning path goes through — the
engines, the template lock and the partial reopt — so one check covers them all, and the dense
matrices and the fill are never built for an oversized day. The app answers it as a 422 that names
the cap and the day's size (`RouteTooLargeError` → an exception handler, not three try/excepts).

## Red first

Against `origin/main`'s modules (the fixed files restored from a temp copy afterwards):

```
=== the copilot tests ===
FAILED test_the_client_is_built_once_and_shared
  - AttributeError: module 'app.agents.copilot' has no attribute '_shared_client'
FAILED test_the_client_carries_an_explicit_timeout_and_retries
  - AttributeError: module 'app.agents.copilot' has no attribute '_shared_client'
=== the routing tests ===
E   ImportError: cannot import name 'MAX_ROUTE_STOPS' from 'app.routing'
```

## The gates on the branch

- `services/api`: 499 passed, 1 skipped · ruff clean · mypy clean (the lazy cell rather than a
  `global` statement, per PLW0603).
- Conflict markers and mojibake clean.
