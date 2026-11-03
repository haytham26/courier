# The evaluation set builders and checkers

The sets themselves live in `packages/eval/`. The builder writes a set, the checker fails the
build when the set does not meet the floor. Both run in CI (`quality-gates.yml`).

| Script | What it does |
|---|---|
| `build-voice-eval.mjs` | Builds the text side of the voice set: the address bank (from the real LINZ data), the spoken scripts with their gold intent and slots, and the planned audio files. `node scripts/eval/build-voice-eval.mjs`. |
| `fetch-open-voice-data.mjs` | Fetches the open data of the voice set (A3): the Common Voice CC0 clips filtered by accent metadata and the MUSAN CC-BY noise beds, into `data/voice/` (git-ignored) with per-clip sha256 checksums, and writes `packages/eval/voice/manifest/licence.csv`. Restartable; it scans the mirror row by row because the viewer has no server-side filter, so it is slow. `node scripts/eval/fetch-open-voice-data.mjs`. |
| `check-voice-eval.mjs` | Checks the voice set: the counts, the gold intents, the tags, and the built utterances' file and checksum rows (>=500 built from open data). `node scripts/eval/check-voice-eval.mjs`. |
| `build-scanner-eval.mjs` | Builds the scanner set: the label manifest, the slices, the field catalogue and the licence ledger. `node scripts/eval/build-scanner-eval.mjs`. |
| `check-scanner-eval.mjs` | Checks the scanner set: the counts, the ground truth, the fields and the licence of every row. `node scripts/eval/check-scanner-eval.mjs`. |

## The routing set

The routing set is **not started**: `packages/eval/routing/README.md` says what it needs and why it
is not built yet. When it lands, its builder and its checker come here.
