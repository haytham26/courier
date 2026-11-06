// The Semgrep-exclusions gate (the 2026-11-05 audit's item 3d follow-up, BUG-226).
//
// An accepted Semgrep finding is recorded in three places, and this gate holds
// the links between them:
//
//   1. the machine-readable exclusion: a `--exclude-rule "<id>"` in the sast
//      job's scan command in `.github/workflows/quality-gates.yml`;
//   2. the written record: the rule id as a line in `.semgrepignore`, under a
//      numbered comment (`# N. ...`) that names the exception's W-id;
//   3. the exceptions table of `docs/plan/CONSTRAINTS.md`, which must carry a
//      row for every W-id the numbered comments cite.
//
// The floor's no-suppressions check (check-floor.mjs) only sees inline
// Semgrep suppression comments, so without this gate an `--exclude-rule` with
// no written reason would be a suppression by another name.
//
//   node scripts/ci/check-semgrep-exclusions.mjs [repo-root]
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const BUG_ID = 'BUG-226';

const root = process.argv[2] ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const problems = [];

const read = (rel) => {
  const p = path.join(root, rel);
  if (!existsSync(p)) return null;
  return readFileSync(p, 'utf8').split('\n').map((line) => line.replace(/\r$/, ''));
};

// --- 1. the scan command's exclude-rules ---
const workflow = read('.github/workflows/quality-gates.yml');
if (!workflow) {
  problems.push('.github/workflows/quality-gates.yml does not exist');
} else {
  const text = workflow.join('\n');
  const sast = (() => {
    const start = text.indexOf('\n  sast:');
    if (start === -1) return '';
    return text.slice(start);
  })();
  if (!sast.includes('Semgrep')) {
    problems.push('quality-gates.yml has no sast job running Semgrep');
  }
  const excluded = [...sast.matchAll(/--exclude-rule\s+"([^"]+)"/g)].map((m) => m[1]);
  if (excluded.length === 0) {
    problems.push('the Semgrep scan excludes no rule at all - every exclusion must be written down, none is');
  }
  // --- 2. .semgrepignore carries every excluded rule id, under numbered reasons ---
  const ignore = read('.semgrepignore');
  if (!ignore) {
    problems.push('.semgrepignore does not exist: there is no written record of the accepted findings');
  } else {
    const ruleLines = ignore.filter((l) => l.trim() !== '' && !l.trim().startsWith('#'));
    for (const id of excluded) {
      if (!ruleLines.some((l) => l.trim() === id)) {
        problems.push(`the scan excludes rule "${id}" but .semgrepignore has no line for it - an exclusion with no written reason`);
      }
    }
    const numbered = ignore.filter((l) => /^#\s*\d+\./.test(l));
    if (numbered.length === 0) {
      problems.push('.semgrepignore has no numbered reason entries (# N. ...) for its accepted findings');
    }
    // --- 3. every W-id cited by a numbered entry exists in CONSTRAINTS.md ---
    const constraints = read('docs/plan/CONSTRAINTS.md');
    if (!constraints) {
      problems.push('docs/plan/CONSTRAINTS.md does not exist: the exceptions table has nowhere to live');
    } else {
      const ctext = constraints.join('\n');
      if (!/\|\s*ID\s*\|\s*Rule\s*\|/.test(ctext)) {
        problems.push('CONSTRAINTS.md has no exceptions table (no "| ID | Rule | ..." header)');
      }
      const wRows = new Set([...ctext.matchAll(/^\|\s*(W\d+)\s*\|/gm)].map((m) => m[1]));
      const cited = new Set([...ignore.join('\n').matchAll(/W\d+/g)].map((m) => m[0]));
      for (const wid of cited) {
        if (!wRows.has(wid)) {
          problems.push(`.semgrepignore cites ${wid}, but CONSTRAINTS.md has no ${wid} row in its exceptions table`);
        }
      }
    }
  }
}

if (problems.length > 0) {
  console.error(`${BUG_ID}: the Semgrep-exclusions gate fails (${problems.length}):`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`${BUG_ID}: every --exclude-rule of the Semgrep scan is a line in .semgrepignore under a numbered reason, and every cited W-id has a row in CONSTRAINTS.md`);
