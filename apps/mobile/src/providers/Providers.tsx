import React from 'react';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { ThemeProvider } from './ThemeProvider';
import { AuthProvider } from './AuthProvider';

/**
 * The providers of the app.
 *
 * The safe area provider comes first: the sheet, the tab bar and the map
 * all need the insets of the device, and `initialWindowMetrics` means the
 * first frame already has them.
 *
 * The session comes before the theme, because the theme choice is remembered
 * **per driver**: the provider has to know who is signed in.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AuthProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
