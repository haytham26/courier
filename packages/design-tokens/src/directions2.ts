/**
 * The four directions of the second round of the Design Studio.
 *
 * MASTER_EXECUTION §13.6 asks for ten directions; this file holds the four
 * this team built (07 Weather Light, 08 Haptic City, 09 Night Shift and 10
 * Gantry Run). A direction is the same set of fields for every team of the
 * round - the ten fields of the fingerprint in `docs/design/SPEC.md` §10 -
 * so the QA lead can compare them line by line.
 *
 * The values live in the token package, so a screen never writes a size, a
 * radius or a duration of its own.
 */

import type { Theme2Name } from './themes2';

/** The name of a direction of the round. */
export type Direction2Name = 'weatherLight' | 'hapticCity' | 'nightShift' | 'gantryRun';

/**
 * The layout grammar of a direction.
 *
 * The five grammars of `docs/design/PLAN.md` §2.1 are the pair rules; a
 * direction names the one it works in and the rule that governs it, so two
 * directions never answer the same brief with the same structure.
 */
export type Direction2Grammar = 'asymmetric-block' | 'gesture-column' | 'full-bleed-map' | 'overhead-rail';

/** How a movement of the direction is made. */
export type Direction2Enter = 'tint' | 'snap' | 'settle' | 'slide';

/** One step of the type scale of a direction. */
export interface TypeStep2 {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  fontWeight: '400' | '500' | '600' | '700' | '800';
}

/** The spacing rhythm of a direction. Every number is on the 4-pt grid. */
export interface Direction2Spacing {
  gap: number;
  pad: number;
  row: number;
  block: number;
}

/** The corners of a direction. */
export interface Direction2Radii {
  control: number;
  card: number;
  pill: number;
}

/** The camera of the map of a direction. */
export interface Direction2Camera {
  /** The pitch of the 3D map, in degrees. The bar of REVIEW-F1 is 45 to 60. */
  pitch3d: number;
  /** The pitch while the courier is following the route. */
  followPitch: number;
  /** The zoom of the follow camera. */
  followZoom: number;
  /** The bearing: heading-up while driving, north-up in the list. */
  bearing: 'heading' | 'north';
}

/** The three signature moments of a direction (REVIEW-S1 to S3). */
export interface Direction2Signature {
  /** How a delivery is confirmed. */
  delivery: string;
  /** How the map moves. */
  mapMove: string;
  /** How Copilot appears. */
  copilot: string;
}

/** The fonts of a direction, with the licence that covers the application. */
export interface Direction2Fonts {
  display: string;
  displayLicence: string;
  work: string;
  workLicence: string;
}

/** A direction of the round. */
export interface Direction2 {
  name: Direction2Name;
  /** The number of the direction in the round, in two digits. */
  number: string;
  /** The name on the founder's sheet. */
  displayName: string;
  /** The folder of the package: `docs/design/directions-2/<folder>`. */
  folder: string;
  /** The light theme of the direction. */
  themeName: Theme2Name;
  /** The night theme of the direction. */
  nightThemeName: Theme2Name;
  /** The one line the founder reads on the picker. */
  idea: string;
  /** The density of the direction, and how many stops fit on Today. */
  density: 'comfortable' | 'compact' | 'dense';
  stopsVisible: number;
  /** The layout grammar and the rule that governs it. */
  grammar: Direction2Grammar;
  grammarRule: string;
  /** The motion character of the direction. */
  motion: {
    enter: Direction2Enter;
    durationMs: 150 | 200 | 250;
    spring: 'sheet' | 'settle' | 'confirm' | 'voiceBar' | 'latch';
    /** The name the sheet of the direction gives the character. */
    character: string;
  };
  spacing: Direction2Spacing;
  radii: Direction2Radii;
  type: {
    metric: TypeStep2;
    address: TypeStep2;
    row: TypeStep2;
    label: TypeStep2;
    body: TypeStep2;
    caption: TypeStep2;
    title: TypeStep2;
  };
  camera: Direction2Camera;
  fonts: Direction2Fonts;
  signature: Direction2Signature;
}

/**
 * 07 - Weather Light.
 *
 * **The palette and the contrast follow the day's light.** A clear morning
 * and a low-contrast dusk are two ends of one scale, and the app measures
 * where it is on that scale and re-tunes itself. The seed of the research is
 * P2 Harbour and pairing E.
 */
export const weatherLight: Direction2 = {
  name: 'weatherLight',
  number: '07',
  displayName: 'Weather Light',
  folder: '07-weather-light',
  themeName: 'weatherLight',
  nightThemeName: 'weatherLightNight',
  idea: "The palette and the contrast follow the day's light: a clear morning and a low-contrast dusk are two ends of one scale.",
  density: 'comfortable',
  stopsVisible: 4,
  grammar: 'asymmetric-block',
  grammarRule:
    'One large block of "now" on the left two thirds of the screen; the right third carries only the light and the weather; the run is a narrow column under the block.',
  motion: {
    enter: 'tint',
    durationMs: 200,
    spring: 'settle',
    character: 'The light settles: a wash of the new light comes in and comes to rest.',
  },
  spacing: { gap: 12, pad: 24, row: 64, block: 32 },
  radii: { control: 10, card: 16, pill: 999 },
  type: {
    metric: { fontSize: 64, lineHeight: 68, letterSpacing: -0.03, fontWeight: '700' },
    address: { fontSize: 30, lineHeight: 38, letterSpacing: -0.01, fontWeight: '600' },
    row: { fontSize: 21, lineHeight: 28, letterSpacing: 0, fontWeight: '400' },
    label: { fontSize: 17, lineHeight: 22, letterSpacing: 0.08, fontWeight: '600' },
    body: { fontSize: 19, lineHeight: 26, letterSpacing: 0, fontWeight: '400' },
    caption: { fontSize: 17, lineHeight: 22, letterSpacing: 0.01, fontWeight: '600' },
    title: { fontSize: 32, lineHeight: 40, letterSpacing: -0.02, fontWeight: '700' },
  },
  camera: { pitch3d: 50, followPitch: 34, followZoom: 16.5, bearing: 'heading' },
  fonts: {
    display: 'Instrument Sans',
    displayLicence: 'SIL OFL 1.1',
    work: 'Public Sans',
    workLicence: 'SIL OFL 1.1',
  },
  signature: {
    delivery:
      'The day advances: confirming a stop moves the light one step along the day-scale, and the whole screen re-tunes to the new light over a 200 ms settle while the count rolls down.',
    mapMove:
      'The camera leans with the light: 50 degrees of pitch in the clear morning, 30 when the light is flat, never turning while the address is being read.',
    copilot:
      'Copilot is a light band under the address whose width is the amplitude of the microphone, tinted with the light of the hour.',
  },
};

/**
 * 08 - Haptic City.
 *
 * **Every state change is a physical gesture and the colour is used almost
 * nowhere.** The screen is a monochrome ramp with one accent that only ever
 * means "delivered". The seed of the research is P4 Kelp and pairing A.
 */
export const hapticCity: Direction2 = {
  name: 'hapticCity',
  number: '08',
  displayName: 'Haptic City',
  folder: '08-haptic-city',
  themeName: 'hapticCity',
  nightThemeName: 'hapticCityNight',
  idea: 'Every state change is a physical gesture, and the colour is used almost nowhere.',
  density: 'comfortable',
  stopsVisible: 3,
  grammar: 'gesture-column',
  grammarRule:
    'One column of physical targets down the middle of the screen; nothing sits beside a target that could be a second target, and the state of a thing is shown by its shape.',
  motion: {
    enter: 'snap',
    durationMs: 150,
    spring: 'sheet',
    character: 'The spring carries the velocity of the finger: the target moves as far and as fast as the hand moved it.',
  },
  spacing: { gap: 16, pad: 16, row: 72, block: 24 },
  radii: { control: 28, card: 20, pill: 999 },
  type: {
    metric: { fontSize: 56, lineHeight: 60, letterSpacing: -0.02, fontWeight: '700' },
    address: { fontSize: 28, lineHeight: 36, letterSpacing: -0.01, fontWeight: '500' },
    row: { fontSize: 22, lineHeight: 28, letterSpacing: 0, fontWeight: '500' },
    label: { fontSize: 17, lineHeight: 22, letterSpacing: 0.1, fontWeight: '700' },
    body: { fontSize: 19, lineHeight: 26, letterSpacing: 0, fontWeight: '400' },
    caption: { fontSize: 17, lineHeight: 22, letterSpacing: 0.04, fontWeight: '500' },
    title: { fontSize: 30, lineHeight: 36, letterSpacing: -0.02, fontWeight: '700' },
  },
  camera: { pitch3d: 55, followPitch: 32, followZoom: 17, bearing: 'heading' },
  fonts: {
    display: 'Space Grotesk',
    displayLicence: 'SIL OFL 1.1',
    work: 'Geist',
    workLicence: 'SIL OFL 1.1',
  },
  signature: {
    delivery:
      'The courier presses and holds the seal for 600 ms: a ring fills under the finger, the target snaps closed with a hair of overshoot, the hand feels two heavy pulses and the row is struck through - a fact of shape, not a change of colour.',
    mapMove:
      'The map never moves on its own: it is moved by the voice ("tilt the map", "zoom to the next stop"), and the move carries the velocity of the hand that spoke it.',
    copilot:
      'Copilot is a physical target: it sinks 2 px under the finger and its shape is the state - a square for listening, a bar for thinking, a filled disc for speaking.',
  },
};

/**
 * 09 - Night Shift.
 *
 * **The night-driving screen is the hero, and the day version is a real
 * design rather than an inversion.** The seed of the research is P6 Clay and
 * pairing B.
 */
export const nightShift: Direction2 = {
  name: 'nightShift',
  number: '09',
  displayName: 'Night Shift',
  folder: '09-night-shift',
  themeName: 'nightShift',
  nightThemeName: 'nightShiftNight',
  idea: 'The night-driving screen is the hero, and the day version behind it is a design in its own right.',
  density: 'compact',
  stopsVisible: 5,
  grammar: 'full-bleed-map',
  grammarRule:
    'The map is the page: the interface floats on the map as one opaque plate, the plate is the only thing that is not the world, and nothing else may sit in the top fifth of the screen.',
  motion: {
    enter: 'settle',
    durationMs: 250,
    spring: 'confirm',
    character: 'The night settles onto the door: one overshoot, once, and only when a delivery is confirmed.',
  },
  spacing: { gap: 8, pad: 24, row: 64, block: 32 },
  radii: { control: 6, card: 12, pill: 4 },
  type: {
    metric: { fontSize: 72, lineHeight: 78, letterSpacing: -0.03, fontWeight: '600' },
    address: { fontSize: 32, lineHeight: 40, letterSpacing: -0.015, fontWeight: '600' },
    row: { fontSize: 21, lineHeight: 28, letterSpacing: 0, fontWeight: '400' },
    label: { fontSize: 17, lineHeight: 22, letterSpacing: 0.1, fontWeight: '600' },
    body: { fontSize: 19, lineHeight: 26, letterSpacing: 0, fontWeight: '400' },
    caption: { fontSize: 17, lineHeight: 22, letterSpacing: 0.02, fontWeight: '500' },
    title: { fontSize: 34, lineHeight: 42, letterSpacing: -0.02, fontWeight: '600' },
  },
  camera: { pitch3d: 55, followPitch: 35, followZoom: 17, bearing: 'heading' },
  fonts: {
    display: 'Fraunces',
    displayLicence: 'SIL OFL 1.1',
    work: 'Source Sans 3',
    workLicence: 'SIL OFL 1.1',
  },
  signature: {
    delivery:
      'The world narrows to the door: on the confirmation the map falls to its night floor, the address plate stays the only bright thing on the screen and the camera settles onto the door in a single 220 ms move.',
    mapMove:
      'The arrival is the movement: the camera eases from the follow pitch to 55 degrees and drops onto the door of the next stop in 400 ms, and it never turns while the address is being read.',
    copilot:
      'Copilot is a single rule at the foot of the dark; the words sit above it in the night type and nothing else on the screen moves when it speaks.',
  },
};

/**
 * 10 - Gantry Run.
 *
 * **The run is an overhead structure the courier reads at a glance.** The
 * gantry is the sign bridge over a road: a rail of the run, with the next
 * stop hanging under it. The seed of this direction is ours; the palette is
 * P3 Signal and the pairing is D.
 */
export const gantryRun: Direction2 = {
  name: 'gantryRun',
  number: '10',
  displayName: 'Gantry Run',
  folder: '10-gantry-run',
  themeName: 'gantryRun',
  nightThemeName: 'gantryRunNight',
  idea: 'The run is an overhead gantry: a rail of the whole day above the next stop, read at a glance.',
  density: 'dense',
  stopsVisible: 6,
  grammar: 'overhead-rail',
  grammarRule:
    'The rail is the top of the screen and the next stop hangs under it; every other block of the screen is left-aligned to the rail, and nothing is centred.',
  motion: {
    enter: 'slide',
    durationMs: 200,
    spring: 'latch',
    character: 'The rail latches: a sign drops into its place and the rail takes the weight of it.',
  },
  spacing: { gap: 8, pad: 20, row: 56, block: 24 },
  radii: { control: 4, card: 8, pill: 4 },
  type: {
    metric: { fontSize: 60, lineHeight: 64, letterSpacing: -0.03, fontWeight: '700' },
    address: { fontSize: 26, lineHeight: 32, letterSpacing: -0.01, fontWeight: '700' },
    row: { fontSize: 21, lineHeight: 28, letterSpacing: 0, fontWeight: '500' },
    label: { fontSize: 17, lineHeight: 22, letterSpacing: 0.1, fontWeight: '700' },
    body: { fontSize: 19, lineHeight: 26, letterSpacing: 0, fontWeight: '400' },
    caption: { fontSize: 17, lineHeight: 22, letterSpacing: 0.02, fontWeight: '500' },
    title: { fontSize: 30, lineHeight: 36, letterSpacing: -0.02, fontWeight: '700' },
  },
  camera: { pitch3d: 45, followPitch: 30, followZoom: 17, bearing: 'north' },
  fonts: {
    display: 'Bricolage Grotesque',
    displayLicence: 'SIL OFL 1.1',
    work: 'IBM Plex Sans',
    workLicence: 'SIL OFL 1.1',
  },
  signature: {
    delivery:
      'The rail latches: the sign of the delivered stop slides out of the gantry, the sign of the next stop drops into its place and the marker on the rail moves one notch, all in a 220 ms latch with one firm pulse.',
    mapMove:
      'The camera steps: it stays north-up and moves in 250 ms steps, so the map never turns under the driver while the address is being read.',
    copilot:
      'Copilot is a sign that slides into the gantry and latches there, and the words of the assistant are written on the sign.',
  },
};

/** The four directions of this team, in the order of the founder's pack. */
export const directions2: Record<Direction2Name, Direction2> = {
  weatherLight,
  hapticCity,
  nightShift,
  gantryRun,
};

/** The names of the four directions, in the order of the founder's pack. */
export const direction2Names: Direction2Name[] = ['weatherLight', 'hapticCity', 'nightShift', 'gantryRun'];
