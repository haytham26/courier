# BUG-274 evidence — the clean-room ideas doc for docs/study/andee/ (item 7, D48)

The founder's queue item: "the clean-room ideas from docs/study/ (Andee: ideas only, never code, D48)".

Delivered: `docs/study/andee/IDEAS.md` — the Andee ideas recorded clean-room, in our own words.

- **Ideas only, never code:** the file contains no code, no prompt text, no file/module/class
  names, no model or provider identifiers from the source project. It was written WITHOUT
  re-opening the source: everything comes from the in-repo record of the single 2026-10-27
  root-only read (`docs/research/2026/reference-repos.md` §Andee) and from
  `docs/research/2026/andee-cleanroom-spec.md`.
- **Status of each idea:** #1 cheap pre-classifier -> ADOPTED (MASTER §22-A, `turn_gate.py`, on main);
  #2 stop-and-ask -> ADOPTED (§22-B, ADR-028/D65, BUG-273); #3 inspectable+clearable memory ->
  ADOPTED (§22-C read endpoint ADR-028 + app half BUG-202/PR #256); #4 labelled-grid aiming ->
  NOT ADOPTED for the driver (we never drive the UI for the courier; Play restricts the
  accessibility service; D48 keeps it out of trial scope); #5 four further ideas recorded
  unscheduled (event timeline, self-check card, per-entry memory editing, escalation budget).
- **Licence stance restated:** the source licence's A.1(d) forbids shipping it in a product
  offered to others without written authorisation; the doc says so and the CI licence gate
  (`scripts/ci/check-licenses.mjs`) runs on every PR.

Gates on the PR: parity 0 reopened, doc-links, control-chars, mojibake, floor clean.
