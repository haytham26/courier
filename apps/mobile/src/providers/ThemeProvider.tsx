import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { UnistylesRuntime } from 'react-native-unistyles';
import { themes as baseThemes, type Theme, type ThemeName } from '@courier/design-tokens/themes';

import { unistylesThemeNames } from '@/unistyles';
import { isThemePreference, type ThemePreference } from '@/constants/theme';
import { errorMessage } from '@/lib/errors';
import { createFilePreferenceStore } from '@/sync/preferenceFiles';
import { useDriverId } from '@/sync/driverSession';
import { readDriverPreferences, writeDriverPreference } from '@/sync/storage';

// The product theme names are the ones used in the app; Unistyles registers
// `day` as `light` and `night` as `dark` so the OS colour scheme can drive
// the day/night switch.
const themes = baseThemes;

/** The key the theme choice is stored under in the driver's preferences. */
export const THEME_PREFERENCE_KEY = 'theme.preference';

interface ThemeContextType {
  theme: (typeof themes)[ThemeName];
  themeName: ThemeName;
  setTheme: (name: ThemeName) => void;
  toggleTheme: () => void;
  /** The choice the courier made: the device, the day, the night or the contrast. */
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const themeOrder: ThemeName[] = ['day', 'night', 'highContrast'];

/**
 * True when a name is one Unistyles has registered, so it can be put on the
 * screen. The Design Studio palettes that are not registered cannot be.
 */
function isRegisteredTheme(name: ThemeName): name is keyof typeof unistylesThemeNames {
  return name in unistylesThemeNames;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeName, setThemeName] = useState<ThemeName>(
    systemColorScheme === 'dark' ? 'night' : 'day',
  );
  // The courier's choice. It is remembered per driver, so a shared phone
  // does not carry one driver's theme into the next shift.
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('auto');
  // The stored choice has not been read yet, so nothing is written back.
  const [loaded, setLoaded] = useState(false);

  const driverId = useDriverId();
  const store = useMemo(() => createFilePreferenceStore(), []);
  /** Puts a theme on the screen, whichever way the courier chose it. */
  const applyPreference = useCallback(
    (preference: keyof typeof unistylesThemeNames | 'auto') => {
      if (preference === 'auto') {
        // The device decides: day in the daylight, night after dark.
        UnistylesRuntime.setAdaptiveThemes(true);
        setThemeName(systemColorScheme === 'dark' ? 'night' : 'day');
        return;
      }
      UnistylesRuntime.setAdaptiveThemes(false);
      UnistylesRuntime.setTheme(unistylesThemeNames[preference]);
      setThemeName(preference);
    },
    [systemColorScheme],
  );

  // The stored choice of this driver, read once when the app opens.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const preferences = await readDriverPreferences(store, driverId);
        const stored = preferences[THEME_PREFERENCE_KEY];
        if (!cancelled && isThemePreference(stored)) {
          setThemePreferenceState(stored);
          applyPreference(stored);
        }
      } catch (error) {
        console.warn(`theme: the theme choice could not be read: ${errorMessage(error)}`);
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyPreference, driverId, store]);

  // The device colour scheme only decides the theme while the courier has not
  // pinned one.
  useEffect(() => {
    if (themePreference === 'auto') {
      setThemeName(systemColorScheme === 'dark' ? 'night' : 'day');
    }
  }, [systemColorScheme, themePreference]);

  // The choice is written back, but only after the stored one has been read,
  // so the app never overwrites the choice it has not read yet.
  useEffect(() => {
    if (!loaded) {
      return;
    }
    void writeDriverPreference(store, driverId, THEME_PREFERENCE_KEY, themePreference).catch(
      (error: unknown) => {
        console.warn(`theme: the theme choice could not be saved: ${errorMessage(error)}`);
      },
    );
  }, [driverId, loaded, store, themePreference]);

  const setTheme = useCallback(
    (name: ThemeName) => {
      // The three Design Studio directions are palettes, not a choice the
      // courier makes: they are never written to the preferences.
      if (isThemePreference(name)) {
        setThemePreferenceState(name);
      }
      if (isRegisteredTheme(name)) {
        applyPreference(name);
      }
    },
    [applyPreference],
  );

  const setThemePreference = useCallback(
    (preference: ThemePreference) => {
      setThemePreferenceState(preference);
      applyPreference(preference);
    },
    [applyPreference],
  );

  const toggleTheme = useCallback(() => {
    const currentIndex = themeOrder.indexOf(themeName);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    setTheme(themeOrder[nextIndex] ?? 'day');
  }, [setTheme, themeName]);

  const value = useMemo<ThemeContextType>(
    () => ({
      theme: themes[themeName],
      themeName,
      setTheme,
      toggleTheme,
      themePreference,
      setThemePreference,
    }),
    [themeName, themePreference, setTheme, toggleTheme, setThemePreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * A theme scope.
 *
 * The design lab (MASTER_EXECUTION §13.4) shows the same screen in three
 * directions. A scope hands one palette to everything below it - the shared
 * `Button`, `Card` and `Badge` read the theme from this context, so they
 * follow the scope - without touching the theme the courier has chosen and
 * without writing the theme to the device.
 *
 * The setters do nothing: a scope is a palette, not a choice.
 */
export function ThemeScope({
  theme,
  children,
}: {
  theme: Theme;
  children: React.ReactNode;
}): React.JSX.Element {
  const value = useMemo<ThemeContextType>(
    () => ({
      theme,
      themeName: theme.name,
      setTheme: () => undefined,
      toggleTheme: () => undefined,
      themePreference: 'day',
      setThemePreference: () => undefined,
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export { themes, type ThemeName };
