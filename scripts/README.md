# The scripts of Courier Copilot

The scripts are grouped by what they do. Every script has a line in the README of its group.

| Group | What is in it |
|---|---|
| `ci/` | The gates: the floor guard, the coverage ratchet, the audits, the licence inventory, the store readiness check, the banned-item grep, the review gate and the 50x backtest. Every one of them blocks a merge. |
| `data/` | The data builders: the offline map pack, the 3D buildings and the synthetic label images. |
| `eval/` | The evaluation sets: the builders that write them and the checkers that fail the build when they are not good enough. |
| `design/` | The Design Studio: the research evidence, the palette measurements and the renders of the directions. |
| `dev/` | The developer tools that are not a gate. |
| `secrets/` | The secrets: opening `.env.local` and pushing it to the GitHub secrets. |

The tests of the scripts live in `__tests__/` inside the group they belong to
(`node --test "scripts/*/__tests__/*.test.mjs"`).

## The rules

- A script never takes a secret on the command line and never prints one.
- A script that writes into the repository writes into `docs/evidence/` and says so.
- A script that downloads something says where the file comes from and checks the licence of the
  source before it uses it.
- A gate exits 0 when it passes and 1 when it fails, and it says which number failed.
