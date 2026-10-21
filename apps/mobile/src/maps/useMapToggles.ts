/**
 * The hook that holds the map toggles.
 *
 * The toggles are the courier's own choices, so they are read from the
 * driver's preferences when the screen opens and written back every time
 * they change.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { errorMessage } from '@/lib/errors';
import { createFilePreferenceStore } from '@/sync/preferenceFiles';
import {
  createMemoryPreferenceStore,
  readDriverPreferences,
  writeDriverPreference,
  type PreferenceStore,
} from '@/sync/storage';

import {
  DEFAULT_MAP_TOGGLES,
  MAP_TOGGLES_PREFERENCE_KEY,
  parseMapToggles,
  type MapToggles,
} from './toggles';

/** What the hook needs to know. */
export interface UseMapTogglesOptions {
  /** The driver the toggles belong to. */
  driverId: string;
  /** Where the toggles are kept; the device file system by default. */
  store?: PreferenceStore;
}

/** What the hook gives back. */
export interface MapTogglesState {
  /** The toggles as they are now. */
  toggles: MapToggles;
  /** The courier changed something. */
  setToggles: (toggles: MapToggles) => void;
  /** True once the stored toggles have been read. */
  ready: boolean;
}

function defaultStore(): PreferenceStore {
  try {
    return createFilePreferenceStore();
  } catch (error) {
    console.warn(
      `maps: the preferences could not be opened, so the map settings are not kept: ${errorMessage(error)}`,
    );
    return createMemoryPreferenceStore();
  }
}

export function useMapToggles(options: UseMapTogglesOptions): MapTogglesState {
  const [toggles, setTogglesState] = useState<MapToggles>(DEFAULT_MAP_TOGGLES);
  const [ready, setReady] = useState(false);

  const store = useMemo(() => options.store ?? defaultStore(), [options.store]);

  useEffect(() => {
    let cancelled = false;
    setReady(false);

    void (async () => {
      try {
        const preferences = await readDriverPreferences(store, options.driverId);
        if (!cancelled) {
          setTogglesState(parseMapToggles(preferences[MAP_TOGGLES_PREFERENCE_KEY]));
          setReady(true);
        }
      } catch (error) {
        console.warn(`maps: the map settings could not be read: ${errorMessage(error)}`);
        if (!cancelled) {
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [options.driverId, store]);

  const setToggles = useCallback(
    (next: MapToggles) => {
      setTogglesState(next);
      void writeDriverPreference(store, options.driverId, MAP_TOGGLES_PREFERENCE_KEY, next).catch(
        (error: unknown) => {
          console.warn(`maps: the map settings could not be saved: ${errorMessage(error)}`);
        },
      );
    },
    [options.driverId, store],
  );

  return { toggles, setToggles, ready };
}
