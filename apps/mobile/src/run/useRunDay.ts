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

import { productionRunStore } from './productionRunStore';
import type { DeliveredMark } from './types';
import type { Stop } from '@/maps/stops';

/**
 * The store this hook reads: the run store of the app's construction site,
 * which is both the day's loader and the marks' owner.
 */
type DayStore = ReturnType<typeof productionRunStore>;

/** Where the hook gets its store. Injectable, so a test can answer through. */
type StoreSource = () => Pick<
  DayStore,
  'load' | 'deliveredMarks' | 'markDelivered' | 'undoDelivered' | 'close'
>;

/** The day the store answers with, as the hook holds it. */
type RunLoad = Awaited<ReturnType<DayStore['load']>>;

/** What the screens need from the day, and nothing they can get two ways. */
export interface RunDay {
  /** Whether a run has been loaded: false on a first launch with no network. */
  hasRun: boolean;
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
}): Stop {
  return {
    id: api.id,
    sequence: api.seq,
    address: api.address ?? '',
    suburb: '',
    status: (api.status ?? 'pending') as Stop['status'],
    coordinates: {
      lat: typeof api.lat === 'number' ? api.lat : 0,
      lng: typeof api.lon === 'number' ? api.lon : 0,
    },
  };
}

/**
 * Reads the run the store holds, so every screen answers with the same day.
 *
 * The snapshot is read once per mount and re-read when the caller asks for a
 * refresh; the marks are read from the same store the run state writes
 * through, so a delivery made on the drive is a delivery Today sees.
 */
export function useRunDay(source: StoreSource = productionRunStore): RunDay {
  const store = useMemo(source, [source]);
  const [snapshot, setSnapshot] = useState<RunLoad | null>(null);
  const [marks, setMarks] = useState<DeliveredMark[]>([]);

  const readMarks = useCallback(async () => {
    const carried = await store.deliveredMarks();
    setMarks(carried);
    return carried;
  }, [store]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const loaded = await store.load();
      if (!alive) {
        return;
      }
      setSnapshot(loaded);
      await readMarks();
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

  return {
    hasRun: stops.length > 0,
    stops,
    delivered: marks,
    isDelivered,
    nextStop,
    remaining: stops.filter((stop) => !deliveredIds.has(stop.id)).length,
  };
}
