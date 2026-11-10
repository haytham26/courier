# ADR-032 — The cost guard: the budget before the paid call (COST_PLAN's ميزانيات)

**Date:** 2026-11-10 · **Status:** Accepted · **Deciders:** backend squad, per the
founder's 2026-11-08 directive item 4 ("P6/P7 ... a cost guard") · **Extends:** D44
(Stripe NZD), D25 (OmniRoute, the LLM gateway), ADR-017 (the entitlement rules).

## Context

COST_PLAN's budget rule, verbatim: **a virtual key per courier with a daily and a
monthly `max_budget`, a budget per tenant, and a global cap with an alert — and on
reaching the limit the budget falls back to a cheaper cascade and then to the
offline grammar with a spoken warning, never cutting a courier off mid-shift.**

D12 already says the same: the paid providers are the deterministic fallback, and
a failure never strands the driver. What the API had was neither: the two LLM
calls the intake graph makes (`extract`, `phrase`, plus the manifest's `ocr`) went
straight to the gateway with no accounting, so a runaway loop - or a founder
surprise at the end of the month - was a bill, not an event.

## Decision

1. **`services/api/app/cost_guard.py` is the decider, and it is pure.** Four
   windows (the courier's daily and monthly budgets, the tenant's daily budget,
   the deployment's daily cap), the estimate from the characters of the call at
   ~4 characters per token, and a verdict that names WHICH window is spent. A
   window that is not configured is unbounded, not zero - the deployment says it
   has no ceiling rather than pretending to have a small one.
2. **The guard stands in front of the paid calls, not behind them.** The intake's
   provider is wrapped (`_cost_guarded`): the budget is checked BEFORE the
   gateway call, the estimate recorded after, and a spent budget raises
   `BudgetSpentError` - which the caller turns into a 4xx with the reason and
   the local path's answer, never a 500 the gateway retries. The gate says
   WHICH budget, because the founder fixing it needs to know which switch.
3. **The ledger is append-only and the read is a sum** (`cost_events`, in
   `packages/contracts/db/schema.sql`, both repos): a replay of the same call is
   a second row, not a silent overwrite - the monotonicity that protects a
   courier's SUBSCRIPTION (ADR-017 §3) is not a rule about money already spent,
   and a double-charge is worse than a stale one. The estimate is the budget
   basis and is labelled as one everywhere; the gateway's own usage is the
   invoice.
4. **The estimate stays on the row with its characters**, so a price change
   re-prices the ledger without re-running the models.
5. **`GET /account/cost` is the same arithmetic read back** for the app: the
   caller's own spend and remaining per window, an unbounded window as `null`
   and a spent budget as zero.

## Consequences

- The founder's switches are `COST_COURIER_DAILY_USD`, `COST_COURIER_MONTHLY_USD`,
  `COST_TENANT_DAILY_USD`, `COST_GLOBAL_DAILY_USD`, and the price pair
  `COST_INPUT_PRICE_PER_MTOKEN` / `COST_OUTPUT_PRICE_PER_MTOKEN` (named in
  FOUNDER_TODO). A deployment with none set is unbounded and says so.
- The cascade itself (cheaper model, then the local parser) is the gateway's and
  the graph's job; this ADR's guard is the part that DECIDES when the paid call
  stops being allowed, and the refusal is a clean 4xx the app already answers.
- 45 tests pin it (17 for the decider's arithmetic and refusals, 28 for the
  ledger's windows, the endpoint's scoping and the wiring).
