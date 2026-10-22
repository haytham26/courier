/**
 * The directions of the Design Studio's second round built by this team:
 * **04 Voice Ribbon**, **05 X-ray Parcel** and **06 Scanline**.
 *
 * MASTER_EXECUTION §13.6 asks for ten directions and the founder rejected
 * the first three as dated and plain, so the studio restarted with a shared
 * spec (`docs/design/SPEC.md`), a shared scoring (`docs/design/REVIEW.md`)
 * and ten teams. This file holds the three directions of the 04-06 team.
 *
 * A direction is not a colour: it is a type scale, a spacing rhythm, a set of
 * corners, a motion character, a type pairing, a map treatment and a theme
 * (with its own night adaptation). The founder picks one of the ten (the
 * approval gate in §7.3) and the app is built in it.
 *
 * The rules all of them obey, because the design contract obeys them:
 * - the body is never smaller than 17 px and the key number is 48-76 px,
 * - the spacing is on the 4-pt grid,
 * - a movement lasts 150-250 ms and the sheets use a critically damped
 *   spring (the `motion.springs` tokens),
 * - "reduce motion" makes the movement instant, never removes it.
 *
 * The values live here, in the token package, so a component never writes a
 * size of its own. The names carry the `Lab` prefix because the other teams
 * of the round publish their own directions in `directions2.ts`, and the
 * token package exports both.
 */

/** The name of a direction of this team. */
export type LabDirectionName = 'voiceRibbon' | 'xrayParcel' | 'scanline';

/**
 * One step of a type scale.
 *
 * `letterSpacing` is in em, the way the type tokens write it, and
 * `fontWeight` is the name of a weight of the family of the direction.
 */
export interface LabTypeStep {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  fontWeight: '400' | '500' | '600' | '700' | '800';
}

/** The spacing rhythm of a direction. Every number is on the 4-pt grid. */
export interface LabDirectionSpacing {
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
export interface LabDirectionRadii {
  /** A button or a field. */
  control: number;
  /** A block of content. */
  card: number;
  /** A status pill. */
  pill: number;
}

/** How a direction moves. */
export interface LabDirectionMotion {
  /**
   * How a new stop enters the screen.
   *
   * - `ribbon` - the block is drawn up out of the ribbon at the bottom.
   * - `unfold` - the parcel opens out of its flat state.
   * - `scan` - the band wipes across, the way the scanner reads a label.
   */
  enter: 'ribbon' | 'unfold' | 'scan';
  /** How long it takes, in milliseconds. The contract's band is 150-250 ms. */
  durationMs: 150 | 200 | 250;
  /** Which spring of the motion tokens the sheets of the direction use. */
  spring: 'sheet' | 'settle';
}

/** The two type families of a direction, and the licence of each. */
export interface LabTypePairing {
  /** The family of the number and the address. */
  display: string;
  /** The family of everything else. */
  text: string;
  /** The licence of both families. */
  licence: string;
  /** Where the licence is published. */
  licenceUrl: string;
}

/**
 * The identity fingerprint of a direction (`docs/design/SPEC.md` §10).
 *
 * The QA lead compares these ten fields between the ten directions of the
 * round: no two may share the same layout grammar, the same accent family,
 * both type families, the same motion character or the same map treatment.
 */
export interface LabFingerprint {
  /** The accent colour and its name. */
  accent: { name: string; hex: string; contrastOnBackground: string };
  /** The other chromatic non-neutral colour of the palette. */
  secondChromatic: { name: string; hex: string };
  /** The type pairing. */
  typePairing: LabTypePairing;
  /** The density, and the number of stops that fit on Today at 390 by 844. */
  density: { name: 'comfortable' | 'compact' | 'dense'; stopsOnToday: number };
  /** The layout grammar and the rule that governs it. */
  layoutGrammar: { name: string; rule: string };
  /** The characteristic movement. */
  motionCharacter: { name: string; durationMs: number; easing: string };
  /** The basemap family and the 3D treatment. */
  mapTreatment: { basemap: string; threeDimensional: string };
  /** The icon treatment. */
  iconTreatment: { weight: string; customGlyphs: string; stateRule: string };
  /** How the palette changes after dark, in one sentence. */
  nightRule: string;
  /** The three signature moments, one line each. */
  signatureMoments: {
    deliveryConfirmation: string;
    mapMovement: string;
    copilotAppearance: string;
  };
}

/** A direction: the theme, the scale, the rhythm and the character. */
export interface LabDirection {
  name: LabDirectionName;
  /** The light theme of the direction in `themes.ts`. */
  themeName: 'voiceRibbon' | 'xrayParcel' | 'scanline';
  /** The night adaptation of the direction in `themes.ts`. */
  nightThemeName: 'voiceRibbonNight' | 'xrayParcelNight' | 'scanlineNight';
  /** The one line the founder reads on the picker. */
  idea: string;
  /** The number the direction carries in the round. */
  number: string;
  density: 'comfortable' | 'compact' | 'dense';
  spacing: LabDirectionSpacing;
  radii: LabDirectionRadii;
  type: {
    /** The number the courier has to read at a glance. */
    metric: LabTypeStep;
    /** The address of the next stop. */
    address: LabTypeStep;
    /** A row of the list. */
    row: LabTypeStep;
    /** A label above a value. */
    label: LabTypeStep;
    /** Body copy. */
    body: LabTypeStep;
    /** A caption or a badge. */
    caption: LabTypeStep;
    /** The title of the screen. */
    title: LabTypeStep;
  };
  motion: LabDirectionMotion;
  /** The two families of the direction and their licence. */
  fonts: LabTypePairing;
  /** The identity fingerprint the QA lead compares between the directions. */
  fingerprint: LabFingerprint;
}

/**
 * The Voice Ribbon direction.
 *
 * **The companion is the interface.** A live amplitude ribbon along the
 * bottom edge replaces the buttons and the motion of the screen is the motion
 * of the microphone.
 */
export const voiceRibbon: LabDirection = {
  name: 'voiceRibbon',
  themeName: 'voiceRibbon',
  nightThemeName: 'voiceRibbonNight',
  idea: 'The voice is the interface: a live amplitude ribbon along the bottom edge replaces the buttons.',
  number: '04',
  density: 'comfortable',
  spacing: { gap: 12, pad: 20, row: 64, block: 32 },
  radii: { control: 12, card: 16, pill: 999 },
  type: {
    metric: { fontSize: 64, lineHeight: 68, letterSpacing: -0.03, fontWeight: '700' },
    address: { fontSize: 30, lineHeight: 36, letterSpacing: -0.02, fontWeight: '600' },
    row: { fontSize: 21, lineHeight: 28, letterSpacing: 0, fontWeight: '500' },
    label: { fontSize: 17, lineHeight: 22, letterSpacing: 0.08, fontWeight: '600' },
    body: { fontSize: 19, lineHeight: 26, letterSpacing: 0, fontWeight: '400' },
    caption: { fontSize: 17, lineHeight: 22, letterSpacing: 0.02, fontWeight: '500' },
    title: { fontSize: 28, lineHeight: 34, letterSpacing: -0.02, fontWeight: '700' },
  },
  motion: { enter: 'ribbon', durationMs: 200, spring: 'settle' },
  fonts: {
    display: 'Space Grotesk',
    text: 'Geist',
    licence: 'SIL OFL 1.1',
    licenceUrl: 'https://github.com/google/fonts/blob/main/ofl/spacegrotesk/OFL.txt',
  },
  fingerprint: {
    accent: { name: 'Burnt sienna', hex: '#8c3b1a', contrastOnBackground: '6.09:1' },
    secondChromatic: { name: 'Deep teal', hex: '#2f5d5a' },
    typePairing: {
      display: 'Space Grotesk',
      text: 'Geist',
      licence: 'SIL OFL 1.1',
      licenceUrl: 'https://github.com/google/fonts/blob/main/ofl/spacegrotesk/OFL.txt',
    },
    density: { name: 'comfortable', stopsOnToday: 3 },
    layoutGrammar: {
      name: 'The bottom ribbon',
      rule: 'The content is anchored to the top-left and the ribbon owns the bottom third of the screen.',
    },
    motionCharacter: {
      name: 'The ribbon rises',
      durationMs: 200,
      easing: 'spring, damping 34, stiffness 320, mass 0.9',
    },
    mapTreatment: {
      basemap: 'Protomaps basemaps, recoloured in P6 Clay',
      threeDimensional: 'Extruded buildings, lit from the north-west, 52 degrees of pitch',
    },
    iconTreatment: {
      weight: 'Material Symbols, weight 500',
      customGlyphs: 'The microphone is replaced by the ribbon itself; no new glyph is drawn',
      stateRule: 'The state is a word under the ribbon, never a colour alone',
    },
    nightRule: 'The ground warms to a near-black and the ribbon becomes the only saturated thing on the screen.',
    signatureMoments: {
      deliveryConfirmation:
        'The ribbon collapses to one flat line and a rule draws across the address in 220 ms, once, with the delivered haptic.',
      mapMovement:
        'The camera drops from 52 to 34 degrees of pitch and the route unrolls as a ribbon toward the next stop over 380 ms.',
      copilotAppearance:
        'The ribbon rises out of the bottom edge over 200 ms and the whole screen moves up by its own height.',
    },
  },
};

/**
 * The X-ray Parcel direction.
 *
 * **The parcel is the hero object.** The delivery is a physical act: the
 * parcel is a dimensional object, the van has a rack and the stop is a place
 * the courier arrives at.
 */
export const xrayParcel: LabDirection = {
  name: 'xrayParcel',
  themeName: 'xrayParcel',
  nightThemeName: 'xrayParcelNight',
  idea: 'The parcel is the hero: a dimensional box with its label, and a delivery that is a physical act.',
  number: '05',
  density: 'dense',
  spacing: { gap: 8, pad: 16, row: 56, block: 24 },
  radii: { control: 6, card: 12, pill: 6 },
  type: {
    metric: { fontSize: 72, lineHeight: 76, letterSpacing: -0.03, fontWeight: '800' },
    address: { fontSize: 26, lineHeight: 32, letterSpacing: -0.01, fontWeight: '700' },
    row: { fontSize: 20, lineHeight: 26, letterSpacing: 0.01, fontWeight: '600' },
    label: { fontSize: 17, lineHeight: 22, letterSpacing: 0.1, fontWeight: '700' },
    body: { fontSize: 19, lineHeight: 26, letterSpacing: 0, fontWeight: '400' },
    caption: { fontSize: 17, lineHeight: 22, letterSpacing: 0.04, fontWeight: '600' },
    title: { fontSize: 32, lineHeight: 40, letterSpacing: -0.02, fontWeight: '800' },
  },
  motion: { enter: 'unfold', durationMs: 250, spring: 'sheet' },
  fonts: {
    display: 'Bricolage Grotesque',
    text: 'IBM Plex Sans',
    licence: 'SIL OFL 1.1',
    licenceUrl: 'https://github.com/google/fonts/blob/main/ofl/bricolagegrotesque/OFL.txt',
  },
  fingerprint: {
    accent: { name: 'Safety orange', hex: '#a63a00', contrastOnBackground: '5.42:1' },
    secondChromatic: { name: 'Kelp green', hex: '#14563c' },
    typePairing: {
      display: 'Bricolage Grotesque',
      text: 'IBM Plex Sans',
      licence: 'SIL OFL 1.1',
      licenceUrl: 'https://github.com/google/fonts/blob/main/ofl/bricolagegrotesque/OFL.txt',
    },
    density: { name: 'dense', stopsOnToday: 6 },
    layoutGrammar: {
      name: 'The object and the ground',
      rule: 'The parcel stands on the left, the run is on the right, and the two never share a card.',
    },
    motionCharacter: {
      name: 'The parcel unfolds',
      durationMs: 250,
      easing: 'spring, damping 30, stiffness 260, mass 1.2',
    },
    mapTreatment: {
      basemap: 'MapLibre 3D buildings style, recoloured in P1 HiVis',
      threeDimensional: 'Extruded buildings at 55 degrees of pitch with the extrusion in the kelp green',
    },
    iconTreatment: {
      weight: 'Material Symbols, weight 500',
      customGlyphs: 'The parcel, the rack position and the door are drawn on a 24 dp grid with a 2 dp stroke',
      stateRule: 'The delivered state is a filled parcel, the failed state is a broken strap',
    },
    nightRule: 'The ground cools to a near-black and the parcel is lit from the north-west so it stays solid.',
    signatureMoments: {
      deliveryConfirmation:
        'The parcel turns edge-on and drops into the rack of the van in 250 ms, with the delivered haptic.',
      mapMovement:
        'The camera pulls back and up to 55 degrees so the buildings stand beside the road, then settles.',
      copilotAppearance:
        'Copilot appears as a stamped band across the face of the parcel, the way a label is taped on.',
    },
  },
};

/**
 * The Scanline direction.
 *
 * **The scanner sets the language.** Ruled bands, crop marks and monospaced
 * data, so a scanned address and a typed address look like they came out of
 * the same machine.
 */
export const scanline: LabDirection = {
  name: 'scanline',
  themeName: 'scanline',
  nightThemeName: 'scanlineNight',
  idea: 'The scanner sets the language: ruled bands, crop marks and monospaced data, machine to machine.',
  number: '06',
  density: 'compact',
  spacing: { gap: 4, pad: 16, row: 56, block: 16 },
  radii: { control: 0, card: 0, pill: 0 },
  type: {
    metric: { fontSize: 56, lineHeight: 60, letterSpacing: -0.02, fontWeight: '700' },
    address: { fontSize: 24, lineHeight: 30, letterSpacing: -0.01, fontWeight: '600' },
    row: { fontSize: 19, lineHeight: 26, letterSpacing: 0.02, fontWeight: '500' },
    label: { fontSize: 17, lineHeight: 22, letterSpacing: 0.12, fontWeight: '700' },
    body: { fontSize: 18, lineHeight: 26, letterSpacing: 0.01, fontWeight: '400' },
    caption: { fontSize: 17, lineHeight: 22, letterSpacing: 0.06, fontWeight: '500' },
    title: { fontSize: 26, lineHeight: 32, letterSpacing: -0.01, fontWeight: '700' },
  },
  motion: { enter: 'scan', durationMs: 150, spring: 'settle' },
  fonts: {
    display: 'Roboto Flex',
    text: 'IBM Plex Mono',
    licence: 'SIL OFL 1.1',
    licenceUrl: 'https://github.com/google/fonts/blob/main/ofl/robotoflex/OFL.txt',
  },
  fingerprint: {
    accent: { name: 'Vermilion', hex: '#b3261e', contrastOnBackground: '5.37:1' },
    secondChromatic: { name: 'Ink', hex: '#1d2a33' },
    typePairing: {
      display: 'Roboto Flex',
      text: 'IBM Plex Mono',
      licence: 'SIL OFL 1.1',
      licenceUrl: 'https://github.com/google/fonts/blob/main/ofl/robotoflex/OFL.txt',
    },
    density: { name: 'compact', stopsOnToday: 7 },
    layoutGrammar: {
      name: 'The ruled band',
      rule: 'Every block of the screen is a band with a rule on the left and a key on the right.',
    },
    motionCharacter: {
      name: 'The band wipes',
      durationMs: 150,
      easing: 'timing, 150 ms, cubic-bezier(0, 0, 0.2, 1)',
    },
    mapTreatment: {
      basemap: 'OpenMapTiles Bright, recoloured in P3 Signal',
      threeDimensional: 'No extrusion in the day; the 3D mode keeps the flat plan and the bands',
    },
    iconTreatment: {
      weight: 'Material Symbols, weight 500',
      customGlyphs: 'The crop marks and the scan caret are drawn on the 4-pt grid as lines, not as glyphs',
      stateRule: 'The state is a word in the mono family, never a colour alone',
    },
    nightRule: 'The chart is redrawn in a neutral near-black and the vermilion becomes the dimmer #E8675E.',
    signatureMoments: {
      deliveryConfirmation:
        'The confirmed address is stamped with a vermilion rule that draws left to right in 150 ms, once.',
      mapMovement:
        'The map redraws as a band from the top of the viewport down over 300 ms, the way a page prints.',
      copilotAppearance:
        'Copilot appears as a new ruled band pushed up from the bottom, with the cursor on the caret.',
    },
  },
};

/** The three directions of this team, in the order the founder sees them. */
export const labDirections: Record<LabDirectionName, LabDirection> = {
  voiceRibbon,
  xrayParcel,
  scanline,
};

/** The names of the three directions, in the order the founder sees them. */
export const labDirectionNames: LabDirectionName[] = ['voiceRibbon', 'xrayParcel', 'scanline'];
