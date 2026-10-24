"""The proof-of-delivery storage: the bytes, the name, the honesty checks.

The phone uploads the at-the-door photo; the server decides everything about
where it lands. The client's filename and declared content type are never
trusted (ASVS V5): the bytes are sniffed for a JPEG/PNG/HEIC magic, the size
is capped before anything is stored, and the file is named by the server
after the event id it belongs to.
"""

from __future__ import annotations

import hashlib
import uuid
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

POD_MAX_BYTES = 10 * 1024 * 1024
"""The written cap: a POD photo is at most 10 MiB (ASVS V13)."""


class PodSettings(BaseSettings):
    """Where the POD bytes land (the directory comes from the env, ASVS V14)."""

    model_config = SettingsConfigDict(env_file=".env.local", extra="ignore")

    pod_storage_dir: Path = Path("pod-store")


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
    if len(content) >= 12 and content[4:8] == b"ftyp" and content[8:12] in (
        b"heic",
        b"heix",
        b"heim",
        b"hevc",
    ):
        return "heic"
    return None


def pod_path(directory: Path, event_id: uuid.UUID) -> Path:
    """Where the event's bytes live: the server's name, never the client's."""
    return directory / f"{event_id}.bin"


def save_pod(
    directory: Path,
    event_id: uuid.UUID,
    content: bytes,
) -> tuple[Path, str]:
    """Store the bytes under the server's name; return the path and the sha256."""
    directory.mkdir(parents=True, exist_ok=True)
    path = pod_path(directory, event_id)
    path.write_bytes(content)
    return path, hashlib.sha256(content).hexdigest()


def stored_pod_fingerprint(path: Path) -> tuple[int, str]:
    """The bytes and sha256 of an already-stored upload (the replay's answer)."""
    content = path.read_bytes()
    return len(content), hashlib.sha256(content).hexdigest()
