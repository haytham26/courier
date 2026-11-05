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
import { Text } from 'react-native';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import RouteTab from '../stops';
import { RunProvider } from '@/maps/runState';
import { e2eDay } from '@/run/dayForThisBuild';
import type { DeliveredMark, MarkStore } from '@/run/types';

/**
 * A store that carries both the day and the marks, and writes the solver's
 * order through the store's own write path: the shape the app's construction
 * site builds (RunStore), and the shape the run state looks for above the
 * screens.
 */
interface AStoreWithDay extends MarkStore {
  load(): Promise<{ status: 'ok'; source: string; snapshot: ReturnType<typeof e2eDay> }>;
  refresh(): Promise<{ status: 'ok'; source: string; snapshot: ReturnType<typeof e2eDay> }>;
  applyRouteOrder(order: readonly { stopId: string; sequence: number }[]): Promise<boolean>;
}

/**
 * A run store that already holds the deliveries it is given, over the app's
 * own day (A4: the route screen reads the run's stops, so the store answers
 * with the same day the E2E build and the E2E legs answer with - the stops
 * carry the same ids and sequences the mock list carried, so the assertions
 * below keep their shape).
 */
function storeWithMarks(marks: DeliveredMark[]): AStoreWithDay {
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
  const applyRouteOrder = (): Promise<boolean> => Promise.resolve(false);

  // The day rides the same store, the way the app's own store carries both.
  return { load, refresh, deliveredMarks, markDelivered, undoDelivered, close, applyRouteOrder };
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

// Queue 4.2: Optimise asks the SERVER's solver. The reopt call is mocked
// here; what is proven is the screen's own half - the stops it names are the
// run's own, and the answer is spelled in the server's words.
const mockReoptRoute = jest.fn(
  (_runId: string, _affected: readonly string[]): Promise<unknown> => Promise.resolve(undefined),
);
// The wrapper is called per construction, not when the module is required: the
// const above has its value by the time a test presses Optimise.
jest.mock('@/lib/api-client', () => ({
  CourierApiClient: jest.fn(() => ({
    reoptRoute: (runId: string, affected: readonly string[]) => mockReoptRoute(runId, affected),
  })),
}));

// Queue 4e: the import seam is replaced the same way the scanner's reader is
// (scan.test.tsx): what is proven here is the screen's own half - the sheet,
// the pasted file, the note the answer spells - against an importer that
// answers.
const mockImportStops = jest.fn(
  (_shiftId: string, _file: unknown): Promise<unknown> =>
    Promise.resolve({
      status: 'ok',
      data: { shift_id: 'shift-e2e', imported: 2, stop_ids: ['imported-1', 'imported-2'], ignored_columns: ['notes'] },
    }),
);
const mockWriteImportFile = jest.fn((_text: string): Promise<unknown> =>
  Promise.resolve({ name: 'stops-import.csv', type: 'text/csv', uri: 'file:///cache/stops-import.csv' }),
);
jest.mock('@/run/importForThisBuild', () => ({
  importerForThisBuild: () => ({ importStops: mockImportStops }),
  writeImportFile: (text: string) => mockWriteImportFile(text),
}));

/** Puts the answer the mocked boundary gives, and when it gives it. */
function reoptAnswer(answer: unknown, gate: () => Promise<void> = () => Promise.resolve()): void {
  mockReoptRoute.mockReset();
  mockReoptRoute.mockImplementation(() => gate().then(() => answer));
}

/** A store that carries the run's own day and the marks on one handle. */
function aDayStore(
  options: { applied?: boolean; marks?: DeliveredMark[] } = {},
): {
  store: AStoreWithDay;
  appliedOrders: { stopId: string; sequence: number }[][];
  stopIds: () => string[];
} {
  const applied = options.applied ?? true;
  const marks = options.marks ?? [];
  const snapshot = { run: e2eDay().run, stops: [...e2eDay().stops] };
  const theLoad = { status: 'ok' as const, source: 'cache' as const, snapshot };
  const appliedOrders: { stopId: string; sequence: number }[][] = [];

  const store: AStoreWithDay = {
    load: () => Promise.resolve(theLoad),
    refresh: () => Promise.resolve(theLoad),
    deliveredMarks: () => Promise.resolve([...marks]),
    markDelivered: () => Promise.resolve(),
    undoDelivered: () => Promise.resolve(),
    close: () => Promise.resolve(),
    // The solver's order is written through the store's own write path, the
    // way the app's construction site builds it (RunStore.applyRouteOrder).
    applyRouteOrder: (order: readonly { stopId: string; sequence: number }[]) => {
      appliedOrders.push([...order]);
      if (!applied) {
        return Promise.resolve(false);
      }
      snapshot.stops = order.map((entry, index) => ({ ...snapshot.stops[0], id: entry.stopId, seq: index + 1 }));
      return Promise.resolve(true);
    },
  };

  return {
    store,
    appliedOrders,
    stopIds: () => snapshot.stops.map((stop) => stop.id),
  };
}

/** A store that carries the marks and no day: the day has not been read. */
function aMarksOnlyStore(): MarkStore {
  return {
    deliveredMarks: () => Promise.resolve([]),
    markDelivered: () => Promise.resolve(),
    undoDelivered: () => Promise.resolve(),
    close: () => Promise.resolve(),
  };
}

/**
 * Everything the courier reads in the optimise note, as one sentence: the note
 * is a View holding a Text per node, so the words are the join of them.
 */
function noteText(): string {
  const note = screen.getByTestId('stops-optimise-note');
  return note
    .findAllByType(Text)
    .map((line) => String(line.props.children))
    .join('');
}

/** Renders the screen with a run whose marks are the ones given. */
async function renderWithRun(
  marks: DeliveredMark[],
  store: MarkStore = storeWithMarks(marks),
): Promise<ReturnType<typeof render>> {
  const view = render(
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
  return view;
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
 * Queue 4.2: the Optimise control and the solver's answer.
 *
 * The solver runs on the server, so the contract under test is the screen's
 * own half - the stops it names are the run's own not-done stops, the answer's
 * order is applied through the run's own write path, and the courier is told
 * what happened in the words the server answered with. The boundary's own
 * contract (the call it builds, the guards, the shape check) is the
 * api-client suite's.
 */
describe('the route screen\'s optimise', () => {
  beforeEach(() => {
    // The boundary is one mock for the whole suite: one test must not read
    // another's calls.
    mockReoptRoute.mockClear();
  });

  /** The reopt answer as the contract declares it: the solver's own order. */
  const anAnswer = (finishDeltaS = -180, stops: { stop_id: string; sequence: number }[] = []) => ({
    status: 'ok' as const,
    data: { run_id: 'run-1', engine: 'vrplib', finish_delta_s: finishDeltaS, stops },
  });

  /** The run's own day: five stops, the first of which the plan itself delivers. */
  const DAY = e2eDay();

  /**
   * The affected stops the run's own order makes: every stop that is not
   * delivered, where the plan's own first stop is delivered and the mark on
   * stop 2 makes it delivered too - which is the same-stop contract the
   * screen reads everywhere else.
   */
  const affected = [
    { stopId: '3', sequence: 3 },
    { stopId: '4', sequence: 4 },
    { stopId: '5', sequence: 5 },
  ];

  it('asks the server about the run\u2019s own stops that are not delivered', async () => {
    reoptAnswer(anAnswer());
    const delivered = [{ stopId: '2', sequence: 2, at: 1_700_000_000_000, eventId: 'e-2' }];
    const day = aDayStore({ marks: delivered });

    await renderWithRun(delivered, day.store);

    fireEvent.press(screen.getByTestId('stops-optimise'));

    await waitFor(() => expect(mockReoptRoute).toHaveBeenCalled());
    // The subject is the run's own id, and the stops are the run's own stops
    // that are not delivered: the plan's own first stop is delivered, and the
    // mark on stop 2 makes it delivered too - neither is asked for again.
    expect(mockReoptRoute.mock.calls[0]?.[0]).toBe(DAY.run.id);
    expect(mockReoptRoute.mock.calls[0]?.[1]).toEqual(affected.map((stop) => stop.stopId));
  });

  it('spells the answer\u2019s finish-time delta in the minutes a courier reads', async () => {
    reoptAnswer(anAnswer(-180));

    await renderWithRun([], aDayStore().store);
    fireEvent.press(screen.getByTestId('stops-optimise'));

    // -180 seconds is a day finishing three minutes earlier, and a courier is
    // told in minutes rather than the contract's own seconds. The sentence and
    // the delta are two nodes, so the courier reads the words first and the
    // solver's own number after them (and the flow asserts the sentence).
    await waitFor(() => {
      expect(noteText()).toBe(
        'The server resequenced the run.The day now finishes 3 min earlier.',
      );
    });
  });

  it('applies the solver\u2019s own order to the run the phone holds', async () => {
    reoptAnswer(
      anAnswer(0, [
        { stop_id: '5', sequence: 1 },
        { stop_id: '4', sequence: 2 },
        { stop_id: '3', sequence: 3 },
        { stop_id: '2', sequence: 4 },
        { stop_id: '1', sequence: 5 },
      ]),
    );
    const day = aDayStore();

    await renderWithRun([], day.store);
    fireEvent.press(screen.getByTestId('stops-optimise'));

    await waitFor(() => expect(day.appliedOrders.length).toBe(1));
    expect(day.appliedOrders[0]).toEqual([
      { stopId: '5', sequence: 1 },
      { stopId: '4', sequence: 2 },
      { stopId: '3', sequence: 3 },
      { stopId: '2', sequence: 4 },
      { stopId: '1', sequence: 5 },
    ]);
    // The day the phone holds carries the solver's own order now.
    expect(day.stopIds()).toEqual(['5', '4', '3', '2', '1']);
  });

  it('does not claim the day changed when the phone could not keep the order', async () => {
    reoptAnswer(anAnswer(-180, [{ stop_id: '1', sequence: 1 }]));
    const day = aDayStore({ applied: false });

    await renderWithRun([], day.store);
    fireEvent.press(screen.getByTestId('stops-optimise'));

    await waitFor(() => {
      expect(noteText()).toMatch(
        /The server resequenced the run, but the phone could not keep the new order/,
      );
    });
    // The order the phone is certain of is untouched.
    expect(day.appliedOrders.length).toBe(1);
    expect(day.stopIds()).toEqual(DAY.stops.map((stop) => stop.id));
  });

  it('names the session when the solver refuses the caller', async () => {
    reoptAnswer({ status: 'unauthorized' as const });

    await renderWithRun([], aDayStore().store);
    fireEvent.press(screen.getByTestId('stops-optimise'));

    await waitFor(() => {
      expect(noteText()).toBe(
        'The solver could not be asked (the session is no longer valid). The order stays as it is.',
      );
    });
  });

  it('names the radio when the solver cannot be reached', async () => {
    reoptAnswer({ status: 'offline' as const });

    await renderWithRun([], aDayStore().store);
    fireEvent.press(screen.getByTestId('stops-optimise'));

    await waitFor(() => {
      expect(noteText()).toBe(
        'The solver could not be asked (there was no signal). The order stays as it is.',
      );
    });
  });

  it('does not ask the solver while one ask is already in flight', async () => {
    // The answer is put in the test's own hands: the second press happens
    // before the first is answered.
    let release: (() => void) | null = null;
    reoptAnswer(anAnswer(), () => new Promise<void>((resolve) => {
      release = resolve;
    }));

    await renderWithRun([], aDayStore().store);
    fireEvent.press(screen.getByTestId('stops-optimise'));
    fireEvent.press(screen.getByTestId('stops-optimise'));

    expect(mockReoptRoute.mock.calls.length).toBe(1);
    release?.();
    await waitFor(() => expect(mockReoptRoute.mock.calls.length).toBe(1));
  });

  it('does not answer a press when the day has not been read', async () => {
    // BUG-189: the request's subject is the run's own id, so the control is
    // not answerable while there is no day behind it - a press would dial
    // /runs//route:reopt, which is about no run at all.
    await renderWithRun([], aMarksOnlyStore());
    const button = screen.getByTestId('stops-optimise').props as {
      accessibilityState?: { disabled?: boolean };
      disabled?: boolean;
    };

    expect(button.accessibilityState?.disabled ?? button.disabled).toBe(true);
    fireEvent.press(screen.getByTestId('stops-optimise'));

    expect(mockReoptRoute).not.toHaveBeenCalled();
    expect(screen.queryByTestId('stops-optimise-note')).toBeNull();
  });

  it('writes no note after the courier has navigated away', async () => {
    // The solver answers while the screen is gone: the state update React
    // names as one must never happen, and no note is written for a tree that
    // is no longer there.
    const warn = jest.spyOn(console, 'error').mockImplementation(() => {});
    let release: (() => void) | null = null;
    reoptAnswer(anAnswer(), () => new Promise<void>((resolve) => {
      release = resolve;
    }));

    const view = await renderWithRun([], aDayStore().store);
    fireEvent.press(screen.getByTestId('stops-optimise'));
    view.unmount();

    release?.();
    await waitFor(() => expect(mockReoptRoute.mock.results.length).toBe(1));

    // The assertions after the wait: the note was never written, so no tree
    // was updated and React had nothing to name.
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
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
    // the rows of the stops the run did not call priority do not. The priority
    // is its own node, because it is its own fact.
    fireEvent.press(screen.getByTestId('stops-segment-to-go'));
    await waitFor(() => {
      expect(screen.getByTestId('stop-2')).toBeTruthy();
    });
    expect(within(screen.getByTestId('stop-2')).getByText('Priority')).toBeTruthy();
    expect(within(screen.getByTestId('stop-4')).queryByText('Priority')).toBeNull();
  });

  it('shows the time window the run itself gives the stop', async () => {
    await renderWithRun([]);

    // Stop 2's own window, read on the device's own clock: a window is a local
    // time, so the test derives the times the same way the row does rather than
    // pinning a UTC stamp. The window is its own node, beside the priority.
    const expected = `${clock(theWindow.start)} - ${clock(theWindow.end)}`;
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

/**
 * Queue 4c (the trial's #21, ADR-024): the stop's own type on the courier's
 * screen. The E2E day carries one pickup (the mock list's stop 3), so its row
 * and its sheet say the word, and a delivery's row and sheet do not.
 */
describe("the route screen's stop types (queue 4c)", () => {
  it('shows the type the run itself gives the stop, as its own node on the row', async () => {
    await renderWithRun([]);

    // Stop 3 is the run's own pickup: its row says so, and the rows of the
    // deliveries the run did not call pickups do not. The type is its own
    // node, because it is its own fact.
    fireEvent.press(screen.getByTestId('stops-segment-to-go'));
    await waitFor(() => {
      expect(screen.getByTestId('stop-3')).toBeTruthy();
    });
    expect(within(screen.getByTestId('stop-3')).getByText('Pickup')).toBeTruthy();
    expect(within(screen.getByTestId('stop-2')).queryByText('Pickup')).toBeNull();
  });

  it('names the stop\u2019s type when the detail opens', async () => {
    await renderWithRun([]);

    fireEvent.press(screen.getByTestId('stop-3'));

    await waitFor(() => {
      expect(screen.getByTestId('stop-detail-sheet')).toBeTruthy();
    });
    expect(screen.getByText('Pickup stop')).toBeTruthy();
  });

  it('leaves a delivery stop without the pickup word on its sheet', async () => {
    await renderWithRun([]);

    fireEvent.press(screen.getByTestId('stop-2'));

    await waitFor(() => {
      expect(screen.getByTestId('stop-detail-sheet')).toBeTruthy();
    });
    expect(screen.queryByText('Pickup stop')).toBeNull();
  });
});

/**
 * Queue 4e (the trial's #6, ADR-025's app half): the spreadsheet import's
 * courier-facing surface on the route screen.
 *
 * There is no document picker in this build (expo-document-picker is not a
 * dependency and the trial's scope is the paste surface), so the courier
 * pastes the CSV: the sheet writes it to the cache as the .csv the contract
 * names, asks the importer about the shift the day carries, and spells the
 * answer - the count, the ignored columns, or the refusal with the server's
 * own sentence and code.
 */
describe("the route screen's import sheet (queue 4e)", () => {
  beforeEach(() => {
    mockImportStops.mockClear();
    mockWriteImportFile.mockClear();
    mockImportStops.mockResolvedValue({
      status: 'ok',
      data: { shift_id: 'shift-e2e', imported: 2, stop_ids: ['imported-1', 'imported-2'], ignored_columns: ['notes'] },
    });
  });

  /** Opens the import sheet and pastes the given text. */
  async function openAndPaste(text: string): Promise<void> {
    await renderWithRun([]);
    fireEvent.press(screen.getByTestId('stops-import'));
    await waitFor(() => {
      expect(screen.getByTestId('stops-import-sheet')).toBeTruthy();
    });
    fireEvent.changeText(screen.getByTestId('stops-import-text'), text);
  }

  it('imports the pasted file into the shift the day carries and spells the answer', async () => {
    await openAndPaste('address,type,notes\n1 Import Lane, delivery, leave at door\n2 Pickup Ave, pickup, ring bell');

    fireEvent.press(screen.getByTestId('stops-import-go'));

    await waitFor(() => {
      expect(screen.getByText('Imported 2 stops.')).toBeTruthy();
    });
    // The ignored columns are their own node, the way the count is, because
    // the contract answers them and never drops them silently (ADR-025).
    expect(screen.getByText('Ignored columns: notes')).toBeTruthy();
    // The file was written to the cache first, and the ask named the shift
    // the run carries - not the run's id, which would be a URL about no
    // shift (BUG-189's rule).
    expect(mockWriteImportFile).toHaveBeenCalledWith(
      'address,type,notes\n1 Import Lane, delivery, leave at door\n2 Pickup Ave, pickup, ring bell',
    );
    expect(mockImportStops).toHaveBeenCalledWith('shift-e2e', {
      name: 'stops-import.csv',
      type: 'text/csv',
      uri: 'file:///cache/stops-import.csv',
    });
  });

  it('spells a 422 refusal with the server\u2019s own sentence and code', async () => {
    mockImportStops.mockResolvedValue({
      status: 'server',
      code: 422,
      message: 'row 2 has no address - nothing was stored',
    });
    await openAndPaste('address,type\n, delivery');

    fireEvent.press(screen.getByTestId('stops-import-go'));

    await waitFor(() => {
      expect(
        screen.getByText('The import was refused (422): row 2 has no address - nothing was stored'),
      ).toBeTruthy();
    });
  });

  it('refuses an empty paste before any ask is made', async () => {
    await renderWithRun([]);
    fireEvent.press(screen.getByTestId('stops-import'));
    await waitFor(() => {
      expect(screen.getByTestId('stops-import-sheet')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('stops-import-go'));

    await waitFor(() => {
      expect(screen.getByText('Paste the spreadsheet first.')).toBeTruthy();
    });
    expect(mockImportStops).not.toHaveBeenCalled();
    expect(mockWriteImportFile).not.toHaveBeenCalled();
  });

  it('closes the sheet with the dismiss control and clears the note', async () => {
    await openAndPaste('address\n1 Import Lane');
    fireEvent.press(screen.getByTestId('stops-import-go'));
    await waitFor(() => {
      expect(screen.getByText('Imported 2 stops.')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('stops-import-dismiss'));

    await waitFor(() => {
      expect(screen.queryByTestId('stops-import-sheet')).toBeNull();
    });
  });
});
