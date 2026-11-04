// BUG-079's build check: the E2E flag must be refused in a release build.
//
//   node scripts/ci/check-e2e-flag.mjs --variant release
//
// A release build that inlines `EXPO_PUBLIC_E2E=1` inlines the E2E mocks -
// the mock auth client, the mock day, the mock reader - into the artifact a
// courier's phone runs. The android-e2e workflow once built
// `assembleRelease` with the flag set as a matter of routine, so "release +
// flag" was an artifact nobody had to ask for.
//
// The rule: a RELEASE build (the default, what the ship workflows build) fails
// with the flag set. A build that legitimately carries the mocks is a TEST
// build, and it says so: `--variant e2e` (the emulator legs' release APK - it
// needs the bundle embedded, so it cannot be a debug build, which waits for
// Metro and never boots) or `--variant debug`. The variant comes from the
// caller because the flag is a plain env read and a build that never runs
// gradle has no other way to say what it is building.
import { parseArgs } from 'node:util';

/** The build the ship workflows produce: no mocks, ever. */
const RELEASE = 'release';
/** A release build produced as a TEST artifact (the emulator legs' APK). */
const E2E = 'e2e';
/** A debug build: Metro's own answer, the flag's natural home. */
const DEBUG = 'debug';

function variantFrom(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      variant: { type: 'string', short: 'v' },
    },
    allowNegative: true,
  });
  return values.variant ?? process.env.GRADLE_VARIANT ?? RELEASE;
}

const variant = variantFrom(process.argv.slice(2));
const flag = (process.env.EXPO_PUBLIC_E2E ?? '').trim();

if (variant === RELEASE && flag === '1') {
  console.error(
    'BUG-079: this is a RELEASE build and EXPO_PUBLIC_E2E=1, so the E2E mocks ' +
      'would be inlined into the artifact a courier runs. A test build says it ' +
      'is one: `--variant e2e` for the emulator legs\' release APK, ' +
      '`--variant debug` for a debug build, or drop the flag for the release.',
  );
  process.exit(1);
}
console.log(
  `check-e2e-flag: ${flag === '1' ? 'the E2E flag is set' : 'no E2E flag'} and the build is ${variant}`,
);
