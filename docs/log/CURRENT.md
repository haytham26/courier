# CURRENT — the handoff

**Week:** 2026-W44. **Local `main` == `origin/main` == `73da005` (the state at this handoff). Lead session 11, 2026-11-01.**


## Lead session 11 (2026-11-01): the CI mediums, the gate that found a second one, and the app-side root cause of five red flows

**Merged this session (each: merge commit → archive tag → remote branch deleted, `git ls-remote` printing nothing):**

| PR | What | Merge |
|---|---|---|
| **#144** | C1 BUG-090, 091, 092 — the sync layer's three mediums | `b8693c9` |
| **#145** | C1 BUG-077, 078 — the session, and the auth client's storage | `10f9f76` |

**Open, with their exact state:**

| PR | What | Its state |
|---|---|---|
| **#135** | A1 slice 3 (finished) and slice 4 (the done-when) | head `d6f7172`. The a1 job's own flow has still not been witnessed green on the final head — three runs so far stopped at the stack (twice, both now fixed and both proven locally), and at the emulator boot (infrastructure, one re-run recorded on the PR per §17.4). **Do not push to this branch while a run is in flight**: each push cancels the legs. |
| **#146** | C1 BUG-080 — the route screen's segments read the run | head `e2e9a4e` (main merged in, §13.3 check passed). Both Maestro legs green. Awaiting the merge ritual. |
| **#147** | C1 BUG-085 — the pack's checksum is checked against the archive | head `1a44d7c` (main merged in). Both Maestro legs green. Awaiting the merge ritual. |
| **#155** | C1 BUG-100, 101, 104, 162 — the CI mediums | head `b7427a2`. Its CodeQL checks were starting. CI-only, so no Android E2E. |

**What session 11 did, in order:**

1. **The a1 job's runs, rooted at §12.** The first stopped before any flow ran at its own stack: the API's missing `AUTH_JWKS_URL`/issuer, then the auth service's own missing tables — both fixed, both proven locally with all four services healthy from a fresh database. Then its **sibling legs** went red because slice 4's three flows had joined `.maestro/*.yaml`'s glob (fixed by moving them to `.maestro/a1/`), and the evidence upload failed on a flow name carrying a colon (fixed with parameter expansion, because `ls` prints the directory with a trailing slash so `basename`/`dirname` read the parent's name — `maestro-failure-tests-`). And **the app sent the wrong credential**: `sessionToken()` answered Better Auth's session token, which the API has no way to verify — proven 401 against the real stack, and 200 for the token the auth service mints at `/token`.
2. **BUG-161, filed by the device and fixed at its root.** The run of `e59aaaf` was red on **both** legs at five flows. The device logcat named it: `[op-sqlite] statement execution error: database is locked`, and the failure dump's own a11y tree showed an empty day (`today-go` and `today-mark-delivered` nowhere in it, "Every stop is delivered."). The cause was in the app's own construction site: the event log and the run cache each opened `courier.db` with their own `open({name})` — BUG-089's lesson applied per-store, not to the handle. Two handles on one SQLCipher file, a write lock per file, and the cache read that holds the day never completed. Fixed with one shared handle per name (`src/sync/dbConnections.ts`), red-first (4 of 6 cases red against the unshared form), and Today pinned to answer the E2E build's day through the store the root layout hands it.
3. **C1's CI mediums, and the gate that found a second one while fixing the first.** BUG-100 (the App Store Connect key in a job-level `env:`), BUG-101 (the restore drill's DROP/CREATE pair with no `ON_ERROR_STOP`), BUG-104 (a half-measured module passing as measured) — and **BUG-162**, filed new because the gate I added for BUG-100 caught `linz-changeset.yml:49` carrying `LINZ_LDS_API_KEY` at a job level, in a job that runs `actions/checkout` before it needs the credential. That is the proof it is a gate and not a note. **BUG-102 (`map-pack.yml`'s `EXTRACT_URL`) is the backend's and is left open with a §16.3 line**, as is BUG-096 (`infra/deploy.sh`).

**The traps of session 11 (all live):**

- **`gitleaks` scans the PR's commit RANGE, not the head tree.** A finding is attributed to the commit where the line was *added*, so relabelling a literal in a later commit does not clear it. A test fixture in the shape of a credential goes in `.gitleaks.toml`'s allowlist, the documented pattern that file carries for exactly this class.
- **One folder per stack.** `.maestro/run-all.sh` globs `.maestro/*.yaml`; a flow for a different stack must not be able to join that glob by being dropped in the folder.
- **`ls -1dt .../tests/*/` prints the directory WITH a trailing slash**, so `basename`/`dirname` read the parent's name, not the dump's own — which is what left the sanitised name empty and put the dump in a directory carrying the colon that made the artifact upload fail.
- **A merge's BUGS.md conflict must be resolved from MAIN's copy, never "ours wins".** The naive resolution reopened six rows main had fixed (BUG-077, 078, 090, 091, 092, 115) — the clobber that took BUG-074 twice. Main's text is the answer for every row main carries; only a row main does NOT carry is restored from the branch. Verify it after, with a script that compares the three sides.
- **`git add` stages the merge, and the §13.3 check must run on the STAGED tree, not HEAD** — the first run of it reported three deletions that were only files HEAD lacked and the merge brought in.
- **A PowerShell `$env:VAR` does not survive into `gh`** in the same command chain the way it does for `git`; load it in the same command and never print the token.
- **The `Read` tool can return the same head of a file repeatedly** when a `grep` would have answered; `grep` with line numbers, or reading with an offset, is faster than repeated reads.
- **An `eslint-disable-next-line` for a rule that is not configured is an error**, not a no-op — and a suppression would be a floor-guard finding anyway.

**What is left, in order:** A1 slice 4's green run on the final head of #135 (watch the run, do not push while it is in flight); then A4 (the build check that fails a release build on a reachable mock — **BUG-079's row says its fix lands with that build check**, so it closes in that PR), A2, C2, A6, MASTER §22's app side, the remaining mediums (BUG-081 — but slice 3 already rewired Today to the run store on #135, so check the row against that branch before writing a red test), the lows as one batch, BUG-102 and BUG-096 left to the backend, and the rest of the audit and MASTER to the §6 Definition of Done.
