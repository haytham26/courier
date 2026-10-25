"""The intake's model calls, through the OmniRoute gateway (D25) or the fake.

The gateway is a FOUNDER_TODO (self-hosted next to n8n, `OMNIROUTE_BASE_URL` /
`OMNIROUTE_API_KEY` in the server's secret manager). Until it exists,
`get_intake_provider()` returns the deterministic fake: voice dictation is one
parcel per spoken line, which is a real fallback heuristic, not a fabrication.

The real client speaks the OpenAI-compatible chat-completions shape. Its
failure paths are deliberately asymmetric: an unparseable extraction raises
(an invented manifest is worse than an honest error), while a phrasing
failure falls back to a fixed question (the courier must always get a reply).
"""

from __future__ import annotations

import base64
import json
from typing import Any, Protocol

import httpx
from pydantic_settings import BaseSettings, SettingsConfigDict

from ..prompts import ANOMALY_QUESTION, INGEST_EXTRACT

OCR_PROMPT = """\
Transcribe every delivery line of this paper manifest photo, one line per parcel.
Copy, never guess: a line you cannot read is omitted. No headings, no totals, no barcode lines.
"""

MAX_OCR_CHARS = 50_000


class OmniRouteError(Exception):
    """The provider could not answer; the endpoint owns the honest status."""


class ProviderUnavailableError(OmniRouteError):
    """The capability is not configured (the gateway is a FOUNDER_TODO)."""


class OmniRouteSettings(BaseSettings):
    """The gateway's address and key (ASVS V14: env-only, never logged)."""

    model_config = SettingsConfigDict(env_file=".env.local", extra="ignore")

    omniroute_base_url: str = ""
    omniroute_api_key: str = ""
    omniroute_model: str = "courier-intake"
    omniroute_timeout_seconds: float = 30.0


class IntakeProvider(Protocol):
    """The two calls the intake graph makes, plus the manifest's OCR."""

    def extract(self, source: str, text: str) -> list[dict[str, Any]]:
        """The parcels in the text: `raw` (the address line) + size_class."""
        ...

    def phrase(self, problem: str, raw: str) -> str:
        """One spoken question for an anomaly, at most 12 words."""
        ...

    def ocr(self, image: bytes) -> str:
        """The manifest photo as text, one line per parcel."""
        ...


def _json_object(answer: str) -> dict[str, Any]:
    """The first JSON object in the answer, prose around it tolerated."""
    candidates = [answer]
    start, end = answer.find("{"), answer.rfind("}")
    if start != -1 and end > start:
        candidates.append(answer[start : end + 1])
    for candidate in candidates:
        try:
            payload = json.loads(candidate)
        except ValueError:
            continue
        if isinstance(payload, dict):
            return payload
    raise OmniRouteError("the extraction provider did not answer with JSON")


class OmniRouteProvider:
    """The OpenAI-compatible client of the self-hosted gateway (D25)."""

    name = "omniroute"

    def __init__(self, settings: OmniRouteSettings, client: httpx.Client | None = None) -> None:
        self._settings = settings
        self._client = client or httpx.Client(timeout=settings.omniroute_timeout_seconds)

    def _chat(self, content: str | list[dict[str, Any]]) -> str:
        url = f"{self._settings.omniroute_base_url.rstrip('/')}/v1/chat/completions"
        try:
            response = self._client.post(
                url,
                headers={"Authorization": f"Bearer {self._settings.omniroute_api_key}"},
                json={
                    "model": self._settings.omniroute_model,
                    "temperature": 0,
                    "messages": [{"role": "user", "content": content}],
                },
            )
            response.raise_for_status()
            answer: Any = response.json()["choices"][0]["message"]["content"]
        except (httpx.HTTPError, KeyError, IndexError, ValueError) as error:
            raise OmniRouteError("the gateway did not answer") from error
        if not isinstance(answer, str) or not answer.strip():
            raise OmniRouteError("the gateway answered nonsense")
        return answer

    def extract(self, source: str, text: str) -> list[dict[str, Any]]:
        answer = self._chat(INGEST_EXTRACT.format(source=source, text=text))
        payload = _json_object(answer)
        parcels = []
        for item in payload.get("parcels", []):
            raw = item.get("raw") if isinstance(item, dict) else None
            if isinstance(raw, str) and raw.strip():
                parcels.append({"raw": raw.strip(), "size_class": item.get("size_class")})
        if not parcels:
            raise OmniRouteError("the extraction returned no parcels")
        return parcels

    def phrase(self, problem: str, raw: str) -> str:
        try:
            answer = self._chat(ANOMALY_QUESTION.format(problem=problem, raw=raw, candidates=""))
        except OmniRouteError:
            return f"Confirm {raw[:60]}?"
        line = answer.strip().splitlines()[0].strip()[:120]
        return line or f"Confirm {raw[:60]}?"

    def ocr(self, image: bytes) -> str:
        data_url = "data:image/jpeg;base64," + base64.b64encode(image).decode("ascii")
        answer = self._chat(
            [
                {"type": "text", "text": OCR_PROMPT},
                {"type": "image_url", "image_url": {"url": data_url}},
            ]
        )
        return answer[:MAX_OCR_CHARS]


class FakeOmniRoute:
    """The deterministic provider that runs when no gateway is configured.

    Voice dictation is split one parcel per line - a real transcription shape.
    OCR is unavailable by construction: the fake never invents a manifest from
    a photo. A test may configure `ocr_text` to drive the same graph.
    """

    name = "fake"

    def __init__(self, ocr_text: str | None = None) -> None:
        self._ocr_text = ocr_text

    def extract(self, source: str, text: str) -> list[dict[str, Any]]:
        return [
            {"raw": line.strip(), "size_class": None} for line in text.splitlines() if line.strip()
        ]

    def phrase(self, problem: str, raw: str) -> str:
        return f"Confirm {raw[:60]}?"

    def ocr(self, image: bytes) -> str:
        if self._ocr_text is None:
            raise ProviderUnavailableError(
                "the OCR provider is not configured: set OMNIROUTE_BASE_URL and "
                "OMNIROUTE_API_KEY (FOUNDER_TODO), or send the text via /intake"
            )
        return self._ocr_text


def get_intake_provider() -> IntakeProvider:
    """The gateway when configured, the deterministic fake otherwise."""
    settings = OmniRouteSettings()
    if settings.omniroute_base_url and settings.omniroute_api_key:
        return OmniRouteProvider(settings)
    return FakeOmniRoute()
