/**
 * Theme constants for Courier Copilot Mobile App
 * Re-exports design tokens for easy importing
 */

import { themes, type Theme, type ThemeName, generateCSSVariables } from '@courier/design-tokens/themes';

export { themes, type Theme, type ThemeName, generateCSSVariables };

// Color shortcuts for easy access
export const colors = {
  // These will be dynamically updated based on current theme
  // Use useTheme() hook in components to get actual values
  background: 'var(--color-background)',
  surface: 'var(--color-surface)',
  surfaceElevated: 'var(--color-surface-elevated)',
  border: 'var(--color-border)',
  text: 'var(--color-text-primary)',
  textSecondary: 'var(--color-text-secondary)',
  textTertiary: 'var(--color-text-tertiary)',
  textInverse: 'var(--color-text-inverse)',
  brandPrimary: 'var(--color-brand-primary)',
  brandSecondary: 'var(--color-brand-secondary)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  error: 'var(--color-error)',
  info: 'var(--color-info)',
  statusPending: 'var(--color-status-pending)',
  statusActive: 'var(--color-status-active)',
  statusDelivered: 'var(--color-status-delivered)',
  statusFailed: 'var(--color-status-failed)',
  statusSkipped: 'var(--color-status-skipped)',
  mapBackground: 'var(--color-map-background)',
  mapWater: 'var(--color-map-water)',
  mapLand: 'var(--color-map-land)',
  mapRoad: 'var(--color-map-road)',
  mapHighway: 'var(--color-map-highway)',
  mapBuilding: 'var(--color-map-building)',
  mapPark: 'var(--color-map-park)',
  mapText: 'var(--color-map-text)',
  stopPin: 'var(--color-stop-pin)',
  routeLine: 'var(--color-route-line)',
  userLocation: 'var(--color-user-location)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};