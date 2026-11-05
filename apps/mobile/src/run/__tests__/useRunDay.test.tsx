/**
 * The day the screens read (A1 slice 3, and C1 squad 1 #15).
 *
 * Today and the drive used to read `mockStops` directly, so a courier's real
 * day never reached a screen and the marks the drive recorded lived nowhere
 * Today could see (the audit's accepted finding: "Today keeps its own
 * doneIds/skippedIds/failedIds state and never reads the shared RunProvider,
 * so Today and Driving disagree and Today-only marks record no event").
 *
 * This hook is the one read path: the run store's snapshot when it has one,
 * the stops in the seeded order, and the marks the store carries - so Today
 * and Driving answer with the same numbers, and a mark is an event wherever it
 * is made.
 *
 * The store the hook opens is the app's own, and it opens op-sqlite - which a
 * jest run has no native runtime for. So the module that opens it is replaced
 * at its seam, exactly the way the sign-out landing suite does it, and what
 * these tests prove is the hook's own contract against a store that answers.
 */
import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { useRunDay } from '../useRunDay';

/** The day the API would answer with: a seeded run, two stops, in its order. */
const mockSeededDay = {
  run: {
    id: 'run-1',
    shift_id: 'shift-1',
    name: 'Northwood AM',
    depot: { lat: -43.532, lon: 172.599 },
    speed_kmh: 40,
    start_at: '2026-10-31T07:30:00.000Z',
  },
  stops: [
    {
      id: 'stop-1',
      seq: 1,
      address: '12 Riccarton Road, Riccarton',
      status: 'pending' as const,
      location_id: 'loc-1',
      type: 'delivery' as const,
      lat: -43.532,
      lon: 172.599,
    },
    {
      id: 'stop-2',
      seq: 2,
      address: '45 Papanui Road, Merivale',
      status: 'pending' as const,
      location_id: 'loc-2',
      type: 'delivery' as const,
      lat: -43.518,
      lon: 172.625,
    },
  ],
};

/** The one delivery the run carries in these tests. */
const mockMark = {
  stopId: 'stop-1',
  sequence: 1,
  at: 1_700_000_000_000,
  eventId: 'event-1',
};

/** The answer the store gives `load` when the day is on the phone. */
const okLoad = {
  status: 'ok' as const,
  source: 'network' as const,
  snapshot: mockSeededDay,
};

/** The store, answered by this test rather than by the phone. */
const mockLoad = jest.fn(() => Promise.resolve(okLoad));
const mockDeliveredMarks = jest.fn(() => Promise.resolve([mockMark]));
const mockMarkDelivered = jest.fn(() => Promise.resolve());
const mockUndoDelivered = jest.fn(() => Promise.resolve());
const mockClose = jest.fn(() => Promise.resolve());
const mockApplyRouteOrder = jest.fn(() => Promise.resolve(true));

/**
 * The store the hook reads, as the run state above the screens hands it over.
 *
 * The source is injected (the hook never opens a store of its own), so this
 * suite proves the hook's own contract against a store that answers - the
 * same seam the sign-out landing suite uses for the phone's handles.
 */
const storeSource = () => ({
  load: mockLoad,
  refresh: mockLoad,
  deliveredMarks: mockDeliveredMarks,
  markDelivered: mockMarkDelivered,
  undoDelivered: mockUndoDelivered,
  close: mockClose,
  applyRouteOrder: mockApplyRouteOrder,
});

describe('the day the screens read (A1 slice 3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoad.mockResolvedValue(okLoad);
    mockDeliveredMarks.mockResolvedValue([mockMark]);
    mockApplyRouteOrder.mockResolvedValue(true);
  });

  it("gives the screens the run's stops, in the run's order", async () => {
    const Probe = () => {
      const day = useRunDay(storeSource);
      return <Text testID="order">{day.stops.map((stop) => stop.id).join(',')}</Text>;
    };

    const { getByTestId } = render(<Probe />);

    await waitFor(() => expect(getByTestId('order').props.children).toBe('stop-1,stop-2'));
  });

  it('carries the marks the store holds, so every screen sees the same day', async () => {
    const Probe = () => {
      const day = useRunDay(storeSource);
      return (
        <>
          <Text testID="delivered-count">{String(day.delivered.length)}</Text>
          <Text testID="is-first">{String(day.isDelivered('stop-1'))}</Text>
          <Text testID="is-second">{String(day.isDelivered('stop-2'))}</Text>
        </>
      );
    };

    const { getByTestId } = render(<Probe />);

    await waitFor(() => expect(getByTestId('delivered-count').props.children).toBe('1'));
    expect(getByTestId('is-first').props.children).toBe('true');
    expect(getByTestId('is-second').props.children).toBe('false');
  });

  // A first launch with no network: the courier is told there is no day yet,
  // rather than shown an empty one that looks like a finished run.
  it('answers no day at all when the store has neither network nor cache', async () => {
    // The store answers with the run it has, which is none on a first launch:
    // `RunLoad`'s offline arm carries a null snapshot, so the hook's "no run
    // yet" answer is the store's own, not a guess the hook makes.
    mockLoad.mockResolvedValue({
      status: 'offline',
      snapshot: null,
    } as unknown as Awaited<ReturnType<typeof mockLoad>>);

    const Probe = () => {
      const day = useRunDay(storeSource);
      return (
        <>
          <Text testID="has-run">{String(day.hasRun)}</Text>
          <Text testID="stops">{String(day.stops.length)}</Text>
          <Text testID="next">{day.nextStop === null ? 'none' : day.nextStop.id}</Text>
        </>
      );
    };

    const { getByTestId } = render(<Probe />);

    await waitFor(() => expect(getByTestId('has-run').props.children).toBe('false'));
    expect(getByTestId('stops').props.children).toBe('0');
    expect(getByTestId('next').props.children).toBe('none');
  });

  // BUG-178: run 41578697363 - the day's marks were read once on mount and
  // never again, so the sheet never advanced after a mark. The hook now
  // re-reads them when the caller asks (the run state asks after every mark).
  it('re-reads the marks when the caller asks it to', async () => {
    mockDeliveredMarks.mockResolvedValue([]);
    let readAgain: () => Promise<void> = () => Promise.resolve();

    const Probe = () => {
      const day = useRunDay(storeSource);
      readAgain = () => day.refreshMarks();
      return <Text testID="delivered-count">{String(day.delivered.length)}</Text>;
    };

    const { getByTestId } = render(<Probe />);
    await waitFor(() => expect(getByTestId('delivered-count').props.children).toBe('0'));

    // A mark has been written through the store: the caller asks the hook to
    // read the marks back, and the numbers the screens show follow.
    mockDeliveredMarks.mockResolvedValue([mockMark]);
    await act(async () => {
      await readAgain();
    });

    expect(getByTestId('delivered-count').props.children).toBe('1');
  });

  // BUG-172: run 41491440450 - a store whose load() THROWS (the cache write
  // threw on the closed handle) left the effect's promise unhandled and the
  // day empty with no log line at all. The hook now catches and names it.
  // Red on d92155e: no warn fires, and the rejection escapes the effect.
  it('names a store that throws instead of leaving an unhandled rejection', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      mockLoad.mockRejectedValue(new Error('database is locked'));

      const Probe = () => {
        const day = useRunDay(storeSource);
        return <Text testID="has-run">{String(day.hasRun)}</Text>;
      };

      const { getByTestId } = render(<Probe />);

      await waitFor(() => expect(warn).toHaveBeenCalledWith(
        'run: the day could not be read: database is locked',
      ));
      expect(getByTestId('has-run').props.children).toBe('false');
    } finally {
      warn.mockRestore();
    }
  });

  // Queue 4.2: the solver's order is written through the store, and the day is
  // re-read behind the write - otherwise the screen that asked shows the old
  // order while every other screen shows the new one.
  it('re-reads the day after the solver\u2019s order is written', async () => {
    const reordered = {
      status: 'ok' as const,
      source: 'network' as const,
      snapshot: {
        ...mockSeededDay,
        stops: [
          { ...mockSeededDay.stops[1], seq: 1 },
          { ...mockSeededDay.stops[0], seq: 2 },
        ],
      },
    };
    // The store answers the write, and the day behind it comes back reordered.
    mockApplyRouteOrder.mockImplementation(() => Promise.resolve(true));
    mockLoad.mockResolvedValueOnce(okLoad).mockResolvedValueOnce(reordered);

    let apply: ((order: readonly { stopId: string; sequence: number }[]) => Promise<boolean>) | null = null;
    const Probe = () => {
      const day = useRunDay(storeSource);
      apply = (order) => day.applyRouteOrder(order);
      return <Text testID="order">{day.stops.map((stop) => stop.id).join(',')}</Text>;
    };

    const { getByTestId } = render(<Probe />);
    await waitFor(() => expect(getByTestId('order').props.children).toBe('stop-1,stop-2'));

    let applied = false;
    await act(async () => {
      applied = await apply([{ stopId: 'stop-2', sequence: 1 }, { stopId: 'stop-1', sequence: 2 }]);
    });

    expect(applied).toBe(true);
    expect(mockApplyRouteOrder).toHaveBeenCalledWith([
      { stopId: 'stop-2', sequence: 1 },
      { stopId: 'stop-1', sequence: 2 },
    ]);
    expect(getByTestId('order').props.children).toBe('stop-2,stop-1');
  });

  it('answers false when the store could not keep the solver\u2019s order', async () => {
    mockApplyRouteOrder.mockResolvedValue(false);
    mockLoad.mockResolvedValue(okLoad);

    let apply: ((order: readonly { stopId: string; sequence: number }[]) => Promise<boolean>) | null = null;
    const Probe = () => {
      const day = useRunDay(storeSource);
      apply = (order) => day.applyRouteOrder(order);
      return <Text testID="order">{day.stops.map((stop) => stop.id).join(',')}</Text>;
    };

    const { getByTestId } = render(<Probe />);
    await waitFor(() => expect(getByTestId('order').props.children).toBe('stop-1,stop-2'));

    let applied = true;
    await act(async () => {
      applied = await apply([{ stopId: 'stop-1', sequence: 1 }, { stopId: 'stop-2', sequence: 2 }]);
    });

    // The day is NOT re-read when the write was refused: the courier keeps
    // looking at the very order the phone is certain of.
    expect(applied).toBe(false);
    expect(getByTestId('order').props.children).toBe('stop-1,stop-2');
    expect(mockLoad).toHaveBeenCalledTimes(1);
  });
});
