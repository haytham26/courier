/**
 * The palettes of the second round of the Design Studio
 * (MASTER_EXECUTION §13.6).
 *
 * Every direction of the round answers the same brief
 * (`docs/design/SPEC.md`), so every direction takes **one** palette from
 * `docs/design/RESEARCH-2.md` §5.2 - the six palettes that were measured
 * there against the bars of `docs/design/SYSTEM.md` §6 - and every direction
 * takes its **adapted night palette** from the same row.
 *
 * The eight themes below are four directions, each with a light theme and a
 * night theme, in the semantic roles of `day` and `night`. A component never
 * grows a direction-named role: it reads `textPrimary`, `surface`,
 * `brandPrimary` and the rest, and the theme decides what those are.
 *
 * The palettes are not invented here. They are the measured rows of
 * `docs/design/RESEARCH-2.md` §5.2, and the one change the research allows -
 * a hex that has to be re-measured - is written in the comment of the theme
 * it touches and proved by `contrast.test.ts`.
 *
 * | Direction | Palette | Day accent | Night accent |
 * | --------- | ------- | ---------- | ------------ |
 * | Weather Light | P2 Harbour | `#0a4a63` sea blue | `#5fa6c4` |
 * | Haptic City | P4 Kelp | `#1d5b34` kelp green | `#63b183` |
 * | Night Shift | P6 Clay | `#8c3b1a` burnt sienna | `#dd8256` |
 * | Gantry Run | P3 Signal | `#b3261e` vermilion | `#f2726a` |
 */

import { borderRadius, components, motion, shadows, spacing, typography } from './tokens';
import type { Theme, ThemeColors } from './themes';

/**
 * The shared tokens every theme carries.
 *
 * It is the same base `themes.ts` uses. The file cannot import it from there
 * without a cycle at run time, so the six token groups are read from the
 * token package instead: the values are the same objects.
 */
const baseTheme = { spacing, typography, borderRadius, shadows, motion, components };

/**
 * The theme names of the second round.
 *
 * A direction is written as its light theme and its night theme, with the
 * same name and the `Night` suffix, so the pair is obvious in a list.
 */
export type Theme2Name =
  | 'weatherLight'
  | 'weatherLightNight'
  | 'hapticCity'
  | 'hapticCityNight'
  | 'nightShift'
  | 'nightShiftNight'
  | 'gantryRun'
  | 'gantryRunNight';

/**
 * The colours of one direction, in the semantic roles.
 *
 * `ThemeColors` has an index signature, so a palette that misses a role
 * would still type-check; the roles below are therefore written out in full.
 */
type Palette = ThemeColors;

/** P2 Harbour - the day palette of Weather Light (RESEARCH-2 §5.2). */
const harbourDay: Palette = {
  background: '#eef2f4',
  surface: '#ffffff',
  surfaceElevated: '#e4ebee',
  overlay: '#00000080',
  border: '#5d6f77',
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
  statusPending: '#3c4d55',
  statusActive: '#0a4a63',
  statusDelivered: '#14603c',
  statusFailed: '#a11e18',
  statusSkipped: '#7a4e00',
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
};

/** P2 Harbour - the night palette of Weather Light. */
const harbourNight: Palette = {
  background: '#0c1114',
  surface: '#141b1f',
  surfaceElevated: '#1c252a',
  overlay: '#00000080',
  border: '#6f8189',
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
  statusPending: '#bccbd1',
  statusActive: '#5fa6c4',
  statusDelivered: '#59b184',
  statusFailed: '#e8736a',
  statusSkipped: '#d8a83c',
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
};

/** P4 Kelp - the day palette of Haptic City (RESEARCH-2 §5.2). */
const kelpDay: Palette = {
  background: '#eff2ec',
  surface: '#ffffff',
  surfaceElevated: '#e5eae0',
  overlay: '#00000080',
  border: '#647060',
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
  statusPending: '#3f4a3a',
  statusActive: '#1d5b34',
  statusDelivered: '#1d5b34',
  statusFailed: '#a11e18',
  statusSkipped: '#7a4a00',
  mapBackground: '#e8eae4',
  mapWater: '#dde0da',
  mapLand: '#eff0ec',
  mapRoad: '#ffffff',
  mapHighway: '#c8ccc3',
  mapBuilding: '#e1e3dd',
  mapPark: '#dfe2d8',
  mapText: '#131810',
  stopPin: '#1d5b34',
  routeLine: '#1d5b34',
  userLocation: '#131810',
};

/**
 * P4 Kelp - the night palette of Haptic City.
 *
 * The map is a monochrome ramp: the direction uses colour almost nowhere, so
 * the land, the water and the roads are greys and the route is the only
 * chromatic line on the map.
 */
const kelpNight: Palette = {
  background: '#0f1310',
  surface: '#171c18',
  surfaceElevated: '#1f2620',
  overlay: '#00000080',
  border: '#75806f',
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
  statusPending: '#c1cbbf',
  statusActive: '#63b183',
  statusDelivered: '#63b183',
  statusFailed: '#e8736a',
  statusSkipped: '#d8a83c',
  mapBackground: '#171c18',
  mapWater: '#1e2320',
  mapLand: '#1f2620',
  mapRoad: '#3a4039',
  mapHighway: '#6f7469',
  mapBuilding: '#272e27',
  mapPark: '#212b20',
  mapText: '#f2f5ef',
  stopPin: '#63b183',
  routeLine: '#63b183',
  userLocation: '#f2f5ef',
};

/** P6 Clay - the day palette of Night Shift (RESEARCH-2 §5.2). */
const clayDay: Palette = {
  background: '#f2f0f1',
  surface: '#ffffff',
  surfaceElevated: '#e8e5e6',
  overlay: '#00000080',
  border: '#6b6567',
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
  statusPending: '#4a4547',
  statusActive: '#8c3b1a',
  statusDelivered: '#1d5b34',
  statusFailed: '#a11e18',
  statusSkipped: '#7a4a00',
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
};

/** P6 Clay - the night palette of Night Shift. */
const clayNight: Palette = {
  background: '#131011',
  surface: '#1c1918',
  surfaceElevated: '#252220',
  overlay: '#00000080',
  border: '#7d7674',
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
  statusPending: '#c8c1bd',
  statusActive: '#dd8256',
  statusDelivered: '#59b184',
  statusFailed: '#e8736a',
  statusSkipped: '#d8a83c',
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
};

/** P3 Signal - the day palette of Gantry Run (RESEARCH-2 §5.2). */
const signalDay: Palette = {
  background: '#f3f3f1',
  surface: '#ffffff',
  surfaceElevated: '#e9e9e5',
  overlay: '#00000080',
  border: '#6d6d68',
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
  statusPending: '#43453f',
  statusActive: '#b3261e',
  statusDelivered: '#1d5b34',
  statusFailed: '#b3261e',
  statusSkipped: '#7a4a00',
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
};

/**
 * P3 Signal - the night palette of Gantry Run.
 *
 * **The one measured change of the round.** The measured row of RESEARCH-2
 * §5.2 carries `#e0524a` for the night accent, and the chip of that colour
 * on the dark surface is 4.02:1 - under the 4.5:1 bar of `SYSTEM.md` §6, so
 * the build gate would fail. The accent is lifted to `#f2726a`, which keeps
 * the hue of the vermilion and measures 5.20:1 on the same chip and 6.65:1 on
 * the night background. The change is proved by `contrast.test.ts` and by
 * `scripts/design/measure-palettes.mjs`.
 */
const signalNight: Palette = {
  background: '#111110',
  surface: '#191918',
  surfaceElevated: '#232322',
  overlay: '#00000080',
  border: '#77776f',
  textPrimary: '#f6f6f4',
  textSecondary: '#c6c6c1',
  textTertiary: '#acaca6',
  textInverse: '#111110',
  brandPrimary: '#f2726a',
  brandSecondary: '#8fa4b3',
  success: '#5cb083',
  warning: '#d8a83c',
  error: '#f2726a',
  info: '#8fa4b3',
  statusPending: '#c6c6c1',
  statusActive: '#f2726a',
  statusDelivered: '#5cb083',
  statusFailed: '#f2726a',
  statusSkipped: '#d8a83c',
  mapBackground: '#191918',
  mapWater: '#1e2325',
  mapLand: '#232322',
  mapRoad: '#3c3c39',
  mapHighway: '#7a6c40',
  mapBuilding: '#2c2c2a',
  mapPark: '#262d26',
  mapText: '#f6f6f4',
  stopPin: '#f2726a',
  routeLine: '#f2726a',
  userLocation: '#8fa4b3',
};

/**
 * Builds a theme of the round from its palette.
 *
 * The theme carries the shared tokens of the contract - the spacing, the
 * type scale, the radii, the elevation and the motion - and the palette
 * gives it its colours.
 */
function themeOf(name: Theme2Name, displayName: string, colors: Palette): Theme {
  return { ...baseTheme, name, displayName, colors };
}

/**
 * The eight themes of the second round.
 *
 * The order is the order of the founder's pack: the four directions, each
 * with its light theme first.
 */
export const themes2: Record<Theme2Name, Theme> = {
  weatherLight: themeOf('weatherLight', 'Weather Light', harbourDay),
  weatherLightNight: themeOf('weatherLightNight', 'Weather Light Night', harbourNight),
  hapticCity: themeOf('hapticCity', 'Haptic City', kelpDay),
  hapticCityNight: themeOf('hapticCityNight', 'Haptic City Night', kelpNight),
  nightShift: themeOf('nightShift', 'Night Shift', clayDay),
  nightShiftNight: themeOf('nightShiftNight', 'Night Shift Night', clayNight),
  gantryRun: themeOf('gantryRun', 'Gantry Run', signalDay),
  gantryRunNight: themeOf('gantryRunNight', 'Gantry Run Night', signalNight),
};