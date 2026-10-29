/**
 * The run store's contract: the day the phone answers with, and the seams the
 * store takes its answers through.
 *
 * One store answers every reader, so the phone has one fact and not three
 * caches. The seams are interfaces, not modules: the API client of slice 1,
 * the op-sqlite cache and the event log are injected, which is what lets the
 * store's own contract be proven with a fake API and a fake cache while the
 * phone runs the real ones.
 */
import type { RunResponse, StopResponse } from '@courier/shared/src/generated/api';

import type { ApiOutcome } from '@/lib/api-client';

/** Why a day was seeded: the three days the backend keeps apart. */
export type SeedReason = 'e2e' | 'demo' | 'dev';

/** One day on the phone: the run and its stops, in the contract's own words. */
export interface RunSnapshot {
  run: RunResponse;
  stops: StopResponse[];
}

/** Every answer the API can give that is not its own 200. */
export type ApiFailure = Exclude<ApiOutcome<unknown>, { status: 'ok' }>;

/**
 * What loading the run answered with.
 *
 * Every arm carries the day the phone holds, which is null only on a first
 * launch with no network: a reader then tells the courier there is no day yet
 * instead of showing an empty one.
 */
export type RunLoad =
  | { status: 'ok'; source: 'network' | 'cache'; snapshot: RunSnapshot }
  | { status: 'unauthorized'; snapshot: RunSnapshot | null }
  | { status: 'offline'; snapshot: RunSnapshot | null }
  | { status: 'server'; message: string; snapshot: RunSnapshot | null };

/** The three API calls the store makes, as the slice-1 client spells them. */
export interface RunApi {
  seedDemoRun(reason?: SeedReason): Promise<ApiOutcome<{ run_id: string; shift_id: string }>>;
  getRun(runId: string): Promise<ApiOutcome<RunResponse>>;
  getStops(shiftId: string): Promise<ApiOutcome<StopResponse[]>>;
}

/** One stop the run has marked delivered: what the courier sees, and why. */
export interface DeliveredMark {
  stopId: string;
  sequence: number;
  /** The moment of the delivery, as the epoch milliseconds the clock read. */
  at: number;
  /** The delivery event this mark wrote into the log (the outbox's row). */
  eventId: string;
}

/** What the phone keeps of the day when the API is not there. */
export interface RunCache {
  read(): Promise<RunSnapshot | null>;
  write(snapshot: RunSnapshot): Promise<void>;
  markDelivered(mark: DeliveredMark): Promise<void>;
  undoDelivered(stopId: string): Promise<void>;
  markOf(stopId: string): Promise<DeliveredMark | null>;
  deliveredMarks(): Promise<DeliveredMark[]>;
  /** The run is over: the day leaves the phone, so the next courier starts clean. */
  clear(): Promise<void>;
  close(): Promise<void>;
}

/**
 * The marks of a run: the store's own surface for a courier working one day.
 *
 * The run state above the screens writes through this and nothing else, so a
 * cold start or a driver swap no longer loses a mark (BUG-069).
 */
export interface MarkStore {
  /** Records the delivery the courier just made, and the mark the run carries. */
  markDelivered(stop: { id: string; sequence: number }): Promise<void>;
  /** Takes a stop back: the mark leaves the run, the unsent event with it. */
  undoDelivered(stopId: string): Promise<void>;
  /** The marks this run carries, in delivery order. */
  deliveredMarks(): Promise<DeliveredMark[]>;
  /** The run is over: the marks leave the phone. */
  close(): Promise<void>;
}
