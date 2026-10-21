import { useEffect, useState } from 'react';
import { getSyncService } from './runtime';
import type { SyncService, SyncStatus } from './syncService';

const EMPTY: SyncStatus = { pending: 0, online: true, lastSyncedAt: null };

/**
 * The state of the queue: how many actions are still waiting for a network.
 *
 * The offline chip of the design system shows it (`docs/design/SYSTEM.md` §4).
 */
export function useSyncStatus(service: SyncService = getSyncService()): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    const apply = (next: SyncStatus) => {
      if (!cancelled) {
        setStatus(next);
      }
    };

    void service.status().then(apply);
    const unsubscribe = service.subscribe(apply);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [service]);

  return status;
}
