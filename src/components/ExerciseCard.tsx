import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme';
import { makeDraftSet, type DraftExercise, type DraftSet } from '../utils/sessionDraft';
import { SetRow } from './SetRow';

interface ExerciseCardProps {
  index: number;
  exercise: DraftExercise;
  onChange: (exercise: DraftExercise) => void;
  onRemove: () => void;
}

export function ExerciseCard({ index, exercise, onChange, onRemove }: ExerciseCardProps) {
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
        <View style={styles.indexBadge}>
          <Text style={styles.indexText}>{index + 1}</Text>
        </View>
        <Text style={styles.name} numberOfLines={2}>
          {exercise.name}
        </Text>
        <Pressable style={styles.removeBtn} onPress={onRemove} hitSlop={6}>
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
        </Pressable>
      </View>

      <View style={styles.bandedRow}>
        <View style={styles.bandedText}>
          <Text style={styles.bandedLabel}>Banded / assisted</Text>
          <Text style={styles.bandedHint}>Adds a base resistance to every set</Text>
        </View>
        <Switch
          value={exercise.hasBaseResistance}
          onValueChange={(v) => onChange({ ...exercise, hasBaseResistance: v })}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor={colors.text}
        />
      </View>
      {exercise.hasBaseResistance && (
        <View style={styles.baseWrap}>
          <Text style={styles.baseLabel}>BASE</Text>
          <TextInput
            style={styles.baseInput}
            placeholder="e.g. -20"
            placeholderTextColor={colors.textFaint}
            keyboardType="numbers-and-punctuation"
            value={exercise.baseResistance}
            onChangeText={(v) => onChange({ ...exercise, baseResistance: v })}
          />
        </View>
      )}

      <View style={styles.setsHeaderRow}>
        <Text style={[styles.setsHeaderText, styles.setsHeaderIndex]}>SET</Text>
        <Text style={[styles.setsHeaderText, styles.setsHeaderCol]}>WEIGHT</Text>
        <Text style={[styles.setsHeaderText, styles.setsHeaderCol]}>REPS</Text>
        <View style={styles.setsHeaderSpacer} />
      </View>
      {exercise.sets.map((s, i) => (
        <SetRow key={i} index={i} set={s} onChange={(set) => updateSet(i, set)} onRemove={() => removeSet(i)} />
      ))}

      <Pressable style={({ pressed }) => [styles.addSetBtn, pressed && styles.addSetBtnPressed]} onPress={addSet}>
        <Ionicons name="add" size={18} color={colors.primary} />
        <Text style={styles.addSetText}>Add set</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  indexBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    color: colors.primary,
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  name: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.h3,
    fontWeight: '700',
  },
  removeBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bandedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  bandedText: {
    flex: 1,
    marginRight: spacing.sm,
  },
  bandedLabel: {
    color: colors.text,
    fontSize: fontSize.small,
    fontWeight: '600',
  },
  bandedHint: {
    color: colors.textFaint,
    fontSize: fontSize.tiny,
    marginTop: 1,
  },
  baseWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  baseLabel: {
    color: colors.textMuted,
    fontSize: fontSize.tiny,
    fontWeight: '800',
    letterSpacing: 1,
  },
  baseInput: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '600',
    paddingVertical: 10,
  },
  setsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  setsHeaderText: {
    color: colors.textFaint,
    fontSize: fontSize.tiny,
    fontWeight: '800',
    letterSpacing: 1,
  },
  setsHeaderIndex: {
    width: 28,
    textAlign: 'center',
  },
  setsHeaderCol: {
    flex: 1,
    paddingLeft: spacing.sm + 2,
  },
  setsHeaderSpacer: {
    width: 44 + 30 + spacing.sm,
  },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  addSetBtnPressed: {
    backgroundColor: colors.primarySoft,
  },
  addSetText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: fontSize.small,
  },
});
