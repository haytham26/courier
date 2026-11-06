// The test for the deploy's secret-inline gate (the 2026-11-05 audit's item 3c).
//
//   node --test scripts/ci/__tests__/check-deploy-secrets-inline.test.mjs
//
// Every case is a property of the gate, run against a fabricated workflow in a
// temp tree: the real workflow passes, the old shape (secrets spelled into the
// ssh argv) fails and names the line, a deploy that keeps the env but spells a
// secret fails, and one that pipes but does not read fails.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CHECK = path.join(ROOT, 'scripts', 'ci', 'check-deploy-secrets-inline.mjs');

/** A deploy step with the given env keys and the given run block. */
function workflow(envLines, runLines) {
  return `
name: Deploy staging
on:
  push:
    branches: [main]
jobs:
  deploy:
    name: Deploy to the staging host
    steps:
      - name: The host the audit is waiting for
        id: host
        run: echo configured=true >> "$GITHUB_OUTPUT"
      - name: Deploy to the host
        if: steps.host.outputs.configured == 'true'
        env:
${envLines.map((line) => `          ${line}`).join('\n')}
        run: |
          set -euo pipefail
${runLines.map((line) => `          ${line}`).join('\n')}
      - name: Roll back on a failed smoke test
        if: failure() && steps.host.outputs.configured == 'true'
        run: echo rolled back
`;
}

const FIXED_ENV = [
  'HOST: ${{ secrets.COURIER_STAGING_HOST }}',
  'USER: ${{ secrets.COURIER_STAGING_USER }}',
  'KEY: ${{ secrets.COURIER_STAGING_KEY }}',
  'STAGING_DOMAIN: ${{ secrets.COURIER_STAGING_DOMAIN }}',
  'SMOKE_TOKEN: ${{ secrets.COURIER_SMOKE_TOKEN }}',
  'APP_VERSION: ${{ github.sha }}',
];
const FIXED_RUN = [
  'printf \'%s\\n%s\\n\' "$STAGING_DOMAIN" "$SMOKE_TOKEN" | ssh -i ~/.ssh/id_ed25519 "${USER}@${HOST}" \\',
  "  'read -r domain && read -r token || exit 9; cd /opt/courier/infra && APP_VERSION='\"$APP_VERSION\"' bash smoke.sh --domain \"$domain\" --token \"$token\"'",
];

function run(workflowText) {
  const dir = mkdtempSync(path.join(tmpdir(), 'deploy-secrets-test-'));
  try {
    mkdirSync(path.join(dir, '.github', 'workflows'), { recursive: true });
    writeFileSync(path.join(dir, '.github', 'workflows', 'deploy.yml'), workflowText, 'utf8');
    const answer = spawnSync(process.execPath, [CHECK], { cwd: dir, encoding: 'utf8' });
    return { code: answer.status, out: answer.stdout + answer.stderr };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('the real workflow passes', () => {
  const answer = run(
    readFileSync(path.join(ROOT, '.github', 'workflows', 'deploy.yml'), 'utf8'),
  );
  assert.equal(answer.code, 0, answer.out);
  assert.match(answer.out, /no secret is spelled into the deploy/);
});

test('the old shape - secrets spelled into the argv - fails and names the line', () => {
  const answer = run(
    workflow(FIXED_ENV, [
      'ssh -i ~/.ssh/id_ed25519 "${USER}@${HOST}" \\',
      '  "cd /opt/courier/infra && bash smoke.sh --domain \\"${{ secrets.COURIER_STAGING_DOMAIN }}\\" --token \\"${{ secrets.COURIER_SMOKE_TOKEN }}\\""',
    ]),
  );
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /interpolates a secret into a command line/);
});

test('a deploy that keeps the env but spells a secret anyway fails', () => {
  const answer = run(
    workflow(FIXED_ENV, [
      "printf '%s\\n' \"$STAGING_DOMAIN\" | ssh -i ~/.ssh/id_ed25519 \"${USER}@${HOST}\" \\",
      "  'read -r domain && cd /opt/courier/infra && bash smoke.sh --domain \"$domain\" --token \"${{ secrets.COURIER_SMOKE_TOKEN }}\"'",
    ]),
  );
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /secret names appear on the smoke invocation|interpolates a secret/);
});

test('a deploy that pipes but does not read from stdin fails', () => {
  const answer = run(
    workflow(FIXED_ENV, [
      "printf '%s\\n%s\\n' \"$STAGING_DOMAIN\" \"$SMOKE_TOKEN\" | ssh -i ~/.ssh/id_ed25519 \"${USER}@${HOST}\" \\",
      "  'cd /opt/courier/infra && bash smoke.sh --domain \"$domain\" --token \"$token\"'",
    ]),
  );
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /does not read the domain and the token from stdin/);
});

test('a deploy whose step env drops the smoke secrets fails', () => {
  const answer = run(
    workflow(
      [
        'HOST: ${{ secrets.COURIER_STAGING_HOST }}',
        'USER: ${{ secrets.COURIER_STAGING_USER }}',
        'KEY: ${{ secrets.COURIER_STAGING_KEY }}',
        'APP_VERSION: ${{ github.sha }}',
      ],
      FIXED_RUN,
    ),
  );
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /does not carry (STAGING_DOMAIN|SMOKE_TOKEN)/);
});

test('a workflow with no deploy step fails loudly', () => {
  const answer = run('name: Deploy\njobs:\n  deploy:\n    steps:\n      - run: echo hi\n');
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /was not found/);
});
