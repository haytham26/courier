# CURRENT — backend squad (read this first)

Updated: 2026-11-04 · main at \af496d4\ (PRs #177–186 merged; items (a), (b), (c), BUG-187, BUG-102 and BUG-132 complete) · **This
squad's handoff lives in THIS file only.** PR #174 had written it into the lead's `docs/log/CURRENT.md` and replaced the lead's
header line with its own; the correction PR on `docs/currents-log-ownership` restores that
header line exactly as it was at `960fc41^1` (the lead has not rewritten it since) and
moves the entry below, here, true at main `960fc41`. **From now on this squad writes only
to `CURRENT-backend.md`.** (The previous header recorded PR #164, `c1-voice-mediums`: the
voice group BUG-124/125/126/149/151/152/153/154 and BUG-128, all landed, all gates green
locally; its only two red legs were (1) GitHub's default-setup CodeQL check, which reports
two *false positives* on the k-anonymity SHA-1 and can be neither suppressed nor dismissed
from here (below, with the three attempts and the founder row), and (2) `Build the release
APK` from the `Screen recordings` workflow, which is the lead's path (§16 — reported, never
investigated).)

## The entry moved out of the lead's CURRENT.md (true at main `960fc41`)

**The backend squad's C1 lows batch merged this session: PR #173 (`c1-backend-lows-batch`
@ `2e24b59`) merged as `d93e3ab`, with the full ritual — archive tag
`archive/c1-backend-lows-batch` pushed at `2e24b59`, remote branch deleted,
`git ls-remote --heads origin c1-backend-lows-batch` printing nothing.** The branch took
origin/main in first (`2e24b59`, #171 + #172) and resolved all seven conflicts keeping
BOTH register gates: the duplicate-number check and the `--base` reopen guard live in
`check-parity.mjs` together, its suite is 32 green, and the floor job on the PR head
(run 41398868377) is green — including "The registers did not silently reopen
(check-parity --base)" against the PR's base sha. BUGS.md on main reads 160 rows
(open 19, doing 3, testing 3, fixed 103, closed 2, moved to PARITY 30). The rows the batch
closed: BUG-118, 119, 120, 135, 136, 138, 143, 144, 145, 155, 156, 157, 158, 159, 163.
Evidence: `docs/evidence/c1-backend-lows-batch/README.md`; the merge write-up:
`docs/log/2026-W44.md` (the 2026-11-02 merge entry).

## The founder's queue, this session (2026-11-02): log correction merged, item (a) started

- **PR #176 MERGED as `eee8b7e` with the full ritual** (the log-ownership correction from the
  founder's first directive): `docs/log/CURRENT.md` restored byte-identical to `960fc41^1`
  (the lead's header line, `0b083b9` / PR #170's handoff — the lead has not rewritten it
  since), the C1-lows-batch entry moved to THIS file (above), archive tag
  `archive/docs/currents-log-ownership` at the PR head, remote branch deleted,
  `git ls-remote --heads origin docs/currents-log-ownership` prints nothing. **This squad
  writes only to `CURRENT-backend.md` from now on.** Local `main` syncs with
  `git merge --ff-only origin/main` only — no `git reset --hard` (the founder's second
  directive; AGENTS.md bans it outright).
- **Item (a), server halves — MERGED** (each its own contract-first PR with the full
  ritual and red-first evidence): #177 break/finish (`821cde4`, ADR-022, BUG-166),
  #178 failed-reason (`1f596b1`, ADR-023, BUG-167 — both of its CI reds fixed on-branch:
  `ad8690c` the db leg's missing `reason`, `b8bc724` the Locust profile),
  #179 stop types (`f5b0b9c`, ADR-024, BUG-168 — its mobile typecheck red was the ADR-024
  ripple into the op-sqlite run cache, fixed on-branch in `126e6a9`) and
  #180 spreadsheet import (`0d8431f`, ADR-025, BUG-169, openpyxl MIT). All four land with
  their archive tags and their remote branches deleted.
- **Item (b) — B3's remainder — MERGED as `e4e432c` (PR #181, `b3-remainder`, full ritual:
  all 22 checks green on head `fce579c`, archive tag `archive/b3-remainder` at the PR head,
  remote branch deleted):** the shared API test fixtures hoisted to
  `services/api/tests/conftest.py` once (pinned by `tests/test_fixture_hoist.py`,
  red-first: 38 redefinitions on the old tree), the voice `driver_settings` store bounded
  at `MAX_DRIVER_SETTINGS = 1000` (oldest-first eviction, red-first HTTP pin), the psycopg
  LGPL-3.0 linking note in `docs/product/LICENSES.md`, and the OWASP MASVS L1 self-review at
  `docs/security/MASVS-L1.md` (PARITY 311, L2 gaps tracked at PARITY 195/197). BUG-059 →
  fixed, BUG-170 filed+fixed, evidence `docs/evidence/b3-remainder/`. Green locally: API 575
  non-db + 33 db (postgis 17-3.5), voice 229, ruff + mypy clean both services. (Its emulator
  reds were the same corrupt-`sdkmanager`-zip infra flake as #180 — rerun green.)
  **B3's done-when is met: BUG-059 closed with tests + the MASVS checklist in
  `docs/security/`.**
- **Item (c) — A3 — MERGED as `fc53856` (PR #183, `a3-voice-open-data`, full ritual:
  all 22 checks green on head `e34be85`, archive tag `archive/a3-voice-open-data` pushed at
  the PR head, remote branch deleted — `git ls-remote --heads origin a3-voice-open-data`
  prints nothing):** the voice eval set is built from open data. 280 Common Voice 17 en
  clips (CC0-1.0, filtered by the dataset's accent metadata: 140 New Zealand English + 140
  other English accents) and 8 MUSAN beds (CC-BY 4.0) are fetched by
  `scripts/eval/fetch-open-voice-data.mjs` into `data/voice/` (git-ignored, per-clip sha256,
  licence ledger in `manifest/licence.csv` + LICENSES.md); `app/eval_audio.py` (the voice
  service's `eval` extra) builds the 600 open utterances (120 quiet + 360 van at 0/5/10 dB
  + 120 courier mix — the `en_mix` slice is new in the builder, sharing the quiet
  templates, so the manifest regenerates deterministically) and scores three legs against
  the pinned judge (sherpa-onnx Whisper tiny.en): WER per slice and per SNR, the
  false-action rate on open speech (0.17 %), and the intent accuracy of the service's
  OFFLINE brain on the gold scripts — each leg labelled with what it measures, nothing
  reported as a pass that was not measured. `check-voice-eval.mjs` now pins >=500 built rows
  with file+sha256. BUG-186 filed+fixed, PARITY 312, evidence
  `docs/evidence/a3-voice-open-data/`. Red-first both legs (module absent at collection;
  checker red at 0 built); green: 249 voice tests, 90.8 % coverage (floor 85 %), ruff+mypy
  clean.
- Then the queue continues in the founder's order: **BUG-187** (the offline brain's intent
  accuracy, HIGH — filed from #183's measurement with the root cause per intent and the
  EVAL.md M3 target), **BUG-102**, **BUG-132**, (d) C3 toward 98 % — rebuild from
  `.worktrees/b1030c/data/linz/`, (e) the reference-repos clean-room ideas + MASTER §22's
  three Courier Voice techniques, then billing (D44). LAST: Oracle staging and the production
  OmniRoute (the OCI host/key and the gateway secrets are FOUNDER_TODO — written there, not
  blocking).
- **Item (a), server halves — PR #177 (`feat/trial-run-break-finish`) and PR #178
  (`feat/trial-failed-reason`, stacked) open:** #177 is the break window + finish point on
  `CreateRunRequest` with the `runs` columns (D55/D56, ADR-022, BUG-166, PARITY 12/309);
  #178 is the failed-delivery reason field (D58, ADR-023, BUG-167, PARITY 25, suite 559
  passed, red-first on both). CI lesson recorded: the db leg caught a bad fixture
  construction (`**__dict__` + keyword) — fixed with `dataclasses.replace` (a5f415c), and
  ruff's UP037 quote rule is why 783f8f6 exists; both pushed. Next server halves in order:
  stop types (D59), then the CSV/Excel import (D52) — each its own PR, number = highest BUG
  across origin/main + open PR branches + 1 (the lead's branch holds 171–181; mine:
  168–170, 186–187 — BUG-168 to #179, 169 to #180, 170 to #181, 186 to #183, 187 filed
  from #183's measurement; next free is BUG-188; #135's branch carries BUG-164/165).
- **#178's db leg went red on run 41430267111**: `get_event`'s SELECT predated the
  `delivery_events.reason` column, so the Postgres leg raised
  `NoSuchColumnError: Could not locate column in row for column 'reason'` in
  `TestTheEvents` (2 failed, 28 passed). Fixed in `ad8690c` — `reason` added to the
  `get_event` SELECT (the batch read path already had it); local non-db suite 559
  passed + ruff clean before push. **The Locust leg then went red on run 41436706706**
  (fail ratio 0.3169 > 0.001, every failure a 422 on `events:batch`): the load profile
  picked `kind=failed` without a reason, which the D58 rule refuses. Fixed in `b8bc724` —
  the profile sends a reason on failed events; green locally against postgis/postgis:17-3.5
  + uvicorn with the CI profile (60 s, 50 users, wait 3-8 s): 142 requests, 0 fails,
  "SLOs met: the run is green".
- **PR #177 MERGED as `821cde4` with the full ritual**: merge commit, archive tag
  `archive/feat/trial-run-break-finish` pushed at the PR head `a5f415c`, remote branch
  deleted (`git ls-remote --heads origin feat/trial-run-break-finish` prints nothing).
- **PR #178 MERGED as `1f596b1` with the full ritual**: merge commit, archive tag
  `archive/feat/trial-failed-reason` pushed at the PR head `6a404c4`, remote branch
  deleted (`git ls-remote --heads origin feat/trial-failed-reason` prints nothing). Its
  two CI reds were both fixed on the branch first: the db leg's missing `reason` in
  `get_event`'s SELECT (`ad8690c`) and the Locust leg's failed events without a reason
  (`b8bc724`, proven green locally: 142 requests, 0 fails, "SLOs met").
- **PR #179 MERGED as `f5b0b9c` with the full ritual** (all 22 checks green on head
  `126e6a9`): merge commit, archive tag `archive/feat/trial-stop-types` pushed at the PR
  head `126e6a9`, remote branch deleted (`git ls-remote --heads origin
  feat/trial-stop-types` prints nothing). The D59 server half: stops.type column (CHECK
  delivery/pickup, default delivery), StopResponse.type required, both get_run_stops
  paths, client regenerated; BUG-168 filed+fixed, PARITY 310 updated, ADR-024, evidence
  `docs/evidence/trial-stop-types/`. Red-first on both legs (API: `KeyError: 'type'`,
  2 failed; db: `column "type" does not exist`, 11 failed); green: 560 non-db + 32 db.
  Its one CI red was the mobile typecheck (4× TS2741, StopResponse.type missing) — fixed
  on-branch in `126e6a9`: the op-sqlite run cache carries the column (STOP_TABLE v2,
  `NOT NULL DEFAULT 'delivery'`, SELECT/INSERT/stopOf all pass it through) and both test
  fixtures build stops with `type: 'delivery'`.
- **PR #180 MERGED as `0d8431f` with the full ritual** (all 22 checks green on head
  `2a0e218`, after the branch merged origin/main to carry #179's mobile fix): merge
  commit, archive tag `archive/feat/trial-import` pushed at the PR head `2a0e218`,
  remote branch deleted (`git ls-remote --heads origin feat/trial-import` prints
  nothing). The D52 server half: `POST /shifts/{shift_id}/import`, capped .csv/.xlsx
  (5 MiB / 1000 rows, name+bytes must agree), all-or-nothing validation (a bad row is a
  422 naming the file row, nothing stored; unknown columns answered in
  `ignored_columns`), `put_imported_stops` on both repos (one transaction in SQL,
  unlocated stops, sequence continues), openpyxl 3.1.5 (MIT, in LICENSES.md), client
  regenerated; BUG-169 filed+fixed, PARITY 1/247 updated, ADR-025, evidence
  `docs/evidence/trial-import/`. Red-first both legs (12 API red + db ImportError on the
  base); green 573 non-db + 33 db vs local postgis 17-3.5, ruff + mypy clean. Merge
  order: #179 → #180 once green. **Item (a) is then complete** — all four server halves
  (D55/D56 #177, D58 #178, D59 #179, D52 #180) land as contract-first PRs.
- **Item (b) — B3's remainder — is PR #181 (`b3-remainder`, impl `bea622e` + docs), CI
  running:** the shared API test fixtures hoisted to
  `services/api/tests/conftest.py` once (pinned by `tests/test_fixture_hoist.py`,
  red-first: 38 redefinitions on the old tree), the voice `driver_settings` store
  bounded at `MAX_DRIVER_SETTINGS = 1000` (oldest-first eviction, red-first HTTP pin),
  the psycopg LGPL-3.0 linking note in `docs/product/LICENSES.md`, and the OWASP MASVS
  L1 self-review at `docs/security/MASVS-L1.md` (PARITY 311, L2 gaps tracked at PARITY
  195/197). BUG-059 → fixed, BUG-170 filed+fixed, evidence
  `docs/evidence/b3-remainder/`. Green locally: API 575 non-db + 33 db (postgis 17-3.5),
  voice 229, ruff + mypy clean both services. (Its two emulator reds were the same
  corrupt-`sdkmanager`-zip infra flake as #180 — rerun green.) **B3's done-when is met:
  BUG-059 closed with tests + the MASVS checklist in `docs/security/`.**
- Then the queue continues: (c) A3 — ≥500 utterances from open
  data into `packages/eval/voice/results/`; (d) C3 toward 98 % — rebuild from
  `.worktrees/b1030c/data/linz/`, weekly import green; (e) the reference-repos clean-room
  ideas + MASTER §22's three Courier Voice techniques; (f) LAST — Oracle staging and the
  production OmniRoute (the OCI host/key and the gateway secrets are FOUNDER_TODO — written
  there, not blocking).
  base); green 573 non-db + 33 db vs local postgis 17-3.5, ruff + mypy clean. Merge
  order: #179 → #180 once green. **Item (a) is then complete** — all four server halves
  (D55/D56 #177, D58 #178, D59 #179, D52 #180) land with contract-first PRs.
- **Item (b) — B3's remainder — is PR #181 (`b3-remainder`, impl `bea622e` + docs), CI
  running:** the shared API test fixtures hoisted to `services/api/tests/conftest.py`
  once (pinned by `tests/test_fixture_hoist.py`, red-first: 38 redefinitions on the old
  tree), the voice `driver_settings` store bounded at `MAX_DRIVER_SETTINGS = 1000`
  (oldest-first eviction, red-first HTTP pin), the psycopg LGPL-3.0 linking note in
  `docs/product/LICENSES.md`, and the OWASP MASVS L1 self-review at
  `docs/security/MASVS-L1.md` (PARITY 311, L2 gaps tracked at PARITY 195/197). BUG-059
  → fixed, BUG-170 filed+fixed, evidence `docs/evidence/b3-remainder/`. Green locally:
  API 575 non-db + 33 db (postgis 17-3.5), voice 229, ruff + mypy clean both services.
  B3's done-when is then met: BUG-059 closed with tests + the MASVS checklist in
  `docs/security/`.
- **Item (c) — A3 — MERGED as `fc53856` (PR #183, `a3-voice-open-data`, full ritual:
  all 22 checks green on head `e34be85`, archive tag `archive/a3-voice-open-data`
  pushed at the PR head, remote branch deleted — `git ls-remote --heads origin
  a3-voice-open-data` prints nothing):** the voice eval set is
  built from open data. 280 Common Voice 17 en clips (CC0-1.0, filtered by the
  dataset's accent metadata: 140 New Zealand English + 140 other English
  accents) and 8 MUSAN beds (CC-BY 4.0) are fetched by
  `scripts/eval/fetch-open-voice-data.mjs` into `data/voice/` (git-ignored,
  per-clip sha256, licence ledger in `manifest/licence.csv` + LICENSES.md);
  `app/eval_audio.py` (the voice service's `eval` extra) builds the 600 open
  utterances (120 quiet + 360 van at 0/5/10 dB + 120 courier mix —
  the `en_mix` slice is new in the builder, sharing the quiet templates, so
  the manifest regenerates deterministically) and scores three legs against
  the pinned judge (sherpa-onnx Whisper tiny.en): WER per slice and per SNR,
  the false-action rate on open speech (0.17 %), and the intent accuracy of
  the service's OFFLINE brain on the gold scripts — each leg labelled with
  what it measures, nothing reported as a pass that was not measured.
  `check-voice-eval.mjs` now pins >=500 built rows with file+sha256. BUG-186
  filed+fixed, PARITY 312, evidence `docs/evidence/a3-voice-open-data/`.
  Red-first both legs (module absent at collection; checker red at 0 built);
  green: 249 voice tests, 90.8 % coverage (floor 85 %), ruff+mypy clean.
- **BUG-187 (the offline brain's intent accuracy, HIGH) — MERGED as `3c32059` (PR #184, `bug-187-offline-brain`, full ritual: all 22 checks green on head `853fab4`, archive tag `archive/bug-187-offline-brain` at the PR head, remote branch deleted; its one red was the screen-recording emulator that never booted — the E2E leg on the same head was green and the rerun was green too):** the A3 measurement read the set's own gold scripts through the service's offline brain and found 29.2 % (`en_nz_quiet`) and 12.5 % (`en_nz_van`). Fixed: the address-bearing forms come first in each family with the product's own vocabularies, `parse_command` fills every captured group instead of first-one-wins, and the plain add answers `priority: false`. Measured after, by the same command: intent 120/120 and intent + mandatory slots 120/120 on each of the three English slices (EVAL.md's M3 bar is 97 %).
- **BUG-102 (the map-pack extract URL) — MERGED as `77a3323` (PR #185, `bug-102-map-pack-allowlist`, full ritual: all 17 checks green on head `5a92a22`, archive tag `archive/bug-102-map-pack-allowlist`, remote branch deleted):** `map-pack.yml`'s extract step curled `EXTRACT_URL` as given, with no scheme/host allow-list and no link to the licence-authority `source_id`. `checkExtractUrl` now requires https and the host the registry registers for that source (geofabrik-nz → download.geofabrik.de), refusing an unregistered source, a foreign host or cleartext by name, fail closed; the workflow calls it before the curl.
- **BUG-132 (the shared rate-limiter store) — MERGED as `af496d4` (PR #186, `bug-132-shared-limiter-store`, full ritual: all 23 checks green on head `e2ae2e9`, archive tag `archive/bug-132-shared-limiter-store`, remote branch deleted):** the env-exposure half had landed; this is the store half. `AUTH_RATE_LIMIT_STORAGE` (memory or database, anything else refused) defaults to database in production and is handed to Better Auth as `rateLimit.storage` (its migration adds the `rateLimit` table when it is selected), and both auth replicas in the compose stacks carry it. The counters live in the database the replicas share: one bucket per key, a restart no longer resets them, and the credential endpoints' strict `customRules` are enforced across the fleet.
- **Item (d) — C3's loop, the unit family — MERGED as `1167f29` (PR #188, `c3-spoken-unit-keeps-its-letter`, full ritual: all 23 checks green on head `310ca18`, archive tag `archive/c3-spoken-unit-keeps-its-letter`, remote branch deleted; its one red was the api-34 leg's cold-launch flake — the lock-screen flow's first launch did not render in 60 s while the very next flow launched in 1 s and the api-35 leg on the same APK was green — the rerun was green too):** the failure dump over the seeded 1,800-check sample grouped the 56 failures, and the largest family (22) was the unit: `nz_address.parse` split a spoken lettered unit and `_prefer_plain_address` compared units case-sensitively, so the selector answered the PLAIN row beside the unit row. Both fixed; measured by the same seeded command: **96.9 % (1744/1800) → 98.2 % (1767/1800)** — the founder's >= 98 % bar is met. PROGRESS.md's stale 98.3 % (the older 600-check measure) is corrected to the sample that produced it. The weekly changeset lane is on main with its key set; the loop's next rounds (17 misses, the road aliases) are named in the evidence.
- **Item (e), first half — MASTER §22 technique A, the pre-classifier — on `voice-pre-classifier` — MERGED as `c485a3c` (PR #190, full ritual: all 23 checks green on head `6558ede`, archive tag `archive/voice-pre-classifier`, remote branch deleted):** `app/turn_gate.py` routes a turn before anything is assembled: a command the offline brain knows and whose answer does not read the day is answered with no model call and no run fetch, silence routes with its reason, and the decision rides the answer's `gate` field. Measured over the eval set's 720 scripts through the service's own route: **415 free (57.6 %), engine calls 720 → 305, 0 wrong against the gold intents, free 1.35 ms vs full 1.97 ms**; the gateway round trip and the token counts stay not measured until an OmniRoute deployment exists (FOUNDER_TODO). Techniques B and C are the lane's next steps, recorded as such in the evidence.
- Then the queue continues in the founder's order: (e)'s second half — the reference-repos clean-room ideas — then billing (D44). LAST: Oracle staging and the production OmniRoute (the OCI host/key and the gateway secrets are FOUNDER_TODO — written there, not blocking).

## The CodeQL situation, in full (this is the item to read before touching the auth service)

The repository has **two** code-scanning configurations, and they disagree on the same commit:

- the repo's own `.github/workflows/codeql.yml` — `CodeQL (javascript-typescript)` and
  `CodeQL (python)` — **both green** on `09c2ade`. This is the configuration CONSTRAINTS.md
  names as the code-scanning gate (line 40: "zero high alerts, CodeQL (codeql.yml)").
- GitHub's **default setup**, run by the `github-advanced-security` app, which posts a plain
  `CodeQL` check on pull requests. It reports two `js/insufficient-password-hash` alerts on
  the k-anonymity SHA-1: `services/auth/src/http.ts:62` and
  `services/auth/src/__tests__/setup.ts:34`.

Three attempts did not silence the default-setup leg, in this order:

1. `// lgtm [js/insufficient-password-hash]` above the `sha1` declaration (`f92b405`) —
   still red on the next analysis;
2. the same comment moved onto the `createHash` digest line the annotation names (`383736d`)
   — still red;
3. the `// codeql[js/insufficient-password-hash]` spelling, one above the digest line and one
   trailing on the same line as the digest itself (`09c2ade`) — still red.

**Why it is a false positive, not a finding.** The Have I Been Pwned *range* API is
**specified in SHA-1**: the only answer the endpoint accepts is
`GET /range/<first five hex of the SHA-1>`. The k-anonymity shape means the digest itself
never leaves the process — only the first five hex characters (20 bits) do, exactly as the
stub and the real endpoint both require. There is no SHA-256 variant of the range endpoint
to switch to, and the alternative — dropping the breached-password check to satisfy a
scanner — would fail BUG-128 and ASVS V6.2.x, which is the trade this repo forbids. The check
is load-bearing: it is the one thing standing between a courier reusing a password from a
known breach and his account.

**Why the merge is not blocked by it.** The `protect-main` ruleset
(`repos/haytham26/courier/rulesets/26141625`) carries only `deletion`,
`non_fast_forward` and `pull_request` (0 required approvals) — **no required status checks**,
so no check — this one included — blocks a merge. The repo's own CodeQL legs are green, the
auth and voice suites are green, and the token in `.env.local` answers
`403 Resource not accessible by personal access token` on both `/code-scanning/alerts` and
`/code-scanning/default-setup` (the `security_events` scope is missing), so the alerts can be
neither read nor dismissed from here. The two remedies are the founder's and are written in
`docs/status/FOUNDER_TODO.md`: dismiss the two alerts as false positives in the security
view, or give the token the `security_events` scope so the dismissal can be scripted.
**Note for after the merge:** once this lands, the same two alerts will be reported against
`main` itself, because the alert lives on `main`'s code from then on.

## The binding order for this squad (AUDIT §"The order", MASTER §21)

1. **BUG-063** — **merged** (PR #46).
2. **A1's backend half — MERGED** (PR #57, `b0cfd6b`, ADR-019/D47). `docs/plan/A1-handover.md`
   is the handover to the lead's app side; A2, A4 and B2 are theirs.
3. **A5's first slice — MERGED** (PR #65, `d12231c`, ADR-020/D49). What is left in A5: the
   monitoring, the backups and the restore drill on staging, and the OCI host, key and domain
   (FOUNDER_TODO).
4. **BUG-067 — MERGED** (PR #61, `551bee6`).
5. **B3** — BUG-059's security backlog. The WebSocket token out of the query string is merged
   (PR #75 and PR #90); what is left: `/v1/engines` and `/v1/licences` verified
   unauthenticated in `services/courier-voice/app/main.py` (the BUG-059 hoist),
   `response_model` on the API's 19 handlers (PR #108), the bounded voice stores (BUG-151/152
   of C1, merged in this PR), and the OWASP MASVS L1 self-review in `docs/security/`.
6. **B4** — mutmut scoped in CI at the 70 % floor — **merged** (BUG-112, PR #104; the nightly
   lane is `.github/workflows/mutation.yml`).
7. **Then the rest of queue 3.** Billing resumes after A1/A5/B3/B4, per D44.

## C1 — the deep code audit (the current item)

- **HIGH — CLOSED** on `c1-backend-fixes` (PR #138): BUG-096, 121, 122, 127, 146, 147, 148,
  150, and BUG-160 filed and fixed in the same PR.
- **BUG-115 — DONE** (PR #139, `c1-bug-115-stop-status`). The SQL repo derives the stop's
  status from the events; the restore drill's stale contract was updated to it.
- **Auth mediums — DONE** (PR #140, `c1-auth-mediums`): BUG-132, 133, 134, 137, and
  BUG-129/130 closed with the code that replaced the service's own server. BUG-128 stayed
  OPEN with its reason until the third attempt below.
- **Auth jwks group — DONE** (PR #152): BUG-123 and BUG-131.
- **Sync group — DONE** (PR #158): BUG-139, 140, 141, 142.
- **API surface — DONE** (PR #160): BUG-116 and BUG-117.
- **Voice group — DONE on this branch, PR #164**: BUG-124, 125, 126, 149, 151, 152, 153, 154,
  **and BUG-128**, on the register's own named experiment (the bounded, fail-open check in the
  service's own server, with the suite moved onto the real listener: 4 of its 23 cases fail
  against `origin/main`'s modules, all 23 pass after; 120 auth tests, tsc and eslint clean;
  the API suite 523 and the voice suite 216 on the same tree).
- **Lows, one batch — NEXT, on branch `c1-backend-lows-batch`**: BUG-118, 119, 120, 135, 136,
  138, 143, 144, 145, 155, 156, 157, 158, 159 — plus a NEW row for the repo's own
  `docker-compose.yml` Postgres, whose image carries no `vector` library so the stack cannot
  start locally (the previous session's trap 5). The lead's own lows (mobile and CI paths)
  are on `fix/c1-lows-batch` (PR #166): **do not touch them**, the two batches do not overlap.

## The §16 ownership note

- `apps/mobile`, `.maestro`, the Android E2E workflow and the `Screen recordings` workflow are
  the lead's. On this PR the red `Build the release APK` comes from `Screen recordings` (runs
  41298862451 / 41298862508): the branch touches no app path, the log blob is `BlobNotFound`,
  and the same shared failure is on the lead's own PR #166 as a Maestro leg — one shared
  failure, reported here, not investigated.
- The Locust SLO profile, the Postgres suite, the restore drill, `infra/`, the deploy scripts
  and `services/` are the backend's.

## This session's own state

- Worktrees in use: `.worktrees/b1037` (this branch, `c1-voice-mediums`) and `.worktrees/b1038`
  (`c1-backend-lows-batch`, cut from `main` at `5392ea9`).
- The register's next free number is **BUG-163** (BUG-161 is the lead's A1 slice 3, BUG-162 is
  the lead's workflow secret) — verified across `origin/main` and every open PR branch.
- Docker: nothing running. Postgres is started only for the `db`-marked suite and stopped
  after.
- **15 minutes without output is a stop** (§15). A green local gate before every push; no
  force-push, no rebase, no `git reset --hard`.
- **Bash is a script file, not a `-c` string**: PowerShell mangles quotes, `|`, `$(...)` and
  backticks in a `-c` argument; every command lives in
  `C:\Users\DCL\AppData\Local\Temp\opencose\*.bash|*.py`. The `gh` token is read from
  `.env.local` into `GH_TOKEN` per call, never written to a config outside the repo.
- **A worktree has no `node_modules`**: the generated-client check then goes red on quote style
  because the generator refuses to pass silently without prettier (§6: make local equal CI — put
  the lockfile's prettier on the PATH).
- **A wall-clock request count is a coin-flip threshold, and bounding the users' work does not
  fix it**: the Locust gate's vacuous floor of 100 counted the requests a 60 s window produced;
  the healthy band (141-197 on CI, 31 on a slow box) straddles the floor, and an iteration
  budget (`LOADTEST_ITERATIONS`) did NOT help. The root fix is in the guard, not the users:
  measure the property the count proxied for — `loadtests/vacuous_guard.py`. Also: importing
  locust monkey-patches ssl, so it cannot be imported from a pytest session.
- **A `.prettierrc` that disagrees with the code it formats**: `.prettierrc` at the repo root
  says `singleQuote`, and every committed file is double-quoted, so `pnpm format:check` is red
  on `origin/main` too (verified with `origin/main`'s own `http.ts`). No workflow runs it —
  `grep -n "format:check" .github/workflows/*.yml` is empty — so it is not a gate today. Do not
  "fix" it by reformatting the repo inside a bug's PR.

## The traps that cost time (this session's)

1. **`bash` is not on the Windows PATH that PowerShell sees** — the interpreter is
   `C:\Program Files\Git\bin\bash.exe`.
2. **PowerShell's `Set-Content -Encoding UTF8` writes a BOM**, which made
   `docs/status/BUGS.md` 119 lines of whitespace diff. Write with Python
   (`read_text(encoding="utf-8")` / `write_text(..., encoding="utf-8")`) or the `edit` tool,
   and check `check-mojibake` + `git diff --stat` afterwards.
3. **A stray file a shell redirection leaves behind gets committed**: a mangled command wrote
   an empty file literally named `=55` into the worktree and the next commit picked it up. It
   took its own commit to drop (`git rm ./=\55`).
4. **GitHub's default setup and the repo's own CodeQL workflow are two configurations** that
   can disagree on one commit (above). Suppression comments that the CLI honours do not have
   to silence the app-run one.

## Machine limits (the founder's, binding)

- Docker is capped at **3 GB** by `.wslconfig`. Start Postgres only for the `db`-marked suite
  and stop it after (`docker compose down`).
- One rerun per merge; a leg red for a cause outside the diff is reported, not re-run
  (§17.4/§16).
