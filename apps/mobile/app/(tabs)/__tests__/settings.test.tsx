/**
 * Tests for the settings screen (screen 11) on the chosen tokens.
 *
 * The screen is the reference's grouped list: the profile, the voice group
 * with its detail level, the map rows with their real values, the haptics
 * switch, and the sign-out the E2E flows need to reach the front door. The
 * wiring under test is the one the app depends on: the detail level saves
 * through the same hook the Copilot dock reads, the map style row shows the
 * driver's stored mode, the offline row says what the pack really is, and the
 * sign-out asks before it calls the provider.
 *
 * The sign-out is destructive-ish, so the row confirms it with a second tap:
 * the first tap turns the row into the question, and only the second calls
 * `logout`. Nothing is wasted on an accidental graze of the row.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ChosenProvider } from '@/components/chosen';
import { touch } from '@courier/design-tokens/chosen';
import SettingsScreen from '../settings';

// The preferences are kept in memory, so one test cannot leave a choice behind
// for the next one.
jest.mock('@/sync/preferenceFiles', () => {
  const actual = jest.requireActual<typeof import('@/sync/storage')>('@/sync/storage');
  return {
    createFilePreferenceStore: () => actual.createMemoryPreferenceStore(),
  };
});

// The voice hook reaches the native audio module, which has no place in a unit
// test: the same mock the Today and summary screens' tests use.
jest.mock('@/voice/useCourierVoice', () => ({
  useCourierVoice: () => ({
    ready: true,
    session: null,
    settings: {
      verbosity: 'normal',
      voice: 'nz',
      speed: 1,
      quietMode: false,
      essentialsOnly: false,
      language: 'en-NZ',
      remember: true,
      proactive: {},
    },
    saveSettings: jest.fn(() => Promise.resolve()),
    brief: null,
    refreshBrief: jest.fn(() => Promise.resolve(null)),
  }),
}));

// The pack is a file on the device; the row only needs to know its state.
jest.mock('@/maps/packFiles', () => ({
  loadOfflinePack: jest.fn(() =>
    Promise.resolve({
      state: { status: 'missing' },
      locations: { downloadedFileUrl: null, bundledFileUrl: null },
    }),
  ),
  localGlyphsUrl: jest.fn(() => null),
}));

// The auth provider: the sign-out row only needs the one call the app makes
// through it, so the mock carries `logout` and nothing else (the screen never
// reads the session itself).
const mockLogout = jest.fn(() => Promise.resolve());

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({ logout: mockLogout }),
}));

// The router is not this screen's concern: the sign-out's landing is the front
// door's, and `sign-out-landing.test.tsx` proves where the app ends up (the
// sign-out names `/(auth)/login`, because the router's own fallback for a route
// the guard has just removed is the unmatched screen - E2E run 40872943163).
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), navigate: jest.fn(), push: jest.fn(), back: jest.fn() },
  useRouter: () => ({ replace: jest.fn(), navigate: jest.fn(), push: jest.fn() }),
}));

function renderScreen() {
  return render(
    <GestureHandlerRootView>
      <ChosenProvider mode="light">
        <SettingsScreen />
      </ChosenProvider>
    </GestureHandlerRootView>,
  );
}

describe('the settings screen', () => {
  it('keeps the tab test id the flows tap', () => {
    renderScreen();

    expect(screen.getByTestId('settings-screen')).toBeTruthy();
  });

  it('shows the profile the reference carries', () => {
    renderScreen();

    expect(screen.getByText('Settings')).toBeTruthy();
    expect(screen.getByText('Tane Rua')).toBeTruthy();
    expect(screen.getByText('Signed in with Apple')).toBeTruthy();
    expect(screen.getByText('TR')).toBeTruthy();
  });

  it('shows the groups and the rows the reference carries', () => {
    renderScreen();

    expect(screen.getByText('VOICE')).toBeTruthy();
    expect(screen.getByText('MAP')).toBeTruthy();
    expect(screen.getByTestId('settings-voice')).toBeTruthy();
    expect(screen.getByTestId('settings-map-style')).toBeTruthy();
    expect(screen.getByTestId('settings-offline')).toBeTruthy();
    expect(screen.getByTestId('settings-haptics')).toBeTruthy();
  });

  it('shows the map style as the stored mode, and the offline row as the truth', async () => {
    renderScreen();

    await waitFor(() => expect(screen.getByTestId('settings-map-style')).toBeTruthy());
    // No stored mode yet: the default is 2D, and the pack is not on the device.
    expect(screen.getByText('2D')).toBeTruthy();
    expect(screen.getByText('Not on this device')).toBeTruthy();
  });

  it('offers the detail levels, and the current one is selected', () => {
    renderScreen();

    const selected = (testID: string): boolean =>
      (
        screen.getByTestId(testID).props as {
          accessibilityState?: { selected?: boolean };
        }
      ).accessibilityState?.selected ?? false;

    expect(selected('settings-verbosity-normal')).toBe(true);
    expect(selected('settings-verbosity-minimal')).toBe(false);
    expect(screen.getByTestId('settings-verbosity-chatty')).toBeTruthy();
  });

  it('takes the detail level the courier taps', () => {
    renderScreen();

    fireEvent.press(screen.getByTestId('settings-verbosity-chatty'));

    const selected = (
      screen.getByTestId('settings-verbosity-chatty').props as {
        accessibilityState?: { selected?: boolean };
      }
    ).accessibilityState?.selected;
    expect(selected).toBe(true);
  });

  it('turns the haptics off and on', () => {
    renderScreen();

    const valueOf = (): boolean =>
      (screen.getByTestId('settings-haptics').props as { value?: boolean }).value ?? false;
    const before = valueOf();
    fireEvent(screen.getByTestId('settings-haptics'), 'valueChange', !before);

    expect(valueOf()).toBe(!before);
  });

  // The sign-out is the row the E2E flows need: without it the emulator run
  // cannot reach the front door, so the flows can never prove the sign-in.
  describe('the sign out row', () => {
    /** The flat style of an element, so a height can be read. */
    const styleOf = (testID: string): Record<string, number> => {
      const element = screen.getByTestId(testID);
      return StyleSheet.flatten(element.props.style as never) as Record<string, number>;
    };

    it('is on the screen with the test id the flows tap', () => {
      renderScreen();

      expect(screen.getByTestId('settings-sign-out')).toBeTruthy();
    });

    it('carries an accessibility label, a role and the 48 pt floor', () => {
      renderScreen();

      const row = screen.getByTestId('settings-sign-out');
      expect(row.props.accessibilityRole).toBe('button');
      expect(row.props.accessibilityLabel).toBe('Sign out');
      expect(styleOf('settings-sign-out').minHeight).toBe(touch.minimum);
    });

    it('asks before it signs out: the first tap is the question, not the sign out', () => {
      renderScreen();

      fireEvent.press(screen.getByTestId('settings-sign-out'));

      // The row is now the question, and the app is still signed in.
      expect(screen.getByText('Sign out?')).toBeTruthy();
      expect(mockLogout).not.toHaveBeenCalled();
    });

    it('signs out on the second tap', () => {
      renderScreen();

      fireEvent.press(screen.getByTestId('settings-sign-out'));
      fireEvent.press(screen.getByTestId('settings-sign-out'));

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });
});
