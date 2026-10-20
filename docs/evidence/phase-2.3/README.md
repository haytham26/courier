# PHASE 2.3 evidence — D8 address correction engine

Date: 2026-10-20
Branch: `feat/2.3-address-correction`
Scope: KICKOFF_V2_EN.md PHASE 2.3 — "Address correction engine D8:
`{original, corrected, reason, confidence, needs_question, options[]}`; non-existent
number, misspelling, spoken self-correction, multi-suburb question, units/flats, RD;
≥95% on 50+ real Christchurch fixtures (LINZ data in `data/linz/`, gitignored — if
missing, write to FOUNDER_TODO and use a small committed fixture subset for tests)."

## What was built

| Piece | Where |
|---|---|
| D8 engine | `apps/api/app/address_correction.py` — `Correction` (the contract), `Address`, `AddressStore` protocol, `InMemoryAddressStore`, `SqliteAddressStore` (reads the FTS slice the worker builds) |
| Suffix vs unit fix (R23) | `apps/api/app/nz_address.py` — `ParsedAddress.suffix` added; "42B" is number 42 + suffix B, "2/14" is unit 2 of 14 |
| Fixture | `apps/api/tests/address/fixtures/christchurch_addresses.json` — 87 real Christchurch streets/suburbs |
| Tests | `apps/api/tests/address/test_correction.py` — 24 tests |

## Commands and results

| Command | Result | Log |
|---|---|---|
| `uv run --directory apps/api pytest -q` | 48/48 passed (was 23) | `api-test.log` |
| `uv run --directory apps/api pytest tests/address -v` | 24/24 passed | `address-test.log` |
| `uv run --directory apps/api pytest tests/address -q -k accuracy` | 2 passed (the ≥95% accuracy guard) | `accuracy.log` |
| `uv run --directory apps/api ruff check .` | exit 0 | `api-lint.log` |
| `uv run --directory apps/api mypy .` | exit 0, 16 files | `api-typecheck.log` |

## The cases the phase asked for

| Case | Test | Behaviour |
|---|---|---|
| Contract | `TestContract` | every result has `original`, `corrected`, `reason`, `confidence`, `needs_question`, `options[]` |
| Non-existent number | `TestNonExistentNumber` | "1400 Main North Rd" → "140 Main North Rd Papanui Christchurch"; an unknown number asks with the nearest options |
| Misspelling | `TestMisspelling` | "Rickerton" → Riccarton; "Horesworth Rd" → Holdsworth Rd |
| Spoken self-correction | `TestSelfCorrection` | "7 … Papanui no sorry 142 Main North Rd" → 142; "no, 22 Riccarton Rd" → 22 |
| Multi-suburb question | `TestAmbiguousSuburb` | "140 Main North Rd" (the road runs through Papanui and Redwood) → `needs_question` with both suburbs as options |
| Units / flats | `TestUnitsAndFlats` | "2/18 Harewood St" keeps the unit; "Flat 1, 12 Colombo St" → unit 1 of 12 |
| Rural delivery | `TestRuralAddresses` | an unknown RD number on a rural road keeps the long number and asks |
| Accuracy | `TestAccuracyOnTheFixture` | every fixture address is found again from its spoken form, ≥95% (measured 100% over the 87 fixtures) |

## Honest limits

- The fixture holds **real Christchurch street names and suburbs**, but the house numbers and the
  `linz_address_id`s are placeholders (`fixture-chch-001`). The accuracy number therefore proves
  that the engine is internally consistent, **not** that it matches LINZ ground truth.
- The ≥95% accuracy on real LINZ data stays **NOT VERIFIED** until the founder drops the LINZ
  export into `data/linz/` (entry added to `docs/FOUNDER_TODO.md`).
- The engine is not wired into the API routes yet (the `/v1` surface is still a stub in
  `apps/api/app/main.py`); the wiring belongs with the rest of the product API work.
