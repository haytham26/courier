#!/usr/bin/env node
/**
 * The proof that the dev-only screens are out of the release build.
 *
 *   node scripts/dev/check-dev-screens.mjs
 *
 * The design lab (`app/design`, `app/design2`) and the compatibility screen
 * (`app/compat.tsx`) are diagnostics, not the product (MASTER_EXECUTION
 * section 16.1.7). The decision is a build-time flag, so the proof is the
 * bundle itself: the script exports the app twice and reads the two bundles.
 *
 *   the release export (no flag)  must NOT carry the lab or the compat screen
 *   the lab export (the flag on)  must carry them
 *
 * The product's own screen has to be in both: a bundle without it would mean
 * the export is broken, not that the screens are gone.
 *
 * The script needs the design tokens built (`pnpm --filter @courier/design-tokens
 * build`) and it takes a few minutes: it runs two full exports.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const APP = join(process.cwd(), 'apps', 'mobile');
const OUT = join(APP, '.expo', 'dev-screens-check');

/** The markers of the dev-only screens, and of the product, in the bundle. */
const DEV_MARKERS = ['compat-screen', 'design-index'];
const PRODUCT_MARKERS = ['today-screen'];

function exportApp(name, env) {
  const dir = join(OUT, name);
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  execFileSync(
    process.execPath,
    [join(APP, 'node_modules', 'expo', 'bin', 'cli'), 'export', '--platform', 'android', '--output-dir', dir, '--clear'],
    { cwd: APP, stdio: 'inherit', env: { ...process.env, ...env } },
  );
  return dir;
}

function bundleText(dir) {
  const jsDir = join(dir, '_expo', 'static', 'js', 'android');
  if (!existsSync(jsDir)) throw new Error(`the export has no bundle: ${jsDir}`);
  const file = readFileSync(join(jsDir, readdir(jsDir)[0]));
  return file.toString('latin1');
}

function readdir(dir) {
  return execFileSync(process.execPath, ['-e', `console.log(require('fs').readdirSync(${JSON.stringify(dir)}).join('\\n'))`], {
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean);
}

const count = (text, needle) => text.split(needle).length - 1;

let failures = 0;

console.log('=== the release export (no EXPO_PUBLIC_DESIGN_LAB, no EXPO_PUBLIC_E2E) ===');
const release = bundleText(exportApp('release', { EXPO_PUBLIC_DESIGN_LAB: '', EXPO_PUBLIC_E2E: '' }));
for (const marker of DEV_MARKERS) {
  const found = count(release, marker);
  console.log(`  ${marker}: ${found} occurrence(s) in the bundle`);
  if (found !== 0) {
    console.error(`  FAIL: the release bundle carries the dev-only screen "${marker}"`);
    failures += 1;
  }
}
for (const marker of PRODUCT_MARKERS) {
  const found = count(release, marker);
  console.log(`  ${marker} (the product): ${found} occurrence(s) in the bundle`);
  if (found === 0) {
    console.error(`  FAIL: the release bundle has no product screen ("${marker}"): the export is broken`);
    failures += 1;
  }
}

console.log('=== the lab export (EXPO_PUBLIC_DESIGN_LAB=1) ===');
const lab = bundleText(exportApp('lab', { EXPO_PUBLIC_DESIGN_LAB: '1' }));
for (const marker of DEV_MARKERS) {
  const found = count(lab, marker);
  console.log(`  ${marker}: ${found} occurrence(s) in the bundle`);
  if (found === 0) {
    console.error(`  FAIL: the lab bundle does not carry "${marker}": the flag does not work`);
    failures += 1;
  }
}

rmSync(OUT, { recursive: true, force: true });

if (failures > 0) {
  console.error(`check-dev-screens: ${failures} failure(s)`);
  process.exit(1);
}

console.log('check-dev-screens: the dev-only screens are in the lab build and out of the release build');
process.exit(0);
