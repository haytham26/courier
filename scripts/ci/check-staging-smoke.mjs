// The dependabot + cron staging smoke gate (the 2026-11-05 audit's item 3i,
// finding C14).
//
// Two halves, both held here:
//
//  1. `.github/dependabot.yml` exists, is version 2, and configures the three
//     ecosystems this repo actually has - `github-actions` and `npm` (the
//     pnpm workspace; the npm ecosystem reads pnpm-lock.yaml) at `/`, and
//     `uv` for every directory that carries a uv.lock - each on a weekly
//     schedule. A dependabot config that watches nothing is a config that
//     proves nothing.
//
//  2. `.github/workflows/staging-smoke.yml` exists and runs the staging smoke
//     on a cron schedule AND on a human dispatch; it runs
//     `infra/smoke.sh --domain … --token … --no-version` (the cron run is not
//     a deploy, so the version check - audit item 3b - is skipped by design);
//     the staging secrets are read ONLY in a step's own `env:` (BUG-100 /
//     audit 3c: never job-level, never in a command line); and when the
//     secrets are not configured the run SKIPS WITH A NOTICE naming them,
//     rather than silently doing nothing.
//
//   node scripts/ci/check-staging-smoke.mjs [repo-root]
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const BUG_ID = 'BUG-223';

const root = process.argv[2] ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const problems = [];

// ---- half 1: .github/dependabot.yml ----
const dependabotPath = path.join(root, '.github', 'dependabot.yml');
if (!existsSync(dependabotPath)) {
  problems.push('.github/dependabot.yml does not exist: there is no dependabot, so no ecosystem is watched for updates');
} else {
  const text = readFileSync(dependabotPath, 'utf8');
  const lines = text.split('\n').map((line) => line.replace(/\r$/, ''));
  if (!/^version:\s*2\s*$/.test(lines[0] ?? '') && !lines.some((l) => /^version:\s*2\s*$/.test(l))) {
    problems.push('dependabot.yml is not `version: 2`');
  }
  const block = (ecosystem) => {
    const start = lines.findIndex((l) => l.includes(`package-ecosystem: ${ecosystem}`));
    if (start === -1) return '';
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i += 1) {
      if (/^\s{2}-\s+package-ecosystem:/.test(lines[i])) { end = i; break; }
    }
    return lines.slice(start, end).join('\n');
  };
  for (const ecosystem of ['github-actions', 'npm', 'uv']) {
    if (!lines.some((l) => l.includes(`package-ecosystem: ${ecosystem}`))) {
      problems.push(`dependabot.yml watches no "${ecosystem}" ecosystem`);
    }
  }
  for (const ecosystem of ['github-actions', 'npm']) {
    const b = block(ecosystem);
    if (b && !/directory:\s*\/\s*$/m.test(b)) {
      problems.push(`dependabot.yml's ${ecosystem} entry is not rooted at / (directory: /)`);
    }
  }
  // every uv entry must point at a directory that really carries a uv.lock
  const uvDirs = [...text.matchAll(/package-ecosystem:\s*uv[\s\S]*?directory:\s*(\S+)/g)].map((m) => m[1]);
  for (const dir of uvDirs) {
    if (!existsSync(path.join(root, dir, 'uv.lock'))) {
      problems.push(`dependabot.yml watches ${dir} for uv, but ${dir}/uv.lock does not exist`);
    }
  }
  const blocks = [...text.matchAll(/-\s+package-ecosystem:\s*\S+[\s\S]*?(?=\n\s*-\s+package-ecosystem:|\s*$)/g)].map((m) => m[0]);
  for (const b of blocks) {
    if (!/interval:\s*weekly/.test(b)) {
      problems.push(`a dependabot entry is not on a weekly schedule: ${b.split('\n')[0].trim()}`);
    }
  }
  if (blocks.length === 0) problems.push('dependabot.yml has no updates entries at all');
}

// ---- half 2: .github/workflows/staging-smoke.yml ----
const workflowPath = path.join(root, '.github', 'workflows', 'staging-smoke.yml');
if (!existsSync(workflowPath)) {
  problems.push('.github/workflows/staging-smoke.yml does not exist: there is no cron staging smoke');
} else {
  const text = readFileSync(workflowPath, 'utf8');
  const lines = text.split('\n').map((line) => line.replace(/\r$/, ''));

  // triggers: a schedule with a cron, and a workflow_dispatch
  if (!/^\s*schedule:\s*$/.test(lines.find((l) => /^\s*schedule:/.test(l)) ?? '') || !lines.some((l) => /^\s+-\s+cron:\s*"/.test(l))) {
    problems.push('staging-smoke.yml has no schedule: - cron: "…" trigger');
  }
  if (!/^\s*workflow_dispatch:\s*$/.test(lines.find((l) => /^\s*workflow_dispatch:/.test(l)) ?? '')) {
    problems.push('staging-smoke.yml has no workflow_dispatch trigger (a human must be able to run the smoke by hand)');
  }

  // the smoke run: infra/smoke.sh with --domain, --token and --no-version
  const smokeCall = lines.find((l) => l.includes('infra/smoke.sh'));
  if (!smokeCall) {
    problems.push('staging-smoke.yml never runs infra/smoke.sh');
  } else {
    for (const flag of ['--domain', '--token', '--no-version']) {
      if (!smokeCall.includes(flag) && !text.includes(flag)) {
        problems.push(`the smoke call is missing ${flag}`);
      }
    }
    if (!smokeCall.includes('--no-version') && !lines.some((l, i) => l.includes('smoke.sh') && lines.slice(i, i + 3).join('\n').includes('--no-version'))) {
      problems.push('the cron smoke does not pass --no-version (a cron run is not a deploy; the version check is the deploy leg\'s, audit item 3b)');
    }
  }

  // secrets: only in a STEP env, never at the job level, never in a run line.
  // A step's env entries sit at 8+ spaces of indent; a job's own env at 4-6.
  // Anything else carrying secrets.* (a run block, a uses line, an if) fails.
  const secretRefs = lines.filter((l) => /\$\{\{\s*secrets\./.test(l) && !l.trim().startsWith('#'));
  if (secretRefs.length === 0) {
    problems.push('staging-smoke.yml reads no secrets at all - it could never smoke a staging that needs a domain and a token');
  }
  lines.forEach((l, index) => {
    if (!/\$\{\{\s*secrets\./.test(l) || l.trim().startsWith('#')) return;
    if (/^\s{4,7}[A-Za-z0-9_-]+:\s*\$\{\{\s*secrets\./.test(l)) {
      problems.push(`line ${index + 1} (${l.trim().split(':')[0]}): a secrets.* reference at a JOB-level env - every step and every third-party action could read it; move it to the step that reads it (BUG-100)`);
    } else if (!/^\s{8,}[A-Za-z0-9_-]+:\s*\$\{\{\s*secrets\./.test(l)) {
      problems.push(`line ${index + 1}: a secrets.* reference outside a step env (${l.trim()}) - secrets are never spelled into a command line or a run block (audit 3c)`);
    }
  });

  // the skip: when the secrets are unset the run must say so, not vanish
  if (!text.includes('::notice::') || !text.includes('configured=false')) {
    problems.push('staging-smoke.yml has no skip-notice: without the staging secrets configured it must print a ::notice:: naming them and set configured=false, not silently do nothing');
  }

  // every uses: ref is a full 40-hex sha (the C10 rule holds for this file too)
  lines.forEach((line, index) => {
    const match = /^\s*(?:-\s*)?uses:\s*(\S+?)\s*(?:#.*)?$/.exec(line);
    if (!match) return;
    const ref = match[1];
    if (ref.startsWith('./')) return;
    if (ref.startsWith('docker://')) return;
    const tail = ref.slice(ref.lastIndexOf('@') + 1);
    if (!/^[0-9a-f]{40}$/.test(tail)) {
      problems.push(`staging-smoke.yml:${index + 1}: "${ref}" is not pinned to a full 40-hex commit sha (BUG-222)`);
    }
  });

  // minimal permissions
  if (!/^permissions:\s*$/m.test(text) || !/contents:\s*read/.test(text)) {
    problems.push('staging-smoke.yml does not declare `permissions: contents: read`');
  }
}

if (problems.length > 0) {
  console.error(`${BUG_ID}: the dependabot / cron staging smoke gate fails (${problems.length}):`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`${BUG_ID}: dependabot watches github-actions, npm and uv weekly, and staging-smoke.yml smokes staging on a cron (secrets step-level only, skip-notice when unset, --no-version by design)`);
