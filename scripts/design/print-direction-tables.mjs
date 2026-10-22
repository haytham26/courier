/**
 * Prints the measured tables of the second round of the studio.
 *
 * The numbers come from `packages/design-tokens` - the same themes and the
 * same contrast maths the build gate uses - so a number in a direction sheet
 * is a measurement and not an estimate.
 *
 *   node scripts/design/print-direction-tables.mjs
 *
 * Writes `docs/design/directions-2/<n>-<name>/evidence/contrast.txt` for the
 * directions of the round and prints the type scale of each. The directions
 * of the other teams (07 to 10) keep the report their own render script
 * writes, so this script does not touch them.
 *
 * The token package has to be built first: `pnpm --filter @courier/design-tokens build`.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const require = createRequire(import.meta.url);
const dist = join(root, 'packages', 'design-tokens', 'dist');

if (!existsSync(join(dist, 'themes.js'))) {
  console.error(
    'print-direction-tables: the token package is not built. Run `pnpm --filter @courier/design-tokens build` first.',
  );
  process.exit(2);
}

const { themes } = require(join(dist, 'themes.js'));
const { labDirections } = require(join(dist, 'directionsLab.js'));
const { themes2a } = require(join(dist, 'themes2a.js'));
const { directions2a } = require(join(dist, 'directions2a.js'));
const { blend, contrastRatioRounded } = require(join(dist, 'contrast.js'));

/** The bars of `docs/design/SYSTEM.md` §6. */
const BARS = { body: 4.5, largeText: 3, driving: 7, nonText: 3 };

/** The roles that carry text on a surface. */
const TEXT_ROLES = [
  'textPrimary',
  'textSecondary',
  'textTertiary',
  'brandPrimary',
  'brandSecondary',
  'success',
  'warning',
  'error',
  'info',
  'statusPending',
  'statusActive',
  'statusDelivered',
  'statusFailed',
  'statusSkipped',
];

/** The roles that paint a filled surface with the inverse label on top. */
const FILLED_ROLES = [
  'brandPrimary',
  'brandSecondary',
  'success',
  'warning',
  'error',
  'statusPending',
  'statusActive',
  'statusDelivered',
  'statusFailed',
  'statusSkipped',
];

const SURFACES = ['background', 'surface', 'surfaceElevated'];

/** The alpha of the badge pill, the way the `Badge` component paints it. */
const BADGE_ALPHA = 0.125;

/** The directions of this team and the folder of each. */
const FOLDERS = {
  voiceRibbon: '04-voice-ribbon',
  xrayParcel: '05-xray-parcel',
  scanline: '06-scanline',
};

/** The directions of the 01 to 03 team and the folder of each. */
const FOLDERS_2A = {
  controlRoom: '01-control-room',
  topo: '02-topo',
  addressFirst: '03-address-first',
};

function pad(value, width) {
  return String(value).padEnd(width);
}

function table(theme) {
  const lines = [];
  const failures = [];

  lines.push(`# ${theme.name} - ${theme.displayName}`);
  lines.push('');
  lines.push(
    `Measured with packages/design-tokens/src/contrast.ts on ${new Date().toISOString().slice(0, 10)}.`,
  );
  lines.push('');
  lines.push('## The surfaces');
  for (const surface of SURFACES) {
    lines.push(`  ${pad(surface, 16)} ${theme.colors[surface]}`);
  }
  lines.push('');

  lines.push('## The text on every surface (bar 4.5:1, and 7:1 for the driving text)');
  lines.push(`  ${pad('role', 17)}${pad('hex', 10)}${pad('background', 12)}${pad('surface', 11)}${pad('elevated', 11)}bar`);
  for (const role of TEXT_ROLES) {
    const value = theme.colors[role];
    const ratios = SURFACES.map((surface) =>
      contrastRatioRounded(value, theme.colors[surface]),
    );
    const bar = role === 'textPrimary' || role === 'textSecondary' ? '7:1 driving' : '4.5:1';
    const target = bar === '7:1 driving' ? BARS.driving : BARS.body;
    if (Math.min(...ratios) < target) {
      failures.push(`${theme.name} ${role} on a surface is ${Math.min(...ratios)}:1`);
    }
    lines.push(
      `  ${pad(role, 17)}${pad(value, 10)}${pad(`${ratios[0].toFixed(2)}:1`, 12)}${pad(
        `${ratios[1].toFixed(2)}:1`,
        11,
      )}${pad(`${ratios[2].toFixed(2)}:1`, 11)}${bar}`,
    );
  }
  lines.push('');

  lines.push('## The boundary (bar 3:1, non-text)');
  for (const surface of SURFACES) {
    const ratio = contrastRatioRounded(theme.colors.border, theme.colors[surface]);
    if (ratio < BARS.nonText) {
      failures.push(`${theme.name} border on the ${surface} is ${ratio}:1`);
    }
    lines.push(`  border ${theme.colors.border} on the ${surface}: ${ratio.toFixed(2)}:1`);
  }
  lines.push('');

  lines.push('## The label on a filled surface (bar 4.5:1)');
  for (const role of FILLED_ROLES) {
    const ratio = contrastRatioRounded(theme.colors.textInverse, theme.colors[role]);
    if (ratio < BARS.body) {
      failures.push(`${theme.name} inverse label on ${role} is ${ratio}:1`);
    }
    lines.push(
      `  ${pad(role, 17)}${pad(theme.colors[role], 10)}inverse ${theme.colors.textInverse}: ${ratio.toFixed(2)}:1`,
    );
  }
  lines.push('');

  lines.push('## The badge pill (the colour at 12.5 % over the surface, bar 4.5:1)');
  for (const role of ['brandPrimary', 'brandSecondary', 'success', 'warning', 'error', 'info']) {
    const pill = blend(theme.colors[role], theme.colors.surface, BADGE_ALPHA);
    const ratio = contrastRatioRounded(theme.colors[role], pill);
    if (ratio < BARS.body) {
      failures.push(`${theme.name} ${role} on its pill is ${ratio}:1`);
    }
    lines.push(`  ${pad(role, 17)}${pad(pill, 10)}${ratio.toFixed(2)}:1`);
  }
  lines.push('');

  lines.push('## The map (the label over the land and over the road, bar 4.5:1)');
  for (const base of ['mapLand', 'mapRoad']) {
    const ratio = contrastRatioRounded(theme.colors.mapText, theme.colors[base]);
    if (ratio < BARS.body) {
      failures.push(`${theme.name} mapText on ${base} is ${ratio}:1`);
    }
    lines.push(`  mapText ${theme.colors.mapText} on ${base} ${theme.colors[base]}: ${ratio.toFixed(2)}:1`);
  }
  lines.push('');

  if (failures.length > 0) {
    lines.push('## The pairs that fail their bar');
    for (const failure of failures) {
      lines.push(`  FAIL ${failure}`);
    }
  } else {
    lines.push('## Every pair above clears its bar.');
  }

  return { text: lines.join('\n'), failures };
}

function typeScale(direction) {
  const lines = [];
  lines.push(`# ${direction.name} - the type scale`);
  lines.push('');
  lines.push(
    `Display family: ${direction.fonts.display}. Text family: ${direction.fonts.text}. Licence: ${direction.fonts.licence}.`,
  );
  lines.push('');
  lines.push(`  ${pad('step', 10)}${pad('size', 8)}${pad('leading', 10)}${pad('tracking', 11)}weight`);
  for (const [step, value] of Object.entries(direction.type)) {
    lines.push(
      `  ${pad(step, 10)}${pad(`${value.fontSize}px`, 8)}${pad(`${value.lineHeight}px`, 10)}${pad(
        `${value.letterSpacing}em`,
        11,
      )}${value.fontWeight}`,
    );
  }
  return lines.join('\n');
}

/** The type scale of a direction that carries the licence of each family. */
function typeScale2a(direction) {
  const lines = [];
  lines.push(`# ${direction.name} - the type scale`);
  lines.push('');
  lines.push(
    `Display family: ${direction.fonts.display} (${direction.fonts.displayLicence}). Work family: ${direction.fonts.work} (${direction.fonts.workLicence}).`,
  );
  lines.push('');
  lines.push(`  ${pad('step', 10)}${pad('size', 8)}${pad('leading', 10)}${pad('tracking', 11)}weight`);
  for (const [step, value] of Object.entries(direction.type)) {
    lines.push(
      `  ${pad(step, 10)}${pad(`${value.fontSize}px`, 8)}${pad(`${value.lineHeight}px`, 10)}${pad(
        `${value.letterSpacing}em`,
        11,
      )}${value.fontWeight}`,
    );
  }
  return lines.join('\n');
}

let failed = 0;

for (const [name, folder] of Object.entries(FOLDERS)) {
  const direction = labDirections[name];
  const day = table(themes[direction.themeName]);
  const night = table(themes[direction.nightThemeName]);

  const target = join(root, 'docs', 'design', 'directions-2', folder, 'evidence');
  mkdirSync(target, { recursive: true });
  writeFileSync(join(target, 'contrast.txt'), `${day.text}\n\n${night.text}\n`, 'utf8');

  console.log(`\n===== ${name} =====`);
  console.log(typeScale(direction));
  console.log('');
  console.log(day.text);

  failed += day.failures.length + night.failures.length;
}

for (const [name, folder] of Object.entries(FOLDERS_2A)) {
  const direction = directions2a[name];
  const day = table(themes2a[direction.themeName]);
  const night = table(themes2a[direction.nightThemeName]);

  const target = join(root, 'docs', 'design', 'directions-2', folder, 'evidence');
  mkdirSync(target, { recursive: true });
  writeFileSync(join(target, 'contrast.txt'), `${day.text}\n\n${night.text}\n`, 'utf8');

  console.log(`\n===== ${name} =====`);
  console.log(typeScale2a(direction));
  console.log('');
  console.log(day.text);

  failed += day.failures.length + night.failures.length;
}

if (failed > 0) {
  console.error(`\nprint-direction-tables: ${failed} pair(s) below their bar.`);
  process.exit(1);
}

console.log('\nprint-direction-tables: every measured pair clears its bar.');
