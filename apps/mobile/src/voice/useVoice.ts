/**
 * Voice Hook
 * React hook for using the voice service in components
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import type { VoiceState, VoiceCommand, VoiceCallbacks, VoiceConfig, EarbudEvent } from './VoiceService';
import { voiceService } from './VoiceService';

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
    if (config) {
      voiceService.initialize(config, callbacksRef.current).catch(console.error);
    }

    return () => {
      voiceService.shutdown().catch(console.error);
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