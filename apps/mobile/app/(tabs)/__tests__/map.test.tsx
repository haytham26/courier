/**
 * Tests for the map screen.
 *
 * The native map and the icon font are mocked here: the point of these tests
 * is the wiring - the style, the tile source, the stop markers, the
 * attribution, the map modes and the settings sheet - and none of that needs
 * a device, a map server or a network.
 *
 * The screen is built on the chosen tokens, so the render wraps it in a
 * ChosenProvider; light and dark are pinned through it, which is the ONE
 * light/dark truth the screen reads (the legacy day/night selector is gone).
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ChosenProvider } from '@/components/chosen';
import { ThemeProvider } from '@/providers/ThemeProvider';
import MapScreen from '../map';

const mockMapProps: {
  mapStyle?: { version?: number; name?: string; sources?: Record<string, unknown> };
} = {};

jest.mock('@maplibre/maplibre-react-native', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    Map: (props: {
      testID?: string;
      mapStyle?: { version?: number; name?: string; sources?: Record<string, unknown> };
      children?: React.ReactNode;
    }) => {
      mockMapProps.mapStyle = props.mapStyle;
      return ReactActual.createElement(RN.View, { testID: props.testID }, props.children);
    },
    Camera: ReactActual.forwardRef(
      (props: { testID?: string; children?: React.ReactNode }, _ref: unknown) =>
        ReactActual.createElement(RN.View, { testID: props.testID }, props.children),
    ),
    Marker: (props: { testID?: string; children?: React.ReactNode }) =>
      ReactActual.createElement(RN.View, { testID: props.testID }, props.children),
    NativeUserLocation: () => null,
  };
});

jest.mock('@expo/vector-icons', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    MaterialCommunityIcons: (props: { name: string }) =>
      ReactActual.createElement(RN.Text, { accessibilityLabel: props.name }, props.name),
    Ionicons: (props: { name: string }) =>
      ReactActual.createElement(RN.Text, { accessibilityLabel: props.name }, props.name),
  };
});

jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ granted: false, status: 'denied' })),
  watchPositionAsync: jest.fn(() => Promise.resolve({ remove: jest.fn() })),
  Accuracy: { Balanced: 3 },
}));

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(() =>
    Promise.resolve({ isConnected: true, isInternetReachable: true }),
  ),
}));

jest.mock('@/maps/packFiles', () => ({
  loadOfflinePack: jest.fn(() =>
    Promise.resolve({
      state: { status: 'missing' },
      locations: { downloadedFileUrl: null, bundledFileUrl: null },
    }),
  ),
  localGlyphsUrl: jest.fn(() => null),
}));

// The preferences are kept in memory, so one test cannot leave a choice
// behind for the next one.
jest.mock('@/sync/preferenceFiles', () => {
  const actual = jest.requireActual<typeof import('@/sync/storage')>('@/sync/storage');
  return {
    createFilePreferenceStore: () => actual.createMemoryPreferenceStore(),
  };
});

async function renderScreen(mode: 'light' | 'dark' = 'light') {
  const view = render(
    <GestureHandlerRootView>
      <ChosenProvider mode={mode}>
        {/* The map settings sheet is the one legacy island left on this
            screen: it still reads the legacy theme, and the app's root
            provider carries it in production. The test gives it the same
            island until the legacy tokens go. */}
        <ThemeProvider>
          <MapScreen />
        </ThemeProvider>
      </ChosenProvider>
    </GestureHandlerRootView>,
  );

  // The screen reads the pack and the location permission when it opens; the
  // wait lets both settle before the assertions.
  await waitFor(() => expect(screen.getByText(/No map tiles/)).toBeTruthy());

  return view;
}

describe('the map screen', () => {
  beforeEach(() => {
    mockMapProps.mapStyle = undefined;
  });

  it('keeps the map screen test id', async () => {
    await renderScreen();

    expect(screen.getByTestId('map-screen')).toBeTruthy();
  });

  it('gives the map the courier style of the chosen mode', async () => {
    await renderScreen();

    expect(mockMapProps.mapStyle?.version).toBe(8);
    expect(mockMapProps.mapStyle?.name).toBe('courier-copilot-day');
  });

  it('draws without a tile source when there is no pack and no server', async () => {
    await renderScreen();

    expect(Object.keys(mockMapProps.mapStyle?.sources ?? {})).toHaveLength(0);
  });

  it('follows the device when the chosen mode is the dark one', async () => {
    await renderScreen('dark');

    expect(mockMapProps.mapStyle?.name).toBe('courier-copilot-night');
  });

  it('draws the stop markers with their sequence numbers', async () => {
    await renderScreen();

    expect(screen.getByTestId('stop-marker-1')).toBeTruthy();
    expect(screen.getByTestId('stop-marker-5')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('shows the attribution on the map', async () => {
    await renderScreen();

    expect(screen.getByTestId('map-attribution')).toBeTruthy();
    expect(screen.getByText(/OpenStreetMap contributors/)).toBeTruthy();
    expect(screen.getByText(/LINZ Data Service/)).toBeTruthy();
  });

  it('says when there is no offline map on the device', async () => {
    await renderScreen();

    expect(screen.getByText(/No map tiles/)).toBeTruthy();
  });

  describe('the map modes', () => {
    it('offers the four modes', async () => {
      await renderScreen();

      expect(screen.getByTestId('map-mode-flat')).toBeTruthy();
      expect(screen.getByTestId('map-mode-3d')).toBeTruthy();
      expect(screen.getByTestId('map-mode-satellite')).toBeTruthy();
      expect(screen.getByTestId('map-mode-auto')).toBeTruthy();
    });

    it('starts on the flat map', async () => {
      await renderScreen();

      expect(
        (
          screen.getByTestId('map-mode-flat').props as {
            accessibilityState?: { selected?: boolean };
          }
        ).accessibilityState?.selected,
      ).toBe(true);
    });

    it('takes the mode the courier taps', async () => {
      await renderScreen();

      fireEvent.press(screen.getByTestId('map-mode-3d'));

      await waitFor(() =>
        expect(
          (
            screen.getByTestId('map-mode-3d').props as {
              accessibilityState?: { selected?: boolean };
            }
          ).accessibilityState?.selected,
        ).toBe(true),
      );
    });

    it('says that the satellite imagery needs a network and a licence', async () => {
      await renderScreen();

      fireEvent.press(screen.getByTestId('map-mode-satellite'));

      await waitFor(() =>
        expect(screen.getByTestId('map-mode-message').props.children).toContain(
          'Satellite needs a network and a licence',
        ),
      );
    });

    it("shows each mode's one line, the way the reference does", async () => {
      await renderScreen();

      expect(screen.getByText('Flat and clear')).toBeTruthy();
      expect(screen.getByText('Buildings and depth')).toBeTruthy();
      expect(screen.getByText('Real roofs and yards')).toBeTruthy();
      expect(screen.getByText('3D in town, dark at night')).toBeTruthy();
    });
  });

  describe('the map style sheet', () => {
    it('puts the modes away and keeps the offline map row', async () => {
      await renderScreen();

      expect(screen.getByText('Flat and clear')).toBeTruthy();

      fireEvent.press(screen.getByTestId('map-style-close'));

      expect(screen.queryByText('Flat and clear')).toBeNull();
      expect(screen.getByTestId('map-pack-status')).toBeTruthy();
    });

    it('has no second day/night control: the mode above is the only truth', async () => {
      await renderScreen();

      fireEvent.press(screen.getByTestId('map-settings'));

      expect(screen.queryByTestId('map-theme-day')).toBeNull();
      expect(screen.queryByTestId('map-theme-night')).toBeNull();
    });
  });

  describe('the settings sheet', () => {
    it('holds the toggles of the map', async () => {
      await renderScreen();

      fireEvent.press(screen.getByTestId('map-settings'));

      expect(screen.getByTestId('map-settings-sheet')).toBeTruthy();
      expect(screen.getByTestId('map-toggle-buildings')).toBeTruthy();
      expect(screen.getByTestId('map-toggle-traffic')).toBeTruthy();
      expect(screen.getByTestId('map-toggle-closures')).toBeTruthy();
      expect(screen.getByTestId('map-toggle-weather')).toBeTruthy();
      expect(screen.getByTestId('map-toggle-battery-saver')).toBeTruthy();
      expect(screen.getByTestId('map-label-size-small')).toBeTruthy();
      expect(screen.getByTestId('map-label-size-normal')).toBeTruthy();
      expect(screen.getByTestId('map-label-size-large')).toBeTruthy();
    });
  });
});
