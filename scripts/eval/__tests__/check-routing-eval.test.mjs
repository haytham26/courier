// The test for the routing evaluation set's checker (BUG-280).
//
//   node --test scripts/eval/__tests__/check-routing-eval.test.mjs
//
// The checker's own rules are tested against small in-memory manifests, so a
// broken rule fails here rather than on a 144-instance run:
//   - the determinism rule (the instance the seed regenerates, stop by stop);
//   - the walk (the arrival waits for the window to open, a late stop is a
//     violation, the break sits where it is told);
//   - the priorities (a priority stop after an ordinary one is a violation);
//   - the matrix (whole metres and seconds per ordered pair, unroutable pairs
//     recorded and floored).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DAY_START_EPOCH,
  SIZES,
  VARIANTS,
  MAX_UNROUTABLE_SHARE,
  AVG_TARGET,
  WORST_TARGET,
  P95_TARGET_S,
  deriveInstance,
  mulberry32,
  priorityViolations,
  overCapacity,
  walkInstance,
} from '../check-routing-eval.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const pool = JSON.parse(
  readFileSync(join(REPO, 'packages', 'eval', 'routing', 'manifest', 'pool.json'), 'utf8'),
).stops;

// A small matrix over the instance's stops: the walk takes the matrix as an
// argument, so the tests drive it without the committed road matrix.
function matrixFor(instance) {
  const size = Math.max(...instance.stops.map((stop) => stop.i), instance.depot.i) + 1;
  const metres = Array.from({ length: size }, () => new Array(size).fill(0));
  const seconds = Array.from({ length: size }, () => new Array(size).fill(0));
  instance.stops.forEach((stop, index) => {
    for (let j = 0; j < size; j += 1) {
      metres[stop.i][j] = 1000 * (index + 1);
      seconds[stop.i][j] = 600 * (index + 1);
      metres[j][stop.i] = 1000 * (index + 1);
      seconds[j][stop.i] = 600 * (index + 1);
    }
  });
  return { metres, seconds };
}

test('the targets are the directive\'s, verbatim', () => {
  assert.equal(AVG_TARGET, 1.02);
  assert.equal(WORST_TARGET, 1.05);
  assert.equal(P95_TARGET_S, 3.0);
});

test('the set\'s grid is the directive\'s: 4 sizes, 6 variants, 6 seeds = 144', () => {
  assert.deepEqual(SIZES, [30, 80, 150, 250]);
  assert.equal(VARIANTS.length, 6);
  assert.equal(SIZES.length * VARIANTS.length * 6, 144);
});

test('mulberry32 is deterministic and bounded', () => {
  const first = mulberry32(20261109);
  const second = mulberry32(20261109);
  for (let i = 0; i < 10; i += 1) {
    const value = first();
    assert.equal(value, second());
    assert.ok(value >= 0 && value < 1, `${value} is not in [0, 1)`);
  }
});

test('a seeded instance regenerates identically from the committed pool', () => {
  const instance = deriveInstance(80, 'full', 20261109, 'christchurch', pool);
  const again = deriveInstance(80, 'full', 20261109, 'christchurch', pool);
  assert.deepEqual(instance.stops, again.stops);
  assert.equal(instance.id, 'routing-80-full-20261109');
  assert.ok(instance.finish);
  assert.ok(instance.break);
  // the depot and the finish are never stops of their own day
  assert.ok(!instance.stops.some((stop) => stop.i === instance.depot.i));
  assert.ok(!instance.stops.some((stop) => stop.i === instance.finish.i));
});

test('a different seed gives a different day', () => {
  const one = deriveInstance(30, 'plain', 20261109, 'christchurch', pool);
  const two = deriveInstance(30, 'plain', 20261110, 'christchurch', pool);
  assert.notDeepEqual(one.stops.map((s) => s.i), two.stops.map((s) => s.i));
});

test('the walk waits for a window to open and counts a late stop', () => {
  const instance = {
    depot: { i: 0 }, finish: null, start_at_epoch_s: 0, service_time_s: 300, break: null,
    stops: [
      // the first leg takes 600s, so a window that opens at 1000 makes the
      // courier WAIT (no violation) and a window that closes at 500 makes the
      // second stop late (one violation)
      { i: 1, parcels: 1, service_time_s: 300, priority: false, window: [1000, 2000] },
      { i: 2, parcels: 1, service_time_s: 300, priority: false, window: [0, 500] },
    ],
  };
  const matrix = matrixFor(instance);
  const walk = walkInstance(instance, [1, 2], null, matrix);
  assert.equal(walk.window_violations, 1);
  assert.equal(walk.duration_s, 1000 + 300 + 1200 + 300); // waits, then the second leg
});

test('the break sits between two stops at the recorded position', () => {
  const instance = {
    depot: { i: 0 }, finish: null, start_at_epoch_s: 0, service_time_s: 300,
    // the break may start between 1000s and 2000s: the first stop's departure
    // is at 900, so the break starts at 1000 (the earliest allowed) and holds
    break: { earliest_epoch_s: 1000, latest_epoch_s: 2000, minutes: 30 },
    stops: [
      { i: 1, parcels: 1, service_time_s: 300, priority: false, window: null },
      { i: 2, parcels: 1, service_time_s: 300, priority: false, window: null },
    ],
  };
  const matrix = matrixFor(instance);
  const walk = walkInstance(instance, [1, 2], 1, matrix);
  assert.equal(walk.break_violation, false);
  // the van reaches the door at 900, waits to 1000 for the break window to open,
  // takes 30 minutes, then drives 1200s and serves 300s
  assert.equal(walk.duration_s, 600 + 300 + 100 + 30 * 60 + 1200 + 300);
  // a break told to stand after the last stop is not a position the core allows
  assert.throws(() => walkInstance(instance, [1, 2], 5, matrix));
});

test('a priority stop after an ordinary one is a priority violation', () => {
  const instance = {
    depot: { i: 0 }, finish: null,
    stops: [
      { i: 1, parcels: 1, priority: true },
      { i: 2, parcels: 1, priority: false },
    ],
  };
  assert.equal(priorityViolations(instance, [1, 2]), 0);
  assert.equal(priorityViolations(instance, [2, 1]), 1);
});

test('over the capacity is over, whatever the order', () => {
  const instance = {
    depot: { i: 0 }, finish: null, capacity_parcels: 3,
    stops: [
      { i: 1, parcels: 2 },
      { i: 2, parcels: 2 },
    ],
  };
  assert.equal(overCapacity(instance, [1, 2]), true);
  assert.equal(overCapacity(instance, [2, 1]), true);
});

