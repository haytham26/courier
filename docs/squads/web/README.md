# Web Dashboard & Admin Squad

**Mission:** The driver's day, the dispatcher's map and the operator's numbers, in one place.

**Code:** `apps/web (to be created)`

**Tasks:** T7.12 web dashboard and admin

## Targets (the release gate)

- Lighthouse >= 95 performance and a11y
- the dispatcher sees the live map and can hand a route over
- the admin can see AI/SMS cost per user

## Evaluation dataset / benchmark

docs/squads/web/eval/ (Lighthouse + Playwright journeys)

## Research

docs/research/2026/web-dashboard-nextjs.md - V4 §3: >= 5-10 candidates compared, the decision and its fallback written down.

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
