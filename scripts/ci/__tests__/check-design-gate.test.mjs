// The test for the design-lab gate (release hygiene, 2026-11-06).
//
//   node --test scripts/ci/__tests__/check-design-gate.test.mjs
//
// Every case is a property of the gate, run against fabricated app trees in a
// temp dir: the real app passes, a metro config with no blockList fails, one
// blocking only compat fails, one blocking only design fails, one whose
// regexes also match a product screen fails, one gated on the wrong flag
// fails, a buildFlags that ignores a flag fails, a layout that registers the
// route unconditionally fails, and a tree whose gated files are gone fails
// (the gate must not go vacuous).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CHECK = path.join(ROOT, 'scripts', 'ci', 'check-design-gate.mjs');
const REAL_APP = path.join(ROOT, 'apps', 'mobile');

function run(appDir) {
  return spawnSync('node', [CHECK, '--app-dir', appDir], { encoding: 'utf8' });
}

/** A minimal but complete fabricated app tree, with overrides per case. */
function fabricate(overrides = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'design-gate-'));
  const app = path.join(dir, 'app-mobile');
  mkdirSync(path.join(app, 'app', 'design'), { recursive: true });
  mkdirSync(path.join(app, 'src', 'config'), { recursive: true });
  writeFileSync(path.join(app, 'app', 'design', 'index.tsx'), 'export default function Lab() { return null; }\n');
  writeFileSync(path.join(app, 'app', 'compat.tsx'), 'export default function Compat() { return null; }\n');
  writeFileSync(path.join(app, 'app', '_layout.tsx'), overrides.layout ?? REAL_LAYOUT);
  writeFileSync(path.join(app, 'metro.config.js'), overrides.metro ?? REAL_METRO);
  writeFileSync(path.join(app, 'src', 'config', 'buildFlags.ts'), overrides.flags ?? REAL_FLAGS);
  return { dir, app };
}

const REAL_METRO = readFileSync(path.join(REAL_APP, 'metro.config.js'), 'utf8');
const REAL_FLAGS = readFileSync(path.join(REAL_APP, 'src', 'config', 'buildFlags.ts'), 'utf8');
const REAL_LAYOUT = readFileSync(path.join(REAL_APP, 'app', '_layout.tsx'), 'utf8');

test('the real app passes the gate', () => {
  const r = run(REAL_APP);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /check-design-gate:/);
});

test('a metro config with no blockList fails', () => {
  const { dir, app } = fabricate({
    metro: REAL_METRO.replace(/const blocked = \[[\s\S]*?\];/, 'const blocked = [];'),
  });
  try {
    assert.notEqual(run(app).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a blockList missing the compat regex fails', () => {
  const { dir, app } = fabricate({
    // Plain string replace: the file's literal is /[/\\]app[/\\]compat\.tsx$/
    metro: REAL_METRO.replace('app[/\\\\]compat\\.tsx$', 'app[/\\\\]never-matches'),
  });
  try {
    const r = run(app);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /compat/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a blockList missing the design regex fails', () => {
  const { dir, app } = fabricate({
    metro: REAL_METRO.replace('app[/\\\\]design[/\\\\].*', 'app[/\\\\]never-matches'),
  });
  try {
    const r = run(app);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /design/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a blockList that also matches a product screen fails', () => {
  const { dir, app } = fabricate({
    // The extra literal goes on its OWN line, the way the gate reads them.
    metro: REAL_METRO.replace('const blocked = [', 'const blocked = [\n    /[/\\\\]app[/\\\\].*/,'),
  });
  try {
    const r = run(app);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /PRODUCT path/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a blockList applied unconditionally fails', () => {
  const { dir, app } = fabricate({
    metro: REAL_METRO.replace('if (!devScreensInBundle) {', 'if (true) {'),
  });
  try {
    assert.notEqual(run(app).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a buildFlags that ignores EXPO_PUBLIC_E2E fails', () => {
  const { dir, app } = fabricate({
    flags: REAL_FLAGS.replace(/\|\|\s*process\.env\.EXPO_PUBLIC_E2E === '1'/, ''),
  });
  try {
    assert.notEqual(run(app).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a layout that registers the design route unconditionally fails', () => {
  const { dir, app } = fabricate({
    layout: REAL_LAYOUT.replace(
      /DEV_SCREENS_IN_BUNDLE \? <Stack\.Screen name="design" \/> : null/,
      '<Stack.Screen name="design" />',
    ),
  });
  try {
    assert.notEqual(run(app).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a tree whose gated files are gone fails (no vacuous pass)', () => {
  const { dir, app } = fabricate();
  try {
    rmSync(path.join(app, 'app', 'compat.tsx'), { force: true });
    assert.notEqual(run(app).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
