# HANDOVER 2026-10-30 — the backend squad, second session on the deploy chain

Read this with `docs/log/CURRENT-backend.md`. This is the second session on the
`Deploy staging` chain; the first is `docs/log/HANDOVER-2026-10-29-D.md`, which
records causes 1-8 and the traps. Both are on main.

## Where main is

`cabbea0` — PR #120 merged (C3's two parser slices). `Deploy staging` is green on
it, as it has been on every push since PR #111: the run on `cabbea0` is
[40979708869](https://github.com/haytham26/courier/actions/runs/40979708869).

## What this session did, in order

1. **Found and fixed cause 8b of the deploy chain** (PR #111, BUG-111's sibling):
   the version check counted as a pass without counting as a *check*, so a green
   smoke test reported `the smoke test failed (4/3)` and rolled back a deployment
   that had passed every check it ran. The arithmetic fix was one line; the proof
   was the whole script against the real stack, 4 of 4. **The green run on
   `fc9a625` (40913771504) is the closing proof for the whole chain.**
2. **Verified B4 rather than redoing it**: mutmut at the 70 % floor was already on
   main (PR #110) — the dependency, both services' `[tool.mutmut]` scope, the
   floor script and the nightly + manual `mutation.yml` lane. The one honest gap
   is named in CURRENT-backend.md and in the workflow's own header: the nightly
   lane has not run yet (scheduled 03:40 UTC), so the runtime is unmeasured and
   the PR-time `check` variant is the follow-up.
3. **A5's remainder** (PR #115, #117 and the CURRENT update): fixed the monitoring,
   which pointed its heartbeat at `/health/ready` on an API that answers 404 there
   and serves `/healthz` — proven against the real services (`/healthz → 200`,
   `/health/ready → 404`). Recorded that A5's four remaining items all need the OCI
   host and are in FOUNDER_TODO, including a row that did not exist (the release
   APK's `EXPO_PUBLIC_API_URL`, A5's third done-when).
4. **C3's two parser slices** (PR #120), worked where the existing measurement
   points: the engine already measures **96.9 % (1745/1800) against 656,044 real
   LINZ addresses**, so the fixes target the failures that measurement printed:
   - a unit carrying a letter before a slash (`255C/28`, `4D/87`, `D/87` — the
     last did not parse at all);
   - a road's direction word before the suburb (`193 Durham Street South
     Christchurch Central`), which answered with no suburb.

   Both red-first, both with the regression guard that caught an over-reach
   (`central` is a suburb name in NZ far more often than a road direction, and
   treating it as one broke `test_address_correction.py`).

## What the next session must pick up

1. **C3's re-measure.** The two fixes are merged; the accuracy number needs
   `data/linz`, which only the founder can supply (FOUNDER_TODO, already
   recorded). When it arrives: run `scripts/data/fetch-linz.py` for the three
   areas, `build-linz-index.py`, then `pytest tests/test_linz_accuracy.py`, and
   write the before/after into the ADR C3's done-when asks for.
2. **C3's third known defect, left deliberately unfixed** (recorded in
   `docs/evidence/c3-road-direction/README.md`): `_words_to_digits` converts a
   road's *name* too eagerly — `928 Two Chain Road Swannanoe` parses the road as
   `2 Chain Rd`. A different class from the two fixed; needs its own test.
3. **B4's PR-time variant**: wire `check-mutation-floor.mjs check <service>` into
   the floor job, once the nightly lane has run and measured the runtime.
4. **MASTER §22**: `docs/research/2026/andee-cleanroom-spec.md` is not written.
5. **Then billing (D44) and the rest of queue 3.**

## The state of the tree

- The worktree `.worktrees/b1028d` is on `c3-linz-measure` (merged, deleted on
  origin); `docs/current-true-after-b4`, `fix/monitoring-api-health`,
  `docs/a5-state` and `a5-backups-restore` were local names, merged and deleted.
- Docker: no containers running; every stack this session started was taken down
  with `down -v` after its run (the founder's 3 GB cap).
- `docs/log/CURRENT-backend.md` is true at this push.
- One force-push happened earlier in the deploy chain's work (recorded in
  CURRENT-backend.md's deviations). None since.
