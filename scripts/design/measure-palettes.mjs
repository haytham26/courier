/**
 * Measures the candidate palettes of `docs/design/RESEARCH-2.md` against the
 * WCAG 2.2 bars of `docs/design/SYSTEM.md` §6, using the maths in
 * `packages/design-tokens/src/contrast.ts` (the same code the build gate
 * uses, so the numbers cannot drift from the implementation).
 *
 *   node scripts/design/measure-palettes.mjs
 *
 * Writes `docs/design/evidence/palette-contrast-research2-<date>.tsv`.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const { contrastRatioRounded, blend } = await import(
  pathToFileURL(join(here, '..', '..', 'packages', 'design-tokens', 'src', 'contrast.ts')).href
);

const BARS = { body: 4.5, largeText: 3, driving: 7, nonText: 3 };

/** The role list every palette must fill. */
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
];
const NON_TEXT_ROLES = ['border', 'stopPin', 'routeLine', 'userLocation'];

const palettes = [
  {
    name: 'hivis',
    day: {
      background: '#f2f3f0',
      surface: '#ffffff',
      surfaceElevated: '#e9ebe5',
      textPrimary: '#14161a',
      textSecondary: '#454a4f',
      textTertiary: '#50555a',
      textInverse: '#ffffff',
      brandPrimary: '#a63a00',
      brandSecondary: '#14563c',
      success: '#14603c',
      warning: '#7a4a00',
      error: '#a01810',
      info: '#14495f',
      border: '#6b7067',
      mapBackground: '#e9ebe5',
      mapWater: '#d6e4ea',
      mapLand: '#f0f1ec',
      mapRoad: '#ffffff',
      mapHighway: '#f2c94c',
      mapBuilding: '#e0e2db',
      mapPark: '#dae6d0',
      mapText: '#14161a',
      stopPin: '#a63a00',
      routeLine: '#a63a00',
      userLocation: '#14495f',
    },
    night: {
      background: '#101311',
      surface: '#181c19',
      surfaceElevated: '#212622',
      textPrimary: '#f4f5f2',
      textSecondary: '#c3c8c2',
      textTertiary: '#a9afa9',
      textInverse: '#101311',
      brandPrimary: '#e07a35',
      brandSecondary: '#5fae86',
      success: '#59b184',
      warning: '#d8a83c',
      error: '#e8736a',
      info: '#6fa9c4',
      border: '#7b837a',
      mapBackground: '#181c19',
      mapWater: '#1d2a30',
      mapLand: '#212622',
      mapRoad: '#3a4039',
      mapHighway: '#8a7433',
      mapBuilding: '#2b302b',
      mapPark: '#243026',
      mapText: '#f4f5f2',
      stopPin: '#e07a35',
      routeLine: '#e07a35',
      userLocation: '#6fa9c4',
    },
  },
  {
    name: 'harbour',
    day: {
      background: '#eef2f4',
      surface: '#ffffff',
      surfaceElevated: '#e4ebee',
      textPrimary: '#0d161a',
      textSecondary: '#3c4d55',
      textTertiary: '#47585f',
      textInverse: '#ffffff',
      brandPrimary: '#0a4a63',
      brandSecondary: '#a8461b',
      success: '#14603c',
      warning: '#7a4e00',
      error: '#a11e18',
      info: '#0a4a63',
      border: '#5d6f77',
      mapBackground: '#e4ebee',
      mapWater: '#cfe1e9',
      mapLand: '#eff2f3',
      mapRoad: '#ffffff',
      mapHighway: '#f0c674',
      mapBuilding: '#e1e7ea',
      mapPark: '#d8e6dd',
      mapText: '#0d161a',
      stopPin: '#0a4a63',
      routeLine: '#a8461b',
      userLocation: '#0a4a63',
    },
    night: {
      background: '#0c1114',
      surface: '#141b1f',
      surfaceElevated: '#1c252a',
      textPrimary: '#f2f6f8',
      textSecondary: '#bccbd1',
      textTertiary: '#9fb2b9',
      textInverse: '#0c1114',
      brandPrimary: '#5fa6c4',
      brandSecondary: '#e08148',
      success: '#59b184',
      warning: '#d8a83c',
      error: '#e8736a',
      info: '#5fa6c4',
      border: '#6f8189',
      mapBackground: '#141b1f',
      mapWater: '#16262e',
      mapLand: '#1c252a',
      mapRoad: '#38454c',
      mapHighway: '#7d6a3a',
      mapBuilding: '#242f35',
      mapPark: '#1f2c27',
      mapText: '#f2f6f8',
      stopPin: '#5fa6c4',
      routeLine: '#e08148',
      userLocation: '#5fa6c4',
    },
  },
  {
    name: 'signal',
    day: {
      background: '#f3f3f1',
      surface: '#ffffff',
      surfaceElevated: '#e9e9e5',
      textPrimary: '#101112',
      textSecondary: '#43453f',
      textTertiary: '#4e504a',
      textInverse: '#ffffff',
      brandPrimary: '#b3261e',
      brandSecondary: '#1d2a33',
      success: '#1d5b34',
      warning: '#7a4a00',
      error: '#b3261e',
      info: '#1d2a33',
      border: '#6d6d68',
      mapBackground: '#e9e9e5',
      mapWater: '#dde2e3',
      mapLand: '#f2f2ef',
      mapRoad: '#ffffff',
      mapHighway: '#e7d9a8',
      mapBuilding: '#e2e2dd',
      mapPark: '#dfe5db',
      mapText: '#101112',
      stopPin: '#b3261e',
      routeLine: '#b3261e',
      userLocation: '#1d2a33',
    },
    night: {
      background: '#111110',
      surface: '#191918',
      surfaceElevated: '#232322',
      textPrimary: '#f6f6f4',
      textSecondary: '#c6c6c1',
      textTertiary: '#acaca6',
      textInverse: '#111110',
      brandPrimary: '#e0524a',
      brandSecondary: '#8fa4b3',
      success: '#5cb083',
      warning: '#d8a83c',
      error: '#e0524a',
      info: '#8fa4b3',
      border: '#77776f',
      mapBackground: '#191918',
      mapWater: '#1e2325',
      mapLand: '#232322',
      mapRoad: '#3c3c39',
      mapHighway: '#7a6c40',
      mapBuilding: '#2c2c2a',
      mapPark: '#262d26',
      mapText: '#f6f6f4',
      stopPin: '#e0524a',
      routeLine: '#e0524a',
      userLocation: '#8fa4b3',
    },
  },
  {
    name: 'kelp',
    day: {
      background: '#eff2ec',
      surface: '#ffffff',
      surfaceElevated: '#e5eae0',
      textPrimary: '#131810',
      textSecondary: '#3f4a3a',
      textTertiary: '#4a5546',
      textInverse: '#ffffff',
      brandPrimary: '#1d5b34',
      brandSecondary: '#8c4a12',
      success: '#1d5b34',
      warning: '#7a4a00',
      error: '#a11e18',
      info: '#14495f',
      border: '#647060',
      mapBackground: '#e5eae0',
      mapWater: '#d5e4dd',
      mapLand: '#eef1ea',
      mapRoad: '#ffffff',
      mapHighway: '#e8cf72',
      mapBuilding: '#e0e5da',
      mapPark: '#d4e2c9',
      mapText: '#131810',
      stopPin: '#1d5b34',
      routeLine: '#8c4a12',
      userLocation: '#14495f',
    },
    night: {
      background: '#0f1310',
      surface: '#171c18',
      surfaceElevated: '#1f2620',
      textPrimary: '#f2f5ef',
      textSecondary: '#c1cbbf',
      textTertiary: '#a9b5a7',
      textInverse: '#0f1310',
      brandPrimary: '#63b183',
      brandSecondary: '#d2823f',
      success: '#63b183',
      warning: '#d8a83c',
      error: '#e8736a',
      info: '#6fa9c4',
      border: '#75806f',
      mapBackground: '#171c18',
      mapWater: '#1a2620',
      mapLand: '#1f2620',
      mapRoad: '#374037',
      mapHighway: '#7e6f36',
      mapBuilding: '#272e27',
      mapPark: '#212b20',
      mapText: '#f2f5ef',
      stopPin: '#63b183',
      routeLine: '#d2823f',
      userLocation: '#6fa9c4',
    },
  },
  {
    name: 'ferry',
    day: {
      background: '#f1f1f4',
      surface: '#ffffff',
      surfaceElevated: '#e7e7ec',
      textPrimary: '#111318',
      textSecondary: '#414551',
      textTertiary: '#4c505c',
      textInverse: '#ffffff',
      brandPrimary: '#1f3f8f',
      brandSecondary: '#b0451b',
      success: '#14603c',
      warning: '#7a4a00',
      error: '#a11e18',
      info: '#1f3f8f',
      border: '#636675',
      mapBackground: '#e7e7ec',
      mapWater: '#d9dfe9',
      mapLand: '#f0f0f3',
      mapRoad: '#ffffff',
      mapHighway: '#eccb78',
      mapBuilding: '#e4e4ea',
      mapPark: '#dde5d9',
      mapText: '#111318',
      stopPin: '#1f3f8f',
      routeLine: '#b0451b',
      userLocation: '#1f3f8f',
    },
    night: {
      background: '#0e1015',
      surface: '#161920',
      surfaceElevated: '#1e222b',
      textPrimary: '#f1f3f8',
      textSecondary: '#bcc0cc',
      textTertiary: '#9ea3b1',
      textInverse: '#0e1015',
      brandPrimary: '#7d9ae0',
      brandSecondary: '#e08148',
      success: '#59b184',
      warning: '#d8a83c',
      error: '#e8736a',
      info: '#7d9ae0',
      border: '#6e7280',
      mapBackground: '#161920',
      mapWater: '#19202c',
      mapLand: '#1e222b',
      mapRoad: '#3a3f4b',
      mapHighway: '#7d6a3a',
      mapBuilding: '#262a34',
      mapPark: '#1f2620',
      mapText: '#f1f3f8',
      stopPin: '#7d9ae0',
      routeLine: '#e08148',
      userLocation: '#7d9ae0',
    },
  },
  {
    name: 'clay',
    day: {
      background: '#f2f0f1',
      surface: '#ffffff',
      surfaceElevated: '#e8e5e6',
      textPrimary: '#151314',
      textSecondary: '#4a4547',
      textTertiary: '#55504f',
      textInverse: '#ffffff',
      brandPrimary: '#8c3b1a',
      brandSecondary: '#2f5d5a',
      success: '#1d5b34',
      warning: '#7a4a00',
      error: '#a11e18',
      info: '#2f5d5a',
      border: '#6b6567',
      mapBackground: '#e8e5e6',
      mapWater: '#dbe2e0',
      mapLand: '#f1efef',
      mapRoad: '#ffffff',
      mapHighway: '#e9d3a4',
      mapBuilding: '#e3e0e1',
      mapPark: '#dde4da',
      mapText: '#151314',
      stopPin: '#8c3b1a',
      routeLine: '#2f5d5a',
      userLocation: '#2f5d5a',
    },
    night: {
      background: '#131011',
      surface: '#1c1918',
      surfaceElevated: '#252220',
      textPrimary: '#f5f1ef',
      textSecondary: '#c8c1bd',
      textTertiary: '#afa7a3',
      textInverse: '#131011',
      brandPrimary: '#dd8256',
      brandSecondary: '#71b3ae',
      success: '#59b184',
      warning: '#d8a83c',
      error: '#e8736a',
      info: '#71b3ae',
      border: '#7d7674',
      mapBackground: '#1c1918',
      mapWater: '#1e2422',
      mapLand: '#252220',
      mapRoad: '#403b38',
      mapHighway: '#7d6c47',
      mapBuilding: '#2e2a28',
      mapPark: '#242b25',
      mapText: '#f5f1ef',
      stopPin: '#dd8256',
      routeLine: '#71b3ae',
      userLocation: '#71b3ae',
    },
  },
];

const rows = [];
const failures = [];

function measure(palette, mode, colours) {
  const background = colours.background;
  const surface = colours.surface;
  for (const role of TEXT_ROLES) {
    const value = colours[role];
    const onBackground = contrastRatioRounded(value, background);
    const onSurface = contrastRatioRounded(value, surface);
    const inverse = contrastRatioRounded(value, colours.textInverse);
    const pass = onBackground >= BARS.body && onSurface >= BARS.body;
    if (!pass) {
      failures.push(`${palette} ${mode} ${role} ${onBackground}:1 on background`);
    }
    rows.push({
      palette,
      mode,
      role,
      hex: value,
      onBackground: `${onBackground}:1`,
      onSurface: `${onSurface}:1`,
      inverseOnRole: `${inverse}:1`,
      bar: '4.5:1 (body)',
      result: pass ? 'PASS' : 'FAIL',
    });
  }
  for (const role of NON_TEXT_ROLES) {
    const value = colours[role];
    const onBackground = contrastRatioRounded(value, background);
    const onLand = contrastRatioRounded(value, colours.mapLand);
    const pass = onBackground >= BARS.nonText && onLand >= BARS.nonText;
    if (!pass) {
      failures.push(`${palette} ${mode} ${role} ${onBackground}:1 on background`);
    }
    rows.push({
      palette,
      mode,
      role,
      hex: value,
      onBackground: `${onBackground}:1`,
      onSurface: `${onLand}:1`,
      inverseOnRole: '',
      bar: '3:1 (non-text)',
      result: pass ? 'PASS' : 'FAIL',
    });
  }
  // The badge tint: the status colour at 12.5 % over the surface, as in themes.ts.
  // On a light theme the chip carries the status colour as its text; on a dark
  // theme a 12.5 % tint of a light colour over a dark surface is unreadable,
  // so the chip carries the primary text colour instead.
  for (const role of ['brandPrimary', 'success', 'warning', 'error']) {
    const tint = blend(colours[role], surface, 0.125);
    const chipText = mode === 'night' ? colours.textPrimary : colours[role];
    const ratio = contrastRatioRounded(chipText, tint);
    const pass = ratio >= BARS.body;
    if (!pass) {
      failures.push(`${palette} ${mode} ${role} tint ${ratio}:1`);
    }
    rows.push({
      palette,
      mode,
      role: `${role}@12.5%`,
      hex: tint,
      onBackground: `${ratio}:1`,
      onSurface: '',
      inverseOnRole: '',
      bar: '4.5:1 (body)',
      result: pass ? 'PASS' : 'FAIL',
    });
  }
  // The driving text of the night theme: 7:1.
  if (mode === 'night') {
    const driving = contrastRatioRounded(colours.textPrimary, background);
    const brand = contrastRatioRounded(colours.brandPrimary, background);
    const pass = driving >= BARS.driving && brand >= BARS.body;
    if (!pass) {
      failures.push(`${palette} night driving text ${driving}:1`);
    }
    rows.push({
      palette,
      mode,
      role: 'drivingText (textPrimary on background)',
      hex: colours.textPrimary,
      onBackground: `${driving}:1`,
      onSurface: `${contrastRatioRounded(colours.textPrimary, surface)}:1`,
      inverseOnRole: '',
      bar: '7:1 (driving)',
      result: pass ? 'PASS' : 'FAIL',
    });
    rows.push({
      palette,
      mode,
      role: 'night brandPrimary on background',
      hex: colours.brandPrimary,
      onBackground: `${brand}:1`,
      onSurface: '',
      inverseOnRole: '',
      bar: '4.5:1 (body)',
      result: brand >= BARS.body ? 'PASS' : 'FAIL',
    });
  }
  // The map text on the land and on the road.
  for (const base of ['mapLand', 'mapRoad']) {
    const ratio = contrastRatioRounded(colours.mapText, colours[base]);
    const pass = ratio >= BARS.body;
    if (!pass) {
      failures.push(`${palette} ${mode} mapText on ${base} ${ratio}:1`);
    }
    rows.push({
      palette,
      mode,
      role: `mapText on ${base}`,
      hex: colours.mapText,
      onBackground: `${ratio}:1`,
      onSurface: '',
      inverseOnRole: '',
      bar: '4.5:1 (body)',
      result: pass ? 'PASS' : 'FAIL',
    });
  }
}

for (const palette of palettes) {
  measure(palette.name, 'day', palette.day);
  measure(palette.name, 'night', palette.night);
}

const date = new Date().toISOString().slice(0, 10);
const outPath = join(
  here,
  '..',
  '..',
  'docs',
  'design',
  'evidence',
  `palette-contrast-research2-${date}.tsv`,
);
const header = [
  'palette',
  'mode',
  'role',
  'hex',
  'onBackground',
  'onSurface',
  'inverseOnRole',
  'bar',
  'result',
];
const body = rows.map((row) => header.map((key) => `"${row[key]}"`).join('\t'));
writeFileSync(outPath, [header.join('\t'), ...body].join('\n'), 'utf8');

console.log(`Wrote ${rows.length} measurements to ${outPath}`);
if (failures.length > 0) {
  console.log('FAILURES:');
  for (const failure of failures) console.log(`  ${failure}`);
} else {
  console.log('All measurements pass their bar.');
}
