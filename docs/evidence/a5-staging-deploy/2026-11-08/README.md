# A5 evidence, 2026-11-08 — the APK pinned to staging + the smoke recorded (BUG-272)

## 1. The smoke is recorded
`smoke-verify-run-42392688987.log` holds the verify leg's smoke output verbatim: run
[42392688987](https://github.com/haytham26/courier/actions/runs/42392688987) (push to
`ff04a164`, 2026-11-07T16:43Z), job `Build and smoke-test the staging stack (the local VM)`
success — **the smoke test passed 4/4** (edge TLS, deployed version = the pushed sha,
seed needs a token 401, health not public 404; the token round trip is skipped by design
on the token-less verify leg). The deploy-to-host leg and the nightly cron smoke skip with
a notice until the founder sets the staging secrets (FOUNDER_TODO).

## 2. The APK is pinned to staging (`.github/workflows/main-apk.yml`)
- New first step `The URLs this APK dials (pinned to staging, A5)`: when the repository
  variable **COURIER_STAGING_DOMAIN** is set, the build carries
  `EXPO_PUBLIC_AUTH_URL=https://<domain>/api/auth` and `EXPO_PUBLIC_API_URL=https://<domain>`
  (the edge's own layout, `infra/Caddyfile.staging`: `/api/auth/*` -> auth, the rest -> API),
  so the stable `latest` APK dials staging for sign-in AND run data. Fallback: the
  EXPO_PUBLIC_AUTH_URL / EXPO_PUBLIC_API_URL variables (API URL defaults to the auth URL's
  host — one edge, one domain). Neither set -> the job skips with a notice, as before.
- The build step now passes BOTH URLs (before, only EXPO_PUBLIC_AUTH_URL was set, so the
  APK's API base fell back to `http://localhost:8000` — on a phone, the phone itself).
- **The red fix:** run 42385639298 failed with setup-node's `cache: pnpm` cache-save
  erroring on the missing pnpm store when no `pnpm install` ran (i.e. whenever the URL
  variable was unset) — a merge to main went RED over a founder variable nobody had set,
  the opposite of this job's skip-notice design. The Node cache is now conditional:
  `cache: ${{ steps.urls.outputs.configured == 'yes' ? 'pnpm' : '' }}`.
- **Red/green proof of the new step:** `replay-urls-step.log` — the `run: |` block of the
  `The URLs this APK dials` step extracted verbatim from `main-apk.yml` and executed locally
  (git-bash sh) in all four env branches, each rc=0: staging var set -> pinned=staging with
  auth=https://<domain>/api/auth + api=https://<domain>; only auth var -> api host derived
  from the auth URL; auth+api vars -> both passed through; neither -> configured=no.

## What stays with the founder
- Set the repository VARIABLE `COURIER_STAGING_DOMAIN` (non-secret) -> the next merge's
  stable APK is pinned to staging. FOUNDER_TODO row added.
- The OCI host/key and the staging secrets (`COURIER_STAGING_HOST/USER/KEY`,
  `COURIER_STAGING_DOMAIN` as a secret for the deploy/smoke legs, `COURIER_SMOKE_TOKEN`) —
  FOUNDER_TODO, unchanged; the deploy leg skip-notices name them. LAST in the queue is the
  Oracle staging + production OmniRoute.
