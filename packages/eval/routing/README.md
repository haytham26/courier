# The routing evaluation set

**NOT STARTED.** There is no routing evaluation set yet.

## What it has to be

Real days of real Christchurch runs: the stops, the constraints (the time windows, the priorities,
the parcels, the capacity), the order a good planner would produce and the time it would take. The
measurement compares our engine against that order and against the best open engine we can run.

## Why it is not here yet

The routing engine is a seam (`services/api/app/routing.py` holds the heuristic that works without
a routing service). The set has to be built against the engine that will be adopted (PyVRP with
VROOM over a Valhalla matrix, per `docs/research/2026/routing-vrp-engines.md`), so a set built
today would measure the wrong thing.

## What has to happen first

1. The routing service is decided and its licence is recorded (`docs/product/LICENSES.md`).
2. A week of real runs is collected, with the founder's consent for the addresses.
3. The checker (`scripts/eval/check-routing-eval.mjs`) is written next to the builder, and both run
   in CI like the voice and the scanner checkers.

The gap is tracked in `docs/status/PROGRESS.md` (P2, the eval sets) and in
`docs/status/PARITY.md`.
