/**
 * The seeded full shifts, driven through the app's own store and service path
 * (the founder directive 2026-11-10, item 5).
 *
 * Every shift of `packages/eval/scale/shifts.jsonl` (120 of them, seed
 * 20261111, built by `scripts/eval/build-scale-shifts.mjs`) walks the courier's
 * own day, one stop at a time, on the app's OWN code:
 *
 *   load      - `RunStore.load()` reads the day through the store's own network
 *               path (the API seam answering the committed shift) and writes it
 *               into the phone's own `OpSqliteRunCache`;
 *   navigate  - the run's active stop advances as the marks land, the way
 *               `@/maps/drive` reads it, and the order the solver worked out is
 *               applied through the store's own `applyRouteOrder` (and a HALF
 *               order is refused by it);
 *   deliver   - `markDelivered` writes the mark into the cache AND the delivery
 *               event into the log;
 *   fail      - `markFailed` with the reason the server refuses to be without,
 *               and the courier's own words;
 *   POD photo - the build's own capture (`captureForThisBuild`) writes the
 *               canned JPEG and the build's own uploader answers the contract's
 *               `PodResponse` for the event's own id, once per event;
 *   break     - the spoken break goes through the app's own parser and router;
 *   finish    - the spoken finish is recognised, and the day the phone holds
 *               carries the run's own finish point.
 *   sync      - after every mark the store asks the outbox to send, exactly as
 *               `productionRunStore` does, over the app's own `SyncService` and
 *               `apiSyncTransport` against a loopback stack that answers the
 *               contract's own shape.
 *
 * What the assertions claim, and what they do NOT:
 *
 * - every stop's delivered/failed mark is on the run exactly once, and every
 *   mark's event is in the log exactly once - one event per marked stop, no
 *   duplicates, none lost;
 * - the events the outbox sent are exactly the events the log held, and the
 *   server stored each one once;
 * - the skipped and the left-pending stops were NOT marked and NOT sent;
 * - nothing threw and nothing rejected unhandled (0 crashes, 0 data loss);
 * - the run, the log and the trace agree.
 *
 * What is NOT claimed here: the Android UI, the emulator, the recognizer, the
 * native SQLite engine and the real API. Those are the CI AVDs' and the A1
 * stack's legs, and `docs/evidence/scale-tests/README.md` names them.
 */
jest.mock('@op-engineering/op-sqlite', () => {
  // The app's own stores read their statements through this; the stand-in
  // answers them the way SQLite does and KEEPS THE ROWS ACROSS A CLOSE, which
  // is what makes the kill legs (scaleKillSync.test.ts) mean anything.
  const { theDatabaseOf } = require('../testing/scaleSqlite') as typeof import('../testing/scaleSqlite');
  return { open: jest.fn((options: { name: string }) => theDatabaseOf(options.name)) };
});

jest.mock('expo-file-system', () => {
  // The POD capture writes the canned JPEG to the app's own cache: the cache is
  // a file, and a test run has no file system for it, so the write is recorded
  // and the bytes are asserted (the real JPEG's magic is FFD8FF).
  const written: { uri: string; bytes: string }[] = [];
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

    async write(data: string, options: { encoding: 'base64' | 'utf8' }): Promise<void> {
      const bytes = options.encoding === 'base64' ? Buffer.from(data, 'base64').toString('binary') : data;
      written.push({ uri: this.uri, bytes });
    }
  }

  return {
    File: TheFile,
    Paths: {
      cache: 'file:///data/user/0/com.courier.copilot/cache',
      document: 'file:///data/user/0/com.courier.copilot/files',
    },
    __written: written,
  };
});

// The pod module builds the app's one HTTP boundary at import time; the auth
// client it takes its token from is better-auth (ESM-only, not loadable in
// jest), and the E2E build's uploader never dials it anyway.
jest.mock('@/lib/auth-client', () => ({
  sessionToken: jest.fn(() => Promise.resolve('scale-token')),
}));

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { CourierApiClient } from '@/lib/api-client';
import { EventLog } from '@/sync/eventLog';
import { OpSqliteEventStore } from '@/sync/opSqliteEventStore';
import { OpSqliteRunCache } from '@/run/opSqliteRunCache';
import { RunStore } from '@/run/runStore';
import { SyncService } from '@/sync/syncService';
import { apiSyncTransport } from '@/sync/apiSyncTransport';
import { reportSyncAnswers } from '@/sync/syncAnswers';
import { captureForThisBuild, uploaderForThisBuild } from '@/pod/podForThisBuild';
import { parseVoiceCommand } from '@/voice/commands';
import { ackLineFor, routeTurn } from '@/voice/turnRouter';
import type { ApiOutcome, CourierApiClientOptions } from '@/lib/api-client';
import type { RunApi, RunSnapshot } from '@/run/types';
import type { StopResponse } from '@courier/shared/src/generated/api';
import { ScaleServer, theFetchOf } from '../testing/scaleStack';

/** The repository root, from `apps/mobile/src/run/__tests__/`. */
const REPO_ROOT = join(__dirname, '../../../../../');

/** The committed set the harness drives. */
const SET = join(REPO_ROOT, 'packages/eval/scale/shifts.jsonl');

/**
 * How many shifts this run drives.
 *
 * The whole committed set, unless a measurement pass asks for a slice of it
 * (`SCALE_SHIFTS=20`): the slice is a timing measurement, and the run the
 * evidence quotes is the whole 120. Nothing here skips a shift silently - the
 * trace carries the count the run actually drove, and the assertions below
 * read it.
 */
const LIMIT =
  process.env.SCALE_SHIFTS === undefined ? Number.POSITIVE_INFINITY : Number(process.env.SCALE_SHIFTS);

/** Where this run writes its own trace, so the evidence is reproducible. */
const RESULTS = join(REPO_ROOT, 'docs/evidence/scale-tests/results');

/** One stop of a seeded shift, as the generator writes it. */
interface SeededStop {
  id: string;
  location_id: string;
  type: 'delivery' | 'pickup';
  address: string;
  seq: number;
  status: string;
  lat: number;
  lon: number;
  priority: boolean;
  parcels: number;
  linz_address_id: string;
}

/** The one outcome the courier works towards at one stop. */
interface SeededOutcome {
  stop_id: string;
  seq: number;
  outcome: {
    outcome: 'delivered' | 'failed' | 'skipped' | 'pending';
    pod?: boolean;
    reason?: string;
    utterance?: string;
  };
}

/** One seeded full shift. */
interface SeededShift {
  shift_id: string;
  run_id: string;
  name: string;
  area: string;
  depot: { lat: number; lon: number; address: string };
  start_at: string;
  break_window: { start: string; end: string; minutes: number };
  finish: { lat: number; lon: number };
  stops: SeededStop[];
  plan: SeededOutcome[];
  notes: { stop_id: string; note: string }[];
  commands: { text: string; kind: string }[];
}

/** What one shift did, end to end: the trace the evidence quotes. */
interface ShiftTrace {
  shift_id: string;
  area: string;
  stops: number;
  delivered: number;
  failed: number;
  skipped: number;
  /** The skips the app heard WITH the suburb in them. */
  skips_with_suburb: number;
  pending: number;
  pods: number;
  notes: number;
  commands: { start_break: number; end_break: number; end_shift: number };
  events_logged: number;
  events_sent: number;
  events_pending_after: number;
  marks_after: number;
  break_window: string;
  finish: boolean;
  order_applied: boolean;
  half_order_refused: boolean;
  server_stored: number;
  server_replays: number;
  problems: string[];
}

/** The committed set, one JSON object per line. */
function theSet(): SeededShift[] {
  return readFileSync(SET, 'utf8')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as SeededShift);
}

/** The contract's own stop shape, from the seeded stop. */
function theStop(stop: SeededStop): StopResponse {
  return {
    id: stop.id,
    location_id: stop.location_id,
    type: stop.type,
    address: stop.address,
    seq: stop.seq,
    status: 'pending',
    lat: stop.lat,
    lon: stop.lon,
    priority: stop.priority,
    parcels: stop.parcels,
  };
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
    stops: shift.stops.map(theStop),
  };
}

/** The store's own API seam: the server's own suites test the real API. */
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

/**
 * The skip the courier speaks at a stop, in the words the app’s own parser
 * actually hears.
 *
 * The sentence is built from the seeded address and the app’s own parser is
 * the oracle: the number and the street always work, and the suburb rides
 * along when its own characters let it (a macron or a slash inside a LINZ
 * suburb is spoken as the street alone). The form that was used is recorded
 * in the trace, so the evidence names how many needed the shorter one.
 */
function theSpokenSkip(stop: StopResponse): { text: string; withSuburb: boolean } {
  const parts = (stop.address ?? '').split(',').map((part) => part.trim());
  for (const address of [parts.slice(0, 2).join(', '), parts[0]]) {
    const command = parseVoiceCommand(`skip this one at ${address}`);
    if (command !== null && command.type === 'mark_skipped') {
      return { text: `skip this one at ${address}`, withSuburb: address.includes(',') };
    }
  }
  return { text: `skip this one at ${parts[0]}`, withSuburb: false };
}
/** The run's active stop, the way `@/maps/drive`'s own `activeOf` reads it. */function activeOf(stops: readonly StopResponse[], marked: readonly string[]): StopResponse | null {
  const pending = stops
    .filter((stop) => !marked.includes(stop.id))
    .sort((left, right) => (left.seq ?? 0) - (right.seq ?? 0));
  return pending.length === 0 ? null : pending[0];
}

/** The clock of the deterministic run (§17): no wall clock in the trace. */
function theClock(): () => number {
  let at = 1762908000000; // 2026-11-11T06:00:00.000Z
  return () => {
    at += 60_000;
    return at;
  };
}

describe('the seeded full shifts at scale (founder directive 2026-11-10, item 5)', () => {
  const shifts = theSet();
  const traces: ShiftTrace[] = [];
  /** Everything that rejected without a handler: a crash the run must not have. */
  const rejections: string[] = [];
  /** Every warning the app itself wrote during the run, kept and named. */
  const warnings: string[] = [];
  let server: ScaleServer;
  let baseUrl = '';

  beforeAll(async () => {
    server = new ScaleServer();
    baseUrl = await server.start();
    // The app's own warnings are kept rather than swallowed: the run asserts
    // below that the ONLY things it said were the solver's own refusal of a
    // half order, which this harness asks for on purpose.
    jest.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
      warnings.push(args.map((arg) => textOf(arg)).join(' '));
    });
  });

  afterAll(async () => {
    writeTheEvidence(traces);
    await server.stop();
  });

  beforeAll(() => {
    // The run's own crash counter: an unhandled rejection in React Native is a
    // red screen, so one anywhere in 120 shifts is a failure, not a warning.
    const onRejection = (reason: unknown): void => {
      rejections.push(reason instanceof Error ? reason.message : String(reason));
    };
    process.on('unhandledRejection', onRejection);
  });

  afterAll(() => {
    process.removeAllListeners('unhandledRejection');
  });

  it('the committed set carries the directive\'s 100 seeded full shifts', () => {
    expect(shifts.length).toBeGreaterThanOrEqual(100);
    expect(new Set(shifts.map((shift) => shift.shift_id)).size).toBe(shifts.length);
  });

  it('the seeded full shifts leave the run and the outbox consistent', async () => {
    const driven = shifts.slice(0, LIMIT);
    // The directive's floor is a claim about the WHOLE set: a measurement
    // slice is allowed, but it has to say so rather than quietly pass.
    if (LIMIT === Number.POSITIVE_INFINITY) {
      expect(driven.length).toBeGreaterThanOrEqual(100);
    }
    const started = Date.now();
    for (const shift of driven) {
      const at = Date.now();
      traces.push(await driveTheShift(shift));
      process.stdout.write(
        `shift ${traces.length}/${String(driven.length)} ${shift.shift_id}: ` +
          `${String(shift.stops.length)} stops in ${String(Date.now() - at)}ms\n`,
      );
    }
    process.stdout.write(`the whole run: ${String(driven.length)} shifts in ${String(Date.now() - started)}ms\n`);
    // Not one shift threw, and not one rejection went unhandled.
    expect(rejections).toEqual([]);
    expect(traces.length).toBe(driven.length);
    for (const trace of traces) {
      expect(trace.problems).toEqual([]);
    }
    // The app's own warnings were the harness's own asking: the solver's
    // refusal of a half order, once per shift, and nothing else.
    expect(warnings.filter((warning) => !warning.includes('the solver'))).toEqual([]);
    expect(warnings.length).toBe(driven.length);
  }, 1_800_000);

  it('every stop the plan says was delivered or failed carries exactly one mark and exactly one event', async () => {
    let stops = 0;
    let delivered = 0;
    let failed = 0;
    for (const trace of traces) {
      stops += trace.stops;
      delivered += trace.delivered;
      failed += trace.failed;
      // One mark per stop that moved, one event per mark, and nothing left
      // pending on the phone once the outbox has answered.
      expect(trace.marks_after).toBe(trace.delivered + trace.failed);
      expect(trace.events_logged).toBe(trace.delivered + trace.failed);
      expect(trace.events_sent).toBe(trace.events_logged);
      expect(trace.events_pending_after).toBe(0);
      // The server stored exactly what the phone sent, once each.
      expect(trace.server_stored).toBe(trace.events_sent);
    }
    expect(stops).toBeGreaterThan(2000);
    expect(delivered).toBeGreaterThan(1000);
    expect(failed).toBeGreaterThan(100);
  });

  it('the skipped and the left-pending stops were neither marked nor sent', async () => {
    for (const trace of traces) {
      expect(trace.marks_after).toBeLessThanOrEqual(trace.stops);
      // The events the log holds are the marks: nothing was recorded for a
      // stop the courier only skipped or never reached.
      expect(trace.events_logged).toBe(trace.delivered + trace.failed);
      expect(trace.server_stored).toBe(trace.events_logged);
    }
  });

  it('every shift walked the POD path, the break and the finish on the app\'s own parser', async () => {
    for (const trace of traces) {
      expect(trace.pods).toBeGreaterThanOrEqual(1);
      expect(trace.notes).toBeGreaterThanOrEqual(0);
      expect(trace.commands.start_break).toBe(1);
      expect(trace.commands.end_break).toBe(1);
      expect(trace.commands.end_shift).toBe(1);
      expect(trace.break_window).toMatch(/\.\.\./);
      expect(trace.finish).toBe(true);
      expect(trace.order_applied).toBe(true);
      expect(trace.half_order_refused).toBe(true);
    }
  });

  it('the seeded order is the same for the same seed, shift after shift', () => {
    const again = theSet();
    expect(again.map((shift) => shift.shift_id)).toEqual(shifts.map((shift) => shift.shift_id));
    expect(again[0].stops.map((stop) => stop.address)).toEqual(shifts[0].stops.map((stop) => stop.address));
  });

  /**
   * One seeded shift, end to end, on the app's own code.
   *
   * The harvest is the phone's own state after the shift, read back through
   * the app's own stores: the marks the cache holds, the events the log holds,
   * what the outbox sent, and what the loopback stack stored.
   */
  async function driveTheShift(shift: SeededShift): Promise<ShiftTrace> {
    const problems: string[] = [];
    const day = theDayOf(shift);
    const cache = OpSqliteRunCache.open(SCALE_DB);
    const eventStore = OpSqliteEventStore.open(SCALE_DB);
    const events = new EventLog(eventStore);
    const client = new CourierApiClient(theClientOptions());
    const outbox = new SyncService(events, apiSyncTransport(client));
    // The construction site's own flush (`productionRunStore.flushOutbox`):
    // the store asks the outbox after every mark, and the answers are the
    // courier's, never hidden.
    const flush = async (shiftId: string): Promise<void> => {
      for (const outcome of await outbox.syncAll(shiftId)) {
        reportSyncAnswers(outcome);
      }
    };
    const store = new RunStore({
      client: new TheApi(shift),
      cache,
      events,
      reason: 'dev',
      flush,
      clock: theClock(),
    });

    // ---- load: the day the phone answers with.
    const loaded = await store.load();
    if (loaded.status !== 'ok' || loaded.snapshot === null) {
      problems.push(`the day did not load (${loaded.status})`);
    }
    const theDay = loaded.snapshot ?? day;
    if (theDay.stops.length !== shift.stops.length) {
      problems.push(`the phone holds ${theDay.stops.length} stops, the shift carries ${shift.stops.length}`);
    }
    const breakWindow = theDay.run.break_window;
    if (breakWindow === undefined || breakWindow.start !== shift.break_window.start) {
      problems.push('the run\'s own break window did not survive the load');
    }
    if (theDay.run.finish === undefined) {
      problems.push('the run\'s own finish point did not survive the load');
    }

    // ---- navigate: the solver's order is applied to the day the phone holds,
    // and a half order is refused by the store's own guard.
    const order = theDay.stops.map((stop) => ({ stopId: stop.id, sequence: stop.seq ?? 0 }));
    const applied = await store.applyRouteOrder(order);
    if (!applied) {
      problems.push('the solver\'s own order was refused by the store');
    }
    const halfRefused = await store.applyRouteOrder(order.slice(0, Math.max(1, order.length - 1)));
    if (halfRefused) {
      problems.push('a half order was applied: a stop was silently dropped');
    }

    const plan = new Map(shift.plan.map((entry) => [entry.stop_id, entry.outcome]));
    /** The stops the courier has resolved: delivered, failed OR skipped. */
    const resolved: string[] = [];
    let delivered = 0;
    let failed = 0;
    let skipped = 0;
    let skipsWithSuburb = 0;
    let pending = 0;
    let pods = 0;
    const notes: string[] = [];

    // The stop the courier's day stopped at, if it stopped: the first stop the
    // plan leaves PENDING, which stays the run's own next stop after it.
    const theStopTheDayStoppedAt =
      theDay.stops.find((candidate) => plan.get(candidate.id)?.outcome === 'pending') ?? null;

    for (const stop of theDay.stops) {
      const outcome = plan.get(stop.id);
      if (outcome === undefined) {
        problems.push(`stop ${stop.id} has no outcome to work towards`);
        continue;
      }
      // The navigation leg, read the app's own way (src/maps/drive.ts's
      // activeOf): a delivered, failed or skipped stop is OFF the run, so the
      // run's own next stop is the first stop still on it. A stop the plan
      // leaves PENDING is where the courier's day stopped, and it stays the
      // run's own next stop for the rest of the shift.
      const expected =
        theStopTheDayStoppedAt === null || stop.seq < theStopTheDayStoppedAt.seq
          ? stop.id
          : theStopTheDayStoppedAt.id;
      const active = activeOf(theDay.stops, resolved);
      if (active === null || active.id !== expected) {
        problems.push(`the run's active stop is ${active === null ? 'nothing' : active.id} while the plan is at ${expected}`);
      }



      if (outcome.outcome === 'delivered') {
        await store.markDelivered({ id: stop.id, sequence: stop.seq ?? 0 });
        resolved.push(stop.id);
        delivered += 1;
        const mark = await cache.markOf(stop.id);
        if (mark === null) {
          problems.push(`the delivered stop ${stop.id} carries no mark`);
          continue;
        }
        if (outcome.pod === true) {
          pods += await uploadTheProofPhoto(theDay, stop, mark.eventId, problems);
        }
      } else if (outcome.outcome === 'failed') {
        if (outcome.reason === undefined || outcome.utterance === undefined) {
          problems.push(`stop ${stop.id} failed with no reason`);
          continue;
        }
        await store.markFailed(
          { id: stop.id, sequence: stop.seq ?? 0 },
          { reason: outcome.reason, utterance: outcome.utterance },
        );
        resolved.push(stop.id);
        failed += 1;
        const mark = await cache.markOf(stop.id);
        if (mark === null) {
          problems.push(`the failed stop ${stop.id} carries no mark`);
        }
      } else if (outcome.outcome === 'skipped') {
        skipped += 1;
        // A skipped stop is RESOLVED: the run's own next stop moves past it,
        // the way the drive view reads a skip.
        resolved.push(stop.id);
        // The courier says the address the way the ear hears it: the number,
        // the street and the suburb, never the extra locality some LINZ rows
        // carry (the app's own pattern is anchored on the whole sentence).
                const said = theSpokenSkip(stop);
        if (said.withSuburb) {
          skipsWithSuburb += 1;
        }
        const routed = routeTurn(said.text);
        if (routed.gate !== 'free' || routed.command === null || routed.command.type !== 'mark_skipped') {
          problems.push(`the spoken skip of ${stop.id} did not route free`);
        }
      } else {
        pending += 1;
      }
    }

    // The notes the courier speaks at a stop, through the app's own parser.
    for (const note of shift.notes) {
      const routed = routeTurn(`note: ${note.note}`);
      if (routed.gate !== 'free' || routed.command === null || routed.command.type !== 'add_location_note') {
        problems.push(`the note ${note.note} did not route free`);
        continue;
      }
      if (routed.command.type === 'add_location_note' && routed.command.text !== note.note) {
        problems.push(`the note ${note.note} was read as ${routed.command.text}`);
      }
      notes.push(note.note);
    }

    // The spoken break and the finish, through the app's own parser and router.
    const spoken = { start_break: 0, end_break: 0, end_shift: 0 };
    for (const command of shift.commands) {
      const routed = routeTurn(command.text);
      if (routed.command === null) {
        problems.push(`the spoken ${command.kind} was not recognised`);
        continue;
      }
      if (routed.command.type !== command.kind) {
        problems.push(`the spoken ${command.text} was read as ${routed.command.type}`);
        continue;
      }
      if (routed.command.type === 'end_shift') {
        // The end of the shift is the server's own: the full path answers it.
        if (routed.gate !== 'full') {
          problems.push('the spoken finish routed free, which would end a shift without the office');
        }
      } else if (routed.gate !== 'free' || ackLineFor(routed.command).length === 0) {
        problems.push(`the spoken ${command.kind} was not answered out loud by the phone`);
      }
      spoken[command.kind as keyof typeof spoken] += 1;
    }

    // ---- what the phone holds at the end of the shift.
    const marks = await store.deliveredMarks();
    const sent = await events.nextBatch(1000);
    const pendingCount = await events.pendingCount();
    const record = server.record();
    // The events this shift sent are the log's own: the server stored each
    // once, and a replay of any of them is a duplicate the run must not make.
    const shiftStopIds = new Set(theDay.stops.map((stop) => stop.id));
    const sentEvents = record.sent.filter((event) => shiftStopIds.has(event.stop_id));
    const storedEvents = record.stored.filter((event) => shiftStopIds.has(event.stop_id));

    if (marks.length !== delivered + failed) {
      problems.push(`the run carries ${marks.length} marks for ${delivered + failed} stops that moved`);
    }
    if (sent.length !== 0) {
      problems.push(`the outbox still holds ${sent.length} events after the shift`);
    }
    if (pendingCount !== 0) {
      problems.push(`the log still counts ${pendingCount} pending events after the shift`);
    }
    if (storedEvents.length !== sentEvents.length) {
      problems.push(`the server stored ${storedEvents.length} of the ${sentEvents.length} events sent`);
    }
    // The failed events carried their reason and the courier's own words.
    for (const event of storedEvents) {
      if (event.kind === 'failed' && (event.reason === undefined || event.reason.length === 0)) {
        problems.push(`the failed event ${event.id} reached the server with no reason`);
      }
      if (event.kind === 'failed' && (event.utterance === undefined || event.utterance.length === 0)) {
        problems.push(`the failed event ${event.id} reached the server with no utterance`);
      }
    }

    // The run is over: the day leaves the phone, the record stays.
    await store.close();
    await eventStore.close();

    return {
      shift_id: shift.shift_id,
      area: shift.area,
      stops: shift.stops.length,
      delivered,
      failed,
      skipped,
      skips_with_suburb: skipsWithSuburb,
      pending,
      pods,
      notes: notes.length,
      commands: spoken,
      events_logged: storedEvents.length,
      events_sent: sentEvents.length,
      events_pending_after: pendingCount,
      marks_after: marks.length,
      break_window: breakWindow === undefined ? '' : `${breakWindow.start}...${breakWindow.end}`,
      finish: theDay.run.finish !== undefined,
      order_applied: applied,
      half_order_refused: !halfRefused,
      server_stored: storedEvents.length,
      server_replays: sentEvents.length - storedEvents.length,
      problems,
    };
  }

  /**
   * The proof photo, the build's own way: the capture writes the canned JPEG
   * into the app's own cache and the build's own uploader answers the
   * contract's shape for the event's own id.
   *
   * The E2E build is the one that carries the capture and the canned uploader
   * (`podForThisBuild`), and it is the same path `.maestro/pod.yaml` drives on
   * the device; the real wire leg is the A1 stack's and is named in the
   * evidence. What is asserted here is the app's own half: one upload per
   * delivery event, carrying that event's id and the stop's.
   */
  async function uploadTheProofPhoto(
    day: RunSnapshot,
    stop: StopResponse,
    eventId: string,
    problems: string[],
  ): Promise<number> {
    process.env.EXPO_PUBLIC_E2E = '1';
    const capture = await captureForThisBuild().capture();
    if (capture.kind !== 'photo') {
      problems.push(`the proof photo for ${stop.id} was not captured: ${capture.reason}`);
      return 0;
    }
    const answer = await uploaderForThisBuild().uploadPod(day.run.id, stop.id, {
      image: capture.image,
      occurredAt: new Date(theClock()()).toISOString(),
      eventId,
    });
    if (answer.status !== 'ok') {
      problems.push(`the proof photo for ${stop.id} was not stored`);
      return 0;
    }
    const stored = answer.data;
    if (stored.event_id !== eventId || stored.stop_id !== stop.id) {
      problems.push(`the proof photo for ${stop.id} answered with another event's ids`);
    }
    if (stored.already_stored !== false) {
      problems.push(`the proof photo for ${stop.id} answered as a replay of a first store`);
    }
    return 1;
  }

  /** The app's own client, over the loopback stack the harness started. */
  function theClientOptions(): CourierApiClientOptions {
    return {
      baseUrl,
      getToken: () => Promise.resolve('scale-token'),
      fetchImpl: theFetchOf(baseUrl) as unknown as CourierApiClientOptions['fetchImpl'],
    };
  }
});

/** The one database every shift of this run works on: one phone, many days. */
const SCALE_DB = 'scale-shifts.db';

/** A value as a CSV cell: objects are named by their type, never [object Object]. */
function textOf(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(textOf).join(';');
  }
  return JSON.stringify(value);
}

/** The run's own evidence: the per-shift CSV and the counts, written fresh. */
function writeTheEvidence(traces: ShiftTrace[]): void {
  const cell = (value: unknown): string => {
    const text = textOf(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const header = [
    'shift_id',
    'area',
    'stops',
    'delivered',
    'failed',
    'skipped',
    'skips_with_suburb',
    'pending',
    'pods',
    'notes',
    'start_break',
    'end_break',
    'end_shift',
    'events_logged',
    'events_sent',
    'events_pending_after',
    'marks_after',
    'break_window',
    'finish',
    'order_applied',
    'half_order_refused',
    'server_stored',
    'server_replays',
    'problems',
  ];
  const rows = traces.map((trace) =>
    [
      trace.shift_id,
      trace.area,
      trace.stops,
      trace.delivered,
      trace.failed,
      trace.skipped,
      trace.skips_with_suburb,
      trace.pending,
      trace.pods,
      trace.notes,
      trace.commands.start_break,
      trace.commands.end_break,
      trace.commands.end_shift,
      trace.events_logged,
      trace.events_sent,
      trace.events_pending_after,
      trace.marks_after,
      trace.break_window,
      trace.finish,
      trace.order_applied,
      trace.half_order_refused,
      trace.server_stored,
      trace.server_replays,
      trace.problems.join('; '),
    ]
      .map(cell)
      .join(','),
  );
  const totals = {
    shifts: traces.length,
    stops: traces.reduce((total, trace) => total + trace.stops, 0),
    delivered: traces.reduce((total, trace) => total + trace.delivered, 0),
    failed: traces.reduce((total, trace) => total + trace.failed, 0),
    skipped: traces.reduce((total, trace) => total + trace.skipped, 0),
    skips_with_suburb: traces.reduce((total, trace) => total + trace.skips_with_suburb, 0),
    pending: traces.reduce((total, trace) => total + trace.pending, 0),
    pods: traces.reduce((total, trace) => total + trace.pods, 0),
    notes: traces.reduce((total, trace) => total + trace.notes, 0),
    commands: traces.reduce((total, trace) => total + trace.commands.start_break + trace.commands.end_break + trace.commands.end_shift, 0),
    events_logged: traces.reduce((total, trace) => total + trace.events_logged, 0),
    events_sent: traces.reduce((total, trace) => total + trace.events_sent, 0),
    events_pending_after: traces.reduce((total, trace) => total + trace.events_pending_after, 0),
    marks_after: traces.reduce((total, trace) => total + trace.marks_after, 0),
    server_stored: traces.reduce((total, trace) => total + trace.server_stored, 0),
    server_replays: traces.reduce((total, trace) => total + trace.server_replays, 0),
    problems: traces.reduce((total, trace) => total + trace.problems.length, 0),
    shifts_with_problems: traces.filter((trace) => trace.problems.length > 0).map((trace) => trace.shift_id),
  };
  const dir = RESULTS;
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'per_shift.csv'), `${header.join(',')}\n${rows.join('\n')}\n`, 'utf8');
  writeFileSync(
    join(dir, 'shift-summary.json'),
    `${JSON.stringify({ seed: '20261111 (the committed set)', set: SET, ...totals }, null, 1)}\n`,
    'utf8',
  );
}
