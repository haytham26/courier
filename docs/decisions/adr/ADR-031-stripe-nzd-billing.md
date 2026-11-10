# ADR-031 — The Stripe NZD billing lane (D44): the price catalogue, the sessions, and the webhook translation

**Date:** 2026-11-10 · **Status:** Accepted · **Deciders:** backend squad, per founder
decision D44 ("Stripe NZD test mode, built on `entitlements.py`") · **Extends:**
ADR-017 (the entitlement rules), ADR-018 (the provider ingest), D44 in DECISIONS.md.

## Context

The entitlement layer (`app/entitlements.py`) decides when a courier may work and
never mentions a payment provider: `source` is a value on the row, so the
founder's launch choice is a config switch rather than a code change (D44). The
provider layer (`app/providers.py`) verifies a webhook's signature once, no
matter which provider sent it, and turns it into the one fact shape the
entitlement layer ingests (`ProviderFact`), with the monotonic, idempotent put
underneath. What was missing was the half that knows the PROVIDER: which Stripe
price sells which plan, the sessions that sell them, and the translation of
Stripe's real event shapes into that fact.

## Decision

1. **Stripe in New Zealand dollars, test mode until the founder swaps the keys.**
   `services/api/app/stripe_nz.py` is the only module that knows Stripe's field
   names. It holds the price catalogue (`STRIPE_PRICE_SOLO` /
   `STRIPE_PRICE_TEAM` — the trial is granted by `entitlements`, never sold), the
   two session endpoints, and the webhook translation.
2. **The app prices the plans (`trial` / `solo` / `team`), Stripe prices the paid
   two.** A plan with no configured price is a stated refusal, not a guess: a
   deployment that half-sells is worse than one that clearly does not.
3. **The courier id rides in Stripe's `client_reference_id`.** The Checkout
   Session carries it, the completed session returns it untouched, and the
   webhook's fact is built from THAT — never from a field a client could write.
   The webhook's payload is already signature-verified before any of this runs
   (ADR-018), so the translation trusts the bytes, not the claim.
4. **The two endpoints are `/v1/billing/checkout-session` and
   `/v1/billing/portal-session`** (both bearer-authenticated, both rate-limited
   at 10/minute because a Stripe call costs the deployment money): the Checkout
   Session sells one plan to the token's own courier; the portal Session opens on
   the subscription's own recorded customer, so a caller with none has nothing to
   manage. The return URLs come from the caller's own `return_base` and must be
   absolute https: a redirect to a host we do not serve is a phishing vector.
5. **Stripe's real events map onto the entitlement layer's own states:**
   `checkout.session.completed` → ACTIVE with the period's end as `renews_at`;
   `customer.subscription.updated` / `deleted` → the plan from the SUBSCRIPTION's
   price and Stripe's status mapped onto `active` / `past_due` / `canceled`;
   `invoice.payment_failed` → PAST_DUE, which the entitlement layer already
   treats as LIVE (ADR-017 §1: a courier mid-route with a dead phone is the worst
   failure mode this product has). Anything else is a refusal rather than a
   half-answer.
6. **No SDK dependency.** Stripe speaks form-encoded HTTP with a bearer key; the
   module calls it through httpx like every other outbound caller, with the
   transport behind one function the tests replace (17 tests, no network, no key).

## Consequences

- `services/api/app/providers.py` recognises Stripe's own webhook shapes and
  delegates them here (the late import is the one genuine cycle, named on its
  line). The canonical fixture shape the store verifiers will share keeps
  working: both shapes are covered by tests.
- `packages/contracts/openapi.yaml` declares both endpoints (the app's typed
  client is generated from it, and `tests/test_contract.py` fails on an
  undeclared route).
- The founder's switches are `STRIPE_SECRET_KEY`, `STRIPE_PRICE_SOLO`,
  `STRIPE_PRICE_TEAM` in the environment (the webhook secret was already
  `BILLING_WEBHOOK_SECRET_STRIPE`): the test-mode values are named in
  `docs/status/FOUNDER_TODO.md`, and a deployment with none refuses clearly.
- The LIVE lane (a real key, the live prices, and the founder's Stripe account
  verification) stays the founder's: this is the app's half of D44, and the
  end-to-end test-mode purchase is the acceptance step once the keys exist.
