#!/usr/bin/env node
/**
 * Runs the coverage for the JavaScript/TypeScript packages and the Python API,
 * then checks the floors in CONSTRAINTS.md.
 *
 *   node scripts/run-coverage.mjs
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const packages = [
  { name: '@courier/shared', dir: 'packages/shared' },
  { name: '@courier/design-tokens', dir: 'packages/design-tokens' },
  { name: '@courier/nz-address', dir: 'packages/nz-address' },
  { name: '@courier/auth', dir: 'services/auth' },
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: true, ...options });
  return result.status ?? 1;
}

mkdirSync('coverage', { recursive: true });

// The coverage summary of every package is merged into one file, because the
// gate reads a single summary (CONSTRAINTS.md is the only place with numbers).
const merged = { total: {} };
const perPackage = [];

for (const { name, dir } of packages) {
  console.log(`\n=== coverage: ${name} ===`);
  const status = run('corepack', [
    'pnpm',
    '--filter',
    name,
    'exec',
    'vitest',
    'run',
    '--coverage',
    '--coverage.reporter=json-summary',
    '--coverage.reporter=text',
  ]);
  if (status !== 0) {
    console.error(`coverage failed for ${name}`);
    process.exit(status);
  }
  const summaryPath = `${dir}/coverage/coverage-summary.json`;
  if (existsSync(summaryPath)) {
    const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
    perPackage.push({ name, summary });
    for (const [file, data] of Object.entries(summary)) {
      if (file === 'total') continue;
      merged[file] = data;
    }
  } else {
    console.error(`no coverage summary for ${name} (${summaryPath})`);
  }
}

writeFileSync('coverage/coverage-summary.json', JSON.stringify(merged, null, 2), 'utf8');
console.log(`\nmerged ${perPackage.length} package summaries into coverage/coverage-summary.json`);

console.log('\n=== coverage: the Python API ===');
const apiStatus = run('uv', [
  'run',
  '--directory',
  'apps/api',
  'pytest',
  '--cov=app',
  '--cov-report=json:coverage.json',
  '--cov-report=term-missing:skip-covered',
  '-q',
]);
if (apiStatus !== 0) {
  console.error('the API coverage run failed');
  process.exit(apiStatus);
}

console.log('\n=== check-coverage ===');
const gate = spawnSync(process.execPath, ['scripts/check-coverage.mjs'], { stdio: 'inherit' });
process.exit(gate.status ?? 1);
