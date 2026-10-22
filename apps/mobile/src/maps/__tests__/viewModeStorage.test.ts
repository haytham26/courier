/**
 * Tests for the storage of the map mode.
 *
 * The mode belongs to the driver: a shared van phone carries more than one
 * driver, and the driver who had the 3D map on is not the driver who has it
 * now. These tests need no device and no network.
 */

import { createMemoryPreferenceStore, readDriverPreferences, writeDriverPreference } from '@/sync/storage';

import { VIEW_MODE_PREFERENCE_KEY, readStoredViewMode, storeViewMode } from '../viewModes';

describe('the map mode of a driver', () => {
  it('has no mode before the driver has chosen one', async () => {
    const store = createMemoryPreferenceStore();

    expect(await readStoredViewMode(store, 'driver-a')).toBeNull();
  });

  it('keeps the mode the driver chose', async () => {
    const store = createMemoryPreferenceStore();

    await storeViewMode(store, 'driver-a', '3d');

    expect(await readStoredViewMode(store, 'driver-a')).toBe('3d');
  });

  it('does not carry one driver mode into another driver', async () => {
    const store = createMemoryPreferenceStore();

    await storeViewMode(store, 'driver-a', '3d');
    await storeViewMode(store, 'driver-b', 'flat');

    expect(await readStoredViewMode(store, 'driver-a')).toBe('3d');
    expect(await readStoredViewMode(store, 'driver-b')).toBe('flat');
  });

  it('leaves the other driver without a mode', async () => {
    const store = createMemoryPreferenceStore();

    await storeViewMode(store, 'driver-a', 'satellite');

    expect(await readStoredViewMode(store, 'driver-b')).toBeNull();
  });

  it('keeps the other settings of the driver when the mode is saved', async () => {
    const store = createMemoryPreferenceStore();

    await store.write('driver-a', JSON.stringify({ 'map.toggles': { buildings: false } }));
    await storeViewMode(store, 'driver-a', 'auto');

    const raw = await store.read('driver-a');
    const preferences = JSON.parse(raw ?? '{}') as Record<string, unknown>;

    expect(preferences[VIEW_MODE_PREFERENCE_KEY]).toBe('auto');
    expect(preferences['map.toggles']).toEqual({ buildings: false });
  });

  it('ignores a mode that is not one of the four', async () => {
    const store = createMemoryPreferenceStore();

    await store.write('driver-a', JSON.stringify({ [VIEW_MODE_PREFERENCE_KEY]: 'cinematic' }));

    expect(await readStoredViewMode(store, 'driver-a')).toBeNull();
  });

  it('ignores a preferences file that is broken', async () => {
    const store = createMemoryPreferenceStore();

    await store.write('driver-a', 'not json at all');

    expect(await readStoredViewMode(store, 'driver-a')).toBeNull();
  });

  it('keeps every value when two of them are written at the same time', async () => {
    const store = createMemoryPreferenceStore();

    await Promise.all([
      storeViewMode(store, 'driver-a', '3d'),
      writeDriverPreference(store, 'driver-a', 'map.toggles', { buildings: false }),
    ]);

    expect(await readStoredViewMode(store, 'driver-a')).toBe('3d');
    const preferences = await readDriverPreferences(store, 'driver-a');
    expect(preferences['map.toggles']).toEqual({ buildings: false });
  });
});
