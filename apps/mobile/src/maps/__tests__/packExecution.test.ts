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
  // planetiler's own ceiling, measured on 2026-11-11 (`Max zoom must be <= 16,
  // was 17` from planetiler 0.10.2): the script refuses anything above it
  // before the tool runs, so the plan this fixture carries is a legal one.
  maxZoom: 16,
};

type Commands = {
  planetiler: string[];
  pmtiles: string[];
  cluster: string[];
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
      // The OpenMapTiles profile's own base data (natural earth, water
      // polygons, lake centerlines): planetiler refuses to start without it
      // and says so itself - "data/sources/lake_centerline.shp.zip does not
      // exist. Run with --download to fetch it" (2026-11-11, planetiler
      // 0.10.2, this machine). The bare boolean is the documented form; the
      // invented one was `--download=<a local file>`, which downloads rather
      // than reading a file.
      '--download',
      // The pack's own zooms, in the argument names the tool publishes
      // (`planetiler --help` prints `minzoom`/`maxzoom`): without them the
      // tileset is built at the tool's own defaults, measured on 2026-11-11 at
      // minzoom 0 / maxzoom 14, while the extract step and the manifest ask
      // for the pack's range.
      `--minzoom=${PLAN.minZoom}`,
      `--maxzoom=${PLAN.maxZoom}`,
    ]);
  });

  it('never uses the invented flags', () => {
    // The three defects that made this item necessary: Geofabrik publishes
    // `new-zealand`, not Christchurch; `--download` with a VALUE downloads
    // rather than reading a file; and planetiler has no `--overlay` and no
    // `--profile`. The bare `--download` BOOLEAN the profile needs is a
    // different thing, and it is asserted above: the invented form is the one
    // that carries a value.
    const joined = printed.planetiler.join(' ');
    expect(joined).not.toContain('--area=');
    expect(joined).not.toContain('--download=');
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
    // what CANTERBURY_BOUNDS' west,south,east,north produces. The max zoom is
    // planetiler's own ceiling (16), measured on 2026-11-11: a pack cannot
    // carry a zoom the tool that builds it refuses.
    expect(printed.pmtiles).toContain('--bbox=170.5,-44.5,173.5,-42.8');
    expect(printed.pmtiles).toContain('--maxzoom=16');
    expect(printed.pmtiles).toContain('--minzoom=6');
  });

  it('clusters the tileset before it extracts from it', () => {
    // The extract step's own error, measured on 2026-11-12 against pmtiles
    // 1.31.2: "source archive must be clustered for extracts". planetiler
    // writes its archive in its own order, so the pack build has to run the
    // CLI's `cluster` step between the two - it is a documented command
    // ("Cluster an unclustered local archive, optimizing the size and layout").
    expect(printed.cluster).toEqual(['cluster', PLAN.tileset]);
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

/**
 * The zoom ceiling the tool itself enforces.
 *
 * The script's `--max-zoom 17` default could never have produced a pack: run
 * on 2026-11-11 against planetiler 0.10.2, `--maxzoom=17` is refused with
 * `java.lang.IllegalArgumentException: Max zoom must be <= 16, was 17`, and
 * without any zoom flag at all the tileset is built at the tool's own defaults
 * (measured: minzoom 0 / maxzoom 14) while the manifest recorded 17. A manifest
 * whose job is "to be the evidence of what shipped" must not promise a zoom the
 * archive cannot carry, so the script now refuses above the ceiling itself,
 * naming the tool's own bound.
 */
/** What a run of the build script as a program answers with. */
interface ScriptResult {
  code: number;
  out: string;
  err: string;
}

describe('the zoom the pack can actually carry', () => {
  /** The script run as a program, the way packBuilder.test.ts runs it. */
  function runScript(args: string[]): ScriptResult {
    try {
      const out = execFileSync('node', [SCRIPT, ...args], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      return { code: 0, out, err: '' };
    } catch (error) {
      const failure = error as { status?: number; stdout?: string; stderr?: string };
      return {
        code: failure.status ?? 1,
        out: failure.stdout ?? '',
        err: failure.stderr ?? '',
      };
    }
  }

  it('refuses a max zoom planetiler refuses, before any tool runs', () => {
    const result = runScript([
      '--source',
      'geofabrik-nz',
      '--max-zoom',
      '17',
      '--input',
      '/data/maps/newzealand-latest.osm.pbf',
    ]);

    expect(result.code).not.toBe(0);
    // The refusal names the tool's own bound, so the operator is not left
    // guessing which side is wrong.
    const text = `${result.out}${result.err}`;
    expect(text).toContain('Max zoom must be <= 16');
    expect(text).toContain('17');
  });

  it('plans the legal ceiling without complaining', () => {
    const result = runScript([
      '--source',
      'geofabrik-nz',
      '--max-zoom',
      '16',
      '--input',
      '/data/maps/newzealand-latest.osm.pbf',
    ]);

    expect(result.code).toBe(0);
    expect(result.out).toContain('zooms            6 to 16');
  });

  it('defaults to the highest zoom whose pack fits the ceiling it enforces', () => {
    // The measured ladder, extracted with the pinned CLI from the same tileset
    // over the same envelope (2026-11-12): z16 = 153,540,100 bytes (146 MiB),
    // z15 = 86,843,698 (82 MiB), z14 = 46,009,919 (43 MiB), z13 = 18,729,750
    // (17 MiB). The envelope at the tool's own ceiling is 2.9x over the 50 MB
    // ceiling, so the default is the highest zoom that fits - and the ceiling
    // itself is NOT weakened: a pack over it is still refused.
    const plan = runScript([
      '--source',
      'geofabrik-nz',
      '--input',
      '/data/maps/newzealand-latest.osm.pbf',
    ]);

    expect(plan.code).toBe(0);
    expect(plan.out).toContain('zooms            6 to 14');
    // The CLI's own ceiling is still the bound: 17 is refused, 16 is planned.
    const legal = runScript([
      '--source',
      'geofabrik-nz',
      '--max-zoom',
      '16',
      '--input',
      '/data/maps/newzealand-latest.osm.pbf',
    ]);
    expect(legal.code).toBe(0);
  });
});
