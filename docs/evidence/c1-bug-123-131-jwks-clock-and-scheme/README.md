# BUG-123 and BUG-131 — the clock tolerance and the JWKS hop

**Date:** 2026-10-31 · **Owner:** the backend squad (auth) · **Task:** C1's fix order — the API auth
rows, the first group of the mediums that remain.

**The rows:** BUG-123 (`jwt.decode` with PyJWT's default `leeway=0`, so a second of drift between
the API and the auth service refuses a validly issued token) and BUG-131 (`AUTH_JWKS_URL` has no
scheme check and the compose default is plaintext `http://auth:3001/...`, so a network-adjacent
attacker who can read or substitute that hop can have every forged token accepted).

## What was wrong

```
api/app/auth/jwks.py: claims = jwt.decode(..., options={"require": [...]})   # no leeway
api/app/auth/jwks.py: auth_jwks_url: str = ""                                # no scheme check
infra/compose.prod.yml:118: AUTH_JWKS_URL: http://auth:3001/api/auth/jwks   # plaintext by default
```

The voice service (`services/courier-voice/app/auth.py`) carried the identical decode and the
identical unvalidated URL, and the two resource servers sharing one auth service was already
BUG-126's lesson: they must not disagree about a valid token.

## The fix, both halves, both surfaces

**BUG-123 — the tolerance.** `auth_jwt_leeway_seconds` (default 30) is passed to `jwt.decode` on
both surfaces. The register's fix: "so small skew is tolerated and the failure mode is a re-issue
rather than a hard 401" — the bound is pinned by a test that an hour-expired token is still
refused.

**BUG-131 — the hop.** Three parts:

1. `AUTH_JWKS_URL` is validated at startup: absolute, `https://` always allowed, plaintext `http://`
   only to loopback (a hop that never leaves the machine — that is also what the tests' placeholder
   uses) or to a host named in `AUTH_JWKS_INTERNAL_HOSTS`. The compose trees now name their `auth`
   service there, so the plaintext hop is an explicit, visible decision rather than a tolerated
   default.
2. `AUTH_JWKS_KEY_FINGERPRINTS`: when set, every key a refreshed document serves must carry one of
   the pinned sha256 digests (over the key's canonical sorted-JSON form), so a substituted key pair
   is refused per refresh — the MITM the scheme check alone cannot stop. The check runs **before**
   the keys are installed, so a refused document leaves the cache as it was.
3. The same validator and the same digest function on the voice surface (the compose tree passes one
   `AUTH_JWKS_URL` to both services). Both suites pin their own fixed cases, so a change on one
   side alone goes red.

`infra/env.example` documents both new variables with the operator-facing command that computes a
fingerprint.

## Red first

Against `origin/c1-backend-fixes`'s (pre-fix) modules, the new tests fail:

```
=== API ===
E   ImportError: cannot import name 'canonical_jwk_digest' from 'app.auth.jwks'
=== voice ===
FAILED tests/test_auth.py::test_a_token_one_second_past_its_expiry_is_accepted
  - app.auth.InvalidTokenError: Signature has expired        <- the register's own symptom
FAILED tests/test_auth.py::test_a_substituted_key_is_refused_by_the_pin_and_the_cache_is_left_alone
  - ImportError: cannot import name 'canonical_jwk_digest' from 'app.auth'
FAILED tests/test_auth.py::test_the_digest_matches_the_api_side_of_the_contract
  - ImportError: cannot import name 'canonical_jwk_digest' from 'app.auth'
```

Green after: the API 511 passed (12 new cases in `TestTheClockTolerance`,
`TestTheJwksUrlCarriesItsScheme`, `TestThePinnedFingerprints`), the voice service 207 passed
(10 new cases), ruff and mypy clean on both. The voice suite's existing
`test_an_expired_token_is_refused` now expires a token by a minute instead of ten seconds: ten
seconds was inside the tolerance BUG-123 deliberately adds, and the test's claim ("an expired
token is refused") is unchanged for a token that is actually expired.

## The gates on the branch

- `services/api`: 506 passed, 1 skipped, 17 deselected · ruff clean · mypy clean.
- `services/courier-voice`: 201 passed · ruff clean · mypy clean.
- The compose files parse; `check-workflows`, `check-conflict-markers`, `check-mojibake`,
  `check-doc-links`, `check-floor` clean.


## The review pass on this PR, and what it corrected (2026-10-31)

The fresh-context review (Playbook 14.4) found the security halves real and the shapes coherent, and
three things worth changing. All are landed:

1. **The pin's production value was inert** — `AUTH_JWKS_KEY_FINGERPRINTS` defaults to empty and was
   set nowhere, so the second half of BUG-131 protected nothing in any deployment while the register
   implied it did. The mechanism is now recorded honestly: the check is fixed, and the pin's VALUE is
   an operator decision (the auth service generates its key pair per deployment), documented in
   `infra/env.example` with the command that computes it — exactly the shape of the issuer's public
   name. The register row says that instead of implying the pin is active everywhere.
2. **The cross-service digest test proved nothing** — it compared the voice digest to itself, so "a
   change on one side alone goes red" was false. Both suites now assert one literal JWK's digest
   (`test_the_digest_of_the_known_answer_key_is_the_pinned_value`, the known-answer vector
   `73c28f01…`), so the two implementations of the canonical form are pinned against each other.
3. **The register's totals line** matched the rows again (check-parity re-derives them).

Also landed from the review: the leeway is bounded (`0 < value <= 300` — a fat-fingered 3600 would
open an hour's replay window), the voice service carries the API's absolute-URL refusal (the two
surfaces must not disagree about what they will fetch), the startup diagnostic carries the real
validation message instead of "missing env" for a value that is set but refused, the voice socket's
pin message is generic (BUG-125's oracle: an unauthenticated caller must not learn that pinning is
active), the bracketed IPv6 loopback literal is exercised, both service READMEs document the new
variables, and the test names say what they prove.
