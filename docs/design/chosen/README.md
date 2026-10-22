# Chosen design: Maps First (founder decision, 2026-10-22)

The founder chose this direction. It replaces A/B/C (§13.6) and the 10 directions in `docs/design/directions-2/`, which are kept only as history. Build the app to this design. Do not invent a new look.

- `screens/` holds 13 reference screens as plain HTML at 390 x 844. Open any file in a browser.
- `sheets/` holds the same screens as PNG contact sheets.

The HTML is a visual reference, not production code. Build it in React Native with our stack (Expo SDK 58, Unistyles 3, Reanimated 4, Skia, MapLibre).

## Idea

The map is the app. Everything else floats above it on glass: the top pills, the round map buttons, the bottom sheet and the tab bar. This is Apple Maps on iOS 26. Colour is used only for meaning. There are no decorative gradients, no glows, no neon, no emoji and no dashes or middle dots in the copy.

## 3D and motion (binding)

The screens are built three dimensional and animated: tilted 3D map, driving camera, 3D puck, rising pins, self drawing route, spring sheets and Slide to Deliver with haptics. The full spec is MASTER_EXECUTION §13.8 and D29.

## Editable by design (binding)

Every colour, radius, spacing, blur and type size comes from ONE token file in the shared UI package (for example `packages/ui/src/tokens.ts`), with light and dark sets. No screen may hard-code a value. Changing the brand colour, a corner radius or the font in that one file must restyle the whole app. Add a Storybook or a "Design tokens" debug screen that shows every token and component, so the founder can review changes.

## Tokens (starting values)

| Token | Light | Dark |
|---|---|---|
| accent (actions, links, route line) | #0A7CFF | #0A84FF |
| success (delivered, ahead of plan) | #34C759 | #30D158 |
| danger (next stop pin, failures) | #FF3B30 | #FF453A |
| warning (dog, hazards) | #FF9500 | #FF9F0A |
| info2 (shelf, parcel) | #5856D6 | #5E5CE6 |
| background | #F2F2F7 | #000000 |
| card | #FFFFFF | #1C1C1E |
| label | #000000 | #FFFFFF |
| secondary label | rgba(60,60,67,.6) | rgba(235,235,245,.6) |
| fill | rgba(120,120,128,.12) | rgba(118,118,128,.24) |
| separator | rgba(60,60,67,.29) | rgba(84,84,88,.65) |
| glass | white at 72 to 95% + blur 28 + saturate 180% | #1C1C1E at 62 to 90% + blur 28 |
| turn card | #14382A | #0F2A1F |
| map land, road, water, park | #F3EFE7, #FFFFFF, #AAD3F2, #CDE8C4 | #1B1D21, #34373E, #16243A, #1D2A22 |

Radii: sheet 40, card 24, chip 15, button 27 (pill), map button 24 (circle 48), tab bar 31.
Type: SF Pro on iOS, Inter on Android. Large title 34/41 bold. Numbers use SF Pro Rounded (iOS) or Inter tabular (Android): 24 to 52 bold.
Touch targets: at least 48 pt; the main action while driving is at least 64 pt high.

## Components

1. Glass surface: `expo-glass-effect` GlassView on iOS 26+, with a runtime availability check. Fallback on Android and older iOS: a blur view with the glass token colour. Never a crash, never a plain grey box.
2. Floating tab bar: a capsule with Today, Route, Map and Account, plus a separate round Copilot button on the right.
3. Bottom sheet with a grabber, three heights (peek, half, full), and the map stays live behind it.
4. Round map buttons: map style and recentre.
5. Top pills: run name and weather.
6. Stat row: three rounded numbers with small labels, and a thin progress line.
7. Chips for stop notes: side gate, shelf, dog. Icon colour carries the meaning.
8. Slide to Deliver: a 64 pt track with a thumb. A slide is required, so a bump never marks a parcel delivered. Haptic on success. Accessibility: a double tap action with a confirmation exists for screen readers.
9. Turn card: a dark green card with the distance in big rounded numbers, the street, and a "Then" strip for the next turn.
10. Segmented control and timeline list for the route.

## Screens

1 Welcome, 2 Sign in (Apple, Google, Passkey, Email; Face ID unlock; stays signed in all shift offline), 3 Today, 4 Driving, 5 Delivered with proof (photo, safe place, voice note, door memory, Undo), 6 Scan (address block highlighted, where in the van), 7 Copilot over the map (live transcript, result card with Undo and Text customer), 8 Route (map plus timeline, Optimise, To go / Later / Done), 9 Map style (2D, 3D, Satellite, Auto plus the offline map state), 10 Summary (earned, 7 day bars, per carrier), 11 Settings, 12 Driving at night, 13 Lock screen Live Activity (iOS) and an ongoing notification with the same actions (Android).

Every screen also needs: empty, loading, error and offline states; dark mode; Dynamic Type up to the largest size without clipping; VoiceOver and TalkBack labels; reduced motion.

## Copy rules

Short plain sentences in New Zealand English. No emoji. No em or en dashes. No middle dots. No all-caps body text. Small section labels in caps are allowed, as in iOS.
