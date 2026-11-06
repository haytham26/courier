// The test for the smoke-version gate (the 2026-11-05 audit's item 3b).
//
//   node --test scripts/ci/__tests__/check-smoke-version.test.mjs
//
// Every case is a property of the gate, run against fabricated files in a temp
// tree (the check reads the two files relative to its cwd): the real tree
// passes, a deploy that does not forward the version fails, a smoke.sh that
// skips silently fails, and one whose fetch can fail quietly fails too.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CHECK = path.join(ROOT, 'scripts', 'ci', 'check-smoke-version.mjs');

/** A smoke.sh in one of the three shapes: the fixed one, the old silent-skip
 *  one, and the one whose fetch can fail quietly. */
const SMOKE = (mode) => `
set -euo pipefail
NO_VERSION=0
while [ "$#" -gt 0 ]; do
  case "$1" in
    ${mode === 'fixed' ? '--no-version) NO_VERSION=1; shift ;;' : '--domain) shift 2 ;;'}
    *) die "unknown argument" ;;
  esac
done
${
  mode === 'fixed'
    ? 'if [ -z "${APP_VERSION:-}" ] && [ "$NO_VERSION" != "1" ]; then\n  die "APP_VERSION is required"\nfi'
    : '# no guard: the version is optional, which is the bug'
}
VERSION_FILE="/tmp/v.json"
${
  mode === 'quiet'
    ? 'curl -sS "$BASE/openapi.json" | tee "$VERSION_FILE" > /dev/null || true'
    : 'if ! curl -sS "$BASE/openapi.json" | tee "$VERSION_FILE" > /dev/null; then die "no document"; fi'
}
${
  mode === 'fixed'
    ? 'log "the deployed version is $APP_VERSION"'
    : 'log "APP_VERSION is not set: skipping the version check"'
}
`;

function workflowWith(remote) {
  return `
name: Deploy
jobs:
  deploy:
    steps:
      - name: Deploy to the host
        run: |
          rsync -az --delete --relative infra services packages "host:/opt/courier/"
          ssh -i key user@host "cd /opt/courier/infra && bash deploy.sh apply"
          ssh -i key user@host "${remote}"
`;
}

function run(workflow, smoke) {
  const dir = mkdtempSync(path.join(tmpdir(), 'smoke-version-test-'));
  try {
    mkdirSync(path.join(dir, 'infra'), { recursive: true });
    mkdirSync(path.join(dir, '.github', 'workflows'), { recursive: true });
    writeFileSync(path.join(dir, 'infra', 'smoke.sh'), smoke, 'utf8');
    writeFileSync(path.join(dir, '.github', 'workflows', 'deploy.yml'), workflow, 'utf8');
    const answer = spawnSync(process.execPath, [CHECK], { cwd: dir, encoding: 'utf8' });
    return { code: answer.status, out: answer.stdout + answer.stderr };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const FIXED_REMOTE = "cd /opt/courier/infra && APP_VERSION='sha' bash smoke.sh --domain d --token t";
const OLD_REMOTE = 'cd /opt/courier/infra && bash smoke.sh --domain d --token t';

test('the real tree passes', () => {
  const answer = run(
    readFileSync(path.join(ROOT, '.github', 'workflows', 'deploy.yml'), 'utf8'),
    readFileSync(path.join(ROOT, 'infra', 'smoke.sh'), 'utf8'),
  );
  assert.equal(answer.code, 0, answer.out);
  assert.match(answer.out, /forwards APP_VERSION/);
});

test('a deploy that does not forward the version fails', () => {
  const answer = run(workflowWith(OLD_REMOTE), SMOKE('fixed'));
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /does not forward APP_VERSION/);
});

test('a smoke.sh that skips silently fails', () => {
  const answer = run(workflowWith(FIXED_REMOTE), SMOKE('old'));
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /silent skip|does not die without APP_VERSION/);
});

test('a version fetch that can fail quietly fails', () => {
  const answer = run(workflowWith(FIXED_REMOTE), SMOKE('quiet'));
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /\|\| true/);
});

test('a workflow that never invokes smoke.sh fails', () => {
  const answer = run('name: Deploy\njobs:\n  deploy:\n    steps:\n      - run: echo hi\n', SMOKE('fixed'));
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /does not invoke smoke.sh/);
});
