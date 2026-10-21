/**
 * Tests for the map screen.
 *
 * The native map and the icon font are mocked here: the point of these tests
 * is the wiring - the style, the tile source, the stop markers, the
 * attribution and the theme switch - and none of that needs a device, a map
 * server or a network.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

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
    Camera: () => null,
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
  getForegroundPermissionsAsync: jest.fn(async () => ({ granted: false, status: 'denied' })),
}));

jest.mock('@/maps/packFiles', () => ({
  loadOfflinePack: jest.fn(async () => ({
    state: { status: 'missing' },
    locations: { downloadedFileUrl: null, bundledFileUrl: null },
  })),
  localGlyphsUrl: jest.fn(() => null),
}));

async function renderScreen() {
  const view = render(
    <ThemeProvider>
      <MapScreen />
    </ThemeProvider>,
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
});
