/**
 * The three design directions of the Design Studio (MASTER_EXECUTION §13.4).
 *
 * A direction is not a colour: it is a type scale, a spacing rhythm, a set of
 * corners, a motion character and a theme. The founder picks one of the three
 * (the approval gate in §7.3) and the app is built in it.
 *
 * The rules all three obey, because the design contract obeys them:
 * - the body is never smaller than 17 px and the key number is 48-76 px,
 * - the spacing is on the 4-pt grid,
 * - a movement lasts 150-250 ms and the sheets use a critically damped
 *   spring (the `motion.springs` tokens),
 * - "reduce motion" makes the movement instant, never removes it.
 *
 * The values live here, in the token package, so a component never writes a
 * size of its own.
 */

/** The name of a direction. */
export type DirectionName = 'roadbook' | 'beacon' | 'freight';

/**
 * One step of a type scale.
 *
 * `letterSpacing` is in em, the way the type tokens write it, and
 * `fontWeight` is the name of a weight of the Figtree family.
 */
export interface TypeStep {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  fontWeight: '400' | '500' | '600' | '700' | '800';
}

/** The spacing rhythm of a direction. Every number is on the 4-pt grid. */
export interface DirectionSpacing {
  /** The gap between two things that belong together. */
  gap: number;
  /** The padding of the screen. */
  pad: number;
  /** The height of a row the courier can tap. */
  row: number;
  /** The gap between two blocks of the screen. */
  block: number;
}

/** The corners of a direction. */
export interface DirectionRadii {
  /** A button or a field. */
  control: number;
  /** A block of content. */
  card: number;
  /** A status pill. */
  pill: number;
}

/** How a direction moves. */
export interface DirectionMotion {
  /** How a new stop enters the screen. */
  enter: 'fade' | 'rise' | 'wipe';
  /** How long it takes, in milliseconds. The contract's band is 150-250 ms. */
  durationMs: 150 | 200 | 250;
  /** Which spring of the motion tokens the sheets of the direction use. */
  spring: 'sheet' | 'settle';
}

/** A direction: the theme, the scale, the rhythm and the character. */
export interface Direction {
  name: DirectionName;
  /** The theme of the direction in `themes.ts`. */
  themeName: 'roadbook' | 'beacon' | 'freight';
  /** The one line the founder reads on the picker. */
  idea: string;
  density: 'dense' | 'calm' | 'expressive';
  spacing: DirectionSpacing;
  radii: DirectionRadii;
  type: {
    /** The number the courier has to read at a glance. */
    metric: TypeStep;
    /** The address of the next stop. */
    address: TypeStep;
    /** A row of the list. */
    row: TypeStep;
    /** A label above a value. */
    label: TypeStep;
    /** Body copy. */
    body: TypeStep;
    /** A caption or a badge. */
    caption: TypeStep;
    /** The title of the screen. */
    title: TypeStep;
  };
  motion: DirectionMotion;
}

/**
 * The Roadbook direction.
 *
 * Dense and operational: the courier's paper run sheet, on the phone.
 */
export const roadbook: Direction = {
  name: 'roadbook',
  themeName: 'roadbook',
  idea: 'The paper run sheet: hairline rules, tabular numbers, eight stops on one screen.',
  density: 'dense',
  spacing: { gap: 8, pad: 16, row: 56, block: 24 },
  radii: { control: 4, card: 4, pill: 4 },
  type: {
    metric: { fontSize: 48, lineHeight: 52, letterSpacing: -0.02, fontWeight: '800' },
    address: { fontSize: 22, lineHeight: 28, letterSpacing: -0.01, fontWeight: '600' },
    row: { fontSize: 20, lineHeight: 26, letterSpacing: 0, fontWeight: '500' },
    label: { fontSize: 17, lineHeight: 22, letterSpacing: 0.06, fontWeight: '600' },
    body: { fontSize: 19, lineHeight: 26, letterSpacing: 0, fontWeight: '400' },
    caption: { fontSize: 17, lineHeight: 22, letterSpacing: 0.02, fontWeight: '500' },
    title: { fontSize: 34, lineHeight: 40, letterSpacing: -0.02, fontWeight: '700' },
  },
  motion: { enter: 'fade', durationMs: 150, spring: 'sheet' },
};

/**
 * The Beacon direction.
 *
 * Calm and glanceable: one thing at a time, read in a glance.
 */
export const beacon: Direction = {
  name: 'beacon',
  themeName: 'beacon',
  idea: 'One thing at a time: the count, the address, the action, and a lot of quiet space.',
  density: 'calm',
  spacing: { gap: 16, pad: 24, row: 72, block: 32 },
  radii: { control: 12, card: 16, pill: 999 },
  type: {
    metric: { fontSize: 76, lineHeight: 80, letterSpacing: -0.03, fontWeight: '700' },
    address: { fontSize: 34, lineHeight: 42, letterSpacing: -0.02, fontWeight: '600' },
    row: { fontSize: 24, lineHeight: 32, letterSpacing: 0, fontWeight: '500' },
    label: { fontSize: 17, lineHeight: 22, letterSpacing: 0.08, fontWeight: '600' },
    body: { fontSize: 20, lineHeight: 28, letterSpacing: 0, fontWeight: '400' },
    caption: { fontSize: 17, lineHeight: 24, letterSpacing: 0.02, fontWeight: '500' },
    title: { fontSize: 24, lineHeight: 30, letterSpacing: 0, fontWeight: '600' },
  },
  motion: { enter: 'rise', durationMs: 200, spring: 'settle' },
};

/**
 * The Freight direction.
 *
 * Expressive and branded: the parcel label, hard corners and a lot of ink.
 */
export const freight: Direction = {
  name: 'freight',
  themeName: 'freight',
  idea: 'The parcel label: hard corners, one block of highway orange, a number that fills the screen.',
  density: 'expressive',
  spacing: { gap: 8, pad: 16, row: 64, block: 24 },
  radii: { control: 2, card: 0, pill: 0 },
  type: {
    metric: { fontSize: 64, lineHeight: 64, letterSpacing: -0.04, fontWeight: '800' },
    address: { fontSize: 28, lineHeight: 34, letterSpacing: -0.01, fontWeight: '700' },
    row: { fontSize: 22, lineHeight: 28, letterSpacing: 0.02, fontWeight: '600' },
    label: { fontSize: 17, lineHeight: 20, letterSpacing: 0.12, fontWeight: '700' },
    body: { fontSize: 20, lineHeight: 28, letterSpacing: 0, fontWeight: '500' },
    caption: { fontSize: 17, lineHeight: 22, letterSpacing: 0.04, fontWeight: '600' },
    title: { fontSize: 34, lineHeight: 38, letterSpacing: -0.02, fontWeight: '800' },
  },
  motion: { enter: 'wipe', durationMs: 150, spring: 'sheet' },
};

/** The three directions, in the order the founder sees them. */
export const directions: Record<DirectionName, Direction> = {
  roadbook,
  beacon,
  freight,
};

/** The names of the three directions, in the order the founder sees them. */
export const directionNames: DirectionName[] = ['roadbook', 'beacon', 'freight'];
