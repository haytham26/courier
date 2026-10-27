# B3, the route's half: the WebSocket token out of the handshake

**BUG-059, B3's second item.** `docs/plan/AUDIT_2026-10-25.md` §B3 asks for three things of
the WebSocket surface; the module's half (`services/api/app/auth/websocket.py`, PR #75) answered
the first and this slice answers the rest of it on the route side.

## What the route did before

```python
@app.websocket("/shifts/{shift_id}/voice")
async def voice(ws, shift_id, principal: AuthPrincipal = Depends(get_websocket_principal), repo=Depends(get_repo)):
    run = repo.get_run_for_shift(shift_id)      # the database before the handshake
    if run is None or run.courier_id != principal.user_id:
        await ws.accept(); await ws.close(4404) # the only accept on this route
        return
    await ws.accept()
```

The token arrived in the **query string** (`?token=…`), a dependency answered before the socket
was accepted, and a caller with no token got an HTTP 403 on the handshake — no reason, no close
code, nothing a client could read.

## What it does now

```python
    await ws.accept()                       # the route owns the channel
    try:
        verifier = app.dependency_overrides.get(get_websocket_verifier) or get_websocket_verifier
        principal = await identify(ws, verifier())   # header, or the first `auth` message
    except UnauthenticatedError as exc:
        await refuse(ws, exc.reason)        # one `error` frame, then close 4403
        return
    ...
    await ws.close(code=4404)              # the foreign shift: no second accept needed
```

| Before | After |
|---|---|
| token in the URL | token in the `Authorization` header **or the first `auth` message** |
| a valid token in the URL was accepted | a valid token in the URL is **refused with the reason** |
| no token → HTTP 403 on the handshake | no token → accepted, one `error` frame, close **4403** |
| `get_websocket_principal` dependency | `identify` + `refuse`, called by the route |
| the database was read before the handshake | the database is read after `identify` |

## The verifier: why the route calls a getter of its own

`get_verifier` is `lru_cache`d and is what the HTTP routes take through `Depends`. A WebSocket
route **cannot** take it as a dependency here: the dependency is solved *before* the socket is
accepted, and a refusal would then be an HTTP error on the handshake — the exact thing BUG-059 is
removing. But a bare `get_websocket_verifier()` call also cannot use `get_verifier`, because
`dependency_overrides` only reaches a call FastAPI makes itself; the first red run of this slice
proved it:

```
{'type': 'error', 'code': 4403,
 'detail': 'the token is not valid: cannot reach the JWKS endpoint: [WinError 10061] ...'}
```

The tests override `get_websocket_verifier` in `dependency_overrides`; the route resolves the
override (or the default getter) through that same dictionary, so **one entry covers both** and
the production path is unchanged. `services/api/tests/auth/test_voice_socket.py` is the file that
would catch the difference.

## The hang this slice did NOT repeat

The handover of 2026-10-28 recorded that the route's own suite hung when the dependency was wired
to `identify`. It did, and the cause is in the suite, not the module: `identify` reads **one first
message** when the header is absent, so a refusal test that connects and reads without writing a
frame blocks in `receive_json` forever. Every refusal test in this slice therefore writes one
frame first, and `tests/auth/test_voice_socket.py` says why in its module docstring. The
`ws.receive()` loop for the 4404 foreign-shift test is unchanged (it already read up to two
frames and takes one now, with the reason recorded at the assert).

## Red first (PLAYBOOK §14)

The new tests were run against the reverted route (`principal = principal_from_dependency(ws)` in
place of the `identify` call): **7 failed**. Then against `app/auth/jwks.py` alone reverted: the
suite fails to import `get_websocket_verifier`. With the change in place:
`31 passed in 2.49s` (`tests/auth/`), `433 passed, 1 skipped, 1 known local failure`
(`tests/test_api_client.py::test_the_committed_client_is_fresh` — the checkout's broken local
`node_modules/prettier`, already on record in `docs/log/HANDOVER-2026-10-28.md`), and
`ruff check` plus `mypy` clean.

## The files

| Path | What it holds |
|---|---|
| `services/api/app/main.py` | the voice route: accept, identify, refuse, and the 4404 with no second accept |
| `services/api/app/auth/jwks.py` | `get_websocket_verifier`, the WebSocket surface's own getter |
| `services/api/app/auth/websocket.py` | `identify` / `refuse` now cover the route; the old dependency is deprecated, not silently kept |
| `services/api/tests/auth/test_voice_socket.py` | seven tests, both credential paths, four refusals, the 4404, the malformed frame |
| this folder | the evidence |
