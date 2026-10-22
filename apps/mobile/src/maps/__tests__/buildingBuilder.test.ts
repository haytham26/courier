/**
 * Tests for the 3D buildings build script.
 *
 * The script is the gate on the licence of the data that goes into the pack,
 * so the gate is tested: a source whose terms forbid our use is refused, an
 * unknown source is refused, and the licence of **every** input is written
 * into the manifest.
 *
 * The script is run as a program, so the test is the real one: no device, no
 * network and no map server.
 */
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../../../../..');
const SCRIPT = join(REPO_ROOT, 'scripts', 'data', 'build-3d-buildings.mjs');

interface ScriptResult {
  code: number;
  out: string;
  err: string;
}

function runScript(args: string[]): ScriptResult {
  try {
    const out = execFileSync(process.execPath, [SCRIPT, ...args], {
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

describe('the 3D buildings build script', () => {
  it('prints the plan with the licence of every input', () => {
    const result = runScript(['--source', 'linz-nz-building-outlines']);

    expect(result.code).toBe(0);
    expect(result.out).toContain('CC BY 4.0');
    expect(result.out).toContain('Open Database License (ODbL)');
    expect(result.out).toContain('Sourced from the LINZ Data Service');
    expect(result.out).toContain('this is the plan');
  });

  it('refuses the Google photorealistic 3D tiles', () => {
    const result = runScript(['--source', 'google-photorealistic-3d-tiles']);

    expect(result.code).not.toBe(0);
    expect(result.err).toContain('refused');
    expect(result.err).toContain('commercial licence');
  });

  it('refuses the Cesium ion imagery', () => {
    const result = runScript(['--source', 'cesium-ion']);

    expect(result.code).not.toBe(0);
    expect(result.err).toContain('refused');
  });

  it('refuses a source whose terms are unknown', () => {
    const result = runScript(['--source', 'somewhere-else']);

    expect(result.code).not.toBe(0);
    expect(result.err).toContain('not registered');
  });

  it('records the licence of every input in the manifest', () => {
    const result = runScript([
      '--source',
      'linz-nz-building-outlines',
      '--print-manifest',
      '--count',
      '1234',
    ]);

    expect(result.code).toBe(0);

    const manifest = JSON.parse(result.out) as {
      present: boolean;
      count: number;
      attribution: string;
      inputs: { id: string; licence: string; attribution: string }[];
    };

    expect(manifest.present).toBe(true);
    expect(manifest.count).toBe(1234);
    expect(manifest.inputs).toHaveLength(2);
    expect(manifest.inputs.map((input) => input.id)).toEqual([
      'linz-nz-building-outlines',
      'osm-building-heights',
    ]);
    expect(manifest.inputs[0]?.licence).toContain('CC BY 4.0');
    expect(manifest.inputs[1]?.licence).toContain('ODbL');
    expect(manifest.attribution).toContain('LINZ Data Service');
    expect(manifest.attribution).toContain('OpenStreetMap contributors');
  });
});
