# Mockups v1/v2 ÔÇö CONTENT INVENTORY ONLY (visual style rejected by the founder)
These files show which screens exist and what each must contain. Their look (neon on black, glow, orbs) was rejected as "AI-looking". Do not copy their style. The real design comes from MASTER_EXECUTION ┬º13 (Design Studio: research, 3 directions, founder pick, library bench).

**The look is now decided in three places, and the founder is choosing between them:**

| What                                                        | Where                                                                     |
| ----------------------------------------------------------- | ------------------------------------------------------------------------- |
| The three directions (the founder picks A, B or C)          | `docs/design/DIRECTIONS.md`                                               |
| The renders of the three screens                            | `docs/design/directions/a-roadbook.html`, `b-beacon.html`, `c-freight.html` |
| The real screens in the app                                  | `/design/roadbook`, `/design/beacon`, `/design/freight`                  |
| The research behind them (83 repositories, the competitors)  | `docs/design/RESEARCH.md`                                                 |
| The library bench (56 libraries against our bar)             | `docs/design/BENCH.md`                                                    |

Until the founder picks, **the tokens of `packages/design-tokens` hold all three palettes**
(`roadbook`, `beacon`, `freight` in `themes.ts`) and all three type scales
(`packages/design-tokens/src/directions.ts`), each measured against the contrast bars by
`packages/design-tokens/src/contrast.test.ts`. The day theme and the night theme stay exactly
as they are: the night theme is the adapted option, never the identity.

Canvas: https://claude.ai/artifact/KixaotGGNLugEY5hpfwPuD

---

## The screen specifications (the build reference)

The specifications below are what every screen of the app must contain: the states, the
night and day behaviour, the motion, the copy and the accessibility notes. The look itself
is decided by MASTER_EXECUTION section 13 (the Design Studio): three directions are built and
the founder picks one of them.

# The mockups and the screen specifications

## The rejected mockups (content only — the look was rejected by the founder)

These three files are the **content** of the screens. Their look — neon on black, glow, orbs,
glass — was rejected as "AI-looking" and **must not be copied**.

- `Main.dc.html` - 1 · Driving mode (night): turn card, offline-map chip, bottom sheet with stop number (76 pt), street, suburb, door note + parcel location chips, 72 pt green "Delivered" + skip, listening indicator.
- `Dictation.dc.html` - 2 · Dictation report: counts (matched / corrected / check), "what I corrected" cards (struck original → corrected + reason), "please check" question with 2 big choices + "or just say it".
- `DayList.dc.html` - 3 · Today's list (day): run name, progress bar, segmented filters, stops grouped by street, NEXT badge, "Corrected from …" note.
- Viewport 390×844. Font Figtree. Open the files in a browser (inline styles render without the support script).
- Live preview: https://claude.ai/artifact/KixaotGGNLugEY5hpfwPuD

The type scale of the contract still wins over the inline styles of those files: the mockups
use 13-16 px for the small metadata and the contract says the body is at least 17 pt, so the
smallest step of the token scale is 17 px. The colours of the mockups are **not** the colours
of the app: the palettes are the six in `packages/design-tokens/src/themes.ts`.

## The screen specifications

Every screen of the app, written against the contract in
`docs/design/SYSTEM.md` and against the **content** of the mockups in this folder. The **look**
is the one of the direction the founder picks (§13.4 above): the content inventory below stays,
the visual style of the `.dc.html` files does not.

| Spec                                 | Screen                            | Mockup                 | Route                       | Maestro flow               |
| ------------------------------------ | --------------------------------- | ---------------------- | --------------------------- | -------------------------- |
| [today.md](today.md)                 | Today's list (the opening screen) | `DayList.dc.html`      | `/(tabs)`                   | `today-list.yaml`          |
| [map.md](map.md)                     | The map                           | `Main.dc.html` (night) | `/(tabs)/map`               | `map.yaml`                 |
| [stops.md](stops.md)                 | The stops of the run              | `DayList.dc.html`      | `/(tabs)/stops`             | `stops.yaml`               |
| [stop-detail.md](stop-detail.md)     | The stop detail                   | `Main.dc.html`         | the sheet of the stops list | `delivered.yaml`           |
| [settings.md](settings.md)           | The settings                      | -                      | `/(tabs)/settings`          | `compat.yaml` (the way in) |
| [dictation.md](dictation.md)         | The dictation report              | `Dictation.dc.html`    | P5 / T7.4                   | -                          |
| [sign-in.md](sign-in.md)             | Sign in and create account        | -                      | `/(auth)/login`             | `login.yaml`               |
| [compatibility.md](compatibility.md) | The compatibility screen          | -                      | `/compat`                   | `compat.yaml`              |

## How to read a spec

Every spec has the same sections, in the same order:

1. **The job** - what the screen is for, in one sentence.
2. **The layout** - what is on the screen, from the top down.
3. **The states** - loading, empty, error, offline, partial sync, permission.
4. **Day and night** - what changes when the theme changes.
5. **The motion** - what moves, how long it takes, what happens with less motion.
6. **The copy** - the words on the screen and the voice prompts, with the word count.
7. **The accessibility** - the labels, the roles, the focus order, the dynamic type.
8. **The testIDs** - the names the Maestro flows and the unit tests use.
9. **The evidence** - the screenshots the design review gate needs.

## The rules every screen obeys

| Rule                                                             | Where it comes from        |
| ---------------------------------------------------------------- | -------------------------- |
| One primary action per screen, 72 pt                             | `docs/design/SYSTEM.md` Â§3 |
| Every other target at least 56 pt                                | `docs/design/SYSTEM.md` Â§3 |
| Body text at least 17 pt, key numbers 48-76 pt                   | `docs/design/SYSTEM.md` Â§2 |
| Text 4.5:1, large text and boundaries 3:1, driving text 7:1      | `docs/design/SYSTEM.md` Â§6 |
| Motion 150-250 ms, spring for the sheets                         | `docs/design/SYSTEM.md` Â§5 |
| "Reduce motion" makes the movement instant, never removes it     | `docs/design/SYSTEM.md` Â§5 |
| One icon set (Material Symbols), no emoji ever                   | `docs/design/SYSTEM.md` Â§7 |
| Plain NZ English, voice prompts of at most 8 words while driving | `docs/design/SYSTEM.md` Â§8 |
| Every interactive element has a label and a role                 | `docs/design/SYSTEM.md` Â§6 |
| The status is never colour-only                                  | `docs/design/SYSTEM.md` Â§3 |
| A skeleton, never a spinner for more than 300 ms                 | `docs/design/SYSTEM.md` Â§4 |

## The contrast, before and after

The palette of the three themes was measured on 2026-10-21. The command that
prints the numbers again is `pnpm --filter @courier/design-tokens contrast:report`,
and `packages/design-tokens/src/contrast.test.ts` fails the build when a pair
drops below its bar.

### The day theme (background `#F4F6F7`, surface `#FFFFFF`)

| Pair                              | Before     | After   | Bar   |
| --------------------------------- | ---------- | ------- | ----- |
| `textPrimary` on the background   | 17.7:1     | 16.54:1 | 4.5:1 |
| `textSecondary` on the background | 7.7:1      | 5.56:1  | 4.5:1 |
| `textTertiary` on the background  | **2.56:1** | 4.81:1  | 4.5:1 |
| `brandPrimary` on the background  | **2.86:1** | 6.15:1  | 4.5:1 |
| `statusDelivered` as text         | **3.77:1** | 5.42:1  | 4.5:1 |
| `statusFailed` as text            | **3.76:1** | 6.06:1  | 4.5:1 |
| `statusSkipped` as text           | **2.15:1** | 5.47:1  | 4.5:1 |
| `statusPending` as text           | 4.83:1     | 5.56:1  | 4.5:1 |
| the border on the surface         | **1.27:1** | 3.40:1  | 3:1   |
| the label on the primary button   | **2.86:1** | 6.67:1  | 4.5:1 |

### The night theme (background `#0E1418`, surface `#172026`)

| Pair                             | Before     | After   | Bar                 |
| -------------------------------- | ---------- | ------- | ------------------- |
| `textPrimary` on the surface     | 19.1:1     | 15.09:1 | 4.5:1 (7:1 driving) |
| `textSecondary` on the surface   | 7.8:1      | 7.39:1  | 4.5:1 (7:1 driving) |
| `textTertiary` on the surface    | **4.12:1** | 5.75:1  | 4.5:1               |
| `statusDelivered` on the surface | 7.8:1      | 8.76:1  | 4.5:1               |
| `statusSkipped` on the surface   | 11.9:1     | 8.72:1  | 4.5:1               |
| the border on the surface        | **1.70:1** | 3.34:1  | 3:1                 |

### The high-contrast theme (background `#000000`)

| Pair                             | Before | After   | Bar   |
| -------------------------------- | ------ | ------- | ----- |
| `textPrimary` on the background  | 21:1   | 21:1    | 4.5:1 |
| `textTertiary` on the background | 7.4:1  | 11.42:1 | 4.5:1 |
| `statusFailed` on the background | 5.3:1  | 6.94:1  | 4.5:1 |
| the border on the background     | 21:1   | 21:1    | 3:1   |

Nothing is below the bar today. The numbers in the table are the ones the
test measures, so they cannot drift away from the palette.

## The icon set

One set only: **Material Symbols** through `@expo/vector-icons`
(`MaterialCommunityIcons`). No emoji, in the interface, in an empty state, in
a button or in a document.

## The copy

Plain NZ English. The words a courier hears while driving are at most eight
words long; the words on a screen are at most twelve. Numbers and addresses
are read the way a courier says them: "42", not "forty two".
