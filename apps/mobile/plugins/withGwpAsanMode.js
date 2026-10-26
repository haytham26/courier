// BUG-066: GWP-ASan for the cold-start crash hunt (exp branch only).
//
// The api-34 E2E legs die 1 to 2 seconds into a cold start with a native
// memory error: SIGSEGV, gwp_asan::GuardedPoolAllocator::deallocate, the
// caller libhermesvm.so (run 40274121944 and run 40334465490). Same binary
// (libhermesvm BuildId 693b3d3679eb945fc61d133ed4f9d498bdc58ef4), same tail
// frames, but the GWP-ASan report itself - the error type and the allocation
// and deallocation backtraces - is missing from both tombstones, because
// Android 14's Recoverable GWP-ASan is only enabled on about 1% of launches
// and the crash struck inside gwp-asan's own report machinery.
//
// The fix for the hunt, per the NDK's GWP-ASan guide (developer.android.com/
// ndk/guides/gwp-asan, checked 2026-10-27): `android:gwpAsanMode="always"` on
// <application> is the documented per-app opt-in. It is per-app (no system
// property, no setprop), works on a release build, and enables GWP-ASan on
// EVERY launch instead of the ~1% of Recoverable mode, so a single E2E run
// produces the crash report with the Cause line and both traces instead of
// waiting for the sampling lottery.
//
// It is env-gated (GWP_ASAN=1 in the build job): nothing about the flag can
// reach a release build by accident, and a mistaken merge of this branch is
// inert without the variable.
const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withGwpAsanMode(config) {
  if (process.env.GWP_ASAN !== '1') {
    return config;
  }
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (!application) {
      return config;
    }
    application.$ = application.$ || {};
    application.$['android:gwpAsanMode'] = 'always';
    return config;
  });
};
