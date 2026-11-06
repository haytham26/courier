"""The SSRF guard's tests (BUG-231, audit 2026-11-05 item 4c).

`safe_fetch()` is the one choke point for every server-side fetch: it
resolves the URL's host and refuses anything that does not resolve to PUBLIC
addresses (no private, loopback, link-local, reserved, multicast or
unspecified), and it re-checks on every redirect. The one exception is a
host the operator explicitly listed (`allowed_hosts`) - the compose
network's `auth` service for the JWKS hop (BUG-131), the self-hosted
gateway's host for OmniRoute.

DNS is faked in these tests by patching `app.safe_fetch._resolve`, so they
are hermetic; IP literals never reach DNS at all.
"""

from __future__ import annotations

import ipaddress
from typing import cast

import httpx
import pytest

from app.agents.omniroute import OmniRouteProvider, OmniRouteSettings
from app.auth.jwks import JwksVerifier
from app.safe_fetch import UnsafeFetchError, check_url, safe_fetch
from tests.auth.test_jwks import make_key_pair, make_settings, sign

PUBLIC = {"93.184.216.34"}
PRIVATE = {"172.29.0.20"}


def _fake_resolve(addresses: set[str]):
    """A resolver that maps every host NAME to `addresses` but passes IP
    literals through unchanged (as the real resolver does, without DNS)."""

    def resolve(host: str, port: int) -> set[str]:
        bare = host.strip("[]")
        try:
            ipaddress.ip_address(bare)
        except ValueError:
            return set(addresses)
        return {bare}

    return resolve


class _FakeClient:
    """An httpx.Client stand-in that answers from a script of responses."""

    def __init__(self, script: list[tuple[int, dict[str, str]]]) -> None:
        self.script = list(script)
        self.calls: list[str] = []

    def request(self, method: str, url: str, **kwargs: object) -> httpx.Response:
        self.calls.append(url)
        status, headers = self.script.pop(0)
        request = httpx.Request(method, url)
        return httpx.Response(status, headers=headers, request=request)


def test_only_http_and_https_are_fetched() -> None:
    for url in ("file:///etc/passwd", "ftp://example.com/x", "example.com/no-scheme", "gopher://x/"):
        with pytest.raises(UnsafeFetchError, match="http"):
            check_url(url)


def test_non_public_ip_literals_are_refused_without_dns() -> None:
    for url in (
        "http://169.254.169.254/latest/meta-data",
        "http://127.0.0.1:8000/healthz",
        "http://localhost:8000/healthz",
        "http://10.0.0.5/",
        "http://192.168.1.1/",
        "http://[::1]/",
        "http://0.0.0.0/",
        "http://224.0.0.1/",
    ):
        with pytest.raises(UnsafeFetchError, match="not a public address|no host"):
            check_url(url)


def test_a_host_resolving_to_a_private_address_is_refused(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.safe_fetch._resolve", _fake_resolve(PRIVATE))
    with pytest.raises(UnsafeFetchError, match="not a public address"):
        check_url("https://gateway.example/v1")


def test_a_host_resolving_to_public_addresses_is_allowed(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.safe_fetch._resolve", _fake_resolve(PUBLIC))
    check_url("https://gateway.example/v1")


def test_one_private_address_among_public_ones_is_refused(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.safe_fetch._resolve", _fake_resolve(PUBLIC | PRIVATE))
    with pytest.raises(UnsafeFetchError, match="not a public address"):
        check_url("https://gateway.example/v1")


def test_an_unresolving_host_is_refused(monkeypatch: pytest.MonkeyPatch) -> None:
    def boom(host: str, port: int) -> set[str]:
        raise OSError("name resolution failed")

    monkeypatch.setattr("app.safe_fetch._resolve", boom)
    with pytest.raises(UnsafeFetchError, match="does not resolve|resolved to nothing"):
        check_url("https://nonexistent.invalid/v1")


def test_an_operator_listed_host_is_allowed_despite_a_private_address(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("app.safe_fetch._resolve", _fake_resolve(PRIVATE))
    check_url("http://auth:3001/api/auth/jwks", allowed_hosts={"auth"})
    with pytest.raises(UnsafeFetchError):
        check_url("http://other:3001/api/auth/jwks", allowed_hosts={"auth"})


def test_a_redirect_is_rechecked_before_it_is_followed(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.safe_fetch._resolve", _fake_resolve(PUBLIC))
    client = _FakeClient([(302, {"location": "http://169.254.169.254/latest"})])
    with pytest.raises(UnsafeFetchError, match="not a public address"):
        safe_fetch(cast(httpx.Client, client), "GET", "https://gateway.example/v1")
    assert client.calls == ["https://gateway.example/v1"]


def test_a_redirect_to_a_public_address_is_followed(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.safe_fetch._resolve", _fake_resolve(PUBLIC))
    client = _FakeClient(
        [(302, {"location": "https://other.example/v2"}), (200, {})]
    )
    response = safe_fetch(cast(httpx.Client, client), "GET", "https://gateway.example/v1")
    assert response.status_code == 200
    assert client.calls == ["https://gateway.example/v1", "https://other.example/v2"]


def test_a_redirect_loop_is_refused(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.safe_fetch._resolve", _fake_resolve(PUBLIC))
    client = _FakeClient([(302, {"location": "https://gateway.example/loop"})] * 10)
    with pytest.raises(UnsafeFetchError, match="redirected more than"):
        safe_fetch(cast(httpx.Client, client), "GET", "https://gateway.example/v1", max_redirects=3)


def test_the_jwks_refresh_goes_through_safe_fetch(monkeypatch: pytest.MonkeyPatch) -> None:
    """The verifier's own fetch is guarded: a JWKS URL whose host resolves to
    a private address is refused before any HTTP happens (fail closed)."""
    monkeypatch.setattr("app.safe_fetch._resolve", _fake_resolve(PRIVATE))
    settings = make_settings(auth_jwks_url="https://jwks.example/api/auth/jwks")
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json={"keys": []}))
    verifier = JwksVerifier(settings, client=httpx.Client(transport=transport))
    key, _ = make_key_pair()
    token = sign(key, subject="driver-7")
    with pytest.raises(UnsafeFetchError):
        verifier.verify(token)


def test_the_jwks_internal_host_still_works_through_the_guard(monkeypatch: pytest.MonkeyPatch) -> None:
    """BUG-131's deliberate exception: a host the operator listed in
    AUTH_JWKS_INTERNAL_HOSTS resolves to a private compose IP and is allowed."""
    monkeypatch.setattr("app.safe_fetch._resolve", _fake_resolve(PRIVATE))
    key, jwk = make_key_pair()
    settings = make_settings(
        auth_jwks_url="http://auth:3001/api/auth/jwks",
        auth_jwks_internal_hosts="auth",
    )
    transport = httpx.MockTransport(
        lambda request: httpx.Response(200, json={"keys": [jwk]})
    )
    verifier = JwksVerifier(settings, client=httpx.Client(transport=transport))
    token = sign(key, subject="driver-7")
    assert verifier.verify(token).user_id == "driver-7"


def test_the_omniroute_chat_goes_through_safe_fetch() -> None:
    """The gateway call is guarded too: a private base URL is refused, and
    the refusal is NOT flattened into a generic gateway error."""
    settings = OmniRouteSettings(
        omniroute_base_url="https://10.9.9.9", omniroute_api_key="k"
    )
    provider = OmniRouteProvider(settings, client=httpx.Client())
    with pytest.raises(UnsafeFetchError):
        provider.extract("voice", "12 Colombo Street")
