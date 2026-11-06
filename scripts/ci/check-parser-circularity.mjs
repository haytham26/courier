// BUG-210: the eval set's intent number is a CEILING, not an accuracy.
//
// The audit (2026-11-05) found the offline brain's regexes spell out the eval
// generator's templates word for word, so scoring intent on the gold TEXT
// measures the parser's coverage of its own template set, not held-out
// accuracy. That cannot be fixed by editing the parser - the parser is the
// product - so it is made STRUCTURAL:
//
//   1. this check names every overlap (a parser pattern's plain words equal a
//      template's leading literal words), and the checked-in baseline records
//      the standing ones. A NEW overlap fails the build: a parser learned from
//      the templates must not be extended in silence;
//   2. the eval harness reports the number as the "parser ceiling on its own
//      templates" (app/eval_audio.py), and the headline held-out number stays
//      unmeasured until the held-out set exists (FOUNDER_TODO).
//
//   node scripts/ci/check-parser-circularity.mjs
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const BRAIN = 'services/courier-voice/app/offline_brain.py';
const BUILDER = 'scripts/eval/build-voice-eval.mjs';
const BASELINE = 'packages/eval/voice/manifest/circularity-baseline.json';

/** The runs of plain words in a regex (metacharacters are separators). */
function wordRuns(source) {
  return (source.toLowerCase().match(/[a-z][a-z']*(?:\s+[a-z][a-z']*)*/g) ?? []).map(
    (run) => run.split(/\s+/),
  );
}

function templateLead(template) {
  const head = template.split('${')[0];
  return (head.toLowerCase().match(/[a-z][a-z']*/g) ?? []);
}

function overlapsOf(brain, builder) {
  const patterns = [...brain.matchAll(/pattern=re\.compile\(\s*r?"([^"]+)"/g)].map((m) => m[1]);
  const templates = [...builder.matchAll(/`([^`]*)\$\{[^`]*`/g)].map((m) => m[1]);
  const found = [];
  for (const pattern of patterns) {
    const runs = wordRuns(pattern);
    const longest = runs.reduce((best, run) => (run.length > best.length ? run : best), []);
    if (longest.length < 3) continue;
    const template = templates.find((item) => {
      const lead = templateLead(item);
      return longest.every((word, index) => lead[index] === word);
    });
    if (template) {
      found.push({ words: longest.join(' '), pattern, template: template.slice(0, 90) });
    }
  }
  return found.sort((a, b) => a.words.localeCompare(b.words));
}

const problems = [];
const brain = readFileSync(BRAIN, 'utf8');
const builder = readFileSync(BUILDER, 'utf8');
const found = overlapsOf(brain, builder);

let baseline;
try {
  baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
} catch {
  problems.push(`the baseline is missing: ${BASELINE}`);
}

if (baseline && Array.isArray(baseline.overlaps)) {
  const known = new Set(baseline.overlaps.map((item) => item.words));
  for (const item of found) {
    if (!known.has(item.words)) {
      problems.push(
        `a NEW overlap: the parser spell out "${item.words}" word for word (pattern ${item.pattern.slice(0, 60)}). ` +
          'A parser learned from the templates is not extended in silence: either it is a real command shape ' +
          '(then record it in the baseline with a note) or the eval set is being fitted to the parser. ' +
          'Until a held-out set exists the intent number is a ceiling, not an accuracy.',
      );
    }
  }
  for (const item of baseline.overlaps) {
    if (!found.some((found_item) => found_item.words === item.words)) {
      problems.push(`the baseline is stale: "${item.words}" is no longer an overlap`);
    }
  }
}

if (problems.length > 0) {
  console.error(`the parser-eval circularity check is broken (${problems.length}):`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(
  `check-parser-circularity: ${found.length} standing overlaps, all in the baseline - ` +
    'the intent number is a ceiling on its own templates until the held-out set exists',
);
