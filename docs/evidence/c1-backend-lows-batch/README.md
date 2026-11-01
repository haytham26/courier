# The C1 lows batch (the backend squad's rows)

One PR, one branch (`c1-backend-lows-batch`), one register row closed per commit. Every
row is fixed at its root with a red-first test: the suite runs against `origin/main`'s
modules first and the output is quoted here, then the fix lands and the suite is green.
The lead's own lows (mobile, `.maestro`, the CI scripts) are on `fix/c1-lows-batch` (PR
#166) and are **not** in this file.

## The rows this batch closes

BUG-118, 119, 120, 135, 136, 138, 143, 144, 145, 155, 156, 157, 158, 159, and the new
**BUG-163** (the repository's own `docker-compose.yml` Postgres, whose image carries no
`vector` library).

## How each row was proven

| Row | The red before | The green after | The root it was fixed at |
|-----|----------------|-----------------|--------------------------|
| BUG-118 | the address-less stop answered `500 an internal error occurred`, twice | 520 passed | `app/locations.py`'s guarded derivation, shared by both callers |
| BUG-135 | 3 red against origin/main: hasattr, the module still naming it, the query-string read twice | 3 green | app/auth/websocket.py: the dead export and the imports only it used are deleted, and the suite pins the deletion |
| BUG-136 | unused exported symbols in app/auth: [get_verifier_override] | 3 green | app/auth/jwks.py: the getter and its false docstring are deleted, and TestNoUnusedExportedSymbolRemains reads the module public names |
| BUG-138 | DID NOT RAISE InvalidTokenError on both the empty and the blank subject | 66 passed | app/auth/jwks.py: the subject is validated where it is assigned (a non-blank string, or an InvalidTokenError) |
| BUG-145 | the fresh row was applied and the shift index grew before the failing row (Left contains one more item) | 3 green, and 27 in the sync suites | app/repo.py: the decision is made first, the mutations happen once, after it |
| BUG-155 | on the 25-hour day the rolling window reset 24 h after the first call, at 23:30 on 5 April (assert 0.0 == 0.02) | 3 green, and 210 in the voice suite | services/courier-voice/app/cost.py: the reset compares the New Zealand date, and tzdata rides behind a win32 marker |
| BUG-159 | uv.lock carried no mutmut entry, so uv sync --frozen silently omitted it | uv lock resolves 55 packages and uv sync --frozen installs mutmut 3.8.1 and tzdata 2026.6 | services/courier-voice: uv lock re-run and committed, with the win32 tzdata the calendar day needs |
| BUG-158 | the new tests answered KeyError: platform, and the Python version did not match platform.python_version() | 2 green, 10 in the harness suite | services/courier-voice/app/eval_harness.py: the interpreter and the machine are read, not written |
| BUG-157 | the header carried transcript and every row its verbatim words | 2 green, 12 in the harness suite, and the tracked artifact regenerated with digests | services/courier-voice/app/eval_harness.py: the transcript column is a 16-hex-character digest of the words |
| BUG-120 | a broken insert answered 500 with "an internal error occurred" and left the object in place | 2 green, and 538 in the API suite | services/api/app/main.py: the failed insert deletes the bytes it just wrote and names the reason, with PodStore.delete as the pairing half of save |
