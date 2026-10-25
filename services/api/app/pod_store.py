"""The proof-of-delivery storage backends (ADR-011): one interface, two homes.

`LocalPodStore` is the ADR-010 behaviour (a directory on the server, the
default). `S3PodStore` is any S3-compatible object store (AWS S3, R2,
Wasabi, a self-hosted gateway) via boto3 — the bytes go to the store, the
phone gets a **signed URL that expires** and fetches them directly.

The uploads keep every ADR-010 guarantee before the store is involved: the
size cap read first, the magic-byte sniff, the server-side key naming
(`{run_id}/{event_id}.bin` — the client's name is never trusted).
"""

from __future__ import annotations

import hashlib
import hmac
import shutil
import time
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Protocol

from .pod import POD_URL_TTL_SECONDS, PodSettings


def object_key(run_id: uuid.UUID, event_id: uuid.UUID) -> str:
    """The store key: scoped to the run, named by the server.

    Two couriers who somehow send the same event id cannot read or overwrite
    each other's bytes - the key sits under the run's own prefix.
    """
    return f"{run_id}/{event_id}.bin"


class PodStore(Protocol):
    """What the API needs from the POD storage (ADR-011 §1)."""

    def save(self, run_id: uuid.UUID, event_id: uuid.UUID, content: bytes) -> str:
        """Store the bytes atomically; return the sha256 of what was stored."""
        ...

    def fingerprint(self, run_id: uuid.UUID, event_id: uuid.UUID) -> tuple[int, str]:
        """The bytes and sha256 of an already-stored upload."""
        ...

    def exists(self, run_id: uuid.UUID, event_id: uuid.UUID) -> bool:
        """Whether the event's bytes are stored."""
        ...

    def presign_url(self, run_id: uuid.UUID, event_id: uuid.UUID) -> tuple[str, datetime]:
        """A short-lived URL the phone can fetch the photo from."""
        ...

    def delete_run(self, run_id: uuid.UUID) -> int:
        """Delete every byte of a run (DATA-SAFETY: the photos die with the
        run). Returns how many objects went."""
        ...


class LocalPodStore:
    """The ADR-010 directory store, behind the ADR-011 interface."""

    def __init__(self, directory: Path, ttl_seconds: int = POD_URL_TTL_SECONDS) -> None:
        self._directory = directory
        self._ttl = ttl_seconds

    def save(self, run_id: uuid.UUID, event_id: uuid.UUID, content: bytes) -> str:
        path = self._path(run_id, event_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        staging = path.with_suffix(".part")
        staging.write_bytes(content)
        staging.replace(path)
        return hashlib.sha256(content).hexdigest()

    def fingerprint(self, run_id: uuid.UUID, event_id: uuid.UUID) -> tuple[int, str]:
        content = self._path(run_id, event_id).read_bytes()
        return len(content), hashlib.sha256(content).hexdigest()

    def exists(self, run_id: uuid.UUID, event_id: uuid.UUID) -> bool:
        return self._path(run_id, event_id).exists()

    def presign_url(self, run_id: uuid.UUID, event_id: uuid.UUID) -> tuple[str, datetime]:
        """The local store cannot hand out an S3 URL: the bytes stream
        through the API's own endpoint, and the grant is an HMAC over
        (run, event, expiry) - self-verifying, no client-trusted state."""
        expires = int(time.time()) + self._ttl
        message = f"{run_id}/{event_id}/{expires}".encode()
        signature = hmac.new(self._secret(), message, hashlib.sha256).hexdigest()
        return (
            f"/runs/{run_id}/pod/{event_id}/bytes?expires={expires}&signature={signature}",
            datetime.fromtimestamp(expires, tz=UTC),
        )

    def verify_stream_grant(
        self, run_id: uuid.UUID, event_id: uuid.UUID, expires: int, signature: str
    ) -> bool:
        """Whether the streaming grant is intact and unexpired."""
        if expires < int(time.time()):
            return False
        expected = hmac.new(
            self._secret(), f"{run_id}/{event_id}/{expires}".encode(), hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(signature, expected)

    def read_bytes(self, run_id: uuid.UUID, event_id: uuid.UUID) -> bytes:
        return self._path(run_id, event_id).read_bytes()

    def delete_run(self, run_id: uuid.UUID) -> int:
        directory = self._directory / str(run_id)
        if not directory.exists():
            return 0
        count = len(list(directory.glob("*.bin")))
        shutil.rmtree(directory)
        return count

    def _secret(self) -> bytes:
        from app.auth.jwks import get_auth_settings  # noqa: PLC0415 - lazy: avoids the import cycle

        return get_auth_settings().auth_jwt_issuer.encode("utf-8") or b"pod-store"

    def _path(self, run_id: uuid.UUID, event_id: uuid.UUID) -> Path:
        return self._directory / str(run_id) / f"{event_id}.bin"


class S3PodStore:
    """Any S3-compatible object store via boto3 (ADR-011 §1)."""

    def __init__(self, settings: PodSettings, client: Any = None) -> None:
        self._settings = settings
        self._client = client
        if self._client is None:
            import boto3  # noqa: PLC0415 - the s3 extra is optional; imported lazily

            self._client = boto3.client(
                "s3",
                endpoint_url=settings.pod_s3_endpoint_url or None,
                region_name=settings.pod_s3_region or None,
                aws_access_key_id=settings.pod_s3_access_key_id,
                aws_secret_access_key=settings.pod_s3_secret_access_key,
            )
        self._bucket = settings.pod_s3_bucket
        self._ttl = settings.pod_url_ttl_seconds

    def save(self, run_id: uuid.UUID, event_id: uuid.UUID, content: bytes) -> str:
        key = object_key(run_id, event_id)
        self._client.put_object(Bucket=self._bucket, Key=key, Body=content)
        return hashlib.sha256(content).hexdigest()

    def fingerprint(self, run_id: uuid.UUID, event_id: uuid.UUID) -> tuple[int, str]:
        head = self._client.head_object(Bucket=self._bucket, Key=object_key(run_id, event_id))
        return int(head["ContentLength"]), str(head["ETag"]).strip('"')

    def exists(self, run_id: uuid.UUID, event_id: uuid.UUID) -> bool:
        try:
            self._client.head_object(Bucket=self._bucket, Key=object_key(run_id, event_id))
        except self._client.exceptions.ClientError:
            return False
        return True

    def presign_url(self, run_id: uuid.UUID, event_id: uuid.UUID) -> tuple[str, datetime]:
        url = self._client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self._bucket, "Key": object_key(run_id, event_id)},
            ExpiresIn=self._ttl,
        )
        return url, datetime.fromtimestamp(int(time.time()) + self._ttl, tz=UTC)

    def delete_run(self, run_id: uuid.UUID) -> int:
        prefix = f"{run_id}/"
        listed = self._client.list_objects_v2(Bucket=self._bucket, Prefix=prefix)
        objects = [{"Key": item["Key"]} for item in listed.get("Contents", [])]
        if not objects:
            return 0
        self._client.delete_objects(
            Bucket=self._bucket, Delete={"Objects": objects, "Quiet": True}
        )
        return len(objects)


def pod_store(settings: Any | None = None) -> PodStore:
    """The store the API uses, selected by `POD_STORAGE_BACKEND`.

    The settings are duck-typed: the module's own `PodSettings` or the
    caller's equivalent (the ADR-010 `pod.PodSettings` carries the same
    fields — one source of truth per deployment, chosen in the endpoint).
    """
    settings = settings or PodSettings()
    if settings.pod_storage_backend == "s3":
        return S3PodStore(settings)
    return LocalPodStore(settings.pod_storage_dir, settings.pod_url_ttl_seconds)
