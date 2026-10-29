// BUG-066: the app opts OUT of GWP-ASan, and the reason is measured, not guessed.
//
// What the api-34 legs showed (2026-10-26/27): the app died 1-2 s into a cold
// start with SIGSEGV (SEGV_ACCERR) in `gwp_asan::GuardedPoolAllocator::deallocate`
// over `AllocationMetadata::CallSiteInfo::RecordBacktrace` over
// `android_unsafe_frame_pointer_chase`, the caller libhermesvm.so - i.e. the
// fault is INSIDE GWP-ASan's own deallocation-backtrace recorder, while it is
// unwinding the frames of the code that called free() (runs 40274121944,
// 40334465490, 40384380620, 40411581041, 40415183126; all five share the same
// tail frames).
//
// The measurements that name it (B2 leg excluded - it was this crash riding on
// another branch):
// - with android:gwpAsanMode="always": the FIRST cold start after install died,
//   2 of 2 branch runs (exp/bug-066-gwpasan run 40384380620; the patched build
//   40411581041 - the crash survived the nitro patch, so the Nitro hypothesis
//   is dead);
// - with android:gwpAsanMode="never": 0 of 30 cold starts on BOTH legs
//   (exp/bug-066-malloc-debug run 40498792925, the flows green on both legs);
// - bionic's malloc_debug - a detector that unwinds with _Unwind_Backtrace, a
//   real unwinder immune to a corrupted frame-pointer chain - was armed for
//   that same 0-of-30 run and reported NOTHING: no double free, no UAF, no
//   overflow in this process.
//
// So the freed memory is fine; the recorder is what dies. GWP-ASan records its
// allocation and deallocation traces by walking the frame-pointer chain, and
// the NDK's own GWP-ASan guide (developer.android.com/ndk/guides/gwp-asan,
// checked 2026-10-27) requires a 64-bit app to be built WITHOUT
// -fomit-frame-pointer for it to work. Every native library in this APK is
// NDK-built with frame pointers off (the control scan: libappmodules.so,
// compiled by this app's own build, has 1 frame prologue in 1.9 MB), so the
// moment GWP-ASan intercepts a deallocation, its walk starts and dies. Under
// Android 14+ the per-app default is Recoverable GWP-ASan on ~1% of launches
// (the NDK guide) - which is exactly the "red on some runs, green on others"
// the register recorded - so this is not an emulator-only artifact: a real
// device can hit it, and the ~1-3% red rate we measured matches.
//
// The fix is the documented per-app opt-out: android:gwpAsanMode="never". It
// keeps GWP-ASan from ever intercepting this process's allocations; the app's
// allocations go to the normal allocator (where malloc_debug found no defect).
// We cannot keep GWP-ASan's protection: the trace recording is the crash, and
// the libraries are third-party prebuilts (libhermesvm.so, librnskia.so,
// libmaplibre.so, libonnxruntime.so ...) whose frame-pointer flags we do not
// control. The decision and its measurements are DECISIONS.md D50.
//
// The hunt stays possible: GWP_ASAN=1 in the build environment re-arms
// "always" for an experiment branch, and nothing else. The shipped default is
// "never", unconditionally, for release, dev and CI alike.
const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withGwpAsanMode(config) {
  // The experiment escape hatch only: the shipped value is "never".
  const gwpAsanMode = process.env.GWP_ASAN === '1' ? 'always' : 'never';
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (!application) {
      return config;
    }
    application.$ = application.$ || {};
    application.$['android:gwpAsanMode'] = gwpAsanMode;
    return config;
  });
};
