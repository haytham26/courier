// Audit item A4's build check: the mock stop list is unreachable from a
// non-E2E entry.
//
//   node scripts/ci/check-mock-reach.mjs
//
// BUG-079 (the same finding's other half): a release build that inlines
// `EXPO_PUBLIC_E2E=1` gets the mocks inline too, so the mock list must be
// provably reachable ONLY through the E2E seams - the two modules the build
// flags decide (the day the E2E build answers with, and the label reader).
// A screen that imports the mock list directly is a screen that can show a
// courier a day that is not the one the server holds.
//
// The rule: every file under apps/mobile that names mockStops must be one of
// the seams, or must sit behind the build flag itself. The check reads the
// source: it fails naming every file that names the list from outside the
// seams, so the list of offenders is the work left, not a surprise.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

// The modules the build flags decide - the only sanctioned importers of the
// mock list. The E2E day's seam is gated by the store's own `reason`; the
// label reader is gated by `readerForThisBuild`.
const SEAMS = [
  'apps/mobile/src/run/dayForThisBuild.ts',
  'apps/mobile/src/scans/labelReader.ts',
];

// The tree it guards is the working directory's, so the suite can point it at
// a temp tree of its own; the CI job and a developer's shell both run it from
// the repo root.
const ROOT = process.cwd();
const APP = path.join(ROOT, 'apps', 'mobile');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      if (entry === 'node_modules' || entry === '__tests__' || entry.startsWith('.')) {
        continue;
      }
      out.push(...walk(full));
    } else if (/\.tsx?$/.test(entry) && !entry.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(path.join(APP, 'src')).concat(walk(path.join(APP, 'app')));
if (files.length === 0) {
  console.error(
    `audit item A4: nothing was scanned - ${APP} holds no sources, which is not a ` +
      'clean tree. Point the gate at the app it guards.',
  );
  process.exit(1);
}

const offenders = [];
for (const file of files) {
  const relative = path.relative(ROOT, file).split(path.sep).join('/');
  if (SEAMS.includes(relative)) {
    continue;
  }
  const text = readFileSync(file, 'utf8');
  // An IMPORT is what makes the list reachable; a mention in a comment (the
  // hook's own doc line about the audit finding) is not.
  const importLine = /^\s*import\s+[^\n]*\bmockStops\b[^\n]*$/m;
  if (importLine.test(text)) {
    offenders.push(relative);
  }
}

if (offenders.length > 0) {
  console.error(
    'audit item A4: the mock stop list is reachable from outside the E2E seams -\n' +
      offenders.map((file) => `  ${file}`).join('\n') +
      '\nEach screen reads its stops through the run store (useRunDay); the list\n' +
      'itself stays behind the two build-flag seams.',
  );
  process.exit(1);
}
console.log('check-mock-reach: the mock list is reachable only through the E2E seams');
