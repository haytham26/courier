/**
 * The floating tab bar (D34).
 *
 * Five slots: Today, Route, the copilot in the centre (raised, the largest
 * target, the live glass sphere, the caption of the last thing heard under
 * it), Map, Account. The bar floats above the map on glass (the control
 * envelope); the active slot takes the quiet pill (`tabActiveFill`) and the
 * accent colour on its icon with `accentText` on its label, which is what
 * D33 made of the reference's raw accent as 10 px text.
 *
 * Geometry from the reference (03-today.html, the nav): bottom 26, left and
 * right 16, height 62, radius 31, padding 4, gap 10; the items are 54 high,
 * radius 27, icon 24, label 10/600 (`typography.label`). The centre is
 * raised so the sphere clears the bar.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GlassSurface } from './GlassSurface';
import { CopilotSphere } from './CopilotSphere';
import { useChosen } from './context';
import type { CopilotState } from './types';

export interface TabSlot {
  key: string;
  label: string;
  name: React.ComponentProps<typeof Ionicons>['name'];
  active?: boolean;
  onPress: () => void;
}

export interface TabBarProps {
  /** Today and Route, the two left of the centre. */
  left: [TabSlot, TabSlot];
  /** Map and Account, the two right of the centre. */
  right: [TabSlot, TabSlot];
  copilot: {
    state: CopilotState;
    level?: number;
    reduced?: boolean;
    onPress: () => void;
    onLongPress: () => void;
  };
  /** The caption of the last thing heard, under the centre (D34). */
  caption?: string;
}

const items = (slots: [TabSlot, TabSlot]) => (
  <>
    {slots.map((slot) => (
      <TabItem key={slot.key} slot={slot} />
    ))}
  </>
);

const TabBar = ({ left, right, copilot, caption }: TabBarProps) => {
  const { t } = useChosen();
  return (
    <View style={styles.dock} pointerEvents="box-none" testID="tab-bar">
      <GlassSurface kind="control" style={styles.bar}>
        <View style={styles.row}>
          {items(left)}
          {/* the raised centre: the sphere is the largest target (D34) */}
          <View style={styles.centre} pointerEvents="box-none">
            <CopilotSphere {...copilot} />
          </View>
          {items(right)}
        </View>
      </GlassSurface>
      {caption ? (
        <Text
          testID="tab-caption"
          style={[styles.caption, { color: t.colors.secondaryLabel }]}
          maxFontSizeMultiplier={1.4}
        >
          {caption}
        </Text>
      ) : null}
    </View>
  );
};

const TabItem = ({ slot }: { slot: TabSlot }) => {
  const { t } = useChosen();
  return (
    <Pressable
      accessible
      role="tab"
      accessibilityState={slot.active ? { selected: true } : undefined}
      accessibilityLabel={slot.label}
      onPress={slot.onPress}
      testID={`tab-${slot.key}`}
      style={[
        styles.item,
        { borderRadius: t.radii.button },
        slot.active ? { backgroundColor: t.colors.tabActiveFill } : null,
      ]}
    >
      <Ionicons name={slot.name} size={24} color={slot.active ? t.colors.accent : t.colors.label} />
      <Text
        style={{
          fontSize: t.typography.label.size,
          lineHeight: t.typography.label.lineHeight,
          fontWeight: t.typography.label.weight,
          color: slot.active ? t.colors.accentText : t.colors.secondaryLabel,
        }}
        maxFontSizeMultiplier={1.4}
      >
        {slot.label}
      </Text>
    </Pressable>
  );
};

export { TabBar };

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 26,
  },
  bar: {
    height: 62,
    borderRadius: 31,
    padding: 4,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  item: {
    flex: 1,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  centre: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18, // the raise: the sphere clears the bar (D34)
  },
  caption: {
    marginTop: 6,
    alignSelf: 'center',
    fontSize: 12,
  },
});
