# Evidence — Node 24 declared once, everywhere (BUG-221, audit 3i / C11)

**Step:** the 2026-11-05 audit's item 3i, finding C11 · **Branch:** `node-24` ·
**Date:** 2026-11-05

## What was broken

The runner's Node was declared in **thirteen places** — `node-version: 22`
across 8 workflows — and `package.json`'s `engines.node` said `>=22.0.0`
separately. The runner's version and the engine floor could drift apart one
edit at a time, and the tree sat two majors behind the current LTS while the
audit asked for Node 24. The same split the setup-uv pin had (BUG-220).

## What landed

- All thirteen `node-version:` lines say **24** (ci, codeql, main-apk,
  release-apk, store-ready, screen-recordings, quality-gates ×4,
  android-e2e ×2, android-e2e-health).
- `package.json`'s `engines.node` is `>=24.0.0` — the diff is that one line.
- `scripts/ci/check-node-pin.mjs` (a step in the `Floor guard` job) holds the
  rule:
  1. every `node-version:` line in every workflow declares the **same** major;
  2. it equals the exported `NODE_MAJOR` constant (24) — a bump is one PR that
     moves the constant, every line and the floor together;
  3. `package.json`'s `engines.node` floor is the same major;
  4. an empty tree fails rather than passing vacuously.
- Its 5-case test runs with the rest of `scripts/*/__tests__`.

## Red first (PLAYBOOK §14)

```
$ git stash push -- .github/workflows package.json     # the tree as it was
$ node scripts/ci/check-node-pin.mjs
BUG-221: the Node pin gate fails (14):
- android-e2e-health.yml:50: node-version: 22 - the pinned major is 24; …
- android-e2e.yml:215: node-version: 22 - …
- … (all thirteen lines named) …
- package.json engines.node is ">=22.0.0" …
(exit 1)
```

## Green

```
$ node scripts/ci/check-node-pin.mjs
BUG-221: Node 24 is declared by all 13 node-version line(s) and matches
package.json's engines floor

$ node --test scripts/ci/__tests__/check-node-pin.test.mjs
5 tests, 5 pass

$ python -c "import yaml,glob; [yaml.safe_load(open(f)) for f in glob.glob('.github/workflows/*.yml')]"
(all 14 workflows parse)
$ git diff package.json        # the one engines line
```

## Not claimed

That every dependency supports Node 24: that is what this PR's own CI run is
for — every job above installs Node through the moved lines, so a dependency
that breaks on 24 fails here, in the open, rather than on a courier's laptop.
pnpm 12 and the Expo SDK line in the lockfile were already running on 22+; the
lockfile itself is unchanged (no new dependency), so no licence-inventory row
is needed.
