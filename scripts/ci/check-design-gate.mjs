// The design-lab gate (release hygiene, 2026-11-06): the diagnostics must be
// unreachable from a release build, and provably so.
//
//   node scripts/ci/check-design-gate.mjs [app-dir]
//
// The design lab (`app/design`) and the compatibility screen (`app/compat.tsx`)
// are diagnostics, not the product (MASTER_EXECUTION §16.1.7). They are in the
// dev build and the E2E build only. Three things must hold at once, and this
// gate proves all three over the real files:
//
//   1. `metro.config.js` puts both paths on the resolver's blockList when
//      neither EXPO_PUBLIC_DESIGN_LAB nor EXPO_PUBLIC_E2E is '1' - so a release
//      bundle never contains the screens at all (not dead code: absent bytes),
//      and the blockList must NOT match any product screen, or the gate has
//      just broken the app;
//   2. `src/config/buildFlags.ts` computes DEV_SCREENS_IN_BUNDLE from exactly
//      those two flags, so babel inlines the same decision into the app code;
//   3. `app/_layout.tsx` registers the `design` route only under that flag.
//
// The gate also refuses to go vacuous: the gated files must exist.
import { parseArgs } from 'node:util';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const { values } = parseArgs({
  options: { 'app-dir': { type: 'string', default: path.join(ROOT, 'apps', 'mobile') } },
});
const APP = path.resolve(values['app-dir']);

const problems = [];

const metro = readFileSync(path.join(APP, 'metro.config.js'), 'utf8');
const flags = readFileSync(path.join(APP, 'src', 'config', 'buildFlags.ts'), 'utf8');
const layout = readFileSync(path.join(APP, 'app', '_layout.tsx'), 'utf8');

// --- 1. the metro blockList -------------------------------------------------
const condition = metro.match(/devScreensInBundle\s*=\s*([^;]+);/);
if (!condition) {
  problems.push('metro.config.js computes no devScreensInBundle from the build flags');
} else if (!/EXPO_PUBLIC_DESIGN_LAB/.test(condition[1]) || !/EXPO_PUBLIC_E2E/.test(condition[1])) {
  problems.push('metro.config.js gates the blockList on something other than EXPO_PUBLIC_DESIGN_LAB/EXPO_PUBLIC_E2E');
}
if (!/if \(!devScreensInBundle\)/.test(metro)) {
  problems.push('metro.config.js applies the blockList unconditionally or never: the blockList must sit inside `if (!devScreensInBundle)`');
}

// The two literals the blockList must carry, as (name, source) pairs. The
// gate checks each literal is present verbatim in the file AND proves what the
// blockList matches, so a literal edited into matching a product screen is
// caught below.
const BLOCK_PATTERNS = [
  { name: 'app/design/**', source: '[/\\\\]app[/\\\\]design[/\\\\].*' },
  { name: 'app/compat.tsx', source: '[/\\\\]app[/\\\\]compat\\.tsx$' },
];
const blockedRegexes = [];
for (const { name, source } of BLOCK_PATTERNS) {
  if (!metro.includes('/' + source + '/')) {
    problems.push(`metro.config.js does not block ${name}`);
  } else {
    blockedRegexes.push(new RegExp(source));
  }
}
// Every further literal line of the blocked array is behaviour-tested too (one
// literal per line, so a `/` inside a character class cannot split it).
const blockedBlock = metro.slice(metro.indexOf('const blocked'));
for (const line of blockedBlock.split('\n')) {
  const m = line.match(/^\s*\/(.+)\/[a-z]*,?\s*$/);
  if (!m) continue;
  if (BLOCK_PATTERNS.some((p) => p.source === m[1])) continue;
  try {
    blockedRegexes.push(new RegExp(m[1]));
  } catch {
    problems.push(`metro.config.js carries an unparseable blockList literal: ${line.trim()}`);
  }
}
// Metro tests whole file paths, so the leading separator before `app` is part
// of the match - the probe paths carry it, on both separators.
const mustBlock = [
  '/repo/apps/mobile/app/design/index.tsx',
  'C:\\repo\\apps\\mobile\\app\\design\\beacon.tsx',
  '/repo/apps/mobile/app/compat.tsx',
  'C:\\repo\\apps\\mobile\\app\\compat.tsx',
];
const mustNotBlock = [
  '/repo/apps/mobile/app/_layout.tsx',
  '/repo/apps/mobile/app/(tabs)/stops.tsx',
  '/repo/apps/mobile/app/delivered.tsx',
  '/repo/apps/mobile/src/lib/api-client.ts',
];
for (const p of mustBlock) {
  if (!blockedRegexes.some((re) => re.test(p))) {
    problems.push(`the blockList does not block the diagnostic path ${p}`);
  }
}
for (const p of mustNotBlock) {
  if (blockedRegexes.some((re) => re.test(p))) {
    problems.push(`the blockList also blocks the PRODUCT path ${p} - the gate would break the app`);
  }
}

// --- 2. the inlined flag ----------------------------------------------------
const flagExpr = flags.match(/DEV_SCREENS_IN_BUNDLE\s*=\s*([^;]+);/);
if (!flagExpr) {
  problems.push('buildFlags.ts exports no DEV_SCREENS_IN_BUNDLE');
} else if (!/EXPO_PUBLIC_DESIGN_LAB/.test(flagExpr[1]) || !/EXPO_PUBLIC_E2E/.test(flagExpr[1])) {
  problems.push('buildFlags.ts computes DEV_SCREENS_IN_BUNDLE from something other than the two flags');
}

// --- 3. the route registration ----------------------------------------------
if (!/DEV_SCREENS_IN_BUNDLE \? <Stack\.Screen name="design" \/>/.test(layout)) {
  problems.push('app/_layout.tsx does not register the design route conditionally on DEV_SCREENS_IN_BUNDLE');
}

// --- the gate must not go vacuous -------------------------------------------
const designDir = path.join(APP, 'app', 'design');
const compatFile = path.join(APP, 'app', 'compat.tsx');
if (!existsSync(designDir) || !statSync(designDir).isDirectory() || readdirSync(designDir).length === 0) {
  problems.push('app/design does not exist - the gate would pass over nothing');
}
if (!existsSync(compatFile)) {
  problems.push('app/compat.tsx does not exist - the gate would pass over nothing');
}

if (problems.length > 0) {
  console.error(`check-design-gate: the design lab is not provably out of the release build (${problems.length}):`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log(
  'check-design-gate: metro blocks app/design/** and app/compat.tsx when neither flag is set, ' +
    'buildFlags inlines the same decision, _layout registers the design route only under it, and the gated files exist',
);
