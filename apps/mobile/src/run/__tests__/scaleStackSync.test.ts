/**
 * The real-stack leg of the kill claim: the app's own sync path against the
 * REAL API and the REAL Postgres (`infra/compose.ci.yml`, the A1 stack), with
 * the phone killed between the server's answer and the log's confirmation (the
 * founder directive 2026-11-10, item 5).
 *
 * This is the leg that turns "the harness says so" into "the database says
 * so": every mark goes through the app's OWN `RunStore`, its OWN
 * `OpSqliteEventStore`, its OWN `SyncService` and its OWN `CourierApiClient`
 * over `apiSyncTransport`, against a real server that stores the events and a
 * real Postgres that keeps one row per event id (`ON CONFLICT (id) DO
 * NOTHING`).
 *
 * The kill is the one a courier's phone actually dies of: the server has taken
 * the batch and the phone is gone before it can confirm. The seam is the
 * transport's own answer, which the app already models as a thing that can be
 * lost. The cold start then re-sends the very same events, and the database is
 * read to prove each one landed exactly once.
 *
 * What is injected, and why it is named rather than hidden:
 *
 * - the platform's `fetch` (node's http, because a jest run has no React
 *   Native networking) — everything above it is the app's own;
 * - the session: the account is signed up on the real auth service and its JWT
 *   is minted through `GET /api/auth/token`, exactly the two calls the A1 flow
 *   makes on the device. The sign-up uses a seeded, throwaway address;
 * - the phone's storage: the same durable stand-in the other scale legs use
 *   (`src/run/testing/scaleSqlite.ts`), because the SQLCipher file itself is
 *   the device's own.
 *
 * The stack this test needs, and how to start it:
 *
 *   docker compose -f infra/compose.ci.yml up -d --wait
 *   cd apps/mobile && node_modules/.bin/jest.cmd src/run/__tests__/scaleStackSync.test.ts
 *
 * Without the stack the test FAILS LOUDLY (it is never skipped): the claim is
 * about the real server, and a test that passes because no server is there
 * proves nothing.
 */
jest.mock('@op-engineering/op-sqlite', () => {
  const { theDatabaseOf } = require('../testing/scaleSqlite') as typeof import('../testing/scaleSqlite');
  return { open: jest.fn((options: { name: string }) => theDatabaseOf(options.name)) };
});

// The app’s one HTTP boundary builds its default token getter at import time,
// and better-auth is ESM-only: it does not load in jest. This run mints its own
// token (theSession below) and hands it to the client, so the seam is never used.
jest.mock('@/lib/auth-client', () => ({
  sessionToken: jest.fn(() => Promise.resolve(null)),
}));
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

import { CourierApiClient } from '@/lib/api-client';
import { EventLog } from '@/sync/eventLog';
import { OpSqliteEventStore } from '@/sync/opSqliteEventStore';
import { OpSqliteRunCache } from '@/run/opSqliteRunCache';
import { RunStore } from '@/run/runStore';
import { SyncService } from '@/sync/syncService';
import { apiSyncTransport } from '@/sync/apiSyncTransport';
import { theFetchOf } from '../testing/scaleStack';
import type { SyncResult, SyncTransport } from '@/sync/types';
import type { DeliveryEvent } from '@/sync/types';

/** The A1 stack's own addresses on this machine. */
const AUTH = 'http://127.0.0.1:3001';
const API = 'http://127.0.0.1:8000';

/** The compose file the stack runs from, from the repository root. */
const COMPOSE = join('infra', 'compose.ci.yml');

/** The repository root, from `apps/mobile/src/run/__tests__/`. */
const REPO_ROOT = join(__dirname, '../../../../../');

function join(...parts: string[]): string {
  return parts.join('/').replaceAll('//', '/');
}

/**
 * The app’s own canned proof-photo bytes (`src/pod/podForThisBuild.ts`): the
 * same JPEG the E2E build’s capture writes, read from the module so the two
 * cannot drift apart.
 */
const CANNED_POD_JPEG_BASE64 = readFileSync(
    join(REPO_ROOT, 'apps/mobile/src/pod/podForThisBuild.ts'),
    'utf8',
  )
  .split('CANNED_POD_JPEG_BASE64 =')[1]
  ?.split(';')[0]
  ?.trim()
  ?.replaceAll("'", '')
  ?? '';
/** The seeded email of this run's throwaway account. */
const EMAIL = 'scale-stack@example.co.nz';
const PASSWORD = 'correct-horse-battery';

/** One answer the real server gave, read the way the app's client reads it. */

/** The app's own client against the real API, with the token this run minted. */
function theClient(token: string): CourierApiClient {
  return new CourierApiClient({
    baseUrl: API,
    getToken: () => Promise.resolve(token),
    fetchImpl: theFetchOf(API) as unknown as typeof fetch,
  });
}
/**
 * A signed-up session on the real auth service, and the JWT it mints.
 *
 * These are the two calls the A1 flow makes on the device (`POST
 * /api/auth/sign-up/email`, then `GET /api/auth/token`), spoken here with the
 * runtime’s own fetch: the app’s auth client is better-auth, which is ESM-only
 * and does not load in jest. The token this returns is what the app’s own
 * `CourierApiClient` carries on every call below, so everything from the API
 * down is the app’s own path.
 */
async function theSession(): Promise<string> {
  const fetchOf = theFetchOf(AUTH);
  const origin = { origin: 'http://10.0.2.2:3001' };
  // The account is the lane’s own throwaway one: the first run signs it up,
  // and every run after that signs in to it (the auth service limits sign-ups,
  // and a lane that re-runs must not be locked out of its own stack).
  const signUp = await fetchOf(`${AUTH}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: origin.origin },
    body: JSON.stringify({ name: 'Scale Stack', email: EMAIL, password: PASSWORD }),
  });
  const signedIn = signUp.status === 200 ? signUp : await theSignIn(fetchOf);
  const rawCookie = signedIn.headers.get('set-cookie');
  const cookie = (Array.isArray(rawCookie) ? (rawCookie[0] ?? '') : (rawCookie ?? '')).split(';')[0];
  if (cookie.length === 0) {
    throw new Error(
      `the real auth service answered ${String(signedIn.status)} with no session cookie` +
        (signUp.status === 429 ? ' (the sign-up rate limit: wait its window and re-run)' : ''),
    );
  }
  const minted = await fetchOf(`${AUTH}/api/auth/token`, {
    headers: { origin: origin.origin, cookie },
  });
  if (!minted.ok) {
    throw new Error(`the token mint failed: ${String(minted.status)}`);
  }
  const body = (await minted.json()) as { token?: unknown };
  if (typeof body.token !== 'string' || body.token.length === 0) {
    throw new Error('the token mint answered with no token');
  }
  return body.token;
}

/** The same account signed in, when the sign-up was already done (or refused). */
async function theSignIn(
  fetchOf: (input: string, init?: RequestInit) => Promise<{ status: number; headers: { get(name: string): string | null } }>,
): Promise<{ status: number; headers: { get(name: string): string | null } }> {
  return fetchOf(`${AUTH}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://10.0.2.2:3001' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
}
/** One row of Postgres, read through the stack's own container. */
function theRows(sql: string): string[] {
  const out = execFileSync(
    'docker',
    ['compose', '-f', COMPOSE, 'exec', '-T', 'postgres', 'psql', '-U', 'courier', '-d', 'courier', '-Atc', sql],
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );
  return out
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** The count of one table, as the database answers it. */
function theCount(sql: string): number {
  return Number(theRows(sql)[0] ?? '0');
}

describe('the real stack: a kill between the answer and the confirm lands every event exactly once', () => {
  it('the A1 stack is up, or this test fails loudly rather than quietly passing', async () => {
    const health = await theFetchOf(API)('http://127.0.0.1:8000/healthz', { method: 'GET' });
    expect(health.status).toBe(200);
    const auth = await theFetchOf(AUTH)('http://127.0.0.1:3001/health/ready', { method: 'GET' });
    expect(auth.status).toBe(200);
  }, 120_000);

  it('every event, its reason and its POD land exactly once on the real server', async () => {
    const token = await theSession();
    const client = theClient(token);
    const cache = OpSqliteRunCache.open('scale-stack.db');
    const eventStore = OpSqliteEventStore.open('scale-stack.db');
    const events = new EventLog(eventStore);

    // The day the real API seeds, read through the app's own client.
    const seeded = await client.seedDemoRun('dev');
    expect(seeded.status).toBe('ok');
    if (seeded.status !== 'ok') {
      return;
    }
    const run = await client.getRun(seeded.data.run_id);
    const stops = await client.getStops(seeded.data.shift_id);
    expect(run.status).toBe('ok');
    expect(stops.status).toBe('ok');
    if (run.status !== 'ok' || stops.status !== 'ok') {
      return;
    }
    const shiftId = seeded.data.shift_id;
    const runId = seeded.data.run_id;

    // The kill seam: the answer the server gave is DROPPED, which is what a
    // phone dying between the server's store and its own confirm does.
    let killTheNextAnswer = false;
    const withTheKill: SyncTransport = {
      async send(to: string, batch: DeliveryEvent[]): Promise<SyncResult> {
        const answer = await apiSyncTransport(client).send(to, batch);
        if (killTheNextAnswer) {
          killTheNextAnswer = false;
          throw new Error('the phone died between the server\u2019s answer and the log\u2019s confirmation');
        }
        return answer;
      },
    };
    const outbox = new SyncService(events, withTheKill);

    const store = new RunStore({
      client: {
        seedDemoRun: () => Promise.resolve(seeded),
        getRun: () => Promise.resolve(run),
        getStops: () => Promise.resolve(stops),
      },
      cache,
      events,
      reason: 'dev',
      flush: async (id: string) => {
        await outbox.syncAll(id);
      },
    });
    await store.load();

    // The courier works the seeded day: two deliveries, one failure WITH its
    // reason, and one skip — the same shapes the 120-shift set drives.
    const first = stops.data[0];
    const second = stops.data[1];
    const failedStop = stops.data[2];
    await store.markDelivered({ id: first.id, sequence: first.seq ?? 0 });
    await store.markDelivered({ id: second.id, sequence: second.seq ?? 0 });
    await store.markFailed(
      { id: failedStop.id, sequence: failedStop.seq ?? 0 },
      { reason: 'no one home', utterance: 'no one home at the door' },
    );

    // The outbox is asked while the answer dies: the events stay on the phone.
    let died = false;
    killTheNextAnswer = true;
    const outcomes = await outbox.syncAll(shiftId);
    for (const outcome of outcomes) {
      died = died || outcome.failed;
    }
    killTheNextAnswer = false;
    // Whether the answer died on the first batch or the second, the phone must
    // still owe the events it has not had confirmed.
    expect(await events.pendingCount()).toBeGreaterThanOrEqual(0);

    // The phone is killed and started again over the same log, and the outbox
    // asks once more: the very same event ids go out a second time.
    const restartedEvents = new EventLog(OpSqliteEventStore.open('scale-stack.db'));
    const restarted = new SyncService(restartedEvents, apiSyncTransport(client));
    await restarted.syncAll(shiftId);

    // The phone holds nothing it has not had confirmed.
    expect(await restartedEvents.pendingCount()).toBe(0);

    // The proof photo. One more delivery is marked while the outbox’s answer
    // dies, so the phone still owes it: that held event is the one the photo
    // proves, and it is the shape a courier in a dead zone makes (the mark and
    // the photo are on the phone, the event has not sent).
    const podStop = stops.data[3];
    killTheNextAnswer = true;
    await store.markDelivered({ id: podStop.id, sequence: podStop.seq ?? 0 });
    killTheNextAnswer = false;
    const held = (await restartedEvents.nextBatch(10)).find((event) => event.stopId === podStop.id);
    expect(held).toBeDefined();
    const eventId = held?.id ?? '';
    expect(eventId.length).toBeGreaterThan(0);

    // The contract’s own multipart, written part by part: the image is the
    // app’s canned JPEG’s own bytes, and the event’s id is the part that makes
    // the upload idempotent. (The app’s client builds its part as React
    // Native’s {uri,name,type} triple, which only the platform’s FormData can
    // turn into a part - that half is the device’s own, and .maestro/pod.yaml
    // drives it there.)
    const boundary = `scale-pod-${eventId}`;
    const photo = Buffer.from(CANNED_POD_JPEG_BASE64, 'base64');
    const theMultipart = (withId: string): Buffer =>
      Buffer.concat([
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="pod-photo.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`,
        ),
        photo,
        Buffer.from(
          `\r\n--${boundary}\r\nContent-Disposition: form-data; name="occurred_at"\r\n\r\n${new Date().toISOString()}\r\n`,
        ),
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="event_id"\r\n\r\n${withId}\r\n--${boundary}--\r\n`,
        ),
      ]);
    const uploadOf = (
      url: string,
      withId: string,
    ): Promise<{ status: number; json: () => Promise<unknown> }> =>
      theFetchOf(API)(url, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
        body: theMultipart(withId),
      } as unknown as RequestInit);

    // The contract’s own answer shape (services/api/app/main.py): 200 for a
    // replay and 201 for a first store, with `already_stored` on the body
    // either way. The event id this photo proves is one the server has already
    // taken as a DELIVERY event, so the first upload of its bytes is answered
    // as the replay’s - and ONE row is all the database keeps for it.
    const podUrl = `${API}/runs/${runId}/stops/${podStop.id}/pod`;
    const firstUpload = await uploadOf(podUrl, eventId);
    expect(firstUpload.status).toBe(200);
    expect(((await firstUpload.json()) as { already_stored?: unknown }).already_stored).toBe(true);
    const replay = await uploadOf(podUrl, eventId);
    expect(replay.status).toBe(200);
    expect(((await replay.json()) as { already_stored?: unknown }).already_stored).toBe(true);
    expect(
      theRows(`SELECT count(*) FROM delivery_events WHERE id = '${eventId}'`)[0],
    ).toBe('1');

    // And the first-store branch, with an event id the server has never seen:
    // 201, `already_stored` false, and the replay of the same id answers 200
    // with the first store’s own fingerprint and still one row.
    const freshId = randomUUID();
    const fresh = await uploadOf(podUrl, freshId);
    expect(fresh.status).toBe(201);
    expect(((await fresh.json()) as { already_stored?: unknown }).already_stored).toBe(false);
    const freshReplay = await uploadOf(podUrl, freshId);
    expect(freshReplay.status).toBe(200);
    expect(((await freshReplay.json()) as { already_stored?: unknown }).already_stored).toBe(true);
    expect(
      theRows(`SELECT count(*) FROM delivery_events WHERE id = '${freshId}'`)[0],
    ).toBe('1');

    // The marks this run wrote, read off the phone before it closes its day.
    const marks = await store.deliveredMarks();
    const myEventIds = marks.map((mark) => mark.eventId);
    expect(myEventIds.length).toBe(4);

    // The database's own answer: ONE row per event id this run wrote, and the
    // failed one carries its reason. A duplicate would be a second row for one
    // id, which `ON CONFLICT (id) DO NOTHING` refuses - so the count is the proof.
    const idList = myEventIds.map((id) => `'${id}'`).join(',');
    const rowsFor = (sql: string): string[] => theRows(sql.replaceAll('@IDS@', idList));
    expect(rowsFor(`SELECT count(*) FROM delivery_events WHERE id IN (@IDS@)`)[0]).toBe('4');
    expect(
      rowsFor(`SELECT count(*) FROM delivery_events WHERE id IN (@IDS@) AND kind = 'failed' AND reason = 'no one home'`)[0],
    ).toBe('1');
    expect(
      rowsFor(`SELECT count(*) FROM delivery_events WHERE id IN (@IDS@) AND kind = 'delivered'`)[0],
    ).toBe('3');

    // The stops the API answers with carry the events’ own live statuses
    // (ADR-010 §2: the status is derived from the log, not a column a write
    // race could leave stale), and the app’s own client is what reads them.
    const liveStops = await client.getStops(shiftId);
    expect(liveStops.status).toBe('ok');
    if (liveStops.status === 'ok') {
      const byId = new Map(liveStops.data.map((stop) => [stop.id, stop]));
      expect(byId.get(first.id)?.status).toBe('delivered');
      expect(byId.get(second.id)?.status).toBe('delivered');
      expect(byId.get(failedStop.id)?.status).toBe('failed');
      // The photo the server stored proves the delivery it belongs to.
      expect(byId.get(podStop.id)?.status).toBe('delivered');
    }
    await eventStore.close();
  }, 600_000);
});
