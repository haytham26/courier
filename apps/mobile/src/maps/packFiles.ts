/**
 * The file system side of the offline pack.
 *
 * The pure logic - what a manifest means, whether it may be used and what the
 * app falls back to - lives in `offlinePack.ts`. This module is the adapter
 * that reads the device: where the pack is, whether the archive is there and
 * what URL MapLibre Native has to read it from.
 *
 * Nothing here throws at the caller: a missing pack, a broken manifest and a
 * file system that says no are all answers, not crashes.
 */

import { Directory, File, Paths } from 'expo-file-system';

import {
  PACK_DIRECTORY_NAME,
  PACK_FILE_NAME,
  PACK_MANIFEST_NAME,
  checkOfflinePack,
  describe,
  pmtilesFileUrl,
  type OfflinePackState,
  type PackFileLocations,
} from './offlinePack';

/** The directory the pack lives in at runtime. */
export function packDirectory(): Directory {
  return new Directory(Paths.document, PACK_DIRECTORY_NAME);
}

/** The pack archive in the app's document directory. */
export function downloadedPackFile(): File {
  return new File(packDirectory(), PACK_FILE_NAME);
}

/** The pack archive shipped inside the app bundle, when there is one. */
export function bundledPackFile(): File {
  return new File(Paths.bundle, PACK_DIRECTORY_NAME, PACK_FILE_NAME);
}

/** The glyph bundle that sits beside the pack. */
export function glyphsDirectory(): Directory {
  return new Directory(packDirectory(), 'glyphs');
}

/**
 * The local glyph endpoint, or null when the glyph bundle is not on the
 * device. Without glyphs MapLibre draws no text, so the style leaves the
 * label layers out rather than showing an error.
 */
export function localGlyphsUrl(): string | null {
  try {
    if (!glyphsDirectory().exists) {
      return null;
    }
    return `${glyphsDirectory().uri}/{fontstack}/{range}.pbf`;
  } catch (error) {
    console.warn(`maps: the glyph bundle could not be read: ${describe(error)}`);
    return null;
  }
}

async function readTextFile(file: File): Promise<string | null> {
  try {
    if (!file.exists) {
      return null;
    }
    return await file.text();
  } catch (error) {
    throw new Error(`the file could not be read: ${describe(error)}`, { cause: error });
  }
}

/** What the app found on the device. */
export interface OfflinePackRuntime {
  /** The state of the pack: ready, missing, incompatible or unreadable. */
  state: OfflinePackState;
  /** Where the tile archive is, when it is there. */
  locations: PackFileLocations;
}

/**
 * Copies the bundled archive into the document directory.
 *
 * The map always reads the archive from one place, so the weekly refresh can
 * replace it without touching the bundle, and the two platforms read the same
 * path.
 */
async function copyBundledPack(): Promise<File | null> {
  const bundled = bundledPackFile();
  try {
    if (!bundled.exists) {
      return null;
    }
  } catch (error) {
    console.warn(`maps: the bundled pack could not be read: ${describe(error)}`);
    return null;
  }

  const target = downloadedPackFile();
  try {
    if (target.exists) {
      return target;
    }
    const directory = packDirectory();
    if (!directory.exists) {
      directory.create({ intermediates: true, idempotent: true });
    }
    await bundled.copy(target);
    return target;
  } catch (error) {
    console.warn(`maps: the bundled pack could not be copied into place: ${describe(error)}`);
    return null;
  }
}

/**
 * Looks for the pack on the device and works out where the tiles are.
 *
 * The downloaded pack wins over the bundled one: it is the fresher of the two,
 * because that is where the weekly refresh puts it.
 */
export async function loadOfflinePack(): Promise<OfflinePackRuntime> {
  const state = await checkOfflinePack({
    readDownloadedManifest: () => readTextFile(new File(packDirectory(), PACK_MANIFEST_NAME)),
    readBundledManifest: () =>
      readTextFile(new File(Paths.bundle, PACK_DIRECTORY_NAME, PACK_MANIFEST_NAME)),
  });

  const locations: PackFileLocations = {
    downloadedFileUrl: null,
    bundledFileUrl: null,
  };

  if (state.status === 'ready') {
    if (state.origin === 'downloaded') {
      try {
        const file = downloadedPackFile();
        locations.downloadedFileUrl = file.exists ? pmtilesFileUrl(file.uri) : null;
      } catch (error) {
        console.warn(`maps: the downloaded pack could not be read: ${describe(error)}`);
      }
    } else {
      const copied = await copyBundledPack();
      locations.bundledFileUrl = copied ? pmtilesFileUrl(copied.uri) : null;
    }
  }

  return { state, locations };
}
