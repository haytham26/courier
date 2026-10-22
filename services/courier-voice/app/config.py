"""The configuration of Courier Voice.

Every secret comes from the environment and none of them has a default: the
service refuses to use the server brain without a gateway, and it refuses to
use a gateway whose provider list is empty (the D25 routing policy: only
providers that allow commercial API use and that do not train on our data).
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class VoiceConfig(BaseSettings):
    """The configuration, read from the environment."""

    model_config = SettingsConfigDict(env_file=".env.local", extra="ignore")

    # The Courier API: where the run comes from.
    courier_api_base_url: str = "http://localhost:8000"
    courier_api_timeout_seconds: float = 8.0

    # The one gateway for the server brain (D25).
    omniroute_base_url: str = ""
    omniroute_api_key: str = ""
    omniroute_model: str = "courier-voice-brain"
    omniroute_timeout_seconds: float = 12.0
    omniroute_allowed_providers: str = ""
    omniroute_daily_cost_limit_nzd: float = 20.0
    omniroute_price_nzd_per_1k_tokens: float = 0.02
    omniroute_asr_model: str = ""
    omniroute_tts_model: str = ""

    # The tokens of the courier.
    auth_jwks_url: str = ""
    auth_jwt_issuer: str = ""
    auth_jwt_audience: str = "courier-api"
    auth_jwt_algorithms: str = "ES256"
    auth_jwks_cache_seconds: int = 300
    auth_jwks_timeout_seconds: float = 5.0

    # The turn taking.
    voice_silence_timeout_seconds: float = 6.0
    voice_parked_silence_timeout_seconds: float = 10.0
    voice_barge_in_min_words: int = 1

    @property
    def omniroute_providers(self) -> tuple[str, ...]:
        """The providers the gateway may use for production traffic.

        An empty list means no provider is allowed: the server brain stays
        unavailable rather than sending a driver's words to a provider that
        may train on them.
        """
        return tuple(
            item.strip() for item in self.omniroute_allowed_providers.split(",") if item.strip()
        )

    @property
    def audiences(self) -> tuple[str, ...]:
        """The audiences a courier's token may carry."""
        return tuple(item.strip() for item in self.auth_jwt_audience.split(",") if item.strip())

    @property
    def algorithms(self) -> tuple[str, ...]:
        """The signing algorithms the service accepts."""
        return tuple(item.strip() for item in self.auth_jwt_algorithms.split(",") if item.strip())
