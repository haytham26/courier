# Payments & Accounts Squad

**Mission:** Auth, entitlements, teams and NZD billing that never locks a driver mid-shift.

**Code:** `services/auth, services/api/app/billing (to be created)`

**Tasks:** T7.13 Stripe NZD, T7.14 team features

## Targets (the release gate)

- tenant isolation proven by tests
- webhook idempotency tested
- no driver locked mid-shift (grace period)
- POD and core voice never paywalled

## Evaluation dataset / benchmark

docs/squads/payments/eval/ (Stripe test-mode scenarios)

## Research

docs/research/2026/payments-subscriptions-stripe.md - V4 §3: >= 5-10 candidates compared, the decision and its fallback written down.

## Working agreement

1. The benchmark exists **before** the library is chosen.
2. Every change to the squad's code updates this directory: the status, the metric and the evidence link.
3. A regression in a target blocks the merge (Release Manager role, V4 §1).
4. Two independent review passes for the critical squads (auth, payments, sync, address, voice, routing).

## Files

- `STATUS.md` - done with evidence, metrics vs targets, next, risks.
- `research.md` - the 2026 research note for this niche (or a pointer to `docs/research/2026/`).
- `decisions.md` - the ADRs this squad owns.
- `benchmarks/` - the benchmark harness and its results.
