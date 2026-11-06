# BUG-228 evidence — dependabot entries must carry cooldown.default-days >= 7

## The reds
1. Semgrep (Blocking) on PR #211's head `80edbac`: runs 42197669307 / 42197664922, jobs 127824878787 / 127824864516 — `package_managers.dependabot.dependabot-missing-cooldown`, 4 findings (one per `updates` entry, no `cooldown:` at all).
2. Dependabot's own config check on PR #212's head `defe324` (which carried the first fix): check-run 127840393944 — `The property '#/updates/N/cooldown' contains additional properties ["days"] outside of the schema when none are allowed` for all 4 entries. The first fix used `cooldown: days: 7`, which Semgrep's missing-cooldown branch accepts but the schema rejects.

## What the two validators actually require (verified 2026-11-06)
- Semgrep registry rule `package_managers/dependabot.dependabot-missing-cooldown` (semgrep/semgrep-rules, package_managers/dependabot/dependabot-missing-cooldown.yaml): branch 1 fires when an entry has no `cooldown:`; branch 2 fires when `default-days < 7`; branch 3 fires on a non-numeric default-days. Message: add `cooldown` with `default-days: 7`.
- GitHub's Dependabot options reference (configuration-options-for-dependency-updates, `cooldown` section): parameters are `default-days`, `semver-major-days`, `semver-minor-days`, `semver-patch-days`, `include`, `exclude`. There is no `days` key.
So the only shape that satisfies both is `cooldown: { default-days: 7 }`.

## Red first (the extended gate against both bad shapes)
`scripts/ci/check-staging-smoke.mjs` now requires `cooldown:` + `default-days: >= 7` per entry and fails on a bare `days:` key:
- against `eb75e35`'s dependabot.yml (no cooldown): exit 1, four `no cooldown.default-days (BUG-228: ...)` findings.
- against `e6a1187`'s dependabot.yml (bare `days: 7`): exit 1, same four findings.

## Green after
- `cooldown: default-days: 7` on all four entries in `.github/dependabot.yml` (+ header comment naming both validators).
- Gate passes on the real tree; `node --test scripts/ci/__tests__/check-staging-smoke.test.mjs` 17/17 (new cases: no cooldown; default-days < 7; bare `days:` key).
- Semgrep (sast job) and the Dependabot config check clearing are the next CI run's evidence on PR #212's pushed head — not claimed here.
