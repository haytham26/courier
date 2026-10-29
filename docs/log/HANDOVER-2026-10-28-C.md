# The handover — after the `Deploy staging` red-main fix (2026-10-28, third backend session)

## State

- **main at `4132768`** (`git ls-remote origin refs/heads/main`). The `Deploy staging` workflow
  kicked off against it while this was written (run 40645435652); it is the first push to main
  whose verify leg installs the workspace's dependencies.
- **The other backend session is closed**; this session is the only one, and it works in the
  worktree **`.worktrees/b1028`**.
- **The `protect-main` ruleset** is the founder's to create by hand now (the token was refused
  with 403; the row in `docs/status/FOUNDER_TODO.md` names both fixes). Everything below went
  through a branch and a PR.

| Item | PR | State |
|---|---|---|
| Step 0 — the ruleset refused, FOUNDER_TODO | #83 | MERGED (`e763e51`) |
| B3's route half — the voice socket accepts, then identifies | #90 | MERGED (`d68d780`) |
| The handover after B3's route half | #91 | MERGED (`bb8c728`) |
| The week log (the skills applied) | #92 | MERGED (`1684ea3`) |
| `/v1/engines` + `/v1/licences` authenticate | #93 | MERGED (`12daa00`) — the other session's, and the item I had verified |
| **BUG-070 — `Deploy staging` red on every push to main** | #94 | **MERGED (`4132768`)** |

## BUG-070: what it was, in one paragraph

`Deploy staging` was red on every push to main (runs 40603133483 and 40612562455). The cause was
**not** the missing OCI secrets: the deploy job skipped correctly and printed its notice. The
verify leg failed at `Bring the staging stack up` with a raw `MODULE_NOT_FOUND` whose
`requireStack` named `services/auth/src/config.ts` — because the auth service's migration runs on
the runner (`npx auth migrate` → `src/migrate.config.ts:24` → `src/config.ts:8` →
`import { z } from "zod"`), and a GitHub runner checks out the tree with **no `node_modules`**.
The fix: the verify leg runs pnpm/Node setup and `pnpm install --frozen-lockfile` before anything
calls `infra/deploy.sh`, and `migrate_auth` gained a named guard that says the dependency and the
exact command instead of dying inside the module loader. `scripts/ci/check-deploy-verify-installs.mjs`
(with 7 tests, in the quality gates' floor job) pins the ordering so it cannot regress.

**Numbering rule applied:** the highest BUG/D number across `origin/main` **and every open PR
branch** was BUG-068 / D-50, so the row took **BUG-070** and BUG-069 was left free for the lead's
first C1 finding (the founder's instruction: the lead files the C1 findings from BUG-069 up).

## The next item, exactly: `response_model` on every handler

Verified on this tree, not inherited:

- **0** of the **19** HTTP handlers in `services/api/app/main.py` carry a `response_model`
  (`grep -c response_model` prints 0). They are: `healthz`, `seed_demo_run`, `create_run`,
  `list_runs`, `get_run`, `upload_pod`, `pod_bytes`, `pod_url`, `reopt_route`, `put_template`,
  `shift_route`, `intake_text`, `intake_manifest`, `billing_webhook`, `get_entitlements`,
  `list_stops`, `get_location_notes`, `add_location_note`, `sync_events`.
- Every one returns a `dict[str, Any]` from a private helper — `_run_body`, `_route_body`,
  `_intake_answer` (770), `_location_note_body` (966) — or an inline dict in the handler.
- **The contract guard is path-only**: `services/api/tests/test_contract.py` builds
  `served_routes()` (method, path) → operation id and `contract_operations()` from
  `packages/contracts/openapi.yaml`, and compares only those. That is BUG-059's exact words:
  "a key rename ships green past the path-only contract guard".

The slice:

1. A new `services/api/app/schemas.py` with one Pydantic model per answer shape
   (`RunBody`, `RouteBody`, `SyncAnswer`, `LocationNoteBody`, `EntitlementAnswer`,
   `IntakeAnswer`, `HealthAnswer`, `WebhookAnswer`, `PodUrlAnswer`, `StopBody`, …). Keep the
   `_*_body` helpers as the source of truth and make the models describe what they already
   return — never change a field's name or shape in this PR, or the typed client and the
   contract drift.
2. `response_model=` on each handler, and `response_model_exclude_none` where the contract
   omits a nullable field (check `packages/contracts/openapi.yaml` for each).
3. The gate: `test_every_operation_declares_its_response_schema` in `tests/test_contract.py`,
   walking `app.openapi()['paths']` and asserting every non-framework operation has a
   `responses.200.content` with a real schema — **red on today's tree**, because every operation
   has `responses.200` with `content: {application/json: {schema: {}}}` when the handler has no
   `response_model` and no return annotation.
4. Red first: with the models in place but one handler's `response_model` removed, the suite
   must fail; the `_*_body` helpers' outputs must still validate against their models (a test
   per shape, driven by the existing route tests' fixtures).

## After that, in the binding order

- **the fixture hoist and the bounded voice stores** (both verified): `make_stop`/`make_request`
  duplicated in `test_routing.py:44,66` and `test_solver.py:51,73`; the `InMemoryRepo()` fixture
  duplicated across nine test files (`test_routing.py:90`, `test_runs_api.py:59`,
  `test_sync.py:62`, `test_location_notes.py:32`, `test_intake_api.py:45`,
  `test_entitlements_api.py:29`, `test_demo_seed.py:46`, `auth/test_voice_socket.py:54` plus
  `a_fresh_repo` at :40, and seven inline uses in `test_billing_providers.py`); and
  `driver_settings: dict[str, VoiceSettings] = {}` at `services/courier-voice/app/main.py:113` is
  unbounded.
- **the OWASP MASVS L1 self-review** in `docs/security/`.
- **B4** — mutmut scoped in CI at the 70% floor over `services/api` (sync, runs, auth) and
  `services/courier-voice` (the turn machine).
- **A5's remaining slices** — the backups and the restore drill on staging, and OmniRoute's
  production config (D25) on a local VM until the OCI keys exist.
- **C1** (squads 2, 3 server side, 4, 5), **C3** (the LINZ measure-fix-re-measure loop toward
  98%), **MASTER §22** (the Andee clean-room spec and the three techniques with numbers), then
  billing (D44) and the rest of queue 3.

## The traps this session recorded

- A refusal test on the voice socket must **write one frame before it reads**: `identify` reads
  exactly one first message when the header is absent, so a test that connects and reads blocks
  in `receive_json` forever. It is written at the top of
  `services/api/tests/auth/test_voice_socket.py`.
- `Add-Content ..\.gitignore` from a worktree edits the **main tree's** `.gitignore` (it truncated
  it once; restored from `git show HEAD:.gitignore`).
- PowerShell's `Set-Content -Encoding` takes `ascii`, not `asascii`.
- A `git commit` made while another session had switched branches lands on **their** branch; commit
  immediately and verify the branch before every commit.
- When a merge conflicts, resolve it and let git finish (a real merge commit with two parents) —
  deleting `.git/MERGE_HEAD` and committing by hand produces a one-parent commit whose tree is
  right but whose history is a squash, and the §13.3 proof (`origin/main` is an ancestor) fails.
