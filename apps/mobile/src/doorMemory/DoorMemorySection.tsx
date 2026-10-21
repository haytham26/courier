/**
 * The door memory of a stop, on the stop sheet.
 *
 * The courier reads what they remember and can change it. The note is
 * written to the phone first: with no network it waits in the queue and the
 * courier is told so, without losing a word of it.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { LoadingSkeleton, StateMessage } from '@/components/StateMessage';
import { useTheme } from '@/providers/ThemeProvider';
import { fontSize, radius, space, target } from '@/styles/tokens';
import { SAFE_PLACES, safePlaceLabel } from './safePlaces';
import { useDoorMemory } from './useDoorMemory';

interface DoorMemorySectionProps {
  /** The stop the memory belongs to. */
  stopId: string;
}

export function DoorMemorySection({ stopId }: DoorMemorySectionProps) {
  const { theme } = useTheme();
  const { memory, status, pending, isStale, error, isSaving, save } = useDoorMemory(stopId);
  const [isEditing, setIsEditing] = useState(false);
  const [note, setNote] = useState('');
  const [safePlace, setSafePlace] = useState<string | null>(null);

  const openEditor = () => {
    setNote(memory?.note ?? '');
    setSafePlace(memory?.safe_place ?? null);
    setIsEditing(true);
  };

  const onSave = async () => {
    const saved = await save({
      note: note.trim() === '' ? null : note.trim(),
      safePlace,
    });
    if (saved) {
      setIsEditing(false);
    }
  };

  if (status === 'loading') {
    return (
      <View style={styles.section} testID="door-memory-loading">
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary, fontSize: fontSize.sm }]}>
          DOOR MEMORY
        </Text>
        <LoadingSkeleton height={target.comfortable} />
      </View>
    );
  }

  return (
    <View style={styles.section} testID="door-memory">
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary, fontSize: fontSize.sm }]}>
          DOOR MEMORY
        </Text>
        {!isEditing && (
          <TouchableOpacity
            testID="door-memory-edit"
            onPress={openEditor}
            accessibilityRole="button"
            accessibilityLabel="Change the door note"
            style={[styles.editButton, { minHeight: target.min }]}
          >
            <MaterialIcons name="edit" size={18} color={theme.colors.brandPrimary} />
            <Text style={[styles.editLabel, { color: theme.colors.brandPrimary, fontSize: fontSize.base }]}>
              {memory === null ? 'Add a note' : 'Change'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {isEditing ? (
        <View testID="door-memory-editor">
          <Input
            testID="door-memory-note"
            label="Door note"
            size="lg"
            value={note}
            onChangeText={setNote}
            placeholder="Where to leave it, the gate code, the dog"
            multiline
            style={{ height: space.huge * 2, textAlignVertical: 'top' }}
          />

          <Text style={[styles.choiceTitle, { color: theme.colors.textSecondary, fontSize: fontSize.base }]}>
            Where is it safe?
          </Text>
          <View style={styles.choices}>
            {SAFE_PLACES.map((place) => {
              const selected = safePlace === place;
              return (
                <TouchableOpacity
                  key={place}
                  testID={`safe-place-${place.replace(/\s+/g, '-')}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={safePlaceLabel(place) ?? place}
                  onPress={() => setSafePlace(selected ? null : place)}
                  style={[
                    styles.choice,
                    {
                      borderColor: selected ? theme.colors.brandPrimary : theme.colors.border,
                      backgroundColor: selected ? theme.colors.brandPrimary : theme.colors.surface,
                      minHeight: target.comfortable,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.choiceText,
                      { color: selected ? theme.colors.textInverse : theme.colors.textPrimary, fontSize: fontSize.base },
                    ]}
                  >
                    {safePlaceLabel(place)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {error !== null && (
            <Text style={[styles.error, { color: theme.colors.error, fontSize: fontSize.base }]}>{error}</Text>
          )}

          <View style={styles.editorActions}>
            <Button
              variant="primary"
              onPress={() => void onSave()}
              loading={isSaving}
              style={styles.editorButton}
              testID="door-memory-save"
            >
              Save the note
            </Button>
            <Button variant="outline" onPress={() => setIsEditing(false)} style={styles.editorButton}>
              Cancel
            </Button>
          </View>
        </View>
      ) : (
        <View testID="door-memory-view">
          {memory === null ? (
            <StateMessage
              title="No door note for this address yet"
              message="Write what you know and the next run starts with it."
              testID="door-memory-empty"
            />
          ) : (
            <>
              {safePlaceLabel(memory.safe_place) !== null && (
                <View style={styles.memoryRow}>
                  <MaterialIcons name="lock-open" size={18} color={theme.colors.brandSecondary} />
                  <Text
                    testID="door-memory-safe-place"
                    style={[styles.memoryText, { color: theme.colors.textPrimary, fontSize: fontSize.lg }]}
                  >
                    {safePlaceLabel(memory.safe_place)}
                  </Text>
                </View>
              )}
              {memory.note !== null && memory.note.trim() !== '' && (
                <Text
                  testID="door-memory-note-text"
                  style={[styles.memoryNote, { color: theme.colors.textPrimary, fontSize: fontSize.lg }]}
                >
                  {memory.note}
                </Text>
              )}
              {pending && (
                <Text
                  testID="door-memory-pending"
                  style={[styles.pending, { color: theme.colors.warning, fontSize: fontSize.base }]}
                >
                  Saved on this phone — it will sync when you are back online.
                </Text>
              )}
              {isStale && !pending && (
                <Text
                  testID="door-memory-not-updated"
                  style={[styles.pending, { color: theme.colors.warning, fontSize: fontSize.base }]}
                >
                  Not updated — this is the last note the app had.
                </Text>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: space.lg,
    paddingTop: space.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.sm,
  },
  sectionTitle: { fontWeight: '700', letterSpacing: 1 },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  editLabel: { fontWeight: '600' },
  choiceTitle: { fontWeight: '600', marginTop: space.md, marginBottom: space.sm },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  choice: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    justifyContent: 'center',
  },
  choiceText: { fontWeight: '600' },
  editorActions: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  editorButton: { flex: 1 },
  error: { marginTop: space.sm, fontWeight: '500' },
  memoryRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.xs },
  memoryText: { fontWeight: '600' },
  memoryNote: { marginTop: space.xs },
  pending: { marginTop: space.sm, fontWeight: '500' },
});
