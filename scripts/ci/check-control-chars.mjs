#!/usr/bin/env node
/**
 * Control-character guard — BEL (0x07), VT (0x0B) and FF (0x0C) do not exist in
 * this repository's text. On 2026-10-23 the audit found 31 word-initial letters
 * corrupted into these bytes across 22 files (the weekly log, the constraints
 * table and the design2 headers) — an escaping pass turned `a` into BEL and `f`
 * into FF. This guard keeps the corruption from coming back.
 *
 * Scans only TRACKED text files (`git ls-files`), so the git-ignored trees
 * (node_modules, the vendor .venv, research-private) are never read.
 *
 *   node scripts/ci/check-control-chars.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const whitelist = /\.(md|mdx|ts|tsx|js|mjs|cjs|json|yml|yaml|txt|sh|ps1|py)$/;
const names = new Set(['Makefile', 'Dockerfile']);

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'buffer' });
const files = tracked.toString('utf8').split('\0').filter(Boolean).sort();

let hits = 0;
for (const file of files) {
  if (!whitelist.test(file) && !names.has(file)) continue;
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue; // not readable in this checkout: not our finding
  }
  for (const [name, code] of [['BEL', 7], ['VT', 11], ['FF', 12]]) {
    if (text.includes(String.fromCharCode(code))) {
      hits += 1;
      console.error(`${file}: contains ${name} (U+000${code.toString(16).slice(-1)})`);
    }
  }
}

if (hits > 0) {
  console.error(`check-control-chars: ${hits} file(s) with control characters`);
  process.exit(1);
}
console.log(`check-control-chars: clean over ${files.length} tracked text files`);
