/**
 * Earbud Button Native Module Interface
 * This defines the TypeScript interface for the native module
 * that handles earbud button events (Android/iOS)
 */

import { NativeModules, Platform, NativeEventEmitter } from 'react-native';

export interface EarbudEvent {
  type: 'single' | 'double' | 'triple' | 'long';
  timestamp: number;
}

export interface EarbudButtonModuleInterface {
  startListening(): Promise<void>;
  stopListening(): Promise<void>;
  isSupported(): Promise<boolean>;
  addListener(eventName: string, listener: (...args: readonly unknown[]) => void): void;
  removeListeners(count: number): void;
}

const { EarbudButtonManager } = NativeModules;

let eventEmitter: NativeEventEmitter | null = null;

if (EarbudButtonManager && Platform.OS !== 'web') {
  eventEmitter = new NativeEventEmitter(EarbudButtonManager);
}

export const EarbudButtonModule: EarbudButtonModuleInterface = {
  async startListening(): Promise<void> {
    if (!EarbudButtonManager) {
      console.warn('EarbudButtonManager native module not available');
      return;
    }
    return EarbudButtonManager.startListening();
  },

  async stopListening(): Promise<void> {
    if (!EarbudButtonManager) {
      console.warn('EarbudButtonManager native module not available');
      return;
    }
    return EarbudButtonManager.stopListening();
  },

  async isSupported(): Promise<boolean> {
    if (!EarbudButtonManager) {
      return false;
    }
    return EarbudButtonManager.isSupported?.() ?? false;
  },

  addListener(eventName: string, listener: (...args: readonly unknown[]) => void): void {
    if (!eventEmitter) {
      console.warn('EarbudButtonManager native module not available');
      return;
    }
    eventEmitter.addListener(eventName, listener);
  },

  removeListeners(count: number): void {
    if (!eventEmitter) return;
    eventEmitter.removeAllListeners();
  },
};

/**
 * Hook to use earbud button events in React components
 */
import { useEffect, useCallback } from 'react';
import { voiceService } from './VoiceService';

export function useEarbudButtons(): void {
  const handleEarbudEvent = useCallback((event: EarbudEvent) => {
    voiceService.onEarbudEvent(event);
  }, []);

  useEffect(() => {
    EarbudButtonModule.addListener('earbudEvent', handleEarbudEvent);
    
    EarbudButtonModule.startListening().catch(console.error);

    return () => {
      EarbudButtonModule.stopListening().catch(console.error);
      EarbudButtonModule.removeListeners(1);
    };
  }, [handleEarbudEvent]);
}

export default EarbudButtonModule;