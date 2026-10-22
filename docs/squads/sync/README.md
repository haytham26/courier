# Sync & Data Squad

**Mission:** Every driving-day action works with no network and syncs later, without losing anything.

**Code:** `packages/sync, services/api/app/sync (to be created)`

**Tasks:** T7.1 sync engine

## Targets (the release gate)

- zero data loss under airplane-mode chaos tests
- conflict rules documented and tested
- sync delay p95 <= 60 s online

## Evaluation dataset / benchmark

docs/squads/sync/eval/ (airplane-mode replay scenarios)

## Research

docs/research/2026/offline-first-sync-local-dbs.md - V4 §3: >= 5-10 candidates compared, the decision and its fallback written down.

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
