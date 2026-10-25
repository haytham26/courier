// The test for the JS dependency audit gate.
//
//   node --test scripts/ci/__tests__/check-audit.test.mjs
//
// The gate accepts a build-time advisory only with an OWNER and a finite REVIEW
// DATE, and an expired review date fails the gate: an acceptance is never
// permanent. These tests drive that contract through the exported evaluator,
// so they do not need the registry.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALLOW_LIST, evaluateAdvisories } from '../check-audit.mjs';

const NOW = new Date('2026-10-24T00:00:00Z');

function advisory(overrides = {}) {
  return {
    module_name: 'zod',
    severity: 'high',
    vulnerable_versions: '>=3.0.0 <3.25.0',
    patched_versions: '3.25.0',
    findings: [{ paths: ['apps/mobile>@expo/cli>zod'] }],
    ...overrides,
  };
}

test('an acceptance carrying an owner and a future review date passes', () => {
  const report = evaluateAdvisories({ zod: advisory() }, { now: NOW });
  assert.equal(report.failures.length, 0);
  assert.equal(report.invalid.length, 0);
  assert.equal(report.accepted.length, 1);
  assert.equal(report.accepted[0].owner, 'Platform squad');
});

test('an acceptance without an owner fails the gate', () => {
  // The owner is who re-attempts the upstream fix. Without a name nobody
  // does, and the acceptance quietly becomes permanent.
  const custom = [{ package: 'braces', reason: 'build-time only', reviewBy: '2027-01-01' }];
  const report = evaluateAdvisories({ braces: advisory({ module_name: 'braces' }) }, { now: NOW, allowList: custom });
  assert.equal(report.failures.length, 0);
  assert.equal(report.invalid.length, 1);
  assert.match(report.invalid[0].problem, /owner/i);
});

test('an acceptance whose review date has passed fails the gate', () => {
  const custom = [
    { package: 'braces', reason: 'build-time only', owner: 'Platform squad', reviewBy: '2026-10-23' },
  ];
  const report = evaluateAdvisories({ braces: advisory({ module_name: 'braces' }) }, { now: NOW, allowList: custom });
  assert.equal(report.failures.length, 0);
  assert.equal(report.invalid.length, 1);
  assert.match(report.invalid[0].problem, /review date/i);
});

test('an acceptance with no review date fails the gate', () => {
  const custom = [{ package: 'braces', reason: 'build-time only', owner: 'Platform squad' }];
  const report = evaluateAdvisories({ braces: advisory({ module_name: 'braces' }) }, { now: NOW, allowList: custom });
  assert.equal(report.invalid.length, 1);
  assert.match(report.invalid[0].problem, /review date/i);
});

test('a high advisory that is not on the list still fails the gate', () => {
  const report = evaluateAdvisories({ 'shell-quote': advisory({ module_name: 'shell-quote' }) }, { now: NOW });
  assert.equal(report.failures.length, 1);
  assert.equal(report.failures[0].package, 'shell-quote');
  assert.equal(report.invalid.length, 0);
});

test('advisories below high are ignored, as before', () => {
  const report = evaluateAdvisories(
    {
      zod: advisory(),
      lodash: advisory({ module_name: 'lodash', severity: 'moderate' }),
      braces: advisory({ module_name: 'braces', severity: 'low' }),
    },
    { now: NOW },
  );
  assert.equal(report.accepted.length, 1);
  assert.equal(report.failures.length, 0);
});

test('the repository allow list carries an owner and a finite review date on every entry', () => {
  // The gate enforces its own list. If the repo ever adds an entry without an
  // owner or with a rolling date, this fails before a merge can ride it.
  for (const entry of ALLOW_LIST) {
    assert.ok(entry.owner, `${entry.package} has no owner`);
    assert.ok(entry.reviewBy, `${entry.package} has no review date`);
    assert.ok(new Date(entry.reviewBy).getTime() > NOW.getTime(), `${entry.package} review date is not in the future`);
  }
  assert.equal(new Set(ALLOW_LIST.map((entry) => entry.package)).size, ALLOW_LIST.length, 'duplicate allow-list entries');
});

test('the allow list is non-empty: an empty list is how a gate gets fooled', () => {
  assert.ok(ALLOW_LIST.length > 0);
});
