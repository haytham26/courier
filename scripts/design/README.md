# The Design Studio scripts

The evidence and the renders of the design studio (MASTER_EXECUTION section 13). They are
developer tools: the founder and the design squads run them, CI does not.

| Script | What it does |
|---|---|
| `fetch-design-evidence.ps1` | Fetches the GitHub evidence of the research and the bench: the stars, the release tags, the dates and the licences of every repository in the list. `powershell -ExecutionPolicy Bypass -File scripts/design/fetch-design-evidence.ps1`. |
| `fetch-design-npm-evidence.ps1` | Fetches the npm evidence of the bench (the unpacked size of every published tarball). `powershell -ExecutionPolicy Bypass -File scripts/design/fetch-design-npm-evidence.ps1`. |
| `fetch-design-research2-evidence.ps1` | Fetches the GitHub evidence of the second round of the studio. `powershell -ExecutionPolicy Bypass -File scripts/design/fetch-design-research2-evidence.ps1`. |
| `verify-design-research2-evidence.ps1` | The verifier pass: it re-reads a sample of the repositories from the live GitHub API and compares the snapshot with what it says today. `powershell -ExecutionPolicy Bypass -File scripts/design/verify-design-research2-evidence.ps1`. |
| `check-design-reference-urls.ps1` | Checks that every reference URL of the research is real and writes the HTTP status. `powershell -ExecutionPolicy Bypass -File scripts/design/check-design-reference-urls.ps1`. |
| `check-design-research2-reference-urls.ps1` | The same for the second round of the studio. `powershell -ExecutionPolicy Bypass -File scripts/design/check-design-research2-reference-urls.ps1`. |
| `build-design-bench-tables.mjs` | Builds the tables of the library bench from the evidence. `node scripts/design/build-design-bench-tables.mjs [--write]`. |
| `build-design-research-tables.mjs` | Builds the tables of the research from the evidence. `node scripts/design/build-design-research-tables.mjs [--write]`. |
| `measure-palettes.mjs` | Measures the candidate palettes against the WCAG bars of `docs/design/SYSTEM.md`, with the same contrast code the build gate uses. `node scripts/design/measure-palettes.mjs`. |
| `print-palette-tables.mjs` | Prints the palette tables of the research from the measured snapshot. `node scripts/design/print-palette-tables.mjs`. |
| `print-direction-tables.mjs` | Prints the measured tables of the second round. `node scripts/design/print-direction-tables.mjs`. |
| `build-direction-renders.mjs` | Builds the static render of every direction (the four screens, day and night). `node scripts/design/build-direction-renders.mjs`. |
| `render-directions.mjs` | Shoots the screens of the directions into PNG files (390 by 844). `node scripts/design/render-directions.mjs`. |
| `render-directions-2.mjs` | The renders of the directions of the current team. `node scripts/design/render-directions-2.mjs`. |
| `typescript-resolver.mjs` | The resolver hook of the design scripts: the token package is TypeScript without file extensions, so the hook adds them. It is registered by the scripts that read the package. |

## The rules

- A number in a design document comes from a measurement script, never from an estimate.
- A reference URL that is not in the evidence file is not in the document: no reference is a guess.
- The renders and the scratch output stay out of the repository (`.design-render/` is gitignored);
  the finished renders live in `docs/design/directions-2/`.
