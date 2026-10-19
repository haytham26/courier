import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useColorScheme } from 'react-native';
import { themes as baseThemes, ThemeName, generateCSSVariables, type Theme as BaseTheme } from '@courier/design-tokens/themes';

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
type Theme = Omit<BaseTheme, 'colors'> & {
  colors: ThemeColors;
};

// Cast the themes object to have non-nullable colors
const themes = baseThemes as Record<ThemeName, Theme>;

interface ThemeContextType {
  theme: Theme;
  themeName: ThemeName;
  setTheme: (name: ThemeName) => void;
  toggleTheme: () => void;
  cssVariables: string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeName, setThemeName] = useState<ThemeName>('day');
  const [cssVariables, setCssVariables] = useState('');

  // Initialize theme from system or storage
  useEffect(() => {
    const initialTheme = systemColorScheme === 'dark' ? 'night' : 'day';
    setThemeName(initialTheme);
  }, [systemColorScheme]);

  // Update CSS variables when theme changes
  useEffect(() => {
    const theme = themes[themeName];
    const cssVars = generateCSSVariables(theme);
    setCssVariables(cssVars);
    
    if (Platform.OS === 'web') {
      document.documentElement.style.cssText = cssVars;
    }
    
    // For Unistyles 3, we need to update the CSS variables on the root element
    // This will be picked up by Unistyles for styling
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      if (typeof value === 'string') {
        root.style.setProperty(`--color-${key.toLowerCase()}`, value);
      }
    });
  }, [themeName]);

  const theme = themes[themeName];

  const setTheme = useCallback((name: ThemeName) => {
    setThemeName(name);
  }, []);

  const toggleTheme = useCallback(() => {
    const themeOrder: ThemeName[] = ['day', 'night', 'highContrast'];
    const currentIndex = themeOrder.indexOf(themeName);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    setThemeName(themeOrder[nextIndex]);
  }, [themeName]);

  return (
    <ThemeContext.Provider value={{ theme, themeName, setTheme, toggleTheme, cssVariables }}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Text style={{ opacity: 0 }} testID="theme-css-variables">
          {cssVariables}
        </Text>
      </View>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { themes, type Theme, type ThemeName };