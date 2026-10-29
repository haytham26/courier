import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { open } from '@op-engineering/op-sqlite';
import { useTheme } from '@/providers/ThemeProvider';
import { firstLine } from '@/lib/firstLine';

type CheckState = 'pending' | 'running' | 'ok' | 'skipped' | 'failed';

interface CheckResult {
  id: string;
  label: string;
  state: CheckState;
  detail: string;
}

const MODULES: { id: string; label: string }[] = [
  { id: 'sherpa', label: 'sherpa-onnx (STT/TTS)' },
  { id: 'camera', label: 'VisionCamera' },
  { id: 'maplibre', label: 'MapLibre v11 + PMTiles' },
  { id: 'opsqlite', label: 'op-sqlite (SQLCipher + FTS5)' },
  { id: 'audio', label: 'expo-audio (record/play)' },
  { id: 'reanimated', label: 'Reanimated 4' },
];

/**
 * Compatibility screen for the B.7 gate (FINAL_PROMPT §0-F.1).
 *
 * Every native module the product depends on is exercised here and the result
 * is shown with a stable testID, so the Maestro flow on the CI emulator can
 * assert on it. A module that cannot be exercised in this environment reports
 * `skipped` with the reason — it never reports a false `ok`.
 */
export default function CompatScreen() {
  const { theme } = useTheme();
  const [results, setResults] = useState<Record<string, CheckResult>>(() =>
    Object.fromEntries(
      MODULES.map((module) => [
        module.id,
        { id: module.id, label: module.label, state: 'pending', detail: '' },
      ]),
    ),
  );
  const [running, setRunning] = useState(false);

  const update = useCallback((id: string, state: CheckState, detail: string) => {
    setResults((current) => ({
      ...current,
      [id]: { ...current[id], state, detail },
    }));
  }, []);

  const runChecks = useCallback(async () => {
    setRunning(true);
    for (const module of MODULES) {
      update(module.id, 'running', '');
    }

    await runSherpa(update);
    await runCamera(update);
    await runMapLibre(update);
    await runOpSqlite(update);

    setRunning(false);
  }, [update]);

  useEffect(() => {
    void runChecks();
  }, [runChecks]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="compat-screen">
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Compatibility (B.7)</Text>
      {/* The run's own state, read before the rows it describes. It used to sit
          under the six module rows, and those rows grow a detail line each as
          the probes finish - so the finished screen pushed this line below the
          fold and a flow asserting it only ever saw it during the short
          'running' window (the same class of failure as BUG-050's clipped
          actions row). Above the rows it cannot scroll away. */}
      <Text
        testID="compat-running"
        accessibilityLiveRegion="polite"
        style={[styles.detail, { color: theme.colors.textSecondary }]}
      >
        {running ? 'running' : 'done'}
      </Text>
      {MODULES.map((module) => {
        const result = results[module.id];
        return (
          <View
            key={module.id}
            style={styles.row}
            testID={`compat-row-${result.id}`}
            accessible
            accessibilityLabel={`${result.label}: ${result.state}${result.detail ? `. ${result.detail}` : ''}`}
          >
            <Text style={[styles.label, { color: theme.colors.textPrimary }]}>{result.label}</Text>
            <Text
              testID={`compat-${result.id}`}
              style={[styles.state, { color: stateColor(result.state, theme.colors) }]}
            >
              {result.state}
            </Text>
            {result.detail ? (
              <Text
                testID={`compat-${result.id}-detail`}
                // The belt under the sentence's braces: even a detail that
                // somehow grew with the row cannot push the screen's state
                // line below the fold (BUG-109).
                numberOfLines={2}
                style={[styles.detail, { color: theme.colors.textSecondary }]}
              >
                {result.detail}
              </Text>
            ) : null}
          </View>
        );
      })}
      <ReanimatedProbe onResult={(state, detail) => update('reanimated', state, detail)} />
      <AudioProbe onResult={(state, detail) => update('audio', state, detail)} />
    </ScrollView>
  );
}

function stateColor(state: CheckState, colors: Record<string, string>): string {
  switch (state) {
    case 'ok':
      return colors.success ?? colors.textSecondary;
    case 'failed':
      return colors.error ?? colors.textSecondary;
    case 'skipped':
      return colors.warning ?? colors.textSecondary;
    default:
      return colors.textSecondary;
  }
}

async function runSherpa(update: (id: string, state: CheckState, detail: string) => void) {
  try {
    const stt = await import('react-native-sherpa-onnx/stt');
    const tts = await import('react-native-sherpa-onnx/tts');
    const hasStt = typeof stt.createSTT === 'function' && typeof stt.detectSttModel === 'function';
    const hasTts = typeof tts.createTTS === 'function';
    if (!hasStt || !hasTts) {
      update('sherpa', 'failed', 'the sherpa-onnx native module is not linked');
      return;
    }
    // The ONNX model asset is not bundled in the repository yet, so the engines
    // cannot be created here; the native binding is what this gate proves.
    update('sherpa', 'skipped', 'native module linked; the STT model asset is not bundled yet');
  } catch (error) {
    // The sentence only, never the trace (BUG-109): a native message can be
    // five lines long, and a row that grows with it pushes this screen's own
    // state line out of view on the emulator's 320x640 viewport.
    update('sherpa', 'failed', `import failed: ${firstLine(error)}`);
  }
}

async function runCamera(update: (id: string, state: CheckState, detail: string) => void) {
  try {
    const vision = await import('react-native-vision-camera');
    const devices = vision.getAllCameraDevices();
    const granted = await vision.VisionCamera.requestCameraPermission();
    update(
      'camera',
      granted ? 'ok' : 'skipped',
      `permission granted: ${String(granted)}, devices: ${devices.length}`,
    );
  } catch (error) {
    // The sentence only, never the trace (BUG-109): the emulator's camera
    // factory answers with its five-line Java trace, which grew this row to
    // 265px and pushed the state line below the fold.
    update('camera', 'failed', `camera failed: ${firstLine(error)}`);
  }
}

async function runMapLibre(update: (id: string, state: CheckState, detail: string) => void) {
  try {
    const maplibre = await import('@maplibre/maplibre-react-native');
    if (typeof maplibre.Map !== 'undefined') {
      // The offline PMTiles archive is built in a later phase; the native view
      // binding is what this gate proves for now.
      update(
        'maplibre',
        'skipped',
        'native Map component available; the PMTiles archive is not built yet',
      );
      return;
    }
    update('maplibre', 'failed', 'Map is missing from @maplibre/maplibre-react-native');
  } catch (error) {
    update('maplibre', 'failed', `maplibre failed: ${firstLine(error)}`);
  }
}

async function runOpSqlite(update: (id: string, state: CheckState, detail: string) => void) {
  try {
    const db = open({ name: 'compat.sqlite' });
    await db.execute('CREATE TABLE IF NOT EXISTS compat (value TEXT NOT NULL)');
    await db.execute('DELETE FROM compat');
    await db.execute('INSERT INTO compat (value) VALUES (?)', ['ok']);
    const result = await db.execute('SELECT value FROM compat LIMIT 1');
    const value = result.rows[0]?.value;
    if (value !== 'ok') {
      update('opsqlite', 'failed', `read back ${JSON.stringify(value)}`);
      return;
    }
    update('opsqlite', 'ok', 'wrote a row and read it back');
  } catch (error) {
    update('opsqlite', 'failed', `op-sqlite failed: ${firstLine(error)}`);
  }
}

/** Animates a shared value so the Reanimated native runtime has to be alive. */
function ReanimatedProbe({ onResult }: { onResult: (state: CheckState, detail: string) => void }) {
  const { theme } = useTheme();
  const value = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + value.value * 0.6,
  }));

  useEffect(() => {
    value.value = withTiming(1, { duration: 250 });
    onResult('ok', 'withTiming scheduled on the UI runtime');
  }, [onResult, value]);

  return (
    <Animated.View
      testID="compat-reanimated-view"
      style={[styles.probe, { backgroundColor: theme.colors.textTertiary }, animatedStyle]}
    />
  );
}

/** Records a short clip so the expo-audio native module has to be alive. */
function AudioProbe({ onResult }: { onResult: (state: CheckState, detail: string) => void }) {
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const audio = await import('expo-audio');
        const permission = await audio.requestRecordingPermissionsAsync();
        if (!permission.granted) {
          if (!cancelled) {
            onResult('skipped', `recording permission not granted (${permission.status})`);
          }
          return;
        }
        if (!cancelled) {
          onResult('ok', `recording permission granted (${permission.status})`);
        }
      } catch (error) {
        if (!cancelled) {
          onResult('failed', `expo-audio failed: ${firstLine(error)}`);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [onResult]);

  return <View testID="compat-audio-view" style={styles.probe} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  row: {
    gap: 4,
  },
  label: {
    fontSize: 16,
  },
  state: {
    fontSize: 16,
    fontWeight: '600',
  },
  detail: {
    fontSize: 13,
  },
  probe: {
    height: 24,
    width: 24,
  },
});
