/**
 * The hook of Courier Voice.
 *
 * It is the wiring between the three parts of the voice on the phone:
 *
 * - the **client** talks to the voice service (the shift, the turn, the
 *   proactive check, the settings);
 * - the **voice service of the app** (`VoiceService.ts`) speaks the words with
 *   the on-device voice pack;
 * - the **command channel** (`commandChannel.ts`) carries the commands to the
 *   screens, the map commands among them.
 *
 * When the service cannot be reached the app does not go quiet: the local
 * parser of the app takes the sentence, the command goes on the channel and
 * the phone speaks the line itself. That is the seamless switch the spec
 * asks for (MASTER_EXECUTION §12, "offline vs online").
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { errorMessage } from '@/lib/errors';
import { sessionToken } from '@/lib/auth-client';
import type { PreferenceStore } from '@/sync/storage';

import { publishVoiceCommand } from './commandChannel';
import { parseVoiceCommand } from './commands';
import {
  CourierVoiceClient,
  toVoiceCommand,
  type CourierVoiceProactive,
  type CourierVoiceSession,
  type CourierVoiceTurn,
} from './courierVoiceClient';
import {
  DEFAULT_VOICE_SETTINGS,
  readVoiceSettings,
  storeVoiceSettings,
  type VoiceAudioFocus,
  type VoiceSettings,
  type VoiceTrigger,
} from './settings';
import { voiceService } from './VoiceService';

/** Where the voice service lives. */
export const VOICE_SERVICE_URL =
  process.env.EXPO_PUBLIC_VOICE_SERVICE_URL ?? 'http://localhost:8080';

/** The ways the hook can be built. */
export interface UseCourierVoiceOptions {
  /** Where the voice service is. */
  baseUrl?: string;
  /** The courier: the settings and the shift belong to them. */
  driverId?: string | null;
  /** The courier's token. */
  getToken?: () => Promise<string | null>;
  /** Where the settings are kept. */
  store?: PreferenceStore;
  /** Whether the phone has a network. */
  online?: boolean;
}

/** The turn the app sends. */
export interface CourierVoiceTurnOptions {
  trigger?: VoiceTrigger;
  speedKmh?: number;
  audioFocus?: VoiceAudioFocus;
  startedAt?: number;
}

/** What the hook gives the screens. */
export interface CourierVoiceApi {
  /** Whether the shift of the voice is ready. */
  ready: boolean;
  /** The shift of the voice. */
  session: CourierVoiceSession | null;
  /** The settings of the courier. */
  settings: VoiceSettings;
  /** Changes a setting and keeps it on the phone. */
  saveSettings: (settings: VoiceSettings) => Promise<void>;
  /** The line the voice wants to say first. */
  brief: CourierVoiceProactive | null;
  /** Asks the service what it wants to say first. */
  refreshBrief: (event?: string) => Promise<CourierVoiceProactive | null>;
  /** Sends one turn of the conversation. */
  sendTurn: (
    transcript: string,
    options?: CourierVoiceTurnOptions,
  ) => Promise<CourierVoiceTurn | null>;
  /** The last failure, as a plain sentence. */
  error: string | null;
}

/**
 * The voice of the shift.
 *
 * The hook is used by the screens that talk to the driver: the morning brief
 * on the way screen and the voice settings on the settings screen.
 */
export function useCourierVoice(options: UseCourierVoiceOptions = {}): CourierVoiceApi {
  const {
    baseUrl = VOICE_SERVICE_URL,
    driverId = null,
    getToken = sessionToken,
    store,
    online = true,
  } = options;

  const [session, setSession] = useState<CourierVoiceSession | null>(null);
  const [settings, setSettings] = useState<VoiceSettings>(DEFAULT_VOICE_SETTINGS);
  const [brief, setBrief] = useState<CourierVoiceProactive | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<CourierVoiceSession | null>(null);
  const startedFor = useRef<string | null>(null);

  const client = useMemo(
    () => new CourierVoiceClient({ baseUrl, getToken }),
    [baseUrl, getToken],
  );

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    if (store === undefined || driverId === null) {
      return;
    }
    let cancelled = false;
    void readVoiceSettings(store, driverId).then((stored) => {
      if (!cancelled) {
        setSettings(stored);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [store, driverId]);

  useEffect(() => {
    if (driverId === null || startedFor.current === driverId) {
      // The shift of the voice starts once per courier: a caller that builds
      // the client on every render must not start a shift on every render.
      return;
    }
    startedFor.current = driverId;
    let cancelled = false;
    void client
      .startSession()
      .then((opened) => {
        if (!cancelled) {
          setSession(opened);
          setError(null);
        }
      })
      .catch((problem: unknown) => {
        if (!cancelled) {
          setError(errorMessage(problem));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [client, driverId]);

  const saveSettings = useCallback(
    async (next: VoiceSettings): Promise<void> => {
      setSettings(next);
      if (store !== undefined && driverId !== null) {
        await storeVoiceSettings(store, driverId, next);
      }
      try {
        const saved = await client.writeSettings(next);
        setSettings(saved);
      } catch (problem) {
        // The service is not there: the phone keeps the setting anyway.
        setError(errorMessage(problem));
      }
    },
    [client, driverId, store],
  );

  const refreshBrief = useCallback(
    async (event = 'shift_start'): Promise<CourierVoiceProactive | null> => {
      const current = sessionRef.current;
      if (current === null) {
        return null;
      }
      try {
        const line = await client.proactive(current.id, event);
        const spoken = line.kind === null ? null : line;
        setBrief(spoken);
        return spoken;
      } catch (problem) {
        setError(errorMessage(problem));
        return null;
      }
    },
    [client],
  );

  const sendTurn = useCallback(
    async (
      transcript: string,
      turn: CourierVoiceTurnOptions = {},
    ): Promise<CourierVoiceTurn | null> => {
      const current = sessionRef.current;
      if (current === null) {
        return null;
      }
      try {
        const answer = await client.sendTurn(current.id, {
          transcript,
          trigger: turn.trigger ?? 'push_to_talk',
          speed_kmh: turn.speedKmh ?? 0,
          audio_focus: turn.audioFocus ?? 'normal',
          online,
          mode: online ? 'auto' : 'offline',
          settings,
          started_at: turn.startedAt,
        });
        setError(null);

        const command = toVoiceCommand(answer.action);
        if (command !== null) {
          publishVoiceCommand(command);
        }
        if (answer.speech.length > 0 && answer.priority === 'now') {
          await voiceService.speak(answer.speech);
        }
        return answer;
      } catch (problem) {
        // The service is not there: the phone takes the sentence itself.
        const local = parseVoiceCommand(transcript);
        if (local !== null) {
          publishVoiceCommand(local);
        }
        setError(errorMessage(problem));
        return null;
      }
    },
    [client, online, settings],
  );

  return {
    ready: session !== null,
    session,
    settings,
    saveSettings,
    brief,
    refreshBrief,
    sendTurn,
    error,
  };
}
