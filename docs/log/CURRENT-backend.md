# CURRENT — backend squad (read this first)

Updated: 2026-11-02 (the same backend session, PR #164's final state) · main at `5392ea9` (PR
#167, the lead's A6 slice) · **This branch is `c1-voice-mediums`, PR #164: the voice group
(BUG-124/125/126/149/151/152/153/154) and BUG-128, all landed, all gates green locally. The
only two red legs on the PR are (1) GitHub's default-setup CodeQL check, which reports two
*false positives* on the k-anonymity SHA-1 and can be neither suppressed nor dismissed from
here (below, with the three attempts and the founder row), and (2) `Build the release APK`
from the `Screen recordings` workflow, which is the lead's path (§16 — reported, never
investigated).**

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
