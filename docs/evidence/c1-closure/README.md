# BUG-271 evidence — C1 closure: every critical/high finding mapped to its BUG and PR

The founder's item-7 step: "C1 closure (map every critical/high finding to its BUG and PR)".

## The mapping (full table at the end of `docs/audit/CODE_AUDIT_2026-10.md`)

25 accepted critical/high findings, all mapped, all `fixed` in `docs/status/BUGS.md`
(verified programmatically against `origin/main` on 2026-11-08 — 25/25 rows `fixed`):

- **Critical (2):** squad 3 #1 = squad 1 #1 (delivered marks in `useState`, no store) → **BUG-69**;
  squad 3 #2 = squad 1 #8 (confirm-whole-batch on partial accept) → **BUG-76**.
- **High (23):** squad 1 #2..6 → **BUG-71, 72, 73, 74, 75**; squad 3 (app) #3,5,6,7 →
  **BUG-86, 87, 88, 89**; squad 6 #2,3,4,5,6,7 → **BUG-94, 95, 96, 97, 98, 99**;
  squad 3 (server) #5 = squad 2 #2 (no `stops.status` writer) → **BUG-115**;
  squad 4 #1,2,7 → **BUG-121, 122, 127**; squad 5 #1,2,3,5 → **BUG-146, 147, 148, 150**.

## The fixing PRs (from the merge history, `gh api pulls/<n>` 2026-11-08)

- PR **#138** (merged 2026-10-31, 64ff9ee7f4): "fix(c1): the backend squad's nine high findings,
  each red first (BUG-096, 121, 122, 127, 146, 147, 148, 150) + BUG-160".
- PR **#139** (2026-10-31, cfa04cb687): "fix(sync): the stop's status is derived from the events,
  on Postgres too (BUG-115)".
- PR **#141** (2026-10-31, ac4939376f): "fix(ci): the C1 audit's five lead-owned HIGH findings"
  (BUG-94, 95, 97, 98, 99).
- PR **#130** (BUG-072, release auth URL), **#133** (BUG-074), **#135** (BUG-184 cleartext + the A1
  wiring that made BUG-69/76/86..89's modules live and then fixed), **#186** (BUG-132, the shared
  limiter store behind BUG-127's account-keying fix).
- The lead-side mobile rows (BUG-69, 71, 73, 75, 76, 86..89) are fixed on the A1 slices; each row's
  fix cell names its red-first probe and the green suites (e.g. BUG-73: parser 19/19, client 15/15,
  copilot 29/29, mobile 532/532; BUG-75: mobile 538/538).

## The one clause left with the founder

C1's done-when also says "the founder's adviser has reviewed the report" — that is now a row in
`docs/status/FOUNDER_TODO.md` (only the adviser can do it).
