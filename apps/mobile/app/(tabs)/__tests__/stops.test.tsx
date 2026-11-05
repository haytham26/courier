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
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import RouteTab from '../stops';
import { RunProvider } from '@/maps/runState';
import { e2eDay } from '@/run/dayForThisBuild';
import type { DeliveredMark, MarkStore } from '@/run/types';

/**
 * A run store that already holds the deliveries it is given, over the app's
 * own day (A4: the route screen reads the run's stops, so the store answers
 * with the same day the E2E build and the E2E legs answer with - the stops
 * carry the same ids and sequences the mock list carried, so the assertions
 * below keep their shape).
 */
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
  const theDay = {
    status: 'ok' as const,
    source: 'cache' as const,
    snapshot: e2eDay(),
  };
  const load = (): Promise<typeof theDay> => Promise.resolve(theDay);
  const refresh = (): Promise<typeof theDay> => Promise.resolve(theDay);

  // The day rides the same store, the way the app's own store carries both.
  return { load, refresh, deliveredMarks, markDelivered, undoDelivered, close } as MarkStore & {
    load: () => Promise<typeof theDay>;
    refresh: () => Promise<typeof theDay>;
  };
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

/**
 * Queue 4a: the run's own priority and the run's own time window, on the
 * courier's screen.
 *
 * The audit's finding: the E2E day threw the run's own priority away (it was
 * hardcoded `false` in `dayForThisBuild`), so a courier-facing priority
 * surface could not be proven on the emulator. The day now reads the run's own
 * word, and the route row shows it: the priority a stop carries and the window
 * the run gave it - the times a courier reads, not the contract's own stamps.
 */
/** The run's own window for stop 2, as the app's screens read it. */
const theWindow = { start: '2026-10-31T09:00:00.000Z', end: '2026-10-31T11:00:00.000Z' };

/** One of the window's moments as the courier's own clock reads it. */
const clock = (stamp: string): string => {
  const at = new Date(stamp);
  return `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
};

describe("the route screen's priority and windows (queue 4a)", () => {
  it('shows the priority the run itself gives the stop', async () => {
    await renderWithRun([]);

    // The run's own day: stop 2 is the priority one, so its row says so and
    // the rows of the stops the run did not call priority do not.
    fireEvent.press(screen.getByTestId('stops-segment-to-go'));
    await waitFor(() => {
      expect(screen.getByTestId('stop-2')).toBeTruthy();
    });
    expect(within(screen.getByTestId('stop-2')).getByText(/^Priority ·/)).toBeTruthy();
    expect(within(screen.getByTestId('stop-4')).queryByText(/^Priority/)).toBeNull();
  });

  it('shows the time window the run itself gives the stop', async () => {
    await renderWithRun([]);

    // Stop 2's own window, read on the device's own clock: a window is a local
    // time, so the test derives the times the same way the row does rather than
    // pinning a UTC stamp. The row carries the priority and the window on one
    // line ("Priority · 22:00 - 00:00"), so the window is the suffix.
    const expected = new RegExp(`${clock(theWindow.start)} - ${clock(theWindow.end)}$`);
    fireEvent.press(screen.getByTestId('stops-segment-to-go'));
    await waitFor(() => {
      expect(screen.getByTestId('stop-2')).toBeTruthy();
    });
    expect(within(screen.getByTestId('stop-2')).getByText(expected)).toBeTruthy();
  });

  it('leaves a stop the run gave no window without one', async () => {
    await renderWithRun([]);

    fireEvent.press(screen.getByTestId('stops-segment-to-go'));
    await waitFor(() => {
      expect(screen.getByTestId('stop-4')).toBeTruthy();
    });
    expect(within(screen.getByTestId('stop-4')).queryByText(/\d{2}:\d{2} - \d{2}:\d{2}/)).toBeNull();
    expect(within(screen.getByTestId('stop-4')).queryByText(/^Priority/)).toBeNull();
  });

  it('names the stop\u2019s own window and priority when the detail opens', async () => {
    await renderWithRun([]);

    fireEvent.press(screen.getByTestId('stop-2'));

    // The sheet the row opens carries the run's own words for that stop: the
    // window as a sentence, and the priority as a noun a courier reads.
    const opens = clock(theWindow.start);
    const closes = clock(theWindow.end);
    await waitFor(() => {
      expect(screen.getByTestId('stop-detail-sheet')).toBeTruthy();
    });
    expect(screen.getByText(`Its window opens at ${opens} and closes at ${closes}`)).toBeTruthy();
    expect(screen.getByText('Priority stop')).toBeTruthy();
  });
});
