import React from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { SetRow } from './SetRow';
import { makeDraftSet, type DraftExercise, type DraftSet } from '../utils/sessionDraft';

interface ExerciseCardProps {
  exercise: DraftExercise;
  onChange: (exercise: DraftExercise) => void;
  onRemove: () => void;
}

export function ExerciseCard({ exercise, onChange, onRemove }: ExerciseCardProps) {
  function updateSet(idx: number, set: DraftSet) {
    const sets = exercise.sets.slice();
    sets[idx] = set;
    onChange({ ...exercise, sets });
  }

  function removeSet(idx: number) {
    const sets = exercise.sets.filter((_, i) => i !== idx);
    onChange({ ...exercise, sets: sets.length > 0 ? sets : [makeDraftSet()] });
  }

  function addSet() {
    const last = exercise.sets[exercise.sets.length - 1];
    onChange({
      ...exercise,
      sets: [...exercise.sets, makeDraftSet(last?.weight ?? '', last?.reps ?? '')],
    });
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{exercise.name}</Text>
        <Pressable onPress={onRemove}>
          <Text style={styles.removeText}>Remove</Text>
        </Pressable>
      </View>

      <View style={styles.bandedRow}>
        <Text style={styles.bandedLabel}>Banded / assisted (base resistance)</Text>
        <Switch
          value={exercise.hasBaseResistance}
          onValueChange={(v) => onChange({ ...exercise, hasBaseResistance: v })}
          trackColor={{ true: colors.primary, false: colors.border }}
        />
      </View>
      {exercise.hasBaseResistance && (
        <TextInput
          style={styles.baseInput}
          placeholder="Base resistance (e.g. -20)"
          placeholderTextColor={colors.textMuted}
          keyboardType="numbers-and-punctuation"
          value={exercise.baseResistance}
          onChangeText={(v) => onChange({ ...exercise, baseResistance: v })}
        />
      )}

      <View style={styles.setsHeaderRow}>
        <Text style={styles.setsHeaderText}>Set</Text>
        <Text style={[styles.setsHeaderText, { flex: 1 }]}>Weight</Text>
        <Text style={[styles.setsHeaderText, { flex: 1 }]}>Reps</Text>
      </View>
      {exercise.sets.map((s, i) => (
        <SetRow key={i} index={i} set={s} onChange={(set) => updateSet(i, set)} onRemove={() => removeSet(i)} />
      ))}

      <Pressable style={styles.addSetBtn} onPress={addSet}>
        <Text style={styles.addSetText}>+ Add set</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  removeText: {
    color: colors.danger,
    fontSize: 13,
  },
  bandedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  bandedLabel: {
    color: colors.textMuted,
    fontSize: 13,
    flex: 1,
    marginRight: spacing.sm,
  },
  baseInput: {
    backgroundColor: colors.background,
    color: colors.text,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    fontSize: 15,
  },
  setsHeaderRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
    paddingLeft: 18 + spacing.xs,
  },
  setsHeaderText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  addSetBtn: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
  addSetText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
});
