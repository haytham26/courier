// The visual-regression gate (PARITY row 187, T6/T3.3, BUG-203): committed
// emulator screenshots are the baselines, and a fresh capture is compared
// against them pixel by pixel.
//
//   node scripts/ci/check-visual-baselines.mjs                     # verify the committed baselines
//   node scripts/ci/check-visual-baselines.mjs --fresh <dir>       # compare fresh captures to them
//   node scripts/ci/check-visual-baselines.mjs --fresh <dir> --update --source "run …"
//                                                                   # re-baseline deliberately
//
// There is no image library in this workspace (no sharp, no canvas, no jimp,
// no pngjs - see scripts/data/generate-synthetic-labels.mjs), so the PNG
// codec is here: decode supports 8-bit non-interlaced PNGs of color type 2
// (RGB) and 6 (RGBA) with all five scanline filters, which is what
// `adb shell screencap -p` writes; encode writes filter-0 RGBA, used by the
// tests to build fixtures.
//
// The baselines live in docs/evidence/design/baselines/ with a manifest.json
// next to them: every entry carries the sha256, the dimensions and the source
// (the CI run and artifact it was captured from), so a baseline is evidence,
// not a blob. Views the CI matrix does not capture yet (large screen, 200 %
// text) are listed as `pending` - visible, not silently skipped.
//
// Exit codes: 0 the check passed, 1 it failed, 2 the CLI was misused.

import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, inflateSync } from 'node:zlib';

const THIS_FILE = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(THIS_FILE), '..', '..');

export const DEFAULT_BASELINES = join(ROOT, 'docs', 'evidence', 'design', 'baselines');
export const DEFAULT_MANIFEST = 'manifest.json';

// The tolerance the gate compares with: a channel may differ by up to 8/255
// (emulator rendering noise, antialiasing at a subpixel), and at most
// 0.5 % of the pixels may differ at all. The determinism measurement in
// docs/evidence/design/README.md is what justifies the numbers; until the
// 20x loop has run, the gate is advisory (it reports, CI wires it blocking
// only after the false-positive rate is measured at zero).
export const TOLERANCE = { perChannel: 8, maxDiffPct: 0.5 };

// ------------------------------------------------------------------- PNG

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/**
 * Decodes an 8-bit non-interlaced PNG of color type 2 (RGB) or 6 (RGBA).
 * Anything else throws - the gate would rather fail loudly than compare the
 * wrong bytes.
 */
export function decodePng(buf) {
  if (!buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('not a PNG (bad signature)');
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat = [];
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }
  if (bitDepth !== 8 || interlace !== 0 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(
      `unsupported PNG: bitDepth ${bitDepth}, colorType ${colorType}, interlace ${interlace} (only 8-bit non-interlaced RGB/RGBA)`,
    );
  }
  const channels = colorType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(width * height * channels);
  let previous = Buffer.alloc(stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const current = Buffer.alloc(stride);
    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? current[x - channels] : 0;
      const up = previous[x];
      const upLeft = x >= channels ? previous[x - channels] : 0;
      const value = line[x];
      let reconstructed;
      switch (filter) {
        case 0:
          reconstructed = value;
          break;
        case 1:
          reconstructed = value + left;
          break;
        case 2:
          reconstructed = value + up;
          break;
        case 3:
          reconstructed = value + ((left + up) >> 1);
          break;
        case 4: {
          const p = left + up - upLeft;
          const pa = Math.abs(p - left);
          const pb = Math.abs(p - up);
          const pc = Math.abs(p - upLeft);
          const predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
          reconstructed = value + predictor;
          break;
        }
        default:
          throw new Error(`unknown PNG scanline filter ${filter}`);
      }
      current[x] = reconstructed & 0xff;
    }
    current.copy(out, y * stride);
    previous = current;
  }
  return { width, height, channels, data: out };
}

/** Encodes filter-0 8-bit RGBA PNG (the test fixtures are built with this). */
export function encodePng(width, height, rgba) {
  if (rgba.length !== width * height * 4) {
    throw new Error('encodePng: the RGBA buffer must be width*height*4 bytes');
  }
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------- diff

/**
 * Compares two decoded PNGs. Answers how many pixels differ in any of R, G,
 * B by more than `perChannel`, as a percentage of all pixels. Dimensions must
 * match - a resize is a regression, not noise.
 */
export function diffPng(a, b, perChannel = TOLERANCE.perChannel) {
  if (a.width !== b.width || a.height !== b.height) {
    return { dimensionsDiffer: true, diffPixels: a.width * a.height, totalPixels: a.width * a.height, diffPct: 100 };
  }
  const total = a.width * a.height;
  let diff = 0;
  for (let i = 0; i < total * 4; i += 4) {
    if (
      Math.abs(a.data[i] - b.data[i]) > perChannel ||
      Math.abs(a.data[i + 1] - b.data[i + 1]) > perChannel ||
      Math.abs(a.data[i + 2] - b.data[i + 2]) > perChannel
    ) {
      diff += 1;
    }
  }
  return { dimensionsDiffer: false, diffPixels: diff, totalPixels: total, diffPct: (diff / total) * 100 };
}

export function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/**
 * Splits a capture name into its screen and view: `03-today-day-small.png`
 * is screen `03-today`, view `day-small`; `…-day-small-200pct.png` adds the
 * text scale. Unknown shapes throw - a misnamed capture is a gate bug, not a
 * baseline.
 */
export function parseCaptureName(name) {
  const match = /^(\d+-[a-z0-9-]+?)-(day|night)-(small|large)(?:-(\d+)pct)?\.png$/.exec(name);
  if (match === null) {
    throw new Error(`capture name ${name} does not match <screen>-<day|night>-<small|large>[-<n>pct].png`);
  }
  return { screen: match[1], view: match[2] + '-' + match[3] + (match[4] ? '-' + match[4] + 'pct' : '') };
}

// --------------------------------------------------------------- manifest

export function readManifest(baselinesDir, manifestName = DEFAULT_MANIFEST) {
  const file = join(baselinesDir, manifestName);
  if (!existsSync(file)) {
    throw new Error(`no manifest at ${file}`);
  }
  return JSON.parse(readFileSync(file, 'utf8'));
}

/**
 * Verifies the committed baselines: every `baseline` entry's file exists, its
 * sha256 matches, it decodes, and its dimensions match the manifest. `pending`
 * entries (views the CI matrix does not capture yet) may have no file, but
 * they are reported so the gap stays visible. Returns the problems found.
 */
export function verifyManifest(baselinesDir, manifest = readManifest(baselinesDir)) {
  const problems = [];
  const pending = [];
  for (const entry of manifest.entries) {
    if (entry.status === 'pending') {
      pending.push(entry.file);
      continue;
    }
    const path = join(baselinesDir, entry.file);
    if (!existsSync(path)) {
      problems.push(`${entry.file}: the baseline file is missing`);
      continue;
    }
    const sha = sha256File(path);
    if (sha !== entry.sha256) {
      problems.push(`${entry.file}: sha256 ${sha.slice(0, 12)}… does not match the manifest's ${entry.sha256.slice(0, 12)}… (the file changed without a re-baseline)`);
      continue;
    }
    let decoded;
    try {
      decoded = decodePng(readFileSync(path));
    } catch (error) {
      problems.push(`${entry.file}: does not decode - ${errorMessage(error)}`);
      continue;
    }
    if (decoded.width !== entry.width || decoded.height !== entry.height) {
      problems.push(`${entry.file}: ${decoded.width}x${decoded.height} but the manifest says ${entry.width}x${entry.height}`);
    }
  }
  return { problems, pending };
}

/**
 * Compares a directory of fresh captures (`<name>.png`) against the
 * manifest. Every fresh file must have a `baseline` entry; a `pending` entry
 * that got captured is a problem until `--update` promotes it. Returns the
 * problems and the per-shot reports.
 */
export function compareFresh(baselinesDir, freshDir, manifest = readManifest(baselinesDir), tolerance = TOLERANCE) {
  const problems = [];
  const reports = [];
  const files = readdirSync(freshDir).filter((f) => f.endsWith('.png')).sort();
  if (files.length === 0) {
    problems.push(`${freshDir}: no .png captures in it - the gate cannot go vacuous`);
    return { problems, reports };
  }
  for (const name of files) {
    const entry = manifest.entries.find((e) => e.file === name);
    if (entry === undefined) {
      problems.push(`${name}: no baseline entry for this capture (add one deliberately with --update --allow-new)`);
      continue;
    }
    if (entry.status === 'pending') {
      problems.push(`${name}: captured but still a pending view - promote it with --update`);
      continue;
    }
    const baselinePath = join(baselinesDir, name);
    let fresh;
    let baseline;
    try {
      fresh = decodePng(readFileSync(join(freshDir, name)));
      baseline = decodePng(readFileSync(baselinePath));
    } catch (error) {
      problems.push(`${name}: does not decode - ${errorMessage(error)}`);
      continue;
    }
    const diff = diffPng(baseline, fresh, tolerance.perChannel);
    const report = { file: name, ...diff };
    reports.push(report);
    if (diff.dimensionsDiffer) {
      problems.push(`${name}: ${fresh.width}x${fresh.height} against a ${baseline.width}x${baseline.height} baseline - a resize is a regression`);
    } else if (diff.diffPct > tolerance.maxDiffPct) {
      problems.push(
        `${name}: ${diff.diffPixels}/${diff.totalPixels} pixels differ (${diff.diffPct.toFixed(3)} %) - over the ${tolerance.maxDiffPct} % gate`,
      );
    }
  }
  return { problems, reports };
}

/**
 * Re-baselines from a fresh directory: copies the captures over the baseline
 * files, rewrites the manifest entries (sha256, dimensions, source), and
 * promotes pending entries that were captured. Unknown names are refused
 * unless allowNew.
 */
export function updateBaselines(baselinesDir, freshDir, source, { allowNew = false, manifestName = DEFAULT_MANIFEST } = {}) {
  const manifest = readManifest(baselinesDir, manifestName);
  const problems = [];
  const files = readdirSync(freshDir).filter((f) => f.endsWith('.png')).sort();
  if (files.length === 0) {
    problems.push(`${freshDir}: no .png captures to re-baseline from`);
    return { problems, manifest };
  }
  for (const name of files) {
    const entry = manifest.entries.find((e) => e.file === name);
    if (entry === undefined) {
      if (!allowNew) {
        problems.push(`${name}: no baseline entry and --allow-new was not given`);
        continue;
      }
      const parsed = parseCaptureName(name);
      manifest.entries.push({
        file: name,
        screen: parsed.screen,
        view: parsed.view,
        status: 'baseline',
        width: 0,
        height: 0,
        sha256: '',
        source,
        capturedAt: new Date().toISOString(),
      });
    }
    const target = manifest.entries.find((e) => e.file === name);
    copyFileSync(join(freshDir, name), join(baselinesDir, name));
    const decoded = decodePng(readFileSync(join(baselinesDir, name)));
    target.status = 'baseline';
    target.width = decoded.width;
    target.height = decoded.height;
    target.sha256 = sha256File(join(baselinesDir, name));
    target.source = source;
    target.capturedAt = new Date().toISOString();
  }
  manifest.entries.sort((a, b) => a.file.localeCompare(b.file));
  writeFileSync(join(baselinesDir, manifestName), JSON.stringify(manifest, null, 2) + '\n');
  return { problems, manifest };
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

// ------------------------------------------------------------------- CLI

function usage() {
  console.error(
    [
      'usage:',
      '  node scripts/ci/check-visual-baselines.mjs [--baselines <dir>]                 verify the committed baselines',
      '  node scripts/ci/check-visual-baselines.mjs [--baselines <dir>] --fresh <dir>   compare fresh captures against them',
      '  ... --fresh <dir> --update --source "run <id> artifact <name>" [--allow-new]   re-baseline deliberately',
    ].join('\n'),
  );
  process.exit(2);
}

export function main(argv = process.argv.slice(2)) {
  let baselinesDir = DEFAULT_BASELINES;
  let freshDir = null;
  let update = false;
  let source = null;
  let allowNew = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--baselines') {
      baselinesDir = resolve(argv[++i] ?? '');
    } else if (arg === '--fresh') {
      freshDir = resolve(argv[++i] ?? '');
    } else if (arg === '--update') {
      update = true;
    } else if (arg === '--source') {
      source = argv[++i] ?? null;
    } else if (arg === '--allow-new') {
      allowNew = true;
    } else {
      usage();
    }
  }
  if (!existsSync(baselinesDir) || !statSync(baselinesDir).isDirectory()) {
    console.error(`check-visual-baselines: no baselines directory at ${baselinesDir}`);
    return 2;
  }
  if (update) {
    if (freshDir === null || source === null) {
      usage();
    }
    const { problems, manifest } = updateBaselines(baselinesDir, freshDir, source, { allowNew });
    if (problems.length > 0) {
      console.error('check-visual-baselines: re-baseline refused:\n' + problems.map((p) => `  ${p}`).join('\n'));
      return 1;
    }
    const done = manifest.entries.filter((e) => e.status === 'baseline').length;
    const pending = manifest.entries.filter((e) => e.status === 'pending').length;
    console.log(`check-visual-baselines: re-baselined from ${freshDir} (${done} baselines, ${pending} pending) — source: ${source}`);
    return 0;
  }
  if (freshDir !== null) {
    if (!existsSync(freshDir) || !statSync(freshDir).isDirectory()) {
      console.error(`check-visual-baselines: no fresh directory at ${freshDir}`);
      return 2;
    }
    const manifest = readManifest(baselinesDir);
    const { problems, reports } = compareFresh(baselinesDir, freshDir, manifest);
    for (const r of reports) {
      console.log(
        `  ${r.file}: ${r.diffPixels}/${r.totalPixels} pixels differ (${r.diffPct.toFixed(3)} %)` +
          (r.dimensionsDiffer ? ' — DIMENSIONS DIFFER' : ''),
      );
    }
    if (problems.length > 0) {
      console.error('check-visual-baselines: REGRESSION (or unknown capture):\n' + problems.map((p) => `  ${p}`).join('\n'));
      return 1;
    }
    console.log(`check-visual-baselines: ${reports.length} captures match the baselines within ${manifest.tolerance?.maxDiffPct ?? TOLERANCE.maxDiffPct} %`);
    return 0;
  }
  const { problems, pending } = verifyManifest(baselinesDir);
  if (pending.length > 0) {
    console.log('  pending views (not captured yet): ' + pending.join(', '));
  }
  if (problems.length > 0) {
    console.error('check-visual-baselines: the committed baselines are broken:\n' + problems.map((p) => `  ${p}`).join('\n'));
    return 1;
  }
  const manifest = readManifest(baselinesDir);
  const done = manifest.entries.filter((e) => e.status === 'baseline').length;
  console.log(`check-visual-baselines: ${done} baselines verified (${pending.length} pending views listed above)`);
  return 0;
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === THIS_FILE) {
  process.exit(main());
}
