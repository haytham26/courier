// The test for the issuer gate (BUG-122).
//
//   node --test scripts/ci/__tests__/check-auth-issuer.test.mjs
//
// The gate's job is to catch a tree where the API checks one issuer and the
// auth service signs with another. Every case below is that shape, plus the
// near misses that must NOT be flagged: a compose file that does not deploy
// the pair, a single shared variable, and an override whose default IS the
// auth service's own URL. A gate that only ever sees clean input proves
// nothing, and a gate that goes red on clean input is worse than none.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkComposeFiles, environmentBlocks, findingsIn } from '../check-auth-issuer.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/** The shape that is on main today: one expression, shared by both sides. */
const ON_MAIN = `
  api:
    environment:
      AUTH_JWKS_URL: http://auth:3001/api/auth\${AUTH_JWKS_PATH:-/jwks}
      AUTH_JWT_ISSUER: \${AUTH_JWT_ISSUER:-https://\${COURIER_DOMAIN}}
  auth:
    environment:
      BETTER_AUTH_SECRET: \${BETTER_AUTH_SECRET:?required}
      BETTER_AUTH_URL: https://\${COURIER_DOMAIN:?COURIER_DOMAIN is required}
      AUTH_JWT_ISSUER: \${AUTH_JWT_ISSUER:-https://\${COURIER_DOMAIN}}
`;

function inTempDir(name, text) {
  const dir = mkdtempSync(path.join(tmpdir(), 'check-auth-issuer-'));
  mkdirSync(path.join(dir, 'infra'), { recursive: true });
  writeFileSync(path.join(dir, 'infra', `compose.${name}.yml`), text, 'utf8');
  return dir;
}

test('the shape on main is clean', () => {
  assert.deepEqual(findingsIn('compose.prod.yml', ON_MAIN), []);
});

test('the environment blocks are read out of a real compose file', () => {
  const blocks = environmentBlocks(ON_MAIN);
  assert.equal(blocks.length, 2);
  assert.equal(
    blocks[0].AUTH_JWKS_URL,
    'http://auth:3001/api/auth${AUTH_JWKS_PATH:-/jwks}',
  );
  assert.equal(
    blocks[1].BETTER_AUTH_URL,
    'https://${COURIER_DOMAIN:?COURIER_DOMAIN is required}',
  );
  // A key at the block's own level ends the block; an anchor carries no keys.
  assert.equal('NODE_ENV' in blocks[0], false);
});

test('the block ends at the next key of its own indentation', () => {
  const text = [
    '  api:',
    '    environment:',
    '      AUTH_JWT_ISSUER: https://a.test',
    '    image: courier-api',
    '  auth:',
    '    environment:',
    '      BETTER_AUTH_SECRET: x',
    '      AUTH_JWT_ISSUER: https://a.test',
    '',
  ].join('\n');
  const blocks = environmentBlocks(text);
  assert.equal(blocks.length, 2);
  assert.deepEqual(Object.keys(blocks[0]), ['AUTH_JWT_ISSUER']);
});

test('the API and the auth service signing different issuers is flagged', () => {
  const text = ON_MAIN.replace(
    'AUTH_JWT_ISSUER: ${AUTH_JWT_ISSUER:-https://${COURIER_DOMAIN}}',
    'AUTH_JWT_ISSUER: https://signing.example.com',
  );
  const findings = findingsIn('compose.prod.yml', text);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].kind, 'two-issuers');
  assert.match(findings[0].message, /signing\.example\.com/);
  assert.match(findings[0].message, /AUTH_JWT_ISSUER/);
});

test('an override whose default is not the auth URL is flagged', () => {
  // Both sides carry the SAME override; the default it falls back to is what
  // the auth service would be signing with when nobody sets the variable.
  const text = ON_MAIN.replaceAll(
    'AUTH_JWT_ISSUER: ${AUTH_JWT_ISSUER:-https://${COURIER_DOMAIN}}',
    'AUTH_JWT_ISSUER: ${AUTH_JWT_ISSUER:-https://wrong.example.com}',
  );
  const findings = findingsIn('compose.prod.yml', text);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].kind, 'issuer-vs-url');
  assert.match(findings[0].message, /wrong\.example\.com/);
  assert.match(findings[0].message, /BETTER_AUTH_URL/);
});

test('one shared variable on both sides is clean', () => {
  const text = `
  api:
    environment:
      AUTH_JWKS_URL: http://auth:3001/api/auth/jwks
      AUTH_JWT_ISSUER: \${COURIER_AUTH_ISSUER}
  auth:
    environment:
      BETTER_AUTH_SECRET: x
      BETTER_AUTH_URL: \${COURIER_AUTH_BASE_URL}
      AUTH_JWT_ISSUER: \${COURIER_AUTH_ISSUER}
`;
  assert.deepEqual(findingsIn('compose.staging.yml', text), []);
});

test('a compose file that does not deploy the pair is not flagged', () => {
  const text = `
  cache:
    environment:
      REDIS_URL: redis://cache:6379
  worker:
    environment:
      QUEUE: jobs
`;
  assert.deepEqual(findingsIn('compose.tools.yml', text), []);
});

test('only one of the two sides configured is flagged, by name', () => {
  const text = `
  api:
    environment:
      AUTH_JWKS_URL: http://auth:3001/api/auth/jwks
      AUTH_JWT_ISSUER: https://a.test
`;
  const findings = findingsIn('compose.onlyapi.yml', text);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].kind, 'half');
});

test('the whole repo passes: the gate is green on the tree it ships in', () => {
  const { findings, files } = checkComposeFiles(path.join(repoRoot, 'infra'));
  assert.ok(files.length >= 1, 'compose files were read');
  assert.deepEqual(findings, []);
});

test('a broken tree fails, and says the file and the two values', () => {
  const dir = inTempDir(
    'prod',
    ON_MAIN.replace(
      'AUTH_JWT_ISSUER: ${AUTH_JWT_ISSUER:-https://${COURIER_DOMAIN}}',
      'AUTH_JWT_ISSUER: https://drifted.example.com',
    ),
  );
  try {
    const { findings } = checkComposeFiles(path.join(dir, 'infra'));
    assert.equal(findings.length, 1);
    assert.equal(findings[0].file, 'compose.prod.yml');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
