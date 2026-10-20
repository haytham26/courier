import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { UnistylesRuntime } from 'react-native-unistyles';
import { themes as baseThemes, type ThemeName } from '@courier/design-tokens/themes';

import { unistylesThemeNames } from '@/unistyles';

// The product theme names are the ones used in the app; Unistyles registers
// `day` as `light` and `night` as `dark` so the OS colour scheme can drive
// the day/night switch.
const themes = baseThemes;

interface ThemeContextType {
  theme: (typeof themes)[ThemeName];
  themeName: ThemeName;
  setTheme: (name: ThemeName) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const themeOrder: ThemeName[] = ['day', 'night', 'highContrast'];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeName, setThemeName] = useState<ThemeName>(
    systemColorScheme === 'dark' ? 'night' : 'day',
  );

  useEffect(() => {
    setThemeName(systemColorScheme === 'dark' ? 'night' : 'day');
  }, [systemColorScheme]);

  const setTheme = useCallback((name: ThemeName) => {
    setThemeName(name);
    // A manual choice overrides the automatic day/night switching.
    UnistylesRuntime.setAdaptiveThemes(false);
    UnistylesRuntime.setTheme(unistylesThemeNames[name]);
  }, []);

  const toggleTheme = useCallback(() => {
    const currentIndex = themeOrder.indexOf(themeName);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    setTheme(themeOrder[nextIndex] ?? 'day');
  }, [setTheme, themeName]);

  return (
    <ThemeContext.Provider value={{ theme: themes[themeName], themeName, setTheme, toggleTheme }}>
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

export { themes, type ThemeName };
