// The every-action pin gate (the 2026-11-05 audit's item 3i, finding C10).
//
// A `uses: owner/action@v4` ref is a MOVING ref: the tag can be re-pointed
// (maliciously or by accident) and every workflow using it runs new code with
// no commit in this repository. The tree already pins every action by full
// commit sha - 116 refs - but nothing asserted it, so the next action added
// with a tag would have been green. This gate holds the rule:
//
//   1. every `uses:` ref in every workflow is `owner/repo@<40-hex commit sha>`;
//   2. a `./local/action` ref is allowed (it is reviewed with the code that
//      uses it), but a `docker://` image must carry a digest (`@sha256:…`);
//   3. a tag or branch ref (`@v4`, `@main`) FAILS - that is the finding;
//   4. at least one ref exists (the gate cannot go vacuous over an empty tree).
//
//   node scripts/ci/check-action-pins.mjs [workflow-directory]
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const BUG_ID = 'BUG-222';

const directory = process.argv[2] ?? path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', '.github', 'workflows',
);

const SHA = /^[0-9a-f]{40}$/;
const DIGEST = /^sha256:[0-9a-f]{64}$/;
const problems = [];
let count = 0;

for (const name of readdirSync(directory).filter((n) => n.endsWith('.yml') || n.endsWith('.yaml'))) {
  const lines = readFileSync(path.join(directory, name), 'utf8')
    .split('\n')
    .map((line) => line.replace(/\r$/, ''));
  lines.forEach((line, index) => {
    // Both step spellings: `- uses: action@sha` and `- name: …` / `uses: action@sha`.
    const match = /^\s*(?:-\s*)?uses:\s*(\S+?)\s*(?:#.*)?$/.exec(line);
    if (!match) return;
    const ref = match[1];
    count += 1;
    if (ref.startsWith('./')) return; // a local action, reviewed with the code
    if (ref.startsWith('docker://')) {
      if (!DIGEST.test(ref.split('@').slice(1).join('@'))) {
        problems.push(`${name}:${index + 1}: the docker image ${ref} carries no @sha256: digest`);
      }
      return;
    }
    const at = ref.lastIndexOf('@');
    const tail = at === -1 ? '' : ref.slice(at + 1);
    if (at === -1 || !SHA.test(tail)) {
      problems.push(
        `${name}:${index + 1}: "${ref}" is not pinned to a full 40-hex commit sha - a tag or branch ref can be ` +
          're-pointed and run new code with no commit in this repository',
      );
    }
  });
}

if (count === 0) {
  problems.push(`no uses: reference found in ${directory}: the gate read nothing, and a gate that reads nothing proves nothing`);
}

if (problems.length > 0) {
  console.error(`${BUG_ID}: the action pin gate fails over ${directory} (${problems.length}):`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`${BUG_ID}: all ${count} uses: ref(s) in ${path.basename(directory)} are pinned to a commit sha (or a digested image / local action)`);
