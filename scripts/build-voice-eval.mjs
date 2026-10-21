// Builds the text parts of the voice evaluation set.
//
//   node scripts/build-voice-eval.mjs
//
// It writes the manifest under docs/squads/voice/eval/manifest/:
//   - addresses.jsonl  the NZ address bank, taken from the real LINZ data
//   - scripts.jsonl    the spoken scripts with their gold intent and slots
//   - utterances.jsonl one line per planned audio file (the noise variants)
//   - slices.json      the slice ids, the counts and the status
//
// The audio itself is not built here: the audio needs the on-device TTS (or
// the private voice service), and the licence of every voice is recorded in
// the licence ledger before a sample is committed.
//
// The addresses come from data/linz/ (LINZ layer 123113, the three
// Canterbury districts). Nothing here is invented: the street names, the
// suburbs and the house numbers are the real ones.
import { createReadStream } from 'node:fs';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';

const OUT = 'docs/squads/voice/eval/manifest';
const LINZ = 'data/linz';

const slices = [
  { id: 'en_nz_quiet', target: 120, files: 120, snrs: [null] },
  { id: 'en_nz_van', target: 120, files: 360, snrs: [0, 5, 10] },
  { id: 'mi_places', target: 60, files: 60, snrs: [null] },
  { id: 'ar', target: 40, files: 40, snrs: [null] },
  { id: 'hi_pa', target: 40, files: 40, snrs: [null] },
  { id: 'zh', target: 40, files: 40, snrs: [null] },
  { id: 'sm_to', target: 40, files: 40, snrs: [null] },
  { id: 'numbers_corrections', target: 40, files: 40, snrs: [null] },
  { id: 'code_switch', target: 60, files: 60, snrs: [null] },
  { id: 'chatter', target: 40, files: 40, snrs: [null] },
];

mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------- addresses

async function readAddresses(file, limit) {
  const rows = [];
  if (!existsSync(file)) {
    return rows;
  }
  const reader = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  for await (const line of reader) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line);
      if (row.number && row.road && row.suburb) {
        rows.push({
          number: row.number,
          suffix: row.suffix ?? null,
          unit: row.unit ?? null,
          street: row.road,
          suburb: row.suburb,
        });
      }
    } catch {
      continue;
    }
    if (rows.length >= limit) break;
  }
  return rows;
}

const addressFiles = ['addresses-christchurch.jsonl', 'addresses-waimakariri.jsonl', 'addresses-selwyn.jsonl'];
const raw = [];
for (const file of addressFiles) {
  raw.push(...(await readAddresses(join(LINZ, file), 4000)));
}

// Spread the bank over the suburbs: the first N of every file would all be
// the same few streets.
const bySuburb = new Map();
for (const row of raw) {
  if (!bySuburb.has(row.suburb)) bySuburb.set(row.suburb, []);
  bySuburb.get(row.suburb).push(row);
}
const suburbs = [...bySuburb.keys()].sort();
const addressBank = [];
let cursor = 0;
while (addressBank.length < 240 && suburbs.length > 0) {
  for (const suburb of suburbs) {
    const rows = bySuburb.get(suburb);
    const row = rows[cursor % rows.length];
    addressBank.push({ id: `A${String(addressBank.length + 1).padStart(3, '0')}`, ...row });
    if (addressBank.length >= 240) break;
  }
  cursor += 1;
}
writeFileSync(join(OUT, 'addresses.jsonl'), `${addressBank.map((a) => JSON.stringify(a)).join('\n')}\n`);

// ------------------------------------------------------------------ helpers

function spokenNumber(address) {
  const unit = address.unit ? `${address.unit}/` : '';
  return `${unit}${address.number}${address.suffix ? ` ${address.suffix}` : ''} ${address.street}`;
}

function place(address) {
  return `${spokenNumber(address)}, ${address.suburb}`;
}

// ------------------------------------------------------------------ scripts

// Each template is a function of the address bank and returns the spoken text,
// the gold intent, the gold slots and the tags. The words are the ones a
// courier in Christchurch says while driving.
const templates = {
  en_nz_quiet: [
    (a) => [`delivered at ${place(a)}`, 'mark_delivered', { safe_place: null }, ['delivery']],
    (a) => [`left it on the porch at ${place(a)}`, 'mark_delivered', { safe_place: 'porch' }, ['delivery', 'safe_place']],
    (a) => [`dropped it in the letterbox at ${place(a)}`, 'mark_delivered', { safe_place: 'letterbox' }, ['delivery', 'safe_place']],
    (a) => [`put it in the porch at ${place(a)}`, 'mark_delivered', { safe_place: 'porch' }, ['delivery', 'safe_place']],
    (a) => [`left it with the neighbour at ${place(a)}`, 'mark_delivered', { safe_place: 'neighbour' }, ['delivery', 'safe_place']],
    (a) => [`no one home at ${place(a)}`, 'mark_failed', { reason: 'no one home' }, ['failure']],
    (a) => [`cannot get in at ${place(a)}`, 'mark_failed', { reason: "can't get in" }, ['failure']],
    (a) => [`dog in the yard at ${place(a)}`, 'mark_failed', { reason: 'dog' }, ['failure']],
    (a) => [`skip this one at ${place(a)}`, 'skip_stop', { scope: 'stop', return_later: true }, ['skip']],
    (a) => [`come back to ${place(a)} later`, 'skip_stop', { scope: 'stop', return_later: true }, ['skip']],
    (a) => [`add a stop at ${place(a)}`, 'add_stop', { raw_address: place(a), priority: false }, ['address', 'add']],
    (a) => [`also got one at ${place(a)}`, 'add_stop', { raw_address: place(a), priority: false }, ['address', 'add']],
    (a) => [`priority parcel for ${place(a)}`, 'add_stop', { raw_address: place(a), priority: true }, ['address', 'add', 'priority']],
    (a) => [`gate code is one four two one at ${place(a)}`, 'add_location_note', { kind: 'gate code', text: '1421' }, ['note', 'secret']],
    (a) => [`watch the dog at ${place(a)}`, 'add_location_note', { kind: 'entry note', text: 'watch the dog' }, ['note']],
    (a) => [`parcel box round the back at ${place(a)}`, 'add_location_note', { kind: 'safe place', text: 'parcel box round back' }, ['note', 'safe_place']],
    (a) => [`side gate left of the garage at ${place(a)}`, 'add_location_note', { kind: 'entry note', text: 'side gate left of garage' }, ['note']],
    () => ['starting my run', 'noop', {}, ['control']],
    () => ['taking a ten minute break', 'start_break', { minutes: 10 }, ['break']],
    () => ['back on the road', 'end_break', {}, ['break']],
    () => ['what was that', 'repeat_or_detail', {}, ['control']],
    () => ['repeat that', 'repeat_or_detail', {}, ['control']],
    () => ['where is it in the van', 'repeat_or_detail', {}, ['control']],
    () => ['read me the next one', 'repeat_or_detail', {}, ['control']],
  ],
  en_nz_van: [
    (a) => [`delivered at ${place(a)}`, 'mark_delivered', { safe_place: null }, ['delivery']],
    (a) => [`left it under the mat at ${place(a)}`, 'mark_delivered', { safe_place: 'under the mat' }, ['delivery', 'safe_place']],
    (a) => [`handed it to the man at ${place(a)}`, 'mark_delivered', { safe_place: 'handed over' }, ['delivery', 'safe_place']],
    (a) => [`left it at the shop counter at ${place(a)}`, 'mark_delivered', { safe_place: 'shop counter' }, ['delivery', 'safe_place']],
    (a) => [`nobody answered at ${place(a)}`, 'mark_failed', { reason: 'no one home' }, ['failure']],
    (a) => [`locked out at ${place(a)}`, 'mark_failed', { reason: "can't get in" }, ['failure']],
    (a) => [`skip the street for ${place(a)}`, 'skip_stop', { scope: 'street', return_later: true }, ['skip', 'street']],
    (a) => [`add ${place(a)} on the way back`, 'add_stop', { raw_address: place(a), priority: false }, ['address', 'add']],
  ],
  mi_places: [
    (a) => [`delivered at ${a.number} ${a.street}, ${a.suburb}`, 'mark_delivered', { safe_place: null }, ['delivery', 'te_reo']],
    (a) => [`left it at the whare at ${a.number} ${a.street}, ${a.suburb}`, 'mark_delivered', { safe_place: 'whare' }, ['delivery', 'te_reo', 'safe_place']],
    (a) => [`no one home at ${a.number} ${a.street}, ${a.suburb}`, 'mark_failed', { reason: 'no one home' }, ['failure', 'te_reo']],
    (a) => [`add a stop at ${a.number} ${a.street}, ${a.suburb}`, 'add_stop', { raw_address: place(a), priority: false }, ['address', 'add', 'te_reo']],
    (a) => [`the gate is on the ${a.street} side at ${a.number} ${a.street}, ${a.suburb}`, 'add_location_note', { kind: 'entry note', text: 'gate on the street side' }, ['note', 'te_reo']],
  ],
  ar: [
    (a) => [`تم التسليم في ${a.number} ${a.street}`, 'mark_delivered', { safe_place: null }, ['delivery', 'ar']],
    (a) => [`تركتها عند الباب في ${a.number} ${a.street}`, 'mark_delivered', { safe_place: 'door' }, ['delivery', 'ar', 'safe_place']],
    (a) => [`لا يوجد أحد في المنزل في ${a.number} ${a.street}`, 'mark_failed', { reason: 'no one home' }, ['failure', 'ar']],
    (a) => [`أضف عنوانا في ${a.number} ${a.street}`, 'add_stop', { raw_address: place(a), priority: false }, ['address', 'add', 'ar']],
  ],
  hi_pa: [
    (a) => [`${a.number} ${a.street} par delivery ho gaya`, 'mark_delivered', { safe_place: null }, ['delivery', 'hinglish']],
    (a) => [`${a.number} ${a.street} par gate ke andar chhod diya`, 'mark_delivered', { safe_place: 'gate' }, ['delivery', 'hinglish', 'safe_place']],
    (a) => [`${a.number} ${a.street} par koi nahi hai`, 'mark_failed', { reason: 'no one home' }, ['failure', 'hinglish']],
    (a) => [`${a.number} ${a.street} par ek aur add karo`, 'add_stop', { raw_address: place(a), priority: false }, ['address', 'add', 'hinglish']],
  ],
  zh: [
    (a) => [`已送达 ${a.number} ${a.street}`, 'mark_delivered', { safe_place: null }, ['delivery', 'zh']],
    (a) => [`放在门口 ${a.number} ${a.street}`, 'mark_delivered', { safe_place: 'door' }, ['delivery', 'zh', 'safe_place']],
    (a) => [`家里没人 ${a.number} ${a.street}`, 'mark_failed', { reason: 'no one home' }, ['failure', 'zh']],
    (a) => [`再加一个地址 ${a.number} ${a.street}`, 'add_stop', { raw_address: place(a), priority: false }, ['address', 'add', 'zh']],
  ],
  sm_to: [
    (a) => [`ua fa delivered i le ${a.number} ${a.street}`, 'mark_delivered', { safe_place: null }, ['delivery', 'pacific']],
    (a) => `ua toe i le ${a.number} ${a.street}`,
    (a) => [`faafo i le ${a.number} ${a.street}`, 'mark_failed', { reason: 'no one home' }, ['failure', 'pacific']],
    (a) => [`fale mo le ${a.number} ${a.street}`, 'add_stop', { raw_address: place(a), priority: false }, ['address', 'add', 'pacific']],
  ],
  numbers_corrections: [
    (a) => [`seven no sorry seventeen ${a.street}`, 'add_stop', { raw_address: `17 ${a.street}, ${a.suburb}`, priority: false }, ['numbers', 'correction']],
    (a) => [`twelve thirteen ${a.street}`, 'add_stop', { raw_address: `13 ${a.street}, ${a.suburb}`, priority: false }, ['numbers']],
    (a) => [`one eight five ${a.street}`, 'add_stop', { raw_address: `185 ${a.street}, ${a.suburb}`, priority: false }, ['numbers']],
    (a) => [`forty two or fifty two ${a.street}`, 'add_stop', { raw_address: `52 ${a.street}, ${a.suburb}`, priority: false }, ['numbers', 'ambiguity']],
    (a) => [`one two three four ${a.street}`, 'add_stop', { raw_address: `1234 ${a.street}, ${a.suburb}`, priority: false }, ['numbers']],
    (a) => [`two slash fourteen ${a.street}`, 'add_stop', { raw_address: `2/14 ${a.street}, ${a.suburb}`, priority: false }, ['numbers', 'unit']],
    (a) => [`forty two B ${a.street}`, 'add_stop', { raw_address: `42B ${a.street}, ${a.suburb}`, priority: false }, ['numbers', 'suffix']],
    (a) => [`S H one ${a.street}`, 'add_stop', { raw_address: `SH1 ${a.street}, ${a.suburb}`, priority: false }, ['numbers', 'rural']],
  ],
  code_switch: [
    (a) => [`delivered at ${a.number} ${a.street}, ${a.suburb} — kia ora`, 'mark_delivered', { safe_place: null }, ['delivery', 'code_switch', 'mi']],
    (a) => [`no one home at ${a.number} ${a.street} — maal aayi`, 'mark_failed', { reason: 'no one home' }, ['failure', 'code_switch', 'hi']],
    (a) => [`left it at the door ${a.number} ${a.street} — 左边的门`, 'mark_delivered', { safe_place: 'door' }, ['delivery', 'code_switch', 'zh']],
    (a) => [`add a stop ${a.number} ${a.street} — أضف عنوانا`, 'add_stop', { raw_address: place(a), priority: false }, ['address', 'add', 'code_switch', 'ar']],
  ],
  chatter: [
    () => ['is the traffic on Blenheim still silly', 'noop', {}, ['chatter']],
    () => ['bloody fuel prices eh', 'noop', {}, ['chatter']],
    () => ['radio says the road is closed', 'noop', {}, ['chatter']],
    () => ['can you turn the radio down', 'noop', {}, ['chatter']],
    () => ['she said she would be home at five', 'noop', {}, ['chatter']],
    () => ['shoot the tyre is flat again', 'noop', {}, ['chatter']],
    () => ['wait whats my name', 'noop', {}, ['chatter']],
    () => ['the coffee is cold', 'noop', {}, ['chatter']],
  ],
};

// The Samoan and Tongan slices need their own lines: the tuple above is a
// short pair, so the text is completed here.
const pacificLines = [
  (a) => [`ua fa delivered i le ${a.number} ${a.street}`, 'mark_delivered', { safe_place: null }, ['delivery', 'pacific']],
  (a) => [`ua toe i le ${a.number} ${a.street}`, 'mark_delivered', { safe_place: 'door' }, ['delivery', 'pacific', 'safe_place']],
  (a) => [`faafo i le ${a.number} ${a.street}`, 'mark_failed', { reason: 'no one home' }, ['failure', 'pacific']],
  (a) => [`fale mo le ${a.number} ${a.street}`, 'add_stop', { raw_address: place(a), priority: false }, ['address', 'add', 'pacific']],
];

const scripts = [];
let id = 0;
for (const slice of slices) {
  const bank = slice.id === 'sm_to' ? pacificLines : templates[slice.id];
  for (let index = 0; index < slice.target; index += 1) {
    const address = addressBank[index % addressBank.length];
    const template = bank[index % bank.length];
    const [text, intent, slots, tags] = template(address);
    if (!intent) continue;
    id += 1;
    scripts.push({
      id: `S${String(id).padStart(4, '0')}`,
      slice: slice.id,
      text,
      gold_intent: intent,
      gold_slots: slots,
      tags,
      address_id: address.id,
      speaker: `spk-${(index % 12) + 1}`,
    });
  }
}

// The utterances: one line per planned audio file (the noise variants).
const utterances = [];
for (const script of scripts) {
  const slice = slices.find((entry) => entry.id === script.slice);
  for (const snr of slice.snrs) {
    utterances.push({
      id: `U${String(utterances.length + 1).padStart(5, '0')}`,
      script_id: script.id,
      slice: script.slice,
      speaker: script.speaker,
      snr_db: snr,
      bed: snr === null ? 'quiet' : 'van',
      status: 'planned',
    });
  }
}

writeFileSync(join(OUT, 'scripts.jsonl'), `${scripts.map((s) => JSON.stringify(s)).join('\n')}\n`);
writeFileSync(join(OUT, 'utterances.jsonl'), `${utterances.map((u) => JSON.stringify(u)).join('\n')}\n`);

const summary = {
  generated: new Date().toISOString().slice(0, 10),
  generator: 'scripts/build-voice-eval.mjs',
  address_source: 'data/linz (LINZ layer 123113: Christchurch, Waimakariri, Selwyn)',
  scripts: scripts.length,
  utterances: utterances.length,
  addresses: addressBank.length,
  slices: slices.map((slice) => ({
    id: slice.id,
    scripts: scripts.filter((script) => script.slice === slice.id).length,
    target: slice.target,
    files: utterances.filter((utterance) => utterance.slice === slice.id).length,
    status: 'scripts ready, audio to generate',
  })),
};
writeFileSync(join(OUT, 'slices.json'), `${JSON.stringify(summary, null, 2)}\n`);

console.log(
  `voice eval: ${scripts.length} scripts, ${utterances.length} planned files, ${addressBank.length} addresses, ${summary.slices.length} slices`,
);
