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
// Postgres (the CI job's own compose database is reachable on 55432, and the
// test creates its own schema so it disturbs nothing).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SCRIPT = path.join(ROOT, 'scripts', 'ci', 'assert-a1-rows.sh');
const DB = {
  DB_HOST: '127.0.0.1',
  DB_PORT: '55432',
  DB_USER: 'courier',
  DB_NAME: 'courier',
};

function psql(sql) {
  return execFileSync(
    'docker',
    [
      'compose', '-f', 'infra/compose.ci.yml',
      '-p', 'courier-ci-local',
      'exec', '-T', 'postgres',
      'psql', '-U', 'courier', '-d', 'courier', '-v', 'ON_ERROR_STOP=1', '-Atc', sql,
    ],
    { cwd: ROOT, encoding: 'utf8', env: process.env },
  );
}

/** The seeded day the a1 flow starts from: one run, one shift, five stops. */
function seedTheDay() {
  psql('TRUNCATE delivery_events, stops, shifts, runs, "user", session CASCADE');
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

/** The shell the script runs under: bash on the runners, Git's bash on Windows. */
function bashPath() {
  if (process.env.BASH) {
    return process.env.BASH;
  }
  const gitBash = 'C:\\Program Files\\Git\\bin\\bash.exe';
  return existsSync(gitBash) ? gitBash : 'bash';
}

/**
 * A `psql` that forwards to the compose Postgres, for a machine whose psql is
 * the container's own (the runners have psql on the PATH; this script only
 * needs it where the test runs). The host and port flags the script passes are
 * dropped: the container answers on its own socket.
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
      'exec docker compose -f "$COURIER_REPO/infra/compose.ci.yml" -p courier-ci-local exec -T postgres psql "${args[@]}"',
      '',
    ].join('\n'),
  );
  chmodSync(shim, 0o755);
  return dir;
}

function runAssert(extraEnv) {
  const shimDir = psqlShim();
  return spawnSync(bashPath(), [SCRIPT], {
    cwd: ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...DB,
      COURIER_REPO: ROOT,
      PATH: `${shimDir}${path.delimiter}${process.env.PATH}`,
      ...extraEnv,
    },
  });
}

test('waits for the held delivery the outbox sends on its own schedule (BUG-186)', () => {
  seedTheDay();
  // The fourth delivery lands 8 seconds after the assert starts - the way the
  // outbox's own retry does, seconds after the sync flow's last screen.
  const child = spawnSync(
    'docker',
    [
      'compose', '-f', 'infra/compose.ci.yml', '-p', 'courier-ci-local',
      'exec', '-T', 'postgres', 'psql', '-U', 'courier', '-d', 'courier', '-Atc',
      "SELECT pg_sleep(8); INSERT INTO delivery_events (id, shift_id, stop_id, kind, occurred_at, received_at) VALUES ('00000000-0000-0000-0000-000000000014','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000005','delivered',now(),now());",
    ],
    { cwd: ROOT, encoding: 'utf8', env: process.env, detached: false },
  );
  void child;
  const result = runAssert({});
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /the held delivery landed after \d+s of waiting/);
  assert.match(result.stdout, /the seeded day and the four deliveries are in Postgres/);
});

test('still fails when the held delivery never lands, and says how long it waited', () => {
  seedTheDay();
  const result = runAssert({ A1_SYNC_TIMEOUT_S: '2' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr + result.stdout, /expected 4 delivery events .* found 3/);
  assert.match(result.stdout, /2s/);
});
