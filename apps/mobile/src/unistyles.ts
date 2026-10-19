import { StyleSheet } from 'react-native-unistyles';

import { themes as baseThemes, ThemeName, generateCSSVariables } from '@courier/design-tokens/themes';

// Define theme with non-nullable colors for React Native compatibility
interface ThemeColors {
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
  statusPending: string;
  statusActive: string;
  statusDelivered: string;
  statusFailed: string;
  statusSkipped: string;
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
  [key: string]: string;
}

// Override Theme with non-nullable colors
type Theme = Omit<typeof baseThemes.day, 'colors'> & {
  colors: ThemeColors;
};

// Cast the themes object to have non-nullable colors
const themes = baseThemes as Record<ThemeName, Theme>;

// Unistyles 3 configuration
// We use CSS-in-JS with StyleSheet.create() but with Unistyles for theming
// The theme is applied via ThemeProvider which sets CSS variables

export type { Theme, ThemeName };
export { themes, generateCSSVariables };

// Unistyles 3 doesn't need explicit theme registration like v2
// It uses CSS variables from global.css and ThemeProvider