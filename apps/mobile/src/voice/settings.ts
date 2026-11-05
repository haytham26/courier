/**
 * The voice settings of the courier.
 *
 * The settings live in the app, on the phone: the verbosity, the voice, the
 * speed, the quiet mode, the essentials mode and the alerts the voice may
 * give first. The voice service honours them, and the app is the only place
 * they are changed.
 *
 * They are kept in the driver's own preference file, so a shared van phone
 * does not carry one courier's voice into the next courier's shift.
 */

import {
  readDriverPreferences,
  writeDriverPreference,
  type PreferenceStore,
} from '@/sync/storage';

/** How talkative the voice is. */
export type VoiceVerbosity = 'minimal' | 'normal' | 'chatty';

/** Which brain answers: the one on the phone or the one on the server. */
export type VoiceMode = 'auto' | 'online' | 'offline';

/** What opened the turn. */
export type VoiceTrigger = 'wake_word' | 'earbud' | 'push_to_talk' | 'proactive';

/** What else is making noise on the phone. */
export type VoiceAudioFocus = 'normal' | 'call' | 'music' | 'navigation';

/** The things the voice says first, and whether each one is on. */
export interface VoiceProactiveToggles {
  morningBrief: boolean;
  nextStop: boolean;
  approach: boolean;
  hazard: boolean;
  parcelLocation: boolean;
  etaCheck: boolean;
  breakReminder: boolean;
  routeChange: boolean;
  endOfDay: boolean;
}

/** The choices the courier made in the settings. */
export interface VoiceSettings {
  verbosity: VoiceVerbosity;
  voice: string;
  speed: number;
  quietMode: boolean;
  essentialsOnly: boolean;
  language: VoiceLanguage;
  remember: boolean;
  proactive: VoiceProactiveToggles;
}

/** The voices the service can speak. */
export const VOICE_IDS: readonly string[] = ['nz', 'en_au', 'en_gb', 'en_us'];

/** The verbosities the courier can pick. */
export const VOICE_VERBOSITIES: readonly VoiceVerbosity[] = ['minimal', 'normal', 'chatty'];

/**
 * The languages the voice service can speak.
 *
 * The service's own vocabulary (`VoiceConfig.language` in VoiceService.ts):
 * New Zealand English, te reo, and `auto`, which lets the service pick. A
 * stored value outside it is a corrupt file, not a preference.
 */
export const VOICE_LANGUAGES = ['en-NZ', 'mi-NZ', 'auto'] as const;

/** One of the languages the voice service can speak. */
export type VoiceLanguage = (typeof VOICE_LANGUAGES)[number];

function isLanguage(value: unknown): value is VoiceLanguage {
  return typeof value === 'string' && (VOICE_LANGUAGES as readonly string[]).includes(value);
}

/** The settings a courier starts with. */
export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  verbosity: 'normal',
  voice: 'nz',
  speed: 1,
  quietMode: false,
  essentialsOnly: false,
  language: 'en-NZ',
  remember: true,
  proactive: {
    morningBrief: true,
    nextStop: true,
    approach: true,
    hazard: true,
    parcelLocation: true,
    etaCheck: true,
    breakReminder: true,
    routeChange: true,
    endOfDay: true,
  },
};

/** The key the settings are stored under in the driver's preferences. */
export const VOICE_SETTINGS_PREFERENCE_KEY = 'voice.settings';

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isVerbosity(value: unknown): value is VoiceVerbosity {
  return typeof value === 'string' && (VOICE_VERBOSITIES as readonly string[]).includes(value);
}

function isVoiceId(value: unknown): value is string {
  return typeof value === 'string' && VOICE_IDS.includes(value);
}

function parseProactive(raw: unknown): VoiceProactiveToggles {
  /** The toggles that are on, with the defaults for the ones that are not there. */
  const source = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const read = (key: keyof VoiceProactiveToggles): boolean => {
    const value = source[key];
    return isBoolean(value) ? value : DEFAULT_VOICE_SETTINGS.proactive[key];
  };
  return {
    morningBrief: read('morningBrief'),
    nextStop: read('nextStop'),
    approach: read('approach'),
    hazard: read('hazard'),
    parcelLocation: read('parcelLocation'),
    etaCheck: read('etaCheck'),
    breakReminder: read('breakReminder'),
    routeChange: read('routeChange'),
    endOfDay: read('endOfDay'),
  };
}

/**
 * The settings out of anything that was stored.
 *
 * A file that was written by an older build, or by hand, must not take the
 * voice down: every field that is not what it should be falls back to the
 * default.
 */
export function parseVoiceSettings(raw: unknown): VoiceSettings {
  const source = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const speed = source.speed;
  const clampedSpeed =
    typeof speed === 'number' && Number.isFinite(speed)
      ? Math.min(Math.max(speed, 0.5), 2)
      : DEFAULT_VOICE_SETTINGS.speed;
  const language = source.language;
  return {
    verbosity: isVerbosity(source.verbosity)
      ? source.verbosity
      : DEFAULT_VOICE_SETTINGS.verbosity,
    voice: isVoiceId(source.voice) ? source.voice : DEFAULT_VOICE_SETTINGS.voice,
    speed: clampedSpeed,
    quietMode: isBoolean(source.quietMode)
      ? source.quietMode
      : DEFAULT_VOICE_SETTINGS.quietMode,
    essentialsOnly: isBoolean(source.essentialsOnly)
      ? source.essentialsOnly
      : DEFAULT_VOICE_SETTINGS.essentialsOnly,
    // BUG-084: the language is validated the way its sibling fields are -
    // against the vocabulary the service actually speaks - instead of only
    // being checked for a non-empty string, which let a corrupt stored value
    // through to the engine while every other field fell back.
    language: isLanguage(language) ? language : DEFAULT_VOICE_SETTINGS.language,
    remember: isBoolean(source.remember) ? source.remember : DEFAULT_VOICE_SETTINGS.remember,
    proactive: parseProactive(source.proactive),
  };
}

/** The settings of a driver, read from the store. */
export async function readVoiceSettings(
  store: PreferenceStore,
  driverId: string,
): Promise<VoiceSettings> {
  const preferences = await readDriverPreferences(store, driverId);
  return parseVoiceSettings(preferences[VOICE_SETTINGS_PREFERENCE_KEY]);
}

/** Remembers the settings of a driver. */
export async function storeVoiceSettings(
  store: PreferenceStore,
  driverId: string,
  settings: VoiceSettings,
): Promise<void> {
  await writeDriverPreference(
    store,
    driverId,
    VOICE_SETTINGS_PREFERENCE_KEY,
    parseVoiceSettings(settings),
  );
}
