import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { colors, fontSize, radius, spacing, themed } from '../theme';
import { MUSCLE_GROUPS } from '../types';
import { makeDraftSet, type DraftExercise, type DraftSet } from '../utils/sessionDraft';
import { SetRow } from './SetRow';
import { muscleLabel, t } from '../i18n';

interface ExerciseCardProps {
  index: number;
  exercise: DraftExercise;
  machineSuggestions: string[];
  onChange: (exercise: DraftExercise) => void;
  onRemove: () => void;
  onMachineCommit: (machine: string) => void;
  /** A field inside the card got focus; `offset` is its y within the card, so the editor can scroll it clear of the keyboard. */
  onFieldFocus?: (offset: number) => void;
}

export function ExerciseCard({ index, exercise, machineSuggestions, onChange, onRemove, onMachineCommit, onFieldFocus }: ExerciseCardProps) {
  const [machineFocused, setMachineFocused] = useState(false);
  const machineY = useRef(0);
  const notesY = useRef(0);

  const filteredMachines = useMemo(() => {
    const q = exercise.machine.trim().toLowerCase();
    return machineSuggestions.filter((m) => m.toLowerCase() !== q && (q === '' || m.toLowerCase().includes(q))).slice(0, 5);
  }, [machineSuggestions, exercise.machine]);

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
    onChange({ ...exercise, sets: [...exercise.sets, makeDraftSet(last?.weight ?? '', last?.reps ?? '')] });
  }

  function pickMachine(machine: string) {
    onChange({ ...exercise, machine });
    setMachineFocused(false);
    onMachineCommit(machine);
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

      <Text style={styles.fieldLabel}>{t('MUSCLE GROUP')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chips}
        keyboardShouldPersistTaps="handled"
      >
        {MUSCLE_GROUPS.map((g) => {
          const active = exercise.muscleGroup === g;
          return (
            <Pressable
              key={g}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onChange({ ...exercise, muscleGroup: active ? '' : g })}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{muscleLabel(g)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View onLayout={(e) => (machineY.current = e.nativeEvent.layout.y)}>
        <Text style={styles.fieldLabel}>{t('MACHINE / BRAND (OPTIONAL)')}</Text>
        <View style={[styles.machineWrap, machineFocused && styles.machineWrapFocused]}>
          <Ionicons name="cog-outline" size={16} color={machineFocused ? colors.primary : colors.textFaint} />
          <TextInput
            style={styles.machineInput}
            placeholder={t('E.G. HAMMER STRENGTH')}
            placeholderTextColor={colors.textFaint}
            value={exercise.machine}
            onChangeText={(v) => onChange({ ...exercise, machine: v.toUpperCase() })}
            onFocus={() => {
              setMachineFocused(true);
              onFieldFocus?.(machineY.current);
            }}
            onBlur={() => {
              setTimeout(() => setMachineFocused(false), 150);
              onMachineCommit(exercise.machine);
            }}
            onSubmitEditing={() => onMachineCommit(exercise.machine)}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
          />
          {exercise.machine !== '' && (
            <Pressable onPress={() => pickMachine('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
        {machineFocused && filteredMachines.length > 0 && (
          <View style={styles.suggestions}>
            {filteredMachines.map((m, i) => (
              <Pressable
                key={m}
                style={[styles.suggestionRow, i === filteredMachines.length - 1 && styles.suggestionRowLast]}
                onPress={() => pickMachine(m)}
              >
                <Text style={styles.suggestionText}>{m}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View onLayout={(e) => (notesY.current = e.nativeEvent.layout.y)}>
        <Text style={styles.fieldLabel}>{t('NOTES')}</Text>
        <TextInput
          style={styles.notesInput}
          placeholder={t('Seat 4, slow negatives, felt the left side more…')}
          placeholderTextColor={colors.textFaint}
          value={exercise.notes}
          onChangeText={(v) => onChange({ ...exercise, notes: v })}
          onFocus={() => onFieldFocus?.(notesY.current)}
          multiline
        />
        {exercise.lastNote !== '' && exercise.notes.trim() !== exercise.lastNote && (
          <Pressable style={styles.lastNote} onPress={() => onChange({ ...exercise, notes: exercise.lastNote })} hitSlop={4}>
            <Ionicons name="arrow-undo-outline" size={14} color={colors.primary} />
            <Text style={styles.lastNoteText} numberOfLines={3}>
              <Text style={styles.lastNoteLabel}>{t('LAST TIME')}  </Text>
              {exercise.lastNote}
            </Text>
          </Pressable>
        )}
      </View>

      <View style={styles.bandedRow}>
        <View style={styles.bandedText}>
          <Text style={styles.bandedLabel}>{t('Banded / assisted')}</Text>
          <Text style={styles.bandedHint}>{t('Adds a base resistance to every set')}</Text>
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
          <Text style={styles.baseLabel}>{t('BASE')}</Text>
          <TextInput
            style={styles.baseInput}
            placeholder={t('e.g. -20')}
            placeholderTextColor={colors.textFaint}
            keyboardType="numbers-and-punctuation"
            value={exercise.baseResistance}
            onChangeText={(v) => onChange({ ...exercise, baseResistance: v })}
          />
        </View>
      )}

      <View style={styles.setsHeaderRow}>
        <Text style={[styles.setsHeaderText, styles.setsHeaderIndex]}>{t('SET')}</Text>
        <Text style={[styles.setsHeaderText, styles.setsHeaderCol]}>{t('WEIGHT')}</Text>
        <Text style={[styles.setsHeaderText, styles.setsHeaderCol]}>{t('REPS')}</Text>
        <View style={styles.setsHeaderSpacer} />
      </View>
      {exercise.sets.map((s, i) => (
        <SetRow key={i} index={i} set={s} onChange={(set) => updateSet(i, set)} onRemove={() => removeSet(i)} />
      ))}

      <Pressable style={({ pressed }) => [styles.addSetBtn, pressed && styles.addSetBtnPressed]} onPress={addSet}>
        <Ionicons name="add" size={18} color={colors.primary} />
        <Text style={styles.addSetText}>{t('Add set')}</Text>
      </Pressable>
    </View>
  );
}

const styles = themed(() => ({
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
  fieldLabel: {
    color: colors.textFaint,
    fontSize: fontSize.tiny,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: spacing.xs + 2,
  },
  chipsScroll: {
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: spacing.md,
  },
  chips: {
    gap: spacing.xs,
    alignItems: 'center',
  },
  chip: {
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm + 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: fontSize.tiny,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  chipTextActive: {
    color: colors.primary,
  },
  machineWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm + 4,
    marginBottom: spacing.md,
  },
  machineWrapFocused: {
    borderColor: colors.primary,
    marginBottom: spacing.xs,
  },
  machineInput: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.small,
    fontWeight: '700',
    paddingVertical: 10,
  },
  suggestions: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  suggestionRow: {
    paddingVertical: 10,
    paddingHorizontal: spacing.sm + 4,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionRowLast: {
    borderBottomWidth: 0,
  },
  suggestionText: {
    color: colors.text,
    fontSize: fontSize.small,
    fontWeight: '600',
  },
  notesInput: {
    minHeight: 44,
    color: colors.text,
    fontSize: fontSize.small,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 10,
    marginBottom: spacing.xs + 2,
    textAlignVertical: 'top',
  },
  lastNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs + 2,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  lastNoteText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: fontSize.small,
    lineHeight: 18,
  },
  lastNoteLabel: {
    color: colors.primary,
    fontSize: fontSize.tiny,
    fontWeight: '800',
    letterSpacing: 1,
  },
  bandedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
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
}));
