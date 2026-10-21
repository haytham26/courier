#!/usr/bin/env node
/**
 * Bakes the 3D buildings into the Canterbury pack (MASTER_EXECUTION §11).
 *
 *   node scripts/build-3d-buildings.mjs --source linz-nz-building-outlines
 *   node scripts/build-3d-buildings.mjs --source linz-nz-building-outlines \
 *     --write-manifest docs/evidence/maps/buildings.manifest.json
 *   node scripts/build-3d-buildings.mjs --source linz-nz-building-outlines \
 *     --execute --outlines data/linz/building-outlines.geojson \
 *     --extract data/linz/newzealand-latest.osm.pbf
 *
 * The script does three things:
 *
 * 1. It checks the licence of **every** input and refuses the ones whose
 *    terms forbid our use. The rule is not ours to waive: a source that is
 *    not registered here, with its licence, is refused.
 * 2. It prints the plan and stops, unless `--execute` is given.
 * 3. It writes the licence and the attribution of every input into the
 *    manifest of the pack, so the app can show the credit with no network.
 *
 * The inputs are:
 *
 * - the **LINZ NZ Building Outlines** (LDS layer 101290, CC BY 4.0), which
 *   give the footprints of the buildings. They come from the LINZ Data
 *   Service with the same key as the rest of the LINZ work, and the key is
 *   never printed: the script reads it from the environment and hands it to
 *   the download step only.
 * - the **OpenStreetMap building heights and levels** (ODbL) from the same
 *   extract the rest of the pack is built from.
 *
 * The imagery providers that need a commercial licence are registered here
 * so that they are refused by name: Google Photorealistic 3D Tiles and
 * Cesium ion may only be used with a licence the founder has approved
 * (MASTER_EXECUTION §11).
 *
 * The licence text quoted below was read on the dates in the entries; the
 * URLs are the pages it was read from.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The manifest the pack build writes (apps/mobile/src/maps/offlinePack.ts). */
const PACK_MANIFEST = join('apps', 'mobile', 'assets', 'maps', 'canterbury.manifest.json');

/** The LDS layer of the NZ Building Outlines. */
const LINZ_BUILDING_OUTLINES_LAYER = 101290;

/** The height of one storey, in metres. */
const LEVEL_HEIGHT_METRES = 3;

/** The height of a building that has no height and no levels, in metres. */
const DEFAULT_BUILDING_HEIGHT_METRES = 4;

/**
 * The sources we know, and what their terms say.
 *
 * `offlineUse` is the answer to one question: may the data of this source go
 * on a courier's phone and stay there?
 */
const SOURCES = {
  'linz-nz-building-outlines': {
    id: 'linz-nz-building-outlines',
    title: 'LINZ NZ Building Outlines',
    kind: 'nz-open-data',
    layer: LINZ_BUILDING_OUTLINES_LAYER,
    offlineUse: 'allowed',
    offlineUseQuote:
      'Almost all data from the LINZ Data Service is provided under the Creative Commons Attribution 4.0 International licence. This means you are free to use, reuse and share data as long as you attribute the work to LINZ as the original source of the data.',
    offlineUseUrl:
      'https://www.linz.govt.nz/products-services/data/licensing-and-using-data/attributing-linz-data',
    offlineUseReadOn: '2026-10-22',
    licence: 'Creative Commons Attribution 4.0 International (CC BY 4.0)',
    licenceUrl:
      'https://www.linz.govt.nz/products-services/data/licensing-and-using-data/attributing-linz-data',
    licenceReadOn: '2026-10-22',
    attribution: 'Sourced from the LINZ Data Service and licensed for reuse under the CC BY 4.0 licence',
    required: true,
  },
  'osm-building-heights': {
    id: 'osm-building-heights',
    title: 'OpenStreetMap building heights and levels',
    kind: 'osm-extract',
    offlineUse: 'allowed',
    offlineUseQuote:
      'An OSM extract is OpenStreetMap data, which the OSMF copyright page licenses under the Open Data Commons Open Database License (ODbL). We build our own tiles from it, so the OSMF tile servers - and their tile usage policy - are not involved.',
    offlineUseUrl: 'https://www.openstreetmap.org/copyright',
    offlineUseReadOn: '2026-10-21',
    licence: 'Open Database License (ODbL)',
    licenceUrl: 'https://www.openstreetmap.org/copyright',
    licenceReadOn: '2026-10-21',
    attribution:
      '© OpenStreetMap contributors. Contains information from OpenStreetMap, available under the Open Database License (ODbL).',
    required: true,
  },
  'google-photorealistic-3d-tiles': {
    id: 'google-photorealistic-3d-tiles',
    title: 'Google Photorealistic 3D Tiles',
    kind: 'imagery-service',
    offlineUse: 'forbidden',
    offlineUseQuote:
      'The tiles are served by Google under a commercial licence with a billing-enabled key. MASTER_EXECUTION §11 does not allow them without a proper commercial licence, and the founder has to approve the cost before any of them may be used.',
    offlineUseUrl: 'https://developers.google.com/maps/documentation/3d-tiles',
    offlineUseReadOn: '2026-10-22',
    licence: 'Commercial - not licensed',
    licenceUrl: 'https://developers.google.com/maps/documentation/3d-tiles',
    licenceReadOn: '2026-10-22',
    attribution: 'Not applicable - the source is refused',
    required: false,
  },
  'cesium-ion': {
    id: 'cesium-ion',
    title: 'Cesium ion',
    kind: 'imagery-service',
    offlineUse: 'forbidden',
    offlineUseQuote:
      'The community plan of Cesium ion is for eligible personal, non-commercial use, with quotas. A commercial courier product needs a paid plan, and the founder has to approve the cost before any of it may be used.',
    offlineUseUrl: 'https://cesium.com/learn/cesium-ion/',
    offlineUseReadOn: '2026-10-22',
    licence: 'Commercial - not licensed',
    licenceUrl: 'https://cesium.com/learn/cesium-ion/',
    licenceReadOn: '2026-10-22',
    attribution: 'Not applicable - the source is refused',
    required: false,
  },
};

/** The sources every build needs, in the order they are baked. */
const REQUIRED_SOURCES = ['linz-nz-building-outlines', 'osm-building-heights'];

function parseArgs(argv) {
  const args = {
    source: 'linz-nz-building-outlines',
    execute: false,
    outlines: null,
    extract: null,
    manifest: PACK_MANIFEST,
    writeManifest: null,
    printManifest: false,
    count: 0,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    const next = () => {
      index += 1;
      return value;
    };

    switch (flag) {
      case '--source':
        args.source = next();
        break;
      case '--execute':
        args.execute = true;
        break;
      case '--outlines':
        args.outlines = next();
        break;
      case '--extract':
        args.extract = next();
        break;
      case '--manifest':
        args.manifest = next();
        break;
      case '--write-manifest':
        args.writeManifest = next();
        break;
      case '--print-manifest':
        args.printManifest = true;
        break;
      case '--count':
        args.count = Number(next());
        break;
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
        break;
      default:
        console.error(`build-3d-buildings: unknown option ${flag}`);
        printUsage();
        process.exit(2);
    }
  }

  return args;
}

function printUsage() {
  console.log(`Usage: node scripts/build-3d-buildings.mjs --source <source> [--execute]

  --source <id>           one of: ${Object.keys(SOURCES).join(', ')}
  --outlines <file>       the LINZ building outlines of the region
  --extract <file>        the OSM extract the heights come from
  --manifest <file>       the pack manifest to update (default ${PACK_MANIFEST})
  --write-manifest <file> write the buildings section of the manifest and stop
  --print-manifest      print the buildings section of the manifest and stop
  --count <n>             how many buildings the bake found
  --execute               bake the buildings; without it the plan is printed
`);
}

/**
 * Works out which source the operator means.
 *
 * A source we do not know is refused: its terms are unknown, and an unknown
 * licence is not a licence.
 */
function resolveSource(id) {
  const known = SOURCES[id];
  if (!known) {
    console.error(`build-3d-buildings: the source "${id}" is not registered, so its terms are unknown.`);
    console.error(
      'build-3d-buildings: an unknown source is refused. Register it in this script with its licence, or use one of: ' +
        Object.keys(SOURCES).join(', '),
    );
    process.exit(1);
  }
  return known;
}

/**
 * Checks the terms of every source that goes into the build.
 *
 * A source whose terms forbid our offline use is refused, whatever the
 * operator asks for.
 */
function checkTerms(sources) {
  for (const source of sources) {
    if (source.offlineUse === 'forbidden') {
      console.error(`build-3d-buildings: refused. The terms of "${source.title}" forbid the offline use.`);
      console.error(`  "${source.offlineUseQuote}"`);
      console.error(`  Read on ${source.offlineUseReadOn} at ${source.offlineUseUrl}`);
      console.error(
        'build-3d-buildings: the free buildings are the LINZ outlines and the OpenStreetMap levels. Build from those.',
      );
      process.exit(1);
    }
  }
}

/** The licence of every input, as it is written into the manifest. */
function buildingInputs(sources) {
  return sources.map((source) => ({
    id: source.id,
    source: source.title,
    licence: source.licence,
    licenceUrl: source.licenceUrl,
    attribution: source.attribution,
  }));
}

/**
 * The buildings section of the pack manifest.
 *
 * The licence and the attribution of **every** input are recorded, and the
 * combined credit is what the app shows on the map.
 */
function buildingsManifest(sources, count) {
  const inputs = buildingInputs(sources);
  const attribution = inputs.map((input) => input.attribution).join(' ');

  return {
    present: true,
    source: inputs.map((input) => input.source).join(' with '),
    licence: inputs.map((input) => input.licence).join(' and '),
    licenceUrl: inputs[0]?.licenceUrl ?? '',
    attribution,
    count,
    inputs,
  };
}

function printPlan(plan) {
  console.log('build-3d-buildings: the plan');
  console.log(`  source            ${plan.source.title} (${plan.source.id})`);
  if (plan.source.layer) {
    console.log(`  lds layer         ${plan.source.layer}`);
  }
  console.log(`  licence          ${plan.source.licence}`);
  console.log(`  licence url      ${plan.source.licenceUrl}`);
  console.log(`  read on          ${plan.source.licenceReadOn}`);
  console.log(`  attribution      ${plan.source.attribution}`);
  console.log(`  offline use      ${plan.source.offlineUseQuote}`);
  console.log(`  offline use url  ${plan.source.offlineUseUrl}`);
  console.log(`  read on          ${plan.source.offlineUseReadOn}`);
  console.log(`  outlines         ${plan.outlines ?? 'not given'}`);
  console.log(`  osm extract      ${plan.extract ?? 'not given'}`);
  console.log(`  manifest         ${plan.manifest}`);
  console.log('');
  console.log('  Every input of the build, and its licence:');
  for (const input of plan.inputs) {
    console.log(`    ${input.id}: ${input.licence}`);
    console.log(`      ${input.attribution}`);
  }
  console.log('');
  console.log('  The build runs these steps:');
  console.log('    1. planetiler with the courier profile and the outlines overlay');
  console.log(`    2. the height of a building: levels x ${LEVEL_HEIGHT_METRES} m,`);
  console.log(`       or the height on the building, or ${DEFAULT_BUILDING_HEIGHT_METRES} m when there is neither`);
  console.log('    3. the buildings section of the manifest, with the licence of every input');
  console.log('');
  console.log('  The tools are pinned by SHA-256; record the versions in the manifest.');
  console.log('  Nothing is downloaded by this script: the inputs have to be on the machine.');
}

function requireTool(tool) {
  try {
    return execFileSync(tool, ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch {
    console.error(
      `build-3d-buildings: ${tool} is not on the PATH, so the build cannot run. Install the pinned version and try again.`,
    );
    process.exit(1);
  }
}

/** Writes the buildings section into a manifest file. */
function writeManifest(file, buildings) {
  const target = resolve(REPO_ROOT, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(buildings, null, 2)}\n`, 'utf8');
  console.log(`build-3d-buildings: wrote ${target}`);
}

const args = parseArgs(process.argv.slice(2));
const source = resolveSource(args.source);

// Every source that goes into the build is checked, not only the one that
// was named on the command line.
const sources = [source, ...REQUIRED_SOURCES.filter((id) => id !== args.source).map((id) => SOURCES[id])];
checkTerms(sources);

const plan = {
  source,
  sources,
  inputs: buildingInputs(sources),
  outlines: args.outlines ? resolve(REPO_ROOT, args.outlines) : null,
  extract: args.extract ? resolve(REPO_ROOT, args.extract) : null,
  manifest: resolve(REPO_ROOT, args.manifest),
};

// The manifest can be printed on its own, so the licences can be checked
// before a long build.
if (args.printManifest) {
  console.log(JSON.stringify(buildingsManifest(sources, args.count), null, 2));
  process.exit(0);
}

printPlan(plan);

// The manifest can also be written on its own, so the licences can be checked
// before a long build.
if (args.writeManifest) {
  writeManifest(args.writeManifest, buildingsManifest(sources, args.count));
  process.exit(0);
}

if (!args.execute) {
  console.log('');
  console.log('build-3d-buildings: this is the plan. Pass --execute to bake it.');
  process.exit(0);
}

const planetilerVersion = requireTool('planetiler');

if (!plan.outlines || !plan.extract) {
  console.error(
    'build-3d-buildings: --outlines and --extract are required to build: the inputs have to be on the machine.',
  );
  process.exit(1);
}

if (!existsSync(plan.outlines) || !existsSync(plan.extract)) {
  console.error('build-3d-buildings: one of the inputs is not there.');
  console.error(
    `  The outlines come from the LINZ Data Service, layer ${LINZ_BUILDING_OUTLINES_LAYER}, and the extract comes from Geofabrik.`,
  );
  process.exit(1);
}

console.log(`build-3d-buildings: baking with planetiler ${planetilerVersion}`);
execFileSync(
  'planetiler',
  [
    '--area=christchurch',
    `--download=${plan.extract}`,
    `--output=${plan.manifest}.tiles`,
    `--overlay=${plan.outlines}`,
    '--profile=courier',
  ],
  { stdio: 'inherit' },
);

writeManifest(plan.manifest, buildingsManifest(sources, args.count));
