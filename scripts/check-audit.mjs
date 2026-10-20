#!/usr/bin/env node
/**
 * Dependency audit gate (V4 §2: "zero high/critical").
 *
 * `pnpm audit` reports every advisory in the tree, including the ones that
 * only exist in the build toolchain. This gate fails on everything, except
 * the advisories listed in the allow-list below — each of which is a
 * build-time-only dependency with no upstream fix, and is documented in
 * CONSTRAINTS.md with an owner and a review date.
 *
 *   node scripts/check-audit.mjs
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * pnpm is resolved through its own entry point so the script works the same
 * on a developer machine (no global pnpm) and in CI (pnpm/action-setup).
 */
function pnpmInvocation() {
  const local = join(process.cwd(), 'node_modules', 'pnpm', 'bin', 'pnpm.mjs');
  if (existsSync(local)) {
    return { command: process.execPath, args: [local] };
  }
  return { command: 'pnpm', args: [] };
}

const ALLOW_LIST = [
  {
    package: 'braces',
    reason:
      'build-time only: metro-file-map (React Native bundler file matching). It never reaches the shipped app; no patched version exists.',
    reviewBy: '2026-12-01',
  },
  {
    package: 'node-forge',
    reason:
      'build-time only: @expo/cli code signing during the Android build. It never reaches the shipped app; no patched version exists.',
    reviewBy: '2026-12-01',
  },
];

let raw;
try {
  const pnpm = pnpmInvocation();
  raw = execFileSync(pnpm.command, [...pnpm.args, 'audit', '--json'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
} catch (error) {
  // pnpm exits non-zero when it finds advisories; the JSON is still on stdout.
  raw = error.stdout ?? '';
}

if (!raw.trim()) {
  console.error('check-audit: pnpm audit produced no output');
  process.exit(2);
}

let report;
try {
  report = JSON.parse(raw);
} catch {
  console.error('check-audit: could not parse the pnpm audit report');
  process.exit(2);
}

const advisories = report.advisories ?? {};
const allowed = new Set(ALLOW_LIST.map((entry) => entry.package));
const failures = [];
const accepted = [];

for (const advisory of Object.values(advisories)) {
  if (!['high', 'critical'].includes(advisory.severity)) continue;
  const entry = {
    package: advisory.module_name,
    severity: advisory.severity,
    vulnerable: advisory.vulnerable_versions,
    patched: advisory.patched_versions,
    paths: advisory.findings?.[0]?.paths ?? [],
  };

  if (allowed.has(advisory.module_name)) {
    accepted.push(entry);
    continue;
  }
  failures.push(entry);
}

for (const entry of accepted) {
  const reason = ALLOW_LIST.find((item) => item.package === entry.package);
  console.log(`  accepted: ${entry.package} (${entry.severity}) — ${reason.reason} (review by ${reason.reviewBy})`);
}

if (failures.length > 0) {
  console.error(`check-audit: ${failures.length} high/critical advisory(ies) to fix:`);
  for (const failure of failures) {
    console.error(`  ${failure.severity} ${failure.package} (vulnerable ${failure.vulnerable}, patched ${failure.patched || 'none'})`);
    console.error(`      ${failure.paths[0] ?? ''}`);
  }
  process.exit(1);
}

console.log('check-audit: no unaccepted high or critical advisory');
process.exit(0);
