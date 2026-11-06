// BUG-232 (audit 2026-11-05 item 4d, research row 62): no string-built SQL
// anywhere in the API. Every query is parameterised - SQLAlchemy
// `text(...)` + `execute(statement, params)`, or DBAPI `?` placeholders with a
// params tuple - so "no concatenated SQL" is a property of the code, not a
// review habit.
//
//   node scripts/ci/check-sql-parameterisation.mjs [dir]   (default: services/api/app)
//
// What it flags:
//   1. an f-string that contains a SQL verb and an interpolation hole
//      (f"SELECT ... {x}") anywhere in the scanned tree;
//   2. a SQL string built by concatenation with a non-literal, by .format()
//      or by % formatting - in a text(...) call, in an .execute(...) first
//      argument, or in an assignment of a statement variable;
//   3. a SQL statement that HAS placeholders (`?` or `:name`) executed
//      without a parameters argument at the execute call.
//
// What it allows: plain string literals (with or without placeholders) passed
// through text() or execute(); static SQL with no placeholders executed
// without params; statement variables assigned a plain literal.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const DIR = resolve(ROOT, process.argv[2] ?? 'services/api/app');

const SQL_VERB = /\b(select|insert|update|delete|create|alter|drop|replace)\b/i;
const PLACEHOLDER = /\?|:[a-zA-Z_]\w*/;

/** The arguments of the call whose '(' is at `openParen`, split at top-level commas. */
function callArgs(src, openParen) {
  const args = [];
  let depth = 0;
  let start = openParen + 1;
  let inStr = null;
  for (let i = openParen; i < src.length; i += 1) {
    const ch = src[i];
    if (inStr) {
      if (ch === '\\') { i += 1; continue; }
      if (src.startsWith(inStr, i - inStr.length + 1)) { i += inStr.length - 1; inStr = null; }
      continue;
    }
    if (ch === '"' || ch === "'") {
      if (src.startsWith(ch.repeat(3), i)) { inStr = ch.repeat(3); i += 2; continue; }
      inStr = ch;
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{') depth += 1;
    else if (ch === ')' || ch === ']' || ch === '}') {
      depth -= 1;
      if (depth === 0) { args.push(src.slice(start, i)); return args; }
    } else if (ch === ',' && depth === 1) {
      args.push(src.slice(start, i));
      start = i + 1;
    }
  }
  return args;
}

/** Split `src` at top-level occurrences of the single-char separator, ignoring strings. */
function splitTopLevel(src, sep) {
  const parts = [];
  let depth = 0;
  let start = 0;
  let inStr = null;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inStr) {
      if (ch === '\\') { i += 1; continue; }
      if (src.startsWith(inStr, i - inStr.length + 1)) { i += inStr.length - 1; inStr = null; }
      continue;
    }
    if (ch === '"' || ch === "'") {
      if (src.startsWith(ch.repeat(3), i)) { inStr = ch.repeat(3); i += 2; continue; }
      inStr = ch;
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{') depth += 1;
    else if (ch === ')' || ch === ']' || ch === '}') depth -= 1;
    else if (ch === sep && depth === 0) { parts.push(src.slice(start, i)); start = i + 1; }
  }
  parts.push(src.slice(start));
  return parts;
}

/** Match `t` as exactly one string literal (with optional prefix letters). */
function matchSingleLiteral(t) {
  const m = t.match(/^([rubf]*)('''[\s\S]*?'''|"""[\s\S]*?"""|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\s*$/i);
  if (!m) return null;
  const raw = m[2];
  const content = raw.startsWith('"""') || raw.startsWith("'''")
    ? raw.slice(3, -3)
    : raw.slice(1, -1);
  return { prefix: m[1].toLowerCase(), content };
}

/** Parse the string literal starting at `i` (a quote char, prefix letters may
 *  precede it - the caller passes the index of the first quote). Multi-line
 *  triple-quoted literals are handled. Returns { prefix, content, end }. */
function literalAt(src, i) {
  let prefix = '';
  let j = i;
  while (j > 0 && /[rubf]/i.test(src[j - 1])) { prefix = src[j - 1] + prefix; j -= 1; }
  const q = src[i];
  const triple = src.startsWith(q.repeat(3), i);
  const quote = triple ? q.repeat(3) : q;
  const end = src.indexOf(quote, i + quote.length);
  if (end === -1) return null;
  const raw = src.slice(i, end + quote.length);
  const content = triple ? raw.slice(3, -3) : raw.slice(1, -1);
  return { prefix: prefix.toLowerCase(), content, end: end + quote.length };
}

/** Classify a SQL expression (one call argument or an assignment RHS).
 *  Returns { sql?, name?, bad? }. */
function classifySql(expr) {
  const t = expr.trim();
  if (t.startsWith('text(')) return classifySql(callArgs(t, t.indexOf('('))[0] ?? '');
  const parts = splitTopLevel(t, '+');
  if (parts.length > 1) {
    let sql = '';
    for (const part of parts) {
      const lit = matchSingleLiteral(part.trim());
      if (!lit) return { sql, bad: `SQL concatenated with a non-literal (${part.trim().slice(0, 50)})` };
      if (lit.prefix.includes('f')) return { sql, bad: 'SQL concatenated with an f-string literal' };
      sql += lit.content;
    }
    return { sql };
  }
  if (/\.format\s*\(/.test(t)) return { bad: 'SQL built with .format(...)' };
  if (/%\s*\(/.test(t)) return { bad: 'SQL built with % formatting' };
  const lit = matchSingleLiteral(t);
  if (lit) {
    if (lit.prefix.includes('f')) {
      return SQL_VERB.test(lit.content) ? { bad: 'SQL in an f-string (interpolated)', sql: lit.content } : {};
    }
    return { sql: lit.content };
  }
  if (/^[A-Za-z_]\w*$/.test(t)) return { name: t };
  return { bad: `unrecognised SQL expression: ${t.slice(0, 50)}` };
}

/** The end index of the logical line starting at `i` (a newline at
 *  bracket depth 0 outside any string), so multi-line call arguments and
 *  concatenations are read whole. */
function logicalLineEnd(src, i) {
  let depth = 0;
  let inStr = null;
  for (let j = i; j < src.length; j += 1) {
    const ch = src[j];
    if (inStr) {
      if (ch === '\\') { j += 1; continue; }
      if (src.startsWith(inStr, j - inStr.length + 1)) { j += inStr.length - 1; inStr = null; }
      continue;
    }
    if (ch === '"' || ch === "'") {
      if (src.startsWith(ch.repeat(3), j)) { inStr = ch.repeat(3); j += 2; continue; }
      inStr = ch;
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{') depth += 1;
    else if (ch === ')' || ch === ']' || ch === '}') depth -= 1;
    else if (ch === '\n' && depth === 0) return j;
  }
  return src.length;
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (entry.endsWith('.py')) yield full;
  }
}

const problems = [];
const files = [...walk(DIR)];
let statements = 0;

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const rel = relative(ROOT, file);

  // Rule 1: any f-string containing a SQL verb and an interpolation hole.
  const litRe = /([rubf]*)(?:"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/gi;
  let lm;
  while ((lm = litRe.exec(src)) !== null) {
    const prefix = lm[1].toLowerCase();
    const content = lm[0].slice(lm[1].length);
    const inner = content.startsWith('"""') || content.startsWith("'''") ? content.slice(3, -3) : content.slice(1, -1);
    if (prefix.includes('f') && SQL_VERB.test(inner) && inner.includes('{')) {
      problems.push(`${rel}: f-string SQL at offset ${lm.index}: ${inner.slice(0, 60).replace(/\n/g, ' ')}...`);
    }
  }

  // The assignment map: statement variable name -> classification. Only an
  // assignment whose RHS IS a SQL literal or a text(...) of one counts - a
  // line like `rows = conn.execute("SELECT ...")` or `x = text.replace(...)`
  // is not a statement assignment.
  const assignments = new Map();
  const assignRe = /(?:^|\n)[ \t]*([A-Za-z_]\w*)[ \t]*=[ \t]*(text\s*\(|["'])/g;
  let am;
  while ((am = assignRe.exec(src)) !== null) {
    const [, name, rhs] = am;
    let cls;
    if (rhs.startsWith('text')) {
      const open = src.indexOf('(', am.index + am[0].length - 1);
      cls = classifySql(callArgs(src, open)[0] ?? '');
    } else {
      const rhsStart = am.index + am[0].length - 1;
      cls = classifySql(src.slice(rhsStart, logicalLineEnd(src, rhsStart)));
    }
    if (cls.sql && SQL_VERB.test(cls.sql)) {
      assignments.set(name, cls);
      if (cls.bad) problems.push(`${rel}: statement "${name}" is ${cls.bad}`);
    }
  }

  // Rules 2+3: text(...) calls and .execute(...) calls. Only arguments that
  // actually carry SQL (a literal with a verb, or a known statement variable)
  // are inspected - prose in a docstring that happens to contain "text(" is
  // not a call.
  const callRe = /\b(text|execute)\s*\(/g;
  let cm;
  while ((cm = callRe.exec(src)) !== null) {
    const kind = cm[1];
    const open = cm.index + cm[0].length - 1;
    const args = callArgs(src, open);
    if (args.length === 0) continue;
    let cls = classifySql(args[0]);
    if (cls.name && assignments.has(cls.name)) cls = assignments.get(cls.name);
    const looksLikeSql = (cls.sql && SQL_VERB.test(cls.sql)) || (!cls.sql && SQL_VERB.test(args[0]));
    if (cls.bad && looksLikeSql) {
      problems.push(`${rel}: ${kind}(...) at offset ${cm.index}: ${cls.bad}`);
      continue;
    }
    if (!cls.sql || !SQL_VERB.test(cls.sql)) continue;
    statements += 1;
    if (kind === 'execute' && PLACEHOLDER.test(cls.sql) && args.length < 2) {
      problems.push(
        `${rel}: execute(...) at offset ${cm.index} runs SQL with placeholders but no parameters ` +
          'argument - parameterise it (BUG-232)',
      );
    }
  }
}

if (problems.length > 0) {
  console.error(`check-sql-parameterisation: ${problems.length} string-built/unparameterised SQL finding(s):`);
  for (const p of problems) console.error(`- ${p}`);
  process.exit(1);
}

console.log(
  `check-sql-parameterisation: ${statements} SQL statements in ${files.length} files of ${relative(ROOT, DIR)}, ` +
    'all literal text()/execute() calls with parameters where placeholders exist - no string-built SQL (BUG-232)',
);
