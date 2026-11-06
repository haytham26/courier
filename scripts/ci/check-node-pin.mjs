// The Node pin gate (the 2026-11-05 audit's item 3i, finding C11).
//
// The workflows declared `node-version: 22` in thirteen places and
// package.json's `engines.node` said `>=22.0.0`, so the runner's Node and the
// engine floor could drift apart one edit at a time - and an old major is a
// supply-chain and correctness question (the audit asked for Node 24, the
// current LTS). The repo's rule for the other pins (check-e2e-pins.mjs,
// check-setup-uv-pin.mjs) is the rule here: ONE version, declared once, and
// every workflow reads the same number.
//
// This gate holds it:
//   1. every `node-version:` in every workflow is the SAME value;
//   2. that value is the pinned major (NODE_MAJOR below) - a bump is one PR
//      that moves every line plus this constant;
//   3. package.json's `engines.node` floor is the same major;
//   4. at least one workflow declares it (the gate cannot go vacuous).
//
//   node scripts/ci/check-node-pin.mjs [workflow-directory]
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const BUG_ID = 'BUG-221';
// Node 24 is the LTS line the audit asked for (item 3i / C11, 2026-11-05).
// Bumping it is one PR that moves this constant, every `node-version:` line
// and package.json's engines floor together.
export const NODE_MAJOR = 24;

const workflows = process.argv[2] ?? path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', '.github', 'workflows',
);
const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'package.json');

const problems = [];
const versions = [];

for (const name of readdirSync(workflows).filter((n) => n.endsWith('.yml') || n.endsWith('.yaml'))) {
  const lines = readFileSync(path.join(workflows, name), 'utf8')
    .split('\n')
    .map((line) => line.replace(/\r$/, ''));
  lines.forEach((line, index) => {
    const match = /^\s*node-version:\s*['"]?(\d+)['"]?\s*$/.exec(line);
    if (match) versions.push({ file: name, line: index + 1, major: Number(match[1]) });
  });
}

if (versions.length === 0) {
  problems.push(`no node-version found in ${workflows}: the gate read nothing, and a gate that reads nothing proves nothing`);
}
const distinct = [...new Set(versions.map((v) => v.major))];
if (distinct.length > 1) {
  problems.push(
    `the workflows declare ${distinct.length} different Node majors: ${distinct.join(' vs ')} - ` +
      'one version, declared everywhere (the check-e2e-pins rule)',
  );
}
for (const v of versions) {
  if (v.major !== NODE_MAJOR) {
    problems.push(
      `${v.file}:${v.line}: node-version: ${v.major} - the pinned major is ${NODE_MAJOR}; a bump moves every line in one PR`,
    );
  }
}

const engines = JSON.parse(readFileSync(pkg, 'utf8')).engines?.node ?? '';
const floor = /^>=(\d+)\.0\.0$/.exec(engines)?.[1];
if (!floor) {
  problems.push(`package.json engines.node is ${JSON.stringify(engines)}, expected ">=${NODE_MAJOR}.0.0"`);
} else if (Number(floor) !== NODE_MAJOR) {
  problems.push(`package.json engines.node is >=${floor}.0.0 but the workflows pin Node ${NODE_MAJOR}: the floor and the runner must be the same line`);
}

if (problems.length > 0) {
  console.error(`${BUG_ID}: the Node pin gate fails (${problems.length}):`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(
  `${BUG_ID}: Node ${NODE_MAJOR} is declared by all ${versions.length} node-version line(s) and matches package.json's engines floor`,
);
