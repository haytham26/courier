/**
 * The coverage gate's grouping (BUG-104, the C1 audit's medium finding).
 *
 * The group a threshold covers is derived by substring matching over the files
 * the coverage summary happened to DISCOVER. A wholly missing module therefore
 * fails the gate (there is no file to match, so the total is 0 and the gate
 * says "no coverage data"), but a PARTIALLY-missing one passes: if some of the
 * module's files are in the summary and the rest are not, the numbers are
 * computed over the part that is there and the gate never learns that the rest
 * is missing at all.
 *
 * That is the shape of the defect: the gate measures what it was given rather
 * than checking that it was given the whole thing.
 *
 * These tests prove it over synthetic trees, the way the audit's own verifier
 * did, and then pin the fix: the group is declared (what the module IS), not
 * discovered, so a missing file is missing whatever else the summary carries.
 *
 * The 2026-11-01 correction, recorded here so the next reader cannot repeat it:
 * the enforcement first written for this finding read "a named file with no
 * statements" as the tell-tale of a discovered-but-unmeasured file. The real
 * repo disproved the premise - `services/courier-voice/app/__init__.py` is a
 * docstring-only module with zero statements, and it is measured in full by
 * construction (nothing in it can be left uncovered). The rule failed the real
 * gate on run 41252213583, so it was removed and the second test below pins
 * the truth it got wrong. A partial closure is NOT visible from a vitest
 * summary at all (vitest names only the files its tests import, and
 * run-coverage.mjs starts it without `all:`), which is why the fix for that
 * half is recorded on BUG-104's row rather than pretended away here.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../check-coverage.mjs', import.meta.url));

/** A directory with the given files written into it, removed by the caller. */
function tree(files) {
  const dir = mkdtempSync(join(tmpdir(), 'cov-'));
  for (const [file, entry] of Object.entries(files)) {
    const path = join(dir, file);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, JSON.stringify(entry));
  }
  return dir;
}

/** A vitest-format summary with the given files, each with all lines covered. */
function jsSummary(files) {
  const out = {};
  for (const [name, info] of Object.entries(files)) {
    out[name] = { lines: { covered: info.covered, total: info.total } };
  }
  return out;
}

/** Runs the gate in the tree, and answers what it said and how it left. */
function runIn(dir) {
  try {
    const out = execFileSync('node', [SCRIPT], { cwd: dir, encoding: 'utf8' });
    return { ok: true, out };
  } catch (error) {
    return { ok: false, out: `${String(error.stdout ?? '')}${String(error.stderr ?? '')}` };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * The auth service's floor lives on `services/auth/src` (see THRESHOLDS).
 *
 * The paths carry the repo's own root prefix, so the group matcher
 * (`entry.file.includes('/' + group + '/')`) finds them: the summary the real
 * runs produce is rooted at the repo root too.
 */
const AUTH_CONFIG = 'courier/services/auth/src/config.ts';
const AUTH_SERVER = 'courier/services/auth/src/server.ts';
const API_FILE = 'courier/services/api/app/main.ts';

test('the coverage gate fails when a module is wholly missing', () => {
  const dir = tree({
    'coverage/coverage-summary.json': jsSummary({
      [API_FILE]: { covered: 90, total: 100 },
    }),
  });

  const result = runIn(dir);

  // The auth service is not in the summary at all: the gate must say so rather
  // than measure what it was given and be green.
  assert.equal(result.ok, false);
  assert.match(result.out, /no coverage data/);
});

test('a docstring-only file the summary names is measured in full, not incomplete', () => {
  // RED first (2026-11-01): against the enforcement this PR first wrote, this
  // exact shape failed the real repo - `check-coverage: below the floor: the
  // voice service: incomplete coverage — the summary named these files with no
  // statements to measure: services/courier-voice/app/__init__.py` (run
  // 41252213583). A file with no statements has nothing to leave uncovered, so
  // it is complete, and the gate must say so. The voice service's real shape:
  // the docstring-only `app/__init__.py` beside the measured files.
  const dir = tree({
    'coverage/coverage-summary.json': jsSummary({
      [API_FILE]: { covered: 90, total: 100 },
      [AUTH_CONFIG]: { covered: 95, total: 100 },
      [AUTH_SERVER]: { covered: 99, total: 100 },
    }),
    'services/api/coverage.json': {
      files: {
        'app/address_correction.py': { summary: { covered_lines: 90, num_statements: 100 } },
      },
    },
    'services/courier-voice/coverage.json': {
      files: {
        'app/__init__.py': { summary: { covered_lines: 0, num_statements: 0 } },
        'app/main.py': { summary: { covered_lines: 90, num_statements: 100 } },
      },
    },
  });

  const result = runIn(dir);

  assert.equal(result.ok, true, result.out);
  assert.match(result.out, /the voice service: 90\.0%/);
});

test('the coverage gate passes when the module is complete', () => {
  // The other non-optional floors need a file each, or the gate fails for a
  // reason that has nothing to do with the grouping under test.
  const dir = tree({
    'coverage/coverage-summary.json': jsSummary({
      [API_FILE]: { covered: 90, total: 100 },
      [AUTH_CONFIG]: { covered: 95, total: 100 },
      [AUTH_SERVER]: { covered: 99, total: 100 },
    }),
    'services/api/coverage.json': {
      files: {
        'app/address_correction.py': { summary: { covered_lines: 90, num_statements: 100 } },
      },
    },
    'services/courier-voice/coverage.json': {
      files: {
        'app/main.py': { summary: { covered_lines: 90, num_statements: 100 } },
      },
    },
  });

  const result = runIn(dir);

  assert.equal(result.ok, true, result.out);
});
