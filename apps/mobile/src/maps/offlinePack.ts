/**
 * The offline map pack (D15).
 *
 * The file layout the app reads:
 *
 *   apps/mobile/assets/maps/canterbury.pmtiles        the tile archive
 *   apps/mobile/assets/maps/canterbury.manifest.json   the manifest
 *
 * At runtime the same two files live in the app's document directory, which
 * is where the weekly refresh puts the new pack:
 *
 *   <documentDirectory>/maps/canterbury.pmtiles
 *   <documentDirectory>/maps/canterbury.manifest.json
 *
 * The manifest is the contract between the pack build and the app. It carries
 * the pack format version, the region, the licence of the data, the
 * attribution and the checksum of the archive. A pack whose version or region
 * is not the one the app expects is not used: the app falls back to the online
 * source rather than draw a half-understood map.
 *
 * Everything in this module is pure. The file system lives in `packFiles.ts`,
 * so the detection and the fallback can be tested without a device and
 * without a network.
 */

/** The pack format this build of the app understands. */
export const PACK_FORMAT_VERSION = 1;

/** The region the pack covers. */
export const PACK_REGION = 'canterbury';

/** The directory the pack files live in, inside the assets and at runtime. */
export const PACK_DIRECTORY_NAME = 'maps';

/** The tile archive file name. */
export const PACK_FILE_NAME = 'canterbury.pmtiles';

/** The manifest file name that sits beside the archive. */
export const PACK_MANIFEST_NAME = 'canterbury.manifest.json';

/** The pack directory in the repository, relative to the mobile app. */
export const PACK_SOURCE_DIRECTORY = 'assets/maps';

/** The schema tag every manifest carries. */
export const PACK_MANIFEST_SCHEMA = 'courier-copilot/offline-pack';

/**
 * The licence of one input that went into the 3D buildings.
 *
 * Every input is recorded, not only the first one: the buildings come from
 * the LINZ outlines (CC BY 4.0) **and** from the OpenStreetMap levels
 * (ODbL), and the app has to be able to show both credits with no network.
 */
export interface PackBuildingInput {
  /** The id of the input in the build script. */
  id: string;
  /** Where the input came from. */
  source: string;
  /** The licence of the input. */
  licence: string;
  /** Where that licence is published. */
  licenceUrl: string;
  /** The credit the input requires. */
  attribution: string;
}

/**
 * What the pack says about the 3D buildings it carries.
 *
 * The outlines come from the LINZ NZ Building Outlines (CC BY 4.0) and the
 * building levels from OpenStreetMap (ODbL), and the licence of every input
 * is written into the pack so the app can show the credit without a network.
 */
export interface PackBuildings {
  /** The outlines are in the pack, so the buildings can stand up. */
  present: boolean;
  /** Where the outlines came from. */
  source: string;
  /** The licence of the outlines. */
  licence: string;
  /** Where that licence is published. */
  licenceUrl: string;
  /** The credit the app shows. */
  attribution: string;
  /** How many buildings the pack carries. */
  count: number;
  /** The licence of every input that went into the buildings. */
  inputs?: PackBuildingInput[];
}

/**
 * The manifest of one offline pack.
 *
 * `sourceLicence` and `attribution` are the strings the pack build writes
 * from the terms of the source it used; the app shows the attribution whether
 * or not there is a network.
 */
export interface OfflinePackManifest {
  schema: typeof PACK_MANIFEST_SCHEMA;
  version: number;
  region: string;
  builtAt: string;
  source: string;
  sourceLicence: string;
  sourceLicenceUrl: string;
  attribution: string;
  minZoom: number;
  maxZoom: number;
  bytes: number;
  sha256: string;
  /** The 3D buildings the pack carries, when it carries any. */
  buildings?: PackBuildings;
}

export type PackManifestError =
  | 'not-json'
  | 'not-an-object'
  | 'wrong-schema'
  | 'missing-field'
  | 'bad-field';

export type PackManifestResult =
  | { ok: true; manifest: OfflinePackManifest }
  | { ok: false; error: PackManifestError; detail: string };

export type PackCompatibility =
  | { ok: true }
  | {
      ok: false;
      reason: 'version-mismatch' | 'region-mismatch';
      expected: string;
      found: string;
    };

/**
 * The state of the offline pack on the device.
 *
 * `ready` is the only state in which the app draws the pack. Every other
 * state falls back to the online source, and the online source falls back to
 * no tile source at all.
 */
export type OfflinePackState =
  | { status: 'ready'; manifest: OfflinePackManifest; origin: 'bundled' | 'downloaded' }
  | { status: 'missing' }
  | { status: 'incompatible'; reason: string }
  | { status: 'unreadable'; reason: string };

/**
 * Where the app looks for the pack. The probe is injected so the detection
 * can be tested without a file system.
 */
export interface OfflinePackProbe {
  /** The manifest of the downloaded pack, or null when there is none. */
  readDownloadedManifest(): Promise<string | null>;
  /** The manifest bundled with the app, or null when the bundle has none. */
  readBundledManifest(): Promise<string | null>;
}

/** Where the pack files are, once the app knows. */
export interface PackFileLocations {
  /** The `pmtiles://` URL of the downloaded archive, or null. */
  downloadedFileUrl: string | null;
  /** The `pmtiles://` URL of the bundled archive, or null. */
  bundledFileUrl: string | null;
}

/** The tile source the style is built from. */
export type TileSource =
  | { kind: 'offline-pack'; url: string; origin: 'bundled' | 'downloaded' }
  | { kind: 'online'; url: string }
  | { kind: 'none' };

/** What the app expects of a pack. */
export interface PackExpectation {
  version: number;
  region: string;
}

export const DEFAULT_PACK_EXPECTATION: PackExpectation = {
  version: PACK_FORMAT_VERSION,
  region: PACK_REGION,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readNumber(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Reads a manifest and checks that it is a manifest this build understands.
 *
 * The parse never throws: a broken file is a result, not an exception, so a
 * corrupt pack can never take the screen down.
 */
export function parsePackManifest(raw: string): PackManifestResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'not-json', detail: 'the manifest is not valid JSON' };
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: 'not-an-object', detail: 'the manifest is not a JSON object' };
  }

  if (parsed.schema !== PACK_MANIFEST_SCHEMA) {
    return {
      ok: false,
      error: 'wrong-schema',
      detail: `the manifest schema is ${String(parsed.schema)}, expected ${PACK_MANIFEST_SCHEMA}`,
    };
  }

  const version = readNumber(parsed, 'version');
  const region = readString(parsed, 'region');
  const builtAt = readString(parsed, 'builtAt');
  const source = readString(parsed, 'source');
  const sourceLicence = readString(parsed, 'sourceLicence');
  const sourceLicenceUrl = readString(parsed, 'sourceLicenceUrl');
  const attribution = readString(parsed, 'attribution');
  const minZoom = readNumber(parsed, 'minZoom');
  const maxZoom = readNumber(parsed, 'maxZoom');
  const bytes = readNumber(parsed, 'bytes');
  const sha256 = readString(parsed, 'sha256');

  const missing = [
    ['version', version],
    ['region', region],
    ['builtAt', builtAt],
    ['source', source],
    ['sourceLicence', sourceLicence],
    ['sourceLicenceUrl', sourceLicenceUrl],
    ['attribution', attribution],
    ['minZoom', minZoom],
    ['maxZoom', maxZoom],
    ['bytes', bytes],
    ['sha256', sha256],
  ]
    .filter(([, value]) => value === null)
    .map(([key]) => key);

  if (
    missing.length > 0 ||
    version === null ||
    region === null ||
    builtAt === null ||
    source === null ||
    sourceLicence === null ||
    sourceLicenceUrl === null ||
    attribution === null ||
    minZoom === null ||
    maxZoom === null ||
    bytes === null ||
    sha256 === null
  ) {
    return {
      ok: false,
      error: missing.length > 0 ? 'missing-field' : 'bad-field',
      detail:
        missing.length > 0
          ? `the manifest is missing: ${missing.join(', ')}`
          : 'the manifest has a field of the wrong type',
    };
  }

  // The buildings section is optional: a pack without 3D buildings is a pack
  // from before the buildings were baked in, and it is still a good pack.
  const buildings = readBuildings(parsed.buildings);
  if (buildings === null) {
    return {
      ok: false,
      error: 'bad-field',
      detail: 'the manifest has a buildings section of the wrong shape',
    };
  }

  return {
    ok: true,
    manifest: {
      schema: PACK_MANIFEST_SCHEMA,
      version,
      region,
      builtAt,
      source,
      sourceLicence,
      sourceLicenceUrl,
      attribution,
      minZoom,
      maxZoom,
      bytes,
      sha256,
      ...(buildings ? { buildings } : {}),
    },
  };
}

/**
 * Reads the buildings section of a manifest.
 *
 * It returns null when the section is there but is not a buildings section,
 * and undefined when the pack simply carries none.
 */
function readBuildings(value: unknown): PackBuildings | null | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (!isRecord(value)) {
    return null;
  }

  const present = value.present;
  const source = readString(value, 'source');
  const licence = readString(value, 'licence');
  const licenceUrl = readString(value, 'licenceUrl');
  const attribution = readString(value, 'attribution');
  const count = readNumber(value, 'count');

  if (
    typeof present !== 'boolean' ||
    source === null ||
    licence === null ||
    licenceUrl === null ||
    attribution === null ||
    count === null
  ) {
    return null;
  }

  const inputs = readBuildingInputs(value.inputs);
  if (inputs === null) {
    return null;
  }

  return {
    present,
    source,
    licence,
    licenceUrl,
    attribution,
    count,
    ...(inputs ? { inputs } : {}),
  };
}

/**
 * Reads the licence of every input of the buildings.
 *
 * It returns null when the list is there but is not a list of inputs, and
 * undefined when the pack was built before the inputs were recorded.
 */
function readBuildingInputs(value: unknown): PackBuildingInput[] | null | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const inputs: PackBuildingInput[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) {
      return null;
    }
    const id = readString(entry, 'id');
    const source = readString(entry, 'source');
    const licence = readString(entry, 'licence');
    const licenceUrl = readString(entry, 'licenceUrl');
    const attribution = readString(entry, 'attribution');
    if (
      id === null ||
      source === null ||
      licence === null ||
      licenceUrl === null ||
      attribution === null
    ) {
      return null;
    }
    inputs.push({ id, source, licence, licenceUrl, attribution });
  }

  return inputs;
}

/**
 * Checks the manifest against what the app expects.
 *
 * The version says whether the app can read the pack at all; the region says
 * whether the pack is the one the courier asked for.
 */
export function checkPackCompatibility(
  manifest: OfflinePackManifest,
  expectation: PackExpectation = DEFAULT_PACK_EXPECTATION,
): PackCompatibility {
  if (manifest.version !== expectation.version) {
    return {
      ok: false,
      reason: 'version-mismatch',
      expected: String(expectation.version),
      found: String(manifest.version),
    };
  }

  if (manifest.region !== expectation.region) {
    return {
      ok: false,
      reason: 'region-mismatch',
      expected: expectation.region,
      found: manifest.region,
    };
  }

  return { ok: true };
}

/**
 * Works out which pack the app should use.
 *
 * The downloaded pack wins over the bundled one: it is the fresher of the
 * two, and the weekly refresh is what puts it there. A pack that cannot be
 * read, or whose version or region is wrong, is skipped rather than used, and
 * the next candidate is tried.
 */
export async function checkOfflinePack(
  probe: OfflinePackProbe,
  expectation: PackExpectation = DEFAULT_PACK_EXPECTATION,
): Promise<OfflinePackState> {
  const candidates: { origin: 'downloaded' | 'bundled'; read: () => Promise<string | null> }[] = [
    { origin: 'downloaded', read: () => probe.readDownloadedManifest() },
    { origin: 'bundled', read: () => probe.readBundledManifest() },
  ];

  let failure: OfflinePackState | null = null;

  for (const candidate of candidates) {
    let raw: string | null = null;
    try {
      raw = await candidate.read();
    } catch (error) {
      failure = failure ?? {
        status: 'unreadable',
        reason: `the ${candidate.origin} pack could not be read: ${describe(error)}`,
      };
      continue;
    }

    if (raw === null) {
      continue;
    }

    const parsed = parsePackManifest(raw);
    if (parsed.ok === false) {
      failure = failure ?? {
        status: 'unreadable',
        reason: `the ${candidate.origin} pack is unusable: ${parsed.detail}`,
      };
      continue;
    }

    const compatibility = checkPackCompatibility(parsed.manifest, expectation);
    if (compatibility.ok === false) {
      failure = failure ?? {
        status: 'incompatible',
        reason: `the ${candidate.origin} pack is ${compatibility.reason}: expected ${compatibility.expected}, found ${compatibility.found}`,
      };
      continue;
    }

    return { status: 'ready', manifest: parsed.manifest, origin: candidate.origin };
  }

  return failure ?? { status: 'missing' };
}

/**
 * Picks the tile source the style is built from.
 *
 * The order is the offline pack, then the online source, then nothing. With
 * nothing the style draws the background and the courier overlay only, which
 * is what a courier in a dead spot should see rather than a broken map.
 */
export function resolveTileSource(
  state: OfflinePackState,
  locations: PackFileLocations,
  onlineTileUrl: string | null,
): TileSource {
  if (state.status === 'ready') {
    const url =
      state.origin === 'downloaded' ? locations.downloadedFileUrl : locations.bundledFileUrl;
    if (url) {
      return { kind: 'offline-pack', url, origin: state.origin };
    }
  }

  if (onlineTileUrl) {
    return { kind: 'online', url: onlineTileUrl };
  }

  return { kind: 'none' };
}

/**
 * The URL MapLibre Native reads a pack from. The URL inside `pmtiles://` has
 * to be fully specified: the native reader does not resolve relative URLs.
 */
export function pmtilesFileUrl(absolutePath: string): string {
  return `pmtiles://file://${absolutePath}`;
}

/** The URL MapLibre Native reads a pack bundled in the APK from. */
export function pmtilesAssetUrl(fileName: string): string {
  return `pmtiles://asset://${fileName}`;
}

/** A short, plain description of a failure, safe to put in a log line. */
export function describe(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
