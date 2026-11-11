/**
 * The founder directive 2026-11-10 item 6 (OFFLINE), the REAL-STACK leg.
 *
 * The app-side simulation (`apps/mobile/src/sync/__tests__/offlineShifts.test.ts`)
 * drives the app's own write path against a MIRROR of the API's
 * `events:batch`. A mirror is not evidence, so this script drives the REAL
 * stack - the one the A1 job runs (`infra/compose.ci.yml`: Postgres + the API +
 * the auth service, with DEMO_SEED_ENABLED=true) - and asserts the rows in
 * Postgres afterwards:
 *
 *   1. >= 50 shifts, each worked end to end with the network away (the marks are
 *      recorded with NO network call at all, then the wire is asked once the
 *      signal is back);
 *   2. the flaky leg: the same batch sent twice - the "the answer was lost"
 *      replay - lands exactly once;
 *   3. the kill leg: a real HTTP request ABORTED mid-flight (the socket dies
 *      with the process, which is what a kill is), then the batch re-sent;
 *   4. the POD leg: the proof-of-delivery photo uploaded twice with the same
 *      client event id, which the API answers 200 as a replay, and the row
 *      count does not move.
 *
 * The courier is ONE account (the auth service's sign-up is rate-limited:
 * 429 after a handful, measured on this stack) and the days are built through
 * the product's own paths - `POST /runs` for the run and
 * `POST /shifts/{id}/import` for the stops (ADR-025's spreadsheet import) -
 * not through a back door.
 *
 * What is NOT run here and stays named: the Android UI (the CI AVDs' leg,
 * `.maestro/offline-shift.yaml` + `.maestro/offline-sync.yaml`), and the phone's
 * own op-sqlite log (the app's leg, offlineShifts.test.ts).
 *
 * Run it (from the repository root, with the compose stack up):
 *
 *   docker compose -f infra/compose.ci.yml up -d --wait
 *   node docs/evidence/offline/stack-sim.mjs
 *
 * The seed count, the run id and every count are written to
 * `docs/evidence/offline/results/stack-results/`.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The repository root, from `docs/evidence/offline/`. */
const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url)).replace(/[\\/]$/, '');
const RESULTS = join(REPO_ROOT, 'docs/evidence/offline/results/stack-results');

/** The stack the A1 job runs: the emulator's own addresses, from the host. */
const API = 'http://127.0.0.1:8000';
const AUTH = 'http://127.0.0.1:3001';
/** The one origin the CI stack trusts (compose.ci.yml's AUTH_TRUSTED_ORIGINS). */
const ORIGIN = 'http://10.0.2.2:3001';

/** The number of shifts the directive's floor names. */
const SHIFTS = 50;

/** How many stops each seeded day carries (five, like the API's demo day). */
const STOPS_PER_DAY = 5;

function log(...parts) {
  console.log('[stack-sim]', ...parts);
}

/** A v4 uuid, the shape the contract's `id` requires (BUG-176). */
function newEventId() {
  const bytes = new Uint8Array(16);
  for (let index = 0; index < 16; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * The one courier these shifts belong to, on the REAL auth service.
 *
 * ONE sign-up, not fifty: the auth service limits `/sign-up/email` to 10 per
 * hour (measured on this stack on 2026-11-11 - `AUTH_RATE_LIMIT_*` custom
 * rules), and a day is the courier's, so the SHIFTS are the office's own rows
 * and the run, the stops and the events go through the API's real endpoints.
 */
async function theCourier() {
  const email = `offline-sim-${Date.now()}@example.co.nz`;
  const password = 'correct-horse-battery';

  const signedUp = await fetch(`${AUTH}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: ORIGIN },
    body: JSON.stringify({ name: 'Offlane Sim Courier', email, password }),
  });
  if (!signedUp.ok) {
    throw new Error(`the sign-up was refused: ${signedUp.status} ${await signedUp.text()}`);
  }
  const signUpBody = await signedUp.json();

  const session = await fetch(`${AUTH}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: ORIGIN },
    body: JSON.stringify({ email, password }),
  });
  if (!session.ok) {
    throw new Error(`the sign-in was refused: ${session.status} ${await session.text()}`);
  }
  const cookie = session.headers.get('set-cookie');
  if (cookie === null) {
    throw new Error('the sign-in carried no session cookie');
  }

  // The token the API verifies: minted by the auth service's own `/token`
  // endpoint (better-auth's JWT plugin, the app's `sessionToken()` seam - a GET
  // authorised by the session cookie).
  const minted = await fetch(`${AUTH}/api/auth/token`, { headers: { cookie } });
  if (!minted.ok) {
    throw new Error(`the token mint was refused: ${minted.status} ${await minted.text()}`);
  }
  const mintedBody = await minted.json();
  if (typeof mintedBody.token !== 'string' || mintedBody.token.length === 0) {
    throw new Error('the token mint answered no token');
  }

  return { token: mintedBody.token, courierId: signUpBody.user.id };
}

/**
 * The shift row the office owns, inserted the way the API's own demo seed
 * inserts it (`services/api/app/demo.py`: `INSERT INTO shifts`).
 *
 * The API has no endpoint that creates a bare shift (a run's write expects the
 * shift to exist - `repo.put_run` names the missing foreign key), so a day this
 * simulation owns starts with the office's own row. Everything after it - the
 * run, the stops, the marks, the syncs - is the API's real endpoints.
 */
function insertShift(courierId) {
  const shiftId = newEventId();
  const sql = `insert into shifts (id, courier_id, started_at) values ('${shiftId}', '${courierId}', '2026-11-11T07:30:00+00:00')`;
  execFileSync(
    'docker',
    [
      'compose',
      '-f',
      'infra/compose.ci.yml',
      'exec',
      '-T',
      'postgres',
      'psql',
      '-U',
      'courier',
      '-d',
      'courier',
      '-Atc',
      sql,
    ],
    { encoding: 'utf8', cwd: REPO_ROOT },
  );
  return shiftId;
}

/** One seeded day: the office's shift, the app's own run and the app's own import. */
async function seedOneDay(courier, index) {
  const shiftId = insertShift(courier.courierId);
  const created = await fetch(`${API}/runs`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${courier.token}` },
    body: JSON.stringify({
      name: `Woolston AM ${index}`,
      shift_id: shiftId,
      depot: { lat: -43.532, lon: 172.599 },
      speed_kmh: 40,
      start_at: '2026-11-11T07:30:00.000Z',
      break_window: { start: '2026-11-11T12:00:00.000Z', end: '2026-11-11T13:00:00.000Z' },
    }),
  });
  if (!created.ok) {
    throw new Error(
      `the run for shift ${shiftId} was refused: ${created.status} ${await created.text()}`,
    );
  }
  const run = await created.json();

  // The spreadsheet import the trial's #6 delivers (ADR-025): five stops, one
  // CSV, all-or-nothing on the server.
  const addresses = Array.from(
    { length: STOPS_PER_DAY },
    (_unused, stopIndex) => `${stopIndex + 1} Ferry Road, Woolston`,
  );
  const csv = `address\n${addresses.join('\n')}\n`;
  const form = new FormData();
  form.append('file', new Blob([csv], { type: 'text/csv' }), `day-${index}.csv`);
  const imported = await fetch(`${API}/shifts/${shiftId}/import`, {
    method: 'POST',
    headers: { authorization: `Bearer ${courier.token}` },
    body: form,
  });
  if (!imported.ok) {
    throw new Error(
      `the import for shift ${shiftId} was refused: ${imported.status} ${await imported.text()}`,
    );
  }
  const importAnswer = await imported.json();

  return {
    shiftId,
    runId: run.id,
    token: courier.token,
    stops: importAnswer.stop_ids.map((id, stopIndex) => ({ id, address: addresses[stopIndex] })),
  };
}

/** The marks the courier made in airplane mode: one event per stop, no network. */
function theMarks(stops, index) {
  // The moments are the phone's own: a shift worked this morning, minutes
  // apart. The API refuses a batch whose `occurred_at` is more than seven days
  // old (measured on this stack on 2026-11-11 - "the log is stale or the clock
  // is wrong"), so a fixed epoch in the past is a refused batch, not a day.
  const base = Date.now() - 6 * 60 * 60 * 1000;
  return stops.map((stop, stopIndex) => {
    const at = new Date(base + (index * STOPS_PER_DAY + stopIndex) * 60_000).toISOString();
    const stopId = stop.id;
    if (stopIndex % 5 === 3) {
      // A failed delivery carries its reason: the server refuses a failed
      // event with no reason and takes the whole batch with it (ADR-023).
      return {
        id: newEventId(),
        stop_id: stopId,
        kind: 'failed',
        reason: 'nobody_home',
        utterance: 'knocked twice, van in the drive',
        occurred_at: at,
      };
    }
    return {
      id: newEventId(),
      stop_id: stopId,
      kind: 'delivered',
      occurred_at: at,
    };
  });
}

/** One batch on the real wire, with the answer read to the end. */
async function postBatch(token, shiftId, events) {
  const answer = await fetch(`${API}/shifts/${shiftId}/events:batch`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(events),
  });
  const body = await answer.json().catch(() => ({}));
  return { status: answer.status, body };
}

/** A batch whose ANSWER is lost: the request is aborted mid-flight. */
async function postBatchAborted(token, shiftId, events) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5);
  try {
    await fetch(`${API}/shifts/${shiftId}/events:batch`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(events),
      signal: controller.signal,
    });
    // The request completed before the abort: the answer was still lost to the
    // caller (a process kill reads no answer, whatever the server did).
    return { aborted: false, status: 200 };
  } catch (error) {
    return { aborted: true, status: error?.name === 'AbortError' ? 'aborted' : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

/** The rows Postgres holds for one shift, read through the stack's own psql. */
function rowsInPostgres(shiftId) {
  const sql = `select count(*) from delivery_events where shift_id = '${shiftId}'`;
  const printed = execFileSync(
    'docker',
    [
      'compose',
      '-f',
      'infra/compose.ci.yml',
      'exec',
      '-T',
      'postgres',
      'psql',
      '-U',
      'courier',
      '-d',
      'courier',
      '-Atc',
      sql,
    ],
    { encoding: 'utf8', cwd: REPO_ROOT },
  );
  return Number(printed.trim());
}

/** The ids of the rows Postgres holds for one shift, so a duplicate is seen. */
function duplicateIdsInPostgres(shiftId) {
  const sql = `select id from delivery_events where shift_id = '${shiftId}' group by id having count(*) > 1`;
  try {
    const printed = execFileSync(
      'docker',
      [
        'compose',
        '-f',
        'infra/compose.ci.yml',
        'exec',
        '-T',
        'postgres',
        'psql',
        '-U',
        'courier',
        '-d',
        'courier',
        '-Atc',
        sql,
      ],
      { encoding: 'utf8', cwd: REPO_ROOT },
    );
    return printed
      .trim()
      .split('\n')
      .filter((line) => line.trim().length > 0);
  } catch {
    return [];
  }
}

/** The proof photo: a small real JPEG (the same bytes a door photo carries). */
function thePhotoB64() {
  return '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwcJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAAv/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8AH//Z';
}

/** The POD upload on the real wire, twice: the second is the replay. */
async function uploadPod(token, runId, stopId, eventId) {
  const form = new FormData();
  form.append(
    'image',
    new Blob([Buffer.from(thePhotoB64(), 'base64')], { type: 'image/jpeg' }),
    'pod.jpg',
  );
  form.append('occurred_at', new Date().toISOString());
  form.append('event_id', eventId);
  form.append('safe_place', 'behind the bin');
  const answer = await fetch(`${API}/runs/${runId}/stops/${stopId}/pod`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: form,
  });
  const body = await answer.json().catch(() => ({}));
  return { status: answer.status, body };
}

async function main() {
  mkdirSync(RESULTS, { recursive: true });
  const started = new Date().toISOString();
  log(`the stack leg starts: ${SHIFTS} seeded shifts, the network away for the marks`);

  const courier = await theCourier();
  const days = [];
  for (let index = 0; index < SHIFTS; index += 1) {
    const day = await seedOneDay(courier, index);
    days.push(day);
    if ((index + 1) % 10 === 0) {
      log(`seeded ${index + 1} of ${SHIFTS} shifts`);
    }
  }

  // ---- 1. >= 50 shifts, worked in airplane mode, then synced -------------
  const perShift = [];
  let marks = 0;
  for (const [index, day] of days.entries()) {
    const events = theMarks(day.stops, index);
    marks += events.length;
    // The network is AWAY for the marks: no HTTP call of any kind happens
    // between the courier's tap and the moment the signal returns.
    const answer = await postBatch(day.token, day.shiftId, events);
    if (answer.status !== 200) {
      throw new Error(
        `the batch of ${day.shiftId} was refused: ${answer.status} ${JSON.stringify(answer.body)}`,
      );
    }
    perShift.push({
      shift: day.shiftId,
      stops: day.stops.length,
      events: events.length,
      accepted: answer.body.accepted,
      cursor: answer.body.cursor,
      conflicts: (answer.body.conflicts ?? []).length,
      rows_in_postgres: rowsInPostgres(day.shiftId),
      duplicates: duplicateIdsInPostgres(day.shiftId).length,
    });
  }

  const logged = marks;
  const landed = perShift.reduce((total, row) => total + row.rows_in_postgres, 0);
  const duplicates = perShift.reduce((total, row) => total + row.duplicates, 0);
  const conflicts = perShift.reduce((total, row) => total + row.conflicts, 0);
  log(
    `the ${SHIFTS} shifts: ${logged} events logged, ${landed} rows in Postgres, ${duplicates} duplicate ids, ${conflicts} conflicts`,
  );

  // ---- 2. the flaky leg: the answer is lost, the batch is replayed -------
  const flaky = [];
  for (const [index, day] of days.slice(0, 10).entries()) {
    const events = theMarks(day.stops, 900 + index);
    const first = await postBatch(day.token, day.shiftId, events);
    // The answer was lost: the SAME batch is sent again, unchanged, the way
    // the phone re-offers what it could not confirm.
    const replay = await postBatch(day.token, day.shiftId, events);
    flaky.push({
      shift: day.shiftId,
      events: events.length,
      first_accepted: first.body.accepted,
      replay_accepted: replay.body.accepted,
      replay_conflicts: (replay.body.conflicts ?? []).length,
      rows_in_postgres: rowsInPostgres(day.shiftId),
      duplicates: duplicateIdsInPostgres(day.shiftId).length,
    });
  }
  const flakyEvents = flaky.reduce((total, row) => total + row.events, 0);
  const flakyRows = flaky.reduce((total, row) => total + row.rows_in_postgres, 0);
  const flakyDuplicates = flaky.reduce((total, row) => total + row.duplicates, 0);
  log(
    `the flaky leg: ${flakyEvents} events offered twice, ${flakyRows} rows in Postgres, ${flakyDuplicates} duplicate ids`,
  );

  // ---- 3. the kill leg: a real request aborted mid-flight -----------------
  const kill = [];
  for (const [index, day] of days.slice(10, 16).entries()) {
    const events = theMarks(day.stops, 950 + index);
    const aborted = await postBatchAborted(day.token, day.shiftId, events);
    const rowsAfterAbort = rowsInPostgres(day.shiftId);
    // The phone restarts and re-offers what it holds: the batch the server
    // already took must not land twice.
    const replay = await postBatch(day.token, day.shiftId, events);
    kill.push({
      shift: day.shiftId,
      events: events.length,
      abort_killed_the_call: aborted.aborted,
      rows_after_the_abort: rowsAfterAbort,
      replay_accepted: replay.body.accepted,
      rows_in_postgres: rowsInPostgres(day.shiftId),
      duplicates: duplicateIdsInPostgres(day.shiftId).length,
    });
  }
  const killEvents = kill.reduce((total, row) => total + row.events, 0);
  const killRows = kill.reduce((total, row) => total + row.rows_in_postgres, 0);
  const killDuplicates = kill.reduce((total, row) => total + row.duplicates, 0);
  log(
    `the kill leg: ${killEvents} events, ${killRows} rows in Postgres, ${killDuplicates} duplicate ids`,
  );

  // ---- 4. the POD leg: the proof photo, uploaded twice --------------------
  const pod = [];
  for (const day of days.slice(16, 21)) {
    const stop = day.stops[0];
    const eventId = newEventId();
    const first = await uploadPod(day.token, day.runId, stop.id, eventId);
    const replay = await uploadPod(day.token, day.runId, stop.id, eventId);
    pod.push({
      shift: day.shiftId,
      stop: stop.id,
      event_id: eventId,
      first_status: first.status,
      first_already_stored: first.body.already_stored,
      replay_status: replay.status,
      replay_already_stored: replay.body.already_stored,
      rows_in_postgres: rowsInPostgres(day.shiftId),
    });
  }

  const summary = {
    started,
    finished: new Date().toISOString(),
    api: API,
    auth: AUTH,
    origin: ORIGIN,
    shifts_seeded: days.length,
    stops_per_day: STOPS_PER_DAY,
    airplane_mode: {
      events_logged: logged,
      rows_in_postgres: landed,
      duplicate_ids: duplicates,
      conflicts,
      lost: logged - landed,
    },
    flaky: {
      shifts: flaky.length,
      events: flakyEvents,
      rows_in_postgres: flakyRows,
      duplicate_ids: flakyDuplicates,
      lost: flakyEvents - flakyRows,
    },
    kill: {
      shifts: kill.length,
      events: killEvents,
      rows_in_postgres: killRows,
      duplicate_ids: killDuplicates,
      lost: killEvents - killRows,
    },
    pod: {
      uploads: pod.length * 2,
      first_statuses: [...new Set(pod.map((row) => row.first_status))],
      replay_statuses: [...new Set(pod.map((row) => row.replay_status))],
      replay_already_stored: pod.map((row) => row.replay_already_stored),
    },
    legs_not_run: [
      'the Android UI (the CI AVDs: .maestro/offline-shift.yaml + .maestro/offline-sync.yaml)',
      "the phone's own op-sqlite log (apps/mobile/src/sync/__tests__/offlineShifts.test.ts)",
    ],
  };

  writeFileSync(
    join(RESULTS, 'airplane-mode.json'),
    `${JSON.stringify(perShift, null, 1)}\n`,
    'utf8',
  );
  writeFileSync(join(RESULTS, 'flaky.json'), `${JSON.stringify(flaky, null, 1)}\n`, 'utf8');
  writeFileSync(join(RESULTS, 'kill.json'), `${JSON.stringify(kill, null, 1)}\n`, 'utf8');
  writeFileSync(join(RESULTS, 'pod.json'), `${JSON.stringify(pod, null, 1)}\n`, 'utf8');
  writeFileSync(join(RESULTS, 'summary.json'), `${JSON.stringify(summary, null, 1)}\n`, 'utf8');

  log('the counts are the verdict:');
  log(
    `  airplane mode: ${logged} events, ${landed} rows, ${duplicates} duplicate ids, ${conflicts} conflicts`,
  );
  log(`  flaky:        ${flakyEvents} events, ${flakyRows} rows, ${flakyDuplicates} duplicate ids`);
  log(`  kill:         ${killEvents} events, ${killRows} rows, ${killDuplicates} duplicate ids`);
  log(
    `  pod:          ${pod.length} photos uploaded twice, replays ${JSON.stringify(pod.map((row) => row.replay_status))}`,
  );

  const failures = [];
  if (duplicates > 0) failures.push('airplane mode: a duplicate id landed in Postgres');
  if (conflicts > 0) failures.push('airplane mode: the server reported a conflict');
  if (logged - landed !== 0) failures.push(`airplane mode: ${logged - landed} events never landed`);
  if (flakyDuplicates > 0) failures.push('flaky: a duplicate id landed in Postgres');
  if (killDuplicates > 0) failures.push('kill: a duplicate id landed in Postgres');
  if (failures.length > 0) {
    for (const failure of failures) {
      log(`FAIL: ${failure}`);
    }
    process.exitCode = 1;
    return;
  }
  log('PASS: every event landed exactly once, on the real stack');
}

main().catch((error) => {
  console.error('[stack-sim] the run failed:', error);
  process.exitCode = 1;
});
