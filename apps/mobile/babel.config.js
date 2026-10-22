/**
 * Babel configuration for the Courier Copilot mobile app.
 *
 * The Unistyles 3 plugin injects the style metadata that the native side
 * needs, so it has to run on every file under `src`.
 */
module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: [['react-native-unistyles/plugin', { root: 'src' }]],
  };
};
