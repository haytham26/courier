# The evaluation sets

The measurement of the product. Every claim about the voice, the scanner or the routing has to be
backed by a set here and a checker in `scripts/eval/`.

| Set | What it measures | State |
|---|---|---|
| `voice/` | The voice commands: 600 scripts with the gold intent and the slots, 840 planned audio files, 240 real LINZ addresses | PARTIAL: the text side is built, the audio is not |
| `scanner/` | The label scanner: 330 synthetic labels with their ground truth, the field catalogue, the licence ledger | PARTIAL: 40 label photos are the founder's |
| `routing/` | The routing engine on real Christchurch days | NOT STARTED: the folder holds the plan, not the set |

The sets were in `docs/` before; they are data, not documentation, and they are too big to read in
a review. The method behind them stays in `docs/squads/<module>/`.

## The rules

- A set is only as good as its ground truth: every row carries the answer it is checked against.
- The builder writes the set, the checker fails the build when the set does not meet the floor.
  The checkers run in CI (`scripts/eval/check-voice-eval.mjs`, `scripts/eval/check-scanner-eval.mjs`).
- A label photo may hold personal data: the real photos stay out of the repository, the synthetic
  ones are generated.
- The licence of every row is recorded before it enters the set.
