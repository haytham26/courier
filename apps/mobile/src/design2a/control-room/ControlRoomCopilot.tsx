/**
 * 01 Control Room - **Copilot**.
 *
 * Copilot is a strip along the top of the panel: the state in words, a static
 * level bar of the microphone and the last thing it said on one line under
 * it. There is no bubble, no avatar and nothing that repeats.
 *
 * The screen shows what the assistant understood and how the action was
 * confirmed, which is the third moment of the direction: a spoken action is
 * confirmed on the strip, in words, and the run moves on.
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

const direction = directions2a.controlRoom;

/** The five bars of the level meter, drawn at rest. */
const LEVEL = [4, 7, 10, 6, 3];

export function ControlRoomCopilot({ state = 'ready' }: { state?: LabState }): React.JSX.Element {
  const { theme } = useTheme();
  const [confirmed, setConfirmed] = useState(false);

  if (state === 'error') {
    return (
      <View
        testID="copilot-screen"
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
      >
        <LabStateMessage
          direction={direction}
          title="Copilot could not hear that"
          body="The microphone was busy. Say it again, or tap the button under the panel."
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
      accessibilityLabel="Copilot, Control Room direction"
    >
      <View style={[styles.strip, { borderBottomColor: theme.colors.border }]}>
        <View style={styles.stripHead}>
          <View style={[styles.lamp, { backgroundColor: theme.colors.brandPrimary }]} />
          <Text
            style={[stepStyle(direction, 'label'), { color: theme.colors.textPrimary }]}
            accessibilityRole="header"
          >
            {stateWord}
          </Text>
          <View style={styles.meter} accessibilityElementsHidden>
            {LEVEL.map((height, index) => (
              <View
                key={index}
                style={[
                  styles.meterBar,
                  { backgroundColor: theme.colors.textTertiary, height },
                ]}
              />
            ))}
          </View>
        </View>
        <Text style={[stepStyle(direction, 'body'), { color: theme.colors.textSecondary }]}>
          {voice.lastSaid}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[stepStyle(direction, 'label'), { color: theme.colors.textSecondary }]}>
          WHAT IT HEARD
        </Text>
        <Text style={[stepStyle(direction, 'body'), { color: theme.colors.textPrimary }]}>
          {voice.heard}
        </Text>

        <View style={[styles.rule, { backgroundColor: theme.colors.border }]} />

        <Text style={[stepStyle(direction, 'label'), { color: theme.colors.textSecondary }]}>
          WHAT IT DID
        </Text>
        <Text style={[stepStyle(direction, 'body'), { color: theme.colors.textPrimary }]}>
          {confirmed ? 'Stop 45 is delivered. Stop 46 is next.' : voice.intent}
        </Text>

        {confirmed ? (
          <View
            style={[
              styles.confirmed,
              { borderColor: theme.colors.statusDelivered, borderRadius: direction.radii.control },
            ]}
            accessibilityRole="text"
            accessibilityLabel="Confirmed, stop 45 is delivered"
            testID="copilot-confirmed"
          >
            <Text
              style={[stepStyle(direction, 'label'), { color: theme.colors.statusDelivered }]}
            >
              CONFIRMED
            </Text>
            <Text style={[stepStyle(direction, 'body'), { color: theme.colors.textPrimary }]}>
              {`Stop ${run.nextStop.sequence} delivered. ${run.remaining} stops left.`}
            </Text>
          </View>
        ) : null}

        <View style={[styles.rule, { backgroundColor: theme.colors.border }]} />

        <Text style={[stepStyle(direction, 'label'), { color: theme.colors.textSecondary }]}>
          IT CAN
        </Text>
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
  strip: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, borderBottomWidth: 1 },
  stripHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lamp: { width: 8, height: 8 },
  meter: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginLeft: 'auto' },
  meterBar: { width: 3 },
  content: { padding: 16, gap: 4, paddingBottom: 24 },
  rule: { height: 1, marginVertical: 12 },
  confirmed: { borderWidth: 1, padding: 12, gap: 4, marginTop: 12 },
  command: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    borderBottomWidth: 1,
  },
  actions: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
});
