// The test for the Semgrep-exclusions gate (audit 3d follow-up / BUG-226).
//
//   node --test scripts/ci/__tests__/check-semgrep-exclusions.test.mjs
//
// Every case is a property of the gate, run against a fabricated repo root in
// a temp tree: the real tree passes; an --exclude-rule with no .semgrepignore
// line fails; a missing .semgrepignore fails; a W-id cited by .semgrepignore
// with no row in CONSTRAINTS.md fails; a scan with no exclude-rule fails; a
// missing exceptions table fails.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CHECK = path.join(ROOT, 'scripts', 'ci', 'check-semgrep-exclusions.mjs');

const RULE_A = 'yaml.github-actions.security.workflow-run-target-code-checkout.workflow-run-target-code-checkout';
const RULE_B = 'python.lang.security.audit.logging.logger-credential-leak.python-logger-credential-disclosure';

const WORKFLOW = `name: Quality gates
on: [push]
jobs:
  sast:
    name: Static analysis (Semgrep)
    steps:
      - name: Semgrep (community rules)
        run: |
          uvx semgrep==1.182.1 scan \\
            --config p/default \\
            --exclude-rule "${RULE_A}" \\
            --exclude-rule "${RULE_B}" \\
            --error --quiet .
`;

const IGNORE = `# Semgrep findings that are accepted on purpose, with the reason.
#
# 1. The workflow_run checkout rule is a static heuristic; our deploy gates
#    the sha dynamically (W6).
#
# 2. The logger rule never logs a token (W5).
#
${RULE_A}
${RULE_B}
`;

const CONSTRAINTS = `# Constraints

## Exceptions

| ID | Rule | Path | Reason | Owner | Expires |
|----|------|------|--------|-------|---------|
| W5 | Semgrep: the logger rule | services/courier-voice | never a token | lead executor | 2026-12-01 |
| W6 | Semgrep: workflow-run-target-code-checkout | .github/workflows/deploy.yml | the gates run first | lead executor | 2026-12-01 |
`;

function tree({ workflow = WORKFLOW, ignore = IGNORE, constraints = CONSTRAINTS } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'semgrep-excl-test-'));
  try {
    if (workflow !== null) {
      mkdirSync(path.join(root, '.github', 'workflows'), { recursive: true });
      writeFileSync(path.join(root, '.github', 'workflows', 'quality-gates.yml'), workflow, 'utf8');
    }
    if (ignore !== null) writeFileSync(path.join(root, '.semgrepignore'), ignore, 'utf8');
    if (constraints !== null) {
      mkdirSync(path.join(root, 'docs', 'plan'), { recursive: true });
      writeFileSync(path.join(root, 'docs', 'plan', 'CONSTRAINTS.md'), constraints, 'utf8');
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
  assert.match(answer.stdout, /BUG-226: every --exclude-rule/);
});

test('an exclude-rule with no .semgrepignore line fails', () => {
  const answer = tree({ ignore: IGNORE.replace(`${RULE_A}\n`, '') });
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /no line for it/);
  assert.match(answer.out, new RegExp(RULE_A.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 60)));
});

test('a missing .semgrepignore fails', () => {
  const answer = tree({ ignore: null });
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /\.semgrepignore does not exist/);
});

test('a W-id cited with no CONSTRAINTS row fails', () => {
  const answer = tree({ constraints: CONSTRAINTS.replace('| W6 | Semgrep: workflow-run-target-code-checkout | .github/workflows/deploy.yml | the gates run first | lead executor | 2026-12-01 |\n', '') });
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /no W6 row/);
});

test('a scan with no exclude-rule fails', () => {
  const answer = tree({
    workflow: WORKFLOW.replace(/\s*--exclude-rule "[^"]+" \\\n/g, '\n'),
  });
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /excludes no rule at all/);
});

test('a missing exceptions table fails', () => {
  const answer = tree({ constraints: '# Constraints\n\nNo table here.\n' });
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /no exceptions table/);
});
