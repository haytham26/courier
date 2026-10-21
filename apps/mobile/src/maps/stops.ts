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
 * The disc is filled with the status colour, so the number has to read on it.
 * The day theme needs two label colours: the mid grey of a pending stop takes
 * the light label (4.8:1) and the blue of the active stop takes it too
 * (4.7:1), while the green (4.7:1), the red (4.7:1) and the amber (8.3:1)
 * take the dark one. The night and the high-contrast themes have light status
 * colours, so they all take the dark label (7.2:1 and above).
 */
export function markerLabelColor(status: StopStatus, theme: Theme): string {
  if (theme.name === 'day') {
    return status === 'pending' || status === 'active'
      ? theme.colors.textInverse
      : theme.colors.textPrimary;
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
