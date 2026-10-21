"""The licence ledger, as a shipped surface.

ADR-004 (point 4) and D23 make the ledger part of the product, not a
spreadsheet: every engine the service can load publishes the licence of its
code **and** of its weights, and an engine whose licence is unknown or not
commercial is unavailable, with the reason.

The licences below were read on the date in the row. They were not guessed:
the code licences come from the package metadata of the tree this service runs
from, and the weights licences come from the model cards and the licence files
recorded in `docs/adr/ADR-004-voice-service-licences.md` and
`docs/research/2026/on-device-stt-tts-vad-kws.md`.

The whole table is also in `docs/LICENSES.md`, which is the ledger the whole
company reads.
"""

from __future__ import annotations

from .models import LicenceEntry

#: The licences a shipped engine may carry.
SHIPPABLE_LICENCES = (
    "MIT",
    "Apache-2.0",
    "BSD-2-Clause",
    "BSD-3-Clause",
    "ISC",
    "0BSD",
    "Unlicense",
    "CC0-1.0",
    "BSD-2-Clause OR Apache-2.0",
    "Apache-2.0 OR BSD-3-Clause",
)

#: The engines and the weights they carry.
LEDGER: tuple[LicenceEntry, ...] = (
    LicenceEntry(
        artefact="sherpa-onnx",
        kind="engine code (on device)",
        version="v1.12.35 (pinned by react-native-sherpa-onnx 0.4.4)",
        licence="Apache-2.0",
        read_on="2026-10-21",
        decision="shippable",
        obligations="keep the Apache-2.0 notice with the binary",
        where_used="the on-device STT, TTS, VAD and keyword spotting",
    ),
    LicenceEntry(
        artefact="react-native-sherpa-onnx",
        kind="binding (on device)",
        version="0.4.4",
        licence="MIT",
        read_on="2026-10-21",
        decision="shippable",
        obligations="keep the MIT notice",
        where_used="the TurboModule the app uses for the on-device speech",
    ),
    LicenceEntry(
        artefact="Kokoro-82M",
        kind="model weights (on-device TTS)",
        version="v0.19 (int8 pack)",
        licence="Apache-2.0",
        read_on="2026-10-21",
        decision="shippable",
        obligations="attribution in the licences screen of the app",
        where_used="the voice that speaks on the phone",
    ),
    LicenceEntry(
        artefact="smart-turn-v3",
        kind="model weights (end of turn)",
        version="v3.2 (ONNX, 8.68 MB int8)",
        licence="BSD-2-Clause",
        read_on="2026-10-21",
        decision="shippable",
        obligations="keep the BSD-2 notice",
        where_used="the decision that the courier has finished speaking",
    ),
    LicenceEntry(
        artefact="silero-vad",
        kind="model weights (voice activity)",
        version="sherpa-onnx bundled",
        licence="MIT (the LICENSE file) / CC BY-NC 4.0 (the README badge) - contradictory, UNVERIFIED",
        read_on="2026-10-21",
        decision="internal-only",
        obligations="read the file in our own tree before the pack ships",
        where_used="the voice activity gate, through sherpa-onnx",
    ),
    LicenceEntry(
        artefact="Qwen3-ASR-1.7B",
        kind="model weights (server ASR)",
        version="1.7B",
        licence="Apache-2.0",
        read_on="2026-10-21",
        decision="shippable",
        obligations="attribution in the licences screen",
        where_used="the server transcription, when the gateway is configured for it",
    ),
    LicenceEntry(
        artefact="Qwen3-TTS-12Hz-1.7B-CustomVoice",
        kind="model weights (server TTS)",
        version="1.7B",
        licence="Apache-2.0",
        read_on="2026-10-21",
        decision="shippable",
        obligations="attribution in the licences screen",
        where_used="the server voice, when the gateway is configured for it",
    ),
    LicenceEntry(
        artefact="OmniRoute",
        kind="gateway (server brain)",
        version="self-hosted, pinned",
        licence="MIT",
        read_on="2026-10-21",
        decision="shippable",
        obligations="keep the MIT notice with the deployment",
        where_used="the one gateway the server brain talks to (D25)",
    ),
    LicenceEntry(
        artefact="OmniVoice pretrained weights",
        kind="model weights",
        version="0.2.1",
        licence="CC-BY-NC",
        read_on="2026-10-21",
        decision="blocked",
        obligations="not shipped, not downloaded, not served to a driver",
        where_used="nowhere in the product; the upstream code is a reference only",
    ),
    LicenceEntry(
        artefact="OmniVoice audio_tokenizer weights",
        kind="model weights",
        version="0.2.1",
        licence="Boson Higgs Audio 2 Community Licence Agreement",
        read_on="2026-10-21",
        decision="blocked",
        obligations="not shipped; the community licence carries obligations we do not take",
        where_used="nowhere in the product",
    ),
    LicenceEntry(
        artefact="openWakeWord shipped models",
        kind="model weights",
        version="0.6.0",
        licence="CC-BY-NC-SA-4.0",
        read_on="2026-10-21",
        decision="blocked",
        obligations="not shipped; the weights are non-commercial and share-alike",
        where_used="nowhere in the product",
    ),
    LicenceEntry(
        artefact="fastapi",
        kind="library (this service)",
        version="0.158.1",
        licence="MIT",
        read_on="2026-10-22",
        decision="shippable",
        obligations="keep the MIT notice",
        where_used="the HTTP surface of the voice service",
    ),
    LicenceEntry(
        artefact="starlette",
        kind="library (this service)",
        version="1.9.0",
        licence="BSD-3-Clause",
        read_on="2026-10-22",
        decision="shippable",
        obligations="keep the BSD-3 notice",
        where_used="the ASGI layer under FastAPI",
    ),
    LicenceEntry(
        artefact="pydantic",
        kind="library (this service)",
        version="2.14.1",
        licence="MIT",
        read_on="2026-10-22",
        decision="shippable",
        obligations="keep the MIT notice",
        where_used="the models of the service",
    ),
    LicenceEntry(
        artefact="pydantic-settings",
        kind="library (this service)",
        version="2.16.1",
        licence="MIT",
        read_on="2026-10-22",
        decision="shippable",
        obligations="keep the MIT notice",
        where_used="the configuration of the service",
    ),
    LicenceEntry(
        artefact="httpx",
        kind="library (this service)",
        version="0.28.1",
        licence="BSD-3-Clause",
        read_on="2026-10-22",
        decision="shippable",
        obligations="keep the BSD-3 notice",
        where_used="the calls to the gateway and to the Courier API",
    ),
    LicenceEntry(
        artefact="PyJWT",
        kind="library (this service)",
        version="2.15.1",
        licence="MIT",
        read_on="2026-10-22",
        decision="shippable",
        obligations="keep the MIT notice",
        where_used="the verification of the courier's token",
    ),
    LicenceEntry(
        artefact="cryptography",
        kind="library (this service)",
        version="50.0.2",
        licence="Apache-2.0 OR BSD-3-Clause",
        read_on="2026-10-22",
        decision="shippable",
        obligations="keep the notice of the chosen licence",
        where_used="the ES256 keys of the JWKS",
    ),
    LicenceEntry(
        artefact="uvicorn",
        kind="library (this service)",
        version="0.54.0",
        licence="BSD-3-Clause",
        read_on="2026-10-22",
        decision="shippable",
        obligations="keep the BSD-3 notice",
        where_used="the server that runs the service",
    ),
    LicenceEntry(
        artefact="certifi",
        kind="library (this service, transitive)",
        version="2026.10.19",
        licence="MPL-2.0",
        read_on="2026-10-22",
        decision="shippable",
        obligations="the trust store of httpx; it does not reach the app bundle",
        where_used="the TLS certificates of the outbound calls",
    ),
)


def ledger() -> tuple[LicenceEntry, ...]:
    """The whole ledger, in the order it is published."""
    return LEDGER


def entry_for(artefact: str) -> LicenceEntry | None:
    """The row of one artefact, or None when it is not in the ledger."""
    for entry in LEDGER:
        if entry.artefact == artefact:
            return entry
    return None


def licence_of(artefact: str) -> str:
    """The licence of one artefact, or "unknown" when it is not in the ledger."""
    entry = entry_for(artefact)
    if entry is None:
        return "unknown"
    return entry.licence


def is_shippable(artefact: str) -> bool:
    """Whether an artefact may be shipped.

    An artefact that is not in the ledger at all is not shippable: an unknown
    licence is treated as a non-permissive one (ADR-004).
    """
    entry = entry_for(artefact)
    if entry is None or entry.decision != "shippable":
        return False
    return any(entry.licence.startswith(allowed) for allowed in SHIPPABLE_LICENCES)


def reason_for(artefact: str) -> str:
    """Why an artefact may or may not be shipped, in one sentence."""
    entry = entry_for(artefact)
    if entry is None:
        return f"{artefact} is not in the licence ledger"
    if entry.decision != "shippable":
        return f"{artefact} is {entry.decision}: {entry.licence}"
    return f"{artefact} is {entry.licence} and shippable"
