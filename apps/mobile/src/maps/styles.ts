/**
 * The courier map style (D16).
 *
 * One recipe, three themes: the day, night and high-contrast-sun variants are
 * the same layers with the colours of one theme, so the styles cannot drift
 * apart. Every colour comes from the design tokens
 * (`packages/design-tokens`), never from a hand-picked palette.
 *
 * The layer recipe follows the Protomaps basemap schema v4 - the source layers
 * are boundaries, buildings, earth, landcover, landuse, places, pois, roads,
 * transit and water (https://docs.protomaps.com/basemaps/layers, read
 * 2026-10-21). The style base is `protomaps/basemaps` (BSD-3 code, CC0 visual
 * design), forked and renamed `courier-copilot-style`; see
 * `docs/squads/maps/README.md`.
 *
 * A layer whose source layer is missing from the pack is simply not drawn, so
 * a partial pack still renders. With no tile source at all the style keeps the
 * background and the courier overlay, so the screen never shows a broken map.
 */

import { themes, type ThemeName } from '@courier/design-tokens/themes';
import type {
  BackgroundLayerSpecification,
  FillLayerSpecification,
  FilterSpecification,
  LayerSpecification,
  LineLayerSpecification,
  SourceSpecification,
  StyleSpecification,
  SymbolLayerSpecification,
} from '@maplibre/maplibre-react-native';

/** The version of the style recipe; it goes up when a layer changes. */
export const COURIER_STYLE_VERSION = 1;

/** The source id of the basemap vector tiles inside the style. */
export const BASEMAP_SOURCE_ID = 'courier-basemap';

/**
 * The font stack the glyph bundle has to provide. It is the name the
 * `{fontstack}` placeholder in the glyph endpoint resolves to.
 */
export const COURIER_FONT_STACK = ['Noto Sans Regular'];

/**
 * The credit the map has to show, online and offline.
 *
 * The OpenStreetMap notice is the one the OSMF Tile Usage Policy asks for
 * ("Typically: (c) OpenStreetMap contributors", read 2026-10-21 at
 * https://operations.osmfoundation.org/policies/tiles/). The ODbL notice is
 * the second duty the OSMF copyright page sets out: "Make clear that the data
 * is available under the Open Database License"
 * (https://www.openstreetmap.org/copyright, read 2026-10-21).
 *
 * The LINZ notice is the wording the LINZ attribution page asks for:
 * "Sourced from the LINZ Data Service and licensed for reuse under the CC BY
 * 4.0 licence"
 * (https://www.linz.govt.nz/products-services/data/licensing-and-using-data/attributing-linz-data,
 * read 2026-10-21). The New Zealand data in OpenStreetMap carries the same
 * credit: "New Zealand: Contains data sourced from the LINZ Data Service and
 * licensed for reuse under CC BY 4.0."
 */
export const ATTRIBUTION = {
  osm: '© OpenStreetMap contributors',
  odbl: 'Contains information from OpenStreetMap, available under the Open Database License (ODbL).',
  linz: 'Sourced from the LINZ Data Service and licensed for reuse under the CC BY 4.0 licence',
  osmCopyrightUrl: 'https://www.openstreetmap.org/copyright',
  linzAttributionUrl:
    'https://www.linz.govt.nz/products-services/data/licensing-and-using-data/attributing-linz-data',
} as const;

/** The short credit the tile source carries (the MapLibre attribution button). */
export const SOURCE_ATTRIBUTION = `${ATTRIBUTION.osm} · ${ATTRIBUTION.linz}`;

/** The three lines the map footer shows; they work with no network. */
export const ATTRIBUTION_LINES: readonly string[] = [
  ATTRIBUTION.osm,
  ATTRIBUTION.odbl,
  ATTRIBUTION.linz,
];

export interface CourierStyleOptions {
  /** Which of the three themes to build. */
  themeName: ThemeName;
  /**
   * The tile source: a `pmtiles://` URL for the offline pack, an `https` URL
   * for the self-hosted tiles, or null when there is no tile source at all.
   */
  tileUrl: string | null;
  /**
   * The local glyph endpoint. Without it no text is drawn on the map, so the
   * label layers are left out rather than failing to render.
   */
  glyphsUrl?: string | null;
}

// The landuse kinds that read as green in the Protomaps schema v4.
const PARK_KINDS = [
  'forest',
  'garden',
  'golf_course',
  'grass',
  'meadow',
  'national_park',
  'nature_reserve',
  'park',
  'pitch',
  'playground',
  'protected_area',
  'recreation_ground',
  'scrub',
  'wetland',
];

// The road kinds that carry traffic, in the Protomaps schema v4.
const TRAFFIC_ROAD_KINDS = ['highway', 'major_road', 'minor_road'];

// The road kinds that are the big arteries, in the Protomaps schema v4.
const MAJOR_ROAD_DETAILS = ['motorway', 'trunk', 'primary', 'secondary'];

const PLACE_KINDS = ['country', 'region', 'locality', 'macrohood', 'neighbourhood'];

const parkFilter: FilterSpecification = ['in', ['get', 'kind'], ['literal', PARK_KINDS]];
const trafficRoadFilter: FilterSpecification = ['in', ['get', 'kind'], ['literal', TRAFFIC_ROAD_KINDS]];
const majorRoadFilter: FilterSpecification = ['in', ['get', 'kind_detail'], ['literal', MAJOR_ROAD_DETAILS]];
const boundaryFilter: FilterSpecification = ['in', ['get', 'kind'], ['literal', ['country', 'region']]];
const placeFilter: FilterSpecification = ['in', ['get', 'kind'], ['literal', PLACE_KINDS]];
const buildingFilter: FilterSpecification = ['==', ['get', 'kind'], 'building'];
const addressFilter: FilterSpecification = ['==', ['get', 'kind'], 'address'];

/**
 * Builds the courier style for one theme.
 *
 * The style is the app's own: it is generated from the design tokens, it
 * carries the attribution in the tile source, and it never needs the network
 * to be valid.
 */
export function buildCourierStyle(options: CourierStyleOptions): StyleSpecification {
  const theme = themes[options.themeName];
  const map = theme.components.map[options.themeName];
  const hasTiles = options.tileUrl !== null;

  const sources: Record<string, SourceSpecification> = {};
  if (hasTiles) {
    sources[BASEMAP_SOURCE_ID] = {
      type: 'vector',
      url: options.tileUrl ?? undefined,
      attribution: SOURCE_ATTRIBUTION,
    };
  }

  const backgroundLayer: BackgroundLayerSpecification = {
    id: 'background',
    type: 'background',
    paint: { 'background-color': map.background },
  };

  const layers: LayerSpecification[] = [backgroundLayer];

  if (hasTiles) {
    const landcoverLayer: FillLayerSpecification = {
      id: 'landcover',
      type: 'fill',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'landcover',
      paint: { 'fill-color': map.park, 'fill-opacity': 0.45 },
    };

    const landuseLayer: FillLayerSpecification = {
      id: 'landuse',
      type: 'fill',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'landuse',
      filter: parkFilter,
      paint: { 'fill-color': map.park },
    };

    const waterLayer: FillLayerSpecification = {
      id: 'water',
      type: 'fill',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'water',
      paint: { 'fill-color': map.water },
    };

    const buildingLayer: FillLayerSpecification = {
      id: 'building',
      type: 'fill',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'buildings',
      filter: buildingFilter,
      minzoom: 13,
      paint: { 'fill-color': map.building },
    };

    const roadCasingLayer: LineLayerSpecification = {
      id: 'road-casing',
      type: 'line',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'roads',
      paint: {
        'line-color': map.roadOutline,
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.6, 14, 1.4, 17, 5],
      },
    };

    const roadFillLayer: LineLayerSpecification = {
      id: 'road-fill',
      type: 'line',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'roads',
      filter: trafficRoadFilter,
      paint: {
        'line-color': map.road,
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.3, 14, 0.9, 17, 3.6],
      },
    };

    const majorRoadLayer: LineLayerSpecification = {
      id: 'road-major',
      type: 'line',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'roads',
      filter: majorRoadFilter,
      paint: {
        'line-color': map.highway,
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.9, 14, 2.2, 17, 7],
      },
    };

    const boundaryLayer: LineLayerSpecification = {
      id: 'boundary',
      type: 'line',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'boundaries',
      filter: boundaryFilter,
      paint: {
        'line-color': map.text,
        'line-opacity': 0.35,
        'line-dasharray': [3, 2],
      },
    };

    layers.push(
      landcoverLayer,
      landuseLayer,
      waterLayer,
      buildingLayer,
      roadCasingLayer,
      roadFillLayer,
      majorRoadLayer,
      boundaryLayer,
    );
  }

  if (options.glyphsUrl) {
    const placeLabelLayer: SymbolLayerSpecification = {
      id: 'place-label',
      type: 'symbol',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'places',
      filter: placeFilter,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': COURIER_FONT_STACK,
        'text-size': [
          'match',
          ['get', 'kind'],
          'country',
          18,
          'region',
          14,
          'locality',
          13,
          'neighbourhood',
          11,
          10,
        ],
        'text-anchor': 'center',
      },
      paint: {
        'text-color': map.text,
        'text-halo-color': map.textHalo,
        'text-halo-width': 1.2,
      },
    };

    const houseNumberLayer: SymbolLayerSpecification = {
      id: 'courier-house-number',
      type: 'symbol',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'buildings',
      filter: addressFilter,
      minzoom: 17,
      layout: {
        'text-field': ['get', 'addr_house'],
        'text-font': COURIER_FONT_STACK,
        'text-size': 11,
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': map.text,
        'text-halo-color': map.textHalo,
        'text-halo-width': 1.2,
      },
    };

    layers.push(placeLabelLayer, houseNumberLayer);
  }

  return {
    version: 8,
    name: `courier-copilot-${options.themeName}`,
    metadata: {
      'courier:styleVersion': COURIER_STYLE_VERSION,
      'courier:theme': options.themeName,
      'courier:styleBase': 'courier-copilot-style (fork of protomaps/basemaps)',
    },
    ...(options.glyphsUrl ? { glyphs: options.glyphsUrl } : {}),
    sources,
    layers,
  };
}

/**
 * The style for one theme, ready to hand to the map.
 *
 * This is the entry point the map screen uses: the theme decides the colours
 * and the tile source decides whether there is a map under the courier
 * overlay.
 */
export function getCourierStyle(
  themeName: ThemeName,
  tileUrl: string | null,
  glyphsUrl: string | null = null,
): StyleSpecification {
  return buildCourierStyle({ themeName, tileUrl, glyphsUrl });
}
