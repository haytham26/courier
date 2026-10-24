# CURRENT — the handoff

**Week:** 2026-W43 (the full log is in `docs/log/2026-W43.md`). Local `main` == `origin/main` == `b06b20e`.

**Merged this session:** PR #14 (05 Delivered, `da3ef19`, tag `archive/feat/t6-delivered`), PR #16 (the
audit allowlist now needs an owner and a finite review date, and a past date FAILS the gate,
`72da461`, tag `archive/fix/audit-owner-review-date`) and PR #17 (the status and the handoff,
`b06b20e`, tag `archive/docs/status-and-handoff-after-two-merges`). Every archive tag sits on the
**merge commit** — the convention of t6-tokens, t6-components, t6-driving, t6-delivered and the rest.

**Open: PR #15 (06 Scan, `feat/t6-scan` at `776816a`).** Its emulator runs are the live problem.
Three runs so far, each triaged with `docs/plan/PLAYBOOK.md`, each fixed in the FLOW or the APP, never
by weakening a gate:

| Run | api-34 | api-35 | Cause | Fix |
|---|---|---|---|---|
| 40060608949 | `today-scan` not found | same | the flow raised the sheet but never scrolled; the Scan row is below the fold | the flow gained `today-list.yaml`'s own raise-then-scroll (`54d86ee`) |
| 40063068694 | `"Address found. Hold steadily"` not visible | same + `driving.yaml` died at `launchApp` on GL preemption | the screen renders instantly but the mock reader answers after its beat; a bare `assertVisible` raced it. api-35's driving red is the known fleet flake. | the flow waits with `extendedWaitUntil` (`776816a`) |
| 40067145473 | `Failed to find ColorBuffer` / `Failed to bind to texture` | — | the emulator's own GL breaking down mid-run; no app assert reached | **not yet fixed — see below** |

The api-34 GL failure is infrastructure (PLAYBOOK row 3: one rerun allowed). It has now appeared in
two runs. Per §19.1's two-attempt rule the next step is a **single-leg rerun of api-34 only**
(`gh run rerun <id> --failed`, or the api-34 leg alone), NOT another full push — a third identical
failure would park it in `docs/status/BUGS.md` and move on. **PR #12 (recordings) and the nightly
rerun on main are queued behind this: run ONE E2E at a time.**

**The nightly on main is still PARTIAL, not closed.** Run 39926210799 at `d5793b4` failed on both
legs at `"STOP 3 OF 5"`; PR #14's range fixed it and its green run `40036866832` has it COMPLETED on
both legs. It stays PARTIAL until `gh workflow run android-e2e.yml --ref main` runs green.

**WIP on `feat/t6-copilot` (screen 07), NOT pushed.** The transcript model
(`apps/mobile/src/copilot/turns.ts`, 13 tests), the screen (`app/copilot.tsx`, 7 tests), the
`copilot` route registered in the protected stack, `driving.tsx`'s Copilot control opening it, and
`.maestro/copilot.yaml`. Local gates green: 37 suites / 447 tests, typecheck, eslint 0, floor clean.
It is unpushed **because the E2E fleet is in use** — pushing starts a 30-minute E2E that would
preempt PR #15's. Push the moment PR #15's api-34 leg is decided.

**The traps (carry these forward):**
- Never append to a tracked text file through PowerShell's `Add-Content` — it writes BEL/FF control
  bytes (a word-initial `a` or `f` collapsing) and reddens the Quality gates. Use node.
- Commit to the branch you are pushing, never to `main`. Committing to local `main` twice cost two
  recovery steps this session.
- A Maestro flow that was traced and parse-checked but never RUN is not proven; a first emulator run
  is when below-the-fold rows and not-yet-answered statuses surface.
- Anything that takes time (a reader beat, a settling permission) is waited for with
  `extendedWaitUntil`, never a bare `assertVisible`.
- A `text` selector is a full-match regex — copy the app's exact string, do not retype it.

**The queue, unchanged:** PR #15 green and merged; PR #12 (merge main in, then the recordings and
the E2E one workflow at a time); the nightly rerun on main; then screen 08 Route, 09 Map style,
10 Summary, 11 Settings, 12 Driving at night, 13 Lock screen. Then §17.3, §17.7, §17.5, §18, Part C.
**FOUNDER_TODO:** an Apple Developer account for the iOS build lane (it is what keeps screen 13's
Live Activity and the iOS half of every recording at PARTIAL), and a real-device BUG-051 test.
