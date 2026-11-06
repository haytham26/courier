# Evidence — the install loop's `yes | sdkmanager` under pipefail wiped every good install (BUG-227)

**Step:** the 2026-11-05 audit's item 3f follow-up, on branch `e2e-sysimg-pinned` (PR #204) · **Date:** 2026-11-06

## What was red on the BUG-225-fixed head

Run 42118045102 (head `b49aa64`), job 127569629183 (api-35 leg): the PATH fix worked —
`##[notice]sdkmanager resolved from /usr/local/lib/android/sdk/cmdline-tools/latest/bin` — but all three
install attempts "failed":

```
yes: standard output: Broken pipe
##[warning]attempt 1 for system-images;android-35;google_apis;x86_64 failed: wiping the image directory and retrying
…
##[error]the system image … did not install in 3 attempts
<tail of sdkmanager.log: unzip progress ending at 100% of the LAST file>
```

## Root cause (PLAYBOOK §12)

The step ran `set -euo pipefail` and then `until yes | sdkmanager "$image" …; do … done`. When sdkmanager
finished a **complete** install and exited 0, `yes` was still writing to the pipe and died of SIGPIPE
(exit 141); under `pipefail` the pipeline's status is 141, so the `until` loop treated the successful
install as a failure, ran `rm -rf "$dir"` — deleting the image that had just installed cleanly — and
retried. The dumped log tail ends at `100% Unzipping... x86_64/data/misc/pixels` (the zip's last file),
i.e. the unzip had completed every time. The failure was the pipe, not the install. Latent since 3f:
until BUG-225's PATH fix, the step died earlier at `command not found` (exit 127), which is also
"failure", so the loop never got far enough to expose this.

The emulator-runner action (pinned `a421e438…`, `src/sdk-installer.ts`) does it safely: it accepts the
licenses once with `yes | sdkmanager --licenses`, then installs with
`sdkmanager --install '…' --channel=0 > /dev/null` and **no** `yes` in the pipeline. On the green main run
(42019215529) the action's install took ~28 s and the AVD then found the image at the expected path.

## The fix

In `.github/workflows/android-e2e.yml`'s install step:

```bash
yes | sdkmanager --licenses >"$RUNNER_TEMP/sdkmanager-licenses.log" 2>&1 || true   # `|| true`: same SIGPIPE
until sdkmanager --install "$image" >"$RUNNER_TEMP/sdkmanager.log" 2>&1 </dev/null; do
  … wipe, retry, budget of 3 …
done
```

The final-failure dump now also greps the sdkmanager log for error lines
(`exception|error|no space|failed|cannot|denied`) before the raw tail, so the next failure names itself.

`scripts/ci/check-e2e-sysimg-pin.mjs` now fails when the install loop pipes `yes` into sdkmanager, and
when the `--licenses` acceptance is missing — 2 new test cases (10 total).

## Red first (PLAYBOOK §14)

The extended gate against `b49aa64`'s workflow (in a temp tree):

```
exit 1 — the system-image pin is broken (2):
- the install pre-step does not run `sdkmanager --install` … WITHOUT piping `yes` into it (BUG-227: …)
- the install pre-step does not accept the SDK licenses once first (`yes | sdkmanager --licenses … || true`) …
```

## Green

```
$ node scripts/ci/check-e2e-sysimg-pin.mjs    # passes on the fixed workflow
$ node --test scripts/ci/__tests__/check-e2e-sysimg-pin.test.mjs   # 10 pass
$ node scripts/ci/check-workflows.mjs          # 14 workflows parse
```

## Not claimed

That the emulator legs are green: that is the next CI run's evidence on the new head of PR #204
(`yes`-free install loop). The mechanism here is proven from the run's own log (100% unzip + SIGPIPE +
pipefail) and from the action's own installer source, not from a green emulator run.
