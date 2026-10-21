/**
 * What the app knows about the courier while they drive.
 *
 * The auto map mode needs two facts: is the courier moving, and are they in a
 * town. Both are worked out here, in plain functions, so the rule can be
 * tested without a phone and without a GPS.
 */

/** The speed at which the courier counts as moving, in metres a second. */
export const MOVING_SPEED_MPS = 2.5;

/** A place on the map. */
export interface MapPosition {
  lat: number;
  lng: number;
}

/** The box the day's stops sit in. */
export interface PositionBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

/**
 * Whether the courier is moving.
 *
 * A speed of zero is a courier at the door, so the map stays flat. A speed
 * the phone cannot work out is treated as standing still, because a flat map
 * is the safe answer.
 */
export function isMoving(speedMps: number | null): boolean {
  if (speedMps === null || !Number.isFinite(speedMps)) {
    return false;
  }
  return speedMps >= MOVING_SPEED_MPS;
}

/**
 * Whether the courier is in a town.
 *
 * A town is where the deliveries are: the courier is in a town when they are
 * inside the box the day's stops sit in. On a rural road, with no stop
 * nearby, the map stays flat.
 */
export function isInTown(position: MapPosition | null, bounds: PositionBounds | null): boolean {
  if (!position || !bounds) {
    return false;
  }
  return (
    position.lng >= bounds.west &&
    position.lng <= bounds.east &&
    position.lat >= bounds.south &&
    position.lat <= bounds.north
  );
}
