# AGENTS.md — read automatically by every coding agent (opencode, Codex, Claude Code, Cursor, …)

Project: **Courier Copilot** — voice-first app for independent parcel couriers in Christchurch/Canterbury, NZ.
Current instructions: **`docs/MASTER_EXECUTION.md`** — the single entry point (CEO loop, plan P1–P7, autopilot). It references V4 (how), V3 (task details), DECISIONS, mockups.
Status: `docs/PROGRESS.md`, `docs/AUDIT.md`, `docs/EXECUTOR_LOG.md`.

## 🔴 Safety (absolute)
- Work only inside this repo folder. Never read/write/delete outside it (no `~`, `$HOME`, `%USERPROFILE%`, AppData, OneDrive, Desktop, other drives).
- No destructive commands (`rm -rf`, `Remove-Item -Recurse`, `rmdir /s`, `del /s`, `shutil.rmtree`, `git clean`, `git reset --hard`). Only `node_modules`/`dist`/`build`/`.turbo`/`.expo` inside the repo, by full literal path, never via a variable.
- No local Android emulator — use `.github/workflows/android-e2e.yml` on GitHub Actions.
- No force-push, no rebase. Secrets only in `.env.local` / GitHub Secrets.
- No PASS without evidence in `docs/evidence/<step>/`.

## Skills — you MUST use them
Skills live in `.claude/skills/<name>/SKILL.md` (mirror in `.agents/`). If your tool doesn't load skills automatically, **open and read the SKILL.md file before starting the matching kind of work**, and follow it.

| When you are… | Read and follow |
|---|---|
| Starting a session / picking a skill | `using-agent-skills`, `context-engineering` |
| Planning a phase or feature | `spec-driven-development`, `planning-and-task-breakdown` |
| Writing any logic or fixing a bug | `test-driven-development`, `incremental-implementation` |
| Using any library/framework | `source-driven-development` (check official docs, cite versions) |
| Designing APIs / module boundaries | `api-and-interface-design` |
| Auth, secrets, user data, payments | `security-and-hardening` |
| Building screens / UI | `frontend-ui-engineering` |
| Something fails | `debugging-and-error-recovery` |
| Before every commit / merge | `code-review-and-quality`, `doubt-driven-development`, `code-simplification` |
| Git, branches, tags, releases | `git-workflow-and-versioning` |
| CI, GitHub Actions, emulator | `ci-cd-and-automation` |
| Quality thresholds, no weakening tests | `constraint-driven-development` |
| Logging/metrics | `observability-and-instrumentation` |
| Speed issues | `performance-optimization` |
| Decisions / docs | `documentation-and-adrs` |
| Removing old code (fake auth, NativeWind…) | `deprecation-and-migration` |
| Release / handover | `shipping-and-launch` |

In `docs/EXECUTOR_LOG.md`, for each step write which skills you applied.
