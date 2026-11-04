/**
 * The navigation hand-off: the drive's own way out to a nav app (queue 4.1).
 *
 * A courier driving the run needs turn-by-turn, and the app's own map is not
 * a nav engine: the honest answer is to hand the stop to the app the courier
 * already has (Google Maps on Android, the walk/drive URL on iOS) with a free
 * deep link - no API key, no billing, no entitlement (the trial's rule).
 *
 * The destination is the run's own stop, so the deep link is built from the
 * stop the run holds. A stop with no coordinates has nowhere to hand to, and
 * the hand-off says so rather than sending the app to 0,0.
 */
import * as Linking from 'expo-linking';

/** Where the courier is handed to, and how the stop names itself there. */
export interface NavDestination {
  /** The stop's coordinates, as the run holds them. */
  lat: number;
  lng: number;
  /** The stop's address, for the label the nav app shows. */
  label: string;
}

/**
 * The deep link that hands the stop to the nav app.
 *
 * `api=1` is Google's own documented, key-free direction URL: the app opens it
 * on any device, and the courier's installed nav app answers it.
 */
export function navDeepLink(destination: NavDestination): string {
  const query = encodeURIComponent(destination.label);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&query=${query}`;
}

/** What the hand-off answered, so the drive can say it. */
export type NavHandoff =
  | { status: 'handed' }
  | { status: 'nowhere' }
  | { status: 'failed'; message: string };

/**
 * Hands the stop to the nav app, and answers what happened.
 *
 * A stop with no coordinates is not handed anywhere; a phone with nothing to
 * receive the link is told the link could not be opened, rather than being
 * shown a silence.
 */
export async function handOffToNavApp(destination: NavDestination | null): Promise<NavHandoff> {
  if (destination === null || !Number.isFinite(destination.lat) || !Number.isFinite(destination.lng)) {
    return { status: 'nowhere' };
  }
  try {
    await Linking.openURL(navDeepLink(destination));
    return { status: 'handed' };
  } catch (error) {
    return { status: 'failed', message: error instanceof Error ? error.message : String(error) };
  }
}
