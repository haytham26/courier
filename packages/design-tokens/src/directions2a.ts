/**
 * The three directions of the second round of the Design Studio that this
 * team built: 01 Control Room, 02 Topo and 03 Address First.
 *
 * MASTER_EXECUTION §13.6 asks for ten directions; this file holds three of
 * them, and every field is the same field every other team of the round
 * writes - the ten fields of the fingerprint in `docs/design/SPEC.md` §10 -
 * so the QA lead can compare them line by line.
 *
 * The values live in the token package, so a screen never writes a size, a
 * radius or a duration of its own.
 */

import type { Theme2aName } from './themes2a';

/** The name of a direction of the round. */
export type Direction2aName = 'controlRoom' | 'topo' | 'addressFirst';

/**
 * The layout grammar of a direction.
 *
 * A direction names the grammar it works in and the rule that governs it, so
 * two directions never answer the same brief with the same structure.
 */
export type Direction2aGrammar = 'instrument-grid' | 'survey-chart' | 'address-column';

/** How a movement of the direction is made. */
export type Direction2aEnter = 'dial' | 'unfold' | 'set';

/** One step of the type scale of a direction. */
export interface TypeStep2a {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  fontWeight: '400' | '500' | '600' | '700' | '800';
}

/** The spacing rhythm of a direction. Every number is on the 4-pt grid. */
export interface Direction2aSpacing {
  gap: number;
  pad: number;
  row: number;
  block: number;
}

/** The corners of a direction. */
export interface Direction2aRadii {
  control: number;
  card: number;
  pill: number;
}

/** The camera of the map of a direction. */
export interface Direction2aCamera {
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
export interface Direction2aSignature {
  /** How a delivery is confirmed. */
  delivery: string;
  /** How the map moves. */
  mapMove: string;
  /** How Copilot appears. */
  copilot: string;
}

/** The fonts of a direction, with the licence that covers the application. */
export interface Direction2aFonts {
  display: string;
  displayLicence: string;
  work: string;
  workLicence: string;
}

/** A direction of the round. */
export interface Direction2a {
  name: Direction2aName;
  /** The number of the direction in the round, in two digits. */
  number: string;
  /** The name on the founder's sheet. */
  displayName: string;
  /** The folder of the package: `docs/design/directions-2/<folder>`. */
  folder: string;
  /** The light theme of the direction. */
  themeName: Theme2aName;
  /** The night theme of the direction. */
  nightThemeName: Theme2aName;
  /** The one line the founder reads on the picker. */
  idea: string;
  /** The density of the direction, and how many stops fit on Today. */
  density: 'comfortable' | 'compact' | 'dense';
  stopsVisible: number;
  /** The layout grammar and the rule that governs it. */
  grammar: Direction2aGrammar;
  grammarRule: string;
  /** The motion character of the direction. */
  motion: {
    enter: Direction2aEnter;
    durationMs: 150 | 200 | 250;
    spring: 'settle' | 'sheet' | 'confirm' | 'voiceBar' | 'latch';
    /** The name the sheet of the direction gives the character. */
    character: string;
  };
  spacing: Direction2aSpacing;
  radii: Direction2aRadii;
  type: {
    metric: TypeStep2a;
    address: TypeStep2a;
    row: TypeStep2a;
    label: TypeStep2a;
    body: TypeStep2a;
    caption: TypeStep2a;
    title: TypeStep2a;
  };
  camera: Direction2aCamera;
  fonts: Direction2aFonts;
  signature: Direction2aSignature;
}

/**
 * 01 - Control Room.
 *
 * **The run is an instrument panel.** Every number is a readout, the state of
 * the run is a set of live gauges, and the next move is the only bright thing
 * on the screen.
 *
 * The palette is **P1 HiVis** of `docs/design/RESEARCH-2.md` §5.2: safety
 * orange and kelp green on a cool white. The orange is the lamp of the
 * panel, and it is used for the one thing the driver has to act on. The
 * pairing is **C**: Roboto Flex for the number and the address, IBM Plex Mono
 * for everything else, because a panel is written in a technical face.
 */
export const controlRoom: Direction2a = {
  name: 'controlRoom',
  number: '01',
  displayName: 'Control Room',
  folder: '01-control-room',
  themeName: 'controlRoom',
  nightThemeName: 'controlRoomNight',
  idea: 'The run is an instrument panel: every number is a readout and the next move is the only bright thing on the screen.',
  density: 'dense',
  stopsVisible: 6,
  grammar: 'instrument-grid',
  grammarRule:
    'One fixed grid of readouts, twelve columns wide: a gauge for the run, a row of state lamps, and one slot that carries the next move. Nothing is centred and nothing floats.',
  motion: {
    enter: 'dial',
    durationMs: 200,
    spring: 'settle',
    character:
      'The needle settles: every readout moves on a critically damped spring, so a value comes to rest instead of bouncing.',
  },
  spacing: { gap: 8, pad: 16, row: 56, block: 24 },
  radii: { control: 2, card: 2, pill: 2 },
  type: {
    metric: { fontSize: 64, lineHeight: 68, letterSpacing: -0.03, fontWeight: '700' },
    address: { fontSize: 30, lineHeight: 36, letterSpacing: -0.01, fontWeight: '600' },
    row: { fontSize: 21, lineHeight: 28, letterSpacing: 0, fontWeight: '500' },
    label: { fontSize: 17, lineHeight: 22, letterSpacing: 0.1, fontWeight: '600' },
    body: { fontSize: 19, lineHeight: 26, letterSpacing: 0, fontWeight: '500' },
    caption: { fontSize: 17, lineHeight: 22, letterSpacing: 0.02, fontWeight: '500' },
    title: { fontSize: 30, lineHeight: 36, letterSpacing: -0.02, fontWeight: '700' },
  },
  camera: { pitch3d: 46, followPitch: 38, followZoom: 16, bearing: 'heading' },
  fonts: {
    display: 'Roboto Flex',
    displayLicence: 'SIL OFL 1.1',
    work: 'IBM Plex Mono',
    workLicence: 'SIL OFL 1.1',
  },
  signature: {
    delivery:
      'The needle sweeps: the run gauge turns one notch to the new count, the number rolls down on a critically damped spring and the next stop is written into the readout - one firm pulse, one wood tick, no celebration.',
    mapMove:
      'The camera steps: the map moves from one stop to the next in 200 ms steps and never turns while the driver reads the address; the follow pitch sits at 38 degrees so the road is visible over the bonnet.',
    copilot:
      'Copilot is a strip along the top of the panel: the state in words, a static level bar of the microphone, and the last thing it said on one line under it.',
  },
};

/**
 * 02 - Topo.
 *
 * **The Canterbury landscape is the identity.** The map is a survey chart
 * with contour hairlines over it, the interface is the margin of that chart,
 * and every measurement is written the way a survey writes it.
 *
 * The palette is **P6 Clay** with the two chromatic colours the other way
 * round: the teal is the survey line and the sienna is the marker. The
 * pairing is **D**: Bricolage Grotesque for the titles and the numbers,
 * Source Sans 3 for the notes in the margin.
 */
export const topo: Direction2a = {
  name: 'topo',
  number: '02',
  displayName: 'Topo',
  folder: '02-topo',
  themeName: 'topo',
  nightThemeName: 'topoNight',
  idea: 'The Canterbury landscape is the identity: the map is a survey chart, and the interface is the margin around it.',
  density: 'compact',
  stopsVisible: 4,
  grammar: 'survey-chart',
  grammarRule:
    'The chart is the page and the interface is its margin: the map carries the run, the coordinates and the times sit in the margin, and a hairline rule is the only thing that separates them.',
  motion: {
    enter: 'unfold',
    durationMs: 150,
    spring: 'sheet',
    character:
      'The chart unfolds: a new plate is drawn in 150 ms with no spring, the way a survey sheet is pulled out of a drawer.',
  },
  spacing: { gap: 8, pad: 20, row: 56, block: 24 },
  radii: { control: 0, card: 0, pill: 0 },
  type: {
    metric: { fontSize: 56, lineHeight: 60, letterSpacing: -0.02, fontWeight: '700' },
    address: { fontSize: 28, lineHeight: 34, letterSpacing: -0.01, fontWeight: '600' },
    row: { fontSize: 21, lineHeight: 28, letterSpacing: 0, fontWeight: '500' },
    label: { fontSize: 17, lineHeight: 22, letterSpacing: 0.12, fontWeight: '600' },
    body: { fontSize: 19, lineHeight: 26, letterSpacing: 0, fontWeight: '500' },
    caption: { fontSize: 17, lineHeight: 22, letterSpacing: 0.04, fontWeight: '500' },
    title: { fontSize: 34, lineHeight: 42, letterSpacing: -0.02, fontWeight: '700' },
  },
  camera: { pitch3d: 58, followPitch: 34, followZoom: 15.5, bearing: 'north' },
  fonts: {
    display: 'Bricolage Grotesque',
    displayLicence: 'SIL OFL 1.1',
    work: 'Source Sans 3',
    workLicence: 'SIL OFL 1.1',
  },
  signature: {
    delivery:
      'The contour advances: the delivered marker is struck out of the run and the elevation profile along the top of the chart loses one notch in a 150 ms draw, so the day is read as a line crossed, not a row ticked.',
    mapMove:
      'The map tilts to the land: the camera settles to 58 degrees so the contours separate, and it comes back north-up in one 250 ms move; the surveyed route never swings under the address.',
    copilot:
      'Copilot is a margin note: a narrow column down the side of the chart where the assistant writes what it did, in the note face, with no bubble and no avatar.',
  },
};

/**
 * 03 - Address First.
 *
 * **The address is the headline.** The run is a vertical spine of addresses
 * set in a display face, and everything else on the screen is an annotation
 * under it.
 *
 * The palette is **P5 Ferry** of `docs/design/RESEARCH-2.md` §5.2: a deep
 * blue on a cool white with a rust second colour. The pairing is **B** with
 * the work face changed: Fraunces for the address, Geist for the notes.
 */
export const addressFirst: Direction2a = {
  name: 'addressFirst',
  number: '03',
  displayName: 'Address First',
  folder: '03-address-first',
  themeName: 'addressFirst',
  nightThemeName: 'addressFirstNight',
  idea: 'The address is typeset like a headline: the run is a spine of addresses and everything else is an annotation under it.',
  density: 'comfortable',
  stopsVisible: 3,
  grammar: 'address-column',
  grammarRule:
    'One column of addresses down the page, each set as a headline with its own annotation under it; there is no panel, no card and no second column, and the next address is the only one in the accent.',
  motion: {
    enter: 'set',
    durationMs: 250,
    spring: 'confirm',
    character:
      'The line sets: an address rises into its place with a hair of overshoot, and the overshoot is allowed once, only when a delivery is confirmed.',
  },
  spacing: { gap: 16, pad: 24, row: 64, block: 32 },
  radii: { control: 4, card: 0, pill: 4 },
  type: {
    metric: { fontSize: 64, lineHeight: 68, letterSpacing: -0.03, fontWeight: '500' },
    address: { fontSize: 34, lineHeight: 42, letterSpacing: -0.015, fontWeight: '600' },
    row: { fontSize: 22, lineHeight: 30, letterSpacing: 0, fontWeight: '500' },
    label: { fontSize: 17, lineHeight: 22, letterSpacing: 0.06, fontWeight: '500' },
    body: { fontSize: 19, lineHeight: 28, letterSpacing: 0, fontWeight: '400' },
    caption: { fontSize: 17, lineHeight: 24, letterSpacing: 0.02, fontWeight: '400' },
    title: { fontSize: 30, lineHeight: 36, letterSpacing: -0.02, fontWeight: '600' },
  },
  camera: { pitch3d: 52, followPitch: 30, followZoom: 17, bearing: 'heading' },
  fonts: {
    display: 'Fraunces',
    displayLicence: 'SIL OFL 1.1',
    work: 'Geist',
    workLicence: 'SIL OFL 1.1',
  },
  signature: {
    delivery:
      'The address sets itself: the delivered line is struck through with a hairline and the next address rises into its place with a hair of overshoot, and the page holds still afterwards.',
    mapMove:
      'The map drifts under the page: the address stays exactly where it is and the world moves beneath it in a 400 ms push, so the driver never loses the line they are reading.',
    copilot:
      'Copilot is one annotated line under the address: what it heard, what it did, and nothing else, so the page is never interrupted.',
  },
};

/** The three directions of this team, in the order of the founder's pack. */
export const directions2a: Record<Direction2aName, Direction2a> = {
  controlRoom,
  topo,
  addressFirst,
};

/** The names of the three directions, in the order of the founder's pack. */
export const direction2aNames: Direction2aName[] = ['controlRoom', 'topo', 'addressFirst'];
