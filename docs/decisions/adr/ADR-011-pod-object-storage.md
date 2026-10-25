# ADR-011 — The proof-of-delivery storage: one interface, S3-compatible object storage with signed URLs, and the retention

- **Status:** accepted
- **Date:** 2026-10-25
- **Decides:** D38 (queue 2, item 3: POD object storage behind one interface; the signed-URL endpoint; the retention)
- **Builds on:** ADR-010 §2/§5 (the POD upload), `docs/operations/DATA-SAFETY.md` (the photos are the courier's data: collected, never shared, deletable)
- **Licences:** `boto3`/`botocore` **Apache-2.0** (the S3 client); `moto` **Apache-2.0** (the test emulator). **MinIO is NOT used** (AGPL-3.0 — the founder's rule).

## Context

ADR-010 shipped the POD upload with a local-directory store (`POD_STORAGE_DIR`), recorded as a
limitation: a single-server filesystem does not survive a second API instance and cannot serve the
phone a photo without proxying bytes through the API process. The queue's item 3 asks for
S3-compatible object storage with signed URLs, a size/type check, and retention per the privacy
rules.

## Decision

### 1. One interface, two implementations

`services/api/app/pod_store.py` defines the `PodStore` protocol — `save`, `open_bytes`,
`presign_url`, `delete_run` — and two implementations:

- **`LocalPodStore`** — the current behaviour (a directory, server-side names, atomic writes), the
  default. `presign_url` returns a URL to a **streaming endpoint** (`GET
  /runs/{run_id}/pod/{event_id}/bytes?token=...`) whose token is an HMAC (the server's secret from
  `AUTH_JWT_ISSUER`-derived material) over (run, event, expiry) — a short-lived, self-verifying
  grant. No client-trusted state.
- **`S3PodStore`** — boto3's S3 client against any S3-compatible endpoint (AWS S3, Cloudflare R2,
  Wasabi, a self-hosted gateway). `presign_url` returns the S3 **presigned GET** (expiry 900 s
  default, `POD_URL_TTL_SECONDS`). Keys are `{run_id}/{event_id}.bin` — the same server-side
  naming as the local store.

`POD_STORAGE_BACKEND` selects (`local` default | `s3`); the S3 settings (`POD_S3_BUCKET`,
`POD_S3_ENDPOINT_URL`, `POD_S3_REGION`, `POD_S3_ACCESS_KEY_ID`, `POD_S3_SECRET_ACCESS_KEY`) are
env-only — **real keys are FOUNDER_TODO items**. The upload endpoint keeps every ADR-010 guarantee
(the cap read before storage, the magic-byte sniff, the server-side name, the replay semantics) —
the store change is behind the bytes.

### 2. The signed-URL endpoint (the contract change)

`GET /runs/{run_id}/stops/{stop_id}/pod/{event_id}/url` — the run's owner only, the stop must
belong to the run, the event must belong to the stop (the same 404 discipline). Returns
`{url, expires_at}`. The photo never streams through the API when the backend is S3: the phone
goes to the object store with a URL that dies.

### 3. The retention (per DATA-SAFETY)

- The POD bytes are **deleted when the run is deleted**: `delete_run(run_id)` on the store (the
  local store removes the run's directory; the S3 store lists and deletes the run's prefix). The
  run-deletion endpoint that calls it is a product slice (recorded in ADR-010 §Limitations as
  NOT STARTED) — the store carries the capability now.
- The account deletion (30 days, DATA-SAFETY) is an account-level sweep over the same store
  primitive (`delete_run` per run of the account) — the scheduler is the infra lane.
- No TTL on live run data: the photos stay while the run stays (the courier's evidence).

### 4. Tests and CI

`moto` (Apache-2.0) emulates S3 in the tests: the S3 store's save/presign/delete_run against a
mocked bucket, the expiry, the key naming. The presign endpoint's authz matrix (the foreign run
404, the foreign event 404, the owner 200). The local store's tests keep their ADR-010 guarantees.

## Consequences

- The phone fetches the photo with a dying URL — no API bytes-proxying, no long-lived credentials
  on the device.
- The second API instance works (the object store is shared state).
- MinIO stays banned; any S3-compatible emulator in tests is moto.

## Verification

- The moto-backed tests (`tests/test_pod_store.py`) + the presign endpoint's tests
  (`tests/test_runs_api.py`) — TDD.
- All gates; the ADR line for the lead in `CURRENT-backend.md`.
