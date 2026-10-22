/**
 * 02 Topo - **Copilot**.
 *
 * Copilot is a margin note: a narrow column down the side of the chart where
 * the assistant writes what it did, in the note face, with no bubble and no
 * avatar. The chart itself stays empty while it speaks.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/Button';
import { directions2a } from '@courier/design-tokens/directions2a';
import { hapticFor } from '@/motion/haptics';
import { run, voice, type LabState } from '../content';
import { LabStateMessage } from '../kit';
import { stepStyle } from '../typeStyle';

const direction = directions2a.topo;

export function TopoCopilot({ state = 'ready' }: { state?: LabState }): React.JSX.Element {
  const { theme } = useTheme();
  const [confirmed, setConfirmed] = useState(false);

  if (state === 'error') {
    return (
      <View testID="copilot-screen" style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <LabStateMessage
          direction={direction}
          title="Copilot could not hear that"
          body="The microphone was busy. Say it again, or use the control under the notes."
          action="Try again"
          onAction={() => hapticFor('confirm')}
          testID="copilot-error"
        />
      </View>
    );
  }

  const stateWord = state === 'offline' ? 'OFFLINE' : state === 'partial' ? 'WORKING' : 'LISTENING';

  return (
    <View
      testID="copilot-screen"
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      accessibilityLabel="Copilot, Topo direction"
    >
      <View style={styles.chart}>
        <View style={styles.chartHead}>
          <Text style={[stepStyle(direction, 'label'), { color: theme.colors.textSecondary }]}>
            RUNNING NOTE
          </Text>
          <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textTertiary }]}>
            {`${run.runName.toUpperCase()}`}
          </Text>
        </View>
        <View style={styles.contours} accessibilityElementsHidden>
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <View
              key={index}
              style={[
                styles.contour,
                {
                  borderBottomColor: theme.colors.border,
                  width: `${96 - index * 13}%`,
                  marginLeft: `${index * 6.5}%`,
                },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.notes}>
        <View style={[styles.marginNote, { borderLeftColor: theme.colors.brandPrimary }]}>
          <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.brandPrimary }]}>
            {stateWord}
          </Text>
          <Text style={[stepStyle(direction, 'body'), { color: theme.colors.textPrimary }]}>
            {voice.lastSaid}
          </Text>
        </View>

        <View style={[styles.marginNote, { borderLeftColor: theme.colors.border }]}>
          <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textTertiary }]}>
            HEARD
          </Text>
          <Text style={[stepStyle(direction, 'body'), { color: theme.colors.textSecondary }]}>
            {voice.heard}
          </Text>
        </View>

        <View style={[styles.marginNote, { borderLeftColor: theme.colors.border }]}>
          <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textTertiary }]}>
            DONE
          </Text>
          <Text style={[stepStyle(direction, 'body'), { color: theme.colors.textSecondary }]}>
            {confirmed ? 'Stop 45 is delivered. Stop 46 is next.' : voice.intent}
          </Text>
        </View>

        {confirmed ? (
          <View
            style={[styles.marginNote, { borderLeftColor: theme.colors.statusDelivered }]}
            accessibilityRole="text"
            accessibilityLabel="Confirmed, stop 45 is delivered"
            testID="copilot-confirmed"
          >
            <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.statusDelivered }]}>
              CONFIRMED
            </Text>
            <Text style={[stepStyle(direction, 'body'), { color: theme.colors.textPrimary }]}>
              {`Stop ${run.nextStop.sequence} delivered. ${run.remaining} stops left.`}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => {
            hapticFor('voice');
            setConfirmed(true);
          }}
          style={{ borderRadius: direction.radii.control }}
          accessibilityHint="Talks to Copilot"
          testID="copilot-talk"
        >
          Talk to Copilot
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  chart: { height: 120, overflow: 'hidden' },
  chartHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  contours: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center' },
  contour: { position: 'absolute', height: 0, borderBottomWidth: 1 },
  notes: { flex: 1, paddingHorizontal: 20, paddingTop: 12, gap: 12 },
  marginNote: { borderLeftWidth: 2, paddingLeft: 12, gap: 2 },
  actions: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
});
