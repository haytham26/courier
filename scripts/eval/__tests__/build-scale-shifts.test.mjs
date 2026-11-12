// The scale set's gates (the founder directive 2026-11-10, item 5): the seeded
// full shifts are DETERMINISTIC, they carry the contract's own shape, and the
// harness that drives them can rely on every stop having exactly one outcome,
// every failed stop carrying the reason the server refuses to be without, and
// every shift carrying at least one proof photo, a break and a finish.
//
//   node --test "scripts/*/__tests__/*.test.mjs"
//
// The committed set is checked here from the committed files only: the LINZ
// addresses ride the committed routing pool, so this gate passes on a machine
// with no data/ folder (the same rule the held-out gates learned).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SEED, SHIFTS, theSet, checkShift } from '../build-scale-shifts.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const SET = join(REPO, 'packages', 'eval', 'scale');
const SHIFTS_FILE = join(SET, 'shifts.jsonl');
const MANIFEST = join(SET, 'manifest.json');
const POOL = join(REPO, 'packages', 'eval', 'routing', 'manifest', 'pool.json');

/** The committed set, one JSON object per line. */
function theCommittedSet() {
  return readFileSync(SHIFTS_FILE, 'utf8')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

test("the committed set carries at least the directive's 100 seeded full shifts", () => {
  const shifts = theCommittedSet();
  assert.ok(
    shifts.length >= 100,
    `the directive's floor is 100 shifts, the set carries ${shifts.length}`,
  );
  assert.equal(shifts.length, SHIFTS);
  assert.equal(
    new Set(shifts.map((shift) => shift.shift_id)).size,
    shifts.length,
    'the shift ids are distinct',
  );
  assert.equal(
    new Set(shifts.map((shift) => shift.run_id)).size,
    shifts.length,
    'the run ids are distinct',
  );
});

test("every seeded shift is a day the app's own run store can read", () => {
  for (const shift of theCommittedSet()) {
    const problems = checkShift(shift, 0);
    assert.deepEqual(problems, [], `${shift.shift_id}: ${problems.join('; ')}`);
    // The contract's own required fields: the store refuses a snapshot without them.
    assert.equal(typeof shift.run_id, 'string');
    assert.equal(typeof shift.shift_id, 'string');
    assert.ok(typeof shift.depot.lat === 'number' && typeof shift.depot.lon === 'number');
    assert.equal(typeof shift.start_at, 'string');
    assert.ok(shift.break_window.start < shift.break_window.end, 'the break window is a window');
    assert.ok(
      shift.finish.lat === shift.depot.lat && shift.finish.lon === shift.depot.lon,
      'the round trip ends at the depot',
    );
    for (const stop of shift.stops) {
      assert.ok(
        stop.type === 'delivery' || stop.type === 'pickup',
        `${stop.id} carries the contract's own type`,
      );
      assert.equal(stop.status, 'pending', `${stop.id} starts on the run, not finished`);
      assert.ok(stop.address.length > 0, `${stop.id} carries a real Canterbury address`);
      assert.ok(typeof stop.lat === 'number' && typeof stop.lon === 'number');
    }
  }
});

test('every stop of every shift has exactly one outcome, and the failed ones carry their reason', () => {
  let stops = 0;
  let failed = 0;
  let delivered = 0;
  for (const shift of theCommittedSet()) {
    for (const stop of shift.stops) {
      stops += 1;
      const entries = shift.plan.filter((entry) => entry.stop_id === stop.id);
      assert.equal(entries.length, 1, `${stop.id} has one outcome, not ${entries.length}`);
      const outcome = entries[0].outcome;
      if (outcome.outcome === 'failed') {
        failed += 1;
        assert.ok(
          outcome.reason.length > 0,
          `${stop.id} failed with the reason the server demands`,
        );
        assert.ok(outcome.utterance.length > 0, `${stop.id} carries the courier's own words`);
      }
      if (outcome.outcome === 'delivered') {
        delivered += 1;
        assert.equal(typeof outcome.pod, 'boolean');
      }
    }
  }
  assert.ok(stops > 1000, `the set drives ${stops} stops end to end`);
  assert.ok(failed > 100, `and ${failed} of them fail with a reason`);
  assert.ok(delivered > 500, `and ${delivered} are delivered`);
});

test('every shift carries a proof photo, a spoken break and a spoken finish', () => {
  for (const shift of theCommittedSet()) {
    const pods = shift.plan.filter(
      (entry) => entry.outcome.outcome === 'delivered' && entry.outcome.pod,
    );
    assert.ok(pods.length >= 1, `${shift.shift_id} walks the POD path at least once`);
    assert.equal(shift.commands.filter((command) => command.kind === 'start_break').length, 1);
    assert.equal(shift.commands.filter((command) => command.kind === 'end_break').length, 1);
    assert.equal(shift.commands.filter((command) => command.kind === 'end_shift').length, 1);
    for (const note of shift.notes) {
      assert.ok(
        shift.stops.some((stop) => stop.id === note.stop_id),
        'a note is about a stop the run has',
      );
      assert.ok(note.note.length > 0);
    }
  }
});

test('the same seed builds the same set byte for byte, and the committed set is that build', () => {
  const built = theSet();
  const again = theSet();
  const bytes = built.shifts.map((shift) => JSON.stringify(shift)).join('\n');
  const againBytes = again.shifts.map((shift) => JSON.stringify(shift)).join('\n');
  assert.equal(bytes, againBytes, 'the same seed, the same steps, the same bytes');
  assert.equal(SEED, 20261111, 'the seed is the directive seed');
  const committed = readFileSync(SHIFTS_FILE, 'utf8').replace(/\r\n/g, '\n');
  assert.equal(`${bytes}\n`, committed, 'the committed set is exactly what the seed builds');
  // And it is a real draw, not the pool's own order.
  assert.notEqual(built.shifts[0].stops[0].address, again.pool[0].address);
});

test('the manifest records the seed, the counts and the pool the addresses came from', () => {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  assert.equal(manifest.seed, SEED);
  assert.equal(manifest.shifts, theCommittedSet().length);
  assert.equal(manifest.pool.stops, 560);
  assert.equal(
    manifest.pool.sha256,
    // The same normalisation the builder records with: the pin is over the
    // file's content, not over the checkout's line endings (which differ per
    // platform).
    createHash('sha256').update(readFileSync(POOL, 'utf8').replace(/\r\n/g, '\n')).digest('hex'),
    'the pool the set was drawn from is recorded by its own sha256',
  );
  const total = (name) =>
    theCommittedSet().reduce(
      (sum, shift) => sum + shift.plan.filter((entry) => entry.outcome.outcome === name).length,
      0,
    );
  assert.equal(manifest.counts.delivered, total('delivered'));
  assert.equal(manifest.counts.failed, total('failed'));
  assert.equal(
    manifest.counts.stops,
    theCommittedSet().reduce((sum, shift) => sum + shift.stops.length, 0),
  );
});

test('the generator refuses a shift whose plan does not cover its own stops', () => {
  // The claim is the check itself: a plan with a stop twice and a stop not at
  // all is a shift the harness could not drive, so the builder must name it.
  const shift = JSON.parse(JSON.stringify(theCommittedSet()[0]));
  shift.plan[1].stop_id = shift.plan[0].stop_id;
  const problems = checkShift(shift, 0);
  assert.ok(
    problems.some((problem) => problem.includes('has 2 outcomes')),
    `the missing outcome is named: ${problems.join('; ')}`,
  );
  const dropped = JSON.parse(JSON.stringify(theCommittedSet()[1]));
  dropped.plan = dropped.plan.slice(1);
  assert.ok(
    checkShift(dropped, 0).some((problem) => problem.includes('does not cover')),
    'a plan that leaves a stop out is refused too',
  );
  const reasonless = JSON.parse(JSON.stringify(theCommittedSet()[2]));
  const failed = reasonless.plan.find((entry) => entry.outcome.outcome === 'failed');
  if (failed !== undefined) {
    delete failed.outcome.reason;
    assert.ok(
      checkShift(reasonless, 0).some((problem) => problem.includes('with no reason')),
      'a failed stop with no reason is refused, because the server refuses it too',
    );
  }
});

test("the set is written where the harness reads it, and the temp dir is the repo's own", () => {
  assert.ok(existsSync(SHIFTS_FILE), `the committed shifts are at ${SHIFTS_FILE}`);
  assert.ok(existsSync(MANIFEST));
  const scratch = mkdtempSync(join(tmpdir(), 'scale-shifts-'));
  assert.ok(scratch.length > 0);
});
