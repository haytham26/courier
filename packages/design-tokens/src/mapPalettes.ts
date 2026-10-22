/**
 * The shape of a map palette, and the map palettes of the round.
 *
 * The map style of the app (`apps/mobile/src/maps/styles.ts`) is built from
 * this shape: one recipe, one palette, so the map of a direction is the map
 * of that direction and not a stock style with a filter over it
 * (`docs/design/REVIEW.md` REVIEW-F5 and F6).
 *
 * The values live in the token package and nowhere else: a component never
 * writes a map colour of its own.
 *
 * This file has no imports on purpose: the token file reads the palettes
 * from here, and the themes read the shape from here, so the two never
 * import each other and the token package has no cycle in it.
 */
export interface MapPalette {
  /** The colour under everything: the land that is not drawn. */
  background: string;
  water: string;
  land: string;
  road: string;
  /** The line under the road, the casing. */
  roadOutline: string;
  highway: string;
  highwayOutline: string;
  building: string;
  park: string;
  text: string;
  /** The halo behind a label, so it reads over any land colour. */
  textHalo: string;
  stopPin: string;
  stopPinHalo: string;
  routeLine: string;
  routeLineWidth: string;
  geofenceApproach: string;
  geofenceImminent: string;
  userLocation: string;
  userLocationHalo: string;
}

/**
 * The map palettes of the eight themes of the second round.
 *
 * Each one is the map of its palette: the colours of the theme, so the map
 * and the interface cannot drift apart. The map of Haptic City is a
 * monochrome ramp on purpose - that direction uses colour almost nowhere,
 * and the route is the only chromatic line on it.
 */
export const directionMapPalettes: Record<string, MapPalette> = {
  weatherLight: {
    background: '#e4ebee',
    water: '#cfe1e9',
    land: '#eff2f3',
    road: '#ffffff',
    roadOutline: '#dbe3e7',
    highway: '#f0c674',
    highwayOutline: '#c9a24f',
    building: '#e1e7ea',
    park: '#d8e6dd',
    text: '#0d161a',
    textHalo: '#eff2f3',
    stopPin: '#0a4a63',
    stopPinHalo: '#eff2f3',
    routeLine: '#a8461b',
    routeLineWidth: '4px',
    geofenceApproach: 'rgba(10, 74, 99, 0.18)',
    geofenceImminent: 'rgba(10, 74, 99, 0.32)',
    userLocation: '#0a4a63',
    userLocationHalo: 'rgba(10, 74, 99, 0.25)',
  },
  weatherLightNight: {
    background: '#141b1f',
    water: '#16262e',
    land: '#1c252a',
    road: '#38454c',
    roadOutline: '#2b363c',
    highway: '#7d6a3a',
    highwayOutline: '#5f5029',
    building: '#242f35',
    park: '#1f2c27',
    text: '#f2f6f8',
    textHalo: '#1c252a',
    stopPin: '#5fa6c4',
    stopPinHalo: '#141b1f',
    routeLine: '#e08148',
    routeLineWidth: '4px',
    geofenceApproach: 'rgba(95, 166, 196, 0.20)',
    geofenceImminent: 'rgba(95, 166, 196, 0.35)',
    userLocation: '#5fa6c4',
    userLocationHalo: 'rgba(95, 166, 196, 0.25)',
  },
  hapticCity: {
    background: '#e8eae4',
    water: '#dde0da',
    land: '#eff0ec',
    road: '#ffffff',
    roadOutline: '#dde3d7',
    highway: '#c8ccc3',
    highwayOutline: '#adb1a7',
    building: '#e1e3dd',
    park: '#dfe2d8',
    text: '#131810',
    textHalo: '#eff0ec',
    stopPin: '#1d5b34',
    stopPinHalo: '#eff0ec',
    routeLine: '#1d5b34',
    routeLineWidth: '4px',
    geofenceApproach: 'rgba(29, 91, 52, 0.18)',
    geofenceImminent: 'rgba(29, 91, 52, 0.32)',
    userLocation: '#131810',
    userLocationHalo: 'rgba(19, 24, 16, 0.25)',
  },
  hapticCityNight: {
    background: '#171c18',
    water: '#1e2320',
    land: '#1f2620',
    road: '#3a4039',
    roadOutline: '#2c312b',
    highway: '#6f7469',
    highwayOutline: '#555a50',
    building: '#272e27',
    park: '#212b20',
    text: '#f2f5ef',
    textHalo: '#1f2620',
    stopPin: '#63b183',
    stopPinHalo: '#171c18',
    routeLine: '#63b183',
    routeLineWidth: '4px',
    geofenceApproach: 'rgba(99, 177, 131, 0.20)',
    geofenceImminent: 'rgba(99, 177, 131, 0.35)',
    userLocation: '#f2f5ef',
    userLocationHalo: 'rgba(242, 245, 239, 0.25)',
  },
  nightShift: {
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
    stopPin: '#8c3b1a',
    stopPinHalo: '#f1efef',
    routeLine: '#2f5d5a',
    routeLineWidth: '4px',
    geofenceApproach: 'rgba(140, 59, 26, 0.18)',
    geofenceImminent: 'rgba(140, 59, 26, 0.32)',
    userLocation: '#2f5d5a',
    userLocationHalo: 'rgba(47, 93, 90, 0.25)',
  },
  nightShiftNight: {
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
    stopPin: '#dd8256',
    stopPinHalo: '#1c1918',
    routeLine: '#71b3ae',
    routeLineWidth: '4px',
    geofenceApproach: 'rgba(221, 130, 86, 0.20)',
    geofenceImminent: 'rgba(221, 130, 86, 0.35)',
    userLocation: '#71b3ae',
    userLocationHalo: 'rgba(113, 179, 174, 0.25)',
  },
  gantryRun: {
    background: '#e9e9e5',
    water: '#dde2e3',
    land: '#f2f2ef',
    road: '#ffffff',
    roadOutline: '#e0e0da',
    highway: '#e7d9a8',
    highwayOutline: '#c9b680',
    building: '#e2e2dd',
    park: '#dfe5db',
    text: '#101112',
    textHalo: '#f2f2ef',
    stopPin: '#b3261e',
    stopPinHalo: '#f2f2ef',
    routeLine: '#b3261e',
    routeLineWidth: '5px',
    geofenceApproach: 'rgba(179, 38, 30, 0.18)',
    geofenceImminent: 'rgba(179, 38, 30, 0.32)',
    userLocation: '#1d2a33',
    userLocationHalo: 'rgba(29, 42, 51, 0.25)',
  },
  gantryRunNight: {
    background: '#191918',
    water: '#1e2325',
    land: '#232322',
    road: '#3c3c39',
    roadOutline: '#303030',
    highway: '#7a6c40',
    highwayOutline: '#5c5130',
    building: '#2c2c2a',
    park: '#262d26',
    text: '#f6f6f4',
    textHalo: '#232322',
    stopPin: '#f2726a',
    stopPinHalo: '#191918',
    routeLine: '#f2726a',
    routeLineWidth: '5px',
    geofenceApproach: 'rgba(242, 114, 106, 0.20)',
    geofenceImminent: 'rgba(242, 114, 106, 0.35)',
    userLocation: '#8fa4b3',
    userLocationHalo: 'rgba(143, 164, 179, 0.25)',
  },
};
