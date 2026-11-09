/**
 * BUG-300: the route screen's backdrop map on the large AVD (411x731 dp).
 *
 * The import and stops flows blew their 180 s flow budget on the large AVD
 * (run 42455960697): every Maestro command waits for two identical hierarchy
 * dumps, and each dump on 1440x2560 takes 4-11 s - the map behind the stops
 * panel is a large part of that tree, and every keystroke of the pasted CSV
 * re-rendered it (the import's `inputText` alone took 78 s).
 *
 * No flow taps the map or its pins (the flows tap `stops-*` rows and the tab
 * bar only), so the map is decorative for the a11y tree: the contract these
 * tests pin is that the map is hidden from it (`no-hide-descendants` on its
 * wrapper, which shrinks every dump) and that it is memoized, so typing in the
 * import sheet does not re-render it.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import RouteTab from '../stops';
import { RunProvider } from '@/maps/runState';
import { e2eDay } from '@/run/dayForThisBuild';
import type { DeliveredMark, MarkStore } from '@/run/types';

/** How many times the map component rendered. */
const mockMapRenders = jest.fn();

jest.mock('@maplibre/maplibre-react-native', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    Map: (props: { testID?: string; children?: React.ReactNode }) => {
      mockMapRenders();
      return ReactActual.createElement(RN.View, { testID: props.testID }, props.children);
    },
    Camera: (props: { testID?: string }) => ReactActual.createElement(RN.View, { testID: props.testID }),
    Marker: (props: { testID?: string; children?: React.ReactNode }) =>
      ReactActual.createElement(RN.View, { testID: props.testID }, props.children),
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

jest.mock('@/maps/packFiles', () => ({
  loadOfflinePack: jest.fn(() =>
    Promise.resolve({
      state: { status: 'missing' },
      locations: { downloadedFileUrl: null, bundledFileUrl: null },
    }),
  ),
  localGlyphsUrl: jest.fn(() => null),
}));

jest.mock('@/sync/preferenceFiles', () => {
  const actual = jest.requireActual<typeof import('@/sync/storage')>('@/sync/storage');
  return {
    createFilePreferenceStore: () => actual.createMemoryPreferenceStore(),
  };
});

jest.mock('@/lib/api-client', () => ({
  CourierApiClient: jest.fn(() => ({
    reoptRoute: jest.fn(() => Promise.resolve(undefined)),
  })),
}));

jest.mock('@/run/importForThisBuild', () => ({
  importerForThisBuild: () => ({
    importStops: jest.fn(() =>
      Promise.resolve({
        status: 'ok',
        data: { shift_id: 'shift-e2e', imported: 2, stop_ids: ['imported-1', 'imported-2'], ignored_columns: ['notes'] },
      }),
    ),
  }),
  writeImportFile: jest.fn(() =>
    Promise.resolve({ name: 'stops-import.csv', type: 'text/csv', uri: 'file:///cache/stops-import.csv' }),
  ),
}));

function storeWithDay(): MarkStore & {
  load(): Promise<{ status: 'ok'; source: 'cache'; snapshot: ReturnType<typeof e2eDay> }>;
  refresh(): Promise<{ status: 'ok'; source: 'cache'; snapshot: ReturnType<typeof e2eDay> }>;
} {
  const theDay = { status: 'ok' as const, source: 'cache' as const, snapshot: e2eDay() };
  return {
    load: () => Promise.resolve(theDay),
    refresh: () => Promise.resolve(theDay),
    deliveredMarks: () => Promise.resolve([] as DeliveredMark[]),
    markDelivered: () => Promise.resolve(),
    undoDelivered: () => Promise.resolve(),
    close: () => Promise.resolve(),
  };
}

async function renderScreen() {
  const view = render(
    <GestureHandlerRootView>
      <RunProvider store={storeWithDay()}>
        <RouteTab />
      </RunProvider>
    </GestureHandlerRootView>,
  );
  await waitFor(() => {
    expect(screen.getByTestId('stops-screen')).toBeTruthy();
  });
  return view;
}

describe('the route screen’s backdrop map (BUG-300, the large AVD)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is hidden from the accessibility tree, so the hierarchy dumps shrink (no flow taps the map or its pins)', async () => {
    await renderScreen();

    // The wrapper carries the a11y props and is intentionally OUTSIDE the tree,
    // so the query asks for hidden elements and names the wrapper itself:
    // walking parents reaches whatever the map library renders in between.
    const wrapper = screen.getByTestId('stops-map-veil', { includeHiddenElements: true });
    expect(wrapper.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(wrapper.props.accessibilityElementsHidden).toBe(true);
  });

  it('is not re-rendered by each keystroke of the pasted CSV', async () => {
    await renderScreen();

    fireEvent.press(screen.getByTestId('stops-import'));
    await waitFor(() => expect(screen.getByTestId('stops-import-text')).toBeTruthy());

    const before = mockMapRenders.mock.calls.length;
    fireEvent.changeText(screen.getByTestId('stops-import-text'), 'a');
    fireEvent.changeText(screen.getByTestId('stops-import-text'), 'ad');
    fireEvent.changeText(screen.getByTestId('stops-import-text'), 'add');
    fireEvent.changeText(screen.getByTestId('stops-import-text'), 'addr');

    expect(mockMapRenders.mock.calls.length).toBe(before);
  });
});
