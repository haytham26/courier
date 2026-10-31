# C1's auth-service mediums, and BUG-128's honest stop

**Date:** 2026-10-31 · **Owner:** the backend squad (auth) · **Task:** C1's fix order — the medium
findings go with the code they touch, so the rows that live in `services/auth/src` are one slice.

## The rows closed here

| Row | What was red before | The fix |
|---|---|---|
| BUG-129 | a handler that rejects took the process down (Node's default) | `src/http.ts` awaits the handler per request, answers 500 and logs it; `installFailureHandlers()` adds `unhandledRejection`/`uncaughtException` |
| BUG-130 | no body limit: an unauthenticated caller could make the service buffer a gigabyte | `MAX_BODY_BYTES` (256 KB) in `src/http.ts`, answered 413 before the handler is called |
| BUG-132 | `rateLimit.enabled: true` hard-coded, no window override | `AUTH_RATE_LIMIT_ENABLED` and `AUTH_RATE_LIMIT_WINDOW` in `loadConfig` |
| BUG-133 | `passkey.origin` defaulted to `https://${rpID}` and was never cross-checked | derived from `BETTER_AUTH_URL`, and refused by name when its host is not the rpID's own or beneath it |
| BUG-134 | `parseCsv` filtered only on length, so `*` booted and disabled the origin check while reporting it on | every entry must be a concrete origin; `*` and a bare host never boot |
| BUG-137 | a wrong-but-non-empty configuration booted healthy and then refused everything with "not set up on this server yet" | the health body reports the configured methods and the origin |

BUG-129 and BUG-130 were already closed by the code that replaced the service's own server in the
previous PR (`src/http.ts`); their rows are closed here with that code's tests
(`src/__tests__/http.test.ts`, driven against the real listener).

**Tests, red first:** `src/__tests__/config.test.ts` (14 new checks: the wildcard, the bare host,
the concrete list, the origin's default, the off-rpID refusal, the subdomain that is accepted, the
limiter's switch/window/bound, the empty and whitespace values) and `src/__tests__/health.test.ts`
(the new body). 88 auth tests pass, `tsc --noEmit` and eslint clean.

## BUG-128: what was tried, and why it stops here

The register's fix is a short timeout plus a fail-open-with-log. Better Auth 1.7.10's
`haveIBeenPwned` plugin carries no `timeout` option (in `@better-fetch/fetch` 1.3.2 the abort timer
is armed only when `timeout` is set) and answers a 500 when the corpus is unreachable. Three
attempts were made to carry the two missing properties on our own:

1. **A bounded check in `src/http.ts`** (the service's own server, which reads the credential
   bodies already) — correct in production, but the suite drives `AuthTestClient` straight through
   `auth.handler`, so it would have left the existing behaviour untested and its two tests red for
   the wrong reason.
2. **The top-level `hooks.before`** — it is a single `MiddlewareHandler` function in this version,
   and a returned `Response` did not short-circuit the route (both `new Response(...)` and
   `ctx.json(..., {status: 400})` were tried; the request still reached the handler and 200 was
   answered).
3. **An in-repo plugin** with the documented `matcher`/`handler` hooks — `createAuthMiddleware` is
   not exported from the package's entry points, and the object was rejected by the compiler as a
   plugin without it.

So the row stays **open**, with the reason and the attempts written into its Fix column rather than
a fix that does not work. What is available today: `AUTH_HIBP_ENABLED=false` (a switch the
deployment can set when it would rather accept than block during a third-party outage), and the
k-anonymity shape (only the SHA-1's first five characters leave the service), which the existing
`password-policy.test.ts` pins and keeps green.

The next session's cheapest decisive experiment is (1) with the suite moved onto the service's own
server, or the library's own plugin forked under the D24 permissive-licence rule.


## The review pass on this PR, and what it corrected (2026-10-31)

The fresh-context review (Playbook 14.4) of this branch found that two rows were marked `fixed`
against code that exists on no branch, and the table above overclaims accordingly. Corrected, per
the register's own discipline (the BUG-128 pattern of an honest stop with its reason):

- **BUG-129 and BUG-130** stay `fixed`: their code (`src/http.ts`, the awaited per-request handler,
  the 500 answer, `installFailureHandlers()`, `MAX_BODY_BYTES`) is on the sibling PR #138's branch
  (`c1-backend-fixes`), which merges before this branch does, so the state is true at this PR's
  merge. The claim is now written down instead of implied.
- **BUG-132** is reopened. The env exposure landed here (`AUTH_RATE_LIMIT_ENABLED`,
  `AUTH_RATE_LIMIT_WINDOW`, pinned by `config.test.ts`); the other half - backing the limiter with
  the Valkey the compose stack already provides - did not: Better Auth 1.7.10's limiter storage has
  no external wiring on any branch, so the buckets stay per-process and two replicas still give 2x.
- **BUG-137** is reopened. The health body landed here; the fail-fast-on-a-non-production-default
  half did not.

The review also found BUG-133's fail-fast was one-sided (it ran only on the operator-typed
`AUTH_PASSKEY_ORIGIN`, so a derived origin whose host is off the rpID booted silently). Fixed: the
check now runs on the derived value too (passkeys enabled), with two new red-first cases in
`config.test.ts` - a derived origin off the rpID is refused by name, and one on the rpID is
accepted. `infra/env.example` now documents `AUTH_RATE_LIMIT_ENABLED` and
`AUTH_RATE_LIMIT_WINDOW`, which were missing.
