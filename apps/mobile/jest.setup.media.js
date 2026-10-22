/**
 * The media query list, before anything else is loaded.
 *
 * The react-native-web style helpers ask the media query list while they are
 * built, and the jest environment has none: without this the component tree
 * cannot be built and every test that renders a screen fails with
 * "window.matchMedia is not a function".
 *
 * It is a `setupFiles` entry (not `setupFilesAfterEnv`) because the import
 * that needs it happens while the test file is loaded.
 */
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
