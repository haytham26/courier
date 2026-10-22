/**
 * The content of the run the three directions show.
 *
 * It is the content of `src/design/runContent.ts` - the same run, the same
 * next stop, the same ETA - so the four screens of a direction agree with
 * each other and with the first round of the lab (SPEC-3: the next stop on
 * Today is the next stop on Driving, with the same number, the same ETA and
 * the same note).
 *
 * The addresses, suburbs and times are real Christchurch content. The name of
 * the run is the name on the manifest.
 */
import { run, statusLabels, type RunStop } from '@/design/runContent';

export { run, statusLabels };
export type { RunStop };

/** The state of the assistant, in the words the screen shows. */
export type VoiceCondition = 'idle' | 'listening' | 'thinking' | 'speaking' | 'offline' | 'muted' | 'error';

/** The words of each state of the assistant. */
export const voiceConditionWords: Record<VoiceCondition, string> = {
  idle: 'Ready',
  listening: 'Listening',
  thinking: 'Thinking',
  speaking: 'Speaking',
  offline: 'Offline',
  muted: 'Muted',
  error: 'Voice unavailable',
};

/** The line the assistant said last, in full. */
export const lastThingSaid = 'Delivered to the side gate at 14 Harewood Road.';

/** What the app understood when the driver spoke an action. */
export const understoodIntent = 'Understood: delivered';

/** The distance to the next stop, in kilometres. */
export const distanceToNextStop = 4.2;

/** Where the parcel for the next stop sits in the van. */
export const parcelInVan = 'Rear rack, left side';

/** The scan the driver did at the door, and what the scanner read. */
export const scanResult = {
  address: '14 Harewood Road',
  suburb: 'Papanui',
  postcode: '8011',
  /** The confidence, in words. Never a bare percentage. */
  confidence: 'Clear read',
  confidenceDetail: 'Every line of the address was found on the label.',
  parcels: 3,
  reference: 'CJ-4471-8820',
};

/** The voice prompt the assistant uses on the driving screen. */
export const drivingPrompt = 'Next stop, four kilometres, Harewood Road';

/** The sentence the assistant says when the driver asks where the door is. */
export const doorAnswer = 'Side gate, the small box is in the rear rack';

/** The offline chip, and what it says. */
export const offlineChip = {
  queued: 4,
  label: 'Offline, 4 actions waiting',
  partialSyncLabel: 'Partial sync, 2 actions waiting',
};

/** The recovery action of the error state. */
export const errorRecovery = 'Try again';

/** What the empty state says when the run has not been downloaded. */
export const emptyMessage = 'No run on this device. Download the run to start the day.';
