# Developer workflow — the 2026 monorepo + agent toolchain (V4 §13.1, redone)

**Research date: 2026-10-21.** Method: V4 §12 — ≥30 candidates with a full evidence card, a shortlist, the
top 5 deep-reviewed against the actual code, and benchmarks only where an eval set exists. Every number was
read live from the GitHub REST API, the npm registry, the project's own licence file or its own
documentation on **2026-10-21** unless the card says **UNVERIFIED**. Nothing is estimated and nothing is
carried over from a previous sprint unread.

**Card fields:** repo URL · stars + the momentum proxy · created · last release + date · commits/90 d +
distinct human authors/90 d · open issues (issues only, PRs excluded) · licence (code **and** data) ·
Expo SDK 58 / RN 0.88 New-Arch fit · npm downloads/30 d · better than our current choice · risks ·
**DECISION**.

### 6-month star trend — method note (binding for every card)

The star *timeline* is not readable with the token in `.env.local`: `GET /repos/{o}/{r}/stargazers` returns
**HTTP 403 "Resource not accessible by personal access token"** and GraphQL `stargazers` returns
**FORBIDDEN**. **Every "stars gained in 6 months" figure in this file is UNVERIFIED.** The proxy V4 §12.3
prescribes is used instead: **releases in the last 6 months · commits in the last 90 days · distinct human
maintainers in 90 days** (bots removed) plus **npm downloads/month** where a registry exists.

---

## 0. Scope, our current choice, the bar

Read out of the repository on 2026-10-21 (not from a doc):

| Item | Verified state on 2026-10-21 |
|---|---|
| Package manager | **pnpm 12.14.0** (`package.json` `packageManager`); `pnpm-workspace.yaml` = `apps/mobile`, `apps/web`, `packages/*`, `services/auth` |
| Build orchestrator | **Turborepo 2.11.9** (`turbo.json`; tasks `build`, `dev`, `test`, `lint`, `typecheck`, `db:push`, `db:studio`, `clean`) |
| Lint / format | **ESLint 10.13.0** flat config (`packages/eslint-config/index.js`: `recommendedTypeChecked` + `projectService: true`) + **Prettier 3.9.10** + **ruff** + **mypy** strict (Python) |
| Test runner | **vitest 4.1.11** (packages/services) + **jest-expo 58.0.9 / jest 30.5.2** (mobile) + **pytest** (`apps/api`) |
| Mobile runtime | **Expo ~58.0.14, RN 0.88.0, React 19.3.0**, New Architecture on |
| CI | **5 workflows**: `ci.yml` (lint+typecheck+test, `timeout-minutes: 25`), `quality-gates.yml` (floor 10 / coverage 20 / licences 10 / audits 15 / sast 15), `codeql.yml`, `android-e2e.yml`, `release-apk.yml` |
| Agent skills | **25 skills** mirrored in `.claude/skills/<name>/SKILL.md` **and** `.agents/skills/<name>/SKILL.md`, pinned by `skills-lock.json` (`source: addyosmani/agent-skills`) |
| Agent rules | `AGENTS.md` (auto-read by opencode / Codex / Claude Code / Cursor) + `CLAUDE.md` |
| Quality bar | `CONSTRAINTS.md` — coverage ratchet ≥72 % / ≥81 %, mutation ≥70 %, floor guard (`scripts/check-floor.mjs`), no copyleft in the shipped app |
| Evidence rule | `docs/evidence/<step>/` — no PASS without evidence (D21) |

### Six gaps found by reading the repo (not by reading a doc)

1. **No pre-commit hook of any kind.** `.husky/`, `.lefthook.yml`, `.lintstagedrc.json` and
   `.pre-commit-config.yaml` **do not exist** (checked 2026-10-21). The floor guard runs in CI only, so a
   commit can carry a new `@ts-ignore` for the length of a CI cycle.
2. **No versioning automation.** There is no `.changeset/` directory, so `packages/*` versions are manual.
3. **`package.json` still carries a `workspaces` array** (`apps/mobile`, `apps/web`, `packages/*`,
   `services/auth`) while pnpm 12 reads `pnpm-workspace.yaml` — **two sources of truth for the same
   list**, and pnpm 12 ignores the JSON field. The list has already drifted: **`apps/web` is listed but
   the directory does not exist on disk** (checked 2026-10-21).
4. **No `nodeLinker` setting.** The Expo monorepo guide is explicit: pnpm's default is **isolated**
   installs and `nodeLinker: hoisted` is the documented escape hatch. `.npmrc` sets `shamefully-hoist=true`
   and `ignore-scripts=true`; `shamefully-hoist` is *not* the same thing as `nodeLinker: hoisted` — the
   tree is still isolated per package, which is the mode the guide warns produces native resolution errors.
5. **`skills-lock.json` hashes do not verify.** For all 25 skills the `.claude` and `.agents` copies are
   **byte-identical** (SHA-256 equal — good), but **neither matches the `computedHash` recorded in the lock
   file** (checked 2026-10-21). Either the hash covers the whole skill directory rather than `SKILL.md`,
   or the lock is stale — **the hashing algorithm is UNVERIFIED**, so today the lock proves nothing.
6. **The skill mirror is `SKILL.md`-only.** Each mirrored skill directory contains exactly one file.
   Upstream `addyosmani/agent-skills` documents this as a **portability gap**: a per-skill install that
   omits the repo-level `references/` directory loses the shared checklists — and our skills
   (`source-driven-development`, `code-review-and-quality`, `constraint-driven-development`) all point at
   shared reference material.

**The bar (V4 §7 + CONSTRAINTS.md):** every gate in `CONSTRAINTS.md` must run **before** a human reviews a
diff, the lock file must be the single source of truth for the workspace layout, and every agent that can
write to the repo must read the same rules. `docs/evidence/` is the receipt, not the process.

---

## Queries run

`scripts\gh.ps1` → `gh api` (the token is read at runtime from `.env.local` and never printed), 2026-10-21.
The search API limit is 30 req/min — observed: two parallel searches returned HTTP 403, so the searches
below were then run serially with a 4 s gap. Filters are the literal query strings.

| #   | Query (filters) | Sort / limit | Results | What it produced |
| --- | ---------------- | ------------ | ------- | ---------------- |
| 1   | `topic:monorepo` | stars / 30 | 30 | turborepo 31 222, nx 29 426, lerna 36 038, moon 4 161, rushstack 6 501, pants 3 846 — the whole field |
| 2   | `topic:changesets` | stars / 25 | 25 | **dead query** — the topic is misused by unrelated repos; the real project is `changesets/changesets`, found by name |
| 3   | `topic:code-review stars:>100` | stars / 25 | 25 | `alibaba/open-code-review` 47 720 (created 2026-05-18), `The-PR-Agent/pr-agent` 13 493, `reviewdog/reviewdog` 9 680, `danger/danger` 5 695 |
| 4   | `topic:claude-code` | stars / 25 | 25 | `anthropics/claude-code` 152 836, `addyosmani/agent-skills` 108 868 — our own skills source, confirmed as the dominant distribution |
| 5   | `topic:agent-skills` | stars / 20 | 20 | `anthropics/skills` 182 430, `addyosmani/agent-skills` 108 868, `greptileai/skills` 422, `coderabbitai/skills` 193 |
| 6   | `claude code skills` | stars / 20 | 20 | `anthropics/claude-plugins-official` 43 336, `ComposioHQ/awesome-claude-skills` 77 494 |
| 7   | `topic:mcp-server stars:>500` | stars / 20 | 20 | `modelcontextprotocol/servers` 91 407, `github/github-mcp-server` 33 794, `oraios/serena` 30 469, `upstash/context7` 63 359, `ChromeDevTools/chrome-devtools-mcp` 53 902 |
| 8   | `cursor rules in:name` | stars / 20 | 20 | **all hobby repos** — largest is `sanjeed5/awesome-cursor-rules-mdc` 3 576 (CC0), last pushed 2026-05-19. Cursor rules are a **convention, not an ecosystem** |
| 9   | `deepwiki` | stars / 20 | 20 | `AsyncFuncAI/deepwiki-open` 18 231 (MIT), `AIDotNet/OpenDeepWiki` 3 632 (MIT), `regenrek/deepwiki-mcp` 1 385, `CognitionAI/deepwiki` 101 (a stub) |
| 10  | `coderabbit` | stars / 15 | 15 | `coderabbitai/awesome-coderabbit` 546 (CC0) — the **review engine is closed**; only skills/plugins/packaging are open |
| 11  | `sourcery` | stars / 15 | 15 | `sourcery-ai/sourcery` 1 877 (MIT, but 3 commits/90 d and one author) |
| 12  | `greptile` | stars / 15 | 15 | `greptileai/skills` 422, `greptileai/cli` 9 (v3.7.0, 2026-10-18), `greptileai/greptile-vscode` 104 (**archived**) |
| 13  | `ellipsis code review` | stars / 15 | 1 | **no repo** — Ellipsis has no public source repo; treat it as a closed product, **UNVERIFIED** beyond its docs |
| 14  | `openai codex in:name` | stars / 12 | 12 | `openai/codex` 130 322 (Apache-2.0), `openai/codex-action` 1 275, `openai/codex-security` 11 140 |
| 15  | `modelcontextprotocol servers in:name` | stars / 20 | 20 | `modelcontextprotocol/servers` 91 407; `modelcontextprotocol/servers-archived` 305 (archived 2025-05-28) |
| 16  | `biome in:name` | stars / 12 | 12 | `biomejs/biome` 25 982 (Apache-2.0) — the format/lint challenger |
| 17  | `oxc in:name` | stars / 12 | 12 | `oxc-project/oxc` 23 126 (MIT); npm `oxlint` **101 609 751 dl/mo** |
| 18  | `vitest in:name` | stars / 12 | 12 | `vitest-dev/vitest` 17 266 (MIT) — we are already on it |
| 19  | `orgs/{coderabbitai,greptileai,sourcery-ai,anthropics}/repos` | updated / 30 each | 30 each | the **entire public surface** of every review vendor: the engines are closed, the **packaging is open** |
| 20  | `api repos/{o}/{r}` × 62, `/releases`, `/commits?since=2026-07-22&per_page=100`, `/issues?state=open`, `/pulls?sort=created` | — | — | every number in §1 and §3 |
| 21  | npm `registry.npmjs.org` + `api.npmjs.org/downloads/point/last-month` | 14 packages | — | download counts (window 2026-09-19 → 2026-10-18) |

---
## 1. Candidate pool — 63 evidence cards

### 1.1 Monorepo orchestration and versioning (10)

**D1 — `vercel/turborepo`** https://github.com/vercel/turborepo — **31 222 ★** /2 470 f · created **2021-10-05** ·
last release **v2.11.9, 2026-10-16** (our exact pin) · ≥100 commits/90 d, **9 humans** · **48 open issues**
(incl. PRs) · **MIT** · npm `turbo` **116 384 950 dl/mo** · Expo SDK 58 fit: it is our build root · **better
than ours**: remote caching, `turbo prune`, and a `turbo.json` schema the tool validates itself · **risks**:
the open issues are all **Rust-rewrite edge cases** (EPIPE, SIGHUP, `turbo watch` double-run) — see §3.1 ·
**DECISION: KEEP (locked).**

**D2 — `nrwl/nx`** https://github.com/nrwl/nx — **29 426 ★** /3 015 f · created **2017-08-11** · last release
**24.0.0-beta.4, 2026-10-19** (4 betas in 6 days) · ≥100 commits/90 d, **15 humans** · **475 open issues** ·
**MIT** · npm `nx` **41 847 491 dl/mo** · self-description: *"The Monorepo Platform that amplifies both
developers and AI agents"* — a project graph, a plugin system and a **cloud control plane** · Expo SDK 58
fit: plugin-based, so a Metro/Expo plugin would be needed · **better than ours**: `nx graph`, `nx affected`
and per-target CI splitting · **risks**: the 24.x line is in **beta**, the release train is now a beta
cadence, and the agent story is a **paid Nx Cloud feature** · **DECISION: WATCH (§3.2).**

**D3 — `lerna/lerna`** https://github.com/lerna/lerna — **36 038 ★** /2 264 f · created **2015-12-04** ·
**v10.1.1, 2026-10-12** · ≥100 commits/90 d, **6 humans** · 297 open · **MIT** · npm `lerna` **7 623 000
dl/mo** · better than ours: nothing we need (Turborepo runs the tasks; changesets versions) · risks:
overlapping scope, an order of magnitude fewer downloads than Turborepo · **DECISION: WATCH (versioning
only).**

**D4 — `changesets/changesets`** https://github.com/changesets/changesets — **12 494 ★** /849 f · created
**2019-03-21** · last release **`@changesets/get-release-plan@5.0.2`, 2026-09-14** · **85 commits/90 d,
15 humans** · 277 open · **MIT** · npm `@changesets/cli` **22 665 494 dl/mo** · Expo SDK 58 fit: pure JS,
no native surface · better than ours: we have **no versioning automation**; a changeset file per change is
the D21 "no PASS without evidence" discipline applied to version numbers · risks: it wants to publish; in
a private monorepo we would use `changeset version` only, never `changeset publish` ·
**DECISION: ADOPT (versioning) — the one addition with no risk.**

**D5 — `pnpm/pnpm`** https://github.com/pnpm/pnpm — **36 865 ★** /1 950 f · created **2016-01-28** ·
**v12.14.0, 2026-10-15** (our exact pin) · ≥100 commits/90 d, **13 humans** · 188 open · **MIT** · npm
`pnpm` **849 798 668 dl/mo** — the most-installed package manager by a wide margin · better than ours: pnpm
12 verifies the lockfile against its own supply-chain policy on every install (our `pnpm-workspace.yaml`
comment already depends on that behaviour) · risks: pnpm 12 moved the settings out of `package.json`,
which is exactly why the root `workspaces` field is now dead weight · **DECISION: KEEP (locked) — and fix
the drift (§6).**

**D6 — `moonrepo/moon`** https://github.com/moonrepo/moon — **4 161 ★** /255 f · created **2021-10-23** ·
**v2.6.2, 2026-10-14** · 98 commits/90 d, 15 humans · 82 open · **MIT** · npm `@moonrepo/cli` **957 029
dl/mo** · better than ours: a Rust task runner with a **toolchain/DX layer** (formatters, linters, version
managers) that maps onto our Prettier/ESLint/ruff split · risks: 20× smaller download base; we would be
an early adopter · **DECISION: WATCH.**

**D7 — `microsoft/rushstack`** https://github.com/microsoft/rushstack — **6 501 ★** /712 f · created
**2016-09-30** · **no GitHub releases** · ≥100 commits/90 d, 9 humans · **1 145 open issues** · licence
**NOASSERTION** (a monorepo of many differently-licensed tools; must be checked per package) · better than
ours: nothing we need · risks: a Rust/webpack toolchain we do not use · **DECISION: REJECT.**

**D8 — `pantsbuild/pants`** https://github.com/pantsbuild/pants — **3 846 ★** /730 f · created **2012-12-17**
· **release_2.33.2rc1, 2026-10-20** · 75 commits/90 d, **20 humans** · 1 081 open · **Apache-2.0** · better
than ours: **JVM/Python/JS in one graph** — the closest thing to our "one command, many languages" need ·
risks: heavyweight and opinionated; replacing Turborepo means rewriting the whole `turbo.json` surface ·
**DECISION: WATCH (only if the TS+Python split starts costing more than it saves).**

**D9 — `expo/expo`** https://github.com/expo/expo — **52 874 ★** /14 665 f · created **2016-08-15** ·
**expo@58.0.16, 2026-10-19** (our SDK line) · ≥100 commits/90 d, **36 humans** · 928 open · **MIT** ·
better than ours: it **is** our SDK; its monorepo guide
(https://docs.expo.dev/guides/monorepos/, page `modificationDate: October 16, 2026`) states that pnpm's
default is isolated installs and that `nodeLinker: hoisted` is the escape hatch, and that from **SDK 55**
`experiments.autolinkingModuleResolution` is **enabled automatically for apps in monorepos** — that is our
SDK 58 · risks: none material · **DECISION: KEEP (locked).**

**D10 — `vercel-labs/skills`** https://github.com/vercel-labs/skills — **35 799 ★** /3 060 f · created
**2026-01-14** · **v1.7.4, 2026-10-19** · ≥100 commits/90 d, **18 humans** · 1 170 open · **MIT** · better
than ours: this is the **installer** for the skills system we already use — `npx skills add
addyosmani/agent-skills` writes the `SKILL.md` files into `.claude/`, `.agents/`, `.codex-plugin/`,
`.opencode/` and more; the README claims *"Supports OpenCode, Claude Code, Codex, Cursor, and 75 more"*
and requires **Node.js 22.20+** (we pin Node ≥22) · risks: a **9-month-old project with 1 170 open
issues**, and its `add` command **writes into the repo** — a supply-chain surface we do not yet control ·
**DECISION: ADOPT (as the installer), sandboxed first (§6).**

### 1.2 Lint, format, test and hook stack (11)

**D11 — `eslint/eslint`** https://github.com/eslint/eslint — **27 573 ★** /5 212 f · created **2013-06-29** ·
**v10.13.0, 2026-10-16** (our exact pin) · ≥100 commits/90 d, **33 humans** · 129 open · **MIT** · npm
`eslint` **672 869 966 dl/mo** · Expo SDK 58 fit: our `packages/eslint-config` is `js.configs.recommended` +
`tseslint.configs.recommendedTypeChecked` + `projectService: true` — type-aware linting over the RN 0.88
tree, exactly what CONSTRAINTS.md demands ("zero errors, zero warnings, type-aware rules") · risks: ESLint
10's type-aware ruleset is slow on a large tree — **our `pnpm lint` wall time is UNVERIFIED** ·
**DECISION: KEEP (locked).**

**D12 — `biomejs/biome`** https://github.com/biomejs/biome — **25 982 ★** /1 305 f · created **2023-07-27** ·
**`@biomejs/biome@2.5.15`, 2026-09-30** · ≥100 commits/90 d, 13 humans · 471 open · **Apache-2.0** · npm
**70 746 787 dl/mo** · better than ours: **one binary that formats and lints**, one config file instead of
`packages/eslint-config` + `.prettierrc` · risks: Biome's rule set is **not** ESLint's; swapping would lose
the type-aware rules (`recommendedTypeChecked`, `no-floating-promises`, `consistent-type-imports`) that
CONSTRAINTS.md depends on · **DECISION: WATCH — do not swap while the type-aware rules are load-bearing.**

**D13 — `oxc-project/oxc`** https://github.com/oxc-project/oxc — **23 126 ★** /1 385 f · created
**2023-02-09** · **oxlint_v1.89.0, 2026-10-19** · ≥100 commits/90 d, 12 humans · 1 055 open · **MIT** · npm
`oxlint` **101 609 751 dl/mo** · better than ours: `oxlint` is the **fast** lint layer and
`oxc-project/eslint-plugin-oxlint` (**459 ★**, MIT, v1.89.0, 41 commits/90 d, 9 humans) switches off the
ESLint rules oxlint already implements — the standard "oxlint first, ESLint for the type-aware remainder"
pattern · risks: CONSTRAINTS.md requires **zero warnings**; a second linter means two configurations to
keep honest · **DECISION: WATCH — measure `pnpm lint` wall time first (§4).**

**D14 — `oxc-project/eslint-plugin-oxlint`** https://github.com/oxc-project/eslint-plugin-oxlint — **459 ★**
/21 f · created **2023-12-28** · **v1.89.0, 2026-10-19** · 41 commits/90 d, 9 humans · 5 open · **MIT** ·
better than ours: the migration lever for D13 · risks: version-locked to oxlint · **DECISION: WATCH (with
D13).**

**D15 — `vitest-dev/vitest`** https://github.com/vitest-dev/vitest — **17 266 ★** /2 091 f · created
**2021-12-03** · **v5.1.0-beta.1, 2026-10-19** · ≥100 commits/90 d, 12 humans · 346 open · **MIT** · npm
`vitest` **487 255 067 dl/mo** · better than ours: nothing; we are on **4.1.11** and 5.x is in **beta** ·
risks: a beta major; we pin 4.x deliberately (the `tinypool` prototype-pollution fix landed in
`vitest@4.1.11` per CONSTRAINTS.md) · **DECISION: KEEP on 4.x — do not move to 5.x until it is stable and
the audit is re-run.**

**D16 — `microsoft/playwright`** https://github.com/microsoft/playwright — **98 153 ★** /6 661 f · created
**2019-11-15** · **v1.64.1, 2026-10-14** · ≥100 commits/90 d, 9 humans · 184 open · **Apache-2.0** · better
than ours: the web-dashboard E2E and the Lighthouse runner (the dashboard does not exist yet) · risks: 2.4
GB of browsers in CI; irrelevant to the mobile app (Maestro owns that) · **DECISION: KEEP (web only; already
decided in the CI/CD research file).**

**D17 — `typicode/husky`** https://github.com/typicode/husky — **35 356 ★** /1 101 f · created **2014-06-23**
· last release **v9.1.7, 2024-11-18** · **0 commits/90 d** (last push 2026-03-19) · 108 open · **MIT** · npm
`husky` **148 511 717 dl/mo** · better than ours: the cheapest way to get a hook · risks: **quiet for two
years, no v10**, and v9 needs a `prepare` script, which our `ignoreScripts: true` policy blocks ·
**DECISION: REJECT — the ecosystem moved to `lefthook` (D19).**

**D18 — `lint-staged/lint-staged`** https://github.com/lint-staged/lint-staged — **14 741 ★** /474 f · created
**2016-01-15** · **v17.6.0, 2026-09-26** · ≥100 commits/90 d, **2 humans** · 2 open · **MIT** · npm
**120 738 541 dl/mo** · better than ours: the standard "run the formatter on staged files only" primitive ·
risks: **2 human maintainers**; needs a hook manager to trigger it · **DECISION: ADOPT (paired with D19).**

**D19 — `evilmartians/lefthook`** https://github.com/evilmartians/lefthook — **8 928 ★** /323 f · created
**2019-02-05** · **v2.2.2, 2026-10-13** · 61 commits/90 d, **26 humans** · 89 open · **MIT** · npm
**22 276 365 dl/mo** · better than ours: a **single binary**, no `prepare` script (so it works with
`ignoreScripts: true`), parallel job groups, and it can run the **floor guard** (`node
scripts/check-floor.mjs`) before a commit ever reaches CI · risks: it runs lint locally, so a slow lint
would block commits — the job must be scoped to staged files · **DECISION: ADOPT (hook manager).**

**D20 — `pre-commit/pre-commit`** https://github.com/pre-commit/pre-commit — **15 645 ★** /1 020 f · created
**2014-03-13** · **v4.7.0, 2026-10-13** · 23 commits/90 d, 3 humans · 26 open · **MIT** · better than ours:
multi-language hooks, the oldest and most conservative choice · risks: **Python-first**, and the hook
contract is clunkier than lefthook's · **DECISION: REJECT (lefthook covers it).**

**D21 — `prettier/prettier`** https://github.com/prettier/prettier — our formatter, **3.9.10** (our pin) ·
**MIT** · npm `prettier` **569 656 091 dl/mo** · better than ours: nothing · risks: Prettier 3 + Biome 2
would be redundant — pick one before adding the other · **DECISION: KEEP.**

---
### 1.3 Code-review bots and agent-in-the-loop PR review (20)

**D22 — `coderabbitai/awesome-coderabbit`** https://github.com/coderabbitai/awesome-coderabbit — **546 ★** /82 f
· created **2024-09-24** · last push **2026-09-29** · **6 commits/90 d, 3 humans** · 13 open · **CC0-1.0** ·
better than ours: the **only public description of how CodeRabbit is configured** — starters, config
examples, per-language rules · risks: documentation, not software; it cannot be run or benchmarked ·
**DECISION: KEEP (reference).**

**D23 — `coderabbitai/skills`** https://github.com/coderabbitai/skills — **193 ★** /16 f · created
**2026-01-30** · **v1.1.1, 2026-04-22** · 20 commits/90 d, 3 humans · 23 open · **MIT** · README read
2026-10-21: *"The canonical home for CodeRabbit's agent-native skills and plugin packaging… install
AI-native code review into 35+ coding agents"* via `npx skills add coderabbitai/skills` and a Claude Code
plugin (`coderabbit@claude-plugins-official`) — **a vendor trying to occupy the exact slot our skills
system occupies** · risks: the review **engine is closed and hosted**; the skill is a thin client ·
**DECISION: WATCH — only the §4 acceptance-rate benchmark can judge it.**

**D24 — `coderabbitai/git-worktree-runner`** https://github.com/coderabbitai/git-worktree-runner — **1 794
★** /109 f · created **2025-08-07** · **v2.11.1, 2026-09-14** · 19 commits/90 d, 3 humans · 3 open ·
**Apache-2.0** · better than ours: automated per-branch **git worktree** creation with editor and agent
integration and dependency installation — one worktree per agent task, which is how parallel agents should
run against one repo · risks: Bash-only · **DECISION: WATCH (high value if we run parallel agents).**

**D25 — `coderabbitai/codex-plugin`** https://github.com/coderabbitai/codex-plugin — **8 ★** /3 f · created
**2026-04-13** · last push **2026-10-15** · 25 commits/90 d, 1 human · 4 open · **no licence detected** ·
better than ours: proves the CodeRabbit review runs **inside Codex** — the "agent-in-the-loop review" is
shipping as a plugin, not as a bot · risks: one author, no licence file · **DECISION: WATCH.**

**D26 — `coderabbitai/cursor-plugin`** https://github.com/coderabbitai/cursor-plugin — **4 ★** /3 f · created
**2026-07-01** · last push **2026-09-28** · **1 commit/90 d** · 1 open · **MIT** · better than ours: the same
idea for Cursor ("code review and guarded PR autofix workflows") · risks: effectively unmaintained ·
**DECISION: WATCH (or REJECT).**

**D27 — `sourcery-ai/sourcery`** https://github.com/sourcery-ai/sourcery — **1 877 ★** /101 f · created
**2019-07-15** · **v1.46.1b7, 2026-09-24** · **3 commits/90 d, 1 human** · 120 open · **MIT** · better than
ours: **Python-specific quality review**, the half of our stack ESLint does not cover (`apps/api` is ruff +
mypy) · risks: **3 commits in 90 days, one author** — the repo is a shell; the product is the hosted
service. Open issues are telling: **#487** "Files with PEP 695 or PEP 758 syntax are silently skipped"
(2026-09-28), **#480** "Sourcery freezes in PyCharm" (2026-06-04), **#470** "Feature Request: Sourcery linter
as a MCP Server" (2025-09-17, still open) · **DECISION: WATCH — the Python gap is real, the maintenance
signal is poor.**

**D28 — `sourcery-ai/sourcery-vscode`** https://github.com/sourcery-ai/sourcery-vscode — **110 ★** /24 f ·
created **2020-02-20** · **v1.46.1b7, 2026-09-24** · 9 commits/90 d, 2 humans · 25 open · **MIT** · better
than ours: nothing for a terminal-first agent workflow · risks: an editor extension is the wrong surface ·
**DECISION: REJECT.**

**D29 — `greptileai/skills`** https://github.com/greptileai/skills — **422 ★** /45 f · created **2026-02-11**
· last push **2026-10-20** · **4 commits/90 d, 3 humans** · 12 open · **MIT** · README read 2026-10-21:
three skills — `check-pr` ("check a PR/MR/CL for unresolved comments, failing checks, incomplete
description. **Fix and resolve**"), `cli-review` and **`greploop`** ("trigger Greptile review, fix comments,
re-review — until 5/5 confidence and zero comments"), auto-detecting **GitHub, GitLab or Perforce** ·
better than ours: `greploop` is the **agent-in-the-loop loop written down as a skill** — we have the loop
but not the tool · risks: the "5/5 confidence" gate is a **vendor metric**, not a correctness proof ·
**DECISION: WATCH — copy the loop shape into our own `code-review-and-quality` skill; the vendor is
optional.**

**D30 — `greptileai/cli`** https://github.com/greptileai/cli — **9 ★** /1 f · created **2026-05-22** ·
**v3.7.0, 2026-10-18** · **0 commits/90 d** · 2 open · **no licence detected** · better than ours: a CLI
path for the review without CI integration · risks: 9 stars, a 3 KB repo, no licence ·
**DECISION: WATCH.**

**D31 — `greptileai/claude-plugin`** https://github.com/greptileai/claude-plugin — **0 ★** /0 f · created
**2026-08-28** · **greptile--v1.2.4, 2026-09-22** · 14 commits/90 d, 2 humans · 0 open · **MIT** · better
than ours: the same review as a **Claude Code plugin** — agent-in-the-loop by construction · risks: 0 stars,
no evidence of use · **DECISION: WATCH.**

**D32 — `The-PR-Agent/pr-agent`** https://github.com/The-PR-Agent/pr-agent — **13 493 ★** /1 974 f · created
**2023-07-05** · **v0.48.0, 2026-10-16** · ≥100 commits/90 d, **26 humans** · **27 open issues** · **MIT** ·
better than ours: **self-hostable** — the review runs in our own CI against our own model provider; the
README states *"This project is not the Qodo free tier"* · risks: a large Python service; it wants model
API keys · **DECISION: WATCH — the only self-hostable review engine in the pool, which matters for the
privacy posture (D12, NZ Privacy Act).**

**D33 — `reviewdog/reviewdog`** https://github.com/reviewdog/reviewdog — **9 680 ★** /520 f · created
**2016-10-17** · **v0.21.2, 2026-09-18** · ≥100 commits/90 d, 9 humans · 132 open · **MIT** · better than
ours: posts **any linter's** output back onto the PR as review comments — including ESLint, Semgrep and
ruff, which we already run · risks: a reporter, not a reviewer; it does not judge ·
**DECISION: ADOPT as a reporter only, if we want linter output on the PR itself and not only in the log.**

**D34 — `danger/danger`** https://github.com/danger/danger — **5 695 ★** /492 f · created **2015-09-29** ·
**v9.6.1, 2026-07-29** · 5 commits/90 d, 3 humans · 170 open · **MIT** · better than ours: **rules as code
in the repo** — the closest published thing to our `CONSTRAINTS.md` philosophy (a written bar, enforced by
a script) · risks: Ruby; the "you forgot to…" culture is the opposite of our tone · **DECISION: WATCH (the
pattern, not the tool).**

**D35 — `google/mantis`** https://github.com/google/mantis — **2 489 ★** /227 f · created **2026-06-15** ·
last push **2026-10-20** · **69 commits/90 d, 3 humans** · **2 open issues** · **Apache-2.0** · better than
ours: *"A modular, stack-agnostic toolkit for AI coding agents to autonomously find, reproduce, and patch
vulnerabilities"* — **it reproduces the finding before reporting it**, the difference between a guess and a
defect · risks: young (4 months), no releases · **DECISION: WATCH — the reproduce-before-report rule is
the one idea worth stealing.**

**D36 — `alibaba/open-code-review`** https://github.com/alibaba/open-code-review — **47 720 ★** /3 480 f ·
created **2026-05-18** · **v1.13.2, 2026-10-20** · ≥100 commits/90 d, **46 humans** · 320 open ·
**Apache-2.0** · better than ours: a **hybrid** architecture — *"deterministic pipelines + LLM Agent"*,
line-level comments, a multi-language ruleset (NPE, thread-safety, XSS, SQL injection), OpenAI- and
Anthropic-compatible providers · risks: a Chinese-language-first tool (PR **#1785** "docs(review-rules):
list every built-in rule mapping in **all five locales**"; commit `0ac5b402c` refreshes the Chinese
contributing docs) · **DECISION: WATCH — the 2026 benchmark to beat; self-hostable and Apache-2.0.**

**D37 — `tirth8205/code-review-graph`** https://github.com/tirth8205/code-review-graph — **32 286 ★** /3 098
f · created **2026-02-26** · **v2.3.9, 2026-09-18** · ≥100 commits/90 d, 7 humans · 179 open · **MIT** ·
better than ours: *"builds a persistent map of your codebase so AI coding tools read only what matters,
with benchmarked context reductions"* — the **context** problem solved as a graph · risks: created in 2026
and already 32 k stars — the star inflation of the agent-tool year makes the number weak evidence ·
**DECISION: WATCH.**

**D38 — `lintsinghua/DeepAudit`** https://github.com/lintsinghua/DeepAudit — **7 182 ★** /870 f · created
**2025-09-19** · **v3.0.4, 2026-01-24** · **5 commits/90 d, 2 humans** · 96 open · **AGPL-3.0** · better than
ours: a self-hosted multi-agent vulnerability audit with sandboxed PoC verification · risks: **AGPL-3.0**
(a service, not a shipped dependency, but it must be recorded in `docs/LICENSES.md`) ·
**DECISION: REJECT (AGPL + 5 commits/90 d).**

**D39 — `modem-dev/hunk`** https://github.com/modem-dev/hunk — **9 642 ★** /321 f · created **2026-03-17** ·
**v0.24.0, 2026-10-19** · ≥100 commits/90 d, **27 humans** · 163 open · **MIT** · better than ours: a
**review-first terminal diff viewer** — the surface where an agent's change is judged · risks: a UI, not a
gate · **DECISION: WATCH.**

**D40 — `backnotprop/plannotator`** https://github.com/backnotprop/plannotator — **9 540 ★** /715 f · created
**2025-12-28** · **v0.28.23, 2026-10-17** · ≥100 commits/90 d, 3 humans · 165 open · **Apache-2.0** · better
than ours: *"annotate and review coding agent plans and code diffs visually, share with your team, send
feedback to agents with one click"* — the **human-in-the-loop for agent plans** · risks: another UI ·
**DECISION: WATCH.**

**D41 — `twinnydotdev/twinny`** https://github.com/twinnydotdev/twinny — **3 674 ★** /235 f · created
**2023-08-21** · **v4.0.20, 2026-09-22** · ≥100 commits/90 d, 5 humans · 52 open · **MIT** · better than
ours: a **local-model** assistant (your models, your infrastructure) — the privacy posture D12 asks for ·
risks: an editor extension · **DECISION: WATCH (self-hosting angle only).**

### 1.4 Agent skills, agent rules, MCP servers and docs bots (22)

**D42 — `anthropics/skills`** https://github.com/anthropics/skills — **182 430 ★** /21 614 f · created
**2025-09-22** · last push **2026-10-09** · **no GitHub releases** · 16 commits/90 d, 4 humans · **1 424
open issues** · **no licence detected by the API** (`LICENSE` absent) → **UNVERIFIED** · 20 skills
(`claude-api`, `mcp-builder`, `skill-creator`, `webapp-testing`, `pdf`, `docx`, …) plus `spec/` and
`template/` · better than ours: the **reference catalogue**; its `spec/agent-skills-spec.md` now points at
**https://agentskills.io/specification** (read 2026-10-21) — the open spec every vendor now points at ·
risks: **no licence file** and 1 424 open issues; do not vendor without the licence ·
**DECISION: WATCH (reference for the spec; do not vendor).**

**D43 — `anthropics/claude-code`** https://github.com/anthropics/claude-code — **152 836 ★** /27 199 f · created
**2025-02-22** · **v2.1.304, 2026-10-19** · ≥100 commits/90 d, 8 humans · **15 427 open issues** ·
**no licence detected** (the repo is mostly issues + plugins; the CLI is distributed on npm) · npm
`@anthropic-ai/claude-code` **49 122 517 dl/mo** · Expo SDK 58 fit: it reads the repo, it does not build it ·
risks: 15 k open issues; the licence of the repo contents is **UNVERIFIED** · **DECISION: KEEP (the tool
we already run).**

**D44 — `anthropics/claude-code-action`** https://github.com/anthropics/claude-code-action — **9 585 ★**
/2 214 f · created **2025-05-19** · **v1.0.254, 2026-10-19** · ≥100 commits/90 d, **22 humans** · 833 open ·
**MIT** · better than ours: the **agent-in-the-loop PR review** as a GitHub Action, with a documented
`allowed_tools` allow-list and a `disallow_unlisted_mcp_tools` option (PR **#1900**, 2026-10-13) · risks: it
runs our agent in CI and needs model budget · **DECISION: WATCH (§3.5).**

**D45 — `anthropics/claude-code-security-review`** https://github.com/anthropics/claude-code-security-review
— **6 458 ★** /727 f · created **2025-08-04** · last push **2026-02-11** · **0 commits/90 d** · 103 open ·
**MIT** · better than ours: an AI security review GitHub Action · risks: **stalled since 2026-02-11**;
Semgrep + CodeQL already run in our gates · **DECISION: REJECT (we have Semgrep + CodeQL).**

**D46 — `anthropics/claude-agent-sdk-python`** https://github.com/anthropics/claude-agent-sdk-python — **8 306
★** /1 363 f · created **2025-06-11** · **v0.2.168, 2026-10-15** · ≥100 commits/90 d, 5 humans · 571 open ·
**MIT** · better than ours: the **programmable** version of the agent — this is how you put an agent
*inside* a product (our voice copilot) rather than beside it · risks: a fast-moving 0.x ·
**DECISION: WATCH (the SDK, not the CLI, is what our runtime would use).**

**D47 — `anthropics/claude-agent-sdk-typescript`** https://github.com/anthropics/claude-agent-sdk-typescript
— **1 825 ★** /240 f · created **2025-09-27** · **v0.3.304, 2026-10-19** · 77 commits/90 d, 2 humans · 234
open · **no licence detected** → **UNVERIFIED** · better than ours: the same, for our TypeScript services ·
risks: only 2 human authors · **DECISION: WATCH.**

**D48 — `anthropics/claude-plugins-official`** https://github.com/anthropics/claude-plugins-official — **43 336
★** /4 581 f · created **2025-11-20** · last push **2026-10-20** · ≥100 commits/90 d, 5 humans · 1 194 open ·
**Apache-2.0** · better than ours: the **official plugin directory** — CodeRabbit's plugin is published
here, so this is where a vendor review would land for Claude Code users · risks: another channel to
curate · **DECISION: WATCH.**

**D49 — `addyosmani/agent-skills`** ⭐ https://github.com/addyosmani/agent-skills — **108 869 ★** /11 348 f ·
created **2026-02-15** · tag **0.6.13, 2026-10-13** (commit `aeac41d4d`) · ≥100 commits/90 d, **15 humans** ·
146 open · **MIT** · **our locked skills source** (D14). Root contains `.agents/`, `.claude/`,
`.claude-plugin/`, `.codex-plugin/`, `.gemini/`, `.opencode/`, `AGENTS.md`, `CLAUDE.md`, `commands/`,
`agents/`, `evals/`, `hooks/`, `references/`, `scripts/`, `skills/` (25 skills, exactly the set we mirror) ·
better than ours: it already ships the **multi-agent packaging** we hand-rolled, plus `evals/` and
`hooks/` · risks: one maintainer; 8 months old; the `references/` portability gap (§0.6) ·
**DECISION: KEEP (locked) — but adopt the packaging and the evals, not just the SKILL.md files.**

**D50 — `agentskills/agentskills`** https://github.com/agentskills/agentskills — **26 320 ★** /1 992 f · created
**2025-12-16** · last push **2026-08-09** · 14 commits/90 d, 3 humans · 104 open · **Apache-2.0** ·
better than ours: **the open specification** — `SKILL.md` frontmatter (`name` ≤64 chars, `description`
1–1024 chars, optional `license`, `compatibility` ≤500 chars, `metadata`, experimental `allowed-tools`),
the optional `scripts/`, `references/`, `assets/` directories, **progressive disclosure** (~100 tokens of
metadata, <5 000 tokens of body) and the `skills-ref validate` validator · risks: quiet since 2026-08-09 ·
**DECISION: ADOPT (the spec) — write our SKILL.md files against it and validate them in CI.**

**D51 — `vercel-labs/agent-skills`** https://github.com/vercel-labs/agent-skills — **32 704 ★** /2 857 f ·
created **2025-12-08** · last push **2026-10-14** · 29 commits/90 d, 2 humans · 181 open · **no licence
detected** → **UNVERIFIED** · better than ours: Vercel's own skill collection · risks: the licence file is
missing · **DECISION: WATCH (do not vendor).**

**D52 — `openai/codex`** https://github.com/openai/codex — **130 322 ★** /20 523 f · created **2025-04-13** ·
last release **rust-v0.164.0-alpha.7, 2026-10-20** · ≥100 commits/90 d, **35 humans** · **23 716 open
issues** · **Apache-2.0** · npm `@openai/codex` **91 545 359 dl/mo** · Expo SDK 58 fit: it reads
`AGENTS.md` — the file we already write · better than ours: the **Rust rewrite** and a real terminal
agent · risks: 23 k open issues · **DECISION: KEEP as the second agent (our `AGENTS.md` already targets it).**

**D53 — `openai/codex-action`** https://github.com/openai/codex-action — **1 275 ★** /181 f · created
**2025-10-01** · last push **2026-10-14** · 5 commits/90 d, 3 humans · 83 open · **Apache-2.0** · better than
ours: the **same agent-in-the-loop CI shape** as the Claude action, with a `drop-sudo` hardening step
(PR **#186**, 2026-10-08) and *"prevent interpretation of workflow commands in Codex output"* (PR **#187**,
merged 2026-10-20 — a **prompt-injection** guard on the agent's own output) · risks: open issues **#188**
"drop-sudo fails on Ubuntu 26.04" (2026-10-20) and **#180** "`drop-sudo` fails when Node is outside sudo's
PATH" (2026-09-16) · **DECISION: WATCH (§3.5).**

**D54 — `openai/codex-security`** https://github.com/openai/codex-security — **11 140 ★** /1 003 f · created
**2026-07-13** · **npm-v0.5.0, 2026-10-20** · ≥100 commits/90 d, 10 humans · 185 open · **Apache-2.0** ·
better than ours: a CLI + SDK to *"find, validate, and fix security vulnerabilities"* — the validate step is
what Semgrep lacks · risks: 3 months old · **DECISION: WATCH.**

**D55 — `modelcontextprotocol/servers`** https://github.com/modelcontextprotocol/servers — **91 407 ★** /11 824
f · created **2024-11-19** · **v2.0.0, 2026-10-19** · ≥100 commits/90 d, **2 humans** · 136 open · licence
**NOASSERTION** (a multi-licensed collection — check per server) · better than ours: the reference server
implementations · risks: only 2 human authors; the collection moved many servers to
`modelcontextprotocol/servers-archived` (305 ★, archived 2025-05-28) · **DECISION: KEEP (reference).**

**D56 — `modelcontextprotocol/python-sdk`** https://github.com/modelcontextprotocol/python-sdk — **24 623 ★**
/4 276 f · created **2024-09-24** · **v2.3.0, 2026-10-02** · ≥100 commits/90 d, 7 humans · 360 open ·
**MIT** · npm `@modelcontextprotocol/sdk` **256 832 284 dl/mo** · better than ours: the SDK our `apps/api`
would use to expose the copilot's tools to an agent · risks: none material · **DECISION: ADOPT (SDK) — but
only for tools we already expose over HTTP.**

**D57 — `github/github-mcp-server`** https://github.com/github/github-mcp-server — **33 794 ★** /5 412 f ·
created **2025-03-04** · **v2.0.2, 2026-10-08** · ≥100 commits/90 d, **26 humans** · 380 open · **MIT** ·
better than ours: the **official** way for an agent to read and write GitHub — issue, PR and file access ·
risks: an agent with write scope is an agent that can push to `main`; scope it to the fork ·
**DECISION: ADOPT (read-mostly) — this is the tool our "agent-in-the-loop PR review" would use.**

**D58 — `oraios/serena`** https://github.com/oraios/serena — **30 469 ★** /2 310 f · created **2025-03-23** ·
**v2.1.0, 2026-10-19** · ≥100 commits/90 d, **22 humans** · 99 open · **NOASSERTION** → **UNVERIFIED** ·
better than ours: *semantic retrieval and editing* — an agent that reads the code by meaning, not by
grep; the "IDE for your agent" · risks: the licence is not machine-detectable · **DECISION: WATCH.**

**D59 — `upstash/context7`** https://github.com/upstash/context7 — **63 359 ★** /3 119 f · created
**2025-03-26** · **mcpb-v4.4.4, 2026-10-19** · ≥100 commits/90 d, 17 humans · 53 open · **MIT** · better than
ours: **up-to-date library documentation for agents** — this is the tool that makes the
`source-driven-development` skill honest (fetch the official docs, not the model's memory) · risks: it
indexes third-party docs, so a poisoned index is a supply-chain risk ·
**DECISION: ADOPT (MCP) — it directly serves our `source-driven-development` rule.**

**D60 — `ChromeDevTools/chrome-devtools-mcp`** https://github.com/ChromeDevTools/chrome-devtools-mcp —
**53 902 ★** /7 064 f · created **2025-09-11** · **chrome-devtools-mcp-v1.11.0, 2026-10-15** · ≥100
commits/90 d, **21 humans** · 123 open · **Apache-2.0** · better than ours: the browser, driven by the
agent — the `browser-testing-with-devtools` skill we mirror is only a description; this is the server ·
risks: it needs a browser · **DECISION: ADOPT (MCP) — pairs with the skill we already ship.**

**D61 — `DeusData/codebase-memory-mcp`** https://github.com/DeusData/codebase-memory-mcp — **47 019 ★** /3 893
f · created **2026-02-24** · **v0.12.1, 2026-10-16** · ≥100 commits/90 d, **1 human** · 648 open · **MIT** ·
better than ours: *"Indexes codebases into a persistent knowledge graph — average repo in milliseconds.
162 languages, sub-ms queries, 99 % fewer tokens. Single static binary, zero dependencies."* · risks:
**bus factor 1**; "99 % fewer tokens" is a vendor claim we have not reproduced ·
**DECISION: WATCH (benchmark the token claim before believing it).**

**D62 — `AsyncFuncAI/deepwiki-open`** https://github.com/AsyncFuncAI/deepwiki-open — **18 231 ★** /2 017 f ·
created **2025-04-30** · last push **2026-09-03** · 20 commits/90 d, 2 humans · 285 open · **MIT** · better
than ours: **an open DeepWiki generator** for GitHub/GitLab/Bitbucket — the docs bot we could run
ourselves instead of paying for · risks: 20 commits/90 d; it needs model access ·
**DECISION: WATCH — the "docs as a build artefact" idea is worth a trial on our own repo.**

**D63 — `AIDotNet/OpenDeepWiki`** https://github.com/AIDotNet/OpenDeepWiki — **3 632 ★** /463 f · created
**2025-04-27** · **v2.0.6, 2026-09-08** · 64 commits/90 d, 9 humans · 18 open · **MIT** · better than ours:
the other open DeepWiki; C#/TypeScript, modular · risks: it is a **knowledge-management platform**, not a
docs bot · **DECISION: WATCH (weaker fit than D62).**

---
## 2. Shortlist (13)

| #   | Project | Decision | One-line reason |
| --- | ------- | -------- | --------------- |
| D1  | **vercel/turborepo** 2.11.9 | **KEEP (locked)** | Our exact pin is the latest release; the Rust rewrite's open issues are edge cases, not blockers. |
| D5  | **pnpm/pnpm** 12.14.0 | **KEEP (locked)** | 849.8 M downloads/month; its own supply-chain policy is what our lockfile comment depends on. |
| D9  | **expo/expo** (SDK 58) | **KEEP (locked)** | Its monorepo guide is the document that says our isolated `node_modules` needs a decision. |
| D4  | **changesets/changesets** | **ADOPT (versioning)** | We have no version automation today; a changeset per change is the cheapest missing guardrail. |
| D19 | **evilmartians/lefthook** v2.2.2 | **ADOPT (hook manager)** | One binary, no `prepare` script (works with `ignoreScripts: true`), can run the floor guard before a commit reaches CI. |
| D18 | **lint-staged/lint-staged** v17.6.0 | **ADOPT (with D19)** | Runs Prettier/ESLint on staged files only — the standard companion to lefthook. |
| D50 | **agentskills/agentskills** (the spec) | **ADOPT (the spec)** | The open `SKILL.md` format every vendor now targets; `skills-ref validate` makes it checkable in CI. |
| D49 | **addyosmani/agent-skills** 0.6.13 | **KEEP (locked) + widen** | Our skills source; it already ships the `.agents`/`.codex-plugin`/`.opencode` packaging and an `evals/` folder we do not use. |
| D10 | **vercel-labs/skills** v1.7.4 | **ADOPT (installer, sandboxed)** | The installer that writes the skills into every agent directory; it must be sandboxed because it writes into the repo. |
| D57 | **github/github-mcp-server** v2.0.2 | **ADOPT (read-mostly)** | The official agent-to-GitHub path; scope it to the fork, never to `main`. |
| D59 | **upstash/context7** v4.4.4 | **ADOPT (MCP)** | Makes the `source-driven-development` skill real: official docs at runtime, not from memory. |
| D36 | **alibaba/open-code-review** v1.13.2 | **WATCH (benchmark)** | 47 720 ★, Apache-2.0, self-hostable, hybrid deterministic+agent — the review engine to benchmark against. |
| D29 | **greptileai/skills** | **WATCH (copy the loop)** | `greploop` (review → fix → re-review) is the agent-in-the-loop shape we should write into our own skill. |

### Also considered — the watchlist and the rejections

| #   | Project | Decision | One-line reason |
| --- | ------- | -------- | --------------- |
| D2  | **nrwl/nx** 24.0.0-beta.4 | **WATCH** | A real project graph and `nx affected`, but the 24.x line is beta and the agent story is a paid cloud feature. |
| D13 | **oxc-project/oxc** v1.89.0 | **WATCH (after we measure lint time)** | `oxlint` is the fast lint layer; only worth it if `pnpm lint` is today the slow part of `check:fast`. |
| D12 | **biomejs/biome** 2.5.15 | **WATCH (not yet)** | One binary for format+lint, but swapping would cost us the type-aware ESLint rules CONSTRAINTS.md depends on. |
| D32 | **The-PR-Agent/pr-agent** v0.48.0 | **WATCH** | The only self-hostable review engine — the one that fits the privacy posture. |
| D35 | **google/mantis** | **WATCH** | Reproduces a finding before reporting it; the rule, not the tool, is what we want. |
| D27 | **sourcery-ai/sourcery** v1.46.1b7 | **WATCH** | The only Python reviewer — the half of our stack ESLint does not cover. |
| D23 | **coderabbitai/skills** v1.1.1 | **WATCH** | A vendor occupying our exact slot, with a closed engine behind it. |
| D26/D28/D30/D31 | coderabbit-cursor-plugin · sourcery-vscode · greptile-cli · greptile-claude-plugin | **WATCH** | Thin wrappers; no maintenance signal. |
| D34 | **danger/danger** v9.6.1 | **WATCH (pattern)** | "Rules as code in the repo" is our CONSTRAINTS.md philosophy; the tool is Ruby. |
| D24 | **coderabbitai/git-worktree-runner** v2.11.1 | **WATCH** | One worktree per agent task — the right shape if we ever run agents in parallel. |
| D3/D6/D8 | lerna · moon · pants | **WATCH** | Each covers one need we do not have; Turborepo runs our tasks and changesets versions our packages. |
| D15/D16/D21/D39/D40/D41 | vitest · playwright · prettier · hunk · plannotator · twinny | **KEEP** | Already ours, or a surface we do not need. |
| D7/D17/D20/D38/D45/D47/D58/D61 | rushstack · husky · pre-commit · DeepAudit · claude-code-security-review · claude-agent-sdk-typescript · serena · codebase-memory-mcp | **REJECT / WATCH** | Each covers one need we do not have (see the cards). DeepAudit is AGPL; husky and pre-commit are superseded by lefthook; claude-code-security-review has been stalled since 2026-02-11. |

---

## 3. Deep review — top 5 (code read, commits, PRs and issues opened in the 2026 window)

### 3.1 Turborepo (D1) — the locked choice

**Code and behaviour actually checked.**
`turbo.json` (our copy, read 2026-10-21): the task graph declares `build.dependsOn: ["^build"]`,
`typecheck.dependsOn: ["^build"]`, `test.dependsOn: []`, `lint.dependsOn: []`, `dev` is `persistent` with
`cache: false`, `db:studio` is `cache: false`, and `globalEnv` lists only `NODE_ENV`, `DATABASE_URL`,
`APP_ENV`. **Behaviour this produces:** `turbo run test` runs **every** package's tests with **no
dependency ordering and no cache key**, so a change in `packages/shared` does not invalidate
`packages/nz-address`'s test task — the test tasks are independent, which is correct for our layout but
means **the build cache cannot be trusted to skip a test that depends on a changed package**. `turbo run
typecheck` **does** depend on `^build`, so typechecking pays for the whole dependency build first. There
is no `outputs` entry for `test`, `lint` or `typecheck`, and no `env`/`globalDependencies` beyond
`globalEnv` — so a change in `.env.example` or in a workspace-level config file **does not bust the
cache**. These are our own gaps, not Turborepo's, and they are visible only by reading the file.

**Commits (2026-10-16 → 2026-10-19, default branch `main`):**

| SHA | date | author | subject |
|---|---|---|---|
| `921155f01` | 2026-10-19 | PedroRosalba | fix: Restore cached symlinks when outputs are already on disk (#14807) |
| `604803826` | 2026-10-19 | PedroRosalba | fix: Keep task env vars in the hash when globalEnv excludes inferred vars (#1480x) |
| `57ecce3b0` | 2026-10-19 | PedroRosalba | fix: Parse pnpm 8 single-project lockfiles (#14806) |
| `d926d6a37` | 2026-10-19 | PedroRosalba | fix: Match package configuration files and directory inputs in task-level affected |
| `d154e7e92` | 2026-10-18 | PedroRosalba | fix: Match git's text=auto binary detection in file hashing (#14697) |
| `db2b83c4c` | 2026-10-18 | PedroRosalba | fix: Exclude tool-managed directories from local dependency inputs (#14696) |
| `9c9236efb` | 2026-10-16 | sahyl | fix: Avoid pnpm batch-shim shutdown hangs on Windows (#14819) — *fixes #14803* |
| `730a98ada` | 2026-10-16 | sahyl | fix: Allow non-recursive Turbo commands in root tasks (#14814) — *fixes #14795* |
| `78b039e3a` | 2026-10-16 | FOWEPJF255 | fix(cache): Parallelize dry-run HEAD fallback (#14801) |
| `679efb8ea` | 2026-10-16 | anthonyshew | refactor: Remove setup lifecycle script controls (#14818) |
| `9c9085246` | 2026-10-16 | anthonyshew | fix: Allow native package manager configuration during setup (#14816) |
| `9328416c5` | 2026-10-16 | anthonyshew | fix: Stop installing the Unix shell hook automatically (#14813) |
| `ee546c605` | 2026-10-16 | github-actions[bot] | chore: Release Turborepo 2.11.9 (#14824) |

**Behaviour that matters to us in that list:** `9328416c5` ("Stop installing the Unix shell hook
automatically") and `679efb8ea` ("Remove setup lifecycle script controls") are Turborepo **giving up**
auto-installed hooks — the same direction as our `ignoreScripts: true` policy. `9c9236efb` is a **Windows**
pnpm fix, and our founder develops on Windows. `d154e7e92` (binary detection in file hashing) and
`db2b83c4c` (exclude tool-managed directories from local dependency inputs) change **what busts the
cache** — the two areas where our `turbo.json` is silent.

**PRs opened in the 2026 window (all open unless stated):**
[#14875](https://github.com/vercel/turborepo/pull/14875) 2026-10-20 · [#14874](https://github.com/vercel/turborepo/pull/14874)
2026-10-20 · [#14873](https://github.com/vercel/turborepo/pull/14873) 2026-10-20 · [#14872](https://github.com/vercel/turborepo/pull/14872)
2026-10-20 · [#14871](https://github.com/vercel/turborepo/pull/14871) 2026-10-20 · [#14870](https://github.com/vercel/turborepo/pull/14870)
2026-10-20 · [#14869](https://github.com/vercel/turborepo/pull/14869) 2026-10-20 · [#14868](https://github.com/vercel/turborepo/pull/14868)
2026-10-20 ("fix: Exit quietly when `turbo ls` output is piped to a closed reader") ·
[#14867](https://github.com/vercel/turborepo/pull/14867) 2026-10-19 ("perf: Speed up prefix environment
matching") · [#14864](https://github.com/vercel/turborepo/pull/14864) 2026-10-19 ·
[#14860](https://github.com/vercel/turborepo/pull/14860) 2026-10-18 ("fix: Respect task exclusions in
dependencies") · [#14865](https://github.com/vercel/turborepo/pull/14865) 2026-10-19 — **merged
2026-10-19** (`9330903fb`).

**Issues opened in the 2026 window (open, issues only — PRs excluded):**
[#14866](https://github.com/vercel/turborepo/issues/14866) 2026-10-19 — "turbo ls / query ls panic on EPIPE
when stdout is a closed pipe (2.7.2 run aborted with SIGABRT)" ·
[#14848](https://github.com/vercel/turborepo/issues/14848) 2026-10-17 — "On SIGHUP, turbo exits but leaves
the running task alive, and the task's cleanup never runs" ·
[#14847](https://github.com/vercel/turborepo/issues/14847) 2026-10-17 — "`turbo watch` runs a task twice for
a burst of quick edits" ·
[#14846](https://github.com/vercel/turborepo/issues/14846) 2026-10-17 — "`--affected` misses the package a
staged file was moved out of".

**Verdict:** Turborepo 2.11.9 is the current release and our pin is exact. The 2026 issues are all
**signal-handling and cache-invalidation** edge cases; none blocks a monorepo of our size. The real
finding is on **our** side: `turbo.json` has no `outputs` for `test`/`lint`/`typecheck`, no `env` and no
`globalDependencies`, and `typecheck` pays for `^build`. Those are the changes to make.

### 3.2 Nx (D2) — the 2026 challenger

**README read (2026-10-21):** *"Nx is a monorepo solution for TypeScript and polyglot codebases. Built
with Rust for performance, extensible via TypeScript. Caches what didn't change, runs only what's
affected, and comes with an integrated CI solution."* The badge block advertises **Nx Cloud** features —
*hours saved*, *cache hit rate*, *remote caching*, **self-healing CI**, *flaky task retries* — all of
which are **the paid tier**. The repository description itself has changed for 2026: *"The Monorepo
Platform that amplifies both developers **and AI agents**. Nx optimizes your builds, scales your CI, and
fixes failed PRs automatically. Ship in half the time."*

**Behaviour we actually checked in the commit stream:** the 2026 work is not about a project graph any more;
it is about **agent-facing task introspection**. Commits `91744a465` (2026-10-19) *"say in nx show target
and nx graph how ci treats a target under ul…"* and `2a01deefa` (2026-10-19) *"document
`@nx-depends-on` and `@nx-ignore-server-inputs` in one gui…"* are about **telling an agent what a target
does**; `0e9dfbbae` (2026-10-19) *"chore(repo): add draft-security-advisory skill (#36384)"* is Nx
shipping **its own agent skill**. Nx is competing in our exact lane.

**Commits (2026-10-19 → 2026-10-20):** `94f107fef` 2026-10-20 leosvelperez "feat(angular)!: remove
deprecated SCAM generators (#37508)" · `7ebde8579` 2026-10-20 leosvelperez "fix(core): prevent stale cache
hits when task inputs share a hash details key" · `48b15f3bd` 2026-10-20 FrozenPandaz "feat(gradle): hash
task inputs with includeIgnored and drop the gitignore clas…" · `dc5dac119` 2026-10-20 jaysoo "fix(misc):
harden v24 migrations (#37493)" · `2541ec6eb` 2026-10-20 leosvelperez "feat(misc): add dev server
readiness to the remaining plugins (#37483)" · `a62f68d5b` 2026-10-20 jaysoo "fix(bundling): stop rollup
plugin from scanning the workspace during graph cre…" · `ab5a7b583` 2026-10-19 AgentEnder "fix(core): let
processInBackground payloads fall back to v8 serialization" · `7d65f5e78` 2026-10-13 addyosmani-era merge
"Merge #678: say test-driven-development applies when code is pasted inline" (that is our skills repo's
commit, mirrored here as `7d65f5e78`).

**PRs opened in the 2026 window:** [#37514](https://github.com/nrwl/nx/pull/37514) 2026-10-20 ·
[#37512](https://github.com/nrwl/nx/pull/37512) 2026-10-20 · [#37511](https://github.com/nrwl/nx/pull/37511)
2026-10-20 · [#37510](https://github.com/nrwl/nx/pull/37510) 2026-10-20 · [#37509](https://github.com/nrwl/nx/pull/37509)
2026-10-20 · [#37507](https://github.com/nrwl/nx/pull/37507) 2026-10-20 · [#37505](https://github.com/nrwl/nx/pull/37505)
2026-10-20 · [#37503](https://github.com/nrwl/nx/pull/37503) 2026-10-20 · [#37500](https://github.com/nrwl/nx/pull/37500)
2026-10-20 · [#37508](https://github.com/nrwl/nx/pull/37508) 2026-10-20 — **closed, merged
2026-10-20T15:29:49Z**.

**Issues opened in the 2026 window:** [#37513](https://github.com/nrwl/nx/issues/37513) 2026-10-20 — "nx login
says 'Already logged in' when the stored Nx Cloud OAuth login is expired" (a **paid-tier** login bug) ·
[#37506](https://github.com/nrwl/nx/issues/37506) 2026-10-20 — "Run exits 130 (SIGINT) instead of 1 when a
task is skipped because its dependency failed" · [#37502](https://github.com/nrwl/nx/issues/37502)
2026-10-20 — "Could not find runner configuration for default on Node 22.18.0" (**we run Node 22**).

**Release cadence:** `24.0.0-beta.0` 2026-10-13 → `beta.1` 2026-10-13 → `beta.2` 2026-10-14 → `beta.3`
2026-10-18 → `beta.4` 2026-10-19; the last stable is `23.3.0` 2026-10-07.

**Verdict:** Nx is the only serious alternative, and in 2026 it has turned into an **agent platform with a
paid control plane**. We take 95 % of what we need from Turborepo today, we have **one** monorepo with
**four** workspace globs, and the pain Nx solves (task-graph introspection at scale, CI fan-out, flaky-task
retry) is not ours yet. The **Node 22 runner issue (#37502)** is a reminder that a beta line is a beta
line. **Stay on Turborepo; re-read Nx when the workspace grows past ~10 packages or when CI minutes become
the bottleneck.**

### 3.3 The skills system — the spec, the catalogue, our source, the installer (D50, D42, D49, D10)

**The spec (read 2026-10-21, https://agentskills.io/specification).** A skill is a directory with a
mandatory `SKILL.md`; the frontmatter fields are `name` (≤64 chars, lowercase/hyphens, must match the
directory), `description` (1–1024 chars, must say **what it does and when to use it**), optional
`license`, `compatibility` (≤500 chars), `metadata`, and an experimental `allowed-tools`. Optional
directories are `scripts/`, `references/`, `assets/`. The spec states the **progressive-disclosure**
budget explicitly: *"(1) Metadata (~100 tokens): the `name` and `description` fields are loaded at startup
for all skills (2) Instructions (< 5000 tokens recommended): the full `SKILL.md` body is loaded when the
skill is activated (3) Resources (as needed)"*, and *"(Keep your main `SKILL.md` under 500 lines.)"* It
also names the validator: `skills-ref validate ./my-skill`.

**Behaviour we checked against our own tree.** Our 25 mirrored skills each contain **exactly one file**,
`SKILL.md`. The spec's `references/` mechanism is therefore **not exercised** in our repo, while upstream
`addyosmani/agent-skills` ships a repo-level `references/` directory that its own README warns is lost by a
per-skill install (upstream issue **#361**). Our `skills-lock.json` records a `computedHash` per skill that
**matches neither** our `.claude` nor our `.agents` copy — so the lock is currently decorative.

**The catalogue (`anthropics/skills`, D42).** 20 skills including `claude-api`, `mcp-builder`,
`skill-creator`, `webapp-testing`, `pdf`, `docx`, `pptx`, `xlsx`, `doc-coauthoring`. Its
`spec/agent-skills-spec.md` now contains only a pointer: *"The spec is now located at
https://agentskills.io/specification"*. Commit `dbd4588f9` (2026-10-09, cj-ant) updates the `claude-api`
skill with "dynamic workflows and the four workflow quickstarts"; `33375500b` (2026-09-24) links refusal
billing to the docs (**#1825**). Open issues include
[#2051](https://github.com/anthropics/skills/issues/2051) 2026-10-20 "How does skill trigger resolution
work when multiple skills match the same query?" — **the trigger-resolution question is the open design
question of the whole ecosystem** — and
[#2048](https://github.com/anthropics/skills/issues/2048) 2026-10-19 "Is there a recommended max length for
skill description fields?" (answered by the spec's 1024-character cap; PR
[#2050](https://github.com/anthropics/skills/pull/2050), 2026-10-20, "claude-api: bring description under
the 1024-character spec limit", is still open).

**Our source (`addyosmani/agent-skills`, D49).** Tag `0.6.13` = commit `aeac41d4d` (2026-10-13). The
commits that week are about **conformance and evaluation**, not content: `576fd183f` "Merge #624: conform
idea-refine to skill anatomy", `4bcae53d3` "Merge #677: label JavaScript blocks as JavaScript; Codex
manifest says 25 skills", `e6e521397` "Merge #675: decode quoted skill identities consistently in
run-evals", `1fec94555` "Merge #676: read top-level command descriptions with the shared parser",
`6db395e3b` "Merge #666: require non-empty evidence in grading results", `7d65f5e78` "Merge #678: say
test-driven-development applies when code is pasted inline", `b82d92742` "Merge #651: simplify-ignore keeps
a change reverted with git and re-hides the fi…", `de3761d54` "Merge #682: /review and /test run in the
main session". Open issue
[#715](https://github.com/addyosmani/agent-skills/issues/715) 2026-10-19 — "Make the lifecycle slash
commands user-invoked only". The `skills/` directory lists **exactly our 25 skills**, and the root already
carries `.agents/`, `.claude-plugin/`, `.codex-plugin/`, `.gemini/`, `.opencode/`, `AGENTS.md`, `CLAUDE.md`,
`commands/`, `agents/`, `evals/`, `hooks/`, `references/`, `scripts/` — **the multi-agent packaging we
hand-rolled.**

**The installer (`vercel-labs/skills`, D10).** `v1.7.4` = commit `a80e4c9d1` (2026-10-19). Commits
`215c397b7` "Restore experimental_sync as the advertised command", `e68cdc4a1` "Align comments in CLI help
examples", `617fc80b3` "Simplify README and split detailed documentation". Open issues
[#2550](https://github.com/vercel-labs/skills/issues/2550) 2026-10-20 (index re-audit),
[#2549](https://github.com/vercel-labs/skills/issues/2549) 2026-10-20 — "Finder: existing skills found by
name but absent from task-query candidates" (the **discovery** half of the problem) and
[#2543](https://github.com/vercel-labs/skills/issues/2543) 2026-10-19 (redirect of moved skill listings).
PRs: [#2548](https://github.com/vercel-labs/skills/pull/2548) 2026-10-20 ("fix(local-lock): follow symlinks
in collectFiles for correct folder hashing"), [#2547](https://github.com/vercel-labs/skills/pull/2547)
2026-10-20 ("fix(add): skip agents without a global skills dir on global installs"),
[#2545](https://github.com/vercel-labs/skills/pull/2545) 2026-10-20 ("feat: install same-source skill
dependencies"), [#2544](https://github.com/vercel-labs/skills/pull/2544) 2026-10-19 ("perf(install): restore
each repository once in install").

**Verdict:** the skills system is a **standard now**, not a vendor feature — Anthropic's catalogue, our
source, the CodeRabbit skill and the Greptile skill are all the same `SKILL.md` shape, and the spec is
open. **Our lock position is correct and should be widened, not changed**: adopt `agentskills.io` as the
format, validate our 25 skills with `skills-ref validate` in CI, use `vercel-labs/skills` to install and
update them (sandboxed), and — the part we are missing — copy upstream's **multi-agent packaging**
(`.codex-plugin/`, `.opencode/`, `hooks/`, `evals/`) instead of hand-mirroring.

### 3.4 The review bots — CodeRabbit, Sourcery, Greptile, Ellipsis, and the open engines (D22–D38)

**What is actually open.** The 2026 pattern is: **the review engine is closed and hosted; the packaging is
open.** `coderabbitai` publishes `awesome-coderabbit` (546 ★, CC0-1.0), `skills` (193 ★, MIT),
`git-worktree-runner` (1 794 ★, Apache-2.0), `codex-plugin` (8 ★), `cursor-plugin` (4 ★) — and **no
engine**. `greptileai` publishes `skills` (422 ★, MIT), `cli` (9 ★), `claude-plugin` (0 ★) — and **no
engine**. `sourcery-ai/sourcery` (1 877 ★, MIT) is a **wrapper**: its last 8 commits are all
`brendanator` bumping the version (2025-10-20 → 2026-09-17), i.e. **3 commits/90 d, one author**.
**Ellipsis has no public repository at all** — `api-evangelist/ellipsis` (0 ★) is unrelated; treat Ellipsis
as a closed product and **UNVERIFIED** beyond its documentation.

**What the open skills actually say (read 2026-10-21).** `coderabbitai/skills`: *"install AI-native code
review into 35+ coding agents, Gemini CLI, Antigravity CLI, Claude Code, Cursor…"*, installed by
`npx skills add coderabbitai/skills` or `/plugin install coderabbit@claude-plugins-official`.
`greptileai/skills`: three skills — `check-pr`, `cli-review`, and **`greploop`**, where `greploop` is
*"Loop: trigger Greptile review, fix comments, re-review — until 5/5 confidence and zero comments"*,
supporting GitHub, GitLab, Perforce and the local CLI.

**The open engines (the real comparison).**
`The-PR-Agent/pr-agent` v0.48.0 (2026-10-16) — 13 493 ★, MIT, ≥100 commits/90 d, **26 humans**, only **27
open issues**. Recent commits: `729415c68` 2026-10-20 "fix: skip review and describe when all files are
filtered (#4204)"; `5fc4aed61` 2026-10-20 "feat(ask): answer questions with the CI artifact as context
(#4176)"; `cbaa5f0d0` 2026-10-20 "perf(similar_issue): batch embeddings before individual retries
(#4189)"; `6b2f478a9` 2026-10-20 "perf(diff): normalize excluded extensions once per file batch (#4187)".
Open issues: [#4203](https://github.com/The-PR-Agent/pr-agent/issues/4203) 2026-10-20 (fallback model
config) and [#4196](https://github.com/The-PR-Agent/pr-agent/issues/4196) 2026-10-20 (ticket extraction
reads `#N` in Dependabot notes). PRs: [#4205](https://github.com/The-PR-Agent/pr-agent/pull/4205)
2026-10-20, [#4204](https://github.com/The-PR-Agent/pr-agent/pull/4204) 2026-10-20 (**merged**
2026-10-20T12:31:35Z), [#4197](https://github.com/The-PR-Agent/pr-agent/pull/4197) 2026-10-20 — *"fix:
prevent local config contents in log artifact while preserving PR"* (a **secret-leak** fix in the artifact
writer: exactly the kind of thing our `docs/evidence/` rule cares about).

`alibaba/open-code-review` v1.13.2 (2026-10-20) — 47 720 ★, Apache-2.0, **46 humans/90 d**, 320 open
issues. Commits `375f64cd6` 2026-10-20 "fix(tool): report an empty code_comment batch instead of success
(#1773)", `410ddb8ee` 2026-10-20 "fix(mcp): follow tools/list pagination when caching server tools (#1770)",
`c0d623a3d` 2026-10-20 "fix(ci): prevent PR policy checkout state pollution (#1783)", `55450a95e` 2026-10-19
"ci: enforce PR commit policy (#1775)", `46790d9e8` 2026-10-19 "feat(rules): add PowerShell review support
(#970)". Open issues: [#1789](https://github.com/alibaba/open-code-review/issues/1789) 2026-10-20 (HTTP
retry after 200 headers) and [#1779](https://github.com/alibaba/open-code-review/issues/1779) 2026-10-19
("ocr review/scan selects 0 files for .md/.txt/.tsv … yet exits 0" — a **silent-success** bug, the class of
defect our floor guard is designed to catch). PRs:
[#1788](https://github.com/alibaba/open-code-review/pull/1788) 2026-10-20,
[#1782](https://github.com/alibaba/open-code-review/pull/1782) 2026-10-20 — *"feat(viewer): add collapse-all
and hand a finding to a coding agent"* (the **agent-in-the-loop hand-off**),
[#1780](https://github.com/alibaba/open-code-review/pull/1780) 2026-10-20 — *"fix: exit non-zero when
review/scan selects zero files from a non-empty input"*, and
[#1783](https://github.com/alibaba/open-code-review/pull/1783) 2026-10-20 (**merged** 2026-10-20T06:16:54Z).

`google/mantis` (created 2026-06-15, 69 commits/90 d, 3 humans, 2 open issues) — reproduces before reporting.
`reviewdog/reviewdog` v0.21.2 (2026-09-18) — the reporter, not the judge.
`danger/danger` v9.6.1 (2026-07-29) — rules as code, Ruby.
`lintsinghua/DeepAudit` v3.0.4 (2026-01-24) — **AGPL-3.0**, 5 commits/90 d: excluded.

**Verdict:** **do not buy a review bot yet.** The engines that are open are open *because they are young*
(`open-code-review` is five months old and Chinese-language-first; `pr-agent` is self-hostable but a large
Python service), and the engines that are mature are closed and hosted — which puts driver-adjacent source
code outside our infrastructure, against the NZ Privacy Act posture in D12. What we should take **now** is
three behaviours, not a product: (1) **the `greploop` loop** (review → fix → re-review to zero), copied
into our own `code-review-and-quality` skill; (2) **the reproduce-before-report rule** (mantis) — a
finding that cannot be reproduced is not a finding; (3) **the hand-a-finding-to-the-agent handoff**
(`open-code-review` #1782). **The measurement that settles the vendor question is the agent-review
acceptance rate in §4.**

### 3.5 Agent-in-the-loop PR review and the MCP surface (D44, D53, D57, D59)

**`anthropics/claude-code-action`** — 9 585 ★, MIT, **v1.0.254, 2026-10-19**, ≥100 commits/90 d, 22 humans,
833 open issues. The commit stream is a **daily version bump of the agent itself** (`db77d4d3c` 2026-10-19
"chore: bump Claude Code to 2.1.304 and Agent SDK to 0.3.304", `5eb090f3c` 2026-10-18 → 2.1.303,
`f27be6b65` 2026-10-16 → 2.1.302). Open issues that describe the CI cost model:
[#1909](https://github.com/anthropics/claude-code-action/issues/1909) 2026-10-19 — "Install Dependencies:
`bun install --production` has no timeout and downloads ~218 MB" (a **CI-minutes** issue in the open) ·
[#1901](https://github.com/anthropics/claude-code-action/issues/1901) 2026-10-13 — "Credit balance is too
low" only via the action (a **budget** issue, not a bug). PRs:
[#1908](https://github.com/anthropics/claude-code-action/pull/1908) 2026-10-18 (Windows credential path),
[#1906](https://github.com/anthropics/claude-code-action/pull/1906) 2026-10-18 (SSH signing cleanup),
[#1904](https://github.com/anthropics/claude-code-action/pull/1904) 2026-10-16 — *"fix: scope built-in PR
reviews to changed files"* (a **cost** fix), [#1900](https://github.com/anthropics/claude-code-action/pull/1900)
2026-10-13 — *"feat: add `disallow_unlisted_mcp_tools` to keep unlisted MCP tools out o…"* (the **safety**
knob), [#1898](https://github.com/anthropics/claude-code-action/pull/1898) 2026-10-12 — *"fix(sanitizer):
strip hidden attributes only inside HTML tags"*.

**`openai/codex-action`** — 1 275 ★, Apache-2.0, 5 commits/90 d. The two most instructive commits are
security-shaped: `c05cfd74a` (2026-10-20, PR [#187](https://github.com/openai/codex-action/pull/187),
**merged** 2026-10-20T16:15:06Z) *"Prevent interpretation of workflow commands in Codex output"* — an
agent-output **prompt-injection** guard — and `a8d8be6ee` (2026-10-09, PR
[#186](https://github.com/openai/codex-action/pull/186), merged 2026-10-09) *"Preserve TMPDIR when dropping
sudo on Linux"*. Open issues: [#188](https://github.com/openai/codex-action/issues/188) 2026-10-20 "drop-sudo
fails on Ubuntu 26.04", [#180](https://github.com/openai/codex-action/issues/180) 2026-09-16,
[#178](https://github.com/openai/codex-action/issues/178) 2026-09-07 (raw JSONL telemetry). PRs:
[#184](https://github.com/openai/codex-action/pull/184) 2026-10-01, [#181](https://github.com/openai/codex-action/pull/181)
2026-09-19, [#179](https://github.com/openai/codex-action/pull/179) 2026-09-11, [#177](https://github.com/openai/codex-action/pull/177)
2026-09-06 — *"feat: add pull request progress comments"*.

**`github/github-mcp-server`** — 33 794 ★, MIT, **v2.0.2, 2026-10-08**, ≥100 commits/90 d, **26 humans**,
380 open. Commits `e3809fe91` 2026-10-15 "Add cursor pagination to list_label (#3505)", `796afb747`
2026-10-15 "fix(repos): return a resource link for files over 1 MB in get_file_con…", `c59e8c199` 2026-10-13
"fix: encode repository resource URIs as UTF-8 (#3437)", `eb47a99dd` 2026-10-08 "fix(inventory): retain
typed tool header validation (#3454)". Open issues:
[#3538](https://github.com/github/github-mcp-server/issues/3538) 2026-10-20,
[#3532](https://github.com/github/github-mcp-server/issues/3532) 2026-10-19 — *"install-tor.sh"* (an
install script in a package — a supply-chain smell),
[#3524](https://github.com/github/github-mcp-server/issues/3524) 2026-10-18 — "Mixed case `GITHUB_HOST` is
classified as GitHub Enterprise Server". PRs:
[#3535](https://github.com/github/github-mcp-server/pull/3535) 2026-10-19 — *"docs(opencode): cover the v2
MCP config shape"* (the agent directory again), [#3525](https://github.com/github/github-mcp-server/pull/3525)
2026-10-18, [#3534](https://github.com/github/github-mcp-server/pull/3534) 2026-10-19.

**`upstash/context7`** — 63 359 ★, MIT, `mcpb-v4.4.4` (2026-10-19), 17 humans, 53 open.

**Verdict:** the *agent-in-the-loop PR review* is now a **standard shape with a standard safety knob**
(`disallow_unlisted_mcp_tools`, `allowed_tools`, "scope built-in PR reviews to changed files"). We should
build it ourselves on top of **`github-mcp-server` read-mostly + `context7` for source-cited answers**,
inside our own CI, with the agent's own output treated as **untrusted** (the Codex PR #187 lesson). The
cost model is the open question: **every one of these actions burns model budget in CI, and
[#1909](https://github.com/anthropics/claude-code-action/issues/1909) shows the install step alone can pull
218 MB.**

---
## 4. Benchmarks — build time, CI minutes, PR cycle time, onboarding time, agent-review acceptance rate

**No eval set exists for this area, so no benchmark was run and none is claimed.** There is no
`docs/squads/platform/benchmarks/` directory, no CI-minute record, and no onboarding-time record in the
repo. Every number below is **UNVERIFIED** and the measurement is named.

| # | Benchmark | Candidates | Metric | Target | Status | How we would measure it |
|---|---|---|---|---|---|---|
| B1 | **Build time** | Turborepo (cold/warm) · Nx | wall-clock for `turbo run build` on a clean checkout vs a warm cache | ≤ 3 min cold, ≤ 30 s warm | **UNVERIFIED** | `docs/squads/platform/benchmarks/build-time/`: 20 runs of `pnpm build` with `TURBO_FORCE=true` and without, on the same runner image; record median + p95, the cache hit rate per task, and the `turbo run build --dry=json` output that proves which tasks were skipped |
| B2 | **CI minutes** | current 5 workflows vs the same with the floor guard moved into a pre-commit hook | GitHub Actions minutes per PR, split by job | ≤ 25 min end-to-end; report the sum of all five workflows | **UNVERIFIED** | `gh api /repos/{owner}/{repo}/actions/runs` over the last 50 PRs; sum `run_started_at` → `run_updated_at` per workflow; publish the table in `docs/evidence/platform/ci-minutes.md`; the per-job `timeout-minutes` in our YAML are **ceilings, not measurements** |
| B3 | **PR cycle time** | first commit → merge | median and p90 hours, split by "agent-authored" vs "human-authored" | p90 ≤ 24 h | **UNVERIFIED** | `gh pr list --state merged --json createdAt,mergedAt` over the last 30 PRs; the split needs a label (`agent` / `human`) added to the PR template — **which does not exist today** |
| B4 | **Onboarding time** | a new developer, from a clean clone to a first green PR | minutes to: install, run the app, run the test suite, open a PR | ≤ 30 min | **UNVERIFIED** | write `docs/onboarding.md` as a checklist, then time **two** people who have not seen the repo, on Windows and on Linux; the timing must be produced by the person being onboarded, not by the executor |
| B5 | **Agent-review acceptance rate** | our human review vs CodeRabbit vs `pr-agent` vs `open-code-review` | % of agent findings a human accepted unchanged; % that were false positives; median minutes spent triaging | ≥ 60 % accepted, ≤ 10 % false positives, and the triage must be **cheaper** than the review | **UNVERIFIED** | `docs/squads/platform/benchmarks/agent-review/`: take the **last 30 PRs**, run each candidate in replay mode over the same diffs, and have the reviewer who wrote the code mark each finding *accepted / wrong / useful-but-wrong-location*. The three numbers above are the gate. **Until this exists, no review bot is adopted** |
| B6 | **Lint cost** | ESLint 10 type-aware (current) vs oxlint-first vs Biome | wall-clock of `pnpm lint` on `packages/` + `services/` | ≤ 60 s, and it must not become the slowest gate | **UNVERIFIED** | 10 timed runs of `pnpm lint` on the same checkout, warm and cold; record the per-rule time (`TIMING=1`) and the error/warning count to prove the swap did not weaken `CONSTRAINTS.md` |
| B7 | **Skill-install determinism** | `skills-lock.json` today vs `vercel-labs/skills` with a verified hash | do two independent installs produce byte-identical trees? | yes, 100 % | **UNVERIFIED** | install into a scratch directory twice from the same tag, `Get-FileHash` every file, compare; then fix the hash algorithm so `skills-lock.json` verifies (§0.5) and re-run |

**Why these five and not others:** build time and CI minutes decide whether the agent workflow is
*affordable*; PR cycle time decides whether it is *useful*; onboarding time decides whether the repo
survives the founder stepping away (D10); and the agent-review acceptance rate is the **only** number that
can settle the CodeRabbit / Sourcery / Greptile / Ellipsis / open-code-review question without a purchase.

## 5. What we are missing → rows for `docs/PARITY.md`

The CEO merges these. The **Spoke (2026-10-20)** column is left **empty on every row**, and that is a
finding, not an omission: `docs/study/spoke/TEARDOWN.md` was read on 2026-10-21 and it documents
**public product behaviour only** ("No code, assets or private API were extracted", "Only public
sources") — Spoke's **internal** engineering workflow is not public, so no cell in that column can be
filled with a verified fact. Every row is a capability that the best repos in §1 have and we do not.

| # | Family | Feature | Status | Spoke (2026-10-20) | Our edge | Task |
|---|--------|---------|--------|----------|------|
| 1 | Engineering workflow | **Pre-commit gate**: the floor guard (`scripts/check-floor.mjs`) and the formatters run before a commit is created, not only in CI | Planned (task) | | a violation is caught in 2 seconds instead of 12 minutes | **T8.1** (new) |
| 2 | Engineering workflow | **Hash-verified skill installs**: `skills-lock.json` that actually verifies, so a skill cannot be swapped silently | Planned (task) | | the lock is the supply-chain boundary for every agent that writes to this repo | **T8.2** (new) |
| 3 | Engineering workflow | **Skill validation in CI** (`skills-ref validate` against the open Agent Skills spec) | Planned (task) | | our skills conform to a public format, not to a vendor's | **T8.3** (new) |
| 4 | Engineering workflow | **Version automation for `packages/`** (changesets), so a published package's version is derived from a written change | Planned (task) | | the version number is evidence, like everything else in `docs/evidence/` | **T8.4** (new) |
| 5 | Engineering workflow | **One workspace source of truth**: the dead `workspaces` array removed from `package.json`, and the `apps/web` entry removed or created | Planned (task) | | no drift between what CI installs and what the repo contains | **T8.5** (new) |
| 6 | Engineering workflow | **An explicit pnpm `nodeLinker` decision** for the Expo SDK 58 tree (isolated vs hoisted), written down with the Expo guide cited | Planned (task) | | the founder's Windows machine and the CI runner install the same tree | **T8.6** (new) |
| 7 | Engineering workflow | **`turbo.json` cache correctness**: `outputs` for `test`/`lint`/`typecheck`, `env`, `globalDependencies`, so a changed shared package cannot pass a stale cache | Planned (task) | | a green CI that did not run the tests is the worst outcome we could have | **T8.7** (new) |
| 8 | Engineering workflow | **Agent-in-the-loop PR review we host ourselves**, with the agent's output treated as untrusted (the Codex PR #187 lesson) | Planned (task) | | driver-adjacent source never leaves our infrastructure | **T8.8** (new) |
| 9 | Engineering workflow | **MCP servers pinned in the repo** (`.mcp.json` + a checksum), so an agent's tools are a reviewed file, not a machine's state | Planned (task) | | the tools an agent can call are part of the review | **T8.9** (new) |
| 10 | Engineering workflow | **Docs as a build artefact** (a self-hosted wiki generator over this repo) instead of docs that drift | Planned (task) | | `docs/` is already the source of truth; a generator keeps it honest | **T8.10** (new) |
| 11 | Engineering workflow | **An onboarding path for a new developer**: `CONTRIBUTING.md`, a first-PR checklist, and a measured time-to-first-green-PR | Planned (task) | | the repo must survive the founder stepping away (D10) | **T8.11** (new) |
| 12 | Engineering workflow | **CI minutes per PR measured and published**, per job | Planned (task) | | cost is a first-class metric, not a surprise on the bill | **T8.12** (new) |
| 13 | Engineering workflow | **Dependency update automation** (Renovate or Dependabot) with the pnpm 12 minimum-release-age policy respected | Planned (task) | | our own `minimum-release-age=10080` supply-chain rule is enforced by a bot, not by memory | **T8.13** (new) |
| 14 | Engineering workflow | **Multi-agent packaging** for the skills (`.codex-plugin/`, `.opencode/`, `hooks/`, `evals/`) instead of a hand-mirrored `.claude` + `.agents` pair | Planned (task) | | one source, many agents, each pinned and verified | **T8.14** (new) |
| 15 | Engineering workflow | **A PR template and an issue template** (none exist today) so every change states its evidence path | Planned (task) | | the D21 evidence rule is visible on the PR itself | **T8.15** (new) |

**Task id note:** `T8.x` is **new** — the highest existing id is **T7.15** (NZ Privacy Act PIA, store
assets, acceptance test, handover). The CEO owns the numbering; these rows are a proposal.

---

## 6. Decision

1. **Monorepo: KEEP pnpm 12.14.0 + Turborepo 2.11.9.** Both are the current release and our pins are
   exact. **ADR proposal (not a decision):** Nx is a credible 2026 alternative and its 24.x line is in
   beta, so the standing recommendation is *re-read Nx when the workspace passes ~10 packages or when CI
   minutes become the bottleneck* — not a migration.
2. **Fix the three sources-of-truth bugs this month** (no new tooling, all in existing files): delete the
   dead `workspaces` array from `package.json`, remove or create `apps/web`, and decide `nodeLinker`
   explicitly in `pnpm-workspace.yaml` with the Expo guide cited. **T8.5, T8.6.**
3. **ADOPT the pre-commit gate**: `evilmartians/lefthook` v2.2.2 + `lint-staged` v17.6.0, running Prettier
   and the floor guard on staged files only. lefthook is a single binary and needs no `prepare` script,
   which our `ignoreScripts: true` policy allows. **T8.1.**
4. **ADOPT `changesets/changesets`** for `packages/` versioning — `changeset version` only, never
   `changeset publish`. **T8.4.**
5. **ADOPT the open Agent Skills spec** (`agentskills.io`), validate our 25 skills with `skills-ref
   validate` in CI, and **fix `skills-lock.json` so its hash actually verifies**; install and update the
   skills with `vercel-labs/skills` in a **sandbox**, then copy the result in — never let an installer
   write into the working tree unattended. **T8.2, T8.3.**
6. **Widen the skills system from our locked source**: adopt upstream's multi-agent packaging
   (`.codex-plugin/`, `.opencode/`, `hooks/`, `evals/`) and carry the shared `references/` directory so the
   portability gap (§0.6) closes. **T8.14.**
7. **ADOPT `github/github-mcp-server` read-mostly and `upstash/context7`**, pinned in `.mcp.json` with
   checksums; treat agent output as untrusted. **T8.9.**
8. **Do NOT buy or adopt a review bot yet.** Take the three behaviours, not the product: the `greploop`
   shape, the reproduce-before-report rule, and the hand-a-finding-to-the-agent handoff. The purchase
   decision waits for **B5 (agent-review acceptance rate)**. **T8.8.**
9. **Keep ESLint 10 type-aware + Prettier.** Do not move to Biome 2 or oxlint-first until **B6** says the
   lint wall time is a problem — the type-aware rules are load-bearing under `CONSTRAINTS.md`.
10. **Keep vitest 4.1.11**; vitest 5 is in beta and 4.1.11 is where the `tinypool` fix lives.
11. **Stay on our own agent rules** (`AGENTS.md` + `CLAUDE.md`): the Cursor-rules ecosystem is a convention
    with no vendor and no standard (the largest repo is 3 576 ★ and was last pushed 2026-05-19).
12. **ADOPT Renovate or Dependabot** for dependency updates, respecting `minimum-release-age=10080` and
    `trust-policy=no-downgrade`. **T8.13.**

## 7. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| An installer (`npx skills add`) writes into the repo unattended and replaces a skill we pinned | **High** | Install into a scratch directory, diff it, copy in by hand; make `skills-lock.json` verify (T8.2); keep the CI floor guard as the last line |
| `skills-lock.json` proves nothing today — the hash matches neither copy | **High** | Fix the hash algorithm or scope, then re-lock (T8.2); until then, treat the lock as a **manifest, not a checksum** |
| The pre-commit hook makes committing slow on a Windows machine | Medium | Scope every job to **staged files**; keep the job list to Prettier + the floor guard; time it (B1) |
| A second linter (oxlint/Biome) weakens the "zero warnings, type-aware" bar | Medium | Do not adopt without B6; `CONSTRAINTS.md` is not to be weakened to make a change pass |
| The agent-in-the-loop review reads or writes source outside our infrastructure | Medium | `github-mcp-server` read-mostly, scoped to the fork; `disallow_unlisted_mcp_tools`; treat agent output as untrusted |
| The agent review burns model budget in every CI run | Medium | Scope the review to changed files (the Claude action's own fix, PR #1904); measure minutes and cost (B2) |
| `apps/web` is in the workspace but does not exist | Low | Remove the entry now (T8.5); a non-existent workspace path is a broken `pnpm install` waiting to happen |
| Nx's beta release train and cloud-only features pull us off a stable stack | Low | Stay on Turborepo; re-read Nx on a trigger, not on a trend |
| The repo has no `CONTRIBUTING.md`, so onboarding time is unknown and probably long | Medium | Write it, then measure with two people (B4) — D10 requires the repo to survive the founder |

## 8. Monthly radar filter

Run this list on the **first working day of each month**; each row has a trigger, not a feeling.

| Watch | Trigger | Action |
|---|---|---|
| `vercel/turborepo` | a release > 2 minors behind ours, or a new major | read the changelog; bump the pin; re-run B1 |
| `nrwl/nx` | a **stable** 24.x, or Nx Cloud pricing changes, or the plugin model reaches a stable Metro/Expo plugin | re-read §3.2 and re-cost the migration |
| `changesets/changesets` | a major, or a pnpm 13 | re-pin |
| `evilmartians/lefthook` / `lint-staged` | a major version | re-pin and re-run B1 |
| `vercel-labs/skills` | v2.x, or an `add` command that writes outside the target directory | freeze the installer; keep the manual copy-in path |
| `agentskills/agentskills` | a spec change (new frontmatter field, a new validator) | re-validate our 25 skills; update `AGENTS.md` if the trigger rules changed |
| `anthropics/skills` | a licence file appears, or the 1 424-issue backlog drops | re-read the licence before vendoring anything |
| `addyosmani/agent-skills` | a tag newer than `0.6.13` | re-lock; re-read the changelog for behaviour changes in `code-review-and-quality` and `constraint-driven-development` |
| `github/github-mcp-server` | v3, or a new write-scope tool | re-read the tool list; re-scope |
| `upstash/context7` | an index-poisoning incident, or a major | re-verify the index against the official docs |
| `alibaba/open-code-review` | a stable release, an English-first README, or a licence clarification | re-read §3.4; consider a **self-hosted** trial (never a hosted one) |
| `The-PR-Agent/pr-agent` | a v1 release, or a documented self-host path with no vendor account | re-cost against B5 |
| `coderabbitai/skills`, `greptileai/skills`, `sourcery-ai/sourcery` | a **self-hostable** engine, or pricing that fits D12 | re-run B5 before any purchase |
| `biomejs/biome` / `oxc-project/oxc` | an ESLint-10-compatible, type-aware path | re-run B6 |
| `vitest-dev/vitest` | vitest 5 goes stable | bump, re-run the audit, re-check the coverage ratchet |
| `expo/expo` | a monorepo-guide change about `nodeLinker` or autolinking | re-read the guide and re-decide T8.6 |
| **Ellipsis** | any public source, pricing, or self-host path appears | it was closed in 2026; re-check once a quarter |

## 9. What we could not verify

- **The 6-month star trend for every candidate** — the star timeline is 403 with our token (re-verified
  2026-10-21). Proxies used: releases/6 m, commits/90 d, distinct human maintainers/90 d, npm downloads.
- **Every timing number** — B1 to B7 are all **UNVERIFIED**. No CI run, no build, no lint and no test was
  executed as part of this research; the Researcher role has no runner and AGENTS.md forbids a local
  Android emulator.
- **The actual CI minutes** — the `timeout-minutes` values in our workflow YAML are **ceilings, not
  measurements**.
- **The onboarding time** — there is no `CONTRIBUTING.md` and no time-to-first-PR record; and there is no
  second developer to measure.
- **The agent-review acceptance rate** — no agent review has ever run on this repo; there is no baseline
  to compare a vendor against.
- **The `skills-lock.json` hashing algorithm** — the recorded `computedHash` matches neither the `.claude`
  nor the `.agents` copy of any of the 25 skills (both copies are byte-identical to each other). It is
  **UNVERIFIED** whether the hash covers the whole skill directory or only `SKILL.md`, and whether the
  lock is simply stale.
- **The licences of** `anthropics/skills` (no licence file detected), `anthropics/claude-code` (no licence
  file detected), `anthropics/claude-agent-sdk-typescript` (no licence detected), `vercel-labs/agent-skills`
  (no licence detected), `oraios/serena` (NOASSERTION), `modelcontextprotocol/servers` (NOASSERTION, a
  multi-licensed collection), `greptileai/cli` (no licence detected) and `coderabbitai/codex-plugin` (no
  licence detected). **None of these may be vendored until the licence file is read.**
- **Ellipsis** — no repository, no licence, no self-host path found; the product itself is **UNVERIFIED**
  beyond its public documentation.
- **The `greploop` "5/5 confidence" metric** — what it measures is **UNVERIFIED**; it is a vendor number.
- **Whether `pnpm` 12's `shamefully-hoist` + isolated `node_modules` actually breaks the RN 0.88 native
  module resolution for our tree** — the Expo guide says isolated installs *can* cause native build or
  resolution errors; whether it does for **our** set of native modules (MapLibre 11.3.7, VisionCamera 5.2.3,
  op-sqlite 18.2.5, Reanimated 4.7.1, Unistyles 3.5.3, sherpa-onnx 0.4.4) is **UNVERIFIED** and must be
  tested by building the APK (T3).
- **The 2026 state of `headwaymaps/headway` for our use** — one maintainer, no releases (that is a maps
  finding, recorded in the maps file).
- **`code-review-graph`'s "99 % fewer tokens"** and **`codebase-memory-mcp`'s "sub-ms queries"** — both are
  the projects' own claims; we have not reproduced either.
