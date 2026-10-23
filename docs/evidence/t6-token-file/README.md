# Evidence — T6 slice 1: the one token file and the D33 contrast gate

The step: ADR-008 (`docs/decisions/adr/ADR-008-design-system-maps-first.md`), the ONE
token file `packages/design-tokens/src/chosen.ts` (light + dark, motion tokens
included), and the D33 gate `packages/design-tokens/src/__tests__/chosen-contrast.test.ts`.
Pushed on branch `feat/t6-tokens` (PR #9); 2026-10-23.

## Files

| file | what it is |
|---|---|
| `contrast-table.md` | the 48 asserted pairs generated from the **built** `dist/chosen.js` with the same maths as the gate test (0 failures) |

## Gates

| gate | command | result |
|---|---|---|
| design-tokens tests | `corepack pnpm --filter @courier/design-tokens test` | Test Files 8 passed (8), Tests **1857 passed** (the 54 new: 48 contrast records + the named D33 rules + the anchors + the motion describes) |
| design-tokens lint | `corepack pnpm --filter @courier/design-tokens lint` | clean (the ESLint hex ban stays: no raw colour outside the token package) |
| design-tokens typecheck | `corepack pnpm --filter @courier/design-tokens typecheck` | clean |
| design-tokens build | `corepack pnpm --filter @courier/design-tokens build` | `dist/` built (the table above was generated from it) |
| doc links | `node scripts/ci/check-doc-links.mjs` | OK |
| control characters | `node scripts/ci/check-control-chars.mjs` | OK |
| floor guard | `node scripts/ci/check-floor.mjs origin/main` (after the commit) | **clean** (`check-floor: clean (base origin/main)`) |

## The numbers that matter

- The Slide to Deliver label: black on the green — **9.46** light / **10.39** dark
  (the reference's white on `#34C759` was 2.2).
- Green as text ("42", "Ready"): the new `successText` — **9.11** on the white card
  light / **8.42** dark (the reference's 2.2).
- Accent as tab-label text: the new `accentText` — **5.6+** on the glass / links etc.
  light, **5.5+** dark (the reference's 3.9).
- Secondary label: rgba(60,60,67,**.9**) light / rgba(235,235,245,**.75**) dark —
  **8.01 / 8.54** on the card (the reference's .6 was 3.4).
- The scanner pills: the new scrim makes the pair assertable — **9.88** over the
  brightest feed (6.68 without the scrim; unbounded before it).
- The driving screen's every pair clears **7:1** at its worst-case glass/map blend,
  including the sheet text, the chips, the turn card, the Then strip and the slide.
