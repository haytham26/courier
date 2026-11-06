# BUG-228 evidence — dependabot entries must carry a cooldown

## The red (Semgrep, Blocking)
- PR #211 (`dependabot-cron-223`) head `80edbac`: runs 42197669307 and 42197664922, jobs 127824878787 / 127824864516, "Static analysis (Semgrep)" — `package_managers.dependabot.dependabot-missing-cooldown` on `.github/dependabot.yml` (4 findings, one per `updates` entry).

## Red first (the extended gate against the pre-fix config)
`scripts/ci/check-staging-smoke.mjs` was extended to require `cooldown:` + `days: [1-9]` on every entry. Run against `eb75e35`'s copy of `.github/dependabot.yml` in a temp tree: exit 1, four findings:

```
- a dependabot entry has no cooldown (BUG-228: - package-ecosystem: github-actions ...)
- a dependabot entry has no cooldown (BUG-228: - package-ecosystem: npm ...)
- a dependabot entry has no cooldown (BUG-228: - package-ecosystem: uv ...)
- a dependabot entry has no cooldown (BUG-228: - package-ecosystem: uv ...)
```

## Green after
- `cooldown: days: 7` on all four entries (`.github/dependabot.yml`, with a header comment).
- Gate passes on the real tree; `node --test scripts/ci/__tests__/check-staging-smoke.test.mjs` 15/15 (new case: an entry without a cooldown fails, naming BUG-228).
- Semgrep itself is the CI authority (pinned semgrep==1.182.1); the red clears on the next run of PR #211's pushed head — that CI run is the Semgrep evidence, not claimed here.
