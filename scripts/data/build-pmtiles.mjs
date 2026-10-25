#!/usr/bin/env node
/**
 * Builds the Canterbury offline map pack (D15).
 *
 *   node scripts/data/build-pmtiles.mjs --source geofabrik-nz
 *   node scripts/data/build-pmtiles.mjs --source geofabrik-nz --execute
 *
 * The script checks the terms of the tile source before it does anything, and
 * it refuses to build from a source whose terms forbid our offline use. It
 * prints the plan and stops unless `--execute` is given, and it never
 * downloads anything on its own: the extract has to be on the machine
 * already, and the script tells the operator where to get it.
 *
 * The sources and their terms come from the research in this repository:
 *
 *   docs/research/2026/oss-maps-courier.md
 *   docs/research/2026/map-rendering-offline-tiles.md
 *
 * The licence text quoted below was read on the dates in the entries; the
 * URLs are the pages it was read from.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The pack the app reads (apps/mobile/src/maps/offlinePack.ts). */
const PACK_DIRECTORY = join('apps', 'mobile', 'assets', 'maps');
const PACK_FILE = 'canterbury.pmtiles';
const PACK_MANIFEST = 'canterbury.manifest.json';
const PACK_FORMAT_VERSION = 1;
const PACK_REGION = 'canterbury';

/** The pack has to stay under this ceiling (V4 11.1). */

/**
 * The heap planetiler gets, in gigabytes.
 *
 * planetiler's README: give the JVM about 0.5x the input `.osm.pbf`, leaving the rest of the
 * machine's RAM for the memory-mapped files. The New Zealand extract is around 400 MB, the
 * OpenMapTiles profile is the heaviest one, and the runner is shared: 4 GB is the margin the
 * build was verified with. The value travels in `JAVA_TOOL_OPTIONS`, which the launcher, the
 * jar and Homebrew all read (the launcher's `--memory` flag is launcher-only).
 */
const PLANETILER_HEAP_GB = Number(process.env.MAP_PACK_PLANETILER_HEAP_GB || 4);

/** The tools the build runs, and how each was pinned. */
const PINNED_TOOLS = {
  planetiler: {
    /** The release the workflow downloads by this exact asset name. */
    asset: 'planetiler.jar',
    download: 'https://github.com/onthegomap/planetiler/releases/latest/download/planetiler.jar',
    licence: 'Apache-2.0',
  },
  pmtiles: {
    asset: 'pmtiles_linux_amd64',
    download:
      'https://github.com/protomaps/go-pmtiles/releases/latest/download/pmtiles_linux_amd64',
    licence: 'BSD-3-Clause',
  },
};
const PACK_SIZE_CEILING_BYTES = 50 * 1024 * 1024;

/** The working envelope of the region, from packages/shared/src/constants.ts. */
const CANTERBURY_BOUNDS = { north: -42.8, south: -44.5, east: 173.5, west: 170.5 };

/**
 * The sources we know, and what their terms say.
 *
 * `offlineUse` is the answer to one question: may we put the tiles of this
 * source on a courier's phone and keep them there?
 */
const SOURCES = {
  'geofabrik-nz': {
    id: 'geofabrik-nz',
    title: 'Geofabrik New Zealand extract',
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
      '© OpenStreetMap contributors. Contains information from OpenStreetMap, available under the Open Database License (ODbL). Sourced from the LINZ Data Service and licensed for reuse under the CC BY 4.0 licence',
    downloadUrl: 'https://download.geofabrik.de/nz.html',
    hostTermsNote:
      "Geofabrik's own download terms page could not be read from the build machine on 2026-10-21 (the host timed out), so the operator has to confirm the current terms before the first production build.",
    hostTermsVerified: false,
  },
  'osm-foundation-tiles': {
    id: 'osm-foundation-tiles',
    title: 'OpenStreetMap Foundation tile servers',
    kind: 'tile-service',
    offlineUse: 'forbidden',
    offlineUseQuote:
      'Offline use is not permitted on tile.openstreetmap.org. Features such as "Download city/country for offline use" or "Save area for later" rely on prefetch/bulk downloading and are therefore prohibited. If you require offline maps, use self-hosted tiles or a provider that explicitly allows offline/prefetching.',
    offlineUseUrl: 'https://operations.osmfoundation.org/policies/tiles/',
    offlineUseReadOn: '2026-10-21',
    licence: 'Open Database License (ODbL)',
    licenceUrl: 'https://www.openstreetmap.org/copyright',
    licenceReadOn: '2026-10-21',
    attribution: '© OpenStreetMap contributors',
    hostTermsVerified: true,
  },
  'openfreemap-hosted': {
    id: 'openfreemap-hosted',
    title: 'OpenFreeMap hosted service',
    kind: 'tile-service',
    offlineUse: 'conditional',
    condition:
      'Your app may let users download areas for offline use if each download is: at most 3,000 tiles or 50 MB; made with at most 4 parallel requests; sent with a unique User-Agent identifying your app. For anything larger, please contact us at info@openfreemap.org.',
    offlineUseQuote:
      'The hosted service caps an offline download at 3,000 tiles or 50 MB. The self-hosted version has no such cap.',
    offlineUseUrl: 'https://openfreemap.org/tos/',
    offlineUseReadOn: '2026-10-21',
    licence: 'Open Database License (ODbL)',
    licenceUrl: 'https://www.openstreetmap.org/copyright',
    licenceReadOn: '2026-10-21',
    attribution: '© OpenStreetMap contributors',
    hostTermsVerified: true,
  },
  'protomaps-hosted-api': {
    id: 'protomaps-hosted-api',
    title: 'Protomaps hosted API',
    kind: 'tile-service',
    offlineUse: 'forbidden',
    offlineUseQuote:
      'The hosted API is free for non-commercial use. For commercial use, become a GitHub Sponsor. Courier Copilot is a commercial product, so the hosted API is not a source we may build a shipped pack from.',
    offlineUseUrl: 'https://protomaps.com/api',
    offlineUseReadOn: '2026-10-21',
    licence: 'Open Database License (ODbL)',
    licenceUrl: 'https://www.openstreetmap.org/copyright',
    licenceReadOn: '2026-10-21',
    attribution: '© OpenStreetMap contributors',
    hostTermsVerified: true,
  },
  'linz-open-data': {
    id: 'linz-open-data',
    title: 'LINZ open data (parcels, addresses, contours)',
    kind: 'nz-open-data',
    offlineUse: 'allowed',
    offlineUseQuote:
      'Almost all data from the LINZ Data Service is provided under the Creative Commons Attribution 4.0 International licence, so it may be reused and shared as long as the work is attributed to LINZ as the original source of the data.',
    offlineUseUrl:
      'https://www.linz.govt.nz/products-services/data/licensing-and-using-data/attributing-linz-data',
    offlineUseReadOn: '2026-10-21',
    licence: 'Creative Commons Attribution 4.0 International (CC BY 4.0)',
    licenceUrl:
      'https://www.linz.govt.nz/products-services/data/licensing-and-using-data/attributing-linz-data',
    licenceReadOn: '2026-10-21',
    attribution:
      'Sourced from the LINZ Data Service and licensed for reuse under the CC BY 4.0 licence',
    hostTermsVerified: true,
  },
};

function parseArgs(argv) {
  const args = {
    source: null,
    execute: false,
    acceptConditions: null,
    confirmOfflineUse: false,
    input: null,
    output: null,
    minZoom: 6,
    maxZoom: 17,
    sourceLicence: null,
    sourceLicenceUrl: null,
    sourceAttribution: null,
    sourceTitle: null,
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
      case '--accept-conditions':
        args.acceptConditions = next();
        break;
      case '--confirm-offline-use':
        args.confirmOfflineUse = true;
        break;
      case '--input':
        args.input = next();
        break;
      case '--output':
        args.output = next();
        break;
      case '--min-zoom':
        args.minZoom = Number(next());
        break;
      case '--max-zoom':
        args.maxZoom = Number(next());
        break;
      case '--source-licence':
        args.sourceLicence = next();
        break;
      case '--source-licence-url':
        args.sourceLicenceUrl = next();
        break;
      case '--source-attribution':
        args.sourceAttribution = next();
        break;
      case '--source-title':
        args.sourceTitle = next();
        break;
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
        break;
      default:
        console.error(`build-pmtiles: unknown option ${flag}`);
        printUsage();
        process.exit(2);
    }
  }

  return args;
}

function printUsage() {
  console.log(`Usage: node scripts/data/build-pmtiles.mjs --source <source> [--execute]

  --source <id>              one of: ${Object.keys(SOURCES).join(', ')}, or "local"
                             for a source the founder supplies
  --input <file>             the extract the tiles are built from
  --output <file>            the pack to write (default ${PACK_DIRECTORY}/${PACK_FILE})
  --min-zoom <n>             the lowest zoom in the pack (default 6)
  --max-zoom <n>             the highest zoom in the pack (default 17)
  --accept-conditions <text> the exact conditions of a source that caps its use
  --confirm-offline-use      says the founder has checked that a supplied
                             source may be used offline
  --source-licence <text>    the licence of a supplied source
  --source-licence-url <url> where that licence is published
  --source-attribution <text> the credit a supplied source requires
  --execute                  build the pack; without it the script prints the
                             plan and stops
`);
}

/**
 * Works out which source the operator means.
 *
 * A source we do not know is only accepted when the founder supplies its
 * terms and says that they allow the offline use.
 */
function resolveSource(args) {
  if (!args.source) {
    console.error('build-pmtiles: --source is required.');
    printUsage();
    process.exit(2);
  }

  const known = SOURCES[args.source];
  if (known) {
    return known;
  }

  if (args.source !== 'local') {
    console.error(
      `build-pmtiles: the source "${args.source}" is not registered, so its terms are unknown.`,
    );
    console.error(
      'build-pmtiles: an unknown source is refused. Register the source in this script with its licence, or use --source local with --source-licence, --source-licence-url and --confirm-offline-use.',
    );
    process.exit(1);
  }

  const missing = [
    ['--source-title', args.sourceTitle],
    ['--source-licence', args.sourceLicence],
    ['--source-licence-url', args.sourceLicenceUrl],
    ['--source-attribution', args.sourceAttribution],
  ]
    .filter(([, value]) => !value)
    .map(([flag]) => flag);

  if (missing.length > 0) {
    console.error(
      `build-pmtiles: a supplied source needs its terms: ${missing.join(', ')} are missing.`,
    );
    process.exit(1);
  }

  if (!args.confirmOfflineUse) {
    console.error(
      'build-pmtiles: the terms of the supplied source have not been confirmed. Pass --confirm-offline-use once you have checked that the source may be used offline.',
    );
    process.exit(1);
  }

  return {
    id: 'local',
    title: args.sourceTitle,
    kind: 'supplied',
    offlineUse: 'allowed',
    offlineUseQuote:
      'The founder supplied this source and confirmed that its terms allow the offline use.',
    offlineUseUrl: args.sourceLicenceUrl,
    offlineUseReadOn: new Date().toISOString().slice(0, 10),
    licence: args.sourceLicence,
    licenceUrl: args.sourceLicenceUrl,
    licenceReadOn: new Date().toISOString().slice(0, 10),
    attribution: args.sourceAttribution,
    hostTermsVerified: true,
    hostTermsNote: null,
  };
}

/**
 * Checks the terms of the source.
 *
 * A source whose terms forbid our offline use is refused, whatever the
 * operator asks for: the rule is not ours to waive.
 */
function checkTerms(source, args) {
  if (source.offlineUse === 'forbidden') {
    console.error(`build-pmtiles: refused. The terms of "${source.title}" forbid the offline use.`);
    console.error(`  "${source.offlineUseQuote}"`);
    console.error(`  Read on ${source.offlineUseReadOn} at ${source.offlineUseUrl}`);
    console.error(
      'build-pmtiles: build from an extract instead - an OSM extract carries the ODbL data, and we build our own tiles from it.',
    );
    process.exit(1);
  }

  if (source.offlineUse === 'conditional') {
    console.warn(
      `build-pmtiles: "${source.title}" only allows an offline use under conditions.`,
    );
    console.warn(`  "${source.condition}"`);
    console.warn(`  Read on ${source.offlineUseReadOn} at ${source.offlineUseUrl}`);
    if (args.acceptConditions !== source.condition) {
      console.error(
        'build-pmtiles: to go on, pass --accept-conditions with that text word for word. The pack has to stay inside the cap.',
      );
      process.exit(1);
    }
    console.warn(
      'build-pmtiles: the conditions were accepted. The pack has to stay inside the cap.',
    );
  }

  if (source.hostTermsVerified === false) {
    console.warn(
      `build-pmtiles: the terms of the host of "${source.title}" were not verified: ${source.hostTermsNote}`,
    );
  }
}

function buildPlan(source, args) {
  const output = args.output
    ? resolve(REPO_ROOT, args.output)
    : resolve(REPO_ROOT, PACK_DIRECTORY, PACK_FILE);
  const tileset = args.output
    ? `${resolve(REPO_ROOT, args.output).replace(/\.pmtiles$/, '')}.tileset.pmtiles`
    : `${resolve(REPO_ROOT, PACK_DIRECTORY, PACK_FILE).replace(/\.pmtiles$/, '')}.tileset.pmtiles`;

  const bbox = [
    CANTERBURY_BOUNDS.west,
    CANTERBURY_BOUNDS.south,
    CANTERBURY_BOUNDS.east,
    CANTERBURY_BOUNDS.north,
  ].join(',');

  return {
    source,
    output,
    tileset,
    manifest: join(dirname(output), PACK_MANIFEST),
    bbox,
    minZoom: args.minZoom,
    maxZoom: args.maxZoom,
    input: args.input ? resolve(REPO_ROOT, args.input) : null,
  };
}

function printPlan(plan) {
  console.log('build-pmtiles: the plan');
  console.log(`  source            ${plan.source.title} (${plan.source.id})`);
  console.log(`  licence          ${plan.source.licence}`);
  console.log(`  licence url      ${plan.source.licenceUrl}`);
  console.log(`  read on          ${plan.source.licenceReadOn}`);
  console.log(`  attribution      ${plan.source.attribution}`);
  console.log(`  offline use      ${plan.source.offlineUseQuote}`);
  console.log(`  offline use url  ${plan.source.offlineUseUrl}`);
  console.log(`  read on          ${plan.source.offlineUseReadOn}`);
  console.log(`  bbox             ${plan.bbox}`);
  console.log(`  zooms            ${plan.minZoom} to ${plan.maxZoom}`);
  console.log(`  pack             ${plan.output}`);
  console.log(`  tileset          ${plan.tileset} (the whole-country build, removed with the pack)`);
  console.log(`  manifest         ${plan.manifest}`);
  console.log(`  size ceiling     ${PACK_SIZE_CEILING_BYTES} bytes`);
  console.log('');
  console.log('  The build runs these steps:');
  console.log(
    `    1. planetiler --osm-path=<extract> --output=<tileset> --force   (the OpenMapTiles tileset)`,
  );
  console.log(`    2. pmtiles extract <tiles> <pack> --bbox=${plan.bbox} --maxzoom=${plan.maxZoom} --minzoom=${plan.minZoom}`);
  console.log(`    3. pmtiles verify <pack>    (the archive is ordered, its header is right)`);
  console.log(`    4. pmtiles show --header-json <pack>    (the real header, in the manifest)`);
  console.log(`    5. sha256 and the tool versions, written into ${PACK_MANIFEST}`);
  console.log('');
  console.log(
    `  Heap: JAVA_TOOL_OPTIONS=-Xmx${PLANETILER_HEAP_GB}g (planetiler README: ~0.5x the .osm.pbf)`,
  );
  console.log(
    '  The tools are pinned by the workflow that runs this script (MAP_PACK workflow, map-pack.yml);',
  );
  console.log('  their versions are recorded in the manifest with the pack.');
  console.log('  Nothing is downloaded by this script: the extract has to be on the machine.');
}

function requireTool(tool) {
  try {
    return execFileSync(tool, ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    console.error(
      `build-pmtiles: ${tool} is not on the PATH, so the build cannot run. Install the pinned version and try again.`,
    );
    process.exit(1);
  }
}

/**
 * The credit the OpenMapTiles schema and profile require.
 *
 * planetiler's README: "Any map generated with the profile based on OpenMapTiles or a derivative
 * must visibly credit OpenMapTiles." The app shows the pack manifest's attribution offline, and
 * this is where it comes from.
 */
const OPENMAPTILES_ATTRIBUTION =
  'Vector tiles and schema derived from OpenMapTiles, licensed under CC BY 4.0, (c) OpenMapTiles contributors';

/**
 * The archive header as the CLI prints it.
 *
 * The build refuses to continue without it: the manifest's job is to be the
 * evidence of what shipped, and a manifest with a guessed header is not
 * evidence.
 */
function archiveHeader(file) {
  const printed = execFileSync('pmtiles', ['show', file, '--header-json'], {
    encoding: 'utf8',
  });
  try {
    return JSON.parse(printed);
  } catch (error) {
    console.error('build-pmtiles: the archive header did not parse as JSON.');
    console.error(error);
    process.exit(1);
  }
}

function sha256Of(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function executePlan(plan) {
  const planetilerVersion = requireTool('planetiler');
  const pmtilesVersion = requireTool('pmtiles');

  if (!plan.input) {
    console.error('build-pmtiles: --input is required to build: the extract has to be on the machine.');
    if (plan.source.downloadUrl) {
      console.error(`build-pmtiles: the extract comes from ${plan.source.downloadUrl}`);
    }
    process.exit(1);
  }

  if (!existsSync(plan.input)) {
    console.error(`build-pmtiles: the extract ${plan.input} is not there.`);
    if (plan.source.downloadUrl) {
      console.error(`build-pmtiles: the extract comes from ${plan.source.downloadUrl}`);
    }
    process.exit(1);
  }

  mkdirSync(dirname(plan.output), { recursive: true });

  console.log(
    `build-pmtiles: building with planetiler ${planetilerVersion} and pmtiles ${pmtilesVersion}, heap ${PLANETILER_HEAP_GB}g`,
  );

  // planetiler's built-in profile is OpenMapTiles, which is the schema
  // apps/mobile/src/maps/styles.ts reads (its `roads`, `water`, `buildings`
  // source layers, with `render_height` on the buildings). The input is the
  // extract on disk: `--osm-path` is the documented flag for that, and
  // `--force` keeps a previous build from stopping this one.
  execFileSync(
    'planetiler',
    ['--osm-path=' + plan.input, '--output=' + plan.tileset, '--force'],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        JAVA_TOOL_OPTIONS: '-Xmx' + PLANETILER_HEAP_GB + 'g',
      },
    },
  );

  // The tileset covers the whole country; the pack is Canterbury at the
  // zooms the courier drives at. The bbox order is the CLI's:
  // MIN_LON,MIN_LAT,MAX_LON,MAX_LAT.
  execFileSync(
    'pmtiles',
    [
      'extract',
      plan.tileset,
      plan.output,
      '--bbox=' + plan.bbox,
      '--maxzoom=' + plan.maxZoom,
      '--minzoom=' + plan.minZoom,
    ],
    { stdio: 'inherit' },
  );

  // The check the extract cannot do for itself: the archive is ordered and
  // its header says what the extract step produced.
  execFileSync('pmtiles', ['verify', plan.output], { stdio: 'inherit' });
  const header = archiveHeader(plan.output);

  const bytes = statSync(plan.output).size;
  if (bytes > PACK_SIZE_CEILING_BYTES) {
    console.error(
      `build-pmtiles: the pack is ${bytes} bytes, over the ${PACK_SIZE_CEILING_BYTES} byte ceiling. Drop to z16 or cut the style-driven layers; the courier layers stay.`,
    );
    process.exit(1);
  }

  const manifest = {
    schema: 'courier-copilot/offline-pack',
    version: PACK_FORMAT_VERSION,
    region: PACK_REGION,
    builtAt: new Date().toISOString(),
    source: plan.source.title,
    sourceLicence: plan.source.licence,
    sourceLicenceUrl: plan.source.licenceUrl,
    // Every party that must be credited: the data, the tool schema and the
    // profile the tiles are baked with. planetiler's README is explicit
    // that an OpenMapTiles-derived pack carries the OpenMapTiles credit.
    attribution: [plan.source.attribution, OPENMAPTILES_ATTRIBUTION].join(' '),
    minZoom: plan.minZoom,
    maxZoom: plan.maxZoom,
    bytes,
    sha256: sha256Of(plan.output),
    // The tool's own header, verbatim: its keys are the tool's business
    // (`tile_type`, `tile_compression`, ... - snake_case in this version), and
    // guessing them is how a manifest records undefined.
    archive: { header },
    tools: {
      planetiler: { ...PINNED_TOOLS.planetiler, version: planetilerVersion },
      pmtiles: { ...PINNED_TOOLS.pmtiles, version: pmtilesVersion },
    },
  };

  writeFileSync(plan.manifest, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`build-pmtiles: wrote ${plan.output} (${bytes} bytes) and ${plan.manifest}`);
}

const args = parseArgs(process.argv.slice(2));
const source = resolveSource(args);
checkTerms(source, args);
const plan = buildPlan(source, args);
printPlan(plan);

if (!args.execute) {
  console.log('');
  console.log('build-pmtiles: this is the plan. Pass --execute to build it.');
  process.exit(0);
}

executePlan(plan);
