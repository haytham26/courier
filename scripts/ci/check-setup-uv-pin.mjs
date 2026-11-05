// The setup-uv pin gate (the 2026-11-05 audit's item 3i, finding C12).
//
// `astral-sh/setup-uv` was referenced by TWO different commit SHAs in the same
// tree - `d4b2f3b…` (v5) in ci.yml, codeql.yml and quality-gates.yml, and
// `68559e9…` (v10.3.3) in linz-changeset.yml and mutation.yml - so the same
// tool ran as two different versions depending on which workflow built you,
// and a "bump setup-uv" PR that touched one list silently left the other.
// The repo's own rule for the emulator pins (check-e2e-pins.mjs) is the rule
// here: the pins AGREE across the workflows, because a tool upgrade is one PR
// that moves all of them, not one file's worth.
//
// This gate holds it:
//   1. every `uses: astral-sh/setup-uv@…` ref in every workflow is a full
//      40-hex commit SHA (a tag or branch ref fails - the action's code can
//      move under a moving ref without a commit);
//   2. all of them are the SAME sha;
//   3. at least one exists (the gate cannot go vacuous over an empty tree).
//
//   node scripts/ci/check-setup-uv-pin.mjs [workflow-directory]
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const BUG_ID = 'BUG-220';

const directory = process.argv[2] ?? path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', '.github', 'workflows',
);

const SHA = /^[0-9a-f]{40}$/;
const problems = [];
const refs = [];

for (const name of readdirSync(directory).filter((n) => n.endsWith('.yml') || n.endsWith('.yaml'))) {
  const file = path.join(directory, name);
  const lines = readFileSync(file, 'utf8').split('\n').map((line) => line.replace(/\r$/, ''));
  lines.forEach((line, index) => {
    // Both step spellings: `- uses: action@sha` and the two-line
    // `- name: …` / `uses: action@sha` form the workflows actually use.
    const match = /^\s*(?:-\s*)?uses:\s*astral-sh\/setup-uv@(\S+)\s*(#.*)?$/.exec(line);
    if (!match) return;
    const ref = match[1];
    if (!SHA.test(ref)) {
      problems.push(`${name}:${index + 1}: setup-uv is referenced as "${ref}", not a full 40-hex commit sha`);
      return;
    }
    refs.push({ file: name, line: index + 1, sha: ref });
  });
}

if (refs.length === 0) {
  problems.push(`no astral-sh/setup-uv reference found in ${directory}: the gate read nothing, and a gate that reads nothing proves nothing`);
}

const distinct = [...new Set(refs.map((r) => r.sha))];
if (distinct.length > 1) {
  problems.push(
    `setup-uv is pinned to ${distinct.length} different SHAs: ${distinct.join(' vs ')} - ` +
      'one tool, one pin: a tool upgrade is one PR that moves every reference (the check-e2e-pins rule)',
  );
}

if (problems.length > 0) {
  console.error(`${BUG_ID}: the setup-uv pin gate fails over ${directory} (${problems.length}):`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(
  `${BUG_ID}: setup-uv is pinned to one commit sha across all ${refs.length} reference(s) ` +
    `(${distinct[0].slice(0, 12)}…) in ${path.basename(directory)}`,
);
