// The register gate (audit item B1, docs/plan/AUDIT_2026-10-25.md): the two status
// registers have to be able to tell the truth, and a human cannot keep 300 rows
// honest by eye.
//
//   node scripts/ci/check-parity.mjs [parity.md] [bugs.md]
//
// Why it exists: on 2026-10-25 PARITY.md carried 0 rows marked `Have`, 41 marked
// `Better` and 290 marked `Planned`, while the screens, the POD storage, the sync
// engine and the routing solver were all merged - so "what is left" could not be
// measured from the register MASTER_EXECUTION §6 measures done-ness with. BUGS.md
// carried the pre-monorepo feature backlog (BUG-002 to BUG-033) beside the real
// defects, with statuses like `todo` and free prose. A register nobody can count
// is a register nobody can trust, so the counts are a gate now: they are printed
// on every run and they are copied into docs/status/PROGRESS.md with each merge.
//
// The rules this gate enforces (the file's own status key, docs/status/PARITY.md):
//   1. a PARITY row's status is one of the four words of the key - `Have`,
//      `Better`, `Planned (task)`, `Skip (reason)`. A new word (`Parity`,
//      `WIP`, `Shipped`, a bare `Planned`) is a finding: the register silently
//      grew a vocabulary nobody counts.
//   2. a PARITY row marked `Have` carries the evidence in the row: a merged PR
//      number or a CI run link. A `Have` with no link is the exact failure the
//      audit found (0 `Have`, 41 `Better`), so it fails here rather than in the
//      next audit.
//   3. a BUGS row's status is one of the tracker's words (`open`, `doing`,
//      `testing`, `fixed`, `closed`, `moved to PARITY`). Prose in the status
//      column is a row nobody closed.
// It also fails a table that holds register rows but whose header carries no
// `Status` column: a row that stops being counted is a register nobody can
// measure. A table with no register rows (BUGS.md's hypothesis table, its
// archived-branch table) is a narrative table and is skipped.
//
// The parser is deliberately small (this repo's markdown is flat, hand-written
// and aligned): a table is a run of `|`-leading lines, its first line is the
// header, the second is the separator, the rest are rows. A cell splitter that
// respects inline code spans is not optional here - BUG-064's fix column holds
// `if: github.event_name != 'push' || github.ref == 'refs/heads/main'`, and a
// naive split reads that as extra columns and loses the status.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** The four words of PARITY.md's own status key. */
export const PARITY_STATUSES = ['Have', 'Better', 'Planned (task)', 'Skip (reason)'];

/** The words the bug tracker's status column may hold (docs/status/BUGS.md). */
export const BUGS_STATUSES = ['open', 'doing', 'testing', 'fixed', 'closed', 'moved to PARITY'];

/**
 * A merged PR citation (`PR #31`) or a CI run link, in a row's text.
 *
 * The PR number must be attached to the word PR: a bare `#31` is as likely to be
 * a hex colour (`#121212`, the night-theme background a PARITY row records), an
 * issue number or a design token as it is a merged PR, and a gate that reads
 * those as evidence would wave through the very rows it exists to catch. The
 * founder's rule for this gate: a hex colour like #121212 is not a PR number.
 */
const EVIDENCE = /\bPR\s*#\d+\b|actions\/runs\/\d+|\bruns\/\d+|\brun \d{6,}\b/i;

/**
 * Splits one markdown table row into its cells.
 *
 * A pipe inside an inline code span does not split the row, and neither does an
 * escaped `\|`. The leading and trailing empty cells (the row's outer pipes) are
 * dropped, so the result indexes straight against the header.
 *
 * @param {string} line the row's text, with or without a trailing newline
 * @returns {string[]} the trimmed cells
 */
export function splitRow(line) {
  const cells = [];
  let cell = '';
  let inCode = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '`') {
      inCode = !inCode;
      cell += character;
      continue;
    }
    if (character === '\\' && line[index + 1] === '|') {
      cell += '|';
      index += 1;
      continue;
    }
    if (character === '|' && !inCode) {
      cells.push(cell.trim());
      cell = '';
      continue;
    }
    cell += character;
  }
  cells.push(cell.trim());
  return cells.slice(1, -1);
}

/**
 * The markdown tables of a file, in order, each with the line its header sits on.
 *
 * A table is a maximal run of lines whose first non-space character is `|`. The
 * header is the first of those lines, the separator the second, and everything
 * after it is a row. The line numbers are 1-based and are what the findings
 * quote.
 *
 * @param {string} content the file's text
 * @returns {Array<{ line: number, header: string[], rows: Array<{ line: number, cells: string[] }> }>}
 */
export function tablesOf(content) {
  const lines = content.split(/\r?\n/);
  const tables = [];
  let current = null;
  for (let index = 0; index < lines.length; index += 1) {
    if (/^\s*\|/.test(lines[index])) {
      if (current === null) current = { start: index + 1, lines: [] };
      current.lines.push(lines[index]);
      continue;
    }
    if (current !== null) {
      tables.push({ start: current.start, lines: current.lines });
      current = null;
    }
  }
  if (current !== null) tables.push({ start: current.start, lines: current.lines });
  return tables.map(({ start, lines: tableLines }) => {
    const header = splitRow(tableLines[0] ?? '');
    const body = tableLines.slice(2);
    return {
      line: start,
      header,
      rows: body.map((text, offset) => ({ line: start + 2 + offset, cells: splitRow(text) })),
    };
  });
}

/** The index of a column by its exact header name, or -1. */
function columnOf(header, name) {
  return header.indexOf(name);
}

/** The index of the evidence column: `Evidence` or any header starting with it. */
function evidenceColumnOf(header) {
  return header.findIndex((name) => /^Evidence/.test(name));
}

/**
 * Checks one PARITY.md file.
 *
 * @param {string} content the file's text
 * @param {string} [name] the file name, for the findings
 * @returns {{ findings: Array<{ file: string, line: number, problem: string }>, counts: Record<string, number>, rows: number }}
 */
export function checkParity(content, name = 'docs/status/PARITY.md') {
  return checkRegister(content, name, PARITY_STATUSES, 'the four words of the status key', /^\d+$/, 'Have');
}

/**
 * Checks one register table of a file.
 *
 * A table whose header carries no `Status` column is only a finding when its rows
 * are register rows: a table of hypotheses (BUGS.md records the BUG-061 bisect
 * that way) or of archived branches is a narrative table and is skipped, while a
 * register table whose header lost its column would otherwise stop being counted
 * in silence - which is how a row stops being counted.
 *
 * @param {string} content
 * @param {string} name
 * @param {string[]} statuses the allowed words
 * @param {string} vocabulary how the findings name the allowed words
 * @param {RegExp} rowPattern the first cell of a register row
 * @param {string} evidenced the status that must carry its evidence
 * @returns {{ findings: Array<{ file: string, line: number, problem: string }>, counts: Record<string, number>, rows: number }}
 */
export function checkRegister(content, name, statuses, vocabulary, rowPattern, evidenced) {
  const findings = [];
  const counts = {};
  for (const status of statuses) counts[status] = 0;
  let rows = 0;

  for (const table of tablesOf(content)) {
    const statusColumn = columnOf(table.header, 'Status');
    const evidenceColumn = evidenceColumnOf(table.header);
    if (statusColumn === -1) {
      const registerRows = table.rows.filter((row) => rowPattern.test(row.cells[0] ?? ''));
      if (registerRows.length === 0) continue; // a narrative table: nothing here to count
      findings.push({
        file: name,
        line: table.line,
        problem: `this table holds ${registerRows.length} register row(s) but its header has no \`Status\` column, so those rows are not counted: give the table a \`Status\` column, or move the rows into the register's own table`,
      });
      continue;
    }
    for (const row of table.rows) {
      if (!rowPattern.test(row.cells[0] ?? '')) continue; // not a register row
      rows += 1;
      const status = row.cells[statusColumn] ?? '';
      if (!statuses.includes(status)) {
        findings.push({
          file: name,
          line: row.line,
          problem: `the status \`${status || '(empty)'}\` is not one of ${vocabulary} (${statuses.join(', ')})`,
        });
        continue;
      }
      counts[status] += 1;
      if (evidenced === null || status !== evidenced) continue; // the tracker's rows carry no evidence column
      const evidence = evidenceColumn === -1 ? '' : row.cells[evidenceColumn] ?? '';
      const rowText = row.cells.join(' | ');
      if (!EVIDENCE.test(rowText) || (evidenceColumn !== -1 && evidence === '')) {
        findings.push({
          file: name,
          line: row.line,
          problem: 'marked `Have` with no merged PR number or CI run link in the row: a `Have` nobody can check is the failure audit item B1 found',
        });
      }
    }
  }
  return { findings, counts, rows };
}

/** The one and only key a register row has: its own number. */
const BUG_NUMBER = /^BUG-\d+$/;

/**
 * Checks that no bug number is filed twice.
 *
 * The register's key is the number. Two rows that share one are one row nobody
 * can count: the gate's counts, the founder's numbering rule ("the highest row
 * across `origin/main` and every open PR branch, plus one") and every citation
 * that says "BUG-113" all read the pair as one thing - and the pair can hold
 * two different findings, one closed and one still open, which is exactly how
 * the mutmut lane's row came back to life on 2026-11-01 beside the sign-in
 * screen's closed row. A duplicate is a finding here, with both lines named.
 *
 * @param {string} content the file's text
 * @param {string} [name] the file name, for the findings
 * @returns {Array<{ file: string, line: number, problem: string }>}
 */
export function checkBugNumbers(content, name = 'docs/status/BUGS.md') {
  const findings = [];
  const seen = new Map();
  for (const table of tablesOf(content)) {
    for (const row of table.rows) {
      const number = (row.cells[0] ?? '').trim();
      if (!BUG_NUMBER.test(number)) continue;
      const first = seen.get(number);
      if (first === undefined) {
        seen.set(number, row.line);
        continue;
      }
      findings.push({
        file: name,
        line: row.line,
        problem: `the number \`${number}\` is filed twice (line ${first} and line ${row.line}): two rows that share a number are one row nobody can count - renumber the newer one, or fold the older one into it`,
      });
    }
  }
  return findings;
}

/**
 * Checks one BUGS.md file.
 *
 * @param {string} content the file's text
 * @param {string} [name] the file name, for the findings
 * @returns {{ findings: Array<{ file: string, line: number, problem: string }>, counts: Record<string, number>, rows: number }}
 */
export function checkBugs(content, name = 'docs/status/BUGS.md') {
  const register = checkRegister(content, name, BUGS_STATUSES, "the tracker's words", BUG_NUMBER, null);
  return { ...register, findings: [...register.findings, ...checkBugNumbers(content, name)] };
}

/** The default PARITY.md: the repo's own, resolved from this module. */
export function defaultParityFile() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'status', 'PARITY.md');
}

/** The default BUGS.md: the repo's own, resolved from this module. */
export function defaultBugsFile() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'status', 'BUGS.md');
}

/** Reads one register file, or fails with one clean line. */
function readRegister(file, what) {
  if (!existsSync(file)) throw new Error(`No ${what} at ${file}`);
  return readFileSync(file, 'utf8');
}

/**
 * Checks both registers of a tree (the repository's own by default).
 *
 * @param {string} [parityFile]
 * @param {string} [bugsFile]
 * @returns {{ findings: Array<{ file: string, line: number, problem: string }>, parity: object, bugs: object, files: string[] }}
 */
export function checkTree(parityFile = defaultParityFile(), bugsFile = defaultBugsFile()) {
  const parity = checkParity(readRegister(parityFile, 'parity register'), parityFile);
  const bugs = checkBugs(readRegister(bugsFile, 'bug register'), bugsFile);
  return {
    findings: [...parity.findings, ...bugs.findings],
    parity,
    bugs,
    files: [parityFile, bugsFile],
  };
}

/** The one-line count a merge copies into docs/status/PROGRESS.md. */
export function countLine(result) {
  const parity = PARITY_STATUSES.map((status) => `${status} ${result.parity.counts[status]}`).join(' · ');
  const bugs = BUGS_STATUSES.map((status) => `${status} ${result.bugs.counts[status]}`).join(' · ');
  return `${result.parity.rows} parity rows (${parity}); ${result.bugs.rows} bug rows (${bugs})`;
}

function main(argv) {
  const parityFile = argv[0] ? path.resolve(argv[0]) : defaultParityFile();
  const bugsFile = argv[1] ? path.resolve(argv[1]) : defaultBugsFile();
  let result;
  try {
    result = checkTree(parityFile, bugsFile);
  } catch (error) {
    console.error(`The register gate could not read the registers: ${error.message}`);
    process.exit(2);
  }
  console.log(countLine(result));
  if (result.findings.length > 0) {
    console.error('The registers do not tell the truth (audit item B1):');
    for (const finding of result.findings) {
      console.error(`  ${finding.file}:${finding.line}  ${finding.problem}`);
    }
    console.error(`${result.findings.length} finding(s). The count above is what the merge copies into docs/status/PROGRESS.md.`);
    process.exit(1);
  }
}

const invokedDirectly = process.argv[1] != null && import.meta.url.endsWith(path.basename(process.argv[1]));
if (invokedDirectly) {
  main(process.argv.slice(2));
}
