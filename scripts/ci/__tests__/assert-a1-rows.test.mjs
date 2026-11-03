// The test for the a1 rows assert (scripts/ci/assert-a1-rows.sh).
//
//   node --test scripts/ci/__tests__/assert-a1-rows.test.mjs
//
// BUG-186: run 41656905474's a1 job failed "expected 4 delivery events ...
// found 3" while every one of the three flows had PASSED. The app had recorded
// the fourth delivery on the phone and the outbox sent it on its own retry
// (15 s), which lands seconds after the sync flow's last screen - so the
// runner's immediate count was a race it could lose. The assert now waits,
// bounded, for the count the flow performed; these tests run it against a real
// Postgres - its OWN container, started here from the contract's schema, so
// the suite is self-contained wherever docker runs (the CI test job has no
// compose stack and this must not depend on one).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** A synchronous pause, so a wait needs no timer on any platform. */
const pause = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SCRIPT = path.join(ROOT, 'scripts', 'ci', 'assert-a1-rows.sh');
const SCHEMA = path.join(ROOT, 'packages', 'contracts', 'db', 'schema.sql');
const CONTAINER = 'courier-a1-rows-assert';
const PORT = '5544';

function docker(args, options = {}) {
  return execFileSync('docker', args, { encoding: 'utf8', env: process.env, ...options });
}

/** The test's own Postgres, started from the contract's schema. */
test.before(() => {
  try {
    docker(['rm', '-f', CONTAINER], { stdio: 'ignore' });
  } catch {
    // No leftover container from an earlier run: nothing to remove.
  }
  // No bind mount: the schema is applied over stdin once the server is up, so
  // the suite does not depend on a host mount working on any machine.
  docker([
    'run', '-d', '--rm', '--name', CONTAINER,
    '-e', 'POSTGRES_USER=courier',
    '-e', 'POSTGRES_PASSWORD=courier',
    '-e', 'POSTGRES_DB=courier',
    'postgis/postgis:17-3.5',
  ]);
  for (let attempt = 0; attempt < 60; attempt++) {
    const running = docker(['inspect', '-f', '{{.State.Running}}', CONTAINER], { stdio: 'pipe' }).trim();
    if (running !== 'true') {
      throw new Error(`the test Postgres is not running (state ${running})`);
    }
    try {
      docker(['exec', CONTAINER, 'pg_isready', '-U', 'courier']);
      // The contract's own schema, the same file the CI stack applies at boot.
      execFileSync(
        'docker',
        ['exec', '-i', CONTAINER, 'psql', '-U', 'courier', '-d', 'courier', '-v', 'ON_ERROR_STOP=1', '-f', '-'],
        { input: readFileSync(SCHEMA, 'utf8'), encoding: 'utf8', env: process.env },
      );
      const tables = docker([
        'exec', CONTAINER, 'psql', '-U', 'courier', '-d', 'courier', '-Atc',
        "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'",
      ]).trim();
      if (Number(tables) > 5) {
        return;
      }
    } catch {
      // The database is still coming up (or the schema has not landed yet).
    }
    pause(1000);
  }
  throw new Error('the test Postgres never applied the contract schema');
});

test.after(() => {
  try {
    docker(['rm', '-f', CONTAINER], { stdio: 'ignore' });
  } catch {
    // A container that is already gone needs no second goodbye.
  }
});

function psql(sql) {
  return docker(['exec', '-i', CONTAINER, 'psql', '-U', 'courier', '-d', 'courier', '-v', 'ON_ERROR_STOP=1', '-Atc', sql]);
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
 * A `psql` that forwards to the test's own container: the runners have psql on
 * the PATH and this suite must not need one. The host and port flags the
 * script passes are dropped - the container answers on its own socket.
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
      'exec docker exec -i courier-a1-rows-assert psql "${args[@]}"',
      '',
    ].join('\n'),
  );
  chmodSync(shim, 0o755);
  return dir;
}

function runAssert(extraEnv) {
  return spawnSync(bashPath(), [SCRIPT], {
    cwd: ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      DB_HOST: '127.0.0.1',
      DB_PORT: PORT,
      DB_USER: 'courier',
      DB_NAME: 'courier',
      PATH: `${psqlShim()}${path.delimiter}${process.env.PATH}`,
      ...extraEnv,
    },
  });
}

/** The seeded day the a1 flow starts from: one run, one shift, five stops. */
function seedTheDay() {
  psql('TRUNCATE delivery_events, stops, shifts, runs CASCADE');
  psql(`INSERT INTO shifts (id, courier_id, started_at)
        VALUES ('00000000-0000-0000-0000-000000000002','courier-test',now())`);
  psql(`INSERT INTO runs (id, shift_id, courier_id, name, depot_lat, depot_lon, speed_kmh, start_at, created_at, updated_at)
        VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','courier-test',
        'Test run',-43.5,172.6,30,now(),now(),now())`);
  for (let i = 1; i <= 5; i++) {
    psql(`INSERT INTO stops (id, shift_id, sequence, location_id, status, address, priority, parcels)
          VALUES ('00000000-0000-0000-0000-00000000000${String(i)}','00000000-0000-0000-0000-000000000002',
          ${i},'00000000-0000-0000-0000-0000000000${String(i)}0','pending','stop ${i}',false,2)`);
  }
  for (let i = 1; i <= 3; i++) {
    psql(`INSERT INTO delivery_events (id, shift_id, stop_id, kind, occurred_at, received_at)
          VALUES ('00000000-0000-0000-0000-00000000001${String(i)}','00000000-0000-0000-0000-000000000002',
          '00000000-0000-0000-0000-00000000000${String(i)}','delivered',now(),now())`);
  }
}

test('waits for the held delivery the outbox sends on its own schedule (BUG-186)', async () => {
  seedTheDay();
  // The assert starts against three rows, the way the a1 runner found them
  // after the sync flow - and the fourth delivery lands 8 seconds later, the
  // way the outbox's own retry sends it. The assert must wait for it.
  const assertion = spawn(bashPath(), [SCRIPT], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      DB_HOST: '127.0.0.1',
      DB_PORT: PORT,
      DB_USER: 'courier',
      DB_NAME: 'courier',
      PATH: `${psqlShim()}${path.delimiter}${process.env.PATH}`,
    },
  });
  let output = '';
  assertion.stdout.on('data', (chunk) => {
    output += String(chunk);
  });
  assertion.stderr.on('data', (chunk) => {
    output += String(chunk);
  });
  await pause(8000);
  psql(`INSERT INTO delivery_events (id, shift_id, stop_id, kind, occurred_at, received_at)
        VALUES ('00000000-0000-0000-0000-000000000014','00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000005','delivered',now(),now())`);
  const [code] = await once(assertion, 'exit');
  assert.equal(code, 0, output);
  assert.match(output, /the held delivery landed after \d+s of waiting/);
  assert.match(output, /the seeded day and the four deliveries are in Postgres/);
});

test('still fails when the held delivery never lands, and says how long it waited', () => {
  seedTheDay();
  const result = runAssert({ A1_SYNC_TIMEOUT_S: '2' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr + result.stdout, /expected 4 delivery events .* found 3/);
  assert.match(result.stdout, /2s/);
});
