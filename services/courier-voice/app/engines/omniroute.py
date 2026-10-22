"""The server brain, behind the OmniRoute gateway.

D25 makes OmniRoute the one gateway for the server brain and for the other
server AI features. This engine is the only place in the service that talks
to it, and it holds the rules D25 sets:

- only providers whose terms allow commercial API use and that do **not**
  train on our data may answer a courier's words. An empty allow-list means
  the server brain is unavailable, not that everything is allowed.
- the cost guard applies: free tiers first, a paid fallback with a cap.
- the logs hold no personal data. The transcript, the addresses and the names
  of the customers never reach a log line.

The gateway is an OpenAI-compatible chat endpoint, so the service can be
pointed at a different one without a code change.
"""

from __future__ import annotations

import logging

import httpx

from .. import licences
from ..config import VoiceConfig
from ..cost import CostGuard
from ..engine import EngineUnavailableError
from ..models import (
    EngineInfo,
    ReasoningReply,
    ReasoningRequest,
    Speech,
    Transcript,
)
from ..prompts import build_messages

logger = logging.getLogger("courier_voice.omniroute")

#: How many times a call is tried before the voice gives up.
ATTEMPTS = 2

#: The header the gateway may use to name the provider that answered.
PROVIDER_HEADER = "x-omniroute-provider"


class OmniRouteEngine:
    """The server brain."""

    name = "omniroute"

    def __init__(
        self,
        config: VoiceConfig,
        client: httpx.Client | None = None,
        guard: CostGuard | None = None,
    ) -> None:
        self._config = config
        self._client = client or httpx.Client(timeout=config.omniroute_timeout_seconds)
        self._guard = guard or CostGuard(
            limit_nzd=config.omniroute_daily_cost_limit_nzd,
            price_nzd_per_1k_tokens=config.omniroute_price_nzd_per_1k_tokens,
        )

    @property
    def guard(self) -> CostGuard:
        """The cost guard of the gateway."""
        return self._guard

    def capabilities(self) -> EngineInfo:
        """What this engine can do."""
        configured = bool(self._config.omniroute_base_url and self._config.omniroute_api_key)
        allowed = bool(self._config.omniroute_providers)
        if not configured:
            reason = "the gateway is not configured"
        elif not allowed:
            reason = "no provider is allowed for production traffic (D25)"
        else:
            reason = "the server brain answers through the OmniRoute gateway"
        return EngineInfo(
            name=self.name,
            online=configured and allowed,
            stt=bool(self._config.omniroute_asr_model),
            tts=bool(self._config.omniroute_tts_model),
            chat=configured and allowed,
            reason=reason,
            licence=licences.licence_of("OmniRoute"),
        )

    def _check_ready(self) -> None:
        """The engine refuses to run when the policy is not met."""
        if not licences.is_shippable("OmniRoute"):
            raise EngineUnavailableError(licences.reason_for("OmniRoute"))
        if not self._config.omniroute_base_url or not self._config.omniroute_api_key:
            raise EngineUnavailableError("the gateway is not configured")
        if not self._config.omniroute_providers:
            raise EngineUnavailableError("no provider is allowed for production traffic (D25)")

    def _check_budget(self) -> None:
        self._guard.reset_for_a_new_day()
        if not self._guard.may_spend():
            raise EngineUnavailableError("the daily voice budget is spent")

    def _headers(self) -> dict[str, str]:
        """The headers of a call to the gateway.

        The allow-list travels with the call, so the gateway routes only to the
        providers the founder's policy allows.
        """
        return {
            "Authorization": f"Bearer {self._config.omniroute_api_key}",
            "Content-Type": "application/json",
            "X-Courier-Allowed-Providers": ",".join(self._config.omniroute_providers),
        }

    def _payload(self, request: ReasoningRequest) -> dict[str, object]:
        """The body of a call to the gateway."""
        state = request.context.model_dump(mode="json")
        state["moving"] = request.moving
        state["language"] = request.language
        return {
            "model": self._config.omniroute_model,
            "messages": build_messages(state, request.transcript),
            "max_tokens": 60,
            "temperature": 0.3,
        }

    def _provider_of(self, response: httpx.Response, document: dict[str, object]) -> str | None:
        """The provider that answered, when the gateway says."""
        header = response.headers.get(PROVIDER_HEADER)
        if isinstance(header, str) and header:
            return header.strip()
        value = document.get("provider")
        if isinstance(value, str):
            return value.strip()
        return None

    def reason(self, request: ReasoningRequest) -> ReasoningReply:
        """What the server brain answers."""
        self._check_ready()
        self._check_budget()

        url = f"{self._config.omniroute_base_url.rstrip('/')}/v1/chat/completions"
        payload = self._payload(request)
        last_error: Exception | None = None

        for _attempt in range(ATTEMPTS):
            try:
                response = self._client.post(url, json=payload, headers=self._headers())
            except httpx.HTTPError as exc:
                last_error = exc
                continue
            if response.status_code >= 500:
                last_error = httpx.HTTPStatusError(
                    "the gateway failed",
                    request=response.request,
                    response=response,
                )
                continue
            if response.status_code >= 400:
                raise EngineUnavailableError(f"the gateway refused the call ({response.status_code})")

            document = response.json()
            provider = self._provider_of(response, document)
            if provider is not None and provider not in self._config.omniroute_providers:
                raise EngineUnavailableError(f"the provider '{provider}' is not allowed (D25)")

            speech = self._speech_of(document)
            tokens = self._tokens_of(document)
            cost = self._guard.charge(tokens)
            logger.info(
                "the server brain answered: tokens=%s cost_nzd=%.4f provider=%s",
                tokens,
                cost,
                provider or "unknown",
            )
            return ReasoningReply(
                speech=speech,
                source="server",
                engine=self.name,
                tokens=tokens,
                cost_nzd=cost,
            )

        raise EngineUnavailableError(f"the gateway cannot be reached: {last_error}")

    def _speech_of(self, document: dict[str, object]) -> str:
        """The words of the answer."""
        choices = document.get("choices")
        if not isinstance(choices, list) or not choices:
            return ""
        first = choices[0]
        if not isinstance(first, dict):
            return ""
        message = first.get("message")
        if not isinstance(message, dict):
            return ""
        content = message.get("content")
        if isinstance(content, str):
            return content.strip()
        return ""

    def _tokens_of(self, document: dict[str, object]) -> int:
        """How many tokens the answer cost."""
        usage = document.get("usage")
        if isinstance(usage, dict):
            value = usage.get("total_tokens")
            if isinstance(value, int):
                return value
        return 0

    def transcribe(self, audio: bytes, *, language: str, sample_rate: int) -> Transcript:
        """What the courier said, when the gateway runs the speech model."""
        self._check_ready()
        if not self._config.omniroute_asr_model:
            raise EngineUnavailableError("the server speech model is not configured")
        raise EngineUnavailableError("the server transcription is not available yet")

    def synthesise(self, text: str, *, voice: str, speed: float) -> Speech:
        """How the words are said, when the gateway runs the speech model."""
        self._check_ready()
        if not self._config.omniroute_tts_model:
            raise EngineUnavailableError("the server speech model is not configured")
        raise EngineUnavailableError("the server speech is not available yet")
