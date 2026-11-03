// Fetches the open data the voice evaluation set needs (A3, AUDIT_2026-10-25).
//
//   node scripts/eval/fetch-open-voice-data.mjs [--nz 120] [--mix 120]
//   node scripts/eval/fetch-open-voice-data.mjs --docs     # only the licence rows
//
// WHAT it downloads, all of it open data, none of it shipped in the app:
//
//   - Mozilla Common Voice en clips (CC0-1.0), filtered by the dataset's own
//     accent metadata: New Zealand English first, then the other English
//     accents a Christchurch courier hears in the van (Australian, England,
//     Scottish, Irish, Canadian, United States). The mirror on the Hugging
//     Face datasets-server serves the mp3 of every row; the sentence and the
//     accent are the row's own metadata, so nothing is transcribed by hand.
//   - The MUSAN noise beds (CC-BY 4.0): a handful of road, rain, engine and
//     street clips that the van slices are mixed with at the manifest's SNR
//     levels. ESC-50 (CC BY-NC) and the DNS-challenge set are NOT used: a
//     non-commercial licence is not allowed for a commercial product's eval
//     set (the audit's rule).
//
// WHERE it lands: data/voice/ (git-ignored, like data/linz/). The checksums
// live with the clips, and the licences are recorded in
// packages/eval/voice/manifest/licence.csv and docs/product/LICENSES.md.
//
// The script is restartable: the clips already on disk in clips.jsonl are
// skipped, so an interrupted run continues from what it has. The evaluation
// harness (services/courier-voice) reads the clips.jsonl it writes.
import { createWriteStream } from 'node:fs';
import { mkdirSync, writeFileSync, readFileSync, existsSync, appendFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const VIEWER = 'https://datasets-server.huggingface.co';
const CV_DATASET = 'saeedzou/common-voice-17-en-age-gender-accent';
const MUSAN_DATASET = 'corypaik/musan';

const ROOT = process.cwd();
const DATA = join(ROOT, 'data', 'voice');
const CLIPS_DIR = join(DATA, 'common-voice', 'clips');
const NOISE_DIR = join(DATA, 'noise');
const MANIFEST = join(ROOT, 'packages', 'eval', 'voice', 'manifest');

// The other-English accents of the courier mix, in the order they are picked.
const OTHER_ACCENTS = [
  'Australian English',
  'England English',
  'Scottish English',
  'Irish English',
  'Canadian English',
  'United States English',
];

const BED_COUNT = 8; // MUSAN clips for the van beds, spread over their sources

const args = process.argv.slice(2);
const readArg = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? Number(args[index + 1]) : fallback;
};
const NZ_TARGET = readArg('--nz', 120);
const MIX_TARGET = readArg('--mix', 120);
const SPARES = 20; // extra clips, so a broken download does not shrink the set
const DOCS_ONLY = args.includes('--docs');

const CLIPS_JSONL = join(DATA, 'common-voice', 'clips.jsonl');
const NOISE_JSONL = join(DATA, 'noise', 'noise.jsonl');
const LICENCE_CSV = join(MANIFEST, 'licence.csv');

mkdirSync(CLIPS_DIR, { recursive: true });
mkdirSync(NOISE_DIR, { recursive: true });

// ------------------------------------------------------------------ utils

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const slug = (text) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

function readJsonl(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

async function getJson(url, attempts = 6) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(url);
    if (response.ok) return response.json();
    if (response.status === 429) {
      await sleep(5000 * (attempt + 1));
      continue;
    }
    throw new Error(`${url} -> ${response.status}`);
  }
  throw new Error(`${url} kept answering 429`);
}

async function getBinary(url, attempts = 5) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(url);
    if (response.ok) return Buffer.from(await response.arrayBuffer());
    if (response.status === 429) {
      await sleep(3000 * (attempt + 1));
      continue;
    }
    throw new Error(`${url} -> ${response.status}`);
  }
  throw new Error(`${url} kept answering 429`);
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function appendJsonl(path, row) {
  appendFileSync(path, `${JSON.stringify(row)}\n`, 'utf8');
}

const textOf = (value) => (typeof value === 'string' ? value : (value?.name ?? String(value)));
const words = (sentence) => sentence.trim().split(/\s+/).filter(Boolean).length;

// --------------------------------------------------------- the licence rows

// The ledger the checkers and the docs read. It is written every run (the file
// is small and stable), so a fresh clone records it without the data.
const LICENCE_ROWS = [
  {
    dataset: 'Mozilla Common Voice 17.0 (en)',
    url: 'https://commonvoice.mozilla.org/data (mirror: saeedzou/common-voice-17-en-age-gender-accent on the HF datasets-server)',
    licence: 'CC0-1.0 (the corpus is public domain; the accent and the sentence are the row metadata)',
    read_on: '2026-11-03',
    where: 'the en_nz_quiet, en_nz_van and en_mix speaker clips (A3)',
  },
  {
    dataset: 'MUSAN',
    url: 'https://www.openslr.org/17 (mirror: corypaik/musan)',
    licence: 'CC-BY-4.0',
    read_on: '2026-11-03',
    where: 'the van noise beds for the en_nz_van slice (A3)',
  },
  {
    dataset: 'sherpa-onnx whisper tiny.en (the reference STT judge)',
    url: 'https://github.com/k2-fsa/sherpa-onnx/releases (asr-models/sherpa-onnx-whisper-tiny.en)',
    licence: 'Apache-2.0 (the runtime) + MIT (the Whisper weights)',
    read_on: '2026-11-03',
    where: 'the reference recogniser of the WER pass only; never shipped in the app (A3)',
  },
];

function writeLicences() {
  const header = 'dataset,url,licence,read_on,where\n';
  const quote = (value) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const body = LICENCE_ROWS.map((row) =>
    [row.dataset, row.url, row.licence, row.read_on, row.where].map(quote).join(','),
  ).join('\n');
  writeFileSync(LICENCE_CSV, `${header}${body}\n`, 'utf8');
  console.log(`licence ledger: ${LICENCE_ROWS.length} rows -> ${LICENCE_CSV}`);
}

// ------------------------------------------------------------- the noise beds

async function fetchBeds() {
  const already = readJsonl(NOISE_JSONL);
  const wanted = BED_COUNT - already.length;
  if (wanted <= 0) {
    console.log(`noise beds: ${already.length} already fetched`);
    return;
  }
  console.log(`noise beds: fetching ${wanted} MUSAN clips`);
  const seen = new Set(already.map((row) => row.file));
  const sources = new Set(already.map((row) => row.source));
  let offset = 0;
  while (offset < 200 && seen.size < BED_COUNT) {
    const body = await getJson(
      `${VIEWER}/rows?dataset=${encodeURIComponent(MUSAN_DATASET)}&config=noise&split=train&offset=${offset}&length=20`,
    );
    if (body.rows.length === 0) break;
    for (const item of body.rows) {
      const row = item.row;
      const source = textOf(row.source ?? 'musan-noise');
      const original = textOf(row.path ?? source);
      if (sources.has(original)) continue; // one clip per original recording
      const src = row.audio?.[0]?.src;
      if (!src) continue;
      const name = `bed-${String(seen.size + 1).padStart(2, '0')}-${slug(original)}.wav`;
      const file = join(NOISE_DIR, name);
      const bytes = await getBinary(src);
      if (bytes.length < 32000) continue; // too short to be a bed
      writeFileSync(file, bytes);
      const sound = { file: `data/voice/noise/${name}`, source, original, bytes: bytes.length, sha256: sha256(bytes) };
      appendJsonl(NOISE_JSONL, sound);
      seen.add(sound.file);
      sources.add(source);
      if (seen.size >= BED_COUNT) break;
    }
    offset += 20;
  }
  console.log(`noise beds: ${readJsonl(NOISE_JSONL).length} on disk`);
}

// --------------------------------------------------------------- the speakers

function classify(accent) {
  const first = textOf(accent).split(',')[0].trim();
  if (first.includes('New Zealand')) return 'nz';
  if (OTHER_ACCENTS.includes(first)) return 'mix';
  return null;
}

async function scanSpeakerClips() {
  const already = readJsonl(CLIPS_JSONL);
  const have = already.reduce((totals, row) => ({ ...totals, [row.kind]: (totals[row.kind] ?? 0) + 1 }), {});
  const wantNZ = NZ_TARGET + SPARES - (have.nz ?? 0);
  const wantMix = MIX_TARGET + SPARES - (have.mix ?? 0);
  if (wantNZ <= 0 && wantMix <= 0) {
    console.log(`speakers: nz ${have.nz ?? 0}, mix ${have.mix ?? 0} already fetched`);
    return;
  }
  console.log(`speakers: want ${wantNZ} more NZ and ${wantMix} more mixed-accent clips`);
  console.log('this scans the Common Voice mirror row by row (the viewer has no server-side filter);');
  console.log('it is slow and restartable - an interrupted run keeps what it has.');

  const cursorFile = join(DATA, 'common-voice', 'cursor.json');
  const saved = existsSync(cursorFile) ? JSON.parse(readFileSync(cursorFile, 'utf8')) : { offset: 0 };
  let offset = saved.offset ?? 0;
  let gotNZ = have.nz ?? 0;
  let gotMix = have.mix ?? 0;
  const sentences = new Set(already.map((row) => row.sentence));
  let pages = 0;

  while ((gotNZ < NZ_TARGET + SPARES || gotMix < MIX_TARGET + SPARES) && offset < 600000) {
    let body;
    try {
      body = await getJson(
        `${VIEWER}/rows?dataset=${encodeURIComponent(CV_DATASET)}&config=default&split=train&offset=${offset}&length=100`,
      );
    } catch (error) {
      console.error(`the scan stopped at offset ${offset}: ${error.message}`);
      break;
    }
    pages += 1;
    for (const item of body.rows) {
      const row = item.row;
      const sentence = String(row.sentence ?? '').trim();
      if (words(sentence) < 3 || words(sentence) > 22) continue;
      if (sentences.has(sentence)) continue;
      const kind = classify(row.accent);
      if (kind === null) continue;
      if (kind === 'nz' && gotNZ >= NZ_TARGET + SPARES) continue;
      if (kind === 'mix' && gotMix >= MIX_TARGET + SPARES) continue;
      const src = row.audio?.[0]?.src;
      if (!src) continue;
      const clipId = String(row.path ?? '').split('/').pop()?.replace(/\.mp3$/, '') || `cv-${offset}-${sentences.size}`;
      const file = join(CLIPS_DIR, `${kind}-${clipId}.mp3`);
      try {
        const bytes = await getBinary(src);
        if (bytes.length < 12000) continue; // a truncated download is not a clip
        writeFileSync(file, bytes);
        const accent = textOf(row.accent);
        appendJsonl(CLIPS_JSONL, {
          kind,
          clip_id: clipId,
          accent,
          age: textOf(row.age ?? ''),
          gender: textOf(row.gender ?? ''),
          sentence,
          file: `data/voice/common-voice/clips/${kind}-${clipId}.mp3`,
          bytes: bytes.length,
          sha256: sha256(bytes),
          dataset: CV_DATASET,
          licence: 'CC0-1.0',
        });
        sentences.add(sentence);
        if (kind === 'nz') gotNZ += 1;
        else gotMix += 1;
      } catch (error) {
        console.error(`clip ${clipId} failed: ${error.message}`);
      }
      if (gotNZ >= NZ_TARGET + SPARES && gotMix >= MIX_TARGET + SPARES) break;
    }
    offset += body.rows.length || 100;
    if (pages % 25 === 0) {
      console.log(`  scanned ${offset} rows: nz ${gotNZ}/${NZ_TARGET + SPARES}, mix ${gotMix}/${MIX_TARGET + SPARES}`);
      writeFileSync(cursorFile, JSON.stringify({ offset }, null, 0), 'utf8');
    }
  }
  writeFileSync(cursorFile, JSON.stringify({ offset }, null, 0), 'utf8');
  const rows = readJsonl(CLIPS_JSONL);
  const nz = rows.filter((row) => row.kind === 'nz').length;
  const mix = rows.filter((row) => row.kind === 'mix').length;
  console.log(`speakers: nz ${nz}, mix ${mix} clips on disk (${offset} rows scanned)`);
  if (nz < NZ_TARGET || mix < MIX_TARGET) {
    console.error(`the set needs ${NZ_TARGET} NZ and ${MIX_TARGET} mixed-accent clips; re-run to continue the scan`);
    process.exitCode = 1;
  }
}

// -------------------------------------------------------------------- main

writeLicences();
if (!DOCS_ONLY) {
  await fetchBeds();
  await scanSpeakerClips();
}
