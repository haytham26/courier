/**
 * The legal text the app shows.
 *
 * Google Play asks for two things before it reviews an app that asks for the
 * background location: a prominent in-app disclosure (shown before the
 * permission request) and a privacy policy the app links to. The wording lives
 * here so the app, the store listing and the privacy policy say the same
 * thing, and the release check can prove the text is there.
 *
 * The privacy policy is a draft (`docs/operations/PRIVACY-POLICY.md`): the
 * founder and the lawyer have to review it before the app goes live.
 */

/**
 * The disclosure for the background location.
 *
 * It has to say what the app does with the location, why the driver needs it
 * and that it stops when the run ends.
 */
export const BACKGROUND_LOCATION_DISCLOSURE =
  'Courier Copilot follows your route while you drive, including with the screen off, ' +
  'so the map, the stop list and the arrival times stay right. The location stays on ' +
  'your phone, it is never sold and it stops when you end the run.';

/** The voice disclosure, for the microphone permission. */
export const MICROPHONE_DISCLOSURE =
  'Courier Copilot listens when you use a voice command or the voice assistant, and ' +
  'when the app is on the lock screen while you drive. The audio is processed on the ' +
  'phone and is never recorded unless you ask for it.';

/** The privacy policy, linked from the settings and shown in the Play listing. */
export const PRIVACY_POLICY_URL = 'https://courier.copilot.nz/privacy';

/** The terms of use, linked from the settings. */
export const TERMS_OF_USE_URL = 'https://courier.copilot.nz/terms';

/** The address of the team, for the privacy questions. */
export const PRIVACY_CONTACT_EMAIL = 'privacy@courier.copilot.nz';
