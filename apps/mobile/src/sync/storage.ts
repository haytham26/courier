/**
 * The small key/value store the app keeps on the device.
 *
 * The event log and the current shift both live here, so a courier who closes
 * the app in a dead spot comes back to the same day.
 */

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

/** The store the tests use: it lives for as long as the app does. */
export class MemoryKeyValueStore implements KeyValueStore {
  private readonly values = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.values.delete(key);
  }
}
