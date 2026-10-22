# Platform, DevOps & Security Squad

**Mission:** Every change is proven by CI, every release is signed and traceable, every secret is safe.

**Code:** `.github, scripts, infra`

**Tasks:** T1-T3 CI and the emulator, T7.15 SBOM and signed releases

## Targets (the release gate)

- all §2 gates green
- Android E2E green on 2 emulator profiles
- zero high/critical in the audits
- signed APK with an SBOM and provenance
- restore test of the backups

## Evaluation dataset / benchmark

docs/evidence/phase-3.1/, docs/evidence/b7/

## Research

docs/research/2026/cicd-ota-expo.md - V4 §3: >= 5-10 candidates compared, the decision and its fallback written down.

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
