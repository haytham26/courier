/**
 * Tests for the offline pack: the manifest contract, the detection and the
 * fallback.
 *
 * The pack logic is pure, so these tests need no device, no file system and
 * no network.
 */

import { createHash } from 'node:crypto';

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
  /** The sha256 the manifest that was handed over carries, if it carries one. */
  const digestOfManifest = (raw: string | null | undefined): string | null => {
    if (raw === null || raw === undefined) {
      return null;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null && 'sha256' in parsed) {
        const value = (parsed as { sha256?: unknown }).sha256;
        return typeof value === 'string' ? value : null;
      }
    } catch {
      return null;
    }
    return null;
  };

  return {
    readDownloadedManifest: (): Promise<string | null> => {
      if (options.downloadedError) {
        return Promise.reject(options.downloadedError);
      }
      return Promise.resolve(options.downloaded ?? null);
    },
    readBundledManifest: (): Promise<string | null> => Promise.resolve(options.bundled ?? null),
    // The archive is verified now (BUG-085), so a probe that answers a
    // manifest answers the digest its own manifest declares - the archive
    // matches its manifest. An absent manifest answers null, which the
    // decision treats as "cannot verify" rather than "matched".
    digestOfDownloadedArchive: (): Promise<string | null> =>
      Promise.resolve(digestOfManifest(options.downloaded)),
    digestOfBundledArchive: (): Promise<string | null> =>
      Promise.resolve(digestOfManifest(options.bundled)),
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
    const { sourceLicence: _sourceLicence, ...withoutLicence } = MANIFEST;
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

  // BUG-085 (the C1 audit's medium finding): the manifest's `sha256` was
  // parsed into a value and never compared with the archive's bytes, so a pack
  // whose bytes are not the bytes that were checksummed still answered `ready`
  // - a truncated download, a corrupted write, or a pack swapped under the app
  // would be drawn as if it were good. The check belongs in the decision that
  // answers `ready`, not at one call site: the probe now carries the digest of
  // the archive, and a mismatch answers `corrupt`.
  describe("the archive's checksum (BUG-085)", () => {
    /** A probe that also answers what the archive bytes hash to. */
    function probeWithDigest(
      digest: string | null,
      options: { downloaded?: string | null; bundled?: string | null } = {},
    ): OfflinePackProbe {
      const probe = probeWith(options);
      return {
        ...probe,
        digestOfDownloadedArchive: (): Promise<string | null> => Promise.resolve(digest),
        digestOfBundledArchive: (): Promise<string | null> => Promise.resolve(digest),
      };
    }

    it("is ready when the archive hashes to the manifest's own value", async () => {
      const state = await checkOfflinePack(
        probeWithDigest(MANIFEST.sha256, { downloaded: JSON.stringify(MANIFEST) }),
      );

      expect(state.status).toBe('ready');
    });

    it("is not ready when the archive does not hash to the manifest's own value", async () => {
      const state = await checkOfflinePack(
        probeWithDigest('b'.repeat(64), { downloaded: JSON.stringify(MANIFEST) }),
      );

      expect(state.status).not.toBe('ready');
      expect(state.status).toBe('unreadable');
      if (state.status === 'unreadable') {
        expect(state.reason).toContain("does not match");
      }
    });

    it('falls back to the bundled pack when the downloaded one is corrupt', async () => {
      const probe: OfflinePackProbe = {
        readDownloadedManifest: (): Promise<string | null> =>
          Promise.resolve(JSON.stringify(MANIFEST)),
        readBundledManifest: (): Promise<string | null> => Promise.resolve(JSON.stringify(MANIFEST)),
        digestOfDownloadedArchive: (): Promise<string | null> => Promise.resolve('c'.repeat(64)),
        digestOfBundledArchive: (): Promise<string | null> => Promise.resolve(MANIFEST.sha256),
      };

      const state = await checkOfflinePack(probe);

      expect(state.status).toBe('ready');
      if (state.status === 'ready') {
        expect(state.origin).toBe('bundled');
      }
    });

    it('is not ready when the archive itself cannot be read', async () => {
      const probe: OfflinePackProbe = {
        readDownloadedManifest: (): Promise<string | null> =>
          Promise.resolve(JSON.stringify(MANIFEST)),
        readBundledManifest: (): Promise<string | null> => Promise.resolve(null),
        digestOfDownloadedArchive: (): Promise<string | null> => Promise.resolve(null),
        digestOfBundledArchive: (): Promise<string | null> => Promise.resolve(null),
      };

      const state = await checkOfflinePack(probe);

      expect(state.status).not.toBe('ready');
    });

    it("does not hide an unverified pack behind a probe with no digest answer", async () => {
      // The shape the old code had: a probe that reads manifests and nothing
      // else. The pack must NOT be answered `ready`, because then nothing ever
      // checked its bytes - an unverified pack is not a ready one.
      const bareProbe: OfflinePackProbe = {
        readDownloadedManifest: (): Promise<string | null> =>
          Promise.resolve(JSON.stringify(MANIFEST)),
        readBundledManifest: (): Promise<string | null> => Promise.resolve(null),
      };

      const state = await checkOfflinePack(bareProbe);

      expect(state.status).not.toBe('ready');
      expect(state.status).toBe('unreadable');
      if (state.status === 'unreadable') {
        expect(state.reason).toContain('could not be verified');
      }
    });
  });

  // The real system, not a fake (PLAYBOOK §14.3): the value the app compares
  // the manifest's `sha256` against is the platform's own `crypto.subtle`, and
  // the manifest is written by `scripts/data/build-pmtiles.mjs` with node's
  // `createHash('sha256')`. If those two ever disagreed, every real pack would
  // answer `corrupt` and the map would silently fall back to the online source
  // - so the two are pinned against each other here, over real bytes.
  describe('the digest the device computes', () => {
    /** The same conversion `packFiles.digestOf` applies to a real hash. */
    async function platformDigest(bytes: Uint8Array): Promise<string> {
      const copy = new Uint8Array(bytes.length);
      copy.set(bytes);
      const digest = await crypto.subtle.digest('SHA-256', copy.buffer);
      return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
    }

    it('is the same value the build script writes, over the same bytes', async () => {
      // A real byte string, hashed by the platform's own WebCrypto.
      const bytes = new TextEncoder().encode('a canterbury pack archive payload');
      const fromPlatform = await platformDigest(bytes);

      // And by node's crypto, which is what the build script uses.
      const fromBuild = createHash('sha256').update(Buffer.from(bytes)).digest('hex');

      expect(fromPlatform).toBe(fromBuild);
    });

    it('is the empty file\'s own digest, which is the value sha256sum prints', async () => {
      const fromPlatform = await platformDigest(new Uint8Array(0));

      expect(fromPlatform).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('answers a value the manifest\'s own sha256 can be compared against', async () => {
      const bytes = new TextEncoder().encode('the pack');
      const manifest = { ...MANIFEST, sha256: await platformDigest(bytes) };

      const state = await checkOfflinePack(
        probeWith({ downloaded: JSON.stringify(manifest) }),
      );

      expect(state.status).toBe('ready');
    });
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
