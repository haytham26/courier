/**
 * The haptics of the app.
 *
 * `docs/design/SYSTEM.md` §5: **haptics on confirm, deliver and error -
 * never on scroll.** A courier drives with gloves on, so the confirmation of
 * a delivery has to be felt as well as seen.
 *
 * The wrapper is deliberately thin: it maps an event to the pattern of
 * `expo-haptics`, it never fires on a scroll, and it stays quiet when the
 * courier has turned the haptics off in the settings. A device without a
 * vibrator must never break a delivery, so a failure is logged and dropped.
 */
import * as Haptics from 'expo-haptics';

/** The moments that are worth a vibration. */
export type HapticEvent = 'confirm' | 'deliver' | 'error' | 'voice';

/** What a vibration is: a notification, or an impact. */
export type HapticPattern =
  | { kind: 'notification'; type: Haptics.NotificationFeedbackType }
  | { kind: 'impact'; type: Haptics.ImpactFeedbackStyle };

let hapticsEnabled = true;

/** Turns the haptics on or off; the settings screen calls this. */
export function setHapticsEnabled(enabled: boolean): void {
  hapticsEnabled = enabled;
}

/** Whether the haptics are on. */
export function areHapticsEnabled(): boolean {
  return hapticsEnabled;
}

/**
 * The pattern of an event.
 *
 * The mapping is a pure function so the rule can be tested without a device:
 * a delivery is a success notification, an error is an error notification, a
 * confirmation and the voice button are impacts.
 */
export function patternFor(event: HapticEvent): HapticPattern {
  switch (event) {
    case 'deliver':
      return {
        kind: 'notification',
        type: Haptics.NotificationFeedbackType.Success,
      };
    case 'error':
      return {
        kind: 'notification',
        type: Haptics.NotificationFeedbackType.Error,
      };
    case 'voice':
      return { kind: 'impact', type: Haptics.ImpactFeedbackStyle.Light };
    case 'confirm':
    default:
      return { kind: 'impact', type: Haptics.ImpactFeedbackStyle.Medium };
  }
}

/**
 * Fires the haptic of an event.
 *
 * Nothing happens when the courier turned the haptics off.
 */
export function hapticFor(event: HapticEvent): void {
  if (!hapticsEnabled) {
    return;
  }

  const pattern = patternFor(event);

  try {
    const fired =
      pattern.kind === 'notification'
        ? Haptics.notificationAsync(pattern.type)
        : Haptics.impactAsync(pattern.type);

    void fired.catch((error: unknown) => {
      // A device without a vibrator must not break the delivery.
      console.warn(`haptics: ${(error as Error).message}`);
    });
  } catch (error) {
    // A device without a vibrator must not break the delivery.
    console.warn(`haptics: ${(error as Error).message}`);
  }
}
