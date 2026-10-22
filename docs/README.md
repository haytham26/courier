# The docs of Courier Copilot

**Start here:** `docs/STATUS.md` (the one screen of where the company stands). The execution
contract is `docs/plan/MASTER_EXECUTION.md` (the binding plan); `docs/MASTER_EXECUTION.md`
is a one-line pointer to it, so the old path keeps working.

The folder is grouped by what a document is for. Every document says what it is and how fresh it is;
a document without a date is a decision, not a status.

| Folder | What is in it | Which are binding |
|---|---|---|
| `plan/` | The contract the CEO runs: the execution plan, the SaaS checklist, the coverage map, the quality bar | **Binding.** `CONSTRAINTS.md` is the written quality bar: read it before writing code and never weaken it to make a change pass. |
| `status/` | Where the company stands: the progress, the scorecard, the parity matrix, the bug tracker, the founder-only list | The truth check: every claim here has to match the code and the CI. |
| `decisions/` | The decisions (D1-D26) and the architecture decision records | **Binding** for the work they cover. A decision is only changed by a new decision, never by an edit. |
| `product/` | What the product is: the specification, the brief, the driver interview, the competitive research, the tech stack, the cost plan, the licence ledger | The specification is binding for the build; the rest is the context. |
| `design/` | The design contract, the research, the bench, the mockups, the directions and their evidence | `SYSTEM.md` is the design contract. |
| `research/` | The research notes (the 2026 areas, the waves, the repo research, the market and the risk notes) | Background. Every claim carries its source and its date. |
| `study/` | The clean-room studies of the projects we study (Fleetbase, Navigator, Nominatim, OmniVoice, OpenRouteService, Spoke, VoiceStudio) | Background. No code from these projects is ever copied. |
| `squads/` | One folder per squad: the research, the benchmarks, the decisions and the status of that module | The squad status is the truth check for that module. |
| `evidence/` | The logs of the gate runs, per phase and per audit | The proof. A claim without a log in here is not done. |
| `operations/` | The runbook, the release checklist, the data safety, the privacy policy, the store listing | Binding for the release. |
| `log/` | The executor log, split per week, and the short handoff in `CURRENT.md` | The history of the work. |
| `archive/` | The obsolete prompts and the old reviews | **History only.** Nothing here is a live instruction. |

## The rules for a document

- Every document says what it is, when it was written and who owns it.
- A claim is `DONE`, `PARTIAL` or `NOT STARTED`. Nothing scaffolded is called built.
- A number without a command that produces it, or a log in `evidence/`, is not a number.
- An external reference carries the URL, the date it was read and the licence.
