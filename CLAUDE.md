# CLAUDE.md

Read and follow `AGENTS.md` (safety rules, skills, quality bar) and `docs/plan/MASTER_EXECUTION.md`
(the execution contract: §0–§16, with `docs/plan/SAAS_CHECKLIST.md` and `docs/plan/COVERAGE_MAP.md`).

`docs/archive/KICKOFF_V4_EN.md` (how) and `docs/archive/KICKOFF_V3_EN.md` (what) are the build system
that `MASTER_EXECUTION.md` runs on; `docs/plan/CONSTRAINTS.md` is the quality bar: do not weaken it to
make a change pass. The index of the documentation is `docs/README.md`.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- graphify-out/ is generated and git-ignored; never commit it.
