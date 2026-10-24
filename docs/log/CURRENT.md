# CURRENT — the handoff

**Week:** 2026-W43 (the full log is in `docs/log/2026-W43.md`). Local `main` == `origin/main`.

**Merged this session:** PR #14 (05 Delivered, merge `da3ef19`, tag `archive/feat/t6-delivered`) and
PR #16 (the audit allowlist gets an owner, a review date, and a gate that refuses a permanent accept,
merge `72da461`, tag `archive/fix/audit-owner-review-date`). The archive tags sit on the **merge
commit**, not the branch tip — the convention of t6-tokens, t6-components, t6-driving, now
t6-delivered and audit-owner-review-date.

**Open: PR #15 (06 Scan, `feat/t6-scan` at `54d86ee`).** Its first E2E failed on **both** legs at
`Tap on id: today-scan`: the flow raised the sheet but never scrolled, and the Scan row is below the
fold (run 40060608949, `relaunches=0` on both). Fixed **in the flow** with `today-list.yaml`'s own
raise-then-scroll pattern; the app's contract is unchanged and no assert was deleted. Rerun:
`40063068694`. **PR #12 (recordings) and the nightly rerun on main are queued behind it — run ONE
E2E at a time** (two 2-runner workflows in one window share the fleet).

**The nightly on main was RED** (run 39926210799 at `d5793b4`, both legs): `driving.yaml` failed at
`"STOP 3 OF 5"` after the slide — the end event beating the drag updates. PR #14's range fixed it and
its green run `40036866832` has it COMPLETED on both legs. **Still PARTIAL**: the nightly has not been
re-run on current main, so do not call it closed until `gh workflow run android-e2e.yml --ref main`
has run green.

**The traps (new this session):**
- Never append to a tracked text file through PowerShell's `Add-Content` — it wrote 5 BEL and 5 FF
  into the W43 log (a word-initial `a` and a word-initial `f` collapsing), and PR #16's Quality gates
  went red on `check-control-chars`. Append with node or the editor.
- A flow that was traced and parse-checked but never RUN is not proven: the first emulator run of
  `scan.yaml` failed because the Scan row sits below the fold. Raise the sheet **and**
  `scrollUntilVisible` (the selector inside `element:`, per BUG-048).
- `braces` no longer produces a high/critical advisory; its allowlist entry is kept and still dated.

**The queue, unchanged:** PR #15 green and merged; PR #12 (merge main in, then the recordings and the
E2E one workflow at a time); the nightly rerun on main; then screen 07 Copilot (the live transcript,
the result card with Undo and Text customer, the D34 sphere), 08 Route, 09 Map style, 10 Summary,
11 Settings, 12 Driving at night, 13 Lock screen (the Android notification built and E2E-tested; the
iOS Live Activity stays PARTIAL until an iOS build lane exists). Then §17.3, §17.7, §17.5, §18 and
Part C. **FOUNDER_TODO:** an Apple Developer account for the iOS build lane, and a real-device
BUG-051 launch test.
