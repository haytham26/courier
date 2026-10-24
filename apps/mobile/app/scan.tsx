/**
 * The scanner (T6 slice 3, screen 06): the camera, the reading and the van.
 *
 * The reference (06-scan.html) is a courier pointing the phone at a parcel
 * label: the camera fills the screen, the two pills ride the top (Done, the
 * count of what the van holds), the status line says what the scanner is
 * doing, and - when the label is read - the lock ring lands on the address
 * and the sheet at the bottom reads it: the matched address, where the
 * parcel sits in the van, and the one action, "Add and Scan Next".
 *
 * What is real here: the camera. react-native-vision-camera 5.2.3 opens a
 * session on the device (the emulator's virtual scene in CI) and the app asks
 * for the camera permission. A device with no back camera is a quiet dark
 * feed on a plain View, never a crash: the session's start-and-stop is the
 * library's own (`isActive`), and 5.2.3 exposes NO error callback for a
 * session that fails to start - the screen never pretends to report an event
 * the library does not deliver either.
 *
 * What is NOT real yet, and says so: the READING. The camera library ships
 * its own object scanner on iOS only (its CameraObjectOutput is marked
 * `@platform iOS`), and Android needs an ML Kit text-recognition plugin - a
 * native dependency and its own slice (P5). So the reading comes through
 * the reader seam (src/scans/labelReader.ts): the E2E build reads the mock
 * run's labels, and a device build without the Android recognizer tells the
 * courier that it cannot read a label yet. The screen never pretends.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';

import { ChosenProvider, GlassSurface, ScanMatchSheet, ScanOverlay } from '@/components/chosen';
import { colors, spacing, typography } from '@courier/design-tokens/chosen';
import { useScanLoad, type VanPosition } from '@/scans/scanLoad';
import { readerForThisBuild, type LabelReading } from '@/scans/labelReader';

/**
 * The lock ring's bounds (the reference's address block: left 36, top 228,
 * 200 x 112 in the 390 x 844 frame). The overlay draws the hole and the
 * yellow ring around them.
 */
const FOUND_TARGET = { x: 36, y: 228, width: 200, height: 112 };

function ScannerSurface() {
  const router = useRouter();
  const load = useScanLoad();
  const [reading, setReading] = useState<LabelReading | null>(null);
  const [vanPosition, setVanPosition] = useState<VanPosition>('middle');

  const permission = useCameraPermission();
  const device = useCameraDevice('back');
  const reader = useMemo(() => readerForThisBuild(), []);

  // The permission: the scanner asks once, when the system still allows it.
  useEffect(() => {
    if (!permission.canRequestPermission) {
      return;
    }
    void permission.requestPermission();
  }, [permission.canRequestPermission, permission.requestPermission]);

  // The reading: one read at a time, and a new one after every parcel the
  // courier adds ("Add and Scan Next").
  useEffect(() => {
    if (!permission.hasPermission || reading !== null) {
      return;
    }
    let live = true;
    void reader.read().then((result) => {
      if (live) {
        setReading(result);
      }
    });
    return () => {
      live = false;
    };
  }, [permission.hasPermission, reading, reader]);

  const handleAdd = useCallback(() => {
    if (reading === null || reading.kind !== 'found') {
      return;
    }
    load.add(reading.match, vanPosition);
    setReading(null);
  }, [reading, load, vanPosition]);

  const found = reading !== null && reading.kind === 'found' ? reading.match : null;
  const unavailable = reading !== null && reading.kind === 'unavailable' ? reading.reason : null;

  // The precedence is the reader's, not the camera's: what the reader says
  // wins. The E2E build's reader is a mock that reads the run's labels without
  // a camera (the emulator is started with -camera-back none, so no back
  // device exists there), and putting the device check first meant the mock's
  // answer could never reach the screen. A device with no camera now reads as
  // "nothing to point at", which is only said while nothing has been read yet.
  const status =
    unavailable !== null
      ? 'This build cannot read labels yet.'
      : found !== null
        ? 'Address found. Hold steady.'
        : device === undefined
          ? 'This device has no camera.'
          : 'Point the camera at the label.';

  const statusHint = unavailable ?? undefined;

  return (
    <View style={styles.screen} testID="scan-screen">
      {/* The camera feed: the device's own camera, and the emulator's virtual
          scene in CI. No camera device is a quiet dark feed, not a crash. The
          native Camera takes no testID (its props pick style/onLayout/
          pointerEvents/nativeID from ViewProps), so the flow's anchor is the
          View that holds it. */}
      {device !== undefined ? (
        <View testID="scan-camera" style={styles.feed}>
          <Camera device={device} isActive={permission.hasPermission} style={StyleSheet.absoluteFill} />
        </View>
      ) : (
        <View testID="scan-feed" style={styles.feed} />
      )}

      <ScanOverlay
        done="Done"
        scanned={`${load.count} scanned`}
        target={found !== null ? FOUND_TARGET : undefined}
        testID="scan-overlay"
      />

      <Text
        testID="scan-status"
        accessibilityHint={statusHint}
        style={[styles.status, { color: colors.dark.onDarkGlass }]}
      >
        {status}
      </Text>

      {/* The Done pill: the one interactive twin of the overlay's display-only
          pill, on the same spot (the overlay takes no touches). */}
      <View style={styles.doneHolder} pointerEvents="box-none">
        <Pressable
          accessible
          role="button"
          accessibilityLabel="Done scanning"
          accessibilityHint="Closes the scanner"
          onPress={() => router.back()}
          testID="scan-done"
          style={[styles.donePill, { backgroundColor: colors.dark.glass }]}
        >
          <Text style={[styles.doneLabel, { color: colors.dark.onDarkGlass }]}>Done</Text>
        </Pressable>
      </View>

      {found !== null ? (
        <ChosenProvider mode="light">
          <View style={styles.sheetHolder} pointerEvents="box-none">
            <GlassSurface kind="sheet" testID="scan-sheet" style={styles.sheet}>
              <ScanMatchSheet
                match={found}
                vanPosition={vanPosition}
                onVanPositionChange={setVanPosition}
                onAdd={handleAdd}
              />
            </GlassSurface>
          </View>
        </ChosenProvider>
      ) : null}
    </View>
  );
}

export default function ScanScreen() {
  const scheme = useColorScheme();

  return (
    <ChosenProvider mode={scheme === 'dark' ? 'dark' : 'light'}>
      <ScannerSurface />
    </ChosenProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  feed: {
    ...StyleSheet.absoluteFill,
  },
  doneHolder: {
    position: 'absolute',
    left: spacing.space16,
    top: 58,
  },
  donePill: {
    height: 36,
    borderRadius: 18,
    paddingHorizontal: spacing.space12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneLabel: {
    fontSize: typography.body.size,
    lineHeight: typography.body.lineHeight,
    fontWeight: typography.body.weight,
  },
  status: {
    position: 'absolute',
    top: 430,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: typography.body.size,
    lineHeight: typography.body.lineHeight,
    fontWeight: typography.body.weight,
  },
  sheetHolder: {
    position: 'absolute',
    left: spacing.space8,
    right: spacing.space8,
    bottom: spacing.space8,
  },
  sheet: {
    // the glass surface of the sheet; the content's own padding is the
    // match sheet's (the reference's 10 20 22 on the 4 pt scale)
  },
});
