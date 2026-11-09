// The gates that keep the held-out street split honest (founder directive
// 2026-11-08, item 4a): scripts/eval/check-voice-eval.mjs must REFUSE a main
// manifest containing a held-out street and REFUSE a held-out manifest
// containing a non-held-out street (failing loudly, naming the row), and
// scripts/ci/check-parser-circularity.mjs must prove the gold templates and the
// parser regexes were not derived from held-out-street text.
//
//   node --test "scripts/*/__tests__/*.test.mjs"
//
// Red first (PLAYBOOK §14): before the checker exported collectProblems and
// before the circularity check read the held-out list, this file failed — the
// recorded red run is in docs/evidence/voice-heldout/README.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectProblems, loadHeldOutStreets } from '../check-voice-eval.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const CIRCULARITY = join(REPO, 'scripts', 'ci', 'check-parser-circularity.mjs');
const HELDOUT_STREETS_FILE = join(
  REPO,
  'packages',
  'eval',
  'voice',
  'manifest',
  'heldout_streets.json',
);

const heldOutStreets = loadHeldOutStreets(HELDOUT_STREETS_FILE);
const aHeldOutStreet = [...heldOutStreets][0];
// a street that is on main, so NOT in the held-out list (the default build
// excludes held-out streets, so every street of the main manifest qualifies):
const mainAddresses = readFileSync(
  join(REPO, 'packages', 'eval', 'voice', 'manifest', 'addresses.jsonl'),
  'utf8',
)
  .trim()
  .split('\n')
  .map((line) => JSON.parse(line));
const aNormalStreet = mainAddresses[0].street;

function writeJsonl(file, rows) {
  writeFileSync(file, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');
}

/** A minimal manifest dir with the given address rows and one script each. */
function manifestDir(addresses) {
  const dir = mkdtempSync(join(tmpdir(), 'voice-eval-heldout-'));
  mkdirSync(dir, { recursive: true });
  writeJsonl(join(dir, 'addresses.jsonl'), addresses);
  const scripts = addresses.map((address, index) => ({
    id: `S${String(index + 1).padStart(4, '0')}`,
    slice: 'en_nz_quiet',
    text: `delivered at ${address.number} ${address.street}`,
    gold_intent: 'mark_delivered',
    gold_slots: { safe_place: null },
    tags: ['delivery'],
    address_id: address.id,
    speaker: 'spk-1',
    ...(address.held_out === true ? { held_out: true } : {}),
  }));
  writeJsonl(join(dir, 'scripts.jsonl'), scripts);
  writeJsonl(
    join(dir, 'utterances.jsonl'),
    scripts.map((script, index) => ({
      id: `U${String(index + 1).padStart(5, '0')}`,
      script_id: script.id,
      slice: script.slice,
      speaker: script.speaker,
      snr_db: null,
      bed: 'quiet',
      status: 'planned',
    })),
  );
  // the shift simulations the main-mode checks require:
  const shifts = [1, 2, 3].map((n) => ({
    id: `SIM-00${n}`,
    name: `fixture shift ${n}`,
    noise: { bed: 'quiet' },
    turns: [1, 2, 3, 4, 5].map((t) => ({ transcript: `turn ${t}`, expect_intent: 'noop' })),
  }));
  writeFileSync(
    join(dir, 'shift_sims.json'),
    `${JSON.stringify({ slices: [{ id: 'shift_sim', simulations: shifts }] }, null, 2)}\n`,
    'utf8',
  );
  return dir;
}

test('loadHeldOutStreets reads the committed split, and a street of the main manifest is not in it', () => {
  assert.ok(heldOutStreets instanceof Set);
  assert.ok(heldOutStreets.size > 1000, 'the real split holds ~20 % of ~6 800 streets');
  assert.ok(heldOutStreets.has(aHeldOutStreet));
  assert.ok(!heldOutStreets.has(aNormalStreet), 'the fixture street must be a non-held-out one');
});

test('a main manifest containing a held-out street is refused, naming the row', () => {
  const dir = manifestDir([
    {
      id: 'A001',
      number: '57',
      suffix: null,
      unit: null,
      street: aHeldOutStreet,
      suburb: 'Addington',
    },
    {
      id: 'A002',
      number: '19',
      suffix: null,
      unit: null,
      street: aNormalStreet,
      suburb: 'Addington',
    },
  ]);
  try {
    const { problems } = collectProblems({ manifestDir: dir, heldOutStreets, heldOutOnly: false });
    const named = problems.filter((problem) => problem.includes('A001'));
    assert.ok(
      named.length > 0,
      `the refusal must name the row A001, got: ${JSON.stringify(problems)}`,
    );
    assert.ok(
      named.some((problem) => problem.includes(aHeldOutStreet) && /held-out street/i.test(problem)),
      `the refusal must name the held-out street "${aHeldOutStreet}", got: ${JSON.stringify(named)}`,
    );
    const scriptNamed = problems.filter((problem) => problem.includes('S0001'));
    assert.ok(scriptNamed.length > 0, 'the script on the held-out address must be named too');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a held-out manifest containing a non-held-out street is refused, naming the row', () => {
  const dir = manifestDir([
    {
      id: 'A001',
      number: '19',
      suffix: null,
      unit: null,
      street: aNormalStreet,
      suburb: 'Addington',
      held_out: true,
    },
    {
      id: 'A002',
      number: '57',
      suffix: null,
      unit: null,
      street: aHeldOutStreet,
      suburb: 'Addington',
      held_out: true,
    },
  ]);
  try {
    const { problems } = collectProblems({ manifestDir: dir, heldOutStreets, heldOutOnly: true });
    const named = problems.filter((problem) => problem.includes('A001'));
    assert.ok(
      named.length > 0,
      `the refusal must name the row A001, got: ${JSON.stringify(problems)}`,
    );
    assert.ok(
      named.some(
        (problem) => problem.includes(aNormalStreet) && /not a held-out street/i.test(problem),
      ),
      `the refusal must name the non-held-out street "${aNormalStreet}", got: ${JSON.stringify(named)}`,
    );
    const scriptNamed = problems.filter((problem) => problem.includes('S0001'));
    assert.ok(scriptNamed.length > 0, 'the script on the non-held-out address must be named too');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a held-out manifest whose held-out rows are not tagged held_out is refused', () => {
  const dir = manifestDir([
    {
      id: 'A001',
      number: '57',
      suffix: null,
      unit: null,
      street: aHeldOutStreet,
      suburb: 'Addington',
    },
  ]);
  try {
    const { problems } = collectProblems({ manifestDir: dir, heldOutStreets, heldOutOnly: true });
    assert.ok(
      problems.some((problem) => problem.includes('A001') && /held_out/.test(problem)),
      `a held-out address must carry held_out: true, got: ${JSON.stringify(problems)}`,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('check-parser-circularity passes on the real tree and proves the gold templates and parser regexes carry no held-out-street text', () => {
  const answer = spawnSync(process.execPath, [CIRCULARITY], { cwd: REPO, encoding: 'utf8' });
  assert.equal(answer.status, 0, answer.stderr);
  assert.match(answer.stdout, /standing overlaps/);
  assert.match(answer.stdout, new RegExp(`${heldOutStreets.size} held-out streets`));
  assert.match(answer.stdout, /no held-out-street text/);
});

test('check-parser-circularity fails when the builder spells out a held-out street', () => {
  const dir = mkdtempSync(join(tmpdir(), 'circularity-heldout-'));
  try {
    mkdirSync(join(dir, 'services', 'courier-voice', 'app'), { recursive: true });
    mkdirSync(join(dir, 'scripts', 'eval'), { recursive: true });
    mkdirSync(join(dir, 'packages', 'eval', 'voice', 'manifest'), { recursive: true });
    writeFileSync(
      join(dir, 'services', 'courier-voice', 'app', 'offline_brain.py'),
      'COMMANDS: tuple = (\n    (\n        pattern=re.compile(r"^delivered\\\\s+at\\\\s+(?P<address>.+)$"),\n    ),\n)\n',
      'utf8',
    );
    writeFileSync(
      join(dir, 'scripts', 'eval', 'build-voice-eval.mjs'),
      'const templates = { x: [ (a) => [`delivered at Zulu Street ${place}`, "mark_delivered"] ] };\n',
      'utf8',
    );
    writeFileSync(
      join(dir, 'packages', 'eval', 'voice', 'manifest', 'circularity-baseline.json'),
      `${JSON.stringify({ overlaps: [] })}\n`,
      'utf8',
    );
    writeFileSync(
      join(dir, 'packages', 'eval', 'voice', 'manifest', 'heldout_streets.json'),
      `${JSON.stringify({ seed: 20261108, fraction: 0.2, total_streets: 1, held_out_count: 1, algorithm: 'fixture', sha256: '0'.repeat(64), generated: '2026-11-08', streets: ['Zulu Street'] }, null, 2)}\n`,
      'utf8',
    );
    const answer = spawnSync(process.execPath, [CIRCULARITY], { cwd: dir, encoding: 'utf8' });
    assert.equal(answer.status, 1, `the check must fail, got: ${answer.stdout}`);
    assert.match(answer.stderr, /held-out street/);
    assert.match(answer.stderr, /Zulu Street/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
