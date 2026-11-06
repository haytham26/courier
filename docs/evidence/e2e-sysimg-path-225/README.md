# Evidence — the 3f install step resolves `sdkmanager` from the SDK's cmdline-tools (BUG-225)

**Step:** the 2026-11-05 audit's item 3f follow-up, on branch `e2e-sysimg-pinned` (PR #204) · **Date:** 2026-11-06

## What was red

PRs #204–#211 failed both emulator legs with, in run 42058337877 (jobs 127363544216 / 127363543972):

```
sdkmanager: command not found
::error::system-images;android-35;google_apis;x86_64 is at Pkg.Revision=unknown, and the pin SYSIMG_REV_35=9
```

Root cause: the "Install the pinned system image" step in `.github/workflows/android-e2e.yml` called a
bare `sdkmanager`. The GitHub runner image ships the cmdline-tools under
`$ANDROID_HOME/cmdline-tools/latest/bin` but does **not** put that directory on PATH, so the call was
`command not found` in CI while working in a dev shell (where the SDK's bin is exported). The revision
assertion then read `source.properties` from a directory that was never installed and correctly failed
the run — the assert did its job; the install never happened.

## The fix

In the install step's run block, before the `until yes | sdkmanager …` loop:

```bash
tools_bin="$(ls -d "$sdk"/cmdline-tools/*/bin 2>/dev/null | sort -V | tail -n 1 || true)"
if [ -z "$tools_bin" ] || [ ! -x "$tools_bin/sdkmanager" ]; then
  echo "::error::no sdkmanager under $sdk/cmdline-tools/*/bin (resolved: ${tools_bin:-nothing}) - …"
  exit 1
fi
echo "$tools_bin" >> "$GITHUB_PATH"
export PATH="$tools_bin:$PATH"
```

`sort -V | tail -n 1` picks `latest` when it is present (it mirrors the newest installed), else the
highest numbered `cmdline-tools/<ver>/bin` — the newest either way. The existence check fails loudly
and **names the path** when the SDK carries no sdkmanager at all, instead of a bare `command not found`.

## The gate (can't regress)

`scripts/ci/check-e2e-sysimg-pin.mjs` now also fails when the install step:

- does not resolve `$sdk/cmdline-tools/*/bin`,
- does not export the resolved bin onto PATH (`$GITHUB_PATH` + `export PATH=`),
- has no failing existence check (`! -x "$tools_bin/sdkmanager"` + `::error::`) that names the path.

Two new test cases in `scripts/ci/__tests__/check-e2e-sysimg-pin.test.mjs` (8 total).

## Red first (PLAYBOOK §14)

The extended gate run against the pre-fix workflow (602364d's copy, in a temp tree):

```
exit 1 — the system-image pin is broken (3):
- the install pre-step does not resolve $sdk/cmdline-tools/*/bin (BUG-225: …)
- the install pre-step does not put the resolved cmdline-tools bin onto PATH …
- the install pre-step has no failing existence check that names the path …
```

## Green

```
$ node scripts/ci/check-e2e-sysimg-pin.mjs
check-e2e-sysimg-pin: the system image is pinned (SYSIMG_REV_ for SYSIMG_REV_34, SYSIMG_REV_35), …
$ node --test scripts/ci/__tests__/check-e2e-sysimg-pin.test.mjs   # 8 pass
$ node scripts/ci/check-workflows.mjs                               # 14 workflows parse
$ node scripts/ci/check-parity.mjs --base origin/main               # 0 reopened
```

## Not claimed

That the emulator legs are green: that is CI's evidence on the next run of PR #204 (the fix is pushed;
the api-34/api-35 jobs re-run on the new head). The local proof here is the gate, the tests and the
parse — the runner PATH behavior itself can only be proven by the runner.
