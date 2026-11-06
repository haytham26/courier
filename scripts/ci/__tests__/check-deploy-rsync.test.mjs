// The test for the deploy rsync gate (the 2026-11-05 audit's item 3a).
//
//   node --test scripts/ci/__tests__/check-deploy-rsync.test.mjs
//
// Every case is a property of the gate, run against a fabricated workflow in a
// temp tree (the check reads the workflow relative to its cwd): the real
// workflow passes, the trailing-slash shape fails and names the slash, a
// --relative shape passes, and a workflow whose deploy no longer cds the
// directory it rsyncs fails too.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CHECK = path.join(ROOT, 'scripts', 'ci', 'check-deploy-rsync.mjs');

/** A workflow with the rsync block given, plus the deploy's own cd target. */
function workflowWith(rsyncBlock, { cdTarget = 'cd /opt/courier/infra' } = {}) {
  return `
name: Deploy
jobs:
  deploy:
    steps:
      - name: Deploy to the host
        run: |
          set -euo pipefail
${rsyncBlock
  .split('\n')
  .map((line) => `          ${line}`)
  .join('\n')}
          ssh -i ~/.ssh/id_ed25519 "user@host" "${cdTarget} && bash deploy.sh apply"
`;
}

function run(workflow) {
  const dir = mkdtempSync(path.join(tmpdir(), 'deploy-rsync-test-'));
  try {
    mkdirSync(path.join(dir, '.github', 'workflows'), { recursive: true });
    writeFileSync(path.join(dir, '.github', 'workflows', 'deploy.yml'), workflow, 'utf8');
    const answer = spawnSync(process.execPath, [CHECK], { cwd: dir, encoding: 'utf8' });
    return { code: answer.status, out: answer.stdout + answer.stderr };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('the real workflow passes', () => {
  const answer = run(readFileSync(path.join(ROOT, '.github', 'workflows', 'deploy.yml'), 'utf8'));
  assert.equal(answer.code, 0, answer.out);
  assert.match(answer.out, /check-deploy-rsync:/);
});

test('the trailing-slash shape fails and names the slash', () => {
  const answer = run(
    workflowWith(`rsync -az --delete -e "ssh -i ~/.ssh/id" \\
  infra/ services/ packages/ "user@host:/opt/courier/"`),
  );
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /trailing slash/);
  assert.match(answer.out, /does not name --relative|no --relative/);
});

test('a relative shape without the three sources fails', () => {
  const answer = run(
    workflowWith(`rsync -az --delete --relative -e "ssh -i ~/.ssh/id" \\
  "user@host:/opt/courier/"`),
  );
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /does not name (infra|services|packages)/);
});

test('a workflow that no longer cds the directory it sends fails', () => {
  const answer = run(
    workflowWith(`rsync -az --delete --relative -e "ssh -i ~/.ssh/id" \\
  infra services packages "user@host:/opt/courier/"`, { cdTarget: 'cd /opt && bash apply' }),
  );
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /cds \/opt\/courier\/infra/);
});

test('a workflow with no rsync at all fails', () => {
  const answer = run(workflowWith(`echo "nothing is copied"`));
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /no rsync line/);
});
