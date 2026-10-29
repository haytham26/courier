// The test for the B4 mutation floor (BUG-112).
//
//   node --test scripts/ci/__tests__/check-mutation-floor.test.mjs
//
// The score arithmetic is mutmut's own (read from `mutmut/__main__.py`'s `badge`
// command), so these tests pin it: the timeout counts as killed, the skipped are
// not tested, and a run with no mutants at all must fail rather than pass. The
// mutmut run itself cannot run on Windows (its own `platform.system()` check), so
// the arithmetic is what is provable here and CI's ubuntu runner is the harness
// for the run.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  BUG_ID,
  DEFAULT_FLOOR,
  checkStats,
  normaliseStats,
  scoreOf,
} from '../check-mutation-floor.mjs';

test('the score is mutmut arithmetic: killed and timeout over the tested', () => {
  const stats = { killed: 60, timeout: 10, survived: 10, total: 90, skipped: 10 };
  // 70 killed of 80 tested (the 10 skipped do not count) = 87.5
  assert.equal(scoreOf(stats), 87.5);
  // and the exact floor, so the boundary is pinned
  assert.equal(scoreOf({ killed: 56, timeout: 0, survived: 24, total: 80, skipped: 0 }), 70);
});

test('a run with no mutants fails rather than passes', () => {
  const failures = checkStats({ killed: 0, timeout: 0, survived: 0, total: 0, skipped: 0 });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /vacuous/);
});

test('the floor holds at exactly 70', () => {
  const failures = checkStats({ killed: 70, timeout: 0, survived: 30, total: 100, skipped: 0 });
  assert.deepEqual(failures, []);
});

test('a survived mutant below the floor fails, and names the count', () => {
  const failures = checkStats({ killed: 68, timeout: 0, survived: 32, total: 100, skipped: 0 });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /68\.0%, under the 70% floor/);
  assert.match(failures[0], /32 survived/);
});

test('a custom floor other than the default is honoured', () => {
  const failures = checkStats({ killed: 60, timeout: 0, survived: 40, total: 100 }, { floor: 50 });
  assert.deepEqual(failures, []);
});

test('the skipped mutants are not counted as tested', () => {
  const stats = { killed: 50, timeout: 0, survived: 0, total: 100, skipped: 50 };
  assert.equal(scoreOf(stats), 100);
  assert.deepEqual(checkStats(stats), []);
});

test('a truncated stats object cannot quieten the floor', () => {
  const failures = checkStats({});
  assert.equal(failures.length, 1);
  assert.match(failures[0], /no mutants were generated/);
});

test('a negative or non-numeric count is not a mutant', () => {
  assert.deepEqual(normaliseStats({ total: -5, skipped: -1, killed: 'nan', timeout: undefined }), {
    total: 0,
    skipped: 0,
    killed: 0,
    timeout: 0,
  });
});

test('a non-object is refused, not scored', () => {
  assert.throws(() => normaliseStats(null), /must be an object/);
  assert.throws(() => normaliseStats(7), /must be an object/);
});

test('the gate carries the bug it belongs to, and the audit floor', () => {
  assert.equal(BUG_ID, 'BUG-112');
  assert.equal(DEFAULT_FLOOR, 70);
});
