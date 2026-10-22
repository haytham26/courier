/**
 * The channel the voice commands travel on.
 *
 * The voice engine lives in `VoiceService.ts` and needs the sherpa-onnx
 * native module, so a screen that only wants to hear a command does not
 * import it: it subscribes here instead. The module has no native import of
 * its own, so it can be used from anywhere - and tested without a device.
 */

import { errorMessage } from '@/lib/errors';

import type { VoiceCommand } from './VoiceService';

/** What a subscriber gets when a command is spoken. */
export type VoiceCommandListener = (command: VoiceCommand) => void;

const listeners = new Set<VoiceCommandListener>();

/**
 * Publishes a command to whoever is listening.
 *
 * A listener that throws does not stop the others: one broken screen must
 * not take the voice down.
 */
export function publishVoiceCommand(command: VoiceCommand): void {
  for (const listener of listeners) {
    try {
      listener(command);
    } catch (error) {
      console.warn(`voice: a listener of the voice commands failed: ${errorMessage(error)}`);
    }
  }
}

/**
 * Listens to the voice commands.
 *
 * The function it returns takes the listener off again, so a screen that
 * closes stops hearing the voice.
 */
export function subscribeToVoiceCommands(listener: VoiceCommandListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
