/**
 * The kill legs: the app is killed MID-DELIVERY and MID-SYNC, and every event
 * lands exactly once (the founder directive 2026-11-10, item 5).
 *
 * The three kills this suite drives, all on the app's OWN code:
 *
 *   1. KILL MID-DELIVERY — the courier marks stops, the phone dies, and the
 *      phone is started again (a cold start over the SAME database). What the
 *      run held, what the log held and what the outbox owed must all still be
 *      there: the marks, the events and the reasons.
 *   2. KILL MID-SYNC — the server has STORED the batch and dies before it can
 *      answer. The phone read that as "nobody answered", kept the events, and
 *      asks again. The server's own rule is `ON CONFLICT (id) DO NOTHING`, so
 *      the replay stores each event ONCE: no duplicate rows, nothing lost.
 *   3. KILL ON A PARTIAL ACCEPT — the server took half the batch and answered
 *      with that half. The phone confirms exactly what the server took
 *      (BUG-076) and the rest stay pending until the next ask.
 *
 * The phone's storage is the app's own (`OpSqliteRunCache` and
 * `OpSqliteEventStore`) over a stand-in that keeps its rows across a
 * `closeAsync()` — which is what a file on a phone does when the process that
 * held it dies. The wire is a loopback stack that answers the contract's own
 * shape (`src/run/testing/scaleStack.ts`), reached through the app's own
 * `CourierApiClient` with the platform's fetch injected.
 *
 * What is NOT claimed here: the Android process itself (the OS's own kill, and
 * what the device's SQLCipher file does with it), the real API and the real
 * Postgres. The real-stack leg of this claim is the A1 compose stack, and
 * `docs/evidence/scale-tests/README.md` names what it measured.
 */
jest.mock('@op-engineering/op-sqlite', () => {
  const { theDatabaseOf } = require('../testing/scaleSqlite') as typeof import('../testing/scaleSqlite');
  return { open: jest.fn((options: { name: string }) => theDatabaseOf(options.name)) };
});

jest.mock('expo-file-system', () => {
  class TheFile {
    readonly uri: string;

    constructor(
      base: string,
      name: string,
    ) {
      this.uri = `${base}/${name}`;
    }

    create(): void {
      return undefined;
    }

    async write(): Promise<void> {
      return undefined;
    }
  }

  return { File: TheFile, Paths: { cache: 'file:///cache', document: 'file:///files' } };
});

jest.mock('@/lib/auth-client', () => ({
  sessionToken: jest.fn(() => Promise.resolve('kill-token')),
}));

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { CourierApiClient } from '@/lib/api-client';
import { EventLog } from '@/sync/eventLog';
import { OpSqliteEventStore } from '@/sync/opSqliteEventStore';
import { OpSqliteRunCache } from '@/run/opSqliteRunCache';
import { RunStore } from '@/run/runStore';
import { SyncService } from '@/sync/syncService';
import { apiSyncTransport } from '@/sync/apiSyncTransport';
import { reportSyncAnswers } from '@/sync/syncAnswers';
import { ScaleServer, theFetchOf } from '../testing/scaleStack';
import type { ApiOutcome } from '@/lib/api-client';
import type { RunApi, RunSnapshot } from '@/run/types';
import type { StopResponse } from '@courier/shared/src/generated/api';

/** The repository root, from `apps/mobile/src/run/__tests__/`. */
const REPO_ROOT = join(__dirname, '../../../../../');

/** The committed set the kill legs drive. */
const SET = join(REPO_ROOT, 'packages/eval/scale/shifts.jsonl');

/** One seeded full shift, the shape the generator writes. */
interface SeededShift {
  shift_id: string;
  run_id: string;
  name: string;
  depot: { lat: number; lon: number };
  start_at: string;
  break_window: { start: string; end: string; minutes: number };
  finish: { lat: number; lon: number };
  stops: SeededStop[];
  plan: { stop_id: string; seq: number; outcome: { outcome: string; pod?: boolean; reason?: string; utterance?: string } }[];
}

interface SeededStop {
  id: string;
  location_id: string;
  type: 'delivery' | 'pickup';
  address: string;
  seq: number;
  lat: number;
  lon: number;
  priority: boolean;
  parcels: number;
}

function theSet(): SeededShift[] {
  return readFileSync(SET, 'utf8')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as SeededShift);
}

/** The day the API seam answers with: the seeded shift, in the contract's shape. */
function theDayOf(shift: SeededShift): RunSnapshot {
  return {
    run: {
      id: shift.run_id,
      shift_id: shift.shift_id,
      name: shift.name,
      depot: { lat: shift.depot.lat, lon: shift.depot.lon },
      speed_kmh: 40,
      start_at: shift.start_at,
      break_window: { start: shift.break_window.start, end: shift.break_window.end },
      finish: { lat: shift.finish.lat, lon: shift.finish.lon },
    },
    stops: shift.stops.map((stop) => ({
      id: stop.id,
      location_id: stop.location_id,
      type: stop.type,
      address: stop.address,
      seq: stop.seq,
      status: 'pending' as const,
      lat: stop.lat,
      lon: stop.lon,
      priority: stop.priority,
      parcels: stop.parcels,
    })),
  };
}

/** The store's own API seam, answering the seeded shift. */
class TheApi implements RunApi {
  constructor(private readonly shift: SeededShift) {}

  seedDemoRun(): Promise<ApiOutcome<{ run_id: string; shift_id: string }>> {
    return Promise.resolve({ status: 'ok', data: { run_id: this.shift.run_id, shift_id: this.shift.shift_id } });
  }

  getRun(): Promise<ApiOutcome<RunSnapshot['run']>> {
    return Promise.resolve({ status: 'ok', data: theDayOf(this.shift).run });
  }

  getStops(): Promise<ApiOutcome<StopResponse[]>> {
    return Promise.resolve({ status: 'ok', data: theDayOf(this.shift).stops });
  }
}

/** The clock of the deterministic run (§17). */
function theClock(): () => number {
  let at = 1762908000000;
  return () => {
    at += 60_000;
    return at;
  };
}

/**
 * One PHONE: its own run cache, its own event log, its own outbox, over one
 * database name — and the kill that ends its life and the cold start that
 * follows it.
 */
class ThePhone {
  readonly cache: OpSqliteRunCache;

  readonly eventStore: OpSqliteEventStore;

  readonly events: EventLog;

  readonly outbox: SyncService;

  readonly store: RunStore;

  /** How many times this phone has been killed and started again. */
  coldStarts = 0;

  constructor(
    private readonly database: string,
    shift: SeededShift,
    private readonly client: CourierApiClient,
  ) {
    this.cache = OpSqliteRunCache.open(database);
    this.eventStore = OpSqliteEventStore.open(database);
    this.events = new EventLog(this.eventStore);
    this.outbox = new SyncService(this.events, apiSyncTransport(client));
    const events = this.events;
    const outbox = this.outbox;
    this.store = new RunStore({
      client: new TheApi(shift),
      cache: this.cache,
      events,
      reason: 'dev',
      // The construction site's own flush: the store asks the outbox after every
      // mark, and the answers are the courier's.
      flush: async (shiftId: string) => {
        for (const outcome of await outbox.syncAll(shiftId)) {
          reportSyncAnswers(outcome);
        }
      },
      clock: theClock(),
    });
  }

  async load(): Promise<void> {
    const loaded = await this.store.load();
    if (loaded.status !== 'ok') {
      throw new Error(`the day did not load after ${String(this.coldStarts)} cold starts (${loaded.status})`);
    }
  }

  /** The run is over: the phone closes its handles. The FILE is not deleted. */
  async close(): Promise<void> {
    await this.store.close();
    await this.eventStore.close();
  }

  /**
   * The app is killed: the process is gone, so nothing is flushed, nothing is
   * confirmed and — the point of the whole leg — NOTHING IS CLEARED. A kill is
   * not a close: `RunStore.close()` takes the day off the phone so the next
   * courier starts clean, and a process that died never got to run it. The
   * database file on the phone is exactly what it was.
   */
  async kill(): Promise<void> {
    this.coldStarts += 0;
    return Promise.resolve();
  }

  /** A cold start: the same file, new instances, the same day still on it. */
  async coldStart(shift: SeededShift): Promise<ThePhone> {
    this.coldStarts += 1;
    const phone = new ThePhone(this.database, shift, this.client);
    await phone.load();
    return phone;
  }
}

/** What one kill leg measured. */
interface KillTrace {
  shift_id: string;
  kills: number;
  stops: number;
  delivered: number;
  failed: number;
  marks_after: number;
  events_after: number;
  events_pending: number;
  server_stored: number;
  server_sent: number;
  duplicates: number;
  lost: number;
  reasons_sent: number;
  problems: string[];
}

describe('the kill legs: an app killed mid-delivery and mid-sync loses nothing (directive item 5)', () => {
  const shifts = theSet();
  /** One loopback stack per leg, so no leg counts another leg's rows. */
  const stacks: ScaleServer[] = [];

  afterAll(async () => {
    for (const stack of stacks) {
      await stack.stop();
    }
  });

  /** A fresh stack, and the app's own client speaking to it. */
  async function aStack(): Promise<{ server: ScaleServer; client: CourierApiClient }> {
    const server = new ScaleServer();
    stacks.push(server);
    const baseUrl = await server.start();
    const client = new CourierApiClient({
      baseUrl,
      getToken: () => Promise.resolve('kill-token'),
      fetchImpl: theFetchOf(baseUrl) as unknown as typeof fetch,
    });
    return { server, client };
  }

  it('a kill mid-delivery leaves every mark, every event and every reason on the phone', async () => {
    // Twenty seeded shifts, each killed twice mid-delivery at a seeded position,
    // and each cold-started to finish its day.
    const stack = await aStack();
    const driven = shifts.slice(0, 20);
    const traces: KillTrace[] = [];
    for (const [index, shift] of driven.entries()) {
      traces.push(await driveAKilledShift(shift, 3, 3 + index, stack.server, stack.client));
    }
    for (const trace of traces) {
      expect(trace.problems).toEqual([]);
    }
    const totals = theTotals(traces);
    expect(totals.kills).toBe(40);
    expect(totals.lost).toBe(0);
    expect(totals.duplicates).toBe(0);
    expect(totals.marks_after).toBe(totals.delivered + totals.failed);
    expect(totals.events_pending).toBe(0);
  }, 1_200_000);

  it('a kill mid-sync lands every event exactly once, and the replay is not a second delivery', async () => {
    // One shift, one batch, one kill between the server's store and its answer,
    // then a cold start that asks again: the server's own rule keeps one row
    // per event id, so the replay is a no-op and the phone's log is confirmed.
    const shift = shifts[0];
    const problems: string[] = [];
    const stack = await aStack();
    const phone = new ThePhone('kill-sync.db', shift, stack.client);
    await phone.load();
    const day = await phone.cache.read();
    if (day === null) {
      throw new Error('the day is not on the phone');
    }
    // The kill happens where a courier would lose it: the mark is made, the
    // outbox asks the server, and the server STORES the batch and dies before
    // it can answer. Every mark after it rides the same dead connection.
    stack.server.setMode('die-before-answer');
    const stop = day.stops[0];
    await phone.store.markDelivered({ id: stop.id, sequence: stop.seq ?? 0 });
    const failedStop = day.stops[1];
    await phone.store.markFailed(
      { id: failedStop.id, sequence: failedStop.seq ?? 0 },
      { reason: 'no one home', utterance: 'no one home at the door' },
    );
    stack.server.setMode('answer');

    const storedBefore = stack.server.record().stored.length;
    const sentBefore = stack.server.record().sent.length;
    expect(storedBefore).toBe(2);
    // The outbox asked more than once for what the server never confirmed: its
    // own retry bound (BUG-093), not a second delivery.
    expect(sentBefore).toBeGreaterThanOrEqual(2);
    // The phone still holds both events: it read the death as "nobody answered",
    // which is the outbox’s own answer and never a taken-back delivery.
    expect(await phone.events.pendingCount()).toBe(2);

    // The app is killed and started again, and the outbox asks once more.
    await phone.kill();
    const restarted = await new ThePhone('kill-sync.db', shift, stack.client).coldStart(shift);
    restarted.outbox; // the outbox is the restarted phone's own
    await restarted.outbox.syncAll(shift.shift_id);

    const record = stack.server.record();
    const storedIds = record.stored.map((event) => event.id);
    expect(new Set(storedIds).size).toBe(storedIds.length);
    expect(record.stored.length).toBe(2);
    // The reason rode the failed event on the replay, which is what the API
    // demands (a failed event without one refuses the whole batch).
    const failedRow = record.stored.find((event) => event.kind === 'failed');
    expect(failedRow?.reason).toBe('no one home');
    expect(await restarted.events.pendingCount()).toBe(0);
    expect(await restarted.store.deliveredMarks()).toHaveLength(2);

    const marks = await restarted.store.deliveredMarks();
    for (const mark of marks) {
      if (!storedIds.includes(mark.eventId)) {
        problems.push(`the mark of ${mark.stopId} has no event on the server`);
      }
    }
    expect(problems).toEqual([]);
    await restarted.close();
  }, 600_000);

  it('a partial accept confirms only what the server took, and the rest send exactly once', async () => {
    const shift = shifts[1];
    const stack = await aStack();
    const phone = new ThePhone('kill-partial.db', shift, stack.client);
    await phone.load();
    const day = await phone.cache.read();
    if (day === null) {
      throw new Error('the day is not on the phone');
    }
    // The four marks are made while the server stores and never answers, so
    // the phone owes all four when it comes back.
    stack.server.setMode('die-before-answer');
    for (const stop of day.stops.slice(0, 4)) {
      await phone.store.markDelivered({ id: stop.id, sequence: stop.seq ?? 0 });
    }
    expect(await phone.events.pendingCount()).toBe(4);

    // The app is killed and started again, and the server takes only half the
    // replay (BUG-076: a partial accept must not confirm the whole batch).
    await phone.kill();
    const restarted = await new ThePhone('kill-partial.db', shift, stack.client).coldStart(shift);
    stack.server.setMode('partial-accept');
    const first = await restarted.outbox.syncAll(shift.shift_id);
    const thePartialAnswer = first[0];
    stack.server.setMode('answer');
    // BUG-076: the answer names what the server took, so the outbox confirms
    // exactly that and the rest stay owed.
    expect(thePartialAnswer?.sent).toBe(4);
    expect(thePartialAnswer?.accepted).toBe(2);
    expect(await restarted.events.pendingCount()).toBeGreaterThan(0);

    // The rest send on the next ask, and the server still holds ONE row per
    // event id: the replay of the two it had already taken is a no-op.
    await restarted.outbox.syncAll(shift.shift_id);
    expect(await restarted.events.pendingCount()).toBe(0);
    const stored = stack.server.record().stored;
    const storedIds = stored.map((event) => event.id);
    expect(new Set(storedIds).size).toBe(storedIds.length);
    expect(storedIds.length).toBeGreaterThanOrEqual(4);
    expect(await restarted.store.deliveredMarks()).toHaveLength(4);
    await restarted.close();
  }, 600_000);

  it('the seeded set the kill legs drive is the committed one, unchanged', () => {
    expect(shifts.length).toBeGreaterThanOrEqual(100);
    expect(shifts[0].plan.length).toBe(shifts[0].stops.length);
  });

  /**
   * One seeded shift, killed `kills` times mid-delivery at the seeded stop, and
   * finished after each cold start.
   *
   * The claims, all read back through the app's own stores:
   * - every stop the plan resolved carries exactly one mark;
   * - every mark's event is on the server exactly once;
   * - nothing is pending on the phone once the outbox has answered;
   * - every failed event carried its reason.
   */
  async function driveAKilledShift(
    shift: SeededShift,
    kills: number,
    killAfter: number,
    server: ScaleServer,
    client: CourierApiClient,
  ): Promise<KillTrace> {
    const problems: string[] = [];
    const day = theDayOf(shift);
    const plan = new Map(shift.plan.map((entry) => [entry.stop_id, entry.outcome]));
    let phone = new ThePhone(`kill-${shift.shift_id}.db`, shift, client);
    await phone.load();
    const stopIds = new Set(day.stops.map((stop) => stop.id));

    let delivered = 0;
    let failed = 0;
    let killCount = 0;
    let position = 0;
    for (const stop of day.stops) {
      const outcome = plan.get(stop.id);
      if (outcome === undefined) {
        problems.push(`stop ${stop.id} has no outcome`);
        continue;
      }
      position += 1;
      if (outcome.outcome === 'delivered') {
        await phone.store.markDelivered({ id: stop.id, sequence: stop.seq ?? 0 });
        delivered += 1;
      } else if (outcome.outcome === 'failed') {
        if (outcome.reason === undefined || outcome.utterance === undefined) {
          problems.push(`stop ${stop.id} failed with no reason`);
          continue;
        }
        await phone.store.markFailed(
          { id: stop.id, sequence: stop.seq ?? 0 },
          { reason: outcome.reason, utterance: outcome.utterance },
        );
        failed += 1;
      }
      const atTheEnd = stop.seq === day.stops.length;
      const atTheSeededStop = position === Math.min(killAfter, Math.max(1, Math.floor(day.stops.length / 2)));
      if (killCount < kills && (atTheSeededStop || atTheEnd)) {
        // The app dies in the middle of the day, mid-delivery: no flush, no
        // confirm, nothing closed politely.
        await phone.kill();
        phone = await phone.coldStart(shift);
        killCount += 1;
      }
    }

    // The day is over and the outbox has been asked: nothing may be left on the
    // phone, and the server must hold exactly one row per mark.
    await phone.outbox.syncAll(shift.shift_id);
    const marks = await phone.store.deliveredMarks();
    const eventsPending = await phone.events.pendingCount();
    await phone.close();
    const record = server.record();
    const mine = (id: string): boolean => stopIds.has(id);
    const stored = record.stored.filter((event) => mine(event.stop_id));
    const sent = record.sent.filter((event) => mine(event.stop_id));

    if (marks.length !== delivered + failed) {
      problems.push(`the run carries ${marks.length} marks for ${delivered + failed} stops that moved`);
    }
    const markIds = marks.map((mark) => mark.eventId);
    if (new Set(markIds).size !== markIds.length) {
      problems.push('one event id is on two marks');
    }
    for (const mark of marks) {
      const rows = stored.filter((event) => event.id === mark.eventId);
      if (rows.length !== 1) {
        problems.push(`the mark of ${mark.stopId} has ${rows.length} rows on the server`);
      }
    }
    const reasons = stored.filter((event) => event.kind === 'failed');
    for (const row of reasons) {
      if (row.reason === undefined || row.reason.length === 0) {
        problems.push(`the failed event ${row.id} reached the server with no reason`);
      }
    }

    return {
      shift_id: shift.shift_id,
      kills: killCount,
      stops: day.stops.length,
      delivered,
      failed,
      marks_after: marks.length,
      events_after: stored.length,
      events_pending: eventsPending,
      server_stored: stored.length,
      server_sent: sent.length,
      duplicates: sent.length - stored.length,
      lost: delivered + failed - stored.length,
      reasons_sent: reasons.filter((row) => row.reason !== undefined && row.reason.length > 0).length,
      problems,
    };
  }

  /** The totals the evidence quotes. */
  function theTotals(traces: KillTrace[]): {
    kills: number;
    delivered: number;
    failed: number;
    marks_after: number;
    events_pending: number;
    duplicates: number;
    lost: number;
  } {
    return {
      kills: traces.reduce((total, trace) => total + trace.kills, 0),
      delivered: traces.reduce((total, trace) => total + trace.delivered, 0),
      failed: traces.reduce((total, trace) => total + trace.failed, 0),
      marks_after: traces.reduce((total, trace) => total + trace.marks_after, 0),
      events_pending: traces.reduce((total, trace) => total + trace.events_pending, 0),
      duplicates: traces.reduce((total, trace) => total + trace.duplicates, 0),
      lost: traces.reduce((total, trace) => total + trace.lost, 0),
    };
  }
});
