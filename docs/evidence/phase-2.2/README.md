# PHASE 2.2 evidence — Unistyles 3 themes from `packages/design-tokens`, no `var(--`

Date: 2026-10-20
Branch: `feat/2.2-unistyles-themes`
Scope: KICKOFF_V2_EN.md PHASE 2.2 — "Unistyles 3 light/night themes from
`packages/design-tokens` (hex), no `var(--`".

## What changed

| Piece | Where | Notes |
|---|---|---|
| Unistyles 3 configuration | `apps/mobile/src/unistyles.ts` | `StyleSheet.configure({ themes, settings: { adaptiveThemes: true } })`; the product themes `day`/`night` are registered under Unistyles' reserved `light`/`dark` names so the OS colour scheme drives day/night automatically |
| Theme provider | `apps/mobile/src/providers/ThemeProvider.tsx` | no more `document.documentElement` writes (that crashed on native); manual switching goes through `UnistylesRuntime.setTheme` / `setAdaptiveThemes(false)` |
| App constants | `apps/mobile/src/constants/theme.ts` | `colors` are the hex values from the design tokens; `spacing` / `borderRadius` / `typography` are derived from the same tokens |
| Babel plugin | `apps/mobile/babel.config.js` | `react-native-unistyles/plugin` with `root: 'src'` (Unistyles 3 needs it for the native side) |
| Native peer | `apps/mobile/package.json` | `react-native-nitro-modules@0.37.1` (Unistyles 3 runtime), `react-native-unistyles` pinned to `3.5.3` |
| NativeWind leftovers | deleted | `apps/mobile/global.css` and its import in `App.js`; `App.js` no longer uses `var(--color-background)` |
| Token comments | `packages/design-tokens/src/*` | the NativeWind references are gone; the package documents Unistyles + CSS variables |
| Emoji icons | `apps/mobile/app/(tabs)/settings.tsx` | 🗑️/🚪 replaced with Material Symbols icons (`@expo/vector-icons`) |
| Mobile tests | `apps/mobile` | jest-expo 58 + @testing-library/react-native 13 + jest config; the auth test was rewritten against the real client API (6 tests) |

## Commands and results

| Command | Result | Log |
|---|---|---|
| `pnpm --filter @courier/design-tokens test` | 27/27 passed (8 new "hex only / no CSS custom properties" guards) | `design-tokens-test.log` |
| `pnpm --filter @courier/shared --filter @courier/design-tokens --filter @courier/nz-address --filter @courier/auth test` | 26 + 27 + 17 + 31 = 101/101 passed | `workspace-test.log` |
| `pnpm --filter mobile test` (jest-expo) | 6/6 passed | `mobile-test.log` |
| `pnpm --filter @courier/design-tokens typecheck` | exit 0 | `design-tokens-typecheck.log` |
| `scripts/grep-banned.ps1 apps packages services scripts db infra` | **BANNED_HITS=0** (was 41) | `banned-grep.log` |
| `pnpm --filter mobile exec tsc --noEmit` | 3 errors, all pre-existing expo-router typings (see below) | `mobile-typecheck.log` |

## Banned items now gone

`var(--` (31 hits), `NativeWind` (3), the `PowerSync` mention in the settings screen (1),
`expo-av`/`expo-background-fetch`/`Supabase`/`gpt4free` (0 in this branch — already clean),
`python-jose`/`passlib` (removed in PHASE 2.1).

## Regression guards added

`packages/design-tokens/src/tokens.test.ts` now asserts, for every theme:
only hex colour values, no `var(` anywhere, identical colour keys across themes, and that the
night theme is near-black (`#09090b`) rather than pure black (R17).

## Not verified

- The app was **not** run on a device or emulator: there is no local emulator (AGENTS.md) and
  `.github/workflows/` is still empty, so the Unistyles native runtime (nitro modules) is
  **NOT VERIFIED** at runtime. The CI emulator workflow (PHASE 3) is what will prove it.
- `apps/mobile` typecheck still reports 3 errors in `app/_layout.tsx`, `app/(auth)/_layout.tsx`
  and `app/(tabs)/_layout.tsx`: expo-router's `Stack`/`Tabs` typings demand an `id` prop.
  These files were not touched by this phase (pre-existing); they belong to the PHASE 2.4
  dependency-alignment work.
