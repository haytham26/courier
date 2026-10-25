# BACKEND_LOG — 2026-W43 (the backend squad's own log; the lead's W43/CURRENT are not touched)

## 2026-10-24 — Queue item 1 CLOSED, queue item 2 built (branch `feat/backend-api`)

### Queue item 1 — the real routing solver (PR #19, MERGED as `8995f3c`, tag `archive/feat/routing-solver`)

- The engine, the benchmark, ADR-009/D35, the evidence — see the PR and `docs/evidence/backend-solver/`.
- The merge of `origin/main` into the branch kept both sides of the W43 log conflict (the lead's
  dual-image/delivered entries and the solver entry), resolved chronologically.
- The independent fresh-context review returned **no blockers**; its three must-fix doc-contract
  items were applied (`224c69d`): the told break position now raises (RED-GREEN), the abandoned-
  encoding sentence in the test docstring rewritten, ADR-009 §6 completed (`partial-reopt` named,
  either-phase fallback), the creep probe committed with its real output (which CORRECTED the ADR's
  evidence sentence: direct builds flat, long in-process solves creep, production 250-iter flat).
- The five-pass record is posted on PR #19; Android E2E green on the tip (both legs, run
  40075990203; the first api-34 red was the known flake family, the rerun went green).

### Queue item 2 — the runs/stops API (this branch, ADR-010/D36)

| Slice | What | Tests (RED first) |
|---|---|---|
| 1 | `POST /runs`, `GET /runs`, `GET /runs/{id}`; owner from the token; foreign run 404; `extra="forbid"` | the authz matrix, the round-trip, the list scoping, the validation bounds (7 tests) |
| 2 | `GET /shifts/{shift_id}/stops` for real; `RouteStopRow` + status/address; in-memory derives status from events, SQL reads the table | the listing, the event flip, the status filter, the unknown filter 422, the foreign shift 404 (5 tests) |
| 3 | `POST /runs/{run_id}/stops/{stop_id}/pod`; `app/pod.py` (cap, sniff, server-side names); replay-idempotent | the round-trip (sha256/bytes/row/file), the replay, the foreign 404, the stray stop 404, the oversize 413 with nothing stored, the non-image 415 (6 tests) |
| 4 | `POST /runs/{run_id}/route:reopt`; the stored plan anchors the delta; the stored route refreshed | places-and-delta, kept order, determinism + zero reapplication delta, unknown 422, foreign 404, the phone serves the reopted day (6 tests) |
| 5 | the ASVS V14 hardening headers on every response (async middleware — the first sync draft failed its own suite in seconds) | headers on a success and on a 401 (2 tests) |

- Suite: **217 passed + 1 skipped**; ruff/mypy clean; the format scoped to the four files this
  branch authored (the pre-existing dirt on main stays untouched).
- Two fixture lessons recorded for the next slice: a second auth-fixture override kills the first
  client's tokens (one shared verifier fixture, identities by subject); and the reopt's determinism
  assert is about the DAY (same stops, same length, delta 0 on reapplication), not a naive
  whole-body equality.

### Queue item 3 — the Courier Voice brain through OmniRoute: VERIFIED BUILT, one founder item added

The queue said "the server brain through OmniRoute, a fake provider in the tests, real keys are a
FOUNDER_TODO item". The service already carries all of it (`services/courier-voice`, built
2026-10-22 per `docs/squads/voice/STATUS.md`): the `OmniRouteEngine` holds the D25 rules (the
allow-list travels with the call, an empty allow-list means unavailable — never "everything is
allowed", the cost guard, no transcript/address/name in any log line) and is tested against a
**fake gateway** (`httpx.MockTransport`) in 12 tests. This session's verification:

- the voice suite on this tree: **166 passed**;
- the wiring (`app/main.py` builds the `EngineRouter` with both engines and falls back without the
  courier noticing) read and confirmed;
- the one real gap: no FOUNDER_TODO row for the production gateway — added (self-host on Oracle
  Sydney per D25, `OMNIROUTE_BASE_URL`/`OMNIROUTE_API_KEY` in the server secret manager, the
  provider allow-list pick). The server brain stays dormant without it; the on-device engine
  answers everything, so nothing is broken while the row is OPEN.

### Skills applied (AGENTS.md map)

| Step | Skills read and followed | How they changed the work |
| --- | --- | --- |
| Designing the API | `api-and-interface-design` | Contract-first with the recorded deviations (the narrowed createRun; `territory` refused, not dropped); consistent 401/404 discipline; the error shape kept single. |
| Hardening | `security-and-hardening` | The STRIDE pass per endpoint became the ASVS L2 table in ADR-010; the POD upload treats the client's name/type as hostile (magic sniff, server-side name, cap-before-store); the abuse cases (oversize, replay, foreign ids) are the tests. |
| Building the slices | `test-driven-development`, `incremental-implementation` | Five RED→GREEN slices, each committed atomically; the suite ran between slices. |
| Planning | `planning-and-task-breakdown` | The recon (contract, schema, repo protocol, auth) preceded the code; the plan named the slices, the ADR named the decisions. |
| Verifying "already built" honestly (item 3) | `doubt-driven-development` | The claim "it exists" was tested, not trusted: the suite ran (166), the wiring was read, and the FOUNDER_TODO gap was found by looking for the deliverable the queue actually names (real keys). |

### Queue item 4 — section 18.4 reliability: the SLOs, the load test, the restore drill (branch `feat/backend-ops`)

- The RUNBOOK gains sections 8-13: the SLO table (availability 99.9 %, route p95 at 5 s, sync p95
  at 300 ms, POD p95 at 2 s, voice at 700 ms — every number anchored to an existing budget or the
  load test), the error-budget rule, the six-step incident process, the on-call quiet hours, the
  alert payload contract, the load-test model and the DR drill procedure.
- `GET /healthz`: the probe's target — unauthenticated and data-free by construction, with a test
  that asserts the whole body shape.
- `services/api/loadtests/locustfile.py` + the `load` extra (locust 2.47.0): the 1,000-driver
  day-loop model with the SLOs encoded AS the run's thresholds (a breach fails the run).
- `services/api/ops/restore_drill.py`: the rehearsed restore — refuses a non-empty target, restores
  with ON_ERROR_STOP, runs the API round-trip, prints the verdict for the evidence file.
- Honest: the SLO RUN and the DR RUN have not executed on this machine (no DB daemon — the same
  environment finding as the VROOM leg). Both scripts refuse honestly, the evidence README
  (`docs/evidence/backend-ops/`) says so, and the DB-backed runs are the launch gates on
  staging/CI. The queue is otherwise EMPTY: items 1-4 delivered or verified.

### Skills applied (AGENTS.md map) — item 4

| Step | Skills read and followed | How they changed the work |
| --- | --- | --- |
| The SLOs and the budget | `constraint-driven-development` | The thresholds in the load test ARE the written numbers (the 5 s budget, the 700 ms voice budget) — the same values, never a relaxed copy; a breach fails the run. |
| The ops tools | `observability-and-instrumentation` | The healthz endpoint is data-free by construction (asserted), the drill prints verdicts + timings shaped for the evidence file, and the alert payload contract keeps PII out. |
| Honest not-run | `doubt-driven-development` | The scripts REFUSE honestly when their venue is missing (no DB, non-empty target) instead of simulating success; the evidence README records what has and has not run. |

### Not verified / honest gaps

- The location-notes endpoints: NOT STARTED (the door_memory mapping needs its own slice).
- POD storage is a local directory; object storage is a later slice (the seam isolates it).
- No rate limiter (recorded in ADR-010 §Limitations, not silently skipped).

## 2026-10-25 — Queue 2, item 1: the quality audit (branch `chore/audit-backend`)

- **The founder findings fixed**: (a) the generated coverage summaries untracked (.gitignore
  already listed them - the entries never took effect on tracked files); (b) the contract whole
  again (it never had the route endpoint the app reads daily, the auth routes or /healthz; the
  /locations path was a duplicate YAML key) + the drift guard (`tests/test_contract.py' + chr(96) +
  ': served subset-of contract, non-planned contract subset-of served, operationIds equal -
  reconciled to the API route names).
- **The deep audit (services/)**: 8 must-fixes, all applied - the sync batch bound + the event
  stop-id ownership, the voice-WS ownership (4404 on a foreign shift) + malformed-frame honesty +
  the transcript bound, the LLM failure paths (fallback_intent; the OmniRoute malformed-JSON
  fallback), the middleware exception logging, the POD replay-on-another-stop 409, the timezone
  honesty, the auth email-verification option (tested, env-gated), litellm + alembic dropped.
- **The repo-wide sweep (read-only, item 1c)**: findings filed as BUG-053..BUG-057 (lead-owned) +
  BUG-058/059 (the auth items + the backend backlog). The short list for the lead is in
  CURRENT-backend.md.
- Verified by running: both suites green (api 236+1, voice 166), pip-audit clean on both runtime
  trees, the licence sweep (one psycopg LGPL note for the lead ledger), ruff/mypy clean.

### Skills applied (AGENTS.md map) - item 1

| Step | Skills read and followed | How they changed the work |
| --- | --- | --- |
| The audit | `code-review-and-quality`, `security-and-hardening` | Two fresh-context auditors (services/ deep, repo-wide read-only) ran BEFORE any new feature, per the founder order; the route-by-route authz walk and the STRIDE pass produced the findings. |
| The fixes | `test-driven-development` | The stop-ownership and the WS-frame fixes carry tests that reproduce the abuse (the invented stop, the foreign shift, the malformed frame); the drift guard carries a not-vacuous test. |
| The findings ledger | `constraint-driven-development`, `documentation-and-adrs` | Nothing parked in memory: BUG-053..059 carry file, evidence and owner; the lead list is in CURRENT-backend.md. |

## 2026-10-25 - Queue 2, item 2: the database in CI (branch `feat/db-in-ci`, merged PR #27)

- The PostGIS 17.2 service container on the quality job (plain Postgres failed: the contract
  schema needs PostGIS), the DB-backed \SqlAlchemyRepo\ suite (10 tests, the \db\ marker;
  `addopts = -m 'not db'` deselects by default - a selection, never a skip), the restore drill
  (seed -> dump inside the container -> restore into a clean DB -> the API round-trip) and the
  short Locust SLO profile (minted throwaway ES256 identity, 50 users / 60 s, thresholds as the
  failure criteria).
- CI taught the truth three times: the lying-409 conflation (the constraint suffix now decides),
  the runner's pg_dump 16 cannot read the server 17.5 (the dump runs inside the container), and
  the vacuous green (the review's must-fix: a 2-request run printed 'SLOs met'; the floor is 100
  and the first seeded run landed 180 requests, 0 failures).
- Verified by CI (run 40127627265): DB suite 10 passed, drill \VERDICT: PASS | restore 0.4s\,
  \SLOs met\. The E2E record: both legs green on a4e947a; later single-leg reds carried the
  environment signature (BUG-060) with byte-identical app content.

### Skills applied - item 2

| Step | Skills read and followed | How they changed the work |
| --- | --- | --- |
| The CI wiring | \ci-cd-and-automation\ | Service-container pinning, health gates, no secret beyond the container-local throwaway, evidence logged. |
| The DB suite | \	est-driven-development\, \source-driven-development\ | The executemany-rowcount and IntegrityError behaviours were verified against psycopg3/SQLAlchemy docs, then pinned by DB tests that only CI can run. |
| The review | \code-review-and-quality\, \doubt-driven-development\ | The fresh-context reviewer found the vacuous green (a gate that greets nothing); its guard then caught the unseeded run in the very next CI pass. |

## 2026-10-25 - Queue 2, item 3: POD object storage (branch `feat/pod-storage`, MERGED PR #31)

- Merged as `a8e5a81` (merge commit), archive tag `archive/feat/pod-storage`, branch deleted.
- CI green at `3f51fcc`: API suite 259 passed + 1 skipped + 10 db-deselected, the db suite, the
  restore drill (`VERDICT: PASS | restore 0.4s`), the Locust SLO profile (`SLOs met`), gitleaks,
  CodeQL, licences. Android E2E green on both legs (api 34 passed directly; api 35 passed on the
  19.1 rerun of the known flake family - byte-identical app content).
- Two gitleaks casualties worth remembering: the boot validation's throwaway CI value and a
  `ttl_seconds=-1` argument the generic-api-key rule misread as the secret. The allowlist carries
  the test-only values; the call is now one arg per line.

### The review that changed the item (fresh context, doubt-driven)

- BLOCKER: the streaming grant's HMAC key was derived from `AUTH_JWT_ISSUER` - a public value in
  every access token - so any authenticated caller could forge a grant and read another courier's
  photo. Now the dedicated `POD_URL_SIGNING_SECRET` (>=32 chars, validated at boot, no fallback).
- Five concerns landed with tests: sha256 as real object metadata (the ETag was a lie), `exists()`
  only 404-tolerant (a 403/5xx could turn a replay into an overwrite), `delete_run` paginated and
  chunked with per-key errors raised, non-POD events 404 on the presign, the moto suite executing
  in CI (both workflows sync `--extra s3test`; the module raises when CI lacks it).

### Skills applied - item 3 (merge pass)

| Step | Skills read and followed | How it changed the work |
| --- | --- | --- |
| The review | `code-review-and-quality`, `doubt-driven-development` | The blocker was a security boundary derived from a public value; the review's mandate (fresh context, adversarial) found it in a pass that had already "looked done". |
| The ritual | `git-workflow-and-versioning` | Merge origin/main in before merging (twice on this branch), a merge commit only, the archive tag pushed before deletion, `gh run list` polled (never `--watch`). |
| The log | `documentation-and-adrs` | ADR-011 corrected to the real key so the ADR and the code cannot drift. |

## 2026-10-25 - Queue 2, item 4: location notes (branch `feat/location-notes`, MERGED PR #33)

- Merged as `938786b` (merge commit), archive tag `archive/feat/location-notes`, branch deleted.
- ADR-012: the identity is `uuid5` over the canonical `address|suburb` (no nearest-neighbour,
  ever), `stops.location_id uuid NOT NULL` + an index, `door_memory` redefined to one note per
  (courier, location, kind). `GET/POST /locations/{location_id}/notes`: 201 a new kind, 200 a
  correction, echoing the stored row's own id. The gate is `courier_location_key` - a location the
  caller has never had a stop at is 404 on both verbs, and two couriers at one door keep two
  private memories.
- Tests: `tests/test_location_notes.py` (the stop id, the upsert, the authz matrix, the validation
  bounds) + two `db`-marked tests (the key lookup, the ON CONFLICT upsert, the cross-courier
  isolation). The three stop seeds write the derived id.
- CI green at `8392588`: 279 passed + 1 skipped + 12 db-deselected, the db suite, the drill, the
  SLOs, gitleaks, CodeQL. Android E2E green on both legs.

### The review that changed the item

- Must-fix 1: `address_key` parity - the SQL UPDATE kept the old audit key while the in-memory
  replace took the new one. Now both refresh it, with a db assertion on the refreshed key and
  `last_confirmed`.
- Must-fix 2: the uuid5 namespace was stable by convention only; a rename would silently re-key
  every new stop while the existing notes kept the old id. Now pinned by a literal-UUID test.
- Also landed: the stop response never nulls `location_id` (the endpoint derives it from the
  address), an empty address is refused (every empty pin would have shared one id), and the key
  lookup is `ORDER BY s.sequence` so the audit key is deterministic.
- Recorded for the address-intelligence slice: ASCII-only folding (a macron or an apostrophe folds
  to a different id than its transliteration), unit forms (`1/12` vs `1-12`) are distinct, and
  `nz_address.address_key` is a second canonicaliser.

### Skills applied - item 4

| Step | Skills read and followed | How it changed the work |
| --- | --- | --- |
| The identity | `api-and-interface-design` | A derived id the phone never recomputes beats a nearest-neighbour guess; the ADR names what identity is NOT (proximity). |
| The authz | `security-and-hardening` | 404-never-an-empty-list: existence is not disclosed cross-courier; the notes are keyed by courier so a shared door is two memories. |
| The upsert | `test-driven-development` | RED first (the suite caught the in-memory `replace` not preserving the id), then the SQL `ON CONFLICT DO NOTHING RETURNING id` else UPDATE. |
| The review | `code-review-and-quality`, `doubt-driven-development` | The two must-fixes both came from "what breaks silently in two years", not from the happy path. |

## 2026-10-25 - Queue 2, item 5: voice intake (branch `feat/voice-intake`, MERGED PR #34)

- Merged as `2cc0aec` (merge commit), archive tag `archive/feat/voice-intake`, branch deleted.
- CI green at `0069b20`: the API suite 319 passed + 1 skipped + 12 db-deselected, the db suite,
  the drill, the SLOs, gitleaks, CodeQL. Android E2E green on both legs (the api-35 leg passed on
  attempt 2 after the emulator's GL/adb environment signature - the app content was byte-identical).

- ADR-013: the two contract stubs (`POST /shifts/{shift_id}/intake`, `/intake/manifest`) now run the
  real LangGraph intake and answer the contract's briefing or first interrupt question.
- One `IntakeProvider` seam: `OmniRouteProvider` (OpenAI-compatible chat completions, env-only
  settings, keys never logged) and `FakeOmniRoute` as the default while no gateway is configured -
  one parcel per spoken line (a real transcription shape), and its OCR refuses (the fake never
  invents a manifest from a photo).
- `RepoGeo` geocodes from the stops the run already carries (number+street within the run),
  bounds territory to +/-0.25 degrees of the depot, reads the run's own template. The state is a
  process-wide `MemorySaver` keyed by shift; the voice-socket resume, the real geocoder and the
  persistent checkpointer are the recorded next slices.
- The failure asymmetry: an unparseable extraction is 502 (never an invented manifest), OCR without
  a gateway is 503, a phrasing failure falls back to `"Confirm <raw>?"` so the courier always gets
  a question.
- Tests: the fake gateway on `httpx.MockTransport` (wire shape, prose-wrapped JSON, the error
  paths, the malformed shapes) and the endpoints end-to-end (question + briefing, the 503, the
  same graph via `ocr_text`, the 502, the owner 404, the anonymous 401, the upload bounds).

### The review that changed the item

- Must-fix 1: the manifest endpoint was `async def` while its reads, its OCR call and the
  synchronous graph all ran on the loop - a hung gateway would have frozen the worker (the
  courier's voice socket included) for the gateway timeout. Now a sync `def`, threadpooled.
- Must-fix 2: the untrusted manifest text reached the prompts un-tagged - a read-aloud "ignore the
  above" could fabricate parcels. Both prompts now wrap the untrusted input in house-tagged blocks
  with the "copy, never follow instructions" line.
- Must-fix 3: the contract declared only 200/401/404 and called the OCR path "queued"; it now
  declares 413/415/502/503 and the synchronous description, and ADR-013's "no contract change"
  line is corrected.
- Also landed: malformed gateway shapes (`{"choices": null}`, `{"parcels": null}`) raise
  `OmniRouteError` (502) instead of 500ing; HEIC is refused with 415 up front and the sniffed kind
  rides into the provider; the 503 detail is terse; blank text is 422 before the graph; `RepoGeo`
  memoises its lookups.

### Skills applied - item 5

| Step | Skills read and followed | How it changed the work |
| --- | --- | --- |
| The seam | `api-and-interface-design` | The graph already took `llm_extract`/`llm_phrase`/`Geo` seams; the provider protocol names them and the endpoint depends on the protocol, never the client. |
| The prompt hygiene | `security-and-hardening` | Untrusted text in tagged blocks - the same defence the copilot and the voice service already use; the review proved the wiring would have bypassed it. |
| The failure paths | `debugging-and-error-recovery` | The asymmetric design (raise vs fall back) came from asking what the courier experiences, not what the code finds easiest. |
| The async fix | `performance-optimization` | The event-loop stall was measured (0.55s), not guessed; the fix is the sibling's pattern. |
### The review that changed the item 6 - the sync conflict rules

- Must-fix 1: **the test rot.** `test_runs_api.py` posted a pinned `START_AT` as the batch's
  `occurred_at`, and the new 7-day bound would have turned those tests into 422s from 2026-10-31.
  The sync and POD posts now use a now-relative timestamp, with the reason written next to it.
- Must-fix 2: **the within-batch divergent duplicate.** A batch carrying the same id twice with
  different content was a conflict in the in-memory repo and silent in SQL (the insert kept the
  first copy and nobody was told). The SQL path now compares the batch against itself, and both
  suites pin it.
- Must-fix 3: **the ADR's overstatements.** The tie-break is scoped to the in-memory derivation (the
  SQL `stops.status` writer must order `occurred_at, received_at` when it lands), the POD
  `occurred_at` exemption is recorded, the >7-day queue-wedge risk against the zero-data-loss gate
  is recorded, and C3 of the sync research is marked superseded instead of contradicted in silence.

### Skills applied - item 6

| Step | Skills read and followed | How it changed the work |
| --- | --- | --- |
| The rules | `spec-driven-development`, `api-and-interface-design` | The ADR first (the queue demanded it), then the shape: one `AppendResult` both repositories answer, so the rules are the same code in both. |
| The clock | `security-and-hardening` | A wrong phone clock must not pin a stop's status for hours: the bound is the control, and the exemption (the POD's event) is named rather than implied. |
| The review | `code-review-and-quality`, `doubt-driven-development` | The must-fix list was three ways the change would rot: a timestamp, an untested edge, and a doc claim that outran the code. |
## 2026-10-25 - Queue 2, item 7: the map pack pipeline (branch `feat/map-pack-pipeline`)

- ADR-016. The pack had never been built, and reading the two build scripts against the tools' own
  documentation (planetiler's README, the pmtiles CLI reference - both read 2026-10-25) found the
  reason in four places:
  - the CLI was invented: `--area=christchurch` (Geofabrik publishes `new-zealand`, not
    Christchurch), `--download` pointed at a local extract (a file on disk is `--osm-path`), and
    the plan printed a `versatiles reduce` step that does not exist in the build at all;
  - the 3D bake ran `--overlay=<outlines> --profile=courier`, and planetiler has no such flags: a
    second data source rides a profile. The bake now refuses and names what it needs, while the
    pack build already bakes OSM buildings with `render_height`, so the app draws buildings without
    the LINZ footprints;
  - both scripts resolved the repo root one directory short, so the pack would have been written
    into `scripts/apps/mobile/assets/maps` - a plan's printed path was the only thing that betrayed
    it;
  - neither recorded the tool versions, the archive's real header, or the credit the OpenMapTiles
    schema and profile require.
- The build runs the documented steps: `planetiler --osm-path=<extract> --output=<tileset>
  --force` (the heap in `JAVA_TOOL_OPTIONS`, per the README's ~0.5x-the-input rule), then
  `pmtiles extract` clipped to the Canterbury bbox and zooms in the CLI's own order, `pmtiles
  verify`, and `pmtiles show --header-json` recorded in the manifest **verbatim** - the tool prints
  snake_case keys (its own test asserts `tile_type`/`tile_compression`), so the first version of
  this step read camelCase guesses that would have recorded `undefined`.
- `.github/workflows/map-pack.yml` runs the pipeline twice a week (D26), on dispatch (extract URL
  and source id as inputs), and on a push that touches the pipeline or the scripts; it publishes
  the pack, the manifest and the evidence as artifacts and never gates a PR. Both Semgrep findings
  it raised were fixed structurally: every `uses:` pinned to the full SHA the repo's other
  workflows use, and the dispatch inputs passed through `env:` rather than interpolated into a
  `run:` block.
- Not claimed as done: the 50 MB ceiling is checked but has never been observed, the LINZ overlay
  profile is not written, and the frame/battery/latency numbers are still the maps squad's to
  measure.

### Skills applied - item 7

| Step | Skills read and followed | How it changed the work |
| --- | --- | --- |
| The tools | `source-driven-development` | Every flag was verified against the official docs before it shipped; the four defects exist precisely where the previous author did not check. |
| The workflow | `ci-cd-and-automation` | The schedule, the dispatch inputs, the artifact retention and the two supply-chain gates (pinned SHAs, no inline expressions) - plus the honest rule that a 90-minute data build never gates a PR. |
| The honesty | `constraint-driven-development` | The unverified rows stay unverified in the maps status; the item claims the pipeline, not the numbers. |

