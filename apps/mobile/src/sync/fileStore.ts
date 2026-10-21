/**
 * The store on the device's own disk.
 *
 * The file holds one JSON object of key to value. It is written in one go, so
 * a half-written file can never hold half an event log: a file that cannot be
 * read is treated as an empty store rather than as an error the courier has
 * to deal with mid-shift.
 */
import { File, Paths } from 'expo-file-system';

import type { KeyValueStore } from './storage';

const STORE_FILE = 'courier-store.json';

function isStringRecord(value: unknown): value is Record<string, string> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return Object.values(value).every((entry) => typeof entry === 'string');
}

export class FileKeyValueStore implements KeyValueStore {
  private file: File | null = null;
  private values: Record<string, string> | null = null;

  private storeFile(): File {
    if (this.file === null) {
      this.file = new File(Paths.document, STORE_FILE);
    }
    return this.file;
  }

  private async readAll(): Promise<Record<string, string>> {
    if (this.values !== null) {
      return this.values;
    }
    try {
      const file = this.storeFile();
      if (!file.exists) {
        this.values = {};
        return this.values;
      }
      const parsed: unknown = JSON.parse(await file.text());
      this.values = isStringRecord(parsed) ? parsed : {};
    } catch {
      this.values = {};
    }
    return this.values;
  }

  private async writeAll(values: Record<string, string>): Promise<void> {
    const file = this.storeFile();
    if (!file.exists) {
      file.create({ overwrite: true, intermediates: true });
    }
    await file.write(JSON.stringify(values));
  }

  async get(key: string): Promise<string | null> {
    const values = await this.readAll();
    return values[key] ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    const values = await this.readAll();
    values[key] = value;
    await this.writeAll(values);
  }

  async remove(key: string): Promise<void> {
    const values = await this.readAll();
    delete values[key];
    await this.writeAll(values);
  }
}
