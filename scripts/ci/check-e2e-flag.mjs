// BUG-079's build check: the E2E flag must be refused in a release build.
//
//   node scripts/ci/check-e2e-flag.mjs --variant release
//
// A release build that inlines `EXPO_PUBLIC_E2E=1` inlines the E2E mocks -
// the mock auth client, the mock day, the mock reader - into the artifact a
// courier's phone runs. The android-e2e workflow once built
// `assembleRelease` with the flag set as a matter of routine, so "release +
// flag" was an artifact nobody had to ask for. The rule now: the flag is only
// ever legal in a debug or dev build (a test artifact, never a shipped one),
// and the build fails rather than inline the mocks.
//
// The variant comes from the caller (the gradle task this build is about),
// because the flag itself is a plain env read and a build that never runs
// gradle has no other way to say what it is building.
import { parseArgs } from 'node:util';

const RELEASE = 'release';

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
      'would be inlined into the artifact a courier runs. A test build is a ' +
      'debug build: build `assembleDebug` with the flag, or drop the flag for ' +
      'the release.',
  );
  process.exit(1);
}
console.log(
  `check-e2e-flag: ${flag === '1' ? 'the E2E flag is set' : 'no E2E flag'} and the build is ${variant}`,
);
