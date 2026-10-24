# CURRENT — the handoff

**Week:** 2026-W43. **Local `main` == `origin/main` == `4aeddec`.**

## Merged this session (each: merge commit → archive tag at the merge tip → branch deleted)

| PR | What | Tag |
|---|---|---|
| **#22** | the emulator boots with software GL (BUG-060) + the gate `scripts/ci/check-emulator-gpu.mjs` | `archive/fix/bug-052-emulator-swiftshader-gpu` |
| **#29** | the lead's five audit findings (BUG-053..BUG-057) | `archive/fix/audit-lead-findings` |
| **#24** | 09 Map style on the chosen tokens | `archive/feat/t6-09-map-style` |
| **#20** | 08 Route on the chosen tokens (the run as a timeline) | `archive/feat/t6-route` |
| **#28** | 11 Settings on the chosen tokens | `archive/feat/t6-11-settings` |
| **#15** | 06 Scan on the chosen tokens + **the status precedence fix** | `archive/feat/t6-scan` |

## Open

| PR | What | Branch | State |
|---|---|---|---|
| **#30** | 10 Summary | `feat/t6-10-summary` @ `e41fbc3` | CI running |
| **#18** | 07 Copilot | `feat/t6-copilot` @ `6aaaf8a` | **BLOCKED by BUG-061** |
| **#12** | the screen recordings | `feat/t6-recordings` | next |

## BUG-061 is the one to read next

PR #18 has lost the E2E gate four times with two shapes: three runner deaths
(`adb: device offline`, flows asserting against a dead emulator) and one real
app death - the readiness gate's `UNKNOWN crash signature`: `SIGSEGV` /
`SEGV_ACCERR`, a gwp_asan `GuardedPoolAllocator::deallocate` in libc.so, 4 s
into a cold start. The branch's diff against main is **JS-only** (a copilot
route registered in the root layout, `app/copilot.tsx`, `src/copilot/turns.ts`),
so no native library or initialiser changes, and main's own APK passes the same
gate on the same image family. The recorded next step if the SIGSEGV ever
repeats with the same tombstone: bisect the APK, branch head against main.

## The scan screen's fix, worth remembering

`app/scan.tsx`'s status checked `device === undefined` FIRST, and the E2E
emulator is started with `-camera-back none`, so no back device exists there and
the mock reader's answer could never reach the screen. The reader's answer now
wins (the reader is a mock in the E2E build and reads the run's labels without a
camera); a device with no camera reads as "nothing to point at", only while
nothing has been read yet.

## Next items, in order

1. PR #30's merge ritual as it goes green.
2. PR #12 (the recordings).
3. PR #18: rerun its legs when the runner is quiet; if the SIGSEGV repeats,
   follow BUG-061.
4. The remaining screens: 12 Driving at night, 13 Lock screen (the iOS parts
   stay PARTIAL), 01 Welcome, 02 Sign in.
5. Then the whole of `docs/plan/MASTER_EXECUTION.md` in its §4 order.

## The traps

- **Never use PowerShell `Add-Content`/`Set-Content`/`Out-File` on a tracked
  file** - it writes BEL/FF control bytes. Write with node or the edit tool, and
  run `node scripts/ci/check-control-chars.mjs` before every commit.
- **Rebuild the tokens before a local typecheck**: `packages/design-tokens/dist`
  is generated and CI builds it, so a stale local dist reports type errors that
  CI does not have (the scan branch hit `typography.matchTitle`). Rebuild with
  `node_modules/.bin/tsc -p packages/design-tokens/tsconfig.build.json`.
- **Probes never live in the repo** (PLAYBOOK §10): scratch goes in
  `C:\Users\DCL\AppData\Local\Temp\opencode`.
- The PowerShell console wraps `gh.ps1`'s output in error records; a push that
  ends `Exited with code 1` may still have succeeded - read the output, then
  confirm with `gh run list`.
- Merging main into a PR that changed `docs/log/CURRENT.md` or the week log
  conflicts by design: take theirs (main's handoff is the common history).
- One E2E at a time; never push to a branch while its own E2E is queued.
- Merge commits only; archive tag at the merge tip before deleting the branch;
  no force-push, no rebase of pushed branches, never delete tags.

**FOUNDER_TODO (unchanged):** an Apple Developer account for the iOS build lane;
a real-device BUG-051 launch test.
