/**
 * The run store: the one fact the phone answers with.
 *
 * The audit's A1 finds 2.2 names it exactly - "read `GET /runs/{run_id}` and
 * `GET /shifts/{shift_id}/stops` through one run store, one fact, not three
 * caches". This module is that store. It:
 *
 *   1. **seeds the day when nothing is on the phone** (`POST /demo/runs`);
 *   2. **reads the run and its stops** through the app's one HTTP boundary;
 *   3. **caches what it read** in op-sqlite, so the phone answers the same way
 *      offline (the cache) and online (a refresh);
 *   4. **records every delivery mark** into the local event log, so the outbox
 *      can send it later - this store's write path is the only one.
 *
 * **The seed reason.** The backend keeps three days apart - `e2e` (the CI
 * job's), `demo` (a founder's phone), `dev` (a developer's local run) - and
 * the store asks for the one this build is: the CI E2E APK is the only build
 * with `EXPO_PUBLIC_E2E=1` (the flag the design lab, the compatibility screen
 * and the mock auth reader are gated by), so it seeds `e2e`; every other
 * build, local development included, seeds `dev`. `demo` is deliberately not
 * chosen by a build flag: it is the founder's demo phone, wired when that
 * build exists, so no development phone can overwrite the day a demo shows.
 *
 * **Why the marks are two facts and not one.** A mark is written into the
 * event log (the delivery the server must learn) and into the run cache (the
 * mark the courier sees). The log is append-only and server-bound: it has no
 * way to say "that delivery did not happen" - ADR-014's correction is a new
 * event with a new id, and the contract has no kind for a taken-back mark -
 * while the mark the courier sees can be taken back. The undo therefore takes
 * the mark off the run and the event back out of the log while the server has
 * not stored it; a stored delivery cannot be unsent by the phone, by design.
 *
 * **Why a driver swap starts clean.** The run cache holds the day and the
 * marks on close, so the next courier on one phone never sees another
 * courier's day. The event log is untouched by a close: the deliveries the
 * courier made are the record, and losing them is the one outcome that is
 * worse than sending them later.
 */
import type { EventLog } from '@/sync/eventLog';

import type {
  ApiFailure,
  DeliveredMark,
  MarkStore,
  RunApi,
  RunCache,
  RunLoad,
  RunSnapshot,
  SeedReason,
} from './types';

export interface RunStoreDeps {
  /** The app's one HTTP boundary to the API. */
  client: RunApi;
  /** What the phone keeps of the day. */
  cache: RunCache;
  /** The event log the courier's deliveries are recorded in. */
  events: EventLog;
  /** The reason this build seeds the day with. */
  reason: SeedReason;
  /** The connections the construction site holds, released when the run ends. */
  release?: () => Promise<void>;
  /** The clock, for the moment of a delivery. The phone's, by default. */
  clock?: () => number;
}

/** The reason this build seeds the day with: the CI E2E job's, or a developer's. */
export function seedReasonForBuild(e2eFlag: string | undefined): SeedReason {
  return e2eFlag === '1' ? 'e2e' : 'dev';
}

export class RunStore implements MarkStore {
  private readonly cache: RunCache;

  private readonly events: EventLog;

  private readonly client: RunApi;

  private readonly reason: SeedReason;

  private readonly release: (() => Promise<void>) | undefined;

  private readonly clock: () => number;

  constructor(deps: RunStoreDeps) {
    this.client = deps.client;
    this.cache = deps.cache;
    this.events = deps.events;
    this.reason = deps.reason;
    this.release = deps.release;
    this.clock = deps.clock ?? (() => Date.now());
  }

  /**
   * The day the courier works: the cache answers first, so the phone has an
   * answer before the network does, and the network is only asked for what
   * the phone does not have (the first launch, when it seeds).
   */
  async load(): Promise<RunLoad> {
    const cached = await this.cache.read();
    if (cached !== null) {
      return { status: 'ok', source: 'cache', snapshot: cached };
    }
    return this.readThrough(cached);
  }

  /** The day the courier works, fresh: the network is always asked. */
  async refresh(): Promise<RunLoad> {
    return this.readThrough(await this.cache.read());
  }

  /**
   * Records the delivery the courier just made: the event the outbox will
   * send, and the mark the run carries. The same stop marked twice keeps one
   * of each, so a reflex press is not two deliveries.
   */
  async markDelivered(stop: { id: string; sequence: number }): Promise<void> {
    const already = await this.cache.markOf(stop.id);
    if (already !== null) {
      return;
    }
    const at = this.clock();
    const eventId = `delivered-${stop.id}-${String(at)}`;
    await this.events.record({
      id: eventId,
      stopId: stop.id,
      kind: 'delivered',
      occurredAt: new Date(at).toISOString(),
    });
    await this.cache.markDelivered({ stopId: stop.id, sequence: stop.sequence, at, eventId });
  }

  /** Takes the stop back: the mark leaves the run, and the event leaves with it. */
  async undoDelivered(stopId: string): Promise<void> {
    const mark = await this.cache.markOf(stopId);
    if (mark === null) {
      return;
    }
    await this.cache.undoDelivered(stopId);
    await this.events.forget(mark.eventId);
  }

  /** The marks this run carries, in delivery order. */
  async deliveredMarks(): Promise<DeliveredMark[]> {
    return this.cache.deliveredMarks();
  }

  /**
   * The run is over: the day leaves the phone so the next courier starts
   * clean, and the connections the construction site held are released.
   */
  async close(): Promise<void> {
    await this.cache.clear();
    await this.cache.close();
    if (this.release !== undefined) {
      await this.release();
    }
  }

  /** Reads the day through the network, and caches what it read. */
  private async readThrough(cached: RunSnapshot | null): Promise<RunLoad> {
    let runId = cached?.run.id;
    let shiftId = cached?.run.shift_id;
    if (runId === undefined || shiftId === undefined) {
      const seeded = await this.client.seedDemoRun(this.reason);
      if (seeded.status !== 'ok') {
        return answerFailure(seeded, cached);
      }
      runId = seeded.data.run_id;
      shiftId = seeded.data.shift_id;
    }

    const run = await this.client.getRun(runId);
    if (run.status !== 'ok') {
      return answerFailure(run, cached);
    }
    const stops = await this.client.getStops(shiftId);
    if (stops.status !== 'ok') {
      return answerFailure(stops, cached);
    }

    const snapshot: RunSnapshot = { run: run.data, stops: stops.data };
    await this.cache.write(snapshot);
    return { status: 'ok', source: 'network', snapshot };
  }
}

/** What the store answers a failure with: the failure, and whatever day it holds. */
function answerFailure(failure: ApiFailure, snapshot: RunSnapshot | null): RunLoad {
  if (failure.status === 'unauthorized') {
    return { status: 'unauthorized', snapshot };
  }
  if (failure.status === 'offline') {
    return { status: 'offline', snapshot };
  }
  return { status: 'server', message: failure.message, snapshot };
}
