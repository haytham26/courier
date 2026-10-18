import React, { createContext, useContext, useCallback } from 'react';
import { useUnistyles } from 'react-native-unistyles';
import { type ThemeName, generateCSSVariables, type Theme } from '@courier/design-tokens/themes';
import { Platform } from 'react-native';

interface ThemeContextType {
  theme: Theme;
  themeName: ThemeName;
  setTheme: (name: ThemeName) => void;
  toggleTheme: () => void;
  cssVariables: string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Order for toggle
const themeOrder: ThemeName[] = ['day', 'night', 'highContrast'];

// Extended runtime type with setTheme method (actual runtime may have this)
interface ExtendedUnistylesRuntime {
  setTheme(themeName: string): void;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, rt } = useUnistyles();
  const [themeName, setThemeName] = React.useState<ThemeName>('day');
  const [cssVariables, setCssVariables] = React.useState('');

  // Generate CSS variables when theme changes
  React.useEffect(() => {
    const vars = generateCSSVariables(theme);
    setCssVariables(vars);
    
    if (Platform.OS === 'web') {
      document.documentElement.style.cssText = vars;
    }
  }, [theme]);

  const handleSetTheme = useCallback((name: ThemeName) => {
    (rt as unknown as ExtendedUnistylesRuntime).setTheme(name);
    setThemeName(name);
  }, [rt]);

  const toggleTheme = useCallback(() => {
    const currentIndex = themeOrder.indexOf(themeName);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    const nextTheme = themeOrder[nextIndex];
    (rt as unknown as ExtendedUnistylesRuntime).setTheme(nextTheme);
    setThemeName(nextTheme);
  }, [themeName, rt]);

  return (
    <ThemeContext.Provider value={{ theme, themeName, setTheme: handleSetTheme, toggleTheme, cssVariables }}>
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

export { themeOrder };