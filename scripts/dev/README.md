# The developer tools

The tools that help a person work in this repository. They are not gates.

| Script | What it does |
|---|---|
| `gh.ps1` | Runs the GitHub CLI with the token from `.env.local`. The token is read at runtime and never printed, logged or committed. `powershell -ExecutionPolicy Bypass -File scripts/dev/gh.ps1 pr list`. |

## The emulator

There is no local Android emulator and there is no script for one: the emulator runs on the GitHub
Actions runner (`.github/workflows/`). The old `setup-emulator` scripts were deleted with that
rule.
