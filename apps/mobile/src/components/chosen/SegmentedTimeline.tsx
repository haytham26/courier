/**
 * The segmented control and the timeline list for the route.
 *
 * The control: the fill track at radius `segmented`, the segments 32 high at
 * radius `segmentedSegment`; the active segment takes the card colour and
 * the shadow, the labels sit in `label` on the active card and in
 * `secondaryLabel` on the fill (their pairs are asserted: label on card,
 * secondaryLabel on the fill over the sheet glass, both at 4.5).
 *
 * The timeline: the stops with their time and state, separated by the
 * `separator` hairline.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useChosen } from './context';

export interface SegmentedOption {
  key: string;
  label: string;
  count?: number;
}

export interface SegmentedProps {
  options: SegmentedOption[];
  value: string;
  onChange: (key: string) => void;
  testID?: string;
}

export const Segmented = ({ options, value, onChange, testID }: SegmentedProps) => {
  const { t } = useChosen();
  return (
    <View
      testID={testID}
      role="radiogroup"
      style={[styles.track, { backgroundColor: t.colors.fill, borderRadius: t.radii.segmented, padding: 3 }]}
    >
      {options.map((option) => {
        const active = option.key === value;
        const label = option.count === undefined ? option.label : `${option.label} ${option.count}`;
        return (
          <Pressable
            key={option.key}
            accessible
            role="radio"
            accessibilityState={active ? { selected: true } : undefined}
            accessibilityLabel={label}
            onPress={() => onChange(option.key)}
            testID={`${testID ?? 'segmented'}-${option.key}`}
            style={[
              styles.segment,
              { borderRadius: t.radii.segmentedSegment },
              active ? { backgroundColor: t.colors.card, shadowColor: 'rgba(0,0,0,0.25)', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 } : null,
            ]}
          >
            <Text
              style={{
                fontSize: t.typography.chipLabel.size,
                lineHeight: t.typography.chipLabel.lineHeight,
                fontWeight: t.typography.chipLabel.weight,
                color: active ? t.colors.label : t.colors.secondaryLabel,
              }}
              maxFontSizeMultiplier={1.4}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

export interface TimelineItem {
  id: string;
  street: string;
  time?: string;
  state?: 'done' | 'later' | 'next';
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  /** Opens the stop, when the screen gives the row a control. */
  onPress?: () => void;
  /** The row's own testID, when a flow names it exactly. */
  testID?: string;
}

export interface TimelineProps {
  items: TimelineItem[];
  testID?: string;
}

export const Timeline = ({ items, testID }: TimelineProps) => {
  const { t } = useChosen();
  return (
    <View testID={testID}>
      {items.map((item, index) => {
        const rowTestID = item.testID ?? (testID ? `${testID}-${item.id}` : undefined);
        const rowStyle = [
          styles.row,
          index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.colors.separator } : null,
        ];
        const body = (
          <>
            <Ionicons
              name={item.state === 'done' ? 'checkmark-circle' : item.icon ?? 'stop-circle'}
              size={22}
              color={item.state === 'done' ? t.colors.successText : item.state === 'next' ? t.colors.accent : t.colors.secondaryLabel}
            />
            <View style={styles.texts}>
              <Text
                style={{
                  fontSize: t.typography.chipLabel.size,
                  lineHeight: t.typography.chipLabel.lineHeight,
                  fontWeight: t.typography.chipLabel.weight,
                  color: t.colors.label,
                }}
                maxFontSizeMultiplier={1.5}
              >
                {item.street}
              </Text>
              {item.time ? (
                <Text
                  style={{
                    fontSize: t.typography.secondary.size,
                    lineHeight: t.typography.secondary.lineHeight,
                    fontWeight: t.typography.secondary.weight,
                    color: t.colors.secondaryLabel,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {item.time}
                </Text>
              ) : null}
            </View>
          </>
        );

        return item.onPress === undefined ? (
          <View
            key={item.id}
            accessible
            accessibilityLabel={`${item.street}${item.time ? `, ${item.time}` : ''}${item.state ? `, ${item.state}` : ''}`}
            testID={rowTestID}
            style={rowStyle}
          >
            {body}
          </View>
        ) : (
          <Pressable
            key={item.id}
            accessible
            role="button"
            accessibilityLabel={`${item.street}${item.time ? `, ${item.time}` : ''}${item.state ? `, ${item.state}` : ''}`}
            accessibilityHint="Opens the stop"
            onPress={item.onPress}
            testID={rowTestID}
            style={rowStyle}
          >
            {body}
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  segment: {
    flex: 1,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  texts: {
    flex: 1,
  },
});
