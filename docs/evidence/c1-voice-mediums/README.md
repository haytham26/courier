# The voice surfaces: the socket's deadline and oracle, the two verifiers, and the guard/limiter/memory bounds (BUG-124, 125, 126, 149, 151, 152, 153, 154)

**Date:** 2026-11-01 · **Owner:** the backend squad · **Task:** C1's fix order — the mediums that live
on the voice surfaces. The register's paths name the API's `auth/websocket.py` and `auth/jwks.py`
for BUG-124/125/126 and the voice service's `memory.py`/`cost.py`/`main.py` for the rest; both
services are in this slice because one feature - the courier talking to his day - runs through both.

## The API's socket: three rows

**BUG-124 — the handshake has a deadline.** The route accepts the socket before identity is proven
(an accepted socket is the only thing a refusal can be delivered to), and `identify` blocked in
`await websocket.receive_json()` with no timeout: a client that connected and sent nothing parked
the coroutine, the task and the socket forever. The read is now
`asyncio.wait_for(..., timeout=IDENTIFY_TIMEOUT_SECONDS)` (10 s), and the refusal says "no
credential within 10 seconds", so an idle client is closed rather than parked. A prompt client is
unaffected (the token path is unchanged).

**BUG-125 — the refusal is not a token-state oracle.** Two halves: the caller's answer is one stable
sentence ("the token is not valid") with the verifier's own reason in the service's log, and the
refusal's *category* rides in the close code (4403 for no usable token, 4405 for one that did not
verify), so a half-closed socket — which never sees the frame — still gets an answer.

**BUG-126 — one verifier for both surfaces.** The two `lru_cache` getters each built their own
`JwksVerifier` with its own `httpx.Client` and its own 300 s key cache, so a rotation was picked up
at different moments and a valid token could be accepted on `/auth/me` and refused on the voice
channel for up to five minutes. Both getters now hand out one cached instance, and the voice route
resolves its verifier through the override table (`get_verifier`'s override first), so the suite's
single override still covers both surfaces.

## The voice service: five rows

**BUG-149 — `remember: false` keeps nothing.** It cleared only two string fields while the stops,
addresses, hazard, tip and earnings stayed in `context` and were re-saved on every later turn. The
setting now lets go of the whole session (`memory.forget()` plus the turn machine), and the turn
handler does not write the context back when the memory is off.

**BUG-151 — the store is bounded.** One process holds at most `MAX_SESSIONS` (1,000) shifts in an
LRU by use, and one courier may not open more than `MAX_SESSIONS_PER_DRIVER` (20) — the route
refuses with a 429 that names the cap and the DELETE that closes one, rather than silently
evicting a working day.

**BUG-152 and BUG-153 — the guard reserves before it spends.** The check and the charge sat on
either side of the blocking gateway call, so concurrent turns all passed the check (the register's
probe: 16 turns against a cap of 3 calls, all 16 let through, 5.3x the cap) and the check never
asked what the pending call costs (a 0.02 call charged in full against a 0.01 cap). `may_spend` now
reserves the call's worst case inside the lock before the call, and `charge` gives the reserve back
and charges the real cost; a charge that never had a reserve (a direct caller, the existing tests)
is simply added, so the old shape still works.

**BUG-154 — one shift's turns are serialised.** The store now hands out a per-session lock
(created under a guard, so two threads get the same object) and the turn route runs each turn
inside it: two concurrent turns cannot interleave their phase, history and context, and a different
session's turns still run in parallel.

## Red first

Against `origin/main`'s modules (the fixed files restored from a temp copy afterwards):

```
=== the voice tests ===
FAILED test_the_day_is_not_kept (context/learned survived)
FAILED test_one_courier_cannot_open_an_unbounded_number_of_shifts
FAILED test_the_oldest_untouched_session_goes_first
FAILED test_the_lock_is_one_per_session
FAILED test_two_turns_on_one_shift_do_not_interleave
FAILED test_concurrent_turns_cannot_all_pass_a_spent_cap
FAILED test_a_call_that_costs_more_than_is_left_is_refused
=== the websocket tests ===
E   ImportError: cannot import name 'CLOSE_INVALID_TOKEN' from 'app.auth.websocket'
```

## The gates on the branch

- `services/api`: 519 passed, 1 skipped · ruff clean · mypy clean (the voice socket's suite
  included).
- `services/courier-voice`: 216 passed · ruff clean · mypy clean.
- Conflict markers and mojibake clean.


## BUG-128: the third session, and the approach that worked

The register's own note named the cheapest decisive experiment: the bounded
check in `src/http.ts` **with the suite moved onto the service's own server**.
The two earlier attempts failed because the suite drove `auth.handler`
directly (so nothing the service's own server does was ever tested) and because
a top-level `hooks.before` in this Better Auth version does not short-circuit
the route.

**What landed.** Better Auth's `haveIBeenPwned` plugin's outbound call carries
no timeout at all (`@better-fetch/fetch` 1.3.2 arms the abort timer only when
`timeout` is set), so a PwnedPasswords outage made sign-up fail closed with a
500. The live check is now in `src/http.ts`, in front of the handler:

- `passwordOf` reads the password only on the three paths that set one
  (`/sign-up/email`, `/change-password`, `/reset-password`);
- `breachedPasswordVerdict` races the k-anonymity range call against
  `AUTH_HIBP_TIMEOUT_MS` (2 s default) **explicitly** (`Promise.race`, not only
  `AbortSignal.timeout`), because a caller that ignores the signal — a proxy, a
  stub, an accepted connection — would otherwise park the request anyway;
- `breached` answers the same 400 and the same wording the plugin used ("Password
  is compromised. Please choose another."), so the contract the app sees does
  not change;
- `unknown` (a timeout, a reset, an outage, a non-200) **fails open**: the
  request goes through and `console.warn` carries the reason — the register's
  "fail-open-with-log".

The plugin is off by default (`hibpPlugin` in the config, `AUTH_HIBP_PLUGIN=true`
to add it back) and the `AUTH_HIBP_ENABLED` switch still plumbs the same flag
name, so a deployment's env does not change. The k-anonymity shape is unchanged
(only the SHA-1's first five characters leave the service), still pinned.

**The suite moved.** `password-policy.test.ts` now drives the real listener from
`createServer` (`aServerOn` from `http.test.ts`, extended with an env parameter),
which is the only place the reachability policy can be proven. The length bound
stays on `AuthTestClient` because it is the handler's own behaviour. The setup
stub gained `setPwnedBehaviour({hangFor})` — the corpus that never answers, so
the deadline is what turns it into a fail-open sign-up.

**Red first**, quoted per case:

```
=== against origin/main's modules ===
× refuses a password in the breached corpus
× sends only the five-character SHA-1 prefix (the k-anonymity shape)
× carries a deadline the plugin never had (BUG-128)
× refuses a breached password again once the corpus answers
=== restored ===
23 passed
```
