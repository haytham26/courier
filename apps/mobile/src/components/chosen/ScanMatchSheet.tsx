/**
 * The match sheet: what the scanner shows when it has read a label.
 *
 * The reference (06-scan.html) puts the reading in a white sheet over the
 * camera: the green check and the matched address, the place it was found
 * ("Papanui 8053. Matched to the map."), where the parcel sits in the van,
 * and the one action - "Add and Scan Next" - which puts it in the van and
 * keeps the scanner open for the next parcel.
 *
 * The scanner keeps its own palette in both modes: the pills over the
 * camera are the dark recipe (the ScanOverlay's rule), and this sheet is
 * the LIGHT recipe in both modes too - the reference's sheet is white in
 * both, and the screen wraps it in a light ChosenProvider. The pairs ride
 * the D33 rows: the address on the sheet (label on the card), the subtitle
 * and the section label (secondaryLabel, the alpha .9 the D33 gate raised),
 * the button (onAccent on the accent, the large-text pair), and the check
 * (onSuccess black on the green - the reference's white is 2.2:1, the same
 * record the delivered badge carries).
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { spacing } from '@courier/design-tokens/chosen';

import { useChosen } from './context';
import { DeliveredBadge } from './DeliveredBadge';
import { Segmented } from './SegmentedTimeline';
import type { VanPosition } from '@/scans/scanLoad';
import type { LabelMatch } from '@/scans/labelReader';

/** The badge of the match row (the reference's 44 pt circle). */
export const MATCH_BADGE_SIZE = 44;

/** The grabber of the sheet (the same 36 x 5 handle the other sheets have). */
const GRABBER_WIDTH = 36;
const GRABBER_HEIGHT = 5;
const GRABBER_RADIUS = 3;

/** The height of the action (the reference's 54; the floor is 48). */
const ACTION_HEIGHT = 54;

/** The three places a parcel can sit in the van. */
export const VAN_POSITIONS: { key: VanPosition; label: string }[] = [
  { key: 'front', label: 'Front' },
  { key: 'middle', label: 'Middle' },
  { key: 'back', label: 'Back' },
];

export interface ScanMatchSheetProps {
  /** The label that was read and matched. */
  match: LabelMatch;
  /** Where the courier says the parcel sits. */
  vanPosition: VanPosition;
  onVanPositionChange: (position: VanPosition) => void;
  /** Puts the parcel in the van and scans the next one. */
  onAdd: () => void;
  testID?: string;
}

export const ScanMatchSheet = ({
  match,
  vanPosition,
  onVanPositionChange,
  onAdd,
  testID = 'scan-match-sheet',
}: ScanMatchSheetProps) => {
  const { t } = useChosen();

  return (
    <View testID={testID} style={styles.sheet}>
      <View style={styles.grabberRow}>
        <View style={[styles.grabber, { backgroundColor: t.colors.grabber }]} />
      </View>

      <View style={styles.matchRow}>
        <DeliveredBadge size={MATCH_BADGE_SIZE} testID="scan-match-badge" />
        <View style={styles.matchText}>
          <Text
            testID="scan-match-address"
            style={[
              styles.address,
              {
                color: t.colors.label,
                fontSize: t.typography.matchTitle.size,
                lineHeight: t.typography.matchTitle.lineHeight,
                fontWeight: t.typography.matchTitle.weight,
              },
            ]}
          >
            {match.address}
          </Text>
          <Text
            testID="scan-match-subtitle"
            style={[
              styles.subtitle,
              {
                color: t.colors.secondaryLabel,
                fontSize: t.typography.matchSubtitle.size,
                lineHeight: t.typography.matchSubtitle.lineHeight,
                fontWeight: t.typography.matchSubtitle.weight,
              },
            ]}
          >
            {`${match.suburb}. Matched to the map.`}
          </Text>
        </View>
      </View>

      <Text
        testID="scan-van-label"
        style={[
          styles.vanLabel,
          {
            color: t.colors.secondaryLabel,
            fontSize: t.typography.secondary.size,
            lineHeight: t.typography.secondary.lineHeight,
            fontWeight: t.typography.secondary.weight,
          },
        ]}
      >
        WHERE IN THE VAN
      </Text>
      <Segmented
        testID="scan-van"
        options={VAN_POSITIONS}
        value={vanPosition}
        onChange={(key) => onVanPositionChange(key as VanPosition)}
      />

      <Pressable
        accessible
        role="button"
        accessibilityLabel="Add and Scan Next"
        onPress={onAdd}
        testID="scan-add"
        style={[styles.action, { backgroundColor: t.colors.accent, borderRadius: t.radii.button }]}
      >
        <Text
          style={[
            styles.actionLabel,
            {
              color: t.colors.onAccent,
              fontSize: t.typography.button.size,
              lineHeight: t.typography.button.lineHeight,
              fontWeight: t.typography.button.weight,
            },
          ]}
        >
          Add and Scan Next
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    paddingTop: spacing.space8,
    paddingHorizontal: spacing.space20,
    paddingBottom: spacing.space24,
    gap: spacing.space12,
  },
  grabberRow: {
    alignItems: 'center',
  },
  grabber: {
    width: GRABBER_WIDTH,
    height: GRABBER_HEIGHT,
    borderRadius: GRABBER_RADIUS,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space12,
  },
  matchText: {
    flex: 1,
    gap: spacing.space4,
  },
  address: {
    // the type comes from the token row (typography.matchTitle)
  },
  subtitle: {
    // the type comes from the token row (typography.matchSubtitle)
  },
  vanLabel: {
    // the type comes from the token row (typography.secondary)
  },
  action: {
    height: ACTION_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    // the type comes from the token row (typography.button)
  },
});
