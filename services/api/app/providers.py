"""The billing providers (ADR-018): one fact shape, three signature rules, an ingest.

A provider tells us *what happened*, never *what it means*: the fact arrives, the
ingest writes it through the entitlement layer's `put_subscription`, and the
decision is ADR-017's. The signature rules from the payments squad's decisions
are enforced once here, so no provider can bypass them: no secret, no comparison;
a constant tolerance, not a per-call window; and a truncated body is not an event.

Every refusal is a `ValueError` the endpoint turns into a 400: an out-of-range
timestamp, a non-ASCII signature header and a body without a timezone each fail
closed rather than 500 on an unauthenticated endpoint.

The live endpoints and the secrets are the founder's switches; the verifiers are
exercised against fixtures with locally-computed signatures.
"""

from __future__ import annotations

import hashlib
import hmac
import json
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Protocol

from .billing import billing_sources, webhook_secret
from .entitlements import Plan, SubscriptionState
from .repo import SubscriptionRow

#: The signature's tolerance, in seconds. A constant, not a per-call parameter:
#: a per-call window is how a replay becomes possible (the squad's rule).
SIGNATURE_TOLERANCE = 300


@dataclass(frozen=True)
class ProviderFact:
    """What a provider said happened to one courier's subscription."""

    courier_id: str
    source: str
    purchase_id: str
    plan: Plan
    state: SubscriptionState
    started_at: datetime
    renews_at: datetime | None = None
    ends_at: datetime | None = None


class ProviderVerifier(Protocol):
    """The one thing a source must do: turn its request into facts."""

    source: str

    def verify(self, body: bytes, headers: dict[str, str], secret: str) -> list[ProviderFact]:
        """The facts the request carries, or a `ValueError` saying why not."""
        ...


def _headers_of(headers: dict[str, str]) -> dict[str, str]:
    """The headers, keyed lowercase: HTTP delivers whatever case it chooses."""
    return dict((key.lower(), value) for key, value in headers.items())


def _timestamp_of(headers: dict[str, str]) -> int:
    raw = _headers_of(headers).get("x-signature-timestamp", "").strip()
    if not raw:
        raise ValueError("the signature timestamp header is missing")
    try:
        return int(raw)
    except ValueError as error:
        raise ValueError("the signature timestamp is not a number") from error


def _age_seconds(timestamp: int) -> float:
    """How old the signature is; an impossible timestamp is a refusal, not a crash."""
    try:
        signed_at = datetime.fromtimestamp(timestamp, UTC)
    except (OverflowError, OSError, ValueError) as error:
        # An out-of-range timestamp reaches here before any secret is known, on
        # an unauthenticated endpoint: refuse it, never 500.
        raise ValueError("the signature timestamp is out of range") from error
    return (datetime.now(UTC) - signed_at).total_seconds()


def _signed_payload(body: bytes, timestamp: int) -> bytes:
    return f"{timestamp}.{body.decode('utf-8')}".encode()


def _expected_signature(secret: str, payload: bytes) -> str:
    digest = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


class StripeVerifier:
    """The webhook verifier for the OpenAI-shaped provider (Stripe and friends).

    The signature is an HMAC over `timestamp.body`, and the three rules the squad
    took from the Stripe client are enforced before the payload is ever parsed."""

    def __init__(self, source: str = "stripe") -> None:
        self.source = source

    def verify(self, body: bytes, headers: dict[str, str], secret: str) -> list[ProviderFact]:
        secret = (secret or "").strip()
        if not secret:
            # A provider configured with no secret is a misconfiguration, not a
            # permissive default: refuse before any comparison.
            raise ValueError("no signing secret: the provider is misconfigured")
        timestamp = _timestamp_of(headers)
        age = _age_seconds(timestamp)
        if abs(age) > SIGNATURE_TOLERANCE:
            raise ValueError(
                f"the signature is outside the tolerance ({SIGNATURE_TOLERANCE}s): a replay"
            )
        expected = _expected_signature(secret, _signed_payload(body, timestamp))
        provided = _headers_of(headers).get("x-signature", "")
        try:
            matches = hmac.compare_digest(expected, provided)
        except TypeError as error:
            # Headers arrive latin-1 decoded, so a non-ASCII signature is a valid
            # request on an unauthenticated endpoint: refuse it, never 500.
            raise ValueError("the signature is not comparable text") from error
        if not matches:
            raise ValueError("the signature does not match")
        # A truncated or modified body never reaches this line: the signature is
        # over the exact bytes, so a body that fails it is not an event at all.
        try:
            event = json.loads(body)
        except ValueError as error:
            raise ValueError("the body is not JSON") from error
        return [fact_from_stripe_event(event, self.source)]


def _aware_time(raw: str) -> datetime:
    """An ISO timestamp required to carry its offset (the repo compares them)."""
    value = datetime.fromisoformat(raw)
    if value.tzinfo is None:
        raise ValueError(f"the timestamp {raw} carries no timezone")
    return value


def _optional_time(raw: object) -> datetime | None:
    if raw is None or raw == "":
        return None
    return _aware_time(str(raw))


def fact_from_stripe_event(event: dict[str, Any], source: str = "stripe") -> ProviderFact:
    """One provider event as a fact (the wire shape both providers share).

    `source` is the source this event was *verified* under, never the payload's
    own claim: a webhook signed by Stripe cannot name itself `appstore` and have
    the row believe it. Every timestamp must carry its offset, because the
    monotonic guard and the entitlement's `ends_at` both mix aware datetimes and
    a naive one would raise rather than mis-answer.
    """
    purchase = event.get("purchase") or {}
    try:
        return ProviderFact(
            courier_id=str(event["courier_id"]),
            source=source,
            purchase_id=str(purchase["id"]),
            plan=Plan(str(purchase["plan"])),
            state=SubscriptionState(str(purchase["state"])),
            started_at=_aware_time(str(purchase["started_at"])),
            renews_at=_optional_time(purchase.get("renews_at")),
            ends_at=_optional_time(purchase.get("ends_at")),
        )
    except (KeyError, TypeError, ValueError) as error:
        raise ValueError(f"the event does not carry a fact: {error}") from error


#: The sources this API can verify, by the name a webhook URL carries. The store
#: verifiers join it when they are built (ADR-018 section 4).
VERIFIERS: dict[str, ProviderVerifier] = {"stripe": StripeVerifier(source="stripe")}


def webhook_secret_for(source: str) -> str:
    """The source's signing secret, read from the environment without a default.

    A provider configured without its secret is refused by the verifier's own
    rule (ADR-018 section 2), so an empty string here is a stated refusal."""
    return webhook_secret(source)


def accepted_sources(configured: str | None) -> set[str]:
    """The sources this deployment accepts (BILLING_SOURCES)."""
    if not configured:
        return set()
    return {item.strip() for item in configured.split(",") if item.strip()}


def apply_facts(
    repo: Any,
    facts: list[ProviderFact],
    accepted: frozenset[str] | set[str] | None = None,
) -> bool:
    """Write the facts through the entitlement layer's monotonic, idempotent put.

    Returns whether the subscription is new. One webhook is one fact: a batch is
    not the wire shape, and silently dropping the tail is how a fact disappears.
    A source the deployment does not accept is refused at the boundary, and the
    fact never reaches the repo.
    """
    if not facts:
        return False
    if len(facts) > 1:
        raise ValueError("a webhook carries one fact, not a batch")
    # With no explicit list, the deployment's own settings decide - a caller who
    # forgets the argument must not silently accept a source the founder did not.
    allowed = accepted if accepted is not None else set(billing_sources())
    fact = facts[0]
    if fact.source not in allowed:
        raise ValueError(f"the {fact.source} source is not accepted by this deployment")
    existed = repo.get_subscription(fact.courier_id) is not None
    # Always put the fact: whether it is a correction or a stale replay is
    # `put_subscription`'s monotonic decision (ADR-017 section 3), and this
    # layer must not re-put the stored row and lose the provider's news.
    repo.put_subscription(_row_of(fact))
    return not existed


def _row_of(fact: ProviderFact) -> SubscriptionRow:
    """The entitlement layer's row for a fact."""
    return SubscriptionRow(
        courier_id=fact.courier_id,
        plan=fact.plan,
        state=fact.state,
        source=fact.source,
        source_id=fact.purchase_id,
        started_at=fact.started_at,
        renews_at=fact.renews_at,
        ends_at=fact.ends_at,
    )
