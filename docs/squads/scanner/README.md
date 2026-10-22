# Label Scanner Squad

**Mission:** A camera that finds and returns the delivery address, on-device, offline, in under 1.5 s.

**Code:** `apps/mobile/src/scanner (to be created)`

**Tasks:** T7.8 OCR label scan

## Targets (the release gate)

- correct recipient address >= 97% after LINZ correction
- wrong-block (sender picked) <= 1%
- <= 1.5 s per label on a mid-range Android

## Evaluation dataset / benchmark

packages/eval/scanner/ (>= 300 NZ courier label images, synthetic + founder-provided redacted photos)

## Research

docs/research/2026/on-device-ocr-label-scanning.md - V4 §3: >= 5-10 candidates compared, the decision and its fallback written down.

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
