/**
 * The palettes of directions 01 to 03 of the second round of the Design Studio
 * (MASTER_EXECUTION §13.6).
 *
 * Every direction of the round answers the same brief
 * (`docs/design/SPEC.md`), so every direction takes **one** palette from
 * `docs/design/RESEARCH-2.md` §5.2 - the six palettes that were measured
 * there against the bars of `docs/design/SYSTEM.md` §6 - and every direction
 * takes its **adapted night palette** from the same row.
 *
 * The six themes below are three directions, each with a light theme and a
 * night theme, in the semantic roles of `day` and `night`. A component never
 * grows a direction-named role: it reads `textPrimary`, `surface`,
 * `brandPrimary` and the rest, and the theme decides what those are.
 *
 * **Why the palettes are not the ones the seeds name.** The seeds of
 * `docs/design/RESEARCH-2.md` §6 give P3 Signal to Control Room, P4 Kelp to
 * Topo and P2 Harbour to Address First. The same section of the research
 * gives P3 Signal to Scanline, P4 Kelp to X-ray Parcel and P2 Harbour to
 * Weather Light, and the round rule of `docs/design/REVIEW.md` §9 is that no
 * two directions of the round may share an accent family. A direction that
 * takes the palette of the research unchanged would therefore collide with
 * the direction that already holds it.
 *
 * Each direction below keeps the *character* of its seed and takes the
 * palette that carries an accent family of its own:
 *
 * | Direction | Seed | Palette taken | Day accent | Second chromatic colour |
 * | --------- | ---- | ------------- | ---------- | ----------------------- |
 * | 01 Control Room | P3 Signal | **P1 HiVis** | `#a63a00` safety orange | `#14563c` kelp green |
 * | 02 Topo | P4 Kelp | **P6 Clay**, roles swapped | `#2f5d5a` teal | `#8c3b1a` burnt sienna |
 * | 03 Address First | P2 Harbour | **P5 Ferry** | `#1f3f8f` deep blue | `#b0451b` rust |
 *
 * Topo takes the P6 Clay palette with the two chromatic colours the other way
 * round: the teal is the survey line and the sienna is the marker, where the
 * direction that already holds Clay makes the sienna its accent. The
 * measured values are the rows of `docs/design/RESEARCH-2.md` §5.2, and every
 * pair is proved by `contrast.test.ts`.
 */

import { borderRadius, components, motion, shadows, spacing, typography } from './tokens';
import type { Theme, ThemeColors } from './themes';
import type { MapPalette } from './mapPalettes';

/**
 * The shared tokens every theme carries.
 *
 * It is the same base `themes.ts` uses. The file cannot import it from there
 * without a cycle at run time, so the six token groups are read from the
 * token package instead: the values are the same objects.
 */
const baseTheme = { spacing, typography, borderRadius, shadows, motion, components };

/**
 * The theme names of directions 01 to 03.
 *
 * A direction is written as its light theme and its night theme, with the
 * same name and the `Night` suffix, so the pair is obvious in a list.
 */
export type Theme2aName =
  | 'controlRoom'
  | 'controlRoomNight'
  | 'topo'
  | 'topoNight'
  | 'addressFirst'
  | 'addressFirstNight';

/**
 * The colours of one direction, in the semantic roles.
 *
 * `ThemeColors` has an index signature, so a palette that misses a role
 * would still type-check; the roles below are therefore written out in full.
 */
type Palette = ThemeColors;

/**
 * P1 HiVis - the day palette of Control Room (RESEARCH-2 §5.2).
 *
 * Safety orange and kelp green on a cool white: the colours of the road
 * works, of the hi-vis on the courier's vest and of the sign at the end of
 * the street. The orange is the one bright thing on the panel.
 */
const hivisDay: Palette = {
  background: '#f2f3f0',
  surface: '#ffffff',
  surfaceElevated: '#e9ebe5',
  overlay: '#00000080',
  border: '#6b7067',
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
  statusPending: '#454a4f',
  statusActive: '#a63a00',
  statusDelivered: '#14603c',
  statusFailed: '#a01810',
  statusSkipped: '#7a4a00',
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
};

/**
 * P1 HiVis - the night palette of Control Room.
 *
 * The panel at night: a cool near-black (#101311, blue channel 17), the
 * orange dimmed to `#e07a35` so it is a lamp and not a flare, and the kelp
 * green as the second line of the instrument.
 */
const hivisNight: Palette = {
  background: '#101311',
  surface: '#181c19',
  surfaceElevated: '#212622',
  overlay: '#00000080',
  border: '#7b837a',
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
  statusPending: '#c3c8c2',
  statusActive: '#e07a35',
  statusDelivered: '#59b184',
  statusFailed: '#e8736a',
  statusSkipped: '#d8a83c',
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
};

/**
 * P6 Clay - the day palette of Topo, with the two chromatic colours the other
 * way round (RESEARCH-2 §5.2).
 *
 * The teal is the survey line and the sienna is the marker. The paper of the
 * chart is a cool white, not a warm one: the direction is a survey of the
 * Canterbury landscape, not a ledger on a desk.
 */
const clayDayTopo: Palette = {
  background: '#f2f0f1',
  surface: '#ffffff',
  surfaceElevated: '#e8e5e6',
  overlay: '#00000080',
  border: '#6b6567',
  textPrimary: '#151314',
  textSecondary: '#4a4547',
  textTertiary: '#55504f',
  textInverse: '#ffffff',
  brandPrimary: '#2f5d5a',
  brandSecondary: '#8c3b1a',
  success: '#1d5b34',
  warning: '#7a4a00',
  error: '#a11e18',
  info: '#2f5d5a',
  statusPending: '#4a4547',
  statusActive: '#2f5d5a',
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
  stopPin: '#2f5d5a',
  routeLine: '#8c3b1a',
  userLocation: '#2f5d5a',
};

/**
 * P6 Clay - the night palette of Topo.
 *
 * A warm near-black (#131011, blue channel 17), the survey line a cool
 * `#71b3ae` and the marker a dimmed `#dd8256`.
 */
const clayNightTopo: Palette = {
  background: '#131011',
  surface: '#1c1918',
  surfaceElevated: '#252220',
  overlay: '#00000080',
  border: '#7d7674',
  textPrimary: '#f5f1ef',
  textSecondary: '#c8c1bd',
  textTertiary: '#afa7a3',
  textInverse: '#131011',
  brandPrimary: '#71b3ae',
  brandSecondary: '#dd8256',
  success: '#59b184',
  warning: '#d8a83c',
  error: '#e8736a',
  info: '#71b3ae',
  statusPending: '#c8c1bd',
  statusActive: '#71b3ae',
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
  stopPin: '#71b3ae',
  routeLine: '#dd8256',
  userLocation: '#71b3ae',
};

/**
 * P5 Ferry - the day palette of Address First (RESEARCH-2 §5.2).
 *
 * A deep blue on a cool white with a rust second colour: the ink of an
 * editorial page and the rust of the route drawn on the map under it.
 */
const ferryDay: Palette = {
  background: '#f1f1f4',
  surface: '#ffffff',
  surfaceElevated: '#e7e7ec',
  overlay: '#00000080',
  border: '#636675',
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
  statusPending: '#414551',
  statusActive: '#1f3f8f',
  statusDelivered: '#14603c',
  statusFailed: '#a11e18',
  statusSkipped: '#7a4a00',
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
};

/**
 * P5 Ferry - the night palette of Address First.
 *
 * A cool near-black (#0e1015, blue channel 21), the ink blue lifted to
 * `#7d9ae0` and the rust kept as the second colour of the map.
 */
const ferryNight: Palette = {
  background: '#0e1015',
  surface: '#161920',
  surfaceElevated: '#1e222b',
  overlay: '#00000080',
  border: '#6e7280',
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
  statusPending: '#bcc0cc',
  statusActive: '#7d9ae0',
  statusDelivered: '#59b184',
  statusFailed: '#e8736a',
  statusSkipped: '#d8a83c',
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
};

/**
 * Builds a theme of the round from its palette.
 *
 * The theme carries the shared tokens of the contract - the spacing, the
 * type scale, the radii, the elevation and the motion - and the palette
 * gives it its colours.
 */
function themeOf(name: Theme2aName, displayName: string, colors: Palette): Theme {
  return { ...baseTheme, name, displayName, colors };
}

/**
 * The six themes of directions 01 to 03.
 *
 * The order is the order of the founder's pack: the three directions, each
 * with its light theme first.
 */
export const themes2a: Record<Theme2aName, Theme> = {
  controlRoom: themeOf('controlRoom', 'Control Room', hivisDay),
  controlRoomNight: themeOf('controlRoomNight', 'Control Room Night', hivisNight),
  topo: themeOf('topo', 'Topo', clayDayTopo),
  topoNight: themeOf('topoNight', 'Topo Night', clayNightTopo),
  addressFirst: themeOf('addressFirst', 'Address First', ferryDay),
  addressFirstNight: themeOf('addressFirstNight', 'Address First Night', ferryNight),
};

/**
 * The map palettes of directions 01 to 03, keyed by the theme they belong to.
 *
 * The map of a direction is drawn in the colours of that direction, never in
 * a stock style with the accent pasted on it (REVIEW-F5 and F6). The values
 * are the map colours of the measured palettes, with the casings and the
 * halos worked out for each.
 */
export const mapPalettes2a: Record<Theme2aName, MapPalette> = {
  controlRoom: {
    background: '#e9ebe5',
    water: '#d6e4ea',
    land: '#f0f1ec',
    road: '#ffffff',
    roadOutline: '#dfe3da',
    highway: '#f2c94c',
    highwayOutline: '#c9a437',
    building: '#e0e2db',
    park: '#dae6d0',
    text: '#14161a',
    textHalo: '#f0f1ec',
    stopPin: '#a63a00',
    stopPinHalo: '#f0f1ec',
    routeLine: '#a63a00',
    routeLineWidth: '5px',
    geofenceApproach: 'rgba(166, 58, 0, 0.18)',
    geofenceImminent: 'rgba(166, 58, 0, 0.32)',
    userLocation: '#14495f',
    userLocationHalo: 'rgba(20, 73, 95, 0.25)',
  },
  controlRoomNight: {
    background: '#181c19',
    water: '#1d2a30',
    land: '#212622',
    road: '#3a4039',
    roadOutline: '#2b312b',
    highway: '#8a7433',
    highwayOutline: '#665626',
    building: '#2b302b',
    park: '#243026',
    text: '#f4f5f2',
    textHalo: '#212622',
    stopPin: '#e07a35',
    stopPinHalo: '#101311',
    routeLine: '#e07a35',
    routeLineWidth: '5px',
    geofenceApproach: 'rgba(224, 122, 53, 0.20)',
    geofenceImminent: 'rgba(224, 122, 53, 0.35)',
    userLocation: '#6fa9c4',
    userLocationHalo: 'rgba(111, 169, 196, 0.25)',
  },
  topo: {
    background: '#e8e5e6',
    water: '#dbe2e0',
    land: '#f1efef',
    road: '#ffffff',
    roadOutline: '#e5e1e2',
    highway: '#e9d3a4',
    highwayOutline: '#cbb389',
    building: '#e3e0e1',
    park: '#dde4da',
    text: '#151314',
    textHalo: '#f1efef',
    stopPin: '#2f5d5a',
    stopPinHalo: '#f1efef',
    routeLine: '#8c3b1a',
    routeLineWidth: '3px',
    geofenceApproach: 'rgba(47, 93, 90, 0.18)',
    geofenceImminent: 'rgba(47, 93, 90, 0.32)',
    userLocation: '#2f5d5a',
    userLocationHalo: 'rgba(47, 93, 90, 0.25)',
  },
  topoNight: {
    background: '#1c1918',
    water: '#1e2422',
    land: '#252220',
    road: '#403b38',
    roadOutline: '#322e2c',
    highway: '#7d6c47',
    highwayOutline: '#5d5036',
    building: '#2e2a28',
    park: '#242b25',
    text: '#f5f1ef',
    textHalo: '#252220',
    stopPin: '#71b3ae',
    stopPinHalo: '#131011',
    routeLine: '#dd8256',
    routeLineWidth: '3px',
    geofenceApproach: 'rgba(113, 179, 174, 0.20)',
    geofenceImminent: 'rgba(113, 179, 174, 0.35)',
    userLocation: '#71b3ae',
    userLocationHalo: 'rgba(113, 179, 174, 0.25)',
  },
  addressFirst: {
    background: '#e7e7ec',
    water: '#d9dfe9',
    land: '#f0f0f3',
    road: '#ffffff',
    roadOutline: '#dcdce4',
    highway: '#eccb78',
    highwayOutline: '#c9a851',
    building: '#e4e4ea',
    park: '#dde5d9',
    text: '#111318',
    textHalo: '#f0f0f3',
    stopPin: '#1f3f8f',
    stopPinHalo: '#f0f0f3',
    routeLine: '#b0451b',
    routeLineWidth: '4px',
    geofenceApproach: 'rgba(31, 63, 143, 0.18)',
    geofenceImminent: 'rgba(31, 63, 143, 0.32)',
    userLocation: '#1f3f8f',
    userLocationHalo: 'rgba(31, 63, 143, 0.25)',
  },
  addressFirstNight: {
    background: '#161920',
    water: '#19202c',
    land: '#1e222b',
    road: '#3a3f4b',
    roadOutline: '#2c303a',
    highway: '#7d6a3a',
    highwayOutline: '#5f5029',
    building: '#262a34',
    park: '#1f2620',
    text: '#f1f3f8',
    textHalo: '#1e222b',
    stopPin: '#7d9ae0',
    stopPinHalo: '#0e1015',
    routeLine: '#e08148',
    routeLineWidth: '4px',
    geofenceApproach: 'rgba(125, 154, 224, 0.20)',
    geofenceImminent: 'rgba(125, 154, 224, 0.35)',
    userLocation: '#7d9ae0',
    userLocationHalo: 'rgba(125, 154, 224, 0.25)',
  },
};
