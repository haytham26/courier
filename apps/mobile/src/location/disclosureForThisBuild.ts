/**
 * The E2E seam for the location disclosure (audit B5): the build flag
 * decides, read at CALL time.
 *
 * A drive opened with `?disclose=1` in the E2E build shows the disclosure
 * even when the emulator's `pm grant` has already given the permission, so
 * the Maestro flow can prove the disclosure is on screen BEFORE the request
 * (the request itself is pre-granted, so it answers at once and no system
 * dialog sits on the flow). A release build never forces it: there the
 * disclosure shows exactly when the permission is not granted yet.
 */
export const disclosureForThisBuild = (): boolean =>
  process.env.EXPO_PUBLIC_E2E === '1';
