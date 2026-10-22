/**
 * 03 Address First - **Copilot**.
 *
 * Copilot is one annotated line under the address: what it heard, what it
 * did, and nothing else. The page is never interrupted, and there is no
 * bubble and no avatar.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/Button';
import { directions2a } from '@courier/design-tokens/directions2a';
import { hapticFor } from '@/motion/haptics';
import { run, voice, type LabState } from '../content';
import { LabStateMessage } from '../kit';
import { stepStyle } from '../typeStyle';

const direction = directions2a.addressFirst;

export function AddressFirstCopilot({ state = 'ready' }: { state?: LabState }): React.JSX.Element {
  const { theme } = useTheme();
  const [confirmed, setConfirmed] = useState(false);

  if (state === 'error') {
    return (
      <View testID="copilot-screen" style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <LabStateMessage
          direction={direction}
          title="Copilot could not hear that"
          body="The microphone was busy. Say it again, or use the control under the note."
          action="Try again"
          onAction={() => hapticFor('confirm')}
          testID="copilot-error"
        />
      </View>
    );
  }

  const stateWord = state === 'offline' ? 'Offline' : state === 'partial' ? 'Working' : 'Listening';

  return (
    <View
      testID="copilot-screen"
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      accessibilityLabel="Copilot, Address First direction"
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[stepStyle(direction, 'label'), { color: theme.colors.textTertiary }]}>
          {`${run.runName.toUpperCase()} · ${stateWord.toUpperCase()}`}
        </Text>

        <Text
          style={[stepStyle(direction, 'address'), styles.margin, { color: theme.colors.textPrimary }]}
          accessibilityRole="heading"
        >
          {run.nextStop.address}
        </Text>
        <Text style={[stepStyle(direction, 'body'), { color: theme.colors.textSecondary }]}>
          {`${run.nextStop.suburb} · ${run.nextStop.eta}`}
        </Text>

        <View style={[styles.rule, { backgroundColor: theme.colors.border }]} />

        <View style={styles.annotation}>
          <Text style={[stepStyle(direction, 'label'), { color: theme.colors.textTertiary }]}>
            COPILOT
          </Text>
          <Text style={[stepStyle(direction, 'body'), { color: theme.colors.textPrimary }]}>
            {voice.lastSaid}
          </Text>
        </View>

        <View style={styles.annotation}>
          <Text style={[stepStyle(direction, 'label'), { color: theme.colors.textTertiary }]}>
            HEARD
          </Text>
          <Text style={[stepStyle(direction, 'body'), { color: theme.colors.textSecondary }]}>
            {voice.heard}
          </Text>
        </View>

        <View style={styles.annotation}>
          <Text style={[stepStyle(direction, 'label'), { color: theme.colors.textTertiary }]}>
            DONE
          </Text>
          <Text style={[stepStyle(direction, 'body'), { color: theme.colors.textSecondary }]}>
            {confirmed ? 'Stop 45 is delivered. Stop 46 is next.' : voice.intent}
          </Text>
        </View>

        {confirmed ? (
          <View
            style={[styles.annotation, { borderLeftColor: theme.colors.statusDelivered }]}
            accessibilityRole="text"
            accessibilityLabel="Confirmed, stop 45 is delivered"
            testID="copilot-confirmed"
          >
            <Text style={[stepStyle(direction, 'label'), { color: theme.colors.statusDelivered }]}>
              CONFIRMED
            </Text>
            <Text style={[stepStyle(direction, 'body'), { color: theme.colors.textPrimary }]}>
              {`Stop ${run.nextStop.sequence} delivered. ${run.remaining} stops left.`}
            </Text>
          </View>
        ) : null}

        <View style={[styles.rule, { backgroundColor: theme.colors.border }]} />

        {['Mark delivered', 'Skip this stop', 'Next stop', 'How many left'].map((command) => (
          <Pressable
            key={command}
            onPress={() => hapticFor('confirm')}
            style={({ pressed }) => [
              styles.command,
              { borderBottomColor: theme.colors.border, opacity: pressed ? 0.6 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={command}
            testID={`copilot-command-${command.replaceAll(' ', '-').toLowerCase()}`}
          >
            <Text style={[stepStyle(direction, 'row'), { color: theme.colors.textPrimary }]}>
              {command}
            </Text>
            <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textTertiary }]}>
              Say it
            </Text>
          </Pressable>
        ))}
      </ScrollView>

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
  content: { padding: 24, gap: 4, paddingBottom: 24 },
  margin: { marginTop: 8 },
  rule: { height: 1, marginVertical: 16 },
  annotation: { borderLeftWidth: 2, borderLeftColor: 'transparent', paddingLeft: 12, paddingVertical: 6, gap: 2 },
  command: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    borderBottomWidth: 1,
  },
  actions: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16 },
});
