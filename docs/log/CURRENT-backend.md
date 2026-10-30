# CURRENT — backend squad (read this first)

Updated: 2026-10-31 · main at `733ced5` · **Step 1's first PR is open on branch `c1-backend-fixes`
(worktree `.worktrees/b1030f`): the nine registered HIGH findings of C1's backend share —
BUG-096, BUG-121, BUG-122, BUG-127, BUG-146, BUG-147, BUG-148, BUG-150 — each fixed at the root
with a red-first test, plus BUG-160 (filed and fixed: the voice run client read the phone's row
shape, not the API's). The register's rows and the evidence are in
`docs/evidence/c1-backend-high/README.md`. The next item is BUG-115, then the mediums and the lows.**

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
  BUG-147, BUG-148, BUG-150.** Each red first, each row carrying its red output and its test.
  BUG-122 took both halves the register asked for: the API refuses an issuer that is not an
  absolute origin, and `scripts/ci/check-auth-issuer.mjs` refuses a compose tree where the API and
  the auth service do not read one variable.
- **BUG-115 — the next one.** `SqlAlchemyRepo` never writes `stops.status`, so after a delivery
  event the raw row still says `pending` while `InMemoryRepo` (and every test that runs on it) says
  `delivered`. Proven on the real SQL repo, not on the in-memory double (§14.3), so it needs the
  Postgres suite locally (Docker, capped at 3 GB: `docker compose up -d postgres` and
  `pytest -m db`, then `docker compose down`).
- **Mediums, grouped by the code they touch:** the auth service's own request chain (BUG-128, 129,
  130, 131, 132, 133, 134, 137 — `src/http.ts` already carries 127, 129 and 130's machinery), the
  sync repo and route (BUG-139, 140, 141, 142, 143, 144, 145), the API surface (BUG-116, 117, 118
  — 118 is low), the voice service (BUG-124, 125, 126, 149, 151, 152, 153, 154, 155 — 155 is low),
  and BUG-115's slice.
- **Lows, one batch:** BUG-118, 119, 120, 135, 136, 137, 138, 155, 156, 157, 158, 159.

## The §16 ownership note

- The Locust SLO profile, the Postgres suite, the restore drill, `infra/`, the deploy scripts and
  `infra/deploy.sh` are the backend's. PR #130's E2E legs are the lead's; they were green before it
  merged.
- `apps/mobile` and the Android E2E workflow are the lead's: a red leg on their paths is reported
  per §16, never investigated.

## This session's own state

- **Worktree `.worktrees/b1030f` on branch `c1-backend-fixes`** (from `origin/main`), one working
  tree, one session. The other worktrees are the lead's and the previous sessions'.
- Docker: nothing running. Postgres is started only for the `db`-marked suite and stopped after.
- **15 minutes without output is a stop** (§15). A green local gate before every push; no
  force-push, no rebase, no `git reset --hard`.

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
