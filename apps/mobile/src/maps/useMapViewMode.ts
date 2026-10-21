/**
 * The hook that holds the map mode.
 *
 * The mode is the courier's own choice, so it is read from the driver's
 * preferences when the screen opens and written back every time it changes.
 * The state machine that turns the choice into the mode the map is really
 * in lives in `viewModes.ts`, so it can be tested on its own.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { errorMessage } from '@/lib/errors';
import { createFilePreferenceStore } from '@/sync/preferenceFiles';
import { createMemoryPreferenceStore, type PreferenceStore } from '@/sync/storage';

import {
  DEFAULT_MAP_VIEW_MODE,
  resolveViewMode,
  storeViewMode,
  readStoredViewMode,
  type MapViewMode,
  type ViewModeContext,
  type ViewModeDecision,
} from './viewModes';

/** What the hook needs to know. */
export interface UseMapViewModeOptions {
  /** The driver the mode belongs to. */
  driverId: string;
  /** The courier has turned the battery saver on. */
  batterySaver: boolean;
  /** The courier is moving. */
  moving: boolean;
  /** The courier is in a town rather than on a rural road. */
  inTown: boolean;
  /** The device has a network connection. */
  online: boolean;
  /** A licensed satellite imagery provider is configured. */
  satelliteLicensed: boolean;
  /** The map pack on the device carries the 3D building outlines. */
  buildingsInPack: boolean;
  /** Where the mode is kept; the device file system by default. */
  store?: PreferenceStore;
}

/** What the hook gives back. */
export interface MapViewModeState {
  /** The mode the courier chose. */
  mode: MapViewMode;
  /** The mode the map is really in, and why. */
  decision: ViewModeDecision;
  /** The courier picked another mode. */
  setMode: (mode: MapViewMode) => void;
  /** True once the stored mode has been read. */
  ready: boolean;
}

/**
 * The store the mode is kept in.
 *
 * A device whose file system will not open still gets the screen: the mode
 * is then remembered for as long as the app is open.
 */
function defaultStore(): PreferenceStore {
  try {
    return createFilePreferenceStore();
  } catch (error) {
    console.warn(
      `maps: the preferences could not be opened, so the map mode is not kept: ${errorMessage(error)}`,
    );
    return createMemoryPreferenceStore();
  }
}

export function useMapViewMode(options: UseMapViewModeOptions): MapViewModeState {
  const [mode, setModeState] = useState<MapViewMode>(DEFAULT_MAP_VIEW_MODE);
  const [ready, setReady] = useState(false);

  const store = useMemo(() => options.store ?? defaultStore(), [options.store]);

  const context = useMemo<ViewModeContext>(
    () => ({
      batterySaver: options.batterySaver,
      moving: options.moving,
      inTown: options.inTown,
      online: options.online,
      satelliteLicensed: options.satelliteLicensed,
      buildingsInPack: options.buildingsInPack,
    }),
    [
      options.batterySaver,
      options.moving,
      options.inTown,
      options.online,
      options.satelliteLicensed,
      options.buildingsInPack,
    ],
  );

  // The stored mode belongs to one driver: a different driver starts with
  // the default until their own mode has been read.
  useEffect(() => {
    let cancelled = false;
    setReady(false);

    void (async () => {
      try {
        const stored = await readStoredViewMode(store, options.driverId);
        if (!cancelled) {
          setModeState(stored ?? DEFAULT_MAP_VIEW_MODE);
          setReady(true);
        }
      } catch (error) {
        console.warn(`maps: the map mode could not be read: ${errorMessage(error)}`);
        if (!cancelled) {
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [options.driverId, store]);

  const setMode = useCallback(
    (next: MapViewMode) => {
      setModeState(next);
      void storeViewMode(store, options.driverId, next).catch((error: unknown) => {
        console.warn(`maps: the map mode could not be saved: ${errorMessage(error)}`);
      });
    },
    [options.driverId, store],
  );

  const decision = useMemo(() => resolveViewMode(mode, context), [mode, context]);

  return { mode, decision, setMode, ready };
}
