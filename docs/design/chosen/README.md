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

## Tokens (starting values, amended by D33 on 2026-10-23)

The starting values below are the founder's reference. The D33 contrast decision
(MASTER_EXECUTION §13.9) darkened four of them (the secondary label, the green as
text, the accent as text) and set the success fills' labels to black, so every pair
the screens form clears its bar; the changed rows say so. The token file is
`packages/design-tokens/src/chosen.ts`, exported as `@courier/design-tokens/chosen`, and
every pair is asserted by its D33 test.

| Token | Light | Dark |
|---|---|---|
| accent (actions, links, route line) | #0A7CFF | #0A84FF |
| accent as text (tab labels, links) | #0857B4 | #33A1FF |
| success (delivered, ahead of plan) | #34C759 | #30D158 |
| success as text (the "42", Ready) | #14532D | #30D158 |
| danger (next stop pin, failures) | #FF3B30 | #FF453A |
| warning (dog, hazards) | #FF9500 | #FF9F0A |
| info2 (shelf, parcel) | #5856D6 | #5E5CE6 |
| background | #F2F2F7 | #000000 |
| card | #FFFFFF | #1C1C1E |
| label | #000000 | #FFFFFF |
| secondary label (darkened by D33) | rgba(60,60,67,.9) | rgba(235,235,245,.75) |
| fill | rgba(120,120,128,.12) | rgba(118,118,128,.24) |
| separator | rgba(60,60,67,.29) | rgba(84,84,88,.65) |
| glass | white at 72 to 95% + blur 28 + saturate 180% | #1C1C1E at 62 to 90% + blur 28 |
| turn card | #14382A | #0F2A1F |
| then strip | #0F2C21 | #0B2018 |
| scrim (under overlays over the camera) | rgba(0,0,0,.35) | rgba(0,0,0,.35) |
| map land, road, water, park | #F3EFE7, #FFFFFF, #AAD3F2, #CDE8C4 | #1B1D21, #34373E, #16243A, #1D2A22 |
| label on the accent buttons | #FFFFFF | #FFFFFF |
| label on the turn card | #FFFFFF | #FFFFFF |
| label on the then strip | rgba(255,255,255,.88) | rgba(255,255,255,.88) |
| label on a filled success chip and the Slide to Deliver (black by D33) | #000000 | #000000 |
| label on the dark glass over the camera | #FFFFFF | #FFFFFF |
| tab active fill (the quiet pill of the active tab, added in slice 2) | rgba(0,0,0,.06) | rgba(255,255,255,.06) (amended: the reference's 10% failed the 4.5 bar over the worst glass branch, so D33 set 6%) |
| grabber (the sheet handle, added in slice 2) | rgba(60,60,67,.22) | rgba(235,235,245,.3) |
| scan ring (the scanner reticle, added in slice 2; non-text) | #FFD60A | #FFD60A |

Radii: sheet 40, card 24, chip 15, button 27 (pill), map button 24 (circle 48), tab bar 31; slice 2 adds pill 18 (top, scanner and small action pills; the reference's mixed 17 to 18 unified), segmented 12, segmented segment 9, slide track 32, turn card 30, then-strip corner 16.
Type: SF Pro on iOS, Inter on Android. Button labels are 18 px bold (D33). Large title 34/41 bold. Numbers use SF Pro Rounded (iOS) or Inter tabular (Android): 24 to 52 bold; slice 2 adds chip label 14/17 semibold (note chips, segmented, timeline), slide label 19/23 bold, street title 20/24 semibold and turn distance 38/40 bold.
Touch targets: at least 48 pt; the main action while driving is at least 64 pt high.

## Motion (tokens, MASTER_EXECUTION §13.8)

Durations and curves are tokens in the same token file (D27). The springs are
Reanimated 4 configs; the component and screen slices tune them against the
frame-time evidence, and that change lands in the token file, never in a screen.

| Token | Value | Use |
|---|---|---|
| instant | 100 ms | pressed states, small ticks |
| quick | 180 ms | chips, pills, small fades |
| standard | 280 ms | sheet content, cards, tab transitions |
| morph | 280 ms | the Copilot sphere's state changes (inside D34's 200 to 350 ms band) |
| slow | 420 ms | full screen shared element grows |
| camera | 600 ms | the driving camera eases |
| route | 900 ms | the route line draws itself |
| curve standard | cubic-bezier(0.32, 0.72, 0, 1) | the usual moves |
| curve enter | cubic-bezier(0.16, 1, 0.3, 1) | arriving in place |
| curve exit | cubic-bezier(0.4, 0, 1, 1) | leaving |
| spring sheet | damping 26, stiffness 260, mass 1 | the spring sheets |
| spring sphere | damping 20, stiffness 180, mass 1 | the Copilot sphere (smoothed, never jittery) |
| spring thumb | damping 22, stiffness 220, mass 1 | the Slide to Deliver thumb |
| spring pin | damping 18, stiffness 140, mass 1 | the rising pins |
| reduced | beats of 0 to 240 ms, linear curves, no springs | a calm 2D path with fades |

## Components

1. Glass surface: `expo-glass-effect` GlassView on iOS 26+, with a runtime availability check. Fallback on Android and older iOS: a blur view with the glass token colour. Never a crash, never a plain grey box.
2. Floating tab bar with **Copilot in the centre** (founder decision 2026-10-23, D34; this replaces the right-side button in the reference screens).
   - **Layout:** Today, Route, [Copilot], Map, Account. Copilot is a raised round glass button of 64 to 72 pt in the middle of the bar, the largest target on the screen.
   - **Always visible:** it shows on every main screen, including Driving, where it floats bottom centre above the sheet.
   - **States:**
     - idle;
     - listening (a calm live level ring);
     - thinking;
     - speaking;
     - muted (struck through);
     - offline (the on-device model only).
   - **The button is a living 3D object, not a flat icon.**
     - **Material:** a real-time rendered glass sphere (Skia shader, Reanimated 4 on the UI thread) with physically based light: soft refraction of the map behind it, one specular highlight, a contact shadow on the bar. The accent blue is in the glass, not painted on.
     - **In tune with the voice:** the sphere reacts to the live audio level and pitch.
       - When the driver speaks, its surface ripples gently with the amplitude.
       - When Copilot speaks, it breathes with Copilot's own voice envelope, so lips and button move together.
       - Thinking is a slow inner swirl.
       - The motion is smoothed (spring, 60 fps), never jittery.
     - **State changes morph** (scale, light and tint) in 200 to 350 ms with a light haptic: idle, listening, thinking, speaking, muted, offline.
     - **No neon, rainbow glow or particles** (§13.2). It must look like a premium physical object, in light and dark.
     - **Reduced motion:** a calm level ring instead of the surface motion.
     - **Performance:** the audio analysis runs natively and is throttled. The battery and frame budget are measured on the driving screen with the rest of §13.8.
   - **Interaction:**
     - A tap starts talking, and a long press keeps listening.
     - The wake phrase and the earbud button work hands free.
     - A small caption under the bar shows the last thing heard, so the driver trusts it.
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
