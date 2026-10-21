/**
 * The door memory service.
 *
 * Reading is a plain call to the server. Writing is a plain call to the
 * server too, but when the phone has no network the note goes into the event
 * log instead and the courier carries on: the queue sends it later.
 */
import { HttpError, NetworkError, type HttpClient } from '@/api/httpClient';
import { createAddLocationNoteEvent, type AddLocationNotePayload } from '@/sync/events';
import type { SyncService } from '@/sync/syncService';
import type {
  DoorMemory,
  DoorMemoryResponse,
  DoorMemoryState,
  SaveDoorMemoryInput,
} from './types';

/** What the app asks of the door memory. */
export interface DoorMemoryService {
  /** What the courier remembers about this stop. */
  get(stopId: string): Promise<DoorMemoryState>;
  /** Saves what the courier remembers about this stop. */
  save(stopId: string, input: SaveDoorMemoryInput): Promise<DoorMemoryState>;
}

function reasonFor(error: unknown): string {
  if (error instanceof HttpError) {
    return error.message;
  }
  if (error instanceof NetworkError) {
    return error.message;
  }
  return 'The note did not save. Try again.';
}

export class ApiDoorMemoryService implements DoorMemoryService {
  private readonly http: HttpClient;
  private readonly sync: SyncService;
  /** The last memory the app saw for a stop (the offline fallback). */
  private readonly cache = new Map<string, DoorMemory>();

  constructor(http: HttpClient, sync: SyncService) {
    this.http = http;
    this.sync = sync;
  }

  async get(stopId: string): Promise<DoorMemoryState> {
    const queued = await this.queuedNote(stopId);

    try {
      const response = await this.http.get<DoorMemoryResponse>(
        `/stops/${encodeURIComponent(stopId)}/door-memory`,
      );
      const memory: DoorMemory = {
        address_key: response.address_key,
        note: queued?.note ?? response.note,
        safe_place: queued?.safe_place ?? response.safe_place,
        updated_at: response.updated_at,
      };
      this.cache.set(stopId, memory);
      return { memory, pending: queued !== null, isStale: false, error: null };
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) {
        // Nobody has written a note for this address yet.
        const pending = queued
          ? {
              address_key: null,
              note: queued.note,
              safe_place: queued.safe_place,
              updated_at: null,
            }
          : null;
        if (pending !== null) {
          this.cache.set(stopId, pending);
        }
        return { memory: pending, pending: queued !== null, isStale: false, error: null };
      }

      // The server did not answer: the courier sees the last known memory.
      const last = this.cache.get(stopId) ?? null;
      return {
        memory: last,
        pending: queued !== null,
        isStale: true,
        error: reasonFor(error),
      };
    }
  }

  /**
   * Saves what the courier remembers about this stop.
   *
   * With a network the server takes the note straight away. Without one the
   * note waits in the event log and the courier is told so.
   */
  async save(stopId: string, input: SaveDoorMemoryInput): Promise<DoorMemoryState> {
    try {
      const response = await this.http.post<DoorMemoryResponse>(
        `/stops/${encodeURIComponent(stopId)}/door-memory`,
        { note: input.note, safe_place: input.safePlace },
      );
      const memory: DoorMemory = {
        address_key: response.address_key,
        note: response.note,
        safe_place: response.safe_place,
        updated_at: response.updated_at,
      };
      this.cache.set(stopId, memory);
      return { memory, pending: false, isStale: false, error: null };
    } catch (error) {
      if (error instanceof NetworkError) {
        await this.sync.enqueue(
          createAddLocationNoteEvent({
            stopId,
            note: input.note,
            safePlace: input.safePlace,
          }),
        );
        const memory: DoorMemory = {
          address_key: null,
          note: input.note,
          safe_place: input.safePlace,
          updated_at: null,
        };
        this.cache.set(stopId, memory);
        return { memory, pending: true, isStale: false, error: null };
      }
      return {
        memory: this.cache.get(stopId) ?? null,
        pending: false,
        isStale: false,
        error: reasonFor(error),
      };
    }
  }

  /** The note the phone still has to send for this stop, if there is one. */
  private async queuedNote(stopId: string): Promise<AddLocationNotePayload | null> {
    const events = await this.sync.pendingEvents();
    const match = events.filter((event) => event.payload.stop_id === stopId).pop();
    return match?.payload ?? null;
  }
}
