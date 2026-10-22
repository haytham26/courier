/**
 * Tests for the configurable map source.
 *
 * The OpenStreetMap Foundation tile servers are refused: their Tile Usage
 * Policy forbids offline use and bulk downloading. These tests need no device
 * and no network.
 */

import { OSMF_TILE_HOST, getConfiguredGlyphsUrl, getConfiguredTileUrl, hostOf, isForbiddenTileUrl } from '../config';

describe('the tile source host', () => {
  it('reads the host out of a URL', () => {
    expect(hostOf('https://tiles.example.nz/v4/{z}/{x}/{y}.pbf')).toBe('tiles.example.nz');
    expect(hostOf('https://tiles.example.nz:8443/v4')).toBe('tiles.example.nz');
    expect(hostOf('tiles.example.nz/v4')).toBe('tiles.example.nz');
  });

  it('refuses the OpenStreetMap Foundation tile servers', () => {
    expect(isForbiddenTileUrl('https://tile.openstreetmap.org/{z}/{x}/{y}.png')).toBe(true);
    expect(isForbiddenTileUrl('https://a.tile.openstreetmap.org/{z}/{x}/{y}.png')).toBe(true);
    expect(isForbiddenTileUrl('http://tile.openstreetmap.org/{z}/{x}/{y}.png')).toBe(true);
  });

  it('lets every other source through', () => {
    expect(isForbiddenTileUrl('https://tiles.example.nz/{z}/{x}/{y}.pbf')).toBe(false);
    expect(isForbiddenTileUrl('https://openfreemap.org/tiles/planet.pbf')).toBe(false);
    expect(isForbiddenTileUrl('pmtiles://file:///maps/canterbury.pmtiles')).toBe(false);
  });
});

describe('the configured tile source', () => {
  it('takes the URL it is given', () => {
    expect(getConfiguredTileUrl('https://tiles.example.nz/{z}/{x}/{y}.pbf')).toBe(
      'https://tiles.example.nz/{z}/{x}/{y}.pbf',
    );
  });

  it('refuses the OpenStreetMap Foundation tile servers', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(getConfiguredTileUrl('https://tile.openstreetmap.org/{z}/{x}/{y}.png')).toBeNull();
    expect(warn).toHaveBeenCalled();
    expect(warn.mock.calls[0]?.[0]).toContain(OSMF_TILE_HOST);

    warn.mockRestore();
  });

  it('has no source when nothing is configured', () => {
    expect(getConfiguredTileUrl('')).toBeNull();
  });
});

describe('the configured glyph source', () => {
  it('takes the URL it is given', () => {
    expect(getConfiguredGlyphsUrl('https://tiles.example.nz/glyphs/{fontstack}/{range}.pbf')).toBe(
      'https://tiles.example.nz/glyphs/{fontstack}/{range}.pbf',
    );
  });

  it('has no glyphs when nothing is configured', () => {
    expect(getConfiguredGlyphsUrl('')).toBeNull();
  });
});
