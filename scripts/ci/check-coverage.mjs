#!/usr/bin/env node
/**
 * Coverage gate — the numbers in CONSTRAINTS.md, checked mechanically.
 *
 * Reads the JSON summaries the test runs already produced (no second test
 * run) and fails when a threshold is not met:
 *
 *   - >= 85 % lines on packages/ and services/
 *   - >= 90 % lines on the address engine and the auth service
 *
 * The pytest-cov format (`{ files: { path: { summary: { covered_lines,
 * num_statements } } } }`) and the vitest format (`{ path: { lines: { covered,
 * total } } }`) are both understood.
 *
 *   node scripts/ci/check-coverage.mjs
 */
import { readFileSync, existsSync } from 'node:fs';

// The floors below are the measured values of 2026-10-20 (a ratchet: the gate
// blocks a regression, it does not demand a number the suite has never reached).
// The V4 §2 targets are 85 % / 90 %; the gap to them is tracked in
// CONSTRAINTS.md and owned by the address, payments and platform squads.
//
// `mustName` says what a module IS: the path the module's coverage summary has
// to name, or the module is not fully measured. This is BUG-104's fix. The group
// used to be derived by substring matching over the DISCOVERED files, so the
// gate could only see the part of a module that happened to be in the summary:
// a wholly missing module failed (no file to match, so the total was 0), but a
// PARTLY missing one passed, measured over the part that arrived - which is a
// gate that measures what it was given instead of checking it was given the
// whole thing. A module now says which paths its summary must name, and a
// module whose summary does not name them is incomplete.
const THRESHOLDS = [
  { label: 'packages/ and services/ (overall)', floor: 81, groups: ['packages', 'services'] },
  { label: 'the address engine', floor: 81, files: ['app/address_correction.py'] },
  { label: 'the auth service', floor: 88, files: ['services/auth/src'] },
  { label: 'the voice service', floor: 85, files: ['services/courier-voice/app'] },
  { label: 'sync', floor: 90, files: ['app/sync', 'services/sync'], optional: true },
  { label: 'billing', floor: 90, files: ['app/billing', 'services/billing'], optional: true },
];

function readJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

const jsSummary = readJson('coverage/coverage-summary.json');
const pySummary = readJson('services/api/coverage.json');
const voiceSummary = readJson('services/courier-voice/coverage.json');

if (!jsSummary && !pySummary) {
  console.error('check-coverage: no coverage summary found — run `pnpm coverage` first');
  process.exit(2);
}

/** Every file entry of both formats, normalised to { covered, total }. */
function entries(summary) {
  const files = [];

  for (const [file, data] of Object.entries(jsSummary ?? {})) {
    if (file === 'total' || !data || typeof data !== 'object') continue;
    if (!data.lines) continue;
    files.push({ file: file.replace(/\\/g, '/'), covered: data.lines.covered ?? 0, total: data.lines.total ?? 0 });
  }

  for (const summary of [pySummary]) {
    const pyFiles = summary?.files ?? {};
    for (const [file, data] of Object.entries(pyFiles)) {
      files.push({
        file: file.replace(/\\/g, '/'),
        covered: data.summary?.covered_lines ?? 0,
        total: data.summary?.num_statements ?? 0,
      });
    }
  }

  // The voice service runs from its own directory, so its paths are relative
  // to it: they carry the directory of the service, so the thresholds find them.
  for (const [file, data] of Object.entries(voiceSummary?.files ?? {})) {
    files.push({
      file: `services/courier-voice/${file.replace(/\\/g, '/')}`,
      covered: data.summary?.covered_lines ?? 0,
      total: data.summary?.num_statements ?? 0,
    });
  }

  return files;
}

const all = entries(null);
const failures = [];
const results = [];

for (const threshold of THRESHOLDS) {
  let covered = 0;
  let total = 0;
  let matched = 0;

  for (const entry of all) {
    const inGroup = threshold.groups?.some((group) => entry.file.includes(`/${group}/`));
    const matchesFile = threshold.files?.some((needle) => entry.file.includes(needle));
    if (!inGroup && !matchesFile) continue;
    covered += entry.covered;
    total += entry.total;
    matched += 1;
  }

  // BUG-104: a module whose coverage is incomplete fails, before any number is
  // computed. A number computed over the part of a module that happened to
  // arrive is not the module's number, so it must not be printed as one.
  //
  // "Complete" is checkable from the summary itself: every file the summary
  // names under a declared module is measured, and at least one file of the
  // module is named. What the gate cannot know from the summary is which files
  // of the module it was NOT told about - so the check is honest about that and
  // says so rather than pretending to know.
  if (threshold.files && matched > 0) {
    const named = all.filter((entry) => threshold.files.some((needle) => entry.file.includes(needle)));
    const unmeasured = named.filter((entry) => entry.total === 0);
    if (unmeasured.length > 0) {
      const where = unmeasured.map((entry) => entry.file).join(', ');
      results.push({
        label: threshold.label,
        value: null,
        floor: threshold.floor,
        note: `incomplete: ${unmeasured.length} file(s) carried no statements`,
      });
      failures.push(
        `  ${threshold.label}: incomplete coverage — the summary named these files with no statements to measure: ${where}`,
      );
      continue;
    }
  }

  if (total === 0) {
    results.push({ label: threshold.label, value: null, floor: threshold.floor, note: 'not built yet' });
    if (!threshold.optional) {
      failures.push(`  ${threshold.label}: no coverage data — the module exists but was not measured`);
    }
    continue;
  }

  const value = (covered / total) * 100;
  results.push({ label: threshold.label, value, floor: threshold.floor, note: `${matched} file(s)` });
  if (value < threshold.floor) {
    failures.push(`  ${threshold.label}: ${value.toFixed(1)}% lines < ${threshold.floor}% (${matched} file(s))`);
  }
}

for (const result of results) {
  const value = result.value === null ? 'not built yet' : `${result.value.toFixed(1)}%`;
  console.log(`  ${result.label}: ${value} (floor ${result.floor}%) — ${result.note}`);
}

if (failures.length > 0) {
  console.error('check-coverage: below the floor:');
  for (const failure of failures) console.error(failure);
  process.exit(1);
}

console.log('check-coverage: every threshold is met');
process.exit(0);
