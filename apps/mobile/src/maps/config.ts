/**
 * The configurable map source.
 *
 * The app never hard-codes a tile URL. The source comes from the build
 * configuration, so the same binary can point at a development server, at our
 * own hosted tiles or at nothing at all:
 *
 *   EXPO_PUBLIC_MAP_TILE_URL     the tile endpoint used when there is no
 *                                offline pack: a TileJSON URL or a tile
 *                                template such as
 *                                https://tiles.example.nz/{z}/{x}/{y}.pbf
 *   EXPO_PUBLIC_MAP_GLYPHS_URL   the glyph endpoint; without it the map draws
 *                                no text
 *
 * Both can also be set in `app.json` under `expo.extra` as `mapTileUrl` and
 * `mapGlyphsUrl`.
 *
 * The OpenStreetMap Foundation tile servers are refused. Their Tile Usage
 * Policy says: "Offline use is not permitted on tile.openstreetmap.org" and
 * forbids bulk downloading (read 2026-10-21 at
 * https://operations.osmfoundation.org/policies/tiles/). The rule applies to
 * us whether or not the offline pack is the reason for the request, so the
 * app refuses the host rather than trusting the configuration.
 */

import Constants from 'expo-constants';

/** The host the OSMF tile usage policy covers. */
export const OSMF_TILE_HOST = 'tile.openstreetmap.org';

/**
 * The host part of a URL, without the scheme, the user info or the port.
 *
 * The app cannot count on `URL` being complete on every platform, so the
 * host is read with a pattern.
 */
export function hostOf(url: string): string {
  const value = url.trim().toLowerCase();
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//.test(value);
  const rest = withScheme ? value.replace(/^[a-z][a-z0-9+.-]*:\/\//, '') : value;
  const authority = rest.split(/[/?#]/)[0] ?? '';
  return authority.split('@').pop()?.split(':')[0] ?? '';
}

/**
 * Whether the URL points at the OSMF tile servers.
 *
 * The policy names `tile.openstreetmap.org` and the sub-domains under it.
 */
export function isForbiddenTileUrl(url: string): boolean {
  const host = hostOf(url);
  return host === OSMF_TILE_HOST || host.endsWith(`.${OSMF_TILE_HOST}`);
}

function readExtraString(key: string): string | null {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  if (!extra) {
    return null;
  }
  const value = extra[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readTileUrlFromConfig(): string {
  // The environment variable is read by name: the Expo build inlines
  // EXPO_PUBLIC_ variables into the bundle, so it cannot be looked up
  // dynamically.
  const fromEnv = process.env.EXPO_PUBLIC_MAP_TILE_URL;
  return fromEnv ?? readExtraString('mapTileUrl') ?? '';
}

function readGlyphsUrlFromConfig(): string {
  const fromEnv = process.env.EXPO_PUBLIC_MAP_GLYPHS_URL;
  return fromEnv ?? readExtraString('mapGlyphsUrl') ?? '';
}

/**
 * The tile endpoint to use when there is no offline pack.
 *
 * Returns null when nothing is configured and null when the configured URL is
 * one the OSMF tile usage policy forbids.
 *
 * The URL can be passed in, which is what the tests do; the app calls it
 * without one and the value comes from the build configuration.
 */
export function getConfiguredTileUrl(raw?: string): string | null {
  const url = (raw !== undefined ? raw : readTileUrlFromConfig()).trim();

  if (url.length === 0) {
    return null;
  }

  if (isForbiddenTileUrl(url)) {
    console.warn(
      `maps: the configured tile source ${OSMF_TILE_HOST} is refused; the OSMF tile usage policy forbids offline use and bulk downloading.`,
    );
    return null;
  }

  return url;
}

/**
 * The glyph endpoint, or null when there is none.
 *
 * The glyphs are a local resource in the offline pack; this is only for a
 * development server that serves them.
 */
export function getConfiguredGlyphsUrl(raw?: string): string | null {
  const url = (raw !== undefined ? raw : readGlyphsUrlFromConfig()).trim();
  return url.length > 0 ? url : null;
}
