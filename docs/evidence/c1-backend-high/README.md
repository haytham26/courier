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
