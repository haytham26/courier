/**
 * Voice Hook
 * React hook for using the voice service in components
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import type { VoiceState, VoiceCommand, VoiceCallbacks, VoiceConfig, EarbudEvent } from './VoiceService';
import { voiceService } from './VoiceService';

/**
 * How many live consumers are holding the voice service open.
 *
 * The service is a singleton the whole app shares - the driving screen, the
 * copilot, the map and the settings all mount this hook - so one consumer's
 * unmount must not shut it down under another. Before this the cleanup called
 * `voiceService.shutdown()` unconditionally, so the first screen to unmount
 * nulled the shared engines and the driving screen still on top of them spoke
 * no more (the C1 audit's BUG-075). The count is the claim each consumer takes
 * on mount and drops on unmount, and the service is released when the last
 * claim goes.
 */
let liveConsumers = 0;

export function useVoice(config?: VoiceConfig) {
  const [state, setState] = useState<VoiceState>('idle');
  const [isReady, setIsReady] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  const [lastEarbudEvent, setLastEarbudEvent] = useState<EarbudEvent | null>(null);
  const callbacksRef = useRef<VoiceCallbacks>({
    onStateChange: (newState) => {
      setState(newState);
      setIsReady(voiceService.isReady());
    },
    onTranscript: (text, final) => {
      if (final) {
        setLastTranscript(text);
      }
    },
    onCommand: (command) => {
      setLastCommand(command);
    },
    onError: (error) => {
      console.error('Voice error:', error);
    },
    onEarbudEvent: (event) => {
      setLastEarbudEvent(event);
    },
  });

  useEffect(() => {
    // Only a consumer that drives the service takes a claim on it. A screen
    // that asks for nothing (four of them mount this hook with no config)
    // never started the engines, so it has nothing to release - and before
    // this it released the shared instance anyway, which took the driving
    // screen's voice away (BUG-075).
    const ownsTheService = config !== undefined;
    if (ownsTheService) {
      liveConsumers += 1;
      voiceService.initialize(config, callbacksRef.current).catch(console.error);
    }

    return () => {
      if (!ownsTheService) {
        return;
      }
      liveConsumers = Math.max(0, liveConsumers - 1);
      // The service is released only by the LAST consumer that owns it. One
      // screen closing never takes the courier's voice away from another
      // screen that is still using it.
      if (liveConsumers === 0) {
        voiceService.shutdown().catch(console.error);
      }
    };
  }, [config]);

  const startListening = useCallback(async () => {
    await voiceService.startListening();
  }, []);

  const stopListening = useCallback(async () => {
    await voiceService.stopListening();
  }, []);

  const speak = useCallback(async (text: string) => {
    await voiceService.speak(text);
  }, []);

  return {
    state,
    isReady,
    lastTranscript,
    lastCommand,
    lastEarbudEvent,
    startListening,
    stopListening,
    speak,
  };
}

export { voiceService };
export type { VoiceState, VoiceCommand, VoiceConfig, EarbudEvent };