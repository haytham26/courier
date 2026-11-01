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
  addListener(eventName: string, listener: (event: EarbudEvent) => void): void;
  removeListeners(count: number): void;
}

/**
 * The native module of the earbud buttons.
 *
 * NativeModules hands back any-typed objects, so its shape is declared here:
 * the three calls, plus the two members NativeEventEmitter needs of an event
 * module (the Android module extends RCTEventEmitter, so it carries them).
 */
interface NativeEarbudButtonModule {
  startListening(): Promise<void>;
  stopListening(): Promise<void>;
  isSupported?(): Promise<boolean>;
  addListener(eventType: string): void;
  removeListeners(count: number): void;
}

const { EarbudButtonManager } = NativeModules as {
  EarbudButtonManager?: NativeEarbudButtonModule | undefined;
};

let eventEmitter: NativeEventEmitter | null = null;

if (EarbudButtonManager && Platform.OS !== 'web') {
  eventEmitter = new NativeEventEmitter(EarbudButtonManager);
}

/**
 * The listeners this wrapper added, by event name, newest last.
 *
 * BUG-082: `removeListeners(count)` used to call `removeAllListeners()`, so one
 * unmounting subscriber detached EVERY earbud listener on the emitter - with
 * one subscriber the effect is invisible, with two a screen closing silences
 * the other. NativeEventEmitter can only remove the exact function it was
 * given, so the wrappers we create are remembered here and removed one by one.
 */
const addedListeners = new Map<string, Array<(event: EarbudEvent) => void>>();

export const EarbudButtonModule: EarbudButtonModuleInterface = {
  startListening(): Promise<void> {
    if (!EarbudButtonManager) {
      console.warn('EarbudButtonManager native module not available');
      return Promise.resolve();
    }
    return EarbudButtonManager.startListening();
  },

  stopListening(): Promise<void> {
    if (!EarbudButtonManager) {
      console.warn('EarbudButtonManager native module not available');
      return Promise.resolve();
    }
    return EarbudButtonManager.stopListening();
  },

  isSupported(): Promise<boolean> {
    if (!EarbudButtonManager) {
      return Promise.resolve(false);
    }
    return EarbudButtonManager.isSupported?.() ?? Promise.resolve(false);
  },

  addListener(eventName: string, listener: (event: EarbudEvent) => void): void {
    if (!eventEmitter) {
      console.warn('EarbudButtonManager native module not available');
      return;
    }
    // NativeEventEmitter expects (...args: any[]) => void, so we wrap the listener
    const wrappedListener = (event: unknown) => listener(event as EarbudEvent);
    eventEmitter.addListener(eventName, wrappedListener);
    const forEvent = addedListeners.get(eventName) ?? [];
    forEvent.push(wrappedListener);
    addedListeners.set(eventName, forEvent);
  },

  removeListeners(count: number): void {
    if (!eventEmitter) return;
    // The count is honoured: this many listeners are removed, the newest
    // first, and each one by the name it was added under - never another
    // subscriber's (BUG-082).
    let left = Math.max(0, Math.floor(count));
    for (const [eventName, forEvent] of [...addedListeners.entries()]) {
      while (left > 0 && forEvent.length > 0) {
        const wrapped = forEvent.pop();
        if (wrapped) eventEmitter.removeListener(eventName, wrapped);
        left -= 1;
      }
      if (forEvent.length === 0) addedListeners.delete(eventName);
      if (left === 0) break;
    }
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