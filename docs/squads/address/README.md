# Address Intelligence Squad

**Mission:** Parse, correct and remember every NZ address; never send a driver to the wrong house.

**Code:** `packages/nz-address, services/api/app/address_correction.py`

**Tasks:** T4 LINZ data + accuracy, T7.3 door memory

## Targets (the release gate)

- correction accuracy >= 95% on the LINZ-sampled set
- zero wrong-house auto-corrections at confidence >= 0.9
- answer in < 2 s p95

## Evaluation dataset / benchmark

services/api/tests/fixtures (87 committed) + the LINZ sample once T4 lands

## Research

docs/research/2026/nz-address-parsing-geocoding.md - V4 §3: >= 5-10 candidates compared, the decision and its fallback written down.

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
