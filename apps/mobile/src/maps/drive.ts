/**
 * The drive's numbers, read off the day's run.
 *
 * Plain functions on plain data: the driving screen is a glance surface
 * (docs/design/SPEC.md, the driving priority — the address readable at a
 * glance), so the maths of the run — which stop the drive heads for, how
 * far, what the street is called, whose turn comes after — lives here,
 * where it is tested without a phone. The ground truth is the day's stop
 * list; the origin is the map's home centre; the distance is the honest
 * straight line between them, computed and never invented.
 */
import type { MapPosition } from './driving';
import type { Stop } from './stops';

/** The mean Earth radius, in metres (the haversine constant). */
const EARTH_RADIUS_M = 6371008.8;

const DEGREES = Math.PI / 180;

/**
 * Where the drive starts before the position stream says otherwise: the
 * map's home centre (the map tab's), in decimal degrees. With no fix the
 * numbers still read — a distance from here is the true line to the stop,
 * which is exactly what "never invented" asks for.
 */
export const DRIVE_ORIGIN: MapPosition = { lat: -43.533, lng: 172.636 };

/** The same origin in the map's order ([longitude, latitude] for centre/zoom. */
export const DRIVE_ORIGIN_LNGLAT: [number, number] = [172.636, -43.533];

/** A stop as a position on the map, in the order the maths takes it. */
export function positionOf(stop: Stop): MapPosition {
  return { lat: stop.coordinates.lat, lng: stop.coordinates.lng };
}

/** The great-circle distance between two places, in metres. */
export function haversineMeters(from: MapPosition, to: MapPosition): number {
  const dLat = (to.lat - from.lat) * DEGREES;
  const dLng = (to.lng - from.lng) * DEGREES;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(from.lat * DEGREES) * Math.cos(to.lat * DEGREES) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/**
 * The distance as the screen reads it: whole metres under a kilometre,
 * then kilometres to one decimal. A number the maths cannot give (no fix,
 * no stop) is a dash, never a guess.
 */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) {
    return '—';
  }
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * The street line of an address: the number tokens at the front drop (the
 * plain '45', the unit slash '2/14', the lettered '14A', the range
 * '10-12'), the street keeps. An address with nothing in front of it — or
 * nothing but the number — comes back whole.
 */
export function streetLine(address: string): string {
  const parts = address.trim().split(/\s+/);
  let front = 0;
  while (front < parts.length && /^\d+[a-zA-Z]?([/-]\d+[a-zA-Z]?)?$/.test(parts[front])) {
    front += 1;
  }
  const street = parts.slice(front).join(' ');
  return street || address.trim();
}

/** Whether a stop is still on the run (not delivered, skipped or failed). */
function onRun(stop: Stop, ignoreIds: string[]): boolean {
  return (
    stop.status !== 'delivered' &&
    stop.status !== 'skipped' &&
    stop.status !== 'failed' &&
    !ignoreIds.includes(stop.id)
  );
}

/**
 * The stop the drive heads for: the first one still on the run. The
 * screen's own done list rides in as `ignoreIds`, so the two surfaces (the
 * sheet's actions on Today and the slide here) read the same run (the
 * same-stop contract of the design).
 */
export function activeOf(stops: Stop[], ignoreIds: string[] = []): Stop | null {
  return stops.find((stop) => onRun(stop, ignoreIds)) ?? null;
}

/**
 * The stop after the one the drive is on — the Then strip on the turn
 * card. The run order is the sequence order, the way the day was planned.
 */
export function nextOf(stops: Stop[], afterSequence: number, ignoreIds: string[] = []): Stop | null {
  return stops.find((stop) => stop.sequence > afterSequence && onRun(stop, ignoreIds)) ?? null;
}
