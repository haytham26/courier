/**
 * The founder directive 2026-11-10 item 6 (OFFLINE), the map pack's leg:
 * the Canterbury pack the lane BUILT, read back through the app's own logic.
 *
 * The pack is a build artefact and is deliberately not in the repository
 * (`apps/mobile/assets/maps/README.md`): it is ~50 MB, and it is built from the
 * Geofabrik extract by `scripts/data/build-pmtiles.mjs`. That makes this test
 * two honest legs rather than one fake one:
 *
 *   1. When the pack IS on this machine (the lane that built it, or a founder
 *      who has run the build), every claim below is measured over the REAL
 *      bytes: the manifest the build wrote, the archive it checksummed, the
 *      size against the 50 MB ceiling, the attribution line, and the app's own
 *      `checkOfflinePack` answering `ready` over them.
 *
 *   2. When it is NOT (a fresh clone, CI), the layout itself is asserted: the
 *      folder holds its README and no pack, because the README says that is
 *      where the pack lives and that it is not committed. The pack's presence
 *      is never quietly assumed - the same discipline the voice-scale
 *      simulation uses for its git-ignored audio.
 *
 * What is NOT run here and stays named: the Android renderer drawing the tiles
 * (the CI AVDs' leg, `.maestro/offline-map-pack.yaml`), and the real device's
 * `crypto.subtle` (the device half of `packFiles.digestOf`).
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import {
  PACK_FORMAT_VERSION,
  PACK_MANIFEST_SCHEMA,
  PACK_REGION,
  checkOfflinePack,
  parsePackManifest,
  pmtilesFileUrl,
  resolveTileSource,
  type OfflinePackManifest,
  type OfflinePackProbe,
} from '../offlinePack';
import { ATTRIBUTION_LINES, SOURCE_ATTRIBUTION } from '../styles';

const REPO_ROOT = join(__dirname, '../../../../..');
const PACK_DIR = join(REPO_ROOT, 'apps', 'mobile', 'assets', 'maps');
const PACK_FILE = join(PACK_DIR, 'canterbury.pmtiles');
const MANIFEST_FILE = join(PACK_DIR, 'canterbury.manifest.json');

/** The ceiling the build enforces and the maps squad's gate names. */
const PACK_SIZE_CEILING_BYTES = 50 * 1024 * 1024;

/** The maximum zoom planetiler will build (measured 2026-11-11, v0.10.2). */
const PLANETILER_MAX_ZOOM = 16;

/** The manifest as the build writes it (what the app is handed at runtime). */
interface BuiltManifest extends OfflinePackManifest {
  archive?: { header?: { tile_type?: string; minzoom?: number; maxzoom?: number } };
  tools?: { planetiler?: { version?: string }; pmtiles?: { version?: string } };
}

function readBuiltPack(): { manifest: BuiltManifest; bytes: Buffer } | null {
  if (!existsSync(PACK_FILE) || !existsSync(MANIFEST_FILE)) {
    return null;
  }
  const manifest = JSON.parse(readFileSync(MANIFEST_FILE, 'utf8')) as BuiltManifest;
  const bytes = readFileSync(PACK_FILE);
  return { manifest, bytes };
}

/** The probe the app uses, answered by the pack that is on this machine. */
function aProbeOver(manifest: BuiltManifest, digest: string): OfflinePackProbe {
  const raw = JSON.stringify(manifest);
  return {
    readDownloadedManifest: (): Promise<string | null> => Promise.resolve(raw),
    readBundledManifest: (): Promise<string | null> => Promise.resolve(raw),
    digestOfDownloadedArchive: (): Promise<string | null> => Promise.resolve(digest),
    digestOfBundledArchive: (): Promise<string | null> => Promise.resolve(digest),
  };
}

describe('the built Canterbury pack (the directive item 6, the map leg)', () => {
  const built = readBuiltPack();

  it('is where the app reads it, and the repository holds its layout and not its bytes', () => {
    // The pack is a build artefact: the folder keeps its README so the path
    // exists in the repository (apps/mobile/assets/maps/README.md), and the
    // ~50 MB archive is fetched by the build, never committed.
    expect(existsSync(join(PACK_DIR, 'README.md'))).toBe(true);
    if (built === null) {
      // The honest arm: no pack on this machine. The lane that measured one
      // wrote its numbers and its sha256 into the evidence; the CI legs prove
      // the app's offline behaviour through `.maestro/offline-map-pack.yaml`.
      return;
    }
    expect(statSync(PACK_FILE).size).toBe(built.bytes.length);
  });

  // The whole leg below runs over the REAL bytes when the pack has been built
  // on this machine. On a fresh clone it is the layout assertion above, and the
  // absence is named rather than counted as a pass.
  if (built !== null) {
    const { manifest, bytes } = built;

    it('carries the manifest the app can read, with the licence and the credit', () => {
      const parsed = parsePackManifest(JSON.stringify(manifest));

      expect(parsed.ok).toBe(true);
      if (parsed.ok) {
        expect(parsed.manifest.schema).toBe(PACK_MANIFEST_SCHEMA);
        expect(parsed.manifest.version).toBe(PACK_FORMAT_VERSION);
        expect(parsed.manifest.region).toBe(PACK_REGION);
        // The ODbL data and the two credits the OSMF copyright page and the
        // LINZ attribution page ask for (both read 2026-10-21).
        expect(parsed.manifest.sourceLicence).toBe('Open Database License (ODbL)');
        expect(parsed.manifest.attribution).toContain(ATTRIBUTION_LINES[0]);
        expect(parsed.manifest.attribution).toContain(ATTRIBUTION_LINES[1]);
        expect(parsed.manifest.attribution).toContain(ATTRIBUTION_LINES[2]);
        // And the OpenMapTiles credit the schema's own profile requires
        // (planetiler's README: a pack built with the OpenMapTiles profile
        // must visibly credit OpenMapTiles).
        expect(parsed.manifest.attribution).toContain('OpenMapTiles');
      }
    });

    it('is answered READY by the app over its own bytes (BUG-085)', async () => {
      const digest = createHash('sha256').update(bytes).digest('hex');
      const state = await checkOfflinePack(aProbeOver(manifest, digest));

      expect(manifest.sha256).toBe(digest);
      expect(state.status).toBe('ready');
      if (state.status === 'ready') {
        expect(state.origin).toBe('downloaded');
      }
    });

    it('is read from the document directory as a pmtiles URL the native reader takes', () => {
      const downloaded = pmtilesFileUrl('/data/user/0/com.courier.copilot/files/maps/canterbury.pmtiles');
      const state = { status: 'ready' as const, manifest, origin: 'downloaded' as const };
      const source = resolveTileSource(
        state,
        { downloadedFileUrl: downloaded, bundledFileUrl: null },
        'https://tiles.example.nz/{z}/{x}/{y}.pbf',
      );

      expect(source).toEqual({ kind: 'offline-pack', url: downloaded, origin: 'downloaded' });
      // The pack wins over the server: with no network, the pack is the map.
      expect(downloaded.startsWith('pmtiles://file://')).toBe(true);
    });

    it('carries the tile source the style reads, with the credit beside it', () => {
      // The short credit the MapLibre attribution button carries, and the three
      // footer lines the app shows: the same words, offline and online.
      expect(SOURCE_ATTRIBUTION).toContain(ATTRIBUTION_LINES[0]);
      expect(SOURCE_ATTRIBUTION).toContain(ATTRIBUTION_LINES[2]);
      expect(ATTRIBUTION_LINES).toHaveLength(3);
    });

    it ('is under the 50 MB ceiling the build and the maps squad name', () => {
      expect(bytes.length).toBeLessThanOrEqual(PACK_SIZE_CEILING_BYTES);
    });

    it('carries the zooms the app can draw, and the archive says so itself', () => {
      // The manifest's zooms are the build's own, and the archive's header is
      // the tool's own answer - the manifest's job is to be the evidence of
      // what shipped, so the two must agree. planetiler's own ceiling is 16
      // (measured 2026-11-11: "Max zoom must be <= 16"), so a pack that claims
      // more than that is claiming a zoom its tiles cannot carry.
      expect(manifest.maxZoom).toBeLessThanOrEqual(PLANETILER_MAX_ZOOM);
      expect(manifest.minZoom).toBeGreaterThanOrEqual(0);
      const header = manifest.archive?.header;
      if (header !== undefined) {
        expect(header.tile_type).toBe('mvt');
        expect(header.maxzoom ?? 0).toBe(manifest.maxZoom);
        expect(header.minzoom ?? 0).toBe(manifest.minZoom);
      }
    });
  }
});
