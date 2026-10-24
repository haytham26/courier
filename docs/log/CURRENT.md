# CURRENT — the handoff

**Week:** 2026-W43 (the log is `docs/log/2026-W43.md`). Session: the founder's FINAL_LEAD.

**Merged (local `main` == `origin/main` == `b06b20e`):** PR #14 (05 Delivered, `da3ef19`), PR #16
(the advisory allowlist: an accepted advisory needs an **owner and a finite review date**, and a past
date FAILS the gate — 8 new tests), PR #17 (status + handoff). Archive tags sit on the merge commit.

## The open PRs, in the order the queue wants them

| PR | Screen | Branch | State |
|---|---|---|---|
| **#15** | 06 Scan | `feat/t6-scan` @ `776816a` | **BLOCKED by BUG-052** (below) |
| **#18** | 07 Copilot | `feat/t6-copilot` @ `6fd3803` | flow fixed, re-running |
| **#20** | 08 Route | `feat/t6-route` @ `b9a62d6` | E2E running |
| **#12** | recordings | `feat/t6-recordings` | next after #15 |
| **#19** | **the backend session's** routing solver (ADR-009) | `feat/routing-solver` | **NOT MINE** — do not touch `services/` |

**PR #19 is the parallel BACKEND session's** (`services/api`, PyVRP 0.14.1 behind a `RouteEngine`
seam, ADR-009). My rule from the founder's handoff: never edit `services/` except through an ADR I
agree; merge `origin/main` often. Screen 08's Optimise is the app-side consumer of it.

## BUG-052 — the E2E gate cannot be driven green, and why

Three E2E runs of PR #15 and one api-34-only rerun. **The first two were REAL defects and are
fixed** on `feat/t6-scan`:
1. `54d86ee` — the flow tapped `today-scan` without scrolling; the row is below the fold of the
   sheet's ScrollView (run 40060608949, both legs, plain `Element not found`).
2. `776816a` — the flow *asserted* the reading's status line with a bare `assertVisible` while the
   mock reader still had its beat to run (run 40063068694); now waited with `extendedWaitUntil`.

**The third and the api-34-only rerun both died at `launchApp`** on
`DisplaySurfaceGlContextHelper context was preempted by others` + `Failed to restore previous
context: 12297`. That is the **fleet**, not the image: at the time, other E2E workflows were in
flight. Two attempts on one hypothesis is where §19.1 and the founder's rule stop, so it is parked in
`docs/status/BUGS.md` (BUG-052) with the evidence in
`docs/evidence/t6-screens/06-scan/e2e-fleet-gl/README.md`.

**THE DECISIVE EXPERIMENT THAT HAS NOT BEEN TRIED:** a `workflow_dispatch` on `feat/t6-scan` with
**no other E2E in flight**. Do that before touching anything about the image. A third identical
failure under a solo run moves it from "fleet" to "the image itself" (a BUG-051 family extension) and
needs the api-34 leg's own tombstone read (PLAYBOOK §2 step 4).

**PR #18 just proved the trap is real, in my own flow.** Its first E2E run failed on
`Tap on id: today-go` — `Element not found` — because the Go sits in the sheet's NEXT STOP block,
below the fold at peek. Fixed in `6fd3803` with the repo's own raise-then-scroll gesture. Its api-35
leg died at `launchApp` on the same GL signature (BUG-052, with PR #20's E2E in flight).

## The trap that has now cost the most (4 times this session)

**Never append to a tracked text file through PowerShell's `Add-Content`** — it writes BEL/FF control
bytes (a word-initial `a` or `f` collapsing into a control character) and the Quality gates go red.
It has now done this four times, including on BUGS.md's own row. Repair at byte level with node
(`FF→f`, `BEL→a`), and append with node or the editor. `check-control-chars.mjs` catches it every
time — that gate is why it never shipped.

## Where the screens stand (the §13.7 / §13.8 / D33 bar)

01 Today ✅ merged · 02 Driving ✅ · 05 Delivered ✅ · 06 Scan (#15, blocked) · 07 Copilot (#18) ·
08 Route (#20). **01 Welcome and 02 Sign-in are NOT rebuilt on the chosen tokens** — the only auth
routes on main are the legacy `(auth)/login` and `(auth)/register`. They are on the founder's list.

## The screens still to build (one branch from `main` each, PR per screen)

09 Map style (rebuild `(tabs)/map.tsx` on the chosen tokens — it still speaks the legacy theme;
the real modules `viewModes`/`offlinePack`/`styles` already exist and are the honest data source, so
this is a re-skin plus the reference's mode sheet, not new map logic) · 10 Summary · 11 Settings ·
12 Driving at night · 13 Lock screen (Android notification built + E2E-tested; the iOS Live Activity
stays **PARTIAL** until an iOS build lane exists — FOUNDER_TODO). · 01 Welcome + 02 Sign in if not
rebuilt. Then the **legacy-token deletion PR with proof**.

## Then §17.3, §17.7, §18, Part C

Part C on the app side: sign-in, the scanner OCR on Android (ML Kit), the offline map pack, wiring
the app to the backend session's solver and API through its ADRs, store readiness. The solver, the
API and the voice server brain are the backend session's.

## The immediate next actions, in order

1. **PR #18 and #20's E2E** — check them; if red on the `today-go`/`today-scan` class fix the flow,
   if red on `launchApp` GL it is BUG-052 and only a **solo** rerun decides it.
2. **PR #15** — a solo `workflow_dispatch` with no other E2E in flight. If green, merge with the
   ritual (merge commit, `archive/feat/t6-scan` at it, delete the branch, ff main).
3. **PR #12** — merge `main` in, then the recordings and the E2E **one workflow at a time**.
4. **One rerun of the nightly on main** (`gh workflow run android-e2e.yml --ref main`), solo.
5. Then the screens in the order above, one branch from `main` each, merging `origin/main` in before
   the PR because the screens share `_layout.tsx`.

**FOUNDER_TODO (unchanged):** an Apple Developer account for the iOS build lane; a real-device
BUG-051 launch test.
