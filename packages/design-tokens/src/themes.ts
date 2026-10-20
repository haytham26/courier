/**
 * Theme definitions for Courier Copilot
 * Day, Night, and High Contrast themes (D16)
 * Consumed by Unistyles 3 on mobile and by the web app as CSS variables
 */

import { spacing, typography, borderRadius, shadows, motion, components } from './tokens';

export type ThemeName = 'day' | 'night' | 'highContrast';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
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

// Day theme (default)
export const dayTheme: Theme = {
  ...baseTheme,
  name: 'day',
  displayName: 'Day',
  colors: {
    background: '#ffffff',
    surface: '#fafafa',
    surfaceElevated: '#ffffff',
    border: '#e4e4e7',
    textPrimary: '#18181b',
    textSecondary: '#52525b',
    textTertiary: '#a1a1aa',
    textInverse: '#ffffff',
    brandPrimary: '#ff6b00',
    brandSecondary: '#0070e6',
    success: '#059669',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    // Status
    statusPending: '#71717a',
    statusActive: '#0070e6',
    statusDelivered: '#059669',
    statusFailed: '#ef4444',
    statusSkipped: '#f59e0b',
    // Map
    mapBackground: '#f8f9fa',
    mapWater: '#d6eaff',
    mapLand: '#f5f5f0',
    mapRoad: '#ffffff',
    mapHighway: '#ff6b00',
    mapBuilding: '#e8e8e8',
    mapPark: '#d4edda',
    mapText: '#18181b',
    stopPin: '#ff6b00',
    routeLine: '#0070e6',
    userLocation: '#0070e6',
  },
};

// Night theme
export const nightTheme: Theme = {
  ...baseTheme,
  name: 'night',
  displayName: 'Night',
  colors: {
    background: '#09090b',
    surface: '#18181b',
    surfaceElevated: '#27272a',
    border: '#3f3f46',
    textPrimary: '#fafafa',
    textSecondary: '#a1a1aa',
    textTertiary: '#71717a',
    textInverse: '#09090b',
    brandPrimary: '#ff8a33',
    brandSecondary: '#66adff',
    success: '#10b981',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa',
    // Status
    statusPending: '#a1a1aa',
    statusActive: '#66adff',
    statusDelivered: '#10b981',
    statusFailed: '#f87171',
    statusSkipped: '#fbbf24',
    // Map
    mapBackground: '#0f172a',
    mapWater: '#0c1a2e',
    mapLand: '#1e293b',
    mapRoad: '#334155',
    mapHighway: '#ff8a33',
    mapBuilding: '#334155',
    mapPark: '#0f5132',
    mapText: '#f1f5f9',
    stopPin: '#ff8a33',
    routeLine: '#66adff',
    userLocation: '#66adff',
  },
};

// High contrast theme (accessibility)
export const highContrastTheme: Theme = {
  ...baseTheme,
  name: 'highContrast',
  displayName: 'High Contrast',
  colors: {
    background: '#000000',
    surface: '#000000',
    surfaceElevated: '#1a1a1a',
    border: '#ffffff',
    textPrimary: '#ffffff',
    textSecondary: '#cccccc',
    textTertiary: '#999999',
    textInverse: '#000000',
    brandPrimary: '#ffff00',
    brandSecondary: '#00ffff',
    success: '#00ff00',
    warning: '#ffff00',
    error: '#ff0000',
    info: '#00ffff',
    // Status
    statusPending: '#999999',
    statusActive: '#00ffff',
    statusDelivered: '#00ff00',
    statusFailed: '#ff0000',
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