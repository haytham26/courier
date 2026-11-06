# Evidence — the emulator's system image is pinned by revision (BUG-217, audit item 3f)

**Step:** the 2026-11-05 audit's item 3f · **Branch:** `e2e-sysimg-pinned` ·
**Date:** 2026-11-05

## What was broken

`android-e2e.yml` runs the emulator through
`reactivecircus/android-emulator-runner`, which installs
`system-images;android-<api>;google_apis;x86_64` **from the stable channel by
api-level**. So the emulator's bytes change whenever Google publishes a new
revision, with no commit and no cache key that notices — the same class as the
Maestro and emulator pins (BUG-065: the same APK green on api-35 one hour and
red on four PRs the next, with the app, the flows and the workflow
byte-identical).

The pins fingerprint's own comment claimed it covered "the system image's
revision" while the fingerprint string carried no revision at all:

```
fingerprint="$MAESTRO_VERSION/$MAESTRO_SHA256/$EMULATOR_BUILD/android-${{ matrix.api }}/google_apis/x86_64/$opts"
```

A comment promising a check the code does not run is how a reader comes to
trust a pin they have not seen.

## Where the pins came from

Not from memory: from the last green run's own evidence. The workflow records
`system_image_revision` in `.maestro/evidence/e2e-pins.txt`, and the artifacts
are downloadable, so the pins are read from run **42019215529** on `b81ad239`:

```
api 34:  system_image_revision=14
api 35:  system_image_revision=9
```

## What landed

```yaml
env:
  SYSIMG_REV_34: '14'      # run 42019215529 on b81ad239, its own evidence
  SYSIMG_REV_35: '9'
```

and, in the e2e job, in order:

1. **The pins' fingerprint** reads the pin through an indirect variable
   (`rev_var="SYSIMG_REV_${{ matrix.api }}"`, `${!rev_var}` in the fingerprint)
   and outputs `revision=` — a matrix step cannot name a per-api env key in an
   expression, so the revision travels as an output the caches and the
   assertions read.
2. **Cache the pinned system image**, keyed
   `sysimg-<os>-<api>-google_apis-x86_64-rev<revision>` — the pinned image is
   restored by revision, so a revision change is a cache miss.
3. **Install the pinned system image, and assert its revision**: `until yes |
   sdkmanager …`, bounded at three attempts, wiping the image directory between
   them (a failed install can leave a half-unpacked image, and installing on
   top of one is how a run ends up asserting a revision from a directory that
   is not the image), then `Pkg.Revision` from `source.properties` compared
   with the pin — a mismatch exits the job.
4. **Record the pins this run actually used** now **fails** when the
   emulator-runner action moved the image under the pin: the pre-step pins it,
   and this step proves the action did not override it.

`scripts/ci/check-e2e-sysimg-pin.mjs` (a step in the `Floor guard` job) holds
every half, with a 6-case test.

## Red first (PLAYBOOK §14)

```
$ git stash push -- .github/workflows/android-e2e.yml   # the tree as it was
$ node scripts/ci/check-e2e-sysimg-pin.mjs
the system-image pin is broken (6):
- the workflow has no SYSIMG_REV_<api> pin: the emulator image is installed from
  the stable channel by api-level, so its bytes change without a commit
  (BUG-065's class)
- the matrix's api 34 has no SYSIMG_REV_34 pin: that leg's image floats
- the matrix's api 35 has no SYSIMG_REV_35 pin: that leg's image floats
- the pins fingerprint does not read SYSIMG_REV_<api> through a variable, so a
  pin change is not a key change (… the documentation lie the audit named)
- the pins fingerprint does not interpolate the pin's value
- the e2e job has no "Install the pinned system image" step with its revision
  assertion
(exit 1)
```

## Green

```
$ node scripts/ci/check-e2e-sysimg-pin.mjs
check-e2e-sysimg-pin: the system image is pinned (SYSIMG_REV_ for SYSIMG_REV_34,
SYSIMG_REV_35), the fingerprint reads the pin, the install asserts Pkg.Revision
after three attempts, the cache is keyed by the revision, and the record step
fails if the action moved it

$ bash -n (each of the three changed run blocks)     exit 0, all three
$ python -c "import yaml; yaml.safe_load(open('.github/workflows/android-e2e.yml'))"   # parses
$ node --test scripts/ci/__tests__/check-e2e-sysimg-pin.test.mjs    6 tests, 6 pass
```

## Not claimed, and said out loud

- **A run whose image has moved on will FAIL until the pin is bumped.** That is
  the intended behaviour (a revision that changes without a commit is the bug),
  and it is the cost of the pin: when Google publishes a new revision, the e2e
  legs go red with a message naming both numbers, and the fix is a one-line PR.
  The alternative — recording the new revision and continuing — is the state
  this item fixed.
- **The `a1` job still boots api-34 without this machinery.** The audit's item
  3f names the pins fingerprint, which the legs carry; extending the pin to a1
  is recorded in the log as the next crew item rather than smuggled into this
  one.
