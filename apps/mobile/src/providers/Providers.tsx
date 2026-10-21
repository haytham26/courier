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
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ThemeProvider>
        <AuthProvider>{children}</AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
