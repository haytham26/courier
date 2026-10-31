# HANDOVER 2026-10-30 — the backend squad, the C1 audit's backend half and the C3 loop

Read this with `docs/log/CURRENT-backend.md`, which is true at this push.

## Where main is

`d307712` (PR #127 merged, the C3 slice). `Deploy staging` is green on it, as it has been on every push
to main since PR #111. The Android E2E and CodeQL legs of the merge commit were still running at the
handoff and are the lead's to read.

## What this session did, in order

1. **C1's backend half — the four squads ran, and their findings are verified and filed.**
   Squad 2 (`services/api` minus auth and sync), squad 3 (the server side of sync), squad 4
   (`services/auth` and `services/api/app/auth`) and squad 5 (`services/courier-voice`) each ran as a
   fresh-context subagent with both lenses, and each finding went to a separate fresh-context verifier
   that reproduced it with a failing test or a command or dropped it with its reason. The verified sets
   are in `docs/audit/CODE_AUDIT_2026-10.md` (a new "The backend squad's share" section) and the
   findings are filed in `docs/status/BUGS.md` as **BUG-115 .. BUG-145**, in PR #132. The numbering was
   taken per the rule: the highest number across `origin/main` (BUG-114) and every open PR branch was
   114, so the first new row is 115. **Squad 5's verified set is the one thing this session did not
   finish** — its verifier was still running at the handoff; its rows start at BUG-146 and go on the
   same branch (or its own PR, if #132 has merged).

   The finding that matters most is **BUG-115**: nothing in production writes `stops.status`, so on
   Postgres a stop the courier has delivered answers `pending` and `?status=delivered` returns `[]`,
   while the tests go green because they run `InMemoryRepo`, which derives the status from the log.
   Reproduced end to end against a real SQL database. Two high findings in auth: BUG-121 (no negative
   JWKS cache) and BUG-127 (the rate limiter is keyed by IP and path only, never by account).

2. **C3 — the address loop, measured, fixed, re-measured, and the weekly import built.**

   - **The pipeline's paths were broken.** `scripts/data/*.py` computed the repository root one parent
     short, so the data and the index were written into `scripts/data/linz/` — untracked and NOT covered
     by `.gitignore`'s `data/linz/` entry — while the accuracy suite read `data/linz/`. The previous
     session's "needs `data/linz`, a FOUNDER_TODO item" was this defect, not a missing file. The key was
     in `.env.local` all along, so the session fetched the register itself.
   - **Measured: 85.2 % (1534/1800)** over 656,392 real addresses (Christchurch 225,295, Waimakariri
     236,205, Selwyn 194,892). The dominant failure class: the parser recognised only 45 hardcoded
     Christchurch suburbs, so a driver who had **named** his suburb was still asked which suburb he
     meant — 31 % of the register sits on a road that spans several.
   - **Fixed, red first:** `services/api/tests/test_suburb_vocabulary.py` (12 tests, 9 red before) and
     `AddressStore.suburbs()` on the protocol and both stores, handed to `nz_address.parse`.
     **Re-measured: 96.9 % (1744/1800).** ADR-003 carries both numbers; the evidence file
     (`docs/evidence/c3-suburb-vocabulary/README.md`) carries the failing classes and the one
     hypothesis about the 2026-10-20 baseline. **The trial target (>= 98 %) is NOT met.**
   - **The weekly changeset import** C3 asks for is on main: `scripts/data/fetch-linz-changeset.py`
     (LINZ's changeset API, layer `-123113-changeset`, `viewparams=from;to` — verified live, this week
     426 inserts / 63 updates / 78 deletes) and `.github/workflows/linz-changeset.yml`, which runs
     weekly, rebuilds the index from the live revisions, re-runs the accuracy measure, keeps both as
     evidence, and **skips with a clear notice rather than going red when the secret is absent**.
   - `docs/log/CURRENT-backend.md` and `docs/status/FOUNDER_TODO.md` are corrected: the duplicated LINZ
     key rows are merged into one row marked done and the "LINZ local address export" row is gone.

3. **MASTER §22 step 1 was already on main** (PR #125, `docs/research/2026/andee-cleanroom-spec.md`);
   step 2, the build, is the next session's.

## What the next session must pick up, in order

1. **Finish C1.** File squad 5's verified set (BUG-146+) from its verifier's report in the audit
   record, then merge PR #132 (or open the follow-up PR if it has merged).
2. **Fix C1's critical and high at the root, red-first** (C1's fix order): BUG-115 (the missing
   `stops.status` writer), BUG-121 (the JWKS negative cache), BUG-127 (the per-account rate limit),
   then the mediums.
3. **C3's loop toward 98 %.** The remaining 56 failures are enumerated per class in
   `docs/evidence/c3-suburb-vocabulary/README.md`: the unit-with-letters twin (`287C/28` answers
   `28C`), a unit with no digits before the slash (`GB/87`), a road whose own name is a number word in
   the spoken form, `St Andrews Square` ("St" is read as the street type), `No 10 Road`, difflib
   picking the wrong road for a misspelling, and a multi-word suburb whose first word is also a road
   direction. The data is already on disk — see "The state of the tree".
4. **MASTER §22 step 2 — the build, from the spec on main.** The pre-classifier, the
   ask-on-low-confidence rule and the visible, clearable memory, in `services/courier-voice` and
   `apps/mobile/src/voice`, each a PR with red-first tests and the token and latency numbers before and
   after measured through OmniRoute. Step 3 (the accessibility spike) is research only and ships
   nothing.
5. **Then billing (D44) and the rest of queue 3.**

## The state of the tree

- **Worktrees:** `.worktrees/b1030` (on `b1030-c1-audit`, PR #132) and `.worktrees/b1030c` (on
  `b1030c-main` = `d307712`, clean). `.worktrees/b1030c/data/linz/` holds the **fetched register**:
  `addresses-christchurch.jsonl` (225,295), `addresses-waimakariri.jsonl` (236,205),
  `addresses-selwyn.jsonl` (194,892) and the week's changeset files. It is gitignored, so it survives
  a branch switch — do not re-fetch 656,000 addresses to continue the accuracy work, just rebuild the
  index if you need it.
- **The open PRs #128, #129, #130 and #131 are the lead's** (BUG-071/072/073's fixes and the CURRENT
  update). Their register numbers sit at 112-114; mine are 115+.
- Docker: no containers running this session; nothing was started.
- `docs/log/CURRENT-backend.md` is true at this push.

## The traps that cost time (the next session should not pay them again)

1. **The worktree's `workdir` is not always honoured by a background command.** One background run of
   `fetch-linz.py` executed from the main tree (the unfixed script copy) and wrote 450 MB into
   `scripts/data/linz/` there, which is untracked and not gitignored. It was deleted after the files
   were copied into the worktree. **Lesson: run the data scripts with an absolute path to
   `scripts/data/*.py` from inside the worktree, and check `git status` of the MAIN tree afterwards.**
2. **`git show origin/main:docs/status/BUGS.md | Select-String` silently prints nothing** when the
   pattern needs `^\| BUG-` (the pipe escapes). Use the row pattern with the escaped pipe.
3. **The floor guard reads the committed state**, not the working tree: a `# noqa` in a new test file
   fails the PR until it is committed away.
4. **`scripts/data/fetch-linz.py --limit` defaults to 200,000 and truncates Christchurch (225,295) and
   Waimakariri (236,205)** — the truncated part is the newest addresses, i.e. the new subdivisions.
   Pas `--limit 400000` for a full fetch.
5. **A verifier subagent may write into the repo** despite a read-only brief: verifier 2's probe left
   `services/api/pod-store/*.bin` (three untracked files). Check `git status` of the audit worktree
   after every verifier and delete only untracked files it created.
6. **The `hh` and `your` commands' quoting:** PowerShell does not accept heredocs, and `gh.ps1 pr
   create --body "..."` with a long body fails on the argument count — write the body to a file in the
   approved temp folder and pass `--body-file`.

## The one thing I could not explain, recorded honestly

The 2026-10-20 baseline scored 96.9 % with the same engine and the same pipeline that measured 85.2 %
today, and the multi-suburb question class that cost 266 failures cannot have been absent then (31 % of
the register sits on such a road in both the full and the truncated index). The one hypothesis — that
the 2026-10-20 `data/linz/` copy had an emptier `suburb_locality`, so a road had one suburb — is
unprovable from here because LINZ serves today's revisions. It is recorded as a hypothesis in
`docs/evidence/c3-suburb-vocabulary/README.md` and is the basis of no claim. What is measured is the
2026-10-30 pair: 85.2 % before, 96.9 % after, one data set, one command.
