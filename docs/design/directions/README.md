# The three design directions — the renders

These three files are **renders of the real screens**, not mock-ups drawn for the occasion.
The screens live in the app:

| Direction | Route              | Screen                                     | Render            |
| --------- | ------------------ | ------------------------------------------ | ----------------- |
| A         | `/design/roadbook` | `apps/mobile/src/design/RoadbookToday.tsx` | `a-roadbook.html` |
| B         | `/design/beacon`   | `apps/mobile/src/design/BeaconToday.tsx`   | `b-beacon.html`   |
| C         | `/design/freight`  | `apps/mobile/src/design/FreightToday.tsx`  | `c-freight.html`  |

Open the HTML file in a browser. The phone frame is 390 × 844, the same as the mockups in
`docs/design/mockups/`.

## What these files are, and what they are not

- **They are** the layout, the type scale and the palette of the screens, drawn with the
  values of `packages/design-tokens/src/themes.ts` and
  `packages/design-tokens/src/directions.ts`. Open the file and look at the source: every
  colour is a token value, every size is a step of the scale.
- **They are not** the device screenshots. **The device screenshots come from the emulator
  run** of the three routes (`/design/roadbook`, `/design/beacon`, `/design/freight`) in
  `.github/workflows/android-e2e.yml`, day and night, small and large phone and 200 % text,
  and they land in `docs/evidence/design/`. The renders here exist because the lab runs
  without an emulator: they let the founder compare the three directions today.

## The type scale of each direction

| Step    | A — Roadbook  | B — Beacon    | C — Freight   |
| ------- | ------------- | ------------- | ------------- |
| metric  | 48 / 52 / 800 | 76 / 80 / 700 | 64 / 64 / 800 |
| address | 22 / 28 / 600 | 34 / 42 / 600 | 28 / 34 / 700 |
| row     | 20 / 26 / 500 | 24 / 32 / 500 | 22 / 28 / 600 |
| label   | 17 / 22 / 600 | 17 / 22 / 600 | 17 / 20 / 700 |
| body    | 19 / 26 / 400 | 20 / 28 / 400 | 20 / 28 / 500 |
| caption | 17 / 22 / 500 | 17 / 24 / 500 | 17 / 22 / 600 |
| title   | 34 / 40 / 700 | 24 / 30 / 600 | 34 / 38 / 800 |

Size / line height / weight, in pixels. The tracking and the colours are in
`packages/design-tokens/src/directions.ts` and in `themes.ts`.

## The founder's pick

The three directions are in `docs/FOUNDER_TODO.md`: **pick A, B or C**. The work carries on
either way — the screen inventory of §13.5 is the next step.
