# The handover — after Step 0 and B3's route half (2026-10-28, second backend session)

## State

- **main at `e763e51`** (`git ls-remote origin refs/heads/main`), clean in this worktree.
- **PR #83 MERGED** — Step 0, the `protect-main` ruleset (403: the token has no Administration: write;
  the row is in FOUNDER_TODO, and every commit of both parts of this session went through a branch
  and a PR).
- **PR #90 OPEN** — B3's route half. `lint, typecheck, test` green on CI (4m44s), `no secrets in
  git` green, `Quality gates` green, `CodeQL` green. The lead's `Build the release APK` leg of
  `Screen recordings` was still `in_progress` at the last check (§16: that leg is theirs; it builds
  `apps/mobile`, which this PR does not touch).
- **This session works in the worktree `.worktrees/b1028`**, because a second backend session was
  working in the main working tree and switched branches underneath the first commit of this
  session. Nothing was lost; the habit is now structural. FOUNDER_TODO carries the ask for one
  backend session at a time.

## The binding order, where it stands

| Item | State |
|---|---|
| **Step 0 — protect main** | MERGED (PR #83). The ruleset could not be created; the row names both fixes. |
| **B3 — the WebSocket route's half** | PR #90. The module's half was PR #75. |
| **B3 — `/v1/engines` and `/v1/licences`** | VERIFIED, NOT FIXED. See below. |
| **B3 — `response_model` on every handler** | VERIFIED, NOT FIXED. See below. |
| **B3 — the fixture hoist, the bounded voice stores** | VERIFIED, NOT FIXED. See below. |
| **B3 — the OWASP MASVS L1 self-review** | not started; `docs/security/` is the target. |
| **B4 — mutmut at the 70 % floor** | not started. |
| **A5's remaining slices, C1, C3, MASTER §22, billing (D44)** | untouched by this session. |

## B3's next three items, verified on the tree (§13 — every claim checked, not inherited)

### 1. `/v1/engines` and `/v1/licences` are unauthenticated — confirmed, in the voice service

They are **not** in `services/api`. They live in `services/courier-voice/app/main.py`:

- `@service.get("/v1/engines", response_model=EngineList)` at **line 227**;
- `@service.get("/v1/licences", response_model=LicenceList)` at **line 235**.

Every other route of that service takes `principal: Annotated[Principal, Depends(get_principal)]`
(lines 148, 163, 171, 183, 200, 213, 221). These two take **nothing** — they are the config probe
BUG-059 names. Two further facts the audit did not have:

- the module docstring at the top of that file says *"Every call is authenticated with the
  courier's own token"* — **false for these two**, so the fix also repairs a docstring that lies;
- both routes already carry a `response_model`, so this item is purely the auth (or rate limit)
  question. The existing tests that drive them are
  `services/courier-voice/tests/test_http.py:178` (`/v1/engines`) and `:186` (`/v1/licences`).

The cheapest fix that keeps the surfaces useful: authenticate them with the same
`Depends(get_principal)` the rest of the service uses, and keep the licence ledger public-facing
only if a written reason is added (ADR). **Red first**: extend `test_http.py` with an anonymous
call to each that asserts 401 — those two tests are red on today's tree.

### 2. `response_model` is missing on every handler of the API — confirmed, and the count is 19

`grep -c "response_model" services/api/app/main.py` prints **0**. There are **19** HTTP handlers
in that file (BUG-059 counted 11 when it was filed; the surface has grown):

`healthz`, `seed_demo_run`, `create_run`, `list_runs`, `get_run`, `upload_pod`, `pod_bytes`,
`pod_url`, `reopt_route`, `put_template`, `shift_route`, `intake_text`, `intake_manifest`,
`billing_webhook`, `get_entitlements`, `list_stops`, `get_location_notes`, `add_location_note`,
`sync_events`.

Every one of them returns a `dict[str, Any]` built by a private helper (`_run_body`,
`_route_body`, `_intake_answer`, `_location_note_body`) or written inline in the handler. The
typed API client is generated from the contract, so the fix is: one Pydantic model per answer
shape in `app/schemas.py` (a new module), `response_model=` on each handler, and the handlers keep
returning their helper's dict (FastAPI validates and serialises).

The gate that makes it stick: `services/api/tests/test_contract.py` compares **paths, methods and
operation ids only** (lines 35-74 build `served_routes()` and `contract_operations()`), which is
exactly BUG-059's "a key rename ships green past the path-only contract guard". Add
`test_every_operation_declares_its_response_schema` that walks the app's own `openapi()` and
asserts each operation has a `responses.200.content` with a real schema — red on today's tree.

### 3. The fixture hoist and the bounded voice stores — confirmed, and the counts differ from the audit

- **`make_stop` / `make_request` are duplicated twice, not three times**: `test_routing.py:44,66`
  and `test_solver.py:51,73`. (The audit said x3 files each; the third copy is gone.)
- **The `InMemoryRepo()` fixture is duplicated in nine test files** — `test_routing.py:90`,
  `test_runs_api.py:59`, `test_sync.py:62`, `test_location_notes.py:32`, `test_intake_api.py:45`,
  `test_entitlements_api.py:29`, `test_demo_seed.py:46`, `auth/test_voice_socket.py:54` (and
  `a_fresh_repo` at :40), plus seven inline uses in `test_billing_providers.py`. `tests/conftest.py`
  exists and is the right home.
- **The voice `driver_settings` store is unbounded**: `services/courier-voice/app/main.py:113`
  `driver_settings: dict[str, VoiceSettings] = {}`, written per session and never evicted. The
  `_sessions` half of BUG-059's wording maps to the same dict; both need a bound and a test that
  the bound holds.

## What this session proved locally, with the commands

| Check | Result |
|---|---|
| `uv sync --directory services/api --extra dev --extra s3test` | worked in the worktree |
| `pytest tests/auth/` | **31 passed** (2.5 s) |
| `pytest` (the whole suite) | **433 passed, 1 skipped**, 1 known local failure: `test_api_client.py::test_the_committed_client_is_fresh` (this checkout's `node_modules/prettier` has no `bin/`, so the freshness check fails locally and passes on CI — already on record) |
| `ruff check app tests` | clean |
| `mypy app tests` | **Success: no issues found in 54 source files** |
| `node scripts/ci/check-doc-links.mjs` | 38 links, every one resolves |

## The hang, and the lesson (already in `docs/evidence/b3-websocket-route/README.md`)

`identify` reads **one first message** when the header is absent, so a refusal test that connects
and reads without writing a frame blocks in `receive_json` forever. Every refusal test in
`test_voice_socket.py` now writes one frame first. That is §15's lesson applied, not repeated.

## A trap for the next session, in one line

PowerShell's `Set-Content -Encoding` accepts `ascii`, not `asascii`, and `Add-Content ..\.gitignore`
from a worktree edits the **main tree's** `.gitignore` (I truncated it once and restored it from
`git show HEAD:.gitignore`). Work inside the worktree; the main tree belongs to the other session.
