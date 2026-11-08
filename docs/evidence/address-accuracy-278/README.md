# BUG-278 evidence — directive 2026-11-08 item 2: held-out address accuracy

## The split (by street, never by address)
`scripts/data/split-linz-holdout.py` (plan without `--execute`, written with it) reads the gitignored `data/linz/addresses-{christchurch,selwyn,waimakariri}.jsonl` (656,392 rows), groups by street key (road_key normalisation), and with seed 20261108 holds out 20 % of the 6,802 Canterbury streets — 1,360 streets, 120,961 addresses — written to the COMMITTED list `services/api/tests/fixtures/linz-holdout-streets.txt` (header records seed, counts, per-area counts). No street name appears on both sides, so no name-specific tuning can leak into the measurement. Tuning (error analysis, fixes) used only the other 80 % of streets.

## The measurements (all regenerated 2026-11-08, seeds in the reports)
- Held-out (the directive's target, `test_d8_accuracy_on_heldout_streets`, 400 addresses/area x 5 cases = 6,000 noisy checks, seed 20261108, store = the full register as in production): **99.65% (5979/6000)** — target ≥ 99.5 % overall, no slice < 98 % (lowest slice 98.75 %). BEFORE the fixes: 97.57 % (5854/6000). Report: `docs/evidence/phase-2.3/linz-accuracy-heldout.md`.
- Tune-set error analysis (`test_d8_error_analysis_on_tune_streets`, same size, tune streets only): 98.48 % (5909/6000) before → 99.97% (5998/6000) after; the 91 misses were grouped per class first (`docs/evidence/phase-2.3/linz-errors-tune.md`).
- Legacy continuity (`test_d8_accuracy_on_real_linz_addresses`, seed 20261020, 120/area x 5 = 1,800 checks): 99.5% (1791/1800). Report: `docs/evidence/phase-2.3/linz-accuracy.md`.

## The root fixes (each class → one fix; re-measured after each round)
1. Multi-type road names: `parse()` now picks the street-type position whose tail names a suburb best (ties → the later type word): "86 Lake Terrace Road, Burwood" → "Lake Terrace Rd" (was "Lake Tce").
2. Direction word ambiguity: the parser hands the engine both readings (`street_alt`/`hint_alt`); the register's road names decide ("Halsey Street, South New Brighton" vs "Ascot Avenue North, New Brighton").
3. Self-correction marker: "648 No 10 Road, Swannanoa" is no longer rewritten (the marker needs an address fragment before it, not a bare number).
4. Wrong road from fuzzy matches: candidates are disambiguated WITH the spoken suburb (`_match_roads` collects all ≥ 0.78, `_match_hint` matches the tail progressively against the candidate's own suburbs, bar 0.8); `road_similarity` adds a completion bonus ("oxford" → "oxford tce") without lowering the 0.78 bar.
5. Ties among suburb-matched candidates: the spoken number+unit existence (rank 2/1), then road score, then the shorter road name ("334 Halswell" → Halswell Road, not Halswell Junction Road).
Unit tests: `tests/test_address_disambiguation.py` (15 tests, one per class) + the 77 pinned address tests all green; `ruff check` clean; thresholds never lowered (0.78 / 0.8 / 0.95 / 0.995 / 0.98 all stand).

## Registers
ADR-027's measurement table has the before/after rows; `docs/STATUS.md:18` carries the real numbers; BUG-278 filed. Held-out streets were never used for tuning.
