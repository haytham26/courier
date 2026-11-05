# Evidence — every action is pinned by commit sha, and a gate holds it (BUG-222, audit 3i / C10)

**Step:** the 2026-11-05 audit's item 3i, finding C10 · **Branch:** `action-digest-pins` ·
**Date:** 2026-11-05

## What was broken

Nothing *in the tree* was broken: all 116 `uses:` refs across the 14
workflows were already full 40-hex commit SHAs. What was broken is that
**nothing asserted it** — the next action added as `actions/checkout@v4`
would have been green, and a tag can be re-pointed (maliciously or by
accident) so that every workflow using it runs new code **with no commit in
this repository**. Pinning was a convention each author followed, and the
audit's whole point is that prose and convention nothing asserts is not a
control.

## What landed

`scripts/ci/check-action-pins.mjs` (a step in the `Floor guard` job) holds
the rule over every workflow:

1. every `uses:` ref is `owner/repo@<40-hex commit sha>` — a tag (`@v4`), a
   branch (`@main`) or a short sha all **fail**, named with `file:line`;
2. a `docker://` image must carry a `@sha256:` digest;
3. a local `./.github/actions/...` ref passes — it is reviewed with the code
   that uses it;
4. both step spellings are read (`- uses: …` and the two-line
   `- name: …` / `uses: …` form);
5. an empty tree fails rather than passing vacuously.

No workflow file changed in this PR: the tree was already compliant, and the
PR's value is that the next ref cannot be added unpinned.

## Red first (PLAYBOOK §14)

A fabricated workflow carrying a tag ref next to a pinned one:

```
$ node scripts/ci/check-action-pins.mjs <temp-dir-with-demo.yml>
exit 1
BUG-222: the action pin gate fails over … (1):
- demo.yml:5: "actions/checkout@v4" is not pinned to a full 40-hex commit sha -
  a tag or branch ref can be re-pointed and run new code with no commit in this
  repository
```

(The 8-case test carries the same case plus branch refs, short shas, docker
digests, local actions, both spellings and the empty tree.)

## Green

```
$ node scripts/ci/check-action-pins.mjs
BUG-222: all 116 uses: ref(s) in workflows are pinned to a commit sha
(or a digested image / local action)

$ node --test scripts/ci/__tests__/check-action-pins.test.mjs
8 tests, 8 pass

$ node scripts/ci/check-workflows.mjs
check-workflows: 14 workflows …
```

## Not claimed

That a SHA pin is unimpeachable: a pinned commit can still be malicious if the
upstream repo is compromised before the pin — that is what dependabot (C14,
the next PR) and review are for. The pin's job is that the code a workflow
runs is the code a commit in *this* repository pointed at, reviewable in the
diff that introduced it.
