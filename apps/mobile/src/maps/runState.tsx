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
 * The lifetime is one signed-in session: the root layout keys this
 * provider to the auth state, so a sign-out remounts it and the marks are
 * gone. A storage-backed run is the Route screen's arrival decision.
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import type { Stop } from './stops';

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
}

const RunContext = createContext<RunState | undefined>(undefined);

export const RunProvider = ({ children }: { children: React.ReactNode }) => {
  const [delivered, setDelivered] = useState<DeliveredEvent[]>([]);

  // BUG-109 breadcrumb (scratch experiment branch, never merged): this
  // provider is keyed to the auth state, so a remount of it resets the
  // navigation stack to its initial route (today-screen).
  React.useEffect(() => {
    console.log('[b109] RunProvider MOUNTED (the whole Stack remounted, the route state resets)');
    return () => {
      console.log('[b109] RunProvider UNMOUNTED (the Stack is going away)');
    };
  }, []);

  const markDelivered = useCallback((stop: Stop) => {
    setDelivered((current) => {
      if (current.some((event) => event.stopId === stop.id)) {
        return current;
      }
      return [...current, { stopId: stop.id, sequence: stop.sequence, at: Date.now() }];
    });
  }, []);

  const undoDelivered = useCallback((stopId: string) => {
    setDelivered((current) => current.filter((event) => event.stopId !== stopId));
  }, []);

  const isDelivered = useCallback(
    (stopId: string) => delivered.some((event) => event.stopId === stopId),
    [delivered],
  );

  const value = useMemo(
    () => ({ delivered, isDelivered, markDelivered, undoDelivered }),
    [delivered, isDelivered, markDelivered, undoDelivered],
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
