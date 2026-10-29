#!/usr/bin/env node
/**
 * Mojibake guard — UTF-8 read as a legacy single-byte code page and saved again.
 *
 * On 2026-10-28 the founder found the damage on `origin/main`: three tracked text
 * files carried 168 corrupted sequences, because an editor read the UTF-8 bytes
 * as Windows-1252 (or an OEM code page) and wrote the result back as UTF-8. The
 * text still reads, so nothing caught it. This guard keeps it from coming back,
 * the way `check-control-chars.mjs` does for BEL/VT/FF.
 *
 * Two rules, both verified against the actual corruption found on main:
 *
 *  1. the curated sequences: the ones that only an OEM code page reverses
 *     (Windows-1252 cannot reverse them), each with the character it hides;
 *  2. the Windows-1252 reversal rule: a run of non-ASCII characters that, read
 *     back as Windows-1252 bytes, decodes to exactly one character from the
 *     typographic set below. That catches a sequence nobody has seen yet (a
 *     curly quote, a macron, a comparison sign) without a table entry.
 *
 * The typographic set is what keeps rule 2 honest: without it, legitimate
 * sequences such as U+00CA U+00A5 reverse to a single character and would be
 * flagged. Every member of the set was verified by reversing the corruption
 * that was on main.
 *
 * Nothing in this file spells a corrupted sequence literally: every one is
 * built from code points, so the gate never flags its own source. The scan
 * covers tracked text files only (`git ls-files`), so the git-ignored trees
 * are never read.
 *
 *   node scripts/ci/check-mojibake.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const whitelist = /\.(md|mdx|ts|tsx|js|mjs|cjs|json|yml|yaml|txt|sh|ps1|py)$/;
const names = new Set(['Makefile', 'Dockerfile']);

/** The characters a mojibake sequence hides, as code points. */
const ORIGINALS = new Map([
  [0x2014, 'an em dash'],
  [0x2013, 'an en dash'],
  [0x2026, 'an ellipsis'],
  [0x00a7, 'a section sign'],
  [0x2192, 'a rightwards arrow'],
  [0x2705, 'a check mark'],
  [0x00b7, 'a middle dot'],
  [0x201c, 'a left double quotation mark'],
  [0x201d, 'a right double quotation mark'],
  [0x2018, 'a left single quotation mark'],
  [0x2019, 'a right single quotation mark'],
  [0x00d7, 'a multiplication sign'],
  [0x2190, 'a leftwards arrow'],
  [0x21d2, 'a rightwards double arrow'],
  [0x2264, 'a less-than or equal sign'],
  [0x2265, 'a greater-than or equal sign'],
]);

/**
 * The sequences only an OEM code page reverses, built from code points:
 * U+00D4 U+00C7 U+00F6 was an em dash read as cp850, and U+252C U+00BA was a
 * section sign read as cp437. Windows-1252 cannot reverse either, so rule 2
 * misses them and they are named here.
 */
const OEM_SEQUENCES = new Map([
  [[0x00d4, 0x00c7, 0x00f6].map((code) => String.fromCharCode(code)).join(''), 0x2014],
  [[0x252c, 0x00ba].map((code) => String.fromCharCode(code)).join(''), 0x00a7],
]);

/**
 * Windows-1252's upper half. Node has no CP1252 encoder, and its `latin1`
 * encoding is not a substitute: it truncates U+20AC (EURO SIGN) to the byte
 * 0xAC, while CP1252 maps that character to 0x80 — so a naive encoder would
 * reverse nothing and the rule would be dead. This table is why it works.
 */
const CP1252_UPPER = new Map([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84],
  [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88],
  [0x2030, 0x89], [0x0160, 0x8a], [0x2039, 0x8b], [0x0152, 0x8c],
  [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92], [0x201c, 0x93],
  [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b],
  [0x0153, 0x9c], [0x017e, 0x9e], [0x0178, 0x9f],
]);

/** Encodes one character as its Windows-1252 byte, or -1 when it has none. */
function cp1252Byte(code) {
  if (code >= 0xa0 && code <= 0xff) return code;
  if (code < 0xa0) {
    const mapped = CP1252_UPPER.get(code);
    return mapped === undefined ? code : mapped;
  }
  return CP1252_UPPER.get(code) ?? -1;
}

/** Reads a string's Windows-1252 bytes back as UTF-8, or null when that fails. */
function cp1252ToUtf8(text) {
  const bytes = [];
  for (const character of text) {
    const byte = cp1252Byte(character.codePointAt(0));
    if (byte < 0) return null;
    bytes.push(byte);
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
  } catch {
    return null;
  }
}

const hex = (code) => `U+${code.toString(16).toUpperCase().padStart(4, '0')}`;

/**
 * The mojibake findings in one file's text, as `{ line, run, means, rule }`.
 *
 * The corrupted characters of one maximal non-ASCII run are walked one sequence
 * at a time (longest first), because a doubled U+00C2 U+00A7 is two section signs
 * and each hides its own character. A character that does not start a valid
 * reversal is legitimate text and is stepped over.
 *
 * Exported so the tests can drive the shapes without a git checkout.
 */
export function findMojibake(text) {
  const findings = [];
  const lines = text.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const [sequence, code] of OEM_SEQUENCES) {
      let at = line.indexOf(sequence);
      while (at !== -1) {
        findings.push({ line: index + 1, run: sequence, means: hex(code), rule: 'oem' });
        at = line.indexOf(sequence, at + 1);
      }
    }
    for (const run of line.match(/[^\x00-\x7f]+/g) ?? []) {
      const characters = [...run];
      let at = 0;
      while (at < characters.length) {
        let stepped = false;
        for (const length of [3, 2]) {
          if (at + length > characters.length) continue;
          const candidate = characters.slice(at, at + length).join('');
          const reversed = cp1252ToUtf8(candidate);
          if (reversed === null) continue;
          if ([...reversed].length !== 1) continue;
          const code = [...reversed][0].codePointAt(0);
          if (!ORIGINALS.has(code)) continue;
          findings.push({ line: index + 1, run: candidate, means: hex(code), rule: 'cp1252' });
          at += length;
          stepped = true;
          break;
        }
        if (!stepped) at += 1; // a character that starts no corruption: legitimate
      }
    }
  }
  return findings.sort((left, right) => left.line - right.line);
}

/** The gate over one file's text: a message list, empty when the file is clean. */
export function checkText(file, text) {
  return findMojibake(text).map((finding) => ({
    file,
    ...finding,
    problem: `"${finding.run}" is mojibake for ${ORIGINALS.get(Number(`0x${finding.means.slice(2)}`)) ?? finding.means}`,
  }));
}

function trackedTextFiles() {
  const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'buffer' });
  return tracked
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .sort()
    .filter((file) => whitelist.test(file) || names.has(file));
}

/**
 * The gate over the tracked text files of this checkout.
 *
 * Guarded the way `check-workflows.mjs` is: importing the module for its
 * functions must not scan the tree, or every test would pay for a full scan and
 * print its output.
 */
function main() {
  const files = trackedTextFiles();
  let hits = 0;
  for (const file of files) {
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue; // not readable in this checkout: not our finding
    }
    for (const finding of checkText(file, text)) {
      hits += 1;
      const shown = [...finding.run].map((character) => hex(character.codePointAt(0))).join(' ');
      console.error(`${file}:${finding.line}: [${shown}] ${finding.problem} (rule: ${finding.rule})`);
    }
  }

  if (hits > 0) {
    console.error(`check-mojibake: ${hits} mojibake sequence(s) in tracked text files`);
    process.exit(1);
  }
  console.log(`check-mojibake: clean over ${files.length} tracked text files`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
