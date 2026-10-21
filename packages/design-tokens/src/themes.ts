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

export type ThemeName = 'day' | 'night' | 'highContrast';

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

// All themes
export const themes: Record<ThemeName, Theme> = {
  day: dayTheme,
  night: nightTheme,
  highContrast: highContrastTheme,
};

// Default theme
export const defaultTheme: Theme = dayTheme;

// Theme utilities
export function getTheme(name: ThemeName): Theme {
  return themes[name] || defaultTheme;
}

export function getThemeNames(): ThemeName[] {
  return ['day', 'night', 'highContrast'];
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
