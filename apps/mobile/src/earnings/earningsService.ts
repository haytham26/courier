/**
 * The earnings service.
 *
 * The server has the money, so the app asks for it. When the phone has no
 * network the app shows the last value it had and says plainly that it is
 * not up to date: a courier can plan on the number from this morning, but
 * must know it is not the number of this afternoon.
 */
import { HttpError, NetworkError, type HttpClient } from '@/api/httpClient';
import type { KeyValueStore } from '@/sync/storage';
import type { Earnings, EarningsResult, EarningsSummary } from './types';

const EARNINGS_KEY = 'earnings.last.v1';
const SUMMARY_KEY = 'earnings.summary.last.v1';

interface Remembered<T> {
  value: T;
  at: string;
}

/** What the app asks of the server about the money. */
export interface EarningsService {
  /** What the courier earned on this shift. */
  get(shiftId: string): Promise<EarningsResult<Earnings>>;
  /** The end-of-day summary of this shift. */
  getSummary(shiftId: string): Promise<EarningsResult<EarningsSummary>>;
}

function reasonFor(error: unknown): string {
  if (error instanceof HttpError) {
    return error.message;
  }
  if (error instanceof NetworkError) {
    return error.message;
  }
  return 'The money did not come through. Try again.';
}

function isEarnings(value: unknown): value is Earnings {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const earnings = value as Partial<Earnings>;
  return typeof earnings.net === 'string' && typeof earnings.currency === 'string';
}

function isSummary(value: unknown): value is EarningsSummary {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const summary = value as Partial<EarningsSummary>;
  return typeof summary.net === 'string' && Array.isArray(summary.failed_stops);
}

export class ApiEarningsService implements EarningsService {
  private readonly http: HttpClient;
  private readonly store: KeyValueStore;

  constructor(http: HttpClient, store: KeyValueStore) {
    this.http = http;
    this.store = store;
  }

  async get(shiftId: string): Promise<EarningsResult<Earnings>> {
    try {
      const value = await this.http.get<Earnings>(
        `/shifts/${encodeURIComponent(shiftId)}/earnings`,
      );
      const at = new Date().toISOString();
      await this.remember(EARNINGS_KEY, { value, at });
      return { value, isStale: false, updatedAt: at, error: null };
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) {
        // The shift has nothing on it yet: that is an empty day, not an error.
        return { value: null, isStale: false, updatedAt: null, error: null };
      }
      const last = await this.lastKnown<Earnings>(EARNINGS_KEY, isEarnings);
      return {
        value: last?.value ?? null,
        isStale: true,
        updatedAt: last?.at ?? null,
        error: reasonFor(error),
      };
    }
  }

  async getSummary(shiftId: string): Promise<EarningsResult<EarningsSummary>> {
    try {
      const value = await this.http.get<EarningsSummary>(
        `/shifts/${encodeURIComponent(shiftId)}/earnings/summary`,
      );
      const at = new Date().toISOString();
      await this.remember(SUMMARY_KEY, { value, at });
      return { value, isStale: false, updatedAt: at, error: null };
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) {
        return { value: null, isStale: false, updatedAt: null, error: null };
      }
      const last = await this.lastKnown<EarningsSummary>(SUMMARY_KEY, isSummary);
      return {
        value: last?.value ?? null,
        isStale: true,
        updatedAt: last?.at ?? null,
        error: reasonFor(error),
      };
    }
  }

  /** Keeps the value the app last saw, so the courier has it while offline. */
  private async remember(key: string, remembered: Remembered<unknown>): Promise<void> {
    try {
      await this.store.set(key, JSON.stringify(remembered));
    } catch {
      // A phone that cannot write the cache still shows the number now.
    }
  }

  private async lastKnown<T>(
    key: string,
    isValid: (value: unknown) => value is T,
  ): Promise<Remembered<T> | null> {
    try {
      const raw = await this.store.get(key);
      if (raw === null) {
        return null;
      }
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) {
        return null;
      }
      const value = (parsed as { value?: unknown }).value;
      const at = (parsed as { at?: unknown }).at;
      if (!isValid(value)) {
        return null;
      }
      return { value, at: typeof at === 'string' ? at : '' };
    } catch {
      return null;
    }
  }
}
