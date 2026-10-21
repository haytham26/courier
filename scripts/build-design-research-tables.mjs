#!/usr/bin/env node
/**
 * Builds the tables of the Design Studio research from the evidence.
 *
 *   node scripts/build-design-research-tables.mjs            # print them
 *   node scripts/build-design-research-tables.mjs --write    # write them into the document
 *
 * It joins three files:
 * - `docs/design/evidence/github-repos-<date>.tsv` - the GitHub snapshot,
 * - `docs/design/evidence/npm-packages-<date>.tsv` - the npm snapshot,
 * - `docs/design/evidence/research-notes.tsv` - why each repository is in the pool.
 *
 * and prints the markdown tables of `docs/design/RESEARCH.md`. The numbers in
 * the document therefore come from the API and cannot drift away from it.
 *
 * With `--write` the tables replace the block between the markers
 * `<!-- TABLES:START -->` and `<!-- TABLES:END -->` of the document.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const evidenceDir = 'docs/design/evidence';
const documentPath = 'docs/design/RESEARCH.md';
const startMarker = '<!-- TABLES:START -->';
const endMarker = '<!-- TABLES:END -->';
const write = process.argv.includes('--write');

function readTsv(fileName) {
  const text = readFileSync(join(evidenceDir, fileName), 'utf8').trim();
  const [header, ...rows] = text.split('\n');
  const columns = header.split('\t').map((cell) => cell.replace(/^"|"$/g, ''));

  return rows.map((row) => {
    const cells = row.split('\t').map((cell) => cell.replace(/^"|"$/g, ''));
    const record = {};
    columns.forEach((column, index) => {
      record[column] = cells[index] ?? '';
    });
    return record;
  });
}

function newest(prefix) {
  const files = readdirSync(evidenceDir).filter((name) => name.startsWith(prefix));
  if (files.length === 0) {
    throw new Error(`no file starting with ${prefix} in ${evidenceDir}`);
  }
  files.sort();
  return files[files.length - 1];
}

const repoFile = newest('github-repos-');
const npmFile = newest('npm-packages-');
const repos = readTsv(repoFile);
const packages = readTsv(npmFile);

const notes = new Map();
for (const line of readFileSync(join(evidenceDir, 'research-notes.tsv'), 'utf8').split('\n')) {
  if (line.trim() === '' || line.startsWith('#')) {
    continue;
  }
  const [repo, ...rest] = line.split('\t');
  notes.set(repo.trim(), rest.join(' ').trim());
}

const npmByName = new Map(packages.map((row) => [row.package, row]));

/** The maintenance proxy: the day of the last commit on the default branch. */
function maintenance(row) {
  if (row.archived === 'True') {
    return `archived, last commit ${row.lastCommit}`;
  }
  if (row.pushed === row.lastCommit) {
    return `active, last commit ${row.lastCommit}`;
  }
  return `quiet since ${row.pushed}`;
}

function releaseCell(row) {
  if (!row.releaseTag) {
    return `no release (${row.releases} in total)`;
  }
  const pre = row.prerelease === 'True' ? ', pre-release' : '';
  return `${row.releaseTag} (${row.releaseDate}${pre})`;
}

const categories = [
  {
    title: 'A. React Native design systems and UI kits',
    list: [
      'tamagui/tamagui',
      'callstack/react-native-paper',
      'akveo/react-native-ui-kitten',
      'wix/react-native-ui-lib',
      'founded-labs/react-native-reusables',
      'heroui-inc/heroui-native',
      'GeekyAnts/NativeBase',
      'gluestack/gluestack-ui',
      'satya164/react-native-tab-view',
      'callstack/react-native-bottom-tabs',
      'Shopify/restyle',
    ],
  },
  {
    title: 'B. Styling engines, tokens and colour',
    list: [
      'jpudysz/react-native-unistyles',
      'uni-stack/uniwind',
      'style-dictionary/style-dictionary',
      'radix-ui/colors',
      'google/material-design-icons',
    ],
  },
  {
    title: 'C. Motion, animation and haptics',
    list: [
      'software-mansion/react-native-reanimated',
      'software-mansion/react-native-worklets',
      'nandorojo/moti',
      'wcandillon/react-native-skia',
      'wcandillon/react-native-skia',
      'lottie-react-native/lottie-react-native',
      'airbnb/lottie-android',
      'rive-app/rive-react-native',
      'motiondivision/motion',
      'wcandillon/react-native-redash',
      'appandflow/react-native-ease',
      'Rednegniw/number-flow-react-native',
      'LegendApp/legend-motion',
      'dohooo/react-native-reanimated-carousel',
      'SchroederNathan/react-native-motion',
      'mkuczera/react-native-haptic-feedback',
    ],
  },
  {
    title: 'D. Sheets, gestures, lists and shared elements',
    list: [
      'software-mansion/react-native-gesture-handler',
      'gorhom/react-native-bottom-sheet',
      'software-mansion-labs/react-native-bottom-sheet',
      'lodev09/react-native-true-sheet',
      'computerjazz/react-native-draggable-flatlist',
      'entropyconquers/react-native-reanimated-dnd',
      'omahili/react-native-reorderable-list',
      'esthor/react-native-swipeable-list',
      'azimgd/shadowlist',
      'Glazzes/react-native-zoom-toolkit',
      'jeremybarbet/react-native-modalize',
      'osdnk/react-native-reanimated-bottom-sheet',
    ],
  },
  {
    title: 'E. Icons, fonts, accessibility and the platform',
    list: [
      'oblador/react-native-vector-icons',
      'software-mansion/react-native-svg',
      'expo/google-fonts',
      'google/fonts',
      'ArturKalach/react-native-a11y',
      'ArturKalach/react-native-a11y-order',
      'FormidableLabs/eslint-plugin-react-native-a11y',
      'dequelabs/axe-core',
      'Shopify/flash-list',
      'software-mansion/react-native-screens',
      'appandflow/react-native-safe-area-context',
      'margelo/react-native-mmkv',
      'margelo/nitro',
      'zoontek/react-native-localize',
    ],
  },
  {
    title: 'F. Maps, map styling and the routing we draw on',
    list: [
      'maplibre/maplibre-native',
      'maplibre/maplibre-gl-js',
      'maplibre/maplibre-style-spec',
      'maplibre/maputnik',
      'protomaps/basemaps',
      'protomaps/PMTiles',
      'maptiler/tileserver-gl',
      'openmaptiles/maptiler-basic-gl-style',
      'openmaptiles/openmaptiles',
      'mapbox/mapbox-gl-native',
      'tyrasd/overpass-turbo',
      'Project-OSRM/osrm-backend',
      'graphhopper/graphhopper',
      'GIScience/openrouteservice',
    ],
  },
  {
    title: 'G. The open-source work of the reference products',
    list: [
      'monzo/docs',
      'primer/react',
      'microsoft/fluentui',
      'adobe/react-spectrum',
      'mantinedev/mantine',
      'chakra-ui/chakra-ui',
      'grafana/grafana',
      'recharts/recharts',
      'expo/expo',
    ],
  },
];

const byName = new Map(repos.map((row) => [row.repo.toLowerCase(), row]));

const lines = [];
const say = (text = '') => {
  lines.push(text);
};

for (const category of categories) {
  say(`\n### ${category.title}\n`);
  say('| Repository | Stars | Last release | Licence | Maintenance | Why it is in the pool |');
  say('| --- | ---: | --- | --- | --- | --- |');

  for (const name of category.list) {
    const row = byName.get(name.toLowerCase());
    if (!row) {
      say(`| \`${name}\` | - | - | - | - | **not in the snapshot** |`);
      continue;
    }
    const licence = row.licence === '' ? '**none reported**' : `\`${row.licence}\``;
    say(
      `| [${row.repo}](${row.url}) | ${row.stars} | ${releaseCell(row)} | ${licence} | ${maintenance(row)} | ${notes.get(row.repo) ?? ''} |`,
    );
  }
}

say('\n### The npm footprint of the libraries the bench measures\n');
say('| Package | Version | Unpacked size (kB) | Licence | Published | Registry |');
say('| --- | --- | ---: | --- | --- | --- |');
for (const row of packages) {
  say(
    `| \`${row.package}\` | ${row.version} | ${row.sizeKb} | ${row.licence} | ${row.published} | [npm](${row.registryUrl}) |`,
  );
}

say(
  `\n<!-- generated by scripts/build-design-research-tables.mjs from ${repoFile} and ${npmFile} -->`,
);

const tables = lines.join('\n');

if (!write) {
  console.log(tables);
} else {
  const document = readFileSync(documentPath, 'utf8');
  const start = document.indexOf(startMarker);
  const end = document.indexOf(endMarker);

  if (start === -1 || end === -1 || end < start) {
    throw new Error(`the markers are missing from ${documentPath}`);
  }

  const updated = `${document.slice(0, start + startMarker.length)}\n${tables}\n${document.slice(end)}`;
  writeFileSync(documentPath, updated, 'utf8');
  console.log(`Wrote the tables into ${documentPath}`);
}
