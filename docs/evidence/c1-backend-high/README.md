# C1's backend highs, fixed (red first)

**Date:** 2026-10-31 · **Owner:** the backend squad · **Task:** C1's fix order — the registered HIGH
findings first, then BUG-115 (medium, but a delivered stop reads `pending` on Postgres, so the
courier's day is a lie and the trial cannot run).

**The PR:** one branch, one PR, the nine rows closed in it. Every fix below was RED first against the
unfixed code; the red output is quoted per row, and every suite was re-run green afterwards.

## The order of the work, and what proved each row

| Row | Severity | What the red test printed before the fix | Where the test is now |
|-----|----------|------------------------------------------|------------------------|
| BUG-096 | HIGH | `not ok - the state holds the api image that was running (expected [courier-api:old-sha], got [courier-api:new-sha])` — the deploy recorded the image it was deploying and a rollback re-deployed the failure | `scripts/ci/test-deploy.sh` (10 checks, the real `infra/deploy.sh` with a stubbed docker) |
| BUG-121 | HIGH | `assert 4 == 1` — four tokens with the same bogus `kid` fetched the JWKS four times | `services/api/tests/auth/test_jwks.py::TestTheNegativeCache` |
| BUG-122 | HIGH | `DID NOT RAISE ValueError` for `auth_jwt_issuer="not-a-url"`, for a path and for a query | `…::TestTheIssuerTheApiAccepts` + `scripts/ci/check-auth-issuer.mjs` and its 10-check test |
| BUG-127 | HIGH | eight attempts at one account from eight different IPs: all eight reached the handler | `services/auth/src/__tests__/http.test.ts` (13 tests against the real listener) |
| BUG-146 | HIGH | `assert user.count("</transcript>") == 1` → `2 == 1`; `assert "<role>system</role>" not in user` failed | `services/courier-voice/tests/test_prompt_fence.py` |
| BUG-147 / BUG-148 | HIGH | `ImportError: cannot import name 'RunForbidden'` (the distinct outcome did not exist), and the 403 answering transport came back as `[]` | `services/courier-voice/tests/test_run_client.py` |
| BUG-150 | HIGH | `ImportError: cannot import name 'MAX_LEARNED_ENTRIES'` — nothing bounded the collections | `services/courier-voice/tests/test_context_bounds.py` |

Two decisions worth writing down, because they are the places where the fix could have gone
further than it should:

1. **BUG-148 keeps the offline fallback.** The register's fix says "reject `body.context` when the
   session has a `shift_id`". A refusal (401/403) now fails the turn with a 403, and a session that
   *names* a shift can no longer carry the caller's snapshot of it — that is the demonstrated attack
   (a driver posting another courier's run snapshot got the voice to answer from it). What survives
   is the dead-spot path the module is built on: an unnamed session's phone snapshot, and a named
   shift whose API cannot be *reached* (a transport error), which the module's docstring has always
   promised. The distinction is "the API refused" versus "the API could not answer".
2. **BUG-127 adds the bucket Better Auth cannot hold.** Its limiter is keyed by
   `createRateLimitKey(ip, path)` and `customRules` can change the window and the count but never
   the key, so the account bucket is a limiter in front of the handler (in `src/http.ts`, the
   service's own server) rather than a configuration change. That same server also took the body cap
   (BUG-130) and the failure paths (BUG-129), which are the next two rows on the same lines and are
   not closed by this PR.

## One new row, filed with the PR

**BUG-160** (medium): `RunClient._stop_of` read the phone's own row shape and not the API's, so
every stop `GET /shifts/{shift_id}/stops` answered with arrived with an empty address. It was found
while fixing BUG-148 — the tests pinned a shape the API does not produce — and it is fixed in the
same rows, with the API's `seq`/`address` read and the phone's `number`/`street`/`suburb` kept as the
fallback. The numbering was taken per the rule: the highest row across `origin/main` (BUG-159) and
every open PR branch was 159, so the new row is 160.

## The gates on the branch

- `services/api`: 480 passed, 7 skipped · ruff clean · mypy clean.
- `services/courier-voice`: 194 passed · ruff clean · mypy clean.
- `services/auth`: 90 vitest tests passed · `tsc --noEmit` clean · eslint clean.
- `node --test "scripts/*/__tests__/*.test.mjs"`: 116 passed (10 of them the new issuer gate), plus
  `bash scripts/ci/test-deploy.sh` (10 checks).
- `check-workflows`, `check-floor`, `check-conflict-markers`, `check-control-chars`,
  `check-mojibake`, `check-doc-links`, `check-parity`, `check-auth-issuer`: all clean.
- `Deploy staging`: not re-run in this session — the only change on its path is `infra/deploy.sh`
  (the state file's source), which the stubbed-docker suite covers line by line; the leg runs on
  the push to main and is the first thing this session reads after the merge.

## The red leg on the branch, fixed at its root (2026-10-31)

After the push, two legs went red on the branch's final head (`e1a2a3c`), both with one cause: the
`Test` step of `lint, typecheck, test` and the `Coverage ratchet` job, which runs the same suite:

```
FAILED tests/auth/test_jwks.py::TestTheNegativeCache::test_a_key_that_rotates_in_is_accepted_again
  - app.auth.jwks.InvalidTokenError: unknown signing key 'bogus-kid'
1 failed, 485 passed, 1 skipped, 17 deselected, 1 warning in 26.26s
the API coverage run failed
```

**The root cause is in the test, not in the verifier.** The test faked cache staleness by poking
the private field (`verifier._fetched_at = 0.0`), which only makes the 300 s cache stale when the
machine's `time.monotonic()` reads above 300 s. It passes on a developer box that has been up for
hours and fails on a young CI runner, whose monotonic clock reads below the TTL — proved by running
the same handler with the clock pinned young and old (the probe is out-of-tree, per PLAYBOOK §10):

```
monotonic=120.0: first_in_unknown=True second=REFUSED (unknown signing key 'bogus-kid')
monotonic=5000.0: first_in_unknown=True second=accepted as user-123
```

The product behaviour was right all along: a kid already asked about is not worth a second fetch
(BUG-121), and a stale cache asks again and picks a key that rotated in.

**The fix makes the time injectable, not the assertion weaker.** `JwksVerifier` now takes
`clock: Callable[[], float] = time.monotonic` (the default is unchanged production behaviour), and
the test advances its own clock past the TTL instead of poking a private field. The red-first proof
is the same probe: with the clock held young the rotated key stays refused (one fetch), and with
the clock advanced it is accepted (two fetches). `assert calls["count"] == 2` pins that the refresh
actually happened.

One local-only red was also explained, not chased (PLAYBOOK §6): in a worktree without
`node_modules` the generated-API-client check fails on quote style, because the generator's own
docstring says a missing formatter must make the gate red, never silently green. With the
lockfile's prettier (3.9.10) on the PATH the check passes; CI runs it with prettier installed.

## The second red leg on this branch: the vacuous floor of the Locust gate

With the jwks fix green, the same `Test` job reached the Locust SLO profile for the first time on
this branch's code — and the profile's vacuous guard failed, twice (the push-triggered and the
PR-triggered runs of the same head, both red):

```
VACUOUS RUN: only 99 requests - the gate needs a seeded, reachable API
VACUOUS RUN: only 70 requests - the gate needs a seeded, reachable API
```

Both runs were otherwise healthy: 0 failed requests, no SLO breach (route p95 74 ms against a
5,000 ms budget, sync p95 8 ms against 300 ms, pod p95 8 ms against 2,000 ms), and every one of
the four wanted surfaces exercised. The measured distribution of the same step:

| Run | Requests | Verdict |
|---|---|---|
| #140's head, run 1 | 141 | SLOs met |
| #140's head, run 2 | 175 | SLOs met |
| main `ac49393` | 191 | SLOs met |
| PR #142's head | 177 | SLOs met |
| main `5839178` | 197 | SLOs met |
| this head, push run | 99 | VACUOUS |
| this head, PR run | 70 | VACUOUS |
| this head, local run 1 (a slow Windows box) | 31 | VACUOUS |
| this head, local run 2 (the same box) | 93 | VACUOUS |

The defect is the guard, not the code under test: the count came from a 60 s wall-clock window
(`--run-time 60s`, waits of 3-8 s), so it was a property of the runner's speed, and the floor of
100 sits inside the healthy band. A threshold inside the band is a coin flip, and the luck of a
green is not evidence (§17.4's rule, applied to a gate rather than to a flow).

**The fix makes the count a property of the test.** `loadtests/day_budget.py` reads
`LOADTEST_ITERATIONS` (unset/0/unparseable → uncapped, so the 1,000-driver staging run keeps the
day shape), each user counts its task executions and `StopUser`s at the budget, and the CI step
pins `LOADTEST_ITERATIONS: '8'` — 50 users x 8 tasks, ~400 requests wherever it runs, four times
the floor. The floor itself is untouched (no weakening), every SLO threshold is untouched, and the
sample the p95 numbers are measured over is four times larger. The parse is pinned by
`services/api/tests/test_day_budget.py` (6 cases, red first: the module did not exist —
`ModuleNotFoundError: loadtests.day_budget` — before this change). Gates on this tree: 492
passed, 1 skipped · ruff clean · mypy clean · check-workflows, conflict markers, mojibake, control
chars, doc links and the floor guard all clean.

Known trap recorded per §8: the local reproduction of this profile is itself wall-clock-flaky on
this machine (the JWKS static server goes unanswered and every request times out at 30 s), which
is the same class of defect as the one being fixed — the CI runs above are the measured evidence,
and the PR's own run is the final proof of the budget.
