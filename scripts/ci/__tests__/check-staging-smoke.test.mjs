// The test for the dependabot / cron staging smoke gate (audit 3i / C14).
//
//   node --test scripts/ci/__tests__/check-staging-smoke.test.mjs
//
// Every case is a property of the gate, run against a fabricated repo root in
// a temp tree: the real tree passes; a missing dependabot.yml fails; a
// missing ecosystem fails; a uv entry without a uv.lock fails; a non-weekly
// schedule fails; a missing workflow fails; a missing cron or dispatch fails;
// a smoke call without --no-version fails; a job-level or command-line secret
// fails; a missing skip-notice fails; a tag-pinned action fails; missing
// permissions fail.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CHECK = path.join(ROOT, 'scripts', 'ci', 'check-staging-smoke.mjs');

const DEPENDABOT = `version: 2
updates:
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
  - package-ecosystem: uv
    directory: /services/api
    schedule:
      interval: weekly
`;

const SHA = 'a'.repeat(40);
const WORKFLOW = `name: Staging smoke
on:
  schedule:
    - cron: "5 18 * * *"
  workflow_dispatch:
permissions:
  contents: read
jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@${SHA} # v4
      - name: The staging secrets
        id: secrets
        env:
          COURIER_STAGING_DOMAIN: \${{ secrets.COURIER_STAGING_DOMAIN }}
          COURIER_SMOKE_TOKEN: \${{ secrets.COURIER_SMOKE_TOKEN }}
        run: |
          if [ -z "\${COURIER_STAGING_DOMAIN:-}" ]; then
            echo "::notice::skipped: not set"
            echo "configured=false" >> "$GITHUB_OUTPUT"
            exit 0
          fi
          echo "configured=true" >> "$GITHUB_OUTPUT"
      - name: Run the smoke test against staging
        if: steps.secrets.outputs.configured == 'true'
        env:
          DOMAIN: \${{ secrets.COURIER_STAGING_DOMAIN }}
          TOKEN: \${{ secrets.COURIER_SMOKE_TOKEN }}
        run: |
          bash infra/smoke.sh --domain "$DOMAIN" --token "$TOKEN" --no-version
`;

function tree({ dependabot = DEPENDABOT, workflow = WORKFLOW, extra = {} } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'staging-smoke-test-'));
  try {
    if (dependabot !== null) {
      mkdirSync(path.join(root, '.github'), { recursive: true });
      writeFileSync(path.join(root, '.github', 'dependabot.yml'), dependabot, 'utf8');
    }
    if (workflow !== null) {
      mkdirSync(path.join(root, '.github', 'workflows'), { recursive: true });
      writeFileSync(path.join(root, '.github', 'workflows', 'staging-smoke.yml'), workflow, 'utf8');
    }
    for (const [rel, text] of Object.entries(extra)) {
      const p = path.join(root, rel);
      mkdirSync(path.dirname(p), { recursive: true });
      writeFileSync(p, text, 'utf8');
    }
    const answer = spawnSync(process.execPath, [CHECK, root], { encoding: 'utf8' });
    return { code: answer.status, out: answer.stdout + answer.stderr };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('the real tree passes', () => {
  const answer = spawnSync(process.execPath, [CHECK], { encoding: 'utf8' });
  assert.equal(answer.status, 0, answer.stdout + answer.stderr);
  assert.match(answer.stdout, /BUG-223: dependabot watches github-actions, npm and uv weekly/);
});

test('a missing dependabot.yml fails', () => {
  const answer = tree({ dependabot: null, extra: { 'services/api/uv.lock': '' } });
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /dependabot\.yml does not exist/);
});

test('a dependabot with no uv ecosystem fails', () => {
  const answer = tree({
    dependabot: DEPENDABOT.replace(/- package-ecosystem: uv[\s\S]*$/, ''),
    extra: { 'services/api/uv.lock': '' },
  });
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /watches no "uv" ecosystem/);
});

test('a uv entry pointing at a directory without uv.lock fails', () => {
  const answer = tree({
    dependabot: DEPENDABOT.replace('/services/api', '/services/nowhere'),
  });
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /services\/nowhere\/uv\.lock does not exist/);
});

test('a non-weekly schedule fails', () => {
  const answer = tree({
    dependabot: DEPENDABOT.replace('interval: weekly', 'interval: daily'),
    extra: { 'services/api/uv.lock': '' },
  });
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /not on a weekly schedule/);
});

test('a missing staging-smoke.yml fails', () => {
  const answer = tree({ workflow: null, extra: { 'services/api/uv.lock': '' } });
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /staging-smoke\.yml does not exist/);
});

test('no cron trigger fails', () => {
  const answer = tree({
    workflow: WORKFLOW.replace('  schedule:\n    - cron: "5 18 * * *"\n', ''),
    extra: { 'services/api/uv.lock': '' },
  });
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /no schedule: - cron/);
});

test('no workflow_dispatch fails', () => {
  const answer = tree({
    workflow: WORKFLOW.replace('  workflow_dispatch:\n', ''),
    extra: { 'services/api/uv.lock': '' },
  });
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /no workflow_dispatch trigger/);
});

test('a smoke call without --no-version fails', () => {
  const answer = tree({
    workflow: WORKFLOW.replace(' --no-version', ''),
    extra: { 'services/api/uv.lock': '' },
  });
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /--no-version/);
});

test('a job-level secret fails', () => {
  const bad = WORKFLOW.replace(
    '    runs-on: ubuntu-latest\n',
    '    runs-on: ubuntu-latest\n    env:\n      COURIER_SMOKE_TOKEN: \${{ secrets.COURIER_SMOKE_TOKEN }}\n',
  );
  const answer = tree({ workflow: bad, extra: { 'services/api/uv.lock': '' } });
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /job-level env/i);
});

test('a secret in a run line fails', () => {
  const bad = WORKFLOW.replace(
    'bash infra/smoke.sh --domain "$DOMAIN"',
    'bash infra/smoke.sh --domain "\${{ secrets.COURIER_STAGING_DOMAIN }}"',
  );
  const answer = tree({ workflow: bad, extra: { 'services/api/uv.lock': '' } });
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /never spelled into a command line/);
});

test('no skip-notice fails', () => {
  const bad = WORKFLOW.replace('::notice::skipped: not set', 'silently nothing').replace('configured=false', 'configured=nope');
  const answer = tree({ workflow: bad, extra: { 'services/api/uv.lock': '' } });
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /no skip-notice/);
});

test('a tag-pinned action fails', () => {
  const bad = WORKFLOW.replace(SHA, 'v4');
  const answer = tree({ workflow: bad, extra: { 'services/api/uv.lock': '' } });
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /not pinned to a full 40-hex commit sha/);
});

test('missing permissions fails', () => {
  const bad = WORKFLOW.replace('permissions:\n  contents: read\n', '');
  const answer = tree({ workflow: bad, extra: { 'services/api/uv.lock': '' } });
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /permissions: contents: read/);
});
