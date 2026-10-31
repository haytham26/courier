# CURRENT — backend squad (read this first)

Updated: 2026-10-31 · main at `d367b27` · **Three open PRs of mine, in order: #138 (C1's nine HIGH
findings, red first, plus BUG-160), #139 (BUG-115, on the real SQL repo) and #140 (the auth mediums,
and BUG-128 left open with its reason). The next session's first job is to read their legs
(§17.4), then the remaining C1 mediums grouped by the code they touch.** The handover is
`docs/log/HANDOVER-2026-10-31-G.md`.

## The binding order for this squad (AUDIT §"The order", MASTER §21)

1. **BUG-063** — merged (PR #46).
2. **A1's backend half — MERGED** (PR #57, ADR-019/D47). A2, A4 and B2 are the lead's; **A1 slice
   3 is the lead's open PR #135** and reads the real run through this squad's `get_run_stops`, which
   now derives a stop's status (BUG-115).
3. **A5** — MERGED (PR #65, ADR-020/D49). What is left: the monitoring, the backups and the restore
   drill on staging, and the OCI host, key and domain (FOUNDER_TODO).
4. **BUG-067 — MERGED** (PR #61).
5. **B3** — the WebSocket token's halves are merged (#75, #90). Left: `/v1/engines` and
   `/v1/licences` verified unauthenticated, the BUG-059 hoist, the OWASP MASVS L1 self-review.
6. **B4** — MERGED (BUG-112, PR #104; the nightly mutation lane).
7. **Then the rest of queue 3.** Billing resumes after A1/A5/B3/B4, per D44.

## C1 — where the fix order stands

- **HIGH — DONE on branch `c1-backend-fixes` (PR #138):** BUG-096, 121, 122, 127, 146, 147, 148,
  150, each red first, plus **BUG-160** filed and fixed (the voice run client read the phone's row
  shape, not the API's). Evidence: `docs/evidence/c1-backend-high/README.md`.
- **BUG-115 — DONE on branch `c1-bug-115-stop-status` (PR #139).** The SQL repo derives the stop's
  status from the events; the sync path stays the one statement BUG-063 pinned. Evidence:
  `docs/evidence/c1-bug-115-stop-status/README.md`.
- **AUTH MEDIUMS — DONE on branch `c1-auth-mediums` (PR #140):** BUG-132, 133, 134, 137, and
  BUG-129/130 closed with the code that replaced the service's own server. **BUG-128 is OPEN with
  its reason** (three attempts could not carry a timeout into the breached-password check).
  Evidence: `docs/evidence/c1-auth-mediums/README.md`.
- **What remains (mediums, grouped by the code they touch):** sync repo and route (BUG-139, 140,
  141, 142); the API surface (BUG-116, 117); the voice service (BUG-124, 125, 126, 149, 151, 152,
  153, 154); BUG-128 again with a different approach. **Then the lows as one batch:** BUG-118, 119,
  120, 135, 136, 138, 143, 144, 145, 155, 156, 157, 158, 159, and the compose stack's own Postgres
  (see the traps).
- **Numbering:** the highest row across `origin/main` and every open PR branch was **159**, so the
  next new row is **160** — and BUG-160 is taken by PR #138, so **the next free number is 161**.

## The §16 ownership note

- The Locust SLO profile, the Postgres suite, the restore drill, `infra/` and the deploy scripts are
  the backend's.
- `apps/mobile`, `.maestro` and the Android E2E workflow are the lead's: a red leg on their paths is
  reported, never investigated. The three open PRs #138/#139/#140 touch no app path, so the E2E legs
  that ran on their heads are the lead's to read.

## This session's own state

- **Worktree `.worktrees/b1030f`**, one session, one working tree. The fetched LINZ register is in
  `.worktrees/b1030c/data/linz/` (656,392 addresses) — rebuild the index from it, do not re-fetch.
- Docker: nothing running. Postgres is started only for the `-m db` suite and stopped after.
- Local `bash` is `C:\Program Files\Git\bin\bash.exe`, not the WSL stub on the system path.
