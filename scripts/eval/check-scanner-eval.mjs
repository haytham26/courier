#!/usr/bin/env node
// Checks the scanner evaluation set: the counts, the ground truth, the fields
// and the licence of every row.
//
//   node scripts/eval/check-scanner-eval.mjs
//
// The set is the measurement of the scanner (V4 section 10.2): at least 300
// labels, every label with a ground truth, every field in the catalogue and
// every row with a licence that is in the ledger. The check fails on a missing
// licence, on a missing ground truth and on a count under the floor.
//
// It also cross-checks the synthetic images against the manifest when they
// have been drawn: the ground truth that the generator wrote next to the
// images has to be the ground truth in the manifest, or the set has drifted.

import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const MANIFEST = 'packages/eval/scanner/manifest';
const TRUTH_FILE = 'data/labels/synthetic/ground_truth.jsonl';

// V4 section 10.2: at least 300 real-style NZ courier label images. The floor
// counts the labels we can measure on today.
const FLOOR_TOTAL = 300;

// V4 section 10.2: at most 1.5 s per label.
const MAX_READ_BUDGET_S = 1.5;

const SOURCES = new Set(['synthetic', 'redacted_photo', 'real_photo']);
const STATUSES = new Set(['ready', 'awaiting_founder']);
const BLOCKS = new Set(['recipient', 'sender', 'marketing', 'barcode', 'other']);
const DIFFICULTIES = new Set(['easy', 'medium', 'hard', 'unknown']);

const problems = [];

function fail(message) {
  problems.push(message);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ',') {
      row.push(cell);
      cell = '';
      continue;
    }
    if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    if (char === '\r') {
      continue;
    }
    cell += char;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

for (const file of ['labels.jsonl', 'slices.json', 'fields.json', 'licence.csv']) {
  if (!existsSync(join(MANIFEST, file))) {
    console.error(`the manifest is missing: ${join(MANIFEST, file)}`);
    process.exit(1);
  }
}

const labels = readFileSync(join(MANIFEST, 'labels.jsonl'), 'utf8')
  .split('\n')
  .filter((line) => line.trim())
  .map((line) => JSON.parse(line));
const slices = JSON.parse(readFileSync(join(MANIFEST, 'slices.json'), 'utf8'));
const catalogue = JSON.parse(readFileSync(join(MANIFEST, 'fields.json'), 'utf8'));

const ledgerRows = parseCsv(readFileSync(join(MANIFEST, 'licence.csv'), 'utf8')).filter((row) =>
  row.some((cell) => cell.trim()),
);
const ledgerHeader = ledgerRows[0] ?? [];
const expectedHeader = [
  'licence_id',
  'source',
  'artefact_or_corpus',
  'licence',
  'date_read',
  'evidence_url',
  'sha256',
  'obligations',
  'decision',
];
if (ledgerHeader.join(',') !== expectedHeader.join(',')) {
  fail(`the licence ledger has the wrong header: ${ledgerHeader.join(',')}`);
}
const ledger = new Map();
for (const row of ledgerRows.slice(1)) {
  const entry = Object.fromEntries(expectedHeader.map((name, index) => [name, row[index] ?? '']));
  if (!entry.licence_id) {
    fail('a licence ledger row has no licence_id');
    continue;
  }
  if (ledger.has(entry.licence_id)) {
    fail(`the licence ledger has a duplicate row: ${entry.licence_id}`);
  }
  for (const name of expectedHeader) {
    if (!entry[name] || entry[name].trim() === '') {
      fail(`the licence row ${entry.licence_id} has an empty ${name}`);
    }
  }
  ledger.set(entry.licence_id, entry);
}
if (ledger.size === 0) {
  fail('the licence ledger is empty');
}

// ------------------------------------------------------------- the catalogue

const fieldIds = new Set(catalogue.fields.map((field) => field.id));
const carrierIds = new Set(catalogue.carriers.map((carrier) => carrier.id));
const layoutIds = new Set(catalogue.layouts.map((layout) => layout.id));
const symbologyIds = new Set(catalogue.symbologies.map((symbology) => symbology.id));
const conditionIds = new Set(catalogue.conditions.map((condition) => condition.id));
const typeIds = new Set(catalogue.label_types.map((type) => type.id));
const receiverTokens = new Set(catalogue.privacy.receiver_tokens);
const senderNames = new Set(catalogue.privacy.senders);
const foreignSenders = new Set(catalogue.privacy.foreign_senders);
const fragileExample = catalogue.fields.find((field) => field.id === 'fragile')?.example ?? 'FRAGILE';

// ------------------------------------------------------------- the slices

if (slices.floor_total !== FLOOR_TOTAL) {
  fail(`the floor in slices.json is ${slices.floor_total}, the contract says ${FLOOR_TOTAL}`);
}
if (!Array.isArray(slices.slices) || slices.slices.length === 0) {
  fail('slices.json has no slices');
}
const sliceIds = new Set((slices.slices ?? []).map((slice) => slice.id));
for (const slice of slices.slices ?? []) {
  if (typeof slice.min !== 'number' || slice.min <= 0) {
    fail(`the slice ${slice.id} has no minimum`);
  }
  if (typeof slice.target !== 'number' || slice.target < slice.min) {
    fail(`the slice ${slice.id} has a target under its minimum`);
  }
}
const minTotal = (slices.slices ?? []).reduce((total, slice) => total + (slice.min ?? 0), 0);
if (minTotal < FLOOR_TOTAL) {
  fail(`the slice minimums add up to ${minTotal}, under the floor of ${FLOOR_TOTAL}`);
}

// ---------------------------------------------------------------- the rows

const seen = new Set();
const syntheticCarriers = new Set();
const syntheticLayouts = new Set();
let syntheticCount = 0;
let founderCount = 0;

for (const label of labels) {
  const where = label.id ?? '(no id)';
  if (!label.id || !/^L\d{4}$/.test(label.id)) {
    fail(`${where}: the id is not in the L0000 form`);
  }
  if (seen.has(label.id)) {
    fail(`${where}: the id is a duplicate`);
  }
  seen.add(label.id);

  if (!sliceIds.has(label.slice)) {
    fail(`${where}: the slice ${label.slice} is not in slices.json`);
  }
  if (!carrierIds.has(label.carrier) && label.carrier !== 'founder_to_confirm') {
    fail(`${where}: the carrier ${label.carrier} is not in the catalogue`);
  }
  if (!typeIds.has(label.label_type) && label.label_type !== 'founder_to_confirm') {
    fail(`${where}: the label type ${label.label_type} is not in the catalogue`);
  }
  if (!layoutIds.has(label.layout) && label.layout !== 'founder_to_confirm') {
    fail(`${where}: the layout ${label.layout} is not in the catalogue`);
  }
  if (!conditionIds.has(label.condition)) {
    fail(`${where}: the condition ${label.condition} is not in the catalogue`);
  }
  if (!SOURCES.has(label.source)) {
    fail(`${where}: the source ${label.source} is not one of ${[...SOURCES].join(', ')}`);
  }
  if (!STATUSES.has(label.status)) {
    fail(`${where}: the status ${label.status} is not one of ${[...STATUSES].join(', ')}`);
  }
  if (!BLOCKS.has(label.expected_block)) {
    fail(`${where}: the expected block ${label.expected_block} is not one of ${[...BLOCKS].join(', ')}`);
  }
  if (!DIFFICULTIES.has(label.difficulty)) {
    fail(`${where}: the difficulty ${label.difficulty} is not one of ${[...DIFFICULTIES].join(', ')}`);
  }
  if (typeof label.read_time_budget_s !== 'number' || label.read_time_budget_s <= 0) {
    fail(`${where}: the reading time budget is missing`);
  } else if (label.read_time_budget_s > MAX_READ_BUDGET_S) {
    fail(`${where}: the reading time budget is ${label.read_time_budget_s} s, over the ${MAX_READ_BUDGET_S} s contract`);
  }
  if (!label.image_path || label.image_path.startsWith('docs/')) {
    fail(`${where}: the image path ${label.image_path} is not under data/ - the images are never committed`);
  }

  if (!ledger.has(label.licence_id)) {
    fail(`${where}: the licence ${label.licence_id} is not in the ledger`);
  }
  if (!Array.isArray(label.content_licence_ids) || label.content_licence_ids.length === 0) {
    fail(`${where}: the content licence is missing`);
  } else {
    for (const id of label.content_licence_ids) {
      if (!ledger.has(id)) {
        fail(`${where}: the content licence ${id} is not in the ledger`);
      }
    }
  }
  const licenceDecision = ledger.get(label.licence_id)?.decision;
  if (label.source === 'synthetic' && licenceDecision !== 'shippable') {
    fail(`${where}: a synthetic label needs a shippable licence, ${label.licence_id} is ${licenceDecision}`);
  }
  if (label.source !== 'synthetic' && licenceDecision !== 'pending-founder') {
    fail(`${where}: a real photo needs a pending-founder licence, ${label.licence_id} is ${licenceDecision}`);
  }

  if (label.source === 'synthetic') {
    syntheticCount += 1;
    syntheticCarriers.add(label.carrier);
    syntheticLayouts.add(label.layout);
    if (label.status !== 'ready') {
      fail(`${where}: a synthetic label has to be ready, it is ${label.status}`);
    }
    const truth = label.ground_truth;
    if (!truth || typeof truth !== 'object') {
      fail(`${where}: the ground truth is missing`);
      continue;
    }
    if (!truth.fields || typeof truth.fields !== 'object') {
      fail(`${where}: the ground truth has no fields`);
      continue;
    }
    if (!Array.isArray(label.fields) || label.fields.length === 0) {
      fail(`${where}: the label has no fields`);
    }
    for (const field of label.fields ?? []) {
      if (!fieldIds.has(field)) {
        fail(`${where}: the field ${field} is not in the catalogue`);
        continue;
      }
      if (!(field in truth.fields)) {
        fail(`${where}: the field ${field} is on the label but has no ground truth`);
        continue;
      }
      const value = truth.fields[field];
      if (typeof value === 'boolean') {
        continue;
      }
      if (typeof value !== 'string' || value.trim() === '') {
        fail(`${where}: the ground truth of ${field} is empty`);
      }
    }
    if (!('address' in truth.fields) || !('suburb' in truth.fields)) {
      fail(`${where}: the ground truth has no address or no suburb`);
    }
    if (!truth.address_parse) {
      fail(`${where}: the ground truth has no parsed address`);
    } else {
      for (const key of ['number', 'street', 'suburb', 'size_class']) {
        if (!truth.address_parse[key]) {
          fail(`${where}: the parsed address has no ${key}`);
        }
      }
    }
    if (!symbologyIds.has(truth.barcode_symbology)) {
      fail(`${where}: the symbology ${truth.barcode_symbology} is not in the catalogue`);
    }
    if (truth.annotated_by !== 'generator') {
      fail(`${where}: the ground truth was not annotated by the generator`);
    }
    if (truth.expected_block !== 'recipient') {
      fail(`${where}: the gold block is ${truth.expected_block}, it has to be the recipient block`);
    }

    // The privacy rule: no name of a real person, no real phone number and no
    // real email address anywhere in the ground truth.
    const receiver = truth.fields.receiver;
    if (typeof receiver === 'string' && !receiverTokens.has(receiver)) {
      fail(`${where}: the receiver ${receiver} is not one of the role tokens - the set holds no name of a real person`);
    }
    const sender = truth.fields.sender;
    if (typeof sender === 'string') {
      const [first] = sender.split('\n');
      if (!senderNames.has(first) && !foreignSenders.has(sender)) {
        fail(`${where}: the sender ${first} is not in the catalogue of the invented senders`);
      }
    }
    for (const [field, value] of Object.entries(truth.fields)) {
      if (typeof value !== 'string') {
        continue;
      }
      if (value.includes('@') && !value.endsWith(`@${catalogue.privacy.email_domain}`)) {
        fail(`${where}: the field ${field} holds an email address outside ${catalogue.privacy.email_domain}`);
      }
      if (/\b\d{3}[ -]\d{3}[ -]\d{4}\b/.test(value) && !value.includes(catalogue.privacy.phone)) {
        fail(`${where}: the field ${field} holds a phone number that is not the placeholder`);
      }
      if (field !== 'barcode' && field !== 'tracking' && /\d{8,}/.test(value)) {
        fail(`${where}: the field ${field} holds a long run of digits that could be a phone number`);
      }
    }
  } else {
    founderCount += 1;
    if (label.status !== 'awaiting_founder') {
      fail(`${where}: a real photo slot has to be awaiting_founder, it is ${label.status}`);
    }
    if (label.ground_truth !== null) {
      fail(`${where}: a real photo slot cannot have a ground truth - nobody has looked at a photo yet`);
    }
    if (!label.brief) {
      fail(`${where}: a real photo slot has no brief for the founder`);
    }
  }
}

// ---------------------------------------------------------------- the counts

if (labels.length === 0) {
  fail('the manifest is empty');
}
if (syntheticCount < FLOOR_TOTAL) {
  fail(`the set needs ${FLOOR_TOTAL} labels we can measure on, it has ${syntheticCount}`);
}
for (const slice of slices.slices ?? []) {
  const count = labels.filter((label) => label.slice === slice.id && label.source === 'synthetic').length;
  if (count < slice.min) {
    fail(`the slice ${slice.id} needs ${slice.min} labels, it has ${count}`);
  }
  const recorded = slices.slices.find((entry) => entry.id === slice.id);
  if (recorded && recorded.synthetic !== count) {
    fail(`the slice ${slice.id} says ${recorded.synthetic} synthetic labels, the manifest has ${count}`);
  }
}
if (slices.synthetic_total !== syntheticCount) {
  fail(`slices.json says ${slices.synthetic_total} synthetic labels, the manifest has ${syntheticCount}`);
}
if (slices.founder_slots !== founderCount) {
  fail(`slices.json says ${slices.founder_slots} founder slots, the manifest has ${founderCount}`);
}
if (slices.labels_total !== labels.length) {
  fail(`slices.json says ${slices.labels_total} labels, the manifest has ${labels.length}`);
}
if (syntheticCarriers.size < 8) {
  fail(`the set covers ${syntheticCarriers.size} carriers, the research asks for 8 to 10`);
}
if (syntheticLayouts.size < 6) {
  fail(`the set covers ${syntheticLayouts.size} layouts, the research asks for 8 to 10 carriers and layouts`);
}

// -------------------------------------------- the images against the manifest

let imageRows = 0;
if (existsSync(TRUTH_FILE)) {
  const truthRows = readFileSync(TRUTH_FILE, 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
  const byId = new Map(truthRows.map((row) => [row.id, row]));
  for (const label of labels.filter((entry) => entry.source === 'synthetic')) {
    const row = byId.get(label.id);
    if (!row) {
      fail(`${label.id}: the image has not been drawn - run node scripts/data/generate-synthetic-labels.mjs`);
      continue;
    }
    imageRows += 1;
    if (!existsSync(row.image)) {
      fail(`${label.id}: the image ${row.image} is missing`);
      continue;
    }
    const file = readFileSync(row.image);
    const hash = createHash('sha256').update(file).digest('hex');
    if (hash !== row.sha256) {
      fail(`${label.id}: the image does not match the sha256 in the ground truth`);
    }
    const truth = label.ground_truth.fields;
    for (const field of label.fields) {
      const expected = typeof truth[field] === 'boolean' ? (truth[field] ? fragileExample : null) : truth[field];
      const drawn = row.drawn[field];
      if (expected === null || expected === undefined) {
        if (drawn !== undefined) {
          fail(`${label.id}: the image draws ${field}, the ground truth has none`);
        }
        continue;
      }
      if (drawn === undefined) {
        fail(`${label.id}: the image does not draw ${field}`);
        continue;
      }
      if (drawn !== expected) {
        fail(`${label.id}: the image draws "${drawn}" for ${field}, the manifest says "${expected}"`);
      }
    }
  }
}

if (problems.length > 0) {
  console.error(`the scanner evaluation set is broken (${problems.length} problems):`);
  for (const problem of problems.slice(0, 25)) {
    console.error(`- ${problem}`);
  }
  process.exit(1);
}

console.log(
  `the scanner evaluation set is sound: ${syntheticCount} labels we can measure on, ${founderCount} slots for the founder, ${syntheticCarriers.size} carriers, ${syntheticLayouts.size} layouts, ${imageRows} images drawn`,
);
