# ADR-018 — The billing providers: one fact shape, three signature rules, an idempotent ingest

- **Status:** accepted
- **Date:** 2026-10-26
- **Decides:** the provider side of D44 (the ingest the entitlement layer waits for)
- **Builds on:** ADR-017 (the entitlement layer, `SubscriptionRow`, `entitlement_of`), D44 (build for
  every source, the founder picks the mix), the payments squad's decisions (`docs/squads/payments/
decisions.md`: `stripe-node` and `stripe-mock` pinned, the RevenueCat-shaped store layer, the
  Play-Billing-first order)

## Context

ADR-017 built the entitlement layer and deliberately left the ingest unwritten: no provider client,
because Play needs a real app in a test track and Stripe needs the founder's keys. What the slice
_did_ promise was that the ingest could be written later without re-litigating two rules — idempotence
and monotonicity in the source's own time — and it now has to pay that promise.

The squad's research already decided the safety rules (2026-10-20, from the Stripe client's own
practice): reject a webhook when the signing secret is empty, use a constant default tolerance on the
signature timestamp, never treat a truncated body as a valid event, and dedupe on the event id in
_our_ handler with a unique index and a test. Those are the rules this ADR implements, once, in one
place no provider can bypass.

## Decision

### 1. One fact shape, and a verifier per source

`services/api/app/providers.py`:

- **`ProviderFact`** — what a provider tells us happened: the courier it concerns, the source, the
  source's own purchase/subscription id, the plan, the state, and the source's own timestamps
  (`renews_at`, `ends_at`). Nothing else: no provider payload leaks past the boundary.
- **`ProviderVerifier`** — one method, `verify(body, headers, secret) -> list[ProviderFact]`, and the
  signature rules below. `StripeVerifier` is the first implementation; the store verifiers (Play,
  App Store, through the RevenueCat-shaped layer) implement the same protocol.

### 2. The three signature rules, enforced once

1. **No secret, no signature.** An empty (or whitespace-only) signing secret is refused before any
   comparison, with the reason logged: a provider configured with no secret is a misconfiguration,
   not a permissive default.
2. **A constant tolerance, not a window per call.** The signature's timestamp must be within the
   configured tolerance (default 5 minutes) of now; the tolerance is one module constant with a
   test that it is actually constant, because a per-call window is how a replay becomes possible.
3. **A truncated body is not an event.** A body that fails its own signature (a truncated payload, a
   modified field, a missing header) is refused as a whole — never parsed into a partial fact.

### 3. The ingest is idempotent and monotonic, and the entitlement never moves backwards

`apply_facts` writes through the same `put_subscription` ADR-017 built: idempotent per courier, and a
correction is monotonic in the source's own `renews_at` (a stale replay is a no-op). A `revoked` fact
removes access, because the money went back. In-memory first, the SQL repo unchanged — the rules are
the ones the db tests already pin.

### 3b. The trust boundary, named

A verified webhook is **trusted to name the courier**: the signature proves the
provider sent the request, and the payload's `courier_id` then decides which
subscription the fact writes. That is the standard provider boundary (Stripe and
the stores both work this way), but it is a boundary, not a detail: a compromised
webhook secret can move any courier's entitlement, and the payload cannot choose
its own `source` (the verifier pins it) or its own ordering (the ingest is
monotonic). What narrows the boundary further — a purchase-id-to-courier
directory the fact is reconciled against — is the provider slice's work, and it is
named here rather than left implicit.

### 4. What is still the founder's

- **The live endpoints and the secrets.** `StripeVerifier` speaks the wire shape and is exercised
  against fixtures with locally-computed signatures (no network, no keys); the real endpoints,
  webhook secrets and the Play test track are FOUNDER_TODO switches.
- **The store verifiers.** Their protocol shape is defined here; their implementations ride the
  RevenueCat-shaped layer the squad chose.

## Consequences

- The entitlement layer can now be fed: one fact shape, one set of signature rules, one ingest.
- A replay, a truncated body, an empty secret and a stale fact are each refused for a stated reason,
  and each has a test — so a misconfigured deployment fails closed.
- The founder's launch choice stays a config switch: `BILLING_SOURCES` names the sources this
  deployment accepts, and an unaccepted source is refused at the boundary.

## Verification

- `services/api/tests/test_billing_providers.py`: the three signature rules (including the
  constant-tolerance property and the truncated body), the fact shape's coercion of a provider's
  payload, the idempotent and monotonic ingest, `revoked` removing access, an unaccepted source
  refused at the boundary, and the cross-courier isolation of the written row.
