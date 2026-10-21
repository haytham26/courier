/**
 * Whether the device has a network.
 *
 * The satellite mode is online only, so the app has to know. The answer is
 * never allowed to take the screen down: a device that will not say is
 * treated as offline, which is the safe answer for a mode that needs a
 * network.
 */
import * as Network from 'expo-network';

import { errorMessage } from '@/lib/errors';

/**
 * Whether the device is online.
 *
 * A device that is connected but cannot reach the internet counts as
 * offline: the satellite imagery would not load anyway.
 */
export async function isOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    if (state.isConnected !== true) {
      return false;
    }
    return state.isInternetReachable !== false;
  } catch (error) {
    console.warn(`maps: the network state could not be read: ${errorMessage(error)}`);
    return false;
  }
}
