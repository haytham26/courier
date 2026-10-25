/**
 * Tests for the pack build's execute path: the argv it hands the tools.
 *
 * The review's point was that the earlier tests pinned the plan's printed prose,
 * so the execute step could have run the invented flags again with every test
 * still green. The argv is now built by an exported pure function
 * (`buildCommands`) and these tests run it, so the invocation itself is pinned -
 * on Windows too, where a stub executable cannot run without a shell.
 *
 * The function is reached by spawning node, the way the sibling
 * `packBuilder.test.ts` runs the script as a program: the build script is an
 * ES module the app's jest transform does not load.
 */
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../../../../..');
const SCRIPT = resolve(REPO_ROOT, 'scripts', 'data', 'build-pmtiles.mjs');

/** A plan as the build's own `buildPlan` computes it. */
const PLAN = {
  source: { id: 'geofabrik-nz', title: 'Geofabrik New Zealand extract' },
  input: '/data/maps/newzealand-latest.osm.pbf',
  output: '/repo/apps/mobile/assets/maps/canterbury.pmtiles',
  tileset: '/repo/apps/mobile/assets/maps/canterbury.tileset.pmtiles',
  bbox: '170.5,-44.5,173.5,-42.8',
  minZoom: 6,
  maxZoom: 17,
};

type Commands = {
  planetiler: string[];
  pmtiles: string[];
  verify: string[];
  headerJson: string[];
};

/** How each tool is asked for its version. */
type VersionArgs = Record<string, string[]>;

interface ModuleAnswer {
  commands: Commands;
  versionArgs: VersionArgs;
}

/** The argv the script builds, read from the module itself. */
function commandsFor(plan: unknown): ModuleAnswer {
  const printed = execFileSync(
    'node',
    [
      '--input-type=module',
      '-e',
      // A Windows path is not a URL: the dynamic import wants a file:// URL.
      `const { pathToFileURL } = await import('node:url');
       const m = await import(pathToFileURL(${JSON.stringify(SCRIPT)}).href);
       process.stdout.write(JSON.stringify({ commands: m.buildCommands(${JSON.stringify(plan)}), versionArgs: m.VERSION_ARGS }));`,
    ],
    { encoding: 'utf8' },
  );
  return JSON.parse(printed) as ModuleAnswer;
}

const built = commandsFor(PLAN);
const printed: Commands = built.commands;
const versionArgs: VersionArgs = built.versionArgs;

describe('the planetiler invocation', () => {
  it('hands planetiler the extract on disk, the output and the overwrite flag', () => {
    expect(printed.planetiler).toEqual([
      `--osm-path=${PLAN.input}`,
      `--output=${PLAN.tileset}`,
      '--force',
    ]);
  });

  it('never uses the invented flags', () => {
    // The three defects that made this item necessary: Geofabrik publishes
    // `new-zealand`, not Christchurch; `--download` downloads rather than
    // reading a file; and planetiler has no `--overlay` and no `--profile`.
    const joined = printed.planetiler.join(' ');
    expect(joined).not.toContain('--area=');
    expect(joined).not.toContain('--download');
    expect(joined).not.toContain('--overlay');
    expect(joined).not.toContain('--profile=');
  });
});

describe('the pmtiles invocations', () => {
  it('extracts to the envelope in the CLI\u2019s own bbox order', () => {
    expect(printed.pmtiles[0]).toBe('extract');
    expect(printed.pmtiles[1]).toBe(PLAN.tileset);
    expect(printed.pmtiles[2]).toBe(PLAN.output);
    // The CLI's documented order is MIN_LON,MIN_LAT,MAX_LON,MAX_LAT, which is
    // what CANTERBURY_BOUNDS' west,south,east,north produces.
    expect(printed.pmtiles).toContain('--bbox=170.5,-44.5,173.5,-42.8');
    expect(printed.pmtiles).toContain('--maxzoom=17');
    expect(printed.pmtiles).toContain('--minzoom=6');
  });

  it('verifies the archive and reads the header with the flag the CLI documents', () => {
    expect(printed.verify).toEqual(['verify', PLAN.output]);
    expect(printed.headerJson).toEqual(['show', PLAN.output, '--header-json']);
  });
});

describe('asking each tool for its version', () => {
  it('asks planetiler with --version', () => {
    expect(versionArgs.planetiler).toEqual(['--version']);
  });

  it('asks pmtiles with the version subcommand, never --version', () => {
    // The pmtiles CLI is subcommand-based: `pmtiles --version` is an unknown
    // flag, so the old single form failed on a machine that HAD the tool.
    expect(versionArgs.pmtiles).toEqual(['version']);
    expect(versionArgs.pmtiles).not.toContain('--version');
  });
});
