# Evidence — the accepted-advisory follow-ups (2026-10-24)

The two catch-ups the founder queued in `docs/status/BUGS.md`, both now closed with a gate rather
than with a sentence. Week: 2026-W43.

| # | Item | Command | Result | Evidence |
|---|---|---|---|---|
| 1 | `zod` (and every accepted advisory) gets an **owner and a review date** in the audit allowlist, never a permanent accept | `node --test scripts/ci/__tests__/check-audit.test.mjs` | **8/8 pass** | below |
| 2 | `litellm 1.103.7` carries **no open advisories** before the downgrade is kept | `uvx pip-audit -r requirements.txt --strict` (the CI export) | **No known vulnerabilities found** | below |

## 1. The allowlist: an owner, a review date, and a date that cannot be pushed forward

The gate already carried `reviewBy: 2026-12-01` on its three accepted advisories and the
CONSTRAINTS.md table said the owner was required — but **no entry had one, and nothing enforced
either field**. An acceptance with no owner is one nobody re-attempts, and a `reviewBy` that nobody
checks is a permanent accept, which the founder's follow-up forbids.

`scripts/ci/check-audit.mjs` now:

- carries `owner: 'Platform squad'` on every entry;
- exports `evaluateAdvisories(advisories, { now, allowList })`, so the contract is testable without
  the registry (the CLI path is guarded by `import.meta.url === pathToFileURL(process.argv[1])`, so a
  test importing it does not run `pnpm audit` and `process.exit` under the suite);
- reports an entry with **no owner, no review date, or a review date already in the past** as a
  `MALFORMED ACCEPTANCE` and **fails the gate**;
- asserts the repository's own list, so an entry added without both fails before a merge can ride it.

`docs/plan/CONSTRAINTS.md` gained the Owner column and the never-permanent rule; the scripts README
gained the line for the new test.

### The tests (8, all pass)

```
✔ an acceptance carrying an owner and a future review date passes
✔ an acceptance without an owner fails the gate
✔ an acceptance whose review date has passed fails the gate
✔ an acceptance with no review date fails the gate
✔ a high advisory that is not on the list still fails the gate
✔ advisories below high are ignored, as before
✔ the repository allow list carries an owner and a finite review date on every entry
✔ the allow list is non-empty: an empty list is how a gate gets fooled
ℹ tests 8  ℹ pass 8  ℹ fail 0
```

Two findings from running the real gate, both recorded rather than tidied away:

- **`braces` no longer produces a high/critical advisory.** Only `node-forge` and `zod` do. The entry
  is kept: removing it would let a returning feed red the gate, and the bar is not lowered by an entry
  that does not fire. It keeps its owner and its review date, so the next review sees it.
- **`zod`'s `patched_versions` is `>=4.6.6`** — a patched line does exist. The acceptance rests on
  `@expo/cli` not declaring it on the pinned expo line, which is what the reason says, so the record
  stays accurate and the reason is now precise in CONSTRAINTS.md.

### The gate on the real tree

```
$ node scripts/ci/check-audit.mjs
  accepted: node-forge (high) — build-time only: @expo/cli code signing during the Android build.
  It never reaches the shipped app; no patched version exists. (owner: Platform squad, review by 2026-12-01)
  accepted: zod (high) — build-time only: @expo/cli's OWN direct dependency (the expo build
  toolchain - prebuild, metro, the bundling the E2E APK build uses). It never reaches the shipped app;
  the patched line is a major version @expo/cli does not declare, so no patched version exists on the
  pinned expo line. (owner: Platform squad, review by 2026-12-01)
check-audit: no unaccepted high or critical advisory
(exit 0)
```

## 2. The litellm downgrade is clean

`filelock` was constrained (`[tool.uv] constraint-dependencies`) because a patch exists, which forced
`litellm` down from 1.106.0 to 1.103.7 (1.106.0 pins `filelock<4`). The founder's follow-up requires
that check to be recorded before the downgrade stays. Run exactly as the Quality gates job runs it:

```
$ uv export --directory services/api --quiet --format requirements-txt --no-hashes --no-emit-project > requirements.txt
$ uvx pip-audit -r requirements.txt --strict
uvx : No known vulnerabilities found
```

So the pinned `litellm==1.103.7` carries no open advisory and the downgrade stays. `litellm` is a
declared dependency of `services/api` only — its own suite is 160 passed / 1 skipped, run in this
tree during the same session.

## Skills applied

| Step | Skill | How it changed the work |
|---|---|---|
| The gap in the gate | `constraint-driven-development` | The founder's own words — "never a permanent accept" — are now a failing gate, not a line in a table; the entry that does not fire (`braces`) was kept rather than quietly dropped. |
| The tests | `test-driven-development` | The seven contract tests were written and failed first (the import did not even exist), then the evaluator was written to satisfy them. |
| Making the gate testable | `debugging-and-error-recovery`, `code-simplification` | The first test run reported `tests 1, pass 1`: importing the module ran `pnpm audit` and `process.exit(0)` under the suite. The CLI moved behind an `import.meta.url` guard, which is also why the evaluator is now a pure function. |
| The record | `documentation-and-adrs` | Both findings (the inert `braces`, the precise `zod` patched line) are recorded here instead of being silently corrected. |
