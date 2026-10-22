/**
 * Theme definitions for Courier Copilot
 *
 * Day, Night and High Contrast (D16), consumed by Unistyles 3 on mobile and
 * by the web app as CSS variables.
 *
 * The colours come from the founder-approved mockups in
 * `docs/design/mockups/`, and every pair is measured against the bars of
 * `docs/design/SYSTEM.md` §6: **4.5:1 for body text, 3:1 for large text and
 * for the UI boundaries, 7:1 for the driving text**. `contrast.test.ts` fails
 * the build when a pair drops below its bar, so the numbers written below are
 * the numbers the test measures.
 *
 * The ratios in the comments were measured with the WCAG 2.x formula
 * ((L1 + 0.05) / (L2 + 0.05)) on 2026-10-21. The command that prints them
 * again is `pnpm --filter @courier/design-tokens contrast:report`.
 */

import { spacing, typography, borderRadius, shadows, motion, components } from './tokens';
import { themes2 } from './themes2';
import { themes2a } from './themes2a';

/**
 * The theme names.
 *
 * `day`, `night` and `highContrast` are the product themes the courier uses.
 * The three names below are the **Design Studio directions** (MASTER_EXECUTION
 * §13.4): three original looks for the founder to choose between. Each one is
 * a light palette, because the founder's rule is that the day is the default
 * and the night is the adapted option.
 *
 * The six names after them are the **second round** of the studio
 * (MASTER_EXECUTION §13.6): three directions, each with its own light palette
 * and its own adapted night palette, in the same semantic roles as `day` and
 * `night`. A component never grows a direction-named role.
 */
export type ThemeName =
  | 'day'
  | 'night'
  | 'highContrast'
  | 'roadbook'
  | 'beacon'
  | 'freight'
  | 'voiceRibbon'
  | 'voiceRibbonNight'
  | 'xrayParcel'
  | 'xrayParcelNight'
  | 'scanline'
  | 'scanlineNight'
  | 'weatherLight'
  | 'weatherLightNight'
  | 'hapticCity'
  | 'hapticCityNight'
  | 'nightShift'
  | 'nightShiftNight'
  | 'gantryRun'
  | 'gantryRunNight'
  | 'controlRoom'
  | 'controlRoomNight'
  | 'topo'
  | 'topoNight'
  | 'addressFirst'
  | 'addressFirstNight';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  /** The scrim behind a sheet or a modal. */
  overlay: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  brandPrimary: string;
  brandSecondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  // Status colors for delivery states
  statusPending: string;
  statusActive: string;
  statusDelivered: string;
  statusFailed: string;
  statusSkipped: string;
  // Map-specific
  mapBackground: string;
  mapWater: string;
  mapLand: string;
  mapRoad: string;
  mapHighway: string;
  mapBuilding: string;
  mapPark: string;
  mapText: string;
  stopPin: string;
  routeLine: string;
  userLocation: string;
  // Allow dynamic access for status colors
  [key: string]: string;
}

export interface Theme {
  name: ThemeName;
  displayName: string;
  colors: ThemeColors;
  spacing: typeof spacing;
  typography: typeof typography;
  borderRadius: typeof borderRadius;
  shadows: typeof shadows;
  motion: typeof motion;
  components: typeof components;
}

const baseTheme: Omit<Theme, 'name' | 'displayName' | 'colors'> = {
  spacing,
  typography,
  borderRadius,
  shadows,
  motion,
  components,
};

/**
 * Day theme (default).
 *
 * The colours of the approved "Today's list" mockup: the paper is the cool
 * grey #F4F6F7, the cards are white, the accent is the blue of the "NEXT"
 * badge.
 *
 * Measured contrast (background #F4F6F7 / surface #FFFFFF):
 *   textPrimary      #11181C  16.54:1  / 17.93:1   (bar 4.5:1)
 *   textSecondary    #56656E   5.56:1  /  6.03:1   (bar 4.5:1)
 *   textTertiary     #5F6F78   4.81:1  /  5.21:1   (bar 4.5:1)
 *   brandPrimary     #0B5CAD   6.15:1  /  6.67:1   (bar 4.5:1)
 *   brandSecondary   #0E7490   4.94:1  /  5.36:1   (bar 4.5:1)
 *   success          #1A7341   5.42:1  /  5.88:1   (bar 4.5:1)
 *   warning          #8A5A00   5.47:1  /  5.93:1   (bar 4.5:1)
 *   error            #B42318   6.06:1  /  6.57:1   (bar 4.5:1)
 *   info             #0E7490   4.94:1  /  5.36:1   (bar 4.5:1)
 *   statusPending    #56656E   5.56:1  /  6.03:1   (bar 4.5:1)
 *   statusActive     #0B5CAD   6.15:1  /  6.67:1   (bar 4.5:1)
 *   statusDelivered  #1A7341   5.42:1  /  5.88:1   (bar 4.5:1)
 *   statusFailed     #B42318   6.06:1  /  6.57:1   (bar 4.5:1)
 *   statusSkipped    #8A5A00   5.47:1  /  5.93:1   (bar 4.5:1)
 *   border           #828D93   3.13:1  /  3.40:1   (bar 3:1, non-text)
 * The label on a filled surface (textInverse #FFFFFF):
 *   on brandPrimary 6.67:1 · on success 5.88:1 · on warning 5.93:1 ·
 *   on error 6.57:1 · on statusPending 6.03:1 · on statusActive 6.67:1 ·
 *   on statusDelivered 5.88:1 · on statusFailed 6.57:1 · on statusSkipped 5.93:1
 * The badge tint (12.5 % of the colour over the surface):
 *   brandPrimary 5.54:1 · success 4.95:1 · warning 5.00:1 · error 5.40:1 ·
 *   info 4.53:1
 */
export const dayTheme: Theme = {
  ...baseTheme,
  name: 'day',
  displayName: 'Day',
  colors: {
    background: '#f4f6f7',
    surface: '#ffffff',
    surfaceElevated: '#ffffff',
    overlay: '#00000080',
    border: '#828d93',
    textPrimary: '#11181c',
    textSecondary: '#56656e',
    textTertiary: '#5f6f78',
    textInverse: '#ffffff',
    brandPrimary: '#0b5cad',
    brandSecondary: '#0e7490',
    success: '#1a7341',
    warning: '#8a5a00',
    error: '#b42318',
    info: '#0e7490',
    // Status
    statusPending: '#56656e',
    statusActive: '#0b5cad',
    statusDelivered: '#1a7341',
    statusFailed: '#b42318',
    statusSkipped: '#8a5a00',
    // Map
    mapBackground: '#f4f6f7',
    mapWater: '#cfe3ef',
    mapLand: '#edefea',
    mapRoad: '#ffffff',
    mapHighway: '#f2b04b',
    mapBuilding: '#e4e8ea',
    mapPark: '#dde8dc',
    mapText: '#11181c',
    stopPin: '#0b5cad',
    routeLine: '#0b5cad',
    userLocation: '#0e7490',
  },
};

/**
 * Night theme.
 *
 * The colours of the approved "Driving mode" mockup: the night background is
 * near-black (#0E1418, never pure black), the sheet is #172026, the cards are
 * #1A242B and the accent is the light blue of the listening dot.
 *
 * Measured contrast (background #0E1418 / surface #172026 / elevated #1A242B):
 *   textPrimary      #F2F5F7  16.94:1 / 15.09:1 / 14.41:1  (bar 4.5:1, 7:1 driving)
 *   textSecondary    #9FB0BA   8.30:1 /  7.39:1 /  7.06:1  (bar 4.5:1, 7:1 driving)
 *   textTertiary     #8A9BA5   6.46:1 /  5.75:1 /  5.49:1  (bar 4.5:1)
 *   brandPrimary     #7CC4FF   9.89:1 /  8.81:1 /  8.41:1  (bar 4.5:1)
 *   brandSecondary   #67E8F9  12.80:1 / 11.40:1 / 10.88:1  (bar 4.5:1)
 *   success          #5BD38A   9.83:1 /  8.76:1 /  8.36:1  (bar 4.5:1)
 *   warning          #F2B04B   9.79:1 /  8.72:1 /  8.33:1  (bar 4.5:1)
 *   error            #FF8A80   8.13:1 /  7.24:1 /  6.91:1  (bar 4.5:1)
 *   info             #67E8F9  12.80:1 / 11.40:1 / 10.88:1  (bar 4.5:1)
 *   statusPending    #9FB0BA   8.30:1 /  7.39:1 /  7.06:1  (bar 4.5:1)
 *   statusActive     #7CC4FF   9.89:1 /  8.81:1 /  8.41:1  (bar 4.5:1)
 *   statusDelivered  #5BD38A   9.83:1 /  8.76:1 /  8.36:1  (bar 4.5:1)
 *   statusFailed     #FF8A80   8.13:1 /  7.24:1 /  6.91:1  (bar 4.5:1)
 *   statusSkipped    #F2B04B   9.79:1 /  8.72:1 /  8.33:1  (bar 4.5:1)
 *   border           #60737E   3.76:1 /  3.34:1 /  3.19:1  (bar 3:1, non-text)
 * The label on a filled surface (textInverse #0E1418):
 *   on brandPrimary 9.89:1 · on success 9.83:1 · on warning 9.79:1 ·
 *   on error 8.13:1 · on statusPending 8.30:1 · on statusActive 9.89:1 ·
 *   on statusDelivered 9.83:1 · on statusFailed 8.13:1 · on statusSkipped 9.79:1
 * The badge tint (12.5 % of the colour over the surface):
 *   brandPrimary 6.84:1 · success 6.90:1 · warning 6.92:1 · error 5.90:1 ·
 *   info 8.51:1
 */
export const nightTheme: Theme = {
  ...baseTheme,
  name: 'night',
  displayName: 'Night',
  colors: {
    background: '#0e1418',
    surface: '#172026',
    surfaceElevated: '#1a242b',
    overlay: '#00000080',
    border: '#60737e',
    textPrimary: '#f2f5f7',
    textSecondary: '#9fb0ba',
    textTertiary: '#8a9ba5',
    textInverse: '#0e1418',
    brandPrimary: '#7cc4ff',
    brandSecondary: '#67e8f9',
    success: '#5bd38a',
    warning: '#f2b04b',
    error: '#ff8a80',
    info: '#67e8f9',
    // Status
    statusPending: '#9fb0ba',
    statusActive: '#7cc4ff',
    statusDelivered: '#5bd38a',
    statusFailed: '#ff8a80',
    statusSkipped: '#f2b04b',
    // Map
    mapBackground: '#121a1f',
    mapWater: '#0b2029',
    mapLand: '#18232a',
    mapRoad: '#1e2a31',
    mapHighway: '#f2b04b',
    mapBuilding: '#18232a',
    mapPark: '#16301f',
    mapText: '#f2f5f7',
    stopPin: '#7cc4ff',
    routeLine: '#4fa8ff',
    userLocation: '#7cc4ff',
  },
};

/**
 * High contrast theme (accessibility).
 *
 * Black on black surfaces, white text, and the three status hues of the
 * accessibility ramp. Every pair is far above the bar; the theme exists for
 * the couriers who need it, not for the brand.
 *
 * Measured contrast (background #000000 / surface #000000 / elevated #0A0A0A):
 *   textPrimary      #FFFFFF  21.00:1 / 21.00:1 / 19.80:1  (bar 4.5:1)
 *   textSecondary    #E6E6E6  16.83:1 / 16.83:1 / 15.86:1  (bar 4.5:1)
 *   textTertiary     #BFBFBF  11.42:1 / 11.42:1 / 10.77:1  (bar 4.5:1)
 *   brandPrimary     #FFFF00  19.56:1 / 19.56:1 / 18.44:1  (bar 4.5:1)
 *   brandSecondary   #00FFFF  16.75:1 / 16.75:1 / 15.79:1  (bar 4.5:1)
 *   success          #00FF00  15.30:1 / 15.30:1 / 14.43:1  (bar 4.5:1)
 *   warning          #FFFF00  19.56:1 / 19.56:1 / 18.44:1  (bar 4.5:1)
 *   error            #FF5C5C   6.94:1 /  6.94:1 /  6.54:1  (bar 4.5:1)
 *   info             #00FFFF  16.75:1 / 16.75:1 / 15.79:1  (bar 4.5:1)
 *   statusPending    #BFBFBF  11.42:1 / 11.42:1 / 10.77:1  (bar 4.5:1)
 *   statusActive     #00FFFF  16.75:1 / 16.75:1 / 15.79:1  (bar 4.5:1)
 *   statusDelivered  #00FF00  15.30:1 / 15.30:1 / 14.43:1  (bar 4.5:1)
 *   statusFailed     #FF5C5C   6.94:1 /  6.94:1 /  6.54:1  (bar 4.5:1)
 *   statusSkipped    #FFFF00  19.56:1 / 19.56:1 / 18.44:1  (bar 4.5:1)
 *   border           #FFFFFF  21.00:1 / 21.00:1 / 19.80:1  (bar 3:1, non-text)
 * The label on a filled surface (textInverse #000000):
 *   on brandPrimary 19.56:1 · on success 15.30:1 · on warning 19.56:1 ·
 *   on error 6.94:1 · on statusPending 11.42:1 · on statusActive 16.75:1 ·
 *   on statusDelivered 15.30:1 · on statusFailed 6.94:1 · on statusSkipped 19.56:1
 * The badge tint (12.5 % of the colour over the surface):
 *   brandPrimary 15.59:1 · success 12.80:1 · warning 15.59:1 · error 6.24:1 ·
 *   info 13.78:1
 */
export const highContrastTheme: Theme = {
  ...baseTheme,
  name: 'highContrast',
  displayName: 'High Contrast',
  colors: {
    background: '#000000',
    surface: '#000000',
    surfaceElevated: '#0a0a0a',
    overlay: '#00000080',
    border: '#ffffff',
    textPrimary: '#ffffff',
    textSecondary: '#e6e6e6',
    textTertiary: '#bfbfbf',
    textInverse: '#000000',
    brandPrimary: '#ffff00',
    brandSecondary: '#00ffff',
    success: '#00ff00',
    warning: '#ffff00',
    error: '#ff5c5c',
    info: '#00ffff',
    // Status
    statusPending: '#bfbfbf',
    statusActive: '#00ffff',
    statusDelivered: '#00ff00',
    statusFailed: '#ff5c5c',
    statusSkipped: '#ffff00',
    // Map
    mapBackground: '#000000',
    mapWater: '#000080',
    mapLand: '#000000',
    mapRoad: '#ffffff',
    mapHighway: '#ffff00',
    mapBuilding: '#ffffff',
    mapPark: '#008000',
    mapText: '#ffffff',
    stopPin: '#ffff00',
    routeLine: '#00ffff',
    userLocation: '#00ffff',
  },
};

/**
 * The Roadbook direction (Design Studio §13.4, direction A).
 *
 * **Dense and operational.** The screen is a courier's paper run sheet:
 * warm paper, black ink, one highway-amber accent and hairline rules
 * instead of cards. Everything is aligned to a column grid, the numbers are
 * tabular, and eight stops fit on a phone without scrolling.
 *
 * Measured contrast (background #F4F1EA / surface #FFFFFF / elevated #FBFAF6):
 *   textPrimary      #16181A  15.78:1 / 17.80:1 / 17.04:1  (bar 4.5:1)
 *   textSecondary    #4C5359   6.92:1 /  7.81:1 /  7.48:1  (bar 4.5:1)
 *   textTertiary     #5C646A   5.34:1 /  6.02:1 /  5.77:1  (bar 4.5:1)
 *   brandPrimary     #8A4B00   6.03:1 /  6.80:1 /  6.51:1  (bar 4.5:1)
 *   brandSecondary   #2C5E6B   6.37:1 /  7.19:1 /  6.88:1  (bar 4.5:1)
 *   success          #14653C   6.30:1 /  7.10:1 /  6.80:1  (bar 4.5:1)
 *   warning          #8A5A00   5.25:1 /  5.93:1 /  5.67:1  (bar 4.5:1)
 *   error            #A32018   6.70:1 /  7.56:1 /  7.24:1  (bar 4.5:1)
 *   info             #2C5E6B   6.37:1 /  7.19:1 /  6.88:1  (bar 4.5:1)
 *   statusPending    #4C5359   6.92:1 /  7.81:1 /  7.48:1  (bar 4.5:1)
 *   statusActive     #8A4B00   6.03:1 /  6.80:1 /  6.51:1  (bar 4.5:1)
 *   statusDelivered  #14653C   6.30:1 /  7.10:1 /  6.80:1  (bar 4.5:1)
 *   statusFailed     #A32018   6.70:1 /  7.56:1 /  7.24:1  (bar 4.5:1)
 *   statusSkipped    #8A5A00   5.25:1 /  5.93:1 /  5.67:1  (bar 4.5:1)
 *   border           #7D7869   3.91:1 /  4.41:1 /  4.22:1  (bar 3:1, non-text)
 * The label on a filled surface (textInverse #FFFFFF):
 *   on brandPrimary 6.80:1 · on brandSecondary 7.19:1 · on success 7.10:1 ·
 *   on warning 5.93:1 · on error 7.56:1 · on statusPending 7.81:1 ·
 *   on statusActive 6.80:1 · on statusDelivered 7.10:1 · on statusFailed 7.56:1
 * The badge tint (12.5 % of the colour over the surface):
 *   brandPrimary 5.64:1 · brandSecondary 5.97:1 · success 5.88:1 ·
 *   warning 4.95:1 · error 6.10:1 · info 5.97:1
 */
export const roadbookTheme: Theme = {
  ...baseTheme,
  name: 'roadbook',
  displayName: 'Roadbook',
  colors: {
    background: '#f4f1ea',
    surface: '#ffffff',
    surfaceElevated: '#fbfaf6',
    overlay: '#00000080',
    border: '#7d7869',
    textPrimary: '#16181a',
    textSecondary: '#4c5359',
    textTertiary: '#5c646a',
    textInverse: '#ffffff',
    brandPrimary: '#8a4b00',
    brandSecondary: '#2c5e6b',
    success: '#14653c',
    warning: '#8a5a00',
    error: '#a32018',
    info: '#2c5e6b',
    // Status
    statusPending: '#4c5359',
    statusActive: '#8a4b00',
    statusDelivered: '#14653c',
    statusFailed: '#a32018',
    statusSkipped: '#8a5a00',
    // Map
    mapBackground: '#f4f1ea',
    mapWater: '#dce9ec',
    mapLand: '#efede6',
    mapRoad: '#ffffff',
    mapHighway: '#f0b357',
    mapBuilding: '#e6e2d8',
    mapPark: '#e4ead9',
    mapText: '#16181a',
    stopPin: '#8a4b00',
    routeLine: '#8a4b00',
    userLocation: '#2c5e6b',
  },
};

/**
 * The Beacon direction (Design Studio §13.4, direction B).
 *
 * **Calm and glanceable.** One thing on the screen at a time: the number of
 * stops left, then the address, then the one action. The palette is a cool
 * paper white with a deep sea teal, the rules are thin and the space is
 * generous, so a courier reads it in one glance while the van is moving.
 *
 * Measured contrast (background #EDF1F2 / surface #FFFFFF / elevated #F7FAFA):
 *   textPrimary      #111A1C  15.54:1 / 17.67:1 / 16.84:1  (bar 4.5:1)
 *   textSecondary    #4A5A5E   6.33:1 /  7.20:1 /  6.86:1  (bar 4.5:1)
 *   textTertiary     #586A6E   4.99:1 /  5.67:1 /  5.41:1  (bar 4.5:1)
 *   brandPrimary     #0B5A61   6.97:1 /  7.93:1 /  7.55:1  (bar 4.5:1)
 *   brandSecondary   #2E6F4E   5.28:1 /  6.00:1 /  5.72:1  (bar 4.5:1)
 *   success          #12603C   6.68:1 /  7.60:1 /  7.24:1  (bar 4.5:1)
 *   warning          #7A5200   6.09:1 /  6.92:1 /  6.59:1  (bar 4.5:1)
 *   error            #A11F17   6.78:1 /  7.71:1 /  7.35:1  (bar 4.5:1)
 *   info             #0B5A61   6.97:1 /  7.93:1 /  7.55:1  (bar 4.5:1)
 *   statusPending    #4A5A5E   6.33:1 /  7.20:1 /  6.86:1  (bar 4.5:1)
 *   statusActive     #0B5A61   6.97:1 /  7.93:1 /  7.55:1  (bar 4.5:1)
 *   statusDelivered  #12603C   6.68:1 /  7.60:1 /  7.24:1  (bar 4.5:1)
 *   statusFailed     #A11F17   6.78:1 /  7.71:1 /  7.35:1  (bar 4.5:1)
 *   statusSkipped    #7A5200   6.09:1 /  6.92:1 /  6.59:1  (bar 4.5:1)
 *   border           #6E7A80   3.88:1 /  4.41:1 /  4.20:1  (bar 3:1, non-text)
 * The label on a filled surface (textInverse #FFFFFF):
 *   on brandPrimary 7.93:1 · on brandSecondary 6.00:1 · on success 7.60:1 ·
 *   on warning 6.92:1 · on error 7.71:1 · on statusPending 7.20:1 ·
 *   on statusActive 7.93:1 · on statusDelivered 7.60:1 · on statusFailed 7.71:1
 * The badge tint (12.5 % of the colour over the surface):
 *   brandPrimary 6.48:1 · brandSecondary 5.03:1 · success 6.24:1 ·
 *   warning 5.72:1 · error 6.20:1 · info 6.48:1
 */
export const beaconTheme: Theme = {
  ...baseTheme,
  name: 'beacon',
  displayName: 'Beacon',
  colors: {
    background: '#edf1f2',
    surface: '#ffffff',
    surfaceElevated: '#f7fafa',
    overlay: '#00000080',
    border: '#6e7a80',
    textPrimary: '#111a1c',
    textSecondary: '#4a5a5e',
    textTertiary: '#586a6e',
    textInverse: '#ffffff',
    brandPrimary: '#0b5a61',
    brandSecondary: '#2e6f4e',
    success: '#12603c',
    warning: '#7a5200',
    error: '#a11f17',
    info: '#0b5a61',
    // Status
    statusPending: '#4a5a5e',
    statusActive: '#0b5a61',
    statusDelivered: '#12603c',
    statusFailed: '#a11f17',
    statusSkipped: '#7a5200',
    // Map
    mapBackground: '#edf1f2',
    mapWater: '#dce8ec',
    mapLand: '#e9eeec',
    mapRoad: '#ffffff',
    mapHighway: '#e0b36a',
    mapBuilding: '#e2e8e6',
    mapPark: '#dde8de',
    mapText: '#111a1c',
    stopPin: '#0b5a61',
    routeLine: '#0b5a61',
    userLocation: '#2e6f4e',
  },
};

/**
 * The Freight direction (Design Studio §13.4, direction C).
 *
 * **Expressive and branded.** The screen is a parcel label: hard corners, a
 * kraft tint, a deep highway orange and a lot of black type. The brand shows
 * through one block of colour and one oversized number, not through a
 * gradient and not through a glassy panel.
 *
 * Measured contrast (background #FFFFFF / surface #FFFFFF / elevated #F7F3ED):
 *   textPrimary      #0F1113  18.92:1 / 18.92:1 / 17.12:1  (bar 4.5:1)
 *   textSecondary    #4A4F55   8.27:1 /  8.27:1 /  7.48:1  (bar 4.5:1)
 *   textTertiary     #5B6169   6.25:1 /  6.25:1 /  5.66:1  (bar 4.5:1)
 *   brandPrimary     #B03A0A   6.08:1 /  6.08:1 /  5.50:1  (bar 4.5:1)
 *   brandSecondary   #7C2D12   9.37:1 /  9.37:1 /  8.48:1  (bar 4.5:1)
 *   success          #166534   7.13:1 /  7.13:1 /  6.45:1  (bar 4.5:1)
 *   warning          #92400E   7.09:1 /  7.09:1 /  6.41:1  (bar 4.5:1)
 *   error            #B91C1C   6.47:1 /  6.47:1 /  5.85:1  (bar 4.5:1)
 *   info             #0C6B85   6.07:1 /  6.07:1 /  5.49:1  (bar 4.5:1)
 *   statusPending    #4A4F55   8.27:1 /  8.27:1 /  7.48:1  (bar 4.5:1)
 *   statusActive     #B03A0A   6.08:1 /  6.08:1 /  5.50:1  (bar 4.5:1)
 *   statusDelivered  #166534   7.13:1 /  7.13:1 /  6.45:1  (bar 4.5:1)
 *   statusFailed     #B91C1C   6.47:1 /  6.47:1 /  5.85:1  (bar 4.5:1)
 *   statusSkipped    #92400E   7.09:1 /  7.09:1 /  6.41:1  (bar 4.5:1)
 *   border           #7A7F87   4.03:1 /  4.03:1 /  3.64:1  (bar 3:1, non-text)
 * The label on a filled surface (textInverse #FFFFFF):
 *   on brandPrimary 6.08:1 · on brandSecondary 9.37:1 · on success 7.13:1 ·
 *   on warning 7.09:1 · on error 6.47:1 · on info 6.07:1 ·
 *   on statusPending 8.27:1 · on statusActive 6.08:1 ·
 *   on statusDelivered 7.13:1 · on statusFailed 6.47:1
 * The badge tint (12.5 % of the colour over the surface):
 *   brandPrimary 5.00:1 · brandSecondary 7.57:1 · success 5.90:1 ·
 *   warning 5.83:1 · error 5.24:1 · info 5.08:1
 */
export const freightTheme: Theme = {
  ...baseTheme,
  name: 'freight',
  displayName: 'Freight',
  colors: {
    background: '#ffffff',
    surface: '#ffffff',
    surfaceElevated: '#f7f3ed',
    overlay: '#00000080',
    border: '#7a7f87',
    textPrimary: '#0f1113',
    textSecondary: '#4a4f55',
    textTertiary: '#5b6169',
    textInverse: '#ffffff',
    brandPrimary: '#b03a0a',
    brandSecondary: '#7c2d12',
    success: '#166534',
    warning: '#92400e',
    error: '#b91c1c',
    info: '#0c6b85',
    // Status
    statusPending: '#4a4f55',
    statusActive: '#b03a0a',
    statusDelivered: '#166534',
    statusFailed: '#b91c1c',
    statusSkipped: '#92400e',
    // Map
    mapBackground: '#ffffff',
    mapWater: '#d9e5ea',
    mapLand: '#f2eee7',
    mapRoad: '#ffffff',
    mapHighway: '#b03a0a',
    mapBuilding: '#e6e1d8',
    mapPark: '#dfe7da',
    mapText: '#0f1113',
    stopPin: '#b03a0a',
    routeLine: '#b03a0a',
    userLocation: '#0c6b85',
  },
};

/**
 * The Voice Ribbon direction (Design Studio round two, direction 04).
 *
 * **The companion is the interface.** A live amplitude ribbon along the
 * bottom edge carries the voice state and replaces the buttons; the motion of
 * the screen is the motion of the microphone.
 *
 * The palette is **P6 Clay** of `docs/design/RESEARCH-2.md` §5.2: burnt
 * sienna and a deep teal on a neutral white. Two chromatic colours, so no
 * pair of them is a purple-to-blue gradient and the accent never carries the
 * meaning alone.
 *
 * Measured contrast (background #E8E5E6 / surface #FFFFFF / elevated #F1EFEF):
 *   textPrimary      #151314  14.78:1 / 18.50:1 / 16.15:1  (bar 4.5:1, 7:1 driving)
 *   textSecondary    #4A4547   7.51:1 /  9.40:1 /  8.21:1  (bar 4.5:1, 7:1 driving)
 *   brandPrimary     #8C3B1A   6.09:1 /  7.62:1 /  6.65:1  (bar 4.5:1)
 *   brandSecondary   #2F5D5A   5.92:1 /  7.41:1 /  6.47:1  (bar 4.5:1)
 *   error            #A11E18   6.18:1 /  7.74:1 /  6.75:1  (bar 4.5:1)
 *   border           #6B6567   4.56:1 /  5.70:1 /  4.98:1  (bar 3:1, non-text)
 * The label on the accent (#FFFFFF on #8C3B1A): 7.62:1.
 */
export const voiceRibbonTheme: Theme = {
  ...baseTheme,
  name: 'voiceRibbon',
  displayName: 'Voice Ribbon',
  colors: {
    background: '#e8e5e6',
    surface: '#ffffff',
    surfaceElevated: '#f1efef',
    overlay: '#00000080',
    border: '#6b6567',
    textPrimary: '#151314',
    textSecondary: '#4a4547',
    textTertiary: '#55504f',
    textInverse: '#ffffff',
    brandPrimary: '#8c3b1a',
    brandSecondary: '#2f5d5a',
    success: '#1d5b34',
    warning: '#7a4a00',
    error: '#a11e18',
    info: '#2f5d5a',
    // Status
    statusPending: '#4a4547',
    statusActive: '#8c3b1a',
    statusDelivered: '#1d5b34',
    statusFailed: '#a11e18',
    statusSkipped: '#7a4a00',
    // Map
    mapBackground: '#e8e5e6',
    mapWater: '#dbe2e0',
    mapLand: '#f1efef',
    mapRoad: '#ffffff',
    mapHighway: '#e9d3a4',
    mapBuilding: '#e3e0e1',
    mapPark: '#dde4da',
    mapText: '#151314',
    stopPin: '#8c3b1a',
    routeLine: '#2f5d5a',
    userLocation: '#2f5d5a',
  },
};

/**
 * The Voice Ribbon direction at night.
 *
 * The night palette is a re-think, not a filter: the ground is a warm
 * near-black (#121110, blue channel 16), the text is warm off-white and the
 * ribbon is the only saturated thing on the screen.
 *
 * Measured contrast (background #121110 / surface #1B1A19 / elevated #242322):
 *   textPrimary      #F1EDEB  16.21:1 / 14.94:1 / 13.49:1  (bar 4.5:1, 7:1 driving)
 *   textSecondary    #C8C1BD  10.62:1 /  9.78:1 /  8.83:1  (bar 4.5:1, 7:1 driving)
 *   brandPrimary     #DD8256   6.65:1 /  6.13:1 /  5.53:1  (bar 4.5:1)
 *   brandSecondary   #71B3AE   7.87:1 /  7.25:1 /  6.55:1  (bar 4.5:1)
 *   error            #E8736A   6.37:1 /  5.87:1 /  5.34:1  (bar 4.5:1)
 *   border           #7D7674   4.24:1 /  3.90:1 /  3.52:1  (bar 3:1, non-text)
 * The label on the accent (#121110 on #DD8256): 6.65:1.
 */
export const voiceRibbonNightTheme: Theme = {
  ...baseTheme,
  name: 'voiceRibbonNight',
  displayName: 'Voice Ribbon (night)',
  colors: {
    background: '#121110',
    surface: '#1b1a19',
    surfaceElevated: '#242322',
    overlay: '#00000080',
    border: '#7d7674',
    textPrimary: '#f1edeb',
    textSecondary: '#c8c1bd',
    textTertiary: '#afa7a3',
    textInverse: '#121110',
    brandPrimary: '#dd8256',
    brandSecondary: '#71b3ae',
    success: '#59b184',
    warning: '#d8a83c',
    error: '#e8736a',
    info: '#71b3ae',
    // Status
    statusPending: '#c8c1bd',
    statusActive: '#dd8256',
    statusDelivered: '#59b184',
    statusFailed: '#e8736a',
    statusSkipped: '#d8a83c',
    // Map
    mapBackground: '#121110',
    mapWater: '#151d1c',
    mapLand: '#1b1a19',
    mapRoad: '#242322',
    mapHighway: '#8a7550',
    mapBuilding: '#201f1e',
    mapPark: '#1a241c',
    mapText: '#f1edeb',
    stopPin: '#dd8256',
    routeLine: '#71b3ae',
    userLocation: '#71b3ae',
  },
};

/**
 * The X-ray Parcel direction (Design Studio round two, direction 05).
 *
 * **The parcel is the hero object.** The delivery is a physical act: the
 * parcel is a dimensional object, the van has a rack, and the stop is a place
 * you arrive at rather than a row in a list.
 *
 * The palette is **P1 HiVis** of `docs/design/RESEARCH-2.md` §5.2: safety
 * orange and kelp green on a cool white. The orange is the parcel, the green
 * is the map and the run.
 *
 * Measured contrast (background #E9EBE5 / surface #FFFFFF / elevated #F0F1EC):
 *   textPrimary      #14161A  15.08:1 / 18.11:1 / 15.95:1  (bar 4.5:1, 7:1 driving)
 *   textSecondary    #454A4F   7.45:1 /  8.95:1 /  7.89:1  (bar 4.5:1, 7:1 driving)
 *   brandPrimary     #A63A00   5.42:1 /  6.51:1 /  5.73:1  (bar 4.5:1)
 *   brandSecondary   #14563C   7.20:1 /  8.66:1 /  7.72:1  (bar 4.5:1)
 *   error            #A01810   6.64:1 /  7.98:1 /  7.11:1  (bar 4.5:1)
 *   border           #6B7067   4.22:1 /  5.07:1 /  4.47:1  (bar 3:1, non-text)
 * The label on the accent (#FFFFFF on #A63A00): 6.51:1.
 */
export const xrayParcelTheme: Theme = {
  ...baseTheme,
  name: 'xrayParcel',
  displayName: 'X-ray Parcel',
  colors: {
    background: '#e9ebe5',
    surface: '#ffffff',
    surfaceElevated: '#f0f1ec',
    overlay: '#00000080',
    border: '#6b7067',
    textPrimary: '#14161a',
    textSecondary: '#454a4f',
    textTertiary: '#50555a',
    textInverse: '#ffffff',
    brandPrimary: '#a63a00',
    brandSecondary: '#14563c',
    success: '#14603c',
    warning: '#7a4a00',
    error: '#a01810',
    info: '#14495f',
    // Status
    statusPending: '#454a4f',
    statusActive: '#a63a00',
    statusDelivered: '#14603c',
    statusFailed: '#a01810',
    statusSkipped: '#7a4a00',
    // Map
    mapBackground: '#e9ebe5',
    mapWater: '#d6e4ea',
    mapLand: '#f0f1ec',
    mapRoad: '#ffffff',
    mapHighway: '#f2c94c',
    mapBuilding: '#e0e2db',
    mapPark: '#dae6d0',
    mapText: '#14161a',
    stopPin: '#a63a00',
    routeLine: '#14563c',
    userLocation: '#14495f',
  },
};

/**
 * The X-ray Parcel direction at night.
 *
 * The parcel is still the object, but the ground is a cold near-black
 * (#0F1210, blue channel 16) and the buildings of the map are lit from the
 * north-west so the parcel reads as a solid thing in a dark van.
 *
 * Measured contrast (background #0F1210 / surface #181C19 / elevated #212620):
 *   textPrimary      #F1F2EF  16.77:1 / 15.33:1 / 13.71:1  (bar 4.5:1, 7:1 driving)
 *   textSecondary    #C3C8C2  11.09:1 / 10.14:1 /  9.07:1  (bar 4.5:1, 7:1 driving)
 *   brandPrimary     #E07A35   6.29:1 /  5.75:1 /  5.14:1  (bar 4.5:1)
 *   brandSecondary   #5FAE86   7.08:1 /  6.47:1 /  5.80:1  (bar 4.5:1)
 *   error            #E8736A   6.36:1 /  5.82:1 /  5.20:1  (bar 4.5:1)
 *   border           #7B837A   4.82:1 /  4.41:1 /  3.94:1  (bar 3:1, non-text)
 * The label on the accent (#0F1210 on #E07A35): 6.29:1.
 */
export const xrayParcelNightTheme: Theme = {
  ...baseTheme,
  name: 'xrayParcelNight',
  displayName: 'X-ray Parcel (night)',
  colors: {
    background: '#0f1210',
    surface: '#181c19',
    surfaceElevated: '#212620',
    overlay: '#00000080',
    border: '#7b837a',
    textPrimary: '#f1f2ef',
    textSecondary: '#c3c8c2',
    textTertiary: '#a9afa9',
    textInverse: '#0f1210',
    brandPrimary: '#e07a35',
    brandSecondary: '#5fae86',
    success: '#59b184',
    warning: '#d8a83c',
    error: '#e8736a',
    info: '#6fa9c4',
    // Status
    statusPending: '#c3c8c2',
    statusActive: '#e07a35',
    statusDelivered: '#59b184',
    statusFailed: '#e8736a',
    statusSkipped: '#d8a83c',
    // Map
    mapBackground: '#0f1210',
    mapWater: '#0e1a1e',
    mapLand: '#181c19',
    mapRoad: '#212620',
    mapHighway: '#96783f',
    mapBuilding: '#1c201d',
    mapPark: '#16281a',
    mapText: '#f1f2ef',
    stopPin: '#e07a35',
    routeLine: '#5fae86',
    userLocation: '#6fa9c4',
  },
};

/**
 * The Scanline direction (Design Studio round two, direction 06).
 *
 * **The scanner sets the language.** Ruled bands, crop marks and monospaced
 * data, so a scanned address and a typed address look like they came out of
 * the same machine.
 *
 * The palette is **P3 Signal** of `docs/design/RESEARCH-2.md` §5.2: vermilion
 * and ink on a neutral white. The vermilion is the only saturated colour, the
 * ink carries every rule and every band.
 *
 * Measured contrast (background #E9E9E5 / surface #FFFFFF / elevated #F2F2EF):
 *   textPrimary      #101112  15.53:1 / 18.90:1 / 16.85:1  (bar 4.5:1, 7:1 driving)
 *   textSecondary    #43453F   7.98:1 /  9.71:1 /  8.66:1  (bar 4.5:1, 7:1 driving)
 *   brandPrimary     #B3261E   5.37:1 /  6.54:1 /  5.83:1  (bar 4.5:1)
 *   brandSecondary   #1D2A33  12.05:1 / 14.67:1 / 13.37:1  (bar 4.5:1)
 *   error            #B3261E   5.37:1 /  6.54:1 /  5.83:1  (bar 4.5:1)
 *   border           #6D6D68   4.27:1 /  5.20:1 /  4.64:1  (bar 3:1, non-text)
 * The label on the accent (#FFFFFF on #B3261E): 6.54:1.
 */
export const scanlineTheme: Theme = {
  ...baseTheme,
  name: 'scanline',
  displayName: 'Scanline',
  colors: {
    background: '#e9e9e5',
    surface: '#ffffff',
    surfaceElevated: '#f2f2ef',
    overlay: '#00000080',
    border: '#6d6d68',
    textPrimary: '#101112',
    textSecondary: '#43453f',
    textTertiary: '#4e504a',
    textInverse: '#ffffff',
    brandPrimary: '#b3261e',
    brandSecondary: '#1d2a33',
    success: '#1d5b34',
    warning: '#7a4a00',
    error: '#b3261e',
    info: '#1d2a33',
    // Status
    statusPending: '#43453f',
    statusActive: '#b3261e',
    statusDelivered: '#1d5b34',
    statusFailed: '#b3261e',
    statusSkipped: '#7a4a00',
    // Map
    mapBackground: '#e9e9e5',
    mapWater: '#dde2e3',
    mapLand: '#f2f2ef',
    mapRoad: '#ffffff',
    mapHighway: '#e7d9a8',
    mapBuilding: '#e2e2dd',
    mapPark: '#dfe5db',
    mapText: '#101112',
    stopPin: '#b3261e',
    routeLine: '#1d2a33',
    userLocation: '#1d2a33',
  },
};

/**
 * The Scanline direction at night.
 *
 * The same machine in a dark van: a neutral near-black (#101010, blue
 * channel 16), the ink becomes a soft white and the vermilion is lifted to
 * #E8675E - a measured step up from the research value of #E0524A, so the
 * label clears 4.5:1 on the raised surface as well as on the ground. The
 * value is measured by `contrast.test.ts`, not estimated.
 *
 * Measured contrast (background #101010 / surface #181818 / elevated #212121):
 *   textPrimary      #F1F1F0  16.84:1 / 15.71:1 / 14.25:1  (bar 4.5:1, 7:1 driving)
 *   textSecondary    #C6C6C1  11.10:1 / 10.36:1 /  9.39:1  (bar 4.5:1, 7:1 driving)
 *   brandPrimary     #E8675E   5.92:1 /  5.52:1 /  5.01:1  (bar 4.5:1)
 *   brandSecondary   #8FA4B3   7.37:1 /  6.87:1 /  6.21:1  (bar 4.5:1)
 *   error            #E8675E   5.92:1 /  5.52:1 /  5.01:1  (bar 4.5:1)
 *   border           #77776F   4.22:1 /  3.93:1 /  3.57:1  (bar 3:1, non-text)
 * The label on the accent (#101010 on #E8675E): 5.92:1.
 */
export const scanlineNightTheme: Theme = {
  ...baseTheme,
  name: 'scanlineNight',
  displayName: 'Scanline (night)',
  colors: {
    background: '#101010',
    surface: '#181818',
    surfaceElevated: '#212121',
    overlay: '#00000080',
    border: '#77776f',
    textPrimary: '#f1f1f0',
    textSecondary: '#c6c6c1',
    textTertiary: '#acaca6',
    textInverse: '#101010',
    brandPrimary: '#e8675e',
    brandSecondary: '#8fa4b3',
    success: '#5cb083',
    warning: '#d8a83c',
    error: '#e8675e',
    info: '#8fa4b3',
    // Status
    statusPending: '#c6c6c1',
    statusActive: '#e8675e',
    statusDelivered: '#5cb083',
    statusFailed: '#e8675e',
    statusSkipped: '#d8a83c',
    // Map
    mapBackground: '#101010',
    mapWater: '#141a1c',
    mapLand: '#181818',
    mapRoad: '#212121',
    mapHighway: '#8f8156',
    mapBuilding: '#1c1c1c',
    mapPark: '#172014',
    mapText: '#f1f1f0',
    stopPin: '#e8675e',
    routeLine: '#8fa4b3',
    userLocation: '#8fa4b3',
  },
};

// All themes
export const themes: Record<ThemeName, Theme> = {
  day: dayTheme,
  night: nightTheme,
  highContrast: highContrastTheme,
  roadbook: roadbookTheme,
  beacon: beaconTheme,
  freight: freightTheme,
  voiceRibbon: voiceRibbonTheme,
  voiceRibbonNight: voiceRibbonNightTheme,
  xrayParcel: xrayParcelTheme,
  xrayParcelNight: xrayParcelNightTheme,
  scanline: scanlineTheme,
  scanlineNight: scanlineNightTheme,
  ...themes2,
  ...themes2a,
};

// Default theme
export const defaultTheme: Theme = dayTheme;

// Theme utilities
export function getTheme(name: ThemeName): Theme {
  return themes[name] || defaultTheme;
}

export function getThemeNames(): ThemeName[] {
  return [
    'day',
    'night',
    'highContrast',
    'roadbook',
    'beacon',
    'freight',
    'voiceRibbon',
    'voiceRibbonNight',
    'xrayParcel',
    'xrayParcelNight',
    'scanline',
    'scanlineNight',
    'weatherLight',
    'weatherLightNight',
    'hapticCity',
    'hapticCityNight',
    'nightShift',
    'nightShiftNight',
    'gantryRun',
    'gantryRunNight',
    'controlRoom',
    'controlRoomNight',
    'topo',
    'topoNight',
    'addressFirst',
    'addressFirstNight',
  ];
}

// CSS custom properties generator
export function generateCSSVariables(theme: Theme): string {
  const lines = [
    ':root {',
    `  --theme-name: ${theme.name};`,
    `  --color-background: ${theme.colors.background};`,
    `  --color-surface: ${theme.colors.surface};`,
    `  --color-surface-elevated: ${theme.colors.surfaceElevated};`,
    `  --color-overlay: ${theme.colors.overlay};`,
    `  --color-border: ${theme.colors.border};`,
    `  --color-text-primary: ${theme.colors.textPrimary};`,
    `  --color-text-secondary: ${theme.colors.textSecondary};`,
    `  --color-text-tertiary: ${theme.colors.textTertiary};`,
    `  --color-text-inverse: ${theme.colors.textInverse};`,
    `  --color-brand-primary: ${theme.colors.brandPrimary};`,
    `  --color-brand-secondary: ${theme.colors.brandSecondary};`,
    `  --color-success: ${theme.colors.success};`,
    `  --color-warning: ${theme.colors.warning};`,
    `  --color-error: ${theme.colors.error};`,
    `  --color-info: ${theme.colors.info};`,
    `  --color-status-pending: ${theme.colors.statusPending};`,
    `  --color-status-active: ${theme.colors.statusActive};`,
    `  --color-status-delivered: ${theme.colors.statusDelivered};`,
    `  --color-status-failed: ${theme.colors.statusFailed};`,
    `  --color-status-skipped: ${theme.colors.statusSkipped};`,
    `  --color-map-background: ${theme.colors.mapBackground};`,
    `  --color-map-water: ${theme.colors.mapWater};`,
    `  --color-map-land: ${theme.colors.mapLand};`,
    `  --color-map-road: ${theme.colors.mapRoad};`,
    `  --color-map-highway: ${theme.colors.mapHighway};`,
    `  --color-map-building: ${theme.colors.mapBuilding};`,
    `  --color-map-park: ${theme.colors.mapPark};`,
    `  --color-map-text: ${theme.colors.mapText};`,
    `  --color-stop-pin: ${theme.colors.stopPin};`,
    `  --color-route-line: ${theme.colors.routeLine};`,
    `  --color-user-location: ${theme.colors.userLocation};`,
    '}',
  ];
  return lines.join('\n');
}
