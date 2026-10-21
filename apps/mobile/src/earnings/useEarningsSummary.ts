/**
 * The end-of-day summary of the shift.
 *
 * The same rule as the earnings: the last value the app had is shown with a
 * note that says it is not up to date.
 */
import { useCallback, useEffect, useState } from 'react';

import type { LoadStatus } from '@/hooks/loadStatus';
import type { EarningsService } from './earningsService';
import { getEarningsService } from './runtime';
import type { EarningsResult, EarningsSummary } from './types';

const EMPTY: EarningsResult<EarningsSummary> = {
  value: null,
  isStale: false,
  updatedAt: null,
  error: null,
};

export interface UseEarningsSummary {
  status: LoadStatus;
  summary: EarningsSummary | null;
  isStale: boolean;
  updatedAt: string | null;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useEarningsSummary(
  shiftId: string | null,
  service: EarningsService = getEarningsService(),
): UseEarningsSummary {
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [result, setResult] = useState<EarningsResult<EarningsSummary>>(EMPTY);

  const refresh = useCallback(async () => {
    if (shiftId === null) {
      setStatus('ready');
      setResult(EMPTY);
      return;
    }
    setStatus('loading');
    const next = await service.getSummary(shiftId);
    setResult(next);
    setStatus(next.error !== null && next.value === null ? 'error' : 'ready');
  }, [service, shiftId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    status,
    summary: result.value,
    isStale: result.isStale,
    updatedAt: result.updatedAt,
    error: result.error,
    refresh,
  };
}
