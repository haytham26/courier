# BUG-277 evidence — founder directive 2026-11-08 item 1: the voice/E2E handover + the LINZ hotword export

## The handover state (also in `docs/log/CURRENT-backend.md`)
- The lead now owns: `services/courier-voice`, `packages/eval/voice`, `scripts/eval/*voice*`,
  `apps/mobile/src/voice`, every `.maestro` flow, and the Android E2E workflow. This session does not edit
  those paths again. BUG-270 is the lead's.
- My voice items' exact state:
  - **BUG-210** (PR #192, eval honesty): the circular headline intent number is withdrawn everywhere and
    published as "the parser ceiling on its own templates"; `scripts/ci/check-parser-circularity.mjs`
    fails the build on a NEW standing overlap (baseline checked in); per-slice reporting with unsupported
    slices named; the held-out paraphrase set is FOUNDER_TODO (no compatible open source; the agent may not
    write the sentences).
  - **ADR-028 / D65, §22 B+C** merged in `3b7b3c4c` (PR #271, BUG-273): `TurnRequest.stt_confidence` + the one
    configured bar `VOICE_ASK_CONFIDENCE_BAR`; below it one short question instead of acting;
    `GET /v1/sessions/{id}/memory` (SessionMemoryView) + the clear half. Voice suite was 364 passed.
  - **Still UNMET:** §22's token and latency numbers measured through OmniRoute — blocked until the
    production OmniRoute exists (LAST item of queue item 7, founder-blocked). The §22-B bar's held-out
    tuning is FOUNDER_TODO (the ~100 real courier sentences).

## The LINZ hotword export
`scripts/data/export-linz-hotwords.py` (plan printed without `--execute`, written with it) reads the
gitignored build-local index `data/linz/addresses-{christchurch,selwyn,waimakariri}.jsonl`
(225,295 + 194,892 + 236,205 = 656,392 rows) and writes the DERIVED name list to
`packages/nz-address/data/linz-hotwords.json` (159,173 bytes, 7,036 lines):
- 6,802 unique road names, 180 suburbs, 40 towns, plus macron-stripped spoken forms (ASR emits no macrons:
  e.g. `Kakariki Place` for a macron road name);
- header carries the CC BY 4.0 attribution ("Sourced from the LINZ Data Service ..."), the licence, the
  source files and row counts;
- NO address numbers and NO raw LINZ bulk: `data/linz/` stays gitignored per ADR-003, so only the derived
  names are committed, which CC BY 4.0 permits with the attribution line;
- output lives outside every voice path (`packages/nz-address/data/`).

## The normaliser, published
`packages/nz-address/README.md` (new) names the two surfaces: the package (`src/index.ts` re-exporting
`parser.ts` / `constants.ts` / `schemas.ts`) and the API twin `services/api/app/nz_address.py`
(`address_correction.py` rides it) — same normalisation both sides, announced in the log.

## Gates (docs + one data script + one generated JSON)
parity 0 reopened; doc-links, control-chars, mojibake, floor clean.
