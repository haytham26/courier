# Maps & Navigation Squad

**Mission:** The whole of Canterbury offline, day and night, at 60 fps.

**Code:** `packages/map-style, infra/maps (to be created)`

**Tasks:** T5 offline PMTiles, T7.7 driving mode

## Targets (the release gate)

- 60 fps pan/zoom
- full Canterbury offline
- day and night styles matching the mockups

## Evaluation dataset / benchmark

docs/squads/maps/eval/ (frame-time traces per screen size)

## Research

docs/research/2026/map-rendering-offline-tiles-styles.md - V4 §3: >= 5-10 candidates compared, the decision and its fallback written down.

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
