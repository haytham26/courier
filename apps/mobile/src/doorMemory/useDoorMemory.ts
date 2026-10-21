/**
 * The door memory of one stop, on the screen that shows it.
 */
import { useCallback, useEffect, useState } from 'react';

import type { LoadStatus } from '@/hooks/loadStatus';
import type { DoorMemoryService } from './doorMemoryService';import { getDoorMemoryService } from './runtime';
import type { DoorMemoryState, SaveDoorMemoryInput } from './types';

const EMPTY: DoorMemoryState = {
  memory: null,
  pending: false,
  isStale: false,
  error: null,
};

export interface UseDoorMemory {
  status: LoadStatus;
  memory: DoorMemoryState['memory'];
  /** The phone holds the note; the server has not taken it yet. */
  pending: boolean;
  /** The server did not answer; this is the last known memory. */
  isStale: boolean;
  error: string | null;
  isSaving: boolean;
  save: (input: SaveDoorMemoryInput) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useDoorMemory(
  stopId: string | null,
  service: DoorMemoryService = getDoorMemoryService(),
): UseDoorMemory {
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [state, setState] = useState<DoorMemoryState>(EMPTY);
  const [isSaving, setIsSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (stopId === null) {
      setStatus('ready');
      setState(EMPTY);
      return;
    }
    setStatus('loading');
    const next = await service.get(stopId);
    setState(next);
    setStatus(next.error !== null && next.memory === null ? 'error' : 'ready');
  }, [service, stopId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (input: SaveDoorMemoryInput) => {
      if (stopId === null) {
        return false;
      }
      setIsSaving(true);
      const next = await service.save(stopId, input);
      setState(next);
      setIsSaving(false);
      setStatus(next.error !== null && next.memory === null ? 'error' : 'ready');
      return next.error === null;
    },
    [service, stopId],
  );

  return {
    status,
    memory: state.memory,
    pending: state.pending,
    isStale: state.isStale,
    error: state.error,
    isSaving,
    save,
    refresh,
  };
}
