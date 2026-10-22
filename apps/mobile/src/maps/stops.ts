/**
 * The courier's stops on the map.
 *
 * The stop list is still the mock list the rest of the app uses; the map
 * squad owns how a stop is drawn, not where the stops come from.
 */

import type { LngLatBounds } from '@maplibre/maplibre-react-native';
import type { Theme } from '@courier/design-tokens/themes';

export type StopStatus = 'pending' | 'active' | 'delivered' | 'failed' | 'skipped';

export interface Stop {
  id: string;
  address: string;
  suburb: string;
  status: StopStatus;
  sequence: number;
  coordinates: { lat: number; lng: number };
}

/**
 * How many stop markers the map draws at once.
 *
 * Every marker is a native view, so the count is capped: the stops inside the
 * current view are the ones a courier can act on, and the rest of the run is
 * on the list. The cap keeps the map at 60 fps with a full day of stops.
 */
export const MAX_MAP_MARKERS = 40;

export const mockStops: Stop[] = [
  {
    id: '1',
    address: '2/14 Riccarton Road',
    suburb: 'Riccarton',
    status: 'delivered',
    sequence: 1,
    coordinates: { lat: -43.535, lng: 172.605 },
  },
  {
    id: '2',
    address: '45 Papanui Road',
    suburb: 'Merivale',
    status: 'active',
    sequence: 2,
    coordinates: { lat: -43.518, lng: 172.625 },
  },
  {
    id: '3',
    address: '120 Blenheim Road',
    suburb: 'Upper Riccarton',
    status: 'pending',
    sequence: 3,
    coordinates: { lat: -43.545, lng: 172.595 },
  },
  {
    id: '4',
    address: '78 Main South Road',
    suburb: 'Sockburn',
    status: 'pending',
    sequence: 4,
    coordinates: { lat: -43.565, lng: 172.575 },
  },
  {
    id: '5',
    address: '234 Colombo Street',
    suburb: 'Sydenham',
    status: 'pending',
    sequence: 5,
    coordinates: { lat: -43.548, lng: 172.638 },
  },
];

/** The status colour of a stop. */
export function statusColor(status: StopStatus, theme: Theme): string {
  switch (status) {
    case 'delivered':
      return theme.colors.statusDelivered;
    case 'active':
      return theme.colors.statusActive;
    case 'failed':
      return theme.colors.statusFailed;
    case 'skipped':
      return theme.colors.statusSkipped;
    case 'pending':
    default:
      return theme.colors.statusPending;
  }
}

/**
 * The colour of the number on a stop marker.
 *
 * The disc is filled with the status colour, so the number has to read on
 * it. The day theme uses the white label on every status colour (the grey
 * 6.03:1, the blue 6.67:1, the green 5.88:1, the red 6.57:1 and the amber
 * 5.93:1), and the night and the high-contrast themes have light status
 * colours, so they all take the dark label (8.13:1 and above).
 */
export function markerLabelColor(status: StopStatus, theme: Theme): string {
  if (theme.name === 'day') {
    return theme.colors.textInverse;
  }
  return theme.colors.background;
}

/** Whether a stop is inside the part of the map the courier can see. */
export function isInsideBounds(stop: Stop, bounds: LngLatBounds): boolean {
  const [west, south, east, north] = bounds;
  return (
    stop.coordinates.lng >= west &&
    stop.coordinates.lng <= east &&
    stop.coordinates.lat >= south &&
    stop.coordinates.lat <= north
  );
}

/**
 * The stops the map draws.
 *
 * The active stop is always on the map, the rest are the stops inside the
 * current view, up to the marker cap.
 */
export function stopsForMap(stops: Stop[], bounds: LngLatBounds | null): Stop[] {
  const active = stops.find((stop) => stop.status === 'active');
  const inView = bounds ? stops.filter((stop) => isInsideBounds(stop, bounds)) : stops;
  const others = inView.filter((stop) => stop !== active);
  const ordered = active ? [active, ...others] : others;
  return ordered.slice(0, MAX_MAP_MARKERS);
}

/**
 * The box the day's stops sit in.
 *
 * It is how the app works out whether the courier is in a town: a town is
 * where the deliveries are. It is null when there are no stops at all.
 */
export function stopsBounds(stops: Stop[]): {
  west: number;
  south: number;
  east: number;
  north: number;
} | null {
  if (stops.length === 0) {
    return null;
  }

  let west = Number.POSITIVE_INFINITY;
  let south = Number.POSITIVE_INFINITY;
  let east = Number.NEGATIVE_INFINITY;
  let north = Number.NEGATIVE_INFINITY;

  for (const stop of stops) {
    west = Math.min(west, stop.coordinates.lng);
    east = Math.max(east, stop.coordinates.lng);
    south = Math.min(south, stop.coordinates.lat);
    north = Math.max(north, stop.coordinates.lat);
  }

  return { west, south, east, north };
}
