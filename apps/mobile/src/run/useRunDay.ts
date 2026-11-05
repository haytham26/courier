/**
 * The day the screens read: one run, one set of marks, one source of truth.
 *
 * A1's slice 3. The audit's finding (C1 squad 1 #15) was that Today and the
 * drive each carried their own copy: Today read `mockStops` and kept its own
 * `doneIds/skippedIds/failedIds`, so Today and Driving disagreed about the
 * same stop and a Today-only mark recorded no event at all - the day the
 * courier saw was not the day the phone held.
 *
 * This hook is the one read path, and every screen that shows the run reads it
 * here: the run store's snapshot (the seeded day, in the run's own order) and
 * the marks the store carries. A screen cannot drift from another screen's
 * numbers again, because there is only one number.
 *
 * The store is opened by the app's construction site (the root layout hands
 * the MarkStore the run state uses); this hook reads it rather than opening a
 * second handle, so the phone has one store and not two.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { DeliveredMark, RouteOrderEntry } from './types';
import type { RunStore } from './runStore';
import type { Stop } from '@/maps/stops';
import { errorMessage } from '@/lib/errors';

/**
 * The store this hook reads: the app's run store, which is both the day's
 * loader and the marks' owner.
 *
 * It is passed in, never imported here: the caller (the run state above the
 * screens) already holds the session's store, and a hook that opened a second
 * one would be a second handle to look through.
 */
type DayStore = RunStore;

/** Where the hook gets its store: the caller's own, injected. */
export type StoreSource = () => Pick<
  DayStore,
  'load' | 'deliveredMarks' | 'markDelivered' | 'undoDelivered' | 'close' | 'applyRouteOrder'
>;

/** Where the hook gets its store. Injectable, so a test can answer through. */

/** The day the store answers with, as the hook holds it. */
type RunLoad = Awaited<ReturnType<DayStore['load']>>;

/**
 * The read path of a store that holds no day (A1 slice 3).
 *
 * A build whose marks live in memory - a test's provider, or a phone whose
 * encrypted database could not be opened - has no day behind them, and the
 * screens answer with an empty one rather than opening a second handle to
 * look. Nothing crashes, and nothing lies: `hasRun` is false and the stops are
 * none.
 */
export function noDayStore(): Pick<
  DayStore,
  'load' | 'deliveredMarks' | 'markDelivered' | 'undoDelivered' | 'close' | 'applyRouteOrder'
> {
  return {
    load: () => Promise.resolve({ status: 'offline', snapshot: null }),
    deliveredMarks: () => Promise.resolve([]),
    markDelivered: () => Promise.resolve(),
    undoDelivered: () => Promise.resolve(),
    close: () => Promise.resolve(),
    applyRouteOrder: () => Promise.resolve(false),
  };
}

/** What the screens need from the day, and nothing they can get two ways. */
export interface RunDay {
  /** Whether a run has been loaded: false on a first launch with no network. */
  hasRun: boolean;
  /** The run's own id, or null before the day has been read (queue 4.2). */
  runId: string | null;
  /** The stops of the run, in the run's own order. Empty while loading. */
  stops: Stop[];
  /** The deliveries this run carries, in delivery order. */
  delivered: DeliveredMark[];
  /** Whether a stop is marked delivered, wherever the mark was made. */
  isDelivered(stopId: string): boolean;
  /** The next stop in the run's order that is not yet delivered. */
  nextStop: Stop | null;
  /** The stops the run still has to deliver. */
  remaining: number;
  /**
   * The run's own break window, or null when the run carries none (queue 4d,
   * the trial's #12, ADR-022's app half). Half a window is not a window.
   */
  breakWindow: { start: string; end: string } | null;
  /**
   * The run's own finish point, or null when the run carries none (queue 4d,
   * the trial's #14, ADR-022's app half).
   */
  finish: { lat: number; lon: number } | null;
  /**
   * The run's own depot, so a screen can say where the day finishes when the
   * run's finish point is the depot itself.
   */
  depot: { lat: number; lon: number } | null;
  /**
   * Re-reads the marks from the store, so a mark made through the run state
   * is a mark the screens already show (BUG-178).
   */
  refreshMarks(): Promise<void>;
  /**
   * Re-reads the day from the store, so a write to the day (the solver's
   * order, queue 4.2) is a day every screen reads.
   */
  refreshDay(): Promise<void>;
  /**
   * Applies the order the server's solver worked out and re-reads the day,
   * answering whether the phone now carries that order.
   *
   * The answer is the only place a re-placed order exists (the server stores
   * the plan, not the stops' own `seq`), so the write goes through the store
   * this hook reads and the re-read follows it: every screen on the day shows
   * the order the courier now drives, not one of them.
   */
  applyRouteOrder(order: readonly RouteOrderEntry[]): Promise<boolean>;
}

/**
 * One stop of the contract, as the app's screens see it.
 *
 * The order and the address are the run's own; the app's own view of a stop
 * (its pin, its note chips) stays the screens' business.
 */
function toStop(api: {
  id: string;
  seq: number;
  address?: string;
  status?: string;
  lat?: number;
  lon?: number;
  priority?: boolean;
  parcels?: number;
  window_start?: string;
  window_end?: string;
  type?: string;
}): Stop {
  const whole = api.address ?? '';
  // The contract answers one address string; the app's own view of a stop has
  // a street and a suburb, and a New Zealand address carries the suburb after
  // its last comma ("45 Papanui Road, Merivale" is the street "45 Papanui
  // Road" in the suburb "Merivale"). An address with no comma has no suburb to
  // name, which is the honest answer.
  const parts = whole
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const hasSuburb = parts.length > 1;
  const suburb = hasSuburb ? parts[parts.length - 1] : '';
  const street = hasSuburb ? parts.slice(0, -1).join(', ') : whole.trim();

  // Queue 4a: the run's own priority and the run's own window, read from the
  // contract's fields. A window is only there when the server said both ends
  // of it: half a window is not a window to tell a courier.
  const start = api.window_start;
  const end = api.window_end;
  const window =
    typeof start === 'string' && start.length > 0 && typeof end === 'string' && end.length > 0
      ? { start, end }
      : undefined;

  return {
    id: api.id,
    sequence: api.seq,
    address: street,
    suburb,
    status: (api.status ?? 'pending') as Stop['status'],
    coordinates: {
      lat: typeof api.lat === 'number' ? api.lat : 0,
      lng: typeof api.lon === 'number' ? api.lon : 0,
    },
    priority: api.priority === true,
    ...(window === undefined ? {} : { window }),
    // Queue 4c (the trial's #21, ADR-024): the stop's own type. The contract
    // requires it, and a stop left without one is a delivery - the schema's
    // own default, honest for every row seeded before the column existed.
    type: api.type === 'pickup' ? 'pickup' : 'delivery',
  };
}

/**
 * Reads the run the store holds, so every screen answers with the same day.
 *
 * The snapshot is read once per mount and re-read when the caller asks for a
 * refresh; the marks are read from the same store the run state writes
 * through, so a delivery made on the drive is a delivery Today sees.
 */
export function useRunDay(source: StoreSource): RunDay {
  // The source is the caller's own function, so it may be a fresh closure each
  // render: the store it answers with is what has to be stable, and it is
  // read once per source rather than re-opened on every render.
  const store = useMemo(source, [source]);
  const [snapshot, setSnapshot] = useState<RunLoad | null>(null);
  const [marks, setMarks] = useState<DeliveredMark[]>([]);

  const readMarks = useCallback(async () => {
    const carried = await store.deliveredMarks();
    setMarks(carried);
    return carried;
  }, [store]);

  // BUG-178: the same read, answered as nothing - the run state asks for it
  // after every mark and undo, so the screens follow the write.
  const refreshMarks = useCallback(async () => {
    await readMarks();
  }, [readMarks]);

  // The day is re-read the same way the mount effect reads it: through the
  // store this hook was handed, so a write the store made (the solver's
  // order) is the day every screen follows.
  const readDay = useCallback(async () => {
    const loaded = await store.load();
    setSnapshot(loaded);
    return loaded;
  }, [store]);

  const refreshDay = useCallback(async () => {
    await readDay();
  }, [readDay]);

  const applyRouteOrder = useCallback(
    async (order: readonly RouteOrderEntry[]) => {
      // A store that answers with no day (the in-memory marks of a test) has
      // nothing to reorder, and says so rather than pretending it did.
      if (typeof store.applyRouteOrder !== 'function') {
        return false;
      }
      if (!(await store.applyRouteOrder(order))) {
        return false;
      }
      const loaded = await readDay();
      return loaded.status === 'ok';
    },
    [store, readDay],
  );

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const loaded = await store.load();
        if (!alive) {
          return;
        }
        setSnapshot(loaded);
        await readMarks();
      } catch (error) {
        // BUG-172: run 41491440450 - a store that throws (the cache handle
        // closed under the remounted session) left this promise unhandled and
        // the day empty with no log line. The hook names it instead.
        console.warn(`run: the day could not be read: ${errorMessage(error)}`);
      }
    })();
    return () => {
      alive = false;
    };
  }, [store, readMarks]);

  const stops = useMemo(
    () => (snapshot?.status === 'ok' ? snapshot.snapshot.stops.map(toStop) : []),
    [snapshot],
  );

  const deliveredIds = useMemo(() => new Set(marks.map((mark) => mark.stopId)), [marks]);

  const nextStop = useMemo(
    () => stops.find((stop) => !deliveredIds.has(stop.id)) ?? null,
    [stops, deliveredIds],
  );

  const isDelivered = useCallback((stopId: string) => deliveredIds.has(stopId), [deliveredIds]);

  // One object per answer, not one per render: the screens read this through
  // the run state above them, and an unstable identity would re-render every
  // screen on every frame for a day that has not changed.
  // The run's own id, memoised on the id itself: the snapshot is a new object
  // every time the day is read, and a fresh one per read would hand the
  // screens a new runId for the very same run (queue 4.2).
  const runId = useMemo(
    () => (snapshot?.status === 'ok' ? snapshot.snapshot.run.id : null),
    [snapshot],
  );

  // Queue 4d (the trial's #12 and #14, ADR-022's app half): the run's own
  // break window, finish point and depot, read from the same snapshot as the
  // id - one read, one source, so the offline answer and the online answer
  // carry them the same way. A run that answers without them has none to
  // name, which is the honest answer (null, not a guess).
  const runFacts = useMemo(() => {
    if (snapshot?.status !== 'ok') {
      return {
        breakWindow: null,
        finish: null,
        depot: null,
      } as const;
    }
    const apiRun = snapshot.snapshot.run;
    const breakWindow = apiRun.break_window;
    const finish = apiRun.finish;
    return {
      breakWindow:
        breakWindow !== undefined &&
        typeof breakWindow.start === 'string' &&
        typeof breakWindow.end === 'string'
          ? { start: breakWindow.start, end: breakWindow.end }
          : null,
      finish:
        finish !== undefined && typeof finish.lat === 'number' && typeof finish.lon === 'number'
          ? { lat: finish.lat, lon: finish.lon }
          : null,
      depot: { lat: apiRun.depot.lat, lon: apiRun.depot.lon },
    } as const;
  }, [snapshot]);

  return useMemo(
    () => ({
      hasRun: stops.length > 0,
      runId,
      stops,
      delivered: marks,
      isDelivered,
      nextStop,
      remaining: stops.filter((stop) => !deliveredIds.has(stop.id)).length,
      breakWindow: runFacts.breakWindow,
      finish: runFacts.finish,
      depot: runFacts.depot,
      refreshMarks,
      refreshDay,
      applyRouteOrder,
    }),
    [stops, marks, isDelivered, nextStop, deliveredIds, runId, runFacts, refreshMarks, refreshDay, applyRouteOrder],
  );
}
