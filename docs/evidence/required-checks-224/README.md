# Evidence — the exact required status checks for `protect-main` are written down (BUG-224, audit 3j)

**Step:** the 2026-11-05 audit's item 3j · **Branch:** `required-checks-224` · **Date:** 2026-11-06

## What was broken

The `protect-main` ruleset (founder directive 2026-10-28) requires **0 status checks**, so nothing at
the repository level forces a PR through the gates — a PR can merge with CI red, Quality gates red,
or a check missing entirely. And the exact check names GitHub reports (workflow `name:` + `/` + job
name) were written down nowhere; they had to be discovered from a PR's checks list one by one.

## What landed

A new section in `docs/status/FOUNDER_TODO.md` — **"The required status checks for `protect-main`"
(audit item 3j, 2026-11-06)"** — plus a row in the "Now" table pointing at it. The list, derived on
2026-11-06 from every workflow file's `name:` line, `jobs:` keys and `pull_request` trigger:

**Run on every PR (the recommended required list):**

```
CI / quality
CI / secrets
Quality gates / floor
Quality gates / coverage
Quality gates / licences
Quality gates / audits
Quality gates / sast
CodeQL / analyse
android-e2e / changes
android-e2e / build
android-e2e / e2e
android-e2e / a1
```

- `android-e2e / build|e2e|a1` report **skipped** on PRs that touch neither the app nor the flows
  (the `changes` job's outputs, audit item 3g); a skipped check does not block a merge, so listing
  them is safe and gates every app-touching PR on the emulator.
- Path-limited (skipped on most PRs, gate only their paths): `Restore test / restore` (`infra/**`),
  `Screen recordings (13 reference screens) / build`, `/ record`.
- **Cannot** be required on PRs because they have no `pull_request` trigger:
  `Deploy staging / verify|deploy`, `Staging smoke / smoke`, `Main APK / apk`, `Release APK / apk`,
  `Store readiness / store-ready`, `Mutation floor / api|voice`,
  `LINZ weekly changeset / weekly-import`, `Map pack (the Canterbury offline pack, D26) / build`,
  `android-e2e-health / build|measure|report`.

## Derivation (how each name was read from the files)

| Workflow file | `name:` | `pull_request` trigger | jobs |
|---|---|---|---|
| `ci.yml` | `CI` | yes (no filter) | `quality`, `secrets` |
| `quality-gates.yml` | `Quality gates` | yes (no filter) | `floor`, `coverage`, `licences`, `audits`, `sast` |
| `codeql.yml` | `CodeQL` | yes, `branches: [main]` (every PR targets main) | `analyse` |
| `android-e2e.yml` | `android-e2e` | yes (paths removed in 3g; job-level `changes` filter) | `changes`, `build`, `e2e`, `a1` |
| `restore-test.yml` | `Restore test` | yes, paths `infra/**` | `restore` |
| `screen-recordings.yml` | `Screen recordings (13 reference screens)` | yes, paths | `build`, `record` |
| all others | — | no `pull_request` | — |

Check-run names are `<workflow name> / <job name>` (all these workflows set `name:`); the ruleset's
required-checks picker shows the same strings verbatim, so the founder can confirm each one there.

## Not claimed

That the ruleset now HAS the required checks — setting them is a Settings UI action only the founder
(or a token with Administration: write) can do; it stays a FOUNDER_TODO row. Until then the merge
ritual remains habit-enforced, which this row records.
