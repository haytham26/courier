import { StyleSheet } from 'react-native-unistyles';
import { themes, ThemeName, generateCSSVariables, type Theme } from '@courier/design-tokens/themes';

// Configure Unistyles 3 - using the exact theme types from design-tokens
StyleSheet.configure({
  themes: {
    day: themes.day,
    night: themes.night,
    highContrast: themes.highContrast,
  },
  settings: {
    initialTheme: 'day',
    CSSVars: true,
    adaptiveThemes: false,
  },
});

// Export Unistyles StyleSheet and hooks
export { StyleSheet, useUnistyles } from 'react-native-unistyles';
export { themes, generateCSSVariables, type Theme, type ThemeName } from '@courier/design-tokens/themes';
export { spacing, typography, borderRadius, shadows, motion, components, colors } from '@courier/design-tokens/tokens';