/**
 * Which driver is signed in.
 *
 * The map mode and the map settings are remembered **per driver**, so the
 * app has to know who is driving. A shared van phone can carry more than one
 * driver, and the driver who had the 3D map on is not the driver who has it
 * now.
 *
 * The session lives in the auth provider, which needs the auth client and
 * its native modules. The map screen must not pull all of that in, so the
 * session is published here instead: the auth provider writes the driver id
 * down, and whoever needs it reads it from here.
 */

import { useSyncExternalStore } from 'react';

import { errorMessage } from '@/lib/errors';

/** The driver id used when nobody is signed in. */
export const LOCAL_DRIVER_ID = 'local-driver';

let currentDriverId: string | null = null;
const listeners = new Set<() => void>();

/** The id of the driver who is signed in, or null when nobody is. */
export function getCurrentDriverId(): string | null {
  return currentDriverId;
}

/**
 * Records the driver who is signed in.
 *
 * A listener that throws does not stop the others: one broken screen must
 * not take the session down.
 */
export function setCurrentDriverId(driverId: string | null): void {
  if (currentDriverId === driverId) {
    return;
  }
  currentDriverId = driverId;
  for (const listener of listeners) {
    try {
      listener();
    } catch (error) {
      console.warn(`sync: a listener of the session failed: ${errorMessage(error)}`);
    }
  }
}

/** Listens to the session; the function it returns stops the listening. */
export function subscribeToDriver(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * The id of the driver who is signed in, or the local one.
 *
 * The local id is used when nobody is signed in: the map still works, and
 * the settings then belong to the phone itself.
 */
export function useDriverId(): string {
  const driverId = useSyncExternalStore(subscribeToDriver, getCurrentDriverId, getCurrentDriverId);
  return driverId ?? LOCAL_DRIVER_ID;
}
