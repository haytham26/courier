import { StyleSheet } from 'react-native-unistyles';
import { themes, ThemeName, generateCSSVariables, type Theme } from '@courier/design-tokens/themes';

// Type for theme with non-nullable colors
type UnistylesTheme = Omit<Theme, 'colors'> & {
  colors: Record<string, string>;
};

// Override themes to ensure all colors are strings
const unistylesThemes: Record<ThemeName, UnistylesTheme> = {
  day: {
    ...themes.day,
    colors: themes.day.colors as Record<string, string>,
  },
  night: {
    ...themes.night,
    colors: themes.night.colors as Record<string, string>,
  },
  highContrast: {
    ...themes.highContrast,
    colors: themes.highContrast.colors as Record<string, string>,
  },
};

// Configure Unistyles 3
StyleSheet.configure({
  themes: unistylesThemes,
  settings: {
    initialTheme: 'day',
    CSSVars: true,
    adaptiveThemes: false,
  },
  breakpoints: {
    xs: 0,
    sm: 360,
    md: 480,
    lg: 768,
    xl: 1024,
    xxl: 1280,
  },
});

// Export Unistyles StyleSheet and hooks
export { StyleSheet, useUnistyles } from 'react-native-unistyles';
export { themes, generateCSSVariables, type Theme, type ThemeName } from '@courier/design-tokens/themes';
export { spacing, typography, borderRadius, shadows, motion, components, colors } from '@courier/design-tokens/tokens';