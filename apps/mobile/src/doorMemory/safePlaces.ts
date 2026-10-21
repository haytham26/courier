/**
 * The places a parcel can be left where it is safe.
 *
 * The courier picks one of these instead of typing it, so the note on the
 * next stop at that address reads the same way every time.
 */
export const SAFE_PLACES = [
  'porch',
  'letterbox',
  'under the mat',
  'on the porch',
  'side gate',
  'back door',
  'reception',
  'neighbour',
  'shed',
  'safe place',
] as const;

export type SafePlace = (typeof SAFE_PLACES)[number];

/** True when the value is one of the safe places. */
export function isSafePlace(value: unknown): value is SafePlace {
  return typeof value === 'string' && (SAFE_PLACES as readonly string[]).includes(value);
}

/** The safe place as the courier reads it: "Under the mat". */
export function safePlaceLabel(place: string | null): string | null {
  if (place === null || place.trim() === '') {
    return null;
  }
  const known = SAFE_PLACES.find((entry) => entry === place.trim().toLowerCase());
  if (known !== undefined) {
    return known.charAt(0).toUpperCase() + known.slice(1);
  }
  const trimmed = place.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
