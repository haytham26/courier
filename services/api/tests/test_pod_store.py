"""The POD storage backends (ADR-011): the local store, the S3 store on moto,
and the retention.

`moto` (Apache-2.0) emulates S3 in-process — the founder's rule bans MinIO
(AGPL-3.0) from the repo and the tests alike. The S3 tests run only when the
`s3` extra is installed (moto + boto3); the local tests always run.
"""

from __future__ import annotations

import hashlib
import uuid
from collections.abc import Generator
from datetime import datetime, timedelta
from pathlib import Path

import pytest

from app.pod import pod_settings
from app.pod_store import LocalPodStore, S3PodStore, object_key

S3_AVAILABLE = True
try:  # the s3 extra: boto3 + moto (Apache-2.0)
    import boto3  # noqa: F401
    from moto import mock_aws
except ImportError:  # pragma: no cover - the extra is optional
    S3_AVAILABLE = False

RUN_ID = uuid.uuid4()
EVENT_ID = uuid.uuid4()
OTHER_RUN = uuid.uuid4()
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64


class TestTheLocalStore:
    def test_save_fingerprint_and_delete_run(self, tmp_path: Path) -> None:
        store = LocalPodStore(tmp_path)

        digest = store.save(RUN_ID, EVENT_ID, PNG)

        assert digest == hashlib.sha256(PNG).hexdigest()
        assert store.exists(RUN_ID, EVENT_ID)
        assert store.fingerprint(RUN_ID, EVENT_ID) == (len(PNG), digest)
        assert store.delete_run(RUN_ID) == 1
        assert not store.exists(RUN_ID, EVENT_ID)
        assert store.delete_run(RUN_ID) == 0

    def test_delete_run_never_touches_another_run(self, tmp_path: Path) -> None:
        store = LocalPodStore(tmp_path)
        store.save(RUN_ID, EVENT_ID, PNG)
        store.save(OTHER_RUN, EVENT_ID, PNG)

        store.delete_run(RUN_ID)

        assert not store.exists(RUN_ID, EVENT_ID)
        assert store.exists(OTHER_RUN, EVENT_ID)


@pytest.mark.skipif(not S3_AVAILABLE, reason="the s3 extra (boto3 + moto) is not installed")
class TestTheS3Store:
    @pytest.fixture()
    def store(self) -> Generator[S3PodStore, None, None]:
        with mock_aws():
            settings = pod_settings()
            settings.pod_storage_backend = "s3"
            settings.pod_s3_bucket = "courier-pod-test"
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
        # The S3 fingerprint is the stored object's ETag (S3's own integrity
        # token), not the sha256 of the bytes — the size is the honest check.
        size, stored_digest = store.fingerprint(RUN_ID, EVENT_ID)
        assert size == len(PNG)
        assert stored_digest

    def test_the_key_is_scoped_to_the_run(self, store: S3PodStore) -> None:
        store.save(RUN_ID, EVENT_ID, PNG)

        assert object_key(RUN_ID, EVENT_ID).startswith(f"{RUN_ID}/")

    def test_the_presigned_url_expires(self, store: S3PodStore) -> None:
        url, expires_at = store.presign_url(RUN_ID, EVENT_ID)

        assert "courier-pod-test" in url
        assert "Expires=" in url  # moto signs with the classic query style
        assert expires_at > datetime.now(tz=expires_at.tzinfo) - timedelta(seconds=5)

    def test_delete_run_removes_the_prefix_and_nothing_else(
        self, store: S3PodStore
    ) -> None:
        store.save(RUN_ID, EVENT_ID, PNG)
        store.save(OTHER_RUN, EVENT_ID, PNG)

        assert store.delete_run(RUN_ID) == 1
        assert not store.exists(RUN_ID, EVENT_ID)
        assert store.exists(OTHER_RUN, EVENT_ID)
