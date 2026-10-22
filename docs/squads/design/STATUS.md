# Design System & Motion Squad - status

Updated: 2026-10-22 (the Design Studio: research, bench, three directions, founder pick)

## Done (with evidence)

- Squad skeleton, targets and evaluation plan created (2026-10-20).
- **The research of MASTER_EXECUTION §13.1**: 89 repositories read from the live GitHub API and
  44 packages from the npm registry on 2026-10-22, plus the reference products and the
  anti-"AI look" rules applied to each of them — `docs/design/RESEARCH.md`, evidence in
  `docs/design/evidence/`.
- **The library bench of §13.4**: 56 libraries scored against the bar of `docs/design/SYSTEM.md`
  on ten dimensions, with the recommendation and every unmeasured number marked UNVERIFIED —
  `docs/design/BENCH.md`.
- **The three directions of §13.4**: three **real screens** of the app (not descriptions), three
  themes in the token package, three type scales in the token package, all measured against the
  contrast bars — `docs/design/DIRECTIONS.md`, `/design/roadbook`, `/design/beacon`,
  `/design/freight`, renders in `docs/design/directions/`.
- The founder's pick is on the table: `docs/status/FOUNDER_TODO.md` asks for **A, B or C**.

## Metrics vs targets

| Metric | Target | Today | Evidence |
|--------|--------|-------|----------|
| Repositories in the research pool | ≥ 50 (V4 §12, §13.1) | **89** | `docs/design/evidence/github-repos-2026-10-22.tsv` |
| Libraries in the bench | ≥ 50 (§13.4) | **56** | `docs/design/BENCH.md` |
| Directions that are real screens | 3 (§13.4) | **3** | `apps/mobile/app/design/`, 26 tests in `app/design/__tests__/` |
| Contrast pairs measured | every pair, every theme | **371 tests × 6 palettes** | `packages/design-tokens/src/contrast.test.ts` |
| Measured frame rate | 60/120 fps on the emulator | **UNVERIFIED** — no emulator on the design machine | the emulator run of §13.5 fills it in |
| Device screenshots (day/night, small/large, 200 % text) | 4 per screen | **UNVERIFIED** — same reason | `docs/evidence/design/` after the emulator run |
| Emoji in the design lab | 0 | **0** (tested) | `apps/mobile/app/design/__tests__/directions.test.tsx` |

## Next

1. The founder picks A, B or C (`docs/status/FOUNDER_TODO.md`). The work does not wait for it.
2. **The screen inventory of §13.5** — every screen of the app written against the chosen
   direction, the same way `docs/design/mockups/*.md` is written: the content first, then the
   direction.
3. The visual-regression baselines and the screen videos from the emulator run, day and night,
   small and large phone, 200 % text.
4. The pilot of `@swmansion/react-native-bottom-sheet` (the sheet whose physics match the
   contract by construction) and the ADR that follows the measurement.
5. Install FlashList: the 300-stop list at 60 fps is a hard requirement and it is not a
   dependency of the app today.

## Risks

- **The frame rates and the bundle sizes are UNVERIFIED.** There is no emulator on the design
  machine, and MASTER_EXECUTION §7.6 says a number without a CI link is not verified. The
  emulator run is the only way to close them.
- **The founder's pick is the biggest open decision.** Two of the three directions will not
  survive it, so the screen inventory of §13.5 has to wait for the answer to avoid being
  written twice.
- **The accessibility gate is still a manual review.** The bench scores the accessibility of
  the libraries from their source; nobody has run a screen reader over our own screens on a
  device yet.
- The evaluation data for some squads needs founder-provided material (redacted label photos,
  real shift days); until then the benchmark uses synthetic and public data and says so.
