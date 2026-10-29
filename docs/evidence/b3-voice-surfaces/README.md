# Evidence — B3's second item: the voice service's two public surfaces (BUG-059)

The audit's B3 and BUG-059 name `/v1/engines` and `/v1/licences` unauthenticated. Both live in the
**voice service** (`services/courier-voice`), not the API, and the service's own module docstring
said the opposite: _"Every call is authenticated with the courier's own token"_. The two routes
were the exception — the docstring was lying.

## What changed

| File                                        | Change                                                                                                                                                                                                                      |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `services/courier-voice/app/main.py`        | `engines` and `ledger` take `principal: Annotated[Principal, Depends(get_principal)]`; the module docstring's claim now carries `and only to a caller with the courier's own token`                                         |
| `services/courier-voice/tests/test_http.py` | `test_the_engines_are_not_public` and `test_the_licences_are_not_public` — each builds the service with **no** dependency override and asserts 401, the same shape as the existing `test_a_call_without_a_token_is_refused` |

## The order, per the playbook

**RED first.** Both new tests were written before the change and were red:

```
FAILED tests/test_http.py::test_the_engines_are_not_public - assert 200 == 401
FAILED tests/test_http.py::test_the_licences_are_not_public - assert 200 == 401
```

**Then the two-line fix per route** (the dependency), which turned them green with every other test
in the file still passing (25).

## Gates, locally

| Command                                                          | Result                       |
| ---------------------------------------------------------------- | ---------------------------- |
| `uv run --directory services/courier-voice ruff check app tests` | clean                        |
| `uv run --directory services/courier-voice ruff format`          | clean                        |
| `uv run --directory services/courier-voice mypy app tests`       | no issues in 38 source files |
| `uv run --directory services/courier-voice pytest -q`            | **168 passed**               |
| `node scripts/ci/check-floor.mjs origin/main`                    | clean                        |
| `node scripts/ci/check-workflows.mjs`                            | clean                        |
| `node scripts/ci/check-doc-links.mjs`                            | clean                        |

## What is not in this slice

- **The licence ledger's public-facing alternative.** The handover's option was to keep it public
  with a written reason (an ADR). That is a product decision, not a backend one: the audit's own
  words are _"Authenticate or rate-limit the probes"_, and authentication is the cheaper, safer
  default. If the founder wants the ledger public (a Play-policy style transparency argument), it
  needs an ADR of its own.
- **`response_model` on the API's 19 handlers** and the contract guard that pins them: the next item.
- **The fixture hoist and the bounded voice stores** (`driver_settings`): also BUG-059's wording.
