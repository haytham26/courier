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
import importlib
import logging
import shutil
import time
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Protocol

from .pod import POD_URL_TTL_SECONDS, PodSettings, pod_settings

logger = logging.getLogger(__name__)


class PodFingerprintError(RuntimeError):
    """The bytes are stored but their fingerprint cannot be read.

    Raised only when the object is *unreadable* - a 403 or a 5xx from the
    store - never when the metadata is merely absent, which the re-hash
    answers honestly. The route converts this into a 500 with the reason,
    so a courier sees an explanation rather than a bare crash.
    """


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

    def delete(self, run_id: uuid.UUID, event_id: uuid.UUID) -> bool:
        """Delete one object. Returns whether it was there.

        The pairing half of `save`: the POD route writes the bytes and the
        event row as one step, and a failed insert deletes the bytes it just
        wrote rather than leaving a photo no record accounts for (BUG-120).
        """
        ...

    def delete_run(self, run_id: uuid.UUID) -> int:
        """Delete every byte of a run (DATA-SAFETY: the photos die with the
        run). Returns how many objects went."""
        ...


class LocalPodStore:
    """The ADR-010 directory store, behind the ADR-011 interface."""

    def __init__(
        self, directory: Path, signing_secret: str, ttl_seconds: int = POD_URL_TTL_SECONDS
    ) -> None:
        if len(signing_secret) < 32:
            raise ValueError("the POD signing secret must be at least 32 characters")
        self._directory = directory
        self._signing_secret = signing_secret.encode("utf-8")
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
        signature = hmac.new(self._signing_secret, message, hashlib.sha256).hexdigest()
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
            self._signing_secret, f"{run_id}/{event_id}/{expires}".encode(), hashlib.sha256
        ).hexdigest()
        try:
            provided = bytes.fromhex(signature)
        except ValueError:
            # A non-hex signature is a forgery attempt, not a server error.
            return False
        return hmac.compare_digest(provided, bytes.fromhex(expected))

    def read_bytes(self, run_id: uuid.UUID, event_id: uuid.UUID) -> bytes:
        return self._path(run_id, event_id).read_bytes()

    def delete(self, run_id: uuid.UUID, event_id: uuid.UUID) -> bool:
        path = self._path(run_id, event_id)
        if not path.exists():
            return False
        path.unlink()
        return True

    def delete_run(self, run_id: uuid.UUID) -> int:
        directory = self._directory / str(run_id)
        if not directory.exists():
            return 0
        count = len(list(directory.glob("*.bin")))
        shutil.rmtree(directory)
        return count

    def _path(self, run_id: uuid.UUID, event_id: uuid.UUID) -> Path:
        return self._directory / str(run_id) / f"{event_id}.bin"


class S3PodStore:
    """Any S3-compatible object store via boto3 (ADR-011 §1)."""

    def __init__(self, settings: PodSettings, client: Any = None) -> None:
        self._settings = settings
        self._client = client
        if self._client is None:
            self._client = _s3_client(
                settings.pod_s3_endpoint_url,
                settings.pod_s3_region,
                settings.pod_s3_access_key_id,
                settings.pod_s3_secret_access_key,
            )
        self._bucket = settings.pod_s3_bucket
        self._ttl = settings.pod_url_ttl_seconds

    def save(self, run_id: uuid.UUID, event_id: uuid.UUID, content: bytes) -> str:
        key = object_key(run_id, event_id)
        digest = hashlib.sha256(content).hexdigest()
        extra: dict[str, Any] = {"Metadata": {"sha256": digest}}
        if self._settings.pod_s3_server_side_encryption:
            extra["ServerSideEncryption"] = self._settings.pod_s3_server_side_encryption
        self._client.put_object(Bucket=self._bucket, Key=key, Body=content, **extra)
        return digest

    def fingerprint(self, run_id: uuid.UUID, event_id: uuid.UUID) -> tuple[int, str]:
        """The bytes and sha256 of an already-stored upload.

        The digest is the `sha256` metadata `save` writes. When it is absent -
        a copy written by another tool, or a partial multipart - the bytes are
        read and hashed here instead of raising: the honest answer is what is
        stored, however it got there (BUG-119). Only a store that cannot be
        read at all raises, and then it raises `PodFingerprintError` with the
        reason, so the route's 500 carries an explanation.
        """
        key = object_key(run_id, event_id)
        try:
            head = self._client.head_object(Bucket=self._bucket, Key=key)
        except Exception as error:  # a 403, a 5xx, a timeout: not "absent"
            logger.warning("the POD fingerprint of %s could not be read: %s", key, error)
            raise PodFingerprintError(
                f"the stored POD object {key} cannot be read: {error}"
            ) from error
        digest = head.get("Metadata", {}).get("sha256")
        if not digest:
            logger.warning("the POD object %s carries no sha256 metadata: re-hashing", key)
            body = self._client.get_object(Bucket=self._bucket, Key=key)["Body"].read()
            return len(body), hashlib.sha256(body).hexdigest()
        return int(head["ContentLength"]), str(digest)

    def exists(self, run_id: uuid.UUID, event_id: uuid.UUID) -> bool:
        try:
            self._client.head_object(Bucket=self._bucket, Key=object_key(run_id, event_id))
        except self._client.exceptions.ClientError as error:
            code = str(error.response.get("Error", {}).get("Code", ""))
            if code in ("404", "NoSuchKey", "NotFound"):
                return False
            # A 403 or a 5xx is not "absent": treating it as absent would let a
            # replay overwrite the first upload.
            raise
        return True

    def presign_url(self, run_id: uuid.UUID, event_id: uuid.UUID) -> tuple[str, datetime]:
        url = self._client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self._bucket, "Key": object_key(run_id, event_id)},
            ExpiresIn=self._ttl,
        )
        return url, datetime.fromtimestamp(int(time.time()) + self._ttl, tz=UTC)

    def delete(self, run_id: uuid.UUID, event_id: uuid.UUID) -> bool:
        try:
            self._client.delete_object(Bucket=self._bucket, Key=object_key(run_id, event_id))
        except Exception as error:  # a 403 or a 5xx: the caller is told
            logger.warning(
                "the POD object %s could not be deleted: %s", object_key(run_id, event_id), error
            )
            raise PodFingerprintError(
                f"the stored POD object {object_key(run_id, event_id)} cannot be deleted: {error}"
            ) from error
        return True

    def delete_run(self, run_id: uuid.UUID) -> int:
        """Delete every object under the run's prefix, in honest batches.

        The list API pages at 1,000 keys and the delete API takes at most
        1,000 per call; a single unpaginated call left the tail of a long run
        alive while reporting success (the review finding). Per-key errors are
        raised, never swallowed - the retention claim is a DATA-SAFETY one.
        """
        prefix = f"{run_id}/"
        paginator = self._client.get_paginator("list_objects_v2")
        objects = [
            {"Key": item["Key"]}
            for page in paginator.paginate(Bucket=self._bucket, Prefix=prefix)
            for item in page.get("Contents", [])
        ]
        deleted = 0
        for start in range(0, len(objects), 1000):
            response = self._client.delete_objects(
                Bucket=self._bucket,
                Delete={"Objects": objects[start : start + 1000], "Quiet": False},
            )
            errors = response.get("Errors", [])
            if errors:
                raise RuntimeError(
                    f"the POD retention left {len(errors)} object(s) behind: {errors[:3]}"
                )
            deleted += len(response.get("Deleted", []))
        return deleted


def _s3_client(
    endpoint_url: str, region: str, access_key: str, secret_key: str
) -> Any:
    """One boto3 client per configuration (a client carries a connection
    pool; building one per request is waste)."""
    boto3: Any = importlib.import_module("boto3")

    return boto3.client(
        "s3",
        endpoint_url=endpoint_url or None,
        region_name=region or None,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
    )


def pod_store(settings: PodSettings | None = None) -> PodStore:
    """The store the API uses, selected by `POD_STORAGE_BACKEND`."""
    settings = settings or pod_settings()
    if settings.pod_storage_backend == "s3":
        return S3PodStore(settings)
    return LocalPodStore(
        settings.pod_storage_dir,
        settings.pod_url_signing_secret,
        settings.pod_url_ttl_seconds,
    )
