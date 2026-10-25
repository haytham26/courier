# Payments & Accounts Squad - status

Updated: 2026-10-20 (squad created, V4 bootstrap)

## Done (with evidence)

- Squad skeleton, targets and evaluation plan created.

## Metrics vs targets

| Metric               | Target     | Today | Evidence |
| -------------------- | ---------- | ----- | -------- |
| _(not measured yet)_ | see README | -     | -        |

- **ADR-017 / D45 (2026-10-26, backend squad).** The entitlement layer exists: the plan vocabulary,
  the state machine (with the grace window that keeps a courier whose card is failing working) and
  `GET /account/entitlements`, with `subscriptions` in the schema and the source recorded rather
  than decided on. 356 passed + 14 db tests. The provider clients, the paywall UI, Team org billing
  and GST are the next slices, behind the founder's switches.

## Next

1. Build the evaluation dataset and the benchmark.
2. Research the 2026 candidates (V4 §3) and record the decision.
3. Measure the baseline and publish the first numbers.

## Risks

- The evaluation data for some squads needs founder-provided material (redacted label photos, real
  shift days); until then the benchmark uses synthetic and public data and says so.
