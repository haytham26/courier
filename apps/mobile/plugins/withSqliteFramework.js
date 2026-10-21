// Adds the AndroidX framework SQLite to the Android build.
//
// The app stores its data in op-sqlite (SQLCipher + FTS5), which is a JSI
// module with its own SQLite build. WorkManager, which AndroidX pulls into
// every app through the startup provider, opens its own database through
// `androidx.sqlite`: without the framework implementation the WorkDatabase
// cannot be created and the app dies on the first launch with
// "Failed to create an instance of class androidx.work.impl.WorkDatabase".
//
// The framework SQLite uses the platform library, so it lives beside the
// op-sqlite build without a conflict.
const { withAppBuildGradle } = require('expo/config-plugins');

const SQLITE_FRAMEWORK = "androidx.sqlite:sqlite-framework:2.7.1";

module.exports = function withSqliteFramework(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      return config;
    }
    if (config.modResults.contents.includes(SQLITE_FRAMEWORK)) {
      return config;
    }
    const dependency = `    implementation '${SQLITE_FRAMEWORK}'`;
    config.modResults.contents = config.modResults.contents.replace(
      /dependencies \{/,
      (match) => `${match}\n${dependency}`,
    );
    return config;
  });
};
