// Tests for the visual-regression gate (BUG-203, PARITY row 187): the PNG
// codec round-trips, the diff counts only pixels beyond the per-channel
// tolerance, the manifest integrity check catches a tampered baseline, the
// fresh-compare fails an over-tolerance regression and a dimension change but
// passes a sub-tolerance one, --update re-baselines with the new sha256, and
// the CLI's exit codes (0 pass, 1 fail, 2 misuse) are the contract CI runs.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  TOLERANCE,
  compareFresh,
  decodePng,
  diffPng,
  encodePng,
  parseCaptureName,
  readManifest,
  sha256File,
  updateBaselines,
  verifyManifest,
} from '../check-visual-baselines.mjs';

const SCRIPT = fileURLToPath(new URL('../check-visual-baselines.mjs', import.meta.url));

function tmp() {
  return mkdtempSync(join(tmpdir(), 'visual-baselines-test-'));
}

/** A solid RGBA image with one pixel set to (r,g,b). */
function image(width, height, fill = [20, 30, 40, 255], pixel = null) {
  const buf = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    buf[i * 4] = fill[0];
    buf[i * 4 + 1] = fill[1];
    buf[i * 4 + 2] = fill[2];
    buf[i * 4 + 3] = fill[3];
  }
  if (pixel !== null) {
    const [x, y, r, g, b] = pixel;
    const at = (y * width + x) * 4;
    buf[at] = r;
    buf[at + 1] = g;
    buf[at + 2] = b;
  }
  return buf;
}

function png(dir, name, width, height, rgba) {
  writeFileSync(join(dir, name), encodePng(width, height, rgba));
}

function manifestWith(entries) {
  return { version: 1, tolerance: TOLERANCE, entries };
}

function baselineEntry(dir, name, width, height, rgba) {
  png(dir, name, width, height, rgba);
  const decoded = decodePng(readFileSync(join(dir, name)));
  return {
    file: name,
    screen: parseCaptureName(name).screen,
    view: parseCaptureName(name).view,
    status: 'baseline',
    width: decoded.width,
    height: decoded.height,
    sha256: sha256File(join(dir, name)),
    source: 'test run 1 artifact screen-recordings',
    capturedAt: '2026-11-07T00:00:00.000Z',
  };
}

test('the PNG codec round-trips RGBA through encode and decode', () => {
  const dir = tmp();
  try {
    const rgba = image(7, 5, [1, 2, 3, 255], [3, 2, 250, 128, 90]);
    png(dir, 'x.png', 7, 5, rgba);
    const decoded = decodePng(readFileSync(join(dir, 'x.png')));
    assert.equal(decoded.width, 7);
    assert.equal(decoded.height, 5);
    assert.equal(decoded.channels, 4);
    assert.deepEqual([...decoded.data.subarray(0, 4)], [1, 2, 3, 255]);
    const at = (2 * 7 + 3) * 4;
    assert.deepEqual([...decoded.data.subarray(at, at + 4)], [250, 128, 90, 255]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('decodePng refuses a non-PNG and an unsupported color type', () => {
  assert.throws(() => decodePng(Buffer.from('not a png at all')), /bad signature/);
});

test('diffPng counts only pixels beyond the per-channel tolerance', () => {
  const a = decodePng(encodePng(10, 10, image(10, 10)));
  const identical = diffPng(a, decodePng(encodePng(10, 10, image(10, 10))));
  assert.equal(identical.diffPixels, 0);
  assert.equal(identical.diffPct, 0);

  // 5 pixels shifted by +5: under the per-channel tolerance of 8.
  const near = image(10, 10);
  for (let i = 0; i < 5; i += 1) near[i * 4] += 5;
  const nearDiff = diffPng(a, decodePng(encodePng(10, 10, near)));
  assert.equal(nearDiff.diffPixels, 0);

  // the same 5 pixels shifted by +100: over tolerance.
  const far = image(10, 10);
  for (let i = 0; i < 5; i += 1) far[i * 4] += 100;
  const farDiff = diffPng(a, decodePng(encodePng(10, 10, far)));
  assert.equal(farDiff.diffPixels, 5);
  assert.equal(farDiff.diffPct, 5);

  // a resize is a 100 % regression, never noise.
  const resized = diffPng(a, decodePng(encodePng(11, 10, image(11, 10))));
  assert.equal(resized.dimensionsDiffer, true);
});

test('verifyManifest passes a sound manifest, fails a tampered file, and lists pending views', () => {
  const dir = tmp();
  try {
    const entry = baselineEntry(dir, '03-today-day-small.png', 8, 8, image(8, 8));
    const pending = { file: '03-today-day-large.png', screen: '03-today', view: 'day-large', status: 'pending' };
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifestWith([entry, pending])));

    const ok = verifyManifest(dir);
    assert.deepEqual(ok.problems, []);
    assert.deepEqual(ok.pending, ['03-today-day-large.png']);

    // tamper with the baseline bytes without updating the manifest
    const path = join(dir, entry.file);
    const bytes = readFileSync(path);
    bytes[bytes.length - 20] ^= 0xff;
    writeFileSync(path, bytes);
    const broken = verifyManifest(dir);
    assert.equal(broken.problems.length, 1);
    assert.match(broken.problems[0], /sha256/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('compareFresh passes a sub-tolerance capture and fails an over-tolerance one', () => {
  const base = tmp();
  const fresh = tmp();
  try {
    const entry = baselineEntry(base, '04-driving-day-small.png', 10, 10, image(10, 10));
    writeFileSync(join(base, 'manifest.json'), JSON.stringify(manifestWith([entry])));

    // identical capture
    png(fresh, '04-driving-day-small.png', 10, 10, image(10, 10));
    const same = compareFresh(base, fresh, readManifest(base));
    assert.deepEqual(same.problems, []);
    assert.equal(same.reports[0].diffPct, 0);

    // 1 of 100 pixels changed hard: 1 % > 0.5 % gate -> fail
    png(fresh, '04-driving-day-small.png', 10, 10, image(10, 10, [20, 30, 40, 255], [0, 0, 200, 200, 200]));
    const regressed = compareFresh(base, fresh, readManifest(base));
    assert.equal(regressed.problems.length, 1);
    assert.match(regressed.problems[0], /1\/100 pixels differ \(1\.000 %\)/);

    // a capture with no baseline entry fails (unknown shot)
    rmSync(join(fresh, '04-driving-day-small.png'));
    png(fresh, '05-delivered-day-small.png', 10, 10, image(10, 10));
    const unknown = compareFresh(base, fresh, readManifest(base));
    assert.match(unknown.problems[0], /no baseline entry/);

    // a dimension change fails as a resize
    png(fresh, '04-driving-day-small.png', 12, 10, image(12, 10));
    const resized = compareFresh(base, fresh, readManifest(base));
    assert.match(resized.problems[0], /resize is a regression/);
  } finally {
    rmSync(base, { recursive: true, force: true });
    rmSync(fresh, { recursive: true, force: true });
  }
});

test('an empty fresh directory fails rather than passing vacuously', () => {
  const base = tmp();
  const fresh = tmp();
  try {
    const entry = baselineEntry(base, '03-today-night-small.png', 6, 6, image(6, 6));
    writeFileSync(join(base, 'manifest.json'), JSON.stringify(manifestWith([entry])));
    const result = compareFresh(base, fresh, readManifest(base));
    assert.match(result.problems[0], /no \.png captures/);
  } finally {
    rmSync(base, { recursive: true, force: true });
    rmSync(fresh, { recursive: true, force: true });
  }
});

test('updateBaselines re-baselines with the new sha256 and promotes a pending view', () => {
  const base = tmp();
  const fresh = tmp();
  try {
    const entry = baselineEntry(base, '03-today-day-small.png', 8, 8, image(8, 8));
    const pending = { file: '03-today-day-small-200pct.png', screen: '03-today', view: 'day-small-200pct', status: 'pending' };
    writeFileSync(join(base, 'manifest.json'), JSON.stringify(manifestWith([entry, pending])));

    png(fresh, '03-today-day-small.png', 8, 8, image(8, 8, [9, 9, 9, 255]));
    png(fresh, '03-today-day-small-200pct.png', 8, 8, image(8, 8, [7, 7, 7, 255]));

    const { problems, manifest } = updateBaselines(base, fresh, 'run 42353916218 artifact screen-recordings');
    assert.deepEqual(problems, []);
    const updated = manifest.entries.find((e) => e.file === '03-today-day-small.png');
    assert.equal(updated.sha256, sha256File(join(base, '03-today-day-small.png')));
    assert.equal(updated.source, 'run 42353916218 artifact screen-recordings');
    const promoted = manifest.entries.find((e) => e.file === '03-today-day-small-200pct.png');
    assert.equal(promoted.status, 'baseline');
    assert.ok(existsSync(join(base, '03-today-day-small-200pct.png')));

    // the manifest on disk is the returned one, and verify passes afterwards
    assert.deepEqual(verifyManifest(base).problems, []);
  } finally {
    rmSync(base, { recursive: true, force: true });
    rmSync(fresh, { recursive: true, force: true });
  }
});

test('updateBaselines refuses an unknown capture without --allow-new', () => {
  const base = tmp();
  const fresh = tmp();
  try {
    const entry = baselineEntry(base, '03-today-day-small.png', 8, 8, image(8, 8));
    writeFileSync(join(base, 'manifest.json'), JSON.stringify(manifestWith([entry])));
    png(fresh, '09-map-style-day-small.png', 8, 8, image(8, 8));
    const { problems } = updateBaselines(base, fresh, 'run 1');
    assert.match(problems[0], /no baseline entry and --allow-new was not given/);
  } finally {
    rmSync(base, { recursive: true, force: true });
    rmSync(fresh, { recursive: true, force: true });
  }
});

test('parseCaptureName splits screen and view, including the text scale', () => {
  assert.deepEqual(parseCaptureName('03-today-day-small.png'), { screen: '03-today', view: 'day-small' });
  assert.deepEqual(parseCaptureName('12-driving-night-large-200pct.png'), { screen: '12-driving', view: 'night-large-200pct' });
  assert.throws(() => parseCaptureName('today.png'), /does not match/);
});

test('the CLI exit codes are the contract: 0 verify pass, 1 compare fail, 2 misuse', () => {
  const base = tmp();
  const fresh = tmp();
  try {
    const entry = baselineEntry(base, '03-today-day-small.png', 8, 8, image(8, 8));
    writeFileSync(join(base, 'manifest.json'), JSON.stringify(manifestWith([entry])));

    const run = (args) => {
      try {
        execFileSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
        return 0;
      } catch (error) {
        return error.status;
      }
    };

    assert.equal(run(['--baselines', base]), 0);

    png(fresh, '03-today-day-small.png', 8, 8, image(8, 8, [9, 9, 9, 255], [0, 0, 250, 250, 250]));
    assert.equal(run(['--baselines', base, '--fresh', fresh]), 1);

    png(fresh, '03-today-day-small.png', 8, 8, image(8, 8));
    assert.equal(run(['--baselines', base, '--fresh', fresh]), 0);

    assert.equal(run(['--baselines', join(base, 'nope')]), 2);
    assert.equal(run(['--fresh', fresh, '--update']), 2); // missing --source
  } finally {
    rmSync(base, { recursive: true, force: true });
    rmSync(fresh, { recursive: true, force: true });
  }
});
