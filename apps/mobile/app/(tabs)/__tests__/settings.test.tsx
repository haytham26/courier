/**
 * Tests for the settings screen (screen 11) on the chosen tokens.
 *
 * The screen is the reference's grouped list: the profile, the voice group
 * with its detail level, the map rows with their real values, and the haptics
 * switch. The wiring under test is the one the app depends on: the detail level
 * saves through the same hook the Copilot dock reads, the map style row shows
 * the driver's stored mode, and the offline row says what the pack really is.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ChosenProvider } from '@/components/chosen';
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
});
