/**
 * Tests for the voice settings.
 *
 * The settings live in the app, on the phone: a broken file must never take
 * the voice down, and a setting the courier did not choose falls back to the
 * default.
 */

import { createMemoryPreferenceStore } from '@/sync/storage';

import {
  DEFAULT_VOICE_SETTINGS,
  parseVoiceSettings,
  readVoiceSettings,
  storeVoiceSettings,
  VOICE_SETTINGS_PREFERENCE_KEY,
} from '../settings';

describe('the voice settings', () => {
  it('start with the defaults', () => {
    expect(parseVoiceSettings(undefined)).toEqual(DEFAULT_VOICE_SETTINGS);
  });

  it('keep what the courier chose', () => {
    const settings = parseVoiceSettings({
      verbosity: 'chatty',
      voice: 'en_au',
      speed: 1.2,
      quietMode: true,
      language: 'en-NZ',
      remember: false,
    });
    expect(settings.verbosity).toBe('chatty');
    expect(settings.voice).toBe('en_au');
    expect(settings.speed).toBe(1.2);
    expect(settings.quietMode).toBe(true);
    expect(settings.remember).toBe(false);
  });

  it('fall back when the file is broken', () => {
    const settings = parseVoiceSettings({ verbosity: 'shouty', voice: 'klingon', speed: 'fast' });
    expect(settings.verbosity).toBe(DEFAULT_VOICE_SETTINGS.verbosity);
    expect(settings.voice).toBe(DEFAULT_VOICE_SETTINGS.voice);
    expect(settings.speed).toBe(DEFAULT_VOICE_SETTINGS.speed);
  });

  it('fall back on a language the service does not speak (BUG-084)', () => {
    // RED first: the language was only checked for a non-empty string, so a
    // corrupt stored value reached the engine while every sibling field fell
    // back - the restore path validated at 129-131 (the speed clamp) and 133-149
    // (this field) was the one gap.
    expect(parseVoiceSettings({ language: 'klingon' }).language).toBe(
      DEFAULT_VOICE_SETTINGS.language,
    );
    expect(parseVoiceSettings({ language: '' }).language).toBe(DEFAULT_VOICE_SETTINGS.language);
    expect(parseVoiceSettings({ language: 42 }).language).toBe(DEFAULT_VOICE_SETTINGS.language);
  });

  it('keep a language the service speaks', () => {
    expect(parseVoiceSettings({ language: 'mi-NZ' }).language).toBe('mi-NZ');
    expect(parseVoiceSettings({ language: 'auto' }).language).toBe('auto');
  });

  it('hold the speed between a half and twice the speed', () => {
    expect(parseVoiceSettings({ speed: 0.1 }).speed).toBe(0.5);
    expect(parseVoiceSettings({ speed: 9 }).speed).toBe(2);
  });

  it('keep the alerts that are on', () => {
    const settings = parseVoiceSettings({
      proactive: { morningBrief: false, approach: true },
    });
    expect(settings.proactive.morningBrief).toBe(false);
    expect(settings.proactive.approach).toBe(true);
    expect(settings.proactive.nextStop).toBe(DEFAULT_VOICE_SETTINGS.proactive.nextStop);
  });

  it('are kept in the preferences of the driver', async () => {
    const store = createMemoryPreferenceStore();
    await storeVoiceSettings(store, 'driver-1', {
      ...DEFAULT_VOICE_SETTINGS,
      verbosity: 'minimal',
      quietMode: true,
    });

    const read = await readVoiceSettings(store, 'driver-1');
    expect(read.verbosity).toBe('minimal');
    expect(read.quietMode).toBe(true);
  });

  it('are not carried from one driver to the next', async () => {
    const store = createMemoryPreferenceStore();
    await storeVoiceSettings(store, 'driver-1', {
      ...DEFAULT_VOICE_SETTINGS,
      verbosity: 'minimal',
    });

    const other = await readVoiceSettings(store, 'driver-2');
    expect(other.verbosity).toBe(DEFAULT_VOICE_SETTINGS.verbosity);
  });

  it('live under one key in the preferences', async () => {
    const store = createMemoryPreferenceStore();
    await storeVoiceSettings(store, 'driver-1', DEFAULT_VOICE_SETTINGS);
    const raw = await store.read('driver-1');
    expect(raw).not.toBeNull();
    const stored = JSON.parse(raw ?? '{}') as Record<string, unknown>;
    expect(stored[VOICE_SETTINGS_PREFERENCE_KEY]).toBeDefined();
  });
});
