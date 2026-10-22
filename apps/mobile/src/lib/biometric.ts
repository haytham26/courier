/**
 * The biometric unlock.
 *
 * The app opens with a fingerprint or a face instead of a password. It is a
 * convenience: a courier whose phone has no scanner, or who has not enrolled
 * a fingerprint, still gets into the app - the app never asks for the
 * biometric and then refuses to open.
 *
 * The module is the only place that talks to `expo-local-authentication`, so
 * the tests can mock one module.
 */
import * as LocalAuthentication from 'expo-local-authentication';

export interface BiometricSupport {
  /** Whether the phone has a scanner at all. */
  hardware: boolean;
  /** Whether the courier has a fingerprint or a face enrolled. */
  enrolled: boolean;
  /**
   * Why the unlock is not offered, in plain words. Empty when it is offered.
   */
  reason: string;
}

/**
 * What the phone can do.
 *
 * A failure here is never fatal: the app opens without the unlock.
 */
export async function biometricSupport(): Promise<BiometricSupport> {
  try {
    const hardware = await LocalAuthentication.hasHardwareAsync();
    if (!hardware) {
      return { hardware: false, enrolled: false, reason: 'This phone has no fingerprint reader.' };
    }
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) {
      return {
        hardware: true,
        enrolled: false,
        reason: 'Set up a fingerprint or a face on this phone to unlock it.',
      };
    }
    return { hardware: true, enrolled: true, reason: '' };
  } catch {
    return {
      hardware: false,
      enrolled: false,
      reason: 'The fingerprint reader is not available right now.',
    };
  }
}

/**
 * Asks the phone who the courier is.
 *
 * Returns true when the courier was recognised. A cancel is not an error:
 * the caller simply opens the app without the unlock.
 */
export async function unlockWithBiometrics(promptMessage = 'Unlock Courier Copilot'): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Not now',
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}
