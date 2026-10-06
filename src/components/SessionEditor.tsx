import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { getLastUseForExercise } from '../db/repository';
import { colors, fontSize, radius, spacing, themed } from '../theme';
import type { Exercise, ExerciseCatalogEntry } from '../types';
import { draftsToExercises, makeDraftExercise, type DraftExercise } from '../utils/sessionDraft';
import { Button } from './Button';
import { DateField } from './DateField';
import { ExerciseCard } from './ExerciseCard';
import { ExercisePicker } from './ExercisePicker';
import { OptionSheet } from './OptionSheet';
import { t } from '../i18n';

interface SessionEditorProps {
  initialDate: string;
  initialName: string;
  initialNotes?: string;
  initialExercises: DraftExercise[];
  catalog: ExerciseCatalogEntry[];
  allMachines: string[];
  recentNames: string[];
  saveLabel: string;
  saving?: boolean;
  /** Height of anything above this editor that isn't part of its parent's frame, e.g. a stack header. */
  keyboardOffset?: number;
  onSave: (date: string, name: string, exercises: Exercise[], notes: string) => void;
  /** Called with the whole draft on every change, so a parent can hold on to unsaved work. */
  onDraftChange?: (draft: EditorDraft) => void;
  extraActions?: React.ReactNode;
}

export interface EditorDraft {
  date: string;
  name: string;
  notes: string;
  exercises: DraftExercise[];
}

/** Leaves a little of the previous card visible above whatever we scroll to. */
const SCROLL_MARGIN = 12;

export function SessionEditor({
  initialDate,
  initialName,
  initialNotes = '',
  initialExercises,
  catalog,
  allMachines,
  recentNames,
  saveLabel,
  saving,
  keyboardOffset = 0,
  onSave,
  onDraftChange,
  extraActions,
}: SessionEditorProps) {
  const [date, setDate] = useState(initialDate);
  const [name, setName] = useState(initialName);
  const [notes, setNotes] = useState(initialNotes);
  const [exercises, setExercises] = useState<DraftExercise[]>(initialExercises);
  const [pickingName, setPickingName] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const cardY = useRef(new Map<string, number>());
  const scrollToNewKey = useRef<string | null>(null);

  useEffect(() => {
    onDraftChange?.({ date, name, notes, exercises });
    // onDraftChange is a fresh closure each render; only the draft itself matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, name, notes, exercises]);

  function scrollTo(y: number) {
    scrollRef.current?.scrollTo({ y: Math.max(0, y - SCROLL_MARGIN), animated: true });
  }

  async function handleAddExercise(exerciseName: string) {
    const draft = makeDraftExercise(exerciseName);
    const lastUse = await getLastUseForExercise(exerciseName);
    if (lastUse) {
      draft.muscleGroup = lastUse.muscleGroup;
      draft.machine = lastUse.machine;
      draft.hasBaseResistance = !!lastUse.hasBaseResistance;
      draft.baseResistance = lastUse.baseResistance !== undefined ? String(lastUse.baseResistance) : '';
      draft.sets = [{ weight: String(lastUse.lastWeight ?? ''), reps: String(lastUse.lastReps ?? ''), ws: false }];
      // The hint follows the machine the draft starts on, same as the weights.
      draft.lastNote = (await getLastUseForExercise(exerciseName, lastUse.machine))?.lastNote || lastUse.lastNote;
    }
    // The picker sits above the list, so bring the new card into view once it has laid out.
    scrollToNewKey.current = draft.key;
    setExercises((prev) => [...prev, draft]);
  }

  function handleCardLayout(key: string, y: number) {
    cardY.current.set(key, y);
    if (scrollToNewKey.current === key) {
      scrollToNewKey.current = null;
      scrollTo(y);
    }
  }

  function updateExercise(key: string, updated: DraftExercise) {
    setExercises((prev) => prev.map((e) => (e.key === key ? updated : e)));
  }

  function removeExercise(key: string) {
    cardY.current.delete(key);
    setExercises((prev) => prev.filter((e) => e.key !== key));
  }

  // Switching machine re-fills the (still single) first set from the last session on that machine,
  // since the same number means different things on different machines. The note hint always follows.
  async function handleMachineCommit(key: string, machine: string) {
    const target = exercises.find((e) => e.key === key);
    if (!target) return;
    const lastUse = await getLastUseForExercise(target.name, machine);
    setExercises((prev) =>
      prev.map((e) => {
        if (e.key !== key) return e;
        const withHint = { ...e, lastNote: lastUse?.lastNote ?? '' };
        if (!lastUse || e.sets.length !== 1) return withHint;
        return {
          ...withHint,
          hasBaseResistance: !!lastUse.hasBaseResistance,
          baseResistance: lastUse.baseResistance !== undefined ? String(lastUse.baseResistance) : '',
          sets: [{ weight: String(lastUse.lastWeight ?? ''), reps: String(lastUse.lastReps ?? ''), ws: false }],
        };
      })
    );
  }

  function machineSuggestionsFor(exerciseName: string): string[] {
    const entry = catalog.find((c) => c.name.toLowerCase() === exerciseName.toLowerCase());
    const own = entry?.machines ?? [];
    return [...own, ...allMachines.filter((m) => !own.includes(m))];
  }

  function handleSave() {
    onSave(date, name.trim(), draftsToExercises(exercises), notes.trim());
  }

  const canSave = exercises.some((e) => e.name.trim() !== '');

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={keyboardOffset}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.nameWrap}>
          <Ionicons name="pricetag-outline" size={18} color={name ? colors.primary : colors.textMuted} />
          <TextInput
            style={styles.nameInput}
            placeholder={t('Session name (optional) — e.g. PUSH DAY')}
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
          {recentNames.length > 0 && (
            <Pressable style={styles.nameDropBtn} onPress={() => setPickingName(true)} hitSlop={6}>
              <Ionicons name="chevron-down" size={20} color={colors.text} />
            </Pressable>
          )}
        </View>

        <DateField date={date} onChange={setDate} />

        <View style={styles.pickerWrap}>
          <ExercisePicker catalog={catalog} onSubmit={handleAddExercise} />
        </View>

        {exercises.length === 0 && (
          <View style={styles.hint}>
            <Ionicons name="arrow-up-circle-outline" size={20} color={colors.textFaint} />
            <Text style={styles.hintText}>
              {t('Add your first exercise above. Known exercises auto-fill your last weight, reps, muscle group and machine.')}
            </Text>
          </View>
        )}

        {exercises.map((ex, i) => (
          <View key={ex.key} onLayout={(e) => handleCardLayout(ex.key, e.nativeEvent.layout.y)}>
            <ExerciseCard
              index={i}
              exercise={ex}
              machineSuggestions={machineSuggestionsFor(ex.name)}
              onChange={(updated) => updateExercise(ex.key, updated)}
              onRemove={() => removeExercise(ex.key)}
              onMachineCommit={(machine) => handleMachineCommit(ex.key, machine)}
              onFieldFocus={(offset) => scrollTo((cardY.current.get(ex.key) ?? 0) + offset)}
            />
          </View>
        ))}

        <View style={styles.notesWrap}>
          <Text style={styles.notesLabel}>{t('SESSION NOTES')}</Text>
          <TextInput
            style={styles.notesInput}
            placeholder={t('How it went, how you slept, anything to remember…')}
            placeholderTextColor={colors.textFaint}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>

        <Button title={saveLabel} icon="checkmark" onPress={handleSave} disabled={!canSave} loading={saving} />
        {extraActions}
      </ScrollView>

      <OptionSheet
        visible={pickingName}
        title={t('Session name')}
        options={recentNames.map((n) => ({ value: n, label: n }))}
        selected={name.trim() || null}
        onClose={() => setPickingName(false)}
        onSelect={(n) => {
          setName(n);
          setPickingName(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = themed(() => ({
  flex: {
    flex: 1,
  },
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
    paddingLeft: spacing.md,
    paddingRight: spacing.xs + 2,
    marginBottom: spacing.sm,
  },
  nameInput: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.h3,
    fontWeight: '700',
    paddingVertical: 14,
  },
  nameDropBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: spacing.md,
  },
  notesWrap: {
    marginBottom: spacing.md,
  },
  notesLabel: {
    color: colors.textMuted,
    fontSize: fontSize.tiny,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  notesInput: {
    minHeight: 72,
    color: colors.text,
    fontSize: fontSize.body,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    textAlignVertical: 'top',
  },
}));
