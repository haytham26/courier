// The test for the environment gate (BUG-107, the C1 audit's low finding).
//
//   node --test scripts/ci/__tests__/check-secrets.test.mjs
//
// The gate was referenced by no workflow, so it protected nothing, and it read
// `.env.local` from the caller's working directory, so it answered with an
// environment the repository never declared whenever it was called from
// anywhere but the root. These tests pin both halves through the real script:
//   - called from a subdirectory, with a clean environment, the gate finds the
//     repository's own .env.local and clears (RED first: the cwd-based path
//     read the subdirectory, found no file, and the required variables came
//     back missing, exit 1);
//   - a required variable that is nowhere fails the gate, by NAME, and the
//     secret's VALUE is never printed.
//
// The second assertion reads .env.local's value to look for it in the output
// and never prints it: the gate's own promise is that only names appear.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const script = path.join(repoRoot, 'scripts', 'ci', 'check-secrets.js');

/** The gate's required variables, so a clean environment can be built. */
const REQUIRED = ['DATABASE_URL', 'REDIS_URL', 'VALHALLA_URL', 'APP_ENV', 'NODE_ENV'];

/** An environment WITHOUT the required variables (the .env.local supplies them). */
function cleanEnv() {
  const env = { ...process.env };
  for (const name of REQUIRED) delete env[name];
  return env;
}

/** The value .env.local carries for a name, or undefined when it does not. */
function envFileValue(name) {
  const file = path.join(repoRoot, '.env.local');
  if (!existsSync(file)) return undefined;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(new RegExp(`^${name}=(.*)$`));
    if (match) return match[1].trim();
  }
  return undefined;
}

test('the gate reads the repository root\'s .env.local, not the caller\'s cwd (BUG-107)', {
  skip: existsSync(path.join(repoRoot, '.env.local')) ? false : 'this checkout carries no .env.local',
}, () => {
  // Called from a subdirectory, with the required variables nowhere in the
  // environment: only a root-based path can find them.
  const result = spawnSync(process.execPath, [script], {
    cwd: path.join(repoRoot, 'apps', 'mobile'),
    encoding: 'utf8',
    env: cleanEnv(),
  });

  assert.equal(result.status, 0, `${result.stdout ?? ''}${result.stderr ?? ''}`);
  assert.match(result.stdout, /OK DATABASE_URL/);
});

test('the gate prints names, never a secret value', () => {
  // Pins a behaviour that already works (the §14 exception, said plainly): the
  // gate loads the root's .env.local into its own environment and answers, and
  // whatever it loaded, no VALUE appears in the output - the promise its
  // header makes and the reason it may run in a CI log. The missing-variable
  // failure path is the same probe the first test runs red: with no reachable
  // .env.local the gate answered `MISSING DATABASE_URL` and exit 1.
  const result = spawnSync(process.execPath, [script], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: cleanEnv(),
  });

  assert.equal(result.status, 0, `${result.stdout ?? ''}${result.stderr ?? ''}`);
  assert.match(result.stdout, /OK DATABASE_URL/);
  const databaseUrl = envFileValue('DATABASE_URL');
  if (databaseUrl) {
    assert.ok(!result.stdout.includes(databaseUrl), 'the gate printed a secret value');
  }
});

test('the gate is referenced by a workflow job (BUG-107)', () => {
  // The wiring, checked against the real tree: the gate that protects nothing
  // when no job runs it must not go back to protecting nothing.
  const qualityGates = readFileSync(path.join(repoRoot, '.github/workflows/quality-gates.yml'), 'utf8');
  assert.match(qualityGates, /node scripts\/ci\/check-secrets\.js/);
});
