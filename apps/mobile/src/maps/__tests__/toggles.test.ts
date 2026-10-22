/**
 * Tests for the map toggles.
 *
 * The toggles are the courier's own choices, and they are stored with the
 * rest of the driver's preferences. These tests need no device and no
 * network.
 */

import {
  DEFAULT_MAP_TOGGLES,
  DEFAULT_MAP_LABEL_SIZE,
  MAP_LABEL_SCALE,
  MAP_LABEL_SIZES,
  MAP_LAYERS,
  isMapLabelSize,
  layerUnavailableMessage,
  parseMapToggles,
  serialiseMapToggles,
} from '../toggles';

describe('the map toggles', () => {
  it('starts with the buildings on, the layers off and the labels normal', () => {
    expect(DEFAULT_MAP_TOGGLES).toEqual({
      buildings: true,
      traffic: false,
      closures: false,
      weather: false,
      labelSize: 'normal',
      batterySaver: false,
    });
    expect(DEFAULT_MAP_LABEL_SIZE).toBe('normal');
  });

  it('offers the three label sizes', () => {
    expect(MAP_LABEL_SIZES).toEqual(['small', 'normal', 'large']);
    expect(isMapLabelSize('large')).toBe(true);
    expect(isMapLabelSize('huge')).toBe(false);
  });

  it('scales the labels up and down around the normal size', () => {
    expect(MAP_LABEL_SCALE.normal).toBe(1);
    expect(MAP_LABEL_SCALE.small).toBeLessThan(MAP_LABEL_SCALE.normal);
    expect(MAP_LABEL_SCALE.large).toBeGreaterThan(MAP_LABEL_SCALE.normal);
  });

  it('names the three online layers', () => {
    expect(MAP_LAYERS).toEqual(['traffic', 'closures', 'weather']);
  });

  it('says plainly that a layer without a provider is not set up yet', () => {
    for (const layer of MAP_LAYERS) {
      expect(layerUnavailableMessage(layer)).toContain('not set up yet');
    }
  });

  it('reads the toggles that were saved', () => {
    const saved = {
      buildings: false,
      traffic: true,
      closures: false,
      weather: true,
      labelSize: 'large',
      batterySaver: true,
    };

    expect(parseMapToggles(saved)).toEqual(saved);
  });

  it('falls back to the defaults when the file holds something else', () => {
    expect(parseMapToggles(null)).toEqual(DEFAULT_MAP_TOGGLES);
    expect(parseMapToggles('nonsense')).toEqual(DEFAULT_MAP_TOGGLES);
    expect(parseMapToggles([])).toEqual(DEFAULT_MAP_TOGGLES);
  });

  it('falls back to the default for one value that is not a choice', () => {
    const parsed = parseMapToggles({ buildings: false, labelSize: 'enormous' });

    expect(parsed.buildings).toBe(false);
    expect(parsed.labelSize).toBe('normal');
  });

  it('keeps the choices when they are written and read again', () => {
    const toggles = { ...DEFAULT_MAP_TOGGLES, traffic: true, labelSize: 'small' as const };

    expect(parseMapToggles(JSON.parse(serialiseMapToggles(toggles)))).toEqual(toggles);
  });
});
