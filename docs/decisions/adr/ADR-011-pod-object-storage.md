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

`services/api/app/pod_store.py` defines the `PodStore` protocol — `save`, `fingerprint`,
`exists`, `presign_url`, `delete_run` — and two implementations:

- **`LocalPodStore`** — the current behaviour (a directory, server-side names, atomic writes), the
  default. `presign_url` returns a URL to a **streaming endpoint** (`GET
  /runs/{run_id}/pod/{event_id}/bytes?expires=...&signature=...`) whose grant is an HMAC over
  (run, event, expiry), keyed by the dedicated **`POD_URL_SIGNING_SECRET`** (≥32 characters,
  required at boot for the local backend). It is not derived from `AUTH_JWT_ISSUER`: that value is
  public in every access token, and the first cut made the grant forgeable by any authenticated
  caller (the review's blocker — a forged grant served another courier's bytes). No client-trusted
  state; the signature is compared in constant time as bytes, so a non-hex forgery is a 404.
- **`S3PodStore`** — boto3's S3 client against any S3-compatible endpoint (AWS S3, Cloudflare R2,
  Wasabi, a self-hosted gateway). `presign_url` returns the S3 **presigned GET** (expiry 900 s
  default, `POD_URL_TTL_SECONDS`, bounded 1–604800). Keys are `{run_id}/{event_id}.bin` — the same
  server-side naming as the local store. The sha256 of the bytes is written as object metadata at
  save time and read back by `fingerprint`, so the contract's `sha256` is true on both backends
  (the ETag is not a sha256); `exists` only treats a 404 as absent, so a 403/5xx can never turn a
  replay into an overwrite; `delete_run` paginates the listing and deletes in 1,000-key batches,
  raising on any per-key error (a long run's tail is not left behind).

`POD_STORAGE_BACKEND` selects (`local` default | `s3`); the S3 settings (`POD_S3_BUCKET`,
`POD_S3_ENDPOINT_URL`, `POD_S3_REGION`, `POD_S3_ACCESS_KEY_ID`, `POD_S3_SECRET_ACCESS_KEY`,
optional `POD_S3_SERVER_SIDE_ENCRYPTION`) are env-only — **real keys are FOUNDER_TODO items**.
`validate_pod_settings()` runs at boot: a missing signing key or bucket stops the process instead
of surfacing as a 500 on the first upload. The upload endpoint keeps every ADR-010 guarantee (the
cap read before storage, the magic-byte sniff, the server-side name, the replay semantics) — the
store change is behind the bytes.

### 2. The signed-URL endpoint (the contract change)

`GET /runs/{run_id}/stops/{stop_id}/pod/{event_id}/url` — the run's owner only, the stop must
belong to the run, the event must belong to the stop (the same 404 discipline). Returns
`{url, expires_at}`. The photo never streams through the API when the backend is S3: the phone
goes to the object store with a URL that dies.

### 3. The retention (per DATA-SAFETY)

- The POD bytes are **deleted when the run is deleted**: `delete_run(run_id)` on the store (the
  local store removes the run's directory; the S3 store paginates the run's prefix and deletes in
  1,000-key batches, raising on any per-key error). The run-deletion endpoint that calls it is a
  product slice (recorded in ADR-010 §Limitations as NOT STARTED) — the store carries the
  capability now.
- The account deletion (30 days, DATA-SAFETY) is an account-level sweep over the same store
  primitive (`delete_run` per run of the account) — the scheduler is the infra lane.
- No TTL on live run data: the photos stay while the run stays (the courier's evidence).

### 4. Tests and CI

`moto` (Apache-2.0) emulates S3 in the tests: the S3 store's save/fingerprint/presign/
delete_run against a mocked bucket (including a >1,000-object run), the expiry, the key naming.
The suite runs in CI: both workflows sync `--extra s3test`, and the module raises when CI runs
without it, so the class cannot skip silently. The presign endpoint's authz matrix (the foreign run 404, the foreign
event 404, a non-POD event 404, the owner 200), the forged grant (a different signing key ⇒ 404),
the non-hex signature, the expired grant, and the missing object (a valid grant ⇒ 404). The local
store's tests keep their ADR-010 guarantees.

## Consequences

- The phone fetches the photo with a dying URL — no API bytes-proxying, no long-lived credentials
  on the device.
- The second API instance works (the object store is shared state).
- MinIO stays banned; any S3-compatible emulator in tests is moto.

## Verification

- The moto-backed tests (`tests/test_pod_store.py`) + the presign endpoint's tests
  (`tests/test_runs_api.py`) — TDD.
- All gates; the ADR line for the lead in `CURRENT-backend.md`.
