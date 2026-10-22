#!/usr/bin/env node
/**
 * The link checker of the documentation.
 *
 *   node scripts/ci/check-doc-links.mjs
 *
 * It reads every markdown file of the live documentation and checks that every
 * relative link (a link to a file or a folder in this repository) exists. An
 * absolute link (http, https, mailto) is left alone: it is checked by the
 * reference-URL scripts of the design studio.
 *
 * The history is not checked: `docs/archive/`, `docs/evidence/` and
 * `docs/log/` are the record of what was true on the day it was written, so
 * the paths in them are the paths of that day. They are listed here so that
 * the exclusion is a decision and not an accident.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const REPO_ROOT = process.cwd();

// The history: read-only, the paths in it are the paths of that day.
const HISTORY = ['docs/archive/', 'docs/evidence/', 'docs/log/'];

// The files the checker reads.
const ROOTS = ['docs', '.github', 'scripts', 'packages', 'services', 'apps', '.maestro'];

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', '.turbo', '.expo', '.git', '.venv', '__pycache__']);

const MARKDOWN = /\.mdx?$/;

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) walk(full, files);
    else if (MARKDOWN.test(entry)) files.push(full);
  }
  return files;
}

const LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const isRelative = (target) =>
  !/^[a-z][a-z0-9+.-]*:/i.test(target) && !target.startsWith('#') && !target.startsWith('/');

// A link inside a code span is not a link: the text shows what it looked like
// in the source it quotes, not a link of this repository.
const stripCode = (text) => text.replace(/(`+)(?:(?!\1)[\s\S])*?\1/g, '');

const problems = [];
const checked = [];
const history = [];

for (const root of ROOTS) {
  for (const file of walk(join(REPO_ROOT, root))) {
    const rel = relative(REPO_ROOT, file).replace(/\\/g, '/');
    const isHistory = HISTORY.some((prefix) => rel.startsWith(prefix));
    if (isHistory) {
      history.push(rel);
      continue;
    }
    const content = stripCode(readFileSync(file, 'utf8'));
    let match;
    LINK.lastIndex = 0;
    while ((match = LINK.exec(content)) !== null) {
      const target = match[1];
      if (!isRelative(target)) continue;
      const withoutAnchor = target.split('#')[0];
      if (withoutAnchor === '') continue;
      const path = resolve(dirname(file), withoutAnchor);
      checked.push(`${rel} -> ${target}`);
      if (!existsSync(path)) {
        problems.push(`  ${rel}: the link "${target}" does not exist (${relative(REPO_ROOT, path).replace(/\\/g, '/')})`);
      }
    }
  }
}

// The root documents (README, AGENTS, CLAUDE) are read too.
for (const file of ['README.md', 'AGENTS.md', 'CLAUDE.md']) {
  const full = join(REPO_ROOT, file);
  if (!existsSync(full)) continue;
  const content = stripCode(readFileSync(full, 'utf8'));
  let match;
  LINK.lastIndex = 0;
  while ((match = LINK.exec(content)) !== null) {
    const target = match[1];
    if (!isRelative(target)) continue;
    const withoutAnchor = target.split('#')[0];
    if (withoutAnchor === '') continue;
    const path = resolve(dirname(full), withoutAnchor);
    checked.push(`${file} -> ${target}`);
    if (!existsSync(path)) {
      problems.push(`  ${file}: the link "${target}" does not exist (${relative(REPO_ROOT, path).replace(/\\/g, '/')})`);
    }
  }
}

console.log(`check-doc-links: ${checked.length} relative link(s) checked over the live documentation`);
console.log(`check-doc-links: ${history.length} file(s) skipped as history (docs/archive, docs/evidence, docs/log)`);

if (problems.length > 0) {
  console.error(`check-doc-links: ${problems.length} broken link(s):`);
  for (const problem of problems) console.error(problem);
  process.exit(1);
}

console.log('check-doc-links: every relative link resolves');
process.exit(0);
