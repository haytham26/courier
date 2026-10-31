# HANDOVER 2026-10-31 — the backend squad: C1's highs, BUG-115, the auth mediums

Read this with `docs/log/CURRENT-backend.md`, which is true at this push.

## Where main is

`d367b27` (PR #137 merged, the register's BUG-072/074 rows). Three backend PRs of mine are open on
top of it: **#138** (the nine HIGH findings, BUG-096/121/122/127/146/147/148/150, plus BUG-160),
**#139** (BUG-115) and **#140** (the auth mediums: BUG-132/133/134/137, and BUG-129/130 closed with
their server's code). CI is green on #138's and #139's runs; #140's legs are still running and are
the first thing the next session reads.

## What was done, in order

1. **C1's HIGH findings, each red first.** The red output per row, the tests and the two decisions
   where the fix stopped short of the register's wording are in
   `docs/evidence/c1-backend-high/README.md`. BUG-122 took both halves the register asked for: the
   API refuses an issuer that is not an absolute origin, and `scripts/ci/check-auth-issuer.mjs`
   refuses a compose tree where the API and the auth service do not read one variable. BUG-096's
   fix reads the images that are RUNNING from `docker compose ps --all` and writes the state file
   before `up -d`, proved by `scripts/ci/test-deploy.sh` (10 checks, the real `infra/deploy.sh`
   with a stubbed docker).
2. **BUG-115, on the real SQL repo.** `SqlAlchemyRepo.get_run_stops` derives the stop's status from
   the delivery events (ADR-014 §2's order) instead of reading the column no writer ever touched.
   The derivation is on the READ, not the sync path, because BUG-063 pins the sync's statement
   budget — the first implementation was a write and it turned both cost tests red, and moving a
   second statement into the sync would have weakened a gate. Evidence:
   `docs/evidence/c1-bug-115-stop-status/README.md`.
3. **The auth mediums** (BUG-132/133/134/137), plus BUG-129 and BUG-130 closed with the code that
   replaced the service's own server, and **BUG-128 left open with its reason**: three attempts
   could not carry a timeout into the breached-password check (the top-level `hooks.before` is one
   middleware function whose returned Response does not short-circuit the route, and
   `createAuthMiddleware` is not exported from the package's entry points). Evidence:
   `docs/evidence/c1-auth-mediums/README.md`.

## What the next session must pick up, in order

1. **Read the legs of #138, #139 and #140.** They are the only unread checks. Nothing else may
   merge until they are green on their final heads (§17.4).
2. **The remaining C1 mediums, grouped by the code they touch:**
   - `services/api` sync repo and route: **BUG-139, 140, 141, 142** (the 422's detail, the tenant
     predicate, the cursor as a watermark, and the cursor read in the same transaction).
   - `services/api` surface: **BUG-116** (the Anthropic client per utterance) and **BUG-117** (the
     stop cap).
   - `services/courier-voice`: **BUG-124, 125, 126** (the voice socket's handshake and the one
     cached verifier), **BUG-149** (`remember: false`), **BUG-151, 152, 153, 154** (the bounded
     store, the cost guard's check-and-charge, the per-call cap and the per-session lock).
   - **BUG-128** again: the bounded check in `src/http.ts` with the suite moved onto the service's
     own server, or the plugin forked under D24.
3. **Then the lows as one batch:** BUG-118, 119, 120, 135, 136, 137 is closed, 138, 143, 144, 145,
   155, 156, 157, 158, 159, and **the compose stack's own Postgres** (see the traps).
4. **Then C3's loop toward 98 %**, over the register in `.worktrees/b1030c/data/linz/` (656,392
   addresses, fetched) — rebuild the index from it, do not re-fetch. The 56 failures are enumerated
   per class in `docs/evidence/c3-suburb-vocabulary/README.md`.
5. **Then MASTER §22 step 2** (the pre-classifier, the ask-on-low-confidence rule and the visible,
   clearable memory, from `docs/research/2026/andee-cleanroom-spec.md`, each with numbers measured
   through OmniRoute) and then billing (D44).

## The traps that cost time (this session's)

1. **`bash` is not on the PATH PowerShell sees.** The interpreter is
   `C:\Program Files\Git\bin\bash.exe`; `bash scripts/ci/test-deploy.sh` failed through
   `C:\WINDOWS\system32\bash.exe` (the WSL stub) with `execvpe(/bin/bash) failed`.
2. **PowerShell's `Set-Content -Encoding UTF8` writes a BOM**, which turned one register edit into
   a 119-line whitespace diff. Use Python (`newline=""` on both read and write) or the edit tool,
   and check `check-mojibake` and `git diff --numstat` afterwards.
3. **A stubbed `docker` must find its verb among the arguments.** Compose is called as
   `docker compose --env-file <file> -f <file> ps --all --format ...`, so a stub that read `$1`
   silently answered the wrong thing and the deploy test passed for the wrong reason.
4. **`git stash pop` across branches can resurrect whole-file rewrites** (it replayed a BOM-carrying
   BUGS.md behind my back). After a stash pop, compare the file with `git diff origin/main -- <path>`
   and never trust `git diff` alone while the index is conflicted.
5. **The repo's own `docker-compose.yml` cannot start its Postgres locally**: its `command:` preloads
   `pg_stat_statements,pg_trgm,vector` and the image it names (`postgis/postgis:16-3.5`) carries no
   `vector` library (`FATAL: could not access file "vector"`). CI runs `postgis/postgis:17-3.5` as a
   service container and never reads that file, so the db suite was run against the CI's own image
   (`docker run -d --name courier-pg-ci -e POSTGRES_USER=courier ... postgis/postgis:17-3.5`, stopped
   after). **A real defect on a backend path: give it the next free row.**
6. **Local pytest without `-p no:randomly` reorders the suite** (the coverage gate leaves it on) and
   a test whose handler answers by a call counter can be answered by the wrong document. Make the
   handler's answer depend on what it is asked for, not on how many times it was asked.

## The state of the tree

- **Worktree `.worktrees/b1030f`** is the session's; `.worktrees/b1030c` holds the fetched LINZ
  register (gitignored, survives a branch switch).
- Branch `c1-bug-115-stop-status` was rewound locally by one commit after the auth slice was moved
  to its own branch with a cherry-pick; nothing published was rewritten (the remote head was the
  commit it was rewound to).
- Docker: nothing running. Postgres was started only for the `-m db` suite and stopped after.
- One backend session at a time is on FOUNDER_TODO and is still the only guard.
