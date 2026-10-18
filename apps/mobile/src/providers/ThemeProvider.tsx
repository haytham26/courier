import React, { createContext, useContext, useCallback } from 'react';
import { useUnistyles } from 'react-native-unistyles';
import { type ThemeName, generateCSSVariables } from '@courier/design-tokens/themes';
import { Platform } from 'react-native';

// Get theme type from Unistyles
type Theme = ReturnType<typeof useUnistyles>['theme'];

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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, name: themeName, setTheme: setUnistylesTheme } = useUnistyles();
  const [cssVariables, setCssVariables] = React.useState('');

  // Generate CSS variables when theme changes
  React.useEffect(() => {
    const vars = generateCSSVariables(theme);
    setCssVariables(vars);
    
    if (Platform.OS === 'web') {
      document.documentElement.style.cssText = vars;
    }
  }, [theme]);

  const setTheme = useCallback((name: ThemeName) => {
    setUnistylesTheme(name);
  }, [setUnistylesTheme]);

  const toggleTheme = useCallback(() => {
    const currentIndex = themeOrder.indexOf(themeName);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    setUnistylesTheme(themeOrder[nextIndex]);
  }, [themeName, setUnistylesTheme]);

  return (
    <ThemeContext.Provider value={{ theme, themeName, setTheme, toggleTheme, cssVariables }}>
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