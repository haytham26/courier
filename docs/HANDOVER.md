# HANDOVER — how to run, deploy, add keys and update the maps

Written 2026-11-08 by the lead executor (BUG-034, the handover documentation of
MASTER_EXECUTION §4 P6/P7). This file is the founder's door into the
repository: everything here is a command or a pointer to a document that
exists. The one screen of where the company stands is `docs/STATUS.md`; the
binding plan is `docs/plan/MASTER_EXECUTION.md`; the repo map is `AGENTS.md`.

Nothing in this file contains a secret. Secret **names** and where they live
are listed in `docs/status/FOUNDER_TODO.md`.

## 1. Install the app on a phone

The release APK of every merge to `main` is republished at one stable link:

**https://github.com/haytham26/courier/releases/download/latest/courier.apk**

(an unsigned build is `courier-unsigned.apk` on the same page). On the phone:
Settings → allow installs from this source (the browser that opened the link),
open the link, install. Until the keystore secrets exist the APK is unsigned —
it installs on a phone the founder controls, which is what the acceptance run
needs.

If the link 404s, the APK job skipped: the repository variable
`EXPO_PUBLIC_AUTH_URL` is not set, so no build can name the auth server the
app dials. Set it (Settings → Secrets and variables → Actions → Variables) to
the auth service URL, then re-run the Main APK workflow.

The 30-minute acceptance run on that phone is `docs/operations/ACCEPTANCE_TEST.md`
(sign in, load the run, scan, voice, drive, deliver, the offline stretch,
sync, end of day, lock screen). Record the result in `docs/status/FOUNDER_TODO.md`'s
A6 row — that is the audit's A6 done-when.

## 2. Run the repository locally

Prerequisites: Node 24, `corepack` (for pnpm), `uv` (for the Python
services), Docker (for the databases and the CI compose stack). No local
Android emulator — the emulator runs on GitHub Actions only (AGENTS.md safety
rules).

```bash
corepack pnpm install
# secrets: copy infra/env.example to .env.local and fill the names listed in
# docs/status/FOUNDER_TODO.md (values never enter git; scripts/secrets/README.md
# has the push-to-GitHub-Secrets helper)
corepack pnpm dev          # the app (Expo) + the web, via turbo
# the services the app dials, in docker:
docker compose -f infra/compose.ci.yml up -d    # Postgres/Valkey/Redis + the API + auth + voice (the CI stack)
```

The fast local check (what CI runs first):

```bash
corepack pnpm check:fast   # typecheck + lint + the floor guard
corepack pnpm test         # every suite: mobile jest, api pytest, voice pytest, the scripts' node tests
corepack pnpm check:full   # + coverage + the licence inventory
```

The individual gates and what each enforces are listed in
`scripts/ci/README.md`; run any of them directly, e.g.
`node scripts/ci/check-parity.mjs --base origin/main`,
`node scripts/ci/check-visual-baselines.mjs`,
`node scripts/ci/check-store-readiness.mjs --apk <apk>`.

The app's E2E on the CI emulator is driven by Maestro flows in `.maestro/`
(`run-all.sh` runs every top-level flow; `run-a1.sh` is the no-mock A1 leg
against the real API; `recordings/*.yaml` are the screen recordings). They run
in the Android E2E workflow on every PR to main — never locally.

## 3. Deploy

- **Staging/CI stack:** `infra/compose.ci.yml` (what the A1 job runs),
  `infra/compose.staging.yml` (the staging deploy, D48-era ADR-020).
- **Production:** `infra/compose.prod.yml` + `infra/deploy.sh` +
  `infra/Caddyfile` (TLS), `infra/backup.sh` / `restore.sh` /
  `test-restore.sh` (the restore drill), `infra/monitoring/`.
- The order and the failure table: `docs/operations/RUNBOOK.md`.
- The OCI host and its SSH key are the founder's (`OCI_HOST`,
  `OCI_SSH_PRIVATE_KEY_PATH` in `docs/status/FOUNDER_TODO.md`) — until they
  exist, the deploy lane is built and tested against local compose only.

## 4. Keys and secrets

- Local: `.env.local` (git-ignored; names in `infra/env.example` and
  `docs/status/FOUNDER_TODO.md`).
- CI/release: GitHub Secrets and repository variables, pushed with
  `scripts/secrets/push-secrets.sh` (see `scripts/secrets/README.md`). The
  release signing key (`ANDROID_KEYSTORE_*`) lives in the protected `release`
  environment; the workflow builds the unsigned APK and says so when the
  secrets are missing — a missing secret never fails the pipeline.
- The keystore's encrypted offline backup: the location is recorded in
  `docs/status/FOUNDER_TODO.md`, never the secret itself.
- `scripts/ci/check-store-readiness.mjs` and the `no secrets in git` gate fail
  the build if a value ever lands in the repository, a log or an artefact.

## 5. Update the maps and the address data

The offline Canterbury map pack and the address index are data, not code —
built by the scripts in `scripts/data/README.md` and refreshed weekly by the
`linz-changeset` workflow:

```bash
# the week's LINZ changes -> the address index -> the accuracy measure
uv run --with httpx python scripts/data/fetch-linz-changeset.py --from <last-week>
uv run python scripts/data/build-linz-index.py --area christchurch   # (+ waimakariri, selwyn)

# the offline map pack (terms-checked) and its 3D buildings
node scripts/data/build-pmtiles.mjs --source geofabrik-nz --execute
node scripts/data/build-3d-buildings.mjs --source linz-nz-building-outlines --execute
```

The source data itself (`data/linz/`, `data/labels/`) is never committed.

## 6. Prove it: acceptance and the gates

- CI emulator acceptance: the Android E2E workflow legs (Maestro flows on
  api 34 + api 35) and the A1 no-mock leg (online → offline → sync against
  real Postgres, rows asserted) run on every PR to main; evidence artifacts
  `android-e2e-evidence-api*` and `a1-evidence`.
- Screen recordings + visual baselines: the screen-recordings workflow
  captures light/dark PNGs; `scripts/ci/check-visual-baselines.mjs` compares
  them against the committed baselines in `docs/evidence/design/baselines/`
  (see `docs/evidence/design/README.md`).
- Real phone: `docs/operations/ACCEPTANCE_TEST.md` (section 1 above).

## 7. Release v1.0.0

1. Raise the version in `apps/mobile/app.json` and
   `docs/operations/STORE-LISTING.md` (RELEASE-CHECKLIST.md §order).
2. `node scripts/ci/check-store-readiness.mjs --apk <apk>` — no blockers.
3. Tag `v1.0.0`: the Release APK workflow signs (when the keystore secrets
   exist) and publishes the GitHub Release with the APK + SBOM + provenance.
4. Play Console submission is a founder gate (RUNBOOK.md §4).

## 8. What only the founder can do

`docs/status/FOUNDER_TODO.md` is the list: the Play account, the store assets
and the disclosure video, the legal review of the privacy policy, the OCI
host and key, the keystore and Play service-account secrets, the production
deploy, the real-device acceptance pass (A6), the v1.0.0 release approval.
Everything else is autopilot: run the plan in `docs/plan/MASTER_EXECUTION.md`
until the §6 Definition of Done, and write the final report to
`docs/status/FINAL_REPORT.md`.
