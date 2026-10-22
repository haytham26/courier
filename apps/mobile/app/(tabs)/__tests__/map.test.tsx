/**
 * Tests for the map screen.
 *
 * The native map and the icon font are mocked here: the point of these tests
 * is the wiring - the style, the tile source, the stop markers, the
 * attribution, the map modes and the settings sheet - and none of that needs
 * a device, a map server or a network.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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

async function renderScreen() {
  const view = render(
    <GestureHandlerRootView>
      <ThemeProvider>
        <MapScreen />
      </ThemeProvider>
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

  it('gives the map the courier style of the current theme', async () => {
    await renderScreen();

    expect(mockMapProps.mapStyle?.version).toBe(8);
    expect(mockMapProps.mapStyle?.name).toBe('courier-copilot-day');
  });

  it('draws without a tile source when there is no pack and no server', async () => {
    await renderScreen();

    expect(Object.keys(mockMapProps.mapStyle?.sources ?? {})).toHaveLength(0);
  });

  it('follows the theme when the courier switches to the night style', async () => {
    await renderScreen();

    fireEvent.press(screen.getByTestId('map-settings'));
    fireEvent.press(screen.getByTestId('map-theme-night'));

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
