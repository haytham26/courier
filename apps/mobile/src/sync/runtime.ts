/**
 * The one event log, the one sync service and the one store the app uses.
 *
 * They are created the first time something asks for them, so a test can put
 * its own in place before the app wakes up.
 */
import { getApiClient } from '@/api/client';
import { EventLog } from './eventLog';
import { FileKeyValueStore } from './fileStore';
import { ExpoNetworkMonitor } from './network';
import { SyncService } from './syncService';
import type { KeyValueStore } from './storage';
import { HttpSyncTransport } from './transport';

let store: KeyValueStore | null = null;
let syncService: SyncService | null = null;

/** The place the app keeps what it has to remember between the screens. */
export function getAppStore(): KeyValueStore {
  if (store === null) {
    store = new FileKeyValueStore();
  }
  return store;
}

/** The queue of actions that still have to reach the server. */
export function getSyncService(): SyncService {
  if (syncService === null) {
    syncService = new SyncService(
      new EventLog(getAppStore()),
      new HttpSyncTransport(getApiClient),
      new ExpoNetworkMonitor(),
    );
  }
  return syncService;
}

/** Test seam: puts another sync service (or store) in place. */
export function setSyncService(next: SyncService | null): void {
  syncService = next;
}

/** Test seam: puts another store in place. */
export function setAppStore(next: KeyValueStore | null): void {
  store = next;
}
