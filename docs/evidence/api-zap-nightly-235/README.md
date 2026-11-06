# BUG-235 evidence - the nightly ZAP DAST workflow (audit item 4g, research row 65 / A6)

## The gap
The SAAS_CHECKLIST bar names "DAST against staging with OWASP ZAP"; research A6 (zaproxy/zaproxy, Apache-2.0, 15 979 stars, pushed 2026-10-15) decided ADOPT as a nightly, non-blocking scan against a staging API with a throwaway database - but `.github/workflows/` had no ZAP workflow. All CI security gates were static.

## The change
`.github/workflows/zap-nightly.yml`:
- cron `35 18 * * *` (07:35 NZDT, after the 07:05 staging smoke) + `workflow_dispatch`; concurrency group `zap-nightly`, `cancel-in-progress: false`; `permissions: contents: read`.
- Step `The staging secret` reads `COURIER_STAGING_DOMAIN` in its OWN env (BUG-100: never job-level) and writes `configured=true/false`; when unset it emits `::notice::` naming the missing secret (FOUNDER_TODO - the same secret the deploy and smoke legs wait for) and the run skips - the staging-smoke pattern.
- The scan step: `zaproxy/action-baseline@de8ad967d3548d44ef623df22cf95c3b0baf8b25 # v0.15.0` (full commit sha resolved from the v0.15.0 tag on 2026-11-07; BUG-222's gate requires it) against `https://$COURIER_STAGING_DOMAIN` passed through the step env, `fail_action: false` - NON-BLOCKING per research decision 8; the report is uploaded as the `zap-nightly-report` artifact (14 days) with `if: always()`.
- Runs only against staging: a ZAP scan against a database-backed API tries injections (A6's risk note), so the target is staging whose database is throwaway.

## Gates
- `node scripts/ci/check-workflows.mjs`: 16 workflows clean (keys + github-context inputs).
- `node scripts/ci/check-action-pins.mjs`: 121 `uses:` refs all pinned (the new one included).
- control-chars/mojibake/doc-links clean; `node --test "scripts/*/__tests__/*.test.mjs"` pass; parity 0 reopened vs origin/main.
- zaproxy/zaproxy is Apache-2.0 and runs via the pinned action - no runtime dependency, so no uv.lock / LICENSES.md change.
