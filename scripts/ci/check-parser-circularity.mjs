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
//
//   3. the synthetic held-out set (founder directive 2026-11-08, item 4a) is
//      split by STREET: packages/eval/voice/manifest/heldout_streets.json lists
//      the held-out streets. This check also proves the gold templates (the
//      builder) and the parser regexes (the brain's pattern=re.compile sources)
//      carry no held-out-street text as a literal - the templates/regexes were
//      not derived from held-out-street text. (A missing list is refused loudly
//      by scripts/eval/check-voice-eval.mjs; here the proof runs when the list
//      is present, so the temp trees of this check's own tests stay minimal.)
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BRAIN = 'services/courier-voice/app/offline_brain.py';
const BUILDER = 'scripts/eval/build-voice-eval.mjs';
const BASELINE = 'packages/eval/voice/manifest/circularity-baseline.json';
const HELDOUT_STREETS = 'packages/eval/voice/manifest/heldout_streets.json';

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

// The held-out street split (directive 2026-11-08, item 4a): the split is by
// street, so the proof that the gold templates and the parser regexes were not
// derived from held-out-street text is structural - no held-out street name
// appears as a literal in the builder (whose whole text is template surface)
// or in any of the brain's pattern=re.compile sources. Case-sensitive and
// whole-word: the LINZ road names are capitalised, the templates and the
// patterns are not. The brain's docstring examples are prose, not regexes.
let heldOutStreetCount = 0;
if (existsSync(HELDOUT_STREETS)) {
  const heldOutDocument = JSON.parse(readFileSync(HELDOUT_STREETS, 'utf8'));
  const heldOutList = Array.isArray(heldOutDocument.streets) ? heldOutDocument.streets : [];
  heldOutStreetCount = heldOutList.length;
  const brainPatterns = [...brain.matchAll(/pattern=re\.compile\(\s*r?"([^"]+)"/g)].map((m) => m[1]);
  for (const street of heldOutList) {
    const escaped = street.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const literal = new RegExp(`(?<![A-Za-z])${escaped}(?![A-Za-z])`);
    if (literal.test(builder)) {
      problems.push(
        `the eval generator spells out the held-out street "${street}" as a literal - ` +
          'the gold templates must not be derived from held-out-street text',
      );
    }
    for (const pattern of brainPatterns) {
      if (literal.test(pattern)) {
        problems.push(
          `the offline brain's regex spells out the held-out street "${street}" (pattern ${pattern.slice(0, 60)}) - ` +
            'the parser regexes must not be derived from held-out-street text',
        );
      }
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
if (heldOutStreetCount > 0) {
  console.log(
    `check-parser-circularity: ${heldOutStreetCount} held-out streets checked - ` +
      'no held-out-street text in the gold templates or the parser regexes',
  );
}
