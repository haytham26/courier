/**
 * The Maps First design tokens (D27, the founder's chosen direction).
 *
 * This file is the ONE token file of the app: every colour, radius, spacing,
 * blur, type size, touch target and motion duration and curve a screen uses
 * comes from here, in a light and a dark set. The colour pairs a screen
 * forms are asserted against the D33 bars (MASTER_EXECUTION §13.9) by
 * `chosen-contrast.test.ts`: the test never weakens, the design changes.
 * The reference is `docs/design/chosen/` (the 13 HTML screens, the PNG
 * contact sheets and the README with the starting values). A screen never
 * writes a raw value; the ESLint rule in `@courier/eslint-config` fails the
 * build on a hex colour outside the token package.
 *
 * The values below are the README's starting values, not a theme we tweak:
 * changing one here restyles the whole app (that is the "editable by design"
 * contract of D27).
 *
 * The legacy token file (`tokens.ts` and its themes) still carries the
 * screens that predate the chosen design; it is deleted once every screen is
 * rebuilt against this file (the deprecation proof lives in the PR).
 */

/** Every colour a screen may use. No screen writes a value itself. */
export const colors = {
  light: {
    // The meaning colours.
    accent: '#0A7CFF', // actions, links, the route line
    success: '#34C759', // delivered, ahead of plan
    danger: '#FF3B30', // the next stop pin, failures
    warning: '#FF9500', // the dog, the hazards
    info2: '#5856D6', // the shelf, the parcel

    // The surfaces.
    background: '#F2F2F7',
    card: '#FFFFFF',
    label: '#000000',
    secondaryLabel: 'rgba(60,60,67,.9)', // D33: alpha .9 so the body bar clears 4.5:1 on every surface
    fill: 'rgba(120,120,128,.12)',
    separator: 'rgba(60,60,67,.29)',
    glass: 'rgba(255,255,255,.72)', // the glass fill of the light theme (the ranges are in glass)
    turnCard: '#14382A', // the dark green card of the next turn
    turnStrip: '#0F2C21', // the Then strip under the turn card
    scrim: 'rgba(0,0,0,.35)', // under overlays over arbitrary imagery (the scanner camera) so their labels are assertable

    // The map colours of the courier style.
    mapLand: '#F3EFE7',
    mapRoad: '#FFFFFF',
    mapWater: '#AAD3F2',
    mapPark: '#CDE8C4',

    onAccent: '#FFFFFF', // the label on the accent buttons (18 px bold, a large-text pair; D33)
    accentText: '#0857B4', // the accent as text (tab labels, links): darkened so the body bar clears 4.5:1 (D33)
    onCard: '#000000', // the label on the card surface
    onTurnCard: '#FFFFFF', // the distance and the street on the turn card
    onTurnStrip: 'rgba(255,255,255,.88)', // the Then strip label
    onDarkGlass: '#FFFFFF', // the label on the dark glass over the camera (both modes, D33)
    onSuccess: '#000000', // D33: the chip label and the Slide to Deliver are black on the green
    successText: '#14532D', // green as text (the delivered stat, Ready): darkened for the bars (D33)
    tabActiveFill: 'rgba(0,0,0,.06)', // the active tab's quiet pill (the reference's rgba(0,0,0,.06))
    grabber: 'rgba(60,60,67,.22)', // the sheet's grabber (the reference value)
    scanRing: '#FFD60A', // the scanner reticle ring (a non-text graphic; the address text inside carries the pair)
  } as const,

  dark: {
    accent: '#0A84FF',
    success: '#30D158',
    danger: '#FF453A',
    warning: '#FF9F0A',
    info2: '#5E5CE6',

    background: '#000000',
    card: '#1C1C1E',
    label: '#FFFFFF',
    secondaryLabel: 'rgba(235,235,245,.75)', // D33: alpha .75 (clears 7:1 on the dark sheet and 4.5:1 everywhere)
    fill: 'rgba(118,118,128,.24)',
    separator: 'rgba(84,84,88,.65)',
    glass: 'rgba(28,28,30,.62)',
    turnCard: '#0F2A1F',
    turnStrip: '#0B2018',
    scrim: 'rgba(0,0,0,.35)',

    mapLand: '#1B1D21',
    mapRoad: '#34373E',
    mapWater: '#16243A',
    mapPark: '#1D2A22',

    onAccent: '#FFFFFF',
    accentText: '#33A1FF', // brighter than the accent so the 10 px tab label clears 4.5:1 on the dark glass
    onCard: '#FFFFFF',
    onTurnCard: '#FFFFFF',
    onTurnStrip: 'rgba(255,255,255,.88)',
    onDarkGlass: '#FFFFFF',
    onSuccess: '#000000', // D33: black on the green in both modes
    successText: '#30D158',
    tabActiveFill: 'rgba(255,255,255,.06)', // D33: 10 percent failed the 4.5 bar over the worst glass branch; .06 clears it and stays visible
    grabber: 'rgba(235,235,245,.3)',
    scanRing: '#FFD60A',
  } as const,
};

export type MapsFirstColorMode = keyof typeof colors;

/** The glass recipe, per mode. The engine reads the range at runtime. */
export const glass = {
  /** The iOS 26 Liquid Glass engine: `expo-glass-effect` GlassView (Expo SDK 58). */
  engine: 'expo-glass-effect' as const,
  /** The check the component runs at startup (`GlassView.isGlassEffectAvailable()`). */
  availabilityKey: 'GlassView.isGlassEffectAvailable',
  /** Anywhere else (Android, iOS before 26): a blur view with this token colour. */
  fallback: 'blur' as const,
  blur: 28,
  /** The 180 % saturate belongs to the light recipe; dark keeps the raw mix. */
  saturate: { light: 1.8, dark: 1 } as const,
  fills: {
    light: { min: 0.72, max: 0.95 },
    dark: { min: 0.62, max: 0.9 },
  } as const,
  /**
   * The fills the reference screens use, per surface and mode (the envelope
   * above is the union of these). The sheets float at 86 to 95 percent in
   * light and at 90 percent in dark; the pills, the tab bar and the map
   * buttons sit at 72 percent with 62 as the dark envelope's floor. The D33
   * contrast test computes its worst cases from these envelopes.
   */
  fillsBySurface: {
    sheet: { light: { min: 0.86, max: 0.95 }, dark: { min: 0.9, max: 0.9 } },
    controls: { light: { min: 0.72, max: 0.72 }, dark: { min: 0.62, max: 0.72 } },
  } as const,
};

/** The corner radii. A component takes one of these, never a raw number. */
export const radii = {
  sheet: 40,
  card: 24,
  chip: 15,
  button: 27, // the pill
  mapButton: 24, // the circle of a 48 pt map button
  tabBar: 31,
  number: 31, // the reference screen of today (the bottom sheet bottom edge)
  pill: 18, // the top pills, the scanner pills and the small action pills (the reference's 17 to 18 unified)
  segmented: 12, // the segmented control's track
  segmentedSegment: 9, // a segment inside the track
  slideTrack: 32, // the 64 pt capsule of the Slide to Deliver
  turnCard: 30, // the next-turn card
  stripCorner: 16, // the Then strip's hanging bottom corners
  ghostButton: 22, // the 44 pt secondary actions of the sheet (Scan, Add by Voice, the day's actions)
} as const;

/**
 * The spacing steps of a 4 pt scale. A screen takes one of these named
 * steps; a raw padding is a design-gate fail. The steps are the founder's
 * scale: 4, 8, 12, 16, 20, 24, 32, 40, 48 and 64.
 */
export const spacing = {
  space4: 4,
  space8: 8,
  space12: 12,
  space16: 16,
  space20: 20,
  space24: 24,
  space32: 32,
  space40: 40,
  space48: 48,
  space64: 64,
} as const;

/** The type scale (iOS: SF Pro, Android: Inter; the numbers are tabular). */
export const typography = {
  family: {
    iOS: 'SF Pro' as const,
    android: 'Inter' as const,
    numbers: {
      iOS: 'SF Pro Rounded' as const,
      android: 'Inter' as const, // Inter's tabular figures
    },
  },
  label: { size: 10, lineHeight: 12, weight: '600' as const }, // the small section label in caps
  secondary: { size: 13, lineHeight: 16, weight: '600' as const },
  body: { size: 15, lineHeight: 19, weight: '600' as const },
  paragraph: { size: 17, lineHeight: 22, weight: '400' as const },
  emphasis: { size: 17, lineHeight: 22, weight: '600' as const },
  button: { size: 18, lineHeight: 22, weight: '700' as const }, // D33: every button label is 18 px bold (large text, 3:1)
  stat: { size: 26, lineHeight: 31, weight: '700' as const }, // the big number of a stat row
  largeTitle: { size: 34, lineHeight: 41, weight: '700' as const },
  chipLabel: { size: 14, lineHeight: 17, weight: '600' as const }, // the note chips and the segmented labels (14/600)
  slideLabel: { size: 19, lineHeight: 23, weight: '700' as const }, // the Slide to Deliver label
  streetTitle: { size: 20, lineHeight: 24, weight: '600' as const }, // the street on the turn card
  confirmTitle: { size: 24, lineHeight: 29, weight: '700' as const }, // the delivered confirm's title (the reference's 24 px header)
  turnDistance: { size: 38, lineHeight: 40, weight: '700' as const }, // the distance on the turn card (the rounded numbers)
  statRange: { min: 24, max: 52 } as const, // the bold numbers sit in this band
} as const;

/** The touch targets (the accessibility floor of the reference README). */
export const touch = {
  minimum: 48,
  /** The main action while driving. */
  drivingAction: 64,
} as const;

/**
 * The motion tokens: durations and curves live in the same file as every
 * other token (D27, MASTER_EXECUTION §13.8 rule 6). The springs are
 * Reanimated 4 configs; the component and screen slices tune them against
 * the frame-time evidence, and that change is made here, in one file,
 * never in a screen.
 */
export const motion = {
  duration: {
    instant: 100, // pressed states, small ticks
    quick: 180, // chips, pills, small fades
    standard: 280, // sheet content, cards, tab transitions
    morph: 280, // the Copilot sphere's state morphs, inside D34's 200 to 350 ms band
    slow: 420, // full-screen shared element grows
    camera: 600, // the MapLibre camera eases
    route: 900, // the route line draws itself
  } as const,
  curve: {
    standard: 'cubic-bezier(0.32, 0.72, 0, 1)',
    enter: 'cubic-bezier(0.16, 1, 0.3, 1)',
    exit: 'cubic-bezier(0.4, 0, 1, 1)',
    linear: 'linear',
  } as const,
  spring: {
    sheet: { damping: 26, stiffness: 260, mass: 1 }, // the spring sheets
    sphere: { damping: 20, stiffness: 180, mass: 1 }, // the Copilot sphere, smoothed, never jittery (D34)
    thumb: { damping: 22, stiffness: 220, mass: 1 }, // the Slide to Deliver thumb and its success morph
    pin: { damping: 18, stiffness: 140, mass: 1 }, // the pins rise gently
  } as const,
  /** Reduced motion (§13.8: a calm 2D path with fades instead of camera flights). */
  reduced: {
    duration: { instant: 0, quick: 120, standard: 160, morph: 160, slow: 200, camera: 150, route: 240 } as const,
    curve: { standard: 'linear', enter: 'linear', exit: 'linear', linear: 'linear' } as const,
    /** Springs become quick linear fades under reduced motion. */
    springs: false,
  } as const,
};

/**
 * Every value a screen needs, per mode, in one object: the one file the
 * screens read.
 */
export const tokens = (mode: MapsFirstColorMode) => ({
  mode,
  colors: colors[mode],
  glass: {
    ...glass,
    saturate: glass.saturate[mode],
    fillMin: glass.fills[mode].min,
    fillMax: glass.fills[mode].max,
    fillsBySurface: glass.fillsBySurface,
  },
  radii,
  spacing,
  typography,
  touch,
  motion,
});

export type Tokens = ReturnType<typeof tokens>;
