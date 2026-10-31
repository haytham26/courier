"""The configuration of Courier Voice.

Every secret comes from the environment and none of them has a default: the
service refuses to use the server brain without a gateway, and it refuses to
use a gateway whose provider list is empty (the D25 routing policy: only
providers that allow commercial API use and that do not train on our data).
"""

from __future__ import annotations

from urllib.parse import urlsplit

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

#: The hosts whose plaintext hop has no network to be adjacent to (BUG-131's
#: threat is the hop between hosts, not the machine's own loopback). This
#: mirrors the API's `app/auth/jwks.py` contract: the two services read the
#: same auth service and must not disagree about what they will fetch.
LOOPBACK_HOSTS = {"127.0.0.1", "localhost", "::1", "[::1]"}


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
    # BUG-123: the voice surface and the auth service are separate hosts with
    # no shared NTP guarantee either, so the same small tolerance the API
    # carries (and the same reason) applies here. The two resource servers
    # share the contract: BUG-126 was the day they disagreed about a valid
    # token, and a leeway on one surface only would be the next such day.
    auth_jwt_leeway_seconds: float = 30.0
    # BUG-131: the plaintext-JWKS allow-list, the same one the API's
    # `AUTH_JWKS_INTERNAL_HOSTS` carries. The voice service and the API read
    # the same auth service; the setting is named the same so the compose tree
    # can pass one value to both.
    auth_jwks_internal_hosts: str = ""
    auth_jwks_key_fingerprints: str = ""

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

    @model_validator(mode="after")
    def the_plaintext_jwks_host_is_listed_on_purpose(self) -> VoiceConfig:
        """A plaintext JWKS hop is fetched only from an explicitly-listed host (BUG-131).

        The API's verifier carries the same check with the same rule: `https://`
        always, loopback (no hop to read), and a plaintext internal host only
        when the operator has named it in `AUTH_JWKS_INTERNAL_HOSTS`. The
        compose tree passes one `AUTH_JWKS_URL` to both services, so one
        contract belongs to both.
        """
        parts = urlsplit(self.auth_jwks_url)
        if parts.scheme == "https":
            return self
        host = parts.hostname or ""
        if host.lower() in LOOPBACK_HOSTS:
            return self
        if host.lower() not in self.internal_hosts:
            raise ValueError(
                "AUTH_JWKS_URL is plaintext http and its host is not listed in "
                f"AUTH_JWKS_INTERNAL_HOSTS: {self.auth_jwks_url!r} "
                "(use https, or name the internal host)"
            )
        return self

    @property
    def internal_hosts(self) -> set[str]:
        """The hosts the operator has explicitly listed for a plaintext JWKS hop."""
        return {
            item.strip().lower()
            for item in self.auth_jwks_internal_hosts.split(",")
            if item.strip()
        }

    @property
    def pinned_fingerprints(self) -> set[str]:
        """The sha256 digests the JWKS's keys are allowed to carry (empty: unpinned)."""
        return {
            item.strip().lower()
            for item in self.auth_jwks_key_fingerprints.split(",")
            if item.strip()
        }
