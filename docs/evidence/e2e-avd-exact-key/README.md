# Evidence — only an exact AVD cache key restores (BUG-216, audit item 3e)

**Step:** the 2026-11-05 audit's item 3e · **Branch:** `e2e-avd-exact-key` ·
**Date:** 2026-11-05

## What was broken

`android-e2e.yml`'s "Cache the AVD snapshot" step carried:

```yaml
key: avd-${{ runner.os }}-${{ matrix.api }}-google-apis-x86_64-${{ steps.pins.outputs.hash }}
restore-keys: |
  avd-${{ runner.os }}-${{ matrix.api }}-google-apis-x86_64-
```

`actions/cache` restores the newest cache matching a `restore-keys` **prefix**
when the exact key misses. The prefix stops short of the pins fingerprint, so a
fingerprint miss handed the job an AVD built under a different Maestro version,
emulator build, system-image revision or emulator-option set.

That is BUG-068's failure again: a snapshot from a rotated runner image with a
320x640 device profile, every flow failing its asserts while `am start` answered
`COLD/ok`, so red gates were blamed on the app when the harness was what
changed. This time it sat one line below the comment explaining how BUG-068 was
fixed.

## What landed

The two `restore-keys` lines are gone; the exact key stays. A comment records
why, so the next reader does not add the prefix back for speed.

`scripts/ci/check-e2e-avd-restore-keys.mjs` (a step in the `Floor guard` job)
holds the line over every emulator workflow that carries an AVD cache, which
includes `android-e2e-health.yml` — the audit asked for the confirmation that it
has none, and the gate asserts it rather than a human remembering to look.

A workflow that boots no emulator (or is not in the tree) is not the gate's
business, and the gate names the files it actually read so it cannot go vacuous
in silence.

## The same class elsewhere, deliberately left alone

`screen-recordings.yml` carries four `restore-keys` prefixes (a Playwright
browser cache and an AVD cache). The audit's item 3e names
`android-e2e.yml` only, and BUG-097's own test is titled "the recordings cache
is content-hashed with a restore-keys", so that prefix is a recorded decision
with a reason behind it, not an oversight this PR should silently overturn.
**It is logged in `docs/log/CURRENT-backend.md` as the next crew item, not as
something this PR fixed.**

## Red first (PLAYBOOK §14)

```
$ python - <<'PY'          # re-attach the two lines the audit removed
... workflow.replace('key: avd-...-hash }}', 'key: avd-...-hash }}\n          restore-keys: |\n            avd-...-')
PY
$ node scripts/ci/check-e2e-avd-restore-keys.mjs
the AVD restore rule is broken (1):
- android-e2e.yml: 1 restore-keys prefix(es) restore an AVD whose pins do not
  match this job. Only an exact key restores (audit item 3e; BUG-068 is the
  failure this re-arms)
(exit 1)
$ (the workflow restored: the two lines are gone again)
```

## Green

```
$ node scripts/ci/check-e2e-avd-restore-keys.mjs
check-e2e-avd-restore-keys: the AVD cache keys carry the pins fingerprint and
only an EXACT key restores (android-e2e.yml and android-e2e-health.yml clean)

$ node --test scripts/ci/__tests__/check-e2e-avd-restore-keys.test.mjs
5 tests, 5 pass

$ node scripts/ci/check-workflows.mjs          # both changed files included
check-workflows: 14 workflows …
```

## Not claimed

The cache's behaviour is not exercised here (that needs a real run): the gate
reads the workflow's contract, which is the same contract BUG-068's fix asserts
for the key. The health workflow's absence of a restore-keys is read from main's
own file, not from a run.
