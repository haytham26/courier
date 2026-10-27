# The queue, closed — and the one step left, named

**Main is at `43ac576`, clean, no branches of mine open.** Every item from the audit's binding order
is merged except the last step of A5, which is handed over in `docs/log/HANDOVER-2026-10-28-A5.md`.

## Landed, each with the ritual (branch → PR → green checks → merge commit → archive tag → delete)

| Item | PR | Merge |
|---|---|---|
| **BUG-067** — the map-pack workflow could not start, and BUG-064's guard took the blame | #61 | `551bee6` |
| **Your ownership correction** — §16 was right, the note was wrong; corrected in the register and PR #60 | #60, #62 | `ac22874`, `a82ebe1` |
| **A1's handover** to the lead's app side | (recorded) + #62 | `045185b` + `a82ebe1` |
| **A5's first slice** — the staging stack, the two service images, the deploy, the smoke test (ADR-020/D49) | #65 | `d12231c` |
| **B3's first item** — the WebSocket token out of the query string (the module's half) | #75 | `a2b6a44` |
| **The deploy's env file, at every compose call** | #80 | `42f811b` |
| **The deploy's scripts through bash** (they are committed 100644; a direct call exits 126) | #81 | `cea6331` |
| **A5's auth migration** (ADR-021) | #82, #84 | `c686c31`, `d752862` |
| **The ledgers and the handover** | #66–#78, #86 | — |

## What the proof runs showed

- **BUG-067's cause**, found by bisect, not theory: `if-no-files-found` is an *input* of
  `actions/upload-artifact` written at a **step's own level**, and GitHub refuses the whole workflow
  file — 65 runs, 0 seconds, no jobs, no log naming the line. Two dispatches and the merge commit's
  own push run now go through checkout, the pinned Java runtime, the tools, the extract and the plan,
  and stop only at the **licence gate**, which refuses by design until you confirm Geofabrik's terms.
- **A5's stack on the runner**: both images build, the compose renders, the API's migration applies,
  and the **API container reaches `Healthy`**. It stopped at the auth service's own tables, which is
  the one step left.

## The one step left, in full (the handover's three steps)

The auth service's tables are a second migration in the same database. The `@better-auth/cli` cannot
be the tool: every version pins its own `better-auth` (1.4.21), which adds a second vulnerable copy
and the dependency-audit gate goes red (that is why #85 was closed rather than merged). Better Auth
**1.7.10** — the workspace's own, patched version — exports `getMigrations` from
`better-auth/db/migration`, and the service already builds a Kysely `PostgresDialect`, which is
exactly the adapter that export requires. So: the config module exports the options and the dialect;
a small ESM runner applies `getMigrations`'s statements with `pg` in one transaction; and
`infra/deploy.sh apply` runs it with the environment it already exports. Then A5's done-when is one
push run away.

## Next, in the binding order

1. That step (A5's last piece).
2. **B3's remaining items** — the route's half of the WS token, `/v1/engines` and `/v1/licences`
   authenticated or rate-limited, `response_model` on the 11 handlers, the MASVS L1 self-review.
3. **B4** — mutmut at the 70% floor over `services/api` (sync, runs, auth) and `services/courier-voice`
   (the turn machine).
4. Then the rest of queue 3; billing resumes after those (D44).
