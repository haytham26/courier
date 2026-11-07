// The BUG-245 suite: the PR-time mutation gate's scope detection must be right
// in both directions - a change that CAN move a service's floor must run it,
// and a documentation-only change must not spend the minutes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  computeScopes,
  loadScopes,
  parseSourcePaths,
  pipelineTouched,
  renderOutputs,
  repoRoot,
  resolveBaseSha,
  touchesScope,
} from '../changed-mutation-scopes.mjs';

const script = path.join(repoRoot, 'scripts', 'ci', 'changed-mutation-scopes.mjs');

const SCOPES = {
  api: { dir: 'services/api', sourcePaths: ['app/main.py', 'app/repo.py', 'app/auth'] },
  voice: {
    dir: 'services/courier-voice',
    sourcePaths: ['app/turns.py', 'app/conversation.py', 'app/safety.py', 'app/offline_brain.py'],
  },
};

test('parseSourcePaths reads the multi-line list of a real pyproject', () => {
  const api = parseSourcePaths(readFileSync(path.join(repoRoot, 'services/api/pyproject.toml'), 'utf8'));
  assert.deepEqual(api, [
    'app/main.py',
    'app/repo.py',
    'app/routing.py',
    'app/auth/jwks.py',
    'app/auth/routes.py',
    'app/auth/websocket.py',
  ]);
  const voice = parseSourcePaths(
    readFileSync(path.join(repoRoot, 'services/courier-voice/pyproject.toml'), 'utf8'),
  );
  assert.deepEqual(voice, ['app/turns.py', 'app/conversation.py', 'app/safety.py', 'app/offline_brain.py']);
});

test('parseSourcePaths reads single-line lists, single quotes and a missing section', () => {
  assert.deepEqual(parseSourcePaths('[tool.mutmut]\nsource_paths = ["a.py", \'b.py\']\n'), ['a.py', 'b.py']);
  assert.deepEqual(parseSourcePaths('[tool.pytest]\ntestpaths = ["tests"]\n'), []);
  assert.deepEqual(parseSourcePaths(''), []);
});

test('touchesScope matches a source file, a directory entry and the suite/config', () => {
  assert.equal(touchesScope(['services/api/app/repo.py'], 'services/api', SCOPES.api.sourcePaths), true);
  assert.equal(touchesScope(['services/api/app/auth/jwks.py'], 'services/api', SCOPES.api.sourcePaths), true);
  assert.equal(touchesScope(['services/api/tests/test_repo_db.py'], 'services/api', SCOPES.api.sourcePaths), true);
  assert.equal(touchesScope(['services/api/pyproject.toml'], 'services/api', SCOPES.api.sourcePaths), true);
  assert.equal(touchesScope(['services/api/uv.lock'], 'services/api', SCOPES.api.sourcePaths), true);
});

test('touchesScope ignores other services, docs and near-miss prefixes', () => {
  assert.equal(touchesScope(['services/courier-voice/app/turns.py'], 'services/api', SCOPES.api.sourcePaths), false);
  assert.equal(touchesScope(['docs/status/BUGS.md'], 'services/api', SCOPES.api.sourcePaths), false);
  // app/main.py.bak is not app/main.py, and appx/ is not app/
  assert.equal(touchesScope(['services/api/app/main.py.bak'], 'services/api', SCOPES.api.sourcePaths), false);
  assert.equal(touchesScope(['services/apix/app/main.py'], 'services/api', SCOPES.api.sourcePaths), false);
  // Windows-style separators from a diff are normalised
  assert.equal(touchesScope(['services\\api\\app\\repo.py'], 'services/api', SCOPES.api.sourcePaths), true);
});

test('pipelineTouched names the floor scripts and the two workflows', () => {
  assert.equal(pipelineTouched(['scripts/ci/check-mutation-floor.mjs']), true);
  assert.equal(pipelineTouched(['scripts/ci/changed-mutation-scopes.mjs']), true);
  assert.equal(pipelineTouched(['.github/workflows/mutation.yml']), true);
  assert.equal(pipelineTouched(['.github/workflows/quality-gates.yml']), true);
  assert.equal(pipelineTouched(['docs/plan/CONSTRAINTS.md']), false);
});

test('computeScopes gates each service on its own scope', () => {
  assert.deepEqual(computeScopes(['services/api/app/repo.py'], SCOPES), { api: true, voice: false });
  assert.deepEqual(computeScopes(['services/courier-voice/tests/test_safety.py'], SCOPES), {
    api: false,
    voice: true,
  });
  assert.deepEqual(computeScopes(['docs/log/CURRENT-backend.md'], SCOPES), { api: false, voice: false });
  // the pipeline itself changed: both scopes run
  assert.deepEqual(computeScopes(['.github/workflows/quality-gates.yml'], SCOPES), { api: true, voice: true });
});

test('loadScopes reads the real pyprojects and they are non-empty', () => {
  const scopes = loadScopes(repoRoot);
  assert.deepEqual(Object.keys(scopes).sort(), ['api', 'voice']);
  assert.ok(scopes.api.sourcePaths.length > 0, 'the API scope must parse');
  assert.ok(scopes.voice.sourcePaths.length > 0, 'the voice scope must parse');
  assert.equal(scopes.api.dir, 'services/api');
  assert.equal(scopes.voice.dir, 'services/courier-voice');
});

test('resolveBaseSha takes a real sha and falls back on zeros, empty and garbage', () => {
  const sha = '9c05df08bc22a7c0b2740b60ef8954417b393347';
  assert.equal(resolveBaseSha(sha, 'HEAD~1'), sha);
  assert.equal(resolveBaseSha('0'.repeat(40), 'HEAD~1'), 'HEAD~1');
  assert.equal(resolveBaseSha('', 'HEAD~1'), 'HEAD~1');
  assert.equal(resolveBaseSha('HEAD', 'HEAD~1'), 'HEAD~1');
  assert.equal(resolveBaseSha(undefined, 'HEAD~1'), 'HEAD~1');
});

test('renderOutputs writes one GITHUB_OUTPUT line per scope', () => {
  assert.equal(renderOutputs({ api: true, voice: false }), 'api=true\nvoice=false\n');
});

test('the CLI run by hand with a human event sets every scope', () => {
  const out = execFileSync('node', [script], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, EVENT_NAME: 'workflow_dispatch', GITHUB_OUTPUT: '' },
  });
  assert.match(out, /api=true/);
  assert.match(out, /voice=true/);
  assert.match(out, /asked for by a human/);
});
