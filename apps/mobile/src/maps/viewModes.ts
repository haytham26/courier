/**
 * The map modes the courier can choose (MASTER_EXECUTION §11).
 *
 * A courier picks the map the way they pick the radio station: once, with one
 * tap or one sentence, and then it is theirs until they change it.
 *
 * | Mode | What it is |
 * |---|---|
 * | `flat` | the flat 2D map - the default, and the only mode the battery saver allows |
 * | `3d` | the tilted map with the buildings standing up |
 * | `satellite` | the imagery from a licensed provider - **online only** |
 * | `auto` | 3D while the courier is driving in a town, flat when they stop, flat on a rural road and flat on the battery saver |
 *
 * The mode is **remembered per driver**: a shared van phone must not carry
 * one driver's map into the next driver's shift, so the choice is stored
 * under the driver id (`apps/mobile/src/sync/storage.ts`).
 *
 * The satellite mode is the one that can be refused. The imagery comes from a
 * provider we hold a licence for, so the mode only works when there is a
 * network **and** a licensed provider is configured. When either is missing
 * the courier is told plainly and the map stays flat: the app never points
 * the map at a tile source it has no right to use, and never shows a broken
 * map (MASTER_EXECUTION §11, "never a broken tile source").
 */

import { readDriverPreferences, writeDriverPreference, type PreferenceStore } from '@/sync/storage';

/** The modes the courier can choose. */
export type MapViewMode = 'flat' | '3d' | 'satellite' | 'auto';

/** The modes the map can actually draw. */
export type ResolvedMapViewMode = 'flat' | '3d' | 'satellite';

/** The four modes, in the order they are shown. */
export const MAP_VIEW_MODES: readonly MapViewMode[] = ['flat', '3d', 'satellite', 'auto'];

/** The mode the app starts in when the courier has not chosen one. */
export const DEFAULT_MAP_VIEW_MODE: MapViewMode = 'flat';

/** Whether a value is one of the four modes. */
export function isMapViewMode(value: unknown): value is MapViewMode {
  return typeof value === 'string' && (MAP_VIEW_MODES as readonly string[]).includes(value);
}

/**
 * What the map knows about the courier and the device at this moment.
 *
 * The state machine is pure: it takes the facts and returns the decision, so
 * the rule can be tested without a device, without a map and without a
 * network.
 */
export interface ViewModeContext {
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
}

/** Why the map is in the mode it is in. */
export type ViewModeReason =
  /** The courier asked for this mode and got it. */
  | 'as-asked'
  /** The battery saver keeps the map flat. */
  | 'battery-saver'
  /** The courier is not moving, so the map stays flat. */
  | 'stopped'
  /** The courier is on a rural road, where a flat map reads better. */
  | 'rural'
  /** The courier is driving in a town, so the map tilts. */
  | 'driving-in-town'
  /** The satellite mode cannot be used: no network, or no licence. */
  | 'satellite-unavailable';

/** The decision the state machine made. */
export interface ViewModeDecision {
  /** The mode the courier asked for. */
  requested: MapViewMode;
  /** The mode the map is actually in. */
  effective: ResolvedMapViewMode;
  /** Why the map is in that mode. */
  reason: ViewModeReason;
  /** True when the request could not be honoured as it was asked. */
  degraded: boolean;
  /** A plain sentence for the courier, or null when there is nothing to say. */
  message: string | null;
}

/**
 * Works out which mode the map is in.
 *
 * The rules, in the order they are applied:
 *
 * 1. **The battery saver wins.** The map stays flat, whatever was asked for,
 *    and the courier is told why.
 * 2. **Satellite needs a network and a licence.** Without either, the map
 *    stays flat and the courier is told why.
 * 3. **Auto** tilts the map while the courier is driving in a town, and
 *    keeps it flat when they stop, when they are on a rural road and when
 *    the battery saver is on.
 */
export function resolveViewMode(
  requested: MapViewMode,
  context: ViewModeContext,
): ViewModeDecision {
  if (context.batterySaver) {
    return {
      requested,
      effective: 'flat',
      reason: 'battery-saver',
      degraded: requested !== 'flat',
      message: 'Battery saver is on, so the map stays flat.',
    };
  }

  switch (requested) {
    case 'flat':
      return {
        requested,
        effective: 'flat',
        reason: 'as-asked',
        degraded: false,
        message: null,
      };

    case '3d':
      return {
        requested,
        effective: '3d',
        reason: 'as-asked',
        degraded: false,
        message: context.buildingsInPack
          ? null
          : 'This map pack has no 3D buildings yet, so the buildings stay flat.',
      };

    case 'satellite': {
      if (context.online && context.satelliteLicensed) {
        return {
          requested,
          effective: 'satellite',
          reason: 'as-asked',
          degraded: false,
          message: null,
        };
      }
      return {
        requested,
        effective: 'flat',
        reason: 'satellite-unavailable',
        degraded: true,
        message: 'Satellite needs a network and a licence. Showing the flat map.',
      };
    }

    case 'auto': {
      if (!context.moving) {
        return {
          requested,
          effective: 'flat',
          reason: 'stopped',
          degraded: false,
          message: null,
        };
      }
      if (!context.inTown) {
        return {
          requested,
          effective: 'flat',
          reason: 'rural',
          degraded: false,
          message: null,
        };
      }
      return {
        requested,
        effective: '3d',
        reason: 'driving-in-town',
        degraded: false,
        message: null,
      };
    }

    default:
      return {
        requested,
        effective: 'flat',
        reason: 'as-asked',
        degraded: false,
        message: null,
      };
  }
}

/** The key the mode is stored under in the driver's preferences. */
export const VIEW_MODE_PREFERENCE_KEY = 'map.viewMode';

/**
 * The mode this driver last chose.
 *
 * A driver who has never chosen one has no stored mode, and the caller uses
 * the default.
 */
export async function readStoredViewMode(
  store: PreferenceStore,
  driverId: string,
): Promise<MapViewMode | null> {
  const preferences = await readDriverPreferences(store, driverId);
  const stored = preferences[VIEW_MODE_PREFERENCE_KEY];
  return isMapViewMode(stored) ? stored : null;
}

/** Remembers the mode this driver chose. */
export async function storeViewMode(
  store: PreferenceStore,
  driverId: string,
  mode: MapViewMode,
): Promise<void> {
  await writeDriverPreference(store, driverId, VIEW_MODE_PREFERENCE_KEY, mode);
}
