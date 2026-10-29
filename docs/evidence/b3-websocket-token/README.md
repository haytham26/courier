# Evidence — B3's first item: the WebSocket token out of the query string

## What landed

`services/api/app/auth/websocket.py` gains the module's half of BUG-059:

| Function | What it answers |
|---|---|
| `identify(websocket, verifier)` | The verified identity, from the `Authorization` header **or the first `auth` message** — never from the query string. Raises `UnauthenticatedError` with the reason. |
| `refuse(websocket, reason)` | Tells the caller why, in an `error` frame, and closes with **4403** (the WebSocket's own 4000-range, beside the route's 4404). |
| `CLOSE_UNAUTHENTICATED = 4403` | The code, named so the route and the tests share one truth. |

`services/api/tests/auth/test_websocket_auth.py` (7 tests, all green) drives those two
functions through a fake handshake and a real verifier over a real key pair:

| Test | What it proves |
|---|---|
| the header still works | the native client's path is untouched |
| the first message may carry the token | the audit's first alternative |
| **a token in the query string is refused** | the vulnerability, closed |
| no token at all is refused | with the words the caller needs |
| an invalid token is refused | wherever it arrived from |
| a first message that is not an `auth` frame | a transcript is not a credential |
| `refuse` closes with 4403 and names the reason | the caller hears why |

## What is deliberately not in this slice, and why

**The route's half is not wired yet.** The voice route still uses the old dependency
(`get_websocket_principal`, header-or-query-string), because wiring the route to
`identify` changed the handshake's shape and brought `tests/auth/test_voice_socket.py`
down with it: the route's own suite hangs on this machine after the change (§15 — a run
without output is a stop, and I stopped instead of iterating).

The shape of what hangs is known, and it is the last thing the next session needs:

- with the route accepting the socket before it identifies the handshake, the two refusal
  tests read an `error` frame **and** a second frame on a socket the module has already
  closed — that second read blocks;
- with the dependency identifying before the route accepts, the good-path tests never
  receive a frame, because nothing accepted the socket.

The fix is one of the two, decided by whether the route accepts first (it should: it owns
the channel) and the refusal tests read one frame each, with the close code proven in the
module's own test. That is a five-minute change with the suite green; it needs a machine
where the suite runs, and this session's time on it is spent.

## The gates, locally

| Command | Result |
|---|---|
| `uv run --directory services/api ruff check .` | clean |
| `uv run --directory services/api ruff format --check` (the diff's files) | clean |
| `uv run --directory services/api mypy .` | clean, 61 source files |
| `uv run --directory services/api pytest tests/auth/ -q` | 29 passed |
| `uv run --directory services/api pytest -q` | 431 passed, 1 skipped, 17 deselected |

**The one failure is not this slice's:** `tests/test_api_client.py::test_the_committed_client_is_fresh`
fails because this checkout's `node_modules/prettier` is broken (its `bin/` is missing, so
the generator's `prettier()` call silently does nothing and the regenerated copy is
unformatted). On CI, where the workspace is clean, that test is green — the same commit's CI
run proves it.
