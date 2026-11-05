# ADR-026 — the spreadsheet import stores what it parsed; the D8 correction lands with the address-intelligence slice

**Date:** 2026-11-05 · **Status:** Accepted · **Deciders:** backend squad, per the
2026-11-05 audit (item 2f) · **Extends:** ADR-025 (the import endpoint), ADR-003 (the LINZ data),
ADR-013 (intake)

## Context

`docs/status/TRIAL_SCOPE.md` promised the spreadsheet import "with its own format tests and
the D8 engine correcting every extracted stop". The code does not: `POST /shifts/{id}/import`
stores the row as the parser read it (`nz_address.parse` for the address structure and the
derived `location_id`, latitude/longitude NULL), and the full D8 correction — the store-backed
match that produces the corrected display, the change report and the confidence — never runs on
that path. The audit named the divergence and asked for the correction to be wired or a
decision recorded.

## Decision

**Record the decision: the import stores what it parsed.** The correction stays with the
address-intelligence slice, and the trial scope is corrected to say so.

Reasons, in order:

1. **The correction needs the register the deployment does not carry.** `AddressCorrector`
   resolves against the LINZ slice (656,392 addresses from `data/linz/`), which is git-ignored
   build-local data. The API container in the trial carries no LINZ slice, so wiring the
   corrector into the import would make the endpoint depend on a file the deploy does not ship.
2. **The import's stops are unlocated anyway.** The routing layer reports them through
   `unroutable_stop_ids` until the address-intelligence slice lands — the same treatment an
   intake stop it cannot place gets — so a correction the routing layer would discard buys
   nothing today.
3. **A silent correction is worse than an honest parse.** The import's answer carries
   `ignored_columns` and the row's own address; an unexplained correction inside the import
   would misreport what the planner wrote.

## Consequences

- `docs/status/TRIAL_SCOPE.md` row 6 now reads "with its own format tests; the stops are
  stored as parsed (unlocated), with the D8 correction landing with the address-intelligence
  slice".
- The import's contract is unchanged (ADR-025): the answer stays 201/409/413/415/422.
- The correction is wired when the slice lands, not before; the trial's day-one import is a
  parse-and-store, which is what it does today.
- If a founder-facing surprise appears (a spreadsheet row stored with a typo and the courier
  reading the typo), the answer is the address slice's correction at the read surface, not a
  hidden write-time correction.
