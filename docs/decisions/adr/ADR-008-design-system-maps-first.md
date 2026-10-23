# ADR-008 — The design system: Maps First, the one token file, the D33 contrast gate and the motion tokens

- **Status:** accepted
- **Date:** 2026-10-23
- **Decides:** D27 implementation architecture (where the ONE token file lives and what it carries), the
  D33 contrast gate (MASTER_EXECUTION §13.9 as a test), the motion tokens (§13.8 rule 6, D29, D34) and
  the D33-mandated design changes
- **Amends:** the starting values of `docs/design/chosen/README.md` where D33 demands it (the amended
  rows are marked there)
- **Research:** `docs/design/chosen/` (the 13 reference screens, the contact sheets, the README),
  `docs/design/SYSTEM.md` §6, `docs/plan/MASTER_EXECUTION.md` §13.7–§13.10

## Context

D27 chose Maps First. The reference is `docs/design/chosen/` — 13 plain-HTML screens at 390 × 844 and
a README with the token starting values. The HTML is a visual reference, not production code; the
founder's D33 decision (§13.9) is binding on top of it and many of the reference's colour pairs do
not clear the bars:

- white on `#34C759` is **2.2:1** — the Slide to Deliver label and the pin number badges;
- green `#34C759` as text on the white card is **2.2:1** — the "42" delivered stat, the "Ready" line;
- the accent `#0A7CFF` as the 10 px tab label on the tab-bar glass is **≈ 3.9:1**;
- the secondary label `rgba(60,60,67,.6)` on the white card is **3.4:1**;
- the scanner pills are dark glass over the **camera feed, whose pixels are arbitrary** — no fixed
  pair is assertable at all.

D33's rule, verbatim in MASTER_EXECUTION §13.9: 3:1 is allowed only for large text (24 px regular, or
18.66 px bold; the founder carved out the button labels at 18 px bold), 4.5:1 applies to all other
text, 7:1 applies to everything on the driving screen; the test asserts every pair explicitly, in
light and dark, with no silent exclusions; the design changes to meet the bar, never the test.

Two more directives shape the file: D34 (the Copilot is a live 3D glass sphere in the tab-bar centre
whose state morphs in 200 to 350 ms) and §13.8 rule 6 (motion durations and curves are tokens in the
same file as every other token).

## Decision

### 1. Where the ONE token file lives

`packages/design-tokens/src/chosen.ts`, exported as `@courier/design-tokens/chosen`:

- The package already carries the D27 infrastructure (the test setup, the contrast maths in
  `contrast.ts`, the build, the mobile `dist/` resolution), so the tokens ride it instead of a new
  `packages/ui` that would duplicate the same plumbing.
- The ESLint rule in `packages/eslint-config/index.js` (the `no-restricted-syntax` hex ban) forbids a
  raw colour anywhere outside the token package, so a screen physically cannot bypass the file.
- The legacy token modules (`tokens.ts`, `themes*`, `directions*`) stay until **all 13 screens** are
  rebuilt against the chosen file, then they and their tests are deleted. Their lifetime is the
  deprecation plan; nothing new imports them.

### 2. The pair model of the D33 test

`packages/design-tokens/src/__tests__/chosen-contrast.test.ts` is the gate. Every record names a text
colour, a surface, a bar (7 driving / 4.5 body / 3 large) and the reason the pair exists; the table is
48 records, 24 per mode, built only from the pairs the 13 reference screens actually form.

- A transparent colour or surface (the iOS rgba tokens, the glass recipes) is **composited first**:
  the pair that has to clear the bar is the rendered pixels', not the raw rgba's.
- A glass surface is not one colour — the fill sits over the map. Each glass record asserts the
  **worst case**: the minimum ratio across the surface's fill envelope (`glass.fillsBySurface`) and
  the four map colours of the mode, so the number is a floor for the whole app.
- The scanner overlay pair is asserted over the **brightest possible camera feed** behind the new
  scrim (below).
- **No silent exclusions:** a colour that has no record is either listed in the test's non-text
  registry with its reason (the map canvas, the glass and scrim recipes, the fill and separator
  surfaces, the icon-only `warning` and `info2`) or the test fails with the unaccounted names.

### 3. The D33-mandated design changes (the HTML is the "before")

| Change | Before | After |
|---|---|---|
| The Slide to Deliver label and the filled-success-chip labels | white on `#34C759` (2.2:1) | `onSuccess` `#000000` in both modes (9.46 / 10.39 on the fills) |
| Green as text ("42", "Ready") | `success` as text | new `successText` `#14532D` light / `#30D158` dark |
| Accent as text (10 px tab labels, links, Undo, Text customer) | `accent` as text (3.9:1) | new `accentText` `#0857B4` light / `#33A1FF` dark; accent stays fills, icons, the route line |
| Secondary label | `rgba(60,60,67,.6)` / dark `.6` (3.4:1 on white) | `rgba(60,60,67,.9)` light / `rgba(235,235,245,.75)` dark |
| The white-on-colour pin number badges (13 px / 700) | white on green and red (2.2 / 3.55 — unmeetable: the mid-red maxes at 5.92 even in black) | the Apple Maps pattern: the number on the inset white card chip (the pair becomes label/card, 21:1 light, 17:1 dark) — built in the component and screen slices |
| The scanner pills over the camera | unbounded over arbitrary pixels | new `scrim` `rgba(0,0,0,.35)` in both modes under the dark-glass pills; `onDarkGlass` `#FFFFFF` then clears **9.88:1** over the brightest feed (6.68 without the scrim) |
| Button labels | the HTML's 17 px / 600 | `typography.button` 18 / 22 / 700 (D33) — the qualification that makes the white-on-accent buttons a 3:1 large-text pair (3.93 light / 3.65 dark) |
| The Then strip | untokened `#0F2C21` / `#0B2018` | `turnStrip` light `#0F2C21`, dark `#0B2018`, with `onTurnStrip` `rgba(255,255,255,.88)` |
| The glass envelopes | one range per mode (0.72–0.95 / 0.62–0.9) | `glass.fillsBySurface`: the sheets 0.86–0.95 light and 0.9 dark, the controls 0.72 light and 0.62–0.72 dark — the union stays the founder's original `fills` envelope, and the D33 test computes from these |

### 4. The motion tokens (§13.8 rule 6, D29, D34)

Durations: `instant` 100, `quick` 180, `standard` 280, `morph` 280 (inside D34's 200 to 350 ms band),
`slow` 420, `camera` 600, `route` 900. Curves: `standard` cubic-bezier(0.32, 0.72, 0, 1), `enter`
cubic-bezier(0.16, 1, 0.3, 1), `exit` cubic-bezier(0.4, 0, 1, 1), `linear`. Springs (Reanimated 4
configs, mass 1): `sheet` damping 26 / stiffness 260, `sphere` 20 / 180 (D34: smoothed, never
jittery), `thumb` 22 / 220, `pin` 18 / 140. Reduced motion: durations capped at 240 ms, linear
curves, `springs: false` — a calm 2D path with fades. The component and screen slices tune these
against the frame-time evidence (§13.8.7); that change lands here, in this file, never in a screen.

### 5. The test never weakens

When a design change is wanted, the token file changes and the table changes with it — a record's bar
never moves down, and a colour may not leave the table without a recorded non-text reason.

## Consequences

- 48 pairs are asserted in CI; a token change that breaks any pair fails the build.
- The ghost sign-in buttons clear 3:1 in light through `accentText` with margin (5.38 over the tint);
  if a screen ever wants the raw accent as a ghost label, the fill alpha drops or the label moves to
  `accentText` — the pair decides, not the code.
- Flourish opacities inside an asserted pair must stay above the pair's worst case (the turn card's
  92% white street keeps 11:1).
- Known non-text follow-up (SC 1.4.11, not a D33 item): the meaning-coloured icons on the glass run
  2.2 to 3.9:1; the components slice reviews the icon pairs.

## Verification

- `packages/design-tokens/src/__tests__/chosen-contrast.test.ts` — the 48 pairs, the named D33 rules,
  the no-silent-exclusions loop, the stale-reason guard.
- `packages/design-tokens/src/__tests__/chosen.test.ts` — the anchors (a token that drifts from the
  reference README is a bug).
- `docs/evidence/t6-token-file/` — the contrast table and the gate runs.
