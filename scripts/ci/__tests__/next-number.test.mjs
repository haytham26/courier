// next-number.mjs: the next BUG/D number is the highest on origin/main AND every
// open origin branch, plus one (PLAYBOOK §13.5). Two collisions on 2026-11-03
// (BUG-168..170 and BUG-171) came from a check that read main only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { highestIn, nextNumbers } from '../next-number.mjs';

test('highestIn reads the register rows and the decision headings', () => {
  const bugs = '| BUG-169 | MEDIUM |\n| BUG-170 | LOW |\ntext BUG-999 in prose\n';
  const decisions = '## D62 x\n## D63 y\n';
  assert.deepEqual(highestIn(bugs, decisions), { bug: 170, d: 63 });
});

test('a higher number on an open branch wins over main', () => {
  const refs = {
    'origin/main': { bugs: '| BUG-170 | x |\n', decisions: '## D63 x\n' },
    'origin/feat/a1': { bugs: '| BUG-170 | x |\n| BUG-181 | y |\n', decisions: '## D63 x\n' },
    'origin/backend-x': { bugs: '| BUG-175 | x |\n', decisions: '## D64 z\n' },
  };
  const r = nextNumbers(refs);
  assert.equal(r.nextBug, 182);
  assert.equal(r.nextD, 65);
  assert.equal(r.bugFrom, 'origin/feat/a1');
  assert.equal(r.dFrom, 'origin/backend-x');
});

test('a ref without the registers is skipped, not fatal', () => {
  const r = nextNumbers({ 'origin/main': { bugs: '| BUG-5 | x |\n', decisions: '## D1 x\n' }, 'origin/empty': { bugs: '', decisions: '' } });
  assert.equal(r.nextBug, 6);
  assert.equal(r.nextD, 2);
});
