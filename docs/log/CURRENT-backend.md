# CURRENT — backend squad (read this first)

Updated: 2026-10-26 · main at `2013e76` · **Queue 2 is closed (items 1–7), BUG-063 and BUG-064 are
closed, the entitlement layer (ADR-017/D45) and the provider ingest (ADR-018/D46) are merged.**

## Merged this week (queue 2 and the fixes on top of it)

| Item                                                              | PR  | ADR / register |
| ----------------------------------------------------------------- | --- | -------------- |
| The quality audit (the contract whole + the drift guard)          | #26 | —              |
| The database in CI (PostGIS suite, drill, the SLO profile)        | #27 | —              |
| The POD object storage                                            | #31 | ADR-011 / D38  |
| The location notes                                                | #33 | ADR-012 / D39  |
| The voice intake                                                  | #34 | ADR-013 / D40  |
| The sync conflict rules                                           | #35 | ADR-014 / D41  |
| The ASVS password rows                                            | #39 | ADR-015        |
| **BUG-063** — the sync batch's cost after ADR-014                 | #46 | BUG-063        |
| The map pack pipeline                                             | #43 | ADR-016 / D42  |
| **BUG-064** — the map-pack build ran on a feature-branch push     | #51 | BUG-064        |
| The entitlement layer (D44's backend half)                        | #50 | ADR-017 / D45  |
| **The billing providers** (one fact shape, three signature rules) | #54 | ADR-018 / D46  |

## The §16 ownership note (this session)

- **The Locust SLO profile, the Postgres suite, the restore drill and the CI steps that test them are
  the backend's.** BUG-063 was a sync SLO breach my own ADR-014 change caused; BUG-064 was my own
  workflow's trigger. Both were mine to find and fix, and both are merged.
- **The Android E2E workflow is the lead's.** Several PRs this session carried an api-34/api-35 leg
  red with `Unable to connect to adb daemon` (PLAYBOOK §11's known noise); each time the failed leg
  was rerun per §19.1 (twice at most) and the lead's paths were never investigated or touched. PR #54
  merged with that leg red after two reruns, because the diff touched **no** mobile or E2E surface
  and its own backend steps were green on the same head.

## Next in the queue (§4 order)

1. The billing provider slices behind the founder's switches: the store verifiers (Play first, per
   D44, through the RevenueCat-shaped layer), the purchase-id-to-courier directory that narrows the
   trust boundary ADR-018 §3b names, and `stripe-mock` tests for the Stripe source.
2. The admin/ops console API, server push, privacy analytics, the voice eval runs.
3. The staging plan, and the open BUGS.md rows from BUG-065.
