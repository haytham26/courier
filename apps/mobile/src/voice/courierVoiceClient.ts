/**
 * The client of Courier Voice.
 *
 * The app talks to the voice service over four kinds of call: the shift, a
 * turn of the conversation, the proactive check ("is there anything to say?")
 * and the settings.
 *
 * The client is deliberately plain: a fetch, a timeout, one retry, and a
 * bearer token from the session. When the service cannot be reached the
 * caller is told, and the app carries on with the on-device path: the voice
 * of the phone never depends on the network.
 */

import { errorMessage } from '@/lib/errors';
import type { MapViewMode } from '@/maps/viewModes';

import type { VoiceCommand } from './VoiceService';
import type {
  VoiceAudioFocus,
  VoiceMode,
  VoiceSettings,
  VoiceTrigger,
} from './settings';

export type {
  VoiceAudioFocus,
  VoiceMode,
  VoiceSettings,
  VoiceTrigger,
} from './settings';

/** One thing the courier asked for, as the service sends it. */
export interface CourierVoiceAction {
  type: string;
  stop_id?: string | null;
  reason?: string | null;
  safe_place?: string | null;
  mode?: string | null;
  on?: boolean | null;
  raw_address?: string | null;
  priority?: boolean | null;
  minutes?: number | null;
  kind?: string | null;
  text?: string | null;
}

/** One stop of the run, as the phone holds it. */
export interface CourierVoiceStop {
  id: string;
  sequence: number;
  number: string;
  street: string;
  suburb: string;
  status: string;
  van_zone?: string | null;
  size_class?: string | null;
  tip?: string | null;
  hazard?: string | null;
  parcel_for?: string | null;
}

/** The run, as the phone holds it. */
export interface CourierVoiceRunContext {
  shift_id?: string | null;
  stops: CourierVoiceStop[];
  current_stop_id?: string | null;
  new_addresses: number;
  weather?: string | null;
  earnings_nzd?: number | null;
  minutes_ahead?: number | null;
  returns_in_van: number;
  expected_stops?: number | null;
}

/** The body of a turn. */
export interface CourierVoiceTurnRequest {
  transcript: string;
  trigger?: VoiceTrigger;
  speed_kmh?: number;
  audio_focus?: VoiceAudioFocus;
  language?: string;
  online?: boolean;
  mode?: VoiceMode;
  settings?: VoiceSettings;
  context?: CourierVoiceRunContext;
  started_at?: number;
}

/** The answer of the service. */
export interface CourierVoiceTurn {
  speech: string;
  action: CourierVoiceAction | null;
  engine: string;
  source: 'on-device' | 'server';
  mode: VoiceMode;
  barge_in: boolean;
  ended_turn: boolean;
  priority: 'now' | 'queue';
  notice: string | null;
  words: number;
  latency_ms: number;
}

/** The shift, as the service holds it. */
export interface CourierVoiceSession {
  id: string;
  driver_id: string;
  shift_id: string | null;
  turns: number;
  settings: VoiceSettings;
  remembered: boolean;
}

/** The line the voice wants to say first. */
export interface CourierVoiceProactive {
  kind: string | null;
  text: string;
  words: number;
}

/** The engines of the swappable seam. */
export interface CourierVoiceEngine {
  name: string;
  online: boolean;
  stt: boolean;
  tts: boolean;
  chat: boolean;
  reason: string;
  licence: string;
}

/** One row of the licence ledger the service publishes. */
export interface CourierVoiceLicence {
  artefact: string;
  kind: string;
  version: string;
  licence: string;
  read_on: string;
  decision: 'shippable' | 'internal-only' | 'blocked';
  obligations: string;
  where_used: string;
}

/** The ways the client can be built. */
export interface CourierVoiceClientOptions {
  /** Where the voice service lives. */
  baseUrl: string;
  /** The courier's token, read when a call is made. */
  getToken: () => Promise<string | null>;
  /** The fetch of the app, so the tests can use their own. */
  fetchImpl?: typeof fetch;
  /** How long a call may take. */
  timeoutMs?: number;
}

/** What the client throws when the service cannot be reached. */
export class CourierVoiceUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CourierVoiceUnavailableError';
  }
}

const DEFAULT_TIMEOUT_MS = 8000;

/**
 * The client of the voice service.
 *
 * Every call has a timeout and one retry: the voice must not hang while a
 * courier waits at a gate. A failure is an error, never a silent nothing.
 */
export class CourierVoiceClient {
  private readonly options: CourierVoiceClientOptions;

  constructor(options: CourierVoiceClientOptions) {
    this.options = options;
  }

  private get baseUrl(): string {
    return this.options.baseUrl.replace(/\/+$/, '');
  }

  private get fetchImpl(): typeof fetch {
    return this.options.fetchImpl ?? fetch;
  }

  private async request(
    path: string,
    init: { method: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown },
  ): Promise<unknown> {
    const token = await this.options.getToken();
    if (token === null || token.trim() === '') {
      throw new CourierVoiceUnavailableError('there is no session for the voice service');
    }

    const url = `${this.baseUrl}${path}`;
    const timeout = this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await this.fetchImpl(url, {
          method: init.method,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: init.body === undefined ? undefined : JSON.stringify(init.body),
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new CourierVoiceUnavailableError(
            `the voice service answered ${response.status}`,
          );
        }
        return await response.json();
      } catch (error) {
        lastError = error;
      } finally {
        clearTimeout(timer);
      }
    }

    throw new CourierVoiceUnavailableError(
      `the voice service cannot be reached: ${errorMessage(lastError)}`,
    );
  }

  /** Starts a shift of the voice. */
  async startSession(context?: CourierVoiceRunContext): Promise<CourierVoiceSession> {
    const body = await this.request('/v1/sessions', {
      method: 'POST',
      body: context === undefined ? {} : { context },
    });
    return body as CourierVoiceSession;
  }

  /** Reads a shift of the voice. */
  async readSession(sessionId: string): Promise<CourierVoiceSession> {
    const body = await this.request(`/v1/sessions/${sessionId}`, { method: 'GET' });
    return body as CourierVoiceSession;
  }

  /** Sends one turn of the conversation. */
  async sendTurn(
    sessionId: string,
    turn: CourierVoiceTurnRequest,
  ): Promise<CourierVoiceTurn> {
    const body = await this.request(`/v1/sessions/${sessionId}/turn`, {
      method: 'POST',
      body: turn,
    });
    return body as CourierVoiceTurn;
  }

  /** Asks the service whether it has something to say first. */
  async proactive(
    sessionId: string,
    event: string,
  ): Promise<CourierVoiceProactive> {
    const body = await this.request(`/v1/sessions/${sessionId}/proactive`, {
      method: 'POST',
      body: { event },
    });
    return body as CourierVoiceProactive;
  }

  /** Makes the service forget the shift. */
  async forgetSession(sessionId: string): Promise<void> {
    await this.request(`/v1/sessions/${sessionId}/memory`, { method: 'DELETE' });
  }

  /** The settings the service holds for the courier. */
  async readSettings(): Promise<VoiceSettings> {
    const body = await this.request('/v1/settings', { method: 'GET' });
    const settings = (body as { settings?: unknown }).settings;
    return settings as VoiceSettings;
  }

  /** Changes a setting. */
  async writeSettings(settings: VoiceSettings): Promise<VoiceSettings> {
    const body = await this.request('/v1/settings', {
      method: 'PUT',
      body: { settings },
    });
    return (body as { settings?: unknown }).settings as VoiceSettings;
  }

  /** The engines of the swappable seam. */
  async engines(): Promise<CourierVoiceEngine[]> {
    const body = await this.request('/v1/engines', { method: 'GET' });
    return (body as { engines?: unknown }).engines as CourierVoiceEngine[];
  }

  /** The licence ledger the service publishes. */
  async licences(): Promise<CourierVoiceLicence[]> {
    const body = await this.request('/v1/licences', { method: 'GET' });
    return (body as { entries?: unknown }).entries as CourierVoiceLicence[];
  }
}

/**
 * The command of the app that a service action means.
 *
 * The service speaks the catalogue of the product (the same names the API
 * uses). The app has its own catalogue of commands, so the action is
 * translated here, once, and the map commands of the maps squad come with it.
 */
export function toVoiceCommand(action: CourierVoiceAction | null): VoiceCommand | null {
  if (action === null) {
    return null;
  }
  const stopId = action.stop_id ?? 'current';
  switch (action.type) {
    case 'mark_delivered':
      // BUG-073: the safe place the service (or the offline parser) captured
      // is carried into the app's command. Dropping it here undid the whole
      // point of the courier saying "left it at the side gate" out loud.
      if (action.safe_place !== undefined && action.safe_place !== null && action.safe_place.trim().length > 0) {
        return { type: 'mark_delivered', stopId, safePlace: action.safe_place.trim() };
      }
      return { type: 'mark_delivered', stopId };
    case 'mark_failed':
      return { type: 'mark_failed', stopId, reason: action.reason ?? 'voice' };
    case 'skip_stop':
      return { type: 'mark_skipped', stopId };
    case 'add_stop':
      return { type: 'add_stop', rawAddress: action.raw_address ?? '' };
    case 'start_break':
      return { type: 'start_break', minutes: action.minutes ?? null };
    case 'end_break':
      return { type: 'end_break' };
    case 'add_location_note':
      return {
        type: 'add_location_note',
        kind: action.kind ?? 'note',
        text: action.text ?? '',
      };
    case 'repeat_or_detail':
      return { type: 'repeat_instruction' };
    case 'navigate_next':
      return { type: 'navigate_next' };
    case 'navigate_previous':
      return { type: 'navigate_previous' };
    case 'where_am_i':
      return { type: 'where_am_i' };
    case 'how_many_left':
      return { type: 'how_many_left' };
    case 'start_shift':
      return { type: 'start_shift' };
    case 'end_shift':
      return { type: 'end_shift' };
    case 'emergency':
      return { type: 'emergency' };
    case 'set_map_mode':
      return { type: 'set_map_mode', mode: (action.mode ?? 'flat') as MapViewMode };
    case 'zoom_to_next_stop':
      return { type: 'zoom_to_next_stop' };
    case 'tilt_map':
      return { type: 'tilt_map', on: action.on ?? true };
    case 'follow_me':
      return { type: 'follow_me', on: action.on ?? true };
    case 'look_back':
      return { type: 'look_back' };
    case 'reset_camera':
      return { type: 'reset_camera' };
    case 'set_quiet_mode':
      return { type: 'set_quiet_mode', on: action.on ?? true };
    case 'set_verbosity':
      return { type: 'set_verbosity', verbosity: action.text ?? 'normal' };
    default:
      return null;
  }
}
