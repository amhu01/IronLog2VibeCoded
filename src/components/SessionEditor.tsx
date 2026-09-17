import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getLastUseForExercise } from '../db/repository';
import { colors, fontSize, radius, spacing } from '../theme';
import type { Exercise, ExerciseCatalogEntry } from '../types';
import { draftsToExercises, makeDraftExercise, type DraftExercise } from '../utils/sessionDraft';
import { Button } from './Button';
import { DateField } from './DateField';
import { ExerciseCard } from './ExerciseCard';
import { ExercisePicker } from './ExercisePicker';
import { RestTimer } from './RestTimer';

interface SessionEditorProps {
  initialDate: string;
  initialName: string;
  initialExercises: DraftExercise[];
  catalog: ExerciseCatalogEntry[];
  allMachines: string[];
  recentNames: string[];
  saveLabel: string;
  saving?: boolean;
  showRestTimer?: boolean;
  onSave: (date: string, name: string, exercises: Exercise[]) => void;
  extraActions?: React.ReactNode;
}

export function SessionEditor({
  initialDate,
  initialName,
  initialExercises,
  catalog,
  allMachines,
  recentNames,
  saveLabel,
  saving,
  showRestTimer,
  onSave,
  extraActions,
}: SessionEditorProps) {
  const [date, setDate] = useState(initialDate);
  const [name, setName] = useState(initialName);
  const [exercises, setExercises] = useState<DraftExercise[]>(initialExercises);

  async function handleAddExercise(exerciseName: string) {
    const draft = makeDraftExercise(exerciseName);
    const lastUse = await getLastUseForExercise(exerciseName);
    if (lastUse) {
      draft.muscleGroup = lastUse.muscleGroup;
      draft.machine = lastUse.machine;
      draft.hasBaseResistance = !!lastUse.hasBaseResistance;
      draft.baseResistance = lastUse.baseResistance !== undefined ? String(lastUse.baseResistance) : '';
      draft.sets = [{ weight: String(lastUse.lastWeight ?? ''), reps: String(lastUse.lastReps ?? ''), rir: false }];
    }
    setExercises((prev) => [...prev, draft]);
  }

  function updateExercise(key: string, updated: DraftExercise) {
    setExercises((prev) => prev.map((e) => (e.key === key ? updated : e)));
  }

  function removeExercise(key: string) {
    setExercises((prev) => prev.filter((e) => e.key !== key));
  }

  // Switching machine re-fills the (still single) first set from the last session on that machine,
  // since the same number means different things on different machines.
  async function handleMachineCommit(key: string, machine: string) {
    const target = exercises.find((e) => e.key === key);
    if (!target || target.sets.length !== 1) return;
    const lastUse = await getLastUseForExercise(target.name, machine);
    if (!lastUse) return;
    setExercises((prev) =>
      prev.map((e) =>
        e.key === key && e.sets.length === 1
          ? {
              ...e,
              hasBaseResistance: !!lastUse.hasBaseResistance,
              baseResistance: lastUse.baseResistance !== undefined ? String(lastUse.baseResistance) : '',
              sets: [{ weight: String(lastUse.lastWeight ?? ''), reps: String(lastUse.lastReps ?? ''), rir: false }],
            }
          : e
      )
    );
  }

  function machineSuggestionsFor(exerciseName: string): string[] {
    const entry = catalog.find((c) => c.name.toLowerCase() === exerciseName.toLowerCase());
    const own = entry?.machines ?? [];
    return [...own, ...allMachines.filter((m) => !own.includes(m))];
  }

  function handleSave() {
    onSave(date, name.trim(), draftsToExercises(exercises));
  }

  const canSave = exercises.some((e) => e.name.trim() !== '');
  const nameChips = recentNames.filter((n) => n.toLowerCase() !== name.trim().toLowerCase()).slice(0, 6);

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.nameWrap}>
        <Ionicons name="pricetag-outline" size={18} color={name ? colors.primary : colors.textMuted} />
        <TextInput
          style={styles.nameInput}
          placeholder="Session name (optional) — e.g. PUSH DAY"
          placeholderTextColor={colors.textFaint}
          value={name}
          onChangeText={setName}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="done"
        />
        {name !== '' && (
          <Pressable onPress={() => setName('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
      {nameChips.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.nameChips} keyboardShouldPersistTaps="handled">
          {nameChips.map((n) => (
            <Pressable key={n} style={styles.nameChip} onPress={() => setName(n)}>
              <Text style={styles.nameChipText}>{n}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <DateField date={date} onChange={setDate} />

      {showRestTimer && <RestTimer />}

      {exercises.length === 0 && (
        <View style={styles.hint}>
          <Ionicons name="arrow-down-circle-outline" size={20} color={colors.textFaint} />
          <Text style={styles.hintText}>Add your first exercise below. Known exercises auto-fill your last weight, reps, muscle group and machine.</Text>
        </View>
      )}

      {exercises.map((ex, i) => (
        <ExerciseCard
          key={ex.key}
          index={i}
          exercise={ex}
          machineSuggestions={machineSuggestionsFor(ex.name)}
          onChange={(updated) => updateExercise(ex.key, updated)}
          onRemove={() => removeExercise(ex.key)}
          onMachineCommit={(machine) => handleMachineCommit(ex.key, machine)}
        />
      ))}

      <View style={styles.pickerWrap}>
        <ExercisePicker catalog={catalog} onSubmit={handleAddExercise} />
      </View>

      <Button title={saveLabel} icon="checkmark" onPress={handleSave} disabled={!canSave} loading={saving} />
      {extraActions}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  nameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  nameInput: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.h3,
    fontWeight: '700',
    paddingVertical: 14,
  },
  nameChips: {
    gap: spacing.xs,
    paddingBottom: spacing.md,
  },
  nameChip: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nameChipText: {
    color: colors.textMuted,
    fontSize: fontSize.tiny,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  hintText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: fontSize.small,
    lineHeight: 18,
  },
  pickerWrap: {
    marginBottom: spacing.lg,
  },
});
