// The test for the deploy-gate gate (the 2026-11-05 audit's item 3d).
//
//   node --test scripts/ci/__tests__/check-deploy-gate.test.mjs
//
// Every case is a property of the gate, run against a fabricated workflow in a
// temp tree: the real workflow passes, a deploy that still runs on the push
// fails, one that waits for only one of the two workflows fails, one that
// checks out the branch tip instead of the gates' sha fails, and one that
// dropped workflow_dispatch fails.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CHECK = path.join(ROOT, 'scripts', 'ci', 'check-deploy-gate.mjs');

const READY_TRIGGERS = `
on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      target:
        type: choice
  workflow_run:
    workflows: ["CI", "Quality gates"]
    types: [completed]
`;

const OLD_SHAPE_TRIGGERS = `
on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      target:
        type: choice
`;

const READY_DEPLOY = `
  deploy:
    name: Deploy to the staging host
    if: github.event_name == 'workflow_dispatch' || github.event_name == 'workflow_run'
    runs-on: ubuntu-latest
    steps:
      - name: The gates are green on this sha
        if: github.event_name == 'workflow_run'
        env:
          SHA: \${{ github.event.workflow_run.head_sha }}
        run: |
          for workflow in "CI" "Quality gates"; do
            awk -F'\\t' -v want="$workflow" '$1 == want && $2 == "completed" && $3 == "success"'
          done
      - name: The host the audit is waiting for
        id: host
        run: echo configured=true >> "$GITHUB_OUTPUT"
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        if: steps.host.outputs.configured == 'true'
        with:
          ref: \${{ github.event.workflow_run.head_sha || github.sha }}
      - name: Deploy to the host
        if: steps.host.outputs.configured == 'true'
        run: |
          rsync -az --delete --relative infra services packages "user@host:/opt/courier/"
`;

const VERIFY_JOB = `
  verify:
    name: Build and smoke-test the staging stack (the local VM)
    if: github.event_name != 'workflow_run'
    runs-on: ubuntu-latest
    steps:
      - run: echo built
`;

function workflow(triggers, deploy) {
  return `name: Deploy staging\n${triggers}\npermissions:\n  contents: read\n  actions: read\njobs:\n${VERIFY_JOB}\n${deploy}\n`;
}

function run(text) {
  const dir = mkdtempSync(path.join(tmpdir(), 'deploy-gate-test-'));
  try {
    mkdirSync(path.join(dir, '.github', 'workflows'), { recursive: true });
    writeFileSync(path.join(dir, '.github', 'workflows', 'deploy.yml'), text, 'utf8');
    const answer = spawnSync(process.execPath, [CHECK], { cwd: dir, encoding: 'utf8' });
    return { code: answer.status, out: answer.stdout + answer.stderr };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('the real workflow passes', () => {
  const answer = run(readFileSync(path.join(ROOT, '.github', 'workflows', 'deploy.yml'), 'utf8'));
  assert.equal(answer.code, 0, answer.out);
  assert.match(answer.out, /the deploy runs on the gates' conclusion/);
});

test('a deploy that still runs on the push to main fails', () => {
  const answer = run(
    workflow(OLD_SHAPE_TRIGGERS, READY_DEPLOY.replace(
      "if: github.event_name == 'workflow_dispatch' || github.event_name == 'workflow_run'",
      "if: github.event_name == 'workflow_dispatch' || github.ref == 'refs/heads/main'",
    )),
  );
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /no workflow_run trigger|still runs on a push to main/);
});

test('a trigger that names only one gate fails', () => {
  const answer = run(
    workflow(
      READY_TRIGGERS.replace('workflows: ["CI", "Quality gates"]', 'workflows: ["CI"]'),
      READY_DEPLOY,
    ),
  );
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /does not name "Quality gates"/);
});

test('a trigger that reacts to requested instead of completed fails', () => {
  const answer = run(
    workflow(READY_TRIGGERS.replace('types: [completed]', 'types: [requested]'), READY_DEPLOY),
  );
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /does not react to \[completed\]/);
});

test('a deploy that checks out the branch tip fails', () => {
  const answer = run(
    workflow(
      READY_TRIGGERS,
      READY_DEPLOY.replace(
        'ref: \${{ github.event.workflow_run.head_sha || github.sha }}',
        'ref: main',
      ),
    ),
  );
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /does not check out `github.event.workflow_run.head_sha`/);
});

test('a deploy that needs the push-only verify job fails', () => {
  const answer = run(
    workflow(READY_TRIGGERS, READY_DEPLOY.replace('    runs-on: ubuntu-latest', '    needs: verify\n    runs-on: ubuntu-latest')),
  );
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /needs: verify/);
});

test('a workflow that dropped workflow_dispatch fails', () => {
  const answer = run(
    workflow(READY_TRIGGERS.replace('  workflow_dispatch:\n    inputs:\n      target:\n        type: choice\n', ''), READY_DEPLOY),
  );
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /dropped workflow_dispatch/);
});

test('a workflow with no deploy job at all fails', () => {
  const answer = run(workflow(READY_TRIGGERS, ''));
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /no deploy job at all/);
});
