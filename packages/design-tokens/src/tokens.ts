/**
 * Design Tokens for Courier Copilot
 *
 * The single source of truth for the visual language. `docs/design/SYSTEM.md`
 * is the contract this file implements; the founder-approved mockups in
 * `docs/design/mockups/` are the visual reference the colours come from.
 *
 * Rules the token package holds (SYSTEM.md §2):
 * - Colour is semantic only (`textPrimary`, `surface`, `border`,
 *   `statusDelivered`, ...). A component never writes a raw hex.
 * - The type face is Figtree, body text is never smaller than 17 pt, and the
 *   key numbers sit between 48 pt and 76 pt.
 * - Touch targets are at least 56 pt; the primary action is 72 pt.
 * - Spacing is on the 4-pt grid and only on the steps the contract names.
 * - Motion is 150-250 ms, with spring physics for the sheets, and the
 *   elevation scale has three levels and no shadow stacks.
 *
 * The measured contrast ratios of the three palettes live in `themes.ts`, and
 * `contrast.test.ts` fails the build when a pair drops below the bar.
 */

/**
 * The colour ramps.
 *
 * The names are Style Dictionary references (`{neutral.500}`), so the ramps
 * are the only place a hex is written. The neutral ramp is the cool ink grey
 * of the approved mockups; the brand ramp is the blue of the "NEXT" badge and
 * the links; the semantic ramps carry the delivery states.
 */
export const colors = {
  // Brand colours - the courier blue
  brand: {
    primary: {
      50: '#edf3fa',
      100: '#d6e4f4',
      200: '#afc9e8',
      300: '#7fa9d8',
      400: '#3e81c6',
      500: '#0b5cad', // Primary brand blue
      600: '#094c8c',
      700: '#073f78',
      800: '#062f59',
      900: '#052440',
      950: '#02121f',
    },
    secondary: {
      50: '#e4f2f5',
      100: '#c7e4ea',
      200: '#92cbd6',
      300: '#58aebd',
      400: '#2a92a5',
      500: '#0e7490', // Primary brand teal
      600: '#0a5468',
      700: '#084253',
      800: '#06313e',
      900: '#04212a',
      950: '#021116',
    },
  },

  // Semantic colours for status/feedback
  semantic: {
    success: {
      light: '#2e9e68',
      DEFAULT: '#16814c',
      dark: '#0f5f38',
      bg: '#e7f4ee',
      border: '#a9dcc3',
    },
    warning: {
      light: '#d9a441',
      DEFAULT: '#8a5a00',
      dark: '#6b4500',
      bg: '#fbf3e2',
      border: '#e8d3a3',
    },
    error: {
      light: '#e06a62',
      DEFAULT: '#b42318',
      dark: '#8c1a12',
      bg: '#fbe9e7',
      border: '#f0bdb8',
    },
    info: {
      light: '#3a9fb5',
      DEFAULT: '#0e7490',
      dark: '#0a5468',
      bg: '#e4f2f5',
      border: '#a9d8e2',
    },
  },

  // Neutral greys - the cool ink ramp of the mockups
  neutral: {
    0: '#ffffff',
    50: '#f4f6f7',
    100: '#e7ecee',
    200: '#d5dcdf',
    300: '#b7c1c6',
    400: '#828d93', // Borders and controls (3:1 on the day surfaces)
    500: '#63737c', // Tertiary text (4.5:1 on the day surfaces)
    600: '#56656e', // Secondary text (5.5:1 on the day surfaces)
    700: '#3a464d',
    800: '#222c32',
    900: '#11181c', // Primary text on the day theme
    950: '#0e1418', // The night background
  },

  // Background colours (semantic)
  background: {
    primary: '{neutral.0}',
    secondary: '{neutral.50}',
    tertiary: '{neutral.100}',
    inverse: '{neutral.900}',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  // Surface colours (cards, sheets, modals)
  surface: {
    primary: '{neutral.0}',
    secondary: '{neutral.50}',
    tertiary: '{neutral.100}',
    elevated: '{neutral.0}',
    inverse: '{neutral.900}',
  },

  // Border colours
  border: {
    light: '{neutral.200}',
    DEFAULT: '{neutral.400}',
    dark: '{neutral.600}',
    focus: '{brand.primary.500}',
    error: '{semantic.error.DEFAULT}',
  },

  // Text colours
  text: {
    primary: '{neutral.900}',
    secondary: '{neutral.600}',
    tertiary: '{neutral.500}',
    inverse: '{neutral.0}',
    link: '{brand.primary.500}',
    linkHover: '{brand.primary.700}',
    error: '{semantic.error.DEFAULT}',
    success: '{semantic.success.DEFAULT}',
    warning: '{semantic.warning.DEFAULT}',
  },

  // Icon colours
  icon: {
    primary: '{neutral.700}',
    secondary: '{neutral.500}',
    inverse: '{neutral.0}',
    brand: '{brand.primary.500}',
  },

  // Status colours for delivery states
  status: {
    pending: '{neutral.600}',
    active: '{brand.primary.500}',
    delivered: '{semantic.success.DEFAULT}',
    failed: '{semantic.error.DEFAULT}',
    skipped: '{semantic.warning.DEFAULT}',
  },
} as const;

/**
 * The spacing scale - the 4-pt grid, and only the steps the contract names
 * (`4 8 12 16 24 32 48`).
 *
 * The keys are the scale index, not the pixel value: `spacing.4` is 16 px and
 * `spacing.6` is 24 px. The steps that used to sit off the contract grid
 * (20, 40, 64, 80 and 96 px) are gone; a component that needs a bigger gap
 * uses the next step up.
 */
export const spacing = {
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  6: '24px',
  8: '32px',
  12: '48px',
} as const;

/**
 * Typography.
 *
 * Figtree is the family of the approved mockups. The scale has no step below
 * 17 px: the contract says body text is at least 17 pt, and the smallest
 * steps of the mockups (13-16 px metadata) are raised to 17 px so the
 * hierarchy survives and the contract does not.
 */
export const typography = {
  fontFamilies: {
    sans: 'Figtree, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
    display: 'Figtree, system-ui, sans-serif',
  },
  fontSizes: {
    xs: '17px', // The smallest step - captions, metadata, badges
    sm: '19px', // Secondary lines
    base: '20px', // Body
    lg: '22px', // Subheadings and button labels
    xl: '24px', // Headings - the WCAG large-text threshold
    '2xl': '28px', // The address line
    '3xl': '34px', // Screen titles
    '4xl': '48px', // Key numbers
    '5xl': '64px', // Key numbers
    '6xl': '76px', // The stop number on the driving sheet
  },
  fontWeights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extraBold: '800', // The weight of the key numbers in the mockups
  },
  lineHeights: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
  letterSpacing: {
    tight: '-0.02em',
    normal: '0',
    wide: '0.02em',
  },
} as const;

/**
 * The radii - `sm 4 / md 8 / lg 12 / xl 16 / full`.
 *
 * `DEFAULT` is the alias of `md`, kept because the components and the web
 * dashboard both read it.
 */
export const borderRadius = {
  none: '0',
  sm: '4px',
  DEFAULT: '8px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
} as const;

/**
 * The elevation scale - three levels and no shadow stacks.
 *
 * `elevation1`, `elevation2` and `elevation3` are the only real levels. The
 * other names are kept so nothing that already reads them breaks, and each
 * one points at the level that replaced it.
 */
export const shadows = {
  none: 'none',
  // The three levels of the contract.
  elevation1: '0 1px 2px rgba(16, 24, 28, 0.10), 0 1px 3px rgba(16, 24, 28, 0.08)',
  elevation2: '0 3px 6px rgba(16, 24, 28, 0.12), 0 2px 4px rgba(16, 24, 28, 0.08)',
  elevation3: '0 10px 20px rgba(16, 24, 28, 0.16), 0 3px 6px rgba(16, 24, 28, 0.10)',
  // The old names, now aliases of the levels above.
  xs: '0 1px 2px rgba(16, 24, 28, 0.10), 0 1px 3px rgba(16, 24, 28, 0.08)',
  sm: '0 1px 2px rgba(16, 24, 28, 0.10), 0 1px 3px rgba(16, 24, 28, 0.08)',
  DEFAULT: '0 1px 2px rgba(16, 24, 28, 0.10), 0 1px 3px rgba(16, 24, 28, 0.08)',
  md: '0 3px 6px rgba(16, 24, 28, 0.12), 0 2px 4px rgba(16, 24, 28, 0.08)',
  lg: '0 3px 6px rgba(16, 24, 28, 0.12), 0 2px 4px rgba(16, 24, 28, 0.08)',
  xl: '0 10px 20px rgba(16, 24, 28, 0.16), 0 3px 6px rgba(16, 24, 28, 0.10)',
  inner: 'none',
} as const;

/**
 * Motion.
 *
 * Every duration sits in the 150-250 ms band of the contract; the only
 * exception is `instant`, which is the reduce-motion branch. A sheet uses
 * `springs.sheet` - a critically damped spring, so it settles without
 * overshooting and the finger can carry the velocity into the dismissal.
 */
export const motion = {
  durations: {
    instant: '0ms',
    fast: '150ms',
    normal: '200ms',
    slow: '250ms',
    slower: '250ms',
  },
  easings: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    // A curve for the small, non-spring movements.
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  /**
   * The spring configurations.
   *
   * `duration` is Reanimated's perceptual duration: the wall time of the
   * animation is about 1.5 times it, so a 150 ms spring lands inside the
   * 150-250 ms band. `dampingRatio: 1` is critically damped - no overshoot.
   */
  springs: {
    sheet: { duration: 150, dampingRatio: 1 },
    settle: { duration: 200, dampingRatio: 1 },
  },
  /**
   * What "reduce motion" means for this product: the transition still happens,
   * it simply has no duration. The transition is never removed, only made
   * instant.
   */
  reducedMotion: {
    duration: '0ms',
  },
} as const;

// Z-index scale
export const zIndex = {
  hide: -1,
  base: 0,
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  modalBackdrop: 400,
  modal: 500,
  popover: 600,
  tooltip: 700,
  toast: 800,
  max: 9999,
} as const;

// Breakpoints (for responsive design)
export const breakpoints = {
  xs: '320px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

/**
 * Touch target sizes.
 *
 * The contract sets 56 pt as the floor and 72 pt for the primary action; the
 * floor is deliberately above the 24 px of WCAG 2.2 SC 2.5.8, because a
 * courier wears gloves and the phone is in a van.
 */
export const touchTarget = {
  minimum: '56px',
  comfortable: '56px',
  spacious: '72px',
  primary: '72px',
} as const;

// Component-specific tokens
export const components = {
  button: {
    height: {
      sm: '56px',
      DEFAULT: '56px',
      lg: '72px',
    },
    paddingX: {
      sm: '{spacing.3}',
      DEFAULT: '{spacing.4}',
      lg: '{spacing.6}',
    },
    borderRadius: '{borderRadius.DEFAULT}',
    fontSize: '{typography.fontSizes.sm}',
    fontWeight: '{typography.fontWeights.medium}',
  },
  input: {
    // The minimum height. The component uses `minHeight`, so 200 % text grows
    // the field instead of clipping the label.
    height: '{button.height.DEFAULT}',
    paddingX: '{spacing.4}',
    paddingY: '{spacing.2}',
    borderRadius: '{borderRadius.DEFAULT}',
    fontSize: '{typography.fontSizes.base}',
    borderWidth: '1px',
  },
  card: {
    padding: '{spacing.4}',
    borderRadius: '{borderRadius.lg}',
    shadow: '{shadows.elevation1}',
    borderWidth: '1px',
    borderColor: '{border.light}',
  },
  badge: {
    paddingX: '{spacing.2}',
    paddingY: '{spacing.1}',
    borderRadius: '{borderRadius.full}',
    fontSize: '{typography.fontSizes.xs}',
    fontWeight: '{typography.fontWeights.medium}',
  },
  list: {
    // The smallest a tappable row may be.
    itemMinHeight: '56px',
    separator: '1px',
  },
  /**
   * The elevation levels in the shape React Native wants.
   *
   * `shadows` above carries the CSS form for the web dashboard; these three
   * are the same levels for the app, and they are the only ones a component
   * may use.
   */
  elevation: {
    level1: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 1,
    },
    level2: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 3,
    },
    level3: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.16,
      shadowRadius: 20,
      elevation: 8,
    },
  },
  // Map-specific tokens (D16 custom map style)
  map: {
    // Day theme colours
    day: {
      background: '#f4f6f7',
      water: '#cfe3ef',
      land: '#edefea',
      road: '#ffffff',
      roadOutline: '#dde3e6',
      highway: '#f2b04b',
      highwayOutline: '#c98a22',
      building: '#e4e8ea',
      park: '#dde8dc',
      text: '#11181c',
      textHalo: '#ffffff',
      stopPin: '#0b5cad',
      stopPinHalo: '#ffffff',
      routeLine: '#0b5cad',
      routeLineWidth: '4px',
      geofenceApproach: 'rgba(11, 92, 173, 0.18)',
      geofenceImminent: 'rgba(11, 92, 173, 0.32)',
      userLocation: '#0e7490',
      userLocationHalo: 'rgba(14, 116, 144, 0.25)',
    },
    // Night theme colours
    night: {
      background: '#121a1f',
      water: '#0b2029',
      land: '#18232a',
      road: '#1e2a31',
      roadOutline: '#141d23',
      highway: '#f2b04b',
      highwayOutline: '#c98a22',
      building: '#18232a',
      park: '#16301f',
      text: '#f2f5f7',
      textHalo: '#121a1f',
      stopPin: '#7cc4ff',
      stopPinHalo: '#0e1418',
      routeLine: '#4fa8ff',
      routeLineWidth: '4px',
      geofenceApproach: 'rgba(124, 196, 255, 0.20)',
      geofenceImminent: 'rgba(124, 196, 255, 0.35)',
      userLocation: '#7cc4ff',
      userLocationHalo: 'rgba(124, 196, 255, 0.25)',
    },
    // High contrast theme colours
    highContrast: {
      background: '#000000',
      water: '#000080',
      land: '#000000',
      road: '#ffffff',
      roadOutline: '#000000',
      highway: '#ffff00',
      highwayOutline: '#000000',
      building: '#ffffff',
      park: '#008000',
      text: '#ffffff',
      textHalo: '#000000',
      stopPin: '#ffff00',
      stopPinHalo: '#000000',
      routeLine: '#00ffff',
      routeLineWidth: '5px',
      geofenceApproach: 'rgba(255, 255, 0, 0.5)',
      geofenceImminent: 'rgba(255, 255, 0, 0.8)',
      userLocation: '#00ffff',
      userLocationHalo: 'rgba(0, 255, 255, 0.5)',
    },
  },
} as const;

// Voice UI specific tokens
export const voice = {
  // Visual feedback for voice states
  listening: {
    pulseColor: '{brand.primary.500}',
    pulseDuration: '{motion.durations.slow}',
    ringWidth: '4px',
  },
  processing: {
    spinnerColor: '{brand.secondary.500}',
    spinnerDuration: '{motion.durations.normal}',
  },
  speaking: {
    waveColor: '{semantic.success.DEFAULT}',
    waveDuration: '{motion.durations.fast}',
  },
  error: {
    flashColor: '{semantic.error.DEFAULT}',
    flashDuration: '{motion.durations.fast}',
  },
  // Earbud button visual feedback
  earbud: {
    singleClick: '{semantic.success.DEFAULT}',
    doubleClick: '{semantic.warning.DEFAULT}',
    tripleClick: '{semantic.error.DEFAULT}',
    longPress: '{brand.primary.500}',
  },
} as const;

// Export all tokens as a single object for Style Dictionary
export const tokens = {
  color: colors,
  spacing,
  typography,
  borderRadius,
  shadow: shadows,
  motion,
  zIndex,
  breakpoint: breakpoints,
  touchTarget,
  component: components,
  voice,
} as const;

export type Tokens = typeof tokens;
