/**
 * The sheet under the map.
 *
 * The sheet holds the choices a courier makes once and then forgets about:
 * the buildings, the traffic, the road closures, the weather, the size of the
 * labels and the battery saver.
 *
 * Every control has a label, a role and a test id, the colours come from the
 * theme and the sizes from the design tokens, and the copy is plain NZ
 * English. The day/night choice is NOT here: light and dark have one source
 * (the chosen mode, which follows the device), and a second selector on this
 * sheet would be a second truth.
 */
import React from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

import { Sheet } from '@/components/Sheet';
import { useTheme } from '@/providers/ThemeProvider';

import {
  MAP_LABEL_SIZES,
  MAP_LAYER_AVAILABILITY,
  layerUnavailableMessage,
  type MapLabelSize,
  type MapLayer,
  type MapToggles,
} from './toggles';

interface MapSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** The toggles as they are now. */
  toggles: MapToggles;
  /** The courier changed something. */
  onTogglesChange: (toggles: MapToggles) => void;
}

const LAYER_LABELS: Record<MapLayer, string> = {
  traffic: 'Traffic',
  closures: 'Road closures',
  weather: 'Weather',
};

const LABEL_SIZE_LABELS: Record<MapLabelSize, string> = {
  small: 'Small',
  normal: 'Normal',
  large: 'Large',
};

export function MapSettingsSheet({ isOpen, onClose, toggles, onTogglesChange }: MapSettingsSheetProps) {
  const { theme } = useTheme();

  const setFlag =
    (flag: 'buildings' | 'traffic' | 'closures' | 'weather' | 'batterySaver') =>
    (value: boolean) => {
      onTogglesChange({ ...toggles, [flag]: value });
    };

  const setLabelSize = (labelSize: MapLabelSize) => () => {
    onTogglesChange({ ...toggles, labelSize });
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title="Map settings"
      subtitle="What the map shows"
      size="medium"
      testID="map-settings-sheet"
    >
      <View style={styles.body}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Buildings</Text>
            <Text style={[styles.note, { color: theme.colors.textSecondary }]}>
              The buildings of the street, flat or standing up.
            </Text>
          </View>
          <Switch
            value={toggles.buildings}
            onValueChange={setFlag('buildings')}
            thumbColor={theme.colors.brandPrimary}
            trackColor={{ true: theme.colors.brandSecondary, false: theme.colors.border }}
            accessibilityLabel="Buildings"
            accessibilityHint="Turns the buildings on the map on or off"
            testID="map-toggle-buildings"
          />
        </View>

        {(['traffic', 'closures', 'weather'] as MapLayer[]).map((layer) => (
          <View key={layer} style={styles.row}>
            <View style={styles.rowText}>
              <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
                {LAYER_LABELS[layer]}
              </Text>
              <Text style={[styles.note, { color: theme.colors.textSecondary }]}>
                {MAP_LAYER_AVAILABILITY[layer]
                  ? 'Shown on the map when it is turned on.'
                  : layerUnavailableMessage(layer)}
              </Text>
            </View>
            <Switch
              value={toggles[layer]}
              onValueChange={setFlag(layer)}
              thumbColor={theme.colors.brandPrimary}
              trackColor={{ true: theme.colors.brandSecondary, false: theme.colors.border }}
              accessibilityLabel={LAYER_LABELS[layer]}
              accessibilityHint={`Turns ${LAYER_LABELS[layer].toLowerCase()} on the map on or off`}
              testID={`map-toggle-${layer}`}
            />
          </View>
        ))}

        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Label size</Text>
        <View style={styles.choices} accessibilityRole="radiogroup">
          {MAP_LABEL_SIZES.map((size) => {
            const selected = toggles.labelSize === size;
            return (
              <TouchableOpacity
                key={size}
                onPress={setLabelSize(size)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${LABEL_SIZE_LABELS[size]} labels`}
                testID={`map-label-size-${size}`}
                style={[
                  styles.choice,
                  {
                    borderColor: selected ? theme.colors.brandPrimary : theme.colors.border,
                    backgroundColor: selected ? theme.colors.background : theme.colors.surface,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.choiceLabel,
                    { color: selected ? theme.colors.brandPrimary : theme.colors.textSecondary },
                  ]}
                >
                  {LABEL_SIZE_LABELS[size]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Battery saver</Text>
            <Text style={[styles.note, { color: theme.colors.textSecondary }]}>
              Keeps the map flat, whatever the map mode is.
            </Text>
          </View>
          <Switch
            value={toggles.batterySaver}
            onValueChange={setFlag('batterySaver')}
            thumbColor={theme.colors.brandPrimary}
            trackColor={{ true: theme.colors.brandSecondary, false: theme.colors.border }}
            accessibilityLabel="Battery saver"
            accessibilityHint="Keeps the map flat to save the battery"
            testID="map-toggle-battery-saver"
          />
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
  },
  rowText: { flex: 1 },
  label: { fontSize: 19, fontWeight: '600' },
  note: { fontSize: 17, marginTop: 2 },
  sectionTitle: { fontSize: 19, fontWeight: '600', marginTop: 8 },
  choices: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: 28,
    borderWidth: 1,
  },
  choiceLabel: { fontSize: 19, fontWeight: '500' },
});
