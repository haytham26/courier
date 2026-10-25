"""The proof-of-delivery storage: the bytes, the name, the honesty checks.

The phone uploads the at-the-door photo; the server decides everything about
where it lands. The client's filename and declared content type are never
trusted (ASVS V5): the bytes are sniffed for a JPEG/PNG/HEIC magic, the size
is capped before anything is stored, and the file is named by the server
after the event id it belongs to - inside a directory scoped to the run, so
one courier's namespace can never collide with another's (ADR-010, the
review finding: a shared flat namespace let a replayed event id answer with
another courier's fingerprint).
"""

from __future__ import annotations

import hashlib
import uuid
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

POD_MAX_BYTES = 10 * 1024 * 1024
"""The written cap: a POD photo is at most 10 MiB (ASVS V13)."""

#: The HEIC brands real devices hand out: iPhone/Android exports commonly
#: carry `mif1`/`msf1` as the major brand with `heic` in the compatible list.
HEIC_MAJOR_BRANDS = (b"heic", b"heix", b"heim", b"hevc", b"mif1", b"msf1")


POD_URL_TTL_SECONDS = 900
"""The signed URL lives 15 minutes - long enough to render, short enough to
die before it is worth stealing (ASVS V8)."""


class PodSettings(BaseSettings):
    """Where the POD bytes land and who keeps them (ASVS V14: env-only)."""

    model_config = SettingsConfigDict(env_file=".env.local", extra="ignore")

    pod_storage_backend: str = "local"
    pod_storage_dir: Path = Path(__file__).resolve().parent.parent / "pod-store"
    pod_s3_bucket: str = ""
    pod_s3_endpoint_url: str = ""
    pod_s3_region: str = ""
    pod_s3_access_key_id: str = ""
    pod_s3_secret_access_key: str = ""
    pod_url_ttl_seconds: int = POD_URL_TTL_SECONDS


def pod_settings() -> PodSettings:
    """Read fresh, so a deployment (or a test) can point the dir anywhere."""
    return PodSettings()


def sniff_image_kind(content: bytes) -> str | None:
    """The image family the bytes declare, or None when none matches.

    Checked by magic, not by name: a text file named `photo.jpg` is not a
    JPEG, and the gate refuses it.
    """
    if content.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if len(content) >= 12 and content[4:8] == b"ftyp" and content[8:12] in HEIC_MAJOR_BRANDS:
        return "heic"
    return None


def pod_path(directory: Path, run_id: uuid.UUID, event_id: uuid.UUID) -> Path:
    """Where the event's bytes live, scoped to the run.

    The run owns the namespace: two couriers who somehow send the same event
    id cannot read or overwrite each other's bytes, because the file sits
    under the run's own directory. The name is still the server's decision -
    never the client's.
    """
    return directory / str(run_id) / f"{event_id}.bin"


def save_pod(
    directory: Path,
    run_id: uuid.UUID,
    event_id: uuid.UUID,
    content: bytes,
) -> tuple[Path, str]:
    """Store the bytes atomically; return the path and the sha256.

    The write lands in a temporary file in the same directory and is renamed
    into place, so a torn write can never become the proof of record - the
    file is either the whole upload or not there.
    """
    path = pod_path(directory, run_id, event_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    staging = path.with_suffix(".part")
    staging.write_bytes(content)
    staging.replace(path)
    return path, hashlib.sha256(content).hexdigest()


def stored_pod_fingerprint(path: Path) -> tuple[int, str]:
    """The bytes and sha256 of an already-stored upload (the replay's answer)."""
    content = path.read_bytes()
    return len(content), hashlib.sha256(content).hexdigest()
