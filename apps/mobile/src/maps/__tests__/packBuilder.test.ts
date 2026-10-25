/**
 * Tests for the Canterbury pack build script (the D26 pipeline).
 *
 * The script is the licence gate and the build recipe, so both are tested: a
 * source whose terms forbid our offline use is refused, an unknown source is
 * refused, the plan prints the **documented** planetiler/pmtiles steps (the
 * invocations were verified against the official README and CLI reference on
 * 2026-10-25), and the tools are named rather than assumed.
 *
 * The real build needs a JVM, a 400 MB extract and a work directory per the
 * tools' own requirements - none of that in a unit test. What is tested is
 * every decision the script makes before the tools run: the gates, the flags
 * and the plan. The build itself is the map-pack workflow, and the evidence
 * lives in `docs/evidence/maps/pack/`.
 */
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../../../../..');
const SCRIPT = join(REPO_ROOT, 'scripts', 'data', 'build-pmtiles.mjs');
const BUILDINGS_SCRIPT = join(REPO_ROOT, 'scripts', 'data', 'build-3d-buildings.mjs');

interface ScriptResult {
  code: number;
  out: string;
  err: string;
}

function runScript(script: string, args: string[]): ScriptResult {
  try {
    const out = execFileSync('node', [script, ...args], {
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

function text(result: ScriptResult): string {
  return `${result.out}${result.err}`;
}

describe('the licence gate of the pack build', () => {
  it('refuses a source whose terms forbid the offline use', () => {
    const result = runScript(SCRIPT, ['--source', 'osm-foundation-tiles']);

    expect(result.code).not.toBe(0);
    expect(text(result)).toContain('forbid the offline use');
    // The refusal names the alternative, so the operator is not stranded.
    expect(text(result)).toContain('build from an extract instead');
  });

  it('refuses the hosted API our licence does not cover', () => {
    const result = runScript(SCRIPT, ['--source', 'protomaps-hosted-api']);

    expect(result.code).not.toBe(0);
    expect(text(result)).toContain('commercial product');
  });

  it('refuses a source it does not know, whatever the operator asks for', () => {
    const result = runScript(SCRIPT, ['--source', 'some-other-tile-shop']);

    expect(result.code).not.toBe(0);
    expect(text(result)).toContain('not registered');
  });

  it('takes a supplied source only with its terms and the founder confirmation', () => {
    const withoutTerms = runScript(SCRIPT, ['--source', 'local']);
    expect(withoutTerms.code).not.toBe(0);
    expect(text(withoutTerms)).toContain('needs its terms');

    const confirmed = runScript(SCRIPT, [
      '--source',
      'local',
      '--source-title',
      'The founder extract',
      '--source-licence',
      'ODbL',
      '--source-licence-url',
      'https://example.invalid/licence',
      '--source-attribution',
      'The founder',
      '--confirm-offline-use',
    ]);
    expect(confirmed.code).toBe(0);
    expect(confirmed.out).toContain('The founder extract');
  });
});

describe('the plan the script prints', () => {
  const plan = runScript(SCRIPT, ['--source', 'geofabrik-nz']);

  it('prints the build steps that actually run', () => {
    // planetiler's documented flags: the disk input is `--osm-path`, and
    // `--force` keeps a previous build from stopping this one.
    expect(plan.out).toContain('planetiler --osm-path=<extract>');
    expect(plan.out).toContain('--output=<tileset> --force');
    // the pmtiles extract step, in the CLI's own bbox order.
    expect(plan.out).toContain('pmtiles extract <tiles> <pack> --bbox=170.5,-44.5,173.5,-42.8');
    expect(plan.out).toContain('pmtiles verify <pack>');
    expect(plan.out).toContain('pmtiles show --header-json <pack>');
  });

  it('does not print the invented steps it used to', () => {
    // The build script used to print and run `--area=christchurch`,
    // `--download=<a local file>` and a `versatiles reduce` step that never
    // existed. Geofabrik publishes `new-zealand`, not Christchurch.
    expect(plan.out).not.toContain('--area=christchurch');
    expect(plan.out).not.toContain('--download=');
    expect(plan.out).not.toContain('versatiles');
  });

  it('names the heap and the tools it records', () => {
    expect(plan.out).toContain('JAVA_TOOL_OPTIONS=-Xmx4g');
    expect(plan.out).toContain('map-pack.yml');
  });

  it('writes the pack where the app reads it', () => {
    // The repo root was one level short until the pipeline landed, which put
    // the pack inside scripts/: this is the pin.
    expect(plan.out).toMatch(/apps[\\/]mobile[\\/]assets[\\/]maps[\\/]canterbury\.pmtiles/);
    expect(plan.out).not.toMatch(/scripts[\\/]apps[\\/]/);
  });
});

describe('the 3D buildings script', () => {
  it('keeps its licence gate on every input', () => {
    const result = runScript(BUILDINGS_SCRIPT, ['--source', 'google-photorealistic-3d-tiles']);

    expect(result.code).not.toBe(0);
    expect(text(result)).toContain('licence');
  });

  it('refuses to bake without the overlay profile, and says what it needs', () => {
    const result = runScript(BUILDINGS_SCRIPT, [
      '--source',
      'linz-nz-building-outlines',
      '--execute',
      '--outlines',
      'a.geojson',
      '--extract',
      'b.osm.pbf',
    ]);

    expect(result.code).not.toBe(0);
    // planetiler has no `--overlay` and no `--profile=courier`: a second data
    // source rides a profile, and the script refuses to pretend a flag exists.
    expect(text(result)).toContain('the bake needs the overlay profile');
    expect(text(result)).toContain('render_height');
  });

  it('still prints the plan and writes the manifest, because those are real', () => {
    const result = runScript(BUILDINGS_SCRIPT, [
      '--source',
      'linz-nz-building-outlines',
      '--write-manifest',
      'docs/evidence/maps/buildings.manifest.json',
    ]);

    expect(result.code).toBe(0);
    expect(result.out).toContain('wrote');
    expect(result.out).toContain('Creative Commons');
    expect(result.out).toContain('linz-nz-building-outlines');
  });
});
