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
import { ackLineFor, routeTurn } from './turnRouter';
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
  /**
   * The client to use (D1): the build's own seam passes the E2E mock client,
   * so the turn flow is exercisable without a network; by default the real
   * client is built from `baseUrl` and `getToken`.
   */
  client?: CourierVoiceClient;
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
  /**
   * How the last turn was routed (D1): 'free' | 'ignore' | 'full', or null
   * when no turn has been sent yet.
   */
  lastGate: string | null;
  /** The last turn's own answer, as the service (or the free route) sent it. */
  lastAnswer: CourierVoiceTurn | null;
  /**
   * The question the last answer was about, when the answer carried a notice
   * and no action (the service's ask-on-low-confidence, MASTER §22): the next
   * turn may be the answer to it.
   */
  lastQuestion: string | null;
  /**
   * Clears what the voice remembers of this shift (MASTER §22 technique C,
   * BUG-202): the service's memory is deleted AND the app's carried-forward
   * question is dropped, so the next turn cannot answer from cleared state.
   * Answers false when there is no shift, or when the service could not be
   * reached (the local question is dropped either way; the failure is said,
   * never silent).
   */
  forgetMemory: () => Promise<boolean>;
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
    client: givenClient,
  } = options;

  const [session, setSession] = useState<CourierVoiceSession | null>(null);
  const [settings, setSettings] = useState<VoiceSettings>(DEFAULT_VOICE_SETTINGS);
  const [brief, setBrief] = useState<CourierVoiceProactive | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastGate, setLastGate] = useState<string | null>(null);
  const [lastAnswer, setLastAnswer] = useState<CourierVoiceTurn | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const sessionRef = useRef<CourierVoiceSession | null>(null);
  const startedFor = useRef<string | null>(null);

  const client = useMemo(
    () => givenClient ?? new CourierVoiceClient({ baseUrl, getToken }),
    [givenClient, baseUrl, getToken],
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
      // D1 (BUG-231): the turn is routed before anything is sent anywhere,
      // mirroring the service's own pre-classifier (MASTER §22 technique A).
      const routed = routeTurn(transcript);
      setLastGate(routed.gate);
      if (routed.gate === 'ignore') {
        // Nothing was said that needed an answer: no model call, no command.
        return null;
      }
      if (routed.gate === 'free' && routed.command !== null) {
        // A command whose answer does not depend on the day: the phone
        // answers it - the command goes on the channel and the ack is spoken
        // - with NO HTTP call.
        publishVoiceCommand(routed.command);
        const ack = ackLineFor(routed.command);
        const answer: CourierVoiceTurn = {
          speech: ack,
          action: null,
          engine: 'offline-brain',
          source: 'on-device',
          mode: online ? 'auto' : 'offline',
          barge_in: false,
          ended_turn: true,
          priority: 'now',
          notice: null,
          words: ack.split(/\s+/).filter((w) => w.length > 0).length,
          latency_ms: 0,
          gate: 'free',
        };
        setLastAnswer(answer);
        setLastQuestion(null);
        setError(null);
        if (ack.length > 0) {
          await voiceService.speak(ack);
        }
        return answer;
      }

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
        // The service's own routing decision is passed through and kept, so
        // it is reviewable after the fact rather than assumed.
        setLastGate(answer.gate ?? 'full');
        setLastAnswer(answer);
        // An answer that carries a notice and no action is a question: the
        // next turn may be the answer to it (the ask-on-low-confidence rule).
        setLastQuestion(answer.notice !== null && answer.action === null ? answer.notice : null);

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

  const forgetMemory = useCallback(async (): Promise<boolean> => {
    const current = sessionRef.current;
    if (current === null) {
      return false;
    }
    // MASTER §22 (D48) technique C: deletion is total and immediate - the
    // app's own carried-forward state goes first, so a clear that only
    // half-clears cannot carry the memory on into the next turn.
    setLastQuestion(null);
    setSession({ ...current, remembered: false });
    try {
      await client.forgetSession(current.id);
      setError(null);
      return true;
    } catch (problem) {
      setError(errorMessage(problem));
      return false;
    }
  }, [client]);

  return {
    ready: session !== null,
    session,
    settings,
    saveSettings,
    brief,
    refreshBrief,
    sendTurn,
    error,
    lastGate,
    lastAnswer,
    lastQuestion,
    forgetMemory,
  };
}
