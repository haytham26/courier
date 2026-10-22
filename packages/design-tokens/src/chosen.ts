/**
 * The Maps First design tokens (D27, the founder's chosen direction).
 *
 * This file is the ONE token file of the app: every colour, radius, spacing,
 * blur and type size a screen uses comes from here, in a light and a dark
 * set. The reference is `docs/design/chosen/` (the 13 HTML screens, the PNG
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
    secondaryLabel: 'rgba(60,60,67,.6)',
    fill: 'rgba(120,120,128,.12)',
    separator: 'rgba(60,60,67,.29)',
    glass: 'rgba(255,255,255,.72)', // the glass fill of the light theme (the range is in glass)
    turnCard: '#14382A', // the dark green card of the next turn

    // The map colours of the courier style.
    mapLand: '#F3EFE7',
    mapRoad: '#FFFFFF',
    mapWater: '#AAD3F2',
    mapPark: '#CDE8C4',

    onAccent: '#FFFFFF', // the label on the accent pill
    onCard: '#000000', // the label on the card surface
    onTurnCard: '#FFFFFF',
    onSuccess: '#1B3A1D', // the label on a filled success chip
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
    secondaryLabel: 'rgba(235,235,245,.6)',
    fill: 'rgba(118,118,128,.24)',
    separator: 'rgba(84,84,88,.65)',
    glass: 'rgba(28,28,30,.62)',
    turnCard: '#0F2A1F',

    mapLand: '#1B1D21',
    mapRoad: '#34373E',
    mapWater: '#16243A',
    mapPark: '#1D2A22',

    onAccent: '#FFFFFF',
    onCard: '#FFFFFF',
    onTurnCard: '#FFFFFF',
    onSuccess: '#0E2812',
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
  stat: { size: 26, lineHeight: 31, weight: '700' as const }, // the big number of a stat row
  largeTitle: { size: 34, lineHeight: 41, weight: '700' as const },
  statRange: { min: 24, max: 52 } as const, // the bold numbers sit in this band
} as const;

/** The touch targets (the accessibility floor of the reference README). */
export const touch = {
  minimum: 48,
  /** The main action while driving. */
  drivingAction: 64,
} as const;

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
  },
  radii,
  spacing,
  typography,
  touch,
});

export type Tokens = ReturnType<typeof tokens>;
