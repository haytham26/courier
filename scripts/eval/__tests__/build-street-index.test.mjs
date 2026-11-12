import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildIndex, readLinzRoads } from '../build-street-index.mjs';
import { STREET_TYPES, streetKeyOf } from '../street-key.mjs';

const BUILDER = fileURLToPath(new URL('../build-street-index.mjs', import.meta.url));

// Five LINZ rows: one road spelled the long way, the same road the short way,
// the same road again under a second suburb, a road whose type the key table
// does not fold, and a road with nothing curious about it at all.
const FIXTURE = [
  { id: '1', number: '45', suffix: null, unit: null, road: 'Alford Forest Road', suburb: 'Allenton', town: 'Ashburton' },
  { id: '2', number: '76', suffix: 'A', unit: null, road: 'Alford Forest Rd', suburb: 'Allenton', town: 'Ashburton' },
  { id: '3', number: '12', suffix: null, unit: null, road: 'Alford Forest Road', suburb: 'Methven', town: 'Ashburton' },
  { id: '4', number: '7', suffix: null, unit: null, road: 'Eastwood Rise', suburb: 'Halswell', town: 'Christchurch' },
  { id: '5', number: '3', suffix: null, unit: null, road: 'Brockelbank Drive', suburb: 'Kaiapoi', town: 'Kaiapoi' },
];

function aLinzDir(name) {
  const root = mkdtempSync(join(tmpdir(), name));
  const dir = join(root, 'linz');
  mkdirSync(dir, { recursive: true });
  return { root, dir };
}

test('the index carries each road once, in the backend key, with every suburb it runs through', async (t) => {
  const { root, dir } = aLinzDir('street-index-');
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(dir, 'addresses-christchurch.jsonl'), FIXTURE.map((row) => JSON.stringify(row)).join('\n') + '\n');

  const { roads, rows, skipped } = await readLinzRoads(dir);
  assert.equal(roads.length, 3, 'three distinct roads from five rows');
  const alford = roads.find((road) => road.key === 'alford forest rd');
  assert.ok(alford, 'the road is keyed the way the backend spells it');
  assert.equal(alford.road, 'Alford Forest Road', 'the first spelling seen is the display name');
  assert.deepEqual(alford.suburbs, ['Allenton', 'Methven'], 'every suburb the road runs through, sorted');
  assert.equal(alford.addresses, 3, 'the address count the road carries');

  const index = buildIndex(roads, { rows, skipped }, [{ file: 'addresses-christchurch.jsonl', rows: 5, sha256: 'x' }]);
  assert.equal(index.version, 1);
  assert.equal(index.source.rows, 5);
  assert.equal(index.source.distinct_roads, 3);
  assert.equal(index.roads.length, 3);
  // The abbreviation map is the road_key table's long -> short pairs, so a
  // resolver that reads the index folds "Avenue" to "ave" the same way.
  assert.equal(index.abbreviations.avenue, 'ave');
  assert.equal(index.abbreviations.st, 'st', 'an already-short spelling maps to itself');
  // The licence obligation travels with the derived data (CC BY 4.0).
  assert.match(index.attribution, /LINZ Data Service/, 'the index names its source');
  assert.match(index.licence, /CC BY 4\.0/);
  assert.match(index.derived, /no address rows/);
  // No full address rows: the index is the road names, not the 656 044 addresses.
  assert.ok(!('number' in index.roads[0]), 'no house numbers in the committed index');
  assert.ok(!('id' in index.roads[0]), 'no LINZ address ids in the committed index');
  // Deterministic: two builds of the same rows are byte-identical.
  assert.equal(
    JSON.stringify(buildIndex(roads, { rows, skipped }, [])),
    JSON.stringify(buildIndex(roads, { rows, skipped }, [])),
  );
});

test('a road the key table does not fold keeps its own spelling as its key', async (t) => {
  const { root, dir } = aLinzDir('street-index-');
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(dir, 'addresses-selwyn.jsonl'), JSON.stringify(FIXTURE[3]) + '\n');

  const { roads } = await readLinzRoads(dir);
  assert.deepEqual(roads.map((road) => road.key), ['eastwood rise']);
  assert.equal(streetKeyOf('Eastwood Rise'), 'eastwood rise');
  assert.equal(Object.prototype.hasOwnProperty.call(STREET_TYPES, 'rise'), false, 'the table has no rise entry');
});

test('the builder writes the index the reader finds, with its source recorded', async (t) => {
  const { root, dir } = aLinzDir('street-index-');
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const file = join(dir, 'addresses-waimakariri.jsonl');
  writeFileSync(file, FIXTURE.map((row) => JSON.stringify(row)).join('\n') + '\n');
  const out = join(root, 'canterbury-streets.json');
  execFileSync(process.execPath, [BUILDER, '--linz-dir', dir, '--out', out]);
  const written = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(written.source.rows, 5);
  assert.equal(written.source.distinct_roads, 3);
  assert.equal(written.roads.length, 3);
  assert.equal(written.source.files[0].file, 'addresses-waimakariri.jsonl');
  assert.match(written.source.files[0].sha256, /^[0-9a-f]{64}$/, 'the source file sha travels with the index');
  assert.ok(written.source.roads_sha256.length === 64, 'the sorted key list is hashed so a rebuild is provable');
});
