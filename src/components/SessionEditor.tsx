import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { getLastUseForExercise } from '../db/repository';
import { spacing } from '../theme';
import { draftsToExercises, makeDraftExercise, type DraftExercise } from '../utils/sessionDraft';
import { Button } from './Button';
import { DateField } from './DateField';
import { ExerciseCard } from './ExerciseCard';
import { ExercisePicker } from './ExercisePicker';

interface SessionEditorProps {
  initialDate: string;
  initialExercises: DraftExercise[];
  knownNames: string[];
  saveLabel: string;
  saving?: boolean;
  onSave: (date: string, exercises: ReturnType<typeof draftsToExercises>) => void;
  extraActions?: React.ReactNode;
}

export function SessionEditor({
  initialDate,
  initialExercises,
  knownNames,
  saveLabel,
  saving,
  onSave,
  extraActions,
}: SessionEditorProps) {
  const [date, setDate] = useState(initialDate);
  const [exercises, setExercises] = useState<DraftExercise[]>(initialExercises);

  async function handleAddExercise(name: string) {
    const draft = makeDraftExercise(name);
    const lastUse = await getLastUseForExercise(name);
    if (lastUse) {
      draft.hasBaseResistance = !!lastUse.hasBaseResistance;
      draft.baseResistance = lastUse.baseResistance !== undefined ? String(lastUse.baseResistance) : '';
      draft.sets = [
        {
          weight: String(lastUse.lastWeight ?? ''),
          reps: String(lastUse.lastReps ?? ''),
          rir: false,
        },
      ];
    }
    setExercises((prev) => [...prev, draft]);
  }

  function updateExercise(key: string, updated: DraftExercise) {
    setExercises((prev) => prev.map((e) => (e.key === key ? updated : e)));
  }

  function removeExercise(key: string) {
    setExercises((prev) => prev.filter((e) => e.key !== key));
  }

  function handleSave() {
    onSave(date, draftsToExercises(exercises));
  }

  const canSave = exercises.some((e) => e.name.trim() !== '');

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <DateField date={date} onChange={setDate} />

      {exercises.map((ex) => (
        <ExerciseCard
          key={ex.key}
          exercise={ex}
          onChange={(updated) => updateExercise(ex.key, updated)}
          onRemove={() => removeExercise(ex.key)}
        />
      ))}

      <View style={styles.pickerWrap}>
        <ExercisePicker knownNames={knownNames} onSubmit={handleAddExercise} />
      </View>

      <Button title={saveLabel} onPress={handleSave} disabled={!canSave} loading={saving} />
      {extraActions}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  pickerWrap: {
    marginBottom: spacing.lg,
  },
});
