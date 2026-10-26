# CURRENT — backend squad (read this first)

Updated: 2026-10-26 · main at `47f4d25` · **Queue 2 is closed (items 1–7), BUG-063 and BUG-064 are
closed, and the entitlement layer (ADR-017/D45) is merged.**

## Merged (queue 2 and the fixes on top of it)

| Item                                                          | PR            | ADR / register |
| ------------------------------------------------------------- | ------------- | -------------- |
| The quality audit, the database in CI, the POD object storage | #26, #27, #31 | ADR-011 / D38  |
| The location notes                                            | #33           | ADR-012 / D39  |
| The voice intake                                              | #34           | ADR-013 / D40  |
| The sync conflict rules                                       | #35           | ADR-014 / D41  |
| The ASVS password rows                                        | #39           | ADR-015        |
| **BUG-063** — the sync batch's cost after ADR-014             | #46           | BUG-063        |
| The map pack pipeline                                         | #43           | ADR-016 / D42  |
| **BUG-064** — the map-pack build ran on a feature-branch push | #51           | BUG-064        |
| **The entitlement layer** (D44's backend half)                | #50           | ADR-017 / D45  |

## What the entitlement layer is, and what it is not

ADR-017: one truth per courier, gated on "is this subscription active" and never on how it was paid.
`GET /account/entitlements` answers `active`, the plan and the feature set; `subscriptions` in the
schema stores the row with the source recorded rather than decided on; the state machine keeps a
courier whose card is failing working through the grace window, and a cancelled subscription covers
the days it paid for.

**Not in it:** no provider client (Play, StoreKit, Stripe — the founder's switches, with `stripe-mock`
tests when they land), no paywall UI, no Team org billing or seats, no GST. The unmodelled provider
events (`reactivated`, `transferred`, plan changes) are named as a known hole in ADR-017 §3b rather
than falling through silently.

## The §16 ownership note

- **The Locust SLO profile, the Postgres suite, the restore drill and the CI steps that test them are
  the backend's.** BUG-063 (a sync SLO breach my own ADR-014 change caused) was mine to find and fix.
- **The Android E2E workflow is the lead's.** Its api-35 legs carried the known adb-daemon noise on
  several PRs; each time the failed leg was rerun per §19.1 and passed, and the lead's paths were
  never touched.

## Next in the queue (§4 order)

1. The billing provider slices behind the founder's switches (Play first, Stripe and Team after),
   with `stripe-mock` tests, and the Team slice's `(source, source_id)` uniqueness question.
2. The admin/ops console API, server push, privacy analytics, the voice eval runs.
3. The staging plan, and the open BUGS.md rows from BUG-065.
