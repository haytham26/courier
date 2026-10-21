/**
 * The map toggles (MASTER_EXECUTION §11).
 *
 * The sheet under the map holds the choices a courier makes once and then
 * forgets about: the buildings on or off, the traffic, the road closures, the
 * weather, the size of the labels and the battery saver. The day, the night
 * and the auto theme are in the same sheet, and they belong to the theme
 * provider, which remembers the choice per driver.
 *
 * The toggles are stored with the rest of the driver's preferences, so the
 * next shift starts with the same map.
 *
 * The three online layers - traffic, road closures and weather - need a
 * provider. Until one is configured they are **remembered but not drawn**:
 * the courier's choice is kept, the sheet says plainly that the layer is not
 * set up yet, and the map never points at a source it has no right to use.
 */

/** How big the map labels are. */
export type MapLabelSize = 'small' | 'normal' | 'large';

/** The three label sizes, from the smallest to the largest. */
export const MAP_LABEL_SIZES: readonly MapLabelSize[] = ['small', 'normal', 'large'];

/** The label size the map starts with. */
export const DEFAULT_MAP_LABEL_SIZE: MapLabelSize = 'normal';

/** Whether a value is one of the three label sizes. */
export function isMapLabelSize(value: unknown): value is MapLabelSize {
  return typeof value === 'string' && (MAP_LABEL_SIZES as readonly string[]).includes(value);
}

/**
 * How much bigger the labels are in each size.
 *
 * The scale is a multiplier on the text size of the map style, so the three
 * sizes cannot drift apart from the style that draws them.
 */
export const MAP_LABEL_SCALE: Record<MapLabelSize, number> = {
  small: 0.85,
  normal: 1,
  large: 1.2,
};

/** The choices on the map. */
export interface MapToggles {
  /** The buildings are drawn. */
  buildings: boolean;
  /** The traffic layer is on. */
  traffic: boolean;
  /** The road closures layer is on. */
  closures: boolean;
  /** The weather layer is on. */
  weather: boolean;
  /** How big the labels are. */
  labelSize: MapLabelSize;
  /**
   * The battery saver.
   *
   * With it on the map stays flat, whatever else the courier has chosen: the
   * 3D map is the first thing that costs battery on a phone in a van.
   */
  batterySaver: boolean;
}

/** The toggles a courier has before they change anything. */
export const DEFAULT_MAP_TOGGLES: MapToggles = {
  buildings: true,
  traffic: false,
  closures: false,
  weather: false,
  labelSize: DEFAULT_MAP_LABEL_SIZE,
  batterySaver: false,
};

/** The key the toggles are stored under in the driver's preferences. */
export const MAP_TOGGLES_PREFERENCE_KEY = 'map.toggles';

/**
 * Reads the toggles.
 *
 * A value that is not one of the choices falls back to the default, so a
 * preferences file written by an older build still opens.
 */
export function parseMapToggles(raw: unknown): MapToggles {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return DEFAULT_MAP_TOGGLES;
  }

  const record = raw as Record<string, unknown>;
  const flag = (value: unknown, fallback: boolean): boolean =>
    typeof value === 'boolean' ? value : fallback;

  return {
    buildings: flag(record.buildings, DEFAULT_MAP_TOGGLES.buildings),
    traffic: flag(record.traffic, DEFAULT_MAP_TOGGLES.traffic),
    closures: flag(record.closures, DEFAULT_MAP_TOGGLES.closures),
    weather: flag(record.weather, DEFAULT_MAP_TOGGLES.weather),
    labelSize: isMapLabelSize(record.labelSize) ? record.labelSize : DEFAULT_MAP_TOGGLES.labelSize,
    batterySaver: flag(record.batterySaver, DEFAULT_MAP_TOGGLES.batterySaver),
  };
}

/** The raw JSON of a set of toggles. */
export function serialiseMapToggles(toggles: MapToggles): string {
  return JSON.stringify(toggles);
}

/** The online layers a courier can turn on. */
export type MapLayer = 'traffic' | 'closures' | 'weather';

/** The three online layers. */
export const MAP_LAYERS: readonly MapLayer[] = ['traffic', 'closures', 'weather'];

/**
 * Which of the online layers can be drawn right now.
 *
 * A layer needs a provider: traffic needs a flow-speed feed, the closures
 * need the Waka Kotahi feed and the weather needs a forecast. None of them
 * is configured in this build, so the sheet says so and the map stays clean.
 */
export const MAP_LAYER_AVAILABILITY: Record<MapLayer, boolean> = {
  traffic: false,
  closures: false,
  weather: false,
};

/** The plain sentence the sheet shows under a layer that is not set up yet. */
export function layerUnavailableMessage(layer: MapLayer): string {
  switch (layer) {
    case 'traffic':
      return 'Traffic is not set up yet. Your choice is remembered.';
    case 'closures':
      return 'Road closures are not set up yet. Your choice is remembered.';
    case 'weather':
      return 'Weather is not set up yet. Your choice is remembered.';
    default:
      return 'This layer is not set up yet. Your choice is remembered.';
  }
}
