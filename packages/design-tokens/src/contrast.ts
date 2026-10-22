/**
 * The WCAG 2.2 contrast maths.
 *
 * `docs/design/SYSTEM.md` §6 sets the bar: **driving text ≥ 7:1, everything
 * else ≥ 4.5:1**, and the non-text contrast of a UI boundary ≥ 3:1 (SC 1.4.11).
 * The palette in `themes.ts` is checked against those numbers by
 * `contrast.test.ts`, so a colour change that breaks the bar fails the build
 * instead of shipping.
 *
 * The formula is the one in the WCAG 2.x definition of contrast ratio:
 * (L1 + 0.05) / (L2 + 0.05), where L is the relative luminance of the sRGB
 * colour.
 */

/** The bars the design contract sets. */
export const CONTRAST_BARS = {
  /** Body text and anything else below the large-text threshold. */
  body: 4.5,
  /** Large text: 24 px, or 18.66 px bold. */
  largeText: 3,
  /** Driving text — the address and the distance on the night screen. */
  driving: 7,
  /** A UI boundary: an input border, a control outline, a focus ring. */
  nonText: 3,
} as const;

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Reads a `#rgb` or `#rrggbb` colour.
 *
 * The palettes are plain hex, so an alpha channel is not accepted here: a
 * translucent colour has no single contrast ratio, and the test would be
 * measuring the wrong thing.
 */
export function parseHex(hex: string): Rgb {
  const match = HEX_PATTERN.exec(hex.trim());
  if (!match) {
    throw new Error(`not a plain hex colour: ${hex}`);
  }
  const body = match[1]!;
  const full =
    body.length === 3
      ? body
          .split('')
          .map((character) => `${character}${character}`)
          .join('')
      : body;
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
}

/** The sRGB channel value, linearised as WCAG asks for. */
function linearise(channel: number): number {
  const ratio = channel / 255;
  return ratio <= 0.04045 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
}

/** The relative luminance of a colour, from 0 (black) to 1 (white). */
export function relativeLuminance(colour: string): number {
  const { r, g, b } = parseHex(colour);
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

/**
 * The contrast ratio between two colours, from 1:1 to 21:1.
 *
 * The ratio does not depend on the order of the two colours.
 */
export function contrastRatio(first: string, second: string): number {
  const a = relativeLuminance(first);
  const b = relativeLuminance(second);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * The contrast ratio, rounded to two decimals, the way the tables in
 * `themes.ts` and `docs/design/mockups/` write it.
 */
export function contrastRatioRounded(first: string, second: string): number {
  return Math.round(contrastRatio(first, second) * 100) / 100;
}

/**
 * The colour a translucent overlay makes, given the colour behind it.
 *
 * The badge paints its pill with the status colour at 12.5 % over the
 * surface, so the pair that has to clear the bar is the status colour
 * against that mix, not against the plain surface.
 */
export function blend(foreground: string, background: string, alpha: number): string {
  const from = parseHex(foreground);
  const to = parseHex(background);
  const mix = (a: number, b: number): number => Math.round(a * alpha + b * (1 - alpha));
  const channel = (value: number): string => value.toString(16).padStart(2, '0');
  return `#${channel(mix(from.r, to.r))}${channel(mix(from.g, to.g))}${channel(mix(from.b, to.b))}`;
}
