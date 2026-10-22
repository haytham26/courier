/**
 * Tests for the map modes.
 *
 * The state machine is pure: it takes what the app knows about the courier
 * and the device and returns the mode the map is in. These tests need no
 * device, no map and no network.
 */

import {
  DEFAULT_MAP_VIEW_MODE,
  MAP_VIEW_MODES,
  isMapViewMode,
  resolveViewMode,
  type ViewModeContext,
} from '../viewModes';

const context = (overrides: Partial<ViewModeContext> = {}): ViewModeContext => ({
  batterySaver: false,
  moving: false,
  inTown: true,
  online: true,
  satelliteLicensed: true,
  buildingsInPack: true,
  ...overrides,
});

describe('the map modes', () => {
  it('offers the four modes the courier can choose', () => {
    expect(MAP_VIEW_MODES).toEqual(['flat', '3d', 'satellite', 'auto']);
    expect(DEFAULT_MAP_VIEW_MODE).toBe('flat');
  });

  it('knows which values are modes', () => {
    expect(isMapViewMode('3d')).toBe(true);
    expect(isMapViewMode('satellite')).toBe(true);
    expect(isMapViewMode('cinematic')).toBe(false);
    expect(isMapViewMode(null)).toBe(false);
  });

  it('keeps the flat map flat', () => {
    const decision = resolveViewMode('flat', context());

    expect(decision.effective).toBe('flat');
    expect(decision.reason).toBe('as-asked');
    expect(decision.degraded).toBe(false);
    expect(decision.message).toBeNull();
  });

  it('tilts the map in the 3D mode', () => {
    const decision = resolveViewMode('3d', context());

    expect(decision.effective).toBe('3d');
    expect(decision.degraded).toBe(false);
    expect(decision.message).toBeNull();
  });

  it('says so when the pack has no 3D buildings', () => {
    const decision = resolveViewMode('3d', context({ buildingsInPack: false }));

    expect(decision.effective).toBe('3d');
    expect(decision.message).toContain('no 3D buildings');
  });

  it('shows the satellite imagery when there is a network and a licence', () => {
    const decision = resolveViewMode('satellite', context());

    expect(decision.effective).toBe('satellite');
    expect(decision.degraded).toBe(false);
  });

  it('refuses the satellite imagery without a network', () => {
    const decision = resolveViewMode('satellite', context({ online: false }));

    expect(decision.effective).toBe('flat');
    expect(decision.reason).toBe('satellite-unavailable');
    expect(decision.degraded).toBe(true);
    expect(decision.message).toContain('Satellite needs a network and a licence');
  });

  it('refuses the satellite imagery without a licence', () => {
    const decision = resolveViewMode('satellite', context({ satelliteLicensed: false }));

    expect(decision.effective).toBe('flat');
    expect(decision.reason).toBe('satellite-unavailable');
    expect(decision.degraded).toBe(true);
  });

  describe('the auto mode', () => {
    it('tilts the map while the courier is driving in a town', () => {
      const decision = resolveViewMode('auto', context({ moving: true, inTown: true }));

      expect(decision.effective).toBe('3d');
      expect(decision.reason).toBe('driving-in-town');
      expect(decision.degraded).toBe(false);
    });

    it('keeps the map flat when the courier has stopped', () => {
      const decision = resolveViewMode('auto', context({ moving: false, inTown: true }));

      expect(decision.effective).toBe('flat');
      expect(decision.reason).toBe('stopped');
    });

    it('keeps the map flat on a rural road', () => {
      const decision = resolveViewMode('auto', context({ moving: true, inTown: false }));

      expect(decision.effective).toBe('flat');
      expect(decision.reason).toBe('rural');
    });
  });

  describe('the battery saver', () => {
    it('keeps the map flat in the auto mode', () => {
      const decision = resolveViewMode(
        'auto',
        context({ moving: true, inTown: true, batterySaver: true }),
      );

      expect(decision.effective).toBe('flat');
      expect(decision.reason).toBe('battery-saver');
    });

    it('keeps the map flat even when the 3D map was asked for', () => {
      const decision = resolveViewMode('3d', context({ batterySaver: true }));

      expect(decision.effective).toBe('flat');
      expect(decision.reason).toBe('battery-saver');
      expect(decision.degraded).toBe(true);
      expect(decision.message).toContain('Battery saver');
    });

    it('is not a degradation when the map was flat anyway', () => {
      const decision = resolveViewMode('flat', context({ batterySaver: true }));

      expect(decision.effective).toBe('flat');
      expect(decision.degraded).toBe(false);
    });
  });
});
