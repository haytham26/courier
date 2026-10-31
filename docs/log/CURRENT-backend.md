# CURRENT — backend squad (read this first)

Updated: 2026-10-31 (the new backend session) · main at `bbe5e4f` (PR #142, the previous session's
handover, merged; `ac49393` is PR #141, the lead's workflow findings) · **Open: PR #138
(`c1-backend-fixes`), #139 (`c1-bug-115-stop-status`) and #140 (`c1-auth-mediums`). This session's
first job was their legs: #138's `Test` step and `Coverage ratchet` were red (the negative-cache
rotation test faked staleness through a private field and was machine-dependent — fixed at the root
with an injectable clock, this push); #139's restore drill is red (the drill still asserts the
pre-BUG-115 column read — fixed in the next push); #140's only red is the api-35 Maestro leg, which
is the lead's per §16 (reported, not investigated).**

## The binding order for this squad (AUDIT §"The order", MASTER §21)

1. **BUG-063** — **merged** (PR #46).
2. **A1's backend half — MERGED** (PR #57, `b0cfd6b`, ADR-019/D47). `docs/plan/A1-handover.md` is
   the handover to the lead's app side; A2, A4 and B2 are theirs.
3. **A5's first slice — MERGED** (PR #65, `d12231c`, ADR-020/D49). What is left in A5: the
   monitoring, the backups and the restore drill on staging, and the OCI host, key and domain
   (FOUNDER_TODO).
4. **BUG-067 — MERGED** (PR #61, `551bee6`).
5. **B3** — BUG-059's security backlog. The WebSocket token out of the query string is merged
   (PR #75 and PR #90); what is left: `/v1/engines` and `/v1/licences` verified unauthenticated in
   `services/courier-voice/app/main.py` (the BUG-059 hoist), `response_model` on the API's 19
   handlers (PR #108), the bounded voice stores (now BUG-151/152 of C1), and the OWASP MASVS L1
   self-review in `docs/security/`.
6. **B4** — mutmut scoped in CI at the 70 % floor — **merged** (BUG-112, PR #104; the nightly lane
   is `.github/workflows/mutation.yml`).
7. **Then the rest of queue 3.** Billing resumes after A1/A5/B3/B4, per D44.

## C1 — the deep code audit (the current item)

The rows BUG-115..BUG-160 are the verified findings of the backend squad's share of C1. The fix
order is C1's own: **HIGH first**, then BUG-115 (registered medium, but a delivered stop reads
`pending` on Postgres so the courier's whole day is a lie and the trial cannot run), then the
mediums **with the code they touch**, then the lows **as one batch**.

- **HIGH — CLOSED on the branch `c1-backend-fixes`: BUG-096, BUG-121, BUG-122, BUG-127, BUG-146,
  BUG-147, BUG-148, BUG-150.** Each red first, each row carrying its red output and its test. The
  red leg on that branch's final head (the negative-cache rotation test, machine-dependent through
  a private field) is fixed with an injectable clock in this push; BUG-160 is filed and fixed in
  the same PR. BUG-122 took both halves the register asked for: the API refuses an issuer that is
  not an absolute origin, and `scripts/ci/check-auth-issuer.mjs` refuses a compose tree where the
  API and the auth service do not read one variable.
- **BUG-115 — DONE on branch `c1-bug-115-stop-status` (PR #139).** The SQL repo derives the stop's
  status from the events; the sync path stays the one statement BUG-063 pinned. The branch's one
  red is the restore drill's stale contract (`ops/restore_drill.py` still asserted the column read
  `pending` while a delivered event was stored) — that drill line is updated to the derived
  contract in the next push on the same branch.
- **Auth mediums — DONE on branch `c1-auth-mediums` (PR #140): BUG-132, 133, 134, 137, and
  BUG-129/130 closed with the code that replaced the service's own server. BUG-128 stays OPEN with
  its reason** (three attempts could not carry a timeout into the breached-password check).
- **Mediums still open, grouped by the code they touch:** the API auth (BUG-123 — `jwt.decode`'s
  `leeway=0`; BUG-131 — `AUTH_JWKS_URL` has no scheme check and the compose default is plaintext
  http), the sync repo and route (BUG-141, 142, with BUG-139 and BUG-140 alongside, both registered
  LOW), the API surface (BUG-116, 117), the voice service (BUG-124, 125, 126, 149, 151, 152, 153,
  154), and BUG-128 again with a different approach.
- **Lows, one batch:** BUG-118, 119, 120, 135, 136, 138, 143, 144, 145, 155, 156, 157, 158, 159 —
  plus a NEW row for the repo's own `docker-compose.yml` Postgres, whose image carries no `vector`
  library so the stack cannot start locally (the previous session's trap 5; the next free number
  is **BUG-161**, the highest row across `origin/main` and every open PR branch being 160).

## The §16 ownership note

- The Locust SLO profile, the Postgres suite, the restore drill, `infra/`, the deploy scripts and
  `infra/deploy.sh` are the backend's.
- `apps/mobile`, `.maestro` and the Android E2E workflow are the lead's: a red leg on their paths is
  reported per §16, never investigated. **The api-35 Maestro leg is red on #139 and #140 (their
  final heads); the api-34 leg is green on both. Both PRs touch no app path, so the leg is the
  lead's (§17.3: one shared failure, root-caused once on main, covered by their open PRs #135/#52).**

## This session's own state

- **Worktree `.worktrees/b1031` on branch `c1-backend-fixes`**; the PRs' branches are checked out
  per fix, one working tree per branch. The other worktrees are the lead's and the previous
  sessions'. A stash (`stash@{0}: On c1-backend-fixes: bug-115`, the previous session's BUG-115
  work) is left untouched — nothing is abandoned without the handover saying why (§13.2).
- Docker: nothing running. Postgres is started only for the `db`-marked suite and stopped after.
- **15 minutes without output is a stop** (§15). A green local gate before every push; no
  force-push, no rebase, no `git reset --hard`.
- **Bash is a script file, not a `-c` string**: PowerShell mangles quotes, `|`, `$(...)` and
  backticks in a `-c` argument; every command lives in
  `C:\Users\DCL\AppData\Local\Temp\opencode\*.bash|*.py`. The `gh` token is read from `.env.local`
  into `GH_TOKEN` per call, never written to a config outside the repo.
- **A worktree has no `node_modules`**: the generated-client check then goes red on quote style
  because the generator refuses to pass silently without prettier (§6: make local equal CI — put
  the lockfile's prettier on the PATH).
- **A wall-clock request count is a coin-flip threshold**: the Locust gate's vacuous floor of 100
  counted the requests a 60 s window produced, and the healthy band of that count (141-197 here)
  straddles the floor. Fixed with `LOADTEST_ITERATIONS` (each user's day is a fixed number of task
  executions), which makes the count a property of the test. When a gate measures a quantity that
  depends on the runner, fix the measurement before arguing about the run.

## The traps that cost time (this session's)

1. **`bash` is not on the Windows PATH that PowerShell sees** — the interpreter is
   `C:\Program Files\Git\bin\bash.exe`. `Select-String | git show ... | Select-String` also prints
   nothing when the pattern needs `^\| BUG-`.
2. **PowerShell's `Set-Content -Encoding UTF8` writes a BOM**, which made `docs/status/BUGS.md`
   119 lines of whitespace diff. Write with Python (`read_text(encoding="utf-8")` /
   `write_text(..., encoding="utf-8")`) or the `edit` tool, and check `check-mojibake` +
   `git diff --stat` afterwards.
3. **A stub `docker` must find its verb among the arguments**, not in the first position: compose is
   called as `docker compose --env-file <file> -f <file> ps --all --format ...`, so the stub that
   looked at `$1` silently answered the wrong thing and the deploy test passed for the wrong reason.

## Machine limits (the founder's, binding)

- Docker is capped at **3 GB** by `.wslconfig`. Start Postgres only for the `db`-marked suite and
  stop it after (`docker compose down`).
- One rerun per merge; a leg red for a cause outside the diff is reported, not re-run (§17.4/§16).
