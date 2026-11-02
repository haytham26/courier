"""The POD storage backends (ADR-011): the local store, the S3 store on moto,
and the retention.

`moto` (Apache-2.0) emulates S3 in-process — the founder's rule bans MinIO
(AGPL-3.0) from the repo and the tests alike. The S3 tests run only when the
`s3` extra is installed (moto + boto3); the local tests always run.
"""

from __future__ import annotations

import hashlib
import importlib
import importlib.util
import os
import time
import uuid
from collections.abc import Generator
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import pytest

from app.pod import pod_settings
from app.pod_store import LocalPodStore, S3PodStore, object_key

moto: Any
try:  # the s3 extra: boto3 + moto (Apache-2.0)
    moto = importlib.import_module("moto")
except ImportError:  # pragma: no cover - the extra is optional
    moto = None

S3_AVAILABLE = moto is not None and importlib.util.find_spec("boto3") is not None

if not S3_AVAILABLE and os.environ.get("CI"):
    raise RuntimeError("the s3test extra (boto3 + moto) must be installed in CI")

TEST_SECRET = "test-only-pod-url-signing-secret-0123456789"
OTHER_SECRET = "a-different-pod-signing-secret-0123456789"

RUN_ID = uuid.uuid4()
EVENT_ID = uuid.uuid4()
OTHER_RUN = uuid.uuid4()
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64


class TestTheLocalGrant:
    def test_the_secret_decides_the_grant(self, tmp_path: Path) -> None:
        """The review's blocker: a grant signed with another key is refused."""
        server = LocalPodStore(tmp_path, TEST_SECRET)
        url, _ = server.presign_url(RUN_ID, EVENT_ID)
        expires = int(url.split("expires=")[1].split("&")[0])
        signature = url.split("signature=")[1]

        assert server.verify_stream_grant(RUN_ID, EVENT_ID, expires, signature)
        assert not LocalPodStore(tmp_path, OTHER_SECRET).verify_stream_grant(
            RUN_ID, EVENT_ID, expires, signature
        )

    def test_a_non_hex_signature_is_refused_not_crashed(self, tmp_path: Path) -> None:
        store = LocalPodStore(tmp_path, TEST_SECRET)

        assert not store.verify_stream_grant(
            RUN_ID, EVENT_ID, int(time.time()) + 60, "not-a-hex-signature"
        )

    def test_an_expired_grant_is_refused(self, tmp_path: Path) -> None:
        store = LocalPodStore(tmp_path, TEST_SECRET)
        url, _ = store.presign_url(RUN_ID, EVENT_ID)
        expires = int(url.split("expires=")[1].split("&")[0])
        signature = url.split("signature=")[1]

        assert not store.verify_stream_grant(RUN_ID, EVENT_ID, expires - store._ttl - 1, signature)


class TestTheLocalStore:
    def test_save_fingerprint_and_delete_run(self, tmp_path: Path) -> None:
        store = LocalPodStore(tmp_path, TEST_SECRET)

        digest = store.save(RUN_ID, EVENT_ID, PNG)

        assert digest == hashlib.sha256(PNG).hexdigest()
        assert store.exists(RUN_ID, EVENT_ID)
        assert store.fingerprint(RUN_ID, EVENT_ID) == (len(PNG), digest)
        assert store.delete_run(RUN_ID) == 1
        assert not store.exists(RUN_ID, EVENT_ID)
        assert store.delete_run(RUN_ID) == 0

    def test_delete_run_never_touches_another_run(self, tmp_path: Path) -> None:
        store = LocalPodStore(tmp_path, TEST_SECRET)
        store.save(RUN_ID, EVENT_ID, PNG)
        store.save(OTHER_RUN, EVENT_ID, PNG)

        store.delete_run(RUN_ID)

        assert not store.exists(RUN_ID, EVENT_ID)
        assert store.exists(OTHER_RUN, EVENT_ID)


@pytest.mark.skipif(not S3_AVAILABLE, reason="the s3 extra (boto3 + moto) is not installed")
class TestTheS3Store:
    @pytest.fixture()
    def store(self) -> Generator[S3PodStore, None, None]:
        assert moto is not None
        with moto.mock_aws():
            settings = pod_settings()
            settings.pod_storage_backend = "s3"
            settings.pod_s3_bucket = "courier-pod-test"
            boto3 = importlib.import_module("boto3")
            client = boto3.client("s3", region_name="ap-southeast-2")
            client.create_bucket(
                Bucket="courier-pod-test",
                CreateBucketConfiguration={"LocationConstraint": "ap-southeast-2"},
            )
            yield S3PodStore(settings, client)

    def test_save_and_fingerprint(self, store: S3PodStore) -> None:
        digest = store.save(RUN_ID, EVENT_ID, PNG)

        assert digest == hashlib.sha256(PNG).hexdigest()
        assert store.exists(RUN_ID, EVENT_ID)
        # The fingerprint is the sha256 written as metadata at save time, not
        # the ETag (which is an MD5, or opaque under SSE-KMS): the contract's
        # `sha256` must be true on both backends.
        assert store.fingerprint(RUN_ID, EVENT_ID) == (len(PNG), digest)

    def test_a_copy_without_the_digest_metadata_is_rehashed_not_a_500(
        self, store: S3PodStore
    ) -> None:
        """BUG-119: another tool's copy carries no sha256 metadata.

        A partial multipart or a copy written outside the API leaves the
        object with no `Metadata.sha256`. The fingerprint used to raise a bare
        `RuntimeError` out of the replay route - a 500 on the courier's screen,
        with the event log untouched. The fallback is a re-hash of the bytes
        actually stored, which is the honest answer either way.
        """
        client = store._client

        # Another tool's copy: the bytes, and no metadata at all.
        client.put_object(
            Bucket="courier-pod-test",
            Key=object_key(RUN_ID, EVENT_ID),
            Body=PNG,
        )

        assert store.fingerprint(RUN_ID, EVENT_ID) == (
            len(PNG),
            hashlib.sha256(PNG).hexdigest(),
        )

    def test_an_unreadable_copy_raises_a_typed_error_with_the_reason(
        self, store: S3PodStore, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """The fingerprinted bytes may be gone: the route answers 500 with a
        logged reason rather than a bare, unexplained RuntimeError."""
        from app.pod_store import PodFingerprintError  # the new name (BUG-119)

        client_error = importlib.import_module("botocore.exceptions").ClientError
        store.save(RUN_ID, EVENT_ID, PNG)

        def broken(**kwargs: object) -> None:
            raise client_error({"Error": {"Code": "500", "Message": "backend down"}}, "HeadObject")

        monkeypatch.setattr(store._client, "head_object", broken)

        with pytest.raises(PodFingerprintError) as raised:
            store.fingerprint(RUN_ID, EVENT_ID)
        assert "backend down" in str(raised.value)

    def test_the_key_is_scoped_to_the_run(self, store: S3PodStore) -> None:
        store.save(RUN_ID, EVENT_ID, PNG)

        assert object_key(RUN_ID, EVENT_ID).startswith(f"{RUN_ID}/")

    def test_the_presigned_url_expires(self, store: S3PodStore) -> None:
        url, expires_at = store.presign_url(RUN_ID, EVENT_ID)

        assert "courier-pod-test" in url
        assert "Expires=" in url  # moto signs with the classic query style
        assert expires_at > datetime.now(tz=expires_at.tzinfo) - timedelta(seconds=5)

    def test_delete_run_removes_the_prefix_and_nothing_else(self, store: S3PodStore) -> None:
        store.save(RUN_ID, EVENT_ID, PNG)
        store.save(OTHER_RUN, EVENT_ID, PNG)

        assert store.delete_run(RUN_ID) == 1
        assert not store.exists(RUN_ID, EVENT_ID)
        assert store.exists(OTHER_RUN, EVENT_ID)

    def test_delete_run_pages_beyond_one_thousand_objects(self, store: S3PodStore) -> None:
        """A single unpaginated list left a long run's tail alive (the review)."""
        for index in range(1005):
            store.save(RUN_ID, uuid.uuid5(RUN_ID, str(index)), PNG)

        assert store.delete_run(RUN_ID) == 1005
        assert store.delete_run(RUN_ID) == 0

    def test_exists_does_not_swallow_a_permission_error(
        self, store: S3PodStore, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """A 403 is not "absent": swallowing it would overwrite a replay."""
        client_error = importlib.import_module("botocore.exceptions").ClientError

        def deny(**kwargs: object) -> None:
            raise client_error({"Error": {"Code": "403", "Message": "denied"}}, "HeadObject")

        monkeypatch.setattr(store._client, "head_object", deny)
        with pytest.raises(client_error):
            store.exists(RUN_ID, EVENT_ID)
