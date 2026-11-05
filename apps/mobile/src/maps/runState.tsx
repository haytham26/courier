/**
 * The run state above the screens.
 *
 * The drive's slide marks a stop delivered, and the confirm panel (05) has
 * to show THAT stop afterwards; Today's sheet and the drive keep reading
 * the same marks. So the marks live above the routes, in one provider the
 * root layout wraps the stack in - a context, not a module store and not a
 * tab-scoped state, because root routes mount apart from the tabs.
 *
 * The boundary This replaces is the recorded one ("the screens carry the
 * day's own copy; the shared write path lands with the Route screen"):
 * arriving at screen 05 forces the shared write path here, because a
 * confirm panel on a separate route cannot read a screen's own state. The
 * Route screen's planner (08) will read the same provider when it is
 * staged.
 *
 * **BUG-069 is closed here**: the marks are no longer `useState` alone. The
 * provider writes every mark through the run store (`src/run`) and rehydrates
 * them from it on mount, so a cold start or a driver swap no longer loses
 * them - the store is the only write path, and the event log records the
 * delivery so the outbox can send it later. The lifetime is still one
 * signed-in session: the store a session opened closes with it, so a
 * sign-out clears the marks and the day, and the next courier starts clean.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { errorMessage } from '@/lib/errors';
import { inMemoryMarkStore } from '@/run/inMemoryMarkStore';
import { noDayStore, useRunDay } from '@/run/useRunDay';
import type { StoreSource } from '@/run/useRunDay';
import type { RunDay } from '@/run/useRunDay';
import type { MarkStore, RouteOrderEntry, RunDayStore } from '@/run/types';

import type { Stop } from './stops';

/**
 * The failed write, on the store that carries it.
 *
 * Only the app's own run store records the reason (an in-memory marks store
 * has no event log), so this is the check: a build whose store is not the run
 * store says so, rather than pretending a delivery was recorded.
 */
async function writeFailed(
  store: MarkStore,
  stop: Stop,
  outcome: { reason: string; utterance?: string },
): Promise<void> {
  const writes = (store as Partial<MarkStore & { markFailed: unknown }>).markFailed;
  if (typeof writes !== 'function') {
    throw new Error('this build has no event log: the failed delivery cannot be recorded');
  }
  await (writes as (s: Stop, o: { reason: string; utterance?: string }) => Promise<void>).call(
    store,
    stop,
    outcome,
  );
}

/** One delivery the run made: the stop and the moment it landed. */
export interface DeliveredEvent {
  stopId: string;
  sequence: number;
  /** The moment of the delivery, as the epoch milliseconds the clock read. */
  at: number;
}

export interface RunState {
  /** The deliveries on this run, in delivery order. */
  delivered: DeliveredEvent[];
  /** Whether a stop is marked delivered by an event (not by the mock's status). */
  isDelivered(stopId: string): boolean;
  /** Marks a stop delivered with the clock read at the moment of the call. */
  markDelivered(stop: Stop): void;
  /** Takes a stop back: the mark of it leaves the run. */
  undoDelivered(stopId: string): void;
  /**
   * Records a delivery that failed, with the reason the courier chose (queue
   * 4b, ADR-023).
   */
  markFailed(stop: Stop, outcome: { reason: string; utterance?: string }): void;
  /**
   * The day itself, read through the same store the marks are written to.
   *
   * A1 slice 3: the screens read the run's own stops here, so a screen that
   * shows the day shows the day the phone holds and not a mock's copy of it.
   * `hasRun` is false on a first launch with no network, which is the honest
   * answer: there is no day on the phone yet.
   */
  day: RunDay;
  /** Re-reads the day from the network, when the courier asks for it. */
  refreshDay(): Promise<void>;
  /**
   * Applies the order the server's solver worked out to the day the run
   * holds, and answers whether the run now carries it (queue 4.2).
   */
  applyRouteOrder(order: readonly RouteOrderEntry[]): Promise<boolean>;
}

const RunContext = createContext<RunState | undefined>(undefined);

export const RunProvider = ({
  children,
  store,
}: {
  children: React.ReactNode;
  /** The run store the marks live in. The in-memory one, by default. */
  store?: MarkStore;
}) => {
  // Opened once per provider, so a build with no store handed to it keeps the
  // marks in memory (the behaviour this provider had before the store).
  const [marks] = useState<MarkStore>(() => store ?? inMemoryMarkStore());
  const [delivered, setDelivered] = useState<DeliveredEvent[]>([]);

  /**
   * The day behind the marks, read through the very same store.
   *
   * A store that carries a day (the app's own run store) answers the day and
   * the marks with one handle; a store that carries only marks (the in-memory
   * one a test hands over) has no day, and the screens read an empty one rather
   * than a second store opening a second handle to look.
   */
  const dayStore = useMemo<RunDayStore | null>(
    () => (typeof (marks as Partial<RunDayStore>).load === 'function' ? (marks as RunDayStore) : null),
    [marks],
  );
  // The read path of a store with no day, made once: a fresh one each render
  // would be a new store each render, and the hook would re-read forever.
  const noDay = useMemo(noDayStore, []);
  // The source is one function for the life of the store it reads: a fresh
  // closure each render would do the same, which the run-state suite caught as
  // a timeout.
  const daySource = useCallback<StoreSource>(() => dayStore ?? noDay, [dayStore, noDay]);
  const day = useRunDay(daySource);

  // The marks of the run come back from the store when the provider mounts.
  useEffect(() => {
    let alive = true;
    void marks.deliveredMarks().then(
      (stored) => {
        if (alive) {
          setDelivered(stored);
        }
      },
      (error: unknown) => {
        console.warn(`run: the marks could not be read back: ${errorMessage(error)}`);
      },
    );
    return () => {
      alive = false;
      void marks.close().catch((error: unknown) => {
        console.warn(`run: the run could not be closed: ${errorMessage(error)}`);
      });
    };
  }, [marks]);

  const markDelivered = useCallback(
    (stop: Stop) => {
      setDelivered((current) =>
        current.some((event) => event.stopId === stop.id)
          ? current
          : [...current, { stopId: stop.id, sequence: stop.sequence, at: Date.now() }],
      );
      void (async () => {
        try {
          await marks.markDelivered(stop);
          // BUG-178: the day's own marks are what the screens read, so the
          // day is re-read after the write - run 41578697363's a1 taps went
          // to the same stop three times because the sheet never advanced.
          await day.refreshMarks();
        } catch (error) {
          console.warn(`run: the delivery of ${stop.id} could not be written: ${errorMessage(error)}`);
        }
      })();
    },
    [marks, day],
  );

  const undoDelivered = useCallback(
    (stopId: string) => {
      setDelivered((current) => current.filter((event) => event.stopId !== stopId));
      void (async () => {
        try {
          await marks.undoDelivered(stopId);
          // The day's numbers follow the write, the same as a mark (BUG-178).
          await day.refreshMarks();
        } catch (error) {
          console.warn(`run: the delivery of ${stopId} could not be taken back: ${errorMessage(error)}`);
        }
      })();
    },
    [marks, day],
  );

  /**
   * The failed delivery, written through the store's own path (queue 4b).
   *
   * The reason is required: a failed outcome without it is refused by the
   * server (ADR-023) and would take the whole outbox batch with it, so the
   * phone refuses it here first and names why. The mark's own write is the
   * day's number following it (BUG-178).
   */
  const markFailed = useCallback(
    (stop: Stop, outcome: { reason: string; utterance?: string }) => {
      setDelivered((current) =>
        current.some((event) => event.stopId === stop.id)
          ? current
          : [...current, { stopId: stop.id, sequence: stop.sequence, at: Date.now() }],
      );
      void (async () => {
        try {
          await writeFailed(marks, stop, outcome);
          await day.refreshMarks();
        } catch (error) {
          setDelivered((current) => current.filter((event) => event.stopId !== stop.id));
          console.warn(`run: the failure of ${stop.id} could not be written: ${errorMessage(error)}`);
        }
      })();
    },
    [marks, day],
  );

  const isDelivered = useCallback(
    (stopId: string) => delivered.some((event) => event.stopId === stopId),
    [delivered],
  );

  /** Re-reads the day from the network, so a courier's pull asks the server. */
  const refreshDay = useCallback(async () => {
    if (dayStore === null) {
      return;
    }
    try {
      await dayStore.refresh();
    } catch (error) {
      console.warn(`run: the day could not be refreshed: ${errorMessage(error)}`);
    }
  }, [dayStore]);

  /**
   * Applies the solver's order through the day's own write path, and the day
   * is re-read behind it so every screen follows (queue 4.2).
   */
  const applyRouteOrder = useCallback(
    async (order: readonly RouteOrderEntry[]) => {
      try {
        return await day.applyRouteOrder(order);
      } catch (error) {
        console.warn(`run: the solver\u2019s order could not be applied: ${errorMessage(error)}`);
        return false;
      }
    },
    [day],
  );

  const value = useMemo(
    () => ({
      delivered,
      isDelivered,
      markDelivered,
      undoDelivered,
      markFailed,
      day,
      refreshDay,
      applyRouteOrder,
    }),
    [delivered, isDelivered, markDelivered, undoDelivered, markFailed, day, refreshDay, applyRouteOrder],
  );

  return <RunContext.Provider value={value}>{children}</RunContext.Provider>;
};

/** The run above the screen that called it. */
export const useRun = (): RunState => {
  const ctx = useContext(RunContext);
  if (!ctx) {
    throw new Error('useRun needs a RunProvider above it');
  }
  return ctx;
};
