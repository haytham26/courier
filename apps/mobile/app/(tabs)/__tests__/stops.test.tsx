/**
 * Tests for the route (stops) screen's segmented control.
 *
 * The screen's segments read the run: a stop the courier has delivered on the
 * drive belongs in "Done" on the list, with the minute the run recorded -
 * which is what BUG-080 (the C1 audit's medium finding) says the screen did
 * not do. `segmentOf` read the immutable `mockStops[].status` and never the
 * run's own marks, so a stop delivered on Driving still listed as "To go"
 * with a live delivery timestamp beside it.
 *
 * The native map and the icon font are mocked: the point is the wiring between
 * the run's marks and the segments, and none of that needs a device.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import RouteTab from '../stops';
import { RunProvider } from '@/maps/runState';
import type { DeliveredMark, MarkStore } from '@/run/types';

/** A run store that already holds the deliveries it is given. */
function storeWithMarks(marks: DeliveredMark[]): MarkStore {
  const markDelivered = (stop: { id: string; sequence: number }): Promise<void> => {
    marks.push({ stopId: stop.id, sequence: stop.sequence, at: Date.now(), eventId: `e-${stop.id}` });
    return Promise.resolve();
  };

  const undoDelivered = (stopId: string): Promise<void> => {
    const index = marks.findIndex((entry) => entry.stopId === stopId);
    if (index >= 0) {
      marks.splice(index, 1);
    }
    return Promise.resolve();
  };

  const deliveredMarks = (): Promise<DeliveredMark[]> => Promise.resolve(marks);
  const close = (): Promise<void> => Promise.resolve();

  return { deliveredMarks, markDelivered, undoDelivered, close };
}

jest.mock('@maplibre/maplibre-react-native', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    Map: (props: { testID?: string; children?: React.ReactNode }) =>
      ReactActual.createElement(RN.View, { testID: props.testID }, props.children),
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

// The preferences are kept in memory, so one test cannot leave a choice behind.
jest.mock('@/sync/preferenceFiles', () => {
  const actual = jest.requireActual<typeof import('@/sync/storage')>('@/sync/storage');
  return {
    createFilePreferenceStore: () => actual.createMemoryPreferenceStore(),
  };
});

/** Renders the screen with a run whose marks are the ones given. */
async function renderWithRun(marks: DeliveredMark[]): Promise<void> {
  const store = storeWithMarks(marks);
  render(
    <GestureHandlerRootView>
      <RunProvider store={store}>
        <RouteTab />
      </RunProvider>
    </GestureHandlerRootView>,
  );
  // The provider reads its marks back on mount, so the segments wait for it.
  await waitFor(() => {
    expect(screen.getByTestId('stops-screen')).toBeTruthy();
  });
}

describe('the route screen\'s segments (BUG-080)', () => {
  it('counts a stop the run delivered as done, not as to go', async () => {
    // Stop 2 is delivered on the DRIVE (the run's own mark), while the list's
    // immutable status for it says "active" - which is the defect: the list
    // read the static status and put it under "To go".
    await renderWithRun([{ stopId: '2', sequence: 2, at: Date.UTC(2026, 9, 31, 21, 30), eventId: 'e-2' }]);

    expect(screen.getByTestId('stops-segment-to-go')).toBeTruthy();
    // One delivered of the run's own, and the list's own delivered seed is
    // still counted: two, not one.
    await waitFor(() => {
      expect(
        screen.getByLabelText('Done 2').props.children,
      ).toBeTruthy();
    });
  });

  it('lists the run\'s delivered stop under the done segment', async () => {
    await renderWithRun([{ stopId: '2', sequence: 2, at: Date.UTC(2026, 9, 31, 21, 30), eventId: 'e-2' }]);

    fireEvent.press(screen.getByTestId('stops-segment-done'));

    await waitFor(() => {
      expect(screen.getByTestId('stop-2')).toBeTruthy();
    });
  });

  it('shows the minute the run recorded for the delivered stop', async () => {
    // The screen shows the device's own clock, so the expected label is the
    // instant read that way rather than a literal - the same rule
    // `hourMinuteOf` applies, spelled out here so the assertion is about the
    // run's event reaching the row and not about a timezone.
    const at = Date.parse('2026-10-31T21:30:00.000Z');
    const moment = new Date(at);
    const expected = `${String(moment.getHours()).padStart(2, '0')}:${String(
      moment.getMinutes(),
    ).padStart(2, '0')}`;

    await renderWithRun([{ stopId: '2', sequence: 2, at, eventId: 'e-2' }]);

    fireEvent.press(screen.getByTestId('stops-segment-done'));

    await waitFor(() => {
      expect(screen.getByText(expected)).toBeTruthy();
    });
  });
});
