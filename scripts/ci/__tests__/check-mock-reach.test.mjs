// The test for the A4 mock-reachability gate.
//
//   node --test scripts/ci/__tests__/check-mock-reach.test.mjs
//
// Every case is either the damage that was really on main when the gate was
// written (the five screens naming the mock list directly), a near miss that
// must NOT be flagged (a seam, a test file, a node_modules file), or the gate
// going vacuous (a tree with no files at all must fail rather than pass).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CHECK = path.join(ROOT, 'scripts', 'ci', 'check-mock-reach.mjs');

/** A temp repo tree with the files given, and the gate run over it. */
function over(files) {
  const dir = mkdtempSync(path.join(tmpdir(), 'mock-reach-'));
  try {
    mkdirSync(path.join(dir, 'apps', 'mobile', 'src', 'run'), { recursive: true });
    mkdirSync(path.join(dir, 'apps', 'mobile', 'app', '(tabs)'), { recursive: true });
    mkdirSync(path.join(dir, 'apps', 'mobile', 'src', 'scans'), { recursive: true });
    mkdirSync(path.join(dir, 'apps', 'mobile', 'src', 'maps'), { recursive: true });
    for (const [relative, text] of Object.entries(files)) {
      writeFileSync(path.join(dir, relative), text, 'utf8');
    }
    const result = spawnSync(process.execPath, [CHECK], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env },
    });
    return { code: result.status, out: result.stdout + result.stderr };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const SEAM = "import { mockStops } from '@/maps/stops';\nexport const day = () => mockStops;\n";

test('a screen that names the mock list directly fails, and is named', () => {
  const { code, out } = over({
    'apps/mobile/app/(tabs)/map.tsx':
      "import { mockStops } from '@/maps/stops';\nexport const Map = () => mockStops;\n",
    'apps/mobile/app/(tabs)/stops.tsx':
      "import { mockStops } from '@/maps/stops';\nexport const Stops = () => mockStops;\n",
  });
  assert.notEqual(code, 0);
  assert.match(out, /map\.tsx/);
  assert.match(out, /stops\.tsx/);
});

test('the two build-flag seams are not flagged', () => {
  const { code } = over({
    'apps/mobile/src/maps/stops.ts': 'export const mockStops = [];\n',
    'apps/mobile/src/run/dayForThisBuild.ts': SEAM,
    'apps/mobile/src/scans/labelReader.ts': SEAM,
  });
  assert.equal(code, 0);
});

test('a screen reading the run store is not flagged (the E2E day rides the store)', () => {
  const { code } = over({
    'apps/mobile/app/(tabs)/index.tsx': "import { useRun } from '@/maps/runState';\nexport const Today = () => useRun().day.stops;\n",
    'apps/mobile/src/run/dayForThisBuild.ts': SEAM,
  });
  assert.equal(code, 0);
});

test('a tree with no files fails rather than passing vacuously', () => {
  const { code, out } = over({});
  assert.notEqual(code, 0);
  assert.match(out, /apps\/mobile/);
});

test('the gate is clean over the repository itself once A4 lands', () => {
  // This case is the A4 done-when: it fails while any screen still names the
  // list, so it cannot go unnoticed.
  const result = spawnSync(process.execPath, [CHECK], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env },
  });
  const offenders = (result.stdout + result.stderr)
    .split('\n')
    .filter((line) => /^\s+apps\/mobile/.test(line))
    .map((line) => line.trim());
  assert.deepEqual(offenders, [], `the mock list is still reachable from: ${offenders.join(', ')}`);
});
