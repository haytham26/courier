/**
 * Whether this device can do a passkey sign-in.
 *
 * The service side of a passkey is ready (`@better-auth/passkey`), but a
 * phone has no WebAuthn API of its own: the ceremony needs the platform
 * authenticator (Android Credential Manager, iCloud Keychain). Until that
 * native module is in the app, the button is shown with a plain reason
 * rather than a promise the phone cannot keep.
 *
 * On the web the browser has `PublicKeyCredential` and the passkey sign-in
 * works there today.
 */

/** Whether this device can run a passkey ceremony. */
export function passkeySupportedOnDevice(): boolean {
  return typeof globalThis.PublicKeyCredential !== 'undefined';
}

/** The reason the passkey button is off on this device. */
export const PASSKEY_DEVICE_REASON =
  'Passkeys need the fingerprint or face reader of this phone. Use your email for now.';
