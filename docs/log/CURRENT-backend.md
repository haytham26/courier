# CURRENT — backend squad (read this first)

Updated: 2026-10-28 · main at `e763e51` · **Step 0 is merged (PR #83): the `protect-main` ruleset
could not be created (the token in `.env.local` has no Administration: write) and the row is in
FOUNDER_TODO. B3's route half is PR #90, green on `lint, typecheck, test` and waiting on the lead's
APK build. The next item is B3's remaining three, each verified on the tree — the details are in
`docs/log/HANDOVER-2026-10-28-B.md`.**

## The binding order for this squad (AUDIT §"The order", MASTER §21)

1. **BUG-063** — **merged** (PR #46).
2. **A1's backend half — MERGED** (PR #57, `b0cfd6b`, ADR-019/D47). `docs/plan/A1-handover.md` is
   the handover to the lead's app side; A2, A4 and B2 are theirs.
3. **A5's first slice — MERGED** (PR #65, `d12231c`, ADR-020/D49). **What is left in A5:** the auth
   service's own schema (Better Auth's `npx auth migrate`, which needs the service's options
   module), the monitoring from `infra/monitoring`, the backups and the restore drill on staging,
   and the OCI host, key and domain (FOUNDER_TODO).
4. **BUG-067 — MERGED** (PR #61, `551bee6`).
5. **B3** — BUG-059's security backlog.
   - the WebSocket token out of the query string — **the module's half merged (PR #75)**;
   - **the route's half — PR #90**: the voice route accepts the socket, then `identify` (the header
     or the first `auth` message), and a refusal is one `error` frame and a close **4403**;
   - `/v1/engines` and `/v1/licences` — **verified unauthenticated in
     `services/courier-voice/app/main.py:227,235`**, and their module docstring's "Every call is
     authenticated" is false for them;
   - `response_model` — **verified missing on all 19 handlers of `services/api/app/main.py`**, with
     the contract guard comparing paths only;
   - the BUG-059 fixture hoist (verified: `make_stop`/`make_request` x2, the `InMemoryRepo()`
     fixture x9) and the bounded voice stores (`driver_settings` at
     `services/courier-voice/app/main.py:113`);
   - the OWASP MASVS L1 self-review in `docs/security/`.
6. **B4** — mutmut, scoped in CI at the 70% floor over `services/api` (sync, runs, auth) and
   `services/courier-voice` (the turn machine).
7. **Then the rest of queue 3.** Billing resumes after A1/A5/B3/B4, per D44.

## The §16 ownership note

- **The Locust SLO profile, the Postgres suite, the restore drill, the deploy workflow and the CI
  steps that test them are the backend's.**
- **The Android E2E workflow and `apps/mobile` are the lead's.** A red leg on their paths is
  reported per §16, never investigated. PR #90's `Build the release APK` leg of `Screen
  recordings` is theirs and is the only leg of that PR still pending.
- **A second backend session was working in the main tree** while this one started; it switched
  branches underneath, so this session's first commit landed on its `backend` branch and its next
  checkout rewrote the files this session had just edited. Nothing was lost (pushed within
  minutes and verified with `git ls-remote`). **This session works in the worktree
  `.worktrees/b1028`** from here on, commits immediately after each edit batch, and pushes before
  the next. FOUNDER_TODO carries the ask for one backend session at a time.

## The ritual deviations, recorded

- **Three commits were pushed straight to main** — `045185b`, `dbc7004`, and `f9a7a91`.
- **Step 0's result:** the ruleset POST answered **`403 Resource not accessible by personal access
  token`**; `gh api .../rulesets` listed nothing before it and `gh api
  .../rules/branches/main` prints nothing after it, so the repository has **no branch protection
  today**. Per the directive, no retry was made. Until it is enabled the discipline is the only
  guard: branch, PR, green checks, merge commit.
- **A branch was rebased once** (`fix/bug-067-map-pack-inputs`, before it was pushed).
- **One working-tree blunder this session:** `Add-Content ..\.gitignore` from the worktree edited
  the **main tree's** `.gitignore` and truncated it. Restored from `git show HEAD:.gitignore`
  within the minute, verified by `Select-String` (78 lines, `Thumbs.db` at 38) and
  `git -C .. status`. The lesson is in the handover.

## Machine limits (the founder's, binding)

- Docker is capped at **3 GB** by `.wslconfig`. Start Postgres **only** for the `db`-marked suite
  and stop it after (`docker compose down`).
- **15 minutes without output is a stop** (§15).
- One rerun per merge; a leg red for a cause outside the diff is reported, not re-run (§17.4/§16).
