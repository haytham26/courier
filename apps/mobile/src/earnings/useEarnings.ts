/**
 * The earnings of the shift, on the screen that shows them.
 *
 * The screen never waits for the network: it shows the last value it had
 * with a note that says it is not up to date.
 */
import { useCallback, useEffect, useState } from 'react';

import type { LoadStatus } from '@/hooks/loadStatus';
import type { EarningsService } from './earningsService';
import { getEarningsService } from './runtime';
import type { Earnings, EarningsResult } from './types';

const EMPTY: EarningsResult<Earnings> = {
  value: null,
  isStale: false,
  updatedAt: null,
  error: null,
};

export interface UseEarnings {
  status: LoadStatus;
  earnings: Earnings | null;
  /** The number is the last one the app saw, not a fresh one. */
  isStale: boolean;
  updatedAt: string | null;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useEarnings(
  shiftId: string | null,
  service: EarningsService = getEarningsService(),
): UseEarnings {
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [result, setResult] = useState<EarningsResult<Earnings>>(EMPTY);

  const refresh = useCallback(async () => {
    if (shiftId === null) {
      setStatus('ready');
      setResult(EMPTY);
      return;
    }
    setStatus('loading');
    const next = await service.get(shiftId);
    setResult(next);
    setStatus(next.error !== null && next.value === null ? 'error' : 'ready');
  }, [service, shiftId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    status,
    earnings: result.value,
    isStale: result.isStale,
    updatedAt: result.updatedAt,
    error: result.error,
    refresh,
  };
}
