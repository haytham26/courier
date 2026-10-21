# Library bench — where it lives

The bench of MASTER_EXECUTION §13.4 is written in one place:

**[`docs/design/BENCH.md`](BENCH.md)** — 56 libraries scored against the bar of
`docs/design/SYSTEM.md`, with the registry facts, the date, the recommendation and every
unmeasured number marked UNVERIFIED.

The research that the bench is built on is in
[`docs/design/RESEARCH.md`](RESEARCH.md), and the three directions are in
[`docs/design/DIRECTIONS.md`](DIRECTIONS.md).

The tables of both documents are generated from the snapshots in `docs/design/evidence/` by
`scripts/build-design-bench-tables.mjs` and
`scripts/build-design-research-tables.mjs`, so a version or a licence cannot be wrong in the
document without the snapshot changing too.
