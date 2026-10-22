#!/usr/bin/env node
/**
 * Builds the tables of the library bench from the evidence.
 *
 *   node scripts/design/build-design-bench-tables.mjs          # print them
 *   node scripts/design/build-design-bench-tables.mjs --write  # write them into the document
 *
 * It joins:
 * - `docs/design/evidence/npm-packages-<date>.tsv` - the npm snapshot (version, size, licence),
 * - `docs/design/evidence/bench-scores.tsv` - the scores and the recommendation.
 *
 * The scores are judgements against the bar of `docs/design/SYSTEM.md`; the version, the
 * licence, the size and the publish date are facts from the registry.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const evidenceDir = 'docs/design/evidence';
const documentPath = 'docs/design/BENCH.md';
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
  const files = readdirSync(evidenceDir)
    .filter((name) => name.startsWith(prefix))
    .sort();
  if (files.length === 0) {
    throw new Error(`no file starting with ${prefix} in ${evidenceDir}`);
  }
  return files[files.length - 1];
}

const npmFile = newest('npm-packages-');
const repoFile = newest('github-repos-');
const packages = readTsv(npmFile);
const npmByName = new Map(packages.map((row) => [row.package, row]));
const repos = readTsv(repoFile);
const repoByName = new Map(repos.map((row) => [row.repo.toLowerCase(), row]));

/**
 * The repository of every package in the bench, so the maintenance column
 * can come from the GitHub snapshot and not from a second source.
 */
const repoOf = {
  'react-native-reanimated': 'software-mansion/react-native-reanimated',
  'react-native-worklets': 'software-mansion/react-native-worklets',
  'react-native-gesture-handler': 'software-mansion/react-native-gesture-handler',
  'react-native-unistyles': 'jpudysz/react-native-unistyles',
  '@shopify/flash-list': 'Shopify/flash-list',
  'react-native-svg': 'software-mansion/react-native-svg',
  'react-native-screens': 'software-mansion/react-native-screens',
  'react-native-safe-area-context': 'appandflow/react-native-safe-area-context',
  '@expo/vector-icons': 'oblador/react-native-vector-icons',
  '@expo-google-fonts/figtree': 'expo/google-fonts',
  'expo-symbols': 'expo/expo',
  '@swmansion/react-native-bottom-sheet': 'software-mansion-labs/react-native-bottom-sheet',
  '@gorhom/bottom-sheet': 'gorhom/react-native-bottom-sheet',
  '@lodev09/react-native-true-sheet': 'lodev09/react-native-true-sheet',
  'react-native-mmkv': 'margelo/react-native-mmkv',
  'react-native-nitro-modules': 'margelo/nitro',
  '@op-engineering/op-sqlite': 'op-engineering/op-sqlite',
  'react-native-localize': 'zoontek/react-native-localize',
  '@react-navigation/native': 'react-navigation/react-navigation',
  '@react-navigation/bottom-tabs': 'react-navigation/react-navigation',
  '@react-navigation/native-stack': 'react-navigation/react-navigation',
  '@bottom-tabs/react-navigation': 'callstack/react-native-bottom-tabs',
  'react-native-paper': 'callstack/react-native-paper',
  '@ui-kitten/components': 'akveo/react-native-ui-kitten',
  'react-native-ui-lib': 'wix/react-native-ui-lib',
  'heroui-native': 'heroui-inc/heroui-native',
  '@gluestack-ui/themed': 'gluestack/gluestack-ui',
  tamagui: 'tamagui/tamagui',
  '@shopify/restyle': 'Shopify/restyle',
  'react-native-tab-view': 'satya164/react-native-tab-view',
  moti: 'nandorojo/moti',
  'react-native-redash': 'wcandillon/react-native-redash',
  'react-native-ease': 'appandflow/react-native-ease',
  'number-flow-react-native': 'Rednegniw/number-flow-react-native',
  '@legendapp/motion': 'LegendApp/legend-motion',
  'react-native-reanimated-dnd': 'entropyconquers/react-native-reanimated-dnd',
  'react-native-reorderable-list': 'omahili/react-native-reorderable-list',
  'react-native-draggable-flatlist': 'computerjazz/react-native-draggable-flatlist',
  'react-native-swipeable-list': 'esthor/react-native-swipeable-list',
  'react-native-haptic-feedback': 'mkuczera/react-native-haptic-feedback',
  'react-native-zoom-toolkit': 'Glazzes/react-native-zoom-toolkit',
  'react-native-modalize': 'jeremybarbet/react-native-modalize',
  'lottie-react-native': 'lottie-react-native/lottie-react-native',
  '@rive-app/react-native': 'rive-app/rive-react-native',
  '@shopify/react-native-skia': 'wcandillon/react-native-skia',
  'react-native-skia': 'wcandillon/react-native-skia',
  'expo-haptics': 'expo/expo',
  'expo-location': 'expo/expo',
  'expo-audio': 'expo/expo',
  'expo-blur': 'expo/expo',
  'expo-linear-gradient': 'expo/expo',
  'react-native-sherpa-onnx': 'k2-fsa/sherpa-onnx',
  'react-native-view-shot': 'gre/react-native-view-shot',
  '@testing-library/react-native': 'callstack/react-native-testing-library',
  'maplibre-gl': 'maplibre/maplibre-gl-js',
  '@maplibre/maplibre-react-native': 'maplibre/maplibre-react-native',
};

/** The maintenance of a library: when it was published and when it was touched. */
function maintenance(packageName, npm) {
  const repoName = repoOf[packageName];
  const repo = repoName ? repoByName.get(repoName.toLowerCase()) : undefined;

  if (!repo) {
    return `published ${npm.published}`;
  }

  const parts = [`published ${npm.published}`];
  if (repo.archived === 'True') {
    parts.push(`archived, last commit ${repo.lastCommit}`);
  } else {
    parts.push(`last commit ${repo.lastCommit}`);
  }
  if (repo.releaseDate) {
    parts.push(`release ${repo.releaseDate}`);
  }

  return parts.join(' · ');
}

const scores = [];
for (const line of readFileSync(join(evidenceDir, 'bench-scores.tsv'), 'utf8').split('\n')) {
  if (line.trim() === '' || line.startsWith('#')) {
    continue;
  }
  const cells = line.split('\t');
  scores.push({
    package: cells[0],
    polish: cells[1],
    frame: cells[2],
    spring: cells[3],
    shared: cells[4],
    a11y: cells[5],
    newarch: cells[6],
    fit: cells[7],
    recommendation: cells[8],
    reason: cells.slice(9).join(' '),
  });
}

const lines = [];
const say = (text = '') => lines.push(text);

say('## 2. The bench — every candidate against our bar\n');
say(
  'The first table is the design capability: how polished it is, how it moves, and how it treats the driver who cannot see or cannot tap quickly. The second table is the engineering fact: the size, the licence, the New Architecture, the maintenance and the fit with React Native 0.88 and Expo SDK 58.\n',
);

say('### 2.1 The design capability\n');
say(
  '| Library | Visual polish | Frame budget | Spring physics | Shared elements | Accessibility |',
);
say('| --- | --- | --- | --- | --- | --- |');
for (const row of scores) {
  say(
    `| \`${row.package}\` | ${row.polish} | ${row.frame} | ${row.spring} | ${row.shared} | ${row.a11y} |`,
  );
}

say('\n### 2.2 The engineering fact\n');
say(
  '| Library | Version | Unpacked size (kB) | Licence | New Architecture | RN 0.88 / Expo 58 | Maintenance | Recommendation | Why |',
);
say('| --- | --- | ---: | --- | --- | --- | --- | --- | --- |');
for (const row of scores) {
  const npm = npmByName.get(row.package);
  if (!npm) {
    say(`| \`${row.package}\` | **not in the registry snapshot** | - | - | - | - | - | - | - |`);
    continue;
  }
  say(
    `| \`${row.package}\` | ${npm.version} | ${npm.sizeKb} | ${npm.licence} | ${row.newarch} | ${row.fit} | ${maintenance(row.package, npm)} | **${row.recommendation}** | ${row.reason} |`,
  );
}

say(
  `\n<!-- generated by scripts/design/build-design-bench-tables.mjs from ${npmFile}, ${repoFile} and docs/design/evidence/bench-scores.tsv -->`,
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

  writeFileSync(
    documentPath,
    `${document.slice(0, start + startMarker.length)}\n${tables}\n${document.slice(end)}`,
    'utf8',
  );
  console.log(`Wrote the tables into ${documentPath}`);
}
