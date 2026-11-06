# Evidence — setup-uv is pinned to one commit sha everywhere (BUG-220, audit 3i / C12)

**Step:** the 2026-11-05 audit's item 3i, finding C12 · **Branch:** `setup-uv-one-pin` ·
**Date:** 2026-11-05

## What was broken

`astral-sh/setup-uv` was referenced by **two different commit SHAs** in the same
tree:

```
ci.yml:76, codeql.yml:46, quality-gates.yml:191,242,262   → @d4b2f3b6ecc6e67c4457f6d3e41ec42d3d0fcb86 # v5
linz-changeset.yml:74, mutation.yml:45,70                 → @68559e99cc807c1eb7e9238fd43a15bba460eec2 # v10.3.3
```

The same tool ran as two versions depending on which workflow built you, and a
"bump setup-uv" PR that touched one list silently left the other. This is the
same class the emulator pins gate (`check-e2e-pins.mjs`) exists to prevent:
**a tool upgrade is one PR that moves all of the references, not one file's
worth.**

## What landed

- The four v5 references move to the v10.3.3 SHA (`68559e99…`) already used by
  `linz-changeset.yml` and `mutation.yml` — a version bump of an action already
  in the tree, so no new licence-inventory row and no lockfile change.
- `scripts/ci/check-setup-uv-pin.mjs` (a step in the `Floor guard` job) holds
  the rule:
  1. every `uses: astral-sh/setup-uv@…` ref is a full **40-hex commit SHA** (a
     tag or branch ref fails — the action's code can move under a moving ref
     without a commit);
  2. all of them are the **same** sha;
  3. at least one exists — an empty tree fails rather than passing vacuously;
  4. both step spellings are read (`- uses: …` and the two-line
     `- name: …` / `uses: …` form the workflows actually use).
- Its 5-case test runs with the rest of `scripts/*/__tests__`.

## Red first (PLAYBOOK §14)

```
$ git stash push -- .github/workflows          # the tree as it was
$ node scripts/ci/check-setup-uv-pin.mjs
BUG-220: the setup-uv pin gate fails over …/workflows (1):
- setup-uv is pinned to 2 different SHAs:
  d4b2f3b6ecc6e67c4457f6d3e41ec42d3d0fcb86 vs
  68559e99cc807c1eb7e9238fd43a15bba460eec2 - one tool, one pin: …
(exit 1)
```

## Green

```
$ node scripts/ci/check-setup-uv-pin.mjs
BUG-220: setup-uv is pinned to one commit sha across all 8 reference(s)
(68559e99cc80…) in workflows

$ node --test scripts/ci/__tests__/check-setup-uv-pin.test.mjs
5 tests, 5 pass

$ python -c "import yaml; …"     # ci.yml, codeql.yml, quality-gates.yml all parse
$ node scripts/ci/check-workflows.mjs
check-workflows: 14 workflows …
```

## Not claimed

That setup-uv v10.3.3 behaves identically to v5 in every job: that is what the
CI run of this PR is for (ci.yml, codeql.yml and quality-gates.yml all install
uv through the moved ref). The pin's job is that there is only one version to
reason about; the version's behaviour is verified by the runs that use it.
