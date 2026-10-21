/**
 * Tests for the courier map style.
 *
 * The style is the app's own: it is generated from the design tokens, it
 * carries the attribution and it stays valid with no tile source at all.
 * These tests need no device and no network.
 */

import { themes } from '@courier/design-tokens/themes';

import {
  ATTRIBUTION,
  ATTRIBUTION_LINES,
  BASEMAP_SOURCE_ID,
  COURIER_STYLE_VERSION,
  SOURCE_ATTRIBUTION,
  buildCourierStyle,
  getCourierStyle,
} from '../styles';

const PACK_URL = 'pmtiles://file:///data/user/0/com.courier.copilot/files/maps/canterbury.pmtiles';

describe('the courier map style', () => {
  it('is a style version 8 document', () => {
    const style = buildCourierStyle({ themeName: 'day', tileUrl: PACK_URL });

    expect(style.version).toBe(8);
    expect(style.name).toBe('courier-copilot-day');
  });

  it('takes every colour from the design tokens of the chosen theme', () => {
    const day = buildCourierStyle({ themeName: 'day', tileUrl: PACK_URL });
    const night = buildCourierStyle({ themeName: 'night', tileUrl: PACK_URL });
    const contrast = buildCourierStyle({ themeName: 'highContrast', tileUrl: PACK_URL });

    const backgroundOf = (style: ReturnType<typeof buildCourierStyle>) => {
      const layer = style.layers[0];
      return layer && layer.type === 'background' ? layer.paint['background-color'] : undefined;
    };

    expect(backgroundOf(day)).toBe(themes.day.components.map.day.background);
    expect(backgroundOf(night)).toBe(themes.night.components.map.night.background);
    expect(backgroundOf(contrast)).toBe(themes.highContrast.components.map.highContrast.background);
  });

  it('carries the tile source and the attribution when there is a pack', () => {
    const style = buildCourierStyle({ themeName: 'day', tileUrl: PACK_URL });
    const source = style.sources[BASEMAP_SOURCE_ID];

    expect(source).toBeDefined();
    expect(source?.type).toBe('vector');
    expect(source?.type === 'vector' ? source.url : undefined).toBe(PACK_URL);
    expect(source?.type === 'vector' ? source.attribution : undefined).toBe(SOURCE_ATTRIBUTION);
  });

  it('still draws the map when there is no tile source at all', () => {
    const style = buildCourierStyle({ themeName: 'night', tileUrl: null });

    expect(Object.keys(style.sources)).toHaveLength(0);
    expect(style.layers).toHaveLength(1);
    expect(style.layers[0]?.id).toBe('background');
  });

  it('draws the basemap layers only when there are tiles to draw them from', () => {
    const withTiles = buildCourierStyle({
      themeName: 'day',
      tileUrl: PACK_URL,
      glyphsUrl: 'file:///maps/glyphs/{fontstack}/{range}.pbf',
    });
    const withoutTiles = buildCourierStyle({ themeName: 'day', tileUrl: null });

    const ids = (style: ReturnType<typeof buildCourierStyle>) =>
      style.layers.map((layer) => layer.id);

    expect(ids(withTiles)).toContain('water');
    expect(ids(withTiles)).toContain('road-major');
    expect(ids(withTiles)).toContain('courier-house-number');
    expect(ids(withoutTiles)).not.toContain('water');
  });

  it('draws the house numbers at z17, the zoom a courier needs the door number', () => {
    const style = buildCourierStyle({
      themeName: 'day',
      tileUrl: PACK_URL,
      glyphsUrl: 'file:///maps/glyphs/{fontstack}/{range}.pbf',
    });
    const layer = style.layers.find((entry) => entry.id === 'courier-house-number');

    expect(layer).toBeDefined();
    expect(layer?.minzoom).toBe(17);
    expect(layer?.type).toBe('symbol');
  });

  it('leaves the label layers out when there are no glyphs', () => {
    const withoutGlyphs = buildCourierStyle({ themeName: 'day', tileUrl: PACK_URL });
    const withGlyphs = buildCourierStyle({
      themeName: 'day',
      tileUrl: PACK_URL,
      glyphsUrl: 'file:///data/user/0/com.courier.copilot/files/maps/glyphs/{fontstack}/{range}.pbf',
    });

    const ids = (style: ReturnType<typeof buildCourierStyle>) =>
      style.layers.map((layer) => layer.id);

    expect(ids(withoutGlyphs)).not.toContain('place-label');
    expect(ids(withGlyphs)).toContain('place-label');
    expect(withGlyphs.glyphs).toContain('{fontstack}');
  });

  it('records the style version and the theme in the metadata', () => {
    const style = getCourierStyle('night', PACK_URL);
    const metadata = style.metadata as Record<string, unknown>;

    expect(metadata['courier:styleVersion']).toBe(COURIER_STYLE_VERSION);
    expect(metadata['courier:theme']).toBe('night');
  });
});

describe('the map attribution', () => {
  it('credits OpenStreetMap, the Open Database Licence and LINZ', () => {
    expect(ATTRIBUTION.osm).toBe('© OpenStreetMap contributors');
    expect(ATTRIBUTION.odbl).toContain('Open Database License');
    expect(ATTRIBUTION.linz).toContain('LINZ Data Service');
    expect(ATTRIBUTION.linz).toContain('CC BY 4.0');
  });

  it('shows all three notices on the map, offline as well', () => {
    expect(ATTRIBUTION_LINES).toHaveLength(3);
    expect(ATTRIBUTION_LINES).toContain(ATTRIBUTION.osm);
    expect(ATTRIBUTION_LINES).toContain(ATTRIBUTION.odbl);
    expect(ATTRIBUTION_LINES).toContain(ATTRIBUTION.linz);
  });

  it('carries the OpenStreetMap and the LINZ credit in the tile source', () => {
    expect(SOURCE_ATTRIBUTION).toContain(ATTRIBUTION.osm);
    expect(SOURCE_ATTRIBUTION).toContain('LINZ Data Service');
  });

  it('links to the licence pages the credit comes from', () => {
    expect(ATTRIBUTION.osmCopyrightUrl).toBe('https://www.openstreetmap.org/copyright');
    expect(ATTRIBUTION.linzAttributionUrl).toContain('linz.govt.nz');
  });
});
