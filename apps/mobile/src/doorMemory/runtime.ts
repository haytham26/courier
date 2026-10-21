/**
 * The door memory service the app uses.
 *
 * The service is created the first time something asks for it, so a test can
 * put its own in place before the app wakes up.
 */
import { getApiClient } from '@/api/client';
import { getSyncService } from '@/sync/runtime';
import { ApiDoorMemoryService, type DoorMemoryService } from './doorMemoryService';

let service: DoorMemoryService | null = null;

export function getDoorMemoryService(): DoorMemoryService {
  if (service === null) {
    service = new ApiDoorMemoryService(getApiClient(), getSyncService());
  }
  return service;
}

/** Test seam: puts another door memory service in place. */
export function setDoorMemoryService(next: DoorMemoryService | null): void {
  service = next;
}
