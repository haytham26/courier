"""The intake's provider seam (ADR-013): the OmniRoute client on a fake
gateway, and the deterministic fake that runs when no gateway is configured.

The gateway itself is a FOUNDER_TODO (self-hosted, D25); these tests pin the
wire shape the gateway must speak and the honest failure paths: an unparseable
extraction is an error, never an invented manifest, and a phrasing failure
still produces a question the courier can answer.
"""

from __future__ import annotations

import base64
import json

import httpx
import pytest

from app.agents.omniroute import (
    FakeOmniRoute,
    OmniRouteError,
    OmniRouteProvider,
    OmniRouteSettings,
    ProviderUnavailableError,
    get_intake_provider,
)

SETTINGS = OmniRouteSettings(
    omniroute_base_url="http://gateway.test",
    omniroute_api_key="test-key",
    omniroute_model="test-model",
)


def a_gateway(handler: object) -> httpx.Client:
    return httpx.Client(transport=httpx.MockTransport(handler))  # type: ignore[arg-type]


def a_completion(content: str) -> httpx.Response:
    return httpx.Response(200, json={"choices": [{"message": {"content": content}}]})


class TestTheGatewayClient:
    def test_extract_parses_the_json_answer(self) -> None:
        answer = json.dumps(
            {
                "parcels": [
                    {"raw": "12 Riccarton Road Riccarton", "size_class": "small"},
                    {"raw": "8 Smith Street Papanui", "size_class": None},
                ]
            }
        )

        def handler(request: httpx.Request) -> httpx.Response:
            assert request.url.path == "/v1/chat/completions"
            assert request.headers["authorization"] == "Bearer test-key"
            return a_completion(answer)

        provider = OmniRouteProvider(SETTINGS, a_gateway(handler))

        parcels = provider.extract("voice", "12 Riccarton Road Riccarton")

        assert parcels == [
            {"raw": "12 Riccarton Road Riccarton", "size_class": "small"},
            {"raw": "8 Smith Street Papanui", "size_class": None},
        ]

    def test_extract_reads_json_wrapped_in_prose(self) -> None:
        answer = 'Here it is: {"parcels": [{"raw": "8 Smith Street Papanui"}]} - done.'

        provider = OmniRouteProvider(SETTINGS, a_gateway(lambda r: a_completion(answer)))

        assert provider.extract("ocr", "anything") == [
            {"raw": "8 Smith Street Papanui", "size_class": None}
        ]

    def test_extract_raises_on_a_gateway_error(self) -> None:
        provider = OmniRouteProvider(
            SETTINGS, a_gateway(lambda r: httpx.Response(500, text="boom"))
        )

        with pytest.raises(OmniRouteError):
            provider.extract("voice", "12 Riccarton Road")

    def test_extract_raises_on_an_unparseable_answer(self) -> None:
        """An invented manifest is worse than an honest error."""
        provider = OmniRouteProvider(SETTINGS, a_gateway(lambda r: a_completion("sorry!")))

        with pytest.raises(OmniRouteError):
            provider.extract("voice", "12 Riccarton Road")

    def test_phrase_speaks_the_model_line(self) -> None:
        provider = OmniRouteProvider(
            SETTINGS, a_gateway(lambda r: a_completion("Fourteen Smith: Redwood or Northwood?"))
        )

        assert provider.phrase("incomplete", "14 Smith") == (
            "Fourteen Smith: Redwood or Northwood?"
        )

    def test_phrase_falls_back_when_the_gateway_is_down(self) -> None:
        """The courier always gets a question: the flow must not die."""
        provider = OmniRouteProvider(
            SETTINGS, a_gateway(lambda r: httpx.Response(502, text="down"))
        )

        assert provider.phrase("ungeocodable", "12 Riccarton Road").startswith("Confirm ")

    def test_ocr_sends_the_image_and_returns_the_text(self) -> None:
        seen: dict[str, object] = {}

        def handler(request: httpx.Request) -> httpx.Response:
            body = json.loads(request.content)
            seen["body"] = body
            return a_completion("12 Riccarton Road Riccarton\n8 Smith Street Papanui")

        provider = OmniRouteProvider(SETTINGS, a_gateway(handler))

        text = provider.ocr(b"\xff\xd8\xff fake jpeg")

        assert text.splitlines() == ["12 Riccarton Road Riccarton", "8 Smith Street Papanui"]
        assert "image_url" in json.dumps(seen["body"])
        assert base64.b64encode(b"\xff\xd8\xff fake jpeg").decode() in json.dumps(seen["body"])


class TestTheDeterministicFake:
    def test_extract_is_one_parcel_per_non_empty_line(self) -> None:
        fake = FakeOmniRoute()

        parcels = fake.extract("voice", "12 Riccarton Road\n\n  8 Smith Street Papanui  \n")

        assert parcels == [
            {"raw": "12 Riccarton Road", "size_class": None},
            {"raw": "8 Smith Street Papanui", "size_class": None},
        ]

    def test_phrase_is_deterministic(self) -> None:
        fake = FakeOmniRoute()

        assert fake.phrase("ungeocodable", "12 Riccarton Road") == "Confirm 12 Riccarton Road?"

    def test_ocr_is_unavailable_without_a_configured_text(self) -> None:
        """The fake never invents a manifest from a photo."""
        with pytest.raises(ProviderUnavailableError):
            FakeOmniRoute().ocr(b"\xff\xd8\xff fake jpeg")

    def test_ocr_returns_the_configured_text_when_a_test_provides_one(self) -> None:
        fake = FakeOmniRoute(ocr_text="12 Riccarton Road Riccarton")

        assert fake.ocr(b"\xff\xd8\xff fake jpeg") == "12 Riccarton Road Riccarton"


class TestTheProviderSelection:
    def test_no_gateway_configured_means_the_fake(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("OMNIROUTE_BASE_URL", raising=False)
        monkeypatch.delenv("OMNIROUTE_API_KEY", raising=False)

        assert isinstance(get_intake_provider(), FakeOmniRoute)

    def test_a_configured_gateway_means_the_real_client(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("OMNIROUTE_BASE_URL", "http://gateway.test")
        monkeypatch.setenv("OMNIROUTE_API_KEY", "test-key")

        assert isinstance(get_intake_provider(), OmniRouteProvider)
