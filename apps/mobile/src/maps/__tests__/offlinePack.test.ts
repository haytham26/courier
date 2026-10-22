/**
 * Tests for the offline pack: the manifest contract, the detection and the
 * fallback.
 *
 * The pack logic is pure, so these tests need no device, no file system and
 * no network.
 */

import {
  PACK_FORMAT_VERSION,
  PACK_MANIFEST_SCHEMA,
  PACK_REGION,
  checkOfflinePack,
  checkPackCompatibility,
  parsePackManifest,
  pmtilesAssetUrl,
  pmtilesFileUrl,
  resolveTileSource,
  type OfflinePackManifest,
  type OfflinePackProbe,
} from '../offlinePack';

const MANIFEST: OfflinePackManifest = {
  schema: PACK_MANIFEST_SCHEMA,
  version: PACK_FORMAT_VERSION,
  region: PACK_REGION,
  builtAt: '2026-10-21T00:00:00.000Z',
  source: 'Geofabrik New Zealand extract',
  sourceLicence: 'Open Database License (ODbL)',
  sourceLicenceUrl: 'https://www.openstreetmap.org/copyright',
  attribution: '© OpenStreetMap contributors',
  minZoom: 6,
  maxZoom: 17,
  bytes: 41_943_040,
  sha256: 'a'.repeat(64),
};

const DOWNLOADED_URL = 'pmtiles://file:///data/user/0/com.courier.copilot/files/maps/canterbury.pmtiles';
const BUNDLED_URL = 'pmtiles://file:///data/user/0/com.courier.copilot/files/maps/canterbury.pmtiles';

function probeWith(options: {
  downloaded?: string | null;
  bundled?: string | null;
  downloadedError?: Error;
}): OfflinePackProbe {
  return {
    readDownloadedManifest: async () => {
      if (options.downloadedError) {
        throw options.downloadedError;
      }
      return options.downloaded ?? null;
    },
    readBundledManifest: async () => options.bundled ?? null,
  };
}

describe('the pack manifest', () => {
  it('reads a manifest the app understands', () => {
    const result = parsePackManifest(JSON.stringify(MANIFEST));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.manifest.region).toBe(PACK_REGION);
      expect(result.manifest.sourceLicence).toBe('Open Database License (ODbL)');
      expect(result.manifest.attribution).toBe('© OpenStreetMap contributors');
    }
  });

  it('rejects a file that is not JSON', () => {
    const result = parsePackManifest('not json at all');

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.error).toBe('not-json');
    }
  });

  it('rejects a manifest of another schema', () => {
    const result = parsePackManifest(JSON.stringify({ ...MANIFEST, schema: 'something-else' }));

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.error).toBe('wrong-schema');
    }
  });

  it('rejects a manifest that is missing the licence', () => {
    const { sourceLicence, ...withoutLicence } = MANIFEST;
    const result = parsePackManifest(JSON.stringify(withoutLicence));

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.error).toBe('missing-field');
      expect(result.detail).toContain('sourceLicence');
    }
  });

  it('rejects a manifest whose version the app does not know', () => {
    const compatibility = checkPackCompatibility({ ...MANIFEST, version: PACK_FORMAT_VERSION + 1 });

    expect(compatibility.ok).toBe(false);
    if (compatibility.ok === false) {
      expect(compatibility.reason).toBe('version-mismatch');
    }
  });

  it('rejects a manifest for another region', () => {
    const compatibility = checkPackCompatibility({ ...MANIFEST, region: 'wellington' });

    expect(compatibility.ok).toBe(false);
    if (compatibility.ok === false) {
      expect(compatibility.reason).toBe('region-mismatch');
    }
  });
});

describe('finding the pack', () => {
  it('uses the downloaded pack when it is there', async () => {
    const state = await checkOfflinePack(
      probeWith({ downloaded: JSON.stringify(MANIFEST), bundled: null }),
    );

    expect(state.status).toBe('ready');
    if (state.status === 'ready') {
      expect(state.origin).toBe('downloaded');
    }
  });

  it('falls back to the bundled pack when there is no downloaded one', async () => {
    const state = await checkOfflinePack(probeWith({ bundled: JSON.stringify(MANIFEST) }));

    expect(state.status).toBe('ready');
    if (state.status === 'ready') {
      expect(state.origin).toBe('bundled');
    }
  });

  it('falls back to the bundled pack when the downloaded one is broken', async () => {
    const state = await checkOfflinePack(
      probeWith({ downloaded: '{ this is not json', bundled: JSON.stringify(MANIFEST) }),
    );

    expect(state.status).toBe('ready');
    if (state.status === 'ready') {
      expect(state.origin).toBe('bundled');
    }
  });

  it('says the pack is missing when there is none', async () => {
    const state = await checkOfflinePack(probeWith({}));

    expect(state.status).toBe('missing');
  });

  it('says the pack is incompatible when the version is wrong', async () => {
    const state = await checkOfflinePack(
      probeWith({
        downloaded: JSON.stringify({ ...MANIFEST, version: PACK_FORMAT_VERSION + 1 }),
      }),
    );

    expect(state.status).toBe('incompatible');
  });

  it('says the pack is unreadable when the file system says no', async () => {
    const state = await checkOfflinePack(
      probeWith({ downloadedError: new Error('the storage is full') }),
    );

    expect(state.status).toBe('unreadable');
    if (state.status === 'unreadable') {
      expect(state.reason).toContain('the storage is full');
    }
  });
});

describe('the tile source', () => {
  const ready = {
    status: 'ready' as const,
    manifest: MANIFEST,
    origin: 'downloaded' as const,
  };

  it('uses the offline pack when it is there', () => {
    const source = resolveTileSource(
      ready,
      { downloadedFileUrl: DOWNLOADED_URL, bundledFileUrl: BUNDLED_URL },
      'https://tiles.example.nz/{z}/{x}/{y}.pbf',
    );

    expect(source).toEqual({ kind: 'offline-pack', url: DOWNLOADED_URL, origin: 'downloaded' });
  });

  it('uses the online source when there is no pack', () => {
    const source = resolveTileSource(
      { status: 'missing' },
      { downloadedFileUrl: null, bundledFileUrl: null },
      'https://tiles.example.nz/{z}/{x}/{y}.pbf',
    );

    expect(source).toEqual({ kind: 'online', url: 'https://tiles.example.nz/{z}/{x}/{y}.pbf' });
  });

  it('uses the online source when the manifest is there but the archive is not', () => {
    const source = resolveTileSource(
      ready,
      { downloadedFileUrl: null, bundledFileUrl: null },
      'https://tiles.example.nz/{z}/{x}/{y}.pbf',
    );

    expect(source.kind).toBe('online');
  });

  it('has no tile source at all when there is neither a pack nor a server', () => {
    const source = resolveTileSource(
      { status: 'missing' },
      { downloadedFileUrl: null, bundledFileUrl: null },
      null,
    );

    expect(source).toEqual({ kind: 'none' });
  });
});

describe('the pack URLs', () => {
  it('reads a file with a fully specified URL, as the native reader needs', () => {
    expect(pmtilesFileUrl('/data/user/0/app/files/maps/canterbury.pmtiles')).toBe(
      'pmtiles://file:///data/user/0/app/files/maps/canterbury.pmtiles',
    );
  });

  it('reads a pack that ships inside the app bundle', () => {
    expect(pmtilesAssetUrl('canterbury.pmtiles')).toBe('pmtiles://asset://canterbury.pmtiles');
  });
});
