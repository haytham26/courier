// Two Android fixes the app needs, both about SQLite.
//
// 1. The framework SQLite. WorkManager, which AndroidX pulls into every app
//    through the startup provider, opens its own database through
//    `androidx.sqlite`. The app stores its data in op-sqlite, which is a JSI
//    module with its own SQLite build, and the framework implementation was
//    missing: the WorkDatabase could not be created and the app died on the
//    first launch with "Failed to create an instance of class
//    androidx.work.impl.WorkDatabase".
//
// 2. The WorkManager initializer. The app uses no background work at all, so
//    WorkManager must not open a database: op-sqlite ships its own SQLite in
//    a shared library, which takes the `sqlite3_*` symbols of the process
//    before the platform library does, and the framework SQLite that
//    WorkManager uses then fails. The initializer is removed (the documented
//    AndroidX recipe) instead of leaving a crash on every launch.
//
// The framework SQLite uses the platform library, so it lives beside the
// op-sqlite build without a conflict.
const { withAndroidManifest, withAppBuildGradle } = require('expo/config-plugins');

const SQLITE_FRAMEWORK = 'androidx.sqlite:sqlite-framework:2.7.1';

function withSqliteFramework(config) {
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
}

function withoutWorkManagerInitializer(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (!application) {
      return config;
    }
    const providers = application.provider ?? [];
    const existing = providers.find(
      (provider) => provider.$?.['android:name'] === 'androidx.startup.InitializationProvider',
    );
    const provider = existing ?? {
      $: {
        'android:name': 'androidx.startup.InitializationProvider',
        'android:authorities': '${applicationId}.androidx-startup',
        'android:exported': 'false',
        'tools:node': 'merge',
      },
      'meta-data': [],
    };
    const metaData = provider['meta-data'] ?? [];
    const alreadyRemoved = metaData.some(
      (entry) => entry.$?.['android:name'] === 'androidx.work.WorkManagerInitializer',
    );
    if (!alreadyRemoved) {
      metaData.push({
        $: {
          'android:name': 'androidx.work.WorkManagerInitializer',
          'android:value': 'androidx.startup',
          'tools:node': 'remove',
        },
      });
    }
    provider['meta-data'] = metaData;
    if (!existing) {
      providers.push(provider);
    }
    application.provider = providers;
    return config;
  });
}

module.exports = function withAndroidSqlite(config) {
  return withoutWorkManagerInitializer(withSqliteFramework(config));
};
