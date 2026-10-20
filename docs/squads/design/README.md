# Design System & Motion Squad

**Mission:** One token source, one icon set, motion that never janks, and a screen that does not look AI-made.

**Code:** `packages/design-tokens, apps/mobile/src/components`

**Tasks:** T6 design to the mockups

## Targets (the release gate)

- every screen has all seven states
- screenshots match the mockups (day/night, small/large, 200% text)
- no frame drop while driving
- zero emoji, zero raw hex in components

## Evaluation dataset / benchmark

docs/evidence/design/ (Maestro screenshots)

## Research

docs/research/2026/react-native-design-systems-2026.md - V4 §3: >= 5-10 candidates compared, the decision and its fallback written down.

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
