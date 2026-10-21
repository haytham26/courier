/**
 * The earnings service the app uses.
 *
 * The service is created the first time something asks for it, so a test can
 * put its own in place before the app wakes up.
 */
import { getApiClient } from '@/api/client';
import { getAppStore } from '@/sync/runtime';
import { ApiEarningsService, type EarningsService } from './earningsService';

let service: EarningsService | null = null;

export function getEarningsService(): EarningsService {
  if (service === null) {
    service = new ApiEarningsService(getApiClient(), getAppStore());
  }
  return service;
}

/** Test seam: puts another earnings service in place. */
export function setEarningsService(next: EarningsService | null): void {
  service = next;
}
