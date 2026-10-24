# CURRENT — the handoff

**Week:** 2026-W43. **Local `main` == `origin/main` == `ba29e87`** (PR #22 merged and
tagged `archive/fix/bug-052-emulator-swiftshader-gpu`; the branch is deleted).

## The queue, in order

| PR | Screen | Branch | State |
|---|---|---|---|
| **#28** | 11 Settings | `feat/t6-11-settings` @ `c448433` | CI running |
| **#24** | 09 Map style | `feat/t6-09-map-style` @ `0e30f17` | CI running |
| **#20** | 08 Route | `feat/t6-route` @ `b0bae7e` | CI running |
| **#18** | 07 Copilot | `feat/t6-copilot` @ `6aaaf8a` | CI running |
| **#15** | 06 Scan | `feat/t6-scan` @ `4cbea15` | CI running |
| **#12** | recordings | `feat/t6-recordings` | next |

## BUG-060 is MERGED (the emulator boots with software GL)

The workflow starts the emulator with `-gpu swiftshader_indirect` and
`scripts/ci/check-emulator-gpu.mjs` (24 tests) in the floor job fails any
workflow that boots an emulator without it. PR #22's run 40112419901 was GREEN
on BOTH api legs on the hardened head. The GL chatter lines still appear in a
green run and no flow dies on them - the honest record is in
`docs/status/BUGS.md`, and the evidence is
`docs/evidence/bug-053-emulator-gl/README.md` (the folder keeps its old name;
the renumber is recorded).

**The BUG-053 collision is resolved:** the founder's instruction was to keep
both rows and take the next free number. The queue-2 audit (PR #26) landed
BUG-053..BUG-058 for lead-owned findings first, so the emulator GL bug is
**BUG-060** everywhere (the gate prints it, `android-e2e.yml`'s comment reads
it, D37 reads it). Both rows are in the tracker and the collision note is at
the end of the hunt log.

## Next items, in order

1. The merge ritual for #28, #24, #20, #18, #15 as each goes green: merge
   commit → `archive/<branch>` tag at the merge tip → delete the branch → ff
   main. **The lead-owned findings of the audit (BUG-053..BUG-058) are the next
   work after the screens land** - the founder named them as the queue's
   content.
2. PR #12 (the recordings).
3. The remaining screens: 10 Summary (built and GREEN locally on
   `feat/t6-10-summary` @ `1598008` - its own branch, not yet pushed),
   12 Driving at night, 13 Lock screen (iOS parts stay PARTIAL), 01 Welcome,
   02 Sign in.
4. Then the whole of `docs/plan/MASTER_EXECUTION.md` in its §4 order.

## The traps

- **Never use PowerShell `Add-Content`/`Set-Content`/`Out-File` on a tracked
  file** - it writes BEL/FF control bytes. Write with node or the edit tool,
  and run `node scripts/ci/check-control-chars.mjs` before every commit.
  (The settings.tsx rename `radius.` → `radii.` used `Set-Content` once and was
  verified clean afterwards; do not repeat it.)
- **A hook outside a component is a crash on import**: `useMemo` at module
  level in settings.tsx took the suite down; the store now lives inside the
  component.
- **Probes never live in the repo** (PLAYBOOK §10): scratch goes in
  `C:\Users\DCL\AppData\Local\Temp\opencode`.
- A jest test path containing `(tabs)` is a regex group: use `-c
  apps/mobile/jest.config.js` and a pattern without the parentheses.
- The locale's PowerShell wraps `gh.ps1`'s output in error records: a push
  ending `Exited with code 1` has still succeeded - read the output, then
  confirm with `gh run list`.
- Merging main into a PR that changed `docs/log/CURRENT.md` or the week log
  conflicts by design: take theirs (main's handoff is the common history).
- Never push to a branch while its own E2E is queued; one E2E at a time.
- Merge commits only; archive tag at the merge tip before deleting the branch;
  no force-push, no rebase of pushed branches, never delete tags.

**FOUNDER_TODO (unchanged):** an Apple Developer account for the iOS build lane;
a real-device BUG-051 launch test.
