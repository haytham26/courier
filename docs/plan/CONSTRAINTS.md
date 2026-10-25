# Constraints — Courier Copilot

Last reviewed: 2026-10-24 by the lead executor (V4 §2, skill `constraint-driven-development`): the
accepted-advisory table gained its Owner column and its never-permanent rule (an acceptance with no
owner, no review date, or a past review date now fails the gate). Previous: 2026-10-20.

This file is the project's written quality bar. **It is not weakened to make a change pass.**
Every number below names the command that produces the verdict.

## Floor (always enforced — no setup required)

- No new suppression comments: `@ts-ignore`, `@ts-expect-error`, `eslint-disable`, `# noqa`, `# type: ignore`
  (an existing one must carry an issue link).
- No unimplemented stubs: `throw new Error("Not implemented")`, empty `catch {}`, `TODO` where the
  implementation belongs.
- No skipped, deleted or weakened tests: no `.skip`, `.only`, `.todo` in a committed test file.
- No secrets in source, in logs, in `docs/`, or in a commit message.
- No `any` in TypeScript application code (`packages/`, `services/`, `apps/`).
- This file does not get weakened to make a change pass.

Checked by `scripts/ci/check-floor.mjs` (diff-scoped, exit 1 on a violation) — run in CI.

## Enforced with numbers

| Dimension | Rule | Checked by | Runs at |
|-----------|------|-----------|---------|
| Types (TS) | zero errors, `strict` + `noUncheckedIndexedAccess` | `pnpm typecheck` (`tsc --noEmit`) | every PR |
| Types (Python) | zero errors, `mypy` strict on `services/api/app` | `pnpm typecheck:api` | every PR |
| Lint (TS) | zero errors, zero warnings, type-aware rules | `pnpm lint` (`eslint .`) | every PR |
| Lint (Python) | zero errors | `pnpm lint:api` (`ruff check .`) | every PR |
| Format | Prettier and `ruff format --check` clean | `pnpm format:check` | every PR |
| Tests | all green, no skips | `pnpm test` (vitest + jest-expo + pytest) | every PR |
| Coverage | ratchet: ≥ 72 % lines on `packages/` + `services/`, ≥ 81 % on the address engine and the auth service (V4 target: 85 % / 90 % — gap tracked below) | `pnpm coverage` (vitest coverage + pytest-cov) then `scripts/ci/check-coverage.mjs` | every PR |
| Mutation (core modules) | ≥ 70 % mutation score on the address engine and the auth service | `pnpm mutation` (Stryker) | every PR (scoped to the changed files) |
| Floor | zero violations in the diff | `scripts/ci/check-floor.mjs` | every PR |
| Secrets | zero findings | `gitleaks detect --redact` (CI job `secrets`) | every PR |
| Dependency audit (JS) | zero high/critical advisories (the three documented build-time advisories are accepted) | `node scripts/ci/check-audit.mjs` | every PR |
| Dependency audit (Python) | zero high/critical advisories | `uvx pip-audit` | every PR |
| Static analysis (SAST) | zero high findings | `semgrep scan --config p/default --config p/owasp-top-ten` | every PR |
| Code scanning | zero high alerts | CodeQL (`codeql.yml`) | every PR |
| Licences | no GPL/AGPL/SSPL/Commons-Clause/CC-NC/FSL/BUSL in the shipped app; recorded in `docs/product/LICENSES.md` | `scripts/ci/check-licenses.mjs` | every PR |
| Android E2E | every Maestro flow green on the CI emulator, artifacts uploaded | `.github/workflows/android-e2e.yml` | every PR |
| Design review | Maestro screenshots (day/night, small/large, 200 % text) match the approved mockups | `docs/evidence/design/` | every UI task |
| Performance budgets | cold start ≤ 2 s; 300 stops at 60 fps; voice command → action ≤ 700 ms; route of 200 stops ≤ 5 s; APK ≤ 80 MB; battery ≤ 8 %/h | `docs/evidence/performance/` | every task that touches the path |

Numbers that are not yet enforced are in the table below — they are ratchets, not aspirations.

## Measured, not yet enforced (ratchets — must not fall)

| Metric | Today (2026-10-20) | Direction |
|-------|----------------------|-----------|
| Project coverage (JS/TS) | 72.1 % lines (`packages/` + `services/`) | must not fall; V4 target 85 % |
| Coverage of the address engine | 81.3 % lines | must not fall; V4 target 90 % |
| Coverage of the auth service | 81.4 % lines | must not fall; V4 target 90 % |
| Project coverage (Python) | 85 % lines (`services/api/app`) | must not fall; V4 target 90 % |
| Bundle size (mobile APK) | not built yet (T3) | ≤ 80 MB excluding the map/voice packs |
| Cold start (mid-range Android) | not measured yet (T3) | ≤ 2 s |
| Battery while driving | not measured yet (T7) | ≤ 8 %/h |
| Voice command → action | not measured yet (T7) | ≤ 700 ms on the on-device path |

### The coverage gap (V4 §2 target vs today)

The V4 target is 85 % overall and 90 % on the core modules; the suite has never reached those
numbers, so the **enforced** gate is the ratchet above (today's value) and the target stays the
goal. Owners: the Address squad (engine), the Payments squad (auth service), the Platform squad
(everything else). Closing the gap is a precondition of the v1.0.0 release, not of the next merge.

The largest known holes, with the file that has to grow:
`services/auth/src/index.ts` (0 % — the process entry point is exercised by a spawned process, which
the coverage tool cannot instrument), `services/api/app/main.py` (73 % — the API surface is still a
stub), `services/api/app/agents/copilot.py` (64 % — the LLM call path needs a fake client).

## Exceptions

| ID | Rule | Path | Reason | Owner | Expires |
|----|------|------|--------|-------|---------|
| W1 | `any` allowed in the mobile app until the voice module is rewritten | `apps/mobile/src/voice/**` | The voice module predates the typed rewrite (BUG-040) | lead executor | 2026-12-01 |
| W2 | `mypy` not in strict mode for the LangGraph intake graph | `services/api/app/agents/intake_graph.py` | LangGraph's node typing has no strict-mode overload (see the inline note) | lead executor | 2026-12-01 |
| W3 | Semgrep: the pnpm/npm supply-chain rules, the read-only-filesystem rule | `.npmrc`, `pnpm-workspace.yaml`, `docker-compose.yml` | The rules expect the pnpm 10 settings; pnpm 12 verifies the lockfile with its own policy and the versions are pinned exactly. The stateful services must write to their data volume. The scan command in `quality-gates.yml` lists every exclusion. | lead executor | 2026-12-01 |
| W4 | Semgrep: the loopback HTTP and the child-process rules | `services/auth/src/__tests__/server.test.ts` | The test server listens on 127.0.0.1 and the spawned commands come from this repository, never from user input. | lead executor | 2026-12-01 |
| W5 | Semgrep: the uv cooldown, the non-literal regexp of a test, the HTML escaper of the render script and the token counter of the voice service | services/api/pyproject.toml, services/courier-voice/pyproject.toml, apps/mobile/app/design/__tests__/routes.test.tsx, scripts/design/build-direction-renders.mjs, services/courier-voice/app/engines/omniroute.py | The security patches have to land the day they are published; the regexp is built by a test from the name it tests; the flagged line IS the HTML escaper; the log carries the number of tokens and the cost, never a token. The Semgrep job had never run (the workflow file was invalid YAML), so these findings are the first run of that gate. | lead executor | 2026-12-01 |

### Accepted dependency advisories (build-time only, no upstream fix)

`scripts/ci/check-audit.mjs` fails on every high/critical advisory except these three, which live in the
build toolchain and never reach the shipped app:

| Package | Severity | Why it is accepted | Owner | Review by |
|---------|----------|---------------------|-------|-----------|
| `braces` | high | `metro-file-map` (the React Native bundler's file matching) — build time only, no patched version | Platform squad | 2026-12-01 |
| `node-forge` | high | `@expo/cli` code signing during the Android build — build time only, no patched version | Platform squad | 2026-12-01 |
| `zod` | high | `@expo/cli`'s own direct dependency (the expo build toolchain: prebuild, metro, the bundling the E2E APK build uses) — build time only; the patched line (`zod@4.6.6`) is a major version `@expo/cli` does not declare on the pinned expo line | Platform squad | 2026-12-01 |

**An acceptance is never permanent.** The gate refuses an allow-list entry that carries no owner, no
review date, or a review date already in the past: those are reported as `MALFORMED ACCEPTANCE` and
fail the gate, so the date cannot be pushed forward after it has lapsed. The owner is the one who
re-attempts the upstream fix; the review date is when that attempt is due. The contract is asserted by
`scripts/ci/__tests__/check-audit.test.mjs` (8 tests), which also fails if an entry is added to the
repository's own list without both.

`braces` currently produces no high/critical advisory — the entry is kept so the gate's answer is
unchanged if the feed returns it, and it is still reviewed by its date.

The two criticals that were in the tree (`tinypool` prototype pollution, reachable through the
test runner) are **fixed**: the test runner moved to `vitest@4.1.11`, which no longer pulls the
vulnerable `tinypool`.

## How to run the checks locally

```bash
pnpm check:fast      # types + lint + floor guard (seconds)
pnpm check:task      # fast + the related tests
pnpm check:full      # everything CI runs, including the audit and the scanner
```

The scripts mirror this file. **If they drift, this file wins.**
