"""The SSRF guard for every server-side fetch (audit 2026-11-05 item 4c, BUG-231).

There is no maintained Python SSRF library (research §2: PwnSSRF dead 2021,
safeurl-python archived 2024), so the guard is ours: one shared
`safe_fetch()` that every server-side HTTP call goes through, so no endpoint
can be turned into a proxy into our own network.

The rule: the URL must be http/https with a host, the host must RESOLVE, and
every address it resolves to must be PUBLIC - private, loopback, link-local,
reserved, multicast and unspecified addresses are all refused, including
IP literals (checked without DNS) and one private record hiding among public
ones. Redirects are re-checked before they are followed (httpx does not follow
them itself here, so each hop passes `check_url` again).

The one deliberate exception is a host the operator explicitly listed in
`allowed_hosts`: the compose network's `auth` service for the JWKS hop
(BUG-131 - it resolves to a private compose IP on purpose) and the
self-hosted gateway's host for OmniRoute (`OMNIROUTE_INTERNAL_HOSTS`). A
listed host is a named decision, not an accident.

`UnsafeFetchError` deliberately does NOT subclass ValueError, so the existing
"cannot reach the endpoint" wrappers (jwks verify, omniroute chat) do not
flatten a refused fetch into a generic failure: the refusal propagates and
fails closed, loudly, in the log.

Not done (a follow-up, recorded here so it is a decision not an oversight):
the resolved address is checked, not pinned - connecting by IP while keeping
TLS SNI/Host needs a custom transport, and every call here re-resolves, so a
rebinding answer is caught on the next call and on every redirect.
"""

from __future__ import annotations

import ipaddress
import socket
from typing import Any
from urllib.parse import urljoin, urlsplit

import httpx


class UnsafeFetchError(Exception):
    """The URL (or a redirect target) is not safe to fetch: non-http scheme,
    no host, unresolvable, or resolving to a non-public address."""


#: How many redirects one safe_fetch follows at most (each is re-checked).
MAX_REDIRECTS = 5


def _resolve(host: str, port: int) -> set[str]:
    """Every address the host resolves to right now (patched in the tests)."""
    infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    addresses: set[str] = set()
    for info in infos:
        raw = info[4][0]
        if isinstance(raw, str):
            addresses.add(raw)
    return addresses


def _is_public(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    return not (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_multicast
        or ip.is_unspecified
    )


def check_url(url: str, allowed_hosts: set[str] | frozenset[str] = frozenset()) -> None:
    """Raise UnsafeFetchError unless `url` is http(s) and resolves to public
    addresses only - or its host is operator-listed in `allowed_hosts`."""
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https"):
        raise UnsafeFetchError(
            f"refusing a {parts.scheme or 'schemeless'} URL: {url!r} - only http/https is fetched"
        )
    host = (parts.hostname or "").strip().lower().rstrip(".")
    if not host:
        raise UnsafeFetchError(f"the URL has no host: {url!r}")
    if host in allowed_hosts:
        return
    port = parts.port or (443 if parts.scheme == "https" else 80)
    try:
        addresses = _resolve(host, port)
    except OSError as error:
        raise UnsafeFetchError(f"the host {host!r} does not resolve: {error}") from error
    if not addresses:
        raise UnsafeFetchError(f"the host {host!r} resolved to nothing")
    for raw in sorted(addresses):
        ip = ipaddress.ip_address(raw)
        if not _is_public(ip):
            raise UnsafeFetchError(
                f"{host!r} resolves to {ip}, which is not a public address - refused (SSRF guard)"
            )


def safe_fetch(
    client: httpx.Client,
    method: str,
    url: str,
    *,
    allowed_hosts: set[str] | frozenset[str] = frozenset(),
    max_redirects: int = MAX_REDIRECTS,
    **kwargs: Any,
) -> httpx.Response:
    """client.request with the SSRF guard on every hop: the initial URL and
    every redirect target pass `check_url` before the request is sent.

    httpx is told `follow_redirects=False` so no redirect can slip past the
    check inside the client; the loop below follows them one at a time.
    """
    current = url
    for _ in range(max_redirects + 1):
        check_url(current, allowed_hosts)
        response = client.request(method, current, follow_redirects=False, **kwargs)
        location = response.headers.get("location")
        if response.is_redirect and location:
            current = urljoin(current, location)
            continue
        return response
    raise UnsafeFetchError(f"{url!r} redirected more than {max_redirects} times")
