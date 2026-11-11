/**
 * The founder directive 2026-11-10 item 6 (OFFLINE), the app half:
 * a complete shift in airplane mode, with 0 data loss, over >= 50 shifts, and
 * exactly-once sync when the network is flaky or the phone dies mid-sync.
 *
 * The claim is the test's name. What runs here is the app's own write path,
 * end to end, with the network taken away for the whole shift:
 *
 *   RunStore.markDelivered / markFailed            (the mark)
 *     -> EventLog.record                           (the phone's log)
 *     -> RunStore's flush                          (the outbox's ask)
 *     -> SyncService.syncAll                       (the outbox)
 *     -> apiSyncTransport.send                     (the wire)
 *     -> CourierApiClient.postDeliveryEvents       (the app's one HTTP boundary)
 *     -> toContractEvent                           (the phone's words to the API's)
 *     -> fetch                                     (the network)
 *     -> the server's own events:batch contract    (mirrored below)
 *
 * The server is a MIRROR of `services/api/app/repo.py::append_events`
 * (INSERT ... ON CONFLICT (id) DO NOTHING; accepted = the rowcount; conflicts =
 * the ids whose stored content differs). A mirror is not evidence, so the SAME
 * scenarios are measured against the real stack by
 * `docs/evidence/offline/stack-sim.mjs` (the compose stack, the real
 * `events:batch`, the real Postgres rows).
 *
 * The event store is the in-memory twin of `opSqliteEventStore.ts` (one row
 * per id, pending ordered by the instant, the synced/refused flags, forget only
 * while unsent), because the simulated phone has to SURVIVE a kill: a real
 * phone keeps its log in SQLCipher across the process death, and a store that
 * lost it would make the mid-sync kill unmeasurable.
 *
 * What is NOT run here, and stays named: the Android UI (the CI AVDs',
 * `.maestro/offline-shift.yaml`), the real SQLCipher file, and the real
 * network (the compose stack's leg).
 */

// better-auth is ESM-only and does not load in jest; the client takes its token
// from it, and this suite injects the token itself.
jest.mock('@/lib/auth-client', () => ({
  sessionToken: jest.fn(() => Promise.resolve('sim-token')),
}));

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { CourierApiClient } from '@/lib/api-client';
import { reportSyncAnswers } from '@/sync/syncAnswers';
import { EventLog } from '@/sync/eventLog';
import { SyncService } from '@/sync/syncService';
import { apiSyncTransport } from '@/sync/apiSyncTransport';
import type { DeliveryEvent, EventStore } from '@/sync/types';

import { RunStore } from '@/run/runStore';
import type { DeliveredMark, RunApi, RunCache, RunSnapshot } from '@/run/types';
import type { StopResponse } from '@courier/shared/src/generated/api';

/** The seeded order (§17): the same seed, the same run. */
const SEED = 20261111;

/** The directive's floor: at least 50 simulated shifts. */
const SHIFTS = 50;

/** Where this run writes its own trace, so the evidence is reproducible. */
const REPO_ROOT = join(__dirname, '../../../../..');
const RESULTS = join(REPO_ROOT, 'docs/evidence/offline/results');

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** The clock of the deterministic run (§17): no wall clock in the trace. */
function theClock(): () => number {
  let at = 1762800000000;
  return () => {
    at += 60_000;
    return at;
  };
}

/**
 * The event log's storage: the in-memory twin of op-sqlite's own.
 *
 * One row per id (INSERT OR IGNORE keeps the first), pending ordered by the
 * instant and bounded, and a forgotten row only goes while it is unsent - the
 * rules the real store's SQL implements, because a simulation whose log
 * behaves differently from the phone's log proves nothing about the phone.
 */
class PersistentEventStore implements EventStore {
  readonly events: DeliveryEvent[] = [];

  readonly synced = new Set<string>();

  readonly refused = new Set<string>();

  append(event: DeliveryEvent): Promise<void> {
    if (!this.events.some((stored) => stored.id === event.id)) {
      this.events.push(event);
    }
    return Promise.resolve();
  }

  pending(limit: number): Promise<DeliveryEvent[]> {
    return Promise.resolve(
      this.events
        .filter((event) => !this.synced.has(event.id) && !this.refused.has(event.id))
        .slice()
        .sort((left, right) => (left.occurredAt < right.occurredAt ? -1 : 1))
        .slice(0, limit),
    );
  }

  markSynced(ids: string[]): Promise<void> {
    ids.forEach((id) => this.synced.add(id));
    return Promise.resolve();
  }

  quarantine(events: DeliveryEvent[]): Promise<void> {
    events.forEach((event) => this.refused.add(event.id));
    return Promise.resolve();
  }

  forget(id: string): Promise<void> {
    if (this.synced.has(id)) {
      return Promise.resolve();
    }
    const index = this.events.findIndex((event) => event.id === id);
    if (index >= 0) {
      this.events.splice(index, 1);
    }
    return Promise.resolve();
  }

  pendingCount(): Promise<number> {
    return Promise.resolve(
      this.events.filter((event) => !this.synced.has(event.id) && !this.refused.has(event.id))
        .length,
    );
  }

  /** Every row, whatever its state: the server's own count sits beside it. */
  all(): DeliveryEvent[] {
    return [...this.events];
  }
}

/** The cache the phone keeps the day in: the day, and the marks above it. */
class PersistentCache implements RunCache {
  readonly marks: DeliveredMark[] = [];

  day: RunSnapshot;

  constructor(day: RunSnapshot) {
    this.day = day;
  }

  read(): Promise<RunSnapshot | null> {
    return Promise.resolve(this.day);
  }

  write(snapshot: RunSnapshot): Promise<void> {
    this.day = snapshot;
    return Promise.resolve();
  }

  markDelivered(mark: DeliveredMark): Promise<void> {
    if (!this.marks.some((kept) => kept.stopId === mark.stopId)) {
      this.marks.push(mark);
    }
    return Promise.resolve();
  }

  undoDelivered(stopId: string): Promise<void> {
    const index = this.marks.findIndex((mark) => mark.stopId === stopId);
    if (index >= 0) {
      this.marks.splice(index, 1);
    }
    return Promise.resolve();
  }

  markOf(stopId: string): Promise<DeliveredMark | null> {
    return Promise.resolve(this.marks.find((mark) => mark.stopId === stopId) ?? null);
  }

  deliveredMarks(): Promise<DeliveredMark[]> {
    return Promise.resolve([...this.marks]);
  }

  clear(): Promise<void> {
    this.marks.length = 0;
    return Promise.resolve();
  }

  close(): Promise<void> {
    return Promise.resolve();
  }
}

/** One event as the contract spells it (what the batch route reads). */
interface ContractEvent {
  id: string;
  stop_id: string;
  kind: string;
  occurred_at: string;
  utterance?: string;
  safe_place?: string;
  reason?: string;
}

/**
 * The server, mirrored from `repo.append_events`.
 *
 * Every rule below is the repository's own, read from
 * `services/api/app/repo.py`: the batch is capped at 500, every event's stop
 * must belong to the run, the insert is ON CONFLICT (id) DO NOTHING, the
 * answer's `accepted` is the rowcount, and `conflicts` names the ids whose
 * stored content DIFFERS from the one offered. A replay of identical content
 * is not a conflict - it is simply not stored twice, which is what makes
 * exactly-once possible at all.
 */
class TheServer {
  readonly rows = new Map<string, ContractEvent & { shift_id: string }>();

  /** The stops each shift owns: an event for a foreign stop is refused whole. */
  readonly stopsOf = new Map<string, Set<string>>();

  /** How many times each id was OFFERED on the wire (the re-send count). */
  readonly offers = new Map<string, number>();

  /** How many times each id was actually INSERTED: a second one is a BUG. */
  readonly inserted = new Map<string, number>();

  seedShift(shiftId: string, stopIds: readonly string[]): void {
    this.stopsOf.set(shiftId, new Set(stopIds));
  }

  /** `POST /shifts/{shift_id}/events:batch`, as the route answers it. */
  postBatch(shiftId: string, events: ContractEvent[]): { status: number; body: unknown } {
    const known = this.stopsOf.get(shiftId);
    if (known === undefined) {
      return { status: 404, body: { detail: 'no run for this shift' } };
    }
    if (events.length > 500) {
      return { status: 422, body: { detail: 'the batch is over the 500-event cap' } };
    }
    const unknown = events.filter((event) => !known.has(event.stop_id));
    if (unknown.length > 0) {
      return {
        status: 422,
        body: {
          detail: `nothing was stored: stops not in this run - ${unknown.map((event) => event.stop_id).join(', ')}`,
        },
      };
    }

    // The intra-batch divergence rule of repo.append_events: the first copy is
    // kept, a differing second copy of the same id is a conflict.
    const firstCopy = new Map<string, ContractEvent>();
    const intraBatch = new Set<string>();
    for (const event of events) {
      const first = firstCopy.get(event.id);
      if (first === undefined) {
        firstCopy.set(event.id, event);
      } else if (!sameEvent(first, event)) {
        intraBatch.add(event.id);
      }
    }

    let stored = 0;
    for (const event of events) {
      this.offers.set(event.id, (this.offers.get(event.id) ?? 0) + 1);
      const existing = this.rows.get(event.id);
      if (existing === undefined) {
        this.rows.set(event.id, { ...event, shift_id: shiftId });
        this.inserted.set(event.id, 1);
        stored += 1;
      } else if (!sameEvent(existing, event)) {
        // A DIVERGENT replay: the first copy stays, and the phone is told. The
        // insert itself still refused a second row, so this is a conflict the
        // courier must hear about, not a duplicate landing.
        this.inserted.set(event.id, (this.inserted.get(event.id) ?? 0) + 1);
      }
    }

    const conflicts = events
      .filter((event) => {
        const storedAgain = this.rows.get(event.id);
        return (
          intraBatch.has(event.id) || (storedAgain !== undefined && !sameEvent(storedAgain, event))
        );
      })
      .map((event) => event.id);

    const cursor = [...this.rows.values()].filter(
      (row) => row.shift_id === shiftId && row.kind !== 'pod_captured',
    ).length;

    return { status: 200, body: { accepted: stored, cursor, conflicts: [...new Set(conflicts)] } };
  }

  /** The rows the server holds for one shift. */
  rowsOf(shiftId: string): (ContractEvent & { shift_id: string })[] {
    return [...this.rows.values()].filter((row) => row.shift_id === shiftId);
  }

  /** The empty server: each leg measures its own, so no row can leak across. */
  reset(): void {
    this.rows.clear();
    this.stopsOf.clear();
    this.offers.clear();
    this.inserted.clear();
    this.batches.length = 0;
  }

  /** The ids INSERTED more than once: a duplicate landing is a BUG. */
  duplicateLandings(): string[] {
    return [...this.inserted.entries()].filter(([, times]) => times > 1).map(([id]) => id);
  }

  /** How many times one id was offered on the wire. */
  offersOf(id: string): number {
    return this.offers.get(id) ?? 0;
  }

  /** How many batches the wire carried in total, across every shift. */
  batchCount(): number {
    return this.batches.length;
  }

  readonly batches: ContractEvent[][] = [];
}

/** Two events are the same event when the server's own comparison says so. */
function sameEvent(left: ContractEvent, right: ContractEvent): boolean {
  return (
    left.stop_id === right.stop_id &&
    left.kind === right.kind &&
    left.occurred_at === right.occurred_at &&
    (left.utterance ?? '') === (right.utterance ?? '') &&
    (left.safe_place ?? '') === (right.safe_place ?? '') &&
    (left.reason ?? '') === (right.reason ?? '')
  );
}

/**
 * The network.
 *
 * A fetch the profile decides. `offline` answers nothing at all (airplane
 * mode). `flaky` drops a seeded share of the answers AFTER the server has
 * taken the batch - the shape of a dead zone that swallows the response
 * rather than the request, which is the case that makes exactly-once hard -
 * and the client's own timeout resolves it as `offline`, the way a real phone
 * does. `dropNext` is the deterministic single drop the kill leg uses.
 */
class TheNetwork {
  mode: 'offline' | 'online' | 'flaky' = 'offline';

  /** The share of answered batches whose answer is dropped, seeded. */
  answerLossRate = 0.3;

  /** Drop exactly the next ANSWER, whatever the rate says (the kill leg). */
  dropNext = false;

  random: () => number;

  /** How many answers were dropped after the server took the batch. */
  droppedAnswers = 0;

  constructor(seed: number) {
    this.random = mulberry32(seed);
  }

  impl: typeof fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (this.mode === 'offline') {
      return Promise.reject(new TypeError('the network request failed (airplane mode)'));
    }
    const match = /\/shifts\/([^/]+)\/events:batch$/.exec(url);
    if (match === null) {
      return Promise.reject(new TypeError(`the simulated network has no route for ${url}`));
    }
    const body = JSON.parse(typeof init?.body === 'string' ? init.body : '[]') as ContractEvent[];
    const answer = theServer.postBatch(decodeURIComponent(match[1]), body);
    const drop = this.dropNext || (this.mode === 'flaky' && this.random() < this.answerLossRate);
    if (drop) {
      this.dropNext = false;
      this.droppedAnswers += body.length;
      // The server took the batch; the answer never arrives. The client's own
      // timeout is what ends the call, so it resolves as `offline`.
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(Object.assign(new Error('the call was aborted'), { name: 'AbortError' })),
        );
      });
    }
    return Promise.resolve({
      ok: answer.status < 400,
      status: answer.status,
      json: () => Promise.resolve(answer.body),
    } as Response);
  };
}

/** The server every shift of this run talks to. */
const theServer = new TheServer();

/** The API the run store would talk to: the day is cached, so it is not asked. */
class OfflineApi implements RunApi {
  seedDemoRun(): Promise<{ status: 'server'; code: number; message: string }> {
    return Promise.resolve({ status: 'server', code: 0, message: 'airplane mode: no seed' });
  }

  getRun(): Promise<{ status: 'offline' }> {
    return Promise.resolve({ status: 'offline' });
  }

  getStops(): Promise<{ status: 'offline' }> {
    return Promise.resolve({ status: 'offline' });
  }
}

/** One seeded shift: its id, its stops, and the day the phone holds. */
interface SeededShift {
  shiftId: string;
  day: RunSnapshot;
  stops: StopResponse[];
}

/** A seeded shift of the run, deterministic per index. */
function seedShift(index: number): SeededShift {
  const random = mulberry32(SEED + index);
  const shiftId = `shift-${String(index + 1).padStart(3, '0')}`;
  const runId = `run-${String(index + 1).padStart(3, '0')}`;
  const count = 5 + Math.floor(random() * 8); // 5..12 stops, like a real day
  const stops: StopResponse[] = Array.from({ length: count }, (_unused, stopIndex) => ({
    id: `${shiftId}-stop-${String(stopIndex + 1).padStart(2, '0')}`,
    location_id: `${shiftId}-loc-${String(stopIndex + 1).padStart(2, '0')}`,
    address: `${stopIndex + 1} Ferry Road, Woolston`,
    seq: stopIndex + 1,
    status: 'pending',
    type: 'delivery',
    lat: -43.53 + stopIndex / 1000,
    lon: 172.6 + stopIndex / 1000,
    parcels: 1,
  }));
  return {
    shiftId,
    stops,
    day: {
      run: {
        id: runId,
        shift_id: shiftId,
        name: `Woolston AM ${String(index + 1)}`,
        depot: { lat: -43.532, lon: 172.599 },
        speed_kmh: 40,
        start_at: '2026-11-11T07:30:00.000Z',
      },
      stops,
    },
  };
}

/** What one simulated shift did, end to end: the trace the evidence quotes. */
interface ShiftTrace {
  shift: string;
  stops: number;
  marked: number;
  delivered: number;
  failed: number;
  events_logged: number;
  batches_sent: number;
  duplicate_sends: number;
  server_rows: number;
  duplicate_landings: number;
  lost: number;
  quarantined: number;
  pending_after: number;
  answers_dropped: number;
}

/** The marks of one stop, decided by the shift's own seeded order. */
type TheOutcome = 'delivered' | 'failed';

/** The outcomes the simulated courier makes, deterministic per shift. */
function theOutcomes(shift: SeededShift): TheOutcome[] {
  const random = mulberry32(SEED + Number(shift.shiftId.slice(-3)) + 500);
  return shift.stops.map(() => (random() < 0.25 ? 'failed' : 'delivered'));
}

/** One shift worked in airplane mode, then synced: the app's own store, log and outbox. */
async function workOneShift(
  shift: SeededShift,
  network: TheNetwork,
  options: { killMidSync?: boolean } = {},
): Promise<ShiftTrace> {
  theServer.seedShift(
    shift.shiftId,
    shift.stops.map((stop) => stop.id),
  );

  const eventStore = new PersistentEventStore();
  const events = new EventLog(eventStore);
  const cache = new PersistentCache(shift.day);
  const client = new CourierApiClient({
    baseUrl: 'http://stack.test',
    getToken: () => Promise.resolve('sim-token'),
    fetchImpl: network.impl,
    // A short timeout so a dropped ANSWER is the client's own `offline`, the
    // way a real dead zone ends a call.
    timeoutMs: 25,
  });
  const service = new SyncService(events, apiSyncTransport(client));
  const store = new RunStore({
    client: new OfflineApi(),
    cache,
    events,
    reason: 'dev',
    clock: theClock(),
    // The production construction site's own flush (productionRunStore.ts):
    // every outcome the outbox reports is the courier's to read.
    flush: async (shiftId: string) => {
      for (const outcome of await service.syncAll(shiftId)) {
        reportSyncAnswers(outcome);
      }
    },
  });

  // The day is on the phone from the depot, so the shift starts with the
  // network already gone: the store answers from the cache, which is exactly
  // what a courier in a dead zone sees.
  const loaded = await store.load();
  if (loaded.status !== 'ok') {
    throw new Error(`the simulated shift could not read its own day: ${loaded.status}`);
  }

  const outcomes = theOutcomes(shift);
  let delivered = 0;
  let failed = 0;
  for (const [index, stop] of shift.stops.entries()) {
    if (outcomes[index] === 'failed') {
      // A failed delivery carries the courier's own reason and their own word:
      // the server refuses a failed event with no reason, and the phone
      // refuses it first (ADR-023).
      await store.markFailed(
        { id: stop.id, sequence: stop.seq },
        { reason: 'nobody_home', utterance: 'knocked twice, van in the drive' },
      );
      failed += 1;
    } else {
      await store.markDelivered({ id: stop.id, sequence: stop.seq });
      delivered += 1;
    }
  }

  const marked = delivered + failed;

  if (options.killMidSync === true) {
    // The phone dies mid-sync. The outbox's own flush has already taken the
    // first batch to the wire (`productionRunStore` asks it after every
    // mark), the server stores it, and the process dies before the answer is
    // read and before anything is confirmed. The promise is abandoned rather
    // than awaited, because a dead process reads no answer: on a real phone
    // the socket dies with it.
    const first = await events.nextBatch(50);
    if (first.length > 0) {
      network.dropNext = true;
      void client.postDeliveryEvents(shift.shiftId, first).catch(() => undefined);
    }
  }

  // The network comes back and the outbox is asked, the way the app asks it
  // after a mark and on the retry's own tick (outboxRetry.ts).
  network.mode = 'online';
  for (const outcome of await service.syncAll(shift.shiftId)) {
    reportSyncAnswers(outcome);
  }

  const pendingAfter = await events.pendingCount();
  const serverRows = theServer.rowsOf(shift.shiftId);
  const logged = eventStore.all();
  const duplicateSends = logged.filter((event) => theServer.offersOf(event.id) > 1).length;

  await store.close();

  return {
    shift: shift.shiftId,
    stops: shift.stops.length,
    marked,
    delivered,
    failed,
    events_logged: logged.length,
    batches_sent: 0,
    duplicate_sends: duplicateSends,
    server_rows: serverRows.length,
    duplicate_landings: theServer.duplicateLandings().length,
    lost: logged.length - serverRows.length,
    quarantined: logged.filter((event) => eventStore.refused.has(event.id)).length,
    pending_after: pendingAfter,
    answers_dropped: network.droppedAnswers,
  };
}

describe('a whole shift in airplane mode (the founder directive item 6, OFFLINE)', () => {
  jest.setTimeout(600_000);

  beforeEach(() => {
    // One server per leg: a row from one leg must never be counted in
    // another's, because the count is the claim.
    theServer.reset();
  });

  it('50 airplane-mode shifts land every mark exactly once', async () => {
    const network = new TheNetwork(SEED);
    const traces: ShiftTrace[] = [];

    for (let index = 0; index < SHIFTS; index += 1) {
      traces.push(await workOneShift(seedShift(index), network));
    }

    const shifts = traces.length;
    const marked = traces.reduce((total, trace) => total + trace.marked, 0);
    const events = traces.reduce((total, trace) => total + trace.events_logged, 0);
    const rows = traces.reduce((total, trace) => total + trace.server_rows, 0);
    const duplicates = traces.reduce((total, trace) => total + trace.duplicate_landings, 0);
    const lost = traces.reduce((total, trace) => total + trace.lost, 0);
    const quarantined = traces.reduce((total, trace) => total + trace.quarantined, 0);
    const pending = traces.reduce((total, trace) => total + trace.pending_after, 0);
    const resent = traces.reduce((total, trace) => total + trace.duplicate_sends, 0);

    // Every shift was worked, and every mark it worked is on the phone: the
    // phone's own answer to what the courier did, with no network at all.
    expect(shifts).toBe(SHIFTS);
    expect(marked).toBeGreaterThanOrEqual(SHIFTS * 5);
    for (const trace of traces) {
      expect(trace.marked).toBe(trace.stops);
    }

    // 0 data loss: every event the phone logged is a row the server holds.
    expect(events).toBe(marked);
    expect(rows).toBe(events);
    expect(lost).toBe(0);
    // A duplicate landing is a BUG (the directive's own word).
    expect(duplicates).toBe(0);
    // Nothing the courier marked was quietly kept out of the send path.
    expect(quarantined).toBe(0);
    // And the log drained: the phone no longer owes the server anything.
    expect(pending).toBe(0);

    writeTheEvidence(traces, {
      shifts,
      stops_marked: marked,
      events_logged: events,
      server_rows: rows,
      duplicate_landings: duplicates,
      duplicate_sends: resent,
      lost,
      quarantined,
      pending_after: pending,
      answers_dropped: network.droppedAnswers,
      seed: SEED,
      network: 'airplane mode for the whole shift, then online',
    });
  }, 300_000);

  it('a flaky network lands each outbox event exactly once', async () => {
    // The emulator's loss profile, brought to the machine: 30% of the answers
    // are dropped after the server has taken the batch. 20 shifts of it.
    const network = new TheNetwork(SEED + 7);
    network.mode = 'flaky';
    const traces: ShiftTrace[] = [];

    for (let index = 0; index < 20; index += 1) {
      traces.push(await workOneShift(seedShift(100 + index), network));
    }

    const events = traces.reduce((total, trace) => total + trace.events_logged, 0);
    const rows = traces.reduce((total, trace) => total + trace.server_rows, 0);
    const duplicates = traces.reduce((total, trace) => total + trace.duplicate_landings, 0);
    const lost = traces.reduce((total, trace) => total + trace.lost, 0);
    const quarantined = traces.reduce((total, trace) => total + trace.quarantined, 0);
    const resent = traces.reduce((total, trace) => total + trace.duplicate_sends, 0);

    // The server holds exactly what the phone logged: the events whose answer
    // was lost were re-offered and landed ONCE, not twice.
    expect(events).toBeGreaterThan(0);
    expect(rows).toBe(events);
    expect(duplicates).toBe(0);
    expect(lost).toBe(0);
    expect(quarantined).toBe(0);
    // The loss really happened: a leg where nothing was dropped proves nothing
    // about a flaky network.
    expect(network.droppedAnswers).toBeGreaterThan(0);
    // And the re-sends are counted, not hidden: a duplicate SEND is the price
    // of an exactly-once LANDING, and it is measured here.
    expect(resent).toBeGreaterThan(0);

    writeTheEvidence(
      traces,
      {
        shifts: traces.length,
        events_logged: events,
        server_rows: rows,
        duplicate_landings: duplicates,
        duplicate_sends: resent,
        lost,
        quarantined,
        pending_after: traces.reduce((total, trace) => total + trace.pending_after, 0),
        answers_dropped: network.droppedAnswers,
        seed: SEED + 7,
        network: 'flaky: 30% of the answers dropped after the server took the batch',
      },
      'flaky-results',
    );
  }, 300_000);

  it('a kill mid-sync lands each outbox event exactly once', async () => {
    const network = new TheNetwork(SEED + 13);
    const traces: ShiftTrace[] = [];

    // A smaller leg than the 50-shift one, and it says so: the kill is the rare
    // shape, and 12 of them is the measured leg.
    for (let index = 0; index < 12; index += 1) {
      traces.push(await workOneShift(seedShift(200 + index), network, { killMidSync: true }));
    }

    const events = traces.reduce((total, trace) => total + trace.events_logged, 0);
    const rows = traces.reduce((total, trace) => total + trace.server_rows, 0);
    const duplicates = traces.reduce((total, trace) => total + trace.duplicate_landings, 0);
    const lost = traces.reduce((total, trace) => total + trace.lost, 0);

    // The server holds exactly what the phone logged: the batch whose answer
    // was lost to the kill was re-offered after the restart and landed ONCE.
    expect(events).toBeGreaterThan(0);
    expect(rows).toBe(events);
    expect(duplicates).toBe(0);
    expect(lost).toBe(0);

    writeTheEvidence(
      traces,
      {
        shifts: traces.length,
        events_logged: events,
        server_rows: rows,
        duplicate_landings: duplicates,
        duplicate_sends: traces.reduce((total, trace) => total + trace.duplicate_sends, 0),
        lost,
        quarantined: traces.reduce((total, trace) => total + trace.quarantined, 0),
        pending_after: traces.reduce((total, trace) => total + trace.pending_after, 0),
        answers_dropped: network.droppedAnswers,
        seed: SEED + 13,
        network: 'one answer dropped to the kill, then online',
        kill_mid_sync: 1,
      },
      'kill-results',
    );
  }, 300_000);

  // RED on origin/main, and it stays red until the defect it names is fixed.
  //
  // The DIRECTION of the finding (2026-11-11, this lane): the outbox never
  // drains a batch the server has ALREADY STORED when the answer was lost.
  // `SyncService.sync` confirms `batch.slice(0, accepted)`, and the server's
  // `accepted` is the rowcount of its INSERT .. ON CONFLICT DO NOTHING: a
  // replay of stored events is answered `accepted: 0` (it conflicts nothing),
  // so nothing is confirmed and the same batch is re-offered on every retry
  // tick for as long as the session lives. The data is safe (0 loss, 0
  // duplicate landings - measured in the legs above), the phone is not: the
  // courier's log never empties and the wire carries the same events forever.
  //
  // This test is the claim "the outbox drains a batch the server already
  // stored". It is RED on origin/main (shift-201: 10 events pending after the
  // network is back; flaky leg: 4 pending), which is the point: a red test
  // that names a real defect is evidence, and the lane does not smear it.
  it('the outbox drains a batch the server already stored (RED on main: the replay is answered accepted 0, so nothing is confirmed)', async () => {
    const network = new TheNetwork(SEED + 13);
    // A shift of its own (300), not the kill leg's 200: the ids of a run are
    // the phone's own, so the same shift worked twice is two sets of events.
    const trace = await workOneShift(seedShift(300), network, { killMidSync: true });

    // The data survived: that is the other half of the claim, and it holds.
    expect(trace.server_rows).toBe(trace.events_logged);
    expect(trace.duplicate_landings).toBe(0);

    // The phone must stop owing the server what the server already has. On
    // origin/main this is the red line: the batch was re-offered, the server
    // answered `accepted: 0` (nothing was inserted - all of it was there), and
    // `confirm()` was handed `batch.slice(0, 0)` - an empty list.
    expect(trace.pending_after).toBe(0);
  }, 300_000);
});

/** The run's own evidence: the per-shift CSV and the counts, written fresh. */
function writeTheEvidence(
  traces: ShiftTrace[],
  counts: Record<string, number | string>,
  folder = 'shift-results',
): void {
  const dir = RESULTS + '/' + folder;
  mkdirSync(dir, { recursive: true });
  const header = [
    'shift',
    'stops',
    'marked',
    'delivered',
    'failed',
    'events_logged',
    'duplicate_sends',
    'server_rows',
    'duplicate_landings',
    'lost',
    'quarantined',
    'pending_after',
  ].join(',');
  const rows = traces.map((trace) =>
    [
      trace.shift,
      trace.stops,
      trace.marked,
      trace.delivered,
      trace.failed,
      trace.events_logged,
      trace.duplicate_sends,
      trace.server_rows,
      trace.duplicate_landings,
      trace.lost,
      trace.quarantined,
      trace.pending_after,
    ].join(','),
  );
  writeFileSync(join(dir, 'per_shift.csv'), `${header}\n${rows.join('\n')}\n`, 'utf8');
  writeFileSync(join(dir, 'summary.json'), `${JSON.stringify(counts, null, 1)}\n`, 'utf8');
}
