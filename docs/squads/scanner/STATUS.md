# Label Scanner Squad - status

Updated: 2026-10-21 (the evaluation set is built; the founder photos are still missing)

## Done (with evidence)

- Squad skeleton, targets and evaluation plan created.
- The evaluation set: `packages/eval/scanner/` - the manifest (370 label slots, 330 of them
  synthetic with their ground truth), the field catalogue with the acceptance rules, the licence
  ledger, the builder, the drawing of the synthetic labels and the integrity check
  (`node scripts/eval/check-scanner-eval.mjs`, wired into the floor guard job in
  `.github/workflows/quality-gates.yml`). The images live in `data/labels/synthetic/` and are not
  committed.

## Metrics vs targets

| Metric | Target | Today | Evidence |
|--------|--------|-------|----------|
| _(not measured yet)_ | see README | - | - |
| evaluation set size | >= 300 labels | 330 synthetic labels, 40 slots for the founder | `packages/eval/scanner/manifest/slices.json` |

## Next

1. Build the benchmark (the harness that turns an engine's output into M1-M8).
2. Get the 40 redacted label photos from the founder and annotate their ground truth.
3. Measure the baseline and publish the first numbers.

## Risks

- The evaluation data for some squads needs founder-provided material (redacted label photos, real
  shift days); until then the benchmark uses synthetic and public data and says so.
- The synthetic labels hold no name of a real person and no real phone number, so they are less
  realistic than a real label; the barcode on them is a drawn pattern, not a scannable symbol.
  Both gaps close when the founder's photos arrive.
