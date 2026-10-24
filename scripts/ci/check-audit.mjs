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
 * **An acceptance is never permanent.** An allow-list entry with no owner, no
 * review date, or a review date already in the past is a GATE FAILURE, not a
 * quiet pass: the owner is the one who re-attempts the upstream fix, and the
 * review date is when that attempt is due.
 *
 *   node scripts/ci/check-audit.mjs
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

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

/**
 * The accepted build-time advisories. Every entry names WHO owns re-attempting
 * the fix and BY WHEN; an entry missing either is a gate failure (see
 * evaluateAdvisories), so a review date cannot be pushed out by editing it
 * after it has passed.
 */
export const ALLOW_LIST = [
  {
    package: 'braces',
    reason:
      'build-time only: metro-file-map (React Native bundler file matching). It never reaches the shipped app; no patched version exists.',
    owner: 'Platform squad',
    reviewBy: '2026-12-01',
  },
  {
    package: 'node-forge',
    reason:
      'build-time only: @expo/cli code signing during the Android build. It never reaches the shipped app; no patched version exists.',
    owner: 'Platform squad',
    reviewBy: '2026-12-01',
  },
  {
    package: 'zod',
    reason:
      "build-time only: @expo/cli's OWN direct dependency (the expo build toolchain - prebuild, metro, the bundling the E2E APK build uses). It never reaches the shipped app; the patched line is a major version @expo/cli does not declare, so no patched version exists on the pinned expo line.",
    owner: 'Platform squad',
    reviewBy: '2026-12-01',
  },
];

/**
 * The pure verdict of the gate, so it can be tested without the registry.
 *
 * @param {Record<string, object>} advisories pnpm's `report.advisories`
 * @param {{ now?: Date, allowList?: typeof ALLOW_LIST }} [options]
 * @returns {{ accepted: object[], failures: object[], invalid: object[] }}
 */
export function evaluateAdvisories(advisories, { now = new Date(), allowList = ALLOW_LIST } = {}) {
  const accepted = [];
  const failures = [];
  const invalid = [];

  const byPackage = new Map(allowList.map((entry) => [entry.package, entry]));

  for (const advisory of Object.values(advisories ?? {})) {
    if (!['high', 'critical'].includes(advisory.severity)) continue;

    const entry = {
      package: advisory.module_name,
      severity: advisory.severity,
      vulnerable: advisory.vulnerable_versions,
      patched: advisory.patched_versions,
      paths: advisory.findings?.[0]?.paths ?? [],
    };

    const allow = byPackage.get(advisory.module_name);
    if (!allow) {
      failures.push(entry);
      continue;
    }

    // A malformed acceptance is a failure of the gate itself: refuse the
    // quiet permanent accept rather than reporting it as a clean pass.
    const problems = [];
    if (!allow.owner || !String(allow.owner).trim()) problems.push('the entry carries no owner');
    if (!allow.reviewBy || !String(allow.reviewBy).trim()) {
      problems.push('the entry carries no review date');
    } else if (new Date(allow.reviewBy).getTime() <= now.getTime()) {
      problems.push(`its review date ${allow.reviewBy} has passed`);
    }

    if (problems.length > 0) {
      invalid.push({ ...entry, problem: problems.join(', ') });
      continue;
    }

    accepted.push({ ...entry, owner: allow.owner, reviewBy: allow.reviewBy, reason: allow.reason });
  }

  return { accepted, failures, invalid };
}


/**
 * The CLI entry. Kept out of module scope so a test can import the evaluator
 * without running the registry query and calling process.exit under it.
 */
function main() {
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

  const { accepted, failures, invalid } = evaluateAdvisories(report.advisories);

  for (const entry of accepted) {
    console.log(
      `  accepted: ${entry.package} (${entry.severity}) — ${entry.reason} (owner: ${entry.owner}, review by ${entry.reviewBy})`,
    );
  }

  for (const entry of invalid) {
    console.error(
      `  MALFORMED ACCEPTANCE: ${entry.package} (${entry.severity}) — ${entry.problem}. An acceptance is never permanent.`,
    );
  }

  if (failures.length > 0) {
    console.error(`check-audit: ${failures.length} high/critical advisory(ies) to fix:`);
    for (const failure of failures) {
      console.error(
        `  ${failure.severity} ${failure.package} (vulnerable ${failure.vulnerable}, patched ${failure.patched || 'none'})`,
      );
      console.error(`      ${failure.paths[0] ?? ''}`);
    }
  }

  if (failures.length > 0 || invalid.length > 0) {
    process.exit(1);
  }

  console.log('check-audit: no unaccepted high or critical advisory');
  process.exit(0);
}

// Run only when invoked as a script, never on import.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
