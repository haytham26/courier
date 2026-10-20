/**
 * Unistyles 3 configuration for the Courier Copilot mobile app.
 *
 * The themes come from `packages/design-tokens` (the single source of truth)
 * and are plain hex values — no CSS custom properties, which do not work in
 * React Native.
 *
 * Unistyles reserves the theme names `light` and `dark` for adaptive themes
 * (day/night switching driven by the OS colour scheme), so the product themes
 * `day` and `night` are registered under those names.
 */
import { StyleSheet } from 'react-native-unistyles';
import { themes } from '@courier/design-tokens/themes';

export const appThemes = {
  light: themes.day,
  dark: themes.night,
  highContrast: themes.highContrast,
};

export type AppThemes = {
  light: typeof themes.day;
  dark: typeof themes.day;
  highContrast: typeof themes.day;
};

declare module 'react-native-unistyles' {
  export interface UnistylesThemes extends AppThemes {}
}

/** Product theme names and the Unistyles name they are registered under. */
export const unistylesThemeNames = {
  day: 'light',
  night: 'dark',
  highContrast: 'highContrast',
} as const;

StyleSheet.configure({
  themes: appThemes,
  settings: {
    // The device colour scheme picks day or night automatically.
    adaptiveThemes: true,
  },
});
