# Evidence — the deploy's rsync keeps the tree (BUG-212, audit item 3a)

**Step:** the 2026-11-05 audit's item 3a · **Branch:** `deploy-rsync-relative` ·
**Date:** 2026-11-05

## What was broken

`.github/workflows/deploy.yml`'s deploy step ran:

```
rsync -az --delete -e "ssh ..." \
  infra/ services/ packages/ "user@host:/opt/courier/"
cd /opt/courier/infra && bash deploy.sh apply
```

With the **trailing slashes** rsync copies the *contents* of each of the three
folders flat into `/opt/courier`, so `/opt/courier/api` lands where
`/opt/courier/services/api` belongs, and `--delete` then removes every target
path the flat list does not carry. The next command `cd /opt/courier/infra`
therefore fails on a directory that never arrived.

The deploy leg is skipped without the OCI host and key (`FOUNDER_TODO`), which
is exactly why this survived: the command has never run against a real host.

## What landed

```
rsync -az --delete --relative -e "ssh ..." \
  infra services packages "user@host:/opt/courier/"
```

`--relative` recreates the tree (`infra/`, `services/`, `packages/` each keep
their own level, and `services/api/app` arrives whole) and `--delete` trims
inside it, so the directory the deploy steps into is the directory that arrives.

`scripts/ci/check-deploy-rsync.mjs` (step in the `Floor guard` job of
`quality-gates.yml`) makes it a gate:

1. the rsync names `infra`, `services` and `packages` **without** trailing
   slashes and carries `--relative`;
2. the deploy still cds the directory it sends (`/opt/courier/infra`);
3. both command shapes are run against a **scratch target directory** — the
   old one is asserted to produce the broken layout, the new one the correct
   one.

## The scratch-directory proof

On CI's ubuntu runner (and any developer machine with rsync installed) the
proof runs the real rsync twice:

```
old: rsync -az --delete           infra/ services/ packages/ scratch/old-target/
new: rsync -az --delete --relative infra services packages scratch/new-target/
```

and then asserts:

```
old: /opt/courier/infra does not exist            <- the deploy's own cd fails
     services/api/app/main.py landed flat         <- the tree was flattened
new: /opt/courier/infra, services, packages exist  <- the layout the deploy uses
     services/api/app/main.py arrives whole
```

The proof is refused from going vacuous: if the old shape ever produces a
*correct* layout the gate fails, because then either rsync changed the meaning
of its own trailing slash or the proof no longer shows the bug it exists to
show.

On a machine without rsync (the developer's Windows shell this was written on)
the same two shapes are run against a **simulation of rsync's documented
semantics** (a source with a trailing slash contributes its contents;
`--relative` contributes the folder itself), and the gate says so in its
output. The simulation proves rsync's documented behaviour, not a run of rsync;
the real rsync runs the same proof on the runner.

## Red first (PLAYBOOK §14)

```
$ node scripts/ci/check-deploy-rsync.mjs   # against the workflow as it was
- the rsync has no --relative: the three folders are copied flat into the target
- the rsync names infra/ WITH a trailing slash: rsync copies the folder's
  CONTENTS, so /opt/courier/infra never appears and the deploy's own
  `cd /opt/courier/infra` fails
  ... (services/, packages/ the same)
1   (exit)
```

The gate's test asserts the same property against fabricated workflows:
`scripts/ci/__tests__/check-deploy-rsync.test.mjs` (5 cases, all green).
