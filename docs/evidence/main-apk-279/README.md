# BUG-279 evidence — main-apk.yml invalid YAML since b80cfb2 (A5)

## The symptom

Every `Main APK` run failed with conclusion `failure`, run name = the file path (`.github/workflows/main-apk.yml`), **0 jobs** — e.g. 42491630232 (push, main), 42494123277 (push). That signature means GitHub refused the workflow file before creating any job, on every event, including pushes to main (§17 violated: main silently red).

## The root cause (two errors on one line)

`.github/workflows/main-apk.yml:113` (added by `b80cfb2`, BUG-272):

```
          cache: ${{ steps.urls.outputs.configured == 'yes' ? 'pnpm' : '' }}
```

1. The value is a YAML _plain scalar_ containing `": "` — not valid YAML (`mapping values are not allowed here`, pyyaml at 113:70; js-yaml `bad indentation of a mapping entry (113:70)`). GitHub's parser refuses the whole file.
2. Even quoted, `?:` is not a GitHub expression operator — the expression would fail at evaluation. The conditional form GitHub supports is `&&` / `||`.

The old `check-workflows.mjs` (BUG-067) read the file line by line and placed every line, so it reported the broken file clean — the gate could not see a plain-scalar defect.

## Red first

`red-before.log`: with the new rules added to `check-workflows.mjs` but the workflow NOT yet fixed, `node scripts/ci/check-workflows.mjs` exits 1 naming `main-apk.yml:113` with 2 violations (the YAML parse error and the ternary), and `node --test scripts/ci/__tests__/check-workflows.test.mjs` exits 1 (the real-tree tests fail on the same line). `red-before-tests.log` records that; the fixture reproduction (pre-fix file from `git show origin/main:.github/workflows/main-apk.yml`) is appended to `red-before.log`.

## The fix

Line 113 → `cache: ${{ steps.urls.outputs.configured == 'yes' && 'pnpm' || '' }}` with a comment naming BUG-279. The gate now carries three rules: (4a) no unquoted plain scalar carries `": "` — zero dependency, because the floor job of `quality-gates.yml` runs the script with no `node_modules`; (4b) where `js-yaml` is installed (the lint and test jobs) the whole file is parsed with it (`js-yaml@4.3.2`, exact-pinned devDependency — already resolved in `pnpm-lock.yaml`, MIT, on the licence allow-list); (5) no `?` inside a `${{ }}` expression. The gate already runs in `quality-gates.yml` and the tests in `test:store-readiness`, so the regression is gated in CI.

## Green

`green-after.log`: gate exit 0 — `check-workflows: 16 workflows parse as YAML, carry only keys GitHub accepts, ...`. `green-after-tests.log`: exit 0, `# tests 25 / # pass 25 / # fail 0`. Independently, pyyaml parses all 16 workflow files with 0 errors. `zero-dependency-proof.log`: a byte-identical copy of the gate placed where `js-yaml` resolves to nothing — the pre-fix file still fails (2 violations, exit 1) while the fixed file and the whole tree pass (exit 0), so the floor job's no-node_modules environment is covered. Why the second layer exists: the first version of this fix imported `js-yaml` unconditionally and the floor job died with `ERR_MODULE_NOT_FOUND` (PR #285, run 42532246146) — a gate that cannot run is not a gate. Post-merge proof (green Main APK run on main + the APK link or the skip notice) is recorded in `docs/log/CURRENT-backend.md`.
