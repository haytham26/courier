# The scanner evaluation set

**Area:** V4 §10.2 (the scanner squad) — the measurement of the label scanner.
**Owner:** the scanner squad (`docs/squads/scanner/`).

## What is here

The set measures what a courier's phone reads off a parcel label in a van: the
delivery address, the tracking number, the barcode. The scoring contract (the
metrics M1–M8, the acceptance counts and the field rules) is in
`manifest/fields.json`.

```
manifest/
  labels.jsonl   370 label slots: 330 synthetic labels with their ground truth
                 and their image path, plus 40 slots that wait on the founder
  slices.json    the slice ids, the counts, the minimums and the status
  fields.json    the field catalogue: the expected format per field, the
                 normalisation rules, the acceptance rules, the carriers, the
                 symbologies and the label layouts
  licence.csv    every source behind the set: what it is, its licence, the date
                 the licence was read, the evidence link and the decision
```

The **images are not in the repository**. The label photos may hold personal
data, so they are redacted before use and never committed. The synthetic
labels are drawn from this manifest into `data/labels/synthetic/` (gitignored)
by `scripts/data/generate-synthetic-labels.mjs`, and the ground truth is written
next to the images so the two cannot drift apart.

## What the set measures

The scanner is address-only: it returns the delivery address and ignores the
sender, the names, the phone numbers and the marketing (V4 §10.2).

| # | Metric | What it counts | Target |
|---|---|---|---|
| M1 | **Recipient address accuracy** | the share of labels where the address returned, after the D8 correction against LINZ, is the gold recipient address | ≥ 97 % |
| M2 | **Wrong-block rate** | the share of labels where the block returned is the sender (or another non-recipient block) | ≤ 1 % |
| M3 | **Address read rate** | the share of labels where a recipient address came back at all (not "no address on this label") | ≥ 99 % |
| M4 | **Barcode read rate** | the share of labels where the barcode decoded, per symbology | report per symbology; the gate is on the founder photos |
| M5 | **Field accuracy** | the accuracy per field: address, suburb, unit, tracking, date, weight, fragile | report per field and per slice |
| M6 | **Reading time** | capture → the address returned, p50 and p95 per slice | p95 ≤ 1.5 s on a mid-range Android |
| M7 | **Time to first stable capture** | how long the auto-capture gate takes to settle, and how often it fires on a blurred frame | report; it must not fire on a blurred frame |
| M8 | **Character accuracy** | `ocr_char_accuracy` on the recipient block and on the sender block separately (the classifier's failure mode) | report |

M1, M2 and M6 are the release gate (`docs/squads/scanner/README.md`). M3, M4,
M5, M7 and M8 are published with every run: they say **where** the engine fails,
not only whether it passes.

## The slices

| slice | labels | what it measures |
|---|---|---|
| `courier_labels` | 130 | the everyday thermal labels: CourierPost, NZ Post, Post Haste, NZ Couriers, Aramex, on the 4×6 and on the 174 × 100 standard |
| `courier_stationery` | 60 | the labels on the courier's own stationery: the dot-matrix docket, the pouch sticker, the pre-paid satchel ticket |
| `international_parcels` | 40 | the inbound parcels with a customs form and a foreign sender block |
| `handwriting` | 40 | the dockets the courier writes by hand |
| `damaged_labels` | 25 | the labels that have been through a real van: crumpled, faded, torn, over-stickered |
| `low_light` | 20 | the van at dusk, the porch with a torch, the glare off a sleeve |
| `plastic_wrapping` | 15 | the label under a plastic sleeve or a poly bag |

**330 synthetic labels** and **40 slots for the founder's photos**.

The floor is **300 labels** (V4 §10.2: at least 300 real-style NZ courier label
images). The floor counts the labels we can measure on today — the synthetic
ones. The founder slots are counted separately and never make the floor on their
own, so the set cannot claim a number it has not earned.

The acceptance counts (the minimum per slice) add up to 310, and the check
enforces them one by one:

| slice | minimum | synthetic | founder slots |
|---|---|---|---|
| `courier_labels` | 120 | 130 | 15 |
| `courier_stationery` | 55 | 60 | 8 |
| `international_parcels` | 40 | 40 | 6 |
| `handwriting` | 35 | 40 | 4 |
| `damaged_labels` | 25 | 25 | 3 |
| `low_light` | 20 | 20 | 2 |
| `plastic_wrapping` | 15 | 15 | 2 |

The set covers 10 carriers and 8 layouts, which is the 8-to-10 carriers and
layouts the research asked for
(`docs/research/2026/ocr-label-scanning.md`).

## The manifest

One line per label slot in `manifest/labels.jsonl`:

| field | what it holds |
|---|---|
| `id` | `L0001` … `L0370`, unique across the set |
| `slice` | the slice id |
| `carrier` | a carrier id from the catalogue in `fields.json` |
| `carrier_verified` | whether we could read the carrier's own material (see the ledger) |
| `label_type` | `thermal`, `laser`, `handwritten` or `sticker` |
| `layout` | a layout id from the catalogue |
| `condition` | `clean`, `low_light`, `glare`, `crumpled`, `thermal_fade`, `over_sticker`, `torn`, `plastic_sleeve` or `plastic_bag` |
| `fields` | the fields printed on the label |
| `ground_truth` | the truth: the value of each field, the parsed address (the shape the intake contract asks for, `services/api/app/prompts.py`), the symbology, the gold block and who annotated it |
| `expected_block` | `recipient` — the block the scanner has to return |
| `difficulty` | `easy`, `medium` or `hard` |
| `source` | `synthetic`, `redacted_photo` or `real_photo` |
| `licence_id` | the row in `licence.csv` for the image |
| `content_licence_ids` | the rows in `licence.csv` for the content inside the label |
| `read_time_budget_s` | 1.5 s — the per-label budget from V4 §10.2 |
| `image_path` | where the image is or will be (never under `docs/`) |
| `status` | `ready` or `awaiting_founder` |
| `brief`, `needs` | on the founder slots only: what the founder has to bring |

The **ground truth rule** comes straight from the research: the block that
counts as the recipient is annotated, never inferred. For the synthetic labels
it is known because we drew the label; for the founder's photos a human has to
read the block and write the truth down.

## The privacy rule

**No personal data in this repository.** It is not a slogan, it is enforced by
`scripts/eval/check-scanner-eval.mjs`:

- The synthetic labels carry **no name of a real person**. The recipient line
  is a role token (`RECEIVER`, `CONSIGNEE`, `DELIVERY CARE`, …) and the sender
  is one of ten invented business names. The check fails on any other value.
- The phone number on every label is the placeholder `00 000 0000` — `00` is not
  a New Zealand area code, so no subscriber can be called.
- The only email address in the set is on the `example.invalid` domain, which
  cannot exist.
- The delivery address is public LINZ address-point data (the street name, the
  house number, the suburb, the town), used under **CC BY 4.0**. No name, no
  phone number and no email address is attached to it anywhere in the set.
- **The real photos never enter the repository.** They live in the founder's
  store, outside this tree, and the manifest only holds a slot for them. The
  redaction, the consent and the deletion of the personal data are the
  founder's to do, and the ledger records the obligation.
- The images are drawn into `data/labels/`, which is in `.gitignore`.

The cost of this rule is stated plainly: the synthetic labels are less
realistic than a real label (no real name, a printed barcode pattern that is
not a scannable symbol, a script font instead of a scan of handwriting). The
founder's photos close that gap; the synthetic set is the part we can rebuild
and re-measure on every run.

## The licence ledger

`manifest/licence.csv` has one row per source, with the columns the voice set
uses (`licence_id, source, artefact_or_corpus, licence, date_read,
evidence_url, sha256, obligations, decision`). Every row was read on
2026-10-21 and every row has a link or a plain statement of where the fact
came from:

| licence_id | what it covers | decision |
|---|---|---|
| `LIC-OURS-SYNTH` | our own drawings and the ground truth (the sha256 pins the generator) | shippable |
| `LIC-LINZ-ADDR` | the LINZ address points (CC BY 4.0; the sha256 pins the address pool) | shippable |
| `LIC-FOUNDER-PHOTOS` | the redacted photos the founder will supply | pending-founder |
| `LIC-GS1-SYMBOLOGIES` | the symbology facts (GS1-128, ITF-14, GS1 DataMatrix, QR) | reference-only |
| `LIC-NZPOST-STANDARDS` | the NZ Post label standard (size, font, To and From, the left aligned block) | reference-only |
| `LIC-NZPOST-API` | the ParcelLabel carrier ids, the merchant barcode formats and the address fields | reference-only |
| `LIC-POSTHASTE-REF` | the Post Haste ticket number format and the satchel sizes | reference-only |
| `LIC-NZCOURIERS-REF` | the NZ Couriers ticket, charge label and international consignment numbers | reference-only |
| `LIC-ARAMEX-REF` | the Aramex electronic label and satchels | reference-only |
| `LIC-NZPOST-INTL-REF` | the UW parcel-reference prefix on the international labels | reference-only |
| `LIC-TEAMK-UNVERIFIED` | the Team-K Parcel label: **unverified**, no New Zealand courier of that name was found on 2026-10-21 | unverified-not-used |

The carriers, the symbologies and the label formats were read from the carrier
or from GS1 on 2026-10-21; anything we could not read is marked
`unverified` in `fields.json` and in the ledger. No label is drawn for an
unverified carrier until the founder confirms the format.

## How to regenerate

```
node scripts/eval/build-scanner-eval.mjs      # the manifest, the slices, the catalogue, the ledger
node scripts/data/generate-synthetic-labels.mjs  # the images and their ground truth (not committed)
node scripts/eval/check-scanner-eval.mjs      # the integrity of the set (runs in CI)
```

The build is deterministic: the same seed (20261021), the same LINZ extract and
the same anchor date (2026-10-21) give the same bytes, and the images are
byte-identical on every run. The addresses come from `data/linz/` (the LINZ
layer 123113 data: Christchurch, Waimakariri and Selwyn) — the real street
names, the real suburbs and the real house numbers. The builder needs that
extract; the check does not, because the manifest carries the truth.

`scripts/eval/check-scanner-eval.mjs` fails on:

- a count under the floor (300 labels), or a slice under its minimum;
- a row with no licence, a licence that is not in the ledger, or a synthetic
  label whose licence is not shippable;
- a label with a missing ground truth, a field with no value, a parsed address
  without a number, a street or a suburb;
- a field, a carrier, a layout, a symbology or a condition that is not in the
  catalogue;
- a reading time budget over 1.5 s, or an image path under `docs/`;
- a name, a phone number or an email address that is not on the allow list;
- a founder slot with a ground truth, or without a brief;
- the images and the manifest drifting apart (when the images have been drawn).

The check is wired into the **floor guard** job in
`.github/workflows/quality-gates.yml`, next to the voice check.

## What is not here yet, and why

- **The real photos.** The founder has to supply them: 40 slots across the
  seven slices, with the redaction and the consent. The brief for each slice
  is in the `brief` field of the slot.
- **A barcode-accurate renderer.** The bars on the synthetic labels are a
  deterministic pattern, not a scannable Code 128: a real encoder is not in
  this workspace and the pattern was not invented. The barcode **read rate**
  (M4) therefore has to be measured on the founder's photos and on a
  barcode-accurate renderer.
- **Raster images.** There is no image library in this workspace (no `sharp`,
  no `canvas`, no `jimp`, no `pdfkit`), so each synthetic label is an SVG: it
  is text, it is a real label, and the ground truth is the text on it. An
  engine that reads a photo reads an SVG the same way, but the pipeline that
  rasterises the SVG into a photo is part of the harness, not of this set.
- **The harness.** The scoring code that turns an engine's output into M1–M8
  is the next step of the scanner squad, the same way the voice harness sits
  behind the voice set.
- **The name of the Team-K carrier.** Unverified: a web search and a
  DuckDuckGo HTML search on 2026-10-21 found no New Zealand courier under that
  name. The founder has to confirm the name and the label format.
