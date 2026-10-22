# Design system — Courier Copilot ("Courier Base")

Single source of truth for the visual language (V4 §5). Tokens live in
`packages/design-tokens`; this file says how they are used.

## 1. Principles

1. **Glanceable while driving.** The driver reads the next thing in under a second, in a moving van,
   in daylight or at night. Anything that needs reading twice does not belong on the driving screen.
2. **One primary action per screen.** Everything else is secondary, or a voice command.
3. **Two taps maximum** for any action taken while driving; zero taps for anything spoken.
4. **Calm, not clever.** No gradients, no glass, no glow, no sparkle icons, no chat-bubble UI. The
   product must not look AI-made.
5. **NZ English, plain words.** No robotic phrasing, never the word "AI" in the product, voice prompts
   of at most 8 words while driving.

## 2. Tokens

| Group     | Rule                                                                                                             |
| --------- | ---------------------------------------------------------------------------------------------------------------- |
| Colour    | semantic tokens only (`textPrimary`, `surface`, `border`, `statusDelivered`, …) — never a raw hex in a component |
| Type      | **Figtree**; tabular numerals for counts, ETAs and money; body ≥ 17 pt; key numbers 48–76 pt                     |
| Spacing   | 4-pt grid only (`4 8 12 16 24 32 48`)                                                                            |
| Radii     | `sm 4 / md 8 / lg 12 / xl 16 / full`                                                                             |
| Elevation | three levels maximum; no shadow stacks                                                                           |
| Motion    | 150–250 ms, spring for sheets, Reanimated 4 on the UI thread                                                     |

The token package is the only place a value may be defined; a component that needs a new value adds a
token first. A lint rule rejects raw hex, raw px and raw font names inside components.

## 3. Screens (the three that matter)

### Today's list (the opening screen)

- Big number first: **stops remaining** (48–76 pt, tabular), then the delivered count.
- The next stop is the largest element: address in 28 pt semibold, two lines maximum, shrink-to-fit.
- One primary action (72 pt): **Next stop**.
- A persistent 64 dp voice bar at the bottom with the current state (idle, listening, thinking,
  speaking, offline, muted, error) and its own earcon and haptic.

### Driving (night)

- Near-black background (`#0A0A0A`–`#121212`), never pure black; no pure white text; low blue.
- The address and the distance are the only bright things on screen.
- The primary action is a 72 pt thumb-reachable button in the lower third; the hand never covers the
  next address.
- Status is never colour-only: every stop carries a shape/label as well.

### Dictation report

- "You said X → corrected Y" per line, with the correction and the reason (short).
- Unresolved items are listed as **one question each**, with the options the driver can answer by
  voice.
- A single "Accept all" primary action, and "Undo" on every correction.

## 4. States (every screen has all of them)

| State             | Rule                                                              |
| ----------------- | ----------------------------------------------------------------- |
| Loading           | skeleton, never a spinner for more than 300 ms                    |
| Empty             | say what is missing and what to do next                           |
| Error             | a plain sentence + a recovery action                              |
| Offline           | a chip with the number of queued actions, never a blocking dialog |
| Partial sync      | the same chip, with "retry"                                       |
| Permission denied | one line, the system setting as the next step                     |
| Long list         | FlashList, 300+ stops without a frame drop                        |

## 5. Motion

- Reanimated 4, 60/120 fps, durations 150–250 ms, spring physics for sheets.
- Shared-element transitions where they carry meaning (a stop opens its sheet).
- "Reduce motion" is respected: transitions become instant, never removed entirely.
- Haptics on confirm, deliver and error — never on scroll.
- No decorative loops, no jank: frame drops are measured on the CI emulator.

## 6. Accessibility (WCAG 2.2 AA)

- Contrast: driving text ≥ 7:1, everything else ≥ 4.5:1.
- Every interactive element has an accessibility label and a role.
- Dynamic type to 200 % without clipping or truncation.
- Status colours are colour-blind safe and never the only signal.
- RTL-ready layouts: logical `start`/`end` everywhere, the Arabic UI is translated, not mirrored by
  accident.

## 7. Icons

One set: **Material Symbols** (weight 500) via `@expo/vector-icons`, or SVG from
`packages/design-tokens`. **No emoji, ever** — not in the UI, not in an empty state, not in a button.

## 8. Copy

- Plain NZ English, short, human.
- Voice prompts: ≤ 8 words while driving, ≤ 12 otherwise.
- Numbers and addresses are read the way a courier says them ("forty two" → "42").

## 9. The design review gate

Every screen change ships with Maestro screenshots in `docs/evidence/design/`:

- day **and** night,
- a small phone and a large phone,
- 200 % text,
- compared against the approved mockups (Driving night, Dictation report, Today's list).

The gate is: no screenshot contradicts the mockup. Fix the screen, not the screenshot.

## 10. Where this contract lives in the code

| What                                                                        | Where                                                            |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| The tokens (colour, type, spacing, radii, elevation, motion, touch targets) | `packages/design-tokens/src/tokens.ts`                           |
| The palettes and their measured contrast ratios                             | `packages/design-tokens/src/themes.ts`                           |
| The three Design Studio directions (the type scale of each)                 | `packages/design-tokens/src/directions.ts`                       |
| The contrast maths and the gate that fails below the bar                    | `packages/design-tokens/src/contrast.ts`, `src/contrast.test.ts` |
| The transitions, the reduce-motion branch and the haptics                   | `apps/mobile/src/motion/`                                        |
| The spec of every screen                                                    | `docs/design/mockups/*.md`                                       |
| The three directions the founder chooses between                            | `docs/design/DIRECTIONS.md`, `docs/design/directions/`           |

The measured contrast table is printed by
`pnpm --filter @courier/design-tokens contrast:report`, and the numbers in
`themes.ts` are its output. A colour change that breaks the bar fails the
build.

**The palettes today.** `day`, `night` and `highContrast` are the product
themes. `roadbook`, `beacon` and `freight` are the three Design Studio
directions of MASTER_EXECUTION §13.4: three light palettes and three type
scales that wait for the founder to pick one. They use the same semantic
roles as `day`, so no component ever grows a "roadbook" token.
