/**
 * Prints the palette tables of `docs/design/RESEARCH-2.md` from the measured
 * snapshot, so the numbers in the document cannot drift from the measurement.
 *
 *   node scripts/design/print-palette-tables.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const date = new Date().toISOString().slice(0, 10);
const path = join(
  here,
  '..',
  '..',
  'docs',
  'design',
  'evidence',
  `palette-contrast-research2-${date}.tsv`,
);
const lines = readFileSync(path, 'utf8').split('\n').filter(Boolean);
const header = lines[0].split('\t').map((cell) => cell.replace(/"/g, ''));
const rows = lines.slice(1).map((line) => {
  const cells = line.split('\t').map((cell) => cell.replace(/"/g, ''));
  return Object.fromEntries(header.map((key, index) => [key, cells[index]]));
});

const labels = {
  background: 'background',
  surface: 'surface',
  surfaceElevated: 'surfaceElevated',
  textPrimary: 'textPrimary',
  textSecondary: 'textSecondary',
  textTertiary: 'textTertiary',
  brandPrimary: 'brandPrimary',
  brandSecondary: 'brandSecondary',
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
  border: 'border (3:1 bar)',
  stopPin: 'stopPin',
  routeLine: 'routeLine',
  userLocation: 'userLocation',
};

const palettes = [...new Set(rows.map((row) => row.palette))];

for (const palette of palettes) {
  console.log(`\n#### ${palette}\n`);
  console.log(
    '| role | day hex | day on background | day on surface | night hex | night on background | night on surface |',
  );
  console.log('| --- | --- | --- | --- | --- | --- | --- |');
  const day = rows.filter((row) => row.palette === palette && row.mode === 'day');
  const night = rows.filter((row) => row.palette === palette && row.mode === 'night');
  for (const role of Object.keys(labels)) {
    const dayRow = day.find((row) => row.role === role);
    const nightRow = night.find((row) => row.role === role);
    if (!dayRow) continue;
    console.log(
      `| ${labels[role]} | \`${dayRow.hex}\` | ${dayRow.onBackground} | ${dayRow.onSurface} | \`${nightRow.hex}\` | ${nightRow.onBackground} | ${nightRow.onSurface} |`,
    );
  }
  const driving = night.find((row) => row.role.startsWith('drivingText'));
  const badge = day.filter((row) => row.role.endsWith('@12.5%'));
  console.log(
    `| night driving text (7:1 bar) | | | | | ${driving.onBackground} | ${driving.onSurface} |`,
  );
  for (const badgeRow of badge) {
    console.log(
      `| chip: ${badgeRow.role} | \`${badgeRow.hex}\` | ${badgeRow.onBackground} | | | | |`,
    );
  }
  const mapRows = rows.filter(
    (row) => row.palette === palette && row.role.startsWith('mapText on'),
  );
  for (const mapRow of mapRows) {
    console.log(`| ${mapRow.role} | | ${mapRow.onBackground} | | | | |`);
  }
}
