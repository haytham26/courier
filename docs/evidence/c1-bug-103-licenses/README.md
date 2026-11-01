# BUG-103 — the licence gate's silent pass (PR #158, fix/c1-bug-103-licenses-gate)

## The defect, reproduced against the real script

`scripts/ci/check-licenses.mjs` looked each mobile dependency's licence up with
`pnpm view <name> license --json`. On any failure the answer became
`'unknown'`, and the loop read `'unknown'` as neither forbidden nor reviewable:

```js
} else if (!allowed && licence !== 'unknown') {   // 'unknown' skipped entirely
```

so a registry outage, a timeout, or an unreachable `pnpm` left all 31 packages
uncleared and the gate GREEN. The audit's verifier proved it (31 packages all
`unknown`, exit 0); it reproduced here, platform-neutrally, by running the gate
with a PATH that cannot find `pnpm`:

```
check-licenses: 31 package(s) checked, no forbidden licence
exit: 0
```

The artifact of the same silent pass is committed in the repo: every row of
`docs/product/LICENSES.md`'s dependency table read `unknown` — the inventory
was written by a run that never reached the registry and was never checked
against one.

## The fix

`licenceOf` answers `{ answered, value }`; a lookup that did not answer (the
spawn failed, or the answer was empty) is a **failure** with a named reason, and
the row reads `unreadable`. The answering path is untouched: a forbidden
licence still fails, an allowed one still clears.

## Red first

`scripts/ci/__tests__/check-licenses.test.mjs`, run against the script as it
was (the pre-fix file in a probe tree):

```
✖ a registry that does not answer fails the gate (BUG-103) (106.9467ms)
﹣ a registry that answers a licence clears the gate # Windows cannot shim pnpm
﹣ a forbidden licence still fails the gate            # for execFileSync without a shell
ℹ tests 3   ℹ pass 0   ℹ fail 1   ℹ skipped 2
```

and against the fixed script:

```
✔ a registry that does not answer fails the gate (BUG-103) (105.9606ms)
ℹ tests 3   ℹ pass 1   ℹ fail 0   ℹ skipped 2
```

The two answering tests run the gate against a `pnpm` shim on the PATH, which
needs an executable file (Linux, where CI runs); on Windows
`execFileSync` without a shell cannot run a `.cmd`, so they are skipped there
with the reason recorded in the test.

## The real licences, read before the row was closed

All 31 mobile dependencies answer **MIT** — read through the repo's own
`pnpm view ... license --json`, so the honest gate clears in CI:

```
ok  react-native  MIT        ok  better-auth  MIT
ok  react  MIT               ok  @better-auth/expo  MIT
ok  expo  MIT                ok  @better-auth/passkey  MIT
ok  react-native-unistyles  MIT
... (31 of 31 on the allow-list, none forbidden)
```

`docs/product/LICENSES.md`'s table now carries those answers instead of 31
`unknown` rows; the Adopted-code and voice-service sections are unchanged (31
insertions, 31 deletions in the whole file).

## Gates

- `node --test scripts/*/__tests__/*.test.mjs` — 139 tests, 137 pass, 0 fail,
  2 skipped (the two Windows-skipped answering cases above).
- `check-conflict-markers.mjs` (1219 files), `check-mojibake.mjs` (885 files),
  `check-control-chars.mjs` (1219 files), `check-workflows.mjs` (13
  workflows) and `check-floor.mjs origin/main` — clean.
