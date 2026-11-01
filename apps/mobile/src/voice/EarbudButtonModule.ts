/**
 * Earbud Button Native Module Interface
 * This defines the TypeScript interface for the native module
 * that handles earbud button events (Android/iOS)
 */

import { NativeModules, Platform, NativeEventEmitter, type EventSubscription } from 'react-native';

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
 * The subscriptions this wrapper holds, newest last.
 *
 * BUG-082: `removeListeners(count)` used to call `removeAllListeners()`, so one
 * unmounting subscriber detached EVERY earbud listener on the emitter - with
 * one subscriber the effect is invisible, with two a screen closing silences
 * the other. The subscriptions the emitter hands back are kept here, and
 * `removeListeners(count)` removes exactly that many of them, newest first.
 */
const subscriptions: EventSubscription[] = [];

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
    subscriptions.push(eventEmitter.addListener(eventName, wrappedListener));
  },

  removeListeners(count: number): void {
    // The count is honoured: this many subscriptions are removed, the newest
    // first, and each one only detaches the listener it was created for -
    // never another subscriber's (BUG-082).
    let left = Math.max(0, Math.floor(count));
    while (left > 0 && subscriptions.length > 0) {
      subscriptions.pop()?.remove();
      left -= 1;
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