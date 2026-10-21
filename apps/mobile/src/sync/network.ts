/**
 * Whether the phone has a network right now.
 *
 * The app never blocks on this: it only uses the answer to decide when to
 * try the queue again.
 */
import { addNetworkStateListener, getNetworkStateAsync } from 'expo-network';

export interface NetworkMonitor {
  /** True when the phone can reach the internet. */
  isOnline(): Promise<boolean>;
  /** Calls the listener whenever the network changes; returns the unsubscribe. */
  subscribe(listener: (online: boolean) => void): () => void;
}

function isUsable(state: { isConnected?: boolean | null; isInternetReachable?: boolean | null }): boolean {
  if (state.isConnected !== true) {
    return false;
  }
  return state.isInternetReachable !== false;
}

export class ExpoNetworkMonitor implements NetworkMonitor {
  async isOnline(): Promise<boolean> {
    try {
      return isUsable(await getNetworkStateAsync());
    } catch {
      return false;
    }
  }

  subscribe(listener: (online: boolean) => void): () => void {
    const subscription = addNetworkStateListener((state) => {
      listener(isUsable(state));
    });
    return () => subscription.remove();
  }
}

/** The monitor the tests use: the test says when the network is up. */
export class FixedNetworkMonitor implements NetworkMonitor {
  private online: boolean;
  private readonly listeners = new Set<(online: boolean) => void>();

  constructor(online = true) {
    this.online = online;
  }

  async isOnline(): Promise<boolean> {
    return this.online;
  }

  /** Whether the network is up right now (without waiting for a promise). */
  current(): boolean {
    return this.online;
  }

  subscribe(listener: (online: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Turns the network on or off and tells the listeners. */
  setOnline(online: boolean): void {
    this.online = online;
    for (const listener of this.listeners) {
      listener(online);
    }
  }
}
