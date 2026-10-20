# Routing & Templates Squad

**Mission:** Build the day's route in one tap from the driver's own template, and re-optimise without ever blocking the van.

**Code:** `services/routing (to be created)`

**Tasks:** T7.2 routing, templates and rules

## Targets (the release gate)

- within 5% of the best-known solution on the benchmark sets
- 200 stops routed <= 5 s
- a template rebuilds a day in one tap

## Evaluation dataset / benchmark

docs/squads/routing/eval/ (VRP benchmark instances + a real Christchurch day)

## Research

docs/research/2026/routing-vrp-engines.md - V4 §3: >= 5-10 candidates compared, the decision and its fallback written down.

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
