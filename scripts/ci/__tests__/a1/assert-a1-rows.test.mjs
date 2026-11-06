// The test for the a1 rows assert (scripts/ci/assert-a1-rows.sh).
//
//   node --test scripts/ci/__tests__/a1/assert-a1-rows.test.mjs
//
// BUG-188: run 41656905474's a1 job failed "expected 4 delivery events ...
// found 3" while every one of the three flows had PASSED. The app had recorded
// the fourth delivery on the phone and the outbox sent it on its own retry
// (15 s), which lands seconds after the sync flow's last screen - so the
// runner's immediate count was a race it could lose. The assert now waits,
// bounded, for the count the flow performed.
//
// This suite lives OUTSIDE the repo's standard script glob, on purpose: it
// needs a real Postgres, and the stack that has one is the a1 E2E job's own
// compose project (infra/compose.ci.yml) - the same database the assert step
// itself reads. The Android E2E workflow runs it there, right after the rows
// assert it guards. Locally it runs against the same stack replayed with
// `docker compose -f infra/compose.ci.yml up -d`, and the psql the script
// calls is forwarded into the container on machines whose psql is the
// container's own.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const SCRIPT = path.join(ROOT, 'scripts', 'ci', 'assert-a1-rows.sh');
const SCHEMA = path.join(ROOT, 'packages', 'contracts', 'db', 'schema.sql');
// The compose project the a1 job starts - the name the compose file itself
// carries (infra/compose.ci.yml), so the suite needs no hardcoded guess. A
// local replay under its own project sets COMPOSE_PROJECT_NAME.
const PROJECT = process.env.COMPOSE_PROJECT_NAME || 'courier-ci';

/** A synchronous pause, so a wait needs no timer on any platform. */
const pause = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

function compose(args, options = {}) {
  return execFileSync(
    'docker',
    ['compose', '-f', path.join(ROOT, 'infra', 'compose.ci.yml'), '-p', PROJECT, ...args],
    { encoding: 'utf8', env: process.env, ...options },
  );
}

function psql(sql) {
  return compose([
    'exec', '-T', 'postgres', 'psql', '-U', 'courier', '-d', 'courier',
    '-v', 'ON_ERROR_STOP=1', '-Atc', sql,
  ]);
}

/** The shell the script runs under: bash on the runners, Git's bash on Windows. */
function bashPath() {
  if (process.env.BASH) {
    return process.env.BASH;
  }
  const gitBash = 'C:\\Program Files\\Git\\bin\\bash.exe';
  return existsSync(gitBash) ? gitBash : 'bash';
}

/**
 * A `psql` that forwards into the compose Postgres, for a machine whose psql
 * is the container's own: the host and port flags the script passes are
 * dropped, because the container answers on its own socket.
 */
function psqlShim() {
  const dir = path.join(os.tmpdir(), 'a1-rows-assert-psql');
  mkdirSync(dir, { recursive: true });
  const shim = path.join(dir, 'psql');
  writeFileSync(
    shim,
    [
      '#!/usr/bin/env bash',
      'args=()',
      'while [ $# -gt 0 ]; do',
      '  case "$1" in',
      '    -h) shift 2 ;;',
      '    -p) shift 2 ;;',
      '    *) args+=("$1"); shift ;;',
      '  esac',
      'done',
      `exec docker compose -f "${path.join(ROOT, 'infra', 'compose.ci.yml')}" -p "${PROJECT}" exec -T postgres psql "\${args[@]}"`,
      '',
    ].join('\n'),
  );
  chmodSync(shim, 0o755);
  return dir;
}

function startAssert(extraEnv) {
  return spawn(bashPath(), [SCRIPT], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      DB_HOST: '127.0.0.1',
      DB_PORT: '5432',
      DB_USER: 'courier',
      DB_NAME: 'courier',
      PATH: `${psqlShim()}${path.delimiter}${process.env.PATH}`,
      ...extraEnv,
    },
  });
}

async function outputOf(child) {
  let text = '';
  child.stdout.on('data', (chunk) => {
    text += String(chunk);
  });
  child.stderr.on('data', (chunk) => {
    text += String(chunk);
  });
  const [code] = await once(child, 'exit');
  return { code, text };
}

/**
 * The seeded day the a1 flow starts from: one run, one shift, five stops -
 * and since BUG-236 a real day-one day: the run carries its planned break and
 * a finish back at the depot, and the stops carry a priority flag (the
 * second), a delivery window (the third) and a pickup type (the fourth),
 * the same shape the fixed demo seed writes.
 */
function seedTheDay() {
  psql('TRUNCATE delivery_events, stops, shifts, runs CASCADE');
  psql(`INSERT INTO shifts (id, courier_id, started_at)
        VALUES ('00000000-0000-0000-0000-000000000002','courier-test',now())`);
  psql(`INSERT INTO runs (id, shift_id, courier_id, name, depot_lat, depot_lon, speed_kmh, start_at,
                          break_start_at, break_end_at, finish_lat, finish_lon, created_at, updated_at)
        VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','courier-test',
        'Test run',-43.5,172.6,30,now(),now() + interval '4 hours', now() + interval '5 hours',
        -43.5,172.6,now(),now())`);
  for (let i = 1; i <= 5; i++) {
    // The day-one fields, in the seeded order: priority on the second stop,
    // a window on the third, a pickup type on the fourth (BUG-236).
    const priority = i === 2 ? 'true' : 'false';
    const window = i === 3
      ? `now() + interval '6 hours', now() + interval '8 hours'`
      : 'NULL, NULL';
    const type = i === 4 ? "'pickup'" : "'delivery'";
    psql(`INSERT INTO stops (id, shift_id, sequence, location_id, status, address, priority, parcels,
                              time_window_start, time_window_end, type)
          VALUES ('00000000-0000-0000-0000-00000000000${String(i)}','00000000-0000-0000-0000-000000000002',
          ${i},'00000000-0000-0000-0000-0000000000${String(i)}0','pending','stop ${i}',${priority},2,
          ${window},${type})`);
  }
  for (let i = 1; i <= 3; i++) {
    psql(`INSERT INTO delivery_events (id, shift_id, stop_id, kind, occurred_at, received_at)
          VALUES ('00000000-0000-0000-0000-00000000001${String(i)}','00000000-0000-0000-0000-000000000002',
          '00000000-0000-0000-0000-00000000000${String(i)}','delivered',now(),now())`);
  }
}

test.before(() => {
  // The stack this suite runs against: the CI job's own compose project, so
  // the assert reads the same database the a1 job's flows wrote to.
  const running = compose(['ps', '--status', 'running', '--services']).trim();
  if (!running.split('\n').includes('postgres')) {
    throw new Error(
      'the compose stack is not running: start it with '
      + 'docker compose -f infra/compose.ci.yml up -d --wait postgres valkey',
    );
  }
  const tables = psql("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'").trim();
  assert.ok(
    Number(tables) > 5,
    `the contract schema is not applied (${tables} public tables)`,
  );
});

test.after(() => {
  // The job's own rows matter after this suite: it leaves the database the way
  // it found it.
  try {
    psql('TRUNCATE delivery_events, stops, shifts, runs CASCADE');
  } catch {
    // The database is the CI job's own and its lifetime ends with the job.
  }
});

test('waits for the held delivery the outbox sends on its own schedule (BUG-188)', async () => {
  seedTheDay();
  // The assert starts against three rows, the way the a1 runner found them
  // after the sync flow - and the fourth delivery lands 8 seconds later, the
  // way the outbox's own retry sends it. The assert must wait for it.
  const assertion = startAssert();
  const collected = outputOf(assertion);
  await pause(8000);
  psql(`INSERT INTO delivery_events (id, shift_id, stop_id, kind, occurred_at, received_at)
        VALUES ('00000000-0000-0000-0000-000000000014','00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000005','delivered',now(),now())`);
  const { code, text } = await collected;
  assert.equal(code, 0, text);
  assert.match(text, /the held delivery landed after \d+s of waiting/);
  assert.match(text, /the seeded day and the four deliveries are in Postgres/);
});

test('still fails when the held delivery never lands, and says how long it waited', async () => {
  seedTheDay();
  const result = spawnSync(bashPath(), [SCRIPT], {
    cwd: ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      DB_HOST: '127.0.0.1',
      DB_PORT: '5432',
      DB_USER: 'courier',
      DB_NAME: 'courier',
      PATH: `${psqlShim()}${path.delimiter}${process.env.PATH}`,
      A1_SYNC_TIMEOUT_S: '2',
    },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr + result.stdout, /expected 4 delivery events .* found 3/);
  assert.match(result.stdout, /2s/);
});
