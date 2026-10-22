#!/usr/bin/env node
/**
 * Floor guard — the mechanical half of CONSTRAINTS.md.
 *
 * Scans the lines a branch ADDS (never the whole repository) for the
 * suppressions and shortcuts the floor forbids. Exit 0 = clean, 1 = violations.
 *
 *   node scripts/ci/check-floor.mjs [base-ref]
 *
 * The base ref defaults to origin/main; pass "HEAD~1" to check the last commit.
 */
import { execFileSync } from 'node:child_process';

const base = process.argv[2] ?? 'origin/main';

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

let diff;
try {
  diff = git(['diff', '-U0', `${base}...HEAD`]);
} catch {
  console.error(`check-floor: cannot diff against ${base}`);
  process.exit(2);
}

const ADDED = /^\+\+\+/;
const DOCS = /\.(md|mdx)$/;
// The guard checks itself: the file carries the patterns it looks for. Both
// names are exempt, because a diff that pairs the old path with the new one
// (a move shows as a delete and an add) reports the file under either.
const SELF = /^scripts\/(ci\/)?check-floor\.mjs$/;
const RULES = [
  {
    id: 'no-skipped-tests',
    pattern: /\.(skip|only|todo)\s*\(/,
    appliesTo: (file) => /\.(test|spec)\.[jt]sx?$|\.test\.py$/.test(file),
    message: 'a committed test must not be skipped, focused or todo',
  },
  {
    id: 'no-suppressions',
    pattern: /@ts-ignore|@ts-expect-error|eslint-disable|istanbul ignore|\bnoqa\b|#\s*type:\s*ignore|Stryker disable|nosemgrep/,
    appliesTo: (file) => !DOCS.test(file),
    message: 'no new suppression comment without an issue link',
    allowIfLineHasIssueLink: true,
  },
  {
    id: 'no-any',
    pattern: /:\s*any\b|as\s+any\b|<any>|any\[\]/,
    appliesTo: (file) => /\.[jt]sx?$/.test(file) && !/\.d\.ts$/.test(file),
    message: 'no `any` in TypeScript application code',
  },
  {
    id: 'no-todo-without-issue',
    pattern: /\bTODO\b|\bFIXME\b/,
    appliesTo: (file) => !DOCS.test(file),
    message: 'a TODO must carry an issue link',
    allowIfLineHasIssueLink: true,
  },
  {
    id: 'no-empty-catch',
    pattern: /catch\s*(\([^)]*\))?\s*\{\s*\}/,
    appliesTo: (file) => !DOCS.test(file),
    message: 'an empty catch block silently swallows failures',
  },
  {
    id: 'no-not-implemented',
    pattern: /Not\s+implemented|not\s+implemented\s+yet|TODO:\s*implement/,
    appliesTo: (file) => !DOCS.test(file),
    message: 'an unimplemented stub must not be committed as if it were finished',
  },
];

const ISSUE_LINK = /(https?:\/\/\S+\/(issues|pull)\/\d+|#\d+|GH-\d+|T\d+\b|\bW\d+\b)/i;

const violations = [];
let currentFile = '';

for (const line of diff.split('\n')) {
  if (ADDED.test(line)) {
    currentFile = line.slice(4).split('\t')[0].trim().replace(/^[ab]\//, '');
    continue;
  }
  if (!line.startsWith('+') || line.startsWith('+++')) continue;

  const content = line.slice(1);
  for (const rule of RULES) {
    if (SELF.test(currentFile)) continue;
    if (!rule.appliesTo(currentFile)) continue;
    if (!rule.pattern.test(content)) continue;
    if (rule.allowIfLineHasIssueLink && ISSUE_LINK.test(content)) continue;
    violations.push({ rule: rule.id, file: currentFile, message: rule.message, content: content.trim() });
  }
}

if (violations.length > 0) {
  console.error(`check-floor: ${violations.length} floor violation(s) against ${base}:`);
  for (const violation of violations) {
    console.error(`  [${violation.rule}] ${violation.file}: ${violation.message}`);
    console.error(`      ${violation.content}`);
  }
  process.exit(1);
}

console.log(`check-floor: clean (base ${base})`);
process.exit(0);
