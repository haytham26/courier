"""The Stripe side of D44: one NZD price per paid plan, the sessions that sell
them, and the webhook shapes translated into this API's facts.

D44's decision (ADR-031 / D68): the founder's billing provider is **Stripe in
NZD, test mode until the founder swaps the keys**. The entitlement layer's rules
live in `app/entitlements.py` and never mention a provider; this module is the
only place that does, and it holds three things:

1. **the price catalogue** - which Stripe price id sells which plan, in NZD per
   month. The trial is not sold (it is granted by `entitlements`), and a plan
   with no configured price is a stated refusal rather than a guess;
2. **the sessions** - the Checkout Session that starts a subscription and the
   portal Session that manages one, both created against Stripe with the
   caller's own courier id as the reference, so the webhook says WHO paid;
3. **the translation** - Stripe's real event shapes
   (`checkout.session.completed`, `customer.subscription.updated/deleted`,
   `invoice.payment_failed`) as this API's one fact shape, which `app.providers`
   verifies and ingests. The signature is checked first (ADR-018), so nothing
   here trusts a payload's own claim.

Stripe speaks form-encoded HTTP with a bearer key; there is no SDK dependency,
for the same reason the rest of the API calls out through httpx. The keys and
the price ids are the founder's switches in the environment - a deployment with
no key refuses, and `docs/status/FOUNDER_TODO.md` names the test-mode values.
"""

from __future__ import annotations

import os
from datetime import UTC, datetime
from typing import Any

import httpx

from .entitlements import Plan, SubscriptionState
from .providers import ProviderFact

STRIPE_API = "https://api.stripe.com"
"""Stripe's API root (the test-mode and live-mode keys select the mode, not the URL)."""

CURRENCY = "nzd"
"""D44: the founder's launch currency is New Zealand dollars."""

INTERVAL = "month"
"""The subscription interval: the app prices per month (D44)."""

#: The env var each plan's price id comes from. The trial has none: it is
#: granted by the entitlement layer, never sold.
PRICE_ENV: dict[Plan, str] = {
    Plan.SOLO: "STRIPE_PRICE_SOLO",
    Plan.TEAM: "STRIPE_PRICE_TEAM",
}

#: What a plan costs in the founder's launch currency, for the docs and the
#: contract's description (the AUTHORITATIVE number is Stripe's own price).
LIST_PRICE_NZD: dict[Plan, str] = {Plan.SOLO: "19.00", Plan.TEAM: "39.00"}


def price_env_of(plan: Plan) -> str:
    """The env var holding this plan's Stripe price id."""
    try:
        return PRICE_ENV[plan]
    except KeyError as error:
        raise ValueError(
            f"the {plan.value} plan is not sold: it is granted by the entitlement layer"
        ) from error


def price_of(plan: Plan) -> str:
    """The Stripe price id for a plan, read from the environment.

    A plan the deployment has no price for is refused: selling it would be a
    guess at what the founder configured in Stripe's dashboard."""
    name = price_env_of(plan)
    value = os.getenv(name, "").strip()
    if not value:
        raise ValueError(
            f"{name} is not set: the {plan.value} plan has no Stripe price to sell "
            "(the founder's switch, see docs/status/FOUNDER_TODO.md)"
        )
    return value


def plan_of_price(price_id: str) -> Plan | None:
    """The plan a Stripe price id sells, or `None` when the catalogue has no such price."""
    cleaned = (price_id or "").strip()
    if not cleaned:
        return None
    for plan, name in PRICE_ENV.items():
        if os.getenv(name, "").strip() == cleaned:
            return plan
    return None


def secret_key() -> str:
    """Stripe's secret key, read from the environment without a default.

    An empty answer is a stated refusal (the same rule as the webhook secret):
    a deployment with no key sells nothing rather than calling the wrong host."""
    return os.getenv("STRIPE_SECRET_KEY", "").strip()


def require_key() -> str:
    """Stripe's secret key, or a stated refusal.

    Split out so a deployment with no key refuses BEFORE any transport runs:
    the tests replace the transport, and a misconfigured deployment must still
    say so."""
    key = secret_key()
    if not key:
        raise ValueError(
            "STRIPE_SECRET_KEY is not set: Stripe is the founder's switch "
            "(see docs/status/FOUNDER_TODO.md)"
        )
    return key


def _post(path: str, data: dict[str, str]) -> dict[str, Any]:
    """POST a form-encoded request to Stripe and answer its JSON.

    Split out as one function so the tests drive the translation and the
    refusals without a network: they replace this with a recorder."""
    key = require_key()
    with httpx.Client(timeout=20.0, base_url=STRIPE_API) as client:
        response = client.post(path, data=data, headers={"Authorization": f"Bearer {key}"})
    if response.status_code != 200:
        detail = response.text[:200] if response.text else ""
        raise ValueError(f"stripe answered HTTP {response.status_code}: {detail}")
    document = response.json()
    if not isinstance(document, dict):
        # A 200 that is not an object is a malformed answer from the provider,
        # not a caller error: refuse it as a ValueError the endpoints turn into a 400.
        raise ValueError("stripe answered something that is not an object")  # noqa: TRY004 (#281: D44)
    return document


def absolute(base_url: str, path: str) -> str:
    """An absolute URL from the caller's own base (never a guess at the origin)."""
    base = base_url.rstrip("/")
    if not base.startswith("http://") and not base.startswith("https://"):
        raise ValueError("the return base must be an absolute http(s) URL")
    return f"{base}/{path.lstrip('/')}"


def checkout_session_url(
    courier_id: str, plan: Plan, base_url: str, price: str | None = None
) -> str:
    """The Stripe Checkout Session URL that sells `plan` to `courier_id`.

    The courier id rides in `client_reference_id` - the one field Stripe returns
    untouched in the completed session - so the webhook that follows says WHO
    paid without this API trusting a client's claim. The success and cancel
    URLs are the caller's own base: a redirect to a host we do not serve is a
    phishing vector, not a convenience."""
    if not courier_id or not courier_id.strip():
        raise ValueError("the courier id is required: a session without a reference cannot be matched")
    require_key()
    price = price or price_of(plan)
    session = _post(
        "/v1/checkout/sessions",
        {
            "mode": "subscription",
            "client_reference_id": courier_id,
            "line_items[0][price]": price,
            "line_items[0][quantity]": "1",
            "success_url": absolute(base_url, "/billing/stripe/return?session={CHECKOUT_SESSION_ID}"),
            "cancel_url": absolute(base_url, "/billing/stripe/cancelled"),
        },
    )
    url = session.get("url")
    if not isinstance(url, str) or not url.startswith("https://"):
        raise ValueError("stripe answered a session with no https url")
    return url


def portal_session_url(courier_id: str, base_url: str, customer: str | None = None) -> str:
    """The Stripe portal Session URL where the courier manages or cancels.

    The customer id is recorded on the subscription by the webhook that follows
    the checkout; a caller who has none is refused here rather than silently
    opening a portal for whoever's session the key last saw."""
    if not courier_id or not courier_id.strip():
        raise ValueError("the courier id is required")
    if not customer or not customer.strip():
        raise ValueError(
            "no Stripe customer is recorded for this courier: the portal opens on the "
            "subscription's own customer, not a guess"
        )
    require_key()
    session = _post(
        "/v1/billing_portal/sessions",
        {"customer": customer, "return_url": absolute(base_url, "/account/billing")},
    )
    url = session.get("url")
    if not isinstance(url, str) or not url.startswith("https://"):
        raise ValueError("stripe answered a portal session with no https url")
    return url


#: The Stripe event types this deployment applies (anything else is a refusal,
#: not a half-answer).
APPLIED_EVENTS = frozenset(
    {
        "checkout.session.completed",
        "customer.subscription.updated",
        "customer.subscription.deleted",
        "invoice.payment_failed",
    }
)

# --- the webhook shapes ------------------------------------------------------


def _iso(raw: object) -> str | None:
    if raw is None or raw == "":
        return None
    return str(raw)


def _aware(raw: object) -> datetime:
    """A Stripe timestamp as an aware datetime.

    Stripe sends Unix SECONDS - an integer, not ISO-8601 - and the monotonic
    guard and the entitlement's `ends_at` both mix aware datetimes, so a naive
    or unreadable value must raise rather than mis-answer. An ISO string is
    accepted too, because the fixtures and the app's own replay tests write it
    that way."""
    if isinstance(raw, bool):
        # A bool IS an int in Python, so it would read as epoch second 0:
        # refuse it rather than answering 1970.
        raise ValueError("the timestamp is not a time")  # noqa: TRY004 (#281: D44)
    if isinstance(raw, int):
        return datetime.fromtimestamp(raw, UTC)
    text = str(raw)
    try:
        value = datetime.fromisoformat(text)
    except ValueError as error:
        try:
            return datetime.fromtimestamp(int(text), UTC)
        except (TypeError, ValueError):
            raise ValueError(f"the timestamp {text!r} is neither epoch seconds nor ISO") from error
    if value.tzinfo is None:
        raise ValueError(f"the timestamp {text} carries no timezone")
    return value


def _state_of(stripe_status: str) -> SubscriptionState:
    """Stripe's subscription status as the entitlement layer's own state."""
    mapping = {
        "active": SubscriptionState.ACTIVE,
        "trialing": SubscriptionState.ACTIVE,
        "past_due": SubscriptionState.PAST_DUE,
        "unpaid": SubscriptionState.PAST_DUE,
        "canceled": SubscriptionState.CANCELED,
        "incomplete": SubscriptionState.CANCELED,
        "incomplete_expired": SubscriptionState.CANCELED,
        "paused": SubscriptionState.PAST_DUE,
    }
    state = mapping.get(stripe_status)
    if state is None:
        raise ValueError(f"the subscription status {stripe_status!r} has no entitlement state")
    return state


def _price_id_from_lines(lines: list[dict[str, Any]]) -> str:
    """The first line's price id, or an empty string when there are no lines."""
    if not lines:
        return ""
    price = lines[0].get("price") or {}
    return str(price.get("id") or "").strip()


def _plan_or_refuse(price_id: str, what: str) -> Plan:
    plan = plan_of_price(price_id)
    if plan is None:
        raise ValueError(f"the {what} names a price this deployment does not sell: {price_id or 'none'}")
    return plan


def fact_from_stripe_webhook(event: dict[str, Any], source: str = "stripe") -> ProviderFact:
    """A Stripe-shaped event as this API's one fact.

    The shapes Stripe actually sends, mapped onto the canonical fact
    `app.providers` ingests:

    - `checkout.session.completed` - the courier paid: ACTIVE from now, renewing
      when Stripe says the period ends, the plan from the SESSION's price id
      (never from a payload field a client could write);
    - `customer.subscription.updated` / `deleted` - the plan and the state as
      Stripe reports them;
    - `invoice.payment_failed` - PAST_DUE, which the entitlement layer already
      treats as LIVE (ADR-017 §1: a courier mid-route is the worst failure mode
      this product has).

    Anything else is a refusal rather than a half-answer: a webhook we cannot
    translate is a webhook we must not half-apply.
    """
    kind = str(event.get("type") or "")
    if kind not in APPLIED_EVENTS:
        # The event's KIND is what makes it applicable, so it is answered first:
        # a `payment_intent.succeeded` is not a fact this deployment applies
        # whatever else it carries.
        raise ValueError(f"the {kind} event is not a fact this deployment applies")  # pragma: no cover
    obj = (event.get("data") or {}).get("object") or {}
    courier_id = str(obj.get("client_reference_id") or "")
    if not courier_id:
        raise ValueError("the event names no courier: nothing to apply it to")

    if kind == "checkout.session.completed":
        lines = ((obj.get("line_items") or {}).get("data")) or []
        price_id = _price_id_from_lines(lines)
        plan = _plan_or_refuse(price_id, "checkout session")
        started = _iso(obj.get("created")) or _iso(event.get("created"))
        if not started:
            raise ValueError("the checkout session carries no start")
        return ProviderFact(
            courier_id=courier_id,
            source=source,
            purchase_id=str(obj.get("subscription") or obj.get("id") or ""),
            plan=plan,
            state=SubscriptionState.ACTIVE,
            started_at=_aware(str(started)),
            renews_at=_aware(str(_iso(obj.get("current_period_end"))))
            if obj.get("current_period_end")
            else None,
        )

    if kind in ("customer.subscription.updated", "customer.subscription.deleted"):
        lines = (obj.get("items") or {}).get("data") or []
        price_id = _price_id_from_lines(lines)
        plan = _plan_or_refuse(price_id, "subscription")
        started = _iso(obj.get("start_date")) or _iso(obj.get("created")) or _iso(event.get("created"))
        if not started:
            raise ValueError(f"the {kind} event carries no start")
        return ProviderFact(
            courier_id=courier_id,
            source=source,
            purchase_id=str(obj.get("id") or ""),
            plan=plan,
            state=_state_of(str(obj.get("status") or "")),
            started_at=_aware(str(started)),
            renews_at=_aware(str(obj["current_period_end"])) if obj.get("current_period_end") else None,
            ends_at=_aware(str(obj["ended_at"]))
            if obj.get("ended_at")
            else (_aware(str(obj["canceled_at"])) if obj.get("canceled_at") else None),
        )

    if kind == "invoice.payment_failed":
        lines = (obj.get("lines") or {}).get("data") or []
        price_id = _price_id_from_lines(lines)
        plan = _plan_or_refuse(price_id, "failed invoice")
        started = _iso(obj.get("created")) or _iso(event.get("created"))
        if not started:
            raise ValueError("the failed invoice carries no start")
        return ProviderFact(
            courier_id=courier_id,
            source=source,
            purchase_id=str(obj.get("subscription") or obj.get("id") or ""),
            plan=plan,
            state=SubscriptionState.PAST_DUE,
            started_at=_aware(str(started)),
        )

    raise ValueError(f"the {kind or 'unknown'} event is not a fact this deployment applies")
