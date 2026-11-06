// The test for BUG-232's SQL-parameterisation gate (audit 2026-11-05 item 4d,
// research row 62).
//
//   node --test scripts/ci/__tests__/check-sql-parameterisation.test.mjs
//
// Each case is a tiny Python fixture in a temp dir: the damage the gate exists
// for (f-string SQL, concatenated SQL, .format SQL, placeholders executed
// without params) and the near misses that must pass (text() + params, DBAPI ?
// with a params tuple, static SQL with no placeholders, statement variables).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CHECK = path.join(ROOT, 'scripts', 'ci', 'check-sql-parameterisation.mjs');

function runFixture(name, source) {
  const dir = mkdtempSync(path.join(tmpdir(), `sql-param-${name}-`));
  mkdirSync(path.join(dir, 'app'), { recursive: true });
  writeFileSync(path.join(dir, 'app', 'repo.py'), source, 'utf8');
  const result = spawnSync(process.execPath, [CHECK, dir], { cwd: ROOT, encoding: 'utf8' });
  rmSync(dir, { recursive: true, force: true });
  return { code: result.status, out: result.stdout + result.stderr };
}

test('the real API tree passes (BUG-232)', () => {
  const result = spawnSync(process.execPath, [CHECK], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /no string-built SQL/);
});

test('f-string SQL is refused', () => {
  const { code, out } = runFixture('fstring', [
    'def f(conn, uid):',
    '    conn.execute(f"SELECT * FROM runs WHERE id = {uid}")',
    '',
  ].join('\n'));
  assert.notEqual(code, 0);
  assert.match(out, /f-string SQL/);
});

test('SQL concatenated with a variable is refused', () => {
  const { code, out } = runFixture('concat', [
    'def f(conn, courier_id):',
    '    q = "SELECT * FROM runs WHERE courier_id = " + courier_id',
    '    conn.execute(q)',
    '',
  ].join('\n'));
  assert.notEqual(code, 0);
  assert.match(out, /concatenated with a non-literal/);
});

test('.format SQL is refused', () => {
  const { code, out } = runFixture('format', [
    'def f(conn, courier_id):',
    '    conn.execute("SELECT * FROM runs WHERE courier_id = {}".format(courier_id))',
    '',
  ].join('\n'));
  assert.notEqual(code, 0);
  assert.match(out, /\.format/);
});

test('placeholders executed without a params argument are refused', () => {
  const { code, out } = runFixture('noparams', [
    'from sqlalchemy import text',
    'STMT = text("SELECT * FROM runs WHERE courier_id = :courier_id")',
    'def f(conn):',
    '    conn.execute(STMT)',
    '',
  ].join('\n'));
  assert.notEqual(code, 0);
  assert.match(out, /no parameters argument/);
});

test('text() with a params dict passes', () => {
  const { code } = runFixture('good-text', [
    'from sqlalchemy import text',
    'STMT = text("""',
    '    SELECT id FROM runs WHERE courier_id = :courier_id',
    '""")',
    'def f(conn, courier_id):',
    '    conn.execute(STMT, {"courier_id": courier_id})',
    '',
  ].join('\n'));
  assert.equal(code, 0);
});

test('DBAPI qmark placeholders with a params tuple pass', () => {
  const { code } = runFixture('good-qmark', [
    'def f(conn, road):',
    '    conn.execute("SELECT * FROM addresses WHERE road_key = ?", (road,))',
    '',
  ].join('\n'));
  assert.equal(code, 0);
});

test('static SQL with no placeholders and no params passes', () => {
  const { code } = runFixture('good-static', [
    'def f(conn):',
    '    conn.execute("SELECT DISTINCT suburb FROM addresses ORDER BY suburb")',
    '',
  ].join('\n'));
  assert.equal(code, 0);
});

test('a docstring that mentions SQL is not flagged', () => {
  const { code } = runFixture('docstring', [
    'def f(conn):',
    '    """The INSERT and SELECT are both parameterised (see repo.py)."""',
    '    conn.execute("SELECT 1")',
    '',
  ].join('\n'));
  assert.equal(code, 0);
});
