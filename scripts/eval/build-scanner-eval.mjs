#!/usr/bin/env node
// Builds the scanner evaluation set: the label manifest, the slices, the field
// catalogue and the licence ledger.
//
//   node scripts/eval/build-scanner-eval.mjs
//
// It writes the manifest under packages/eval/scanner/manifest/:
//   - labels.jsonl   one line per label slot (the slots and the ground truth)
//   - slices.json    the slice ids, the counts and the status
//   - fields.json    the field catalogue, the carriers, the symbologies, the
//                    normalisation rules and the acceptance rules
//   - licence.csv    every source behind the set: what it is, its licence, the
//                    date the licence was read and the evidence link
//
// The images are NOT committed. The synthetic labels are drawn from this
// manifest by scripts/data/generate-synthetic-labels.mjs into data/labels/synthetic/
// (gitignored). The real photos have to come from the founder, redacted, and
// they stay outside the repository.
//
// The build is deterministic: the same seed, the same LINZ extract and the same
// anchor date give the same bytes. The date on the labels is derived from the
// anchor date, never from the clock.

import { createReadStream } from 'node:fs';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const OUT = 'packages/eval/scanner/manifest';
const LINZ = 'data/linz';
const GENERATOR = 'scripts/data/generate-synthetic-labels.mjs';

// The set's anchor date. Every date on a label is derived from it, so the
// build is byte-identical on any day.
const ANCHOR = '2026-10-21';
const SEED = 20261021;

// V4 section 10.2: at least 300 real-style NZ courier label images. The floor
// counts the labels we can measure on today (the synthetic ones); the slots
// that wait on the founder's photos are counted separately and never make the
// floor on their own.
const FLOOR_TOTAL = 300;

// V4 section 10.2: at most 1.5 s per label on a mid-range Android.
const READ_BUDGET_S = 1.5;

// --------------------------------------------------------------- the slices

const SLICES = [
  {
    id: 'courier_labels',
    min: 120,
    synthetic: 130,
    founder: 15,
    measures: 'the everyday thermal labels the courier scans on the run',
    recipes: [
      { carrier: 'courierpost', layout: 'nzpost_174x100', type: 'thermal', condition: 'clean', count: 30 },
      { carrier: 'courierpost', layout: '4x6_thermal', type: 'thermal', condition: 'clean', count: 25 },
      { carrier: 'nzpost', layout: '4x6_thermal', type: 'thermal', condition: 'clean', count: 20 },
      { carrier: 'posthaste', layout: 'satchel_ticket', type: 'thermal', condition: 'clean', count: 20 },
      { carrier: 'nzcouriers', layout: '4x6_thermal', type: 'thermal', condition: 'clean', count: 15 },
      { carrier: 'aramex', layout: '4x6_thermal', type: 'thermal', condition: 'clean', count: 10 },
      { carrier: 'courierpost', layout: '4x6_thermal', type: 'laser', condition: 'clean', count: 5 },
      { carrier: 'nzcouriers', layout: 'a4_laser_sheet', type: 'laser', condition: 'clean', count: 5 },
    ],
  },
  {
    id: 'courier_stationery',
    min: 55,
    synthetic: 60,
    founder: 8,
    measures: 'the labels the courier writes or prints on their own stationery',
    recipes: [
      { carrier: 'generic', layout: 'a4_dot_matrix', type: 'laser', condition: 'clean', count: 20 },
      { carrier: 'generic', layout: 'pouch_sticker', type: 'sticker', condition: 'clean', count: 15 },
      { carrier: 'courierpost', layout: 'a4_dot_matrix', type: 'laser', condition: 'clean', count: 10 },
      { carrier: 'posthaste', layout: 'satchel_ticket', type: 'thermal', condition: 'clean', count: 10 },
      { carrier: 'nzcouriers', layout: 'a4_dot_matrix', type: 'laser', condition: 'clean', count: 5 },
    ],
  },
  {
    id: 'international_parcels',
    min: 40,
    synthetic: 40,
    founder: 6,
    measures: 'the inbound parcels with a customs form and a foreign sender block',
    recipes: [
      { carrier: 'nzpost_international', layout: 'international_customs', type: 'laser', condition: 'clean', count: 12 },
      { carrier: 'dhl', layout: 'international_customs', type: 'laser', condition: 'clean', count: 10 },
      { carrier: 'fedex', layout: 'international_customs', type: 'laser', condition: 'clean', count: 8 },
      { carrier: 'ups', layout: 'international_customs', type: 'laser', condition: 'clean', count: 6 },
      { carrier: 'aramex', layout: 'international_customs', type: 'laser', condition: 'clean', count: 4 },
    ],
  },
  {
    id: 'handwriting',
    min: 35,
    synthetic: 40,
    founder: 4,
    measures: 'the dockets the courier writes by hand',
    recipes: [
      { carrier: 'generic', layout: 'handwritten_docket', type: 'handwritten', condition: 'clean', count: 25 },
      { carrier: 'posthaste', layout: 'handwritten_docket', type: 'handwritten', condition: 'clean', count: 10 },
      { carrier: 'courierpost', layout: 'handwritten_docket', type: 'handwritten', condition: 'clean', count: 5 },
    ],
  },
  {
    id: 'damaged_labels',
    min: 25,
    synthetic: 25,
    founder: 3,
    measures: 'the labels that have been through a real van: crumpled, faded, torn, over-stickered',
    recipes: [
      { carrier: 'courierpost', layout: '4x6_thermal', type: 'thermal', condition: 'crumpled', count: 7 },
      { carrier: 'nzpost', layout: 'nzpost_174x100', type: 'thermal', condition: 'thermal_fade', count: 5 },
      { carrier: 'posthaste', layout: 'satchel_ticket', type: 'thermal', condition: 'over_sticker', count: 4 },
      { carrier: 'courierpost', layout: '4x6_thermal', type: 'thermal', condition: 'torn', count: 4 },
      { carrier: 'nzcouriers', layout: '4x6_thermal', type: 'thermal', condition: 'crumpled', count: 3 },
      { carrier: 'generic', layout: 'pouch_sticker', type: 'sticker', condition: 'over_sticker', count: 2 },
    ],
  },
  {
    id: 'low_light',
    min: 20,
    synthetic: 20,
    founder: 2,
    measures: 'the van at dusk, the porch with a torch, the glare off a plastic sleeve',
    recipes: [
      { carrier: 'courierpost', layout: '4x6_thermal', type: 'thermal', condition: 'low_light', count: 8 },
      { carrier: 'nzpost', layout: '4x6_thermal', type: 'thermal', condition: 'low_light', count: 5 },
      { carrier: 'aramex', layout: '4x6_thermal', type: 'thermal', condition: 'glare', count: 3 },
      { carrier: 'generic', layout: 'a4_dot_matrix', type: 'laser', condition: 'low_light', count: 2 },
      { carrier: 'courierpost', layout: 'nzpost_174x100', type: 'thermal', condition: 'low_light', count: 2 },
    ],
  },
  {
    id: 'plastic_wrapping',
    min: 15,
    synthetic: 15,
    founder: 2,
    measures: 'the label under a plastic sleeve or a poly bag, with the glare that goes with it',
    recipes: [
      { carrier: 'courierpost', layout: '4x6_thermal', type: 'thermal', condition: 'plastic_sleeve', count: 6 },
      { carrier: 'posthaste', layout: 'satchel_ticket', type: 'thermal', condition: 'plastic_bag', count: 4 },
      { carrier: 'nzpost', layout: 'nzpost_174x100', type: 'laser', condition: 'plastic_sleeve', count: 3 },
      { carrier: 'generic', layout: 'pouch_sticker', type: 'sticker', condition: 'plastic_bag', count: 2 },
    ],
  },
];

// ------------------------------------------------------------- the catalogue

// Every field the scanner can be asked for. The scored ones are the address
// fields and the barcode; the rest are distractors the scanner has to ignore.
const FIELDS = [
  {
    id: 'address',
    scored: true,
    expected_format: '<number>[suffix] <street name> <street type>',
    example: '42B Main North Road',
    normalisation: ['case-fold', 'collapse the inner whitespace', 'drop the trailing punctuation'],
    acceptance:
      'the number, the street and the suburb must all equal the gold after normalisation; a transposed number is a miss; a wrong block is a miss whatever the string is',
    source: 'the printed recipient block',
  },
  {
    id: 'suburb',
    scored: true,
    expected_format: '<suburb name>',
    example: 'Richmond',
    normalisation: ['case-fold', 'collapse the inner whitespace', 'strip "Suburb:" and the punctuation'],
    acceptance: 'equal to the gold after normalisation; a suburb from the sender block is a miss',
    source: 'the printed recipient block',
  },
  {
    id: 'unit',
    scored: true,
    expected_format: '<unit number>, printed as "Unit 6", "Flat 6" or "6/12"',
    example: 'Unit 6',
    normalisation: ['case-fold', 'drop the "unit", "flat", "apartment" and "apt" words', 'keep the number'],
    acceptance:
      'equal to the gold after normalisation; a missing unit on a label that has one is a miss; a label without a unit is scored as "no unit", not as a miss',
    source: 'the printed recipient block',
  },
  {
    id: 'sender',
    scored: false,
    expected_format: '<business name> / <street> / <suburb>',
    example: 'Kea Outdoor / 12 Madras Street / Christchurch Central',
    normalisation: ['case-fold', 'collapse the inner whitespace'],
    acceptance:
      'not scored: the scanner is address-only (V4 section 10.2). The sender block is the wrong-block distractor, so it is annotated, never read',
    source: 'the printed sender block',
  },
  {
    id: 'receiver',
    scored: false,
    expected_format: '<role token> or a customer reference',
    example: 'RECEIVER',
    normalisation: ['case-fold'],
    acceptance:
      'not scored: the product returns the delivery address, never the name. The block is annotated so the classifier has to find it',
    source: 'the printed recipient block',
  },
  {
    id: 'barcode',
    scored: true,
    expected_format: 'the carrier barcode, linear or 2D, with the human-readable form under it',
    example: 'PE09999658',
    normalisation: ['strip the whitespace', 'upper-case'],
    acceptance:
      'the decoded payload must equal the gold; a 2D symbol must decode to the same payload as the human-readable form; a missing decode is a miss',
    source: 'the printed barcode',
  },
  {
    id: 'date',
    scored: true,
    expected_format: 'DD/MM/YYYY',
    example: '21/10/2026',
    normalisation: ['parse the date', 'compare as an ISO date (YYYY-MM-DD)'],
    acceptance: 'the same calendar day; a missing field is a miss',
    source: 'the printed despatch or print date',
  },
  {
    id: 'tracking',
    scored: true,
    expected_format: 'the carrier tracking or ticket number',
    example: 'LH1602541',
    normalisation: ['strip the whitespace', 'upper-case'],
    acceptance: 'equal to the gold after normalisation',
    source: 'the printed tracking number',
  },
  {
    id: 'weight',
    scored: true,
    expected_format: '<number> kg',
    example: '2.4 kg',
    normalisation: ['strip the unit', 'parse the number', 'compare in kilograms'],
    acceptance: 'the same weight in kilograms; a missing field is a miss',
    source: 'the printed weight',
  },
  {
    id: 'fragile',
    scored: true,
    expected_format: 'the word FRAGILE, or nothing',
    example: 'FRAGILE',
    normalisation: ['case-fold'],
    acceptance: 'the flag is present or it is not; a label without the flag is scored as "not fragile", not as a miss',
    source: 'the printed flag',
  },
];

// The carriers. Every row says where the fact came from and when it was read.
// A carrier we could not verify is kept in the catalogue with its status, and
// no label is generated for it.
const CARRIERS = [
  {
    id: 'courierpost',
    name: 'CourierPost (NZ Post)',
    verified: true,
    verification:
      'the label standard, the size and the layout rules: https://www.nzpost.co.nz/business/shipping-in-nz/labelling-standards (read 2026-10-21); the carrier id COURIERPOST and the address fields: the ParcelLabel API (read 2026-10-21)',
    symbology: 'gs1-128',
    symbology_note:
      'Code 128 is verified for the merchant barcode on an NZ Post label (the ParcelLabel API allows code128-A, code128-B and code128-C); the symbology of the carrier barcode itself is unverified',
    layout: 'nzpost_174x100',
    note: 'the courier service of NZ Post; the standard label is 174 mm by 100 mm, black typed font on white, the address block left aligned and marked To and From',
  },
  {
    id: 'nzpost',
    name: 'NZ Post (ParcelPost and PACE)',
    verified: true,
    verification:
      'the carrier ids COURIERPOST and PACE, the label sizes and the address fields: the ParcelLabel API (read 2026-10-21); the 2D data matrix on the labels: https://nz-post.canny.io/changelog/shipping-labels-new-2d-barcode (read 2026-10-21)',
    symbology: 'gs1-128',
    symbology_note:
      'the 2D data matrix is verified as a rollout (the changelog shows the 2x2 and the 4x4 symbol); the symbology of the carrier barcode itself is unverified',
    layout: '4x6_thermal',
    note: 'the network label; the ParcelLabel API lists the service codes (IWXOLP and the add-ons CPSR, CPOLRD, CPOLOED, CPOLSED, CPOLSAT, CPOLDG)',
  },
  {
    id: 'posthaste',
    name: 'Post Haste Couriers',
    verified: true,
    verification:
      'the ticket product code and the ticket number, the satchel sizes and the service names: https://www.posthaste.co.nz/tracktrace.html and https://posthaste.co.nz/ (read 2026-10-21)',
    symbology: 'gs1-128',
    symbology_note:
      'unverified: the track and trace page shows a barcode and asks for the numbers under it, but it does not name the symbology',
    layout: 'satchel_ticket',
    note: 'a courier with branches in Canterbury; the Express Pack Satchel comes in the SML, MED, LGE and XL sizes',
  },
  {
    id: 'nzcouriers',
    name: 'NZ Couriers',
    verified: true,
    verification:
      'the ticket product code and number, the charge label number and the international consignment number: https://nzcouriers.co.nz/tools/track-a-parcel/ (read 2026-10-21)',
    symbology: 'gs1-128',
    symbology_note: 'unverified: the page shows the barcode but does not name the symbology',
    layout: '4x6_thermal',
    note: 'a courier with an international desk; the examples on the tracking page are LH1602541, 03258847 and 521440236',
  },
  {
    id: 'aramex',
    name: 'Aramex New Zealand',
    verified: true,
    verification:
      'the electronic label (aramexConnect), the satchels, the Parcel Connect service and the Canterbury depot: https://www.aramex.co.nz/ and https://www.aramex.co.nz/tools/aramexconnect/ (read 2026-10-21)',
    symbology: 'gs1-128',
    symbology_note: 'unverified: the public pages do not name the symbology of the label barcode',
    layout: '4x6_thermal',
    note: 'the franchise courier with the Blu driver app; the labels are printed from aramexConnect',
  },
  {
    id: 'nzpost_international',
    name: 'NZ Post International (UPU)',
    verified: true,
    verification:
      'the UW parcel-reference prefix on the international labels: https://support.nzpost.co.nz/s/article/Why-doesn-t-my-New-Zealand-Post-international-tracking-number-show-any-tracking (read 2026-10-21)',
    symbology: 'gs1-128',
    symbology_note: 'unverified: the symbology of the international label barcode',
    layout: 'international_customs',
    note: 'the international mail and parcel service; the Economy labels carry a UW parcel reference that is not a trackable service',
  },
  {
    id: 'dhl',
    name: 'DHL',
    verified: false,
    verification:
      'named in the repo research (docs/research/2026/ocr-label-scanning.md, 2026-10-21) as a NZ carrier layout; the label format was not read today, so it is unverified',
    symbology: 'gs1-128',
    symbology_note: 'unverified',
    layout: 'international_customs',
    note: 'the label is drawn as a generic international carrier label; the founder must supply a real DHL label photo before the layout can be trusted',
  },
  {
    id: 'fedex',
    name: 'FedEx',
    verified: false,
    verification: 'unverified: no source was read for the label format; the layout is generic',
    symbology: 'gs1-128',
    symbology_note: 'unverified',
    layout: 'international_customs',
    note: 'the founder must supply a real FedEx label photo',
  },
  {
    id: 'ups',
    name: 'UPS',
    verified: false,
    verification: 'unverified: no source was read for the label format; the layout is generic',
    symbology: 'gs1-128',
    symbology_note: 'unverified',
    layout: 'international_customs',
    note: 'the founder must supply a real UPS label photo',
  },
  {
    id: 'team_k',
    name: 'Team-K Parcel',
    verified: false,
    verification:
      'unverified: a web search and a DuckDuckGo HTML search on 2026-10-21 found no New Zealand courier under this name. No label is generated for this carrier',
    symbology: 'gs1-128',
    symbology_note: 'unverified',
    layout: '4x6_thermal',
    note: 'the founder must confirm the carrier name and the label format before this carrier is used',
  },
  {
    id: 'generic',
    name: 'Unbranded courier label',
    verified: true,
    verification: 'our own layout: no carrier is named on it',
    symbology: 'gs1-128',
    symbology_note: 'the symbology is our choice for the drawing; a real label has to come from the founder',
    layout: '4x6_thermal',
    note: 'the courier stationery: a dot-matrix manifest, a pouch sticker and a handwritten docket',
  },
];

// The symbologies. The symbol facts come from GS1; the carrier-to-symbology
// mapping is marked per carrier above.
const SYMBOLOGIES = [
  {
    id: 'gs1-128',
    name: 'GS1-128 (Code 128)',
    symbol_id: ']C1',
    capacity: '48 alphanumeric',
    supports: 'all the GS1 keys, and the attributes',
    verified: true,
    source: 'https://www.gs1.org/standards/barcodes/1d-general-distribution (read 2026-10-21)',
  },
  {
    id: 'itf-14',
    name: 'ITF-14',
    symbol_id: ']I1',
    capacity: '14 numeric',
    supports: 'the GTIN only, no attributes',
    verified: true,
    source: 'https://www.gs1.org/standards/barcodes/1d-general-distribution (read 2026-10-21)',
  },
  {
    id: 'gs1-datamatrix',
    name: 'GS1 DataMatrix',
    symbol_id: ']d2',
    capacity: '3116 numeric, 2335 alphanumeric',
    supports: 'the GS1 element string syntax, all the keys and the attributes',
    verified: true,
    source: 'https://www.gs1.org/barcodes/2d (read 2026-10-21)',
  },
  {
    id: 'qr',
    name: 'QR Code (GS1 Digital Link URI)',
    symbol_id: ']Q1',
    capacity: '7089 numeric, 4296 alphanumeric',
    supports: 'the GS1 Digital Link URI syntax, all the keys and the attributes',
    verified: true,
    source: 'https://www.gs1.org/barcodes/2d (read 2026-10-21)',
  },
  {
    id: 'pdf417',
    name: 'PDF417',
    symbol_id: 'n/a',
    capacity: 'not read',
    supports: 'not read',
    verified: false,
    source:
      'unverified: the GS1 2D page (read 2026-10-21) says GS1 has standards for five 2D barcodes but the page we read names QR Code and GS1 DataMatrix only. No PDF417 label is drawn',
  },
];

// The layouts. The sizes are the ones the carriers publish; the rest are ours.
const LAYOUTS = [
  { id: 'nzpost_174x100', name: 'NZ Post standard label', width_mm: 174, height_mm: 100, verified: true, source: 'the NZ Post labelling standards (read 2026-10-21): the ideal label size is 174 mm by 100 mm' },
  { id: '4x6_thermal', name: '4x6 thermal label', width_mm: 152, height_mm: 102, verified: false, source: 'unverified: the 4x6 thermal is named in the repo research; the exact size was not read from a carrier' },
  { id: 'a4_dot_matrix', name: 'A4 dot-matrix manifest', width_mm: 297, height_mm: 210, verified: false, source: 'unverified: the dot-matrix manifest is our own stationery' },
  { id: 'a4_laser_sheet', name: 'A4 laser shipping sheet', width_mm: 210, height_mm: 297, verified: false, source: 'unverified: the laser sheet is our own stationery' },
  { id: 'pouch_sticker', name: 'Pouch sticker', width_mm: 100, height_mm: 50, verified: false, source: 'unverified: the pouch sticker is our own stationery' },
  { id: 'satchel_ticket', name: 'Pre-paid satchel ticket', width_mm: 102, height_mm: 76, verified: false, source: 'unverified: the ticket shape is ours; the Post Haste Express Pack Satchel sizes (SML, MED, LGE, XL) are verified' },
  { id: 'handwritten_docket', name: 'Handwritten docket', width_mm: 150, height_mm: 100, verified: false, source: 'unverified: the docket is our own stationery' },
  { id: 'international_customs', name: 'International customs declaration', width_mm: 210, height_mm: 148, verified: false, source: 'unverified: the customs form layout is generic' },
];

// The privacy rules. The set never holds a name of a real person, so the
// check can enforce it mechanically.
const PRIVACY = {
  rule: 'No personal data in this repository. The synthetic labels carry no name of a real person, no real phone number, no real email address and no customer reference. The real photos are redacted before use and are never committed.',
  receiver_tokens: ['RECEIVER', 'RECIPIENT', 'CONSIGNEE', 'DELIVER TO', 'TO', 'CUSTOMER', 'DELIVERY CARE', 'C/O DELIVERY'],
  senders: [
    'Kea Outdoor',
    'South Island Supply Co',
    'Harbour Goods Ltd',
    'Fernway Online',
    'Aotearoa Trade',
    'Willow Lane Retail',
    'Kea Outdoor Ltd',
    'Southern Freight',
    'Tuatara Home',
    'River Road Traders',
  ],
  foreign_senders: [
    'Haiyan Trading Co\n88 Jianguo Road\nShanghai, CHINA',
    'Pacific Rim Electronics\n22 Harbour Street\nSingapore, SINGAPORE',
    'Seongjin Wholesale\n45 Sejong-daero\nSeoul, KOREA',
    'Nordlicht Import\n7 Hafenstrasse\nHamburg, GERMANY',
    'Sakura Trading\n3-12 Chuo\nOsaka, JAPAN',
  ],
  phone: '00 000 0000',
  email_domain: 'example.invalid',
  customer_reference_prefix: 'CUST ',
  note: 'the address itself is public LINZ address-point data (the street name, the house number and the suburb); no name, no phone number and no email address of a real person is attached to it anywhere in this set',
};

// The licence ledger. The sha256 column pins the artefact: the generator for
// our own images, the address pool for the LINZ data.
const LICENCES = [
  {
    licence_id: 'LIC-OURS-SYNTH',
    source: 'this project (no third-party material in the drawing code)',
    artefact_or_corpus: 'the synthetic label images (SVG) and the ground truth in labels.jsonl',
    licence: 'ours - we hold the copyright; the street names inside the labels carry the LINZ attribution below',
    date_read: ANCHOR,
    evidence_url: GENERATOR,
    sha256: 'generator',
    obligations: 'none for the drawing itself; the LINZ attribution has to travel with the address data',
    decision: 'shippable',
  },
  {
    licence_id: 'LIC-LINZ-ADDR',
    source: 'LINZ Data Service (layer 123113: Christchurch, Waimakariri, Selwyn)',
    artefact_or_corpus: 'the street names, the house numbers, the towns and the suburbs on the labels',
    licence: 'CC BY 4.0 (Crown copyright administered by LINZ)',
    date_read: ANCHOR,
    evidence_url: 'https://www.linz.govt.nz/products-services/data/licensing-and-using-data/attributing-linz-data',
    sha256: 'address-pool',
    obligations: 'attribute the data: "Sourced from the LINZ Data Service and licensed for reuse under the CC BY 4.0 licence"',
    decision: 'shippable',
  },
  {
    licence_id: 'LIC-FOUNDER-PHOTOS',
    source: 'the founder (the phone camera of a courier on a run)',
    artefact_or_corpus: 'the redacted label photos; they live in the founder store, outside this repository',
    licence: 'the consent of the photographer and of the people whose addresses are on the labels - to be recorded by the founder',
    date_read: ANCHOR,
    evidence_url: 'none yet - the consent register lives in the founder store, outside the repository',
    sha256: 'not yet known - no photo has been supplied',
    obligations: 'redact before any use, a second person checks the redaction, never commit a raw photo, delete the personal data when the evaluation is finished',
    decision: 'pending-founder',
  },
  {
    licence_id: 'LIC-GS1-SYMBOLOGIES',
    source: 'GS1',
    artefact_or_corpus: 'the symbology facts in fields.json (GS1-128, ITF-14, GS1 DataMatrix, QR Code)',
    licence: 'n/a - a published standard; the facts are cited and no code is copied',
    date_read: ANCHOR,
    evidence_url: 'https://www.gs1.org/standards/barcodes',
    sha256: 'n/a',
    obligations: 'cite GS1 wherever a symbology is described',
    decision: 'reference-only',
  },
  {
    licence_id: 'LIC-NZPOST-STANDARDS',
    source: 'NZ Post',
    artefact_or_corpus: 'the label standard: the size, the font, the To and From marking and the left aligned address block',
    licence: 'n/a - a public web page; the facts are cited and nothing is copied verbatim',
    date_read: ANCHOR,
    evidence_url: 'https://www.nzpost.co.nz/business/shipping-in-nz/labelling-standards',
    sha256: 'n/a',
    obligations: 'cite NZ Post wherever the label layout is described',
    decision: 'reference-only',
  },
  {
    licence_id: 'LIC-NZPOST-API',
    source: 'NZ Post (the ParcelLabel API)',
    artefact_or_corpus: 'the carrier ids, the merchant barcode formats, the address fields and the service codes',
    licence: 'n/a - public API documentation',
    date_read: ANCHOR,
    evidence_url:
      'https://anypoint.mulesoft.com/exchange/portals/nz-post-group/b8271f09-2ad8-4e1c-b6b1-322c5727d148/parcellabel-api/minor/2.0/pages/Create%20Label(s)%20-%20Domestic/',
    sha256: 'n/a',
    obligations: 'cite the API documentation',
    decision: 'reference-only',
  },
  {
    licence_id: 'LIC-POSTHASTE-REF',
    source: 'Post Haste Couriers',
    artefact_or_corpus: 'the ticket product code and number, the satchel sizes and the service names',
    licence: 'n/a - a public web page',
    date_read: ANCHOR,
    evidence_url: 'https://www.posthaste.co.nz/tracktrace.html',
    sha256: 'n/a',
    obligations: 'cite Post Haste',
    decision: 'reference-only',
  },
  {
    licence_id: 'LIC-NZCOURIERS-REF',
    source: 'NZ Couriers',
    artefact_or_corpus: 'the ticket number, the charge label number and the international consignment number formats',
    licence: 'n/a - a public web page',
    date_read: ANCHOR,
    evidence_url: 'https://nzcouriers.co.nz/tools/track-a-parcel/',
    sha256: 'n/a',
    obligations: 'cite NZ Couriers',
    decision: 'reference-only',
  },
  {
    licence_id: 'LIC-ARAMEX-REF',
    source: 'Aramex New Zealand',
    artefact_or_corpus: 'the electronic label, the satchels and the Parcel Connect service',
    licence: 'n/a - a public web page',
    date_read: ANCHOR,
    evidence_url: 'https://www.aramex.co.nz/tools/aramexconnect/',
    sha256: 'n/a',
    obligations: 'cite Aramex',
    decision: 'reference-only',
  },
  {
    licence_id: 'LIC-NZPOST-INTL-REF',
    source: 'NZ Post (Customer Care)',
    artefact_or_corpus: 'the UW parcel-reference prefix on the international labels',
    licence: 'n/a - a public support page',
    date_read: ANCHOR,
    evidence_url:
      'https://support.nzpost.co.nz/s/article/Why-doesn-t-my-New-Zealand-Post-international-tracking-number-show-any-tracking',
    sha256: 'n/a',
    obligations: 'cite NZ Post',
    decision: 'reference-only',
  },
  {
    licence_id: 'LIC-TEAMK-UNVERIFIED',
    source: 'no source found',
    artefact_or_corpus: 'the Team-K Parcel label layout',
    licence: 'unverified - a web search and a DuckDuckGo HTML search on 2026-10-21 found no New Zealand courier under this name',
    date_read: ANCHOR,
    evidence_url: 'none',
    sha256: 'n/a',
    obligations: 'the founder has to confirm the carrier name and the label format before any Team-K label is drawn',
    decision: 'unverified-not-used',
  },
];

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

const random = mulberry32(SEED);
const pick = (list) => list[Math.floor(random() * list.length)];
const between = (low, high) => low + random() * (high - low);
const round2 = (value) => Math.round(value * 100) / 100;

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

async function readAddresses(file, limit) {
  const rows = [];
  if (!existsSync(file)) {
    return rows;
  }
  const reader = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  for await (const line of reader) {
    if (!line.trim()) continue;
    let row = null;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }
    if (row.number && row.road && row.suburb) {
      rows.push({
        id: String(row.id),
        number: String(row.number),
        suffix: row.suffix ?? null,
        unit: row.unit ?? null,
        road: String(row.road),
        suburb: String(row.suburb),
        town: String(row.town ?? ''),
      });
    }
    if (rows.length >= limit) break;
  }
  return rows;
}

// The address pool: the real LINZ address points, spread over the suburbs, with
// a mix of the plain numbers, the lettered numbers (42B) and the unit numbers.
async function buildAddressPool(size) {
  const files = [
    'addresses-christchurch.jsonl',
    'addresses-waimakariri.jsonl',
    'addresses-selwyn.jsonl',
  ];
  const raw = [];
  for (const file of files) {
    raw.push(...(await readAddresses(join(LINZ, file), 6000)));
  }
  if (raw.length === 0) {
    return [];
  }

  const bySuburb = new Map();
  for (const row of raw) {
    if (!bySuburb.has(row.suburb)) {
      bySuburb.set(row.suburb, { unit: [], suffix: [], plain: [] });
    }
    const bucket = bySuburb.get(row.suburb);
    if (row.unit) bucket.unit.push(row);
    else if (row.suffix) bucket.suffix.push(row);
    else bucket.plain.push(row);
  }
  const suburbs = [...bySuburb.keys()].sort();
  const order = ['unit', 'suffix', 'plain'];
  const cursors = { unit: 0, suffix: 0, plain: 0 };
  const pool = [];
  let turn = 0;
  while (pool.length < size && suburbs.length > 0) {
    for (const suburb of suburbs) {
      const bucket = bySuburb.get(suburb);
      const kind = order[turn % order.length];
      const list = bucket[kind];
      if (list.length > 0) {
        const row = list[cursors[kind] % list.length];
        cursors[kind] += 1;
        pool.push(row);
      }
      if (pool.length >= size) break;
    }
    turn += 1;
  }
  return pool;
}

// The barcode and the tracking value per carrier. The pattern follows the
// example the carrier publishes where there is one; the value itself is ours.
const BARCODE_RULES = {
  courierpost: { prefix: 'CP', digits: 10, format: 'CP + 10 digits', verified: false, note: 'the CourierPost tracking number format is unverified' },
  nzpost: { prefix: 'NP', digits: 10, format: 'NP + 10 digits', verified: false, note: 'the ParcelPost tracking number format is unverified' },
  posthaste: { prefix: 'PE', digits: 8, format: '<product code> + 8 digits, for example PE 09999658', verified: true, note: 'the product code and the ticket number are verified on the track and trace page' },
  nzcouriers: { prefix: 'LH', digits: 7, format: '<product code> + 7 digits, for example LH1602541', verified: true, note: 'the ticket number is verified on the tracking page' },
  aramex: { prefix: 'ARX', digits: 9, format: 'ARX + 9 digits', verified: false, note: 'the Aramex tracking number format is unverified' },
  nzpost_international: { prefix: 'UW', digits: 9, format: 'UW + 9 digits', verified: false, note: 'the UW parcel-reference prefix is verified; the length is unverified' },
  dhl: { prefix: 'DHL', digits: 10, format: 'DHL + 10 digits', verified: false, note: 'unverified' },
  fedex: { prefix: 'FDX', digits: 10, format: 'FDX + 10 digits', verified: false, note: 'unverified' },
  ups: { prefix: '1Z', digits: 12, format: '1Z + 12 digits', verified: false, note: 'unverified' },
  generic: { prefix: 'CC', digits: 10, format: 'CC + 10 digits', verified: false, note: 'our own ticket numbers' },
};

const SERVICE_NAMES = {
  courierpost: ['COURIERPOST', 'COURIERPOST', 'CPOLP'],
  nzpost: ['PARCELPOST', 'PACE'],
  posthaste: ['EXPRESS PACK SATCHEL', 'COURIER TICKET'],
  nzcouriers: ['COURIER TICKET', 'CHARGE LABEL'],
  aramex: ['DOMESTIC COURIER', 'SATCHEL'],
  nzpost_international: ['INTERNATIONAL ECONOMY', 'INTERNATIONAL COURIER'],
  dhl: ['EXPRESS WORLDWIDE', 'ECONOMY SELECT'],
  fedex: ['INTERNATIONAL PRIORITY', 'ECONOMY'],
  ups: ['UPS STANDARD', 'UPS EXPRESS'],
  generic: ['PARCEL', 'COURIER'],
};

// The size class the intake contract asks for (services/api/app/prompts.py).
function sizeClass(weightKg) {
  if (weightKg < 1) return 'satchel';
  if (weightKg < 3) return 'small';
  if (weightKg < 8) return 'medium';
  if (weightKg < 20) return 'large';
  return 'heavy';
}

// The fields each layout prints. The unit, the weight and the fragile flag
// are not on every label.
const LAYOUT_FIELDS = {
  nzpost_174x100: ['sender', 'receiver', 'address', 'suburb', 'unit', 'barcode', 'tracking', 'date', 'weight'],
  '4x6_thermal': ['sender', 'receiver', 'address', 'suburb', 'unit', 'barcode', 'tracking', 'date'],
  a4_dot_matrix: ['sender', 'receiver', 'address', 'suburb', 'unit', 'barcode', 'tracking', 'date', 'weight', 'fragile'],
  a4_laser_sheet: ['sender', 'receiver', 'address', 'suburb', 'unit', 'barcode', 'tracking', 'date', 'weight'],
  pouch_sticker: ['receiver', 'address', 'suburb', 'barcode', 'tracking'],
  satchel_ticket: ['sender', 'receiver', 'address', 'suburb', 'barcode', 'tracking', 'date', 'weight'],
  handwritten_docket: ['receiver', 'address', 'suburb', 'date'],
  international_customs: ['sender', 'receiver', 'address', 'suburb', 'unit', 'barcode', 'tracking', 'date', 'weight', 'fragile'],
};

const CONDITION_DIFFICULTY = {
  clean: 'easy',
  low_light: 'medium',
  glare: 'medium',
  crumpled: 'hard',
  thermal_fade: 'hard',
  over_sticker: 'hard',
  torn: 'hard',
  plastic_sleeve: 'medium',
  plastic_bag: 'medium',
};

const HANDWRITTEN_DIFFICULTY = 'hard';

function difficultyFor(recipe) {
  if (recipe.type === 'handwritten') return HANDWRITTEN_DIFFICULTY;
  if (recipe.layout === 'a4_dot_matrix') return 'medium';
  return CONDITION_DIFFICULTY[recipe.condition] ?? 'medium';
}

function dateBeforeAnchor(days) {
  const anchor = new Date(`${ANCHOR}T00:00:00Z`);
  anchor.setUTCDate(anchor.getUTCDate() - days);
  return anchor.toISOString().slice(0, 10);
}

function nzDate(iso) {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

// The unit on the label. The address unit number comes from LINZ; the way it
// is written on the label is ours.
const UNIT_FORMS = ['Unit {n}', 'Flat {n}'];

function unitText(unitNumber) {
  const form = pick(UNIT_FORMS);
  return form.replace('{n}', unitNumber);
}

// ------------------------------------------------------------- the manifest

mkdirSync(OUT, { recursive: true });

const pool = await buildAddressPool(400);
if (pool.length === 0) {
  console.error(
    'the scanner eval set needs the LINZ address extract in data/linz/ (layer 123113: Christchurch, Waimakariri, Selwyn). It is not committed; see docs/decisions/DECISIONS.md D19.',
  );
  process.exit(1);
}

const labels = [];
let labelNumber = 0;

for (const slice of SLICES) {
  for (const recipe of slice.recipes) {
    for (let index = 0; index < recipe.count; index += 1) {
      labelNumber += 1;
      const id = `L${String(labelNumber).padStart(4, '0')}`;
      const address = pool[(labelNumber - 1) % pool.length];
      const carrier = CARRIERS.find((entry) => entry.id === recipe.carrier);
      const rules = BARCODE_RULES[recipe.carrier];

      const number = address.suffix ? `${address.number}${address.suffix}` : address.number;
      const street = address.road;
      const suburb = address.suburb;
      const hasUnit = Boolean(address.unit) && LAYOUT_FIELDS[recipe.layout].includes('unit');
      const weightKg = round2(between(0.2, 24));
      const barcode = `${rules.prefix}${String(Math.floor(random() * 10 ** rules.digits)).padStart(rules.digits, '0')}`;
      const tracking = recipe.layout === 'pouch_sticker' ? barcode : `${rules.prefix}${String(Math.floor(random() * 10 ** rules.digits)).padStart(rules.digits, '0')}`;
      const despatchDate = dateBeforeAnchor((labelNumber * 7) % 21);
      const international = recipe.layout === 'international_customs';
      const sender = international
        ? pick(PRIVACY.foreign_senders)
        : `${pick(PRIVACY.senders)}\n${Math.floor(between(1, 120))} ${pick(pool).road}\n${pick(pool).suburb}`;
      const receiver = pick(PRIVACY.receiver_tokens);
      const fragile = recipe.layout === 'a4_dot_matrix' || recipe.layout === 'international_customs' ? random() < 0.18 : false;

      const fields = LAYOUT_FIELDS[recipe.layout].filter((field) => {
        if (field === 'unit') return hasUnit;
        if (field === 'weight') return recipe.layout !== '4x6_thermal' && random() < 0.7;
        if (field === 'fragile') return fragile;
        return true;
      });

      const truth = {
        address: `${number} ${street}`,
        suburb,
        unit: hasUnit ? unitText(address.unit) : null,
        sender,
        receiver,
        barcode,
        date: nzDate(despatchDate),
        tracking,
        weight: `${weightKg.toFixed(2)} kg`,
        fragile,
      };

      labels.push({
        id,
        slice: slice.id,
        carrier: recipe.carrier,
        carrier_verified: carrier.verified,
        label_type: recipe.type,
        layout: recipe.layout,
        condition: recipe.condition,
        fields,
        ground_truth: {
          fields: Object.fromEntries(fields.map((field) => [field, truth[field]])),
          address_parse: {
            raw: hasUnit ? `${truth.unit}, ${truth.address}, ${suburb}` : `${truth.address}, ${suburb}`,
            unit: hasUnit ? address.unit : null,
            number,
            street,
            suburb,
            city: address.town,
            size_class: sizeClass(weightKg),
            linz_address_id: address.id,
          },
          barcode_symbology: carrier.symbology,
          barcode_format: rules.format,
          barcode_format_verified: rules.verified,
          expected_block: 'recipient',
          blocks: [
            { role: 'sender', present: true },
            { role: 'recipient', present: true },
            { role: 'barcode', present: true },
          ],
          annotated_by: 'generator',
        },
        expected_block: 'recipient',
        difficulty: difficultyFor(recipe),
        source: 'synthetic',
        licence_id: 'LIC-OURS-SYNTH',
        content_licence_ids: ['LIC-LINZ-ADDR'],
        read_time_budget_s: READ_BUDGET_S,
        image_path: `data/labels/synthetic/${id}.svg`,
        status: 'ready',
      });
    }
  }
}

// The slots that wait on the founder's photos. They are in the manifest so the
// plan is on the record, and they carry no ground truth: nobody has looked at
// a photo yet.
const FOUNDER_BRIEFS = {
  courier_labels: 'the thermal labels off a real van: the four carriers you actually see in Christchurch, one label per parcel, photographed in daylight on the parcel itself',
  courier_stationery: 'the labels on your own stationery: the dot-matrix manifest, the pouch sticker and the pre-paid satchel ticket',
  international_parcels: 'the inbound international parcels with a customs form, including one from DHL, FedEx and UPS if you have them',
  handwriting: 'the dockets you write by hand, on the paper you actually use',
  damaged_labels: 'the labels that have been through a van: crumpled, torn, faded, or with another label stuck on top',
  low_light: 'the same labels photographed in the van at dusk and at the door under a torch',
  plastic_wrapping: 'the labels under a plastic sleeve or a poly bag, with the glare that goes with them',
};

for (const slice of SLICES) {
  for (let index = 0; index < slice.founder; index += 1) {
    labelNumber += 1;
    const id = `L${String(labelNumber).padStart(4, '0')}`;
    labels.push({
      id,
      slice: slice.id,
      carrier: 'founder_to_confirm',
      carrier_verified: false,
      label_type: 'founder_to_confirm',
      layout: 'founder_to_confirm',
      condition: 'clean',
      fields: null,
      ground_truth: null,
      expected_block: 'recipient',
      difficulty: 'unknown',
      source: 'redacted_photo',
      licence_id: 'LIC-FOUNDER-PHOTOS',
      content_licence_ids: ['LIC-FOUNDER-PHOTOS'],
      read_time_budget_s: READ_BUDGET_S,
      image_path: `data/labels/redacted/${id}.jpg`,
      status: 'awaiting_founder',
      brief: FOUNDER_BRIEFS[slice.id],
      needs: [
        'the photo, redacted: the names, the phone numbers, the email addresses and the customer references blanked or replaced with the same-category placeholder',
        'the ground truth: the delivery address as printed, the carrier, the label type and the condition',
        'the consent record: who took the photo, and the permission to use it in the evaluation set',
      ],
    });
  }
}

writeFileSync(join(OUT, 'labels.jsonl'), `${labels.map((label) => JSON.stringify(label)).join('\n')}\n`);

// ---------------------------------------------------------------- the slices

const sliceSummary = SLICES.map((slice) => {
  const rows = labels.filter((label) => label.slice === slice.id);
  return {
    id: slice.id,
    min: slice.min,
    target: slice.synthetic,
    synthetic: rows.filter((label) => label.source === 'synthetic').length,
    founder_slots: rows.filter((label) => label.source !== 'synthetic').length,
    status: 'synthetic ready, the founder photos are pending',
    measures: slice.measures,
  };
});

const syntheticTotal = labels.filter((label) => label.source === 'synthetic').length;
const founderTotal = labels.filter((label) => label.source !== 'synthetic').length;
const minTotal = SLICES.reduce((total, slice) => total + slice.min, 0);

const slices = {
  generated: ANCHOR,
  generator: 'scripts/eval/build-scanner-eval.mjs',
  seed: SEED,
  requirement: 'V4 section 10.2: at least 300 real-style NZ courier label images',
  floor_total: FLOOR_TOTAL,
  min_total: minTotal,
  labels_total: labels.length,
  synthetic_total: syntheticTotal,
  founder_slots: founderTotal,
  read_time_budget_s: READ_BUDGET_S,
  counts_note:
    'the floor counts the synthetic labels we can measure on today; the founder slots are counted separately and never make the floor on their own',
  slices: sliceSummary,
};
writeFileSync(join(OUT, 'slices.json'), `${JSON.stringify(slices, null, 2)}\n`);

// -------------------------------------------------------- the field catalogue

const fields = {
  generated: ANCHOR,
  generator: 'scripts/eval/build-scanner-eval.mjs',
  contract: {
    source: 'services/api/app/prompts.py (the INGEST_EXTRACT prompt)',
    note: 'the intake contract reads raw, unit, number, street, suburb, size_class and barcode out of a label; the scanner is address-only (V4 section 10.2), so the sender, the names, the phone numbers and the marketing are distractors and are annotated, not scored',
  },
  fields: FIELDS,
  address_format: {
    lines: [
      '<unit> - optional, printed on its own line above the street line (Unit 6, Flat 6, 6/12)',
      '<number>[suffix] <street name> <street type> - the street line (42B Main North Road)',
      '<suburb> - the suburb (Richmond)',
      '<town> <postcode> - optional, on some carriers',
    ],
    examples: ['42B Main North Road\nRichmond', 'Unit 6\n12 Durham Street South\nPapanui'],
    note: 'the shape the address engine in packages/nz-address parses; the street type is compared on the long form (the table in packages/nz-address/src/constants.ts), a macron is significant, and the suburb is never guessed from the street name',
    source: 'the NZ Post labelling standards ask for one block of text, left aligned, with the sender and the receiver marked (To and From); the shape above is the shape our own parser reads',
  },
  normalisation: {
    global: [
      'case-fold the text',
      'collapse the runs of whitespace into one space',
      'strip the leading and trailing punctuation',
      'never change a macron: the Maori place names are significant',
    ],
    street_types:
      'the street type is compared on the long form, using the table in packages/nz-address/src/constants.ts (Rd is Road, St is Street, Tce is Terrace and so on)',
    unit: 'the words unit, flat, apartment and apt are dropped; the number is what is compared',
    date: 'the printed date is parsed and compared as an ISO calendar day',
    weight: 'the printed weight is parsed and compared in kilograms',
    tracking_and_barcode: 'the whitespace is stripped and the text is upper-cased',
  },
  acceptance: {
    address:
      'the address counts as read when the number, the street and the suburb all equal the gold after the normalisation, and the block that was read is the recipient block',
    wrong_block:
      'a read of the sender block, of the marketing or of the barcode text is a wrong-block failure, whatever the string is; the sender block looks exactly like an address, which is the point of the slice',
    unit: 'a label without a unit is scored as "no unit"; a label with a unit and no unit read is a miss',
    barcode: 'the decoded payload has to equal the gold; a 2D symbol that decodes to the same payload as the human-readable form counts as read',
    partial: 'a field that is on the label but was not read is a miss for that field; it never makes the address read',
    no_guessing: 'a field that cannot be read is null, never a guess (the same rule as the intake contract)',
  },
  carriers: CARRIERS,
  symbologies: SYMBOLOGIES,
  layouts: LAYOUTS,
  label_types: [
    {
      id: 'thermal',
      name: 'Thermal label',
      look: 'printed on a thermal printer: the letters are dark on a warm off-white paper, the edges of the letters are soft, and the print fades to pale grey after a week in the sun',
      note: 'the everyday courier label',
    },
    {
      id: 'laser',
      name: 'Laser-printed label',
      look: 'printed on a laser printer: crisp letter edges, a true black toner on a white background, no dot pattern, and the toner cracks where the paper has been folded, so a crease through a line of text leaves that line unreadable',
      note: 'the reprint from a desktop printer and the courier own stationery',
    },
    {
      id: 'handwritten',
      name: 'Handwritten docket',
      look: 'written by the courier in ballpoint: uneven baselines, the letters joined, the pen pressure changing across a line',
      note: 'the synthetic ones are drawn in a script font with a per-character jitter; they are not scans of handwriting',
    },
    {
      id: 'sticker',
      name: 'Sticker',
      look: 'a small adhesive label: a thin die-cut border, a small print area, often rubbed at one corner where it was pulled off a parcel',
      note: 'the pouch sticker and the small ticket',
    },
  ],
  conditions: [
    { id: 'clean', name: 'Clean', note: 'flat, dry, in good light' },
    { id: 'low_light', name: 'Low light', note: 'the van at dusk, the porch at night' },
    { id: 'glare', name: 'Glare', note: 'a reflection across the label' },
    { id: 'crumpled', name: 'Crumpled', note: 'the label has been folded or crushed' },
    { id: 'thermal_fade', name: 'Thermal fade', note: 'the thermal print has gone pale' },
    { id: 'over_sticker', name: 'Over-sticker', note: 'another label or a piece of tape is stuck over part of it' },
    { id: 'torn', name: 'Torn', note: 'the edge of the label is missing' },
    { id: 'plastic_sleeve', name: 'Plastic sleeve', note: 'the label is under a clear sleeve' },
    { id: 'plastic_bag', name: 'Plastic bag', note: 'the label is under a poly bag' },
  ],
  barcode_rules: BARCODE_RULES,
  service_names: SERVICE_NAMES,
  privacy: PRIVACY,
  verification: {
    read_on: ANCHOR,
    method: 'every carrier, symbology and label fact was read from the source in the ledger, or it is marked unverified',
    verified_carriers: CARRIERS.filter((carrier) => carrier.verified).map((carrier) => carrier.id),
    unverified_carriers: CARRIERS.filter((carrier) => !carrier.verified).map((carrier) => carrier.id),
    note: 'the barcode the drawing puts on the label is a deterministic pattern, not a scannable symbol: the barcode read rate is measured on the founder photos and on a barcode-accurate renderer, not on the synthetic drawings',
  },
};
writeFileSync(join(OUT, 'fields.json'), `${JSON.stringify(fields, null, 2)}\n`);

// ------------------------------------------------------------ the ledger

function csvCell(value) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

const ledgerRows = LICENCES.map((row) => {
  const sha =
    row.sha256 === 'generator'
      ? sha256(existsSync(GENERATOR) ? readFileSync(GENERATOR, 'utf8') : '')
      : row.sha256 === 'address-pool'
        ? sha256(pool.map((row2) => `${row2.id}|${row2.number}|${row2.suffix ?? ''}|${row2.unit ?? ''}|${row2.road}|${row2.suburb}|${row2.town}`).join('\n'))
        : row.sha256;
  return [row.licence_id, row.source, row.artefact_or_corpus, row.licence, row.date_read, row.evidence_url, sha, row.obligations, row.decision];
});

const ledgerHeader = ['licence_id', 'source', 'artefact_or_corpus', 'licence', 'date_read', 'evidence_url', 'sha256', 'obligations', 'decision'];
writeFileSync(
  join(OUT, 'licence.csv'),
  `${[ledgerHeader, ...ledgerRows].map((row) => row.map(csvCell).join(',')).join('\n')}\n`,
);

console.log(
  `scanner eval: ${labels.length} slots (${syntheticTotal} synthetic, ${founderTotal} for the founder), ${SLICES.length} slices, floor ${FLOOR_TOTAL}, slice minimums ${minTotal}`,
);
