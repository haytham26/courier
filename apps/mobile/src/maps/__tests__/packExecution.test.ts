/**
 * Tests for the pack build's execute path: the argv it hands the tools.
 *
 * The review's point was that the earlier tests pinned the plan's printed prose,
 * so the execute step could have run the invented flags again with every test
 * still green. The argv is now built by an exported pure function
 * (`buildCommands`), so it is a decision the tests can hold - on Windows too,
 * where a stub executable cannot run without a shell.
 */
import { buildCommands, VERSION_ARGS } from '../../../../../../scripts/data/build-pmtiles.mjs';

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

describe('the planetiler invocation', () => {
  const commands = buildCommands(PLAN);

  it('hands planetiler the extract on disk, the output and the overwrite flag', () => {
    expect(commands.planetiler).toEqual([
      `--osm-path=${PLAN.input}`,
      `--output=${PLAN.tileset}`,
      '--force',
    ]);
  });

  it('never uses the invented flags', () => {
    // The three defects that made this item necessary: Geofabrik publishes
    // `new-zealand`, not Christchurch; `--download` downloads rather than
    // reading a file; and planetiler has no `--overlay` and no `--profile`.
    const joined = commands.planetiler.join(' ');
    expect(joined).not.toContain('--area=');
    expect(joined).not.toContain('--download');
    expect(joined).not.toContain('--overlay');
    expect(joined).not.toContain('--profile=');
  });
});

describe('the pmtiles invocations', () => {
  const commands = buildCommands(PLAN);

  it("extracts to the envelope in the CLI's own bbox order", () => {
    expect(commands.pmtiles[0]).toBe('extract');
    expect(commands.pmtiles[1]).toBe(PLAN.tileset);
    expect(commands.pmtiles[2]).toBe(PLAN.output);
    // The CLI's documented order is MIN_LON,MIN_LAT,MAX_LON,MAX_LAT, which is
    // what CANTERBURY_BOUNDS' west,south,east,north produces.
    expect(commands.pmtiles).toContain('--bbox=170.5,-44.5,173.5,-42.8');
    expect(commands.pmtiles).toContain('--maxzoom=17');
    expect(commands.pmtiles).toContain('--minzoom=6');
  });

  it('verifies the archive and reads the header with the flag the CLI documents', () => {
    expect(commands.verify).toEqual(['verify', PLAN.output]);
    expect(commands.headerJson).toEqual(['show', PLAN.output, '--header-json']);
  });
});

describe('asking each tool for its version', () => {
  it('asks planetiler with --version', () => {
    expect(VERSION_ARGS.planetiler).toEqual(['--version']);
  });

  it('asks pmtiles with the version subcommand, never --version', () => {
    // The pmtiles CLI is subcommand-based: `pmtiles --version` is an unknown
    // flag, so the old single form failed on a machine that HAD the tool.
    expect(VERSION_ARGS.pmtiles).toEqual(['version']);
    expect(VERSION_ARGS.pmtiles).not.toContain('--version');
  });
});
