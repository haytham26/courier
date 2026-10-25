# ADR-017 — The entitlement layer: one truth per courier, gated on "is this subscription active"

- **Status:** accepted
- **Date:** 2026-10-26
- **Decides:** the backend half of D44 (the entitlement layer the app gates on)
- **Builds on:** D44 (build for every source, the founder picks the mix), the payments squad's research
  (`docs/research/2026/payments-subscriptions.md`: `stripe-node` + `stripe-mock`, the RevenueCat-shaped
  store layer, the webhook rules), ADR-010 (the 404 discipline), ADR-014 (the sync conflict rules),
  the ASVS rows (BUG-058)

## Context

D44 fixed the shape and left the mix: the launch customer is the individual contractor who pays for
themselves, the app gates on **"is this subscription active"** and never on _how it was paid_, and the
server accepts more than one source — store in-app purchase first, web checkout behind a switch, Team
org billing on top.

Before this ADR the app had a price list (`PRICING` in `packages/shared/src/constants.ts`) and the API
had no notion of a subscription at all: no table, no endpoint, no state. So the app could not answer
"may this courier do X today", and no later billing slice would have anywhere to stand.

The store rules are permanent constraints, not launch-window details: a digital subscription sold
inside the app uses the store's billing, New Zealand may not link to or promote a web price, and a web
sale is allowed _outside_ the app with those users signing in afterwards (Apple 3.1.3(b)). NZ GST is
inclusive, and **history is never recomputed** — the rate used is stored per invoice.

## Decision

### 1. One truth per courier, owned by the server

`services_api/app/entitlements.py` holds the vocabulary, the state machine and the decision:

- **Plans** — `trial` (14 days, everything a driver needs to see the value), `solo` (one driver), and
  `team` (one payer, several drivers; the org's seats are the Team slice, not this one). The plan's
  _entitlements_ are a named set (`FEATURES`), not a pile of booleans scattered through the code, and
  the app reads the set rather than compiling its own.
- **Subscription state** — `trialing → active → past_due → grace → canceled / expired`, with the
  transitions as one pure function (`transition(state, event)`) so the rules are testable without a
  payment provider. `past_due` **never** removes access on its own: a store renewal that failed keeps
  the courier working through the grace window, because a courier mid-route with a dead phone is the
  product's worst failure mode.
- **The decision** — `entitlement_of(courier_id) → Entitlement` answers `active` and the feature set,
  and the API exposes it as `GET /account/entitlements`. The phone never decides locally and never
  caches past the token: the entitlement is the server's word.

### 2. The source is recorded, never decided on

One subscription row per courier with the source's own identifiers beside the shared fields
(`packages/contracts/db/schema.sql`):

```sql
CREATE TABLE IF NOT EXISTS subscriptions (
    courier_id   uuid PRIMARY KEY REFERENCES couriers (id) ON DELETE CASCADE,
    plan         text        NOT NULL,
    state        text        NOT NULL,
    source       text        NOT NULL,          -- 'play' | 'appstore' | 'stripe' | 'team'
    source_id    text,                          -- the source's own purchase/subscription id
    started_at   timestamptz NOT NULL,
    renews_at    timestamptz,
    ends_at      timestamptz,                   -- when access actually stops
    updated_at   timestamptz NOT NULL DEFAULT now()
);
```

The source is **data, not logic**: `source` says where the truth came from and never changes what
"active" means. Sources 2 and 3 (Stripe, Team) are added behind `BILLING_SOURCES` (off by default)
when the founder switches them on — no new code path in the app.

### 3. The ingest is idempotent and the clock is trusted only as far as the source's clock

The provider layer (not written here) posts **facts** — "the store says subscription X is active
through 2026-11-01" — and the repo stores them. Two rules the repo enforces so the ingest can be
written later without re-litigating them:

- **Idempotent by (source, source_id)** with the sync path's ON CONFLICT semantics (ADR-014), because
  a provider retries and the gateway duplicates.
- **The source's own timestamps win**, and a fact whose `renews_at` is far in the past cannot silently
  end a subscription (a clock bug is not a cancellation).

### 4. What is deliberately NOT in this slice

- **No provider client** (Play Billing, StoreKit, Stripe). Play needs a real app in a test track;
  Stripe needs keys. Both are FOUNDER_TODO switches with `stripe-mock` tests when they land.
- **No paywall UI** — that is the lead's app surface; it reads this endpoint.
- **No Team org billing, seats or invoices** — the Team slice, on top of this one.
- **No NZ GST calculation** — the launch price is GST-inclusive and the number is a founder decision;
  the per-invoice rate storage rule is recorded here so the invoice slice stores rather than recomputes.

## Consequences

- The app can ask one question of one endpoint, and a courier whose card is failing still finishes the
  day (the grace window).
- Any future source is a new row, not a new code path; the gates the app reads do not move.
- The founder's launch decision is a config switch (`BILLING_SOURCES`), not a code change.
- **Honestly unverified until the founder's keys exist:** no provider has ever been talked to, so the
  ingest path is _designed_ here, not exercised. That claim belongs to the provider slice, and it says
  so in the code.

## Verification

- `services/api/tests/test_entitlements.py`: the plan vocabulary and its feature sets, the state
  machine (every transition, including the grace window and the expired renewal), the decision's
  answer for each state, the cross-courier isolation of `GET /account/entitlements`, and the schema
  round-trip through the `db`-marked suite (idempotent by (source, source_id), the source's
  timestamps winning, a stale `renews_at` not ending a subscription).
- The contract drift guard covers the new path.
