/**
 * The marks of a run kept in memory.
 *
 * This is the fallback the run state above the screens mounts when no store
 * is handed to it: a provider rendered in a test, or a build where op-sqlite
 * cannot be opened (a web target, a device without the encrypted database).
 * It is the behaviour the app had before the store existed - a mark lives as
 * long as the session - so a phone that cannot persist falls back to exactly
 * what it had, and no other module has to handle a store that is not there.
 */
import type { DeliveredMark, MarkStore } from './types';

export function inMemoryMarkStore(): MarkStore {
  const marks: DeliveredMark[] = [];
  return {
    markDelivered(stop) {
      const at = Date.now();
      marks.push({
        stopId: stop.id,
        sequence: stop.sequence,
        at,
        eventId: `delivered-${stop.id}-${String(at)}`,
      });
      return Promise.resolve();
    },
    undoDelivered(stopId) {
      const index = marks.findIndex((mark) => mark.stopId === stopId);
      if (index >= 0) {
        marks.splice(index, 1);
      }
      return Promise.resolve();
    },
    deliveredMarks() {
      return Promise.resolve([...marks]);
    },
    close() {
      marks.length = 0;
      return Promise.resolve();
    },
  };
}
