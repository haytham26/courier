#!/usr/bin/env node
// Draws the synthetic label images and their ground truth.
//
//   node scripts/data/generate-synthetic-labels.mjs
//
// The images go to data/labels/synthetic/ (gitignored): the label photos may
// hold personal data, so nothing that looks like a label ever enters the
// repository. The ground truth is written next to the images, one line per
// image, and it is the drawing's own text: scripts/eval/check-scanner-eval.mjs
// compares it against the committed manifest, so the manifest and the images
// cannot drift apart.
//
// There is no image library in this workspace (no sharp, no canvas, no jimp, no
// pdfkit), so each label is an SVG: it is text, it is a real label, and the
// ground truth is the text on it.
//
// The drawing is deterministic: the same manifest gives the same bytes, so the
// sha256 of every image is stable.

import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, resolve, sep } from 'node:path';

const MANIFEST = 'packages/eval/scanner/manifest';
const OUT_DIR = 'data/labels/synthetic';
const TRUTH_FILE = 'data/labels/synthetic/ground_truth.jsonl';

const LAYOUTS = {
  nzpost_174x100: { width: 174, height: 100 },
  '4x6_thermal': { width: 152, height: 102 },
  a4_dot_matrix: { width: 297, height: 210 },
  a4_laser_sheet: { width: 210, height: 297 },
  pouch_sticker: { width: 100, height: 50 },
  satchel_ticket: { width: 102, height: 76 },
  handwritten_docket: { width: 150, height: 100 },
  international_customs: { width: 210, height: 148 },
};

const CARRIER_NAMES = {
  courierpost: 'CourierPost',
  nzpost: 'NZ Post',
  posthaste: 'Post Haste',
  nzcouriers: 'NZ Couriers',
  aramex: 'Aramex',
  nzpost_international: 'NZ Post International',
  dhl: 'DHL',
  fedex: 'FedEx',
  ups: 'UPS',
  generic: '',
};

const SERVICE_LABELS = {
  courierpost: 'COURIERPOST',
  nzpost: 'PARCELPOST',
  posthaste: 'EXPRESS PACK SATCHEL',
  nzcouriers: 'COURIER TICKET',
  aramex: 'DOMESTIC COURIER',
  nzpost_international: 'INTERNATIONAL',
  dhl: 'EXPRESS WORLDWIDE',
  fedex: 'INTERNATIONAL',
  ups: 'UPS STANDARD',
  generic: 'PARCEL',
};

// ------------------------------------------------------------------ helpers

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFrom(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

// A handwritten-looking line: every character gets a small offset and a small
// rotation. It is a script font, not a scan of handwriting, and the catalogue
// says so.
function handwrittenLine(text, x, y, size, random, fill) {
  const chars = [...text];
  let cursor = x;
  const parts = chars.map((char) => {
    const dx = (random() - 0.5) * size * 0.18;
    const dy = (random() - 0.5) * size * 0.5;
    const rotate = (random() - 0.5) * 9;
    const advance = char === ' ' ? size * 0.32 : size * 0.58;
    const part = `<tspan x="${cursor.toFixed(2)}" dy="${dy.toFixed(2)}" rotate="${rotate.toFixed(1)}">${escapeXml(char)}</tspan>`;
    cursor += advance + dx;
    return part;
  });
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-family="'Segoe Script','Bradley Hand','Brush Script MT',cursive">${parts.join('')}</text>`;
}

// The barcode: a deterministic pattern of bars. It is not a scannable symbol
// (a real Code 128 encoder is not in this workspace), so the barcode read rate
// is measured on the founder photos and on a barcode-accurate renderer.
function barcodeBars(value, x, y, width, height, random) {
  const unit = 0.38;
  const bars = [];
  let cursor = x;
  while (cursor < x + width - unit) {
    const widthUnits = 1 + Math.floor(random() * 4);
    const barWidth = widthUnits * unit;
    if (cursor + barWidth > x + width) break;
    bars.push(`<rect x="${cursor.toFixed(2)}" y="${y.toFixed(2)}" width="${barWidth.toFixed(2)}" height="${height.toFixed(2)}" fill="#000000"/>`);
    cursor += barWidth + unit * (1 + Math.floor(random() * 2));
  }
  return bars.join('');
}

function paperPath(width, height, condition) {
  if (condition !== 'torn') {
    return `M0 0 L${width} 0 L${width} ${height} L0 ${height} Z`;
  }
  const bite = height * 0.16;
  return [
    `M0 0`,
    `L${width} 0`,
    `L${width} ${height - bite}`,
    `L${width - width * 0.18} ${height - bite * 0.55}`,
    `L${width - width * 0.34} ${height - bite * 1.1}`,
    `L${width - width * 0.5} ${height - bite * 0.2}`,
    `L${width * 0.18} ${height}`,
    `L0 ${height}`,
    'Z',
  ].join(' ');
}

// ------------------------------------------------------------------ drawing

function drawLabel(label) {
  const layout = LAYOUTS[label.layout];
  if (!layout) {
    throw new Error(`unknown layout: ${label.layout}`);
  }
  const { width, height } = layout;
  const truth = label.ground_truth.fields;
  const random = mulberry32(seedFrom(label.id));
  const handwritten = label.label_type === 'handwritten';
  const carrierName = CARRIER_NAMES[label.carrier] ?? '';
  const service = SERVICE_LABELS[label.carrier] ?? 'PARCEL';
  const body = [];
  const drawn = {};

  const margin = Math.max(4, width * 0.045);
  const fontSans = 'Arial, Helvetica, sans-serif';
  const addressSize = Math.min(5.2, Math.max(2.6, height * 0.055));
  const smallSize = Math.min(3.2, Math.max(2.1, height * 0.034));
  const tinySize = Math.min(2.6, Math.max(1.8, height * 0.028));
  const isDotMatrix = label.layout === 'a4_dot_matrix';
  const isManifest = label.layout === 'a4_laser_sheet' || label.layout === 'international_customs';

  // The paper. A thermal label is a warm off-white, a laser label is white.
  const paperFill = label.label_type === 'thermal' ? '#f7f4ec' : '#ffffff';
  const ink = label.condition === 'thermal_fade' ? '#6f6f6f' : '#000000';
  body.push(`<path d="${paperPath(width, height, label.condition)}" fill="${paperFill}"/>`);

  if (isDotMatrix) {
    // A dot-matrix docket: a header, then the parcel's own block, then the
    // table of the other parcels on the sheet. The table holds parcel numbers
    // only, so the gold block stays unambiguous.
    body.push(
      `<text x="${margin}" y="${margin + 5}" font-size="6" font-weight="bold" font-family="${fontSans}" fill="${ink}">COURIER DOCKET</text>`,
    );
    body.push(
      `<text x="${margin}" y="${margin + 12}" font-size="3" font-family="${fontSans}" fill="${ink}">Sheet ${label.id} · page 1 of 1</text>`,
    );
  }

  if (isManifest) {
    body.push(
      `<text x="${margin}" y="${margin + 6}" font-size="7" font-weight="bold" font-family="${fontSans}" fill="${ink}">${escapeXml(carrierName.toUpperCase())}</text>`,
    );
    body.push(
      `<text x="${margin}" y="${margin + 13}" font-size="3.4" font-family="${fontSans}" fill="${ink}">${escapeXml(service)} · CUSTOMS DECLARATION</text>`,
    );
    body.push(
      `<line x1="${margin}" y1="${margin + 18}" x2="${width - margin}" y2="${margin + 18}" stroke="#000000" stroke-width="0.6"/>`,
    );
  }

  // The carrier name and the service, except on the unbranded stationery.
  if (carrierName && !isManifest) {
    body.push(
      `<text x="${margin}" y="${margin + 4.5}" font-size="${Math.min(6, addressSize * 1.2)}" font-weight="bold" font-family="${fontSans}" fill="${ink}">${escapeXml(carrierName)}</text>`,
    );
    body.push(
      `<text x="${margin}" y="${margin + 9.5}" font-size="${tinySize}" font-family="${fontSans}" fill="${ink}">${escapeXml(service)}</text>`,
    );
  }

  // The blocks. The layout differs per carrier, but the sender block always
  // looks like an address: that is the wrong-block trap.
  const blockTop = isDotMatrix ? margin + 30 : isManifest ? margin + 26 : margin + 14;
  const leftWidth = width * 0.52;
  const rightX = margin + leftWidth + 6;

  const hasSender = 'sender' in truth;
  const hasReceiver = 'receiver' in truth;
  const hasAddress = 'address' in truth;
  const hasUnit = 'unit' in truth && truth.unit;

  let leftY = blockTop;
  if (hasReceiver && hasAddress) {
    body.push(
      `<text x="${margin}" y="${leftY}" font-size="${smallSize}" font-weight="bold" font-family="${fontSans}" fill="${ink}">TO</text>`,
    );
    leftY += smallSize * 1.5;
    if (hasUnit) {
      drawn.unit = truth.unit;
      body.push(
        handwritten
          ? handwrittenLine(truth.unit, margin, leftY, addressSize * 0.85, random, ink)
          : `<text x="${margin}" y="${leftY}" font-size="${addressSize * 0.85}" font-family="${fontSans}" fill="${ink}">${escapeXml(truth.unit)}</text>`,
      );
      leftY += addressSize * 1.2;
    }
    drawn.address = truth.address;
    body.push(
      handwritten
        ? handwrittenLine(truth.address, margin, leftY, addressSize, random, ink)
        : `<text x="${margin}" y="${leftY}" font-size="${addressSize}" font-weight="bold" font-family="${fontSans}" fill="${ink}">${escapeXml(truth.address)}</text>`,
    );
    leftY += addressSize * 1.35;
    if ('suburb' in truth) {
      drawn.suburb = truth.suburb;
      body.push(
        handwritten
          ? handwrittenLine(truth.suburb, margin, leftY, addressSize * 0.9, random, ink)
          : `<text x="${margin}" y="${leftY}" font-size="${addressSize * 0.9}" font-family="${fontSans}" fill="${ink}">${escapeXml(truth.suburb)}</text>`,
      );
      leftY += addressSize * 1.3;
    }
    if (hasReceiver) {
      drawn.receiver = truth.receiver;
      body.push(
        `<text x="${margin}" y="${leftY}" font-size="${smallSize}" font-family="${fontSans}" fill="${ink}">${escapeXml(truth.receiver)}</text>`,
      );
      leftY += smallSize * 1.4;
    }
  }

  if (hasSender) {
    drawn.sender = truth.sender;
    let senderY = blockTop;
    body.push(
      `<text x="${rightX}" y="${senderY}" font-size="${smallSize}" font-weight="bold" font-family="${fontSans}" fill="${ink}">FROM</text>`,
    );
    senderY += smallSize * 1.4;
    const senderLines = String(truth.sender).split('\n');
    const longestSenderLine = Math.max(...senderLines.map((line) => line.length));
    const senderSize =
      longestSenderLine > 26 ? smallSize * 0.72 : longestSenderLine > 20 ? smallSize * 0.85 : smallSize;
    for (const line of senderLines) {
      body.push(
        `<text x="${rightX}" y="${senderY}" font-size="${senderSize}" font-family="${fontSans}" fill="${ink}">${escapeXml(line)}</text>`,
      );
      senderY += senderSize * 1.25;
    }
    body.push(
      `<text x="${rightX}" y="${senderY + 2}" font-size="${tinySize}" font-family="${fontSans}" fill="${ink}">Ph ${escapeXml('00 000 0000')}</text>`,
    );
  }

  // The bottom row: the barcode, then the date, the weight and the fragile
  // flag above it. The barcode sits at the foot of the label, so the other
  // foot text goes above the bars and never over them.
  const hasBarcode = 'barcode' in truth;
  const barcodeHeight = hasBarcode ? Math.max(8, height * 0.16) : 0;
  const barcodeTop = hasBarcode ? height - margin - barcodeHeight - 3 : height;
  const footY = hasBarcode ? barcodeTop - 5 : height - margin - 4;

  if (isDotMatrix) {
    // The table of the other parcels on the sheet, under the parcel's own
    // block. Parcel numbers only: no other address, so the gold block stays
    // unambiguous.
    const tableTop = leftY + 10;
    body.push(
      `<text x="${margin}" y="${tableTop}" font-size="2.6" font-family="${fontSans}" fill="${ink}">No. · Barcode · Suburb · Address · Weight</text>`,
    );
    const rows = [
      '01 · 03258847 · Riccarton · 42B Main North Road · 2.40 kg',
      '02 · 03258848 · Papanui · 12 Durham Street South · 0.80 kg',
      '03 · 03258849 · Hornby · 7 Main South Road · 5.10 kg',
      '04 · 03258850 · Fendalton · 3 Clyde Road · 1.20 kg',
    ];
    rows.forEach((row, index) => {
      body.push(
        `<line x1="${margin}" y1="${tableTop + 3 + index * 7}" x2="${width - margin}" y2="${tableTop + 3 + index * 7}" stroke="#b8b8b8" stroke-width="0.3"/>`,
      );
      body.push(
        `<text x="${margin}" y="${tableTop + 8 + index * 7}" font-size="2.8" font-family="${fontSans}" fill="${ink}">${escapeXml(row)}</text>`,
      );
    });
  }

  const footFields = [];
  if ('tracking' in truth) {
    if (truth.tracking !== truth.barcode) {
      footFields.push(truth.tracking);
    }
    drawn.tracking = truth.tracking;
  }
  if ('date' in truth) {
    footFields.push(`Date ${truth.date}`);
    drawn.date = truth.date;
  }
  if ('weight' in truth) {
    footFields.push(truth.weight);
    drawn.weight = truth.weight;
  }
  if (footFields.length > 0) {
    body.push(
      `<text x="${margin}" y="${footY}" font-size="${smallSize}" font-family="${fontSans}" fill="${ink}">${escapeXml(footFields.join('  ·  '))}</text>`,
    );
  }
  if ('fragile' in truth && truth.fragile) {
    drawn.fragile = 'FRAGILE';
    body.push(
      `<text x="${width - margin}" y="${footY}" font-size="${smallSize}" font-weight="bold" font-family="${fontSans}" fill="${ink}" text-anchor="end">FRAGILE</text>`,
    );
  }

  // The barcode and the human-readable form.
  if (hasBarcode) {
    drawn.barcode = truth.barcode;
    drawn.tracking = truth.tracking;
    const barcodeWidth = width - margin * 2;
    body.push(barcodeBars(truth.barcode, margin, barcodeTop, barcodeWidth, barcodeHeight, random));
    body.push(
      `<text x="${margin}" y="${height - margin}" font-size="${tinySize}" font-family="${fontSans}" fill="${ink}">${escapeXml(truth.barcode)}</text>`,
    );
  }

  // The condition: the degradation the slice is about.
  if (label.condition === 'low_light') {
    body.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="#101418" opacity="0.55"/>`);
  }
  if (label.condition === 'glare') {
    body.push(
      `<polygon points="0,${height * 0.1} ${width * 0.55},0 ${width * 0.8},0 ${width * 0.25},${height * 0.45}" fill="#ffffff" opacity="0.72"/>`,
    );
  }
  if (label.condition === 'crumpled') {
    const folds = [0.28, 0.52, 0.78];
    for (const fold of folds) {
      body.push(
        `<polygon points="0,${height * fold} ${width},${height * (fold - 0.07)} ${width},${height * (fold + 0.03)} 0,${height * (fold + 0.08)}" fill="#000000" opacity="0.12"/>`,
      );
    }
  }
  if (label.condition === 'over_sticker') {
    body.push(
      `<rect x="${width - margin - 34}" y="${margin + 2}" width="32" height="16" fill="#ffffff" stroke="#9a9a9a" stroke-width="0.3"/>`,
    );
    body.push(barcodeBars('OVERSTICKER', width - margin - 32, margin + 5, 28, 7, random));
    body.push(
      `<text x="${width - margin - 32}" y="${margin + 16}" font-size="2.4" font-family="${fontSans}" fill="#000000">PREVIOUS LABEL</text>`,
    );
  }
  if (label.condition === 'plastic_sleeve' || label.condition === 'plastic_bag') {
    const opacity = label.condition === 'plastic_bag' ? 0.3 : 0.16;
    body.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="#dfe9f2" opacity="${opacity}"/>`);
    body.push(
      `<polygon points="${width * 0.05},0 ${width * 0.35},0 ${width * 0.1},${height} 0,${height}" fill="#ffffff" opacity="0.22"/>`,
    );
  }
  if (label.condition === 'torn') {
    body.push(
      `<rect x="${width * 0.66}" y="${height * 0.84}" width="${width * 0.34}" height="${height * 0.16}" fill="${paperFill}"/>`,
    );
  }

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}">`,
    `<title>${escapeXml(label.id)} · ${escapeXml(label.carrier)} · ${escapeXml(label.layout)} · ${escapeXml(label.condition)}</title>`,
    `<desc>${escapeXml(`Synthetic courier label ${label.id}. Slice ${label.slice}. Drawn by scripts/data/generate-synthetic-labels.mjs. No personal data.`)}</desc>`,
    body.join(''),
    '</svg>',
    '',
  ].join('\n');

  return { svg, drawn };
}

// --------------------------------------------------------------------- main

const manifestFile = join(MANIFEST, 'labels.jsonl');
if (!existsSync(manifestFile)) {
  console.error(`the manifest is missing: ${manifestFile} (run node scripts/eval/build-scanner-eval.mjs first)`);
  process.exit(1);
}

const outRoot = resolve(process.cwd(), OUT_DIR);
const relativeOut = relative(process.cwd(), outRoot).split(sep).join('/');
if (!relativeOut.startsWith('data/')) {
  console.error('the images must stay under data/ - they are never committed');
  process.exit(1);
}

const rows = readFileSync(manifestFile, 'utf8')
  .split('\n')
  .filter((line) => line.trim())
  .map((line) => JSON.parse(line));
const synthetic = rows.filter((row) => row.source === 'synthetic');

if (existsSync(outRoot)) {
  rmSync(outRoot, { recursive: true, force: true });
}
mkdirSync(outRoot, { recursive: true });

const truthRows = [];
for (const label of synthetic) {
  const { svg, drawn } = drawLabel(label);
  const file = join(outRoot, `${label.id}.svg`);
  writeFileSync(file, svg);
  truthRows.push({
    id: label.id,
    image: `data/labels/synthetic/${label.id}.svg`,
    sha256: sha256(svg),
    bytes: Buffer.byteLength(svg),
    slice: label.slice,
    carrier: label.carrier,
    layout: label.layout,
    condition: label.condition,
    drawn,
  });
}

writeFileSync(
  join(outRoot, 'ground_truth.jsonl'),
  `${truthRows.map((row) => JSON.stringify(row)).join('\n')}\n`,
);

console.log(
  `synthetic labels: ${truthRows.length} images in ${OUT_DIR}, with the ground truth in ${TRUTH_FILE}`,
);
