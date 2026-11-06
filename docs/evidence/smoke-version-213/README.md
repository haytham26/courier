# Evidence — the deployed version reaches the smoke test (BUG-213, audit item 3b)

**Step:** the 2026-11-05 audit's item 3b · **Branch:** `smoke-version-213` ·
**Date:** 2026-11-05

## What was broken

Three things, all on the same path:

1. `deploy.yml`'s deploy step declared `APP_VERSION: ${{ github.sha }}` in its own
   environment, but the remote invocation was
   `ssh … "cd /opt/courier/infra && bash smoke.sh --domain … --token …"` — the
   version never crossed the ssh boundary.
2. `infra/smoke.sh`'s version check was conditioned on `[ -n "${APP_VERSION:-}" ]`
   with an `else` that logged *"APP_VERSION is not set: skipping the version
   check"* and went on. A missing version was a warning, not a failure.
3. `curl … | tee "$VERSION_FILE" > /dev/null || true` — the fetch could fail
   and leave an empty file, after which the check reported
   `"$APP_VERSION not in <nothing>"`, naming the wrong cause.

So the deploy's smoke test reported green while proving only that *something*
answered: a deployment serving the previous image — the exact failure the check
exists to catch — passed.

## What landed

- The deploy forwards the version into the remote command
  (`APP_VERSION='$APP_VERSION' bash smoke.sh …`). The sha is not a secret, so it
  is spelled in the command on purpose; the domain and the token are the audit's
  next item (3c).
- `infra/smoke.sh` **dies** without the version:
  `die "APP_VERSION is required: the smoke test proves the version that was just
  deployed (or pass --no-version for a local run that deliberately skips it)"`.
  `--no-version` is the only skip, and the report says which shape it ran in.
- The version fetch is wrapped in a failing `if`: a document that cannot be
  fetched is a failed check (`the edge did not answer /openapi.json: the
  deployed version cannot be proved`), not a skipped one.
- `scripts/ci/check-smoke-version.mjs` (a step in the `Floor guard` job of
  `quality-gates.yml`) holds all three halves: the forward, the die, and the
  absence of the quiet fetch. Its test (5 cases) runs with
  `node --test scripts/*/__tests__/*.test.mjs`.

## Red first (PLAYBOOK §14)

```
$ git stash push -- infra/smoke.sh .github/workflows/deploy.yml   # the tree as it was
$ node scripts/ci/check-smoke-version.mjs
the smoke version check is broken (5):
- the deploy does not forward APP_VERSION to the remote smoke.sh: the version
  check cannot run, and smoke.sh now dies instead of skipping it
- smoke.sh has no --no-version flag: there is no documented way to run it locally
- smoke.sh does not die without APP_VERSION: a missing version means the smoke
  test reports green about a deployment it never identified
- smoke.sh still logs a silent skip of the version check: that is the exact
  wording the audit removed
- smoke.sh fetches the openapi document with `|| true`: a failed fetch leaves an
  empty file and the failure message then names the wrong cause
(exit 1)
```

## Green

```
$ node scripts/ci/check-smoke-version.mjs
check-smoke-version: the deploy forwards APP_VERSION to the remote smoke.sh, and
smoke.sh refuses to run without it (--no-version is the only skip)

$ bash -n infra/smoke.sh                # parses
$ node --test scripts/ci/__tests__/check-smoke-version.test.mjs
5 tests, 5 pass

$ node scripts/ci/check-workflows.mjs   # 14 workflows, the changed one included
check-workflows: 14 workflows read their inputs through the github context and
carry only keys GitHub accepts
```

## Not claimed

The live deploy: the leg needs the OCI host and key (`FOUNDER_TODO.md`), so the
forwarded invocation is proven by the gate and by the CI verify leg (which has
always passed `APP_VERSION` and now fails loudly if it stops doing so), not by a
run against the real host.
