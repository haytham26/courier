/**
 * The shift the courier is working.
 *
 * The API keys its shifts with UUIDs, so the app keeps the id of the shift
 * on the phone: the shift the courier starts in the morning is the shift
 * the money and the stops belong to.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { createUuid } from '@/lib/uuid';
import { getAppStore } from '@/sync/runtime';

const SHIFT_KEY = 'shift.current.v1';

interface ShiftContextValue {
  /** The id of the running shift (null when the courier is not on one). */
  shiftId: string | null;
  /** The app has read the shift from the phone. */
  isReady: boolean;
  /** Starts a shift (the courier starts work). */
  startShift: () => void;
  /** Ends the shift (the courier is done for the day). */
  endShift: () => void;
}

const ShiftContext = createContext<ShiftContextValue | undefined>(undefined);

export function ShiftProvider({ children }: { children: React.ReactNode }) {
  const [shiftId, setShiftId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      let stored: string | null = null;
      try {
        stored = await getAppStore().get(SHIFT_KEY);
      } catch {
        // A phone that cannot read its own store still runs the shift.
        stored = null;
      }
      if (cancelled) {
        return;
      }
      const id = stored ?? createUuid();
      setShiftId(id);
      setIsReady(true);
      if (stored === null) {
        try {
          await getAppStore().set(SHIFT_KEY, id);
        } catch {
          // The shift stays on the phone for this session.
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const startShift = useCallback(() => {
    const id = createUuid();
    setShiftId(id);
    void (async () => {
      try {
        await getAppStore().set(SHIFT_KEY, id);
      } catch {
        // The shift stays on the phone for this session.
      }
    })();
  }, []);

  const endShift = useCallback(() => {
    setShiftId(null);
    void (async () => {
      try {
        await getAppStore().remove(SHIFT_KEY);
      } catch {
        // The shift ends for this session either way.
      }
    })();
  }, []);

  const value = useMemo<ShiftContextValue>(
    () => ({ shiftId, isReady, startShift, endShift }),
    [shiftId, isReady, startShift, endShift],
  );

  return <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>;
}

export function useShift(): ShiftContextValue {
  const context = useContext(ShiftContext);
  if (!context) {
    throw new Error('useShift must be used within a ShiftProvider');
  }
  return context;
}
