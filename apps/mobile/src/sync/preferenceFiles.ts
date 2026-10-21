/**
 * The file system side of the driver preferences.
 *
 * One small JSON file per driver, in the document directory:
 *
 *   <documentDirectory>/preferences/<driver id>.json
 *
 * Nothing here throws at the caller: a file system that says no is an
 * answer, not a crash, because a courier in a dead spot still has to open
 * the map.
 */
import { Directory, File, Paths } from 'expo-file-system';

import { errorMessage } from '@/lib/errors';

import {
  PREFERENCES_DIRECTORY_NAME,
  driverPreferenceFileName,
  type PreferenceStore,
} from './storage';

/** The directory the preference files live in. */
export function preferencesDirectory(): Directory {
  return new Directory(Paths.document, PREFERENCES_DIRECTORY_NAME);
}

/** The preferences of one driver. */
export function driverPreferencesFile(driverId: string): File {
  return new File(preferencesDirectory(), driverPreferenceFileName(driverId));
}

/**
 * The store that keeps the preferences on the device.
 *
 * The file is created when it is not there, so the first write of a driver
 * does not have to care about the directory.
 */
export function createFilePreferenceStore(): PreferenceStore {
  return {
    async read(driverId: string): Promise<string | null> {
      try {
        const file = driverPreferencesFile(driverId);
        if (!file.exists) {
          return null;
        }
        return await file.text();
      } catch (error) {
        console.warn(
          `maps: the preferences of the driver could not be read: ${errorMessage(error)}`,
        );
        return null;
      }
    },

    async write(driverId: string, raw: string): Promise<void> {
      const directory = preferencesDirectory();
      if (!directory.exists) {
        directory.create({ intermediates: true, idempotent: true });
      }

      const file = new File(directory, driverPreferenceFileName(driverId));
      if (!file.exists) {
        file.create({ intermediates: true, overwrite: true });
      }
      await file.write(raw);
    },
  };
}
